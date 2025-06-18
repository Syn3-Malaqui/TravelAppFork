import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Hash, TrendingUp, Clock, BarChart3 } from 'lucide-react';
import { Button } from '../ui/button';
import { TweetCard } from '../Tweet/TweetCard';
import { MobileTweetCard } from '../Tweet/MobileTweetCard';
import { useHashtags } from '../../hooks/useHashtags';
import { useAuth } from '../../hooks/useAuth';
import { useTweets } from '../../hooks/useTweets';

export const HashtagPage: React.FC = () => {
  const { hashtag } = useParams<{ hashtag: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hashtagTweets, loading, error, searchHashtagTweets } = useHashtags();
  const { likeTweet, unlikeTweet } = useTweets();
  const [sortBy, setSortBy] = useState<'recent' | 'top'>('recent');

  useEffect(() => {
    if (hashtag) {
      searchHashtagTweets(hashtag, sortBy);
    }
  }, [hashtag, sortBy, searchHashtagTweets]);

  const handleLike = async (tweetId: string, isCurrentlyLiked: boolean) => {
    try {
      if (isCurrentlyLiked) {
        await unlikeTweet(tweetId);
      } else {
        await likeTweet(tweetId);
      }
      // Refresh hashtag tweets to update like counts
      if (hashtag) {
        searchHashtagTweets(hashtag, sortBy);
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

  if (!hashtag) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">Invalid hashtag</p>
      </div>
    );
  }

  const displayHashtag = hashtag.startsWith('#') ? hashtag : `#${hashtag}`;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-gray-200 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/search')}
              className="p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center space-x-2">
                <Hash className="h-5 w-5 text-blue-500" />
                <h1 className="text-xl font-bold">{displayHashtag}</h1>
              </div>
              <p className="text-sm text-gray-500">
                {hashtagTweets.length} {hashtagTweets.length === 1 ? 'post' : 'posts'}
              </p>
            </div>
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
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-500">Loading posts...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="text-red-500 text-center">
              <p className="text-lg font-semibold mb-2">Error loading posts</p>
              <p className="text-sm text-gray-600">{error}</p>
            </div>
          </div>
        ) : hashtagTweets.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Hash className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-lg mb-2">No posts found for {displayHashtag}</p>
            <p className="text-sm text-gray-400">
              Be the first to post with this hashtag!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {hashtagTweets.map((tweet) => (
              <div key={`${tweet.id}-${tweet.retweetedAt || tweet.createdAt}`}>
                {/* Desktop Tweet Card */}
                <div className="hidden md:block">
                  <TweetCard 
                    tweet={tweet} 
                    onLike={() => handleLike(tweet.id, tweet.isLiked)}
                    onRetweet={() => handleRetweet(tweet.id)}
                    onBookmark={() => handleBookmark(tweet.id)}
                    currentUserId={user?.id}
                  />
                </div>
                {/* Mobile Tweet Card */}
                <div className="md:hidden">
                  <MobileTweetCard 
                    tweet={tweet}
                    onLike={() => handleLike(tweet.id, tweet.isLiked)}
                    onRetweet={() => handleRetweet(tweet.id)}
                    onBookmark={() => handleBookmark(tweet.id)}
                    currentUserId={user?.id}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};