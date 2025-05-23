/**
 * Stellt die Feedback-Funktionalität bereit
 * @param {Object} options - Konfigurationsoptionen
 * @returns {Object} - Feedback-Funktionen
 */
export function setupFeedback(options) {
  const {
    messages,
    currentSessionId,
    showFeedbackDialog,
    feedbackComment,
    feedbackMessage,
  } = options;

  /**
   * Sendet Feedback für eine Nachricht
   * @param {number} messageId - ID der Nachricht
   * @param {number} sessionId - ID der Session
   * @param {boolean} isPositive - Positives oder negatives Feedback
   */
  // Diese Änderungen in feedback.js vornehmen

  // Verbesserte submitFeedback-Funktion mit besserer Fehlerbehandlung und Fallback für message_id
  const submitFeedback = async (messageId, sessionId, isPositive) => {
    try {
      console.log(
        `Sende Feedback: message_id=${messageId}, session_id=${sessionId}, isPositive=${isPositive}`,
      );

      // Warten auf DOM-Update, um die event-Propagation zu beenden
      await Vue.nextTick();

      // Stelle sicher, dass messageId und sessionId definiert sind
      if (!messageId || isNaN(messageId) || messageId <= 0) {
        console.warn("⚠️ Ungültige message_id für Feedback:", messageId);

        // Suche nach der ersten Assistenten-Nachricht ohne Feedback
        const messageIndex = messages.value.findIndex(
          (m) => !m.is_user && m.feedback_positive === undefined,
        );

        if (messageIndex >= 0) {
          // Wenn die Nachricht keine ID hat, setze eine temporäre
          if (!messages.value[messageIndex].id) {
            messages.value[messageIndex].id = Date.now();
            console.log(
              `Temporäre ID gesetzt: ${messages.value[messageIndex].id}`,
            );
          }

          messageId = messages.value[messageIndex].id;
          console.log(`Alternative message_id gefunden: ${messageId}`);
        } else {
          console.error("❌ Keine geeignete Nachricht für Feedback gefunden");
          return;
        }
      }

      // Stelle sicher, dass die sessionId gültig ist
      if (!sessionId || isNaN(sessionId) || sessionId <= 0) {
        // Fallback auf currentSessionId
        if (currentSessionId && currentSessionId.value) {
          sessionId = currentSessionId.value;
          console.log(`Verwende currentSessionId als Fallback: ${sessionId}`);
        } else {
          console.error(
            "❌ Keine gültige session_id gefunden, Feedback wird abgebrochen",
          );
          return;
        }
      }

      // Konvertiere zu Zahlen für die API
      const numericMessageId = parseInt(messageId);
      const numericSessionId = parseInt(sessionId);

      // API-Aufruf
      const response = await axios.post("/api/feedback", {
        message_id: numericMessageId,
        session_id: numericSessionId,
        is_positive: isPositive,
      });

      console.log("✅ Feedback-Antwort vom Server:", response.data);

      // Aktualisiere den Feedback-Status in der Nachricht
      const messageIndex = messages.value.findIndex(
        (m) => m.id === numericMessageId,
      );
      if (messageIndex >= 0) {
        console.log(
          `Nachricht mit ID ${numericMessageId} gefunden an Index ${messageIndex}`,
        );
        messages.value[messageIndex].feedback_positive = isPositive;
        // Lösche alten Kommentar wenn positive Feedback gegeben wird
        if (isPositive) {
          messages.value[messageIndex].feedback_comment = null;
        }
        console.log("✅ Feedback erfolgreich gesendet und UI aktualisiert");
      } else {
        // Fallback: Aktualisiere die letzte Assistentennachricht
        const lastAssistantIndex = messages.value
          .map((m, i) => ({ idx: i, isAssistant: !m.is_user }))
          .filter((m) => m.isAssistant)
          .pop()?.idx;

        if (lastAssistantIndex !== undefined) {
          console.log(
            `Fallback: Aktualisiere letzte Assistentennachricht an Index ${lastAssistantIndex}`,
          );
          messages.value[lastAssistantIndex].id = numericMessageId;
          messages.value[lastAssistantIndex].feedback_positive = isPositive;
          if (isPositive) {
            messages.value[lastAssistantIndex].feedback_comment = null;
          }
        } else {
          console.warn("⚠️ Keine Assistentennachricht gefunden!");
        }
      }
    } catch (error) {
      console.error("❌ Fehler beim Senden des Feedbacks:", error);
      alert(
        "Fehler beim Senden des Feedbacks. Bitte versuchen Sie es später erneut.",
      );
    }
  };

  /**
   * Öffnet den Dialog für Feedback-Kommentare
   * @param {Object} message - Die Nachricht, für die ein Kommentar abgegeben werden soll
   */
  const showFeedbackCommentDialog = (message) => {
    // Stelle sicher, dass die Nachricht eine ID hat
    if (!message.id) {
      console.warn(
        "Nachricht hat keine ID, verwende Fallback-Methode zur ID-Ermittlung",
      );

      // Versuche, die Nachricht im messages-Array zu finden
      const messageIndex = messages.value.findIndex(
        (m) => m === message || (m.message === message.message && !m.is_user),
      );

      if (messageIndex >= 0) {
        // ID aus dem Server abrufen oder einen temporären Wert setzen
        const tempId = Date.now(); // Temporäre ID als Fallback
        message.id = tempId;
        console.log(
          `Temporäre ID ${tempId} für Nachricht an Index ${messageIndex} gesetzt`,
        );
      }
    }

    // Stelle sicher, dass session_id gesetzt ist
    if (!message.session_id && currentSessionId.value) {
      message.session_id = currentSessionId.value;
      console.log(`Session ID ${currentSessionId.value} für Nachricht gesetzt`);
    }

    feedbackMessage.value = message;
    feedbackComment.value = message.feedback_comment || "";
    showFeedbackDialog.value = true;
  };

  /**
   * Sendet den Feedback-Kommentar
   */
  const submitFeedbackComment = async () => {
    if (!feedbackMessage.value) return;

    try {
      // Stelle sicher, dass die notwendigen IDs vorhanden sind
      let messageId = feedbackMessage.value.id;
      let sessionId =
        feedbackMessage.value.session_id || currentSessionId.value;

      // Validiere message_id
      if (!messageId || isNaN(messageId) || messageId <= 0) {
        console.error(
          "Ungültige message_id für Feedback-Kommentar:",
          messageId,
        );
        // Suche nach der ersten Assistenten-Nachricht mit passendem Text
        const messageIndex = messages.value.findIndex(
          (m) => !m.is_user && m.message === feedbackMessage.value.message,
        );

        if (messageIndex >= 0 && messages.value[messageIndex].id) {
          messageId = messages.value[messageIndex].id;
          console.log(`Alternative message_id gefunden: ${messageId}`);
        } else {
          console.error(
            "Keine gültige message_id gefunden, verwende Platzhalter",
          );
          // In Produktionssystemen sollte hier abgebrochen werden
          // Für Testzwecke setzen wir eine temporäre ID
          messageId = Date.now();
        }
      }

      console.log(
        `Sende Feedback-Kommentar für Nachricht ${messageId} in Session ${sessionId}`,
      );

      const response = await axios.post("/api/feedback", {
        message_id: messageId,
        session_id: sessionId,
        is_positive: false,
        comment: feedbackComment.value,
      });

      // Aktualisiere den Kommentar in der Nachricht
      const messageIndex = messages.value.findIndex((m) => m.id === messageId);
      if (messageIndex >= 0) {
        messages.value[messageIndex].feedback_comment = feedbackComment.value;
        // Stelle sicher, dass das Feedback auf negativ gesetzt ist
        messages.value[messageIndex].feedback_positive = false;
        console.log(
          `Feedback-Kommentar aktualisiert für Nachricht ${messageId}`,
        );
      } else {
        // Alternative Suche
        const altMessageIndex = messages.value.findIndex(
          (m) => !m.is_user && m.message === feedbackMessage.value.message,
        );

        if (altMessageIndex >= 0) {
          // Aktualisiere die Nachricht
          messages.value[altMessageIndex].id = messageId; // ID setzen
          messages.value[altMessageIndex].feedback_comment =
            feedbackComment.value;
          messages.value[altMessageIndex].feedback_positive = false;
          console.log(`Feedback-Kommentar über Alternative aktualisiert`);
        } else {
          console.warn(`Nachricht mit ID ${messageId} nicht gefunden!`);
        }
      }

      console.log("Feedback-Kommentar erfolgreich gesendet");
      showFeedbackDialog.value = false;
    } catch (error) {
      console.error("Fehler beim Senden des Feedback-Kommentars:", error);
      alert(
        "Fehler beim Senden des Feedback-Kommentars. Bitte versuchen Sie es später erneut.",
      );
    }
  };

  /**
   * Lädt Feedback für eine bestimmte Nachricht
   * @param {number} messageId - ID der Nachricht
   */
  const loadMessageFeedback = async (messageId) => {
    try {
      // Überprüfe, ob messageId gültig ist
      if (!messageId || isNaN(messageId) || messageId <= 0) {
        console.warn(
          `Ungültige messageId für loadMessageFeedback: ${messageId}`,
        );
        return;
      }

      console.log(`Lade Feedback für Nachricht ${messageId}`);

      const response = await axios.get(`/api/feedback/message/${messageId}`);

      if (response.data.feedback) {
        console.log(
          `Feedback gefunden für Nachricht ${messageId}:`,
          response.data.feedback,
        );

        // Aktualisiere den Feedback-Status in der Nachricht
        const messageIndex = messages.value.findIndex(
          (m) => m.id === messageId,
        );
        if (messageIndex >= 0) {
          messages.value[messageIndex].feedback_positive =
            response.data.feedback.is_positive;
          messages.value[messageIndex].feedback_comment =
            response.data.feedback.comment;
          console.log(
            `Feedback aktualisiert für Nachricht ${messageId} an Index ${messageIndex}`,
          );
        } else {
          console.warn(`Nachricht mit ID ${messageId} nicht gefunden!`);
        }
      } else {
        console.log(`Kein Feedback gefunden für Nachricht ${messageId}`);
      }
    } catch (error) {
      console.error("Fehler beim Laden des Feedbacks:", error);
    }
  };

  return {
    submitFeedback,
    showFeedbackCommentDialog,
    submitFeedbackComment,
    loadMessageFeedback,
  };
}
