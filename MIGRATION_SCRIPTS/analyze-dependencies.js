/**
 * Skript zur Analyse von Abhängigkeiten im nscale DMS Assistenten
 * 
 * Dieses Skript durchsucht den Vue 3-Code nach Imports aus Legacy-Codebereichen
 * und identifiziert Abhängigkeiten zwischen altem und neuem Code.
 */

const fs = require('fs');
const path = require('path');

// Konfiguration
const srcDir = '../app/src';
const legacyDirs = [
  '../app/frontend/js',
  '../app/api/frontend/js'
];
const extensions = ['.js', '.ts', '.vue'];

/**
 * Findet alle Dateien mit bestimmten Erweiterungen in einem Verzeichnis und seinen Unterverzeichnissen
 * @param {string} dir - Das zu durchsuchende Verzeichnis
 * @param {string[]} extensions - Zu suchende Dateierweiterungen
 * @returns {string[]} - Liste aller gefundenen Dateien
 */
function getAllFiles(dir, extensions) {
  let results = [];
  
  try {
    if (!fs.existsSync(dir)) {
      console.warn(`Verzeichnis existiert nicht: ${dir}`);
      return results;
    }
    
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        results = results.concat(getAllFiles(fullPath, extensions));
      } else if (extensions.some(ext => item.endsWith(ext))) {
        results.push(fullPath);
      }
    }
  } catch (err) {
    console.error(`Fehler beim Suchen von Dateien in ${dir}:`, err);
  }
  
  return results;
}

/**
 * Extrahiert Import-Statements aus einer Datei
 * @param {string} filePath - Pfad zur zu analysierenden Datei
 * @returns {string[]} - Liste der importierten Module
 */
function extractImports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const imports = [];
    
    // Reguläre Ausdrücke für verschiedene Import-Typen
    const importRegexes = [
      // ES6 Imports
      /import\s+(?:(?:\{[^}]*\})|(?:[^{}\s,]+))\s+from\s+['"]([^'"]+)['"]/g,
      // Dynamic Imports
      /import\(['"]([^'"]+)['"]\)/g,
      // Require Statements
      /require\(['"]([^'"]+)['"]\)/g
    ];
    
    for (const regex of importRegexes) {
      let match;
      while ((match = regex.exec(content)) !== null) {
        imports.push(match[1]);
      }
    }
    
    return imports;
  } catch (err) {
    console.error(`Fehler beim Lesen von ${filePath}:`, err);
    return [];
  }
}

/**
 * Prüft, ob ein Import auf Legacy-Code verweist
 * @param {string} importPath - Der zu prüfende Import-Pfad
 * @param {string[]} legacyPaths - Liste der Legacy-Codepfade
 * @returns {boolean} - true, wenn der Import auf Legacy-Code verweist
 */
function isLegacyImport(importPath, legacyPaths) {
  // Relative Imports normalisieren (../../xxx -> ./xxx)
  const normalizedImport = importPath
    .replace(/^\.\.\//, './') // ggf. anpassen, je nach Projektstruktur
    .replace(/\.\.\//g, '');
  
  return legacyPaths.some(legacyPath => {
    const relativeLegacyPath = path.relative(srcDir, legacyPath);
    return normalizedImport.includes(relativeLegacyPath) || 
           normalizedImport.includes('legacy') ||
           normalizedImport.includes('bridge');
  });
}

/**
 * Analysiert Legacy-Importe im Projekt
 */
function analyzeDependencies() {
  console.log('Analysiere Abhängigkeiten...');
  
  // Alle relevanten Dateien in src finden
  const files = getAllFiles(srcDir, extensions);
  console.log(`Gefunden: ${files.length} Dateien in ${srcDir}`);
  
  const dependencies = {
    timestamp: new Date().toISOString(),
    totalFiles: files.length,
    filesWithLegacyImports: 0,
    legacyImportCount: 0,
    details: {}
  };
  
  // Jede Datei nach Imports durchsuchen
  for (const file of files) {
    const relativeFilePath = path.relative(path.resolve('../app'), file);
    const imports = extractImports(file);
    
    if (imports.length === 0) continue;
    
    // Legacy-Importe identifizieren
    const legacyImports = imports.filter(imp => isLegacyImport(imp, legacyDirs));
    
    if (legacyImports.length > 0) {
      dependencies.filesWithLegacyImports++;
      dependencies.legacyImportCount += legacyImports.length;
      
      dependencies.details[relativeFilePath] = {
        totalImports: imports.length,
        legacyImports: legacyImports
      };
    }
  }
  
  // Ergebnisse ausgeben
  console.log(`\nGefunden: ${dependencies.filesWithLegacyImports} Dateien mit Legacy-Imports`);
  console.log(`Insgesamt: ${dependencies.legacyImportCount} Legacy-Import-Statements`);
  
  // Dateien gruppieren nach Anzahl der Legacy-Importe
  const sortedFiles = Object.entries(dependencies.details)
    .sort((a, b) => b[1].legacyImports.length - a[1].legacyImports.length);
  
  if (sortedFiles.length > 0) {
    console.log('\nTop 5 Dateien mit den meisten Legacy-Abhängigkeiten:');
    sortedFiles.slice(0, 5).forEach(([file, data]) => {
      console.log(`- ${file}: ${data.legacyImports.length} Legacy-Importe`);
    });
  }
  
  // In Datei speichern
  fs.writeFileSync('legacy-dependencies-report.json', JSON.stringify(dependencies, null, 2));
  console.log('\nErgebnisse wurden in legacy-dependencies-report.json gespeichert');
  
  // Migrations-Empfehlungen generieren
  generateMigrationRecommendations(dependencies);
}

/**
 * Generiert Empfehlungen für die Migration basierend auf den Abhängigkeiten
 * @param {Object} dependencies - Die analysierten Abhängigkeiten
 */
function generateMigrationRecommendations(dependencies) {
  const recommendations = {
    timestamp: new Date().toISOString(),
    highPriority: [],
    mediumPriority: [],
    lowPriority: []
  };
  
  // Dateien nach Priorität für die Migration sortieren
  Object.entries(dependencies.details).forEach(([file, data]) => {
    // Heuristik: Dateien mit vielen Legacy-Imports haben hohe Priorität
    const legacyRatio = data.legacyImports.length / data.totalImports;
    
    const recommendation = {
      file,
      legacyImports: data.legacyImports,
      ratio: legacyRatio
    };
    
    if (legacyRatio > 0.7 || data.legacyImports.length > 5) {
      recommendations.highPriority.push(recommendation);
    } else if (legacyRatio > 0.3 || data.legacyImports.length > 2) {
      recommendations.mediumPriority.push(recommendation);
    } else {
      recommendations.lowPriority.push(recommendation);
    }
  });
  
  // Empfehlungen speichern
  fs.writeFileSync('migration-recommendations.json', JSON.stringify(recommendations, null, 2));
  console.log('\nMigrations-Empfehlungen wurden in migration-recommendations.json gespeichert');
  
  // Zusammenfassung ausgeben
  console.log(`\nPriorisierung für Migration:`);
  console.log(`- Hohe Priorität: ${recommendations.highPriority.length} Dateien`);
  console.log(`- Mittlere Priorität: ${recommendations.mediumPriority.length} Dateien`);
  console.log(`- Niedrige Priorität: ${recommendations.lowPriority.length} Dateien`);
}

// Skript ausführen
analyzeDependencies();