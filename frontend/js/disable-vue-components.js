/**
 * Disable Vue Components Script
 * 
 * Dieses Skript deaktiviert alle Vue.js-Komponenten und entfernt Vue.js-Ressourcen.
 * Es verhindert das Laden der Vue.js-Komponenten und sorgt für die Verwendung 
 * der klassischen JavaScript-Implementierung.
 */

(function() {
    console.log('[Vue Disable] Deaktivierung aller Vue.js-Komponenten...');
    
    // Feature-Flags für Vue-Komponenten deaktivieren
    const vueFeatures = [
        'feature_vueDocConverter',
        'feature_vueAdmin',
        'feature_vueSettings',
        'feature_vueChat',
        'useNewUI'
    ];
    
    vueFeatures.forEach(feature => {
        localStorage.setItem(feature, 'false');
    });
    
    // Vue-spezifische DOM-Attribute entfernen
    function cleanupVueAttributes() {
        // Vue-spezifische Attribute
        const vueAttrs = [
            '[v-if]', '[v-else]', '[v-for]', '[v-bind]', '[v-on]', 
            '[v-model]', '[v-show]', '[v-cloak]', '[v-once]', '[v-html]'
        ];
        
        // Alle Elemente mit Vue-Attributen finden
        vueAttrs.forEach(attr => {
            document.querySelectorAll(attr).forEach(el => {
                // Attribute entfernen oder mit Standardwerten ersetzen
                if (attr === '[v-if]') {
                    el.style.display = 'block'; // Element immer anzeigen
                    el.removeAttribute('v-if');
                } else if (attr === '[v-show]') {
                    el.style.display = 'block'; // Element immer anzeigen
                    el.removeAttribute('v-show');
                } else if (attr === '[v-else]') {
                    el.style.display = 'none'; // Element ausblenden
                    el.removeAttribute('v-else');
                } else {
                    // Andere Vue-Attribute einfach entfernen
                    const attrName = attr.slice(1, -1); // [v-bind] -> v-bind
                    el.removeAttribute(attrName);
                }
            });
        });
        
        console.log('[Vue Disable] Vue-Attribute bereinigt');
    }
    
    // Vue-Script-Tags entfernen und verhindern
    function removeVueScripts() {
        // Existierende Vue-Skripte entfernen
        document.querySelectorAll('script').forEach(script => {
            const src = script.getAttribute('src') || '';
            const content = script.textContent || '';
            
            if (src.includes('vue') || 
                content.includes('Vue.') || 
                content.includes('new Vue') || 
                content.includes('createApp')) {
                
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
            }
        });
        
        console.log('[Vue Disable] Vue-Skripte entfernt');
        
        // MutationObserver für zukünftige Vue-Skripte
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.tagName === 'SCRIPT') {
                            const src = node.getAttribute('src') || '';
                            const content = node.textContent || '';
                            
                            if (src.includes('vue') || 
                                content.includes('Vue.') || 
                                content.includes('new Vue') || 
                                content.includes('createApp')) {
                                
                                if (node.parentNode) {
                                    node.parentNode.removeChild(node);
                                    console.log('[Vue Disable] Neues Vue-Skript verhindert');
                                }
                            }
                        }
                    });
                }
            });
        });
        
        observer.observe(document, { childList: true, subtree: true });
    }
    
    // Dokumente aus anderen Quellen laden
    function loadVanillaImplementations() {
        // Fallback-Skripte für kritische Komponenten laden
        [
            '/static/js/doc-converter-fallback.js'
        ].forEach(script => {
            if (\!document.querySelector(`script[src="${script}"]`)) {
                const scriptEl = document.createElement('script');
                scriptEl.src = script;
                document.body.appendChild(scriptEl);
            }
        });
    }
    
    // Auf DOM-Laden warten
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            cleanupVueAttributes();
            removeVueScripts();
            loadVanillaImplementations();
        });
    } else {
        cleanupVueAttributes();
        removeVueScripts();
        loadVanillaImplementations();
    }
    
    // Globale Flags, um das Laden von Vue.js zu verhindern
    window.vueDisabled = true;
    window.preventVueLoading = true;
    
    console.log('[Vue Disable] Vue.js-Komponenten deaktiviert');
})();
