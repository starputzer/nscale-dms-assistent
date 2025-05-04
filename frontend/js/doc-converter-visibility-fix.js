/**
 * DocConverter Visibility Fix
 * Dieses Skript stellt sicher, dass der DocConverter-Tab immer sichtbar ist,
 * indem es display:none und visibility:hidden überschreibt.
 */

(function() {
    // Logging-Funktion
    function log(message) {
        console.log('[VisibilityFix] ' + message);
    }
    
    // Hauptfunktion zur Überprüfung und Korrektur der Sichtbarkeit
    function fixVisibility() {
        log('Prüfe DocConverter-Container Sichtbarkeit...');
        
        // Alle möglichen Container-Selektoren
        const selectors = [
            '#doc-converter-container',
            '#doc-converter-app',
            '.doc-converter',
            '[data-tab="docConverter"]',
            '.admin-tab-content[data-tab="docConverter"]',
            '.tab-content[data-active-tab="docConverter"]'
        ];
        
        // Jedes Element prüfen und korrigieren
        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                log(`${selector}: ${elements.length} Element(e) gefunden`);
                
                elements.forEach(el => {
                    // Force-Display und Force-Visibility setzen
                    el.style.setProperty('display', 'block', 'important');
                    el.style.setProperty('visibility', 'visible', 'important');
                    el.style.setProperty('opacity', '1', 'important');
                    
                    // Zusätzlich die computed styles überprüfen
                    const computedStyle = window.getComputedStyle(el);
                    if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
                        log(`Element ${selector} benötigt stärkere Korrektur`);
                        
                        // Aggressivere Methode: Inline-Style mit !important überschreiben
                        el.setAttribute('style', 
                            el.getAttribute('style') + 
                            '; display: block !important; ' + 
                            'visibility: visible !important; ' + 
                            'opacity: 1 !important'
                        );
                        
                        // CSS-Klasse hinzufügen mit höchster Spezifität
                        el.classList.add('doc-converter-force-visible');
                    }
                    
                    log(`${selector} sichtbar gemacht`);
                });
            } else {
                log(`${selector}: Keine Elemente gefunden`);
            }
        });
        
        // Prüfe auf Tab-Content und schalte den aktiven Tab um
        const tabContent = document.querySelector('.tab-content');
        if (tabContent) {
            tabContent.setAttribute('data-active-tab', 'docConverter');
            log('Tab-Content auf docConverter umgestellt');
        }
        
        // Füge Force-Visible CSS hinzu
        addForceCss();
    }
    
    // CSS zum Erzwingen der Sichtbarkeit
    function addForceCss() {
        if (document.getElementById('doc-converter-force-css')) {
            return;
        }
        
        const style = document.createElement('style');
        style.id = 'doc-converter-force-css';
        style.innerHTML = `
            /* CSS mit höchster Spezifität zur Erzwingung der Sichtbarkeit */
            body #doc-converter-container,
            body #doc-converter-app,
            body .doc-converter,
            body [data-tab="docConverter"],
            body .admin-tab-content[data-tab="docConverter"],
            body .tab-content[data-active-tab="docConverter"],
            body .doc-converter-force-visible {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                min-height: 400px !important;
                width: 100% !important;
                position: relative !important;
                z-index: 100 !important;
            }
            
            /* Wenn innerhalb eines Tabs, Tab aktivieren */
            body .tab-content[data-active-tab="docConverter"] {
                display: block !important;
            }
            
            /* Tab-Aktivierung visuell darstellen */
            body .admin-nav-item[data-tab="docConverter"],
            body .admin-nav-item[data-tab="docConverter"].active,
            body .rescue-nav-item[data-tab="doc-converter"].active {
                background-color: rgba(59, 130, 246, 0.1) !important;
                color: #3b82f6 !important;
                border-left: 3px solid #3b82f6 !important;
            }
            
            /* DocConverter-Content-Container garantiert sichtbar */
            body .doc-converter-content-container, 
            body .doc-converter-view {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
            }
        `;
        
        document.head.appendChild(style);
        log('Force-CSS hinzugefügt');
    }
    
    // Beobachter für DOM-Änderungen
    function observeDOM() {
        log('Starte DOM-Beobachtung für dynamische Änderungen');
        
        // MutationObserver für dynamisch hinzugefügte Elemente
        const observer = new MutationObserver(function(mutations) {
            let shouldFix = false;
            
            mutations.forEach(mutation => {
                // Prüfe, ob relevante Elemente hinzugefügt wurden
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) { // Element-Node
                            // Prüfe, ob es ein relevantes Element ist oder enthält
                            if (node.id === 'doc-converter-container' || 
                                node.id === 'doc-converter-app' ||
                                node.classList && node.classList.contains('doc-converter') ||
                                node.getAttribute && node.getAttribute('data-tab') === 'docConverter' ||
                                node.querySelector && (
                                    node.querySelector('#doc-converter-container') ||
                                    node.querySelector('#doc-converter-app') ||
                                    node.querySelector('.doc-converter') ||
                                    node.querySelector('[data-tab="docConverter"]')
                                )) {
                                shouldFix = true;
                            }
                        }
                    });
                }
                
                // Auch bei Attributänderungen prüfen
                if (mutation.type === 'attributes') {
                    const node = mutation.target;
                    if (node.id === 'doc-converter-container' || 
                        node.id === 'doc-converter-app' ||
                        node.classList && node.classList.contains('doc-converter') ||
                        node.getAttribute && node.getAttribute('data-tab') === 'docConverter') {
                        shouldFix = true;
                    }
                }
            });
            
            if (shouldFix) {
                log('Relevante DOM-Änderung erkannt, fixe Sichtbarkeit');
                fixVisibility();
            }
        });
        
        // Gesamtes Dokument beobachten
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class', 'data-tab', 'data-active-tab']
        });
    }
    
    // Tab-Aktivierung erzwingen
    function forceTabActivation() {
        log('Suche nach Tab-Aktivierungselementen');
        
        // Tab-Elemente suchen
        const tabItems = document.querySelectorAll('.admin-nav-item[data-tab="docConverter"], .tab-item[data-tab="docConverter"]');
        
        if (tabItems.length > 0) {
            log(`${tabItems.length} Tab-Elemente gefunden, aktiviere`);
            
            tabItems.forEach(tab => {
                // Klasse 'active' hinzufügen
                tab.classList.add('active');
                
                // Click-Event simulieren für Event-Handler
                try {
                    const clickEvent = new MouseEvent('click', {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    });
                    
                    tab.dispatchEvent(clickEvent);
                    log('Click-Event auf Tab ausgelöst');
                } catch (e) {
                    log('Fehler beim Auslösen des Click-Events: ' + e.message);
                }
            });
        } else {
            log('Keine Tab-Elemente gefunden');
        }
    }
    
    // Check existierende Fallback-Scripts und aktiviere sie
    function activateFallbacks() {
        log('Aktiviere vorhandene Fallback-Mechanismen');
        
        // Klassischen DocConverter initialisieren, wenn verfügbar
        if (typeof window.initializeClassicDocConverter === 'function') {
            try {
                window.initializeClassicDocConverter();
                log('Klassischer DocConverter initialisiert');
            } catch (e) {
                log('Fehler bei Initialisierung des klassischen DocConverters: ' + e.message);
            }
        } else {
            log('Klassischer DocConverter nicht verfügbar');
        }
        
        // DocConverter-Path-Tester aktivieren, wenn verfügbar
        if (typeof window.docConverterPathTester === 'object' && window.docConverterPathTester.test) {
            try {
                window.docConverterPathTester.test();
                window.docConverterPathTester.checkDOM();
                log('DocConverter Path Tester aktiviert');
            } catch (e) {
                log('Fehler bei Aktivierung des Path Testers: ' + e.message);
            }
        }
    }
    
    // Hauptinitialisierung
    function initialize() {
        log('Visibility Fix wird initialisiert');
        
        // Sofortige Korrektur
        fixVisibility();
        
        // Fallbacks aktivieren
        activateFallbacks();
        
        // Tab aktivieren
        forceTabActivation();
        
        // DOM beobachten für dynamische Änderungen
        observeDOM();
        
        // Intervall-basierte Überprüfung als letzte Sicherheit
        setInterval(fixVisibility, 2000);
        
        log('Visibility Fix vollständig initialisiert');
    }
    
    // Starten, wenn das DOM geladen ist oder sofort, wenn es bereits geladen ist
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();