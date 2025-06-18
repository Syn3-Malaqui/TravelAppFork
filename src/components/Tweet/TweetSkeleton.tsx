import React from 'react';

interface TweetSkeletonProps {
  showImages?: boolean;
  isMobile?: boolean;
}

export const TweetSkeleton: React.FC<TweetSkeletonProps> = ({ 
  showImages = false, 
  isMobile = false 
}) => {
  return (
    <div className={`border-b border-gray-100 bg-white ${isMobile ? 'p-4' : 'p-4'}`}>
      <div className="flex gap-3">
        {/* Avatar Skeleton */}
        <div className={`flex-shrink-0 ${isMobile ? 'w-10 h-10' : 'w-12 h-12'} bg-gray-200 rounded-full animate-shimmer`}></div>

        {/* Content Skeleton */}
        <div className="flex-1 min-w-0">
          {/* Header Skeleton */}
          <div className="flex items-center space-x-2 mb-2">
            <div className="h-4 bg-gray-200 rounded animate-shimmer w-24"></div>
            <div className="h-3 bg-gray-200 rounded animate-shimmer w-16"></div>
            <div className="h-3 bg-gray-200 rounded animate-shimmer w-12"></div>
          </div>

          {/* Text Content Skeleton */}
          <div className="space-y-2 mb-3">
            <div className="h-4 bg-gray-200 rounded animate-shimmer w-full"></div>
            <div className="h-4 bg-gray-200 rounded animate-shimmer w-4/5"></div>
            <div className="h-4 bg-gray-200 rounded animate-shimmer w-3/5"></div>
          </div>

          {/* Images Skeleton */}
          {showImages && (
            <div className="mb-3">
              <div className="w-full h-48 bg-gray-200 rounded-xl animate-shimmer"></div>
            </div>
          )}

          {/* Actions Skeleton */}
          <div className="flex items-center justify-between space-x-4">
            <div className="flex items-center space-x-1">
              <div className="w-5 h-5 bg-gray-200 rounded animate-shimmer"></div>
              <div className="w-6 h-3 bg-gray-200 rounded animate-shimmer"></div>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-5 h-5 bg-gray-200 rounded animate-shimmer"></div>
              <div className="w-6 h-3 bg-gray-200 rounded animate-shimmer"></div>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-5 h-5 bg-gray-200 rounded animate-shimmer"></div>
              <div className="w-6 h-3 bg-gray-200 rounded animate-shimmer"></div>
            </div>
            {!isMobile && (
              <>
                <div className="flex items-center space-x-1">
                  <div className="w-5 h-5 bg-gray-200 rounded animate-shimmer"></div>
                  <div className="w-8 h-3 bg-gray-200 rounded animate-shimmer"></div>
                </div>
                <div className="flex space-x-1">
                  <div className="w-5 h-5 bg-gray-200 rounded animate-shimmer"></div>
                  <div className="w-5 h-5 bg-gray-200 rounded animate-shimmer"></div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const TweetSkeletonList: React.FC<{ 
  count?: number; 
  isMobile?: boolean;
}> = ({ count = 5, isMobile = false }) => {
  return (
    <div className="divide-y divide-gray-100">
      {Array.from({ length: count }).map((_, index) => (
        <TweetSkeleton 
          key={index} 
          showImages={Math.random() > 0.7} // Randomly show images on some skeletons
          isMobile={isMobile}
        />
      ))}
    </div>
  );
};