---
title: "CSS Design System und Komponenten-Bibliothek"
version: "1.0.0"
date: "10.05.2025"
lastUpdate: "10.05.2025"
author: "Martin Heinrich"
status: "Aktiv"
priority: "Hoch"
category: "Komponenten"
tags: ["Design System", "CSS", "SCSS", "Komponenten", "UI", "Vue 3", "Theming", "Responsive"]
---

# CSS Design System und Komponenten-Bibliothek

> **Letzte Aktualisierung:** 13.05.2025 | **Version:** 1.0.0 | **Status:** Aktiv

## Inhaltsverzeichnis

1. [Übersicht](#übersicht)
   - [Ziele](#ziele)
   - [Vorteile](#vorteile) 
2. [Design-Tokens](#design-tokens)
   - [Farbpalette](#farbpalette)
   - [Typografie](#typografie)
   - [Abstandssystem](#abstandssystem)
   - [Radius und Schatten](#radius-und-schatten)
3. [Responsive Breakpoint-System](#responsive-breakpoint-system)
   - [Standardisierte Breakpoints](#standardisierte-breakpoints)
   - [SCSS-Mixins](#scss-mixins)
   - [Helper-Klassen](#helper-klassen)
4. [Theming-System](#theming-system)
   - [CSS-Variablen](#css-variablen)
   - [Theme-Varianten](#theme-varianten)
   - [Integration in Vue 3](#integration-in-vue-3)
5. [Mobile-First-Ansatz](#mobile-first-ansatz)
   - [Grundprinzipien](#grundprinzipien-des-mobile-first-designs)
   - [Touch-Optimierung](#touch-optimierung)
6. [SCSS-Architektur](#scss-architektur)
   - [Dateistruktur](#dateistruktur)
   - [Variablen-Modularisierung](#variablen-modularisierung)
   - [Funktionen und Mixins](#funktionen-und-mixins)
   - [Utility-Klassen](#utility-klassen)
7. [Komponenten-Bibliothek](#komponenten-bibliothek)
   - [Komponenten-Übersicht](#komponenten-übersicht)
   - [Basiskomponenten](#basiskomponenten)
   - [Form-Komponenten](#form-komponenten)
   - [Layout-Komponenten](#layout-komponenten)
   - [Feedback-Komponenten](#feedback-komponenten)
   - [Daten-Komponenten](#daten-komponenten)
   - [Navigation-Komponenten](#navigation-komponenten)
   - [Spezifische nScale-Komponenten](#spezifische-nscale-komponenten)
8. [Design-Prinzipien und Richtlinien](#design-prinzipien-und-richtlinien)
   - [Konsistenz](#konsistenz)
   - [Zugänglichkeit (A11y)](#zugänglichkeit-a11y)
   - [Modularität und Wiederverwendbarkeit](#modularität-und-wiederverwendbarkeit)
   - [Performance](#performance)
9. [Verwendungsbeispiele](#verwendungsbeispiele)
   - [Button und Formular-Elemente](#button-und-formular-elemente)
   - [Layout und Navigation](#layout-und-navigation)
   - [Datentabellen und Listen](#datentabellen-und-listen)
   - [Feature-Toggle-Integration](#feature-toggle-integration)
10. [Performance-Optimierung](#performance-optimierung)
    - [Lazy-Loading](#lazy-loading)
    - [Virtuelle Listen](#virtuelle-listen)
    - [Bundle-Optimierung](#bundle-optimierung)
11. [Integration und Nutzung](#integration-und-nutzung)
    - [Installation und Setup](#installation-und-setup)
    - [Migration von bestehenden Komponenten](#migration-von-bestehenden-komponenten)
    - [Technische Integration](#technische-integration)
12. [Best Practices](#best-practices)
    - [CSS-Variablen-Verwendung](#css-variablen-verwendung)
    - [Theming](#theming-best-practices)
    - [Komponentengestaltung](#komponentengestaltung)
    - [Responsive Design](#responsive-design)

## Übersicht

Das CSS Design System und die Komponenten-Bibliothek des nscale DMS Assistenten bilden die Grundlage für ein konsistentes, zugängliches und reaktionsfähiges Benutzererlebnis. Das System umfasst ein hierarchisches Design-Token-System, ein umfassendes SCSS-Framework und eine vollständige Vue 3-Komponenten-Bibliothek.

### Ziele

- **Konsistente Benutzererfahrung** über alle Geräte und Bildschirmgrößen hinweg
- **Erhöhte Entwicklungseffizienz** durch wiederverwendbare Komponenten und Patterns
- **Optimierte Barrierefreiheit** gemäß WCAG 2.1 AA-Standards
- **Flexibles Theming-System** für Hell-, Dunkel- und Kontrastmodus
- **Mobile-First-Ansatz** mit optimierter Touch-Interaktion
- **Performance-Optimierung** für alle Geräte und Netzwerkbedingungen

### Vorteile

- **Einheitliches Variablensystem** mit konsistenter Benennung
- **Standardisierung auf ein einziges Präfix** (`--nscale-`)
- **Robustes Theming-System** mit Dark Mode und Kontrast-Modus-Unterstützung
- **Einheitliches Breakpoint-System** mit responsiven Mixins
- **Hierarchisches Variablensystem** für einfache Updates
- **Vollständig typisierte Komponenten** mit TypeScript-Unterstützung
- **SCSS-basierte Architektur** für erweiterte Funktionalität

## Design-Tokens

Design-Tokens sind die grundlegenden Bausteine des visuellen Designs und dienen als Single Source of Truth für alle Gestaltungselemente.

### Farbpalette

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

Die Farbpalette umfasst primäre Markenfarben, Neutralfarben und funktionale Feedbackfarben, jeweils in verschiedenen Abstufungen für unterschiedliche Anwendungsfälle.

### Typografie

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

Die typografischen Design-Tokens definieren Schriftfamilien, -größen, -gewichte und Zeilenhöhen, um eine konsistente Textdarstellung zu gewährleisten.

### Abstandssystem

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

Ein konsistentes 4px-Raster bildet die Grundlage für alle Abstände im Design-System, was harmonische und proportionale Layouts gewährleistet.

### Radius und Schatten

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

Diese Design-Tokens definieren grundlegende Aspekte der Komponentengestaltung wie Rundungen, Schattenwürfe, Übergangsdauern und Z-Achsen-Stapelreihenfolge.

## Responsive Breakpoint-System

### Standardisierte Breakpoints

Das Design-System verwendet ein einheitliches Breakpoint-System mit CSS-Variablen:

| Breakpoint | CSS-Variable          | Wert   | Ziel-Geräte                           |
|------------|----------------------|---------|---------------------------------------|
| xs         | --nscale-screen-xs   | 480px   | Smartphones (Portrait)                |
| sm         | --nscale-screen-sm   | 640px   | Smartphones (Landscape), kleine Tablets |
| md         | --nscale-screen-md   | 768px   | Tablets (Portrait)                    |
| lg         | --nscale-screen-lg   | 1024px  | Tablets (Landscape), kleine Desktops  |
| xl         | --nscale-screen-xl   | 1280px  | Desktop                               |
| 2xl        | --nscale-screen-2xl  | 1536px  | Große Desktops, Ultrawide             |

Die Breakpoints sind als CSS-Variablen im Design-System definiert:

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

Für eine einfachere Verwendung der Breakpoints in SCSS stehen folgende Mixins zur Verfügung:

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

Für einfache responsive Anpassungen in den Komponenten werden vordefinierte CSS-Klassen verwendet:

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

/* Nur auf bestimmten Bildschirmgrößen anzeigen */
.nscale-only-xs {
  display: initial;
}
@media (min-width: 480px) {
  .nscale-only-xs {
    display: none;
  }
}
```

## Theming-System

### CSS-Variablen

Das Theming-System basiert auf semantischen CSS-Variablen, die auf die Design-Tokens verweisen:

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

### Theme-Varianten

Das Theming-System unterstützt drei Modi: Light (Standard), Dark und Kontrast. Jeder Modus wird durch Überschreiben der semantischen Variablen implementiert:

#### Dark-Mode

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
}
```

#### Kontrast-Mode

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
  
  /* Weitere Anpassungen für besseren Kontrast */
  --nscale-focus-ring-color: rgba(255, 255, 255, 0.8);
  --nscale-border: var(--nscale-color-white);
}
```

### Integration in Vue 3

Das Theming-System ist vollständig in Vue 3 integriert über einen `useTheme` Composable:

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

## Mobile-First-Ansatz

### Grundprinzipien des Mobile-First-Designs

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

### Touch-Optimierung

Das Design-System bietet umfassende Touch-Optimierung mit speziellen CSS-Variablen:

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
```

Eine dedizierte Vue-Direktive für Touch-Gesten erleichtert die Touch-Interaktion:

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
    
    // Touch-Handler-Implementierung...
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

## SCSS-Architektur

### Dateistruktur

Das SCSS Design System ist in thematisch getrennte Dateien gegliedert:

```
/src/assets/styles/
  ├── _variables.scss    # Zentrale Design-Tokens und Variablen
  ├── _typography.scss   # Typografie-Stile und Text-Formatierung
  ├── _layout.scss       # Grid, Flexbox und andere Layout-Systeme
  ├── _forms.scss        # Formular-Elemente und Eingabefeld-Styling
  └── main.scss          # Haupt-Entry-Point, importiert alle Module
```

### Variablen-Modularisierung

Alle Variablen wurden in `_variables.scss` modularisiert und folgen einem strukturierten Benennungsschema:

```scss
// Typography
$font-size-xs: 0.75rem;    // 12px
$font-size-sm: 0.875rem;   // 14px
$font-size-base: 1rem;     // 16px
$font-size-md: 1.125rem;   // 18px
// ...

// Spacing (basierend auf 4px-Grid)
$spacing-0: 0;
$spacing-1: 0.25rem;   // 4px
$spacing-2: 0.5rem;    // 8px
// ...

// Colors
$primary-500: #6366f1;
$primary-600: #4f46e5;
// ...

// Responsive breakpoints
$breakpoint-sm: 576px;
$breakpoint-md: 768px;
// ...
```

Diese SCSS-Variablen werden dann in CSS-Variablen umgewandelt:

```scss
:root {
  // Übertragung der SCSS-Variablen auf CSS-Variablen
  --primary-500: #{$primary-500};
  --spacing-4: #{$spacing-4};
  // ...
}
```

### Funktionen und Mixins

Das SCSS-System stellt erweiterte Funktionen und Mixins bereit:

```scss
// Spacing-Funktion für flexiblere Anpassung
@function spacing($multiplier) {
  @return $spacing-1 * $multiplier;
}

// Responsive Breakpoint Mixins
@mixin up($breakpoint) {
  @media (min-width: $breakpoint) {
    @content;
  }
}

@mixin down($breakpoint) {
  @media (max-width: $breakpoint - 1px) {
    @content;
  }
}

// Typografie-Mixins
@mixin heading-1 {
  font-size: $font-size-3xl;
  font-weight: $font-weight-bold;
  line-height: $line-height-tight;
}

// Kontrast-Funktion
@function contrast-color($background-color) {
  $r: red($background-color);
  $g: green($background-color);
  $b: blue($background-color);
  
  $yiq: (($r * 299) + ($g * 587) + ($b * 114)) / 1000;
  
  @return if($yiq >= 150, $gray-900, $white);
}
```

### Utility-Klassen

Das SCSS Design System bietet umfangreiche Utility-Klassen für häufige Styling-Muster:

```scss
// Margin und Padding Utilites generieren
$spacings: (
  '0': $spacing-0,
  '1': $spacing-1,
  '2': $spacing-2,
  '3': $spacing-3,
  '4': $spacing-4,
  '5': $spacing-5,
  '6': $spacing-6,
  // ...
);

$sides: (
  'm': 'margin',
  'p': 'padding'
);

$directions: (
  't': 'top',
  'r': 'right',
  'b': 'bottom',
  'l': 'left',
  'x': ('left', 'right'),
  'y': ('top', 'bottom'),
  '': ''
);

@each $space-key, $space-value in $spacings {
  @each $side-key, $side-value in $sides {
    @each $direction-key, $direction-value in $directions {
      $class-name: if($direction-key == '', '#{$side-key}', '#{$side-key}#{$direction-key}');
      
      .#{$class-name}-#{$space-key} {
        // Utility-Klassen-Generierung
      }
    }
  }
}
```

## Komponenten-Bibliothek

Die nscale Komponenten-Bibliothek ist eine umfassende Sammlung von Vue 3 Single File Components (SFCs), die auf dem nscale Design-System basieren.

### Komponenten-Übersicht

| Kategorie | Anzahl | Fertigstellung | A11y-Konformität |
|-----------|--------|----------------|------------------|
| Formularelemente | 15 | 100% | WCAG 2.1 AA |
| Layout | 10 | 100% | WCAG 2.1 AA |
| Feedback | 10 | 100% | WCAG 2.1 AA |
| Navigation | 9 | 100% | WCAG 2.1 AA |
| Daten | 11 | 90% | WCAG 2.1 AA |
| nscale-spezifisch | 9 | 100% | WCAG 2.1 AA |

### Basiskomponenten

Die Button-Komponente bildet die Grundlage für interaktive Elemente:

```vue
<script setup>
import { computed } from 'vue';

const props = defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'secondary', 'tertiary', 'danger', 'ghost'].includes(value)
  },
  size: {
    type: String,
    default: 'medium',
    validator: (value) => ['small', 'medium', 'large'].includes(value)
  },
  disabled: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  },
  fullWidth: {
    type: Boolean,
    default: false
  },
  iconLeft: {
    type: [Object, Function],
    default: null
  },
  iconRight: {
    type: [Object, Function],
    default: null
  }
});

const emit = defineEmits(['click']);

const buttonClasses = computed(() => [
  'nscale-button',
  `nscale-button--${props.variant}`,
  `nscale-button--${props.size}`,
  {
    'nscale-button--disabled': props.disabled,
    'nscale-button--loading': props.loading,
    'nscale-button--full-width': props.fullWidth
  }
]);

const handleClick = (event) => {
  if (!props.disabled && !props.loading) {
    emit('click', event);
  }
};
</script>

<template>
  <button
    :class="buttonClasses"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <span v-if="loading" class="nscale-button__loader"></span>
    <component v-if="iconLeft" :is="iconLeft" class="nscale-button__icon-left" />
    <span class="nscale-button__content">
      <slot></slot>
    </span>
    <component v-if="iconRight" :is="iconRight" class="nscale-button__icon-right" />
  </button>
</template>

<style lang="scss" scoped>
.nscale-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--nscale-font-family-base);
  font-weight: var(--nscale-font-weight-medium);
  border-radius: var(--nscale-border-radius-md);
  transition: 
    background-color var(--nscale-transition-quick),
    color var(--nscale-transition-quick),
    border-color var(--nscale-transition-quick),
    box-shadow var(--nscale-transition-quick);
  cursor: pointer;
  white-space: nowrap;
  text-decoration: none;
  
  &--disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  &--loading {
    position: relative;
    cursor: wait;
    
    .nscale-button__content {
      visibility: hidden;
    }
    
    .nscale-button__loader {
      position: absolute;
      display: block;
      width: 1em;
      height: 1em;
      border: 2px solid currentColor;
      border-top-color: transparent;
      border-radius: 50%;
      animation: button-loader 0.8s linear infinite;
    }
  }
  
  // Varianten
  &--primary {
    background-color: var(--nscale-btn-primary-bg);
    color: var(--nscale-btn-primary-text);
    border: 1px solid var(--nscale-btn-primary-border);
    
    &:hover:not(:disabled) {
      background-color: var(--nscale-btn-primary-hover-bg);
    }
    
    &:active:not(:disabled) {
      background-color: var(--nscale-btn-primary-active-bg);
    }
    
    &:focus {
      box-shadow: 0 0 0 3px var(--nscale-btn-primary-focus-ring);
      outline: none;
    }
  }
  
  // Weitere Varianten...
  
  // Größen
  &--small {
    padding: var(--nscale-space-1) var(--nscale-space-2);
    font-size: var(--nscale-font-size-sm);
  }
  
  &--medium {
    padding: var(--nscale-space-2) var(--nscale-space-4);
    font-size: var(--nscale-font-size-base);
  }
  
  &--large {
    padding: var(--nscale-space-3) var(--nscale-space-6);
    font-size: var(--nscale-font-size-lg);
  }
  
  &--full-width {
    width: 100%;
  }
  
  &__icon-left {
    margin-right: var(--nscale-space-2);
  }
  
  &__icon-right {
    margin-left: var(--nscale-space-2);
  }
}

@keyframes button-loader {
  to { 
    transform: rotate(360deg);
  }
}
</style>
```

### Form-Komponenten

Die Komponenten-Bibliothek bietet eine umfassende Palette an Formular-Komponenten:

| Komponente | Beschreibung | Status |
|------------|--------------|--------|
| Input | Texteingabefeld mit Validierung | ✅ |
| Checkbox | Auswahlkästchen für Booleanwerte | ✅ |
| Radio | Optionsauswahl für einzelne Werte | ✅ |
| Select | Dropdown-Auswahl für Listen | ✅ |
| Textarea | Mehrzeiliges Texteingabefeld | ✅ |
| Switch | Toggle-Schalter | ✅ |
| Slider | Schieberegler für numerische Werte | ✅ |
| DatePicker | Datumsauswahl | ✅ |
| TimePicker | Zeitauswahl | ✅ |
| FileUpload | Datei-Upload-Komponente | ✅ |
| ColorPicker | Farbauswahl | ✅ |
| AutoComplete | Texteingabe mit Vorschlägen | ✅ |
| FormGroup | Container für Formularelemente | ✅ |
| FormLabel | Label für Formularelemente | ✅ |
| FormMessage | Hilfetext oder Fehlermeldung | ✅ |

### Layout-Komponenten

Für die Gestaltung von Layouts bietet die Bibliothek verschiedene Komponenten:

| Komponente | Beschreibung | Status |
|------------|--------------|--------|
| Container | Hauptcontainer | ✅ |
| Grid | Flexibles Rastersystem | ✅ |
| Row | Zeilenkomponente | ✅ |
| Col | Spaltenkomponente | ✅ |
| Divider | Horizontaler oder vertikaler Teiler | ✅ |
| Card | Kartenkomponente | ✅ |
| Panel | Einfacher Container mit Header | ✅ |
| AspectRatio | Container mit festem Seitenverhältnis | ✅ |
| Spacer | Flexibler Abstandshalter | ✅ |
| SplitPane | Teilbares Panel | ✅ |

### Feedback-Komponenten

Für Benutzer-Feedback und Benachrichtigungen stehen folgende Komponenten zur Verfügung:

| Komponente | Beschreibung | Status |
|------------|--------------|--------|
| Alert | Informations- oder Warnmeldung | ✅ |
| Toast | Kurzzeitige Benachrichtigung | ✅ |
| Dialog | Modal-Dialog | ✅ |
| Drawer | Seitliches Panel | ✅ |
| Snackbar | Kurze Statusmeldung | ✅ |
| Progress | Fortschrittsanzeige | ✅ |
| Spinner | Ladeanzeige | ✅ |
| Skeleton | Lade-Platzhalter | ✅ |
| Badge | Statusabzeichen | ✅ |
| Banner | Informationsbanner | ✅ |

### Daten-Komponenten

Für die Darstellung und Manipulation von Daten bietet die Bibliothek:

| Komponente | Beschreibung | Status |
|------------|--------------|--------|
| Table | Datentabelle mit Sortierung und Filterung | ✅ |
| List | Flexible Listendarstellung | ✅ |
| Tree | Hierarchische Baumstruktur | ✅ |
| Calendar | Kalenderansicht | ✅ |
| Tag | Kennzeichnung oder Label | ✅ |
| Pagination | Seitenumbruchnavigation | ✅ |
| DataGrid | Erweitertes Datenraster | 🔄 |
| Timeline | Zeitliche Abfolge | 🔄 |
| Avatar | Benutzeravatar | 🔄 |
| Chip | Interaktives Label | 🔄 |
| Tooltip | Informations-Popup | 🔄 |

### Navigation-Komponenten

Für die Navigation innerhalb der Anwendung stehen folgende Komponenten zur Verfügung:

| Komponente | Beschreibung | Status |
|------------|--------------|--------|
| Navbar | Hauptnavigationsleiste | ✅ |
| Sidebar | Seitennavigation | ✅ |
| Tabs | Tab-Navigation | ✅ |
| Breadcrumbs | Breadcrumb-Navigation | ✅ |
| Menu | Mehrstufiges Navigationsmenü | ✅ |
| Pagination | Seitenumbruchnavigation | ✅ |
| Stepper | Schrittweise Navigation | ✅ |
| Dropdown | Dropdown-Menü | ✅ |
| NavigationRail | Vertikale Navigationsleiste | ✅ |

### Spezifische nScale-Komponenten

Speziell für nScale-Anwendungen bietet die Bibliothek:

| Komponente | Beschreibung | Status |
|------------|--------------|--------|
| FeatureWrapper | Feature-Toggle-Integration | ✅ |
| ErrorBoundary | Fehlerbehandlung | ✅ |
| DocumentPreview | Dokumentvorschau | ✅ |
| FileViewer | Dateiansicht | ✅ |
| SearchBar | Suchleiste mit Autovervollständigung | ✅ |
| FilterPanel | Panel für Datenfilterung | ✅ |
| UserProfile | Benutzerprofilanzeige | ✅ |
| NotificationCenter | Benachrichtigungszentrale | ✅ |
| ThemeSwitcher | Design-Umschalter | ✅ |

## Design-Prinzipien und Richtlinien

### Konsistenz

Alle Komponenten folgen denselben Design-Richtlinien und verwenden dasselbe visuelle Vokabular:

- **Einheitliche Farbpalette**: Basierend auf den nscale-Markenfarben und ergänzenden Funktionsfarben
- **Typografisches System**: Hierarchisches System mit definierten Schriftgrößen, -gewichten und -stilen
- **Abstandssystem**: Konsistentes Spacing-System, das auf einem 4px-Raster basiert
- **Komponentenformgebung**: Einheitliche Rundungen, Schattenwürfe und Interaktionseffekte

### Zugänglichkeit (A11y)

Jede Komponente ist so konzipiert, dass sie die WCAG 2.1 AA-Richtlinien erfüllt oder übertrifft:

- **Tastaturnavigation**: Alle interaktiven Elemente sind per Tastatur bedienbar
- **Screenreader-Unterstützung**: Semantische HTML-Struktur und ARIA-Attribute
- **Ausreichender Kontrast**: Alle Text- und UI-Elemente erfüllen die Kontrastanforderungen
- **Fokusmanagement**: Deutliche visuelle Fokusanzeige und logische Fokusreihenfolge
- **Reduzierte Bewegung**: Respektiert Benutzereinstellungen zur reduzierten Bewegung

### Modularität und Wiederverwendbarkeit

- **Atomares Design**: Komponenten folgen den Prinzipien des atomaren Designs
- **Komposition über Vererbung**: Komplexe Komponenten werden durch Komposition einfacherer Komponenten erstellt
- **Loose Coupling**: Komponenten kommunizieren über klar definierte Props und Events
- **Slots und Scoped Slots**: Flexible Anpassung durch Slot-System

### Performance

- **Lazy Loading**: Komponenten unterstützen bedarfsgesteuertes Laden
- **Virtuelles Scrolling**: Liste und Tabellen unterstützen virtuelles Scrolling für große Datensätze
- **Optimierte Rendering-Performance**: Effiziente Nutzung der Vue.js-Reaktivität
- **Bundle-Größenoptimierung**: Tree-Shaking-freundliche Komponenten

## Verwendungsbeispiele

### Button und Formular-Elemente

```vue
<template>
  <Form @submit="handleSubmit" :validation-schema="schema">
    <FormGroup>
      <FormLabel for="username">Benutzername</FormLabel>
      <Input
        id="username"
        v-model="form.username"
        placeholder="Benutzername eingeben"
        required
      />
      <FormMessage name="username" />
    </FormGroup>
    
    <FormGroup>
      <FormLabel for="email">E-Mail</FormLabel>
      <Input
        id="email"
        type="email"
        v-model="form.email"
        placeholder="E-Mail eingeben"
        required
      />
      <FormMessage name="email" />
    </FormGroup>
    
    <FormGroup>
      <Checkbox v-model="form.terms" id="terms" required>
        Ich akzeptiere die AGB und Datenschutzbestimmungen
      </Checkbox>
      <FormMessage name="terms" />
    </FormGroup>
    
    <Button type="submit" :loading="isSubmitting">Registrieren</Button>
  </Form>
</template>

<script setup>
import { ref } from 'vue';
import { Form, FormGroup, FormLabel, FormMessage, Input, Checkbox, Button } from '@nscale/components';
import * as yup from 'yup';

const schema = yup.object({
  username: yup.string().required('Benutzername ist erforderlich').min(3, 'Mindestens 3 Zeichen'),
  email: yup.string().required('E-Mail ist erforderlich').email('Gültige E-Mail erforderlich'),
  terms: yup.boolean().oneOf([true], 'Bitte akzeptieren Sie die Bedingungen')
});

const form = ref({
  username: '',
  email: '',
  terms: false
});

const isSubmitting = ref(false);

async function handleSubmit(values) {
  isSubmitting.value = true;
  try {
    // API-Aufruf hier
    console.log('Form submitted:', values);
  } catch (error) {
    console.error('Submission error:', error);
  } finally {
    isSubmitting.value = false;
  }
}
</script>
```

### Layout und Navigation

```vue
<template>
  <div class="app-container">
    <Navbar
      :brand="{ name: 'nscale DMS', logo: '/assets/logo.svg' }"
      :menu-items="navItems"
    >
      <template #end>
        <SearchBar />
        <NotificationCenter :count="3" />
        <UserProfile :user="currentUser" />
      </template>
    </Navbar>
    
    <div class="main-container">
      <Sidebar :items="sidebarItems" :expanded="sidebarExpanded" @toggle="toggleSidebar" />
      
      <main class="content">
        <Breadcrumbs :items="breadcrumbItems" />
        
        <slot></slot>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { 
  Navbar, 
  Sidebar, 
  Breadcrumbs, 
  SearchBar, 
  NotificationCenter, 
  UserProfile 
} from '@nscale/components';

const sidebarExpanded = ref(true);

const currentUser = {
  name: 'Max Mustermann',
  avatar: '/assets/avatar.jpg',
  role: 'Administrator'
};

const navItems = [
  { label: 'Dashboard', url: '/dashboard' },
  { label: 'Dokumente', url: '/documents' },
  { label: 'Aufgaben', url: '/tasks' },
  { label: 'Berichte', url: '/reports' }
];

const sidebarItems = [
  {
    label: 'Dashboard',
    icon: 'DashboardIcon',
    url: '/dashboard'
  },
  {
    label: 'Dokumente',
    icon: 'DocumentIcon',
    url: '/documents',
    children: [
      { label: 'Alle Dokumente', url: '/documents/all' },
      { label: 'Vorlagen', url: '/documents/templates' },
      { label: 'Archiv', url: '/documents/archive' }
    ]
  },
  // Weitere Menüeinträge...
];

const breadcrumbItems = [
  { label: 'Home', url: '/' },
  { label: 'Dokumente', url: '/documents' },
  { label: 'Verträge', url: '/documents/contracts' }
];

function toggleSidebar() {
  sidebarExpanded.value = !sidebarExpanded.value;
}
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.main-container {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.content {
  flex: 1;
  padding: var(--nscale-space-4);
  overflow: auto;
}
</style>
```

### Datentabellen und Listen

```vue
<template>
  <Table
    :columns="columns"
    :items="data"
    bordered
    hoverable
    striped
    searchable
    search-placeholder="Nutzer suchen..."
    :pagination="true"
    :page-size="10"
    :total-items="totalItems"
    :loading="loading"
    emptyText="Keine Daten verfügbar"
    @sort="handleSort"
    @search="handleSearch"
    @page-change="handlePageChange"
    @page-size-change="handlePageSizeChange"
    @row-click="handleRowClick"
  >
    <!-- Aktionen-Slot für benutzerdefinierte Tabellenaktionen -->
    <template #actions>
      <div class="table-actions">
        <Select
          v-model="statusFilter"
          :options="statusOptions"
          placeholder="Status filtern"
          size="small"
        />

        <Button variant="secondary" size="small" @click="resetFilters">
          Filter zurücksetzen
        </Button>
      </div>
    </template>

    <!-- Zellen-Slots für benutzerdefinierte Zelleninhalte -->
    <template #cell(status)="{ value }">
      <Badge :variant="getStatusVariant(value)">{{ value }}</Badge>
    </template>

    <!-- Aktionen-Slot für jede Zeile -->
    <template #row-actions="{ item }">
      <div class="row-actions">
        <Button size="small" @click.stop="viewDetails(item)">
          Details
        </Button>
        <Button size="small" variant="danger" @click.stop="confirmDelete(item)">
          Löschen
        </Button>
      </div>
    </template>
  </Table>
</template>

<script setup>
import { ref, computed } from 'vue';
import { Table, Select, Button, Badge, useToast } from '@nscale/components';

// Table setup code...
</script>
```

### Feature-Toggle-Integration

```vue
<template>
  <div>
    <FeatureWrapper 
      feature-name="advanced-search"
      fallback-component="BasicSearch"
    >
      <template #default="{ enabled, featureInfo }">
        <div v-if="enabled">
          <h3>Erweiterte Suche (Beta)</h3>
          <p v-if="featureInfo.beta" class="beta-notice">
            Diese Funktion befindet sich in der Beta-Phase.
          </p>
          <AdvancedSearch />
        </div>
      </template>
    </FeatureWrapper>
  </div>
</template>

<script setup>
import { FeatureWrapper } from '@nscale/components';
import AdvancedSearch from './AdvancedSearch.vue';
import BasicSearch from './BasicSearch.vue';
</script>
```

## Performance-Optimierung

### Lazy-Loading

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

### Virtuelle Listen

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

<script setup>
import { VirtualList } from '@nscale/components';
import MessageItem from '@/components/chat/MessageItem.vue';

// Nachrichtenquelle...
</script>
```

### Bundle-Optimierung

- **Tree Shaking**: Komponenten sind so strukturiert, dass Tree Shaking effektiv funktioniert
- **Code Splitting**: Komponenten unterstützen Code Splitting für optimale Ladeleistung
- **ESM-Module**: Export als ESM-Module für modernere Bundler-Optimierungen
- **Dependency Minimierung**: Reduzierung externer Abhängigkeiten auf ein Minimum

## Integration und Nutzung

### Installation und Setup

```bash
# Mit npm
npm install @nscale/components

# Mit yarn
yarn add @nscale/components

# Mit pnpm
pnpm add @nscale/components
```

Einbindung in das Projekt:

```js
// main.js oder main.ts
import { createApp } from 'vue';
import App from './App.vue';
import { NscaleComponents } from '@nscale/components';

const app = createApp(App);
app.use(NscaleComponents);
app.mount('#app');
```

Einzelne Komponenten importieren für Tree Shaking:

```js
// SomeComponent.vue
import { Button, Input, Card } from '@nscale/components';

export default {
  components: {
    Button,
    Input,
    Card
  },
  // ...
};
```

### Migration von bestehenden Komponenten

#### Migrationsprozess

1. **Variablen-Ersetzung**: Ersetze bestehende CSS-Variablen mit dem neuen einheitlichen Präfix
2. **Hardcoded Werte ersetzen**: Hardcodierte Farbwerte durch CSS-Variablen ersetzen
3. **Themes einbinden**: Stellen Sie sicher, dass die Dark Mode und Kontrast-Implementierung das `data-theme`-Attribut verwendet
4. **Konsistente Benennung**: Verwende die semantischen Namen anstelle direkter Farbwerte
5. **Import sicherstellen**: Überprüfe, dass das design-system.scss in den Haupteintrittspunkten importiert wird

#### Vor der Migration

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

#### Nach der Migration

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

### Technische Integration

#### Auto-Import Plugin für Vite

```js
// vite.config.js
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { NscaleComponentsResolver } from '@nscale/components/resolvers';
import Components from 'unplugin-vue-components/vite';

export default defineConfig({
  plugins: [
    vue(),
    Components({
      resolvers: [
        NscaleComponentsResolver()
      ]
    })
  ]
});
```

## Best Practices

### CSS-Variablen-Verwendung

- **Direkte Farbwerte vermeiden**: Immer CSS-Variablen für Farben verwenden, nicht Hexcodes oder RGB-Werte direkt
- **Design Tokens vs. semantische Variablen**: Verwende semantische Variablen (`--nscale-primary`) für Komponenten anstatt Design Tokens (`--nscale-color-green-500`)
- **Fallbacks vermeiden**: Keine Komponenten-spezifischen Fallback-Werte definieren, sondern die zentralen Variablen nutzen
- **SCSS-Import**: Stelle sicher, dass `design-system.scss` importiert wird, nicht einzelne Variablen in mehreren Dateien definiert werden

### Theming Best Practices

- **Data-Attribute verwenden**: Nutze `data-theme="dark"` anstatt Media Queries oder Klassen für Dark Mode
- **useTheme Composable verwenden**: Nutze den `useTheme` Composable für Theme-Management in Vue-Komponenten
- **Systemeinstellungen respektieren**: Biete die Option, das System-Theme zu verwenden, aber erlaube Benutzern auch die manuelle Auswahl
- **Kontrast-Modus anbieten**: Implementiere einen Kontrast-Modus für bessere Barrierefreiheit
- **ThemeSwitcher einbauen**: Verwende die `ThemeSwitcher.vue` Komponente als Standard-UI für Themenumschaltung

### Komponentengestaltung

- **Standardisierte Abstände**: Verwende das 4px-Raster-System (`--nscale-space-*`) für alle Abstände
- **Konsistente Radien**: Verwende die vordefinieren Border-Radius-Variablen für alle Rundungen
- **Transitions verwenden**: Nutze die Transitions-Variablen für einheitliche Animationszeiten
- **Slot-System nutzen**: Verwende Vue-Slots für flexible Inhalte und Anpassungen
- **Props-Validierung**: Implementiere Validierung für alle Props
- **Events klar definieren**: Definiere und dokumentiere alle emittierten Events

### Responsive Design

- **Mobile-First-Ansatz**: Beginne mit Styles für mobile Geräte und erweitere für größere Bildschirme
- **Breakpoint-Mixins verwenden**: Nutze die vordefinierten Breakpoint-Mixins für Media Queries
- **Feste Breakpoints einhalten**: Verwende nur die definierten Breakpoint-Variablen
- **Responsive Container**: Nutze die Container-Klasse für responsive Inhaltsbreiten
- **Touchscreen optimieren**: Stelle sicher, dass alle interaktiven Elemente für Touch-Eingabe optimiert sind
- **Orientierungen testen**: Teste Komponenten sowohl im Portrait- als auch im Landscape-Modus

---

**Verwandte Dokumente:**
- [02_UI_BASISKOMPONENTEN.md](./02_UI_BASISKOMPONENTEN.md) - Details zu den Basis-UI-Komponenten
- [03_MOBILE_OPTIMIERUNG.md](/opt/nscale-assist/app/docs/00_KONSOLIDIERTE_DOKUMENTATION/04_ENTWICKLUNG/03_MOBILE_OPTIMIERUNG.md) - Umfassende Dokumentation zur mobilen Optimierung
- [02_FEATURE_TOGGLE_SYSTEM.md](/opt/nscale-assist/app/docs/00_KONSOLIDIERTE_DOKUMENTATION/03_ARCHITEKTUR/02_FEATURE_TOGGLE_SYSTEM.md) - Dokumentation des Feature-Toggle-Systems