/**
 * admin-motd.js
 * Standalone Vue-Modul für MOTD-Verwaltung im Admin-Bereich
 */

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import MotdView from '../views/admin/MotdView.vue';
import { useMotdStore } from '../stores/motdStore';

// Warte auf DOM-Bereitschaft
document.addEventListener('DOMContentLoaded', () => {
  initAdminMotd();
});

/**
 * Initialisiert die MOTD-Verwaltungsansicht
 */
function initAdminMotd() {
  console.log('Initialisiere Vue.js MOTD-Verwaltung...');

  // Mount-Point für die MOTD-Verwaltung finden
  const motdAppContainer = document.getElementById('motd-admin-app');
  if (!motdAppContainer) {
    console.error('Mount-Point #motd-admin-app wurde nicht gefunden');
    return;
  }

  // Erstelle Vue-App
  createVueApp(motdAppContainer);
}

/**
 * Findet den Mount-Point für die Vue-Komponente
 */
function findMountPoint() {
  // Zunächst nach dem Tab-spezifischen Container suchen
  let container = document.querySelector('[data-tab="motd"]');
  
  // Fallback auf andere mögliche Selektoren
  if (!container) {
    container = document.querySelector('.admin-content-motd');
  }
  
  if (!container) {
    // Suche jeden Container, der aktiv ist und "MOTD" enthält
    const tabs = document.querySelectorAll('.admin-content-tab');
    for (const tab of tabs) {
      if (tab.style.display !== 'none' && 
          (tab.textContent.includes('MOTD') || 
           tab.getAttribute('data-tab') === 'motd')) {
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
  const app = createApp(MotdView);

  // Plugins einbinden
  app.use(pinia);

  // App mounten
  app.mount(container);

  // Store initialisieren und Daten laden
  const motdStore = useMotdStore();
  motdStore.fetchMotd();

  console.log('Vue.js MOTD-Verwaltung erfolgreich initialisiert');
}

// Globales Objekt für externe Zugriffe
window.adminMotdApp = {
  refresh: () => {
    const motdStore = useMotdStore();
    if (motdStore) {
      motdStore.fetchMotd();
    }
  }
};