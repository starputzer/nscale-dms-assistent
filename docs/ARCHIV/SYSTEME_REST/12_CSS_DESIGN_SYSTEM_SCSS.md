# SCSS Design System für den nScaleDMS Assistenten

**Letzte Aktualisierung: 13.05.2025**

Dieses Dokument beschreibt das erweiterte SCSS-basierte Design System für den nScale DMS Assistenten, das auf dem bestehenden CSS-Variablen-System aufbaut und es um zusätzliche SCSS-Funktionalitäten erweitert.

> **WICHTIG**: Diese Dokumentation ergänzt die bestehende [CSS Design System Dokumentation](./12_CSS_DESIGN_SYSTEM.md) und fokussiert sich auf die SCSS-spezifischen Erweiterungen und Verbesserungen.
>
> **UPDATE 13.05.2025**: Das Design-System wurde vollständig nach SCSS migriert und beinhaltet nun modulare SCSS-Dateien, verbesserte Mixins und erweiterte Theming-Funktionen.

## Inhaltsverzeichnis

1. [Überblick](#überblick)
2. [SCSS-Dateistruktur](#scss-dateistruktur)
3. [Variable-Modularisierung](#variable-modularisierung)
4. [SCSS-Funktionen und Mixins](#scss-funktionen-und-mixins)
5. [Theming-System-Erweiterungen](#theming-system-erweiterungen)
6. [Utility-Klassen](#utility-klassen)
7. [Komponenten-Styling](#komponenten-styling)
8. [Responsive Layout-Patterns](#responsive-layout-patterns)
9. [SCSS-Migration](#scss-migration)
10. [Best Practices](#best-practices)

## Überblick

Die SCSS-Erweiterung des Design Systems bietet folgende Vorteile:

- **Modulare Dateien**: Aufteilung in thematisch getrennte SCSS-Dateien (_variables.scss, _typography.scss, etc.)
- **Funktionen und Mixins**: Erweiterte SCSS-Funktionalitäten für häufige Styling-Muster
- **Nesting-Support**: Verbesserte Lesbarkeit und Wartbarkeit durch SCSS-Nesting
- **Mathematische Operationen**: Präzise Berechnung von Werten basierend auf Design-Tokens
- **Themensystem**: Verbessertes System für Theme-Wechsel und Theme-Anpassungen
- **Improved Imports**: @use und @forward für besseres SCSS-Modulmanagement

## SCSS-Dateistruktur

Das SCSS Design System ist in folgende Dateien gegliedert:

```
/src/assets/styles/
  ├── _variables.scss    # Zentrale Design-Tokens und Variablen
  ├── _typography.scss   # Typografie-Stile und Text-Formatierung
  ├── _layout.scss       # Grid, Flexbox und andere Layout-Systeme
  ├── _forms.scss        # Formular-Elemente und Eingabefeld-Styling
  └── main.scss          # Haupt-Entry-Point, importiert alle Module
```

### Importpfad

In Vue-Komponenten können Sie die Styles wie folgt importieren:

```scss
// In einer Vue-Komponente
<style lang="scss">
@use '@/assets/styles/main.scss';
// Oder für den Zugriff auf spezifische Variablen und Mixins
@use '@/assets/styles/variables' as vars;
</style>
```

## Variable-Modularisierung

Alle Variablen wurden in `_variables.scss` modularisiert und folgen einem strukturierten Benennungsschema mit SCSS-Variablen ($) statt CSS-Variablen (--):

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

Diese SCSS-Variablen werden dann in CSS-Variablen umgewandelt, um Theming und dynamische Änderungen zu ermöglichen:

```scss
:root {
  // Übertragung der SCSS-Variablen auf CSS-Variablen
  --primary-500: #{$primary-500};
  --spacing-4: #{$spacing-4};
  // ...
}
```

## SCSS-Funktionen und Mixins

Das SCSS-System stellt erweiterte Funktionen und Mixins bereit:

### Spacing-Funktionen

```scss
// Spacing-Funktion für flexiblere Anpassung
@function spacing($multiplier) {
  @return $spacing-1 * $multiplier;
}

// Verwendungsbeispiel
.custom-element {
  padding: spacing(5); // Entspricht 1.25rem (5 * 0.25rem)
}
```

### Responsive Mixins

```scss
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

// Verwendungsbeispiel
.responsive-element {
  // Mobile-First Default
  flex-direction: column;
  
  // Ab Tablet
  @include up($breakpoint-md) {
    flex-direction: row;
  }
}
```

### Typografie-Mixins

```scss
@mixin heading-1 {
  font-size: $font-size-3xl;
  font-weight: $font-weight-bold;
  line-height: $line-height-tight;
}

@mixin heading-2 {
  font-size: $font-size-2xl;
  font-weight: $font-weight-bold;
  line-height: $line-height-tight;
}

// ...und weitere Typografie-Mixins
```

### Farbe und Kontrast

```scss
// Funktion zur Berechnung kontrastreicher Text-Farben
@function contrast-color($background-color) {
  $r: red($background-color);
  $g: green($background-color);
  $b: blue($background-color);
  
  $yiq: (($r * 299) + ($g * 587) + ($b * 114)) / 1000;
  
  @return if($yiq >= 150, $gray-900, $white);
}

// Verwendungsbeispiel
.dynamic-text {
  background-color: $primary-500;
  color: contrast-color($primary-500);
}
```

## Theming-System-Erweiterungen

Das SCSS-basierte Theming-System erweitert die bisherigen Theme-Funktionalitäten:

```scss
// Themen als Maps definieren
$themes: (
  light: (
    bg-primary: $white,
    bg-secondary: $gray-50,
    bg-tertiary: $gray-100,
    text-primary: $gray-900,
    text-secondary: $gray-700,
    text-tertiary: $gray-500,
    border-color: $gray-200,
    // ...weitere Theme-Variablen
  ),
  
  dark: (
    bg-primary: $gray-900,
    bg-secondary: $gray-800,
    bg-tertiary: $gray-700,
    text-primary: $white,
    text-secondary: $gray-300,
    text-tertiary: $gray-400,
    border-color: $gray-700,
    // ...weitere Theme-Variablen
  ),
  
  high-contrast: (
    bg-primary: $black,
    bg-secondary: $gray-950,
    bg-tertiary: $gray-900,
    text-primary: $white,
    text-secondary: $gray-100,
    text-tertiary: $gray-300,
    border-color: $white,
    // ...weitere Theme-Variablen
  )
);

// Theme-Variablen generieren
@each $theme-name, $theme-map in $themes {
  html[data-theme="#{$theme-name}"] {
    @each $key, $value in $theme-map {
      --#{$key}: #{$value};
    }
    
    // Theme-spezifische Überschreibungen
    @if $theme-name == 'dark' {
      --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
      // ...weitere Dark-Theme-Anpassungen
    }
    
    @if $theme-name == 'high-contrast' {
      --focus-ring-color: rgba(255, 255, 255, 0.8);
      // ...weitere Kontrast-Anpassungen
    }
  }
}
```

### Theming Mixin

```scss
// Mixin zur Erstellung theme-spezifischer Stile
@mixin themed($property, $key) {
  #{$property}: var(--#{$key});
}

// Verwendungsbeispiel
.themed-button {
  @include themed(background-color, primary-600);
  @include themed(color, text-primary-inverse);
  @include themed(border-color, border-color);
}
```

## Utility-Klassen

Das SCSS Design System bietet umfangreiche Utility-Klassen für häufige Styling-Muster:

### Spacing-Utilities

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
  '8': $spacing-8,
  '10': $spacing-10,
  '12': $spacing-12,
  '16': $spacing-16,
  '20': $spacing-20,
  '24': $spacing-24,
  '32': $spacing-32,
  'auto': auto
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
        @if $direction-value == '' {
          #{$side-value}: $space-value;
        } @else if type-of($direction-value) == 'list' {
          @each $dir in $direction-value {
            #{$side-value}-#{$dir}: $space-value;
          }
        } @else {
          #{$side-value}-#{$direction-value}: $space-value;
        }
      }
    }
  }
}
```

### Flexbox-Utilities

```scss
// Flexbox-Utilities generieren
.d-flex {
  display: flex;
}

.d-inline-flex {
  display: inline-flex;
}

$flex-directions: (
  row: row,
  column: column,
  row-reverse: row-reverse,
  column-reverse: column-reverse
);

@each $class, $value in $flex-directions {
  .flex-#{$class} {
    flex-direction: $value;
  }
}

$justify-content: (
  start: flex-start,
  end: flex-end,
  center: center,
  between: space-between,
  around: space-around,
  evenly: space-evenly
);

@each $class, $value in $justify-content {
  .justify-content-#{$class} {
    justify-content: $value;
  }
}

$align-items: (
  start: flex-start,
  end: flex-end,
  center: center,
  baseline: baseline,
  stretch: stretch
);

@each $class, $value in $align-items {
  .align-items-#{$class} {
    align-items: $value;
  }
}
```

### Grid-Utilities

```scss
// Grid-Utilities generieren
.d-grid {
  display: grid;
}

@for $i from 1 through 12 {
  .grid-cols-#{$i} {
    grid-template-columns: repeat(#{$i}, minmax(0, 1fr));
  }
  
  .col-span-#{$i} {
    grid-column: span #{$i} / span #{$i};
  }
}

@for $i from 1 through 6 {
  .row-span-#{$i} {
    grid-row: span #{$i} / span #{$i};
  }
}

// Gap-Utilities
@each $key, $value in $spacings {
  .gap-#{$key} {
    gap: $value;
  }
}
```

## Komponenten-Styling

Das SCSS Design System definiert konsistente Stile für häufig verwendete Komponenten:

### Buttons

```scss
// Button-Basisstil
.nscale-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: $btn-padding-y $btn-padding-x;
  font-weight: $btn-font-weight;
  font-size: $font-size-base;
  border: $border-width-thin solid transparent;
  border-radius: $btn-border-radius;
  transition: all $transition-fast $transition-ease;
  cursor: pointer;
  
  &:focus {
    outline: $focus-ring-width solid var(--focus-ring-color);
    outline-offset: $focus-ring-offset;
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  // Button-Varianten
  &--primary {
    background-color: var(--primary-600);
    color: white;
    
    &:hover {
      background-color: var(--primary-700);
    }
  }
  
  &--secondary {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
    border-color: var(--border-color);
    
    &:hover {
      background-color: var(--bg-secondary);
    }
  }
  
  // Weitere Button-Varianten wie success, warning, error, info...
  
  // Button-Größen
  &--sm {
    padding: calc(#{$btn-padding-y} * 0.75) calc(#{$btn-padding-x} * 0.75);
    font-size: $font-size-sm;
  }
  
  &--lg {
    padding: calc(#{$btn-padding-y} * 1.25) calc(#{$btn-padding-x} * 1.25);
    font-size: $font-size-lg;
  }
}
```

### Cards

```scss
.nscale-card {
  background-color: var(--bg-primary);
  border: $border-width-thin solid var(--border-color);
  border-radius: $card-border-radius;
  box-shadow: var(--shadow-sm);
  padding: $card-padding;
  transition: box-shadow 0.3s ease, transform 0.3s ease;
  
  &:hover {
    box-shadow: var(--shadow-md);
  }
  
  &--interactive {
    cursor: pointer;
    
    &:hover {
      transform: translateY(-2px);
    }
  }
}
```

### Formulare

```scss
// Form-Gruppe
.form-group {
  margin-bottom: $spacing-4;
  
  &:last-child {
    margin-bottom: 0;
  }
}

// Label
.form-label {
  display: inline-block;
  margin-bottom: $spacing-2;
  font-weight: $font-weight-medium;
  color: var(--text-primary);
}

// Textfeld
.form-control {
  display: block;
  width: 100%;
  height: $input-height;
  padding: $input-padding-y $input-padding-x;
  font-family: $font-family-base;
  font-size: $font-size-base;
  color: var(--text-primary);
  background-color: var(--bg-primary);
  border: $input-border-width solid var(--border-color);
  border-radius: $input-border-radius;
  transition: border-color $transition-fast $transition-ease,
              box-shadow $transition-fast $transition-ease;
  
  &:focus {
    border-color: var(--primary-400);
    outline: 0;
    box-shadow: 0 0 0 $focus-ring-width var(--focus-ring-color);
  }
  
  &:disabled {
    background-color: var(--bg-tertiary);
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  // Größenvarianten
  &.form-control-sm {
    height: calc(#{$input-height} * 0.8);
    padding: calc(#{$input-padding-y} * 0.8) calc(#{$input-padding-x} * 0.8);
    font-size: $font-size-sm;
  }
  
  &.form-control-lg {
    height: calc(#{$input-height} * 1.2);
    padding: calc(#{$input-padding-y} * 1.2) calc(#{$input-padding-x} * 1.2);
    font-size: $font-size-lg;
  }
}
```

## Responsive Layout-Patterns

Das SCSS Design System bietet wiederverwendbare responsive Layout-Patterns:

### Container

```scss
.container {
  width: 100%;
  margin-right: auto;
  margin-left: auto;
  padding-right: $spacing-4;
  padding-left: $spacing-4;
  
  @media (min-width: $breakpoint-sm) {
    max-width: $container-max-width-sm;
  }
  
  @media (min-width: $breakpoint-md) {
    max-width: $container-max-width-md;
  }
  
  @media (min-width: $breakpoint-lg) {
    max-width: $container-max-width-lg;
  }
  
  @media (min-width: $breakpoint-xl) {
    max-width: $container-max-width-xl;
  }
  
  @media (min-width: $breakpoint-2xl) {
    max-width: $container-max-width-2xl;
  }
}
```

### Responsive Grid System

```scss
.row {
  display: flex;
  flex-wrap: wrap;
  margin-right: -($grid-gutter-width / 2);
  margin-left: -($grid-gutter-width / 2);
  
  &.no-gutters {
    margin-right: 0;
    margin-left: 0;
    
    > [class*="col-"] {
      padding-right: 0;
      padding-left: 0;
    }
  }
}

// Spalten-Generator-Mixin
@mixin make-col($size, $columns: $grid-columns) {
  flex: 0 0 percentage($size / $columns);
  max-width: percentage($size / $columns);
}

.col {
  position: relative;
  width: 100%;
  padding-right: ($grid-gutter-width / 2);
  padding-left: ($grid-gutter-width / 2);
  flex-basis: 0;
  flex-grow: 1;
  max-width: 100%;
}

// Spaltenklassen für verschiedene Breakpoints generieren
@for $i from 1 through $grid-columns {
  .col-#{$i} {
    position: relative;
    width: 100%;
    padding-right: ($grid-gutter-width / 2);
    padding-left: ($grid-gutter-width / 2);
    @include make-col($i);
  }
}

@each $breakpoint in (sm, md, lg, xl, 2xl) {
  @media (min-width: map-get((
    sm: $breakpoint-sm,
    md: $breakpoint-md,
    lg: $breakpoint-lg,
    xl: $breakpoint-xl,
    2xl: $breakpoint-2xl
  ), $breakpoint)) {
    @for $i from 1 through $grid-columns {
      .col-#{$breakpoint}-#{$i} {
        @include make-col($i);
      }
    }
  }
}
```

### Stack-To-Row Layout Pattern

```scss
.stack-to-row {
  display: flex;
  flex-direction: column;
  
  @media (min-width: $breakpoint-md) {
    flex-direction: row;
  }
  
  // Varianten mit verschiedenen Gap-Werten
  &.gap-small {
    gap: $spacing-2;
    
    @media (min-width: $breakpoint-md) {
      gap: $spacing-4;
    }
  }
  
  &.gap-medium {
    gap: $spacing-4;
    
    @media (min-width: $breakpoint-md) {
      gap: $spacing-6;
    }
  }
  
  &.gap-large {
    gap: $spacing-6;
    
    @media (min-width: $breakpoint-md) {
      gap: $spacing-8;
    }
  }
}
```

## SCSS-Migration

### Vorgehensweise bei der Migration

1. **SCSS-Dateistruktur erstellen**: Erstellen der modularen SCSS-Dateien im `styles/`-Verzeichnis
2. **CSS-Variablen zu SCSS-Variablen konvertieren**: Umwandlung von `--nscale-*` in SCSS-Variablen
3. **Maps für logische Gruppierungen erstellen**: Organisieren von Werten in SCSS-Maps
4. **CSS-Variablen für Theming beibehalten**: SCSS-Variablen in CSS-Variablen übertragen
5. **Mixins für häufige Muster erstellen**: Entwicklung von SCSS-Mixins für wiederholte Styles
6. **Utility-Klassen mit Loops generieren**: Nutzung von SCSS-Loops für Utility-Klassen
7. **Komponenten mit Nesting umschreiben**: Nutzung des SCSS-Nestings für bessere Organisation
8. **Theme-System implementieren**: Erweitern des bestehenden Theme-Systems
9. **Import-Struktur anpassen**: Sicherstellen, dass alle Komponenten die SCSS-Dateien korrekt importieren

### Migrationsstatus

Die Migration zum SCSS Design System ist abgeschlossen und folgende Dateien wurden erstellt:

- `_variables.scss`: Alle Design-Tokens und grundlegenden Variablen
- `_typography.scss`: Typografie-Stile und Text-Formatierungen
- `_layout.scss`: Grid, Flexbox und Layout-Utilities
- `_forms.scss`: Form-Elemente und deren Styling
- `main.scss`: Haupt-Entry-Point, der alle Module importiert

### Code-Beispiel für Migration

**Vorher (CSS):**

```css
:root {
  --nscale-primary: #00a550;
  --nscale-primary-dark: #009046;
}

.nscale-btn-primary {
  background-color: var(--nscale-primary);
  color: white;
}

.nscale-btn-primary:hover {
  background-color: var(--nscale-primary-dark);
}

@media (prefers-color-scheme: dark) {
  :root {
    --nscale-primary: #10b981;
  }
}
```

**Nachher (SCSS):**

```scss
// In _variables.scss
$primary-600: #00a550;
$primary-700: #009046;

// In main.scss
:root {
  --primary-600: #{$primary-600};
  --primary-700: #{$primary-700};
}

// In einem Komponenten-Modul
.nscale-button {
  &--primary {
    background-color: var(--primary-600);
    color: white;
    
    &:hover {
      background-color: var(--primary-700);
    }
  }
}

// Theme-Definitionen
html[data-theme="dark"] {
  --primary-600: #{lighten($primary-600, 10%)};
}
```

## Best Practices

### SCSS-Spezifische Best Practices

1. **Variablen im _variables.scss halten**: Zentrale Variablen nur in der _variables.scss-Datei definieren
2. **@use statt @import verwenden**: Moderne SCSS-Module-Syntax mit Namespaces nutzen
3. **Nesting begrenzen**: Begrenze Nesting auf max. 3 Ebenen für bessere Lesbarkeit
4. **Mixins für wiederholende Muster**: Erstelle Mixins für häufig wiederkehrende Styling-Patterns
5. **Maps für logisch gruppierte Werte**: Verwende SCSS-Maps für zusammengehörige Werte (z.B. Farben, Abstände)
6. **Funktionen für Berechnungen**: Erstelle SCSS-Funktionen für komplexe Berechnungen

### Theme-Management

1. **Theme-Maps in _variables.scss**: Definiere Theme-Maps zentral in der _variables.scss-Datei
2. **CSS-Variablen für Theme-Wechsel**: Nutze CSS-Variablen für dynamische Theme-Änderungen
3. **data-theme-Attribute**: Verwende HTML-data-theme-Attribute für Theme-Anwendung
4. **useTheme Composable**: Nutze den useTheme-Composable für programmatischen Theme-Wechsel

### Responsive Design

1. **Mobile-First-Ansatz**: Beginne mit Styles für mobile Geräte und erweitere für größere Bildschirme
2. **Breakpoint-Mixins verwenden**: Nutze die vordefinierten Breakpoint-Mixins für Media Queries
3. **Feste Breakpoints einhalten**: Verwende nur die definierten Breakpoint-Variablen
4. **Responsive Container**: Nutze die Container-Klasse für responsive Inhaltsbreiten

### Vorteile der SCSS-Migration

1. **Bessere Wartbarkeit**: Modulare Dateien erleichtern die Wartung und Erweiterung
2. **Funktionalität**: Zugriff auf SCSS-Features wie Funktionen, Mixins, Nesting
3. **Organisation**: Verbesserte Code-Organisation durch Namespaces und Module
4. **Performance**: Optimierter CSS-Output durch SCSS-Kompilierung
5. **Consistency**: Einheitliches Styling durch zentrale Variablen und wiederverwendbare Mixins

---

**Verwandte Dokumente:**
- [12_CSS_DESIGN_SYSTEM.md](./12_CSS_DESIGN_SYSTEM.md) - Ursprüngliche CSS Design System Dokumentation
- [17_KOMPONENTEN_BIBLIOTHEK.md](./17_KOMPONENTEN_BIBLIOTHEK.md) - Komponenten-Bibliotheks-Dokumentation
- [19_MOBILE_OPTIMIERUNG.md](./19_MOBILE_OPTIMIERUNG.md) - Mobile-First-Ansatz-Dokumentation

**Beispiel-Komponenten:**
- `/src/components/examples/DesignSystemDemo.vue` - Demo-Komponente für das Design-System