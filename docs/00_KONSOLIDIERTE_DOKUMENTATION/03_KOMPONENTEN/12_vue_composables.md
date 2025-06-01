# Composables

## Übersicht

Dieses Dokument beschreibt die neu implementierten Vue 3 Composables, die in der nscale-assist Anwendung verwendet werden. Composables sind wiederverwendbare Logikeinheiten, die die Komponentenlogik voneinander trennen und die Wiederverwendbarkeit fördern. Sie sind ein wichtiger Bestandteil der Vue 3 Composition API.

## Inhaltsverzeichnis

1. [useIntersectionObserver](#useintersectionobserver)
2. [useOfflineDetection](#useofflinedetection)
3. [useApiCache](#useapicache)
4. [useForm](#useform)
5. [useLocalStorage](#uselocalstorage)
6. [useClipboard](#useclipboard)
7. [Integration mit anderen Komponenten](#integration-mit-anderen-komponenten)

---

## useIntersectionObserver

### Zweck

Das `useIntersectionObserver` Composable ermöglicht die Erkennung, wann ein Element im Viewport des Benutzers sichtbar wird. Es nutzt die [Intersection Observer API](https://developer.mozilla.org/de/docs/Web/API/Intersection_Observer_API), um effizienten und performanten Code für Lazy-Loading, Infinite Scrolling oder andere sichtbarkeitsbasierte Aktionen bereitzustellen.

### API

```typescript
function useIntersectionObserver(
  elementRef: Ref<HTMLElement | null>,
  options?: {
    root?: HTMLElement | null;
    rootMargin?: string;
    threshold?: number | number[];
    immediate?: boolean;
  }
): {
  isIntersecting: Ref<boolean>;
  observerEntry: Ref<IntersectionObserverEntry | null>;
  stop: () => void;
  start: () => void;
}
```

#### Parameter

- `elementRef`: Eine Referenz auf das zu beobachtende DOM-Element
- `options`: Konfigurationsoptionen
  - `root`: Das Element, das als Viewport für die Prüfung der Sichtbarkeit des Zielelements dient (Standard: null, was dem Browser-Viewport entspricht)
  - `rootMargin`: Marge um das Root-Element (Standard: '0px')
  - `threshold`: Ein Wert oder Array von Werten zwischen 0 und 1, der angibt, wann der Callback ausgelöst werden soll (Standard: 0)
  - `immediate`: Wenn true, startet die Beobachtung sofort (Standard: true)

#### Rückgabewerte

- `isIntersecting`: Ein reaktives Boolean, das angibt, ob das Element sichtbar ist
- `observerEntry`: Das vollständige IntersectionObserverEntry Objekt
- `stop`: Funktion zum Beenden der Beobachtung
- `start`: Funktion zum Starten der Beobachtung

### Beispiel: Lazy-Loading von Bildern

```vue
<template>
  <div ref="imageContainer">
    <img v-if="isVisible" :src="imageUrl" alt="Lazy-loaded image" />
    <div v-else class="placeholder"></div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useIntersectionObserver } from '@/composables';

const imageContainer = ref(null);
const imageUrl = 'https://example.com/large-image.jpg';

const { isIntersecting: isVisible } = useIntersectionObserver(imageContainer, {
  threshold: 0.1, // Löst aus, wenn 10% des Elements sichtbar sind
  rootMargin: '100px', // Lädt das Bild bereits, wenn es 100px vom Viewport entfernt ist
});
</script>
```

### Beispiel: Infinite Scrolling

```vue
<template>
  <div>
    <div v-for="item in items" :key="item.id">
      {{ item.name }}
    </div>
    <div ref="loadMoreTrigger" class="load-more-trigger"></div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useIntersectionObserver } from '@/composables';

const items = ref([]);
const page = ref(1);
const loadMoreTrigger = ref(null);
const isLoading = ref(false);

const loadItems = async () => {
  if (isLoading.value) return;
  
  isLoading.value = true;
  try {
    const newItems = await fetchItems(page.value);
    items.value = [...items.value, ...newItems];
    page.value++;
  } catch (error) {
    console.error('Fehler beim Laden der Elemente:', error);
  } finally {
    isLoading.value = false;
  }
};

// Initialen Datensatz laden
onMounted(loadItems);

// Intersection Observer für Infinite Scrolling
const { isIntersecting } = useIntersectionObserver(loadMoreTrigger, {
  threshold: 0.5,
});

// Bei Sichtbarkeit des Trigger-Elements neue Daten laden
watch(isIntersecting, (newValue) => {
  if (newValue && !isLoading.value) {
    loadItems();
  }
});

// Hilfsfunktion zum Abrufen von Daten
const fetchItems = async (page) => {
  // API-Aufruf implementieren
  return [];
};
</script>
```

---

## useOfflineDetection

### Zweck

Das `useOfflineDetection` Composable ermöglicht die Erkennung des Netzwerkstatus und stellt reaktive Eigenschaften zur Verfügung, um den Online- oder Offline-Status der Anwendung zu überwachen. Dies ist besonders nützlich für Progressive Web Apps (PWAs) oder Anwendungen, die offline funktionieren müssen.

### API

```typescript
function useOfflineDetection(options?: {
  pingUrl?: string;
  pingInterval?: number;
  onOffline?: () => void;
  onOnline?: () => void;
}): {
  isOnline: Ref<boolean>;
  isOffline: Ref<boolean>;
  lastOnlineTime: Ref<Date | null>;
  checkConnection: () => Promise<boolean>;
}
```

#### Parameter

- `options`: Konfigurationsoptionen
  - `pingUrl`: URL, die für aktive Verbindungstests verwendet wird (Standard: '/api/health')
  - `pingInterval`: Intervall in Millisekunden für regelmäßige Verbindungstests (Standard: 30000, 0 deaktiviert automatische Tests)
  - `onOffline`: Callback-Funktion, die ausgeführt wird, wenn eine Offline-Änderung erkannt wird
  - `onOnline`: Callback-Funktion, die ausgeführt wird, wenn eine Online-Änderung erkannt wird

#### Rückgabewerte

- `isOnline`: Reaktiver Boolean, der anzeigt, ob die Anwendung online ist
- `isOffline`: Reaktiver Boolean, der anzeigt, ob die Anwendung offline ist (negiertes isOnline)
- `lastOnlineTime`: Das letzte Mal, als die Anwendung online war
- `checkConnection`: Funktion zum manuellen Überprüfen der Verbindung

### Beispiel: Grundlegende Verwendung

```vue
<template>
  <div>
    <div v-if="isOnline" class="online-indicator">Online</div>
    <div v-else class="offline-indicator">
      Offline - Letzte Verbindung: {{ formattedLastOnlineTime }}
    </div>
    
    <button @click="checkConnection">
      Verbindung prüfen
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useOfflineDetection } from '@/composables';

const { isOnline, isOffline, lastOnlineTime, checkConnection } = useOfflineDetection({
  pingUrl: '/api/status',
  pingInterval: 60000, // Überprüfe alle 60 Sekunden
  onOffline: () => {
    console.log('Verbindung verloren. Speichere lokale Änderungen...');
    // Logik für die Offline-Behandlung
  },
  onOnline: () => {
    console.log('Verbindung wiederhergestellt. Synchronisiere Daten...');
    // Logik für die Online-Wiederherstellung
  }
});

const formattedLastOnlineTime = computed(() => {
  if (!lastOnlineTime.value) return 'Nie';
  return new Date(lastOnlineTime.value).toLocaleString('de-DE');
});
</script>
```

### Beispiel: Integration mit Offline-Speicherung

```vue
<template>
  <div>
    <form @submit.prevent="submitForm">
      <!-- Formularinhalte -->
      <button type="submit" :disabled="isSubmitting">
        {{ isOnline ? 'Senden' : 'Lokal speichern' }}
      </button>
    </form>
    
    <div v-if="isOffline" class="offline-warning">
      Sie sind offline. Das Formular wird lokal gespeichert und automatisch gesendet, 
      sobald die Verbindung wiederhergestellt ist.
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useOfflineDetection, useLocalStorage } from '@/composables';
import { useOfflineQueue } from '@/services/OfflineQueueService';

const { isOnline, isOffline } = useOfflineDetection();
const { addToQueue, processQueue } = useOfflineQueue();
const isSubmitting = ref(false);

const formData = ref({
  // Formulardaten
});

const submitForm = async () => {
  isSubmitting.value = true;
  
  try {
    if (isOnline.value) {
      // Direkte Übermittlung an den Server
      await sendFormToServer(formData.value);
    } else {
      // In Offline-Warteschlange speichern
      addToQueue({
        type: 'form-submission',
        data: formData.value,
        timestamp: new Date()
      });
    }
  } catch (error) {
    console.error('Fehler bei der Formularübermittlung:', error);
  } finally {
    isSubmitting.value = false;
  }
};

// Beobachte den Online-Status und verarbeite die Warteschlange, wenn online
watch(isOnline, (newValue) => {
  if (newValue) {
    processQueue();
  }
});
</script>
```

---

## useApiCache

### Zweck

Das `useApiCache` Composable ermöglicht die effiziente Zwischenspeicherung von API-Anfragen, um wiederholte Netzwerkanfragen zu reduzieren, die Leistung zu verbessern und die Offline-Unterstützung zu ermöglichen. Es integriert sich gut mit dem `useOfflineDetection` Composable.

### API

```typescript
function useApiCache<T>(options?: {
  storage?: 'local' | 'session' | 'memory';
  ttl?: number;
  namespace?: string;
  serializer?: (data: T) => string;
  deserializer?: (data: string) => T;
}): {
  getCached: <R extends T>(key: string) => R | null;
  cache: <R extends T>(key: string, data: R, customTtl?: number) => void;
  invalidate: (key: string) => boolean;
  invalidateAll: (namespace?: string) => void;
  isCached: (key: string) => boolean;
  getCacheTimestamp: (key: string) => number | null;
}
```

#### Parameter

- `options`: Konfigurationsoptionen
  - `storage`: Speichertyp für den Cache (Standard: 'local')
  - `ttl`: Time-to-live in Millisekunden (Standard: 3600000 = 1 Stunde)
  - `namespace`: Namespace für den Cache (Standard: 'api-cache')
  - `serializer`: Benutzerdefinierte Funktion zum Serialisieren von Daten (Standard: JSON.stringify)
  - `deserializer`: Benutzerdefinierte Funktion zum Deserialisieren von Daten (Standard: JSON.parse)

#### Rückgabewerte

- `getCached`: Funktion zum Abrufen von zwischengespeicherten Daten
- `cache`: Funktion zum Hinzufügen von Daten zum Cache
- `invalidate`: Funktion zum Ungültigmachen eines bestimmten Cache-Eintrags
- `invalidateAll`: Funktion zum Ungültigmachen aller Cache-Einträge (optional in einem bestimmten Namespace)
- `isCached`: Funktion zur Überprüfung, ob ein Schlüssel im Cache vorhanden ist
- `getCacheTimestamp`: Funktion zum Abrufen des Zeitstempels eines Cache-Eintrags

### Beispiel: Daten mit Cache abrufen

```vue
<script setup>
import { ref, onMounted } from 'vue';
import { useApiCache } from '@/composables';
import { fetchDocuments } from '@/services/api';

const documents = ref([]);
const isLoading = ref(false);
const error = ref(null);

// Cache mit benutzerdefinierten Optionen initialisieren
const { getCached, cache, isCached } = useApiCache({
  ttl: 5 * 60 * 1000, // 5 Minuten TTL
  namespace: 'document-cache'
});

const loadDocuments = async (forceRefresh = false) => {
  const cacheKey = 'all-documents';
  
  // Wenn nicht erzwungen und im Cache vorhanden, verwende Cache
  if (!forceRefresh && isCached(cacheKey)) {
    documents.value = getCached(cacheKey);
    return;
  }
  
  isLoading.value = true;
  error.value = null;
  
  try {
    const result = await fetchDocuments();
    documents.value = result;
    
    // Im Cache speichern
    cache(cacheKey, result);
  } catch (err) {
    error.value = 'Fehler beim Laden der Dokumente: ' + err.message;
    
    // Versuche, auf Cache zurückzugreifen, wenn verfügbar
    if (isCached(cacheKey)) {
      documents.value = getCached(cacheKey);
    }
  } finally {
    isLoading.value = false;
  }
};

// Initial laden
onMounted(() => loadDocuments());
</script>
```

### Beispiel: Komplexes Beispiel mit Offline-Unterstützung

```vue
<template>
  <div>
    <div v-if="isLoading">Lade Daten...</div>
    <div v-else-if="error">{{ error }}</div>
    <div v-else>
      <div v-for="item in data" :key="item.id">
        {{ item.title }}
      </div>
      
      <div class="cache-info">
        <span v-if="isCachedData">
          Daten aus Cache vom {{ formatTimestamp(cacheTimestamp) }}
          <button @click="refreshData">Aktualisieren</button>
        </span>
        <span v-else>Live-Daten</span>
      </div>
      
      <div v-if="isOffline" class="offline-message">
        Sie sind offline. Es werden zwischengespeicherte Daten angezeigt.
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useApiCache, useOfflineDetection } from '@/composables';
import { apiService } from '@/services/api';

const data = ref([]);
const isLoading = ref(false);
const error = ref(null);
const cacheTimestamp = ref(null);
const isCachedData = ref(false);

const { isOffline } = useOfflineDetection();

const { getCached, cache, isCached, getCacheTimestamp, invalidate } = useApiCache({
  ttl: 30 * 60 * 1000, // 30 Minuten Cache-Lebensdauer
  namespace: 'api-data'
});

const fetchData = async (forceRefresh = false) => {
  const cacheKey = 'api/items';
  
  // Wenn offline oder Cache verfügbar und nicht erzwungen, verwende Cache
  if ((isOffline.value || !forceRefresh) && isCached(cacheKey)) {
    data.value = getCached(cacheKey);
    cacheTimestamp.value = getCacheTimestamp(cacheKey);
    isCachedData.value = true;
    return;
  }
  
  // Bei erzwungener Aktualisierung oder keinem Cache vorhanden
  isLoading.value = true;
  error.value = null;
  
  try {
    const response = await apiService.getItems();
    data.value = response.data;
    
    // Im Cache speichern
    cache(cacheKey, response.data);
    cacheTimestamp.value = getCacheTimestamp(cacheKey);
    isCachedData.value = false;
  } catch (err) {
    console.error('Fehler beim Laden der Daten:', err);
    error.value = 'Fehler beim Laden der Daten. ' + 
      (isCached(cacheKey) ? 'Verwende zwischengespeicherte Daten.' : '');
    
    // Bei Fehler auf Cache zurückgreifen, wenn verfügbar
    if (isCached(cacheKey)) {
      data.value = getCached(cacheKey);
      cacheTimestamp.value = getCacheTimestamp(cacheKey);
      isCachedData.value = true;
    }
  } finally {
    isLoading.value = false;
  }
};

const refreshData = () => {
  fetchData(true); // Erzwinge Aktualisierung
};

const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleString('de-DE');
};

// Daten laden, wenn die Komponente eingebunden wird
onMounted(fetchData);

// Beim Wechsel von offline zu online, Daten aktualisieren
watch(() => isOffline.value, (newValue, oldValue) => {
  if (oldValue === true && newValue === false) {
    // Wenn wieder online, lade frische Daten
    fetchData(true);
  }
});
</script>
```

---

## useForm

### Zweck

Das `useForm` Composable vereinfacht die Formularverwaltung in Vue-Anwendungen, indem es Funktionen für Validierung, Fehlerbehandlung, Formularrücksetzung und -übermittlung bereitstellt. Es sorgt für ein konsistentes Formularverhalten in der gesamten Anwendung.

### API

```typescript
function useForm<T extends Record<string, any>>(options: {
  initialValues: T;
  validationSchema?: any;
  onSubmit?: (values: T, helpers: FormHelpers) => void | Promise<void>;
  onReset?: () => void;
}): {
  values: Ref<T>;
  errors: Ref<Record<keyof T, string>>;
  touched: Ref<Record<keyof T, boolean>>;
  isSubmitting: Ref<boolean>;
  isValid: ComputedRef<boolean>;
  isDirty: ComputedRef<boolean>;
  resetForm: () => void;
  setFieldValue: (field: keyof T, value: any) => void;
  setFieldTouched: (field: keyof T, isTouched?: boolean) => void;
  validateField: (field: keyof T) => Promise<boolean>;
  validateForm: () => Promise<boolean>;
  handleSubmit: (e?: Event) => Promise<void>;
  submitForm: () => Promise<void>;
}
```

#### Parameter

- `options`: Konfigurationsoptionen
  - `initialValues`: Die Anfangswerte des Formulars
  - `validationSchema`: Ein optionales Validierungsschema (z.B. yup, zod)
  - `onSubmit`: Eine Callback-Funktion, die ausgeführt wird, wenn das Formular abgesendet wird
  - `onReset`: Eine optionale Callback-Funktion, die ausgeführt wird, wenn das Formular zurückgesetzt wird

#### Rückgabewerte

- `values`: Die aktuellen Formularwerte
- `errors`: Die Validierungsfehler für jedes Feld
- `touched`: Gibt an, welche Felder bereits berührt wurden
- `isSubmitting`: Gibt an, ob das Formular gerade abgesendet wird
- `isValid`: Gibt an, ob das Formular gültig ist
- `isDirty`: Gibt an, ob das Formular geändert wurde
- `resetForm`: Funktion zum Zurücksetzen des Formulars
- `setFieldValue`: Funktion zum Setzen eines Feldwerts
- `setFieldTouched`: Funktion zum Markieren eines Felds als berührt
- `validateField`: Funktion zur Validierung eines einzelnen Felds
- `validateForm`: Funktion zur Validierung des gesamten Formulars
- `handleSubmit`: Event-Handler für das Formular-Submit-Event
- `submitForm`: Funktion zum programmatischen Absenden des Formulars

### Beispiel: Grundlegende Verwendung

```vue
<template>
  <form @submit.prevent="handleSubmit">
    <div class="form-group">
      <label for="name">Name</label>
      <input
        id="name"
        v-model="values.name"
        @blur="setFieldTouched('name')"
        :class="{ 'error': touched.name && errors.name }"
      />
      <div v-if="touched.name && errors.name" class="error-message">
        {{ errors.name }}
      </div>
    </div>
    
    <div class="form-group">
      <label for="email">E-Mail</label>
      <input
        id="email"
        type="email"
        v-model="values.email"
        @blur="setFieldTouched('email')"
        :class="{ 'error': touched.email && errors.email }"
      />
      <div v-if="touched.email && errors.email" class="error-message">
        {{ errors.email }}
      </div>
    </div>
    
    <button type="submit" :disabled="isSubmitting || !isValid">
      {{ isSubmitting ? 'Wird gesendet...' : 'Senden' }}
    </button>
    <button type="button" @click="resetForm">Zurücksetzen</button>
  </form>
</template>

<script setup>
import { useForm } from '@/composables';
import * as yup from 'yup';

// Validierungsschema definieren
const validationSchema = yup.object({
  name: yup.string().required('Name ist erforderlich'),
  email: yup.string().email('Ungültige E-Mail-Adresse').required('E-Mail ist erforderlich')
});

// Formular initialisieren
const {
  values,
  errors,
  touched,
  isSubmitting,
  isValid,
  resetForm,
  setFieldValue,
  setFieldTouched,
  handleSubmit
} = useForm({
  initialValues: {
    name: '',
    email: ''
  },
  validationSchema,
  onSubmit: async (values) => {
    // Simuliere API-Aufruf
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Formular gesendet:', values);
    // Nach Erfolg zurücksetzen
    resetForm();
  },
  onReset: () => {
    console.log('Formular zurückgesetzt');
  }
});
</script>
```

### Beispiel: Dynamisches Formular mit Array-Feldern

```vue
<template>
  <form @submit.prevent="handleSubmit">
    <div class="form-group">
      <label for="title">Titel</label>
      <input
        id="title"
        v-model="values.title"
        @blur="setFieldTouched('title')"
      />
      <div v-if="touched.title && errors.title" class="error-message">
        {{ errors.title }}
      </div>
    </div>
    
    <!-- Dynamische Liste von Autoren -->
    <div class="authors-section">
      <h3>Autoren</h3>
      <div v-for="(_, index) in values.authors" :key="index" class="author-item">
        <div class="form-group">
          <label :for="`author-${index}`">Autor {{ index + 1 }}</label>
          <input
            :id="`author-${index}`"
            v-model="values.authors[index]"
            @blur="setFieldTouched(`authors.${index}`)"
          />
          <button type="button" @click="removeAuthor(index)">Entfernen</button>
        </div>
      </div>
      <button type="button" @click="addAuthor">Autor hinzufügen</button>
    </div>
    
    <button type="submit" :disabled="isSubmitting || !isValid">
      Dokument speichern
    </button>
  </form>
</template>

<script setup>
import { useForm } from '@/composables';
import * as yup from 'yup';

// Validierungsschema definieren
const validationSchema = yup.object({
  title: yup.string().required('Titel ist erforderlich'),
  authors: yup.array().of(
    yup.string().required('Autor ist erforderlich')
  ).min(1, 'Mindestens ein Autor ist erforderlich')
});

// Formular initialisieren
const {
  values,
  errors,
  touched,
  isSubmitting,
  isValid,
  resetForm,
  setFieldValue,
  setFieldTouched,
  validateForm,
  handleSubmit
} = useForm({
  initialValues: {
    title: '',
    authors: ['']
  },
  validationSchema,
  onSubmit: async (values) => {
    console.log('Dokument gespeichert:', values);
    // API-Aufruf zum Speichern des Dokuments
  }
});

// Autor hinzufügen
const addAuthor = () => {
  const newAuthors = [...values.value.authors, ''];
  setFieldValue('authors', newAuthors);
};

// Autor entfernen
const removeAuthor = (index) => {
  const newAuthors = [...values.value.authors];
  newAuthors.splice(index, 1);
  setFieldValue('authors', newAuthors);
  // Nach dem Entfernen validieren
  validateForm();
};
</script>
```

---

## useLocalStorage

### Zweck

Das `useLocalStorage` Composable ermöglicht die einfache persistente Speicherung von Daten im localStorage des Browsers mit reaktiven Vue-Referenzen. Änderungen an den Daten werden automatisch mit dem localStorage synchronisiert.

### API

```typescript
function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options?: {
    serializer?: (value: T) => string;
    deserializer?: (value: string) => T;
    onError?: (error: Error) => void;
  }
): {
  value: Ref<T>;
  remove: () => void;
  reset: () => void;
}
```

#### Parameter

- `key`: Der Schlüssel im localStorage
- `initialValue`: Der Standardwert, wenn kein Wert im localStorage gefunden wird
- `options`: Konfigurationsoptionen
  - `serializer`: Benutzerdefinierte Funktion zum Serialisieren von Daten (Standard: JSON.stringify)
  - `deserializer`: Benutzerdefinierte Funktion zum Deserialisieren von Daten (Standard: JSON.parse)
  - `onError`: Fehlerbehandlungsfunktion

#### Rückgabewerte

- `value`: Eine reaktive Referenz, die mit localStorage synchronisiert wird
- `remove`: Funktion zum Entfernen des Werts aus dem localStorage
- `reset`: Funktion zum Zurücksetzen des Werts auf den initialValue

### Beispiel: Grundlegende Verwendung

```vue
<template>
  <div>
    <h2>Benutzereinstellungen</h2>
    
    <div class="form-group">
      <label for="theme">Farbschema</label>
      <select id="theme" v-model="settings.theme">
        <option value="light">Hell</option>
        <option value="dark">Dunkel</option>
        <option value="system">Systemeinstellung</option>
      </select>
    </div>
    
    <div class="form-group">
      <label for="fontSize">Schriftgröße</label>
      <input
        id="fontSize"
        type="range"
        min="12"
        max="24"
        v-model.number="settings.fontSize"
      />
      <span>{{ settings.fontSize }}px</span>
    </div>
    
    <div class="form-group">
      <label>
        <input type="checkbox" v-model="settings.notifications" />
        Benachrichtigungen aktivieren
      </label>
    </div>
    
    <button @click="resetSettings">Standardeinstellungen wiederherstellen</button>
  </div>
</template>

<script setup>
import { useLocalStorage } from '@/composables';

const defaultSettings = {
  theme: 'system',
  fontSize: 16,
  notifications: true
};

const { value: settings, reset: resetSettings } = useLocalStorage(
  'user-settings',
  defaultSettings,
  {
    onError: (error) => {
      console.error('Fehler beim Zugriff auf localStorage:', error);
    }
  }
);

// Die Einstellungen sind reaktiv und werden automatisch im localStorage gespeichert
</script>
```

### Beispiel: Komplexeres Beispiel mit benutzerdefinierten Serialisierern

```vue
<template>
  <div>
    <h2>Dokument-Editor</h2>
    <textarea
      v-model="document.content"
      class="editor"
      rows="20"
    ></textarea>
    
    <div class="metadata">
      <div>Letzte Änderung: {{ formatDate(document.lastModified) }}</div>
      <div>Wortanzahl: {{ wordCount }}</div>
    </div>
    
    <div class="actions">
      <button @click="saveDocument">Speichern</button>
      <button @click="clearDocument">Neues Dokument</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useLocalStorage } from '@/composables';

// Benutzerdefinierte Serialisierer für spezielle Datumsbehandlung
const serializer = (doc) => {
  return JSON.stringify({
    ...doc,
    lastModified: doc.lastModified.toISOString()
  });
};

const deserializer = (value) => {
  const parsed = JSON.parse(value);
  return {
    ...parsed,
    lastModified: new Date(parsed.lastModified)
  };
};

// Initialen Dokumentzustand definieren
const initialDocument = {
  id: crypto.randomUUID(),
  content: '',
  lastModified: new Date(),
  version: 1
};

// useLocalStorage mit benutzerdefinierten Serialisierern verwenden
const { value: document, reset: clearDocument } = useLocalStorage(
  'current-document',
  initialDocument,
  { serializer, deserializer }
);

// Wortanzahl berechnen
const wordCount = computed(() => {
  return document.value.content.trim().split(/\s+/).filter(Boolean).length;
});

// Dokument speichern
const saveDocument = () => {
  document.value = {
    ...document.value,
    lastModified: new Date(),
    version: document.value.version + 1
  };
};

// Datum formatieren
const formatDate = (date) => {
  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};
</script>
```

---

## useClipboard

### Zweck

Das `useClipboard` Composable bietet eine einfache Schnittstelle für den Zugriff auf die Zwischenablage des Benutzers, um Text zu kopieren und einzufügen. Es enthält Funktionen, um den Kopierstatus zu verfolgen und die Benutzeroberfläche entsprechend zu aktualisieren.

### API

```typescript
function useClipboard(options?: {
  copiedDuration?: number;
  legacy?: boolean;
}): {
  copy: (text: string) => Promise<boolean>;
  paste: () => Promise<string>;
  isCopied: Ref<boolean>;
  copiedText: Ref<string | null>;
  error: Ref<Error | null>;
  isSupported: Ref<boolean>;
}
```

#### Parameter

- `options`: Konfigurationsoptionen
  - `copiedDuration`: Dauer in Millisekunden, für die der isCopied-Status nach dem Kopieren auf true gesetzt wird (Standard: 1500)
  - `legacy`: Ob ein Legacy-Fallback für ältere Browser verwendet werden soll (Standard: false)

#### Rückgabewerte

- `copy`: Funktion zum Kopieren von Text in die Zwischenablage
- `paste`: Funktion zum Einfügen von Text aus der Zwischenablage
- `isCopied`: Reaktiver Boolean, der anzeigt, ob Text gerade kopiert wurde
- `copiedText`: Der zuletzt kopierte Text
- `error`: Fehler, der beim Zugriff auf die Zwischenablage aufgetreten ist
- `isSupported`: Gibt an, ob die Zwischenablage-API im aktuellen Browser unterstützt wird

### Beispiel: Einfaches Kopieren eines Texts

```vue
<template>
  <div>
    <div class="code-block">
      <pre><code>{{ codeSnippet }}</code></pre>
      <button @click="copyCode" :class="{ 'copied': isCopied }">
        {{ isCopied ? 'Kopiert!' : 'Code kopieren' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useClipboard } from '@/composables';

const codeSnippet = `function helloWorld() {
  console.log('Hallo Welt!');
}

helloWorld();`;

const { copy, isCopied } = useClipboard();

const copyCode = async () => {
  await copy(codeSnippet);
};
</script>
```

### Beispiel: Kopieren mit Feedback und Fallback

```vue
<template>
  <div class="share-component">
    <h3>Teilen Sie diesen Link</h3>
    
    <div class="share-link">
      <input type="text" readonly :value="shareUrl" ref="linkInput" />
      <button 
        @click="copyLink" 
        :disabled="!isSupported"
        :class="{ 'success': isCopied, 'error': error }"
      >
        <span v-if="error">Fehler!</span>
        <span v-else-if="isCopied">Kopiert!</span>
        <span v-else>Kopieren</span>
      </button>
    </div>
    
    <div v-if="!isSupported" class="fallback-message">
      Ihr Browser unterstützt das automatische Kopieren nicht. 
      Bitte markieren Sie den Link und drücken Sie Strg+C / Cmd+C.
    </div>
    
    <div v-if="error" class="error-message">
      {{ error.message }}
    </div>
    
    <div class="paste-area" v-if="showPasteDemo">
      <h4>Einfügen-Demo</h4>
      <button @click="pasteFromClipboard">Aus Zwischenablage einfügen</button>
      <div v-if="pastedText">
        Eingefügter Text: <strong>{{ pastedText }}</strong>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useClipboard } from '@/composables';

const shareUrl = 'https://example.com/share/abc123';
const linkInput = ref(null);
const pastedText = ref('');
const showPasteDemo = ref(false);

const { copy, paste, isCopied, error, isSupported } = useClipboard({
  copiedDuration: 2000,
  legacy: true // Fallback für ältere Browser aktivieren
});

const copyLink = async () => {
  try {
    const success = await copy(shareUrl);
    
    if (success) {
      // Visuelles Feedback für Benutzer
      if (linkInput.value) {
        linkInput.value.select();
      }
    }
  } catch (err) {
    console.error('Fehler beim Kopieren:', err);
  }
};

const pasteFromClipboard = async () => {
  try {
    pastedText.value = await paste();
  } catch (err) {
    console.error('Fehler beim Einfügen:', err);
    pastedText.value = 'Zugriff auf die Zwischenablage nicht möglich';
  }
};
</script>
```

---

## Integration mit anderen Komponenten

Die Composables sind so konzipiert, dass sie nahtlos mit anderen Komponenten des nscale-assist Systems zusammenarbeiten. Hier sind einige Beispiele, wie sie in bestehende Komponenten integriert werden können.

### Integration mit dem Document Converter

Der Document Converter kann diese Composables wie folgt integrieren:

```vue
<!-- In DocumentConverterIntegration.vue -->
<script setup>
import { ref, onMounted } from 'vue';
import { useApiCache, useOfflineDetection, useLocalStorage } from '@/composables';
import { useDocumentConverter } from '@/composables/useDocumentConverter';

// Cache für Konvertierungsergebnisse
const { getCached, cache, isCached } = useApiCache({
  namespace: 'document-converter',
  ttl: 24 * 60 * 60 * 1000 // 24 Stunden
});

// Offline-Erkennung
const { isOffline } = useOfflineDetection();

// Lokales Speichern von ungesendeten Konvertierungsaufträgen
const { value: pendingUploads, reset: clearPendingUploads } = useLocalStorage(
  'pending-conversions',
  [],
  {
    onError: (error) => {
      console.error('Fehler beim Speichern der ausstehenden Konvertierungen:', error);
    }
  }
);

// Document Converter Logik
const { 
  convertDocument, 
  conversionStatus, 
  documentList, 
  isConverting 
} = useDocumentConverter();

// Funktion zum Hinzufügen eines Dokuments zur Warteschlange
const addToQueue = (file) => {
  if (isOffline.value) {
    // Wenn offline, speichere zur späteren Verarbeitung
    pendingUploads.value.push({
      id: crypto.randomUUID(),
      file: file,
      timestamp: new Date()
    });
    return;
  }
  
  // Wenn online, direkt verarbeiten
  convertDocument(file);
};

// Prüfe auf ausstehende Uploads, wenn wieder online
watch(isOffline, (newValue, oldValue) => {
  if (oldValue === true && newValue === false && pendingUploads.value.length > 0) {
    // Wenn wieder online und ausstehende Uploads vorhanden
    console.log('Online-Verbindung wiederhergestellt. Verarbeite ausstehende Konvertierungen.');
    
    // Verarbeite Uploads nacheinander
    const processQueue = async () => {
      const currentPending = [...pendingUploads.value];
      clearPendingUploads(); // Liste zurücksetzen
      
      for (const item of currentPending) {
        try {
          await convertDocument(item.file);
        } catch (error) {
          console.error(`Fehler bei Konvertierung von ${item.file.name}:`, error);
        }
      }
    };
    
    processQueue();
  }
});

// Lade zuvor konvertierte Dokumente aus dem Cache
onMounted(() => {
  if (isCached('recent-documents')) {
    const cachedDocs = getCached('recent-documents');
    // Setze die Liste der Dokumente, wenn Cache vorhanden
    documentList.value = cachedDocs;
  }
});

// Speichere die Liste der Dokumente im Cache, wenn sie sich ändert
watch(documentList, (newDocuments) => {
  if (newDocuments.length > 0) {
    cache('recent-documents', newDocuments);
  }
}, { deep: true });
</script>
```

### Integration mit der Chat-Komponente

Die Chat-Komponente kann besonders von der Offline-Erkennung und dem lokalen Speicher profitieren:

```vue
<!-- In EnhancedChatContainer.vue -->
<script setup>
import { useChat } from '@/composables/useChat';
import { useOfflineDetection, useLocalStorage, useForm } from '@/composables';
import { ref, computed } from 'vue';

// Chat-Logik
const { messages, sendMessage, isLoading } = useChat();

// Offline-Erkennung
const { isOffline, isOnline } = useOfflineDetection({
  onOffline: () => {
    console.log('Offline-Modus aktiviert. Nachrichten werden lokal gespeichert.');
  },
  onOnline: () => {
    console.log('Online-Modus wiederhergestellt. Sende gespeicherte Nachrichten.');
    sendPendingMessages();
  }
});

// Lokales Speichern von ungesendeten Nachrichten
const { value: pendingMessages, reset: clearPendingMessages } = useLocalStorage(
  'pending-chat-messages',
  []
);

// Formularsteuerung für die Chat-Eingabe
const { 
  values, 
  resetForm, 
  handleSubmit,
  isValid
} = useForm({
  initialValues: {
    message: ''
  },
  onSubmit: (values) => {
    const messageText = values.message.trim();
    
    if (!messageText) return;
    
    if (isOffline.value) {
      // Speichere Nachricht lokal, wenn offline
      pendingMessages.value.push({
        id: crypto.randomUUID(),
        text: messageText,
        timestamp: new Date(),
        isPending: true
      });
      
      // Füge zur UI-Nachrichtenliste hinzu, markiere als "ausstehend"
      messages.value.push({
        id: crypto.randomUUID(),
        text: messageText,
        sender: 'user',
        timestamp: new Date(),
        isPending: true
      });
    } else {
      // Sende sofort, wenn online
      sendMessage(messageText);
    }
    
    // Formular zurücksetzen
    resetForm();
  }
});

// Sende alle ausstehenden Nachrichten, wenn wieder online
const sendPendingMessages = async () => {
  if (!isOnline.value || pendingMessages.value.length === 0) return;
  
  const messagesToSend = [...pendingMessages.value];
  clearPendingMessages();
  
  for (const pendingMsg of messagesToSend) {
    try {
      await sendMessage(pendingMsg.text);
      
      // Entferne die "ausstehend" Version aus der UI
      const pendingIndex = messages.value.findIndex(
        msg => msg.isPending && msg.text === pendingMsg.text
      );
      
      if (pendingIndex !== -1) {
        messages.value.splice(pendingIndex, 1);
      }
    } catch (error) {
      console.error('Fehler beim Senden der Nachricht:', error);
    }
  }
};

// Speichere Chat-Verlauf lokal
watch(messages, (newMessages) => {
  if (newMessages.length > 0) {
    localStorage.setItem('chat-history', JSON.stringify(
      newMessages.filter(msg => !msg.isPending)
    ));
  }
}, { deep: true });
</script>
```

### Integration mit Admin-Komponenten

Die Admin-Komponenten können die Formular- und API-Cache-Funktionen nutzen:

```vue
<!-- In AdminSystemSettings.vue -->
<script setup>
import { useForm, useApiCache } from '@/composables';
import { ref, onMounted } from 'vue';
import { useAdminStore } from '@/stores/admin/settings';
import * as yup from 'yup';

const adminStore = useAdminStore();
const isSaving = ref(false);
const saveSuccess = ref(false);

// Validierungsschema
const validationSchema = yup.object({
  maxFileSize: yup.number().min(1, 'Mindestgröße: 1MB').required('Maximale Dateigröße ist erforderlich'),
  allowedFileTypes: yup.array().min(1, 'Mindestens ein Dateityp ist erforderlich'),
  maxSessionDuration: yup.number().min(10, 'Mindestdauer: 10 Minuten').required('Maximale Sitzungsdauer ist erforderlich')
});

// API-Cache für Systemeinstellungen
const { getCached, cache, invalidate } = useApiCache({
  namespace: 'admin-settings',
  ttl: 5 * 60 * 1000 // 5 Minuten
});

// Formular initialisieren
const {
  values,
  errors,
  touched,
  isSubmitting,
  isValid,
  resetForm,
  handleSubmit,
  setFieldValue
} = useForm({
  initialValues: {
    maxFileSize: 10,
    allowedFileTypes: ['.pdf', '.docx', '.xlsx', '.pptx'],
    maxSessionDuration: 60,
    debugMode: false,
    enableTelemetry: true
  },
  validationSchema,
  onSubmit: async (formValues) => {
    isSaving.value = true;
    saveSuccess.value = false;
    
    try {
      // Einstellungen speichern
      await adminStore.saveSystemSettings(formValues);
      
      // Cache aktualisieren
      invalidate('system-settings');
      cache('system-settings', formValues);
      
      saveSuccess.value = true;
      setTimeout(() => {
        saveSuccess.value = false;
      }, 3000);
    } catch (error) {
      console.error('Fehler beim Speichern der Einstellungen:', error);
    } finally {
      isSaving.value = false;
    }
  }
});

// Lade Einstellungen
const loadSettings = async () => {
  try {
    let settings;
    
    // Versuche, Einstellungen aus dem Cache zu laden
    if (getCached('system-settings')) {
      settings = getCached('system-settings');
    } else {
      // Wenn nicht im Cache, lade von der API
      settings = await adminStore.fetchSystemSettings();
      // Speichere im Cache für zukünftige Verwendung
      cache('system-settings', settings);
    }
    
    // Aktualisiere Formularwerte
    Object.keys(settings).forEach(key => {
      setFieldValue(key, settings[key]);
    });
  } catch (error) {
    console.error('Fehler beim Laden der Einstellungen:', error);
  }
};

// Lade Einstellungen beim Komponenten-Mount
onMounted(loadSettings);
</script>
```

---

Mit diesen Composables können Entwickler konsistente und wiederverwendbare Logik für gängige Anwendungsfälle implementieren, wodurch die Codequalität verbessert und die Entwicklungszeit verkürzt wird. Die Composables sind modular aufgebaut und können je nach Bedarf einzeln oder in Kombination verwendet werden.