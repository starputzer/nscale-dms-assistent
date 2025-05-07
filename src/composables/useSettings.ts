import { computed } from 'vue';
import { useSettingsStore } from '../stores/settings';
import type { 
  FontSettings, 
  A11ySettings, 
  MessageSettings, 
  ChatSettings, 
  NotificationSettings,
  ColorTheme
} from '../types/settings';

/**
 * Hook für Einstellungsfunktionen in Komponenten
 * Kapselt den Zugriff auf den Settings-Store und bietet eine vereinfachte API
 */
export function useSettings() {
  const settingsStore = useSettingsStore();
  
  // Computed Properties für reaktive Daten
  const font = computed(() => settingsStore.font);
  const currentTheme = computed(() => settingsStore.currentTheme);
  const allThemes = computed(() => settingsStore.allThemes);
  const a11y = computed(() => settingsStore.a11y);
  const messages = computed(() => settingsStore.messages);
  const chat = computed(() => settingsStore.chat);
  const notifications = computed(() => settingsStore.notifications);
  const isLoading = computed(() => settingsStore.isLoading);
  const error = computed(() => settingsStore.error);
  
  /**
   * Alle Einstellungen laden
   */
  const loadSettings = async (): Promise<void> => {
    await settingsStore.fetchSettings();
  };
  
  /**
   * Alle Einstellungen speichern
   */
  const saveSettings = async (): Promise<boolean> => {
    return await settingsStore.saveSettings();
  };
  
  /**
   * Theme ändern
   */
  const changeTheme = (themeId: string): void => {
    settingsStore.setTheme(themeId);
  };
  
  /**
   * Benutzerdefiniertes Theme hinzufügen
   */
  const addCustomTheme = (theme: ColorTheme): void => {
    settingsStore.addCustomTheme(theme);
  };
  
  /**
   * Benutzerdefiniertes Theme aktualisieren
   */
  const updateCustomTheme = (themeId: string, updatedTheme: Partial<ColorTheme>): void => {
    settingsStore.updateCustomTheme(themeId, updatedTheme);
  };
  
  /**
   * Benutzerdefiniertes Theme löschen
   */
  const deleteCustomTheme = (themeId: string): void => {
    settingsStore.deleteCustomTheme(themeId);
  };
  
  /**
   * Schrifteinstellungen aktualisieren
   */
  const updateFont = (newSettings: Partial<FontSettings>): void => {
    settingsStore.updateFontSettings(newSettings);
  };
  
  /**
   * Barrierefreiheitseinstellungen aktualisieren
   */
  const updateA11y = (newSettings: Partial<A11ySettings>): void => {
    settingsStore.updateA11ySettings(newSettings);
  };
  
  /**
   * Nachrichteneinstellungen aktualisieren
   */
  const updateMessages = (newSettings: Partial<MessageSettings>): void => {
    settingsStore.updateMessageSettings(newSettings);
  };
  
  /**
   * Chat-Einstellungen aktualisieren
   */
  const updateChat = (newSettings: Partial<ChatSettings>): void => {
    settingsStore.updateChatSettings(newSettings);
  };
  
  /**
   * Benachrichtigungseinstellungen aktualisieren
   */
  const updateNotifications = (newSettings: Partial<NotificationSettings>): void => {
    settingsStore.updateNotificationSettings(newSettings);
  };
  
  /**
   * Berechtigungen für Benachrichtigungen anfordern
   */
  const requestNotifications = async (): Promise<boolean> => {
    return await settingsStore.requestNotificationPermission();
  };
  
  /**
   * Alle Einstellungen auf Standard zurücksetzen
   */
  const resetAllSettings = async (): Promise<void> => {
    await settingsStore.resetToDefault();
  };
  
  return {
    // Computed Properties
    font,
    currentTheme,
    allThemes,
    a11y,
    messages,
    chat,
    notifications,
    isLoading,
    error,
    
    // Methoden
    loadSettings,
    saveSettings,
    changeTheme,
    addCustomTheme,
    updateCustomTheme,
    deleteCustomTheme,
    updateFont,
    updateA11y,
    updateMessages,
    updateChat,
    updateNotifications,
    requestNotifications,
    resetAllSettings
  };
}