import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Layout/Sidebar';
import { MobileNavigation } from './components/Layout/MobileNavigation';
import { Timeline } from './components/Feed/Timeline';
import { ComposePage } from './components/Tweet/ComposePage';
import { LoginPage } from './components/Auth/LoginPage';
import { FloatingActionButton } from './components/ui/FloatingActionButton';
import { useAuth } from './hooks/useAuth';

function App() {
  const { user, loading } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
            <span className="text-white font-bold text-lg">X</span>
          </div>
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      {!user ? (
        // Not authenticated - show login page
        <Routes>
          <Route path="/login\" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login\" replace />} />
        </Routes>
      ) : (
        // Authenticated - show main app
        <div className="min-h-screen bg-white">
          <div className="max-w-6xl mx-auto flex">
            {/* Desktop Sidebar */}
            <div className="hidden md:block">
              <Sidebar />
            </div>
            
            {/* Main Content */}
            <div className="flex-1 md:ml-64">
              <Routes>
                <Route path="/" element={<Timeline />} />
                <Route path="/compose" element={<ComposePage />} />
                <Route path="/explore" element={<div className="p-8 text-center text-gray-500">Explore Page</div>} />
                <Route path="/notifications" element={<div className="p-8 text-center text-gray-500">Notifications Page</div>} />
                <Route path="/messages" element={<div className="p-8 text-center text-gray-500">Messages Page</div>} />
                <Route path="/bookmarks" element={<div className="p-8 text-center text-gray-500">Bookmarks Page</div>} />
                <Route path="/profile" element={<div className="p-8 text-center text-gray-500">Profile Page</div>} />
                <Route path="/login" element={<Navigate to="/\" replace />} />
                <Route path="*" element={<Navigate to="/\" replace />} />
              </Routes>
            </div>
          </div>
          
          {/* Mobile Navigation */}
          <MobileNavigation />
          
          {/* Floating Action Button */}
          <FloatingActionButton />
        </div>
      )}
    </Router>
  );
}

export default App;