import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Notification } from '../types';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from './useAuth';

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchRef = useRef<number>(0);
  const initialFetchDoneRef = useRef<boolean>(false);



  // Optimized fetch with minimal data
  const fetchNotifications = useCallback(async (isInitialFetch = false) => {
    try {
      // For subsequent fetches, prevent excessive calls
      if (!isInitialFetch) {
        const now = Date.now();
        if (now - lastFetchRef.current < 2000) {
          return;
        }
        lastFetchRef.current = now;
      }

      // Only set loading for initial fetch or when we have no data
      if (isInitialFetch || notifications.length === 0) {
        setLoading(true);
      }
      setError(null);

      if (!user) {
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      console.log('🔄 Fetching notifications for user:', user.id);

      // Simplified query - get notifications first, then actor profiles separately
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
        .limit(50); // Increased limit

      if (notificationsError) {
        console.error('❌ Notifications query error:', notificationsError);
        throw notificationsError;
      }

      console.log('✅ Notifications data loaded:', notificationsData?.length || 0);

      if (!notificationsData || notificationsData.length === 0) {
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      // Get unique actor IDs and tweet IDs
      const actorIds = [...new Set(notificationsData.map(n => n.actor_id))];
      const tweetIds = [...new Set(notificationsData.filter(n => n.tweet_id).map(n => n.tweet_id))];

      console.log('🔄 Fetching actor profiles:', actorIds.length);
      console.log('🔄 Fetching tweet data:', tweetIds.length);

      // Fetch actor profiles in parallel
      const { data: actorProfiles, error: actorError } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          display_name,
          avatar_url,
          verified,
          bio,
          followers_count,
          following_count,
          country,
          created_at
        `)
        .in('id', actorIds);

      if (actorError) {
        console.error('❌ Actor profiles error:', actorError);
        throw actorError;
      }

      // Fetch tweet data in parallel (only if we have tweet IDs)
      let tweetData: any[] = [];
      if (tweetIds.length > 0) {
        const { data: tweets, error: tweetsError } = await supabase
          .from('tweets')
          .select(`
            id,
            content,
            likes_count,
            retweets_count,
            replies_count,
            views_count,
            image_urls,
            hashtags,
            mentions,
            tags,
            created_at,
            author_id,
            profiles!tweets_author_id_fkey (
              id,
              username,
              display_name,
              avatar_url,
              verified,
              bio,
              followers_count,
              following_count,
              country,
              created_at
            )
          `)
          .in('id', tweetIds);

        if (tweetsError) {
          console.error('❌ Tweets error:', tweetsError);
          // Don't throw - tweets are optional
        } else {
          tweetData = tweets || [];
        }
      }

      console.log('✅ Actor profiles loaded:', actorProfiles?.length || 0);
      console.log('✅ Tweet data loaded:', tweetData.length);

      // Create lookup maps for efficient data assembly
      const actorMap = new Map(actorProfiles?.map(profile => [profile.id, profile]) || []);
      const tweetMap = new Map(tweetData.map(tweet => [tweet.id, tweet]));

      // Assemble notifications with related data
      const formattedNotifications: Notification[] = notificationsData
        .map(notifData => {
          const actor = actorMap.get(notifData.actor_id);
          if (!actor) {
            console.warn('⚠️ Missing actor profile for notification:', notifData.id);
            return null;
          }

          const notification: Notification = {
            id: notifData.id,
            type: notifData.type,
            actor: {
              id: actor.id,
              username: actor.username,
              displayName: actor.display_name || actor.username,
              avatar: actor.avatar_url || '',
              bio: actor.bio || '',
              verified: actor.verified || false,
              followers: actor.followers_count || 0,
              following: actor.following_count || 0,
              country: actor.country || '',
              joinedDate: new Date(actor.created_at),
            },
            createdAt: new Date(notifData.created_at),
            read: notifData.read,
          };

          // Add tweet data if available
          if (notifData.tweet_id) {
            const tweet = tweetMap.get(notifData.tweet_id);
            if (tweet && tweet.profiles) {
              notification.tweet = {
                id: tweet.id,
                content: tweet.content,
                author: {
                  id: tweet.profiles.id,
                  username: tweet.profiles.username,
                  displayName: tweet.profiles.display_name || tweet.profiles.username,
                  avatar: tweet.profiles.avatar_url || '',
                  bio: tweet.profiles.bio || '',
                  verified: tweet.profiles.verified || false,
                  followers: tweet.profiles.followers_count || 0,
                  following: tweet.profiles.following_count || 0,
                  country: tweet.profiles.country || '',
                  joinedDate: new Date(tweet.profiles.created_at),
                },
                createdAt: new Date(tweet.created_at),
                likes: tweet.likes_count || 0,
                retweets: tweet.retweets_count || 0,
                replies: tweet.replies_count || 0,
                views: tweet.views_count || 0,
                images: tweet.image_urls || [],
                isLiked: false,
                isRetweeted: false,
                isBookmarked: false,
                hashtags: tweet.hashtags || [],
                mentions: tweet.mentions || [],
                tags: tweet.tags || [],
              };
            }
          }

          return notification;
        })
        .filter(Boolean) as Notification[]; // Remove null entries

      console.log('✅ Formatted notifications:', formattedNotifications.length);

      setNotifications(formattedNotifications);
      setUnreadCount(formattedNotifications.filter(n => !n.read).length);
      
      if (isInitialFetch) {
        initialFetchDoneRef.current = true;
      }
    } catch (err: any) {
      console.error('❌ Error fetching notifications:', err);
      setError(err.message);
    } finally {
      // Always set loading to false after fetch completes
      setLoading(false);
    }
  }, [user, notifications.length]);

  // Debounced fetch for subsequent calls only
  const debouncedFetchNotifications = useCallback(() => {
    // Skip debouncing for initial fetch
    if (!initialFetchDoneRef.current) {
      return;
    }

    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    
    fetchTimeoutRef.current = setTimeout(() => {
      fetchNotifications(false);
    }, 500);
  }, [fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      // Update local state immediately for instant UI feedback
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      // Background database update
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) {
        // Revert on error
        setNotifications(prev =>
          prev.map(notification =>
            notification.id === notificationId
              ? { ...notification, read: false }
              : notification
          )
        );
        setUnreadCount(prev => prev + 1);
        throw error;
      }
    } catch (err: any) {
      console.error('Error marking notification as read:', err);
      throw new Error(err.message);
    }
  };

  const markAllAsRead = async () => {
    try {
      if (!user) return;

      const unreadNotifications = notifications.filter(n => !n.read);
      
      // Immediate UI update
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, read: true }))
      );
      setUnreadCount(0);

      // Background database update
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('recipient_id', user.id)
        .eq('read', false);

      if (error) {
        // Revert on error
        setNotifications(prev =>
          prev.map(notification => {
            const wasUnread = unreadNotifications.some(n => n.id === notification.id);
            return wasUnread ? { ...notification, read: false } : notification;
          })
        );
        setUnreadCount(unreadNotifications.length);
        throw error;
      }
    } catch (err: any) {
      console.error('Error marking all notifications as read:', err);
      throw new Error(err.message);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const notification = notifications.find(n => n.id === notificationId);
      
      // Immediate UI update
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      // Background database update
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        // Revert on error
        if (notification) {
          setNotifications(prev => [...prev, notification].sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ));
          if (!notification.read) {
            setUnreadCount(prev => prev + 1);
          }
        }
        throw error;
      }
    } catch (err: any) {
      console.error('Error deleting notification:', err);
      throw new Error(err.message);
    }
  };

  // Optimized real-time subscription with throttling
  useEffect(() => {
    const setupSubscription = async () => {
      try {
        // Clean up existing channel
        if (channelRef.current) {
          await channelRef.current.unsubscribe();
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }

        if (!user) return;

        const channelName = `notifications_user_${user.id}`;
        
        const channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `recipient_id=eq.${user.id}`,
            },
            () => {
              // Only throttle if initial fetch is done
              if (initialFetchDoneRef.current) {
                const now = Date.now();
                if (now - lastFetchRef.current > 3000) {
                  debouncedFetchNotifications();
                }
              }
            }
          );

        channelRef.current = channel;
        
        if (channel.state !== 'joined' && channel.state !== 'joining') {
          await channel.subscribe();
        }
      } catch (error) {
        console.error('Error setting up notifications subscription:', error);
      }
    };

    setupSubscription();

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [user, debouncedFetchNotifications]);

  // Initial fetch - immediate, no throttling
  useEffect(() => {
    if (user) {
      fetchNotifications(true); // Mark as initial fetch
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
    }
  }, [user]); // Only depend on user, not fetchNotifications to avoid loops

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications: () => fetchNotifications(false),
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
};