import React, { useEffect, useRef, useCallback, useState } from 'react';
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

interface InfiniteScrollTweetsProps {
  isMobile?: boolean;
  feedType: 'for-you' | 'following';
  categoryFilter: string | null;
  countryFilter: string;
}

export const InfiniteScrollTweets: React.FC<InfiniteScrollTweetsProps> = ({
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

  // Load pinned tweets for home timeline
  const loadPinnedTweets = useCallback(async () => {
    if (feedType !== 'for-you') return; // Only show pinned tweets on "For You" tab
    
    try {
      setLoadingPinned(true);
      
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

      setPinnedTweets(formattedPinnedTweets);
    } catch (error) {
      console.error('Error loading pinned tweets:', error);
    } finally {
      setLoadingPinned(false);
    }
  }, [feedType, user]);

  // Load pinned tweets when component mounts or feed type changes
  useEffect(() => {
    loadPinnedTweets();
  }, [loadPinnedTweets]);

  // Apply filters to tweets
  useEffect(() => {
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

    setFilteredTweets(filtered);
  }, [tweets, categoryFilter, countryFilter]);

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
        threshold: 0.1,
        rootMargin: '300px', // Start loading 300px before reaching the bottom for better UX
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

  // Reset feed when switching tabs
  useEffect(() => {
    if (feedType === 'for-you') {
      followingFeed.reset();
    } else {
      forYouFeed.reset();
    }
  }, [feedType, forYouFeed.reset, followingFeed.reset]);

  const handleLike = async (tweetId: string, isCurrentlyLiked: boolean) => {
    try {
      if (isCurrentlyLiked) {
        await unlikeTweet(tweetId);
      } else {
        await likeTweet(tweetId);
      }
      
      // Update local state to reflect the change
      setFilteredTweets(prev => 
        prev.map(tweet => 
          tweet.id === tweetId 
            ? { 
                ...tweet, 
                isLiked: !isCurrentlyLiked,
                likes: isCurrentlyLiked ? tweet.likes - 1 : tweet.likes + 1
              }
            : tweet
        )
      );
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleRetweet = async (tweetId: string, isCurrentlyRetweeted: boolean) => {
    try {
      if (isCurrentlyRetweeted) {
        await unretweetTweet(tweetId);
      } else {
        await retweetTweet(tweetId);
      }
      
      // Update local state to reflect the change
      setFilteredTweets(prev => 
        prev.map(tweet => 
          tweet.id === tweetId 
            ? { 
                ...tweet, 
                isRetweeted: !isCurrentlyRetweeted,
                retweets: isCurrentlyRetweeted ? tweet.retweets - 1 : tweet.retweets + 1
              }
            : tweet
        )
      );
    } catch (error) {
      console.error('Error toggling retweet:', error);
    }
  };

  const handleBookmark = async (tweetId: string, isCurrentlyBookmarked: boolean) => {
    try {
      if (isCurrentlyBookmarked) {
        await unbookmarkTweet(tweetId);
      } else {
        await bookmarkTweet(tweetId);
      }
      
      // Update local state to reflect the change
      setFilteredTweets(prev => 
        prev.map(tweet => 
          tweet.id === tweetId 
            ? { ...tweet, isBookmarked: !isCurrentlyBookmarked }
            : tweet
        )
      );
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  const handleCompose = () => {
    navigate('/compose');
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="text-red-500 text-center">
          <p className="text-lg font-semibold mb-2">Error loading tweets</p>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // Empty state with appropriate messaging based on filters and feed type
  if (filteredTweets.length === 0 && !loading) {
    return (
      <div className="w-full text-center py-12 text-gray-500">
        {feedType === 'following' && tweets.length === 0 ? (
          <>
            <p className="text-lg mb-4">No tweets from people you follow yet!</p>
            <p className="text-sm text-gray-400 mb-4">Follow some accounts to see their tweets here.</p>
            <button 
              onClick={() => navigate('/search')}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-full font-medium transition-colors"
            >
              Find people to follow
            </button>
          </>
        ) : categoryFilter || countryFilter !== 'ALL' ? (
          <>
            <p className="text-lg">No tweets found with the selected filters.</p>
            <div className="mt-4 space-x-2">
              <button 
                onClick={() => navigate('/')}
                className="text-blue-500 hover:text-blue-700 underline"
              >
                Clear filters
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-lg mb-4">No tweets yet!</p>
            <p className="text-sm text-gray-400 mb-4">Be the first to share something.</p>
            <button 
              onClick={handleCompose}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-full font-medium transition-colors"
            >
              Create your first tweet
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Initial loading state */}
      {filteredTweets.length === 0 && loading && (
        <TweetSkeletonList count={5} isMobile={isMobile} />
      )}

      {/* Pinned Tweets - Only show on "For You" tab and when not filtered */}
      {feedType === 'for-you' && pinnedTweets.length > 0 && !categoryFilter && countryFilter === 'ALL' && (
        <>
          {pinnedTweets.map((tweet, index) => (
            <div key={`pinned-${tweet.id}-${index}`} className="w-full">
              {isMobile ? (
                <MobileTweetCard 
                  tweet={tweet}
                  onLike={() => handleLike(tweet.id, tweet.isLiked)}
                  onRetweet={() => handleRetweet(tweet.id, tweet.isRetweeted)}
                  onBookmark={() => handleBookmark(tweet.id, tweet.isBookmarked)}
                  currentUserId={user?.id}
                />
              ) : (
                <TweetCard 
                  tweet={tweet} 
                  onLike={() => handleLike(tweet.id, tweet.isLiked)}
                  onRetweet={() => handleRetweet(tweet.id, tweet.isRetweeted)}
                  onBookmark={() => handleBookmark(tweet.id, tweet.isBookmarked)}
                  currentUserId={user?.id}
                />
              )}
            </div>
          ))}
          
          {/* Divider between pinned and regular tweets */}
          {filteredTweets.length > 0 && (
            <div className="border-b border-gray-200 my-2" />
          )}
        </>
      )}

      {/* Regular Tweets */}
      {filteredTweets.map((tweet, index) => {
        return (
          <div key={`${tweet.id}-${tweet.retweetedAt || tweet.createdAt}-${index}`} className="w-full">
            {isMobile ? (
              <MobileTweetCard 
                tweet={tweet}
                onLike={() => handleLike(tweet.id, tweet.isLiked)}
                onRetweet={() => handleRetweet(tweet.id, tweet.isRetweeted)}
                onBookmark={() => handleBookmark(tweet.id, tweet.isBookmarked)}
                currentUserId={user?.id}
              />
            ) : (
              <TweetCard 
                tweet={tweet} 
                onLike={() => handleLike(tweet.id, tweet.isLiked)}
                onRetweet={() => handleRetweet(tweet.id, tweet.isRetweeted)}
                onBookmark={() => handleBookmark(tweet.id, tweet.isBookmarked)}
                currentUserId={user?.id}
              />
            )}
          </div>
        );
      })}

      {/* Load more trigger */}
      <div ref={loadMoreRef} className="w-full">
        {loading && filteredTweets.length > 0 && (
          <div className="py-8">
            <LoadingSpinner size="md" text="Loading more tweets..." />
          </div>
        )}
      </div>

      {/* End of content */}
      {!hasMore && filteredTweets.length > 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">You've reached the end!</p>
        </div>
      )}
    </div>
  );
};