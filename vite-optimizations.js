
// Additional optimizations for vite.config.ts
export const bundleOptimizations = {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core Vue ecosystem (always needed)
          'vue-core': ['vue', '@vue/runtime-dom', '@vue/runtime-core', '@vue/reactivity', '@vue/shared'],
          
          // Router and state management (loaded on app init)
          'vue-ecosystem': ['vue-router', 'pinia', 'pinia-plugin-persistedstate'],
          
          // Heavy UI libraries (lazy loaded)
          'ui-libs': ['marked', 'dompurify', 'highlight.js'],
          
          // Admin panel chunks (only for admin users)
          'admin': [
            './src/components/admin/AdminPanel.vue',
            './src/components/admin/tabs/AdminDashboard.vue',
            './src/components/admin/tabs/AdminUsers.vue'
          ],
          
          // Document converter (lazy loaded)
          'doc-converter': [
            './src/components/DocumentConverter.vue',
            './src/components/DocumentUpload.vue'
          ]
        },
        // Optimize chunk names
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `assets/${chunkInfo.name}-${facadeModuleId}-[hash].js`;
        }
      },
      // Tree shaking optimizations
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false
      }
    }
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      'pinia',
      'axios'
    ],
    exclude: [
      '@vue/devtools-api' // Exclude dev tools in production
    ]
  }
};
