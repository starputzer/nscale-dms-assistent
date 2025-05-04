<template>
  <div class="admin-sub-view">
    <h1>{{ viewTitle }}</h1>
    
    <div class="tabs-container">
      <div class="tabs">
        <button 
          class="tab-button" 
          :class="{ active: activeTab === 'status' }"
          @click="activeTab = 'status'"
        >
          <i class="fas fa-tachometer-alt"></i>
          System-Status
        </button>
        <button 
          class="tab-button" 
          :class="{ active: activeTab === 'logs' }"
          @click="activeTab = 'logs'"
        >
          <i class="fas fa-clipboard-list"></i>
          Protokolle
        </button>
      </div>
      
      <div class="tab-content">
        <keep-alive>
          <component :is="activeComponent"></component>
        </keep-alive>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, markRaw } from 'vue';
import { useRoute } from 'vue-router';
import SystemStatus from '@/components/admin/system/SystemStatus.vue';
import SystemLogs from '@/components/admin/system/SystemLogs.vue';

const route = useRoute();
const activeTab = ref('status');

// View-spezifische Daten basierend auf dem Route-Namen
const viewTitle = computed(() => {
  const viewName = route.name || '';
  
  switch(viewName) {
    case 'AdminSystem':
      return 'Systemüberwachung';
    default:
      return 'Administration';
  }
});

// Aktive Komponente basierend auf dem ausgewählten Tab
const activeComponent = computed(() => {
  switch(activeTab.value) {
    case 'status':
      return markRaw(SystemStatus);
    case 'logs':
      return markRaw(SystemLogs);
    default:
      return markRaw(SystemStatus);
  }
});
</script>

<style scoped>
.admin-sub-view {
  padding: 1.5rem;
}

.tabs-container {
  margin-top: 1.5rem;
}

.tabs {
  display: flex;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 1.5rem;
}

.tab-button {
  padding: 0.75rem 1.5rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: #64748b;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: -1px;
}

.tab-button:hover {
  color: #3b82f6;
}

.tab-button.active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
}

.tab-content {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Dark Mode Anpassungen */
:global(.theme-dark) .tabs {
  border-bottom-color: #444;
}

:global(.theme-dark) .tab-button {
  color: #aaa;
}

:global(.theme-dark) .tab-button:hover,
:global(.theme-dark) .tab-button.active {
  color: #3b82f6;
}

/* Kontrast-Modus Anpassungen */
:global(.theme-contrast) .tabs {
  border-bottom-color: #ffeb3b;
}

:global(.theme-contrast) .tab-button {
  color: #fff;
}

:global(.theme-contrast) .tab-button:hover {
  color: #ffeb3b;
}

:global(.theme-contrast) .tab-button.active {
  color: #ffeb3b;
  border-bottom-color: #ffeb3b;
}
</style>