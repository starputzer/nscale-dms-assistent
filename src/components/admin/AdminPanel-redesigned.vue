<template>
  <div class="admin-panel">
    <div class="admin-panel__overlay" @click="$emit('close')"></div>
    <div class="admin-panel__content">
      <div class="admin-panel__header">
        <h2 class="admin-panel__title">Verwaltung</h2>
        <button
          class="admin-panel__close"
          @click="$emit('close')"
          aria-label="Schließen"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="admin-panel__tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="admin-panel__tab"
          :class="{ 'admin-panel__tab--active': activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <component :is="tab.icon" />
          </svg>
          <span>{{ tab.label }}</span>
        </button>
      </div>

      <div class="admin-panel__body">
        <div v-if="activeTab === 'users'" class="admin-section">
          <h3 class="admin-section__title">Benutzerverwaltung</h3>
          <p class="admin-section__info">
            Benutzer verwalten und Berechtigungen anpassen.
          </p>
          <!-- User management content -->
        </div>

        <div v-if="activeTab === 'system'" class="admin-section">
          <h3 class="admin-section__title">Systemeinstellungen</h3>
          <p class="admin-section__info">Systemkonfiguration und Wartung.</p>
          <!-- System settings content -->
        </div>

        <div v-if="activeTab === 'logs'" class="admin-section">
          <h3 class="admin-section__title">Systemprotokolle</h3>
          <p class="admin-section__info">
            Systemereignisse und Fehlerprotokolle einsehen.
          </p>
          <!-- System logs content -->
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const emit = defineEmits<{
  close: [];
}>();

const activeTab = ref("users");

const tabs = [
  {
    id: "users",
    label: "Benutzer",
    icon: `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>`,
  },
  {
    id: "system",
    label: "System",
    icon: `<circle cx="12" cy="12" r="3"></circle><path d="M12 1v6m0 6v6m-9-9h6m6 0h6"></path>`,
  },
  {
    id: "logs",
    label: "Protokolle",
    icon: `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline>`,
  },
];
</script>

<style scoped>
.admin-panel {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.admin-panel__overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: -1;
}

.admin-panel__content {
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  background: var(--background);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.admin-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px;
  border-bottom: 1px solid var(--border);
}

.admin-panel__title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  margin: 0;
}

.admin-panel__close {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: var(--radius-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-normal);
}

.admin-panel__close:hover {
  background: var(--button-hover);
  color: var(--text);
}

.admin-panel__close svg {
  width: 20px;
  height: 20px;
}

.admin-panel__tabs {
  display: flex;
  padding: 0 24px;
  border-bottom: 1px solid var(--border);
  gap: 8px;
}

.admin-panel__tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  transition: all var(--transition-normal);
  position: relative;
}

.admin-panel__tab:hover {
  background: var(--button-hover);
  color: var(--text);
}

.admin-panel__tab--active {
  color: var(--primary);
  background: var(--primary-light);
}

.admin-panel__tab--active::after {
  content: "";
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--primary);
}

.admin-panel__tab svg {
  width: 18px;
  height: 18px;
}

.admin-panel__body {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.admin-section__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  margin: 0 0 8px 0;
}

.admin-section__info {
  color: var(--text-secondary);
  margin: 0 0 24px 0;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .admin-panel__content {
    max-width: 100%;
    max-height: 100%;
    border-radius: 0;
  }

  .admin-panel__tabs {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    padding: 0 16px;
  }

  .admin-panel__tab {
    white-space: nowrap;
  }
}
</style>
