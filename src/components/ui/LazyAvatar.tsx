import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from './avatar';
import { storageService } from '../../lib/storage';

interface LazyAvatarProps {
  src?: string;
  fallback: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  size?: number;
}

export const LazyAvatar: React.FC<LazyAvatarProps> = ({ 
  src, 
  fallback, 
  className = '', 
  onClick,
  size = 80
}) => {
  return (
    <Avatar className={className} onClick={onClick}>
      <AvatarImage 
        src={src ? storageService.getOptimizedImageUrl(src, { width: size, quality: 80 }) : undefined} 
        loading="lazy"
      />
      <AvatarFallback>{fallback}</AvatarFallback>
    </Avatar>
  );
};