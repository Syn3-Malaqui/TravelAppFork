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

      console.log('📌 Pinning tweet to profile:', tweetId);

      const { data, error } = await supabase.rpc('pin_tweet_to_profile', {
        tweet_id: tweetId
      });

      if (error) {
        console.error('❌ Profile pin error:', error);
        throw error;
      }

      console.log('✅ Profile pin success:', data);
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

      console.log('📌 Unpinning tweet from profile:', tweetId);

      const { data, error } = await supabase.rpc('unpin_tweet_from_profile', {
        tweet_id: tweetId
      });

      if (error) {
        console.error('❌ Profile unpin error:', error);
        throw error;
      }

      console.log('✅ Profile unpin success:', data);
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

      console.log('🏠 Pinning tweet to home timeline:', tweetId);

      const { data, error } = await supabase.rpc('pin_tweet_to_home', {
        input_tweet_id: tweetId
      });

      if (error) {
        console.error('❌ Home pin error:', error);
        throw error;
      }

      console.log('✅ Home pin success:', data);
      
      // Log if it was a retweet that got converted to original
      if (data?.was_retweet) {
        console.log(`📌 Retweet ${data.input_tweet_id} was converted to original tweet ${data.pinned_tweet_id}`);
      }
      
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

      console.log('🏠 Unpinning tweet from home timeline:', tweetId);

      const { data, error } = await supabase.rpc('unpin_tweet_from_home', {
        input_tweet_id: tweetId
      });

      if (error) {
        console.error('❌ Home unpin error:', error);
        throw error;
      }

      console.log('✅ Home unpin success:', data);
      
      // Log if it was a retweet that got converted to original
      if (data?.was_retweet) {
        console.log(`📌 Retweet ${data.input_tweet_id} was converted to original tweet ${data.unpinned_tweet_id} for unpinning`);
      }
      
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
    if (!user) {
      console.log('🔍 Admin check: No user logged in');
      return false;
    }

    try {
      console.log('🔍 Checking admin status for user:', user.id);

      // Use the new helper function for more reliable admin checking
      const { data, error } = await supabase.rpc('check_admin_status');

      if (error) {
        console.error('❌ Admin check error:', error);
        throw error;
      }

      console.log('🔍 Admin check result:', data);
      
      // The function returns a JSON object with can_pin_to_home boolean
      return data?.can_pin_to_home || false;
    } catch (err) {
      console.error('Error checking admin status:', err);
      
      // Fallback to the old method if the new function fails
      try {
        console.log('🔄 Falling back to profile-based admin check');
        
        const { data, error } = await supabase
          .from('profiles')
          .select('verified, username, role')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        
        const isAdmin = data.verified && (data.username === 'admin' || data.role === 'admin');
        console.log('🔍 Fallback admin check:', { 
          verified: data.verified, 
          username: data.username, 
          role: data.role, 
          isAdmin 
        });
        
        return isAdmin;
      } catch (fallbackErr) {
        console.error('❌ Fallback admin check also failed:', fallbackErr);
        return false;
      }
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