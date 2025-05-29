/**
 * Konfiguration für API-Integrationen
 *
 * HINWEIS: Ab 20.05.2025 werden nur noch echte API-Daten verwendet.
 * Die Feature-Flag-Funktion wurde deaktiviert, da sie nicht mehr benötigt wird.
 */

const API_FLAGS = {
  /**
   * Fallback-Konfiguration für die Verwendung von Mock-Daten bei API-Fehlern
   * Dies ist die einzige verbleibende Konfiguration, da alle API-Integrationen
   * immer aktiviert sind.
   */
  fallback: {
    /**
     * Fallback zu Mock-Daten bei API-Fehlern aktiviert
     */
    enabled: true,

    /**
     * Anzahl der Versuche, bevor Fallback aktiviert wird
     */
    maxRetries: 3,

    /**
     * Schwellenwert für die Fehlerrate, ab dem automatisch auf Mock-Daten zurückgegriffen wird (0-1)
     */
    errorThreshold: 0.3,

    /**
     * Dauer in Millisekunden, bevor ein neuer Versuch mit echter API unternommen wird
     */
    retryAfter: 60000, // 1 Minute
  },
};

/**
 * Diese Funktion prüft, ob die echte API verwendet werden soll,
 * oder ob auf Mock-Daten zurückgegriffen werden soll.
 * 
 * Die Komponente dient zur Unterscheidung, für welchen API-Teil die Prüfung erfolgt.
 * Aktuell wird nur bei Entwicklung auf Mock-Daten zurückgegriffen, bzw. wenn kein Netzwerk verfügbar ist.
 * 
 * @param component Die Komponente, für die die API-Verwendung geprüft wird
 * @returns true wenn echte API verwendet werden soll, false für Mock-Daten
 */
export const shouldUseRealApi = (component: string): boolean => {
  // Im Entwicklungsmodus mit speziellen URL-Parametern können wir Mock-Daten erzwingen
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Bei forceMock=true immer Mock-Daten verwenden
    if (urlParams.get('forceMock') === 'true') {
      console.info(`[API-Flags] Verwende Mock-Daten für ${component} (via URL-Parameter)`);
      return false;
    }
    
    // Bei forceReal=true immer echte API verwenden
    if (urlParams.get('forceReal') === 'true') {
      console.info(`[API-Flags] Verwende echte API für ${component} (via URL-Parameter)`);
      return true;
    }
  }
  
  // IMMER echte API verwenden - keine Mock-Daten mehr!
  console.info(`[API-Flags] Verwende echte API für ${component} (Produktivmodus)`);
  return true;
};

export default API_FLAGS;
