import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Hash, TrendingUp, Clock, BarChart3, Share, Bookmark } from 'lucide-react';
import { Button } from './ui/button';
import { TweetCard } from './Tweet/TweetCard';
import { MobileTweetCard } from './Tweet/MobileTweetCard';
import { TweetSkeletonList } from './Tweet/TweetSkeleton';
import { useHashtags } from '../hooks/useHashtags';
import { useAuth } from '../hooks/useAuth';
import { useTweets } from '../hooks/useTweets';

export const HashtagPage: React.FC = () => {
  const { hashtag } = useParams<{ hashtag: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { hashtagTweets, loading, error, searchHashtagTweets, trendingHashtags } = useHashtags();
  const { likeTweet, unlikeTweet, retweetTweet, unretweetTweet, bookmarkTweet, unbookmarkTweet } = useTweets();
  const [sortBy, setSortBy] = useState<'recent' | 'top'>('recent');
  const [isMounted, setIsMounted] = useState(false);

  // Clean hashtag from URL parameters
  const cleanHashtag = hashtag ? decodeURIComponent(hashtag.replace(/^#/, '')) : '';

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    if (isMounted && cleanHashtag) {
      console.log('HashtagPage: Searching for hashtag:', cleanHashtag);
      searchHashtagTweets(cleanHashtag, sortBy);
    }
  }, [cleanHashtag, sortBy, searchHashtagTweets, isMounted]);

  const handleLike = async (tweetId: string, isCurrentlyLiked: boolean) => {
    try {
      if (isCurrentlyLiked) {
        await unlikeTweet(tweetId);
      } else {
        await likeTweet(tweetId);
      }
      // Refresh hashtag tweets to update like counts
      if (cleanHashtag) {
        searchHashtagTweets(cleanHashtag, sortBy);
      }
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
      // Refresh hashtag tweets to update retweet counts
      if (cleanHashtag) {
        searchHashtagTweets(cleanHashtag, sortBy);
      }
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
      // Refresh hashtag tweets to update bookmark status
      if (cleanHashtag) {
        searchHashtagTweets(cleanHashtag, sortBy);
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  const handleShare = () => {
    if (navigator.share && cleanHashtag) {
      navigator.share({
        title: `#${cleanHashtag} on travelTwitter`,
        text: `Check out posts about #${cleanHashtag}`,
        url: window.location.href,
      }).catch(err => {
        console.error('Error sharing:', err);
        // Fallback to copy to clipboard
        navigator.clipboard.writeText(window.location.href)
          .then(() => alert('Link copied to clipboard!'))
          .catch(err => console.error('Failed to copy:', err));
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href)
        .then(() => alert('Link copied to clipboard!'))
        .catch(err => console.error('Failed to copy:', err));
    }
  };

  if (!cleanHashtag) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">Invalid hashtag</p>
      </div>
    );
  }

  const displayHashtag = `#${cleanHashtag}`;
  
  // Get hashtag stats from trending data
  const hashtagStats = trendingHashtags.find(item => 
    item.hashtag.toLowerCase() === displayHashtag.toLowerCase()
  );

  const totalPosts = hashtagStats?.count || hashtagTweets.length;
  const recentPosts = hashtagStats?.recent_tweets || 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-gray-200 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Hash className="h-4 w-4 text-blue-500" />
                </div>
                <h1 className="text-xl font-bold">{displayHashtag}</h1>
                {hashtagStats && (
                  <div className="flex items-center space-x-1 text-blue-500">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm font-medium">Trending</span>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                <span>
                  {totalPosts.toLocaleString()} {totalPosts === 1 ? 'post' : 'posts'}
                </span>
                {recentPosts > 0 && (
                  <span className="text-blue-500">
                    • {recentPosts} recent
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="p-2 hover:bg-gray-100"
              title="Share hashtag"
            >
              <Share className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Sort Tabs */}
        <div className="flex border-b border-gray-200">
          <Button
            variant="ghost"
            onClick={() => setSortBy('recent')}
            className={`flex-1 py-4 px-4 font-bold text-base rounded-none border-b-2 transition-colors ${
              sortBy === 'recent'
                ? 'border-blue-500 text-black'
                : 'border-transparent text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Clock className="w-4 h-4 mr-2" />
            Recent
          </Button>
          <Button
            variant="ghost"
            onClick={() => setSortBy('top')}
            className={`flex-1 py-4 px-4 font-bold text-base rounded-none border-b-2 transition-colors ${
              sortBy === 'top'
                ? 'border-blue-500 text-black'
                : 'border-transparent text-gray-500 hover:bg-gray-50'
            }`}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Top
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="pb-20 md:pb-0">
        {loading ? (
          <div>
            {/* Sort indicator skeleton */}
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
              <div className="h-4 bg-gray-200 rounded animate-shimmer w-64"></div>
            </div>
            
            {/* Tweet skeletons */}
            <TweetSkeletonList count={6} isMobile={window.innerWidth < 768} />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="text-red-500 text-center">
              <p className="text-lg font-semibold mb-2">Error loading posts</p>
              <p className="text-sm text-gray-600">{error}</p>
              <Button
                variant="outline"
                onClick={() => cleanHashtag && searchHashtagTweets(cleanHashtag, sortBy)}
                className="mt-4"
              >
                Try again
              </Button>
            </div>
          </div>
        ) : hashtagTweets.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Hash className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-lg mb-2">No posts found for {displayHashtag}</p>
            <p className="text-sm text-gray-400 mb-4">
              Be the first to post with this hashtag!
            </p>
            <Button
              onClick={() => navigate('/compose')}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-full font-medium"
            >
              Create post
            </Button>
          </div>
        ) : (
          <>
            {/* Sort indicator */}
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
              <p className="text-sm text-gray-600">
                {sortBy === 'recent' ? (
                  <>Showing most recent posts with {displayHashtag}</>
                ) : (
                  <>Showing top posts with {displayHashtag} by engagement</>
                )}
              </p>
            </div>

            {/* Tweets */}
            <div className="divide-y divide-gray-100">
              {hashtagTweets.map((tweet) => (
                <div key={`${tweet.id}-${tweet.retweetedAt || tweet.createdAt}`}>
                  {/* Desktop Tweet Card */}
                  <div className="hidden md:block">
                    <TweetCard 
                      tweet={tweet} 
                      onLike={() => handleLike(tweet.id, tweet.isLiked)}
                      onRetweet={() => handleRetweet(tweet.id, tweet.isRetweeted)}
                      onBookmark={() => handleBookmark(tweet.id, tweet.isBookmarked)}
                      currentUserId={user?.id}
                    />
                  </div>
                  {/* Mobile Tweet Card */}
                  <div className="md:hidden">
                    <MobileTweetCard 
                      tweet={tweet}
                      onLike={() => handleLike(tweet.id, tweet.isLiked)}
                      onRetweet={() => handleRetweet(tweet.id, tweet.isRetweeted)}
                      onBookmark={() => handleBookmark(tweet.id, tweet.isBookmarked)}
                      currentUserId={user?.id}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Load more indicator */}
            {hashtagTweets.length >= 50 && (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">
                  Showing latest {hashtagTweets.length} posts
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};