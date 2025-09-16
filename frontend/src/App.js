import React, { useState } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SearchPage from "./components/SearchPage";
import NetworkPage from "./components/NetworkPage";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/network/:movieId" element={<NetworkPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;