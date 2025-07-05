import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CornerUpLeft, Eye, Play } from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { TweetCard } from './TweetCard';
import { MobileTweetCard } from './MobileTweetCard';
import { TweetSkeleton } from './TweetSkeleton';
import { ReplyComposer } from './ReplyComposer';
import { TrendingSidebar } from '../Layout/TrendingSidebar';
import { TweetBadges } from '../ui/TweetBadges';
import { useAuth } from '../../hooks/useAuth';
import { useTweets } from '../../hooks/useTweets';
import { useTweetViews } from '../../hooks/useTweetViews';
import { usePinnedTweets } from '../../hooks/usePinnedTweets';
import { useLanguageStore } from '../../store/useLanguageStore';
import { supabase } from '../../lib/supabase';
import { storageService } from '../../lib/storage';
import { Tweet, TweetWithProfile } from '../../types';
import { formatDistanceToNow } from 'date-fns';
import { arSA, enUS } from 'date-fns/locale';
import { LazyImage } from '../ui/LazyImage';
import { VideoPlayer } from '../ui/VideoPlayer';

// Function to detect if text contains Arabic characters
const isArabicText = (text: string): boolean => {
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
  return arabicRegex.test(text);
};

// Function to get text direction based on content
const getTextDirection = (text: string): 'ltr' | 'rtl' => {
  return isArabicText(text) ? 'rtl' : 'ltr';
};

export const TweetDetailPage: React.FC = () => {
  const { tweetId } = useParams<{ tweetId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { replies, fetchReplies, likeTweet, unlikeTweet } = useTweets();
  const { recordView } = useTweetViews();
  const { checkIfUserIsAdmin } = usePinnedTweets();
  const { language, isRTL } = useLanguageStore();
  
  const [tweet, setTweet] = useState<Tweet | null>(null);
  const [parentTweet, setParentTweet] = useState<Tweet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReplyComposer, setShowReplyComposer] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

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

    // Set initial state
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (tweetId) {
      fetchTweetDetail();
    }
  }, [tweetId]);

  // Record view when tweet detail page loads
  useEffect(() => {
    if (tweet && user) {
      recordView(tweet.id);
    }
  }, [tweet, user, recordView]);

  // Check if current user is admin
  useEffect(() => {
    checkIfUserIsAdmin().then(setIsAdmin);
  }, [checkIfUserIsAdmin]);

  const formatTweetData = (tweetData: TweetWithProfile, userLikes: string[], userRetweets: string[], userBookmarks: string[]): Tweet => {
    return {
      id: tweetData.id,
      content: tweetData.content,
      author: {
        id: tweetData.profiles.id,
        username: tweetData.profiles.username,
        displayName: tweetData.profiles.display_name,
        avatar: tweetData.profiles.avatar_url ?? '',
        bio: tweetData.profiles.bio ?? '',
        verified: tweetData.profiles.verified,
        followers: tweetData.profiles.followers_count,
        following: tweetData.profiles.following_count,
        country: tweetData.profiles.country ?? undefined,
        joinedDate: new Date(tweetData.profiles.created_at),
      },
      createdAt: new Date(tweetData.created_at),
      likes: tweetData.likes_count,
      retweets: tweetData.retweets_count,
      replies: tweetData.replies_count,
      views: tweetData.views_count,
      images: tweetData.image_urls || [],
      isLiked: userLikes.includes(tweetData.id),
      isRetweeted: userRetweets.includes(tweetData.id),
      isBookmarked: userBookmarks.includes(tweetData.id),
      hashtags: tweetData.hashtags,
      mentions: tweetData.mentions,
      tags: tweetData.tags || [],
      replyTo: tweetData.reply_to ?? undefined,
    };
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // Helper to aggregate and detect media (images & videos)
  const getAllMedia = (): { url: string; type: 'image' | 'video' }[] => {
    if (!tweet) return [];

    const media: { url: string; type: 'image' | 'video' }[] = [];

    const isVideoUrl = (url: string): boolean => url.toLowerCase().endsWith('.mp4');

    if (tweet.images && tweet.images.length) {
      tweet.images.forEach((rawUrl) => {
        const cleanUrl = rawUrl.startsWith('image:') ? rawUrl.slice(6) : rawUrl.startsWith('video:') ? rawUrl.slice(6) : rawUrl;
        if (!/^https?:\/\//.test(cleanUrl)) return;
        media.push({ url: cleanUrl, type: isVideoUrl(cleanUrl) ? 'video' : 'image' });
      });
    }

    // If tweet.videos or tweet.media are available in the future, include them here as well

    return media;
  };

  // Sub-component to render the media grid (desktop & mobile share logic)
  const MediaGrid: React.FC<{ mobile?: boolean }> = ({ mobile = false }) => {
    const allMedia = getAllMedia();
    if (allMedia.length === 0) return null;

    const containerClass = mobile ? 'mb-3 rounded-xl overflow-hidden' : 'mb-4 rounded-2xl overflow-hidden border border-gray-200';

    return (
      <div className={containerClass}>
        {allMedia.length === 1 ? (
          allMedia[0].type === 'image' ? (
            <LazyImage
              src={allMedia[0].url}
              alt="Tweet media"
              className={mobile ? 'w-full aspect-[16/9] object-cover' : 'w-full max-h-96 object-cover'}
              width={600}
              quality={80}
            />
          ) : (
            <VideoPlayer
              src={allMedia[0].url}
              alt="Tweet video"
              className={mobile ? 'w-full aspect-[16/9]' : 'w-full max-h-96'}
              controls={true}
              muted={true}
              loading="lazy"
            />
          )
        ) : (
          <div
            className={`grid gap-1 ${
              allMedia.length === 2
                ? 'grid-cols-2'
                : allMedia.length === 3
                ? 'grid-cols-2 grid-rows-2'
                : 'grid-cols-2'
            }`}
          >
            {allMedia.map((item, index) => (
              <div
                key={index}
                className={`${allMedia.length === 3 && index === 0 ? 'row-span-2' : ''} aspect-[16/9]`}
              >
                {item.type === 'image' ? (
                  <LazyImage
                    src={item.url}
                    alt={`Tweet media ${index + 1}`}
                    className="w-full h-full object-cover"
                    width={400}
                    quality={80}
                  />
                ) : (
                  <VideoPlayer
                    src={item.url}
                    alt={`Tweet video ${index + 1}`}
                    className="w-full h-full"
                    controls={true}
                    muted={true}
                    loading="lazy"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const fetchTweetDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch the main tweet
      const { data: tweetData, error: tweetError } = await supabase
        .from('tweets')
        .select(`
          id,
          content,
          author_id,
          reply_to,
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
            bio,
            verified,
            followers_count,
            following_count,
            country,
            created_at
          )
        `)
        .eq('id', tweetId)
        .single();

      if (tweetError) throw tweetError;

      // Get current user interactions
      let userLikes: string[] = [];
      let userRetweets: string[] = [];
      let userBookmarks: string[] = [];
      
      if (user) {
        const [likesResult, retweetsResult, bookmarksResult] = await Promise.all([
          supabase
            .from('likes')
            .select('tweet_id')
            .eq('user_id', user.id)
            .eq('tweet_id', tweetData.id),
          supabase
            .from('retweets')
            .select('tweet_id')
            .eq('user_id', user.id)
            .eq('tweet_id', tweetData.id),
          supabase
            .from('bookmarks')
            .select('tweet_id')
            .eq('user_id', user.id)
            .eq('tweet_id', tweetData.id)
        ]);
        
        userLikes = likesResult.data?.map(like => like.tweet_id) || [];
        userRetweets = retweetsResult.data?.map(retweet => retweet.tweet_id) || [];
        userBookmarks = bookmarksResult.data?.map(bookmark => bookmark.tweet_id) || [];
      }

      const formattedTweet = formatTweetData(tweetData as unknown as TweetWithProfile, userLikes, userRetweets, userBookmarks);
      setTweet(formattedTweet);

      // If this tweet is a reply, fetch the parent tweet
      if (tweetData.reply_to) {
        await fetchParentTweet(tweetData.reply_to);
      }

      // Fetch replies to this tweet
      await fetchReplies(tweetData.id);

    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching tweet detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchParentTweet = async (parentId: string) => {
    try {
      const { data: parentData, error: parentError } = await supabase
        .from('tweets')
        .select(`
          id,
          content,
          author_id,
          reply_to,
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
            bio,
            verified,
            followers_count,
            following_count,
            country,
            created_at
          )
        `)
        .eq('id', parentId)
        .single();

      if (parentError) throw parentError;

      // Get user interactions for parent tweet
      let userLikes: string[] = [];
      let userRetweets: string[] = [];
      let userBookmarks: string[] = [];
      
      if (user) {
        const [likesResult, retweetsResult, bookmarksResult] = await Promise.all([
          supabase
            .from('likes')
            .select('tweet_id')
            .eq('user_id', user.id)
            .eq('tweet_id', parentData.id),
          supabase
            .from('retweets')
            .select('tweet_id')
            .eq('user_id', user.id)
            .eq('tweet_id', parentData.id),
          supabase
            .from('bookmarks')
            .select('tweet_id')
            .eq('user_id', user.id)
            .eq('tweet_id', parentData.id)
        ]);
        
        userLikes = likesResult.data?.map(like => like.tweet_id) || [];
        userRetweets = retweetsResult.data?.map(retweet => retweet.tweet_id) || [];
        userBookmarks = bookmarksResult.data?.map(bookmark => bookmark.tweet_id) || [];
      }

      const formattedParent = formatTweetData(parentData as unknown as TweetWithProfile, userLikes, userRetweets, userBookmarks);
      setParentTweet(formattedParent);
    } catch (error) {
      console.error('Error fetching parent tweet:', error);
    }
  };

  const handleLike = async (targetTweetId: string, isCurrentlyLiked: boolean) => {
    try {
      if (isCurrentlyLiked) {
        await unlikeTweet(targetTweetId);
      } else {
        await likeTweet(targetTweetId);
      }
      
      // Update local state
      if (tweet && tweet.id === targetTweetId) {
        setTweet(prev => prev ? {
          ...prev,
          isLiked: !isCurrentlyLiked,
          likes: isCurrentlyLiked ? prev.likes - 1 : prev.likes + 1
        } : null);
      }
      
      if (parentTweet && parentTweet.id === targetTweetId) {
        setParentTweet(prev => prev ? {
          ...prev,
          isLiked: !isCurrentlyLiked,
          likes: isCurrentlyLiked ? prev.likes - 1 : prev.likes + 1
        } : null);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleRetweet = (targetTweetId: string) => {
    console.log('Retweet:', targetTweetId);
  };

  const handleBookmark = (targetTweetId: string) => {
    console.log('Bookmark:', targetTweetId);
  };

  const handleReplySuccess = async () => {
    setShowReplyComposer(false);
    if (tweet) {
      await fetchReplies(tweet.id);
      // Update reply count
      setTweet(prev => prev ? { ...prev, replies: prev.replies + 1 } : null);
    }
  };

  const handleParentTweetClick = () => {
    if (parentTweet) {
      navigate(`/tweet/${parentTweet.id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex h-screen overflow-hidden">
        {/* Desktop Layout with Conditional Sidebar */}
        <div className="hidden md:flex flex-1">
          {/* Main Content */}
          <div className={`flex-1 border-r border-gray-200 flex flex-col ${showSidebar ? '' : 'border-r-0'}`}>
            {/* Header Skeleton */}
            <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3 flex items-center z-10 flex-shrink-0">
              <div className="w-6 h-6 bg-gray-200 rounded animate-shimmer"></div>
              <div className="ml-4 h-5 bg-gray-200 rounded animate-shimmer w-16"></div>
            </div>

            {/* Content Skeleton */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                <TweetSkeleton showImages={true} />
              </div>
              <div className="border-t border-gray-200">
                <TweetSkeleton />
                <TweetSkeleton />
                <TweetSkeleton />
              </div>
            </div>
          </div>

          {/* Right Sidebar - Conditionally Rendered */}
          {showSidebar && <TrendingSidebar />}
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden w-full flex flex-col">
          {/* Header Skeleton */}
          <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3 flex items-center z-10 flex-shrink-0">
            <div className="w-6 h-6 bg-gray-200 rounded animate-shimmer"></div>
            <div className="ml-4 h-5 bg-gray-200 rounded animate-shimmer w-16"></div>
          </div>

          {/* Content Skeleton */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <TweetSkeleton showImages={true} isMobile={true} />
            </div>
            <div className="border-t border-gray-200">
              <TweetSkeleton isMobile={true} />
              <TweetSkeleton isMobile={true} />
              <TweetSkeleton isMobile={true} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !tweet) {
    return (
      <div className="min-h-screen bg-white flex h-screen overflow-hidden">
        {/* Desktop Layout with Conditional Sidebar */}
        <div className="hidden md:flex flex-1">
          {/* Main Content */}
          <div className={`flex-1 border-r border-gray-200 flex flex-col ${showSidebar ? '' : 'border-r-0'}`}>
            <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3 flex items-center z-10 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="p-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="ml-4 text-lg font-bold">Tweet</h1>
            </div>
            
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="text-center">
                <p className="text-lg font-semibold mb-2 text-gray-900">Tweet not found</p>
                <p className="text-sm text-gray-600 mb-4">{error || 'This tweet does not exist or has been deleted.'}</p>
                <Button onClick={() => navigate(-1)} variant="outline">
                  Go back
                </Button>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Conditionally Rendered */}
          {showSidebar && <TrendingSidebar />}
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden w-full flex flex-col">
          <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3 flex items-center z-10 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="ml-4 text-lg font-bold">Tweet</h1>
          </div>
          
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="text-center">
              <p className="text-lg font-semibold mb-2 text-gray-900">Tweet not found</p>
              <p className="text-sm text-gray-600 mb-4">{error || 'This tweet does not exist or has been deleted.'}</p>
              <Button onClick={() => navigate(-1)} variant="outline">
                Go back
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const tweetReplies = replies[tweet.id] || [];

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
              onClick={() => navigate(-1)}
              className="p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="ml-4 text-lg font-bold">Tweet</h1>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Parent Tweet (if this is a reply) */}
            {parentTweet && (
              <div className="border-b border-gray-200">
                <div className="p-4">
                  <div className="flex items-center space-x-2 text-gray-500 text-sm mb-3">
                    <CornerUpLeft className="w-4 h-4" />
                    <span>Replying to</span>
                    <button
                      onClick={handleParentTweetClick}
                      className="text-blue-500 hover:text-blue-600 hover:underline font-medium transition-colors"
                    >
                      @{parentTweet.author.username}
                    </button>
                  </div>
                  
                  <div 
                    className="cursor-pointer hover:bg-gray-50 rounded-lg p-3 -m-3 transition-colors"
                    onClick={handleParentTweetClick}
                  >
                    <div className="flex space-x-3">
                      <Avatar className="w-10 h-10 flex-shrink-0">
                        <AvatarImage 
                          src={parentTweet.author.avatar ? storageService.getOptimizedImageUrl(parentTweet.author.avatar, { width: 80, quality: 80 }) : undefined} 
                        />
                        <AvatarFallback>{parentTweet.author.displayName[0]}</AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-bold text-gray-900 text-sm">
                            {parentTweet.author.displayName}
                          </span>
                          <span className="text-gray-500 text-sm">
                            @{parentTweet.author.username}
                          </span>
                          <span className="text-gray-500 text-sm">·</span>
                          <span className="text-gray-500 text-sm">
                            {formatDistanceToNow(parentTweet.createdAt, { 
                              addSuffix: true, 
                              locale: language === 'ar' ? arSA : enUS 
                            })}
                          </span>
                        </div>
                        <p 
                          className="text-gray-900 text-sm line-clamp-3"
                          dir={getTextDirection(parentTweet.content)}
                          style={{ textAlign: getTextDirection(parentTweet.content) === 'rtl' ? 'right' : 'left' }}
                        >
                          {parentTweet.content}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Main Tweet - Enhanced Display */}
            <div className="border-b border-gray-200 bg-white">
              <div className="p-6">
                {/* Author Info */}
                <div className="flex items-center space-x-3 mb-4">
                  <Avatar 
                    className="w-12 h-12 cursor-pointer" 
                    onClick={() => navigate(`/profile/${tweet.author.username}`)}
                  >
                    <AvatarImage 
                      src={tweet.author.avatar ? storageService.getOptimizedImageUrl(tweet.author.avatar, { width: 96, quality: 80 }) : undefined} 
                    />
                    <AvatarFallback>{tweet.author.displayName[0]}</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span 
                        className="font-bold text-gray-900 hover:underline cursor-pointer"
                        onClick={() => navigate(`/profile/${tweet.author.username}`)}
                      >
                        {tweet.author.displayName}
                      </span>
                      {tweet.author.verified && (
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </div>
                    <span 
                      className="text-gray-500 hover:underline cursor-pointer"
                      onClick={() => navigate(`/profile/${tweet.author.username}`)}
                    >
                      @{tweet.author.username}
                    </span>
                  </div>
                </div>

                {/* Tweet Content */}
                <div 
                  className="text-gray-900 text-xl leading-relaxed mb-4"
                  dir={getTextDirection(tweet.content)}
                  style={{ textAlign: getTextDirection(tweet.content) === 'rtl' ? 'right' : 'left' }}
                >
                  {tweet.content}
                </div>

                {/* Tweet Badges */}
                <TweetBadges
                  tweetId={tweet.id}
                  tags={tweet.tags || []}
                  isAdmin={isAdmin}
                  onTagsUpdate={(newTags) => {
                    setTweet(prev => prev ? {
                      ...prev,
                      tags: newTags
                    } : null);
                  }}
                />

                {/* Media (Images & Videos) */}
                <MediaGrid />

                {/* Timestamp */}
                <div className="text-gray-500 text-sm mb-4 pb-4 border-b border-gray-100">
                  {tweet.createdAt.toLocaleString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </div>

                {/* Engagement Stats */}
                <div className="flex items-center space-x-6 text-sm text-gray-500 mb-4 pb-4 border-b border-gray-100">
                  <div>
                    <span className="font-bold text-gray-900">{tweet.retweets.toLocaleString()}</span>
                    <span className="ml-1">Retweets</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-900">{tweet.likes.toLocaleString()}</span>
                    <span className="ml-1">Likes</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-900">{formatNumber(tweet.views)}</span>
                    <span className="ml-1">Views</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-around py-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-gray-500 hover:text-blue-500 hover:bg-blue-50 p-3 flex items-center"
                    onClick={() => setShowReplyComposer(!showReplyComposer)}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </Button>

                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`p-3 flex items-center ${
                      tweet.isRetweeted 
                        ? 'text-green-500 hover:text-green-600 hover:bg-green-50' 
                        : 'text-gray-500 hover:text-green-500 hover:bg-green-50'
                    }`}
                    onClick={() => handleRetweet(tweet.id)}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </Button>

                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`p-3 flex items-center ${
                      tweet.isLiked 
                        ? 'text-red-500 hover:text-red-600 hover:bg-red-50' 
                        : 'text-gray-500 hover:text-red-500 hover:bg-red-50'
                    }`}
                    onClick={() => handleLike(tweet.id, tweet.isLiked)}
                  >
                    <svg className={`w-5 h-5 ${tweet.isLiked ? 'fill-current' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </Button>

                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`p-3 flex items-center ${
                      tweet.isBookmarked 
                        ? 'text-blue-500 hover:text-blue-600 hover:bg-blue-50' 
                        : 'text-gray-500 hover:text-blue-500 hover:bg-blue-50'
                    }`}
                    onClick={() => handleBookmark(tweet.id)}
                  >
                    <svg className={`w-5 h-5 ${tweet.isBookmarked ? 'fill-current' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  </Button>

                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-gray-500 hover:text-blue-500 hover:bg-blue-50 p-3"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                    </svg>
                  </Button>
                </div>
              </div>

              {/* Reply Composer */}
              {showReplyComposer && (
                <ReplyComposer
                  tweet={tweet}
                  onCancel={() => setShowReplyComposer(false)}
                  onReplySuccess={handleReplySuccess}
                />
              )}
            </div>

            {/* Replies */}
            <div className="pb-20 md:pb-0">
              {tweetReplies.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg">No replies yet</p>
                  <p className="text-sm mt-2">Be the first to reply!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {tweetReplies.map((reply) => (
                    <div key={reply.id} className="hover:bg-gray-50 transition-colors">
                      <TweetCard 
                        tweet={reply} 
                        onLike={() => handleLike(reply.id, reply.isLiked)}
                        onRetweet={() => handleRetweet(reply.id)}
                        onBookmark={() => handleBookmark(reply.id)}
                        currentUserId={user?.id}
                        isReply={true}
                        parentTweetId={tweet.id}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Conditionally Rendered */}
        {showSidebar && <TrendingSidebar />}
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden w-full flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3 flex items-center z-10 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="ml-4 text-lg font-bold">Tweet</h1>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Parent Tweet (if this is a reply) */}
          {parentTweet && (
            <div className="border-b border-gray-200">
              <div className="p-4">
                <div className="flex items-center space-x-2 text-gray-500 text-xs mb-3">
                  <CornerUpLeft className="w-3 h-3" />
                  <span>Replying to</span>
                  <button
                    onClick={handleParentTweetClick}
                    className="text-blue-500 hover:text-blue-600 hover:underline font-medium transition-colors"
                  >
                    @{parentTweet.author.username}
                  </button>
                </div>
                
                <div 
                  className="cursor-pointer hover:bg-gray-50 rounded-lg p-3 -m-3 transition-colors"
                  onClick={handleParentTweetClick}
                >
                  <div className="flex space-x-2">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage 
                        src={parentTweet.author.avatar ? storageService.getOptimizedImageUrl(parentTweet.author.avatar, { width: 64, quality: 80 }) : undefined} 
                      />
                      <AvatarFallback className="text-xs">{parentTweet.author.displayName[0]}</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1 mb-1">
                        <span className="font-bold text-gray-900 text-xs">
                          {parentTweet.author.displayName}
                        </span>
                        <span className="text-gray-500 text-xs">
                          @{parentTweet.author.username}
                        </span>
                        <span className="text-gray-500 text-xs">·</span>
                        <span className="text-gray-500 text-xs">
                          {formatDistanceToNow(parentTweet.createdAt, { 
                            addSuffix: true, 
                            locale: language === 'ar' ? arSA : enUS 
                          }).replace(language === 'ar' ? 'منذ حوالي ' : 'about ', '')}
                        </span>
                      </div>
                      <p className="text-gray-900 text-xs line-clamp-2">
                        {parentTweet.content}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Tweet - Enhanced Mobile Display */}
          <div className="border-b border-gray-200 bg-white">
            <div className="p-4">
              {/* Author Info */}
              <div className="flex items-center space-x-3 mb-3">
                <Avatar 
                  className="w-10 h-10 cursor-pointer" 
                  onClick={() => navigate(`/profile/${tweet.author.username}`)}
                >
                  <AvatarImage 
                    src={tweet.author.avatar ? storageService.getOptimizedImageUrl(tweet.author.avatar, { width: 80, quality: 80 }) : undefined} 
                  />
                  <AvatarFallback>{tweet.author.displayName[0]}</AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span 
                      className="font-bold text-gray-900 hover:underline cursor-pointer text-sm"
                      onClick={() => navigate(`/profile/${tweet.author.username}`)}
                    >
                      {tweet.author.displayName}
                    </span>
                    {tweet.author.verified && (
                      <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                  <span 
                    className="text-gray-500 hover:underline cursor-pointer text-sm"
                    onClick={() => navigate(`/profile/${tweet.author.username}`)}
                  >
                    @{tweet.author.username}
                  </span>
                </div>
              </div>

              {/* Tweet Content */}
              <div 
                className="text-gray-900 text-lg leading-relaxed mb-3"
                dir={getTextDirection(tweet.content)}
                style={{ textAlign: getTextDirection(tweet.content) === 'rtl' ? 'right' : 'left' }}
              >
                {tweet.content}
              </div>

              {/* Tweet Badges */}
              <TweetBadges
                tweetId={tweet.id}
                tags={tweet.tags || []}
                isAdmin={isAdmin}
                onTagsUpdate={(newTags) => {
                  setTweet(prev => prev ? {
                    ...prev,
                    tags: newTags
                  } : null);
                }}
              />

              {/* Media (Images & Videos) */}
              <MediaGrid mobile />

              {/* Timestamp */}
              <div className="text-gray-500 text-sm mb-3 pb-3 border-b border-gray-100">
                {tweet.createdAt.toLocaleString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </div>

              {/* Engagement Stats */}
              <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3 pb-3 border-b border-gray-100">
                <div>
                  <span className="font-bold text-gray-900">{tweet.retweets.toLocaleString()}</span>
                  <span className="ml-1">Retweets</span>
                </div>
                <div>
                  <span className="font-bold text-gray-900">{tweet.likes.toLocaleString()}</span>
                  <span className="ml-1">Likes</span>
                </div>
                <div>
                  <span className="font-bold text-gray-900">{formatNumber(tweet.views)}</span>
                  <span className="ml-1">Views</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-around py-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-gray-500 hover:text-blue-500 hover:bg-blue-50 p-2 flex items-center"
                  onClick={() => setShowReplyComposer(!showReplyComposer)}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </Button>

                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`p-2 flex items-center ${
                    tweet.isRetweeted 
                      ? 'text-green-500 hover:text-green-600 hover:bg-green-50' 
                      : 'text-gray-500 hover:text-green-500 hover:bg-green-50'
                  }`}
                  onClick={() => handleRetweet(tweet.id)}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </Button>

                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`p-2 flex items-center ${
                    tweet.isLiked 
                      ? 'text-red-500 hover:text-red-600 hover:bg-red-50' 
                      : 'text-gray-500 hover:text-red-500 hover:bg-red-50'
                  }`}
                  onClick={() => handleLike(tweet.id, tweet.isLiked)}
                >
                  <svg className={`w-5 h-5 ${tweet.isLiked ? 'fill-current' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </Button>

                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`p-2 flex items-center ${
                    tweet.isBookmarked 
                      ? 'text-blue-500 hover:text-blue-600 hover:bg-blue-50' 
                      : 'text-gray-500 hover:text-blue-500 hover:bg-blue-50'
                  }`}
                  onClick={() => handleBookmark(tweet.id)}
                >
                  <svg className={`w-5 h-5 ${tweet.isBookmarked ? 'fill-current' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </Button>

                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-gray-500 hover:text-blue-500 hover:bg-blue-50 p-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                </Button>
              </div>
            </div>

            {/* Reply Composer */}
            {showReplyComposer && (
              <ReplyComposer
                tweet={tweet}
                onCancel={() => setShowReplyComposer(false)}
                onReplySuccess={handleReplySuccess}
              />
            )}
          </div>

          {/* Replies */}
          <div className="pb-20">
            {tweetReplies.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg">No replies yet</p>
                <p className="text-sm mt-2">Be the first to reply!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {tweetReplies.map((reply) => (
                  <div key={reply.id}>
                    <MobileTweetCard 
                      tweet={reply}
                      onLike={() => handleLike(reply.id, reply.isLiked)}
                      onRetweet={() => handleRetweet(reply.id)}
                      onBookmark={() => handleBookmark(reply.id)}
                      currentUserId={user?.id}
                      isReply={true}
                      parentTweetId={tweet.id}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};