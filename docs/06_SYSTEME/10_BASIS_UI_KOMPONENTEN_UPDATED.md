# Basis-UI-Komponenten

Diese Dokumentation bietet einen Überblick über die grundlegenden UI-Komponenten des nscale DMS Assistenten, die in der Vue3-SFC-Architektur implementiert wurden.

## Allgemeine Komponenten

### Button

Die `Button`-Komponente ist ein flexibles und wiederverwendbares Element mit verschiedenen Stilen und Zustände.

**Eigenschaften:**
- `label`: Text, der im Button angezeigt wird
- `variant`: Visueller Stil (`primary`, `secondary`, `outline`, `text`, `danger`)
- `size`: Größe des Buttons (`sm`, `md`, `lg`)
- `icon`: Optional, FontAwesome-Icon, das neben dem Text angezeigt wird
- `disabled`: Deaktiviert den Button
- `loading`: Zeigt einen Ladeindikator
- `block`: Volle Breite des Containers

**Beispiel:**
```vue
<Button 
  label="Speichern" 
  variant="primary" 
  icon="fa-save" 
  :loading="isSaving" 
  @click="saveData"
/>
```

### Card

Die `Card`-Komponente ist ein Container für Inhalte mit definierter Struktur.

**Eigenschaften:**
- `title`: Optionaler Titel der Card
- `subtitle`: Optionaler Untertitel
- `shadow`: Stärke des Schattens (`sm`, `md`, `lg`)

**Slots:**
- `header`: Benutzerdefinierter Header
- `default`: Hauptinhalt
- `footer`: Footer-Bereich

**Beispiel:**
```vue
<Card title="Benutzerinformationen" shadow="md">
  <UserDetails :user="currentUser" />
  <template #footer>
    <Button label="Bearbeiten" variant="secondary" />
  </template>
</Card>
```

### Input

Die `Input`-Komponente ist ein erweitertes Texteingabefeld mit Validierungsfunktionen.

**Eigenschaften:**
- `modelValue`: v-model Wert
- `label`: Beschriftung des Feldes
- `placeholder`: Platzhaltertext
- `type`: Input-Typ (`text`, `password`, `email`, etc.)
- `required`: Gibt an, ob das Feld erforderlich ist
- `validation`: Validierungsregeln
- `error`: Fehlermeldung

**Beispiel:**
```vue
<Input 
  v-model="email" 
  label="E-Mail-Adresse" 
  type="email" 
  required 
  :validation="validateEmail" 
/>
```

### Select

Die `Select`-Komponente ist ein Auswahlmenü für vordefinierte Optionen.

**Eigenschaften:**
- `modelValue`: v-model Wert
- `label`: Beschriftung des Feldes
- `options`: Array von Auswahloptionen
- `placeholder`: Platzhaltertext
- `required`: Gibt an, ob das Feld erforderlich ist

**Beispiel:**
```vue
<Select 
  v-model="selectedCountry" 
  label="Land" 
  :options="countries" 
  required 
/>
```

### Checkbox

Die `Checkbox`-Komponente ist ein Toggle-Element für Boolean-Werte.

**Eigenschaften:**
- `modelValue`: v-model Wert
- `label`: Beschriftung der Checkbox
- `disabled`: Deaktiviert die Checkbox

**Beispiel:**
```vue
<Checkbox v-model="agreeToTerms" label="Ich akzeptiere die AGB" />
```

### Radio

Die `Radio`-Komponente ist ein Auswahlbutton für eine Option aus mehreren.

**Eigenschaften:**
- `modelValue`: v-model Wert
- `value`: Wert dieser Radiooption
- `label`: Beschriftung des Radio-Buttons
- `disabled`: Deaktiviert den Radio-Button

**Beispiel:**
```vue
<Radio v-model="gender" value="male" label="Männlich" />
<Radio v-model="gender" value="female" label="Weiblich" />
<Radio v-model="gender" value="other" label="Andere" />
```

### Modal

Die `Modal`-Komponente zeigt Inhalte in einem modalen Dialog an.

**Eigenschaften:**
- `isOpen`: Steuert die Sichtbarkeit
- `title`: Titel des Modals
- `size`: Größe (`sm`, `md`, `lg`, `xl`)
- `closeOnClickOutside`: Schließt das Modal bei Klick außerhalb

**Slots:**
- `header`: Benutzerdefinierter Header
- `default`: Hauptinhalt
- `footer`: Footer-Bereich mit Aktionsbuttons

**Beispiel:**
```vue
<Modal 
  :isOpen="showDetailsModal" 
  title="Dokumentdetails" 
  @close="showDetailsModal = false"
>
  <DocumentDetails :document="selectedDocument" />
  <template #footer>
    <Button label="Schließen" @click="showDetailsModal = false" />
    <Button label="Bearbeiten" variant="primary" @click="editDocument" />
  </template>
</Modal>
```

### Toast

Die `Toast`-Komponente zeigt temporäre Benachrichtigungen an.

**Eigenschaften:**
- `type`: Art der Benachrichtigung (`success`, `error`, `warning`, `info`)
- `title`: Titel der Benachrichtigung
- `message`: Detaillierte Nachricht
- `duration`: Anzeigedauer in ms (Standard: 5000)

**Beispiel:**
```vue
<Toast 
  type="success" 
  title="Erfolg" 
  message="Die Datei wurde erfolgreich hochgeladen." 
  :duration="3000" 
/>
```

### Alert

Die `Alert`-Komponente zeigt wichtige Meldungen oder Warnungen an.

**Eigenschaften:**
- `type`: Art der Meldung (`success`, `error`, `warning`, `info`)
- `title`: Optionaler Titel
- `dismissible`: Gibt an, ob die Meldung geschlossen werden kann

**Beispiel:**
```vue
<Alert 
  type="warning" 
  title="Achtung" 
  dismissible
>
  Ihre Sitzung wird in 5 Minuten ablaufen. Bitte speichern Sie Ihre Änderungen.
</Alert>
```

### ProgressIndicator

Die `ProgressIndicator`-Komponente visualisiert den Fortschritt eines Vorgangs.

**Eigenschaften:**
- `value`: Aktueller Wert (0-100)
- `type`: Stil der Anzeige (`bar`, `circle`)
- `size`: Größe (`sm`, `md`, `lg`)
- `showLabel`: Zeigt den Prozentwert an

**Beispiel:**
```vue
<ProgressIndicator 
  :value="uploadProgress" 
  type="bar" 
  size="md" 
  showLabel 
/>
```

### Pagination

Die `Pagination`-Komponente ermöglicht die Navigation zwischen Seiten.

**Eigenschaften:**
- `currentPage`: Aktuelle Seite
- `totalPages`: Gesamtanzahl der Seiten
- `maxVisiblePages`: Maximale Anzahl der angezeigten Seitenzahlen

**Beispiel:**
```vue
<Pagination 
  :currentPage="currentPage" 
  :totalPages="totalPages" 
  :maxVisiblePages="5" 
  @page-change="changePage" 
/>
```

### Table

Die `Table`-Komponente zeigt strukturierte Daten in Tabellenform an.

**Eigenschaften:**
- `columns`: Definition der Tabellenspalten
- `data`: Anzuzeigende Daten
- `sortable`: Gibt an, ob die Tabelle sortierbar ist
- `selectable`: Ermöglicht die Auswahl von Zeilen

**Beispiel:**
```vue
<Table 
  :columns="columnsDefinition" 
  :data="documents" 
  sortable 
  selectable 
  @select="handleSelection" 
/>
```

### TabPanel

Die `TabPanel`-Komponente organisiert Inhalte in Tabs.

**Eigenschaften:**
- `tabs`: Array von Tab-Definitionen
- `activeTab`: Index oder ID des aktiven Tabs

**Beispiel:**
```vue
<TabPanel 
  :tabs="[
    { id: 'details', label: 'Details' },
    { id: 'history', label: 'Verlauf' },
    { id: 'permissions', label: 'Berechtigungen' }
  ]" 
  :activeTab="activeTab" 
  @tab-change="changeTab" 
>
  <template #details>
    <DocumentDetails :document="currentDocument" />
  </template>
  <template #history>
    <DocumentHistory :documentId="currentDocument.id" />
  </template>
  <template #permissions>
    <DocumentPermissions :documentId="currentDocument.id" />
  </template>
</TabPanel>
```

## SettingsPanel und Einstellungs-Komponenten

Das SettingsPanel bietet eine zentrale Benutzeroberfläche zur Verwaltung aller Anwendungseinstellungen. 

### SettingsPanel

Die `SettingsPanel`-Komponente ist ein Container für verschiedene Einstellungskategorien mit einer einheitlichen Navigation.

**Eigenschaften:**
- `isVisible`: Steuert die Sichtbarkeit des Panels
- `activeCategory` (intern): Aktuell ausgewählte Kategorie

**Events:**
- `close`: Wird ausgelöst, wenn das Panel geschlossen wird
- `save`: Wird ausgelöst, wenn Einstellungen gespeichert werden

**Beispiel:**
```vue
<SettingsPanel 
  :isVisible="showSettings" 
  @close="showSettings = false" 
  @save="handleSettingsSaved" 
/>
```

### AppearanceSettings

Die `AppearanceSettings`-Komponente ermöglicht die Anpassung des Erscheinungsbilds der Anwendung.

**Features:**
- Themenwahl (Hell/Dunkel und vordefinierte Designs)
- Schriftgröße und Schriftart-Einstellungen
- Zeilenhöhenanpassung
- Erstellung benutzerdefinierter Themes

**Events:**
- `apply-settings`: Wird ausgelöst, wenn Einstellungen geändert werden
- `reset`: Wird ausgelöst, wenn Einstellungen zurückgesetzt werden

### NotificationSettings

Die `NotificationSettings`-Komponente steuert alle Benachrichtigungseinstellungen.

**Features:**
- Globales Ein-/Ausschalten von Benachrichtigungen
- Tonbenachrichtigungen
- Desktop-Benachrichtigungen mit Berechtigungsanfrage
- Einstellungen für verschiedene Benachrichtigungstypen (Session-Abschluss, Erwähnungen)
- Test-Funktion für Benachrichtigungen

**Events:**
- `apply-settings`: Wird ausgelöst, wenn Einstellungen geändert werden
- `reset`: Wird ausgelöst, wenn Einstellungen zurückgesetzt werden

### PrivacySettings

Die `PrivacySettings`-Komponente verwaltet datenschutzbezogene Einstellungen.

**Features:**
- Datenspeicherungsoptionen (Chat-Verläufe, Einstellungen)
- Einstellungen für Analytik und Fehlerberichte
- Cookie-Management
- Funktionen zum Löschen des Chat-Verlaufs
- Datenexport-Funktionalität
- Option zum Entfernen aller gespeicherten Daten

**Events:**
- `apply-settings`: Wird ausgelöst, wenn Einstellungen geändert werden
- `reset`: Wird ausgelöst, wenn Einstellungen zurückgesetzt werden

### AccessibilitySettings

Die `AccessibilitySettings`-Komponente verbessert die Zugänglichkeit der Anwendung.

**Features:**
- Reduzierte Bewegungen für Animationen
- Hochkontrastmodus
- Textgrößenanpassungen
- Screenreader-Unterstützung
- Tastaturkürzel-Optionen
- Verbesserte Fokusanzeigen

**Events:**
- `apply-settings`: Wird ausgelöst, wenn Einstellungen geändert werden
- `reset`: Wird ausgelöst, wenn Einstellungen zurückgesetzt werden

## Integration des SettingsPanel

Die Einstellungskomponenten sind vollständig in das Vue 3 SFC-System integriert und nutzen:

- Pinia-Store (`useSettingsStore`) zur zentralen Verwaltung aller Einstellungen
- TypeScript-Interfaces für typsichere Einstellungsobjekte
- Lokalspeicher zur persistenten Datenspeicherung
- Reaktivität für sofortige Änderungen
- Responsive Design für alle Bildschirmgrößen
- I18n für mehrsprachige Unterstützung

## Verbindung zur SettingsView

Die `SettingsView` integriert das SettingsPanel in die Anwendung und bietet:

- Übersichtsseite mit Karten für die verschiedenen Einstellungskategorien
- Shortcuts für häufig verwendete Einstellungen
- Systeminformationen
- Toggle zum Ein-/Ausblenden des SettingsPanels

## Verwendung der Einstellungen

Andere Komponenten können auf die Einstellungen über den SettingsStore zugreifen:

```js
import { useSettingsStore } from '@/stores/settings';

export default {
  setup() {
    const settingsStore = useSettingsStore();
    
    // Aktives Theme abrufen
    const currentTheme = settingsStore.currentTheme;
    
    // Auf Benachrichtigungseinstellungen zugreifen
    const notificationsEnabled = settingsStore.notifications.enabled;
    
    // Schriftgröße ändern
    function increaseFontSize() {
      settingsStore.updateFontSettings({ size: 'large' });
    }
    
    return {
      currentTheme,
      notificationsEnabled,
      increaseFontSize
    };
  }
};
```

## Style-Anpassung

Die Komponenten nutzen CSS-Variablen, die dynamisch vom SettingsStore gesetzt werden:

```css
/* Beispiel für dynamische Farbanpassung */
.my-component {
  background-color: var(--color-background);
  color: var(--color-text);
  font-family: var(--font-family);
  font-size: var(--font-size);
  line-height: var(--line-height);
}
```

## Tests

Alle Einstellungskomponenten verfügen über umfassende Tests:

1. **Rendering-Tests**: Überprüfen der korrekten Anzeige aller UI-Elemente
2. **Interaktions-Tests**: Validierung der Benutzerinteraktionen und Events
3. **Store-Integration-Tests**: Tests der Verbindung zu Pinia-Stores
4. **Responsive-Design-Tests**: Überprüfung des Verhaltens auf verschiedenen Bildschirmgrößen
5. **Accessibility-Tests**: Sicherstellung der Zugänglichkeit für alle Benutzer