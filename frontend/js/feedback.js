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
        feedbackMessage
    } = options;
    
    /**
     * Sendet Feedback für eine Nachricht
     * @param {number} messageId - ID der Nachricht
     * @param {number} sessionId - ID der Session
     * @param {boolean} isPositive - Positives oder negatives Feedback
     */
    const submitFeedback = async (messageId, sessionId, isPositive) => {
        try {
            // DEBUG: Ausgabe der übergebenen Werte
            console.log("submitFeedback aufgerufen mit:", { messageId, sessionId, isPositive });
            console.log("Nachricht:", messages.value.find(m => m.id === messageId));
            
            // Stelle sicher, dass messageId und sessionId vorhanden sind
            if (!messageId) {
                console.error("Ungültige message_id für Feedback:", messageId);
                
                // WICHTIG: Finde die tatsächliche Message-ID aus dem messages-Array
                const lastAssistantMessage = [...messages.value].reverse().find(m => !m.is_user);
                
                if (lastAssistantMessage && lastAssistantMessage.id) {
                    messageId = lastAssistantMessage.id;
                    console.log("Verwende stattdessen die ID der letzten Assistenten-Nachricht:", messageId);
                } else {
                    console.error("Keine geeignete Assistenten-Nachricht gefunden");
                    return;
                }
            }
            
            // Stelle sicher, dass die Session-ID vorhanden ist
            if (!sessionId) {
                if (!currentSessionId.value) {
                    console.error("Keine Session-ID vorhanden");
                    return;
                }
                sessionId = currentSessionId.value;
                console.log("Verwende aktuelle Session-ID:", sessionId);
            }
            
            // Stelle sicher, dass die IDs numerisch sind
            const numericMessageId = parseInt(messageId, 10);
            const numericSessionId = parseInt(sessionId, 10);
            
            if (isNaN(numericMessageId) || numericMessageId <= 0) {
                console.error("Numerische message_id ungültig:", numericMessageId);
                return;
            }
            
            if (isNaN(numericSessionId) || numericSessionId <= 0) {
                console.error("Numerische session_id ungültig:", numericSessionId);
                return;
            }
            
            console.log(`Sende Feedback: message_id=${numericMessageId}, session_id=${numericSessionId}, isPositive=${isPositive}`);
            
            // Sende die Anfrage an den Server
            const response = await axios.post('/api/feedback', {
                message_id: numericMessageId,
                session_id: numericSessionId,
                is_positive: isPositive
            });
            
            console.log("Feedback-Antwort vom Server:", response.data);
            
            // Aktualisiere den Feedback-Status in der Nachricht
            const messageIndex = messages.value.findIndex(m => m.id === numericMessageId);
            if (messageIndex >= 0) {
                console.log(`Nachricht mit ID ${numericMessageId} gefunden an Index ${messageIndex}`);
                messages.value[messageIndex].feedback_positive = isPositive;
                // Lösche alten Kommentar wenn positive Feedback gegeben wird
                if (isPositive) {
                    messages.value[messageIndex].feedback_comment = null;
                }
                console.log('Feedback erfolgreich gesendet und UI aktualisiert');
            } else {
                console.warn(`Nachricht mit ID ${numericMessageId} nicht gefunden!`);
                console.log("Verfügbare Nachrichten:", messages.value.map(m => `ID: ${m.id}, is_user: ${m.is_user}`));
                
                // Reload der aktuellen Session, um die Nachrichten-IDs zu aktualisieren
                if (window.reloadCurrentSession) {
                    console.log("Lade Session neu, um Nachrichten-IDs zu aktualisieren");
                    await window.reloadCurrentSession();
                }
            }
        } catch (error) {
            console.error('Fehler beim Senden des Feedbacks:', error);
            
            // Verbesserte Fehlerbehandlung
            if (error.response) {
                console.error('Server-Antwort:', error.response.status, error.response.data);
                
                if (error.response.status === 422) {
                    console.error('Validierungsfehler:', error.response.data.detail || "Ungültige Daten");
                }
            } else if (error.request) {
                console.error('Keine Antwort vom Server erhalten.');
            } else {
                console.error('Fehler bei der Anfrageerstellung:', error.message);
            }
        }
    };
    
    /**
     * Öffnet den Dialog für Feedback-Kommentare
     * @param {Object} message - Die Nachricht, für die ein Kommentar abgegeben werden soll
     */
    const showFeedbackCommentDialog = (message) => {
        // Überprüfe, ob die Nachricht valid ist
        if (!message) {
            console.error("Versuch, Feedback-Dialog für undefinierte Nachricht zu öffnen");
            return;
        }
        
        // Speichern der aktuellen Nachricht für spätere Verwendung
        feedbackMessage.value = message;
        
        // Wenn die Nachricht keine ID hat, versuche sie zu finden
        if (!message.id) {
            const lastAssistantMessage = [...messages.value].reverse().find(m => !m.is_user);
            if (lastAssistantMessage && lastAssistantMessage.id) {
                feedbackMessage.value = {...message, id: lastAssistantMessage.id};
                console.log("ID der letzten Assistenten-Nachricht verwendet:", lastAssistantMessage.id);
            } else {
                console.error("Keine Nachrichten-ID verfügbar für Feedback-Dialog");
                return;
            }
        }
        
        // Initialisieren des Kommentars mit vorhandenem Wert (falls vorhanden)
        feedbackComment.value = message.feedback_comment || '';
        
        // Dialog anzeigen
        showFeedbackDialog.value = true;
        
        console.log(`Feedback-Dialog geöffnet für Nachricht ID ${feedbackMessage.value.id}`);
    };
    
    /**
     * Sendet den Feedback-Kommentar
     */
    const submitFeedbackComment = async () => {
        if (!feedbackMessage.value) {
            console.error("Keine gültige Nachricht für Feedback-Kommentar");
            return;
        }
        
        // Überprüfe, ob die Nachricht eine ID hat
        if (!feedbackMessage.value.id) {
            console.error("Keine ID in der Feedback-Nachricht");
            
            // Versuche, die ID der letzten Assistenten-Nachricht zu verwenden
            const lastAssistantMessage = [...messages.value].reverse().find(m => !m.is_user);
            if (lastAssistantMessage && lastAssistantMessage.id) {
                feedbackMessage.value.id = lastAssistantMessage.id;
                console.log("ID der letzten Assistenten-Nachricht verwendet:", lastAssistantMessage.id);
            } else {
                console.error("Keine Nachrichten-ID verfügbar für Feedback-Kommentar");
                return;
            }
        }
        
        try {
            console.log(`Sende Feedback-Kommentar für Nachricht ${feedbackMessage.value.id}`);
            
            // Bestimme die Session-ID
            const sessionId = feedbackMessage.value.session_id || currentSessionId.value;
            
            if (!sessionId) {
                console.error("Keine gültige Session-ID für Feedback-Kommentar");
                return;
            }
            
            // Stelle sicher, dass beide IDs als Zahlen vorliegen
            const numericMessageId = parseInt(feedbackMessage.value.id, 10);
            const numericSessionId = parseInt(sessionId, 10);
            
            if (isNaN(numericMessageId) || numericMessageId <= 0) {
                console.error("Numerische message_id ungültig:", numericMessageId);
                return;
            }
            
            if (isNaN(numericSessionId) || numericSessionId <= 0) {
                console.error("Numerische session_id ungültig:", numericSessionId);
                return;
            }
            
            console.log("Sende Feedback-Kommentar mit folgenden Daten:", {
                message_id: numericMessageId,
                session_id: numericSessionId,
                is_positive: false,
                comment: feedbackComment.value
            });
            
            const response = await axios.post('/api/feedback', {
                message_id: numericMessageId,
                session_id: numericSessionId,
                is_positive: false,
                comment: feedbackComment.value
            });
            
            // Aktualisiere den Kommentar in der Nachricht
            const messageIndex = messages.value.findIndex(m => m.id === numericMessageId);
            if (messageIndex >= 0) {
                messages.value[messageIndex].feedback_comment = feedbackComment.value;
                // Stelle sicher, dass das Feedback auf negativ gesetzt ist
                messages.value[messageIndex].feedback_positive = false;
                console.log(`Feedback-Kommentar aktualisiert für Nachricht ${numericMessageId}`);
            } else {
                console.warn(`Nachricht mit ID ${numericMessageId} nicht gefunden!`);
                
                // Reload der aktuellen Session, um die Nachrichten-IDs zu aktualisieren
                if (window.reloadCurrentSession) {
                    console.log("Lade Session neu, um Nachrichten-IDs zu aktualisieren");
                    await window.reloadCurrentSession();
                }
            }
            
            console.log('Feedback-Kommentar erfolgreich gesendet');
            showFeedbackDialog.value = false;
        } catch (error) {
            console.error('Fehler beim Senden des Feedback-Kommentars:', error);
            
            // Verbesserte Fehlerbehandlung
            if (error.response) {
                console.error('Server-Antwort:', error.response.status, error.response.data);
            }
            
            alert('Fehler beim Senden des Feedback-Kommentars. Bitte versuchen Sie es später erneut.');
        }
    };
    
    /**
     * Lädt Feedback für eine bestimmte Nachricht
     * @param {number} messageId - ID der Nachricht
     */
    const loadMessageFeedback = async (messageId) => {
        if (!messageId) {
            console.warn("Keine Nachrichten-ID zum Laden des Feedbacks angegeben");
            return;
        }
        
        const numericMessageId = parseInt(messageId, 10);
        if (isNaN(numericMessageId) || numericMessageId <= 0) {
            console.error("Ungültige message_id für Feedback-Abruf:", messageId);
            return;
        }
        
        try {
            console.log(`Lade Feedback für Nachricht ${numericMessageId}`);
            
            const response = await axios.get(`/api/feedback/message/${numericMessageId}`);
            
            if (response.data.feedback) {
                console.log(`Feedback gefunden für Nachricht ${numericMessageId}:`, response.data.feedback);
                
                // Aktualisiere den Feedback-Status in der Nachricht
                const messageIndex = messages.value.findIndex(m => m.id === numericMessageId);
                if (messageIndex >= 0) {
                    messages.value[messageIndex].feedback_positive = response.data.feedback.is_positive;
                    messages.value[messageIndex].feedback_comment = response.data.feedback.comment;
                    console.log(`Feedback aktualisiert für Nachricht ${numericMessageId} an Index ${messageIndex}`);
                } else {
                    console.warn(`Nachricht mit ID ${numericMessageId} nicht gefunden!`);
                }
            } else {
                console.log(`Kein Feedback gefunden für Nachricht ${numericMessageId}`);
            }
        } catch (error) {
            console.error('Fehler beim Laden des Feedbacks:', error);
        }
    };
    
    return {
        submitFeedback,
        showFeedbackCommentDialog,
        submitFeedbackComment,
        loadMessageFeedback
    };
}