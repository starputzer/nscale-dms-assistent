<template>
  <!-- Admin Sidebar - Exactly the same structure as in original HTML -->
  <aside class="admin-sidebar w-64 flex-shrink-0 transition-all">
    <div class="p-4 font-semibold text-lg">Systemadministration</div>
    
    <nav class="admin-nav">
      <button 
        @click="$emit('update:admin-tab', 'users')" 
        :class="['admin-nav-item', adminTab === 'users' ? 'active' : '']">
        <i class="fas fa-users"></i>
        <span>Benutzer</span>
      </button>
      
      <button 
        @click="setAdminTab('system')" 
        :class="['admin-nav-item', adminTab === 'system' ? 'active' : '']">
        <i class="fas fa-chart-line"></i>
        <span>System</span>
      </button>
      
      <button 
        @click="setAdminTab('feedback')" 
        :class="['admin-nav-item', adminTab === 'feedback' ? 'active' : '']">
        <i class="fas fa-comment-dots"></i>
        <span>Feedback</span>
      </button>
      
      <button 
        @click="setAdminTab('motd')" 
        :class="['admin-nav-item', adminTab === 'motd' ? 'active' : '']">
        <i class="fas fa-info-circle"></i>
        <span>MOTD</span>
      </button>
      
      <button 
        @click="$emit('update:admin-tab', 'doc-converter')" 
        :class="['admin-nav-item', adminTab === 'doc-converter' ? 'active' : '']">
        <i class="fas fa-file-alt"></i>
        <span>Dokumentenkonverter</span>
      </button>
    </nav>
    
    <div class="mt-auto p-4 text-sm text-gray-500">
      <p>Angemeldet als: <span class="font-semibold">{{ userRole }}</span></p>
    </div>
  </aside>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useFeatureToggleStore } from '@/stores/featureToggleStore';

// Props
const props = defineProps({
  adminTab: {
    type: String,
    default: 'users'
  },
  userRole: {
    type: String,
    default: 'admin'
  }
});

// Emits
const emit = defineEmits(['update:admin-tab', 'load-system-stats', 'load-feedback-stats']);

// Reaktiver Zustand
const featureStore = useFeatureToggleStore();
const vueAdminSidebarEnabled = ref(featureStore.isEnabled('vueAdmin'));
const sidebarInitialized = ref(false);

// Methoden - Kombiniert Tab-Änderung mit Datenladung
function setAdminTab(tab) {
  emit('update:admin-tab', tab);
  
  // Zusätzliche Aktionen basierend auf Tab
  if (tab === 'system') {
    emit('load-system-stats');
  } else if (tab === 'feedback') {
    emit('load-feedback-stats');
  }
}

// Fallback-Mechanismus
function loadFallbackAdminSidebar() {
  console.log('Lade Fallback-Admin-Sidebar-Implementierung...');
  
  // Vue-Admin-Sidebar ausblenden
  const vueAdminSidebar = document.querySelector('.vue-admin-sidebar-container');
  if (vueAdminSidebar) vueAdminSidebar.style.display = 'none';
  
  // Klassische Admin-Sidebar anzeigen
  const classicAdminSidebar = document.querySelector('.classic-admin-sidebar-container');
  if (classicAdminSidebar) classicAdminSidebar.style.display = 'block';
}

// Komponenten-Initialisierung
function setupVueAdminSidebar() {
  sidebarInitialized.value = true;
  console.log('Vue Admin-Sidebar wurde erfolgreich initialisiert');
}

// Komponenten-Lifecycle-Hooks
onMounted(() => {
  if (!vueAdminSidebarEnabled.value) {
    loadFallbackAdminSidebar();
    return;
  }
  
  // Vue-Admin-Sidebar initialisieren
  try {
    setupVueAdminSidebar();
    
    // Fallback-Timer für Fehlerfall
    const fallbackTimer = setTimeout(() => {
      if (!sidebarInitialized.value) {
        console.warn('Vue Admin-Sidebar konnte nicht initialisiert werden, Fallback wird geladen');
        loadFallbackAdminSidebar();
      }
    }, 3000);
    
    // Timer bei Erfolg löschen
    if (sidebarInitialized.value) {
      clearTimeout(fallbackTimer);
    }
  } catch (error) {
    console.error('Fehler bei der Initialisierung der Vue Admin-Sidebar:', error);
    loadFallbackAdminSidebar();
  }
});
</script>

<style>
/* Keine scoped Styles, um die globalen CSS-Klassen zu verwenden */

/* Aber wir fügen die wichtigsten Stile hier hinzu, falls die globalen CSS-Dateien nicht geladen werden */
.admin-sidebar {
  background-color: white;
  border-right: 1px solid #f3f4f6;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.admin-nav {
  display: flex;
  flex-direction: column;
  padding: 0.5rem;
}

.admin-nav-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  border-radius: 0.375rem;
  margin-bottom: 0.25rem;
  transition: all 0.2s ease;
  text-align: left;
  cursor: pointer;
}

.admin-nav-item i {
  margin-right: 0.75rem;
  width: 1rem;
  text-align: center;
}

.admin-nav-item:hover {
  background-color: #f3f4f6;
}

.admin-nav-item.active {
  background-color: #2563eb;
  color: white;
}

/* Dark Mode */
:global(.theme-dark) .admin-sidebar {
  background-color: #1f2937;
  border-right-color: #374151;
}

:global(.theme-dark) .admin-nav-item:hover {
  background-color: #374151;
}

:global(.theme-dark) .admin-nav-item.active {
  background-color: #3b82f6;
}

/* Kontrast Mode */
:global(.theme-contrast) .admin-sidebar {
  background-color: #000000;
  border-right-color: #ffeb3b;
}

:global(.theme-contrast) .admin-nav-item {
  border: 1px solid #ffeb3b;
  color: #ffeb3b;
  margin-bottom: 0.5rem;
}

:global(.theme-contrast) .admin-nav-item:hover {
  background-color: #222200;
}

:global(.theme-contrast) .admin-nav-item.active {
  background-color: #ffeb3b;
  color: #000000;
}
</style>