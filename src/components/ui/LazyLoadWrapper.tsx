import React, { Suspense } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface LazyLoadWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

export const LazyLoadWrapper: React.FC<LazyLoadWrapperProps> = ({
  children,
  fallback,
  className = '',
}) => {
  const defaultFallback = (
    <div className={`min-h-screen bg-white flex items-center justify-center ${className}`}>
      <LoadingSpinner size="lg" text="Loading..." />
    </div>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
};