import React, { useState, useRef, useEffect } from 'react';
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
  ChevronUp,
  X,
  CornerUpLeft
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

interface TweetCardProps {
  tweet: Tweet;
  onLike: () => void;
  onRetweet: () => void;
  onBookmark: () => void;
  currentUserId?: string;
  isReply?: boolean;
  parentTweetId?: string; // ID of the parent tweet in the thread
}

// Function to detect if text contains Arabic characters
const isArabicText = (text: string): boolean => {
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
  return arabicRegex.test(text);
};

// Function to get text direction based on content
const getTextDirection = (text: string): 'ltr' | 'rtl' => {
  return isArabicText(text) ? 'rtl' : 'ltr';
};

export const TweetCard: React.FC<TweetCardProps> = ({ 
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
    // TODO: Implement actual delete functionality
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

      const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
      
      const formattedTweet: Tweet = {
        id: data.id,
        content: data.content,
        author: {
          id: profile.id,
          username: profile.username,
          displayName: profile.display_name,
          avatar: profile.avatar_url || '',
          bio: profile.bio,
          verified: profile.verified,
          followers: profile.followers_count,
          following: profile.following_count,
          country: profile.country,
          joinedDate: new Date(profile.created_at),
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
    
    // Create the full URL for sharing
    const tweetUrl = `${window.location.origin}/tweet/${tweet.id}`;
    
    // Use Web Share API if available
    if (navigator.share) {
      navigator.share({
        title: `Tweet by ${tweet.author.displayName}`,
        text: tweet.content.substring(0, 100) + (tweet.content.length > 100 ? '...' : ''),
        url: tweetUrl
      }).catch(err => {
        console.error('Error sharing:', err);
        // Fallback to copying to clipboard
        copyToClipboard(tweetUrl);
      });
    } else {
      // Fallback for browsers that don't support Web Share API
      copyToClipboard(tweetUrl);
    }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        alert('Link copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy:', err);
      });
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

  // Enhanced text parsing function with better hashtag handling for Arabic
  const parseTextWithLinks = (text: string) => {
    const parts: JSX.Element[] = [];
    let currentIndex = 0;

    // Improved regex patterns for better text parsing
    const patterns = [
      // Hashtag pattern: # followed by word characters (including Arabic), numbers, underscores
      // Stops at whitespace, punctuation, or other special characters
      { 
        regex: /#[\w\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+/g, 
        type: 'hashtag' 
      },
      // Mention pattern: @ followed by word characters, numbers, underscores
      { 
        regex: /@[a-zA-Z0-9_]+/g, 
        type: 'mention' 
      },
      // URL pattern: http(s) URLs
      { 
        regex: /https?:\/\/[^\s]+/g, 
        type: 'url' 
      }
    ];

    // Find all matches for all patterns
    const allMatches: Array<{
      match: string;
      index: number;
      endIndex: number;
      type: string;
    }> = [];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.regex.exec(text)) !== null) {
        allMatches.push({
          match: match[0],
          index: match.index,
          endIndex: match.index + match[0].length,
          type: pattern.type
        });
      }
    });

    // Sort matches by index
    allMatches.sort((a, b) => a.index - b.index);

    // Build the JSX elements
    allMatches.forEach((matchObj, i) => {
      const key = `${i}-${matchObj.type}-${matchObj.match}`;
      
      // Add text before this match (if any)
      if (matchObj.index > currentIndex) {
        const beforeText = text.slice(currentIndex, matchObj.index);
        if (beforeText) {
          parts.push(<span key={`text-${currentIndex}`}>{beforeText}</span>);
        }
      }

      // Add the matched element
      if (matchObj.type === 'hashtag') {
        parts.push(
          <span key={key}>
            <span 
              className="text-blue-500 hover:text-blue-600 hover:underline cursor-pointer font-medium transition-colors"
              onClick={(e) => handleHashtagClick(matchObj.match, e)}
            >
              {matchObj.match}
            </span>
          </span>
        );
      } else if (matchObj.type === 'mention') {
        parts.push(
          <span key={key}>
            <span 
              className="text-blue-500 hover:text-blue-600 hover:underline cursor-pointer font-medium transition-colors"
              onClick={(e) => handleMentionClick(matchObj.match, e)}
            >
              {matchObj.match}
            </span>
          </span>
        );
      } else if (matchObj.type === 'url') {
        parts.push(
          <span key={key}>
            <a 
              href={matchObj.match}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600 hover:underline transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {matchObj.match}
            </a>
          </span>
        );
      }

      currentIndex = matchObj.endIndex;
    });

    // Add any remaining text
    if (currentIndex < text.length) {
      const remainingText = text.slice(currentIndex);
      if (remainingText) {
        parts.push(<span key={`text-${currentIndex}`}>{remainingText}</span>);
      }
    }

    // If no matches found, return the original text
    if (parts.length === 0) {
      return text;
    }

    return parts;
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
        className={`w-full border-b border-gray-200 transition-colors hover:bg-gray-50 cursor-pointer ${isReply ? 'ml-12 border-l-2 border-gray-200' : ''}`}
      >
        {/* Retweet indicator */}
        {tweet.isRetweet && tweet.retweetedBy && (
          <div className="px-4 pt-2 pb-0.5">
            <div className="flex items-center space-x-2 text-gray-500 text-sm">
              <Repeat2 className="w-4 h-4" />
              <span 
                className="hover:underline cursor-pointer"
                onClick={handleRetweeterProfileClick}
              >
                <span className="font-medium">{tweet.retweetedBy.displayName}</span> retweeted
              </span>
              {tweet.retweetedBy.verified && (
                <CheckCircle className="w-4 h-4 text-blue-500 fill-current" />
              )}
              <span>·</span>
              <span>{formatDistanceToNow(tweet.retweetedAt!, { addSuffix: true })}</span>
            </div>
          </div>
        )}

        {/* Reply indicator */}
        {tweet.replyTo && (
          <div className="px-4 pt-2 pb-0.5">
            <div className="flex items-center space-x-2 text-gray-500 text-sm">
              <CornerUpLeft className="w-4 h-4" />
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
          className="w-full px-4 py-2"
          onClick={handleTweetClick}
        >
          <div className="flex gap-3 w-full">
            {/* Avatar */}
            <LazyAvatar
              src={tweet.author.avatar}
              fallback={tweet.author.displayName[0]}
              className="w-10 h-10 flex-shrink-0 cursor-pointer"
              onClick={handleProfileClick}
              size={80}
            />

            {/* Tweet Content */}
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-center justify-between mb-0.5">
                {/* User info and timestamp */}
                <div className="flex items-center space-x-1 min-w-0">
                  <span 
                    className="font-bold text-gray-900 hover:underline cursor-pointer truncate"
                    onClick={handleProfileClick}
                  >
                    {tweet.author.displayName}
                  </span>
                  {tweet.author.verified && (
                    <CheckCircle className="w-5 h-5 text-blue-500 fill-current flex-shrink-0" />
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

              {/* Tweet Text with Enhanced Link Parsing */}
              <div 
                className="text-gray-900 mb-2 text-[15px] leading-5"
                dir={getTextDirection(tweet.content)}
                style={{ textAlign: getTextDirection(tweet.content) === 'rtl' ? 'right' : 'left' }}
              >
                {parseTextWithLinks(displayContent)}
                {tweet.content.length > 200 && (
                  <span className="text-gray-500 text-sm italic"> (truncated)</span>
                )}
              </div>

              {/* Original Tweet Preview (for replies) */}
              {originalTweet && (
                <div className="mb-2 border border-gray-200 rounded-xl p-3 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                     onClick={(e) => {
                       e.stopPropagation();
                       // Navigate to the original tweet's author profile or tweet detail
                       navigate(`/profile/${originalTweet.author.username}`);
                     }}>
                  <div className="flex items-start space-x-3">
                    <LazyAvatar
                      src={originalTweet.author.avatar}
                      fallback={originalTweet.author.displayName[0]}
                      className="w-8 h-8 flex-shrink-0"
                      size={64}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1 mb-1">
                        <span className="font-bold text-gray-900 text-sm truncate">
                          {originalTweet.author.displayName}
                        </span>
                        {originalTweet.author.verified && (
                          <CheckCircle className="w-4 h-4 text-blue-500 fill-current flex-shrink-0" />
                        )}
                        <span className="text-gray-500 text-sm truncate">
                          @{originalTweet.author.username}
                        </span>
                        <span className="text-gray-500 text-sm">·</span>
                        <span className="text-gray-500 text-sm flex-shrink-0">
                          {formatDistanceToNow(originalTweet.createdAt, { addSuffix: true })}
                        </span>
                      </div>
                      <p 
                        className="text-gray-700 text-sm line-clamp-3"
                        dir={getTextDirection(originalTweet.content)}
                        style={{ textAlign: getTextDirection(originalTweet.content) === 'rtl' ? 'right' : 'left' }}
                      >
                        {originalTweet.content}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Images */}
              {tweet.images && tweet.images.length > 0 && (
                <div className="mb-2 rounded-2xl overflow-hidden border border-gray-200">
                  {tweet.images.length === 1 ? (
                    // Single image - centered and fills container
                    <div className="w-full aspect-[16/9] cursor-pointer" onClick={(e) => handleImageClick(0, e)}>
                      <LazyImage 
                        src={tweet.images[0]} 
                        alt="Tweet image" 
                        className="w-full h-full hover:opacity-95 transition-opacity"
                        width={600}
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
                            width={400}
                            quality={80}
                          />
                        </div>
                      ))}
                    </div>
                  ) : tweet.images.length === 3 ? (
                    // Three images - first takes full left side, two small on right, all centered
                    <div className="grid grid-cols-2 grid-rows-2 gap-1 h-80">
                      <div className="row-span-2 cursor-pointer" onClick={(e) => handleImageClick(0, e)}>
                        <LazyImage 
                          src={tweet.images[0]} 
                          alt="Tweet image 1" 
                          className="w-full h-full hover:opacity-95 transition-opacity"
                          width={400}
                          quality={80}
                        />
                      </div>
                      <div className="cursor-pointer" onClick={(e) => handleImageClick(1, e)}>
                        <LazyImage 
                          src={tweet.images[1]} 
                          alt="Tweet image 2" 
                          className="w-full h-full hover:opacity-95 transition-opacity"
                          width={300}
                          quality={80}
                        />
                      </div>
                      <div className="cursor-pointer" onClick={(e) => handleImageClick(2, e)}>
                        <LazyImage 
                          src={tweet.images[2]} 
                          alt="Tweet image 3" 
                          className="w-full h-full hover:opacity-95 transition-opacity"
                          width={300}
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
                            width={300}
                            quality={80}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between mt-1">
                {/* Reply */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-gray-500 hover:text-blue-500 hover:bg-blue-50 px-3 py-2 flex items-center gap-1 -ml-2"
                  onClick={(e) => handleReplyClick(e)}
                >
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-sm">{formatNumber(tweet.replies)}</span>
                </Button>

                {/* Retweet */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`px-3 py-2 flex items-center gap-1 ${
                    tweet.isRetweeted 
                      ? 'text-green-500 hover:text-green-600 hover:bg-green-50' 
                      : 'text-gray-500 hover:text-green-500 hover:bg-green-50'
                  }`}
                  onClick={handleRetweetClick}
                >
                  <Repeat2 className="w-5 h-5" />
                  <span className="text-sm">{formatNumber(tweet.retweets)}</span>
                </Button>

                {/* Like */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`px-3 py-2 flex items-center gap-1 ${
                    tweet.isLiked 
                      ? 'text-red-500 hover:text-red-600 hover:bg-red-50' 
                      : 'text-gray-500 hover:text-red-500 hover:bg-red-50'
                  }`}
                  onClick={handleLikeClick}
                >
                  <Heart className={`w-5 h-5 ${tweet.isLiked ? 'fill-current' : ''}`} />
                  <span className="text-sm">{formatNumber(tweet.likes)}</span>
                </Button>

                {/* Views */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-gray-500 hover:text-blue-500 hover:bg-blue-50 px-3 py-2 flex items-center gap-1"
                  onClick={handleViewsClick}
                >
                  <Eye className="w-5 h-5" />
                  <span className="text-sm">{formatNumber(tweet.views)}</span>
                </Button>

                {/* Share & Bookmark */}
                <div className="flex">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`px-2 py-2 ${
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
                    className="text-gray-500 hover:text-blue-500 hover:bg-blue-50 px-2 py-2"
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
              <TweetCard
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
          <div className="relative max-w-4xl max-h-full w-full h-full flex items-center justify-center p-4">
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