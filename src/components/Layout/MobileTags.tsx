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
            <span className="text-lg">{getActiveIcon()}</span>
          </Button>
        </DialogTrigger>
        
        <DialogContent className="w-[90vw] max-w-sm h-[60vh] p-0">
          <DialogHeader className="p-3 border-b border-gray-200">
            <DialogTitle className="text-base font-semibold">Select Category</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col h-full">
            {/* Category Grid */}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="grid grid-cols-3 gap-2">
                {/* All Categories Option */}
                <button
                  onClick={() => handleClearFilter()}
                  className={`relative flex flex-col items-center p-3 rounded-lg hover:bg-gray-50 transition-colors ${
                    !activeFilter ? 'bg-blue-50 ring-2 ring-blue-500' : ''
                  }`}
                  title="All Categories"
                >
                  <span className="text-2xl mb-1">🌐</span>
                  <span className="text-xs text-gray-600 text-center leading-tight">
                    All
                  </span>
                  {!activeFilter && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                </button>

                {/* Individual Categories */}
                {TWEET_CATEGORIES.map((category) => {
                  const shortName = category.split(' ')[0]; // Get first word for display
                  
                  return (
                    <button
                      key={category}
                      onClick={() => handleCategoryClick(category)}
                      className={`relative flex flex-col items-center p-3 rounded-lg hover:bg-gray-50 transition-colors ${
                        activeFilter === category ? 'bg-blue-50 ring-2 ring-blue-500' : ''
                      }`}
                      title={category}
                    >
                      <span className="text-2xl mb-1">{categoryIcons[category] || '📝'}</span>
                      <span className="text-xs text-gray-600 text-center leading-tight">
                        {shortName}
                      </span>
                      {activeFilter === category && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-200 bg-gray-50">
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