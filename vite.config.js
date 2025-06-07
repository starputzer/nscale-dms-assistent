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
    port: 3000,
    middlewareMode: false,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
        ws: true,
        // Enhanced configuration to ensure headers are properly forwarded
        configure: (proxy, options) => {
          // Before the request is sent to the target
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Enhanced logging with all headers
            console.log(`[Proxy] ${req.method} ${req.url}`);
            console.log('[Proxy] Original headers:', JSON.stringify(req.headers, null, 2));
            
            // Get authorization header - check multiple variations
            const authHeader = req.headers.authorization || 
                              req.headers.Authorization || 
                              req.headers['authorization'] || 
                              req.headers['Authorization'];
            
            // Also check for Bearer token in different formats
            const bearerToken = req.headers['bearer'] || req.headers['Bearer'];
            
            if (authHeader) {
              // Ensure the header is set correctly
              proxyReq.setHeader('Authorization', authHeader);
              proxyReq.setHeader('authorization', authHeader); // Also set lowercase
              console.log('[Proxy] ✅ Authorization header forwarded:', authHeader.substring(0, 30) + '...');
            } else if (bearerToken) {
              // Handle case where token might be sent as 'Bearer' header
              const fullAuthHeader = `Bearer ${bearerToken}`;
              proxyReq.setHeader('Authorization', fullAuthHeader);
              proxyReq.setHeader('authorization', fullAuthHeader);
              console.log('[Proxy] ✅ Bearer token converted to Authorization header');
            } else {
              console.log('[Proxy] ⚠️  No authorization header found in request');
            }
            
            // Forward all original headers to ensure nothing is lost
            Object.keys(req.headers).forEach(headerName => {
              const headerValue = req.headers[headerName];
              // Skip host header as it should be set by changeOrigin
              if (headerName.toLowerCase() !== 'host' && headerValue) {
                // Handle array headers (like cookies)
                if (Array.isArray(headerValue)) {
                  headerValue.forEach(value => {
                    proxyReq.setHeader(headerName, value);
                  });
                } else {
                  proxyReq.setHeader(headerName, headerValue);
                }
              }
            });
            
            // Special handling for streaming endpoints
            if (req.url.includes('/stream') || req.url.includes('/sse')) {
              proxyReq.setHeader('X-Accel-Buffering', 'no');
              proxyReq.setHeader('Cache-Control', 'no-cache');
              proxyReq.setHeader('Connection', 'keep-alive');
            }
            
            // Debug: Log all headers being sent to backend
            console.log('[Proxy] Headers being sent to backend:', proxyReq.getHeaders());
          });
          
          // Handle the proxy response
          proxy.on('proxyRes', (proxyRes, req, res) => {
            // Enhanced response logging
            console.log(`[Proxy Response] ${req.method} ${req.url} - Status: ${proxyRes.statusCode}`);
            
            // Log auth-related error responses
            if (proxyRes.statusCode === 401 || proxyRes.statusCode === 403) {
              console.error('[Proxy Response] ❌ Authentication error:', {
                status: proxyRes.statusCode,
                headers: proxyRes.headers,
                url: req.url
              });
            }
            
            // Handle streaming responses
            if (req.url.includes('/stream') || req.url.includes('/sse')) {
              proxyRes.headers['cache-control'] = 'no-cache';
              proxyRes.headers['x-accel-buffering'] = 'no';
              proxyRes.headers['connection'] = 'keep-alive';
              if (!proxyRes.headers['content-type']?.includes('event-stream')) {
                proxyRes.headers['content-type'] = 'text/event-stream';
              }
            }
            
            // Preserve CORS headers from backend
            const corsHeaders = ['access-control-allow-origin', 'access-control-allow-credentials', 
                               'access-control-allow-headers', 'access-control-allow-methods'];
            corsHeaders.forEach(header => {
              if (proxyRes.headers[header]) {
                res.setHeader(header, proxyRes.headers[header]);
              }
            });
          });
          
          // Enhanced error handling
          proxy.on('error', (err, req, res) => {
            console.error('[Proxy Error] ❌', {
              message: err.message,
              code: err.code,
              target: options.target,
              url: req.url,
              headers: req.headers
            });
            
            // Check if it's a connection error
            if (err.code === 'ECONNREFUSED') {
              console.error('[Proxy Error] Backend server is not running on', options.target);
              console.error('[Proxy Error] Make sure to start the backend with: python api/server.py');
            }
            
            // Return a proper error response
            if (!res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                error: 'Service temporarily unavailable',
                message: 'Backend server is not responding',
                details: err.message,
                timestamp: new Date().toISOString()
              }));
            }
          });
        },
        // Additional proxy options to ensure proper header handling
        headers: {
          // Preserve the original host header
          'X-Forwarded-Host': 'localhost:3000',
          'X-Forwarded-Proto': 'http'
        }
      },
    },
  },
});