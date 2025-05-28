import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("../../src", import.meta.url)),
      // Wichtig: Stelle sicher, dass die Aliases korrekt sind
      test: fileURLToPath(new URL("..", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    include: ["test/typescript/**/*.spec.ts"],
    globals: true,
    deps: {
      inline: ["vue"],
    },
    setupFiles: ["test/setup.ts"],
    reporters: ["default", "html"],
    coverage: {
      reporter: ["text", "json", "html"],
      reportsDirectory: "./test/typescript/coverage",
    },
  },
});
