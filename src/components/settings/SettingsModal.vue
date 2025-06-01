<template>
  <div class="settings-modal">
    <div class="settings-modal__overlay" @click="$emit('close')"></div>
    <div class="settings-modal__content">
      <div class="settings-modal__header">
        <h2 class="settings-modal__title">Einstellungen</h2>
        <button
          class="settings-modal__close"
          @click="$emit('close')"
          aria-label="Schließen"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="settings-modal__body">
        <!-- Theme Settings -->
        <section class="settings-section">
          <ThemeSelector />
        </section>

        <!-- Language Settings -->
        <section class="settings-section">
          <h3 class="settings-section__title">Sprache</h3>
          <div class="settings-option">
            <label class="settings-option__label">
              Sprache auswählen
              <select v-model="language" class="settings-option__select">
                <option value="de">Deutsch</option>
                <option value="en">English</option>
              </select>
            </label>
          </div>
        </section>

        <!-- API Settings -->
        <section class="settings-section">
          <h3 class="settings-section__title">API-Einstellungen</h3>
          <div class="settings-option">
            <label class="settings-option__label">
              API-Schlüssel
              <input
                type="password"
                v-model="apiKey"
                class="settings-option__input"
                placeholder="API-Schlüssel eingeben"
              />
            </label>
          </div>
          <p class="settings-section__info">
            Der API-Schlüssel wird sicher in Ihrem Browser gespeichert.
          </p>
        </section>
      </div>

      <div class="settings-modal__footer">
        <button
          class="settings-modal__button settings-modal__button--secondary"
          @click="$emit('close')"
        >
          Abbrechen
        </button>
        <button
          class="settings-modal__button settings-modal__button--primary"
          @click="saveSettings"
        >
          Speichern
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useSettingsStore } from "@/stores/settings";
import ThemeSelector from "./ThemeSelector.vue";

const emit = defineEmits<{
  close: [];
}>();

const settingsStore = useSettingsStore();

const language = ref(settingsStore.language);
const apiKey = ref(settingsStore.apiKey);

const saveSettings = () => {
  // Theme is saved automatically by the ThemeSelector component
  settingsStore.setLanguage(language.value);
  settingsStore.setApiKey(apiKey.value);
  emit("close");
};
</script>

<style scoped>
.settings-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.settings-modal__overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: -1;
}

.settings-modal__content {
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  background: var(--background);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.settings-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px;
  border-bottom: 1px solid var(--border);
}

.settings-modal__title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  margin: 0;
}

.settings-modal__close {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: var(--radius-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-normal);
}

.settings-modal__close:hover {
  background: var(--button-hover);
  color: var(--text);
}

.settings-modal__close svg {
  width: 20px;
  height: 20px;
}

.settings-modal__body {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.settings-section {
  margin-bottom: 32px;
}

.settings-section:last-child {
  margin-bottom: 0;
}

.settings-section__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  margin: 0 0 16px 0;
}

.settings-section__info {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin: 8px 0 0 0;
}

.settings-option {
  margin-bottom: 16px;
}

.settings-option__label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--text);
}

.settings-option__select,
.settings-option__input {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  color: var(--text);
  font-size: var(--font-size-base);
  transition: all var(--transition-normal);
}

.settings-option__select:focus,
.settings-option__input:focus {
  outline: none;
  border-color: var(--primary);
}

.settings-modal__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 24px;
  border-top: 1px solid var(--border);
}

.settings-modal__button {
  padding: 8px 16px;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-normal);
}

.settings-modal__button--primary {
  background: var(--primary);
  color: white;
}

.settings-modal__button--primary:hover {
  background: var(--primary-hover);
}

.settings-modal__button--secondary {
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border);
}

.settings-modal__button--secondary:hover {
  background: var(--button-hover);
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .settings-modal__content {
    max-width: 100%;
    max-height: 100%;
    border-radius: 0;
  }
}
</style>
