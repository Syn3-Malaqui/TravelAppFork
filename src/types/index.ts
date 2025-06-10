export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio?: string;
  verified: boolean;
  followers: number;
  following: number;
  joinedDate: Date;
  coverImage?: string;
}

export interface Tweet {
  id: string;
  content: string;
  author: User;
  createdAt: Date;
  likes: number;
  retweets: number;
  replies: number;
  views: number;
  images?: string[];
  isLiked: boolean;
  isRetweeted: boolean;
  isBookmarked: boolean;
  replyTo?: string;
  hashtags: string[];
  mentions: string[];
  tags?: string[];
  // Retweet fields
  isRetweet?: boolean;
  originalTweet?: Tweet;
  retweetedBy?: User;
}

export interface Notification {
  id: string;
  type: 'like' | 'retweet' | 'follow' | 'reply' | 'mention';
  from: User;
  tweet?: Tweet;
  createdAt: Date;
  read: boolean;
}

export interface Message {
  id: string;
  content: string;
  sender: User;
  recipient: User;
  createdAt: Date;
  read: boolean;
}

export interface Conversation {
  id: string;
  participants: User[];
  lastMessage: Message;
  unreadCount: number;
}

// Database types
export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string;
  verified: boolean;
  followers_count: number;
  following_count: number;
  created_at: string;
  updated_at: string;
}

export interface TweetData {
  id: string;
  content: string;
  author_id: string;
  reply_to: string | null;
  image_urls: string[];
  hashtags: string[];
  mentions: string[];
  tags: string[];
  likes_count: number;
  retweets_count: number;
  replies_count: number;
  views_count: number;
  created_at: string;
  updated_at: string;
  // Retweet fields
  is_retweet?: boolean;
  original_tweet_id?: string;
}

export interface TweetWithProfile extends TweetData {
  profiles: Profile;
  original_tweet?: TweetWithProfile;
}

// Available tweet tags
export const TWEET_TAGS = [
  'Car Rentals',
  'Hotels', 
  'Tourist Spots'
] as const;

export type TweetTag = typeof TWEET_TAGS[number];