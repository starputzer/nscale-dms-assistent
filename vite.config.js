import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  
  // Basisverzeichnis für die Anwendung
  root: './frontend',
  
  // Öffentliches Verzeichnis für statische Assets
  publicDir: 'static',
  
  // Entwicklungsserver-Konfiguration
  server: {
    port: 3000,
    strictPort: true,
    open: true,
    proxy: {
      // Proxy API-Anfragen an den Backend-Server
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  
  // Auflösung von Modulen und Imports
  resolve: {
    alias: {
      // Konsistente Pfadaliase für Imports
      '@': resolve(__dirname, './frontend'),
      '@js': resolve(__dirname, './frontend/js'),
      '@css': resolve(__dirname, './frontend/css'),
      '@components': resolve(__dirname, './frontend/components'),
      '@assets': resolve(__dirname, './frontend/assets'),
      '@vue': resolve(__dirname, './frontend/vue')
    }
  },
  
  // Build-Konfiguration für die Produktion
  build: {
    outDir: '../api/frontend',
    emptyOutDir: false, // Wichtig für schrittweise Migration
    sourcemap: process.env.NODE_ENV !== 'production',
    minify: process.env.NODE_ENV === 'production',
    
    // Rollup-spezifische Konfiguration
    rollupOptions: {
      input: {
        main: resolve(__dirname, './frontend/index.html')
      },
      output: {
        // Behalte bestehende Modulstruktur
        format: 'es',
        // Behalte bestehende Dateinamen bei
        entryFileNames: 'js/[name].js',
        chunkFileNames: 'js/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        // Erlaube Imports von externen, CDN-basierten Modulen
        globals: {
          vue: 'Vue'
        }
      },
      // Externe Abhängigkeiten für CDN-Kompatibilität
      external: [
        'vue', 
        '/frontend/main.js',
        '/static/js/chat.js',
        '/static/js/feedback.js',
        '/static/js/admin.js',
        '/static/js/settings.js',
        '/static/js/source-references.js',
        '/static/js/app.js'
      ]
    },
    
    // TypeScript-Unterstützung
    lib: {
      entry: resolve(__dirname, './frontend/js/main.js'),
      name: 'nscaleAssist',
      formats: ['es']
    }
  },
  
  // Optimierung für die Entwicklung und Produktion
  optimizeDeps: {
    include: ['vue'],
    exclude: []
  },
  
  // CSS-Verarbeitung und Optimierung
  css: {
    preprocessorOptions: {
      // CSS-Präprozessor-Optionen können hier hinzugefügt werden
    },
    // Behalte CSS-Dateien beim Bundling bei
    extract: true
  },
  
  // TypeScript-Konfiguration
  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'Fragment'
  }
});