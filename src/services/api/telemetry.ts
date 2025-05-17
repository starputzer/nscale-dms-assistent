/**
 * Telemetrie-Service für die nscale DMS Assistant Anwendung
 * Verantwortlich für die Erfassung und Übermittlung von Nutzungsstatistiken
 */

// Telemetrie-Konfiguration
interface TelemetryConfig {
  enabled: boolean;
  anonymizeIP: boolean;
  sessionTimeout: number;
  endpoint: string;
}

// Standard-Konfiguration
const defaultConfig: TelemetryConfig = {
  enabled: false, // Standardmäßig deaktiviert
  anonymizeIP: true,
  sessionTimeout: 30, // Minuten
  endpoint: '/api/telemetry',
};

// Aktuelle Konfiguration
let currentConfig: TelemetryConfig = { ...defaultConfig };

// Telemetrie-Service
export const telemetryService = {
  /**
   * Initialisiert die Telemetrie mit der angegebenen Konfiguration
   */
  initialize(config: Partial<TelemetryConfig> = {}) {
    currentConfig = { ...defaultConfig, ...config };
    
    if (!currentConfig.enabled) {
      console.log('Telemetrie ist deaktiviert');
      return;
    }
    
    console.log('Telemetrie initialisiert mit Konfiguration:', currentConfig);
    
    // Basis-Metriken senden
    this.trackEvent('app_initialized', {
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    });
  },

  /**
   * Erfasst ein benutzerdefiniertes Ereignis
   */
  trackEvent(eventName: string, data: Record<string, any> = {}) {
    if (!currentConfig.enabled) return;
    
    const payload = {
      event: eventName,
      timestamp: Date.now(),
      data,
    };
    
    // Anonymisierung, falls aktiviert
    if (currentConfig.anonymizeIP && payload.data.ip) {
      // Anonymisiert die IP-Adresse (z.B. 192.168.1.1 -> 192.168.1.0)
      payload.data.ip = this.anonymizeIP(payload.data.ip);
    }
    
    // Daten an den Telemetrie-Endpunkt senden
    this.sendData(payload);
  },

  /**
   * Erfasst eine Fehler-Metrik
   */
  trackError(error: Error, context: Record<string, any> = {}) {
    if (!currentConfig.enabled) return;
    
    this.trackEvent('error', {
      message: error.message,
      stack: error.stack,
      ...context,
    });
  },

  /**
   * Erfasst eine Performance-Metrik
   */
  trackPerformance(metricName: string, durationMs: number, context: Record<string, any> = {}) {
    if (!currentConfig.enabled) return;
    
    this.trackEvent('performance', {
      metric: metricName,
      duration: durationMs,
      ...context,
    });
  },

  /**
   * Erfasst eine Nutzersitzung
   */
  trackSession(sessionId: string) {
    if (!currentConfig.enabled) return;
    
    this.trackEvent('session_start', {
      sessionId,
      startTime: Date.now(),
    });
  },

  /**
   * Anonymisiert eine IP-Adresse
   */
  anonymizeIP(ip: string): string {
    // Einfache Anonymisierung durch Nullsetzen des letzten Oktetts
    return ip.replace(/\d+$/, '0');
  },

  /**
   * Sendet Daten an den Telemetrie-Endpunkt
   */
  async sendData(data: Record<string, any>) {
    try {
      // Im Mock-Modus senden wir keine tatsächlichen API-Anfragen
      if (new URLSearchParams(window.location.search).get('mockApi') === 'true') {
        console.log('[Mock] Telemetrie-Daten würden gesendet werden:', data);
        return;
      }
      
      // Verwendet sendBeacon für zuverlässige Übertragung, auch beim Seitenwechsel
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        navigator.sendBeacon(currentConfig.endpoint, blob);
        return;
      }
      
      // Fallback auf fetch, wenn sendBeacon nicht verfügbar ist
      await fetch(currentConfig.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        // Geringe Priorität, damit wichtigere Anfragen nicht blockiert werden
        priority: 'low' as any,
      });
    } catch (error) {
      console.error('Fehler beim Senden von Telemetriedaten:', error);
    }
  },
};

/**
 * Initialisiert den Telemetrie-Service und konfiguriert Event-Listener
 */
export function initializeTelemetry(config: Partial<TelemetryConfig> = {}): void {
  // Telemetrie initialisieren
  telemetryService.initialize(config);
  
  // Performance-Metriken
  if ('performance' in window) {
    window.addEventListener('load', () => {
      if (performance.getEntriesByType) {
        const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navEntry) {
          telemetryService.trackPerformance('page_load', navEntry.loadEventEnd - navEntry.startTime);
        }
      }
    });
  }
  
  return;
}