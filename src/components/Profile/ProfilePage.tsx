import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Link as LinkIcon, UserPlus, UserMinus, Settings, MessageCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { TweetCard } from '../Tweet/TweetCard';
import { MobileTweetCard } from '../Tweet/MobileTweetCard';
import { ProfileSkeleton } from './ProfileSkeleton';
import { TweetSkeletonList } from '../Tweet/TweetSkeleton';
import { TrendingSidebar } from '../Layout/TrendingSidebar';
import { FollowListModal } from './FollowListModal';
import { useAuth } from '../../hooks/useAuth';
import { useFollow } from '../../hooks/useFollow';
import { useMessages } from '../../hooks/useMessages';
import { useProfileSync } from '../../hooks/useProfileSync';
import { useLanguageStore } from '../../store/useLanguageStore';
import { supabase } from '../../lib/supabase';
import { storageService } from '../../lib/storage';
import { Tweet, User } from '../../types';
import { formatDistanceToNow } from 'date-fns';
import { arSA, enUS } from 'date-fns/locale';

export const ProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { followUser, unfollowUser, isFollowing, loading: followLoading } = useFollow();
  const { createConversation } = useMessages();
  const { language, isRTL } = useLanguageStore();
  
  const [profile, setProfile] = useState<User | null>(null);
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [replies, setReplies] = useState<Tweet[]>([]);
  const [likes, setLikes] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tweets' | 'replies' | 'media' | 'likes'>('tweets');
  const [showSidebar, setShowSidebar] = useState(true);
  const [messageLoading, setMessageLoading] = useState(false);
  const [followModalOpen, setFollowModalOpen] = useState(false);
  const [followModalType, setFollowModalType] = useState<'followers' | 'following'>('followers');

  // Handle profile updates via real-time sync
  useProfileSync((profileUpdate) => {
    if (profile && profile.id === profileUpdate.id) {
      setProfile(prev => prev ? {
        ...prev,
        verified: profileUpdate.verified ?? prev.verified,
        displayName: profileUpdate.display_name ?? prev.displayName,
        avatar: profileUpdate.avatar_url ?? prev.avatar,
      } : prev);
    }
  });

  // Handle window resize to show/hide sidebar
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      
      // Calculate required space dynamically
      const leftSidebarWidth = 256; // w-64 = 256px
      const minMainContentWidth = 400; // minimum for readable content
      const trendingSidebarWidth = 280; // average trending sidebar width
      const margins = 60; // padding and margins
      const minRequiredWidth = leftSidebarWidth + minMainContentWidth + trendingSidebarWidth + margins;
      
      // Show trending sidebar only if there's enough actual space
      const hasEnoughSpace = width >= minRequiredWidth;
      setShowSidebar(hasEnoughSpace);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchProfile = useCallback(async () => {
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

      // Cache the profile data and mark as loaded in session
      try {
        sessionStorage.setItem(`profile_${username}`, JSON.stringify({
          profile: formattedProfile,
          tweets: formattedTweets,
          replies: formattedReplies,
          likes: formattedLikes,
          timestamp: Date.now()
        }));
        
        // Mark this profile as loaded in the current session
        const sessionLoadedProfiles = sessionStorage.getItem('loaded_profiles');
        const loadedInSession = sessionLoadedProfiles ? JSON.parse(sessionLoadedProfiles) : [];
        if (!loadedInSession.includes(username)) {
          loadedInSession.push(username);
          sessionStorage.setItem('loaded_profiles', JSON.stringify(loadedInSession));
        }
      } catch (error) {
        console.warn('Failed to cache profile data:', error);
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  }, [username, currentUser]);

  // Fetch profile data when username changes - with persistent session caching
  useEffect(() => {
    if (!username) return;

    // Check if this profile was already loaded in this session
    const sessionLoadedProfiles = sessionStorage.getItem('loaded_profiles');
    const loadedInSession = sessionLoadedProfiles ? JSON.parse(sessionLoadedProfiles) : [];
    
    // Check if we have cached data for this profile
    const cachedProfile = sessionStorage.getItem(`profile_${username}`);
    
    if (cachedProfile && loadedInSession.includes(username)) {
      // Profile was loaded in this session and we have cached data
      try {
        const parsed = JSON.parse(cachedProfile);
        // Use longer cache for session-loaded profiles (until page refresh)
        if (Date.now() - parsed.timestamp < 60 * 60 * 1000) { // 1 hour cache for session profiles
          setProfile(parsed.profile);
          setTweets(parsed.tweets || []);
          setReplies(parsed.replies || []);
          setLikes(parsed.likes || []);
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error('Error parsing cached profile:', error);
      }
    }
    
    // If not in session cache, check for fresh cached data
    if (cachedProfile) {
      try {
        const parsed = JSON.parse(cachedProfile);
        if (Date.now() - parsed.timestamp < 5 * 60 * 1000) { // 5 minute cache for fresh loads
          setProfile(parsed.profile);
          setTweets(parsed.tweets || []);
          setReplies(parsed.replies || []);
          setLikes(parsed.likes || []);
          setLoading(false);
          
          // Mark as loaded in this session
          const updatedLoaded = [...loadedInSession, username];
          sessionStorage.setItem('loaded_profiles', JSON.stringify(updatedLoaded));
          return;
        }
      } catch (error) {
        console.error('Error parsing cached profile:', error);
      }
    }
    
    // Need to fetch fresh data
    fetchProfile();
  }, [username, fetchProfile]);

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

  const handleMessage = async () => {
    if (!profile || !currentUser) return;
    
    try {
      setMessageLoading(true);
      
      // Create or get existing conversation
      await createConversation(profile.id);
      
      // Navigate to messages page
      navigate('/messages');
    } catch (error: any) {
      console.error('Error creating conversation:', error.message);
    } finally {
      setMessageLoading(false);
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

  const handleFollowersClick = () => {
    setFollowModalType('followers');
    setFollowModalOpen(true);
  };

  const handleFollowingClick = () => {
    setFollowModalType('following');
    setFollowModalOpen(true);
  };

  // Function to refresh profile data (called when new tweets are added)
  const refreshProfileData = () => {
    if (username) {
      // Remove from session loaded profiles to force refresh
      const sessionLoadedProfiles = sessionStorage.getItem('loaded_profiles');
      if (sessionLoadedProfiles) {
        const loadedInSession = JSON.parse(sessionLoadedProfiles);
        const updatedLoaded = loadedInSession.filter((u: string) => u !== username);
        sessionStorage.setItem('loaded_profiles', JSON.stringify(updatedLoaded));
      }
      
      // Remove cached profile data
      sessionStorage.removeItem(`profile_${username}`);
      
      // Fetch fresh data
      fetchProfile();
    }
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

  if (loading && profile === null) {
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
                {/* Avatar and Action Buttons */}
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
                    <div className="flex space-x-3 mt-16">
                      {/* Message Button */}
                      <Button
                        variant="outline"
                        onClick={handleMessage}
                        disabled={messageLoading}
                        className="px-6 py-2 font-bold rounded-full border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        {messageLoading ? (
                          '...'
                        ) : (
                          <>
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Message
                          </>
                        )}
                      </Button>

                      {/* Follow Button */}
                      <Button
                        variant={userIsFollowing ? "outline" : "default"}
                        onClick={handleFollow}
                        disabled={followLoading}
                        className={`px-6 py-2 font-bold rounded-full transition-colors ${
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
                    </div>
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
                  <div className={`flex items-center text-gray-500 text-sm mb-3 ${isRTL ? 'space-x-reverse space-x-4 text-right' : 'space-x-4 text-left'}`}>
                    <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-1' : 'space-x-1'}`}>
                      <Calendar className="w-4 h-4" />
                      <span>
                        {language === 'en' 
                          ? `Joined ${profile.joinedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
                          : `انضم في ${profile.joinedDate.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' })}`
                        }
                      </span>
                    </div>
                  </div>

                  {/* Follow Stats */}
                  <div className={`flex ${isRTL ? 'space-x-reverse space-x-6 text-right' : 'space-x-6 text-left'}`}>
                    <div 
                      className={`flex items-center cursor-pointer hover:underline ${isRTL ? 'space-x-reverse space-x-1' : 'space-x-1'}`}
                      onClick={handleFollowingClick}
                    >
                      <span className="font-bold text-gray-900">{profile.following.toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')}</span>
                      <span className="text-gray-500">{language === 'en' ? 'Following' : 'متابَع'}</span>
                    </div>
                    <div 
                      className={`flex items-center cursor-pointer hover:underline ${isRTL ? 'space-x-reverse space-x-1' : 'space-x-1'}`}
                      onClick={handleFollowersClick}
                    >
                      <span className="font-bold text-gray-900">{profile.followers.toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')}</span>
                      <span className="text-gray-500">{language === 'en' ? 'Followers' : 'متابِع'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 sticky top-0 bg-white z-10">
              <div className="flex">
                {[
                  { id: 'tweets', label: language === 'en' ? 'Tweets' : 'التغريدات', count: tweets.length },
                  { id: 'replies', label: language === 'en' ? 'Replies' : 'الردود', count: replies.length },
                  { id: 'media', label: language === 'en' ? 'Media' : 'الوسائط', count: tweets.filter(t => t.images && t.images.length > 0).length },
                  { id: 'likes', label: language === 'en' ? 'Likes' : 'الإعجابات', count: likes.length },
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
                    {activeTab === 'tweets' && (language === 'en' ? 'No tweets yet' : 'لا توجد تغريدات بعد')}
                    {activeTab === 'replies' && (language === 'en' ? 'No replies yet' : 'لا توجد ردود بعد')}
                    {activeTab === 'media' && (language === 'en' ? 'No media tweets yet' : 'لا توجد تغريدات وسائط بعد')}
                    {activeTab === 'likes' && (language === 'en' ? 'No liked tweets yet' : 'لا توجد تغريدات معجب بها بعد')}
                  </p>
                  {isOwnProfile && activeTab === 'tweets' && (
                    <p className="text-sm mt-2">
                      {language === 'en' ? 'Share your first thought!' : 'شارك أول فكرة لك!'}
                    </p>
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
        <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-3 py-2.5 flex items-center z-10 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="p-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="ml-3">
            <h1 className="text-base font-bold">{profile.displayName}</h1>
            <p className="text-xs text-gray-500">{tweets.length} tweets</p>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Profile Header */}
          <div className="relative">
            {/* Cover Image */}
            <div className="h-32 bg-gradient-to-r from-blue-400 to-purple-500">
              {profile.coverImage && (
                <img
                  src={storageService.getOptimizedImageUrl(profile.coverImage, { width: 600, quality: 75 })}
                  alt="Cover"
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            
            {/* Profile Info */}
            <div className="px-3 pb-3">
              {/* Avatar and Action Buttons */}
              <div className="flex items-end justify-between -mt-10 mb-3">
                <Avatar className="w-20 h-20 border-3 border-white bg-white">
                  <AvatarImage 
                    src={profile.avatar ? storageService.getOptimizedImageUrl(profile.avatar, { width: 160, quality: 80 }) : undefined} 
                  />
                  <AvatarFallback className="text-lg">{profile.displayName[0]}</AvatarFallback>
                </Avatar>
                
                {isOwnProfile ? (
                  <Button variant="outline" className="mt-10 px-4 py-1.5 font-medium rounded-full text-sm">
                    <Settings className="w-3 h-3 mr-1" />
                    Edit profile
                  </Button>
                ) : (
                  <div className="flex flex-col space-y-1.5 mt-10">
                    {/* Follow Button */}
                    <Button
                      variant={userIsFollowing ? "outline" : "default"}
                      onClick={handleFollow}
                      disabled={followLoading}
                      className={`px-3 py-1.5 font-medium rounded-full transition-colors text-xs ${
                        userIsFollowing 
                          ? 'border-gray-300 text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-300' 
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}
                    >
                      {followLoading ? (
                        '...'
                      ) : userIsFollowing ? (
                        <>
                          <UserMinus className="w-3 h-3 mr-1" />
                          Following
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3 h-3 mr-1" />
                          Follow
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>

              {/* User Info */}
              <div>
                <div className="flex items-center space-x-1.5 mb-1">
                  <h1 className="text-lg font-bold text-gray-900">{profile.displayName}</h1>
                  {profile.verified && (
                    <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </div>
                <p className="text-gray-500 mb-2 text-sm">@{profile.username}</p>
                
                {profile.bio && (
                  <p className="text-gray-900 mb-2 text-sm">{profile.bio}</p>
                )}

                {/* Join Date */}
                <div className={`flex items-center text-gray-500 text-xs mb-2 ${isRTL ? 'space-x-reverse space-x-3 text-right' : 'space-x-3 text-left'}`}>
                  <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-1' : 'space-x-1'}`}>
                    <Calendar className="w-3 h-3" />
                    <span>
                      {language === 'en' 
                        ? `Joined ${profile.joinedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
                        : `انضم في ${profile.joinedDate.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' })}`
                      }
                    </span>
                  </div>
                </div>

                {/* Follow Stats */}
                <div className={`flex ${isRTL ? 'space-x-reverse space-x-4 text-right' : 'space-x-4 text-left'}`}>
                  <div 
                    className={`flex items-center cursor-pointer hover:underline ${isRTL ? 'space-x-reverse space-x-1' : 'space-x-1'}`}
                    onClick={handleFollowingClick}
                  >
                    <span className="font-bold text-gray-900 text-sm">{profile.following.toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')}</span>
                    <span className="text-gray-500 text-xs">{language === 'en' ? 'Following' : 'متابَع'}</span>
                  </div>
                  <div 
                    className={`flex items-center cursor-pointer hover:underline ${isRTL ? 'space-x-reverse space-x-1' : 'space-x-1'}`}
                    onClick={handleFollowersClick}
                  >
                    <span className="font-bold text-gray-900 text-sm">{profile.followers.toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')}</span>
                    <span className="text-gray-500 text-xs">{language === 'en' ? 'Followers' : 'متابِع'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 sticky top-0 bg-white z-10">
            <div className="flex">
              {[
                { id: 'tweets', label: language === 'en' ? 'Tweets' : 'التغريدات', count: tweets.length },
                { id: 'replies', label: language === 'en' ? 'Replies' : 'الردود', count: replies.length },
                { id: 'media', label: language === 'en' ? 'Media' : 'الوسائط', count: tweets.filter(t => t.images && t.images.length > 0).length },
                { id: 'likes', label: language === 'en' ? 'Likes' : 'الإعجابات', count: likes.length },
              ].map((tab) => (
                <Button
                  key={tab.id}
                  variant="ghost"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-3 px-2 font-medium text-sm rounded-none border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-black'
                      : 'border-transparent text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center space-x-1">
                    <span>{tab.label}</span>
                    {tab.count > 0 && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
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
                  {activeTab === 'tweets' && (language === 'en' ? 'No tweets yet' : 'لا توجد تغريدات بعد')}
                  {activeTab === 'replies' && (language === 'en' ? 'No replies yet' : 'لا توجد ردود بعد')}
                  {activeTab === 'media' && (language === 'en' ? 'No media tweets yet' : 'لا توجد تغريدات وسائط بعد')}
                  {activeTab === 'likes' && (language === 'en' ? 'No liked tweets yet' : 'لا توجد تغريدات معجب بها بعد')}
                </p>
                {isOwnProfile && activeTab === 'tweets' && (
                  <p className="text-sm mt-2">
                    {language === 'en' ? 'Share your first thought!' : 'شارك أول فكرة لك!'}
                  </p>
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

      {/* Follow List Modal */}
      <FollowListModal
        isOpen={followModalOpen}
        onClose={() => setFollowModalOpen(false)}
        userId={profile.id}
        type={followModalType}
        username={profile.username}
      />
    </div>
  );
};