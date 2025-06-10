import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TweetCard } from '../Tweet/TweetCard';
import { MobileTweetCard } from '../Tweet/MobileTweetCard';
import { MobileTabs } from '../Layout/MobileTabs';
import { MobileTags } from '../Layout/MobileTags';
import { useTweets } from '../../hooks/useTweets';
import { useAuth } from '../../hooks/useAuth';
import { useStore } from '../../store/useStore';

export const Timeline: React.FC = () => {
  const navigate = useNavigate();
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const { isRTL } = useStore();
  const { user } = useAuth();
  const { tweets, loading, error, likeTweet, unlikeTweet, retweetTweet, unretweetTweet, bookmarkTweet, unbookmarkTweet } = useTweets();

  const handleComposeClick = () => {
    navigate('/compose');
  };

  const handleLike = async (tweetId: string) => {
    try {
      // Check if tweet is already liked by finding it in the tweets array
      const tweet = tweets.find(t => t.id === tweetId);
      if (tweet?.isLiked) {
        await unlikeTweet(tweetId);
      } else {
        await likeTweet(tweetId);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleRetweet = async (tweetId: string) => {
    try {
      // Check if tweet is already retweeted by finding it in the tweets array
      const tweet = tweets.find(t => t.id === tweetId);
      if (tweet?.isRetweeted) {
        await unretweetTweet(tweetId);
      } else {
        await retweetTweet(tweetId);
      }
    } catch (error) {
      console.error('Error toggling retweet:', error);
    }
  };

  const handleBookmark = async (tweetId: string) => {
    try {
      // Check if tweet is already bookmarked by finding it in the tweets array
      const tweet = tweets.find(t => t.id === tweetId);
      if (tweet?.isBookmarked) {
        await unbookmarkTweet(tweetId);
      } else {
        await bookmarkTweet(tweetId);
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  const handleTagFilter = (tag: string | null) => {
    setTagFilter(tag);
  };

  // Convert tag filter ID to tag label for filtering
  const getTagLabel = (tagId: string | null): string | null => {
    if (!tagId) return null;
    const tagMap: { [key: string]: string } = {
      'car-rentals': 'Car Rentals',
      'hotels': 'Hotels',
      'tourist-spots': 'Tourist Spots',
    };
    return tagMap[tagId] || null;
  };

  // Filter tweets based on selected tag
  const filteredTweets = useMemo(() => {
    if (!tagFilter) return tweets;
    
    const tagLabel = getTagLabel(tagFilter);
    if (!tagLabel) return tweets;

    return tweets.filter(tweet => 
      tweet.tags && tweet.tags.includes(tagLabel)
    );
  }, [tweets, tagFilter]);

  if (loading) {
    return (
      <div className={`min-h-screen w-full flex ${isRTL ? 'justify-start' : 'justify-end'}`}>
        <div className={`w-full max-w-2xl ${isRTL ? 'border-l' : 'border-r'} border-gray-200 overflow-hidden`}>
          {/* Desktop Header */}
          <div className={`hidden md:block sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-200 p-4 z-10`}>
            <h1 className={`text-xl font-bold ${isRTL ? 'text-left' : 'text-right'}`}>Home</h1>
          </div>

          {/* Mobile Tabs */}
          <MobileTabs />

          {/* Loading State */}
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className={`${isRTL ? 'mr-3' : 'ml-3'} text-gray-500`}>Loading tweets...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen w-full flex ${isRTL ? 'justify-start' : 'justify-end'}`}>
        <div className={`w-full max-w-2xl ${isRTL ? 'border-l' : 'border-r'} border-gray-200 overflow-hidden`}>
          {/* Desktop Header */}
          <div className={`hidden md:block sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-200 p-4 z-10`}>
            <h1 className={`text-xl font-bold ${isRTL ? 'text-left' : 'text-right'}`}>Home</h1>
          </div>

          {/* Mobile Tabs */}
          <MobileTabs />

          {/* Error State */}
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="text-red-500 text-center">
              <p className="text-lg font-semibold mb-2">Error loading tweets</p>
              <p className="text-sm text-gray-600">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen w-full flex ${isRTL ? 'justify-start' : 'justify-end'}`}>
      <div className={`w-full max-w-2xl ${isRTL ? 'border-l' : 'border-r'} border-gray-200 overflow-hidden flex flex-col`}>
        {/* Desktop Header */}
        <div className={`hidden md:block sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-200 p-4 z-10`}>
          <h1 className={`text-xl font-bold ${isRTL ? 'text-left' : 'text-right'}`}>Home</h1>
        </div>

        {/* Mobile Tabs */}
        <MobileTabs />

        {/* Mobile Tags with filtering */}
        <MobileTags onTagFilter={handleTagFilter} activeFilter={tagFilter} />

        {/* Desktop Tweet Composer */}
        <div className="hidden md:block border-b border-gray-200 p-4 flex-shrink-0">
          <div className={`flex space-x-4 ${isRTL ? 'justify-start' : 'justify-end'} ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="flex-1 max-w-lg">
              <div 
                className={`text-xl text-gray-500 py-3 cursor-pointer hover:bg-gray-50 rounded-lg px-4 ${isRTL ? 'text-left' : 'text-right'}`}
                onClick={handleComposeClick}
              >
                What's happening?
              </div>
            </div>
            <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
          </div>
        </div>

        {/* Timeline - Scrollable container */}
        <div className="flex-1 overflow-y-auto">
          <div className={`flex flex-col ${isRTL ? 'items-start' : 'items-end'} pb-20 md:pb-0`}>
            {filteredTweets.length === 0 ? (
              <div className="w-full text-center py-12 text-gray-500">
                {tagFilter ? (
                  <>
                    <p className="text-lg">No tweets found with the selected tag.</p>
                  </>
                ) : (
                  <>
                    <p className="text-lg mb-4">No tweets yet!</p>
                    <p className="text-sm text-gray-400 mb-4">Be the first to share something.</p>
                    <button 
                      onClick={handleComposeClick}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-full font-medium transition-colors"
                    >
                      Create your first tweet
                    </button>
                  </>
                )}
              </div>
            ) : (
              filteredTweets.map((tweet) => (
                <div key={tweet.id} className="w-full max-w-2xl">
                  {/* Desktop Tweet Card */}
                  <div className="hidden md:block">
                    <TweetCard 
                      tweet={tweet} 
                      onLike={() => handleLike(tweet.id)}
                      onRetweet={() => handleRetweet(tweet.id)}
                      onBookmark={() => handleBookmark(tweet.id)}
                      currentUserId={user?.id}
                    />
                  </div>
                  {/* Mobile Tweet Card */}
                  <div className="md:hidden">
                    <MobileTweetCard 
                      tweet={tweet}
                      onLike={() => handleLike(tweet.id)}
                      onRetweet={() => handleRetweet(tweet.id)}
                      onBookmark={() => handleBookmark(tweet.id)}
                      currentUserId={user?.id}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};