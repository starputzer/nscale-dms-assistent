/**
 * Session-Input-Persister-Fix für nscale-assist
 * 
 * Behebt Probleme mit dem Speichern von Eingaben in verschiedenen Chat-Tabs.
 * Dieses Skript sorgt dafür, dass eingegebene Texte pro Tab erhalten bleiben.
 */

(function() {
    console.log('===== NSCALE-ASSIST SESSION-INPUT-PERSISTER-FIX =====');
    
    function fixSessionInputPersistence() {
        console.log('Repariere Session-Input-Persistenz...');
        
        // Speicher für Eingaben pro Session
        const sessionInputMap = new Map();
        
        // Identifiziere die relevanten DOM-Elemente
        const inputElement = document.querySelector('#message-input, .message-input, textarea[name="message"]');
        if (!inputElement) {
            console.error('Konnte Eingabefeld nicht finden.');
            return { success: false, error: 'Eingabefeld nicht gefunden' };
        }
        
        // Ermittle die Session-Tabs
        const sessionTabs = document.querySelectorAll('.session-tab, .chat-tab, .tab-item');
        if (sessionTabs.length === 0) {
            console.warn('Keine Session-Tabs gefunden, suche nach Session-Auswahl...');
            
            // Alternative: Session-Auswahl über ein Dropdown-Menü
            const sessionSelect = document.querySelector('select.session-select, #session-selector');
            if (sessionSelect) {
                console.log('Session-Dropdown gefunden.');
                setupSessionSelectHandler(sessionSelect);
                return { success: true, element: 'select', count: 1 };
            } else {
                console.error('Keine Session-Tabs oder Session-Auswahl gefunden.');
                return { success: false, error: 'Keine Session-Elemente gefunden' };
            }
        }
        
        console.log(`${sessionTabs.length} Session-Tabs gefunden.`);
        setupSessionTabHandlers(sessionTabs);
        
        // Funktionen zur Verarbeitung der Session-Eingaben
        
        // Handler für Session-Tabs einrichten
        function setupSessionTabHandlers(tabs) {
            console.log('Richte Event-Handler für Session-Tabs ein...');
            
            // Aktuelle Session beim Laden identifizieren
            let activeTabId = getCurrentSessionId();
            console.log(`Aktuelle Session-ID beim Start: ${activeTabId}`);
            
            // Event-Listener für jede Eingabeänderung
            inputElement.addEventListener('input', function() {
                const currentSession = getCurrentSessionId();
                if (currentSession) {
                    console.log(`Speichere Eingabe für Session ${currentSession}:`, inputElement.value);
                    sessionInputMap.set(currentSession, inputElement.value);
                }
            });
            
            // Event-Listener für jeden Tab einrichten
            tabs.forEach(tab => {
                // Speichere den ursprünglichen Click-Handler
                const originalClickHandler = tab.onclick;
                
                // Ersetze den Click-Handler
                tab.onclick = function(event) {
                    // Speichere die aktuelle Eingabe
                    if (activeTabId) {
                        sessionInputMap.set(activeTabId, inputElement.value);
                    }
                    
                    // Bestimme die neue aktive Session
                    const sessionId = getSessionIdFromTab(tab);
                    activeTabId = sessionId;
                    
                    console.log(`Wechsel zu Session ${sessionId}`);
                    
                    // Lade die gespeicherte Eingabe für diese Session
                    const savedInput = sessionInputMap.get(sessionId) || '';
                    inputElement.value = savedInput;
                    
                    // Führe den ursprünglichen Click-Handler aus, falls vorhanden
                    if (typeof originalClickHandler === 'function') {
                        originalClickHandler.call(this, event);
                    }
                };
                
                console.log(`Event-Handler für Tab mit ID ${getSessionIdFromTab(tab) || 'unbekannt'} eingerichtet.`);
            });
            
            // Initiale Eingabe laden, wenn bereits gespeichert
            if (activeTabId) {
                const savedInput = sessionInputMap.get(activeTabId) || '';
                inputElement.value = savedInput;
                console.log(`Initiale Eingabe für Session ${activeTabId} geladen:`, savedInput);
            }
        }
        
        // Handler für Session-Dropdown einrichten
        function setupSessionSelectHandler(selectElement) {
            console.log('Richte Event-Handler für Session-Dropdown ein...');
            
            // Aktuelle Session beim Laden identifizieren
            let activeSessionId = selectElement.value;
            console.log(`Aktuelle Session-ID beim Start: ${activeSessionId}`);
            
            // Event-Listener für jede Eingabeänderung
            inputElement.addEventListener('input', function() {
                const currentSession = selectElement.value;
                if (currentSession) {
                    console.log(`Speichere Eingabe für Session ${currentSession}:`, inputElement.value);
                    sessionInputMap.set(currentSession, inputElement.value);
                }
            });
            
            // Event-Listener für das Dropdown einrichten
            selectElement.addEventListener('change', function() {
                // Speichere die aktuelle Eingabe
                if (activeSessionId) {
                    sessionInputMap.set(activeSessionId, inputElement.value);
                }
                
                // Bestimme die neue aktive Session
                const sessionId = this.value;
                activeSessionId = sessionId;
                
                console.log(`Wechsel zu Session ${sessionId}`);
                
                // Lade die gespeicherte Eingabe für diese Session
                const savedInput = sessionInputMap.get(sessionId) || '';
                inputElement.value = savedInput;
            });
            
            // Initiale Eingabe laden, wenn bereits gespeichert
            if (activeSessionId) {
                const savedInput = sessionInputMap.get(activeSessionId) || '';
                inputElement.value = savedInput;
                console.log(`Initiale Eingabe für Session ${activeSessionId} geladen:`, savedInput);
            }
        }
        
        // Hilfsfunktion zum Ermitteln der aktuellen Session-ID
        function getCurrentSessionId() {
            // Prüfe auf aktiven Tab
            const activeTab = document.querySelector('.session-tab.active, .chat-tab.active, .tab-item.active');
            if (activeTab) {
                return getSessionIdFromTab(activeTab);
            }
            
            // Prüfe auf ausgewählte Option im Dropdown
            const sessionSelect = document.querySelector('select.session-select, #session-selector');
            if (sessionSelect) {
                return sessionSelect.value;
            }
            
            // Prüfe auf URL-Parameter
            const urlParams = new URLSearchParams(window.location.search);
            const sessionId = urlParams.get('session_id');
            if (sessionId) {
                return sessionId;
            }
            
            // Prüfe auf globale Variable
            if (window.currentSessionId) {
                return window.currentSessionId;
            }
            
            if (window.sessionId) {
                return window.sessionId;
            }
            
            return null;
        }
        
        // Hilfsfunktion zum Ermitteln der Session-ID aus einem Tab
        function getSessionIdFromTab(tab) {
            // Prüfe auf data-session-id oder data-id Attribut
            if (tab.dataset.sessionId) {
                return tab.dataset.sessionId;
            }
            
            if (tab.dataset.id) {
                return tab.dataset.id;
            }
            
            // Prüfe auf id-Attribut
            if (tab.id && tab.id.includes('session-')) {
                return tab.id.replace('session-', '');
            }
            
            // Prüfe auf href-Attribut mit session_id-Parameter
            if (tab.href) {
                const hrefUrl = new URL(tab.href, window.location.origin);
                const sessionId = hrefUrl.searchParams.get('session_id');
                if (sessionId) {
                    return sessionId;
                }
            }
            
            // Fallback: Suche nach einer ID im Text des Tabs
            const tabText = tab.textContent || '';
            const idMatch = tabText.match(/#(\d+)/);
            if (idMatch && idMatch[1]) {
                return idMatch[1];
            }
            
            return null;
        }
        
        // Einrichtung eines globalen API für andere Scripts
        window.sessionInputPersister = {
            getInputForSession: (sessionId) => sessionInputMap.get(sessionId) || '',
            setInputForSession: (sessionId, value) => sessionInputMap.set(sessionId, value),
            getCurrentInput: () => {
                const currentSessionId = getCurrentSessionId();
                return currentSessionId ? sessionInputMap.get(currentSessionId) || '' : '';
            },
            getAllSessionInputs: () => Object.fromEntries(sessionInputMap),
            clearSessionInput: (sessionId) => sessionInputMap.delete(sessionId),
            clearAllSessionInputs: () => sessionInputMap.clear()
        };
        
        console.log('Session-Input-Persister erfolgreich eingerichtet.');
        return { success: true, element: 'tabs', count: sessionTabs.length };
    }
    
    // Ausführung verzögern, um sicherzustellen, dass die DOM-Struktur geladen ist
    function waitForDOMToBeReady() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => setTimeout(fixSessionInputPersistence, 500));
        } else {
            setTimeout(fixSessionInputPersistence, 500);
        }
    }
    
    // Fix starten
    try {
        waitForDOMToBeReady();
        console.log('Session-Input-Persister-Fix initialisiert.');
    } catch (error) {
        console.error('Fehler beim Initialisieren des Session-Input-Persister-Fixes:', error);
    }
})();