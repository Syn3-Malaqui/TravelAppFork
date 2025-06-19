import React, { useState, useRef, useEffect } from 'react';
import { storageService } from '../../lib/storage';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  quality?: number;
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  width = 800,
  height = 600,
  quality = 85,
  onClick,
  style,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    observerRef.current = observer;

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(false);
  };

  const optimizedSrc = storageService.getOptimizedImageUrl(src, {
    width,
    height,
    quality,
  });

  // Timeline-specific styling
  const timelineImageStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center',
    border: '1px solid #CCCCCC',
    borderRadius: '8px',
    padding: '0',
    margin: '0',
    display: 'block',
    backgroundColor: '#f8f9fa',
    ...style,
  };

  const containerStyle: React.CSSProperties = {
    width: '100%',
    aspectRatio: '16/9',
    padding: '20px',
    boxSizing: 'border-box',
    position: 'relative',
    overflow: 'hidden',
  };

  const imageWrapperStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    position: 'relative',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid #CCCCCC',
    backgroundColor: '#f8f9fa',
  };

  return (
    <div style={containerStyle} className={`timeline-image-container ${className}`}>
      <div style={imageWrapperStyle}>
        <div
          ref={imgRef}
          className="relative w-full h-full"
          onClick={onClick}
          style={{ cursor: onClick ? 'pointer' : 'default' }}
        >
          {/* Loading placeholder */}
          {!isLoaded && !hasError && (
            <div className="absolute inset-0 bg-gray-200 animate-shimmer flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
          )}

          {/* Error placeholder */}
          {hasError && (
            <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm">Image unavailable</p>
              </div>
            </div>
          )}

          {/* Actual image */}
          {isInView && (
            <img
              src={optimizedSrc}
              alt={alt}
              style={timelineImageStyle}
              onLoad={handleLoad}
              onError={handleError}
              className={`transition-opacity duration-300 ${
                isLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              loading="lazy"
              decoding="async"
            />
          )}
        </div>
      </div>
    </div>
  );
};