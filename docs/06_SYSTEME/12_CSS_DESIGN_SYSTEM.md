# CSS Design System für den nscale DMS Assistenten

**Letzte Aktualisierung: 08.05.2025**

Dieses Dokument beschreibt das einheitliche CSS-Variablen-System und die Designgrundlagen für den nscale DMS Assistenten im Rahmen der Migration von Vanilla JS zu Vue 3 Single File Components (SFC). Es dient als zentrale Referenz für Entwickler, um ein konsistentes visuelles Erscheinungsbild und eine verbesserte Benutzerfreundlichkeit über alle Komponenten hinweg zu gewährleisten.

## Inhaltsverzeichnis

1. [Überblick](#überblick)
2. [CSS-Variablen](#css-variablen)
3. [Theming-System](#theming-system)
4. [Klassennamen-Konventionen](#klassennamen-konventionen)
5. [Responsive Breakpoints](#responsive-breakpoints)
6. [UI-Komponenten](#ui-komponenten)
7. [Barrierefreiheit](#barrierefreiheit)
8. [Best Practices](#best-practices)
9. [Integration in Vue 3 SFCs](#integration-in-vue-3-sfcs)

## Überblick

Das CSS Design System wurde entwickelt, um die folgenden Herausforderungen zu lösen:

- **Inkonsistenzen im Legacy-Code**: Uneinheitliche Stile und duplizierte CSS-Definitionen
- **Theming-Schwierigkeiten**: Fehlende Unterstützung für Dark Mode und Kontrast-Modus
- **Responsivitätsprobleme**: Uneinheitliche Ansätze für verschiedene Bildschirmgrößen
- **Wartbarkeit**: Verbesserte Code-Organisation für einfachere Pflege und Erweiterung

Die Lösung besteht aus einem modularen, auf CSS-Variablen basierenden System, das ein einheitliches Erscheinungsbild über alle Komponenten hinweg gewährleistet, während gleichzeitig verschiedene Themes, Responsivität und Barrierefreiheit unterstützt werden.

## CSS-Variablen

### Farbsystem

Das Farbsystem basiert auf einem Hauptfarbschema mit semantischen Varianten:

```css
:root {
  /* Primärfarben */
  --nscale-primary: #00a550;
  --nscale-primary-dark: #009046;
  --nscale-primary-light: #e0f5ea;
  --nscale-primary-ultra-light: #f0faf5;
  
  /* Graustufen */
  --nscale-white: #ffffff;
  --nscale-gray-50: #f8f9fa;
  --nscale-gray-100: #f0f2f5;
  --nscale-gray-200: #e2e8f0;
  /* ... weitere Graustufen ... */
  --nscale-black: #000000;
  
  /* Feedback-Farben */
  --nscale-error: #dc2626;
  --nscale-error-light: #fee2e2;
  --nscale-warning: #f59e0b;
  --nscale-warning-light: #fef3c7;
  --nscale-success: #10b981;
  --nscale-success-light: #d1fae5;
  --nscale-info: #3b82f6;
  --nscale-info-light: #dbeafe;
}
```

### Typographie

Typographische Elemente werden durch Variablen für Schriftfamilien, -größen, -gewichte und Zeilenabstände definiert:

```css
:root {
  /* Schriftfamilien */
  --nscale-font-family-base: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Oxygen, Ubuntu, 'Helvetica Neue', sans-serif;
  --nscale-font-family-mono: 'Consolas', 'Monaco', 'Andale Mono', 'Ubuntu Mono', monospace;
  
  /* Schriftgrößen */
  --nscale-font-size-xs: 0.75rem;    /* 12px */
  --nscale-font-size-sm: 0.875rem;   /* 14px */
  --nscale-font-size-base: 1rem;     /* 16px */
  --nscale-font-size-lg: 1.125rem;   /* 18px */
  --nscale-font-size-xl: 1.25rem;    /* 20px */
  /* ... weitere Größen ... */
  
  /* Schriftgewichte */
  --nscale-font-weight-light: 300;
  --nscale-font-weight-normal: 400;
  --nscale-font-weight-medium: 500;
  --nscale-font-weight-semibold: 600;
  --nscale-font-weight-bold: 700;
  
  /* Zeilenabstände */
  --nscale-line-height-tight: 1.25;
  --nscale-line-height-normal: 1.5;
  --nscale-line-height-relaxed: 1.75;
}
```

### Abstandssystem

Ein einheitliches 4px-Raster bildet die Grundlage für alle Abstände und sorgt für konsistente Layouts:

```css
:root {
  --nscale-space-1: 0.25rem;   /* 4px */
  --nscale-space-2: 0.5rem;    /* 8px */
  --nscale-space-3: 0.75rem;   /* 12px */
  --nscale-space-4: 1rem;      /* 16px */
  --nscale-space-5: 1.25rem;   /* 20px */
  --nscale-space-6: 1.5rem;    /* 24px */
  /* ... weitere Abstände ... */
}
```

### Layoutvariablen

Grundlegende Layoutvariablen für konsistente Containergrößen:

```css
:root {
  --nscale-sidebar-width: 280px;
  --nscale-header-height: 64px;
  --nscale-footer-height: 48px;
  --nscale-content-max-width: 1200px;
}
```

### Komponentenstilisierung

Variablen für Komponentenstile wie Rundungen, Schatten und Übergänge:

```css
:root {
  /* Rahmenradien */
  --nscale-border-radius-sm: 0.25rem; /* 4px */
  --nscale-border-radius-md: 0.5rem;  /* 8px */
  --nscale-border-radius-lg: 0.75rem; /* 12px */
  --nscale-border-radius-full: 9999px;
  
  /* Schatten */
  --nscale-shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --nscale-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  /* ... weitere Schatten ... */
  
  /* Übergangszeiten */
  --nscale-transition-quick: 150ms;
  --nscale-transition-normal: 300ms;
  --nscale-transition-slow: 500ms;
  
  /* Z-Indizes */
  --nscale-z-index-dropdown: 1000;
  --nscale-z-index-sticky: 1020;
  /* ... weitere Z-Indizes ... */
}
```

## Theming-System

Das Theming-System unterstützt drei Modi: Hell (Standard), Dunkel und Kontrast.

### Light-Mode (Standard)

```css
:root {
  --nscale-body-bg: var(--nscale-white);
  --nscale-body-color: var(--nscale-gray-800);
  
  --nscale-card-bg: var(--nscale-white);
  --nscale-card-border: var(--nscale-gray-200);
  
  /* ... weitere Zuweisungen ... */
}
```

### Dark-Mode

```css
.theme-dark {
  --nscale-body-bg: var(--nscale-gray-900);
  --nscale-body-color: var(--nscale-gray-100);
  
  --nscale-card-bg: var(--nscale-gray-800);
  --nscale-card-border: var(--nscale-gray-700);
  
  /* ... weitere Zuweisungen ... */
}
```

### Kontrast-Mode

```css
.theme-contrast {
  /* Anpassung der Primärfarbe für besseren Kontrast */
  --nscale-primary: #ffeb3b;
  --nscale-primary-dark: #ffd600;
  --nscale-primary-light: #fff9c4;
  
  --nscale-body-bg: var(--nscale-black);
  --nscale-body-color: var(--nscale-white);
  
  /* ... weitere Zuweisungen ... */
}
```

### Themewechsel-Mechanismus

Der Themewechsel wird durch den JavaScript-basierten ThemeManager gesteuert, der in `theme-switcher.js` implementiert ist. Der Manager bietet folgende Funktionen:

- **Automatische Erkennung** der Systemeinstellungen für Hell/Dunkel
- **Manuelle Auswahl** zwischen Hell-, Dunkel- und Kontrast-Modus
- **Persistente Speicherung** der Benutzereinstellungen im localStorage
- **Reaktivität** durch benutzerdefinierten Event-Mechanismus
- **Vue 3 Composition API Integration** über das `useTheme`-Composable

Beispielcode für den Themewechsel in einer Vue-Komponente:

```vue
<script setup>
import { useTheme } from '@/composables/useTheme';

const { currentTheme, setTheme, THEMES } = useTheme();

function toggleTheme() {
  if (currentTheme.value === THEMES.LIGHT) {
    setTheme(THEMES.DARK);
  } else {
    setTheme(THEMES.LIGHT);
  }
}
</script>

<template>
  <button @click="toggleTheme">
    Aktuelles Theme: {{ currentTheme }}
  </button>
</template>
```

## Klassennamen-Konventionen

Das System verwendet eine konsistente BEM-artige Namenskonvention für CSS-Klassen:

### Basis-Namenskonvention

- **Präfix**: Alle klassenspezifischen Klassen beginnen mit `nscale-` 
- **Block**: Beschreibt den Hauptkomponententyp (z.B. `nscale-btn`)
- **Element**: Beschreibt ein Unterlement mit `__` (z.B. `nscale-btn__icon`)
- **Modifier**: Beschreibt Varianten mit `--` (z.B. `nscale-btn--primary`)

### Komponenten-Klassen

Vordefinierte Klassen für häufig verwendete Komponententypen:

```css
/* Button-Komponente */
.nscale-btn { /* Basis-Stile */ }
.nscale-btn--primary { /* Primärer Button */ }
.nscale-btn--secondary { /* Sekundärer Button */ }
.nscale-btn--danger { /* Gefahren-Button */ }

/* Card-Komponente */
.nscale-card { /* Basis-Stile */ }
.nscale-card-header { /* Kartenkopf */ }
.nscale-card-body { /* Karteninhalt */ }
.nscale-card-footer { /* Kartenfuß */ }
```

### Hilfsklassen

Utility-Klassen für häufig verwendete Stile:

```css
/* Spacing-Hilfsklassen */
.nscale-m-1 { margin: var(--nscale-space-1); }
.nscale-p-1 { padding: var(--nscale-space-1); }
/* ... weitere Abstandsklassen ... */

/* Flex-Hilfsklassen */
.nscale-flex { display: flex; }
.nscale-items-center { align-items: center; }
/* ... weitere Flex-Klassen ... */

/* Text-Hilfsklassen */
.nscale-text-primary { color: var(--nscale-primary); }
.nscale-text-center { text-align: center; }
/* ... weitere Text-Klassen ... */
```

## Responsive Breakpoints

Das System verwendet einen "Mobile First"-Ansatz mit definierten Breakpoints für verschiedene Gerätegrößen:

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

### Media Queries

Standard-Media-Queries für responsive Designs:

```css
/* Extra small (Mobiltelefone im Hochformat) */
/* Basiszustand (keine Media Query) */

/* Small (Mobiltelefone im Querformat) */
@media (min-width: 480px) {
  /* Stile für kleine Bildschirme */
}

/* Medium (Tablets im Hochformat) */
@media (min-width: 768px) {
  /* Stile für mittlere Bildschirme */
}

/* ... weitere Breakpoints ... */
```

### Responsive Container

Container passen ihre Größe dynamisch an die Bildschirmgröße an:

```css
.nscale-container {
  width: 100%;
  margin-left: auto;
  margin-right: auto;
  padding-left: var(--nscale-space-4);
  padding-right: var(--nscale-space-4);
}

/* Container-Breite für verschiedene Breakpoints */
@media (min-width: 640px) {
  .nscale-container {
    max-width: 600px;
  }
}

@media (min-width: 768px) {
  .nscale-container {
    max-width: 720px;
  }
}

/* ... weitere Breakpoints ... */
```

### Responsive Grid

Ein flexibles Grid-System basierend auf CSS Grid:

```css
.nscale-grid {
  display: grid;
  gap: var(--nscale-space-4);
}

/* Standard 1-Spalten-Grid auf mobilen Geräten */
.nscale-grid {
  grid-template-columns: 1fr;
}

/* Responsive Grid-Anpassungen */
@media (min-width: 768px) {
  .nscale-grid-cols-md-2 {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .nscale-grid-cols-md-3 {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* ... weitere Grid-Layouts ... */
```

## UI-Komponenten

Das Design-System definiert Basis-Stile für häufig verwendete UI-Komponenten:

### Buttons

```css
.nscale-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--nscale-space-2) var(--nscale-space-4);
  border-radius: var(--nscale-border-radius-md);
  font-weight: var(--nscale-font-weight-medium);
  font-size: var(--nscale-font-size-sm);
  cursor: pointer;
  transition: 
    background-color var(--nscale-transition-quick) ease,
    border-color var(--nscale-transition-quick) ease,
    transform var(--nscale-transition-quick) ease,
    box-shadow var(--nscale-transition-quick) ease;
  white-space: nowrap;
  text-decoration: none;
}

.nscale-btn-primary {
  background-color: var(--nscale-btn-primary-bg);
  color: var(--nscale-btn-primary-text);
  border: 1px solid transparent;
}

/* ... weitere Button-Varianten ... */
```

### Form-Elemente

```css
.nscale-input {
  width: 100%;
  padding: var(--nscale-space-2) var(--nscale-space-3);
  border: 1px solid var(--nscale-input-border);
  border-radius: var(--nscale-border-radius-md);
  background-color: var(--nscale-input-bg);
  color: var(--nscale-input-text);
  transition: 
    border-color var(--nscale-transition-quick) ease,
    box-shadow var(--nscale-transition-quick) ease;
}

/* ... weitere Form-Elemente ... */
```

### Cards

```css
.nscale-card {
  background-color: var(--nscale-card-bg);
  border: 1px solid var(--nscale-card-border);
  border-radius: var(--nscale-border-radius-md);
  box-shadow: var(--nscale-shadow-md);
  padding: var(--nscale-space-6);
  margin-bottom: var(--nscale-space-4);
}

/* ... weitere Card-Elemente ... */
```

### Chat-Komponenten

```css
.nscale-message-user {
  background-color: var(--nscale-message-user-bg);
  color: var(--nscale-message-user-text);
  border-radius: var(--nscale-border-radius-md);
  border-top-right-radius: 0;
}

.nscale-message-assistant {
  background-color: var(--nscale-message-assistant-bg);
  color: var(--nscale-message-assistant-text);
  border: 1px solid var(--nscale-message-assistant-border);
  border-radius: var(--nscale-border-radius-md);
  border-top-left-radius: 0;
}

/* ... weitere Chat-Komponenten ... */
```

## Barrierefreiheit

Das Design-System wurde mit einem starken Fokus auf Barrierefreiheit entwickelt:

### Farbkontrast

Alle Farbkombinationen erfüllen die WCAG 2.1 AA-Anforderungen für Kontrast:
- Text auf Hintergründen hat ein Kontrastverhältnis von mindestens 4,5:1
- Große Text hat ein Kontrastverhältnis von mindestens 3:1
- UI-Komponenten haben ein Kontrastverhältnis von mindestens 3:1 zu angrenzenden Farben

### Reduzierte Bewegung

Respektiert die Benutzereinstellung für reduzierte Bewegung:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

.reduce-motion {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### Fokus-Stile

Klare visuelle Fokus-Indikatoren für Tastaturnavigation:

```css
:focus-visible {
  outline: 2px solid var(--nscale-primary);
  outline-offset: 2px;
}

.theme-dark :focus-visible {
  outline-color: var(--nscale-primary-light);
}

.theme-contrast :focus-visible {
  outline-color: var(--nscale-primary);
  outline-width: 3px;
}
```

### Schriftgrößen-Anpassung

Unterstützung für benutzerdefinierte Schriftgrößen:

```css
.font-size-small {
  font-size: var(--nscale-font-size-sm);
}

.font-size-medium {
  font-size: var(--nscale-font-size-base);
}

.font-size-large {
  font-size: var(--nscale-font-size-lg);
}
```

## Best Practices

### Verwendung von CSS-Variablen

- **Direkte Farbwerte vermeiden**: Immer CSS-Variablen für Farben verwenden, nicht Hexcodes oder RGB-Werte direkt
- **Schattenwerte standardisieren**: Die vordefinierten Schatten-Variablen verwenden
- **Abstände standardisieren**: Das 4px-Raster für alle Abstände verwenden

### Responsives Design

- **Mobile First**: Immer mit dem mobilen Layout beginnen und dann für größere Bildschirme erweitern
- **Breakpoints konsistent nutzen**: Die vordefinierten Breakpoints verwenden, keine eigenen erstellen
- **Flexbox und Grid verwenden**: Für responsive Layouts Flexbox und CSS Grid verwenden, nicht Float oder absolute Positionierung

### Theming

- **Semantische Variablen verwenden**: Komponenten sollten semantische Variablen wie `--nscale-card-bg` statt direkter Farbvariablen wie `--nscale-white` verwenden
- **Theme-Klassen respektieren**: Keine harten Farb-Überschreibungen, die die Theme-Klassen umgehen

### Klassenbenennung

- **BEM-Konvention folgen**: Bei neuen Komponenten die BEM-Konvention für Klassennamen verwenden
- **Legacy-Klassen respektieren**: Bestehende Klassen nicht ohne Grund umbenennen oder entfernen

## Integration in Vue 3 SFCs

Die Integration des Design-Systems in Vue 3 Single File Components erfolgt wie folgt:

### Import der CSS-Dateien

In der Haupt-`main.js` (oder `main.ts`) Datei:

```javascript
// CSS Design System Imports
import '@/assets/variables.css';
import '@/assets/class-conventions.css';
import '@/assets/responsive.css';
```

### Theme-Integration

Integration des Theme-Managers:

```javascript
// In main.js
import { themeManager } from '@/assets/theme-switcher';

// Initialisierung des Themes beim Start
document.addEventListener('DOMContentLoaded', () => {
  themeManager.applyTheme();
});
```

### Verwendung des useTheme-Composable

In Vue-Komponenten:

```vue
<script setup>
import { useTheme } from '@/composables/useTheme';

const { 
  currentTheme, 
  useSystemTheme,
  setTheme, 
  setUseSystemTheme,
  isDarkTheme,
  toggleTheme
} = useTheme();
</script>

<template>
  <div>
    <p>Aktuelles Theme: {{ currentTheme }}</p>
    
    <button @click="toggleTheme">
      Theme wechseln
    </button>
    
    <div class="theme-options">
      <label>
        <input 
          type="checkbox" 
          v-model="useSystemTheme" 
          @change="setUseSystemTheme(useSystemTheme)"
        >
        Systemeinstellung verwenden
      </label>
    </div>
  </div>
</template>
```

### CSS-Scoping in Vue-Komponenten

```vue
<style>
/* Globale Stile bleiben nicht gescoped */
@import '@/assets/some-additional-globals.css';
</style>

<style scoped>
/* Komponenten-spezifische Stile verwenden CSS-Variablen */
.my-component {
  background-color: var(--nscale-card-bg);
  color: var(--nscale-body-color);
  border-radius: var(--nscale-border-radius-md);
  padding: var(--nscale-space-4);
}

/* Media Queries für Responsivität */
@media (min-width: 768px) {
  .my-component {
    padding: var(--nscale-space-6);
  }
}
</style>
```

## Zusammenfassung

Das CSS Design System für den nscale DMS Assistenten bietet eine umfassende Lösung für konsistentes Styling, Theming und Responsivität. Durch die Verwendung von CSS-Variablen, standardisierten Klassennamen und einem flexiblen Theming-Mechanismus wird eine nahtlose visuelle Integration zwischen Legacy-Code und neuen Vue 3 SFCs ermöglicht.

Die in diesem Dokument beschriebenen Richtlinien und Best Practices sollten bei der Entwicklung aller neuen Komponenten und der Migration bestehender Komponenten befolgt werden, um ein einheitliches und zugängliches Benutzererlebnis zu gewährleisten.

---

**Verwandte Dokumente:**
- [10_BASIS_UI_KOMPONENTEN.md](./10_BASIS_UI_KOMPONENTEN.md) - Details zu den Basis-UI-Komponenten
- [COMPONENT_GUIDE.md](../COMPONENT_GUIDE.md) - Allgemeiner Leitfaden für Komponenten
- [ERROR_HANDLING_FALLBACK.md](../ERROR_HANDLING_FALLBACK.md) - Integration mit dem Fallback-Mechanismus