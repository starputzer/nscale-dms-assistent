/**
 * Skript zur Aktualisierung der Build-Konfiguration nach vollständiger Migration
 *
 * Dieses Skript aktualisiert die vite.config.ts und package.json,
 * um Legacy-Code-Unterstützung zu entfernen und Build-Optimierungen zu aktivieren.
 */

const fs = require("fs");
const path = require("path");

// Konfiguration
const appDir = "../app";
const configFiles = {
  viteConfig: path.join(appDir, "vite.config.ts"),
  packageJson: path.join(appDir, "package.json"),
};

/**
 * Aktualisiert die Vite-Konfiguration
 * - Entfernt Legacy-Kompatibilitätseinstellungen
 * - Fügt optimierte Build-Konfigurationen hinzu
 */
function updateViteConfig() {
  console.log("Aktualisiere Vite-Konfiguration...");

  try {
    if (!fs.existsSync(configFiles.viteConfig)) {
      console.warn(`Datei nicht gefunden: ${configFiles.viteConfig}`);
      return false;
    }

    let content = fs.readFileSync(configFiles.viteConfig, "utf-8");
    let updated = false;

    // Legacy-Einträge entfernen
    if (
      content.includes("// LEGACY START") &&
      content.includes("// LEGACY END")
    ) {
      content = content.replace(
        /\/\/ LEGACY START[\s\S]*?\/\/ LEGACY END/g,
        "// Legacy-Konfiguration entfernt nach vollständiger Migration",
      );
      updated = true;
    }

    // Optimierte Build-Konfiguration hinzufügen
    const optimizedBuildConfig = `
  build: {
    // Optimierte Build-Konfiguration ohne Legacy-Support
    target: 'es2018',
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['vue', 'pinia', 'vue-router'],
          'ui': [
            '@/components/ui',
            '@/components/ui/base',
            '@/components/ui/data',
            '@/components/ui/feedback'
          ],
          'admin': ['@/components/admin'],
          'docConverter': ['@/components/admin/document-converter'],
          'chat': ['@/components/chat', '@/components/chat/enhanced']
        }
      }
    },
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true
      }
    }
  },`;

    // Bestehende Build-Konfiguration ersetzen oder neue hinzufügen
    if (content.includes("build: {")) {
      content = content.replace(/build: \{[\s\S]*?\},/g, optimizedBuildConfig);
      updated = true;
    } else {
      // Position zum Einfügen finden (vor resolve oder plugins)
      const insertPos =
        content.indexOf("resolve:") > 0
          ? content.indexOf("resolve:")
          : content.indexOf("plugins:");

      if (insertPos > 0) {
        content =
          content.slice(0, insertPos) +
          optimizedBuildConfig +
          "\n  " +
          content.slice(insertPos);
        updated = true;
      }
    }

    // Weitere Optimierungen für Produktion
    if (!content.includes("optimizeDeps")) {
      const optimizeDepsConfig = `
  optimizeDeps: {
    include: [
      'vue', 
      'vue-router', 
      'pinia',
      '@vueuse/core'
    ]
  },`;

      // Position zum Einfügen finden
      const insertPos =
        content.indexOf("build:") > 0
          ? content.indexOf("build:")
          : content.indexOf("resolve:") > 0
            ? content.indexOf("resolve:")
            : content.indexOf("plugins:");

      if (insertPos > 0) {
        content =
          content.slice(0, insertPos) +
          optimizeDepsConfig +
          "\n  " +
          content.slice(insertPos);
        updated = true;
      }
    }

    // Ergebnis speichern und Backup erstellen
    if (updated) {
      fs.writeFileSync(
        `${configFiles.viteConfig}.bak`,
        fs.readFileSync(configFiles.viteConfig),
      );
      fs.writeFileSync(configFiles.viteConfig, content);
      console.log("✅ Vite-Konfiguration erfolgreich aktualisiert");
      return true;
    } else {
      console.log("ℹ️ Keine Änderungen an der Vite-Konfiguration erforderlich");
      return false;
    }
  } catch (err) {
    console.error("❌ Fehler beim Aktualisieren der Vite-Konfiguration:", err);
    return false;
  }
}

/**
 * Aktualisiert die package.json
 * - Entfernt Legacy-Abhängigkeiten
 * - Entfernt Legacy-Scripts
 * - Optimiert Scripts für die finale Version
 */
function updatePackageJson() {
  console.log("\nAktualisiere package.json...");

  try {
    if (!fs.existsSync(configFiles.packageJson)) {
      console.warn(`Datei nicht gefunden: ${configFiles.packageJson}`);
      return false;
    }

    // Aktuelle package.json einlesen
    const pkg = JSON.parse(fs.readFileSync(configFiles.packageJson, "utf-8"));

    // Backup erstellen
    fs.writeFileSync(
      `${configFiles.packageJson}.bak`,
      JSON.stringify(pkg, null, 2),
    );

    // Legacy-Skripte identifizieren und entfernen
    const legacyScriptPatterns = ["legacy", "compat", "old", "rollback"];

    const removedScripts = {};

    for (const scriptName in pkg.scripts) {
      if (
        legacyScriptPatterns.some((pattern) => scriptName.includes(pattern))
      ) {
        removedScripts[scriptName] = pkg.scripts[scriptName];
        delete pkg.scripts[scriptName];
      }
    }

    console.log(`Entfernte Skripte: ${Object.keys(removedScripts).length}`);

    // Legacy-Abhängigkeiten identifizieren und separieren
    const legacyDependencyPatterns = [
      "jquery",
      "lodash-es",
      "vue-compat",
      "@vue/compat",
      // Weitere Legacy-Abhängigkeiten hier hinzufügen
    ];

    // Abhängigkeiten separieren
    pkg.legacyDependencies = pkg.legacyDependencies || {};

    for (const dep of legacyDependencyPatterns) {
      for (const section of ["dependencies", "devDependencies"]) {
        const depsObj = pkg[section];

        if (depsObj) {
          for (const depName in depsObj) {
            if (depName.includes(dep) || depName === dep) {
              // In Legacy-Sektion verschieben
              pkg.legacyDependencies[depName] = depsObj[depName];
              delete depsObj[depName];
            }
          }
        }
      }
    }

    // Optimierte Skripte hinzufügen
    const newScripts = {
      "build:prod": "vite build --mode production",
      analyze: "vite build --mode production --debug",
      preview: "vite preview",
      typecheck: "vue-tsc --noEmit",
      "lint:fix":
        "eslint . --ext .vue,.js,.jsx,.cjs,.mjs,.ts,.tsx,.cts,.mts --fix",
      format: "prettier --write src/",
      "test:coverage": "vitest run --coverage",
    };

    // Neue Skripte hinzufügen, wenn sie noch nicht existieren
    for (const [name, command] of Object.entries(newScripts)) {
      if (!pkg.scripts[name]) {
        pkg.scripts[name] = command;
      }
    }

    // Aktualisierte package.json speichern
    fs.writeFileSync(configFiles.packageJson, JSON.stringify(pkg, null, 2));
    console.log("✅ package.json erfolgreich aktualisiert");

    // Entfernte Skripte in separater Datei speichern
    fs.writeFileSync(
      path.join(appDir, "removed-scripts.json"),
      JSON.stringify(removedScripts, null, 2),
    );

    return true;
  } catch (err) {
    console.error("❌ Fehler beim Aktualisieren der package.json:", err);
    return false;
  }
}

/**
 * Führt alle Aktualisierungen durch
 */
function updateBuildConfigurations() {
  console.log("🚀 Starte Aktualisierung der Build-Konfigurationen...\n");

  const viteUpdated = updateViteConfig();
  const packageUpdated = updatePackageJson();

  console.log("\n📋 Zusammenfassung:");
  console.log(
    `- Vite-Konfiguration: ${viteUpdated ? "✅ Aktualisiert" : "⚠️ Keine Änderungen"}`,
  );
  console.log(
    `- package.json: ${packageUpdated ? "✅ Aktualisiert" : "⚠️ Keine Änderungen"}`,
  );

  if (viteUpdated || packageUpdated) {
    console.log(
      "\n✅ Build-Konfigurationen wurden erfolgreich für die finale Version optimiert!",
    );
    console.log("ℹ️ Backups wurden als .bak-Dateien erstellt.");
  } else {
    console.log("\n⚠️ Es wurden keine Änderungen vorgenommen.");
  }
}

// Skript ausführen
updateBuildConfigurations();
