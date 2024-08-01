const express = require("express");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const {
  uploadDocument,
  generateResponse,
} = require("./controllers/documentController");
const connectDB = require("./config/db");

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
connectDB();
// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Ensure this directory exists
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// Middleware to handle file uploads
app.post("/api/upload", upload.single("pdf"), uploadDocument);
app.use("/api/generate", generateResponse);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});