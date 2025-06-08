import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TweetWithProfile, Profile } from '../types';

export const useTweets = () => {
  const [tweets, setTweets] = useState<TweetWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTweets();
  }, []);

  const fetchTweets = async () => {
    try {
      const { data, error } = await supabase
        .from('tweets')
        .select(`
          *,
          profiles (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTweets(data || []);
    } catch (error) {
      console.error('Error fetching tweets:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTweet = async (content: string, imageUrls: string[] = [], hashtags: string[] = [], mentions: string[] = []) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('tweets')
        .insert({
          content,
          author_id: user.id,
          image_urls: imageUrls,
          hashtags,
          mentions,
        })
        .select(`
          *,
          profiles (*)
        `)
        .single();

      if (error) throw error;
      
      // Add the new tweet to the beginning of the list
      setTweets(prev => [data, ...prev]);
      return { data, error: null };
    } catch (error) {
      console.error('Error creating tweet:', error);
      return { data: null, error };
    }
  };

  const deleteTweet = async (tweetId: string) => {
    try {
      const { error } = await supabase
        .from('tweets')
        .delete()
        .eq('id', tweetId);

      if (error) throw error;
      
      // Remove the tweet from the list
      setTweets(prev => prev.filter(tweet => tweet.id !== tweetId));
      return { error: null };
    } catch (error) {
      console.error('Error deleting tweet:', error);
      return { error };
    }
  };

  return {
    tweets,
    loading,
    createTweet,
    deleteTweet,
    refetch: fetchTweets,
  };
};