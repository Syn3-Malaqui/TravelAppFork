import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { useNotifications } from './useNotifications';
import { useHashtags } from './useHashtags';
import { supabase } from '../lib/supabase';

interface PreloadedData {
  notifications: boolean;
  hashtags: boolean;
  userProfile: boolean;
}

export const usePreloader = () => {
  const { user } = useAuth();
  const { fetchNotifications } = useNotifications();
  const { fetchTrendingHashtags } = useHashtags();
  const preloadedRef = useRef<PreloadedData>({
    notifications: false,
    hashtags: false,
    userProfile: false,
  });
  const preloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Pre-load user profile data
  const preloadUserProfile = async () => {
    if (!user || preloadedRef.current.userProfile) return;

    try {
      // Pre-fetch user profile data and cache it
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          display_name,
          avatar_url,
          bio,
          verified,
          followers_count,
          following_count,
          created_at,
          cover_image,
          country
        `)
        .eq('id', user.id)
        .single();

      if (!error && data) {
        // Store in sessionStorage for quick access
        sessionStorage.setItem('preloaded_user_profile', JSON.stringify({
          data,
          timestamp: Date.now(),
          expiry: Date.now() + 5 * 60 * 1000 // 5 minutes
        }));
        preloadedRef.current.userProfile = true;
      }
    } catch (error) {
      console.debug('Pre-loading user profile failed:', error);
    }
  };

  // Pre-load notifications data
  const preloadNotifications = async () => {
    if (!user || preloadedRef.current.notifications) return;

    try {
      // Trigger notifications fetch in background
      await fetchNotifications();
      preloadedRef.current.notifications = true;
    } catch (error) {
      console.debug('Pre-loading notifications failed:', error);
    }
  };

  // Pre-load hashtags/explore data
  const preloadHashtags = async () => {
    if (preloadedRef.current.hashtags) return;

    try {
      // Trigger hashtags fetch in background
      await fetchTrendingHashtags();
      preloadedRef.current.hashtags = true;
    } catch (error) {
      console.debug('Pre-loading hashtags failed:', error);
    }
  };

  // Pre-load following users for profile suggestions
  const preloadFollowingSuggestions = async () => {
    if (!user) return;

    try {
      // Pre-fetch popular users for suggestions
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          display_name,
          avatar_url,
          verified,
          followers_count,
          bio
        `)
        .order('followers_count', { ascending: false })
        .limit(10);

      if (!error && data) {
        sessionStorage.setItem('preloaded_user_suggestions', JSON.stringify({
          data,
          timestamp: Date.now(),
          expiry: Date.now() + 10 * 60 * 1000 // 10 minutes
        }));
      }
    } catch (error) {
      console.debug('Pre-loading user suggestions failed:', error);
    }
  };

  // Staggered pre-loading to avoid overwhelming the system
  const startPreloading = () => {
    if (!user) return;

    // Clear any existing timeout
    if (preloadTimeoutRef.current) {
      clearTimeout(preloadTimeoutRef.current);
    }

    // Start pre-loading with delays to spread the load
    const preloadSequence = [
      { fn: preloadUserProfile, delay: 1000 },
      { fn: preloadNotifications, delay: 2000 },
      { fn: preloadHashtags, delay: 3000 },
      { fn: preloadFollowingSuggestions, delay: 4000 },
    ];

    preloadSequence.forEach(({ fn, delay }) => {
      setTimeout(() => {
        // Only preload if user is still authenticated
        if (user) {
          fn();
        }
      }, delay);
    });
  };

  // Start pre-loading when user is authenticated and after initial page load
  useEffect(() => {
    if (user) {
      // Wait a bit after user authentication to avoid interfering with initial page load
      preloadTimeoutRef.current = setTimeout(() => {
        startPreloading();
      }, 2000);
    } else {
      // Clear preloaded data when user logs out
      preloadedRef.current = {
        notifications: false,
        hashtags: false,
        userProfile: false,
      };
      sessionStorage.removeItem('preloaded_user_profile');
      sessionStorage.removeItem('preloaded_user_suggestions');
    }

    return () => {
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
    };
  }, [user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
    };
  }, []);

  return {
    isPreloaded: preloadedRef.current,
    startPreloading,
  };
};

// Utility function to get preloaded data
export const getPreloadedData = (key: string) => {
  try {
    const stored = sessionStorage.getItem(key);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    
    // Check if data has expired
    if (Date.now() > parsed.expiry) {
      sessionStorage.removeItem(key);
      return null;
    }

    return parsed.data;
  } catch (error) {
    console.debug('Error getting preloaded data:', error);
    return null;
  }
};