/**
 * Konfigurationsflags für API-Integrationen
 *
 * Diese Datei definiert Feature-Flags für die schrittweise Migration
 * von Mock-Daten zu echten API-Calls.
 */

const API_FLAGS = {
  /**
   * Globales Flag für die Verwendung echter API-Calls
   * Überschreibt die komponentenspezifischen Flags, wenn false
   */
  useRealApi: process.env.NODE_ENV === "production" || false,

  /**
   * Flags für spezifische Admin-Komponenten
   * Diese Flags ermöglichen die stufenweise Migration pro Komponente
   */
  components: {
    /**
     * DocumentConverter-Tab: Verwendet echte API-Calls für den Dokumentenkonverter
     */
    useRealDocumentConverterApi: false,

    /**
     * Users-Tab: Verwendet echte API-Calls für die Benutzerverwaltung
     */
    useRealUsersApi: false,

    /**
     * Feedback-Tab: Verwendet echte API-Calls für Feedback-Funktionen
     */
    useRealFeedbackApi: true,

    /**
     * FeatureToggles-Tab: Verwendet echte API-Calls für Feature-Toggles
     */
    useRealFeatureTogglesApi: false,

    /**
     * System-Tab: Verwendet echte API-Calls für Systemeinstellungen und -statistiken
     */
    useRealSystemApi: false,

    /**
     * Motd-Tab: Verwendet echte API-Calls für Nachrichten des Tages
     */
    useRealMotdApi: false,
  },

  /**
   * Fallback-Konfiguration für die Verwendung von Mock-Daten bei API-Fehlern
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
 * Prüft, ob für eine bestimmte Admin-Komponente echte API-Calls verwendet werden sollen
 * @param component Name der Komponente
 * @returns true, wenn echte API-Calls für die Komponente verwendet werden sollen
 */
export const shouldUseRealApi = (
  component: keyof typeof API_FLAGS.components,
): boolean => {
  // Globales Flag hat Priorität - wenn es false ist, immer Mock-Daten verwenden
  if (!API_FLAGS.useRealApi) return false;

  // Komponentenspezifisches Flag überprüfen
  return API_FLAGS.components[component] === true;
};

export default API_FLAGS;
