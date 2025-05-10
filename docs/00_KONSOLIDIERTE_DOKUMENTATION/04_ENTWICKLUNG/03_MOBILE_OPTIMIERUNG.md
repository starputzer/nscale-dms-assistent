---
title: "Mobile Optimierung"
version: "1.0.0"
date: "10.05.2025"
lastUpdate: "10.05.2025"
author: "Martin Heinrich"
status: "Aktiv"
priority: "Hoch"
category: "Entwicklung"
tags: ["Responsive", "Mobile", "Touch", "Optimierung", "Vue 3", "CSS"]
---

# Mobile Optimierung

> **Letzte Aktualisierung:** 10.05.2025 | **Version:** 1.0.0 | **Status:** Aktiv

## Inhaltsverzeichnis

1. [Übersicht](#übersicht)
    - [Ziele](#ziele)
    - [Aktueller Status](#aktueller-status)
2. [Mobile-First-Strategie](#mobile-first-strategie)
    - [Grundprinzipien](#grundprinzipien)
    - [Implementierungsansatz](#implementierungsansatz)
3. [Breakpoint-System](#breakpoint-system)
    - [Standardisierte Breakpoints](#standardisierte-breakpoints)
    - [CSS-Variablen](#css-variablen)
    - [SCSS-Mixins](#scss-mixins)
    - [Helper-Klassen](#helper-klassen)
4. [Responsive Layout-Techniken](#responsive-layout-techniken)
    - [Grid-System](#grid-system)
    - [Layout-Patterns](#layout-patterns)
    - [Responsive Navigation](#responsive-navigation)
5. [Touch-Optimierung](#touch-optimierung)
    - [Touch-Target-Größen](#touch-target-größen)
    - [Touch-Gesten](#touch-gesten)
    - [Feedback-Mechanismen](#feedback-mechanismen)
6. [Performance-Optimierung](#performance-optimierung)
    - [Lazy-Loading](#lazy-loading)
    - [Virtuelle Listen](#virtuelle-listen)
    - [Image-Optimierung](#image-optimierung)
    - [Caching-Strategien](#caching-strategien)
7. [Barrierefreiheit für Mobile](#barrierefreiheit-für-mobile)
    - [Touch-Fokus-Management](#touch-fokus-management)
    - [Vergrößerte Schriftgrößen](#vergrößerte-schriftgrößen)
    - [Screenreader-Unterstützung](#screenreader-unterstützung)
8. [Komponenten-Implementierungen](#komponenten-implementierungen)
    - [MobileChatView](#mobilechatview)
    - [Dokumentenkonverter](#dokumentenkonverter)
    - [Admin-Panel](#admin-panel)
    - [Session-Management](#session-management)
9. [Test-Strategien](#test-strategien)
    - [Device-Emulation](#device-emulation)
    - [E2E-Tests für Mobile](#e2e-tests-für-mobile)
10. [Best Practices](#best-practices)
    - [Entwicklungsrichtlinien](#entwicklungsrichtlinien)
    - [CSS-Best-Practices](#css-best-practices)
    - [Vue 3-spezifische Optimierungen](#vue-3-spezifische-optimierungen)

## Übersicht

Die Mobile Optimierung des nscale DMS Assistenten stellt sicher, dass die Anwendung auf allen Geräten - von Smartphones über Tablets bis hin zu Desktop-Computern - optimal funktioniert. Dies umfasst responsives Design, Touch-Interaktionen, Performance-Optimierungen und Barrierefreiheit.

### Ziele

- **Konsistente Nutzererfahrung** auf allen Geräten und Bildschirmgrößen
- **Optimierte Touch-Interaktion** für bessere Bedienbarkeit auf Touchscreens
- **Responsive Layouts** mit flüssigen Übergängen zwischen Bildschirmgrößen
- **Optimierte Performance** für Geräte mit eingeschränkten Ressourcen
- **Accessibility First** mit Fokus auf Barrierefreiheit für alle Nutzer

### Aktueller Status

#### Stärken

- Konsistentes Breakpoint-System mit CSS-Variablen
- Responsive Design für Kernkomponenten
- Mobile-optimierte Layout-Komponenten (Sidebar, Header)
- Standardisierte Touch-Direktiven
- Themenfähigkeit inklusive Dark Mode

#### Verbesserungspotenzial

- Teilweise inkonsistente Touch-Target-Größen
- Ausbaufähige Touch-Gesten-Implementierung
- Komplexe Komponenten benötigen weitere Optimierung (Admin-Panel, Tabellen)
- Performance-Optimierung für ressourcenschwache Geräte

## Mobile-First-Strategie

### Grundprinzipien

1. **Mobile First Design**:
   - Komponenten werden zuerst für mobile Geräte entworfen
   - Progressive Enhancement für größere Bildschirme
   - Funktionale Priorisierung für kleine Displays

2. **Responsive statt adaptiv**:
   - Fluid Layouts statt fester Breakpoints
   - Relative Einheiten (%, rem, vh/vw) statt Pixel
   - CSS Grid und Flexbox für dynamische Layouts

3. **Content-First Ansatz**:
   - Priorisierung wichtiger Inhalte auf kleinen Bildschirmen
   - Progressive Disclosure von sekundären Funktionen

### Implementierungsansatz

```scss
/* Mobile-First CSS-Beispiel */
.component {
  /* Mobile-Basis-Styling */
  padding: var(--nscale-space-2);
  display: flex;
  flex-direction: column;
  
  /* Tablet und größer */
  @media (min-width: var(--nscale-screen-md)) {
    padding: var(--nscale-space-4);
    flex-direction: row;
  }
  
  /* Desktop und größer */
  @media (min-width: var(--nscale-screen-lg)) {
    padding: var(--nscale-space-6);
    gap: var(--nscale-space-4);
  }
}
```

## Breakpoint-System

### Standardisierte Breakpoints

Wir verwenden ein einheitliches Breakpoint-System mit CSS-Variablen:

| Breakpoint | CSS-Variable         | Wert    | Ziel-Geräte                           |
|------------|----------------------|---------|---------------------------------------|
| xs         | --nscale-screen-xs   | 480px   | Smartphones (Portrait)                |
| sm         | --nscale-screen-sm   | 640px   | Smartphones (Landscape), kleine Tablets |
| md         | --nscale-screen-md   | 768px   | Tablets (Portrait)                    |
| lg         | --nscale-screen-lg   | 1024px  | Tablets (Landscape), kleine Desktops  |
| xl         | --nscale-screen-xl   | 1280px  | Desktop                               |
| 2xl        | --nscale-screen-2xl  | 1536px  | Große Desktops, Ultrawide             |

### CSS-Variablen

Die Breakpoints sind als CSS-Variablen im Design-System definiert und bieten eine einheitliche Basis für alle Komponenten:

```css
:root {
  --nscale-screen-xs: 480px;
  --nscale-screen-sm: 640px;
  --nscale-screen-md: 768px;
  --nscale-screen-lg: 1024px;
  --nscale-screen-xl: 1280px;
  --nscale-screen-2xl: 1536px;
}
```

### SCSS-Mixins

Zur vereinfachten Verwendung der Breakpoints stellen wir SCSS-Mixins bereit:

```scss
// Breakpoint Mixins
@mixin xs {
  @media (min-width: var(--nscale-screen-xs)) {
    @content;
  }
}

@mixin sm {
  @media (min-width: var(--nscale-screen-sm)) {
    @content;
  }
}

@mixin md {
  @media (min-width: var(--nscale-screen-md)) {
    @content;
  }
}

@mixin lg {
  @media (min-width: var(--nscale-screen-lg)) {
    @content;
  }
}

@mixin xl {
  @media (min-width: var(--nscale-screen-xl)) {
    @content;
  }
}

@mixin xxl {
  @media (min-width: var(--nscale-screen-2xl)) {
    @content;
  }
}

// Gerätetyp-Mixins
@mixin mobile-only {
  @media (max-width: calc(var(--nscale-screen-md) - 1px)) {
    @content;
  }
}

@mixin tablet-up {
  @media (min-width: var(--nscale-screen-md)) {
    @content;
  }
}

@mixin tablet-only {
  @media (min-width: var(--nscale-screen-md)) and (max-width: calc(var(--nscale-screen-lg) - 1px)) {
    @content;
  }
}

@mixin desktop-up {
  @media (min-width: var(--nscale-screen-lg)) {
    @content;
  }
}

// Orientierungs-Mixins
@mixin portrait {
  @media (orientation: portrait) {
    @content;
  }
}

@mixin landscape {
  @media (orientation: landscape) {
    @content;
  }
}
```

### Helper-Klassen

Für einfache responsive Anpassungen in den Komponenten verwenden wir vordefinierte CSS-Klassen:

```css
/* Sichtbarkeits-Helfer */
.nscale-hidden-xs {
  display: none;
}

@media (min-width: 480px) {
  .nscale-hidden-xs {
    display: initial;
  }
  
  .nscale-hidden-sm {
    display: none;
  }
}

/* Weitere Klassen für md, lg, xl... */

/* Nur auf bestimmten Bildschirmgrößen anzeigen */
.nscale-only-xs {
  display: initial;
}
@media (min-width: 480px) {
  .nscale-only-xs {
    display: none;
  }
}

/* Weitere "only"-Klassen für andere Breakpoints... */
```

## Responsive Layout-Techniken

### Grid-System

Wir verwenden ein einfaches, aber flexibles Grid-System:

```scss
.nscale-container {
  width: 100%;
  padding-right: var(--nscale-space-4);
  padding-left: var(--nscale-space-4);
  margin-right: auto;
  margin-left: auto;
  
  @include sm {
    max-width: 540px;
  }
  
  @include md {
    max-width: 720px;
  }
  
  @include lg {
    max-width: 960px;
  }
  
  @include xl {
    max-width: 1140px;
  }
  
  @include xxl {
    max-width: 1320px;
  }
}

.nscale-grid {
  display: grid;
  gap: var(--nscale-space-4);
  grid-template-columns: 1fr;
  
  &.nscale-grid-cols-sm-2 {
    @include sm {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  
  &.nscale-grid-cols-md-3 {
    @include md {
      grid-template-columns: repeat(3, 1fr);
    }
  }
  
  /* Weitere Grid-Klassen... */
}
```

### Layout-Patterns

Wir implementieren mehrere responsive Layout-Patterns:

1. **Stack-to-Horizontal Pattern**
   - Auf Mobilgeräten: Vertikale Stapelung (Flexbox column)
   - Ab Tablet: Horizontale Anordnung (Flexbox row)

2. **Off-Canvas Navigation**
   - Mobile Sidebar versteckt sich außerhalb des Bildschirms
   - Slide-in bei Bedarf mit Overlay
   - Automatisch sichtbar auf größeren Bildschirmen

3. **Responsive Tabellen**
   - Karten-basierter Ansatz für Mobilgeräte (Zeilen werden zu Karten)
   - Scrollbare Tabellen für mittlere Bildschirme
   - Vollständige Tabellen für größere Bildschirme

### Responsive Navigation

Wir verwenden unterschiedliche Navigationsmuster je nach Bildschirmgröße:

```scss
/* Mobile Navigation */
@media (max-width: 768px) {
  .nscale-sidebar {
    position: fixed;
    top: var(--nscale-header-height);
    left: 0;
    right: 0;
    bottom: 0;
    z-index: var(--nscale-z-index-fixed);
    transform: translateX(-100%);
    transition: transform var(--nscale-transition-normal) ease;
  }
  
  .nscale-sidebar.open {
    transform: translateX(0);
  }
  
  .nscale-mobile-nav-toggle {
    display: block;
  }
}

/* Desktop Navigation */
@media (min-width: 769px) {
  .nscale-sidebar {
    width: var(--nscale-sidebar-width);
    position: sticky;
    top: var(--nscale-header-height);
    height: calc(100vh - var(--nscale-header-height));
    transform: translateX(0) !important;
  }
  
  .nscale-mobile-nav-toggle {
    display: none;
  }
}
```

## Touch-Optimierung

### Touch-Target-Größen

Gemäß WCAG-Richtlinien müssen alle Touch-Targets mindestens 44×44px groß sein:

```scss
.nscale-touch-target {
  min-width: 44px;
  min-height: 44px;
  padding: var(--nscale-space-3);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  /* Optionaler extra Spielraum für kleinere visuelle Elemente */
  &::before {
    content: "";
    position: absolute;
    top: -8px;
    right: -8px;
    bottom: -8px;
    left: -8px;
  }
}
```

### Touch-Gesten

Wir haben eine dedizierte Vue-Direktive für Touch-Gesten implementiert:

```typescript
// touch-directives.ts
import { DirectiveBinding } from 'vue';

export interface TouchDirectiveOptions {
  tap?: () => void;
  longPress?: () => void;
  left?: () => void;
  right?: () => void;
  up?: () => void;
  down?: () => void;
  threshold?: number;  // Mindestdistanz für Swipe-Erkennung
  longPressTime?: number; // Millisekunden für Long-Press
}

export const vTouch = {
  beforeMount(el: HTMLElement, binding: DirectiveBinding<TouchDirectiveOptions>) {
    const options = binding.value || {};
    
    // Konfigurierbare Optionen
    const threshold = options.threshold || 50;
    const longPressTime = options.longPressTime || 500;
    
    // Touch-Handlers implementieren
    // ...
  }
}
```

Verwendung in Komponenten:

```vue
<div v-touch="{
  left: onSwipeLeft,
  right: onSwipeRight,
  longPress: onLongPress
}" class="message-item">
  {{ message.content }}
</div>
```

### Feedback-Mechanismen

Wir bieten visuelle Feedback-Mechanismen für Touch-Interaktionen:

```scss
/* Touch-Feedback mit optimiertem Tap-Highlight */
.nscale-touch-feedback {
  /* Tap-Highlight entfernen und durch eigenes Feedback ersetzen */
  -webkit-tap-highlight-color: transparent;
  
  /* Touch-Feedback bei aktivem Zustand */
  &:active {
    background-color: var(--nscale-touch-active-bg);
  }
}

/* Ripple-Effekt für Material-Design-Inspiriertes Feedback */
.nscale-touch-ripple {
  position: relative;
  overflow: hidden;
  
  // Ripple-Animation-Code
  // ...
}
```

## Performance-Optimierung

### Lazy-Loading

Wir implementieren Lazy-Loading für Komponenten, um die initiale Ladezeit zu reduzieren:

```typescript
// Lazy-Loading in Vue Router
const routes = [
  {
    path: '/admin',
    component: () => import('./views/AdminView.vue'),
    children: [
      {
        path: 'users',
        component: () => import('./components/admin/UsersPanel.vue')
      }
      // weitere Routen
    ]
  }
];
```

### Virtuelle Listen

Für große Datensätze verwenden wir virtuelle Listen, besonders wichtig auf mobilen Geräten:

```vue
<template>
  <virtual-message-list
    class="message-list"
    :messages="currentMessages"
    :session-id="currentSessionId"
    :estimated-item-size="65"
    :buffer-size="5"
    @load-more="loadMoreMessages"
  />
</template>

<script setup lang="ts">
import VirtualMessageList from '@/components/chat/enhanced/VirtualMessageList.vue';
// ...
</script>
```

### Image-Optimierung

Für optimierte Bildladezeiten verwenden wir responsive Images und Lazy-Loading:

```vue
<img
  :src="getResponsiveImage(message.attachment, 'sm')"
  :srcset="`${getResponsiveImage(message.attachment, 'sm')} 480w,
            ${getResponsiveImage(message.attachment, 'md')} 768w,
            ${getResponsiveImage(message.attachment, 'lg')} 1280w`"
  sizes="(max-width: 480px) 480px, 
         (max-width: 768px) 768px,
         1280px"
  :alt="message.attachmentAlt || 'Anhang'"
  loading="lazy"
  decoding="async"
/>
```

### Caching-Strategien

Um die Offline-Nutzung zu verbessern, implementieren wir Caching-Strategien:

```typescript
// Datencaching für Offline-Unterstützung
export const useCache = () => {
  const cache = new Map<string, { data: any, timestamp: number }>();
  const CACHE_DURATION = 60 * 60 * 1000; // 1 Stunde
  
  const storeCache = (key: string, data: any) => {
    cache.set(key, { data, timestamp: Date.now() });
    localStorage.setItem(`cache_${key}`, JSON.stringify({ data, timestamp: Date.now() }));
  };
  
  const getCache = (key: string) => {
    // Erst im Memory-Cache suchen
    if (cache.has(key)) {
      const cached = cache.get(key);
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
      }
    }
    
    // Dann in localStorage
    const stored = localStorage.getItem(`cache_${key}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Date.now() - parsed.timestamp < CACHE_DURATION) {
        cache.set(key, parsed); // in Memory-Cache speichern
        return parsed.data;
      }
    }
    
    return null;
  };
  
  return { storeCache, getCache };
};
```

## Barrierefreiheit für Mobile

### Touch-Fokus-Management

Wir implementieren verbesserte Fokus-Verwaltung für Touch-Geräte:

```typescript
// Verbesserter Fokus-Manager für Touch-Geräte
export const useFocusManagement = () => {
  // Erkennen, ob ein Touch-Gerät verwendet wird
  const isTouchDevice = ref(false);
  
  onMounted(() => {
    isTouchDevice.value = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Überwachen von Interaktionen zum Wechseln zwischen Touch und Tastatur
    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') {
        document.body.classList.add('using-touch');
        document.body.classList.remove('using-keyboard');
      }
    });
    
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        document.body.classList.add('using-keyboard');
        document.body.classList.remove('using-touch');
      }
    });
  });
  
  return { isTouchDevice };
};
```

### Vergrößerte Schriftgrößen

Für bessere Lesbarkeit auf mobilen Geräten passen wir die Schriftgrößen dynamisch an:

```scss
/* Unterstützung für erhöhte Schriftgrößen */
html {
  font-size: 100%; /* 16px Basis */
  
  @media screen and (max-width: var(--nscale-screen-md)) {
    &[data-user-font-size="large"] {
      font-size: 112.5%; /* 18px Basis für große Schrift */
    }
    
    &[data-user-font-size="x-large"] {
      font-size: 125%; /* 20px Basis für extra große Schrift */
    }
  }
}
```

### Screenreader-Unterstützung

Wir verbessern die Barrierefreiheit mit ARIA-Live-Regionen für dynamische Inhalte:

```vue
<template>
  <div class="file-upload">
    <input 
      type="file" 
      @change="handleFileChange"
      aria-describedby="upload-status"
    />
    <!-- Sichtbarer Upload-Status -->
    <div class="upload-progress" v-if="isUploading">
      {{ uploadProgress }}%
    </div>
    
    <!-- Status-Mitteilungen für Screenreader -->
    <div 
      id="upload-status" 
      class="sr-only" 
      aria-live="polite"
    >
      {{ getAccessibleStatus() }}
    </div>
  </div>
</template>

<script setup lang="ts">
const getAccessibleStatus = () => {
  if (!selectedFile.value) {
    return "Keine Datei ausgewählt";
  }
  
  if (isUploading.value) {
    return `Upload läuft. ${uploadProgress.value} Prozent abgeschlossen.`;
  }
  
  if (uploadComplete.value) {
    return `Upload abgeschlossen für Datei ${selectedFile.value.name}`;
  }
  
  if (uploadError.value) {
    return `Fehler beim Upload: ${uploadError.value}`;
  }
  
  return `Datei ${selectedFile.value.name} ausgewählt.`;
};
</script>
```

## Komponenten-Implementierungen

### MobileChatView

Wir haben eine dedizierte mobile Chat-Ansicht implementiert:

```vue
<template>
  <div class="mobile-chat-view" :class="{ 'mobile-chat-view--dark': isDarkMode }">
    <!-- Mobile Header mit Sessionwechsel und Menü -->
    <div class="mobile-chat-view__header">
      <button 
        class="mobile-chat-view__menu-btn"
        @click="toggleSessionSidebar"
        aria-label="Sessions anzeigen"
      >
        <div class="mobile-chat-view__hamburger">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </button>
      
      <div class="mobile-chat-view__title">
        {{ currentSession?.title || 'Neue Unterhaltung' }}
      </div>
      
      <button 
        class="mobile-chat-view__action-btn"
        @click="openSettings"
        aria-label="Einstellungen"
      >
        <!-- Icon -->
      </button>
    </div>
    
    <!-- Mobile Session Sidebar (Off-Canvas) -->
    <div 
      class="mobile-chat-view__session-sidebar"
      :class="{ 'mobile-chat-view__session-sidebar--visible': showSessionSidebar }"
    >
      <!-- Session-Liste -->
    </div>
    
    <!-- Weiterer Mobile Chat View Code... -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useChat } from '@/composables/useChat';
import { useTheme } from '@/composables/useTheme';
import { useDialog } from '@/composables/useDialog';
import { vTouch } from '@/directives/touch-directives';
import VirtualMessageList from '@/components/chat/enhanced/VirtualMessageList.vue';

// Composables
const { width } = useWindowSize();
const isMobile = computed(() => width.value < 768); // MD breakpoint

// Weiterer Code...
</script>
```

### Dokumentenkonverter

Der Dokumentenkonverter ist ebenfalls für mobile Nutzung optimiert:

```vue
<template>
  <div class="document-converter" :class="{ 'document-converter--mobile': isMobile }">
    <!-- Mobile-optimierte Datei-Upload-Komponente -->
    <FileUpload
      v-if="!isConverting && !conversionResult"
      :is-mobile="isMobile"
      @upload="startConversion"
    />
    
    <!-- Fortschrittsanzeige mit mobiler Optimierung -->
    <ConversionProgress
      v-if="isConverting"
      :progress="conversionProgress"
      :current-step="conversionStep"
      :is-mobile="isMobile"
      @cancel="cancelConversion"
    />
    
    <!-- Mobile-optimierte Dokumentenliste -->
    <DocumentList
      :documents="documents"
      :is-mobile="isMobile"
      :selected-document="selectedDocument"
      @select="selectDocument"
      @view="viewDocument"
      @download="downloadDocument"
      @delete="confirmDeleteDocument"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useWindowSize } from '@/composables/useWindowSize';
import { useDocumentConverter } from '@/composables/useDocumentConverter';
// ...

const { width } = useWindowSize();
const isMobile = computed(() => width.value < 768); // MD breakpoint
</script>
```

### Admin-Panel

Das Admin-Panel wurde für mobile Nutzung optimiert:

```vue
<template>
  <div class="admin-panel" :class="{ 'admin-panel--mobile': isMobile }">
    <!-- Mobile Tab-Navigation (horizontales Scrollen) -->
    <div v-if="isMobile" class="admin-panel__mobile-tabs">
      <div class="admin-panel__mobile-tabs-scroll">
        <button
          v-for="tab in availableTabs" 
          :key="tab.id"
          class="admin-panel__mobile-tab-btn nscale-touch-target"
          :class="{ 'admin-panel__mobile-tab-btn--active': activeTab === tab.id }"
          @click="setActiveTab(tab.id)"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>
    
    <!-- Desktop Sidebar Navigation -->
    <div v-else class="admin-panel__sidebar">
      <!-- Desktop Navigation -->
    </div>
    
    <!-- Tab Content -->
    <div class="admin-panel__content">
      <component 
        :is="currentTabComponent" 
        v-if="currentTabComponent"
        :is-mobile="isMobile"
      />
    </div>
  </div>
</template>
```

### Session-Management

Das Session-Management ist ebenfalls touch-optimiert:

```vue
<template>
  <div class="session-list" :class="{ 'session-list--mobile': isMobile }">
    <!-- Session-Liste mit Touch-Gesten -->
    <div class="session-list__items">
      <div 
        v-for="session in filteredSessions" 
        :key="session.id"
        class="session-list__item"
        :class="{ 'session-list__item--active': session.id === currentSessionId }"
        v-touch="{
          tap: () => selectSession(session.id),
          left: () => showSessionActions(session.id),
          longPress: () => showSessionActions(session.id)
        }"
      >
        <!-- Session Content -->
        
        <!-- Mobile-optimierte Swipe-Aktionen -->
        <div 
          v-if="activeActionsSession === session.id"
          class="session-list__item-actions"
        >
          <!-- Action Buttons -->
        </div>
      </div>
    </div>
  </div>
</template>
```

## Test-Strategien

### Device-Emulation

Zur Unterstützung der Entwicklung haben wir eine Device-Emulation implementiert:

```typescript
// useDeviceEmulation.ts
import { ref, computed } from 'vue';

type DeviceType = 'mobile' | 'tablet' | 'desktop';
type Orientation = 'portrait' | 'landscape';

export function useDeviceEmulation() {
  const devicePresets = {
    'iPhone SE': {
      width: 375,
      height: 667,
      pixelRatio: 2,
      deviceType: 'mobile' as DeviceType,
    },
    'iPhone 12': {
      width: 390,
      height: 844,
      pixelRatio: 3,
      deviceType: 'mobile' as DeviceType,
    },
    'iPad': {
      width: 768,
      height: 1024,
      pixelRatio: 2,
      deviceType: 'tablet' as DeviceType,
    },
    'Desktop': {
      width: 1280,
      height: 800,
      pixelRatio: 1,
      deviceType: 'desktop' as DeviceType,
    },
  };
  
  const currentPreset = ref<keyof typeof devicePresets>('Desktop');
  const orientation = ref<Orientation>('portrait');
  
  // Weiterer Code...
}
```

### E2E-Tests für Mobile

Wir haben spezifische E2E-Tests für mobile Ansichten implementiert:

```typescript
// e2e/tests/mobile/chat.spec.ts
import { test, expect } from '@playwright/test';
import { ChatPage } from '../../pages/ChatPage';
import { loginAsTestUser } from '../../fixtures/auth';

// Test für mobile Viewports
test.describe('Mobile Chat Interface', () => {
  // Konfigurieren des mobilen Viewports
  test.use({
    viewport: { width: 375, height: 667 }
  });

  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    
    // Überprüfen, dass wir wirklich auf dem mobilen Interface sind
    await expect(page.locator('.chat-view--mobile')).toBeVisible();
  });

  test('Kann Chat-Sessions über das Hamburger-Menü wechseln', async ({ page }) => {
    const chatPage = new ChatPage(page);
    
    // Öffne die Session-Sidebar
    await chatPage.openMobileSessionMenu();
    
    // Tests...
  });

  test('Unterstützt Swipe-Gesten bei Nachrichten', async ({ page }) => {
    const chatPage = new ChatPage(page);
    
    // Sende eine Testnachricht
    await chatPage.sendMessage('Dies ist eine Testnachricht');
    
    // Simuliere eine Swipe-Geste auf der Nachricht
    const message = page.locator('.message-item').first();
    await message.hover();
    await page.mouse.down();
    await page.mouse.move(100, 0); // Swipe nach rechts
    await page.mouse.up();
    
    // Tests...
  });
});
```

## Best Practices

### Entwicklungsrichtlinien

1. **Mobile-First-Entwicklung**
   - Design und implementiere zuerst für kleine Bildschirme
   - Verwende Progressive Enhancement für größere Bildschirme
   - Priorisiere kritische Inhalte für kleine Viewports

2. **Touch-Optimierung**
   - Touch-Targets sollten mindestens 44×44px groß sein (WCAG)
   - Implementiere angemessenes visuelles Feedback für Touch-Interaktionen
   - Nutze native Touch-Gesten (Swipe, Long-Press, etc.)
   - Vermeide Hover-basierte UI-Elemente auf Touch-Geräten

3. **Implementierungsreihenfolge**
   1. Beginne mit Layout-Komponenten und Grundstruktur
   2. Optimiere die Hauptfunktionen (Chat, Dokumentenkonverter)
   3. Verbessere die UI-Komponenten für Touch-Interaktion
   4. Implementiere erweiterte mobile Features (Gesten, offline-Support)
   5. Optimiere für verschiedene Geräte und Orientierungen

### CSS-Best-Practices

1. **Layout-Flexibilität**
   - Verwende Flexbox und CSS-Grid für flexible Layouts
   - Nutze relative Einheiten (%, rem, vh/vw) statt feste Pixel
   - Teste regelmäßig auf verschiedenen Bildschirmgrößen und Orientierungen

2. **Medien-Optimierung**
   - Verwende responsive Images (`srcset`, `sizes`)
   - Implementiere Lazy-Loading für Bilder und Komponenten
   - Optimiere Dateigröße von Bildern für schnelles Laden

3. **Vermeidung von Layout-Shifts**
   - Verwende `height: auto` für Bilder mit `width` in Prozent
   - Gib Platzhalterhöhen für dynamisch geladene Inhalte an
   - Nutze `aspect-ratio` für Bilder, um Layout-Verschiebungen zu vermeiden

### Vue 3-spezifische Optimierungen

1. **Zustandsmanagement für mobile Komponenten**
   - Nutze den `useWindowSize`-Composable für reaktive Bildschirmgrößenerkennung
   - Verwende dynamische Komponenten-Imports für mobile/desktop-spezifische Ansichten
   - Implementiere effiziente Renderingstrategien (z.B. `v-show` vs. `v-if`)

2. **Komponenten-Optimierung**
   - Lazy-Loading für komplexe Komponenten
   - Virtuelle Listen für große Datensätze
   - Mobile-spezifische Ereignishandler

3. **Performance-Optimierung**
   - Verwende `defineAsyncComponent` für Lazy-Loading
   - Implementiere `<keepalive>` für häufig verwendete, aber temporär versteckte Komponenten
   - Verwende `watchEffect` anstelle von `watch` für reaktive Berechnungen, wenn möglich

---

**Verwandte Dokumente:**
- [02_UI_BASISKOMPONENTEN.md](/opt/nscale-assist/app/docs/00_KONSOLIDIERTE_DOKUMENTATION/02_KOMPONENTEN/02_UI_BASISKOMPONENTEN.md)
- [03_CHAT_INTERFACE.md](/opt/nscale-assist/app/docs/00_KONSOLIDIERTE_DOKUMENTATION/02_KOMPONENTEN/03_CHAT_INTERFACE.md)
- [02_TESTSTRATEGIE.md](/opt/nscale-assist/app/docs/00_KONSOLIDIERTE_DOKUMENTATION/04_ENTWICKLUNG/02_TESTSTRATEGIE.md)