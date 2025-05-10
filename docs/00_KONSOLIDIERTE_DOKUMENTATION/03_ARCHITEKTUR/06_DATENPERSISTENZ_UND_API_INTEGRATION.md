---
title: "Datenpersistenz und API-Integration"
version: "1.0.0"
date: "10.05.2025"
lastUpdate: "10.05.2025"
author: "Martin Heinrich"
status: "Aktiv"
priority: "Hoch"
category: "Architektur"
tags: ["API", "Persistenz", "Offline", "Pinia", "LocalStorage", "IndexedDB", "Cache", "HTTP-Client"]
---

# Datenpersistenz und API-Integration

> **Letzte Aktualisierung:** 10.05.2025 | **Version:** 1.0.0 | **Status:** Aktiv

## Übersicht

Dieses Dokument beschreibt die Mechanismen für Datenpersistenz und API-Integration im nscale DMS Assistenten. Die Anwendung verwendet eine mehrschichtige Architektur, die lokale Datenspeicherung, zentrale API-Kommunikation und Offline-Unterstützung kombiniert.

Die Lösung umfasst folgende Kernkomponenten:

1. **Pinia Store Persistenz**: Reaktive Zustandsverwaltung mit automatischer Persistenz
2. **Modulare API-Service-Architektur**: Typsichere und fehlerresistente API-Kommunikation
3. **Offline-Unterstützung**: Robustes Verhalten bei Netzwerkproblemen
4. **Caching-Strategien**: Optimierte Performance und Benutzererfahrung

## Datenpersistenz-Konzept

### Mehrschichtige Persistenz

Der nscale DMS Assistent verwendet eine mehrschichtige Datenspeicherung:

1. **Primäre Datenspeicherung**: REST-API und Backend-Datenbank
2. **Client-Side Persistenz**: Pinia Store + localStorage/sessionStorage
3. **In-Memory State**: Reaktiver Zustand in Pinia-Stores
4. **Legacy-Datenkompatibilität**: Migration von bestehenden localStorage-Daten

Die Persistenz wird durch das Pinia-Persistenz-Plugin (`pinia-plugin-persistedstate`) implementiert, das den Store-Zustand automatisch in localStorage oder sessionStorage speichert und beim Neuladen wiederherstellt.

### Pinia Store Persistenz

#### Plugin-Konfiguration

Die zentrale Konfiguration des Persistenz-Plugins erfolgt in `src/stores/index.ts`:

```typescript
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';

// Pinia Store erstellen
const pinia = createPinia();

// Persistenz-Plugin konfigurieren
pinia.use(piniaPluginPersistedstate);

export default pinia;
```

#### Store-spezifische Persistenz

Jeder Store definiert individuell, welche Daten persistiert werden sollen:

```typescript
// Beispiel: Auth Store Persistenz
export const useAuthStore = defineStore('auth', () => {
  // State-Definition...
  
  return {
    // Öffentliche API...
  };
}, {
  persist: {
    // In localStorage speichern
    storage: localStorage,
    // Nur bestimmte Pfade persistieren
    paths: ['token', 'user', 'expiresAt', 'version'],
  },
});
```

#### Persistierte Daten je Store

| Store | Schlüssel im Storage | Persistierte Daten | Speicherort |
|-------|---------------------|-------------------|------------|
| Auth | `auth` | Token, Benutzerinformationen, Ablaufzeit | localStorage |
| Sessions | `sessions` | Sessions-Liste, aktive Session-ID, Version | localStorage |
| UI | `ui` | Dark Mode, Sidebar-Zustand, View-Modus | localStorage |
| Settings | `settings` | Theme, Schriftgröße, Barrierefreiheit-Einstellungen | localStorage |
| FeatureToggles | `featureToggles` | Aktivierte Features, Version | localStorage |

### Schema-Versionierung und Migration

#### Versionsnummern

Jeder Store enthält ein `version`-Feld, das die aktuelle Schema-Version angibt:

```typescript
const version = ref<number>(1); // Aktuelle Schema-Version
```

#### Migrationsprozess

Beim Initialisieren prüft jeder Store die gespeicherte Version und führt bei Bedarf Migrationen durch:

```typescript
function initialize() {
  // Prüfen, ob eine Migration erforderlich ist
  if (version.value < currentVersion) {
    if (version.value === 0) {
      migrateFromV0ToV1();
    }
    // Weitere Migrationsstufen...
    
    // Version aktualisieren
    version.value = currentVersion;
  }
  
  // Legacy-Daten migrieren
  migrateFromLegacyStorage();
}
```

### Speicherung mit IndexedDB

Die Anwendung nutzt IndexedDB für umfangreichere lokale Datenspeicherung:

- Anwendungsdaten: Sessions, Nachrichten, Dokumente
- API-Cache für schnellere Antwortzeiten
- Warteschlange für Offline-Änderungen

Der `IndexedDBService` bietet eine einfache API für die Interaktion mit IndexedDB:

```typescript
// Beispiel: IndexedDB-Operationen
import { defaultIndexedDBService } from '@/services/storage/IndexedDBService';

// Daten speichern
await defaultIndexedDBService.add('documents', document);

// Daten abfragen
const documents = await defaultIndexedDBService.query('documents', {
  index: 'uploadedAt',
  direction: 'prev', // Neueste zuerst
  limit: 10
});
```

### Sicherheitsaspekte

Beachten Sie folgende Sicherheitsrichtlinien für die Persistenz von Daten:

1. **Sensible Informationen** sollten nicht im localStorage gespeichert werden, da dieser nicht verschlüsselt ist
2. **Tokens** sollten eine kurze Gültigkeit haben und einen Refresh-Mechanismus verwenden
3. **Persönliche Daten** sollten auf ein Minimum beschränkt werden

#### Implementierte Maßnahmen

1. **Token-Handling**:
   - Tokens haben ein Ablaufdatum (`expiresAt`)
   - Der Auth-Store prüft die Gültigkeit und erneuert Token automatisch

2. **Daten-Minimierung**:
   - Nur notwendige Daten werden persistiert (über `paths`-Konfiguration)
   - Sensitive Daten wie Passwörter werden nie gespeichert

3. **Storage-Bereinigung**:
   - Beim Logout werden sensible Daten aus dem Storage gelöscht
   - Alte Sessions werden automatisch bereinigt

## API-Integration

### Service-Architektur

Die API-Integration basiert auf einer modularen Service-Architektur mit folgenden Komponenten:

```
┌─────────────────┐     ┌───────────────────┐     ┌────────────────┐
│                 │     │                   │     │                │
│  Vue Components ├─────┤ Service-Module    ├─────┤    Backend     │
│                 │     │                   │     │                │
└─────────────────┘     └───────┬───────────┘     └────────────────┘
                               │
                       ┌───────┴───────┐
                       │               │
                       │   ApiService  │
                       │               │
                       └───────┬───────┘
                               │
                       ┌───────┴───────┐
                       │  Offline &    │
                       │    Cache      │
                       │               │
                       └───────────────┘
```

### Zentrale Dienste

#### ApiService

Der `ApiService` ist die Hauptklasse für alle HTTP-Anfragen und bietet:

- Konfigurierbare Axios-Instanz mit Interceptors
- Automatisches Token-Management
- Fehlerbehandlung mit standardisierten Fehlerobjekten
- Wiederholungsversuche bei Netzwerkfehlern
- Request-Queuing zur Parallelitätskontrolle
- Rate-Limiting-Erkennung und -Behandlung

```typescript
// Beispiel: GET-Anfrage mit dem ApiService
import { apiService } from '@/services/api/ApiService';

const response = await apiService.get('/endpoint', { 
  param1: 'value1' 
}, {
  retry: true,
  maxRetries: 3,
  showErrorToast: true
});

if (response.success) {
  // Daten verarbeiten
  const data = response.data;
} else {
  // Fehlerbehandlung
  console.error(response.error);
}
```

#### CachedApiService

Der `CachedApiService` erweitert den ApiService um Caching-Funktionalität:

- Lokales Caching von GET-Anfragen
- Stale-While-Revalidate-Strategie
- Automatische Cache-Invalidierung bei Änderungsoperationen
- Offline-Fallback für gecachte Daten

```typescript
// Beispiel: Gecachte GET-Anfrage
import { cachedApiService } from '@/services/api/CachedApiService';

const response = await cachedApiService.get('/cached-endpoint', null, {
  cache: true,
  cacheTTL: 300, // 5 Minuten Cache-Lebensdauer
  staleWhileRevalidate: true // Sofortige Antwort aus Cache, Aktualisierung im Hintergrund
});
```

### Spezifische Service-Module

#### AuthService

Der `AuthService` verwaltet Authentifizierung und Benutzerberechtigungen:

- Login/Logout-Funktionalität
- Token-Verwaltung und -Erneuerung
- Berechtigungsprüfungen
- Events für Authentifizierungsänderungen

```typescript
// Beispiel: Anmeldung und Berechtigungsprüfung
import { authService } from '@/services/api/AuthService';

// Anmeldung
const loginResult = await authService.login({
  email: 'user@example.com',
  password: 'password'
});

// Berechtigungsprüfung
if (authService.hasRole('admin')) {
  // Admin-spezifische Aktionen ausführen
}
```

#### SessionService

Der `SessionService` verwaltet Chat-Sessions und deren Nachrichten:

- Session-CRUD-Operationen
- Nachrichtenverwaltung
- Streaming-Support für Echtzeit-Antworten
- Offline-Unterstützung für Sessions

```typescript
// Beispiel: Streaming-Nachricht senden
import { sessionService } from '@/services/api/SessionService';

const response = await sessionService.sendMessage('session-123', {
  content: 'Wie kann ich ein Dokument konvertieren?',
  stream: true
}, {
  onChunk: (chunk) => {
    // UI für jedes empfangene Teilstück aktualisieren
    console.log('Neues Chunk:', chunk);
  },
  onComplete: (message) => {
    // UI nach Abschluss aktualisieren
    console.log('Vollständige Nachricht:', message);
  }
});
```

#### DocumentService

Der `DocumentService` verwaltet den Dokumentenkonverter:

- Dokumenten-Upload mit Fortschrittsanzeige
- Konvertierung mit Status-Tracking
- Download und Dokumenten-Verwaltung
- Offline-Unterstützung für bereits konvertierte Dokumente

```typescript
// Beispiel: Dokument hochladen und konvertieren
import { documentService } from '@/services/api/DocumentService';

// Dokument hochladen
const uploadResponse = await documentService.uploadDocument(
  file,
  { documentType: 'contract' },
  (progress) => {
    console.log(`Upload-Fortschritt: ${progress}%`);
  }
);

if (uploadResponse.success) {
  // Dokument konvertieren
  const convertResponse = await documentService.convertDocument(
    {
      documentId: uploadResponse.data.id,
      targetFormat: 'pdf'
    },
    (status, progress) => {
      console.log(`Konvertierung ${status}, Fortschritt: ${progress}%`);
    }
  );
}
```

#### AdminService

Der `AdminService` bietet Administratorfunktionen:

- Systeminfo und -statistiken
- Benutzerverwaltung
- Feature-Flag-Konfiguration
- Systemeinstellungen

```typescript
// Beispiel: Feature-Flag aktualisieren
import { adminService } from '@/services/api/AdminService';

// Prüfen, ob Admin-Rechte vorhanden sind
if (adminService.hasAdminAccess()) {
  // Feature-Flag aktivieren/deaktivieren
  const response = await adminService.updateFeatureFlag(
    'document-converter-v2',
    true
  );
}
```

### Offline-Unterstützung

#### OfflineManager

Der `OfflineManager` bietet zentrale Offline-Funktionalität:

- Offline-Status-Erkennung
- UI-Benachrichtigungen über Offline-Modus
- Synchronisationswarteschlange für Offline-Änderungen
- Automatische Wiederherstellung bei Netzwerkwiederherstellung

```typescript
// Beispiel: Offline-Status-Handling
import { offlineManager } from '@/services/api/OfflineManager';

// Offline-Status abfragen
if (offlineManager.isOfflineMode()) {
  // Offline-spezifische UI anzeigen
}

// Event-Listener für Offline-Status
offlineManager.on('offline', () => {
  // UI für Offline-Modus aktualisieren
});

offlineManager.on('online', () => {
  // UI für Online-Modus aktualisieren
});
```

#### Offline-Unterstützung mit Synchronisation

```typescript
import { sessionService } from '@/services/api/SessionService';
import { offlineManager } from '@/services/api/OfflineManager';

async function sendMessage(sessionId: string, content: string): Promise<void> {
  // Im Offline-Modus zur Warteschlange hinzufügen
  if (offlineManager.isOfflineMode()) {
    // Optimistische UI-Aktualisierung
    this.addLocalMessage({
      sessionId,
      content,
      role: 'user',
      timestamp: new Date().toISOString(),
      pending: true
    });
    
    // Zur Sync-Queue hinzufügen
    await offlineManager.addSyncRequest({
      url: `/sessions/${sessionId}/messages`,
      method: 'POST',
      data: { content },
      metadata: { type: 'message', sessionId }
    });
    
    this.$toast.info('Nachricht wird gesendet, sobald wieder online');
    return;
  }
  
  // Im Online-Modus normal senden
  try {
    const response = await sessionService.sendMessage(sessionId, { content });
    
    if (response.success && response.data) {
      // Nachricht wurde erfolgreich gesendet
    }
  } catch (error) {
    console.error('Fehler beim Senden der Nachricht:', error);
    this.$toast.error('Nachricht konnte nicht gesendet werden');
  }
}
```

### Fehlerbehandlung

Die API-Integration implementiert eine mehrstufige Fehlerbehandlung:

1. **Automatische Wiederholungsversuche**: Bei Netzwerkfehlern oder bestimmten HTTP-Statuscodes
2. **Token-Refresh**: Automatische Erneuerung bei 401-Antworten
3. **Standardisierte Fehlerobjekte**: Einheitliches Format für alle API-Fehler
4. **UI-Integration**: Optional automatische Toast-Benachrichtigungen

```typescript
// Beispiel: Benutzerdefinierte Fehlerbehandlung
import { apiService } from '@/services/api/ApiService';

try {
  const response = await apiService.get('/endpoint', null, {
    showErrorToast: false, // Toast-Benachrichtigung deaktivieren
    errorHandler: (error) => {
      // Benutzerdefinierte Fehlerbehandlung
      if (error.code === 'ERR_RATE_LIMITED') {
        console.log('Rate-Limit erreicht, bitte warten Sie einen Moment');
      }
    }
  });
} catch (error) {
  // Fallback-Fehlerbehandlung
}
```

### Typensicherheit

Die API-Integration nutzt umfassende TypeScript-Definitionen für maximale Typensicherheit:

- `ApiResponse<T>`: Generisches Antwortformat mit Typsicherheit für Daten
- Domänenspezifische Interfaces: z.B. `User`, `ChatSession`, `Document`
- Enum-Typen für Status und Konstanten

```typescript
// Beispiel: Typensicherheit mit generischen Antworten
import { apiService } from '@/services/api/ApiService';
import { ChatSession, ApiResponse } from '@/types/api';

async function fetchSessions(): Promise<ChatSession[]> {
  const response: ApiResponse<ChatSession[]> = await apiService.get('/sessions');
  
  if (response.success && response.data) {
    return response.data; // Typsicher: ChatSession[]
  }
  
  return [];
}
```

## Integration von Pinia mit API-Diensten

### Grundprinzipien

Die Integration zwischen Pinia Stores und API-Diensten folgt diesen Grundprinzipien:

1. **Klare Trennung der Verantwortlichkeiten**:
   - Stores: Zustandsverwaltung und Business-Logik
   - Services: Kommunikation mit dem Backend
   - Komponenten: UI-Rendering und Benutzerinteraktionen

2. **Einheitlicher Datenzugriff**:
   - Komponenten greifen nur über Stores auf Daten zu
   - Services werden ausschließlich von Stores aufgerufen
   - Stores normalisieren API-Daten für konsistente Nutzung

3. **Optimistische Updates**:
   - UI-Updates erfolgen sofort bei Benutzerinteraktionen
   - Stores verwalten Zwischenzustände (Loading, Error)
   - Bei API-Fehlern wird der Zustand zurückgesetzt

### Beispiel: SessionStore mit API-Integration

```typescript
// Beispiel: Integration von SessionStore mit SessionService
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { sessionService } from '@/services/api/SessionService';
import type { Session, Message } from '@/types/session';

export const useSessionStore = defineStore('sessions', () => {
  // State
  const sessions = ref<Session[]>([]);
  const currentSessionId = ref<string | null>(null);
  const isLoading = ref(false);
  const error = ref<Error | null>(null);
  
  // Getters
  const currentSession = computed(() => 
    sessions.value.find(s => s.id === currentSessionId.value) || null
  );
  
  // Actions
  async function fetchSessions() {
    isLoading.value = true;
    error.value = null;
    
    try {
      const response = await sessionService.getSessions();
      
      if (response.success && response.data) {
        sessions.value = response.data;
      } else {
        error.value = new Error(response.message || 'Fehler beim Laden der Sessions');
      }
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Unbekannter Fehler');
    } finally {
      isLoading.value = false;
    }
  }
  
  async function sendMessage(content: string) {
    if (!currentSessionId.value) return;
    
    // Optimistische UI-Aktualisierung
    const tempId = `temp-${Date.now()}`;
    const tempMessage: Message = {
      id: tempId,
      sessionId: currentSessionId.value,
      content,
      role: 'user',
      timestamp: new Date().toISOString(),
      pending: true
    };
    
    // Nachricht zur Session hinzufügen
    const session = sessions.value.find(s => s.id === currentSessionId.value);
    if (session) {
      session.messages = [...(session.messages || []), tempMessage];
    }
    
    try {
      // API-Aufruf
      const response = await sessionService.sendMessage(
        currentSessionId.value, 
        { content }
      );
      
      if (response.success && response.data) {
        // Temporäre Nachricht durch echte ersetzen
        updateMessageById(tempId, response.data);
        return response.data;
      } else {
        // Fehlerbehandlung
        markMessageAsFailed(tempId);
        throw new Error(response.message || 'Fehler beim Senden der Nachricht');
      }
    } catch (err) {
      // Fehlerbehandlung
      markMessageAsFailed(tempId);
      throw err instanceof Error ? err : new Error('Unbekannter Fehler');
    }
  }
  
  // Weitere Actions...
  
  // Hilfsfunktionen für optimistische Updates
  function updateMessageById(tempId: string, realMessage: Message) {
    if (!currentSessionId.value) return;
    
    const session = sessions.value.find(s => s.id === currentSessionId.value);
    if (session && session.messages) {
      session.messages = session.messages.map(msg => 
        msg.id === tempId ? realMessage : msg
      );
    }
  }
  
  function markMessageAsFailed(messageId: string) {
    if (!currentSessionId.value) return;
    
    const session = sessions.value.find(s => s.id === currentSessionId.value);
    if (session && session.messages) {
      session.messages = session.messages.map(msg => 
        msg.id === messageId ? { ...msg, error: true, pending: false } : msg
      );
    }
  }
  
  return {
    // State
    sessions,
    currentSessionId,
    isLoading,
    error,
    
    // Getters
    currentSession,
    
    // Actions
    fetchSessions,
    sendMessage,
    // Weitere Methoden...
  };
}, {
  persist: {
    storage: localStorage,
    paths: ['sessions', 'currentSessionId', 'version']
  }
});
```

## Best Practices

### Datenpersistenz

1. **Persistiere nur notwendige Daten**: Speichere nur die minimal erforderlichen Daten und verwende die `paths`-Konfiguration
2. **Schema-Versionierung**: Führe immer eine Versionsnummer und Migrationscode ein
3. **Sensible Daten**: Speichere nie sensitive Daten wie Passwörter im lokalen Speicher
4. **Fehlertoleranz**: Implementiere robuste Fehlerbehandlung beim Lesen aus dem Storage

### API-Integration

1. **Verwende domänenspezifische Services**: Nutze spezialisierte Services statt direkter ApiService-Aufrufe
2. **Fehlerbehandlung**: Implementiere immer Fehlerbehandlung für API-Aufrufe
3. **Caching-Strategien**: Nutze Cache für häufig abgerufene, selten ändernde Daten
4. **Typensicherheit**: Verwende konsequent TypeScript für API-Schnittstellen

### Offline-Support

1. **Offline-Status-Prüfung**: Prüfe den Offline-Status vor API-Aufrufen
2. **Optimistische UI-Updates**: Aktualisiere die UI sofort und synchronisiere später
3. **Nutzerfeedback**: Zeige klare Hinweise auf Offline-Modus und Synchronisationsstatus
4. **Datenintegrität**: Sorge für Konfliktlösung bei gleichzeitigen Änderungen

## Debugging und Fehlersuche

### Storage-Inspektion

Prüfen Sie die gespeicherten Daten im Browser:

1. Öffnen Sie die Developer Tools (F12)
2. Navigieren Sie zum "Application"-Tab
3. Wählen Sie "Local Storage" oder "IndexedDB" aus der linken Seitenleiste
4. Untersuchen Sie die Einträge für Ihre Domain

### Diagnose-Tools für Storage-Probleme

```typescript
// Debugging-Hilfsfunktion für localStorage
function debugPersistence(storeName, paths) {
  try {
    const storeData = JSON.parse(localStorage.getItem(storeName) || '{}');
    console.log(`[${storeName}] Gespeicherte Daten:`, storeData);
    
    // Auf fehlende Pfade prüfen
    paths.forEach(path => {
      const pathParts = path.split('.');
      let current = storeData;
      
      for (const part of pathParts) {
        if (current === undefined || current === null) {
          console.warn(`[${storeName}] Pfad '${path}' nicht gefunden (bei '${part}')`);
          break;
        }
        current = current[part];
      }
    });
  } catch (e) {
    console.error(`[${storeName}] Fehler beim Debugging:`, e);
  }
}
```

### API-Debugging

```typescript
// Logging-Interceptor für API-Anfragen
apiService.interceptors.request.use(config => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, {
      params: config.params,
      data: config.data
    });
  }
  return config;
});

apiService.interceptors.response.use(response => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[API] Response ${response.status}`, response.data);
  }
  return response;
}, error => {
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[API] Error ${error.response?.status || 'Network'}`, {
      status: error.response?.status,
      data: error.response?.data,
      config: error.config
    });
  }
  return Promise.reject(error);
});
```

## Fazit

Die implementierte Lösung für Datenpersistenz und API-Integration im nscale DMS Assistenten bietet eine robuste Grundlage für die Anwendung. Durch die Kombination von reaktiver Zustandsverwaltung mit Pinia, lokaler Persistenz und einer modularen API-Service-Architektur wird eine konsistente, typensichere und fehlertolerante Datenverwaltung ermöglicht.

Die Integration von Offline-Unterstützung und intelligenten Caching-Strategien sorgt für eine optimale Benutzererfahrung auch unter schwierigen Netzwerkbedingungen. Die klare Trennung von Verantwortlichkeiten zwischen Stores, Services und Komponenten fördert zudem die Wartbarkeit und Erweiterbarkeit der Anwendung.

---

Zuletzt aktualisiert: 10.05.2025