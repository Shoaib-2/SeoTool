import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './compnents/Layout/Layout';
import  Login  from "./compnents/auth/Login";
import Register from './compnents/auth/Login';
import Dashboard from './compnents/dashboard/Dashboard';
import SEOAnalysisPage from './compnents/pages/SEOAnalysisPage';
import KeywordsPage from './compnents/pages/KeywordsPage';
import ProtectedRoute from './compnents/auth/ProtectedRoute';
import { SEOProvider } from './context/SeoContext';

function App() {
  return (
    <AuthProvider>
      <SEOProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected routes */}
          <Route path="/" element={<ProtectedRoute><Layout><Navigate to="/dashboard" /></Layout></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/seo-analysis" element={<ProtectedRoute><Layout><SEOAnalysisPage /></Layout></ProtectedRoute>} />
          <Route path="/keywords" element={<ProtectedRoute><Layout><KeywordsPage /></Layout></ProtectedRoute>} />
        </Routes>
      </Router>
      </SEOProvider>
    </AuthProvider>
  );
}

export default App;

