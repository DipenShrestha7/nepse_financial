import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./assets/pages/home";
import Financial from "./assets/pages/financial";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/financial/:scrip" element={<Financial />} />
      </Routes>
    </Router>
  );
}

export default App;
