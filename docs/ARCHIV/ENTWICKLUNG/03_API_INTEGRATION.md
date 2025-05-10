# API Integration

Dieses Dokument beschreibt die API-Integration des nscale DMS Assistenten. Die API-Architektur wurde vollständig modernisiert, um eine verbesserte Zuverlässigkeit, Wartbarkeit und Erweiterbarkeit zu gewährleisten.

**Letzte Aktualisierung:** 07.05.2025

## Inhaltsverzeichnis

1. [Überblick](#überblick)
2. [Architektur](#architektur)
3. [API-Service](#api-service)
4. [API-Endpunkte](#api-endpunkte)
5. [Authentifizierung](#authentifizierung)
6. [Fehlerbehandlung](#fehlerbehandlung)
7. [Streaming-API](#streaming-api)
8. [Rate-Limiting](#rate-limiting)
9. [Request-Queueing](#request-queueing)
10. [Verwendung in Komponenten](#verwendung-in-komponenten)
11. [Beispiele](#beispiele)
12. [Fehlerbehebung](#fehlerbehebung)
13. [Tests](#tests)

## Überblick

Die modernisierte API-Integration des nscale DMS Assistenten besteht aus folgenden Hauptkomponenten:

- **ApiService**: Zentrale Service-Klasse für alle HTTP-Anfragen
- **StreamingService**: Spezialisierter Service für Server-Sent Events (SSE)
- **AuthInterceptor**: Interceptor für die automatische Token-Verwaltung
- **ErrorHandler**: Zentralisierte Fehlerbehandlung mit Standardisierung
- **RequestQueue**: Warteschlangensystem für parallele Anfragen
- **RateLimitHandler**: Verwaltung von API-Ratenbegrenzungen
- **ResponseTransformer**: Standardisierte Transformation von API-Antworten

Diese Architektur ersetzt die frühere implementierung mit direkten Fetch-Aufrufen ohne zentralisierte Fehlerbehandlung und ohne Retry-Logik.

> **Verwandte Dokumente:**
> - [STATE_MANAGEMENT.md](STATE_MANAGEMENT.md) - Integration der API-Services mit Pinia-Stores
> - [COMPONENT_GUIDE.md](COMPONENT_GUIDE.md) - Verwendung der API-Services in Komponenten
> - [SETUP.md](SETUP.md) - Entwicklungsumgebung für die Arbeit mit API-Services einrichten

## Architektur

Die API-Architektur folgt dem Schichtenmodell:

```
+---------------------------------+
|        Vue-Komponenten          |
+---------------------------------+
               ↓ ↑
+---------------------------------+
|      Composables / Hooks        |
+---------------------------------+
               ↓ ↑
+---------------------------------+
|          Pinia-Stores           |
+---------------------------------+
               ↓ ↑
+---------------------------------+
| API-Services (ApiService, SSE)  |
+---------------------------------+
               ↓ ↑
+---------------------------------+
|    Interceptors & Middleware    |
+---------------------------------+
               ↓ ↑
+---------------------------------+
|       HTTP-Client (Axios)       |
+---------------------------------+
               ↓ ↑
+---------------------------------+
|          Backend-API            |
+---------------------------------+
```

### Verzeichnisstruktur

```
src/
├── api/
│   ├── index.ts                # API-Konfiguration & Export
│   ├── ApiService.ts           # Zentrale Service-Klasse
│   ├── StreamingService.ts     # SSE-Handler
│   ├── interceptors/
│   │   ├── auth.interceptor.ts # Token-Verwaltung
│   │   ├── error.interceptor.ts # Fehlerbehandlung
│   │   └── logging.interceptor.ts # Request-Logging
│   ├── middleware/
│   │   ├── rateLimit.ts        # Rate-Limit-Schutz
│   │   ├── requestQueue.ts     # Request-Warteschlange
│   │   └── retry.ts            # Automatische Wiederholung
│   └── models/
│       ├── ApiResponse.ts      # Standardformate
│       ├── ApiError.ts         # Fehlerformate
│       └── auth.models.ts      # Auth-spezifische Modelle
└── utils/
    └── http.ts                 # HTTP-Hilfsfunktionen
```

## API-Service

Die `ApiService`-Klasse ist das Herzstück der API-Integration. Sie verwendet Axios als HTTP-Client und bietet eine vereinfachte Schnittstelle für alle API-Aufrufe.

### Konfiguration

```typescript
// src/api/index.ts
import axios, { AxiosInstance } from 'axios';
import { authInterceptor } from './interceptors/auth.interceptor';
import { errorInterceptor } from './interceptors/error.interceptor';
import { logInterceptor } from './interceptors/logging.interceptor';

// Basis-Konfiguration
const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

// Interceptors registrieren
apiClient.interceptors.request.use(authInterceptor);
apiClient.interceptors.request.use(logInterceptor);
apiClient.interceptors.response.use(
  response => response,
  errorInterceptor
);

export default apiClient;
```

### ApiService-Implementierung

```typescript
// src/api/ApiService.ts
import apiClient from './index';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiResponse } from './models/ApiResponse';
import { configureQueue } from './middleware/requestQueue';
import { configureRetry } from './middleware/retry';

export class ApiService {
  // Konfigurierbare Optionen
  private retryConfig = configureRetry({
    retries: 3,
    retryDelay: 1000,
    retryStatusCodes: [408, 429, 500, 502, 503, 504]
  });

  private queueConfig = configureQueue({
    maxParallelRequests: 5,
    retryOnRateLimit: true
  });

  /**
   * GET-Anfrage
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse = await apiClient.get(url, {
        ...config,
        ...this.retryConfig,
        ...this.queueConfig
      });
      return this.transformResponse<T>(response);
    } catch (error) {
      return this.handleError<T>(error);
    }
  }

  /**
   * POST-Anfrage
   */
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse = await apiClient.post(url, data, {
        ...config,
        ...this.retryConfig,
        ...this.queueConfig
      });
      return this.transformResponse<T>(response);
    } catch (error) {
      return this.handleError<T>(error);
    }
  }

  /**
   * PUT-Anfrage
   */
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse = await apiClient.put(url, data, {
        ...config,
        ...this.retryConfig,
        ...this.queueConfig
      });
      return this.transformResponse<T>(response);
    } catch (error) {
      return this.handleError<T>(error);
    }
  }

  /**
   * DELETE-Anfrage
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse = await apiClient.delete(url, {
        ...config,
        ...this.retryConfig,
        ...this.queueConfig
      });
      return this.transformResponse<T>(response);
    } catch (error) {
      return this.handleError<T>(error);
    }
  }

  /**
   * Standardisierte Antwort-Transformation
   */
  private transformResponse<T>(response: AxiosResponse): ApiResponse<T> {
    return {
      data: response.data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      success: response.status >= 200 && response.status < 300,
      error: null
    };
  }

  /**
   * Standardisierte Fehlerbehandlung
   */
  private handleError<T>(error: any): ApiResponse<T> {
    const response = error.response || {};
    return {
      data: null as unknown as T,
      status: response.status || 500,
      statusText: response.statusText || 'Interner Serverfehler',
      headers: response.headers || {},
      success: false,
      error: {
        message: error.message || 'Ein unerwarteter Fehler ist aufgetreten',
        code: response.status || 'UNKNOWN',
        details: response.data?.details || error.stack
      }
    };
  }
}

// Singleton-Instanz exportieren
export const apiService = new ApiService();
```

## API-Endpunkte

Der nscale DMS Assistent bietet folgende Haupt-API-Endpunkte:

### Auth-Endpunkte

| Endpunkt | Methode | Beschreibung | Parameter |
|----------|---------|--------------|-----------|
| `/api/auth/login` | POST | Benutzeranmeldung | `{ email, password }` |
| `/api/auth/refresh` | POST | Token erneuern | `{ refreshToken }` |
| `/api/auth/logout` | POST | Abmelden | `{ token }` |
| `/api/auth/user` | GET | Benutzerinfo abrufen | - |

### Chat-Endpunkte

| Endpunkt | Methode | Beschreibung | Parameter |
|----------|---------|--------------|-----------|
| `/api/sessions` | GET | Alle Sessions abrufen | - |
| `/api/sessions` | POST | Neue Session erstellen | `{ title }` |
| `/api/sessions/:id` | GET | Session-Details abrufen | - |
| `/api/sessions/:id` | PUT | Session aktualisieren | `{ title }` |
| `/api/sessions/:id` | DELETE | Session löschen | - |
| `/api/sessions/:id/messages` | GET | Session-Nachrichten abrufen | - |
| `/api/sessions/:id/messages` | POST | Nachricht senden | `{ content, role }` |
| `/api/sessions/:id/stream` | GET | SSE-Stream für Antworten | - |

### Admin-Endpunkte

| Endpunkt | Methode | Beschreibung | Parameter |
|----------|---------|--------------|-----------|
| `/api/admin/users` | GET | Benutzer auflisten | - |
| `/api/admin/users/:id` | GET | Benutzerdetails abrufen | - |
| `/api/admin/users/:id` | PUT | Benutzer aktualisieren | `{ name, email, role }` |
| `/api/admin/stats` | GET | Systemstatistiken abrufen | - |
| `/api/admin/logs` | GET | Systemlogs abrufen | - |
| `/api/admin/settings` | GET | Systemeinstellungen abrufen | - |
| `/api/admin/settings` | PUT | Systemeinstellungen aktualisieren | `{ settings }` |

### Dokument-Endpunkte

| Endpunkt | Methode | Beschreibung | Parameter |
|----------|---------|--------------|-----------|
| `/api/documents` | GET | Dokumente auflisten | - |
| `/api/documents/:id` | GET | Dokumentdetails abrufen | - |
| `/api/documents/upload` | POST | Dokument hochladen | `FormData` |
| `/api/documents/convert` | POST | Dokument konvertieren | `{ documentId, format }` |

## Authentifizierung

Die Authentifizierung erfolgt über JWT-Token mit automatischer Token-Erneuerung. Der AuthInterceptor kümmert sich um das Anhängen des Tokens an Anfragen und die Erneuerung des Tokens wenn nötig.

### Auth-Interceptor

```typescript
// src/api/interceptors/auth.interceptor.ts
import { AxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/auth';

export const authInterceptor = (config: AxiosRequestConfig): AxiosRequestConfig => {
  const authStore = useAuthStore();
  
  // Token hinzufügen, wenn verfügbar
  if (authStore.token) {
    config.headers = {
      ...config.headers,
      'Authorization': `Bearer ${authStore.token}`
    };
  }
  
  return config;
};
```

### Token-Erneuerung

```typescript
// src/api/interceptors/error.interceptor.ts
import { AxiosError } from 'axios';
import apiClient from '../index';
import { useAuthStore } from '@/stores/auth';

export const errorInterceptor = async (error: AxiosError) => {
  const authStore = useAuthStore();

  // Wenn Token abgelaufen ist (401), automatisch erneuern
  if (error.response?.status === 401 && authStore.refreshToken) {
    try {
      // Token erneuern
      await authStore.refreshAccessToken();
      
      // Ursprüngliche Anfrage wiederholen
      const originalRequest = error.config;
      originalRequest.headers['Authorization'] = `Bearer ${authStore.token}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      // Bei Fehler bei der Token-Erneuerung abmelden
      authStore.logout();
      return Promise.reject(refreshError);
    }
  }
  
  return Promise.reject(error);
};
```

## Fehlerbehandlung

Die Fehlerbehandlung erfolgt zentralisiert über das ApiResponse-Format und den ErrorInterceptor.

### ApiResponse-Format

```typescript
// src/api/models/ApiResponse.ts
export interface ApiResponse<T> {
  data: T;
  status: number;
  statusText: string;
  headers: any;
  success: boolean;
  error: ApiError | null;
}

export interface ApiError {
  message: string;
  code: string | number;
  details?: any;
}
```

### Fehlerbehandlung in Komponenten

```typescript
// Beispiel für Fehlerbehandlung in einer Komponente
import { ref } from 'vue';
import { apiService } from '@/api/ApiService';
import type { User } from '@/api/models/auth.models';

export function useUserProfile() {
  const user = ref<User | null>(null);
  const error = ref<string | null>(null);
  const isLoading = ref(false);

  const fetchUserProfile = async () => {
    isLoading.value = true;
    error.value = null;
    
    const response = await apiService.get<User>('/api/auth/user');
    
    isLoading.value = false;
    
    if (response.success) {
      user.value = response.data;
    } else {
      error.value = response.error?.message || 'Fehler beim Laden des Benutzerprofils';
      console.error('API-Fehler:', response.error);
    }
  };

  return {
    user,
    error,
    isLoading,
    fetchUserProfile
  };
}
```

## Streaming-API

Der nscale DMS Assistent verwendet Server-Sent Events (SSE) für das Streaming von Chat-Antworten in Echtzeit.

### StreamingService

```typescript
// src/api/StreamingService.ts
import { useAuthStore } from '@/stores/auth';
import { ApiError } from './models/ApiError';

type MessageHandler = (message: string) => void;
type ErrorHandler = (error: ApiError) => void;
type CompletionHandler = () => void;

export class StreamingService {
  private eventSource: EventSource | null = null;
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
  }

  /**
   * SSE-Stream starten
   */
  startStream(
    sessionId: string,
    onMessage: MessageHandler,
    onError: ErrorHandler,
    onComplete: CompletionHandler
  ): void {
    this.closeStream(); // Bestehenden Stream schließen
    
    const authStore = useAuthStore();
    const url = new URL(`${this.baseUrl}/sessions/${sessionId}/stream`);
    
    // Token als URL-Parameter hinzufügen für SSE-Auth
    if (authStore.token) {
      url.searchParams.append('token', authStore.token);
    }
    
    // Event Source erstellen
    this.eventSource = new EventSource(url.toString());
    
    // Event-Listener
    this.eventSource.onmessage = (event) => {
      if (event.data === '[DONE]') {
        onComplete();
        this.closeStream();
      } else {
        onMessage(event.data);
      }
    };
    
    this.eventSource.onerror = (event) => {
      const error: ApiError = {
        message: 'SSE-Verbindungsfehler',
        code: 'SSE_ERROR'
      };
      onError(error);
      this.closeStream();
    };
  }

  /**
   * Stream schließen
   */
  closeStream(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}

// Singleton-Instanz exportieren
export const streamingService = new StreamingService();
```

### Verwendung des StreamingService

```typescript
// Beispiel für die Verwendung des StreamingService
import { ref } from 'vue';
import { streamingService } from '@/api/StreamingService';

export function useChatStream(sessionId: string) {
  const streamedResponse = ref('');
  const isStreaming = ref(false);
  const error = ref<string | null>(null);

  const startStreaming = () => {
    isStreaming.value = true;
    streamedResponse.value = '';
    error.value = null;
    
    streamingService.startStream(
      sessionId,
      // Nachrichtenhandler
      (message) => {
        streamedResponse.value += message;
      },
      // Fehlerhandler
      (apiError) => {
        error.value = apiError.message;
        isStreaming.value = false;
      },
      // Abschlusshandler
      () => {
        isStreaming.value = false;
      }
    );
  };

  const stopStreaming = () => {
    streamingService.closeStream();
    isStreaming.value = false;
  };

  return {
    streamedResponse,
    isStreaming,
    error,
    startStreaming,
    stopStreaming
  };
}
```

## Rate-Limiting

Um API-Ratenbegrenzungen zu behandeln, implementiert die API-Integration einen RateLimitHandler.

### RateLimitHandler

```typescript
// src/api/middleware/rateLimit.ts
import { AxiosError, AxiosRequestConfig } from 'axios';

// Rate-Limit-Konfiguration
interface RateLimitConfig {
  maxRetries: number;
  initialDelay: number;
  backoffFactor: number;
}

// Standard-Konfiguration
const defaultConfig: RateLimitConfig = {
  maxRetries: 3,
  initialDelay: 1000, // 1 Sekunde
  backoffFactor: 2
};

/**
 * Rate-Limit-Handler konfigurieren
 */
export const configureRateLimit = (config: Partial<RateLimitConfig> = {}) => {
  const mergedConfig = { ...defaultConfig, ...config };
  
  return {
    handleRateLimit: async (error: AxiosError, retryCount = 0): Promise<boolean> => {
      // Nur für 429 Too Many Requests
      if (error.response?.status !== 429 || retryCount >= mergedConfig.maxRetries) {
        return false;
      }
      
      // Retry-After-Header berücksichtigen
      const retryAfter = error.response.headers['retry-after'];
      let delay = mergedConfig.initialDelay * Math.pow(mergedConfig.backoffFactor, retryCount);
      
      if (retryAfter && !isNaN(Number(retryAfter))) {
        delay = Number(retryAfter) * 1000; // In Millisekunden umwandeln
      }
      
      // Warten
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return true;
    }
  };
};
```

## Request-Queueing

Die Request-Queue verwaltet parallele Anfragen, um API-Limits einzuhalten.

### RequestQueue-Implementierung

```typescript
// src/api/middleware/requestQueue.ts
import { AxiosRequestConfig } from 'axios';

// Queue-Konfiguration
interface QueueConfig {
  maxParallelRequests: number;
  retryOnRateLimit: boolean;
}

// Standard-Konfiguration
const defaultConfig: QueueConfig = {
  maxParallelRequests: 5,
  retryOnRateLimit: true
};

// Aktive Anfragen zählen
let activeRequests = 0;
const requestQueue: (() => void)[] = [];

/**
 * Request-Queue konfigurieren
 */
export const configureQueue = (config: Partial<QueueConfig> = {}) => {
  const mergedConfig = { ...defaultConfig, ...config };
  
  // Nächste Anfrage aus der Warteschlange verarbeiten
  const processQueue = () => {
    if (requestQueue.length > 0 && activeRequests < mergedConfig.maxParallelRequests) {
      const nextRequest = requestQueue.shift();
      if (nextRequest) nextRequest();
    }
  };
  
  // Anfrage zur Queue hinzufügen
  const enqueueRequest = (requestFn: () => void) => {
    requestQueue.push(requestFn);
    processQueue();
  };
  
  // Anfrage abgeschlossen
  const completeRequest = () => {
    activeRequests--;
    processQueue();
  };
  
  return {
    preRequest: (config: AxiosRequestConfig) => {
      if (activeRequests >= mergedConfig.maxParallelRequests) {
        return new Promise<AxiosRequestConfig>((resolve) => {
          enqueueRequest(() => {
            activeRequests++;
            resolve(config);
          });
        });
      } else {
        activeRequests++;
        return config;
      }
    },
    postRequest: () => {
      completeRequest();
    }
  };
};
```

## Verwendung in Komponenten

### Integration mit Composables

```typescript
// src/composables/useApi.ts
import { apiService } from '@/api/ApiService';
import { streamingService } from '@/api/StreamingService';
import type { ApiResponse } from '@/api/models/ApiResponse';

export function useApi() {
  /**
   * GET-Anfrage
   */
  const get = async <T>(url: string, config = {}) => {
    return await apiService.get<T>(url, config);
  };
  
  /**
   * POST-Anfrage
   */
  const post = async <T>(url: string, data = {}, config = {}) => {
    return await apiService.post<T>(url, data, config);
  };
  
  /**
   * PUT-Anfrage
   */
  const put = async <T>(url: string, data = {}, config = {}) => {
    return await apiService.put<T>(url, data, config);
  };
  
  /**
   * DELETE-Anfrage
   */
  const del = async <T>(url: string, config = {}) => {
    return await apiService.delete<T>(url, config);
  };
  
  /**
   * SSE-Stream starten
   */
  const startStream = (
    sessionId: string,
    onMessage: (message: string) => void,
    onError: (error: any) => void,
    onComplete: () => void
  ) => {
    streamingService.startStream(sessionId, onMessage, onError, onComplete);
  };
  
  /**
   * Stream schließen
   */
  const closeStream = () => {
    streamingService.closeStream();
  };
  
  return {
    get,
    post,
    put,
    delete: del,
    startStream,
    closeStream
  };
}
```

### Integration in Vue-Komponenten

```vue
<template>
  <div>
    <div v-if="isLoading">Lade Daten...</div>
    <div v-else-if="error">Fehler: {{ error }}</div>
    <div v-else>
      <h2>{{ data.title }}</h2>
      <p>{{ data.content }}</p>
    </div>
    <button @click="fetchData">Aktualisieren</button>
  </div>
</template>

<script>
import { ref } from 'vue';
import { useApi } from '@/composables/useApi';

export default {
  setup() {
    const { get } = useApi();
    
    const data = ref(null);
    const isLoading = ref(false);
    const error = ref(null);
    
    const fetchData = async () => {
      isLoading.value = true;
      error.value = null;
      
      const response = await get('/api/data');
      
      isLoading.value = false;
      
      if (response.success) {
        data.value = response.data;
      } else {
        error.value = response.error?.message || 'Fehler beim Laden der Daten';
      }
    };
    
    // Beim Mounten Daten laden
    fetchData();
    
    return {
      data,
      isLoading,
      error,
      fetchData
    };
  }
}
</script>
```

## Beispiele

### Authentifizierung mit ApiService

```typescript
// Beispiel für die Authentifizierung mit dem ApiService
import { apiService } from '@/api/ApiService';
import { useAuthStore } from '@/stores/auth';

export async function loginUser(email: string, password: string) {
  const authStore = useAuthStore();
  
  const response = await apiService.post('/api/auth/login', {
    email,
    password
  });
  
  if (response.success) {
    // Token im Store speichern
    authStore.setToken(response.data.token);
    authStore.setUser(response.data.user);
    return true;
  } else {
    console.error('Login fehlgeschlagen:', response.error);
    return false;
  }
}
```

### Chat-Nachrichten mit Streaming

```typescript
// Beispiel für das Senden einer Chat-Nachricht mit Streaming
import { ref } from 'vue';
import { apiService } from '@/api/ApiService';
import { streamingService } from '@/api/StreamingService';

export function useChatMessages(sessionId: string) {
  const messages = ref([]);
  const currentResponse = ref('');
  const isStreaming = ref(false);
  const error = ref(null);
  
  // Nachrichten laden
  const loadMessages = async () => {
    const response = await apiService.get(`/api/sessions/${sessionId}/messages`);
    
    if (response.success) {
      messages.value = response.data;
    } else {
      error.value = response.error?.message;
    }
  };
  
  // Nachricht senden und Antwort streamen
  const sendMessage = async (content: string) => {
    // Nachricht speichern
    const msgResponse = await apiService.post(`/api/sessions/${sessionId}/messages`, {
      content,
      role: 'user'
    });
    
    if (!msgResponse.success) {
      error.value = msgResponse.error?.message;
      return false;
    }
    
    // Neue Nachricht zur Liste hinzufügen
    messages.value.push(msgResponse.data);
    
    // Stream starten
    isStreaming.value = true;
    currentResponse.value = '';
    
    streamingService.startStream(
      sessionId,
      // Nachrichtenhandler
      (chunk) => {
        currentResponse.value += chunk;
      },
      // Fehlerhandler
      (apiError) => {
        error.value = apiError.message;
        isStreaming.value = false;
      },
      // Abschlusshandler
      async () => {
        isStreaming.value = false;
        
        // Vollständige Antwort zur Nachrichtenliste hinzufügen
        messages.value.push({
          content: currentResponse.value,
          role: 'assistant',
          timestamp: new Date().toISOString()
        });
        
        // Nachrichtenliste aktualisieren
        await loadMessages();
      }
    );
    
    return true;
  };
  
  // Stream abbrechen
  const cancelStream = () => {
    if (isStreaming.value) {
      streamingService.closeStream();
      isStreaming.value = false;
    }
  };
  
  // Initial Nachrichten laden
  loadMessages();
  
  return {
    messages,
    currentResponse,
    isStreaming,
    error,
    sendMessage,
    cancelStream,
    loadMessages
  };
}
```

### Datei-Upload mit FormData

```typescript
// Beispiel für den Upload einer Datei
import { ref } from 'vue';
import { apiService } from '@/api/ApiService';

export function useDocumentUpload() {
  const isUploading = ref(false);
  const progress = ref(0);
  const error = ref(null);
  
  const uploadDocument = async (file: File) => {
    isUploading.value = true;
    progress.value = 0;
    error.value = null;
    
    // FormData erstellen
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await apiService.post('/api/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            progress.value = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          }
        }
      });
      
      isUploading.value = false;
      
      if (!response.success) {
        error.value = response.error?.message || 'Upload fehlgeschlagen';
        return null;
      }
      
      return response.data;
    } catch (e) {
      isUploading.value = false;
      error.value = 'Upload fehlgeschlagen: ' + (e.message || 'Unbekannter Fehler');
      return null;
    }
  };
  
  return {
    isUploading,
    progress,
    error,
    uploadDocument
  };
}
```

## Fehlerbehebung

### Häufige Probleme

#### 401 Unauthorized-Fehler

**Problem**: API-Anfragen schlagen mit 401 Unauthorized fehl.

**Lösung**:
1. Überprüfen Sie, ob der Benutzer angemeldet ist
2. Prüfen Sie, ob das Token abgelaufen ist
3. Stellen Sie sicher, dass der AuthInterceptor korrekt konfiguriert ist
4. Versuchen Sie, den Benutzer ab- und wieder anzumelden

#### Fehlende Streaming-Aktualisierungen

**Problem**: Der SSE-Stream wird gestartet, aber es kommen keine Updates an.

**Lösung**:
1. Stellen Sie sicher, dass der Server SSE unterstützt
2. Überprüfen Sie die CORS-Konfiguration
3. Prüfen Sie, ob die Token-Übermittlung für SSE korrekt ist
4. Überprüfen Sie im Netzwerk-Tab der Entwicklertools, ob SSE-Verbindungen hergestellt werden

#### Übermäßige API-Aufrufe

**Problem**: Die Anwendung führt zu viele API-Aufrufe durch.

**Lösung**:
1. Implementieren Sie Caching für häufig abgerufene Daten
2. Verwenden Sie Debouncing für Benutzeraktionen
3. Überprüfen Sie, ob Komponenten unnötige Anfragen auslösen
4. Stellen Sie sicher, dass die RequestQueue korrekt konfiguriert ist

## Tests

### Unit-Tests für ApiService

```typescript
// test/api/ApiService.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiService } from '@/api/ApiService';
import axios from 'axios';

// Mock für axios
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    create: () => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    })
  }
}));

describe('ApiService', () => {
  let apiService: ApiService;
  
  beforeEach(() => {
    apiService = new ApiService();
    vi.resetAllMocks();
  });
  
  it('sollte GET-Anfragen korrekt verarbeiten', async () => {
    // Mock-Antwort
    const mockResponse = {
      data: { id: 1, name: 'Test' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {}
    };
    
    // Mock für axios.get
    (axios.get as any).mockResolvedValue(mockResponse);
    
    // Service-Methode aufrufen
    const result = await apiService.get('/test');
    
    // Überprüfungen
    expect(axios.get).toHaveBeenCalledWith('/test', expect.any(Object));
    expect(result).toEqual({
      data: { id: 1, name: 'Test' },
      status: 200,
      statusText: 'OK',
      headers: {},
      success: true,
      error: null
    });
  });
  
  it('sollte Fehler korrekt behandeln', async () => {
    // Mock-Fehler
    const mockError = {
      response: {
        data: { message: 'Not Found' },
        status: 404,
        statusText: 'Not Found',
        headers: {}
      },
      message: 'Request failed with status code 404'
    };
    
    // Mock für axios.get
    (axios.get as any).mockRejectedValue(mockError);
    
    // Service-Methode aufrufen
    const result = await apiService.get('/test');
    
    // Überprüfungen
    expect(axios.get).toHaveBeenCalledWith('/test', expect.any(Object));
    expect(result).toEqual({
      data: null,
      status: 404,
      statusText: 'Not Found',
      headers: {},
      success: false,
      error: {
        message: 'Request failed with status code 404',
        code: 404,
        details: { message: 'Not Found' }
      }
    });
  });
});
```

### Integration-Tests mit MSW

```typescript
// test/api/integration.spec.ts
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { apiService } from '@/api/ApiService';

// MSW-Server für API-Mocking
const server = setupServer(
  // GET /api/test
  rest.get('/api/test', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({ message: 'Test erfolgreich' })
    );
  }),
  
  // POST /api/test
  rest.post('/api/test', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({ id: 1, ...req.body })
    );
  }),
  
  // GET /api/error
  rest.get('/api/error', (req, res, ctx) => {
    return res(
      ctx.status(500),
      ctx.json({ message: 'Interner Serverfehler' })
    );
  })
);

// Server-Setup
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('API-Integration', () => {
  it('sollte Daten erfolgreich abrufen', async () => {
    const response = await apiService.get('/api/test');
    
    expect(response.success).toBe(true);
    expect(response.status).toBe(200);
    expect(response.data).toEqual({ message: 'Test erfolgreich' });
  });
  
  it('sollte Daten erfolgreich senden', async () => {
    const testData = { name: 'Test', value: 123 };
    const response = await apiService.post('/api/test', testData);
    
    expect(response.success).toBe(true);
    expect(response.status).toBe(201);
    expect(response.data).toEqual({ id: 1, ...testData });
  });
  
  it('sollte Fehler korrekt behandeln', async () => {
    const response = await apiService.get('/api/error');
    
    expect(response.success).toBe(false);
    expect(response.status).toBe(500);
    expect(response.error).not.toBeNull();
    expect(response.error?.message).toBe('Request failed with status code 500');
  });
});
```