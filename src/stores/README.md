# Store-System der nScale Assistent-Anwendung

Dieses Dokument beschreibt die Architektur und den Initialisierungsprozess der Pinia Stores in der nScale Assistent-Anwendung.

## Store-Struktur

Die Anwendung verwendet Pinia für das State Management und organisiert Stores modular:

- **auth.ts**: Authentifizierung und Benutzerberechtigungen
- **featureToggles.ts**: Feature-Flags und Progressive Rollouts
- **sessions.ts**: Chat-Sitzungen und -Verlauf
- **settings.ts**: Benutzereinstellungen und Anwendungskonfiguration
- **ui.ts**: UI-Status wie Sidebar-Collapse, aktive Tabs, Modals
- **documentConverter.ts**: Status und Funktionen des Dokumentkonverters
- **monitoringStore.ts**: Telemetrie und Fehlerüberwachung
- **admin/**: Admin-spezifische Stores

## Store-Initialisierungssystem

Die Stores werden über ein zentrales Initialisierungssystem gestartet, das in `storeInitializer.ts` implementiert ist. Dieses System bietet:

### Phasenweise Initialisierung

Stores werden in einer festgelegten Reihenfolge initialisiert:

1. **Kritische Stores**: `auth` und `featureToggles` (erforderlich für die Funktionalität der App)
2. **UI-Stores**: `settings` und `ui` (für das Rendern der Oberfläche)
3. **Funktionale Stores**: `sessions`, `documentConverter`, `monitoring` (für spezifische Features)

### Fehlerbehandlung

- Fehler in kritischen Stores führen zum Abbruch der Initialisierung
- Fehler in nicht-kritischen Stores werden protokolliert, die Anwendung läuft aber weiter
- Fehler werden zentral erfasst und können überwacht werden

### Store-Interaktionen

Das System konfiguriert Ereignis-Listener zwischen den Stores:

- **Auth-Store**: Ereignisse wie Login oder Logout lösen Aktionen in anderen Stores aus
- **FeatureToggles-Store**: Feature-Änderungen aktivieren oder deaktivieren entsprechende Funktionen
- **Sessions-Store**: Session-Änderungen werden an den UI-Store weitergegeben
- **Settings-Store**: Einstellungsänderungen werden an betroffene Stores übermittelt

## Verwendung

### Im main.ts

```typescript
import { initializeStores } from './stores/storeInitializer';

const initApp = async () => {
  try {
    // Stores initialisieren
    await initializeStores();
    console.log('Stores erfolgreich initialisiert');
  } catch (error) {
    console.error('Fehler bei der Store-Initialisierung:', error);
  }
};

initApp();
```

### Store-Status überwachen

```typescript
import { isInitialized, storeStatus } from '@/stores/storeInitializer';

// Ob alle Stores initialisiert wurden
console.log(isInitialized.value);

// Status jedes einzelnen Stores
console.log(storeStatus.value);
```

## Fallback-Mechanismen

Für kritische Fehler sind Fallback-Mechanismen implementiert:

- **Auth-Store**: Lokale Token-Validierung, wenn der Server nicht erreichbar ist
- **FeatureToggles-Store**: Standard-Features werden aktiviert, wenn die API nicht antwortet
- **DocumentConverter-Store**: Legacy-Version wird verwendet, wenn die neue Version fehlschlägt

## Debugging

Für Debugging-Zwecke kann der Store-Status abgerufen werden:

```typescript
import { getStoreInitializationStatus } from '@/stores/storeInitializer';

// Gibt den aktuellen Initialisierungsstatus zurück
const status = getStoreInitializationStatus();
console.log(status);
```