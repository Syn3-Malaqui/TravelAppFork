import React, { useState } from 'react';
import { Button } from '../ui/button';

interface MobileTabsProps {
  activeTab: 'for-you' | 'following';
  onTabChange: (tab: 'for-you' | 'following') => void;
}

const tabs = [
  { id: 'for-you', label: 'For you' },
  { id: 'following', label: 'Following' },
];

export const MobileTabs: React.FC<MobileTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="md:hidden border-b border-gray-200 bg-white">
      <div className="flex">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant="ghost"
            className={`flex-1 py-6 px-6 font-bold text-base rounded-none border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-black'
                : 'border-transparent text-gray-500 hover:bg-gray-50'
            }`}
            onClick={() => onTabChange(tab.id as 'for-you' | 'following')}
          >
            {tab.label}
          </Button>
        ))}
      </div>
    </div>
  );
};