import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Link as LinkIcon, UserPlus, UserMinus, Settings } from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { TweetCard } from '../Tweet/TweetCard';
import { MobileTweetCard } from '../Tweet/MobileTweetCard';
import { ProfileSkeleton } from './ProfileSkeleton';
import { TweetSkeletonList } from '../Tweet/TweetSkeleton';
import { TrendingSidebar } from '../Layout/TrendingSidebar';
import { useAuth } from '../../hooks/useAuth';
import { useFollow } from '../../hooks/useFollow';
import { supabase } from '../../lib/supabase';
import { storageService } from '../../lib/storage';
import { Tweet, User } from '../../types';
import { formatDistanceToNow } from 'date-fns';

export const ProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { followUser, unfollowUser, isFollowing, loading: followLoading } = useFollow();
  
  const [profile, setProfile] = useState<User | null>(null);
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [replies, setReplies] = useState<Tweet[]>([]);
  const [likes, setLikes] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tweets' | 'replies' | 'media' | 'likes'>('tweets');
  const [showSidebar, setShowSidebar] = useState(true);

  // Handle window resize to show/hide sidebar
  useEffect(() => {
    const handleResize = () => {
      setShowSidebar(window.innerWidth >= 1280);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (username) {
      fetchProfile();
    }
  }, [username]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      // Optimized profile query - minimal data first
      const { data: profileData, error: profileError } = await supabase
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

      // Fetch tweets in parallel with reduced data
      const [tweetsResult, repliesResult, likesResult] = await Promise.all([
        // User's tweets (excluding replies) - minimal data
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
          .limit(10), // Reduced limit

        // User's replies - minimal data
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
          .limit(10), // Reduced limit

        // User's liked tweets - minimal data
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
          .limit(10) // Reduced limit
      ]);

      // Get current user's interactions only if authenticated
      let userLikes: string[] = [];
      let userRetweets: string[] = [];
      let userBookmarks: string[] = [];
      
      if (currentUser) {
        const allTweetIds = [
          ...(tweetsResult.data?.map(t => t.id) || []),
          ...(repliesResult.data?.map(t => t.id) || []),
          ...(likesResult.data?.map(l => l.tweets.id) || [])
        ];

        if (allTweetIds.length > 0) {
          const [likesRes, retweetsRes, bookmarksRes] = await Promise.all([
            supabase.from('likes').select('tweet_id').eq('user_id', currentUser.id).in('tweet_id', allTweetIds),
            supabase.from('retweets').select('tweet_id').eq('user_id', currentUser.id).in('tweet_id', allTweetIds),
            supabase.from('bookmarks').select('tweet_id').eq('user_id', currentUser.id).in('tweet_id', allTweetIds)
          ]);
          
          userLikes = likesRes.data?.map(like => like.tweet_id) || [];
          userRetweets = retweetsRes.data?.map(retweet => retweet.tweet_id) || [];
          userBookmarks = bookmarksRes.data?.map(bookmark => bookmark.tweet_id) || [];
        }
      }

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
        isLiked: userLikes.includes(tweetData.id),
        isRetweeted: userRetweets.includes(tweetData.id),
        isBookmarked: userBookmarks.includes(tweetData.id),
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
    console.log('Like tweet:', tweetId);
  };

  const handleRetweet = (tweetId: string) => {
    console.log('Retweet:', tweetId);
  };

  const handleBookmark = (tweetId: string) => {
    console.log('Bookmark:', tweetId);
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
    return <ProfileSkeleton isMobile={window.innerWidth < 768} />;
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
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
  const currentTabTweets = getCurrentTabTweets();

  return (
    <div className="min-h-screen bg-white flex h-screen overflow-hidden">
      {/* Desktop Layout with Conditional Sidebar */}
      <div className="hidden md:flex flex-1">
        {/* Main Content */}
        <div className={`flex-1 border-r border-gray-200 flex flex-col ${showSidebar ? '' : 'border-r-0'}`}>
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
              <div className="h-48 bg-gradient-to-r from-blue-400 to-purple-500">
                {profile.coverImage && (
                  <img
                    src={storageService.getOptimizedImageUrl(profile.coverImage, { width: 800, quality: 80 })}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              
              {/* Profile Info */}
              <div className="px-4 pb-4">
                {/* Avatar and Follow Button */}
                <div className="flex items-end justify-between -mt-16 mb-4">
                  <Avatar className="w-32 h-32 border-4 border-white bg-white">
                    <AvatarImage 
                      src={profile.avatar ? storageService.getOptimizedImageUrl(profile.avatar, { width: 200, quality: 80 }) : undefined} 
                    />
                    <AvatarFallback className="text-2xl">{profile.displayName[0]}</AvatarFallback>
                  </Avatar>
                  
                  {isOwnProfile ? (
                    <Button variant="outline" className="mt-16 px-6 py-2 font-bold rounded-full">
                      <Settings className="w-4 h-4 mr-2" />
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
                          <UserMinus className="w-4 h-4 mr-2" />
                          Following
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Follow
                        </>
                      )}
                    </Button>
                  )}
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
                  
                  {profile.bio && (
                    <p className="text-gray-900 mb-3">{profile.bio}</p>
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
                  {isOwnProfile && activeTab === 'tweets' && (
                    <p className="text-sm mt-2">Share your first thought!</p>
                  )}
                </div>
              ) : (
                currentTabTweets.map((tweet) => (
                  <div key={tweet.id}>
                    <TweetCard 
                      tweet={tweet} 
                      onLike={() => handleLike(tweet.id)}
                      onRetweet={() => handleRetweet(tweet.id)}
                      onBookmark={() => handleBookmark(tweet.id)}
                      currentUserId={currentUser?.id}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Conditionally Rendered */}
        {showSidebar && <TrendingSidebar />}
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden w-full border-r border-gray-200 overflow-hidden flex flex-col">
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
            <div className="h-48 bg-gradient-to-r from-blue-400 to-purple-500">
              {profile.coverImage && (
                <img
                  src={storageService.getOptimizedImageUrl(profile.coverImage, { width: 800, quality: 80 })}
                  alt="Cover"
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            
            {/* Profile Info */}
            <div className="px-4 pb-4">
              {/* Avatar and Follow Button */}
              <div className="flex items-end justify-between -mt-16 mb-4">
                <Avatar className="w-32 h-32 border-4 border-white bg-white">
                  <AvatarImage 
                    src={profile.avatar ? storageService.getOptimizedImageUrl(profile.avatar, { width: 200, quality: 80 }) : undefined} 
                  />
                  <AvatarFallback className="text-2xl">{profile.displayName[0]}</AvatarFallback>
                </Avatar>
                
                {isOwnProfile ? (
                  <Button variant="outline" className="mt-16 px-6 py-2 font-bold rounded-full">
                    <Settings className="w-4 h-4 mr-2" />
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
                        <UserMinus className="w-4 h-4 mr-2" />
                        Following
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Follow
                      </>
                    )}
                  </Button>
                )}
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
                
                {profile.bio && (
                  <p className="text-gray-900 mb-3">{profile.bio}</p>
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
                {isOwnProfile && activeTab === 'tweets' && (
                  <p className="text-sm mt-2">Share your first thought!</p>
                )}
              </div>
            ) : (
              currentTabTweets.map((tweet) => (
                <div key={tweet.id}>
                  <MobileTweetCard 
                    tweet={tweet}
                    onLike={() => handleLike(tweet.id)}
                    onRetweet={() => handleRetweet(tweet.id)}
                    onBookmark={() => handleBookmark(tweet.id)}
                    currentUserId={currentUser?.id}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};