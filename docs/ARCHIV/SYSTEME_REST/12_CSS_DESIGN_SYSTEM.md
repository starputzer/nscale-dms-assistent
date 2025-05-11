# CSS Design System für den nScaleDMS Assistenten

**Letzte Aktualisierung: 11.05.2025**

Dieses Dokument beschreibt das einheitliche CSS-Variablen-System und die Designgrundlagen für den nScale DMS Assistenten im Rahmen der Migration von Vanilla JS zu Vue 3 Single File Components (SFCs). Es dient als zentrale Referenz für Entwickler, um ein konsistentes visuelles Erscheinungsbild und eine verbesserte Benutzerfreundlichkeit über alle Komponenten hinweg zu gewährleisten.

> **WICHTIG**: Die Implementierung wurde abgeschlossen. Das Design-System ist jetzt in allen Haupt-Entry-Points integriert und kann verwendet werden. Eine Beispielkomponente `DesignSystemDemo.vue` wurde erstellt, um alle Features des Design-Systems zu demonstrieren.
>
> **UPDATE 11.05.2025**: Das Design-System wurde um umfassende Mobile-First-Prinzipien erweitert. Siehe [Mobile-First-Ansatz](#mobile-first-ansatz) und die ausführliche Dokumentation in [19_MOBILE_OPTIMIERUNG.md](./19_MOBILE_OPTIMIERUNG.md).

## Inhaltsverzeichnis

1. [Überblick](#überblick)
2. [Design-Tokens](#design-tokens)
3. [Semantische Variablen](#semantische-variablen)
4. [Theming-System](#theming-system)
5. [Komponenten-Variablen](#komponenten-variablen)
6. [Responsive Breakpoints](#responsive-breakpoints)
7. [Mobile-First-Ansatz](#mobile-first-ansatz)
8. [Barrierefreiheit](#barrierefreiheit)
9. [Verwendung in Vue-Komponenten](#verwendung-in-vue-komponenten)
10. [Migration von bestehenden Komponenten](#migration-von-bestehenden-komponenten)
11. [Best Practices](#best-practices)

## Überblick

Das CSS Design System löst folgende Herausforderungen:

- **Inkonsistenzen im Legacy-Code**: Einheitliches Variablensystem mit konsistenter Benennung
- **Doppelte Präfixe**: Standardisierung auf ein einziges Präfix `--nscale-`
- **Theming-Schwierigkeiten**: Robuste Dark Mode und Kontrast-Modus-Unterstützung
- **Responsivitätsprobleme**: Einheitliches Breakpoint-System und responsive Mixins
- **Wartbarkeit**: Hierarchisches Variablensystem für einfache Updates

Die Lösung basiert auf einem hierarchischen Design-Token-System:

1. **Design Tokens**: Grundlegende visuelle Eigenschaften (Farben, Typografie, Abstände)
2. **Semantische Variablen**: Bedeutungsvolle Abstraktionen der Design Tokens (z.B. Primärfarbe)
3. **Komponenten-Variablen**: Spezifische Anwendungen für UI-Komponenten (z.B. Button-Hintergrund)

## Design-Tokens

Design Tokens sind die grundlegenden Bausteine des visuellen Designs und dienen als Single Source of Truth.

### Farbpalette

Alle Grundfarben sind als Design Tokens definiert:

```css
:root {
  /* Primäre Markenfarben */
  --nscale-color-green-50: #f0faf5;
  --nscale-color-green-100: #e0f5ea;
  --nscale-color-green-200: #c3ebda;
  /* ... weitere Abstufungen ... */
  --nscale-color-green-500: #00a550; /* Hauptmarkenfarbe */
  --nscale-color-green-600: #009046;
  --nscale-color-green-700: #006e34;
  --nscale-color-green-800: #004f25;
  --nscale-color-green-900: #00391b;

  /* Neutralfarben */
  --nscale-color-gray-50: #f8f9fa;
  --nscale-color-gray-100: #f0f2f5;
  --nscale-color-gray-200: #e2e8f0;
  /* ... weitere Abstufungen ... */
  --nscale-color-gray-900: #0f172a;
  --nscale-color-white: #ffffff;
  --nscale-color-black: #000000;

  /* Feedbackfarben */
  --nscale-color-red-500: #dc2626;    /* Fehler */
  --nscale-color-red-100: #fee2e2;    /* Fehler (leicht) */
  --nscale-color-amber-500: #f59e0b;  /* Warnung */
  --nscale-color-amber-100: #fef3c7;  /* Warnung (leicht) */
  --nscale-color-blue-500: #3b82f6;   /* Info */
  --nscale-color-blue-100: #dbeafe;   /* Info (leicht) */
  --nscale-color-emerald-500: #10b981; /* Erfolg */
  --nscale-color-emerald-100: #d1fae5; /* Erfolg (leicht) */
}
```

### Typografie

Typografische Design Tokens definieren Schriftfamilien, -größen, -gewichte und Zeilenhöhen:

```css
:root {
  /* Schriftfamilien */
  --nscale-font-family-base: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Oxygen, Ubuntu, 'Helvetica Neue', sans-serif;
  --nscale-font-family-mono: 'Consolas', 'Monaco', 'Andale Mono', 'Ubuntu Mono', monospace;
  
  /* Schriftgrößen - skalieren mit rem für Barrierefreiheit */
  --nscale-font-size-xs: 0.75rem;    /* 12px */
  --nscale-font-size-sm: 0.875rem;   /* 14px */
  --nscale-font-size-base: 1rem;     /* 16px */
  --nscale-font-size-lg: 1.125rem;   /* 18px */
  --nscale-font-size-xl: 1.25rem;    /* 20px */
  --nscale-font-size-2xl: 1.5rem;    /* 24px */
  --nscale-font-size-3xl: 1.875rem;  /* 30px */
  --nscale-font-size-4xl: 2.25rem;   /* 36px */
  
  /* Schriftgewichte */
  --nscale-font-weight-light: 300;
  --nscale-font-weight-normal: 400;
  --nscale-font-weight-medium: 500;
  --nscale-font-weight-semibold: 600;
  --nscale-font-weight-bold: 700;
  
  /* Zeilenhöhen */
  --nscale-line-height-none: 1;
  --nscale-line-height-tight: 1.25;
  --nscale-line-height-normal: 1.5;
  --nscale-line-height-relaxed: 1.75;
}
```

### Abstandssystem

Ein konsistentes 4px-Raster bildet die Grundlage für alle Abstände:

```css
:root {
  --nscale-space-1: 0.25rem;   /* 4px */
  --nscale-space-2: 0.5rem;    /* 8px */
  --nscale-space-3: 0.75rem;   /* 12px */
  --nscale-space-4: 1rem;      /* 16px */
  --nscale-space-5: 1.25rem;   /* 20px */
  --nscale-space-6: 1.5rem;    /* 24px */
  --nscale-space-8: 2rem;      /* 32px */
  --nscale-space-10: 2.5rem;   /* 40px */
  --nscale-space-12: 3rem;     /* 48px */
  --nscale-space-16: 4rem;     /* 64px */
  --nscale-space-20: 5rem;     /* 80px */
  --nscale-space-24: 6rem;     /* 96px */
}
```

### Komponentenstilisierung 

Grundlegende Tokens für Komponenten-Stilisierung:

```css
:root {
  /* Rahmenradien */
  --nscale-border-radius-none: 0;
  --nscale-border-radius-sm: 0.25rem; /* 4px */
  --nscale-border-radius-md: 0.5rem;  /* 8px */
  --nscale-border-radius-lg: 0.75rem; /* 12px */
  --nscale-border-radius-xl: 1rem;    /* 16px */
  --nscale-border-radius-2xl: 1.5rem; /* 24px */
  --nscale-border-radius-full: 9999px;
  
  /* Schatten */
  --nscale-shadow-none: none;
  --nscale-shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --nscale-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --nscale-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --nscale-shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  
  /* Übergangszeiten */
  --nscale-transition-quick: 150ms;
  --nscale-transition-normal: 300ms;
  --nscale-transition-slow: 500ms;
  
  /* Z-Indizes */
  --nscale-z-index-hide: -1;
  --nscale-z-index-base: 0;
  --nscale-z-index-raised: 10;
  --nscale-z-index-dropdown: 1000;
  --nscale-z-index-sticky: 1020;
  --nscale-z-index-fixed: 1030;
  --nscale-z-index-popover: 1040;
  --nscale-z-index-modal: 1050;
  --nscale-z-index-tooltip: 1060;
  --nscale-z-index-notification: 1070;
}
```

## Semantische Variablen

Semantische Variablen geben Design Tokens eine funktionale Bedeutung und erleichtern Theming. Sie referenzieren Design Tokens anstatt direkt Werte zu definieren.

```css
:root {
  /* Primärfarben */
  --nscale-primary: var(--nscale-color-green-500);
  --nscale-primary-dark: var(--nscale-color-green-600);
  --nscale-primary-light: var(--nscale-color-green-200);
  --nscale-primary-ultra-light: var(--nscale-color-green-50);
  
  /* Feedbackfarben */
  --nscale-error: var(--nscale-color-red-500);
  --nscale-error-light: var(--nscale-color-red-100);
  --nscale-warning: var(--nscale-color-amber-500);
  --nscale-warning-light: var(--nscale-color-amber-100);
  --nscale-success: var(--nscale-color-emerald-500);
  --nscale-success-light: var(--nscale-color-emerald-100);
  --nscale-info: var(--nscale-color-blue-500);
  --nscale-info-light: var(--nscale-color-blue-100);
  
  /* Neutrale Farben */
  --nscale-background: var(--nscale-color-white);
  --nscale-foreground: var(--nscale-color-gray-800);
  --nscale-muted: var(--nscale-color-gray-500);
  --nscale-muted-light: var(--nscale-color-gray-200);
  --nscale-border: var(--nscale-color-gray-200);
  --nscale-focus-ring: rgba(0, 165, 80, 0.5);
}
```

## Theming-System

Das Theming-System unterstützt drei Modi: Light (Standard), Dark und Kontrast. Jeder Modus wird durch Überschreiben der semantischen Variablen implementiert, ohne die Design Tokens zu ändern.

### Light-Mode (Standard)

Standardeinstellungen in der Root-Definition.

### Dark-Mode

```css
[data-theme="dark"] {
  /* Anpassung der semantischen Farben */
  --nscale-primary: var(--nscale-color-green-400);
  --nscale-primary-dark: var(--nscale-color-green-500);
  --nscale-primary-light: var(--nscale-color-green-800);
  --nscale-primary-ultra-light: var(--nscale-color-green-900);
  
  /* Hintergrund und Text */
  --nscale-background: var(--nscale-color-gray-900);
  --nscale-foreground: var(--nscale-color-gray-100);
  --nscale-muted: var(--nscale-color-gray-400);
  --nscale-muted-light: var(--nscale-color-gray-700);
  --nscale-border: var(--nscale-color-gray-700);
  --nscale-focus-ring: rgba(86, 197, 150, 0.5);
  
  /* ... weitere Dark-Mode-Überschreibungen ... */
}
```

### Kontrast-Mode

```css
[data-theme="contrast"] {
  /* Anpassung der Primärfarbe für höheren Kontrast */
  --nscale-primary: #ffeb3b; /* Gelb für höheren Kontrast */
  --nscale-primary-dark: #ffd600;
  --nscale-primary-light: #fff9c4;
  --nscale-primary-ultra-light: #fffde7;
  
  /* Neutrale Farben mit höherem Kontrast */
  --nscale-background: var(--nscale-color-black);
  --nscale-foreground: var(--nscale-color-white);
  
  /* ... weitere Kontrast-Modus-Anpassungen ... */
}
```

### Theming-Implementierung

Das Theme-Management erfolgt über das Attribut `data-theme` am HTML-Element:

```javascript
// Themewechsel über JavaScript
document.documentElement.setAttribute('data-theme', 'dark');

// Oder themewechsel in Vue.js mit dem Composition API
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('nscale-theme', theme);
}
```

## Komponenten-Variablen

Komponenten-Variablen sind spezifische Anwendungen der semantischen Variablen für bestimmte UI-Elemente.

### Button-Komponenten

```css
:root {
  /* Button-Variablen */
  --nscale-btn-primary-bg: var(--nscale-primary);
  --nscale-btn-primary-text: var(--nscale-color-white);
  --nscale-btn-primary-border: transparent;
  --nscale-btn-primary-hover-bg: var(--nscale-primary-dark);
  --nscale-btn-primary-active-bg: var(--nscale-color-green-700);
  --nscale-btn-primary-focus-ring: var(--nscale-focus-ring);
  
  --nscale-btn-secondary-bg: var(--nscale-color-white);
  --nscale-btn-secondary-text: var(--nscale-primary);
  --nscale-btn-secondary-border: var(--nscale-primary);
  --nscale-btn-secondary-hover-bg: var(--nscale-primary-ultra-light);
  --nscale-btn-secondary-active-bg: var(--nscale-primary-light);
  
  /* ... weitere Button-Varianten ... */
}
```

### Form-Elemente

```css
:root {
  /* Form-Elemente */
  --nscale-input-bg: var(--nscale-background);
  --nscale-input-text: var(--nscale-foreground);
  --nscale-input-border: var(--nscale-border);
  --nscale-input-focus-border: var(--nscale-primary);
  --nscale-input-placeholder: var(--nscale-muted);
  --nscale-input-disabled-bg: var(--nscale-color-gray-100);
  --nscale-input-disabled-text: var(--nscale-muted);
  
  /* ... weitere Form-Element-Variablen ... */
}
```

### Chat-Komponenten

```css
:root {
  /* Chat-Komponenten */
  --nscale-message-user-bg: var(--nscale-primary-light);
  --nscale-message-user-text: var(--nscale-foreground);
  --nscale-message-user-border: transparent;
  
  --nscale-message-assistant-bg: var(--nscale-background);
  --nscale-message-assistant-text: var(--nscale-foreground);
  --nscale-message-assistant-border: var(--nscale-border);
  
  /* ... weitere Chat-Komponenten-Variablen ... */
}
```

## Responsive Breakpoints

Das System verwendet einen "Mobile First"-Ansatz mit definierten Breakpoints:

```css
:root {
  --nscale-screen-xs: 480px;  /* Smartphones (Portrait) */
  --nscale-screen-sm: 640px;  /* Smartphones (Landscape), kleine Tablets */
  --nscale-screen-md: 768px;  /* Tablets (Portrait) */
  --nscale-screen-lg: 1024px; /* Tablets (Landscape), kleine Desktops */
  --nscale-screen-xl: 1280px; /* Desktop */
  --nscale-screen-2xl: 1536px; /* Große Desktops, Ultrawide */
}
```

### SCSS-Mixins für responsive Design

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

### Verwendung der Mixins

```scss
.my-component {
  // Basis-Styling für mobile Geräte
  padding: var(--nscale-space-2);
  display: flex;
  flex-direction: column;

  // Tablet und größer
  @include md {
    padding: var(--nscale-space-4);
    flex-direction: row;
  }

  // Desktop und größer
  @include lg {
    padding: var(--nscale-space-6);
    gap: var(--nscale-space-4);
  }
}
```

### Responsive Container Klassen

Das Design-System stellt Utility-Klassen für responsive Container bereit:

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
```

## Mobile-First-Ansatz

Das Design-System folgt einem Mobile-First-Ansatz, bei dem Komponenten zuerst für mobile Geräte entwickelt und dann progressiv für größere Bildschirme erweitert werden.

### Grundprinzipien des Mobile-First-Designs

1. **Basisdesign für Mobilgeräte**: Alle Komponenten werden zunächst für die kleinste Bildschirmgröße entwickelt
2. **Progressive Enhancement**: Funktionalität und Layout werden für größere Bildschirme schrittweise erweitert
3. **Optimierte Touch-Interaktion**: Primäre Ausrichtung auf Touch-Eingaben statt auf Maus und Tastatur
4. **Reduzierte Komplexität**: Fokus auf wesentliche Funktionen auf kleinen Bildschirmen

### CSS-Variablen für Touch-Optimierung

```css
:root {
  /* Touch-optimierte Variablen */
  --nscale-touch-target-size: 44px;          /* Minimale Zielgröße für Touch nach WCAG */
  --nscale-touch-target-spacing: 8px;        /* Abstand zwischen Touch-Zielen */
  --nscale-active-state-feedback: 150ms;     /* Dauer für visuelles Touch-Feedback */
  --nscale-touch-scroll-momentum: 0.8;      /* Scroll-Momentum für Touch-Oberflächen */

  /* Erweiterte Touch-Variablen */
  --nscale-tap-highlight-color: transparent; /* Anpassbare Tap-Highlight-Farbe */
  --nscale-touch-ripple-color-rgb: 0, 0, 0;  /* Farbe für Ripple-Effekt (RGB für Opacity) */
}

[data-theme="dark"] {
  --nscale-touch-ripple-color-rgb: 255, 255, 255;
}
```

### Touch-optimierte Komponenten

Alle interaktiven Komponenten sind für Touch-Bedienung optimiert:

```scss
/* Touch-optimierter Button */
.nscale-touch-btn {
  min-height: var(--nscale-touch-target-size);
  min-width: var(--nscale-touch-target-size);
  padding: var(--nscale-space-3) var(--nscale-space-4);
  border-radius: var(--nscale-border-radius-md);
  -webkit-tap-highlight-color: var(--nscale-tap-highlight-color);
  position: relative;
  overflow: hidden; /* Für Ripple-Effekt */

  /* Touch-Feedback */
  &:active {
    transform: scale(0.98);
    transition: transform var(--nscale-active-state-feedback);
  }

  /* Optional: Sicherheitsabstand für kleine visuelle Elemente */
  &.nscale-touch-extended::before {
    content: "";
    position: absolute;
    top: -8px;
    right: -8px;
    bottom: -8px;
    left: -8px;
  }
}
```

### Adaptive Layouts

Das Design-System bietet verschiedene Layout-Patterns für die Optimierung auf verschiedenen Geräten:

1. **Stack-to-Horizontal Pattern**
   ```scss
   .nscale-stack-to-row {
     display: flex;
     flex-direction: column;

     @include md {
       flex-direction: row;
     }
   }
   ```

2. **Responsive Grid System**
   ```scss
   .nscale-grid {
     display: grid;
     grid-template-columns: 1fr;
     gap: var(--nscale-space-4);

     @include sm {
       grid-template-columns: repeat(2, 1fr);
     }

     @include lg {
       grid-template-columns: repeat(4, 1fr);
     }
   }
   ```

3. **Off-Canvas Navigation**
   ```scss
   .nscale-off-canvas {
     position: fixed;
     top: 0;
     left: 0;
     width: 80%;
     max-width: 300px;
     height: 100%;
     transform: translateX(-100%);
     transition: transform var(--nscale-transition-normal);
     z-index: var(--nscale-z-index-modal);

     &.nscale-off-canvas--visible {
       transform: translateX(0);
     }

     @include lg {
       position: static;
       transform: none;
       width: 240px;
     }
   }
   ```

Weitere ausführliche Informationen zur mobilen Optimierung finden sich in der [Mobile-Optimierungsdokumentation](./19_MOBILE_OPTIMIERUNG.md).

## Barrierefreiheit

Das Design-System wurde mit einem starken Fokus auf Barrierefreiheit entwickelt:

### Farbkontrast

Alle Farbkombinationen erfüllen die WCAG 2.1 AA-Anforderungen für Kontrast:
- Text auf Hintergründen hat ein Kontrastverhältnis von mindestens 4,5:1
- Großer Text hat ein Kontrastverhältnis von mindestens 3:1
- UI-Komponenten haben ein Kontrastverhältnis von mindestens 3:1 zu angrenzenden Farben

### Reduzierte Bewegung

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

.reduce-motion * {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
  scroll-behavior: auto !important;
}
```

### Fokus-Stile

```css
:focus-visible {
  outline: 2px solid var(--nscale-focus-ring-color);
  outline-offset: 2px;
}

[data-theme="dark"] :focus-visible {
  outline-color: var(--nscale-primary);
}

[data-theme="contrast"] :focus-visible {
  outline-width: 3px;
}
```

## Verwendung in Vue-Komponenten

### Import der SCSS-Datei

In der Haupt-`main.js` (oder `main.ts`) Datei:

```javascript
// CSS Design System Import
import '@/assets/design-system.scss';
```

### Theme-Integration in Vue 3 mit Composition API

```typescript
// useTheme.ts
import { ref, watch, onMounted } from 'vue';

export function useTheme() {
  const THEMES = {
    LIGHT: 'light',
    DARK: 'dark',
    CONTRAST: 'contrast'
  };
  
  const currentTheme = ref(localStorage.getItem('nscale-theme') || THEMES.LIGHT);
  const useSystemTheme = ref(localStorage.getItem('nscale-system-theme') === 'true');
  
  // Theme anwenden
  function applyTheme(theme: string) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nscale-theme', theme);
    currentTheme.value = theme;
  }
  
  // Theme umschalten
  function toggleTheme() {
    const newTheme = currentTheme.value === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
    applyTheme(newTheme);
  }
  
  // System-Theme-Präferenz überwachen
  function listenToSystemPreference() {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      if (useSystemTheme.value) {
        applyTheme(e.matches ? THEMES.DARK : THEMES.LIGHT);
      }
    };
    
    // Initialen Zustand prüfen
    handleChange(darkModeMediaQuery);
    
    // Auf Änderungen reagieren
    darkModeMediaQuery.addEventListener('change', handleChange);
    
    // Aufräumen bei Komponenten-Unmount
    return () => {
      darkModeMediaQuery.removeEventListener('change', handleChange);
    };
  }
  
  // System-Theme-Einstellung ändern
  function setUseSystemTheme(value: boolean) {
    useSystemTheme.value = value;
    localStorage.setItem('nscale-system-theme', value.toString());
    
    if (value) {
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(isDarkMode ? THEMES.DARK : THEMES.LIGHT);
    }
  }
  
  // Beim Komponenten-Mount initialisieren
  onMounted(() => {
    const cleanup = listenToSystemPreference();
    
    // Initialen Theme-Zustand anwenden
    applyTheme(currentTheme.value);
  });
  
  return {
    currentTheme,
    useSystemTheme,
    setTheme: applyTheme,
    toggleTheme,
    setUseSystemTheme,
    THEMES
  };
}
```

### Verwendung in einer Vue-Komponente

```vue
<script setup>
import { useTheme } from '@/composables/useTheme';

const { currentTheme, toggleTheme, THEMES } = useTheme();
</script>

<template>
  <button class="nscale-btn" @click="toggleTheme">
    {{ currentTheme === THEMES.LIGHT ? 'Dark Mode' : 'Light Mode' }}
  </button>
</template>

<style scoped>
.nscale-btn {
  background-color: var(--nscale-btn-primary-bg);
  color: var(--nscale-btn-primary-text);
  border: 1px solid var(--nscale-btn-primary-border);
  padding: var(--nscale-space-2) var(--nscale-space-4);
  border-radius: var(--nscale-border-radius-md);
  font-weight: var(--nscale-font-weight-medium);
  cursor: pointer;
  transition: background-color var(--nscale-transition-quick) ease;
}

.nscale-btn:hover {
  background-color: var(--nscale-btn-primary-hover-bg);
}
</style>
```

## Migration von bestehenden Komponenten

### Migrationsprozess

1. **Variablen-Ersetzung**: Ersetze bestehende CSS-Variablen mit dem neuen einheitlichen Präfix
2. **Hardcoded Werte ersetzen**: Hardcodierte Farbwerte durch CSS-Variablen ersetzen
3. **Themes einbinden**: Stellen Sie sicher, dass die Dark Mode und Kontrast-Implementierung das `data-theme`-Attribut verwendet
4. **Konsistente Benennung**: Verwende die semantischen Namen anstelle direkter Farbwerte
5. **Import sicherstellen**: Überprüfe, dass das design-system.scss in den Haupteintrittspunkten importiert wird

### Migrationsbeispiel

**Vor der Migration:**

```css
.message-user {
  background-color: #e0f5ea; /* Hardcodierter Wert */
  color: #1e293b;
  border-radius: 8px;
}

.message-assistant {
  background-color: var(--n-background-color); /* Alter Präfix */
  color: var(--n-text-color);
  border: 1px solid var(--n-border-color);
  border-radius: 8px;
}

/* Alte Dark-Mode-Implementierung */
@media (prefers-color-scheme: dark) {
  .message-user {
    background-color: #004f25;
    color: #f0f2f5;
  }

  .message-assistant {
    background-color: #1e293b;
    color: #f0f2f5;
    border-color: #334155;
  }
}
```

**Nach der Migration:**

```css
.message-user {
  background-color: var(--nscale-message-user-bg);
  color: var(--nscale-message-user-text);
  border-radius: var(--nscale-border-radius-md);
}

.message-assistant {
  background-color: var(--nscale-message-assistant-bg);
  color: var(--nscale-message-assistant-text);
  border: 1px solid var(--nscale-message-assistant-border);
  border-radius: var(--nscale-border-radius-md);
}

/* Keine Dark-Mode-Überschreibungen notwendig, da dies durch
   das zentrale Theming-System über data-theme="dark" gehandhabt wird */
```

### Migrationsschritte für bestehende Komponenten

1. **Identifikation**: Identifiziere alle CSS-Variablen und hardcodierten Werte in der Komponente
2. **Mapping**: Ordne diese Werte den neuen CSS-Variablen zu
3. **Ersetzung**: Ersetze die alten Variablen/Werte mit den neuen Variablen
4. **Theme-Anpassung**: Entferne komponentenspezifische Dark-Mode-Implementierungen
5. **useTheme Integration**: Verwende den `useTheme` Composable anstelle eigener Theme-Logik
6. **Testen**: Teste die Komponente in allen Theme-Modi
7. **Dokumentation**: Dokumentiere alle migrierten CSS-Variablen

### Bereits migrierte Komponenten

Folgende Komponenten wurden bereits auf das neue Design-System umgestellt:

1. `App.vue` - Hauptanwendungskomponente
2. `ThemeSwitcher.vue` - Komponente zur Themenumschaltung
3. `DesignSystemDemo.vue` - Demonstrationskomponente (unter `components/examples/`)

Die Migration aller weiteren Komponenten sollte sukzessive nach diesem Muster erfolgen.

## Best Practices

### CSS-Variablen-Verwendung

- **Direkte Farbwerte vermeiden**: Immer CSS-Variablen für Farben verwenden, nicht Hexcodes oder RGB-Werte direkt
- **Design Tokens vs. semantische Variablen**: Verwende semantische Variablen (`--nscale-primary`) für Komponenten anstatt Design Tokens (`--nscale-color-green-500`)
- **Fallbacks vermeiden**: Keine Komponenten-spezifischen Fallback-Werte definieren, sondern die zentralen Variablen nutzen
- **SCSS-Import**: Stelle sicher, dass `design-system.scss` importiert wird, nicht einzelne Variablen in mehreren Dateien definiert werden

### Theming

- **Data-Attribute verwenden**: Nutze `data-theme="dark"` anstatt Media Queries oder Klassen für Dark Mode
- **useTheme Composable verwenden**: Nutze den `useTheme` Composable für Theme-Management in Vue-Komponenten
- **Systemeinstellungen respektieren**: Biete die Option, das System-Theme zu verwenden, aber erlaube Benutzern auch die manuelle Auswahl
- **Kontrast-Modus anbieten**: Implementiere einen Kontrast-Modus für bessere Barrierefreiheit
- **ThemeSwitcher einbauen**: Verwende die `ThemeSwitcher.vue` Komponente als Standard-UI für Themenumschaltung

### Komponentengestaltung

- **Standardisierte Abstände**: Verwende das 4px-Raster-System (`--nscale-space-*`) für alle Abstände
- **Konsistente Radien**: Verwende die vordefinieren Border-Radius-Variablen für alle Rundungen
- **Transitions verwenden**: Nutze die Transitions-Variablen für einheitliche Animationszeiten
- **DesignSystemDemo als Referenz**: Nutze die `DesignSystemDemo.vue` Komponente als Referenz für die korrekte Verwendung von Variablen

### Wartung

- **Neue Variablen zentral definieren**: Füge neue Variablen zu `design-system.scss` hinzu, nicht in einzelnen Komponenten
- **Dokumentation aktualisieren**: Halte diese Dokumentation aktuell, wenn neue Variablen hinzugefügt werden
- **Jährliche Überprüfung**: Führe eine jährliche Überprüfung des Design-Systems durch, um Inkonsistenzen zu identifizieren
- **Verwendung überwachen**: Prüfe regelmäßig, ob Komponenten die CSS-Variablen korrekt verwenden und nicht auf veraltete Stile zurückgreifen

---

**Verwandte Dokumente:**
- [10_BASIS_UI_KOMPONENTEN.md](./10_BASIS_UI_KOMPONENTEN.md) - Details zu den Basis-UI-Komponenten
- [17_KOMPONENTEN_BIBLIOTHEK.md](./17_KOMPONENTEN_BIBLIOTHEK.md) - Dokumentation der Komponenten-Bibliothek
- [06_VUE3_SFC_DOKUMENTENKONVERTER.md](./06_VUE3_SFC_DOKUMENTENKONVERTER.md) - Beispiel für die Verwendung des Design-Systems

**Beispiel-Komponenten:**
- `/src/components/ui/ThemeSwitcher.vue` - Standard-Komponente zur Theme-Umschaltung
- `/src/components/examples/DesignSystemDemo.vue` - Umfassende Demo aller Design-System-Features
- `/src/App.vue` - Beispiel für Integration des Theme-Systems in der Haupt-App-Komponente