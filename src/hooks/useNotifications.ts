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

  // Highly optimized fetch with minimal data and caching
  const fetchNotifications = useCallback(async () => {
    try {
      // Prevent excessive fetching
      const now = Date.now();
      if (now - lastFetchRef.current < 2000) { // Minimum 2 seconds between fetches
        return;
      }
      lastFetchRef.current = now;

      setLoading(true);
      setError(null);

      if (!user) {
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      // Ultra-minimal query - only essential fields
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
            verified
          ),
          tweet:tweet_id (
            id,
            content,
            profiles (
              id,
              username,
              display_name,
              avatar_url,
              verified
            )
          )
        `)
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(15); // Significantly reduced limit

      if (error) throw error;

      // Process with minimal data transformation
      const formattedNotifications: Notification[] = (data || []).map(item => {
        const notification: Notification = {
          id: item.id,
          type: item.type,
          actor: {
            id: item.actor_profile.id,
            username: item.actor_profile.username,
            displayName: item.actor_profile.display_name,
            avatar: item.actor_profile.avatar_url || '',
            bio: '',
            verified: item.actor_profile.verified || false,
            followers: 0,
            following: 0,
            country: '',
            joinedDate: new Date(),
          },
          createdAt: new Date(item.created_at),
          read: item.read,
        };

        if (item.tweet) {
          notification.tweet = {
            id: item.tweet.id,
            content: item.tweet.content,
            author: {
              id: item.tweet.profiles.id,
              username: item.tweet.profiles.username,
              displayName: item.tweet.profiles.display_name,
              avatar: item.tweet.profiles.avatar_url || '',
              bio: '',
              verified: item.tweet.profiles.verified || false,
              followers: 0,
              following: 0,
              country: '',
              joinedDate: new Date(),
            },
            createdAt: new Date(),
            likes: 0,
            retweets: 0,
            replies: 0,
            views: 0,
            images: [],
            isLiked: false,
            isRetweeted: false,
            isBookmarked: false,
            hashtags: [],
            mentions: [],
            tags: [],
          };
        }

        return notification;
      });

      setNotifications(formattedNotifications);
      setUnreadCount(formattedNotifications.filter(n => !n.read).length);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Debounced fetch to prevent excessive calls
  const debouncedFetchNotifications = useCallback(() => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    
    fetchTimeoutRef.current = setTimeout(() => {
      fetchNotifications();
    }, 500); // 500ms debounce
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
              // Throttled refresh - only if not recently fetched
              const now = Date.now();
              if (now - lastFetchRef.current > 3000) { // 3 second minimum
                debouncedFetchNotifications();
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

  // Initial fetch with delay to prevent race conditions
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNotifications();
    }, 100);

    return () => clearTimeout(timer);
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
};