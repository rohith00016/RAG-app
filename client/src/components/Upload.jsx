import { useState } from "react";
import axios from "axios";

const Upload = () => {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      setMessage("");
    } else {
      setMessage("Please select a PDF file.");
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please select a file to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("pdf", file);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API}/api/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.status === 200) {
        setMessage("Document uploaded successfully");
      }
    } catch (error) {
      console.error("Error uploading document", error);
      setMessage("Error uploading document");
    }
  };

  return (
    <div className="upload-container">
      <input type="file" accept=".pdf" onChange={handleFileChange} />
      {file && <p>Selected file: {file.name}</p>}
      <button onClick={handleUpload}>Upload</button>
      <p
        className={
          message === "Please select a PDF file." ||
          message === "Error uploading document"
            ? "error"
            : "message"
        }
      >
        {message}
      </p>
    </div>
  );
};

export default Upload;
