import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TweetCard } from '../Tweet/TweetCard';
import { MobileTweetCard } from '../Tweet/MobileTweetCard';
import { TweetSkeletonList } from '../Tweet/TweetSkeleton';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useLazyTweets } from '../../hooks/useLazyTweets';
import { useAuth } from '../../hooks/useAuth';
import { useTweets } from '../../hooks/useTweets';
import { supabase } from '../../lib/supabase';
import { Tweet } from '../../types';
import { feedCache, cacheKeys } from '../../lib/cache';

interface InfiniteScrollTweetsProps {
  isMobile?: boolean;
  feedType: 'for-you' | 'following';
  categoryFilter: string | null;
  countryFilter: string;
}

export const InfiniteScrollTweets: React.FC<InfiniteScrollTweetsProps> = React.memo(({
  isMobile = false,
  feedType,
  categoryFilter,
  countryFilter,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { likeTweet, unlikeTweet, retweetTweet, unretweetTweet, bookmarkTweet, unbookmarkTweet } = useTweets();
  const [filteredTweets, setFilteredTweets] = useState<Tweet[]>([]);
  const [pinnedTweets, setPinnedTweets] = useState<Tweet[]>([]);
  const [loadingPinned, setLoadingPinned] = useState(false);
  const [pinnedTweetsKey, setPinnedTweetsKey] = useState(0); // Force refresh key
  
  // Use different hooks based on feed type with optimized page sizes
  const forYouFeed = useLazyTweets({
    pageSize: 20, // Subsequent loads
    initialPageSize: 50, // Initial load
    initialLoad: feedType === 'for-you',
  });
  
  const followingFeed = useLazyTweets({
    pageSize: 20, // Subsequent loads  
    initialPageSize: 50, // Initial load
    initialLoad: feedType === 'following',
    followingOnly: true,
  });

  // Get the appropriate feed data based on active tab
  const currentFeed = feedType === 'for-you' ? forYouFeed : followingFeed;
  const { tweets, loading, hasMore, error, loadMore } = currentFeed;

  const loadMoreRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Load pinned tweets for home timeline with caching
  const loadPinnedTweets = useCallback(async () => {
    if (feedType !== 'for-you') return; // Only show pinned tweets on "For You" tab
    
    try {
      setLoadingPinned(true);
      
      // Check cache first
      const cacheKey = 'pinned_tweets:home';
      const cachedPinned = feedCache.get<Tweet[]>(cacheKey);
      
      if (cachedPinned) {
        console.log('⚡ Using cached pinned tweets:', cachedPinned.length);
        setPinnedTweets(cachedPinned);
        setLoadingPinned(false);
        return;
      }
      
      console.log('🔄 Loading pinned tweets...');
      
      const { data, error } = await supabase
        .from('tweets')
        .select(`
          id,
          content,
          author_id,
          image_urls,
          hashtags,
          mentions,
          tags,
          likes_count,
          retweets_count,
          replies_count,
          views_count,
          created_at,
          pinned_to_home,
          pinned_to_profile,
          pinned_at,
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
        .eq('pinned_to_home', true)
        .order('pinned_at', { ascending: false })
        .limit(5); // Limit to 5 pinned tweets max

      if (error) throw error;

      console.log('✅ Pinned tweets loaded:', data.length);

      // Get current user interactions for pinned tweets
      let userLikes: string[] = [];
      let userRetweets: string[] = [];
      let userBookmarks: string[] = [];
      
      if (user && data.length > 0) {
        const tweetIds = data.map(tweet => tweet.id);
        const [likesResult, retweetsResult, bookmarksResult] = await Promise.all([
          supabase.from('likes').select('tweet_id').eq('user_id', user.id).in('tweet_id', tweetIds),
          supabase.from('retweets').select('tweet_id').eq('user_id', user.id).in('tweet_id', tweetIds),
          supabase.from('bookmarks').select('tweet_id').eq('user_id', user.id).in('tweet_id', tweetIds)
        ]);
        
        userLikes = likesResult.data?.map(like => like.tweet_id) || [];
        userRetweets = retweetsResult.data?.map(retweet => retweet.tweet_id) || [];
        userBookmarks = bookmarksResult.data?.map(bookmark => bookmark.tweet_id) || [];
      }

      // Format pinned tweets
      const formattedPinnedTweets: Tweet[] = data.map(tweetData => {
        const profile = Array.isArray(tweetData.profiles) ? tweetData.profiles[0] : tweetData.profiles;
        
        return {
          id: tweetData.id,
          content: tweetData.content,
          author: {
            id: profile.id,
            username: profile.username,
            displayName: profile.display_name || profile.username,
            avatar: profile.avatar_url || '',
            bio: profile.bio || '',
            verified: profile.verified || false,
            followers: profile.followers_count || 0,
            following: profile.following_count || 0,
            country: profile.country || 'US',
            joinedDate: new Date(profile.created_at),
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
          pinnedToHome: tweetData.pinned_to_home || false,
          pinnedToProfile: tweetData.pinned_to_profile || false,
          pinnedAt: tweetData.pinned_at ? new Date(tweetData.pinned_at) : undefined,
        };
      });

      // Cache the pinned tweets
      feedCache.set(cacheKey, formattedPinnedTweets, 5 * 60 * 1000); // Cache for 5 minutes

      setPinnedTweets(formattedPinnedTweets);
    } catch (error) {
      console.error('Error loading pinned tweets:', error);
    } finally {
      setLoadingPinned(false);
    }
  }, [feedType, user, pinnedTweetsKey]);

  // Load pinned tweets when component mounts or feed type changes
  useEffect(() => {
    loadPinnedTweets();
  }, [loadPinnedTweets]);

  // Function to refresh pinned tweets (can be called from child components)
  const refreshPinnedTweets = useCallback(() => {
    console.log('🔄 Refreshing pinned tweets...');
    setPinnedTweetsKey(prev => prev + 1);
  }, []);

  // Memoized filtered tweets to prevent unnecessary re-computations
  const filteredTweetsData = useMemo(() => {
    let filtered = [...tweets];

    // Filter by category
    if (categoryFilter) {
      filtered = filtered.filter(tweet => 
        tweet.tags && tweet.tags.includes(categoryFilter)
      );
    }

    // Filter by country
    if (countryFilter && countryFilter !== 'ALL') {
      filtered = filtered.filter(tweet => 
        tweet.tags && tweet.tags.includes(countryFilter)
      );
    }

    return filtered;
  }, [tweets, categoryFilter, countryFilter]);

  // Update state when filtered data changes
  useEffect(() => {
    setFilteredTweets(filteredTweetsData);
  }, [filteredTweetsData]);

  // Set up intersection observer for infinite scroll with preloading
  const setupObserver = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasMore && !loading) {
          console.log('🔄 Loading more tweets via scroll...');
          loadMore();
        }
      },
      {
        rootMargin: '400px', // Preload when 400px from bottom
        threshold: 0.1,
      }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }
  }, [hasMore, loading, loadMore]);

  useEffect(() => {
    setupObserver();
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [setupObserver]);

  // Enhanced interaction handlers with optimistic updates and memoization
  const handleLike = useCallback(async (tweetId: string, isCurrentlyLiked: boolean) => {
    try {
      console.log(`${isCurrentlyLiked ? '💔' : '❤️'} ${isCurrentlyLiked ? 'Unliking' : 'Liking'} tweet:`, tweetId);
      
      if (isCurrentlyLiked) {
        await unlikeTweet(tweetId);
      } else {
        await likeTweet(tweetId);
      }
    } catch (error) {
      console.error('Error handling like:', error);
    }
  }, [likeTweet, unlikeTweet]);

  const handleRetweet = useCallback(async (tweetId: string, isCurrentlyRetweeted: boolean) => {
    try {
      console.log(`${isCurrentlyRetweeted ? '↩️' : '🔁'} ${isCurrentlyRetweeted ? 'Unretweeting' : 'Retweeting'} tweet:`, tweetId);
      
      if (isCurrentlyRetweeted) {
        await unretweetTweet(tweetId);
      } else {
        await retweetTweet(tweetId);
      }
    } catch (error) {
      console.error('Error handling retweet:', error);
    }
  }, [retweetTweet, unretweetTweet]);

  const handleBookmark = useCallback(async (tweetId: string, isCurrentlyBookmarked: boolean) => {
    try {
      console.log(`${isCurrentlyBookmarked ? '🔖' : '📌'} ${isCurrentlyBookmarked ? 'Unbookmarking' : 'Bookmarking'} tweet:`, tweetId);
      
      if (isCurrentlyBookmarked) {
        await unbookmarkTweet(tweetId);
      } else {
        await bookmarkTweet(tweetId);
      }
    } catch (error) {
      console.error('Error handling bookmark:', error);
    }
  }, [bookmarkTweet, unbookmarkTweet]);

  const handleCompose = useCallback(() => {
    navigate('/compose');
  }, [navigate]);

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-500 mb-4">
          <p className="text-lg font-semibold">Failed to load tweets</p>
          <p className="text-sm">{error}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  // Show loading state for initial load
  if (loading && filteredTweets.length === 0 && pinnedTweets.length === 0) {
    return <TweetSkeletonList count={10} isMobile={isMobile} />;
  }

  const TweetComponent = isMobile ? MobileTweetCard : TweetCard;
  const showFilters = categoryFilter || (countryFilter && countryFilter !== 'ALL');

  return (
    <div className="w-full">
      {/* Pinned Tweets Section - Only show on "For You" tab without filters */}
      {feedType === 'for-you' && !showFilters && (
        <>
          {loadingPinned && pinnedTweets.length === 0 && (
            <div className="p-4 text-center">
              <LoadingSpinner size="sm" />
              <p className="text-sm text-gray-500 mt-2">Loading pinned tweets...</p>
            </div>
          )}
          
          {pinnedTweets.map((tweet) => (
            <div key={`pinned-${tweet.id}`}>
              <TweetComponent
                tweet={tweet}
                onLike={() => handleLike(tweet.id, tweet.isLiked)}
                onRetweet={() => handleRetweet(tweet.id, tweet.isRetweeted)}
                onBookmark={() => handleBookmark(tweet.id, tweet.isBookmarked)}
                currentUserId={user?.id}
                onPinStatusChange={refreshPinnedTweets} // Pass refresh function
              />
            </div>
          ))}
          
          {/* Divider between pinned and regular tweets */}
          {pinnedTweets.length > 0 && (
            <div className="border-t-8 border-gray-100 my-2" />
          )}
        </>
      )}

      {/* Regular Tweets */}
      {filteredTweets.map((tweet) => (
        <div key={tweet.id}>
          <TweetComponent
            tweet={tweet}
            onLike={() => handleLike(tweet.id, tweet.isLiked)}
            onRetweet={() => handleRetweet(tweet.id, tweet.isRetweeted)}
            onBookmark={() => handleBookmark(tweet.id, tweet.isBookmarked)}
            currentUserId={user?.id}
            onPinStatusChange={refreshPinnedTweets} // Pass refresh function
          />
        </div>
      ))}

      {/* Loading indicator for infinite scroll */}
      {loading && filteredTweets.length > 0 && (
        <div className="p-4 text-center">
          <LoadingSpinner size="sm" />
        </div>
      )}

      {/* Load more trigger */}
      <div ref={loadMoreRef} className="h-4" />

      {/* No more tweets message */}
      {!hasMore && filteredTweets.length > 0 && (
        <div className="p-8 text-center text-gray-500">
          <p>You've reached the end!</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredTweets.length === 0 && pinnedTweets.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          <p className="text-lg mb-2">No tweets found</p>
          <p className="text-sm">
            {showFilters 
              ? 'Try adjusting your filters or check back later.'
              : 'Be the first to share something!'}
          </p>
          {!showFilters && (
            <button
              onClick={handleCompose}
              className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
            >
              Compose Tweet
            </button>
          )}
        </div>
      )}
    </div>
  );
});