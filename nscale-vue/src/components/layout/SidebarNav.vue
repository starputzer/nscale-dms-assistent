<template>
  <!-- Sessions Sidebar - Exakt dieselbe Struktur wie im Original HTML -->
  <aside class="nscale-sidebar w-80 p-4 rounded-l-lg shadow-sm overflow-y-auto">
    <h2 class="text-lg font-medium mb-6 text-gray-700">Unterhaltungen</h2>
    <ul class="space-y-2">
      <!-- Verbesserte Session-Items mit fester Breite und Ellipsis -->
      <li v-for="session in sessions" 
          :key="session.id" 
          @click="loadSession(session.id)"
          :class="['nscale-session-item cursor-pointer', 
          currentSessionId === session.id ? 'active' : '']">
        <!-- Titel-Container mit ellipsis für lange Texte -->
        <div class="session-title-container">
          <i class="fas fa-comment text-gray-500"></i>
          <span class="session-title">{{ session.title }}</span>
        </div>
        <!-- Spezieller Button zum Löschen, der immer sichtbar und erreichbar ist -->
        <button @click.stop="deleteSession(session.id)" 
            class="session-delete-button" 
            title="Unterhaltung löschen">
          <i class="fas fa-trash-alt"></i>
        </button>
      </li>
    </ul>
  </aside>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useFeatureToggleStore } from '@/stores/featureToggleStore';

// Props
const props = defineProps({
  sessions: {
    type: Array,
    default: () => []
  },
  currentSessionId: {
    type: String,
    default: null
  }
});

// Emits
const emit = defineEmits(['load-session', 'delete-session']);

// Reaktiver Zustand
const featureStore = useFeatureToggleStore();
const vueSidebarEnabled = ref(featureStore.isEnabled('vueSidebar'));
const sidebarInitialized = ref(false);

// Methoden
function loadSession(sessionId) {
  emit('load-session', sessionId);
}

function deleteSession(sessionId) {
  emit('delete-session', sessionId);
}

// Fallback-Mechanismus
function loadFallbackSidebar() {
  console.log('Lade Fallback-Sidebar-Implementierung...');
  
  // Vue-Sidebar ausblenden
  const vueSidebar = document.querySelector('.vue-sidebar-container');
  if (vueSidebar) vueSidebar.style.display = 'none';
  
  // Klassische Sidebar anzeigen
  const classicSidebar = document.querySelector('.classic-sidebar-container');
  if (classicSidebar) classicSidebar.style.display = 'block';
}

// Komponenten-Initialisierung
function setupVueSidebar() {
  sidebarInitialized.value = true;
  console.log('Vue Sidebar wurde erfolgreich initialisiert');
}

// Komponenten-Lifecycle-Hooks
onMounted(() => {
  if (!vueSidebarEnabled.value) {
    loadFallbackSidebar();
    return;
  }
  
  // Vue-Sidebar initialisieren
  try {
    setupVueSidebar();
    
    // Fallback-Timer für Fehlerfall
    const fallbackTimer = setTimeout(() => {
      if (!sidebarInitialized.value) {
        console.warn('Vue Sidebar konnte nicht initialisiert werden, Fallback wird geladen');
        loadFallbackSidebar();
      }
    }, 3000);
    
    // Timer bei Erfolg löschen
    if (sidebarInitialized.value) {
      clearTimeout(fallbackTimer);
    }
  } catch (error) {
    console.error('Fehler bei der Initialisierung der Vue Sidebar:', error);
    loadFallbackSidebar();
  }
});
</script>

<style>
/* Keine scoped Styles, um die globalen CSS-Klassen zu verwenden */

/* Aber wir fügen die wichtigsten Stile hier hinzu, falls die globalen CSS-Dateien nicht geladen werden */
.nscale-sidebar {
  background-color: white;
  border-right: 1px solid #f3f4f6;
}

.nscale-session-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-radius: 0.375rem;
  transition: background-color 0.2s;
  overflow: hidden;
}

.nscale-session-item:hover {
  background-color: #f3f4f6;
}

.nscale-session-item.active {
  background-color: #f0f9ff;
  border-left: 3px solid #2563eb;
}

.session-title-container {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: calc(100% - 2rem);
  overflow: hidden;
}

.session-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-delete-button {
  opacity: 0;
  transition: opacity 0.2s;
  color: #6b7280;
  padding: 0.25rem;
  border-radius: 0.25rem;
}

.nscale-session-item:hover .session-delete-button {
  opacity: 1;
}

.session-delete-button:hover {
  color: #ef4444;
  background-color: #fee2e2;
}

/* Dark Mode */
:global(.theme-dark) .nscale-sidebar {
  background-color: #1f2937;
  border-right-color: #374151;
}

:global(.theme-dark) .nscale-session-item:hover {
  background-color: #374151;
}

:global(.theme-dark) .nscale-session-item.active {
  background-color: #0f172a;
  border-left-color: #3b82f6;
}

/* Kontrast Mode */
:global(.theme-contrast) .nscale-sidebar {
  background-color: #000000;
  border-right-color: #ffeb3b;
}

:global(.theme-contrast) .nscale-session-item {
  border: 1px solid #ffeb3b;
  margin-bottom: 0.5rem;
}

:global(.theme-contrast) .nscale-session-item:hover {
  background-color: #222200;
}

:global(.theme-contrast) .nscale-session-item.active {
  background-color: #222200;
  border-left: 3px solid #ffeb3b;
}

:global(.theme-contrast) .session-delete-button:hover {
  color: #ffffff;
  background-color: #ff0000;
}
</style>