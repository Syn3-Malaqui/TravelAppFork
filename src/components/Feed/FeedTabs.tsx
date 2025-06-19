import React from 'react';
import { Button } from '../ui/button';

interface FeedTabsProps {
  activeTab: 'for-you' | 'following';
  onTabChange: (tab: 'for-you' | 'following') => void;
}

export const FeedTabs: React.FC<FeedTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="flex border-b border-gray-200">
      <Button
        variant="ghost"
        onClick={() => onTabChange('for-you')}
        className={`flex-1 py-4 px-4 font-bold text-base rounded-none border-b-2 transition-colors ${
          activeTab === 'for-you'
            ? 'border-blue-500 text-black'
            : 'border-transparent text-gray-500 hover:bg-gray-50'
        }`}
      >
        For you
      </Button>
      <Button
        variant="ghost"
        onClick={() => onTabChange('following')}
        className={`flex-1 py-4 px-4 font-bold text-base rounded-none border-b-2 transition-colors ${
          activeTab === 'following'
            ? 'border-blue-500 text-black'
            : 'border-transparent text-gray-500 hover:bg-gray-50'
        }`}
      >
        Following
      </Button>
    </div>
  );
};