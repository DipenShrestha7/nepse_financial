import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./assets/pages/home";
import Financial from "./assets/pages/financial";
import Comparison from "./assets/pages/comparison";
import Chatbot from "./assets/pages/chatbot";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/company" element={<Home />} />
        <Route path="/financial/:scrip" element={<Financial />} />
        <Route path="/comparison/:scrip?" element={<Comparison />} />
        <Route path="/chatbot" element={<Chatbot />} />
      </Routes>
    </Router>
  );
}

export default App;
