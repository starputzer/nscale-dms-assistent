# API-Client für nscale DMS Assistenten

Diese Dokumentation beschreibt den optimierten API-Client für den nscale DMS Assistenten, der zuverlässige HTTP-Anfragen mit automatischem Token-Handling, Retry-Logik, Ratengrenzenerkennung und verbessertem SSE-Streaming ermöglicht.

## Inhaltsverzeichnis

1. [Architekturübersicht](#architekturübersicht)
2. [Getting Started](#getting-started)
3. [ApiService](#apiservice)
4. [RequestQueue](#requestqueue)
5. [RetryHandler](#retryhandler)
6. [RateLimitHandler](#ratelimithandler)
7. [StreamingService](#streamingservice)
8. [ChatService](#chatservice)
9. [Fehlerbehandlung](#fehlerbehandlung)
10. [Erweiterte Konfiguration](#erweiterte-konfiguration)

## Architekturübersicht

Die API-Client-Architektur besteht aus mehreren spezialisierten Komponenten:

```
                ┌─────────────────┐
                │  Vue Components │
                └────────┬────────┘
                         │
                         ▼
             ┌───────────────────────┐
             │   Service Composables │
             └───────────┬───────────┘
                         │
       ┌─────────────────┴──────────────────┐
       │                                    │
┌──────▼──────┐                      ┌──────▼──────┐
│ ChatService │◄────────────────────►│  ApiService  │
└──────┬──────┘                      └──────┬───────┘
       │                                    │
       │                           ┌────────┴────────┐
       │                           │                 │
┌──────▼──────┐              ┌─────▼─────┐    ┌──────▼──────┐
│StreamingServ│              │RequestQueue│    │ RetryHandler│
└─────────────┘              └───────────┘    └──────┬──────┘
                                                     │
                                              ┌──────▼──────┐
                                              │RateLimitHand│
                                              └─────────────┘
```

Diese Architektur bietet:

- **Zentralisierten API-Zugriff** durch ApiService
- **Robuste Fehlerbehandlung** mit Wiederholungsmechanismen
- **Warteschlangen für parallele Anfragen** zur Leistungsoptimierung
- **Rate-Limiting-Erkennung** zur Vermeidung von API-Begrenzungen
- **Verbesserte Chat-Streaming-Funktionalität** über den StreamingService
- **Hohe Abstraktionsebene** über den ChatService für einfache Verwendung

## Getting Started

### Installation und Einrichtung

```typescript
// In einer Vue-Komponente mit Composition API
import { useChat } from '@/composables/useChat';
import { ref } from 'vue';

export default {
  setup() {
    const { sendMessage, isStreaming, messages } = useChat();
    const message = ref('');
    const sessionId = ref(null);
    
    const submitMessage = async () => {
      if (!message.value.trim()) return;
      
      await sendMessage({
        sessionId: sessionId.value,
        content: message.value,
        autoCreateSession: true, // Erstellt automatisch eine neue Session, wenn nötig
        stream: true, // Aktiviert Streaming-Modus
        onChunk: (chunk) => {
          console.log('Neues Chunk erhalten:', chunk);
        },
        onComplete: (completeMessage) => {
          console.log('Antwort abgeschlossen:', completeMessage);
        }
      });
      
      message.value = '';
    };
    
    return {
      message,
      submitMessage,
      isStreaming,
      messages
    };
  }
}
```

### Direkter API-Zugriff

```typescript
import { apiService } from '@/services/api/ApiService';

// GET-Anfrage
const getUserProfile = async () => {
  try {
    const response = await apiService.get('/api/profile');
    if (response.success) {
      return response.data;
    }
    throw new Error(response.message || 'Fehler beim Abrufen des Profils');
  } catch (error) {
    console.error('Profilfehler:', error);
    throw error;
  }
};

// POST-Anfrage mit Optionen
const updateSettings = async (settings) => {
  try {
    const response = await apiService.post('/api/settings', settings, {
      priority: 80, // Höhere Priorität
      retry: true,  // Erneute Versuche bei Fehlern
      refreshToken: true, // Automatischer Token-Refresh bei 401
      showErrorToast: true // Automatische Fehleranzeige
    });
    return response.success;
  } catch (error) {
    console.error('Einstellungsfehler:', error);
    return false;
  }
};
```

## ApiService

Der ApiService ist die zentrale Klasse für die Verwaltung aller HTTP-Anfragen und bietet eine einheitliche Schnittstelle für die gesamte Anwendung.

### Hauptfunktionen

- **Standardisierte HTTP-Methoden**: GET, POST, PUT, PATCH, DELETE
- **Automatisches Token-Handling**: Fügt Auth-Token hinzu und erneuert es bei Bedarf
- **Robuste Fehlerbehandlung**: Strukturierte Fehlerantworten und automatische Wiederholungsversuche
- **Fortschrittsverfolgung**: Upload- und Download-Fortschritt
- **Anfragenwarteschlange**: Optimale Parallelität von Anfragen
- **Rate-Limit-Erkennung**: Automatische Anpassung an API-Ratelimits

### Beispiele

#### Basis-GET-Anfrage

```typescript
import { apiService } from '@/services/api/ApiService';

// Einfache GET-Anfrage
const getUsers = async () => {
  const response = await apiService.get('/api/users');
  return response.data;
};
```

#### POST-Anfrage mit Fehlerbehandlung

```typescript
// POST-Anfrage mit benutzerdefinierter Fehlerbehandlung
const createUser = async (userData) => {
  try {
    const response = await apiService.post('/api/users', userData, {
      errorHandler: (error) => {
        if (error.code === 'USER_EXISTS') {
          // Spezifische Behandlung
          showDuplicateUserError();
        }
      }
    });
    return response.data;
  } catch (error) {
    // Allgemeine Fehlerbehandlung
    return null;
  }
};
```

#### Datei-Upload mit Fortschrittsanzeige

```typescript
// Datei-Upload mit Fortschrittsverfolgung
const uploadFile = async (file) => {
  const response = await apiService.uploadFile('/api/documents/upload', file, {
    fieldName: 'document',
    metadata: { documentType: 'invoice' },
    onProgress: (progressEvent) => {
      const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
      updateProgressBar(percentCompleted);
    }
  });
  return response.data;
};
```

#### Anfrage abbrechen

```typescript
// Abbrechbare Anfrage
const searchDocuments = async (query) => {
  const cancelToken = apiService.createCancelToken();
  
  try {
    const response = await apiService.get('/api/documents/search', 
      { query }, 
      { cancelToken }
    );
    return response.data;
  } catch (error) {
    if (apiService.isCancel(error)) {
      console.log('Anfrage wurde abgebrochen');
      return [];
    }
    throw error;
  }
};

// An anderer Stelle, um die Anfrage abzubrechen:
cancelToken.cancel('Suche abgebrochen');
```

## RequestQueue

Der RequestQueue-Mechanismus steuert die Parallelität von API-Anfragen und implementiert eine Prioritätswarteschlange.

### Hauptfunktionen

- **Begrenzung paralleler Anfragen**: Verhindert Server-Überlastung und Client-Browserprobleme
- **Prioritätsbasierte Warteschlange**: Wichtige Anfragen werden zuerst verarbeitet
- **Automatische Abbrüche**: Verhindert übermäßige Warteschlangengröße
- **Timeout-Mechanismus**: Bricht Anfragen nach bestimmter Wartezeit ab

### Beispiel

```typescript
import { useApiQueue } from '@/composables/useApiQueue';

const { enqueue, isPaused, pauseQueue, resumeQueue } = useApiQueue();

// Anfrage mit Priorität zur Warteschlange hinzufügen
const loadData = async () => {
  try {
    // Niedrige Priorität für Hintergrundaufgaben
    const backgroundTask = enqueue(() => fetchBackgroundData(), 30);
    
    // Hohe Priorität für Benutzeranfragen
    const userRequestTask = enqueue(() => fetchUserData(), 80);
    
    const [backgroundData, userData] = await Promise.all([
      backgroundTask,
      userRequestTask
    ]);
    
    return { backgroundData, userData };
  } catch (error) {
    console.error('Fehler beim Laden der Daten', error);
    return null;
  }
};

// Warteschlange pausieren/fortsetzen
const togglePause = () => {
  if (isPaused.value) {
    resumeQueue();
  } else {
    pauseQueue();
  }
};
```

## RetryHandler

Der RetryHandler implementiert eine robuste Wiederholungsstrategie für fehlgeschlagene API-Anfragen mit exponentieller Backoff-Verzögerung.

### Hauptfunktionen

- **Selektive Wiederholungen**: Basierend auf HTTP-Status und Fehlertyp
- **Exponentielle Backoff-Strategie**: Zunehmende Verzögerung bei wiederholten Fehlern
- **Jitter-Mechanismus**: Verhindert gleichzeitige Wiederholungen
- **Konfigurierbare Einstellungen**: Anpassbare Wiederholungsversuche und Verzögerungen

### Beispiel

```typescript
import { apiService } from '@/services/api/ApiService';

// Der RetryHandler wird automatisch vom ApiService verwendet
// Sie können die Retry-Einstellungen pro Anfrage anpassen:

const fetchReliableData = async () => {
  try {
    const response = await apiService.get('/api/critical-data', null, {
      // 5 Wiederholungsversuche statt des globalen Standardwerts
      maxRetries: 5,
      
      // Idempotenz für POST-Anfragen (zur sicheren Wiederholung)
      isIdempotent: true
    });
    return response.data;
  } catch (error) {
    // Trotz Wiederholungsversuchen trat ein Fehler auf
    console.error('Kritischer Fehler trotz mehrerer Versuche:', error);
    throw error;
  }
};
```

## RateLimitHandler

Der RateLimitHandler erkennt API-Ratenbegrenzungen und passt die Anfragenrate entsprechend an, um 429-Fehler zu vermeiden.

### Hauptfunktionen

- **Automatische Header-Erkennung**: Erkennt verschiedene Ratelimit-Header-Formate
- **Adaptive Drosselung**: Passt Anfragenrate basierend auf verbleibenden Limits an
- **Proaktive Verzögerung**: Verlangsamt Anfragen, wenn Limits fast erreicht sind
- **Transparente Integration**: Funktioniert automatisch mit ApiService

### Beispiel

```typescript
import { apiService } from '@/services/api/ApiService';
import { logService } from '@/services/log/LogService';

// Anfragen mit Rate-Limit-Berücksichtigung
const batchProcess = async (items) => {
  for (const item of items) {
    try {
      // ApiService wird automatisch gedrosselt, wenn Rate-Limits erreicht werden
      await apiService.post('/api/process', item);
      
      // Status-Informationen protokollieren
      logService.info('Element verarbeitet', { itemId: item.id });
    } catch (error) {
      if (error.code === 'ERR_RATE_LIMITED') {
        logService.warn('Rate-Limit erreicht, pausiere Batch-Prozess');
        
        // Längere Pause bei Ratenlimit-Fehler
        await new Promise(resolve => setTimeout(resolve, 60000));
        
        // Element erneut zur Warteschlange hinzufügen
        items.push(item);
        continue;
      }
      
      logService.error('Fehler bei Elementverarbeitung', { 
        itemId: item.id, 
        error 
      });
    }
  }
};
```

## StreamingService

Der StreamingService bietet eine robuste Implementation von Server-Sent Events (SSE) für Chat-Streaming und Echtzeit-Updates.

### Hauptfunktionen

- **Stabile Verbindung**: Automatische Wiederverbindung bei Netzwerkfehlern
- **Strukturierte Events**: Typisierte Event-Handling für verschiedene SSE-Event-Typen
- **Fortschrittsverfolgung**: Integrierte Fortschritts-Updates
- **Lebenszyklus-Management**: Automatische Ressourcenbereinigung
- **Typisierung**: Vollständige TypeScript-Unterstützung

### Beispiel

```typescript
import { createStreamingConnection } from '@/services/api/StreamingService';

// Streaming-Verbindung erstellen
const startStreaming = () => {
  const streamingConnection = createStreamingConnection({
    url: '/api/stream',
    params: {
      query: 'Wichtige Updates'
    },
    onMessage: (event) => {
      if (event.type === 'content') {
        // Neuen Inhalt verarbeiten
        appendContent(event.content);
      } else if (event.type === 'metadata') {
        // Metadaten verarbeiten
        updateMetadata(event.metadata);
      }
    },
    onProgress: (progress) => {
      // Fortschritt aktualisieren (0-100)
      updateProgressBar(progress);
    },
    onError: (error) => {
      console.error('Stream-Fehler:', error);
      showErrorMessage(error.message);
    },
    onComplete: (fullResponse) => {
      console.log('Stream abgeschlossen:', fullResponse);
      showCompletionMessage();
    },
    // Streaming-Optionen
    autoReconnect: true,
    maxReconnectAttempts: 5
  });
  
  // Stream später beenden
  setTimeout(() => {
    streamingConnection.close();
  }, 60000); // Nach 1 Minute schließen
};
```

## ChatService

Der ChatService bietet eine höhere Abstraktionsebene für Chat-Funktionen und verwendet ApiService und StreamingService für die API-Kommunikation.

### Hauptfunktionen

- **Session-Management**: Erstellen, Laden und Verwalten von Chat-Sessions
- **Nachrichtenhandling**: Senden und Empfangen von Chat-Nachrichten
- **Echtzeit-Streaming**: Optimierte SSE-Streaming-Implementierung
- **Abbrechen-Unterstützung**: Einfaches Abbrechen laufender Streams

### Beispiel

```typescript
import { chatService } from '@/services/api/ChatService';

// Verwaltung von Chat-Sessions
const manageChat = async () => {
  try {
    // Neue Session erstellen
    const session = await chatService.createSession({
      title: 'Support-Anfrage',
      initialMessage: 'Ich benötige Hilfe bei der Dokumentenkonvertierung'
    });
    
    // Nachricht mit Streaming senden
    let responseText = '';
    
    const message = await chatService.sendMessage(
      session.id,
      'Wie konvertiere ich ein Dokument in PDF?',
      {
        stream: true,
        onChunk: (chunk) => {
          // Chunk zur Antwort hinzufügen
          responseText += chunk;
          // UI aktualisieren
          updateResponseUI(responseText);
        },
        onComplete: (message) => {
          console.log('Vollständige Antwort:', message);
          markMessageAsComplete();
        },
        onProgress: (progress) => {
          updateProgressIndicator(progress);
        },
        onError: (error) => {
          showErrorMessage(error.message);
        }
      }
    );
    
    // Streaming abbrechen (falls nötig)
    if (userCancelled) {
      chatService.cancelStream(session.id);
    }
    
    return message;
  } catch (error) {
    console.error('Chat-Fehler:', error);
    return null;
  }
};
```

## Fehlerbehandlung

Die API-Client-Architektur bietet ein umfassendes Fehlerbehandlungssystem mit strukturierten Fehlertypen und automatischen Aktionen.

### Fehlertypen

Jeder Fehler folgt einer konsistenten Struktur:

```typescript
interface ApiError {
  code: string;      // Fehlercode, z.B. 'ERR_NETWORK', 'ERR_TIMEOUT'
  message: string;   // Benutzerfreundliche Fehlermeldung
  status?: number;   // HTTP-Statuscode (wenn verfügbar)
  details?: any;     // Zusätzliche Fehlerdetails
  stack?: string;    // Stack-Trace (nur im Entwicklungsmodus)
}
```

### Häufige Fehlercodes

| Code | Beschreibung | HTTP-Status |
|------|--------------|-------------|
| ERR_NETWORK | Netzwerkfehler bei der Kommunikation mit dem Server | - |
| ERR_TIMEOUT | Die Anfrage hat das Zeitlimit überschritten | 408 |
| ERR_CANCELLED | Die Anfrage wurde abgebrochen | - |
| ERR_BAD_REQUEST | Ungültige Anfrage | 400 |
| ERR_UNAUTHORIZED | Nicht autorisiert | 401 |
| ERR_FORBIDDEN | Zugriff verweigert | 403 |
| ERR_NOT_FOUND | Ressource nicht gefunden | 404 |
| ERR_VALIDATION | Validierungsfehler | 422 |
| ERR_RATE_LIMITED | Zu viele Anfragen, bitte warten Sie | 429 |
| ERR_SERVER | Interner Serverfehler | 500 |

### Beispiele zur Fehlerbehandlung

#### Basisbeispiel

```typescript
import { apiService } from '@/services/api/ApiService';

const getUserData = async (userId) => {
  try {
    const response = await apiService.get(`/api/users/${userId}`);
    return response.data;
  } catch (error) {
    // Strukturierter Fehler mit Code und Nachricht
    console.error(`Fehler (${error.code}): ${error.message}`);
    
    // Spezifische Fehlerbehandlung basierend auf Code
    switch (error.code) {
      case 'ERR_NOT_FOUND':
        return { error: 'Benutzer nicht gefunden' };
      case 'ERR_UNAUTHORIZED':
        redirectToLogin();
        return null;
      case 'ERR_RATE_LIMITED':
        await sleep(2000); // Kurze Verzögerung
        return await getUserData(userId); // Erneuter Versuch
      default:
        return { error: 'Konnte Benutzerdaten nicht laden' };
    }
  }
};
```

#### Erweiterte Fehlerbehandlung

```typescript
import { apiService } from '@/services/api/ApiService';

const processDocument = async (documentId) => {
  try {
    // Maximale Wiederholungsversuche und benutzerdefinierte Fehlerbehandlung
    const response = await apiService.post(
      `/api/documents/${documentId}/process`, 
      null,
      {
        // Wiederholungsoptionen
        maxRetries: 3,
        
        // Benutzerdefinierte Fehlerbehandlung
        errorHandler: (error) => {
          if (error.code === 'ERR_DOCUMENT_LOCKED') {
            showNotification('Dokument wird bereits bearbeitet');
          } else if (error.status === 413) {
            showNotification('Dokument ist zu groß für die Verarbeitung');
          }
        },
        
        // Keine Fehlertoasts für diese Anfrage anzeigen
        showErrorToast: false
      }
    );
    
    return response.data;
  } catch (error) {
    // Details-Objekt aus dem Fehler extrahieren
    const details = error.details || {};
    
    // Anwendungsspezifische Fehlerlogik
    if (details.retryAfter) {
      // Nach einer bestimmten Zeit erneut versuchen
      await sleep(details.retryAfter * 1000);
      return await processDocument(documentId);
    }
    
    // Fehlerereignis zur Analyse auslösen
    trackError('document_processing_failed', {
      documentId,
      errorCode: error.code,
      statusCode: error.status
    });
    
    throw error; // Weiterleiten für übergeordnete Fehlerbehandlung
  }
};
```

## Erweiterte Konfiguration

Die API-Client-Komponenten können durch Anpassung der Konfigurationsdateien und Parameter optimiert werden.

### Globale Konfiguration (apiConfig)

Die apiConfig-Datei (`src/services/api/config.ts`) enthält globale Einstellungen für alle API-Anfragen:

```typescript
// Beispiel für die Anpassung der API-Konfiguration
import { apiConfig } from '@/services/api/config';

// Erweitere die Standard-Timeout-Einstellungen
apiConfig.TIMEOUTS.DEFAULT = 60000; // 60 Sekunden
apiConfig.TIMEOUTS.UPLOAD = 300000; // 5 Minuten für Uploads

// Anpassen der Wiederholungseinstellungen
apiConfig.RETRY.MAX_RETRIES = 5;
apiConfig.RETRY.BASE_DELAY = 2000;

// Parallel Queue-Einstellungen ändern
apiConfig.QUEUE.MAX_CONCURRENT_REQUESTS = 10;

// Debug-Einstellungen
if (process.env.NODE_ENV === 'development') {
  apiConfig.DEBUG.VERBOSE = true;
  apiConfig.DEBUG.LOG_REQUESTS = true;
}
```

### Anfragenspezifische Optionen

Viele Einstellungen können auch pro Anfrage überschrieben werden:

```typescript
// Anfragenspezifische Konfiguration
const response = await apiService.get('/api/large-dataset', null, {
  // Längeres Timeout
  timeout: 120000,
  
  // Höhere Priorität
  priority: 90,
  
  // Keine Wiederholungsversuche
  retry: false,
  
  // Rate-Limiting ignorieren
  handleRateLimit: false,
  
  // Automatisches Token-Refresh deaktivieren
  refreshToken: false,
  
  // Keine Toast-Benachrichtigungen anzeigen
  showErrorToast: false,
  
  // Fortschritts-Callback
  onProgress: (event) => updateProgress(event)
});
```

### Logging konfigurieren

Die Logging-Funktionalität kann für verschiedene Umgebungen konfiguriert werden:

```typescript
import { LogService, LogLevel } from '@/services/log/LogService';

// Globale Logging-Konfiguration
LogService.configure({
  // Logging-Level
  level: process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.DEBUG,
  
  // Nur bestimmte Module protokollieren
  enabledModules: ['ApiService', 'ChatService', 'AuthService'],
  
  // Weitere Optionen
  colorize: true,
  timestamp: true,
  
  // Remote-Logging aktivieren
  enableRemote: process.env.NODE_ENV === 'production',
  remoteUrl: 'https://logging.example.com/api/logs'
});
```