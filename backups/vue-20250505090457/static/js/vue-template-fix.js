/**
 * Vue-Template-Fix: Löst Probleme mit Inline-Scripts in Vue-Templates
 * 
 * Dieses Skript ersetzt <script>-Tags innerhalb von Vue-Templates durch
 * data-attribute, um Vue-Fehler zu vermeiden.
 */

(function() {
    console.log('[Vue-Template-Fix] Start');
    
    // Funktion, die beim Laden ausgeführt wird
    function handleDOMReady() {
        console.log('[Vue-Template-Fix] DOM geladen, beginne mit der Verarbeitung');
        processScriptTags();
        observeDOMChanges();
    }
    
    // Findet und verarbeitet alle Script-Tags in Vue-Templates
    function processScriptTags() {
        // Skripts in Vue.js-Templating-Bereichen finden
        const scriptTags = document.querySelectorAll('div[v-if], div[v-else] script, .vue-template-container script');
        
        console.log(`[Vue-Template-Fix] ${scriptTags.length} potenziell problematische Script-Tags gefunden`);
        
        scriptTags.forEach((script, index) => {
            // Sicherstellen, dass wir nicht schon verarbeitete Skripte erneut bearbeiten
            if (script.hasAttribute('data-vue-fixed')) {
                return;
            }
            
            // Inhalt des Skripts extrahieren
            const scriptContent = script.innerHTML;
            
            // Eindeutige ID für das Script generieren
            const scriptId = `vue-template-script-${index}-${Date.now()}`;
            
            // Script-Tag markieren als verarbeitet
            script.setAttribute('data-vue-fixed', 'true');
            script.setAttribute('data-script-id', scriptId);
            script.setAttribute('type', 'text/x-template'); // Verhindert Ausführung
            
            // CSS-Klasse hinzufügen, um das Script zu verstecken
            script.classList.add('vue-template-script-hidden');
            
            console.log(`[Vue-Template-Fix] Script "${scriptId}" wurde verarbeitet`);
            
            // Wenn es sich um ein Initialisierungs-Script für den DocConverter handelt,
            // Inhalt in separates externes Skript auslagern
            if (scriptContent.includes('Dokumentenkonverter') || 
                scriptContent.includes('DocConverter') || 
                scriptContent.includes('feature_vueDocConverter')) {
                
                console.log(`[Vue-Template-Fix] DocConverter-Script "${scriptId}" wird in externe Funktion ausgelagert`);
                
                // Funktionen für docConverter in das window-Objekt verschieben
                moveScriptToExternalFunction(scriptContent, scriptId);
            }
        });
    }
    
    // Überträgt den Code in eine externe Funktion
    function moveScriptToExternalFunction(scriptContent, scriptId) {
        try {
            // Funktionsname generieren
            const functionName = `docConverter_${scriptId.replace(/[^a-zA-Z0-9]/g, '_')}`;
            
            // Wrapper-Funktion erstellen
            const functionCode = 
                `window.${functionName} = function() {
                    try {
                        ${scriptContent}
                    } catch(e) {
                        console.error('[Vue-Template-Fix] Fehler bei Ausführung von ${functionName}:', e);
                    }
                };
                
                // Funktion nur registrieren, aber nicht automatisch ausführen
                console.log('[Vue-Template-Fix] Funktion ${functionName} registriert');`;
            
            // Funktion über ein dynamisches Script einfügen
            const scriptElement = document.createElement('script');
            scriptElement.textContent = functionCode;
            scriptElement.setAttribute('data-source-script', scriptId);
            document.body.appendChild(scriptElement);
            
            console.log(`[Vue-Template-Fix] Funktion ${functionName} wurde erstellt`);
        } catch (e) {
            console.error('[Vue-Template-Fix] Fehler beim Erstellen der externen Funktion:', e);
        }
    }
    
    // Beobachtet DOM-Änderungen, um neue Script-Tags zu verarbeiten
    function observeDOMChanges() {
        // Nur fortfahren, wenn MutationObserver unterstützt wird
        if (!window.MutationObserver) {
            console.warn('[Vue-Template-Fix] MutationObserver nicht unterstützt, keine dynamische Verarbeitung möglich');
            return;
        }
        
        const observer = new MutationObserver((mutations) => {
            let hasNewScripts = false;
            
            mutations.forEach(mutation => {
                if (mutation.type === 'childList' && mutation.addedNodes.length) {
                    // Prüfe, ob neue Skripts hinzugefügt wurden
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) { // Element-Knoten
                            const hasScripts = node.tagName === 'SCRIPT' || 
                                              node.querySelector('script');
                            if (hasScripts) {
                                hasNewScripts = true;
                            }
                        }
                    });
                }
            });
            
            // Nur verarbeiten, wenn neue Skripts gefunden wurden
            if (hasNewScripts) {
                processScriptTags();
            }
        });
        
        // Gesamten Body beobachten
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        console.log('[Vue-Template-Fix] DOM-Beobachter für dynamische Script-Tags eingerichtet');
    }
    
    // Speziell für DocConverter: Verhindert die Anzeige auf der Hauptseite
    function removeDocConverterFromMainPage() {
        console.log('[Vue-Template-Fix] Prüfe auf DocConverter auf der Hauptseite');
        
        // URLs und DOM-Elemente prüfen, die auf die Hauptseite hindeuten
        const isMainPage = 
            window.location.pathname === '/' || 
            window.location.pathname === '/index.html' ||
            window.location.href.includes('/chat') ||
            document.querySelector('.chat-page') !== null ||
            document.querySelector('.main-content:not(.admin-panel)') !== null;
            
        if (isMainPage) {
            console.log('[Vue-Template-Fix] Hauptseite erkannt, DocConverter wird deaktiviert');
            
            // DocConverter-Container entfernen, falls vorhanden
            const docConverterContainers = document.querySelectorAll('#doc-converter-app, #doc-converter-container');
            
            docConverterContainers.forEach(container => {
                if (container) {
                    console.log('[Vue-Template-Fix] DocConverter-Container gefunden und wird entfernt:', container.id);
                    
                    // Container ausblenden statt entfernen (weniger invasiv)
                    container.style.display = 'none';
                    container.setAttribute('data-disabled-on-main', 'true');
                }
            });
            
            // Feature-Flag setzen, um DocConverter nur im Admin-Bereich zu laden
            // (behalte den aktuellen Wert für später bei, wenn wir im Admin-Bereich sind)
            const currentValue = localStorage.getItem('feature_vueDocConverter');
            localStorage.setItem('feature_vueDocConverter_main', currentValue || 'true');
            localStorage.setItem('feature_vueDocConverter', 'false');
            
            console.log('[Vue-Template-Fix] DocConverter-Feature-Flag temporär deaktiviert für Hauptseite');
        } else {
            // Wenn wir nicht auf der Hauptseite sind, stelle sicher, dass das Feature-Flag zurückgesetzt wird
            const mainPageValue = localStorage.getItem('feature_vueDocConverter_main');
            if (mainPageValue !== null) {
                localStorage.setItem('feature_vueDocConverter', mainPageValue);
                console.log('[Vue-Template-Fix] DocConverter-Feature-Flag zurückgesetzt:', mainPageValue);
            }
        }
    }
    
    // CSS-Styles für das Verbergen von Script-Tags hinzufügen
    function addFixStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Verstecke alle Vue-Template-Scripts */
            .vue-template-script-hidden {
                display: none !important;
                visibility: hidden !important;
                width: 0 !important;
                height: 0 !important;
                overflow: hidden !important;
                position: absolute !important;
                left: -9999px !important;
                top: -9999px !important;
            }
            
            /* Verstecke DocConverter auf der Hauptseite */
            [data-disabled-on-main="true"] {
                display: none !important;
            }
        `;
        document.head.appendChild(style);
        console.log('[Vue-Template-Fix] CSS-Styles für Fix hinzugefügt');
    }
    
    // Startsequenz
    function initialize() {
        console.log('[Vue-Template-Fix] Initialisierung...');
        addFixStyles();
        
        // Sofort ausführen
        processScriptTags();
        removeDocConverterFromMainPage();
        
        // Beobachter für dynamische Änderungen einrichten
        observeDOMChanges();
        
        console.log('[Vue-Template-Fix] Initialisierung abgeschlossen');
    }
    
    // Beim Laden der Seite initialisieren
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        // DOM bereits geladen
        initialize();
    }
})();