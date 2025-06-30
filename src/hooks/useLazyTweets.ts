import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Tweet, TweetWithProfile } from '../types';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseLazyTweetsOptions {
  pageSize?: number;
  initialPageSize?: number;
  initialFirstChunk?: number;
  initialLoad?: boolean;
  followingOnly?: boolean;
}

export const useLazyTweets = (options: UseLazyTweetsOptions = {}) => {
  const { pageSize = 15, initialPageSize, initialFirstChunk = 20, initialLoad = true, followingOnly = false } = options;
  
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const offsetRef = useRef(0);
  const loadingRef = useRef(false);
  const cacheKey = followingOnly ? 'following-feed' : 'for-you-feed';
  const cacheTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const followingIdsRef = useRef<string[]>([]);
  const lastFetchTimeRef = useRef<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isDeployedRef = useRef<boolean>(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 5;

  // Detect if we're in a deployed environment
  useEffect(() => {
    isDeployedRef.current = window.location.hostname !== 'localhost' && 
                          window.location.hostname !== '127.0.0.1' &&
                          !window.location.hostname.includes('stackblitz');
  }, []);

  // Helper function to convert date strings back to Date objects
  const convertDatesToObjects = useCallback((tweet: any): Tweet => {
    return {
      ...tweet,
      createdAt: typeof tweet.createdAt === 'string' ? new Date(tweet.createdAt) : tweet.createdAt,
      retweetedAt: tweet.retweetedAt ? (typeof tweet.retweetedAt === 'string' ? new Date(tweet.retweetedAt) : tweet.retweetedAt) : undefined,
      author: {
        ...tweet.author,
        joinedDate: typeof tweet.author.joinedDate === 'string' ? new Date(tweet.author.joinedDate) : tweet.author.joinedDate,
      },
      retweetedBy: tweet.retweetedBy ? {
        ...tweet.retweetedBy,
        joinedDate: typeof tweet.retweetedBy.joinedDate === 'string' ? new Date(tweet.retweetedBy.joinedDate) : tweet.retweetedBy.joinedDate,
      } : undefined,
    };
  }, []);

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
      
      // Cache expires after 2 minutes for deployed environments, 5 minutes for local (increased for performance)
      const cacheExpiry = isDeployedRef.current ? 2 * 60 * 1000 : 5 * 60 * 1000;
      if (Date.now() - timestamp > cacheExpiry) {
        sessionStorage.removeItem(cacheKey);
        return null;
      }
      
      offsetRef.current = offset;
      
      // Convert date strings back to Date objects
      const tweetsWithDates = cachedTweets.map(convertDatesToObjects);
      
      return tweetsWithDates;
    } catch (error) {
      console.warn('Failed to get cached tweets:', error);
      return null;
    }
  }, [cacheKey, convertDatesToObjects]);

  const formatTweetData = useCallback((tweetData: any): Tweet => {
    const isRetweet = tweetData.is_retweet && tweetData.original_tweet;
    const tweetToUse = isRetweet ? tweetData.original_tweet : tweetData;
    const profileToUse = isRetweet ? tweetData.original_tweet.profiles : tweetData.profiles;

    return {
      id: tweetToUse.id,
      content: tweetToUse.content,
      author: {
        id: profileToUse.id,
        username: profileToUse.username,
        displayName: profileToUse.display_name || profileToUse.username,
        avatar: profileToUse.avatar_url || '',
        bio: profileToUse.bio || '',
        verified: profileToUse.verified || false,
        followers: profileToUse.followers_count || 0,
        following: profileToUse.following_count || 0,
        country: profileToUse.country || 'US',
        joinedDate: new Date(profileToUse.created_at),
      },
      createdAt: new Date(tweetToUse.created_at),
      likes: tweetToUse.likes_count || 0,
      retweets: tweetToUse.retweets_count || 0,
      replies: tweetToUse.replies_count || 0,
      views: tweetToUse.views_count || 0,
      images: tweetToUse.image_urls || [],
      // Default interaction states - will be updated async
      isLiked: false,
      isRetweeted: false,
      isBookmarked: false,
      hashtags: tweetToUse.hashtags || [],
      mentions: tweetToUse.mentions || [],
      tags: tweetToUse.tags || [],
      // Retweet info
      retweetedBy: isRetweet ? {
        id: tweetData.profiles.id,
        username: tweetData.profiles.username,
        displayName: tweetData.profiles.display_name || tweetData.profiles.username,
        avatar: tweetData.profiles.avatar_url || '',
        bio: tweetData.profiles.bio || '',
        verified: tweetData.profiles.verified || false,
        followers: tweetData.profiles.followers_count || 0,
        following: tweetData.profiles.following_count || 0,
        country: tweetData.profiles.country || 'US',
        joinedDate: new Date(tweetData.profiles.created_at),
      } : undefined,
      retweetedAt: isRetweet ? new Date(tweetData.created_at) : undefined,
      isRetweet: isRetweet,
    };
  }, []);

  // Fast user interactions update (async)
  const updateUserInteractions = useCallback(async (tweetIds: string[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || tweetIds.length === 0) return;

      // Simplified parallel queries
        const [likesResult, retweetsResult, bookmarksResult] = await Promise.all([
        supabase.from('likes').select('tweet_id').eq('user_id', user.id).in('tweet_id', tweetIds),
        supabase.from('retweets').select('tweet_id').eq('user_id', user.id).in('tweet_id', tweetIds),
        supabase.from('bookmarks').select('tweet_id').eq('user_id', user.id).in('tweet_id', tweetIds)
      ]);

      const likedIds = new Set(likesResult.data?.map(l => l.tweet_id) || []);
      const retweetedIds = new Set(retweetsResult.data?.map(r => r.tweet_id) || []);
      const bookmarkedIds = new Set(bookmarksResult.data?.map(b => b.tweet_id) || []);

      // Update tweet interaction states
      setTweets(prev => prev.map(tweet => ({
        ...tweet,
        isLiked: likedIds.has(tweet.id),
        isRetweeted: retweetedIds.has(tweet.id),
        isBookmarked: bookmarkedIds.has(tweet.id),
      })));

    } catch (error) {
      console.warn('Failed to update interactions:', error);
    }
  }, []);

  // Optimized main tweet loading function
  const loadMoreTweets = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;

    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);

      // Determine page size: use initialPageSize for first load, pageSize for subsequent
      const isFirstLoad = offsetRef.current === 0;
      const currentPageSize = isFirstLoad && initialPageSize ? Math.min(initialFirstChunk, initialPageSize) : pageSize;

      console.log('🔄 Loading tweets...', { 
        offset: offsetRef.current, 
        pageSize: currentPageSize,
        isFirstLoad,
        followingOnly 
      });

      // Build optimized query - minimal joins
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
            verified,
            followers_count,
            following_count,
            country,
            created_at,
            bio
          )
        `)
        .is('reply_to', null)
        .order('created_at', { ascending: false })
        .range(offsetRef.current, offsetRef.current + currentPageSize - 1);

      // Handle following filter
      if (followingOnly) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setHasMore(false);
          return;
        }

        // Get following IDs if not cached
        if (followingIdsRef.current.length === 0) {
          const { data: followingData } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', user.id);

          if (!followingData || followingData.length === 0) {
            setHasMore(false);
            return;
          }

          followingIdsRef.current = followingData.map(f => f.following_id);
        }

        query = query.in('author_id', followingIdsRef.current);
      }

      const { data, error } = await query;

      if (error) throw error;

      const tweetsData = Array.isArray(data) ? data : [];
      console.log('✅ Loaded tweets:', tweetsData.length);

      // Check if we have more data based on current page size
      if (tweetsData.length < currentPageSize) {
        setHasMore(false);
      }

      if (tweetsData.length > 0) {
        // Handle retweets - fetch original tweet data if needed
        const retweetIds = tweetsData
          .filter(t => t.is_retweet && t.original_tweet_id)
          .map(t => t.original_tweet_id);

        let originalTweets: any[] = [];
        if (retweetIds.length > 0) {
          const { data: originalData } = await supabase
        .from('tweets')
        .select(`
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
              verified,
              followers_count,
              following_count,
              country,
                created_at,
                bio
              )
            `)
            .in('id', retweetIds);

          originalTweets = originalData || [];
        }

        // Merge original tweet data
        const enhancedTweets = tweetsData.map(tweet => {
          if (tweet.is_retweet && tweet.original_tweet_id) {
            const originalTweet = originalTweets.find(ot => ot.id === tweet.original_tweet_id);
            return originalTweet ? { ...tweet, original_tweet: originalTweet } : tweet;
          }
          return tweet;
        });

        // Format tweets quickly
        const formattedTweets = enhancedTweets.map(formatTweetData);

        setTweets(prev => [...prev, ...formattedTweets]);
        offsetRef.current += tweetsData.length;
        
        // Update interactions asynchronously (non-blocking)
        const tweetIds = formattedTweets.map(t => t.id);
        setTimeout(() => updateUserInteractions(tweetIds), 100);

        // If this was first chunk and we still need to fetch the remaining of initialPageSize, do it in background
        if (isFirstLoad && initialPageSize && initialPageSize > initialFirstChunk) {
          const remaining = initialPageSize - initialFirstChunk;
          setTimeout(async () => {
            try {
              console.log('🔄 Loading remaining initial tweets...', { remaining });
              const { data: moreData, error: moreError, count: moreCount } = await supabase
                .from('tweets')
                .select(
                  `*, profiles(*), original_tweet:tweets(*, profiles(*))`,
                  { count: 'exact' }
                )
                .order('created_at', { ascending: false })
                .range(offsetRef.current, offsetRef.current + remaining - 1);

              if (moreError) throw moreError;

              const moreFormatted = (moreData as TweetWithProfile[]).map(formatTweetData);
              offsetRef.current += moreFormatted.length;
              setTweets(prev => [...prev, ...moreFormatted]);
              cacheTweets([...tweets, ...moreFormatted]);
              updateUserInteractions([...tweets, ...moreFormatted].map(t => t.id));
            } catch (err) {
              console.warn('Failed to load remaining initial tweets:', err);
            }
          }, 10); // minimal delay to yield to rendering
        }
      }

    } catch (err: any) {
      console.error('❌ Error loading tweets:', err);
      setError('Failed to load tweets. Please try again.');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [hasMore, pageSize, initialFirstChunk, initialPageSize, followingOnly, formatTweetData, updateUserInteractions]);

  const reset = useCallback(() => {
    console.log('🔄 Resetting tweets...');
    setTweets([]);
    setHasMore(true);
    setError(null);
    offsetRef.current = 0;
    loadingRef.current = false;
    followingIdsRef.current = [];
  }, []);

  // Initial load
  useEffect(() => {
    if (initialLoad) {
        loadMoreTweets();
    }
  }, [initialLoad, loadMoreTweets]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (cacheTimeoutRef.current) {
        clearTimeout(cacheTimeoutRef.current);
      }
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        supabase.removeChannel(channelRef.current);
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
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