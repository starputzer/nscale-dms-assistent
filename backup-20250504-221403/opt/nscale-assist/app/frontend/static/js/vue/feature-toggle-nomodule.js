// feature-toggle-nomodule.js
// Dieses Skript ist eine nomodule-Version für Browser ohne ES-Module-Support

(function() {
  console.log('Feature-Toggle-Manager Standalone-Nomodule-Version geladen');

  document.addEventListener('DOMContentLoaded', function() {
    // Finde den Feature-Toggle-Container
    const containerSelector = 'feature-toggle-container';
    const mountElement = document.getElementById(containerSelector);
    
    if (mountElement) {
      try {
        // Überprüfen, ob Vue global verfügbar ist
        if (typeof Vue === 'undefined') {
          console.error('Vue ist nicht geladen! Lade die Vue-Bibliothek...');
          
          // Lade Vue falls nicht verfügbar
          const vueScript = document.createElement('script');
          vueScript.src = 'https://unpkg.com/vue@3.2.31/dist/vue.global.js';
          vueScript.onload = initializeFeatureToggle;
          vueScript.onerror = fallbackToHtml;
          document.head.appendChild(vueScript);
        } else {
          // Vue ist verfügbar, initialisiere den Feature-Toggle-Manager
          initializeFeatureToggle();
        }
      } catch (error) {
        console.error('Fehler bei der Initialisierung des Feature-Toggle-Managers:', error);
        fallbackToHtml();
      }
    } else {
      console.warn(`Kein Mounting-Element für Feature-Toggle mit ID "${containerSelector}" gefunden`);
    }
    
    // Hilfsfunktionen
    function initializeFeatureToggle() {
      console.log('Initialisiere Feature-Toggle-Manager in Nomodule-Modus...');
      
      try {
        // Lade aktuelle Einstellungen aus localStorage
        const settings = {
          useNewUI: localStorage.getItem('useNewUI') === 'true',
          vueDocConverter: localStorage.getItem('feature_vueDocConverter') !== 'false',
          vueChat: localStorage.getItem('feature_vueChat') === 'true',
          vueAdmin: localStorage.getItem('feature_vueAdmin') === 'true',
          vueSettings: localStorage.getItem('feature_vueSettings') === 'true',
          devMode: localStorage.getItem('devMode') === 'true'
        };
        
        // Erstelle ein einfaches Vue-App-Objekt
        const app = Vue.createApp({
          template: `
            <div class="feature-toggle-manager">
              <!-- UI-Version toggle -->
              <div class="admin-card mb-6">
                <div class="admin-card-title">UI-Versionen</div>
                <div class="admin-card-content">
                  <div class="flex flex-col gap-4">
                    <div class="toggle-group">
                      <label class="toggle-label">
                        <input type="checkbox" v-model="useNewUI" @change="saveSettings" />
                        <span class="ml-2">Vue.js-UI verwenden</span>
                      </label>
                      <p class="text-sm text-gray-600 ml-6">
                        {{ useNewUI ? 'Aktiviert: Nutzt die moderne Vue.js-Benutzeroberfläche' : 'Deaktiviert: Nutzt die klassische Benutzeroberfläche' }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Komponenten-toggles -->
              <div v-if="useNewUI" class="admin-card mb-6">
                <div class="admin-card-title">Vue.js-Komponenten</div>
                <div class="admin-card-content">
                  <div class="flex flex-col gap-4">
                    <div class="toggle-group">
                      <label class="toggle-label">
                        <input type="checkbox" v-model="vueDocConverter" @change="saveSettings" />
                        <span class="ml-2">Dokumentenkonverter</span>
                      </label>
                    </div>
                    
                    <div class="toggle-group">
                      <label class="toggle-label">
                        <input type="checkbox" v-model="vueChat" @change="saveSettings" />
                        <span class="ml-2">Chat Interface</span>
                      </label>
                    </div>
                    
                    <div class="toggle-group">
                      <label class="toggle-label">
                        <input type="checkbox" v-model="vueAdmin" @change="saveSettings" />
                        <span class="ml-2">Admin-Bereich</span>
                      </label>
                    </div>
                    
                    <div class="toggle-group">
                      <label class="toggle-label">
                        <input type="checkbox" v-model="vueSettings" @change="saveSettings" />
                        <span class="ml-2">Einstellungen</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Entwicklermodus -->
              <div class="admin-card">
                <div class="admin-card-title">Entwicklermodus</div>
                <div class="admin-card-content">
                  <div class="flex flex-col gap-4">
                    <div class="toggle-group">
                      <label class="toggle-label">
                        <input type="checkbox" v-model="devMode" @change="saveSettings" />
                        <span class="ml-2">Entwicklermodus aktivieren</span>
                      </label>
                      <p class="text-sm text-gray-600 ml-6">
                        Aktiviert zusätzliche Debugging-Funktionen und Logging
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Hinweis zur nomodule-Version -->
              <div class="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p class="text-blue-800">
                  <strong>Hinweis:</strong> Dies ist eine vereinfachte Version des Feature-Toggle-Managers.
                  Einige erweiterte Funktionen sind möglicherweise nicht verfügbar.
                </p>
              </div>
              
              <!-- Reset Button -->
              <div class="mt-4">
                <button class="nscale-btn-secondary" @click="resetSettings">
                  Einstellungen zurücksetzen
                </button>
              </div>
            </div>
          `,
          data() {
            return {
              useNewUI: settings.useNewUI,
              vueDocConverter: settings.vueDocConverter,
              vueChat: settings.vueChat,
              vueAdmin: settings.vueAdmin,
              vueSettings: settings.vueSettings,
              devMode: settings.devMode
            };
          },
          methods: {
            saveSettings() {
              // Speichere alle Einstellungen im localStorage
              localStorage.setItem('useNewUI', this.useNewUI);
              localStorage.setItem('feature_vueDocConverter', this.vueDocConverter);
              localStorage.setItem('feature_vueChat', this.vueChat);
              localStorage.setItem('feature_vueAdmin', this.vueAdmin);
              localStorage.setItem('feature_vueSettings', this.vueSettings);
              localStorage.setItem('devMode', this.devMode);
              
              console.log('Feature-Toggle-Einstellungen gespeichert:', {
                useNewUI: this.useNewUI,
                vueDocConverter: this.vueDocConverter,
                vueChat: this.vueChat,
                vueAdmin: this.vueAdmin,
                vueSettings: this.vueSettings,
                devMode: this.devMode
              });
            },
            resetSettings() {
              // Setze Einstellungen auf Standardwerte zurück
              this.useNewUI = false;
              this.vueDocConverter = false;
              this.vueChat = false;
              this.vueAdmin = false;
              this.vueSettings = false;
              this.devMode = false;
              
              // Speichere die zurückgesetzten Einstellungen
              this.saveSettings();
              
              alert('Alle Feature-Toggle-Einstellungen wurden zurückgesetzt.');
            }
          },
          mounted() {
            console.log('Feature-Toggle-Manager Nomodule-Version erfolgreich gemountet!');
          }
        });
        
        // App mounten
        app.mount(mountElement);
        
        console.log('Feature-Toggle-Manager Nomodule-Version erfolgreich initialisiert');
      } catch (err) {
        console.error('Fehler bei der Nomodule-Initialisierung:', err);
        fallbackToHtml();
      }
    }
    
    function fallbackToHtml() {
      console.warn('Aktiviere HTML-Fallback für Feature-Toggle-Manager');
      
      if (mountElement) {
        mountElement.innerHTML = `
          <div class="feature-toggle-manager p-4 border border-gray-300 rounded">
            <h2 class="text-xl font-bold mb-4">UI-Version Auswahl</h2>
            
            <div class="flex flex-col gap-4">
              <!-- UI-Version toggles -->
              <div class="flex gap-4">
                <button class="nscale-btn-primary" onclick="localStorage.setItem('useNewUI', 'true'); window.location.reload();">
                  Vue.js-UI aktivieren
                </button>
                <button class="nscale-btn-secondary" onclick="localStorage.setItem('useNewUI', 'false'); window.location.reload();">
                  Klassische UI aktivieren
                </button>
              </div>
              
              <div class="mt-4">
                <p class="text-sm text-gray-600">
                  Hinweis: Dies ist eine einfache Version des Feature-Toggle-Managers.
                  Die vollständige Vue.js-Version konnte nicht geladen werden.
                </p>
              </div>
            </div>
          </div>
        `;
      }
    }
  });
})();