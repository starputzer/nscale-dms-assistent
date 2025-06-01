#!/usr/bin/env node

/**
 * Script zur Identifizierung ungenutzter Dateien
 *
 * Analysiert den Code und findet Dateien, die nicht importiert werden
 */

import { readdir, readFile } from "fs/promises";
import { join, relative, extname } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");
const srcDir = join(projectRoot, "src");

// Dateitypen, die analysiert werden sollen
const analyzeExtensions = [".ts", ".tsx", ".js", ".jsx", ".vue"];

// Verzeichnisse, die ignoriert werden sollen
const ignoreDirs = [
  "node_modules",
  "dist",
  "build",
  ".git",
  "test",
  "tests",
  "__tests__",
  "coverage",
];

// Dateien, die immer behalten werden sollen
const keepFiles = [
  "main.ts",
  "App.vue",
  "router/index.ts",
  "vite-env.d.ts",
  "env.d.ts",
];

// Sammle alle Dateien
async function collectFiles(dir, files = []) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!ignoreDirs.includes(entry.name)) {
        await collectFiles(fullPath, files);
      }
    } else if (entry.isFile()) {
      const ext = extname(entry.name);
      if (analyzeExtensions.includes(ext)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

// Extrahiere Imports aus einer Datei
async function extractImports(filePath) {
  const content = await readFile(filePath, "utf-8");
  const imports = new Set();

  // Standard ES6 imports
  const es6ImportRegex =
    /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;
  while ((match = es6ImportRegex.exec(content)) !== null) {
    imports.add(match[1]);
  }

  // Dynamic imports
  const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = dynamicImportRegex.exec(content)) !== null) {
    imports.add(match[1]);
  }

  // require() calls
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = requireRegex.exec(content)) !== null) {
    imports.add(match[1]);
  }

  // Vue SFC imports
  if (filePath.endsWith(".vue")) {
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/g;
    const scriptMatch = scriptRegex.exec(content);
    if (scriptMatch) {
      const scriptContent = scriptMatch[1];
      const vueImportRegex =
        /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g;
      while ((match = vueImportRegex.exec(scriptContent)) !== null) {
        imports.add(match[1]);
      }
    }
  }

  return Array.from(imports);
}

// Resolviere Import-Pfade zu tatsächlichen Dateipfaden
function resolveImportPath(importPath, fromFile) {
  // Alias-Auflösung (@/ -> src/)
  if (importPath.startsWith("@/")) {
    importPath = importPath.replace("@/", "./src/");
  }

  // Relative Pfade
  if (importPath.startsWith(".")) {
    const dir = dirname(fromFile);
    importPath = join(dir, importPath);
  } else if (!importPath.startsWith("/")) {
    // node_modules imports ignorieren
    return null;
  }

  // Füge Dateiendungen hinzu, falls nicht vorhanden
  if (!extname(importPath)) {
    for (const ext of analyzeExtensions) {
      const fullPath = importPath + ext;
      try {
        // Prüfe ob Datei existiert (vereinfacht)
        return fullPath;
      } catch {}
    }
    // Versuche index-Datei
    return join(importPath, "index.ts");
  }

  return importPath;
}

// Hauptfunktion
async function findUnusedFiles() {
  console.log("Sammle Dateien...");
  const allFiles = await collectFiles(srcDir);
  console.log(`Gefunden: ${allFiles.length} Dateien`);

  // Erstelle Abhängigkeitsgraph
  const importedFiles = new Set();
  const fileImports = new Map();

  console.log("Analysiere Imports...");
  for (const file of allFiles) {
    const imports = await extractImports(file);
    fileImports.set(file, imports);

    for (const importPath of imports) {
      const resolvedPath = resolveImportPath(importPath, file);
      if (resolvedPath) {
        // Normalisiere Pfad für Vergleich
        const normalizedPath = join(projectRoot, resolvedPath);
        importedFiles.add(normalizedPath);
      }
    }
  }

  // Finde ungenutzte Dateien
  const unusedFiles = [];
  for (const file of allFiles) {
    const relativePath = relative(projectRoot, file);
    const isKeepFile = keepFiles.some((keep) => relativePath.endsWith(keep));

    if (!importedFiles.has(file) && !isKeepFile) {
      unusedFiles.push(relativePath);
    }
  }

  // Gruppiere nach Typ
  const grouped = {
    components: [],
    views: [],
    stores: [],
    services: [],
    utils: [],
    other: [],
  };

  for (const file of unusedFiles) {
    if (file.includes("/components/")) grouped.components.push(file);
    else if (file.includes("/views/")) grouped.views.push(file);
    else if (file.includes("/stores/")) grouped.stores.push(file);
    else if (file.includes("/services/")) grouped.services.push(file);
    else if (file.includes("/utils/")) grouped.utils.push(file);
    else grouped.other.push(file);
  }

  // Ausgabe
  console.log("\n=== UNGENUTZTE DATEIEN ===\n");

  for (const [category, files] of Object.entries(grouped)) {
    if (files.length > 0) {
      console.log(`${category.toUpperCase()} (${files.length}):`);
      files.forEach((file) => console.log(`  - ${file}`));
      console.log();
    }
  }

  console.log(`\nGesamt: ${unusedFiles.length} ungenutzte Dateien`);

  // Speichere Ergebnis in Datei
  const report = {
    timestamp: new Date().toISOString(),
    totalFiles: allFiles.length,
    unusedFiles: unusedFiles.length,
    categories: grouped,
  };

  await writeFile(
    join(projectRoot, "unused-files-report.json"),
    JSON.stringify(report, null, 2),
  );

  console.log("\nBericht gespeichert in: unused-files-report.json");
}

// Starte Analyse
import { writeFile } from "fs/promises";

findUnusedFiles().catch(console.error);
