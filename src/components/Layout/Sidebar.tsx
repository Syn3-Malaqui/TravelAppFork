import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  Search, 
  Bell, 
  Mail, 
  Bookmark, 
  User, 
  Settings,
  MoreHorizontal,
  Hash,
  Users,
  LogOut
} from 'lucide-react';
import { Button } from '../ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { useAuth } from '../../hooks/useAuth';

const sidebarItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Search, label: 'Explore', path: '/search' },
  { icon: Bell, label: 'Notifications', path: '/notifications' },
  { icon: Mail, label: 'Messages', path: '/messages' },
  { icon: Bookmark, label: 'Bookmarks', path: '/bookmarks' },
  { icon: Hash, label: 'Lists', path: '/lists' },
  { icon: Users, label: 'Communities', path: '/communities' },
  { icon: User, label: 'Profile', path: '/profile' },
  { icon: MoreHorizontal, label: 'More', path: '/more' },
];

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleTweetClick = () => {
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

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  return (
    <div className="w-64 h-screen fixed left-0 top-0 border-r border-gray-200 bg-white p-4 flex flex-col z-40">
      {/* Logo */}
      <div className="mb-8">
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-lg">X</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1">
        <ul className="space-y-2">
          {sidebarItems.map((item) => {
            const isActive = location.pathname === item.path;
            
            return (
              <li key={item.label}>
                <Button
                  variant="ghost"
                  onClick={() => handleNavClick(item.path)}
                  className={`w-full justify-start text-xl py-3 px-4 h-auto ${
                    isActive ? 'font-bold text-blue-500' : 'font-normal text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="mr-4 h-6 w-6" />
                  {item.label}
                </Button>
              </li>
            );
          })}
        </ul>

        {/* Settings Dropdown */}
        <DropdownMenu open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline"
              className="w-full mt-6 justify-start text-lg py-3 px-4 h-auto border-gray-300 hover:bg-gray-50"
            >
              <Settings className="mr-4 h-5 w-5" />
              Settings
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="start" 
            side="top"
            className="w-56 mb-2"
            sideOffset={8}
          >
            <DropdownMenuItem onClick={handleSignOut} className="text-red-600 hover:bg-red-50 cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Tweet Button */}
        <Button 
          className="w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-full text-lg"
          onClick={handleTweetClick}
        >
          Tweet
        </Button>
      </nav>

      {/* User Profile */}
      <div className="mt-auto">
        <div className="flex items-center p-3">
          <div className="w-10 h-10 bg-gray-300 rounded-full mr-3"></div>
          <div className="flex-1">
            <div className="font-bold text-sm">{user?.user_metadata?.display_name || 'User'}</div>
            <div className="text-gray-500 text-sm">@{user?.user_metadata?.username || 'user'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};