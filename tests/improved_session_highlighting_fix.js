/**
 * Verbesserter Session-Highlighting-Fix für nscale-assist (2025-05-06)
 *
 * Dieser Fix behebt das Problem, dass alle Tabs mit dem Namen "Neue Unterhaltung"
 * gleichzeitig als aktiv markiert werden, obwohl nur ein Tab aktiv sein sollte.
 */

(function() {
    console.log('===== Verbesserter Session-Highlighting-Fix wird initialisiert =====');

    // Verhindere doppelte Initialisierung
    if (window.improvedSessionHighlightingFixInitialized) {
        console.log('Verbesserter Session-Highlighting-Fix bereits initialisiert.');
        return;
    }

    // Hilfsfunktion zum Extrahieren der Session-ID aus verschiedenen Quellen
    function getSessionIdFromElement(element) {
        // Prüfe auf data-Attribute
        if (element.dataset.sessionId) return element.dataset.sessionId;
        if (element.dataset.id) return element.dataset.id;
        
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
        
        return null;
    }

    // Hilfsfunktion zum Ermitteln aller Session-Elemente
    function getAllSessionElements() {
        // Verschiedene mögliche Selektoren für Session-Items
        const selectors = [
            '.nscale-session-item',
            '#sessions-list li',
            '.session-tab',
            '.chat-tab',
            '.tab-item'
        ];
        
        // Alle passenden Elemente sammeln
        const elements = [];
        for (const selector of selectors) {
            const found = document.querySelectorAll(selector);
            if (found.length > 0) {
                console.log(`${found.length} Session-Elemente gefunden mit Selektor: ${selector}`);
                elements.push(...found);
            }
        }
        
        return elements;
    }

    // Haupt-Fix-Funktion zum Entfernen der aktiven Klasse von allen anderen Sessions
    function updateSessionHighlighting(activeSessionId) {
        console.log(`Aktualisiere Session-Highlighting für aktive Session: ${activeSessionId}`);
        
        if (!activeSessionId) {
            console.warn('Keine aktive Session-ID übergeben');
            return;
        }
        
        // Alle Session-Elemente finden
        const sessionElements = getAllSessionElements();
        if (sessionElements.length === 0) {
            console.warn('Keine Session-Elemente gefunden');
            return;
        }
        
        // CSS-Klassen für aktive Elemente
        const activeClasses = ['active', 'selected', 'current'];
        
        // Zähler für gefundene "Neue Unterhaltung"-Tabs
        let newConversationCount = 0;
        
        // Alle Session-Elemente durchgehen
        sessionElements.forEach(element => {
            // Prüfen, ob es ein "Neue Unterhaltung"-Tab ist
            const titleElement = element.querySelector('.session-title') || element;
            const title = (titleElement.textContent || '').trim();
            
            if (title === 'Neue Unterhaltung') {
                newConversationCount++;
            }
            
            // Session-ID des Elements ermitteln
            const elementSessionId = getSessionIdFromElement(element);
            
            // Entscheide, ob das Element aktiv sein sollte
            const shouldBeActive = elementSessionId === activeSessionId;
            
            // Status aktualisieren
            if (shouldBeActive) {
                // Aktiven Status setzen
                activeClasses.forEach(cls => element.classList.add(cls));
                element.setAttribute('aria-selected', 'true');
                element.setAttribute('aria-current', 'true');
                
                // Visuelle Hervorhebung
                element.style.backgroundColor = '#e0f5ea';
                element.style.borderLeft = '3px solid #00a550';
                element.style.fontWeight = 'bold';
                
                console.log(`Session aktiviert: ${elementSessionId} (${title})`);
            } else {
                // Inaktiven Status setzen
                activeClasses.forEach(cls => element.classList.remove(cls));
                element.setAttribute('aria-selected', 'false');
                element.removeAttribute('aria-current');
                
                // Visuelle Hervorhebung entfernen
                element.style.backgroundColor = '';
                element.style.borderLeft = '';
                element.style.fontWeight = '';
                
                if (elementSessionId) {
                    console.log(`Session deaktiviert: ${elementSessionId} (${title})`);
                }
            }
        });
        
        console.log(`Insgesamt ${newConversationCount} "Neue Unterhaltung"-Tabs gefunden.`);
    }

    // Die originale Session-Wechsel-Funktion patchen
    function patchSessionSwitchingFunctions() {
        try {
            // Verschiedene mögliche Funktionsnamen und Speicherorte
            const functionConfigs = [
                { obj: window, name: 'loadSession' },
                { obj: window.app?.chat, name: 'loadSession' },
                { obj: window.app?.chat, name: 'switchSession' },
                { obj: window, name: 'switchToSession' },
                { obj: window, name: 'activateSession' }
            ];
            
            // Zähler für gepatchte Funktionen
            let patchedCount = 0;
            
            // Alle möglichen Funktionen durchgehen
            for (const config of functionConfigs) {
                const { obj, name } = config;
                
                if (obj && typeof obj[name] === 'function') {
                    console.log(`Patche Session-Wechsel-Funktion: ${name}`);
                    
                    // Originale Funktion sichern
                    const originalFunction = obj[name];
                    
                    // Funktion überschreiben
                    obj[name] = function(sessionId, ...args) {
                        console.log(`Gepatchte ${name}-Funktion aufgerufen mit Session-ID: ${sessionId}`);
                        
                        // Originale Funktion aufrufen
                        const result = originalFunction.call(this, sessionId, ...args);
                        
                        // Session-Highlighting aktualisieren
                        setTimeout(() => {
                            updateSessionHighlighting(sessionId);
                        }, 50);
                        
                        return result;
                    };
                    
                    patchedCount++;
                }
            }
            
            console.log(`${patchedCount} Session-Wechsel-Funktionen gepatcht.`);
            return patchedCount > 0;
        } catch (error) {
            console.error('Fehler beim Patchen der Session-Wechsel-Funktionen:', error);
            return false;
        }
    }

    // Funktion zum Patchen der Click-Handler auf Session-Elementen
    function patchSessionClickHandlers() {
        try {
            // Alle Session-Elemente finden
            const sessionElements = getAllSessionElements();
            if (sessionElements.length === 0) {
                console.warn('Keine Session-Elemente gefunden für Click-Handler-Patching');
                return false;
            }
            
            // Zähler für Elemente mit gepatchten Clickhandlern
            let patchedCount = 0;
            
            // Alle Session-Elemente durchgehen
            sessionElements.forEach(element => {
                try {
                    // Originalen Click-Handler sichern
                    const originalOnClick = element.onclick;
                    
                    // Neuen Click-Handler setzen
                    element.onclick = function(event) {
                        // Session-ID des geklickten Elements ermitteln
                        const sessionId = getSessionIdFromElement(this);
                        console.log(`Session-Element geklickt: ${sessionId}`);
                        
                        // Originalen Click-Handler aufrufen, falls vorhanden
                        let result = true;
                        if (typeof originalOnClick === 'function') {
                            result = originalOnClick.call(this, event);
                        }
                        
                        // Session-Highlighting aktualisieren
                        setTimeout(() => {
                            updateSessionHighlighting(sessionId);
                        }, 50);
                        
                        return result;
                    };
                    
                    patchedCount++;
                } catch (error) {
                    console.error('Fehler beim Patchen eines Session-Click-Handlers:', error);
                }
            });
            
            console.log(`${patchedCount} von ${sessionElements.length} Session-Click-Handlern gepatcht.`);
            return patchedCount > 0;
        } catch (error) {
            console.error('Fehler beim Patchen der Session-Click-Handler:', error);
            return false;
        }
    }

    // DOM-Beobachter für dynamisch hinzugefügte Session-Elemente
    function setupSessionElementsObserver() {
        try {
            // Container für Session-Liste finden
            const container = document.getElementById('sessions-list');
            if (!container) {
                console.warn('Sessions-List-Container nicht gefunden');
                return false;
            }
            
            // MutationObserver konfigurieren
            const observer = new MutationObserver((mutations) => {
                let newElementsFound = false;
                
                for (const mutation of mutations) {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        newElementsFound = true;
                        
                        // Aktuelle aktive Session-ID ermitteln
                        const activeSessionId = getCurrentSessionId();
                        
                        // Session-Highlighting aktualisieren
                        if (activeSessionId) {
                            updateSessionHighlighting(activeSessionId);
                        }
                    }
                }
                
                // Click-Handler patchen, wenn neue Elemente gefunden wurden
                if (newElementsFound) {
                    setTimeout(patchSessionClickHandlers, 100);
                }
            });
            
            // Observer aktivieren
            observer.observe(container, { childList: true, subtree: true });
            console.log('DOM-Observer für Session-Elemente eingerichtet.');
            
            return true;
        } catch (error) {
            console.error('Fehler beim Einrichten des Session-Elements-Observers:', error);
            return false;
        }
    }

    // Hilfsfunktion zum Ermitteln der aktuellen Session-ID
    function getCurrentSessionId() {
        // Verschiedene Quellen für die aktuelle Session-ID prüfen
        
        // 1. Aktiver Tab im DOM
        const activeTab = document.querySelector('.nscale-session-item.active, #sessions-list li.active, .session-tab.active');
        if (activeTab) {
            const sessionId = getSessionIdFromElement(activeTab);
            if (sessionId) return sessionId;
        }
        
        // 2. Globale Variablen
        const globalVarNames = ['currentSessionId', 'activeSessionId', 'sessionId'];
        for (const varName of globalVarNames) {
            if (window[varName]) return window[varName];
        }
        
        // 3. App-Objekt-Variablen
        if (window.app?.chat?.currentSessionId) return window.app.chat.currentSessionId;
        if (window.app?.currentSessionId) return window.app.currentSessionId;
        
        // 4. URL-Parameter
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session_id');
        if (sessionId) return sessionId;
        
        // 5. localStorage
        const storedId = localStorage.getItem('currentSessionId');
        if (storedId) return storedId;
        
        console.warn('Konnte keine aktuelle Session-ID ermitteln');
        return null;
    }

    // Initialisierung des Fixes
    function init() {
        console.log('Initialisiere Session-Highlighting-Fix...');
        
        // Status setzen
        const status = {
            sessionFunctionsPatch: patchSessionSwitchingFunctions(),
            clickHandlersPatch: patchSessionClickHandlers(),
            observer: setupSessionElementsObserver()
        };
        
        // Aktuellen Zustand einmalig korrigieren
        const currentSessionId = getCurrentSessionId();
        if (currentSessionId) {
            updateSessionHighlighting(currentSessionId);
        } else {
            console.warn('Keine aktive Session gefunden bei der Initialisierung');
        }
        
        // Zusammenfassung anzeigen
        console.log('Session-Highlighting-Fix-Status:', status);
        
        // Als initialisiert markieren
        window.improvedSessionHighlightingFixInitialized = true;
        
        return status;
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

    // API für Tests und andere Skripte bereitstellen
    window.improvedSessionHighlightingFix = {
        init,
        updateSessionHighlighting,
        patchSessionSwitchingFunctions,
        patchSessionClickHandlers,
        setupSessionElementsObserver,
        getCurrentSessionId,
        isInitialized: () => window.improvedSessionHighlightingFixInitialized || false
    };
})();