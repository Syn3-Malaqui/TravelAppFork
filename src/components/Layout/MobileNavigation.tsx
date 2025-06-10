import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Search, Plus, Bell, User, ArrowLeftRight, LogIn, LogOut } from 'lucide-react';
import { Button } from '../ui/button';
import { useStore } from '../../store/useStore';
import { useAuth } from '../../hooks/useAuth';

const navItems = [
  { icon: Home, label: 'Home', active: true },
  { icon: Search, label: 'Search' },
  { icon: Plus, label: 'Add Post' },
  { icon: Bell, label: 'Notifications' },
  { icon: User, label: 'Profile' },
];

export const MobileNavigation: React.FC = () => {
  const navigate = useNavigate();
  const { isRTL, toggleLayoutDirection, setShowAuthModal } = useStore();
  const { user, signOut } = useAuth();

  const handleNavClick = (label: string) => {
    if (label === 'Add Post') {
      if (!user) {
        setShowAuthModal(true);
        return;
      }
      navigate('/compose');
    }
  };

  const handleAuthClick = async () => {
    if (user) {
      try {
        await signOut();
      } catch (error) {
        console.error('Error signing out:', error);
      }
    } else {
      setShowAuthModal(true);
    }
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-1 z-50">
      <div className="flex items-center justify-around">
        {navItems.map((item) => (
          <Button
            key={item.label}
            variant="ghost"
            size="sm"
            className={`flex flex-col items-center p-3 min-w-0 ${
              item.active ? 'text-black' : 'text-gray-500'
            }`}
            onClick={() => handleNavClick(item.label)}
          >
            <item.icon className="w-6 h-6" />
          </Button>
        ))}
        
        {/* Mobile RTL/LTR Toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="flex flex-col items-center p-3 min-w-0 text-blue-500"
          onClick={toggleLayoutDirection}
          title={isRTL ? 'Switch to LTR' : 'Switch to RTL'}
        >
          <ArrowLeftRight className="w-6 h-6" />
        </Button>

        {/* Mobile Auth Toggle */}
        <Button
          variant="ghost"
          size="sm"
          className={`flex flex-col items-center p-3 min-w-0 ${user ? 'text-red-500' : 'text-green-500'}`}
          onClick={handleAuthClick}
          title={user ? 'Sign Out' : 'Sign In'}
        >
          {user ? <LogOut className="w-6 h-6" /> : <LogIn className="w-6 h-6" />}
        </Button>
      </div>
    </div>
  );
};