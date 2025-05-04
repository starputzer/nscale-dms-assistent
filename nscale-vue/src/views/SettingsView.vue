<template>
  <div class="settings-view">
    <div class="container mx-auto py-8 px-4 md:px-8">
      <header class="mb-8">
        <h1 class="text-2xl font-bold text-gray-800 mb-2">Einstellungen</h1>
        <p class="text-gray-600">Passen Sie die Anwendung an Ihre persönlichen Vorlieben an</p>
      </header>

      <div class="settings-grid">
        <!-- Themensektion -->
        <section class="settings-card">
          <h2 class="settings-card-title">Design</h2>
          <div class="mb-6">
            <label class="block text-gray-700 font-medium mb-2">Farbschema</label>
            <div class="theme-selector">
              <div 
                v-for="themeName in ['light', 'dark', 'contrast']" 
                :key="themeName"
                class="theme-option"
                :class="{ 'active': themeName === theme }"
                @click="setTheme(themeName)"
              >
                <div class="theme-preview" :class="`theme-preview-${themeName}`">
                  <div class="theme-preview-header"></div>
                  <div class="theme-preview-content"></div>
                </div>
                <span class="theme-name">{{ getThemeLabel(themeName) }}</span>
              </div>
            </div>
          </div>

          <div>
            <label class="block text-gray-700 font-medium mb-2">Schriftgröße</label>
            <div class="font-size-selector">
              <button 
                v-for="size in ['small', 'medium', 'large']" 
                :key="size"
                class="font-size-button"
                :class="{ 'active': size === fontSize }"
                @click="setFontSize(size)"
              >
                <span class="font-size-preview" :class="`size-${size}`">Aa</span>
                <span class="font-size-name">{{ getFontSizeLabel(size) }}</span>
              </button>
            </div>
          </div>
        </section>

        <!-- Barrierefreiheit -->
        <section class="settings-card">
          <h2 class="settings-card-title">Barrierefreiheit</h2>
          
          <div class="a11y-options">
            <div class="a11y-option">
              <div class="flex items-center">
                <input 
                  type="checkbox" 
                  id="reduce-motion" 
                  class="form-checkbox" 
                  :checked="accessibility.reduceMotion"
                  @change="updateAccessibility('reduceMotion', $event.target.checked)"
                >
                <label for="reduce-motion" class="ml-2 font-medium">Animationen reduzieren</label>
              </div>
              <p class="text-gray-600 text-sm mt-1 ml-7">
                Verringert Animationen und Bewegungen in der Benutzeroberfläche.
              </p>
            </div>

            <div class="a11y-option">
              <div class="flex items-center">
                <input 
                  type="checkbox" 
                  id="simple-language" 
                  class="form-checkbox" 
                  :checked="accessibility.simpleLanguage"
                  @change="updateAccessibility('simpleLanguage', $event.target.checked)"
                >
                <label for="simple-language" class="ml-2 font-medium">Einfache Sprache</label>
              </div>
              <p class="text-gray-600 text-sm mt-1 ml-7">
                Verwendet vereinfachte Sprache in den KI-Antworten.
              </p>
            </div>
          </div>
        </section>

        <!-- Benachrichtigungen -->
        <section class="settings-card">
          <h2 class="settings-card-title">Benachrichtigungen</h2>
          
          <div class="notification-options">
            <div class="notification-option">
              <div class="flex items-center">
                <input 
                  type="checkbox" 
                  id="session-notifications" 
                  class="form-checkbox" 
                  :checked="notifications.sessions"
                  @change="updateNotifications('sessions', $event.target.checked)"
                >
                <label for="session-notifications" class="ml-2 font-medium">Sitzungsbenachrichtigungen</label>
              </div>
              <p class="text-gray-600 text-sm mt-1 ml-7">
                Benachrichtigungen über neue Sitzungen und Updates.
              </p>
            </div>

            <div class="notification-option">
              <div class="flex items-center">
                <input 
                  type="checkbox" 
                  id="system-notifications" 
                  class="form-checkbox" 
                  :checked="notifications.system"
                  @change="updateNotifications('system', $event.target.checked)"
                >
                <label for="system-notifications" class="ml-2 font-medium">Systembenachrichtigungen</label>
              </div>
              <p class="text-gray-600 text-sm mt-1 ml-7">
                Benachrichtigungen über Systemereignisse und Wartung.
              </p>
            </div>
            
            <div class="notification-option">
              <div class="flex items-center">
                <input 
                  type="checkbox" 
                  id="email-notifications" 
                  class="form-checkbox" 
                  :checked="notifications.email"
                  @change="updateNotifications('email', $event.target.checked)"
                >
                <label for="email-notifications" class="ml-2 font-medium">E-Mail-Benachrichtigungen</label>
              </div>
              <p class="text-gray-600 text-sm mt-1 ml-7">
                Wichtige Updates per E-Mail erhalten.
              </p>
            </div>
          </div>
        </section>

        <!-- Anwendungseinstellungen -->
        <section class="settings-card">
          <h2 class="settings-card-title">Anwendungseinstellungen</h2>
          
          <div class="app-settings">
            <div class="app-setting-group">
              <label class="block text-gray-700 font-medium mb-2">Standardansicht</label>
              <select 
                v-model="appSettings.defaultView" 
                class="form-select w-full"
                @change="updateAppSettings('defaultView', $event.target.value)"
              >
                <option value="chat">Chat</option>
                <option value="documents">Dokumente</option>
                <option value="admin">Administration</option>
              </select>
            </div>

            <div class="app-setting-group mt-4">
              <label class="block text-gray-700 font-medium mb-2">Sprache der Benutzeroberfläche</label>
              <select 
                v-model="appSettings.language" 
                class="form-select w-full"
                @change="updateAppSettings('language', $event.target.value)"
              >
                <option value="de">Deutsch</option>
                <option value="en">English</option>
              </select>
              <p class="text-gray-600 text-sm mt-1">
                Änderungen werden beim nächsten Neuladen wirksam.
              </p>
            </div>

            <div class="app-setting-group mt-4">
              <div class="flex items-center">
                <input 
                  type="checkbox" 
                  id="auto-save" 
                  class="form-checkbox" 
                  :checked="appSettings.autoSave"
                  @change="updateAppSettings('autoSave', $event.target.checked)"
                >
                <label for="auto-save" class="ml-2 font-medium">Automatisches Speichern</label>
              </div>
              <p class="text-gray-600 text-sm mt-1 ml-7">
                Speichert Chat-Unterhaltungen automatisch.
              </p>
            </div>
          </div>

          <div class="mt-8">
            <button @click="saveSettings" class="nscale-btn-primary w-full">
              <span v-if="loading" class="flex items-center justify-center">
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Speichern...
              </span>
              <span v-else>Einstellungen speichern</span>
            </button>
            <p v-if="saveStatus.success" class="text-green-600 text-sm text-center mt-2">
              Einstellungen wurden gespeichert.
            </p>
            <p v-if="saveStatus.error" class="text-red-600 text-sm text-center mt-2">
              {{ saveStatus.error }}
            </p>
          </div>
        </section>
      </div>

      <section class="mt-12">
        <h2 class="text-xl font-semibold mb-4">Erweiterte Optionen</h2>
        <div class="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <button @click="resetAllSettings" class="text-red-600 hover:text-red-800 flex items-center">
            <span class="mr-2"><i class="fas fa-undo"></i></span>
            Alle Einstellungen zurücksetzen
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useSettingsStore } from '@/stores/settingsStore';

// Store
const settingsStore = useSettingsStore();

// Einstellungen aus dem Store
const theme = computed(() => settingsStore.theme);
const fontSize = computed(() => settingsStore.fontSize);
const accessibility = computed(() => settingsStore.accessibility);

// Benachrichtigungseinstellungen
const notifications = ref({
  sessions: localStorage.getItem('notifySessions') === 'true' || true,
  system: localStorage.getItem('notifySystem') === 'true' || false,
  email: localStorage.getItem('notifyEmail') === 'true' || false
});

// Anwendungseinstellungen
const appSettings = ref({
  defaultView: localStorage.getItem('defaultView') || 'chat',
  language: localStorage.getItem('uiLanguage') || 'de',
  autoSave: localStorage.getItem('autoSave') === 'true' || true
});

// Status für das Speichern
const loading = ref(false);
const saveStatus = ref({
  success: false,
  error: null
});

// Hilfsfunktionen für Labels
const getThemeLabel = (themeName) => {
  const labels = {
    'light': 'Hell',
    'dark': 'Dunkel',
    'contrast': 'Kontrast'
  };
  return labels[themeName] || themeName;
};

const getFontSizeLabel = (size) => {
  const labels = {
    'small': 'Klein',
    'medium': 'Normal',
    'large': 'Groß'
  };
  return labels[size] || size;
};

// Methoden
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

const updateNotifications = (setting, value) => {
  notifications.value[setting] = value;
  localStorage.setItem(`notify${setting.charAt(0).toUpperCase() + setting.slice(1)}`, value.toString());
};

const updateAppSettings = (setting, value) => {
  appSettings.value[setting] = value;
  
  // Speichern in localStorage mit verschiedenen Schlüsseln je nach Einstellung
  if (setting === 'language') {
    localStorage.setItem('uiLanguage', value);
  } else if (setting === 'defaultView') {
    localStorage.setItem('defaultView', value);
  } else {
    localStorage.setItem(setting, value.toString());
  }
};

const saveSettings = async () => {
  loading.value = true;
  saveStatus.value = { success: false, error: null };
  
  try {
    // Theme, Schriftgröße und Barrierefreiheit speichern (sync mit dem Server)
    await settingsStore.syncSettings();
    
    // Pseudo-Verzögerung für realistisches Feedback
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Benachrichtigungseinstellungen an den Server senden
    // In einer realen Anwendung würde hier ein API-Aufruf stehen
    console.log('Benachrichtigungseinstellungen:', notifications.value);
    
    // Anwendungseinstellungen an den Server senden
    // In einer realen Anwendung würde hier ein API-Aufruf stehen
    console.log('Anwendungseinstellungen:', appSettings.value);
    
    saveStatus.value.success = true;
    
    // Status nach 3 Sekunden zurücksetzen
    setTimeout(() => {
      saveStatus.value.success = false;
    }, 3000);
  } catch (error) {
    console.error('Fehler beim Speichern der Einstellungen:', error);
    saveStatus.value.error = 'Fehler beim Speichern der Einstellungen. Bitte versuchen Sie es später erneut.';
  } finally {
    loading.value = false;
  }
};

const resetAllSettings = () => {
  // Bestätigung vom Benutzer einholen
  if (!confirm('Möchten Sie wirklich alle Einstellungen auf die Standardwerte zurücksetzen? Dies kann nicht rückgängig gemacht werden.')) {
    return;
  }
  
  // Theme und Schriftgröße zurücksetzen
  settingsStore.setTheme('light');
  settingsStore.setFontSize('medium');
  
  // Barrierefreiheit zurücksetzen
  settingsStore.updateAccessibilitySettings({
    reduceMotion: false,
    simpleLanguage: false
  });
  
  // Benachrichtigungen zurücksetzen
  notifications.value = {
    sessions: true,
    system: false,
    email: false
  };
  localStorage.setItem('notifySessions', 'true');
  localStorage.setItem('notifySystem', 'false');
  localStorage.setItem('notifyEmail', 'false');
  
  // Anwendungseinstellungen zurücksetzen
  appSettings.value = {
    defaultView: 'chat',
    language: 'de',
    autoSave: true
  };
  localStorage.setItem('defaultView', 'chat');
  localStorage.setItem('uiLanguage', 'de');
  localStorage.setItem('autoSave', 'true');
  
  // Erfolgsmeldung anzeigen
  saveStatus.value = { 
    success: true, 
    error: null 
  };
  
  // Status nach 3 Sekunden zurücksetzen
  setTimeout(() => {
    saveStatus.value.success = false;
  }, 3000);
};

// Lebenszyklus-Hooks
onMounted(() => {
  // Einstellungen vom Server laden, wenn der Benutzer angemeldet ist
  settingsStore.loadSettings();
});
</script>

<style scoped>
.settings-view {
  min-height: calc(100vh - 80px);
  background-color: var(--nscale-light-bg, #f8f9fa);
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 1.5rem;
}

@media (min-width: 768px) {
  .settings-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.settings-card {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
}

.settings-card-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #e2e8f0;
  color: var(--nscale-primary, #00a550);
}

/* Theme-Auswahl */
.theme-selector {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.theme-option {
  cursor: pointer;
  border-radius: 0.375rem;
  padding: 0.5rem;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.theme-option:hover {
  transform: translateY(-2px);
}

.theme-option.active {
  border-color: var(--nscale-primary, #00a550);
  background-color: rgba(0, 165, 80, 0.05);
}

.theme-preview {
  width: 100px;
  height: 60px;
  border-radius: 0.25rem;
  overflow: hidden;
  margin-bottom: 0.5rem;
  border: 1px solid #e2e8f0;
}

.theme-preview-light {
  background-color: #ffffff;
}

.theme-preview-light .theme-preview-header {
  background-color: #f1f5f9;
  height: 20%;
  border-bottom: 1px solid #e2e8f0;
}

.theme-preview-light .theme-preview-content {
  background-color: #ffffff;
  height: 80%;
  display: flex;
  flex-direction: column;
  padding: 4px;
}

.theme-preview-light .theme-preview-content::before {
  content: '';
  width: 60%;
  height: 4px;
  background-color: #e2e8f0;
  margin-bottom: 3px;
}

.theme-preview-light .theme-preview-content::after {
  content: '';
  width: 80%;
  height: 4px;
  background-color: #e2e8f0;
}

.theme-preview-dark {
  background-color: #1e1e1e;
}

.theme-preview-dark .theme-preview-header {
  background-color: #2d3748;
  height: 20%;
  border-bottom: 1px solid #4a5568;
}

.theme-preview-dark .theme-preview-content {
  background-color: #1e1e1e;
  height: 80%;
  display: flex;
  flex-direction: column;
  padding: 4px;
}

.theme-preview-dark .theme-preview-content::before {
  content: '';
  width: 60%;
  height: 4px;
  background-color: #4a5568;
  margin-bottom: 3px;
}

.theme-preview-dark .theme-preview-content::after {
  content: '';
  width: 80%;
  height: 4px;
  background-color: #4a5568;
}

.theme-preview-contrast {
  background-color: #000000;
}

.theme-preview-contrast .theme-preview-header {
  background-color: #000000;
  height: 20%;
  border-bottom: 1px solid #ffeb3b;
}

.theme-preview-contrast .theme-preview-content {
  background-color: #000000;
  height: 80%;
  display: flex;
  flex-direction: column;
  padding: 4px;
}

.theme-preview-contrast .theme-preview-content::before {
  content: '';
  width: 60%;
  height: 4px;
  background-color: #ffeb3b;
  margin-bottom: 3px;
}

.theme-preview-contrast .theme-preview-content::after {
  content: '';
  width: 80%;
  height: 4px;
  background-color: #ffeb3b;
}

.theme-name {
  display: block;
  text-align: center;
  font-size: 0.875rem;
}

/* Schriftgrößen-Auswahl */
.font-size-selector {
  display: flex;
  gap: 1rem;
}

.font-size-button {
  flex: 1;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: all 0.2s;
  cursor: pointer;
}

.font-size-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.font-size-button.active {
  border-color: var(--nscale-primary, #00a550);
  background-color: rgba(0, 165, 80, 0.05);
}

.font-size-preview {
  font-weight: bold;
  display: block;
  margin-bottom: 0.5rem;
}

.size-small {
  font-size: 1rem;
}

.size-medium {
  font-size: 1.25rem;
}

.size-large {
  font-size: 1.5rem;
}

.font-size-name {
  font-size: 0.875rem;
}

/* Barrierefreiheit und Benachrichtigungen */
.a11y-options,
.notification-options {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.a11y-option,
.notification-option {
  border-radius: 0.375rem;
  background-color: #f8fafc;
  padding: 0.75rem;
  border: 1px solid #e2e8f0;
  transition: all 0.2s;
}

.a11y-option:hover,
.notification-option:hover {
  background-color: #f1f5f9;
  transform: translateY(-2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

/* App-Einstellungen */
.app-settings {
  margin-bottom: 1.5rem;
}

.form-checkbox {
  @apply rounded border-gray-300 text-green-600 shadow-sm focus:border-green-300 focus:ring focus:ring-green-200 focus:ring-opacity-50;
  cursor: pointer;
  width: 1.15rem;
  height: 1.15rem;
}

.form-select {
  @apply rounded-md border-gray-300 shadow-sm focus:border-green-300 focus:ring focus:ring-green-200 focus:ring-opacity-50;
  padding: 0.5rem;
  width: 100%;
}

.nscale-btn-primary {
  @apply bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition-colors;
}

/* Dark Mode Anpassungen */
:global(.theme-dark) .settings-view {
  background-color: #121212;
  color: #e0e0e0;
}

:global(.theme-dark) .settings-card {
  background-color: #1e1e1e;
  border-color: #333;
}

:global(.theme-dark) .settings-card-title {
  color: #00c060;
  border-bottom-color: #333;
}

:global(.theme-dark) h1,
:global(.theme-dark) h2,
:global(.theme-dark) label {
  color: #e0e0e0;
}

:global(.theme-dark) p {
  color: #a0aec0;
}

:global(.theme-dark) .font-size-button,
:global(.theme-dark) .a11y-option,
:global(.theme-dark) .notification-option {
  background-color: #2a2a2a;
  border-color: #444;
}

:global(.theme-dark) .font-size-button:hover,
:global(.theme-dark) .a11y-option:hover,
:global(.theme-dark) .notification-option:hover {
  background-color: #333;
}

:global(.theme-dark) .font-size-button.active,
:global(.theme-dark) .theme-option.active {
  border-color: #00c060;
  background-color: rgba(0, 192, 96, 0.1);
}

:global(.theme-dark) .bg-gray-50 {
  background-color: #2a2a2a;
  border-color: #444;
}

:global(.theme-dark) .form-select,
:global(.theme-dark) .form-checkbox {
  background-color: #333;
  border-color: #444;
  color: #e0e0e0;
}

/* Kontrast-Modus */
:global(.theme-contrast) .settings-view {
  background-color: #000;
  color: #fff;
}

:global(.theme-contrast) .settings-card {
  background-color: #000;
  border: 2px solid #ffeb3b;
}

:global(.theme-contrast) .settings-card-title {
  color: #ffeb3b;
  border-bottom: 2px solid #ffeb3b;
}

:global(.theme-contrast) h1,
:global(.theme-contrast) h2,
:global(.theme-contrast) label {
  color: #ffeb3b;
}

:global(.theme-contrast) p {
  color: #fff;
}

:global(.theme-contrast) .font-size-button,
:global(.theme-contrast) .a11y-option,
:global(.theme-contrast) .notification-option {
  background-color: #000;
  border: 2px solid #ffeb3b;
}

:global(.theme-contrast) .font-size-button:hover,
:global(.theme-contrast) .a11y-option:hover,
:global(.theme-contrast) .notification-option:hover {
  background-color: #333300;
}

:global(.theme-contrast) .font-size-button.active,
:global(.theme-contrast) .theme-option.active {
  border: 2px solid #ffeb3b;
  background-color: #333300;
}

:global(.theme-contrast) .bg-gray-50 {
  background-color: #000;
  border: 2px solid #ffeb3b;
}

:global(.theme-contrast) .form-select,
:global(.theme-contrast) .form-checkbox {
  background-color: #000;
  border: 2px solid #ffeb3b;
  color: #fff;
}

:global(.theme-contrast) .nscale-btn-primary {
  background-color: #ffeb3b;
  color: #000;
  font-weight: bold;
}

:global(.theme-contrast) .text-green-600 {
  color: #ffeb3b;
}

:global(.theme-contrast) .text-red-600 {
  color: #ff6b6b;
}
</style>
