import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Search, Plus, Bell, User } from 'lucide-react';
import { Button } from '../ui/button';

const navItems = [
  { icon: Home, label: 'Home', active: true },
  { icon: Search, label: 'Search' },
  { icon: Plus, label: 'Add Post' },
  { icon: Bell, label: 'Notifications' },
  { icon: User, label: 'Profile' },
];

export const MobileNavigation: React.FC = () => {
  const navigate = useNavigate();

  const handleNavClick = (label: string) => {
    if (label === 'Add Post') {
      navigate('/compose');
    }
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-1 z-50">
      <div className="flex items-center justify-around">
        {navItems.map((item) => (
          <Button
            key={item.label}
            variant="ghost"
            size="sm"
            className={`flex flex-col items-center p-6 min-w-0 ${
              item.active ? 'text-black' : 'text-gray-500'
            }`}
            onClick={() => handleNavClick(item.label)}
          >
            <item.icon className="w-10 h-10" />
          </Button>
        ))}
      </div>
    </div>
  );
};