import React, { useState, useEffect } from 'react';
import { storageService } from '../../lib/storage';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  quality?: number;
  className?: string;
}

export const LazyImage: React.FC<LazyImageProps> = ({ 
  src, 
  alt, 
  width = 400, 
  height,
  quality = 80,
  className = '',
  ...props
}) => {
  const [loaded, setLoaded] = useState(false);
  const [optimizedSrc, setOptimizedSrc] = useState<string>(src);
  const [error, setError] = useState(false);

  useEffect(() => {
    try {
      if (src) {
        const optimized = storageService.getOptimizedImageUrl(src, { 
          width, 
          height,
          quality 
        });
        setOptimizedSrc(optimized);
      }
      setLoaded(false);
      setError(false);
    } catch (err) {
      console.error('Error optimizing image:', err);
      setOptimizedSrc(src);
      setError(true);
    }
  }, [src, width, height, quality]);

  return (
    <div className={`relative ${className}`}>
      {!loaded && !error && (
        <div className="absolute inset-0 bg-gray-200 animate-shimmer rounded-md"></div>
      )}
      <img
        src={optimizedSrc}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        style={{ 
          opacity: loaded ? 1 : 0,
          transition: 'opacity 300ms ease-in-out'
        }}
        loading="lazy"
        {...props}
      />
    </div>
  );
};