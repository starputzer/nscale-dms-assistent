# Base UI-Komponenten

Diese Sammlung von Basis-UI-Komponenten wurde für die Admin-Oberfläche entwickelt, um ein konsistentes Design und Verhalten zu gewährleisten.

## Komponenten

### Buttons
- `BaseButton` - Eine vielseitige Button-Komponente mit verschiedenen Varianten und Größen.

### Inputs
- `BaseInput` - Eingabefeld mit Label, Validierung und Fehlermeldungen.
- `BaseSelect` - Dropdown-Auswahlkomponente mit Suchfunktion und benutzerdefinierter Anzeige.
- `BaseCheckbox` - Checkbox mit Label und Validierung.
- `BaseToggle` - Toggle-Switch für Ein/Aus-Einstellungen.
- `BaseTextarea` - Mehrzeiliges Textfeld mit optionaler Größenanpassung.

### Layout
- `BaseCard` - Container für Inhalte mit Header, Body und Footer.
- `BaseTabs` - Tab-Navigation mit verschiedenen Stilen.

### Feedback
- `BaseAlert` - Statusmeldungen und Warnhinweise.
- `BaseLoader` - Ladeanzeigen in verschiedenen Stilen.
- `BaseToast` - Temporäre Benachrichtigungen.

## Verwendung

### Import

Importieren Sie die Komponenten direkt:

```vue
<script setup>
import { BaseButton, BaseInput } from '@/components/base';
</script>
```

### Beispiele

#### Button

```vue
<BaseButton variant="primary" size="medium" :loading="isLoading" @click="handleClick">
  Speichern
</BaseButton>
```

#### Eingabefeld

```vue
<BaseInput
  v-model="username"
  label="Benutzername"
  placeholder="Geben Sie Ihren Benutzernamen ein"
  :error="errors.username"
  required
/>
```

#### Select

```vue
<BaseSelect
  v-model="selectedOption"
  :options="options"
  label="Kategorie"
  placeholder="Kategorie auswählen"
/>
```

#### Card

```vue
<BaseCard title="Benutzerstatistik" variant="primary" bordered>
  <template #header>
    <div class="flex justify-between">
      <h3>Benutzerstatistik</h3>
      <BaseButton size="small" variant="text">Aktualisieren</BaseButton>
    </div>
  </template>
  
  <!-- Inhalt -->
  
  <template #footer>
    <BaseButton variant="secondary">Mehr Details</BaseButton>
  </template>
</BaseCard>
```

#### Alert

```vue
<BaseAlert
  type="warning"
  title="Achtung"
  message="Diese Aktion kann nicht rückgängig gemacht werden."
  :dismissible="true"
  @dismiss="hideAlert"
/>
```

#### Tabs

```vue
<BaseTabs
  v-model="activeTab"
  :tabs="[
    { label: 'Dashboard', icon: DashboardIcon },
    { label: 'Benutzer', icon: UsersIcon },
    { label: 'Einstellungen', icon: SettingsIcon }
  ]"
>
  <template #tab-0>Dashboard-Inhalt</template>
  <template #tab-1>Benutzer-Inhalt</template>
  <template #tab-2>Einstellungen-Inhalt</template>
</BaseTabs>
```

## Theming

Die Komponenten verwenden CSS-Variablen, die in `src/assets/styles/variables.css` definiert sind. Diese können überschrieben werden, um das Design an spezifische Anforderungen anzupassen.

### Dark Mode

Um den Dark Mode zu aktivieren, fügen Sie einfach die Klasse `dark-mode` zum `<html>` oder `<body>` Element hinzu:

```javascript
// Dark Mode aktivieren
document.documentElement.classList.add('dark-mode');

// Dark Mode deaktivieren
document.documentElement.classList.remove('dark-mode');
```

## Barrierefreiheit

Diese Komponenten wurden unter Berücksichtigung von Barrierefreiheitsrichtlinien entwickelt:

- Tastaturnavigation
- ARIA-Attribute
- Ausreichender Farbkontrast
- Screenreader-Unterstützung

## Best Practices

1. Verwenden Sie konsistente Varianten und Größen innerhalb derselben Ansicht
2. Platzieren Sie zusammengehörige Formularfelder in Gruppen
3. Verwenden Sie aussagekräftige Fehlermeldungen, wenn Validierung fehlschlägt
4. Bevorzugen Sie Inline-Validierung, um Benutzern sofortiges Feedback zu geben
5. Verwenden Sie Loader-Komponenten, um anzuzeigen, dass ein Prozess läuft