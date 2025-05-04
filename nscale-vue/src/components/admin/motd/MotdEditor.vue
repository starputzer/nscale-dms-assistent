<template>
  <div class="motd-editor">
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">MOTD-Editor</h3>
        <div class="action-buttons">
          <button 
            @click="reloadMotd" 
            class="action-button reload-button" 
            :disabled="loading"
            title="MOTD neu vom Server laden">
            <i class="fas fa-sync-alt" :class="{ 'fa-spin': loading }"></i>
          </button>
        </div>
      </div>
      
      <div class="card-body">
        <div v-if="error" class="error-message">
          <i class="fas fa-exclamation-triangle"></i> {{ error }}
        </div>
        
        <!-- Hauptschalter -->
        <div class="form-group switch-container">
          <label class="switch-label">MOTD aktivieren</label>
          <div class="toggle-switch">
            <label class="switch">
              <input type="checkbox" v-model="motdConfig.enabled">
              <span class="slider round"></span>
            </label>
            <span class="status-text">{{ motdConfig.enabled ? 'Aktiviert' : 'Deaktiviert' }}</span>
          </div>
        </div>
        
        <!-- Text-Editor -->
        <div class="form-group">
          <label for="motdContent">MOTD-Inhalt (Markdown)</label>
          <div class="editor-wrapper">
            <div class="toolbar">
              <button type="button" @click="insertMarkdown('**', '**')" title="Fett">
                <i class="fas fa-bold"></i>
              </button>
              <button type="button" @click="insertMarkdown('*', '*')" title="Kursiv">
                <i class="fas fa-italic"></i>
              </button>
              <button type="button" @click="insertMarkdown('## ', '')" title="Überschrift">
                <i class="fas fa-heading"></i>
              </button>
              <button type="button" @click="insertMarkdown('- ', '')" title="Liste">
                <i class="fas fa-list-ul"></i>
              </button>
              <button type="button" @click="insertMarkdown('[', '](URL)')" title="Link">
                <i class="fas fa-link"></i>
              </button>
              <button type="button" @click="insertMarkdown('> ', '')" title="Zitat">
                <i class="fas fa-quote-right"></i>
              </button>
              <button type="button" @click="insertEmoji('🛠️')" title="Tool-Emoji">
                <span>🛠️</span>
              </button>
              <button type="button" @click="insertEmoji('⚠️')" title="Warnung-Emoji">
                <span>⚠️</span>
              </button>
              <button type="button" @click="insertEmoji('ℹ️')" title="Info-Emoji">
                <span>ℹ️</span>
              </button>
              <button type="button" @click="insertEmoji('🔒')" title="Sicherheit-Emoji">
                <span>🔒</span>
              </button>
            </div>
            <textarea 
              id="motdContent" 
              v-model="motdConfig.content" 
              rows="8" 
              class="form-control"
              ref="contentEditor"
              @keydown.tab.prevent="handleTab">
            </textarea>
          </div>
          <div class="character-count" :class="{ 'warning': contentLength > 800 }">
            {{ contentLength }} / 1000 Zeichen
          </div>
        </div>
        
        <!-- Farbauswahl -->
        <div class="form-group">
          <label>Farbschema</label>
          <div class="color-themes">
            <button 
              v-for="(colors, theme) in colorThemes" 
              :key="theme"
              class="color-theme-button" 
              :class="{ active: selectedTheme === theme }"
              :style="{ 
                'background-color': colors.backgroundColor, 
                'border-color': colors.borderColor,
                'color': colors.textColor 
              }"
              @click="applyTheme(theme)">
              {{ getThemeName(theme) }}
            </button>
          </div>
        </div>
        
        <!-- Icon-Auswahl -->
        <div class="form-group">
          <label>Icon</label>
          <div class="icon-selector">
            <button 
              v-for="icon in availableIcons" 
              :key="icon"
              class="icon-button"
              :class="{ active: motdConfig.style.iconClass === icon }"
              @click="motdConfig.style.iconClass = icon">
              <i :class="['fas', `fa-${icon}`]"></i>
            </button>
          </div>
        </div>
        
        <!-- Anzeigeoptionen -->
        <div class="form-group">
          <label>Anzeigeoptionen</label>
          <div class="display-options">
            <div class="option">
              <label class="checkbox-container">
                <input type="checkbox" v-model="motdConfig.display.dismissible">
                <span class="checkmark"></span>
                Schließen erlauben
              </label>
            </div>
            <div class="option">
              <label class="checkbox-container">
                <input type="checkbox" v-model="motdConfig.display.showOnStartup">
                <span class="checkmark"></span>
                Bei Start anzeigen
              </label>
            </div>
            <div class="option">
              <label class="checkbox-container">
                <input type="checkbox" v-model="motdConfig.display.showInChat">
                <span class="checkmark"></span>
                Im Chat anzeigen
              </label>
            </div>
          </div>
        </div>
      </div>
      
      <div class="card-footer">
        <button 
          @click="saveMotd" 
          class="btn-primary save-button" 
          :disabled="loading || !isValid">
          <i class="fas fa-save"></i> Speichern
        </button>
        <button 
          @click="resetToDefaults" 
          class="btn-secondary reset-button" 
          :disabled="loading">
          <i class="fas fa-undo"></i> Zurücksetzen
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useMotdStore } from '@/stores/motdStore';

const motdStore = useMotdStore();

// Lokale Referenzen zum Store
const motdConfig = ref({ ...motdStore.adminEdit });
const loading = computed(() => motdStore.loading);
const error = computed(() => motdStore.error);
const colorThemes = computed(() => motdStore.colorThemes);
const selectedTheme = ref(motdStore.selectedColorTheme);
const contentEditor = ref(null);

// Verfügbare Icons
const availableIcons = [
  'info-circle', 
  'exclamation-triangle', 
  'exclamation-circle',
  'bell', 
  'bullhorn', 
  'comment', 
  'envelope',
  'flag',
  'lightbulb',
  'shield-alt'
];

// Zeichenzähler
const contentLength = computed(() => motdConfig.value.content.length);

// Validierung
const isValid = computed(() => 
  motdConfig.value.content.trim().length > 0 && 
  motdConfig.value.content.length <= 1000
);

// Namen für die Farbschemata
const getThemeName = (theme) => {
  const names = {
    warning: 'Warnung',
    info: 'Info',
    success: 'Erfolg',
    danger: 'Wichtig',
    neutral: 'Neutral'
  };
  return names[theme] || theme;
};

// Initialisierung
onMounted(async () => {
  await motdStore.loadMotdForEditing();
  motdConfig.value = { ...motdStore.adminEdit };
  selectedTheme.value = motdStore.selectedColorTheme;
});

// Synchronisiere mit dem Store, wenn sich Werte ändern
watch(() => motdStore.adminEdit, (newValue) => {
  motdConfig.value = { ...newValue };
}, { deep: true });

watch(() => motdStore.selectedColorTheme, (newValue) => {
  selectedTheme.value = newValue;
});

// Methoden
const applyTheme = (theme) => {
  selectedTheme.value = theme;
  motdStore.applyColorTheme(theme);
  motdConfig.value.style = { ...motdStore.adminEdit.style };
};

const saveMotd = async () => {
  try {
    // Übertrage die Änderungen in den Store
    motdStore.adminEdit = { ...motdConfig.value };
    
    // Speichern
    await motdStore.saveMotd();
  } catch (error) {
    console.error('Fehler beim Speichern der MOTD:', error);
  }
};

const resetToDefaults = () => {
  motdStore.resetMotdToDefaults();
  motdConfig.value = { ...motdStore.adminEdit };
  selectedTheme.value = motdStore.selectedColorTheme;
};

const reloadMotd = async () => {
  try {
    await motdStore.loadMotdForEditing();
    motdConfig.value = { ...motdStore.adminEdit };
    selectedTheme.value = motdStore.selectedColorTheme;
  } catch (error) {
    console.error('Fehler beim Neuladen der MOTD:', error);
  }
};

// Markdown-Editorfunktionen
const insertMarkdown = (prefix, suffix) => {
  const textarea = contentEditor.value;
  if (!textarea) return;
  
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = motdConfig.value.content.substring(start, end);
  const beforeText = motdConfig.value.content.substring(0, start);
  const afterText = motdConfig.value.content.substring(end);
  
  motdConfig.value.content = beforeText + prefix + selectedText + suffix + afterText;
  
  // Position des Cursors neu setzen
  setTimeout(() => {
    textarea.focus();
    textarea.selectionStart = start + prefix.length;
    textarea.selectionEnd = start + prefix.length + selectedText.length;
  }, 0);
};

const insertEmoji = (emoji) => {
  const textarea = contentEditor.value;
  if (!textarea) return;
  
  const start = textarea.selectionStart;
  const beforeText = motdConfig.value.content.substring(0, start);
  const afterText = motdConfig.value.content.substring(start);
  
  motdConfig.value.content = beforeText + emoji + ' ' + afterText;
  
  // Position des Cursors nach dem Emoji setzen
  setTimeout(() => {
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = start + emoji.length + 1;
  }, 0);
};

const handleTab = (e) => {
  const textarea = contentEditor.value;
  if (!textarea) return;
  
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  
  // Füge zwei Leerzeichen ein
  motdConfig.value.content = motdConfig.value.content.substring(0, start) + '  ' + motdConfig.value.content.substring(end);
  
  // Position des Cursors nach den eingefügten Leerzeichen setzen
  setTimeout(() => {
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = start + 2;
  }, 0);
};
</script>

<style scoped>
.motd-editor {
  max-width: 900px;
  margin: 0 auto;
}

.card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  background-color: #f9f9f9;
}

.card-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.card-body {
  padding: 1.5rem;
}

.card-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  background-color: #f9f9f9;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.action-button {
  background: none;
  border: none;
  color: #555;
  font-size: 1rem;
  cursor: pointer;
  width: 36px;
  height: 36px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-button:hover {
  background-color: rgba(0, 0, 0, 0.05);
  color: #333;
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.reload-button {
  color: #2d6da3;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #444;
}

.form-control {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.9rem;
  line-height: 1.5;
  resize: vertical;
}

.switch-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
}

.switch-label {
  font-weight: 600;
  margin-bottom: 0;
}

.toggle-switch {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
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
  height: 16px;
  width: 16px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: .4s;
}

input:checked + .slider {
  background-color: #2d6da3;
}

input:focus + .slider {
  box-shadow: 0 0 1px #2d6da3;
}

input:checked + .slider:before {
  transform: translateX(26px);
}

.slider.round {
  border-radius: 24px;
}

.slider.round:before {
  border-radius: 50%;
}

.status-text {
  font-size: 0.9rem;
  color: #666;
  width: 5rem;
}

.editor-wrapper {
  border: 1px solid #ccc;
  border-radius: 4px;
  overflow: hidden;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  padding: 4px;
  background-color: #f5f5f5;
  border-bottom: 1px solid #ddd;
}

.toolbar button {
  width: 32px;
  height: 32px;
  background: none;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #555;
}

.toolbar button:hover {
  background-color: #e0e0e0;
  color: #333;
}

.character-count {
  text-align: right;
  margin-top: 4px;
  font-size: 0.8rem;
  color: #666;
}

.character-count.warning {
  color: #e65100;
}

.color-themes {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}

.color-theme-button {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  border-width: 2px;
  border-style: solid;
  transition: transform 0.2s;
}

.color-theme-button:hover {
  transform: translateY(-2px);
}

.color-theme-button.active {
  box-shadow: 0 0 0 2px #2d6da3;
}

.icon-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.icon-button {
  width: 40px;
  height: 40px;
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  color: #555;
  transition: all 0.2s;
}

.icon-button:hover {
  background-color: #e0e0e0;
  transform: scale(1.05);
}

.icon-button.active {
  background-color: #e3f2fd;
  color: #1976d2;
  border-color: #90caf9;
}

.display-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}

.option {
  display: flex;
  align-items: center;
}

.checkbox-container {
  display: flex;
  align-items: center;
  position: relative;
  padding-left: 30px;
  cursor: pointer;
  user-select: none;
}

.checkbox-container input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.checkmark {
  position: absolute;
  top: 0;
  left: 0;
  height: 20px;
  width: 20px;
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 3px;
}

.checkbox-container:hover input ~ .checkmark {
  background-color: #e0e0e0;
}

.checkbox-container input:checked ~ .checkmark {
  background-color: #2d6da3;
  border-color: #2d6da3;
}

.checkmark:after {
  content: "";
  position: absolute;
  display: none;
}

.checkbox-container input:checked ~ .checkmark:after {
  display: block;
}

.checkbox-container .checkmark:after {
  left: 7px;
  top: 3px;
  width: 5px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.btn-primary, .btn-secondary {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.2s;
}

.btn-primary {
  background-color: #2d6da3;
  color: white;
}

.btn-primary:hover {
  background-color: #295f8d;
}

.btn-secondary {
  background-color: #f5f5f5;
  color: #555;
}

.btn-secondary:hover {
  background-color: #e0e0e0;
}

.btn-primary:disabled, .btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  padding: 0.75rem;
  margin-bottom: 1rem;
  background-color: #fee;
  border-left: 4px solid #d32f2f;
  color: #d32f2f;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Dark Mode Support */
:global(.theme-dark) .card {
  background-color: #2a2a2a;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

:global(.theme-dark) .card-header,
:global(.theme-dark) .card-footer {
  background-color: #222;
  border-color: #444;
}

:global(.theme-dark) .card-title {
  color: #e0e0e0;
}

:global(.theme-dark) .form-group label {
  color: #e0e0e0;
}

:global(.theme-dark) .form-control {
  background-color: #333;
  border-color: #555;
  color: #e0e0e0;
}

:global(.theme-dark) .toolbar {
  background-color: #333;
  border-color: #444;
}

:global(.theme-dark) .toolbar button {
  color: #e0e0e0;
}

:global(.theme-dark) .toolbar button:hover {
  background-color: #444;
}

:global(.theme-dark) .icon-button {
  background-color: #333;
  border-color: #555;
  color: #e0e0e0;
}

:global(.theme-dark) .icon-button:hover {
  background-color: #444;
}

:global(.theme-dark) .icon-button.active {
  background-color: #1a3f5f;
  color: #90caf9;
  border-color: #1976d2;
}

:global(.theme-dark) .btn-secondary {
  background-color: #333;
  color: #e0e0e0;
}

:global(.theme-dark) .btn-secondary:hover {
  background-color: #444;
}

:global(.theme-dark) .status-text {
  color: #bbb;
}

:global(.theme-dark) .slider {
  background-color: #444;
}

:global(.theme-dark) .checkmark {
  background-color: #333;
  border-color: #555;
}

:global(.theme-dark) .checkbox-container:hover input ~ .checkmark {
  background-color: #444;
}
</style>