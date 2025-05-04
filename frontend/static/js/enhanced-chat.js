/**
 * Erweiterte Chat-Funktionalität für nscale Assist
 * Bietet zusätzliche Features und Verbesserungen für die Chat-Komponente
 */

(function() {
    console.log('Initialisiere erweiterte Chat-Funktionalität...');
    
    // Konfigurations-Objekt
    const config = {
        enablePolling: true,  // Aktiviert/deaktiviert das Polling für Updates
        pollingInterval: 30000, // Abfrageintervall in Millisekunden (30 Sekunden)
        showTypingIndicator: true, // Zeigt Tippanzeige während der Antwortgenerierung
        enableMentions: false, // Experimentelles Feature für Mentions (@username)
        enableCodeHighlighting: true // Syntax-Highlighting für Code-Blöcke
    };
    
    // Hauptkomponente für erweiterte Chat-Funktionen
    const enhancedChat = {
        // Initialisierungsmethode
        init: function() {
            // Prüfen, ob die Chat-Komponente existiert
            if (!window.app || !window.app.$data) {
                console.warn('Chat-Komponente nicht gefunden, erweiterte Funktionalität wird nicht initialisiert');
                return;
            }
            
            console.log('Chat-Komponente gefunden, initialisiere erweiterte Funktionalität');
            
            // Event-Listener einrichten
            this.setupEventListeners();
            
            // Code-Highlighting aktivieren
            if (config.enableCodeHighlighting) {
                this.setupCodeHighlighting();
            }
            
            // Polling für neue Nachrichten einrichten
            if (config.enablePolling) {
                this.setupPolling();
            }
            
            // Tippanzeige initialisieren
            if (config.showTypingIndicator) {
                this.setupTypingIndicator();
            }
            
            // Experimentelle Features initialisieren
            if (config.enableMentions) {
                this.setupMentions();
            }
            
            console.log('Erweiterte Chat-Funktionalität initialisiert');
        },
        
        // Event-Listener für Chat-Interaktionen
        setupEventListeners: function() {
            // Event-Delegation für Klick-Ereignisse im Chat-Container
            const chatContainer = document.querySelector('.chat-container');
            if (!chatContainer) return;
            
            chatContainer.addEventListener('click', (event) => {
                // Prüfen, ob auf einen Code-Block geklickt wurde
                if (event.target.matches('pre code') || event.target.closest('pre code')) {
                    this.handleCodeBlockClick(event);
                }
                
                // Prüfen, ob auf einen Link geklickt wurde
                if (event.target.matches('a[href^="http"]')) {
                    this.handleExternalLinkClick(event);
                }
            });
            
            // Event-Listener für Tastatureingaben im Chat-Input
            const chatInput = document.querySelector('.chat-input textarea');
            if (chatInput) {
                chatInput.addEventListener('keydown', (event) => {
                    // Strg+Enter zum Senden
                    if (event.key === 'Enter' && event.ctrlKey) {
                        event.preventDefault();
                        this.sendMessage();
                    }
                    
                    // Pfeiltasten zum Navigieren im Verlauf
                    if ((event.key === 'ArrowUp' || event.key === 'ArrowDown') && event.altKey) {
                        event.preventDefault();
                        this.navigateInputHistory(event.key === 'ArrowUp' ? -1 : 1);
                    }
                });
            }
        },
        
        // Code-Highlighting für Codeblöcke
        setupCodeHighlighting: function() {
            // Funktion zum Anwenden von Syntax-Highlighting auf alle Codeblöcke
            const applyHighlighting = () => {
                // Prüfen, ob Highlight.js verfügbar ist
                if (typeof hljs === 'undefined') {
                    console.warn('Highlight.js nicht gefunden, Code-Highlighting deaktiviert');
                    return;
                }
                
                // Alle Codeblöcke finden und Highlighting anwenden
                document.querySelectorAll('pre code').forEach((block) => {
                    // Nur anwenden, wenn noch nicht hervorgehoben
                    if (!block.classList.contains('hljs')) {
                        hljs.highlightBlock(block);
                        
                        // Kopierschaltfläche hinzufügen
                        this.addCopyButtonToCodeBlock(block);
                    }
                });
            };
            
            // MutationObserver für dynamisch hinzugefügte Codeblöcke
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList' && mutation.addedNodes.length) {
                        // Kurze Verzögerung, um sicherzustellen, dass der DOM vollständig aktualisiert ist
                        setTimeout(applyHighlighting, 100);
                    }
                });
            });
            
            // Observer starten und auf Änderungen im Chat-Container achten
            const chatContainer = document.querySelector('.chat-container');
            if (chatContainer) {
                observer.observe(chatContainer, { 
                    childList: true, 
                    subtree: true 
                });
                
                // Initial auf vorhandene Codeblöcke anwenden
                applyHighlighting();
            }
        },
        
        // Kopier-Button zu Codeblöcken hinzufügen
        addCopyButtonToCodeBlock: function(block) {
            // Parent-Element (pre) finden
            const pre = block.parentElement;
            if (!pre || pre.tagName !== 'PRE') return;
            
            // Prüfen, ob bereits ein Button existiert
            if (pre.querySelector('.code-copy-button')) return;
            
            // Container für relativen Button erstellen
            pre.style.position = 'relative';
            
            // Button erstellen
            const copyButton = document.createElement('button');
            copyButton.className = 'code-copy-button';
            copyButton.innerHTML = '<i class="fas fa-copy"></i>';
            copyButton.title = 'Code kopieren';
            copyButton.style.cssText = `
                position: absolute;
                top: 5px;
                right: 5px;
                background: rgba(0,0,0,0.2);
                color: #fff;
                border: none;
                border-radius: 3px;
                padding: 4px 8px;
                font-size: 12px;
                cursor: pointer;
                opacity: 0.7;
                transition: opacity 0.2s;
            `;
            
            // Hover-Effekt
            copyButton.addEventListener('mouseover', () => {
                copyButton.style.opacity = '1';
            });
            copyButton.addEventListener('mouseout', () => {
                copyButton.style.opacity = '0.7';
            });
            
            // Klick-Handler zum Kopieren
            copyButton.addEventListener('click', (event) => {
                event.stopPropagation();
                const code = block.textContent;
                
                // In Zwischenablage kopieren
                navigator.clipboard.writeText(code).then(() => {
                    // Erfolgs-Feedback
                    const originalText = copyButton.innerHTML;
                    copyButton.innerHTML = '<i class="fas fa-check"></i>';
                    
                    // Nach kurzer Zeit zurücksetzen
                    setTimeout(() => {
                        copyButton.innerHTML = originalText;
                    }, 1500);
                }).catch(err => {
                    console.error('Fehler beim Kopieren:', err);
                });
            });
            
            // Button zum Pre-Element hinzufügen
            pre.appendChild(copyButton);
        },
        
        // Handling für Klicks auf Codeblöcke
        handleCodeBlockClick: function(event) {
            // Hier könnten erweiterte Funktionen für Codeblöcke implementiert werden,
            // z.B. Ein- und Ausklappen, Vollbildansicht, etc.
        },
        
        // Polling für neue Nachrichten
        setupPolling: function() {
            // Regelmäßiges Polling für neue Nachrichten oder Sitzungsupdates
            setInterval(() => {
                // Nur ausführen, wenn die App bereit ist und nicht gerade streamt
                if (window.app && window.app.$data && !window.app.$data.isStreaming) {
                    // Aktuelle Sitzungs-ID
                    const currentSessionId = window.app.$data.currentSessionId;
                    
                    // Wenn eine aktive Sitzung existiert, nach Updates suchen
                    if (currentSessionId) {
                        // Sitzungsdaten aktualisieren, ohne die Benutzeroberfläche zu stören
                        this.refreshSessionInBackground(currentSessionId);
                    }
                }
            }, config.pollingInterval);
        },
        
        // Hintergrundaktualisierung der aktuellen Sitzung
        refreshSessionInBackground: function(sessionId) {
            // Diese Funktion könnte einen API-Aufruf machen, um zu prüfen,
            // ob es Änderungen an der Sitzung gibt, ohne die Benutzeroberfläche zu aktualisieren
            // Zum Beispiel neue Systembenachrichtigungen oder Weiterleitungen
            
            // Beispiel-Implementation (muss an die tatsächliche API angepasst werden)
            if (window.app && window.app.loadSession) {
                // Prüfen, ob die lokale Sitzungszeit von der Serverzeit abweicht
                fetch(`/api/sessions/${sessionId}/timestamp`)
                    .then(response => response.json())
                    .then(data => {
                        // Lokale Zeit vergleichen mit Serverzeit
                        const localSession = window.app.$data.sessions.find(s => s.id === sessionId);
                        
                        if (localSession && data.timestamp && new Date(data.timestamp) > new Date(localSession.updated_at)) {
                            console.log('Neue Updates für aktuelle Sitzung gefunden, lade Sitzung neu');
                            window.app.loadSession(sessionId);
                        }
                    })
                    .catch(error => {
                        console.error('Fehler beim Prüfen auf Sitzungsupdates:', error);
                    });
            }
        },
        
        // Tippanzeige für die Antwortgenerierung
        setupTypingIndicator: function() {
            // Funktion zum Hinzufügen der Tippanzeige
            const addTypingIndicator = () => {
                // Prüfen, ob die App gerade streamt
                if (window.app && window.app.$data && window.app.$data.isStreaming) {
                    // Suchen nach einem existierenden Indikator
                    if (!document.querySelector('.typing-indicator')) {
                        // Chat-Container finden
                        const chatContainer = document.querySelector('.chat-container');
                        if (!chatContainer) return;
                        
                        // Indikator erstellen
                        const indicator = document.createElement('div');
                        indicator.className = 'typing-indicator assistant-message';
                        indicator.innerHTML = `
                            <div class="typing-animation">
                                <span class="dot"></span>
                                <span class="dot"></span>
                                <span class="dot"></span>
                            </div>
                        `;
                        
                        // Indikator einfügen
                        chatContainer.appendChild(indicator);
                        
                        // Zum Ende scrollen
                        chatContainer.scrollTop = chatContainer.scrollHeight;
                    }
                } else {
                    // Indikator entfernen, wenn nicht mehr gestreamt wird
                    const indicator = document.querySelector('.typing-indicator');
                    if (indicator) {
                        indicator.remove();
                    }
                }
            };
            
            // Regelmäßig den Status überprüfen
            setInterval(addTypingIndicator, 500);
            
            // CSS für Tippanzeige hinzufügen
            const style = document.createElement('style');
            style.textContent = `
                .typing-indicator {
                    padding: 10px;
                    margin-bottom: 10px;
                }
                .typing-animation {
                    display: inline-flex;
                    align-items: center;
                }
                .typing-animation .dot {
                    width: 8px;
                    height: 8px;
                    margin: 0 2px;
                    background-color: #aaa;
                    border-radius: 50%;
                    opacity: 0.6;
                    animation: typing-dot 1.4s infinite ease-in-out;
                }
                .typing-animation .dot:nth-child(1) { animation-delay: 0s; }
                .typing-animation .dot:nth-child(2) { animation-delay: 0.2s; }
                .typing-animation .dot:nth-child(3) { animation-delay: 0.4s; }
                @keyframes typing-dot {
                    0%, 60%, 100% { transform: translateY(0); }
                    30% { transform: translateY(-5px); }
                }
            `;
            document.head.appendChild(style);
        },
        
        // Experimentelles Feature: @mentions
        setupMentions: function() {
            // Diese Funktion würde die Verwendung von @username im Chat ermöglichen
            // und könnte Autovervollständigung oder Benutzervorschläge bieten
            console.log('Mentions-Feature initialisiert (experimentell)');
        },
        
        // Nachricht senden (Hilfsfunktion für Tastenkombinationen)
        sendMessage: function() {
            // Wenn der Senden-Button existiert, einen Klick simulieren
            const sendButton = document.querySelector('.send-button');
            if (sendButton) {
                sendButton.click();
            } 
            // Alternative: Vue-Methode direkt aufrufen, falls verfügbar
            else if (window.app && window.app.sendMessage) {
                window.app.sendMessage();
            }
        },
        
        // Eingabeverlauf navigieren
        navigateInputHistory: function(direction) {
            // Diese Funktion müsste im App-Kontext implementiert werden
            // um auf den Eingabeverlauf zuzugreifen
            console.log('Navigiere im Eingabeverlauf:', direction);
        },
        
        // Handling für externe Links
        handleExternalLinkClick: function(event) {
            // Optionale Bestätigung für externe Links
            const href = event.target.getAttribute('href');
            if (href && href.startsWith('http')) {
                // Diese Funktion könnte eine Bestätigung anzeigen oder
                // andere Sicherheitsmaßnahmen für externe Links implementieren
            }
        }
    };
    
    // Initialisierung, wenn das DOM geladen ist
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => enhancedChat.init());
    } else {
        // Kurze Verzögerung, um sicherzustellen, dass die Vue-App initialisiert ist
        setTimeout(() => enhancedChat.init(), 500);
    }
    
    // Globalen Zugriff bereitstellen
    window.enhancedChat = enhancedChat;
})();