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
  CheckCircle
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
import { useTweets } from '../../hooks/useTweets';

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
  const { deleteTweet } = useTweets();

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
    await deleteTweet(tweet.id);
  };

  const isOwnTweet = currentUserId === tweet.author.id;

  return (
    <div className="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors">
      <div className="flex space-x-3 flex-row-reverse">
        {/* Avatar - Now on the right */}
        <Avatar className="w-12 h-12 flex-shrink-0">
          <AvatarImage src={tweet.author.avatar} />
          <AvatarFallback>{tweet.author.displayName[0]}</AvatarFallback>
        </Avatar>

        {/* Tweet Content - Now on the left but text-aligned right */}
        <div className="flex-1 min-w-0 text-right">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            {/* More Options - Now on the left */}
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
            
            {/* User info and timestamp - Now on the right */}
            <div className="flex items-center space-x-2 flex-row-reverse min-w-0">
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
          <div className="text-gray-900 mb-3 text-[15px] leading-5 text-right">
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

          {/* Images */}
          {tweet.images && tweet.images.length > 0 && (
            <div className="mb-3 rounded-2xl overflow-hidden border border-gray-200">
              <img 
                src={tweet.images[0]} 
                alt="Tweet image" 
                className="w-full h-64 object-cover"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end max-w-md mt-3 ml-auto flex-row-reverse">
            {/* Share & Bookmark */}
            <div className="flex space-x-1 flex-row-reverse">
              <Button variant="ghost" size="sm" className="text-gray-500 hover:text-blue-500 hover:bg-blue-50 p-2">
                <Share className="w-5 h-5" />
              </Button>
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
            </div>

            {/* Views */}
            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-blue-500 hover:bg-blue-50 p-2">
              <span className="text-sm mr-1">{formatNumber(tweet.views)}</span>
              <Eye className="w-5 h-5" />
            </Button>

            {/* Like */}
            <Button 
              variant="ghost" 
              size="sm" 
              className={`p-2 ${
                tweet.isLiked 
                  ? 'text-red-500 hover:text-red-600 hover:bg-red-50' 
                  : 'text-gray-500 hover:text-red-500 hover:bg-red-50'
              }`}
              onClick={onLike}
            >
              <span className="text-sm mr-1">{formatNumber(tweet.likes)}</span>
              <Heart className={`w-5 h-5 ${tweet.isLiked ? 'fill-current' : ''}`} />
            </Button>

            {/* Retweet */}
            <Button 
              variant="ghost" 
              size="sm" 
              className={`p-2 ${
                tweet.isRetweeted 
                  ? 'text-green-500 hover:text-green-600 hover:bg-green-50' 
                  : 'text-gray-500 hover:text-green-500 hover:bg-green-50'
              }`}
              onClick={onRetweet}
            >
              <span className="text-sm mr-1">{formatNumber(tweet.retweets)}</span>
              <Repeat2 className="w-5 h-5" />
            </Button>

            {/* Reply */}
            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-blue-500 hover:bg-blue-50 p-2">
              <span className="text-sm mr-1">{formatNumber(tweet.replies)}</span>
              <MessageCircle className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};