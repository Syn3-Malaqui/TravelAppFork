import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export const usePinnedTweets = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pinToProfile = useCallback(async (tweetId: string) => {
    if (!user) {
      setError('User not authenticated');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.rpc('pin_tweet_to_profile', {
        tweet_id: tweetId
      });

      if (error) throw error;
      return true;
    } catch (err: any) {
      console.error('Error pinning tweet to profile:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const unpinFromProfile = useCallback(async (tweetId: string) => {
    if (!user) {
      setError('User not authenticated');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.rpc('unpin_tweet_from_profile', {
        tweet_id: tweetId
      });

      if (error) throw error;
      return true;
    } catch (err: any) {
      console.error('Error unpinning tweet from profile:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const pinToHome = useCallback(async (tweetId: string) => {
    if (!user) {
      setError('User not authenticated');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.rpc('pin_tweet_to_home', {
        tweet_id: tweetId
      });

      if (error) throw error;
      return true;
    } catch (err: any) {
      console.error('Error pinning tweet to home:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const unpinFromHome = useCallback(async (tweetId: string) => {
    if (!user) {
      setError('User not authenticated');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.rpc('unpin_tweet_from_home', {
        tweet_id: tweetId
      });

      if (error) throw error;
      return true;
    } catch (err: any) {
      console.error('Error unpinning tweet from home:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const checkIfUserIsAdmin = useCallback(async () => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('verified, username, role')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      
      return data.verified && (data.username === 'admin' || data.role === 'admin');
    } catch (err) {
      console.error('Error checking admin status:', err);
      return false;
    }
  }, [user]);

  return {
    pinToProfile,
    unpinFromProfile,
    pinToHome,
    unpinFromHome,
    checkIfUserIsAdmin,
    loading,
    error
  };
}; 