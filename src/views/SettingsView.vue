<template>
  <div class="settings-view">
    <main-layout>
      <template #header>
        <div class="settings-view__header">
          <h1 class="settings-view__title">{{ t('settings.title', 'Einstellungen') }}</h1>
          <button 
            class="settings-view__toggle-button"
            @click="toggleSettings"
            :aria-label="isSettingsPanelVisible ? 'Einstellungen schließen' : 'Einstellungen öffnen'"
          >
            <i :class="['fas', isSettingsPanelVisible ? 'fa-times' : 'fa-cog']" aria-hidden="true"></i>
            {{ isSettingsPanelVisible ? t('settings.close', 'Schließen') : t('settings.open', 'Einstellungen öffnen') }}
          </button>
        </div>
      </template>
      
      <template #default>
        <div class="settings-view__content">
          <div class="settings-view__info-panel">
            <div class="settings-view__info-card">
              <div class="settings-view__info-icon">
                <i class="fas fa-palette" aria-hidden="true"></i>
              </div>
              <div class="settings-view__info-details">
                <h2 class="settings-view__info-title">{{ t('settings.appearance.title', 'Erscheinungsbild') }}</h2>
                <p class="settings-view__info-description">
                  {{ t('settings.appearance.description', 'Passen Sie das Erscheinungsbild der Anwendung an, einschließlich Theme, Schriftart und -größe.') }}
                </p>
                <button 
                  class="settings-view__info-button"
                  @click="openSettingsCategory('appearance')"
                >
                  {{ t('settings.customize', 'Anpassen') }}
                </button>
              </div>
            </div>
            
            <div class="settings-view__info-card">
              <div class="settings-view__info-icon">
                <i class="fas fa-bell" aria-hidden="true"></i>
              </div>
              <div class="settings-view__info-details">
                <h2 class="settings-view__info-title">{{ t('settings.notifications.title', 'Benachrichtigungen') }}</h2>
                <p class="settings-view__info-description">
                  {{ t('settings.notifications.description', 'Konfigurieren Sie, wie und wann Sie Benachrichtigungen erhalten möchten.') }}
                </p>
                <button 
                  class="settings-view__info-button"
                  @click="openSettingsCategory('notifications')"
                >
                  {{ t('settings.customize', 'Anpassen') }}
                </button>
              </div>
            </div>
            
            <div class="settings-view__info-card">
              <div class="settings-view__info-icon">
                <i class="fas fa-shield-alt" aria-hidden="true"></i>
              </div>
              <div class="settings-view__info-details">
                <h2 class="settings-view__info-title">{{ t('settings.privacy.title', 'Datenschutz') }}</h2>
                <p class="settings-view__info-description">
                  {{ t('settings.privacy.description', 'Verwalten Sie Ihre Datenschutzeinstellungen und kontrollieren Sie, welche Daten gespeichert werden.') }}
                </p>
                <button 
                  class="settings-view__info-button"
                  @click="openSettingsCategory('privacy')"
                >
                  {{ t('settings.customize', 'Anpassen') }}
                </button>
              </div>
            </div>
            
            <div class="settings-view__info-card">
              <div class="settings-view__info-icon">
                <i class="fas fa-universal-access" aria-hidden="true"></i>
              </div>
              <div class="settings-view__info-details">
                <h2 class="settings-view__info-title">{{ t('settings.accessibility.title', 'Barrierefreiheit') }}</h2>
                <p class="settings-view__info-description">
                  {{ t('settings.accessibility.description', 'Optimieren Sie die Anwendung für bessere Zugänglichkeit und verbesserte Benutzererfahrung.') }}
                </p>
                <button 
                  class="settings-view__info-button"
                  @click="openSettingsCategory('accessibility')"
                >
                  {{ t('settings.customize', 'Anpassen') }}
                </button>
              </div>
            </div>
          </div>
          
          <div class="settings-view__system-info">
            <h2 class="settings-view__system-title">{{ t('settings.systemInfo', 'Systeminformationen') }}</h2>
            
            <div class="settings-view__system-details">
              <div class="settings-view__system-item">
                <span class="settings-view__system-label">{{ t('settings.version', 'Version') }}:</span>
                <span class="settings-view__system-value">{{ appVersion }}</span>
              </div>
              
              <div class="settings-view__system-item">
                <span class="settings-view__system-label">{{ t('settings.lastUpdate', 'Letztes Update') }}:</span>
                <span class="settings-view__system-value">{{ formatDate(lastUpdate) }}</span>
              </div>
              
              <div class="settings-view__system-item">
                <span class="settings-view__system-label">{{ t('settings.browser', 'Browser') }}:</span>
                <span class="settings-view__system-value">{{ browserInfo }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </main-layout>
    
    <settings-panel 
      :is-visible="isSettingsPanelVisible" 
      @close="closeSettings"
      @save="handleSettingsSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import MainLayout from '@/layouts/MainLayout.vue';
import SettingsPanel from '@/components/settings/SettingsPanel.vue';
import { useToast } from '@/composables/useToast';

// Services
const { t } = useI18n();
const { showToast } = useToast();

// State
const isSettingsPanelVisible = ref(false);
const settingsCategory = ref('appearance');
const appVersion = ref('1.0.0');
const lastUpdate = ref(Date.now() - 7 * 24 * 60 * 60 * 1000); // 1 Woche zurück als Beispiel

// Browserinformationen ermitteln
const browserInfo = computed(() => {
  if (typeof window === 'undefined') return 'Unknown';
  
  const userAgent = navigator.userAgent;
  let browserName = 'Unknown';
  let browserVersion = '';
  
  // Browser-Erkennung
  if (userAgent.indexOf('Firefox') > -1) {
    browserName = 'Mozilla Firefox';
    browserVersion = userAgent.match(/Firefox\/([0-9.]+)/)?.[1] || '';
  } else if (userAgent.indexOf('Chrome') > -1 && userAgent.indexOf('Edg') === -1) {
    browserName = 'Google Chrome';
    browserVersion = userAgent.match(/Chrome\/([0-9.]+)/)?.[1] || '';
  } else if (userAgent.indexOf('Safari') > -1 && userAgent.indexOf('Chrome') === -1) {
    browserName = 'Safari';
    browserVersion = userAgent.match(/Version\/([0-9.]+)/)?.[1] || '';
  } else if (userAgent.indexOf('Edg') > -1) {
    browserName = 'Microsoft Edge';
    browserVersion = userAgent.match(/Edg\/([0-9.]+)/)?.[1] || '';
  }
  
  return browserVersion ? `${browserName} ${browserVersion}` : browserName;
});

// Methoden
function toggleSettings() {
  isSettingsPanelVisible.value = !isSettingsPanelVisible.value;
}

function closeSettings() {
  isSettingsPanelVisible.value = false;
}

function openSettingsCategory(category: string) {
  settingsCategory.value = category;
  isSettingsPanelVisible.value = true;
  
  // Weitergabe der aktiven Kategorie an die SettingsPanel-Komponente
  // Dies erfordert eine Erweiterung der SettingsPanel-Komponente
  // Um die initiale Kategorie zu setzen
  // (In zukünftiger Implementierung)
}

function handleSettingsSaved() {
  showToast({
    type: 'success',
    title: t('settings.saveSuccess', 'Gespeichert'),
    message: t('settings.saveSuccessMessage', 'Ihre Einstellungen wurden erfolgreich gespeichert.')
  });
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(timestamp));
}

// Lebenszyklus-Hooks
onMounted(async () => {
  try {
    // Version aus der Umgebung oder API laden
    const response = await fetch('/api/system/info');
    if (response.ok) {
      const data = await response.json();
      appVersion.value = data.version || '1.0.0';
      lastUpdate.value = new Date(data.lastUpdate).getTime() || Date.now();
    }
  } catch (error) {
    console.error('Fehler beim Laden der Systeminformationen:', error);
  }
});
</script>

<style scoped>
.settings-view {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.settings-view__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 1rem;
}

.settings-view__title {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  color: var(--n-color-text-primary);
}

.settings-view__toggle-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: var(--n-border-radius);
  font-size: 0.875rem;
  font-weight: 500;
  background-color: var(--n-color-primary);
  color: var(--n-color-on-primary);
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;
}

.settings-view__toggle-button:hover {
  background-color: var(--n-color-primary-dark);
}

.settings-view__content {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.settings-view__info-panel {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.settings-view__info-card {
  display: flex;
  background-color: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
  padding: 1.5rem;
  box-shadow: var(--n-shadow-sm);
  transition: transform 0.2s, box-shadow 0.2s;
}

.settings-view__info-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--n-shadow-md);
}

.settings-view__info-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background-color: var(--n-color-primary-background);
  color: var(--n-color-primary);
  border-radius: 50%;
  margin-right: 1rem;
  flex-shrink: 0;
}

.settings-view__info-icon i {
  font-size: 1.25rem;
}

.settings-view__info-details {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.settings-view__info-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: var(--n-color-text-primary);
}

.settings-view__info-description {
  font-size: 0.875rem;
  color: var(--n-color-text-secondary);
  margin: 0 0 1rem 0;
  line-height: 1.5;
}

.settings-view__info-button {
  align-self: flex-start;
  padding: 0.5rem 1rem;
  background-color: var(--n-color-primary);
  color: var(--n-color-on-primary);
  border: none;
  border-radius: var(--n-border-radius);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.settings-view__info-button:hover {
  background-color: var(--n-color-primary-dark);
}

.settings-view__system-info {
  background-color: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
  padding: 1.5rem;
}

.settings-view__system-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  color: var(--n-color-text-primary);
}

.settings-view__system-details {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.settings-view__system-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.settings-view__system-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--n-color-text-primary);
}

.settings-view__system-value {
  font-size: 0.875rem;
  color: var(--n-color-text-secondary);
}

/* Responsive Anpassungen */
@media (max-width: 768px) {
  .settings-view__info-panel {
    grid-template-columns: 1fr;
  }
  
  .settings-view__system-details {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .settings-view__header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
    padding-bottom: 1rem;
  }
  
  .settings-view__toggle-button {
    width: 100%;
    justify-content: center;
  }
  
  .settings-view__info-card {
    flex-direction: column;
  }
  
  .settings-view__info-icon {
    margin: 0 0 1rem 0;
    align-self: center;
  }
}
</style>