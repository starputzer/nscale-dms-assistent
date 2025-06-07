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
function deepMerge(target: any, source: any): any {
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
    },
    common: {
      refresh: "Refresh"
    },
    performance: {
      title: 'Performance Dashboard',
      baseline: {
        title: 'Baseline Metrics'
      },
      realtime: {
        title: 'Real-time Metrics'
      },
      score: {
        title: 'Performance Score',
        excellent: 'Excellent',
        good: 'Good',
        average: 'Average',
        poor: 'Needs Improvement'
      },
      recommendations: {
        title: 'Recommendations',
        slowInitialLoad: 'Initial load time is high. Optimize bundle size and lazy loading.',
        highMemory: 'Memory usage is high. Check for memory leaks.',
        slowApi: 'API response times are slow. Optimize backend queries.'
      },
      initialLoad: 'Initial Load Time',
      timeToInteractive: 'Time to Interactive',
      memoryUsage: 'Memory Usage',
      apiResponseTime: 'API Response Time',
      renderTime: 'Render Time',
      currentMemory: 'Current Memory',
      fps: 'Frame Rate',
      export: 'Export Metrics'
    }
  },
  de: {
    toast: {
      success: "Erfolg",
      error: "Fehler",
      warning: "Warnung",
      info: "Information",
    },
    common: {
      refresh: "Aktualisieren"
    },
    performance: {
      title: 'Performance Dashboard',
      baseline: {
        title: 'Baseline-Metriken'
      },
      realtime: {
        title: 'Echtzeit-Metriken'
      },
      score: {
        title: 'Performance-Score',
        excellent: 'Exzellent',
        good: 'Gut',
        average: 'Durchschnittlich',
        poor: 'Verbesserungsbedürftig'
      },
      recommendations: {
        title: 'Empfehlungen',
        slowInitialLoad: 'Die initiale Ladezeit ist hoch. Optimieren Sie Bundle-Größe und Lazy Loading.',
        highMemory: 'Der Speicherverbrauch ist hoch. Prüfen Sie auf Memory Leaks.',
        slowApi: 'Die API-Antwortzeiten sind langsam. Optimieren Sie Backend-Queries.'
      },
      initialLoad: 'Initiale Ladezeit',
      timeToInteractive: 'Zeit bis Interaktiv',
      memoryUsage: 'Speichernutzung',
      apiResponseTime: 'API-Antwortzeit',
      renderTime: 'Render-Zeit',
      currentMemory: 'Aktueller Speicher',
      fps: 'Bildrate',
      export: 'Metriken exportieren'
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
<<<<<<< HEAD
  'admin.title': (messages.de as any).admin?.title,
  'admin.docConverter.title': (messages.de as any).admin?.docConverter?.title,
  'admin.common.refresh': (messages.de as any).admin?.common?.refresh,
  'admin.tabs.docConverter': (messages.de as any).admin?.tabs?.docConverter
=======
  'admin.title': messages.de.admin?.title,
  'admin.docConverter.title': messages.de.admin?.docConverter?.title,
  'admin.common.refresh': messages.de.admin?.common?.refresh,
  'admin.tabs.docConverter': messages.de.admin?.tabs?.docConverter
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
});

// Create the i18n instance with composition API mode
export const i18n = createI18n({
  legacy: false, // Use composition API mode
  globalInjection: false, // Don't inject $t globally
  locale: "de", // Default to German
  fallbackLocale: "en",
  messages,
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
