// src/components/doc-converter/DocConverterInitializer.vue
<template>
  <div class="doc-converter-initializer">
    <!-- Leerer Container, der nur zur Initialisierung dient -->
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>{{ loadingMessage }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useFeatureToggleStore } from '@/stores/featureToggleStore';

// Feature-Toggle Store verwenden
const featureStore = useFeatureToggleStore();

// Reaktive State-Variablen
const isLoading = ref(true);
const loadingMessage = ref('Dokumentenkonverter wird initialisiert...');
const vueTimeout = ref(null);

// Diese Funktion implementiert die Logik, die vorher im inline-Script war
function loadAppropriateImplementation() {
  const useNewUI = localStorage.getItem('useNewUI') === 'true';
  const useVueDocConverter = localStorage.getItem('feature_vueDocConverter') !== 'false';
  
  console.log('DocConverter Feature-Toggle:', { useNewUI, useVueDocConverter });
  
  if (useNewUI && useVueDocConverter) {
    // Vue.js-Implementierung laden
    console.log('Versuche Vue.js-Implementierung zu laden...');
    
    // UI-Zustand aktualisieren - Vue-Container anzeigen, klassischen Container ausblenden
    const vueContainer = document.getElementById('doc-converter-app');
    const classicContainer = document.getElementById('doc-converter-container');
    
    if (vueContainer) vueContainer.style.display = 'block';
    if (classicContainer) classicContainer.style.display = 'none';
    
    // Timeout für Fallback setzen
    vueTimeout.value = setTimeout(function() {
      console.warn('Vue.js-Implementierung konnte nicht geladen werden, wechsle zu Fallback');
      loadFallbackImplementation();
    }, 5000);
    
    // Vue-Komponente laden (optimierter Ansatz mit einheitlicher Quelle)
    const vueScript = document.createElement('script');
    
    // Primärer Pfad - direkt über das frontend/js/vue Verzeichnis
    vueScript.src = '/static/js/vue/doc-converter.js';
    vueScript.type = 'module';
    
    // Event-Handler für das Script
    vueScript.onload = function() {
      console.log('Vue.js-Implementierung erfolgreich geladen!');
      clearTimeout(vueTimeout.value);
      isLoading.value = false;
    };
    
    vueScript.onerror = function() {
      console.error('Fehler beim Laden der Vue.js-Implementierung');
      loadFallbackImplementation();
    };
    
    // Script zum DOM hinzufügen
    document.head.appendChild(vueScript);
  } else {
    // Klassische Implementierung verwenden
    loadFallbackImplementation();
  }
}

// Lädt die klassische Implementierung als Fallback
function loadFallbackImplementation() {
  console.log('Lade klassische DocConverter-Implementierung...');
  
  // UI-Zustand aktualisieren - klassischen Container anzeigen, Vue-Container ausblenden
  const vueContainer = document.getElementById('doc-converter-app');
  const classicContainer = document.getElementById('doc-converter-container');
  
  if (vueContainer) vueContainer.style.display = 'none';
  if (classicContainer) classicContainer.style.display = 'block';
  
  // Timeout des Vue-Containers löschen (falls existiert)
  if (vueTimeout.value) {
    clearTimeout(vueTimeout.value);
    vueTimeout.value = null;
  }
  
  // Klassisches Script laden (falls notwendig)
  if (!window.classicDocConverterInitialized) {
    loadingMessage.value = 'Klassische Implementierung wird geladen...';
    
    const classicScript = document.createElement('script');
    classicScript.src = '/static/js/doc-converter-fallback.js';
    
    classicScript.onload = function() {
      console.log('Klassische Implementierung erfolgreich geladen!');
      isLoading.value = false;
    };
    
    classicScript.onerror = function() {
      console.error('Fehler beim Laden der klassischen Implementierung');
      loadingMessage.value = 'Fehler beim Laden des Dokumentenkonverters';
      isLoading.value = false;
    };
    
    document.head.appendChild(classicScript);
  } else {
    console.log('Klassische Implementierung bereits initialisiert');
    isLoading.value = false;
  }
}

// Bei Komponenten-Montierung ausführen
onMounted(() => {
  console.log('DocConverter-Initializer wurde geladen');
  loadAppropriateImplementation();
});

// Bei Komponenten-Demontierung aufräumen
onUnmounted(() => {
  if (vueTimeout.value) {
    clearTimeout(vueTimeout.value);
    vueTimeout.value = null;
  }
});
</script>

<style scoped>
.doc-converter-initializer {
  width: 100%;
  height: 100%;
  min-height: 100px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  color: var(--nscale-gray-dark, #555);
}

.loading-spinner {
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top: 3px solid var(--nscale-primary, #00a3d9);
  width: 30px;
  height: 30px;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>