/**
 * admin-system.js
 * Standalone Vue-Modul für System-Monitoring im Admin-Bereich
 */

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import SystemView from '../views/admin/SystemView.vue';
import { useSystemStore } from '../stores/systemStore';

// Warte auf DOM-Bereitschaft
document.addEventListener('DOMContentLoaded', () => {
  initAdminSystem();
});

/**
 * Initialisiert die System-Monitoring-Ansicht
 */
function initAdminSystem() {
  console.log('Initialisiere Vue.js System-Monitoring...');

  // Mount-Point für das System-Monitoring finden
  const systemAppContainer = document.getElementById('system-admin-app');
  if (!systemAppContainer) {
    console.error('Mount-Point #system-admin-app wurde nicht gefunden');
    return;
  }

  // Erstelle Vue-App
  createVueApp(systemAppContainer);
}

/**
 * Findet den Mount-Point für die Vue-Komponente
 */
function findMountPoint() {
  // Zunächst nach dem Tab-spezifischen Container suchen
  let container = document.querySelector('[data-tab="system"]');
  
  // Fallback auf andere mögliche Selektoren
  if (!container) {
    container = document.querySelector('.admin-content-system');
  }
  
  if (!container) {
    // Suche jeden Container, der aktiv ist und "System" enthält
    const tabs = document.querySelectorAll('.admin-content-tab');
    for (const tab of tabs) {
      if (tab.style.display !== 'none' && 
          (tab.textContent.includes('System') || 
           tab.getAttribute('data-tab') === 'system')) {
        container = tab;
        break;
      }
    }
  }

  return container;
}

/**
 * Erstellt und konfiguriert die Vue-App
 */
function createVueApp(container) {
  // Erstelle Pinia-Store und Vue-App
  const pinia = createPinia();
  const app = createApp(SystemView);

  // Plugins einbinden
  app.use(pinia);

  // App mounten
  app.mount(container);

  // Store initialisieren und Daten laden
  const systemStore = useSystemStore();
  systemStore.fetchSystemData();

  console.log('Vue.js System-Monitoring erfolgreich initialisiert');
}

// Globales Objekt für externe Zugriffe
window.adminSystemApp = {
  refresh: () => {
    const systemStore = useSystemStore();
    if (systemStore) {
      systemStore.fetchSystemData();
    }
  }
};