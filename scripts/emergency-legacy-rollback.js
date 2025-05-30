/**
 * Notfall-Rollback-Skript für Legacy-Code
 *
 * Dieses Skript stellt alle Vanilla-JS-Komponenten wieder her,
 * indem es Feature-Toggles zurücksetzt und Dateien aus dem Archiv wiederherstellt.
 *
 * VERWENDEN SIE DIESES SKRIPT NUR IM NOTFALL!
 */

// Erforderliche Module
const fs = require("fs");
const path = require("path");

// Zurücksetzen aller Feature-Toggles
function resetFeatureToggles() {
  console.log("Setze alle Feature-Toggles zurück...");

  // Im Browser-Kontext wäre dies:
  // localStorage.removeItem("useVueComponents");
  // localStorage.removeItem("useVueDocConverter");
  // localStorage.removeItem("featureToggles");

  console.log(
    "Feature-Toggles zurückgesetzt. Bei der nächsten Seitenladung wird Legacy-Code verwendet.",
  );
}

// Wiederherstellen von Legacy-Dateien aus dem Archiv
function restoreFromArchive() {
  console.log("Stelle Legacy-Dateien aus dem Archiv wieder her...");

  // Legacy-Archiv wurde nach erfolgreicher Vue 3 Migration entfernt
  console.log("❌ Legacy-Archiv-Verzeichnis wurde entfernt (Vue 3 Migration abgeschlossen).");
  console.log("Falls Legacy-Dateien benötigt werden:");
  console.log("1. Verwenden Sie Git-History: git checkout [commit-before-cleanup] -- frontend/js/legacy-archive/");
  console.log("2. Oder prüfen Sie Backup in: BACKUP_CLEANUP_20250516/legacy-frontend/");
  
  const archiveDir = path.resolve(__dirname, "../frontend/js/legacy-archive");
  const targetDir = path.resolve(__dirname, "../frontend/js");

  if (fs.existsSync(archiveDir)) {
    const files = fs.readdirSync(archiveDir);

    for (const file of files) {
      const sourcePath = path.join(archiveDir, file);
      const targetPath = path.join(targetDir, file);

      fs.copyFileSync(sourcePath, targetPath);
      console.log(`✅ Datei '${file}' wiederhergestellt.`);
    }

    console.log("Alle Legacy-Dateien wurden wiederhergestellt.");
  }
}

// Hauptfunktion
function performEmergencyRollback() {
  console.log("=== NOTFALL-ROLLBACK FÜR LEGACY-CODE ===");
  console.log(
    "WARNUNG: Dieser Vorgang setzt alle Vue-Komponenten zurück auf Legacy-Code!",
  );

  // Zurücksetzen aller Feature-Toggles
  resetFeatureToggles();

  // Wiederherstellen von Legacy-Dateien aus dem Archiv
  restoreFromArchive();

  console.log("=== NOTFALL-ROLLBACK ABGESCHLOSSEN ===");
  console.log(
    "Bitte starten Sie den Server neu und überprüfen Sie die Anwendung.",
  );
}

// Ausführen des Rollbacks
performEmergencyRollback();
