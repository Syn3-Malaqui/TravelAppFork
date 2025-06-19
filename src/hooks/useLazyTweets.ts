import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Tweet, TweetWithProfile } from '../types';

interface UseLazyTweetsOptions {
  pageSize?: number;
  initialLoad?: boolean;
  followingOnly?: boolean;
}

export const useLazyTweets = (options: UseLazyTweetsOptions = {}) => {
  const { pageSize = 10, initialLoad = true, followingOnly = false } = options;
  
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const offsetRef = useRef(0);
  const loadingRef = useRef(false);
  const cacheKey = followingOnly ? 'following-feed' : 'for-you-feed';
  const cacheTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cache tweets in sessionStorage for better performance
  const cacheTweets = useCallback((tweetsToCache: Tweet[]) => {
    try {
      sessionStorage.setItem(
        cacheKey, 
        JSON.stringify({
          tweets: tweetsToCache,
          timestamp: Date.now(),
          offset: offsetRef.current
        })
      );
    } catch (error) {
      console.warn('Failed to cache tweets:', error);
    }
  }, [cacheKey]);

  // Get cached tweets if available
  const getCachedTweets = useCallback(() => {
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (!cached) return null;
      
      const { tweets: cachedTweets, timestamp, offset } = JSON.parse(cached);
      
      // Cache expires after 5 minutes
      if (Date.now() - timestamp > 5 * 60 * 1000) {
        sessionStorage.removeItem(cacheKey);
        return null;
      }
      
      offsetRef.current = offset;
      return cachedTweets;
    } catch (error) {
      console.warn('Failed to get cached tweets:', error);
      return null;
    }
  }, [cacheKey]);

  const formatTweetData = useCallback((tweetData: TweetWithProfile, userLikes: string[], userRetweets: string[], userBookmarks: string[]): Tweet => {
    // If this is a retweet, format the original tweet
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
  }, []);

  const fetchUserInteractions = useCallback(async (tweetIds: string[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || tweetIds.length === 0) return { userLikes: [], userRetweets: [], userBookmarks: [] };

      const [likesResult, retweetsResult, bookmarksResult] = await Promise.all([
        supabase.from('likes').select('tweet_id').eq('user_id', user.id).in('tweet_id', tweetIds),
        supabase.from('retweets').select('tweet_id').eq('user_id', user.id).in('tweet_id', tweetIds),
        supabase.from('bookmarks').select('tweet_id').eq('user_id', user.id).in('tweet_id', tweetIds)
      ]);

      return {
        userLikes: likesResult.data?.map(like => like.tweet_id) || [],
        userRetweets: retweetsResult.data?.map(retweet => retweet.tweet_id) || [],
        userBookmarks: bookmarksResult.data?.map(bookmark => bookmark.tweet_id) || [],
      };
    } catch (error) {
      console.error('Error fetching user interactions:', error);
      return { userLikes: [], userRetweets: [], userBookmarks: [] };
    }
  }, []);

  const loadMoreTweets = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;

    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user && followingOnly) {
        setHasMore(false);
        return;
      }

      let query = supabase
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
        .is('reply_to', null);

      // For following feed, get tweets only from followed users
      if (followingOnly && user) {
        // First, get the list of users the current user is following
        const { data: followingData, error: followingError } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);

        if (followingError) throw followingError;

        // If user is not following anyone, return empty array
        if (!followingData || followingData.length === 0) {
          setHasMore(false);
          setLoading(false);
          loadingRef.current = false;
          return;
        }

        const followingIds = followingData.map(follow => follow.following_id);
        query = query.in('author_id', followingIds);
      }

      // Apply pagination
      query = query
        .order('created_at', { ascending: false })
        .range(offsetRef.current, offsetRef.current + pageSize - 1);

      const { data, error } = await query;

      if (error) throw error;

      const tweetsData = Array.isArray(data) ? data : [];

      // Check if we have more data
      if (tweetsData.length < pageSize) {
        setHasMore(false);
      }

      if (tweetsData.length > 0) {
        // Get all tweet IDs for interaction fetching
        const tweetIds = tweetsData.map(tweet => tweet.id);
        const originalTweetIds = tweetsData.filter(tweet => tweet.original_tweet_id).map(tweet => tweet.original_tweet_id);
        const allTweetIds = [...tweetIds, ...originalTweetIds];

        // Fetch user interactions
        const { userLikes, userRetweets, userBookmarks } = await fetchUserInteractions(allTweetIds);

        const formattedTweets: Tweet[] = (tweetsData as TweetWithProfile[]).map(tweet => 
          formatTweetData(tweet, userLikes, userRetweets, userBookmarks)
        );

        // Sort by engagement score for "For You" feed
        if (!followingOnly) {
          formattedTweets.sort((a, b) => {
            const scoreA = a.likes * 1 + a.retweets * 2 + a.replies * 1.5;
            const scoreB = b.likes * 1 + b.retweets * 2 + b.replies * 1.5;
            return scoreB - scoreA;
          });
        }

        setTweets(prev => {
          const newTweets = [...prev, ...formattedTweets];
          // Cache the tweets
          if (cacheTimeoutRef.current) {
            clearTimeout(cacheTimeoutRef.current);
          }
          cacheTimeoutRef.current = setTimeout(() => {
            cacheTweets(newTweets);
          }, 500);
          return newTweets;
        });
        
        offsetRef.current += tweetsData.length;
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error loading tweets:', err);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [hasMore, pageSize, followingOnly, formatTweetData, fetchUserInteractions, cacheTweets]);

  const reset = useCallback(() => {
    setTweets([]);
    setHasMore(true);
    setError(null);
    offsetRef.current = 0;
    loadingRef.current = false;
    sessionStorage.removeItem(cacheKey);
  }, [cacheKey]);

  // Initial load
  useEffect(() => {
    if (initialLoad) {
      // Try to get cached tweets first
      const cachedTweets = getCachedTweets();
      if (cachedTweets && cachedTweets.length > 0) {
        setTweets(cachedTweets);
        // Still load more in the background to get fresh data
        setTimeout(() => {
          loadMoreTweets();
        }, 1000);
      } else {
        loadMoreTweets();
      }
    }
  }, [initialLoad, loadMoreTweets, getCachedTweets]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (cacheTimeoutRef.current) {
        clearTimeout(cacheTimeoutRef.current);
      }
    };
  }, []);

  return {
    tweets,
    loading,
    hasMore,
    error,
    loadMore: loadMoreTweets,
    reset,
  };
};