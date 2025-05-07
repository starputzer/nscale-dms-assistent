/**
 * migrate-to-vite.js
 * 
 * Dieses Skript unterstützt die Migration von CDN-basierten Imports zu Vite.
 * Es erstellt die notwendige Verzeichnisstruktur, kopiert Dateien in die richtige Position
 * und passt Imports/Exports an.
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

// Konfiguration
const config = {
  directories: [
    'frontend/components',
    'frontend/vue',
    'frontend/assets',
    'frontend/types'
  ],
  jsTsConversion: true,
  createTypeDefs: true,
  backupOriginal: true
};

// Erstelle notwendige Verzeichnisse
async function createDirectories() {
  console.log('Erstelle Verzeichnisstruktur...');
  
  for (const dir of config.directories) {
    try {
      await fs.mkdir(dir, { recursive: true });
      console.log(`Verzeichnis erstellt: ${dir}`);
    } catch (error) {
      console.error(`Fehler beim Erstellen von ${dir}:`, error);
    }
  }
}

// Kopiere Vue-Komponenten in das neue Verzeichnis
async function copyVueComponents() {
  console.log('Kopiere Vue-Komponenten...');
  
  try {
    const vueFiles = await fs.readdir('./_vue_backup_final');
    
    for (const file of vueFiles) {
      if (file.endsWith('.vue')) {
        await fs.copyFile(
          path.join('./_vue_backup_final', file),
          path.join('./frontend/vue', file)
        );
        console.log(`Komponente kopiert: ${file}`);
      }
    }
  } catch (error) {
    console.error('Fehler beim Kopieren der Vue-Komponenten:', error);
  }
}

// Erstelle TypeScript-Definitionsdateien für JavaScript-Module
async function createTypeDefinitions() {
  if (!config.createTypeDefs) return;
  
  console.log('Erstelle TypeScript-Definitionen...');
  
  try {
    const jsFiles = await fs.readdir('./frontend/js');
    
    for (const file of jsFiles) {
      if (file.endsWith('.js')) {
        const baseName = file.replace('.js', '');
        const tsDefContent = `/**
 * TypeScript-Definition für ${file}
 * Automatisch generiert mit migrate-to-vite.js
 */

declare module './${baseName}' {
  // TODO: Füge hier Typendefinitionen hinzu
  
  // Beispiel:
  // export function setup(options: any): any;
}
`;
        
        await fs.writeFile(
          path.join('./frontend/types', `${baseName}.d.ts`),
          tsDefContent
        );
        console.log(`TypeScript-Definition erstellt: ${baseName}.d.ts`);
      }
    }
  } catch (error) {
    console.error('Fehler beim Erstellen der TypeScript-Definitionen:', error);
  }
}

// Konvertiere Hauptdateien von JS zu TS
async function convertJsToTs() {
  if (!config.jsTsConversion) return;
  
  console.log('Konvertiere JavaScript zu TypeScript...');
  
  try {
    await fs.copyFile(
      './frontend/js/app.js',
      './frontend/js/app.ts'
    );
    console.log('app.js zu app.ts konvertiert');
    
    // Fügen Sie motdConfig zur app.ts hinzu
    let appTsContent = await fs.readFile('./frontend/js/app.ts', 'utf-8');
    
    // Suchen Sie nach der applyColorTheme-Funktion und fügen Sie motdConfig davor ein
    const applyColorThemePosition = appTsContent.indexOf('const applyColorTheme');
    if (applyColorThemePosition !== -1) {
      // Fügen Sie die motdConfig-Deklaration ein
      const motdConfigDeclaration = `// Motd-Konfiguration für die applyColorTheme-Funktion
const motdConfig = Vue.ref({
  style: {
    backgroundColor: '',
    borderColor: '',
    textColor: ''
  }
});

`;
      
      // Einfügen vor der applyColorTheme-Funktion
      appTsContent = appTsContent.slice(0, applyColorThemePosition) + 
                     motdConfigDeclaration + 
                     appTsContent.slice(applyColorThemePosition);
      
      // Aktualisierte Datei speichern
      await fs.writeFile('./frontend/js/app.ts', appTsContent);
      console.log('motdConfig zu app.ts hinzugefügt');
    } else {
      console.warn('applyColorTheme-Funktion nicht gefunden in app.ts');
    }
    
    // Weitere Dateien nach Bedarf konvertieren
  } catch (error) {
    console.error('Fehler bei der JS-zu-TS-Konvertierung:', error);
  }
}

// Aktualisiere index.html für Vite
async function updateIndexHtml() {
  console.log('Aktualisiere index.html für Vite...');
  
  try {
    let indexContent = await fs.readFile('./frontend/index.html', 'utf-8');
    
    // Sichern der Originaldatei
    if (config.backupOriginal) {
      await fs.writeFile('./frontend/index.html.cdn-backup', indexContent);
      console.log('Original index.html gesichert als index.html.cdn-backup');
    }
    
    // CDN-Links ersetzen
    indexContent = indexContent.replace(
      /<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/vue@.*<\/script>/,
      '<!-- Vue wird durch Vite importiert -->'
    );
    
    // Füge Vite-Client-Skript hinzu
    indexContent = indexContent.replace(
      '</head>',
      '  <!-- Vite Development Client -->  \n' +
      '  <script type="module" src="/js/app.js"></script>\n' +
      '</head>'
    );
    
    await fs.writeFile('./frontend/index.html', indexContent);
    console.log('index.html für Vite aktualisiert');
  } catch (error) {
    console.error('Fehler beim Aktualisieren von index.html:', error);
  }
}

// Erstelle Umgebungskonfigurationsdateien
async function createEnvConfig() {
  console.log('Erstelle Umgebungskonfigurationsdateien...');
  
  const devEnvContent = `# Development Environment
VITE_API_URL=http://localhost:5000
VITE_ENV=development
`;

  const prodEnvContent = `# Production Environment
VITE_API_URL=
VITE_ENV=production
`;

  try {
    await fs.writeFile('./.env.development', devEnvContent);
    await fs.writeFile('./.env.production', prodEnvContent);
    console.log('Umgebungskonfigurationsdateien erstellt');
  } catch (error) {
    console.error('Fehler beim Erstellen der Umgebungskonfigurationsdateien:', error);
  }
}

// Erstelle globals.d.ts für globale Typdeklarationen
async function createGlobalTypes() {
  console.log('Erstelle globale TypeScript-Definitionen...');
  
  const globalsContent = `/**
 * globals.d.ts
 * Globale Typdeklarationen für die nscale DMS Assistent Anwendung
 */

// Deklarieren globaler Variablen und Module
declare const Vue: {
  createApp: any;
  ref: any;
  reactive: any;
  watch: any;
  computed: any;
  onMounted: any;
  nextTick: any;
};

declare const axios: {
  defaults: any;
  get: any;
  post: any;
  put: any;
  delete: any;
};

declare const marked: {
  parse: (text: string) => string;
};

// Window-Objekterweiterungen
interface Window {
  reloadCurrentSession: any;
  updateSessionTitle: any;
  updateAllSessionTitles: any;
  loadMotd: any;
  useSimpleLanguage?: boolean;
  // Weitere globale Funktionen hier hinzufügen
}
`;
  
  try {
    await fs.writeFile('./frontend/types/globals.d.ts', globalsContent);
    console.log('globals.d.ts erstellt');
  } catch (error) {
    console.error('Fehler beim Erstellen der globals.d.ts:', error);
  }
}

// Erstelle leere Admin-Tab-Komponenten
async function createEmptyAdminTabComponents() {
  console.log('Erstelle leere Admin-Tab-Komponenten...');
  
  const tabComponents = [
    'AdminUsersTab.vue',
    'AdminSystemTab.vue',
    'AdminFeedbackTab.vue',
    'AdminMotdTab.vue',
    'AdminDocConverterTab.vue'
  ];
  
  const templateContent = `<template>
  <div>
    <h2>{{ tabTitle }} Tab</h2>
    <p>Diese Komponente wird demnächst implementiert.</p>
  </div>
</template>

<script lang="ts">
export default {
  name: 'AdminTabPlaceholder',
  props: {
    tabTitle: {
      type: String,
      default: 'Admin'
    }
  }
};
</script>

<style scoped>
h2 {
  margin-bottom: 1rem;
  font-size: 1.5rem;
  font-weight: 600;
}
</style>`;
  
  try {
    for (const component of tabComponents) {
      const tabTitle = component.replace('Admin', '').replace('Tab.vue', '');
      
      let content = templateContent.replace('{{ tabTitle }}', tabTitle);
      
      await fs.writeFile(`./frontend/vue/${component}`, content);
      console.log(`Leere Komponente erstellt: ${component}`);
    }
  } catch (error) {
    console.error('Fehler beim Erstellen der Admin-Tab-Komponenten:', error);
  }
}

// Hauptfunktion
async function main() {
  console.log('=== Migration von CDN zu Vite ===');
  
  try {
    await createDirectories();
    await copyVueComponents();
    await createTypeDefinitions();
    await createGlobalTypes();
    await createEmptyAdminTabComponents();
    await convertJsToTs();
    await updateIndexHtml();
    await createEnvConfig();
    
    console.log('\n=== Migration abgeschlossen ===');
    console.log('Führe die folgenden Befehle aus, um die neue Build-Umgebung zu testen:');
    console.log('npm install');
    console.log('npm run dev');
    
  } catch (error) {
    console.error('Migration fehlgeschlagen:', error);
  }
}

// Führe das Skript aus
main();