/**
 * Konsolidierung gemeinsamer Geschäftslogik für nscale DMS Assistant
 * 
 * Dieses Skript identifiziert und konsolidiert duplizierte Geschäftslogik
 * zwischen der Legacy-Implementierung (vanilla JS) und der Vue 3-Implementierung.
 * 
 * Es erstellt gemeinsame Utility-Module, die von beiden Implementierungen
 * verwendet werden können, und reduziert dadurch Code-Duplikation und
 * erleichtert die langfristige Wartung.
 */

const fs = require('fs');
const path = require('path');

// Konfiguration
const LEGACY_DIR = '../app/frontend/js';
const VUE3_DIR = '../app/src';
const SHARED_DIR = '../app/shared';

// Zu konsolidierende Module
const BUSINESS_LOGIC_MODULES = [
  {
    name: 'uuid',
    description: 'UUID-Generierung und Validierung',
    legacy: {
      path: 'utils/uuid-util.js',
      functions: ['v4', 'simple', 'isValid', 'fromString']
    },
    vue3: {
      path: 'utils/uuidUtil.ts',
      functions: ['generateUUID', 'v4', 'generateSecureUUID']
    },
    shared: {
      path: 'utils/uuid.js',
      description: 'Konsolidierte UUID-Funktionen mit unterstützung für verschiedene Umgebungen'
    }
  },
  {
    name: 'api-client',
    description: 'API-Client für HTTP-Anfragen',
    legacy: {
      path: 'api-client.js',
      functions: ['get', 'post', 'put', 'delete', 'request', 'createCancelToken', 'isCancel', 'uploadFile', 'downloadFile']
    },
    vue3: {
      path: 'services/api/ApiService.ts',
      functions: ['get', 'post', 'put', 'patch', 'delete', 'getPaginated', 'uploadFile', 'downloadFile', 'createCancelToken', 'isCancel']
    },
    shared: {
      path: 'services/api-client.js',
      description: 'Einheitlicher API-Client mit Fehlerbehandlung, Wiederholungsversuchen und Fortschrittsanzeige'
    }
  },
  {
    name: 'error-handling',
    description: 'Zentrale Fehlerbehandlung',
    legacy: {
      path: 'error-handler.js',
      functions: ['handleError', 'handleAxiosError', 'handleEventSourceError', 'getUserFriendlyMessage']
    },
    vue3: {
      path: 'utils/ErrorClassifier.ts',
      functions: ['categorizeError', 'isNetworkError', 'isResourceError', 'isValidationError', 'isPermissionError']
    },
    shared: {
      path: 'utils/error-handling.js',
      description: 'Umfassende Fehlerklassifizierung, -behandlung und benutzerfreundliche Meldungen'
    }
  },
  {
    name: 'auth',
    description: 'Authentifizierung und Autorisierung',
    legacy: {
      path: 'api-client.js',
      functions: ['setAuthToken', 'createEventSource']
    },
    vue3: {
      path: 'stores/auth.ts',
      functions: ['login', 'logout', 'validateToken', 'refreshTokenIfNeeded', 'hasPermission', 'hasRole']
    },
    shared: {
      path: 'services/auth-service.js',
      description: 'Gemeinsame Authentifizierungslogik mit Token-Verwaltung und Berechtigungsprüfung'
    }
  },
  {
    name: 'form-validation',
    description: 'Formularvalidierung',
    legacy: {
      path: '', // In Legacy nicht klar identifiziert, könnte in verschiedenen Komponenten eingebettet sein
      functions: []
    },
    vue3: {
      path: 'composables/useForm.ts',
      functions: ['validateField', 'validateForm', 'setFieldRequired', 'hasError']
    },
    shared: {
      path: 'utils/form-validation.js',
      description: 'Wiederverwendbare Validierungslogik für Formulare'
    }
  }
];

/**
 * Erstellt ein neues gemeinsames Utility-Modul
 * @param {Object} module - Die Modulkonfiguration
 */
function createSharedModule(module) {
  console.log(`Erstelle gemeinsames Modul: ${module.name}`);
  
  // Zielverzeichnis erstellen, falls es nicht existiert
  const targetDir = path.dirname(path.join(SHARED_DIR, module.shared.path));
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  
  // Basisstruktur für die gemeinsame Datei erstellen
  const sharedFileContent = `/**
 * ${module.shared.description}
 * 
 * Dieses Modul konsolidiert Geschäftslogik aus:
 * - Legacy: ${LEGACY_DIR}/${module.legacy.path}
 * - Vue 3: ${VUE3_DIR}/${module.vue3.path}
 * 
 * Es bietet eine einheitliche API für beide Implementierungen.
 */

// ------------------------------------------------------------------
// Export für ESM/TypeScript (Vue 3)
// ------------------------------------------------------------------

export const ${module.name} = {
  // Funktionen hier implementieren
};

// ------------------------------------------------------------------
// UMD-Export für Legacy-Code (mit Browser-Globals-Fallback)
// ------------------------------------------------------------------

// UMD (Universal Module Definition) Boilerplate
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory();
  } else {
    // Browser globals (root is window)
    root.${module.name.replace(/-/g, '_')} = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  return ${module.name};
}));
`;

  // Shared-Datei schreiben
  fs.writeFileSync(
    path.join(SHARED_DIR, module.shared.path),
    sharedFileContent,
    'utf8'
  );
  
  console.log(`✅ Datei erstellt: ${SHARED_DIR}/${module.shared.path}`);
}

/**
 * Erstellt einen Migrationsleitfaden für jedes Modul
 * @param {Object} module - Die Modulkonfiguration
 */
function createMigrationGuide(module) {
  console.log(`Erstelle Migrationsleitfaden für: ${module.name}`);
  
  // Migrations-Guide erstellen
  const guideContent = `# Migrationsleitfaden für ${module.name}

## Übersicht
${module.description}

## Legacy-Implementation
Pfad: \`${LEGACY_DIR}/${module.legacy.path}\`

Wichtige Funktionen:
${module.legacy.functions.map(f => `- \`${f}\``).join('\n')}

## Vue 3-Implementation
Pfad: \`${VUE3_DIR}/${module.vue3.path}\`

Wichtige Funktionen:
${module.vue3.functions.map(f => `- \`${f}\``).join('\n')}

## Konsolidierte Lösung
Pfad: \`${SHARED_DIR}/${module.shared.path}\`

${module.shared.description}

## Migrationsschritte

1. **Analyse**
   - Identifizierung gemeinsamer Funktionalität
   - Vergleich der Implementierungsdetails
   - Identifizierung der Abhängigkeiten

2. **Implementierung**
   - Erstellen des gemeinsamen Moduls mit UMD-Boilerplate für verschiedene Module-Systeme
   - Implementieren der gemeinsamen Funktionalität
   - Hinzufügen von TypeScript-Typdeklarationen

3. **Integration**
   - Legacy: Als Abhängigkeit in bestehende Module importieren
   - Vue 3: Als normalen ES-Modul-Import verwenden

4. **Testen**
   - Sicherstellen, dass die konsolidierte Lösung in beiden Umgebungen funktioniert
   - Regressionstests durchführen
   - Edge Cases validieren

## Beispiel für die Integration

### Legacy (CommonJS oder Browser-Globals)
\`\`\`javascript
// Als CommonJS-Modul
const { v4: uuidv4 } = require('../shared/${module.shared.path}');

// Oder als Browser-Global
const uuidv4 = window.${module.name.replace(/-/g, '_')}.v4;
\`\`\`

### Vue 3 (ES Modules)
\`\`\`typescript
import { ${module.name} } from '@/shared/${module.shared.path}';
\`\`\`

## Bekannte Unterschiede und Einschränkungen

- [Hier relevante Unterschiede zwischen den Implementierungen auflisten]
- [Kompatibilitätshinweise]
- [Besondere Überlegungen]
`;

  // Zielverzeichnis erstellen, falls es nicht existiert
  const migrationsDir = path.join(SHARED_DIR, 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }
  
  // Guide schreiben
  fs.writeFileSync(
    path.join(migrationsDir, `${module.name}-migration.md`),
    guideContent,
    'utf8'
  );
  
  console.log(`✅ Migrationsleitfaden erstellt: ${migrationsDir}/${module.name}-migration.md`);
}

/**
 * Erstellt eine Implementierungsreferenz mit identifizierten gemeinsamen Funktionen
 */
function createImplementationReference() {
  console.log('Erstelle Implementierungsreferenz...');
  
  // Struktur der Implementierungsreferenz
  const referenceContent = `# Implementierungsreferenz für gemeinsame Geschäftslogik

Diese Referenz listet die identifizierten gemeinsamen Geschäftslogik-Komponenten auf,
die zwischen der Legacy-JavaScript-Implementierung und der Vue 3-Implementierung
konsolidiert werden sollten.

| Modul | Beschreibung | Legacy-Pfad | Vue 3-Pfad | Konsolidierter Pfad |
|-------|-------------|------------|-----------|-------------------|
${BUSINESS_LOGIC_MODULES.map(module => 
  `| ${module.name} | ${module.description} | \`${module.legacy.path || 'N/A'}\` | \`${module.vue3.path || 'N/A'}\` | \`${module.shared.path}\` |`
).join('\n')}

## Details zu den Modulen

${BUSINESS_LOGIC_MODULES.map(module => `
### ${module.name}

${module.shared.description}

**Legacy-Funktionen:**
${module.legacy.functions.length > 0 
  ? module.legacy.functions.map(f => `- \`${f}\``).join('\n')
  : '- Keine spezifischen Funktionen identifiziert'}

**Vue 3-Funktionen:**
${module.vue3.functions.length > 0
  ? module.vue3.functions.map(f => `- \`${f}\``).join('\n')
  : '- Keine spezifischen Funktionen identifiziert'}
`).join('\n')}

## Implementierungsstrategie

1. Erstellen einer gemeinsamen Codebasis im \`shared\`-Verzeichnis
2. Verwendung von UMD-Pattern für Kompatibilität mit verschiedenen Modul-Systemen
3. Schrittweise Migration der bestehenden Codebasis
4. Ausführliche Tests in beiden Umgebungen

## Vorteile der Konsolidierung

- Reduzierung von Code-Duplikation
- Einheitliche Fehlerbehandlung und Verhaltensweise
- Leichtere Wartung und Updates
- Vereinfachte Migration von Legacy zu Vue 3
- Konsistente Benutzererfahrung
`;

  // Zielverzeichnis erstellen, falls es nicht existiert
  if (!fs.existsSync(SHARED_DIR)) {
    fs.mkdirSync(SHARED_DIR, { recursive: true });
  }
  
  // Referenz schreiben
  fs.writeFileSync(
    path.join(SHARED_DIR, 'implementation-reference.md'),
    referenceContent,
    'utf8'
  );
  
  console.log(`✅ Implementierungsreferenz erstellt: ${SHARED_DIR}/implementation-reference.md`);
}

/**
 * Hauptfunktion zum Erstellen der konsolidierten Module und Dokumentation
 */
function consolidateBusinessLogic() {
  console.log('Starte Konsolidierung der Geschäftslogik...');
  
  // Shared-Verzeichnis erstellen, falls es nicht existiert
  if (!fs.existsSync(SHARED_DIR)) {
    fs.mkdirSync(SHARED_DIR, { recursive: true });
  }
  
  // Implementierungsreferenz erstellen
  createImplementationReference();
  
  // Für jedes Modul die gemeinsame Datei und den Migrationsleitfaden erstellen
  BUSINESS_LOGIC_MODULES.forEach(module => {
    createSharedModule(module);
    createMigrationGuide(module);
  });
  
  console.log('\n✅ Konsolidierung abgeschlossen!');
  
  // Nächste Schritte
  console.log('\nNächste Schritte:');
  console.log('1. Implementieren Sie die gemeinsamen Module mit der konsolidierten Geschäftslogik');
  console.log('2. Testen Sie die Module in beiden Umgebungen');
  console.log('3. Integrieren Sie die Module in die bestehende Codebasis');
  console.log('4. Aktualisieren Sie die vorhandenen Imports in Legacy- und Vue 3-Code');
}

// Skript ausführen
consolidateBusinessLogic();