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