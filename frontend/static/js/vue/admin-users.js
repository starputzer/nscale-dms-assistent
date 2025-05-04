/**
 * admin-users.js
 * Standalone Vue-Modul für Benutzerverwaltung im Admin-Bereich
 */

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import UsersView from '../views/admin/UsersView.vue';
import { useUserStore } from '../stores/userStore';

// Warte auf DOM-Bereitschaft
document.addEventListener('DOMContentLoaded', () => {
  initAdminUsers();
});

/**
 * Initialisiert die Benutzerverwaltungsansicht
 */
function initAdminUsers() {
  console.log('Initialisiere Vue.js Benutzerverwaltung...');

  // Mount-Point für die Benutzerverwaltung finden
  const usersAppContainer = document.getElementById('users-admin-app');
  if (!usersAppContainer) {
    console.error('Mount-Point #users-admin-app wurde nicht gefunden');
    return;
  }

  // Erstelle Vue-App
  createVueApp(usersAppContainer);
}

/**
 * Findet den Mount-Point für die Vue-Komponente
 */
function findMountPoint() {
  // Zunächst nach dem Tab-spezifischen Container suchen
  let container = document.querySelector('[data-tab="users"]');
  
  // Fallback auf andere mögliche Selektoren
  if (!container) {
    container = document.querySelector('.admin-content-users');
  }
  
  if (!container) {
    // Suche jeden Container, der aktiv ist und "Benutzer" enthält
    const tabs = document.querySelectorAll('.admin-content-tab');
    for (const tab of tabs) {
      if (tab.style.display !== 'none' && 
          (tab.textContent.includes('Benutzer') || 
           tab.textContent.includes('User') || 
           tab.getAttribute('data-tab') === 'users')) {
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
  const app = createApp(UsersView);

  // Plugins einbinden
  app.use(pinia);

  // App mounten
  app.mount(container);

  // Store initialisieren und Daten laden
  const userStore = useUserStore();
  userStore.fetchUsers();

  console.log('Vue.js Benutzerverwaltung erfolgreich initialisiert');
}

// Globales Objekt für externe Zugriffe
window.adminUsersApp = {
  refresh: () => {
    const userStore = useUserStore();
    if (userStore) {
      userStore.fetchUsers();
    }
  }
};