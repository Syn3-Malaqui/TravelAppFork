import React from 'react';
import { useNavigate } from 'react-router-dom';
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
  Users
} from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { useStore } from '../../store/useStore';

const sidebarItems = [
  { icon: Home, label: 'Home', active: true },
  { icon: Search, label: 'Explore' },
  { icon: Bell, label: 'Notifications' },
  { icon: Mail, label: 'Messages' },
  { icon: Bookmark, label: 'Bookmarks' },
  { icon: Hash, label: 'Lists' },
  { icon: Users, label: 'Communities' },
  { icon: User, label: 'Profile' },
  { icon: MoreHorizontal, label: 'More' },
];

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useStore();

  const handleTweetClick = () => {
    navigate('/compose');
  };

  return (
    <div className="w-64 h-screen fixed left-0 top-0 border-r border-gray-200 bg-white p-4 flex flex-col">
      {/* Logo */}
      <div className="mb-8">
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-lg">X</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1">
        <ul className="space-y-2">
          {sidebarItems.map((item) => (
            <li key={item.label}>
              <Button
                variant="ghost"
                className={`w-full justify-start text-xl py-3 px-4 h-auto ${
                  item.active ? 'font-bold' : 'font-normal'
                }`}
              >
                <item.icon className="mr-4 h-6 w-6" />
                {item.label}
              </Button>
            </li>
          ))}
        </ul>

        {/* Tweet Button */}
        <Button 
          className="w-full mt-6 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-full text-lg"
          onClick={handleTweetClick}
        >
          Tweet
        </Button>
      </nav>

      {/* User Profile */}
      {currentUser && (
        <div className="mt-auto">
          <Button variant="ghost" className="w-full p-3 h-auto">
            <div className="flex items-center w-full">
              <Avatar className="mr-3">
                <AvatarImage src={currentUser.avatar} />
                <AvatarFallback>{currentUser.displayName[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <div className="font-bold text-sm">{currentUser.displayName}</div>
                <div className="text-gray-500 text-sm">@{currentUser.username}</div>
              </div>
              <MoreHorizontal className="h-4 w-4" />
            </div>
          </Button>
        </div>
      )}
    </div>
  );
};