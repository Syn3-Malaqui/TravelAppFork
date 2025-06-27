import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Tweet, TweetWithProfile } from '../types';
import type { RealtimeChannel } from '@supabase/supabase-js';

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
          bio: tweetData.original_tweet.profiles.bio || '',
          verified: tweetData.original_tweet.profiles.verified || false,
          followers: tweetData.original_tweet.profiles.followers_count || 0,
          following: tweetData.original_tweet.profiles.following_count || 0,
          country: tweetData.original_tweet.profiles.country || '',
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
          bio: tweetData.profiles.bio || '',
          verified: tweetData.profiles.verified || false,
          followers: tweetData.profiles.followers_count || 0,
          following: tweetData.profiles.following_count || 0,
          country: tweetData.profiles.country || '',
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
        bio: tweetData.profiles.bio || '',
        verified: tweetData.profiles.verified || false,
        followers: tweetData.profiles.followers_count || 0,
        following: tweetData.profiles.following_count || 0,
        country: tweetData.profiles.country || '',
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

      // Split into smaller batches to avoid URL length limits
      const batchSize = 20;
      const batches = [];
      
      for (let i = 0; i < tweetIds.length; i += batchSize) {
        batches.push(tweetIds.slice(i, i + batchSize));
      }
      
      let allLikes: string[] = [];
      let allRetweets: string[] = [];
      let allBookmarks: string[] = [];
      
      // Process each batch
      for (const batch of batches) {
        const [likesResult, retweetsResult, bookmarksResult] = await Promise.all([
          supabase.from('likes').select('tweet_id').eq('user_id', user.id).in('tweet_id', batch),
          supabase.from('retweets').select('tweet_id').eq('user_id', user.id).in('tweet_id', batch),
          supabase.from('bookmarks').select('tweet_id').eq('user_id', user.id).in('tweet_id', batch)
        ]);
        
        if (likesResult.data) allLikes = [...allLikes, ...likesResult.data.map(like => like.tweet_id)];
        if (retweetsResult.data) allRetweets = [...allRetweets, ...retweetsResult.data.map(retweet => retweet.tweet_id)];
        if (bookmarksResult.data) allBookmarks = [...allBookmarks, ...bookmarksResult.data.map(bookmark => bookmark.tweet_id)];
      }

      return {
        userLikes: allLikes,
        userRetweets: allRetweets,
        userBookmarks: allBookmarks,
      };
    } catch (error) {
      console.error('Error fetching user interactions:', error);
      return { userLikes: [], userRetweets: [], userBookmarks: [] };
    }
  }, []);

  // Fetch following users for real-time filtering
  const fetchFollowingUsers = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: followingData, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (error) throw error;

      const followingIds = followingData?.map(follow => follow.following_id) || [];
      followingIdsRef.current = followingIds;
      return followingIds;
    } catch (error) {
      console.error('Error fetching following users:', error);
      return [];
    }
  }, []);

  // Enhanced polling for deployed environments
  const checkForNewTweets = useCallback(async () => {
    try {
      if (!lastFetchTimeRef.current) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user && followingOnly) return;

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
        .is('reply_to', null)
        .gt('created_at', lastFetchTimeRef.current)
        .order('created_at', { ascending: false })
        .limit(20); // Increased limit for deployed environments

      // For following feed, filter by followed users
      if (followingOnly && user) {
        if (followingIdsRef.current.length === 0) {
          await fetchFollowingUsers();
        }
        
        if (followingIdsRef.current.length === 0) return;
        query = query.in('author_id', followingIdsRef.current);
      }

      const { data, error } = await query;

      if (error) throw error;

      const tweetsData = Array.isArray(data) ? data : [];

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

        // Add new tweets to the beginning of the list
        setTweets(prev => {
          const existingIds = new Set(prev.map(t => t.id));
          const newTweets = formattedTweets.filter(tweet => !existingIds.has(tweet.id));
          
          if (newTweets.length > 0) {
            const updatedTweets = [...newTweets, ...prev];
            
            // Cache the updated tweets
            if (cacheTimeoutRef.current) {
              clearTimeout(cacheTimeoutRef.current);
            }
            cacheTimeoutRef.current = setTimeout(() => {
              cacheTweets(updatedTweets);
            }, 500);
            
            return updatedTweets;
          }
          return prev;
        });

        // Update last fetch time to the newest tweet's timestamp
        lastFetchTimeRef.current = tweetsData[0].created_at;
        
        // Reset retry counter on success
        retryCountRef.current = 0;
      }
    } catch (error) {
      console.error('Error checking for new tweets:', error);
      
      // Implement exponential backoff for retries
      if (retryCountRef.current < maxRetries) {
        const backoffTime = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
        console.log(`Retrying in ${backoffTime}ms (attempt ${retryCountRef.current + 1}/${maxRetries})`);
        
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
        
        retryTimeoutRef.current = setTimeout(() => {
          retryCountRef.current++;
          checkForNewTweets();
        }, backoffTime);
      }
    }
  }, [followingOnly, fetchUserInteractions, formatTweetData, cacheTweets, fetchFollowingUsers]);

  // Disabled polling - only fetch on manual refresh
  // useEffect(() => {
  //   if (!lastFetchTimeRef.current) return;

  //   // More frequent polling for deployed environments
  //   const pollingInterval = isDeployedRef.current ? 5000 : 10000; // 5s for deployed, 10s for local
    
  //   pollingIntervalRef.current = setInterval(() => {
  //     checkForNewTweets();
  //   }, pollingInterval);

  //   return () => {
  //     if (pollingIntervalRef.current) {
  //       clearInterval(pollingIntervalRef.current);
  //     }
  //   };
  // }, [checkForNewTweets]);

  // Handle real-time tweet insertions via Supabase realtime
  const handleNewTweet = useCallback(async (payload: any) => {
    try {
      // Don't add if this is a reply (we only want main timeline tweets)
      if (payload.new.reply_to) return;

      // For following feed, check if the author is in the following list
      if (followingOnly && !followingIdsRef.current.includes(payload.new.author_id)) {
        return;
      }

      // Fetch the complete tweet data with profile information
      const { data: tweetData, error } = await supabase
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
        .eq('id', payload.new.id)
        .single();

      if (error || !tweetData) return;

      // Get user interactions for the new tweet
      const { userLikes, userRetweets, userBookmarks } = await fetchUserInteractions([tweetData.id]);

      // Format the new tweet
      const formattedTweet = formatTweetData(tweetData as TweetWithProfile, userLikes, userRetweets, userBookmarks);

      // Add to the beginning of the tweets list
      setTweets(prev => {
        // Check if tweet already exists to avoid duplicates
        if (prev.some(tweet => tweet.id === formattedTweet.id)) {
          return prev;
        }
        
        const newTweets = [formattedTweet, ...prev];
        
        // Update last fetch time
        lastFetchTimeRef.current = tweetData.created_at;
        
        // Cache the updated tweets
        if (cacheTimeoutRef.current) {
          clearTimeout(cacheTimeoutRef.current);
        }
        cacheTimeoutRef.current = setTimeout(() => {
          cacheTweets(newTweets);
        }, 500);
        
        return newTweets;
      });
    } catch (error) {
      console.error('Error handling new tweet:', error);
    }
  }, [followingOnly, fetchUserInteractions, formatTweetData, cacheTweets]);

  // Disabled real-time subscriptions - only fetch on manual refresh
  // useEffect(() => {
  //   const setupRealtimeSubscription = async () => {
  //     try {
  //       // Clean up existing subscription
  //       if (channelRef.current) {
  //         await channelRef.current.unsubscribe();
  //         supabase.removeChannel(channelRef.current);
  //         channelRef.current = null;
  //       }

  //       // For following feed, we need to fetch following users first
  //       if (followingOnly) {
  //         await fetchFollowingUsers();
  //       }

  //       // Only set up real-time for local development or if explicitly enabled
  //       if (!isDeployedRef.current) {
  //         // Create new subscription
  //         const channelName = `tweets_realtime_${followingOnly ? 'following' : 'for_you'}_${Date.now()}`;
          
  //         const channel = supabase
  //           .channel(channelName)
  //           .on(
  //             'postgres_changes',
  //             {
  //               event: 'INSERT',
  //               schema: 'public',
  //               table: 'tweets',
  //               filter: 'reply_to=is.null', // Only listen for main tweets, not replies
  //             },
  //             handleNewTweet
  //           );

  //         channelRef.current = channel;
          
  //         if (channel.state !== 'joined' && channel.state !== 'joining') {
  //           await channel.subscribe();
  //         }
  //       }
  //     } catch (error) {
  //       console.error('Error setting up real-time subscription:', error);
  //     }
  //   };

  //   setupRealtimeSubscription();

  //   return () => {
  //     if (channelRef.current) {
  //       channelRef.current.unsubscribe();
  //       supabase.removeChannel(channelRef.current);
  //       channelRef.current = null;
  //     }
  //   };
  // }, [followingOnly, handleNewTweet, fetchFollowingUsers]);

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
        followingIdsRef.current = followingIds; // Update the ref for real-time filtering
        query = query.in('author_id', followingIds);
      }

      // Apply pagination and simple chronological sorting
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
        // Set last fetch time to the newest tweet's timestamp (for first load)
        if (!lastFetchTimeRef.current && tweetsData.length > 0) {
          lastFetchTimeRef.current = tweetsData[0].created_at;
        }

        // Get all tweet IDs for interaction fetching
        const tweetIds = tweetsData.map(tweet => tweet.id);
        const originalTweetIds = tweetsData.filter(tweet => tweet.original_tweet_id).map(tweet => tweet.original_tweet_id);
        const allTweetIds = [...tweetIds, ...originalTweetIds];

        // Fetch user interactions
        const { userLikes, userRetweets, userBookmarks } = await fetchUserInteractions(allTweetIds);

        const formattedTweets: Tweet[] = (tweetsData as TweetWithProfile[]).map(tweet => 
          formatTweetData(tweet, userLikes, userRetweets, userBookmarks)
        );

        // No sorting - just keep chronological order from the database
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
        
        // Reset retry counter on success
        retryCountRef.current = 0;
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error loading tweets:', err);
      
      // Implement exponential backoff for retries
      if (retryCountRef.current < maxRetries) {
        const backoffTime = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
        console.log(`Retrying in ${backoffTime}ms (attempt ${retryCountRef.current + 1}/${maxRetries})`);
        
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
        
        retryTimeoutRef.current = setTimeout(() => {
          retryCountRef.current++;
          loadMoreTweets();
        }, backoffTime);
      }
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
    lastFetchTimeRef.current = null;
    sessionStorage.removeItem(cacheKey);
    retryCountRef.current = 0;
    
    // Clear polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    // Clear retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
  }, [cacheKey]);

  // Initial load
  useEffect(() => {
    if (initialLoad) {
      // Try to get cached tweets first
      const cachedTweets = getCachedTweets();
      if (cachedTweets && cachedTweets.length > 0) {
        setTweets(cachedTweets);
        // Set last fetch time from cached data
        if (cachedTweets.length > 0) {
          lastFetchTimeRef.current = cachedTweets[0].createdAt.toISOString();
        }
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