<template>
  <div class="settings-panel" :class="{ 'settings-panel--visible': isVisible }">
    <div class="settings-panel__container">
      <div class="settings-panel__header">
        <h2 class="settings-panel__title">{{ t('settings.title', 'Einstellungen') }}</h2>
        <button 
          class="settings-panel__close-button"
          @click="handleClose"
          aria-label="Einstellungen schließen"
        >
          <i class="fas fa-times" aria-hidden="true"></i>
        </button>
      </div>

      <div class="settings-panel__categories">
        <button 
          v-for="category in categories"
          :key="category.id"
          class="settings-panel__category-button"
          :class="{ 'settings-panel__category-button--active': activeCategory === category.id }"
          @click="activeCategory = category.id"
        >
          <i :class="['settings-panel__category-icon', 'fas', category.icon]" aria-hidden="true"></i>
          <span class="settings-panel__category-label">{{ category.label }}</span>
        </button>
      </div>

      <div class="settings-panel__content">
        <component 
          :is="activeCategoryComponent" 
          @apply-settings="handleApplySettings"
          @reset="handleReset"
        ></component>
      </div>

      <div class="settings-panel__footer">
        <button 
          v-if="settingsStore.hasUnsavedChanges"
          class="settings-panel__button settings-panel__button--secondary"
          @click="handleReset"
        >
          {{ t('settings.resetChanges', 'Änderungen zurücksetzen') }}
        </button>
        <button 
          v-if="settingsStore.hasUnsavedChanges"
          class="settings-panel__button settings-panel__button--primary"
          @click="handleSave"
          :disabled="settingsStore.isLoading"
        >
          <i v-if="settingsStore.isLoading" class="fas fa-spinner fa-spin" aria-hidden="true"></i>
          {{ t('settings.saveChanges', 'Änderungen speichern') }}
        </button>
        <span v-if="!settingsStore.hasUnsavedChanges && lastSaved" class="settings-panel__saved-indicator">
          {{ t('settings.lastSaved', 'Zuletzt gespeichert') }}: {{ formatDate(lastSaved) }}
        </span>
        <button 
          class="settings-panel__button settings-panel__button--text"
          @click="handleRestoreDefaults"
        >
          {{ t('settings.restoreDefaults', 'Standardeinstellungen wiederherstellen') }}
        </button>
      </div>
    </div>

    <!-- Bestätigungsdialog für Standardeinstellungen -->
    <dialog 
      ref="confirmDialog"
      class="settings-panel__dialog"
    >
      <div class="settings-panel__dialog-content">
        <h3 class="settings-panel__dialog-title">
          {{ t('settings.restoreDefaultsTitle', 'Standardeinstellungen wiederherstellen') }}
        </h3>
        <p class="settings-panel__dialog-message">
          {{ t('settings.restoreDefaultsMessage', 'Möchten Sie wirklich alle Einstellungen auf die Standardwerte zurücksetzen? Diese Aktion kann nicht rückgängig gemacht werden.') }}
        </p>
        <div class="settings-panel__dialog-actions">
          <button 
            @click="closeConfirmDialog" 
            class="settings-panel__button settings-panel__button--secondary"
          >
            {{ t('settings.cancel', 'Abbrechen') }}
          </button>
          <button 
            @click="confirmRestoreDefaults" 
            class="settings-panel__button settings-panel__button--primary"
          >
            {{ t('settings.confirm', 'Bestätigen') }}
          </button>
        </div>
      </div>
    </dialog>

    <div v-if="isVisible" class="settings-panel__backdrop" @click="handleClose"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, defineAsyncComponent } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSettingsStore } from '@/stores/settings';
import { useToast } from '@/composables/useToast';

// Asynchrones Laden der Unterkomponenten
const AppearanceSettings = defineAsyncComponent(() => import('./AppearanceSettings.vue'));
const NotificationSettings = defineAsyncComponent(() => import('./NotificationSettings.vue'));
const PrivacySettings = defineAsyncComponent(() => import('./PrivacySettings.vue'));
const AccessibilitySettings = defineAsyncComponent(() => import('./AccessibilitySettings.vue'));

// Props
interface SettingsPanelProps {
  isVisible: boolean;
}

const props = defineProps<SettingsPanelProps>();

// Emit Events
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save'): void;
}>();

// Store und Services
const settingsStore = useSettingsStore();
const { t } = useI18n();
const { showToast } = useToast();

// Refs
const confirmDialog = ref<HTMLDialogElement | null>(null);
const lastSaved = ref<number | null>(null);

// State
const activeCategory = ref('appearance');

// Kategorien-Konfiguration
const categories = [
  {
    id: 'appearance',
    label: t('settings.categories.appearance', 'Erscheinungsbild'),
    icon: 'fa-palette',
    component: AppearanceSettings
  },
  {
    id: 'notifications',
    label: t('settings.categories.notifications', 'Benachrichtigungen'),
    icon: 'fa-bell',
    component: NotificationSettings
  },
  {
    id: 'privacy',
    label: t('settings.categories.privacy', 'Datenschutz'),
    icon: 'fa-shield-alt',
    component: PrivacySettings
  },
  {
    id: 'accessibility',
    label: t('settings.categories.accessibility', 'Barrierefreiheit'),
    icon: 'fa-universal-access',
    component: AccessibilitySettings
  }
];

// Computed Properties
const activeCategoryComponent = computed(() => {
  const category = categories.find(c => c.id === activeCategory.value);
  return category ? category.component : null;
});

// Methoden
function handleClose() {
  // Wenn ungespeicherte Änderungen vorhanden sind, zeige Bestätigungsdialog
  if (settingsStore.hasUnsavedChanges) {
    // Hier könnte man einen Dialog anzeigen
    const confirmed = confirm(t('settings.unsavedChangesMessage', 'Es gibt ungespeicherte Änderungen. Möchten Sie wirklich schließen?'));
    if (!confirmed) return;
    
    // Änderungen zurücksetzen
    settingsStore.resetChanges();
  }
  
  emit('close');
}

async function handleSave() {
  try {
    const success = await settingsStore.saveSettings();
    
    if (success) {
      lastSaved.value = Date.now();
      
      showToast({
        type: 'success',
        title: t('settings.saveSuccess', 'Gespeichert'),
        message: t('settings.saveSuccessMessage', 'Ihre Einstellungen wurden erfolgreich gespeichert.')
      });
      
      emit('save');
    } else {
      showToast({
        type: 'error',
        title: t('settings.saveError', 'Fehler'),
        message: t('settings.saveErrorMessage', 'Ihre Einstellungen konnten nicht gespeichert werden.')
      });
    }
  } catch (error) {
    console.error('Error saving settings:', error);
    showToast({
      type: 'error',
      title: t('settings.saveError', 'Fehler'),
      message: t('settings.saveErrorMessage', 'Ihre Einstellungen konnten nicht gespeichert werden.')
    });
  }
}

function handleReset() {
  settingsStore.resetChanges();
  
  showToast({
    type: 'info',
    title: t('settings.resetSuccess', 'Zurückgesetzt'),
    message: t('settings.resetSuccessMessage', 'Ihre Änderungen wurden zurückgesetzt.')
  });
}

function handleRestoreDefaults() {
  if (confirmDialog.value) {
    confirmDialog.value.showModal();
  }
}

function closeConfirmDialog() {
  if (confirmDialog.value) {
    confirmDialog.value.close();
  }
}

async function confirmRestoreDefaults() {
  closeConfirmDialog();
  
  try {
    await settingsStore.resetToDefault();
    lastSaved.value = Date.now();
    
    showToast({
      type: 'success',
      title: t('settings.restoreDefaultsSuccess', 'Standardeinstellungen'),
      message: t('settings.restoreDefaultsSuccessMessage', 'Die Einstellungen wurden auf die Standardwerte zurückgesetzt.')
    });
  } catch (error) {
    console.error('Error restoring default settings:', error);
    showToast({
      type: 'error',
      title: t('settings.restoreDefaultsError', 'Fehler'),
      message: t('settings.restoreDefaultsErrorMessage', 'Die Standardeinstellungen konnten nicht wiederhergestellt werden.')
    });
  }
}

function handleApplySettings(category: string, settings: any) {
  switch (category) {
    case 'appearance':
      if (settings.theme) {
        settingsStore.setTheme(settings.theme);
      }
      if (settings.font) {
        settingsStore.updateFontSettings(settings.font);
      }
      break;
    case 'notifications':
      settingsStore.updateNotificationSettings(settings);
      break;
    case 'privacy':
      // Handle privacy settings
      break;
    case 'accessibility':
      settingsStore.updateA11ySettings(settings);
      break;
  }
}

function formatDate(timestamp: number | null): string {
  if (!timestamp) return '';
  
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(timestamp));
}

// Add/remove event listeners for escape key
function handleEscapeKey(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.isVisible) {
    handleClose();
  }
}

// Lifecycle hooks
onMounted(() => {
  document.addEventListener('keydown', handleEscapeKey);
  
  // Initialize settings from store
  settingsStore.initialize();
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscapeKey);
});
</script>

<style scoped>
.settings-panel {
  position: fixed;
  top: 0;
  right: -400px;
  width: 400px;
  height: 100vh;
  background-color: var(--n-color-background);
  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  transition: right 0.3s ease;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--n-color-border);
}

.settings-panel--visible {
  right: 0;
}

.settings-panel__container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.settings-panel__backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 999;
}

.settings-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--n-color-border);
}

.settings-panel__title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--n-color-text-primary);
}

.settings-panel__close-button {
  background: none;
  border: none;
  font-size: 1.25rem;
  color: var(--n-color-text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.settings-panel__close-button:hover {
  background-color: var(--n-color-hover);
  color: var(--n-color-text-primary);
}

.settings-panel__categories {
  display: flex;
  padding: 0.5rem;
  border-bottom: 1px solid var(--n-color-border);
  overflow-x: auto;
}

.settings-panel__category-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.75rem;
  background: none;
  border: none;
  border-radius: var(--n-border-radius);
  color: var(--n-color-text-primary);
  cursor: pointer;
  transition: background-color 0.2s;
  flex: 1;
  min-width: 80px;
}

.settings-panel__category-button:hover {
  background-color: var(--n-color-hover);
}

.settings-panel__category-button--active {
  background-color: var(--n-color-primary);
  color: var(--n-color-on-primary);
}

.settings-panel__category-icon {
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
}

.settings-panel__category-label {
  font-size: 0.75rem;
  white-space: nowrap;
}

.settings-panel__content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.settings-panel__footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  border-top: 1px solid var(--n-color-border);
  background-color: var(--n-color-background-alt);
}

.settings-panel__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: var(--n-border-radius);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.settings-panel__button--primary {
  background-color: var(--n-color-primary);
  color: var(--n-color-on-primary);
  border: 1px solid var(--n-color-primary);
}

.settings-panel__button--primary:hover {
  background-color: var(--n-color-primary-dark);
}

.settings-panel__button--secondary {
  background-color: var(--n-color-background);
  color: var(--n-color-text-primary);
  border: 1px solid var(--n-color-border);
}

.settings-panel__button--secondary:hover {
  background-color: var(--n-color-hover);
}

.settings-panel__button--text {
  background: none;
  border: none;
  color: var(--n-color-text-secondary);
  margin-right: auto;
  padding: 0.5rem;
}

.settings-panel__button--text:hover {
  color: var(--n-color-primary);
  text-decoration: underline;
}

.settings-panel__button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.settings-panel__saved-indicator {
  font-size: 0.75rem;
  color: var(--n-color-text-tertiary);
}

/* Dialog */
.settings-panel__dialog {
  padding: 0;
  border: none;
  border-radius: var(--n-border-radius);
  box-shadow: var(--n-shadow-lg);
  max-width: 400px;
  width: 90%;
}

.settings-panel__dialog::backdrop {
  background-color: rgba(0, 0, 0, 0.5);
}

.settings-panel__dialog-content {
  padding: 1.5rem;
}

.settings-panel__dialog-title {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--n-color-text-primary);
}

.settings-panel__dialog-message {
  margin: 0 0 1.5rem 0;
  color: var(--n-color-text-primary);
  line-height: 1.5;
}

.settings-panel__dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

/* Responsive Anpassungen für Mobilgeräte */
@media (max-width: 480px) {
  .settings-panel {
    width: 100%;
    right: -100%;
  }
}
</style>