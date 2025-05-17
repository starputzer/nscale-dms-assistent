<template>
  <div class="accessibility-settings">
    <h3 class="accessibility-settings__title">
      {{ t("settings.accessibility.title", "Barrierefreiheitseinstellungen") }}
    </h3>

    <div class="accessibility-settings__section">
      <div class="accessibility-settings__toggle-container">
        <label class="accessibility-settings__toggle-label">
          {{
            t("settings.accessibility.reduceMotion", "Bewegungen reduzieren")
          }}
        </label>
        <div class="accessibility-settings__toggle">
          <input
            type="checkbox"
            id="a11y-reduce-motion"
            v-model="a11ySettings.reduceMotion"
            @change="updateSettings"
          />
          <label for="a11y-reduce-motion" class="toggle-switch">
            <span class="toggle-switch__slider"></span>
          </label>
        </div>
      </div>

      <p class="accessibility-settings__description">
        {{
          t(
            "settings.accessibility.reduceMotionDescription",
            "Reduziert oder entfernt Animationen und Bewegungen in der Anwendung.",
          )
        }}
      </p>
    </div>

    <div class="accessibility-settings__section">
      <div class="accessibility-settings__toggle-container">
        <label class="accessibility-settings__toggle-label">
          {{ t("settings.accessibility.highContrast", "Hoher Kontrast") }}
        </label>
        <div class="accessibility-settings__toggle">
          <input
            type="checkbox"
            id="a11y-high-contrast"
            v-model="a11ySettings.highContrast"
            @change="updateSettings"
          />
          <label for="a11y-high-contrast" class="toggle-switch">
            <span class="toggle-switch__slider"></span>
          </label>
        </div>
      </div>

      <p class="accessibility-settings__description">
        {{
          t(
            "settings.accessibility.highContrastDescription",
            "Erhöht den Kontrast für bessere Lesbarkeit.",
          )
        }}
      </p>

      <div
        class="accessibility-settings__preview"
        :class="{ 'high-contrast': a11ySettings.highContrast }"
      >
        <p class="accessibility-settings__preview-text">
          {{
            t(
              "settings.accessibility.contrastPreview",
              "Beispieltext mit aktuellem Kontrast",
            )
          }}
        </p>
        <div class="accessibility-settings__preview-elements">
          <button class="accessibility-settings__preview-button">
            {{ t("settings.accessibility.button", "Schaltfläche") }}
          </button>
          <div class="accessibility-settings__preview-link">
            {{ t("settings.accessibility.link", "Textlink") }}
          </div>
        </div>
      </div>
    </div>

    <div class="accessibility-settings__section">
      <div class="accessibility-settings__toggle-container">
        <label class="accessibility-settings__toggle-label">
          {{ t("settings.accessibility.largeText", "Größere Texte") }}
        </label>
        <div class="accessibility-settings__toggle">
          <input
            type="checkbox"
            id="a11y-large-text"
            v-model="a11ySettings.largeText"
            @change="updateSettings"
          />
          <label for="a11y-large-text" class="toggle-switch">
            <span class="toggle-switch__slider"></span>
          </label>
        </div>
      </div>

      <p class="accessibility-settings__description">
        {{
          t(
            "settings.accessibility.largeTextDescription",
            "Erhöht die Textgröße in der gesamten Anwendung.",
          )
        }}
      </p>

      <div
        class="accessibility-settings__preview"
        :class="{ 'large-text': a11ySettings.largeText }"
      >
        <p class="accessibility-settings__preview-text">
          {{
            t(
              "settings.accessibility.textSizePreview",
              "Beispieltext mit aktueller Größe",
            )
          }}
        </p>
      </div>
    </div>

    <div class="accessibility-settings__section">
      <div class="accessibility-settings__toggle-container">
        <label class="accessibility-settings__toggle-label">
          {{
            t(
              "settings.accessibility.screenReader",
              "Bildschirmleser-Unterstützung",
            )
          }}
        </label>
        <div class="accessibility-settings__toggle">
          <input
            type="checkbox"
            id="a11y-screen-reader"
            v-model="a11ySettings.screenReader"
            @change="updateSettings"
          />
          <label for="a11y-screen-reader" class="toggle-switch">
            <span class="toggle-switch__slider"></span>
          </label>
        </div>
      </div>

      <p class="accessibility-settings__description">
        {{
          t(
            "settings.accessibility.screenReaderDescription",
            "Verbessert die Kompatibilität mit Bildschirmlesern und Assistenztechnologien.",
          )
        }}
      </p>
    </div>

    <div class="accessibility-settings__section">
      <h4 class="accessibility-settings__subtitle">
        {{
          t("settings.accessibility.keyboardNavigation", "Tastaturnavigation")
        }}
      </h4>

      <div class="accessibility-settings__toggle-container">
        <label class="accessibility-settings__toggle-label">
          {{
            t(
              "settings.accessibility.keyboardShortcuts",
              "Tastenkürzel aktivieren",
            )
          }}
        </label>
        <div class="accessibility-settings__toggle">
          <input
            type="checkbox"
            id="a11y-keyboard-shortcuts"
            v-model="keyboardSettings.enableShortcuts"
            @change="updateKeyboardSettings"
          />
          <label for="a11y-keyboard-shortcuts" class="toggle-switch">
            <span class="toggle-switch__slider"></span>
          </label>
        </div>
      </div>

      <p class="accessibility-settings__description">
        {{
          t(
            "settings.accessibility.keyboardShortcutsDescription",
            "Aktiviert Tastenkürzel für schnellere Navigation und Bedienung.",
          )
        }}
      </p>

      <div
        v-if="keyboardSettings.enableShortcuts"
        class="accessibility-settings__keyboard-shortcuts"
      >
        <h5 class="accessibility-settings__shortcuts-title">
          {{
            t(
              "settings.accessibility.availableShortcuts",
              "Verfügbare Tastenkürzel",
            )
          }}
        </h5>

        <div class="accessibility-settings__shortcuts-list">
          <div class="accessibility-settings__shortcut-item">
            <div class="accessibility-settings__shortcut-keys">
              <span class="accessibility-settings__key">Esc</span>
            </div>
            <div class="accessibility-settings__shortcut-description">
              {{
                t(
                  "settings.accessibility.escDescription",
                  "Aktuelle Aktion abbrechen oder Dialog schließen",
                )
              }}
            </div>
          </div>

          <div class="accessibility-settings__shortcut-item">
            <div class="accessibility-settings__shortcut-keys">
              <span class="accessibility-settings__key">Ctrl</span>
              <span class="accessibility-settings__key-plus">+</span>
              <span class="accessibility-settings__key">S</span>
            </div>
            <div class="accessibility-settings__shortcut-description">
              {{
                t(
                  "settings.accessibility.saveDescription",
                  "Einstellungen speichern",
                )
              }}
            </div>
          </div>

          <div class="accessibility-settings__shortcut-item">
            <div class="accessibility-settings__shortcut-keys">
              <span class="accessibility-settings__key">Alt</span>
              <span class="accessibility-settings__key-plus">+</span>
              <span class="accessibility-settings__key">1-4</span>
            </div>
            <div class="accessibility-settings__shortcut-description">
              {{
                t(
                  "settings.accessibility.tabsDescription",
                  "Zwischen Einstellungskategorien wechseln",
                )
              }}
            </div>
          </div>

          <div class="accessibility-settings__shortcut-item">
            <div class="accessibility-settings__shortcut-keys">
              <span class="accessibility-settings__key">Tab</span>
            </div>
            <div class="accessibility-settings__shortcut-description">
              {{
                t(
                  "settings.accessibility.tabDescription",
                  "Zum nächsten interaktiven Element navigieren",
                )
              }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="accessibility-settings__section">
      <h4 class="accessibility-settings__subtitle">
        {{ t("settings.accessibility.focusIndicators", "Fokusanzeigen") }}
      </h4>

      <div class="accessibility-settings__toggle-container">
        <label class="accessibility-settings__toggle-label">
          {{
            t(
              "settings.accessibility.enhancedFocus",
              "Verbesserte Fokusanzeige",
            )
          }}
        </label>
        <div class="accessibility-settings__toggle">
          <input
            type="checkbox"
            id="a11y-enhanced-focus"
            v-model="a11ySettings.enhancedFocus"
            @change="updateSettings"
          />
          <label for="a11y-enhanced-focus" class="toggle-switch">
            <span class="toggle-switch__slider"></span>
          </label>
        </div>
      </div>

      <p class="accessibility-settings__description">
        {{
          t(
            "settings.accessibility.enhancedFocusDescription",
            "Zeigt einen deutlicheren Fokusrahmen um das aktive Element.",
          )
        }}
      </p>

      <div class="accessibility-settings__focus-preview">
        <button
          class="accessibility-settings__focus-button"
          :class="{ 'enhanced-focus': a11ySettings.enhancedFocus }"
        >
          {{
            t("settings.accessibility.focusExample", "Beispiel für Fokusrahmen")
          }}
        </button>
        <p class="accessibility-settings__focus-hint">
          {{
            t(
              "settings.accessibility.focusHint",
              "Klicken Sie die Schaltfläche an und drücken Sie Tab, um den Fokuseffekt zu sehen.",
            )
          }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useSettingsStore } from "@/stores/settings";
import type { A11ySettings } from "@/types/settings";

// Emits
const emit = defineEmits<{
  (
    e: "apply-settings",
    category: string,
    settings: Partial<A11ySettings>,
  ): void;
  (e: "reset"): void;
}>();

// Services
const { t } = useI18n();
const settingsStore = useSettingsStore();

// State
const a11ySettings = reactive<A11ySettings & { enhancedFocus?: boolean }>({
  ...settingsStore.a11y,
  enhancedFocus: false, // Erweiterung der A11ySettings
});

// Tastatureinstellungen (nicht im Store vorhanden, könnte später hinzugefügt werden)
const keyboardSettings = reactive({
  enableShortcuts: true,
});

// Methoden
function updateSettings() {
  // Senden der Standardeinstellungen ohne die Erweiterung
  const standardSettings: A11ySettings = {
    reduceMotion: a11ySettings.reduceMotion,
    highContrast: a11ySettings.highContrast,
    largeText: a11ySettings.largeText,
    screenReader: a11ySettings.screenReader,
  };

  emit("apply-settings", "accessibility", standardSettings);

  // Zusätzlich die erweiterte Fokus-Einstellung anwenden
  applyEnhancedFocus();
}

function updateKeyboardSettings() {
  // Tastaturkürzel aktivieren/deaktivieren
  if (typeof window !== "undefined") {
    if (keyboardSettings.enableShortcuts) {
      document.documentElement.classList.add("keyboard-shortcuts-enabled");
    } else {
      document.documentElement.classList.remove("keyboard-shortcuts-enabled");
    }

    // Tastatureinstellungen im localStorage speichern
    localStorage.setItem("keyboard-settings", JSON.stringify(keyboardSettings));
  }
}

function applyEnhancedFocus() {
  // Verbesserte Fokusanzeige ein-/ausschalten
  if (typeof window !== "undefined") {
    if (a11ySettings.enhancedFocus) {
      document.documentElement.classList.add("enhanced-focus-enabled");
    } else {
      document.documentElement.classList.remove("enhanced-focus-enabled");
    }
  }
}

// Zustand zurücksetzen, wenn sich die Store-Daten ändern
function resetState() {
  // Standard A11ySettings aus dem Store übernehmen
  a11ySettings.reduceMotion = settingsStore.a11y.reduceMotion;
  a11ySettings.highContrast = settingsStore.a11y.highContrast;
  a11ySettings.largeText = settingsStore.a11y.largeText;
  a11ySettings.screenReader = settingsStore.a11y.screenReader;

  // Zusätzliche Einstellungen aus dem localStorage laden
  try {
    // Enhanced Focus
    a11ySettings.enhancedFocus =
      localStorage.getItem("enhanced-focus") === "true";

    // Keyboard settings
    const savedKeyboardSettings = localStorage.getItem("keyboard-settings");
    if (savedKeyboardSettings) {
      Object.assign(keyboardSettings, JSON.parse(savedKeyboardSettings));
    }
  } catch (error) {
    console.error("Fehler beim Laden der erweiterten Einstellungen:", error);
  }
}

// Lifecycle Hooks
onMounted(() => {
  resetState();
  applyEnhancedFocus();
});

// Watch für externe Änderungen am Store
watch(
  () => settingsStore.a11y,
  () => {
    resetState();
  },
  { deep: true },
);
</script>

<style scoped>
.accessibility-settings {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.accessibility-settings__title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  color: var(--n-color-text-primary);
}

.accessibility-settings__subtitle {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.75rem 0;
  color: var(--n-color-text-primary);
}

.accessibility-settings__section {
  background-color: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.accessibility-settings__toggle-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.accessibility-settings__toggle-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--n-color-text-primary);
}

.accessibility-settings__description {
  font-size: 0.75rem;
  color: var(--n-color-text-secondary);
  margin: 0;
  line-height: 1.5;
}

/* Toggle Switch Styles */
.accessibility-settings__toggle {
  position: relative;
}

.accessibility-settings__toggle input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}

.toggle-switch {
  display: inline-block;
  width: 42px;
  height: 24px;
  position: relative;
  cursor: pointer;
}

.toggle-switch__slider {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--n-color-border);
  border-radius: 24px;
  transition: 0.3s;
}

.toggle-switch__slider::before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  border-radius: 50%;
  transition: 0.3s;
}

input:checked + .toggle-switch .toggle-switch__slider {
  background-color: var(--n-color-primary);
}

input:checked + .toggle-switch .toggle-switch__slider::before {
  transform: translateX(18px);
}

/* Preview Components */
.accessibility-settings__preview {
  background-color: var(--n-color-background);
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  padding: 1rem;
  margin-top: 0.5rem;
}

.accessibility-settings__preview.high-contrast {
  --contrast-text: #000000;
  --contrast-background: #ffffff;
  --contrast-primary: #0000cc;

  background-color: var(--contrast-background);
  color: var(--contrast-text);
  border-color: #000000;
}

.accessibility-settings__preview.large-text {
  font-size: 1.25rem;
}

.accessibility-settings__preview-text {
  margin: 0 0 1rem 0;
  line-height: 1.5;
}

.accessibility-settings__preview-elements {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.accessibility-settings__preview-button {
  padding: 0.5rem 1rem;
  background-color: var(--n-color-primary);
  color: white;
  border: none;
  border-radius: var(--n-border-radius);
  cursor: pointer;
}

.high-contrast .accessibility-settings__preview-button {
  background-color: var(--contrast-primary);
  color: white;
  outline: 2px solid #000000;
}

.accessibility-settings__preview-link {
  color: var(--n-color-primary);
  cursor: pointer;
  text-decoration: underline;
}

.high-contrast .accessibility-settings__preview-link {
  color: var(--contrast-primary);
  font-weight: bold;
}

/* Keyboard Shortcuts */
.accessibility-settings__keyboard-shortcuts {
  background-color: var(--n-color-background);
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  padding: 1rem;
  margin-top: 0.5rem;
}

.accessibility-settings__shortcuts-title {
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0 0 0.75rem 0;
  color: var(--n-color-text-primary);
}

.accessibility-settings__shortcuts-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.accessibility-settings__shortcut-item {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.accessibility-settings__shortcut-keys {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 100px;
}

.accessibility-settings__key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 28px;
  padding: 0 0.5rem;
  background-color: var(--n-color-background-alt);
  border: 1px solid var(--n-color-border);
  border-radius: 4px;
  box-shadow: 0 2px 0 var(--n-color-border);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--n-color-text-primary);
}

.accessibility-settings__key-plus {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--n-color-text-secondary);
}

.accessibility-settings__shortcut-description {
  font-size: 0.75rem;
  color: var(--n-color-text-primary);
}

/* Focus Preview */
.accessibility-settings__focus-preview {
  margin-top: 0.5rem;
}

.accessibility-settings__focus-button {
  padding: 0.5rem 1rem;
  background-color: var(--n-color-background);
  color: var(--n-color-text-primary);
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  cursor: pointer;
  transition: all 0.2s;
}

.accessibility-settings__focus-button:focus {
  outline: 2px solid var(--n-color-primary);
  outline-offset: 2px;
}

.accessibility-settings__focus-button.enhanced-focus:focus {
  outline: 3px solid var(--n-color-primary);
  outline-offset: 3px;
  box-shadow: 0 0 0 5px rgba(59, 130, 246, 0.3);
}

.accessibility-settings__focus-hint {
  font-size: 0.75rem;
  color: var(--n-color-text-secondary);
  margin: 0.5rem 0 0 0;
  font-style: italic;
}

/* Responsive Anpassungen */
@media (max-width: 480px) {
  .accessibility-settings__toggle-container {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .accessibility-settings__toggle {
    align-self: flex-start;
  }

  .accessibility-settings__shortcut-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .accessibility-settings__shortcut-keys {
    margin-bottom: 0.25rem;
  }
}
</style>
