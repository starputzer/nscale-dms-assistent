# NPM Module Integration in Vite/Vue Projekten

Dieses Dokument beschreibt Lösungen für Probleme mit NPM-Modulen in Vite-basierten Projekten, insbesondere für das Problem mit dem `uuid`-Modul.

## Problem: "Failed to resolve import 'uuid'"

Wenn Sie einen Fehler wie diesen sehen:
```
[plugin:vite:import-analysis] Failed to resolve import "uuid" from "src/vue-implementation/composables/useChat.ts". Does the file exist?
```

gibt es mehrere Lösungsansätze.

## Lösung 1: Installation des uuid-Pakets

Die einfachste Lösung ist, das `uuid`-Paket zu installieren:

```bash
# Installation der Pakete
npm install uuid
npm install --save-dev @types/uuid
```

Alternativ können Sie das bereitgestellte Installationsskript verwenden:

```bash
# Ausführen des Installationsskripts
./scripts/install-uuid.sh
```

## Lösung 2: Eigene UUID-Implementierung

Wenn Sie keine externe Abhängigkeit hinzufügen möchten, können Sie eine eigene UUID-Implementierung verwenden:

1. Erstellen Sie eine Datei `src/vue-implementation/utils/uuidUtil.ts`:

```typescript
/**
 * Standard-UUID v4 Implementierung ohne externe Abhängigkeiten
 */
export function generateUUID(): string {
  let d = new Date().getTime();
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    d += performance.now();
  }
  
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// Kompatibilität mit uuid-Paket
export const v4 = generateUUID;
```

2. Ändern Sie den Import in Ihren Dateien:

```typescript
// Statt:
import { v4 as uuidv4 } from 'uuid';

// Verwenden Sie:
import { v4 as uuidv4 } from '../utils/uuidUtil';
```

## Lösung 3: Vite Virtual Module

Eine fortgeschrittene Lösung ist, ein virtuelles Modul in Vite zu erstellen:

```javascript
// In vite.config.js
function npmModulesPlugin() {
  return {
    name: 'npm-modules-fix',
    resolveId(id) {
      if (id === 'uuid') {
        return '\0virtual:uuid';
      }
      return null;
    },
    load(id) {
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

export default defineConfig({
  plugins: [
    vue(),
    npmModulesPlugin(),
    // ... andere Plugins
  ],
  // ... weitere Konfiguration
});
```

## Tipps zur NPM-Modul-Integration

1. **Bevorzugen Sie ESM-kompatible Module**: Vite verwendet ES-Module. Module, die nur CommonJS-Exporte anbieten, können Probleme verursachen.

2. **Überprüfen Sie die Vite-Optimierung**: Fügen Sie problematische Module zur `optimizeDeps.include`-Liste hinzu:

```javascript
// vite.config.js
export default defineConfig({
  optimizeDeps: {
    include: ['uuid'],
  },
});
```

3. **Caches löschen bei Problemen**:
```bash
rm -rf node_modules/.vite
```

4. **Aliase für problematische Module**:
```javascript
// vite.config.js
export default defineConfig({
  resolve: {
    alias: {
      'uuid': fileURLToPath(new URL('./src/utils/uuidUtil.js', import.meta.url)),
    },
  },
});
```

5. **Prüfen Sie package.json-Exports**: Moderne NPM-Pakete sollten ein `exports`-Feld haben, das ESM-Importe unterstützt.

---

Dieses Dokument wird bei Bedarf aktualisiert, um weitere Lösungen für NPM-Modul-Integrationen zu dokumentieren.