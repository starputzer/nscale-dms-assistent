/**
 * Enhanced Streaming Service für Server-Sent Events
 * Ersetzt EventSource durch fetch() mit ReadableStream für bessere Header-Unterstützung
 * Implementiert robuste Fehlerbehandlung, Token-Refresh und Fallback-Mechanismen
 */

import { useAuthStore } from '@/stores/auth';
import { ref } from 'vue';
import { toNumericFormat, isUuidFormat } from '@/utils/sessionIdAdapter';

// Status für diagnostische Zwecke
export const streamingStatus = ref<{
  active: boolean;
  error: string | null;
  reconnecting: boolean;
  fallbackActive: boolean;
  sessionId: string | null;
}>({
  active: false,
  error: null,
  reconnecting: false,
  fallbackActive: false,
  sessionId: null
});

export interface StreamingOptions {
  question: string;
  sessionId: string;
  simpleLanguage?: boolean;
  onMessage?: (data: string) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
  onProgress?: (progress: number) => void;
  onFallback?: () => void;
}

export class StreamingService {
  private controller: AbortController | null = null;
  private retryCount = 0;
  private maxRetries = 3;
  private state = {
    completed: false,
    totalChunks: 0,
    currentSessionId: null as string | null,
  };
  private throttledProgress = this.throttle((progress: number, options: StreamingOptions) => {
    options.onProgress?.(progress);
  }, 100);

  /**
   * Startet einen Stream für die Frage-Antwort mit Fallback-Mechanismen
   */
  async startStream(options: StreamingOptions): Promise<void> {
    // Setze Status-Informationen
    this.state.completed = false;
    this.state.totalChunks = 0;
    this.state.currentSessionId = options.sessionId;
    this.retryCount = 0;
    
    streamingStatus.value = {
      active: true,
      error: null,
      reconnecting: false,
      fallbackActive: false,
      sessionId: options.sessionId
    };

    try {
      await this.startStreamWithRetry(options);
    } catch (error) {
      console.error('[StreamingService] Alle Streaming-Versuche fehlgeschlagen, verwende Fallback');
      this.startFallbackRequest(options);
    }
  }

  /**
   * Startet einen Stream mit Wiederholungsversuchen bei Fehlern
   */
  private async startStreamWithRetry(options: StreamingOptions): Promise<void> {
    let token = this.getAuthToken();
    
    if (!token) {
      console.error('[StreamingService] Kein Token gefunden');
      throw new Error('Nicht authentifiziert');
    }

    // Session-ID für Backend-Anfrage vorbereiten
    const origSessionId = String(options.sessionId);
    let backendSessionId = origSessionId;
    
    if (isUuidFormat(origSessionId)) {
      // UUID zu numerischer ID konvertieren
      const numericId = toNumericFormat(origSessionId);
      if (numericId !== origSessionId) {
        backendSessionId = numericId;
        console.log(`Streaming-Service: UUID ${origSessionId} konvertiert zu numerischer ID ${backendSessionId}`);
      } else {
        // Keine Konvertierung gefunden, verwende UUID direkt und log den Versuch
        console.log(`Streaming-Service: Keine Zuordnung für UUID ${origSessionId} gefunden, verwende Original-ID`);
        
        // UUID zum Server senden - das Backend kann jetzt mit beiden Formaten umgehen
        backendSessionId = origSessionId;
      }
    }
    
    // Erstelle URL mit korrektem Encoding
    const params = new URLSearchParams({
      question: options.question,
      session_id: backendSessionId,
      ...(options.simpleLanguage && { simple_language: 'true' })
    });

    const url = `/api/question/stream?${params.toString()}`;
    
    // Abbruch-Controller für Stream-Kontrolle
    this.controller = new AbortController();

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
        signal: this.controller.signal,
      });

      // Behandle verschiedene HTTP Status-Codes
      if (response.status === 401 || response.status === 403) {
        // Auth-Fehler, versuche Token zu aktualisieren
        if (this.retryCount < this.maxRetries) {
          this.retryCount++;
          streamingStatus.value.reconnecting = true;
          console.warn(`[StreamingService] Auth-Fehler (${response.status}), versuche Token-Refresh und erneuten Verbindungsaufbau ${this.retryCount}/${this.maxRetries}`);
          
          // Versuche Token zu aktualisieren (je nach Auth-Implementierung)
          await this.refreshAuthToken();
          
          // Erneut versuchen mit neuem Token
          return this.startStreamWithRetry(options);
        } else {
          throw new Error(`Authentifizierungsfehler: ${response.status}`);
        }
      } else if (response.status === 422) {
        // 422 Unprocessable Entity - meist ein Problem mit den gesendeten Daten
        const errorDetails = await this.getErrorDetail(response);
        console.error('[StreamingService] 422 Unprocessable Entity Fehler:', errorDetails);
        
        // Versuche, spezifischere Informationen aus dem Fehler zu extrahieren
        let errorMessage = 'Anfrage konnte nicht verarbeitet werden (422)';
        try {
          if (typeof errorDetails === 'string' && errorDetails.includes('{')) {
            // Versuche JSON zu parsen
            const parsed = JSON.parse(errorDetails);
            if (parsed.error || parsed.message) {
              errorMessage = `422 Error: ${parsed.error || parsed.message}`;
            }
          } else if (typeof errorDetails === 'object') {
            errorMessage = `422 Error: ${errorDetails.error || errorDetails.message || JSON.stringify(errorDetails)}`;
          }
        } catch (e) {
          // Parsen fehlgeschlagen, verwende Standard-Fehlermeldung
          console.warn('[StreamingService] Fehler beim Parsen der Fehlerdetails:', e);
        }
        
        // Bei 422-Fehlern automatisch Fallback zur nicht-streaming API verwenden
        console.log('[StreamingService] Verwende automatisch Fallback für 422-Fehler');
        this.startFallbackRequest(options);
        return; // Wichtig: Hier früh zurückkehren, um weitere Verarbeitung zu vermeiden
      } else if (!response.ok) {
        // Andere HTTP-Fehler
        console.error(`[StreamingService] HTTP Fehler: ${response.status} ${response.statusText}`);
        throw new Error(`HTTP Fehler: ${response.status} ${response.statusText}`);
      }

      // Status zurücksetzen, wenn Verbindung erfolgreich ist
      streamingStatus.value.reconnecting = false;
      streamingStatus.value.error = null;

      // Verarbeite den Stream
      await this.processStream(response, options);
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.log('[StreamingService] Stream wurde manuell abgebrochen');
        } else {
          console.error('[StreamingService] Stream-Fehler:', error);
          streamingStatus.value.error = error.message;
          
          // Nur Fehler weitergeben, wenn es nicht durch Abort verursacht wurde
          options.onError?.(error);
          
          // Wiederholungsversuch, wenn möglich
          if (this.retryCount < this.maxRetries && this.controller?.signal.aborted !== true) {
            this.retryCount++;
            streamingStatus.value.reconnecting = true;
            
            console.warn(`[StreamingService] Verbindungsfehler, versuche erneuten Verbindungsaufbau ${this.retryCount}/${this.maxRetries}`);
            
            // Kurze Pause vor erneutem Versuch
            await new Promise(resolve => setTimeout(resolve, 1000));
            return this.startStreamWithRetry(options);
          } else {
            throw error; // Weiterwerfen nach max. Versuchen
          }
        }
      }
    }
  }

  /**
   * Verarbeitet den Response-Stream
   */
  private async processStream(response: Response, options: StreamingOptions): Promise<void> {
    // Prüfen, ob response.body existiert und ob es ein ReadableStream ist
    if (!response.body) {
      throw new Error("Kein Stream in der Antwort verfügbar");
    }

    // WICHTIG: Wir erstellen KEINEN Response-Clone mehr, um das Problem "Failed to execute 'clone' on 'Response'" zu vermeiden
    // Der Stream kann nur einmal gelesen werden
    
    // Versuche Stream zu verarbeiten
    try {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            // Process final buffer and complete
            if (buffer.trim()) {
              this.processServerSentEvent(buffer, options);
            }
            
            if (!this.state.completed) {
              this.handleEndEvent(options);
            }
            break;
          }
          
          // Decode chunk and add to buffer
          buffer += decoder.decode(value, { stream: true });
          this.state.totalChunks++;
          
          // Process complete SSE messages
          const events = buffer.split('\n\n');
          buffer = events.pop() || '';
          
          for (const event of events) {
            if (event.trim()) {
              this.processServerSentEvent(event, options);
            }
          }
          
          // Update progress (approximate)
          const estimatedProgress = Math.min(95, this.state.totalChunks * 5);
          this.throttledProgress(estimatedProgress, options);
        }
      } catch (error) {
        console.error('[StreamingService] Fehler bei Stream-Verarbeitung:', error);
        throw error;
      } finally {
        reader.releaseLock();
      }
    } catch (lockError) {
      // Fallback für den Fall, dass der Stream bereits gesperrt ist
      console.warn('[StreamingService] Der Stream ist bereits gesperrt, verwende alternativen Ansatz');
      
      // Da wir keine Clone-Funktion mehr verwenden können, müssen wir einen alternativen Ansatz implementieren
      console.log('[StreamingService] Fallback zum regulären API-Endpunkt nach Streaming-Fehler');
      
      // Direkt zum Fallback-Mechanismus übergehen
      this.startFallbackRequest(options);
    }
  }

  /**
   * Verarbeitet SSE-Events im Format "data: {...}" oder "event: eventName"
   */
  private processServerSentEvent(event: string, options: StreamingOptions): void {
    const eventLines = event.split('\n');
    let data = '';
    let eventType = '';
    
    for (const line of eventLines) {
      if (line.startsWith('data:')) {
        data = line.slice(5).trim();
      } else if (line.startsWith('event:')) {
        eventType = line.slice(6).trim();
      }
    }
    
    // Handle different event types
    if (eventType === 'done' || data === '[DONE]') {
      this.handleEndEvent(options);
      return;
    }
    
    // Process data
    if (data) {
      try {
        // Try to parse as JSON first
        const parsedData = JSON.parse(data);
        
        if (parsedData.content || parsedData.text || parsedData.message) {
          // Extract content from various possible formats
          const content = parsedData.content || parsedData.text || parsedData.message;
          options.onMessage?.(content);
        } else if (parsedData.error) {
          options.onError?.(new Error(parsedData.error));
        }
      } catch (error) {
        // If not JSON, handle as plain text
        if (data !== '[DONE]') {
          options.onMessage?.(data);
        }
      }
    }
  }

  /**
   * Behandelt das Ende des Streams
   */
  private handleEndEvent(options: StreamingOptions): void {
    this.state.completed = true;
    streamingStatus.value.active = false;
    options.onProgress?.(100);
    options.onComplete?.();
  }

  /**
   * Fallback für Streaming-Fehler: Verwendet regulären API-Endpunkt
   */
  private async startFallbackRequest(options: StreamingOptions): Promise<void> {
    console.log('[StreamingService] Verwende Nicht-Streaming-Fallback');
    streamingStatus.value.fallbackActive = true;
    options.onFallback?.();
    
    let token = this.getAuthToken();
    if (!token) {
      console.error('[StreamingService] Kein Token für Fallback-Anfrage');
      options.onError?.(new Error('Nicht authentifiziert'));
      return;
    }

    try {
      // Verwende POST statt GET für die Fallback-Anfrage
      const url = `/api/question`;
      
      options.onProgress?.(10);
      
      // Verbesserte Datenstruktur für die API
      const requestData: Record<string, any> = {
        question: options.question,
        simple_language: options.simpleLanguage || false
      };

      // Behandle die Session-ID speziell mit sessionIdAdapter
      if (options.sessionId) {
        const origSessionId = String(options.sessionId);
        
        // Versuche Konvertierung mit sessionIdAdapter
        if (isUuidFormat(origSessionId)) {
          const numericId = toNumericFormat(origSessionId);
          if (numericId !== origSessionId && /^\d+$/.test(numericId)) {
            // Konvertiere zur numerischen ID für das Backend
            requestData.session_id = parseInt(numericId, 10);
            console.log(`Fallback-Service: UUID ${origSessionId} konvertiert zu numerischer ID ${numericId}`);
            
            // Original UUID als Backup-Feld aufbewahren
            requestData.session_id_str = origSessionId;
            requestData.session_id_uuid = origSessionId;
          } else {
            // Keine Konvertierung gefunden, sende beide Formate
            console.log(`Fallback-Service: Keine Zuordnung für UUID ${origSessionId} gefunden, sende beide Formate`);
            
            // Als UUID senden und mehrere Felder für bessere Kompatibilität
            requestData.session_id = origSessionId;
            requestData.session_id_str = origSessionId;
            requestData.session_id_uuid = origSessionId;
            // Füge auch null als letzten Ausweg hinzu, damit das Backend eine neue Session erstellen kann
            requestData.create_if_not_exists = true;
          }
        } else if (/^\d+$/.test(origSessionId)) {
          // Wenn es eine Zahl ist, direkt als Zahl senden
          requestData.session_id = parseInt(origSessionId, 10);
        } else {
          // Fallback: Als String senden und mehrere Felder für bessere Kompatibilität
          requestData.session_id = origSessionId;
          requestData.session_id_str = origSessionId;
        }
      }
      
      console.log('[StreamingService] Fallback-Anfragedaten:', requestData);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });
      
      options.onProgress?.(50);
      
      if (!response.ok) {
        // Versuche Fehlerdetails aus der Antwort zu extrahieren
        let errorMessage = `Fallback HTTP Fehler: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.detail || errorData.error || errorData.message) {
            errorMessage += ` - ${errorData.detail || errorData.error || errorData.message}`;
          }
        } catch (e) {
          // Ignoriere Fehler beim Parsen der Fehlerantwort
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      options.onProgress?.(90);
      
      // Verbesserte Antwortverarbeitung
      if (data.answer) {
        // Direkte Antwort vom Server
        options.onMessage?.(data.answer);
      } else if (data.content || data.text || data.message) {
        // Andere mögliche Antwortformate
        const content = data.content || data.text || data.message;
        options.onMessage?.(content);
      } else if (data.error) {
        throw new Error(data.error);
      } else {
        // Fallback, falls keine bekannten Felder gefunden wurden
        options.onMessage?.(JSON.stringify(data));
      }
      
      options.onProgress?.(100);
      options.onComplete?.();
    } catch (error) {
      console.error('[StreamingService] Fallback-Anfrage fehlgeschlagen:', error);
      if (error instanceof Error) {
        options.onError?.(error);
      }
    } finally {
      streamingStatus.value.active = false;
    }
  }

  /**
   * Stoppt den aktuellen Stream
   */
  stopStream(): void {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
    
    streamingStatus.value = {
      active: false,
      error: null,
      reconnecting: false,
      fallbackActive: false,
      sessionId: null
    };
    
    this.state.completed = true;
  }

  /**
   * Hilfsmethode zur Fehlerdetails-Extraktion
   */
  private async getErrorDetail(response: Response): Promise<string> {
    try {
      const text = await response.text();
      try {
        const json = JSON.parse(text);
        return json.error || json.message || text;
      } catch {
        return text;
      }
    } catch {
      return 'Keine Fehlerdetails verfügbar';
    }
  }

  /**
   * Hilfsmethode zur Token-Beschaffung aus verschiedenen Quellen
   */
  private getAuthToken(): string | null {
    // 1. Versuche aus Pinia-Store
    try {
      const authStore = useAuthStore();
      if (authStore && authStore.token) {
        return authStore.token;
      }
    } catch (e) {
      console.warn('[StreamingService] Konnte Token nicht aus AuthStore laden:', e);
    }

    // 2. Versuche aus localStorage
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        return token;
      }
    } catch (e) {
      console.warn('[StreamingService] Konnte Token nicht aus localStorage laden:', e);
    }

    // 3. Versuche aus StorageService (falls vorhanden)
    try {
      // @ts-ignore - Falls StorageService global verfügbar ist
      if (window.StorageService && window.StorageService.get) {
        const token = window.StorageService.get('auth_token');
        if (token) {
          return token;
        }
      }
    } catch (e) {
      console.warn('[StreamingService] Konnte Token nicht aus StorageService laden:', e);
    }

    return null;
  }

  /**
   * Hilfsmethode zum Token-Refresh (muss je nach Auth-System angepasst werden)
   */
  private async refreshAuthToken(): Promise<boolean> {
    try {
      const authStore = useAuthStore();
      if (authStore && typeof authStore.refreshToken === 'function') {
        await authStore.refreshToken();
        return true;
      }
    } catch (e) {
      console.error('[StreamingService] Token-Refresh fehlgeschlagen:', e);
    }
    return false;
  }

  /**
   * Hilfsmethode zur Drosselung von Aufrufen
   */
  private throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => void {
    let lastFunc: number;
    let lastRan: number;
    return function(this: any, ...args: Parameters<T>) {
      if (!lastRan) {
        func.apply(this, args);
        lastRan = Date.now();
      } else {
        clearTimeout(lastFunc);
        lastFunc = window.setTimeout(() => {
          if (Date.now() - lastRan >= limit) {
            func.apply(this, args);
            lastRan = Date.now();
          }
        }, limit - (Date.now() - lastRan));
      }
    };
  }

  /**
   * Prüft, ob der Benutzer auf dem Login-Bildschirm ist
   * Verhindert unnötige Fehler und DOM-Manipulation auf Login-Seiten
   */
  isOnLoginScreen(): boolean {
    return (
      window.location.pathname.includes('/login') ||
      window.location.pathname.includes('/auth') ||
      document.querySelector('.login-container') !== null ||
      document.querySelector('.auth-form') !== null ||
      document.querySelector('[data-login-form]') !== null
    );
  }
}

// Singleton-Instanz
export const streamingService = new StreamingService();