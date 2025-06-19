import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Tweet, TweetWithProfile, TweetCategory } from '../types';

export const useTweets = () => {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [followingTweets, setFollowingTweets] = useState<Tweet[]>([]);
  const [replies, setReplies] = useState<{ [tweetId: string]: Tweet[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Cache for user interactions to reduce database queries
  const [userInteractions, setUserInteractions] = useState<{
    likes: Set<string>;
    retweets: Set<string>;
    bookmarks: Set<string>;
  }>({
    likes: new Set(),
    retweets: new Set(),
    bookmarks: new Set(),
  });

  // Debounce and batch updates
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdatesRef = useRef<Set<string>>(new Set());

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

  // Optimized function to fetch user interactions once and cache them
  const fetchUserInteractions = useCallback(async (tweetIds: string[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || tweetIds.length === 0) return;

      // Batch fetch all interactions in a single query each
      const [likesResult, retweetsResult, bookmarksResult] = await Promise.all([
        supabase
          .from('likes')
          .select('tweet_id')
          .eq('user_id', user.id)
          .in('tweet_id', tweetIds),
        supabase
          .from('retweets')
          .select('tweet_id')
          .eq('user_id', user.id)
          .in('tweet_id', tweetIds),
        supabase
          .from('bookmarks')
          .select('tweet_id')
          .eq('user_id', user.id)
          .in('tweet_id', tweetIds)
      ]);

      const likes = new Set(likesResult.data?.map(like => like.tweet_id) || []);
      const retweets = new Set(retweetsResult.data?.map(retweet => retweet.tweet_id) || []);
      const bookmarks = new Set(bookmarksResult.data?.map(bookmark => bookmark.tweet_id) || []);

      setUserInteractions({ likes, retweets, bookmarks });

      return {
        userLikes: Array.from(likes),
        userRetweets: Array.from(retweets),
        userBookmarks: Array.from(bookmarks),
      };
    } catch (error) {
      console.error('Error fetching user interactions:', error);
      return {
        userLikes: [],
        userRetweets: [],
        userBookmarks: [],
      };
    }
  }, []);

  const fetchTweets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simplified query - only fetch essential fields initially
      const { data, error } = await supabase
        .from('tweets')
        .select(`
          id,
          content,
          author_id,
          image_urls,
          hashtags,
          mentions,
          tags,
          likes_count,
          retweets_count,
          replies_count,
          views_count,
          created_at,
          is_retweet,
          original_tweet_id,
          profiles!tweets_author_id_fkey (
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
            id,
            content,
            image_urls,
            hashtags,
            mentions,
            tags,
            likes_count,
            retweets_count,
            replies_count,
            views_count,
            created_at,
            profiles!tweets_author_id_fkey (
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
        .is('reply_to', null)
        .order('created_at', { ascending: false })
        .limit(20); // Reduced limit for faster loading

      if (error) throw error;

      // Get all tweet IDs for interaction fetching
      const tweetIds = data?.map(tweet => tweet.id) || [];
      const originalTweetIds = data?.filter(tweet => tweet.original_tweet_id).map(tweet => tweet.original_tweet_id) || [];
      const allTweetIds = [...tweetIds, ...originalTweetIds];

      // Fetch user interactions
      const interactions = await fetchUserInteractions(allTweetIds);
      const { userLikes, userRetweets, userBookmarks } = interactions || { userLikes: [], userRetweets: [], userBookmarks: [] };

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
  }, [fetchUserInteractions]);

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

      // Optimized query using a single join instead of separate queries
      const { data, error } = await supabase
        .from('tweets')
        .select(`
          id,
          content,
          author_id,
          image_urls,
          hashtags,
          mentions,
          tags,
          likes_count,
          retweets_count,
          replies_count,
          views_count,
          created_at,
          is_retweet,
          original_tweet_id,
          profiles!tweets_author_id_fkey (
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
            id,
            content,
            image_urls,
            hashtags,
            mentions,
            tags,
            likes_count,
            retweets_count,
            replies_count,
            views_count,
            created_at,
            profiles!tweets_author_id_fkey (
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
        .in('author_id', 
          supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', user.id)
        )
        .is('reply_to', null)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Get all tweet IDs for interaction fetching
      const tweetIds = data?.map(tweet => tweet.id) || [];
      const originalTweetIds = data?.filter(tweet => tweet.original_tweet_id).map(tweet => tweet.original_tweet_id) || [];
      const allTweetIds = [...tweetIds, ...originalTweetIds];

      // Fetch user interactions
      const interactions = await fetchUserInteractions(allTweetIds);
      const { userLikes, userRetweets, userBookmarks } = interactions || { userLikes: [], userRetweets: [], userBookmarks: [] };

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
  }, [fetchUserInteractions]);

  const fetchReplies = async (tweetId: string) => {
    try {
      const { data, error } = await supabase
        .from('tweets')
        .select(`
          id,
          content,
          author_id,
          image_urls,
          hashtags,
          mentions,
          tags,
          likes_count,
          retweets_count,
          replies_count,
          views_count,
          created_at,
          profiles!tweets_author_id_fkey (
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

      // Get user interactions for replies
      const tweetIds = data?.map(tweet => tweet.id) || [];
      const interactions = await fetchUserInteractions(tweetIds);
      const { userLikes, userRetweets, userBookmarks } = interactions || { userLikes: [], userRetweets: [], userBookmarks: [] };

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

  // Optimized interaction functions with immediate UI updates and batched database updates
  const updateTweetInteraction = (tweetId: string, type: 'like' | 'retweet' | 'bookmark', isAdding: boolean) => {
    // Update local state immediately for better UX
    const updateTweetInList = (tweetList: Tweet[]) => 
      tweetList.map(tweet => {
        if (tweet.id === tweetId) {
          const updates: Partial<Tweet> = {};
          
          if (type === 'like') {
            updates.isLiked = isAdding;
            updates.likes = isAdding ? tweet.likes + 1 : Math.max(0, tweet.likes - 1);
          } else if (type === 'retweet') {
            updates.isRetweeted = isAdding;
            updates.retweets = isAdding ? tweet.retweets + 1 : Math.max(0, tweet.retweets - 1);
          } else if (type === 'bookmark') {
            updates.isBookmarked = isAdding;
          }
          
          return { ...tweet, ...updates };
        }
        return tweet;
      });

    setTweets(updateTweetInList);
    setFollowingTweets(updateTweetInList);

    // Update cached interactions
    setUserInteractions(prev => {
      const newInteractions = { ...prev };
      if (isAdding) {
        newInteractions[type === 'like' ? 'likes' : type === 'retweet' ? 'retweets' : 'bookmarks'].add(tweetId);
      } else {
        newInteractions[type === 'like' ? 'likes' : type === 'retweet' ? 'retweets' : 'bookmarks'].delete(tweetId);
      }
      return newInteractions;
    });
  };

  const likeTweet = async (tweetId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Update UI immediately
      updateTweetInteraction(tweetId, 'like', true);

      const { error } = await supabase
        .from('likes')
        .insert({
          user_id: user.id,
          tweet_id: tweetId,
        });

      if (error) {
        // Revert UI changes on error
        updateTweetInteraction(tweetId, 'like', false);
        if (error.code === '23505') {
          throw new Error('Tweet already liked');
        }
        throw error;
      }
    } catch (err: any) {
      throw new Error(err.message);
    }
  };

  const unlikeTweet = async (tweetId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Update UI immediately
      updateTweetInteraction(tweetId, 'like', false);

      const { error } = await supabase
        .from('likes')
        .delete()
        .match({
          user_id: user.id,
          tweet_id: tweetId,
        });

      if (error) {
        // Revert UI changes on error
        updateTweetInteraction(tweetId, 'like', true);
        throw error;
      }
    } catch (err: any) {
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

      // Only refresh if we're on the first page to avoid unnecessary queries
      await fetchTweets();
      await fetchFollowingTweets();
      
      return data;
    } catch (err: any) {
      throw new Error(err.message);
    }
  };

  const createReply = async (content: string, replyToId: string, imageUrls: string[] = []) => {
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
          image_urls: imageUrls,
          hashtags,
          mentions,
        })
        .select()
        .single();

      if (error) throw error;

      // Update reply count locally
      const updateReplyCount = (tweetList: Tweet[]) => 
        tweetList.map(tweet => 
          tweet.id === replyToId 
            ? { ...tweet, replies: tweet.replies + 1 }
            : tweet
        );

      setTweets(updateReplyCount);
      setFollowingTweets(updateReplyCount);
      
      return data;
    } catch (err: any) {
      throw new Error(err.message);
    }
  };

  const createRetweet = async (originalTweetId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Update UI immediately
      updateTweetInteraction(originalTweetId, 'retweet', true);

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
        // Revert UI changes on error
        updateTweetInteraction(originalTweetId, 'retweet', false);
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

      // Update UI immediately
      updateTweetInteraction(originalTweetId, 'retweet', false);

      // Remove the retweet from tweets table
      const { error: tweetError } = await supabase
        .from('tweets')
        .delete()
        .match({
          author_id: user.id,
          original_tweet_id: originalTweetId,
          is_retweet: true,
        });

      if (tweetError) {
        // Revert UI changes on error
        updateTweetInteraction(originalTweetId, 'retweet', true);
        throw tweetError;
      }

      // Remove from retweets table
      await supabase
        .from('retweets')
        .delete()
        .match({
          user_id: user.id,
          tweet_id: originalTweetId,
        });
    } catch (err: any) {
      throw new Error(err.message);
    }
  };

  const retweetTweet = async (tweetId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check current state from cache
      const isCurrentlyRetweeted = userInteractions.retweets.has(tweetId);
      
      if (isCurrentlyRetweeted) {
        await removeRetweet(tweetId);
      } else {
        await createRetweet(tweetId);
      }
    } catch (err: any) {
      throw new Error(err.message);
    }
  };

  const unretweetTweet = async (tweetId: string) => {
    await removeRetweet(tweetId);
  };

  const bookmarkTweet = async (tweetId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Update UI immediately
      updateTweetInteraction(tweetId, 'bookmark', true);

      const { error } = await supabase
        .from('bookmarks')
        .insert({
          user_id: user.id,
          tweet_id: tweetId,
        });

      if (error) {
        // Revert UI changes on error
        updateTweetInteraction(tweetId, 'bookmark', false);
        if (error.code === '23505') {
          throw new Error('Tweet already bookmarked');
        }
        throw error;
      }
    } catch (err: any) {
      throw new Error(err.message);
    }
  };

  const unbookmarkTweet = async (tweetId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Update UI immediately
      updateTweetInteraction(tweetId, 'bookmark', false);

      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .match({
          user_id: user.id,
          tweet_id: tweetId,
        });

      if (error) {
        // Revert UI changes on error
        updateTweetInteraction(tweetId, 'bookmark', true);
        throw error;
      }
    } catch (err: any) {
      throw new Error(err.message);
    }
  };

  // Only fetch tweets once when the hook is first used
  useEffect(() => {
    fetchTweets();
    fetchFollowingTweets();
  }, [fetchTweets, fetchFollowingTweets]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

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