import { create } from 'zustand';
import { User, Tweet, Notification, Conversation } from '../types';

interface AppState {
  // User state
  currentUser: User | null;
  users: User[];
  
  // Tweet state
  tweets: Tweet[];
  timeline: Tweet[];
  
  // UI state
  isComposing: boolean;
  selectedTweet: Tweet | null;
  
  // Notifications
  notifications: Notification[];
  unreadNotifications: number;
  
  // Messages
  conversations: Conversation[];
  
  // Actions
  setCurrentUser: (user: User) => void;
  addTweet: (tweet: Omit<Tweet, 'id' | 'createdAt'>) => void;
  likeTweet: (tweetId: string) => void;
  retweetTweet: (tweetId: string) => void;
  bookmarkTweet: (tweetId: string) => void;
  deleteTweet: (tweetId: string) => void;
  followUser: (userId: string) => void;
  setComposing: (isComposing: boolean) => void;
  setSelectedTweet: (tweet: Tweet | null) => void;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  markNotificationAsRead: (notificationId: string) => void;
}

// Mock data
const mockUsers: User[] = [
  {
    id: '1',
    username: 'elonmusk',
    displayName: 'Elon Musk',
    avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150',
    verified: true,
    followers: 150000000,
    following: 104,
    joinedDate: new Date('2009-06-02'),
    bio: 'CEO of Tesla, SpaceX, and X',
  },
  {
    id: '2',
    username: 'billgates',
    displayName: 'Bill Gates',
    avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150',
    verified: true,
    followers: 60000000,
    following: 274,
    joinedDate: new Date('2009-06-25'),
    bio: 'Co-chair of the Bill & Melinda Gates Foundation',
  },
  {
    id: '3',
    username: 'you',
    displayName: 'You',
    avatar: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150',
    verified: false,
    followers: 42,
    following: 156,
    joinedDate: new Date('2020-03-15'),
    bio: 'Just another Twitter user',
  },
];

const mockTweets: Tweet[] = [
  {
    id: '1',
    content: 'The future of sustainable transport is here! Our latest Tesla model achieves unprecedented efficiency. #Tesla #ElectricVehicles #Innovation',
    author: mockUsers[0],
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    likes: 36300,
    retweets: 11200,
    replies: 13100,
    views: 974000,
    images: ['https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=600'],
    isLiked: false,
    isRetweeted: false,
    isBookmarked: false,
    hashtags: ['Tesla', 'ElectricVehicles', 'Innovation'],
    mentions: [],
  },
  {
    id: '2',
    content: 'Working on some exciting new features for X. The platform continues to evolve and improve every day. What features would you like to see next?',
    author: mockUsers[0],
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    likes: 28500,
    retweets: 8900,
    replies: 15600,
    views: 856000,
    isLiked: true,
    isRetweeted: false,
    isBookmarked: true,
    hashtags: [],
    mentions: [],
  },
  {
    id: '3',
    content: 'Climate change remains one of the most pressing challenges of our time. We must continue to invest in clean energy and sustainable technologies. The future depends on the actions we take today.',
    author: mockUsers[1],
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    likes: 45200,
    retweets: 18700,
    replies: 9800,
    views: 1200000,
    isLiked: false,
    isRetweeted: true,
    isBookmarked: false,
    hashtags: [],
    mentions: [],
  },
];

export const useStore = create<AppState>((set, get) => ({
  currentUser: mockUsers[2],
  users: mockUsers,
  tweets: mockTweets,
  timeline: mockTweets,
  isComposing: false,
  selectedTweet: null,
  notifications: [],
  unreadNotifications: 0,
  conversations: [],

  setCurrentUser: (user) => set({ currentUser: user }),

  addTweet: (tweetData) => {
    const newTweet: Tweet = {
      ...tweetData,
      id: Date.now().toString(),
      createdAt: new Date(),
      likes: 0,
      retweets: 0,
      replies: 0,
      views: 0,
      isLiked: false,
      isRetweeted: false,
      isBookmarked: false,
    };
    
    set((state) => ({
      tweets: [newTweet, ...state.tweets],
      timeline: [newTweet, ...state.timeline],
    }));
  },

  likeTweet: (tweetId) => {
    set((state) => ({
      tweets: state.tweets.map((tweet) =>
        tweet.id === tweetId
          ? {
              ...tweet,
              isLiked: !tweet.isLiked,
              likes: tweet.isLiked ? tweet.likes - 1 : tweet.likes + 1,
            }
          : tweet
      ),
      timeline: state.timeline.map((tweet) =>
        tweet.id === tweetId
          ? {
              ...tweet,
              isLiked: !tweet.isLiked,
              likes: tweet.isLiked ? tweet.likes - 1 : tweet.likes + 1,
            }
          : tweet
      ),
    }));
  },

  retweetTweet: (tweetId) => {
    set((state) => ({
      tweets: state.tweets.map((tweet) =>
        tweet.id === tweetId
          ? {
              ...tweet,
              isRetweeted: !tweet.isRetweeted,
              retweets: tweet.isRetweeted ? tweet.retweets - 1 : tweet.retweets + 1,
            }
          : tweet
      ),
      timeline: state.timeline.map((tweet) =>
        tweet.id === tweetId
          ? {
              ...tweet,
              isRetweeted: !tweet.isRetweeted,
              retweets: tweet.isRetweeted ? tweet.retweets - 1 : tweet.retweets + 1,
            }
          : tweet
      ),
    }));
  },

  bookmarkTweet: (tweetId) => {
    set((state) => ({
      tweets: state.tweets.map((tweet) =>
        tweet.id === tweetId
          ? { ...tweet, isBookmarked: !tweet.isBookmarked }
          : tweet
      ),
      timeline: state.timeline.map((tweet) =>
        tweet.id === tweetId
          ? { ...tweet, isBookmarked: !tweet.isBookmarked }
          : tweet
      ),
    }));
  },

  deleteTweet: (tweetId) => {
    set((state) => ({
      tweets: state.tweets.filter((tweet) => tweet.id !== tweetId),
      timeline: state.timeline.filter((tweet) => tweet.id !== tweetId),
    }));
  },

  followUser: (userId) => {
    set((state) => ({
      users: state.users.map((user) =>
        user.id === userId
          ? { ...user, followers: user.followers + 1 }
          : user
      ),
    }));
  },

  setComposing: (isComposing) => set({ isComposing }),
  setSelectedTweet: (tweet) => set({ selectedTweet: tweet }),

  addNotification: (notificationData) => {
    const newNotification: Notification = {
      ...notificationData,
      id: Date.now().toString(),
      read: false,
    };
    
    set((state) => ({
      notifications: [newNotification, ...state.notifications],
      unreadNotifications: state.unreadNotifications + 1,
    }));
  },

  markNotificationAsRead: (notificationId) => {
    set((state) => ({
      notifications: state.notifications.map((notification) =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      ),
      unreadNotifications: Math.max(0, state.unreadNotifications - 1),
    }));
  },
}));