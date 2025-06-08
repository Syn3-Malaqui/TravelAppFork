import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TweetCard } from '../Tweet/TweetCard';
import { MobileTweetCard } from '../Tweet/MobileTweetCard';
import { MobileTabs } from '../Layout/MobileTabs';
import { MobileTags } from '../Layout/MobileTags';
import { AuthModal } from '../Auth/AuthModal';
import { useAuth } from '../../hooks/useAuth';
import { useTweets } from '../../hooks/useTweets';
import { useInteractions } from '../../hooks/useInteractions';
import { useStore } from '../../store/useStore';
import { User, Tweet } from '../../types';

export const Timeline: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const { tweets, loading: tweetsLoading } = useTweets();
  const { userLikes, userRetweets, userBookmarks, toggleLike, toggleRetweet, toggleBookmark } = useInteractions(user?.id);
  const { showAuthModal, setShowAuthModal } = useStore();

  const handleComposeClick = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    navigate('/compose');
  };

  // Convert database tweets to UI format
  const convertTweet = (tweetData: any): Tweet => {
    const author: User = {
      id: tweetData.profiles.id,
      username: tweetData.profiles.username,
      displayName: tweetData.profiles.display_name,
      avatar: tweetData.profiles.avatar_url || 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150',
      bio: tweetData.profiles.bio,
      verified: tweetData.profiles.verified,
      followers: tweetData.profiles.followers_count,
      following: tweetData.profiles.following_count,
      joinedDate: new Date(tweetData.profiles.created_at),
    };

    return {
      id: tweetData.id,
      content: tweetData.content,
      author,
      createdAt: new Date(tweetData.created_at),
      likes: tweetData.likes_count,
      retweets: tweetData.retweets_count,
      replies: tweetData.replies_count,
      views: tweetData.views_count,
      images: tweetData.image_urls.length > 0 ? tweetData.image_urls : undefined,
      isLiked: userLikes.has(tweetData.id),
      isRetweeted: userRetweets.has(tweetData.id),
      isBookmarked: userBookmarks.has(tweetData.id),
      replyTo: tweetData.reply_to,
      hashtags: tweetData.hashtags,
      mentions: tweetData.mentions,
    };
  };

  if (authLoading || tweetsLoading) {
    return (
      <div className="min-h-screen w-full flex justify-center items-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  const timelineTweets = tweets.map(convertTweet);

  return (
    <div className="min-h-screen w-full flex justify-end">
      <div className="w-full max-w-2xl border-r border-gray-200">
        {/* Desktop Header */}
        <div className="hidden md:block sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-200 p-4">
          <h1 className="text-xl font-bold text-right">Home</h1>
        </div>

        {/* Mobile Tabs */}
        <MobileTabs />

        {/* Mobile Tags */}
        <MobileTags />

        {/* Desktop Tweet Composer */}
        <div className="hidden md:block border-b border-gray-200 p-4">
          <div className="flex space-x-4 justify-end">
            <div className="flex-1 max-w-lg">
              <div 
                className="text-xl text-gray-500 py-3 cursor-pointer hover:bg-gray-50 rounded-lg px-4 text-right"
                onClick={handleComposeClick}
              >
                What's happening?
              </div>
            </div>
            <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
          </div>
        </div>

        {/* Timeline */}
        <div className="flex flex-col items-end pb-20 md:pb-0">
          {timelineTweets.map((tweet) => (
            <div key={tweet.id} className="w-full max-w-2xl">
              {/* Desktop Tweet Card */}
              <div className="hidden md:block">
                <TweetCard 
                  tweet={tweet} 
                  onLike={() => toggleLike(tweet.id)}
                  onRetweet={() => toggleRetweet(tweet.id)}
                  onBookmark={() => toggleBookmark(tweet.id)}
                  currentUserId={user?.id}
                />
              </div>
              {/* Mobile Tweet Card */}
              <div className="md:hidden">
                <MobileTweetCard 
                  tweet={tweet}
                  onLike={() => toggleLike(tweet.id)}
                  onRetweet={() => toggleRetweet(tweet.id)}
                  onBookmark={() => toggleBookmark(tweet.id)}
                  currentUserId={user?.id}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </div>
  );
};