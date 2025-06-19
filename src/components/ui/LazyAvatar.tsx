import React, { useState, useEffect } from 'react';
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
  size = 80,
  onClick
}) => {
  const [loaded, setLoaded] = useState(false);
  const [optimizedSrc, setOptimizedSrc] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (src) {
      const optimized = storageService.getOptimizedImageUrl(src, { 
        width: size, 
        quality: 80 
      });
      setOptimizedSrc(optimized);
    } else {
      setOptimizedSrc(undefined);
    }
    setLoaded(false);
  }, [src, size]);

  return (
    <Avatar className={className} onClick={onClick}>
      {optimizedSrc && (
        <AvatarImage 
          src={optimizedSrc} 
          onLoad={() => setLoaded(true)}
          style={{ opacity: loaded ? 1 : 0 }}
          className="transition-opacity duration-300"
        />
      )}
      <AvatarFallback 
        delayMs={optimizedSrc ? 500 : 0}
        className={optimizedSrc ? (loaded ? 'hidden' : '') : ''}
      >
        {fallback}
      </AvatarFallback>
    </Avatar>
  );
};