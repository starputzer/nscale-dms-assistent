import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'

// Best Practice: Centralized proxy configuration
const BACKEND_URL = 'http://localhost:8080'
const API_PREFIX = '/api'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@/shared': fileURLToPath(new URL('./shared', import.meta.url)),
    }
  },
  server: {
    port: 3003,
    proxy: {
      // Single proxy rule for all API calls
      // This catches anything starting with /api and forwards to backend
      [API_PREFIX]: {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: false,
        ws: true, // Enable WebSocket proxy
        configure: (proxy, options) => {
          // Log proxy requests for debugging
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log(`[Proxy] ${req.method} ${req.url} -> ${BACKEND_URL}${req.url}`)
          })
          
          proxy.on('error', (err, req, res) => {
            console.error('[Proxy Error]', err)
          })
        }
      }
    }
  },
  build: {
    target: 'es2020',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['vue', 'vue-router', 'pinia'],
          'ui': ['@vueuse/core'],
        }
      }
    }
  },
  optimizeDeps: {
    include: ['vue', 'vue-router', 'pinia', '@vueuse/core']
  }
})