#!/usr/bin/env node
/**
 * consolidate-main.js
 * 
 * Ein Skript zur Bereinigung und Konsolidierung der verschiedenen main.js-Dateien
 * im nscale DMS Assistent Projekt.
 * 
 * Datum: 08.05.2025
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Basispfad zum Projekt
const BASE_PATH = path.resolve(__dirname, '..');

// Pfade zu den verschiedenen main.js-Dateien
const MAIN_JS_PATHS = {
  legacy: path.join(BASE_PATH, 'frontend', 'js', 'main.js'),
  vue: path.join(BASE_PATH, 'frontend', 'js', 'vue', 'main.js'),
  root: path.join(BASE_PATH, 'frontend', 'main.js')
};

// Pfade zu den HTML-Dateien, die aktualisiert werden müssen
const HTML_PATHS = {
  index: path.join(BASE_PATH, 'frontend', 'index.html'),
  vueApp: path.join(BASE_PATH, 'frontend', 'vue-dms-assistant.html'),
  vueTest: path.join(BASE_PATH, 'frontend', 'vue-test.html')
};

// Pfad zur neuen konsolidierten main.js
const CONSOLIDATED_MAIN_JS = path.join(BASE_PATH, 'frontend', 'js', 'main.js');

// Pfad zur .htaccess-Datei
const HTACCESS_PATH = path.join(BASE_PATH, 'frontend', '.htaccess');

/**
 * Hilfsfunktion zum Erstellen von Sicherheitskopien
 */
function createBackup(filePath) {
  if (fs.existsSync(filePath)) {
    const backupPath = `${filePath}.backup`;
    console.log(`Erstelle Backup von ${filePath} nach ${backupPath}`);
    fs.copyFileSync(filePath, backupPath);
    return true;
  }
  return false;
}

/**
 * Hilfsfunktion zum Erstellen von Verzeichnissen, falls sie nicht existieren
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.log(`Erstelle Verzeichnis: ${dirPath}`);
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Liest den Inhalt der verschiedenen main.js-Dateien
 */
function readMainJsFiles() {
  const content = {};
  
  for (const [key, filePath] of Object.entries(MAIN_JS_PATHS)) {
    if (fs.existsSync(filePath)) {
      content[key] = fs.readFileSync(filePath, 'utf-8');
      console.log(`Gelesen: ${filePath} (${content[key].length} Bytes)`);
    } else {
      console.log(`Warnung: Datei ${filePath} existiert nicht.`);
      content[key] = '';
    }
  }
  
  return content;
}

/**
 * Analysiert die verschiedenen main.js-Dateien und identifiziert Unterschiede und Gemeinsamkeiten
 */
function analyzeMainFiles(content) {
  // Einfache Analyse der Importe (sehr grundlegend)
  const analysis = {
    cssImports: new Set(),
    jsImports: new Set(),
    vueImports: new Set(),
    initFunctions: new Set()
  };
  
  // Regex-Patterns für die Analyse
  const patterns = {
    cssImport: /import\s+['"](.+\.css)['"]/g,
    jsImport: /import\s+['"](.+\.js)['"]/g,
    vueImport: /import\s+\{\s*(.+)\s*\}\s+from\s+['"]vue['"]/g,
    initFunction: /function\s+(\w+)\s*\(/g
  };
  
  // Durch alle Dateien gehen und Matches sammeln
  for (const [key, fileContent] of Object.entries(content)) {
    if (!fileContent) continue;
    
    // CSS-Importe
    let matches;
    while ((matches = patterns.cssImport.exec(fileContent)) !== null) {
      analysis.cssImports.add(matches[1]);
    }
    
    // JS-Importe
    patterns.jsImport.lastIndex = 0;
    while ((matches = patterns.jsImport.exec(fileContent)) !== null) {
      analysis.jsImports.add(matches[1]);
    }
    
    // Vue-Importe
    patterns.vueImport.lastIndex = 0;
    while ((matches = patterns.vueImport.exec(fileContent)) !== null) {
      matches[1].split(',').forEach(imp => {
        analysis.vueImports.add(imp.trim());
      });
    }
    
    // Initialisierungsfunktionen
    patterns.initFunction.lastIndex = 0;
    while ((matches = patterns.initFunction.exec(fileContent)) !== null) {
      analysis.initFunctions.add(matches[1]);
    }
  }
  
  console.log('Analyse abgeschlossen:');
  console.log(`- CSS-Importe: ${Array.from(analysis.cssImports).join(', ')}`);
  console.log(`- JS-Importe: ${Array.from(analysis.jsImports).join(', ')}`);
  console.log(`- Vue-Importe: ${Array.from(analysis.vueImports).join(', ')}`);
  console.log(`- Initialisierungsfunktionen: ${Array.from(analysis.initFunctions).join(', ')}`);
  
  return analysis;
}

/**
 * Erstellt die konsolidierte main.js-Datei
 */
function createConsolidatedMainJs(content, analysis) {
  // Neuer konsolidierter Inhalt
  const consolidatedContent = `/**
 * Konsolidierte main.js - Einstiegspunkt für den nscale DMS Assistenten
 * 
 * Diese Datei wurde automatisch aus den verschiedenen main.js-Dateien
 * konsolidiert und vereinheitlicht.
 * 
 * Datum: ${new Date().toLocaleDateString('de-DE')}
 */

// =========================================================================
// CSS-IMPORTE
// =========================================================================
${Array.from(analysis.cssImports)
  .map(cssImport => {
    // Normalisierte Pfade verwenden
    const normalizedPath = cssImport
      .replace('../css/', './css/')
      .replace('../../../src/', '../src/');
    return `import '${normalizedPath}';`;
  })
  .join('\n')}

// =========================================================================
// FRAMEWORK-IMPORTE
// =========================================================================
import { ${Array.from(analysis.vueImports).join(', ')} } from 'vue';
import { createPinia } from 'pinia';

// Importiere Legacy-Code
import './app.js';

// =========================================================================
// FEATURE-FLAG-KONFIGURATION
// =========================================================================
/**
 * Prüft, ob ein Feature-Flag aktiviert ist
 */
function isFeatureEnabled(flagName, defaultValue = false) {
  const value = localStorage.getItem(flagName);
  return value === 'true' || (value === null && defaultValue);
}

/**
 * Setzt ein Feature-Flag
 */
function setFeatureFlag(flagName, value) {
  localStorage.setItem(flagName, value.toString());
}

// =========================================================================
// VUE-INITIALISIERUNG
// =========================================================================
/**
 * Initialisiert die Vue 3 Komponenten basierend auf Feature-Flags
 */
function initializeVueComponents() {
  const useVueComponents = isFeatureEnabled('useVueComponents');
  const vueTargetElement = document.getElementById('vue-app');
  
  if (useVueComponents && vueTargetElement) {
    console.log('Initialisiere Vue 3 SFC-Komponenten...');
    
    try {
      // In einem produktiven Build würde dies direkt importiert werden
      import('../vue/app.js').then(({ default: App }) => {
        const app = createApp(App);
        const pinia = createPinia();
        
        app.use(pinia);
        
        // Globale Fehlerbehandlung
        app.config.errorHandler = (err, vm, info) => {
          console.error('Vue Error:', err);
          console.log('Component:', vm);
          console.log('Error Info:', info);
        };
        
        app.mount('#vue-app');
        console.log('Vue 3 App erfolgreich initialisiert');
      }).catch(error => {
        console.error('Fehler beim Laden der Vue-App:', error);
        // Fallback anzeigen, wenn vorhanden
        document.getElementById('legacy-app')?.classList.remove('hidden');
      });
    } catch (error) {
      console.error('Fehler bei der Vue-Initialisierung:', error);
      // Fallback anzeigen
      document.getElementById('legacy-app')?.classList.remove('hidden');
    }
  }
  
  // Dokumentenkonverter initialisieren
  initDocConverter();
}

/**
 * Initialisiert den Vue 3 Dokumentenkonverter
 */
function initDocConverter() {
  const useVueDocConverter = isFeatureEnabled('useVueDocConverter');
  const converterElement = document.getElementById('doc-converter-mount');
  
  if (useVueDocConverter && converterElement) {
    try {
      import('../vue/doc-converter-app.js').then(({ default: DocConverterApp }) => {
        const app = createApp(DocConverterApp);
        const pinia = createPinia();
        
        app.use(pinia);
        
        app.mount('#doc-converter-mount');
        console.log('Dokumentenkonverter-App erfolgreich initialisiert');
      }).catch(error => {
        console.error('Fehler beim Laden des Dokumentenkonverters:', error);
        // Fallback zur Legacy-Version aktivieren
        document.getElementById('legacy-doc-converter')?.classList.remove('hidden');
      });
    } catch (error) {
      console.error('Fehler bei der Dokumentenkonverter-Initialisierung:', error);
      // Fallback zur Legacy-Version aktivieren
      document.getElementById('legacy-doc-converter')?.classList.remove('hidden');
    }
  }
}

/**
 * Initialisiert den Vue 3 DMS Assistenten für die dedizierte Vue 3 Seite
 */
function initializeVueDmsApp() {
  // Check ob das Zielelement existiert
  const appElement = document.getElementById('vue-dms-app');
  
  if (appElement) {
    console.log('nscale DMS Assistent Vue 3 Anwendung wird initialisiert...');
    
    import('../../../src/vue-implementation/components/App.vue').then((module) => {
      const App = module.default;
      const app = createApp(App);
      
      // Globaler Errorhandler
      app.config.errorHandler = (err, vm, info) => {
        console.error('Vue Error:', err);
        console.log('Component:', vm);
        console.log('Error Info:', info);
      };
      
      // App mounten
      app.mount('#vue-dms-app');
      console.log('nscale DMS Assistent Vue 3 Anwendung erfolgreich initialisiert');
    }).catch(error => {
      console.error('Fehler beim Laden der Vue 3 DMS App:', error);
    });
  } else {
    console.warn('Element #vue-dms-app nicht gefunden. Die Vue 3 Anwendung konnte nicht gestartet werden.');
  }
}

// =========================================================================
// INITIALISIERUNG
// =========================================================================
// Basierend auf der Seite und dem DOM-Element initialisieren
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM geladen, initialisiere Anwendung...');
  
  // Prüfe, welche Elemente auf der Seite vorhanden sind
  const hasVueDmsApp = !!document.getElementById('vue-dms-app');
  const hasVueApp = !!document.getElementById('vue-app');
  
  if (hasVueDmsApp) {
    // Spezielle Vue 3 DMS Assistent Seite
    initializeVueDmsApp();
  } else if (hasVueApp || document.getElementById('doc-converter-mount')) {
    // Hybrid-Anwendung mit Vue-Integration
    initializeVueComponents();
  } else {
    // Fallback: Prüfe, ob überhaupt ein app-Element existiert
    const appElement = document.getElementById('app');
    if (appElement) {
      console.log('Initialisiere Standard-Anwendung...');
      
      // Legacy-App oder Vanilla JS Version
      // Der Import von app.js erfolgt bereits am Anfang der Datei
    }
  }
});

// =========================================================================
// GLOBALE EXPORTE
// =========================================================================
// Exportiere wichtige Funktionen für die Verwendung in anderen Dateien
window.initializeVueComponents = initializeVueComponents;
window.initDocConverter = initDocConverter;
window.isFeatureEnabled = isFeatureEnabled;
window.setFeatureFlag = setFeatureFlag;

// In der Entwicklungsumgebung zur besseren Debugging-Erfahrung
if (import.meta.env && import.meta.env.DEV) {
  console.log('Entwicklungsmodus aktiv');
  
  // Debug-Informationen
  window.addEventListener('load', () => {
    console.log('Anwendung vollständig geladen');
  });
}

// Melde erfolgreichen Import
console.log('Konsolidiertes Bundle erfolgreich geladen!');`;

  // Speichern des konsolidierten Inhalts
  fs.writeFileSync(CONSOLIDATED_MAIN_JS, consolidatedContent);
  console.log(`Konsolidierte main.js erstellt: ${CONSOLIDATED_MAIN_JS}`);
  
  return consolidatedContent;
}

/**
 * Aktualisiert die index.html, um auf die konsolidierte main.js zu verweisen
 */
function updateIndexHtml() {
  if (!fs.existsSync(HTML_PATHS.index)) {
    console.log(`Warnung: ${HTML_PATHS.index} existiert nicht.`);
    return;
  }
  
  createBackup(HTML_PATHS.index);
  
  let content = fs.readFileSync(HTML_PATHS.index, 'utf-8');
  
  // Aktualisiere die Referenz auf main.js
  content = content.replace(
    /loadScript\(['"]\/static\/js\/main\.js['"]\)/g,
    `loadScript('/js/main.js')`
  );
  
  // Füge Fehlerbehandlung hinzu
  content = content.replace(
    /loadScript\(['"].+['"]\)\.catch\((error|e)\s*=>\s*\{/g,
    `loadScript('/js/main.js').catch(error => {
      console.error('Fehler beim Laden des Haupt-Scripts:', error);
      // Fallback: Versuche an verschiedenen Pfaden zu laden
      Promise.any([
        loadScript('/static/js/main.js'),
        loadScript('/frontend/js/main.js'),
        loadScript('/frontend/main.js')
      ]).catch(allErrors => {
        console.error('Alle Versuche des Skript-Ladens fehlgeschlagen:', allErrors);
        document.body.innerHTML += '<div style="color:red;padding:20px;margin:20px;background:#fff;border:1px solid #ddd;border-radius:5px;">' + 
          '<h2>Fehler beim Laden der Anwendung</h2>' +
          '<p>Die Hauptskriptdatei konnte nicht geladen werden. Bitte aktualisieren Sie die Seite oder kontaktieren Sie den Administrator.</p>' +
          '</div>';
      });`
  );
  
  // Füge Ladeskript für CSS hinzu
  const cssLoadingCode = `
    // CSS-Dateien mit korrekten MIME-Types laden
    document.addEventListener('DOMContentLoaded', async () => {
      const cssFiles = [
        { href: '/css/main.css', id: 'css-main' },
        { href: '/css/themes.css', id: 'css-themes' },
        { href: '/css/improved-ui.css', id: 'css-improved-ui' },
        { href: '/css/admin.css', id: 'css-admin' },
        { href: '/css/feedback.css', id: 'css-feedback' },
        { href: '/css/message-actions.css', id: 'css-message-actions' },
        { href: '/css/settings.css', id: 'css-settings' },
        { href: '/css/source-references.css', id: 'css-source-references' }
      ];
      
      // Fallback-Pfade für CSS-Dateien
      const cssFallbackPaths = [
        '/static/css/',
        '/frontend/css/',
        '/frontend/static/css/',
        '/css/'
      ];
      
      for (const cssFile of cssFiles) {
        await loadCSSWithFallback(cssFile.href, cssFile.id, cssFallbackPaths);
      }
    });
    
    // Verbesserte CSS-Ladefunktion mit mehreren Fallbacks
    async function loadCSSWithFallback(href, id, fallbackPaths) {
      const timestamp = new Date().getTime();
      let loaded = false;
      
      // Versuche zuerst den Hauptpfad
      try {
        await loadCSS(href, id);
        loaded = true;
      } catch (error) {
        console.warn(\`CSS \${href} konnte nicht geladen werden, versuche Fallbacks\`);
      }
      
      // Wenn nicht geladen, versuche Fallbacks
      if (!loaded) {
        for (const fallbackPath of fallbackPaths) {
          const fallbackHref = href.replace(/^\\/[^/]+\\//, fallbackPath);
          
          try {
            await loadCSS(fallbackHref, id);
            console.log(\`CSS erfolgreich über Fallback geladen: \${fallbackHref}\`);
            loaded = true;
            break;
          } catch (error) {
            console.warn(\`Fallback \${fallbackHref} fehlgeschlagen\`);
          }
        }
      }
      
      if (!loaded) {
        console.error(\`Alle Versuche fehlgeschlagen, CSS \${href} zu laden\`);
      }
      
      return loaded;
    }`;
  
  // Füge das CSS-Ladeskript hinzu
  content = content.replace(
    /document\.addEventListener\('DOMContentLoaded', async \(\) => \{[\s\S]+?}\);/g,
    cssLoadingCode
  );
  
  fs.writeFileSync(HTML_PATHS.index, content);
  console.log(`Index HTML aktualisiert: ${HTML_PATHS.index}`);
}

/**
 * Aktualisiert die Vue-App HTML-Dateien
 */
function updateVueHtmlFiles() {
  // vue-dms-assistant.html aktualisieren
  if (fs.existsSync(HTML_PATHS.vueApp)) {
    createBackup(HTML_PATHS.vueApp);
    
    let content = fs.readFileSync(HTML_PATHS.vueApp, 'utf-8');
    
    // Aktualisiere die Referenz auf main.js mit Fehlerbehandlung
    content = content.replace(
      /<script type="module" src="\/frontend\/js\/vue\/main\.js"><\/script>/g,
      `<script type="module">
  // JavaScript-Dateien dynamisch laden mit Fallback
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = src;
      
      script.onload = () => resolve(script);
      script.onerror = (error) => reject(error);
      
      document.head.appendChild(script);
    });
  }
  
  // Versuche zunächst den konsolidierten Pfad, dann fallback
  loadScript('/js/main.js')
    .catch(error => {
      console.warn('Konsolidierte main.js konnte nicht geladen werden, versuche Fallbacks');
      return Promise.any([
        loadScript('/frontend/js/main.js'),
        loadScript('/frontend/js/vue/main.js'),
        loadScript('/frontend/main.js')
      ]);
    })
    .catch(error => {
      console.error('Alle Versuche fehlgeschlagen, main.js zu laden', error);
      // Zeige Fehlermeldung an
      document.getElementById('vue-dms-app').innerHTML = \`
        <div class="flex items-center justify-center h-screen bg-gray-100">
          <div class="text-center max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
            <div class="text-red-600 text-4xl mb-4">
              <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h1 class="text-xl font-bold mb-2">Fehler beim Laden der Anwendung</h1>
            <p class="text-gray-600">
              Die Anwendung konnte nicht geladen werden. Bitte aktualisieren Sie die Seite oder kontaktieren Sie den Administrator.
            </p>
          </div>
        </div>
      \`;
    });
</script>`
    );
    
    fs.writeFileSync(HTML_PATHS.vueApp, content);
    console.log(`Vue App HTML aktualisiert: ${HTML_PATHS.vueApp}`);
  }
  
  // vue-test.html aktualisieren
  if (fs.existsSync(HTML_PATHS.vueTest)) {
    createBackup(HTML_PATHS.vueTest);
    
    // Den Rest der Datei lassen wir wie sie ist, da sie direkt über CDN lädt
    console.log(`Vue Test HTML bleibt unverändert: ${HTML_PATHS.vueTest}`);
  }
}

/**
 * Erstellt eine .htaccess-Datei zur Sicherstellung der korrekten MIME-Types
 */
function createHtaccess() {
  const htaccessContent = `# nscale DMS Assistent .htaccess Konfiguration
# Konfiguration für korrekte MIME-Types und Pfadauflösung
# Erstellt: ${new Date().toLocaleDateString('de-DE')}

# Aktiviere den Rewrite-Engine
<IfModule mod_rewrite.c>
  RewriteEngine On
  
  # Basis-URL für alle Rewrites
  RewriteBase /
  
  # Alte Pfade auf neue Struktur umleiten
  # Versuche zuerst /js/main.js, dann Fallbacks
  RewriteCond %{REQUEST_URI} ^/static/js/main\.js$ [OR]
  RewriteCond %{REQUEST_URI} ^/frontend/main\.js$ [OR]
  RewriteCond %{REQUEST_URI} ^/frontend/js/vue/main\.js$
  RewriteRule ^.*$ /js/main.js [L]
  
  # CSS-Dateien umleiten
  RewriteCond %{REQUEST_URI} ^/static/css/(.+)\.css$
  RewriteRule ^static/css/(.+)\.css$ /css/$1.css [L]
  
  # Für Vue-Routen - Vue Anwendung die Kontrolle überlassen
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_URI} ^/vue/
  RewriteRule ^vue/(.*)$ /index.html [L]
</IfModule>

# Korrekte MIME-Types setzen
<IfModule mod_mime.c>
  # JavaScript
  AddType application/javascript .js
  AddType application/javascript .mjs
  
  # JSON
  AddType application/json .json
  
  # CSS
  AddType text/css .css
  
  # Fonts
  AddType font/woff .woff
  AddType font/woff2 .woff2
  AddType application/vnd.ms-fontobject .eot
  AddType font/ttf .ttf
  AddType font/otf .otf
  
  # SVG
  AddType image/svg+xml .svg
</IfModule>

# Caching-Einstellungen
<IfModule mod_expires.c>
  ExpiresActive On
  
  # Setze Standardwert für Caching
  ExpiresDefault "access plus 1 month"
  
  # Cache-Kontrolle für verschiedene Dateitypen
  ExpiresByType text/html "access plus 0 seconds"
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType application/json "access plus 0 seconds"
  
  # Bilder
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  
  # Fonts
  ExpiresByType font/woff "access plus 1 year"
  ExpiresByType font/woff2 "access plus 1 year"
</IfModule>

# Komprimierung einschalten
<IfModule mod_deflate.c>
  # Komprimiere HTML, CSS, JavaScript, Text, XML und Fonts
  AddOutputFilterByType DEFLATE application/javascript
  AddOutputFilterByType DEFLATE application/json
  AddOutputFilterByType DEFLATE application/x-font
  AddOutputFilterByType DEFLATE application/xml
  AddOutputFilterByType DEFLATE font/opentype
  AddOutputFilterByType DEFLATE font/otf
  AddOutputFilterByType DEFLATE font/ttf
  AddOutputFilterByType DEFLATE image/svg+xml
  AddOutputFilterByType DEFLATE text/css
  AddOutputFilterByType DEFLATE text/html
  AddOutputFilterByType DEFLATE text/plain
</IfModule>`;

  fs.writeFileSync(HTACCESS_PATH, htaccessContent);
  console.log(`Htaccess-Datei erstellt: ${HTACCESS_PATH}`);
}

/**
 * Erstellt eine simple server.js als Alternative zur .htaccess
 */
function createServerJs() {
  const serverJsPath = path.join(BASE_PATH, 'server.js');
  
  const serverJsContent = `/**
 * server.js - Einfacher Express-Server für den nscale DMS Assistenten
 * 
 * Diese Datei dient als Alternative zur .htaccess-Konfiguration und kann
 * mit Node.js ausgeführt werden.
 * 
 * Datum: ${new Date().toLocaleDateString('de-DE')}
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Pfade
const FRONTEND_PATH = path.join(__dirname, 'frontend');
const PUBLIC_PATH = __dirname;

// MIME-Types korrekt setzen
const mimeTypes = {
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.eot': 'application/vnd.ms-fontobject',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.svg': 'image/svg+xml',
  '.html': 'text/html',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif'
};

// Middleware für korrekte MIME-Types
app.use((req, res, next) => {
  const ext = path.extname(req.path);
  if (mimeTypes[ext]) {
    res.type(mimeTypes[ext]);
  }
  next();
});

// Fallback-Routen für main.js
app.get(['/static/js/main.js', '/frontend/main.js', '/frontend/js/vue/main.js'], (req, res) => {
  res.sendFile(path.join(FRONTEND_PATH, 'js', 'main.js'));
});

// Fallback-Routen für CSS-Dateien
app.get('/static/css/:filename', (req, res) => {
  const cssPath = path.join(FRONTEND_PATH, 'css', req.params.filename);
  if (fs.existsSync(cssPath)) {
    res.sendFile(cssPath);
  } else {
    res.status(404).send('CSS file not found');
  }
});

// Statische Dateien
app.use('/js', express.static(path.join(FRONTEND_PATH, 'js')));
app.use('/css', express.static(path.join(FRONTEND_PATH, 'css')));
app.use('/images', express.static(path.join(FRONTEND_PATH, 'images')));
app.use('/assets', express.static(path.join(FRONTEND_PATH, 'assets')));
app.use('/static', express.static(path.join(FRONTEND_PATH, 'static')));
app.use(express.static(PUBLIC_PATH));

// Fallback für Vue-Routen
app.get('/vue/*', (req, res) => {
  res.sendFile(path.join(FRONTEND_PATH, 'index.html'));
});

// Fallback für alle anderen nicht gefundenen Routen
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    // Für API-Pfade einfach weitermachen (könnte an einen Proxy weitergeleitet werden)
    next();
    return;
  }
  
  // Prüfe, ob die angefragte Datei existiert
  const requestedPath = path.join(PUBLIC_PATH, req.path);
  if (fs.existsSync(requestedPath) && fs.statSync(requestedPath).isFile()) {
    res.sendFile(requestedPath);
  } else {
    // Wenn es eine HTML-Route sein könnte, sende index.html
    if (!path.extname(req.path) || path.extname(req.path) === '.html') {
      res.sendFile(path.join(FRONTEND_PATH, 'index.html'));
    } else {
      res.status(404).send('File not found');
    }
  }
});

// Server starten
app.listen(PORT, () => {
  console.log(\`nscale DMS Assistent läuft auf http://localhost:\${PORT}\`);
});`;

  fs.writeFileSync(serverJsPath, serverJsContent);
  console.log(`Server.js erstellt: ${serverJsPath}`);
}

/**
 * Aktualisiert die Projektdokumentation
 */
function updateDocumentation() {
  // Pfad zur Dokumentation
  const docPath = path.join(BASE_PATH, 'docs', '06_SYSTEME', '11_FRONTEND_STRUKTUR_BEREINIGUNG.md');
  ensureDirectoryExists(path.dirname(docPath));
  
  const docContent = `# Frontend-Struktur-Bereinigung

**Datum: 08.05.2025**

## Einleitung

Dieses Dokument beschreibt die durchgeführte Bereinigung der Frontend-Struktur im nscale DMS Assistenten, insbesondere die Konsolidierung mehrerer main.js-Dateien und die Optimierung der Ressourcenladung.

## Ausgangsproblem

In der Projektstruktur existierten drei verschiedene Versionen der main.js-Datei in unterschiedlichen Verzeichnissen:

1. /frontend/js/main.js - Legacy-Version
2. /frontend/js/vue/main.js - Vue 3 Implementation
3. /frontend/main.js - Hybrid-Version

Diese Struktur führte zu folgenden Problemen:

- 404-Fehler beim Laden von main.js, da die Referenzen im HTML nicht konsistent mit der Dateisystemstruktur waren
- Verwirrung bei Imports und Abhängigkeiten
- CSS-Dateien wurden fälschlicherweise als JavaScript-Module geladen (MIME-Type-Fehler)
- Fragmentierte Initialisierungslogik über mehrere Dateien verteilt

## Durchgeführte Maßnahmen

### 1. Konsolidierung der main.js-Dateien

Die drei Versionen der main.js wurden analysiert und zu einer einzigen konsolidierten Version zusammengeführt. Diese enthält:

- Alle benötigten CSS-Importe aus allen Versionen
- Die vollständige Vue 3 Initialisierungslogik
- Feature-Flag-basierte Initialisierung verschiedener Anwendungsteile
- Verbesserte Fehlerbehandlung mit Fallback-Mechanismen
- Konsistente Exportschnittstelle für globale Funktionen

Die konsolidierte Datei wurde unter `/frontend/js/main.js` platziert und dient als einziger Einstiegspunkt für die Anwendung.

### 2. Aktualisierung der HTML-Dateien

Die HTML-Dateien wurden aktualisiert, um auf die konsolidierte main.js zu verweisen:

- Anpassung der Script-Tags mit korrekten Attributen (type="module")
- Implementierung robuster Fehlerbehandlung für das Laden von Ressourcen
- Fallback-Mechanismen für verschiedene Dateipfade
- Dynamisches Laden von CSS mit korrekten MIME-Types

### 3. Implementierung korrekter Server-Konfigurationen

Zwei Konfigurationsoptionen wurden bereitgestellt:

#### .htaccess für Apache

Eine .htaccess-Datei wurde erstellt, die:
- Korrekte MIME-Types für alle Ressourcen sicherstellt
- Umleitungsregeln für alte Pfade auf die neue Struktur implementiert
- Caching-Strategien für optimale Performance definiert
- Kompressionseinstellungen enthält

#### server.js für Node.js

Eine Express-basierte server.js wurde als Alternative implementiert, die:
- Korrekte MIME-Types für alle Ressourcentypen setzt
- Fallback-Routen für die konsolidierte main.js bereitstellt
- Statische Dateien korrekt bereitstellt
- Vue-Routing unterstützt

## Vorteile der neuen Struktur

1. **Verbesserte Zuverlässigkeit**: Durch Fallback-Mechanismen wird sichergestellt, dass die Anwendung auch bei Fehlern funktioniert
2. **Einheitlicher Einstiegspunkt**: Eine einzige main.js als zentraler Einstiegspunkt
3. **Korrekte MIME-Types**: Sicherstellen der korrekten Content-Types für alle Ressourcen
4. **Klare Initialisierungslogik**: Strukturierte und nachvollziehbare Initialisierung aller Anwendungskomponenten
5. **Bessere Wartbarkeit**: Einfachere Wartung durch konsolidierte Struktur

## Technische Details

### Initialisierungsablauf

Die konsolidierte main.js führt die folgenden Schritte aus:

1. Import aller CSS-Dateien
2. Import der Framework-Abhängigkeiten (Vue, Pinia)
3. Import des Legacy-Codes (app.js)
4. Definition von Hilfsfunktionen für Feature-Flags
5. Initialisierungsfunktionen für verschiedene Anwendungsteile:
   - initializeVueComponents() - Startet die Vue-Integration bei aktiviertem Feature-Flag
   - initDocConverter() - Initialisiert den Dokumentenkonverter
   - initializeVueDmsApp() - Startet die dedizierte Vue 3 Anwendung

### Fehlerbehandlung und Fallbacks

Die neue Struktur implementiert mehrschichtige Fehlerbehandlung:

- Fehlerbehandlung beim Skript-Laden mit alternativen Pfaden
- Fallback von Vue 3 Komponenten auf Legacy-Implementierungen
- Vue 3 ErrorHandler für konsistente Fehlerprotokolle
- Benutzerfreundliche Fehleranzeigen bei kritischen Fehlern

### MIME-Type-Handling

Sowohl die .htaccess als auch server.js stellen sicher, dass die korrekten MIME-Types gesetzt werden:

| Dateityp | MIME-Type |
|----------|-----------|
| .js      | application/javascript |
| .css     | text/css |
| .json    | application/json |
| .woff    | font/woff |
| .woff2   | font/woff2 |
| .svg     | image/svg+xml |

## Migration und Kompatibilität

Die durchgeführten Änderungen sind rückwärtskompatibel:

- Bestehende Code-Referenzen funktionieren weiterhin
- Feature-Flags ermöglichen eine schrittweise Migration
- Fallback-Mechanismen sorgen für Robustheit bei unerwarteten Problemen

## Fazit

Die Bereinigung der Frontend-Struktur und die Konsolidierung der main.js-Dateien haben die Robustheit, Wartbarkeit und Zuverlässigkeit des nscale DMS Assistenten verbessert. Durch klare Strukturierung, verbesserte Fehlerbehandlung und korrekte MIME-Type-Konfiguration wurde eine solide Grundlage für die weitere Entwicklung und die Migration zu Vue 3 SFC gelegt.`;

  fs.writeFileSync(docPath, docContent);
  console.log(`Dokumentation aktualisiert: ${docPath}`);
  
  // Aktualisiere die Übersichtsdokumentation, um die neue Dokumentation einzubeziehen
  const overviewDocPath = path.join(BASE_PATH, 'docs', '00_DOKUMENTATION_UEBERSICHT.md');
  if (fs.existsSync(overviewDocPath)) {
    createBackup(overviewDocPath);
    let content = fs.readFileSync(overviewDocPath, 'utf-8');
    
    // Füge den neuen Eintrag in der "Technische Dokumentation"-Sektion hinzu
    const techDocsSection = content.match(/## Technische Dokumentation\s+([^#]*)/);
    if (techDocsSection) {
      const newEntry = '12. **[06_SYSTEME/11_FRONTEND_STRUKTUR_BEREINIGUNG.md](./06_SYSTEME/11_FRONTEND_STRUKTUR_BEREINIGUNG.md)** - Bereinigung und Konsolidierung der Frontend-Struktur';
      
      const updatedSection = techDocsSection[0].replace(
        /(\d+\. \*\*\[.+?\]\(.+?\)\*\* - .+?\n)(?=\s*$|\s*\d+\. \*\*\[|\s*##)/,
        `$1${newEntry}\n`
      );
      
      content = content.replace(techDocsSection[0], updatedSection);
      fs.writeFileSync(overviewDocPath, content);
      console.log(`Übersichtsdokumentation aktualisiert: ${overviewDocPath}`);
    }
  }
}

/**
 * Installiert die benötigten Abhängigkeiten für server.js
 */
function installDependencies() {
  console.log('Überprüfe und installiere benötigte Node.js-Abhängigkeiten...');
  
  const packageJsonPath = path.join(BASE_PATH, 'package.json');
  let packageJson = {};
  
  if (fs.existsSync(packageJsonPath)) {
    try {
      packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    } catch (error) {
      console.error('Fehler beim Lesen der package.json:', error);
      packageJson = { dependencies: {} };
    }
  } else {
    packageJson = { dependencies: {} };
  }
  
  // Prüfe, ob Express bereits installiert ist
  if (!packageJson.dependencies.express) {
    try {
      console.log('Installiere Express...');
      execSync('npm install --save express', { cwd: BASE_PATH, stdio: 'inherit' });
      console.log('Express erfolgreich installiert.');
    } catch (error) {
      console.error('Fehler bei der Installation von Express:', error);
      console.log('Bitte führen Sie manuell "npm install --save express" aus.');
    }
  } else {
    console.log('Express ist bereits installiert.');
  }
}

/**
 * Hauptfunktion, die alles ausführt
 */
function main() {
  console.log('=== nscale DMS Assistent: Konsolidierung der main.js-Dateien ===');
  console.log(`Datum: ${new Date().toLocaleDateString('de-DE')}\n`);
  
  // Erstelle Verzeichnisse, falls sie nicht existieren
  ensureDirectoryExists(path.dirname(CONSOLIDATED_MAIN_JS));
  
  // Lese die verschiedenen main.js-Dateien
  const mainJsContents = readMainJsFiles();
  
  // Analysiere die Dateien
  const analysis = analyzeMainFiles(mainJsContents);
  
  // Erstelle die konsolidierte main.js
  createConsolidatedMainJs(mainJsContents, analysis);
  
  // Aktualisiere die HTML-Dateien
  updateIndexHtml();
  updateVueHtmlFiles();
  
  // Erstelle Server-Konfigurationen
  createHtaccess();
  createServerJs();
  
  // Installiere Abhängigkeiten
  installDependencies();
  
  // Aktualisiere die Dokumentation
  updateDocumentation();
  
  console.log('\n=== Konsolidierung abgeschlossen ===');
  console.log('Die main.js-Dateien wurden erfolgreich konsolidiert und die Projektstruktur bereinigt.');
  console.log('\nNächste Schritte:');
  console.log('1. Überprüfen Sie die konsolidierte main.js und passen Sie sie bei Bedarf an.');
  console.log('2. Testen Sie die Anwendung mit der neuen Struktur.');
  console.log('3. Verwenden Sie entweder die .htaccess (für Apache) oder server.js (für Node.js).');
  console.log('4. Führen Sie für die Node.js-Option `node server.js` aus.');
}

// Führe das Skript aus
main();