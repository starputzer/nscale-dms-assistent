/**
 * RateLimitHandler - Behandlung von API-Ratenbegrenzungen
 * 
 * Diese Klasse verwaltet die Erkennung und Behandlung von API-Ratenbegrenzungen,
 * um 429-Fehler zu vermeiden und Anfragen zu drosseln, wenn der Server dies erfordert.
 */

import { AxiosResponse } from 'axios';
import { apiConfig } from './config';
import { LogService } from '../log/LogService';

/**
 * Konfiguration für den RateLimitHandler
 */
export interface RateLimitHandlerOptions {
  /** Header für verbleibende Anfragen */
  remainingHeader?: string;
  
  /** Header für Zeitpunkt des Resets */
  resetHeader?: string;
  
  /** Header für Limit */
  limitHeader?: string;
  
  /** Schwellenwert für Drosselung (wenn verbleibende Anfragen darunter fallen) */
  throttleThreshold?: number;
  
  /** Minimale Verzögerung für gedrosselte Anfragen (ms) */
  minThrottleDelay?: number;
}

/**
 * RateLimitHandler - Klasse zur Verwaltung von API-Ratenbegrenzungen
 */
export class RateLimitHandler {
  /** Header für verbleibende Anfragen */
  private remainingHeader: string;
  
  /** Header für Zeitpunkt des Resets */
  private resetHeader: string;
  
  /** Header für Limit */
  private limitHeader: string;
  
  /** Schwellenwert für Drosselung */
  private throttleThreshold: number;
  
  /** Minimale Verzögerung für gedrosselte Anfragen (ms) */
  private minThrottleDelay: number;
  
  /** Aktuell verbleibende Anfragen (pro Endpunkt) */
  private remainingRequests: Record<string, number> = {};
  
  /** Zeitpunkt des Resets (pro Endpunkt) */
  private resetTimes: Record<string, number> = {};
  
  /** Limits (pro Endpunkt) */
  private limits: Record<string, number> = {};
  
  /** Aktuelle Drosselungsverzögerung (ms) */
  private currentThrottleDelay: number = 0;
  
  /** Zeitpunkt der letzten Anfrage */
  private lastRequestTime: number = 0;
  
  /** Logger-Instanz */
  private logService: LogService;
  
  /**
   * Konstruktor
   */
  constructor(options: RateLimitHandlerOptions = {}) {
    this.remainingHeader = options.remainingHeader ?? apiConfig.RATE_LIMITING.REMAINING_HEADER;
    this.resetHeader = options.resetHeader ?? apiConfig.RATE_LIMITING.RESET_HEADER;
    this.limitHeader = options.limitHeader ?? apiConfig.RATE_LIMITING.LIMIT_HEADER;
    this.throttleThreshold = options.throttleThreshold ?? apiConfig.RATE_LIMITING.THROTTLE_THRESHOLD;
    this.minThrottleDelay = options.minThrottleDelay ?? apiConfig.RATE_LIMITING.MIN_THROTTLE_DELAY;
    this.logService = new LogService('RateLimitHandler');
  }
  
  /**
   * Aktualisiert die Rate-Limit-Informationen aus einer API-Antwort
   */
  public updateFromResponse(response: AxiosResponse): void {
    // Extrahiere den Endpunktpfad aus der URL
    const url = response.config.url || '';
    const baseEndpoint = this.getBaseEndpoint(url);
    
    // Rate-Limit-Header auslesen
    const remaining = this.getHeaderValue(response.headers, this.remainingHeader);
    const reset = this.getResetTimeFromResponse(response);
    const limit = this.getHeaderValue(response.headers, this.limitHeader);
    
    // Werte speichern, wenn vorhanden
    if (remaining !== null) {
      this.remainingRequests[baseEndpoint] = remaining;
    }
    
    if (reset !== null) {
      this.resetTimes[baseEndpoint] = reset;
    }
    
    if (limit !== null) {
      this.limits[baseEndpoint] = limit;
    }
    
    // Debug-Logging
    if (apiConfig.DEBUG.VERBOSE && (remaining !== null || reset !== null || limit !== null)) {
      this.logService.debug(`Rate-Limit für ${baseEndpoint}: ${remaining}/${limit}, Reset: ${new Date(reset || 0).toISOString()}`);
    }
    
    // Aktualisiere die Drosselungsverzögerung basierend auf den aktuellen Werten
    this.updateThrottleDelay();
  }
  
  /**
   * Extrahiert den Basisendpunkt aus einer URL
   */
  private getBaseEndpoint(url: string): string {
    // Entferne Query-Parameter
    const urlWithoutQuery = url.split('?')[0];
    
    // Identifiziere den API-Endpunkt (ersten Teil des Pfads)
    const parts = urlWithoutQuery.split('/').filter(Boolean);
    
    // API-Version entfernen, falls vorhanden
    if (parts.length > 0 && parts[0] === apiConfig.API_VERSION) {
      parts.shift();
    }
    
    // Die ersten beiden Pfad-Segmente als Basisendpunkt verwenden
    return parts.slice(0, Math.min(2, parts.length)).join('/') || 'default';
  }
  
  /**
   * Liest einen numerischen Wert aus einem Header
   */
  private getHeaderValue(headers: Record<string, string>, headerName: string): number | null {
    const headerValue = headers[headerName.toLowerCase()] || headers[headerName];
    
    if (headerValue) {
      const value = parseInt(headerValue, 10);
      if (!isNaN(value)) {
        return value;
      }
    }
    
    return null;
  }
  
  /**
   * Extrahiert den Reset-Zeitpunkt aus den Response-Headern
   */
  public getResetTimeFromResponse(response?: AxiosResponse | null): number | null {
    if (!response || !response.headers) {
      return null;
    }
    
    const resetHeader = response.headers[this.resetHeader.toLowerCase()] || response.headers[this.resetHeader];
    
    if (resetHeader) {
      // Unterschiedliche Header-Formate verarbeiten
      
      // Format 1: Unix-Timestamp in Sekunden
      if (/^\d+$/.test(resetHeader)) {
        const timestamp = parseInt(resetHeader, 10) * 1000; // In Millisekunden konvertieren
        return timestamp;
      }
      
      // Format 2: ISO-Datumsstring
      try {
        const date = new Date(resetHeader);
        if (!isNaN(date.getTime())) {
          return date.getTime();
        }
      } catch (e) {
        // Ignorieren, wenn Datum nicht geparst werden kann
      }
      
      // Format 3: Verzögerung in Sekunden (Retry-After)
      try {
        const seconds = parseInt(resetHeader, 10);
        if (!isNaN(seconds)) {
          return Date.now() + (seconds * 1000);
        }
      } catch (e) {
        // Ignorieren, wenn Verzögerung nicht geparst werden kann
      }
    }
    
    return null;
  }
  
  /**
   * Aktualisiert die Drosselungsverzögerung basierend auf den aktuellen Werten
   */
  private updateThrottleDelay(): void {
    // Finde den niedrigsten verbleibenden Wert für alle Endpunkte
    let lowestRemaining = Infinity;
    let nearestReset = Infinity;
    
    for (const endpoint in this.remainingRequests) {
      const remaining = this.remainingRequests[endpoint];
      
      if (remaining < lowestRemaining) {
        lowestRemaining = remaining;
        nearestReset = this.resetTimes[endpoint] || Infinity;
      }
    }
    
    // Berechne Verzögerung basierend auf verbleibenden Anfragen
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
      
      this.logService.warn(`Rate-Limit fast erreicht (${lowestRemaining} verbleibend). Drosselung mit ${this.currentThrottleDelay}ms`);
    } else {
      // Über dem Schwellenwert, keine Drosselung
      this.currentThrottleDelay = 0;
    }
  }
  
  /**
   * Wendet die aktuelle Drosselungsverzögerung an
   */
  public async applyThrottling(): Promise<void> {
    // Wenn keine Drosselung erforderlich, sofort zurückkehren
    if (this.currentThrottleDelay <= 0) {
      return;
    }
    
    // Berechne tatsächliche Verzögerung seit der letzten Anfrage
    const timeSinceLastRequest = Date.now() - this.lastRequestTime;
    const actualDelay = Math.max(0, this.currentThrottleDelay - timeSinceLastRequest);
    
    // Aktuelle Zeit als letzte Anfrage speichern
    this.lastRequestTime = Date.now() + actualDelay;
    
    // Wenn eine Verzögerung erforderlich ist, warte
    if (actualDelay > 0) {
      this.logService.debug(`Anfrage wird um ${actualDelay}ms verzögert (Rate-Limiting)`);
      await new Promise(resolve => setTimeout(resolve, actualDelay));
    }
  }
  
  /**
   * Setzt die Rate-Limit-Informationen zurück
   */
  public reset(): void {
    this.remainingRequests = {};
    this.resetTimes = {};
    this.limits = {};
    this.currentThrottleDelay = 0;
    this.lastRequestTime = 0;
  }
  
  /**
   * Gibt den aktuellen Rate-Limit-Status zurück
   */
  public getStatus(): Record<string, any> {
    return {
      remainingRequests: { ...this.remainingRequests },
      resetTimes: { ...this.resetTimes },
      limits: { ...this.limits },
      currentThrottleDelay: this.currentThrottleDelay,
      lastRequestTime: this.lastRequestTime
    };
  }
}

export default RateLimitHandler;