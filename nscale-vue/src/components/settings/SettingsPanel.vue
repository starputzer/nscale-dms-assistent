<!-- src/components/settings/SettingsPanel.vue -->
<template>
  <div 
    v-if="showPanel" 
    class="settings-panel" 
    :class="{ 'settings-panel-visible': showPanel }"
  >
    <div class="settings-panel-header">
      <div class="settings-panel-title">Einstellungen</div>
      <button class="settings-panel-close" @click="close">
        <font-awesome-icon icon="times" />
      </button>
    </div>
    
    <div class="settings-panel-content">
      <!-- Theme-Einstellungen -->
      <div class="settings-section">
        <div class="settings-section-title">Design</div>
        
        <div class="settings-option">
          <label class="settings-option-label">Farbschema</label>
          <div class="theme-options">
            <div class="theme-option">
              <input 
                type="radio" 
                id="theme-light" 
                class="theme-radio" 
                :checked="theme === 'light'" 
                @change="setTheme('light')"
              >
              <label for="theme-light" class="theme-label">
                <font-awesome-icon icon="sun" class="theme-icon" />
                Hell
              </label>
            </div>
            
            <div class="theme-option">
              <input 
                type="radio" 
                id="theme-dark" 
                class="theme-radio" 
                :checked="theme === 'dark'" 
                @change="setTheme('dark')"
              >
              <label for="theme-dark" class="theme-label">
                <font-awesome-icon icon="moon" class="theme-icon" />
                Dunkel
              </label>
            </div>
            
            <div class="theme-option">
              <input 
                type="radio" 
                id="theme-contrast" 
                class="theme-radio" 
                :checked="theme === 'contrast'" 
                @change="setTheme('contrast')"
              >
              <label for="theme-contrast" class="theme-label">
                <font-awesome-icon icon="adjust" class="theme-icon" />
                Kontrast
              </label>
            </div>
          </div>
        </div>
        
        <div class="settings-option">
          <label class="settings-option-label">Schriftgröße</label>
          <div class="font-size-options">
            <div class="font-size-option">
              <input 
                type="radio" 
                id="font-small" 
                class="font-size-radio" 
                :checked="fontSize === 'small'" 
                @change="setFontSize('small')"
              >
              <label for="font-small" class="font-size-label">Klein</label>
            </div>
            
            <div class="font-size-option">
              <input 
                type="radio" 
                id="font-medium" 
                class="font-size-radio" 
                :checked="fontSize === 'medium'" 
                @change="setFontSize('medium')"
              >
              <label for="font-medium" class="font-size-label">Normal</label>
            </div>
            
            <div class="font-size-option">
              <input 
                type="radio" 
                id="font-large" 
                class="font-size-radio" 
                :checked="fontSize === 'large'" 
                @change="setFontSize('large')"
              >
              <label for="font-large" class="font-size-label">Groß</label>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Barrierefreiheit Einstellungen -->
      <div class="settings-section">
        <div class="settings-section-title">Barrierefreiheit</div>
        
        <div class="accessibility-container">
          <label class="accessibility-option">
            <input 
              type="checkbox" 
              class="accessibility-checkbox" 
              :checked="accessibility.reduceMotion" 
              @change="updateAccessibility('reduceMotion', $event.target.checked)"
            >
            <span class="accessibility-label">
              Animationen reduzieren
              <span class="accessibility-description">Reduziert Bewegungen und Animationen auf der gesamten Website.</span>
            </span>
          </label>
          
          <label class="accessibility-option">
            <input 
              type="checkbox" 
              class="accessibility-checkbox" 
              :checked="accessibility.simpleLanguage" 
              @change="updateAccessibility('simpleLanguage', $event.target.checked)"
            >
            <span class="accessibility-label">
              Einfache Sprache
              <span class="accessibility-description">Verwendet vereinfachte Sprache in den KI-Antworten.</span>
            </span>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useSettingsStore } from '@/stores/settingsStore';

// Eigenschaften
const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
});

// Events
const emit = defineEmits(['close']);

// Store
const settingsStore = useSettingsStore();

// Lokaler Zustand
const showPanel = ref(props.show);

// Einstellungen aus dem Store
const theme = computed(() => settingsStore.theme);
const fontSize = computed(() => settingsStore.fontSize);
const accessibility = computed(() => settingsStore.accessibility);

// Beobachter für Änderungen an der show-Eigenschaft
watch(() => props.show, (newValue) => {
  showPanel.value = newValue;
});

// Methoden
const close = () => {
  showPanel.value = false;
  emit('close');
};

const setTheme = (newTheme) => {
  settingsStore.setTheme(newTheme);
};

const setFontSize = (newSize) => {
  settingsStore.setFontSize(newSize);
};

const updateAccessibility = (setting, value) => {
  settingsStore.updateAccessibilitySettings({
    [setting]: value
  });
};

// Tastatur-Ereignisse (für Escape-Taste)
const handleKeyDown = (event) => {
  if (event.key === 'Escape' && showPanel.value) {
    close();
  }
};

// Lebenszyklus-Hooks
onMounted(() => {
  document.addEventListener('keydown', handleKeyDown);
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
.settings-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 360px;
  background: white;
  box-shadow: -4px 0 15px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  transform: translateX(100%);
  transition: transform 0.3s ease-in-out;
  border-left: 1px solid #e2e8f0;
}

.settings-panel-visible {
  transform: translateX(0);
}

.settings-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.settings-panel-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--nscale-dark-gray, #333333);
}

.settings-panel-close {
  background: transparent;
  border: none;
  color: var(--nscale-dark-gray, #333333);
  cursor: pointer;
  font-size: 1.75rem;
  line-height: 1;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  border-radius: 50%;
}

.settings-panel-close:hover {
  background-color: rgba(0, 0, 0, 0.05);
  transform: rotate(90deg);
}

.settings-panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

/* Einstellungssektionen */
.settings-section {
  margin-bottom: 2.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.settings-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.settings-section-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1.25rem;
  color: var(--nscale-dark-gray, #333333);
  position: relative;
  padding-left: 0.5rem;
}

.settings-section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background-color: var(--nscale-green, #00a550);
  border-radius: 3px;
}

.settings-option {
  margin-bottom: 1.75rem;
}

.settings-option:last-child {
  margin-bottom: 0;
}

.settings-option-label {
  display: block;
  font-size: 0.95rem;
  font-weight: 500;
  margin-bottom: 0.85rem;
  color: var(--nscale-dark-gray, #333333);
}

/* RadioButton-Style für Farbschema und Schriftgröße */
.theme-options,
.font-size-options {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.theme-option,
.font-size-option {
  position: relative;
  cursor: pointer;
}

.theme-radio,
.font-size-radio {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.theme-label,
.font-size-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  border-radius: 8px;
  border: 2px solid #e2e8f0;
  transition: all 0.2s ease;
  min-width: 80px;
  text-align: center;
}

.theme-label:hover,
.font-size-label:hover {
  transform: translateY(-2px);
  border-color: #cbd5e0;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}

.theme-radio:checked + .theme-label,
.font-size-radio:checked + .font-size-label {
  border-color: var(--nscale-green, #00a550);
  background-color: rgba(0, 165, 80, 0.05);
}

.theme-radio:checked + .theme-label::after,
.font-size-radio:checked + .font-size-label::after {
  content: '✓';
  position: absolute;
  top: -8px;
  right: -8px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: var(--nscale-green, #00a550);
  color: white;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.theme-icon {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

/* Verbesserte Checkboxen für Barrierefreiheit */
.accessibility-container {
  margin-top: 1.5rem;
}

.accessibility-option {
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  background-color: #f7fafc;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.2s ease;
}

.accessibility-option:hover {
  background-color: #edf2f7;
  transform: translateY(-2px);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

.accessibility-checkbox {
  position: relative;
  appearance: none;
  width: 22px;
  height: 22px;
  border: 2px solid #cbd5e0;
  border-radius: 4px;
  margin-right: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: white;
  flex-shrink: 0;
}

.accessibility-checkbox:checked {
  background-color: var(--nscale-green, #00a550);
  border-color: var(--nscale-green, #00a550);
}

.accessibility-checkbox:checked::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 14px;
  color: white;
}

.accessibility-label {
  font-size: 0.95rem;
  font-weight: 500;
  flex-grow: 1;
  user-select: none;
}

.accessibility-description {
  font-size: 0.85rem;
  color: #718096;
  margin-top: 0.25rem;
  display: block;
}

/* Dark Mode Anpassungen */
:global(.theme-dark) .settings-panel {
  background-color: #1e1e1e;
  border-left: 1px solid #333;
  box-shadow: -4px 0 15px rgba(0, 0, 0, 0.5);
}

:global(.theme-dark) .settings-panel-header {
  border-bottom-color: #333;
}

:global(.theme-dark) .settings-panel-title,
:global(.theme-dark) .settings-section-title,
:global(.theme-dark) .settings-option-label,
:global(.theme-dark) .accessibility-label {
  color: #f0f0f0;
}

:global(.theme-dark) .settings-section {
  border-bottom-color: #333;
}

:global(.theme-dark) .settings-panel-close {
  color: #f0f0f0;
}

:global(.theme-dark) .settings-panel-close:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

:global(.theme-dark) .settings-section-title::before {
  background-color: #00c060;
}

/* Dunkelmodus für Radio Buttons */
:global(.theme-dark) .theme-label,
:global(.theme-dark) .font-size-label {
  background-color: #2a2a2a;
  border-color: #444;
  color: #e0e0e0;
}

:global(.theme-dark) .theme-label:hover,
:global(.theme-dark) .font-size-label:hover {
  background-color: #333;
  border-color: #555;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
}

:global(.theme-dark) .theme-radio:checked + .theme-label,
:global(.theme-dark) .font-size-radio:checked + .font-size-label {
  border-color: #00c060;
  background-color: rgba(0, 192, 96, 0.15);
}

:global(.theme-dark) .theme-radio:checked + .theme-label::after,
:global(.theme-dark) .font-size-radio:checked + .font-size-label::after {
  background-color: #00c060;
}

/* Dunkelmodus für Barrierefreiheit */
:global(.theme-dark) .accessibility-option {
  background-color: #2a2a2a;
  border-color: #444;
}

:global(.theme-dark) .accessibility-option:hover {
  background-color: #333;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

:global(.theme-dark) .accessibility-checkbox {
  background-color: #333;
  border-color: #555;
}

:global(.theme-dark) .accessibility-checkbox:checked {
  background-color: #00c060;
  border-color: #00c060;
}

:global(.theme-dark) .accessibility-description {
  color: #a0aec0;
}

/* Kontrast-Modus Anpassungen */
:global(.theme-contrast) .settings-panel {
  background-color: #000000;
  border-left: 2px solid #ffeb3b;
  box-shadow: -4px 0 15px rgba(255, 235, 59, 0.2);
}

:global(.theme-contrast) .settings-panel-header {
  border-bottom: 2px solid #ffeb3b;
}

:global(.theme-contrast) .settings-panel-title,
:global(.theme-contrast) .settings-section-title,
:global(.theme-contrast) .settings-option-label,
:global(.theme-contrast) .accessibility-label {
  color: #ffeb3b;
}

:global(.theme-contrast) .settings-section-title::before {
  background-color: #ffeb3b;
}

:global(.theme-contrast) .settings-section {
  border-bottom-color: #333300;
}

:global(.theme-contrast) .settings-panel-close {
  color: #ffeb3b;
}

:global(.theme-contrast) .settings-panel-close:hover {
  background-color: #333300;
}

/* Kontrastmodus für Radio Buttons */
:global(.theme-contrast) .theme-label,
:global(.theme-contrast) .font-size-label {
  background-color: #000000;
  border: 2px solid #ffeb3b;
  color: #ffeb3b;
}

:global(.theme-contrast) .theme-label:hover,
:global(.theme-contrast) .font-size-label:hover {
  background-color: #333300;
  box-shadow: 0 4px 6px rgba(255, 235, 59, 0.2);
}

:global(.theme-contrast) .theme-radio:checked + .theme-label,
:global(.theme-contrast) .font-size-radio:checked + .font-size-label {
  border-color: #ffeb3b;
  background-color: #333300;
  font-weight: bold;
}

:global(.theme-contrast) .theme-radio:checked + .theme-label::after,
:global(.theme-contrast) .font-size-radio:checked + .font-size-label::after {
  background-color: #ffeb3b;
  color: #000;
  border: 2px solid #000;
}

/* Kontrastmodus für Barrierefreiheit */
:global(.theme-contrast) .accessibility-option {
  background-color: #000000;
  border: 2px solid #ffeb3b;
}

:global(.theme-contrast) .accessibility-option:hover {
  background-color: #333300;
  box-shadow: 0 2px 5px rgba(255, 235, 59, 0.2);
}

:global(.theme-contrast) .accessibility-checkbox {
  background-color: #000;
  border: 2px solid #ffeb3b;
}

:global(.theme-contrast) .accessibility-checkbox:checked {
  background-color: #ffeb3b;
  border-color: #ffeb3b;
}

:global(.theme-contrast) .accessibility-checkbox:checked::after {
  color: #000;
}

:global(.theme-contrast) .accessibility-description {
  color: #cccccc;
}

/* Responsives Design */
@media (max-width: 768px) {
  .settings-panel {
    width: 100%;
  }
  
  .theme-options,
  .font-size-options {
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .theme-label,
  .font-size-label {
    flex-direction: row;
    justify-content: flex-start;
    gap: 0.75rem;
    min-width: auto;
  }
  
  .theme-icon {
    margin-bottom: 0;
  }
}

/* Fokus-Zustände für Tastatur-Navigation */
.theme-radio:focus-visible + .theme-label,
.font-size-radio:focus-visible + .font-size-label,
.accessibility-checkbox:focus-visible,
.settings-panel-close:focus-visible {
  outline: 3px solid var(--nscale-green, #00a550);
  outline-offset: 2px;
}

:global(.theme-dark) .theme-radio:focus-visible + .theme-label,
:global(.theme-dark) .font-size-radio:focus-visible + .font-size-label,
:global(.theme-dark) .accessibility-checkbox:focus-visible,
:global(.theme-dark) .settings-panel-close:focus-visible {
  outline-color: #00c060;
}

:global(.theme-contrast) .theme-radio:focus-visible + .theme-label,
:global(.theme-contrast) .font-size-radio:focus-visible + .font-size-label,
:global(.theme-contrast) .accessibility-checkbox:focus-visible,
:global(.theme-contrast) .settings-panel-close:focus-visible {
  outline-color: #ffeb3b;
  outline-width: 3px;
}
</style>