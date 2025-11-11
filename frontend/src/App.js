import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CMEAnalysis from './pages/CMEAnalysis';
import CMESessionDetail from './pages/CMESessionDetail';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<CMEAnalysis />} />
          <Route path="/sessions/:sessionId" element={<CMESessionDetail />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

