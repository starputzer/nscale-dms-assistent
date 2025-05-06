/**
 * Verbesserter Session-Input-Persister für nscale-assist (2025-05-06)
 *
 * Dieser Fix behebt das Problem, dass eingegebene Texte in allen Chat-Tabs erscheinen,
 * statt nur im aktuellen Tab gespeichert zu werden.
 */

(function() {
    console.log('===== Verbesserter Session-Input-Persister wird initialisiert =====');

    // Verhindere doppelte Initialisierung
    if (window.improvedSessionInputPersisterInitialized) {
        console.log('Verbesserter Session-Input-Persister bereits initialisiert.');
        return;
    }

    // Speicher für Eingaben pro Session
    const sessionInputMap = new Map();
    
    // Aktuell ausgewählte Session
    let currentSessionId = null;

    /**
     * Findet das Eingabefeld in der Chat-Oberfläche
     */
    function findInputElement() {
        // Verschiedene mögliche Selektoren für das Eingabefeld
        const selectors = [
            '#question-input',
            '.message-input',
            'textarea[name="message"]',
            '.chat-input',
            '#send-message-input'
        ];
        
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                console.log(`Eingabefeld gefunden mit Selektor: ${selector}`);
                return element;
            }
        }
        
        console.warn('Kein Eingabefeld gefunden.');
        return null;
    }

    /**
     * Hilfsfunktion zum Extrahieren der Session-ID aus einem Tab-Element
     */
    function getSessionIdFromElement(element) {
        // Prüfe auf data-Attribute
        if (element.dataset && element.dataset.sessionId) return element.dataset.sessionId;
        if (element.dataset && element.dataset.id) return element.dataset.id;
        
        // Prüfe auf id-Attribut mit Prefixen
        const idPrefixes = ['session-', 'chat-session-', 'tab-'];
        for (const prefix of idPrefixes) {
            if (element.id && element.id.startsWith(prefix)) {
                return element.id.substring(prefix.length);
            }
        }
        
        // Prüfe auf href mit session_id Parameter
        if (element.href) {
            try {
                const url = new URL(element.href, window.location.origin);
                const sessionId = url.searchParams.get('session_id');
                if (sessionId) return sessionId;
            } catch (e) {
                // Fehlgeschlagene URL-Verarbeitung ignorieren
            }
        }
        
        // Prüfe auf gespeicherte Session-ID in einem Datenelement
        const sessionIdElement = element.querySelector('[data-session-id]');
        if (sessionIdElement && sessionIdElement.dataset.sessionId) {
            return sessionIdElement.dataset.sessionId;
        }
        
        // Extrahiere aus Text-Inhalt
        const textContent = element.textContent || '';
        const sessionMatch = textContent.match(/session[- _]?id[=: ]+([a-zA-Z0-9-_]+)/i);
        if (sessionMatch && sessionMatch[1]) {
            return sessionMatch[1];
        }
        
        return null;
    }

    /**
     * Findet alle Session-Tab-Elemente
     */
    function findSessionTabs() {
        // Verschiedene mögliche Selektoren für Session-Tabs
        const selectors = [
            '.nscale-session-item',
            '#sessions-list li',
            '.session-tab',
            '.chat-tab',
            '.tab-item'
        ];
        
        const allTabs = [];
        
        for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                console.log(`${elements.length} Session-Tabs gefunden mit Selektor: ${selector}`);
                allTabs.push(...elements);
            }
        }
        
        if (allTabs.length === 0) {
            console.warn('Keine Session-Tabs gefunden.');
        }
        
        return allTabs;
    }

    /**
     * Ermittelt die aktuelle Session-ID
     */
    function getCurrentSessionId() {
        // 1. Globale Variablen prüfen
        const globalVars = ['currentSessionId', 'activeSessionId', 'sessionId'];
        
        for (const varName of globalVars) {
            if (window[varName]) {
                console.log(`Aktive Session-ID aus globaler Variable ${varName} gefunden: ${window[varName]}`);
                return window[varName];
            }
        }
        
        // 2. App-Objekt prüfen
        if (window.app?.chat?.currentSessionId) {
            console.log(`Aktive Session-ID aus App-Objekt gefunden: ${window.app.chat.currentSessionId}`);
            return window.app.chat.currentSessionId;
        }
        
        // 3. Aktiven Tab im DOM suchen
        const activeTabSelectors = [
            '.nscale-session-item.active',
            '#sessions-list li.active',
            '.session-tab.active',
            '.chat-tab.active',
            '.tab-item.active'
        ];
        
        for (const selector of activeTabSelectors) {
            const activeTab = document.querySelector(selector);
            if (activeTab) {
                const sessionId = getSessionIdFromElement(activeTab);
                if (sessionId) {
                    console.log(`Aktive Session-ID aus aktivem Tab gefunden: ${sessionId}`);
                    return sessionId;
                }
            }
        }
        
        // 4. URL-Parameter prüfen
        const urlParams = new URLSearchParams(window.location.search);
        const sessionIdParam = urlParams.get('session_id');
        if (sessionIdParam) {
            console.log(`Aktive Session-ID aus URL-Parameter gefunden: ${sessionIdParam}`);
            return sessionIdParam;
        }
        
        // 5. localStorage prüfen
        const localStorageKeys = ['currentSessionId', 'activeSessionId', 'sessionId'];
        
        for (const key of localStorageKeys) {
            const value = localStorage.getItem(key);
            if (value) {
                console.log(`Aktive Session-ID aus localStorage gefunden: ${value}`);
                return value;
            }
        }
        
        console.warn('Konnte keine aktive Session-ID ermitteln.');
        return null;
    }

    /**
     * Setzt Listener für das Eingabefeld
     */
    function setupInputListener(inputElement) {
        if (!inputElement) return false;
        
        console.log('Richte Listener für das Eingabefeld ein...');
        
        // Entferne bestehende Listener
        const newInputElement = inputElement.cloneNode(true);
        inputElement.parentNode.replaceChild(newInputElement, inputElement);
        
        // Setze neuen Input-Listener
        newInputElement.addEventListener('input', function() {
            // Aktuelle Session-ID ermitteln
            const sessionId = currentSessionId || getCurrentSessionId();
            
            if (sessionId) {
                // Speichere die Eingabe für diese Session
                sessionInputMap.set(sessionId, this.value);
                console.log(`Eingabe für Session ${sessionId} gespeichert:`, this.value.substring(0, 30) + (this.value.length > 30 ? '...' : ''));
            } else {
                console.warn('Konnte Eingabe nicht speichern: Keine aktive Session-ID.');
            }
        });
        
        console.log('Input-Listener erfolgreich eingerichtet.');
        return true;
    }

    /**
     * Setzt Listener für Session-Tabs
     */
    function setupSessionTabListeners(sessionTabs) {
        if (!sessionTabs || sessionTabs.length === 0) return false;
        
        console.log(`Richte Listener für ${sessionTabs.length} Session-Tabs ein...`);
        
        // Zähler für Tabs mit Listenern
        let setupCount = 0;
        
        // Für jeden Tab einen Click-Listener einrichten
        sessionTabs.forEach(tab => {
            try {
                // Originalen Click-Handler speichern
                const originalOnClick = tab.onclick;
                
                // Neuen Click-Handler einrichten
                tab.onclick = function(event) {
                    // Speichere die aktuelle Eingabe, wenn eine Session aktiv ist
                    if (currentSessionId) {
                        const inputElement = findInputElement();
                        if (inputElement) {
                            sessionInputMap.set(currentSessionId, inputElement.value);
                        }
                    }
                    
                    // Bestimme die Session-ID des angeklickten Tabs
                    const newSessionId = getSessionIdFromElement(this);
                    console.log(`Tab-Klick: Wechsel von Session ${currentSessionId} zu ${newSessionId}`);
                    
                    // Setze die neue aktuelle Session-ID
                    currentSessionId = newSessionId;
                    
                    // Originalen Click-Handler aufrufen, falls vorhanden
                    let result = true;
                    if (typeof originalOnClick === 'function') {
                        result = originalOnClick.call(this, event);
                    }
                    
                    // Verzögerung, um sicherzustellen, dass die neue Session aktiv ist
                    setTimeout(() => {
                        // Lade die gespeicherte Eingabe für diese Session
                        loadInputForCurrentSession();
                    }, 50);
                    
                    return result;
                };
                
                setupCount++;
            } catch (error) {
                console.error('Fehler beim Einrichten eines Tab-Listeners:', error);
            }
        });
        
        console.log(`${setupCount} Tab-Listener erfolgreich eingerichtet.`);
        return setupCount > 0;
    }

    /**
     * Lädt die gespeicherte Eingabe für die aktuelle Session
     */
    function loadInputForCurrentSession() {
        // Aktuelle Session-ID ermitteln, falls nicht bereits gesetzt
        if (!currentSessionId) {
            currentSessionId = getCurrentSessionId();
        }
        
        if (!currentSessionId) {
            console.warn('Konnte gespeicherte Eingabe nicht laden: Keine aktive Session-ID.');
            return false;
        }
        
        // Eingabefeld finden
        const inputElement = findInputElement();
        if (!inputElement) {
            console.warn('Konnte gespeicherte Eingabe nicht laden: Kein Eingabefeld gefunden.');
            return false;
        }
        
        // Gespeicherte Eingabe laden
        const savedInput = sessionInputMap.get(currentSessionId) || '';
        inputElement.value = savedInput;
        
        console.log(`Eingabe für Session ${currentSessionId} geladen:`, savedInput.substring(0, 30) + (savedInput.length > 30 ? '...' : ''));
        return true;
    }

    /**
     * MutationObserver für dynamisch hinzugefügte Session-Tabs
     */
    function setupSessionTabsObserver() {
        // Verschiedene mögliche Container für Session-Tabs
        const containers = [
            '#sessions-list',
            '.sessions-container',
            '.chat-tabs',
            '.tab-list'
        ];
        
        let container = null;
        for (const selector of containers) {
            const element = document.querySelector(selector);
            if (element) {
                container = element;
                console.log(`Session-Tab-Container gefunden mit Selektor: ${selector}`);
                break;
            }
        }
        
        if (!container) {
            console.warn('Keinen Session-Tab-Container gefunden für Observer.');
            
            // Versuche es später erneut
            setTimeout(setupSessionTabsObserver, 1000);
            return false;
        }
        
        // Observer einrichten
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    console.log('Neue Session-Tabs erkannt, aktualisiere Listener...');
                    
                    // Finde alle Session-Tabs und richte Listener ein
                    const sessionTabs = findSessionTabs();
                    setupSessionTabListeners(sessionTabs);
                }
            }
        });
        
        // Starte Beobachtung
        observer.observe(container, {
            childList: true,
            subtree: true
        });
        
        console.log('Session-Tabs-Observer erfolgreich eingerichtet.');
        return true;
    }

    /**
     * Initialisiert den verbesserten Session-Input-Persister
     */
    function init() {
        console.log('Initialisiere Session-Input-Persister...');
        
        // Aktuelle Session-ID ermitteln
        currentSessionId = getCurrentSessionId();
        
        // Eingabefeld finden und Listener einrichten
        const inputElement = findInputElement();
        const inputListenerStatus = setupInputListener(inputElement);
        
        // Session-Tabs finden und Listener einrichten
        const sessionTabs = findSessionTabs();
        const tabListenerStatus = setupSessionTabListeners(sessionTabs);
        
        // Observer für dynamisch hinzugefügte Session-Tabs einrichten
        const observerStatus = setupSessionTabsObserver();
        
        // Initiale Eingabe für die aktuelle Session laden
        loadInputForCurrentSession();
        
        // Globale API für andere Skripte
        window.sessionInputPersister = {
            getInputForSession: (sessionId) => sessionInputMap.get(sessionId) || '',
            setInputForSession: (sessionId, value) => {
                sessionInputMap.set(sessionId, value);
                
                // Wenn dies die aktive Session ist, auch das Eingabefeld aktualisieren
                if (sessionId === currentSessionId) {
                    const inputElement = findInputElement();
                    if (inputElement) {
                        inputElement.value = value;
                    }
                }
                
                return true;
            },
            getCurrentInput: () => {
                const sessionId = currentSessionId || getCurrentSessionId();
                return sessionId ? sessionInputMap.get(sessionId) || '' : '';
            },
            getAllSessionInputs: () => Object.fromEntries(sessionInputMap),
            clearSessionInput: (sessionId) => sessionInputMap.delete(sessionId),
            clearAllSessionInputs: () => sessionInputMap.clear(),
            getCurrentSessionId: () => currentSessionId || getCurrentSessionId()
        };
        
        // Als initialisiert markieren
        window.improvedSessionInputPersisterInitialized = true;
        
        console.log('Session-Input-Persister erfolgreich initialisiert.');
        
        return {
            success: true,
            currentSessionId,
            inputListenerStatus,
            tabListenerStatus,
            observerStatus
        };
    }

    // Fix starten, wenn das DOM bereit ist
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // Kurze Verzögerung zur Sicherheit
            setTimeout(init, 500);
        });
    } else {
        // Kurze Verzögerung zur Sicherheit
        setTimeout(init, 500);
    }

    // Periodische Überprüfung, ob das Eingabefeld existiert (für Single-Page-Anwendungen)
    setInterval(() => {
        if (!window.improvedSessionInputPersisterInitialized) return;
        
        const inputElement = findInputElement();
        if (inputElement && !inputElement._hasSessionInputListener) {
            console.log('Neues Eingabefeld gefunden, richte Listener ein...');
            setupInputListener(inputElement);
            inputElement._hasSessionInputListener = true;
        }
    }, 2000);

    // API für Tests und andere Skripte bereitstellen
    window.improvedSessionInputPersister = {
        init,
        findInputElement,
        findSessionTabs,
        getCurrentSessionId,
        setupInputListener,
        setupSessionTabListeners,
        loadInputForCurrentSession,
        setupSessionTabsObserver,
        isInitialized: () => window.improvedSessionInputPersisterInitialized || false
    };
})();