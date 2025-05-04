// src/components/admin/features/FeatureToggleManager.vue
<template>
  <div class="feature-toggle-manager">
    <div class="flex flex-col">
      <!-- UI-Version -->
      <div class="admin-card mb-6">
        <div class="admin-card-title">UI-Versionen</div>
        
        <div class="mb-4">
          <p class="text-sm mb-4">
            Wählen Sie, welche UI-Version für die Anwendung verwendet werden soll.
          </p>
          
          <div id="uiSelection" class="bg-gray-100 p-4 rounded-lg mb-6">
            <div class="font-medium mb-2">Aktuelle UI-Version:</div>
            <div class="text-lg bg-white p-3 rounded border mb-4">
              <span v-if="featureStore.useNewUI" class="text-green-600">
                <i class="fas fa-check-circle mr-2"></i>Vue.js UI (Neue Version)
              </span>
              <span v-else class="text-blue-600">
                <i class="fas fa-info-circle mr-2"></i>Klassische UI (Alte Version)
              </span>
            </div>
            
            <div class="flex gap-4">
              <button 
                class="nscale-btn-primary" 
                @click="enableVueUI"
                :disabled="featureStore.useNewUI"
              >
                <i class="fas fa-toggle-on mr-2"></i>Vue.js-UI aktivieren
              </button>
              <button 
                class="nscale-btn-secondary"
                @click="enableClassicUI"
                :disabled="!featureStore.useNewUI"
              >
                <i class="fas fa-toggle-off mr-2"></i>Klassische UI aktivieren
              </button>
            </div>
          </div>
          
          <div v-if="featureStore.useNewUI" class="feature-toggles mb-6">
            <h3 class="text-lg font-medium mb-3">Komponenten-Status</h3>
            <p class="text-sm mb-4">
              Steuern Sie, welche Komponenten in der Vue.js Version angezeigt werden.
            </p>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- DocConverter Toggle -->
              <div class="feature-toggle-item p-4 bg-white border rounded">
                <div class="flex items-start justify-between">
                  <div>
                    <h4 class="font-medium">Dokumentenkonverter</h4>
                    <p class="text-sm text-gray-600 mt-1">
                      Neue Vue.js-Implementierung des Dokumentenkonverters
                    </p>
                  </div>
                  <div class="toggle-switch">
                    <label class="switch">
                      <input 
                        type="checkbox" 
                        :checked="featureStore.features.vueDocConverter"
                        @change="toggleFeature('vueDocConverter', $event.target.checked)" 
                      />
                      <span class="slider round"></span>
                    </label>
                  </div>
                </div>
                <div class="mt-3 text-sm" :class="featureStore.features.vueDocConverter ? 'text-green-600' : 'text-gray-500'">
                  Status: {{ featureStore.features.vueDocConverter ? 'Aktiviert' : 'Deaktiviert' }}
                </div>
              </div>
              
              <!-- Chat Toggle -->
              <div class="feature-toggle-item p-4 bg-white border rounded">
                <div class="flex items-start justify-between">
                  <div>
                    <h4 class="font-medium">Chat</h4>
                    <p class="text-sm text-gray-600 mt-1">
                      Neue Vue.js-Implementierung der Chat-Oberfläche
                    </p>
                  </div>
                  <div class="toggle-switch">
                    <label class="switch">
                      <input 
                        type="checkbox" 
                        :checked="featureStore.features.vueChat"
                        @change="toggleFeature('vueChat', $event.target.checked)" 
                      />
                      <span class="slider round"></span>
                    </label>
                  </div>
                </div>
                <div class="mt-3 text-sm" :class="featureStore.features.vueChat ? 'text-green-600' : 'text-gray-500'">
                  Status: {{ featureStore.features.vueChat ? 'Aktiviert' : 'Deaktiviert' }}
                </div>
              </div>
              
              <!-- Admin Toggle -->
              <div class="feature-toggle-item p-4 bg-white border rounded">
                <div class="flex items-start justify-between">
                  <div>
                    <h4 class="font-medium">Admin-Panel</h4>
                    <p class="text-sm text-gray-600 mt-1">
                      Neue Vue.js-Implementierung des Admin-Bereichs
                    </p>
                  </div>
                  <div class="toggle-switch">
                    <label class="switch">
                      <input 
                        type="checkbox" 
                        :checked="featureStore.features.vueAdmin"
                        @change="toggleFeature('vueAdmin', $event.target.checked)" 
                      />
                      <span class="slider round"></span>
                    </label>
                  </div>
                </div>
                <div class="mt-3 text-sm" :class="featureStore.features.vueAdmin ? 'text-green-600' : 'text-gray-500'">
                  Status: {{ featureStore.features.vueAdmin ? 'Aktiviert' : 'Deaktiviert' }}
                </div>
              </div>
              
              <!-- Settings Toggle -->
              <div class="feature-toggle-item p-4 bg-white border rounded">
                <div class="flex items-start justify-between">
                  <div>
                    <h4 class="font-medium">Einstellungen</h4>
                    <p class="text-sm text-gray-600 mt-1">
                      Neue Vue.js-Implementierung der Einstellungen
                    </p>
                  </div>
                  <div class="toggle-switch">
                    <label class="switch">
                      <input 
                        type="checkbox" 
                        :checked="featureStore.features.vueSettings"
                        @change="toggleFeature('vueSettings', $event.target.checked)" 
                      />
                      <span class="slider round"></span>
                    </label>
                  </div>
                </div>
                <div class="mt-3 text-sm" :class="featureStore.features.vueSettings ? 'text-green-600' : 'text-gray-500'">
                  Status: {{ featureStore.features.vueSettings ? 'Aktiviert' : 'Deaktiviert' }}
                </div>
              </div>
            </div>
            
            <!-- Bulk-Actions -->
            <div class="mt-6 flex gap-4 justify-end">
              <button 
                class="nscale-btn-primary" 
                @click="enableAllFeatures"
              >
                <i class="fas fa-check-circle mr-2"></i>Alle aktivieren
              </button>
              <button 
                class="nscale-btn-secondary"
                @click="disableAllFeatures"
              >
                <i class="fas fa-times-circle mr-2"></i>Alle deaktivieren
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Dev-Modus -->
      <div class="admin-card mb-6">
        <div class="admin-card-title">Entwicklungsmodus</div>
        
        <div class="p-4">
          <p class="text-sm mb-4">
            Der Entwicklungsmodus aktiviert zusätzliche Debugging-Funktionen.
          </p>
          
          <div class="flex items-center justify-between p-4 bg-white border rounded">
            <div>
              <h4 class="font-medium">Entwicklermodus</h4>
              <p class="text-sm text-gray-600 mt-1">
                Zeigt zusätzliche Debug-Informationen an
              </p>
            </div>
            <div class="toggle-switch">
              <label class="switch">
                <input 
                  type="checkbox" 
                  :checked="featureStore.devMode" 
                  @change="toggleDevMode($event.target.checked)"
                />
                <span class="slider round"></span>
              </label>
            </div>
          </div>
          
          <div v-if="featureStore.devMode" class="mt-6 bg-gray-100 p-4 rounded">
            <h4 class="font-medium mb-2">Debug-Informationen</h4>
            <div class="text-sm font-mono bg-gray-800 text-white p-4 rounded overflow-auto max-h-48">
              <div>// Feature-Toggle-Status:</div>
              <div>useNewUI: {{ featureStore.useNewUI }}</div>
              <div v-for="(value, key) in featureStore.features" :key="key">
                {{ key }}: {{ value }}
              </div>
              <div>devMode: {{ featureStore.devMode }}</div>
              <div>// Aktive Features:</div>
              <div>{{ featureStore.activeFeatures }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useFeatureToggleStore } from '@/stores/featureToggleStore';

// Store für die Feature-Toggles
const featureStore = useFeatureToggleStore();

// Aktiviere Vue.js-UI
const enableVueUI = () => {
  featureStore.toggleNewUI(true);
};

// Aktiviere klassische UI
const enableClassicUI = () => {
  featureStore.toggleNewUI(false);
};

// Feature-Toggle umschalten
const toggleFeature = (feature, value) => {
  featureStore.toggleFeature(feature, value);
  
  // Seite neu laden nach kurzer Verzögerung
  setTimeout(() => {
    window.location.reload();
  }, 200);
};

// Entwicklermodus umschalten
const toggleDevMode = (value) => {
  featureStore.toggleDevMode(value);
};

// Alle Features aktivieren
const enableAllFeatures = () => {
  featureStore.enableAllFeatures();
  
  // Seite neu laden nach kurzer Verzögerung
  setTimeout(() => {
    window.location.reload();
  }, 200);
};

// Alle Features deaktivieren
const disableAllFeatures = () => {
  featureStore.disableAllFeatures();
  
  // Seite neu laden nach kurzer Verzögerung
  setTimeout(() => {
    window.location.reload();
  }, 200);
};

// Bei Komponenten-Montierung
onMounted(() => {
  console.log('Feature-Toggle-Manager initialisiert');
});
</script>

<style scoped>
/* Toggle-Switch-Styling */
.switch {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 34px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 26px;
  width: 26px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: .4s;
}

input:checked + .slider {
  background-color: var(--nscale-primary, #00a3d9);
}

input:focus + .slider {
  box-shadow: 0 0 1px var(--nscale-primary, #00a3d9);
}

input:checked + .slider:before {
  transform: translateX(26px);
}

.slider.round {
  border-radius: 34px;
}

.slider.round:before {
  border-radius: 50%;
}

/* Dark Mode */
:global(.theme-dark) .admin-card {
  background-color: #1e1e1e;
  border-color: #333;
}

:global(.theme-dark) .admin-card-title {
  color: #f0f0f0;
}

:global(.theme-dark) p {
  color: #ccc;
}

:global(.theme-dark) .bg-gray-100 {
  background-color: #333;
}

:global(.theme-dark) .bg-white {
  background-color: #222;
  border-color: #444;
}

:global(.theme-dark) .text-gray-600 {
  color: #999;
}

:global(.theme-dark) h4 {
  color: #f0f0f0;
}

:global(.theme-dark) .nscale-btn-primary {
  background-color: #00c060;
}

:global(.theme-dark) .nscale-btn-primary:hover {
  background-color: #00a550;
}

:global(.theme-dark) .nscale-btn-secondary {
  background-color: #333;
  color: #f0f0f0;
  border-color: #555;
}

:global(.theme-dark) .nscale-btn-secondary:hover {
  background-color: #444;
}
</style>