/**
 * standalone/settings.js
 * 
 * Standalone-Komponente für die Settings-Ansicht im nScale DMS Assistent.
 * Diese Komponente lädt die Vue.js SettingsView und stellt sie im klassischen UI bereit.
 */

// Globaler Zustand für die Initialisierung
let isInitialized = false;
let vueApp = null;

/**
 * Initialisiert die Settings-Komponente und hängt sie in das DOM ein
 * @param {string} mountSelector - Der CSS-Selektor für den Mount-Punkt
 */
function mountVueSettings(mountSelector) {
    // Sicherstellen, dass nicht doppelt initialisiert wird
    if (isInitialized) {
        console.log('Settings-Komponente bereits initialisiert, überspringe...');
        return;
    }
    
    // Prüfen, ob Mount-Selektor gültig ist
    const mountPoint = document.querySelector(mountSelector);
    if (!mountPoint) {
        console.error(`Mount-Punkt für Settings-Komponente nicht gefunden: ${mountSelector}`);
        return;
    }
    
    console.log(`Initialisiere Vue Settings-Komponente an: ${mountSelector}`);
    
    try {
        // Erstelle eine angepasste Version der SettingsView
        const SettingsAdapter = {
            template: `
                <div class="settings-container">
                    <SettingsView />
                </div>
            `,
            mounted() {
                console.log('SettingsAdapter erfolgreich gemounted');
            }
        };
        
        // Lade erforderliche Vue-Komponenten
        const { createApp, defineAsyncComponent } = Vue;
        const { createPinia } = Pinia;
        
        // Erstelle die Vue-App
        vueApp = createApp(SettingsAdapter);
        
        // Pinia Store hinzufügen
        const pinia = createPinia();
        vueApp.use(pinia);
        
        // SettingsView-Komponente laden
        vueApp.component('SettingsView', defineAsyncComponent(() => {
            return new Promise((resolve, reject) => {
                // Diese URL muss auf die richtige Komponente verweisen
                import('/api/static/vue/assets/index-c160609d.js')
                    .then(module => {
                        // Extract the SettingsView component from the module
                        // In einer realen Anwendung müsste dies angepasst werden
                        const component = module.SettingsView || module.default;
                        resolve(component);
                    })
                    .catch(reject);
            });
        }));
        
        // App mounten
        vueApp.mount(mountPoint);
        
        // Initialisierungsstatus setzen
        isInitialized = true;
        console.log('Vue Settings-Komponente erfolgreich initialisiert');
        
        // Klasse hinzufügen, damit CSS korrekt angewendet wird
        document.body.classList.add('vue-settings-active');
        
    } catch (error) {
        console.error('Fehler beim Initialisieren der Vue Settings-Komponente:', error);
    }
}

/**
 * Unmounts and cleans up the Vue application
 */
function unmountVueSettings() {
    if (vueApp) {
        try {
            // Aktuelle App unmounten
            vueApp.unmount();
            vueApp = null;
            
            // Status zurücksetzen
            isInitialized = false;
            console.log('Vue Settings-Komponente erfolgreich entfernt');
            
            // Klasse entfernen
            document.body.classList.remove('vue-settings-active');
            
        } catch (error) {
            console.error('Fehler beim Entfernen der Vue Settings-Komponente:', error);
        }
    }
}

// Funktion global verfügbar machen
window.mountVueSettings = mountVueSettings;
window.unmountVueSettings = unmountVueSettings;

// Event-Listener für DOM-Elemente nach dem Schließen des Panels
document.addEventListener('click', (event) => {
    // Wenn außerhalb des Panels geklickt wird und das Panel bereits geschlossen ist
    if (!document.querySelector('.settings-panel[style*="display: block"]') && isInitialized) {
        // Verzögerung zum Umount hinzufügen, um Race-Conditions zu vermeiden
        setTimeout(() => {
            unmountVueSettings();
        }, 300);
    }
});

// Event-Listener für ESC-Taste
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isInitialized) {
        // Verzögerung zum Umount hinzufügen, um Race-Conditions zu vermeiden
        setTimeout(() => {
            unmountVueSettings();
        }, 300);
    }
});

// Prüfe, ob ein direkter Mount beim Laden der Datei erfolgen sollte
if (document.querySelector('#vue-settings-mount')) {
    // Kurze Verzögerung für DOM-Bereitschaft
    setTimeout(() => {
        mountVueSettings('#vue-settings-mount');
    }, 100);
}