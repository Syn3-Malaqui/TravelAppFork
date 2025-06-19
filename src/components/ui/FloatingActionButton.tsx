import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from './button';

export const FloatingActionButton: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Hide the button when user is on compose page or any compose-related route
  const shouldHideButton = location.pathname === '/compose' || 
                           location.pathname.startsWith('/compose');

  const handleClick = () => {
    navigate('/compose');
  };

  // Don't render the button if it should be hidden
  if (shouldHideButton) {
    return null;
  }

  return (
    <Button
      onClick={handleClick}
      className="md:hidden fixed bottom-28 right-6 w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 z-50 flex items-center justify-center"
      aria-label="Compose tweet"
    >
      <Plus className="w-6 h-6" />
    </Button>
  );
};