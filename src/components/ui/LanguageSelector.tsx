import React from 'react';
import { Languages, Check } from 'lucide-react';
import { Button } from './button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { useLanguageStore } from '../../store/useLanguageStore';

interface LanguageSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const languages = [
  {
    code: 'en' as const,
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    direction: 'ltr'
  },
  {
    code: 'ar' as const,
    name: 'Arabic',
    nativeName: 'العربية',
    flag: '🇸🇦',
    direction: 'rtl'
  }
];

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ open, onOpenChange }) => {
  const { language, setLanguage, isRTL } = useLanguageStore();

  const handleLanguageSelect = (langCode: 'en' | 'ar') => {
    setLanguage(langCode);
    onOpenChange(false);
  };

  const currentLanguage = languages.find(lang => lang.code === language);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`w-[90vw] max-w-md ${isRTL ? 'font-arabic' : ''}`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isRTL ? 'text-right' : 'text-left'}`}>
            <Languages className="h-5 w-5 text-blue-500" />
            {language === 'en' ? 'Select Language' : 'اختر اللغة'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-2 py-4">
          {languages.map((lang) => (
            <Button
              key={lang.code}
              variant={language === lang.code ? "default" : "outline"}
              onClick={() => handleLanguageSelect(lang.code)}
              className={`w-full h-auto p-4 justify-between ${
                language === lang.code 
                  ? 'bg-blue-500 text-white border-blue-500' 
                  : 'hover:bg-gray-50'
              } ${lang.direction === 'rtl' ? 'text-right' : 'text-left'}`}
            >
              <div className={`flex items-center gap-3 ${lang.direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <span className="text-2xl">{lang.flag}</span>
                <div className={`flex flex-col ${lang.direction === 'rtl' ? 'items-end' : 'items-start'}`}>
                  <span className="font-medium">{lang.nativeName}</span>
                  <span className={`text-sm ${language === lang.code ? 'text-blue-100' : 'text-gray-500'}`}>
                    {lang.name}
                  </span>
                </div>
              </div>
              
              {language === lang.code && (
                <Check className="h-5 w-5" />
              )}
            </Button>
          ))}
        </div>
        
        <div className={`text-xs text-gray-500 mt-4 ${isRTL ? 'text-right' : 'text-left'}`}>
          {language === 'en' 
            ? 'Language preference will be saved automatically' 
            : 'سيتم حفظ تفضيل اللغة تلقائياً'
          }
        </div>
      </DialogContent>
    </Dialog>
  );
}; 