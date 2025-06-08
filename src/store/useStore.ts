import { create } from 'zustand';
import { User, Tweet, Notification, Conversation } from '../types';

interface AppState {
  // UI state
  isComposing: boolean;
  selectedTweet: Tweet | null;
  showAuthModal: boolean;
  
  // Notifications
  notifications: Notification[];
  unreadNotifications: number;
  
  // Messages
  conversations: Conversation[];
  
  // Actions
  setComposing: (isComposing: boolean) => void;
  setSelectedTweet: (tweet: Tweet | null) => void;
  setShowAuthModal: (show: boolean) => void;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  markNotificationAsRead: (notificationId: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
  isComposing: false,
  selectedTweet: null,
  showAuthModal: false,
  notifications: [],
  unreadNotifications: 0,
  conversations: [],

  setComposing: (isComposing) => set({ isComposing }),
  setSelectedTweet: (tweet) => set({ selectedTweet: tweet }),
  setShowAuthModal: (show) => set({ showAuthModal: show }),

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