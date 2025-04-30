<!-- layouts/AuthLayout.vue -->
<template>
  <div class="layout-auth">
    <!-- MOTD Banner -->
    <div 
      v-if="motd && motd.enabled && !motdDismissed && motd.display.showOnStartup" 
      class="motd-banner"
      :style="{
        backgroundColor: motd.style.backgroundColor,
        borderColor: motd.style.borderColor,
        color: motd.style.textColor,
        borderBottom: '1px solid ' + motd.style.borderColor
      }"
    >
      <div class="container mx-auto px-4 py-3 relative">
        <button 
          v-if="motd.display.dismissible" 
          @click="dismissMotd" 
          class="absolute top-2 right-4 font-bold"
          :style="{ color: motd.style.textColor }"
        >
          ×
        </button>
        <div v-html="formatMotdContent(motd.content)" class="motd-content"></div>
      </div>
    </div>
    
    <!-- Auth Content -->
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-logo">
          <img src="@/assets/images/senmvku-logo.png" alt="Berlin Logo" class="logo-image">
          <div class="logo-text">nscale DMS Assistent</div>
        </div>
        
        <!-- Main Content (Login/Register/etc.) -->
        <router-view />
        
        <!-- Footer -->
        <div class="auth-footer">
          <p class="copyright">© {{ currentYear }} nscale DMS Assistent</p>
          
          <div class="theme-toggle">
            <button 
              @click="cycleTheme" 
              class="theme-button" 
              :title="themeButtonTitle"
            >
              <font-awesome-icon :icon="themeIcon" />
            </button>
          </div>
        </div>
      </div>
      
      <!-- Feature Toggle für Entwicklungsmodus -->
      <UIToggle v-if="isDevMode" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { marked } from 'marked';
import { useMotdStore } from '@/stores/motdStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useFeatureToggleStore } from '@/stores/featureToggleStore';
import UIToggle from '@/components/dev/UIToggle.vue';

// Stores
const motdStore = useMotdStore();
const settingsStore = useSettingsStore();
const featureToggleStore = useFeatureToggleStore();

// Berechnete Eigenschaften
const motd = computed(() => motdStore.motd);
const motdDismissed = computed({
  get: () => motdStore.dismissed,
  set: (value) => motdStore.setDismissed(value)
});

const currentYear = computed(() => new Date().getFullYear());

const theme = computed(() => settingsStore.theme);
const themeIcon = computed(() => {
  switch(theme.value) {
    case 'dark': return 'moon';
    case 'contrast': return 'adjust';
    default: return 'sun'; // light theme
  }
});

const themeButtonTitle = computed(() => {
  switch(theme.value) {
    case 'dark': return 'Dunkelmodus aktiv - Klicken für Kontrastmodus';
    case 'contrast': return 'Kontrastmodus aktiv - Klicken für Hellmodus';
    default: return 'Hellmodus aktiv - Klicken für Dunkelmodus';
  }
});

// Entwicklermodus-Status
const isDevMode = computed(() => featureToggleStore.devMode);

// Methoden
const dismissMotd = () => {
  motdDismissed.value = true;
};

const formatMotdContent = (content) => {
  if (!content) return '';
  
  try {
    return marked(content);
  } catch (error) {
    console.error('Fehler beim Formatieren der MOTD:', error);
    return content;
  }
};

const cycleTheme = () => {
  // Wechsel zwischen den Themes (light -> dark -> contrast -> light)
  const themes = ['light', 'dark', 'contrast'];
  const currentIndex = themes.indexOf(theme.value);
  const nextIndex = (currentIndex + 1) % themes.length;
  settingsStore.setTheme(themes[nextIndex]);
};

// Lebenszyklus-Hooks
onMounted(() => {
  // MOTD laden
  if (!motd.value) {
    motdStore.loadMotd();
  }
  
  // Initialisiere Einstellungen (falls noch nicht geschehen)
  settingsStore.init();
});
</script>

<style scoped>
.layout-auth {
  min-height: 100vh;
  /* Alternative Berechnung für iOS Safari */
  min-height: calc(var(--vh, 1vh) * 100);
  display: flex;
  flex-direction: column;
}

.auth-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem 1rem;
  background-color: var(--nscale-gray-light);
}

.auth-card {
  width: 100%;
  max-width: 420px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  padding: 2rem;
  position: relative;
}

.auth-logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 2rem;
}

.logo-image {
  height: 48px;
  margin-bottom: 1rem;
}

.logo-text {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--nscale-primary);
  text-align: center;
}

.auth-footer {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--nscale-gray-medium);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.copyright {
  font-size: 0.85rem;
  color: var(--nscale-gray-dark);
}

.theme-button {
  background: none;
  border: none;
  font-size: 1.25rem;
  color: var(--nscale-gray-dark);
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
}

.theme-button:hover {
  background-color: var(--nscale-gray-light);
  color: var(--nscale-primary);
}

/* MOTD styles */
.motd-banner {
  width: 100%;
}

.motd-content {
  font-size: 0.95rem;
  line-height: 1.5;
}

.motd-content :deep(p) {
  margin-bottom: 0.75rem;
}

.motd-content :deep(p:last-child) {
  margin-bottom: 0;
}

.motd-content :deep(strong) {
  font-weight: 600;
}

.motd-content :deep(ul) {
  margin-left: 1.5rem;
  margin-bottom: 0.75rem;
  list-style-type: disc;
}

/* Dark Mode Anpassungen */
:global(.theme-dark) .auth-container {
  background-color: #121212;
}

:global(.theme-dark) .auth-card {
  background-color: #1e1e1e;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

:global(.theme-dark) .logo-text {
  color: #00c060;
}

:global(.theme-dark) .copyright {
  color: #aaa;
}

:global(.theme-dark) .theme-button {
  color: #aaa;
}

:global(.theme-dark) .theme-button:hover {
  background-color: #333;
  color: #00c060;
}

:global(.theme-dark) .auth-footer {
  border-top-color: #333;
}

/* Kontrast-Modus Anpassungen */
:global(.theme-contrast) .auth-container {
  background-color: #000000;
}

:global(.theme-contrast) .auth-card {
  background-color: #000000;
  border: 2px solid #ffeb3b;
  box-shadow: 0 4px 15px rgba(255, 235, 59, 0.2);
}

:global(.theme-contrast) .logo-text {
  color: #ffeb3b;
  font-weight: bold;
}

:global(.theme-contrast) .copyright {
  color: #ffeb3b;
}

:global(.theme-contrast) .theme-button {
  color: #ffeb3b;
}

:global(.theme-contrast) .theme-button:hover {
  background-color: #333300;
}

:global(.theme-contrast) .auth-footer {
  border-top-color: #ffeb3b;
}
</style>