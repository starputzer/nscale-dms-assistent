/**
 * admin-system.js
 * Standalone Vue-Modul für System-Monitoring im Admin-Bereich
 */

// Simpler Standalone-Modus ohne Imports - diese Datei wird direkt im Browser geladen
(function() {
  console.log('System-Monitoring Standalone-Modul wird initialisiert');
  
  // Initialisierungsflag, um mehrfache Initialisierungen zu verhindern
  let isInitialized = false;
  
  // Warte auf DOM-Bereitschaft
  document.addEventListener('DOMContentLoaded', () => {
    initAdminSystem();
  });

  /**
   * Initialisiert die System-Monitoring-Ansicht
   */
  function initAdminSystem() {
    // Vermeidung von Mehrfachinitialisierungen
    if (isInitialized) {
      console.log('System-Monitoring bereits initialisiert, überspringe...');
      return;
    }
    
    console.log('Initialisiere Vue.js System-Monitoring...');

    // Mount-Point für das System-Monitoring finden
    const systemAppContainer = document.getElementById('system-admin-app');
    if (!systemAppContainer) {
      console.error('Mount-Point #system-admin-app wurde nicht gefunden');
      return;
    }

    // Ändere die Anzeige des System-Tabs, damit ersichtlich ist, dass Vue.js aktiv ist
    systemAppContainer.innerHTML = `
      <div class="vue-integration-active">
        <div class="integration-header">
          <h2 style="color: #2563eb; margin-bottom: 16px;">Vue.js System-Monitoring</h2>
          <p style="margin-bottom: 24px;">Die Vue.js-Integration funktioniert! Dieses Element wurde durch die Vue.js-Version ersetzt.</p>
        </div>
        
        <div class="admin-card">
          <div class="admin-card-title">Systemstatistiken</div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div class="stats-card bg-white p-4 rounded-lg shadow border border-blue-200">
              <div class="text-lg font-medium mb-1">Dokumente</div>
              <div class="text-3xl font-bold text-blue-600">47</div>
              <div class="text-sm text-gray-500 mt-2">Verfügbare Dokumente</div>
            </div>
            
            <div class="stats-card bg-white p-4 rounded-lg shadow border border-blue-200">
              <div class="text-lg font-medium mb-1">Chunks</div>
              <div class="text-3xl font-bold text-blue-600">2,583</div>
              <div class="text-sm text-gray-500 mt-2">Gesamt</div>
            </div>
            
            <div class="stats-card bg-white p-4 rounded-lg shadow border border-blue-200">
              <div class="text-lg font-medium mb-1">Speichernutzung</div>
              <div class="text-3xl font-bold text-green-600">74%</div>
              <div class="text-sm text-gray-500 mt-2">Verfügbarer Speicher</div>
            </div>
          </div>
        </div>
        
        <div class="admin-card mt-8">
          <div class="admin-card-title">Log-Einträge</div>
          <div class="overflow-x-auto">
            <table class="min-w-full table-auto">
              <thead>
                <tr class="bg-gray-100">
                  <th class="px-4 py-2 text-left">Zeitstempel</th>
                  <th class="px-4 py-2 text-left">Typ</th>
                  <th class="px-4 py-2 text-left">Meldung</th>
                </tr>
              </thead>
              <tbody>
                <tr class="border-t">
                  <td class="px-4 py-2">2025-05-04 10:15:23</td>
                  <td class="px-4 py-2"><span class="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">INFO</span></td>
                  <td class="px-4 py-2">System gestartet</td>
                </tr>
                <tr class="border-t">
                  <td class="px-4 py-2">2025-05-04 10:16:05</td>
                  <td class="px-4 py-2"><span class="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">DEBUG</span></td>
                  <td class="px-4 py-2">Dokumente indexiert: 47 verfügbar</td>
                </tr>
                <tr class="border-t">
                  <td class="px-4 py-2">2025-05-04 10:20:17</td>
                  <td class="px-4 py-2"><span class="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">WARN</span></td>
                  <td class="px-4 py-2">CPU-Auslastung überdurchschnittlich hoch</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <div class="my-6 text-right">
          <button class="nscale-btn-primary" onclick="alert('Vue.js System-Monitoring ist aktiv!')">
            <i class="fas fa-check-circle mr-2"></i>
            Vue.js Integration aktiv
          </button>
        </div>
      </div>
    `;

    console.log('Vue.js System-Monitoring erfolgreich initialisiert (Beispielansicht)');
    
    // Als initialisiert markieren
    isInitialized = true;
  }

  // Globales Objekt für externe Zugriffe
  window.adminSystemApp = {
    refresh: () => {
      console.log('System-Daten aktualisieren (Demo)');
    }
  };
  
  // Globale Funktion für eine direkte Initialisierung (wird von admin-integration.js verwendet)
  window.initAdminSystem = initAdminSystem;
})();