import RAG from "./components/Rag";
import Upload from "./components/Upload";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

const App = () => {
  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<RAG />} />
          <Route path="/upload" element={<Upload />} />
        </Routes>
      </Router>
    </>
  );
};

export default App;
