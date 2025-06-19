import React, { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from './avatar';
import { storageService } from '../../lib/storage';

interface LazyAvatarProps {
  src?: string;
  alt?: string;
  fallback: string;
  className?: string;
  size?: number;
  quality?: number;
}

export const LazyAvatar: React.FC<LazyAvatarProps> = ({
  src,
  alt = '',
  fallback,
  className = '',
  size = 80,
  quality = 80,
}) => {
  const [isInView, setIsInView] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  // Set up intersection observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
      }
    );

    if (avatarRef.current) {
      observer.observe(avatarRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  // Get optimized image URL
  const optimizedSrc = src && isInView 
    ? storageService.getOptimizedImageUrl(src, { width: size, quality })
    : undefined;

  return (
    <div ref={avatarRef}>
      <Avatar className={className}>
        {optimizedSrc && (
          <AvatarImage 
            src={optimizedSrc}
            alt={alt}
            onLoad={() => setIsLoaded(true)}
            loading="lazy"
            decoding="async"
          />
        )}
        <AvatarFallback className={`${!isLoaded && src ? 'animate-pulse bg-gray-200' : ''}`}>
          {fallback}
        </AvatarFallback>
      </Avatar>
    </div>
  );
};