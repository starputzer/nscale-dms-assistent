/**
 * MockServiceFactory
 *
 * Diese Klasse bietet ein Factory-Pattern, um zwischen Mock-Implementierungen und echten
 * API-Services zu wechseln. Dies ermöglicht die Entwicklung ohne Backend-Abhängigkeit.
 */

import { chatService as realChatService } from "../api/ChatService";
import { mockChatService } from "./MockChatService";

// Typen
type ServiceType = "chat" | "auth" | "document" | "admin";
type EnvironmentMode = "mock" | "real" | "auto";

/**
 * Konfiguration für den MockServiceFactory
 */
interface MockServiceFactoryConfig {
  defaultMode: EnvironmentMode;
  forceMode?: EnvironmentMode;
  serviceOverrides?: Record<ServiceType, EnvironmentMode>;
}

/**
 * Factory, die Mock- oder reale Services bereitstellt
 */
class MockServiceFactory {
  private config: MockServiceFactoryConfig = {
    defaultMode: "auto",
    serviceOverrides: {},
  };

  /**
   * Initialisiert die Factory mit der angegebenen Konfiguration
   */
  public initialize(config: Partial<MockServiceFactoryConfig> = {}): void {
    this.config = {
      ...this.config,
      ...config,
    };

    // Log the configuration
    console.log(
      "MockServiceFactory initialisiert mit Konfiguration:",
      this.config,
    );
  }

  /**
   * Bestimmt den zu verwendenden Modus für einen bestimmten Service-Typ
   */
  private determineMode(serviceType: ServiceType): "mock" | "real" {
    // Wenn forciert, diesen Modus verwenden
    if (this.config.forceMode && this.config.forceMode !== "auto") {
      return this.config.forceMode;
    }

    // Service-spezifische Überschreibung
    if (
      this.config.serviceOverrides &&
      this.config.serviceOverrides[serviceType] &&
      this.config.serviceOverrides[serviceType] !== "auto"
    ) {
      return this.config.serviceOverrides[serviceType] as "mock" | "real";
    }

    // Auto-Modus: prüfen, ob API erreichbar ist
    if (this.config.defaultMode === "auto") {
      // Im auto-Modus verwenden wir Mock-Implementierung, wenn kein Backend verfügbar ist
      // Wir könnten hier auch eine Prüfung hinzufügen, ob das Backend erreichbar ist
      const isBackendAvailable = this.checkBackendAvailability();
      return isBackendAvailable ? "real" : "mock";
    }

    // Defaultmodus verwenden
    return this.config.defaultMode as "mock" | "real";
  }

  /**
   * Prüft, ob das Backend erreichbar ist (sehr einfache Implementierung)
   */
  private checkBackendAvailability(): boolean {
    // Einfache Heuristik: Wenn wir auf einem lokalen Entwicklungsserver sind und kein
    // expliziter API-Server gesetzt ist, nehmen wir an, dass kein Backend verfügbar ist
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      // Wir könnten hier auch einen Cookie oder localStorage prüfen, um zu sehen,
      // ob der Benutzer bereits entschieden hat, den Mock-Modus zu verwenden
      const storedMode = localStorage.getItem("nscale_mock_mode");
      if (storedMode === "mock") {
        return false;
      }

      // Wenn im Produktionsserver ein flag gesetzt ist
      if (window.APP_CONFIG?.USE_MOCK_API === true) {
        return false;
      }
    }

    return true;
  }

  /**
   * Gibt den ChatService zurück (entweder echte oder Mock-Implementierung)
   */
  public getChatService() {
    const mode = this.determineMode("chat");
    console.log(`ChatService im Modus: ${mode}`);

    return mode === "mock" ? mockChatService : realChatService;
  }

  /**
   * Gibt an, ob der Mock-Modus für Auth-Service aktiv ist
   */
  public isAuthMockMode() {
    return this.determineMode("auth") === "mock";
  }
}

// Singleton-Instanz
export const mockServiceFactory = new MockServiceFactory();

// Initialisiere mit Default-Konfiguration
mockServiceFactory.initialize({
  // Mock-Modus erzwingen, wenn URL-Parameter vorhanden ist
  forceMode:
    new URLSearchParams(window.location.search).get("mockApi") === "true"
      ? "mock"
      : "real",
  // Default-Modus (wenn nicht forciert)
  defaultMode: "real",
  // Service-spezifische Überschreibungen
  serviceOverrides: {
    chat: "real", // Real statt Mock für Chat verwenden
    auth: "real",
    document: "real",
    admin: "real",
  },
});

export default mockServiceFactory;
