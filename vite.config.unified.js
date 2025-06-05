import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

export default defineConfig({
  plugins: [
    vue(),
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
    port: 5173,
    middlewareMode: false,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
        ws: true,
        // Critical fix: Configure the proxy to properly forward headers
        configure: (proxy, options) => {
          // Fix for Authorization header not being forwarded
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Log the request for debugging
            console.log(`[Proxy] ${req.method} ${req.url}`);
            
            // Get the authorization header from the original request
            const authHeader = req.headers.authorization || req.headers.Authorization;
            
            if (authHeader) {
              // Explicitly set the Authorization header on the proxy request
              proxyReq.setHeader('Authorization', authHeader);
              console.log('[Proxy] Authorization header forwarded:', authHeader.substring(0, 20) + '...');
            }
            
            // Also forward other important headers
            const headersToForward = [
              'content-type',
              'accept',
              'accept-language',
              'user-agent',
              'x-requested-with'
            ];
            
            headersToForward.forEach(headerName => {
              const headerValue = req.headers[headerName];
              if (headerValue) {
                proxyReq.setHeader(headerName, headerValue);
              }
            });
            
            // Special handling for streaming endpoints
            if (req.url.includes('/stream') || req.url.includes('/sse')) {
              proxyReq.setHeader('X-Accel-Buffering', 'no');
              proxyReq.setHeader('Cache-Control', 'no-cache');
            }
          });
          
          // Handle the proxy response
          proxy.on('proxyRes', (proxyRes, req, res) => {
            // Log response status
            console.log(`[Proxy Response] ${req.method} ${req.url} - ${proxyRes.statusCode}`);
            
            // Handle streaming responses
            if (req.url.includes('/stream') || req.url.includes('/sse')) {
              proxyRes.headers['cache-control'] = 'no-cache';
              proxyRes.headers['x-accel-buffering'] = 'no';
              if (!proxyRes.headers['content-type']?.includes('event-stream')) {
                proxyRes.headers['content-type'] = 'text/event-stream';
              }
            }
          });
          
          // Handle proxy errors
          proxy.on('error', (err, req, res) => {
            console.error('[Proxy Error]', err.message);
            
            // Return a proper error response
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              error: 'Service temporarily unavailable',
              message: 'Backend server is not responding'
            }));
          });
        },
      },
    },
  },
});