// vite.config.js
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Explizite Alias-Definition für die DocConverterView
      'doc-converter-view': fileURLToPath(new URL('./src/views/DocConverterView.vue', import.meta.url))
    }
  },
  build: {
    // Separate Konfiguration für die Standalone-Anwendung
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        docConverter: fileURLToPath(new URL('./src/standalone/doc-converter.js', import.meta.url))
      },
      output: {
        // Konfiguriere Ausgabe für mehrere Eintrittspunkte
        entryFileNames: (chunkInfo) => {
          // Verschiedene Namen für verschiedene Eintrittspunkte
          if (chunkInfo.name === 'docConverter') {
            return 'assets/js/doc-converter.[hash].js'
          }
          return 'assets/js/[name].[hash].js'
        }
      }
    },
    // Debug-Informationen aktivieren
    sourcemap: true
  },
  // Optimierung für die Entwicklungsumgebung
  optimizeDeps: {
    include: ['vue', 'pinia', '@fortawesome/vue-fontawesome']
  },
  // Bessere Fehlermeldungen
  logLevel: 'info',
  // Server-Konfiguration
  server: {
    port: 3000,
    open: true
  }
})
