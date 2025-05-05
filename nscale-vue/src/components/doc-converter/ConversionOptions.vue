// ConversionOptions.vue
<template>
  <div class="conversion-options" :class="{ 'disabled': disabled }">
    <div class="options-grid">
      <!-- Ausgabeformat -->
      <div class="option-group">
        <label class="option-label">Ausgabeformat</label>
        <div class="option-controls">
          <select 
            v-model="localOptions.outputFormat" 
            class="select-input"
            :disabled="disabled"
          >
            <option value="markdown">Markdown</option>
            <option value="text">Einfacher Text</option>
            <option value="html">HTML</option>
            <option value="json">JSON</option>
          </select>
        </div>
        <p class="option-hint">Format der konvertierten Dokumente</p>
      </div>
      
      <!-- Abschnittstrennung -->
      <div class="option-group">
        <label class="option-label">Abschnitte trennen</label>
        <div class="option-controls">
          <div class="toggle-control">
            <input 
              type="checkbox" 
              id="split-sections" 
              v-model="localOptions.splitSections"
              :disabled="disabled"
            >
            <label for="split-sections" class="toggle-label"></label>
          </div>
        </div>
        <p class="option-hint">Dokumente in logische Abschnitte unterteilen</p>
      </div>
      
      <!-- Bildextraktion -->
      <div class="option-group">
        <label class="option-label">Bilder extrahieren</label>
        <div class="option-controls">
          <div class="toggle-control">
            <input 
              type="checkbox" 
              id="extract-images" 
              v-model="localOptions.extractImages"
              :disabled="disabled"
            >
            <label for="extract-images" class="toggle-label"></label>
          </div>
        </div>
        <p class="option-hint">Bilder als separate Dateien extrahieren</p>
      </div>
      
      <!-- Bildqualität (nur sichtbar wenn extractImages aktiviert ist) -->
      <div class="option-group" v-if="localOptions.extractImages">
        <label class="option-label">Bildqualität</label>
        <div class="option-controls">
          <select 
            v-model="localOptions.imageQuality" 
            class="select-input"
            :disabled="disabled"
          >
            <option value="low">Niedrig (schneller)</option>
            <option value="medium">Mittel</option>
            <option value="high">Hoch (größere Dateien)</option>
          </select>
        </div>
        <p class="option-hint">Qualität der extrahierten Bilder</p>
      </div>
      
      <!-- Metadaten-Behandlung -->
      <div class="option-group">
        <label class="option-label">Metadaten</label>
        <div class="option-controls">
          <select 
            v-model="localOptions.metadataHandling" 
            class="select-input"
            :disabled="disabled"
          >
            <option value="extract">Extrahieren</option>
            <option value="include">In den Text einbetten</option>
            <option value="ignore">Ignorieren</option>
          </select>
        </div>
        <p class="option-hint">Wie Dokument-Metadaten verarbeitet werden</p>
      </div>
      
      <!-- Erweiterte Textanalyse -->
      <div class="option-group">
        <label class="option-label">Erweiterte Textanalyse</label>
        <div class="option-controls">
          <div class="toggle-control">
            <input 
              type="checkbox" 
              id="advanced-parsing" 
              v-model="localOptions.advancedParsing"
              :disabled="disabled"
            >
            <label for="advanced-parsing" class="toggle-label"></label>
          </div>
        </div>
        <p class="option-hint">Tiefergehende Analyse für bessere Formaterhaltung</p>
      </div>
    </div>
    
    <!-- Erweiterte Optionen (aufklappbar) -->
    <div class="advanced-options">
      <button 
        class="advanced-toggle" 
        @click="showAdvanced = !showAdvanced"
        :disabled="disabled"
      >
        <i :class="['fas', showAdvanced ? 'fa-chevron-up' : 'fa-chevron-down']"></i>
        Erweiterte Optionen {{ showAdvanced ? 'ausblenden' : 'anzeigen' }}
      </button>
      
      <div v-if="showAdvanced" class="advanced-settings">
        <div class="advanced-grid">
          <!-- Fortgeschrittene Optionen könnten hier hinzugefügt werden -->
          <div class="option-group">
            <label class="option-label">Tabellenerkennung</label>
            <div class="option-controls">
              <select 
                v-model="localOptions.tableDetection" 
                class="select-input"
                :disabled="disabled"
              >
                <option value="auto">Automatisch</option>
                <option value="strict">Strikt</option>
                <option value="relaxed">Flexibel</option>
              </select>
            </div>
            <p class="option-hint">Wie Tabellen in Dokumenten erkannt werden</p>
          </div>
          
          <div class="option-group">
            <label class="option-label">OCR-Level</label>
            <div class="option-controls">
              <select 
                v-model="localOptions.ocrLevel" 
                class="select-input"
                :disabled="disabled"
              >
                <option value="none">Deaktiviert</option>
                <option value="basic">Einfach</option>
                <option value="advanced">Erweitert</option>
              </select>
            </div>
            <p class="option-hint">Texterkennung für gescannte Dokumente</p>
          </div>
          
          <div class="option-group">
            <label class="option-label">Formaterkennung</label>
            <div class="option-controls">
              <div class="toggle-control">
                <input 
                  type="checkbox" 
                  id="format-detection" 
                  v-model="localOptions.formatDetection"
                  :disabled="disabled"
                >
                <label for="format-detection" class="toggle-label"></label>
              </div>
            </div>
            <p class="option-hint">Erkennung und Erhaltung der Textformatierung</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

// Props
const props = defineProps({
  options: {
    type: Object,
    default: () => ({})
  },
  disabled: {
    type: Boolean,
    default: false
  }
});

// Emits
const emit = defineEmits(['update:options']);

// Lokaler State
const showAdvanced = ref(false);

// Standardoptionen, die mit den übergebenen Optionen zusammengeführt werden
const defaultOptions = {
  outputFormat: 'markdown',
  splitSections: true,
  extractImages: true,
  imageQuality: 'medium',
  metadataHandling: 'extract',
  advancedParsing: true,
  tableDetection: 'auto',
  ocrLevel: 'basic',
  formatDetection: true
};

// Lokale Kopie der Optionen
const localOptions = ref({
  ...defaultOptions,
  ...props.options
});

// Wenn sich die lokalen Optionen ändern, emittiere ein Update-Event
watch(localOptions, (newOptions) => {
  emit('update:options', newOptions);
}, { deep: true });

// Wenn sich die Props ändern, aktualisiere die lokalen Optionen
watch(() => props.options, (newOptions) => {
  localOptions.value = {
    ...defaultOptions,
    ...newOptions
  };
}, { deep: true });
</script>

<style scoped>
.conversion-options {
  width: 100%;
}

.conversion-options.disabled {
  opacity: 0.6;
  pointer-events: none;
}

.options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.option-group {
  margin-bottom: 1rem;
}

.option-label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: var(--nscale-dark-gray);
}

.option-hint {
  font-size: 0.85rem;
  color: var(--nscale-gray-dark);
  margin-top: 0.25rem;
}

.option-controls {
  display: flex;
  align-items: center;
}

.select-input {
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--nscale-gray-medium);
  border-radius: 4px;
  background-color: white;
  font-size: 0.95rem;
  color: var(--nscale-dark-gray);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.select-input:focus {
  border-color: var(--nscale-primary);
  box-shadow: 0 0 0 2px rgba(0, 165, 80, 0.1);
  outline: none;
}

/* Toggle-Switch Styling */
.toggle-control {
  position: relative;
  display: inline-block;
  width: 46px;
  height: 24px;
}

.toggle-control input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-label {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--nscale-gray-medium);
  transition: .4s;
  border-radius: 24px;
}

.toggle-label:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  border-radius: 50%;
  transition: .4s;
}

input:checked + .toggle-label {
  background-color: var(--nscale-primary);
}

input:focus + .toggle-label {
  box-shadow: 0 0 0 2px rgba(0, 165, 80, 0.2);
}

input:checked + .toggle-label:before {
  transform: translateX(22px);
}

/* Erweiterte Optionen */
.advanced-options {
  margin-top: 1.5rem;
  border-top: 1px solid var(--nscale-gray-medium);
  padding-top: 1rem;
}

.advanced-toggle {
  background: none;
  border: none;
  color: var(--nscale-primary);
  cursor: pointer;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0;
}

.advanced-settings {
  margin-top: 1.5rem;
  padding: 1rem;
  background-color: var(--nscale-gray-light);
  border-radius: 4px;
}

.advanced-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

/* Dark Mode Anpassungen */
:global(.theme-dark) .option-label {
  color: #f0f0f0;
}

:global(.theme-dark) .option-hint {
  color: #aaa;
}

:global(.theme-dark) .select-input {
  background-color: #333;
  color: #f0f0f0;
  border-color: #555;
}

:global(.theme-dark) .select-input:focus {
  border-color: #00c060;
  box-shadow: 0 0 0 2px rgba(0, 192, 96, 0.2);
}

:global(.theme-dark) .toggle-label {
  background-color: #555;
}

:global(.theme-dark) input:checked + .toggle-label {
  background-color: #00c060;
}

:global(.theme-dark) .advanced-toggle {
  color: #00c060;
}

:global(.theme-dark) .advanced-settings {
  background-color: #2a2a2a;
}

/* Kontrast-Modus Anpassungen */
:global(.theme-contrast) .option-label,
:global(.theme-contrast) .option-hint {
  color: #ffeb3b;
}

:global(.theme-contrast) .select-input {
  background-color: #000000;
  color: #ffffff;
  border: 2px solid #ffeb3b;
}

:global(.theme-contrast) .select-input:focus {
  border-color: #ffd600;
  box-shadow: 0 0 0 2px rgba(255, 235, 59, 0.3);
}

:global(.theme-contrast) .toggle-label {
  background-color: #333300;
  border: 1px solid #ffeb3b;
}

:global(.theme-contrast) .toggle-label:before {
  background-color: #ffeb3b;
}

:global(.theme-contrast) input:checked + .toggle-label {
  background-color: #ffeb3b;
}

:global(.theme-contrast) input:checked + .toggle-label:before {
  background-color: #000000;
}

:global(.theme-contrast) .advanced-toggle {
  color: #ffeb3b;
}

:global(.theme-contrast) .advanced-settings {
  background-color: #333300;
  border: 1px solid #ffeb3b;
}
</style>