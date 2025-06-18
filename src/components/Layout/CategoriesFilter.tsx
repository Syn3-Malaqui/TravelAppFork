import React, { useState } from 'react';
import { Tag, ChevronDown, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { TWEET_CATEGORIES, TweetCategory } from '../../types';

interface CategoriesFilterProps {
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
}

export const CategoriesFilter: React.FC<CategoriesFilterProps> = ({ 
  selectedCategory, 
  onCategoryChange 
}) => {
  const [open, setOpen] = useState(false);

  const handleCategorySelect = (category: string | null) => {
    onCategoryChange(category);
    setOpen(false);
  };

  const categoryIcons: { [key: string]: string } = {
    'General Discussions': '💬',
    'Visas': '📋',
    'Hotels': '🏨',
    'Car Rental': '🚗',
    'Tourist Schedules': '📅',
    'Flights': '✈️',
    'Restaurants and Coffees': '🍽️',
    'Images and Creators': '📸',
    'Real Estate': '🏠'
  };

  const getDisplayText = () => {
    if (!selectedCategory) return 'All Categories';
    return selectedCategory;
  };

  const getDisplayIcon = () => {
    if (!selectedCategory) return '🌐';
    return categoryIcons[selectedCategory] || '📝';
  };

  return (
    <div className="hidden md:block">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="flex items-center space-x-2 px-4 py-2 border-gray-300 hover:bg-gray-50 rounded-full"
          >
            <Tag className="h-4 w-4 text-gray-500" />
            <div className="relative">
              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                <span className="text-sm">{getDisplayIcon()}</span>
              </div>
            </div>
            <span className="text-sm font-medium">{getDisplayText()}</span>
            <ChevronDown className="h-4 w-4 text-gray-500" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="start" 
          className="w-72 max-h-96 overflow-y-auto rounded-xl"
          sideOffset={4}
        >
          <div className="max-h-80 overflow-y-auto">
            {/* All Categories Option */}
            <DropdownMenuItem
              onClick={() => handleCategorySelect(null)}
              className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-50 cursor-pointer rounded-lg mx-1"
            >
              <div className="relative flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                  <span className="text-lg">🌐</span>
                </div>
              </div>
              <span className="flex-1 text-sm font-medium truncate">All Categories</span>
              {!selectedCategory && (
                <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />
              )}
            </DropdownMenuItem>

            {/* Individual Categories */}
            {TWEET_CATEGORIES.map((category) => (
              <DropdownMenuItem
                key={category}
                onClick={() => handleCategorySelect(category)}
                className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-50 cursor-pointer rounded-lg mx-1"
              >
                <div className="relative flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                    <span className="text-lg">{categoryIcons[category] || '📝'}</span>
                  </div>
                </div>
                <span className="flex-1 text-sm font-medium truncate">{category}</span>
                {selectedCategory === category && (
                  <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />
                )}
              </DropdownMenuItem>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};