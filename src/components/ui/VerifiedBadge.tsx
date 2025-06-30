import React from 'react';
import { Check } from 'lucide-react';

interface VerifiedBadgeProps {
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: { container: 'w-3.5 h-3.5', icon: 'w-2 h-2' },
  md: { container: 'w-4 h-4', icon: 'w-2.5 h-2.5' },
  lg: { container: 'w-5 h-5', icon: 'w-3 h-3' },
};

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({ size = 'md' }) => {
  const classes = sizeMap[size] || sizeMap.md;
  return (
    <div
      className={`${classes.container} bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0`}
    >
      <Check className={`${classes.icon} text-white`} strokeWidth={3} />
    </div>
  );
}; 