import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useInteractions = (userId: string | undefined) => {
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [userRetweets, setUserRetweets] = useState<Set<string>>(new Set());
  const [userBookmarks, setUserBookmarks] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (userId) {
      fetchUserInteractions();
    }
  }, [userId]);

  const fetchUserInteractions = async () => {
    if (!userId) return;

    try {
      // Fetch likes
      const { data: likes } = await supabase
        .from('likes')
        .select('tweet_id')
        .eq('user_id', userId);

      // Fetch retweets
      const { data: retweets } = await supabase
        .from('retweets')
        .select('tweet_id')
        .eq('user_id', userId);

      // Fetch bookmarks
      const { data: bookmarks } = await supabase
        .from('bookmarks')
        .select('tweet_id')
        .eq('user_id', userId);

      setUserLikes(new Set(likes?.map(like => like.tweet_id) || []));
      setUserRetweets(new Set(retweets?.map(retweet => retweet.tweet_id) || []));
      setUserBookmarks(new Set(bookmarks?.map(bookmark => bookmark.tweet_id) || []));
    } catch (error) {
      console.error('Error fetching user interactions:', error);
    }
  };

  const toggleLike = async (tweetId: string) => {
    if (!userId) return;

    try {
      const isLiked = userLikes.has(tweetId);

      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', userId)
          .eq('tweet_id', tweetId);

        if (error) throw error;
        setUserLikes(prev => {
          const newSet = new Set(prev);
          newSet.delete(tweetId);
          return newSet;
        });
      } else {
        // Like
        const { error } = await supabase
          .from('likes')
          .insert({ user_id: userId, tweet_id: tweetId });

        if (error) throw error;
        setUserLikes(prev => new Set([...prev, tweetId]));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const toggleRetweet = async (tweetId: string) => {
    if (!userId) return;

    try {
      const isRetweeted = userRetweets.has(tweetId);

      if (isRetweeted) {
        // Unretweet
        const { error } = await supabase
          .from('retweets')
          .delete()
          .eq('user_id', userId)
          .eq('tweet_id', tweetId);

        if (error) throw error;
        setUserRetweets(prev => {
          const newSet = new Set(prev);
          newSet.delete(tweetId);
          return newSet;
        });
      } else {
        // Retweet
        const { error } = await supabase
          .from('retweets')
          .insert({ user_id: userId, tweet_id: tweetId });

        if (error) throw error;
        setUserRetweets(prev => new Set([...prev, tweetId]));
      }
    } catch (error) {
      console.error('Error toggling retweet:', error);
    }
  };

  const toggleBookmark = async (tweetId: string) => {
    if (!userId) return;

    try {
      const isBookmarked = userBookmarks.has(tweetId);

      if (isBookmarked) {
        // Remove bookmark
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', userId)
          .eq('tweet_id', tweetId);

        if (error) throw error;
        setUserBookmarks(prev => {
          const newSet = new Set(prev);
          newSet.delete(tweetId);
          return newSet;
        });
      } else {
        // Add bookmark
        const { error } = await supabase
          .from('bookmarks')
          .insert({ user_id: userId, tweet_id: tweetId });

        if (error) throw error;
        setUserBookmarks(prev => new Set([...prev, tweetId]));
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  return {
    userLikes,
    userRetweets,
    userBookmarks,
    toggleLike,
    toggleRetweet,
    toggleBookmark,
    refetch: fetchUserInteractions,
  };
};