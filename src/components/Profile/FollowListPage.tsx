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
      let query;
      if (activeTab === 'followers') {
        query = supabase
          .from('follows')
          .select('follower_id:profiles(id, username, display_name, avatar_url, verified, followers_count, following_count, country, created_at)')
          .eq('following_id', profileId);
      } else {
        query = supabase
          .from('follows')
          .select('following_id:profiles(id, username, display_name, avatar_url, verified, followers_count, following_count, country, created_at)')
          .eq('follower_id', profileId);
      }
      const { data, error } = await query;
      if (error) throw error;
      // Map to User[]
      const mapped: User[] = (data || []).map((row: any) => {
        const p = activeTab === 'followers' ? row.follower_id : row.following_id;
        return {
          id: p.id,
          username: p.username,
          displayName: p.display_name || p.username,
          avatar: p.avatar_url || '',
          bio: '',
          verified: p.verified || false,
          followers: p.followers_count || 0,
          following: p.following_count || 0,
          joinedDate: new Date(p.created_at),
          country: p.country || 'US',
        };
      });
      setUsers(mapped);
    } catch (err: any) {
      setError(err.message);
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
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center px-4 py-3 border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="p-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="ml-4 text-lg font-bold capitalize">{activeTab}</h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {(['followers', 'following'] as const).map(t => (
          <Button
            key={t}
            variant="ghost"
            className={`flex-1 py-3 font-bold rounded-none border-b-2 ${activeTab === t ? 'border-blue-500' : 'border-transparent text-gray-500'}`}
            onClick={() => setActiveTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </Button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center">Loading…</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center">No users</div>
        ) : (
          users.map(u => (
            <div key={u.id} className="flex items-center px-4 py-3 border-b border-gray-100">
              <Avatar className="w-10 h-10 mr-3">
                <AvatarImage src={u.avatar ? storageService.getOptimizedImageUrl(u.avatar, { width:80, quality:80 }) : undefined} />
                <AvatarFallback>{u.displayName[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <Link to={`/profile/${u.username}`} className="font-bold hover:underline truncate block">
                  {u.displayName}
                </Link>
                <span className="text-sm text-gray-500 truncate block">@{u.username}</span>
              </div>
              {currentUser && currentUser.id !== u.id && (
                <Button
                  variant={isFollowing(u.id) ? 'outline' : 'default'}
                  size="sm"
                  disabled={followLoading}
                  onClick={() => handleFollowToggle(u.id)}
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
          ))
        )}
      </div>
    </div>
  );
}; 