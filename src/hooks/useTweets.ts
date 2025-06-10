import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Tweet, TweetWithProfile, TweetTag, User } from '../types';

export const useTweets = () => {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTweets = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all tweets with their profiles and original tweets for retweets
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
            created_at
          ),
          original_tweet:tweets!original_tweet_id (
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
              created_at
            )
          )
        `)
        .order('created_at', { ascending: false });

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

      const formatUser = (profile: any): User => ({
        id: profile.id,
        username: profile.username,
        displayName: profile.display_name,
        avatar: profile.avatar_url || '',
        bio: profile.bio,
        verified: profile.verified,
        followers: profile.followers_count,
        following: profile.following_count,
        joinedDate: new Date(profile.created_at),
      });

      const formatTweet = (tweetData: any, isOriginal = false): Tweet => {
        const tweet: Tweet = {
          id: tweetData.id,
          content: tweetData.content,
          author: formatUser(tweetData.profiles),
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
          replyTo: tweetData.reply_to,
          isRetweet: tweetData.is_retweet || false,
        };

        // If this is a retweet and has original tweet data
        if (tweetData.is_retweet && tweetData.original_tweet && !isOriginal) {
          tweet.originalTweet = formatTweet(tweetData.original_tweet, true);
          tweet.retweetedBy = tweet.author;
          // For retweets, the main content should be empty or a comment
          // The original tweet content is in originalTweet
        }

        return tweet;
      };

      const formattedTweets: Tweet[] = (data as TweetWithProfile[]).map(tweet => formatTweet(tweet));

      // Organize tweets with replies
      const organizedTweets = organizeTweetsWithReplies(formattedTweets);
      setTweets(organizedTweets);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching tweets:', err);
    } finally {
      setLoading(false);
    }
  };

  // Organize tweets to show replies below their parent tweets
  const organizeTweetsWithReplies = (allTweets: Tweet[]): Tweet[] => {
    const tweetMap = new Map<string, Tweet>();
    const rootTweets: Tweet[] = [];
    const replies: Tweet[] = [];

    // Separate root tweets and replies
    allTweets.forEach(tweet => {
      tweetMap.set(tweet.id, tweet);
      if (tweet.replyTo) {
        replies.push(tweet);
      } else {
        rootTweets.push(tweet);
      }
    });

    // Build the organized list
    const organized: Tweet[] = [];
    
    rootTweets.forEach(rootTweet => {
      organized.push(rootTweet);
      
      // Find and add replies to this tweet
      const tweetReplies = replies
        .filter(reply => reply.replyTo === rootTweet.id)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      
      organized.push(...tweetReplies);
    });

    return organized;
  };

  const createTweet = async (content: string, imageUrls: string[] = [], tags: TweetTag[] = [], replyTo?: string) => {
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
          reply_to: replyTo || null,
          image_urls: imageUrls,
          hashtags,
          mentions,
          tags,
          is_retweet: false,
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

  const createRetweet = async (originalTweetId: string, comment?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create a retweet entry
      const { data, error } = await supabase
        .from('tweets')
        .insert({
          content: comment || '', // Optional comment on retweet
          author_id: user.id,
          is_retweet: true,
          original_tweet_id: originalTweetId,
          hashtags: [],
          mentions: [],
          tags: [],
        })
        .select()
        .single();

      if (error) throw error;

      // Also add to retweets table for tracking
      await supabase
        .from('retweets')
        .insert({
          user_id: user.id,
          tweet_id: originalTweetId,
        });

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

  const retweetTweet = async (tweetId: string, comment?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create a retweet
      await createRetweet(tweetId, comment);
      
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

      // Remove from retweets table
      const { error: retweetError } = await supabase
        .from('retweets')
        .delete()
        .match({
          user_id: user.id,
          tweet_id: tweetId,
        });

      if (retweetError) throw retweetError;

      // Remove the retweet tweet entry
      const { error: tweetError } = await supabase
        .from('tweets')
        .delete()
        .match({
          author_id: user.id,
          original_tweet_id: tweetId,
          is_retweet: true,
        });

      if (tweetError) throw tweetError;
      
      // Update local state immediately for better UX
      setTweets(prevTweets => 
        prevTweets.map(tweet => 
          tweet.id === tweetId 
            ? { ...tweet, isRetweeted: false, retweets: Math.max(0, tweet.retweets - 1) }
            : tweet
        )
      );

      // Refresh to remove the retweet from timeline
      await fetchTweets();
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

  useEffect(() => {
    fetchTweets();
  }, []);

  return {
    tweets,
    loading,
    error,
    fetchTweets,
    createTweet,
    createRetweet,
    likeTweet,
    unlikeTweet,
    retweetTweet,
    unretweetTweet,
    bookmarkTweet,
    unbookmarkTweet,
  };
};