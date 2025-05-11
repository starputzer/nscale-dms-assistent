# Basis-UI-Komponenten

**Datum: 08.05.2025**

Dieses Dokument beschreibt die Sammlung von Basis-UI-Komponenten, die als Grundlage für das UI-Design des nscale DMS Assistenten dienen. Die Komponenten sind als Vue 3 Single File Components (SFCs) mit TypeScript implementiert und folgen den Prinzipien eines modernen, zugänglichen und konsistenten Designs.

## Überblick

Die Basis-UI-Komponenten bilden das Fundament des Komponentensystems und werden für den Aufbau komplexerer Komponenten und Interfaces verwendet. Sie bieten eine einheitliche Gestaltung, konsistente Interaktionen und erfüllen die Anforderungen an Barrierefreiheit.

## Designprinzipien

Die Komponenten folgen diesen zentralen Designprinzipien:

1. **Konsistenz**: Einheitliche Erscheinung und Verhalten in der gesamten Anwendung
2. **Modularität**: Komponenten sind unabhängig und können flexibel kombiniert werden
3. **Barrierefreiheit**: WAI-ARIA-Unterstützung für Screenreader und Tastaturbedienung
4. **Responsivität**: Anpassungsfähigkeit an verschiedene Bildschirmgrößen
5. **Thematisierbarkeit**: Unterstützung für Light Mode, Dark Mode und benutzerdefinierte Themes

## Komponenten

### Button

Die Button-Komponente bietet verschiedene Erscheinungsbilder und Zustände für Aktionen in der Benutzeroberfläche.

#### Eigenschaften

- **Varianten**: primary, secondary, tertiary, danger, ghost
- **Größen**: small, medium, large
- **Zustände**: default, hover, focus, active, disabled, loading
- **Icons**: Unterstützung für Icons links, rechts oder als reinen Icon-Button
- **Volle Breite**: Option, um die gesamte Containerbreite einzunehmen

#### Beispiel

```vue
<Button 
  variant="primary" 
  size="medium" 
  :loading="isLoading"
  :disabled="isDisabled"
  :iconLeft="IconComponent"
  @click="handleClick"
>
  Button Text
</Button>
```

### Input

Die Input-Komponente dient zur Texteingabe und Datenerfassung mit verschiedenen Typen und Validierungszuständen.

#### Eigenschaften

- **Typen**: text, password, number, email, etc.
- **Zustände**: default, focus, error, disabled
- **Validierung**: Fehlermeldungen und Hilfstexte
- **Ergänzungen**: Label, Prefix/Suffix-Icons, Zeichenzähler
- **Spezialfunktionen**: Umschaltbare Passwort-Sichtbarkeit

#### Beispiel

```vue
<Input
  v-model="username"
  label="Benutzername"
  placeholder="Geben Sie Ihren Benutzernamen ein"
  :error="errors.username"
  helperText="Ihr Benutzername sollte eindeutig sein"
  required
/>
```

### Card

Die Card-Komponente dient als Container für zusammengehörige Inhalte und bietet verschiedene Erscheinungsbilder.

#### Eigenschaften

- **Bereiche**: Kopf-, Haupt- und Fußbereich über Slots
- **Varianten**: default, elevated, bordered, flat
- **Interaktion**: Optionale Interaktivität für klickbare Karten
- **Anpassbarkeit**: Einstellbare Größen, Breiten und Abstände

#### Beispiel

```vue
<Card 
  title="Karteninformationen" 
  variant="elevated"
  :interactive="true"
  @click="handleCardClick"
>
  <p>Hauptinhalt der Karte mit wichtigen Informationen.</p>
  <template #footer>
    <Button variant="secondary">Abbrechen</Button>
    <Button variant="primary">Bestätigen</Button>
  </template>
</Card>
```

### Alert

Die Alert-Komponente zeigt wichtige Mitteilungen und Benachrichtigungen an.

#### Eigenschaften

- **Typen**: info, success, warning, error
- **Ergänzungen**: Titel, Icons, Schließen-Button
- **Animation**: Animiertes Ein-/Ausblenden
- **Inhalte**: Unterstützung für Text oder HTML-Inhalte

#### Beispiel

```vue
<Alert
  type="warning"
  title="Achtung"
  message="Diese Aktion kann nicht rückgängig gemacht werden."
  :dismissible="true"
  @close="hideAlert"
/>
```

### Modal

Die Modal-Komponente präsentiert fokussierte Inhalte im Vordergrund mit blockiertem Hintergrund.

#### Eigenschaften

- **Struktur**: Titelleiste, Inhaltsbereich, Aktionsbereich (Footer)
- **Größen**: small, medium, large, full
- **Interaktion**: Schließen durch ESC-Taste, Klick außerhalb oder Schließen-Button
- **Zugänglichkeit**: Fokus-Trap für verbesserte Barrierefreiheit
- **Animation**: Sanfte Ein-/Ausblendung

#### Beispiel

```vue
<Modal
  :open="isModalOpen"
  title="Dokument bearbeiten"
  size="medium"
  @close="closeModal"
>
  <p>Hier können Sie die Eigenschaften des Dokuments bearbeiten.</p>
  <template #footer>
    <Button variant="secondary" @click="closeModal">Abbrechen</Button>
    <Button variant="primary" @click="saveAndClose">Speichern</Button>
  </template>
</Modal>
```

## Technische Details

### Verwendete Technologien

- **Vue 3 Composition API** mit `<script setup>` Syntax
- **TypeScript** für statische Typisierung
- **CSS-Variablen** für Theming und Anpassbarkeit
- **WAI-ARIA** Attribute für Barrierefreiheit
- **BEM-Namenskonvention** für CSS-Klassen

### CSS-Variablen

Die Komponenten verwenden ein einheitliches System von CSS-Variablen, um Anpassungen und Theming zu ermöglichen:

```css
:root {
  /* Farben */
  --n-color-primary: #0066cc;
  --n-color-primary-dark: #0052a3;
  --n-color-primary-light: #4299e1;
  --n-color-danger: #e53e3e;
  --n-color-danger-dark: #c53030;
  --n-color-white: #ffffff;
  --n-color-gray-100: #f5f5f5;
  --n-color-gray-300: #e2e8f0;
  --n-color-gray-500: #a0aec0;
  --n-color-gray-700: #4a5568;
  --n-color-gray-900: #1a202c;
  
  /* Typografie */
  --n-font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --n-font-size-xs: 0.75rem;
  --n-font-size-sm: 0.875rem;
  --n-font-size-md: 1rem;
  --n-font-size-lg: 1.125rem;
  
  /* Abstände und Größen */
  --n-border-radius: 4px;
  --n-border-radius-sm: 2px;
  --n-z-index-modal: 1000;
}
```

### Barrierefreiheit

Alle Komponenten wurden mit Fokus auf Barrierefreiheit entwickelt:

- **Semantische HTML-Elemente**: Verwendung der korrekten HTML-Elemente für ihren Zweck
- **ARIA-Attribute**: Zusätzliche Attribute für assistive Technologien
- **Keyboard-Navigation**: Vollständige Unterstützung für Tastaturnavigation
- **Fokus-Management**: Korrekte Verwaltung des Fokus, besonders bei Modals
- **Screenreader-Texte**: Zusätzliche Texte für Screenreader, wo nötig

### Verwendung im Projekt

Die Komponenten können über den zentralen Index importiert werden:

```javascript
import { Button, Input, Card, Alert, Modal } from '@/components/ui/base';
```

## Integration mit Fallback-Mechanismus

Die Basis-UI-Komponenten sind vollständig mit dem in [ERROR_HANDLING_FALLBACK.md](../ERROR_HANDLING_FALLBACK.md) beschriebenen Fallback-Mechanismus kompatibel. In Kombination mit dem `EnhancedFeatureWrapper` können moderne UI-Komponenten mit Fallback-Optionen für ältere oder weniger stabile Browser eingesetzt werden.

```vue
<EnhancedFeatureWrapper
  feature="useModernButton"
  :new-component="Button"
  :legacy-component="LegacyButton"
  fallback-strategy="threshold"
>
  <!-- Button-Props und Slots werden weitergeleitet -->
  <template #default="{ ...props }">
    Button Text
  </template>
</EnhancedFeatureWrapper>
```

## Erweiterbarkeit

Die Basis-UI-Komponenten sind so konzipiert, dass sie leicht erweitert werden können:

1. **Theming**: Anpassung durch Überschreiben der CSS-Variablen
2. **Komposition**: Zusammenfassung von Komponenten zu komplexeren Einheiten
3. **Props**: Erweiterbare Prop-Interfaces für zukünftige Eigenschaften
4. **Slots**: Flexible Slots für benutzerdefinierte Inhalte

## Best Practices

- **Konsistenz wahren**: Verwenden Sie die Basis-UI-Komponenten konsequent in der gesamten Anwendung.
- **Barrierefreiheit nicht deaktivieren**: Entfernen Sie keine ARIA-Attribute oder Keyboard-Listener.
- **Theming über CSS-Variablen**: Überschreiben Sie CSS-Variablen, statt die Komponenten-Styles direkt zu ändern.
- **Responsive Design berücksichtigen**: Testen Sie die Komponenten auf verschiedenen Bildschirmgrößen.
- **Unit-Tests schreiben**: Stellen Sie sicher, dass für alle Komponenten und Funktionen Tests existieren.

## Zusammenfassung

Die Basis-UI-Komponenten bieten eine solide Grundlage für die Benutzeroberfläche des nscale DMS Assistenten. Sie vereinen moderne Design-Prinzipien mit technischer Robustheit und Barrierefreiheit, um eine konsistente und benutzerfreundliche Erfahrung zu gewährleisten.