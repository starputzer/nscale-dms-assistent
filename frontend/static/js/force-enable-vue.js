/**
 * Force Enable Vue.js
 * Dieses Skript stellt sicher, dass die Vue.js-Feature-Toggles korrekt gesetzt sind
 * und die Vue.js-Komponenten aktiviert werden.
 */
(function() {
    console.log('[ForceEnableVue] Aktiviere Vue.js für DocConverter...');
    
    // Feature-Toggles aktivieren
    function enableVueFeatures() {
        // Haupt-UI-Toggle aktivieren
        localStorage.setItem('useNewUI', 'true');
        
        // Spezifische Features aktivieren
        localStorage.setItem('feature_vueDocConverter', 'true');
        
        console.log('[ForceEnableVue] Vue.js-Feature-Toggles aktiviert');
        
        // Weitere Einstellungen bei Bedarf
        if (!localStorage.getItem('featureSettings')) {
            const defaultSettings = {
                vueDocConverter: true,
                vueChat: true,
                vueAdmin: true
            };
            
            localStorage.setItem('featureSettings', JSON.stringify(defaultSettings));
        } else {
            // Bestehende Einstellungen aktualisieren
            try {
                const settings = JSON.parse(localStorage.getItem('featureSettings')) || {};
                settings.vueDocConverter = true;
                localStorage.setItem('featureSettings', JSON.stringify(settings));
            } catch (e) {
                console.error('[ForceEnableVue] Fehler beim Parsen von featureSettings:', e);
            }
        }
    }
    
    // Vue.js-Skript manuell laden
    function loadVueScript() {
        if (typeof window.Vue === 'undefined') {
            console.log('[ForceEnableVue] Lade Vue.js global...');
            const vueScript = document.createElement('script');
            vueScript.src = 'https://cdn.jsdelivr.net/npm/vue@3.2.31/dist/vue.global.prod.js';
            document.head.appendChild(vueScript);
        } else {
            console.log('[ForceEnableVue] Vue.js ist bereits global geladen');
        }
    }
    
    // Funktion zur Aktivierung des DocConverter-Scripts
    function activateDocConverter() {
        console.log('[ForceEnableVue] Aktiviere DocConverter...');
        
        // Timeout, um sicherzustellen, dass potenzielle Abhängigkeiten geladen sind
        setTimeout(function() {
            // Wenn der Script-Loader bereits verfügbar ist, nutzen wir ihn
            if (window.vueScriptLoader && typeof window.vueScriptLoader.loadComponent === 'function') {
                window.vueScriptLoader.loadComponent('doc-converter');
            } else {
                console.log('[ForceEnableVue] Script-Loader nicht verfügbar, lade direkt...');
                
                // Fallback-Methode zum Laden der Komponente
                const script = document.createElement('script');
                script.src = '/static/vue/standalone/doc-converter.js';
                script.onerror = function() {
                    console.error('[ForceEnableVue] Fehler beim Laden von doc-converter.js, versuche Alternative...');
                    
                    const alternativeScript = document.createElement('script');
                    alternativeScript.src = '/frontend/static/vue/standalone/doc-converter.js';
                    document.body.appendChild(alternativeScript);
                };
                
                document.body.appendChild(script);
            }
        }, 1000);
    }
    
    // Feature-Toggles immer aktivieren
    enableVueFeatures();
    
    // Vue.js global laden
    loadVueScript();
    
    // DocConverter aktivieren, wenn wir uns im Admin-Bereich befinden
    if (window.location.pathname.includes('/admin') || 
        document.querySelector('.admin-page') || 
        document.querySelector('[data-tab="docConverter"]')) {
        
        // Warten, bis DOM geladen ist
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', activateDocConverter);
        } else {
            activateDocConverter();
        }
    }
    
    // API für späteren Zugriff
    window.forceEnableVue = {
        enable: enableVueFeatures,
        loadVue: loadVueScript,
        activateDocConverter: activateDocConverter
    };
    
    console.log('[ForceEnableVue] Skript initialisiert');
})();