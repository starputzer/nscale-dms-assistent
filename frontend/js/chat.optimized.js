/**
 * @deprecated Diese Legacy-Komponente ist veraltet und wird in Kürze entfernt.
 * Verwende stattdessen die Vue 3 SFC-Implementierung.
 * Geplantes Entfernungsdatum: 2025-06-10
 */

/**
 * chat.optimized.js - Optimierte Chat-Implementierung
 *
 * Bietet eine leistungsoptimierte Implementierung der Chat-Funktionalität mit
 * verbessertem DOM-Rendering, Datenbatching und Netzwerkoptimierungen.
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
trackLegacyUsage("chat.optimized", "initialize");

import { DOMBatch } from "./dom-batch.js";
import { DataOptimization } from "./data-optimization.js";
import { AsyncOptimization } from "./async-optimization.js";

/**
 * Stellt die optimierte Chat-Funktionalität bereit
 * @param {Object} options - Konfigurationsoptionen
 * @returns {Object} - Chat-Funktionen
 */
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
    loadSessions,
    motdDismissed,
  } = options;

  // Interne Zustandsvariablen mit optimierter Speichernutzung
  let tokenCount = 0;
  let streamTimeout;
  let currentStreamRetryCount = 0;
  let completeResponse = "";
  let currentMessageId = null;

  // Performance-Monitoring
  const streamPerformance = {
    startTime: 0,
    tokensPerSecond: 0,
    lastTokenTime: 0,
    totalTokens: 0,
    processingTimes: [],
  };

  // Token-Batching für effizientes DOM-Rendering
  const tokenBatch = {
    tokens: [],
    timer: null,
    batchSize: 5,
    processingDelay: 16, // ~60fps
  };

  // Optimierte Speicherung der Nachrichtenverarbeitung
  const messageProcessCache = new Map();

  /**
   * Bereinigt die EventSource-Verbindung mit optimierter Ressourcenfreigabe
   */
  const cleanupStream = () => {
    console.log("cleanupStream aufgerufen");

    // Performance-Messung beenden
    if (streamPerformance.startTime > 0) {
      const duration = performance.now() - streamPerformance.startTime;
      const tokensPerSecond = (tokenCount / duration) * 1000;

      PerformanceMetrics.startMeasure("stream_performance", {
        tokenCount,
        duration,
        tokensPerSecond,
      });

      PerformanceMetrics.endMeasure(
        "stream_performance",
        "stream_" + Date.now(),
        {
          avgProcessTime:
            streamPerformance.processingTimes.length > 0
              ? streamPerformance.processingTimes.reduce(
                  (sum, time) => sum + time,
                  0,
                ) / streamPerformance.processingTimes.length
              : 0,
        },
      );

      streamPerformance.startTime = 0;
    }

    // Token-Batch bereinigen
    if (tokenBatch.timer) {
      clearTimeout(tokenBatch.timer);
      tokenBatch.timer = null;

      // Verbleibende Tokens verarbeiten
      if (tokenBatch.tokens.length > 0) {
        applyTokenBatch();
      }
    }

    // Timer löschen
    if (streamTimeout) {
      clearTimeout(streamTimeout);
      streamTimeout = null;
    }

    // Zustand zurücksetzen
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

      // Effizientes Update mit DOMBatch
      DOMBatch.groupOperations(() => {
        messages.value[assistantIndex].id = currentMessageId;
        messages.value[assistantIndex].session_id = currentSessionId.value;
      });
    }

    // Session-Liste sofort aktualisieren, mit Fehlerbehandlung
    try {
      if (loadSessions && typeof loadSessions === "function") {
        console.log("Lade Sitzungen nach Stream-Ende...");

        // Optimiertes Laden mit Debounce
        loadSessions();
      }
    } catch (e) {
      console.error("Fehler beim Laden der aktualisierten Sitzungen:", e);
    }

    cleanupStream();
  };

  /**
   * Verarbeitet einen Batch von Tokens und aktualisiert die Nachricht effizient
   */
  const applyTokenBatch = () => {
    if (tokenBatch.tokens.length === 0) return;

    const tokenStart = performance.now();

    // Zusammengesetzte Tokens hinzufügen
    const tokensText = tokenBatch.tokens.join("");
    completeResponse += tokensText;

    // Nachricht aktualisieren (nur einmal pro Batch)
    const assistantIndex = messages.value.length - 1;
    if (assistantIndex >= 0 && !messages.value[assistantIndex].is_user) {
      messages.value[assistantIndex].message = completeResponse;

      // Nur einmal pro Batch zum Ende scrollen
      if (tokensText.includes("\n") || tokenBatch.tokens.length >= 10) {
        nextTick().then(() => scrollToBottom());
      }
    }

    // Batch leeren
    tokenBatch.tokens = [];

    // Verarbeitungszeit messen
    const processingTime = performance.now() - tokenStart;
    streamPerformance.processingTimes.push(processingTime);

    // Tokensrate berechnen
    if (streamPerformance.lastTokenTime > 0) {
      const timeSinceLastToken =
        performance.now() - streamPerformance.lastTokenTime;
      streamPerformance.tokensPerSecond = 1000 / timeSinceLastToken;
    }
    streamPerformance.lastTokenTime = performance.now();
  };

  /**
   * Fügt ein Token zum Batch hinzu und plant bei Bedarf die Verarbeitung
   * @param {string} token - Das hinzuzufügende Token
   */
  const addTokenToBatch = (token) => {
    tokenBatch.tokens.push(token);

    // Batch sofort verarbeiten, wenn kritische Tokens enthalten sind (z.B. Zeilenumbrüche)
    if (
      token.includes("\n") ||
      tokenBatch.tokens.length >= tokenBatch.batchSize
    ) {
      if (tokenBatch.timer) {
        clearTimeout(tokenBatch.timer);
        tokenBatch.timer = null;
      }

      applyTokenBatch();
    }
    // Sonst plan die Verarbeitung für später
    else if (!tokenBatch.timer) {
      tokenBatch.timer = setTimeout(
        applyTokenBatch,
        tokenBatch.processingDelay,
      );
    }
  };

  /**
   * Sendet eine Frage mit Streaming-Antwort
   */
  const sendQuestionStream = async () => {
    if (!question.value.trim() || !currentSessionId.value) {
      console.warn("Leere Frage oder keine Session ausgewählt");
      return;
    }

    // MOTD ausblenden, wenn eine Frage gestellt wird
    if (motdDismissed) {
      motdDismissed.value = true;
    }

    // Performance-Messung starten
    PerformanceMetrics.startMeasure("question_stream", {
      question: question.value,
      sessionId: currentSessionId.value,
    });

    try {
      console.log(`Sende Frage: "${question.value}"`);
      isLoading.value = true;
      isStreaming.value = true;

      // Zurücksetzen von message_id aus vorherigen Anfragen
      currentMessageId = null;

      // Stream-Performance-Messung starten
      streamPerformance.startTime = performance.now();
      streamPerformance.lastTokenTime = 0;
      streamPerformance.totalTokens = 0;
      streamPerformance.processingTimes = [];

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
        session_id: currentSessionId.value,
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

      // Im async function event_generator() im sendQuestionStream-Block:
      eventSource.value.onmessage = (event) => {
        try {
          // Beim Empfang jedes Tokens den Timeout zurücksetzen
          resetStreamTimeout();

          // Zeit des letzten Tokens aktualisieren
          streamPerformance.lastTokenTime = performance.now();

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

            // Verwende DOMBatch für DOM-Updates
            DOMBatch.groupOperations(() => {
              const assistantIndex = messages.value.length - 1;
              if (
                assistantIndex >= 0 &&
                !messages.value[assistantIndex].is_user
              ) {
                messages.value[assistantIndex].message +=
                  `\n[Verbindung wird wiederhergestellt... Versuch ${currentStreamRetryCount}]\n`;
              }
            });

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

            // Verwende DOMBatch für DOM-Updates
            DOMBatch.groupOperations(() => {
              const assistantIndex = messages.value.length - 1;
              if (
                assistantIndex >= 0 &&
                !messages.value[assistantIndex].is_user
              ) {
                // Wenn die Nachricht bereits Inhalt hat, nur eine Warnung anhängen
                if (messages.value[assistantIndex].message.trim()) {
                  messages.value[assistantIndex].message +=
                    "\n\n[Hinweis: Die Antwort wurde möglicherweise abgeschnitten.]";
                } else {
                  // Sonst Fehlermeldung anzeigen
                  messages.value[assistantIndex].message =
                    "Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.";
                }
              }
            });

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

              // ID in der Nachricht speichern
              const assistantIndex = messages.value.length - 1;
              if (
                assistantIndex >= 0 &&
                !messages.value[assistantIndex].is_user
              ) {
                DOMBatch.groupOperations(() => {
                  messages.value[assistantIndex].id = currentMessageId;
                  messages.value[assistantIndex].session_id =
                    currentSessionId.value;
                });
              }

              return;
            }

            // Normales Token verarbeiten
            if ("response" in data) {
              const token = data.response;

              // Token-Zähler erhöhen
              tokenCount++;
              streamPerformance.totalTokens++;

              // Token zum Batch hinzufügen
              addTokenToBatch(token);
            } else if (data.error) {
              console.error("Stream-Fehler:", data.error);

              // Verwende DOMBatch für DOM-Updates
              DOMBatch.groupOperations(() => {
                const assistantIndex = messages.value.length - 1;
                if (
                  assistantIndex >= 0 &&
                  !messages.value[assistantIndex].is_user
                ) {
                  messages.value[assistantIndex].message =
                    `Fehler: ${data.error}`;
                }
              });

              cleanupStream();
            }
          } catch (jsonError) {
            console.warn(
              "Konnte Event-Daten nicht als JSON parsen, behandle als Rohtext:",
              event.data,
            );

            // Rohtext als Token verarbeiten
            if (event.data && event.data.trim()) {
              tokenCount++;
              streamPerformance.totalTokens++;
              addTokenToBatch(event.data);
            }
          }
        } catch (e) {
          console.error("Allgemeiner Fehler bei Event-Verarbeitung:", e);
        }
      };

      // FIX: Spezieller Handler für 'done' Events mit korrektem Listener
      eventSource.value.addEventListener("done", doneEventHandler);

      // Error-Handler
      eventSource.value.onerror = (event) => {
        console.error("SSE-Verbindungsfehler:", event);

        // Nur Fehlermeldung anzeigen, wenn die Antwort unvollständig ist
        if (tokenCount === 0) {
          DOMBatch.groupOperations(() => {
            const assistantIndex = messages.value.length - 1;
            if (
              assistantIndex >= 0 &&
              !messages.value[assistantIndex].is_user
            ) {
              messages.value[assistantIndex].message =
                "Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.";
            }
          });
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

      // Füge eine Fehlermeldung hinzu
      if (
        messages.value.length > 0 &&
        messages.value[messages.value.length - 1].is_user
      ) {
        DOMBatch.groupOperations(() => {
          messages.value.push({
            is_user: false,
            message:
              "Fehler bei der Kommunikation mit dem Server. Bitte versuchen Sie es später erneut.",
            timestamp: Date.now() / 1000,
          });
        });
      }

      // Performance-Messung beenden
      PerformanceMetrics.endMeasure(
        "question_stream",
        "question_stream_error",
        {
          error: error.message,
          tokenCount,
        },
      );
    }
  };

  /**
   * Sendet eine Frage ohne Streaming (Fallback) mit optimierter Anfrageverarbeitung
   */
  const sendQuestion = async () => {
    if (!question.value.trim() || !currentSessionId.value) {
      return;
    }

    // Performance-Messung starten
    PerformanceMetrics.startMeasure("question_no_stream", {
      question: question.value,
      sessionId: currentSessionId.value,
    });

    try {
      isLoading.value = true;

      // MOTD ausblenden, wenn eine Frage gestellt wird
      if (motdDismissed) {
        motdDismissed.value = true;
      }

      // Benutzernachricht sofort hinzufügen für bessere UX
      DOMBatch.groupOperations(() => {
        messages.value.push({
          is_user: true,
          message: question.value,
          timestamp: Date.now() / 1000,
        });
      });

      await nextTick();
      scrollToBottom();

      // Optimierte API-Anfrage mit AsyncOptimization
      const requestOptions = {
        priority: 1, // Hohe Priorität für Fragen
        retry: true,
        timeout: 60000, // 60 Sekunden Timeout
      };

      // Prüfen, ob einfache Sprache aktiviert ist
      if (window.useSimpleLanguage === true) {
        requestOptions.headers = { "X-Use-Simple-Language": "true" };
        console.log("Einfache Sprache aktiviert für diese Anfrage");
      }

      const response = await AsyncOptimization.post(
        "/api/question",
        {
          question: question.value,
          session_id: currentSessionId.value,
        },
        requestOptions,
      );

      // Assistentennachricht hinzufügen
      const assistantMessage = {
        id: response.message_id,
        is_user: false,
        message: response.answer,
        timestamp: Date.now() / 1000,
        session_id: currentSessionId.value,
      };

      DOMBatch.groupOperations(() => {
        messages.value.push(assistantMessage);
      });

      // Session-Liste aktiv aktualisieren - optimiert mit Debounce
      if (loadSessions && typeof loadSessions === "function") {
        console.log("Lade Sitzungen nach Antwort...");
        loadSessions();
      }

      // Eingabe leeren
      question.value = "";

      await nextTick();
      scrollToBottom();

      // Performance-Messung beenden
      PerformanceMetrics.endMeasure(
        "question_no_stream",
        "question_no_stream_complete",
        {
          messageId: response.message_id,
          answerLength: response.answer?.length || 0,
        },
      );
    } catch (error) {
      console.error("Error sending question:", error);

      // Fehlermeldung hinzufügen
      DOMBatch.groupOperations(() => {
        messages.value.push({
          is_user: false,
          message:
            "Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.",
          timestamp: Date.now() / 1000,
        });
      });

      await nextTick();
      scrollToBottom();

      // Performance-Messung beenden
      PerformanceMetrics.endMeasure(
        "question_no_stream",
        "question_no_stream_error",
        {
          error: error.message,
        },
      );
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
