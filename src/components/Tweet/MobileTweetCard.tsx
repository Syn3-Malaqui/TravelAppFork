import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  Heart, 
  MessageCircle, 
  Repeat2, 
  Share, 
  MoreHorizontal,
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

interface MobileTweetCardProps {
  tweet: Tweet;
  onLike: () => void;
  onRetweet: () => void;
  onBookmark: () => void;
  currentUserId?: string;
}

export const MobileTweetCard: React.FC<MobileTweetCardProps> = ({ 
  tweet, 
  onLike, 
  onRetweet, 
  onBookmark, 
  currentUserId 
}) => {
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
    <div className="border-b border-gray-100 p-4 bg-white">
      <div className="flex flex-row-reverse gap-3">
        {/* Avatar - Back on the right */}
        <Avatar className="w-10 h-10 flex-shrink-0">
          <AvatarImage src={tweet.author.avatar} />
          <AvatarFallback>{tweet.author.displayName[0]}</AvatarFallback>
        </Avatar>

        {/* Content - Back on the left but text-aligned right */}
        <div className="flex-1 min-w-0 text-right mr-1">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            {/* More Options - Back on the left */}
            <div className="relative">
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-gray-100 flex-shrink-0">
                    <MoreHorizontal className="h-4 w-4 text-gray-500" />
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

            {/* User info and timestamp - Back on the right */}
            <div className="flex items-center space-x-1 flex-row-reverse min-w-0">
              <span className="text-gray-500 text-sm flex-shrink-0">
                {formatDistanceToNow(tweet.createdAt, { addSuffix: true }).replace('about ', '')}
              </span>
              <span className="text-gray-500 text-sm">·</span>
              <span className="text-gray-500 text-sm truncate">
                @{tweet.author.username}
              </span>
              {tweet.author.verified && (
                <CheckCircle className="w-4 h-4 text-blue-500 fill-current flex-shrink-0" />
              )}
              <span className="font-bold text-gray-900 text-sm truncate">
                {tweet.author.displayName}
              </span>
            </div>
          </div>

          {/* Tweet Text */}
          <div className="text-gray-900 mb-3 text-sm leading-5 text-right">
            {tweet.content.split(' ').map((word, index) => {
              if (word.startsWith('#')) {
                return (
                  <span key={index} className="text-blue-500">
                    {word}{' '}
                  </span>
                );
              }
              if (word.startsWith('@')) {
                return (
                  <span key={index} className="text-blue-500">
                    {word}{' '}
                  </span>
                );
              }
              return word + ' ';
            })}
          </div>

          {/* Images - Fixed aspect ratio */}
          {tweet.images && tweet.images.length > 0 && (
            <div className="mb-3 rounded-xl overflow-hidden">
              <div className="w-full aspect-[4/3]">
                <img 
                  src={tweet.images[0]} 
                  alt="Tweet image" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {/* Actions - Now aligned to the right */}
          <div className="flex items-center justify-end space-x-4 mt-2">
            {/* Reply */}
            <Button variant="ghost" size="sm" className="text-gray-500 p-1 h-8 flex items-center">
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs ml-1">{formatNumber(tweet.replies)}</span>
            </Button>

            {/* Retweet */}
            <Button 
              variant="ghost" 
              size="sm" 
              className={`p-1 h-8 flex items-center ${
                tweet.isRetweeted 
                  ? 'text-green-500' 
                  : 'text-gray-500'
              }`}
              onClick={onRetweet}
            >
              <Repeat2 className="w-4 h-4" />
              <span className="text-xs ml-1">{formatNumber(tweet.retweets)}</span>
            </Button>

            {/* Like */}
            <Button 
              variant="ghost" 
              size="sm" 
              className={`p-1 h-8 flex items-center ${
                tweet.isLiked 
                  ? 'text-red-500' 
                  : 'text-gray-500'
              }`}
              onClick={onLike}
            >
              <Heart className={`w-4 h-4 ${tweet.isLiked ? 'fill-current' : ''}`} />
              <span className="text-xs ml-1">{formatNumber(tweet.likes)}</span>
            </Button>

            {/* Share */}
            <Button variant="ghost" size="sm" className="text-gray-500 p-1 h-8">
              <Share className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};