# TypeScript-Typen und Schnittstellen

Dieses Dokument beschreibt die TypeScript-Typen und Schnittstellen, die im nscale DMS Assistenten für das State-Management verwendet werden.

## Inhaltsverzeichnis

1. [Allgemeine Typen](#allgemeine-typen)
2. [Auth-Typen](#auth-typen)
3. [Sessions-Typen](#sessions-typen)
4. [UI-Typen](#ui-typen)
5. [Settings-Typen](#settings-typen)
6. [Feature-Toggle-Typen](#feature-toggle-typen)
7. [Bridge-Typen](#bridge-typen)
8. [API-Response-Typen](#api-response-typen)
9. [Best Practices](#best-practices)

## Allgemeine Typen

### Basis-Typen

```typescript
// src/types/common.ts

/**
 * Basis-Typ für alle Entitäten mit ID
 */
export interface BaseEntity {
  /** Eindeutige ID der Entität */
  id: string;
}

/**
 * Typ für Zeitstempel (ISO-String oder Date-Objekt)
 */
export type Timestamp = string | Date;

/**
 * Basis-Typ für paginierte API-Antworten
 */
export interface PaginatedResponse<T> {
  /** Liste der Elemente */
  items: T[];
  /** Gesamtanzahl der verfügbaren Elemente */
  total: number;
  /** Aktuelle Seite */
  page: number;
  /** Anzahl der Elemente pro Seite */
  pageSize: number;
  /** Gibt an, ob weitere Seiten verfügbar sind */
  hasMore: boolean;
}

/**
 * Standardmäßige API-Antwortstruktur
 */
export interface ApiResponse<T = any> {
  /** Erfolgs- oder Fehlerstatus */
  success: boolean;
  /** Optionale Nachricht */
  message?: string;
  /** Antwortdaten */
  data?: T;
  /** Fehlerdetails, falls vorhanden */
  error?: {
    /** Fehlercode */
    code: string;
    /** Detaillierte Fehlermeldung */
    message: string;
    /** Zusätzliche Fehlerdetails */
    details?: any;
  };
}
```

## Auth-Typen

```typescript
// src/types/auth.ts

import { BaseEntity, Timestamp } from './common';

/**
 * Verfügbare Benutzerrollen im System
 */
export type Role = 'user' | 'admin' | 'editor' | 'viewer';

/**
 * Benutzertyp mit Basis-Informationen
 */
export interface User extends BaseEntity {
  /** Vollständiger Name des Benutzers */
  name: string;
  /** E-Mail-Adresse des Benutzers */
  email: string;
  /** Liste der Rollen des Benutzers */
  roles: Role[];
  /** Profilbild-URL (optional) */
  avatarUrl?: string;
  /** Zeitpunkt der letzten Anmeldung */
  lastLogin?: Timestamp;
  /** Zusätzliche Benutzermetadaten */
  metadata?: Record<string, any>;
}

/**
 * Login-Anmeldedaten
 */
export interface LoginCredentials {
  /** E-Mail-Adresse für die Anmeldung */
  email: string;
  /** Passwort für die Anmeldung */
  password: string;
  /** Anmeldung merken (optional) */
  rememberMe?: boolean;
}

/**
 * Antwort auf eine erfolgreiche Anmeldung
 */
export interface LoginResponse {
  /** JWT-Token für die API-Authentifizierung */
  token: string;
  /** Benutzerinformationen */
  user: User;
  /** Gültigkeitsdauer des Tokens in Millisekunden */
  expiresIn: number;
  /** Optionaler Refresh-Token */
  refreshToken?: string;
}

/**
 * Auth-Store-Zustand
 */
export interface AuthState {
  /** Aktueller Benutzer (null, wenn nicht angemeldet) */
  user: User | null;
  /** JWT-Token für API-Anfragen */
  token: string | null;
  /** Ablaufzeitpunkt des Tokens (Millisekunden-Timestamp) */
  expiresAt: number | null;
  /** Gibt an, ob gerade ein Auth-Vorgang läuft */
  isLoading: boolean;
  /** Letzter Fehler bei Auth-Vorgängen */
  error: string | null;
  /** Schema-Version für Migrationszwecke */
  version: number;
}
```

## Sessions-Typen

```typescript
// src/types/session.ts

import { BaseEntity, Timestamp } from './common';

/**
 * Chat-Session-Typ
 */
export interface ChatSession extends BaseEntity {
  /** Titel der Chat-Session */
  title: string;
  /** Erstellungszeitpunkt */
  createdAt: Timestamp;
  /** Letzter Aktualisierungszeitpunkt */
  updatedAt: Timestamp;
  /** Anzahl der Nachrichten in dieser Session */
  messageCount: number;
  /** Gibt an, ob die Session angeheftet ist */
  isPinned?: boolean;
  /** Gibt an, ob die Session archiviert ist */
  isArchived?: boolean;
  /** Kategorie der Session (optional) */
  category?: string;
  /** Benutzerdefinierte Tags (optional) */
  tags?: string[];
  /** Zusätzliche Metadaten */
  metadata?: Record<string, any>;
}

/**
 * Nachrichtenrollen in einer Chat-Konversation
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Status einer Nachricht
 */
export type MessageStatus = 'pending' | 'sent' | 'error';

/**
 * Chat-Nachricht-Typ
 */
export interface ChatMessage extends BaseEntity {
  /** ID der Session, zu der diese Nachricht gehört */
  sessionId: string;
  /** Inhalt der Nachricht */
  content: string;
  /** Rolle des Absenders (Benutzer/Assistent/System) */
  role: MessageRole;
  /** Zeitstempel der Nachricht */
  timestamp: Timestamp;
  /** Gibt an, ob die Nachricht gerade gestreamt wird */
  isStreaming?: boolean;
  /** Status der Nachricht */
  status?: MessageStatus;
  /** Quellenverweise und andere Metadaten */
  metadata?: {
    /** Liste der Quellen */
    sources?: Array<{
      /** Titel der Quelle */
      title: string;
      /** URL oder Pfad zur Quelle */
      source: string;
      /** Relevanz-Score (0-1) */
      relevance?: number;
    }>;
    /** Zusätzliche Metadaten */
    [key: string]: any;
  };
}

/**
 * Parameter für das Senden einer Nachricht
 */
export interface SendMessageParams {
  /** ID der Session, an die die Nachricht gesendet werden soll */
  sessionId: string;
  /** Inhalt der Nachricht */
  content: string;
  /** Rolle des Absenders (standardmäßig 'user') */
  role?: MessageRole;
}

/**
 * Status des Nachrichtenstreaming
 */
export interface StreamingStatus {
  /** Gibt an, ob gerade gestreamt wird */
  isActive: boolean;
  /** Fortschritt des Streamings (0-100) */
  progress: number;
  /** ID der Session, die gerade streamt */
  currentSessionId: string | null;
}

/**
 * Sessions-Store-Zustand
 */
export interface SessionsState {
  /** Liste aller verfügbaren Sessions */
  sessions: ChatSession[];
  /** ID der aktuell ausgewählten Session */
  currentSessionId: string | null;
  /** Nachrichten, gruppiert nach Session-ID */
  messages: Record<string, ChatMessage[]>;
  /** Status des Streamings */
  streaming: StreamingStatus;
  /** Gibt an, ob gerade ein Ladevorgang läuft */
  isLoading: boolean;
  /** Letzter Fehler bei Session-Operationen */
  error: string | null;
  /** Schema-Version für Migrationszwecke */
  version: number;
}
```

## UI-Typen

```typescript
// src/types/ui.ts

/**
 * Verfügbare Ansichtsmodi
 */
export type ViewMode = 'default' | 'compact' | 'expanded';

/**
 * Status der Seitenleiste
 */
export interface SidebarState {
  /** Gibt an, ob die Seitenleiste geöffnet ist */
  isOpen: boolean;
  /** Breite der Seitenleiste in Pixeln */
  width: number;
  /** Aktuell aktiver Tab in der Seitenleiste */
  activeTab: string;
}

/**
 * Toast-Benachrichtigungstypen
 */
export type ToastType = 'info' | 'success' | 'warning' | 'error';

/**
 * Toast-Benachrichtigung
 */
export interface Toast {
  /** Eindeutige ID der Benachrichtigung */
  id: string;
  /** Art der Benachrichtigung */
  type: ToastType;
  /** Nachrichteninhalt */
  message: string;
  /** Dauer in Millisekunden (0 für persistent) */
  duration?: number;
  /** Gibt an, ob der Benutzer die Benachrichtigung schließen kann */
  closable?: boolean;
  /** Aktion bei Klick auf die Benachrichtigung */
  onClick?: () => void;
}

/**
 * Modal-Dialog
 */
export interface Modal {
  /** Eindeutige ID des Modals */
  id: string;
  /** Titel des Modals */
  title: string;
  /** Inhalt des Modals (Text oder HTML) */
  content: string;
  /** Text für Bestätigungsbutton */
  confirmText?: string;
  /** Text für Abbruchbutton */
  cancelText?: string;
  /** Aktion bei Klick auf Bestätigen */
  onConfirm?: () => void;
  /** Aktion bei Klick auf Abbrechen */
  onCancel?: () => void;
  /** Zusätzliche Modaloptionen */
  options?: {
    /** Breite des Modals */
    width?: string | number;
    /** Gibt an, ob das Modal durch Klick außerhalb geschlossen werden kann */
    closeOnClickOutside?: boolean;
    /** Zusätzliche CSS-Klassen */
    className?: string;
  };
}

/**
 * UI-Store-Zustand
 */
export interface UIState {
  /** Status der Seitenleiste */
  sidebar: SidebarState;
  /** Dark Mode aktiviert */
  darkMode: boolean;
  /** Aktueller Ansichtsmodus */
  viewMode: ViewMode;
  /** Liste aktiver Modals */
  activeModals: Modal[];
  /** Liste aktueller Toast-Benachrichtigungen */
  toasts: Toast[];
  /** Gibt an, ob gerade ein Ladevorgang läuft */
  isLoading: boolean;
  /** Gibt an, ob die Ansicht auf einem mobilen Gerät ist */
  isMobile: boolean;
  /** Schema-Version für Migrationszwecke */
  version: number;
}
```

## Settings-Typen

```typescript
// src/types/settings.ts

/**
 * Theme-Definition
 */
export interface Theme {
  /** Eindeutige ID des Themes */
  id: string;
  /** Anzeigename des Themes */
  name: string;
  /** Gibt an, ob es ein dunkles Theme ist */
  isDark: boolean;
  /** Primärfarbe */
  primaryColor: string;
  /** Sekundärfarbe */
  secondaryColor: string;
  /** Hintergrundfarbe */
  backgroundColor: string;
  /** Textfarbe */
  textColor: string;
  /** Zusätzliche CSS-Variablen */
  variables: Record<string, string>;
}

/**
 * Sprache-Definition
 */
export interface Language {
  /** Sprachcode (z.B. 'de-DE') */
  code: string;
  /** Anzeigename der Sprache */
  name: string;
  /** Flaggen-Icon-URL (optional) */
  flagIcon?: string;
}

/**
 * Barrierefreiheit-Einstellungen
 */
export interface AccessibilitySettings {
  /** Hoher Kontrast aktiviert */
  highContrast: boolean;
  /** Animationen reduzieren */
  reduceMotion: boolean;
  /** Screenreader-Optimierungen */
  screenReaderOptimized: boolean;
  /** Tastaturnavigation verbessern */
  enhancedKeyboardNavigation: boolean;
}

/**
 * Benachrichtigungseinstellungen
 */
export interface NotificationSettings {
  /** Desktop-Benachrichtigungen aktiviert */
  desktopEnabled: boolean;
  /** In-App-Benachrichtigungen aktiviert */
  inAppEnabled: boolean;
  /** E-Mail-Benachrichtigungen aktiviert */
  emailEnabled: boolean;
  /** Benachrichtigungston aktiviert */
  soundEnabled: boolean;
  /** Lautstärke des Benachrichtigungstons (0-1) */
  soundVolume: number;
}

/**
 * Settings-Store-Zustand
 */
export interface SettingsState {
  /** Aktuell ausgewähltes Theme */
  theme: string;
  /** Verfügbare Themes */
  availableThemes: Theme[];
  /** Schriftgröße in Pixeln */
  fontSize: number;
  /** Ausgewählte Sprache */
  language: string;
  /** Verfügbare Sprachen */
  availableLanguages: Language[];
  /** Barrierefreiheit-Einstellungen */
  accessibility: AccessibilitySettings;
  /** Benachrichtigungseinstellungen */
  notifications: NotificationSettings;
  /** Benutzerdefinierte Einstellungen */
  customSettings: Record<string, any>;
  /** Schema-Version für Migrationszwecke */
  version: number;
}
```

## Feature-Toggle-Typen

```typescript
// src/types/featureToggles.ts

/**
 * Feature-Toggle-Definitionen
 */
export interface FeatureToggles {
  /** Schema-Version für Migrationszwecke */
  version: number;
  
  // Store-Features
  /** Pinia Auth-Store aktivieren */
  usePiniaAuth: boolean;
  /** Pinia Sessions-Store aktivieren */
  usePiniaSessions: boolean;
  /** Pinia UI-Store aktivieren */
  usePiniaUI: boolean;
  /** Pinia Settings-Store aktivieren */
  usePiniaSettings: boolean;
  
  // UI-Features
  /** Neue UI-Komponenten aktivieren */
  useNewUIComponents: boolean;
  /** Toast-Benachrichtigungen aktivieren */
  useToastNotifications: boolean;
  /** Moderne Seitenleiste aktivieren */
  useModernSidebar: boolean;
  /** Neues Admin-Panel aktivieren */
  useNewAdminPanel: boolean;
  
  // Theme-Features
  /** Dark Mode aktivieren */
  useDarkMode: boolean;
  /** Theme-Anpassung aktivieren */
  useThemeCustomization: boolean;
  
  // Legacy-Integration
  /** Legacy-Bridge aktivieren */
  useLegacyBridge: boolean;
  /** Lokalen Speicher migrieren */
  migrateLocalStorage: boolean;
  
  // Dokumentenkonverter-Features
  /** Moderne Dokumentenkonverter-UI aktivieren */
  useModernDocConverter: boolean;
}
```

## Bridge-Typen

```typescript
// src/types/bridge.ts

/**
 * Bridge-Konfiguration
 */
export interface BridgeConfig {
  /** Bridge global aktivieren/deaktivieren */
  ENABLED: boolean;
  
  /** Auth-Store-Bridge aktivieren */
  AUTH_ENABLED: boolean;
  /** Sessions-Store-Bridge aktivieren */
  SESSIONS_ENABLED: boolean;
  /** UI-Store-Bridge aktivieren */
  UI_ENABLED: boolean;
  /** Settings-Store-Bridge aktivieren */
  SETTINGS_ENABLED: boolean;
  
  /** Legacy-Event-Handling aktivieren */
  LEGACY_EVENTS_ENABLED: boolean;
  
  /** Debug-Modus aktivieren */
  DEBUG: boolean;
}

/**
 * Bridge-Instanz
 */
export interface Bridge {
  /** Gibt an, ob die Bridge aktiviert ist */
  enabled: boolean;
  /** Bereinigt die Bridge */
  cleanup: () => void;
}

/**
 * Event-Bus-Instanz
 */
export interface EventBusInstance {
  /** Event-Handler registrieren */
  on: (event: string, callback: (data?: any) => void) => () => void;
  /** Event auslösen */
  emit: (event: string, data?: any) => void;
  /** Alle Event-Handler löschen */
  clear: () => void;
}
```

## API-Response-Typen

```typescript
// src/types/api.ts

import { User, Role } from './auth';
import { ChatSession, ChatMessage } from './session';
import { ApiResponse, PaginatedResponse } from './common';

/**
 * API-Antwort für Login
 */
export type LoginApiResponse = ApiResponse<{
  /** JWT-Token */
  token: string;
  /** Benutzerinformationen */
  user: User;
  /** Gültigkeitsdauer in Millisekunden */
  expiresIn: number;
  /** Optionaler Refresh-Token */
  refreshToken?: string;
}>;

/**
 * API-Antwort für Benutzerinfo
 */
export type UserInfoApiResponse = ApiResponse<{
  /** Benutzerinformationen */
  user: User;
}>;

/**
 * API-Antwort für Sessions-Liste
 */
export type SessionsListApiResponse = ApiResponse<PaginatedResponse<ChatSession>>;

/**
 * API-Antwort für Session-Details
 */
export type SessionDetailsApiResponse = ApiResponse<{
  /** Session-Details */
  session: ChatSession;
  /** Gesamtanzahl der Nachrichten */
  messageCount: number;
  /** Erstellungszeitpunkt */
  createdAt: string;
  /** Letzter Aktualisierungszeitpunkt */
  updatedAt: string;
}>;

/**
 * API-Antwort für Nachrichten einer Session
 */
export type SessionMessagesApiResponse = ApiResponse<PaginatedResponse<ChatMessage>>;

/**
 * API-Antwort für das Senden einer Nachricht
 */
export type SendMessageApiResponse = ApiResponse<{
  /** Gesendete Nachricht */
  message: ChatMessage;
  /** Gesamtanzahl der Nachrichten in der Session */
  messageCount: number;
}>;

/**
 * API-Antwort für Streaming-Events
 */
export interface StreamingEvent {
  /** Art des Events */
  type: 'content' | 'metadata' | 'progress' | 'end' | 'error';
  /** Inhalts-Chunk bei 'content'-Typ */
  content?: string;
  /** Metadaten bei 'metadata'-Typ */
  metadata?: Record<string, any>;
  /** Fortschritt (0-100) bei 'progress'-Typ */
  progress?: number;
  /** Fehlermeldung bei 'error'-Typ */
  error?: string;
  /** Vollständige Nachricht bei 'end'-Typ */
  message?: ChatMessage;
}
```

## Best Practices

### Verwendung von Utility-Typen

TypeScript bietet nützliche Utility-Typen für häufige Anwendungsfälle:

```typescript
// Beispiele für Utility-Typen

// Nur Lese-Eigenschaften
type ReadonlyUser = Readonly<User>;

// Optionale Eigenschaften
type PartialUser = Partial<User>;

// Auswahl bestimmter Eigenschaften
type UserCredentials = Pick<User, 'email' | 'id'>;

// Ausschluss bestimmter Eigenschaften
type PublicUser = Omit<User, 'roles' | 'metadata'>;

// Record für Mapping von Schlüsseln zu Werten
type RolePermissions = Record<Role, string[]>;
```

### Typ-Guards

Verwenden Sie Typ-Guards, um Typen zur Laufzeit zu überprüfen:

```typescript
// Beispiel für einen Typ-Guard
function isUser(obj: any): obj is User {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.email === 'string' &&
    Array.isArray(obj.roles)
  );
}

// Verwendung des Typ-Guards
function processUserData(data: any) {
  if (isUser(data)) {
    // TypeScript weiß jetzt, dass data vom Typ User ist
    console.log(`Benutzer: ${data.name}, Rollen: ${data.roles.join(', ')}`);
  } else {
    console.error('Ungültiges Benutzerobjekt:', data);
  }
}
```

### Type Assertion vs. Typ-Guards

Bevorzugen Sie Typ-Guards gegenüber Type Assertions:

```typescript
// Vermeiden (Type Assertion)
const user = data as User;

// Besser (Typ-Guard mit Laufzeitüberprüfung)
if (isUser(data)) {
  const user = data;  // Automatisch als User erkannt
}
```

### Strikte Nullability-Überprüfung

Verwenden Sie strikte Nullability-Überprüfung, um `null` und `undefined` zu behandeln:

```typescript
// Optional Chaining
const userName = user?.name ?? 'Unbekannter Benutzer';

// Nullability-Überprüfung in Funktionen
function getUserRole(user: User | null): Role | undefined {
  if (!user) return undefined;
  return user.roles[0];
}
```

### Generische Typen

Verwenden Sie generische Typen für flexible Komponenten und Funktionen:

```typescript
// Generischer API-Client
class ApiClient<T> {
  async fetch(url: string): Promise<ApiResponse<T>> {
    // Implementation...
    return {} as ApiResponse<T>;
  }
}

// Verwendung mit spezifischem Typ
const userClient = new ApiClient<User>();
const response = await userClient.fetch('/api/users/me');
// response hat den Typ ApiResponse<User>
```