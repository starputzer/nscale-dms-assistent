/**
 * Stellt die Chat-Funktionalität bereit
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
        nextTick
    } = options;
    
    let tokenCount = 0;
    let streamTimeout;
    
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
        
        if (eventSource.value) {
            try {
                console.log("Schließe EventSource");
                // Alle Event-Listener entfernen, um Memory-Leaks zu vermeiden
                eventSource.value.onmessage = null;
                eventSource.value.onerror = null;
                
                // Alle spezifischen Event-Listener entfernen
                eventSource.value.removeEventListener('done', () => {});
                eventSource.value.removeEventListener('open', () => {});
                
                // EventSource schließen
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
     * SSE-Parser-Test zur Diagnose
     */
    const testSSEParsing = () => {
        // Testdaten
        const testData = [
            '{"response":" "}',
            '{"response":"Hallo"}',
            '{"response":""}',
            '{"error":"Test error"}'
        ];
        
        console.log("==== SSE PARSER TEST ====");
        testData.forEach(data => {
            try {
                const parsed = JSON.parse(data);
                console.log(`Original: ${data}`);
                console.log(`'response' in parsed: ${'response' in parsed}`);
                console.log(`parsed.response: ${parsed.response}`);
                console.log(`Boolean(parsed.response): ${Boolean(parsed.response)}`);
                console.log("----");
            } catch (e) {
                console.error(`Parsing error for ${data}: ${e}`);
            }
        });
        console.log("========================");
    };
    
    // Test bei Initialisierung durchführen
    testSSEParsing();
    
    /**
     * Setzt den Timeout für inaktive Streams zurück
     */
    const resetStreamTimeout = () => {
        if (streamTimeout) {
            clearTimeout(streamTimeout);
        }
        
        streamTimeout = setTimeout(() => {
            if (isStreaming.value) {
                console.warn(`Stream inaktiv für 30s, bisher ${tokenCount} Tokens empfangen`);
                cleanupStream();
            }
        }, 30000);  // 30 Sekunden Inaktivität
    };
    
    /**
     * Sendet eine Frage mit Streaming-Antwort
     */
    const sendQuestionStream = async () => {
        if (!question.value.trim() || !currentSessionId.value) {
            console.warn("Leere Frage oder keine Session ausgewählt");
            return;
        }

        try {
            console.log(`Sende Frage: "${question.value}"`);
            isLoading.value = true;
            isStreaming.value = true;

            // Benutzernachricht sofort hinzufügen
            messages.value.push({
                is_user: true,
                message: question.value,
                timestamp: Date.now() / 1000
            });

            // Platz für Assistentennachricht reservieren
            const assistantIndex = messages.value.length;
            messages.value.push({
                is_user: false,
                message: '',
                timestamp: Date.now() / 1000
            });

            await nextTick();
            scrollToBottom();

            // EventSource erstellen
            const url = new URL('/api/question/stream', window.location.origin);
            url.searchParams.append('question', question.value);
            url.searchParams.append('session_id', currentSessionId.value);

            // Token als URL-Parameter übergeben für SSE-Authentifizierung
            const authToken = token.value.replace('Bearer ', '');
            url.searchParams.append('auth_token', authToken);

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

            eventSource.value.onmessage = (event) => {
                try {
                    // Beim Empfang jedes Tokens den Timeout zurücksetzen
                    resetStreamTimeout();
                    
                    // Leere Events ignorieren
                    if (!event.data || event.data.trim() === '') {
                        console.log("Leeres Datenevent ignorieren");
                        return;
                    }
                    
                    console.log(`Rohes Event erhalten: ${event.data}`);
                    
                    // JSON-Daten extrahieren
                    let jsonData = event.data;
                    if (jsonData.startsWith('data: ')) {
                        jsonData = jsonData.substring(6);
                    }
                    
                    // Versuche JSON zu parsen
                    const data = JSON.parse(jsonData);
                    
                    if ('response' in data) {
                        tokenCount++;
                        const token = data.response;
                        console.log(`Token #${tokenCount}: "${token}"`);
                        
                        // Token zur Assistenten-Nachricht hinzufügen
                        messages.value[assistantIndex].message += token;
                        scrollToBottom();
                    } else if (data.error) {
                        console.error("Stream-Fehler:", data.error);
                        messages.value[assistantIndex].message = `Fehler: ${data.error}`;
                        cleanupStream();
                    }
                } catch (e) {
                    console.error("JSON-Parsing-Fehler:", e, "Rohdaten:", event.data);
                    // Ignoriere JSON-Fehler für spezielle Event-Typen
                    if (event.data && event.data.includes('event: done')) {
                        console.log("'done'-Event erkannt, wird separat verarbeitet");
                    }
                }
            };

            // Spezieller Handler für 'done' Events
            eventSource.value.addEventListener('done', (event) => {
                console.log("DONE Event empfangen, Stream beendet");
                cleanupStream();
            });

            // Error-Handler
            eventSource.value.onerror = (event) => {
                console.error('SSE-Verbindungsfehler:', event);
                if (tokenCount === 0) {
                    messages.value[assistantIndex].message = 'Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.';
                }
                cleanupStream();
            };

            // Timeout für hängende Verbindungen
            resetStreamTimeout();

            // Frage für nächste Eingabe zurücksetzen
            question.value = '';

        } catch (error) {
            console.error('Streaming-Fehler:', error);
            isLoading.value = false;
            isStreaming.value = false;
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
            
            // Add user message immediately for better UX
            messages.value.push({
                is_user: true,
                message: question.value,
                timestamp: Date.now() / 1000
            });
            
            await nextTick();
            scrollToBottom();
            
            const response = await axios.post('/api/question', {
                question: question.value,
                session_id: currentSessionId.value
            });
            
            // Add assistant response
            messages.value.push({
                is_user: false,
                message: response.data.answer,
                timestamp: Date.now() / 1000
            });
            
            // Clear input
            question.value = '';
            
            await nextTick();
            scrollToBottom();
        } catch (error) {
            console.error('Error sending question:', error);
            
            // Add error message
            messages.value.push({
                is_user: false,
                message: 'Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.',
                timestamp: Date.now() / 1000
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
        cleanupStream
    };
}