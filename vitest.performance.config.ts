import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import Vue from "@vitejs/plugin-vue";

/**
 * Spezielle Vitest-Konfiguration für Performance-Tests
 * Bietet erweiterte Timeouts und angepasste Konfiguration für Tests,
 * die längere Laufzeiten benötigen.
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

    // Testmuster speziell für Performance-Tests
    include: [
      "test/**/*-performance.spec.ts",
      "test/**/performance/**/*.spec.ts",
    ],
    exclude: ["test/vanilla/**/*.spec.js", "e2e/**", "node_modules/"],

    // Berichterstattung und UI
    reporters: ["default"],
    outputFile: "./test-results/performance-results.json",

    // Erweiterte Timeouts für Performance-Tests
    testTimeout: 120000, // 2 Minuten
    hookTimeout: 60000, // 1 Minute

    // Optimierte Pool-Konfiguration für Ressourcen-intensive Tests
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: true, // Single-Thread für Performance-Tests zur Reduzierung von Interference
      },
    },

    // Spezielles Tagging für Performance-Tests
    env: {
      TEST_TYPE: "performance",
    },

    // Erweiterte Debug-Informationen für Performance-Analyse
    onConsoleLog(log, type) {
      if (log.includes("Vue warn")) {
        console.warn("Vue warning detected in performance tests:", log);
      }
      return false;
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      test: fileURLToPath(new URL("./test", import.meta.url)),
    },
  },
});
