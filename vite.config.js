import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'url';
import { resolve, join, dirname } from 'path';
import fs from 'fs';

// Bestimme das Basisverzeichnis des Projekts
const projectRoot = resolve(__dirname);
const frontendDir = resolve(projectRoot, 'frontend');
const distDir = resolve(projectRoot, 'api/frontend');

// Logging für den Entwicklungsprozess
console.log('Vite-Konfiguration wird geladen');
console.log(`Projekt-Verzeichnis: ${projectRoot}`);
console.log(`Frontend-Verzeichnis: ${frontendDir}`);
console.log(`Dist-Verzeichnis: ${distDir}`);

// Wichtige Dateien auf Existenz prüfen
const mainJsPath = resolve(frontendDir, 'main.js');
const jsMainJsPath = resolve(frontendDir, 'js/main.js');
console.log(`main.js existiert: ${fs.existsSync(mainJsPath)}`);
console.log(`js/main.js existiert: ${fs.existsSync(jsMainJsPath)}`);

/**
 * Plugin zur Behebung von NPM-Modulen Problemen
 * Stellt virtuelle Module für nicht-installierte NPM-Pakete bereit
 */
function npmModulesPlugin() {
  return {
    name: 'npm-modules-fix',
    resolveId(id) {
      // Behandelt uuid und andere problematische Module
      if (id === 'uuid') {
        // Virtuelles Modul für uuid
        return '\0virtual:uuid';
      }
      return null;
    },
    load(id) {
      // Stellt virtuellen Code für uuid-Modul bereit
      if (id === '\0virtual:uuid') {
        return `
          import { v4 } from '/src/vue-implementation/utils/uuidUtil';
          export { v4 };
          export default { v4 };
        `;
      }
      return null;
    }
  };
}

/**
 * Handler für Symlinks in der Anwendung
 * Löst Symlinks auf und verfolgt sie bis zum tatsächlichen Pfad
 */
function resolveSymlinks(path) {
  try {
    // Prüfe, ob der Pfad existiert
    if (!fs.existsSync(path)) {
      return path;
    }

    // Prüfe, ob es ein Symlink ist
    const stats = fs.lstatSync(path);
    if (!stats.isSymbolicLink()) {
      return path;
    }

    // Löse den Symlink auf
    const target = fs.readlinkSync(path);
    const resolvedPath = resolve(dirname(path), target);
    
    console.log(`Symlink aufgelöst: ${path} -> ${resolvedPath}`);
    
    // Rekursiv auflösen (falls der Symlink auf einen anderen Symlink zeigt)
    return resolveSymlinks(resolvedPath);
  } catch (err) {
    console.error(`Fehler beim Auflösen des Symlinks ${path}:`, err);
    return path;
  }
}

/**
 * Virtuelles Plugin zur Behebung der /static/ Pfade
 * Dieses Plugin erstellt virtuelle statische Dateien für CSS, JS und Bilder
 */
function staticAssetsPlugin() {
  return {
    name: 'static-assets-fix',
    configureServer(server) {
      // Middleware für /static/, /frontend/ und direkte Pfade 
      server.middlewares.use((req, res, next) => {
        // Verbesserte Pfadbehandlung - unterstützt verschiedene Pfadpräfixe
        let relativePath = req.url;
        let directPath = false;
        
        // Behandle /frontend/ Endpunkt direkt
        if (relativePath === '/frontend/' || relativePath === '/frontend') {
          const indexPath = resolve(frontendDir, 'index.html');
          if (fs.existsSync(indexPath)) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            fs.createReadStream(indexPath).pipe(res);
            return;
          }
        }
        
        // Entferne bekannte Präfixe
        if (relativePath.startsWith('/static/')) {
          relativePath = relativePath.replace('/static/', '/');
        } else if (relativePath.startsWith('/frontend/')) {
          relativePath = relativePath.replace('/frontend/', '/');
        }
        
        // Entferne führenden Slash
        if (relativePath.startsWith('/')) {
          relativePath = relativePath.substring(1);
        }
        
        // Bestimme Dateityp und Pfade
        const ext = relativePath.split('.').pop().toLowerCase();
        const cssPath = resolve(frontendDir, 'css', relativePath.replace('css/', ''));
        const jsPath = resolve(frontendDir, 'js', relativePath.replace('js/', ''));
        const imagesPath = resolve(frontendDir, 'images', relativePath.replace('images/', ''));
        
        // Korrekter Content-Type basierend auf Dateiendung
        let contentType = 'application/octet-stream';
        if (ext === 'css') contentType = 'text/css';
        else if (ext === 'js') contentType = 'application/javascript';
        else if (ext === 'png') contentType = 'image/png';
        else if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
        else if (ext === 'svg') contentType = 'image/svg+xml';
        else if (ext === 'html') contentType = 'text/html';
        
        // Lokalisiere die Datei in verschiedenen möglichen Verzeichnissen
        let filePath = null;
        
        // CSS-Dateien
        if (relativePath.startsWith('css/') || relativePath.endsWith('.css')) {
          const cssName = relativePath.replace('css/', '');
          filePath = resolve(frontendDir, 'css', cssName);
          contentType = 'text/css';
        } 
        // JS-Dateien
        else if (relativePath.startsWith('js/') || relativePath.endsWith('.js')) {
          const jsName = relativePath.replace('js/', '');
          filePath = resolve(frontendDir, 'js', jsName);
          contentType = 'application/javascript';
        } 
        // Bild-Dateien
        else if (relativePath.startsWith('images/') || 
                ['png', 'jpg', 'jpeg', 'svg', 'gif'].includes(ext)) {
          const imgName = relativePath.replace('images/', '');
          filePath = resolve(frontendDir, 'images', imgName);
          // MIME-Typ bereits oben festgelegt
        }
        // Versuche direkt im frontend-Verzeichnis
        else {
          filePath = resolve(frontendDir, relativePath);
        }
        
        // Löse Symlinks auf, bevor wir mit der Datei arbeiten
        if (filePath && fs.existsSync(filePath)) {
          try {
            filePath = resolveSymlinks(filePath);
          } catch (err) {
            console.error('Fehler beim Auflösen des Symlinks:', err);
          }
        }
        
        // Prüfe, ob die Datei existiert und keine Verzeichnis ist
        if (filePath && fs.existsSync(filePath)) {
          // Überprüfe, ob es sich um ein Verzeichnis handelt
          const stats = fs.statSync(filePath);
          if (stats.isDirectory()) {
            // Wenn es ein Verzeichnis ist, prüfe auf index.html oder ignoriere
            const indexPath = resolve(filePath, 'index.html');
            if (fs.existsSync(indexPath)) {
              res.writeHead(200, { 
                'Content-Type': 'text/html',
                'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
              });
              fs.createReadStream(indexPath).pipe(res);
              return;
            }
            // Andernfalls gehe zum nächsten Middleware
            next();
            return;
          }
          
          // Es ist eine Datei, sende sie
          res.writeHead(200, { 
            'Content-Type': contentType,
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
          });
          
          try {
            // Überprüfe nochmals, ob der Pfad ein Verzeichnis ist (für den Fall einer Symlink-Auflösung)
            const finalStats = fs.statSync(filePath);
            if (finalStats.isDirectory()) {
              console.warn(`Verzeichnis statt Datei angefordert: ${filePath}`);
              next();
              return;
            }
            
            // Sichere Erstellung des ReadStreams
            const readStream = fs.createReadStream(filePath);
            
            // Fehlerbehandlung für den Stream
            readStream.on('error', (streamErr) => {
              console.error(`Stream-Fehler für ${filePath}:`, streamErr);
              if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end(`Fehler beim Lesen der Datei: ${streamErr.message}`);
              }
            });
            
            // Pipe zum Response
            readStream.pipe(res);
          } catch (err) {
            console.error(`Fehler beim Lesen der Datei ${filePath}:`, err);
            if (!res.headersSent) {
              res.writeHead(500, { 'Content-Type': 'text/plain' });
              res.end(`Serverfehler: ${err.message}`);
            }
          }
          return;
        }
        
        // Wenn keine spezielle Behandlung erforderlich ist, weiter zum nächsten Middleware
        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    staticAssetsPlugin(), // Plugin für statische Assets
    npmModulesPlugin(), // Plugin für NPM-Module Probleme
  ],
  
  // Optimiere die Abhängigkeitsauflösung
  optimizeDeps: {
    include: ['vue'],
    exclude: [],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  
  // Verbesserte Alias-Konfiguration
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@frontend': frontendDir,
      '@assets': resolve(frontendDir, 'assets'),
      '@components': resolve(frontendDir, 'vue/components'),
      '@composables': resolve(frontendDir, 'vue/composables'),
      // Statische Assets-Aliase
      '/static/css/': resolve(frontendDir, 'css') + '/',
      '/static/js/': resolve(frontendDir, 'js') + '/',
      '/static/images/': resolve(frontendDir, 'images') + '/',
      // Vue-Module
      'vue': resolve(projectRoot, 'node_modules/vue/dist/vue.esm-bundler.js'),
      '@vue/runtime-dom': resolve(projectRoot, 'node_modules/@vue/runtime-dom/dist/runtime-dom.esm-bundler.js'),
      '@vue/shared': resolve(projectRoot, 'node_modules/@vue/shared/dist/shared.esm-bundler.js'),
      '@vue/reactivity': resolve(projectRoot, 'node_modules/@vue/reactivity/dist/reactivity.esm-bundler.js'),
    },
    extensions: ['.js', '.ts', '.vue', '.json'],
  },
  
  // Server-Konfiguration für die Entwicklung
  server: {
    port: 3000,
    strictPort: true,
    cors: true,
    hmr: true, // Hot Module Replacement aktivieren
    // Konfiguriere Vite, um Ressourcen aus dem frontend-Verzeichnis zu servieren
    fs: {
      strict: false,
      allow: [projectRoot, frontendDir],
    },
    // Proxy-Konfiguration für API-Anfragen
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  
  // Build-Optionen
  build: {
    outDir: distDir,
    assetsDir: 'assets',
    emptyOutDir: true,
    sourcemap: true,
    
    // Kopieren von statischen Dateien während des Builds
    rollupOptions: {
      input: {
        // Prüfe, ob die Pfade existieren, bevor sie als Input definiert werden
        main: fs.existsSync(resolve(frontendDir, 'main.js')) ? resolve(frontendDir, 'main.js') : null,
        admin: fs.existsSync(resolve(frontendDir, 'js/admin.js')) ? resolve(frontendDir, 'js/admin.js') : null,
        docConverter: fs.existsSync(resolve(frontendDir, 'vue/doc-converter-app.js')) ? resolve(frontendDir, 'vue/doc-converter-app.js') : null,
        dmsAssistant: fs.existsSync(resolve(frontendDir, 'vue-dms-assistant.html')) ? resolve(frontendDir, 'vue-dms-assistant.html') : null,
        index: resolve(frontendDir, 'index.html'),
      },
      // Entferne null-Werte aus dem input-Objekt
      get input() {
        const input = this._input;
        Object.keys(input).forEach(key => input[key] === null && delete input[key]);
        return input;
      },
      set input(value) {
        this._input = value;
      },
      _input: {},
      output: {
        entryFileNames: 'js/[name].js',
        chunkFileNames: 'js/chunks/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const extType = assetInfo.name.split('.').at(1);
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            return 'images/[name][extname]';
          }
          if (/css/i.test(extType)) {
            return 'css/[name][extname]';
          }
          return 'assets/[name][extname]';
        },
        manualChunks: {
          'vue-vendor': ['vue'],
          'common-utils': [
            './frontend/js/utils.ts',
          ],
        },
      },
    },
  },
});