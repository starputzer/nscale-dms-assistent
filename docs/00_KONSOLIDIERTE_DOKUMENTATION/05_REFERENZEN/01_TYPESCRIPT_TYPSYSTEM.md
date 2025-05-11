---
title: "TypeScript-Typsystem und Type-Definitionen"
version: "1.0.0"
date: "10.05.2025"
lastUpdate: "11.05.2025"
author: "Martin Heinrich"
status: "Aktiv"
priority: "Hoch"
category: "Referenzen"
tags: ["TypeScript", "Typen", "Interfaces", "Type-Guards", "Type-Safety", "Generics"]
---

# TypeScript-Typsystem und Type-Definitionen

> **Letzte Aktualisierung:** 10.05.2025 | **Version:** 1.0.0 | **Status:** Aktiv

## Übersicht

Dieses Dokument beschreibt das TypeScript-Typsystem und die Type-Definitionen, die im nscale DMS Assistenten verwendet werden. Es dient als umfassende Referenz für die Entwicklung von typensicheren Komponenten und Funktionen.

Das Typsystem des nscale DMS Assistenten ist darauf ausgelegt, maximale Typensicherheit und Entwicklerunterstützung zu bieten. Es umfasst Definitionen für:

1. Datenmodell-Typen für alle Kernfunktionalitäten
2. Store-Zustände für die Zustandsverwaltung
3. API-Schnittstellentypen für die Backend-Kommunikation
4. Hilfstypen für häufige Muster
5. Type-Guards für Laufzeitüberprüfungen

## Allgemeine Typen

### Basis-Typen

Die grundlegenden Typen bilden die Basis für alle anderen Definitionsstrukturen:

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

## Modul-spezifische Typen

### Auth-Typen

Die Auth-Typen definieren die Benutzerauthentifizierung und -verwaltung:

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

### Sessions-Typen

Die Sessions-Typen beschreiben Chat-Sessions und -Nachrichten:

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

### UI-Typen

Die UI-Typen definieren Oberflächenkomponenten und Benutzerinteraktionen:

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

### Settings-Typen

Die Settings-Typen definieren Benutzereinstellungen und Konfigurationen:

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

### Feature-Toggle-Typen

Die Feature-Toggle-Typen steuern die stufenweise Aktivierung von Funktionen:

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
  
  // Weitere Feature-Toggle-Kategorien...
}
```

### Bridge-Typen

Die Bridge-Typen definieren die Integration zwischen neuen und Legacy-Komponenten:

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
```

### API-Response-Typen

Die API-Response-Typen definieren standardisierte Antwortstrukturen für API-Anfragen:

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
 * API-Antwort für Sessions-Liste
 */
export type SessionsListApiResponse = ApiResponse<PaginatedResponse<ChatSession>>;

/**
 * API-Antwort für das Senden einer Nachricht
 */
export type SendMessageApiResponse = ApiResponse<{
  /** Gesendete Nachricht */
  message: ChatMessage;
  /** Gesamtanzahl der Nachrichten in der Session */
  messageCount: number;
}>;

// Weitere API-Response-Typen...
```

## Fortgeschrittene TypeScript-Funktionen

### Generische Typ-Definitionen

Die generischen Typen ermöglichen die Wiederverwendung von Typstrukturen mit unterschiedlichen Inhaltstypen:

```typescript
/**
 * Generischer Cache-Eintrag
 */
export interface CacheEntry<T> {
  /** Gespeicherte Daten */
  data: T;
  /** Zeitpunkt der Speicherung */
  timestamp: number;
  /** Time-to-Live in Millisekunden */
  ttl: number;
  /** Gibt an, ob der Eintrag gültig ist */
  isValid(): boolean;
}

/**
 * Cache-Service mit generischem Typ
 */
export class CacheService<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  
  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && entry.isValid()) {
      return entry.data;
    }
    return null;
  }
  
  set(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      isValid: function() {
        return Date.now() - this.timestamp < this.ttl;
      }
    });
  }
}
```

### Type-Guards

Type-Guards ermöglichen die Laufzeitüberprüfung von Typen und verbessern die Typinferenz:

```typescript
/**
 * Type-Guard für User-Objekte
 */
export function isUser(obj: any): obj is User {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.email === 'string' &&
    Array.isArray(obj.roles)
  );
}

/**
 * Type-Guard für API-Fehlerobjekte
 */
export function isApiError(obj: any): obj is ApiResponse['error'] {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.code === 'string' &&
    typeof obj.message === 'string'
  );
}

/**
 * Verwendung von Type-Guards
 */
function processApiResponse<T>(response: unknown): T | null {
  if (
    response &&
    typeof response === 'object' &&
    'success' in response &&
    'data' in response
  ) {
    const apiResponse = response as ApiResponse<T>;
    
    if (apiResponse.success && apiResponse.data) {
      return apiResponse.data;
    } else if (isApiError(apiResponse.error)) {
      console.error(`API-Fehler: ${apiResponse.error.code} - ${apiResponse.error.message}`);
    }
  }
  
  return null;
}
```

### Utility-Typen

Die Verwendung von TypeScript-Utility-Typen erleichtert häufige Typentransformationen:

```typescript
/**
 * Nur bestimmte Eigenschaften eines Typs
 */
type UserCredentials = Pick<User, 'email' | 'id'>;

/**
 * Alle Eigenschaften optional
 */
type OptionalUser = Partial<User>;

/**
 * Alle Eigenschaften schreibgeschützt
 */
type ReadonlyUser = Readonly<User>;

/**
 * Bestimmte Eigenschaften ausschließen
 */
type PublicUser = Omit<User, 'roles' | 'metadata'>;

/**
 * Record-Typ für Schlüssel-Wert-Zuordnungen
 */
type PermissionsByRole = Record<Role, string[]>;

/**
 * Union-Typen und String-Literale
 */
type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * Bedingte Typen
 */
type ExtractId<T> = T extends { id: infer U } ? U : never;
type UserIdType = ExtractId<User>; // string
```

### Typen für asynchrone Operationen

Spezielle Typen für asynchrone Operationen erleichtern die Arbeit mit Promises:

```typescript
/**
 * Asynchroner Zustand
 */
export interface AsyncState<T> {
  /** Gibt an, ob die Daten geladen werden */
  isLoading: boolean;
  /** Daten (null wenn nicht geladen) */
  data: T | null;
  /** Letzter Fehler (null wenn kein Fehler) */
  error: Error | null;
  /** Gibt an, ob die Daten erfolgreich geladen wurden */
  isSuccess: boolean;
}

/**
 * Asynchrone Funktion mit Typsicherheit
 */
export type AsyncFunction<T, A extends any[]> = (...args: A) => Promise<T>;

/**
 * Typ für Observable/reaktive Daten
 */
export interface Observable<T> {
  /** Aktueller Wert */
  value: T;
  /** Änderungsbenachrichtigung abonnieren */
  subscribe: (callback: (value: T) => void) => () => void;
}
```

## Implementierung in Vue 3 und Pinia

### Store-Typdefinitionen

Die Integration mit Pinia-Stores verwendet spezifische Typdefinitionen:

```typescript
// Beispiel: Typensichere Store-Definition

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User, AuthState } from '@/types/auth';

export const useAuthStore = defineStore('auth', () => {
  // State mit Typen
  const user = ref<User | null>(null);
  const token = ref<string | null>(null);
  const expiresAt = ref<number | null>(null);
  const isLoading = ref<boolean>(false);
  const error = ref<string | null>(null);
  const version = ref<number>(1);
  
  // Getters mit Rückgabetypen
  const isAuthenticated = computed<boolean>(() => {
    return !!token.value && !!user.value && (expiresAt.value || 0) > Date.now();
  });
  
  const hasRole = computed<(role: string) => boolean>(() => (role: string) => {
    return !!user.value?.roles.includes(role);
  });
  
  // Actions mit Typdefinitionen
  async function login(email: string, password: string): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    
    try {
      // Implementation...
      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
      return false;
    } finally {
      isLoading.value = false;
    }
  }
  
  // Store-API
  return {
    // State
    user,
    token,
    expiresAt,
    isLoading,
    error,
    version,
    
    // Getters
    isAuthenticated,
    hasRole,
    
    // Actions
    login,
    // Weitere Actions...
  };
});

// Store-Typ extrahieren für Verwendung in Komponenten
export type AuthStore = ReturnType<typeof useAuthStore>;
```

### Komponenten-Props und Emits

Die Typendefinitionen für Vue-Komponenten-Props und Emits:

```typescript
// Beispiel: TypeScript in Vue 3 Komponenten

<script setup lang="ts">
import { ref } from 'vue';
import type { PropType } from 'vue';
import type { ChatMessage, MessageRole } from '@/types/session';

// Props mit TypeScript-Definitionen
const props = defineProps({
  /** Liste der anzuzeigenden Nachrichten */
  messages: {
    type: Array as PropType<ChatMessage[]>,
    required: true
  },
  /** Gibt an, ob gerade Nachrichten geladen werden */
  isLoading: {
    type: Boolean,
    default: false
  },
  /** Maximale Anzahl anzuzeigender Nachrichten */
  maxMessages: {
    type: Number,
    default: 50
  }
});

// Emits mit TypeScript-Definitionen
const emit = defineEmits<{
  /** Beim Senden einer neuen Nachricht */
  (e: 'send-message', content: string): void;
  /** Beim Löschen einer Nachricht */
  (e: 'delete-message', messageId: string): void;
  /** Beim Bearbeiten einer Nachricht */
  (e: 'edit-message', messageId: string, newContent: string): void;
}>();

// Reaktive Variablen mit Typen
const newMessage = ref<string>('');
const selectedMessageId = ref<string | null>(null);

// Funktionen mit Typdefinitionen
function submitMessage(): void {
  if (newMessage.value.trim()) {
    emit('send-message', newMessage.value);
    newMessage.value = '';
  }
}
</script>
```

### Composables mit TypeScript

Die Implementierung von typensicheren Composables:

```typescript
// Beispiel: TypeScript in Composables

import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import type { Ref, ComputedRef } from 'vue';
import type { Theme } from '@/types/settings';

export interface UseThemeOptions {
  /** Anfängliches Theme */
  initialTheme?: string;
  /** Theme im localStorage speichern */
  persistToStorage?: boolean;
  /** Schlüssel für localStorage */
  storageKey?: string;
}

export interface UseThemeReturn {
  /** Aktuelles Theme */
  currentTheme: Ref<string>;
  /** Verfügbare Themes */
  availableThemes: Ref<Theme[]>;
  /** Gibt an, ob es sich um ein dunkles Theme handelt */
  isDarkTheme: ComputedRef<boolean>;
  /** Theme wechseln */
  setTheme: (themeId: string) => void;
  /** Zum nächsten Theme wechseln */
  toggleTheme: () => void;
}

/**
 * Composable für Theme-Verwaltung
 */
export function useTheme(options: UseThemeOptions = {}): UseThemeReturn {
  const {
    initialTheme = 'default',
    persistToStorage = true,
    storageKey = 'app_theme'
  } = options;
  
  const currentTheme = ref<string>(initialTheme);
  const availableThemes = ref<Theme[]>([
    { id: 'default', name: 'Standard', isDark: false, /* ... */ },
    { id: 'dark', name: 'Dunkel', isDark: true, /* ... */ },
    // Weitere Themes...
  ]);
  
  // Computed-Werte
  const isDarkTheme = computed<boolean>(() => {
    const theme = availableThemes.value.find(t => t.id === currentTheme.value);
    return theme?.isDark || false;
  });
  
  // Methoden
  function setTheme(themeId: string): void {
    if (availableThemes.value.some(t => t.id === themeId)) {
      currentTheme.value = themeId;
      
      if (persistToStorage) {
        localStorage.setItem(storageKey, themeId);
      }
      
      // Theme auf document.body anwenden
      document.body.setAttribute('data-theme', themeId);
    }
  }
  
  function toggleTheme(): void {
    const currentIndex = availableThemes.value.findIndex(t => t.id === currentTheme.value);
    const nextIndex = (currentIndex + 1) % availableThemes.value.length;
    setTheme(availableThemes.value[nextIndex].id);
  }
  
  // Initialisierung
  onMounted(() => {
    // Aus localStorage laden, falls vorhanden
    if (persistToStorage) {
      const savedTheme = localStorage.getItem(storageKey);
      if (savedTheme) {
        setTheme(savedTheme);
      }
    }
  });
  
  return {
    currentTheme,
    availableThemes,
    isDarkTheme,
    setTheme,
    toggleTheme
  };
}
```

## Best Practices

### 1. Verwende explizite Typannotationen

Verwende explizite Typannotationen für bessere Entwicklerunterstützung und Dokumentation:

```typescript
// Besser: Explizite Typannotation
const user: User | null = getUserFromApi();

// Vermeiden: Implizite any-Typen
const data = await fetchData(); // 'data' hat Typ 'any'
```

### 2. Nutze Utility-Typen für häufige Muster

TypeScript bietet eingebaute Utility-Typen für häufige Transformationen:

```typescript
// Nur bestimmte Eigenschaften
type UserSummary = Pick<User, 'id' | 'name' | 'email'>;

// Alle Eigenschaften optional
type PartialUser = Partial<User>;

// Schreibgeschützte Eigenschaften
type ReadonlyUser = Readonly<User>;

// Eigenschaften ausschließen
type PublicUser = Omit<User, 'roles' | 'metadata'>;
```

### 3. Bevorzuge Typ-Guards gegenüber Type Assertions

Verwende Typ-Guards für sicherere Laufzeittypprüfungen:

```typescript
// Besser: Type-Guard
function isUser(obj: any): obj is User {
  return obj && typeof obj.id === 'string' && Array.isArray(obj.roles);
}

if (isUser(data)) {
  // 'data' hat Typ 'User' im if-Block
  console.log(data.name);
}

// Vermeiden: Type Assertion
const user = data as User; // Unsicher, keine Laufzeitprüfung
```

### 4. Implementiere Interface-Implementierungen korrekt

Stelle sicher, dass Klassen Interfaces vollständig implementieren:

```typescript
interface StorageProvider {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  remove(key: string): void;
  clear(): void;
}

// Korrekte Implementierung
class LocalStorageProvider implements StorageProvider {
  get(key: string): unknown {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  }
  
  set(key: string, value: unknown): void {
    localStorage.setItem(key, JSON.stringify(value));
  }
  
  remove(key: string): void {
    localStorage.removeItem(key);
  }
  
  clear(): void {
    localStorage.clear();
  }
}
```

### 5. Verwende Union-Typen für zusammengesetzte Konstanten

Definiere Union-Typen für Enumerationen und Konstanten:

```typescript
// Besser: String-Literale als Union-Typ
type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'error';

// Verwendung
function processMessage(status: MessageStatus) {
  // ...
}

// TypeScript-Fehler bei ungültigen Werten
processMessage('invalid'); // Fehler
```

### 6. Stelle sicher, dass Generics korrekt eingeschränkt sind

Verwende Typparameter-Einschränkungen für spezifischere Generics:

```typescript
// Eingeschränkte generische Funktion
function getEntityById<T extends BaseEntity>(
  entities: T[],
  id: string
): T | undefined {
  return entities.find(entity => entity.id === id);
}

// Verwendung
const user = getEntityById<User>(users, 'user-123');
```

### 7. Verwende private Klassen-Eigenschaften

Nutze private Eigenschaften für bessere Kapselung:

```typescript
class UserService {
  // Private Eigenschaften
  #apiClient: ApiClient;
  #cache: Map<string, User>;
  
  constructor(apiClient: ApiClient) {
    this.#apiClient = apiClient;
    this.#cache = new Map();
  }
  
  // Öffentliche Methoden
  async getUser(id: string): Promise<User> {
    // Implementation...
  }
}
```

### 8. Separiere Typdefinitionen in eigene Dateien

Halte Typdefinitionen separat für bessere Organisation:

```typescript
// src/types/index.ts
export * from './auth';
export * from './session';
export * from './ui';
// ...

// Verwendung in Komponenten
import type { User, ChatSession } from '@/types';
```

## Fazit

Das TypeScript-Typsystem des nscale DMS Assistenten bietet eine umfassende und typensichere Grundlage für die Anwendungsentwicklung. Die definierten Typen und Schnittstellen ermöglichen eine konsistente Datenmodellierung, klare API-Kommunikation und robuste Fehlerbehandlung.

Die Verwendung von fortgeschrittenen TypeScript-Funktionen wie generischen Typen, Type-Guards und Utility-Typen verbessert die Codequalität und reduziert die Fehleranfälligkeit erheblich. Gleichzeitig bietet das Typsystem eine hervorragende Entwicklerunterstützung durch präzise Typinferenz und aussagekräftige Fehlermeldungen.

Durch die konsequente Anwendung der beschriebenen Best Practices entsteht ein wartbarer, selbstdokumentierender und robuster Codebase, der sich gut für die schrittweise Migration zu Vue 3 und für zukünftige Erweiterungen eignet.

---

Zuletzt aktualisiert: 11.05.2025