import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, UserPlus, UserMinus } from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { useFollow } from '../../hooks/useFollow';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { storageService } from '../../lib/storage';
import { User } from '../../types';

interface RouteParams {
  username: string;
  tab?: string; // followers | following
}

export const FollowListPage: React.FC = () => {
  const navigate = useNavigate();
  const { username, tab } = useParams() as { username: string; tab?: string };
  const { isFollowing, followUser, unfollowUser, loading: followLoading } = useFollow();
  const { user: currentUser } = useAuth();

  const [profileId, setProfileId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(tab === 'following' ? 'following' : 'followers');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Update activeTab when URL parameter changes
  useEffect(() => {
    setActiveTab(tab === 'following' ? 'following' : 'followers');
  }, [tab]);

  // Fetch profile id first
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username)
          .single();
        if (error) throw error;
        setProfileId(data.id);
      } catch (err: any) {
        setError('Profile not found');
      }
    };
    if (username) fetchProfile();
  }, [username]);

  const fetchUsers = useCallback(async () => {
    if (!profileId) return;
    try {
      setLoading(true);
      setError(null);
      
      let userIds: string[] = [];
      
      if (activeTab === 'followers') {
        // Get IDs of users who follow this profile
        const { data: followData, error: followError } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('following_id', profileId)
          .order('created_at', { ascending: false });
          
        if (followError) throw followError;
        userIds = followData.map(row => row.follower_id);
      } else {
        // Get IDs of users this profile follows
        const { data: followData, error: followError } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', profileId)
          .order('created_at', { ascending: false });
          
        if (followError) throw followError;
        userIds = followData.map(row => row.following_id);
      }
      
      // If no users found, set empty array and return
      if (userIds.length === 0) {
        setUsers([]);
        return;
      }
      
      // Fetch profile data for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, verified, followers_count, following_count, country, created_at')
        .in('id', userIds);
        
      if (profilesError) throw profilesError;
      
      // Map to User[] and maintain the order from follows table
      const profilesMap = new Map(profilesData.map(profile => [profile.id, profile]));
      const mapped: User[] = userIds
        .map(userId => profilesMap.get(userId))
        .filter((profile): profile is NonNullable<typeof profile> => !!profile) // Type-safe filter
        .map(profile => ({
          id: profile.id,
          username: profile.username,
          displayName: profile.display_name || profile.username,
          avatar: profile.avatar_url || '',
          bio: '',
          verified: profile.verified || false,
          followers: profile.followers_count || 0,
          following: profile.following_count || 0,
          joinedDate: new Date(profile.created_at),
          country: profile.country || 'US',
        }));
      
      setUsers(mapped);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, [profileId, activeTab]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleFollowToggle = async (userId: string) => {
    try {
      if (isFollowing(userId)) {
        await unfollowUser(userId);
      } else {
        await followUser(userId);
      }
    } catch (err) {
      console.error('Follow toggle error', err);
    }
  };

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="flex items-center px-4 py-3 border-b border-gray-200 bg-white/80 backdrop-blur-md flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="p-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="ml-4 text-lg font-bold capitalize">{activeTab}</h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 flex-shrink-0">
        {(['followers', 'following'] as const).map(t => (
          <Button
            key={t}
            variant="ghost"
            className={`flex-1 py-3 font-bold rounded-none border-b-2 transition-colors ${activeTab === t ? 'border-blue-500 text-black' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
            onClick={() => navigate(`/profile/${username}/${t}`)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </Button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading users...</p>
            </div>
          </div>
        ) : users.length === 0 ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-gray-400 text-2xl">👥</span>
              </div>
              <p className="text-gray-500 text-lg mb-2">
                {activeTab === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
              </p>
              <p className="text-gray-400 text-sm">
                {activeTab === 'followers' 
                  ? 'When people follow this user, they\'ll show up here.' 
                  : 'When this user follows people, they\'ll show up here.'
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {users.map(u => (
              <div key={u.id} className="flex items-center px-4 py-3 hover:bg-gray-50 transition-colors">
                <Avatar className="w-12 h-12 mr-3 flex-shrink-0">
                  <AvatarImage src={u.avatar ? storageService.getOptimizedImageUrl(u.avatar, { width:96, quality:80 }) : undefined} />
                  <AvatarFallback className="text-sm font-medium">{u.displayName[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-1 mb-1">
                    <Link to={`/profile/${u.username}`} className="font-bold text-gray-900 hover:underline truncate">
                      {u.displayName}
                    </Link>
                    {u.verified && (
                      <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate">@{u.username}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {u.followers.toLocaleString()} followers
                  </p>
                </div>
                {currentUser && currentUser.id !== u.id && (
                  <Button
                    variant={isFollowing(u.id) ? 'outline' : 'default'}
                    size="sm"
                    disabled={followLoading}
                    onClick={() => handleFollowToggle(u.id)}
                    className={`ml-3 flex-shrink-0 ${
                      isFollowing(u.id) 
                        ? 'border-gray-300 text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-300' 
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    {isFollowing(u.id) ? (
                      <>
                        <UserMinus className="w-4 h-4 mr-1" /> Following
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-1" /> Follow
                      </>
                    )}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};