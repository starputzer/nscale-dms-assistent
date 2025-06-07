import { defineConfig, loadEnv, UserConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";
import { resolve } from "node:path";
import { visualizer } from "rollup-plugin-visualizer";
import viteCompression from "vite-plugin-compression";
import { splitVendorChunkPlugin } from "vite";
import autoprefixer from "autoprefixer";
<<<<<<< HEAD
=======
import { buildExclusions } from "./src/config/build-exclusions";
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da

// Pfade für Projektstruktur
const projectRoot = resolve(__dirname);
const srcDir = resolve(projectRoot, "src");
<<<<<<< HEAD
const distDir = resolve(projectRoot, "dist");

// Optimized manual chunks configuration
const createManualChunks = (id: string) => {
  // Core Vue (smallest possible chunk)
  if (id.includes('vue') && !id.includes('router') && !id.includes('use')) {
    return 'vue-core';
  }
  
  // Vue ecosystem (router, pinia) - loaded after core
  if (id.includes('vue-router') || id.includes('pinia')) {
    return 'vue-ecosystem';
  }
  
  // Admin panel - lazy loaded for admin users only
  if (id.includes('/admin/') || id.includes('AdminPanel') || id.includes('AdminDashboard')) {
    return 'admin-panel';
  }
  
  // Document processing - lazy loaded when needed
  if (id.includes('DocumentConverter') || id.includes('DocumentUpload')) {
    return 'doc-converter';
  }
  
  // Heavy libraries - lazy loaded
  if (id.includes('highlight.js') || id.includes('marked') || id.includes('dompurify')) {
    return 'heavy-libs';
  }
  
  // Utils and composables - shared chunk
  if (id.includes('/utils/') || id.includes('/composables/')) {
    return 'shared-utils';
  }
  
  // All other vendor modules
  if (id.includes('node_modules')) {
    return 'vendor-misc';
  }
};

export default defineConfig(({ mode }): UserConfig => {
  const env = loadEnv(mode, process.cwd(), "");
  const isProduction = mode === "production";

  return {
=======
const distDir = resolve(projectRoot, "api/frontend");

// Helper-Funktionen für Chunk-Splitting
function isVendorModule(id: string): boolean {
  return id.includes("node_modules");
}

function getVendorChunkName(id: string): string {
  // Extrahiere Paketname aus Node-Modulen-Pfad
  const vendorMatch = id.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/);
  if (!vendorMatch) return "vendor-misc";

  const vendorName = vendorMatch[1];

  // Kritische Framework-Pakete - diese sollten zuerst geladen werden
  if (
    ["vue", "@vue/runtime-core", "@vue/runtime-dom", "@vue/reactivity"].some(
      (pkg) => vendorName.startsWith(pkg),
    )
  ) {
    return "vendor-vue-core";
  }

  // Vue-Router separat, da nicht auf allen Seiten benötigt
  if (vendorName === "vue-router") {
    return "vendor-vue-router";
  }

  // State Management
  if (["pinia", "pinia-plugin-persistedstate"].includes(vendorName)) {
    return "vendor-state";
  }

  // HTTP-Client
  if (["axios"].includes(vendorName)) {
    return "vendor-http";
  }

  // Utility-Bibliotheken - nur die wirklich genutzten
  if (["uuid", "@vueuse/core"].includes(vendorName)) {
    return "vendor-utils-core";
  }

  // Große/selten genutzte Utils separat
  if (
    ["lodash", "lodash-es", "moment", "dayjs", "date-fns"].some((pkg) =>
      vendorName.startsWith(pkg),
    )
  ) {
    return "vendor-utils-large";
  }

  // UI-Bibliotheken für Markdown/Code-Highlighting
  if (["marked", "dompurify"].includes(vendorName)) {
    return "vendor-markdown";
  }

  if (["highlight.js", "prismjs"].some((pkg) => vendorName.startsWith(pkg))) {
    return "vendor-code-highlight";
  }

  // Icons und UI-Komponenten
  if (
    ["@fortawesome", "@mdi", "font-awesome"].some((pkg) =>
      vendorName.startsWith(pkg),
    )
  ) {
    return "vendor-icons";
  }

  // Vuetify oder andere UI-Frameworks
  if (["vuetify", "@vuetify"].some((pkg) => vendorName.startsWith(pkg))) {
    return "vendor-ui-framework";
  }

  // Andere Vendor-Pakete in einen gemeinsamen Chunk
  return "vendor-misc";
}

function getFeatureChunkName(id: string): string | undefined {
  // Spezifische Verzeichnisse auf bestimmte Feature-Chunks abbilden
  if (id.includes("/components/chat/")) {
    // Unterscheide zwischen Basis- und erweiterten Chat-Komponenten
    return id.includes("/enhanced/")
      ? "feature-chat-enhanced"
      : "feature-chat-base";
  }

  if (id.includes("/components/admin/")) {
    // Admin-Feature-Unterteilung
    if (id.includes("/document-converter/")) {
      return "feature-doc-converter";
    }
    if (id.includes("/tabs/")) {
      return "feature-admin-tabs";
    }
    return "feature-admin-core";
  }

  if (id.includes("/components/ui/")) {
    // UI-Komponenten-Kategorisierung
    if (id.includes("/base/")) return "ui-base";
    if (id.includes("/data/")) return "ui-data";
    if (id.includes("/layout/")) return "ui-layout";
    return "ui-common";
  }

  if (id.includes("/components/layout/")) {
    return "feature-layouts";
  }

  if (id.includes("/views/")) {
    // View-spezifische Chunks
    const viewName = id.split("/views/")[1].split(".")[0];

    // Gruppiere verwandte Views
    if (["ChatView", "EnhancedChatView"].includes(viewName)) {
      return "view-chat";
    }
    if (["AdminView", "SettingsView"].includes(viewName)) {
      return "view-admin";
    }
    if (["DocumentsView"].includes(viewName)) {
      return "view-docs";
    }
    if (["LoginView", "ErrorView"].includes(viewName)) {
      return "view-system";
    }

    // Falls keine spezifische Gruppierung, fallback auf generischen View-Chunk
    return "views-other";
  }

  if (id.includes("/stores/")) {
    // Store-Kategorisierung
    if (id.includes("/admin/")) return "stores-admin";
    if (id.includes("/auth")) return "stores-auth";
    if (id.includes("/sessions")) return "stores-sessions";
    if (id.includes("/documentConverter")) return "stores-documents";
    if (id.includes("/ui") || id.includes("/monitoring")) return "stores-ui";
    return "stores-other";
  }

  if (id.includes("/services/")) {
    // Service-Kategorisierung
    if (id.includes("/api/")) return "services-api";
    if (id.includes("/ui/")) return "services-ui";
    if (id.includes("/storage/")) return "services-storage";
    if (id.includes("/log/")) return "services-logs";
    return "services-other";
  }

  if (id.includes("/utils/")) {
    return "utils";
  }

  if (id.includes("/composables/")) {
    return "composables";
  }

  if (id.includes("/assets/")) {
    return "assets";
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
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
    plugins: [
      vue(),
      splitVendorChunkPlugin(),
      viteCompression({
<<<<<<< HEAD
        algorithm: "gzip",
        ext: ".gz",
        threshold: 4096, // Only compress files > 4KB
        disable: !isProduction,
      }),
      viteCompression({
        algorithm: "brotliCompress",
        ext: ".br",
        threshold: 4096,
        disable: !isProduction,
      }),
      isProduction &&
        visualizer({
          filename: resolve(distDir, "bundle-analysis.html"),
          open: false,
          gzipSize: true,
          brotliSize: true,
          template: "treemap",
        }),
    ].filter(Boolean),

    build: {
      outDir: distDir,
      sourcemap: false, // Disable sourcemaps in production
      
      // Aggressive minification
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.debug', 'console.info'],
          passes: 3,
          unsafe: true,
          unsafe_comps: true,
          unsafe_math: true,
          unsafe_proto: true,
          unsafe_regexp: true,
        },
        mangle: {
          properties: {
            regex: /^_/ // Mangle private properties
          }
        },
        format: {
          comments: false,
        },
      },
      
      // Optimize chunks
      chunkSizeWarningLimit: 500, // Warn at 500KB
      
      rollupOptions: {
        output: {
          // Use manual chunks function
          manualChunks: createManualChunks,
          
          // Optimize asset names
          assetFileNames: (assetInfo) => {
            if (assetInfo.name?.endsWith('.css')) {
              return 'assets/css/[name]-[hash][extname]';
            }
            if (assetInfo.name?.match(/\.(png|jpe?g|gif|svg|webp|ico)$/)) {
              return 'assets/img/[name]-[hash][extname]';
            }
            return 'assets/[name]-[hash][extname]';
          },
          
          // Optimize chunk names
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
        },
        
        // Tree shaking
        treeshake: {
          preset: 'recommended',
          moduleSideEffects: false,
        },
        
        // External dependencies (load from CDN in production)
        external: isProduction ? [
          // Uncomment to use CDN
          // 'vue',
          // 'vue-router',
          // 'pinia'
        ] : [],
      },
    },
    
    // Optimize dependencies
    optimizeDeps: {
      include: [
        'vue',
        'vue-router', 
        'pinia',
        'axios',
        'date-fns/format',
        'date-fns/parseISO',
      ],
      exclude: [
        '@vue/devtools-api',
        '@vue/devtools-core',
        '@vue/devtools-kit',
      ],
    },
    
    // CSS optimizations
=======
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
          template: "treemap", // Verwende treemap für detailliertere Visualisierung
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
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/assets/styles/variables.css";`,
          api: "modern",
<<<<<<< HEAD
        },
      },
      modules: {
        generateScopedName: '[hash:base64:6]', // Shorter class names
      },
    },
    
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
        // Remove unused polyfills
        'path': false,
        'fs': false,
        'crypto': false,
      },
    },
    
    // Other configurations remain the same...
    server: {
      port: parseInt(env.VITE_PORT || "5173"),
      proxy: {
        "/api": {
          target: env.VITE_API_URL || "http://localhost:8000",
          changeOrigin: true,
        },
      },
    },
  };
});
=======
          logger: {
            warn: (message: string) => {
              // Unterdrücke Import-Warnungen
              if (message.includes("@import rules are deprecated")) {
                return;
              }
              console.warn(message);
            },
          },
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
              "Edge >= 93",
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
          target: env.VITE_API_URL || "http://localhost:8001",
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
              // Weitere Optimierungen
              passes: 2,
              toplevel: true,
              collapse_vars: true,
              inline: 2,
              // Entferne toten Code
              dead_code: true,
              // Vereinfache Conditionals
              conditionals: true,
              // Optimiere Switches
              switches: true,
            },
            mangle: {
              // Kürzere Variablennamen für kleinere Dateien
              toplevel: true,
              properties: {
                regex: /^_/, // Nur private Properties (mit _ beginnend) manglen
              },
            },
            format: {
              comments: false,
              // Kompaktere Ausgabe
              ascii_only: true,
              wrap_iife: true,
            },
          }
        : undefined,

      // Optimierter Build für Produktion mit granularem Chunk-Splitting
      rollupOptions: {
        // Exclude Mock-Dateien und Tests in Produktion
        external: isProduction
          ? buildExclusions.map(
              (pattern) => new RegExp(pattern.replace(/\*/g, ".*")),
            )
          : [],
        output: {
          // Erweiterte dynamische Chunk-Strategie mit feingranulareren Splitting
          manualChunks: isProduction
            ? (id: string) => {
                // Skip bereits verarbeitete Chunks
                if (id.includes("?")) return;

                // Vendors in separate Chunks
                if (isVendorModule(id)) {
                  return getVendorChunkName(id);
                }

                // App-Komponenten und Features in funktionale Chunks aufteilen
                const featureChunk = getFeatureChunkName(id);
                if (featureChunk) {
                  return featureChunk;
                }

                // Haupteingangspunkt bleibt im Haupt-Bundle
                if (id.includes("main.ts") || id.includes("App.vue")) {
                  return undefined;
                }

                // Alles andere in einen gemeinsamen Chunk
                return "app-misc";
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
        "pinia-plugin-persistedstate",
        "@vueuse/core",
        "axios",
        "uuid",
        "marked",
        "dompurify",
      ],
      exclude: [
        "vue-demi",
        "@vueuse/shared", // Wird automatisch von @vueuse/core geladen
      ],
      // Aggressivere Optimierung für schnellere Kaltstarts
      esbuildOptions: {
        target: "es2021",
        platform: "browser",
      },
    },

    // ESBuild-Konfiguration für ES2021
    esbuild: {
      target: "es2021",
      supported: {
        weakref: true,
        "finalization-registry": true,
      },
    },
  };
});
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
