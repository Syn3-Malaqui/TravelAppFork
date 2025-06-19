import React from 'react';
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
  const optimizedSrc = storageService.getOptimizedImageUrl(src, { 
    width, 
    height, 
    quality 
  });

  return (
    <img 
      src={optimizedSrc} 
      alt={alt} 
      className={className}
      loading="lazy"
      {...props}
    />
  );
};