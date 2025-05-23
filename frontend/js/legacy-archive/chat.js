/**
 * @deprecated Diese Legacy-Komponente ist veraltet und wird in Kürze entfernt.
 * Verwende stattdessen die Vue 3 SFC-Implementierung.
 * Geplantes Entfernungsdatum: 2025-06-10
 */

/**
 * Stellt die Chat-Funktionalität bereit
 * @param {Object} options - Konfigurationsoptionen
 * @returns {Object} - Chat-Funktionen
 */

// Monitoring für Legacy-Code-Nutzung
function trackLegacyUsage(componentName, action) {
  if (typeof window.telemetry !== 'undefined') {
    window.telemetry.trackEvent('legacy_code_usage', {
      component: componentName,
      action: action,
      timestamp: new Date().toISOString()
    });
  }
}

// Tracking bei Modulinitialisierung
trackLegacyUsage('chat', 'initialize');


import { getUserTestVariant, trackTestMetric } from './ab-testing.js';

export function setupChat(options) {
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
    loadSessions, // Funktion zum Laden der Sessions
    motdDismissed, // MOTD Status
  } = options;

  let tokenCount = 0;
  let streamTimeout;
  let currentStreamRetryCount = 0;
  let completeResponse = ""; // Variable für die vollständige Antwort
  let currentMessageId = null; // Speichert die message_id aus dem Stream

  /**
   * Bereinigt die EventSource-Verbindung
   */
  const cleanupStream = () => {
    console.log("cleanupStream aufgerufen");

    // Timer löschen
    if (streamTimeout) {
      clearTimeout(streamTimeout);
      streamTimeout = null;
    }

    // tokencount zurücksetzen
    tokenCount = 0;
    currentStreamRetryCount = 0;

    if (eventSource.value) {
      try {
        console.log("Schließe EventSource");
        // Alle Event-Listener entfernen, um Memory-Leaks zu vermeiden
        eventSource.value.onmessage = null;
        eventSource.value.onerror = null;

        // Explizit done-Listener entfernen
        eventSource.value.removeEventListener("done", doneEventHandler);

        eventSource.value.close();
        eventSource.value = null;
      } catch (e) {
        console.error("Fehler beim Bereinigen des EventSource:", e);
      }
    }

    isLoading.value = false;
    isStreaming.value = false;
  };

  /**
   * Setzt den Timeout für inaktive Streams zurück
   */
  const resetStreamTimeout = () => {
    if (streamTimeout) {
      clearTimeout(streamTimeout);
    }

    streamTimeout = setTimeout(() => {
      if (isStreaming.value) {
        console.warn(
          `Stream inaktiv für 30s, bisher ${tokenCount} Tokens empfangen`,
        );
        cleanupStream();
      }
    }, 30000); // 30 Sekunden Inaktivität
  };

  /**
   * Event-Handler für das 'done' Event
   * Als benannte Funktion, damit sie korrekt entfernt werden kann
   */
  const doneEventHandler = async (event) => {
    console.log("DONE Event empfangen, Stream beendet");

    // Setze erfolgreiche Fertigstellung
    const successfulCompletion = true;

    // Prüfe, ob die Nachricht nicht leer ist
    const assistantIndex = messages.value.length - 1;
    if (assistantIndex >= 0 && !messages.value[assistantIndex].message.trim()) {
      messages.value[assistantIndex].message =
        "Es wurden keine Daten empfangen. Bitte versuchen Sie es später erneut.";
    }

    // Wenn wir eine message_id empfangen haben, setze sie in der aktuellen Nachricht
    if (currentMessageId !== null && assistantIndex >= 0) {
      console.log(
        `Setze message_id ${currentMessageId} in Nachricht an Index ${assistantIndex}`,
      );
      messages.value[assistantIndex].id = currentMessageId;
      messages.value[assistantIndex].session_id = currentSessionId.value;
    }

    // Session-Liste sofort aktualisieren, um den generierten Titel anzuzeigen
    try {
      if (loadSessions && typeof loadSessions === "function") {
        console.log("Lade Sitzungen nach Stream-Ende...");
        await loadSessions();
      }
    } catch (e) {
      console.error("Fehler beim Laden der aktualisierten Sitzungen:", e);
    }

    cleanupStream();
  };

  /**
   * Sendet eine Frage mit Streaming-Antwort
   */
  const sendQuestionStream = async () => {
    if (!question.value.trim() || !currentSessionId.value) {
      console.warn("Leere Frage oder keine Session ausgewählt");
      return;
    }

    console.log("Starte sendQuestionStream mit:", question.value);

    // A/B Test Metrik: Aufzeichnen des Startpunkts für Antwortzeit-Messung
    const chatVariant = getUserTestVariant('chat-interface-v2');
    const startTime = Date.now();

    // MOTD ausblenden, wenn eine Frage gestellt wird
    if (motdDismissed) {
      motdDismissed.value = true;
    }

    try {
      console.log(`Sende Frage: "${question.value}"`);
      isLoading.value = true;
      isStreaming.value = true;

      // Zurücksetzen von message_id aus vorherigen Anfragen
      currentMessageId = null;

      // Benutzernachricht sofort hinzufügen
      messages.value.push({
        is_user: true,
        message: question.value,
        timestamp: Date.now() / 1000,
      });

      // Platz für Assistentennachricht reservieren
      const assistantIndex = messages.value.length;
      messages.value.push({
        is_user: false,
        message: "",
        timestamp: Date.now() / 1000,
        session_id: currentSessionId.value, // Session-ID direkt setzen
      });

      await nextTick();
      scrollToBottom();

      // EventSource erstellen
      const url = new URL("/api/question/stream", window.location.origin);
      url.searchParams.append("question", question.value);
      url.searchParams.append("session_id", currentSessionId.value);

      // Prüfen, ob einfache Sprache aktiviert ist
      const useSimpleLanguage = window.useSimpleLanguage === true;
      if (useSimpleLanguage) {
        url.searchParams.append("simple_language", "true");
        console.log("Einfache Sprache aktiviert für diese Anfrage");
      }

      // Token als URL-Parameter übergeben für SSE-Authentifizierung
      // Entferne "Bearer " von Anfang, wenn vorhanden
      const authToken = token.value.replace(/^Bearer\\s+/i, "");
      url.searchParams.append("auth_token", authToken);

      console.log(`Streaming URL: ${url.toString()}`);

      // Bestehende EventSource schließen
      if (eventSource.value) {
        console.log("Schließe bestehende EventSource");
        eventSource.value.close();
        eventSource.value = null;
      }

      // Neue EventSource-Verbindung
      console.log("Erstelle neue EventSource");
      eventSource.value = new EventSource(url.toString());

      // Zähler für Debugging
      tokenCount = 0;
      currentStreamRetryCount = 0;

      // Zurücksetzen der vollständigen Antwort
      completeResponse = "";

      // 1. Verbesserte onmessage-Funktion mit besserer Behandlung des done-Events
      // Im async function event_generator() im sendQuestionStream-Block:
      eventSource.value.onmessage = (event) => {
        try {
          console.log(`Rohes Event erhalten: ${event.data}`);

          // Beim Empfang jedes Tokens den Timeout zurücksetzen
          resetStreamTimeout();

          // Leere Events ignorieren
          if (!event.data || event.data.trim() === "") {
            console.log("Leeres Datenevent ignorieren");
            return;
          }

          // Prüfe, ob es sich um ein 'done'-Event handelt
          if (event.data.includes("event: done")) {
            console.log(
              "'done'-Event erkannt, verarbeite es wie ein Standard-done-Event",
            );
            doneEventHandler(event);
            return;
          }

          // Prüfe auf Spezial-Event-Flags
          if (event.data === "[STREAM_RETRY]") {
            console.log("Stream wird neu gestartet...");
            currentStreamRetryCount++;
            messages.value[assistantIndex].message +=
              `\n[Verbindung wird wiederhergestellt... Versuch ${currentStreamRetryCount}]\n`;
            scrollToBottom();
            return;
          }

          if (event.data === "[TIMEOUT]") {
            console.log("Timeout beim Stream.");
            return;
          }

          if (
            event.data.startsWith("[FINAL_TIMEOUT]") ||
            event.data.startsWith("[CONN_ERROR]") ||
            event.data.startsWith("[ERROR]") ||
            event.data.startsWith("[UNEXPECTED_ERROR]") ||
            event.data.startsWith("[NO_TOKENS]")
          ) {
            console.error("Stream-Fehler:", event.data);

            // Wenn die Nachricht bereits Inhalt hat, nur eine Warnung anhängen
            if (messages.value[assistantIndex].message.trim()) {
              messages.value[assistantIndex].message +=
                "\n\n[Hinweis: Die Antwort wurde möglicherweise abgeschnitten.]";
            } else {
              // Sonst Fehlermeldung anzeigen
              messages.value[assistantIndex].message =
                "Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.";
            }
            scrollToBottom();
            cleanupStream();
            return;
          }

          // Versuche JSON zu parsen
          try {
            // Extrahiere den JSON-Teil
            let jsonData = event.data;
            if (jsonData.startsWith("data: ")) {
              jsonData = jsonData.substring(6);
            }

            const data = JSON.parse(jsonData);

            // Überprüfen, ob das Event eine message_id enthält
            if ("message_id" in data) {
              console.log(
                `Message-ID vom Server empfangen: ${data.message_id}`,
              );
              currentMessageId = data.message_id;

              // Speichere die message_id direkt in der aktuellen Nachricht
              messages.value[assistantIndex].id = currentMessageId;
              messages.value[assistantIndex].session_id =
                currentSessionId.value;
              return;
            }

            // Normales Token verarbeiten
            if ("response" in data) {
              const token = data.response;

              // Normaler Token - für Debugging
              tokenCount++;
              console.log(`Token #${tokenCount}: "${token}"`);

              // Token zur vollständigen Antwort hinzufügen
              completeResponse += token;

              // Aktualisiere die angezeigte Nachricht sofort
              messages.value[assistantIndex].message = completeResponse;
              scrollToBottom();
            } else if (data.error) {
              console.error("Stream-Fehler:", data.error);
              messages.value[assistantIndex].message = `Fehler: ${data.error}`;
              cleanupStream();
            }
          } catch (jsonError) {
            console.warn(
              "Konnte Event-Daten nicht als JSON parsen, behandle als Rohtext:",
              event.data,
            );
            // Hier könnten wir weitere Verarbeitungslogik hinzufügen, falls nötig
          }
        } catch (e) {
          console.error("Allgemeiner Fehler bei Event-Verarbeitung:", e);
        }
      };

      // 2. Im doneEventHandler sicherstellen, dass die message_id gesetzt wird
      const doneEventHandler = async (event) => {
        console.log("DONE Event empfangen, Stream beendet");

        // A/B Test Metrik: Antwortzeit messen und tracken
        if (chatVariant) {
          const responseTime = Date.now() - startTime;
          const messageLength = completeResponse.length;
          trackTestMetric('chat-interface-v2', 'messageResponseTime', responseTime, {
            messageLength,
            tokensReceived: tokenCount,
            streamRetries: currentStreamRetryCount
          });
          console.log(`A/B Test - Chat Interface: Antwortzeit erfasst (${responseTime}ms)`);
        }

        // Prüfe, ob die Nachricht nicht leer ist
        const assistantIndex = messages.value.length - 1;
        if (
          assistantIndex >= 0 &&
          !messages.value[assistantIndex].message.trim()
        ) {
          messages.value[assistantIndex].message =
            "Es wurden keine Daten empfangen. Bitte versuchen Sie es später erneut.";
        }

        // Wenn wir eine message_id empfangen haben, setze sie in der aktuellen Nachricht
        if (currentMessageId !== null && assistantIndex >= 0) {
          console.log(
            `Setze message_id ${currentMessageId} in Nachricht an Index ${assistantIndex}`,
          );
          messages.value[assistantIndex].id = currentMessageId;
          messages.value[assistantIndex].session_id = currentSessionId.value;
        } else if (assistantIndex >= 0) {
          // Wenn keine ID vorhanden, setze einen temporären Wert
          const tempId = Date.now();
          console.log(
            `Keine message_id vorhanden, setze temporäre ID: ${tempId}`,
          );
          messages.value[assistantIndex].id = tempId;
          messages.value[assistantIndex].session_id = currentSessionId.value;
        }

        // Session-Liste sofort aktualisieren, um den generierten Titel anzuzeigen
        try {
          if (loadSessions && typeof loadSessions === "function") {
            console.log("Lade Sitzungen nach Stream-Ende...");
            await loadSessions();
          }
        } catch (e) {
          console.error("Fehler beim Laden der aktualisierten Sitzungen:", e);
        }

        cleanupStream();
      };

      // FIX: Spezieller Handler für 'done' Events mit korrektem Listener
      eventSource.value.addEventListener("done", doneEventHandler);

      // Error-Handler
      eventSource.value.onerror = (event) => {
        console.error("SSE-Verbindungsfehler:", event);

        // Nur Fehlermeldung anzeigen, wenn die Antwort unvollständig ist
        if (tokenCount === 0) {
          messages.value[assistantIndex].message =
            "Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.";
        }

        cleanupStream();
      };

      // Open-Handler
      eventSource.value.addEventListener("open", () => {
        console.log("SSE-Verbindung erfolgreich geöffnet");
      });

      // Timeout für hängende Verbindungen
      resetStreamTimeout();

      // Frage für nächste Eingabe zurücksetzen
      question.value = "";
    } catch (error) {
      console.error("Streaming-Fehler:", error);
      isLoading.value = false;
      isStreaming.value = false;

      // Füge eine Fehlernachricht hinzu
      if (
        messages.value.length > 0 &&
        messages.value[messages.value.length - 1].is_user
      ) {
        messages.value.push({
          is_user: false,
          message:
            "Fehler bei der Kommunikation mit dem Server. Bitte versuchen Sie es später erneut.",
          timestamp: Date.now() / 1000,
        });
      }
    }
  };

  /**
   * Sendet eine Frage ohne Streaming (Fallback)
   */
  const sendQuestion = async () => {
    if (!question.value.trim() || !currentSessionId.value) {
      return;
    }

    try {
      isLoading.value = true;

      // MOTD ausblenden, wenn eine Frage gestellt wird
      if (motdDismissed) {
        motdDismissed.value = true;
      }

      // Add user message immediately for better UX
      messages.value.push({
        is_user: true,
        message: question.value,
        timestamp: Date.now() / 1000,
      });

      await nextTick();
      scrollToBottom();

      // Prüfen, ob einfache Sprache aktiviert ist
      const headers = {};
      const useSimpleLanguage = window.useSimpleLanguage === true;
      if (useSimpleLanguage) {
        headers["X-Use-Simple-Language"] = "true";
        console.log("Einfache Sprache aktiviert für diese Anfrage");
      }

      const response = await axios.post(
        "/api/question",
        {
          question: question.value,
          session_id: currentSessionId.value,
        },
        { headers },
      );

      // Add assistant response
      const assistantMessage = {
        id: response.data.message_id, // Stelle sicher, dass die Message-ID vom Backend zurückgegeben wird
        is_user: false,
        message: response.data.answer,
        timestamp: Date.now() / 1000,
        session_id: currentSessionId.value,
      };

      messages.value.push(assistantMessage);

      // Session-Liste aktiv aktualisieren, um den generierten Titel anzuzeigen
      try {
        if (loadSessions && typeof loadSessions === "function") {
          console.log("Lade Sitzungen nach Antwort...");
          await loadSessions();
        }
      } catch (e) {
        console.error("Fehler beim Laden der aktualisierten Sitzungen:", e);
      }

      // Clear input
      question.value = "";

      await nextTick();
      scrollToBottom();
    } catch (error) {
      console.error("Error sending question:", error);

      // Add error message
      messages.value.push({
        is_user: false,
        message:
          "Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.",
        timestamp: Date.now() / 1000,
      });

      await nextTick();
      scrollToBottom();
    } finally {
      isLoading.value = false;
    }
  };

  return {
    sendQuestionStream,
    sendQuestion,
    cleanupStream,
  };
}
