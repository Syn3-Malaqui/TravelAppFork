import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Link as LinkIcon, UserPlus, UserMinus, Settings, MessageCircle, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { TweetCard } from '../Tweet/TweetCard';
import { MobileTweetCard } from '../Tweet/MobileTweetCard';
import { ProfileSkeleton } from './ProfileSkeleton';
import { TweetSkeletonList } from '../Tweet/TweetSkeleton';
import { TrendingSidebar } from '../Layout/TrendingSidebar';
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
import { profileCache, tweetCache, cacheKeys, invalidateCache } from '../../lib/cache';

export const ProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user: currentUser, userProfile: currentUserProfile } = useAuth();
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

      console.log('🔄 Loading profile for:', username);

      // Check if this is the current user's profile and we have preloaded data
      if (currentUserProfile && currentUserProfile.username === username) {
        console.log('⚡ Using preloaded profile data for current user');
        
        const formattedProfile: User = {
          id: currentUserProfile.id,
          username: currentUserProfile.username,
          displayName: currentUserProfile.displayName,
          avatar: currentUserProfile.avatar,
          bio: currentUserProfile.bio,
          verified: currentUserProfile.verified,
          followers: currentUserProfile.followers,
          following: currentUserProfile.following,
          joinedDate: currentUserProfile.joinedDate,
          coverImage: currentUserProfile.coverImage,
          country: currentUserProfile.country,
        };

        setProfile(formattedProfile);
        setLoading(false);

        // Load tweets in background
        loadUserTweets(formattedProfile.id, formattedProfile);
        return;
      }

      // Check cache first
      const cacheKey = cacheKeys.profile(username || '');
      const cachedProfile = profileCache.get<User>(cacheKey);
      
      if (cachedProfile) {
        console.log('⚡ Using cached profile data for:', username);
        setProfile(cachedProfile);
        setLoading(false);
        
        // Load tweets in background
        loadUserTweets(cachedProfile.id, cachedProfile);
        return;
      }

      // Fast profile query - essential data only including suspension status
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
          country,
          suspended,
          suspended_at,
          suspended_reason,
          deleted_at
        `)
        .eq('username', username)
        .single();

      if (profileError) {
        console.error('❌ Profile error:', profileError);
        throw profileError;
      }

      console.log('✅ Profile data loaded:', profileData.username);

      // Format profile data immediately
      const formattedProfile: User = {
        id: profileData.id,
        username: profileData.username,
        displayName: profileData.display_name || profileData.username,
        avatar: profileData.avatar_url || '',
        bio: profileData.bio || '',
        verified: profileData.verified || false,
        followers: profileData.followers_count || 0,
        following: profileData.following_count || 0,
        joinedDate: new Date(profileData.created_at),
        coverImage: profileData.cover_image,
        country: profileData.country || 'US',
        suspended: profileData.suspended || false,
        suspendedAt: profileData.suspended_at ? new Date(profileData.suspended_at) : undefined,
        suspendedReason: profileData.suspended_reason || undefined,
        deletedAt: profileData.deleted_at ? new Date(profileData.deleted_at) : undefined,
      };

      // Cache the profile data
      profileCache.set(cacheKey, formattedProfile);

      setProfile(formattedProfile);
      setLoading(false);

      // Load tweets
      await loadUserTweets(profileData.id, formattedProfile);

    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching profile:', err);
      setLoading(false);
    }
  }, [username, currentUser, currentUserProfile]);

  // Optimized function to load user tweets with caching
  const loadUserTweets = useCallback(async (userId: string, profileData: User) => {
    try {
      console.log('🔄 Loading tweets for user:', userId);

      // Check cache for tweets
      const tweetsCacheKey = cacheKeys.userTweets(userId, 'tweets');
      const repliesCacheKey = cacheKeys.userTweets(userId, 'replies');
      const likesCacheKey = cacheKeys.userTweets(userId, 'likes');

      const cachedTweets = tweetCache.get<Tweet[]>(tweetsCacheKey);
      const cachedReplies = tweetCache.get<Tweet[]>(repliesCacheKey);
      const cachedLikes = tweetCache.get<Tweet[]>(likesCacheKey);

      if (cachedTweets && cachedReplies && cachedLikes) {
        console.log('⚡ Using cached tweet data');
        setTweets(cachedTweets);
        setReplies(cachedReplies);
        setLikes(cachedLikes);
        return;
      }

      // Load tweets quickly with simplified queries - truly parallel
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
            pinned_to_profile,
            pinned_to_home,
            pinned_at
          `)
          .eq('author_id', userId)
          .is('reply_to', null)
          .order('pinned_to_profile', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(20),

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
            created_at
          `)
          .eq('author_id', userId)
          .not('reply_to', 'is', null)
          .order('created_at', { ascending: false })
          .limit(20),

        // User's liked tweets - simplified
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
              author_id
            )
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20)
      ]);

      console.log('✅ Tweets loaded:', {
        tweets: tweetsResult.data?.length || 0,
        replies: repliesResult.data?.length || 0,
        likes: likesResult.data?.length || 0
      });

      // Quick format function - no interactions initially
      const formatQuickTweetData = (tweetData: any, authorProfile: any): Tweet => ({
        id: tweetData.id,
        content: tweetData.content,
        author: {
          id: authorProfile.id,
          username: authorProfile.username,
          displayName: authorProfile.displayName,
          avatar: authorProfile.avatar,
          bio: authorProfile.bio,
          verified: authorProfile.verified,
          followers: authorProfile.followers,
          following: authorProfile.following,
          country: authorProfile.country,
          joinedDate: authorProfile.joinedDate,
        },
        createdAt: new Date(tweetData.created_at),
        likes: tweetData.likes_count || 0,
        retweets: tweetData.retweets_count || 0,
        replies: tweetData.replies_count || 0,
        views: tweetData.views_count || 0,
        images: tweetData.image_urls || [],
        isLiked: false, // Will be updated async
        isRetweeted: false, // Will be updated async
        isBookmarked: false, // Will be updated async
        hashtags: tweetData.hashtags || [],
        mentions: tweetData.mentions || [],
        tags: tweetData.tags || [],
        replyTo: tweetData.reply_to,
        pinnedToProfile: tweetData.pinned_to_profile || false,
        pinnedToHome: tweetData.pinned_to_home || false,
        pinnedAt: tweetData.pinned_at ? new Date(tweetData.pinned_at) : undefined,
      });

      // Format tweets quickly
      const formattedTweets: Tweet[] = (tweetsResult.data || []).map(tweetData => 
        formatQuickTweetData(tweetData, profileData)
      );
      
      // Sort so pinned tweets come first, then by creation date desc
      formattedTweets.sort((a, b) => {
        if (a.pinnedToProfile !== b.pinnedToProfile) {
          return a.pinnedToProfile ? -1 : 1; // true first
        }
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
      
      const formattedReplies: Tweet[] = (repliesResult.data || []).map(tweetData => 
        formatQuickTweetData(tweetData, profileData)
      );
      
      const formattedLikes: Tweet[] = (likesResult.data || [])
        .filter((like: any) => like.tweets)
        .map((like: any) => formatQuickTweetData(like.tweets, profileData));

      setTweets(formattedTweets);
      setReplies(formattedReplies);
      setLikes(formattedLikes);

      // Update interactions asynchronously (non-blocking)
      if (currentUser && (formattedTweets.length > 0 || formattedReplies.length > 0 || formattedLikes.length > 0)) {
        setTimeout(async () => {
          try {
            const allTweetIds = [
              ...formattedTweets.map(t => t.id),
              ...formattedReplies.map(t => t.id),
              ...formattedLikes.map(t => t.id)
            ];

            if (allTweetIds.length > 0) {
              const [likesRes, retweetsRes, bookmarksRes] = await Promise.all([
                supabase.from('likes').select('tweet_id').eq('user_id', currentUser.id).in('tweet_id', allTweetIds),
                supabase.from('retweets').select('tweet_id').eq('user_id', currentUser.id).in('tweet_id', allTweetIds),
                supabase.from('bookmarks').select('tweet_id').eq('user_id', currentUser.id).in('tweet_id', allTweetIds)
              ]);
              
              const userLikes = new Set(likesRes.data?.map(like => like.tweet_id) || []);
              const userRetweets = new Set(retweetsRes.data?.map(retweet => retweet.tweet_id) || []);
              const userBookmarks = new Set(bookmarksRes.data?.map(bookmark => bookmark.tweet_id) || []);

              // Update tweet states
              const updateInteractions = (tweets: Tweet[]) => tweets.map(tweet => ({
                ...tweet,
                isLiked: userLikes.has(tweet.id),
                isRetweeted: userRetweets.has(tweet.id),
                isBookmarked: userBookmarks.has(tweet.id),
              }));

              setTweets(prev => updateInteractions(prev));
              setReplies(prev => updateInteractions(prev));
              setLikes(prev => updateInteractions(prev));
            }
          } catch (error) {
            console.warn('Failed to update interactions:', error);
          }
        }, 200);
      }

      // Cache the results
      tweetCache.set(tweetsCacheKey, formattedTweets);
      tweetCache.set(repliesCacheKey, formattedReplies);
      tweetCache.set(likesCacheKey, formattedLikes);

    } catch (error) {
      console.error('Error loading user tweets:', error);
    }
  }, [currentUser]);

  // Simplified profile loading
  useEffect(() => {
    if (!username) return;
    
    console.log('🔄 Profile page mounted for:', username);
    fetchProfile();
  }, [username, fetchProfile]);

  const handleFollow = useCallback(async () => {
    if (!profile) return;
    
    try {
      if (isFollowing(profile.id)) {
        await unfollowUser(profile.id);
      } else {
        await followUser(profile.id);
      }
      // Invalidate cache and refresh profile to get updated follower count
      invalidateCache.userProfile(profile.id);
      await fetchProfile();
    } catch (error: any) {
      console.error('Error toggling follow:', error.message);
    }
  }, [profile, isFollowing, unfollowUser, followUser, fetchProfile]);

  const handleMessage = useCallback(async () => {
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
  }, [profile, currentUser, createConversation, navigate]);

  const handleLike = useCallback(async (tweetId: string) => {
    console.log('Like tweet:', tweetId);
  }, []);

  const handleRetweet = useCallback((tweetId: string) => {
    console.log('Retweet:', tweetId);
  }, []);

  const handleBookmark = useCallback((tweetId: string) => {
    console.log('Bookmark:', tweetId);
  }, []);

  const handleFollowersClick = useCallback(() => {
    if (profile) navigate(`/profile/${profile.username}/followers`);
  }, [profile, navigate]);

  const handleFollowingClick = useCallback(() => {
    if (profile) navigate(`/profile/${profile.username}/following`);
  }, [profile, navigate]);

  // Function to refresh profile data (called when new tweets are added)
  const refreshProfileData = useCallback(() => {
    if (username) {
      invalidateCache.userProfile(username);
      invalidateCache.userTweets(profile?.id || '');
      fetchProfile();
    }
  }, [username, profile?.id, fetchProfile]);

  const getCurrentTabTweets = useMemo(() => {
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
  }, [activeTab, tweets, replies, likes]);

  // Show loading state
  if (loading && profile === null) {
    return <ProfileSkeleton isMobile={window.innerWidth < 768} />;
  }

  // Show error state with better error handling
  if (error || !profile) {
    console.error('ProfilePage Error:', { error, profile, username, currentUser });
    
    return (
      <div className="min-h-screen bg-white flex">
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
            <h1 className="text-lg font-bold">Profile Error</h1>
          </div>
        </div>

        {/* Error Content */}
        <div className="flex-1 flex flex-col items-center justify-center py-12 px-4">
          <div className="text-center max-w-md">
            <div className="mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-red-600 text-2xl">⚠️</span>
              </div>
              <h2 className="text-xl font-semibold mb-2 text-gray-900">
                {error?.includes('not found') || error?.includes('PGRST116') 
                  ? 'Profile not found' 
                  : 'Error loading profile'
                }
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                {error?.includes('not found') || error?.includes('PGRST116')
                  ? `The user @${username} does not exist or their profile is not accessible.`
                  : error || 'Something went wrong while loading this profile. Please try again.'
                }
              </p>
            </div>
            
            <div className="space-y-3">
              <Button 
                onClick={() => {
                  console.log('🔄 Retrying profile fetch...');
                  fetchProfile();
                }} 
                className="w-full bg-blue-500 hover:bg-blue-600 text-white"
              >
                Try Again
              </Button>
              <Button 
                onClick={() => navigate('/')} 
                variant="outline"
                className="w-full"
              >
                Go back home
              </Button>
            </div>

            {/* Debug info for development */}
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-6 text-left">
                <summary className="text-xs text-gray-500 cursor-pointer">Debug Info</summary>
                <pre className="text-xs text-gray-400 mt-2 p-2 bg-gray-50 rounded overflow-auto">
                  {JSON.stringify({ 
                    error, 
                    username, 
                    currentUser: currentUser?.id,
                    timestamp: new Date().toISOString()
                  }, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === profile.id;
  const userIsFollowing = isFollowing(profile.id);
  const currentTabTweets = getCurrentTabTweets;

  // Show suspended user page if user is suspended
  if (profile?.suspended && !profile?.deletedAt) {
    return (
      <div className="min-h-screen bg-white flex">
        {/* Desktop Layout */}
        <div className="hidden md:flex flex-1 min-w-0">
          <div className="flex-1 max-w-2xl border-x border-gray-200">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3 flex items-center sticky top-0 z-10">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="p-2 mr-4"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold">Profile</h1>
                <p className="text-sm text-gray-500">@{profile.username}</p>
              </div>
            </div>

            {/* Suspended User Content */}
            <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
              <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mb-6">
                <UserMinus className="w-12 h-12 text-orange-600" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {language === 'en' ? 'Account Suspended' : 'الحساب موقوف'}
              </h2>
              
              <p className="text-gray-600 mb-2 max-w-md">
                {language === 'en' 
                  ? 'This account has been suspended and is not available for viewing.'
                  : 'تم إيقاف هذا الحساب وهو غير متاح للعرض.'
                }
              </p>
              
              {profile.suspendedAt && (
                <p className="text-sm text-gray-500 mb-4">
                  {language === 'en' ? 'Suspended on ' : 'تم الإيقاف في '}
                  {formatDistanceToNow(profile.suspendedAt, { 
                    addSuffix: true, 
                    locale: language === 'ar' ? arSA : enUS 
                  })}
                </p>
              )}
              
              {profile.suspendedReason && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 max-w-md">
                  <p className="text-sm text-orange-800">
                    <strong>{language === 'en' ? 'Reason: ' : 'السبب: '}</strong>
                    {profile.suspendedReason}
                  </p>
                </div>
              )}
              
              <Button 
                onClick={() => navigate('/')} 
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                {language === 'en' ? 'Go back home' : 'العودة للرئيسية'}
              </Button>
            </div>
          </div>
          
          {/* Trending Sidebar */}
          {showSidebar && (
            <div className="w-80 flex-shrink-0">
              <TrendingSidebar />
            </div>
          )}
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden w-full min-h-screen flex flex-col">
          {/* Header */}
          <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3 flex items-center z-10 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="p-2 mr-3"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold">Profile</h1>
              <p className="text-sm text-gray-500">@{profile.username}</p>
            </div>
          </div>

          {/* Suspended User Content - Mobile */}
          <div className="flex-1 flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-6">
              <UserMinus className="w-10 h-10 text-orange-600" />
            </div>
            
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {language === 'en' ? 'Account Suspended' : 'الحساب موقوف'}
            </h2>
            
            <p className="text-gray-600 mb-2 text-sm">
              {language === 'en' 
                ? 'This account has been suspended and is not available for viewing.'
                : 'تم إيقاف هذا الحساب وهو غير متاح للعرض.'
              }
            </p>
            
            {profile.suspendedAt && (
              <p className="text-xs text-gray-500 mb-4">
                {language === 'en' ? 'Suspended ' : 'تم الإيقاف '}
                {formatDistanceToNow(profile.suspendedAt, { 
                  addSuffix: true, 
                  locale: language === 'ar' ? arSA : enUS 
                })}
              </p>
            )}
            
            {profile.suspendedReason && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-6 w-full">
                <p className="text-xs text-orange-800">
                  <strong>{language === 'en' ? 'Reason: ' : 'السبب: '}</strong>
                  {profile.suspendedReason}
                </p>
              </div>
            )}
            
            <Button 
              onClick={() => navigate('/')} 
              className="bg-blue-500 hover:bg-blue-600 text-white w-full"
            >
              {language === 'en' ? 'Go back home' : 'العودة للرئيسية'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show deleted user page if user is deleted
  if (profile?.deletedAt) {
    return (
      <div className="min-h-screen bg-white flex">
        {/* Desktop Layout */}
        <div className="hidden md:flex flex-1 min-w-0">
          <div className="flex-1 max-w-2xl border-x border-gray-200">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3 flex items-center sticky top-0 z-10">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="p-2 mr-4"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold">Profile</h1>
                <p className="text-sm text-gray-500">@{profile.username}</p>
              </div>
            </div>

            {/* Deleted User Content */}
            <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
              <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
                <Trash2 className="w-12 h-12 text-red-600" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {language === 'en' ? 'Account Deleted' : 'الحساب محذوف'}
              </h2>
              
              <p className="text-gray-600 mb-6 max-w-md">
                {language === 'en' 
                  ? 'This account has been deleted and is no longer available.'
                  : 'تم حذف هذا الحساب وهو لم يعد متاحاً.'
                }
              </p>
              
              <Button 
                onClick={() => navigate('/')} 
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                {language === 'en' ? 'Go back home' : 'العودة للرئيسية'}
              </Button>
            </div>
          </div>
          
          {/* Trending Sidebar */}
          {showSidebar && (
            <div className="w-80 flex-shrink-0">
              <TrendingSidebar />
            </div>
          )}
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden w-full min-h-screen flex flex-col">
          {/* Header */}
          <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3 flex items-center z-10 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="p-2 mr-3"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold">Profile</h1>
              <p className="text-sm text-gray-500">@{profile.username}</p>
            </div>
          </div>

          {/* Deleted User Content - Mobile */}
          <div className="flex-1 flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <Trash2 className="w-10 h-10 text-red-600" />
            </div>
            
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {language === 'en' ? 'Account Deleted' : 'الحساب محذوف'}
            </h2>
            
            <p className="text-gray-600 mb-6 text-sm">
              {language === 'en' 
                ? 'This account has been deleted and is no longer available.'
                : 'تم حذف هذا الحساب وهو لم يعد متاحاً.'
              }
            </p>
            
            <Button 
              onClick={() => navigate('/')} 
              className="bg-blue-500 hover:bg-blue-600 text-white w-full"
            >
              {language === 'en' ? 'Go back home' : 'العودة للرئيسية'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Desktop Layout with Conditional Sidebar */}
      <div className="hidden md:flex flex-1 min-w-0">
        {/* Main Content */}
        <div className={`flex-1 border-r border-gray-200 flex flex-col min-w-0 ${showSidebar ? '' : 'border-r-0'}`}>
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
              <p className="text-sm text-gray-500">{tweets.length} posts</p>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1">
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
                  { id: 'tweets', label: language === 'en' ? 'Posts' : 'التغريدات', count: tweets.length },
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
                    {activeTab === 'tweets' && (language === 'en' ? 'No posts yet' : 'لا توجد تغريدات بعد')}
                    {activeTab === 'replies' && (language === 'en' ? 'No replies yet' : 'لا توجد ردود بعد')}
                    {activeTab === 'media' && (language === 'en' ? 'No media posts yet' : 'لا توجد تغريدات وسائط بعد')}
                    {activeTab === 'likes' && (language === 'en' ? 'No liked posts yet' : 'لا توجد تغريدات معجب بها بعد')}
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
                      onPinStatusChange={refreshProfileData}
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
      <div className="md:hidden w-full min-h-screen flex flex-col">
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
            <p className="text-xs text-gray-500">{tweets.length} posts</p>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1">
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
                { id: 'tweets', label: language === 'en' ? 'Posts' : 'التغريدات', count: tweets.length },
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
                  {activeTab === 'tweets' && (language === 'en' ? 'No posts yet' : 'لا توجد تغريدات بعد')}
                  {activeTab === 'replies' && (language === 'en' ? 'No replies yet' : 'لا توجد ردود بعد')}
                  {activeTab === 'media' && (language === 'en' ? 'No media posts yet' : 'لا توجد تغريدات وسائط بعد')}
                  {activeTab === 'likes' && (language === 'en' ? 'No liked posts yet' : 'لا توجد تغريدات معجب بها بعد')}
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
                    onPinStatusChange={refreshProfileData}
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