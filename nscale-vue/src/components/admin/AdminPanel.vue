<template>
  <div class="h-full flex flex-col p-6 overflow-auto">
    <div class="mb-6">
      <h1 class="text-2xl font-semibold text-gray-800">{{ getAdminTabTitle() }}</h1>
    </div>
    
    <div class="admin-content flex-1">
      <!-- Dynamischer Komponenten-Import basierend auf Tab -->
      <component 
        :is="currentTabComponent" 
        v-bind="currentTabProps"
        v-on="currentTabEvents"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, defineAsyncComponent, onMounted, ref } from 'vue';
import { useFeatureToggleStore } from '@/stores/featureToggleStore';

// Lazy-loading für Admin-Tab-Komponenten
const AdminDocConverter = defineAsyncComponent(() => import('./tabs/AdminDocConverterTab.vue'));
const AdminUsers = defineAsyncComponent(() => import('./tabs/AdminUsersTab.vue'));
const AdminSystem = defineAsyncComponent(() => import('./tabs/AdminSystemTab.vue'));
const AdminFeedback = defineAsyncComponent(() => import('./tabs/AdminFeedbackTab.vue'));
const AdminMotd = defineAsyncComponent(() => import('./tabs/AdminMotdTab.vue'));

// Props
const props = defineProps({
  adminTab: {
    type: String,
    default: 'users'
  },
  systemStats: {
    type: Object,
    default: () => ({})
  },
  feedbackStats: {
    type: Object,
    default: () => ({})
  },
  negativeFeedback: {
    type: Array,
    default: () => []
  },
  adminUsers: {
    type: Array,
    default: () => []
  },
  newUser: {
    type: Object,
    default: () => ({})
  },
  motdConfig: {
    type: Object,
    default: () => ({})
  },
  selectedColorTheme: {
    type: String,
    default: 'info'
  }
});

// Emits
const emit = defineEmits([
  'create-user',
  'update-user-role',
  'delete-user',
  'clear-model-cache',
  'clear-embedding-cache',
  'reload-motd',
  'reset-motd-config',
  'save-motd-config',
  'apply-color-theme'
]);

// Reaktiver Zustand
const featureStore = useFeatureToggleStore();
const vueAdminEnabled = ref(featureStore.isEnabled('vueAdmin'));
const adminInitialized = ref(false);

// Tab-Titel basierend auf ausgewähltem Tab
const getAdminTabTitle = () => {
  const titles = {
    'users': 'Benutzerverwaltung',
    'system': 'Systemstatistiken',
    'feedback': 'Feedback-Übersicht',
    'motd': 'Message of the Day',
    'doc-converter': 'Dokumentenkonverter'
  };
  
  return titles[props.adminTab] || 'Administration';
};

// Berechne aktuelle Tab-Komponente
const currentTabComponent = computed(() => {
  const components = {
    'users': AdminUsers,
    'system': AdminSystem,
    'feedback': AdminFeedback,
    'motd': AdminMotd,
    'doc-converter': AdminDocConverter
  };
  
  return components[props.adminTab] || AdminUsers;
});

// Berechne Props und Events für aktuelle Tab-Komponente
const currentTabProps = computed(() => {
  switch (props.adminTab) {
    case 'users':
      return {
        adminUsers: props.adminUsers,
        newUser: props.newUser
      };
    case 'system':
      return {
        systemStats: props.systemStats
      };
    case 'feedback':
      return {
        feedbackStats: props.feedbackStats,
        negativeFeedback: props.negativeFeedback
      };
    case 'motd':
      return {
        motdConfig: props.motdConfig,
        selectedColorTheme: props.selectedColorTheme
      };
    default:
      return {};
  }
});

const currentTabEvents = computed(() => {
  switch (props.adminTab) {
    case 'users':
      return {
        'create-user': (userData) => emit('create-user', userData),
        'update-user-role': (userId, role) => emit('update-user-role', userId, role),
        'delete-user': (userId) => emit('delete-user', userId)
      };
    case 'system':
      return {
        'clear-model-cache': () => emit('clear-model-cache'),
        'clear-embedding-cache': () => emit('clear-embedding-cache'),
        'reload-motd': () => emit('reload-motd')
      };
    case 'motd':
      return {
        'reset-motd-config': () => emit('reset-motd-config'),
        'save-motd-config': () => emit('save-motd-config'),
        'apply-color-theme': (theme) => emit('apply-color-theme', theme)
      };
    default:
      return {};
  }
});

// Fallback-Mechanismus
function loadFallbackAdmin() {
  console.log('Lade Fallback-Admin-Implementierung...');
  
  // Vue-Admin ausblenden
  const vueAdmin = document.querySelector('.vue-admin-container');
  if (vueAdmin) vueAdmin.style.display = 'none';
  
  // Klassischen Admin anzeigen
  const classicAdmin = document.querySelector('.classic-admin-container');
  if (classicAdmin) classicAdmin.style.display = 'block';
  
  // Klassisches Script laden falls notwendig
  if (!window.classicAdminInitialized) {
    const script = document.createElement('script');
    script.src = '/static/js/admin.js';
    script.type = 'module';
    
    script.onload = () => {
      console.log('Klassische Admin-Implementierung geladen');
      window.classicAdminInitialized = true;
    };
    
    script.onerror = () => {
      console.error('Fehler beim Laden der klassischen Admin-Implementierung');
    };
    
    document.head.appendChild(script);
  }
}

// Komponenten-Initialisierung
function setupVueAdmin() {
  adminInitialized.value = true;
  console.log('Vue Admin-Panel wurde erfolgreich initialisiert');
}

// Komponenten-Lifecycle-Hooks
onMounted(() => {
  if (!vueAdminEnabled.value) {
    loadFallbackAdmin();
    return;
  }
  
  // Vue-Admin initialisieren
  try {
    setupVueAdmin();
    
    // Fallback-Timer für Fehlerfall
    const fallbackTimer = setTimeout(() => {
      if (!adminInitialized.value) {
        console.warn('Vue Admin-Panel konnte nicht initialisiert werden, Fallback wird geladen');
        loadFallbackAdmin();
      }
    }, 3000);
    
    // Timer bei Erfolg löschen
    if (adminInitialized.value) {
      clearTimeout(fallbackTimer);
    }
  } catch (error) {
    console.error('Fehler bei der Initialisierung des Vue Admin-Panels:', error);
    loadFallbackAdmin();
  }
});
</script>

<style>
/* Keine scoped Styles, um die globalen CSS-Klassen zu verwenden */

/* Aber wir fügen die wichtigsten Stile hier hinzu, falls die globalen CSS-Dateien nicht geladen werden */
.admin-content {
  width: 100%;
}

/* Diese Stile stammen aus der admin.css-Datei */
.admin-card {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
  overflow: hidden;
}

.admin-card-title {
  padding: 1rem 1.5rem;
  font-weight: 600;
  background-color: #f9fafb;
  border-bottom: 1px solid #f3f4f6;
}

.admin-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.admin-stat-card {
  background-color: white;
  border-radius: 0.5rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.admin-stat-value {
  font-size: 2rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #2563eb;
}

.admin-stat-label {
  color: #6b7280;
  font-size: 0.875rem;
}

.admin-table {
  width: 100%;
  border-collapse: collapse;
}

.admin-table th {
  background-color: #f9fafb;
  padding: 0.75rem 1rem;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
}

.admin-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f3f4f6;
}

.admin-button-danger {
  display: inline-flex;
  align-items: center;
  background-color: #fef2f2;
  color: #dc2626;
  font-weight: 500;
  padding: 0.375rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.admin-button-danger:hover {
  background-color: #fee2e2;
  color: #b91c1c;
}

.admin-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

/* Dark Mode */
:global(.theme-dark) .admin-card,
:global(.theme-dark) .admin-stat-card {
  background-color: #1f2937;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

:global(.theme-dark) .admin-card-title {
  background-color: #111827;
  border-bottom-color: #374151;
}

:global(.theme-dark) .admin-table th {
  background-color: #111827;
  color: #e5e7eb;
  border-bottom-color: #374151;
}

:global(.theme-dark) .admin-table td {
  border-bottom-color: #374151;
}

:global(.theme-dark) .admin-stat-value {
  color: #3b82f6;
}

:global(.theme-dark) .admin-stat-label {
  color: #9ca3af;
}

:global(.theme-dark) .admin-label {
  color: #e5e7eb;
}

:global(.theme-dark) .admin-button-danger {
  background-color: #7f1d1d;
  color: #fca5a5;
}

:global(.theme-dark) .admin-button-danger:hover {
  background-color: #991b1b;
  color: #fecaca;
}

/* Kontrast Mode */
:global(.theme-contrast) .admin-card,
:global(.theme-contrast) .admin-stat-card {
  background-color: #000000;
  border: 2px solid #ffeb3b;
  box-shadow: none;
}

:global(.theme-contrast) .admin-card-title {
  background-color: #222200;
  border-bottom-color: #ffeb3b;
  color: #ffeb3b;
}

:global(.theme-contrast) .admin-table th {
  background-color: #222200;
  color: #ffeb3b;
  border-bottom-color: #ffeb3b;
}

:global(.theme-contrast) .admin-table td {
  border-bottom-color: #ffeb3b;
  color: #ffffff;
}

:global(.theme-contrast) .admin-stat-value {
  color: #ffeb3b;
}

:global(.theme-contrast) .admin-stat-label {
  color: #ffffff;
}

:global(.theme-contrast) .admin-label {
  color: #ffeb3b;
}

:global(.theme-contrast) .admin-button-danger {
  background-color: #ff0000;
  color: #ffffff;
  border: 2px solid #ffffff;
}

:global(.theme-contrast) .admin-button-danger:hover {
  background-color: #cc0000;
}
</style>