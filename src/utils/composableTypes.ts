import type { Ref, ComputedRef } from 'vue';
import type { Result, Nullable, Optional } from './types';
import type { APIResponse, APIError } from './apiTypes';
import type { ChatSession, ChatMessage } from '../types/session';
import type { LoginCredentials, RegisterCredentials, User, Role, TokenStatus, PermissionCheck } from '../types/auth';
import type { FeatureToggleError, FeatureToggleStatus, FeatureConfig, FeatureToggleRole } from '../stores/featureToggles';

/**
 * Generische Typdefinitionen für Composables
 */

/**
 * Basistyp für alle Composables, die einen Zustand und Methoden zurückgeben
 */
export interface ComposableReturn<State = Record<string, any>, Methods = Record<string, (...args: any[]) => any>> {
  // Zustand (typischerweise reactive refs oder computed properties)
  [key: string]: any;
}

/**
 * Optionen für Composables
 */
export interface ComposableOptions {
  /**
   * Basis-Optionen für alle Composables
   */
  debug?: boolean;
  /**
   * Gibt an, ob Fehler in der Konsole geloggt werden sollen
   */
  logErrors?: boolean;
}

/**
 * Spezifische Composable Return Types
 */

/**
 * Return-Typ für useAuth Composable
 */
export interface UseAuthReturn {
  // Computed Properties
  user: ComputedRef<Nullable<User>>;
  isAuthenticated: ComputedRef<boolean>;
  isAdmin: ComputedRef<boolean>;
  isLoading: ComputedRef<boolean>;
  error: ComputedRef<Nullable<string>>;
  tokenStatus: ComputedRef<TokenStatus>;
  tokenExpiresIn: ComputedRef<number>;
  permissions: ComputedRef<string[]>;

  // Authentifizierungsmethoden
  login: (credentials: LoginCredentials) => Promise<boolean>;
  register: (credentials: RegisterCredentials) => Promise<boolean>;
  logout: () => Promise<void>;
  validateCurrentToken: () => Promise<boolean>;
  refreshUserInfo: () => Promise<boolean>;

  // Autorisierungsmethoden
  hasRole: (role: Role) => boolean;
  hasAnyRole: (roles: Role[]) => boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (requiredPermissions: string[]) => boolean;
  checkPermission: (permission: string) => PermissionCheck;

  // Benutzerverwaltung
  updateUserPreferences: (preferences: Record<string, any>) => Promise<boolean>;

  // Hilfsmethoden
  createAuthHeaders: () => { Authorization: string };
}

/**
 * Return-Typ für useChat Composable
 */
export interface UseChatReturn {
  // Zustand
  inputText: Ref<string>;
  isLoading: ComputedRef<boolean>;
  isStreaming: ComputedRef<boolean>;
  error: ComputedRef<Nullable<string>>;
  currentSessionId: ComputedRef<Nullable<string>>;
  currentSession: ComputedRef<Nullable<ChatSession>>;
  messages: ComputedRef<ChatMessage[]>;
  sessions: ComputedRef<ChatSession[]>;

  // Methoden
  loadSessions: () => Promise<void>;
  switchToSession: (sessionId: string) => Promise<void>;
  createNewSession: (title?: string) => Promise<string>;
  sendMessage: (content: string) => Promise<void>;
  cancelStream: () => void;
  archiveSession: (sessionId: string) => Promise<void>;
  renameSession: (sessionId: string, newTitle: string) => Promise<void>;
  togglePinSession: (sessionId: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  refreshCurrentSession: () => Promise<void>;
}

/**
 * Return-Typ für useElementSize Composable
 */
export interface UseElementSizeReturn {
  width: Ref<number>;
  height: Ref<number>;
  updateSize: () => void;
}

/**
 * Optionen für useFeatureToggles Composable
 */
export interface FeatureToggleOptions {
  /** Gibt an, ob automatisch auf den Fallback zurückgefallen werden soll bei Fehlern */
  autoFallback?: boolean;
  /** Fehlerhandler-Funktion, die bei Feature-Fehlern aufgerufen wird */
  onError?: (error: FeatureToggleError) => void;
  /** Aktuelle Benutzerrolle für Feature-Verfügbarkeit */
  userRole?: FeatureToggleRole;
  /** Gibt an, ob der Debug-Modus aktiv sein soll */
  debug?: boolean;
}

/**
 * Optionen für useApiCache Composable
 */
export interface ApiCacheOptions {
  /** Gibt an, wie lange ein Cache-Eintrag gültig ist (in Millisekunden) */
  ttl?: number;
  /** Gibt an, ob der Cache nach Ablauf der TTL automatisch gelöscht werden soll */
  autoInvalidate?: boolean;
  /** Gibt an, ob Fehler im Cache gespeichert werden sollen */
  cacheErrors?: boolean;
  /** Gibt an, ob der Cache-Status in der Konsole geloggt werden soll */
  debug?: boolean;
  /** Maximale Anzahl von Cache-Einträgen (LRU-Ersetzungsstrategie) */
  maxEntries?: number;
}

/**
 * Return-Typ für useApiCache Composable
 */
export interface UseApiCacheReturn {
  /** Führt eine API-Anfrage aus und speichert das Ergebnis im Cache */
  cachedRequest: <T = any>(
    key: string,
    fetcher: () => Promise<T>,
    options?: { ttl?: number; force?: boolean }
  ) => Promise<T>;
  
  /** Gibt an, ob ein Cache-Eintrag existiert */
  hasCache: (key: string) => boolean;
  
  /** Gibt einen Cache-Eintrag zurück */
  getCache: <T = any>(key: string) => T | null;
  
  /** Löscht einen Cache-Eintrag */
  invalidateCache: (key: string) => void;
  
  /** Löscht alle Cache-Einträge, die einem Muster entsprechen */
  invalidateCachePattern: (pattern: string | RegExp) => void;
  
  /** Löscht alle Cache-Einträge */
  clearCache: () => void;
  
  /** Aktuellen Cache-Status */
  cacheStatus: ComputedRef<{
    size: number;
    keys: string[];
    lastUpdated: Record<string, Date>;
  }>;
}

/**
 * Optionen für useLocalStorage Composable
 */
export interface LocalStorageOptions<T> {
  /** Standardwert, wenn kein Wert im LocalStorage gefunden wird */
  defaultValue?: T;
  /** Prefix für den LocalStorage-Schlüssel */
  prefix?: string;
  /** Serialisierungsfunktion */
  serializer?: (value: T) => string;
  /** Deserialisierungsfunktion */
  deserializer?: (value: string) => T;
  /** Gibt an, ob Fehler bei der (De)Serialisierung ignoriert werden sollen */
  ignoreErrors?: boolean;
}

/**
 * Return-Typ für useLocalStorage Composable
 */
export interface UseLocalStorageReturn<T> {
  /** Reaktiver Wert, der mit dem LocalStorage synchronisiert wird */
  value: Ref<T>;
  /** Setzt den Wert im LocalStorage zurück auf den Standardwert */
  reset: () => void;
  /** Manuelles Speichern eines Werts */
  save: (newValue: T) => void;
  /** Manuelles Laden des Werts aus dem LocalStorage */
  load: () => T;
  /** Löscht den Eintrag aus dem LocalStorage */
  remove: () => void;
}

/**
 * Optionen für useClipboard Composable
 */
export interface ClipboardOptions {
  /** Gibt an, wie lange die Erfolgsmeldung angezeigt werden soll (in Millisekunden) */
  successDuration?: number;
  /** Fallback-Methode, falls die Clipboard-API nicht verfügbar ist */
  fallbackToExecCommand?: boolean;
  /** Callback nach erfolgreichem Kopieren */
  onSuccess?: () => void;
  /** Callback bei Fehler */
  onError?: (error: any) => void;
}

/**
 * Return-Typ für useClipboard Composable
 */
export interface UseClipboardReturn {
  /** Kopiert einen Text in die Zwischenablage */
  copy: (text: string) => Promise<boolean>;
  /** Gibt an, ob das Kopieren erfolgreich war */
  isSuccess: Ref<boolean>;
  /** Gibt an, ob ein Fehler aufgetreten ist */
  error: Ref<Nullable<Error>>;
  /** Gibt an, ob aktuell eine Operation läuft */
  isLoading: Ref<boolean>;
  /** Zuletzt kopierter Text */
  copiedText: Ref<Nullable<string>>;
}

/**
 * Optionen für useIntersectionObserver Composable
 */
export interface IntersectionObserverOptions extends IntersectionObserverInit {
  /** Gibt an, ob der Observer automatisch gestartet werden soll */
  autoStart?: boolean;
}

/**
 * Return-Typ für useIntersectionObserver Composable
 */
export interface UseIntersectionObserverReturn {
  /** Gibt an, ob das Element sichtbar ist */
  isIntersecting: Ref<boolean>;
  /** Das beobachtete Element */
  observeElement: (element: Element) => void;
  /** Stoppt die Beobachtung */
  stop: () => void;
  /** Startet die Beobachtung neu */
  resume: () => void;
}

/**
 * Optionen für useDialog Composable
 */
export interface DialogOptions {
  /** Gibt an, ob das Dialog-Element beim Klick auf den Hintergrund geschlossen werden soll */
  closeOnClickOutside?: boolean;
  /** Gibt an, ob das Dialog-Element beim Drücken der Escape-Taste geschlossen werden soll */
  closeOnEsc?: boolean;
  /** Gibt an, ob der Dialog modal sein soll (Hintergrund abgedunkelt) */
  isModal?: boolean;
  /** Gibt an, ob der Dialog persistent sein soll (kann nicht mit Escape oder Klick außerhalb geschlossen werden) */
  persistent?: boolean;
  /** Gibt an, ob der Dialog beim Öffnen fokussiert werden soll */
  autoFocus?: boolean;
  /** Gibt an, ob der Dialog beim Schließen automatisch den vorherigen Fokus wiederherstellen soll */
  restoreFocus?: boolean;
}

/**
 * Return-Typ für useDialog Composable
 */
export interface UseDialogReturn {
  /** Gibt an, ob der Dialog geöffnet ist */
  isOpen: Ref<boolean>;
  /** Öffnet den Dialog */
  open: () => void;
  /** Schließt den Dialog */
  close: () => void;
  /** Wechselt zwischen geöffnet und geschlossen */
  toggle: () => void;
}

/**
 * Optionen für useToast Composable
 */
export interface ToastOptions {
  /** Gibt an, wie lange der Toast angezeigt werden soll (in Millisekunden) */
  duration?: number;
  /** Gibt an, welcher Typ der Toast ist */
  type?: 'info' | 'success' | 'warning' | 'error';
  /** Gibt an, ob der Toast ein Schließen-Symbol haben soll */
  closable?: boolean;
  /** Position des Toasts */
  position?: 'top' | 'top-right' | 'top-left' | 'bottom' | 'bottom-right' | 'bottom-left';
}

/**
 * Return-Typ für useToast Composable
 */
export interface UseToastReturn {
  /** Zeigt einen Toast mit dem angegebenen Text an */
  show: (message: string, options?: ToastOptions) => void;
  /** Zeigt einen Erfolgs-Toast an */
  success: (message: string, options?: Omit<ToastOptions, 'type'>) => void;
  /** Zeigt einen Info-Toast an */
  info: (message: string, options?: Omit<ToastOptions, 'type'>) => void;
  /** Zeigt einen Warnungs-Toast an */
  warning: (message: string, options?: Omit<ToastOptions, 'type'>) => void;
  /** Zeigt einen Fehler-Toast an */
  error: (message: string, options?: Omit<ToastOptions, 'type'>) => void;
  /** Schließt alle aktuell angezeigten Toasts */
  clearAll: () => void;
}

/**
 * Return-Typ für useTheme Composable
 */
export interface UseThemeReturn {
  /** Aktuelles Theme */
  theme: Ref<'light' | 'dark' | 'system'>;
  /** Wechselt zwischen Light und Dark Mode */
  toggleTheme: () => void;
  /** Setzt das Theme auf Light Mode */
  setLightTheme: () => void;
  /** Setzt das Theme auf Dark Mode */
  setDarkTheme: () => void;
  /** Setzt das Theme auf System Preference */
  setSystemTheme: () => void;
  /** Gibt an, ob der Dark Mode aktiv ist */
  isDarkMode: ComputedRef<boolean>;
  /** Gibt an, ob der Light Mode aktiv ist */
  isLightMode: ComputedRef<boolean>;
  /** Gibt an, ob der System Mode aktiv ist */
  isSystemMode: ComputedRef<boolean>;
  /** Gibt an, ob der Dark Mode aufgrund der Systemeinstellung aktiv ist */
  systemPrefersDark: Ref<boolean>;
}

/**
 * Return-Typ für useSettings Composable
 */
export interface UseSettingsReturn {
  /** Alle Einstellungen */
  settings: ComputedRef<Record<string, any>>;
  /** Gibt an, ob die Einstellungen geladen werden */
  isLoading: ComputedRef<boolean>;
  /** Fehler beim Laden oder Speichern der Einstellungen */
  error: ComputedRef<Nullable<string>>;
  
  /** Lädt die Einstellungen */
  loadSettings: () => Promise<void>;
  /** Speichert eine Einstellung */
  saveSetting: (key: string, value: any) => Promise<boolean>;
  /** Speichert mehrere Einstellungen auf einmal */
  saveSettings: (settings: Record<string, any>) => Promise<boolean>;
  /** Setzt eine Einstellung zurück */
  resetSetting: (key: string) => Promise<boolean>;
  /** Setzt alle Einstellungen zurück */
  resetAllSettings: () => Promise<boolean>;
  /** Prüft, ob eine Einstellung existiert */
  hasSetting: (key: string) => boolean;
  /** Ruft eine Einstellung ab */
  getSetting: <T = any>(key: string, defaultValue?: T) => T;
}

/**
 * Exportiere weitere Typen nach Bedarf
 */