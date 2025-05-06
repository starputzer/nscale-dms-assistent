/**
 * Verbesserter Text-Streaming-Fix (Version 2) für nscale-assist (2025-05-06)
 *
 * Diese verbesserte Implementierung behebt das Problem, dass Text nicht inkrementell angezeigt wird,
 * sondern nur die komplette Antwort am Ende erscheint.
 */

(function() {
    console.log('===== Verbesserter Text-Streaming-Fix (V2) wird initialisiert =====');

    // Verhindere doppelte Initialisierung
    if (window.enhancedTextStreamingFixV2Initialized) {
        console.log('Verbesserter Text-Streaming-Fix (V2) bereits initialisiert.');
        return;
    }

    // Globaler Status für EventSource-Objekt
    let currentEventSource = null;
    let completeResponse = "";
    let currentMessageId = null;
    let isStreaming = false;
    let debugMode = true; // Setze auf true für ausführlicheres Logging

    // Aktuelle Message-UI-Elemente
    let activeMessageElement = null;
    let activeMessageContainer = null;

    /**
     * Debug-Logging-Funktion
     */
    function debugLog(...args) {
        if (debugMode) {
            console.log("TextStreamingFix V2:", ...args);
        }
    }

    /**
     * Überschreibt die globale EventSource-Implementierung
     */
    function overrideEventSource() {
        try {
            // Originale EventSource-Klasse sichern
            const OriginalEventSource = window.EventSource;
            
            // Erweiterte EventSource mit zusätzlicher Logging-Funktionalität
            class EnhancedEventSource extends OriginalEventSource {
                constructor(url, options) {
                    debugLog('Erstelle verbesserte EventSource für URL:', url);
                    super(url, options);
                    
                    // EventSource global speichern
                    currentEventSource = this;
                    
                    // Status zurücksetzen
                    completeResponse = "";
                    isStreaming = true;
                    
                    // Event-Listener speichern für spätere Wiederverwendung
                    this._messageHandlers = [];
                    this._errorHandlers = [];
                    this._openHandlers = [];
                    this._doneHandlers = [];
                    
                    // Original-Methoden überschreiben
                    const originalAddEventListener = this.addEventListener;
                    this.addEventListener = (type, handler, options) => {
                        debugLog(`Enhanced addEventListener für Event-Typ: ${type}`);
                        
                        // Handler speichern je nach Typ
                        if (type === 'message') this._messageHandlers.push(handler);
                        else if (type === 'error') this._errorHandlers.push(handler);
                        else if (type === 'open') this._openHandlers.push(handler);
                        else if (type === 'done') this._doneHandlers.push(handler);
                        
                        // Original-Methode aufrufen
                        originalAddEventListener.call(this, type, (event) => {
                            // Vor der Weiterleitung an den Handler verarbeiten
                            if (type === 'message') {
                                processMessageEvent(event, handler);
                            } else if (type === 'done') {
                                debugLog('Stream beendet: done-Event empfangen');
                                isStreaming = false;
                                handler(event);
                            } else {
                                handler(event);
                            }
                        }, options);
                    };
                }
            }
            
            // Verarbeitet message-Events und extrahiert Tokens
            function processMessageEvent(event, originalHandler) {
                try {
                    // Einheitliches Logging der Daten
                    const preview = event.data ? (event.data.substring(0, 50) + (event.data.length > 50 ? '...' : '')) : 'Keine Daten';
                    debugLog(`Stream-Event empfangen: ${preview}`);
                    
                    // Überprüfen, ob das Event gültige Daten enthält
                    if (event.data) {
                        try {
                            // Sonderfälle zuerst prüfen
                            if (event.data === '[DONE]' || event.data.includes('event: done')) {
                                debugLog('DONE-Event erkannt in processMessageEvent');
                                isStreaming = false;
                                // Weiterleiten an den Original-Handler
                                originalHandler(event);
                                return;
                            }
                            
                            // Prüfen, ob es ein "data: {...}"-Format ist
                            let jsonData = event.data;
                            if (typeof jsonData === 'string' && jsonData.startsWith('data: ')) {
                                jsonData = jsonData.substring(6);
                            }
                            
                            // JSON parsen
                            let data;
                            try {
                                data = JSON.parse(jsonData);
                            } catch (jsonError) {
                                debugLog('Kein gültiges JSON, versuche alternative Formate:', jsonData);
                                
                                // Alternative 1: Direkter Token
                                if (typeof event.data === 'string') {
                                    completeResponse += event.data;
                                    updateStreamingUI(completeResponse);
                                }
                                
                                // Weiterleiten an den Original-Handler
                                originalHandler(event);
                                return;
                            }
                            
                            // Wenn es eine message_id enthält, speichern
                            if (data.message_id) {
                                currentMessageId = data.message_id;
                                debugLog('Message-ID aus Stream erhalten:', currentMessageId);
                            }
                            
                            // Extraktion der Token-Daten aus verschiedenen möglichen Formaten
                            let tokenText = null;
                            
                            if (data.response) {
                                // Format 1: { response: "token" }
                                tokenText = data.response;
                                debugLog('Token gefunden im response-Feld:', tokenText.substring(0, 20) + '...');
                            } else if (data.token) {
                                // Format 2: { token: "token" }
                                tokenText = data.token;
                                debugLog('Token gefunden im token-Feld:', tokenText.substring(0, 20) + '...');
                            } else if (data.text) {
                                // Format 3: { text: "token" }
                                tokenText = data.text;
                                debugLog('Token gefunden im text-Feld:', tokenText.substring(0, 20) + '...');
                            } else if (data.content) {
                                // Format 4: { content: "token" }
                                tokenText = data.content;
                                debugLog('Token gefunden im content-Feld:', tokenText.substring(0, 20) + '...');
                            }
                            
                            // Wenn ein Token gefunden wurde, zum kompletten Text hinzufügen und UI aktualisieren
                            if (tokenText !== null) {
                                completeResponse += tokenText;
                                updateStreamingUI(completeResponse);
                            }
                        } catch (dataError) {
                            debugLog('Fehler bei der Verarbeitung der Event-Daten:', dataError);
                        }
                    }
                    
                    // Originalen Handler aufrufen
                    originalHandler(event);
                } catch (error) {
                    console.error('Fehler in processMessageEvent:', error);
                    // Trotzdem originalen Handler aufrufen
                    originalHandler(event);
                }
            }
            
            // Ersetze die globale EventSource-Implementierung
            window.EventSource = EnhancedEventSource;
            debugLog('EventSource erfolgreich überschrieben.');
            
            return true;
        } catch (error) {
            console.error('Fehler beim Überschreiben von EventSource:', error);
            return false;
        }
    }

    /**
     * Findet und speichert die aktiven Message-Elemente
     */
    function findActiveMessageElements() {
        // Finde den Message-Container 
        const possibleContainers = [
            document.getElementById('message-container'),
            document.querySelector('.message-list'),
            document.querySelector('.chat-messages')
        ];
        
        // Filter für nicht-null Elemente
        activeMessageContainer = possibleContainers.find(el => el !== null);
        
        if (!activeMessageContainer) {
            debugLog('Kein Message-Container gefunden');
            return false;
        }
        
        // Finde alle Nachrichten-Elemente
        const messageElements = activeMessageContainer.querySelectorAll('.message-text, .nscale-message-content, .assistant-message');
        
        // Das letzte Element ist wahrscheinlich die aktuelle Nachricht
        if (messageElements.length > 0) {
            activeMessageElement = messageElements[messageElements.length - 1];
            debugLog('Aktives Nachrichten-Element gefunden:', activeMessageElement);
            
            // Markiere für Streaming
            activeMessageElement.dataset.streamingEnabled = 'true';
            return true;
        }
        
        debugLog('Keine Nachrichten-Elemente gefunden');
        return false;
    }

    /**
     * DOM-Manipulation-Setup für Message-Container
     */
    function setupMessageObserver() {
        // Finde mögliche Message-Container
        const possibleContainers = [
            document.getElementById('message-container'),
            document.querySelector('.message-list'),
            document.querySelector('.chat-messages')
        ];
        
        // Filter für nicht-null Elemente
        const messageContainer = possibleContainers.find(el => el !== null);
        
        if (!messageContainer) {
            debugLog('Kein Message-Container zum Beobachten gefunden');
            return false;
        }

        // MutationObserver konfigurieren
        const observer = new MutationObserver((mutations) => {
            let newElementsAdded = false;
            
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            debugLog('Neues Element zum Message-Container hinzugefügt:', node);
                            newElementsAdded = true;
                        }
                    }
                }
            }
            
            if (newElementsAdded) {
                // Aktualisiere die aktiven Elemente
                findActiveMessageElements();
            }
        });

        // Observer aktivieren mit allen Optionen
        observer.observe(messageContainer, { 
            childList: true, 
            subtree: true,
            attributes: true,
            characterData: true 
        });
        
        debugLog('DOM-Observer für Message-Container eingerichtet:', messageContainer);
        return true;
    }

    /**
     * Patcht die sendQuestionStream-Funktion, falls vorhanden
     */
    function patchSendQuestionStream() {
        try {
            // Verschiedene Ansätze ausprobieren, um die sendQuestionStream-Funktion zu finden
            let appObject = window.app;
            if (!appObject && typeof app !== 'undefined') {
                appObject = app;
            }
            
            // In verschiedenen Objektstrukturen suchen
            const possiblePaths = [
                { obj: appObject, path: 'chat.sendQuestionStream' },
                { obj: appObject, path: 'chat.streamQuestion' },
                { obj: window, path: 'sendQuestionStream' },
                { obj: window, path: 'streamQuestion' }
            ];
            
            let originalSendStream = null;
            let containerObj = null;
            let functionName = '';
            
            // Durch mögliche Pfade iterieren
            for (const entry of possiblePaths) {
                const parts = entry.path.split('.');
                let current = entry.obj;
                
                // Durch Objektstruktur navigieren
                for (let i = 0; i < parts.length - 1; i++) {
                    if (current && current[parts[i]]) {
                        current = current[parts[i]];
                    } else {
                        current = null;
                        break;
                    }
                }
                
                // Letzten Teil prüfen
                const lastPart = parts[parts.length - 1];
                if (current && typeof current[lastPart] === 'function') {
                    originalSendStream = current[lastPart];
                    containerObj = current;
                    functionName = lastPart;
                    debugLog(`Streaming-Funktion gefunden unter: ${entry.path}`);
                    break;
                }
            }
            
            // Wenn keine Funktion gefunden, beenden
            if (!originalSendStream) {
                debugLog('Konnte sendQuestionStream-Funktion nicht finden');
                return false;
            }
            
            // Funktion patchen
            containerObj[functionName] = async function(...args) {
                debugLog('Erweiterte sendQuestionStream-Funktion aufgerufen mit Argumenten:', args);
                
                // Status zurücksetzen
                completeResponse = "";
                currentMessageId = null;
                isStreaming = true;
                
                // Aktive Message-Elemente finden
                findActiveMessageElements();
                
                // Originale Funktion aufrufen
                const result = await originalSendStream.apply(this, args);
                debugLog('Originale sendQuestionStream-Funktion ausgeführt, Rückgabewert:', result);
                
                return result;
            };
            
            debugLog('sendQuestionStream-Funktion erfolgreich gepatcht');
            return true;
        } catch (error) {
            console.error('Fehler beim Patchen der sendQuestionStream-Funktion:', error);
            return false;
        }
    }

    /**
     * Aktualisiert die UI mit dem aktuellen Text
     */
    function updateStreamingUI(text) {
        // Prüfen, ob wir neue aktive Elemente finden müssen
        if (!activeMessageElement || !activeMessageContainer) {
            findActiveMessageElements();
            
            // Wenn immer noch nichts gefunden, abbrechen
            if (!activeMessageElement) {
                debugLog('Konnte kein aktives Message-Element zum Aktualisieren finden');
                return false;
            }
        }
        
        // Text im aktiven Element aktualisieren
        if (activeMessageElement.dataset.streamingEnabled === 'true') {
            // Text formatieren und aktualisieren
            activeMessageElement.innerHTML = formatMessageText(text);
            
            // Zum Ende scrollen
            if (activeMessageContainer) {
                activeMessageContainer.scrollTop = activeMessageContainer.scrollHeight;
            }
            
            return true;
        }
        
        return false;
    }

    /**
     * Formatiert den Nachrichtentext für die Anzeige
     */
    function formatMessageText(text) {
        // Einfache Formatierung: Zeilenumbrüche in <br>-Tags umwandeln
        if (!text) return '';
        
        return text
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
    }

    /**
     * Überwacht globale AJAX-Anfragen, um die Streaming-Antwort abzufangen
     */
    function setupAjaxInterceptors() {
        try {
            // XMLHttpRequest überwachen
            const originalXhrOpen = XMLHttpRequest.prototype.open;
            const originalXhrSend = XMLHttpRequest.prototype.send;
            
            XMLHttpRequest.prototype.open = function(method, url, ...rest) {
                // URL auf Streaming-Endpunkt überprüfen
                if (url && typeof url === 'string' && url.includes('/api/question/stream')) {
                    debugLog('Streaming-XHR-Anfrage abgefangen:', url);
                    this._isStreamingRequest = true;
                }
                
                return originalXhrOpen.call(this, method, url, ...rest);
            };
            
            XMLHttpRequest.prototype.send = function(...args) {
                if (this._isStreamingRequest) {
                    // Originalverhalten für den "readystatechange" Event-Handler überschreiben
                    const originalStateChange = this.onreadystatechange;
                    
                    this.onreadystatechange = function() {
                        // Wenn die Antwort ankommt
                        if (this.readyState === 4) {
                            debugLog('Streaming-XHR-Antwort erhalten:', this.status);
                            
                            // Antworttext verarbeiten
                            if (this.status === 200 && this.responseText) {
                                try {
                                    const responseData = JSON.parse(this.responseText);
                                    if (responseData.answer) {
                                        debugLog('XHR-Response enthält vollständige Antwort:', responseData.answer.substring(0, 50) + '...');
                                        
                                        // Streaming-Simulieren durch schrittweise Anzeige
                                        simulateStreamingResponse(responseData.answer);
                                    }
                                } catch (e) {
                                    debugLog('Fehler beim Verarbeiten der Streaming-Antwort:', e);
                                }
                            }
                        }
                        
                        // Originalhandler aufrufen
                        if (originalStateChange) {
                            originalStateChange.call(this);
                        }
                    };
                }
                
                return originalXhrSend.call(this, ...args);
            };
            
            // Fetch-API überwachen (falls verwendet)
            const originalFetch = window.fetch;
            
            window.fetch = async function(resource, init) {
                // URL prüfen
                const url = resource instanceof Request ? resource.url : resource;
                
                if (typeof url === 'string' && url.includes('/api/question/stream')) {
                    debugLog('Streaming-Fetch-Anfrage abgefangen:', url);
                    
                    // Original-Fetch ausführen
                    const response = await originalFetch.call(this, resource, init);
                    
                    // Antwort klonen, da sie sonst nur einmal gelesen werden kann
                    const clonedResponse = response.clone();
                    
                    // Antwort verarbeiten (im Hintergrund)
                    clonedResponse.text().then(text => {
                        try {
                            const responseData = JSON.parse(text);
                            if (responseData.answer) {
                                debugLog('Fetch-Response enthält vollständige Antwort:', responseData.answer.substring(0, 50) + '...');
                                
                                // Streaming-Simulieren durch schrittweise Anzeige
                                simulateStreamingResponse(responseData.answer);
                            }
                        } catch (e) {
                            debugLog('Fehler beim Verarbeiten der Streaming-Fetch-Antwort:', e);
                        }
                    });
                    
                    return response;
                }
                
                // Standardverhalten beibehalten
                return originalFetch.call(this, resource, init);
            };
            
            debugLog('AJAX-Interceptors erfolgreich eingerichtet');
            return true;
        } catch (error) {
            console.error('Fehler beim Einrichten der AJAX-Interceptors:', error);
            return false;
        }
    }
    
    /**
     * Simuliert eine Streaming-Antwort, wenn nur die vollständige Antwort vorhanden ist
     */
    function simulateStreamingResponse(fullText) {
        if (!fullText || isStreaming) {
            debugLog('Streaming-Simulation übersprungen: Bereits streaming oder kein Text');
            return;
        }
        
        debugLog('Simuliere Streaming für Text:', fullText.substring(0, 30) + '...');
        
        // Status zurücksetzen
        completeResponse = "";
        isStreaming = true;
        
        // Aktive Elemente finden
        findActiveMessageElements();
        
        // Text in Blöcke aufteilen für geleidgeren Effekt
        // Verwende Wörter statt Zeichen, damit es natürlicher aussieht
        const words = fullText.split(/\s+/);
        const chunkSize = 3; // Anzahl der Wörter pro Chunk
        const chunks = [];
        
        // Wörter in Chunks gruppieren
        for (let i = 0; i < words.length; i += chunkSize) {
            chunks.push(words.slice(i, i + chunkSize).join(' '));
        }
        
        debugLog(`Text in ${chunks.length} Chunks aufgeteilt`);
        
        // Intervall für schrittweise Anzeige
        let index = 0;
        const interval = setInterval(() => {
            if (index < chunks.length) {
                // Nächsten Chunk anhängen
                completeResponse += chunks[index] + ' ';
                
                // UI aktualisieren
                updateStreamingUI(completeResponse);
                
                index++;
            } else {
                // Alles angezeigt, Intervall beenden
                clearInterval(interval);
                isStreaming = false;
                debugLog('Simuliertes Streaming abgeschlossen');
            }
        }, 30);  // 30ms zwischen Chunks für flüssige Darstellung
    }

    /**
     * Direkter Fix für das Streaming
     */
    function applyDirectStreamingFixes() {
        try {
            // 1. Versuche, die message-Elemente direkt zu patchen
            const messageElements = document.querySelectorAll('.message-text, .nscale-message-content, .assistant-message');
            messageElements.forEach(el => {
                el.dataset.streamingEnabled = 'true';
                debugLog('Element für Streaming vorbereitet:', el);
            });
            
            // 2. Füge globalen Event-Listener hinzu für den Fall, dass Streaming-Events nicht abgefangen werden
            document.addEventListener('streamupdate', function(e) {
                if (e.detail && e.detail.text) {
                    debugLog('Stream-Update-Event empfangen:', e.detail.text.substring(0, 30) + '...');
                    completeResponse = e.detail.text;
                    updateStreamingUI(completeResponse);
                }
            });
            
            // 3. Suche nach direktem stream-Objekt in der globalen App
            if (window.app && window.app.streamHandler) {
                const originalHandler = window.app.streamHandler.processToken;
                
                window.app.streamHandler.processToken = function(token) {
                    debugLog('Stream-Token direkt abgefangen:', token.substring(0, 30) + '...');
                    
                    // Zum kompletten Text hinzufügen
                    completeResponse += token;
                    updateStreamingUI(completeResponse);
                    
                    // Original-Handler aufrufen
                    if (originalHandler) return originalHandler.call(this, token);
                };
                
                debugLog('Direkter Stream-Handler gepatcht');
            }
            
            return true;
        } catch (error) {
            console.error('Fehler beim Anwenden direkter Streaming-Fixes:', error);
            return false;
        }
    }

    /**
     * Initialisiert den verbesserten Text-Streaming-Fix
     */
    function init() {
        debugLog('Initialisiere verbesserten Text-Streaming-Fix V2...');
        
        // Status setzen
        const status = {
            eventSourceOverride: overrideEventSource(),
            messageObserver: setupMessageObserver(),
            findElements: findActiveMessageElements(),
            patchedStream: patchSendQuestionStream(),
            ajaxInterceptors: setupAjaxInterceptors(),
            directFixes: applyDirectStreamingFixes()
        };
        
        // Zusammenfassung anzeigen
        debugLog('Text-Streaming-Fix-V2-Status:', status);
        
        // Als initialisiert markieren
        window.enhancedTextStreamingFixV2Initialized = true;
        
        return status;
    }

    // Fix starten, wenn das DOM bereit ist
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // API für Tests und andere Skripte bereitstellen
    window.enhancedTextStreamingFixV2 = {
        init,
        overrideEventSource,
        findActiveMessageElements,
        setupMessageObserver,
        patchSendQuestionStream,
        updateStreamingUI,
        simulateStreamingResponse,
        setupAjaxInterceptors,
        applyDirectStreamingFixes,
        isInitialized: () => window.enhancedTextStreamingFixV2Initialized || false
    };
})();