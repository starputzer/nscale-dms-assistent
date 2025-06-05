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
    plugins: [
      vue(),
      splitVendorChunkPlugin(),
      viteCompression({
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
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/assets/styles/variables.css";`,
          api: "modern",
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