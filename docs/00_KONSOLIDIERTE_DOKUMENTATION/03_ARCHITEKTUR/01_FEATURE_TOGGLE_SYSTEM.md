---
title: "Feature-Toggle-System"
version: "1.3.0"
date: "09.05.2025"
lastUpdate: "11.05.2025"
author: "Martin Heinrich"
status: "Aktiv"
priority: "Hoch"
category: "Architektur"
tags: ["Feature-Toggle", "Migration", "Vue3", "Fehlerbehandlung", "A/B-Testing"]
---

# Feature-Toggle-System

> **Letzte Aktualisierung:** 11.05.2025 | **Version:** 1.3.0 | **Status:** Aktiv

## Übersicht

Das Feature-Toggle-System ist eine zentrale Komponente der Vue 3 SFC-Migration, die eine granulare Kontrolle über aktivierte Funktionen ermöglicht. Es ermöglicht die schrittweise Migration und parallele Entwicklung von Legacy- und Vue 3-Komponenten mit automatischen Fallback-Mechanismen.

Der Implementierungsstand des Feature-Toggle-Systems liegt bei **100%** und bietet umfassende Funktionen für Steuerung, Monitoring und Fehlerbehandlung von Features. Es wird sowohl während der Migration als auch für A/B-Tests und Feature-Flagging in der Produktion verwendet.

## Architekturüberblick

Das Feature-Toggle-System basiert auf folgenden Kernprinzipien:

1. **Granulare Steuerung**: Jedes Feature kann einzeln aktiviert/deaktiviert werden
2. **Persistenz**: Feature-Status wird im localStorage gespeichert
3. **Automatisches Fallback**: Bei Fehlern wird automatisch auf Legacy-Implementierungen zurückgefallen
4. **Abhängigkeitsmanagement**: Features mit Abhängigkeiten werden automatisch verwaltet
5. **Monitoring**: Umfassendes Monitoring aller Features mit Fehlererfassung

### Architekturdiagramm

```
┌────────────────────────────────┐      ┌────────────────────────────────┐
│                                │      │                                │
│        Vue 3 SFC-Welt          │      │        Vanilla JS-Welt         │
│                                │      │                                │
│  ┌─────────────────────────┐   │      │   ┌─────────────────────────┐  │
│  │                         │   │      │   │                         │  │
│  │  Vue 3 SFC Komponenten  │◄──┼──────┼───│     Legacy Komponenten  │  │
│  │                         │   │      │   │                         │  │
│  └───────────┬─────────────┘   │      │   └───────────┬─────────────┘  │
│              │                 │      │               │                │
│  ┌───────────▼─────────────┐   │      │   ┌───────────▼─────────────┐  │
│  │                         │   │      │   │                         │  │
│  │  FeatureWrapper.vue     │   │      │   │  Legacy Feature Toggle  │  │
│  │                         │   │      │   │                         │  │
│  └───────────┬─────────────┘   │      │   └───────────┬─────────────┘  │
│              │                 │      │               │                │
└──────────────┼─────────────────┘      └───────────────┼────────────────┘
               │                                        │
               │                                        │
               │                                        │
               │                                        │
               ▼                                        ▼
      ┌─────────────────────┐                ┌──────────────────────┐
      │                     │                │                      │
      │  featureToggles.ts  │◄───────────────│  Bridge-System       │
      │  (Pinia Store)      │                │                      │
      │                     │                │                      │
      └─────────┬───────────┘                └──────────────────────┘
                │
                │
                ▼
      ┌─────────────────────┐
      │                     │
      │  localStorage       │
      │  (Persistenz)       │
      │                     │
      └─────────────────────┘
```

## Kernkomponenten

### 1. Feature-Toggle-Store (`featureToggles.ts`)

Der zentrale Pinia-Store zur Verwaltung aller Feature-Flags:

```typescript
// src/stores/featureToggles.ts
import { defineStore } from 'pinia';
import { ref, computed, reactive } from 'vue';

/**
 * Interface für Feature-Toggle-Fehler
 */
export interface FeatureToggleError {
  /** Feature, bei dem der Fehler aufgetreten ist */
  feature: string;
  /** Fehlermeldung */
  message: string;
  /** Zeitstempel des Fehlers */
  timestamp: Date;
  /** Zusätzliche Details zum Fehler */
  details?: any;
  /** Ob für dieses Feature auf Legacy-Modus zurückgefallen wurde */
  fallbackActive: boolean;
}

// Weitere Interfaces...

/**
 * Feature Toggle Store
 * 
 * Verwaltet Feature-Flags für die Anwendung, um Features progressiv zu aktivieren
 * oder zu deaktivieren. Besonders nützlich während der Migration und für A/B-Tests.
 */
export const useFeatureTogglesStore = defineStore('featureToggles', () => {
  // State
  const version = ref<number>(2);
  
  // Fehlererfassung und Status
  const errors = reactive<Record<string, FeatureToggleError[]>>({});
  const activeFallbacks = reactive<Record<string, boolean>>({});
  
  // Feature-Konfigurationen mit Metadaten
  const featureConfigs = reactive<Record<string, FeatureConfig>>({
    // SFC-Migration Features
    useSfcDocConverter: {
      name: 'SFC Dokumentenkonverter',
      description: 'Verwende die neue Vue 3 SFC-Implementierung des Dokumentenkonverters',
      group: 'sfcMigration',
      stable: false,
      requiredRole: 'developer',
      hasFallback: true,
      dependencies: ['usePiniaAuth', 'usePiniaUI']
    },
    useSfcAdmin: {
      name: 'SFC Admin-Bereich',
      description: 'Verwende die neue Vue 3 SFC-Implementierung des Admin-Bereichs',
      group: 'sfcMigration',
      stable: false,
      requiredRole: 'developer',
      hasFallback: true,
      dependencies: ['usePiniaAuth', 'usePiniaUI']
    },
    useSfcChat: {
      name: 'SFC Chat-Interface',
      description: 'Verwende die neue Vue 3 SFC-Implementierung des Chat-Interfaces',
      group: 'sfcMigration',
      stable: false,
      requiredRole: 'developer',
      hasFallback: true,
      dependencies: ['usePiniaAuth', 'usePiniaUI']
    },
    useSfcSettings: {
      name: 'SFC Einstellungen',
      description: 'Verwende die neue Vue 3 SFC-Implementierung der Einstellungen',
      group: 'sfcMigration',
      stable: false,
      requiredRole: 'developer',
      hasFallback: true,
      dependencies: ['usePiniaAuth', 'usePiniaUI']
    },

    // UI-Basiskomponenten
    useSfcUIButton: {
      name: 'SFC Button-Komponente',
      description: 'Verwende die neue Vue 3 SFC-Implementierung der Button-Komponente',
      group: 'sfcMigration',
      stable: true, // Stabil und einfach
      requiredRole: 'developer',
      hasFallback: true,
      dependencies: ['useNewUIComponents']
    },
    useSfcUIInput: {
      name: 'SFC Input-Komponente',
      description: 'Verwende die neue Vue 3 SFC-Implementierung der Input-Komponente',
      group: 'sfcMigration',
      stable: true, // Stabil und einfach
      requiredRole: 'developer',
      hasFallback: true,
      dependencies: ['useNewUIComponents']
    }
    // ... weitere UI-Komponenten-Konfigurationen
  });
  
  // Pinia Store Features
  const usePiniaAuth = ref<boolean>(true);
  const usePiniaSessions = ref<boolean>(true);
  const usePiniaUI = ref<boolean>(true);
  const usePiniaSettings = ref<boolean>(true);
  
  // UI Features
  const useNewUIComponents = ref<boolean>(true);
  const useModernSidebar = ref<boolean>(true);
  
  // SFC Migration Features
  const useSfcDocConverter = ref<boolean>(false);
  const useSfcAdmin = ref<boolean>(true); // Aktiviert für Admin-Bereich
  const useSfcChat = ref<boolean>(false);
  const useSfcSettings = ref<boolean>(false);

  // UI-Basiskomponenten Features - Phase 1 Aktivierung
  const useSfcUIButton = ref<boolean>(true);  // Einfache Komponente mit minimalen Abhängigkeiten
  const useSfcUIInput = ref<boolean>(true);   // Einfaches Formular-Element
  const useSfcUIBadge = ref<boolean>(true);   // Einfache Anzeigekomponente
  const useSfcUITooltip = ref<boolean>(true); // Einfache Overlay-Komponente
  const useSfcUICard = ref<boolean>(true);    // Container-Komponente
  // ... weitere UI-Basiskomponenten
  
  // Legacy Integration
  const useLegacyBridge = ref<boolean>(true);
  
  // Getters
  const areAllStoresEnabled = computed(() => 
    usePiniaAuth.value && 
    usePiniaSessions.value && 
    usePiniaUI.value && 
    usePiniaSettings.value
  );
  
  const areSfcFeaturesEnabled = computed(() => 
    useSfcDocConverter.value && 
    useSfcAdmin.value && 
    useSfcChat.value && 
    useSfcSettings.value
  );
  
  // Methods
  
  /**
   * Erfasst einen Fehler für ein Feature und aktiviert ggf. den Fallback
   */
  function reportFeatureError(
    featureName: string, 
    message: string, 
    details?: any, 
    activateFallback: boolean = true
  ): void {
    console.error(`Feature-Toggle-Fehler in ${featureName}:`, message, details);
    
    // Fehler-Array initialisieren, falls nicht vorhanden
    if (!errors[featureName]) {
      errors[featureName] = [];
    }
    
    // Neuen Fehler hinzufügen
    const error: FeatureToggleError = {
      feature: featureName,
      message,
      timestamp: new Date(),
      details,
      fallbackActive: activateFallback
    };
    
    errors[featureName].push(error);
    
    // Fallback aktivieren, wenn gewünscht und verfügbar
    if (activateFallback && featureConfigs[featureName]?.hasFallback) {
      setFallbackMode(featureName, true);
    }
  }
  
  /**
   * Aktiviert oder deaktiviert den Fallback-Modus für ein Feature
   */
  function setFallbackMode(featureName: string, active: boolean): void {
    if (featureConfigs[featureName]?.hasFallback) {
      activeFallbacks[featureName] = active;
    }
  }
  
  /**
   * Prüft, ob der Fallback-Modus für ein Feature aktiv ist
   */
  function isFallbackActive(featureName: string): boolean {
    return activeFallbacks[featureName] || false;
  }
  
  /**
   * Löscht alle erfassten Fehler für ein Feature
   */
  function clearFeatureErrors(featureName: string): void {
    if (errors[featureName]) {
      errors[featureName] = [];
    }
  }
  
  /**
   * Aktiviert alle SFC-Migrationsfeatures
   */
  function enableAllSfcFeatures(): void {
    useSfcDocConverter.value = true;
    useSfcAdmin.value = true;
    useSfcChat.value = true;
    useSfcSettings.value = true;
    
    // Erforderliche Abhängigkeiten aktivieren
    usePiniaAuth.value = true;
    usePiniaUI.value = true;
  }
  
  /**
   * Aktiviert alle UI-Basiskomponenten
   */
  function enableAllUIBaseComponents(): void {
    useSfcUIButton.value = true;
    useSfcUIInput.value = true;
    useSfcUIBadge.value = true;
    useSfcUITooltip.value = true;
    useSfcUICard.value = true;
    useSfcUIAlert.value = true;
    useSfcUIToggle.value = true;
    useSfcUITextArea.value = true;
    useSfcUIProgressBar.value = true;
    useSfcUICheckbox.value = true;
    useSfcUIRadio.value = true;
    useSfcUISelect.value = true;
    useSfcUIModal.value = true;

    // Übergeordnetes Feature aktivieren
    useNewUIComponents.value = true;
  }

  /**
   * Deaktiviert alle UI-Basiskomponenten
   */
  function disableAllUIBaseComponents(): void {
    useSfcUIButton.value = false;
    useSfcUIInput.value = false;
    useSfcUIBadge.value = false;
    useSfcUITooltip.value = false;
    useSfcUICard.value = false;
    useSfcUIAlert.value = false;
    useSfcUIToggle.value = false;
    useSfcUITextArea.value = false;
    useSfcUIProgressBar.value = false;
    useSfcUICheckbox.value = false;
    useSfcUIRadio.value = false;
    useSfcUISelect.value = false;
    useSfcUIModal.value = false;

    // Fallbacks für UI-Komponenten deaktivieren
    Object.keys(activeFallbacks).forEach((feature) => {
      if (feature.startsWith("useSfcUI")) {
        activeFallbacks[feature] = false;
      }
    });

    // Fehler löschen für UI-Komponenten
    Object.keys(errors).forEach((feature) => {
      if (feature.startsWith("useSfcUI")) {
        errors[feature] = [];
      }
    });
  }

  /**
   * Deaktiviert alle SFC-Migrationsfeatures
   */
  function disableAllSfcFeatures(): void {
    useSfcDocConverter.value = false;
    useSfcAdmin.value = false;
    useSfcChat.value = false;
    useSfcSettings.value = false;

    // UI-Basiskomponenten deaktivieren
    disableAllUIBaseComponents();

    // Fallbacks deaktivieren
    Object.keys(activeFallbacks).forEach(feature => {
      if (feature.startsWith('useSfc') && !feature.startsWith('useSfcUI')) {
        activeFallbacks[feature] = false;
      }
    });

    // Fehler löschen
    Object.keys(errors).forEach(feature => {
      if (feature.startsWith('useSfc') && !feature.startsWith('useSfcUI')) {
        errors[feature] = [];
      }
    });
  }
  
  // Weitere Hilfsfunktionen...
  
  return {
    // State, Getters, Methods...
  };
}, {
  persist: {
    storage: localStorage,
    paths: [
      'version',
      'usePiniaAuth',
      'usePiniaSessions',
      'usePiniaUI',
      'usePiniaSettings',
      'useNewUIComponents',
      // Weitere persistierte Felder...
    ]
  }
});
```

### 2. Feature-Toggle Composable (`useFeatureToggles.ts`)

Die Composition API für einfachen Zugriff auf Feature-Toggles in Komponenten:

```typescript
// src/composables/useFeatureToggles.ts
import { computed, unref, onErrorCaptured, ref } from 'vue';
import { useFeatureTogglesStore, FeatureToggleError, FeatureToggleStatus, FeatureConfig, FeatureToggleRole } from '../stores/featureToggles';

/**
 * Optionen für das Feature Toggle Composable
 */
export interface FeatureToggleOptions {
  /** Gibt an, ob automatisch auf den Fallback zurückgefallen werden soll bei Fehlern */
  autoFallback?: boolean;
  /** Fehlerhandler-Funktion, die bei Feature-Fehlern aufgerufen wird */
  onError?: (error: FeatureToggleError) => void;
  /** Aktuelle Benutzerrolle für Feature-Verfügbarkeit */
  userRole?: FeatureToggleRole;
  /** Gibt an, ob der Debug-Modus aktiv sein soll */
  debug?: boolean;
}

/**
 * Feature Toggle Komposable
 * 
 * Stellt eine vereinfachte API zum Feature Toggle Store bereit,
 * um Features in Komponenten einfach aktivieren/deaktivieren zu können.
 * 
 * Erweitert für die Vue 3 SFC-Migration mit Unterstützung für Fehlerbehandlung
 * und automatischem Fallback auf Legacy-Implementierungen.
 */
export function useFeatureToggles(options: FeatureToggleOptions = {}) {
  const featureStore = useFeatureTogglesStore();
  
  // Standard-Optionen
  const {
    autoFallback = true,
    onError,
    userRole = 'user',
    debug = false
  } = options;
  
  // Fehler im Composable
  const localErrors = ref<FeatureToggleError[]>([]);
  
  /**
   * Erfasst einen Fehler und ruft ggf. den benutzerdefinierten Fehler-Handler auf
   */
  function handleError(error: FeatureToggleError): void {
    localErrors.value.push(error);
    
    if (debug) {
      console.error('Feature-Toggle-Fehler in Komponente:', error);
    }
    
    // Benutzerdefinierten Handler aufrufen, falls vorhanden
    if (onError) {
      onError(error);
    }
  }
  
  /**
   * Meldet einen Fehler für ein Feature und aktiviert ggf. den Fallback
   */
  function reportError(
    featureName: string, 
    message: string, 
    details?: any
  ): void {
    // Fehler im Store erfassen
    featureStore.reportFeatureError(
      featureName,
      message,
      details,
      autoFallback
    );
    
    // Fehler auch lokal erfassen
    const error: FeatureToggleError = {
      feature: featureName,
      message,
      timestamp: new Date(),
      details,
      fallbackActive: autoFallback && featureStore.isFallbackActive(featureName)
    };
    
    handleError(error);
  }
  
  // Error-Boundary einrichten
  onErrorCaptured((error, instance, info) => {
    // Prüfen, ob der Fehler in einer SFC-Komponente aufgetreten ist
    if (instance && instance.$.vnode && instance.$.vnode.type) {
      const componentName = instance.$.vnode.type.__name || 'UnknownComponent';
      
      // Prüfen, ob es sich um eine SFC-Komponente handelt
      if (componentName.startsWith('Sfc')) {
        // Passenden Feature-Namen ermitteln
        let featureName = '';
        
        if (componentName.includes('DocConverter')) {
          featureName = 'useSfcDocConverter';
        } else if (componentName.includes('Admin')) {
          featureName = 'useSfcAdmin';
        } else if (componentName.includes('Chat')) {
          featureName = 'useSfcChat';
        } else if (componentName.includes('Settings')) {
          featureName = 'useSfcSettings';
        }
        
        if (featureName) {
          reportError(
            featureName,
            `Fehler in SFC-Komponente ${componentName}: ${error instanceof Error ? error.message : String(error)}`,
            { error, info, componentName }
          );
          
          // Fehler wurde behandelt
          return true;
        }
      }
    }
    
    // Fehler nicht behandelt, weitergeben
    return false;
  });
  
  // Computed Properties für Features
  const sfcDocConverter = computed({
    get: () => featureStore.useSfcDocConverter,
    set: (value) => featureStore.useSfcDocConverter = value
  });
  
  const sfcAdmin = computed({
    get: () => featureStore.useSfcAdmin,
    set: (value) => featureStore.useSfcAdmin = value
  });
  
  const sfcChat = computed({
    get: () => featureStore.useSfcChat,
    set: (value) => featureStore.useSfcChat = value
  });
  
  const sfcSettings = computed({
    get: () => featureStore.useSfcSettings,
    set: (value) => featureStore.useSfcSettings = value
  });
  
  /**
   * Prüft, ob ein Feature verwendet werden soll,
   * unter Berücksichtigung des Fallback-Status
   */
  function shouldUseFeature(featureName: string): boolean {
    // Wenn das Feature nicht aktiviert ist, nicht verwenden
    if (!featureStore.isEnabled(featureName)) {
      return false;
    }
    
    // Wenn ein Fallback aktiv ist, nicht verwenden
    if (featureStore.isFallbackActive(featureName)) {
      return false;
    }
    
    return true;
  }
  
  // Weitere APIs...
  
  return {
    // Features als reaktive Properties
    sfcDocConverter,
    sfcAdmin,
    sfcChat,
    sfcSettings,
    
    // Feature-Prüffunktionen
    shouldUseFeature,
    isEnabled: (feature: string) => featureStore.isEnabled(feature),
    
    // Fehler-Verwaltung
    reportError,
    
    // Weitere APIs...
  };
}
```

### 3. Feature-Wrapper-Komponente (`FeatureWrapper.vue`)

Eine Komponente zur einfachen Aktivierung/Deaktivierung von Features im Template:

```vue
<template>
  <template v-if="isActive">
    <slot></slot>
  </template>
  <template v-else>
    <slot name="fallback">
      <!-- Standard-Fallback, falls kein expliziter angegeben -->
      <div v-if="showDefault" class="feature-wrapper-fallback">
        <slot name="fallback-content">
          <p class="feature-wrapper-message">{{ fallbackMessage }}</p>
        </slot>
      </div>
    </slot>
  </template>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useFeatureToggles } from '@/composables/useFeatureToggles';

// Props
const props = withDefaults(defineProps<{
  /** Feature-Name, das geprüft werden soll */
  feature: string;
  /** Alternative Bedingung, die erfüllt sein muss */
  condition?: boolean;
  /** Ob ein Standard-Fallback angezeigt werden soll */
  showDefault?: boolean;
  /** Benutzerdefinierte Fallback-Nachricht */
  fallbackMessage?: string;
}>(), {
  condition: true,
  showDefault: false,
  fallbackMessage: 'Diese Funktion ist derzeit nicht verfügbar.'
});

// Feature-Toggles laden
const featureToggles = useFeatureToggles();

// Prüfen, ob das Feature aktiviert ist
const isActive = computed(() => {
  if (!props.condition) return false;
  
  // Bei named Features über Feature-Toggles prüfen
  if (props.feature) {
    return featureToggles.shouldUseFeature(props.feature);
  }
  
  // Ohne Feature-Namen nur die Bedingung prüfen
  return true;
});
</script>

<style scoped>
.feature-wrapper-fallback {
  padding: 1rem;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  background-color: var(--n-color-background-alt);
}

.feature-wrapper-message {
  margin: 0;
  color: var(--n-color-text-secondary);
  font-size: 0.875rem;
  text-align: center;
}
</style>
```

### 4. Enhanced Feature-Wrapper-Komponente (`EnhancedFeatureWrapper.vue`)

Eine erweiterte Version mit zusätzlicher Fehlerbehandlung und Logging:

```vue
<template>
  <ErrorBoundary 
    :feature="feature"
    @error="handleError"
  >
    <template #default>
      <component 
        :is="wrapperComponent" 
        v-if="useDynamicWrapper"
        v-bind="wrapperProps"
      >
        <slot v-if="isActive"></slot>
        <template v-else-if="$slots.fallback" #fallback>
          <slot name="fallback"></slot>
        </template>
      </component>
      <template v-else>
        <template v-if="isActive">
          <slot></slot>
        </template>
        <template v-else-if="$slots.fallback">
          <slot name="fallback"></slot>
        </template>
        <template v-else-if="showDefaultFallback">
          <div class="enhanced-feature-wrapper-fallback">
            <p class="enhanced-feature-wrapper-message">{{ fallbackMessage }}</p>
          </div>
        </template>
      </template>
    </template>
    
    <template #error="{ error }">
      <div class="enhanced-feature-wrapper-error">
        <slot name="error" :error="error">
          <p class="enhanced-feature-wrapper-error-message">
            {{ errorMessage || `Ein Fehler ist aufgetreten: ${error.message}` }}
          </p>
          <button 
            v-if="showRetry" 
            class="enhanced-feature-wrapper-retry"
            @click="retryFeature"
          >
            Wiederholen
          </button>
        </slot>
      </div>
    </template>
  </ErrorBoundary>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';
import { useFeatureToggles } from '@/composables/useFeatureToggles';
import ErrorBoundary from '@/components/shared/ErrorBoundary.vue';

// Props mit TypeScript-Typen und Standardwerten
const props = withDefaults(defineProps<{
  /** Feature-Name, der geprüft werden soll */
  feature: string;
  /** Alternative Bedingung, die erfüllt sein muss */
  condition?: boolean;
  /** Ob ein Standard-Fallback angezeigt werden soll */
  showDefaultFallback?: boolean;
  /** Benutzerdefinierte Fallback-Nachricht */
  fallbackMessage?: string;
  /** Benutzerdefinierte Fehlermeldung */
  errorMessage?: string;
  /** Ob ein Retry-Button angezeigt werden soll */
  showRetry?: boolean;
  /** Ob ein dynamischer Wrapper verwendet werden soll */
  useDynamicWrapper?: boolean;
  /** Komponenten-Name für dynamischen Wrapper */
  wrapperComponent?: string | object;
  /** Props für dynamischen Wrapper */
  wrapperProps?: Record<string, any>;
  /** Ob Fehler automatisch an Monitoring gesendet werden sollen */
  reportErrors?: boolean;
}>(), {
  condition: true,
  showDefaultFallback: false,
  fallbackMessage: 'Diese Funktion ist derzeit nicht verfügbar.',
  showRetry: true,
  useDynamicWrapper: false,
  wrapperComponent: 'div',
  wrapperProps: () => ({}),
  reportErrors: true
});

// Emits definieren
const emit = defineEmits<{
  (e: 'error', error: Error): void;
  (e: 'retry'): void;
  (e: 'statusChange', isActive: boolean): void;
}>();

// Feature-Toggles laden
const featureToggles = useFeatureToggles({
  autoFallback: true,
  debug: true
});

// Fehler-Status
const hasError = ref(false);
const retryCount = ref(0);
const MAX_RETRY_COUNT = 3;

// Prüfen, ob das Feature aktiviert ist
const isActive = computed(() => {
  if (!props.condition || hasError.value) return false;
  
  // Bei Feature-Namen über Feature-Toggles prüfen
  if (props.feature) {
    return featureToggles.shouldUseFeature(props.feature);
  }
  
  // Ohne Feature-Namen nur die Bedingung prüfen
  return true;
});

// Fehlerbehandlung
function handleError(error: Error): void {
  hasError.value = true;
  
  if (props.reportErrors) {
    featureToggles.reportError(
      props.feature,
      `Fehler in EnhancedFeatureWrapper für Feature '${props.feature}': ${error.message}`,
      { error, retryCount: retryCount.value }
    );
  }
  
  // Event emittieren
  emit('error', error);
}

// Feature neu versuchen
function retryFeature(): void {
  if (retryCount.value >= MAX_RETRY_COUNT) {
    return;
  }
  
  retryCount.value++;
  hasError.value = false;
  
  // Event emittieren
  emit('retry');
}

// Status-Änderungen beobachten
watch(isActive, (newValue) => {
  emit('statusChange', newValue);
});

// Beim Mounten den initialen Status emittieren
onMounted(() => {
  emit('statusChange', isActive.value);
});
</script>

<style scoped>
.enhanced-feature-wrapper-fallback {
  padding: 1rem;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  background-color: var(--n-color-background-alt);
}

.enhanced-feature-wrapper-message {
  margin: 0;
  color: var(--n-color-text-secondary);
  font-size: 0.875rem;
  text-align: center;
}

.enhanced-feature-wrapper-error {
  padding: 1rem;
  border: 1px solid var(--n-color-error);
  border-radius: var(--n-border-radius);
  background-color: var(--n-color-error-light);
}

.enhanced-feature-wrapper-error-message {
  margin: 0 0 0.5rem;
  color: var(--n-color-error);
  font-size: 0.875rem;
}

.enhanced-feature-wrapper-retry {
  padding: 0.25rem 0.5rem;
  background-color: var(--n-color-primary);
  color: var(--n-color-on-primary);
  border: none;
  border-radius: var(--n-border-radius);
  font-size: 0.75rem;
  cursor: pointer;
}

.enhanced-feature-wrapper-retry:hover {
  background-color: var(--n-color-primary-dark);
}
</style>
```

## Feature-Toggle-UI für Administration

Eine AdminFeatureToggles-Komponente ermöglicht die Verwaltung der Feature-Flags durch Administratoren:

```vue
<template>
  <div class="feature-toggles-panel">
    <h2>Feature-Toggles Verwaltung</h2>
    
    <!-- Schnellaktionen -->
    <div class="feature-toggles-actions">
      <Button @click="featureToggles.enableAllSfcFeatures()">
        Alle SFC-Features aktivieren
      </Button>
      <Button @click="featureToggles.disableAllSfcFeatures()" variant="outline">
        Alle SFC-Features deaktivieren
      </Button>
    </div>
    
    <!-- Feature-Gruppen -->
    <div v-for="(features, group) in groupedFeatures" :key="group" class="feature-group">
      <h3 class="feature-group-title">{{ getGroupTitle(group) }}</h3>
      
      <div class="feature-list">
        <div
          v-for="feature in features"
          :key="feature.key"
          class="feature-item"
        >
          <div class="feature-header">
            <div>
              <span class="feature-name">{{ feature.name }}</span>
              <span 
                v-if="feature.status.isFallbackActive"
                class="feature-fallback-badge"
              >
                Fallback aktiv
              </span>
              <span 
                v-if="feature.status.errors.length > 0"
                class="feature-error-badge"
              >
                {{ feature.status.errors.length }} Fehler
              </span>
            </div>
            
            <Toggle
              :model-value="feature.status.isActive"
              @update:model-value="toggleFeature(feature.key)"
              :disabled="!canModifyFeature(feature)"
            />
          </div>
          
          <p class="feature-description">{{ feature.description }}</p>
          
          <div v-if="feature.dependencies?.length" class="feature-dependencies">
            <span class="feature-dependencies-label">Abhängigkeiten:</span>
            <span 
              v-for="dep in feature.dependencies" 
              :key="dep"
              :class="['feature-dependency', {
                'feature-dependency--active': isEnabled(dep),
                'feature-dependency--inactive': !isEnabled(dep)
              }]"
            >
              {{ dep }}
            </span>
          </div>
          
          <div v-if="feature.status.errors.length > 0" class="feature-errors">
            <Disclosure>
              <template #trigger="{ open }">
                <div class="feature-errors-header">
                  <span>Fehler anzeigen</span>
                  <ChevronIcon :class="['feature-errors-icon', { 'rotate-180': open }]" />
                </div>
              </template>
              
              <div class="feature-errors-content">
                <div 
                  v-for="(error, i) in feature.status.errors" 
                  :key="i"
                  class="feature-error"
                >
                  <p class="feature-error-message">{{ error.message }}</p>
                  <p class="feature-error-timestamp">
                    {{ formatDate(error.timestamp) }}
                  </p>
                  <pre v-if="error.details" class="feature-error-details">{{ JSON.stringify(error.details, null, 2) }}</pre>
                </div>
              </div>
            </Disclosure>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useFeatureToggles } from '@/composables/useFeatureToggles';
import { useAuthStore } from '@/stores/auth';
import Button from '@/components/ui/base/Button.vue';
import Toggle from '@/components/ui/base/Toggle.vue';
import Disclosure from '@/components/ui/Disclosure.vue';
import ChevronIcon from '@/components/icons/ChevronIcon.vue';

// Feature-Toggles laden
const featureToggles = useFeatureToggles({
  debug: true
});

// Auth-Store für Berechtigungen
const authStore = useAuthStore();

// Gruppierte Features aus Feature-Toggles
const groupedFeatures = computed(() => featureToggles.groupedFeatures);

// Prüfen, ob der aktuelle Benutzer ein Feature ändern darf
function canModifyFeature(feature: any): boolean {
  if (!authStore.currentUser) return false;
  return featureToggles.canAccessFeature(feature.key);
}

// Feature-Status ändern
function toggleFeature(featureName: string): void {
  featureToggles.toggleFeature(featureName);
}

// Prüfen, ob ein Feature aktiviert ist
function isEnabled(featureName: string): boolean {
  return featureToggles.isEnabled(featureName);
}

// Gruppennamen formatieren
function getGroupTitle(group: string): string {
  switch (group) {
    case 'sfcMigration':
      return 'Vue 3 SFC-Migration';
    case 'uiFeatures':
      return 'UI-Komponenten';
    case 'coreFeatures':
      return 'Kernfunktionen';
    case 'experimentalFeatures':
      return 'Experimentelle Funktionen';
    default:
      return group;
  }
}

// Datum formatieren
function formatDate(date: Date): string {
  return new Date(date).toLocaleString('de-DE', {
    dateStyle: 'short',
    timeStyle: 'medium'
  });
}
</script>

<style scoped>
/* Styling für die Feature-Toggle-Komponente */
</style>
```

## A/B-Testing mit Feature-Toggles

Das Feature-Toggle-System unterstützt A/B-Tests mit folgenden Funktionen:

1. **Benutzergruppenbasierte Aktivierung**: Features können für bestimmte Benutzergruppen aktiviert werden
2. **Metriken-Integration**: Integration mit Nutzungsstatistiken für A/B-Test-Auswertung
3. **Zeitgesteuerte Aktivierung**: Features können zeitgesteuert aktiviert/deaktiviert werden
4. **Versionierte Features**: Mehrere Versionen eines Features können parallel getestet werden

Beispiel für A/B-Test-Konfiguration:

```typescript
// Setup eines A/B-Tests
function setupABTest(userId: string, featureName: string, testId: string): boolean {
  // Deterministische Zuweisung basierend auf Benutzer-ID
  const hash = hashString(`${userId}-${testId}`);
  const userBucket = hash % 100; // 0-99
  
  // A/B-Test-Konfiguration
  const abTests = {
    'docConverter': {
      enabled: true,
      testGroups: {
        'control': { min: 0, max: 49 },   // 50% der Benutzer
        'variant': { min: 50, max: 99 }   // 50% der Benutzer
      }
    },
    'chatInterface': {
      enabled: true,
      testGroups: {
        'control': { min: 0, max: 79 },   // 80% der Benutzer
        'variant': { min: 80, max: 99 }   // 20% der Benutzer
      }
    }
  };
  
  // Prüfen, ob der A/B-Test aktiv ist
  const test = abTests[featureName];
  if (!test || !test.enabled) {
    return false;
  }
  
  // Prüfen, ob der Benutzer in der Testgruppe ist
  return userBucket >= test.testGroups.variant.min && userBucket <= test.testGroups.variant.max;
}

// Hash-Funktion für konsistente Benutzerzuweisung
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}
```

## Feature-Monitoring

Das Feature-Toggle-System beinhaltet ein umfassendes Monitoring, das folgende Funktionen bietet:

1. **Feature-Nutzungsstatistiken**: Erfassung der Nutzung aktivierter Features
2. **Fehlermonitoring**: Detaillierte Erfassung von Fehlern mit Stack-Traces
3. **Performance-Metriken**: Messung der Performance-Auswirkungen von Features
4. **Visualisierung**: Dashboards für Feature-Aktivität und -Fehler

Beispiel für die Integration mit einem Monitoring-System:

```typescript
// Monitoring-Integration
function trackFeatureUsage(featureName: string, data?: any): void {
  // Feature-Nutzung erfassen
  window.analytics?.track('feature_used', {
    feature: featureName,
    timestamp: new Date().toISOString(),
    data
  });
  
  // Interne Metriken aktualisieren
  updateFeatureMetrics(featureName, 'usage');
}

function trackFeatureError(featureName: string, error: Error, data?: any): void {
  // Fehler erfassen
  window.analytics?.track('feature_error', {
    feature: featureName,
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    data
  });
  
  // Interne Metriken aktualisieren
  updateFeatureMetrics(featureName, 'error');
  
  // Fehler an Fehlerberichtssystem senden
  window.errorReporting?.captureException(error, {
    tags: {
      feature: featureName
    },
    extra: data
  });
}

function updateFeatureMetrics(featureName: string, type: 'usage' | 'error'): void {
  // Metriken aktualisieren
  const metrics = window.featureMetrics || (window.featureMetrics = {});
  const featureMetrics = metrics[featureName] || (metrics[featureName] = { usage: 0, errors: 0 });
  
  if (type === 'usage') {
    featureMetrics.usage++;
  } else if (type === 'error') {
    featureMetrics.errors++;
  }
}
```

## Migrations-Integration

Das Feature-Toggle-System spielt eine zentrale Rolle bei der Migration zu Vue 3 SFCs:

1. **Schrittweise Aktivierung**: Neue Komponenten können schrittweise aktiviert werden
2. **Automatisches Fallback**: Bei Fehlern wird auf die Legacy-Implementierung zurückgefallen
3. **Abhängigkeitsmanagement**: Abhängige Features werden automatisch aktiviert/deaktiviert
4. **Migration-Monitoring**: Fortschritt und Erfolg der Migration wird überwacht

Die Integration erfolgt über diese Schritte:

1. **Feature-Definition**: Neue Features werden im Store definiert
2. **Komponenten-Integration**: Neue Komponenten werden mit FeatureWrapper umhüllt
3. **Testen und Validierung**: Features werden für Entwickler aktiviert und getestet
4. **A/B-Testing**: Features werden für Testgruppen aktiviert und überwacht
5. **Vollständige Aktivierung**: Features werden für alle Benutzer aktiviert
6. **Legacy-Code-Entfernung**: Nach erfolgreicher Migration wird der Legacy-Code entfernt

## Vorteile des Feature-Toggle-Systems

Das Feature-Toggle-System bietet folgende Vorteile für die Migration:

1. **Risikominimierung**: Schrittweise Aktivierung reduziert Risiken
2. **Schnelles Rollback**: Bei Problemen kann sofort auf die Legacy-Version zurückgefallen werden
3. **Graduelle Migration**: Migrationsfortschritt kann feingranular gesteuert werden
4. **Parallele Entwicklung**: Neue und alte Implementierungen können parallel entwickelt werden
5. **Datenbasierte Entscheidungen**: A/B-Tests ermöglichen datenbasierte Migrations-Entscheidungen
6. **Verbesserte Resilienz**: Automatische Fallback-Mechanismen erhöhen die Systemstabilität

## Aktuelle Herausforderungen

Folgende Herausforderungen bestehen noch im Feature-Toggle-System:

1. **Performance-Overhead**: Regelmäßige Feature-Flag-Prüfungen können Performance beeinträchtigen
2. **Komplexität**: Abhängigkeiten zwischen Features erhöhen die Systemkomplexität
3. **Technische Schuld**: Temporäre Feature-Flags können zu technischer Schuld werden
4. **Testing-Overhead**: Alle Kombinationen von Feature-Flags müssen getestet werden

## Aktivierung der UI-Basiskomponenten (Phase 1)

Als erster Schritt der Vue 3 SFC-Migration wurden die UI-Basiskomponenten für die Aktivierung vorbereitet. Diese Komponenten bilden die Grundlage aller anderen UI-Elemente und haben wenige externe Abhängigkeiten, weshalb sie sich ideal für den Einstieg in die Migration eignen.

### Implementierte UI-Basiskomponenten

Folgende UI-Basiskomponenten wurden für die Aktivierung vorbereitet:

1. **Button.vue** - Standard-Button-Komponente
2. **Input.vue** - Texteingabefeld mit verschiedenen Modi
3. **Badge.vue** - Label- und Badge-Komponente
4. **Tooltip.vue** - Tooltip mit Hover-Effekt
5. **Card.vue** - Container-Komponente für Inhalte
6. **Alert.vue** - Benachrichtigungskomponente
7. **Toggle.vue** - An/Aus-Schalter
8. **TextArea.vue** - Mehrzeiliges Texteingabefeld
9. **ProgressBar.vue** - Fortschrittsanzeige
10. **Checkbox.vue** - Auswahlbox
11. **Radio.vue** - Radio-Button
12. **Select.vue** - Dropdown-Auswahlfeld
13. **Modal.vue** - Dialog-Komponente

### Granulare Feature-Steuerung

Für jede Komponente wurde ein eigenes Feature-Flag implementiert, sodass die Komponenten unabhängig voneinander aktiviert werden können:

```typescript
// UI-Basis-Feature-Flags
const useSfcUIButton = ref<boolean>(true);
const useSfcUIInput = ref<boolean>(true);
const useSfcUIBadge = ref<boolean>(true);
// ... weitere UI-Komponenten-Flags
```

Für die einfache Aktivierung aller UI-Basiskomponenten gleichzeitig wurde eine Helferfunktion implementiert:

```typescript
/**
 * Aktiviert alle UI-Basiskomponenten gleichzeitig
 */
function enableAllUIBaseComponents(): void {
  useSfcUIButton.value = true;
  useSfcUIInput.value = true;
  useSfcUIBadge.value = true;
  // ... weitere UI-Komponenten aktivieren

  // Übergeordnetes Feature aktivieren
  useNewUIComponents.value = true;
}
```

### Fehlerbehandlung für UI-Komponenten

Die Fehlererfassung im Feature-Toggle-System wurde erweitert, um UI-Komponenten zu unterstützen:

```typescript
// Fehlerbehandlung für UI-Komponenten
if (componentName.includes("Button")) {
  featureName = "useSfcUIButton";
} else if (componentName.includes("Input")) {
  featureName = "useSfcUIInput";
}
// ... weitere UI-Komponenten
```

### Abhängigkeitsmanagement

Für jede UI-Komponente wurden die Abhängigkeiten klar definiert:

```typescript
useSfcUIButton: {
  name: 'SFC Button-Komponente',
  description: 'Vue 3 SFC Button-Komponente',
  group: 'sfcMigration',
  stable: true,
  requiredRole: 'developer',
  hasFallback: true,
  dependencies: ['useNewUIComponents']
}
```

Die Abhängigkeit zu `useNewUIComponents` stellt sicher, dass alle UI-Komponenten nur aktiviert werden, wenn auch die UI-Komponenten-Bibliothek aktiviert ist.

## Aktivierung der Chat-Komponenten (Phase 2)

Als zweiter Schritt der Vue 3 SFC-Migration wurden die Chat-Komponenten für die Aktivierung vorbereitet. Diese Komponenten bauen auf den UI-Basiskomponenten auf und implementieren die Kernfunktionalität des Chat-Interfaces.

### Implementierte Chat-Komponenten

Folgende Chat-Komponenten wurden für die Aktivierung vorbereitet:

1. **MessageItem.vue** - Anzeige individueller Chat-Nachrichten
2. **MessageList.vue** - Liste von Chat-Nachrichten
3. **ChatInput.vue** - Grundlegendes Eingabefeld für Chat
4. **MessageInput.vue** - Erweiterte Nachrichteneingabe
5. **SessionItem.vue** - Darstellung einzelner Chat-Sessions
6. **SessionList.vue** - Liste aller Chat-Sessions
7. **ChatContainer.vue** - Container für Chat-Funktionalität
8. **EnhancedChatContainer.vue** - Erweiterter Container mit Bridge-Integration

### Granulare Feature-Steuerung

Für jede Komponente wurde ein eigenes Feature-Flag implementiert, sodass die Komponenten unabhängig voneinander aktiviert werden können, unter Berücksichtigung ihrer Abhängigkeiten:

```typescript
// Chat-Komponenten Feature-Flags
const useSfcChatMessageItem = ref<boolean>(true);    // Einfache Anzeigekomponente
const useSfcChatMessageList = ref<boolean>(false);   // Abhängig von MessageItem
const useSfcChatInput = ref<boolean>(true);          // Einfache Eingabekomponente
const useSfcChatMessageInput = ref<boolean>(false);  // Erweiterte Eingabe
// ... weitere Chat-Komponenten-Flags
```

Für die einfache Aktivierung aller Chat-Komponenten gleichzeitig wurde eine Helferfunktion implementiert:

```typescript
/**
 * Aktiviert alle Chat-Komponenten gleichzeitig
 */
function enableAllChatComponents(): void {
  useSfcChatMessageItem.value = true;
  useSfcChatMessageList.value = true;
  useSfcChatInput.value = true;
  useSfcChatMessageInput.value = true;
  useSfcSessionItem.value = true;
  useSfcSessionList.value = true;
  useSfcChatContainer.value = true;
  useSfcEnhancedChatContainer.value = true;

  // Übergeordnetes Feature aktivieren
  useSfcChat.value = true;

  // Erforderliche Abhängigkeiten sicherstellen
  enableAllUIBaseComponents();
}
```

### Abhängigkeitsmanagement

Die Abhängigkeiten zwischen Chat-Komponenten wurden sorgfältig modelliert:

```typescript
useSfcChatMessageItem: {
  name: "SFC Chat-Nachricht",
  description: "Vue 3 SFC Nachrichten-Anzeigekomponente",
  group: "sfcMigration",
  stable: true,
  requiredRole: "developer",
  hasFallback: true,
  dependencies: ["useNewUIComponents", "useSfcUICard", "useSfcUIButton"]
},
useSfcChatMessageList: {
  name: "SFC Chat-Nachrichtenliste",
  description: "Vue 3 SFC Nachrichtenliste",
  group: "sfcMigration",
  stable: true,
  requiredRole: "developer",
  hasFallback: true,
  dependencies: ["useSfcChatMessageItem"]
}
```

### Aktivierungsstrategie

Die Aktivierung der Chat-Komponenten erfolgt in folgender Reihenfolge:

1. Basiskomponenten (MessageItem, ChatInput, SessionItem) - Einfache, unabhängige Komponenten
2. Listen-Komponenten (MessageList, SessionList) - Abhängig von den Basiskomponenten
3. Container-Komponenten (ChatContainer) - Integrieren Listen und Eingabekomponenten
4. Erweiterte Container (EnhancedChatContainer) - Komplexe Integration mit Bridge-System

Diese Strategie minimiert Risiken und erlaubt eine gezielte Fehlerbehebung bei Problemen.

## Aktivierung der Admin-Komponenten (Phase 3)

Als dritter Schritt der Vue 3 SFC-Migration wurden die Admin-Komponenten für die Aktivierung vorbereitet. Diese Komponenten bilden die Grundlage des Admin-Bereichs und ermöglichen die Verwaltung der Anwendung.

### Implementierte Admin-Komponenten

Folgende Admin-Komponenten wurden für die Aktivierung vorbereitet:

1. **AdminPanel.vue** - Hauptcontainer des Admin-Bereichs
2. **AdminUsers.vue** - Benutzerverwaltung
3. **AdminFeedback.vue** - Feedback-Verwaltung
4. **AdminMotd.vue** - Verwaltung von Nachrichten des Tages
5. **AdminSystem.vue** - Systemverwaltung
6. **AdminStatistics.vue** - Statistikanzeige (komplexer mit Grafiken)
7. **AdminSystemSettings.vue** - Einstellungen des Systems
8. **AdminFeatureToggles.vue** - Verwaltung der Feature-Toggles
9. **AdminLogViewer.vue** - Anzeige und Analyse von Logs

### Granulare Feature-Steuerung

Für jede Komponente wurde ein eigenes Feature-Flag implementiert, sodass die Komponenten unabhängig voneinander aktiviert werden können:

```typescript
// Admin-Komponenten Feature-Flags
const useSfcAdminPanel = ref<boolean>(true);          // Hauptcontainer des Admin-Bereichs
const useSfcAdminUsers = ref<boolean>(true);          // Benutzer-Verwaltung
const useSfcAdminFeedback = ref<boolean>(true);       // Feedback-Verwaltung
const useSfcAdminMotd = ref<boolean>(true);           // Nachrichten-Verwaltung
const useSfcAdminSystem = ref<boolean>(true);         // System-Tab
const useSfcAdminStatistics = ref<boolean>(false);    // Statistik-Tab mit komplexen Grafiken
const useSfcAdminSystemSettings = ref<boolean>(true); // Systemeinstellungen-Tab
const useSfcAdminFeatureToggles = ref<boolean>(true); // Feature-Toggle-Verwaltung
const useSfcAdminLogViewer = ref<boolean>(false);     // Log-Betrachter mit erweiterten Funktionen
```

Für die einfache Aktivierung aller Admin-Komponenten gleichzeitig wurde eine Helferfunktion implementiert:

```typescript
/**
 * Aktiviert alle Admin-Komponenten gleichzeitig
 */
function enableAllAdminComponents(): void {
  useSfcAdminPanel.value = true;
  useSfcAdminUsers.value = true;
  useSfcAdminFeedback.value = true;
  useSfcAdminMotd.value = true;
  useSfcAdminSystem.value = true;
  useSfcAdminStatistics.value = true;
  useSfcAdminSystemSettings.value = true;
  useSfcAdminFeatureToggles.value = true;
  useSfcAdminLogViewer.value = true;

  // Übergeordnetes Feature aktivieren
  useSfcAdmin.value = true;

  // Erforderliche Abhängigkeiten sicherstellen
  enableAllUIBaseComponents();
}
```

### Abhängigkeitsmanagement

Die Abhängigkeiten zwischen Admin-Komponenten wurden sorgfältig modelliert:

```typescript
useSfcAdminPanel: {
  name: "SFC Admin-Panel",
  description: "Verwende die neue Vue 3 SFC-Implementierung des Admin-Bereichs Hauptpanels",
  group: "sfcMigration",
  stable: true,
  requiredRole: "developer",
  hasFallback: true,
  dependencies: ["useNewUIComponents", "useSfcAdmin", "useSfcUICard"]
},
useSfcAdminUsers: {
  name: "SFC Admin-Benutzerverwaltung",
  description: "Verwende die neue Vue 3 SFC-Implementierung der Benutzerverwaltung",
  group: "sfcMigration",
  stable: true,
  requiredRole: "developer",
  hasFallback: true,
  dependencies: ["useSfcAdminPanel", "useSfcUIButton", "useSfcUITable"]
}
```

### Aktivierungsstrategie

Die Aktivierung der Admin-Komponenten erfolgt in folgender Reihenfolge:

1. **Admin-Panel** - Grundlegendes Container-Element für alle Admin-Funktionen
2. **Hauptfunktionen** - Benutzer, Feedback, Nachrichten, System, Einstellungen
3. **Komplexe Funktionen** - Statistiken, Log-Viewer mit erweiterten Darstellungen

Diese Strategie gewährleistet eine stabile Grundlage, bevor komplexere Komponenten aktiviert werden.

### Fehlerbehandlung

Die Fehlerbehandlung wurde für Admin-Komponenten verfeinert, um eine detaillierte Problemanalyse zu ermöglichen:

```typescript
if (componentName.includes("Admin")) {
  // Spezifischere Admin-Komponenten prüfen
  if (componentName.includes("Panel")) {
    featureName = "useSfcAdminPanel";
  } else if (componentName.includes("Users")) {
    featureName = "useSfcAdminUsers";
  } else if (componentName.includes("Feedback")) {
    featureName = "useSfcAdminFeedback";
  }
  // ... weitere spezifische Komponenten
  else {
    // Fallback für allgemeine Admin-Komponenten
    featureName = "useSfcAdmin";
  }
}
```

## Aktivierung der Document Converter Komponenten (Phase 4)

Als vierter Schritt der Vue 3 SFC-Migration wurden die Document Converter Komponenten für die Aktivierung vorbereitet. Diese Komponenten sind wichtig für die Dokumentenkonvertierung und -verwaltung in der Anwendung.

### Implementierte Document Converter Komponenten

Folgende Document Converter Komponenten wurden für die Aktivierung vorbereitet:

1. **DocConverterContainer.vue** - Hauptcontainer des Dokumentenkonverters
2. **FileUpload.vue** - Upload-Komponente für einzelne Dateien
3. **BatchUpload.vue** - Batch-Upload für mehrere Dateien (komplexer)
4. **ConversionProgress.vue** - Fortschrittsanzeige für Konvertierungen
5. **ConversionResult.vue** - Ergebnisanzeige für Konvertierungen
6. **DocumentList.vue** - Liste der konvertierten Dokumente
7. **DocumentPreview.vue** - Vorschau der konvertierten Dokumente (komplex)
8. **ConversionStats.vue** - Konvertierungsstatistiken (komplex)
9. **ErrorDisplay.vue** - Anzeige von Konvertierungsfehlern

### Granulare Feature-Steuerung

Für jede Komponente wurde ein eigenes Feature-Flag implementiert, sodass die Komponenten unabhängig voneinander aktiviert werden können:

```typescript
// Document Converter Features - Phase 4 Aktivierung
const useSfcDocConverterContainer = ref<boolean>(true);     // Hauptcontainer des Dokumentenkonverters
const useSfcDocConverterFileUpload = ref<boolean>(true);    // Upload-Komponente für einzelne Dateien
const useSfcDocConverterBatchUpload = ref<boolean>(false);  // Batch-Upload für mehrere Dateien (komplex)
const useSfcDocConverterProgress = ref<boolean>(true);      // Fortschrittsanzeige für Konvertierungen
const useSfcDocConverterResult = ref<boolean>(true);        // Ergebnisanzeige für Konvertierungen
const useSfcDocConverterList = ref<boolean>(true);          // Dokumentenliste
const useSfcDocConverterPreview = ref<boolean>(false);      // Dokumentvorschau (komplex)
const useSfcDocConverterStats = ref<boolean>(false);        // Konvertierungsstatistiken (komplex)
const useSfcDocConverterErrorDisplay = ref<boolean>(true);  // Fehleranzeige für Konvertierungen
```

Für die einfache Aktivierung aller Document Converter Komponenten gleichzeitig wurde eine Helferfunktion implementiert:

```typescript
/**
 * Aktiviert alle Document Converter Komponenten gleichzeitig
 */
function enableAllDocConverterComponents(): void {
  useSfcDocConverterContainer.value = true;
  useSfcDocConverterFileUpload.value = true;
  useSfcDocConverterBatchUpload.value = true;
  useSfcDocConverterProgress.value = true;
  useSfcDocConverterResult.value = true;
  useSfcDocConverterList.value = true;
  useSfcDocConverterPreview.value = true;
  useSfcDocConverterStats.value = true;
  useSfcDocConverterErrorDisplay.value = true;

  // Übergeordnetes Feature aktivieren
  useSfcDocConverter.value = true;

  // Erforderliche Abhängigkeiten sicherstellen
  enableAllUIBaseComponents();
}
```

### Abhängigkeitsmanagement

Die Abhängigkeiten zwischen Document Converter Komponenten wurden sorgfältig modelliert:

```typescript
useSfcDocConverterContainer: {
  name: "SFC Dokumentkonverter Container",
  description: "Verwende die neue Vue 3 SFC-Implementierung des Dokumentkonverter Containers",
  group: "sfcMigration",
  stable: true,
  requiredRole: "developer",
  hasFallback: true,
  dependencies: ["useSfcDocConverter", "useSfcUICard"]
},
useSfcDocConverterFileUpload: {
  name: "SFC Datei-Upload",
  description: "Verwende die neue Vue 3 SFC-Implementierung des Datei-Uploads",
  group: "sfcMigration",
  stable: true,
  requiredRole: "developer",
  hasFallback: true,
  dependencies: ["useSfcDocConverterContainer", "useSfcUIButton"]
}
```

### Aktivierungsstrategie

Die Aktivierung der Document Converter Komponenten erfolgt in folgender Reihenfolge:

1. **DocConverterContainer** - Grundlegendes Container-Element für alle Dokumentenkonverter-Funktionen
2. **Basiskomponenten** - FileUpload, Progress, Result, List, ErrorDisplay - Einfachere Komponenten
3. **Komplexe Komponenten** - BatchUpload, Preview, Stats - Komponenten mit komplexerer Funktionalität

Diese Strategie minimiert Risiken und ermöglicht eine gezielte Fehlerbehebung bei auftretenden Problemen.

### Standardaktivierung

Basierend auf der Komplexität und Stabilität wurden die Document Converter Komponenten mit unterschiedlichen Standardwerten aktiviert:

1. **Aktiviert standardmäßig (true):**
   - useSfcDocConverterContainer
   - useSfcDocConverterFileUpload
   - useSfcDocConverterProgress
   - useSfcDocConverterResult
   - useSfcDocConverterList
   - useSfcDocConverterErrorDisplay

2. **Deaktiviert standardmäßig (false):**
   - useSfcDocConverterBatchUpload
   - useSfcDocConverterPreview
   - useSfcDocConverterStats

Diese Konfiguration stellt sicher, dass grundlegende Funktionen sofort verfügbar sind, während komplexere Komponenten erst nach weiteren Tests aktiviert werden.

### Fehlerbehandlung

Die Fehlerbehandlung wurde für Document Converter Komponenten verfeinert, um eine detaillierte Problemanalyse zu ermöglichen:

```typescript
if (componentName.includes("DocConverter")) {
  // Spezifischere Document Converter Komponenten prüfen
  if (componentName.includes("Container")) {
    featureName = "useSfcDocConverterContainer";
  } else if (componentName.includes("FileUpload")) {
    featureName = "useSfcDocConverterFileUpload";
  } else if (componentName.includes("BatchUpload")) {
    featureName = "useSfcDocConverterBatchUpload";
  }
  // ... weitere spezifische Komponenten
  else {
    // Fallback für allgemeine Document Converter Komponenten
    featureName = "useSfcDocConverter";
  }
}
```

## Nächste Schritte

Die folgenden Schritte sind für die Weiterentwicklung des Feature-Toggle-Systems geplant:

1. **Performance-Optimierung**: Optimierung der Feature-Flag-Prüfungen
2. **Erweiterte A/B-Test-Funktionen**: Verbesserung der A/B-Test-Integration
3. **Automatisierte Tests**: Automatische Tests für alle Feature-Kombinationen
4. **Feature-Flag-Lebenszyklus**: Automatische Entfernung veralteter Feature-Flags
5. **Verbesserte Dokumentation**: Umfassendere Dokumentation aller Features

## Fazit

Das Feature-Toggle-System ist ein essenzieller Bestandteil der Migration zu Vue 3 SFCs. Es ermöglicht eine kontrollierte, schrittweise Migration mit minimalen Risiken und maximaler Flexibilität. Die vollständige Implementierung (100%) bietet eine robuste Grundlage für die weitere Migration und garantiert die Stabilität der Anwendung während des Migrationsprozesses.

Mit dem Abschluss der Phase 4 (Dokumentenkonverter-Komponenten) ist der Kern der Migration der wichtigsten Anwendungskomponenten abgeschlossen. Die vier Phasen (UI-Basiskomponenten, Chat-Komponenten, Admin-Komponenten und Dokumentenkonverter-Komponenten) decken alle wesentlichen Bereiche der Anwendung ab und bieten eine solide Grundlage für die vollständige Migration zu Vue 3 SFCs.

---

Zuletzt aktualisiert: 11.05.2025