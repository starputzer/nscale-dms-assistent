/**
 * Zentrales Integrationsskript für alle Fixes (2025-05-06)
 *
 * Dieses Skript integriert alle verbesserten Fixes für nscale-assist in der korrekten
 * Reihenfolge und stellt sicher, dass sie ordnungsgemäß initialisiert werden.
 */

(function() {
    console.log('===== NSCALE-ASSIST ALL FIXES INTEGRATION =====');
    console.log('Initialisiere alle verbesserten Fixes...');

    // Verhindere doppelte Initialisierung
    if (window.allFixesIntegrationInitialized) {
        console.log('Alle Fixes wurden bereits integriert.');
        return;
    }

    // Globaler Status für alle Fixes
    const fixStatus = {
        textStreaming: false,
        sessionHighlighting: false,
        adminPanel: false,
        sessionInputPersister: false,
        adminStats: false
    };

    // Pfade zu allen Fix-Skripten
    const fixScriptPaths = {
        textStreaming: '/static/js/fixes/enhanced_text_streaming_fix.js',
        sessionHighlighting: '/static/js/fixes/improved_session_highlighting_fix.js',
        adminPanel: '/static/js/fixes/improved_admin_panel_fix.js',
        sessionInputPersister: '/static/js/fixes/improved_session_input_persister.js',
        adminStats: '/static/js/fixes/improved_admin_stats_fix.js'
    };

    /**
     * Lädt ein JavaScript-File dynamisch
     */
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            console.log(`Lade Skript: ${src}`);
            
            // Prüfe, ob das Skript bereits geladen wurde
            const existingScript = document.querySelector(`script[src="${src}"]`);
            if (existingScript) {
                console.log(`Skript bereits geladen: ${src}`);
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            
            // Event-Handler für erfolgreichen Load
            script.onload = () => {
                console.log(`Skript erfolgreich geladen: ${src}`);
                resolve();
            };
            
            // Event-Handler für Fehler
            script.onerror = (error) => {
                console.error(`Fehler beim Laden des Skripts ${src}:`, error);
                reject(new Error(`Fehler beim Laden des Skripts: ${src}`));
            };
            
            // Skript zum DOM hinzufügen
            document.head.appendChild(script);
        });
    }

    /**
     * Wartet auf eine bestimmte Zeit
     */
    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Prüft, ob ein Fix initialisiert wurde
     */
    function isFixInitialized(fixName) {
        switch (fixName) {
            case 'textStreaming':
                return window.enhancedTextStreamingFixInitialized === true;
            case 'sessionHighlighting':
                return window.improvedSessionHighlightingFixInitialized === true;
            case 'adminPanel':
                return window.improvedAdminPanelFixInitialized === true;
            case 'sessionInputPersister':
                return window.improvedSessionInputPersisterInitialized === true;
            case 'adminStats':
                return window.improvedAdminStatsFixInitialized === true;
            default:
                return false;
        }
    }

    /**
     * Initialisiert alle Fixes in der richtigen Reihenfolge
     */
    async function initAllFixes() {
        console.log('Starte Initialisierung aller Fixes...');
        
        try {
            // Text-Streaming-Fix laden (hat höchste Priorität)
            try {
                await loadScript(fixScriptPaths.textStreaming);
                await wait(200); // Kurz warten, damit sich das Skript initialisieren kann
                
                fixStatus.textStreaming = isFixInitialized('textStreaming');
                console.log('Text-Streaming-Fix Status:', fixStatus.textStreaming);
            } catch (error) {
                console.error('Fehler beim Laden des Text-Streaming-Fixes:', error);
            }
            
            // Die restlichen Fixes parallel laden
            await Promise.all([
                // Session-Highlighting-Fix laden
                (async () => {
                    try {
                        await loadScript(fixScriptPaths.sessionHighlighting);
                        await wait(200);
                        
                        fixStatus.sessionHighlighting = isFixInitialized('sessionHighlighting');
                        console.log('Session-Highlighting-Fix Status:', fixStatus.sessionHighlighting);
                    } catch (error) {
                        console.error('Fehler beim Laden des Session-Highlighting-Fixes:', error);
                    }
                })(),
                
                // Admin-Panel-Fix laden
                (async () => {
                    try {
                        await loadScript(fixScriptPaths.adminPanel);
                        await wait(200);
                        
                        fixStatus.adminPanel = isFixInitialized('adminPanel');
                        console.log('Admin-Panel-Fix Status:', fixStatus.adminPanel);
                    } catch (error) {
                        console.error('Fehler beim Laden des Admin-Panel-Fixes:', error);
                    }
                })(),
                
                // Session-Input-Persister-Fix laden
                (async () => {
                    try {
                        await loadScript(fixScriptPaths.sessionInputPersister);
                        await wait(200);
                        
                        fixStatus.sessionInputPersister = isFixInitialized('sessionInputPersister');
                        console.log('Session-Input-Persister-Fix Status:', fixStatus.sessionInputPersister);
                    } catch (error) {
                        console.error('Fehler beim Laden des Session-Input-Persister-Fixes:', error);
                    }
                })(),
                
                // Admin-Stats-Fix laden
                (async () => {
                    try {
                        await loadScript(fixScriptPaths.adminStats);
                        await wait(200);
                        
                        fixStatus.adminStats = isFixInitialized('adminStats');
                        console.log('Admin-Stats-Fix Status:', fixStatus.adminStats);
                    } catch (error) {
                        console.error('Fehler beim Laden des Admin-Stats-Fixes:', error);
                    }
                })()
            ]);
            
            // Als initialisiert markieren
            window.allFixesIntegrationInitialized = true;
            
            console.log('===== ALLE FIXES WURDEN ERFOLGREICH INTEGRIERT =====');
            console.log('Fix-Status:', fixStatus);
            
            return true;
        } catch (error) {
            console.error('Fehler bei der Integration aller Fixes:', error);
            return false;
        }
    }

    // Fix starten, wenn das DOM bereit ist
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // Kurze Verzögerung zur Sicherheit
            setTimeout(initAllFixes, 500);
        });
    } else {
        // Kurze Verzögerung zur Sicherheit
        setTimeout(initAllFixes, 500);
    }

    // API für Tests und andere Skripte bereitstellen
    window.allFixesIntegration = {
        initAllFixes,
        loadScript,
        isFixInitialized,
        fixStatus,
        isInitialized: () => window.allFixesIntegrationInitialized || false
    };
})();