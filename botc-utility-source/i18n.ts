
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { translations } from './translations';

// Initialize i18next
i18n
  .use(initReactI18next)
  .init({
    resources: {
      'en': { translation: translations['en'] },
      'zh-TW': { translation: translations['zh-TW'] },
      'zh-CN': { translation: translations['zh-CN'] },
      'ja': { translation: translations['ja'] },
    },
    lng: 'zh-TW', // Default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes by default
    },
    react: {
        useSuspense: false // Prevent suspense issues if loading fails
    }
  });

export default i18n;
