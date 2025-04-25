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
            
            const response = await axios.post('/api/feedback', {
                message_id: parseInt(messageId),
                session_id: parseInt(sessionId),
                is_positive: isPositive
            });
            
            // Aktualisiere den Feedback-Status in der Nachricht
            const messageIndex = messages.value.findIndex(m => m.id === messageId);
            if (messageIndex >= 0) {
                messages.value[messageIndex].feedback_positive = isPositive;
                // Lösche alten Kommentar wenn positive Feedback gegeben wird
                if (isPositive) {
                    messages.value[messageIndex].feedback_comment = null;
                }
                console.log('Feedback erfolgreich gesendet und UI aktualisiert');
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
            }
            
            console.log('Feedback-Kommentar erfolgreich gesendet');
            showFeedbackDialog.value = false;
        } catch (error) {
            console.error('Fehler beim Senden des Feedback-Kommentars:', error);
        }
    };
    
    /**
     * Lädt Feedback für eine bestimmte Nachricht
     * @param {number} messageId - ID der Nachricht
     */
    const loadMessageFeedback = async (messageId) => {
        try {
            const response = await axios.get(`/api/feedback/message/${messageId}`);
            
            if (response.data.feedback) {
                // Aktualisiere den Feedback-Status in der Nachricht
                const messageIndex = messages.value.findIndex(m => m.id === messageId);
                if (messageIndex >= 0) {
                    messages.value[messageIndex].feedback_positive = response.data.feedback.is_positive;
                    messages.value[messageIndex].feedback_comment = response.data.feedback.comment;
                }
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