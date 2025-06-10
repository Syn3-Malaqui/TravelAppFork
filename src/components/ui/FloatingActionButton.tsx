import React from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from './button';
import { useStore } from '../../store/useStore';
import { useAuth } from '../../hooks/useAuth';

export const FloatingActionButton: React.FC = () => {
  const navigate = useNavigate();
  const { isRTL, setShowAuthModal } = useStore();
  const { user } = useAuth();

  const handleClick = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    navigate('/compose');
  };

  return (
    <Button
      onClick={handleClick}
      className={`md:hidden fixed bottom-20 ${isRTL ? 'left-4' : 'right-4'} w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center z-40 transition-all duration-200 hover:scale-105`}
    >
      <Plus className="w-6 h-6" />
    </Button>
  );
};