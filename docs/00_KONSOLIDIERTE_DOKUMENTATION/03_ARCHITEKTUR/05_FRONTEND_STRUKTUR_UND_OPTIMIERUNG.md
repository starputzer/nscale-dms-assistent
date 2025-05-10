---
title: "Frontend-Struktur und Optimierung"
version: "1.0.0"
date: "10.05.2025"
lastUpdate: "10.05.2025"
author: "Martin Heinrich"
status: "Aktiv"
priority: "Hoch"
category: "Architektur"
tags: ["Frontend", "Architektur", "Performance", "MIME-Typen", "Build", "Deployment", "Optimierung"]
---

# Frontend-Struktur und Optimierung

> **Letzte Aktualisierung:** 10.05.2025 | **Version:** 1.0.0 | **Status:** Aktiv

## Inhaltsverzeichnis

1. [Übersicht](#übersicht)
2. [Frontendarchitektur](#frontendarchitektur)
   - [Komponenten-Hierarchie](#komponenten-hierarchie)
   - [Projektstruktur](#projektstruktur)
   - [Core-Komponenten](#core-komponenten)
   - [Kompositions-Muster](#kompositions-muster)
3. [Build-System und Ressourcen-Optimierung](#build-system-und-ressourcen-optimierung)
   - [Vite-Konfiguration](#vite-konfiguration)
   - [Code-Splitting und Lazy-Loading](#code-splitting-und-lazy-loading)
   - [Asset-Optimierung](#asset-optimierung)
   - [CSS-Optimierung](#css-optimierung)
4. [Deployment und Umgebungen](#deployment-und-umgebungen)
   - [Umgebungsvariablen](#umgebungsvariablen)
   - [Deployment-Skripte](#deployment-skripte)
   - [CI/CD-Pipeline](#cicd-pipeline)
5. [Performance-Optimierungen](#performance-optimierungen)
   - [Cache-Strategien](#cache-strategien)
   - [Build-Optimierungen](#build-optimierungen)
   - [Runtime-Optimierungen](#runtime-optimierungen)
6. [Frontendstruktur-Bereinigung](#frontendstruktur-bereinigung)
   - [Ausgangsproblem](#ausgangsproblem)
   - [Durchgeführte Maßnahmen](#durchgeführte-maßnahmen)
   - [Vorteile der neuen Struktur](#vorteile-der-neuen-struktur)
7. [MIME-Typ-Probleme lösen](#mime-typ-probleme-lösen)
   - [Problemursachen](#problemursachen)
   - [Implementierte Lösung](#implementierte-lösung)
   - [Best Practices für die Ressourcenladung](#best-practices-für-die-ressourcenladung)
8. [Sicherheitsaspekte](#sicherheitsaspekte)
   - [Sichere Umgebungsvariablen](#sichere-umgebungsvariablen)
   - [Dependency-Scanning](#dependency-scanning)
   - [Rollback-Mechanismus](#rollback-mechanismus)
9. [Troubleshooting](#troubleshooting)
   - [Build-Fehler](#build-fehler)
   - [Deployment-Fehler](#deployment-fehler)
   - [CSS und Styling-Probleme](#css-und-styling-probleme)
   - [Cache-Probleme](#cache-probleme)

## Übersicht

Die Frontend-Struktur des nscale DMS Assistenten wurde vollständig modernisiert und optimiert. Die ursprünglich fragmentierte Struktur mit gemischten JavaScript-Dateien, diversen Einstiegspunkten und unklaren Abhängigkeiten wurde zu einer konsistenten, wartbaren und performanten Vue 3-basierten Anwendung transformiert. Dieses Dokument beschreibt die aktuelle Frontend-Architektur, die durchgeführten Optimierungen und die zugrunde liegenden technischen Konzepte.

Die Anwendung basiert auf folgenden Kerntechnologien:
- **Vue 3.3+** mit Composition API und TypeScript
- **Vite 4.5+** als Build-Tool für schnelle Entwicklung und optimierte Produktion
- **Pinia 2.1+** für State-Management
- **SCSS** für strukturiertes CSS mit Design-System

## Frontendarchitektur

### Komponenten-Hierarchie

Die Vue 3-Anwendung ist nach dem Komponenten-Prinzip aufgebaut, mit einer klaren Hierarchie von Komponenten-Kategorien:

```
App.vue
├── Layout-Komponenten
│   ├── MainLayout.vue
│   ├── AdminLayout.vue
│   └── AuthLayout.vue
│
├── Seiten-Komponenten
│   ├── LoginView.vue
│   ├── ChatView.vue
│   ├── AdminView.vue
│   └── SettingsView.vue
│
├── Feature-Komponenten
│   ├── Chat
│   │   ├── ChatContainer.vue
│   │   ├── MessageList.vue
│   │   ├── MessageItem.vue
│   │   └── MessageInput.vue
│   │
│   ├── Session
│   │   ├── SessionList.vue
│   │   ├── SessionItem.vue
│   │   └── NewSessionButton.vue
│   │
│   ├── Admin
│   │   ├── UserManagement.vue
│   │   ├── SystemSettings.vue
│   │   └── StatisticsPanel.vue
│   │
│   └── DocConverter
│       ├── DocConverterContainer.vue
│       ├── FileUpload.vue
│       ├── ConversionProgress.vue
│       └── ResultDisplay.vue
│
└── Basis-Komponenten
    ├── Button.vue
    ├── Input.vue
    ├── Card.vue
    ├── Modal.vue
    ├── Dropdown.vue
    ├── Tabs.vue
    └── ErrorBoundary.vue
```

Diese Hierarchie ermöglicht eine klare Trennung von Verantwortlichkeiten und verbessert die Wartbarkeit und Wiederverwendbarkeit der Komponenten.

### Projektstruktur

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

### Core-Komponenten

Die wichtigsten Komponenten der Anwendung sind:

#### App.vue - Root-Komponente

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

#### MainLayout.vue - Hauptlayoutkomponente

Die optimierte MainLayout-Komponente bietet umfangreiche Anpassungsmöglichkeiten für das Layout der Anwendung:

```vue
<template>
  <div
    ref="layoutRef"
    class="n-main-layout"
    :class="{
      'n-main-layout--sidebar-collapsed': isSidebarCollapsed,
      'n-main-layout--sidebar-hidden': !showSidebar,
      'n-main-layout--footer-hidden': !showFooter,
      [`n-main-layout--${theme}`]: true,
      [`n-main-layout--grid-${gridLayout}`]: true,
      [`n-main-layout--content-width-${contentWidth}`]: true,
      'n-main-layout--has-sidebar-overlay': hasSidebarOverlay,
      'n-main-layout--mobile': isMobile
    }"
    :style="customStyles"
  >
    <!-- Header -->
    <header
      v-if="showHeader"
      class="n-main-layout__header"
      :class="{
        'n-main-layout__header--sticky': stickyHeader,
        'n-main-layout__header--elevated': headerElevation,
        [`n-main-layout__header--${headerSize}`]: true
      }"
    >
      <slot name="header">
        <Header
          :title="title"
          :show-toggle-button="showSidebar"
          :logo="logo"
          :logo-alt="logoAlt"
          :size="headerSize"
          :user="user"
          @toggle-sidebar="toggleSidebar"
        />
      </slot>
    </header>

    <div class="n-main-layout__body">
      <!-- Sidebar -->
      <aside
        v-if="showSidebar"
        class="n-main-layout__sidebar"
        :class="{
          'n-main-layout__sidebar--fixed': sidebarFixed,
          'n-main-layout__sidebar--elevated': sidebarElevation
        }"
      >
        <slot name="sidebar">
          <Sidebar
            :items="sidebarItems"
            :active-item-id="activeSidebarItemId"
            :title="sidebarTitle"
            :collapsed="isSidebarCollapsed"
            @toggle-collapse="setSidebarCollapsed"
            @select="handleSidebarItemSelect"
          />
        </slot>
      </aside>

      <!-- Sidebar Overlay für mobile Ansicht -->
      <div
        v-if="hasSidebarOverlay && showSidebar"
        class="n-main-layout__sidebar-overlay"
        @click="closeSidebarOnMobile"
      ></div>

      <!-- Main Content -->
      <main
        class="n-main-layout__content"
        :class="{
          'n-main-layout__content--has-padding': contentPadding,
          [`n-main-layout__content--align-${contentAlignment}`]: true,
          'n-main-layout__content--full-height': fullHeightContent
        }"
      >
        <div
          class="n-main-layout__content-container"
          :class="{
            [`n-main-layout__content-container--width-${contentWidth}`]: true
          }"
        >
          <slot></slot>
        </div>
      </main>
    </div>

    <!-- Footer -->
    <footer
      v-if="showFooter"
      class="n-main-layout__footer"
      :class="{
        'n-main-layout__footer--sticky': stickyFooter,
        'n-main-layout__footer--elevated': footerElevation
      }"
    >
      <slot name="footer">
        <div class="n-main-layout__footer-content">
          <p>© {{ currentYear }} {{ footerText || title }}</p>
          <div v-if="showVersionInfo" class="n-main-layout__version-info">
            <span>Version {{ versionInfo }}</span>
          </div>
        </div>
      </slot>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, provide, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useUIStore } from '@/stores/ui';
import Header from './Header.vue';
import Sidebar from './Sidebar.vue';

// Umfangreiche Props-Definition für maximale Anpassungsfähigkeit
export interface MainLayoutProps {
  title?: string;
  logo?: string;
  logoAlt?: string;
  showHeader?: boolean;
  showSidebar?: boolean;
  showFooter?: boolean;
  sidebarItems?: SidebarItem[];
  sidebarCollapsed?: boolean;
  theme?: 'light' | 'dark' | 'system';
  stickyHeader?: boolean;
  stickyFooter?: boolean;
  sidebarTitle?: string;
  activeSidebarItemId?: string;
  gridLayout?: 'default' | 'sidebar-left' | 'sidebar-right' | 'full-width' | 'centered';
  contentWidth?: 'narrow' | 'medium' | 'wide' | 'full';
  contentPadding?: boolean;
  contentAlignment?: 'left' | 'center' | 'right';
  fullHeightContent?: boolean;
  sidebarFixed?: boolean;
  customCssVars?: Record<string, string>;
  user?: {
    name?: string;
    avatar?: string;
    email?: string;
  };
  headerSize?: 'small' | 'medium' | 'large';
  headerElevation?: boolean;
  sidebarElevation?: boolean;
  footerElevation?: boolean;
  footerText?: string;
  versionInfo?: string;
  showVersionInfo?: boolean;
}

export interface SidebarItem {
  id: string;
  label: string;
  icon?: string;
  route?: string;
  children?: SidebarItem[];
  disabled?: boolean;
  active?: boolean;
  badge?: string | number;
  badgeType?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  permissions?: string[];
  tooltip?: string;
}

// Weitere Implementierungsdetails weggelassen der Kürze halber
</script>
```

#### Header.vue - Header-Komponente

Die Header-Komponente ist eine flexible Komponente für den oberen Bereich der Anwendung, die zahlreiche Funktionen bietet:

```vue
<template>
  <div
    ref="headerRef"
    class="n-header"
    :class="{
      'n-header--fixed': fixed,
      'n-header--bordered': bordered,
      'n-header--elevated': elevated,
      [`n-header--${size}`]: true,
      'n-header--has-navigation': showNavigation,
      'n-header--search-active': isSearchActive,
      'n-header--notification-active': isNotificationActive,
      'n-header--mobile': isMobile
    }"
    :style="{ height: `${computedHeight}px`, ...customStyles }"
  >
    <div class="n-header__left">
      <!-- Toggle Button für Sidebar -->
      <button
        v-if="showToggleButton"
        class="n-header__toggle-btn"
        @click="handleToggleClick"
        aria-label="Seitenleiste umschalten"
        type="button"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <!-- SVG-Pfade für Hamburger-Icon -->
        </svg>
      </button>

      <!-- Logo -->
      <div class="n-header__logo">
        <slot name="logo">
          <div v-if="logo" class="n-header__logo-image">
            <img :src="logo" :alt="logoAlt || title" />
          </div>
        </slot>
      </div>

      <!-- Titel -->
      <h1 v-if="title && showTitle" class="n-header__title">
        <slot name="title">{{ title }}</slot>
      </h1>
    </div>

    <div class="n-header__center">
      <slot name="center">
        <!-- Dynamische Navigation -->
        <nav v-if="showNavigation && navigationItems.length > 0" class="n-header__navigation">
          <ul class="n-header__nav-list">
            <!-- Reguläre Navigationspunkte -->
            <li
              v-for="item in visibleNavigationItems"
              :key="item.id"
              class="n-header__nav-item"
              :class="{ 'n-header__nav-item--active': isActiveNavigationItem(item) }"
            >
              <!-- Navigation-Item-Rendering -->
            </li>

            <!-- "Mehr" Dropdown für Overflow-Items -->
            <li v-if="hasOverflowingItems" class="n-header__nav-item n-header__nav-item--more">
              <!-- "Mehr" Button und Dropdown -->
            </li>
          </ul>
        </nav>

        <!-- Suchleiste -->
        <div v-if="showSearch" class="n-header__search" :class="{ 'n-header__search--active': isSearchActive }">
          <!-- Suchfunktionalität und Autovervollständigung -->
        </div>
      </slot>
    </div>

    <div class="n-header__right">
      <slot name="right">
        <div class="n-header__actions">
          <!-- Suchknopf für mobile Ansicht -->
          <button v-if="showSearch && isMobile && !isSearchActive"
            class="n-header__action-button n-header__action-button--search"
            @click="toggleSearch"
            aria-label="Suche"
            type="button"
          ></button>

          <!-- Benachrichtigungen -->
          <div v-if="$slots.notifications" class="n-header__notifications">
            <slot name="notifications"></slot>
          </div>
          <div v-else-if="showNotifications" class="n-header__notification-center">
            <!-- Benachrichtigungssystem -->
          </div>

          <!-- Benutzermenü -->
          <div v-if="$slots.user" class="n-header__user">
            <slot name="user"></slot>
          </div>
          <div v-else-if="user" class="n-header__user-menu">
            <!-- Benutzermenü mit Dropdown -->
          </div>
        </div>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
// TypeScript-Interfaces für die Komponente
export interface NavigationItem {
  id: string;
  label: string;
  icon?: string | object;
  href?: string;
  active?: boolean;
  badge?: string | number;
  badgeType?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  tooltip?: string;
  permissions?: string[];
  onClick?: () => void;
}

export interface SearchResult {
  id: string;
  title: string;
  description?: string;
  icon?: string | object;
  category?: string;
  url?: string;
  onSelect?: (result: SearchResult) => void;
}

export interface Notification {
  id: string;
  title: string;
  message?: string;
  type?: 'default' | 'info' | 'success' | 'warning' | 'error';
  icon?: string | object;
  read?: boolean;
  time?: Date | number | string;
  action?: string | (() => void);
  actionLabel?: string;
}

// Umfangreiche Props-Definition
export interface HeaderProps {
  title?: string;
  logo?: string;
  logoAlt?: string;
  fixed?: boolean;
  bordered?: boolean;
  elevated?: boolean;
  size?: 'small' | 'medium' | 'large';
  height?: number;
  showTitle?: boolean;
  showToggleButton?: boolean;
  showNavigation?: boolean;
  navigationItems?: NavigationItem[];
  activeNavigationId?: string;
  maxVisibleNavigationItems?: number;
  showSearch?: boolean;
  searchPlaceholder?: string;
  searchMinLength?: number;
  searchDebounce?: number;
  showNotifications?: boolean;
  notifications?: Notification[];
  notificationSettingsLink?: string;
  showNotificationSettings?: boolean;
  user?: {
    name?: string;
    avatar?: string;
    email?: string;
    role?: string;
  };
  userMenuItems?: UserMenuItem[];
  showLogout?: boolean;
  customStyles?: Record<string, string>;
}

// Weitere Implementierungsdetails weggelassen der Kürze halber
</script>
```

#### ChatView.vue / EnhancedChatView.vue

```vue
<template>
  <div class="chat-view">
    <chat-container 
      :session-id="sessionId"
      @session-change="handleSessionChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSessionStore } from '@/stores/sessions';
import ChatContainer from '@/components/chat/ChatContainer.vue';

const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();

const sessionId = ref<string>('');

// Initialisiere sessionId aus der Route
onMounted(async () => {
  if (route.params.id) {
    sessionId.value = route.params.id as string;
  } else if (sessionStore.sessions.length > 0) {
    // Wenn keine Session-ID in der Route, verwende die erste verfügbare Session
    sessionId.value = sessionStore.sessions[0].id;
    router.replace(`/session/${sessionId.value}`);
  } else {
    // Wenn keine Sessions vorhanden, erstelle eine neue
    const newSessionId = await sessionStore.createSession();
    if (newSessionId) {
      sessionId.value = newSessionId;
      router.replace(`/session/${newSessionId}`);
    }
  }
});

// Aktualisiere sessionId, wenn sich die Route ändert
watch(() => route.params.id, (newId) => {
  if (newId) {
    sessionId.value = newId as string;
  }
});

// Handler für Session-Wechsel
function handleSessionChange(newSessionId: string) {
  router.push(`/session/${newSessionId}`);
}
</script>
```

### Kompositions-Muster

Die Anwendung verwendet folgende Muster für die Komposition von Komponenten und Logik:

#### Composables

Wiederverwendbare Logik, die von mehreren Komponenten genutzt werden kann:

```typescript
// composables/useChat.ts
import { ref, watch, computed } from 'vue';
import { useSessionStore } from '@/stores/sessions';
import type { Message } from '@/types';

export function useChat() {
  const sessionStore = useSessionStore();
  
  // Lokaler Zustand für optimistisches UI-Verhalten
  const localMessages = ref<Message[]>([]);
  const isLoading = ref(false);
  const isStreaming = ref(false);
  const error = ref<Error | null>(null);
  
  // Kombiniere Store-Messages mit lokalen Messages für optimistisches UI
  const messages = computed(() => {
    return [...sessionStore.messages, ...localMessages.value];
  });
  
  // Synchronisiere, wenn Store-Messages sich ändern
  watch(() => sessionStore.messages, (newMessages) => {
    // Entferne lokale Messages, die jetzt im Store sind
    const storeMessageIds = new Set(newMessages.map(m => m.id));
    localMessages.value = localMessages.value.filter(m => !storeMessageIds.has(m.id));
  }, { deep: true });
  
  // Nachrichten für eine Session laden
  async function loadMessages(sessionId: string) {
    isLoading.value = true;
    error.value = null;
    
    try {
      await sessionStore.loadMessages(sessionId);
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Fehler beim Laden der Nachrichten');
      console.error('Chat-Fehler:', error.value);
    } finally {
      isLoading.value = false;
    }
  }
  
  // Nachricht senden mit optimistischem UI-Update
  async function sendMessage(sessionId: string, content: string) {
    if (!sessionId || !content.trim()) return;
    
    const tempId = `temp-${Date.now()}`;
    
    // Optimistisch lokale Nachricht hinzufügen
    const tempMessage: Message = {
      id: tempId,
      sessionId,
      role: 'user',
      content,
      timestamp: new Date()
    };
    
    localMessages.value.push(tempMessage);
    isStreaming.value = true;
    
    try {
      await sessionStore.sendMessage(sessionId, content);
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Fehler beim Senden der Nachricht');
      console.error('Chat-Fehler:', error.value);
      
      // Entferne die optimistische Nachricht bei Fehler
      localMessages.value = localMessages.value.filter(m => m.id !== tempId);
    } finally {
      isStreaming.value = false;
    }
  }
  
  return {
    messages,
    isLoading,
    isStreaming,
    error,
    loadMessages,
    sendMessage
  };
}
```

#### Plugins

Erweiterungen für die Vue-Anwendung:

```typescript
// plugins/errorHandler.ts
import type { App } from 'vue';
import { useErrorStore } from '@/stores/error';

export default {
  install: (app: App) => {
    const errorStore = useErrorStore();
    
    // Globaler Fehlerhandler
    app.config.errorHandler = (err, instance, info) => {
      console.error('Vue-Fehler:', err);
      
      // Fehler im Store speichern
      errorStore.setError({
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        info,
        timestamp: new Date()
      });
    };
  }
};
```

#### Direktiven

Benutzerdefinierte Vue-Direktiven für DOM-Manipulation:

```typescript
// directives/clickOutside.ts
import type { Directive } from 'vue';

interface ClickOutsideElement extends HTMLElement {
  _clickOutsideHandler?: (event: MouseEvent) => void;
}

export const clickOutside: Directive = {
  mounted(el: ClickOutsideElement, binding) {
    el._clickOutsideHandler = (event: MouseEvent) => {
      // Prüfe, ob das Event-Target außerhalb des Elements liegt
      if (!(el === event.target || el.contains(event.target as Node))) {
        binding.value(event);
      }
    };
    
    document.addEventListener('click', el._clickOutsideHandler);
  },
  
  unmounted(el: ClickOutsideElement) {
    if (el._clickOutsideHandler) {
      document.removeEventListener('click', el._clickOutsideHandler);
      delete el._clickOutsideHandler;
    }
  }
};
```

## Build-System und Ressourcen-Optimierung

### Vite-Konfiguration

Die Anwendung verwendet Vite als Build-Tool mit einer optimierten Konfiguration:

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

### Code-Splitting und Lazy-Loading

Die Anwendung verwendet granulares Code-Splitting, um nur den Code zu laden, der tatsächlich benötigt wird:

```typescript
// Beispiel aus vite.config.ts:
manualChunks: {
  'vendor-core': ['vue', 'vue-router', 'pinia'],
  'vendor-utils': ['@vueuse/core', 'axios', 'uuid', 'marked'],
  'ui-base': ['./src/components/ui/base/Button.vue', '...'],
  'feature-chat': ['./src/components/chat/ChatContainer.vue', '...'],
  // ...weitere Chunks
}
```

Zudem werden Router-Routen asynchron geladen:

```typescript
// router/index.ts
import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Chat',
    component: () => import('@/views/ChatView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/admin',
    component: () => import('@/views/AdminView.vue'),
    children: [
      {
        path: 'users',
        component: () => import('@/views/admin/UsersView.vue')
      },
      {
        path: 'settings',
        component: () => import('@/views/admin/SettingsView.vue')
      },
      {
        path: 'doc-converter',
        component: () => import('@/views/admin/DocConverterView.vue')
      }
    ]
  }
  // Weitere Routen...
];
```

### Asset-Optimierung

Statische Assets werden automatisch kategorisiert und optimiert:

- **Bilder**: Komprimiert und in `assets/images/` platziert
- **CSS**: Minimiert, autoprefixed und in `assets/css/` platziert
- **Fonts**: In `assets/fonts/` zusammengefasst
- **Hash-basierte Dateinamen**: Für effektives Caching

### CSS-Optimierung

Die CSS-Verarbeitung wurde verbessert durch:

- **CSS-Extraktion**: CSS wird in separate Dateien extrahiert
- **CSS-Module-Unterstützung**: Optimierte Klassennamengenerierung
- **Autoprefixer**: Für bessere Browser-Kompatibilität
- **SCSS-Integration**: Mit globalen Variablen

## Deployment und Umgebungen

### Umgebungsvariablen

Die Anwendung verwendet ein detailliertes Umgebungsvariablensystem für verschiedene Bereitstellungskontexte.

#### Umgebungsdateien

- `.env`: Basis-Umgebungsvariablen für alle Umgebungen
- `.env.development`: Entwicklungsumgebung
- `.env.staging`: Staging-Umgebung
- `.env.production`: Produktionsumgebung
- `.env.test`: Test-Umgebung

#### Verfügbare Variablen

| Variable | Beschreibung | Beispielwert |
|----------|--------------|--------------|
| `VITE_API_URL` | API-Endpunkt URL | `https://api.nscale-assist.example.com` |
| `VITE_API_VERSION` | API-Version | `v1` |
| `VITE_ENV` | Umgebungsname | `production` |
| `VITE_ENABLE_DEBUG` | Debug-Modus aktivieren | `false` |
| `VITE_CACHE_STORAGE` | Cache-Speichertyp | `localStorage` |
| `VITE_CACHE_LIFETIME` | Cache-Lebensdauer (Sekunden) | `43200` |
| `VITE_FEATURE_*` | Feature-Flags | `true`/`false` |

### Deployment-Skripte

Die Deployment-Skripte automatisieren den Build- und Deployment-Prozess für verschiedene Umgebungen.

#### Development-Deployment

Das Development-Deployment-Skript (`scripts/deploy-dev.sh`) baut die Anwendung für die lokale Entwicklung:

- Installiert Abhängigkeiten
- Führt Lint und TypeScript-Prüfungen durch
- Erstellt einen Development-Build
- Startet einen lokalen Server zur Vorschau

#### Staging-Deployment

Das Staging-Deployment-Skript (`scripts/deploy-staging.sh`) deployt die Anwendung in einer Staging-Umgebung:

- Erstellt einen Staging-Build
- Sichert vorhandene Deployments
- Überträgt Dateien auf den Staging-Server via RSYNC
- Aktualisiert Symlinks für eine atomare Bereitstellung
- Bereinigt alte Releases

#### Produktions-Deployment

Das Produktions-Deployment-Skript (`scripts/deploy-production.sh`) implementiert ein robustes Release-Management:

- Prüft Branch-Berechtigungen (nur main/master)
- Erstellt ein versioniertes Release
- Verwendet ein rollierendes Release-System mit Symlinks
- Behält die letzten 5 Releases für schnelles Rollback
- Invalidiert CDN-Caches

### CI/CD-Pipeline

Die CI/CD-Pipeline automatisiert Tests, Builds und Deployments.

#### CI-Workflow

Der CI-Workflow (`.github/workflows/ci.yml`) führt automatisch Tests und Build-Validierung durch:

- Lint & Type-Checking
- Unit-Tests
- Komponententests
- E2E-Tests
- Build-Validierung
- Sicherheits-Scan

#### Staging-Deployment-Workflow

Der Staging-Deployment-Workflow (`.github/workflows/cd-staging.yml`) wird automatisch ausgelöst:

- Bei Pushes in den `develop`-Branch
- Bei manueller Auslösung
- Führt Tests aus, erstellt einen Build und deployt auf den Staging-Server

#### Produktions-Deployment-Workflow

Der Produktions-Deployment-Workflow (`.github/workflows/cd-production.yml`) wird ausgelöst:

- Bei Pushes in den `main`/`master`-Branch
- Bei Tag-Pushes (`v*`)
- Bei manueller Auslösung mit Bestätigung
- Führt erweiterte Tests durch und deployt auf den Produktionsserver

## Performance-Optimierungen

### Cache-Strategien

Die Anwendung verwendet mehrschichtige Cache-Strategien für optimale Performance.

#### Browser-Caching

Statische Assets werden für effizientes Browser-Caching optimiert:

- **Hash-basierte Dateinamen**: Für automatische Cache-Busting bei Änderungen
- **Aggressive Cache-Header**: Für unveränderliche Assets
- **Cache-Kontrolle**: Differenzierte Caching-Regeln für verschiedene Assettypen

#### API-Response-Caching

Die Anwendung implementiert ein intelligentes API-Response-Caching:

- **Selektives Caching**: Basierend auf Endpunkt-Typen
- **TTL-Management**: Angepasste Ablaufzeiten nach Ressourcentyp
- **Stale-While-Revalidate**: Veraltete Daten anzeigen, während im Hintergrund aktualisiert wird
- **Offline-Fallback**: Verwendung von Cache-Daten bei Netzwerkproblemen

#### CDN-Caching

Die Produktionsumgebung nutzt CDN-Caching für verbesserte globale Performance:

- **Automatische Invalidierung**: Bei jedem Deployment
- **Selektive Invalidierung**: Für spezifische Pfade
- **Cache-Header-Optimierung**: Für CDN-kompatible Caching-Strategien

### Build-Optimierungen

Folgende Build-Optimierungen verbessern die Performance:

- **Terser-Minifizierung**: Für kleinere Dateien
- **Tree-Shaking**: Entfernt ungenutzten Code
- **Modul-Verkettung**: Reduziert HTTP-Anfragen
- **Optimierte Bilderverarbeitung**: Mit angemessener Qualität

### Runtime-Optimierungen

Verschiedene Runtime-Optimierungen verbessern die Anwendungsleistung:

- **Preloading**: Wichtiger Assets
- **Prefetching**: Wahrscheinlich benötigter Chunks
- **Web Workers**: Für rechenintensive Operationen
- **Virtuelles Rendering**: Für lange Listen und Tabellen

## Frontendstruktur-Bereinigung

### Ausgangsproblem

In der Projektstruktur existierten ursprünglich drei verschiedene Versionen der main.js-Datei in unterschiedlichen Verzeichnissen:

1. /frontend/js/main.js - Legacy-Version
2. /frontend/js/vue/main.js - Vue 3 Implementation
3. /frontend/main.js - Hybrid-Version

Diese Struktur führte zu folgenden Problemen:

- 404-Fehler beim Laden von main.js, da die Referenzen im HTML nicht konsistent mit der Dateisystemstruktur waren
- Verwirrung bei Imports und Abhängigkeiten
- CSS-Dateien wurden fälschlicherweise als JavaScript-Module geladen (MIME-Type-Fehler)
- Fragmentierte Initialisierungslogik über mehrere Dateien verteilt

### Durchgeführte Maßnahmen

#### 1. Konsolidierung der main.js-Dateien

Die drei Versionen der main.js wurden analysiert und zu einer einzigen konsolidierten Version zusammengeführt. Diese enthält:

- Alle benötigten CSS-Importe aus allen Versionen
- Die vollständige Vue 3 Initialisierungslogik
- Feature-Flag-basierte Initialisierung verschiedener Anwendungsteile
- Verbesserte Fehlerbehandlung mit Fallback-Mechanismen
- Konsistente Exportschnittstelle für globale Funktionen

Die konsolidierte Datei wurde unter `/frontend/js/main.js` platziert und dient als einziger Einstiegspunkt für die Anwendung.

#### 2. Aktualisierung der HTML-Dateien

Die HTML-Dateien wurden aktualisiert, um auf die konsolidierte main.js zu verweisen:

- Anpassung der Script-Tags mit korrekten Attributen (type="module")
- Implementierung robuster Fehlerbehandlung für das Laden von Ressourcen
- Fallback-Mechanismen für verschiedene Dateipfade
- Dynamisches Laden von CSS mit korrekten MIME-Types

#### 3. Implementierung korrekter Server-Konfigurationen

Zwei Konfigurationsoptionen wurden bereitgestellt:

##### .htaccess für Apache

Eine .htaccess-Datei wurde erstellt, die:
- Korrekte MIME-Types für alle Ressourcen sicherstellt
- Umleitungsregeln für alte Pfade auf die neue Struktur implementiert
- Caching-Strategien für optimale Performance definiert
- Kompressionseinstellungen enthält

##### server.js für Node.js

Eine Express-basierte server.js wurde als Alternative implementiert, die:
- Korrekte MIME-Types für alle Ressourcentypen setzt
- Fallback-Routen für die konsolidierte main.js bereitstellt
- Statische Dateien korrekt bereitstellt
- Vue-Routing unterstützt

### Vorteile der neuen Struktur

1. **Verbesserte Zuverlässigkeit**: Durch Fallback-Mechanismen wird sichergestellt, dass die Anwendung auch bei Fehlern funktioniert
2. **Einheitlicher Einstiegspunkt**: Eine einzige main.js als zentraler Einstiegspunkt
3. **Korrekte MIME-Types**: Sicherstellen der korrekten Content-Types für alle Ressourcen
4. **Klare Initialisierungslogik**: Strukturierte und nachvollziehbare Initialisierung aller Anwendungskomponenten
5. **Bessere Wartbarkeit**: Einfachere Wartung durch konsolidierte Struktur

## MIME-Typ-Probleme lösen

### Problemursachen

Beim Laden der Frontend-Anwendung traten MIME-Typ-Fehler auf, die dazu führten, dass Styling-Informationen nicht korrekt angewendet wurden:

1. **JavaScript-Module mit CSS-Imports**: CSS-Dateien wurden direkt in JavaScript-Dateien importiert, die als ES-Module (`type="module"`) geladen wurden. Der Browser versuchte, die CSS-Dateien als JavaScript zu interpretieren.

2. **Inkonsistente StaticFiles-Bereitstellung**: Die FastAPI-Anwendung stellte statische Dateien nicht mit den korrekten MIME-Typen bereit.

3. **Fehlende Fallback-Mechanismen**: Es gab keine Fehlerbehandlung für den Fall, dass Stylesheet-Dateien nicht geladen werden konnten.

### Implementierte Lösung

#### 1. Entfernung von CSS-Imports in JavaScript-Dateien

Alle direkten CSS-Imports in JavaScript-Dateien wurden entfernt und durch explizite `<link>`-Tags in der HTML ersetzt:

```javascript
// Vorher:
import '../css/main.css';

// Nachher (in JavaScript-Dateien):
// CSS-Importe wurden entfernt und in HTML ausgelagert
```

```html
<!-- In index.html hinzugefügt: -->
<link rel="stylesheet" href="/css/main.css?v=20250508">
<link rel="stylesheet" href="/css/themes.css?v=20250508">
<!-- weitere CSS-Dateien... -->
```

#### 2. CSS-Handling-Plugin für Vite

Ein spezielles Plugin wurde in `vite.config.js` implementiert, um CSS-Imports in JavaScript-Dateien zu erkennen und zu entfernen:

```javascript
function cssHandlingPlugin() {
  return {
    name: 'css-handling',
    transform(code, id) {
      // Wenn es sich um einen CSS-Import in einer JS-Datei handelt
      if (id.endsWith('.js') && code.includes('import') && code.includes('.css')) {
        // Entferne CSS-Imports aus JS-Dateien
        const newCode = code.replace(/import ['"].*\.css['"];?/g, '// CSS-Import wurde entfernt');
        return {
          code: newCode,
          map: null
        };
      }
      return null;
    }
  };
}
```

#### 3. Verbesserte MIME-Typ-Behandlung im Server

Die `EnhancedMiddleware` in `server.py` wurde überarbeitet, um sicherzustellen, dass alle Dateien mit dem korrekten MIME-Typ ausgeliefert werden:

```python
# Erweiterte Middleware für No-Cache-Header und MIME-Typ-Korrekturen
class EnhancedMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        # Besseres MIME-Typ-Management
        original_path = request.url.path
        content_type = None
        
        # Vorab MIME-Type erkennen basierend auf Pfad und Dateiendung
        if original_path.endswith(".css"):
            content_type = "text/css"
        elif original_path.endswith(".js"):
            content_type = "application/javascript"
        # weitere MIME-Typ-Regeln...
        
        # Request durchführen
        response = await call_next(request)
        
        # Content-Type korrigieren falls nötig
        if content_type:
            current_content_type = response.headers.get("Content-Type", "")
            if content_type not in current_content_type:
                response.headers["Content-Type"] = content_type
        
        return response
```

#### 4. Dynamisches CSS-Laden mit Fallback

Für den Fall, dass Stylesheets nicht geladen werden können, wurde ein Fallback-Mechanismus implementiert:

```javascript
// CSS-Dateien mit korrekten MIME-Types laden
document.addEventListener('DOMContentLoaded', () => {
    const cssFiles = [
        '/css/main.css',
        '/css/themes.css',
        // weitere CSS-Dateien...
    ];
    
    // Überprüfe für jede Datei, ob sie bereits als Stylesheet vorhanden ist
    cssFiles.forEach(cssFile => {
        const cssFileBase = cssFile.split('?')[0]; // Entferne potentiellen Query-Parameter
        const isLoaded = Array.from(document.styleSheets).some(
            sheet => sheet.href && sheet.href.includes(cssFileBase)
        );
        
        if (!isLoaded) {
            console.warn(`CSS-Datei ${cssFile} wurde nicht geladen, versuche erneut`);
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = `${cssFile}?fallback=true&v=${new Date().getTime()}`;
            document.head.appendChild(link);
        }
    });
});
```

#### 5. StaticFiles-Mounts mit korrekten Verzeichnissen

Die FastAPI-App wurde mit spezifischen Mounts für verschiedene statische Dateitypen konfiguriert:

```python
app.mount("/static", StaticFiles(directory="frontend"), name="static")
app.mount("/css", StaticFiles(directory="frontend/css"), name="css")
app.mount("/js", StaticFiles(directory="frontend/js"), name="js")
app.mount("/images", StaticFiles(directory="frontend/images"), name="images")
```

### Best Practices für die Ressourcenladung

1. **CSS niemals in JavaScript-Modulen importieren**, sondern immer über `<link>`-Tags einbinden.
2. **Cache-Busting-Parameter verwenden**, um Caching-Probleme zu vermeiden: `<link href="style.css?v=20250508">`.
3. **MIME-Typen explizit setzen** in serverseitigen Konfigurationen.
4. **Fallback-Mechanismen implementieren** für kritische Ressourcen.
5. **Ressourcen-Pfade konsistent halten** zwischen Entwicklung und Produktion.

## Sicherheitsaspekte

### Sichere Umgebungsvariablen

- Verwendung von GitHub Secrets für sensible Daten
- Getrennte Umgebungsvariablen pro Deployment-Kontext
- Keine hartcodierten Anmeldedaten im Code

### Dependency-Scanning

- Automatische Sicherheitsscans für Abhängigkeiten
- OWASP Dependency-Check in der CI-Pipeline
- npm audit für Node.js-Abhängigkeiten

### Rollback-Mechanismus

- Einfaches Zurücksetzen auf frühere Versionen bei Sicherheitsproblemen
- Aufbewahrung mehrerer früherer Releases
- Minimale Ausfallzeit bei Sicherheitsupdates

## Troubleshooting

### Build-Fehler

| Problem | Mögliche Ursache | Lösung |
|---------|------------------|--------|
| TypeScript-Fehler | Inkompatible Typen | Typdefinitionen aktualisieren oder `any` verwenden |
| Chunk-Größe-Warnung | Zu große Bundles | Chunk-Konfiguration in `vite.config.ts` anpassen |
| CSS-Fehler | Unvollständige Import-Pfade | Vollständige Pfade für SCSS-Importe verwenden |

### Deployment-Fehler

| Problem | Mögliche Ursache | Lösung |
|---------|------------------|--------|
| SSH-Zugangsfehler | Fehlende Schlüssel | SSH-Konfiguration prüfen, Schlüssel hinzufügen |
| Symlink-Fehler | Fehlende Berechtigungen | Ordnerberechtigungen anpassen (`chmod 755`) |
| CDN-Invalidierung fehlgeschlagen | Ungültige Anmeldedaten | AWS/Cloudflare-Anmeldedaten prüfen |

### CSS und Styling-Probleme

| Problem | Mögliche Ursache | Lösung |
|---------|------------------|--------|
| CSS wird nicht geladen | MIME-Typ-Fehler | `<link>` statt JavaScript-Import verwenden |
| CSS-Variablen nicht verfügbar | Reihenfolge der Stylesheet-Ladung | Basis-CSS vor Komponenten-CSS laden |
| Layout-Probleme auf mobilen Geräten | Fehlende Responsive-Regeln | Responsive Design mit Media-Queries implementieren |

### Cache-Probleme

| Problem | Mögliche Ursache | Lösung |
|---------|------------------|--------|
| Alte Version wird angezeigt | Browser-Cache | Manuelles Cache-Leeren oder Cache-Invalidierungs-Skript ausführen |
| CDN zeigt alte Dateien | CDN-Cache | CDN-Invalidierung auslösen |
| API-Daten veraltet | API-Cache | `CachedApiService.clearCache()` aufrufen |

---

Diese umfassende Dokumentation beschreibt die aktuelle Frontend-Struktur, die verwendeten Optimierungen und Best Practices. Bei spezifischen Fragen oder Problemen können Sie sich an das Entwicklungsteam wenden.