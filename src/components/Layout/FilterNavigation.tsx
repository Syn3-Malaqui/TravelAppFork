import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Primary filters shown directly in the strip
  const primaryFilters: FilterOption[] = [
    { id: 'all', label: 'All', icon: '🌐' },
    { id: 'general', label: 'General', icon: '💬' },
    { id: 'hotels', label: 'Hotels', icon: '🏨' },
    { id: 'flights', label: 'Flights', icon: '✈️' },
    { id: 'restaurants', label: 'Restaurants', icon: '🍽️' },
  ];

  // Additional filters shown in the "More" dropdown
  const moreFilters: FilterOption[] = [
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
        setIsOverflowing(container.scrollWidth > container.clientWidth);
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    
    return () => window.removeEventListener('resize', checkOverflow);
  }, []);

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

  return (
    <div className="bg-white border-b border-gray-200 px-2 py-2 w-full">
      {/* Horizontally scrollable filter strip */}
      <div 
        ref={scrollContainerRef}
        className="flex space-x-2 overflow-x-auto scrollbar-hide pb-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* Primary filters */}
        {primaryFilters.map((filter) => (
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
        
        {/* More dropdown */}
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-full px-4 py-1 text-sm font-medium whitespace-nowrap transition-colors flex items-center ${
                moreFilters.some(f => f.id === selectedFilter)
                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              More
              {dropdownOpen ? (
                <ChevronUp className="ml-1 h-4 w-4" />
              ) : (
                <ChevronDown className="ml-1 h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[150px] rounded-xl p-1">
            {moreFilters.map((filter) => (
              <DropdownMenuItem
                key={filter.id}
                onClick={() => {
                  onFilterChange(filter.id);
                  setDropdownOpen(false);
                }}
                className={`rounded-lg px-3 py-2 text-sm font-medium cursor-pointer ${
                  selectedFilter === filter.id
                    ? 'bg-green-100 text-green-800'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {filter.icon && <span className="mr-2">{filter.icon}</span>}
                {filter.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Indicator for horizontal scrolling on mobile */}
      {isOverflowing && (
        <div className="md:hidden flex justify-center mt-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full"></div>
        </div>
      )}
    </div>
  );
};