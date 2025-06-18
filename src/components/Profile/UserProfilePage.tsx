import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Settings, Edit3, Camera } from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { TweetCard } from '../Tweet/TweetCard';
import { MobileTweetCard } from '../Tweet/MobileTweetCard';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { Tweet, User } from '../../types';

export const UserProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  
  const [profile, setProfile] = useState<User | null>(null);
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [replies, setReplies] = useState<Tweet[]>([]);
  const [likes, setLikes] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tweets' | 'replies' | 'media' | 'likes'>('tweets');

  useEffect(() => {
    if (currentUser) {
      fetchUserProfile();
    }
  }, [currentUser]);

  const fetchUserProfile = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (profileError) throw profileError;

      // Fetch user's tweets (excluding replies)
      const { data: tweetsData, error: tweetsError } = await supabase
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
        .eq('author_id', currentUser.id)
        .is('reply_to', null)
        .order('created_at', { ascending: false });

      if (tweetsError) throw tweetsError;

      // Fetch user's replies
      const { data: repliesData, error: repliesError } = await supabase
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
        .eq('author_id', currentUser.id)
        .not('reply_to', 'is', null)
        .order('created_at', { ascending: false });

      if (repliesError) throw repliesError;

      // Fetch user's liked tweets
      const { data: likesData, error: likesError } = await supabase
        .from('likes')
        .select(`
          tweet_id,
          created_at,
          tweets (
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
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (likesError) throw likesError;

      // Get current user's interactions
      const allTweetIds = [
        ...tweetsData.map(t => t.id),
        ...repliesData.map(t => t.id),
        ...likesData.map(l => l.tweets.id)
      ];

      let userLikes: string[] = [];
      let userRetweets: string[] = [];
      let userBookmarks: string[] = [];

      if (allTweetIds.length > 0) {
        const [likesResult, retweetsResult, bookmarksResult] = await Promise.all([
          supabase.from('likes').select('tweet_id').eq('user_id', currentUser.id).in('tweet_id', allTweetIds),
          supabase.from('retweets').select('tweet_id').eq('user_id', currentUser.id).in('tweet_id', allTweetIds),
          supabase.from('bookmarks').select('tweet_id').eq('user_id', currentUser.id).in('tweet_id', allTweetIds)
        ]);
        
        userLikes = likesResult.data?.map(like => like.tweet_id) || [];
        userRetweets = retweetsResult.data?.map(retweet => retweet.tweet_id) || [];
        userBookmarks = bookmarksResult.data?.map(bookmark => bookmark.tweet_id) || [];
      }

      // Format profile data
      const formattedProfile: User = {
        id: profileData.id,
        username: profileData.username,
        displayName: profileData.display_name,
        avatar: profileData.avatar_url || '',
        bio: profileData.bio,
        verified: profileData.verified,
        followers: profileData.followers_count,
        following: profileData.following_count,
        joinedDate: new Date(profileData.created_at),
      };

      // Format tweets data
      const formatTweetData = (tweetData: any): Tweet => ({
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
      });

      const formattedTweets: Tweet[] = tweetsData.map(formatTweetData);
      const formattedReplies: Tweet[] = repliesData.map(formatTweetData);
      const formattedLikes: Tweet[] = likesData.map(like => formatTweetData(like.tweets));

      setProfile(formattedProfile);
      setTweets(formattedTweets);
      setReplies(formattedReplies);
      setLikes(formattedLikes);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching user profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (tweetId: string) => {
    // TODO: Implement like functionality
    console.log('Like tweet:', tweetId);
  };

  const handleRetweet = (tweetId: string) => {
    console.log('Retweet:', tweetId);
  };

  const handleBookmark = (tweetId: string) => {
    console.log('Bookmark:', tweetId);
  };

  const handleEditProfile = () => {
    // TODO: Implement edit profile functionality
    console.log('Edit profile');
  };

  const getCurrentTabTweets = () => {
    switch (activeTab) {
      case 'tweets':
        return tweets;
      case 'replies':
        return replies;
      case 'likes':
        return likes;
      case 'media':
        return tweets.filter(tweet => tweet.images && tweet.images.length > 0);
      default:
        return tweets;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-500">Loading profile...</span>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="text-center">
            <p className="text-lg font-semibold mb-2 text-gray-900">Error loading profile</p>
            <p className="text-sm text-gray-600 mb-4">{error || 'Something went wrong.'}</p>
            <Button onClick={() => navigate('/')} variant="outline">
              Go back home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentTabTweets = getCurrentTabTweets();

  return (
    <div className="min-h-screen bg-white flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3 flex items-center z-10 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="p-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="ml-4">
          <h1 className="text-lg font-bold">{profile.displayName}</h1>
          <p className="text-sm text-gray-500">{tweets.length} tweets</p>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Profile Header */}
        <div className="relative">
          {/* Cover Image */}
          <div className="h-48 bg-gradient-to-r from-blue-400 to-purple-500 relative">
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-4 right-4 bg-black/50 text-white hover:bg-black/70 p-2 rounded-full"
            >
              <Camera className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Profile Info */}
          <div className="px-4 pb-4">
            {/* Avatar and Edit Button */}
            <div className="flex items-end justify-between -mt-16 mb-4">
              <div className="relative">
                <Avatar className="w-32 h-32 border-4 border-white bg-white">
                  <AvatarImage src={profile.avatar} />
                  <AvatarFallback className="text-2xl">{profile.displayName[0]}</AvatarFallback>
                </Avatar>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute bottom-2 right-2 bg-black/50 text-white hover:bg-black/70 p-2 rounded-full"
                >
                  <Camera className="h-3 w-3" />
                </Button>
              </div>
              
              <Button 
                variant="outline" 
                onClick={handleEditProfile}
                className="mt-16 px-6 py-2 font-bold rounded-full border-gray-300 hover:bg-gray-50"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Edit profile
              </Button>
            </div>

            {/* User Info */}
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <h1 className="text-xl font-bold text-gray-900">{profile.displayName}</h1>
                {profile.verified && (
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </div>
              <p className="text-gray-500 mb-3">@{profile.username}</p>
              
              {profile.bio ? (
                <p className="text-gray-900 mb-3">{profile.bio}</p>
              ) : (
                <p className="text-gray-500 mb-3 italic">No bio yet</p>
              )}

              {/* Join Date */}
              <div className="flex items-center space-x-4 text-gray-500 text-sm mb-3">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>Joined {profile.joinedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                </div>
              </div>

              {/* Follow Stats */}
              <div className="flex space-x-6">
                <div className="flex items-center space-x-1 cursor-pointer hover:underline">
                  <span className="font-bold text-gray-900">{profile.following.toLocaleString()}</span>
                  <span className="text-gray-500">Following</span>
                </div>
                <div className="flex items-center space-x-1 cursor-pointer hover:underline">
                  <span className="font-bold text-gray-900">{profile.followers.toLocaleString()}</span>
                  <span className="text-gray-500">Followers</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex">
            {[
              { id: 'tweets', label: 'Tweets', count: tweets.length },
              { id: 'replies', label: 'Replies', count: replies.length },
              { id: 'media', label: 'Media', count: tweets.filter(t => t.images && t.images.length > 0).length },
              { id: 'likes', label: 'Likes', count: likes.length },
            ].map((tab) => (
              <Button
                key={tab.id}
                variant="ghost"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-4 px-4 font-bold text-base rounded-none border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-black'
                    : 'border-transparent text-gray-500 hover:bg-gray-50'
                }`}
              >
                <span className="flex items-center space-x-2">
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      {tab.count}
                    </span>
                  )}
                </span>
              </Button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="pb-20 md:pb-0">
          {currentTabTweets.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">
                {activeTab === 'tweets' && 'No tweets yet'}
                {activeTab === 'replies' && 'No replies yet'}
                {activeTab === 'media' && 'No media tweets yet'}
                {activeTab === 'likes' && 'No liked tweets yet'}
              </p>
              {activeTab === 'tweets' && (
                <>
                  <p className="text-sm mt-2">Share your first thought!</p>
                  <Button 
                    onClick={() => navigate('/compose')}
                    className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-full font-medium"
                  >
                    Tweet now
                  </Button>
                </>
              )}
            </div>
          ) : (
            currentTabTweets.map((tweet) => (
              <div key={tweet.id}>
                {/* Desktop Tweet Card */}
                <div className="hidden md:block">
                  <TweetCard 
                    tweet={tweet} 
                    onLike={() => handleLike(tweet.id)}
                    onRetweet={() => handleRetweet(tweet.id)}
                    onBookmark={() => handleBookmark(tweet.id)}
                    currentUserId={currentUser?.id}
                  />
                </div>
                {/* Mobile Tweet Card */}
                <div className="md:hidden">
                  <MobileTweetCard 
                    tweet={tweet}
                    onLike={() => handleLike(tweet.id)}
                    onRetweet={() => handleRetweet(tweet.id)}
                    onBookmark={() => handleBookmark(tweet.id)}
                    currentUserId={currentUser?.id}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};