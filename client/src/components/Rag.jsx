import { useState } from "react";
import axios from "axios";

const RAG = () => {
  const [query, setQuery] = useState("");
  const [generatedResponse, setGeneratedResponse] = useState("");

  const handleSearch = async () => {
    if (!query) {
      setGeneratedResponse("Please enter a query.");
      return;
    }

    try {
      const response = await axios.post("http://localhost:3000/api/generate", {
        query,
      });

      setGeneratedResponse(response.data);
    } catch (error) {
      console.error("Error fetching documents or generating response", error);
      setGeneratedResponse("Error fetching response");
    }
  };

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ask a question"
      />
      <button onClick={handleSearch}>Search</button>
      <div>
        <h3>Generated Response:</h3>
        <p>{generatedResponse}</p>
      </div>
    </div>
  );
};

export default RAG;
