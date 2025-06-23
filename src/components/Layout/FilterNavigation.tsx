import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronLeft, MoreHorizontal, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

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
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [initialAnimationDone, setInitialAnimationDone] = useState(false);

  // All filters
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

  // Determine which filters to show directly and which to put in the "More" dropdown
  const [visibleFilters, setVisibleFilters] = useState<FilterOption[]>([]);
  const [moreFilters, setMoreFilters] = useState<FilterOption[]>([]);

  // Adjust visible filters based on screen width
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      let visibleCount = 4; // Default for desktop
      
      if (width < 640) {
        visibleCount = 3; // Small mobile
      } else if (width < 768) {
        visibleCount = 4; // Mobile
      } else if (width < 1024) {
        visibleCount = 5; // Tablet
      } else if (width < 1280) {
        visibleCount = 4; // Small desktop
      } else {
        visibleCount = 4; // Large desktop
      }
      
      // Always include "All" and the selected filter in visible filters
      let newVisibleFilters = [allFilters[0]]; // Start with "All"
      
      // Add the selected filter if it's not "All" and not already included
      const selectedFilterObj = allFilters.find(f => f.id === selectedFilter);
      if (selectedFilter !== 'all' && selectedFilterObj) {
        newVisibleFilters.push(selectedFilterObj);
        visibleCount--; // Reduce count since we added the selected filter
      }
      
      // Fill remaining slots with filters that aren't already included
      const remainingFilters = allFilters.filter(f => 
        f.id !== 'all' && f.id !== selectedFilter
      );
      
      // Add remaining filters up to the visible count
      newVisibleFilters = [
        ...newVisibleFilters,
        ...remainingFilters.slice(0, visibleCount)
      ];
      
      // Determine which filters go into the "More" dropdown
      const newMoreFilters = allFilters.filter(
        filter => !newVisibleFilters.some(vf => vf.id === filter.id)
      );
      
      setVisibleFilters(newVisibleFilters);
      setMoreFilters(newMoreFilters);
      
      checkOverflow();
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [selectedFilter]);

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

  // Set up overflow detection
  useEffect(() => {
    checkOverflow();
  }, [visibleFilters]);

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
        {/* Visible filters */}
        {visibleFilters.map((filter) => (
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
        
        {/* More dropdown - only show if there are more filters */}
        {moreFilters.length > 0 && (
          <DropdownMenu open={moreDropdownOpen} onOpenChange={setMoreDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 text-gray-700 hover:bg-gray-100"
              >
                <span className="flex items-center">
                  <MoreHorizontal className="w-4 h-4 mr-1" />
                  More
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="start" 
              className="w-56 max-h-80 overflow-y-auto rounded-xl"
              sideOffset={4}
            >
              <div className="p-2">
                {moreFilters.map((filter) => (
                  <DropdownMenuItem
                    key={filter.id}
                    onClick={() => onFilterChange(filter.id)}
                    className={`flex items-center justify-between px-3 py-2 cursor-pointer rounded-lg mx-1 my-0.5 ${
                      selectedFilter === filter.id ? 'bg-green-50 text-green-800' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-sm font-medium">{filter.label}</span>
                    {selectedFilter === filter.id && (
                      <Check className="h-4 w-4 text-green-600" />
                    )}
                  </DropdownMenuItem>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
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