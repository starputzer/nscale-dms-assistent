# Vue 3 Anwendungsstruktur für nscale DMS Assistent

Dieses Dokument beschreibt die vollständige Struktur der migrierten Vue 3 Anwendung für den nscale DMS Assistenten.

## Inhaltsverzeichnis

1. [Überblick](#überblick)
2. [Technologie-Stack](#technologie-stack)
3. [Projektstruktur](#projektstruktur)
4. [Core-Komponenten](#core-komponenten)
5. [Routing](#routing)
6. [State-Management](#state-management)
7. [API-Integration](#api-integration)
8. [Build-Prozess](#build-prozess)
9. [Tests](#tests)
10. [Migrationshinweise](#migrationshinweise)

## Überblick

Die Anwendung wurde von einer Vanilla JS / Vue 2 Mischstruktur zu einer modernen Vue 3 Single-File-Component (SFC) Architektur migriert. Die neue Architektur verwendet TypeScript, Vite als Build-Tool und Pinia für State-Management.

## Technologie-Stack

- **Framework**: Vue 3.3+ mit Composition API und `<script setup>`
- **Sprache**: TypeScript 5.2+
- **Build-Tool**: Vite 4.5+
- **State-Management**: Pinia 2.1+
- **HTTP-Client**: Axios 1.6+
- **Routing**: Vue Router 4.2+
- **CSS**: SCSS mit Variablen und Design-System
- **UI-Komponenten**: Eigene Komponentenbibliothek
- **Testing**: Vitest für Unit-Tests, Playwright für E2E-Tests

## Projektstruktur

Die Anwendung folgt einer modularisierten Verzeichnisstruktur:

```
/src
  /assets         # Statische Assets und globale Styles
  /bridge         # Bridge-Mechanismus für Legacy-Kompatibilität
  /components     # UI-Komponenten
    /admin        # Admin-Panel Komponenten
    /chat         # Chat-Interface Komponenten
    /dialog       # Dialog-System
    /layout       # Layout-Komponenten
    /ui           # Basis-UI-Komponenten
    /shared       # Gemeinsam genutzte Komponenten
  /composables    # Vue Composition API Funktionen
  /plugins        # Vue-Plugins
  /router         # Routing-Konfiguration
  /services       # API-Services
    /api          # API-Kommunikation
    /log          # Logging-Dienste
    /storage      # Storage-Dienste
    /ui           # UI-Services
  /stores         # Pinia Stores
  /types          # TypeScript-Typdefinitionen
  /utils          # Hilfsfunktionen
  /views          # Haupt-View-Komponenten
  App.vue         # Root-Komponente
  main.ts         # Anwendungs-Einstiegspunkt
```

## Core-Komponenten

### App.vue

Die Root-Komponente, die als Container für die gesamte Anwendung dient.

```vue
<template>
  <div class="app-container">
    <template v-if="authStore.isAuthenticated">
      <MainLayout>
        <template #header>
          <Header :user="authStore.user" @logout="authStore.logout" />
        </template>
        
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </MainLayout>
    </template>
    
    <template v-else>
      <router-view />
    </template>
    
    <Toast />
    <DialogProvider />
  </div>
</template>
```

### MainLayout.vue

Die Hauptlayout-Komponente, die die Struktur der Anwendung definiert.

### ChatView.vue / EnhancedChatView.vue

Die Hauptansichten für die Chat-Funktionalität, mit Standard- und erweiterten Varianten.

## Routing

Das Routing ist mit Vue Router 4 implementiert:

```typescript
// /src/router/index.ts
import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Chat',
    component: () => import('@/views/ChatView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { guest: true }
  },
  // Weitere Routen...
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Navigation Guards für Authentifizierung
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login');
  } 
  else if (to.meta.adminOnly && !authStore.hasRole('admin')) {
    next('/');
  } 
  else if (to.meta.guest && authStore.isAuthenticated) {
    next('/');
  } 
  else {
    next();
  }
});

export default router;
```

## State-Management

Der Anwendungszustand wird mit Pinia verwaltet. Die wichtigsten Stores sind:

### AuthStore

Verwaltet Benutzerauthentifizierung, Token und Rollen:

```typescript
// /src/stores/auth.ts
export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null);
  const token = ref<string | null>(null);
  // ...

  // Getters
  const isAuthenticated = computed(() => !!token.value && !!user.value);
  const isAdmin = computed(() => !!user.value?.roles?.includes('admin'));
  // ...

  // Actions
  async function login(credentials: LoginCredentials): Promise<boolean> {
    // Login-Logik
  }

  async function logout(): Promise<void> {
    // Logout-Logik
  }
  // ...

  return { 
    user, token, isAuthenticated, isAdmin, login, logout, /* ... */
  };
}, {
  persist: {
    storage: localStorage,
    paths: ['token', 'refreshToken', 'user', 'expiresAt', 'version'],
  },
});
```

### UIStore

Verwaltet UI-Zustand wie Dark Mode, Seitenleiste, Modals und Toasts:

```typescript
// /src/stores/ui.ts
export const useUIStore = defineStore('ui', () => {
  // UI-State
  const sidebar = ref<SidebarState>({
    isOpen: true,
    width: 280,
    activeTab: 'chat',
    collapsed: false
  });
  const darkMode = ref<boolean>(false);
  // ...

  // Getters
  const isDarkMode = computed(() => darkMode.value);
  const sidebarIsOpen = computed(() => sidebar.value.isOpen && !sidebar.value.collapsed);
  // ...

  // Actions
  function toggleDarkMode(): void {
    darkMode.value = !darkMode.value;
    requestUIUpdate('darkMode');
  }
  // ...

  return { 
    sidebar, darkMode, isDarkMode, sidebarIsOpen, toggleDarkMode, /* ... */
  };
}, {
  persist: {
    storage: localStorage,
    paths: [/* ... */],
  },
});
```

### SessionsStore

Verwaltet Chat-Sitzungen und Nachrichten:

```typescript
// /src/stores/sessions.ts
export const useSessionsStore = defineStore('sessions', () => {
  // State
  const sessions = ref<ChatSession[]>([]);
  const currentSessionId = ref<string | null>(null);
  const messages = ref<Record<string, ChatMessage[]>>({});
  // ...

  // Getters
  const currentSession = computed(() => 
    sessions.value.find(s => s.id === currentSessionId.value) || null
  );
  const currentMessages = computed(() => 
    currentSessionId.value ? messages.value[currentSessionId.value] || [] : []
  );
  // ...

  // Actions
  async function createSession(title: string = 'Neue Unterhaltung'): Promise<string> {
    // Session-Erstellung
  }
  async function sendMessage({ sessionId, content, role = 'user' }: SendMessageParams): Promise<void> {
    // Nachrichtenversand
  }
  // ...

  return { 
    sessions, currentSessionId, messages, currentSession, createSession, sendMessage, /* ... */ 
  };
}, {
  persist: {
    storage: localStorage,
    paths: [/* ... */],
  },
});
```

### DocumentConverterStore

Verwaltet den Dokumentenkonverter:

```typescript
// /src/stores/documentConverter.ts
export const useDocumentConverterStore = defineStore('documentConverter', {
  state: (): DocumentConverterState => ({
    uploadedFiles: [],
    convertedDocuments: [],
    conversionProgress: 0,
    // ...
  }),

  getters: {
    hasDocuments: (state) => state.convertedDocuments.length > 0,
    selectedDocument: (state) => {
      if (!state.selectedDocumentId) return null;
      return state.convertedDocuments.find(
        doc => doc.id === state.selectedDocumentId
      ) || null;
    },
    // ...
  },

  actions: {
    async uploadDocument(file: File): Promise<string | null> {
      // Upload-Logik
    },
    async convertDocument(documentId: string, settings?: Partial<ConversionSettings>): Promise<boolean> {
      // Konvertierungs-Logik
    },
    // ...
  },
  
  // Persistenz-Konfiguration
  persist: {
    key: 'nscale-doc-converter',
    paths: [/* ... */],
  }
});
```

## API-Integration

Die API-Kommunikation erfolgt über eine ApiService-Klasse, die Axios verwendet:

```typescript
// /src/services/api/ApiService.ts
export class ApiService {
  private static _instance: AxiosInstance;
  private static _isInitialized = false;

  /**
   * Initialisiert den API-Service mit Basis-Konfiguration
   */
  public static init(): void {
    if (this._isInitialized) return;
    
    this._instance = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // Request-Interceptor für Auth-Token
    this._instance.interceptors.request.use(
      (config) => {
        const authStore = useAuthStore();
        if (authStore.token) {
          config.headers.Authorization = `Bearer ${authStore.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response-Interceptor für Fehlerbehandlung
    // ...
  }

  // API-Methoden
  public static async get<T = any>(resource: string, config?: AxiosRequestConfig): Promise<T> {
    return this._instance.get<T, AxiosResponse<T>>(resource, config)
      .then((response) => response.data);
  }

  public static async post<T = any>(resource: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this._instance.post<T, AxiosResponse<T>>(resource, data, config)
      .then((response) => response.data);
  }
  
  // Weitere Methoden...
}
```

## Build-Prozess

Der Build-Prozess wird mit Vite durchgeführt:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [vue()],
  
  // CSS-Konfiguration
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/assets/styles/variables.scss";`
      }
    }
  },
  
  // Alias-Konfiguration
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
    extensions: ['.js', '.ts', '.vue', '.json']
  },
  
  // Server-Konfiguration
  server: {
    port: 3000,
    strictPort: true,
    cors: true,
    hmr: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (path) => path
      }
    }
  },
  
  // Build-Optionen
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    sourcemap: process.env.NODE_ENV !== 'production',
    
    // Optimierungen für Produktion
    rollupOptions: {
      output: {
        // Code-Splitting
        manualChunks: {
          'vendor': ['vue', 'vue-router', 'pinia', '@vueuse/core'],
          'ui-components': [/* ... */],
          'layout': [/* ... */]
        },
        // Dateibenennung
        entryFileNames: 'js/[name].[hash].js',
        chunkFileNames: 'js/chunks/[name].[hash].js',
        assetFileNames: (assetInfo) => {
          // Asset-Typen zuordnen...
        }
      }
    },
    
    // Build-Optimierungen
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production'
      }
    }
  }
});
```

## Tests

Die Anwendung unterstützt verschiedene Testtypen:

### Unit-Tests

Mit Vitest für Komponenten, Stores und Dienste:

```typescript
// /test/stores/auth.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('initializes with correct default state', () => {
    const authStore = useAuthStore();
    expect(authStore.user).toBeNull();
    expect(authStore.token).toBeNull();
    expect(authStore.isAuthenticated).toBe(false);
  });

  // Weitere Tests...
});
```

### Ende-zu-Ende-Tests

Mit Playwright:

```typescript
// e2e/tests/auth/login.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/login-page';

test.describe('Login-Funktionalität', () => {
  test('erfolgreicher Login mit gültigen Anmeldedaten', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('testuser', 'password');
    
    // Überprüfen, ob wir auf die Chat-Seite weitergeleitet wurden
    await expect(page).toHaveURL(/\/chat/);
  });

  // Weitere Tests...
});
```

## Migrationshinweise

### Bridge-Mechanismus

Für die Übergangsphase wurde ein Bridge-Mechanismus entwickelt, der die Kommunikation zwischen altem und neuem Code ermöglicht. Dieser kann schrittweise entfernt werden, wenn die Migration vollständig ist.

### Komponentenmigration

1. Identifiziere Legacy-Komponenten
2. Erstelle Vue 3 SFC-Äquivalente mit TypeScript und Composition API
3. Integriere mit Pinia für State-Management
4. Teste die neue Komponente
5. Ersetze die alte Komponente durch die neue

### TypeScript-Migration

1. Definiere Schnittstellen für alle Datenmodelle
2. Füge Typen zu allen Funktionen und Komponenten hinzu
3. Nutze Typinferenz, wo sinnvoll

### Empfohlenes Vorgehen für restliche Migration

1. Migriere zuerst UI-Komponenten ohne komplexe Geschäftslogik
2. Migriere dann die Stores und Services
3. Migriere zuletzt komplexe Container-Komponenten

### Vollständige Migration ohne Bridge

Für eine vollständige Migration ohne Bridge:

1. Stelle sicher, dass alle Komponenten migriert sind
2. Entferne Bridge-Imports und -Nutzung
3. Entferne Legacy-Code und damit verbundene Build-Konfigurationen
4. Aktualisiere Vite-Konfiguration auf eine vereinfachte Version