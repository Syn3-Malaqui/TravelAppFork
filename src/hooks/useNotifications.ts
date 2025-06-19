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

  const formatNotificationData = (notificationData: NotificationWithProfile): Notification => {
    const notification: Notification = {
      id: notificationData.id,
      type: notificationData.type,
      actor: {
        id: notificationData.actor_profile.id,
        username: notificationData.actor_profile.username,
        displayName: notificationData.actor_profile.display_name,
        avatar: notificationData.actor_profile.avatar_url || '',
        bio: notificationData.actor_profile.bio,
        verified: notificationData.actor_profile.verified,
        followers: notificationData.actor_profile.followers_count,
        following: notificationData.actor_profile.following_count,
        country: notificationData.actor_profile.country,
        joinedDate: new Date(notificationData.actor_profile.created_at),
      },
      createdAt: new Date(notificationData.created_at),
      read: notificationData.read,
    };

    // Add tweet data if available
    if (notificationData.tweet) {
      notification.tweet = {
        id: notificationData.tweet.id,
        content: notificationData.tweet.content,
        author: {
          id: notificationData.tweet.profiles.id,
          username: notificationData.tweet.profiles.username,
          displayName: notificationData.tweet.profiles.display_name,
          avatar: notificationData.tweet.profiles.avatar_url || '',
          bio: notificationData.tweet.profiles.bio,
          verified: notificationData.tweet.profiles.verified,
          followers: notificationData.tweet.profiles.followers_count,
          following: notificationData.tweet.profiles.following_count,
          country: notificationData.tweet.profiles.country,
          joinedDate: new Date(notificationData.tweet.profiles.created_at),
        },
        createdAt: new Date(notificationData.tweet.created_at),
        likes: notificationData.tweet.likes_count,
        retweets: notificationData.tweet.retweets_count,
        replies: notificationData.tweet.replies_count,
        views: notificationData.tweet.views_count,
        images: notificationData.tweet.image_urls,
        isLiked: false, // We don't track this in notifications
        isRetweeted: false,
        isBookmarked: false,
        hashtags: notificationData.tweet.hashtags,
        mentions: notificationData.tweet.mentions,
        tags: notificationData.tweet.tags || [],
      };
    }

    return notification;
  };

  // Debounced fetch function to reduce database calls
  const debouncedFetchNotifications = useCallback(() => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    
    fetchTimeoutRef.current = setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);

        if (!user) {
          setNotifications([]);
          setUnreadCount(0);
          setLoading(false);
          return;
        }

        // Optimized query with reduced data fetching
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
              bio,
              verified,
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
                bio,
                verified,
                followers_count,
                following_count,
                country,
                created_at
              )
            )
          `)
          .eq('recipient_id', user.id)
          .order('created_at', { ascending: false })
          .limit(30); // Reduced limit

        if (error) throw error;

        const formattedNotifications: Notification[] = (data as NotificationWithProfile[]).map(
          formatNotificationData
        );

        setNotifications(formattedNotifications);
        setUnreadCount(formattedNotifications.filter(n => !n.read).length);
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching notifications:', err);
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce
  }, [user]);

  const fetchNotifications = useCallback(() => {
    debouncedFetchNotifications();
  }, [debouncedFetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      // Update local state immediately
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      // Then update database
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
      
      // Update local state immediately
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, read: true }))
      );
      setUnreadCount(0);

      // Then update database
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
      
      // Update local state immediately
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      // Then update database
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

  // Optimized real-time subscription with reduced frequency
  useEffect(() => {
    const setupSubscription = async () => {
      try {
        // Clean up existing channel first
        if (channelRef.current) {
          await channelRef.current.unsubscribe();
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }

        if (!user) return;

        // Create a unique channel name for this user
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
              // Debounced refresh to avoid excessive calls
              debouncedFetchNotifications();
            }
          );

        // Store the channel reference and subscribe
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

  useEffect(() => {
    fetchNotifications();
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