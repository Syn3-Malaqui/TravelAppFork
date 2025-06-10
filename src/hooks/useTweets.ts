import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Tweet, TweetWithProfile, TweetCategory } from '../types';

export const useTweets = () => {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTweets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('tweets')
        .select(`
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
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get current user to check likes/retweets/bookmarks
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get user's likes, retweets, and bookmarks if authenticated
      let userLikes: string[] = [];
      let userRetweets: string[] = [];
      let userBookmarks: string[] = [];
      
      if (user) {
        const [likesResult, retweetsResult, bookmarksResult] = await Promise.all([
          supabase.from('likes').select('tweet_id').eq('user_id', user.id),
          supabase.from('retweets').select('tweet_id').eq('user_id', user.id),
          supabase.from('bookmarks').select('tweet_id').eq('user_id', user.id)
        ]);
        
        userLikes = likesResult.data?.map(like => like.tweet_id) || [];
        userRetweets = retweetsResult.data?.map(retweet => retweet.tweet_id) || [];
        userBookmarks = bookmarksResult.data?.map(bookmark => bookmark.tweet_id) || [];
      }

      const formattedTweets: Tweet[] = (data as TweetWithProfile[]).map(tweet => ({
        id: tweet.id,
        content: tweet.content,
        author: {
          id: tweet.profiles.id,
          username: tweet.profiles.username,
          displayName: tweet.profiles.display_name,
          avatar: tweet.profiles.avatar_url || '',
          bio: tweet.profiles.bio,
          verified: tweet.profiles.verified,
          followers: tweet.profiles.followers_count,
          following: tweet.profiles.following_count,
          country: tweet.profiles.country,
          joinedDate: new Date(tweet.profiles.created_at),
        },
        createdAt: new Date(tweet.created_at),
        likes: tweet.likes_count,
        retweets: tweet.retweets_count,
        replies: tweet.replies_count,
        views: tweet.views_count,
        images: tweet.image_urls,
        isLiked: userLikes.includes(tweet.id),
        isRetweeted: userRetweets.includes(tweet.id),
        isBookmarked: userBookmarks.includes(tweet.id),
        hashtags: tweet.hashtags,
        mentions: tweet.mentions,
        tags: tweet.tags || [],
      }));

      setTweets(formattedTweets);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching tweets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createTweet = async (content: string, imageUrls: string[] = [], categories: TweetCategory[] = []) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Extract hashtags and mentions from content
      const hashtags = content.match(/#\w+/g)?.map(tag => tag.slice(1)) || [];
      const mentions = content.match(/@\w+/g)?.map(mention => mention.slice(1)) || [];

      const { data, error } = await supabase
        .from('tweets')
        .insert({
          content,
          author_id: user.id,
          image_urls: imageUrls,
          hashtags,
          mentions,
          tags: categories,
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh tweets after creating
      await fetchTweets();
      
      return data;
    } catch (err: any) {
      throw new Error(err.message);
    }
  };

  const likeTweet = async (tweetId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('likes')
        .insert({
          user_id: user.id,
          tweet_id: tweetId,
        });

      if (error) {
        // If it's a duplicate key error, the user already liked this tweet
        if (error.code === '23505') {
          throw new Error('Tweet already liked');
        }
        throw error;
      }
      
      // Update local state immediately for better UX
      setTweets(prevTweets => 
        prevTweets.map(tweet => 
          tweet.id === tweetId 
            ? { ...tweet, isLiked: true, likes: tweet.likes + 1 }
            : tweet
        )
      );
    } catch (err: any) {
      throw new Error(err.message);
    }
  };

  const unlikeTweet = async (tweetId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('likes')
        .delete()
        .match({
          user_id: user.id,
          tweet_id: tweetId,
        });

      if (error) throw error;
      
      // Update local state immediately for better UX
      setTweets(prevTweets => 
        prevTweets.map(tweet => 
          tweet.id === tweetId 
            ? { ...tweet, isLiked: false, likes: Math.max(0, tweet.likes - 1) }
            : tweet
        )
      );
    } catch (err: any) {
      throw new Error(err.message);
    }
  };

  const retweetTweet = async (tweetId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('retweets')
        .insert({
          user_id: user.id,
          tweet_id: tweetId,
        });

      if (error) {
        if (error.code === '23505') {
          throw new Error('Tweet already retweeted');
        }
        throw error;
      }
      
      // Update local state immediately for better UX
      setTweets(prevTweets => 
        prevTweets.map(tweet => 
          tweet.id === tweetId 
            ? { ...tweet, isRetweeted: true, retweets: tweet.retweets + 1 }
            : tweet
        )
      );
    } catch (err: any) {
      throw new Error(err.message);
    }
  };

  const unretweetTweet = async (tweetId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('retweets')
        .delete()
        .match({
          user_id: user.id,
          tweet_id: tweetId,
        });

      if (error) throw error;
      
      // Update local state immediately for better UX
      setTweets(prevTweets => 
        prevTweets.map(tweet => 
          tweet.id === tweetId 
            ? { ...tweet, isRetweeted: false, retweets: Math.max(0, tweet.retweets - 1) }
            : tweet
        )
      );
    } catch (err: any) {
      throw new Error(err.message);
    }
  };

  const bookmarkTweet = async (tweetId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('bookmarks')
        .insert({
          user_id: user.id,
          tweet_id: tweetId,
        });

      if (error) {
        if (error.code === '23505') {
          throw new Error('Tweet already bookmarked');
        }
        throw error;
      }
      
      // Update local state immediately for better UX
      setTweets(prevTweets => 
        prevTweets.map(tweet => 
          tweet.id === tweetId 
            ? { ...tweet, isBookmarked: true }
            : tweet
        )
      );
    } catch (err: any) {
      throw new Error(err.message);
    }
  };

  const unbookmarkTweet = async (tweetId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .match({
          user_id: user.id,
          tweet_id: tweetId,
        });

      if (error) throw error;
      
      // Update local state immediately for better UX
      setTweets(prevTweets => 
        prevTweets.map(tweet => 
          tweet.id === tweetId 
            ? { ...tweet, isBookmarked: false }
            : tweet
        )
      );
    } catch (err: any) {
      throw new Error(err.message);
    }
  };

  // Only fetch tweets once when the hook is first used
  useEffect(() => {
    fetchTweets();
  }, [fetchTweets]);

  return {
    tweets,
    loading,
    error,
    fetchTweets,
    createTweet,
    likeTweet,
    unlikeTweet,
    retweetTweet,
    unretweetTweet,
    bookmarkTweet,
    unbookmarkTweet,
  };
};