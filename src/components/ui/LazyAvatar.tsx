import React, { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from './avatar';
import { storageService } from '../../lib/storage';

interface LazyAvatarProps {
  src?: string;
  fallback: string;
  className?: string;
  size?: number;
  onClick?: (e: React.MouseEvent) => void;
}

export const LazyAvatar: React.FC<LazyAvatarProps> = ({
  src,
  fallback,
  className = '',
  size = 40,
  onClick,
}) => {
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  // Set up intersection observer for lazy loading
  useEffect(() => {
    if (!src || isInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px',
      }
    );

    if (avatarRef.current) {
      observer.observe(avatarRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [src, isInView]);

  // Get optimized image URL
  const optimizedSrc = src && isInView && !hasError
    ? storageService.getOptimizedImageUrl(src, { width: size * 2, quality: 80 })
    : undefined;

  const handleError = () => {
    setHasError(true);
  };

  return (
    <div ref={avatarRef}>
      <Avatar className={className} onClick={onClick}>
        {optimizedSrc && (
          <AvatarImage 
            src={optimizedSrc} 
            onError={handleError}
            loading="lazy"
          />
        )}
        <AvatarFallback className="bg-blue-500 text-white font-bold">
          {fallback}
        </AvatarFallback>
      </Avatar>
    </div>
  );
};