import React from 'react';
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
import { Tweet } from '../../types';
import { useStore } from '../../store/useStore';

interface TweetCardProps {
  tweet: Tweet;
  onLike: () => void;
  onRetweet: () => void;
  onBookmark: () => void;
  currentUserId?: string;
}

export const TweetCard: React.FC<TweetCardProps> = ({ 
  tweet, 
  onLike, 
  onRetweet, 
  onBookmark, 
  currentUserId 
}) => {
  const { isRTL } = useStore();

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

  const isOwnTweet = currentUserId === tweet.author.id;

  return (
    <div className="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors">
      <div className={`flex gap-4 ${isRTL ? '' : 'flex-row-reverse'}`}>
        {/* Avatar */}
        <Avatar className="w-12 h-12 flex-shrink-0">
          <AvatarImage src={tweet.author.avatar} />
          <AvatarFallback>{tweet.author.displayName[0]}</AvatarFallback>
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
                      <DropdownMenuItem className="hover:bg-gray-50">
                        Unfollow @{tweet.author.username}
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
            
            {/* User info and timestamp */}
            <div className={`flex items-center space-x-2 ${isRTL ? '' : 'flex-row-reverse'} min-w-0`}>
              <span className="text-gray-500 hover:underline cursor-pointer text-sm flex-shrink-0">
                {formatDistanceToNow(tweet.createdAt, { addSuffix: true })}
              </span>
              <span className="text-gray-500">·</span>
              <span className="text-gray-500 truncate">@{tweet.author.username}</span>
              {tweet.author.verified && (
                <CheckCircle className="w-4 h-4 text-blue-500 fill-current flex-shrink-0" />
              )}
              <span className="font-bold text-gray-900 hover:underline cursor-pointer truncate">
                {tweet.author.displayName}
              </span>
            </div>
          </div>

          {/* Tweet Text */}
          <div className={`text-gray-900 mb-3 text-[15px] leading-5 ${isRTL ? 'text-left' : 'text-right'}`}>
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

          {/* Tags */}
          {tweet.tags && tweet.tags.length > 0 && (
            <div className={`mb-3 flex flex-wrap gap-2 ${isRTL ? 'justify-start' : 'justify-end'}`}>
              {tweet.tags.map((tag, index) => (
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

          {/* Actions */}
          <div className={`flex items-center ${isRTL ? 'justify-start' : 'justify-end'} space-x-4 mt-3`}>
            {/* Reply */}
            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-blue-500 hover:bg-blue-50 p-2 flex items-center">
              <MessageCircle className="w-5 h-5" />
              <span className={`text-sm ${isRTL ? 'mr-1' : 'ml-1'}`}>{formatNumber(tweet.replies)}</span>
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
              onClick={onRetweet}
            >
              <Repeat2 className="w-5 h-5" />
              <span className={`text-sm ${isRTL ? 'mr-1' : 'ml-1'}`}>{formatNumber(tweet.retweets)}</span>
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
              onClick={onLike}
            >
              <Heart className={`w-5 h-5 ${tweet.isLiked ? 'fill-current' : ''}`} />
              <span className={`text-sm ${isRTL ? 'mr-1' : 'ml-1'}`}>{formatNumber(tweet.likes)}</span>
            </Button>

            {/* Views */}
            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-blue-500 hover:bg-blue-50 p-2 flex items-center">
              <Eye className="w-5 h-5" />
              <span className={`text-sm ${isRTL ? 'mr-1' : 'ml-1'}`}>{formatNumber(tweet.views)}</span>
            </Button>

            {/* Share & Bookmark */}
            <div className={`flex ${isRTL ? 'space-x-reverse space-x-1' : 'space-x-1'}`}>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`p-2 ${
                  tweet.isBookmarked 
                    ? 'text-blue-500 hover:text-blue-600 hover:bg-blue-50' 
                    : 'text-gray-500 hover:text-blue-500 hover:bg-blue-50'
                }`}
                onClick={onBookmark}
              >
                <Bookmark className={`w-5 h-5 ${tweet.isBookmarked ? 'fill-current' : ''}`} />
              </Button>
              <Button variant="ghost" size="sm" className="text-gray-500 hover:text-blue-500 hover:bg-blue-50 p-2">
                <Share className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};