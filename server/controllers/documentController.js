const Document = require("../models/Document");
const pdfParse = require("pdf-parse");
const fs = require("fs");
const axios = require("axios");

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
    const data = await pdfParse(pdfData);

    const chunks = chunkIt(data.text);
    const documents = await Promise.all(
      chunks.map(async (chunk) => {
        const vector = await getVectorRepresentation(chunk);
        const document = new Document({
          text: chunk,
          vector,
        });
        await document.save();
        return document;
      })
    );

    res.status(201).json(documents);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

const generateResponse = async (req, res) => {
  console.log(req.body);
  const { query } = req.body;
  try {
    const documents = await Document.find({});

    const combinedVectors = documents.map((doc) => doc.vector);

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
          {
            role: "user",
            content: `Based on the vector representations ${JSON.stringify(
              combinedVectors
            )} and the following query: ${query}, provide an answer.`,
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

    res.json(response.data.choices[0].message.content);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { uploadDocument, generateResponse };
