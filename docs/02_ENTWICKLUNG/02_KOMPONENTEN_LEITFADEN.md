# Vue 3 Komponenten-Leitfaden für nscale DMS Assistent

Dieser Leitfaden beschreibt die Best Practices, Muster und Konventionen für die Erstellung von Vue 3 Single-File Components (SFCs) im nscale DMS Assistenten.

**Letzte Aktualisierung:** 07.05.2025

> **Verwandte Dokumente:**
> - [STATE_MANAGEMENT.md](STATE_MANAGEMENT.md) - Verwendung von Pinia-Stores in Komponenten
> - [API_INTEGRATION.md](API_INTEGRATION.md) - Integration der API-Services in Komponenten
> - [SETUP.md](SETUP.md) - Entwicklungsumgebung für die Vue 3 Komponenten einrichten

## Inhaltsverzeichnis

1. [Komponenten-Grundstruktur](#komponenten-grundstruktur)
2. [Komponenten-Typen](#komponenten-typen)
3. [Komponenten-Organisation](#komponenten-organisation)
4. [Props und Events](#props-und-events)
5. [Komponenten-Komposition](#komponenten-komposition)
6. [Styling-Richtlinien](#styling-richtlinien)
7. [Fehlerbehandlung](#fehlerbehandlung)
8. [Leistungsoptimierungen](#leistungsoptimierungen)
9. [Barrierefreiheit](#barrierefreiheit)
10. [Testing](#testing)

## Komponenten-Grundstruktur

Alle Vue 3-Komponenten sollten als Single-File Components (SFCs) mit der Composition API und dem `<script setup>` Syntax implementiert werden.

### Beispiel für eine Basis-Komponente

```vue
<template>
  <div class="component-name">
    <h2 v-if="title">{{ title }}</h2>
    <div class="component-content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
// 1. Imports
import { ref, computed, onMounted } from 'vue';
import type { ComponentInstance } from '@/types/components';

// 2. Props
interface Props {
  title?: string;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
});

// 3. Emits
const emit = defineEmits<{
  (e: 'update', value: any): void;
  (e: 'close'): void;
}>();

// 4. Refs/Reaktiver Zustand
const isActive = ref(false);

// 5. Berechnete Eigenschaften
const classes = computed(() => ({
  'is-active': isActive.value,
  'is-disabled': props.disabled
}));

// 6. Methoden
const toggle = () => {
  if (props.disabled) return;
  
  isActive.value = !isActive.value;
  emit('update', isActive.value);
};

// 7. Lifecycle Hooks
onMounted(() => {
  // Initialisierungslogik
  console.log('Komponente wurde montiert');
});

// 8. Öffentliche API (exposed to parent components)
defineExpose({
  toggle,
  isActive
});
</script>

<style scoped>
/* Komponenten-spezifische Styles */
.component-name {
  display: flex;
  flex-direction: column;
  padding: var(--spacing-md);
  background-color: var(--background-color);
  border-radius: var(--border-radius);
}

.component-content {
  margin-top: var(--spacing-sm);
}

/* Zustands-Styles */
.is-active {
  border: 1px solid var(--primary-color);
}

.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
```

## Komponenten-Typen

Wir unterscheiden zwischen verschiedenen Komponenten-Typen mit jeweils spezifischen Verantwortlichkeiten:

### 1. UI-Basiskomponenten

UI-Basiskomponenten sind kleine, wiederverwendbare Komponenten, die keine Geschäftslogik enthalten.

Beispiele: `Button.vue`, `Input.vue`, `Card.vue`, `Badge.vue`.

```vue
<!-- Button.vue -->
<template>
  <button 
    :class="['n-button', variant, size, { 'is-loading': loading }]"
    :disabled="disabled || loading"
    :type="type"
    @click="handleClick"
  >
    <span v-if="loading" class="n-button__loader"></span>
    <span class="n-button__content" :class="{ 'is-hidden': loading }">
      <slot></slot>
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'medium',
  disabled: false,
  loading: false,
  type: 'button'
});

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void;
}>();

const handleClick = (event: MouseEvent) => {
  if (props.disabled || props.loading) return;
  emit('click', event);
};
</script>

<style scoped>
/* Button-Styles hier... */
</style>
```

### 2. Container-Komponenten

Container-Komponenten verwalten Zustand und Logik, delegieren aber die Darstellung an Präsentationskomponenten.

```vue
<!-- UserManager.vue (Container) -->
<template>
  <div>
    <UserList 
      :users="users" 
      :loading="isLoading" 
      :error="error"
      @select="selectUser" 
      @delete="deleteUser" 
    />
    <UserForm 
      v-if="selectedUser" 
      :user="selectedUser" 
      @save="saveUser" 
      @cancel="selectedUser = null" 
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useUsersStore } from '@/stores/users';
import UserList from './UserList.vue';
import UserForm from './UserForm.vue';
import type { User } from '@/types/users';

// Zustand
const usersStore = useUsersStore();
const users = computed(() => usersStore.users);
const isLoading = ref(false);
const error = ref<string | null>(null);
const selectedUser = ref<User | null>(null);

// Methoden
const fetchUsers = async () => {
  isLoading.value = true;
  error.value = null;
  
  try {
    await usersStore.fetchUsers();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    isLoading.value = false;
  }
};

const selectUser = (user: User) => {
  selectedUser.value = { ...user };
};

const saveUser = async (user: User) => {
  try {
    await usersStore.updateUser(user);
    selectedUser.value = null;
  } catch (err) {
    error.value = (err as Error).message;
  }
};

const deleteUser = async (userId: string) => {
  try {
    await usersStore.deleteUser(userId);
  } catch (err) {
    error.value = (err as Error).message;
  }
};

// Initialisierung
onMounted(fetchUsers);
</script>
```

### 3. Präsentationskomponenten

Präsentationskomponenten fokussieren sich auf die Darstellung und sind idealerweise zustandslos.

```vue
<!-- UserList.vue (Presentation) -->
<template>
  <div class="user-list">
    <div v-if="loading" class="user-list__loading">
      <Spinner />
    </div>
    
    <div v-else-if="error" class="user-list__error">
      <Alert variant="error" :message="error" />
    </div>
    
    <div v-else-if="users.length === 0" class="user-list__empty">
      Keine Benutzer gefunden.
    </div>
    
    <ul v-else class="user-list__items">
      <li 
        v-for="user in users" 
        :key="user.id" 
        class="user-list__item"
      >
        <span>{{ user.name }}</span>
        <div class="user-list__actions">
          <Button variant="secondary" @click="$emit('select', user)">
            Bearbeiten
          </Button>
          <Button variant="danger" @click="$emit('delete', user.id)">
            Löschen
          </Button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { Spinner, Alert, Button } from '@/components/ui';
import type { User } from '@/types/users';

defineProps<{
  users: User[];
  loading: boolean;
  error: string | null;
}>();

defineEmits<{
  (e: 'select', user: User): void;
  (e: 'delete', userId: string): void;
}>();
</script>
```

### 4. Layout-Komponenten

Layout-Komponenten definieren die Struktur und das Layout der Anwendung.

```vue
<!-- MainLayout.vue -->
<template>
  <div class="layout">
    <header class="layout__header">
      <Navbar />
    </header>
    
    <div class="layout__container">
      <aside v-if="showSidebar" class="layout__sidebar">
        <Sidebar />
      </aside>
      
      <main class="layout__content">
        <slot></slot>
      </main>
    </div>
    
    <footer class="layout__footer">
      <Footer />
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useUIStore } from '@/stores/ui';
import Navbar from './Navbar.vue';
import Sidebar from './Sidebar.vue';
import Footer from './Footer.vue';

const uiStore = useUIStore();
const showSidebar = computed(() => uiStore.sidebarVisible);
</script>
```

## Komponenten-Organisation

Die Komponenten sind nach Funktionalität und Verantwortlichkeit in Verzeichnissen organisiert:

```
src/
├── components/
│   ├── ui/            # Wiederverwendbare UI-Komponenten
│   │   ├── Button.vue
│   │   ├── Input.vue
│   │   ├── Card.vue
│   │   └── index.ts   # Re-Exporte für einfache Imports
│   ├── chat/          # Chat-bezogene Komponenten
│   │   ├── ChatView.vue
│   │   ├── MessageList.vue
│   │   ├── MessageInput.vue
│   │   └── index.ts
│   ├── admin/         # Admin-bezogene Komponenten
│   │   ├── UserManagement.vue
│   │   ├── SystemMonitor.vue
│   │   └── index.ts
│   └── layout/        # Layout-Komponenten
│       ├── MainLayout.vue
│       ├── Sidebar.vue
│       └── index.ts
└── views/             # Seiten-Komponenten (für Routing)
    ├── HomeView.vue
    ├── ChatView.vue
    ├── AdminView.vue
    └── NotFoundView.vue
```

### Komponenten-Export

Verwenden Sie Barrel-Exports für einfachere Imports:

```typescript
// src/components/ui/index.ts
export { default as Button } from './Button.vue';
export { default as Card } from './Card.vue';
export { default as Input } from './Input.vue';
// ... weitere Komponenten
```

Dadurch können Sie mehrere Komponenten in einer Zeile importieren:

```typescript
import { Button, Card, Input } from '@/components/ui';
```

## Props und Events

### Prop-Definitionen mit TypeScript

Verwenden Sie TypeScript-Interfaces für Prop-Definitionen:

```typescript
// Props definieren
interface Props {
  title: string;                                  // Erforderlich
  items?: Array<string>;                          // Optional
  type?: 'default' | 'primary' | 'danger';        // Union Type
  user?: User;                                    // Benutzerdefinierter Typ
  onChange?: (value: string) => void;             // Funktionstyp
}

// Mit Standardwerten
const props = withDefaults(defineProps<Props>(), {
  type: 'default',
  items: () => []
});

// Alternative mit Laufzeit-Props (weniger empfohlen)
const props = defineProps({
  title: {
    type: String,
    required: true
  },
  items: {
    type: Array as PropType<string[]>,
    default: () => []
  }
});
```

### Emit-Definitionen mit TypeScript

Definieren Sie emittierte Events mit TypeScript:

```typescript
// TypeScript-Emit-Definition
const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;  // v-model
  (e: 'change', value: string): void;             // Änderungsereignis
  (e: 'focus'): void;                             // Ereignis ohne Daten
  (e: 'upload', files: File[], meta: UploadMeta): void; // Mehrere Parameter
}>();

// Verwendung
const handleInput = (e: Event) => {
  const value = (e.target as HTMLInputElement).value;
  emit('update:modelValue', value);
};
```

### v-model Implementierung

Implementieren Sie v-model in benutzerdefinierten Komponenten:

```vue
<!-- CustomInput.vue -->
<template>
  <input 
    :value="modelValue"
    @input="handleInput"
    class="custom-input"
  />
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const handleInput = (e: Event) => {
  const value = (e.target as HTMLInputElement).value;
  emit('update:modelValue', value);
};
</script>
```

Verwendung:

```vue
<CustomInput v-model="username" />
```

### Testen der Props und Events

Stellen Sie sicher, dass Props validiert werden und Events korrekt emittiert werden:

```vue
<!-- TextField.vue -->
<template>
  <div class="text-field">
    <label v-if="label" :for="id" class="text-field__label">
      {{ label }}
      <span v-if="required" class="text-field__required">*</span>
    </label>
    
    <input
      :id="id"
      :value="modelValue"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :class="['text-field__input', { 'has-error': !!error }]"
      @input="onInput"
      @blur="onBlur"
    />
    
    <div v-if="error" class="text-field__error">
      {{ error }}
    </div>
    
    <div v-if="helpText" class="text-field__help">
      {{ helpText }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  modelValue: string;
  label?: string;
  type?: 'text' | 'password' | 'email' | 'number';
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  helpText?: string;
  id?: string;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  disabled: false,
  required: false
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'blur', value: string): void;
}>();

// Generiere eine ID, falls keine angegeben wurde
const id = computed(() => props.id || `text-field-${Math.random().toString(36).substring(2, 9)}`);

const onInput = (e: Event) => {
  const value = (e.target as HTMLInputElement).value;
  emit('update:modelValue', value);
};

const onBlur = (e: Event) => {
  const value = (e.target as HTMLInputElement).value;
  emit('blur', value);
};
</script>

<style scoped>
/* Styles hier... */
</style>
```

## Komponenten-Komposition

### Slots verwenden

Verwenden Sie benannte Slots für flexible Komponentenkomposition:

```vue
<!-- Card.vue -->
<template>
  <div class="card">
    <div v-if="$slots.header" class="card__header">
      <slot name="header"></slot>
    </div>
    
    <div class="card__body">
      <slot></slot>
    </div>
    
    <div v-if="$slots.footer" class="card__footer">
      <slot name="footer"></slot>
    </div>
  </div>
</template>
```

Verwendung:

```vue
<Card>
  <template #header>
    <h2>Karten-Titel</h2>
  </template>
  
  <p>Karten-Inhalt hier...</p>
  
  <template #footer>
    <Button>Aktion</Button>
  </template>
</Card>
```

### Composables für Logik-Wiederverwendung

Extrahieren Sie wiederverwendbare Logik in Composables:

```typescript
// useFormValidation.ts
import { ref, computed } from 'vue';

export function useFormValidation(initialValues = {}) {
  const values = ref({ ...initialValues });
  const errors = ref({});
  const touched = ref({});
  
  const isValid = computed(() => Object.keys(errors.value).length === 0);
  
  // Validator-Funktion für ein Feld
  const validate = (field, value, rules) => {
    // Implementierung hier...
  };
  
  // Feld-Änderung
  const handleChange = (field, value) => {
    values.value[field] = value;
    if (touched.value[field]) {
      validate(field, value);
    }
  };
  
  // Feld-Blur
  const handleBlur = (field) => {
    touched.value[field] = true;
    validate(field, values.value[field]);
  };
  
  // Formular absenden
  const handleSubmit = (onSubmit) => {
    // Implementierung hier...
  };
  
  return {
    values,
    errors,
    touched,
    isValid,
    handleChange,
    handleBlur,
    handleSubmit
  };
}
```

Verwendung in einer Komponente:

```vue
<script setup>
import { useFormValidation } from '@/composables/useFormValidation';

const initialValues = {
  username: '',
  email: '',
  password: ''
};

const {
  values,
  errors,
  touched,
  isValid,
  handleChange,
  handleBlur,
  handleSubmit
} = useFormValidation(initialValues);

const onSubmit = async () => {
  // Implementierung hier...
};
</script>
```

### Async Components für Code-Splitting

Verwenden Sie async components für verzögertes Laden:

```vue
<script setup>
import { defineAsyncComponent } from 'vue';

// Lazy-Loading von Komponenten
const HeavyChart = defineAsyncComponent(() => 
  import('@/components/charts/HeavyChart.vue')
);
</script>

<template>
  <div>
    <HeavyChart v-if="showChart" :data="chartData" />
    <button @click="showChart = !showChart">
      {{ showChart ? 'Verbergen' : 'Chart anzeigen' }}
    </button>
  </div>
</template>
```

## Styling-Richtlinien

### CSS-Variablen für Theming

Verwenden Sie CSS-Variablen für konsistentes Theming:

```vue
<style>
:root {
  /* Farben */
  --primary-color: #2c3e50;
  --secondary-color: #42b983;
  --error-color: #e74c3c;
  --success-color: #27ae60;
  --warning-color: #f39c12;
  --info-color: #3498db;
  
  /* Typografie */
  --font-family: 'Inter', sans-serif;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-md: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  
  /* Abstände */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  
  /* Transitions */
  --transition-fast: 150ms ease-in-out;
  --transition-normal: 250ms ease-in-out;
  --transition-slow: 350ms ease-in-out;
}

.dark-theme {
  --primary-color: #42b983;
  --background-color: #1a1a1a;
  --text-color: #f5f5f5;
  /* Weitere Dark-Theme-Variablen */
}
</style>
```

### BEM-Namenskonvention

Verwenden Sie BEM (Block, Element, Modifier) für CSS-Klassen:

```vue
<template>
  <div class="user-card">
    <div class="user-card__header">
      <img class="user-card__avatar" :src="user.avatar" :alt="user.name">
      <h3 class="user-card__name">{{ user.name }}</h3>
    </div>
    <div class="user-card__body">
      <p class="user-card__bio">{{ user.bio }}</p>
    </div>
    <div class="user-card__footer">
      <button 
        class="user-card__button" 
        :class="{ 'user-card__button--primary': isPrimary }"
        @click="onClick"
      >
        {{ buttonText }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.user-card {
  /* Block */
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
}

.user-card__header {
  /* Element */
  display: flex;
  align-items: center;
  padding: var(--spacing-md);
}

.user-card__avatar {
  /* Element */
  width: 50px;
  height: 50px;
  border-radius: 50%;
}

.user-card__button {
  /* Element */
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--border-color);
}

.user-card__button--primary {
  /* Modifier */
  background-color: var(--primary-color);
  color: white;
}
</style>
```

### Scoped Style mit :deep

Verwenden Sie `:deep()` für spezielles Styling von Kinderkomponenten:

```vue
<style scoped>
/* Lokales Styling für diese Komponente */
.message-list {
  padding: var(--spacing-md);
}

/* Styling für Kinderkomponenten mit :deep() */
.message-list :deep(.message-item) {
  margin-bottom: var(--spacing-sm);
}

.message-list :deep(.message-item:last-child) {
  margin-bottom: 0;
}
</style>
```

## Fehlerbehandlung

### Suspense und Error Boundaries

Verwenden Sie Suspense und onErrorCaptured für Fehlerbehandlung:

```vue
<template>
  <Suspense>
    <!-- Hauptinhalt -->
    <template #default>
      <div v-if="!error">
        <UserProfile />
      </div>
      <ErrorDisplay 
        v-else 
        :error="error" 
        @retry="retry" 
      />
    </template>
    
    <!-- Ladezustand -->
    <template #fallback>
      <LoadingSpinner />
    </template>
  </Suspense>
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue';
import UserProfile from '@/components/UserProfile.vue';
import ErrorDisplay from '@/components/ErrorDisplay.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';

const error = ref<Error | null>(null);

// Fehlertratung
onErrorCaptured((err: Error) => {
  error.value = err;
  // false zurückgeben verhindert Weitergabe des Fehlers
  return false;
});

// Neuversuch bei Fehlern
const retry = () => {
  error.value = null;
};
</script>
```

### Benutzerdefinierte Fehlerkomponente

```vue
<!-- ErrorDisplay.vue -->
<template>
  <div class="error-display">
    <div class="error-display__icon">
      <ExclamationIcon />
    </div>
    
    <div class="error-display__content">
      <h3 class="error-display__title">{{ title }}</h3>
      <p class="error-display__message">{{ message }}</p>
      
      <div v-if="showDetails" class="error-display__details">
        <pre>{{ JSON.stringify(error, null, 2) }}</pre>
      </div>
      
      <div class="error-display__actions">
        <Button @click="$emit('retry')" variant="primary">
          {{ retryText }}
        </Button>
        
        <Button 
          v-if="error.stack" 
          @click="showDetails = !showDetails" 
          variant="secondary"
        >
          {{ showDetails ? 'Details ausblenden' : 'Details anzeigen' }}
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { ExclamationIcon } from '@/components/icons';
import { Button } from '@/components/ui';

interface Props {
  error: Error;
  title?: string;
  retryText?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Ein Fehler ist aufgetreten',
  retryText: 'Erneut versuchen'
});

defineEmits<{
  (e: 'retry'): void;
}>();

const showDetails = ref(false);

const message = computed(() => {
  if (!props.error) return 'Unbekannter Fehler';
  
  // ApiError mit spezifischem Code behandeln
  if ('code' in props.error && props.error.code) {
    switch (props.error.code) {
      case 'ERR_NETWORK':
        return 'Verbindungsproblem. Bitte überprüfen Sie Ihre Internetverbindung.';
      case 'ERR_UNAUTHORIZED':
        return 'Sie sind nicht berechtigt, diese Aktion durchzuführen.';
      default:
        return props.error.message || 'Ein unerwarteter Fehler ist aufgetreten.';
    }
  }
  
  return props.error.message || 'Ein unerwarteter Fehler ist aufgetreten.';
});
</script>
```

## Leistungsoptimierungen

### Memoization mit computed

Verwenden Sie computed für teure Berechnungen:

```vue
<script setup>
import { computed } from 'vue';

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  filterText: {
    type: String,
    default: ''
  }
});

// Verwenden von computed für teure Filterung
const filteredItems = computed(() => {
  if (!props.filterText) return props.items;
  
  const lowerFilter = props.filterText.toLowerCase();
  return props.items.filter(item => 
    item.name.toLowerCase().includes(lowerFilter)
  );
});
</script>
```

### Virtualisierte Listen für große Datensätze

Verwenden Sie Virtual Scrolling für große Listen:

```vue
<template>
  <RecycleScroller
    class="scroller"
    :items="messages"
    :item-size="64"
    key-field="id"
  >
    <template #default="{ item }">
      <MessageItem :message="item" />
    </template>
  </RecycleScroller>
</template>

<script setup>
import { RecycleScroller } from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import MessageItem from './MessageItem.vue';

defineProps({
  messages: Array
});
</script>
```

### Dynamic Imports mit defineAsyncComponent

Verwenden Sie asynchrones Laden für schwere Komponenten:

```vue
<script setup>
import { defineAsyncComponent, ref } from 'vue';

const showChart = ref(false);

// Lazy-load der Chart-Komponente
const Chart = defineAsyncComponent({
  loader: () => import('@/components/Chart.vue'),
  loadingComponent: () => import('@/components/ChartSkeleton.vue'),
  delay: 200,
  timeout: 3000
});
</script>

<template>
  <div>
    <button @click="showChart = !showChart">
      {{ showChart ? 'Verbergen' : 'Anzeigen' }}
    </button>
    
    <Chart v-if="showChart" :data="chartData" />
  </div>
</template>
```

## Barrierefreiheit

### Fokus-Management

Implementieren Sie korrektes Fokus-Management:

```vue
<template>
  <div>
    <button @click="openModal">Modal öffnen</button>
    
    <div
      v-if="isOpen"
      role="dialog"
      aria-labelledby="modal-title"
      class="modal"
    >
      <div class="modal__content" ref="modalContent">
        <h2 id="modal-title" class="modal__title">{{ title }}</h2>
        <div class="modal__body">
          <slot></slot>
        </div>
        <div class="modal__footer">
          <button 
            @click="cancel"
            class="modal__button modal__button--secondary"
          >
            Abbrechen
          </button>
          <button 
            @click="confirm"
            class="modal__button modal__button--primary"
            ref="confirmButton"
          >
            Bestätigen
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps({
  title: String,
  isOpen: Boolean
});

const emit = defineEmits(['close', 'confirm']);

const modalContent = ref(null);
const confirmButton = ref(null);
const prevFocus = ref(null);

const openModal = () => {
  emit('update:isOpen', true);
};

const closeModal = () => {
  emit('update:isOpen', false);
};

const confirm = () => {
  emit('confirm');
  closeModal();
};

const cancel = () => {
  emit('close');
  closeModal();
};

// Tastatur-Listener für ESC-Taste
const handleKeyDown = (e) => {
  if (e.key === 'Escape' && props.isOpen) {
    cancel();
  }
};

// Fokus-Management
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    // Modal geöffnet: Fokus speichern und auf Modal setzen
    prevFocus.value = document.activeElement;
    // Verzögerter Fokus, um sicherzustellen, dass das Modal gerendert ist
    nextTick(() => {
      confirmButton.value?.focus();
    });
  } else if (prevFocus.value) {
    // Modal geschlossen: Fokus zurücksetzen
    prevFocus.value.focus();
  }
});

// Event-Listener hinzufügen/entfernen
onMounted(() => {
  document.addEventListener('keydown', handleKeyDown);
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeyDown);
});
</script>
```

### ARIA-Attribute für bessere Zugänglichkeit

```vue
<template>
  <div class="dropdown" :class="{ 'is-open': isOpen }">
    <button
      class="dropdown__button"
      :aria-expanded="isOpen"
      aria-haspopup="true"
      @click="toggle"
      ref="triggerButton"
    >
      {{ buttonLabel }}
    </button>
    
    <ul
      v-if="isOpen"
      class="dropdown__menu"
      role="menu"
      :aria-labelledby="id"
      ref="menu"
    >
      <li 
        v-for="(item, index) in items"
        :key="item.value"
        role="menuitem"
        tabindex="-1"
        class="dropdown__item"
        @click="select(item)"
        @keydown.enter="select(item)"
        @keydown.space="select(item)"
        ref="menuItems"
      >
        {{ item.label }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';

const props = defineProps({
  items: Array,
  modelValue: [String, Number],
  buttonLabel: String,
  id: String
});

const emit = defineEmits(['update:modelValue', 'change']);

const isOpen = ref(false);
const triggerButton = ref(null);
const menu = ref(null);
const menuItems = ref([]);

// Methoden
const toggle = () => {
  isOpen.value = !isOpen.value;
};

const select = (item) => {
  emit('update:modelValue', item.value);
  emit('change', item.value);
  isOpen.value = false;
  triggerButton.value?.focus();
};

const handleKeyDown = (event) => {
  if (!isOpen.value) return;
  
  // Focus-Navigation
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    focusNextItem();
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    focusPrevItem();
  } else if (event.key === 'Escape') {
    event.preventDefault();
    isOpen.value = false;
    triggerButton.value?.focus();
  } else if (event.key === 'Tab') {
    // Dropdown bei Tab-Navigation schließen
    isOpen.value = false;
  }
};

// Index des aktuell fokussierten Elements
let currentFocusIndex = -1;

// Nächstes Element fokussieren
const focusNextItem = () => {
  if (menuItems.value.length === 0) return;
  
  currentFocusIndex = (currentFocusIndex + 1) % menuItems.value.length;
  menuItems.value[currentFocusIndex]?.focus();
};

// Vorheriges Element fokussieren
const focusPrevItem = () => {
  if (menuItems.value.length === 0) return;
  
  currentFocusIndex = (currentFocusIndex - 1 + menuItems.value.length) % menuItems.value.length;
  menuItems.value[currentFocusIndex]?.focus();
};

// Klick außerhalb der Komponente behandeln
const handleClickOutside = (event) => {
  if (
    isOpen.value &&
    triggerButton.value &&
    !triggerButton.value.contains(event.target) &&
    menu.value &&
    !menu.value.contains(event.target)
  ) {
    isOpen.value = false;
  }
};

// Event-Listener hinzufügen/entfernen
onMounted(() => {
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeyDown);
  document.removeEventListener('click', handleClickOutside);
});

// Fokus-Reset beim Öffnen des Dropdowns
watch(() => isOpen.value, (isOpen) => {
  if (isOpen) {
    currentFocusIndex = -1;
    nextTick(() => {
      if (menuItems.value.length > 0) {
        focusNextItem();
      }
    });
  }
});
</script>
```

## Testing

### Komponententests mit Vue Test Utils und Vitest

```typescript
// tests/components/Button.spec.ts
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Button from '@/components/ui/Button.vue';

describe('Button.vue', () => {
  it('renders with default props', () => {
    const wrapper = mount(Button);
    expect(wrapper.classes()).toContain('n-button');
    expect(wrapper.classes()).toContain('primary');
    expect(wrapper.classes()).toContain('medium');
  });
  
  it('renders the slot content', () => {
    const wrapper = mount(Button, {
      slots: {
        default: 'Click me'
      }
    });
    
    expect(wrapper.text()).toBe('Click me');
  });
  
  it('applies the correct variant class', () => {
    const wrapper = mount(Button, {
      props: {
        variant: 'danger'
      }
    });
    
    expect(wrapper.classes()).toContain('danger');
  });
  
  it('handles click events', async () => {
    const wrapper = mount(Button);
    
    await wrapper.trigger('click');
    
    expect(wrapper.emitted('click')).toBeTruthy();
    expect(wrapper.emitted('click')?.length).toBe(1);
  });
  
  it('does not emit click when disabled', async () => {
    const wrapper = mount(Button, {
      props: {
        disabled: true
      }
    });
    
    await wrapper.trigger('click');
    
    expect(wrapper.emitted('click')).toBeFalsy();
  });
  
  it('shows loading state correctly', () => {
    const wrapper = mount(Button, {
      props: {
        loading: true
      },
      slots: {
        default: 'Submit'
      }
    });
    
    expect(wrapper.find('.n-button__loader').exists()).toBe(true);
    expect(wrapper.find('.n-button__content').classes()).toContain('is-hidden');
  });
});
```

### Snapshot-Tests

```typescript
// tests/components/Card.spec.ts
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Card from '@/components/ui/Card.vue';

describe('Card.vue', () => {
  it('matches snapshot with default slots', () => {
    const wrapper = mount(Card, {
      slots: {
        default: '<div>Card content</div>'
      }
    });
    
    expect(wrapper.html()).toMatchSnapshot();
  });
  
  it('matches snapshot with all slots', () => {
    const wrapper = mount(Card, {
      slots: {
        header: '<h2>Card Header</h2>',
        default: '<div>Card content</div>',
        footer: '<button>Action</button>'
      }
    });
    
    expect(wrapper.html()).toMatchSnapshot();
  });
});
```

---

Zuletzt aktualisiert: 07.05.2025