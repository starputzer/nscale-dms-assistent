/**
 * @deprecated Diese Legacy-Komponente ist veraltet und wird in Kürze entfernt.
 * Verwende stattdessen die Vue 3 SFC-Implementierung.
 * Geplantes Entfernungsdatum: 2025-06-10
 */

/**
 * app-extensions.js - Verbesserungen für nScale DMS Assistent
 *
 * Diese Datei enthält Erweiterungen und Bugfixes für den nScale DMS Assistenten,
 * die folgende Probleme beheben:
 *
 * 1. Nachrichtenaktionen (Feedback/Quellen) bleiben während des Streamings unsichtbar
 * 2. message_id Debug-Informationen werden aus dem UI entfernt
 * 3. Verbesserte Titelgenerierung, besonders für kurze Nachrichten
 * 4. Klickbare Quellenreferenzen mit Popup-Funktionalität
 * 5. Robustere Fehlerbehandlung für die Erklärungsfunktion
 */

/**
 * Entfernt die Debug-Informationen zur message_id aus dem DOM
 */

// Monitoring für Legacy-Code-Nutzung
function trackLegacyUsage(componentName, action) {
  if (typeof window.telemetry !== "undefined") {
    window.telemetry.trackEvent("legacy_code_usage", {
      component: componentName,
      action: action,
      timestamp: new Date().toISOString(),
    });
  }
}

// Tracking bei Modulinitialisierung
trackLegacyUsage("app-extensions", "initialize");

function removeMessageIdDebugInfo() {
  // Führe die Funktion in regelmäßigen Abständen aus, um auch dynamisch hinzugefügte Elemente zu erfassen
  setInterval(() => {
    // Finde alle Elemente mit dem Debug-Text zur message_id
    const debugElements = document.querySelectorAll(
      'div[style*="font-size: 10px"][style*="color: gray"]',
    );

    debugElements.forEach((element) => {
      // Prüfe, ob der Text "message_id:" enthält
      if (element.textContent && element.textContent.includes("message_id:")) {
        // Debug-Element ausblenden
        element.style.display = "none";
      }
    });
  }, 1000); // Alle Sekunde prüfen
}

/**
 * Verbessert die Anzeige von Nachrichtenaktionen (Feedback-Buttons, Quellenbuttons)
 * nach dem Streaming.
 */
function enhanceMessageActions() {
  // Klasse am body-Element hinzufügen/entfernen basierend auf Streaming-Status
  const checkStreamingState = () => {
    // Zugriff auf Vue-App und isStreaming-Status
    if (
      window.app &&
      window.app.$data &&
      window.app.$data.isStreaming !== undefined
    ) {
      const isStreaming = window.app.$data.isStreaming;

      // Setze/entferne die Klasse basierend auf dem Streaming-Status
      if (isStreaming) {
        document.body.classList.add("is-streaming");
      } else {
        document.body.classList.remove("is-streaming");

        // Nach Streaming-Ende alle message-actions einblenden
        setTimeout(() => {
          document.querySelectorAll(".message-actions").forEach((elem) => {
            elem.style.opacity = "1";
          });
        }, 500); // Kurze Verzögerung für bessere Benutzererfahrung
      }
    }
  };

  // Regelmäßig den Streaming-Status prüfen
  setInterval(checkStreamingState, 500);
}

/**
 * Verbessert die Titelgenerierung für kurze Nachrichten
 */
function enhanceTitleGeneration() {
  // Überschreibe die automatische Titelgenerierung
  if (window.updateSessionTitle) {
    const originalUpdateTitle = window.updateSessionTitle;

    window.updateSessionTitle = async function (sessionId) {
      try {
        // Originalmethode aufrufen
        const result = await originalUpdateTitle(sessionId);

        // Nach jedem Streaming die Sitzungsliste neu laden
        if (window.app && window.app.loadSessions) {
          await window.app.loadSessions();
        }

        return result;
      } catch (error) {
        console.error("Fehler bei verbesserter Titelgenerierung:", error);
        // Originalmethode im Fehlerfall aufrufen
        return await originalUpdateTitle(sessionId);
      }
    };
  }

  // Nach Streaming-Ende automatisch den Titel aktualisieren
  const watchStreamingForTitleUpdate = () => {
    // Zugriff auf Vue-App und isStreaming-Status
    if (window.app && window.app.$data) {
      const isStreaming = window.app.$data.isStreaming;
      const currentSessionId = window.app.$data.currentSessionId;

      // Wenn Streaming gerade beendet wurde, Titel aktualisieren
      if (isStreaming === false && currentSessionId) {
        // Suche die aktuelle Sitzung
        const sessions = window.app.$data.sessions || [];
        const currentSession = sessions.find((s) => s.id === currentSessionId);

        // Nur aktualisieren, wenn der Titel noch "Neue Unterhaltung" ist
        if (currentSession && currentSession.title === "Neue Unterhaltung") {
          console.log(
            "Streaming beendet, aktualisiere Titel für 'Neue Unterhaltung'",
          );

          // Verzögerung für Server-Kommunikation
          setTimeout(() => {
            if (window.updateSessionTitle) {
              window.updateSessionTitle(currentSessionId);
            }
          }, 1000);
        }
      }
    }
  };

  // Regelmäßig prüfen
  setInterval(watchStreamingForTitleUpdate, 1000);
}

/**
 * Verbessert die Quellenreferenzen-Funktionalität durch Popup-Anzeige
 */
function enhanceSourceReferences() {
  // Globales Objekt für die Quellenverwaltung
  window.sourceRefState = {
    showSourcePopup: false,
    sourcePopupContent: {
      title: "",
      text: "",
      file: "",
      sourceId: "",
    },
    sourcePopupPosition: {
      top: 0,
      left: 0,
    },
  };

  // Handler für Klicks auf Quellenreferenzen
  const originalHandler = window.showSourcePopupHandler;
  window.showSourcePopupHandler = function (event, sourceId) {
    // Position des Popups berechnen
    const rect = event.target.getBoundingClientRect();

    // Globalen Zustand aktualisieren
    window.sourceRefState.sourcePopupPosition = {
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
    };

    // Vorläufigen Inhalt setzen
    window.sourceRefState.sourcePopupContent = {
      title: `Quelle ${sourceId}`,
      text: "Lade Quelleninformationen...",
      sourceId: sourceId,
    };

    // Popup anzeigen
    window.sourceRefState.showSourcePopup = true;

    // Popup-Container aktualisieren
    renderSourcePopup();

    // Versuche den originalen Handler aufzurufen, wenn vorhanden
    if (typeof originalHandler === "function") {
      try {
        originalHandler(event, sourceId);
      } catch (e) {
        console.error("Fehler beim Aufrufen des originalen Handlers:", e);
        // Fallback-Text im Popup anzeigen
        window.sourceRefState.sourcePopupContent.text =
          "Dieses Feature ist gerade in Entwicklung. Bitte benutzen Sie die 'Antwort erklären'-Funktion für detaillierte Quellenangaben.";
        // Popup aktualisieren
        renderSourcePopup();
      }
    }
  };

  // Funktion zum Schließen des Popups
  window.closeSourcePopup = () => {
    window.sourceRefState.showSourcePopup = false;

    // Popup-Container aktualisieren
    renderSourcePopup();
  };

  // Container für Quellen-Popup erstellen oder aktualisieren
  function renderSourcePopup() {
    let popupContainer = document.getElementById("source-popup-container");

    if (!popupContainer) {
      // Erstelle den Container und füge ihn zum DOM hinzu
      popupContainer = document.createElement("div");
      popupContainer.id = "source-popup-container";
      document.body.appendChild(popupContainer);
    }

    const state = window.sourceRefState;

    if (!state.showSourcePopup) {
      popupContainer.innerHTML = "";
      return;
    }

    const position = state.sourcePopupPosition;
    const content = state.sourcePopupContent;

    popupContainer.innerHTML = `
            <div class="source-popup" style="top: ${position.top}px; left: ${position.left}px;">
                <div class="source-popup-title">${content.title || "Quellendetails"}</div>
                ${content.file ? `<div class="source-popup-file">Datei: ${content.file}</div>` : ""}
                <div class="source-popup-content">${content.text || "Keine Informationen verfügbar"}</div>
                <div class="source-popup-close" onclick="window.closeSourcePopup()">Schließen</div>
            </div>
        `;
  }
}

/**
 * Behebt Fehler in der Erklärungsfunktion
 */
function fixExplanationErrors() {
  // Warten bis das Originalobjekt existiert
  const waitForObject = setInterval(() => {
    if (window.loadExplanation) {
      clearInterval(waitForObject);

      // Original-Funktion speichern
      const originalLoadExplanation = window.loadExplanation;

      // Überschreiben mit verbesserter Fehlerbehandlung
      window.loadExplanation = async function (message) {
        try {
          // Überprüfen, ob Quellenreferenzen vorhanden sind
          if (
            !message ||
            !message.message ||
            !window.hasSourceReferences ||
            !window.hasSourceReferences(message.message)
          ) {
            console.log("Keine Quellenreferenzen in der Nachricht gefunden");

            // Statt Fehler anzuzeigen, zeigen wir eine freundliche Meldung
            if (window.showExplanationDialog !== undefined) {
              window.showExplanationDialog = true;
            }

            if (window.currentExplanation !== undefined) {
              window.currentExplanation = {
                original_question: message?.message || "Keine Frage gefunden",
                explanation_text:
                  "Für diese Antwort sind keine Quellen verfügbar. Die Antwort wurde basierend auf dem allgemeinen Wissen des Assistenten generiert.",
                source_references: [],
              };
            }
            return;
          }

          // Prüfe, ob message_id vorhanden ist
          if (!message.id) {
            console.log("Keine gültige message_id für Erklärung vorhanden");

            // Wir verwenden einen Timestamp als temporäre ID
            message.id = Date.now();
            console.log(`Verwende temporäre message_id: ${message.id}`);
          }

          // Rufe die Original-Funktion auf, mit Fehlerbehandlung
          return await originalLoadExplanation(message);
        } catch (error) {
          console.error(
            "Fehler in verbesserter loadExplanation-Funktion:",
            error,
          );

          // Fallback-Informationen bereitstellen
          if (window.showExplanationDialog !== undefined) {
            window.showExplanationDialog = true;
          }

          if (window.currentExplanation !== undefined) {
            window.currentExplanation = {
              original_question: message?.message || "Keine Frage gefunden",
              explanation_text:
                "Es ist ein Fehler bei der Generierung der Erklärung aufgetreten. Bitte versuchen Sie es später erneut oder kontaktieren Sie den Administrator.",
              source_references: [],
            };
          }
        }
      };

      console.log("loadExplanation-Funktion erfolgreich verbessert");
    }
  }, 200);
}

// Initialisierung aller Verbesserungen nach dem Laden der Seite
document.addEventListener("DOMContentLoaded", () => {
  // Kurze Verzögerung, um sicherzustellen, dass alle Komponenten geladen sind
  setTimeout(() => {
    console.log("Initialisiere Verbesserungen...");

    // Entferne message_id Debug-Informationen
    removeMessageIdDebugInfo();

    // Verbessere Nachrichtenaktionen
    enhanceMessageActions();

    // Verbessere Titelgenerierung
    enhanceTitleGeneration();

    // Verbessere Quellenreferenzen
    enhanceSourceReferences();

    // Behebe Fehler in der Erklärungsfunktion
    fixExplanationErrors();

    console.log("Alle Verbesserungen erfolgreich initialisiert");
  }, 1000);
});
