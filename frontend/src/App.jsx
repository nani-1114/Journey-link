import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import NavBar from './components/NavBar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ActiveJourney from './pages/ActiveJourney';
import LiveTracking from './pages/LiveTracking';
import History from './pages/History';
import Analytics from './pages/Analytics';
import ForgotPassword from './pages/ForgotPassword';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-[#0f172a] text-white flex flex-col">
          <NavBar />
          <main className="flex-1">
            <Routes>
              {/* Public Authentication Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

              {/* Public Live Journey Tracking Link */}
              <Route path="/live/:trackingCode" element={<LiveTracking />} />

              {/* Protected User Dashboard & Logs Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/history"
                element={
                  <ProtectedRoute>
                    <History />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/journey/active/:trackingCode"
                element={
                  <ProtectedRoute>
                    <ActiveJourney />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics/:id"
                element={
                  <ProtectedRoute>
                    <Analytics />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
