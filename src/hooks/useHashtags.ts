import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Tweet, TweetWithProfile } from '../types';

interface HashtagData {
  hashtag: string;
  count: number;
  recent_tweets: number; // tweets in last 24 hours
}

interface HashtagTweet extends Tweet {
  relevance_score?: number;
}

export const useHashtags = () => {
  const [trendingHashtags, setTrendingHashtags] = useState<HashtagData[]>([]);
  const [hashtagTweets, setHashtagTweets] = useState<HashtagTweet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatTweetData = (tweetData: TweetWithProfile, userLikes: string[], userRetweets: string[], userBookmarks: string[]): HashtagTweet => {
    // If this is a retweet, format the original tweet
    if (tweetData.is_retweet && tweetData.original_tweet) {
      const originalTweet: HashtagTweet = {
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

  const fetchTrendingHashtags = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get hashtag statistics using a more complex query
      const { data, error } = await supabase.rpc('get_trending_hashtags', {
        limit_count: 20
      });

      if (error) {
        // Fallback to simpler query if RPC function doesn't exist
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('tweets')
          .select('hashtags, created_at, likes_count, retweets_count')
          .not('hashtags', 'eq', '{}')
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(1000);

        if (fallbackError) throw fallbackError;

        // Process hashtags manually
        const hashtagCounts: { [key: string]: { count: number; recent: number; engagement: number } } = {};
        
        fallbackData?.forEach(tweet => {
          const isRecent = new Date(tweet.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000);
          const engagement = tweet.likes_count + tweet.retweets_count;
          
          tweet.hashtags.forEach((hashtag: string) => {
            const tag = hashtag.toLowerCase();
            if (!hashtagCounts[tag]) {
              hashtagCounts[tag] = { count: 0, recent: 0, engagement: 0 };
            }
            hashtagCounts[tag].count++;
            hashtagCounts[tag].engagement += engagement;
            if (isRecent) {
              hashtagCounts[tag].recent++;
            }
          });
        });

        // Convert to array and sort by trending score
        const trending = Object.entries(hashtagCounts)
          .map(([hashtag, stats]) => ({
            hashtag: `#${hashtag}`,
            count: stats.count,
            recent_tweets: stats.recent,
            trending_score: stats.recent * 2 + stats.engagement * 0.1
          }))
          .sort((a, b) => b.trending_score - a.trending_score)
          .slice(0, 20)
          .map(({ hashtag, count, recent_tweets }) => ({ hashtag, count, recent_tweets }));

        setTrendingHashtags(trending);
      } else {
        setTrendingHashtags(data || []);
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching trending hashtags:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const searchHashtagTweets = async (hashtag: string, sortBy: 'recent' | 'top' = 'recent') => {
    try {
      setLoading(true);
      setError(null);

      // Clean hashtag (remove # if present)
      const cleanHashtag = hashtag.replace('#', '').toLowerCase();

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
        .contains('hashtags', [cleanHashtag])
        .is('reply_to', null);

      if (sortBy === 'recent') {
        query = query.order('created_at', { ascending: false });
      } else {
        // For 'top', we'll sort by engagement (likes + retweets)
        query = query.order('likes_count', { ascending: false });
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;

      // Get current user to check likes/retweets/bookmarks
      const { data: { user } } = await supabase.auth.getUser();
      
      let userLikes: string[] = [];
      let userRetweets: string[] = [];
      let userBookmarks: string[] = [];
      
      if (user && data && data.length > 0) {
        const tweetIds = data.map(tweet => tweet.id);
        const originalTweetIds = data.filter(tweet => tweet.original_tweet_id).map(tweet => tweet.original_tweet_id);
        const allTweetIds = [...tweetIds, ...originalTweetIds];

        const [likesResult, retweetsResult, bookmarksResult] = await Promise.all([
          supabase
            .from('likes')
            .select('tweet_id')
            .eq('user_id', user.id)
            .in('tweet_id', allTweetIds),
          supabase
            .from('retweets')
            .select('tweet_id')
            .eq('user_id', user.id)
            .in('tweet_id', allTweetIds),
          supabase
            .from('bookmarks')
            .select('tweet_id')
            .eq('user_id', user.id)
            .in('tweet_id', allTweetIds)
        ]);
        
        userLikes = likesResult.data?.map(like => like.tweet_id) || [];
        userRetweets = retweetsResult.data?.map(retweet => retweet.tweet_id) || [];
        userBookmarks = bookmarksResult.data?.map(bookmark => bookmark.tweet_id) || [];
      }

      const formattedTweets: HashtagTweet[] = (data as TweetWithProfile[]).map(tweet => {
        const formatted = formatTweetData(tweet, userLikes, userRetweets, userBookmarks);
        
        // Add relevance score for hashtag search
        if (sortBy === 'top') {
          formatted.relevance_score = tweet.likes_count + tweet.retweets_count * 2 + tweet.replies_count;
        }
        
        return formatted;
      });

      // Additional sorting for 'top' posts
      if (sortBy === 'top') {
        formattedTweets.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
      }

      setHashtagTweets(formattedTweets);
    } catch (err: any) {
      setError(err.message);
      console.error('Error searching hashtag tweets:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchHashtags = async (query: string): Promise<string[]> => {
    try {
      if (!query.trim()) return [];

      const cleanQuery = query.replace('#', '').toLowerCase();

      // Search for hashtags that contain the query
      const { data, error } = await supabase
        .from('tweets')
        .select('hashtags')
        .not('hashtags', 'eq', '{}')
        .limit(100);

      if (error) throw error;

      // Extract and filter hashtags
      const allHashtags = new Set<string>();
      data?.forEach(tweet => {
        tweet.hashtags.forEach((hashtag: string) => {
          if (hashtag.toLowerCase().includes(cleanQuery)) {
            allHashtags.add(`#${hashtag}`);
          }
        });
      });

      return Array.from(allHashtags).slice(0, 10);
    } catch (err: any) {
      console.error('Error searching hashtags:', err);
      return [];
    }
  };

  useEffect(() => {
    fetchTrendingHashtags();
  }, [fetchTrendingHashtags]);

  return {
    trendingHashtags,
    hashtagTweets,
    loading,
    error,
    fetchTrendingHashtags,
    searchHashtagTweets,
    searchHashtags,
  };
};