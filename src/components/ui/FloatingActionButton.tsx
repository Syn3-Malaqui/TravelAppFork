import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PenSquare } from 'lucide-react';
import { Button } from './button';

export const FloatingActionButton: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show on compose page or auth pages
  if (location.pathname === '/compose' || location.pathname.includes('/auth')) {
    return null;
  }

  const handleClick = () => {
    navigate('/compose');
  };

  return (
    <Button
      onClick={handleClick}
      className="md:hidden fixed bottom-20 right-4 w-14 h-14 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg z-40 p-0 flex items-center justify-center"
      aria-label="Compose post"
    >
      <PenSquare className="h-6 w-6" />
    </Button>
  );
};