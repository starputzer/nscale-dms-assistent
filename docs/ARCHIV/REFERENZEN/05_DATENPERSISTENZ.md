# Datenspeicherung und Persistenz im nscale DMS Assistenten

Dieses Dokument beschreibt die technischen Details der Datenspeicherung und Persistenz im nscale DMS Assistenten auf Basis der Pinia-Store-Architektur.

## Inhaltsverzeichnis

1. [Überblick](#überblick)
2. [Persistenz-Mechanismus](#persistenz-mechanismus)
3. [Schema-Versionierung und Migration](#schema-versionierung-und-migration)
4. [Speicherorte und Datenstruktur](#speicherorte-und-datenstruktur)
5. [Sicherheitsaspekte](#sicherheitsaspekte)
6. [Datenbereinigung](#datenbereinigung)
7. [Debugging und Fehlersuche](#debugging-und-fehlersuche)

## Überblick

Der nscale DMS Assistent verwendet eine mehrschichtige Datenspeicherung:

1. **Primäre Datenspeicherung**: REST-API und Backend-Datenbank
2. **Client-Side Persistenz**: Pinia Store + localStorage/sessionStorage
3. **In-Memory State**: Reaktiver Zustand in Pinia-Stores
4. **Legacy-Datenkompatibilität**: Migration von bestehenden localStorage-Daten

Die Persistenz wird durch das Pinia-Persistenz-Plugin (`pinia-plugin-persistedstate`) implementiert, das den Store-Zustand automatisch in localStorage oder sessionStorage speichert und beim Neuladen wiederherstellt.

## Persistenz-Mechanismus

### Plugin-Konfiguration

Die zentrale Konfiguration des Persistenz-Plugins erfolgt in `src/stores/index.ts`:

```typescript
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';

// Pinia Store erstellen
const pinia = createPinia();

// Persistenz-Plugin konfigurieren
pinia.use(piniaPluginPersistedstate);

export default pinia;
```

### Store-spezifische Persistenz

Jeder Store definiert individuell, welche Daten persistiert werden sollen:

```typescript
// Beispiel: Auth Store Persistenz
export const useAuthStore = defineStore('auth', () => {
  // State-Definition...
  
  return {
    // Öffentliche API...
  };
}, {
  persist: {
    // In localStorage speichern
    storage: localStorage,
    // Nur bestimmte Pfade persistieren
    paths: ['token', 'user', 'expiresAt', 'version'],
  },
});
```

### Persistierte Daten je Store

| Store | Schlüssel im Storage | Persistierte Daten | Speicherort |
|-------|---------------------|-------------------|------------|
| Auth | `auth` | Token, Benutzerinformationen, Ablaufzeit | localStorage |
| Sessions | `sessions` | Sessions-Liste, aktive Session-ID, Version | localStorage |
| UI | `ui` | Dark Mode, Sidebar-Zustand, View-Modus | localStorage |
| Settings | `settings` | Theme, Schriftgröße, Barrierefreiheit-Einstellungen | localStorage |
| FeatureToggles | `featureToggles` | Aktivierte Features, Version | localStorage |

## Schema-Versionierung und Migration

Jeder Store implementiert eine Versionierungsstrategie, um Änderungen am Datenformat zu verwalten:

### Versionsnummern

Jeder Store enthält ein `version`-Feld, das die aktuelle Schema-Version angibt:

```typescript
const version = ref<number>(1); // Aktuelle Schema-Version
```

### Migrationsprozess

Beim Initialisieren prüft jeder Store die gespeicherte Version und führt bei Bedarf Migrationen durch:

```typescript
function initialize() {
  // Prüfen, ob eine Migration erforderlich ist
  if (version.value < currentVersion) {
    if (version.value === 0) {
      migrateFromV0ToV1();
    }
    // Weitere Migrationsstufen...
    
    // Version aktualisieren
    version.value = currentVersion;
  }
  
  // Legacy-Daten migrieren
  migrateFromLegacyStorage();
}
```

### Migration von Legacy-Daten

Die Stores implementieren Funktionen zur Migration von Legacy-Daten:

```typescript
function migrateFromLegacyStorage() {
  try {
    // Beispiel: Auth-Token migrieren
    const legacyToken = localStorage.getItem('token');
    
    if (legacyToken && !token.value) {
      token.value = legacyToken;
      console.log('Legacy-Token migriert');
    }
    
    // ... weitere Legacy-Daten-Migration
  } catch (error) {
    console.error('Fehler bei der Migration:', error);
  }
}
```

## Speicherorte und Datenstruktur

### localStorage Struktur

Die Daten werden in JSON-serialisierter Form im localStorage gespeichert:

```javascript
// localStorage-Einträge
{
  "auth": {
    "token": "jwt-token-here",
    "user": { 
      "id": "user-id", 
      "name": "Max Mustermann",
      "roles": ["user", "admin"] 
    },
    "expiresAt": 1641234567890,
    "version": 1
  },
  "sessions": {
    "sessions": [
      {
        "id": "session-1",
        "title": "Chat vom 12.05.2025",
        "createdAt": "2025-05-12T10:15:30.000Z",
        "updatedAt": "2025-05-12T11:30:45.000Z",
        "messageCount": 24
      },
      // weitere Sessions...
    ],
    "currentSessionId": "session-1",
    "version": 1
  },
  // weitere Store-Daten...
}
```

### Storage-Namenskonvention

Die Stores verwenden eine einheitliche Namenskonvention für localStorage-Schlüssel:

- **Store-Schlüssel**: Der store-id, z.B. `auth`, `sessions`
- **Legacy-Schlüssel**: Alte Schlüssel werden mit einem Präfix versehen, z.B. `nscale_darkMode`

## Sicherheitsaspekte

### Sensible Daten

Beachten Sie folgende Sicherheitsrichtlinien für die Persistenz von Daten:

1. **Sensible Informationen** sollten nicht im localStorage gespeichert werden, da dieser nicht verschlüsselt ist
2. **Tokens** sollten eine kurze Gültigkeit haben und einen Refresh-Mechanismus verwenden
3. **Persönliche Daten** sollten auf ein Minimum beschränkt werden

### Maßnahmen

Der nscale DMS Assistent implementiert folgende Sicherheitsmaßnahmen:

1. **Token-Handling**:
   - Tokens haben ein Ablaufdatum (`expiresAt`)
   - Der Auth-Store prüft die Gültigkeit und erneuert Token automatisch

2. **Daten-Minimierung**:
   - Nur notwendige Daten werden persistiert (über `paths`-Konfiguration)
   - Sensitive Daten wie Passwörter werden nie gespeichert

3. **Storage-Bereinigung**:
   - Beim Logout werden sensible Daten aus dem Storage gelöscht
   - Alte Sessions werden automatisch bereinigt

## Datenbereinigung

### Automatische Bereinigung

Die Store-Implementierung enthält automatische Bereinigungsmechanismen:

```typescript
// Beispiel: Bereinigung im Auth-Store
function logout() {
  // Zustand zurücksetzen
  token.value = null;
  user.value = null;
  expiresAt.value = null;
  
  // Storage bereinigen (falls erforderlich)
  // localStorage.removeItem('custom_sensitive_data');
}
```

### Manuelle Bereinigung

Für die manuelle Bereinigung durch Administratoren oder Benutzer:

```typescript
// Vollständige Bereinigung aller Daten
function clearAllData() {
  // Stores zurücksetzen
  authStore.$reset();
  sessionsStore.$reset();
  uiStore.$reset();
  settingsStore.$reset();
  featureTogglesStore.$reset();
  
  // localStorage bereinigen
  localStorage.clear();
  
  // Anwendung zurücksetzen
  window.location.reload();
}
```

## Debugging und Fehlersuche

### localStorage Inspektion

Prüfen Sie die gespeicherten Daten im Browser:

1. Öffnen Sie die Developer Tools (F12)
2. Navigieren Sie zum "Application"-Tab
3. Wählen Sie "Local Storage" aus der linken Seitenleiste
4. Untersuchen Sie die Einträge für Ihre Domain

### Gängige Probleme und Lösungen

#### Problem: Daten werden nicht gespeichert

**Mögliche Ursachen und Lösungen**:
- **Storage-Quota überschritten**: Prüfen Sie die Größe der gespeicherten Daten
- **Falscher Storage-Typ**: Stellen Sie sicher, dass `localStorage` oder `sessionStorage` korrekt konfiguriert ist
- **Fehlende Paths-Konfiguration**: Überprüfen Sie die `paths`-Konfiguration im Store

```typescript
// Debugging-Hilfsfunktion
function debugPersistence(storeName, paths) {
  try {
    const storeData = JSON.parse(localStorage.getItem(storeName) || '{}');
    console.log(`[${storeName}] Gespeicherte Daten:`, storeData);
    
    // Auf fehlende Pfade prüfen
    paths.forEach(path => {
      const pathParts = path.split('.');
      let current = storeData;
      
      for (const part of pathParts) {
        if (current === undefined || current === null) {
          console.warn(`[${storeName}] Pfad '${path}' nicht gefunden (bei '${part}')`);
          break;
        }
        current = current[part];
      }
    });
  } catch (e) {
    console.error(`[${storeName}] Fehler beim Debugging:`, e);
  }
}
```

#### Problem: Legacy-Daten werden nicht migriert

**Mögliche Ursachen und Lösungen**:
- **Unterschiedliche Datenformate**: Prüfen Sie die Konvertierungsfunktionen in den `migrateFromLegacyStorage`-Methoden
- **Fehlender Aufruf**: Stellen Sie sicher, dass die Migrationsfunktion beim Store-Start aufgerufen wird
- **Fehler während der Migration**: Fügen Sie try-catch-Blöcke und Logging hinzu

```typescript
// Verbessertes Migration-Logging
function migrateFromLegacyStorage() {
  console.group('Legacy-Daten-Migration');
  
  try {
    const legacyKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('nscale_') || LEGACY_KEYS.includes(key)
    );
    
    console.log('Gefundene Legacy-Schlüssel:', legacyKeys);
    
    // Migration durchführen...
    
    console.log('Migration abgeschlossen');
  } catch (error) {
    console.error('Fehler bei der Migration:', error);
  }
  
  console.groupEnd();
}
```