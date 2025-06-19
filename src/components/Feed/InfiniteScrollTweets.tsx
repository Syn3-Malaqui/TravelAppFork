import React, { useEffect, useRef, useCallback } from 'react';
import { TweetCard } from '../Tweet/TweetCard';
import { MobileTweetCard } from '../Tweet/MobileTweetCard';
import { TweetSkeletonList } from '../Tweet/TweetSkeleton';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useLazyTweets } from '../../hooks/useLazyTweets';
import { useAuth } from '../../hooks/useAuth';
import { useTweets } from '../../hooks/useTweets';

interface InfiniteScrollTweetsProps {
  isMobile?: boolean;
}

export const InfiniteScrollTweets: React.FC<InfiniteScrollTweetsProps> = ({
  isMobile = false,
}) => {
  const { user } = useAuth();
  const { likeTweet, unlikeTweet } = useTweets();
  const { tweets, loading, hasMore, error, loadMore } = useLazyTweets({
    pageSize: 10,
    initialLoad: true,
  });

  const loadMoreRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

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

  const handleLike = async (tweetId: string, isCurrentlyLiked: boolean) => {
    try {
      if (isCurrentlyLiked) {
        await unlikeTweet(tweetId);
      } else {
        await likeTweet(tweetId);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleRetweet = (tweetId: string) => {
    console.log('Retweet:', tweetId);
  };

  const handleBookmark = (tweetId: string) => {
    console.log('Bookmark:', tweetId);
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

  return (
    <div className="flex flex-col">
      {/* Initial loading state */}
      {tweets.length === 0 && loading && (
        <TweetSkeletonList count={5} isMobile={isMobile} />
      )}

      {/* Tweets */}
      {tweets.map((tweet, index) => (
        <div key={`${tweet.id}-${tweet.retweetedAt || tweet.createdAt}-${index}`} className="w-full">
          {isMobile ? (
            <MobileTweetCard 
              tweet={tweet}
              onLike={() => handleLike(tweet.id, tweet.isLiked)}
              onRetweet={() => handleRetweet(tweet.id)}
              onBookmark={() => handleBookmark(tweet.id)}
              currentUserId={user?.id}
            />
          ) : (
            <TweetCard 
              tweet={tweet} 
              onLike={() => handleLike(tweet.id, tweet.isLiked)}
              onRetweet={() => handleRetweet(tweet.id)}
              onBookmark={() => handleBookmark(tweet.id)}
              currentUserId={user?.id}
            />
          )}
        </div>
      ))}

      {/* Load more trigger */}
      <div ref={loadMoreRef} className="w-full">
        {loading && tweets.length > 0 && (
          <div className="py-8">
            <LoadingSpinner size="md" text="Loading more tweets..." />
          </div>
        )}
      </div>

      {/* End of content */}
      {!hasMore && tweets.length > 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">You've reached the end!</p>
        </div>
      )}

      {/* Empty state */}
      {tweets.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-4">No tweets yet!</p>
          <p className="text-sm text-gray-400 mb-4">Be the first to share something.</p>
        </div>
      )}
    </div>
  );
};