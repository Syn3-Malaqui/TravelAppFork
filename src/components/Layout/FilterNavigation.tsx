import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { useLanguageStore } from '../../store/useLanguageStore';

interface FilterOption {
  id: string;
  label: string;
}

interface FilterNavigationProps {
  onFilterChange: (filterId: string) => void;
  selectedFilter: string;
}

export const FilterNavigation: React.FC<FilterNavigationProps> = ({ 
  onFilterChange,
  selectedFilter
}) => {
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [showLeftButton, setShowLeftButton] = useState(false);
  const [showRightButton, setShowRightButton] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [initialAnimationDone, setInitialAnimationDone] = useState(false);
  const { language, isRTL } = useLanguageStore();

  // All filters with language support
  const getAllFilters = (): FilterOption[] => [
    { id: 'all', label: language === 'en' ? 'All' : 'الكل' },
    { id: 'general', label: language === 'en' ? 'General Discussions' : 'مناقشات عامة' },
    { id: 'visas', label: language === 'en' ? 'Visas' : 'التأشيرات' },
    { id: 'hotels', label: language === 'en' ? 'Hotels' : 'الفنادق' },
    { id: 'car-rental', label: language === 'en' ? 'Car Rental' : 'تأجير السيارات' },
    { id: 'schedules', label: language === 'en' ? 'Tourist Schedules' : 'برامج سياحية' },
    { id: 'flights', label: language === 'en' ? 'Flights' : 'الطيران' },
    { id: 'restaurants', label: language === 'en' ? 'Restaurants and Coffees' : 'المطاعم والمقاهي' },
    { id: 'images', label: language === 'en' ? 'Images and Creators' : 'الصور والمبدعون' },
    { id: 'real-estate', label: language === 'en' ? 'Real Estate' : 'العقارات' },
  ];

  const allFilters = getAllFilters();

  // Check if the filter strip is overflowing and update scroll button visibility
  const checkOverflow = () => {
    const container = scrollContainerRef.current;
    if (container) {
      const isOverflow = container.scrollWidth > container.clientWidth;
      setIsOverflowing(isOverflow);
      
      // Show/hide scroll buttons based on scroll position
      setShowLeftButton(container.scrollLeft > 10);
      setShowRightButton(container.scrollLeft + container.clientWidth < container.scrollWidth - 10);
    }
  };

  // Set up overflow detection and window resize handler
  useEffect(() => {
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    
    return () => window.removeEventListener('resize', checkOverflow);
  }, []);

  // Initial animation to show scrollability
  useEffect(() => {
    if (isOverflowing && !initialAnimationDone && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      
      // Wait a bit before starting the animation
      const timeout = setTimeout(() => {
        // Scroll right a bit to show there's more content
        container.scrollTo({
          left: 100,
          behavior: 'smooth'
        });
        
        // Then scroll back after a short delay
        setTimeout(() => {
          container.scrollTo({
            left: 0,
            behavior: 'smooth'
          });
          setInitialAnimationDone(true);
        }, 800);
      }, 1000);
      
      return () => clearTimeout(timeout);
    }
  }, [isOverflowing, initialAnimationDone]);

  // Scroll to selected filter to ensure it's visible
  useEffect(() => {
    const container = scrollContainerRef.current;
    const selectedElement = container?.querySelector(`[data-filter-id="${selectedFilter}"]`);
    
    if (container && selectedElement) {
      const containerRect = container.getBoundingClientRect();
      const elementRect = selectedElement.getBoundingClientRect();
      
      // Check if the element is not fully visible
      if (elementRect.left < containerRect.left || elementRect.right > containerRect.right) {
        selectedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [selectedFilter]);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: -200,
        behavior: 'smooth'
      });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: 200,
        behavior: 'smooth'
      });
    }
  };

  // Handle scroll events to update button visibility
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (container) {
      setShowLeftButton(container.scrollLeft > 10);
      setShowRightButton(container.scrollLeft + container.clientWidth < container.scrollWidth - 10);
    }
  };

  return (
    <div className={`bg-white w-full relative flex-shrink-0 flex items-center ${isRTL ? 'font-arabic' : ''}`}>
      {/* Left scroll button - only show when needed */}
      {isOverflowing && showLeftButton && (
        <button 
          onClick={scrollLeft}
          className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-white/90 rounded-full shadow-md p-1 hover:bg-gray-100 transition-colors"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
      )}
      
      {/* Horizontally scrollable filter strip */}
      <div 
        ref={scrollContainerRef}
        className="flex space-x-2 overflow-x-auto scrollbar-hide py-2 px-4 w-full"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        onScroll={handleScroll}
      >
        {/* All filters */}
        {allFilters.map((filter) => (
          <Button
            key={filter.id}
            variant="ghost"
            size="sm"
            onClick={() => onFilterChange(filter.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
              selectedFilter === filter.id
                ? 'bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-200'
                : 'text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
            data-filter-id={filter.id}
          >
            {filter.label}
          </Button>
        ))}
      </div>
      
      {/* Right scroll button - only show when needed */}
      {isOverflowing && showRightButton && (
        <button 
          onClick={scrollRight}
          className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-white/90 rounded-full shadow-md p-1 hover:bg-gray-100 transition-colors"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      )}
      
      {/* Indicator for horizontal scrolling on mobile */}
      {isOverflowing && (
        <div className="md:hidden absolute bottom-0 left-0 right-0 flex justify-center">
          <div className="w-10 h-1 bg-gray-200 rounded-full mb-0.5"></div>
        </div>
      )}
    </div>
  );
};