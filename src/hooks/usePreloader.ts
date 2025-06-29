import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { useHashtags } from './useHashtags';
import { supabase } from '../lib/supabase';
import { storageService } from '../lib/storage';

interface PreloadedData {
  notifications: boolean;
  hashtags: boolean;
  userProfile: boolean;
  userNotifications: boolean;
}

export const usePreloader = () => {
  const { user } = useAuth();
  const { fetchTrendingHashtags } = useHashtags();
  const preloadedRef = useRef<PreloadedData>({
    notifications: false,
    hashtags: false,
    userProfile: false,
    userNotifications: false,
  });
  const preloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Pre-load user profile data - now faster and more comprehensive
  const preloadUserProfile = async () => {
    if (!user || preloadedRef.current.userProfile) return;

    try {
      console.log('🚀 Preloading user profile data...');
      
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
          country,
          role
        `)
        .eq('id', user.id)
        .single();

      if (!error && data) {
        // Store in sessionStorage for quick access
        sessionStorage.setItem('preloaded_user_profile', JSON.stringify({
          data,
          timestamp: Date.now(),
          expiry: Date.now() + 10 * 60 * 1000 // 10 minutes
        }));
        preloadedRef.current.userProfile = true;
        console.log('✅ User profile preloaded:', data.username);
        
        // Preload avatar and cover images
        if (data.avatar_url) {
          storageService.preloadImage(
            storageService.getOptimizedImageUrl(data.avatar_url, { width: 80, quality: 80 })
          );
          storageService.preloadImage(
            storageService.getOptimizedImageUrl(data.avatar_url, { width: 200, quality: 80 })
          );
        }
        if (data.cover_image) {
          storageService.preloadImage(
            storageService.getOptimizedImageUrl(data.cover_image, { width: 800, quality: 80 })
          );
        }
      }
    } catch (error) {
      console.debug('Pre-loading user profile failed:', error);
    }
  };

  // Pre-load notifications data - direct database query for speed
  const preloadUserNotifications = async () => {
    if (!user || preloadedRef.current.userNotifications) return;

    try {
      console.log('🚀 Preloading notifications data...');
      
      // Direct notifications query with minimal data
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('notifications')
        .select(`
          id,
          type,
          read,
          created_at,
          actor_id,
          tweet_id
        `)
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20); // Smaller initial batch

      if (!notificationsError && notificationsData) {
        // Get unique actor IDs for profile preloading
        const actorIds = [...new Set(notificationsData.map(n => n.actor_id))];
        
        // Preload actor profiles
        if (actorIds.length > 0) {
          const { data: actorProfiles } = await supabase
            .from('profiles')
            .select(`
              id,
              username,
              display_name,
              avatar_url,
              verified
            `)
            .in('id', actorIds);

          // Preload avatar images
          actorProfiles?.forEach(profile => {
            if (profile.avatar_url) {
              storageService.preloadImage(
                storageService.getOptimizedImageUrl(profile.avatar_url, { width: 40, quality: 75 })
              );
            }
          });
        }

        // Store notifications data
        sessionStorage.setItem('preloaded_notifications', JSON.stringify({
          notifications: notificationsData,
          actors: actorIds,
          timestamp: Date.now(),
          expiry: Date.now() + 5 * 60 * 1000 // 5 minutes
        }));
        
        preloadedRef.current.userNotifications = true;
        console.log('✅ Notifications preloaded:', notificationsData.length);
      }
    } catch (error) {
      console.debug('Pre-loading notifications failed:', error);
    }
  };

  // Pre-load hashtags/explore data
  const preloadHashtags = async () => {
    if (preloadedRef.current.hashtags) return;

    try {
      console.log('🚀 Preloading trending hashtags...');
      // Trigger hashtags fetch in background
      await fetchTrendingHashtags();
      preloadedRef.current.hashtags = true;
      console.log('✅ Hashtags preloaded');
    } catch (error) {
      console.debug('Pre-loading hashtags failed:', error);
    }
  };

  // Pre-load following users for profile suggestions
  const preloadFollowingSuggestions = async () => {
    if (!user) return;

    try {
      console.log('🚀 Preloading user suggestions...');
      
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
        .limit(15) // Increased limit
        .neq('id', user.id); // Exclude current user

      if (!error && data) {
        sessionStorage.setItem('preloaded_user_suggestions', JSON.stringify({
          data,
          timestamp: Date.now(),
          expiry: Date.now() + 15 * 60 * 1000 // 15 minutes
        }));
        
        // Preload avatar images for suggested users
        data.forEach(suggestedUser => {
          if (suggestedUser.avatar_url) {
            storageService.preloadImage(
              storageService.getOptimizedImageUrl(suggestedUser.avatar_url, { width: 60, quality: 80 })
            );
          }
        });
        
        console.log('✅ User suggestions preloaded:', data.length);
      }
    } catch (error) {
      console.debug('Pre-loading user suggestions failed:', error);
    }
  };

  // Faster, parallel pre-loading to improve initial load time
  const startPreloading = () => {
    if (!user) return;

    console.log('🚀 Starting preloading sequence...');

    // Clear any existing timeout
    if (preloadTimeoutRef.current) {
      clearTimeout(preloadTimeoutRef.current);
    }

    // Start critical preloading immediately (profile + notifications)
    Promise.all([
      preloadUserProfile(),
      preloadUserNotifications()
    ]).then(() => {
      console.log('✅ Critical data preloaded');
    });

    // Start non-critical preloading with shorter delays
    setTimeout(() => preloadHashtags(), 500);
    setTimeout(() => preloadFollowingSuggestions(), 1000);
  };

  // Start pre-loading immediately when user is authenticated
  useEffect(() => {
    if (user) {
      // Start preloading immediately, no delay
      startPreloading();
    } else {
      // Clear preloaded data when user logs out
      preloadedRef.current = {
        notifications: false,
        hashtags: false,
        userProfile: false,
        userNotifications: false,
      };
      sessionStorage.removeItem('preloaded_user_profile');
      sessionStorage.removeItem('preloaded_user_suggestions');
      sessionStorage.removeItem('preloaded_notifications');
      storageService.clearCache();
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