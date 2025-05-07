# Entwicklungsrichtlinien für den nscale DMS Assistenten

Dieses Dokument bietet einen Leitfaden für die Entwicklung und Erweiterung des nscale DMS Assistenten, insbesondere im Hinblick auf die Verwendung von Vue 3 Single File Components (SFCs).

## Inhaltsverzeichnis

1. [Projektstruktur](#projektstruktur)
2. [Komponenten-Best-Practices](#komponenten-best-practices)
3. [State Management](#state-management)
4. [Style Guide](#style-guide)
5. [Testing](#testing)
6. [Dokumentation](#dokumentation)
7. [Migrationsstrategie](#migrationsstrategie)

## Projektstruktur

Das Projekt folgt einer modularen Struktur, die auf Vue 3 und Vite basiert:

```
src/
├── App.vue                      # Hauptkomponente
├── main.js                      # Einstiegspunkt der Anwendung
├── components/                  # UI-Komponenten
│   ├── [feature]/              # Funktionsbereichsspezifische Komponenten
│   └── ui/                     # Gemeinsame UI-Elemente
├── composables/                 # Wiederverwendbare Kompositionsfunktionen
├── stores/                      # Pinia Stores für globalen Zustand
└── utils/                       # Hilfsfunktionen und Konstanten
```

## Komponenten-Best-Practices

### Allgemeine Prinzipien

- **Single Responsibility**: Jede Komponente sollte eine klar definierte Verantwortung haben
- **Kompositionsfunktionen**: Extrahiere komplexe Logik in Kompositionsfunktionen (Composables)
- **Props Down, Events Up**: Verwende Props für Datenfluss nach unten und Events für Kommunikation nach oben
- **Kleine Komponenten**: Halte Komponenten klein und fokussiert (< 300 Zeilen)
- **Lesbare Templates**: Halte Templates lesbar und einfach

### Komponenten-Struktur

```vue
<template>
  <!-- Template-Code hier -->
</template>

<script setup>
// Imports
import { ref, computed, onMounted } from 'vue';
import ComponentName from './ComponentName.vue';

// Props
const props = defineProps({
  propName: {
    type: String,
    required: true,
    default: '',
    validator: (value) => {
      // Optional: Prüfen des Props
      return true;
    }
  }
});

// Emits
const emit = defineEmits(['eventName']);

// Store-Referenzen (wenn nötig)
const store = useStore();

// Reaktive Zustände
const localState = ref('');

// Berechnete Eigenschaften
const computedValue = computed(() => {
  return `Computed: ${localState.value}`;
});

// Methoden
const handleEvent = () => {
  // Verarbeiten des Events
  emit('eventName', localState.value);
};

// Lebenszyklus-Hooks
onMounted(() => {
  // Initialisierung
});
</script>

<style scoped>
/* Komponentenspezifische Stile */
</style>
```

### TypeScript-Verwendung

Verwende TypeScript für verbesserte Typsicherheit und Entwicklererfahrung:

```vue
<script setup lang="ts">
import { ref, computed } from 'vue';

// Interface-Definition
interface User {
  id: string;
  name: string;
  email: string;
}

// Props mit TypeScript
const props = defineProps<{
  user: User;
  isActive: boolean;
}>();

// Emit mit TypeScript
const emit = defineEmits<{
  (e: 'update', id: string): void;
  (e: 'delete', id: string): void;
}>();

// Typischere reaktive Zustände
const users = ref<User[]>([]);
</script>
```

## State Management

### Lokaler Zustand

- Verwende `ref()` und `reactive()` für komponentenlokalen Zustand
- Ziehe Zustände in Kompositionsfunktionen aus, wenn sie in mehreren Komponenten benötigt werden

```vue
<script setup>
import { ref, reactive } from 'vue';

// Einfache Werte
const count = ref(0);

// Komplexe Objekte
const user = reactive({
  name: '',
  email: '',
  preferences: {
    theme: 'light'
  }
});
</script>
```

### Globaler Zustand mit Pinia

- Verwende Pinia für globalen anwendungsweiten Zustand
- Teile Stores nach Funktionsbereichen auf
- Verwende die Composition API für Store-Definitionen

```js
// stores/counter.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useCounterStore = defineStore('counter', () => {
  // State
  const count = ref(0);
  
  // Getters
  const doubleCount = computed(() => count.value * 2);
  
  // Actions
  function increment() {
    count.value++;
  }
  
  return {
    count,
    doubleCount,
    increment
  };
});
```

```vue
<script setup>
import { useCounterStore } from '@/stores/counter';

const counterStore = useCounterStore();

// Verwende Store-Zustand und -Aktionen
function handleClick() {
  counterStore.increment();
}
</script>
```

## Style Guide

### Namenskonventionen

- **Komponentendateien**: PascalCase (z.B. `UserProfile.vue`)
- **Komponenten-Namen**: PascalCase (z.B. `<UserProfile />`)
- **Kompositionsfunktionen**: camelCase mit "use"-Präfix (z.B. `useUserData`)
- **Store-Dateien**: camelCase (z.B. `user.js`)
- **Store-Definitionen**: camelCase mit "use"-Präfix (z.B. `useUserStore`)

### Code-Formatierung

- Verwende Prettier für einheitliche Formatierung
- Verwende ESLint für Code-Qualität
- 2 Leerzeichen für Einrückung
- Einzelne Anführungszeichen für Strings
- Semikolons am Ende von Statements
- Trailing Commas für mehrzeilige Listen und Objekte

### Kommentare

- Dokumentiere komplexe Logik mit klaren Kommentaren
- Verwende JSDoc für Funktionen und Methoden

```js
/**
 * Berechnet die Summe zweier Zahlen
 * @param {number} a - Erste Zahl
 * @param {number} b - Zweite Zahl
 * @returns {number} Die Summe von a und b
 */
function sum(a, b) {
  return a + b;
}
```

## Testing

### Komponententests

- Verwende Vitest und Vue Test Utils für Komponententests
- Teste die öffentliche API der Komponente, nicht die Implementierungsdetails
- Teste Randfälle und Fehlerzustände

```js
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import UserProfile from '../UserProfile.vue';

describe('UserProfile', () => {
  it('renders user name correctly', () => {
    const wrapper = mount(UserProfile, {
      props: {
        user: {
          name: 'Max Mustermann',
          email: 'max@example.com'
        }
      }
    });
    
    expect(wrapper.text()).toContain('Max Mustermann');
  });
});
```

### E2E-Tests

- Verwende Cypress für End-to-End-Tests
- Teste kritische Benutzerpfade

## Dokumentation

### Komponenten-Dokumentation

- Dokumentiere Komponenten mit klaren Beschreibungen ihrer Funktionalität
- Liste Props, Events und Slots auf
- Füge Beispiele für die Verwendung hinzu

## Migrationsstrategie

### Legacy-Code mit SFCs integrieren

1. **Isoliere Funktionalität**: Identifiziere abgeschlossene Funktionsbereiche
2. **Erstelle SFCs**: Refaktoriere die identifizierte Funktionalität in SFCs
3. **Integration**: Integriere die neuen SFCs mit dem Legacy-Code
4. **Feature Toggle**: Implementiere Feature-Toggles, um zwischen altem und neuem Code zu wechseln
5. **Test**: Teste umfassend, bevor du die neue Implementierung aktivierst
6. **Schrittweise Migration**: Migriere nach und nach weitere Funktionalitäten

### Beispiel: Feature-Toggle

```js
// stores/featureToggles.js
import { defineStore } from 'pinia';

export const useFeatureTogglesStore = defineStore('featureToggles', {
  state: () => ({
    useSfcChat: false,
    useSfcAdmin: false
  }),
  
  persist: true
});
```

```vue
<template>
  <!-- Bedingte Rendern der neuen oder alten Implementierung -->
  <ChatView v-if="featureToggles.useSfcChat" />
  <div v-else id="legacy-chat-container"></div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import { useFeatureTogglesStore } from '@/stores/featureToggles';
import ChatView from '@/components/chat/ChatView.vue';

const featureToggles = useFeatureTogglesStore();

// Legacy-Code initialisieren, wenn die neue Implementierung nicht aktiv ist
onMounted(() => {
  if (!featureToggles.useSfcChat) {
    window.initLegacyChat();
  }
});

// Legacy-Code aufräumen, wenn Komponente zerstört wird
onUnmounted(() => {
  if (!featureToggles.useSfcChat) {
    window.destroyLegacyChat();
  }
});
</script>
```

### Bridge-Muster für Legacy-Integration

```js
// bridges/chatBridge.js
import { useSessionStore } from '@/stores/session';

/**
 * Bridge zwischen altem und neuem Chat-System
 */
export function setupChatBridge() {
  const sessionStore = useSessionStore();
  
  // Alte globale Funktionen mit neuen Store-Aktionen verbinden
  window.reloadCurrentSession = () => {
    const sessionId = sessionStore.currentSessionId;
    if (sessionId) {
      sessionStore.loadSession(sessionId);
    }
  };
  
  window.updateSessionTitle = async (sessionId) => {
    await sessionStore.updateSessionTitle(sessionId);
  };
  
  // Ereignislistener einrichten, um auf Änderungen im Store zu reagieren
  watch(() => sessionStore.messages, (newMessages) => {
    // Legacy-Komponenten über Änderungen informieren
    if (window.onMessagesUpdated) {
      window.onMessagesUpdated(newMessages);
    }
  });
}
```

## Weitere Ressourcen

- [Vue 3 Dokumentation](https://vuejs.org/)
- [Vue Style Guide](https://vuejs.org/style-guide/)
- [Pinia Dokumentation](https://pinia.vuejs.org/)
- [Vite Dokumentation](https://vitejs.dev/)