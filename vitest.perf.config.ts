import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: "jsdom",
    globals: true,
    testTimeout: 60000, // Extended timeout for performance tests
    include: ["**/test/**/*.perf.spec.ts", "**/test/**/*-performance.spec.ts"],
  },
});
