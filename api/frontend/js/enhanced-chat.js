/**
 * Ergänzung für Chat-Funktionalität: Verbesserte Titel-Generierung nach ersten Nachrichten
 */

// Ursprüngliches setup der Chat-Funktionalität bleibt bestehen
// Diese Funktion erweitert die bestehende Funktionalität

/**
 * Fügt zusätzliche Funktionalität zum Chat-Modul hinzu,
 * insbesondere bessere Titelgenerierung nach kurzen Anfragen
 * @param {Object} options - Die gleichen Optionen wie für setupChat
 */
function enhanceChatFunctionality(options) {
  const {
    token,
    messages,
    question,
    currentSessionId,
    isLoading,
    isStreaming,
    eventSource,
    scrollToBottom,
    nextTick,
    loadSessions,
    motdDismissed,
  } = options;

  // Ergänzende Funktionalität zum Aktualisieren des Sitzungstitels
  // nach Abschluss des Streamings
  const enhancedStreamHandler = async () => {
    console.log("Enhanced Stream Handler aktiviert");

    // Wir horchen auf den doneEventHandler
    const originalDoneHandler = window.doneEventHandler;

    // Überschreibe den done-Event-Handler
    window.doneEventHandler = async (event) => {
      // Rufe den ursprünglichen Handler zuerst auf
      if (originalDoneHandler) {
        await originalDoneHandler(event);
      }

      // Zusätzliche Funktionalität: Aktualisiere den Sitzungstitel
      console.log("Stream abgeschlossen, aktualisiere den Sitzungstitel...");

      // Warte kurz, damit der Server Zeit hat
      await new Promise((resolve) => setTimeout(resolve, 1000));

      try {
        if (currentSessionId.value) {
          // Prüfe den aktuellen Titel
          const currentSession = (window.app?.$data?.sessions || []).find(
            (s) => s.id === currentSessionId.value,
          );

          // Wenn der Titel noch "Neue Unterhaltung" ist, aktualisiere ihn
          if (currentSession && currentSession.title === "Neue Unterhaltung") {
            console.log(
              "Sitzungstitel ist noch 'Neue Unterhaltung', versuche zu aktualisieren...",
            );

            // Benutze die globale updateSessionTitle-Funktion
            if (
              window.updateSessionTitle &&
              typeof window.updateSessionTitle === "function"
            ) {
              try {
                await window.updateSessionTitle(currentSessionId.value);
                console.log("Sitzungstitel aktualisiert nach Streaming-Ende");

                // Lade die Sitzungsliste neu
                if (loadSessions && typeof loadSessions === "function") {
                  await loadSessions();
                }
              } catch (e) {
                console.error(
                  "Fehler bei der Titelaktualisierung nach Streaming:",
                  e,
                );
              }
            }
          }
        }
      } catch (e) {
        console.error("Fehler im enhanced Stream Handler:", e);
      }
    };

    // Monitoring für kurze Nachrichten
    const originalSendQuestionStream = window.sendQuestionStream;
    if (
      originalSendQuestionStream &&
      typeof originalSendQuestionStream === "function"
    ) {
      window.sendQuestionStream = async function () {
        // Prüfe, ob es sich um eine kurze Nachricht handelt
        if (question.value && question.value.length < 5) {
          console.log(`Kurze Nachricht erkannt: "${question.value}"`);
        }

        // Original-Funktion aufrufen
        const result = await originalSendQuestionStream.apply(this, arguments);

        return result;
      };
    }
  };

  // Führe die Erweiterung aus
  enhancedStreamHandler();

  /**
   * Verbesserte Anzeige von Nachrichtenaktionen (Feedback-Buttons, Quellenbuttons)
   * nach Abschluss des Streaming-Vorgangs
   */
  const enhanceMessageActions = () => {
    // Füge eine globale CSS-Klasse hinzu/entferne sie, je nachdem ob ein Stream läuft
    const updateStreamingClass = () => {
      if (isStreaming.value) {
        document.body.classList.add("is-streaming");
      } else {
        document.body.classList.remove("is-streaming");
      }
    };

    // Beobachte die isStreaming-Variable
    if (Vue && Vue.watch) {
      Vue.watch(
        () => isStreaming.value,
        (newValue) => {
          updateStreamingClass();

          // Wenn das Streaming beendet ist, zeige die Aktionen mit Animation an
          if (!newValue) {
            console.log("Streaming beendet, aktiviere Nachrichtenaktionen");

            // Verzögerung für die Animation
            setTimeout(() => {
              const messageActionsElements =
                document.querySelectorAll(".message-actions");
              messageActionsElements.forEach((element) => {
                element.style.opacity = "1";
              });
            }, 500);
          }
        },
      );
    }

    // Initial setzen
    updateStreamingClass();
  };

  // Führe die Verbesserung der Nachrichtenaktionen aus
  enhanceMessageActions();
}

// Nach dem Laden der Seite die Funktionen ausführen
document.addEventListener("DOMContentLoaded", () => {
  // Starte mit kurzer Verzögerung, um sicherzustellen, dass alle Skripte geladen sind
  setTimeout(() => {
    // Prüfe, ob das Vue-App-Objekt existiert
    if (window.app) {
      // Hole die Optionen aus der app
      const options = {
        token: window.app.$data.token,
        messages: window.app.$data.messages,
        question: window.app.$data.question,
        currentSessionId: window.app.$data.currentSessionId,
        isLoading: window.app.$data.isLoading,
        isStreaming: window.app.$data.isStreaming,
        eventSource: window.app.$data.eventSource,
        scrollToBottom: window.app.scrollToBottom,
        nextTick: Vue.nextTick,
        loadSessions: window.app.loadSessions,
        motdDismissed: window.app.$data.motdDismissed,
      };

      // Erweitere die Chat-Funktionalität
      enhanceChatFunctionality(options);
    }
  }, 800);
});
