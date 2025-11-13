import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import SessionDetail from './pages/SessionDetail';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/sessions/:sessionId" element={<SessionDetail />} />
      </Routes>
    </Router>
  );
}

export default App;
