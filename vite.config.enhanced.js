import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

// Custom plugin to ensure headers are preserved
const headerPreservationPlugin = () => ({
  name: 'header-preservation',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      // Log all incoming requests with headers
      if (req.url?.startsWith('/api')) {
        console.log('[Header Plugin] Incoming request:', {
          url: req.url,
          method: req.method,
          headers: req.headers,
          authorization: req.headers.authorization || 'NONE'
        });
      }
      next();
    });
  }
});

export default defineConfig({
  plugins: [
    vue(),
    headerPreservationPlugin(),
    {
      name: 'html-transform',
      transformIndexHtml(html) {
        return html;
      }
    }
  ],
  appType: 'spa',
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/shared": path.resolve(__dirname, "./shared"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@composables": path.resolve(__dirname, "./src/composables"),
      "@stores": path.resolve(__dirname, "./src/stores"),
      "@utils": path.resolve(__dirname, "./src/utils"),
      "@views": path.resolve(__dirname, "./src/views"),
      "@types": path.resolve(__dirname, "./src/types"),
      "@assets": path.resolve(__dirname, "./src/assets"),
    },
  },
  define: {
    "process.env": {
      NODE_ENV: JSON.stringify(process.env.NODE_ENV),
    },
  },
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      scss: {
        additionalData: ``,
        charset: false,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: process.env.NODE_ENV !== "production",
    chunkSizeWarningLimit: 1000,
    emptyOutDir: true,
    assetsDir: "assets",
    rollupOptions: {
      input: "index.html",
      output: {
        manualChunks: {
          vendor: [
            "vue",
            "vue-router",
            "pinia",
            "@vuelidate/core",
            "@vuelidate/validators",
          ],
          ui: ["./src/components/ui"],
        },
      },
    },
  },
  server: {
    port: 3000,
    middlewareMode: false,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
        ws: true,
        // Option 1: Use bypass to handle auth headers manually
        bypass(req, res, proxyOptions) {
          // Check if we need to handle auth specially
          const authHeader = req.headers.authorization || 
                           req.headers.Authorization || 
                           req.headers['authorization'] || 
                           req.headers['Authorization'];
          
          if (authHeader) {
            console.log('[Proxy Bypass] Found auth header, ensuring it\'s preserved');
            // Store in a way that survives the proxy
            req.headers['x-original-authorization'] = authHeader;
          }
          
          // Return undefined to continue with normal proxy
          return undefined;
        },
        // Option 2: Use rewrite to handle headers
        rewrite: (path) => {
          console.log('[Proxy Rewrite] Path:', path);
          return path;
        },
        // Option 3: Configure the underlying http-proxy
        configure: (proxy, options) => {
          // Intercept the proxy request
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('[Enhanced Proxy] Processing request:', req.url);
            
            // Method 1: Direct header copy
            const authHeader = req.headers.authorization || 
                              req.headers.Authorization || 
                              req.headers['authorization'] || 
                              req.headers['Authorization'] ||
                              req.headers['x-original-authorization'];
            
            if (authHeader) {
              // Remove any existing auth headers first
              proxyReq.removeHeader('authorization');
              proxyReq.removeHeader('Authorization');
              
              // Set the header multiple ways to ensure it works
              proxyReq.setHeader('Authorization', authHeader);
              proxyReq.setHeader('authorization', authHeader);
              
              console.log('[Enhanced Proxy] ✅ Auth header set:', authHeader.substring(0, 40) + '...');
            } else {
              console.log('[Enhanced Proxy] ⚠️ No auth header found');
              console.log('[Enhanced Proxy] Available headers:', Object.keys(req.headers));
            }
            
            // Method 2: Raw header manipulation
            const rawHeaders = proxyReq.getHeaders();
            console.log('[Enhanced Proxy] Raw headers before:', rawHeaders);
            
            // Method 3: Use _headers directly (internal property)
            if (!authHeader && req.headers.authorization) {
              proxyReq._headers = proxyReq._headers || {};
              proxyReq._headers['authorization'] = req.headers.authorization;
              console.log('[Enhanced Proxy] Set via _headers');
            }
            
            // Copy all headers with special handling
            Object.entries(req.headers).forEach(([key, value]) => {
              if (key.toLowerCase() !== 'host' && value) {
                // Special handling for auth-related headers
                if (key.toLowerCase().includes('auth') || key.toLowerCase().includes('bearer')) {
                  console.log(`[Enhanced Proxy] Copying header ${key}: ${value}`);
                }
                proxyReq.setHeader(key, value);
              }
            });
            
            // Ensure connection stays alive for streaming
            if (req.url.includes('/stream') || req.url.includes('/sse')) {
              proxyReq.setHeader('Connection', 'keep-alive');
              proxyReq.setHeader('Cache-Control', 'no-cache');
              proxyReq.setHeader('X-Accel-Buffering', 'no');
            }
            
            // Final header check
            console.log('[Enhanced Proxy] Final headers:', proxyReq.getHeaders());
          });
          
          // Log the response
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log(`[Enhanced Proxy Response] ${req.url} - ${proxyRes.statusCode}`);
            
            if (proxyRes.statusCode === 401 || proxyRes.statusCode === 403) {
              console.error('[Enhanced Proxy] AUTH ERROR Response:', {
                status: proxyRes.statusCode,
                statusMessage: proxyRes.statusMessage,
                headers: proxyRes.headers,
                url: req.url,
                originalHeaders: req.headers
              });
              
              // Try to read the response body for more details
              let body = '';
              proxyRes.on('data', (chunk) => {
                body += chunk.toString();
              });
              proxyRes.on('end', () => {
                if (body) {
                  console.error('[Enhanced Proxy] Error response body:', body);
                }
              });
            }
            
            // Ensure CORS headers are preserved
            if (proxyRes.headers['access-control-allow-origin']) {
              res.setHeader('access-control-allow-origin', proxyRes.headers['access-control-allow-origin']);
            }
            if (proxyRes.headers['access-control-allow-credentials']) {
              res.setHeader('access-control-allow-credentials', proxyRes.headers['access-control-allow-credentials']);
            }
            if (proxyRes.headers['access-control-allow-headers']) {
              res.setHeader('access-control-allow-headers', proxyRes.headers['access-control-allow-headers']);
            }
          });
          
          // Error handling
          proxy.on('error', (err, req, res) => {
            console.error('[Enhanced Proxy Error]', err);
            if (!res.headersSent) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                error: 'Proxy error',
                message: err.message,
                code: err.code
              }));
            }
          });
        },
        // Additional options that might help
        headers: {
          // These headers are added to all proxied requests
          'X-Forwarded-For': 'vite-proxy',
          'X-Real-IP': 'localhost'
        }
      },
    },
  },
});