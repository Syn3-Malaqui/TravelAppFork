import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Tweet, TweetWithProfile } from '../types';

export const useTweets = () => {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTweets = async () => {
    try {
      setLoading(true);
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
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

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
          joinedDate: new Date(tweet.profiles.created_at),
        },
        createdAt: new Date(tweet.created_at),
        likes: tweet.likes_count,
        retweets: tweet.retweets_count,
        replies: tweet.replies_count,
        views: tweet.views_count,
        images: tweet.image_urls,
        isLiked: false, // TODO: Check if current user liked this tweet
        isRetweeted: false, // TODO: Check if current user retweeted this tweet
        isBookmarked: false, // TODO: Check if current user bookmarked this tweet
        hashtags: tweet.hashtags,
        mentions: tweet.mentions,
        tags: [], // TODO: Add tags support to database
      }));

      setTweets(formattedTweets);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createTweet = async (content: string, imageUrls: string[] = [], tags: string[] = []) => {
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

      if (error) throw error;
      await fetchTweets();
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
      await fetchTweets();
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
    likeTweet,
    unlikeTweet,
  };
};