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
            console.log(`Sende Feedback: message_id=${messageId}, session_id=${sessionId}, isPositive=${isPositive}`);
            
            // Stelle sicher, dass messageId und sessionId numerisch sind
            if (!messageId || isNaN(parseInt(messageId)) || parseInt(messageId) <= 0) {
                console.error("Ungültige message_id für Feedback:", messageId);
                return;
            }
            
            // Konvertiere zu Zahlen für die API
            const numericMessageId = parseInt(messageId);
            const numericSessionId = parseInt(sessionId);
            
            // Stelle sicher, dass die Session-ID gültig ist
            if (!numericSessionId || isNaN(numericSessionId) || numericSessionId <= 0) {
                console.error("Ungültige session_id für Feedback:", sessionId);
                return;
            }
            
            // Debugging-Ausgabe vor der Anfrage
            console.log("Sende Feedback-Anfrage mit folgenden Daten:", {
                message_id: numericMessageId,
                session_id: numericSessionId,
                is_positive: isPositive
            });
            
            // Sende Anfrage an das Backend
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
            }
        } catch (error) {
            console.error('Fehler beim Senden des Feedbacks:', error);
            
            // Verbesserte Fehlerbehandlung
            if (error.response) {
                console.error('Server-Antwort:', error.response.status, error.response.data);
                
                // Validierungsfehler besser behandeln
                if (error.response.status === 422) {
                    const detail = error.response.data.detail || "Ungültige Daten";
                    console.error('Validierungsfehler:', detail);
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
        if (!message || !message.id) {
            console.error("Versuch, Feedback-Dialog für ungültige Nachricht zu öffnen:", message);
            return;
        }
        
        // Speichern der aktuellen Nachricht für spätere Verwendung
        feedbackMessage.value = message;
        // Initialisieren des Kommentars mit vorhandenem Wert (falls vorhanden)
        feedbackComment.value = message.feedback_comment || '';
        // Dialog anzeigen
        showFeedbackDialog.value = true;
        
        console.log(`Feedback-Dialog geöffnet für Nachricht ID ${message.id}`);
    };
    
    /**
     * Sendet den Feedback-Kommentar
     */
    const submitFeedbackComment = async () => {
        if (!feedbackMessage.value || !feedbackMessage.value.id) {
            console.error("Keine gültige Nachricht für Feedback-Kommentar");
            return;
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
            const numericMessageId = parseInt(feedbackMessage.value.id);
            const numericSessionId = parseInt(sessionId);
            
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
        if (!messageId || isNaN(parseInt(messageId)) || parseInt(messageId) <= 0) {
            console.error("Ungültige message_id für Feedback-Abruf:", messageId);
            return;
        }
        
        const numericMessageId = parseInt(messageId);
        
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