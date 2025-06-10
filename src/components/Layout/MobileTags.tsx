import React, { useState } from 'react';
import { Button } from '../ui/button';

const tags = [
  { id: 'car-rentals', label: 'Car Rentals' },
  { id: 'hotels', label: 'Hotels' },
  { id: 'tourist-spots', label: 'Tourist Spots' },
];

interface MobileTagsProps {
  onTagFilter: (tag: string | null) => void;
  activeFilter: string | null;
}

export const MobileTags: React.FC<MobileTagsProps> = ({ onTagFilter, activeFilter }) => {
  const handleTagClick = (tagId: string) => {
    // If clicking the same tag, clear the filter
    if (activeFilter === tagId) {
      onTagFilter(null);
    } else {
      onTagFilter(tagId);
    }
  };

  return (
    <div className="md:hidden bg-white border-b border-gray-200 flex-shrink-0">
      <div className="px-4 py-3 w-full overflow-hidden">
        <div className="flex space-x-3 overflow-x-auto scrollbar-hide" style={{ width: '100%' }}>
          {tags.map((tag) => (
            <Button
              key={tag.id}
              variant="outline"
              size="sm"
              className={`flex-shrink-0 whitespace-nowrap border-black text-black rounded-full px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors ${
                activeFilter === tag.id ? 'bg-blue-500 text-white border-blue-500' : 'bg-white'
              }`}
              onClick={() => handleTagClick(tag.id)}
            >
              {tag.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};