import React from 'react';
import { Button } from '../ui/button';
import { TWEET_CATEGORIES } from '../../types';

interface MobileTagsProps {
  onCategoryFilter: (category: string | null) => void;
  activeFilter: string | null;
}

export const MobileTags: React.FC<MobileTagsProps> = ({ onCategoryFilter, activeFilter }) => {
  const handleCategoryClick = (category: string) => {
    // If clicking the same category, clear the filter
    if (activeFilter === category) {
      onCategoryFilter(null);
    } else {
      onCategoryFilter(category);
    }
  };

  return (
    <div className="md:hidden bg-white border-b border-gray-200 flex-shrink-0">
      <div className="px-4 py-3 w-full overflow-hidden">
        <div className="flex space-x-3 overflow-x-auto scrollbar-hide" style={{ width: '100%' }}>
          {TWEET_CATEGORIES.map((category) => (
            <Button
              key={category}
              variant="outline"
              size="sm"
              className={`flex-shrink-0 whitespace-nowrap border-black text-black rounded-full px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors ${
                activeFilter === category ? 'bg-blue-500 text-white border-blue-500' : 'bg-white'
              }`}
              onClick={() => handleCategoryClick(category)}
            >
              {category}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};