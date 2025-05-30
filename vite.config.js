import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

export default defineConfig({
  plugins: [vue()],
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
        // Vereinfachte Konfiguration ohne zusätzliche Importe
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
          bridge: ["./src/bridge/index.ts"],
          ui: ["./src/components/ui"],
        },
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
        // Bei Fehlern Mock-Daten zurückgeben
        configure: (proxy, options) => {
          // Handle streaming endpoints - disable buffering
          proxy.on('proxyReq', (proxyReq, req, res) => {
            if (req.url.includes('/api/question/stream')) {
              console.log("Configuring streaming endpoint:", req.url);
              // Disable buffering for streaming
              proxyReq.setHeader('X-Accel-Buffering', 'no');
              proxyReq.setHeader('Cache-Control', 'no-cache');
            }
          });
          
          proxy.on('proxyRes', (proxyRes, req, res) => {
            if (req.url.includes('/api/question/stream')) {
              console.log("Streaming response headers:", proxyRes.headers);
              // Ensure streaming headers are set
              proxyRes.headers['cache-control'] = 'no-cache';
              proxyRes.headers['x-accel-buffering'] = 'no';
              // Don't override content-type if it's already set correctly by backend
              if (!proxyRes.headers['content-type'] || !proxyRes.headers['content-type'].includes('event-stream')) {
                proxyRes.headers['content-type'] = 'text/event-stream';
              }
            }
          });

          proxy.on("error", (err, req, res) => {
            console.log("Proxy-Fehler:", err);

            // Mock-Antworten je nach API-Endpunkt
            if (req.url.includes("/api/sessions")) {
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  sessions: [
                    {
                      id: "1",
                      title: "Beispiel-Session 1",
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    },
                    {
                      id: "2",
                      title: "Beispiel-Session 2",
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    },
                  ],
                }),
              );
            } else if (req.url.includes("/api/session/")) {
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ success: true }));
            } else {
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  message: "Mock-Antwort (Backend nicht erreichbar)",
                }),
              );
            }
          });
        },
      },
    },
  },
});
