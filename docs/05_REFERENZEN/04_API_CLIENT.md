# API-Integration für nscale-assist

Diese Dokumentation beschreibt die API-Integration des nscale-assist Frontends mit dem Backend-System.

## Architektur

Die API-Integration basiert auf einer modularen Service-Architektur mit folgenden Komponenten:

1. **Zentraler ApiService**: Basisdienst für alle HTTP-Anfragen mit Fehlerbehandlung, Authentifizierung und Datentransformation
2. **Spezialisierte Service-Module**: Domänenspezifische Dienste für Authentifizierung, Sessions, Dokumente und Administration
3. **Caching und Offline-Support**: Mechanismen für Datenvorhaltung, Offline-Modus und Synchronisation
4. **Typdefinitionen**: Umfassende TypeScript-Interfaces für API-Kommunikation

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

## Zentrale Dienste

### ApiService

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

### CachedApiService

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

## Spezifische Service-Module

### AuthService

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

### SessionService

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

### DocumentService

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

### AdminService

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

## Offline-Unterstützung

### OfflineManager

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

## IndexedDB-Integration

Die Anwendung nutzt IndexedDB für lokale Datenspeicherung:

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

## Fehlerbehandlung

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

## Typensicherheit

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

## Best Practices

### Service-Nutzung

1. **Verwende domänenspezifische Services**: Nutze spezialisierte Services statt direkter ApiService-Aufrufe
2. **Fehlerbehandlung**: Implementiere immer Fehlerbehandlung für API-Aufrufe
3. **Caching-Strategien**: Nutze Cache für häufig abgerufene, selten ändernde Daten

### Offline-Unterstützung

1. **Offline-Status-Prüfung**: Prüfe den Offline-Status vor API-Aufrufen
2. **Optimistische UI-Updates**: Aktualisiere die UI sofort und synchronisiere später
3. **Nutzerfeedback**: Zeige klare Hinweise auf Offline-Modus und Synchronisationsstatus

### Typensicherheit

1. **Generische Typen**: Nutze immer generische Typen für ApiResponse
2. **Interface-Definitionen**: Definiere klare Interfaces für alle API-Objekte
3. **Type Guards**: Implementiere Type Guards für bedingte Typprüfungen

## Anlagen

### Code-Beispiele

**Vollständiger API-Aufruf mit Fehlerbehandlung:**

```typescript
import { documentService } from '@/services/api/DocumentService';
import { TargetFormat } from '@/types/documentConverter';

async function convertDocument(documentId: string): Promise<void> {
  try {
    // Statusanzeige aktivieren
    this.isConverting = true;
    this.conversionProgress = 0;
    
    // Konvertierung starten
    const response = await documentService.convertDocument(
      {
        documentId,
        targetFormat: TargetFormat.PDF,
        ocrEnabled: true,
        quality: 90
      },
      (status, progress) => {
        // UI-Update bei Statusänderungen
        this.conversionStatus = status;
        this.conversionProgress = progress || 0;
      }
    );
    
    if (response.success && response.data) {
      // Erfolgreich
      this.$toast.success('Dokument erfolgreich konvertiert');
      this.convertedDocument = response.data;
    } else {
      // Fehlerbehandlung
      this.$toast.error(`Konvertierung fehlgeschlagen: ${response.message}`);
    }
  } catch (error) {
    // Fehlerbehandlung für unerwartete Fehler
    console.error('Konvertierungsfehler:', error);
    this.$toast.error('Ein unerwarteter Fehler ist aufgetreten');
  } finally {
    // Status zurücksetzen
    this.isConverting = false;
  }
}
```

**Offline-Unterstützung mit Synchronisation:**

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