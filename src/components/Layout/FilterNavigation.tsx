import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '../ui/button';

interface FilterOption {
  id: string;
  label: string;
  icon?: string;
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
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [initialAnimationDone, setInitialAnimationDone] = useState(false);

  // All filters shown directly in the strip
  const allFilters: FilterOption[] = [
    { id: 'all', label: 'All', icon: '🌐' },
    { id: 'general', label: 'General', icon: '💬' },
    { id: 'hotels', label: 'Hotels', icon: '🏨' },
    { id: 'flights', label: 'Flights', icon: '✈️' },
    { id: 'restaurants', label: 'Restaurants', icon: '🍽️' },
    { id: 'visas', label: 'Visas', icon: '📋' },
    { id: 'car-rental', label: 'Car Rental', icon: '🚗' },
    { id: 'schedules', label: 'Schedules', icon: '📅' },
    { id: 'images', label: 'Images', icon: '📸' },
    { id: 'real-estate', label: 'Real Estate', icon: '🏠' },
  ];

  // Check if the filter strip is overflowing
  useEffect(() => {
    const checkOverflow = () => {
      const container = scrollContainerRef.current;
      if (container) {
        const isOverflow = container.scrollWidth > container.clientWidth;
        setIsOverflowing(isOverflow);
        setShowScrollButtons(isOverflow);
      }
    };

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

  // Handle scroll events to show/hide scroll buttons
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (container) {
      const atStart = container.scrollLeft <= 10;
      const atEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 10;
      
      // You can use these values to conditionally show/hide left/right buttons
      // For now we'll just keep both visible if there's overflow
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-2 py-2 w-full relative">
      {/* Left scroll button */}
      {showScrollButtons && (
        <button 
          onClick={scrollLeft}
          className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-white/80 rounded-full shadow-md p-1 hover:bg-gray-100 transition-colors"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
      )}
      
      {/* Horizontally scrollable filter strip */}
      <div 
        ref={scrollContainerRef}
        className="flex space-x-2 overflow-x-auto scrollbar-hide py-1 px-6"
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
            className={`rounded-full px-4 py-1 text-sm font-medium whitespace-nowrap transition-colors ${
              selectedFilter === filter.id
                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            data-filter-id={filter.id}
          >
            {filter.icon && <span className="mr-1.5">{filter.icon}</span>}
            {filter.label}
          </Button>
        ))}
      </div>
      
      {/* Right scroll button */}
      {showScrollButtons && (
        <button 
          onClick={scrollRight}
          className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-white/80 rounded-full shadow-md p-1 hover:bg-gray-100 transition-colors"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      )}
      
      {/* Indicator for horizontal scrolling on mobile */}
      {isOverflowing && (
        <div className="md:hidden flex justify-center mt-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full"></div>
        </div>
      )}
    </div>
  );
};