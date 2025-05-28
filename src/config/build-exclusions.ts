/**
 * Build-Exclusion-Konfiguration
 *
 * Diese Datei definiert Dateien und Verzeichnisse,
 * die vom Produktions-Build ausgeschlossen werden sollen
 */

// Mock-Dateien, die nur in Entwicklung benötigt werden
export const mockFiles = [
  "src/services/mocks/**",
  "src/stores/*.mock.ts",
  "src/stores/admin/*.mock.ts",
  "src/plugins/mockServiceProvider.ts",
];

// Test-Dateien
export const testFiles = [
  "**/*.spec.ts",
  "**/*.spec.js",
  "**/*.test.ts",
  "**/*.test.js",
  "test/**/*",
  "tests/**/*",
];

// Entwicklungs-spezifische Dateien
export const devOnlyFiles = [
  "src/utils/debug*.ts",
  "src/utils/*Debug.ts",
  "src/examples/**",
  "src/bridge/diagnostics.ts",
];

// Deprecated/Alte Dateien
export const deprecatedFiles = [
  "src/**/*-old.vue",
  "src/**/*-backup.ts",
  "src/**/*-deprecated.ts",
  "src/components/legacy/**",
];

// Ungenutzte Komponenten (basierend auf Analyse)
export const unusedComponents = [
  "src/components/test/**",
  "src/components/demo/**",
  "src/views/TestView.vue",
  "src/views/DemoView.vue",
];

// Exportiere alle Exclusions
export const buildExclusions = [
  ...mockFiles,
  ...testFiles,
  ...devOnlyFiles,
  ...deprecatedFiles,
  ...unusedComponents,
];

// Funktion zur Überprüfung ob eine Datei excluded werden soll
export function shouldExcludeFile(
  filePath: string,
  isProduction: boolean = true,
): boolean {
  if (!isProduction) {
    // In Entwicklung nur Test-Dateien ausschließen
    return testFiles.some((pattern) => {
      const regex = new RegExp(pattern.replace(/\*/g, ".*"));
      return regex.test(filePath);
    });
  }

  // In Produktion alle definierten Patterns ausschließen
  return buildExclusions.some((pattern) => {
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    return regex.test(filePath);
  });
}
