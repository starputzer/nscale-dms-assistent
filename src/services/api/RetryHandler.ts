/**
 * RetryHandler - Wiederholungslogik für fehlgeschlagene API-Anfragen
 *
 * Diese Klasse implementiert eine robuste Wiederholungsstrategie für
 * fehlgeschlagene API-Anfragen mit exponentieller Backoff-Verzögerung.
 */

import { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";
import { apiConfig } from "./config";
import { LogService } from "../log/LogService";

/**
 * Konfigurationsoptionen für RetryHandler
 */
export interface RetryHandlerOptions {
  /** Maximale Anzahl von Wiederholungsversuchen */
  maxRetries?: number;

  /** Basisverzögerung in ms */
  baseDelay?: number;

  /** Faktor für die exponentielle Verzögerung */
  backoffFactor?: number;

  /** HTTP-Statuscodes, die für Wiederholungsversuche geeignet sind */
  retryStatusCodes?: number[];

  /** Netzwerkfehler automatisch wiederholen */
  retryNetworkErrors?: boolean;

  /** Maximale Verzögerung zwischen Wiederholungsversuchen (ms) */
  maxDelay?: number;

  /** Zufällige Verzögerungsvariation (Jitter) aktivieren */
  enableJitter?: boolean;
}

/**
 * RetryHandler - Klasse zur Verwaltung von Wiederholungsversuchen
 */
export class RetryHandler {
  /** Maximale Anzahl von Wiederholungsversuchen */
  private maxRetries: number;

  /** Basisverzögerung in ms */
  private baseDelay: number;

  /** Faktor für die exponentielle Verzögerung */
  private backoffFactor: number;

  /** HTTP-Statuscodes, die für Wiederholungsversuche geeignet sind */
  private retryStatusCodes: number[];

  /** Netzwerkfehler automatisch wiederholen */
  private retryNetworkErrors: boolean;

  /** Maximale Verzögerung zwischen Wiederholungsversuchen (ms) */
  private maxDelay: number;

  /** Zufällige Verzögerungsvariation (Jitter) aktivieren */
  private enableJitter: boolean;

  /** Logger-Instanz */
  private logService: LogService;

  /**
   * Konstruktor
   */
  constructor(options: RetryHandlerOptions = {}) {
    this.maxRetries = options.maxRetries ?? apiConfig.RETRY.MAX_RETRIES;
    this.baseDelay = options.baseDelay ?? apiConfig.RETRY.BASE_DELAY;
    this.backoffFactor =
      options.backoffFactor ?? apiConfig.RETRY.BACKOFF_FACTOR;
    this.retryStatusCodes =
      options.retryStatusCodes ?? apiConfig.RETRY.RETRY_STATUS_CODES;
    this.retryNetworkErrors =
      options.retryNetworkErrors ?? apiConfig.RETRY.RETRY_NETWORK_ERRORS;
    this.maxDelay = options.maxDelay ?? 30000; // 30 Sekunden
    this.enableJitter = options.enableJitter ?? true;
    this.logService = new LogService("RetryHandler");
  }

  /**
   * Prüft, ob ein Fehler für einen Wiederholungsversuch geeignet ist
   */
  public shouldRetry(error: AxiosError): boolean {
    // Bereits ausgeführte Wiederholungsversuche überprüfen
    const retryCount = (error.config as any)?._retryCount || 0;
    if (retryCount >= this.maxRetries) {
      return false;
    }

    // Abgebrochene Anfragen nicht wiederholen
    if (error.message === "canceled") {
      return false;
    }

    // Idempotenz überprüfen
    const method = error.config?.method?.toUpperCase();
    if (method && ["POST", "PATCH"].includes(method)) {
      if (!(error.config as any)?.isIdempotent) {
        return false;
      }
    }

    // Netzwerkfehler prüfen
    if (!error.response) {
      // Keine Antwort = Netzwerkfehler oder Timeout
      return this.retryNetworkErrors;
    }

    // HTTP-Statuscode prüfen
    return this.retryStatusCodes.includes(error.response.status);
  }

  /**
   * Berechnet die Verzögerung für den nächsten Wiederholungsversuch
   */
  public calculateDelay(retryCount: number): number {
    // Exponentielle Verzögerung berechnen
    let delay = this.baseDelay * Math.pow(this.backoffFactor, retryCount);

    // Auf maximale Verzögerung begrenzen
    delay = Math.min(delay, this.maxDelay);

    // Zufällige Variation (Jitter) hinzufügen, um Anfragespitzen zu vermeiden
    if (this.enableJitter) {
      // Variation zwischen 80% und 120% der Verzögerungszeit
      const jitterFactor = 0.8 + Math.random() * 0.4;
      delay = Math.floor(delay * jitterFactor);
    }

    return delay;
  }

  /**
   * Führt einen Wiederholungsversuch für eine fehlgeschlagene Anfrage durch
   */
  public async retryRequest<T>(
    config: AxiosRequestConfig,
    axiosInstance: AxiosInstance,
  ): Promise<T> {
    // Zähler für Wiederholungsversuche inkrementieren
    const retryCount = ((config as any)._retryCount || 0) + 1;
    (config as any)._retryCount = retryCount;

    // Verzögerung berechnen
    const delay = this.calculateDelay(retryCount - 1);

    this.logService.info(
      `Wiederhole Anfrage (${retryCount}/${this.maxRetries}) nach ${delay}ms: ${config.method?.toUpperCase()} ${config.url}`,
    );

    // Verzögerung vor dem Wiederholungsversuch
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Anfrage wiederholen
    return axiosInstance.request(config);
  }
}

export default RetryHandler;
