import React from 'react';
import { Button } from '../ui/button';
import { useLanguageStore } from '../../store/useLanguageStore';

interface MobileTabsProps {
  activeTab: 'for-you' | 'following';
  onTabChange: (tab: 'for-you' | 'following') => void;
}

export const MobileTabs: React.FC<MobileTabsProps> = ({ activeTab, onTabChange }) => {
  const { language, isRTL } = useLanguageStore();
  
  const tabs = [
    { id: 'for-you', label: language === 'en' ? 'For you' : 'لك' },
    { id: 'following', label: language === 'en' ? 'Following' : 'المتابعة' },
  ];

  return (
    <div className={`md:hidden border-b border-gray-200 bg-white ${isRTL ? 'font-arabic' : ''}`}>
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