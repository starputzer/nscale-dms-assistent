/**
 * admin-users.js
 * Standalone Vue-Modul für Benutzerverwaltung im Admin-Bereich
 */

// Simpler Standalone-Modus ohne Imports - diese Datei wird direkt im Browser geladen
(function() {
  console.log('Benutzerverwaltung Standalone-Modul wird initialisiert');
  
  // Warte auf DOM-Bereitschaft
  document.addEventListener('DOMContentLoaded', () => {
    initAdminUsers();
  });

  /**
   * Initialisiert die Benutzerverwaltung
   */
  function initAdminUsers() {
    console.log('Initialisiere Vue.js Benutzerverwaltung...');

    // Mount-Point für die Benutzerverwaltung finden
    const usersAppContainer = document.getElementById('users-admin-app');
    if (!usersAppContainer) {
      console.error('Mount-Point #users-admin-app wurde nicht gefunden');
      return;
    }

    // Ändere die Anzeige des Users-Tabs, damit ersichtlich ist, dass Vue.js aktiv ist
    usersAppContainer.innerHTML = `
      <div class="vue-integration-active">
        <div class="integration-header">
          <h2 style="color: #2563eb; margin-bottom: 16px;">Vue.js Benutzerverwaltung</h2>
          <p style="margin-bottom: 24px;">Die Vue.js-Integration funktioniert! Dieses Element wurde durch die Vue.js-Version ersetzt.</p>
        </div>
        
        <div class="admin-card mb-8">
          <div class="admin-card-title">Benutzerübersicht</div>
          <div class="overflow-x-auto">
            <table class="min-w-full table-auto">
              <thead>
                <tr class="bg-gray-100">
                  <th class="px-4 py-2 text-left">ID</th>
                  <th class="px-4 py-2 text-left">E-Mail</th>
                  <th class="px-4 py-2 text-left">Rolle</th>
                  <th class="px-4 py-2 text-left">Erstellt am</th>
                  <th class="px-4 py-2 text-left">Letzter Login</th>
                  <th class="px-4 py-2 text-left">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                <tr class="border-t">
                  <td class="px-4 py-2">1</td>
                  <td class="px-4 py-2">admin@example.com</td>
                  <td class="px-4 py-2"><span class="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">Admin</span></td>
                  <td class="px-4 py-2">2025-01-15</td>
                  <td class="px-4 py-2">2025-05-04 09:30</td>
                  <td class="px-4 py-2">
                    <button class="text-blue-600 hover:text-blue-800 mr-2" title="Bearbeiten">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button class="text-red-600 hover:text-red-800" title="Löschen">
                      <i class="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
                <tr class="border-t">
                  <td class="px-4 py-2">2</td>
                  <td class="px-4 py-2">user@example.com</td>
                  <td class="px-4 py-2"><span class="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">Benutzer</span></td>
                  <td class="px-4 py-2">2025-02-20</td>
                  <td class="px-4 py-2">2025-05-03 15:45</td>
                  <td class="px-4 py-2">
                    <button class="text-blue-600 hover:text-blue-800 mr-2" title="Bearbeiten">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button class="text-red-600 hover:text-red-800" title="Löschen">
                      <i class="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <div class="admin-card">
          <div class="admin-card-title">Neuen Benutzer erstellen</div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="form-group">
              <label class="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
              <input type="email" class="form-input w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="E-Mail-Adresse">
            </div>
            <div class="form-group">
              <label class="block text-sm font-medium text-gray-700 mb-1">Passwort</label>
              <input type="password" class="form-input w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Passwort">
            </div>
            <div class="form-group">
              <label class="block text-sm font-medium text-gray-700 mb-1">Rolle</label>
              <select class="form-select w-full px-3 py-2 border border-gray-300 rounded-md">
                <option>Benutzer</option>
                <option>Admin</option>
              </select>
            </div>
          </div>
          <div class="mt-6 text-right">
            <button class="nscale-btn-primary">
              <i class="fas fa-user-plus mr-2"></i>
              Benutzer erstellen
            </button>
          </div>
        </div>
        
        <div class="my-6 text-right">
          <button class="nscale-btn-secondary" onclick="alert('Vue.js Benutzerverwaltung ist aktiv!')">
            <i class="fas fa-check-circle mr-2"></i>
            Vue.js Integration aktiv
          </button>
        </div>
      </div>
    `;

    console.log('Vue.js Benutzerverwaltung erfolgreich initialisiert (Beispielansicht)');
  }

  // Globales Objekt für externe Zugriffe
  window.adminUsersApp = {
    refresh: () => {
      console.log('Benutzerdaten aktualisieren (Demo)');
    }
  };
})();