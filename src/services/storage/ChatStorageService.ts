/**
 * ChatStorageService
 * 
 * Dedizierter Service zur optimierten Speicherung und Verwaltung von Chat-Daten
 * - Effiziente Persistenz-Strategien für große Datensätze
 * - Automatische Datenpartitionierung
 * - Speicherverwaltung mit intelligenten Caching-Strategien
 * - LRU (Least Recently Used) Verdrängungsmechanismus
 */

import type { ChatMessage, ChatSession } from '@/types/session';

// Interface für Speicher-Metadaten
interface StorageMetadata {
  version: number;
  chunks: number;
  totalCount: number;
  lastUpdated: string;
  expiresAt?: string;
}

// LRU-Cache-Knoten für Session-Metadaten
interface LRUCacheNode {
  sessionId: string;
  lastAccessed: number;
  messageCount: number;
  prev: LRUCacheNode | null;
  next: LRUCacheNode | null;
}

export class ChatStorageService {
  // Speicherlimits und Konfiguration
  private static readonly MAX_LOCAL_STORAGE_SIZE = 4.5 * 1024 * 1024; // 4.5MB für localStorage
  private static readonly MESSAGE_LIMIT_PER_SESSION = 50; // Nachrichtenlimit pro Session im Hauptspeicher
  private static readonly CHUNK_SIZE = 20; // Optimale Chunk-Größe für Nachrichten
  private static readonly STORAGE_PREFIX = 'chat_storage_v3_'; // Präfix für Storage-Keys
  private static readonly META_SUFFIX = '_meta'; // Suffix für Metadaten-Keys
  private static readonly CHUNK_SUFFIX = '_chunk_'; // Suffix für Chunk-Keys
  
  // LRU-Cache für Session-Verwaltung
  private lruHead: LRUCacheNode | null = null;
  private lruTail: LRUCacheNode | null = null;
  private lruMap: Map<string, LRUCacheNode> = new Map();
  private totalStoredSize: number = 0;
  
  // Singleton-Instanz
  private static instance: ChatStorageService;
  
  /**
   * Singleton-Getter
   */
  public static getInstance(): ChatStorageService {
    if (!ChatStorageService.instance) {
      ChatStorageService.instance = new ChatStorageService();
    }
    return ChatStorageService.instance;
  }
  
  /**
   * Konstruktor
   */
  private constructor() {
    // Initialisiere den Storage-Service
    this.initializeStorageInfo();
  }
  
  /**
   * Initialisiert Speicherinformationen
   * - Lädt Metadaten für alle gespeicherten Sessions
   * - Baut den LRU-Cache auf
   */
  private initializeStorageInfo(): void {
    // Alle Storage-Keys durchgehen und Metadaten laden
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      if (key && key.startsWith(ChatStorageService.STORAGE_PREFIX) && key.endsWith(ChatStorageService.META_SUFFIX)) {
        try {
          // Session-ID aus dem Key extrahieren
          const sessionId = key.substring(
            ChatStorageService.STORAGE_PREFIX.length,
            key.length - ChatStorageService.META_SUFFIX.length
          );
          
          // Metadaten laden
          const metaJson = localStorage.getItem(key);
          if (metaJson) {
            const meta = JSON.parse(metaJson) as StorageMetadata;
            
            // Zum LRU-Cache hinzufügen
            this.addToLRUCache(sessionId, meta.totalCount);
            
            // Größe zum Gesamtspeicher hinzufügen
            this.totalStoredSize += metaJson.length;
            
            // Chunks-Größe hinzufügen
            for (let j = 0; j < meta.chunks; j++) {
              const chunkKey = this.getChunkKey(sessionId, j);
              const chunkJson = localStorage.getItem(chunkKey);
              if (chunkJson) {
                this.totalStoredSize += chunkJson.length;
              }
            }
          }
        } catch (error) {
          console.error('Error initializing storage info:', error);
        }
      }
    }
    
    console.log(`Chat storage initialized. Using ${this.formatBytes(this.totalStoredSize)} of ${this.formatBytes(ChatStorageService.MAX_LOCAL_STORAGE_SIZE)}`);
  }
  
  /**
   * Fügt eine Session zum LRU-Cache hinzu oder aktualisiert sie
   */
  private addToLRUCache(sessionId: string, messageCount: number): void {
    // Prüfen, ob die Session bereits im Cache ist
    if (this.lruMap.has(sessionId)) {
      // Vorhandene Node aktualisieren und nach vorne bewegen
      const node = this.lruMap.get(sessionId)!;
      node.lastAccessed = Date.now();
      node.messageCount = messageCount;
      
      this.moveToHead(node);
    } else {
      // Neue Node erstellen
      const newNode: LRUCacheNode = {
        sessionId,
        lastAccessed: Date.now(),
        messageCount,
        prev: null,
        next: null
      };
      
      // In den Cache einfügen
      this.lruMap.set(sessionId, newNode);
      
      // Wenn der Cache leer ist, als Kopf und Ende setzen
      if (!this.lruHead) {
        this.lruHead = newNode;
        this.lruTail = newNode;
      } else {
        // Ansonsten an den Anfang der Liste setzen
        newNode.next = this.lruHead;
        this.lruHead.prev = newNode;
        this.lruHead = newNode;
      }
    }
  }
  
  /**
   * Bewegt eine Node an den Anfang des LRU-Cache
   */
  private moveToHead(node: LRUCacheNode): void {
    if (node === this.lruHead) {
      return; // Bereits am Anfang
    }
    
    // Aus der aktuellen Position entfernen
    if (node.prev) {
      node.prev.next = node.next;
    }
    
    if (node.next) {
      node.next.prev = node.prev;
    }
    
    // Falls es sich um das Ende handelt, das Ende aktualisieren
    if (node === this.lruTail) {
      this.lruTail = node.prev;
    }
    
    // An den Anfang setzen
    node.next = this.lruHead;
    node.prev = null;
    
    if (this.lruHead) {
      this.lruHead.prev = node;
    }
    
    this.lruHead = node;
    
    // Falls kein Ende gesetzt ist, diesen Knoten als Ende setzen
    if (!this.lruTail) {
      this.lruTail = node;
    }
  }
  
  /**
   * Entfernt die am längsten nicht verwendete Session aus dem Cache
   * und gibt ihren Schlüssel zurück
   */
  private removeLRUSession(): string | null {
    if (!this.lruTail) {
      return null; // Cache ist leer
    }
    
    const sessionId = this.lruTail.sessionId;
    
    // Entferne die Node aus der Verketteten Liste
    if (this.lruTail.prev) {
      this.lruTail.prev.next = null;
      this.lruTail = this.lruTail.prev;
    } else {
      // Dies war die einzige Node
      this.lruHead = null;
      this.lruTail = null;
    }
    
    // Aus der Map entfernen
    this.lruMap.delete(sessionId);
    
    return sessionId;
  }
  
  /**
   * Gibt den Metadaten-Key für eine Session zurück
   */
  private getMetaKey(sessionId: string): string {
    return `${ChatStorageService.STORAGE_PREFIX}${sessionId}${ChatStorageService.META_SUFFIX}`;
  }
  
  /**
   * Gibt den Chunk-Key für eine Session und Chunk-Index zurück
   */
  private getChunkKey(sessionId: string, chunkIndex: number): string {
    return `${ChatStorageService.STORAGE_PREFIX}${sessionId}${ChatStorageService.CHUNK_SUFFIX}${chunkIndex}`;
  }
  
  /**
   * Formatiert Bytes in eine lesbare Größe
   */
  private formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
  
  /**
   * Speichert Nachrichten für eine Session
   * 
   * Setzt einen intelligenten Chunking-Mechanismus ein, um große Datensätze
   * effizient zu verwalten und speichert nur die älteren Nachrichten,
   * während die neuesten im Hauptspeicher bleiben.
   */
  public storeSessionMessages(
    sessionId: string,
    messages: ChatMessage[],
    keepLatest: boolean = true
  ): void {
    if (!sessionId || !messages || messages.length === 0) {
      return;
    }
    
    try {
      // Aktualisiere den LRU-Cache
      this.addToLRUCache(sessionId, messages.length);
      
      // Wenn keepLatest aktiviert ist, behalten wir nur die älteren Nachrichten
      // Die neuesten MESSAGE_LIMIT_PER_SESSION Nachrichten bleiben im Hauptspeicher
      const messagesToStore = keepLatest
        ? messages.slice(0, Math.max(0, messages.length - ChatStorageService.MESSAGE_LIMIT_PER_SESSION))
        : messages;
      
      if (messagesToStore.length === 0) {
        return; // Keine Nachrichten zum Speichern
      }
      
      // Nachrichten in Chunks aufteilen
      const chunks: ChatMessage[][] = [];
      
      for (let i = 0; i < messagesToStore.length; i += ChatStorageService.CHUNK_SIZE) {
        chunks.push(messagesToStore.slice(i, i + ChatStorageService.CHUNK_SIZE));
      }
      
      // Metadaten erstellen
      const metadata: StorageMetadata = {
        version: 3,
        chunks: chunks.length,
        totalCount: messagesToStore.length,
        lastUpdated: new Date().toISOString()
      };
      
      // Speicherplatz prüfen und bei Bedarf alte Daten entfernen
      const metaJson = JSON.stringify(metadata);
      
      // Geschätzte Größe für alle Chunks
      const totalChunksJson = chunks.map(chunk => JSON.stringify(chunk)).join('');
      const estimatedSize = metaJson.length + totalChunksJson.length;
      
      // Wenn nicht genug Speicherplatz vorhanden ist, alte Sessions entfernen
      while (this.totalStoredSize + estimatedSize > ChatStorageService.MAX_LOCAL_STORAGE_SIZE) {
        const oldestSessionId = this.removeLRUSession();
        
        if (!oldestSessionId) {
          break; // Keine weiteren Sessions zum Entfernen
        }
        
        // Falls wir die aktuelle Session entfernen würden, abbrechen
        if (oldestSessionId === sessionId) {
          continue;
        }
        
        // Alte Session aus dem Speicher entfernen
        this.clearSessionStorage(oldestSessionId);
      }
      
      // Metadaten speichern
      localStorage.setItem(this.getMetaKey(sessionId), metaJson);
      this.totalStoredSize += metaJson.length;
      
      // Chunks speichern
      for (let i = 0; i < chunks.length; i++) {
        const chunkJson = JSON.stringify(chunks[i]);
        localStorage.setItem(this.getChunkKey(sessionId, i), chunkJson);
        this.totalStoredSize += chunkJson.length;
      }
      
    } catch (error) {
      console.error(`Error storing messages for session ${sessionId}:`, error);
    }
  }
  
  /**
   * Lädt Nachrichten für eine Session
   * 
   * Verwendet einen effizienten Lazy-Loading-Ansatz und lädt nur
   * die Nachrichten, die tatsächlich benötigt werden.
   */
  public loadSessionMessages(sessionId: string): ChatMessage[] {
    if (!sessionId) {
      return [];
    }
    
    try {
      // Cache aktualisieren
      if (this.lruMap.has(sessionId)) {
        this.moveToHead(this.lruMap.get(sessionId)!);
      }
      
      // Metadaten abrufen
      const metaKey = this.getMetaKey(sessionId);
      const metaJson = localStorage.getItem(metaKey);
      
      if (!metaJson) {
        return []; // Keine Daten gefunden
      }
      
      const metadata = JSON.parse(metaJson) as StorageMetadata;
      
      // Alle Chunks laden
      let allMessages: ChatMessage[] = [];
      
      for (let i = 0; i < metadata.chunks; i++) {
        const chunkKey = this.getChunkKey(sessionId, i);
        const chunkJson = localStorage.getItem(chunkKey);
        
        if (chunkJson) {
          const chunk = JSON.parse(chunkJson) as ChatMessage[];
          allMessages = [...allMessages, ...chunk];
        }
      }
      
      // Nach Zeitstempel sortieren
      allMessages.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      return allMessages;
    } catch (error) {
      console.error(`Error loading messages for session ${sessionId}:`, error);
      return [];
    }
  }
  
  /**
   * Entfernt alle gespeicherten Daten für eine Session
   */
  public clearSessionStorage(sessionId: string): void {
    if (!sessionId) {
      return;
    }
    
    try {
      // Metadaten abrufen, um zu wissen, wie viele Chunks zu löschen sind
      const metaKey = this.getMetaKey(sessionId);
      const metaJson = localStorage.getItem(metaKey);
      
      if (metaJson) {
        // Speichergröße reduzieren
        this.totalStoredSize -= metaJson.length;
        
        const metadata = JSON.parse(metaJson) as StorageMetadata;
        
        // Alle Chunks löschen
        for (let i = 0; i < metadata.chunks; i++) {
          const chunkKey = this.getChunkKey(sessionId, i);
          const chunkJson = localStorage.getItem(chunkKey);
          
          if (chunkJson) {
            this.totalStoredSize -= chunkJson.length;
            localStorage.removeItem(chunkKey);
          }
        }
        
        // Metadaten löschen
        localStorage.removeItem(metaKey);
      }
      
      // Aus dem LRU-Cache entfernen
      if (this.lruMap.has(sessionId)) {
        const node = this.lruMap.get(sessionId)!;
        
        // Aus der verketteten Liste entfernen
        if (node.prev) {
          node.prev.next = node.next;
        } else {
          this.lruHead = node.next;
        }
        
        if (node.next) {
          node.next.prev = node.prev;
        } else {
          this.lruTail = node.prev;
        }
        
        // Aus der Map entfernen
        this.lruMap.delete(sessionId);
      }
      
    } catch (error) {
      console.error(`Error clearing storage for session ${sessionId}:`, error);
    }
  }
  
  /**
   * Aktualisiert oder fügt Metadaten für eine Session hinzu
   */
  public updateSessionMetadata(sessionId: string, updates: Partial<StorageMetadata>): boolean {
    if (!sessionId) {
      return false;
    }
    
    try {
      const metaKey = this.getMetaKey(sessionId);
      const metaJson = localStorage.getItem(metaKey);
      
      let metadata: StorageMetadata;
      
      if (metaJson) {
        metadata = {
          ...JSON.parse(metaJson) as StorageMetadata,
          ...updates,
          lastUpdated: new Date().toISOString()
        };
      } else {
        metadata = {
          version: 3,
          chunks: 0,
          totalCount: 0,
          ...updates,
          lastUpdated: new Date().toISOString()
        };
      }
      
      const newMetaJson = JSON.stringify(metadata);
      
      // Speichergröße aktualisieren
      if (metaJson) {
        this.totalStoredSize -= metaJson.length;
      }
      this.totalStoredSize += newMetaJson.length;
      
      localStorage.setItem(metaKey, newMetaJson);
      
      return true;
    } catch (error) {
      console.error(`Error updating metadata for session ${sessionId}:`, error);
      return false;
    }
  }
  
  /**
   * Prüft, ob eine Session im Speicher vorhanden ist
   */
  public hasStoredSession(sessionId: string): boolean {
    return localStorage.getItem(this.getMetaKey(sessionId)) !== null;
  }
  
  /**
   * Gibt Metadaten für eine Session zurück
   */
  public getSessionMetadata(sessionId: string): StorageMetadata | null {
    try {
      const metaKey = this.getMetaKey(sessionId);
      const metaJson = localStorage.getItem(metaKey);
      
      if (metaJson) {
        return JSON.parse(metaJson) as StorageMetadata;
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting metadata for session ${sessionId}:`, error);
      return null;
    }
  }
  
  /**
   * Optimiert den Speicher für eine Session
   * 
   * Dies kann verwendet werden, um Fragmente zu konsolidieren oder Speicheroptimierungen durchzuführen.
   */
  public optimizeSessionStorage(sessionId: string): boolean {
    if (!sessionId) {
      return false;
    }
    
    try {
      // Zunächst alle vorhandenen Nachrichten laden
      const messages = this.loadSessionMessages(sessionId);
      
      if (messages.length === 0) {
        return false; // Keine Nachrichten zum Optimieren
      }
      
      // Vorhandene Speicherdaten löschen
      this.clearSessionStorage(sessionId);
      
      // Neu speichern mit optimaler Chunking-Strategie
      this.storeSessionMessages(sessionId, messages, false);
      
      return true;
    } catch (error) {
      console.error(`Error optimizing storage for session ${sessionId}:`, error);
      return false;
    }
  }
  
  /**
   * Gibt Statistiken über den aktuellen Speicherzustand zurück
   */
  public getStorageStats(): {
    totalSize: number;
    maxSize: number;
    usedPercentage: number;
    sessionCount: number;
    totalMessages: number;
  } {
    let totalMessages = 0;
    
    // Alle Sessions im LRU-Cache durchgehen
    this.lruMap.forEach(node => {
      totalMessages += node.messageCount;
    });
    
    return {
      totalSize: this.totalStoredSize,
      maxSize: ChatStorageService.MAX_LOCAL_STORAGE_SIZE,
      usedPercentage: (this.totalStoredSize / ChatStorageService.MAX_LOCAL_STORAGE_SIZE) * 100,
      sessionCount: this.lruMap.size,
      totalMessages
    };
  }
  
  /**
   * Räumt alle Sessions auf, die älter als die angegebene Anzahl von Tagen sind
   */
  public cleanupOldSessions(olderThanDays: number = 30): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    const sessionsToRemove: string[] = [];
    
    // Alle Meta-Keys durchgehen
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      if (key && key.startsWith(ChatStorageService.STORAGE_PREFIX) && key.endsWith(ChatStorageService.META_SUFFIX)) {
        try {
          const metaJson = localStorage.getItem(key);
          
          if (metaJson) {
            const meta = JSON.parse(metaJson) as StorageMetadata;
            const lastUpdated = new Date(meta.lastUpdated);
            
            if (lastUpdated < cutoffDate) {
              // Session-ID aus dem Key extrahieren
              const sessionId = key.substring(
                ChatStorageService.STORAGE_PREFIX.length,
                key.length - ChatStorageService.META_SUFFIX.length
              );
              
              sessionsToRemove.push(sessionId);
            }
          }
        } catch (error) {
          console.error('Error checking session age:', error);
        }
      }
    }
    
    // Alte Sessions entfernen
    for (const sessionId of sessionsToRemove) {
      this.clearSessionStorage(sessionId);
    }
    
    return sessionsToRemove.length;
  }
}

// Singleton-Instanz exportieren
export const chatStorageService = ChatStorageService.getInstance();

export default chatStorageService;