import React from 'react';

type SpinnerSize = 'sm' | 'md' | 'lg';

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  text?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  text,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div 
        className={`animate-spin rounded-full border-b-2 border-blue-500 ${sizeClasses[size]}`}
      ></div>
      {text && (
        <p className="mt-2 text-sm text-gray-500">{text}</p>
      )}
    </div>
  );
};