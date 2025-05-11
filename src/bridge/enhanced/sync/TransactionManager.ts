/**
 * TransactionManager.ts
 * 
 * Implementiert ein robustes transaktionsbasiertes System für konsistente 
 * Zustandsänderungen im Bridge-System. Ermöglicht atomare Updates für
 * zusammengehörige Änderungen und Rollback-Mechanismen für fehlgeschlagene
 * Updates.
 */

import { logger } from '../logger';
import { debounce } from 'lodash-es';

// Eindeutige Transaktions-ID generieren
let nextTransactionId = 1;
const generateTransactionId = (): string => {
  return `tx-${Date.now()}-${nextTransactionId++}`;
};

// Snapshot eines Zustandsteils
export interface StateSnapshot {
  path: string[];
  value: any;
  timestamp: number;
}

// Definiert mögliche Transaktionsstatus
export enum TransactionStatus {
  PENDING = 'pending',
  COMMITTED = 'committed',
  ROLLED_BACK = 'rolled_back',
  FAILED = 'failed'
}

// Struktur für eine Transaktion
export interface Transaction {
  id: string;
  name: string;
  status: TransactionStatus;
  snapshots: StateSnapshot[];
  changesPending: boolean;
  startTime: number;
  endTime?: number;
  source: 'vue' | 'legacy' | 'system';
  metadata?: Record<string, any>;
  parentTransactionId?: string;
}

// Optionen beim Erstellen einer Transaktion
export interface TransactionOptions {
  name?: string;
  source?: 'vue' | 'legacy' | 'system';
  metadata?: Record<string, any>;
  autoCommit?: boolean;
  autoCommitDelay?: number;
  parentTransactionId?: string;
}

/**
 * Der TransactionManager verwaltet atomare Updates im Bridge-System.
 * Er ermöglicht das Gruppieren mehrerer Zustandsänderungen in einer Transaktion,
 * um konsistente Updates zu gewährleisten und Rollbacks bei Fehlern zu ermöglichen.
 */
export class TransactionManager {
  // Aktive Transaktionen und ihre Snapshots
  private transactions: Map<string, Transaction> = new Map();
  
  // Transaktionen nach Zustand gruppiert (für schnellen Lookup)
  private stateTransactions: Map<string, Set<string>> = new Map();
  
  // Verschachtelte Transaktionen
  private childTransactions: Map<string, Set<string>> = new Map();
  
  // Debounced Commit-Funktionen
  private debouncedCommits: Map<string, Function> = new Map();
  
  // Änderungsverfolgungs-Callbacks
  private changeListeners: Set<(transactionId: string, status: TransactionStatus) => void> = new Set();
  
  // Default-Optionen
  private defaultOptions: Omit<TransactionOptions, 'parentTransactionId'> = {
    name: 'Unnamed Transaction',
    source: 'system',
    autoCommit: true,
    autoCommitDelay: 100
  };
  
  /**
   * Erstellt eine neue Transaktion
   * @param options Optionen für die Transaktion
   * @returns Die ID der erstellten Transaktion
   */
  public beginTransaction(options?: TransactionOptions): string {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const transactionId = generateTransactionId();
    
    // Transaktion erstellen
    const transaction: Transaction = {
      id: transactionId,
      name: mergedOptions.name || 'Unnamed Transaction',
      status: TransactionStatus.PENDING,
      snapshots: [],
      changesPending: false,
      startTime: Date.now(),
      source: mergedOptions.source || 'system',
      metadata: mergedOptions.metadata,
      parentTransactionId: mergedOptions.parentTransactionId
    };
    
    // Transaktion speichern
    this.transactions.set(transactionId, transaction);
    
    // Kind-Transaktion zum Elternteil hinzufügen, falls angegeben
    if (mergedOptions.parentTransactionId) {
      if (!this.childTransactions.has(mergedOptions.parentTransactionId)) {
        this.childTransactions.set(mergedOptions.parentTransactionId, new Set());
      }
      this.childTransactions.get(mergedOptions.parentTransactionId)!.add(transactionId);
    }
    
    logger.debug(`Transaction started: ${transaction.name} [${transactionId}]`);
    
    // Auto-Commit einrichten falls gewünscht
    if (mergedOptions.autoCommit) {
      const delay = mergedOptions.autoCommitDelay || 100;
      
      const debouncedCommit = debounce(() => {
        // Nur auto-commit, wenn die Transaktion noch aktiv ist und Änderungen hat
        const tx = this.transactions.get(transactionId);
        if (tx && tx.status === TransactionStatus.PENDING && tx.changesPending) {
          this.commitTransaction(transactionId);
        }
      }, delay);
      
      this.debouncedCommits.set(transactionId, debouncedCommit);
    }
    
    return transactionId;
  }
  
  /**
   * Erstellt einen Snapshot eines Zustandswertes vor dem Ändern
   * @param transactionId Die Transaktions-ID
   * @param path Pfad zum Zustandsteil
   * @param currentValue Der aktuelle Wert
   */
  public captureSnapshot(transactionId: string, path: string[], currentValue: any): void {
    // Transaktion prüfen
    const transaction = this.transactions.get(transactionId);
    if (!transaction || transaction.status !== TransactionStatus.PENDING) {
      logger.warn(`Cannot capture snapshot: Invalid transaction ${transactionId}`);
      return;
    }
    
    // Snapshot erstellen (Tiefe Kopie des aktuellen Wertes)
    const snapshot: StateSnapshot = {
      path: [...path],
      value: this.deepClone(currentValue),
      timestamp: Date.now()
    };
    
    // Snapshot zur Transaktion hinzufügen
    transaction.snapshots.push(snapshot);
    transaction.changesPending = true;
    
    // Zustandspfad mit Transaktion verknüpfen
    const statePath = this.pathToString(path);
    if (!this.stateTransactions.has(statePath)) {
      this.stateTransactions.set(statePath, new Set());
    }
    this.stateTransactions.get(statePath)!.add(transactionId);
    
    // Auto-Commit auslösen, falls aktiviert
    if (this.debouncedCommits.has(transactionId)) {
      this.debouncedCommits.get(transactionId)!();
    }
  }
  
  /**
   * Überprüft, ob ein Pfad aktuell in einer aktiven Transaktion bearbeitet wird
   * @param path Pfad zum Zustandsteil
   * @param excludeTransactionIds Array von Transaktions-IDs, die ignoriert werden sollen
   * @returns true, wenn der Pfad in einer aktiven Transaktion ist
   */
  public isPathInActiveTransaction(path: string[], excludeTransactionIds: string[] = []): boolean {
    const statePath = this.pathToString(path);
    
    if (!this.stateTransactions.has(statePath)) {
      return false;
    }
    
    const transactions = this.stateTransactions.get(statePath)!;
    
    // Prüfen, ob eine aktive Transaktion für diesen Pfad existiert
    for (const txId of transactions) {
      // Transaktion ausschließen, falls in excludeTransactionIds
      if (excludeTransactionIds.includes(txId)) {
        continue;
      }
      
      const tx = this.transactions.get(txId);
      if (tx && tx.status === TransactionStatus.PENDING) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Überprüft, ob eine bestimmte Transaktion existiert und aktiv ist
   * @param transactionId Die Transaktions-ID
   * @returns true, wenn die Transaktion aktiv ist
   */
  public isTransactionActive(transactionId: string): boolean {
    const transaction = this.transactions.get(transactionId);
    return !!transaction && transaction.status === TransactionStatus.PENDING;
  }
  
  /**
   * Speichert die Änderungen einer Transaktion dauerhaft
   * @param transactionId Die Transaktions-ID
   */
  public commitTransaction(transactionId: string): void {
    // Transaktion prüfen
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      logger.warn(`Cannot commit: Transaction ${transactionId} not found`);
      return;
    }
    
    if (transaction.status !== TransactionStatus.PENDING) {
      logger.warn(`Cannot commit: Transaction ${transactionId} is not pending (${transaction.status})`);
      return;
    }
    
    // Commit nur durchführen, wenn es tatsächlich Änderungen gab
    if (!transaction.changesPending) {
      logger.debug(`Skipping commit for empty transaction: ${transaction.name} [${transactionId}]`);
      transaction.status = TransactionStatus.COMMITTED;
      transaction.endTime = Date.now();
      this.notifyChangeListeners(transactionId, TransactionStatus.COMMITTED);
      return;
    }
    
    try {
      // Debounced Commit-Funktion entfernen
      if (this.debouncedCommits.has(transactionId)) {
        this.debouncedCommits.delete(transactionId);
      }
      
      // Zuerst alle Kind-Transaktionen committen
      if (this.childTransactions.has(transactionId)) {
        for (const childId of this.childTransactions.get(transactionId)!) {
          this.commitTransaction(childId);
        }
      }
      
      // Transaktion abschließen
      transaction.status = TransactionStatus.COMMITTED;
      transaction.endTime = Date.now();
      
      // Verknüpfungen zu Zustandspfaden entfernen
      for (const snapshot of transaction.snapshots) {
        const statePath = this.pathToString(snapshot.path);
        if (this.stateTransactions.has(statePath)) {
          this.stateTransactions.get(statePath)!.delete(transactionId);
          
          // Leere Sets entfernen
          if (this.stateTransactions.get(statePath)!.size === 0) {
            this.stateTransactions.delete(statePath);
          }
        }
      }
      
      logger.debug(`Transaction committed: ${transaction.name} [${transactionId}] with ${transaction.snapshots.length} changes`);
      
      // Change-Listener informieren
      this.notifyChangeListeners(transactionId, TransactionStatus.COMMITTED);
    } catch (error) {
      // Bei Fehlern Transaktion als fehlgeschlagen markieren
      transaction.status = TransactionStatus.FAILED;
      transaction.endTime = Date.now();
      
      logger.error(`Error committing transaction ${transaction.name} [${transactionId}]:`, error);
      
      // Change-Listener informieren
      this.notifyChangeListeners(transactionId, TransactionStatus.FAILED);
    }
  }
  
  /**
   * Macht alle Änderungen einer Transaktion rückgängig
   * @param transactionId Die Transaktions-ID
   * @returns Objekt mit den ursprünglichen Werten, die wiederhergestellt werden sollten
   */
  public rollbackTransaction(transactionId: string): Record<string, any> {
    // Transaktion prüfen
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      logger.warn(`Cannot rollback: Transaction ${transactionId} not found`);
      return {};
    }
    
    if (transaction.status !== TransactionStatus.PENDING && transaction.status !== TransactionStatus.FAILED) {
      logger.warn(`Cannot rollback: Transaction ${transactionId} is not pending or failed (${transaction.status})`);
      return {};
    }
    
    try {
      // Debounced Commit-Funktion entfernen
      if (this.debouncedCommits.has(transactionId)) {
        this.debouncedCommits.delete(transactionId);
      }
      
      // Zuerst alle Kind-Transaktionen zurückrollen
      if (this.childTransactions.has(transactionId)) {
        for (const childId of this.childTransactions.get(transactionId)!) {
          this.rollbackTransaction(childId);
        }
      }
      
      // Ursprungswerte für Rollback sammeln
      const rollbackValues: Record<string, any> = {};
      
      // Transaktion zurückrollen (in umgekehrter Reihenfolge der Snapshots)
      for (let i = transaction.snapshots.length - 1; i >= 0; i--) {
        const snapshot = transaction.snapshots[i];
        const pathStr = this.pathToString(snapshot.path);
        
        // Nur den ältesten Snapshot für jeden Pfad verwenden
        if (!rollbackValues.hasOwnProperty(pathStr)) {
          rollbackValues[pathStr] = {
            path: snapshot.path,
            value: snapshot.value
          };
        }
      }
      
      // Transaktion als zurückgerollt markieren
      transaction.status = TransactionStatus.ROLLED_BACK;
      transaction.endTime = Date.now();
      
      // Verknüpfungen zu Zustandspfaden entfernen
      for (const snapshot of transaction.snapshots) {
        const statePath = this.pathToString(snapshot.path);
        if (this.stateTransactions.has(statePath)) {
          this.stateTransactions.get(statePath)!.delete(transactionId);
          
          // Leere Sets entfernen
          if (this.stateTransactions.get(statePath)!.size === 0) {
            this.stateTransactions.delete(statePath);
          }
        }
      }
      
      logger.debug(`Transaction rolled back: ${transaction.name} [${transactionId}] with ${Object.keys(rollbackValues).length} restored values`);
      
      // Change-Listener informieren
      this.notifyChangeListeners(transactionId, TransactionStatus.ROLLED_BACK);
      
      // Rollback-Werte zurückgeben
      return rollbackValues;
    } catch (error) {
      // Bei Fehlern Transaktion als fehlgeschlagen markieren
      transaction.status = TransactionStatus.FAILED;
      transaction.endTime = Date.now();
      
      logger.error(`Error rolling back transaction ${transaction.name} [${transactionId}]:`, error);
      
      // Change-Listener informieren
      this.notifyChangeListeners(transactionId, TransactionStatus.FAILED);
      
      return {};
    }
  }
  
  /**
   * Registriert einen Listener für Transaktionsänderungen
   * @param listener Der Callback, der bei Änderungen aufgerufen wird
   * @returns Eine Funktion zum Entfernen des Listeners
   */
  public addChangeListener(listener: (transactionId: string, status: TransactionStatus) => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }
  
  /**
   * Benachrichtigt alle registrierten Listener über Statusänderungen
   * @param transactionId Die Transaktions-ID
   * @param status Der neue Status
   */
  private notifyChangeListeners(transactionId: string, status: TransactionStatus): void {
    for (const listener of this.changeListeners) {
      try {
        listener(transactionId, status);
      } catch (error) {
        logger.error(`Error in transaction change listener:`, error);
      }
    }
  }
  
  /**
   * Erstellt eine tiefe Kopie eines Wertes
   * @param value Der zu kopierende Wert
   * @returns Eine tiefe Kopie des Wertes
   */
  private deepClone<T>(value: T): T {
    if (value === null || value === undefined) {
      return value;
    }
    
    // Einfache Typen direkt zurückgeben
    if (typeof value !== 'object') {
      return value;
    }
    
    // Spezialfall: Date-Objekte
    if (value instanceof Date) {
      return new Date(value.getTime()) as unknown as T;
    }
    
    // Normale Objekte mit struktureller Kopie
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      // Fallback für nicht-serialisierbare Objekte
      logger.warn(`Could not deep clone value, using shallow copy:`, error);
      
      // Flache Kopie als Fallback
      if (Array.isArray(value)) {
        return [...value] as unknown as T;
      }
      
      return { ...value };
    }
  }
  
  /**
   * Konvertiert einen Pfad-Array in einen String zur Nutzung als Map-Schlüssel
   * @param path Der Pfad als Array
   * @returns Der Pfad als String
   */
  private pathToString(path: string[]): string {
    return path.join('.');
  }
  
  /**
   * Gibt Debugging-Informationen zu einer Transaktion zurück
   * @param transactionId Die Transaktions-ID
   */
  public getTransactionInfo(transactionId: string): Omit<Transaction, 'snapshots'> & { snapshotCount: number } | null {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      return null;
    }
    
    // Kopie ohne sensible Daten erstellen
    const { snapshots, ...rest } = transaction;
    return {
      ...rest,
      snapshotCount: snapshots.length
    };
  }
  
  /**
   * Bereinigt abgeschlossene Transaktionen nach einer bestimmten Zeit
   * @param maxAgeMs Maximales Alter in Millisekunden (default: 5 Minuten)
   */
  public cleanupTransactions(maxAgeMs: number = 5 * 60 * 1000): void {
    const now = Date.now();
    const expiredIds: string[] = [];
    
    // Abgelaufene Transaktionen identifizieren
    for (const [id, transaction] of this.transactions.entries()) {
      if (transaction.status !== TransactionStatus.PENDING) {
        const endTime = transaction.endTime || now;
        const age = now - endTime;
        
        if (age > maxAgeMs) {
          expiredIds.push(id);
        }
      }
    }
    
    // Abgelaufene Transaktionen entfernen
    for (const id of expiredIds) {
      this.transactions.delete(id);
      
      // Verknüpfungen zu Kind-Transaktionen entfernen
      if (this.childTransactions.has(id)) {
        this.childTransactions.delete(id);
      }
      
      // Debouncers entfernen
      if (this.debouncedCommits.has(id)) {
        this.debouncedCommits.delete(id);
      }
    }
    
    if (expiredIds.length > 0) {
      logger.debug(`Cleaned up ${expiredIds.length} expired transactions`);
    }
  }
}

// Singleton-Instanz
const transactionManager = new TransactionManager();

export default transactionManager;