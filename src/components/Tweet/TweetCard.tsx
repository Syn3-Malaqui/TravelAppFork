import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  Heart, 
  MessageCircle, 
  Repeat2, 
  Share, 
  Bookmark,
  MoreHorizontal,
  Eye,
  CheckCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Tweet } from '../../types';
import { useNavigate } from 'react-router-dom';
import { ReplyComposer } from './ReplyComposer';
import { useTweets } from '../../hooks/useTweets';

interface TweetCardProps {
  tweet: Tweet;
  onLike: () => void;
  onRetweet: () => void;
  onBookmark: () => void;
  currentUserId?: string;
  isReply?: boolean;
}

export const TweetCard: React.FC<TweetCardProps> = ({ 
  tweet, 
  onLike, 
  onRetweet, 
  onBookmark, 
  currentUserId,
  isReply = false
}) => {
  const navigate = useNavigate();
  const [showReplies, setShowReplies] = useState(false);
  const [showReplyComposer, setShowReplyComposer] = useState(false);
  const { replies, fetchReplies, createRetweet, removeRetweet } = useTweets();

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const handleDelete = async () => {
    // Mock delete functionality
    console.log('Delete tweet:', tweet.id);
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/profile/${tweet.author.username}`);
  };

  const handleRetweeterProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (tweet.retweetedBy) {
      navigate(`/profile/${tweet.retweetedBy.username}`);
    }
  };

  const handleTweetClick = async () => {
    if (!isReply && tweet.replies > 0) {
      if (!showReplies) {
        await fetchReplies(tweet.id);
      }
      setShowReplies(!showReplies);
    }
  };

  const handleReplyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowReplyComposer(!showReplyComposer);
  };

  const handleReplySuccess = async () => {
    setShowReplyComposer(false);
    await fetchReplies(tweet.id);
    setShowReplies(true);
  };

  const handleRetweetClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (tweet.isRetweeted) {
        await removeRetweet(tweet.id);
      } else {
        await createRetweet(tweet.id);
      }
    } catch (error: any) {
      console.error('Error toggling retweet:', error.message);
    }
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLike();
  };

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onBookmark();
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Handle share functionality
  };

  const handleViewsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Handle views functionality
  };

  const isOwnTweet = currentUserId === tweet.author.id;
  const tweetReplies = replies[tweet.id] || [];
  const hasReplies = tweet.replies > 0 && !isReply;

  return (
    <div className={`border-b border-gray-200 transition-colors ${isReply ? 'ml-12 border-l-2 border-gray-200' : ''}`}>
      {/* Retweet indicator */}
      {tweet.isRetweet && tweet.retweetedBy && (
        <div className="px-4 pt-3 pb-1">
          <div className="flex items-center space-x-2 text-gray-500 text-sm">
            <Repeat2 className="w-4 h-4" />
            <span 
              className="hover:underline cursor-pointer"
              onClick={handleRetweeterProfileClick}
            >
              <span className="font-medium">{tweet.retweetedBy.displayName}</span> retweeted
            </span>
            <span>·</span>
            <span>{formatDistanceToNow(tweet.retweetedAt!, { addSuffix: true })}</span>
          </div>
        </div>
      )}

      <div 
        className={`p-4 ${hasReplies ? 'cursor-pointer hover:bg-gray-50' : ''}`}
        onClick={handleTweetClick}
      >
        <div className="flex gap-4">
          {/* Avatar */}
          <Avatar className="w-12 h-12 flex-shrink-0 cursor-pointer" onClick={handleProfileClick}>
            <AvatarImage src={tweet.author.avatar} />
            <AvatarFallback>{tweet.author.displayName[0]}</AvatarFallback>
          </Avatar>

          {/* Tweet Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-1">
              {/* User info and timestamp */}
              <div className="flex items-center space-x-2 min-w-0">
                <span 
                  className="font-bold text-gray-900 hover:underline cursor-pointer truncate"
                  onClick={handleProfileClick}
                >
                  {tweet.author.displayName}
                </span>
                {tweet.author.verified && (
                  <CheckCircle className="w-4 h-4 text-blue-500 fill-current flex-shrink-0" />
                )}
                <span 
                  className="text-gray-500 truncate cursor-pointer hover:underline"
                  onClick={handleProfileClick}
                >
                  @{tweet.author.username}
                </span>
                <span className="text-gray-500">·</span>
                <span className="text-gray-500 hover:underline cursor-pointer text-sm flex-shrink-0">
                  {formatDistanceToNow(tweet.createdAt, { addSuffix: true })}
                </span>
              </div>
              
              {/* More Options */}
              <div className="relative">
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 hover:bg-gray-100 flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="end" 
                    side="bottom"
                    className="w-48 z-50"
                    sideOffset={4}
                    avoidCollisions={true}
                    collisionPadding={8}
                  >
                    {isOwnTweet ? (
                      <DropdownMenuItem onClick={handleDelete} className="text-red-600 hover:bg-red-50">
                        Delete Tweet
                      </DropdownMenuItem>
                    ) : (
                      <>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleProfileClick(e); }} className="hover:bg-gray-50">
                          View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem className="hover:bg-gray-50">
                          Mute @{tweet.author.username}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600 hover:bg-red-50">
                          Report post
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Tweet Text */}
            <div className="text-gray-900 mb-3 text-[15px] leading-5">
              {tweet.content.split(' ').map((word, index) => {
                if (word.startsWith('#')) {
                  return (
                    <span key={index} className="text-blue-500 hover:underline cursor-pointer">
                      {word}{' '}
                    </span>
                  );
                }
                if (word.startsWith('@')) {
                  return (
                    <span key={index} className="text-blue-500 hover:underline cursor-pointer">
                      {word}{' '}
                    </span>
                  );
                }
                return word + ' ';
              })}
            </div>

            {/* Images - Fixed aspect ratio */}
            {tweet.images && tweet.images.length > 0 && (
              <div className="mb-3 rounded-2xl overflow-hidden border border-gray-200">
                <div className="w-full aspect-[16/9]">
                  <img 
                    src={tweet.images[0]} 
                    alt="Tweet image" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* Click to view replies indicator */}
            {hasReplies && (
              <div className="mb-3 text-sm text-blue-500 flex items-center space-x-1">
                {showReplies ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    <span>Hide {tweet.replies} {tweet.replies === 1 ? 'reply' : 'replies'}</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    <span>Show {tweet.replies} {tweet.replies === 1 ? 'reply' : 'replies'}</span>
                  </>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between space-x-4 mt-3">
              {/* Reply */}
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-500 hover:text-blue-500 hover:bg-blue-50 p-2 flex items-center"
                onClick={handleReplyClick}
              >
                <MessageCircle className="w-5 h-5" />
                <span className="text-sm ml-1">{formatNumber(tweet.replies)}</span>
              </Button>

              {/* Retweet */}
              <Button 
                variant="ghost" 
                size="sm" 
                className={`p-2 flex items-center ${
                  tweet.isRetweeted 
                    ? 'text-green-500 hover:text-green-600 hover:bg-green-50' 
                    : 'text-gray-500 hover:text-green-500 hover:bg-green-50'
                }`}
                onClick={handleRetweetClick}
              >
                <Repeat2 className="w-5 h-5" />
                <span className="text-sm ml-1">{formatNumber(tweet.retweets)}</span>
              </Button>

              {/* Like */}
              <Button 
                variant="ghost" 
                size="sm" 
                className={`p-2 flex items-center ${
                  tweet.isLiked 
                    ? 'text-red-500 hover:text-red-600 hover:bg-red-50' 
                    : 'text-gray-500 hover:text-red-500 hover:bg-red-50'
                }`}
                onClick={handleLikeClick}
              >
                <Heart className={`w-5 h-5 ${tweet.isLiked ? 'fill-current' : ''}`} />
                <span className="text-sm ml-1">{formatNumber(tweet.likes)}</span>
              </Button>

              {/* Views */}
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-500 hover:text-blue-500 hover:bg-blue-50 p-2 flex items-center"
                onClick={handleViewsClick}
              >
                <Eye className="w-5 h-5" />
                <span className="text-sm ml-1">{formatNumber(tweet.views)}</span>
              </Button>

              {/* Share & Bookmark */}
              <div className="flex space-x-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`p-2 ${
                    tweet.isBookmarked 
                      ? 'text-blue-500 hover:text-blue-600 hover:bg-blue-50' 
                      : 'text-gray-500 hover:text-blue-500 hover:bg-blue-50'
                  }`}
                  onClick={handleBookmarkClick}
                >
                  <Bookmark className={`w-5 h-5 ${tweet.isBookmarked ? 'fill-current' : ''}`} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-gray-500 hover:text-blue-500 hover:bg-blue-50 p-2"
                  onClick={handleShareClick}
                >
                  <Share className="w-5 h-5" />
                </Button>
              </div>
            </div>
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
      {showReplies && tweetReplies.length > 0 && (
        <div className="border-t border-gray-100">
          {tweetReplies.map((reply) => (
            <TweetCard
              key={reply.id}
              tweet={reply}
              onLike={() => {}} // TODO: Implement reply like
              onRetweet={() => {}} // TODO: Implement reply retweet
              onBookmark={() => {}} // TODO: Implement reply bookmark
              currentUserId={currentUserId}
              isReply={true}
            />
          ))}
        </div>
      )}
    </div>
  );
};