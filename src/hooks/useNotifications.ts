import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Notification, NotificationWithProfile } from '../types';
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

  const formatNotificationData = (notificationData: NotificationWithProfile): Notification => {
    const notification: Notification = {
      id: notificationData.id,
      type: notificationData.type,
      actor: {
        id: notificationData.actor_profile.id,
        username: notificationData.actor_profile.username,
        displayName: notificationData.actor_profile.display_name,
        avatar: notificationData.actor_profile.avatar_url || '',
        bio: notificationData.actor_profile.bio || '',
        verified: notificationData.actor_profile.verified || false,
        followers: notificationData.actor_profile.followers_count || 0,
        following: notificationData.actor_profile.following_count || 0,
        country: notificationData.actor_profile.country || '',
        joinedDate: new Date(notificationData.actor_profile.created_at),
      },
      createdAt: new Date(notificationData.created_at),
      read: notificationData.read,
    };

    // Add minimal tweet data if available
    if (notificationData.tweet) {
      notification.tweet = {
        id: notificationData.tweet.id,
        content: notificationData.tweet.content,
        author: {
          id: notificationData.tweet.profiles.id,
          username: notificationData.tweet.profiles.username,
          displayName: notificationData.tweet.profiles.display_name,
          avatar: notificationData.tweet.profiles.avatar_url || '',
          bio: notificationData.tweet.profiles.bio || '',
          verified: notificationData.tweet.profiles.verified || false,
          followers: notificationData.tweet.profiles.followers_count || 0,
          following: notificationData.tweet.profiles.following_count || 0,
          country: notificationData.tweet.profiles.country || '',
          joinedDate: new Date(notificationData.tweet.profiles.created_at),
        },
        createdAt: new Date(notificationData.tweet.created_at),
        likes: notificationData.tweet.likes_count || 0,
        retweets: notificationData.tweet.retweets_count || 0,
        replies: notificationData.tweet.replies_count || 0,
        views: notificationData.tweet.views_count || 0,
        images: notificationData.tweet.image_urls || [],
        isLiked: false,
        isRetweeted: false,
        isBookmarked: false,
        hashtags: notificationData.tweet.hashtags || [],
        mentions: notificationData.tweet.mentions || [],
        tags: notificationData.tweet.tags || [],
      };
    }

    return notification;
  };

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

      // Optimized query with minimal data
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          id,
          type,
          read,
          created_at,
          actor_profile:actor_id (
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
          ),
          tweet:tweet_id (
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
            profiles (
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
          )
        `)
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(25); // Reasonable limit

      if (error) throw error;

      const formattedNotifications: Notification[] = (data as NotificationWithProfile[]).map(
        formatNotificationData
      );

      setNotifications(formattedNotifications);
      setUnreadCount(formattedNotifications.filter(n => !n.read).length);
      
      if (isInitialFetch) {
        initialFetchDoneRef.current = true;
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching notifications:', err);
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