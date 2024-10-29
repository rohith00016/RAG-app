import { useState } from "react";
import axios from "axios";

const RAG = () => {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([]);

  const handleSearch = async () => {
    if (!query) return;

    setMessages([...messages, { type: "user", text: query }]);

    try {
      const response = await axios.post("http://localhost:3000/api/generate", {
        query,
      });

      // Assuming the response has a structure like { success: true, data: "Response text" }
      const responseText = response.data.data; // Adjust this based on the actual key

      setMessages((prevMessages) => [
        ...prevMessages,
        { type: "system", text: responseText },
      ]);
      setQuery("");
    } catch (error) {
      console.error("Error fetching response", error);
      setMessages((prevMessages) => [
        ...prevMessages,
        { type: "bot", text: "Error fetching response" },
      ]);
    }
  };

  return (
    <div className="container">
      <div className="chatContainer">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`messageBubble ${
              message.type === "user" ? "userMessage" : "botMessage"
            }`}
          >
            {message.text}
          </div>
        ))}
      </div>
      <div className="inputContainer">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask a question"
          className="input"
        />
        <button onClick={handleSearch} className="button">
          Send
        </button>
      </div>
    </div>
  );
};

export default RAG;
