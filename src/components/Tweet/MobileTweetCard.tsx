import React, { useState, useRef, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  Heart, 
  MessageCircle, 
  Repeat2, 
  Share, 
  MoreHorizontal,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  X,
  CornerUpLeft,
  Eye
} from 'lucide-react';
import { Button } from '../ui/button';
import { LazyAvatar } from '../ui/LazyAvatar';
import { LazyImage } from '../ui/LazyImage';
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
import { useTweetViews } from '../../hooks/useTweetViews';
import { supabase } from '../../lib/supabase';

interface MobileTweetCardProps {
  tweet: Tweet;
  onLike: () => void;
  onRetweet: () => void;
  onBookmark: () => void;
  currentUserId?: string;
  isReply?: boolean;
  parentTweetId?: string; // ID of the parent tweet in the thread
}

export const MobileTweetCard: React.FC<MobileTweetCardProps> = ({ 
  tweet, 
  onLike, 
  onRetweet, 
  onBookmark, 
  currentUserId,
  isReply = false,
  parentTweetId
}) => {
  const navigate = useNavigate();
  const [showReplies, setShowReplies] = useState(false);
  const [showReplyComposer, setShowReplyComposer] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [originalTweet, setOriginalTweet] = useState<Tweet | null>(null);
  const [loadingOriginal, setLoadingOriginal] = useState(false);
  const [replyingToTweetId, setReplyingToTweetId] = useState<string | null>(null);
  const { replies, fetchReplies, createRetweet, removeRetweet } = useTweets();
  const { observeTweet, unobserveTweet, recordView } = useTweetViews();
  const tweetRef = useRef<HTMLDivElement>(null);

  // Set up view tracking
  useEffect(() => {
    const element = tweetRef.current;
    if (element && !isReply) { // Only track views for main tweets, not replies
      observeTweet(element, tweet.id);
      
      return () => {
        unobserveTweet(element);
      };
    }
  }, [tweet.id, isReply, observeTweet, unobserveTweet]);

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

  const fetchOriginalTweet = async (replyToId: string) => {
    try {
      setLoadingOriginal(true);
      
      const { data, error } = await supabase
        .from('tweets')
        .select(`
          id,
          content,
          author_id,
          image_urls,
          hashtags,
          mentions,
          tags,
          likes_count,
          retweets_count,
          replies_count,
          views_count,
          created_at,
          profiles!tweets_author_id_fkey (
            id,
            username,
            display_name,
            avatar_url,
            bio,
            verified,
            followers_count,
            following_count,
            country,
            created_at
          )
        `)
        .eq('id', replyToId)
        .single();

      if (error) throw error;

      // Get current user to check likes/retweets/bookmarks
      const { data: { user } } = await supabase.auth.getUser();
      
      let userLikes: string[] = [];
      let userRetweets: string[] = [];
      let userBookmarks: string[] = [];
      
      if (user) {
        const [likesResult, retweetsResult, bookmarksResult] = await Promise.all([
          supabase
            .from('likes')
            .select('tweet_id')
            .eq('user_id', user.id)
            .eq('tweet_id', data.id),
          supabase
            .from('retweets')
            .select('tweet_id')
            .eq('user_id', user.id)
            .eq('tweet_id', data.id),
          supabase
            .from('bookmarks')
            .select('tweet_id')
            .eq('user_id', user.id)
            .eq('tweet_id', data.id)
        ]);
        
        userLikes = likesResult.data?.map(like => like.tweet_id) || [];
        userRetweets = retweetsResult.data?.map(retweet => retweet.tweet_id) || [];
        userBookmarks = bookmarksResult.data?.map(bookmark => bookmark.tweet_id) || [];
      }

      const formattedTweet: Tweet = {
        id: data.id,
        content: data.content,
        author: {
          id: data.profiles.id,
          username: data.profiles.username,
          displayName: data.profiles.display_name,
          avatar: data.profiles.avatar_url || '',
          bio: data.profiles.bio,
          verified: data.profiles.verified,
          followers: data.profiles.followers_count,
          following: data.profiles.following_count,
          country: data.profiles.country,
          joinedDate: new Date(data.profiles.created_at),
        },
        createdAt: new Date(data.created_at),
        likes: data.likes_count,
        retweets: data.retweets_count,
        replies: data.replies_count,
        views: data.views_count,
        images: data.image_urls,
        isLiked: userLikes.includes(data.id),
        isRetweeted: userRetweets.includes(data.id),
        isBookmarked: userBookmarks.includes(data.id),
        hashtags: data.hashtags,
        mentions: data.mentions,
        tags: data.tags || [],
      };

      setOriginalTweet(formattedTweet);
    } catch (error) {
      console.error('Error fetching original tweet:', error);
    } finally {
      setLoadingOriginal(false);
    }
  };

  const handleReplyToClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (tweet.replyTo && !originalTweet && !loadingOriginal) {
      await fetchOriginalTweet(tweet.replyTo);
    }
  };

  const handleTweetClick = async () => {
    // Record view when user explicitly clicks on tweet
    await recordView(tweet.id);
    // Navigate to tweet detail page instead of showing replies inline
    navigate(`/tweet/${tweet.id}`);
  };

  const handleReplyClick = (e: React.MouseEvent, targetTweetId?: string) => {
    e.stopPropagation();
    setReplyingToTweetId(targetTweetId || tweet.id);
    setShowReplyComposer(!showReplyComposer);
  };

  const handleReplySuccess = async () => {
    setShowReplyComposer(false);
    setReplyingToTweetId(null);
    // Refresh replies for the main tweet (not individual replies)
    const mainTweetId = parentTweetId || tweet.id;
    await fetchReplies(mainTweetId);
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
    // Handle views functionality - could show who viewed the tweet
  };

  const handleHashtagClick = (hashtag: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const cleanHashtag = hashtag.replace('#', '');
    navigate(`/hashtag/${cleanHashtag}`);
  };

  const handleMentionClick = (mention: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const cleanMention = mention.replace('@', '');
    navigate(`/profile/${cleanMention}`);
  };

  const handleImageClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedImageIndex(index);
  };

  const closeImageModal = () => {
    setSelectedImageIndex(null);
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    if (!tweet.images || selectedImageIndex === null) return;
    
    if (direction === 'prev') {
      setSelectedImageIndex(selectedImageIndex > 0 ? selectedImageIndex - 1 : tweet.images.length - 1);
    } else {
      setSelectedImageIndex(selectedImageIndex < tweet.images.length - 1 ? selectedImageIndex + 1 : 0);
    }
  };

  // Enhanced text parsing function for mobile
  const parseTextWithLinks = (text: string) => {
    const words = text.split(' ');
    return words.map((word, index) => {
      const key = `${index}-${word}`;
      
      if (word.startsWith('#') && word.length > 1) {
        return (
          <span key={key}>
            <span 
              className="text-blue-500 hover:text-blue-600 hover:underline cursor-pointer font-medium transition-colors"
              onClick={(e) => handleHashtagClick(word, e)}
            >
              {word}
            </span>
            {index < words.length - 1 ? ' ' : ''}
          </span>
        );
      }
      
      if (word.startsWith('@') && word.length > 1) {
        return (
          <span key={key}>
            <span 
              className="text-blue-500 hover:text-blue-600 hover:underline cursor-pointer font-medium transition-colors"
              onClick={(e) => handleMentionClick(word, e)}
            >
              {word}
            </span>
            {index < words.length - 1 ? ' ' : ''}
          </span>
        );
      }
      
      // Check for URLs
      if (word.match(/^https?:\/\/.+/)) {
        return (
          <span key={key}>
            <a 
              href={word}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600 hover:underline transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {word}
            </a>
            {index < words.length - 1 ? ' ' : ''}
          </span>
        );
      }
      
      return word + (index < words.length - 1 ? ' ' : '');
    });
  };

  const isOwnTweet = currentUserId === tweet.author.id;
  const tweetReplies = replies[parentTweetId || tweet.id] || [];
  const hasReplies = tweet.replies > 0 && !isReply;

  // Truncate content if it exceeds 200 characters (for display purposes)
  const displayContent = tweet.content.length > 200 
    ? tweet.content.substring(0, 200) + '...' 
    : tweet.content;

  // Check if this tweet is replying to someone (has @mention at the start)
  const isReplyToReply = isReply && tweet.content.startsWith('@');

  return (
    <>
      <div 
        ref={tweetRef}
        className={`border-b border-gray-100 bg-white ${isReply ? 'ml-8 border-l-2 border-gray-200' : ''}`}
      >
        {/* Retweet indicator */}
        {tweet.isRetweet && tweet.retweetedBy && (
          <div className="px-4 pt-3 pb-1">
            <div className="flex items-center space-x-2 text-gray-500 text-xs">
              <Repeat2 className="w-3 h-3" />
              <span 
                className="hover:underline cursor-pointer"
                onClick={handleRetweeterProfileClick}
              >
                <span className="font-medium">{tweet.retweetedBy.displayName}</span> retweeted
              </span>
              {tweet.retweetedBy.verified && (
                <CheckCircle className="w-3 h-3 text-blue-500 fill-current" />
              )}
              <span>·</span>
              <span>{formatDistanceToNow(tweet.retweetedAt!, { addSuffix: true }).replace('about ', '')}</span>
            </div>
          </div>
        )}

        {/* Reply indicator */}
        {tweet.replyTo && (
          <div className="px-4 pt-3 pb-1">
            <div className="flex items-center space-x-2 text-gray-500 text-xs">
              <CornerUpLeft className="w-3 h-3" />
              <span>Replying to</span>
              <button
                onClick={handleReplyToClick}
                className="text-blue-500 hover:text-blue-600 hover:underline font-medium transition-colors"
              >
                {loadingOriginal ? 'Loading...' : originalTweet ? `@${originalTweet.author.username}` : 'a tweet'}
              </button>
            </div>
          </div>
        )}

        <div 
          className="p-4 cursor-pointer"
          onClick={handleTweetClick}
        >
          <div className="flex gap-3">
            {/* Avatar */}
            <LazyAvatar
              src={tweet.author.avatar}
              fallback={tweet.author.displayName[0]}
              className="w-10 h-10 flex-shrink-0 cursor-pointer"
              onClick={handleProfileClick}
              size={80}
            />

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-center justify-between mb-1">
                {/* User info and timestamp */}
                <div className="flex items-center space-x-1 min-w-0">
                  <span 
                    className="font-bold text-gray-900 text-sm truncate cursor-pointer hover:underline"
                    onClick={handleProfileClick}
                  >
                    {tweet.author.displayName}
                  </span>
                  {tweet.author.verified && (
                    <CheckCircle className="w-4 h-4 text-blue-500 fill-current flex-shrink-0" />
                  )}
                  <span 
                    className="text-gray-500 text-sm truncate cursor-pointer hover:underline"
                    onClick={handleProfileClick}
                  >
                    @{tweet.author.username}
                  </span>
                  <span className="text-gray-500 text-sm">·</span>
                  <span className="text-gray-500 text-sm flex-shrink-0">
                    {formatDistanceToNow(tweet.createdAt, { addSuffix: true }).replace('about ', '')}
                  </span>
                </div>

                {/* More Options */}
                <div className="relative">
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0 hover:bg-gray-100 flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4 text-gray-500" />
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

              {/* Tweet Text with Enhanced Link Parsing */}
              <div className="text-gray-900 mb-3 text-sm leading-5">
                {parseTextWithLinks(displayContent)}
                {tweet.content.length > 200 && (
                  <span className="text-gray-500 text-xs italic"> (truncated)</span>
                )}
              </div>

              {/* Original Tweet Preview (for replies) */}
              {originalTweet && (
                <div className="mb-3 border border-gray-200 rounded-xl p-3 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                     onClick={(e) => {
                       e.stopPropagation();
                       // Navigate to the original tweet's author profile or tweet detail
                       navigate(`/profile/${originalTweet.author.username}`);
                     }}>
                  <div className="flex items-start space-x-2">
                    <LazyAvatar
                      src={originalTweet.author.avatar}
                      fallback={originalTweet.author.displayName[0]}
                      className="w-6 h-6 flex-shrink-0"
                      size={48}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1 mb-1">
                        <span className="font-bold text-gray-900 text-xs truncate">
                          {originalTweet.author.displayName}
                        </span>
                        {originalTweet.author.verified && (
                          <CheckCircle className="w-3 h-3 text-blue-500 fill-current flex-shrink-0" />
                        )}
                        <span className="text-gray-500 text-xs truncate">
                          @{originalTweet.author.username}
                        </span>
                        <span className="text-gray-500 text-xs">·</span>
                        <span className="text-gray-500 text-xs flex-shrink-0">
                          {formatDistanceToNow(originalTweet.createdAt, { addSuffix: true }).replace('about ', '')}
                        </span>
                      </div>
                      <p className="text-gray-700 text-xs line-clamp-2">
                        {originalTweet.content}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Images */}
              {tweet.images && tweet.images.length > 0 && (
                <div className="mb-3 rounded-xl overflow-hidden">
                  {tweet.images.length === 1 ? (
                    // Single image - centered and fills container
                    <div className="w-full aspect-[16/9] cursor-pointer" onClick={(e) => handleImageClick(0, e)}>
                      <LazyImage 
                        src={tweet.images[0]} 
                        alt="Tweet image" 
                        className="w-full h-full hover:opacity-95 transition-opacity"
                        width={400}
                        quality={80}
                      />
                    </div>
                  ) : tweet.images.length === 2 ? (
                    // Two images - side by side, centered and fills container
                    <div className="grid grid-cols-2 gap-1">
                      {tweet.images.map((image, index) => (
                        <div 
                          key={index} 
                          className="aspect-[16/9] cursor-pointer"
                          onClick={(e) => handleImageClick(index, e)}
                        >
                          <LazyImage 
                            src={image} 
                            alt={`Tweet image ${index + 1}`} 
                            className="w-full h-full hover:opacity-95 transition-opacity"
                            width={300}
                            quality={80}
                          />
                        </div>
                      ))}
                    </div>
                  ) : tweet.images.length === 3 ? (
                    // Three images - first takes full left side, two small on right, all centered
                    <div className="grid grid-cols-2 grid-rows-2 gap-1 h-64">
                      <div className="row-span-2 cursor-pointer" onClick={(e) => handleImageClick(0, e)}>
                        <LazyImage 
                          src={tweet.images[0]} 
                          alt="Tweet image 1" 
                          className="w-full h-full hover:opacity-95 transition-opacity"
                          width={300}
                          quality={80}
                        />
                      </div>
                      <div className="cursor-pointer" onClick={(e) => handleImageClick(1, e)}>
                        <LazyImage 
                          src={tweet.images[1]} 
                          alt="Tweet image 2" 
                          className="w-full h-full hover:opacity-95 transition-opacity"
                          width={200}
                          quality={80}
                        />
                      </div>
                      <div className="cursor-pointer" onClick={(e) => handleImageClick(2, e)}>
                        <LazyImage 
                          src={tweet.images[2]} 
                          alt="Tweet image 3" 
                          className="w-full h-full hover:opacity-95 transition-opacity"
                          width={200}
                          quality={80}
                        />
                      </div>
                    </div>
                  ) : (
                    // Four images - 2x2 grid, all centered and fills container
                    <div className="grid grid-cols-2 gap-1">
                      {tweet.images.map((image, index) => (
                        <div 
                          key={index} 
                          className="aspect-[16/9] cursor-pointer"
                          onClick={(e) => handleImageClick(index, e)}
                        >
                          <LazyImage 
                            src={image} 
                            alt={`Tweet image ${index + 1}`} 
                            className="w-full h-full hover:opacity-95 transition-opacity"
                            width={200}
                            quality={80}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between space-x-4 mt-2">
                {/* Reply */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-gray-500 p-1 h-8 flex items-center"
                  onClick={(e) => handleReplyClick(e)}
                >
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
                  onClick={handleRetweetClick}
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
                  onClick={handleLikeClick}
                >
                  <Heart className={`w-4 h-4 ${tweet.isLiked ? 'fill-current' : ''}`} />
                  <span className="text-xs ml-1">{formatNumber(tweet.likes)}</span>
                </Button>

                {/* Views */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-gray-500 p-1 h-8 flex items-center"
                  onClick={handleViewsClick}
                >
                  <Eye className="w-4 h-4" />
                  <span className="text-xs ml-1">{formatNumber(tweet.views)}</span>
                </Button>

                {/* Share */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-gray-500 p-1 h-8"
                  onClick={handleShareClick}
                >
                  <Share className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Reply Composer */}
          {showReplyComposer && (
            <ReplyComposer
              tweet={replyingToTweetId === tweet.id ? tweet : { ...tweet, id: replyingToTweetId! }}
              onCancel={() => {
                setShowReplyComposer(false);
                setReplyingToTweetId(null);
              }}
              onReplySuccess={handleReplySuccess}
              replyingToReply={isReply && replyingToTweetId !== tweet.id}
            />
          )}
        </div>

        {/* Replies */}
        {showReplies && tweetReplies.length > 0 && (
          <div className="border-t border-gray-100">
            {tweetReplies.map((reply) => (
              <MobileTweetCard
                key={reply.id}
                tweet={reply}
                onLike={() => {}} // TODO: Implement reply like
                onRetweet={() => {}} // TODO: Implement reply retweet
                onBookmark={() => {}} // TODO: Implement reply bookmark
                currentUserId={currentUserId}
                isReply={true}
                parentTweetId={tweet.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Image Modal */}
      {selectedImageIndex !== null && tweet.images && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
          <div className="relative max-w-full max-h-full w-full h-full flex items-center justify-center p-4">
            {/* Close button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={closeImageModal}
              className="absolute top-4 right-4 text-white hover:bg-white/20 p-2 rounded-full z-10"
            >
              <X className="h-6 w-6" />
            </Button>

            {/* Navigation buttons */}
            {tweet.images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateImage('prev')}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/20 p-3 rounded-full"
                >
                  <ChevronDown className="h-6 w-6 transform rotate-90" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateImage('next')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/20 p-3 rounded-full"
                >
                  <ChevronDown className="h-6 w-6 transform -rotate-90" />
                </Button>
              </>
            )}

            {/* Image */}
            <img
              src={tweet.images[selectedImageIndex]}
              alt={`Tweet image ${selectedImageIndex + 1}`}
              className="max-w-full max-h-full object-contain object-center"
              loading="eager" // Force immediate loading for modal view
            />

            {/* Image counter */}
            {tweet.images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                {selectedImageIndex + 1} / {tweet.images.length}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};