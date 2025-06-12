import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Tweet, TweetWithProfile, TweetCategory } from '../types';

export const useTweets = () => {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [followingTweets, setFollowingTweets] = useState<Tweet[]>([]);
  const [replies, setReplies] = useState<{ [tweetId: string]: Tweet[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatTweetData = (tweetData: TweetWithProfile, userLikes: string[], userRetweets: string[], userBookmarks: string[]): Tweet => {
    // If this is a retweet, we need to format the original tweet
    if (tweetData.is_retweet && tweetData.original_tweet) {
      const originalTweet: Tweet = {
        id: tweetData.original_tweet.id,
        content: tweetData.original_tweet.content,
        author: {
          id: tweetData.original_tweet.profiles.id,
          username: tweetData.original_tweet.profiles.username,
          displayName: tweetData.original_tweet.profiles.display_name,
          avatar: tweetData.original_tweet.profiles.avatar_url || '',
          bio: tweetData.original_tweet.profiles.bio,
          verified: tweetData.original_tweet.profiles.verified,
          followers: tweetData.original_tweet.profiles.followers_count,
          following: tweetData.original_tweet.profiles.following_count,
          country: tweetData.original_tweet.profiles.country,
          joinedDate: new Date(tweetData.original_tweet.profiles.created_at),
        },
        createdAt: new Date(tweetData.original_tweet.created_at),
        likes: tweetData.original_tweet.likes_count,
        retweets: tweetData.original_tweet.retweets_count,
        replies: tweetData.original_tweet.replies_count,
        views: tweetData.original_tweet.views_count,
        images: tweetData.original_tweet.image_urls,
        isLiked: userLikes.includes(tweetData.original_tweet.id),
        isRetweeted: userRetweets.includes(tweetData.original_tweet.id),
        isBookmarked: userBookmarks.includes(tweetData.original_tweet.id),
        hashtags: tweetData.original_tweet.hashtags,
        mentions: tweetData.original_tweet.mentions,
        tags: tweetData.original_tweet.tags || [],
        // Retweet information
        retweetedBy: {
          id: tweetData.profiles.id,
          username: tweetData.profiles.username,
          displayName: tweetData.profiles.display_name,
          avatar: tweetData.profiles.avatar_url || '',
          bio: tweetData.profiles.bio,
          verified: tweetData.profiles.verified,
          followers: tweetData.profiles.followers_count,
          following: tweetData.profiles.following_count,
          country: tweetData.profiles.country,
          joinedDate: new Date(tweetData.profiles.created_at),
        },
        retweetedAt: new Date(tweetData.created_at),
        isRetweet: true,
      };
      return originalTweet;
    }

    // Regular tweet
    return {
      id: tweetData.id,
      content: tweetData.content,
      author: {
        id: tweetData.profiles.id,
        username: tweetData.profiles.username,
        displayName: tweetData.profiles.display_name,
        avatar: tweetData.profiles.avatar_url || '',
        bio: tweetData.profiles.bio,
        verified: tweetData.profiles.verified,
        followers: tweetData.profiles.followers_count,
        following: tweetData.profiles.following_count,
        country: tweetData.profiles.country,
        joinedDate: new Date(tweetData.profiles.created_at),
      },
      createdAt: new Date(tweetData.created_at),
      likes: tweetData.likes_count,
      retweets: tweetData.retweets_count,
      replies: tweetData.replies_count,
      views: tweetData.views_count,
      images: tweetData.image_urls,
      isLiked: userLikes.includes(tweetData.id),
      isRetweeted: userRetweets.includes(tweetData.id),
      isBookmarked: userBookmarks.includes(tweetData.id),
      hashtags: tweetData.hashtags,
      mentions: tweetData.mentions,
      tags: tweetData.tags || [],
    };
  };

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
          ),
          original_tweet:original_tweet_id (
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
        .is('reply_to', null) // Only fetch top-level tweets, not replies
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

      const formattedTweets: Tweet[] = (data as TweetWithProfile[]).map(tweet => 
        formatTweetData(tweet, userLikes, userRetweets, userBookmarks)
      );

      setTweets(formattedTweets);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching tweets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFollowingTweets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setFollowingTweets([]);
        setLoading(false);
        return;
      }

      // First, get the list of users the current user follows
      const { data: followsData, error: followsError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (followsError) throw followsError;

      const followingIds = followsData.map(follow => follow.following_id);
      
      // If user doesn't follow anyone, return empty array
      if (followingIds.length === 0) {
        setFollowingTweets([]);
        setLoading(false);
        return;
      }

      // Fetch tweets from followed users (including their retweets)
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
          ),
          original_tweet:original_tweet_id (
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
        .in('author_id', followingIds)
        .is('reply_to', null) // Only fetch top-level tweets, not replies
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get user's likes, retweets, and bookmarks
      const [likesResult, retweetsResult, bookmarksResult] = await Promise.all([
        supabase.from('likes').select('tweet_id').eq('user_id', user.id),
        supabase.from('retweets').select('tweet_id').eq('user_id', user.id),
        supabase.from('bookmarks').select('tweet_id').eq('user_id', user.id)
      ]);
      
      const userLikes = likesResult.data?.map(like => like.tweet_id) || [];
      const userRetweets = retweetsResult.data?.map(retweet => retweet.tweet_id) || [];
      const userBookmarks = bookmarksResult.data?.map(bookmark => bookmark.tweet_id) || [];

      const formattedTweets: Tweet[] = (data as TweetWithProfile[]).map(tweet => 
        formatTweetData(tweet, userLikes, userRetweets, userBookmarks)
      );

      setFollowingTweets(formattedTweets);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching following tweets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchReplies = async (tweetId: string) => {
    try {
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
        .eq('reply_to', tweetId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get current user to check likes/retweets/bookmarks
      const { data: { user } } = await supabase.auth.getUser();
      
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

      const formattedReplies: Tweet[] = (data as TweetWithProfile[]).map(tweet => 
        formatTweetData(tweet, userLikes, userRetweets, userBookmarks)
      );

      setReplies(prev => ({
        ...prev,
        [tweetId]: formattedReplies
      }));

      return formattedReplies;
    } catch (err: any) {
      console.error('Error fetching replies:', err);
      throw new Error(err.message);
    }
  };

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
      await fetchFollowingTweets();
      
      return data;
    } catch (err: any) {
      throw new Error(err.message);
    }
  };

  const createReply = async (content: string, replyToId: string) => {
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
          reply_to: replyToId,
          hashtags,
          mentions,
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh main tweets to update reply count
      await fetchTweets();
      await fetchFollowingTweets();
      
      return data;
    } catch (err: any) {
      throw new Error(err.message);
    }
  };

  const createRetweet = async (originalTweetId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create a retweet record in the tweets table
      const { data, error } = await supabase
        .from('tweets')
        .insert({
          content: '', // Retweets don't have content
          author_id: user.id,
          is_retweet: true,
          original_tweet_id: originalTweetId,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('You have already retweeted this tweet');
        }
        throw error;
      }

      // Also add to retweets table for tracking
      await supabase
        .from('retweets')
        .insert({
          user_id: user.id,
          tweet_id: originalTweetId,
        });

      return data;
    } catch (err: any) {
      throw new Error(err.message);
    }
  };

  const removeRetweet = async (originalTweetId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Remove the retweet from tweets table
      const { error: tweetError } = await supabase
        .from('tweets')
        .delete()
        .match({
          author_id: user.id,
          original_tweet_id: originalTweetId,
          is_retweet: true,
        });

      if (tweetError) throw tweetError;

      // Remove from retweets table
      const { error: retweetError } = await supabase
        .from('retweets')
        .delete()
        .match({
          user_id: user.id,
          tweet_id: originalTweetId,
        });

      if (retweetError) throw retweetError;
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
      
      setFollowingTweets(prevTweets => 
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
      
      setFollowingTweets(prevTweets => 
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

      // Check if already retweeted and toggle accordingly
      const tweet = tweets.find(t => t.id === tweetId) || followingTweets.find(t => t.id === tweetId);
      if (tweet?.isRetweeted) {
        // If already retweeted, remove the retweet
        await removeRetweet(tweetId);
        // Refresh data to sync state
        await Promise.all([fetchTweets(), fetchFollowingTweets()]);
        return;
      }

      const { error } = await supabase
        .from('retweets')
        .insert({
          user_id: user.id,
          tweet_id: tweetId,
        });

      if (error) {
        if (error.code === '23505') {
          // If duplicate, it means it's already retweeted, so remove it instead
          await removeRetweet(tweetId);
          // Refresh data to sync state
          await Promise.all([fetchTweets(), fetchFollowingTweets()]);
          return;
        }
        throw error;
      }
      
      // Create the retweet entry in tweets table
      await createRetweet(tweetId);
      
      // Refresh data to sync state
      await Promise.all([fetchTweets(), fetchFollowingTweets()]);
    } catch (err: any) {
      throw new Error(err.message);
    }
  };

  const unretweetTweet = async (tweetId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Remove from both tables
      await removeRetweet(tweetId);
      
      // Refresh data to sync state
      await Promise.all([fetchTweets(), fetchFollowingTweets()]);
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
      
      setFollowingTweets(prevTweets => 
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
      
      setFollowingTweets(prevTweets => 
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
    fetchFollowingTweets();
  }, [fetchTweets, fetchFollowingTweets]);

  return {
    tweets,
    followingTweets,
    replies,
    loading,
    error,
    fetchTweets,
    fetchFollowingTweets,
    fetchReplies,
    createTweet,
    createReply,
    createRetweet,
    removeRetweet,
    likeTweet,
    unlikeTweet,
    retweetTweet,
    unretweetTweet,
    bookmarkTweet,
    unbookmarkTweet,
  };
};