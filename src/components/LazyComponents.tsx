import { lazy } from 'react';

// Lazy load heavy components to improve initial bundle size
export const LazyTweetDetailPage = lazy(() => 
  import('./Tweet/TweetDetailPage').then(module => ({ default: module.TweetDetailPage }))
);

export const LazyComposePage = lazy(() => 
  import('./Tweet/ComposePage').then(module => ({ default: module.ComposePage }))
);

export const LazyProfilePage = lazy(() => 
  import('./Profile/ProfilePage').then(module => ({ default: module.ProfilePage }))
);

export const LazyUserProfilePage = lazy(() => 
  import('./Profile/UserProfilePage').then(module => ({ default: module.UserProfilePage }))
);

export const LazyOptimizedSearchPage = lazy(() => 
  import('./Search/OptimizedSearchPage').then(module => ({ default: module.OptimizedSearchPage }))
);

export const LazyHashtagPage = lazy(() => 
  import('./Search/HashtagPage').then(module => ({ default: module.HashtagPage }))
);

export const LazyNotificationsPage = lazy(() => 
  import('./Notifications/NotificationsPage').then(module => ({ default: module.NotificationsPage }))
);

export const LazyMessagesPage = lazy(() => 
  import('./Messages/MessagesPage').then(module => ({ default: module.MessagesPage }))
);

export const LazyEditProfileModal = lazy(() => 
  import('./Profile/EditProfileModal').then(module => ({ default: module.EditProfileModal }))
);