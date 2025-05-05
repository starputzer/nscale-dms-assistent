/**
 * Vue Cleanup Script
 * 
 * Dieses Skript entfernt Vue.js-Referenzen und deaktiviert Vue-spezifische Komponenten
 * nach der Aufgabe der Vue.js-Migration.
 */

console.log("[Vue Cleanup] Entferne Vue.js-Referenzen und deaktiviere Vue-Features");

// Deaktivierung aller Vue-Feature-Toggles
function disableVueFeatures() {
    const vueFeatures = [
        'feature_vueDocConverter',
        'feature_vueAdmin',
        'feature_vueSettings',
        'feature_vueChat',
        'useNewUI'
    ];

    vueFeatures.forEach(feature => {
        localStorage.setItem(feature, 'false');
        console.log(`[Vue Cleanup] Feature '${feature}' deaktiviert`);
    });
}

// Entfernen aller Vue-Script-Tags
function removeVueScripts() {
    const scripts = document.querySelectorAll('script');
    let removed = 0;

    scripts.forEach(script => {
        const src = script.getAttribute('src') || '';
        const content = script.textContent || '';

        if (src.includes('vue') || 
            content.includes('Vue.') || 
            content.includes('new Vue') || 
            content.includes('createApp')) {
            
            if (script.parentNode) {
                script.parentNode.removeChild(script);
                removed++;
            }
        }
    });

    console.log(`[Vue Cleanup] ${removed} Vue-bezogene Skripte entfernt`);
}

// Ausführung beim Laden der Seite
window.addEventListener('DOMContentLoaded', () => {
    disableVueFeatures();
    removeVueScripts();
    
    console.log("[Vue Cleanup] Bereinigung abgeschlossen");
});

// Verhindern, dass Vue.js-Komponenten nachträglich geladen werden
window.preventVueLoading = true;
