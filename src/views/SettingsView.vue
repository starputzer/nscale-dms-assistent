<template>
  <div class="settings-view">
    <div class="settings-header">
      <h1>Einstellungen</h1>
    </div>
    
    <div class="settings-content">
      <div class="settings-section">
        <h2>Erscheinungsbild</h2>
        <div class="setting-item">
          <label for="theme-select">Theme</label>
          <select id="theme-select" v-model="selectedTheme" @change="updateTheme">
            <option value="light">Hell</option>
            <option value="dark">Dunkel</option>
            <option value="system">System</option>
          </select>
        </div>
      </div>

      <div class="settings-section">
        <h2>Benachrichtigungen</h2>
        <div class="setting-item">
          <label>
            <input type="checkbox" v-model="notifications" />
            Desktop-Benachrichtigungen aktivieren
          </label>
        </div>
      </div>

      <div class="settings-section">
        <h2>Konto</h2>
        <div class="setting-item">
          <label>E-Mail</label>
          <div>{{ user?.email || 'Nicht verfügbar' }}</div>
        </div>
        <div class="setting-item">
          <label>Rolle</label>
          <div>{{ user?.role === 'admin' ? 'Administrator' : (user?.role || 'Benutzer') }}</div>
        </div>
      </div>

      <div class="settings-section">
        <h2>System</h2>
        <div class="setting-item">
          <label>Version</label>
          <div>1.0.0</div>
        </div>
        <div class="setting-item">
          <label>Browser</label>
          <div>{{ browserInfo }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'

const authStore = useAuthStore()
const themeStore = useThemeStore()

const selectedTheme = ref('system')
const notifications = ref(false)

const user = computed(() => authStore.user)

const browserInfo = computed(() => {
  if (typeof window === "undefined") return "Unknown";
  const userAgent = navigator.userAgent;
  
  if (userAgent.indexOf("Firefox") > -1) {
    return "Mozilla Firefox";
  } else if (userAgent.indexOf("Chrome") > -1 && userAgent.indexOf("Edg") === -1) {
    return "Google Chrome";
  } else if (userAgent.indexOf("Safari") > -1 && userAgent.indexOf("Chrome") === -1) {
    return "Safari";
  } else if (userAgent.indexOf("Edg") > -1) {
    return "Microsoft Edge";
  }
  
  return "Unknown";
})

const updateTheme = () => {
  if (themeStore?.setTheme) {
    themeStore.setTheme(selectedTheme.value)
  }
}

onMounted(() => {
  if (themeStore?.theme) {
    selectedTheme.value = themeStore.theme
  }
})
</script>

<style scoped>
.settings-view {
  padding: 24px;
  max-width: 800px;
  margin: 0 auto;
  height: 100%;
  overflow-y: auto;
}

.settings-header {
  margin-bottom: 32px;
}

.settings-header h1 {
  font-size: 32px;
  font-weight: 600;
  margin: 0;
  color: var(--nscale-text);
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.settings-section {
  background: var(--nscale-surface);
  border: 1px solid var(--nscale-border);
  border-radius: 8px;
  padding: 24px;
}

.settings-section h2 {
  font-size: 20px;
  font-weight: 500;
  margin: 0 0 16px 0;
  color: var(--nscale-text);
}

.setting-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid var(--nscale-border);
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-item label {
  font-weight: 500;
  color: var(--nscale-text);
  min-width: 150px;
}

.setting-item select {
  padding: 8px 12px;
  border: 1px solid var(--nscale-border);
  border-radius: 4px;
  background: var(--nscale-background);
  color: var(--nscale-text);
  font-size: 16px;
}

.setting-item input[type="checkbox"] {
  margin-right: 8px;
}

.setting-item > div {
  color: var(--nscale-text-secondary);
}
</style>