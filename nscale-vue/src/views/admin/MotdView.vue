<template>
  <div class="admin-sub-view">
    <h1>{{ viewTitle }}</h1>
    <p>Hier können Sie die systeminterne Nachricht des Tages (MOTD) konfigurieren, die allen Benutzern angezeigt wird.</p>
    
    <div v-if="isLoading" class="loading-indicator">
      <i class="fas fa-spinner fa-spin"></i>
      <span>Lade MOTD-Konfiguration...</span>
    </div>
    
    <div v-else-if="errorMessage" class="error-message">
      <i class="fas fa-exclamation-triangle"></i>
      <span>{{ errorMessage }}</span>
      <button @click="loadMotdData" class="retry-button">
        <i class="fas fa-sync-alt"></i> Erneut versuchen
      </button>
    </div>
    
    <div v-else class="motd-management-container">
      <!-- MOTD Editor und Preview in einem Grid Layout -->
      <div class="motd-grid">
        <div class="editor-area">
          <MotdEditor :key="editorKey" />
        </div>
        <div class="preview-area">
          <MotdPreview :motd-config="motdConfig" />
        </div>
      </div>
      
      <!-- Zusätzliche Hinweise -->
      <div class="motd-help">
        <h3>
          <i class="fas fa-info-circle"></i>
          Hinweise zur MOTD-Konfiguration
        </h3>
        <ul>
          <li>Die MOTD wird allen Benutzern im System angezeigt.</li>
          <li>Sie können Markdown-Formatierung verwenden, um den Text zu gestalten.</li>
          <li>Ein guter MOTD enthält wichtige aktuelle Systeminformationen, Wartungshinweise oder Neuigkeiten.</li>
          <li>Beim Speichern wird die MOTD sofort für alle Benutzer sichtbar.</li>
          <li>Achten Sie auf eine angemessene Länge - die Nachricht sollte kurz und prägnant sein.</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useMotdStore } from '@/stores/motdStore';
import MotdEditor from '@/components/admin/motd/MotdEditor.vue';
import MotdPreview from '@/components/admin/motd/MotdPreview.vue';

// Store-Referenz
const motdStore = useMotdStore();

// Lokale Zustände
const isLoading = ref(true);
const errorMessage = ref('');
const editorKey = ref(0); // Wird verwendet, um den Editor neu zu mounten

// Titel für diese Ansicht
const viewTitle = 'MOTD-Konfiguration';

// Aktuelle MOTD-Konfiguration
const motdConfig = computed(() => motdStore.adminEdit);

// MOTD-Daten laden
const loadMotdData = async () => {
  isLoading.value = true;
  errorMessage.value = '';
  
  try {
    await motdStore.loadMotdForEditing();
    editorKey.value++; // Editor neu mounten
  } catch (error) {
    console.error('Fehler beim Laden der MOTD-Daten:', error);
    errorMessage.value = 'Die MOTD-Konfiguration konnte nicht geladen werden. Bitte versuchen Sie es später erneut.';
  } finally {
    isLoading.value = false;
  }
};

// Watcher für Store-Änderungen
let unsubscribe = null;

onMounted(() => {
  // MOTD-Daten laden
  loadMotdData();
  
  // Auf Store-Änderungen reagieren (z.B. wenn gespeichert wird)
  unsubscribe = motdStore.$subscribe((mutation, state) => {
    if (mutation.type === 'direct' && mutation.events.key === 'adminEdit') {
      // MOTD wurde im Store aktualisiert
      console.log('MOTD-Konfiguration wurde aktualisiert');
    }
  });
});

onUnmounted(() => {
  // Store-Subscription aufräumen
  if (unsubscribe) {
    unsubscribe();
  }
});
</script>

<style scoped>
.admin-sub-view {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  background-color: var(--nscale-gray-light, #f8f9fa);
  border-radius: 8px;
  border: 1px solid var(--nscale-gray-medium, #e0e3e8);
  color: var(--nscale-gray-dark, #4a5568);
  gap: 1rem;
}

.loading-indicator i {
  font-size: 1.5rem;
  color: #2d6da3;
}

.error-message {
  display: flex;
  align-items: center;
  padding: 1.5rem;
  background-color: #fee;
  border-left: 4px solid #d32f2f;
  color: #d32f2f;
  border-radius: 4px;
  margin: 1.5rem 0;
  gap: 1rem;
}

.error-message i {
  font-size: 1.5rem;
}

.retry-button {
  margin-left: auto;
  padding: 0.5rem 1rem;
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #555;
  transition: background-color 0.2s;
}

.retry-button:hover {
  background-color: #e0e0e0;
}

.motd-management-container {
  margin-top: 1.5rem;
}

.motd-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

@media (max-width: 1024px) {
  .motd-grid {
    grid-template-columns: 1fr;
  }
}

.motd-help {
  background-color: #e8f4fd;
  border-radius: 8px;
  padding: 1.5rem;
  margin-top: 2rem;
  border-left: 4px solid #2d6da3;
}

.motd-help h3 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0;
  color: #2d6da3;
  font-size: 1.1rem;
}

.motd-help ul {
  margin-top: 1rem;
  padding-left: 1.5rem;
}

.motd-help li {
  margin-bottom: 0.5rem;
}

.motd-help li:last-child {
  margin-bottom: 0;
}

/* Dark Mode Anpassungen */
:global(.theme-dark) .loading-indicator {
  background-color: #2a2a2a;
  border-color: #444;
  color: #e0e0e0;
}

:global(.theme-dark) .retry-button {
  background-color: #333;
  border-color: #555;
  color: #e0e0e0;
}

:global(.theme-dark) .retry-button:hover {
  background-color: #444;
}

:global(.theme-dark) .motd-help {
  background-color: #1a3f5f;
  border-left-color: #2d6da3;
  color: #e0e0e0;
}

:global(.theme-dark) .motd-help h3 {
  color: #90caf9;
}

/* Kontrast-Modus Anpassungen */
:global(.theme-contrast) .loading-indicator {
  background-color: #000;
  border: 2px solid #ffeb3b;
  color: #ffeb3b;
}

:global(.theme-contrast) .loading-indicator i {
  color: #ffeb3b;
}

:global(.theme-contrast) .retry-button {
  background-color: #000;
  border-color: #ffeb3b;
  color: #ffeb3b;
}

:global(.theme-contrast) .retry-button:hover {
  background-color: #333;
}

:global(.theme-contrast) .motd-help {
  background-color: #000;
  border: 2px solid #ffeb3b;
  color: #ffeb3b;
}

:global(.theme-contrast) .motd-help h3 {
  color: #ffeb3b;
}
</style>
