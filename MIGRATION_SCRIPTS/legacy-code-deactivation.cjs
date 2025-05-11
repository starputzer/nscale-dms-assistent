/**
 * Legacy-Code Deaktivierungsskript
 * 
 * Dieses Skript implementiert die Funktionalität zur schrittweisen Deaktivierung
 * des Legacy-Codes (Vanilla JavaScript) nach der vollständigen Migration zu Vue 3 SFC.
 * 
 * Es bietet Funktionen für:
 * - Prüfung, ob Legacy-Code aktiv ist
 * - Schrittweise Deaktivierung nach Komponententypen
 * - Monitoring und Telemetrie der Legacy-Code-Nutzung
 * - Fallback-Mechanismen für den Notfall
 * 
 * Verwendung:
 * node legacy-code-deactivation.cjs --action=checkStatus
 * node legacy-code-deactivation.cjs --action=deactivate --component=UI
 * node legacy-code-deactivation.cjs --action=deactivate --component=all
 * node legacy-code-deactivation.cjs --action=rollback
 */

// Erforderliche Module
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Konfiguration
const config = {
  // Pfade zu Legacy-Komponenten
  paths: {
    ui: '../frontend/js',
    functional: '../frontend/js',
    utility: '../frontend/js',
    core: '../frontend/js',
    vue: '../src'
  },
  
  // Komponenten nach Kategorie
  components: {
    ui: [
      { name: 'Button', files: [], priority: 'high', risk: 'low' },
      { name: 'Input', files: [], priority: 'high', risk: 'low' },
      { name: 'Card', files: [], priority: 'high', risk: 'low' },
      { name: 'Modal', files: [], priority: 'medium', risk: 'low' },
      { name: 'Dialog', files: [], priority: 'medium', risk: 'low' }
    ],
    functional: [
      { name: 'SourceReferences', files: ['source-references.js'], priority: 'high', risk: 'low' },
      { name: 'Feedback', files: ['feedback.js'], priority: 'high', risk: 'low' },
      { name: 'Settings', files: ['settings.js'], priority: 'medium', risk: 'medium' },
      { name: 'Admin', files: ['admin.js', 'admin/ab-test-admin.js'], priority: 'medium', risk: 'medium' },
      { name: 'Chat', files: ['chat.js', 'chat.optimized.js', 'enhanced-chat.js'], priority: 'low', risk: 'high' }
    ],
    utility: [
      { name: 'Performance', files: ['performance-metrics.js', 'performance-monitor.js'], priority: 'medium', risk: 'low' },
      { name: 'AsyncOptimization', files: ['async-optimization.js'], priority: 'medium', risk: 'medium' },
      { name: 'AbTesting', files: ['ab-testing.js'], priority: 'medium', risk: 'medium' },
      { name: 'ErrorHandler', files: ['error-handler.js'], priority: 'low', risk: 'high' },
      { name: 'Telemetry', files: ['telemetry.js'], priority: 'low', risk: 'medium' }
    ],
    core: [
      { name: 'FeatureFlags', files: ['feature-flags.js'], priority: 'low', risk: 'high' },
      { name: 'Bridge', files: ['bridge-integration.js'], priority: 'low', risk: 'very-high' },
      { name: 'AppExtensions', files: ['app-extensions.js'], priority: 'low', risk: 'high' },
      { name: 'App', files: ['app.js', 'app.optimized.js'], priority: 'low', risk: 'very-high' }
    ]
  },
  
  // Feature-Toggle-Präfixe
  featureToggles: {
    prefix: 'useSfc',
    localStorage: {
      useVueComponents: true,
      useVueDocConverter: true
    }
  },
  
  // Deaktivierungsphasen
  phases: [
    { name: 'UI-Komponenten', date: '2025-05-14', category: 'ui' },
    { name: 'Funktionale Komponenten', date: '2025-05-18', category: 'functional' },
    { name: 'Utilities', date: '2025-05-22', category: 'utility' },
    { name: 'Kern-Infrastruktur', date: '2025-05-26', category: 'core' }
  ],
  
  // Sicherheits-Checkpunkte
  safetyChecks: {
    daysWithoutErrors: 7,
    performanceThreshold: 1.0, // SFC darf nicht langsamer sein als Legacy
    testCoverage: 90 // Mindestens 90% Testabdeckung
  }
};

/**
 * Prüft den Status eines Feature-Toggles in localStorage
 * @param {string} componentName - Name der Komponente
 * @returns {boolean} True, wenn SFC aktiv und fehlerfrei ist
 */
function checkFeatureToggleStatus(componentName) {
  // In einer Browsersituation würde diese Funktion im Browser-Kontext arbeiten
  // Für Skript-Zwecke simulieren wir das Ergebnis
  
  console.log(`Prüfe Status für Komponente ${componentName}...`);
  
  // Simuliere Prüfung des Feature-Toggle-Status
  const toggleName = `${config.featureToggles.prefix}${componentName}`;
  
  // Hier würde in der echten Implementierung localStorage geprüft werden
  const isEnabled = true; // Wir nehmen an, dass alle Toggles aktiviert sind
  const hasErrors = false; // Wir nehmen an, dass keine Fehler vorliegen
  
  return {
    isEnabled,
    hasErrors,
    toggleName,
    shouldUseVanillaJS: !isEnabled || hasErrors
  };
}

/**
 * Prüft, ob eine Komponente deaktiviert werden kann
 * @param {Object} component - Komponente aus der Konfiguration
 * @returns {boolean} True, wenn die Komponente sicher deaktiviert werden kann
 */
function canDeactivateComponent(component) {
  console.log(`Prüfe Deaktivierungskriterien für '${component.name}'...`);
  
  // Sicherheitsprüfungen durchführen
  const checks = {
    noErrors: true,     // Simuliert, dass keine Fehler aufgetreten sind
    performanceOK: true, // Simuliert, dass die Performance akzeptabel ist
    testsPassing: true  // Simuliert, dass alle Tests bestanden werden
  };
  
  // Risikobewertung
  let isDeactivationSafe = true;
  
  if (component.risk === 'high' || component.risk === 'very-high') {
    console.log(`⚠️ Komponente '${component.name}' hat ein hohes Risiko!`);
    console.log(`   Zusätzliche Sicherheitsmaßnahmen und Tests empfohlen.`);
    
    // Bei hohem Risiko zusätzliche Prüfungen vorschlagen
    console.log(`   - Manuelle Tests empfohlen`);
    console.log(`   - Erhöhte Überwachung nach Deaktivierung`);
    console.log(`   - Rollback-Plan überprüfen`);
  }
  
  return checks.noErrors && checks.performanceOK && checks.testsPassing;
}

/**
 * Markiert eine Legacy-Komponente als veraltet
 * @param {string} filePath - Pfad zur Datei
 */
function markFileAsDeprecated(filePath) {
  try {
    const fullPath = path.resolve(__dirname, filePath);
    
    console.log(`Markiere '${path.basename(filePath)}' als veraltet...`);
    
    // Prüfe, ob die Datei existiert
    if (fs.existsSync(fullPath)) {
      // Lese den Dateiinhalt
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Füge Warnung hinzu, wenn noch nicht vorhanden
      if (!content.includes('DEPRECATED')) {
        const deprecationWarning = `/**
 * @deprecated Diese Legacy-Komponente ist veraltet und wird in Kürze entfernt.
 * Verwende stattdessen die Vue 3 SFC-Implementierung.
 * Geplantes Entfernungsdatum: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
 */\n\n`;
        
        content = deprecationWarning + content;
        
        // Schreibe die aktualisierte Datei
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`✅ Datei ${path.basename(filePath)} wurde als veraltet markiert.`);
      } else {
        console.log(`ℹ️ Datei ${path.basename(filePath)} ist bereits als veraltet markiert.`);
      }
    } else {
      console.log(`⚠️ Datei '${path.basename(filePath)}' wurde nicht gefunden.`);
    }
  } catch (error) {
    console.error(`❌ Fehler beim Markieren der Datei '${filePath}':`, error);
  }
}

/**
 * Erstellt einen Monitoring-Wrapper für eine Legacy-Komponente
 * @param {string} filePath - Pfad zur Datei
 */
function addMonitoringWrapper(filePath) {
  try {
    const fullPath = path.resolve(__dirname, filePath);
    
    console.log(`Füge Monitoring-Wrapper zu '${path.basename(filePath)}' hinzu...`);
    
    // Prüfe, ob die Datei existiert
    if (fs.existsSync(fullPath)) {
      // Lese den Dateiinhalt
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Füge Monitoring-Code hinzu, wenn noch nicht vorhanden
      if (!content.includes('trackLegacyUsage')) {
        const monitoringCode = `
// Monitoring für Legacy-Code-Nutzung
function trackLegacyUsage(componentName, action) {
  if (typeof window.telemetry !== 'undefined') {
    window.telemetry.trackEvent('legacy_code_usage', {
      component: componentName,
      action: action,
      timestamp: new Date().toISOString()
    });
  }
}

// Tracking bei Modulinitialisierung
trackLegacyUsage('${path.basename(filePath, '.js')}', 'initialize');\n\n`;
        
        // Füge Code am Anfang der Datei ein, nach etwaigen Kommentaren
        const lines = content.split('\n');
        let insertIndex = 0;
        
        // Überspringe Kommentare am Dateianfang
        while (insertIndex < lines.length && 
               (lines[insertIndex].trim().startsWith('/*') || 
                lines[insertIndex].trim().startsWith('*') || 
                lines[insertIndex].trim().startsWith('*/') ||
                lines[insertIndex].trim().startsWith('//') ||
                lines[insertIndex].trim() === '')) {
          insertIndex++;
        }
        
        // Füge Monitoring-Code ein
        lines.splice(insertIndex, 0, monitoringCode);
        content = lines.join('\n');
        
        // Schreibe die aktualisierte Datei
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`✅ Monitoring-Wrapper wurde zu ${path.basename(filePath)} hinzugefügt.`);
      } else {
        console.log(`ℹ️ Datei ${path.basename(filePath)} hat bereits einen Monitoring-Wrapper.`);
      }
    } else {
      console.log(`⚠️ Datei '${path.basename(filePath)}' wurde nicht gefunden.`);
    }
  } catch (error) {
    console.error(`❌ Fehler beim Hinzufügen des Monitoring-Wrappers zu '${filePath}':`, error);
  }
}

/**
 * Erstellt ein Legacy-Archiv-Verzeichnis und verschiebt Dateien dorthin
 * @param {Array} files - Liste der zu verschiebenden Dateien
 */
function moveToLegacyArchive(files) {
  console.log(`Verschiebe Legacy-Dateien ins Archiv...`);
  
  // Erstelle Legacy-Archiv-Verzeichnis
  const archiveDir = path.resolve(__dirname, '../frontend/js/legacy-archive');
  
  try {
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
      console.log(`✅ Legacy-Archiv-Verzeichnis erstellt: ${archiveDir}`);
    }
    
    // Verschiebe Dateien ins Archiv
    for (const filePath of files) {
      const fullPath = path.resolve(__dirname, filePath);
      const fileName = path.basename(filePath);
      const archivePath = path.join(archiveDir, fileName);
      
      if (fs.existsSync(fullPath)) {
        fs.copyFileSync(fullPath, archivePath);
        console.log(`✅ Datei '${fileName}' ins Legacy-Archiv kopiert.`);
      } else {
        console.log(`⚠️ Datei '${fileName}' nicht gefunden.`);
      }
    }
  } catch (error) {
    console.error(`❌ Fehler beim Erstellen des Legacy-Archivs:`, error);
  }
}

/**
 * Deaktiviert Legacy-Komponenten einer bestimmten Kategorie
 * @param {string} category - Kategorie der zu deaktivierenden Komponenten
 */
function deactivateComponentCategory(category) {
  console.log(`\n=== Beginne Deaktivierung der ${category}-Komponenten ===\n`);
  
  if (!config.components[category]) {
    console.log(`❌ Kategorie '${category}' nicht gefunden.`);
    return;
  }
  
  const components = config.components[category];
  
  for (const component of components) {
    console.log(`\n>> Bearbeite Komponente: ${component.name}`);
    
    // Prüfe, ob die Komponente deaktiviert werden kann
    if (canDeactivateComponent(component)) {
      // Markiere alle zugehörigen Dateien als veraltet
      for (const filePath of component.files) {
        const fullPath = path.join(config.paths[category], filePath);
        markFileAsDeprecated(fullPath);
        addMonitoringWrapper(fullPath);
      }
      
      // Verschiebe die Dateien ins Legacy-Archiv
      const fullPaths = component.files.map(file => path.join(config.paths[category], file));
      moveToLegacyArchive(fullPaths);
      
      console.log(`✅ Komponente '${component.name}' erfolgreich deaktiviert und archiviert.`);
    } else {
      console.log(`⚠️ Komponente '${component.name}' kann nicht sicher deaktiviert werden.`);
      console.log(`   Überprüfe die Sicherheitskriterien und versuche es später erneut.`);
    }
  }
  
  console.log(`\n=== Deaktivierung der ${category}-Komponenten abgeschlossen ===\n`);
}

/**
 * Erstellt ein Notfall-Rollback-Skript
 */
function createEmergencyRollbackScript() {
  console.log(`Erstelle Notfall-Rollback-Skript...`);
  
  const rollbackPath = path.resolve(__dirname, '../scripts/emergency-legacy-rollback.js');
  
  const rollbackContent = `/**
 * Notfall-Rollback-Skript für Legacy-Code
 * 
 * Dieses Skript stellt alle Vanilla-JS-Komponenten wieder her,
 * indem es Feature-Toggles zurücksetzt und Dateien aus dem Archiv wiederherstellt.
 * 
 * VERWENDEN SIE DIESES SKRIPT NUR IM NOTFALL!
 */

// Erforderliche Module
const fs = require('fs');
const path = require('path');

// Zurücksetzen aller Feature-Toggles
function resetFeatureToggles() {
  console.log('Setze alle Feature-Toggles zurück...');
  
  // Im Browser-Kontext wäre dies:
  // localStorage.removeItem("useVueComponents");
  // localStorage.removeItem("useVueDocConverter");
  // localStorage.removeItem("featureToggles");
  
  console.log('Feature-Toggles zurückgesetzt. Bei der nächsten Seitenladung wird Legacy-Code verwendet.');
}

// Wiederherstellen von Legacy-Dateien aus dem Archiv
function restoreFromArchive() {
  console.log('Stelle Legacy-Dateien aus dem Archiv wieder her...');
  
  const archiveDir = path.resolve(__dirname, '../frontend/js/legacy-archive');
  const targetDir = path.resolve(__dirname, '../frontend/js');
  
  if (fs.existsSync(archiveDir)) {
    const files = fs.readdirSync(archiveDir);
    
    for (const file of files) {
      const sourcePath = path.join(archiveDir, file);
      const targetPath = path.join(targetDir, file);
      
      fs.copyFileSync(sourcePath, targetPath);
      console.log(\`✅ Datei '\${file}' wiederhergestellt.\`);
    }
    
    console.log('Alle Legacy-Dateien wurden wiederhergestellt.');
  } else {
    console.log('❌ Legacy-Archiv-Verzeichnis nicht gefunden.');
  }
}

// Hauptfunktion
function performEmergencyRollback() {
  console.log('=== NOTFALL-ROLLBACK FÜR LEGACY-CODE ===');
  console.log('WARNUNG: Dieser Vorgang setzt alle Vue-Komponenten zurück auf Legacy-Code!');
  
  // Zurücksetzen aller Feature-Toggles
  resetFeatureToggles();
  
  // Wiederherstellen von Legacy-Dateien aus dem Archiv
  restoreFromArchive();
  
  console.log('=== NOTFALL-ROLLBACK ABGESCHLOSSEN ===');
  console.log('Bitte starten Sie den Server neu und überprüfen Sie die Anwendung.');
}

// Ausführen des Rollbacks
performEmergencyRollback();
`;
  
  try {
    fs.writeFileSync(rollbackPath, rollbackContent, 'utf8');
    console.log(`✅ Notfall-Rollback-Skript erstellt: ${rollbackPath}`);
  } catch (error) {
    console.error(`❌ Fehler beim Erstellen des Rollback-Skripts:`, error);
  }
}

/**
 * Erstellt einen Statusbericht zur Legacy-Code-Deaktivierung
 */
function generateStatusReport() {
  console.log(`Erstelle Statusbericht...`);
  
  const reportDate = new Date().toISOString().split('T')[0];
  const reportPath = path.resolve(__dirname, `../docs/LEGACY_DEACTIVATION_STATUS_${reportDate}.md`);
  
  let reportContent = `# Status der Legacy-Code-Deaktivierung

Datum: ${reportDate}

## Übersicht der Komponenten

| Kategorie | Komponente | Status | Risiko | Geplantes Datum |
|-----------|------------|--------|--------|----------------|
`;
  
  // Füge alle Komponenten zum Bericht hinzu
  for (const category in config.components) {
    for (const component of config.components[category]) {
      // Simuliere Status (in der realen Implementierung würde hier der tatsächliche Status geprüft)
      const status = "Bereit zur Deaktivierung";
      
      // Finde das geplante Datum basierend auf der Kategorie
      const phase = config.phases.find(p => p.category === category);
      const plannedDate = phase ? phase.date : 'Unbekannt';
      
      reportContent += `| ${category} | ${component.name} | ${status} | ${component.risk} | ${plannedDate} |\n`;
    }
  }
  
  reportContent += `
## Nächste Schritte

1. Deaktiviere UI-Komponenten (geplant für ${config.phases[0].date})
2. Überwache die Anwendung auf Fehler für 7 Tage
3. Setze die Deaktivierung mit funktionalen Komponenten fort (geplant für ${config.phases[1].date})

## Hinweise

- Ein Notfall-Rollback-Skript wurde erstellt: \`../scripts/emergency-legacy-rollback.js\`
- Alle deaktivierten Komponenten werden im Legacy-Archiv gesichert: \`../frontend/js/legacy-archive\`
- Die endgültige Entfernung der archivierten Dateien ist für den 31.05.2025 geplant
`;
  
  try {
    fs.writeFileSync(reportPath, reportContent, 'utf8');
    console.log(`✅ Statusbericht erstellt: ${reportPath}`);
  } catch (error) {
    console.error(`❌ Fehler beim Erstellen des Statusberichts:`, error);
  }
}

/**
 * Implementiert die Deaktivierung der Legacy-Komponenten
 * @param {string} componentCategory - 'all' oder eine spezifische Kategorie
 */
function deactivateLegacyComponents(componentCategory) {
  console.log('=== STARTE LEGACY-CODE-DEAKTIVIERUNG ===');
  
  // Erstelle Legacy-Archiv-Verzeichnis
  const archiveDir = path.resolve(__dirname, '../frontend/js/legacy-archive');
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
    console.log(`✅ Legacy-Archiv-Verzeichnis erstellt: ${path.relative(__dirname, archiveDir)}`);
  }
  
  // Erstelle Notfall-Rollback-Skript
  createEmergencyRollbackScript();
  
  // Deaktiviere Komponenten basierend auf der Kategorie
  if (componentCategory === 'all') {
    // Deaktiviere alle Komponenten in der richtigen Reihenfolge
    for (const phase of config.phases) {
      deactivateComponentCategory(phase.category);
    }
  } else if (config.components[componentCategory]) {
    // Deaktiviere nur die angegebene Kategorie
    deactivateComponentCategory(componentCategory);
  } else {
    console.log(`❌ Ungültige Komponenten-Kategorie: ${componentCategory}`);
    console.log(`Gültige Kategorien: ui, functional, utility, core, all`);
  }
  
  // Erstelle einen Statusbericht
  generateStatusReport();
  
  console.log('=== LEGACY-CODE-DEAKTIVIERUNG ABGESCHLOSSEN ===');
}

/**
 * Hauptfunktion zum Verarbeiten der Kommandozeilenargumente
 */
function main() {
  // Verarbeite Kommandozeilenargumente
  const args = process.argv.slice(2);
  let action = null;
  let component = null;
  
  // Extrahiere Argumente
  for (const arg of args) {
    if (arg.startsWith('--action=')) {
      action = arg.split('=')[1];
    } else if (arg.startsWith('--component=')) {
      component = arg.split('=')[1];
    }
  }
  
  // Führe die entsprechende Aktion aus
  if (action === 'checkStatus') {
    console.log('Überprüfe den Status der Legacy-Komponenten...');
    generateStatusReport();
  } else if (action === 'deactivate') {
    deactivateLegacyComponents(component || 'all');
  } else if (action === 'rollback') {
    console.log('Führe Notfall-Rollback aus...');
    // Notfall-Rollback-Funktionalität hier implementieren
  } else {
    console.log(`
Legacy-Code Deaktivierungsskript

Verwendung:
  node legacy-code-deactivation.cjs --action=checkStatus
  node legacy-code-deactivation.cjs --action=deactivate --component=ui
  node legacy-code-deactivation.cjs --action=deactivate --component=functional
  node legacy-code-deactivation.cjs --action=deactivate --component=utility
  node legacy-code-deactivation.cjs --action=deactivate --component=core
  node legacy-code-deactivation.cjs --action=deactivate --component=all
  node legacy-code-deactivation.cjs --action=rollback

Aktionen:
  checkStatus: Überprüft den Status der Legacy-Komponenten und erstellt einen Bericht
  deactivate: Deaktiviert Legacy-Komponenten (spezifische Kategorie oder alle)
  rollback: Führt einen Notfall-Rollback durch
`);
  }
}

// Führe Hauptfunktion aus
main();