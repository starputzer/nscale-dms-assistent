/**
 * Mock Service Provider
 *
 * Dieses Plugin registriert die Mock-Services (oder die realen Services) in der
 * Vue-Anwendung und stellt sie den Komponenten zur Verfügung.
 */

import { App, reactive } from "vue";
import { mockServiceFactory } from "@/services/mocks/MockServiceFactory";
// Import des Mock Session Stores wenn mockApi=true
const useMockApi =
  new URLSearchParams(window.location.search).get("mockApi") === "true";

export const mockServiceProvider = {
  install(app: App) {
    console.log("Initialisiere Mock Service Provider...");

    // Prüfen, ob der Mock-API-Modus aktiv ist
    const useMockApi =
      new URLSearchParams(window.location.search).get("mockApi") === "true";

    // AuthService initialisieren/registrieren
    if (useMockApi) {
      console.log("Aktiviere Mock-Auth-Service");
      // AuthService wird durch die Store direkt bereitgestellt
      // Stelle sicher, dass der Mock-Auth-Store geladen wird
      import("../stores/auth.mock")
        .then(({ useAuthStore }) => {
          console.log("Mock Auth Store erfolgreich geladen");
        })
        .catch((error) => {
          console.error("Fehler beim Laden des Mock Auth Stores:", error);
        });
    }

    // Mock-Services über app.provide() bereitstellen
    const chatService = mockServiceFactory.getChatService();
    app.provide("chatService", chatService);

    // globalProperties registrieren (für Options API)
    app.config.globalProperties.$chatService = chatService;

    // Event-Bus-Zugriff für den Chat-Service
    window.$chatService = chatService;

    // Bereitstellung einer globalen isSourceReferencesVisible Funktion,
    // da diese auch im Pure-Vue-Modus benötigt wird
    console.log(
      "Registriere globale Fallback-Funktionen für Source References...",
    );

    // Reaktiver Zustand für Source References Tracking
    const sourceReferencesState = reactive({
      visibleReferences: new Map(),
      loadingReferences: new Map(),
      referenceDetails: new Map(),
    });

    // Ein minimales Composable für Source References
    const sourceRefsComposable = {
      isSourceReferencesVisible: (message) => {
        if (!message || !message.id) return false;
        return sourceReferencesState.visibleReferences.has(message.id);
      },
      toggleSourceReferences: (message) => {
        if (!message || !message.id) return;
        const messageId = message.id;
        if (sourceReferencesState.visibleReferences.has(messageId)) {
          sourceReferencesState.visibleReferences.delete(messageId);
        } else {
          sourceReferencesState.visibleReferences.set(messageId, true);
        }
      },
      getSourceReferences: (message) => {
        if (!message || !message.id) return [];
        return sourceReferencesState.referenceDetails.get(message.id) || [];
      },
      hasSourceReferences: (content) => {
        if (!content) return false;
        return (
          /\(Quelle-\d+\)/.test(content) ||
          /Dokument \d+/.test(content) ||
          /Quelle(n)?:/.test(content) ||
          /Abschnitt/.test(content) ||
          /aus nscale/.test(content) ||
          content.includes("[[src:")
        );
      },
    };

    // Globales Objekt für Source References registrieren (für Legacy-Code)
    window.__sourceReferencesComposable = sourceRefsComposable;

    // Globale Funktionen für Legacy-Code registrieren
    window.isSourceReferencesVisible = (message) => {
      console.log("[Mock] isSourceReferencesVisible called", message);
      return sourceRefsComposable.isSourceReferencesVisible(message);
    };

    window.toggleSourceReferences = (message) => {
      console.log("[Mock] toggleSourceReferences called", message);
      return sourceRefsComposable.toggleSourceReferences(message);
    };

    window.getSourceReferences = (message) => {
      console.log("[Mock] getSourceReferences called", message);
      return sourceRefsComposable.getSourceReferences(message);
    };

    window.hasSourceReferences = (content) => {
      console.log("[Mock] hasSourceReferences called");
      return sourceRefsComposable.hasSourceReferences(content);
    };

    // Provide the source references composable to Vue components
    app.provide("sourceReferences", sourceRefsComposable);

    // Wenn MockApi aktiv ist, die Mock Stores laden
    if (useMockApi) {
      console.log("Lade Mock Stores...");

      // Session Store
      import("../stores/sessions.mock")
        .then(({ useSessionStore }) => {
          console.log("Mock Session Store erfolgreich geladen");
        })
        .catch((error) => {
          console.error("Fehler beim Laden des Mock Session Stores:", error);
        });

      // Admin Stores
      // MOTD Store
      import("../stores/admin/motd.mock")
        .then(({ useMotdStore }) => {
          console.log("Mock MOTD Store erfolgreich geladen");
        })
        .catch((error) => {
          console.error("Fehler beim Laden des Mock MOTD Stores:", error);
        });

      // Feedback Store
      import("../stores/admin/feedback.mock")
        .then(({ useFeedbackStore }) => {
          console.log("Mock Feedback Store erfolgreich geladen");
        })
        .catch((error) => {
          console.error("Fehler beim Laden des Mock Feedback Stores:", error);
        });
    }

    console.log("Mock Service Provider erfolgreich initialisiert");
  },
};

export default mockServiceProvider;
