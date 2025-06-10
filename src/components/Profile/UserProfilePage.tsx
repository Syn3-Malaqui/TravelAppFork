import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Edit3, Camera } from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { TweetCard } from '../Tweet/TweetCard';
import { MobileTweetCard } from '../Tweet/MobileTweetCard';
import { useStore } from '../../store/useStore';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { Tweet, User } from '../../types';

export const UserProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { isRTL } = useStore();
  const { user: currentUser } = useAuth();
  
  const [profile, setProfile] = useState<User | null>(null);
  const [tweets, setTweets] = useState<Tweet[]>([]);
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

      // Fetch user's tweets (simplified query)
      const { data: tweetsData, error: tweetsError } = await supabase
        .from('tweets')
        .select('*')
        .eq('author_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (tweetsError) throw tweetsError;

      // Get current user's interactions
      const [likesResult, retweetsResult, bookmarksResult] = await Promise.all([
        supabase.from('likes').select('tweet_id').eq('user_id', currentUser.id),
        supabase.from('retweets').select('tweet_id').eq('user_id', currentUser.id),
        supabase.from('bookmarks').select('tweet_id').eq('user_id', currentUser.id)
      ]);
      
      const userLikes = likesResult.data?.map(like => like.tweet_id) || [];
      const userRetweets = retweetsResult.data?.map(retweet => retweet.tweet_id) || [];
      const userBookmarks = bookmarksResult.data?.map(bookmark => bookmark.tweet_id) || [];

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

      // Format tweets data (simplified - all tweets use the same author)
      const formattedTweets: Tweet[] = tweetsData.map(tweet => ({
        id: tweet.id,
        content: tweet.content,
        author: formattedProfile, // Use the profile we already have
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
        replyTo: tweet.reply_to,
        isRetweet: tweet.is_retweet || false,
      }));

      setProfile(formattedProfile);
      setTweets(formattedTweets);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching user profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (tweetId: string) => {
    try {
      const tweet = tweets.find(t => t.id === tweetId);
      
      // Optimistic update
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

      // Make API call
      if (tweet?.isLiked) {
        await supabase.from('likes').delete().match({
          user_id: currentUser?.id,
          tweet_id: tweetId,
        });
      } else {
        await supabase.from('likes').insert({
          user_id: currentUser?.id,
          tweet_id: tweetId,
        });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert optimistic update on error
      setTweets(prevTweets => 
        prevTweets.map(t => 
          t.id === tweetId 
            ? { 
                ...t, 
                isLiked: !t.isLiked, 
                likes: t.isLiked ? t.likes + 1 : Math.max(0, t.likes - 1)
              }
            : t
        )
      );
    }
  };

  const handleRetweet = async (tweetId: string) => {
    try {
      const tweet = tweets.find(t => t.id === tweetId);
      
      // Optimistic update
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

      // Make API call
      if (tweet?.isRetweeted) {
        await supabase.from('retweets').delete().match({
          user_id: currentUser?.id,
          tweet_id: tweetId,
        });
      } else {
        await supabase.from('retweets').insert({
          user_id: currentUser?.id,
          tweet_id: tweetId,
        });
      }
    } catch (error) {
      console.error('Error toggling retweet:', error);
      // Revert optimistic update on error
      setTweets(prevTweets => 
        prevTweets.map(t => 
          t.id === tweetId 
            ? { 
                ...t, 
                isRetweeted: !t.isRetweeted, 
                retweets: t.isRetweeted ? t.retweets + 1 : Math.max(0, t.retweets - 1)
              }
            : t
        )
      );
    }
  };

  const handleBookmark = async (tweetId: string) => {
    try {
      const tweet = tweets.find(t => t.id === tweetId);
      
      // Optimistic update
      setTweets(prevTweets => 
        prevTweets.map(t => 
          t.id === tweetId 
            ? { ...t, isBookmarked: !t.isBookmarked }
            : t
        )
      );

      // Make API call
      if (tweet?.isBookmarked) {
        await supabase.from('bookmarks').delete().match({
          user_id: currentUser?.id,
          tweet_id: tweetId,
        });
      } else {
        await supabase.from('bookmarks').insert({
          user_id: currentUser?.id,
          tweet_id: tweetId,
        });
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      // Revert optimistic update on error
      setTweets(prevTweets => 
        prevTweets.map(t => 
          t.id === tweetId 
            ? { ...t, isBookmarked: !t.isBookmarked }
            : t
        )
      );
    }
  };

  const handleEditProfile = () => {
    // TODO: Implement edit profile functionality
    console.log('Edit profile');
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
          <div className={`flex items-end justify-between ${isRTL ? 'flex-row-reverse' : ''} -mt-16 mb-4`}>
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
              <Edit3 className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              Edit profile
            </Button>
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
            
            {profile.bio ? (
              <p className="text-gray-900 mb-3">{profile.bio}</p>
            ) : (
              <p className="text-gray-500 mb-3 italic">No bio yet</p>
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
            <p className="text-sm mt-2">Share your first thought!</p>
            <Button 
              onClick={() => navigate('/compose')}
              className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-full font-medium"
            >
              Tweet now
            </Button>
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