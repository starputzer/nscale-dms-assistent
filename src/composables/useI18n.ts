import { ref, computed } from "vue";

// Default i18n translations
const translations = {
  en: {
    toast: {
      success: "Success",
      error: "Error",
      warning: "Warning",
      info: "Information",
      close: "Close",
      ariaLabel: "Notification",
      timeRemaining: "Time remaining",
    },
    dialog: {
      close: "Close",
      confirm: "Confirm",
      cancel: "Cancel",
      ok: "OK",
      yes: "Yes",
      no: "No",
      prompt: "Prompt",
      alert: "Alert",
      warning: "Warning",
      error: "Error",
      success: "Success",
      info: "Information",
      requiredField: "This field is required",
      invalidInput: "Invalid input",
    },
    notification: {
      types: {
        error: "Error",
        success: "Success",
        warning: "Warning",
        info: "Information",
        system: "System Notification",
      },
    },
    loading: {
      text: "Loading...",
      processing: "Processing...",
      uploading: "Uploading...",
      downloading: "Downloading...",
    },
    progress: {
      complete: "Complete",
      failed: "Failed",
      inProgress: "In Progress",
      waiting: "Waiting",
    },
    monitoring: {
      title: "Feature Toggle Monitoring",
      refresh: "Refresh",
      export: "Export Data",
      timeRange: {
        hour: "Last Hour",
        day: "Last Day",
        week: "Last Week",
        month: "Last Month",
      },
      summary: {
        activeFeatures: "Active Features",
        errors: "Errors (Total)",
        fallbacks: "Active Fallbacks",
        users: "Active Users",
      },
      charts: {
        errorRate: "Error Rate by Feature",
        featureUsage: "Feature Usage",
        performance: "Performance Metrics",
        userInteraction: "User Interactions",
      },
      alerts: {
        title: "Alerts & Notifications",
        acknowledge: "Acknowledge",
        disable: "Disable Feature",
        noAlerts: "No active alerts",
      },
      tabs: {
        errors: "Error Logs",
        performance: "Performance Metrics",
        usage: "Usage Statistics",
        settings: "Settings",
      },
    },
    settings: {
      title: "Settings",
      save: "Save",
      reset: "Reset",
      theme: {
        label: "Theme",
        light: "Light",
        dark: "Dark",
        system: "System",
      },
    },
  },
  de: {
    toast: {
      success: "Erfolg",
      error: "Fehler",
      warning: "Warnung",
      info: "Information",
      close: "Schließen",
      ariaLabel: "Benachrichtigung",
      timeRemaining: "Verbleibende Zeit",
    },
    dialog: {
      close: "Schließen",
      confirm: "Bestätigen",
      cancel: "Abbrechen",
      ok: "OK",
      yes: "Ja",
      no: "Nein",
      prompt: "Eingabe",
      alert: "Hinweis",
      warning: "Warnung",
      error: "Fehler",
      success: "Erfolg",
      info: "Information",
      requiredField: "Dieses Feld ist erforderlich",
      invalidInput: "Ungültige Eingabe",
    },
    notification: {
      types: {
        error: "Fehler",
        success: "Erfolg",
        warning: "Warnung",
        info: "Information",
        system: "Systembenachrichtigung",
      },
    },
    loading: {
      text: "Wird geladen...",
      processing: "Wird verarbeitet...",
      uploading: "Wird hochgeladen...",
      downloading: "Wird heruntergeladen...",
    },
    progress: {
      complete: "Abgeschlossen",
      failed: "Fehlgeschlagen",
      inProgress: "In Bearbeitung",
      waiting: "Wartend",
    },
    monitoring: {
      title: "Feature-Toggle-Monitoring",
      refresh: "Aktualisieren",
      export: "Daten exportieren",
      timeRange: {
        hour: "Letzte Stunde",
        day: "Letzter Tag",
        week: "Letzte Woche",
        month: "Letzter Monat",
      },
      summary: {
        activeFeatures: "Aktive Features",
        errors: "Fehler (Gesamt)",
        fallbacks: "Aktive Fallbacks",
        users: "Aktive Benutzer",
      },
      charts: {
        errorRate: "Fehlerrate nach Feature",
        featureUsage: "Feature-Nutzung",
        performance: "Performance-Metriken",
        userInteraction: "Benutzerinteraktionen",
      },
      alerts: {
        title: "Warnungen & Benachrichtigungen",
        acknowledge: "Bestätigen",
        disable: "Feature deaktivieren",
        noAlerts: "Keine aktiven Warnungen",
      },
      tabs: {
        errors: "Fehlerprotokolle",
        performance: "Performance-Metriken",
        usage: "Nutzungsstatistiken",
        settings: "Einstellungen",
      },
    },
    settings: {
      title: "Einstellungen",
      save: "Speichern",
      reset: "Zurücksetzen",
      theme: {
        label: "Farbschema",
        light: "Hell",
        dark: "Dunkel",
        system: "System",
      },
    },
  },
};

// Current language
const currentLocale = ref(navigator.language.split("-")[0] || "en");

// Fallback to English if the language is not supported
if (!translations[currentLocale.value]) {
  currentLocale.value = "en";
}

/**
 * Composable for internationalization
 */
export function useI18n() {
  /**
   * Translates a key to the current language
   * @param key The translation key
   * @param fallback A fallback string if the key is not found
   * @returns The translated string or the fallback
   */
  function t(key: string, fallback?: string): string {
    const keys = key.split(".");
    let result = translations[currentLocale.value];

    // Navigate through the nested keys
    for (const k of keys) {
      if (result && result[k]) {
        result = result[k];
      } else {
        return fallback || key;
      }
    }

    return typeof result === "string" ? result : fallback || key;
  }

  /**
   * Changes the current language
   * @param locale The new locale to use
   */
  function setLocale(locale: string) {
    if (translations[locale]) {
      currentLocale.value = locale;
    } else {
      console.warn(
        `Language "${locale}" is not supported. Falling back to English.`,
      );
      currentLocale.value = "en";
    }
  }

  /**
   * Gets the current locale
   */
  const locale = computed(() => currentLocale.value);

  /**
   * Get all available locales
   */
  const availableLocales = computed(() => Object.keys(translations));

  /**
   * Add translations for a new locale or extend existing ones
   * @param locale The locale to add or extend
   * @param newTranslations The translations to add
   */
  function addTranslations(
    locale: string,
    newTranslations: Record<string, any>,
  ) {
    if (!translations[locale]) {
      translations[locale] = newTranslations;
    } else {
      // Deep merge the translations
      translations[locale] = deepMerge(translations[locale], newTranslations);
    }
  }

  /**
   * Deep merge two objects
   */
  function deepMerge(target: Record<string, any>, source: Record<string, any>) {
    const result = { ...target };

    for (const key in source) {
      if (
        source[key] instanceof Object &&
        key in target &&
        target[key] instanceof Object
      ) {
        result[key] = deepMerge(target[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  return {
    t,
    setLocale,
    locale,
    availableLocales,
    addTranslations,
  };
}

// Create a global i18n instance for components that need it
export const i18n = {
  t: (key: string, fallback?: string) => {
    const keys = key.split(".");
    let result = translations[currentLocale.value];

    // Navigate through the nested keys
    for (const k of keys) {
      if (result && result[k]) {
        result = result[k];
      } else {
        return fallback || key;
      }
    }

    return typeof result === "string" ? result : fallback || key;
  },
  locale: currentLocale,
  availableLocales: Object.keys(translations),
};
