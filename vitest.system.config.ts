import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  test: {
    name: 'system-integrity',
    include: ['test/system-integrity/**/*.spec.ts'],
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true // Run tests sequentially for system integrity
      }
    },
    testTimeout: 30000, // 30s timeout for integration tests
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage/system-integrity',
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80
      },
      include: [
        'src/stores/**/*.ts',
        'src/services/**/*.ts',
        'src/utils/**/*.ts',
        'src/composables/**/*.ts',
        'src/views/AdminPanel.vue',
        'src/router/**/*.ts'
      ],
      exclude: [
        '**/*.mock.ts',
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/types/**',
        '**/*.d.ts',
        'src/stores/sessions.optimized.ts',
        'src/stores/settings.optimized.ts',
        'src/main.simple.ts',
        'src/main.optimized.ts'
      ]
    },
    reporters: ['default', 'json', 'html'],
    outputFile: {
      json: './test-results/system-integrity/results.json',
      html: './test-results/system-integrity/index.html'
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '~': resolve(__dirname, './src')
    }
  }
});