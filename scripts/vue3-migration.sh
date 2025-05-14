#!/bin/bash
# Vue 3 Migration Script
# Dieses Skript implementiert die finale Migration zu Vue 3 SFCs

# Farben für die Ausgabe
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging-Funktion
log() {
  echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
  echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
  echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
  echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

# Prüfen, ob wir uns im richtigen Verzeichnis befinden
if [ ! -f "package.json" ]; then
  error "Dieses Skript muss im Hauptverzeichnis der Anwendung ausgeführt werden"
  exit 1
fi

# Aktuelles Verzeichnis anzeigen
BASE_DIR=$(pwd)
log "Führe Migration im Verzeichnis $BASE_DIR aus"

# Backup erstellen
BACKUP_DIR="$BASE_DIR/backup-$(date '+%Y%m%d%H%M%S')"
log "Erstelle Backup in $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# Wichtige Dateien sichern
cp -r "$BASE_DIR/frontend" "$BACKUP_DIR/"
cp -r "$BASE_DIR/public" "$BACKUP_DIR/"
cp -r "$BASE_DIR/src" "$BACKUP_DIR/"
cp "$BASE_DIR/vite.config.js" "$BACKUP_DIR/"
cp "$BASE_DIR/package.json" "$BACKUP_DIR/"
cp "$BASE_DIR/tsconfig.json" "$BACKUP_DIR/"

success "Backup erstellt"

# Fehlende Abhängigkeiten installieren
log "Installiere fehlende Abhängigkeiten"

npm install --save pinia-plugin-persistedstate vue-router@4 @vueuse/core@10 sass deepmerge

success "Abhängigkeiten installiert"

# Verzeichnisstruktur vorbereiten
log "Erstelle optimierte Verzeichnisstruktur"

# Assets-Struktur
mkdir -p public/assets/styles
mkdir -p public/assets/images
mkdir -p src/assets/styles/base
mkdir -p src/assets/styles/utilities
mkdir -p src/assets/styles/components
mkdir -p src/assets/styles/themes
mkdir -p src/config

# Logo kopieren
if [ -f "frontend/images/senmvku-logo.png" ]; then
  cp frontend/images/senmvku-logo.png public/assets/images/
fi

success "Verzeichnisstruktur erstellt"

# Erstelle Basis-CSS-Datei für initiales Rendering
log "Erstelle Basis-CSS für initiales Rendering"

cat > public/assets/styles/base.css << 'EOF'
/* 
 * Base CSS für initiales Rendering
 * Diese Datei enthält das Minimum an CSS, das für ein korrektes initiales Rendering
 * benötigt wird, bevor die Hauptanwendung geladen ist.
 */

:root {
  /* Primary color palette */
  --nscale-green: #00a550;
  --nscale-green-dark: #008d45;
  --nscale-green-darker: #00773b;
  --nscale-green-light: #e8f7ef;
  --nscale-green-lighter: #f2fbf7;
  
  /* Basic color palette */
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --bg-tertiary: #f1f5f9;
  --text-primary: #333333;
  --text-secondary: #666666;
  --text-muted: #888888;
  --border-color: #e2e8f0;

  /* Basic spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
}

/* Basic body styles */
body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.5;
  transition: background-color 0.3s ease, color 0.3s ease;
}

/* Loader screen styles */
.app-loader {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--bg-primary);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  transition: opacity 0.3s ease-out;
}

.app-loader-fade {
  opacity: 0;
}

.app-loader-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
  text-align: center;
}

.app-loader-logo {
  width: 80px;
  height: auto;
}

.app-loader-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(0, 165, 80, 0.2);
  border-top-color: var(--nscale-green);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Critical error handling */
.critical-error {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-primary);
  text-align: center;
  padding: var(--spacing-xl);
}

.critical-error h1 {
  color: #dc3545;
  margin-bottom: var(--spacing-md);
}

.critical-error button {
  margin-top: var(--spacing-lg);
  padding: var(--spacing-sm) var(--spacing-lg);
  background-color: var(--nscale-green);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

.critical-error button:hover {
  background-color: var(--nscale-green-dark);
}

/* Dark theme support */
@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #1a1a1a;
    --bg-secondary: #2a2a2a;
    --bg-tertiary: #333333;
    --text-primary: #f1f5f9;
    --text-secondary: #cbd5e1;
    --text-muted: #94a3b8;
    --border-color: #444444;
  }
  
  .critical-error h1 {
    color: #f87171;
  }
}

/* Theme class-based settings */
.theme-dark {
  --bg-primary: #1a1a1a;
  --bg-secondary: #2a2a2a;
  --bg-tertiary: #333333;
  --text-primary: #f1f5f9;
  --text-secondary: #cbd5e1;
  --text-muted: #94a3b8;
  --border-color: #444444;
}

.theme-light {
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --bg-tertiary: #f1f5f9;
  --text-primary: #333333;
  --text-secondary: #666666;
  --text-muted: #888888;
  --border-color: #e2e8f0;
}
EOF

success "Basis-CSS erstellt"

# Feature-Flags-Konfiguration erstellen
log "Erstelle Feature-Flags-Konfiguration"

cat > src/config/featureFlags.ts << 'EOF'
/**
 * Feature-Flags für die nscale DMS Assistant Anwendung
 * 
 * Diese Flags steuern die Aktivierung neuer Features und Migrationsschritte.
 * Sie ermöglichen eine schrittweise Migration und Feature-Aktivierung.
 */

export const FEATURE_FLAGS = {
  // Core-Features
  ENABLE_STREAMING: true,
  ENABLE_DARK_MODE: true,
  ENABLE_MOTD: true,
  
  // Migrations-Features
  ENABLE_OPTIMIZED_STRUCTURE: true,
  ENABLE_LEGACY_HTML_REMOVAL: false,
  ENABLE_CDN_MIGRATION: false,
  
  // Experimentelle Features
  ENABLE_VIRTUAL_SCROLLER: false,
  ENABLE_OFFLINE_MODE: false,
  ENABLE_ADVANCED_SEARCH: false,
  
  // Rollback-Features
  ENABLE_LEGACY_FALLBACK: true,
};

/**
 * Prüft, ob ein Feature aktiviert ist
 * @param feature Name des Features
 * @returns true, wenn das Feature aktiviert ist
 */
export function isFeatureEnabled(feature: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[feature] === true;
}

/**
 * Gibt alle aktivierten Features zurück
 * @returns Array mit den Namen aller aktivierten Features
 */
export function getEnabledFeatures(): string[] {
  return Object.entries(FEATURE_FLAGS)
    .filter(([_, enabled]) => enabled)
    .map(([feature]) => feature);
}

/**
 * Aktiviert ein Feature zur Laufzeit
 * @param feature Name des Features
 * @param enabled Neuer Status des Features
 */
export function setFeatureEnabled(
  feature: keyof typeof FEATURE_FLAGS,
  enabled: boolean
): void {
  if (feature in FEATURE_FLAGS) {
    FEATURE_FLAGS[feature] = enabled;
    
    // Feature-Änderung protokollieren
    console.log(`Feature "${feature}" wurde ${enabled ? 'aktiviert' : 'deaktiviert'}`);
    
    // Event auslösen für reaktive Komponenten
    window.dispatchEvent(
      new CustomEvent('feature-flag-changed', {
        detail: { feature, enabled }
      })
    );
  }
}
EOF

success "Feature-Flags-Konfiguration erstellt"

# Optimierte index.html erstellen
log "Erstelle optimierte index.html"

cat > public/index-new.html << 'EOF'
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="nscale DMS Assistent - Ihr Digitalisierungspartner für DMS-Lösungen">
    <title>nscale DMS Assistent</title>
    
    <!-- Basis CSS für initiales Rendering (minimiert) -->
    <link rel="stylesheet" href="/assets/styles/base.css">
    
    <!-- Favicon -->
    <link rel="icon" href="/assets/images/favicon.ico" type="image/x-icon">
    
    <!-- Preload kritische Assets -->
    <link rel="preload" href="/assets/images/senmvku-logo.png" as="image">

    <!-- Feature-Flags und Konfiguration -->
    <script>
      // Feature Detection für progressive Enhancement
      document.documentElement.classList.add('js-enabled');
      
      // Theme-Präferenz laden
      (function() {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const savedTheme = localStorage.getItem('theme');
        const theme = savedTheme || (prefersDark ? 'dark' : 'light');
        document.documentElement.classList.add(`theme-${theme}`);
      })();
      
      // Globale Konfiguration
      window.APP_CONFIG = {
        apiBaseUrl: '/api',
        buildVersion: '1.2.3-migration',
        buildTimestamp: '20250511',
        environment: 'production',
        featureFlags: {
          ENABLE_OPTIMIZED_STRUCTURE: true,
          ENABLE_LEGACY_HTML_REMOVAL: false,
          ENABLE_CDN_MIGRATION: false
        }
      };
      
      // Legacy-Detection (für Übergangszeitraum)
      window.isLegacyMode = function() {
        return !window.APP_CONFIG.featureFlags.ENABLE_OPTIMIZED_STRUCTURE;
      };
      
      // Migrations-Bridge (für Übergangszeitraum)
      window.migrationBridge = {
        legacyEvents: {},
        publishEvent: function(eventName, data) {
          if (this.legacyEvents[eventName]) {
            this.legacyEvents[eventName].forEach(callback => {
              try {
                callback(data);
              } catch (err) {
                console.error('Error in legacy event handler:', err);
              }
            });
          }
        },
        subscribeToEvent: function(eventName, callback) {
          if (!this.legacyEvents[eventName]) {
            this.legacyEvents[eventName] = [];
          }
          this.legacyEvents[eventName].push(callback);
          
          return {
            unsubscribe: () => {
              if (this.legacyEvents[eventName]) {
                this.legacyEvents[eventName] = this.legacyEvents[eventName].filter(cb => cb !== callback);
              }
            }
          };
        }
      };
      
      // Globaler Fehler-Handler
      window.addEventListener('error', function(event) {
        console.error('Globaler Fehler abgefangen:', event.error);
        
        // Nur kritische UI-Fehler anzeigen, nicht für Asset-Lade-Fehler
        if (event.error && event.error.message && !event.filename.includes('.js') && !event.filename.includes('.css')) {
          const errorElement = document.createElement('div');
          errorElement.className = 'critical-error';
          errorElement.innerHTML = `
            <h1>Anwendungsfehler</h1>
            <p>Es ist ein unerwarteter Fehler aufgetreten. Bitte laden Sie die Seite neu.</p>
            <button onclick="window.location.reload()">Neu laden</button>
          `;
          
          const appLoader = document.getElementById('app-loading');
          if (appLoader) appLoader.style.display = 'none';
          
          document.body.appendChild(errorElement);
        }
      });
    </script>
</head>
<body>
    <!-- App Mount Point -->
    <div id="app"><!-- Vue-App wird hier gemountet --></div>
    
    <!-- Initiales Lade-Feedback -->
    <div id="app-loading" class="app-loader">
        <div class="app-loader-content">
            <img src="/assets/images/senmvku-logo.png" alt="nscale Logo" class="app-loader-logo">
            <div class="app-loader-spinner"></div>
            <p>Anwendung wird geladen...</p>
        </div>
    </div>
    
    <!-- Haupt-App-Bundle - dynamisch via Vite erzeugt -->
    <script type="module" src="/src/main.ts"></script>
    
    <!-- Fallback für ältere Browser -->
    <script nomodule>
      document.body.innerHTML = `
        <div class="critical-error">
          <h1>Browser nicht unterstützt</h1>
          <p>Bitte verwenden Sie einen modernen Browser wie Chrome, Firefox, Edge oder Safari.</p>
          <p>Die nscale DMS Assistant Anwendung erfordert JavaScript-Module-Unterstützung.</p>
        </div>
      `;
    </script>
</body>
</html>
EOF

success "Optimierte index.html erstellt"

# Vite-Konfiguration optimieren
log "Optimiere Vite-Konfiguration"

cat > vite.config.js.new << 'EOF'
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "url";
import { resolve } from "path";

// Basispfade definieren
const projectRoot = resolve(__dirname);
const srcDir = resolve(projectRoot, "src");
const publicDir = resolve(projectRoot, "public");
const distDir = resolve(projectRoot, "dist");
const isProduction = process.env.NODE_ENV === "production";

export default defineConfig({
  // Plugins
  plugins: [
    vue({
      // Vue-spezifische Optionen
      template: {
        compilerOptions: {
          // Benutzerdefinierte Attribute für Legacy-Integration
          isCustomElement: tag => tag.startsWith('legacy-') || tag.includes(':')
        }
      }
    }),
  ],
  
  // Optimierte Alias-Konfiguration
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@assets": fileURLToPath(new URL("./src/assets", import.meta.url)),
      "@components": fileURLToPath(new URL("./src/components", import.meta.url)),
      "@services": fileURLToPath(new URL("./src/services", import.meta.url)),
      "@stores": fileURLToPath(new URL("./src/stores", import.meta.url)),
      "@utils": fileURLToPath(new URL("./src/utils", import.meta.url)),
      "@legacy": fileURLToPath(new URL("./frontend/js", import.meta.url)),
    },
    extensions: [".js", ".ts", ".vue", ".json"],
  },
  
  // CSS-Konfiguration
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "sass:math"; @import "@assets/styles/utilities/_mixins.scss";`
      }
    },
    devSourcemap: true,
  },
  
  // Build-Optimierungen
  build: {
    outDir: distDir,
    assetsDir: "assets",
    emptyOutDir: true,
    sourcemap: !isProduction,
    
    // Optimierung für Produktion
    minify: isProduction ? 'terser' : false,
    terserOptions: isProduction ? {
      compress: {
        drop_console: true,
        drop_debugger: true,
      }
    } : undefined,
    
    // Optimierte Chunks
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('vue')) return 'vendor-vue';
            if (id.includes('pinia')) return 'vendor-pinia';
            if (id.includes('router')) return 'vendor-router';
            return 'vendor';
          }
          
          // App-spezifische Chunks
          if (id.includes('/components/admin/')) return 'admin';
          if (id.includes('/components/chat/')) return 'chat';
          if (id.includes('/components/document-converter/')) return 'document-converter';
        }
      }
    }
  },
  
  // Server-Konfiguration
  server: {
    port: 3000,
    strictPort: false,
    cors: true,
    open: false,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path
      }
    }
  },
  
  // Optimierungen für die Entwicklung
  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      'pinia',
      'pinia-plugin-persistedstate',
      '@vueuse/core'
    ],
    exclude: []
  }
});
EOF

success "Vite-Konfiguration optimiert"

# Aktivierungsskript erstellen
log "Erstelle Aktivierungsskript"

cat > activate-vue3.sh << 'EOF'
#!/bin/bash
# Skript zur Aktivierung der optimierten Vue 3-Struktur

# Farben für die Ausgabe
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging-Funktion
log() {
  echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
  echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
  echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
  echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

# Sicherstellen, dass wir uns im richtigen Verzeichnis befinden
if [ ! -f "package.json" ]; then
  error "Dieses Skript muss im Hauptverzeichnis der Anwendung ausgeführt werden"
  exit 1
fi

# Warnhinweise anzeigen
warn "ACHTUNG: Dieses Skript aktiviert die optimierte Vue 3-Struktur."
warn "Es werden dabei folgende Aktionen durchgeführt:"
warn "1. Die neue index.html wird aktiviert"
warn "2. Die optimierte Vite-Konfiguration wird aktiviert"
warn "3. Die Feature-Flags werden auf die neuen Werte gesetzt"

read -p "Möchten Sie fortfahren? (j/n) " -n 1 -r
echo 
if [[ ! $REPLY =~ ^[Jj]$ ]]
then
    log "Aktivierung abgebrochen"
    exit 0
fi

# Backup erstellen
TIMESTAMP=$(date '+%Y%m%d%H%M%S')
log "Erstelle Backup der aktuellen Konfiguration"

cp public/index.html public/index.html.backup-$TIMESTAMP
cp vite.config.js vite.config.js.backup-$TIMESTAMP

# Neue Konfiguration aktivieren
log "Aktiviere neue Konfiguration"

cp public/index-new.html public/index.html
cp vite.config.js.new vite.config.js

success "Konfiguration aktiviert"

# Build starten
log "Starte Build der Anwendung"

npm run build

if [ $? -eq 0 ]; then
  success "Build erfolgreich abgeschlossen"
  
  log "Um die optimierte Version zu testen, führen Sie aus:"
  log "npm run preview"
else
  error "Build fehlgeschlagen"
  
  warn "Rollback wird durchgeführt..."
  cp public/index.html.backup-$TIMESTAMP public/index.html
  cp vite.config.js.backup-$TIMESTAMP vite.config.js
  
  warn "Rollback abgeschlossen. Die ursprüngliche Konfiguration wurde wiederhergestellt."
fi
EOF

chmod +x activate-vue3.sh

success "Aktivierungsskript erstellt"

# Zusammenfassung der Änderungen
log "Migration abgeschlossen"
success "Die Migration zu Vue 3 SFCs wurde erfolgreich vorbereitet"
log "Es wurden folgende Dateien und Verzeichnisse erstellt:"
log "- public/assets/styles/base.css: Basis-CSS für initiales Rendering"
log "- public/index-new.html: Optimierte HTML-Struktur"
log "- src/config/featureFlags.ts: Feature-Flags-Konfiguration"
log "- vite.config.js.new: Optimierte Vite-Konfiguration"
log "- activate-vue3.sh: Aktivierungsskript"

log ""
log "Nächste Schritte:"
log "1. Überprüfen Sie die generierten Dateien und passen Sie sie bei Bedarf an"
log "2. Installieren Sie fehlende Abhängigkeiten mit 'npm install'"
log "3. Führen Sie './activate-vue3.sh' aus, um die Migration zu aktivieren"

log ""
warn "WICHTIG: Folgen Sie dem Migrationsleitfaden in 'FINALE_MIGRATION_ANLEITUNG.md'"
warn "um die Migration schrittweise durchzuführen"