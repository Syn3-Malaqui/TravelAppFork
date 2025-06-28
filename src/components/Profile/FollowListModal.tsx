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
        className="max-w-sm w-full h-[500px] p-0 overflow-hidden"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <DialogHeader className="px-3 py-1.5 border-b border-gray-200">
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div>
              <DialogTitle className="text-sm font-bold">
                {title}
              </DialogTitle>
              <p className="text-xs text-gray-500">
                @{username}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="px-3 py-1 border-b border-gray-200">
          <div className="relative">
            <Search className={`absolute top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400 ${isRTL ? 'right-2.5' : 'left-2.5'}`} />
            <input
              type="text"
              placeholder={language === 'en' ? 'Search people...' : 'البحث عن أشخاص...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full bg-gray-100 rounded-full py-1.5 text-sm text-gray-900 placeholder-gray-500 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all ${
                isRTL ? 'pr-8 pl-3 text-right' : 'pl-8 pr-3 text-left'
              }`}
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="px-3 py-0.5 space-y-1.5">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 bg-gray-200 rounded-full animate-pulse"></div>
                  <div className="flex-1">
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4 mb-1.5"></div>
                    <div className="h-2.5 bg-gray-200 rounded animate-pulse w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-3 px-3">
              <p className="text-red-500 text-center mb-2 text-sm">
                {language === 'en' ? 'Error loading users' : 'خطأ في تحميل المستخدمين'}
              </p>
              <p className="text-xs text-gray-600 text-center mb-3">{error}</p>
              <Button onClick={fetchUsers} variant="outline" size="sm" className="text-xs py-1 px-3">
                {language === 'en' ? 'Try again' : 'حاول مرة أخرى'}
              </Button>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-3 px-3">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <User className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-900 mb-2 text-center">
                {searchQuery ? 
                  (language === 'en' ? 'No users found' : 'لم يتم العثور على مستخدمين') :
                  (type === 'followers' ? 
                    (language === 'en' ? 'No followers yet' : 'لا يوجد متابعون بعد') :
                    (language === 'en' ? 'Not following anyone yet' : 'لا يتابع أحداً بعد')
                  )
                }
              </p>
              {searchQuery && (
                <p className="text-xs text-gray-500 text-center">
                  {language === 'en' ? 'Try a different search term' : 'جرب مصطلح بحث مختلف'}
                </p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredUsers.map((user) => (
                <div key={user.id} className="px-3 py-1 hover:bg-gray-50 transition-colors">
                  <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-2.5' : 'space-x-2.5'}`}>
                    <LazyAvatar
                      src={user.avatar}
                      fallback={user.displayName[0]?.toUpperCase() || 'U'}
                      className="w-9 h-9 flex-shrink-0"
                      size={72}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-1.5' : 'space-x-1.5'}`}>
                        <p className="font-semibold text-gray-900 truncate text-sm">
                          {user.displayName}
                        </p>
                        {user.verified && (
                          <div className="w-3.5 h-3.5 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </div>
                      <p className="text-gray-500 text-xs">@{user.username}</p>
                      {user.bio && (
                        <p className="text-gray-700 text-xs mt-0.5 line-clamp-1">
                          {user.bio}
                        </p>
                      )}
                      <p className="text-gray-500 text-xs mt-0.5">
                        {user.followers.toLocaleString()} {language === 'en' ? 'followers' : 'متابع'}
                      </p>
                    </div>

                    {currentUser && currentUser.id !== user.id && (
                      <Button
                        variant={user.isFollowedByCurrentUser ? "outline" : "default"}
                        size="sm"
                        onClick={() => handleFollow(user.id)}
                        disabled={followLoading}
                        className={`flex-shrink-0 text-xs py-1 px-2.5 ${
                          user.isFollowedByCurrentUser 
                            ? 'border-gray-300 text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-300' 
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                      >
                        {followLoading ? (
                          '...'
                        ) : user.isFollowedByCurrentUser ? (
                          <>
                            <UserMinus className="w-2.5 h-2.5 mr-1" />
                            {language === 'en' ? 'Following' : 'متابع'}
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-2.5 h-2.5 mr-1" />
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