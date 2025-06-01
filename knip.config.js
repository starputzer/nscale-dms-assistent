export default {
  entry: [
    'src/main.ts',
    'src/main-enhanced.ts',
    'src/main.auth-integration.ts',
    'api/server.py'
  ],
  project: [
    'src/**/*.{ts,tsx,js,jsx,vue}',
    'api/**/*.py'
  ],
  ignore: [
    'node_modules/**',
    'dist/**',
    'coverage/**',
    '**/*.spec.ts',
    '**/*.test.ts',
    '**/tests/**',
    'vite.config.ts',
    'vitest.config.ts',
    'playwright.config.ts',
    'scripts/**',
    'examples/**',
    'e2e/**'
  ],
  ignoreDependencies: [
    '@types/*',
    'vite-*',
    'vitest',
    'playwright',
    'eslint-*',
    '@vue/test-utils'
  ],
  vue: {
    compiler: true
  }
};