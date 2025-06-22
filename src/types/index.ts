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
interface Profile {
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

interface TweetData {
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

interface NotificationData {
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
  'Restorants and coffees',
  'Images and creators',
  'Real estate'
] as const;

export type TweetCategory = typeof TWEET_CATEGORIES[number];

// Available countries for filtering - Expanded list
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
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿' },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷' },
  { code: 'PA', name: 'Panama', flag: '🇵🇦' },
  { code: 'GT', name: 'Guatemala', flag: '🇬🇹' },
  { code: 'HN', name: 'Honduras', flag: '🇭🇳' },
  { code: 'SV', name: 'El Salvador', flag: '🇸🇻' },
  { code: 'NI', name: 'Nicaragua', flag: '🇳🇮' },
  { code: 'BZ', name: 'Belize', flag: '🇧🇿' },
  { code: 'JM', name: 'Jamaica', flag: '🇯🇲' },
  { code: 'CU', name: 'Cuba', flag: '🇨🇺' },
  { code: 'DO', name: 'Dominican Republic', flag: '🇩🇴' },
  { code: 'PR', name: 'Puerto Rico', flag: '🇵🇷' },
  { code: 'TT', name: 'Trinidad and Tobago', flag: '🇹🇹' },
  { code: 'BB', name: 'Barbados', flag: '🇧🇧' },
  { code: 'BS', name: 'Bahamas', flag: '🇧🇸' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦' },
  { code: 'KW', name: 'Kuwait', flag: '🇰🇼' },
  { code: 'BH', name: 'Bahrain', flag: '🇧🇭' },
  { code: 'OM', name: 'Oman', flag: '🇴🇲' },
  { code: 'JO', name: 'Jordan', flag: '🇯🇴' },
  { code: 'LB', name: 'Lebanon', flag: '🇱🇧' },
  { code: 'CY', name: 'Cyprus', flag: '🇨🇾' },
  { code: 'MT', name: 'Malta', flag: '🇲🇹' },
  { code: 'IS', name: 'Iceland', flag: '🇮🇸' },
  { code: 'LU', name: 'Luxembourg', flag: '🇱🇺' },
  { code: 'LI', name: 'Liechtenstein', flag: '🇱🇮' },
  { code: 'MC', name: 'Monaco', flag: '🇲🇨' },
  { code: 'AD', name: 'Andorra', flag: '🇦🇩' },
  { code: 'SM', name: 'San Marino', flag: '🇸🇲' },
  { code: 'VA', name: 'Vatican City', flag: '🇻🇦' },
] as const;

export type FilterCountry = typeof FILTER_COUNTRIES[number];

// Legacy type for backward compatibility
type TweetTag = TweetCategory;
const TWEET_TAGS = TWEET_CATEGORIES;