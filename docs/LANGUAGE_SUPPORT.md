# Language Support Documentation

## Overview
The application now supports bilingual functionality with English and Arabic languages, including full RTL (Right-to-Left) layout support for Arabic.

## Features

### 🌐 Language Switching
- **Access Point**: Settings dropdown in both desktop sidebar and mobile navigation
- **Languages**: English and Arabic with native script display
- **Persistence**: Language preference is saved automatically in local storage
- **Real-time**: UI updates immediately without page refresh

### 🔄 RTL Layout Support
- **Direction**: Automatic layout direction change (LTR ↔ RTL)
- **Typography**: Arabic font (Noto Sans Arabic) for proper text rendering
- **Components**: All major UI components support RTL layout
- **Spacing**: Dynamic margin/padding adjustments for RTL

## Implementation Details

### Core Components

#### 1. Language Store (`useLanguageStore.ts`)
```typescript
// Language state management with Zustand
interface LanguageState {
  language: 'en' | 'ar';
  isRTL: boolean;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}
```

#### 2. Language Selector Modal (`LanguageSelector.tsx`)
- Beautiful modal with language options
- Flag icons and native language names
- Instant language switching

#### 3. Language Toggle Button (`LanguageToggle.tsx`)
- Quick toggle component for other uses
- Customizable variants and sizes

### Updated Components

#### Navigation
- **Sidebar**: Translated navigation items and settings
- **Mobile Navigation**: Language option in settings dropdown
- **Timeline**: Translated tabs, headers, and content

#### Text Translations
- Navigation: Home → الرئيسية, Explore → استكشف, etc.
- Actions: Tweet → تغريد, Settings → الإعدادات
- Interface: "What's happening?" → "ما الذي يحدث؟"

### CSS Support

#### RTL Styles (`index.css`)
```css
/* RTL Support */
[dir="rtl"] {
  direction: rtl;
  text-align: right;
}

/* Arabic Font */
.font-arabic {
  font-family: 'Noto Sans Arabic', system-ui, -apple-system, sans-serif;
}

/* RTL Spacing Adjustments */
[dir="rtl"] .mr-2 { margin-right: 0; margin-left: 0.5rem; }
[dir="rtl"] .border-r { border-right: 0; border-left: 1px solid; }
```

## Usage

### For Users
1. **Desktop**: Click Settings in sidebar → Select "Language" / "اللغة"
2. **Mobile**: Tap Settings icon → Select "Language" / "اللغة"
3. **Modal**: Choose between English (🇺🇸) or العربية (🇸🇦)
4. **Automatic**: Interface switches immediately with proper RTL support

### For Developers

#### Adding New Translatable Text
```typescript
// Import language store
import { useLanguageStore } from '../../store/useLanguageStore';

// Use in component
const { language, isRTL } = useLanguageStore();

// Conditional text
<span>{language === 'en' ? 'English Text' : 'النص العربي'}</span>

// RTL-aware styling
<div className={`${isRTL ? 'text-right border-l' : 'text-left border-r'}`}>
```

#### Adding RTL Support to Components
```typescript
// Import and use language state
const { language, isRTL } = useLanguageStore();

// Apply RTL classes
<div className={`${language === 'ar' ? 'font-arabic' : ''} ${isRTL ? 'rtl-specific-classes' : 'ltr-specific-classes'}`}>
```

## Benefits

### User Experience
- **Accessibility**: Native language support for Arabic speakers
- **Familiar Layout**: Proper RTL reading direction
- **Professional**: High-quality Arabic typography
- **Seamless**: Instant switching without interruption

### Technical
- **Persistent**: Settings saved across sessions
- **Performance**: No additional bundle splits needed
- **Maintainable**: Centralized translation system
- **Extensible**: Easy to add more languages

## Browser Support
- Modern browsers with CSS Grid and Flexbox support
- Google Fonts for Arabic typography
- Local Storage for persistence

## Future Enhancements
- Translation files for easier management
- More languages (French, German, etc.)
- Date/time localization
- Number formatting per locale
- Dynamic content translation from API 