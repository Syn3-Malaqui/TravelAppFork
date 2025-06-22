import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '../ui/button';

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

  // All filters shown directly in the strip
  const allFilters: FilterOption[] = [
    { id: 'all', label: 'All' },
    { id: 'general', label: 'General Discussions' },
    { id: 'visas', label: 'Visas' },
    { id: 'hotels', label: 'Hotels' },
    { id: 'car-rental', label: 'Car Rental' },
    { id: 'schedules', label: 'Tourist Schedules' },
    { id: 'flights', label: 'Flights' },
    { id: 'restaurants', label: 'Restorants and coffees' },
    { id: 'images', label: 'Images and creators' },
    { id: 'real-estate', label: 'Real estate' },
  ];

  // Desktop: First 5 filters visible, rest scrollable
  const desktopVisibleFilters = allFilters.slice(0, 5);
  const desktopScrollableFilters = allFilters.slice(5);

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
    <div className="bg-white border-b border-gray-200 w-full relative h-12 flex-shrink-0 flex items-center">
      {/* Desktop Layout */}
      <div className="hidden md:flex w-full items-center">
        {/* First 5 filters - always visible */}
        <div className="flex space-x-2 px-4">
          {desktopVisibleFilters.map((filter) => (
            <Button
              key={filter.id}
              variant="ghost"
              size="sm"
              onClick={() => onFilterChange(filter.id)}
              className={`rounded-full px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                selectedFilter === filter.id
                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              data-filter-id={filter.id}
            >
              {filter.label}
            </Button>
          ))}
        </div>

        {/* Scrollable section for remaining filters */}
        {desktopScrollableFilters.length > 0 && (
          <div className="flex-1 relative">
            {/* Left scroll button */}
            {showLeftButton && (
              <button 
                onClick={scrollLeft}
                className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-white/90 rounded-full shadow-md p-1 hover:bg-gray-100 transition-colors"
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>
            )}
            
            {/* Scrollable filter strip */}
            <div 
              ref={scrollContainerRef}
              className="flex space-x-2 overflow-x-auto scrollbar-hide py-1 px-6 w-full"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              onScroll={handleScroll}
            >
              {desktopScrollableFilters.map((filter) => (
                <Button
                  key={filter.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => onFilterChange(filter.id)}
                  className={`rounded-full px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                    selectedFilter === filter.id
                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  data-filter-id={filter.id}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
            
            {/* Right scroll button */}
            {showRightButton && (
              <button 
                onClick={scrollRight}
                className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-white/90 rounded-full shadow-md p-1 hover:bg-gray-100 transition-colors"
                aria-label="Scroll right"
              >
                <ChevronRight className="h-5 w-5 text-gray-600" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Mobile Layout - unchanged */}
      <div className="md:hidden w-full relative">
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
          className="flex space-x-2 overflow-x-auto scrollbar-hide py-1 px-6 w-full"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          onScroll={handleScroll}
        >
          {/* All filters for mobile */}
          {allFilters.map((filter) => (
            <Button
              key={filter.id}
              variant="ghost"
              size="sm"
              onClick={() => onFilterChange(filter.id)}
              className={`rounded-full px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                selectedFilter === filter.id
                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                  : 'text-gray-700 hover:bg-gray-100'
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
    </div>
  );
};