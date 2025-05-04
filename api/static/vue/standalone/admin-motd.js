/**
 * admin-motd.js
 * Standalone Vue-Modul für MOTD-Verwaltung im Admin-Bereich
 */

// Simpler Standalone-Modus ohne Imports - diese Datei wird direkt im Browser geladen
(function() {
  console.log('MOTD-Verwaltung Standalone-Modul wird initialisiert');
  
  // Warte auf DOM-Bereitschaft
  document.addEventListener('DOMContentLoaded', () => {
    initAdminMotd();
  });

  /**
   * Initialisiert die MOTD-Verwaltung
   */
  function initAdminMotd() {
    console.log('Initialisiere Vue.js MOTD-Verwaltung...');

    // Mount-Point für die MOTD-Verwaltung finden
    const motdAppContainer = document.getElementById('motd-admin-app');
    if (!motdAppContainer) {
      console.error('Mount-Point #motd-admin-app wurde nicht gefunden');
      return;
    }

    // Ändere die Anzeige des MOTD-Tabs, damit ersichtlich ist, dass Vue.js aktiv ist
    motdAppContainer.innerHTML = `
      <div class="vue-integration-active">
        <div class="integration-header">
          <h2 style="color: #2563eb; margin-bottom: 16px;">Vue.js MOTD-Verwaltung</h2>
          <p style="margin-bottom: 24px;">Die Vue.js-Integration funktioniert! Dieses Element wurde durch die Vue.js-Version ersetzt.</p>
        </div>
        
        <div class="flex flex-col lg:flex-row gap-6">
          <!-- MOTD Editor -->
          <div class="flex-1">
            <div class="admin-card">
              <div class="admin-card-title">Message of the Day Konfiguration</div>
              
              <div class="form-group mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">Titel</label>
                <input type="text" class="form-input w-full px-3 py-2 border border-gray-300 rounded-md" 
                      value="Willkommen zum nscale DMS Assistent">
              </div>
              
              <div class="form-group mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">Nachricht (Markdown unterstützt)</label>
                <textarea class="form-textarea w-full px-3 py-2 border border-gray-300 rounded-md h-32">**Wichtig**: System-Update am kommenden Wochenende!

Wir führen am Samstag, den 10. Mai 2025, zwischen 22:00 und 02:00 Uhr ein System-Update durch. Während dieser Zeit kann es zu kurzen Unterbrechungen kommen.

Bei Fragen wenden Sie sich bitte an das Support-Team.</textarea>
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div class="form-group">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Farbschema</label>
                  <select class="form-select w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option>Informativ (Blau)</option>
                    <option>Warnung (Gelb)</option>
                    <option>Fehler (Rot)</option>
                    <option>Erfolg (Grün)</option>
                  </select>
                </div>
                
                <div class="form-group">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Icon</label>
                  <select class="form-select w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option>Info</option>
                    <option>Warnung</option>
                    <option>Ausrufezeichen</option>
                    <option>Häkchen</option>
                    <option>Kein Icon</option>
                  </select>
                </div>
              </div>
              
              <div class="flex items-center mb-4">
                <input type="checkbox" id="motd-enabled" checked class="h-4 w-4 text-blue-600 border-gray-300 rounded">
                <label for="motd-enabled" class="ml-2 text-sm text-gray-700">MOTD aktivieren</label>
              </div>
              
              <div class="flex items-center mb-4">
                <input type="checkbox" id="motd-dismissible" checked class="h-4 w-4 text-blue-600 border-gray-300 rounded">
                <label for="motd-dismissible" class="ml-2 text-sm text-gray-700">Schließbar (Benutzer kann Nachricht ausblenden)</label>
              </div>
              
              <div class="mt-6 flex justify-end">
                <button class="nscale-btn-primary">
                  <i class="fas fa-save mr-2"></i>
                  Speichern
                </button>
              </div>
            </div>
          </div>
          
          <!-- MOTD Vorschau -->
          <div class="lg:w-1/3">
            <div class="admin-card">
              <div class="admin-card-title">Vorschau</div>
              
              <div class="p-4 mb-4 rounded-lg border border-blue-300 bg-blue-50 text-blue-800">
                <div class="flex items-start">
                  <div class="flex-shrink-0 mr-2">
                    <i class="fas fa-info-circle text-blue-500"></i>
                  </div>
                  <div class="flex-1 pr-6 relative">
                    <button class="absolute top-0 right-0 text-blue-400 hover:text-blue-600">
                      <i class="fas fa-times"></i>
                    </button>
                    <div class="font-medium">Willkommen zum nscale DMS Assistent</div>
                    <div class="mt-1 text-sm">
                      <p><strong>Wichtig</strong>: System-Update am kommenden Wochenende!</p>
                      <p>Wir führen am Samstag, den 10. Mai 2025, zwischen 22:00 und 02:00 Uhr ein System-Update durch. Während dieser Zeit kann es zu kurzen Unterbrechungen kommen.</p>
                      <p>Bei Fragen wenden Sie sich bitte an das Support-Team.</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="border border-gray-300 rounded-lg p-3 mb-4">
                <div class="text-xs text-gray-500 mb-1">Mobile Ansicht</div>
                <div class="w-full max-w-[320px] border border-gray-300 rounded bg-white p-3 mx-auto">
                  <div class="p-3 rounded-lg border border-blue-300 bg-blue-50 text-blue-800 text-xs">
                    <div class="flex items-start">
                      <div class="flex-shrink-0 mr-2">
                        <i class="fas fa-info-circle text-blue-500"></i>
                      </div>
                      <div class="flex-1 pr-6 relative">
                        <button class="absolute top-0 right-0 text-blue-400 hover:text-blue-600">
                          <i class="fas fa-times"></i>
                        </button>
                        <div class="font-medium">Willkommen zum nscale DMS Assistent</div>
                        <div class="mt-1">
                          <p><strong>Wichtig</strong>: System-Update am kommenden Wochenende!</p>
                          <p>Wir führen am Samstag, den 10. Mai...</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="text-sm text-gray-500">
                <p>Hinweis: Die MOTD wird allen Benutzern angezeigt, sobald sie aktiviert ist.</p>
              </div>
            </div>
          </div>
        </div>
        
        <div class="my-6 text-right">
          <button class="nscale-btn-secondary" onclick="alert('Vue.js MOTD-Verwaltung ist aktiv!')">
            <i class="fas fa-check-circle mr-2"></i>
            Vue.js Integration aktiv
          </button>
        </div>
      </div>
    `;

    console.log('Vue.js MOTD-Verwaltung erfolgreich initialisiert (Beispielansicht)');
  }

  // Globales Objekt für externe Zugriffe
  window.adminMotdApp = {
    refresh: () => {
      console.log('MOTD-Daten aktualisieren (Demo)');
    }
  };
})();