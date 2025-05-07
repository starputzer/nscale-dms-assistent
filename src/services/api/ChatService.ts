/**
 * ChatService - Spezialisierter Service für Chat-Funktionalität
 * 
 * Diese Klasse bietet eine höhere Abstraktionsebene für Chat-Operationen
 * und nutzt den ApiService und StreamingService für die API-Kommunikation.
 */

import { apiService } from './ApiService';
import { StreamingService, createStreamingConnection } from './StreamingService';
import { apiConfig } from './config';
import { LogService } from '../log/LogService';

import {
  ChatSession,
  ChatMessage,
  SendMessageRequest,
  CreateSessionRequest,
  ApiResponse,
  StreamingEvent
} from '@/types/api';

/**
 * Optionen für eine Chat-Nachricht
 */
export interface ChatMessageOptions {
  /** Stream-Modus aktivieren */
  stream?: boolean;
  
  /** Fortschritts-Callback */
  onProgress?: (progress: number) => void;
  
  /** Streaming-Callback für einzelne Chunks */
  onChunk?: (chunk: string, metadata?: any) => void;
  
  /** Abschluss-Callback */
  onComplete?: (message: ChatMessage) => void;
  
  /** Fehler-Callback */
  onError?: (error: Error) => void;
  
  /** Automatisch neue Session erstellen, wenn keine ID angegeben */
  autoCreateSession?: boolean;
  
  /** Priorität der Anfrage */
  priority?: number;
  
  /** Zusätzlicher Kontext für die Anfrage */
  context?: Record<string, any>;
}

/**
 * Stream-Callback-Handler-Schnittstelle
 */
export interface StreamCallbacks {
  onChunk?: (chunk: string, metadata?: any) => void;
  onComplete?: (message: ChatMessage) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: number) => void;
}

/**
 * ChatService - Chat-Funktionalitätsservice
 */
export class ChatService {
  /** Logger-Instanz */
  private logService: LogService;
  
  /** Aktive Streaming-Verbindungen */
  private activeStreams: Map<string, StreamingService> = new Map();
  
  /**
   * Konstruktor
   */
  constructor() {
    this.logService = new LogService('ChatService');
    
    // Event-Listener für Stream-Abbruch
    if (typeof window !== 'undefined') {
      window.addEventListener('cancel-streaming', this.cancelAllStreams);
    }
  }
  
  /**
   * Bereinigung beim Zerstören des Services
   */
  public destroy(): void {
    this.cancelAllStreams();
    
    if (typeof window !== 'undefined') {
      window.removeEventListener('cancel-streaming', this.cancelAllStreams);
    }
  }
  
  /**
   * Bricht alle aktiven Streams ab
   */
  public cancelAllStreams = (): void => {
    for (const [sessionId, stream] of this.activeStreams.entries()) {
      this.logService.info(`Breche Stream für Session ${sessionId} ab`);
      stream.close();
    }
    
    this.activeStreams.clear();
  };
  
  /**
   * Bricht einen spezifischen Stream ab
   */
  public cancelStream(sessionId: string): void {
    const stream = this.activeStreams.get(sessionId);
    if (stream) {
      this.logService.info(`Breche Stream für Session ${sessionId} ab`);
      stream.close();
      this.activeStreams.delete(sessionId);
    }
  }
  
  /**
   * Lädt alle Sitzungen des Benutzers
   */
  public async getSessions(): Promise<ChatSession[]> {
    try {
      const response = await apiService.get<ChatSession[]>(
        apiConfig.ENDPOINTS.CHAT.SESSIONS
      );
      
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Fehler beim Laden der Sessions');
      }
      
      return response.data;
    } catch (error) {
      this.logService.error('Fehler beim Laden der Sessions', error);
      throw error;
    }
  }
  
  /**
   * Lädt eine spezifische Sitzung
   */
  public async getSession(sessionId: string): Promise<ChatSession> {
    try {
      const response = await apiService.get<ChatSession>(
        apiConfig.ENDPOINTS.CHAT.SESSION(sessionId)
      );
      
      if (!response.success || !response.data) {
        throw new Error(response.message || `Fehler beim Laden der Session ${sessionId}`);
      }
      
      return response.data;
    } catch (error) {
      this.logService.error(`Fehler beim Laden der Session ${sessionId}`, error);
      throw error;
    }
  }
  
  /**
   * Erstellt eine neue Chat-Sitzung
   */
  public async createSession(options: CreateSessionRequest = {}): Promise<ChatSession> {
    try {
      const response = await apiService.post<ChatSession>(
        apiConfig.ENDPOINTS.CHAT.SESSIONS,
        options,
        {
          priority: apiConfig.QUEUE.PRIORITIES.USER_ACTION
        }
      );
      
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Fehler beim Erstellen der Session');
      }
      
      return response.data;
    } catch (error) {
      this.logService.error('Fehler beim Erstellen einer Session', error);
      throw error;
    }
  }
  
  /**
   * Aktualisiert den Titel einer Sitzung
   */
  public async updateSessionTitle(sessionId: string, title: string): Promise<ChatSession> {
    try {
      const response = await apiService.patch<ChatSession>(
        apiConfig.ENDPOINTS.CHAT.SESSION(sessionId),
        { title }
      );
      
      if (!response.success || !response.data) {
        throw new Error(response.message || `Fehler beim Aktualisieren des Titels für Session ${sessionId}`);
      }
      
      return response.data;
    } catch (error) {
      this.logService.error(`Fehler beim Aktualisieren des Titels für Session ${sessionId}`, error);
      throw error;
    }
  }
  
  /**
   * Löscht eine Sitzung
   */
  public async deleteSession(sessionId: string): Promise<ApiResponse<void>> {
    try {
      // Aktiven Stream abbrechen, falls vorhanden
      this.cancelStream(sessionId);
      
      const response = await apiService.delete(
        apiConfig.ENDPOINTS.CHAT.SESSION(sessionId)
      );
      
      if (!response.success) {
        throw new Error(response.message || `Fehler beim Löschen der Session ${sessionId}`);
      }
      
      return response;
    } catch (error) {
      this.logService.error(`Fehler beim Löschen der Session ${sessionId}`, error);
      throw error;
    }
  }
  
  /**
   * Lädt die Nachrichten einer Sitzung
   */
  public async getMessages(sessionId: string): Promise<ChatMessage[]> {
    try {
      const response = await apiService.get<ChatMessage[]>(
        apiConfig.ENDPOINTS.CHAT.MESSAGES(sessionId)
      );
      
      if (!response.success || !response.data) {
        throw new Error(response.message || `Fehler beim Laden der Nachrichten für Session ${sessionId}`);
      }
      
      return response.data;
    } catch (error) {
      this.logService.error(`Fehler beim Laden der Nachrichten für Session ${sessionId}`, error);
      throw error;
    }
  }
  
  /**
   * Sendet eine Chat-Nachricht
   */
  public async sendMessage(
    sessionId: string | null,
    content: string,
    options: ChatMessageOptions = {}
  ): Promise<ChatMessage> {
    try {
      // Wenn keine Session-ID angegeben ist und autoCreateSession aktiviert ist,
      // erstelle eine neue Session
      if (!sessionId && options.autoCreateSession) {
        const newSession = await this.createSession({
          title: content.length > 30 ? content.substring(0, 30) + '...' : content
        });
        sessionId = newSession.id;
      }
      
      if (!sessionId) {
        throw new Error('Keine Session-ID angegeben');
      }
      
      // Request-Parameter
      const request: SendMessageRequest = {
        content,
        stream: options.stream !== false,
        context: options.context
      };
      
      // Wenn Streaming aktiviert ist
      if (request.stream) {
        return this.sendStreamingMessage(sessionId, content, {
          onChunk: options.onChunk,
          onComplete: options.onComplete,
          onError: options.onError,
          onProgress: options.onProgress
        });
      }
      
      // Normale, nicht-streamende Anfrage
      const response = await apiService.post<ChatMessage>(
        apiConfig.ENDPOINTS.CHAT.MESSAGES(sessionId),
        request,
        {
          priority: options.priority || apiConfig.QUEUE.PRIORITIES.USER_ACTION
        }
      );
      
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Fehler beim Senden der Nachricht');
      }
      
      if (options.onComplete) {
        options.onComplete(response.data);
      }
      
      return response.data;
    } catch (error) {
      this.logService.error('Fehler beim Senden einer Nachricht', error);
      
      if (options.onError) {
        options.onError(error as Error);
      }
      
      throw error;
    }
  }
  
  /**
   * Sendet eine streamende Chat-Nachricht
   */
  private async sendStreamingMessage(
    sessionId: string,
    content: string,
    callbacks: StreamCallbacks
  ): Promise<ChatMessage> {
    return new Promise((resolve, reject) => {
      try {
        // URL für Streaming-Endpunkt
        const streamUrl = apiConfig.ENDPOINTS.CHAT.STREAM(sessionId);
        
        // Params für Stream
        const params: Record<string, string> = {
          message: content
        };
        
        // Vollständige Antwort
        let fullResponse = '';
        let responseMetadata: any = {};
        let responseMessage: ChatMessage | null = null;
        
        // Stream erstellen
        const stream = createStreamingConnection({
          url: streamUrl,
          params,
          onMessage: (event: StreamingEvent) => {
            // Content-Events verarbeiten
            if (event.type === 'content' && event.content) {
              fullResponse += event.content;
              
              if (callbacks.onChunk) {
                callbacks.onChunk(event.content, responseMetadata);
              }
            }
            
            // Metadata-Events verarbeiten
            if (event.type === 'metadata' && event.metadata) {
              responseMetadata = { ...responseMetadata, ...event.metadata };
              
              if (callbacks.onChunk) {
                callbacks.onChunk('', responseMetadata);
              }
            }
            
            // Progress-Events verarbeiten
            if (event.type === 'progress' && event.progress !== undefined) {
              if (callbacks.onProgress) {
                callbacks.onProgress(event.progress);
              }
            }
            
            // End-Events verarbeiten
            if (event.type === 'end' && event.message) {
              responseMessage = event.message;
            }
          },
          onComplete: (finalResponse: any) => {
            // Stream aus aktiven Streams entfernen
            this.activeStreams.delete(sessionId);
            
            // Endgültige Nachricht erstellen
            const message: ChatMessage = responseMessage || {
              id: finalResponse.messageId || '',
              sessionId,
              content: fullResponse,
              role: 'assistant',
              timestamp: new Date().toISOString(),
              metadata: responseMetadata
            };
            
            if (callbacks.onComplete) {
              callbacks.onComplete(message);
            }
            
            // Promise erfüllen
            resolve(message);
          },
          onError: (error: Error) => {
            // Stream aus aktiven Streams entfernen
            this.activeStreams.delete(sessionId);
            
            this.logService.error('Streaming-Fehler', error);
            
            if (callbacks.onError) {
              callbacks.onError(error);
            }
            
            // Fehler weiterleiten
            reject(error);
          },
          onProgress: callbacks.onProgress
        });
        
        // Stream in aktive Streams einfügen
        this.activeStreams.set(sessionId, stream);
        
      } catch (error) {
        this.logService.error('Fehler beim Einrichten des Streaming', error);
        
        if (callbacks.onError) {
          callbacks.onError(error as Error);
        }
        
        reject(error);
      }
    });
  }
  
  /**
   * Gibt an, ob eine Sitzung aktiv streamt
   */
  public isStreaming(sessionId: string): boolean {
    return this.activeStreams.has(sessionId);
  }
}

// Singleton-Instanz
export const chatService = new ChatService();

export default chatService;