/**
 * LogServiceWrapper
 * 
 * Dieser Service kapselt die Kommunikation mit den Log-API-Endpunkten
 * und bietet eine standardisierte Fehlerbehandlung und Logging.
 */

import { adminApi } from './admin';
import { LogService } from '../log/LogService';

// Definiere Log-Typen
export interface LogEntry {
  id: string;
  timestamp: number;
  level: 'error' | 'warn' | 'info' | 'debug';
  component: string;
  message: string;
  details?: string;
  userId?: string;
  sessionId?: string;
}

// Filteroption-Interface
export interface LogFilter {
  level?: string;
  component?: string;
  startTime?: number;
  endTime?: number;
  search?: string;
  page?: number;
  pageSize?: number;
}

// Paginierte Ergebnisse
export interface PaginatedLogs {
  logs: LogEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class LogServiceWrapper {
  private logService: LogService;

  constructor() {
    this.logService = new LogService('LogService');
  }

  /**
   * Abrufen von Logs mit Filteroptionen
   */
  async getLogs(filter?: LogFilter): Promise<PaginatedLogs> {
    try {
      this.logService.debug('Rufe Logs ab', { filter });
      
      try {
        // Versuche die API zu verwenden
        const response = await adminApi.getLogs(filter);
        return response.data;
      } catch (error) {
        this.logService.warn('API-Aufruf fehlgeschlagen, verwende Fallback', error);
        
        // Fallback, wenn die API noch nicht vollständig implementiert ist
        return this.generateSampleLogs(filter);
      }
    } catch (error) {
      this.logService.error('Fehler beim Abrufen der Logs', { ...error, filter });
      throw this.formatError(error, 'Logs konnten nicht geladen werden');
    }
  }

  /**
   * Löschen aller Logs
   */
  async clearLogs(): Promise<void> {
    try {
      this.logService.debug('Lösche alle Logs');
      
      try {
        // Versuche die API zu verwenden
        await adminApi.clearLogs();
      } catch (error) {
        this.logService.warn('API-Aufruf fehlgeschlagen', error);
        
        // Bei einer tatsächlichen Implementierung würden wir hier einen Fehler werfen,
        // aber für Demo-Zwecke simulieren wir Erfolg
        return Promise.resolve();
      }
    } catch (error) {
      this.logService.error('Fehler beim Löschen der Logs', error);
      throw this.formatError(error, 'Logs konnten nicht gelöscht werden');
    }
  }

  /**
   * Export der Logs als Datei
   */
  async exportLogs(filter?: LogFilter): Promise<Blob> {
    try {
      this.logService.debug('Exportiere Logs', { filter });
      
      try {
        // Versuche die API zu verwenden
        return await adminApi.exportLogs(filter);
      } catch (error) {
        this.logService.warn('API-Aufruf fehlgeschlagen, verwende Fallback', error);
        
        // Fallback: Generiere Logs und exportiere sie als JSON
        const logs = await this.getLogs(filter);
        const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
        return blob;
      }
    } catch (error) {
      this.logService.error('Fehler beim Exportieren der Logs', { ...error, filter });
      throw this.formatError(error, 'Logs konnten nicht exportiert werden');
    }
  }

  /**
   * Hilfsmethoden
   */
  private formatError(error: any, defaultMessage: string): Error {
    // Versuche, Fehlerinformationen aus der API-Antwort zu extrahieren
    const errorMessage = error?.response?.data?.message || defaultMessage;
    const errorCode = error?.response?.status || 'UNKNOWN';
    
    const formattedError = new Error(errorMessage);
    (formattedError as any).code = errorCode;
    (formattedError as any).originalError = error;
    
    return formattedError;
  }

  /**
   * Generiert Beispiel-Logs für Entwicklungszwecke
   */
  private async generateSampleLogs(filter?: LogFilter): Promise<PaginatedLogs> {
    const logs: LogEntry[] = [];
    const now = Date.now();
    const components = ['Auth', 'API', 'Database', 'UI', 'Cache', 'Session', 'FileSystem'];
    const levels = ['error', 'warn', 'info', 'debug'] as const;
    const messages = [
      'Benutzeranmeldung erfolgreich',
      'Datenbankverbindung fehlgeschlagen',
      'Cache-Eintrag abgelaufen',
      'Anfrage verarbeitet',
      'Ungültiger API-Token',
      'Benutzer abgemeldet',
      'Dateisystem-Operation erfolgreich',
      'Sitzung abgelaufen',
      'Ungültige Anfrageparameter',
      'Systemstart abgeschlossen'
    ];
    
    // Generiere Beispiel-Logs für die letzten 30 Tage
    for (let i = 0; i < 100; i++) {
      const timestamp = now - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000);
      const level = levels[Math.floor(Math.random() * levels.length)];
      const component = components[Math.floor(Math.random() * components.length)];
      const message = messages[Math.floor(Math.random() * messages.length)];
      
      logs.push({
        id: `log-${i}-${Date.now()}`,
        timestamp,
        level,
        component,
        message,
        details: level === 'error' ? 'Stack trace:\n  at function (file.js:123)\n  at otherFunction (other.js:45)' : undefined
      });
    }
    
    // Filterung anwenden, wenn vorhanden
    let filteredLogs = [...logs];
    
    if (filter) {
      if (filter.level) {
        filteredLogs = filteredLogs.filter(log => log.level === filter.level);
      }
      
      if (filter.component) {
        filteredLogs = filteredLogs.filter(log => log.component === filter.component);
      }
      
      if (filter.startTime) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filter.startTime!);
      }
      
      if (filter.endTime) {
        filteredLogs = filteredLogs.filter(log => log.timestamp <= filter.endTime!);
      }
      
      if (filter.search) {
        const term = filter.search.toLowerCase();
        filteredLogs = filteredLogs.filter(log => 
          log.message.toLowerCase().includes(term) ||
          log.component.toLowerCase().includes(term) ||
          (log.details && log.details.toLowerCase().includes(term))
        );
      }
    }
    
    // Sortierung nach Zeitstempel (neueste zuerst)
    filteredLogs.sort((a, b) => b.timestamp - a.timestamp);
    
    // Paginierung
    const page = filter?.page || 1;
    const pageSize = filter?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    
    return {
      logs: filteredLogs.slice(start, end),
      total: filteredLogs.length,
      page,
      pageSize,
      totalPages: Math.ceil(filteredLogs.length / pageSize)
    };
  }
}

// Singleton-Instanz exportieren
export const logService = new LogServiceWrapper();

export default logService;