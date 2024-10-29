const Document = require("../models/Document");
const fs = require("fs");
const pdfParser = require("pdf-parse");
const parser = new pdfParser();
const axios = require("axios");
const Conversations = require("../models/Conversations");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();
const client = new MongoClient(process.env.MONGO_URI);

const getVectorRepresentation = async (text) => {
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/embeddings",
      {
        model: "text-embedding-ada-002",
        input: text,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data.data[0].embedding;
  } catch (error) {
    console.error("Error getting vector representation:", error);
    throw new Error("Error getting vector representation");
  }
};

const chunkIt = (text) => {
  return text.split("\n").filter((chunk) => chunk.trim() !== "");
};

const uploadDocument = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const pdfData = fs.readFileSync(file.path);

    parser.on("pdfParser_dataError", (errData) => {
      console.error(errData.parserError);
      throw new Error("Error parsing PDF");
    });

    parser.on("pdfParser_dataReady", async (pdfData) => {
      const text = parser.getRawTextContent();

      const chunks = chunkIt(text);

      const validChunks = chunks.filter((chunk) => chunk.trim() !== "");

      const documents = await Promise.all(
        validChunks.map(async (chunk) => {
          const vector = await getVectorRepresentation(chunk);
          const document = new Document({ text: chunk, vector });
          return document.save();
        })
      );

      fs.unlinkSync(file.path);

      res.status(201).json(documents);
    });

    parser.parseBuffer(pdfData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

const getQueryDocs = async (query, sessionId) => {
  try {
    await client.connect();

    const database = client.db("RAG");
    const sessionsCollection = database.collection("Sessions");
    const conversationsCollection = database.collection("Conversations");
    const documentsCollection = database.collection("documents");

    let existingConversations;
    let session;

    if (!sessionId || !ObjectId.isValid(sessionId)) {
      session = await sessionsCollection.insertOne({});
      sessionId = session.insertedId;
    } else {
      session = await sessionsCollection.findOne({
        _id: new ObjectId(sessionId),
      });
      if (!session) {
        throw new Error("Session not found");
      }
    }

    existingConversations = await conversationsCollection
      .find({ sessionId: new ObjectId(sessionId) })
      .toArray();

    const conversation = {
      sessionId: new ObjectId(sessionId),
      message: query,
      role: "user",
      createdAt: new Date(),
    };
    await conversationsCollection.insertOne(conversation);

    const vector = await getVectorRepresentation(query);
    console.log("vector", vector);

    const docs = await documentsCollection
      .aggregate([
        {
          $vectorSearch: {
            index: "default",
            path: "vector",
            queryVector: vector,
            numCandidates: 13,
            limit: 10,
          },
        },
        {
          $project: {
            _id: 0,
            text: 1,
            score: { $meta: "vectorSearchScore" },
          },
        },
      ])
      .toArray();

    console.log("docs", docs);

    return { docs, existingConversations, sessionId };
  } catch (error) {
    console.error("Error in getQueryDocs:", error);
    return { docs: [], existingConversations: [], sessionId: null };
  } finally {
    await client.close();
  }
};

const generateResponse = async (req, res) => {
  try {
    const { query, sessionId } = req.body;

    const {
      docs,
      existingConversations,
      sessionId: newSessionId,
    } = await getQueryDocs(query, sessionId);
    console.log("existingConversations", existingConversations);
    console.log("newSessionId", newSessionId);
    const existingContent = `Based on the vector representations: \n${docs
      .map((doc) => doc.text)
      .join("\n")}\n and the following query: ${query}, provide an answer.`;
    console.log("existingContent", existingContent);

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant who answers questions based on the provided vectors and documents.",
          },
          ...existingConversations.map((convo) => ({
            role: convo.role,
            content: convo.message,
          })),
          {
            role: "user",
            content: existingContent,
          },
        ],
        max_tokens: 150,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const assistantMessage = response.data.choices[0].message.content;
    const conversation = new Conversations({
      sessionId: newSessionId,
      message: assistantMessage,
      role: "assistant",
    });
    await conversation.save();

    res.json({data: assistantMessage});
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { uploadDocument, generateResponse };
