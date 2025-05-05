import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  
  // Basis-URL für die Produktion
  base: '/',
  
  // Entwicklungsserver-Konfiguration
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  },
  
  // Build-Konfiguration
  build: {
    // Ausgabeverzeichnis
    outDir: 'dist',
    
    // Assets in eigene Verzeichnisse aufteilen
    assetsDir: 'assets',
    
    // Sourcemaps für Debugging
    sourcemap: true,
    
    // Chunks optimieren
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          'http': ['axios']
        }
      }
    }
  }
})
