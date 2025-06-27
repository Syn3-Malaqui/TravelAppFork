import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Tweet, TweetWithProfile, TweetCategory } from '../types';
import type { RealtimeChannel } from '@supabase/supabase-js';

export const useTweets = () => {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [followingTweets, setFollowingTweets] = useState<Tweet[]>([]);
  const [replies, setReplies] = useState<{ [tweetId: string]: Tweet[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastFetchTimeRef = useRef<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
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

  // Check for new tweets since last fetch
  const checkForNewTweets = useCallback(async () => {
    try {
      if (!lastFetchTimeRef.current) return;

      // Check for new tweets in the main feed
      const { data: newTweetsData, error: tweetsError } = await supabase
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
        .limit(10);

      if (tweetsError) throw tweetsError;

      const newTweets = Array.isArray(newTweetsData) ? newTweetsData : [];

      if (newTweets.length > 0) {
        // Get all tweet IDs for interaction fetching
        const tweetIds = newTweets.map(tweet => tweet.id);
        const originalTweetIds = newTweets.filter(tweet => tweet.original_tweet_id).map(tweet => tweet.original_tweet_id);
        const allTweetIds = [...tweetIds, ...originalTweetIds];

        // Fetch user interactions
        const interactions = await fetchUserInteractions(allTweetIds);
        const { userLikes, userRetweets, userBookmarks } = interactions || { userLikes: [], userRetweets: [], userBookmarks: [] };

        const formattedTweets: Tweet[] = (newTweets as TweetWithProfile[]).map(tweet => 
          formatTweetData(tweet, userLikes, userRetweets, userBookmarks)
        );

        // Add new tweets to the beginning of the list
        setTweets(prev => {
          const existingIds = new Set(prev.map(t => t.id));
          const uniqueNewTweets = formattedTweets.filter(tweet => !existingIds.has(tweet.id));
          
          if (uniqueNewTweets.length > 0) {
            return [...uniqueNewTweets, ...prev];
          }
          return prev;
        });

        // Update last fetch time
        lastFetchTimeRef.current = newTweets[0].created_at;
      }

      // Also check for following tweets if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: followingData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);

        if (followingData && followingData.length > 0) {
          const followingIds = followingData.map(follow => follow.following_id);

          const { data: newFollowingTweetsData, error: followingError } = await supabase
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
            .in('author_id', followingIds)
            .is('reply_to', null)
            .gt('created_at', lastFetchTimeRef.current)
            .order('created_at', { ascending: false })
            .limit(10);

          if (!followingError && newFollowingTweetsData) {
            const newFollowingTweets = Array.isArray(newFollowingTweetsData) ? newFollowingTweetsData : [];

            if (newFollowingTweets.length > 0) {
              const tweetIds = newFollowingTweets.map(tweet => tweet.id);
              const originalTweetIds = newFollowingTweets.filter(tweet => tweet.original_tweet_id).map(tweet => tweet.original_tweet_id);
              const allTweetIds = [...tweetIds, ...originalTweetIds];

              const interactions = await fetchUserInteractions(allTweetIds);
              const { userLikes, userRetweets, userBookmarks } = interactions || { userLikes: [], userRetweets: [], userBookmarks: [] };

              const formattedFollowingTweets: Tweet[] = newFollowingTweets.map(tweet => 
                formatTweetData(tweet as TweetWithProfile, userLikes, userRetweets, userBookmarks)
              );

              setFollowingTweets(prev => {
                const existingIds = new Set(prev.map(t => t.id));
                const uniqueNewTweets = formattedFollowingTweets.filter(tweet => !existingIds.has(tweet.id));
                
                if (uniqueNewTweets.length > 0) {
                  return [...uniqueNewTweets, ...prev];
                }
                return prev;
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking for new tweets:', error);
    }
  }, [fetchUserInteractions, formatTweetData]);

  // Disabled polling - only fetch on manual refresh
  // useEffect(() => {
  //   if (!lastFetchTimeRef.current) return;

  //   // Poll every 15 seconds for new tweets
  //   pollingIntervalRef.current = setInterval(() => {
  //     checkForNewTweets();
  //   }, 15000);

  //   return () => {
  //     if (pollingIntervalRef.current) {
  //       clearInterval(pollingIntervalRef.current);
  //     }
  //   };
  // }, [checkForNewTweets]);

  // Handle real-time updates for likes, retweets, and other interactions
  const handleRealtimeUpdate = useCallback((payload: any, table: string) => {
    const updateTweetInList = (tweetList: Tweet[]) => 
      tweetList.map(tweet => {
        if (tweet.id === payload.new?.tweet_id || tweet.id === payload.old?.tweet_id) {
          const updates: Partial<Tweet> = {};
          
          if (table === 'likes') {
            if (payload.eventType === 'INSERT') {
              updates.likes = tweet.likes + 1;
            } else if (payload.eventType === 'DELETE') {
              updates.likes = Math.max(0, tweet.likes - 1);
            }
          } else if (table === 'retweets') {
            if (payload.eventType === 'INSERT') {
              updates.retweets = tweet.retweets + 1;
            } else if (payload.eventType === 'DELETE') {
              updates.retweets = Math.max(0, tweet.retweets - 1);
            }
          }
          
          return { ...tweet, ...updates };
        }
        return tweet;
      });

    setTweets(updateTweetInList);
    setFollowingTweets(updateTweetInList);
  }, []);

  // Handle new tweet insertions
  const handleNewTweet = useCallback(async (payload: any) => {
    try {
      // Don't add if this is a reply (we only want main timeline tweets)
      if (payload.new.reply_to) return;

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
      const { userLikes, userRetweets, userBookmarks } = await fetchUserInteractions([tweetData.id]) || { userLikes: [], userRetweets: [], userBookmarks: [] };

      // Format the new tweet
      const formattedTweet = formatTweetData(tweetData as TweetWithProfile, userLikes, userRetweets, userBookmarks);

      // Add to the beginning of the tweets list (For You feed)
      setTweets(prev => {
        // Check if tweet already exists to avoid duplicates
        if (prev.some(tweet => tweet.id === formattedTweet.id)) {
          return prev;
        }
        return [formattedTweet, ...prev];
      });

      // Also add to following tweets if it's from someone the user follows
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: followingData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id)
          .eq('following_id', payload.new.author_id)
          .single();

        if (followingData) {
          setFollowingTweets(prev => {
            if (prev.some(tweet => tweet.id === formattedTweet.id)) {
              return prev;
            }
            return [formattedTweet, ...prev];
          });
        }
      }

      // Update last fetch time
      lastFetchTimeRef.current = tweetData.created_at;
    } catch (error) {
      console.error('Error handling new tweet:', error);
    }
  }, [fetchUserInteractions, formatTweetData]);

  // Disabled real-time subscriptions - only fetch on manual refresh
  // useEffect(() => {
  //   const setupRealtimeSubscriptions = async () => {
  //     try {
  //       // Clean up existing subscriptions
  //       if (channelRef.current) {
  //         await channelRef.current.unsubscribe();
  //         supabase.removeChannel(channelRef.current);
  //         channelRef.current = null;
  //       }

  //       // Create new subscription channel
  //       const channel = supabase
  //         .channel(`tweet_interactions_and_new_tweets_${Date.now()}`)
  //         .on(
  //           'postgres_changes',
  //           {
  //             event: '*',
  //             schema: 'public',
  //             table: 'likes',
  //           },
  //           (payload) => handleRealtimeUpdate(payload, 'likes')
  //         )
  //         .on(
  //           'postgres_changes',
  //           {
  //             event: '*',
  //             schema: 'public',
  //             table: 'retweets',
  //           },
  //           (payload) => handleRealtimeUpdate(payload, 'retweets')
  //         )
  //         .on(
  //           'postgres_changes',
  //           {
  //             event: 'INSERT',
  //             schema: 'public',
  //             table: 'tweets',
  //             filter: 'reply_to=is.null', // Only listen for main tweets, not replies
  //           },
  //           handleNewTweet
  //         );

  //       channelRef.current = channel;
        
  //       if (channel.state !== 'joined' && channel.state !== 'joining') {
  //         await channel.subscribe();
  //       }
  //     } catch (error) {
  //       console.error('Error setting up real-time subscriptions:', error);
  //     }
  //   };

  //   setupRealtimeSubscriptions();

  //   return () => {
  //     if (channelRef.current) {
  //       channelRef.current.unsubscribe();
  //       supabase.removeChannel(channelRef.current);
  //       channelRef.current = null;
  //     }
  //   };
  // }, [handleRealtimeUpdate, handleNewTweet]);

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

      // Ensure data is an array before processing
      const tweetsData = Array.isArray(data) ? data : [];

      // Set last fetch time to the newest tweet's timestamp
      if (tweetsData.length > 0) {
        lastFetchTimeRef.current = tweetsData[0].created_at;
      }

      // Get all tweet IDs for interaction fetching
      const tweetIds = tweetsData.map(tweet => tweet.id);
      const originalTweetIds = tweetsData.filter(tweet => tweet.original_tweet_id).map(tweet => tweet.original_tweet_id);
      const allTweetIds = [...tweetIds, ...originalTweetIds];

      // Fetch user interactions
      const interactions = await fetchUserInteractions(allTweetIds);
      const { userLikes, userRetweets, userBookmarks } = interactions || { userLikes: [], userRetweets: [], userBookmarks: [] };

      const formattedTweets: Tweet[] = (tweetsData as TweetWithProfile[]).map(tweet => 
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

      // First, get the list of users the current user is following
      const { data: followingData, error: followingError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (followingError) throw followingError;

      // If user is not following anyone, return empty array
      if (!followingData || followingData.length === 0) {
        setFollowingTweets([]);
        setLoading(false);
        return;
      }

      const followingIds = followingData.map(follow => follow.following_id);

      // Now fetch tweets from followed users
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
        .in('author_id', followingIds)
        .is('reply_to', null)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Ensure data is an array before processing - more robust check
      const tweetsData = (data && Array.isArray(data)) ? data : [];

      // Get all tweet IDs for interaction fetching
      const tweetIds = tweetsData.map(tweet => tweet.id);
      const originalTweetIds = tweetsData.filter(tweet => tweet.original_tweet_id).map(tweet => tweet.original_tweet_id);
      const allTweetIds = [...tweetIds, ...originalTweetIds];

      // Fetch user interactions
      const interactions = await fetchUserInteractions(allTweetIds);
      const { userLikes, userRetweets, userBookmarks } = interactions || { userLikes: [], userRetweets: [], userBookmarks: [] };

      const formattedTweets: Tweet[] = tweetsData.map(tweet => 
        formatTweetData(tweet as TweetWithProfile, userLikes, userRetweets, userBookmarks)
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

      // Ensure data is an array before processing
      const repliesData = Array.isArray(data) ? data : [];

      // Get user interactions for replies
      const tweetIds = repliesData.map(tweet => tweet.id);
      const interactions = await fetchUserInteractions(tweetIds);
      const { userLikes, userRetweets, userBookmarks } = interactions || { userLikes: [], userRetweets: [], userBookmarks: [] };

      const formattedReplies: Tweet[] = (repliesData as TweetWithProfile[]).map(tweet => 
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
          )
        `)
        .single();

      if (error) throw error;

      // Format the new tweet and add it immediately to the local state
      const formattedTweet = formatTweetData(data as TweetWithProfile, [], [], []);
      
      // Add to both feeds immediately (optimistic update)
      setTweets(prev => [formattedTweet, ...prev]);
      setFollowingTweets(prev => [formattedTweet, ...prev]);
      
      // Update last fetch time
      lastFetchTimeRef.current = data.created_at;
      
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
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        supabase.removeChannel(channelRef.current);
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
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