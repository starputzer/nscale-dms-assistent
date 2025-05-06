/**
 * Zentrales Integrationsskript für alle Fixes (Version 2) (2025-05-07)
 *
 * Dieses Skript integriert alle verbesserten Fixes für nscale-assist in der korrekten
 * Reihenfolge und stellt sicher, dass sie ordnungsgemäß initialisiert werden.
 */

(function() {
    console.log('===== NSCALE-ASSIST ALL FIXES INTEGRATION V2 =====');
    console.log('Initialisiere alle verbesserten Fixes (Version 2)...');

    // Verhindere doppelte Initialisierung
    if (window.allFixesIntegrationV2Initialized) {
        console.log('Alle Fixes (V2) wurden bereits integriert.');
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
        textStreaming: '/static/js/fixes/enhanced_text_streaming_fix_v2.js',
        sessionHighlighting: '/static/js/fixes/improved_session_highlighting_fix.js',
        adminPanel: '/static/js/fixes/improved_admin_panel_fix.js',
        sessionInputPersister: '/static/js/fixes/improved_session_input_persister.js',
        adminStats: '/static/js/fixes/improved_admin_stats_fix_v2.js'
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
                return window.enhancedTextStreamingFixV2Initialized === true;
            case 'sessionHighlighting':
                return window.improvedSessionHighlightingFixInitialized === true;
            case 'adminPanel':
                return window.improvedAdminPanelFixInitialized === true;
            case 'sessionInputPersister':
                return window.improvedSessionInputPersisterInitialized === true;
            case 'adminStats':
                return window.improvedAdminStatsFixV2Initialized === true;
            default:
                return false;
        }
    }

    /**
     * Initialisiert alle Fixes in der richtigen Reihenfolge
     */
    async function initAllFixes() {
        console.log('Starte Initialisierung aller Fixes (V2)...');
        
        try {
            // Text-Streaming-Fix laden (hat höchste Priorität)
            try {
                await loadScript(fixScriptPaths.textStreaming);
                await wait(200); // Kurz warten, damit sich das Skript initialisieren kann
                
                fixStatus.textStreaming = isFixInitialized('textStreaming');
                console.log('Text-Streaming-Fix V2 Status:', fixStatus.textStreaming);
            } catch (error) {
                console.error('Fehler beim Laden des Text-Streaming-Fixes V2:', error);
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
                        console.log('Admin-Stats-Fix V2 Status:', fixStatus.adminStats);
                    } catch (error) {
                        console.error('Fehler beim Laden des Admin-Stats-Fixes V2:', error);
                    }
                })()
            ]);
            
            // Als initialisiert markieren
            window.allFixesIntegrationV2Initialized = true;
            
            console.log('===== ALLE FIXES (V2) WURDEN ERFOLGREICH INTEGRIERT =====');
            console.log('Fix-Status V2:', fixStatus);
            
            return true;
        } catch (error) {
            console.error('Fehler bei der Integration aller Fixes (V2):', error);
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
    window.allFixesIntegrationV2 = {
        initAllFixes,
        loadScript,
        isFixInitialized,
        fixStatus,
        isInitialized: () => window.allFixesIntegrationV2Initialized || false
    };
})();