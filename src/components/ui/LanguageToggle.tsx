import React from 'react';
import { Languages } from 'lucide-react';
import { Button } from './button';
import { useLanguageStore } from '../../store/useLanguageStore';

interface LanguageToggleProps {
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showText?: boolean;
  className?: string;
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({ 
  variant = 'ghost', 
  size = 'default',
  showText = false,
  className = ''
}) => {
  const { language, toggleLanguage, isRTL } = useLanguageStore();

  return (
    <Button
      variant={variant}
      size={size}
      onClick={toggleLanguage}
      className={`transition-all duration-200 ${className}`}
      title={language === 'en' ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية'}
    >
      <Languages className={`h-4 w-4 ${showText && !isRTL ? 'mr-2' : showText && isRTL ? 'ml-2' : ''}`} />
      {showText && (
        <span className="font-medium">
          {language === 'en' ? 'العربية' : 'English'}
        </span>
      )}
    </Button>
  );
}; 