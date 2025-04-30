<!-- components/dev/UIToggle.vue -->
<template>
  <div 
    v-if="isDevMode" 
    class="ui-toggle"
    :class="{ 'collapsed': isCollapsed }"
  >
    <div class="toggle-header" @click="isCollapsed = !isCollapsed">
      <span class="toggle-title">UI Version</span>
      <font-awesome-icon 
        :icon="isCollapsed ? 'chevron-down' : 'chevron-up'" 
        class="toggle-icon"
      />
    </div>
    
    <div v-if="!isCollapsed" class="toggle-content">
      <div class="ui-switch">
        <label class="switch-label">
          <input 
            type="checkbox" 
            :checked="useNewUI" 
            @change="toggleNewUI"
          >
          <span class="slider"></span>
          <span class="switch-text">{{ useNewUI ? 'Vue.js UI' : 'Alte UI' }}</span>
        </label>
      </div>
      
      <div v-if="useNewUI" class="feature-toggles">
        <h4 class="features-title">Aktivierte Features</h4>
        
        <div 
          v-for="(enabled, feature) in features" 
          :key="feature" 
          class="feature-item"
        >
          <label class="feature-label">
            <input 
              type="checkbox" 
              :checked="enabled" 
              @change="toggleFeature(feature, $event.target.checked)"
            >
            <span class="feature-name">{{ formatFeatureName(feature) }}</span>
          </label>
        </div>
        
        <div class="feature-actions">
          <button 
            class="feature-button enable-all" 
            @click="enableAllFeatures"
            title="Alle Features aktivieren"
          >
            Alle aktivieren
          </button>
          <button 
            class="feature-button disable-all" 
            @click="disableAllFeatures"
            title="Alle Features deaktivieren"
          >
            Alle deaktivieren
          </button>
        </div>
      </div>
      
      <div class="toggle-footer">
        <span class="toggle-info">Diese Optionen sind nur im Entwicklungsmodus sichtbar</span>
        <button 
          class="toggle-close" 
          @click="isCollapsed = true"
          title="Schließen"
        >
          <font-awesome-icon icon="times" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useFeatureToggleStore } from '@/stores/featureToggleStore';
import { useToast } from '@/composables/useToast';

// Store und Toast-Service
const featureToggleStore = useFeatureToggleStore();
const { showToast } = useToast();

// Lokaler Zustand
const isCollapsed = ref(localStorage.getItem('uiToggleCollapsed') === 'true' || false);

// UI-Zustand aus dem Store
const useNewUI = computed(() => featureToggleStore.useNewUI);
const features = computed(() => featureToggleStore.features);
const isDevMode = computed(() => featureToggleStore.devMode);

// Beobachter für den Collapse-Zustand
watch(isCollapsed, (newValue) => {
  localStorage.setItem('uiToggleCollapsed', newValue.toString());
});

// Umwandlung von Feature-Namen in lesbare Texte
const formatFeatureName = (featureName) => {
  const nameMap = {
    vueDocConverter: 'Dokumentenkonverter',
    vueChat: 'Chat-Oberfläche',
    vueAdmin: 'Admin-Panel',
    vueSettings: 'Einstellungen'
  };
  
  return nameMap[featureName] || featureName;
};

// Aktionen
const toggleNewUI = (event) => {
  const newValue = event.target.checked;
  
  // Bestätigungsdialog
  if (confirm(`Sind Sie sicher, dass Sie zu ${newValue ? 'neuer Vue.js UI' : 'alter UI'} wechseln möchten? Die Seite wird neu geladen.`)) {
    featureToggleStore.toggleNewUI(newValue);
    
    // Die Seite wird durch die toggleNewUI-Aktion neu geladen
  }
};

const toggleFeature = (featureName, enabled) => {
  featureToggleStore.toggleFeature(featureName, enabled);
  
  showToast(
    `${formatFeatureName(featureName)} ${enabled ? 'aktiviert' : 'deaktiviert'}`, 
    enabled ? 'success' : 'info', 
    3000
  );
};

const enableAllFeatures = () => {
  featureToggleStore.enableAllFeatures();
  showToast('Alle Features aktiviert', 'success', 3000);
};

const disableAllFeatures = () => {
  featureToggleStore.disableAllFeatures();
  showToast('Alle Features deaktiviert', 'info', 3000);
};
</script>

<style scoped>
.ui-toggle {
  position: fixed;
  bottom: 6rem; /* Abstand zum Barrierefreiheits-Button */
  right: 1.5rem;
  width: 300px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  z-index: 49;
  border: 1px solid var(--nscale-gray-medium);
  transition: all 0.3s ease;
  overflow: hidden;
}

.ui-toggle.collapsed {
  width: auto;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.toggle-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background-color: var(--nscale-primary);
  color: white;
  cursor: pointer;
  font-weight: 500;
}

.toggle-icon {
  margin-left: 0.5rem;
  font-size: 0.85rem;
}

.toggle-content {
  padding: 1rem;
}

.ui-switch {
  margin-bottom: 1rem;
}

.switch-label {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.switch-label input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: relative;
  display: inline-block;
  width: 46px;
  height: 24px;
  background-color: var(--nscale-gray-medium);
  border-radius: 24px;
  transition: 0.4s;
  margin-right: 0.75rem;
  flex-shrink: 0;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  border-radius: 50%;
  transition: 0.4s;
}

input:checked + .slider {
  background-color: var(--nscale-primary);
}

input:checked + .slider:before {
  transform: translateX(22px);
}

.switch-text {
  font-weight: 500;
}

.features-title {
  font-size: 0.95rem;
  font-weight: 500;
  margin: 1rem 0 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid var(--nscale-gray-medium);
}

.feature-item {
  margin-bottom: 0.5rem;
}

.feature-label {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.feature-label input {
  margin-right: 0.5rem;
}

.feature-name {
  font-size: 0.9rem;
}

.feature-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.feature-button {
  background: none;
  border: 1px solid var(--nscale-gray-medium);
  padding: 0.35rem 0.75rem;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
  flex: 1;
}

.feature-button:hover {
  background-color: var(--nscale-gray-light);
}

.enable-all:hover {
  border-color: var(--nscale-primary);
  color: var(--nscale-primary);
}

.disable-all:hover {
  border-color: var(--nscale-red);
  color: var(--nscale-red);
}

.toggle-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--nscale-gray-medium);
}

.toggle-info {
  font-size: 0.8rem;
  color: var(--nscale-gray-dark);
  font-style: italic;
}

.toggle-close {
  background: none;
  border: none;
  color: var(--nscale-gray-dark);
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.toggle-close:hover {
  background-color: var(--nscale-gray-medium);
  color: var(--nscale-red);
}

/* Dark Mode Anpassungen */
:global(.theme-dark) .ui-toggle {
  background-color: #1e1e1e;
  border-color: #333;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

:global(.theme-dark) .toggle-header {
  background-color: #00c060;
}

:global(.theme-dark) .slider {
  background-color: #555;
}

:global(.theme-dark) input:checked + .slider {
  background-color: #00c060;
}

:global(.theme-dark) .features-title {
  color: #f0f0f0;
  border-top-color: #333;
}

:global(.theme-dark) .feature-name {
  color: #f0f0f0;
}

:global(.theme-dark) .feature-button {
  border-color: #555;
  color: #aaa;
  background-color: #333;
}

:global(.theme-dark) .feature-button:hover {
  background-color: #444;
}

:global(.theme-dark) .enable-all:hover {
  border-color: #00c060;
  color: #00c060;
}

:global(.theme-dark) .disable-all:hover {
  border-color: #ff4d4d;
  color: #ff4d4d;
}

:global(.theme-dark) .toggle-footer {
  border-top-color: #333;
}

:global(.theme-dark) .toggle-info {
  color: #aaa;
}

:global(.theme-dark) .toggle-close:hover {
  background-color: #444;
  color: #ff4d4d;
}

/* Kontrast-Modus Anpassungen */
:global(.theme-contrast) .ui-toggle {
  background-color: #000000;
  border: 2px solid #ffeb3b;
  box-shadow: 0 4px 15px rgba(255, 235, 59, 0.2);
}

:global(.theme-contrast) .toggle-header {
  background-color: #ffeb3b;
  color: #000000;
  font-weight: bold;
}

:global(.theme-contrast) .slider {
  background-color: #333300;
  border: 1px solid #ffeb3b;
}

:global(.theme-contrast) .slider:before {
  background-color: #ffeb3b;
}

:global(.theme-contrast) input:checked + .slider {
  background-color: #333300;
}

:global(.theme-contrast) input:checked + .slider:before {
  background-color: #ffeb3b;
}

:global(.theme-contrast) .switch-text {
  color: #ffeb3b;
}

:global(.theme-contrast) .features-title {
  color: #ffeb3b;
  border-top-color: #ffeb3b;
}

:global(.theme-contrast) .feature-name {
  color: #ffeb3b;
}

:global(.theme-contrast) .feature-button {
  background-color: #000000;
  border: 2px solid #ffeb3b;
  color: #ffeb3b;
}

:global(.theme-contrast) .feature-button:hover {
  background-color: #333300;
}

:global(.theme-contrast) .enable-all:hover,
:global(.theme-contrast) .disable-all:hover {
  border-color: #ffeb3b;
  color: #ffeb3b;
  background-color: #333300;
}

:global(.theme-contrast) .toggle-footer {
  border-top-color: #ffeb3b;
}

:global(.theme-contrast) .toggle-info {
  color: #ffeb3b;
}

:global(.theme-contrast) .toggle-close {
  color: #ffeb3b;
}

:global(.theme-contrast) .toggle-close:hover {
  background-color: #333300;
}
</style>