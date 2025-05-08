/**
 * nscale DMS Assistant Theme Hook
 * 
 * Vue Composition API Hook für die Verwendung des Theme-Systems in Vue-Komponenten.
 * Bietet reaktive Zugriffsmöglichkeiten auf das aktuelle Theme und Theme-Änderungen.
 * 
 * Letzte Aktualisierung: 08.05.2025
 */

import { ref, onMounted, onUnmounted, readonly } from 'vue';
import { themeManager, THEMES } from '@/assets/theme-switcher';

/**
 * Hook für die Theme-Verwaltung in Vue-Komponenten
 * @returns Ein Objekt mit reaktiven Theme-Eigenschaften und -Methoden
 */
export function useTheme() {
  const currentTheme = ref(themeManager.getCurrentTheme());
  const useSystemTheme = ref(themeManager.isUsingSystemTheme());
  const systemIsDark = ref(window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  // Überwachen von Theme-Änderungen
  const handleThemeChange = (event: CustomEvent) => {
    currentTheme.value = event.detail.theme;
    useSystemTheme.value = event.detail.useSystemTheme;
  };
  
  // Überwachen von Änderungen an der Systemeinstellung
  const handleSystemThemeChange = (event: MediaQueryListEvent) => {
    systemIsDark.value = event.matches;
    
    // Theme aktualisieren, wenn Systemeinstellung verwendet wird
    if (useSystemTheme.value) {
      currentTheme.value = systemIsDark.value ? THEMES.DARK : THEMES.LIGHT;
    }
  };
  
  // Event-Listener beim Mounten hinzufügen
  onMounted(() => {
    document.addEventListener('nscale-theme-change', handleThemeChange as EventListener);
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', handleSystemThemeChange);
  });
  
  // Event-Listener beim Unmounten entfernen
  onUnmounted(() => {
    document.removeEventListener('nscale-theme-change', handleThemeChange as EventListener);
    window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', handleSystemThemeChange);
  });
  
  /**
   * Wechselt zu einem spezifischen Theme
   * @param theme Das Theme, zu dem gewechselt werden soll
   */
  const setTheme = (theme: string) => {
    if (Object.values(THEMES).includes(theme)) {
      themeManager.setTheme(theme);
      currentTheme.value = theme;
    }
  };
  
  /**
   * Aktiviert oder deaktiviert die Verwendung des Systemthemes
   * @param value Ob das Systemtheme verwendet werden soll
   */
  const setUseSystemTheme = (value: boolean) => {
    themeManager.setUseSystemTheme(value);
    useSystemTheme.value = value;
    
    // Wenn Systemeinstellung, dann aktuelle Einstellung anwenden
    if (value) {
      currentTheme.value = systemIsDark.value ? THEMES.DARK : THEMES.LIGHT;
    }
  };
  
  /**
   * Überprüft, ob das aktuelle Theme dunkel ist
   * @returns Ob das aktuelle Theme dunkel ist
   */
  const isDarkTheme = () => {
    return currentTheme.value === THEMES.DARK || 
      (useSystemTheme.value && systemIsDark.value);
  };
  
  /**
   * Überprüft, ob das aktuelle Theme der Kontrastmodus ist
   * @returns Ob das aktuelle Theme der Kontrastmodus ist
   */
  const isContrastTheme = () => {
    return currentTheme.value === THEMES.CONTRAST;
  };
  
  /**
   * Wechselt zwischen den verfügbaren Themes
   */
  const toggleTheme = () => {
    // Wenn Systemeinstellung, dann zu manuellem Modus wechseln
    if (useSystemTheme.value) {
      setUseSystemTheme(false);
      // Mit aktuellem Theme beginnen
      const startTheme = systemIsDark.value ? THEMES.DARK : THEMES.LIGHT;
      const nextTheme = getNextTheme(startTheme);
      setTheme(nextTheme);
      return;
    }
    
    // Zum nächsten Theme wechseln
    const nextTheme = getNextTheme(currentTheme.value);
    setTheme(nextTheme);
  };
  
  /**
   * Bestimmt das nächste Theme in der Rotation
   * @param currentTheme Das aktuelle Theme
   * @returns Das nächste Theme
   */
  const getNextTheme = (current: string) => {
    switch (current) {
      case THEMES.LIGHT:
        return THEMES.DARK;
      case THEMES.DARK:
        return THEMES.CONTRAST;
      case THEMES.CONTRAST:
        return THEMES.LIGHT;
      default:
        return THEMES.LIGHT;
    }
  };
  
  return {
    // Reaktive Eigenschaften
    currentTheme: readonly(currentTheme),
    useSystemTheme: readonly(useSystemTheme),
    systemIsDark: readonly(systemIsDark),
    
    // Konstanten
    THEMES,
    
    // Methoden
    setTheme,
    setUseSystemTheme,
    isDarkTheme,
    isContrastTheme,
    toggleTheme
  };
}

export default useTheme;