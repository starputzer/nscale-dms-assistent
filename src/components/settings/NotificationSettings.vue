<template>
  <div class="notification-settings">
    <h3 class="notification-settings__title">{{ t('settings.notifications.title', 'Benachrichtigungseinstellungen') }}</h3>
    
    <div class="notification-settings__section">
      <div class="notification-settings__toggle-container">
        <label class="notification-settings__toggle-label">
          {{ t('settings.notifications.enabled', 'Benachrichtigungen aktivieren') }}
        </label>
        <div class="notification-settings__toggle">
          <input
            type="checkbox"
            id="notifications-enabled"
            v-model="notificationSettings.enabled"
            @change="updateSettings"
          />
          <label for="notifications-enabled" class="toggle-switch">
            <span class="toggle-switch__slider"></span>
          </label>
        </div>
      </div>
      
      <p class="notification-settings__description">
        {{ t('settings.notifications.enabledDescription', 'Aktivieren oder deaktivieren Sie alle Benachrichtigungen im System.') }}
      </p>
    </div>

    <div class="notification-settings__section" v-if="notificationSettings.enabled">
      <h4 class="notification-settings__subtitle">
        {{ t('settings.notifications.channels', 'Benachrichtigungskanäle') }}
      </h4>
      
      <div class="notification-settings__toggle-container">
        <label class="notification-settings__toggle-label">
          {{ t('settings.notifications.sound', 'Ton-Benachrichtigungen') }}
        </label>
        <div class="notification-settings__toggle">
          <input
            type="checkbox"
            id="notifications-sound"
            v-model="notificationSettings.sound"
            @change="updateSettings"
          />
          <label for="notifications-sound" class="toggle-switch">
            <span class="toggle-switch__slider"></span>
          </label>
        </div>
      </div>
      
      <div class="notification-settings__toggle-container">
        <label class="notification-settings__toggle-label">
          {{ t('settings.notifications.desktop', 'Desktop-Benachrichtigungen') }}
          <span 
            v-if="notificationSettings.desktop && !desktopPermissionGranted" 
            class="notification-settings__warning"
          >
            <i class="fas fa-exclamation-triangle"></i>
            {{ t('settings.notifications.permissionRequired', 'Berechtigung erforderlich') }}
          </span>
        </label>
        <div class="notification-settings__toggle">
          <input
            type="checkbox"
            id="notifications-desktop"
            v-model="notificationSettings.desktop"
            @change="handleDesktopToggle"
          />
          <label for="notifications-desktop" class="toggle-switch">
            <span class="toggle-switch__slider"></span>
          </label>
        </div>
      </div>
      
      <button 
        v-if="notificationSettings.desktop && !desktopPermissionGranted" 
        class="notification-settings__permission-button"
        @click="requestPermission"
      >
        {{ t('settings.notifications.requestPermission', 'Berechtigung anfordern') }}
      </button>
      
      <p v-if="notificationSettings.desktop" class="notification-settings__description">
        {{ t('settings.notifications.desktopDescription', 'Desktop-Benachrichtigungen erscheinen auch, wenn die Anwendung minimiert oder in einem anderen Tab geöffnet ist.') }}
      </p>
    </div>
    
    <div class="notification-settings__section" v-if="notificationSettings.enabled">
      <h4 class="notification-settings__subtitle">
        {{ t('settings.notifications.events', 'Benachrichtigungsereignisse') }}
      </h4>
      
      <div class="notification-settings__toggle-container">
        <label class="notification-settings__toggle-label">
          {{ t('settings.notifications.sessionCompletion', 'Session-Abschluss') }}
        </label>
        <div class="notification-settings__toggle">
          <input
            type="checkbox"
            id="notifications-session-completion"
            v-model="notificationSettings.sessionCompletion"
            @change="updateSettings"
          />
          <label for="notifications-session-completion" class="toggle-switch">
            <span class="toggle-switch__slider"></span>
          </label>
        </div>
      </div>
      
      <p class="notification-settings__description">
        {{ t('settings.notifications.sessionCompletionDescription', 'Benachrichtigung, wenn eine laufende Session abgeschlossen wurde.') }}
      </p>
      
      <div class="notification-settings__toggle-container">
        <label class="notification-settings__toggle-label">
          {{ t('settings.notifications.mentions', 'Erwähnungen') }}
        </label>
        <div class="notification-settings__toggle">
          <input
            type="checkbox"
            id="notifications-mentions"
            v-model="notificationSettings.mentions"
            @change="updateSettings"
          />
          <label for="notifications-mentions" class="toggle-switch">
            <span class="toggle-switch__slider"></span>
          </label>
        </div>
      </div>
      
      <p class="notification-settings__description">
        {{ t('settings.notifications.mentionsDescription', 'Benachrichtigung, wenn Sie in einer Nachricht erwähnt werden.') }}
      </p>
    </div>
    
    <div class="notification-settings__test-section" v-if="notificationSettings.enabled">
      <h4 class="notification-settings__subtitle">
        {{ t('settings.notifications.test', 'Benachrichtigungen testen') }}
      </h4>
      
      <button 
        class="notification-settings__test-button"
        @click="sendTestNotification"
      >
        <i class="fas fa-bell"></i>
        {{ t('settings.notifications.sendTest', 'Test-Benachrichtigung senden') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSettingsStore } from '@/stores/settings';
import type { NotificationSettings } from '@/types/settings';

// Emits
const emit = defineEmits<{
  (e: 'apply-settings', category: string, settings: Partial<NotificationSettings>): void;
  (e: 'reset'): void;
}>();

// Services
const { t } = useI18n();
const settingsStore = useSettingsStore();

// State
const notificationSettings = reactive<NotificationSettings>({ ...settingsStore.notifications });
const desktopPermissionGranted = ref(false);

// Methods
function updateSettings() {
  emit('apply-settings', 'notifications', { ...notificationSettings });
}

async function handleDesktopToggle() {
  if (notificationSettings.desktop) {
    const permissionGranted = await requestPermission();
    if (!permissionGranted) {
      notificationSettings.desktop = false;
    }
  }
  
  updateSettings();
}

async function requestPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Dieser Browser unterstützt keine Benachrichtigungen');
    desktopPermissionGranted.value = false;
    return false;
  }
  
  try {
    if (Notification.permission === 'granted') {
      desktopPermissionGranted.value = true;
      return true;
    } 
    
    const permission = await Notification.requestPermission();
    desktopPermissionGranted.value = permission === 'granted';
    return desktopPermissionGranted.value;
  } catch (error) {
    console.error('Fehler beim Anfordern der Benachrichtigungsberechtigung:', error);
    desktopPermissionGranted.value = false;
    return false;
  }
}

function sendTestNotification() {
  // Sound-Benachrichtigung
  if (notificationSettings.sound) {
    const audio = new Audio('/assets/sounds/notification.mp3');
    audio.play().catch(err => console.error('Fehler beim Abspielen des Sounds:', err));
  }
  
  // Desktop-Benachrichtigung
  if (notificationSettings.desktop && desktopPermissionGranted.value) {
    try {
      const notification = new Notification(
        t('settings.notifications.testTitle', 'Test-Benachrichtigung'),
        {
          body: t('settings.notifications.testBody', 'Dies ist eine Test-Benachrichtigung aus den Einstellungen.'),
          icon: '/assets/images/notification-icon.png',
        }
      );
      
      notification.onclick = function() {
        window.focus();
        notification.close();
      };
      
      // Automatisch nach 5 Sekunden schließen
      setTimeout(() => notification.close(), 5000);
    } catch (error) {
      console.error('Fehler beim Senden der Testbenachrichtigung:', error);
    }
  }
  
  // In-App-Benachrichtigung (Fallback, wenn keine anderen aktiviert)
  if (!notificationSettings.desktop && !notificationSettings.sound) {
    alert(t('settings.notifications.testFallback', 'Dies ist eine Test-Benachrichtigung. Aktivieren Sie Desktop- oder Tonbenachrichtigungen für eine bessere Erfahrung.'));
  }
}

// Zustand zurücksetzen, wenn sich die Store-Daten ändern
function resetState() {
  Object.assign(notificationSettings, settingsStore.notifications);
}

// Lifecycle Hooks
onMounted(async () => {
  // Prüfen, ob Desktop-Benachrichtigungen bereits genehmigt wurden
  if ('Notification' in window) {
    desktopPermissionGranted.value = Notification.permission === 'granted';
  }
});

// Watch für externe Änderungen am Store
watch(() => settingsStore.notifications, (newSettings) => {
  resetState();
}, { deep: true });
</script>

<style scoped>
.notification-settings {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.notification-settings__title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  color: var(--n-color-text-primary);
}

.notification-settings__section {
  background-color: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.notification-settings__subtitle {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: var(--n-color-text-primary);
}

.notification-settings__toggle-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.notification-settings__toggle-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--n-color-text-primary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.notification-settings__warning {
  font-size: 0.75rem;
  color: var(--n-color-warning);
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background-color: var(--n-color-warning-background);
  padding: 0.25rem 0.5rem;
  border-radius: 1rem;
}

.notification-settings__description {
  font-size: 0.75rem;
  color: var(--n-color-text-secondary);
  margin: 0;
  line-height: 1.5;
}

/* Toggle Switch Styles */
.notification-settings__toggle {
  position: relative;
}

.notification-settings__toggle input {
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

/* Buttons */
.notification-settings__permission-button,
.notification-settings__test-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: var(--n-border-radius);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  width: fit-content;
}

.notification-settings__permission-button {
  background-color: var(--n-color-warning-background);
  color: var(--n-color-warning);
  border: 1px solid var(--n-color-warning);
}

.notification-settings__permission-button:hover {
  background-color: var(--n-color-warning-background-hover);
}

.notification-settings__test-button {
  background-color: var(--n-color-secondary-background);
  color: var(--n-color-secondary);
  border: 1px solid var(--n-color-secondary-border);
}

.notification-settings__test-button:hover {
  background-color: var(--n-color-secondary-background-hover);
}

.notification-settings__test-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background-color: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
  margin-top: 1rem;
}

/* Responsive Anpassungen */
@media (max-width: 480px) {
  .notification-settings__toggle-container {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .notification-settings__toggle {
    align-self: flex-start;
  }
}
</style>