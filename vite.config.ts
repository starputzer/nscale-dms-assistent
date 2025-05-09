import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import { resolve } from 'node:path';
import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';
import { splitVendorChunkPlugin } from 'vite';
import autoprefixer from 'autoprefixer';

// Pfade für Projektstruktur
const projectRoot = resolve(__dirname);
const srcDir = resolve(projectRoot, 'src');
const distDir = resolve(projectRoot, 'dist');

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Lade Umgebungsvariablen basierend auf dem Modus (development, production, staging)
  const env = loadEnv(mode, process.cwd(), '');
  
  // Bestimme, ob wir uns in der Produktion befinden
  const isProduction = mode === 'production';
  
  return {
    // Plugins für Vite
    plugins: [
      vue(),
      splitVendorChunkPlugin(),
      viteCompression({
        // GZIP-Kompression für statische Assets
        algorithm: 'gzip',
        ext: '.gz',
        threshold: 10240, // 10KB Minimalgröße für Kompression
        disable: !isProduction,
        deleteOriginFile: false
      }),
      viteCompression({
        // Brotli-Kompression für noch bessere Kompression
        algorithm: 'brotliCompress',
        ext: '.br',
        threshold: 10240,
        disable: !isProduction,
        deleteOriginFile: false
      }),
      // Bundle-Analyseplugin (nur im Produktionsmodus aktiviert)
      isProduction && visualizer({
        filename: resolve(distDir, 'stats.html'),
        open: false,
        gzipSize: true,
        brotliSize: true
      })
    ],
    
    // Definition von Umgebungsvariablen
    define: {
      // Zusätzliche Umgebungsvariablen für die Client-Seite
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
      __ENV__: JSON.stringify(mode)
    },
    
    // Konfiguration für die öffentlichen Verzeichnisse
    publicDir: 'public',
    
    // CSS-spezifische Konfiguration
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/assets/styles/variables.scss";`
        }
      },
      // PostCSS-Plugins für CSS-Optimierung
      postcss: {
        plugins: [
          autoprefixer({
            overrideBrowserslist: ['last 2 versions', 'not dead', '> 0.5%']
          })
        ]
      },
      // CSS-Modul-Konfiguration
      modules: {
        generateScopedName: isProduction 
          ? '[hash:base64:8]' 
          : '[local]_[hash:base64:5]'
      },
      // CSS-Codeaufspaltung
      devSourcemap: !isProduction
    },
    
    // Verbesserte Alias-Konfiguration
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
        '@composables': fileURLToPath(new URL('./src/composables', import.meta.url)),
        '@stores': fileURLToPath(new URL('./src/stores', import.meta.url)),
        '@services': fileURLToPath(new URL('./src/services', import.meta.url)),
        '@assets': fileURLToPath(new URL('./src/assets', import.meta.url)),
        '@utils': fileURLToPath(new URL('./src/utils', import.meta.url)),
        '@types': fileURLToPath(new URL('./src/types', import.meta.url))
      },
      extensions: ['.js', '.ts', '.vue', '.json', '.mjs']
    },
    
    // Server-Konfiguration für die Entwicklung
    server: {
      port: parseInt(env.VITE_PORT || '3000'),
      strictPort: true,
      cors: true,
      hmr: true,
      // Verbesserte Proxy-Konfiguration für API-Anfragen
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
          ws: true,
          rewrite: (path) => path
        }
      }
    },
    
    // Optimierter Preview-Server
    preview: {
      port: parseInt(env.VITE_PREVIEW_PORT || '4173'),
      strictPort: true,
      cors: true
    },
    
    // Optimierungen für Build
    build: {
      outDir: distDir,
      assetsDir: 'assets',
      emptyOutDir: true,
      sourcemap: !isProduction,
      
      // Speichergrenze erhöhen für große Projekte
      chunkSizeWarningLimit: 1600,
      
      // Worker-Threads für schnellere Builds
      minify: isProduction ? 'terser' : false,
      terserOptions: isProduction ? {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.debug']
        },
        format: {
          comments: false
        }
      } : undefined,
      
      // Cache-Strategie mit inkrementellen Builds
      cssCodeSplit: true,
      reportCompressedSize: true,
      
      // Optimierter Build für Produktion
      rollupOptions: {
        output: {
          // Optimierte Chunk-Strategie mit feingranularem Code-Splitting
          manualChunks: isProduction ? {
            // Framework-Kern-Bibliotheken
            'vendor-core': ['vue', 'vue-router', 'pinia'],
            
            // Externe Hilfsbibliotheken
            'vendor-utils': ['@vueuse/core', 'axios', 'uuid', 'marked'],
            
            // UI-Komponenten nach Kategorien aufgeteilt
            'ui-base': [
              './src/components/ui/base/Alert.vue',
              './src/components/ui/base/Button.vue',
              './src/components/ui/base/Card.vue',
              './src/components/ui/base/Checkbox.vue',
              './src/components/ui/base/Input.vue',
              './src/components/ui/base/Modal.vue',
              './src/components/ui/base/Radio.vue',
              './src/components/ui/base/Select.vue'
            ],
            
            // Layout-Komponenten
            'ui-layout': [
              './src/components/layout/Header.vue',
              './src/components/layout/MainLayout.vue',
              './src/components/layout/Sidebar.vue',
              './src/components/layout/SplitPane.vue',
              './src/components/layout/TabPanel.vue'
            ],
            
            // Chat-Komponenten
            'feature-chat': [
              './src/components/chat/ChatContainer.vue',
              './src/components/chat/ChatInput.vue',
              './src/components/chat/MessageInput.vue',
              './src/components/chat/MessageItem.vue',
              './src/components/chat/MessageList.vue'
            ],
            
            // Erweiterte Chat-Komponenten (werden nur bei Bedarf geladen)
            'feature-chat-enhanced': [
              './src/components/chat/enhanced/EnhancedMessageInput.vue',
              './src/components/chat/enhanced/SessionManager.vue',
              './src/components/chat/enhanced/VirtualMessageList.vue'
            ],
            
            // Admin-Komponenten
            'feature-admin': [
              './src/components/admin/AdminPanel.vue',
              './src/components/admin/FeatureTogglesPanel.vue',
              './src/components/admin/tabs/AdminDashboard.vue',
              './src/components/admin/tabs/AdminFeatureToggles.vue',
              './src/components/admin/tabs/AdminSystem.vue',
              './src/components/admin/tabs/AdminUsers.vue'
            ],
            
            // Dokumentenkonverter-Komponenten
            'feature-docconverter': [
              './src/components/admin/document-converter/ConversionProgress.vue',
              './src/components/admin/document-converter/ConversionProgressV2.vue',
              './src/components/admin/document-converter/DocConverterContainer.vue',
              './src/components/admin/document-converter/DocumentList.vue',
              './src/components/admin/document-converter/ErrorDisplay.vue',
              './src/components/admin/document-converter/FileUpload.vue'
            ],
            
            // Design-System-Komponenten
            'ui-feedback': [
              './src/components/ui/Dialog.vue',
              './src/components/ui/LoadingOverlay.vue',
              './src/components/ui/Notification.vue',
              './src/components/ui/ProgressIndicator.vue',
              './src/components/ui/Toast.vue',
              './src/components/ui/ToastContainer.vue'
            ],
            
            // Daten-Komponenten
            'ui-data': [
              './src/components/ui/data/Calendar.vue',
              './src/components/ui/data/List.vue',
              './src/components/ui/data/Pagination.vue',
              './src/components/ui/data/Table.vue',
              './src/components/ui/data/Tag.vue',
              './src/components/ui/data/Tree.vue'
            ],
            
            // Stores nach Funktionsgruppen
            'stores-auth': [
              './src/stores/auth.ts',
              './src/stores/settings.ts'
            ],
            
            'stores-admin': [
              './src/stores/admin/feedback.ts',
              './src/stores/admin/motd.ts',
              './src/stores/admin/system.ts',
              './src/stores/admin/users.ts',
              './src/stores/featureToggles.ts'
            ],
            
            'stores-documents': [
              './src/stores/documentConverter.ts'
            ],
            
            'stores-ui': [
              './src/stores/ui.ts',
              './src/stores/monitoringStore.ts'
            ],
            
            'stores-sessions': [
              './src/stores/sessions.ts'
            ],
            
            // Services nach Funktionsgruppen
            'services-api': [
              './src/services/api/ApiService.ts',
              './src/services/api/ChatService.ts',
              './src/services/api/DocumentConverterApi.ts',
              './src/services/api/DocumentConverterService.ts'
            ],
            
            'services-utils': [
              './src/services/api/RateLimitHandler.ts',
              './src/services/api/RequestQueue.ts',
              './src/services/api/RetryHandler.ts',
              './src/services/storage/StorageService.ts',
              './src/services/log/LogService.ts'
            ],
            
            'services-ui': [
              './src/services/ui/DialogService.ts',
              './src/services/ui/NotificationService.ts',
              './src/services/ui/ToastService.ts'
            ]
          } : undefined,
          
          // Optimierte Dateinamenmuster für besseres Caching
          entryFileNames: isProduction 
            ? 'js/[name].[hash].js' 
            : 'js/[name].js',
          chunkFileNames: isProduction 
            ? 'js/chunks/[name].[hash].js' 
            : 'js/chunks/[name].js',
          assetFileNames: (assetInfo) => {
            const extType = assetInfo.name?.split('.').pop();
            if (extType && /png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
              return 'assets/images/[name].[hash][extname]';
            }
            if (extType && /css/i.test(extType)) {
              return 'assets/css/[name].[hash][extname]';
            }
            if (extType && /woff2?|ttf|eot/i.test(extType)) {
              return 'assets/fonts/[name].[hash][extname]';
            }
            return 'assets/other/[name].[hash][extname]';
          }
        },
        // Externe Pakete, die nicht gebündelt werden sollen
        external: []
      },
      
      // Optimierungen
      target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
      // Worker-Threads konfiguration (bessere Performance für große Builds)
      workers: {
        format: 'es',
        plugins: []
      }
    },
    
    // Optimierungen für Tests und Entwicklung
    optimizeDeps: {
      include: [
        'vue',
        'vue-router',
        'pinia',
        '@vueuse/core',
        'axios',
        'uuid',
        'marked'
      ],
      exclude: ['vue-demi']
    },
    
    // Verbesserte Abhängigkeitenscannung
    esbuild: {
      drop: isProduction ? ['console', 'debugger'] : [],
      legalComments: 'none',
      minifyIdentifiers: isProduction,
      minifySyntax: isProduction,
      minifyWhitespace: isProduction
    }
  };
});