import { createI18n } from 'vue-i18n';
import feedback from './feedback';

// Combine all translation resources
const messages = {
  en: {
    ...feedback.en,
    toast: {
      ...feedback.en.toast,
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      info: 'Information'
    }
  },
  de: {
    ...feedback.de,
    toast: {
      ...feedback.de.toast,
      success: 'Erfolg',
      error: 'Fehler',
      warning: 'Warnung',
      info: 'Information'
    }
  }
};

// Create the i18n instance
export const i18n = createI18n({
  legacy: false,
  locale: 'de',
  fallbackLocale: 'en',
  messages
});

export default i18n;