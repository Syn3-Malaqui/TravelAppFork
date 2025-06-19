import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  Search, 
  Bell, 
  User, 
  Settings,
  LogOut,
  Hash,
  TrendingUp,
  ChevronRight
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
import { useHashtags } from '../../hooks/useHashtags';
import { storageService } from '../../lib/storage';
import { supabase } from '../../lib/supabase';

const sidebarItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Search, label: 'Explore', path: '/search' },
  { icon: Bell, label: 'Notifications', path: '/notifications' },
  { icon: User, label: 'Profile', path: '/profile' },
];

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { unreadCount } = useNotifications();
  const { trendingHashtags, loading: hashtagsLoading } = useHashtags();
  const [settingsOpen, setSettingsOpen] = useState(false);
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

  const handleHashtagClick = (hashtag: string) => {
    const cleanHashtag = hashtag.replace('#', '');
    navigate(`/hashtag/${cleanHashtag}`);
  };

  const handleViewAllHashtags = () => {
    navigate('/search');
  };

  return (
    <div className="w-64 h-screen fixed left-0 top-0 border-r border-gray-200 bg-white p-4 flex flex-col z-40">
      {/* Logo */}
      <div className="mb-8">
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
          {sidebarItems.map((item) => {
            const isActive = location.pathname === item.path;
            const isNotifications = item.path === '/notifications';
            
            return (
              <li key={item.label}>
                <Button
                  variant="ghost"
                  onClick={() => handleNavClick(item.path)}
                  className={`w-full justify-start text-xl py-3 px-4 h-auto relative ${
                    isActive ? 'font-bold text-blue-500' : 'font-normal text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="relative">
                    <item.icon className="mr-4 h-6 w-6" />
                    {isNotifications && unreadCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>
                  {item.label}
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
          Tweet
        </Button>
      </nav>

      {/* Trending Hashtags Section */}
      <div className="flex-1 overflow-hidden">
        <div className="bg-gray-50 rounded-2xl p-4 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Hash className="w-4 h-4 text-blue-500" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg">Trending</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleViewAllHashtags}
              className="text-blue-500 hover:text-blue-600 p-1"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Hashtags List */}
          <div className="flex-1 overflow-y-auto">
            {hashtagsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="animate-pulse">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {trendingHashtags.slice(0, 8).map((item, index) => (
                  <div
                    key={item.hashtag}
                    onClick={() => handleHashtagClick(item.hashtag)}
                    className="p-3 hover:bg-white rounded-xl cursor-pointer transition-colors group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Hash className="w-3 h-3 text-blue-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-gray-900 text-sm truncate group-hover:text-blue-600 transition-colors">
                            {item.hashtag}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {item.count.toLocaleString()} posts
                            {item.recent_tweets > 0 && (
                              <span className="ml-1 text-blue-500">
                                • {item.recent_tweets} recent
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 text-gray-400 flex-shrink-0 ml-2">
                        <TrendingUp className="w-3 h-3" />
                        <span className="text-xs">#{index + 1}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {trendingHashtags.length === 0 && !hashtagsLoading && (
                  <div className="text-center py-6 text-gray-500">
                    <Hash className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No trending hashtags</p>
                    <p className="text-xs text-gray-400 mt-1">Check back later!</p>
                  </div>
                )}

                {/* View More Button */}
                {trendingHashtags.length > 8 && (
                  <div className="pt-2">
                    <Button
                      variant="ghost"
                      onClick={handleViewAllHashtags}
                      className="w-full text-blue-500 hover:text-blue-600 hover:bg-blue-50 text-sm py-2 rounded-xl"
                    >
                      View all trends
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-gray-200 mt-3">
            <p className="text-xs text-gray-400 text-center">
              Trends from the past 48 hours
            </p>
          </div>
        </div>
      </div>

      {/* Settings and User Profile Section */}
      <div className="mt-4 space-y-4">
        {/* Settings Dropdown */}
        <DropdownMenu open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost"
              className="w-full justify-start text-lg py-3 px-4 h-auto text-gray-700 hover:bg-gray-100"
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

        {/* User Profile */}
        <div 
          className="flex items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
          onClick={handleProfileClick}
        >
          <Avatar className="w-10 h-10 mr-3">
            <AvatarImage 
              src={userProfile?.avatar ? storageService.getOptimizedImageUrl(userProfile.avatar, { width: 80, quality: 80 }) : undefined} 
            />
            <AvatarFallback>{userProfile?.displayName[0]?.toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm truncate">{userProfile?.displayName || 'User'}</div>
            <div className="text-gray-500 text-sm truncate">@{userProfile?.username || 'user'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};