/**
 * Diese Datei enthält Erweiterungen und Verbesserungen für die nscale DMS Assistent App.
 * Sie behandelt vor allem die Quellenreferenzen und Debug-Informationen.
 */

/**
 * Diese Funktion fügt den HTML-Code für das Quellen-Popup zur DOM-Struktur hinzu
 * und überwacht dessen Status, um es bei Änderungen zu aktualisieren
 */
function setupSourcePopupRendering() {
    // Container für Quellen-Popup erstellen oder finden
    let popupContainer = document.getElementById('source-popup-container');
    
    if (!popupContainer) {
        // Erstelle den Container und füge ihn zum DOM hinzu
        popupContainer = document.createElement('div');
        popupContainer.id = 'source-popup-container';
        document.body.appendChild(popupContainer);
    }

    // Vue-Instanz erstellen, um reaktiv auf Änderungen zu reagieren
    // Die Instanz existiert nur, um auf Änderungen im sourceReferences-Modul zu reagieren
    const popupApp = Vue.createApp({
        setup() {
            // Referenzen auf die reactive Elemente aus dem sourceReferences-Modul
            const showSourcePopup = Vue.computed(() => window.sourceRefState?.showSourcePopup);
            const sourcePopupContent = Vue.computed(() => window.sourceRefState?.sourcePopupContent);
            const sourcePopupPosition = Vue.computed(() => window.sourceRefState?.sourcePopupPosition);
            
            // Bei Änderungen den Popup-Container aktualisieren
            Vue.watch(showSourcePopup, (isVisible) => {
                if (isVisible) {
                    renderPopup();
                } else {
                    popupContainer.innerHTML = '';
                }
            });
            
            // Bei Änderungen am Inhalt oder der Position aktualisieren
            Vue.watch([sourcePopupContent, sourcePopupPosition], () => {
                if (showSourcePopup.value) {
                    renderPopup();
                }
            });
            
            // Funktion zum Rendering des Popups
            const renderPopup = () => {
                if (!showSourcePopup.value || !sourcePopupContent.value) {
                    popupContainer.innerHTML = '';
                    return;
                }
                
                const position = sourcePopupPosition.value || { top: 0, left: 0 };
                const content = sourcePopupContent.value;
                
                popupContainer.innerHTML = `
                    <div class="source-popup" style="top: ${position.top}px; left: ${position.left}px;">
                        <div class="source-popup-title">${content.title || 'Quellendetails'}</div>
                        ${content.file ? `<div class="source-popup-file">Datei: ${content.file}</div>` : ''}
                        <div class="source-popup-content">${content.text || 'Keine Informationen verfügbar'}</div>
                        <div class="source-popup-close" onclick="window.closeSourcePopup()">Schließen</div>
                    </div>
                `;
            };
            
            return {
                renderPopup
            };
        }
    }).mount(popupContainer);
    
    // Globales Objekt für die Zustandsverwaltung
    window.sourceRefState = {
        showSourcePopup: false,
        sourcePopupContent: {
            title: '',
            text: '',
            file: '',
            sourceId: ''
        },
        sourcePopupPosition: {
            top: 0,
            left: 0
        }
    };
    
    // Überschreibe die Handler-Funktionen
    const originalShowHandler = window.showSourcePopupHandler;
    window.showSourcePopupHandler = (event, sourceId) => {
        // Position des Popups berechnen
        const rect = event.target.getBoundingClientRect();
        
        // Globalen Zustand aktualisieren
        window.sourceRefState.sourcePopupPosition = {
            top: rect.bottom + window.scrollY,
            left: rect.left + window.scrollX
        };
        
        // Verwende den ursprünglichen Handler, aber mit angepasster Funktionalität
        if (originalShowHandler) {
            // Setze vorläufigen Inhalt
            window.sourceRefState.sourcePopupContent = {
                title: `Quelle ${sourceId}`,
                text: "Lade Quelleninformationen...",
                sourceId: sourceId
            };
            
            // Zeige das Popup an
            window.sourceRefState.showSourcePopup = true;
            
            // Rufe den ursprünglichen Handler auf, der den Inhalt füllt
            originalShowHandler(event, sourceId);
        } else {
            // Fallback, wenn kein Handler definiert ist
            window.sourceRefState.sourcePopupContent = {
                title: `Quelle ${sourceId}`,
                text: "Keine detaillierten Informationen verfügbar",
                sourceId: sourceId
            };
            window.sourceRefState.showSourcePopup = true;
        }
    };
    
    // Überschreibe die Close-Funktion
    window.closeSourcePopup = () => {
        window.sourceRefState.showSourcePopup = false;
    };
}

/**
 * Entfernt die Debug-Informationen zur message_id aus dem DOM
 */
function removeMessageIdDebugInfo() {
    // Führe die Funktion in regelmäßigen Abständen aus, um auch dynamisch hinzugefügte Elemente zu erfassen
    setInterval(() => {
        // Finde alle Elemente mit dem Debug-Text zur message_id
        const debugElements = document.querySelectorAll('div[style*="font-size: 10px"][style*="color: gray"]');
        
        debugElements.forEach(element => {
            // Prüfe, ob der Text "message_id:" enthält
            if (element.textContent && element.textContent.includes('message_id:')) {
                // Debug-Element ausblenden
                element.style.display = 'none';
            }
        });
    }, 1000); // Alle Sekunde prüfen
}

/**
 * Verbessert die Anzeige von Nachrichtenaktionen (Feedback-Buttons, Quellenbuttons)
 * nach dem Streaming.
 */
function enhanceMessageActions() {
    // Überwacht die isStreaming-Variable der App und setzt eine Klasse am body-Element
    const checkStreamingState = () => {
        // Zugriff auf Vue-App und isStreaming-Status
        if (window.app && window.app.$data && window.app.$data.isStreaming !== undefined) {
            const isStreaming = window.app.$data.isStreaming;
            
            // Setze/entferne die Klasse basierend auf dem Streaming-Status
            if (isStreaming) {
                document.body.classList.add('is-streaming');
            } else {
                document.body.classList.remove('is-streaming');
                
                // Nach Streaming-Ende alle message-actions einblenden
                setTimeout(() => {
                    document.querySelectorAll('.message-actions').forEach(elem => {
                        elem.style.opacity = '1';
                    });
                }, 500); // Kurze Verzögerung für bessere Benutzererfahrung
            }
        }
    };
    
    // Regelmäßig den Streaming-Status prüfen
    setInterval(checkStreamingState, 500);
}

/**
 * Verbessert die Titelgenerierung für kurze Nachrichten
 */
function enhanceTitleGeneration() {
    // Überschreibe die automatische Titelgenerierung
    if (window.updateSessionTitle) {
        const originalUpdateTitle = window.updateSessionTitle;
        
        window.updateSessionTitle = async function(sessionId) {
            try {
                // Originalmethode aufrufen
                const result = await originalUpdateTitle(sessionId);
                
                // Nach jedem Streaming die Sitzungsliste neu laden
                if (window.app && window.app.loadSessions) {
                    await window.app.loadSessions();
                }
                
                return result;
            } catch (error) {
                console.error("Fehler bei verbesserter Titelgenerierung:", error);
                // Originalmethode im Fehlerfall aufrufen
                return await originalUpdateTitle(sessionId);
            }
        };
    }
    
    // Nach Streaming-Ende automatisch den Titel aktualisieren
    const watchStreamingForTitleUpdate = () => {
        // Zugriff auf Vue-App und isStreaming-Status
        if (window.app && window.app.$data) {
            const isStreaming = window.app.$data.isStreaming;
            const currentSessionId = window.app.$data.currentSessionId;
            
            // Wenn Streaming gerade beendet wurde, Titel aktualisieren
            if (isStreaming === false && currentSessionId) {
                // Suche die aktuelle Sitzung
                const sessions = window.app.$data.sessions || [];
                const currentSession = sessions.find(s => s.id === currentSessionId);
                
                // Nur aktualisieren, wenn der Titel noch "Neue Unterhaltung" ist
                if (currentSession && currentSession.title === "Neue Unterhaltung") {
                    console.log("Streaming beendet, aktualisiere Titel für 'Neue Unterhaltung'");
                    
                    // Verzögerung für Server-Kommunikation
                    setTimeout(() => {
                        if (window.updateSessionTitle) {
                            window.updateSessionTitle(currentSessionId);
                        }
                    }, 1000);
                }
            }
        }
    };
    
    // Regelmäßig prüfen
    setInterval(watchStreamingForTitleUpdate, 1000);
}

// Nach dem Laden der Seite die Funktionen ausführen
document.addEventListener('DOMContentLoaded', () => {
    // Starte mit kurzer Verzögerung, um sicherzustellen, dass alle Skripte geladen sind
    setTimeout(() => {
        setupSourcePopupRendering();
        removeMessageIdDebugInfo();
        enhanceMessageActions();
        enhanceTitleGeneration();
        
        console.log("App-Erweiterungen erfolgreich initialisiert");
    }, 500);
});