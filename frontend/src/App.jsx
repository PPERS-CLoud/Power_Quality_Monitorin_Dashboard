import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PowerReadings from './components/PowerReadings.jsx';
import LoginPage from './Page/LoginPage.jsx';
import SignupPage from './page/SignupPage.jsx';
import MainContent from './page/MainContent.jsx';
import ApiTest from './ApiTest.jsx';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/power-readings" element={<PowerReadings />} />
        <Route path="/dashboard" element={<MainContent />} />
        <Route path="/api-test" element={<ApiTest />} />
      </Routes>
    </Router>
  );
}

export default App;