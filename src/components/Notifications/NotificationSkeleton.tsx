import React from 'react';

interface NotificationSkeletonProps {
  isMobile?: boolean;
}

const NotificationSkeleton: React.FC<NotificationSkeletonProps> = ({ isMobile = false }) => {
  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex space-x-3">
        {/* Notification Icon Skeleton */}
        <div className="flex-shrink-0 mt-1">
          <div className="w-6 h-6 bg-gray-200 rounded animate-shimmer"></div>
        </div>

        {/* Actor Avatar Skeleton */}
        <div className="w-10 h-10 bg-gray-200 rounded-full animate-shimmer flex-shrink-0"></div>

        {/* Content Skeleton */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {/* Notification Text Skeleton */}
              <div className="space-y-2 mb-2">
                <div className="h-4 bg-gray-200 rounded animate-shimmer w-full"></div>
                <div className="h-4 bg-gray-200 rounded animate-shimmer w-3/4"></div>
              </div>
              
              {/* Timestamp Skeleton */}
              <div className="h-3 bg-gray-200 rounded animate-shimmer w-20 mb-2"></div>

              {/* Tweet Preview Skeleton (for tweet-related notifications) */}
              {Math.random() > 0.5 && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="h-4 bg-gray-200 rounded animate-shimmer w-full mb-1"></div>
                  <div className="h-4 bg-gray-200 rounded animate-shimmer w-2/3"></div>
                </div>
              )}
            </div>

            {/* Actions Skeleton */}
            <div className="flex items-center space-x-2 ml-2">
              <div className="w-6 h-6 bg-gray-200 rounded animate-shimmer"></div>
              <div className="w-6 h-6 bg-gray-200 rounded animate-shimmer"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const NotificationSkeletonList: React.FC<{ 
  count?: number; 
  isMobile?: boolean;
}> = ({ count = 8, isMobile = false }) => {
  return (
    <div className="divide-y divide-gray-100">
      {Array.from({ length: count }).map((_, index) => (
        <NotificationSkeleton key={index} isMobile={isMobile} />
      ))}
    </div>
  );
};

export const NotificationsPageSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Header Skeleton */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-6 h-6 bg-gray-200 rounded animate-shimmer md:hidden"></div>
            <div className="h-6 bg-gray-200 rounded animate-shimmer w-32"></div>
            <div className="w-8 h-5 bg-blue-200 rounded-full animate-shimmer"></div>
          </div>
          
          <div className="w-6 h-6 bg-gray-200 rounded animate-shimmer"></div>
        </div>
      </div>

      {/* Filter Tabs Skeleton */}
      <div className="border-b border-gray-200">
        <div className="flex">
          <div className="flex-1 py-4 px-4 border-b-2 border-blue-500">
            <div className="h-4 bg-gray-200 rounded animate-shimmer w-8 mx-auto"></div>
          </div>
          <div className="flex-1 py-4 px-4 border-b-2 border-transparent">
            <div className="h-4 bg-gray-200 rounded animate-shimmer w-16 mx-auto"></div>
          </div>
        </div>
      </div>

      {/* Notifications List Skeleton */}
      <div className="pb-20 md:pb-0">
        <NotificationSkeletonList count={10} />
      </div>
    </div>
  );
};