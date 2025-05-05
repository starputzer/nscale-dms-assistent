// Vollständige Vue.js-Aktivierung
document.addEventListener('DOMContentLoaded', function() {
    console.log("[force-enable-vue] Vue.js vollständig aktivieren (keine Fallbacks mehr)");
    try {
        // Vue.js als einzige UI festlegen
        localStorage.setItem('useNewUI', 'true');
        localStorage.setItem('feature_useNewUI', 'true');
        
        // Alle Vue-Komponenten permanent aktivieren
        localStorage.setItem('feature_vueDocConverter', 'true');
        localStorage.setItem('feature_vueSettings', 'true');
        localStorage.setItem('feature_vueAdmin', 'true');
        localStorage.setItem('feature_vueChat', 'true');
        
        // Alte Feature-Flags entfernen
        localStorage.removeItem('useOldUI');
        localStorage.removeItem('disableVue');
        
        // Vollständige Migration festschreiben
        localStorage.setItem('vue_migration_complete', 'true');
        
        console.log("[force-enable-vue] Alle Vue.js-Komponenten sind dauerhaft aktiviert");
        
        // Event auslösen, damit die Seite sofort die Vue.js-Komponenten lädt
        setTimeout(function() {
            let event = new CustomEvent('vue-features-enabled', { detail: true });
            document.dispatchEvent(event);
            console.log("[force-enable-vue] Vue-Features-Enabled Event ausgelöst");
        }, 100);
    } catch (error) {
        console.error("[force-enable-vue] Fehler beim Aktivieren von Vue.js:", error);
    }
});
