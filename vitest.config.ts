import { defineConfig } from "vitest/config";
import Vue from "@vitejs/plugin-vue";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * Vitest-Konfiguration für alle Vue 3 SFC-Tests
 * Unterstützt:
 * - Unit-Tests für Komponenten, Stores, Utilities
 * - Snapshot-Tests
 * - Coverage-Reporting
 * - TypeScript und SFC
 */
export default defineConfig({
  plugins: [Vue()],
  test: {
    // Globale Konfiguration
    globals: true,
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    deps: {
      inline: ["axe-core"],
    },

    // Testabdeckung
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "test/",
        "**/*.d.ts",
        "**/*.spec.ts",
        "dist/",
        "coverage/",
        "public/",
        "frontend/", // Legacy-Code
      ],
      // Zielabdeckungen
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },

    // Parallelisierung für schnelleres Testen
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },

    // Testmuster und Ausschluss
    include: [
      "test/**/*.spec.ts",
      "test/**/*.spec.js",
      "src/**/*.spec.ts",
      "src/**/__tests__/**/*.ts",
    ],
    exclude: [
      "test/vanilla/**/*.spec.js", // diese nutzen vanilla.vitest.config.js
      "e2e/**",
      "node_modules/",
    ],

    // Berichterstattung und UI
    reporters: ["default"],
    outputFile: "./test-results/results.json",

    // Timeouts
    testTimeout: 60000, // Increased to 60 seconds to accommodate performance tests
    hookTimeout: 20000,

    // Debugging-Unterstützung
    onConsoleLog(log, type) {
      if (log.includes("Vue warn")) {
        console.warn("Vue warning detected in tests:", log);
      }
      return false; // gibt die Konsole trotzdem aus
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      test: fileURLToPath(new URL("./test", import.meta.url)),
    },
  },
});
