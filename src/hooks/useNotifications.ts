import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Notification, NotificationWithProfile } from '../types';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
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
            *,
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
        .limit(50);

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
  }, []);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      // Update local state
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );

      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err: any) {
      console.error('Error marking notification as read:', err);
      throw new Error(err.message);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('recipient_id', user.id)
        .eq('read', false);

      if (error) throw error;

      // Update local state
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, read: true }))
      );

      setUnreadCount(0);
    } catch (err: any) {
      console.error('Error marking all notifications as read:', err);
      throw new Error(err.message);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      // Update local state
      const notification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err: any) {
      console.error('Error deleting notification:', err);
      throw new Error(err.message);
    }
  };

  // Set up real-time subscription for notifications
  useEffect(() => {
    const { data: { user } } = supabase.auth.getUser();
    
    user.then(({ user }) => {
      if (!user) return;

      const subscription = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `recipient_id=eq.${user.id}`,
          },
          () => {
            // Refresh notifications when new ones arrive
            fetchNotifications();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    });
  }, [fetchNotifications]);

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