/**
 * Text-Streaming-Fix für nscale-assist
 * 
 * Behebt Probleme mit dem Text-Streaming, bei dem Antworten nicht mehr inkrementell angezeigt werden.
 */

(function() {
    console.log('===== NSCALE-ASSIST TEXT-STREAMING-FIX =====');
    
    // Testen und Debuggen des Event Source Handlers
    function fixTextStreaming() {
        // Hilfsfunktion, um den aktuellen Event-Source-Handler zu debuggen
        function debugCurrentStreamHandler() {
            console.log('Debugging aktuellen Stream-Handler...');
            
            // Überprüfe, ob der Event-Source-Handler korrekt registriert ist
            const streamButtons = document.querySelectorAll('.stream-button, .send-button');
            
            if (streamButtons.length === 0) {
                console.error('Keine Stream-Buttons gefunden, kann Stream-Handler nicht debuggen.');
                return false;
            }
            
            // Überprüfe die Event-Listener der Buttons
            streamButtons.forEach(button => {
                const clickHandlers = getEventListeners(button, 'click');
                console.log(`Button "${button.textContent.trim()}" hat ${clickHandlers.length} Click-Handler.`);
            });
            
            return true;
        }
        
        // Hilfsfunktion, um alle Event-Listener eines Elements zu erhalten
        function getEventListeners(element, eventType) {
            // In der Produktion ist dies nicht möglich, daher müssen wir eine Schätzung vornehmen
            // Wir prüfen, ob das Element einen onclick-Handler hat
            const handlers = [];
            
            if (element.onclick) {
                handlers.push('onclick-Property');
            }
            
            return handlers;
        }
        
        // Fix für den Event-Source-Handler
        function fixStreamEventHandler() {
            console.log('Versuche, Event-Source-Handler zu reparieren...');
            
            // Funktionen zum Ersetzen der Stream-Funktionalität
            window.setupStreamConnection = function(sessionId, question, token, onChunk, onError, onEnd) {
                console.log('Neue setupStreamConnection-Funktion wird verwendet.');
                
                // Konstruiere die URL mit den richtigen Parametern
                const apiUrl = `/api/question/stream?question=${encodeURIComponent(question)}&session_id=${sessionId}`;
                
                // Erstelle eine neue EventSource-Verbindung
                const eventSource = new EventSource(apiUrl);
                
                // Speichere die EventSource-Instanz
                window.currentEventSource = eventSource;
                
                // Event-Handler einrichten
                eventSource.onmessage = function(event) {
                    const data = JSON.parse(event.data);
                    if (data.response) {
                        onChunk(data.response);
                    } else if (data.error) {
                        onError(data.error);
                        eventSource.close();
                    }
                };
                
                eventSource.addEventListener('done', function(event) {
                    console.log('Stream beendet: done-Event empfangen');
                    eventSource.close();
                    if (onEnd) onEnd();
                });
                
                eventSource.onerror = function(error) {
                    console.error('Stream-Fehler:', error);
                    eventSource.close();
                    if (onError) onError('Verbindungsfehler beim Streaming.');
                };
                
                return eventSource;
            };
            
            // Prüfe, ob eine aktive Verbindung besteht und beende sie
            window.closeStreamConnection = function() {
                if (window.currentEventSource) {
                    console.log('Schließe aktive Stream-Verbindung.');
                    window.currentEventSource.close();
                    window.currentEventSource = null;
                }
            };
            
            // Funktion zum schnellen Testen der Stream-Funktionalität
            window.testStream = function() {
                const sessionId = 1; // Test-Session
                const question = "Testfrage für Stream-Funktionalität";
                
                console.log('Teste Stream-Funktionalität...');
                
                setupStreamConnection(
                    sessionId, 
                    question, 
                    null, 
                    (chunk) => console.log('Chunk empfangen:', chunk),
                    (error) => console.error('Stream-Fehler:', error),
                    () => console.log('Stream beendet')
                );
            };
            
            // Optional: Wenn es einen bekannten Stream-Button gibt, ersetze den Event-Handler
            const streamButtons = document.querySelectorAll('.stream-button, .send-button');
            streamButtons.forEach(button => {
                // Erstelle einen neuen Button, um alte Event-Listener zu entfernen
                const newButton = button.cloneNode(true);
                button.parentNode.replaceChild(newButton, button);
                
                // Füge den neuen Event-Listener hinzu
                newButton.addEventListener('click', function(event) {
                    console.log('Stream-Button geklickt, verwende neue Stream-Funktionalität.');
                    // Die tatsächliche Implementierung hängt von der App ab
                });
                
                console.log(`Event-Handler für Button "${newButton.textContent.trim()}" wurde ersetzt.`);
            });
            
            return true;
        }
        
        // Verbessere die Chat-Streaming-Funktionalität
        function enhanceChatStreaming() {
            console.log('Verbessere Chat-Streaming-Funktionalität...');
            
            // Finde den Chat-Container
            const chatContainer = document.querySelector('.chat-container, .message-container, #chat-messages');
            
            if (!chatContainer) {
                console.error('Chat-Container nicht gefunden, kann Chat-Streaming nicht verbessern.');
                return false;
            }
            
            // Finde die Nachrichteneingabe
            const messageInput = document.querySelector('#message-input, .message-input, [name="message"]');
            
            if (!messageInput) {
                console.error('Nachrichteneingabe nicht gefunden, kann Chat-Streaming nicht verbessern.');
                return false;
            }
            
            // Finde den Senden-Button
            const sendButton = document.querySelector('.send-button, #send-button, button[type="submit"]');
            
            if (!sendButton) {
                console.error('Senden-Button nicht gefunden, kann Chat-Streaming nicht verbessern.');
                return false;
            }
            
            // Erstelle einen neuen Senden-Button mit verbessertem Event-Listener
            const newSendButton = sendButton.cloneNode(true);
            sendButton.parentNode.replaceChild(newSendButton, sendButton);
            
            // Füge den neuen Event-Listener hinzu
            newSendButton.addEventListener('click', function(event) {
                event.preventDefault();
                
                const message = messageInput.value.trim();
                if (!message) return;
                
                // Aktuelle Session-ID ermitteln
                const sessionId = getCurrentSessionId();
                if (!sessionId) {
                    console.error('Keine aktive Session-ID gefunden.');
                    return;
                }
                
                // Benutzerantwort anzeigen
                displayUserMessage(message);
                
                // Eingabefeld leeren
                messageInput.value = '';
                
                // Streaming-Antwort anfordern
                requestStreamingResponse(sessionId, message);
            });
            
            console.log('Event-Handler für Senden-Button wurde ersetzt.');
            
            // Hilfsfunktionen für das Chat-Streaming
            
            // Hilfsfunktion zum Ermitteln der aktuellen Session-ID
            function getCurrentSessionId() {
                // Aus der URL, dem sessionStorage oder einer globalen Variable
                // Der tatsächliche Code hängt von der Implementierung ab
                
                // Prüfe, ob sessionId im URL-Parameter vorhanden ist
                const urlParams = new URLSearchParams(window.location.search);
                const sessionIdFromUrl = urlParams.get('session_id');
                
                if (sessionIdFromUrl) {
                    return sessionIdFromUrl;
                }
                
                // Prüfe, ob sessionId in einem data-Attribut gespeichert ist
                const sessionElement = document.querySelector('[data-session-id]');
                if (sessionElement && sessionElement.dataset.sessionId) {
                    return sessionElement.dataset.sessionId;
                }
                
                // Prüfe globale Variablen
                if (window.currentSessionId) {
                    return window.currentSessionId;
                }
                
                if (window.sessionId) {
                    return window.sessionId;
                }
                
                // Fallback: erste Session verwenden oder eine neue erstellen
                return 1;
            }
            
            // Hilfsfunktion zum Anzeigen der Benutzernachricht
            function displayUserMessage(message) {
                // Erstelle ein neues Nachrichtenelement für die Benutzernachricht
                const messageElement = document.createElement('div');
                messageElement.className = 'message user-message';
                messageElement.innerHTML = `
                    <div class="message-content">
                        <p>${escapeHtml(message)}</p>
                    </div>
                `;
                
                // Füge die Nachricht zum Chat-Container hinzu
                chatContainer.appendChild(messageElement);
                
                // Scrolle zum Ende des Chats
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }
            
            // Hilfsfunktion zum Anfordern einer Streaming-Antwort
            function requestStreamingResponse(sessionId, message) {
                // Erstelle ein neues Nachrichtenelement für die Assistentenantwort
                const assistantMessageElement = document.createElement('div');
                assistantMessageElement.className = 'message assistant-message';
                assistantMessageElement.innerHTML = `
                    <div class="message-content">
                        <p class="streaming-response"></p>
                    </div>
                `;
                
                // Füge die Nachricht zum Chat-Container hinzu
                chatContainer.appendChild(assistantMessageElement);
                
                // Element für die Streaming-Antwort
                const streamingElement = assistantMessageElement.querySelector('.streaming-response');
                
                // Starte den Stream
                const eventSource = setupStreamConnection(
                    sessionId,
                    message,
                    null,
                    (chunk) => {
                        // Füge das Chunk zur Antwort hinzu
                        streamingElement.textContent += chunk;
                        
                        // Scrolle zum Ende des Chats
                        chatContainer.scrollTop = chatContainer.scrollHeight;
                    },
                    (error) => {
                        streamingElement.innerHTML += `<span class="error">${escapeHtml(error)}</span>`;
                        chatContainer.scrollTop = chatContainer.scrollHeight;
                    },
                    () => {
                        console.log('Stream beendet, Nachricht vollständig.');
                        
                        // Optional: Formatiere die endgültige Antwort
                        const finalText = streamingElement.textContent;
                        streamingElement.innerHTML = formatMessageText(finalText);
                        
                        chatContainer.scrollTop = chatContainer.scrollHeight;
                    }
                );
            }
            
            // Hilfsfunktion zum Escapen von HTML
            function escapeHtml(text) {
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            }
            
            // Hilfsfunktion zum Formatieren von Nachrichtentext
            function formatMessageText(text) {
                // Einfache Markdown-artige Formatierung
                return text
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\n\n/g, '<br><br>')
                    .replace(/\n-\s/g, '<br>• ');
            }
            
            return true;
        }
        
        // Führe alle Fixes aus
        const results = {
            debug: debugCurrentStreamHandler(),
            handler: fixStreamEventHandler(),
            chat: enhanceChatStreaming()
        };
        
        console.log('Streaming-Fix-Ergebnisse:', results);
        
        return results;
    }
    
    // Ausführen des Fixes
    try {
        const results = fixTextStreaming();
        console.log('Text-Streaming-Fix abgeschlossen:', results);
    } catch (error) {
        console.error('Fehler beim Ausführen des Text-Streaming-Fixes:', error);
    }
})();