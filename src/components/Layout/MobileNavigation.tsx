import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Plus, Bell, User, Settings, ArrowLeftRight, LogOut } from 'lucide-react';
import { Button } from '../ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import { useStore } from '../../store/useStore';
import { useAuth } from '../../hooks/useAuth';

const navItems = [
  { icon: Search, label: 'Search', path: '/search' },
  { icon: Bell, label: 'Notifications', path: '/notifications' },
  { icon: User, label: 'Profile', path: '/profile' },
];

export const MobileNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isRTL, toggleLayoutDirection } = useStore();
  const { signOut } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  const handleComposeClick = () => {
    navigate('/compose');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setSettingsOpen(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleLayoutToggle = () => {
    toggleLayoutDirection();
    setSettingsOpen(false);
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-1 z-50">
      <div className="flex items-center justify-between">
        {/* Left side navigation items */}
        <div className="flex items-center space-x-2">
          {navItems.slice(0, 2).map((item) => {
            const isActive = location.pathname === item.path;
            
            return (
              <Button
                key={item.label}
                variant="ghost"
                size="sm"
                className={`flex flex-col items-center p-3 min-w-0 ${
                  isActive ? 'text-blue-500' : 'text-gray-500'
                }`}
                onClick={() => handleNavClick(item.path)}
              >
                <item.icon className="w-6 h-6" />
              </Button>
            );
          })}
        </div>

        {/* Center - Compose Button */}
        <Button
          variant="default"
          size="sm"
          className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 shadow-lg"
          onClick={handleComposeClick}
        >
          <Plus className="w-6 h-6" />
        </Button>

        {/* Right side navigation items */}
        <div className="flex items-center space-x-2">
          {navItems.slice(2).map((item) => {
            const isActive = location.pathname === item.path;
            
            return (
              <Button
                key={item.label}
                variant="ghost"
                size="sm"
                className={`flex flex-col items-center p-3 min-w-0 ${
                  isActive ? 'text-blue-500' : 'text-gray-500'
                }`}
                onClick={() => handleNavClick(item.path)}
              >
                <item.icon className="w-6 h-6" />
              </Button>
            );
          })}
          
          {/* Mobile Settings Dropdown */}
          <DropdownMenu open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex flex-col items-center p-3 min-w-0 text-gray-500"
                title="Settings"
              >
                <Settings className="w-6 h-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="center" 
              side="top"
              className="w-48 mb-2"
              sideOffset={8}
            >
              <DropdownMenuItem onClick={handleLayoutToggle} className="hover:bg-gray-50 cursor-pointer">
                <ArrowLeftRight className={`${isRTL ? 'ml-2' : 'mr-2'} h-4 w-4`} />
                {isRTL ? 'Switch to LTR' : 'Switch to RTL'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-red-600 hover:bg-red-50 cursor-pointer">
                <LogOut className={`${isRTL ? 'ml-2' : 'mr-2'} h-4 w-4`} />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};