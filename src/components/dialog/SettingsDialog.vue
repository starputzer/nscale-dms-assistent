<template>
  <div class="settings-dialog" v-if="isVisible">
    <div class="settings-dialog-backdrop" @click="closeDialog"></div>

    <div class="settings-dialog-container">
      <div class="settings-dialog-header">
        <h2 class="settings-dialog-title">{{ title }}</h2>
        <button
          class="settings-dialog-close"
          @click="closeDialog"
          aria-label="Schließen"
        >
          <span class="icon">×</span>
        </button>
      </div>

      <div class="settings-dialog-content">
        <div class="settings-tabs">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            :class="['settings-tab', { active: activeTab === tab.id }]"
            @click="setActiveTab(tab.id)"
          >
            {{ tab.label }}
          </button>
        </div>

        <div class="settings-panel">
          <!-- Erscheinungsbild-Einstellungen -->
          <div v-if="activeTab === 'appearance'" class="settings-section">
            <h3 class="settings-section-title">Erscheinungsbild</h3>

            <div class="settings-form-group">
              <label class="settings-label">Theme</label>
              <div class="settings-option-group">
                <label class="settings-radio">
                  <input
                    type="radio"
                    name="theme"
                    value="light"
                    v-model="settings.theme"
                    @change="updateSettings"
                  />
                  <span class="settings-radio-label">Hell</span>
                </label>

                <label class="settings-radio">
                  <input
                    type="radio"
                    name="theme"
                    value="dark"
                    v-model="settings.theme"
                    @change="updateSettings"
                  />
                  <span class="settings-radio-label">Dunkel</span>
                </label>

                <label class="settings-radio">
                  <input
                    type="radio"
                    name="theme"
                    value="system"
                    v-model="settings.theme"
                    @change="updateSettings"
                  />
                  <span class="settings-radio-label">Systemeinstellung</span>
                </label>
              </div>
            </div>

            <div class="settings-form-group">
              <label class="settings-label">Schriftgröße</label>
              <div class="font-size-slider">
                <input
                  type="range"
                  min="80"
                  max="120"
                  step="5"
                  v-model.number="settings.fontSize"
                  @change="updateSettings"
                />
                <span class="font-size-value">{{ settings.fontSize }}%</span>
              </div>
            </div>

            <div class="settings-form-group">
              <label class="settings-label">Zeilenabstand</label>
              <select
                v-model="settings.lineHeight"
                @change="updateSettings"
                class="settings-select"
              >
                <option value="1.2">Kompakt (1.2)</option>
                <option value="1.5">Normal (1.5)</option>
                <option value="1.8">Erweitert (1.8)</option>
                <option value="2">Weit (2.0)</option>
              </select>
            </div>
          </div>

          <!-- Benachrichtigungen-Einstellungen -->
          <div v-if="activeTab === 'notifications'" class="settings-section">
            <h3 class="settings-section-title">Benachrichtigungen</h3>

            <div class="settings-form-group">
              <label class="settings-toggle">
                <span class="settings-toggle-label"
                  >Desktop-Benachrichtigungen</span
                >
                <div class="toggle-control">
                  <input
                    type="checkbox"
                    v-model="settings.notifications.desktop"
                    @change="updateSettings"
                  />
                  <span class="toggle-switch"></span>
                </div>
              </label>
              <p class="settings-description">
                Erhalten Sie Benachrichtigungen, wenn neue Antworten verfügbar
                sind
              </p>
            </div>

            <div class="settings-form-group">
              <label class="settings-toggle">
                <span class="settings-toggle-label"
                  >Sound-Benachrichtigungen</span
                >
                <div class="toggle-control">
                  <input
                    type="checkbox"
                    v-model="settings.notifications.sound"
                    @change="updateSettings"
                  />
                  <span class="toggle-switch"></span>
                </div>
              </label>
              <p class="settings-description">
                Spielen Sie einen Ton ab, wenn neue Antworten verfügbar sind
              </p>
            </div>

            <div class="settings-form-group">
              <label class="settings-label">Benachrichtigungston</label>
              <select
                v-model="settings.notifications.soundType"
                @change="updateSettings"
                class="settings-select"
                :disabled="!settings.notifications.sound"
              >
                <option value="beep">Beep</option>
                <option value="chime">Chime</option>
                <option value="bell">Bell</option>
                <option value="notification">Notification</option>
              </select>
              <button
                class="settings-btn-small"
                @click="playSound"
                :disabled="!settings.notifications.sound"
              >
                Test
              </button>
            </div>
          </div>

          <!-- Datenschutz-Einstellungen -->
          <div v-if="activeTab === 'privacy'" class="settings-section">
            <h3 class="settings-section-title">Datenschutz</h3>

            <div class="settings-form-group">
              <label class="settings-toggle">
                <span class="settings-toggle-label">Verlauf speichern</span>
                <div class="toggle-control">
                  <input
                    type="checkbox"
                    v-model="settings.privacy.saveHistory"
                    @change="updateSettings"
                  />
                  <span class="toggle-switch"></span>
                </div>
              </label>
              <p class="settings-description">
                Wenn aktiviert, werden Ihre Konversationen für zukünftige
                Sitzungen gespeichert
              </p>
            </div>

            <div class="settings-form-group">
              <label class="settings-toggle">
                <span class="settings-toggle-label"
                  >Lokale Datenspeicherung</span
                >
                <div class="toggle-control">
                  <input
                    type="checkbox"
                    v-model="settings.privacy.localStorageEnabled"
                    @change="updateSettings"
                  />
                  <span class="toggle-switch"></span>
                </div>
              </label>
              <p class="settings-description">
                Wenn deaktiviert, werden keine Daten lokal im Browser
                gespeichert
              </p>
            </div>

            <div class="settings-form-group">
              <label class="settings-toggle">
                <span class="settings-toggle-label"
                  >Telemetrie-Daten senden</span
                >
                <div class="toggle-control">
                  <input
                    type="checkbox"
                    v-model="settings.privacy.sendTelemetry"
                    @change="updateSettings"
                  />
                  <span class="toggle-switch"></span>
                </div>
              </label>
              <p class="settings-description">
                Anonymisierte Nutzungsdaten senden, um den DMS Assistant zu
                verbessern
              </p>
            </div>

            <div class="danger-zone">
              <h4>Gefahrenzone</h4>
              <button class="settings-btn-danger" @click="confirmClearData">
                Alle lokalen Daten löschen
              </button>
              <p class="settings-description">
                Löscht alle lokal gespeicherten Konversationen und
                Einstellungen. Diese Aktion kann nicht rückgängig gemacht
                werden.
              </p>
            </div>
          </div>

          <!-- Über-Abschnitt -->
          <div v-if="activeTab === 'about'" class="settings-section">
            <h3 class="settings-section-title">Über</h3>

            <div class="about-info">
              <img
                src="/assets/images/senmvku-logo.png"
                alt="nscale Logo"
                class="about-logo"
              />
              <h2>nscale DMS Assistant</h2>
              <p class="about-version">Version {{ version }}</p>
              <p class="about-build">Build {{ buildDate }}</p>

              <div class="about-links">
                <a href="#" @click.prevent="openDocumentation">Dokumentation</a>
                <a href="#" @click.prevent="openHelp">Hilfe</a>
                <a href="#" @click.prevent="openPrivacyPolicy">Datenschutz</a>
              </div>

              <p class="about-copyright">
                © {{ currentYear }} OPTIMAL SYSTEMS GmbH. Alle Rechte
                vorbehalten.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-dialog-footer">
        <button class="settings-btn-secondary" @click="closeDialog">
          Schließen
        </button>
        <button class="settings-btn-primary" @click="saveSettings">
          Übernehmen
        </button>
      </div>
    </div>

    <!-- Bestätigungsdialog für das Löschen aller Daten -->
    <div class="confirm-dialog" v-if="showConfirmDialog">
      <div class="confirm-dialog-backdrop" @click="cancelClearData"></div>
      <div class="confirm-dialog-container">
        <h3>Alle Daten löschen?</h3>
        <p>
          Sind Sie sicher, dass Sie alle lokal gespeicherten Daten löschen
          möchten? Diese Aktion kann nicht rückgängig gemacht werden.
        </p>
        <div class="confirm-dialog-actions">
          <button class="settings-btn-secondary" @click="cancelClearData">
            Abbrechen
          </button>
          <button class="settings-btn-danger" @click="clearAllData">
            Alle Daten löschen
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useSettings } from "@/composables/useSettings";
import { useLocalStorage } from "@/composables/useLocalStorage";

// Props
const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false,
  },
});

// Emits
const emit = defineEmits(["close", "update"]);

// Hooks
const { getSettings, saveSettings: saveSettingsToStore } = useSettings();
const { removeItem, clear } = useLocalStorage();

// State
const title = ref("Einstellungen");
const activeTab = ref("appearance");
const settings = ref({
  theme: "system",
  fontSize: 100,
  lineHeight: "1.5",
  notifications: {
    desktop: true,
    sound: true,
    soundType: "notification",
  },
  privacy: {
    saveHistory: true,
    localStorageEnabled: true,
    sendTelemetry: true,
  },
});
const tabs = [
  { id: "appearance", label: "Erscheinungsbild" },
  { id: "notifications", label: "Benachrichtigungen" },
  { id: "privacy", label: "Datenschutz" },
  { id: "about", label: "Über" },
];
const showConfirmDialog = ref(false);
const version = ref("1.0.0");
const buildDate = ref("20250511");
const currentYear = computed(() => new Date().getFullYear());

// Methoden
const closeDialog = () => {
  emit("close");
};

const setActiveTab = (tabId) => {
  activeTab.value = tabId;
};

const updateSettings = () => {
  applySettings(settings.value);
};

const saveSettings = () => {
  saveSettingsToStore(settings.value);
  emit("update", settings.value);
  closeDialog();
};

const applySettings = (newSettings) => {
  // Theme anwenden
  const theme =
    newSettings.theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : newSettings.theme;

  document.documentElement.classList.remove("theme-light", "theme-dark");
  document.documentElement.classList.add(`theme-${theme}`);

  // Schriftgröße anwenden
  document.documentElement.style.fontSize = `${newSettings.fontSize}%`;

  // Zeilenabstand anwenden
  document.body.style.lineHeight = newSettings.lineHeight;
};

const playSound = () => {
  const soundType = settings.value.notifications.soundType;
  const audio = new Audio(`/assets/sounds/${soundType}.mp3`);
  audio.play().catch((error) => {
    console.error("Fehler beim Abspielen des Sounds:", error);
  });
};

const confirmClearData = () => {
  showConfirmDialog.value = true;
};

const cancelClearData = () => {
  showConfirmDialog.value = false;
};

const clearAllData = () => {
  // Lokalen Speicher leeren
  clear();

  // Einstellungen zurücksetzen
  settings.value = {
    theme: "system",
    fontSize: 100,
    lineHeight: "1.5",
    notifications: {
      desktop: true,
      sound: true,
      soundType: "notification",
    },
    privacy: {
      saveHistory: true,
      localStorageEnabled: true,
      sendTelemetry: true,
    },
  };

  // Einstellungen anwenden
  applySettings(settings.value);

  // Dialog schließen
  showConfirmDialog.value = false;

  // Benachrichtigung anzeigen (in einer realen Anwendung)
  alert("Alle lokalen Daten wurden gelöscht.");
};

const openDocumentation = () => {
  window.open("/documentation", "_blank");
};

const openHelp = () => {
  window.open("/help", "_blank");
};

const openPrivacyPolicy = () => {
  window.open("/privacy", "_blank");
};

// Beim Öffnen die aktuellen Einstellungen laden
watch(
  () => props.isVisible,
  (newValue) => {
    if (newValue) {
      settings.value = { ...getSettings() };
    }
  },
);

onMounted(() => {
  // Version und Build-Informationen aus Konfiguration laden
  if (window.APP_CONFIG) {
    if (window.APP_CONFIG.buildVersion) {
      version.value = window.APP_CONFIG.buildVersion;
    }
    if (window.APP_CONFIG.buildTimestamp) {
      buildDate.value = window.APP_CONFIG.buildTimestamp;
    }
  }
});
</script>

<style scoped>
.settings-dialog {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.settings-dialog-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
}

.settings-dialog-container {
  position: relative;
  width: 800px;
  max-width: 90%;
  max-height: 90vh;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: dialogFadeIn 0.3s ease;
}

@keyframes dialogFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.settings-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background-color: var(--primary-color, #1976d2);
  color: white;
}

.settings-dialog-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 500;
}

.settings-dialog-close {
  background: none;
  border: none;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s;
}

.settings-dialog-close:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.settings-dialog-close .icon {
  font-size: 24px;
  line-height: 1;
}

.settings-dialog-content {
  flex: 1;
  overflow-y: auto;
  display: flex;
  overflow: hidden;
}

.settings-tabs {
  width: 200px;
  flex-shrink: 0;
  background-color: #f5f5f5;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  padding: 20px 0;
}

.settings-tab {
  padding: 12px 20px;
  text-align: left;
  background: none;
  border: none;
  font-size: 1rem;
  color: var(--text-primary, #333);
  cursor: pointer;
  transition: background-color 0.2s;
}

.settings-tab:hover {
  background-color: #e8e8e8;
}

.settings-tab.active {
  background-color: #e0e0e0;
  font-weight: 500;
  position: relative;
}

.settings-tab.active::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background-color: var(--primary-color, #1976d2);
}

.settings-panel {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.settings-section {
  margin-bottom: 30px;
}

.settings-section:last-child {
  margin-bottom: 0;
}

.settings-section-title {
  font-size: 1.2rem;
  font-weight: 500;
  margin-top: 0;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e0e0e0;
  color: var(--text-primary, #333);
}

.settings-form-group {
  margin-bottom: 20px;
}

.settings-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--text-primary, #333);
}

.settings-description {
  margin-top: 4px;
  font-size: 0.85rem;
  color: var(--text-secondary, #777);
}

.settings-option-group {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.settings-radio {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.settings-radio-label {
  user-select: none;
}

.settings-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.settings-toggle-label {
  font-weight: 500;
}

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

.toggle-switch {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.3s;
  border-radius: 24px;
}

.toggle-switch:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .toggle-switch {
  background-color: var(--primary-color, #1976d2);
}

input:checked + .toggle-switch:before {
  transform: translateX(22px);
}

.settings-select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  font-family: inherit;
  width: 100%;
  max-width: 300px;
}

.font-size-slider {
  display: flex;
  align-items: center;
  gap: 16px;
}

.font-size-slider input {
  flex: 1;
  -webkit-appearance: none;
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #ddd;
  outline: none;
}

.font-size-slider input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--primary-color, #1976d2);
  cursor: pointer;
}

.font-size-value {
  min-width: 45px;
  text-align: right;
}

.settings-btn-small {
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: #f5f5f5;
  font-size: 0.9rem;
  cursor: pointer;
  margin-top: 8px;
}

.settings-btn-small:hover {
  background-color: #e8e8e8;
}

.danger-zone {
  margin-top: 30px;
  padding: 16px;
  border: 1px solid #f44336;
  border-radius: 4px;
  background-color: #ffebee;
}

.danger-zone h4 {
  margin-top: 0;
  margin-bottom: 16px;
  color: #d32f2f;
}

.settings-btn-danger {
  padding: 8px 16px;
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
}

.settings-btn-danger:hover {
  background-color: #d32f2f;
}

.about-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 20px;
}

.about-logo {
  width: 120px;
  margin-bottom: 16px;
}

.about-version {
  margin: 4px 0;
  font-weight: 500;
}

.about-build {
  margin: 0 0 20px;
  font-size: 0.9rem;
  color: var(--text-secondary, #777);
}

.about-links {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.about-links a {
  color: var(--primary-color, #1976d2);
  text-decoration: none;
}

.about-links a:hover {
  text-decoration: underline;
}

.about-copyright {
  font-size: 0.85rem;
  color: var(--text-secondary, #777);
}

.settings-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  padding: 16px 20px;
  background-color: #f5f5f5;
  border-top: 1px solid #e0e0e0;
}

.settings-btn-primary {
  padding: 8px 16px;
  background-color: var(--primary-color, #1976d2);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
}

.settings-btn-primary:hover {
  background-color: var(--primary-color-dark, #1565c0);
}

.settings-btn-secondary {
  padding: 8px 16px;
  background-color: transparent;
  color: var(--text-primary, #333);
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
}

.settings-btn-secondary:hover {
  background-color: #e8e8e8;
}

.confirm-dialog {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
}

.confirm-dialog-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.3);
}

.confirm-dialog-container {
  position: relative;
  width: 400px;
  max-width: 90%;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  padding: 20px;
  z-index: 1;
  animation: dialogFadeIn 0.2s ease;
}

.confirm-dialog-container h3 {
  margin-top: 0;
  color: #d32f2f;
}

.confirm-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

@media (max-width: 768px) {
  .settings-dialog-content {
    flex-direction: column;
  }

  .settings-tabs {
    width: 100%;
    flex-direction: row;
    overflow-x: auto;
    padding: 0;
  }

  .settings-tab {
    padding: 12px 15px;
    white-space: nowrap;
  }

  .settings-tab.active::before {
    left: 0;
    right: 0;
    top: auto;
    bottom: 0;
    width: auto;
    height: 3px;
  }

  .settings-option-group {
    flex-direction: column;
    gap: 10px;
  }

  .settings-dialog-footer {
    flex-direction: column-reverse;
  }

  .settings-btn-primary,
  .settings-btn-secondary {
    width: 100%;
  }
}
</style>
