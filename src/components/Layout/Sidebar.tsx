import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  Search, 
  Bell, 
  // Mail, // Removed since Messages is hidden
  User, 
  Settings,
  LogOut,
  Languages
} from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
// import { useMessages } from '../../hooks/useMessages'; // Removed since Messages is hidden
import { storageService } from '../../lib/storage';
import { supabase } from '../../lib/supabase';
import { useLanguageStore } from '../../store/useLanguageStore';
import { LanguageSelector } from '../ui/LanguageSelector';

const getSidebarItems = (language: string) => [
  { icon: Home, label: language === 'en' ? 'Home' : 'الرئيسية', path: '/' },
  { icon: Search, label: language === 'en' ? 'Explore' : 'استكشف', path: '/search' },
  { icon: Bell, label: language === 'en' ? 'Notifications' : 'الإشعارات', path: '/notifications' },
  // { icon: Mail, label: 'Messages', path: '/messages' }, // Hidden per user request
  { icon: User, label: language === 'en' ? 'Profile' : 'الملف الشخصي', path: '/profile' },
];

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { unreadCount } = useNotifications();
  // const { totalUnreadCount: unreadMessagesCount } = useMessages(); // Removed since Messages is hidden
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [languageSelectorOpen, setLanguageSelectorOpen] = useState(false);
  const { language, isRTL } = useLanguageStore();
  const [userProfile, setUserProfile] = useState<{
    displayName: string;
    username: string;
    avatar: string;
  } | null>(null);

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('display_name, username, avatar_url')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        setUserProfile({
          displayName: data.display_name,
          username: data.username,
          avatar: data.avatar_url || '',
        });
      } catch (error) {
        console.error('Error fetching user profile:', error);
        // Fallback to auth metadata
        setUserProfile({
          displayName: user.user_metadata?.display_name || 'User',
          username: user.user_metadata?.username || 'user',
          avatar: user.user_metadata?.avatar_url || '',
        });
      }
    };

    fetchUserProfile();
  }, [user]);

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

  const handleProfileClick = () => {
    navigate('/profile');
  };

  return (
    <div className={`w-64 h-full ${isRTL ? 'border-l border-r-0' : 'border-r border-l-0'} border-gray-200 bg-white p-4 flex flex-col`}>
      {/* Logo */}
      <div className={`mb-8 ${isRTL ? 'flex justify-end' : 'flex justify-start'}`}>
        <div className="w-12 h-12">
          <img 
            src="https://i.ibb.co/3YPVCWX2/Website-Logo.jpg" 
            alt="Logo" 
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="mb-6">
        <ul className="space-y-2">
          {getSidebarItems(language).map((item) => {
            const isActive = location.pathname === item.path;
            const isNotifications = item.path === '/notifications';
            
            return (
              <li key={item.label}>
                <Button
                  variant="ghost"
                  onClick={() => handleNavClick(item.path)}
                  className={`w-full ${isRTL ? 'justify-end text-right' : 'justify-start text-left'} text-xl py-3 px-4 h-auto relative ${
                    isActive ? 'font-bold text-blue-500' : 'font-normal text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {isRTL ? (
                    <>
                      {item.label}
                      <div className="relative">
                        <item.icon className="h-6 w-6 ml-4" />
                        {isNotifications && unreadCount > 0 && (
                          <span className="absolute -top-2 -left-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="relative">
                        <item.icon className="h-6 w-6 mr-4" />
                        {isNotifications && unreadCount > 0 && (
                          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </div>
                      {item.label}
                    </>
                  )}
                </Button>
              </li>
            );
          })}
        </ul>

        {/* Tweet Button */}
        <Button 
          className="w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-full text-lg"
          onClick={handleTweetClick}
        >
          {language === 'en' ? 'Tweet' : 'تغريد'}
        </Button>
      </nav>

      {/* Settings and User Profile Section */}
      <div className="mt-auto space-y-4">
        {/* Settings Dropdown */}
        <DropdownMenu open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost"
              className={`w-full ${isRTL ? 'justify-end text-right' : 'justify-start text-left'} text-lg py-3 px-4 h-auto text-gray-700 hover:bg-gray-100`}
            >
              {isRTL ? (
                <>
                  {language === 'en' ? 'Settings' : 'الإعدادات'}
                  <Settings className="h-5 w-5 ml-4" />
                </>
              ) : (
                <>
                  <Settings className="h-5 w-5 mr-4" />
                  {language === 'en' ? 'Settings' : 'الإعدادات'}
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align={isRTL ? "end" : "start"}
            side="top"
            className="w-56"
            sideOffset={8}
            avoidCollisions={true}
            collisionPadding={8}
          >
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

        {/* User Profile */}
        <div 
          className={`flex items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors ${
            isRTL ? 'flex-row-reverse' : ''
          }`}
          onClick={handleProfileClick}
        >
          <Avatar className={`w-10 h-10 ${isRTL ? 'ml-3' : 'mr-3'}`}>
            <AvatarImage 
              src={userProfile?.avatar ? storageService.getOptimizedImageUrl(userProfile.avatar, { width: 80, quality: 80 }) : undefined} 
            />
            <AvatarFallback>{userProfile?.displayName[0]?.toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
          <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
            <div className="font-bold text-sm truncate">{userProfile?.displayName || 'User'}</div>
            <div className="text-gray-500 text-sm truncate">@{userProfile?.username || 'user'}</div>
          </div>
        </div>
      </div>

      {/* Language Selector Modal */}
      <LanguageSelector 
        open={languageSelectorOpen} 
        onOpenChange={setLanguageSelectorOpen} 
      />
    </div>
  );
};