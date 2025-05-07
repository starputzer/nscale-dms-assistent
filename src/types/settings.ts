/**
 * Typdefinitionen für den Settings-Store
 */

export interface FontSettings {
  size: 'small' | 'medium' | 'large' | 'extra-large';
  family: 'system' | 'serif' | 'sans-serif' | 'monospace';
  lineHeight: 'compact' | 'normal' | 'relaxed';
}

export interface ColorTheme {
  id: string;
  name: string;
  isDark: boolean;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    error: string;
    warning: string;
    success: string;
  };
}

export interface ThemeSettings {
  currentTheme: string;
  customThemes: ColorTheme[];
}

export interface A11ySettings {
  reduceMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  screenReader: boolean;
}

export interface MessageSettings {
  renderMarkdown: boolean;
  codeHighlighting: boolean;
  showTimestamps: boolean;
  maxDisplayedMessages: number;
}

export interface ChatSettings {
  autoSubmit: boolean;
  clearInputAfterSubmit: boolean;
  enableTextCompletion: boolean;
  enableStreamedResponse: boolean;
  showSourceReferences: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  desktop: boolean;
  sessionCompletion: boolean;
  mentions: boolean;
}

export interface SettingsState {
  font: FontSettings;
  theme: ThemeSettings;
  a11y: A11ySettings;
  messages: MessageSettings;
  chat: ChatSettings;
  notifications: NotificationSettings;
  isLoading: boolean;
  error: string | null;
}