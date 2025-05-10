# Feature-Toggle-System für Vue 3 SFC-Migration

Dieses Dokument beschreibt das Feature-Toggle-System, das für die schrittweise Migration der Anwendung zu Vue 3 Single File Components (SFC) implementiert wurde.

**Update (Mai 2023)**: Das Feature-Toggle-System wurde erweitert und in das Admin-Panel integriert. Die Dokumentation wurde entsprechend aktualisiert.

## Übersicht

Das Feature-Toggle-System ermöglicht eine graduelle Migration zu Vue 3 SFC, indem es:

1. Konfigurierbare Feature-Flags bereitstellt, um neue SFC-Implementierungen ein- oder auszuschalten
2. Einen automatischen Fallback-Mechanismus bei Fehlern implementiert
3. Eine Fehlererfassung und -berichterstattung für SFC-Komponenten bietet
4. Eine Administratoroberfläche zur Verwaltung der Feature-Flags bereitstellt

Das System besteht aus folgenden Hauptkomponenten:

- **FeatureTogglesStore**: Ein Pinia-Store für die zentrale Verwaltung von Feature-Flags
- **useFeatureToggles**: Ein Composable für den einfachen Zugriff auf Feature-Flags in Komponenten
- **FeatureWrapper**: Eine Wrapper-Komponente zur bedingten Anzeige von neuen SFC- oder Legacy-Komponenten
- **FeatureTogglesPanel**: Eine Admin-Benutzeroberfläche zur Verwaltung von Feature-Flags

## 1. FeatureTogglesStore

Der `FeatureTogglesStore` ist ein Pinia-Store, der alle Feature-Flags zentral verwaltet.

### Hauptfeatures

- Verwaltung verschiedener Feature-Flags (SFC-Migration, UI-Features, etc.)
- Abhängigkeitsverwaltung zwischen Features
- Fehlererfassung und Fallback-Mechanismus
- Persistenzfunktionalität im localStorage
- Rollen- und Berechtigungskonzept für Features

### Beispielanwendung

```typescript
import { useFeatureTogglesStore } from '@/stores/featureToggles';

const store = useFeatureTogglesStore();

// Feature-Status prüfen
if (store.useSfcDocConverter) {
  // DocConverter-SFC verwenden
}

// Feature aktivieren
store.enableFeature('useSfcDocConverter');

// Feature deaktivieren
store.disableFeature('useSfcChat');

// Fehler melden und Fallback aktivieren
store.reportFeatureError(
  'useSfcAdmin',
  'Komponente konnte nicht geladen werden',
  { details: '...' }
);
```

### Definierte Feature-Flags

```typescript
// SFC-Migration Features
useSfcDocConverter: boolean;  // Dokumentenkonverter als Vue 3 SFC
useSfcAdmin: boolean;         // Admin-Bereich als Vue 3 SFC
useSfcChat: boolean;          // Chat-Interface als Vue 3 SFC
useSfcSettings: boolean;      // Einstellungen als Vue 3 SFC

// ... weitere Feature-Flags
```

## 2. useFeatureToggles Composable

Das `useFeatureToggles` Composable bietet eine einfache API für den Zugriff auf den FeatureTogglesStore in Vue-Komponenten.

### Hauptfeatures

- Reaktive Eigenschaften für Feature-Flags
- Fehlererfassung und -behandlung
- Error-Boundary für automatische Fehlerbehandlung in SFC-Komponenten
- Hilfsfunktionen für Fallback-Logik

### Beispielanwendung

```typescript
import { useFeatureToggles } from '@/composables/useFeatureToggles';

export default {
  setup() {
    const featureToggles = useFeatureToggles({
      userRole: 'developer',
      autoFallback: true
    });
    
    // Feature-Status prüfen
    const shouldUseSfcDocConverter = featureToggles.shouldUseFeature('useSfcDocConverter');
    
    // Reaktive Property verwenden
    const docConverterEnabled = featureToggles.sfcDocConverter;
    
    // Feature aktivieren/deaktivieren
    function toggleDocConverter() {
      featureToggles.sfcDocConverter.value = !featureToggles.sfcDocConverter.value;
    }
    
    // Fehlerbehandlung
    function handleError(error) {
      featureToggles.reportError('useSfcDocConverter', error.message);
    }
    
    return {
      shouldUseSfcDocConverter,
      docConverterEnabled,
      toggleDocConverter
    };
  }
}
```

## 3. FeatureWrapper Komponente

Die `FeatureWrapper` Komponente ist eine bedingte Rendering-Komponente, die basierend auf dem Feature-Status entweder die neue SFC-Implementierung oder die Legacy-Implementierung anzeigt.

### Hauptfeatures

- Bedingte Anzeige von SFC- oder Legacy-Komponenten
- Integrierte Error-Boundary mit automatischem Fallback
- Event-Emittierung bei Fehlern und Fallbacks
- Transparente Weitergabe von Props und Slots

### Beispielanwendung

```vue
<template>
  <FeatureWrapper
    feature="useSfcDocConverter"
    :newComponent="SfcDocConverterComponent"
    :legacyComponent="LegacyDocConverterComponent"
    :captureErrors="true"
    :autoFallback="true"
    @feature-error="handleFeatureError"
    @feature-fallback="handleFeatureFallback"
    @component-mounted="handleComponentMounted"
  />
</template>

<script>
import { defineComponent } from 'vue';
import FeatureWrapper from '@/components/shared/FeatureWrapper.vue';
import SfcDocConverterComponent from '@/components/SfcDocConverterComponent.vue';
import LegacyDocConverterComponent from '@/components/LegacyDocConverterComponent.vue';

export default defineComponent({
  components: {
    FeatureWrapper
  },
  methods: {
    handleFeatureError(error, feature) {
      console.error(`Fehler in Feature ${feature}:`, error);
    },
    handleFeatureFallback(feature) {
      console.warn(`Fallback für Feature ${feature} aktiviert`);
    },
    handleComponentMounted(feature, isNew) {
      console.log(`Komponente für ${feature} geladen (${isNew ? 'SFC' : 'Legacy'})`);
    }
  }
});
</script>
```

## 4. Administrations-Integration

Das Feature-Toggle-System wurde vollständig in das Admin-Panel integriert, bestehend aus:

- **FeatureTogglesPanel**: Kernkomponente für die Verwaltung von Feature-Flags
- **AdminFeatureTogglesTab**: Integration als Tab im Admin-Panel
- **ToastContainer**: Benachrichtigungskomponente für Feedback

### Hauptfeatures

- Übersicht aller verfügbaren Features mit Statusanzeige
- Aktivieren/Deaktivieren einzelner Features
- Fehleranzeige und -behebung
- Benutzerrollenauswahl mit Zugriffssteuerung
- Gruppen- und Kategorieansicht
- Fehler-Simulation zur Validierung des Fallback-Mechanismus
- Änderungshistorie mit Benutzer und Zeitstempel
- Filter für Feature-Status (alle, aktive, inaktive, fehlerhafte Features)
- Toast-Benachrichtigungen für Änderungen

### AdminFeatureTogglesTab

Der neue AdminFeatureTogglesTab integriert die FeatureTogglesPanel-Komponente in das Admin-Panel und erweitert sie um zusätzliche Funktionen:

```vue
<template>
  <div class="feature-toggles-tab">
    <!-- Filter und Rollen-Steuerung -->
    <div class="feature-toggles-controls">
      <div class="feature-filter">
        <label for="feature-filter">Filter:</label>
        <select id="feature-filter" v-model="statusFilter">
          <option value="all">Alle Features</option>
          <option value="active">Aktive Features</option>
          <option value="inactive">Inaktive Features</option>
          <option value="errors">Fehlerhafte Features</option>
          <option value="fallback">Fallback aktiv</option>
        </select>
      </div>
      
      <div class="feature-role-selector">
        <label for="user-role">Rolle simulieren:</label>
        <select id="user-role" v-model="currentUserRole">
          <option value="guest">Gast</option>
          <option value="user">Benutzer</option>
          <option value="developer">Entwickler</option>
          <option value="admin">Administrator</option>
        </select>
      </div>
    </div>
    
    <!-- FeatureTogglesPanel einbinden -->
    <FeatureTogglesPanel 
      :initial-user-role="currentUserRole"
      @role-change="handleRoleChange"
      @feature-change="handleFeatureChange"
    />
    
    <!-- Änderungshistorie -->
    <div class="feature-history">
      <h3>Änderungshistorie</h3>
      <div class="feature-history-list">
        <!-- Einträge der Änderungshistorie -->
      </div>
    </div>
    
    <!-- Fehler-Simulationsbereich -->
    <div class="feature-simulation">
      <h3>Fehler-Simulation</h3>
      <p>Simulieren Sie Fehler in Features, um den Fallback-Mechanismus zu testen.</p>
      
      <div class="feature-simulation-controls">
        <!-- Simulationssteuerung -->
      </div>
    </div>
  </div>
</template>
```

### Toast-Benachrichtigungen

Für ein verbessertes Benutzerfeedback wurde ein Toast-Benachrichtigungssystem implementiert:

```typescript
// useToast.ts
export function useToast() {
  function show(config: ToastShowConfig): string {
    // Toast anzeigen...
  }
  
  function success(message: string, options?: ToastOptions): string {
    return show({ message, type: 'success', options });
  }
  
  function error(message: string, options?: ToastOptions): string {
    return show({ message, type: 'error', options });
  }
  
  // Weitere Methoden...
  
  return {
    toasts: readonly(state.toasts),
    show,
    success,
    error,
    // ...
  };
}
```

## Verwendung des Feature-Toggle-Systems

### 1. Implementierung einer neuen SFC-Komponente

1. Erstelle eine neue Vue 3 SFC-Komponente mit TypeScript und Composition API
2. Füge die Legacy-Implementierung als Fallback hinzu
3. Definiere ein Feature-Flag im FeatureTogglesStore (z.B. `useSfcMyComponent`)
4. Verwende die `FeatureWrapper`-Komponente zur bedingten Anzeige

```vue
<!-- ParentComponent.vue -->
<template>
  <div>
    <h2>Meine Komponente</h2>
    <FeatureWrapper
      feature="useSfcMyComponent"
      :newComponent="SfcMyComponent"
      :legacyComponent="LegacyMyComponent"
    />
  </div>
</template>

<script>
import { defineComponent } from 'vue';
import FeatureWrapper from '@/components/shared/FeatureWrapper.vue';
import SfcMyComponent from '@/components/SfcMyComponent.vue';
import LegacyMyComponent from '@/components/LegacyMyComponent.vue';

export default defineComponent({
  components: {
    FeatureWrapper
  }
});
</script>
```

### 2. Verwendung des FeatureToggles-Composables

```typescript
import { defineComponent } from 'vue';
import { useFeatureToggles } from '@/composables/useFeatureToggles';

export default defineComponent({
  setup() {
    const featureToggles = useFeatureToggles();
    
    // Feature-Status für Template
    const useNewUI = featureToggles.shouldUseFeature('useSfcMyComponent');
    
    // Fallback-Status prüfen
    const isFallbackActive = featureToggles.isFallbackActive('useSfcMyComponent');
    
    // Reaktives Feature-Flag
    const { sfcMyComponent } = featureToggles;
    
    // Fehler melden
    function reportComponentError(error) {
      featureToggles.reportError('useSfcMyComponent', error.message);
    }
    
    return {
      useNewUI,
      isFallbackActive,
      sfcMyComponent,
      reportComponentError
    };
  }
});
```

### 3. Fehlerbehandlung und Fallback

```vue
<template>
  <div>
    <button @click="testFeature">Feature testen</button>
    <button @click="resetFeature">Feature zurücksetzen</button>
    
    <div v-if="error" class="error-message">
      {{ error.message }}
      <button @click="clearError">Fehler löschen</button>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref } from 'vue';
import { useFeatureToggles } from '@/composables/useFeatureToggles';

export default defineComponent({
  setup() {
    const featureToggles = useFeatureToggles();
    const error = ref(null);
    
    function testFeature() {
      try {
        // Feature-Test...
        throw new Error('Test-Fehler');
      } catch (err) {
        error.value = err;
        featureToggles.reportError('useSfcMyComponent', err.message);
      }
    }
    
    function resetFeature() {
      featureToggles.deactivateFallback('useSfcMyComponent');
      featureToggles.enableFeature('useSfcMyComponent');
      error.value = null;
    }
    
    function clearError() {
      featureToggles.clearErrors('useSfcMyComponent');
      error.value = null;
    }
    
    return {
      error,
      testFeature,
      resetFeature,
      clearError
    };
  }
});
</script>
```

## Integrierte Abhängigkeitshandlung

Das Feature-Toggle-System behandelt Abhängigkeiten zwischen Features automatisch:

1. Wenn ein Feature aktiviert wird, werden auch alle seine Abhängigkeiten aktiviert.
2. Wenn ein Feature aktiviert werden soll, aber Abhängigkeiten fehlen, wird ein Fehler gemeldet.
3. Die Validierung erfolgt automatisch bei der Wiederherstellung aus dem localStorage.

Beispiel für Abhängigkeiten im Store:

```typescript
const featureConfigs = {
  useSfcDocConverter: {
    name: 'SFC Dokumentenkonverter',
    dependencies: ['usePiniaAuth', 'usePiniaUI']
  },
  useSfcAdmin: {
    name: 'SFC Admin-Bereich',
    dependencies: ['usePiniaAuth', 'usePiniaUI']
  }
};
```

## Berechtigungskonzept

Das Feature-Toggle-System implementiert ein rollenbasiertes Berechtigungskonzept:

- Jedes Feature hat eine erforderliche Mindestrolle (`requiredRole`)
- Benutzer können nur Features aktivieren, für die sie die passende Rolle haben
- Rollenebenen: guest < user < developer < admin

```typescript
// Feature mit Rollenanforderung
const featureConfigs = {
  useSfcDocConverter: {
    name: 'SFC Dokumentenkonverter',
    requiredRole: 'developer'
  }
};

// Verwendung mit Benutzerrolle
const featureToggles = useFeatureToggles({
  userRole: 'developer'
});
```

## Fehlermonitoring und Berichterstattung

Das Feature-Toggle-System führt ein integriertes Fehlermonitoring durch:

1. Fehler werden mit Kontext und Zeitstempel erfasst
2. Der Store speichert Fehler pro Feature
3. Die Admin-Oberfläche zeigt Fehler an und ermöglicht deren Behebung
4. Ein Stub für die Integration mit externen Monitoring-Diensten ist vorhanden

```typescript
// Fehlererfassung
featureToggles.reportError(
  'useSfcDocConverter',
  'Komponente konnte nicht geladen werden',
  { stackTrace: '...' }
);

// Fehlerabfrage
const featureStatus = featureToggles.getFeatureStatus('useSfcDocConverter');
console.log(featureStatus.errors); // Array von Fehlern

// Fehler löschen
featureToggles.clearErrors('useSfcDocConverter');
```

## Persistenz und Versionierung

Das Feature-Toggle-System verwendet localStorage für die Persistenz:

1. Ausgewählte Pfade werden im localStorage gespeichert
2. Version wird mit gespeichert und beim Laden validiert
3. Hooks vor und nach der Wiederherstellung für Validierung und Korrektur
4. Automatische Fallback-Strategie bei ungültigen gespeicherten Werten

```typescript
// Persistenzkonfiguration
persist: {
  storage: localStorage,
  paths: [
    'version',
    'useSfcDocConverter',
    // ... weitere Pfade
  ],
  beforeRestore: (context) => {
    // Validierung vor Wiederherstellung
  },
  afterRestore: (context) => {
    // Nachbearbeitung nach Wiederherstellung
  }
}
```

## Best Practices

### 1. Feature-Flags definieren

- Verwende ein Präfix für zusammengehörige Features (z.B. `useSfc` für SFC-Migration)
- Dokumentiere Abhängigkeiten in der Feature-Konfiguration
- Setze sinnvolle Standardwerte basierend auf der Stabilität

### 2. FeatureWrapper verwenden

- Halte beide Komponenten (SFC und Legacy) gleichwertig lauffähig
- Stelle sicher, dass Props und Events komplett durchgereicht werden
- Implementiere eine eigene Fehlerbehandlung in der Komponente

### 3. Fehlerbehandlung

- Melde spezifische Fehler mit aussagekräftigen Meldungen
- Nutze die automatische Fallback-Funktionalität
- Implementiere eigene Error-Boundaries in komplexen Komponenten

### 4. Graduelle Migration

- Aktiviere zunächst nur stabile Features
- Stelle sicher, dass der Fallback immer funktioniert
- Teste neue Features intensiv vor der allgemeinen Aktivierung

## Neue Funktionen in der Admin-Panel-Integration

### Umfassende Verwaltungsoberfläche

Die Integration des Feature-Toggle-Systems in das Admin-Panel bietet:

- **Intuitives UI**: Ein benutzerfreundliches Interface zur Verwaltung aller Features
- **Übersichtliche Darstellung**: Gruppierung nach Kategorien und Statusinformationen
- **Fehlervisualisierung**: Detaillierte Anzeige von Fehlern und Fallback-Status
- **Dokumentation**: Eingebettete Dokumentation und Hilfe

### Fehler-Simulation und Testen

Die Fehler-Simulation ermöglicht es Administratoren:

- Fehler in spezifischen Features zu simulieren
- Verschiedene Fehlertypen zu testen (Rendering, Daten, API, Timeout)
- Den Fallback-Mechanismus zu validieren
- Die Fehlerbehandlung zu optimieren

### Änderungshistorie

Die Änderungshistorie bietet:

- Chronologische Aufzeichnung aller Änderungen an Features
- Informationen über Zeitpunkt, Benutzer und Art der Änderung
- Persistenz im localStorage zur Nachverfolgung
- Möglichkeit zur Filterung und Löschung des Verlaufs

### Rollenbasierte Tests

Die Rollensimulation ermöglicht:

- Testen des Benutzererlebnisses für verschiedene Benutzerrollen
- Validierung der Zugriffsrechte
- Simulation von begrenzten Zugriffsszenarien
- Optimierung des Feature-Sets für verschiedene Benutzergruppen

## Zusammenfassung

Das erweiterte Feature-Toggle-System ermöglicht eine schrittweise Migration zu Vue 3 SFC mit minimalem Risiko durch:

1. Fein abgestimmte Kontrolle über aktivierte Features
2. Automatischen Fallback bei Problemen
3. Umfassende Fehlererfassung und -berichterstattung
4. Integrierte Admin-Oberfläche mit fortschrittlichen Verwaltungsfunktionen
5. Dokumentation und Hilfswerkzeuge zur Unterstützung des Migrationsprozesses

Durch diesen Ansatz kann die Anwendung sicher und kontrolliert migriert werden, wobei sowohl Entwickler als auch Administratoren umfassende Kontrolle über den Prozess haben und die Benutzer jederzeit eine funktionsfähige Anwendung erhalten.