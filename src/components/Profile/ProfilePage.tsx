import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, UserPlus, UserMinus, Settings } from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { TweetCard } from '../Tweet/TweetCard';
import { MobileTweetCard } from '../Tweet/MobileTweetCard';
import { useStore } from '../../store/useStore';
import { useAuth } from '../../hooks/useAuth';
import { useFollow } from '../../hooks/useFollow';
import { useTweets } from '../../hooks/useTweets';
import { supabase } from '../../lib/supabase';
import { Tweet, User } from '../../types';

export const ProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { isRTL } = useStore();
  const { user: currentUser } = useAuth();
  const { followUser, unfollowUser, isFollowing, loading: followLoading } = useFollow();
  const { likeTweet, unlikeTweet, retweetTweet, unretweetTweet, bookmarkTweet, unbookmarkTweet } = useTweets();
  
  const [profile, setProfile] = useState<User | null>(null);
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tweets' | 'replies' | 'media' | 'likes'>('tweets');

  useEffect(() => {
    if (username) {
      fetchProfile();
    }
  }, [username]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();

      if (profileError) throw profileError;

      // Fetch user's tweets
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
        .eq('author_id', profileData.id)
        .order('created_at', { ascending: false });

      if (tweetsError) throw tweetsError;

      // Get current user's interactions if authenticated
      let userLikes: string[] = [];
      let userRetweets: string[] = [];
      let userBookmarks: string[] = [];
      
      if (currentUser) {
        const [likesResult, retweetsResult, bookmarksResult] = await Promise.all([
          supabase.from('likes').select('tweet_id').eq('user_id', currentUser.id),
          supabase.from('retweets').select('tweet_id').eq('user_id', currentUser.id),
          supabase.from('bookmarks').select('tweet_id').eq('user_id', currentUser.id)
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
      const formattedTweets: Tweet[] = tweetsData.map(tweet => ({
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
        isLiked: userLikes.includes(tweet.id),
        isRetweeted: userRetweets.includes(tweet.id),
        isBookmarked: userBookmarks.includes(tweet.id),
        hashtags: tweet.hashtags,
        mentions: tweet.mentions,
        tags: tweet.tags || [],
      }));

      setProfile(formattedProfile);
      setTweets(formattedTweets);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!profile) return;
    
    try {
      if (isFollowing(profile.id)) {
        await unfollowUser(profile.id);
      } else {
        await followUser(profile.id);
      }
      // Refresh profile to get updated follower count
      await fetchProfile();
    } catch (error: any) {
      console.error('Error toggling follow:', error.message);
    }
  };

  const handleLike = async (tweetId: string) => {
    try {
      const tweet = tweets.find(t => t.id === tweetId);
      if (tweet?.isLiked) {
        await unlikeTweet(tweetId);
      } else {
        await likeTweet(tweetId);
      }
      // Update local state
      setTweets(prevTweets => 
        prevTweets.map(t => 
          t.id === tweetId 
            ? { 
                ...t, 
                isLiked: !t.isLiked, 
                likes: t.isLiked ? Math.max(0, t.likes - 1) : t.likes + 1 
              }
            : t
        )
      );
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleRetweet = async (tweetId: string) => {
    try {
      const tweet = tweets.find(t => t.id === tweetId);
      if (tweet?.isRetweeted) {
        await unretweetTweet(tweetId);
      } else {
        await retweetTweet(tweetId);
      }
      // Update local state
      setTweets(prevTweets => 
        prevTweets.map(t => 
          t.id === tweetId 
            ? { 
                ...t, 
                isRetweeted: !t.isRetweeted, 
                retweets: t.isRetweeted ? Math.max(0, t.retweets - 1) : t.retweets + 1 
              }
            : t
        )
      );
    } catch (error) {
      console.error('Error toggling retweet:', error);
    }
  };

  const handleBookmark = async (tweetId: string) => {
    try {
      const tweet = tweets.find(t => t.id === tweetId);
      if (tweet?.isBookmarked) {
        await unbookmarkTweet(tweetId);
      } else {
        await bookmarkTweet(tweetId);
      }
      // Update local state
      setTweets(prevTweets => 
        prevTweets.map(t => 
          t.id === tweetId 
            ? { ...t, isBookmarked: !t.isBookmarked }
            : t
        )
      );
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className={`${isRTL ? 'mr-3' : 'ml-3'} text-gray-500`}>Loading profile...</span>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-white">
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="text-center">
            <p className="text-lg font-semibold mb-2 text-gray-900">Profile not found</p>
            <p className="text-sm text-gray-600 mb-4">{error || 'This user does not exist.'}</p>
            <Button onClick={() => navigate('/')} variant="outline">
              Go back home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === profile.id;
  const userIsFollowing = isFollowing(profile.id);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3 flex items-center z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="p-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className={`${isRTL ? 'mr-4' : 'ml-4'}`}>
          <h1 className="text-lg font-bold">{profile.displayName}</h1>
          <p className="text-sm text-gray-500">{tweets.length} tweets</p>
        </div>
      </div>

      {/* Profile Header */}
      <div className="relative">
        {/* Cover Image */}
        <div className="h-48 bg-gradient-to-r from-blue-400 to-purple-500"></div>
        
        {/* Profile Info */}
        <div className="px-4 pb-4">
          {/* Avatar and Follow Button */}
          <div className={`flex items-end justify-between ${isRTL ? 'flex-row-reverse' : ''} -mt-16 mb-4`}>
            <Avatar className="w-32 h-32 border-4 border-white bg-white">
              <AvatarImage src={profile.avatar} />
              <AvatarFallback className="text-2xl">{profile.displayName[0]}</AvatarFallback>
            </Avatar>
            
            {isOwnProfile ? (
              <Button variant="outline" className="mt-16 px-6 py-2 font-bold rounded-full">
                <Settings className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                Edit profile
              </Button>
            ) : (
              <Button
                variant={userIsFollowing ? "outline" : "default"}
                onClick={handleFollow}
                disabled={followLoading}
                className={`mt-16 px-6 py-2 font-bold rounded-full transition-colors ${
                  userIsFollowing 
                    ? 'border-gray-300 text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-300' 
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {followLoading ? (
                  '...'
                ) : userIsFollowing ? (
                  <>
                    <UserMinus className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    Follow
                  </>
                )}
              </Button>
            )}
          </div>

          {/* User Info */}
          <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
            <div className="flex items-center space-x-2 mb-1">
              <h1 className="text-xl font-bold text-gray-900">{profile.displayName}</h1>
              {profile.verified && (
                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </div>
            <p className="text-gray-500 mb-3">@{profile.username}</p>
            
            {profile.bio && (
              <p className="text-gray-900 mb-3">{profile.bio}</p>
            )}

            {/* Join Date */}
            <div className={`flex items-center space-x-4 text-gray-500 text-sm mb-3 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>Joined {profile.joinedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
              </div>
            </div>

            {/* Follow Stats */}
            <div className={`flex space-x-6 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <div className="flex items-center space-x-1">
                <span className="font-bold text-gray-900">{profile.following.toLocaleString()}</span>
                <span className="text-gray-500">Following</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="font-bold text-gray-900">{profile.followers.toLocaleString()}</span>
                <span className="text-gray-500">Followers</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className={`flex ${isRTL ? 'flex-row' : 'flex-row-reverse'}`}>
          {[
            { id: 'tweets', label: 'Tweets' },
            { id: 'replies', label: 'Replies' },
            { id: 'media', label: 'Media' },
            { id: 'likes', label: 'Likes' },
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
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Tweets */}
      <div className="pb-20 md:pb-0">
        {tweets.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">No tweets yet</p>
            {isOwnProfile && (
              <p className="text-sm mt-2">Share your first thought!</p>
            )}
          </div>
        ) : (
          tweets.map((tweet) => (
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
  );
};