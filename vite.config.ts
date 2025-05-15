import { defineConfig, loadEnv, UserConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";
import { resolve } from "node:path";
import { visualizer } from "rollup-plugin-visualizer";
import viteCompression from "vite-plugin-compression";
import { splitVendorChunkPlugin } from "vite";
import autoprefixer from "autoprefixer";

// Pfade für Projektstruktur
const projectRoot = resolve(__dirname);
const srcDir = resolve(projectRoot, "src");
const distDir = resolve(projectRoot, "api/frontend");

// Helper-Funktionen für Chunk-Splitting
function isVendorModule(id: string): boolean {
  return id.includes('node_modules');
}

function getVendorChunkName(id: string): string {
  // Extrahiere Paketname aus Node-Modulen-Pfad
  const vendorMatch = id.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/);
  if (!vendorMatch) return 'vendor-misc';

  const vendorName = vendorMatch[1];

  // Gruppiere wichtige Framework-Pakete
  const vuePackages = ['vue', '@vue', 'vue-router', '@vue/runtime', '@vue/reactivity'];
  if (vuePackages.some(pkg => vendorName.startsWith(pkg))) {
    return 'vendor-vue';
  }

  // State Management
  if (['pinia', 'vuex'].includes(vendorName)) {
    return 'vendor-state';
  }

  // HTTP-Client
  if (['axios', 'fetch'].includes(vendorName)) {
    return 'vendor-http';
  }

  // Utility-Bibliotheken
  const utilPackages = ['lodash', 'uuid', 'date-fns', 'dayjs', 'moment', '@vueuse'];
  if (utilPackages.some(pkg => vendorName.startsWith(pkg))) {
    return 'vendor-utils';
  }

  // UI-Bibliotheken
  const uiPackages = ['@popperjs', 'marked', 'highlight.js'];
  if (uiPackages.some(pkg => vendorName.startsWith(pkg))) {
    return 'vendor-ui-libs';
  }

  // Andere Vendor-Pakete in einen gemeinsamen Chunk
  return 'vendor-misc';
}

function getFeatureChunkName(id: string): string | undefined {
  // Spezifische Verzeichnisse auf bestimmte Feature-Chunks abbilden
  if (id.includes('/components/chat/')) {
    // Unterscheide zwischen Basis- und erweiterten Chat-Komponenten
    return id.includes('/enhanced/') ? 'feature-chat-enhanced' : 'feature-chat-base';
  }

  if (id.includes('/components/admin/')) {
    // Admin-Feature-Unterteilung
    if (id.includes('/document-converter/')) {
      return 'feature-doc-converter';
    }
    if (id.includes('/tabs/')) {
      return 'feature-admin-tabs';
    }
    return 'feature-admin-core';
  }

  if (id.includes('/components/ui/')) {
    // UI-Komponenten-Kategorisierung
    if (id.includes('/base/')) return 'ui-base';
    if (id.includes('/data/')) return 'ui-data';
    if (id.includes('/layout/')) return 'ui-layout';
    return 'ui-common';
  }

  if (id.includes('/components/layout/')) {
    return 'feature-layouts';
  }

  if (id.includes('/views/')) {
    // View-spezifische Chunks
    const viewName = id.split('/views/')[1].split('.')[0];

    // Gruppiere verwandte Views
    if (['ChatView', 'EnhancedChatView'].includes(viewName)) {
      return 'view-chat';
    }
    if (['AdminView', 'SettingsView'].includes(viewName)) {
      return 'view-admin';
    }
    if (['DocumentsView'].includes(viewName)) {
      return 'view-docs';
    }
    if (['LoginView', 'ErrorView'].includes(viewName)) {
      return 'view-system';
    }

    // Falls keine spezifische Gruppierung, fallback auf generischen View-Chunk
    return 'views-other';
  }

  if (id.includes('/stores/')) {
    // Store-Kategorisierung
    if (id.includes('/admin/')) return 'stores-admin';
    if (id.includes('/auth')) return 'stores-auth';
    if (id.includes('/sessions')) return 'stores-sessions';
    if (id.includes('/documentConverter')) return 'stores-documents';
    if (id.includes('/ui') || id.includes('/monitoring')) return 'stores-ui';
    return 'stores-other';
  }

  if (id.includes('/services/')) {
    // Service-Kategorisierung
    if (id.includes('/api/')) return 'services-api';
    if (id.includes('/ui/')) return 'services-ui';
    if (id.includes('/storage/')) return 'services-storage';
    if (id.includes('/log/')) return 'services-logs';
    return 'services-other';
  }

  if (id.includes('/utils/')) {
    return 'utils';
  }

  if (id.includes('/composables/')) {
    return 'composables';
  }

  if (id.includes('/assets/')) {
    return 'assets';
  }

  return undefined; // Falls keine Übereinstimmung, überlasse Entscheidung dem Standard-Algorithmus
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }): UserConfig => {
  // Lade Umgebungsvariablen basierend auf dem Modus (development, production, staging)
  const env = loadEnv(mode, process.cwd(), "");

  // Bestimme, ob wir uns in der Produktion befinden
  const isProduction = mode === "production";

  return {
    // Plugins für Vite
    plugins: [
      vue(),
      splitVendorChunkPlugin(),
      viteCompression({
        // GZIP-Kompression für statische Assets
        algorithm: "gzip",
        ext: ".gz",
        threshold: 10240, // 10KB Minimalgröße für Kompression
        disable: !isProduction,
        deleteOriginFile: false,
      }),
      viteCompression({
        // Brotli-Kompression für noch bessere Kompression
        algorithm: "brotliCompress",
        ext: ".br",
        threshold: 10240,
        disable: !isProduction,
        deleteOriginFile: false,
      }),
      // Bundle-Analyseplugin (nur im Produktionsmodus aktiviert)
      isProduction &&
        visualizer({
          filename: resolve(distDir, "stats.html"),
          open: false,
          gzipSize: true,
          brotliSize: true,
          template: 'treemap', // Verwende treemap für detailliertere Visualisierung
        }),
    ].filter(Boolean),

    // Definition von Umgebungsvariablen
    define: {
      // Zusätzliche Umgebungsvariablen für die Client-Seite
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
      __ENV__: JSON.stringify(mode),
    },

    // Konfiguration für die öffentlichen Verzeichnisse
    publicDir: "public",

    // Verbesserte CSS-Konfiguration
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/assets/styles/variables.css";`,
          api: 'modern',
          logger: {
            warn: (message: string) => {
              // Unterdrücke Import-Warnungen
              if (message.includes('@import rules are deprecated')) {
                return;
              }
              console.warn(message);
            }
          }
        },
      },
      // PostCSS-Plugins für CSS-Optimierung
      postcss: {
        plugins: [
          autoprefixer({
            // Aktuellere Browser für WeakRef/FinalizationRegistry-Support
            overrideBrowserslist: [
              "> 1%",
              "last 2 versions",
              "not dead",
              "not IE 11",
              "Chrome >= 93",
              "Firefox >= 92",
              "Safari >= 15",
              "Edge >= 93"
            ],
          }),
        ],
      },
      // CSS-Modul-Konfiguration
      modules: {
        generateScopedName: isProduction
          ? "[hash:base64:8]"
          : "[local]_[hash:base64:5]",
      },
      // CSS-Codeaufspaltung
      devSourcemap: !isProduction,
    },

    // Verbesserte Alias-Konfiguration
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
      extensions: [".js", ".ts", ".vue", ".json", ".mjs"],
    },

    // Server-Konfiguration für die Entwicklung
    server: {
      port: parseInt(env.VITE_PORT || "3000"),
      strictPort: true,
      cors: true,
      hmr: true,
      // Verbesserte Proxy-Konfiguration für API-Anfragen
      proxy: {
        "/api": {
          target: env.VITE_API_URL || "http://localhost:5000",
          changeOrigin: true,
          secure: false,
          ws: true,
          rewrite: (path) => path,
        },
      },
    },

    // Optimierter Preview-Server
    preview: {
      port: parseInt(env.VITE_PREVIEW_PORT || "4173"),
      strictPort: true,
      cors: true,
    },

    // Optimierte Build-Konfiguration
    build: {
      outDir: distDir,
      assetsDir: "assets",
      emptyOutDir: true,
      sourcemap: !isProduction,

      // ES2021 als Target für WeakRef und FinalizationRegistry-Unterstützung
      target: "es2021",

      // Optimierungen für Assets und Ressourcen
      assetsInlineLimit: 4096, // 4kb - kleinere Dateien werden inline eingebettet
      cssCodeSplit: true,

      // Speichergrenze erhöhen für große Projekte
      chunkSizeWarningLimit: 2000,

      // Worker-Threads für schnellere Builds
      minify: isProduction ? "terser" : false,
      terserOptions: isProduction
        ? {
            compress: {
              drop_console: true,
              drop_debugger: true,
              pure_funcs: ["console.log", "console.debug", "console.info"],
            },
            format: {
              comments: false,
            },
          }
        : undefined,
      
      // Optimierter Build für Produktion mit granularem Chunk-Splitting
      rollupOptions: {
        output: {
          // Erweiterte dynamische Chunk-Strategie mit feingranulareren Splitting
          manualChunks: isProduction
            ? (id: string) => {
                // Vendors in separate Chunks
                if (isVendorModule(id)) {
                  return getVendorChunkName(id);
                }

                // App-Komponenten und Features in funktionale Chunks aufteilen
                const featureChunk = getFeatureChunkName(id);
                if (featureChunk) {
                  return featureChunk;
                }

                // Für nicht kategorisierte Module: Standard-Chunking-Algorithmus
                return undefined;
              }
            : undefined,

          // Optimierte Dateinamenmuster für besseres Caching
          entryFileNames: isProduction ? "js/[name].[hash].js" : "js/[name].js",
          chunkFileNames: isProduction
            ? "js/chunks/[name].[hash].js"
            : "js/chunks/[name].js",
          assetFileNames: (assetInfo) => {
            const extType = assetInfo.name?.split(".").pop();
            if (extType && /png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
              return "assets/images/[name].[hash][extname]";
            }
            if (extType && /css/i.test(extType)) {
              return "assets/css/[name].[hash][extname]";
            }
            if (extType && /woff2?|ttf|eot/i.test(extType)) {
              return "assets/fonts/[name].[hash][extname]";
            }
            return "assets/other/[name].[hash][extname]";
          },
        },
      },
    },

    // Optimierungen für Tests und Entwicklung
    optimizeDeps: {
      include: [
        "vue",
        "vue-router",
        "pinia",
        "@vueuse/core",
        "axios",
        "uuid",
        "marked",
      ],
      exclude: ["vue-demi"],
    },

    // ESBuild-Konfiguration für ES2021
    esbuild: {
      target: 'es2021',
      supported: {
        'weakref': true,
        'finalization-registry': true,
      },
    },
  };
});