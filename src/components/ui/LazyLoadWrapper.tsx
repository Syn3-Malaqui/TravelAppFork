import React, { Suspense } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface LazyLoadWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const LazyLoadWrapper: React.FC<LazyLoadWrapperProps> = ({ 
  children, 
  fallback 
}) => {
  return (
    <Suspense fallback={fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Loading content..." />
      </div>
    )}>
      {children}
    </Suspense>
  );
};