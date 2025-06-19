import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { User, Tweet, TweetWithProfile } from '../types';
import { getPreloadedData } from './usePreloader';

export const useOptimizedProfile = (username?: string) => {
  const [profile, setProfile] = useState<User | null>(null);
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [replies, setReplies] = useState<Tweet[]>([]);
  const [likes, setLikes] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!username) return;

    try {
      setLoading(true);
      setError(null);

      // Try to get preloaded data first
      const preloadedProfile = getPreloadedData('preloaded_user_profile');
      
      let profileData;
      if (preloadedProfile && preloadedProfile.username === username) {
        profileData = preloadedProfile;
      } else {
        // Fetch profile data if not preloaded
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select(`
            id,
            username,
            display_name,
            avatar_url,
            bio,
            verified,
            followers_count,
            following_count,
            created_at,
            cover_image,
            country
          `)
          .eq('username', username)
          .single();

        if (profileError) throw profileError;
        profileData = data;
      }

      // Format profile data immediately
      const formattedProfile: User = {
        id: profileData.id,
        username: profileData.username,
        displayName: profileData.display_name,
        avatar: profileData.avatar_url || '',
        bio: profileData.bio || '',
        verified: profileData.verified || false,
        followers: profileData.followers_count || 0,
        following: profileData.following_count || 0,
        joinedDate: new Date(profileData.created_at),
        coverImage: profileData.cover_image,
        country: profileData.country,
      };

      setProfile(formattedProfile);

      // Fetch tweets in background with minimal data
      const [tweetsResult, repliesResult, likesResult] = await Promise.all([
        supabase
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
              verified
            )
          `)
          .eq('author_id', profileData.id)
          .is('reply_to', null)
          .order('created_at', { ascending: false })
          .limit(10),

        supabase
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
              verified
            )
          `)
          .eq('author_id', profileData.id)
          .not('reply_to', 'is', null)
          .order('created_at', { ascending: false })
          .limit(10),

        supabase
          .from('likes')
          .select(`
            tweet_id,
            created_at,
            tweets (
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
                verified
              )
            )
          `)
          .eq('user_id', profileData.id)
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      // Format tweet data with minimal processing
      const formatTweetData = (tweetData: any): Tweet => ({
        id: tweetData.id,
        content: tweetData.content,
        author: {
          id: tweetData.profiles.id,
          username: tweetData.profiles.username,
          displayName: tweetData.profiles.display_name,
          avatar: tweetData.profiles.avatar_url || '',
          bio: '',
          verified: tweetData.profiles.verified || false,
          followers: 0,
          following: 0,
          country: '',
          joinedDate: new Date(),
        },
        createdAt: new Date(tweetData.created_at),
        likes: tweetData.likes_count || 0,
        retweets: tweetData.retweets_count || 0,
        replies: tweetData.replies_count || 0,
        views: tweetData.views_count || 0,
        images: tweetData.image_urls || [],
        isLiked: false,
        isRetweeted: false,
        isBookmarked: false,
        hashtags: tweetData.hashtags || [],
        mentions: tweetData.mentions || [],
        tags: tweetData.tags || [],
        replyTo: tweetData.reply_to,
      });

      const formattedTweets: Tweet[] = (tweetsResult.data || []).map(formatTweetData);
      const formattedReplies: Tweet[] = (repliesResult.data || []).map(formatTweetData);
      const formattedLikes: Tweet[] = (likesResult.data || []).map(like => formatTweetData(like.tweets));

      setTweets(formattedTweets);
      setReplies(formattedReplies);
      setLikes(formattedLikes);

    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    if (username) {
      fetchProfile();
    }
  }, [fetchProfile]);

  return {
    profile,
    tweets,
    replies,
    likes,
    loading,
    error,
    refetch: fetchProfile,
  };
};