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
  country?: string;
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
  replyTo?: string; // ID of the tweet this is replying to
  hashtags: string[];
  mentions: string[];
  tags?: string[];
  // Retweet information
  retweetedBy?: User;
  retweetedAt?: Date;
  isRetweet?: boolean;
  originalTweet?: Tweet;
}

export interface Notification {
  id: string;
  type: 'like' | 'retweet' | 'follow' | 'reply';
  actor: User;
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
  country: string;
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
  is_retweet: boolean;
  original_tweet_id: string | null;
}

export interface TweetWithProfile extends TweetData {
  profiles: Profile;
  original_tweet?: TweetWithProfile;
}

export interface NotificationData {
  id: string;
  recipient_id: string;
  actor_id: string;
  type: 'like' | 'retweet' | 'follow' | 'reply';
  tweet_id: string | null;
  read: boolean;
  created_at: string;
}

export interface NotificationWithProfile extends NotificationData {
  actor_profile: Profile;
  tweet?: TweetWithProfile;
}

// Available tweet categories
export const TWEET_CATEGORIES = [
  'General Discussions',
  'Visas',
  'Hotels',
  'Car Rental',
  'Tourist Schedules',
  'Flights',
  'Restaurants and Coffees',
  'Images and Creators',
  'Real Estate'
] as const;

export type TweetCategory = typeof TWEET_CATEGORIES[number];

// Available countries for filtering
export const FILTER_COUNTRIES = [
  { code: 'ALL', name: 'All Countries', flag: '🌍' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
] as const;

export type FilterCountry = typeof FILTER_COUNTRIES[number];

// Legacy type for backward compatibility
export type TweetTag = TweetCategory;
export const TWEET_TAGS = TWEET_CATEGORIES;