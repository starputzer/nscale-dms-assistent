/**
 * Mock-Implementierung des Settings-Stores
 */

import { defineStore } from "pinia";
import { ref, watch } from "vue";

export const useSettingsStore = defineStore("settings", () => {
  // Default-Einstellungen
  const defaultSettings = {
    fontSizeLevel: 2, // 1=klein, 2=mittel, 3=groß
    contrastMode: 'standard', // standard, high
    colorMode: 'auto', // light, dark, auto
    language: 'de', // de, en
    streamingEnabled: true
  };
  
  // Einstellungen aus localStorage laden oder Defaults verwenden
  const loadSettings = () => {
    const savedSettings = localStorage.getItem('mock_settings');
    if (savedSettings) {
      try {
        return { ...defaultSettings, ...JSON.parse(savedSettings) };
      } catch (e) {
        console.error('Fehler beim Laden der Einstellungen:', e);
      }
    }
    return { ...defaultSettings };
  };
  
  // State
  const settings = ref(loadSettings());
  
  // Helpers
  const saveSettings = () => {
    localStorage.setItem('mock_settings', JSON.stringify(settings.value));
  };
  
  // Automatisches Speichern bei Änderungen
  watch(settings, () => {
    saveSettings();
  }, { deep: true });
  
  // Getters/Setters für individuelle Einstellungen
  function getFontSizeLevel() {
    return settings.value.fontSizeLevel;
  }
  
  function setFontSizeLevel(level: number) {
    if (level >= 1 && level <= 3) {
      settings.value.fontSizeLevel = level;
    }
  }
  
  function getContrastMode() {
    return settings.value.contrastMode;
  }
  
  function setContrastMode(mode: string) {
    if (['standard', 'high'].includes(mode)) {
      settings.value.contrastMode = mode;
    }
  }
  
  function getColorMode() {
    return settings.value.colorMode;
  }
  
  function setColorMode(mode: string) {
    if (['light', 'dark', 'auto'].includes(mode)) {
      settings.value.colorMode = mode;
    }
  }
  
  function getLanguage() {
    return settings.value.language;
  }
  
  function setLanguage(lang: string) {
    if (['de', 'en'].includes(lang)) {
      settings.value.language = lang;
    }
  }
  
  function getStreamingEnabled() {
    return settings.value.streamingEnabled;
  }
  
  function setStreamingEnabled(enabled: boolean) {
    settings.value.streamingEnabled = enabled;
  }
  
  function resetToDefaults() {
    settings.value = { ...defaultSettings };
  }
  
  return {
    // State als Computed-Properties
    fontSizeLevel: {
      get: getFontSizeLevel,
      set: setFontSizeLevel
    },
    contrastMode: {
      get: getContrastMode,
      set: setContrastMode
    },
    colorMode: {
      get: getColorMode,
      set: setColorMode
    },
    language: {
      get: getLanguage,
      set: setLanguage
    },
    streamingEnabled: {
      get: getStreamingEnabled,
      set: setStreamingEnabled
    },
    
    // Getters/Setters
    getFontSizeLevel,
    setFontSizeLevel,
    getContrastMode,
    setContrastMode,
    getColorMode,
    setColorMode,
    getLanguage,
    setLanguage,
    getStreamingEnabled,
    setStreamingEnabled,
    
    // Actions
    resetToDefaults
  };
});