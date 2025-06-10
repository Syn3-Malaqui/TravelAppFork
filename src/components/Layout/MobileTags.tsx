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

  return (
    <div className="md:hidden bg-white border-b border-gray-200 px-4 py-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full flex items-center justify-between px-4 py-3 border-gray-300 hover:bg-gray-50"
          >
            <div className="flex items-center space-x-3">
              <Tag className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">
                {activeFilter || 'All Categories'}
              </span>
            </div>
            <span className="text-xs text-gray-400">Tap to change</span>
          </Button>
        </DialogTrigger>
        
        <DialogContent className="w-[95vw] max-w-md h-[70vh] p-0">
          <DialogHeader className="p-4 border-b border-gray-200">
            <DialogTitle className="text-lg font-semibold">Select Category</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col h-full">
            {/* Selected Category Display */}
            {activeFilter && (
              <div className="p-4 bg-blue-50 border-b border-blue-200">
                <div className="flex items-center space-x-3">
                  <Tag className="h-5 w-5 text-blue-600" />
                  <div className="flex-1">
                    <span className="font-medium text-blue-900">{activeFilter}</span>
                    <p className="text-xs text-blue-600">Currently selected</p>
                  </div>
                  <Check className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            )}

            {/* Category List */}
            <div className="flex-1 overflow-y-auto">
              {/* All Categories Option */}
              <button
                onClick={() => handleClearFilter()}
                className={`w-full flex items-center space-x-3 p-4 hover:bg-gray-50 transition-colors border-b border-gray-50 ${
                  !activeFilter ? 'bg-blue-50' : ''
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-xs">🌐</span>
                </div>
                <div className="flex-1 text-left">
                  <span className="font-medium text-gray-900">All Categories</span>
                  <p className="text-xs text-gray-500">Show tweets from all categories</p>
                </div>
                {!activeFilter && (
                  <Check className="h-5 w-5 text-blue-600" />
                )}
              </button>

              {/* Individual Categories */}
              {TWEET_CATEGORIES.map((category) => {
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

                return (
                  <button
                    key={category}
                    onClick={() => handleCategoryClick(category)}
                    className={`w-full flex items-center space-x-3 p-4 hover:bg-gray-50 transition-colors border-b border-gray-50 ${
                      activeFilter === category ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
                      <span className="text-xs">{categoryIcons[category] || '📝'}</span>
                    </div>
                    <div className="flex-1 text-left">
                      <span className="font-medium text-gray-900">{category}</span>
                      <p className="text-xs text-gray-500">
                        {category === 'General Discussions' && 'General conversations and discussions'}
                        {category === 'Visas' && 'Visa applications and requirements'}
                        {category === 'Hotels' && 'Hotel recommendations and reviews'}
                        {category === 'Car Rental' && 'Car rental services and experiences'}
                        {category === 'Tourist Schedules' && 'Travel itineraries and schedules'}
                        {category === 'Flights' && 'Flight information and experiences'}
                        {category === 'Restaurants and Coffees' && 'Food and dining recommendations'}
                        {category === 'Images and Creators' && 'Visual content and creator posts'}
                        {category === 'Real Estate' && 'Property and real estate discussions'}
                      </p>
                    </div>
                    {activeFilter === category && (
                      <Check className="h-5 w-5 text-blue-600" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="w-full"
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