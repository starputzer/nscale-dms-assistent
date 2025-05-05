/**
 * force-enable-vue.js
 * Aktiviert permanent alle Vue.js-Komponenten ohne Reload-Schleife
 * Diese Datei ist Teil der abgeschlossenen Vue.js-Migration
 */

(function() {
    // Konfiguration
    const CONFIG = {
        debug: true,
        vueFeatures: [
            'vueDocConverter',
            'vueChat', 
            'vueAdmin', 
            'vueSettings'
        ],
        cssFiles: [
            'admin.css',
            'admin-styles.css',
            'vue-fix.css',
            'vue-template-fix.css'
        ],
        cssPaths: [
            '/css/',
            '/frontend/css/',
            '/api/static/css/',
            '/static/css/',
            '/nscale-vue/src/assets/css/'
        ]
    };

    // Logging-Funktion
    function log(message, type = 'log') {
        if (!CONFIG.debug && type === 'debug') return;
        
        const prefix = '[force-enable-vue]';
        switch(type) {
            case 'error': console.error(prefix, message); break;
            case 'warn': console.warn(prefix, message); break;
            case 'info': console.info(prefix, message); break;
            default: console.log(prefix, message);
        }
    }

    // Prüfe den aktuellen Migrations-Status
    function checkMigrationStatus() {
        const migrationComplete = localStorage.getItem('vue_migration_complete') === 'true';
        const useNewUI = localStorage.getItem('useNewUI') === 'true';
        const featureUseNewUI = localStorage.getItem('feature_useNewUI') === 'true';
        
        // Prüfe, ob alle Vue-Features aktiviert sind
        const allFeaturesEnabled = CONFIG.vueFeatures.every(feature => 
            localStorage.getItem(`feature_${feature}`) === 'true'
        );
        
        const status = {
            migrationComplete,
            useNewUI,
            featureUseNewUI,
            allFeaturesEnabled,
            fullyMigrated: migrationComplete && useNewUI && featureUseNewUI && allFeaturesEnabled
        };
        
        log(`Migration Status: ${JSON.stringify(status)}`, 'debug');
        return status;
    }

    // Lade CSS-Dateien mit verschiedenen Pfaden
    function loadAdminCSS() {
        const loadedFiles = [];
        
        CONFIG.cssFiles.forEach(cssFile => {
            // Prüfe, ob CSS bereits geladen wurde
            const existingLinks = document.querySelectorAll(`link[href$="/${cssFile}"]`);
            if (existingLinks.length > 0) {
                log(`CSS ${cssFile} bereits geladen`, 'debug');
                loadedFiles.push(cssFile);
                return;
            }
            
            let loaded = false;
            CONFIG.cssPaths.forEach(basePath => {
                if (loaded) return;
                
                const fullPath = `${basePath}${cssFile}`;
                try {
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = fullPath;
                    link.onload = () => {
                        log(`CSS geladen: ${fullPath}`);
                        loaded = true;
                        loadedFiles.push(cssFile);
                    };
                    link.onerror = () => {
                        log(`CSS konnte nicht geladen werden: ${fullPath}`, 'debug');
                    };
                    document.head.appendChild(link);
                } catch (e) {
                    log(`Fehler beim Laden von CSS ${fullPath}: ${e.message}`, 'error');
                }
            });
            
            // Fallback für admin.css, falls nicht geladen
            if (!loaded && cssFile === 'admin.css') {
                const inlineStyle = `
                    /* Inline Fallback für admin.css */
                    .admin-view, .admin-panel {
                        padding: 1rem;
                    }
                    .admin-panel-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 1rem;
                        border-bottom: 1px solid #e5e7eb;
                        padding-bottom: 1rem;
                    }
                    .admin-panel-title {
                        font-size: 1.25rem;
                        font-weight: 600;
                        color: #333;
                    }
                    .admin-tabs {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 1rem;
                        margin-bottom: 1rem;
                        border-bottom: 1px solid #e5e7eb;
                        padding-bottom: 1rem;
                    }
                    .admin-tab {
                        padding: 0.5rem 1rem;
                        cursor: pointer;
                        border-radius: 0.375rem;
                        transition: all 0.2s;
                    }
                    .admin-tab.active {
                        background-color: #00994C;
                        color: white;
                    }
                    .admin-card {
                        background: white;
                        border-radius: 0.5rem;
                        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                        padding: 1.5rem;
                        margin-bottom: 1.5rem;
                    }
                `;
                
                try {
                    const style = document.createElement('style');
                    style.textContent = inlineStyle;
                    style.setAttribute('data-source', 'force-enable-vue-fallback');
                    document.head.appendChild(style);
                    log('Inline-CSS-Fallback für admin.css hinzugefügt');
                    loadedFiles.push(cssFile);
                } catch (e) {
                    log(`Fehler beim Hinzufügen von Inline-CSS: ${e.message}`, 'error');
                }
            }
        });
        
        return loadedFiles;
    }

    // Aktiviere alle Vue-Features permanent
    function enableAllVueFeatures() {
        log('Aktiviere alle Vue-Features permanent');
        
        // Vue.js als einzige UI festlegen
        localStorage.setItem('useNewUI', 'true');
        localStorage.setItem('feature_useNewUI', 'true');
        
        // Alle Vue-Komponenten permanent aktivieren
        CONFIG.vueFeatures.forEach(feature => {
            localStorage.setItem(`feature_${feature}`, 'true');
        });
        
        // Alte Feature-Flags entfernen, die Konflikte verursachen könnten
        localStorage.removeItem('useOldUI');
        localStorage.removeItem('disableVue');
        localStorage.removeItem('forceClassicDocConverter');
        
        // Vollständige Migration festschreiben
        localStorage.setItem('vue_migration_complete', 'true');
        
        return true;
    }

    // Simuliere Admin-Rolle für Entwicklungszwecke
    function simulateAdminRole() {
        let currentUser = localStorage.getItem('user');
        if (currentUser) {
            try {
                let userData = JSON.parse(currentUser);
                if (!userData.role || userData.role !== 'admin') {
                    log("Setze temporär Admin-Rolle für Testzwecke");
                    userData.role = 'admin';
                    localStorage.setItem('user', JSON.stringify(userData));
                    return true;
                }
            } catch (e) {
                log(`Fehler beim Parsen von User-Daten: ${e}`, 'error');
            }
        }
        return false;
    }

    // Benachrichtige andere Komponenten über aktivierte Vue-Features
    function notifyFeaturesEnabled() {
        // Event auslösen, damit die Seite sofort die Vue.js-Komponenten lädt
        setTimeout(function() {
            let event = new CustomEvent('vue-features-enabled', { detail: true });
            document.dispatchEvent(event);
            log("Vue-Features-Enabled Event ausgelöst");
            
            // Wenn Pinia Store verfügbar ist, direkt dort aktualisieren
            if (window.$pinia && window.$pinia.state.value.featureToggle) {
                log("Aktualisiere Pinia Store direkt");
                try {
                    const store = window.$pinia.state.value.featureToggle;
                    store.useNewUI = true;
                    CONFIG.vueFeatures.forEach(feature => {
                        store.features[feature] = true;
                    });
                } catch (e) {
                    log(`Fehler beim direkten Update des Stores: ${e}`, 'error');
                }
            }
        }, 200);
    }

    // Hauptinitialisierungsfunktion
    function init() {
        log("Vue.js vollständig aktivieren (ohne Reload-Schleife)");
        
        try {
            // Prüfe den aktuellen Migrations-Status
            const status = checkMigrationStatus();
            
            // Wenn bereits vollständig migriert, nur CSS laden und fertig
            if (status.fullyMigrated) {
                log("Vue.js bereits vollständig aktiviert");
                loadAdminCSS();
                return;
            }
            
            log("Vue.js Aktivierung wird durchgeführt");
            
            // Aktiviere alle Vue-Features
            enableAllVueFeatures();
            
            // Stelle Admin-Rolle sicher
            simulateAdminRole();
            
            // CSS-Ressourcen laden
            loadAdminCSS();
            
            // Benachrichtige andere Komponenten
            notifyFeaturesEnabled();
            
            log("Vue.js Aktivierung abgeschlossen");
        } catch (error) {
            log(`Fehler bei Vue.js Aktivierung: ${error}`, 'error');
        }
    }

    // Starte die Initialisierung, wenn das DOM bereit ist
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();