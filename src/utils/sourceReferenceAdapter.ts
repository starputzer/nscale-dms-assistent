/**
 * Source Reference Adapter
 *
 * Diese Datei bietet Kompatibilität zwischen dem alten globalen Window-basierten Ansatz
 * und dem neuen Vue 3 Composition API-basierten Ansatz für Quellenreferenzen.
 *
 * @module sourceReferenceAdapter
 */

import { reactive } from "vue";
import { useSourcesStore } from "@/stores/sources";
import { useSourceReferences } from "@/composables/useSourceReferences";

/**
 * Globale Platzhalter-Funktionen mit Fehlerbehandlung
 * Diese dienen als Fallback für den Fall dass die eigentlichen
 * Funktionen nicht verfügbar sind
 */
function setupFallbackFunctions() {
  // Erstelle ein Singleton-Composable-Objekt
  const safeComposable = useSourceReferences();

  // Globales Objekt als Fallback für die Legacy-Integration
  (window as any).__sourceReferencesComposable = safeComposable;

  // Wir prüfen, ob die globalen Methoden bereits existieren, bevor wir sie definieren
  if (typeof (window as any).isSourceReferencesVisible !== "function") {
    (window as any).isSourceReferencesVisible = (message: any) => {
      console.warn(
        "[sourceReferenceAdapter] Fallback-Funktion isSourceReferencesVisible verwendet",
      );
      try {
        // Verwende das sichere Composable
        return safeComposable.isSourceReferencesVisible(message);
      } catch (error) {
        console.error(
          "[sourceReferenceAdapter] Fehler in Fallback-Funktion isSourceReferencesVisible:",
          error,
        );
        return false;
      }
    };
  }

  if (typeof (window as any).isLoadingSourceReferences !== "function") {
    (window as any).isLoadingSourceReferences = (message: any) => {
      console.warn(
        "[sourceReferenceAdapter] Fallback-Funktion isLoadingSourceReferences verwendet",
      );
      try {
        return safeComposable.isLoadingSourceReferences(message);
      } catch (error) {
        console.error(
          "[sourceReferenceAdapter] Fehler in Fallback-Funktion isLoadingSourceReferences:",
          error,
        );
        return false;
      }
    };
  }

  if (typeof (window as any).getSourceReferences !== "function") {
    (window as any).getSourceReferences = (message: any) => {
      console.warn(
        "[sourceReferenceAdapter] Fallback-Funktion getSourceReferences verwendet",
      );
      try {
        return safeComposable.getSourceReferences(message);
      } catch (error) {
        console.error(
          "[sourceReferenceAdapter] Fehler in Fallback-Funktion getSourceReferences:",
          error,
        );
        return [];
      }
    };
  }

  if (typeof (window as any).toggleSourceReferences !== "function") {
    (window as any).toggleSourceReferences = (message: any) => {
      console.warn(
        "[sourceReferenceAdapter] Fallback-Funktion toggleSourceReferences verwendet",
      );
      try {
        return safeComposable.toggleSourceReferences(message);
      } catch (error) {
        console.error(
          "[sourceReferenceAdapter] Fehler in Fallback-Funktion toggleSourceReferences:",
          error,
        );
      }
    };
  }

  console.log("[sourceReferenceAdapter] Fallback-Funktionen initialisiert");
}

/**
 * Initialisiert den Source Reference Adapter
 * Die Funktion stellt die globalen Funktionen für das Legacy-System bereit und
 * verbindet sie mit den modernen Vue 3 Composition API-Funktionen
 *
 * AKTUALISIERT mit Unterstützung für das verbesserte globale Source-References-System
 */
export function initializeSourceReferenceAdapter() {
  console.log(
    "[sourceReferenceAdapter] Initialisierung des Source Reference Adapters...",
  );

  // Fallback-Funktionen sofort einrichten
  setupFallbackFunctions();

  try {
    // Source References Composable initialisieren
    const composableInstance = useSourceReferences();

    // Direkter Zugriff auf die lokale Zustandsvariablen für die Brücke
    const {
      isLoadingSourceReferences,
      getSourceReferences,
      isSourceDetailOpen,
      toggleSourceDetail,
      toggleSourceReferences,
      showSourcePopupHandler,
      closeSourcePopup,
      visibleSourceReferences,
    } = composableInstance;

    // VERBESSERTE IMPLEMENTIERUNG:
    // Prüfen ob die globalen Funktionen bereits vorhanden sind,
    // falls ja, nutzen wir diese Implementierungen und synchronisieren sie mit dem Composable
    if (typeof (window as any).__sourceReferencesState !== "undefined") {
      console.log(
        "[sourceReferenceAdapter] Globales Source-References-System gefunden, synchronisiere...",
      );

      // Synchronisieren des initialen Zustands
      try {
        // Für jedes Objekt im globalen State...
        const globalVisibleRefs =
          (window as any).__sourceReferencesState.visibleSourceReferences || {};

        // Synchronisieren: Aus global nach lokal
        Object.keys(globalVisibleRefs).forEach((messageId: any) => {
          if (globalVisibleRefs[messageId] && visibleSourceReferences.value) {
            visibleSourceReferences.value[messageId] =
              globalVisibleRefs[messageId];
          }
        });

        console.log("[sourceReferenceAdapter] Zustand synchronisiert:", {
          globalState: (window as any).__sourceReferencesState
            .visibleSourceReferences,
          localState: visibleSourceReferences.value,
        });

        // Event-Listener für Synchronisation einrichten
        window.addEventListener("sourceReferencesToggled", ((
          event: CustomEvent,
        ) => {
          try {
            const { messageId, visible } = event.detail;
            if (messageId && visibleSourceReferences.value) {
              console.log(
                "[sourceReferenceAdapter] Event sourceReferencesToggled empfangen:",
                messageId,
                visible,
              );
              visibleSourceReferences.value[messageId] = visible;
            }
          } catch (error) {
            console.error(
              "[sourceReferenceAdapter] Fehler bei Event-Verarbeitung:",
              error,
            );
          }
        }) as EventListener);
      } catch (error) {
        console.error(
          "[sourceReferenceAdapter] Fehler bei der Synchronisierung mit globalem Zustand:",
          error,
        );
      }
    }
    // Sonst: Unsere eigenen Funktionen registrieren, aber nur wenn sie nicht schon existieren
    else {
      // Globale Hilfsfunktionen für den direkten Zugriff - nur registrieren, wenn noch nicht vorhanden
      if (typeof (window as any).isSourceReferencesVisible !== "function") {
        (window as any).isSourceReferencesVisible = (message: any) => {
          // Fallback für den Fall, dass message undefined oder null ist
          if (!message) {
            console.warn(
              "[sourceReferenceAdapter] isSourceReferencesVisible: message is undefined or null",
            );
            return false;
          }

          try {
            console.log(
              "[sourceReferenceAdapter] isSourceReferencesVisible aufgerufen",
              message,
            );
            // Wir verwenden composableInstance.isSourceReferencesVisible direkt
            return composableInstance.isSourceReferencesVisible(message);
          } catch (error) {
            console.error(
              "[sourceReferenceAdapter] Fehler in isSourceReferencesVisible:",
              error,
            );
            // Bei Fehler konservativ false zurückgeben
            return false;
          }
        };
      }

      if (typeof (window as any).isLoadingSourceReferences !== "function") {
        (window as any).isLoadingSourceReferences = (message: any) => {
          console.log(
            "[sourceReferenceAdapter] isLoadingSourceReferences aufgerufen",
            message,
          );
          return isLoadingSourceReferences(message);
        };
      }

      if (typeof (window as any).getSourceReferences !== "function") {
        (window as any).getSourceReferences = (message: any) => {
          console.log(
            "[sourceReferenceAdapter] getSourceReferences aufgerufen",
            message,
          );
          return getSourceReferences(message);
        };
      }

      if (typeof (window as any).isSourceDetailOpen !== "function") {
        (window as any).isSourceDetailOpen = (
          message: any,
          sourceIndex: number,
        ) => {
          console.log(
            "[sourceReferenceAdapter] isSourceDetailOpen aufgerufen",
            message,
            sourceIndex,
          );
          return isSourceDetailOpen(message, _sourceIndex);
        };
      }

      if (typeof (window as any).toggleSourceDetail !== "function") {
        (window as any).toggleSourceDetail = (
          message: any,
          sourceIndex: number,
        ) => {
          console.log(
            "[sourceReferenceAdapter] toggleSourceDetail aufgerufen",
            message,
            sourceIndex,
          );
          toggleSourceDetail(message, _sourceIndex);
        };
      }

      if (typeof (window as any).toggleSourceReferences !== "function") {
        (window as any).toggleSourceReferences = async (message: any) => {
          console.log(
            "[sourceReferenceAdapter] toggleSourceReferences aufgerufen",
            message,
          );
          toggleSourceReferences(message);
        };
      }

      if (typeof (window as any).showSourcePopupHandler !== "function") {
        (window as any).showSourcePopupHandler = (
          event: MouseEvent,
          sourceId: string,
        ) => {
          console.log(
            "[sourceReferenceAdapter] showSourcePopupHandler aufgerufen",
            sourceId,
          );
          showSourcePopupHandler(event, sourceId);
        };
      }

      if (typeof (window as any).closeSourcePopup !== "function") {
        (window as any).closeSourcePopup = () => {
          console.log("[sourceReferenceAdapter] closeSourcePopup aufgerufen");
          closeSourcePopup();
        };
      }
    }

    // Tracking-Funktion für alte Funktionsaufrufe
    function trackLegacyUsage(functionName: string) {
      if (typeof (window as any).telemetry !== "undefined") {
        (window as any).telemetry.trackEvent("source_reference_legacy_usage", {
          function: functionName,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Wrapper für alle Funktionen mit Tracking OHNE die Originalfunktionen zu überschreiben
    const functionsToTrack = [
      "isSourceReferencesVisible",
      "isLoadingSourceReferences",
      "getSourceReferences",
      "isSourceDetailOpen",
      "toggleSourceDetail",
      "toggleSourceReferences",
    ];

    functionsToTrack.forEach((key: any) => {
      const originalFunction = (window as any)[key];
      // Nur wenn die Funktion existiert und nicht bereits getracked wird
      if (
        typeof originalFunction === "function" &&
        !originalFunction.__isTracked
      ) {
        (window as any)[key] = function (...args: any[]) {
          trackLegacyUsage(key);
          return originalFunction.apply(this, args);
        };
        (window as any)[key].__isTracked = true;
      }
    });

    // Erfolgsmeldung
    console.log(
      "[sourceReferenceAdapter] Source Reference Adapter erfolgreich initialisiert!",
    );

    // Debug-Info ausgeben
    const functionStatus: Record<string, boolean> = {};
    functionsToTrack.forEach((fn: any) => {
      functionStatus[fn] = typeof (window as any)[fn] === "function";
    });
    console.log(
      "[sourceReferenceAdapter] Verfügbare Funktionen:",
      functionStatus,
    );
  } catch (error) {
    console.error(
      "[sourceReferenceAdapter] Fehler bei der Initialisierung des Source Reference Adapters:",
      error,
    );
    // Fallback-Funktionen bleiben aktiv, wenn es einen Fehler bei der Initialisierung gibt
  }
}

// Sofortige Ausführung der Fallback-Funktion, um sicherzustellen, dass globale Funktionen immer verfügbar sind
setupFallbackFunctions();

export default {
  initializeSourceReferenceAdapter,
};
