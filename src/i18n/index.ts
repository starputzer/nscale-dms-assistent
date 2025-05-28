import { createI18n } from "vue-i18n";
import feedback from "./feedback";
// Import with both filename options to ensure compatibility
import documentConverter from "./document-converter";
import featureToggles from "./feature-toggles";
import adminTabs from "./admin-tabs";
import adminCommon from "./admin-common";
import admin from "./admin";

// Debug import paths
console.log('[i18n] Loaded translation modules:', {
  admin: !!admin,
  adminCommon: !!adminCommon,
  adminTabs: !!adminTabs,
  documentConverter: !!documentConverter,
  featureToggles: !!featureToggles,
  feedback: !!feedback
});

// Combine all translation resources with deep merge to avoid conflicts
function deepMerge(target, source) {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] instanceof Object && key in target && target[key] instanceof Object) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

// Start with base translations, then merge others
const messages = {
  en: {
    toast: {
      success: "Success",
      error: "Error",
      warning: "Warning",
      info: "Information",
    }
  },
  de: {
    toast: {
      success: "Erfolg",
      error: "Fehler",
      warning: "Warnung",
      info: "Information",
    }
  }
};

// Merge all translations in the correct order to avoid overwriting
// Order matters - core admin translations should come first, then common, then specific modules
[admin, adminCommon, feedback, documentConverter, featureToggles, adminTabs].forEach(module => {
  if (module?.en) messages.en = deepMerge(messages.en, module.en);
  if (module?.de) messages.de = deepMerge(messages.de, module.de);
});

// Debug merged translations
console.log('[i18n] Merged translations sample:', {
  'admin.title': messages.de.admin?.title,
  'admin.docConverter.title': messages.de.admin?.docConverter?.title,
  'admin.common.refresh': messages.de.admin?.common?.refresh,
  'admin.tabs.docConverter': messages.de.admin?.tabs?.docConverter
});

// Create the i18n instance with explicit legacy configuration settings
export const i18n = createI18n({
  legacy: true, // Set to true to work with template syntax in components
  globalInjection: true, // Make i18n available in template via $t globally
  locale: "de", // Default to German
  fallbackLocale: "en",
  messages,
  // Enable component composition mode but only when explicitly requested
  allowComposition: true, // This will allow composition API usage with useScope:'global'
  // Enable silentTranslationWarn in production to avoid console warnings
  silentTranslationWarn: process.env.NODE_ENV === 'production',
  // Ensure consistent pluralization across languages
  pluralizationRules: {
    // Add any specific pluralization rules if needed
  },
  // Add missing translation handler for debugging purposes
  missing: (locale, key) => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[i18n] Missing translation: ${key} (${locale})`);
    }
    return key;
  }
});

// Force merging of messages to ensure all are available
i18n.global.mergeLocaleMessage('de', messages.de);
i18n.global.mergeLocaleMessage('en', messages.en);

export default i18n;
