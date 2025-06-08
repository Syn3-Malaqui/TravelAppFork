import React, { useState } from 'react';
import { Button } from '../ui/button';

const tabs = [
  { id: 'for-you', label: 'For you' },
  { id: 'following', label: 'Following' },
];

export const MobileTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState('for-you');

  return (
    <div className="md:hidden border-b border-gray-200 bg-white">
      <div className="flex flex-row-reverse">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant="ghost"
            className={`flex-1 py-4 px-6 font-semibold text-base rounded-none border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-black'
                : 'border-transparent text-gray-500 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>
    </div>
  );
};