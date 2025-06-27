import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TweetCard } from '../Tweet/TweetCard';
import { MobileTweetCard } from '../Tweet/MobileTweetCard';
import { TweetSkeletonList } from '../Tweet/TweetSkeleton';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useLazyTweets } from '../../hooks/useLazyTweets';
import { useAuth } from '../../hooks/useAuth';
import { useTweets } from '../../hooks/useTweets';
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
  
  // Use different hooks based on feed type
  const forYouFeed = useLazyTweets({
    pageSize: 10,
    initialLoad: feedType === 'for-you',
  });
  
  const followingFeed = useLazyTweets({
    pageSize: 10,
    initialLoad: feedType === 'following',
    followingOnly: true,
  });

  // Get the appropriate feed data based on active tab
  const currentFeed = feedType === 'for-you' ? forYouFeed : followingFeed;
  const { tweets, loading, hasMore, error, loadMore } = currentFeed;

  const loadMoreRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

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
        tweet.author.country === countryFilter
      );
    }

    setFilteredTweets(filtered);
  }, [tweets, categoryFilter, countryFilter]);

  // Set up intersection observer for infinite scroll
  const setupObserver = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px', // Start loading 100px before reaching the bottom
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

      {/* Tweets */}
      {filteredTweets.map((tweet, index) => {
        return (
          <div key={`${tweet.id}-${tweet.retweetedAt || tweet.createdAt}-${index}`} className={`w-full ${isMobile ? 'border-b border-gray-100' : ''}`}>
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