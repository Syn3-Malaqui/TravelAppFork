import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Layout/Sidebar';
import { MobileNavigation } from './components/Layout/MobileNavigation';
import { Timeline } from './components/Feed/Timeline';
import { ComposePage } from './components/Tweet/ComposePage';
import { FloatingActionButton } from './components/ui/FloatingActionButton';
import { AuthModal } from './components/Auth/AuthModal';
import { useStore } from './store/useStore';

function App() {
  const { isRTL } = useStore();

  return (
    <Router>
      <div className={`min-h-screen bg-white ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="max-w-6xl mx-auto flex">
          {/* Desktop Sidebar */}
          <div className="hidden md:block">
            <Sidebar />
          </div>
          
          {/* Main Content */}
          <div className={`flex-1 ${isRTL ? 'md:mr-64' : 'md:ml-64'}`}>
            <Routes>
              <Route path="/" element={<Timeline />} />
              <Route path="/compose" element={<ComposePage />} />
              <Route path="/explore" element={<div className="p-8 text-center text-gray-500">Explore Page</div>} />
              <Route path="/notifications" element={<div className="p-8 text-center text-gray-500">Notifications Page</div>} />
              <Route path="/messages" element={<div className="p-8 text-center text-gray-500">Messages Page</div>} />
              <Route path="/bookmarks" element={<div className="p-8 text-center text-gray-500">Bookmarks Page</div>} />
              <Route path="/profile" element={<div className="p-8 text-center text-gray-500">Profile Page</div>} />
            </Routes>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        <MobileNavigation />
        
        {/* Floating Action Button */}
        <FloatingActionButton />

        {/* Auth Modal */}
        <AuthModal />
      </div>
    </Router>
  );
}

export default App;