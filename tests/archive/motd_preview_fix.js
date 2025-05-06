/**
 * MOTD-Preview-Fix für nscale-assist
 * 
 * Behebt den Fehler "Cannot read properties of undefined (reading 'trim')" 
 * bei der Vorschau der MOTD im Admin-Tab "MOTD".
 */

(function() {
    console.log('===== NSCALE-ASSIST MOTD-PREVIEW-FIX =====');
    
    function fixMotdPreview() {
        console.log('Repariere MOTD-Vorschau...');
        
        // Finde die relevanten MOTD-Elemente
        const motdContent = document.getElementById('motd-content');
        const motdPreview = document.getElementById('motd-preview-content');
        const motdEnabled = document.getElementById('motd-enabled');
        
        if (!motdContent || !motdPreview) {
            console.error('MOTD-Elemente nicht gefunden, kann MOTD-Vorschau nicht reparieren.');
            
            // Verzögert prüfen, ob die Elemente später geladen werden
            setTimeout(() => {
                const lateMotdContent = document.getElementById('motd-content');
                const lateMotdPreview = document.getElementById('motd-preview-content');
                
                if (lateMotdContent && lateMotdPreview) {
                    console.log('MOTD-Elemente gefunden nach verzögerter Prüfung, setze Fix fort...');
                    setupPreviewHandler(lateMotdContent, lateMotdPreview);
                } else {
                    console.error('MOTD-Elemente auch nach verzögerter Prüfung nicht gefunden.');
                }
            }, 2000);
            
            return false;
        }
        
        console.log('MOTD-Elemente gefunden, richte Preview-Handler ein...');
        return setupPreviewHandler(motdContent, motdPreview);
    }
    
    function setupPreviewHandler(motdContent, motdPreview) {
        // Robuste Markdown-Formatierung, die mit null und undefined umgehen kann
        function formatMotdContent(content) {
            // Sicherstellen, dass content ein String ist
            content = (content || '').toString();
            
            return content
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n\n/g, '<br/><br/>')
                .replace(/\n-\s/g, '<br/>• ');
        }
        
        // Setze die initiale Vorschau
        try {
            const initialContent = motdContent.value || '';
            motdPreview.innerHTML = formatMotdContent(initialContent);
            console.log('Initiale MOTD-Vorschau gesetzt.');
        } catch (error) {
            console.error('Fehler beim Setzen der initialen MOTD-Vorschau:', error);
        }
        
        // Füge einen robusten Event-Listener hinzu
        try {
            // Entferne alle bestehenden Event-Listener durch Klonen
            const newMotdContent = motdContent.cloneNode(true);
            motdContent.parentNode.replaceChild(newMotdContent, motdContent);
            
            // Füge den neuen Event-Listener hinzu
            newMotdContent.addEventListener('input', function() {
                try {
                    const content = this.value || '';
                    motdPreview.innerHTML = formatMotdContent(content);
                } catch (error) {
                    console.error('Fehler beim Aktualisieren der MOTD-Vorschau:', error);
                    motdPreview.innerHTML = '<span style="color: red;">Fehler bei der Vorschau. Bitte prüfen Sie den Inhalt.</span>';
                }
            });
            
            console.log('MOTD-Vorschau-Listener erfolgreich eingerichtet.');
            
            // Finde die Farb-Picker und richte Event-Listener ein
            const bgColor = document.getElementById('motd-bg-color');
            const borderColor = document.getElementById('motd-border-color');
            const textColor = document.getElementById('motd-text-color');
            const previewContainer = document.getElementById('motd-preview');
            
            if (bgColor && borderColor && textColor && previewContainer) {
                function updatePreviewStyle() {
                    try {
                        previewContainer.style.backgroundColor = bgColor.value || '#fff3cd';
                        previewContainer.style.borderColor = borderColor.value || '#ffeeba';
                        previewContainer.style.color = textColor.value || '#856404';
                    } catch (error) {
                        console.error('Fehler beim Aktualisieren des MOTD-Stils:', error);
                    }
                }
                
                // Entferne bestehende Event-Listener und füge neue hinzu
                [bgColor, borderColor, textColor].forEach(colorPicker => {
                    if (colorPicker) {
                        const newColorPicker = colorPicker.cloneNode(true);
                        colorPicker.parentNode.replaceChild(newColorPicker, colorPicker);
                        newColorPicker.addEventListener('input', updatePreviewStyle);
                    }
                });
                
                console.log('MOTD-Stil-Listener erfolgreich eingerichtet.');
            } else {
                console.warn('Einige MOTD-Stil-Elemente wurden nicht gefunden.');
            }
            
            return true;
        } catch (error) {
            console.error('Fehler beim Einrichten des MOTD-Vorschau-Listeners:', error);
            return false;
        }
    }
    
    // Finde den MOTD-Tab-Button und füge einen Event-Listener hinzu, der den Fix beim Klick anwendet
    function addMotdTabButtonHandler() {
        const motdTabButton = document.getElementById('motd-tab-btn');
        
        if (!motdTabButton) {
            console.warn('MOTD-Tab-Button nicht gefunden, versuche alternativen Ansatz...');
            
            // Alternativer Ansatz: MutationObserver verwenden, um auf das Laden des MOTD-Tabs zu warten
            const tabsContainer = document.querySelector('.admin-nav, .tabs-container, #admin-tabs');
            
            if (tabsContainer) {
                console.log('Tabs-Container gefunden, überwache Änderungen...');
                
                const observer = new MutationObserver((mutations) => {
                    for (const mutation of mutations) {
                        if (mutation.type === 'childList' || mutation.type === 'attributes') {
                            const motdTabBtn = document.getElementById('motd-tab-btn');
                            if (motdTabBtn) {
                                console.log('MOTD-Tab-Button dynamisch gefunden, füge Handler hinzu...');
                                observer.disconnect();
                                setupMotdTabButtonHandler(motdTabBtn);
                                break;
                            }
                        }
                    }
                });
                
                observer.observe(tabsContainer, { childList: true, subtree: true, attributes: true });
                console.log('MutationObserver für MOTD-Tab eingerichtet.');
            } else {
                console.error('Weder MOTD-Tab-Button noch Tabs-Container gefunden.');
                
                // Letzte Chance: Zeitgesteuert nach dem MOTD-Tab suchen
                setTimeout(() => {
                    const lateMotdTabBtn = document.getElementById('motd-tab-btn');
                    if (lateMotdTabBtn) {
                        console.log('MOTD-Tab-Button nach Verzögerung gefunden, füge Handler hinzu...');
                        setupMotdTabButtonHandler(lateMotdTabBtn);
                    } else {
                        console.error('MOTD-Tab-Button konnte nicht gefunden werden.');
                        // Direkter Fix-Versuch ohne Tab-Button
                        fixMotdPreview();
                    }
                }, 3000);
            }
            
            return false;
        }
        
        console.log('MOTD-Tab-Button gefunden, füge Handler hinzu...');
        return setupMotdTabButtonHandler(motdTabButton);
    }
    
    function setupMotdTabButtonHandler(motdTabButton) {
        try {
            // Entferne alle bestehenden Event-Listener durch Klonen
            const newMotdTabButton = motdTabButton.cloneNode(true);
            motdTabButton.parentNode.replaceChild(newMotdTabButton, motdTabButton);
            
            // Original-Funktion zum Aktivieren des Tabs beibehalten
            const originalOnclick = motdTabButton.onclick;
            
            // Füge den neuen Event-Listener hinzu
            newMotdTabButton.addEventListener('click', function(event) {
                // Original-Funktion ausführen, falls vorhanden
                if (typeof originalOnclick === 'function') {
                    originalOnclick.call(this, event);
                }
                
                // MOTD-Vorschau nach kurzer Verzögerung reparieren, damit der Tab vollständig geladen ist
                setTimeout(fixMotdPreview, 500);
            });
            
            console.log('MOTD-Tab-Button-Handler erfolgreich eingerichtet.');
            return true;
        } catch (error) {
            console.error('Fehler beim Einrichten des MOTD-Tab-Button-Handlers:', error);
            return false;
        }
    }
    
    // Verzögerte Ausführung, um sicherzustellen, dass die DOM-Struktur geladen ist
    function waitForDOMToBeReady() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => setTimeout(initFix, 500));
        } else {
            setTimeout(initFix, 500);
        }
    }
    
    function initFix() {
        // Prüfe, ob bereits der MOTD-Tab aktiv ist
        const motdTab = document.getElementById('motd-tab');
        if (motdTab && window.getComputedStyle(motdTab).display !== 'none') {
            console.log('MOTD-Tab bereits aktiv, wende direkten Fix an...');
            fixMotdPreview();
        } else {
            console.log('MOTD-Tab nicht aktiv, richte Tab-Button-Handler ein...');
            addMotdTabButtonHandler();
        }
    }
    
    // Fix starten
    try {
        waitForDOMToBeReady();
        console.log('MOTD-Preview-Fix initialisiert.');
    } catch (error) {
        console.error('Fehler beim Initialisieren des MOTD-Preview-Fixes:', error);
    }
})();