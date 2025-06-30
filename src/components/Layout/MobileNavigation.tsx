import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Bell, MessageCircle, User, Settings, LogOut, Home, Languages } from 'lucide-react';
import { Button } from '../ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { useLanguageStore } from '../../store/useLanguageStore';
import { LanguageSelector } from '../ui/LanguageSelector';

export const MobileNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { unreadCount } = useNotifications();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [languageSelectorOpen, setLanguageSelectorOpen] = useState(false);
  const { language, isRTL } = useLanguageStore();

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setSettingsOpen(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <>
      <div className={`md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-4 z-50 shadow-lg ${isRTL ? 'font-arabic' : ''}`}>
        <div className="flex items-center justify-around px-4">
          {/* Messages */}
          <Button
            variant="ghost"
            size="lg"
            className={`p-3 min-w-0 rounded-xl transition-colors ${
              location.pathname === '/messages' ? 'text-blue-500 bg-blue-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => handleNavClick('/messages')}
          >
            <MessageCircle className="w-7 h-7" />
          </Button>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="lg"
            className={`p-3 min-w-0 rounded-xl transition-colors relative ${
              location.pathname === '/notifications' ? 'text-blue-500 bg-blue-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => handleNavClick('/notifications')}
          >
            <Bell className="w-7 h-7" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Button>

          {/* Home Button - Centered and Larger */}
          <Button
            variant="default"
            size="lg"
            className={`rounded-full p-5 shadow-lg transform hover:scale-105 transition-all duration-200 ${
              location.pathname === '/' 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
            onClick={() => handleNavClick('/')}
          >
            <Home className="w-8 h-8" />
          </Button>

          {/* Profile */}
          <Button
            variant="ghost"
            size="lg"
            className={`p-3 min-w-0 rounded-xl transition-colors ${
              location.pathname === '/profile' ? 'text-blue-500 bg-blue-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => handleNavClick('/profile')}
          >
            <User className="w-7 h-7" />
          </Button>

          {/* Settings - Using dropdown menu */}
          <DropdownMenu open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="lg"
                className="p-3 min-w-0 rounded-xl transition-colors text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              >
                <Settings className="w-7 h-7" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align={isRTL ? "start" : "end"}
              side="top"
              className="w-56"
              sideOffset={8}
              avoidCollisions={true}
              collisionPadding={8}
            >
              <DropdownMenuItem 
                onClick={() => {
                  handleNavClick('/search');
                  setSettingsOpen(false);
                }} 
                className="cursor-pointer"
              >
                <Search className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {language === 'en' ? 'Search' : 'البحث'}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  setLanguageSelectorOpen(true);
                  setSettingsOpen(false);
                }} 
                className="cursor-pointer"
              >
                <Languages className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {language === 'en' ? 'Language' : 'اللغة'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut} className="text-red-600 hover:bg-red-50 cursor-pointer">
                <LogOut className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {language === 'en' ? 'Sign Out' : 'تسجيل الخروج'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Language Selector Modal */}
      <LanguageSelector 
        open={languageSelectorOpen} 
        onOpenChange={setLanguageSelectorOpen} 
      />
    </>
  );
};