import React, { useState, useEffect } from 'react';
import { X, Search, User, UserPlus, UserMinus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { LazyAvatar } from '../ui/LazyAvatar';
import { useAuth } from '../../hooks/useAuth';
import { useFollow } from '../../hooks/useFollow';
import { useLanguageStore } from '../../store/useLanguageStore';
import { supabase } from '../../lib/supabase';
import { User as UserType } from '../../types';

interface FollowListModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  type: 'followers' | 'following';
  username: string;
}

interface UserListItem extends UserType {
  isFollowedByCurrentUser?: boolean;
}

export const FollowListModal: React.FC<FollowListModalProps> = ({
  isOpen,
  onClose,
  userId,
  type,
  username
}) => {
  const { user: currentUser } = useAuth();
  const { followUser, unfollowUser, isFollowing, loading: followLoading } = useFollow();
  const { language, isRTL } = useLanguageStore();
  
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      let query;
      if (type === 'followers') {
        query = supabase
          .from('follows')
          .select(`
            follower_id,
            profiles!follows_follower_id_fkey (
              id,
              username,
              display_name,
              avatar_url,
              bio,
              verified,
              followers_count,
              following_count,
              created_at
            )
          `)
          .eq('following_id', userId);
      } else {
        query = supabase
          .from('follows')
          .select(`
            following_id,
            profiles!follows_following_id_fkey (
              id,
              username,
              display_name,
              avatar_url,
              bio,
              verified,
              followers_count,
              following_count,
              created_at
            )
          `)
          .eq('follower_id', userId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      const formattedUsers: UserListItem[] = data.map((item: any) => {
        const profile = item.profiles;
        return {
          id: profile.id,
          username: profile.username,
          displayName: profile.display_name,
          avatar: profile.avatar_url || '',
          bio: profile.bio || '',
          verified: profile.verified || false,
          followers: profile.followers_count || 0,
          following: profile.following_count || 0,
          joinedDate: new Date(profile.created_at),
          isFollowedByCurrentUser: currentUser ? isFollowing(profile.id) : false,
        };
      });

      setUsers(formattedUsers);
      setFilteredUsers(formattedUsers);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setSearchQuery('');
    }
  }, [isOpen, userId, type]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = users.filter(user => 
        user.displayName.toLowerCase().includes(query) ||
        user.username.toLowerCase().includes(query) ||
        (user.bio && user.bio.toLowerCase().includes(query))
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  const handleFollow = async (targetUserId: string) => {
    if (!currentUser) return;

    try {
      const isCurrentlyFollowing = isFollowing(targetUserId);
      
      if (isCurrentlyFollowing) {
        await unfollowUser(targetUserId);
      } else {
        await followUser(targetUserId);
      }

      setUsers(prev => prev.map(user => 
        user.id === targetUserId 
          ? { ...user, isFollowedByCurrentUser: !isCurrentlyFollowing }
          : user
      ));
      setFilteredUsers(prev => prev.map(user => 
        user.id === targetUserId 
          ? { ...user, isFollowedByCurrentUser: !isCurrentlyFollowing }
          : user
      ));
    } catch (error: any) {
      console.error('Error toggling follow:', error.message);
    }
  };

  const title = type === 'followers' 
    ? (language === 'en' ? 'Followers' : 'المتابعون')
    : (language === 'en' ? 'Following' : 'المتابعة');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-md w-full h-[600px] p-0 overflow-hidden"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <DialogHeader className="p-4 border-b border-gray-200">
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <DialogTitle className="text-lg font-bold">
              {title}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            @{username}
          </p>
        </DialogHeader>

        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className={`absolute top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
            <input
              type="text"
              placeholder={language === 'en' ? 'Search people...' : 'البحث عن أشخاص...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full bg-gray-100 rounded-full py-2 text-gray-900 placeholder-gray-500 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all ${
                isRTL ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4 text-left'
              }`}
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <p className="text-red-500 text-center mb-2">
                {language === 'en' ? 'Error loading users' : 'خطأ في تحميل المستخدمين'}
              </p>
              <p className="text-sm text-gray-600 text-center mb-4">{error}</p>
              <Button onClick={fetchUsers} variant="outline" size="sm">
                {language === 'en' ? 'Try again' : 'حاول مرة أخرى'}
              </Button>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <User className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-lg text-gray-900 mb-2">
                {searchQuery ? 
                  (language === 'en' ? 'No users found' : 'لم يتم العثور على مستخدمين') :
                  (type === 'followers' ? 
                    (language === 'en' ? 'No followers yet' : 'لا يوجد متابعون بعد') :
                    (language === 'en' ? 'Not following anyone yet' : 'لا يتابع أحداً بعد')
                  )
                }
              </p>
              {searchQuery && (
                <p className="text-sm text-gray-500">
                  {language === 'en' ? 'Try a different search term' : 'جرب مصطلح بحث مختلف'}
                </p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredUsers.map((user) => (
                <div key={user.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-3' : 'space-x-3'}`}>
                    <LazyAvatar
                      src={user.avatar}
                      fallback={user.displayName[0]?.toUpperCase() || 'U'}
                      className="w-12 h-12 flex-shrink-0"
                      size={96}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'}`}>
                        <p className="font-bold text-gray-900 truncate">
                          {user.displayName}
                        </p>
                        {user.verified && (
                          <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </div>
                      <p className="text-gray-500 text-sm">@{user.username}</p>
                      {user.bio && (
                        <p className="text-gray-700 text-sm mt-1 line-clamp-2">
                          {user.bio}
                        </p>
                      )}
                      <p className="text-gray-500 text-xs mt-1">
                        {user.followers.toLocaleString()} {language === 'en' ? 'followers' : 'متابع'}
                      </p>
                    </div>

                    {currentUser && currentUser.id !== user.id && (
                      <Button
                        variant={user.isFollowedByCurrentUser ? "outline" : "default"}
                        size="sm"
                        onClick={() => handleFollow(user.id)}
                        disabled={followLoading}
                        className={`flex-shrink-0 ${
                          user.isFollowedByCurrentUser 
                            ? 'border-gray-300 text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-300' 
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                      >
                        {followLoading ? (
                          '...'
                        ) : user.isFollowedByCurrentUser ? (
                          <>
                            <UserMinus className="w-3 h-3 mr-1" />
                            {language === 'en' ? 'Following' : 'متابع'}
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3 h-3 mr-1" />
                            {language === 'en' ? 'Follow' : 'متابعة'}
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}; 