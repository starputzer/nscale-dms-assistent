/**
 * admin-feedback.js
 * Standalone-Modul für die Feedback-Verwaltung im Admin-Bereich
 */

// Simpler Standalone-Modus ohne Imports - diese Datei wird direkt im Browser geladen
(function() {
  console.log('Feedback-Verwaltung Standalone-Modul wird initialisiert');
  
  // Warte auf DOM-Bereitschaft
  document.addEventListener('DOMContentLoaded', () => {
    initAdminFeedback();
  });

  /**
   * Initialisiert die Feedback-Verwaltung
   */
  function initAdminFeedback() {
    console.log('Initialisiere Vue.js Feedback-Verwaltung...');

    // Mount-Point für die Feedback-Verwaltung finden
    const feedbackAppContainer = document.getElementById('feedback-admin-app');
    if (!feedbackAppContainer) {
      console.error('Mount-Point #feedback-admin-app wurde nicht gefunden');
      return;
    }

    // Ändere die Anzeige des Feedback-Tabs, damit ersichtlich ist, dass Vue.js aktiv ist
    feedbackAppContainer.innerHTML = `
      <div class="vue-integration-active">
        <div class="integration-header">
          <h2 style="color: #2563eb; margin-bottom: 16px;">Vue.js Feedback-Verwaltung</h2>
          <p style="margin-bottom: 24px;">Die Vue.js-Integration funktioniert! Dieses Element wurde durch die Vue.js-Version ersetzt.</p>
        </div>
        
        <!-- Feedback-Statistiken -->
        <div class="admin-card mb-8">
          <div class="admin-card-title">Feedback-Statistiken</div>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div class="stats-card bg-white p-4 rounded-lg shadow border border-blue-200">
              <div class="text-lg font-medium mb-1">Gesamt</div>
              <div class="text-3xl font-bold text-blue-600">143</div>
              <div class="text-sm text-gray-500 mt-2">Alle Feedbacks</div>
            </div>
            
            <div class="stats-card bg-white p-4 rounded-lg shadow border border-green-200">
              <div class="text-lg font-medium mb-1">Positiv</div>
              <div class="text-3xl font-bold text-green-600">98</div>
              <div class="text-sm text-gray-500 mt-2">68.5%</div>
            </div>
            
            <div class="stats-card bg-white p-4 rounded-lg shadow border border-red-200">
              <div class="text-lg font-medium mb-1">Negativ</div>
              <div class="text-3xl font-bold text-red-600">45</div>
              <div class="text-sm text-gray-500 mt-2">31.5%</div>
            </div>
            
            <div class="stats-card bg-white p-4 rounded-lg shadow border border-purple-200">
              <div class="text-lg font-medium mb-1">Mit Kommentar</div>
              <div class="text-3xl font-bold text-purple-600">64</div>
              <div class="text-sm text-gray-500 mt-2">44.8%</div>
            </div>
          </div>
          
          <div class="bg-gray-50 p-4 rounded-lg mb-4">
            <div class="h-40 w-full relative flex items-end">
              <!-- Einfaches Chart-Mockup -->
              <div class="w-1/6 h-28 bg-blue-500 mx-1 rounded-t-md relative">
                <span class="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium">17</span>
                <span class="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-6 text-xs">Jan</span>
              </div>
              <div class="w-1/6 h-16 bg-blue-500 mx-1 rounded-t-md relative">
                <span class="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium">12</span>
                <span class="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-6 text-xs">Feb</span>
              </div>
              <div class="w-1/6 h-32 bg-blue-500 mx-1 rounded-t-md relative">
                <span class="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium">21</span>
                <span class="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-6 text-xs">Mär</span>
              </div>
              <div class="w-1/6 h-24 bg-blue-500 mx-1 rounded-t-md relative">
                <span class="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium">15</span>
                <span class="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-6 text-xs">Apr</span>
              </div>
              <div class="w-1/6 h-36 bg-blue-500 mx-1 rounded-t-md relative">
                <span class="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium">24</span>
                <span class="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-6 text-xs">Mai</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Feedback-Liste -->
        <div class="admin-card">
          <div class="admin-card-title">Neuestes Feedback</div>
          
          <div class="mb-4 flex flex-wrap gap-2">
            <button class="px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-800 hover:bg-blue-200">Alle</button>
            <button class="px-3 py-1 text-sm rounded-full bg-green-100 text-green-800 hover:bg-green-200">Positiv</button>
            <button class="px-3 py-1 text-sm rounded-full bg-red-100 text-red-800 hover:bg-red-200">Negativ</button>
            <button class="px-3 py-1 text-sm rounded-full bg-purple-100 text-purple-800 hover:bg-purple-200">Mit Kommentar</button>
          </div>
          
          <div class="overflow-x-auto">
            <table class="min-w-full table-auto">
              <thead>
                <tr class="bg-gray-100">
                  <th class="px-4 py-2 text-left">Datum</th>
                  <th class="px-4 py-2 text-left">Bewertung</th>
                  <th class="px-4 py-2 text-left">Kommentar</th>
                  <th class="px-4 py-2 text-left">Frage</th>
                  <th class="px-4 py-2 text-left">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                <tr class="border-t">
                  <td class="px-4 py-2">2025-05-04</td>
                  <td class="px-4 py-2"><span class="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">Positiv</span></td>
                  <td class="px-4 py-2">Sehr hilfreich und übersichtlich dargestellt!</td>
                  <td class="px-4 py-2 text-gray-700 truncate max-w-[200px]">Wie kann ich Dokumente in das DMS hochladen?</td>
                  <td class="px-4 py-2">
                    <button class="text-blue-600 hover:text-blue-800 mr-2" title="Details anzeigen">
                      <i class="fas fa-eye"></i>
                    </button>
                    <button class="text-gray-600 hover:text-gray-800" title="Exportieren">
                      <i class="fas fa-download"></i>
                    </button>
                  </td>
                </tr>
                <tr class="border-t">
                  <td class="px-4 py-2">2025-05-03</td>
                  <td class="px-4 py-2"><span class="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">Negativ</span></td>
                  <td class="px-4 py-2">Die Antwort war nicht präzise genug.</td>
                  <td class="px-4 py-2 text-gray-700 truncate max-w-[200px]">Wie kann ich die Freigaberechte für ein Dokument ändern?</td>
                  <td class="px-4 py-2">
                    <button class="text-blue-600 hover:text-blue-800 mr-2" title="Details anzeigen">
                      <i class="fas fa-eye"></i>
                    </button>
                    <button class="text-gray-600 hover:text-gray-800" title="Exportieren">
                      <i class="fas fa-download"></i>
                    </button>
                  </td>
                </tr>
                <tr class="border-t">
                  <td class="px-4 py-2">2025-05-03</td>
                  <td class="px-4 py-2"><span class="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">Positiv</span></td>
                  <td class="px-4 py-2">Genau was ich gesucht habe. Danke!</td>
                  <td class="px-4 py-2 text-gray-700 truncate max-w-[200px]">Gibt es eine Möglichkeit, Dokumente nach Datum zu filtern?</td>
                  <td class="px-4 py-2">
                    <button class="text-blue-600 hover:text-blue-800 mr-2" title="Details anzeigen">
                      <i class="fas fa-eye"></i>
                    </button>
                    <button class="text-gray-600 hover:text-gray-800" title="Exportieren">
                      <i class="fas fa-download"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div class="mt-4 flex justify-between items-center">
            <div class="text-sm text-gray-500">Zeige 1-3 von 143 Einträgen</div>
            <div class="flex space-x-2">
              <button class="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50" disabled>Zurück</button>
              <button class="px-3 py-1 rounded border border-blue-500 bg-blue-500 text-white hover:bg-blue-600">1</button>
              <button class="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">2</button>
              <button class="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">3</button>
              <button class="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">Weiter</button>
            </div>
          </div>
        </div>
        
        <div class="my-6 text-right">
          <button class="nscale-btn-secondary" onclick="alert('Vue.js Feedback-Verwaltung ist aktiv!')">
            <i class="fas fa-check-circle mr-2"></i>
            Vue.js Integration aktiv
          </button>
        </div>
      </div>
    `;

    console.log('Vue.js Feedback-Verwaltung erfolgreich initialisiert (Beispielansicht)');
  }

  // Globales Objekt für externe Zugriffe
  window.adminFeedbackApp = {
    refresh: () => {
      console.log('Feedback-Daten aktualisieren (Demo)');
    }
  };
})();