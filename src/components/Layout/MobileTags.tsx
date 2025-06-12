import React, { useState } from 'react';
import { Tag, X, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { TWEET_CATEGORIES } from '../../types';

interface MobileTagsProps {
  onCategoryFilter: (category: string | null) => void;
  activeFilter: string | null;
}

export const MobileTags: React.FC<MobileTagsProps> = ({ onCategoryFilter, activeFilter }) => {
  const [open, setOpen] = useState(false);

  const handleCategoryClick = (category: string) => {
    // If clicking the same category, clear the filter
    if (activeFilter === category) {
      onCategoryFilter(null);
    } else {
      onCategoryFilter(category);
    }
    setOpen(false);
  };

  const handleClearFilter = () => {
    onCategoryFilter(null);
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

  const getActiveIcon = () => {
    if (!activeFilter) return '📂';
    return categoryIcons[activeFilter] || '📝';
  };

  return (
    <div className="md:hidden">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm"
            className="h-10 w-10 p-0 rounded-full border border-gray-200 hover:bg-gray-50"
          >
            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
              <span className="text-sm">{getActiveIcon()}</span>
            </div>
          </Button>
        </DialogTrigger>
        
        <DialogContent className="w-[90vw] max-w-sm max-h-[70vh] p-0 flex flex-col">
          <DialogHeader className="p-3 border-b border-gray-200 flex-shrink-0">
            <DialogTitle className="text-base font-semibold">Select Category</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col flex-1 min-h-0">
            {/* Category List - Scrollable */}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="space-y-1">
                {/* All Categories Option */}
                <button
                  onClick={() => handleClearFilter()}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors ${
                    !activeFilter ? 'bg-blue-50 ring-2 ring-blue-500' : ''
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                      <span className="text-xl">🌐</span>
                    </div>
                    {!activeFilter && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <span className="text-sm font-medium text-gray-900 truncate block">
                      All Categories
                    </span>
                    <span className="text-xs text-gray-500">
                      Show all posts
                    </span>
                  </div>
                </button>

                {/* Individual Categories */}
                {TWEET_CATEGORIES.map((category) => (
                  <button
                    key={category}
                    onClick={() => handleCategoryClick(category)}
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors ${
                      activeFilter === category ? 'bg-blue-50 ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                        <span className="text-xl">{categoryIcons[category] || '📝'}</span>
                      </div>
                      {activeFilter === category && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <span className="text-sm font-medium text-gray-900 truncate block">
                        {category}
                      </span>
                      <span className="text-xs text-gray-500">
                        Filter by category
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="w-full text-sm py-2"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};