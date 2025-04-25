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
        nextTick,
        loadSessions,  // Funktion zum Laden der Sessions
        motdDismissed  // MOTD Status
    } = options;
    
    let tokenCount = 0;
    let streamTimeout;
    let currentStreamRetryCount = 0;
    
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
        
        // MOTD ausblenden, wenn eine Frage gestellt wird
        if (motdDismissed) {
            motdDismissed.value = true;
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

            // Prüfen, ob einfache Sprache aktiviert ist
            const useSimpleLanguage = window.useSimpleLanguage === true;
            if (useSimpleLanguage) {
                url.searchParams.append('simple_language', 'true');
                console.log("Einfache Sprache aktiviert für diese Anfrage");
            }

            // Token als URL-Parameter übergeben für SSE-Authentifizierung
            // Entferne "Bearer " von Anfang, wenn vorhanden
            const authToken = token.value.replace(/^Bearer\\s+/i, '');
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
            currentStreamRetryCount = 0;
            
            // Flag für erfolgreiche Fertigstellung
            let successfulCompletion = false;

            // Haupt-Message-Handler
            eventSource.value.onmessage = (event) => {
                try {
                    console.log(`Rohes Event erhalten: ${event.data}`);
                    
                    // Beim Empfang jedes Tokens den Timeout zurücksetzen
                    resetStreamTimeout();
                    
                    // Leere Events ignorieren
                    if (!event.data || event.data.trim() === '') {
                        console.log("Leeres Datenevent ignorieren");
                        return;
                    }
                    
                    // JSON-Daten extrahieren
                    let jsonData = event.data;
                    if (jsonData.startsWith('data: ')) {
                        jsonData = jsonData.substring(6);
                    }
                    
                    // Versuche JSON zu parsen
                    const data = JSON.parse(jsonData);
                    
                    // Spezielle Kontrollnachrichten prüfen
                    if ('response' in data) {
                        const token = data.response;
                        
                        // Prüfen auf spezielle Steuerungscodes vom Backend
                        if (token === "[STREAM_RETRY]") {
                            console.log("Stream wird neu gestartet...");
                            currentStreamRetryCount++;
                            messages.value[assistantIndex].message += `\n[Verbindung wird wiederhergestellt... Versuch ${currentStreamRetryCount}]\n`;
                            scrollToBottom();
                            return;
                        }
                        
                        if (token === "[TIMEOUT]") {
                            console.log("Timeout beim Stream.");
                            return;
                        }
                        
                        if (token.startsWith("[FINAL_TIMEOUT]") || 
                            token.startsWith("[CONN_ERROR]") || 
                            token.startsWith("[ERROR]") || 
                            token.startsWith("[UNEXPECTED_ERROR]") || 
                            token.startsWith("[NO_TOKENS]")) {
                            console.error("Stream-Fehler:", token);
                            
                            // Wenn die Nachricht bereits Inhalt hat, nur eine Warnung anhängen
                            if (messages.value[assistantIndex].message.trim()) {
                                messages.value[assistantIndex].message += "\n\n[Hinweis: Die Antwort wurde möglicherweise abgeschnitten.]";
                            } else {
                                // Sonst Fehlermeldung anzeigen
                                messages.value[assistantIndex].message = "Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.";
                            }
                            scrollToBottom();
                            cleanupStream();
                            return;
                        }
                        
                        // Normaler Token - Zeichen für Zeichen hinzufügen
                        tokenCount++;
                        console.log(`Token #${tokenCount}: "${token}"`);
                        
                        // Zeichen für Zeichen zur Assistenten-Nachricht hinzufügen
                        if (token && token.length > 0) {
                            // Aktuelle Nachricht speichern
                            const currentText = messages.value[assistantIndex].message;
                            
                            // Jeden Buchstaben einzeln mit Verzögerung hinzufügen
                            Array.from(token).forEach((char, index) => {
                                setTimeout(() => {
                                    messages.value[assistantIndex].message = currentText + token.substring(0, index + 1);
                                    scrollToBottom();
                                }, index * 15); // 15ms Verzögerung zwischen Zeichen
                            });
                        }
                    } else if (data.error) {
                        console.error("Stream-Fehler:", data.error);
                        messages.value[assistantIndex].message = `Fehler: ${data.error}`;
                        cleanupStream();
                    }
                } catch (e) {
                    console.error("JSON-Parsing-Fehler:", e, "Rohdaten:", event.data);
                }
            };

            // Spezieller Handler für 'done' Events
            eventSource.value.addEventListener('done', async (event) => {
                console.log("DONE Event empfangen, Stream beendet");
                successfulCompletion = true;
                
                // Prüfe, ob die Nachricht nicht leer ist
                if (!messages.value[assistantIndex].message.trim()) {
                    messages.value[assistantIndex].message = 'Es wurden keine Daten empfangen. Bitte versuchen Sie es später erneut.';
                }
                
                // Session-Liste sofort aktualisieren, um den generierten Titel anzuzeigen
                try {
                    if (loadSessions && typeof loadSessions === 'function') {
                        console.log("Lade Sitzungen nach Stream-Ende...");
                        await loadSessions();
                    }
                } catch (e) {
                    console.error("Fehler beim Laden der aktualisierten Sitzungen:", e);
                }
                
                cleanupStream();
            });
            
            // Error-Handler
            eventSource.value.onerror = (event) => {
                console.error('SSE-Verbindungsfehler:', event);
                
                // Nur Fehlermeldung anzeigen, wenn keine erfolgreiche Fertigstellung stattgefunden hat
                if (!successfulCompletion) {
                    if (tokenCount === 0) {
                        messages.value[assistantIndex].message = 'Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.';
                    } else {
                        // Fehlermeldung anhängen, wenn nicht erfolgreich abgeschlossen
                        messages.value[assistantIndex].message += "\n\n[Hinweis: Die Verbindung wurde unterbrochen. Die Antwort könnte unvollständig sein.]";
                    }
                }
                
                cleanupStream();
            };

            // Open-Handler
            eventSource.value.addEventListener('open', () => {
                console.log("SSE-Verbindung erfolgreich geöffnet");
            });

            // Timeout für hängende Verbindungen
            resetStreamTimeout();

            // Frage für nächste Eingabe zurücksetzen
            question.value = '';

        } catch (error) {
            console.error('Streaming-Fehler:', error);
            isLoading.value = false;
            isStreaming.value = false;
            
            // Füge eine Fehlernachricht hinzu
            if (messages.value.length > 0 && messages.value[messages.value.length - 1].is_user) {
                messages.value.push({
                    is_user: false,
                    message: 'Fehler bei der Kommunikation mit dem Server. Bitte versuchen Sie es später erneut.',
                    timestamp: Date.now() / 1000
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
                timestamp: Date.now() / 1000
            });
            
            await nextTick();
            scrollToBottom();
            
            // Prüfen, ob einfache Sprache aktiviert ist
            const headers = {};
            const useSimpleLanguage = window.useSimpleLanguage === true;
            if (useSimpleLanguage) {
                headers['X-Use-Simple-Language'] = 'true';
                console.log("Einfache Sprache aktiviert für diese Anfrage");
            }
            
            const response = await axios.post('/api/question', {
                question: question.value,
                session_id: currentSessionId.value
            }, { headers });
            
            // Add assistant response
            messages.value.push({
                is_user: false,
                message: response.data.answer,
                timestamp: Date.now() / 1000
            });
            
            // Session-Liste aktiv aktualisieren, um den generierten Titel anzuzeigen
            try {
                if (loadSessions && typeof loadSessions === 'function') {
                    console.log("Lade Sitzungen nach Antwort...");
                    await loadSessions();
                }
            } catch (e) {
                console.error("Fehler beim Laden der aktualisierten Sitzungen:", e);
            }
            
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