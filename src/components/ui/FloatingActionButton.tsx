import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from './button';

export const FloatingActionButton: React.FC = () => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/compose');
  };

  return (
    <Button
      onClick={handleClick}
      className="md:hidden fixed bottom-20 right-4 w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg z-40 p-0"
    >
      <Plus className="w-6 h-6" />
    </Button>
  );
};