import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  Search, 
  Bell, 
  User, 
  LogOut,
  Languages,
  Settings,
  CheckCircle
} from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';

import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { useProfileSync } from '../../hooks/useProfileSync';
import { storageService } from '../../lib/storage';
import { supabase } from '../../lib/supabase';
import { useLanguageStore } from '../../store/useLanguageStore';
import { LanguageSelector } from '../ui/LanguageSelector';
import { AdminSetupButton } from '../AdminSetupButton';

const getSidebarItems = (language: string, isAdmin: boolean = false) => {
  console.log('🔍 getSidebarItems called with isAdmin:', isAdmin);
  
  const items = [
    { icon: Home, label: language === 'en' ? 'Home' : 'الرئيسية', path: '/' },
    { icon: Search, label: language === 'en' ? 'Explore' : 'استكشف', path: '/search' },
    { icon: Bell, label: language === 'en' ? 'Notifications' : 'الإشعارات', path: '/notifications' },
    { icon: User, label: language === 'en' ? 'Profile' : 'الملف الشخصي', path: '/profile' },
    { icon: Languages, label: language === 'en' ? 'Language' : 'اللغة', path: '/language' },
  ];
  
  if (isAdmin) {
    console.log('🔍 Adding Control Panel to sidebar items');
    items.splice(-1, 0, { 
      icon: Settings, 
      label: language === 'en' ? 'Control Panel' : 'لوحة التحكم', 
      path: '/admin' 
    });
  }
  
  console.log('🔍 Final sidebar items:', items);
  return items;
};

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { unreadCount } = useNotifications();
  const [languageSelectorOpen, setLanguageSelectorOpen] = useState(false);
  const { language, isRTL } = useLanguageStore();
  const [userProfile, setUserProfile] = useState<{
    displayName: string;
    username: string;
    avatar: string;
    isAdmin: boolean;
    verified?: boolean;
  } | null>(null);

  // Handle profile updates via real-time sync
  useProfileSync((profileUpdate) => {
    if (userProfile && user && user.id === profileUpdate.id) {
      setUserProfile(prev => prev ? {
        ...prev,
        verified: profileUpdate.verified ?? prev.verified,
        displayName: profileUpdate.display_name ?? prev.displayName,
        avatar: profileUpdate.avatar_url ?? prev.avatar,
      } : prev);
    }
  });

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('display_name, username, avatar_url, role, verified')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        // Debug logging - check what we're getting
        console.log('🔍 Profile Data:', data);
        console.log('🔍 User Email:', user.email);
        console.log('🔍 User ID:', user.id);

        // Check if user is admin by username OR role
        const isAdmin = data.username === 'admin' || data.role === 'admin';
        console.log('🔍 Is Admin Check:', { 
          username: data.username, 
          role: data.role, 
          isAdmin 
        });

        setUserProfile({
          displayName: data.display_name,
          username: data.username,
          avatar: data.avatar_url || '',
          isAdmin: isAdmin,
          verified: data.verified || false,
        });
      } catch (error) {
        console.error('Error fetching user profile:', error);
        // Fallback to auth metadata
        const fallbackUsername = user.user_metadata?.username || 'user';
        setUserProfile({
          displayName: user.user_metadata?.display_name || 'User',
          username: fallbackUsername,
          avatar: user.user_metadata?.avatar_url || '',
          isAdmin: fallbackUsername === 'admin',
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
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleNavClick = (path: string) => {
    if (path === '/language') {
      setLanguageSelectorOpen(true);
    } else {
      navigate(path);
    }
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  return (
    <div className={`w-64 h-full ${isRTL ? '' : 'border-r'} border-gray-200 bg-white p-4 flex flex-col`}>
      {/* Logo with Site Name */}
      <div className={`mb-6 flex items-center ${isRTL ? 'justify-end' : 'justify-start'}`}>
        <div className="w-12 h-12">
          <img 
            src="https://i.ibb.co/3YPVCWX2/Website-Logo.jpg" 
            alt="Logo" 
            className="w-full h-full object-contain"
          />
        </div>
        <span className={`font-bold text-xl text-[#1DA1F2] ${isRTL ? 'mr-2' : 'ml-2'}`}>سافر</span>
      </div>

      {/* User Profile - Moved below logo */}
      <div 
        className={`flex items-center ${isRTL ? 'p-3 pr-2' : 'p-3'} hover:bg-gray-50 rounded-lg cursor-pointer transition-colors mb-6 ${
          isRTL ? 'justify-end' : 'justify-start'
        }`}
        onClick={handleProfileClick}
      >
        {isRTL ? (
          <>
            <Avatar className="w-10 h-10 ml-3">
              <AvatarImage 
                src={userProfile?.avatar ? storageService.getOptimizedImageUrl(userProfile.avatar, { width: 80, quality: 80 }) : undefined} 
              />
              <AvatarFallback>{userProfile?.displayName[0]?.toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 text-right">
              <div className="font-bold text-sm truncate flex items-center justify-end">
                {userProfile?.displayName || 'User'}
                {userProfile?.verified && (
                  <CheckCircle className="w-4 h-4 text-blue-500 fill-current flex-shrink-0 mr-1" />
                )}
              </div>
              <div className="text-gray-500 text-sm truncate">@{userProfile?.username || 'user'}</div>
            </div>
          </>
        ) : (
          <>
            <Avatar className="w-10 h-10 mr-3">
              <AvatarImage 
                src={userProfile?.avatar ? storageService.getOptimizedImageUrl(userProfile.avatar, { width: 80, quality: 80 }) : undefined} 
              />
              <AvatarFallback>{userProfile?.displayName[0]?.toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 text-left">
              <div className="font-bold text-sm truncate flex items-center">
                {userProfile?.displayName || 'User'}
                {userProfile?.verified && (
                  <CheckCircle className="w-4 h-4 text-blue-500 fill-current flex-shrink-0 ml-1" />
                )}
              </div>
              <div className="text-gray-500 text-sm truncate">@{userProfile?.username || 'user'}</div>
            </div>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="mb-6">
        <ul className="space-y-2">
          {getSidebarItems(language, userProfile?.isAdmin).map((item) => {
            const isActive = location.pathname === item.path || (item.path === '/language' && languageSelectorOpen);
            const isNotifications = item.path === '/notifications';
            
            return (
              <li key={item.label}>
                <Button
                  variant="ghost"
                  onClick={() => handleNavClick(item.path)}
                  className={`w-full ${isRTL ? 'justify-end text-right pr-2' : 'justify-start text-left'} text-xl py-3 px-4 h-auto relative ${
                    isActive ? 'font-bold text-blue-500' : 'font-normal text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {isRTL ? (
                    <>
                      <div className="relative ml-3">
                        <item.icon className="h-6 w-6" />
                        {isNotifications && unreadCount > 0 && (
                          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </div>
                      <span>{item.label}</span>
                    </>
                  ) : (
                    <>
                      <div className="relative mr-3">
                        <item.icon className="h-6 w-6" />
                        {isNotifications && unreadCount > 0 && (
                          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </div>
                      <span>{item.label}</span>
                    </>
                  )}
                </Button>
              </li>
            );
          })}
        </ul>

        {/* Post Button */}
        <Button 
          className="w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-full text-lg"
          onClick={handleTweetClick}
        >
          {language === 'en' ? 'Post' : 'تغريد'}
        </Button>
      </nav>

      {/* Sign Out Button - Converted from Settings */}
      <div className="mt-auto">
        <Button 
          variant="ghost"
          onClick={handleSignOut}
          className={`w-full ${isRTL ? 'justify-end text-right pr-2' : 'justify-start text-left'} text-lg py-3 px-4 h-auto text-red-600 hover:bg-red-50`}
        >
          {isRTL ? (
            <>
              <LogOut className="h-5 w-5 ml-3" />
              <span>{language === 'en' ? 'Sign Out' : 'تسجيل الخروج'}</span>
            </>
          ) : (
            <>
              <LogOut className="h-5 w-5 mr-3" />
              <span>{language === 'en' ? 'Sign Out' : 'تسجيل الخروج'}</span>
            </>
          )}
        </Button>
      </div>

      {/* Admin Setup Button - Temporary Debug */}
      <AdminSetupButton />

      {/* Language Selector Modal */}
      <LanguageSelector 
        open={languageSelectorOpen} 
        onOpenChange={setLanguageSelectorOpen} 
      />
    </div>
  );
};