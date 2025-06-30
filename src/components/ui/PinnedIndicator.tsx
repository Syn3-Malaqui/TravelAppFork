import React from 'react';
import { Pin } from 'lucide-react';
import { useLanguageStore } from '../../store/useLanguageStore';

interface PinnedIndicatorProps {
  type: 'profile' | 'home';
  className?: string;
}

export const PinnedIndicator: React.FC<PinnedIndicatorProps> = ({ type, className = '' }) => {
  const { language } = useLanguageStore();

  const text = type === 'home' 
    ? (language === 'en' ? 'Pinned to home' : 'مثبت في الرئيسية')
    : (language === 'en' ? 'Pinned post' : 'منشور مثبت');

  const bgColor = type === 'home' ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-600';

  return (
    <div className={`flex items-center space-x-1 text-xs font-medium px-2 py-1 rounded-full ${bgColor} ${className}`}>
      <Pin className="w-3 h-3" />
      <span>{text}</span>
    </div>
  );
}; 