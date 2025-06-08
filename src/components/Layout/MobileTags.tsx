import React, { useState } from 'react';
import { Button } from '../ui/button';

const tags = [
  { id: 'car-rentals', label: 'Car Rentals' },
  { id: 'hotels', label: 'Hotels' },
  { id: 'tourist-spots', label: 'Tourist Spots' },
];

export const MobileTags: React.FC = () => {
  const [activeTag, setActiveTag] = useState<string | null>(null);

  return (
    <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex space-x-3 overflow-x-auto">
        {tags.map((tag) => (
          <Button
            key={tag.id}
            variant="outline"
            size="sm"
            className={`flex-shrink-0 border-black text-black rounded-full px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors ${
              activeTag === tag.id ? 'bg-gray-100' : 'bg-white'
            }`}
            onClick={() => setActiveTag(activeTag === tag.id ? null : tag.id)}
          >
            {tag.label}
          </Button>
        ))}
      </div>
    </div>
  );
};