import { useState, useEffect } from 'react';

interface WindowSize {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

export const useWindowSize = (): WindowSize => {
  const getInitialSize = () => {
    if (typeof window === 'undefined') {
      return {
        width: 1200,
        height: 800,
        isMobile: false,
        isTablet: false,
        isDesktop: true,
      };
    }
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isMobile = width < 768;
    
    return {
      width,
      height,
      isMobile,
      isTablet: width >= 768 && width < 1024,
      isDesktop: width >= 1024,
    };
  };

  const [windowSize, setWindowSize] = useState<WindowSize>(getInitialSize);

  useEffect(() => {
    function handleResize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setWindowSize({
        width,
        height,
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
      });
      

    }

    // Set initial size
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
}; 