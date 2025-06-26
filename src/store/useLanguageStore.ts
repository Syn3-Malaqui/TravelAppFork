import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language = 'en' | 'ar';

interface LanguageState {
  language: Language;
  isRTL: boolean;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: 'en',
      isRTL: false,
      setLanguage: (lang: Language) => {
        const isRTL = lang === 'ar';
        set({ language: lang, isRTL });
        
        // Update document direction
        document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
        document.documentElement.lang = lang;
      },
      toggleLanguage: () => {
        const currentLang = get().language;
        const newLang = currentLang === 'en' ? 'ar' : 'en';
        get().setLanguage(newLang);
      },
    }),
    {
      name: 'language-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Apply language settings on app load
          document.documentElement.dir = state.isRTL ? 'rtl' : 'ltr';
          document.documentElement.lang = state.language;
        }
      },
    }
  )
); 