# Fehlerbehandlung und Retry-Strategien

Dieses Dokument beschreibt die Fehlerbehandlungs- und Wiederholungsstrategien, die im API-Client des nscale DMS Assistenten implementiert sind.

## Inhaltsverzeichnis

1. [Fehlerbehandlungsarchitektur](#fehlerbehandlungsarchitektur)
2. [Fehlertypen und -kategorisierung](#fehlertypen-und--kategorisierung)
3. [Retry-Strategien](#retry-strategien)
4. [Rate-Limiting-Behandlung](#rate-limiting-behandlung)
5. [Implementierung in Komponenten](#implementierung-in-komponenten)
6. [Best Practices](#best-practices)
7. [Debugging und Fehlerbehebung](#debugging-und-fehlerbehebung)

## Fehlerbehandlungsarchitektur

Die Fehlerbehandlung im nscale DMS Assistenten folgt einem mehrschichtigen Ansatz:

```
┌─────────────────────┐
│   Vue-Komponenten   │  ◄─── Benutzerfreundliche Fehlermeldungen
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│     Composables     │  ◄─── Funktionale Fehlerbehandlung
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│    Service-Layer    │  ◄─── Geschäftslogik-Fehlerbehandlung
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│     API-Client      │  ◄─── Technische Fehlerbehandlung
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  RetryHandler +     │  ◄─── Automatische Wiederholungen
│  RateLimitHandler   │
└─────────────────────┘
```

### Prozessablauf der Fehlerbehandlung

1. **Fehler tritt auf**: HTTP-Fehler, Timeout, Netzwerkproblem
2. **API-Client-Verarbeitung**: Konvertiert Axios-Fehler in standardisierte ApiError-Objekte
3. **Automatische Wiederholungsversuche**: RetryHandler versucht geeignete Anfragen automatisch erneut
4. **Rate-Limit-Prüfung**: RateLimitHandler erkennt Rate-Limiting und throttled oder wartet
5. **Service-Layer-Verarbeitung**: Domänenspezifische Fehlerbehandlung (z.B. im ChatService)
6. **Composable-Verarbeitung**: Reaktive Fehlerstatuskonvertierung für Vue-Komponenten
7. **UI-Feedback**: Anzeige von Fehlertoasts, Benachrichtigungen oder inline-Fehlermeldungen

## Fehlertypen und -kategorisierung

### ApiError-Interface

Alle Fehler werden in ein standardisiertes ApiError-Format konvertiert:

```typescript
interface ApiError {
  /** Fehlercode (z.B. "ERR_NETWORK", "ERR_TIMEOUT") */
  code: string;
  
  /** Benutzerfreundliche Fehlermeldung */
  message: string;
  
  /** HTTP-Statuscode (wenn verfügbar) */
  status?: number;
  
  /** Zusätzliche Fehlerdetails vom Server */
  details?: Record<string, any>;
  
  /** Stack-Trace (nur im Entwicklungsmodus) */
  stack?: string;
}
```

### Fehlertypen und -codes

| Kategorie | Fehlercode | HTTP-Status | Beschreibung | Wiederholbar |
|-----------|------------|-------------|--------------|--------------|
| **Netzwerk** | ERR_NETWORK | - | Netzwerkverbindungsfehler | Ja |
| | ERR_TIMEOUT | 408 | Anfrage-Timeout | Ja |
| | ERR_CANCELLED | - | Vom Benutzer abgebrochen | Nein |
| **Authentifizierung** | ERR_UNAUTHORIZED | 401 | Nicht authentifiziert | Ja (mit Token-Refresh) |
| | ERR_FORBIDDEN | 403 | Keine Berechtigung | Nein |
| **Anfragefehler** | ERR_BAD_REQUEST | 400 | Ungültige Anfrageparameter | Nein |
| | ERR_NOT_FOUND | 404 | Ressource nicht gefunden | Nein |
| | ERR_CONFLICT | 409 | Ressourcenkonflikt | Nein |
| | ERR_VALIDATION | 422 | Validierungsfehler | Nein |
| **Server** | ERR_SERVER | 500 | Interner Serverfehler | Ja |
| | ERR_BAD_GATEWAY | 502 | Bad Gateway | Ja |
| | ERR_SERVICE_UNAVAILABLE | 503 | Service nicht verfügbar | Ja |
| | ERR_GATEWAY_TIMEOUT | 504 | Gateway-Timeout | Ja |
| **Drosselung** | ERR_RATE_LIMITED | 429 | Zu viele Anfragen | Ja (mit Verzögerung) |

### Fehlerbeispiele und -struktur

#### Netzwerkfehler

```json
{
  "code": "ERR_NETWORK",
  "message": "Netzwerkfehler bei der Kommunikation mit dem Server",
  "status": 0
}
```

#### Authentifizierungsfehler

```json
{
  "code": "ERR_UNAUTHORIZED",
  "message": "Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.",
  "status": 401,
  "details": {
    "tokenExpiry": "2023-04-01T12:30:00Z"
  }
}
```

#### Validierungsfehler

```json
{
  "code": "ERR_VALIDATION",
  "message": "Die eingegebenen Daten sind ungültig",
  "status": 422,
  "details": {
    "fields": {
      "email": "E-Mail-Format ist ungültig",
      "password": "Passwort muss mindestens 8 Zeichen lang sein"
    }
  }
}
```

#### Rate-Limiting-Fehler

```json
{
  "code": "ERR_RATE_LIMITED",
  "message": "Zu viele Anfragen, bitte warten Sie",
  "status": 429,
  "details": {
    "retryAfter": 30,
    "limit": 100,
    "remaining": 0,
    "reset": "2023-04-01T12:30:00Z"
  }
}
```

## Retry-Strategien

Die Anwendung implementiert eine umfassende Wiederholungsstrategie für transiente Fehler:

### Wiederholungskriterien

Der RetryHandler verwendet diese Kriterien, um zu entscheiden, ob eine Anfrage wiederholt werden soll:

1. **Fehlertyp**: Nur bestimmte Fehlertypen werden wiederholt
2. **HTTP-Status**: Nur bestimmte HTTP-Statuscodes (408, 429, 500, 502, 503, 504)
3. **Wiederholungsversuche**: Nicht mehr als die konfigurierte Anzahl von Versuchen
4. **Methode-Idempotenz**: Standardmäßig werden nur idempotente Methoden (GET, PUT, DELETE) wiederholt

```typescript
// Konfigurationsbeispiel für RetryHandler
const retryHandler = new RetryHandler({
  maxRetries: 3,               // Maximal 3 Wiederholungsversuche
  baseDelay: 1000,             // 1 Sekunde Basisverzögerung
  backoffFactor: 1.5,          // Exponentielle Verzögerung (1s, 1.5s, 2.25s)
  retryStatusCodes: [408, 429, 500, 502, 503, 504],
  retryNetworkErrors: true,    // Netzwerkfehler wiederholen
  maxDelay: 30000,             // Maximal 30 Sekunden Verzögerung
  enableJitter: true           // Zufällige Variation hinzufügen
});
```

### Exponentieller Backoff-Algorithmus

Die Verzögerungsberechnung verwendet einen exponentiellen Backoff mit Jitter:

```
delay = min(maxDelay, baseDelay * (backoffFactor ^ retryCount) * (0.8 + random * 0.4))
```

Beispiel für 3 Wiederholungsversuche (Basisverzögerung: 1000ms, Faktor: 1.5):
- Versuch 1: ~1000ms (plus/minus Jitter)
- Versuch 2: ~1500ms (plus/minus Jitter)
- Versuch 3: ~2250ms (plus/minus Jitter)

### Implementierung des Wiederholungsprozesses

```typescript
public async retryRequest<T>(config: AxiosRequestConfig, axiosInstance: AxiosInstance): Promise<T> {
  // Zähler für Wiederholungsversuche inkrementieren
  const retryCount = ((config as any)._retryCount || 0) + 1;
  (config as any)._retryCount = retryCount;
  
  // Verzögerung berechnen
  const delay = this.calculateDelay(retryCount - 1);
  
  // Log-Eintrag
  this.logService.info(`Wiederhole Anfrage (${retryCount}/${this.maxRetries}) nach ${delay}ms: ${config.method?.toUpperCase()} ${config.url}`);
  
  // Verzögerung vor dem Wiederholungsversuch
  await new Promise(resolve => setTimeout(resolve, delay));
  
  // Anfrage wiederholen
  return axiosInstance.request(config);
}
```

### Idempotenz-Behandlung

Für nicht-idempotente Methoden (POST, PATCH) kann eine Anfrage explizit als idempotent markiert werden:

```typescript
// Explizit idempotente POST-Anfrage
apiService.post('/api/cart/add', item, {
  isIdempotent: true  // Erlaubt Wiederholungsversuche für diese POST-Anfrage
});
```

## Rate-Limiting-Behandlung

Der RateLimitHandler erkennt und behandelt API-Ratengrenzenbegrenzungen, um 429-Fehler proaktiv zu vermeiden:

### Rate-Limit-Erkennung

Der RateLimitHandler überwacht diese Header:

- `X-RateLimit-Limit`: Maximale Anzahl von Anfragen im Zeitfenster
- `X-RateLimit-Remaining`: Verbleibende Anfragen im aktuellen Zeitfenster
- `X-RateLimit-Reset`: Zeitpunkt der Zurücksetzung des Limits

### Proaktive Drosselung

Wenn `X-RateLimit-Remaining` unter den Schwellenwert fällt (standardmäßig 5), werden nachfolgende Anfragen gedrosselt:

1. **Leichte Drosselung**: Bei niedrigen verbleibenden Anfragen wird eine leichte Verzögerung hinzugefügt
2. **Starke Drosselung**: Bei sehr wenigen verbleibenden Anfragen wird eine stärkere Verzögerung hinzugefügt
3. **Vollständige Drosselung**: Bei 0 verbleibenden Anfragen werden alle Anfragen bis zum Reset-Zeitpunkt verzögert

```typescript
// Beispiel für die Berechnung der Drosselungsverzögerung
if (lowestRemaining <= this.throttleThreshold) {
  // Wenn wir unter dem Schwellenwert sind, Verzögerung basierend auf Reset-Zeit berechnen
  const timeUntilReset = Math.max(0, nearestReset - Date.now());
  
  if (lowestRemaining <= 0) {
    // Keine Anfragen mehr übrig, volle Verzögerung
    this.currentThrottleDelay = timeUntilReset || this.minThrottleDelay;
  } else {
    // Verzögerung basierend auf verbleibenden Anfragen und Zeit bis zum Reset
    const delayFactor = 1 - (lowestRemaining / this.throttleThreshold);
    this.currentThrottleDelay = Math.max(
      this.minThrottleDelay,
      Math.min(timeUntilReset, delayFactor * timeUntilReset)
    );
  }
}
```

### 429-Fehlerbehandlung

Wenn trotz proaktiver Drosselung ein 429-Fehler auftritt:

1. Extrahiere `Retry-After`-Header oder berechne Wartezeit basierend auf `X-RateLimit-Reset`
2. Verzögere die Anfrage für die angegebene Zeit
3. Versuche die Anfrage automatisch erneut

```typescript
private async handleRateLimitError(error: AxiosError, originalRequest: AxiosRequestConfig): Promise<AxiosResponse> {
  // Extrahiere Rate-Limit-Informationen
  const retryAfter = error.response?.headers['retry-after'];
  const resetTime = this.rateLimitHandler.getResetTimeFromResponse(error.response);
  
  // Berechne Verzögerung
  const delayMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 
                  resetTime ? Math.max(0, resetTime - Date.now()) : 
                  apiConfig.RATE_LIMITING.MIN_THROTTLE_DELAY;
  
  this.logService.warn(`🚦 Rate limited, retrying after ${delayMs}ms`, {
    retryAfter,
    resetTime,
    url: originalRequest.url
  });
  
  // Warte auf Verzögerung und wiederhole dann
  await new Promise(resolve => setTimeout(resolve, delayMs));
  
  // Anfrage wiederholen
  return this.axiosInstance(originalRequest);
}
```

## Implementierung in Komponenten

### Service-Layer-Fehlerbehandlung

Die Service-Layer-Klassen (ChatService, etc.) implementieren domänenspezifische Fehlerbehandlung:

```typescript
public async sendMessage(
  sessionId: string | null,
  content: string,
  options: ChatMessageOptions = {}
): Promise<ChatMessage> {
  try {
    // Anfrage-Logik...
  } catch (error) {
    this.logService.error('Fehler beim Senden einer Nachricht', error);
    
    // Spezifische Fehlerbehandlung
    if ((error as ApiError).code === 'ERR_NETWORK') {
      // Temporäre Nachricht mit Fehlerstatus erstellen
      this.updateMessageWithError(sessionId, 'Netzwerkfehler beim Senden der Nachricht');
    } else if ((error as ApiError).code === 'ERR_CANCELLED') {
      // Abbruch-Behandlung
      this.markMessageAsCancelled(sessionId);
    }
    
    // Callback auslösen, wenn konfiguriert
    if (options.onError) {
      options.onError(error as Error);
    }
    
    // Fehler weiterleiten
    throw error;
  }
}
```

### Composable-Fehlerbehandlung

Composables stellen reaktive Fehlerproperties für Vue-Komponenten bereit:

```typescript
export function useChat() {
  // Reaktive Fehlerzustände
  const error = ref<string | null>(null);
  const isLoading = ref<boolean>(false);
  
  // Chat-Service-Instanz
  const chatService = inject('chatService') || chatServiceInstance;
  
  // Wrapperfunktion mit Fehlerbehandlung
  const sendMessage = async (params: SendMessageParams) => {
    error.value = null;
    isLoading.value = true;
    
    try {
      const result = await chatService.sendMessage(
        params.sessionId,
        params.content,
        {
          ...params,
          // Fehler-Handler überschreiben
          onError: (err) => {
            error.value = err.message;
            
            // Ursprünglichen Handler auch aufrufen, wenn vorhanden
            if (params.onError) {
              params.onError(err);
            }
          }
        }
      );
      
      return result;
    } catch (err) {
      // Bereits durch onError behandelt
      return null;
    } finally {
      isLoading.value = false;
    }
  };
  
  return {
    sendMessage,
    error,
    isLoading,
    // Weitere Properties...
  };
}
```

### UI-Komponenten-Fehlerbehandlung

Vue-Komponenten nutzen die Fehlerproperties aus Composables für benutzerfreundliches Feedback:

```vue
<template>
  <div class="chat-input">
    <div v-if="error" class="error-banner">
      {{ error }}
      <button @click="error = null">Schließen</button>
    </div>
    
    <textarea v-model="message" :disabled="isLoading"></textarea>
    
    <button @click="sendMessage" :disabled="isLoading || !message.trim()">
      {{ isLoading ? 'Sendet...' : 'Senden' }}
    </button>
  </div>
</template>

<script>
import { ref } from 'vue';
import { useChat } from '@/composables/useChat';

export default {
  setup() {
    const message = ref('');
    const { sendMessage: sendChatMessage, error, isLoading } = useChat();
    
    const sendMessage = async () => {
      if (!message.value.trim()) return;
      
      const success = await sendChatMessage({
        content: message.value,
        autoCreateSession: true
      });
      
      if (success) {
        message.value = '';
      }
    };
    
    return {
      message,
      sendMessage,
      error,
      isLoading
    };
  }
}
</script>
```

## Best Practices

### Hierarchische Fehlerbehandlung

Verwenden Sie einen hierarchischen Ansatz zur Fehlerbehandlung:

1. **ApiService-Ebene**: Technische Fehler (Netzwerk, HTTP-Status)
2. **Service-Ebene**: Geschäftslogikfehler 
3. **Composable-Ebene**: Reaktive Fehlerzustände und UI-Feedback
4. **Komponenten-Ebene**: Benutzerdefinierte Fehleranzeige und -aktionen

### Offline-First-Unterstützung

Für optimale Benutzererfahrung bei Netzwerkproblemen:

```typescript
// Prüfen, ob die Anwendung offline ist
const isOffline = ref(typeof navigator !== 'undefined' ? !navigator.onLine : false);

// Event-Listener für Online-/Offline-Status
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    isOffline.value = false;
    chatService.resumeQueuedOperations();
  });
  
  window.addEventListener('offline', () => {
    isOffline.value = true;
    chatService.pauseNetworkOperations();
  });
}

// Offline-freundliche Anfrage
const sendWithOfflineSupport = async () => {
  if (isOffline.value) {
    // Zu Offline-Queue hinzufügen
    offlineQueue.push({ action: 'sendMessage', params: { content: message.value } });
    return { queued: true };
  }
  
  // Normal fortfahren, wenn online
  return await chatService.sendMessage(null, message.value);
};
```

### Kontextspezifische Fehlerbehandlung

Anpassen der Fehlerbehandlung basierend auf dem Anwendungskontext:

```typescript
// Verschiedene Fehlerbehandlung in verschiedenen Bereichen
const handleApiError = (error: ApiError, context: string) => {
  switch (context) {
    case 'login':
      if (error.code === 'ERR_VALIDATION') {
        return 'Benutzername oder Passwort ist ungültig';
      } else if (error.code === 'ERR_RATE_LIMITED') {
        return 'Zu viele Anmeldeversuche. Bitte warten Sie einen Moment.';
      }
      break;
      
    case 'chat':
      if (error.code === 'ERR_NETWORK') {
        return 'Verbindung unterbrochen. Versuche erneut zu verbinden...';
      } else if (error.code === 'ERR_TIMEOUT') {
        return 'Die Antwort dauert länger als erwartet. Bitte gedulden Sie sich.';
      }
      break;
  }
  
  // Standardfehlerbehandlung
  return error.message;
};
```

## Debugging und Fehlerbehebung

### Konsolenprotokollierung

Der LogService bietet umfassende Protokollierung für das Debugging:

```typescript
// Logging-Konfiguration
LogService.configure({
  level: LogLevel.DEBUG,
  enabledModules: ['ApiService', 'RetryHandler', 'RateLimitHandler'],
  colorize: true,
  timestamp: true
});

// Verwenden des LogService in einer Klasse
this.logService.debug('API-Anfrage gesendet', { 
  url, 
  method, 
  params 
});

this.logService.error('Fehler bei API-Anfrage', error);
```

### Netzwerk-Monitoring

Nutzen Sie die Browser-Entwicklertools (Network-Tab) und den integrierten RequestLogger:

```typescript
// ApiService Debug-Logging aktivieren
apiConfig.DEBUG.LOG_REQUESTS = true;
apiConfig.DEBUG.VERBOSE = true;

// Manuelles Api-Debugging
apiService.setDebugMode(true);
```

### Fehlerverfolgung und -analyse

Um Muster in Fehlern zu erkennen, implementieren Sie Fehlertracking:

```typescript
// Fehler zur Analyse protokollieren
const trackError = (
  error: ApiError, 
  context: string, 
  additionalData?: Record<string, any>
) => {
  // Log-Eintrag erstellen
  const errorLog = {
    timestamp: new Date().toISOString(),
    errorCode: error.code,
    message: error.message,
    status: error.status,
    context,
    url: error.config?.url,
    method: error.config?.method,
    userAgent: navigator.userAgent,
    ...additionalData
  };
  
  // Fehler in localStorage speichern
  const errorLogs = JSON.parse(localStorage.getItem('error_logs') || '[]');
  errorLogs.push(errorLog);
  localStorage.setItem('error_logs', JSON.stringify(errorLogs.slice(-100))); // Letzte 100 Einträge speichern
  
  // Optional: An Server senden
  if (navigator.onLine) {
    fetch('/api/error-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorLog),
      keepalive: true // Senden auch beim Verlassen der Seite
    }).catch(() => {
      // Ignorieren, da nur Logging
    });
  }
};
```

### Häufige Fehler und Lösungen

| Problem | Mögliche Ursache | Lösung |
|---------|------------------|--------|
| Häufige 401-Fehler | Token-Refresh funktioniert nicht | Überprüfen Sie die Konfiguration des Auth-Stores und des Token-Refresh-Mechanismus. |
| Anfragen werden nicht wiederholt | Methode ist nicht idempotent | Setzen Sie `isIdempotent: true` für POST/PATCH-Anfragen, die sicher wiederholt werden können. |
| Zu lange Wartezeiten | Zu aggressive Retry-Strategie | Passen Sie `maxRetries` und `baseDelay` an die Anwendungsanforderungen an. |
| Anfrage-Timeouts | Server-Antwortzeit zu lang | Erhöhen Sie `apiConfig.TIMEOUTS.DEFAULT` oder setzen Sie einen längeren Timeout für bestimmte Anfragen. |
| Zu viele parallele Anfragen | Zu hohe Parallelität | Reduzieren Sie `apiConfig.QUEUE.MAX_CONCURRENT_REQUESTS` oder verwenden Sie priorisierte Anfragen. |
| 429-Fehler trotz Rate-Limiting | Falsche Header-Konfiguration | Überprüfen Sie die `RATE_LIMITING`-Konfiguration und die vom Server gesendeten Header. |