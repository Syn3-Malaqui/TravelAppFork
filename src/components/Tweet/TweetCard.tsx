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
  Tag
} from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { ReplyModal } from './ReplyModal';
import { RetweetModal } from './RetweetModal';
import { Tweet } from '../../types';
import { useStore } from '../../store/useStore';
import { useNavigate } from 'react-router-dom';

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
  const { isRTL } = useStore();
  const navigate = useNavigate();
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [showRetweetModal, setShowRetweetModal] = useState(false);

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

  const handleProfileClick = (user = tweet.author) => {
    navigate(`/profile/${user.username}`);
  };

  const handleReply = () => {
    // For retweets, reply to the original tweet
    setShowReplyModal(true);
  };

  const handleRetweet = () => {
    setShowRetweetModal(true);
  };

  const handleQuickRetweet = () => {
    onRetweet();
    setShowRetweetModal(false);
  };

  const handleLike = () => {
    onLike();
  };

  const handleBookmark = () => {
    onBookmark();
  };

  const isOwnTweet = currentUserId === tweet.author.id;
  const displayTweet = tweet.originalTweet || tweet;
  const isRetweetDisplay = tweet.isRetweet && tweet.originalTweet;

  return (
    <>
      <div className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
        isReply ? 'pl-16 border-l-2 border-l-gray-300 ml-4' : 'p-4'
      } ${!isReply ? 'p-4' : 'py-3 pr-4'}`}>
        
        {/* Retweet Header */}
        {isRetweetDisplay && (
          <div className={`flex items-center mb-2 text-gray-500 text-sm ${isRTL ? 'justify-end' : 'justify-start'}`}>
            <Repeat2 className="w-4 h-4 mr-2" />
            <span 
              className="hover:underline cursor-pointer"
              onClick={() => handleProfileClick(tweet.retweetedBy!)}
            >
              {tweet.retweetedBy!.displayName} retweeted
            </span>
          </div>
        )}

        {/* Reply Indicator */}
        {isReply && (
          <div className={`flex items-center mb-2 text-gray-500 text-sm ${isRTL ? 'justify-end' : 'justify-start'}`}>
            <MessageCircle className="w-4 h-4 mr-2" />
            <span>Replying to @{displayTweet.author.username}</span>
          </div>
        )}
        
        <div className={`flex gap-4 ${isRTL ? '' : 'flex-row-reverse'}`}>
          {/* Avatar - Position changes based on RTL/LTR */}
          <Avatar className="w-12 h-12 flex-shrink-0 cursor-pointer" onClick={() => handleProfileClick(displayTweet.author)}>
            <AvatarImage src={displayTweet.author.avatar} />
            <AvatarFallback>{displayTweet.author.displayName[0]}</AvatarFallback>
          </Avatar>

          {/* Tweet Content */}
          <div className={`flex-1 min-w-0 ${isRTL ? 'text-left ml-1' : 'text-right mr-1'}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-1">
              {/* More Options */}
              <div className="relative">
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100 flex-shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="start" 
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
                        <DropdownMenuItem onClick={() => handleProfileClick(displayTweet.author)} className="hover:bg-gray-50">
                          View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem className="hover:bg-gray-50">
                          Mute @{displayTweet.author.username}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600 hover:bg-red-50">
                          Report post
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              {/* User info and timestamp */}
              <div className={`flex items-center space-x-2 ${isRTL ? '' : 'flex-row-reverse'} min-w-0`}>
                <span className="text-gray-500 hover:underline cursor-pointer text-sm flex-shrink-0">
                  {formatDistanceToNow(displayTweet.createdAt, { addSuffix: true })}
                </span>
                <span className="text-gray-500">·</span>
                <span 
                  className="text-gray-500 truncate cursor-pointer hover:underline"
                  onClick={() => handleProfileClick(displayTweet.author)}
                >
                  @{displayTweet.author.username}
                </span>
                {displayTweet.author.verified && (
                  <CheckCircle className="w-4 h-4 text-blue-500 fill-current flex-shrink-0" />
                )}
                <span 
                  className="font-bold text-gray-900 hover:underline cursor-pointer truncate"
                  onClick={() => handleProfileClick(displayTweet.author)}
                >
                  {displayTweet.author.displayName}
                </span>
              </div>
            </div>

            {/* Retweet Comment (if any) */}
            {isRetweetDisplay && tweet.content && (
              <div className={`text-gray-900 mb-3 text-[15px] leading-5 ${isRTL ? 'text-left' : 'text-right'}`}>
                {tweet.content}
              </div>
            )}

            {/* Tweet Text */}
            <div className={`text-gray-900 mb-3 text-[15px] leading-5 ${isRTL ? 'text-left' : 'text-right'}`}>
              {displayTweet.content.split(' ').map((word, index) => {
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

            {/* Tags */}
            {displayTweet.tags && displayTweet.tags.length > 0 && (
              <div className={`mb-3 flex flex-wrap gap-2 ${isRTL ? 'justify-start' : 'justify-end'}`}>
                {displayTweet.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 cursor-pointer transition-colors"
                  >
                    <Tag className={`w-3 h-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Images - Fixed aspect ratio */}
            {displayTweet.images && displayTweet.images.length > 0 && (
              <div className="mb-3 rounded-2xl overflow-hidden border border-gray-200">
                <div className="w-full aspect-[16/9]">
                  <img 
                    src={displayTweet.images[0]} 
                    alt="Tweet image" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className={`flex items-center ${isRTL ? 'justify-start' : 'justify-end'} space-x-4 mt-3`}>
              {/* Reply */}
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-500 hover:text-blue-500 hover:bg-blue-50 p-2 flex items-center"
                onClick={handleReply}
              >
                <MessageCircle className="w-5 h-5" />
                <span className={`text-sm ${isRTL ? 'mr-1' : 'ml-1'}`}>{formatNumber(displayTweet.replies)}</span>
              </Button>

              {/* Retweet */}
              <Button 
                variant="ghost" 
                size="sm" 
                className={`p-2 flex items-center ${
                  displayTweet.isRetweeted 
                    ? 'text-green-500 hover:text-green-600 hover:bg-green-50' 
                    : 'text-gray-500 hover:text-green-500 hover:bg-green-50'
                }`}
                onClick={handleRetweet}
              >
                <Repeat2 className="w-5 h-5" />
                <span className={`text-sm ${isRTL ? 'mr-1' : 'ml-1'}`}>{formatNumber(displayTweet.retweets)}</span>
              </Button>

              {/* Like */}
              <Button 
                variant="ghost" 
                size="sm" 
                className={`p-2 flex items-center ${
                  displayTweet.isLiked 
                    ? 'text-red-500 hover:text-red-600 hover:bg-red-50' 
                    : 'text-gray-500 hover:text-red-500 hover:bg-red-50'
                }`}
                onClick={handleLike}
              >
                <Heart className={`w-5 h-5 ${displayTweet.isLiked ? 'fill-current' : ''}`} />
                <span className={`text-sm ${isRTL ? 'mr-1' : 'ml-1'}`}>{formatNumber(displayTweet.likes)}</span>
              </Button>

              {/* Views */}
              <Button variant="ghost" size="sm" className="text-gray-500 hover:text-blue-500 hover:bg-blue-50 p-2 flex items-center">
                <Eye className="w-5 h-5" />
                <span className={`text-sm ${isRTL ? 'mr-1' : 'ml-1'}`}>{formatNumber(displayTweet.views)}</span>
              </Button>

              {/* Share & Bookmark */}
              <div className={`flex ${isRTL ? 'space-x-reverse space-x-1' : 'space-x-1'}`}>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`p-2 ${
                    displayTweet.isBookmarked 
                      ? 'text-blue-500 hover:text-blue-600 hover:bg-blue-50' 
                      : 'text-gray-500 hover:text-blue-500 hover:bg-blue-50'
                  }`}
                  onClick={handleBookmark}
                >
                  <Bookmark className={`w-5 h-5 ${displayTweet.isBookmarked ? 'fill-current' : ''}`} />
                </Button>
                <Button variant="ghost" size="sm" className="text-gray-500 hover:text-blue-500 hover:bg-blue-50 p-2">
                  <Share className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reply Modal */}
      <ReplyModal 
        tweet={displayTweet}
        isOpen={showReplyModal}
        onClose={() => setShowReplyModal(false)}
      />

      {/* Retweet Modal */}
      <RetweetModal 
        tweet={displayTweet}
        isOpen={showRetweetModal}
        onClose={() => setShowRetweetModal(false)}
        onQuickRetweet={handleQuickRetweet}
        isRetweeted={displayTweet.isRetweeted}
      />
    </>
  );
};