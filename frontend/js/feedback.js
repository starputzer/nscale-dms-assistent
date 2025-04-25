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
            if (!messageId || isNaN(messageId) || messageId <= 0) {
                console.error("Ungültige message_id für Feedback:", messageId);
                return;
            }
            
            // Konvertiere zu Zahlen für die API
            const numericMessageId = parseInt(messageId);
            const numericSessionId = parseInt(sessionId);
            
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
            console.log('Fehlermeldung:', error.response?.data);
            
            // Versuche Details des Fehlers anzuzeigen
            if (error.response?.status === 422) {
                console.error('Validation error. Server erwartet andere Daten:', error.response.data);
            }
        }
    };
    
    /**
     * Öffnet den Dialog für Feedback-Kommentare
     * @param {Object} message - Die Nachricht, für die ein Kommentar abgegeben werden soll
     */
    const showFeedbackCommentDialog = (message) => {
        feedbackMessage.value = message;
        feedbackComment.value = message.feedback_comment || '';
        showFeedbackDialog.value = true;
    };
    
    /**
     * Sendet den Feedback-Kommentar
     */
    const submitFeedbackComment = async () => {
        if (!feedbackMessage.value) return;
        
        try {
            console.log(`Sende Feedback-Kommentar für Nachricht ${feedbackMessage.value.id}`);
            
            const response = await axios.post('/api/feedback', {
                message_id: feedbackMessage.value.id,
                session_id: feedbackMessage.value.session_id || currentSessionId.value,
                is_positive: false,
                comment: feedbackComment.value
            });
            
            // Aktualisiere den Kommentar in der Nachricht
            const messageIndex = messages.value.findIndex(m => m.id === feedbackMessage.value.id);
            if (messageIndex >= 0) {
                messages.value[messageIndex].feedback_comment = feedbackComment.value;
                // Stelle sicher, dass das Feedback auf negativ gesetzt ist
                messages.value[messageIndex].feedback_positive = false;
                console.log(`Feedback-Kommentar aktualisiert für Nachricht ${feedbackMessage.value.id}`);
            } else {
                console.warn(`Nachricht mit ID ${feedbackMessage.value.id} nicht gefunden!`);
            }
            
            console.log('Feedback-Kommentar erfolgreich gesendet');
            showFeedbackDialog.value = false;
        } catch (error) {
            console.error('Fehler beim Senden des Feedback-Kommentars:', error);
            alert('Fehler beim Senden des Feedback-Kommentars. Bitte versuchen Sie es später erneut.');
        }
    };
    
    /**
     * Lädt Feedback für eine bestimmte Nachricht
     * @param {number} messageId - ID der Nachricht
     */
    const loadMessageFeedback = async (messageId) => {
        try {
            console.log(`Lade Feedback für Nachricht ${messageId}`);
            
            const response = await axios.get(`/api/feedback/message/${messageId}`);
            
            if (response.data.feedback) {
                console.log(`Feedback gefunden für Nachricht ${messageId}:`, response.data.feedback);
                
                // Aktualisiere den Feedback-Status in der Nachricht
                const messageIndex = messages.value.findIndex(m => m.id === messageId);
                if (messageIndex >= 0) {
                    messages.value[messageIndex].feedback_positive = response.data.feedback.is_positive;
                    messages.value[messageIndex].feedback_comment = response.data.feedback.comment;
                    console.log(`Feedback aktualisiert für Nachricht ${messageId} an Index ${messageIndex}`);
                } else {
                    console.warn(`Nachricht mit ID ${messageId} nicht gefunden!`);
                }
            } else {
                console.log(`Kein Feedback gefunden für Nachricht ${messageId}`);
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