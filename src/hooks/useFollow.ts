import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useFollow = () => {
  const [followingUsers, setFollowingUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFollowing = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (error) throw error;

      setFollowingUsers(data.map(follow => follow.following_id));
    } catch (error) {
      console.error('Error fetching following:', error);
    }
  };

  const followUser = async (userId: string) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('follows')
        .insert({
          follower_id: user.id,
          following_id: userId,
        });

      if (error) {
        if (error.code === '23505') {
          throw new Error('Already following this user');
        }
        throw error;
      }

      setFollowingUsers(prev => [...prev, userId]);
    } catch (error: any) {
      throw new Error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const unfollowUser = async (userId: string) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('follows')
        .delete()
        .match({
          follower_id: user.id,
          following_id: userId,
        });

      if (error) throw error;

      setFollowingUsers(prev => prev.filter(id => id !== userId));
    } catch (error: any) {
      throw new Error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const isFollowing = (userId: string) => {
    return followingUsers.includes(userId);
  };

  useEffect(() => {
    fetchFollowing();
  }, []);

  return {
    followingUsers,
    loading,
    followUser,
    unfollowUser,
    isFollowing,
    fetchFollowing,
  };
};