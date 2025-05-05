/**
 * Fix für die Feature-UI im Admin-Panel
 * Behebt das "Wird geladen..." Problem und initialisiert die UI-Einstellungen
 */

console.log('Features-UI-Fix geladen');

// Funktion zum Aktualisieren des UI-Status
function updateFeatureUIStatus() {
  console.log('Aktualisiere Feature-UI-Status');
  
  // Element für aktuellen UI-Status finden
  const currentUISettingElement = document.getElementById('currentUISetting');
  if (!currentUISettingElement) {
    console.warn('UI-Settings-Element nicht gefunden, prüfe Tab-Aktivierung');
    
    // Tab-Click-Handler für Features-Tab
    const featureTabButton = document.querySelector('button[data-tab="features"]');
    if (featureTabButton) {
      console.log('Features-Tab-Button gefunden, füge Click-Handler hinzu');
      featureTabButton.addEventListener('click', function() {
        console.log('Features-Tab angeklickt');
        // Verzögerung für DOM-Update
        setTimeout(updateFeatureUIStatus, 100);
      });
    }
    return;
  }
  
  // Settings aus localStorage abrufen
  const useNewUI = localStorage.getItem('useNewUI') === 'true';
  const vueDocConverter = localStorage.getItem('feature_vueDocConverter') !== 'false';
  const vueChat = localStorage.getItem('feature_vueChat') === 'true';
  const vueAdmin = localStorage.getItem('feature_vueAdmin') === 'true';
  const vueSettings = localStorage.getItem('feature_vueSettings') === 'true';
  
  // Aktuellen UI-Status anzeigen
  currentUISettingElement.innerHTML = useNewUI 
    ? '<span class="text-green-600"><i class="fas fa-check-circle mr-2"></i>Vue.js-UI aktiv</span>'
    : '<span class="text-blue-600"><i class="fas fa-info-circle mr-2"></i>Klassische UI aktiv</span>';
  
  console.log('UI-Status aktualisiert:', { useNewUI, vueDocConverter, vueChat, vueAdmin, vueSettings });
  
  // Button-Handler hinzufügen
  setupButtonHandlers();
  
  // Weitere Status-Elemente aktualisieren
  updateDeveloperModeStatus();
  updateDocConverterImplementationStatus();
}

// Entwicklermodus-Status aktualisieren
function updateDeveloperModeStatus() {
  // Versuche den Status sowohl mit der neuen als auch mit der alten ID zu aktualisieren
  const possibleElements = [
    document.getElementById('developerModeStatus'),
    document.getElementById('currentDevModeSetting')
  ];
  
  for (const element of possibleElements) {
    if (element) {
      const isDeveloperMode = localStorage.getItem('developerMode') === 'true';
      element.innerHTML = isDeveloperMode 
        ? '<span class="text-green-600"><i class="fas fa-check-circle mr-2"></i>Aktiviert</span>'
        : '<span class="text-gray-500"><i class="fas fa-times-circle mr-2"></i>Deaktiviert</span>';
    }
  }
  
  // Auch die Toggle-Buttons funktionsfähig machen
  const enableDevModeButton = document.getElementById('enableDevModeButton');
  const disableDevModeButton = document.getElementById('disableDevModeButton');
  
  if (enableDevModeButton) {
    enableDevModeButton.addEventListener('click', function() {
      localStorage.setItem('developerMode', 'true');
      updateDeveloperModeStatus();
      alert('Entwicklermodus wurde aktiviert. Die Seite wird neu geladen.');
      window.location.reload();
    });
  }
  
  if (disableDevModeButton) {
    disableDevModeButton.addEventListener('click', function() {
      localStorage.setItem('developerMode', 'false');
      updateDeveloperModeStatus();
      alert('Entwicklermodus wurde deaktiviert. Die Seite wird neu geladen.');
      window.location.reload();
    });
  }
}

// Dokumentenkonverter-Implementierungsstatus aktualisieren
function updateDocConverterImplementationStatus() {
  // Versuche den Status sowohl mit der neuen als auch mit der alten ID zu aktualisieren
  const possibleElements = [
    document.getElementById('docConverterImplementationStatus'),
    document.getElementById('currentDocConverterSetting')
  ];
  
  for (const element of possibleElements) {
    if (element) {
      const useVueDocConverter = localStorage.getItem('feature_vueDocConverter') !== 'false';
      element.innerHTML = useVueDocConverter 
        ? '<span class="text-green-600"><i class="fas fa-check-circle mr-2"></i>Vue.js-Implementierung</span>'
        : '<span class="text-blue-600"><i class="fas fa-info-circle mr-2"></i>Klassische Implementierung</span>';
    }
  }
}

// Button-Click-Handler einrichten
function setupButtonHandlers() {
  console.log('Richte Button-Handler ein');
  
  // Vue.js aktivieren Button
  const enableVueButton = document.getElementById('enableVueButton');
  if (enableVueButton) {
    console.log('Vue-Button gefunden, füge Handler hinzu');
    enableVueButton.addEventListener('click', function() {
      localStorage.setItem('useNewUI', 'true');
      localStorage.setItem('feature_vueDocConverter', 'true');
      localStorage.setItem('feature_vueChat', 'true');
      localStorage.setItem('feature_vueAdmin', 'true');
      localStorage.setItem('feature_vueSettings', 'true');
      alert('Vue.js-UI wurde aktiviert. Die Seite wird neu geladen.');
      window.location.reload();
    });
  }
  
  // Klassische UI aktivieren Button
  const enableClassicButton = document.getElementById('enableClassicButton');
  if (enableClassicButton) {
    console.log('Classic-Button gefunden, füge Handler hinzu');
    enableClassicButton.addEventListener('click', function() {
      localStorage.setItem('useNewUI', 'false');
      localStorage.setItem('feature_vueDocConverter', 'false');
      localStorage.setItem('feature_vueChat', 'false');
      localStorage.setItem('feature_vueAdmin', 'false');
      localStorage.setItem('feature_vueSettings', 'false');
      alert('Klassische UI wurde aktiviert. Die Seite wird neu geladen.');
      window.location.reload();
    });
  }
  
  // Komponentenstatus finden und aktualisieren
  const componentStatusElements = {
    vueDocConverter: document.getElementById('status-docConverter'),
    vueChat: document.getElementById('status-chat'),
    vueAdmin: document.getElementById('status-admin'),
    vueSettings: document.getElementById('status-settings')
  };
  
  // Status-Texte aktualisieren
  for (const [feature, element] of Object.entries(componentStatusElements)) {
    if (element) {
      const isActive = localStorage.getItem(`feature_${feature}`) === 'true';
      element.innerHTML = isActive 
        ? '<span class="text-green-600"><i class="fas fa-check-circle mr-1"></i>Aktiv</span>'
        : '<span class="text-gray-500"><i class="fas fa-times-circle mr-1"></i>Inaktiv</span>';
    }
  }
  
  // Feature-Toggle-Container finden
  const featureToggleContainer = document.getElementById('feature-toggle-container');
  if (!featureToggleContainer) {
    console.warn('Feature-Toggle-Container nicht gefunden, überspringe Initialisierung');
    return;
  }
  
  // Funktionen für die Feature-Toggle-UI
  function initFeatureToggleHTML(container) {
    if (!container) {
      console.error('Container für Feature-Toggle-UI nicht gefunden');
      return;
    }
    
    // Features aus dem LocalStorage abrufen
    const useNewUI = localStorage.getItem('useNewUI') === 'true';
    const vueDocConverter = localStorage.getItem('feature_vueDocConverter') !== 'false';
    const vueChat = localStorage.getItem('feature_vueChat') === 'true';
    const vueAdmin = localStorage.getItem('feature_vueAdmin') === 'true';
    const vueSettings = localStorage.getItem('feature_vueSettings') === 'true';
    const devMode = localStorage.getItem('devMode') === 'true';
    
    // HTML für die modernisierte Feature-Toggle-UI erstellen
    container.innerHTML = `
      <div class="flex flex-col">
        <!-- UI-Version -->
        <div class="admin-card mb-6">
          <div class="admin-card-title">UI & Framework</div>
          <div class="admin-card-content">
            <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
              <div class="flex">
                <div class="flex-shrink-0">
                  <i class="fas fa-info-circle text-blue-500"></i>
                </div>
                <div class="ml-3">
                  <p class="text-sm text-blue-700">
                    Diese Einstellungen steuern die Verwendung des modernen Vue.js-Frameworks im Vergleich zur klassischen UI-Implementierung.
                  </p>
                </div>
              </div>
            </div>
            
            <div class="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <div class="font-medium text-lg">UI-Version</div>
                <p class="text-sm text-gray-600 mt-1">Wähle zwischen der klassischen und der modernen Vue.js-basierten Benutzeroberfläche</p>
              </div>
              <div class="flex items-center">
                <div id="currentUIStatus" class="mr-4">
                  ${useNewUI 
                    ? '<span class="text-green-600 font-medium"><i class="fas fa-check-circle mr-2"></i>Vue.js-UI aktiv</span>'
                    : '<span class="text-blue-600 font-medium"><i class="fas fa-info-circle mr-2"></i>Klassische UI aktiv</span>'}
                </div>
                
                <label class="toggle-switch">
                  <input type="checkbox" id="uiToggle" ${useNewUI ? 'checked' : ''}>
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
            
            <!-- Schnellwechsel-Buttons entfernt, da der Toggle-Switch ausreicht -->
          </div>
        </div>
        
        <!-- Komponenten Status: Modernisiert mit Toggle-Switches -->
        <div class="admin-card mb-6">
          <div class="admin-card-title">Vue.js-Komponenten</div>
          <div class="admin-card-content">
            <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
              <div class="flex">
                <div class="flex-shrink-0">
                  <i class="fas fa-info-circle text-blue-500"></i>
                </div>
                <div class="ml-3">
                  <p class="text-sm text-blue-700">
                    Hier kannst du einzelne Komponenten zwischen Vue.js und klassischer Implementierung umschalten. 
                    <strong>Hinweis:</strong> Nur der Dokumentenkonverter ist derzeit vollständig als Vue.js-Komponente verfügbar.
                  </p>
                </div>
              </div>
            </div>
          
            <!-- Dokumentenkonverter -->
            <div class="component-toggle-item">
              <div class="component-info">
                <div class="component-name">Dokumentenkonverter</div>
                <div class="component-desc">Konvertiert PDF, Word, Excel und mehr zu Volltext</div>
                <div class="component-status">
                  <div class="status-badge ${vueDocConverter ? 'status-ready' : 'status-inactive'}">
                    ${vueDocConverter 
                      ? '<i class="fas fa-check-circle mr-1"></i>Vue.js-Implementierung' 
                      : '<i class="fas fa-info-circle mr-1"></i>Klassische Implementierung'}
                  </div>
                </div>
              </div>
              <div class="component-actions">
                <label class="toggle-switch" title="Dokumentenkonverter-Implementierung umschalten">
                  <input type="checkbox" id="docConverterToggle" ${vueDocConverter ? 'checked' : ''}>
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
            
            <!-- Chat-Interface -->
            <div class="component-toggle-item">
              <div class="component-info">
                <div class="component-name">Chat-Interface</div>
                <div class="component-desc">Hauptinterface für Benutzer-Interaktionen</div>
                <div class="component-status">
                  <div class="status-badge status-wip">
                    <i class="fas fa-clock mr-1"></i>In Entwicklung (75%)
                  </div>
                </div>
              </div>
              <div class="component-actions">
                <label class="toggle-switch disabled" title="Diese Komponente ist noch in Entwicklung">
                  <input type="checkbox" id="chatToggle" ${vueChat ? 'checked' : ''} disabled>
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
            
            <!-- Admin-Panel -->
            <div class="component-toggle-item">
              <div class="component-info">
                <div class="component-name">Admin-Panel</div>
                <div class="component-desc">Verwaltungsoberfläche für Administratoren</div>
                <div class="component-status">
                  <div class="status-badge status-wip">
                    <i class="fas fa-clock mr-1"></i>In Entwicklung
                  </div>
                </div>
              </div>
              <div class="component-actions">
                <label class="toggle-switch disabled" title="Diese Komponente ist noch in Entwicklung">
                  <input type="checkbox" id="adminToggle" ${vueAdmin ? 'checked' : ''} disabled>
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
            
            <!-- Einstellungen -->
            <div class="component-toggle-item">
              <div class="component-info">
                <div class="component-name">Einstellungen</div>
                <div class="component-desc">Benutzerbezogene Konfigurationsoptionen</div>
                <div class="component-status">
                  <div class="status-badge status-wip">
                    <i class="fas fa-clock mr-1"></i>In Entwicklung (90%)
                  </div>
                </div>
              </div>
              <div class="component-actions">
                <label class="toggle-switch disabled" title="Diese Komponente ist noch in Entwicklung">
                  <input type="checkbox" id="settingsToggle" ${vueSettings ? 'checked' : ''} disabled>
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Entwickler-Optionen -->
        <div class="admin-card">
          <div class="admin-card-title">Entwickler-Optionen</div>
          <div class="admin-card-content">
            <div class="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4">
              <div class="flex">
                <div class="flex-shrink-0">
                  <i class="fas fa-exclamation-triangle text-yellow-500"></i>
                </div>
                <div class="ml-3">
                  <p class="text-sm text-yellow-700">
                    <strong>Achtung:</strong> Diese Optionen sind für Entwicklungszwecke gedacht. Die Aktivierung des Entwicklermodus kann die Stabilität beeinträchtigen.
                  </p>
                </div>
              </div>
            </div>
          
            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div class="font-medium">Entwicklermodus</div>
                <p class="text-sm text-gray-600 mt-1">Aktiviert erweiterte Debug-Funktionen und Logging</p>
              </div>
              <div class="flex items-center">
                <div id="devModeStatus" class="mr-4">
                  ${devMode 
                    ? '<span class="text-green-600 font-medium"><i class="fas fa-check-circle mr-2"></i>Aktiviert</span>'
                    : '<span class="text-gray-500 font-medium"><i class="fas fa-times-circle mr-2"></i>Deaktiviert</span>'}
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" id="devModeToggle" ${devMode ? 'checked' : ''}>
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
            
            <div class="mt-4 p-4 bg-gray-50 rounded-lg">
              <div class="font-medium mb-2">Debug-Informationen</div>
              <div class="text-sm text-gray-700">
                <div><strong>Browser:</strong> ${navigator.userAgent}</div>
                <div><strong>Viewport:</strong> ${window.innerWidth}x${window.innerHeight}</div>
                <div><strong>LocalStorage verfügbar:</strong> ${typeof localStorage !== 'undefined'}</div>
                <div><strong>Vue.js global:</strong> ${typeof window.Vue !== 'undefined'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // CSS für Toggle-Switch hinzufügen
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      /* Toggle Switch */
      .toggle-switch {
        position: relative;
        display: inline-block;
        width: 50px;
        height: 24px;
      }
      
      .toggle-switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }
      
      .toggle-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #ccc;
        transition: .4s;
        border-radius: 24px;
      }
      
      .toggle-slider:before {
        position: absolute;
        content: "";
        height: 18px;
        width: 18px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        transition: .4s;
        border-radius: 50%;
      }
      
      input:checked + .toggle-slider {
        background-color: #00a550;
      }
      
      input:focus + .toggle-slider {
        box-shadow: 0 0 1px #00a550;
      }
      
      input:checked + .toggle-slider:before {
        transform: translateX(26px);
      }
      
      /* Disabled toggle */
      .toggle-switch.disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      
      .toggle-switch.disabled .toggle-slider {
        cursor: not-allowed;
      }
      
      /* Component Toggle Items */
      .component-toggle-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        margin-bottom: 1rem;
        transition: all 0.2s;
      }
      
      .component-toggle-item:hover {
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      }
      
      .component-info {
        flex: 1;
      }
      
      .component-name {
        font-weight: 600;
        margin-bottom: 0.25rem;
      }
      
      .component-desc {
        font-size: 0.875rem;
        color: #6b7280;
        margin-bottom: 0.5rem;
      }
      
      .status-badge {
        display: inline-flex;
        align-items: center;
        padding: 0.25rem 0.75rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 500;
      }
      
      .status-ready {
        background-color: #dcfce7;
        color: #166534;
      }
      
      .status-inactive {
        background-color: #dbeafe;
        color: #1e40af;
      }
      
      .status-wip {
        background-color: #fef3c7;
        color: #92400e;
      }
    `;
    document.head.appendChild(styleElement);
    
    // Event-Listener für Schnellwechsel-Buttons entfernt, da wir jetzt nur noch die Toggle-Switches verwenden
    
    // Neue Toggle-Switches
    
    // UI-Toggle
    document.getElementById('uiToggle').addEventListener('change', function() {
      const isChecked = this.checked;
      console.log(`UI-Toggle umgeschaltet: ${isChecked}`);
      
      localStorage.setItem('useNewUI', isChecked.toString());
      
      // Status aktualisieren ohne Reload
      const statusElement = document.getElementById('currentUIStatus');
      if (statusElement) {
        statusElement.innerHTML = isChecked
          ? '<span class="text-green-600 font-medium"><i class="fas fa-check-circle mr-2"></i>Vue.js-UI aktiv</span>'
          : '<span class="text-blue-600 font-medium"><i class="fas fa-info-circle mr-2"></i>Klassische UI aktiv</span>';
      }
      
      // Frage, ob sofort oder beim nächsten Laden aktualisiert werden soll
      if (confirm('Möchten Sie die Änderungen durch einen Seitenneuladen sofort anwenden?')) {
        window.location.reload();
      }
    });
    
    // Doc-Converter-Toggle - sollte als einziges wirklich funktionieren
    document.getElementById('docConverterToggle').addEventListener('change', function() {
      const isChecked = this.checked;
      console.log(`DocConverter-Toggle umgeschaltet: ${isChecked}`);
      
      localStorage.setItem('feature_vueDocConverter', isChecked.toString());
      
      // Status-Badge aktualisieren
      const statusContainer = this.closest('.component-toggle-item').querySelector('.status-badge');
      if (statusContainer) {
        statusContainer.className = isChecked ? 'status-badge status-ready' : 'status-badge status-inactive';
        statusContainer.innerHTML = isChecked
          ? '<i class="fas fa-check-circle mr-1"></i>Vue.js-Implementierung'
          : '<i class="fas fa-info-circle mr-1"></i>Klassische Implementierung';
      }
      
      // Frage, ob sofort aktualisiert werden soll
      if (confirm('Möchten Sie die Änderung des Dokumentenkonverters durch einen Seitenneuladen sofort anwenden?')) {
        window.location.reload();
      }
    });
    
    // Entwicklermodus-Toggle
    document.getElementById('devModeToggle').addEventListener('change', function() {
      const isChecked = this.checked;
      console.log(`Entwicklermodus-Toggle umgeschaltet: ${isChecked}`);
      
      localStorage.setItem('devMode', isChecked.toString());
      
      // Status aktualisieren ohne Reload
      const statusElement = document.getElementById('devModeStatus');
      if (statusElement) {
        statusElement.innerHTML = isChecked
          ? '<span class="text-green-600 font-medium"><i class="fas fa-check-circle mr-2"></i>Aktiviert</span>'
          : '<span class="text-gray-500 font-medium"><i class="fas fa-times-circle mr-2"></i>Deaktiviert</span>';
      }
      
      // Frage, ob sofort aktualisiert werden soll
      if (confirm('Möchten Sie die Änderungen des Entwicklermodus durch einen Seitenneuladen sofort anwenden?')) {
        window.location.reload();
      }
    });
  }
  
  // Initialisiere Feature-Toggle-UI
  initFeatureToggleHTML(featureToggleContainer);
}

// Globale initFeatureUI-Funktion registrieren
window.initFeatureUI = function() {
  console.log('Externe initFeatureUI aufgerufen');
  updateFeatureUIStatus();
};

// Initialisieren nach DOM-Laden
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM geladen, initialisiere Features-UI-Fix');
  
  // Sofortige Initialisierung durchführen
  updateFeatureUIStatus();
  
  // Auch den Admin-Tab beobachten, falls der aktuelle Tab gewechselt wird
  const adminTabs = document.querySelectorAll('.admin-tab-button');
  adminTabs.forEach(tab => {
    tab.addEventListener('click', function() {
      if (this.getAttribute('data-tab') === 'features') {
        console.log('Features-Tab durch Klick aktiviert');
        setTimeout(updateFeatureUIStatus, 100);
      }
    });
  });
});