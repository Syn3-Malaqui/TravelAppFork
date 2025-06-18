import React from 'react';

interface ProfileSkeletonProps {
  isMobile?: boolean;
}

export const ProfileSkeleton: React.FC<ProfileSkeletonProps> = ({ isMobile = false }) => {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header Skeleton */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3 flex items-center z-10 flex-shrink-0">
        <div className="w-6 h-6 bg-gray-200 rounded animate-shimmer"></div>
        <div className="ml-4">
          <div className="h-5 bg-gray-200 rounded animate-shimmer w-32 mb-1"></div>
          <div className="h-4 bg-gray-200 rounded animate-shimmer w-20"></div>
        </div>
      </div>

      {/* Profile Header Skeleton */}
      <div className="relative">
        {/* Cover Image Skeleton */}
        <div className="h-48 bg-gray-200 animate-shimmer"></div>
        
        {/* Profile Info Skeleton */}
        <div className="px-4 pb-4">
          {/* Avatar and Button */}
          <div className="flex items-end justify-between -mt-16 mb-4">
            <div className="w-32 h-32 bg-gray-200 rounded-full animate-shimmer border-4 border-white"></div>
            <div className="mt-16 h-10 bg-gray-200 rounded-full animate-shimmer w-32"></div>
          </div>

          {/* User Info Skeleton */}
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <div className="h-6 bg-gray-200 rounded animate-shimmer w-40"></div>
              <div className="w-5 h-5 bg-gray-200 rounded-full animate-shimmer"></div>
            </div>
            <div className="h-4 bg-gray-200 rounded animate-shimmer w-24 mb-3"></div>
            
            <div className="h-4 bg-gray-200 rounded animate-shimmer w-full mb-1"></div>
            <div className="h-4 bg-gray-200 rounded animate-shimmer w-3/4 mb-3"></div>

            {/* Join Date Skeleton */}
            <div className="h-4 bg-gray-200 rounded animate-shimmer w-32 mb-3"></div>

            {/* Follow Stats Skeleton */}
            <div className="flex space-x-6">
              <div className="flex items-center space-x-1">
                <div className="h-4 bg-gray-200 rounded animate-shimmer w-8"></div>
                <div className="h-4 bg-gray-200 rounded animate-shimmer w-16"></div>
              </div>
              <div className="flex items-center space-x-1">
                <div className="h-4 bg-gray-200 rounded animate-shimmer w-8"></div>
                <div className="h-4 bg-gray-200 rounded animate-shimmer w-16"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="border-b border-gray-200 sticky top-0 bg-white z-10">
        <div className="flex">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex-1 py-4 px-4 border-b-2 border-transparent">
              <div className="flex items-center justify-center space-x-2">
                <div className="h-4 bg-gray-200 rounded animate-shimmer w-16"></div>
                <div className="w-6 h-4 bg-gray-200 rounded-full animate-shimmer"></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div className="divide-y divide-gray-100">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="p-4">
              <div className="flex gap-3">
                <div className="w-12 h-12 bg-gray-200 rounded-full animate-shimmer flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="h-4 bg-gray-200 rounded animate-shimmer w-24"></div>
                    <div className="h-3 bg-gray-200 rounded animate-shimmer w-16"></div>
                    <div className="h-3 bg-gray-200 rounded animate-shimmer w-12"></div>
                  </div>
                  <div className="space-y-2 mb-3">
                    <div className="h-4 bg-gray-200 rounded animate-shimmer w-full"></div>
                    <div className="h-4 bg-gray-200 rounded animate-shimmer w-4/5"></div>
                  </div>
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
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};