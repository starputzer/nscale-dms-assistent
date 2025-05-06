/**
 * Verbesserter Text-Streaming-Fix für nscale-assist (2025-05-06)
 *
 * Diese Implementierung behebt das Problem, dass Text nicht inkrementell angezeigt wird,
 * sondern nur die komplette Antwort am Ende erscheint.
 */

(function() {
    console.log('===== Verbesserter Text-Streaming-Fix wird initialisiert =====');

    // Verhindere doppelte Initialisierung
    if (window.enhancedTextStreamingFixInitialized) {
        console.log('Verbesserter Text-Streaming-Fix bereits initialisiert.');
        return;
    }

    // Globaler Status für EventSource-Objekt
    let currentEventSource = null;
    let completeResponse = "";
    let currentMessageId = null;
    let streamTimeout = null;
    let tokenCount = 0;
    let isStreaming = false;

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
                    console.log('Erstelle verbesserte EventSource für URL:', url);
                    super(url, options);
                    
                    // Event-Listener speichern für spätere Wiederverwendung
                    this._messageHandlers = [];
                    this._errorHandlers = [];
                    this._openHandlers = [];
                    this._doneHandlers = [];
                    
                    // Original-Methoden überschreiben
                    const originalAddEventListener = this.addEventListener;
                    this.addEventListener = (type, handler, options) => {
                        console.log(`Enhanced addEventListener für Event-Typ: ${type}`);
                        
                        // Handler speichern je nach Typ
                        if (type === 'message') this._messageHandlers.push(handler);
                        else if (type === 'error') this._errorHandlers.push(handler);
                        else if (type === 'open') this._openHandlers.push(handler);
                        else if (type === 'done') this._doneHandlers.push(handler);
                        
                        // Original-Methode aufrufen
                        originalAddEventListener.call(this, type, handler, options);
                    };
                    
                    // Überschreibe onmessage
                    const self = this;
                    Object.defineProperty(this, 'onmessage', {
                        get: function() {
                            return self._onmessage;
                        },
                        set: function(handler) {
                            console.log('Enhanced onmessage-Handler gesetzt');
                            self._onmessage = function(event) {
                                try {
                                    // Logging für jedes empfangene Token
                                    tokenCount++;
                                    console.log(`Token #${tokenCount} empfangen`);
                                    
                                    // Überprüfen, ob es ein Spezialevent ist
                                    if (event.data === '[DONE]' || event.data.includes('event: done')) {
                                        console.log('DONE-Event erkannt in onmessage');
                                        // Alle gespeicherten 'done'-Handler aufrufen
                                        self._doneHandlers.forEach(h => h(event));
                                        return;
                                    }
                                    
                                    // Für originalen Handler fortfahren
                                    handler(event);
                                } catch (e) {
                                    console.error('Fehler im Enhanced onmessage:', e);
                                }
                            };
                        }
                    });
                }
            }
            
            // Ersetze die globale EventSource-Implementierung
            window.EventSource = EnhancedEventSource;
            console.log('EventSource erfolgreich überschrieben.');
            
            return true;
        } catch (error) {
            console.error('Fehler beim Überschreiben von EventSource:', error);
            return false;
        }
    }

    /**
     * DOM-Manipulation, um Streaming-Textanzeige zu verbessern
     */
    function setupMessageContainer() {
        // Finde den Message-Container
        const messageContainer = document.getElementById('message-container');
        if (!messageContainer) {
            console.warn('Message-Container nicht gefunden');
            return false;
        }

        // MutationObserver konfigurieren
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const messageElements = node.querySelectorAll('.message-text, .nscale-message-content');
                            
                            messageElements.forEach(el => {
                                // Element für Streaming vorbereiten
                                el.dataset.streamingEnabled = 'true';
                                console.log('Message-Element für Streaming vorbereitet:', el);
                            });
                        }
                    }
                }
            }
        });

        // Observer aktivieren
        observer.observe(messageContainer, { childList: true, subtree: true });
        console.log('DOM-Observer für Text-Streaming eingerichtet.');
        
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
                    console.log(`Streaming-Funktion gefunden unter: ${entry.path}`);
                    break;
                }
            }
            
            // Wenn keine Funktion gefunden, beenden
            if (!originalSendStream) {
                console.warn('Konnte sendQuestionStream-Funktion nicht finden');
                return false;
            }
            
            // Funktion patchen
            containerObj[functionName] = async function(...args) {
                console.log('Erweiterte sendQuestionStream-Funktion aufgerufen');
                
                // Status zurücksetzen
                completeResponse = "";
                currentMessageId = null;
                tokenCount = 0;
                isStreaming = true;
                
                // Assistenten-Nachricht identifizieren
                const messageContainer = document.getElementById('message-container');
                if (messageContainer) {
                    // Melde, dass Streaming beginnt
                    console.log('Streaming beginnt...');
                    
                    // Originale Funktion aufrufen
                    return originalSendStream.apply(this, args);
                } else {
                    console.error('Konnte Message-Container nicht finden');
                    return originalSendStream.apply(this, args);
                }
            };
            
            console.log('sendQuestionStream-Funktion erfolgreich gepatcht');
            return true;
        } catch (error) {
            console.error('Fehler beim Patchen der sendQuestionStream-Funktion:', error);
            return false;
        }
    }

    /**
     * Interceptiert und patcht die EventSource-Callbacks
     */
    function setupEventSourceInterceptors() {
        try {
            // Wrapper für EventSource.onmessage
            const originalAddEventListener = EventTarget.prototype.addEventListener;
            
            EventTarget.prototype.addEventListener = function(type, listener, options) {
                // Nur für EventSource und spezifische Event-Typen
                if (this instanceof EventSource) {
                    if (type === 'message') {
                        console.log('EventSource message-Handler abgefangen');
                        
                        // Wrapper um den originalen Listener
                        const wrappedListener = function(event) {
                            try {
                                console.log('Abgefangenes message-Event:', event.data.substring(0, 30) + (event.data.length > 30 ? '...' : ''));
                                
                                // Überprüfen, ob das Event gültige Daten enthält
                                if (event.data) {
                                    try {
                                        // Prüfen, ob es ein "data: {...}"-Format ist
                                        let jsonData = event.data;
                                        if (jsonData.startsWith('data: ')) {
                                            jsonData = jsonData.substring(6);
                                        }
                                        
                                        const data = JSON.parse(jsonData);
                                        
                                        // Wenn es eine message_id enthält, speichern
                                        if (data.message_id) {
                                            currentMessageId = data.message_id;
                                            console.log('Message-ID aus Stream erhalten:', currentMessageId);
                                        }
                                        
                                        // Wenn es ein Token enthält, zum kompletten Text hinzufügen
                                        if (data.response) {
                                            completeResponse += data.response;
                                            
                                            // Alle aktuellen Nachrichten-Elemente aktualisieren
                                            updateAllMessageElements(completeResponse);
                                        }
                                    } catch (jsonError) {
                                        // Kein gültiges JSON - könnte ein Steuerbefehl sein
                                        console.log('Nicht-JSON-Event:', event.data);
                                    }
                                }
                                
                                // Originalen Listener aufrufen
                                listener.call(this, event);
                            } catch (error) {
                                console.error('Fehler im angepassten message-Handler:', error);
                                // Trotzdem originalen Listener aufrufen
                                listener.call(this, event);
                            }
                        };
                        
                        // Ersetzten Listener verwenden
                        return originalAddEventListener.call(this, type, wrappedListener, options);
                    }
                    else if (type === 'done') {
                        console.log('EventSource done-Handler abgefangen');
                        
                        // Wrapper um den originalen done-Listener
                        const wrappedDoneListener = function(event) {
                            console.log('Stream beendet: done-Event empfangen');
                            
                            // Streaming-Status zurücksetzen
                            isStreaming = false;
                            
                            // Originalen Listener aufrufen
                            listener.call(this, event);
                        };
                        
                        // Ersetzen Listener verwenden
                        return originalAddEventListener.call(this, type, wrappedDoneListener, options);
                    }
                }
                
                // Standard-Verhalten für alle anderen Fälle
                return originalAddEventListener.call(this, type, listener, options);
            };
            
            console.log('EventSource-Interceptors erfolgreich eingerichtet');
            return true;
        } catch (error) {
            console.error('Fehler beim Einrichten der EventSource-Interceptors:', error);
            return false;
        }
    }
    
    /**
     * Aktualisiert alle Nachrichten-Elemente mit dem aktuellen Text
     */
    function updateAllMessageElements(text) {
        // Alle Nachrichten-Elemente finden
        const messageElements = document.querySelectorAll('.message-text, .nscale-message-content');
        
        // Das letzte Element ist wahrscheinlich die aktuelle Nachricht
        const lastElement = messageElements[messageElements.length - 1];
        
        if (lastElement && lastElement.dataset.streamingEnabled === 'true') {
            // Text aktualisieren
            lastElement.innerHTML = formatMessageText(text);
            
            // Zum Ende scrollen
            const messageContainer = document.getElementById('message-container');
            if (messageContainer) {
                messageContainer.scrollTop = messageContainer.scrollHeight;
            }
        }
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
                    console.log('Streaming-XHR-Anfrage abgefangen:', url);
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
                            console.log('Streaming-XHR-Antwort erhalten:', this.status);
                            
                            // Antworttext verarbeiten
                            if (this.status === 200 && this.responseText) {
                                try {
                                    const responseData = JSON.parse(this.responseText);
                                    if (responseData.answer) {
                                        // Streaming-Simulieren durch schrittweise Anzeige
                                        simulateStreamingResponse(responseData.answer);
                                    }
                                } catch (e) {
                                    console.error('Fehler beim Verarbeiten der Streaming-Antwort:', e);
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
                    console.log('Streaming-Fetch-Anfrage abgefangen:', url);
                    
                    // Original-Fetch ausführen
                    const response = await originalFetch.call(this, resource, init);
                    
                    // Antwort klonen, da sie sonst nur einmal gelesen werden kann
                    const clonedResponse = response.clone();
                    
                    // Antwort verarbeiten (im Hintergrund)
                    clonedResponse.text().then(text => {
                        try {
                            const responseData = JSON.parse(text);
                            if (responseData.answer) {
                                // Streaming-Simulieren durch schrittweise Anzeige
                                simulateStreamingResponse(responseData.answer);
                            }
                        } catch (e) {
                            console.error('Fehler beim Verarbeiten der Streaming-Fetch-Antwort:', e);
                        }
                    });
                    
                    return response;
                }
                
                // Standardverhalten beibehalten
                return originalFetch.call(this, resource, init);
            };
            
            console.log('AJAX-Interceptors erfolgreich eingerichtet');
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
        if (!fullText || isStreaming) return;
        
        console.log('Simuliere Streaming für Text:', fullText.substring(0, 30) + '...');
        
        // Status zurücksetzen
        completeResponse = "";
        isStreaming = true;
        
        // Text in Blöcke aufteilen (Wörter oder Sätze)
        const chunks = fullText.match(/[^.!?]+[.!?]|\S+/g) || [];
        
        // Intervall für schrittweise Anzeige
        let index = 0;
        const interval = setInterval(() => {
            if (index < chunks.length) {
                // Nächsten Chunk anhängen
                completeResponse += chunks[index] + ' ';
                
                // Alle Nachrichten-Elemente aktualisieren
                updateAllMessageElements(completeResponse);
                
                index++;
            } else {
                // Alles angezeigt, Intervall beenden
                clearInterval(interval);
                isStreaming = false;
                console.log('Simuliertes Streaming abgeschlossen');
            }
        }, 50);  // 50ms zwischen Chunks für flüssige Darstellung
    }

    /**
     * Initialisiert den verbesserten Text-Streaming-Fix
     */
    function init() {
        console.log('Initialisiere verbesserten Text-Streaming-Fix...');
        
        // Status setzen
        const status = {
            eventSourceOverride: overrideEventSource(),
            messageContainer: setupMessageContainer(),
            patchedStream: patchSendQuestionStream(),
            eventSourceInterceptors: setupEventSourceInterceptors(),
            ajaxInterceptors: setupAjaxInterceptors()
        };
        
        // Zusammenfassung anzeigen
        console.log('Text-Streaming-Fix-Status:', status);
        
        // Als initialisiert markieren
        window.enhancedTextStreamingFixInitialized = true;
        
        return status;
    }

    // Fix starten, wenn das DOM bereit ist
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // API für Tests und andere Skripte bereitstellen
    window.enhancedTextStreamingFix = {
        init,
        overrideEventSource,
        setupMessageContainer,
        patchSendQuestionStream,
        setupEventSourceInterceptors,
        setupAjaxInterceptors,
        isInitialized: () => window.enhancedTextStreamingFixInitialized || false
    };
})();