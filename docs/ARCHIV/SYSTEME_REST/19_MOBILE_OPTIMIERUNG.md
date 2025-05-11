# Mobile Optimierung für nScale DMS Assistent

**Letzte Aktualisierung:** 11.05.2025

Dieses Dokument beschreibt die umfassende Strategie zur Optimierung des nScale DMS Assistenten für mobile Geräte und Touch-Interaktion im Rahmen der Vue 3 SFC-Migration. Es dient als zentrale Referenz für Entwickler, um eine optimale Benutzererfahrung auf allen Geräten zu gewährleisten.

## Inhaltsverzeichnis

1. [Überblick](#überblick)
2. [Aktueller Status der mobilen Optimierung](#aktueller-status-der-mobilen-optimierung)
3. [Mobile-First-Strategie](#mobile-first-strategie)
4. [Einheitliche Breakpoints](#einheitliche-breakpoints)
5. [Layout-Anpassungen für mobile Geräte](#layout-anpassungen-für-mobile-geräte)
6. [Touch-Optimierung](#touch-optimierung)
7. [Performance-Optimierung](#performance-optimierung)
8. [Barrierefreiheit auf mobilen Geräten](#barrierefreiheit-auf-mobilen-geräten)
9. [Komponentenspezifische Optimierungen](#komponentenspezifische-optimierungen)
10. [Test-Strategien für mobile Geräte](#test-strategien-für-mobile-geräte)
11. [Best Practices](#best-practices)

## Überblick

Die mobile Optimierung des nScale DMS Assistenten verfolgt folgende Ziele:

- **Konsistente Nutzererfahrung** auf allen Geräten von Mobiltelefonen bis Desktops
- **Optimierte Touch-Interaktion** für bessere Bedienbarkeit auf Touchscreens
- **Responsive Layouts** mit flüssigen Übergängen zwischen Bildschirmgrößen
- **Optimierte Performance** für Geräte mit eingeschränkten Ressourcen
- **Accessibility First** mit Fokus auf Barrierefreiheit für alle Nutzer

## Aktueller Status der mobilen Optimierung

### Stärken des aktuellen Ansatzes

- Konsistentes Breakpoint-System mit CSS-Variablen
- Responsive Designs für mehrere Kernkomponenten
- Gute Mobile-Anpassungen für Layout-Komponenten (Sidebar, Header)
- Themenfähigkeit inklusive Dark Mode

### Verbesserungspotenzial

- Inkonsistente Touch-Target-Größen
- Fehlende Touch-Gesten für häufige Aktionen
- Optimierungsbedarf bei komplexen Komponenten (AdminPanel, Tabellen)
- Unzureichende Performance-Optimierung für ressourcenschwache Geräte

## Mobile-First-Strategie

### Grundprinzipien

1. **Mobile First Design**:
   - Komponenten zuerst für mobile Geräte entwerfen
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

## Einheitliche Breakpoints

Wir nutzen konsequent das bestehende Breakpoint-System aus dem CSS Design System:

| Breakpoint | CSS-Variable            | Wert    | Ziel-Geräte                           |
|------------|-------------------------|---------|---------------------------------------|
| xs         | --nscale-screen-xs      | 480px   | Smartphones (Portrait)                |
| sm         | --nscale-screen-sm      | 640px   | Smartphones (Landscape), kleine Tablets |
| md         | --nscale-screen-md      | 768px   | Tablets (Portrait)                    |
| lg         | --nscale-screen-lg      | 1024px  | Tablets (Landscape), kleine Desktops  |
| xl         | --nscale-screen-xl      | 1280px  | Desktop                               |
| 2xl        | --nscale-screen-2xl     | 1536px  | Große Desktops, Ultrawide             |

### Responsive Helper-Klassen

Implementierung von Helper-Klassen für konsistente Responsivität:

```scss
/* Sichtbarkeits-Helfer */
.nscale-hide-xs {
  @media (max-width: calc(var(--nscale-screen-xs) - 1px)) {
    display: none !important;
  }
}

.nscale-hide-sm-down {
  @media (max-width: calc(var(--nscale-screen-sm) - 1px)) {
    display: none !important;
  }
}

.nscale-show-md-up {
  @media (min-width: var(--nscale-screen-md)) {
    display: block !important;
  }
}

/* ...weitere Helper-Klassen... */
```

### SCSS-Mixins für einfache Verwendung

```scss
@use 'sass:math';

// Convert pixel value to rem
@function rem($pixels) {
  @return math.div($pixels, 16) * 1rem;
}

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

// Mobile-only Mixin
@mixin mobile-only {
  @media (max-width: calc(var(--nscale-screen-md) - 1px)) {
    @content;
  }
}

// Tablet Mixins
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

// Desktop Mixins
@mixin desktop-up {
  @media (min-width: var(--nscale-screen-lg)) {
    @content;
  }
}

// Portrait/Landscape
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

## Layout-Anpassungen für mobile Geräte

### Grid-System für konsistente Layouts

Wir verwenden ein simples 12-Spalten-Grid-System mit Flexbox:

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

.nscale-row {
  display: flex;
  flex-wrap: wrap;
  margin-right: calc(var(--nscale-space-2) * -1);
  margin-left: calc(var(--nscale-space-2) * -1);
}

.nscale-col {
  flex-basis: 0;
  flex-grow: 1;
  max-width: 100%;
  padding-right: var(--nscale-space-2);
  padding-left: var(--nscale-space-2);
}

// Responsive Columns
@for $i from 1 through 12 {
  .nscale-col-#{$i} {
    flex: 0 0 percentage(math.div($i, 12));
    max-width: percentage(math.div($i, 12));
  }
  
  .nscale-col-sm-#{$i} {
    @include sm {
      flex: 0 0 percentage(math.div($i, 12));
      max-width: percentage(math.div($i, 12));
    }
  }
  
  .nscale-col-md-#{$i} {
    @include md {
      flex: 0 0 percentage(math.div($i, 12));
      max-width: percentage(math.div($i, 12));
    }
  }
  
  // ...etc für weitere Breakpoints
}
```

### Layout-Patterns

1. **Stack-to-Horizontal Pattern**
   - Auf Mobilgeräten: Vertikale Stapelung (Flexbox column)
   - Ab Tablet: Horizontale Anordnung (Flexbox row)

2. **Responsive Masonry Layout**
   - Auf Mobilgeräten: Einspaltig 
   - Auf größeren Bildschirmen: Multi-Spalten-Layout mit CSS-Grid

3. **Off-Canvas Navigation**
   - Mobile Sidebar versteckt sich außerhalb des Bildschirms
   - Slide-in bei Bedarf mit Overlay
   - Automatisch sichtbar auf größeren Bildschirmen

4. **Responsive Tabellen**
   - Karten-basierter Ansatz für Mobilgeräte (Zeilen werden zu Karten)
   - Scrollbare Tabellen für mittlere Bildschirme
   - Vollständige Tabellen für größere Bildschirme

### Mobile-optimierte Navigation

1. **Bottom Navigation Bar**
   - Hauptnavigation für Mobilgeräte am unteren Bildschirmrand
   - Maximum 5 Hauptnavigationspunkte
   - Platz für Daumen-Interaktion

2. **Hamburger Menu**
   - Vollständiges Navigation-Drawer für sekundäre Navigation
   - Gestaffeltes Menü für hierarchische Navigation

3. **Breadcrumbs**
   - Kompakte, scrollbare Breadcrumbs auf Mobilgeräten
   - Automatische Kürzung mit Ellipsen für zu lange Pfade

## Touch-Optimierung

### Touch-Target-Größen

Nach WCAG-Richtlinien muss jedes Touch-Target mindestens 44×44px groß sein:

```scss
/* Touch-optimierte Button Base Klasse */
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

### Optimierte Abstände für Touch

```scss
/* Mobile-optimierte Abstände */
:root {
  --nscale-touch-item-spacing: var(--nscale-space-4); /* 16px */
  --nscale-touch-group-spacing: var(--nscale-space-6); /* 24px */
}

.nscale-touch-list {
  & > li {
    padding-top: var(--nscale-touch-item-spacing);
    padding-bottom: var(--nscale-touch-item-spacing);
  }
}
```

### Touch-Gesten-Unterstützung

Implementierung von Touch-Gesten mit Vue-Direktiven:

```typescript
// touch-directives.ts
import { DirectiveBinding } from 'vue';

interface TouchDirectiveOptions {
  left?: () => void;
  right?: () => void;
  up?: () => void;
  down?: () => void;
  tap?: () => void;
  doubleTap?: () => void;
  longPress?: () => void;
  threshold?: number;
  longPressTime?: number;
}

export const vTouch = {
  mounted(el: HTMLElement, binding: DirectiveBinding<TouchDirectiveOptions>) {
    const options = binding.value || {};
    const threshold = options.threshold || 50;
    const longPressTime = options.longPressTime || 500;
    
    let startX: number;
    let startY: number;
    let startTime: number;
    let longPressTimer: number;
    
    // Touch-Handler...
    
    el.addEventListener('touchstart', handleTouchStart);
    el.addEventListener('touchmove', handleTouchMove);
    el.addEventListener('touchend', handleTouchEnd);
  },
  
  unmounted(el: HTMLElement) {
    // Clean up event listeners
  }
};
```

Verwendung in Komponenten:

```vue
<template>
  <div v-touch="{
    left: onSwipeLeft,
    right: onSwipeRight,
    longPress: onLongPress
  }" class="message-item">
    {{ message.content }}
  </div>
</template>

<script setup lang="ts">
const onSwipeLeft = () => {
  // Zeige Aktionsmenü
};

const onSwipeRight = () => {
  // Nachricht als favorit markieren
};

const onLongPress = () => {
  // Zeige Kontextmenü
};
</script>
```

### Feedback-Muster für Touch-Interaktionen

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
  
  &::after {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    width: 5px;
    height: 5px;
    background: rgba(var(--nscale-ripple-color-rgb), 0.3);
    opacity: 1;
    border-radius: 100%;
    transform: scale(1);
    transform-origin: 50% 50%;
    animation: ripple 850ms ease-out;
  }
}

@keyframes ripple {
  0% {
    transform: scale(0);
    opacity: 1;
  }
  20% {
    transform: scale(25);
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: scale(40);
  }
}
```

## Performance-Optimierung

### Lazy-Loading für Komponenten

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
      },
      // ...weitere Routen
    ]
  }
];
```

### Virtuelle Listen für große Datensätze

```vue
<template>
  <virtual-list
    class="message-list"
    :data-key="'id'"
    :data-sources="messages"
    :data-component="MessageItem"
    :estimate-size="70"
    :buffer="10"
  />
</template>

<script setup lang="ts">
import { VirtualList } from '@/components/virtual-list';
import MessageItem from '@/components/chat/MessageItem.vue';

// Nachrichtenquelle...
</script>
```

### Optimiertes Bildladen

```vue
<template>
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
</template>

<script setup lang="ts">
const getResponsiveImage = (path: string, size: 'sm' | 'md' | 'lg') => {
  if (!path) return '';
  const extension = path.split('.').pop();
  const basePath = path.slice(0, -(extension.length + 1));
  return `${basePath}-${size}.${extension}`;
};
</script>
```

### DOM-Manipulation-Optimierung

```typescript
// Effizientes DOM-Update mit Batch-Prozess
const scheduleDomUpdate = (() => {
  let scheduled = false;
  const updates = new Set<() => void>();
  
  return (update: () => void) => {
    updates.add(update);
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        updates.forEach(update => update());
        updates.clear();
      });
    }
  };
})();
```

### Cache-Strategien

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

## Barrierefreiheit auf mobilen Geräten

### Touch-Fokus-Management

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

### Anpassung für große Schriftgrößen

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

/* Zusätzliche Container-Anpassungen für große Schriftgrößen */
[data-user-font-size="x-large"] {
  .nscale-container {
    padding-left: var(--nscale-space-3);
    padding-right: var(--nscale-space-3);
  }
  
  .nscale-tab-buttons {
    flex-wrap: wrap;
  }
}
```

### Status-Mitteilungen für Screenreader

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

## Komponentenspezifische Optimierungen

### ChatView-Optimierung

```vue
<template>
  <div class="chat-view" :class="{ 'chat-view--mobile': isMobile }">
    <!-- Mobile Header mit Sessionwechsel-Dropdown -->
    <div v-if="isMobile" class="chat-view__mobile-header">
      <button 
        class="nscale-touch-target chat-view__menu-button"
        @click="showSessionSidebar = !showSessionSidebar"
        aria-label="Sessions anzeigen"
      >
        <MenuIcon />
      </button>
      <div class="chat-view__session-title">
        {{ currentSession?.title || 'Neue Konversation' }}
      </div>
      <button 
        class="nscale-touch-target chat-view__new-session"
        @click="createNewSession"
        aria-label="Neue Konversation"
      >
        <PlusIcon />
      </button>
    </div>
    
    <!-- Mobile Session Sidebar (Off-Canvas) -->
    <div 
      v-if="isMobile" 
      class="chat-view__session-sidebar"
      :class="{ 'chat-view__session-sidebar--visible': showSessionSidebar }"
    >
      <SessionList
        @select-session="selectSession"
        @close="showSessionSidebar = false"
      />
    </div>
    
    <!-- Backdrop for mobile sidebar -->
    <div 
      v-if="isMobile && showSessionSidebar" 
      class="chat-view__backdrop"
      @click="showSessionSidebar = false"
    ></div>
    
    <!-- Chat Container -->
    <div class="chat-view__container">
      <!-- Desktop SessionList Sidebar -->
      <SessionList
        v-if="!isMobile"
        class="chat-view__desktop-sidebar"
        @select-session="selectSession"
      />
      
      <!-- Chat Content -->
      <div class="chat-view__content">
        <div 
          class="chat-view__messages"
          ref="messageContainer"
          @scroll="handleScroll"
        >
          <VirtualMessageList 
            :messages="messages"
            :estimated-item-size="70"
            :buffer-size="isMobile ? 5 : 10"
          />
        </div>
        
        <div class="chat-view__input">
          <ChatInput
            :disabled="isStreaming"
            :is-mobile="isMobile"
            @send="sendMessage"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useChat } from '@/composables/useChat';
import { useWindowSize } from '@/composables/useWindowSize';
import SessionList from '@/components/chat/SessionList.vue';
import VirtualMessageList from '@/components/chat/enhanced/VirtualMessageList.vue';
import ChatInput from '@/components/chat/ChatInput.vue';
import MenuIcon from '@/components/icons/MenuIcon.vue';
import PlusIcon from '@/components/icons/PlusIcon.vue';

const { width } = useWindowSize();
const isMobile = computed(() => width.value < 768); // MD breakpoint
const showSessionSidebar = ref(false);

// Weitere Implementierung...
</script>

<style lang="scss" scoped>
.chat-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  
  &__mobile-header {
    display: flex;
    align-items: center;
    padding: var(--nscale-space-2);
    border-bottom: 1px solid var(--nscale-border);
    height: 60px;
  }
  
  &__menu-button,
  &__new-session {
    color: var(--nscale-muted);
    
    &:hover, &:focus {
      color: var(--nscale-primary);
    }
  }
  
  &__session-title {
    flex: 1;
    text-align: center;
    font-weight: var(--nscale-font-weight-medium);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 0 var(--nscale-space-2);
  }
  
  &__session-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100%;
    width: 80%;
    max-width: 300px;
    background: var(--nscale-background);
    z-index: var(--nscale-z-index-modal);
    transform: translateX(-100%);
    transition: transform var(--nscale-transition-normal) ease;
    box-shadow: var(--nscale-shadow-lg);
    
    &--visible {
      transform: translateX(0);
    }
  }
  
  &__backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: calc(var(--nscale-z-index-modal) - 1);
  }
  
  &__container {
    flex: 1;
    display: flex;
    overflow: hidden;
  }
  
  &__desktop-sidebar {
    width: 280px;
    border-right: 1px solid var(--nscale-border);
    overflow-y: auto;
    
    @media (min-width: 1280px) {
      width: 320px;
    }
  }
  
  &__content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  &__messages {
    flex: 1;
    overflow-y: auto;
    padding: var(--nscale-space-4);
    
    @media (max-width: 480px) {
      padding: var(--nscale-space-2);
    }
  }
  
  &__input {
    border-top: 1px solid var(--nscale-border);
    padding: var(--nscale-space-3);
    
    @media (max-width: 480px) {
      padding: var(--nscale-space-2);
    }
  }
}
</style>
```

### DocumentConverter-Optimierung

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
import FileUpload from '@/components/admin/document-converter/FileUpload.vue';
import ConversionProgress from '@/components/admin/document-converter/ConversionProgress.vue';
import DocumentList from '@/components/admin/document-converter/DocumentList.vue';

const { width } = useWindowSize();
const isMobile = computed(() => width.value < 768); // MD breakpoint

// Weitere Implementierung...
</script>

<style lang="scss" scoped>
.document-converter {
  padding: var(--nscale-space-4);
  
  &--mobile {
    padding: var(--nscale-space-2);
  }
  
  /* Mobile-spezifische Anpassungen */
  @media (max-width: 480px) {
    .document-converter__actions {
      display: flex;
      flex-direction: column;
      gap: var(--nscale-space-2);
    }
    
    /* Touch-optimierte Buttons */
    .document-converter__action-btn {
      min-height: 44px;
      width: 100%;
      justify-content: center;
    }
  }
}
</style>
```

### AdminPanel-Optimierung

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
      <div class="admin-panel__sidebar-header">
        Admin Panel
      </div>
      <nav class="admin-panel__nav">
        <button
          v-for="tab in availableTabs" 
          :key="tab.id"
          class="admin-panel__nav-btn"
          :class="{ 'admin-panel__nav-btn--active': activeTab === tab.id }"
          @click="setActiveTab(tab.id)"
        >
          <component :is="tab.icon" class="admin-panel__nav-icon" />
          <span class="admin-panel__nav-label">{{ tab.label }}</span>
        </button>
      </nav>
    </div>
    
    <!-- Tab Content -->
    <div class="admin-panel__content">
      <component 
        :is="currentTabComponent" 
        v-if="currentTabComponent"
        :is-mobile="isMobile"
      />
      <div v-else class="admin-panel__loading">
        <LoadingSpinner />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.admin-panel {
  display: flex;
  height: 100%;
  
  &--mobile {
    flex-direction: column;
  }
  
  &__mobile-tabs {
    border-bottom: 1px solid var(--nscale-border);
    overflow-x: auto;
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE/Edge */
    
    &::-webkit-scrollbar {
      display: none; /* Chrome/Safari */
    }
  }
  
  &__mobile-tabs-scroll {
    display: flex;
    padding: var(--nscale-space-2);
  }
  
  &__mobile-tab-btn {
    padding: var(--nscale-space-2) var(--nscale-space-3);
    white-space: nowrap;
    border-radius: var(--nscale-border-radius-md);
    background: transparent;
    border: none;
    color: var(--nscale-muted);
    font-weight: var(--nscale-font-weight-medium);
    
    &--active {
      background: var(--nscale-primary);
      color: white;
    }
  }
  
  &__sidebar {
    width: 240px;
    border-right: 1px solid var(--nscale-border);
    display: flex;
    flex-direction: column;
  }
  
  /* Weitere Desktop-Styling... */
  
  &__content {
    flex: 1;
    overflow: auto;
    padding: var(--nscale-space-4);
    
    @media (max-width: 480px) {
      padding: var(--nscale-space-2);
    }
  }
}
</style>
```

### SessionManagement-Optimierung für Touch

```vue
<template>
  <div class="session-list" :class="{ 'session-list--mobile': isMobile }">
    <div class="session-list__header">
      <h2 class="session-list__title">Konversationen</h2>
      <button 
        class="session-list__new-btn nscale-touch-target"
        @click="createNewSession"
        aria-label="Neue Konversation"
      >
        <PlusIcon />
      </button>
    </div>
    
    <div class="session-list__search">
      <input 
        type="text"
        v-model="searchQuery"
        placeholder="Suchen..."
        class="session-list__search-input"
      />
    </div>
    
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
        <div class="session-list__item-content">
          <div class="session-list__item-title">{{ session.title }}</div>
          <div class="session-list__item-date">{{ formatDate(session.lastActive) }}</div>
        </div>
        
        <!-- Mobile-optimierte Swipe-Aktionen -->
        <div 
          v-if="activeActionsSession === session.id"
          class="session-list__item-actions"
        >
          <button 
            class="session-list__action-btn session-list__action-btn--edit nscale-touch-target"
            @click="editSession(session.id)"
          >
            <EditIcon />
          </button>
          <button 
            class="session-list__action-btn session-list__action-btn--delete nscale-touch-target"
            @click="confirmDeleteSession(session.id)"
          >
            <TrashIcon />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useWindowSize } from '@/composables/useWindowSize';
import { useSessions } from '@/composables/useSessions';
import { useDialog } from '@/composables/useDialog';
import { vTouch } from '@/directives/touch-directives';
import PlusIcon from '@/components/icons/PlusIcon.vue';
import EditIcon from '@/components/icons/EditIcon.vue';
import TrashIcon from '@/components/icons/TrashIcon.vue';

const { width } = useWindowSize();
const isMobile = computed(() => width.value < 768);
const activeActionsSession = ref<string | null>(null);

// Funktionen für Session-Management...

// Mobile-spezifische Funktionen
const showSessionActions = (sessionId: string) => {
  if (activeActionsSession.value === sessionId) {
    activeActionsSession.value = null;
  } else {
    activeActionsSession.value = sessionId;
  }
};

// Weitere Implementierung...
</script>

<style lang="scss" scoped>
.session-list {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--nscale-background);
  
  &__header {
    display: flex;
    align-items: center;
    padding: var(--nscale-space-3);
    border-bottom: 1px solid var(--nscale-border);
  }
  
  &__title {
    flex: 1;
    font-size: var(--nscale-font-size-lg);
    font-weight: var(--nscale-font-weight-semibold);
    margin: 0;
  }
  
  &__new-btn {
    color: var(--nscale-primary);
    background: transparent;
    border: none;
    cursor: pointer;
    
    &:hover, &:focus {
      color: var(--nscale-primary-dark);
    }
  }
  
  &__search {
    padding: var(--nscale-space-2);
    border-bottom: 1px solid var(--nscale-border);
  }
  
  &__search-input {
    width: 100%;
    padding: var(--nscale-space-2);
    border-radius: var(--nscale-border-radius-md);
    border: 1px solid var(--nscale-border);
    background: var(--nscale-background);
    color: var(--nscale-foreground);
    
    &::placeholder {
      color: var(--nscale-muted);
    }
    
    &:focus {
      outline: none;
      border-color: var(--nscale-primary);
    }
  }
  
  &__items {
    flex: 1;
    overflow-y: auto;
  }
  
  &__item {
    position: relative;
    display: flex;
    padding: var(--nscale-space-3);
    border-bottom: 1px solid var(--nscale-border);
    cursor: pointer;
    transition: background-color var(--nscale-transition-quick);
    overflow: hidden; /* For swipe actions */
    
    &:hover {
      background-color: var(--nscale-muted-light);
    }
    
    &--active {
      background-color: var(--nscale-primary-ultra-light);
      border-left: 3px solid var(--nscale-primary);
    }
  }
  
  &__item-content {
    flex: 1;
  }
  
  &__item-title {
    font-weight: var(--nscale-font-weight-medium);
    margin-bottom: var(--nscale-space-1);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  &__item-date {
    font-size: var(--nscale-font-size-sm);
    color: var(--nscale-muted);
  }
  
  /* Mobile-optimierte Swipe-Aktionen */
  &__item-actions {
    display: flex;
    position: absolute;
    right: 0;
    top: 0;
    height: 100%;
    background: var(--nscale-background);
  }
  
  &__action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 60px;
    height: 100%;
    border: none;
    
    &--edit {
      background-color: var(--nscale-info);
      color: white;
    }
    
    &--delete {
      background-color: var(--nscale-error);
      color: white;
    }
  }
  
  /* Mobile-spezifische Anpassungen */
  &--mobile {
    .session-list__item {
      padding: var(--nscale-space-4) var(--nscale-space-3);
    }
    
    .session-list__new-btn {
      padding: var(--nscale-space-2);
    }
  }
}
</style>
```

## Test-Strategien für mobile Geräte

### Device-Emulation im Entwicklungsprozess

```typescript
// useDeviceEmulation.ts
import { ref, computed } from 'vue';

type DeviceType = 'mobile' | 'tablet' | 'desktop';
type Orientation = 'portrait' | 'landscape';

interface DeviceEmulation {
  deviceType: DeviceType;
  orientation: Orientation;
  width: number;
  height: number;
  pixelRatio: number;
  isTouchEnabled: boolean;
}

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
  
  const currentEmulation = computed<DeviceEmulation>(() => {
    const preset = devicePresets[currentPreset.value];
    const isPortrait = orientation.value === 'portrait';
    
    return {
      deviceType: preset.deviceType,
      orientation: orientation.value,
      width: isPortrait ? preset.width : preset.height,
      height: isPortrait ? preset.height : preset.width,
      pixelRatio: preset.pixelRatio,
      isTouchEnabled: preset.deviceType !== 'desktop',
    };
  });
  
  const setDevice = (device: keyof typeof devicePresets) => {
    currentPreset.value = device;
  };
  
  const toggleOrientation = () => {
    orientation.value = orientation.value === 'portrait' ? 'landscape' : 'portrait';
  };
  
  return {
    devicePresets,
    currentPreset,
    orientation,
    currentEmulation,
    setDevice,
    toggleOrientation,
  };
}
```

### Playwright-Tests für mobile Ansichten

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
    
    // Überprüfe, ob die Session-Liste angezeigt wird
    await expect(page.locator('.chat-view__session-sidebar--visible')).toBeVisible();
    
    // Erstelle eine neue Session und wähle sie aus
    await chatPage.createNewSession('Mobile Test Session');
    
    // Überprüfe, ob die Session-Liste nach Auswahl geschlossen wurde
    await expect(page.locator('.chat-view__session-sidebar--visible')).not.toBeVisible();
    
    // Überprüfe, ob der Titel im Header korrekt angezeigt wird
    const sessionTitle = page.locator('.chat-view__session-title');
    await expect(sessionTitle).toHaveText('Mobile Test Session');
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
    
    // Überprüfe, ob das Aktionsmenü angezeigt wird
    await expect(page.locator('.message-actions')).toBeVisible();
  });
});
```

## Best Practices

### Mobile-First-Entwicklung

- Design und implementiere zuerst für kleine Bildschirme
- Verwende Progressive Enhancement für größere Bildschirme
- Priorisiere kritische Inhalte für kleine Viewports

### Touch-Optimierung

- Touch-Targets sollten mindestens 44×44px groß sein (WCAG)
- Implementiere angemessenes visuelles Feedback für Touch-Interaktionen
- Nutze native Touch-Gesten (Swipe, Long-Press, etc.)
- Vermeide Hover-basierte UI-Elemente auf Touch-Geräten

### Layout-Flexibilität

- Verwende Flexbox und CSS-Grid für flexible Layouts
- Nutze relative Einheiten (%, rem, vh/vw) statt feste Pixel
- Teste regelmäßig auf verschiedenen Bildschirmgrößen und Orientierungen

### Performance-Optimierung

- Reduziere DOM-Größe durch Komponenten-Aufteilung
- Implementiere Lazy-Loading für Komponenten und Bilder
- Optimiere Animationen für mobile Prozessoren
- Implementiere Offline-Support für mobile Anwendungen

### Barrierefreiheit

- Prüfe Kontrast für Außennutzung auf mobilen Geräten
- Optimiere für Screenreader mit ARIA-Attributen
- Unterstütze Vergrößerungsfunktionen und große Schriftgrößen
- Teste mit verschiedenen Eingabemethoden (Touch, Sprache, Tastatur)

### Implementierungsreihenfolge

1. Beginne mit Layout-Komponenten und Grundstruktur
2. Optimiere die Hauptfunktionen (Chat, Dokumentenkonverter)
3. Verbessere die UI-Komponenten für Touch-Interaktion
4. Implementiere erweiterte mobile Features (Gesten, offline-Support)
5. Optimiere für verschiedene Geräte und Orientierungen

---

**Verwandte Dokumente:**
- [12_CSS_DESIGN_SYSTEM.md](./12_CSS_DESIGN_SYSTEM.md) - Grundlegende Design-Tokens und Variablen
- [02_FRONTEND_ARCHITEKTUR.md](/opt/nscale-assist/app/docs/01_ARCHITEKTUR/02_FRONTEND_ARCHITEKTUR.md) - Allgemeine Frontend-Architektur
- [E2E_TESTSTRATEGIE.md](/opt/nscale-assist/app/docs/02_ENTWICKLUNG/E2E_TESTSTRATEGIE.md) - Strategie für E2E-Tests inklusive mobile Tests