<template>
  <!-- Exakt dieselbe Struktur wie im Original HTML -->
  <header class="nscale-header p-4 shadow-sm">
    <div class="container mx-auto flex justify-between items-center">
      <div class="flex items-center">
        <img src="/static/images/senmvku-logo.png" alt="Berlin Logo" class="h-12 mr-4">
        <div class="nscale-logo">nscale DMS Assistent</div>
      </div>
      
      <!-- Navigationsmenü - identische Klassen zum Original -->
      <div class="flex items-center space-x-4">
        <button 
          @click="$emit('new-session')" 
          class="nscale-btn-primary flex items-center">
          <i class="fas fa-plus mr-2"></i>
          Neue Unterhaltung
        </button>

        <!-- Admin-Konfigurationsbutton, nur für Admins sichtbar -->
        <button 
          v-if="userRole === 'admin'"
          @click="toggleView" 
          class="nscale-btn-secondary flex items-center"
          title="Systemadministration">
          <i class="fas fa-cog mr-2"></i>
          <span class="hidden md:inline">Administration</span>
        </button>

        <button 
          @click="$emit('logout')" 
          class="nscale-btn-secondary flex items-center">
          <i class="fas fa-sign-out-alt mr-2"></i>
          Abmelden
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useFeatureToggleStore } from '@/stores/featureToggleStore';

// Props
const props = defineProps({
  userRole: {
    type: String,
    default: 'user'
  },
  activeView: {
    type: String,
    default: 'chat'
  }
});

// Emits
const emit = defineEmits(['update:activeView', 'new-session', 'logout']);

// Feature-Toggle Store
const featureStore = useFeatureToggleStore();
const vueHeaderEnabled = ref(featureStore.isEnabled('vueHeader'));
const fallbackLoaded = ref(false);
const headerInitialized = ref(false);

// Methoden
const toggleView = () => {
  const newView = props.activeView === 'chat' ? 'admin' : 'chat';
  emit('update:activeView', newView);
};

// Fallback-Mechanismus
function loadFallbackHeader() {
  // Verstecke Vue-Version
  const vueHeader = document.querySelector('.vue-header');
  if (vueHeader) vueHeader.style.display = 'none';
  
  // Zeige klassische Version
  const classicHeader = document.querySelector('.classic-header');
  if (classicHeader) {
    classicHeader.style.display = 'block';
    fallbackLoaded.value = true;
  }
}

// Komponenten-Initialisierung
function setupVueHeader() {
  headerInitialized.value = true;
  console.log('Vue Header wurde erfolgreich initialisiert');
}

// Komponenten-Lifecycle-Hooks
onMounted(() => {
  if (!vueHeaderEnabled.value) {
    loadFallbackHeader();
    return;
  }
  
  // Vue-Header initialisieren
  try {
    setupVueHeader();
    
    // Fallback-Timer für Fehlerfall
    const fallbackTimer = setTimeout(() => {
      if (!headerInitialized.value) {
        console.warn('Vue Header konnte nicht initialisiert werden, Fallback wird geladen');
        loadFallbackHeader();
      }
    }, 3000);
    
    // Timer bei Erfolg löschen
    if (headerInitialized.value) {
      clearTimeout(fallbackTimer);
    }
  } catch (error) {
    console.error('Fehler bei der Initialisierung des Vue Headers:', error);
    loadFallbackHeader();
  }
});
</script>

<style>
/* Keine scoped Styles, um die globalen CSS-Klassen zu verwenden */
/* Die Styles werden aus den bestehenden CSS-Dateien geladen */
</style>