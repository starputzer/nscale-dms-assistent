/**
 * Global Functions Bridge
 *
 * Diese Datei stellt alle globalen Funktionen bereit, die von Legacy-Code benötigt werden,
 * aber im Vue 3-SFC-Modell nicht mehr direkt im globalen Scope existieren sollten.
 * Der Bridge ist eine Übergangslösung während der Migration zu Vue 3.
 */

import { useSourcesStore } from "@/stores/sources";
import type { SourceReference } from "@/stores/sources";
import { useLogger } from "@/composables/useLogger";
import { useFeatureToggles } from "@/composables/useFeatureToggles";
import axios from "axios";

// Typen für globale Funktionen
export interface TelemetryFunctions {
  trackEvent: (eventName: string, data?: Record<string, any>) => void;
  trackError: (error: Error, context?: Record<string, any>) => void;
  trackPerformance: (
    metricName: string,
    durationMs: number,
    context?: Record<string, any>,
  ) => void;
  trackSession: (sessionId: string) => void;
}

export interface ABTestingFunctions {
  getVariant: (testName: string) => string;
  trackConversion: (
    testName: string,
    conversionType: string,
    value?: number,
  ) => void;
  registerTest: (
    testName: string,
    variants: string[],
    weights?: number[],
  ) => void;
  isActive: (testName: string) => boolean;
  getAllTests: () => Record<string, any>;
}

// Logger für Debugging
const { warn, info } = useLogger("globalFunctionsBridge");

/**
 * Initialisiert alle globalen Funktionen für Legacy-Code
 */
export function initializeGlobalFunctions(): void {
  info("Initialisiere globale Funktionen für Legacy-Code-Kompatibilität");

  // Prüfe, ob wir im Browser sind
  if (typeof window === "undefined") {
    warn("Globale Funktionen können nur im Browser initialisiert werden");
    return;
  }

  // Initialisiere Axios als globales Objekt für Legacy-Code
  if (!window.axios) {
    window.axios = axios;
    info("Axios als globales Objekt registriert");
  }

  // Initialisiere Source References Funktionen
  initializeSourceReferencesFunctions();

  // Initialisiere Telemetrie-Funktionen
  initializeTelemetryFunctions();

  // Initialisiere AB-Testing-Funktionen
  initializeABTestingFunctions();

  // Chat-Funktionen
  initializeChatFunctions();

  // Weitere Legacy-Funktionen
  initializeMiscLegacyFunctions();

  info("Alle globalen Funktionen für Legacy-Code erfolgreich initialisiert");
}

/**
 * Initialisiert die globalen Funktionen für Quellennachweise
 */
function initializeSourceReferencesFunctions(): void {
  if (
    typeof window.isSourceReferencesVisible === "function" &&
    typeof window.toggleSourceReferences === "function" &&
    typeof window.showSourceReferencesForMessage === "function" &&
    typeof window.hideSourceReferences === "function"
  ) {
    info("Source References Funktionen sind bereits registriert");
    return;
  }

  // Store für späteren Zugriff
  let sourcesStore: ReturnType<typeof useSourcesStore> | null = null;

  // Funktion, um den Store bei Bedarf zu initialisieren
  const getStore = () => {
    if (!sourcesStore) {
      try {
        sourcesStore = useSourcesStore();
      } catch (error) {
        warn("Fehler beim Initialisieren des Sources-Store:", error);
        // Fallback für den Fall, dass der Store nicht initialisiert werden kann
        return {
          currentSourceReferences: {},
          loadingState: {},
          errorState: {},
          currentMessageId: null,
          showSourcesModal: false,
          showExplanationModal: false,
          $patch: () => {},
          showSourcesForMessage: () => {},
          hideSourcesModal: () => {},
        };
      }
    }
    return sourcesStore;
  };

  // Globale Funktionen bereitstellen mit besserer Fehlerbehandlung
  window.isSourceReferencesVisible = (message?: any) => {
    try {
      // Wenn die Funktion bereits durch den sourceReferenceAdapter definiert wurde,
      // führe keine Neudefinition durch
      if (typeof window.__sourceReferencesComposable !== "undefined") {
        return message
          ? window.__sourceReferencesComposable.isSourceReferencesVisible(
              message,
            )
          : false;
      }

      // Store-basierte Implementierung
      const store = getStore();
      return store.showSourcesModal;
    } catch (error) {
      warn("Fehler in isSourceReferencesVisible:", error);
      return false; // Sicherer Fallback-Wert
    }
  };

  window.toggleSourceReferences = () => {
    const store = getStore();
    store.showSourcesModal = !store.showSourcesModal;
  };

  window.showSourceReferencesForMessage = (
    messageId: string,
    sources?: SourceReference[],
  ) => {
    const store = getStore();

    // Wenn Quellen direkt übergeben werden, diese im Store speichern
    if (sources && sources.length > 0) {
      store.$patch((state) => {
        state.currentSourceReferences[messageId] = sources;
      });
    }

    store.showSourcesForMessage(messageId);
  };

  window.hideSourceReferences = () => {
    getStore().hideSourcesModal();
  };

  info("Source References Funktionen global registriert");
}

/**
 * Initialisiert die globalen Telemetrie-Funktionen
 */
function initializeTelemetryFunctions(): void {
  if (window.telemetry) {
    info("Telemetrie-Funktionen sind bereits registriert");
    return;
  }

  // Einfache Telemetrie-Implementierung
  window.telemetry = {
    trackEvent: (eventName: string, data = {}) => {
      info(`Telemetrie Event: ${eventName}`, data);
      // In einer echten Implementierung würde hier ein API-Aufruf erfolgen
      console.debug("[Telemetry]", eventName, data);
    },

    trackError: (error: Error, context = {}) => {
      warn(`Telemetrie Error: ${error.message}`, context);
      // In einer echten Implementierung würde hier ein API-Aufruf erfolgen
      console.debug("[Telemetry Error]", error, context);
    },

    trackPerformance: (
      metricName: string,
      durationMs: number,
      context = {},
    ) => {
      info(`Telemetrie Performance: ${metricName} (${durationMs}ms)`, context);
      // In einer echten Implementierung würde hier ein API-Aufruf erfolgen
      console.debug("[Telemetry Performance]", metricName, durationMs, context);
    },

    trackSession: (sessionId: string) => {
      info(`Telemetrie Session: ${sessionId}`);
      // In einer echten Implementierung würde hier ein API-Aufruf erfolgen
      console.debug("[Telemetry Session]", sessionId);
    },
  };

  info("Telemetrie-Funktionen global registriert");
}

/**
 * Initialisiert die globalen AB-Testing-Funktionen
 */
function initializeABTestingFunctions(): void {
  if (window.abTesting) {
    info("AB-Testing-Funktionen sind bereits registriert");
    return;
  }

  // Lokaler Speicher für AB-Tests
  const activeTests: Record<
    string,
    {
      variants: string[];
      weights: number[];
      active: boolean;
    }
  > = {};

  // Hilfsfunktion zur Auswahl einer gewichteten Zufallsvariante
  const getWeightedRandomVariant = (
    variants: string[],
    weights: number[],
  ): string => {
    const totalWeight = weights.reduce((acc, weight) => acc + weight, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < variants.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return variants[i];
      }
    }

    return variants[0]; // Fallback
  };

  // AB-Testing-Funktionen
  window.abTesting = {
    getVariant: (testName: string): string => {
      // Prüfen, ob der Test existiert
      if (!activeTests[testName]) {
        warn(`AB-Test "${testName}" existiert nicht`);
        return "control";
      }

      // Prüfen, ob der Test aktiv ist
      if (!activeTests[testName].active) {
        return "control";
      }

      // Bestehenden Wert aus LocalStorage lesen
      const storageKey = `ab_test_${testName}`;
      const storedVariant = localStorage.getItem(storageKey);

      if (storedVariant) {
        return storedVariant;
      }

      // Neue Variante auswählen
      const test = activeTests[testName];
      const variant = getWeightedRandomVariant(test.variants, test.weights);

      // Variante speichern
      localStorage.setItem(storageKey, variant);

      return variant;
    },

    trackConversion: (
      testName: string,
      conversionType: string,
      value?: number,
    ): void => {
      // Prüfen, ob der Test existiert
      if (!activeTests[testName]) {
        warn(`AB-Test "${testName}" existiert nicht`);
        return;
      }

      const variant = window.abTesting?.getVariant(testName) || "control";

      // Konversionen in Telemetrie tracken
      window.telemetry?.trackEvent("ab_test_conversion", {
        testName,
        variant,
        conversionType,
        value,
      });
    },

    registerTest: (
      testName: string,
      variants: string[],
      weights?: number[],
    ): void => {
      // Standardgewichte, wenn keine angegeben sind
      const normalizedWeights = weights || variants.map(() => 1);

      // Test registrieren
      activeTests[testName] = {
        variants,
        weights: normalizedWeights,
        active: true,
      };
    },

    isActive: (testName: string): boolean => {
      return !!activeTests[testName]?.active;
    },

    getAllTests: (): Record<string, any> => {
      return { ...activeTests };
    },
  };

  // Featuretoggles zum Aktivieren/Deaktivieren von AB-Tests
  try {
    const { getFeatureState } = useFeatureToggles();

    // Featuretoggle für AB-Tests prüfen
    const abTestingEnabled = getFeatureState("enableABTesting");

    if (!abTestingEnabled) {
      window.abTesting.getVariant = () => "control";
      window.abTesting.trackConversion = () => {};
      info("AB-Testing durch Feature-Toggle deaktiviert");
    }
  } catch (error) {
    warn("Fehler beim Prüfen des Feature-Toggles für AB-Testing:", error);
  }

  info("AB-Testing-Funktionen global registriert");
}

/**
 * Initialisiert die globalen Chat-Funktionen
 */
function initializeChatFunctions(): void {
  if (
    typeof window.sendQuestion === "function" &&
    typeof window.sendQuestionStream === "function"
  ) {
    info("Chat-Funktionen sind bereits registriert");
    return;
  }

  // Einfache Implementierung von Chat-Funktionen
  window.sendQuestion = async (question: string, sessionId?: string) => {
    info(
      `Sende Frage: ${question}${sessionId ? ` (Session: ${sessionId})` : ""}`,
    );

    try {
      // API-Anfrage simulieren
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Erfolgreiche Antwort simulieren
      return {
        id: `resp-${Date.now()}`,
        text: `Antwort auf: ${question}`,
        sources: [],
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Fehler beim Senden der Frage:", error);
      throw error;
    }
  };

  window.sendQuestionStream = async (
    question: string,
    sessionId?: string,
    onChunk?: (chunk: string) => void,
    onError?: (error: Error) => void,
    onComplete?: () => void,
  ) => {
    info(
      `Sende Streaming-Frage: ${question}${sessionId ? ` (Session: ${sessionId})` : ""}`,
    );

    // Simulate EventSource for streaming
    const mockEventSource = {
      addEventListener: (event: string, callback: (e: any) => void) => {
        if (event === "message") {
          // Simulate message events
          const chunks = [
            "Dies ist ",
            "eine simulierte ",
            "Streaming-Antwort ",
            "auf die Frage: ",
            question,
          ];

          chunks.forEach((chunk, index) => {
            setTimeout(() => {
              if (onChunk) onChunk(chunk);
              callback({ data: chunk });
            }, index * 300);
          });

          // Simulate completion
          setTimeout(
            () => {
              if (onComplete) onComplete();
              callback({ event: "complete" });
            },
            chunks.length * 300 + 100,
          );
        }
      },
      close: () => {
        // Nothing to do in mock
        info("Streaming-Verbindung geschlossen");
      },
    };

    return mockEventSource as any;
  };

  info("Chat-Funktionen global registriert");
}

/**
 * Initialisiert weitere Legacy-Funktionen
 */
function initializeMiscLegacyFunctions(): void {
  // Fügen Sie hier weitere Legacy-Funktionen hinzu, die global benötigt werden

  // MOTD-Formatter
  if (typeof window.formatMotdContent !== "function") {
    window.formatMotdContent = (content: string): string => {
      if (!content) return "";

      // Simple markdown-like formatting
      return content
        .replace(/\n/g, "<br>")
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        .replace(/`(.*?)`/g, "<code>$1</code>")
        .replace(
          /\[([^\]]+)\]\(([^)]+)\)/g,
          '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
        );
    };

    info("MOTD-Formatter-Funktion global registriert");
  }

  // Debug-Funktionen
  if (typeof window.debug !== "object") {
    window.debug = {
      log: (...args: any[]) => {
        if (process.env.NODE_ENV === "development") {
          console.log("[Debug]", ...args);
        }
      },

      error: (...args: any[]) => {
        if (process.env.NODE_ENV === "development") {
          console.error("[Debug Error]", ...args);
        }
      },

      warn: (...args: any[]) => {
        if (process.env.NODE_ENV === "development") {
          console.warn("[Debug Warning]", ...args);
        }
      },

      info: (...args: any[]) => {
        if (process.env.NODE_ENV === "development") {
          console.info("[Debug Info]", ...args);
        }
      },
    };

    info("Debug-Funktionen global registriert");
  }
}

// Typdefinitionen für globale Funktionen
declare global {
  interface Window {
    // Source References Composable
    __sourceReferencesComposable?: any;

    // Source References
    isSourceReferencesVisible: (message?: any) => boolean;
    toggleSourceReferences: (message?: any) => void;
    showSourceReferencesForMessage: (
      messageId: string,
      sources?: SourceReference[],
    ) => void;
    hideSourceReferences: () => void;

    // Telemetrie
    telemetry?: TelemetryFunctions;

    // AB-Testing
    abTesting?: ABTestingFunctions;

    // Chat-Funktionen
    sendQuestion: (question: string, sessionId?: string) => Promise<any>;
    sendQuestionStream: (
      question: string,
      sessionId?: string,
      onChunk?: (chunk: string) => void,
      onError?: (error: Error) => void,
      onComplete?: () => void,
    ) => any;

    // Legacy-Funktionen
    formatMotdContent: (content: string) => string;
    debug: {
      log: (...args: any[]) => void;
      error: (...args: any[]) => void;
      warn: (...args: any[]) => void;
      info: (...args: any[]) => void;
    };

    // Axios
    axios: typeof axios;

    // Weitere Legacy-Variablen und Funktionen
    APP_CONFIG: any;
    ENVIRONMENT: string;
    BUILD_VERSION: string;
    [key: string]: any;
  }
}
