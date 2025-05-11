/**
 * Skript zur Identifikation ungenutzter Dateien im nscale DMS Assistenten
 *
 * Dieses Skript durchsucht das Projekt nach Dateien mit bestimmten Erweiterungen
 * und prüft, ob diese im Code referenziert werden. Nicht referenzierte Dateien
 * werden als potentiell ungenutzt betrachtet und in einer JSON-Datei gespeichert.
 */

const fs = require("fs");
const path = require("path");
const exec = require("child_process").execSync;

// Konfiguration
const rootDir = "../app";
const excludeDirs = ["node_modules", "dist", ".git", ".vscode", "coverage"];
const fileExtensions = [".js", ".vue", ".ts", ".css", ".scss"];

/**
 * Findet alle Dateien mit bestimmten Erweiterungen in einem Verzeichnis und seinen Unterverzeichnissen
 * @param {string} dir - Das zu durchsuchende Verzeichnis
 * @param {string[]} excludes - Zu ignorierende Verzeichnisse
 * @param {string[]} extensions - Zu suchende Dateierweiterungen
 * @returns {string[]} - Liste aller gefundenen Dateien
 */
function findAllFiles(dir, excludes, extensions) {
  let results = [];

  try {
    const list = fs.readdirSync(dir);

    list.forEach((file) => {
      const fullPath = path.join(dir, file);

      try {
        const stat = fs.statSync(fullPath);

        if (stat && stat.isDirectory() && !excludes.includes(file)) {
          results = results.concat(
            findAllFiles(fullPath, excludes, extensions),
          );
        } else if (extensions.some((ext) => file.endsWith(ext))) {
          results.push(fullPath);
        }
      } catch (statErr) {
        console.error(`Fehler beim Prüfen von ${fullPath}:`, statErr.message);
      }
    });
  } catch (readErr) {
    console.error(
      `Fehler beim Lesen des Verzeichnisses ${dir}:`,
      readErr.message,
    );
  }

  return results;
}

/**
 * Prüft, ob eine Datei im Code referenziert wird
 * @param {string} filePath - Pfad zur zu prüfenden Datei
 * @returns {boolean} - true, wenn die Datei referenziert wird, sonst false
 */
function isFileReferenced(filePath) {
  const fileName = path.basename(filePath);

  try {
    // Git grep nutzen, um Referenzen zu finden
    const result = exec(
      `git grep -l "${fileName}" -- "*.js" "*.ts" "*.vue" "*.json" "*.html"`,
    );
    const references = result.toString().trim().split("\n");

    // Selbstreferenzen ausschließen
    const nonSelfReferences = references.filter((ref) => ref !== filePath);

    return nonSelfReferences.length > 0;
  } catch (e) {
    // Wenn git grep nichts findet, wirft es einen Fehler
    return false;
  }
}

/**
 * Gruppiert ungenutzte Dateien nach Verzeichnissen
 * @param {string[]} files - Liste der ungenutzten Dateien
 * @returns {Object} - Nach Verzeichnissen gruppierte ungenutzte Dateien
 */
function groupByDirectory(files) {
  const grouped = {};

  files.forEach((file) => {
    const dir = path.dirname(file);

    if (!grouped[dir]) {
      grouped[dir] = [];
    }

    grouped[dir].push(path.basename(file));
  });

  return grouped;
}

/**
 * Analysiert Dateien mit Legacy-Code
 * @param {string[]} files - Alle gefundenen Dateien
 * @returns {string[]} - Dateien, die wahrscheinlich Legacy-Code enthalten
 */
function analyzeLegacyFiles(files) {
  const legacyPatterns = [
    "/frontend/js/",
    "/api/frontend/js/",
    ".optimized.js",
    "jquery",
    "legacy",
  ];

  return files.filter((file) =>
    legacyPatterns.some((pattern) => file.includes(pattern)),
  );
}

/**
 * Hauptfunktion zum Finden ungenutzter Dateien
 */
function findUnusedFiles() {
  console.log("Suche nach ungenutzten Dateien...");

  // Alle Dateien mit relevanten Erweiterungen finden
  const allFiles = findAllFiles(rootDir, excludeDirs, fileExtensions);
  console.log(`Gefunden: ${allFiles.length} Dateien insgesamt`);

  // Potentiell ungenutzte Dateien identifizieren
  const unusedFiles = allFiles.filter((file) => !isFileReferenced(file));

  // Legacy-Dateien identifizieren
  const legacyFiles = analyzeLegacyFiles(allFiles);

  // Nach Verzeichnissen gruppieren
  const groupedUnused = groupByDirectory(unusedFiles);
  const groupedLegacy = groupByDirectory(legacyFiles);

  // Ergebnisse ausgeben
  console.log(
    `\nGefunden: ${unusedFiles.length} potentiell ungenutzte Dateien`,
  );
  console.log(`Gefunden: ${legacyFiles.length} potentielle Legacy-Dateien`);

  // In Dateien speichern
  const results = {
    timestamp: new Date().toISOString(),
    totalFiles: allFiles.length,
    unusedFiles: {
      count: unusedFiles.length,
      list: unusedFiles,
      grouped: groupedUnused,
    },
    legacyFiles: {
      count: legacyFiles.length,
      list: legacyFiles,
      grouped: groupedLegacy,
    },
  };

  fs.writeFileSync(
    "unused-files-report.json",
    JSON.stringify(results, null, 2),
  );
  console.log("\nErgebnisse wurden in unused-files-report.json gespeichert");
}

// Skript ausführen
findUnusedFiles();
