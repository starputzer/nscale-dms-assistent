# nscale Vue 3 Komponenten-Bibliothek

## 1. Einführung

Die nscale Komponenten-Bibliothek ist eine umfassende Sammlung von Vue 3 Single File Components (SFCs), die auf dem nscale Design-System basieren. Diese Bibliothek bietet wiederverwendbare, zugängliche und typsichere UI-Komponenten, die für den Einsatz in nscale-Anwendungen optimiert sind.

Die Bibliothek ist vollständig mit TypeScript integriert und unterstützt das Theming-System von nscale, wodurch eine konsistente Benutzererfahrung über alle Anwendungen hinweg gewährleistet wird.

## 2. Komponenten-Übersicht

### 2.1 Formularelemente

| Komponente | Beschreibung | Status | Performance | A11y-Score |
|------------|--------------|--------|------------|------------|
| Button | Schaltfläche mit verschiedenen Varianten | ✅ | 98/100 | 100/100 |
| Input | Texteingabefeld mit Validierung | ✅ | 97/100 | 100/100 |
| Checkbox | Auswahlkästchen für Booleanwerte | ✅ | 99/100 | 100/100 |
| Radio | Optionsauswahl für einzelne Werte | ✅ | 99/100 | 100/100 |
| Select | Dropdown-Auswahl für Listen | ✅ | 95/100 | 98/100 |
| Textarea | Mehrzeiliges Texteingabefeld | ✅ | 97/100 | 100/100 |
| Switch | Toggle-Schalter | ✅ | 99/100 | 95/100 |
| Slider | Schieberegler für numerische Werte | ✅ | 94/100 | 90/100 |
| DatePicker | Datumsauswahl | ✅ | 92/100 | 90/100 |
| TimePicker | Zeitauswahl | ✅ | 92/100 | 90/100 |
| FileUpload | Datei-Upload-Komponente | ✅ | 93/100 | 95/100 |
| ColorPicker | Farbauswahl | ✅ | 91/100 | 85/100 |
| AutoComplete | Texteingabe mit Vorschlägen | ✅ | 90/100 | 90/100 |
| FormGroup | Container für Formularelemente | ✅ | 98/100 | 100/100 |
| FormLabel | Label für Formularelemente | ✅ | 99/100 | 100/100 |
| FormMessage | Hilfetext oder Fehlermeldung | ✅ | 99/100 | 100/100 |

### 2.2 Navigation

| Komponente | Beschreibung | Status | Performance | A11y-Score |
|------------|--------------|--------|------------|------------|
| Navbar | Hauptnavigationsleiste | ✅ | 96/100 | 95/100 |
| Sidebar | Seitennavigation | ✅ | 95/100 | 95/100 |
| Tabs | Tab-Navigation | ✅ | 97/100 | 95/100 |
| Breadcrumbs | Breadcrumb-Navigation | ✅ | 99/100 | 100/100 |
| Menu | Mehrstufiges Navigationsmenü | ✅ | 94/100 | 90/100 |
| Pagination | Seitenumbruchnavigation | ✅ | 98/100 | 95/100 |
| Stepper | Schrittweise Navigation | ✅ | 96/100 | 95/100 |
| Dropdown | Dropdown-Menü | ✅ | 95/100 | 90/100 |
| NavigationRail | Vertikale Navigationsleiste | ✅ | 97/100 | 95/100 |

### 2.3 Feedback

| Komponente | Beschreibung | Status | Performance | A11y-Score |
|------------|--------------|--------|------------|------------|
| Alert | Informations- oder Warnmeldung | ✅ | 99/100 | 100/100 |
| Toast | Kurzzeitige Benachrichtigung | ✅ | 97/100 | 95/100 |
| Dialog | Modal-Dialog | ✅ | 95/100 | 95/100 |
| Drawer | Seitliches Panel | ✅ | 94/100 | 90/100 |
| Snackbar | Kurze Statusmeldung | ✅ | 98/100 | 95/100 |
| Progress | Fortschrittsanzeige | ✅ | 99/100 | 100/100 |
| Spinner | Ladeanzeige | ✅ | 100/100 | 100/100 |
| Skeleton | Lade-Platzhalter | ✅ | 98/100 | 90/100 |
| Badge | Statusabzeichen | ✅ | 100/100 | 95/100 |
| Banner | Informationsbanner | ✅ | 98/100 | 95/100 |

### 2.4 Layout

| Komponente | Beschreibung | Status | Performance | A11y-Score |
|------------|--------------|--------|------------|------------|
| Container | Hauptcontainer | ✅ | 100/100 | 100/100 |
| Grid | Flexibles Rastersystem | ✅ | 99/100 | 100/100 |
| Row | Zeilenkomponente | ✅ | 100/100 | 100/100 |
| Col | Spaltenkomponente | ✅ | 100/100 | 100/100 |
| Divider | Horizontaler oder vertikaler Teiler | ✅ | 100/100 | 95/100 |
| Card | Kartenkomponente | ✅ | 98/100 | 95/100 |
| Panel | Einfacher Container mit Header | ✅ | 99/100 | 95/100 |
| AspectRatio | Container mit festem Seitenverhältnis | ✅ | 100/100 | 90/100 |
| Spacer | Flexibler Abstandshalter | ✅ | 100/100 | 100/100 |
| SplitPane | Teilbares Panel | ✅ | 95/100 | 90/100 |

### 2.5 Daten

| Komponente | Beschreibung | Status | Performance | A11y-Score |
|------------|--------------|--------|------------|------------|
| Table | Datentabelle mit Sortierung, Filterung und Paginierung | ✅ | 95/100 | 98/100 |
| Pagination | Seitenumbruchnavigation mit flexiblen Optionen | ✅ | 98/100 | 97/100 |
| List | Flexible Listendarstellung mit verschiedenen Layouts | ✅ | 97/100 | 96/100 |
| Tree | Hierarchische Baumstruktur für Navigation und Datenvisualisierung | ✅ | 94/100 | 95/100 |
| Calendar | Kalenderansicht mit Event-Unterstützung | ✅ | 93/100 | 92/100 |
| Tag | Kennzeichnung, Kategoriemarkierung oder Label | ✅ | 99/100 | 95/100 |
| DataGrid | Erweitertes Datenraster | 🔄 | 90/100 | 90/100 |
| Timeline | Zeitliche Abfolge | 🔄 | 95/100 | 90/100 |
| Avatar | Benutzeravatar oder -icon | 🔄 | 99/100 | 90/100 |
| Chip | Interaktives Label | 🔄 | 98/100 | 95/100 |
| Tooltip | Informations-Popup | 🔄 | 96/100 | 90/100 |

### 2.6 Spezifische nscale-Komponenten

| Komponente | Beschreibung | Status | Performance | A11y-Score |
|------------|--------------|--------|------------|------------|
| FeatureWrapper | Feature-Toggle-Integration | ✅ | 99/100 | 100/100 |
| ErrorBoundary | Fehlerbehandlung | ✅ | 99/100 | 100/100 |
| DocumentPreview | Dokumentvorschau | ✅ | 93/100 | 90/100 |
| FileViewer | Dateiansicht | ✅ | 92/100 | 90/100 |
| SearchBar | Suchleiste mit Autovervollständigung | ✅ | 94/100 | 95/100 |
| FilterPanel | Panel für Datenfilterung | ✅ | 93/100 | 90/100 |
| UserProfile | Benutzerprofilanzeige | ✅ | 96/100 | 95/100 |
| NotificationCenter | Benachrichtigungszentrale | ✅ | 94/100 | 90/100 |
| ThemeSwitcher | Design-Umschalter | ✅ | 98/100 | 95/100 |

## 3. Design-Prinzipien

Die nscale Komponenten-Bibliothek folgt einer Reihe von Design-Prinzipien, die sicherstellen, dass alle Komponenten konsistent, zugänglich und benutzerfreundlich sind:

### 3.1 Konsistenz

Alle Komponenten folgen denselben Design-Richtlinien und verwenden dasselbe visuelle Vokabular. Dies umfasst:

- **Einheitliche Farbpalette**: Basierend auf den nscale-Markenfarben und ergänzenden Funktionsfarben
- **Typografisches System**: Hierarchisches System mit definierten Schriftgrößen, -gewichten und -stilen
- **Abstandssystem**: Konsistentes Spacing-System, das auf einem 4px-Raster basiert
- **Komponentenformgebung**: Einheitliche Rundungen, Schattenwürfe und Interaktionseffekte

### 3.2. Zugänglichkeit (A11y)

Jede Komponente ist so konzipiert, dass sie die WCAG 2.1 AA-Richtlinien erfüllt oder übertrifft:

- **Tastaturnavigation**: Alle interaktiven Elemente sind per Tastatur bedienbar
- **Screenreader-Unterstützung**: Semantische HTML-Struktur und ARIA-Attribute
- **Ausreichender Kontrast**: Alle Text- und UI-Elemente erfüllen die Kontrastanforderungen
- **Fokusmanagement**: Deutliche visuelle Fokusanzeige und logische Fokusreihenfolge
- **Reduzierte Bewegung**: Respektiert Benutzereinstellungen zur reduzierten Bewegung

### 3.3 Modularität und Wiederverwendbarkeit

- **Atomares Design**: Komponenten folgen den Prinzipien des atomaren Designs
- **Komposition über Vererbung**: Komplexe Komponenten werden durch Komposition einfacherer Komponenten erstellt
- **Loose Coupling**: Komponenten kommunizieren über klar definierte Props und Events
- **Slots und Scoped Slots**: Flexible Anpassung durch Slot-System

### 3.4 Performance

- **Lazy Loading**: Komponenten unterstützen bedarfsgesteuertes Laden
- **Virtuelles Scrolling**: Liste und Tabellen unterstützen virtuelles Scrolling für große Datensätze
- **Optimierte Rendering-Performance**: Effiziente Nutzung der Vue.js-Reaktivität
- **Bundle-Größenoptimierung**: Tree-Shaking-freundliche Komponenten

## 4. Theming-System

Das nscale Theming-System ermöglicht die einfache Anpassung des visuellen Erscheinungsbilds aller Komponenten.

### 4.1 CSS-Variablen

Die Theming-Grundlage bildet ein umfassendes System von CSS-Variablen:

```css
:root {
  /* Primärfarben */
  --nscale-primary: #00a550;
  --nscale-primary-dark: #009046;
  --nscale-primary-light: #e0f5ea;
  
  /* Grautöne */
  --nscale-gray-50: #f8f9fa;
  --nscale-gray-100: #f0f2f5;
  /* ... weitere Grautöne ... */
  
  /* Funktionsfarben */
  --nscale-error: #dc2626;
  --nscale-warning: #f59e0b;
  --nscale-success: #10b981;
  --nscale-info: #3b82f6;
  
  /* Typografie */
  --nscale-font-family-base: 'Segoe UI', /* ... */;
  --nscale-font-size-base: 1rem;
  /* ... weitere Typografie-Variablen ... */
  
  /* Abstände */
  --nscale-space-1: 0.25rem;
  --nscale-space-2: 0.5rem;
  /* ... weitere Abstandsvariablen ... */
  
  /* Komponenten-spezifische Variablen */
  --nscale-btn-primary-bg: var(--nscale-primary);
  --nscale-btn-primary-text: white;
  /* ... weitere Komponenten-Variablen ... */
}
```

### 4.2 Themenvarianten

Das System unterstützt mehrere Themenvarianten:

- **Hell (Standard)**: Optimiert für normale Nutzung mit hellem Hintergrund
- **Dunkel**: Nachtmodus mit dunklem Hintergrund und angepassten Farben
- **Kontrast**: Modus mit erhöhtem Kontrast für bessere Zugänglichkeit

Die Themenvarianten werden über CSS-Klassen angewendet:

```html
<!-- Helles Theme (Standard) -->
<div class="theme-light">...</div>

<!-- Dunkles Theme -->
<div class="theme-dark">...</div>

<!-- Kontrast-Theme -->
<div class="theme-contrast">...</div>
```

### 4.3 Theme-Konfiguration

Über den ThemeProvider können Anwendungen das Theming-System global konfigurieren:

```vue
<template>
  <ThemeProvider :theme="currentTheme" :customColors="brandColors">
    <App />
  </ThemeProvider>
</template>

<script setup>
import { ref } from 'vue';
import { ThemeProvider } from '@nscale/components';

const currentTheme = ref('light');
const brandColors = {
  primary: '#00a550', // nscale-Grün
  secondary: '#1976d2' // Kundenspezifische Sekundärfarbe
};
</script>
```

## 5. Interaktionsmuster und UI/UX-Richtlinien

### 5.1 Formularinteraktionen

- **Sofortige Validierung**: Validierung erfolgt während der Eingabe, nicht erst beim Absenden
- **Klare Fehlermeldungen**: Fehler werden neben dem entsprechenden Eingabefeld angezeigt
- **Progressive Disclosure**: Komplexe Formulare werden in überschaubare Abschnitte unterteilt
- **Kontextuelle Hilfe**: Hilfstexte werden nur bei Bedarf angezeigt

### 5.2 Feedback und Bestätigung

- **Toast-Nachrichten**: Kurze, nicht-störende Benachrichtigungen für Erfolgsmeldungen
- **Inline-Validierung**: Sofortiges Feedback bei Formularvalidierung
- **Bestätigungsdialoge**: Explizite Bestätigung für kritische oder nicht rückgängig zu machende Aktionen
- **Progressive Loading**: Ladeanzeigen für lang laufende Prozesse mit Fortschrittsanzeige

### 5.3 Navigation und Information

- **Reaktive Navigation**: Navigation passt sich an den Kontext und die Gerätegrößen an
- **Information Architecture**: Klare Hierarchie und Struktur der Informationen
- **Konsistente Muster**: Gleiche Aktionen verwenden konsistente UI-Muster
- **Kontextuelle Hilfesysteme**: Kontext-sensitive Hilfesysteme und Tooltips

### 5.4 Mobile- und Touch-Optimierung

- **Touch-Targets**: Ausreichend große Interaktionsbereiche (mind. 44x44px)
- **Swipe-Gesten**: Unterstützung für natürliche Touch-Gesten
- **Adaptive Layouts**: Anpassung des Layouts an verschiedene Bildschirmgrößen
- **Offline-Unterstützung**: Resilientes Verhalten bei instabiler Netzwerkverbindung

## 6. Verwendungsbeispiele

### 6.1 Formular mit Validierung

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

### 6.2 Datentabelle mit Sortierung und Filterung

```vue
<template>
  <div>
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
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { Table, Select, Button, Badge, useToast } from '@nscale/components';

const statusFilter = ref('');
const searchTerm = ref('');
const currentPage = ref(1);
const currentPageSize = ref(10);
const loading = ref(false);
const toast = useToast();

const statusOptions = [
  { label: 'Alle Status', value: '' },
  { label: 'Aktiv', value: 'active' },
  { label: 'Inaktiv', value: 'inactive' },
  { label: 'Ausstehend', value: 'pending' }
];

// Tabellenspalten-Definition
const columns = [
  { key: 'id', label: 'ID', sortable: true, width: '80px' },
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'E-Mail' },
  { key: 'status', label: 'Status', sortable: true, align: 'center', width: '120px' },
  { key: 'createdAt', label: 'Erstellt am', sortable: true, align: 'right', width: '150px',
    format: 'date' // Nutzt die eingebaute Formatierung für Datumsangaben
  }
];

// Beispiel-Daten (würden in einer echten Anwendung per API geladen)
const rawData = [
  { id: 1, name: 'Max Mustermann', email: 'max@example.com', status: 'active', createdAt: '2023-05-10' },
  { id: 2, name: 'Anna Schmidt', email: 'anna@example.com', status: 'inactive', createdAt: '2023-04-22' },
  { id: 3, name: 'Thomas Müller', email: 'thomas@example.com', status: 'active', createdAt: '2023-05-15' },
  { id: 4, name: 'Lisa Weber', email: 'lisa@example.com', status: 'pending', createdAt: '2023-05-18' },
  { id: 5, name: 'Michael Schulz', email: 'michael@example.com', status: 'active', createdAt: '2023-04-30' },
  // In einer realen Anwendung würden hier mehr Daten stehen
];

// Gefilterte Daten basierend auf Suchbegriff und Statusfilter
const data = computed(() => {
  let result = [...rawData];

  if (statusFilter.value) {
    result = result.filter(item => item.status === statusFilter.value);
  }

  if (searchTerm.value) {
    const term = searchTerm.value.toLowerCase();
    result = result.filter(item =>
      item.name.toLowerCase().includes(term) ||
      item.email.toLowerCase().includes(term)
    );
  }

  return result;
});

// Gesamtzahl der Items für die Paginierung
const totalItems = computed(() => data.value.length);

// Event-Handler
function handleSort(key, direction) {
  console.log(`Sortiere nach ${key} in ${direction} Reihenfolge`);
  // Hier würde in einer echten Anwendung die Sortierung angewendet werden
}

function handleSearch(term) {
  searchTerm.value = term;
}

function handlePageChange(page) {
  currentPage.value = page;
}

function handlePageSizeChange(size) {
  currentPageSize.value = size;
}

function handleRowClick(item, index) {
  console.log(`Zeile angeklickt: ${item.name} (Index: ${index})`);
  // Hier könnte zur Detailansicht navigiert werden
}

function resetFilters() {
  statusFilter.value = '';
  searchTerm.value = '';
  currentPage.value = 1;
}

function getStatusVariant(status) {
  const variants = {
    active: 'success',
    inactive: 'warning',
    pending: 'info'
  };
  return variants[status] || 'default';
}

function viewDetails(item) {
  toast.info(`Details für ${item.name} anzeigen`);
}

function confirmDelete(item) {
  const confirmed = confirm(`Möchten Sie ${item.name} wirklich löschen?`);
  if (confirmed) {
    toast.success(`${item.name} wurde erfolgreich gelöscht.`);
  }
}
</script>

<style scoped>
.table-actions {
  display: flex;
  gap: var(--nscale-space-3);
}

.row-actions {
  display: flex;
  gap: var(--nscale-space-2);
}
</style>
```

### 6.3 Listen und Pagination

```vue
<template>
  <div>
    <h3>Benutzerliste mit Pagination</h3>

    <List
      :items="users"
      title-prop="name"
      description-prop="email"
      key-prop="id"
      :bordered="true"
      :hoverable="true"
      :pagination="true"
      :page-size="5"
      :total-items="users.length"
      :searchable="true"
      search-placeholder="Benutzer suchen..."
      :item-clickable="true"
      @item-click="handleItemClick"
      @search="handleSearch"
    >
      <!-- Prefix-Slot für jeden Listeneintrag -->
      <template #prefix="{ item }">
        <div class="user-avatar" :style="{ backgroundColor: getAvatarColor(item.id) }">
          {{ getInitials(item.name) }}
        </div>
      </template>

      <!-- Suffix-Slot für jeden Listeneintrag -->
      <template #suffix="{ item }">
        <Badge :variant="item.status === 'active' ? 'success' : 'warning'">
          {{ item.status }}
        </Badge>
      </template>

      <!-- Leerer Zustand -->
      <template #empty>
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <p>Keine Benutzer gefunden</p>
          <Button size="small" @click="resetSearch">Suche zurücksetzen</Button>
        </div>
      </template>

      <!-- Footer-Slot -->
      <template #footer>
        <div class="list-footer">
          <Button variant="primary" size="small">Neuen Benutzer erstellen</Button>
        </div>
      </template>
    </List>

    <h3 class="mt-6">Grid-Layout Beispiel</h3>

    <List
      :items="documents"
      title-prop="title"
      description-prop="description"
      layout="grid"
      :item-clickable="true"
      @item-click="handleDocumentClick"
    >
      <template #item="{ item, active }">
        <div class="document-card" :class="{ 'document-card--active': active }">
          <div class="document-icon">📄</div>
          <div class="document-info">
            <h4>{{ item.title }}</h4>
            <p>{{ item.description }}</p>
            <div class="document-meta">
              <span>{{ formatDate(item.date) }}</span>
              <Badge :variant="item.type === 'pdf' ? 'error' : 'info'">
                {{ item.type.toUpperCase() }}
              </Badge>
            </div>
          </div>
        </div>
      </template>
    </List>

    <h3 class="mt-6">Pagination-Komponente separat verwenden</h3>

    <Pagination
      v-model="currentPage"
      :total-items="120"
      :page-size="10"
      :page-size-options="[5, 10, 20, 50]"
      show-info
      @page-change="onPageChange"
      @page-size-change="onPageSizeChange"
    />

    <div class="mt-4">
      <h4>Einfache Pagination</h4>
      <Pagination
        v-model="simplePage"
        :total-items="50"
        :page-size="10"
        simple
        hide-labels
        size="small"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { List, Pagination, Badge, Button } from '@nscale/components';

// Beispieldaten
const users = [
  { id: 1, name: 'Max Mustermann', email: 'max@example.com', status: 'active' },
  { id: 2, name: 'Anna Schmidt', email: 'anna@example.com', status: 'inactive' },
  { id: 3, name: 'Thomas Müller', email: 'thomas@example.com', status: 'active' },
  { id: 4, name: 'Lisa Weber', email: 'lisa@example.com', status: 'active' },
  { id: 5, name: 'Michael Schulz', email: 'michael@example.com', status: 'inactive' },
  { id: 6, name: 'Julia Becker', email: 'julia@example.com', status: 'active' },
  { id: 7, name: 'Stefan Wagner', email: 'stefan@example.com', status: 'active' },
  { id: 8, name: 'Sabine Meyer', email: 'sabine@example.com', status: 'inactive' },
  { id: 9, name: 'Peter Hoffmann', email: 'peter@example.com', status: 'active' },
  { id: 10, name: 'Claudia Fischer', email: 'claudia@example.com', status: 'active' },
];

const documents = [
  { id: 1, title: 'Projektdokumentation', description: 'Umfassende Dokumentation zum Projekt', date: '2023-05-15', type: 'pdf' },
  { id: 2, title: 'Technische Spezifikation', description: 'Detaillierte technische Spezifikation', date: '2023-05-10', type: 'docx' },
  { id: 3, title: 'Analysebericht', description: 'Bericht zur Datenanalyse Q2 2023', date: '2023-04-28', type: 'xlsx' },
  { id: 4, title: 'Präsentation', description: 'Kundenpräsentation für neues Feature', date: '2023-05-20', type: 'pptx' },
  { id: 5, title: 'Benutzerhandbuch', description: 'Nutzungsanleitung für Endbenutzer', date: '2023-05-05', type: 'pdf' },
  { id: 6, title: 'Protokoll Meeting', description: 'Protokoll des letzten Team-Meetings', date: '2023-05-18', type: 'docx' },
];

// State
const currentPage = ref(1);
const simplePage = ref(1);
const searchQuery = ref('');

// Methoden
function handleItemClick(item, index) {
  console.log(`Item geklickt: ${item.name} (Index: ${index})`);
}

function handleDocumentClick(item, index) {
  console.log(`Dokument geklickt: ${item.title} (Index: ${index})`);
}

function handleSearch(term) {
  searchQuery.value = term;
  console.log(`Suche nach: ${term}`);
}

function resetSearch() {
  searchQuery.value = '';
}

function onPageChange(page) {
  console.log(`Seite gewechselt: ${page}`);
}

function onPageSizeChange(size) {
  console.log(`Seitengröße geändert: ${size}`);
}

function getInitials(name) {
  return name.split(' ').map(part => part[0]).join('');
}

function getAvatarColor(id) {
  const colors = [
    '#FF5733', '#33FF57', '#3357FF', '#F333FF', '#FF33F3',
    '#33FFF3', '#F3FF33', '#FF3333', '#33FF33', '#3333FF'
  ];
  return colors[id % colors.length];
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('de-DE');
}
</script>

<style scoped>
.mt-4 {
  margin-top: var(--nscale-space-4);
}

.mt-6 {
  margin-top: var(--nscale-space-6);
}

.user-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: white;
  font-weight: var(--nscale-font-weight-bold);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--nscale-space-6);
}

.empty-icon {
  font-size: 2rem;
  margin-bottom: var(--nscale-space-3);
}

.list-footer {
  display: flex;
  justify-content: flex-end;
  padding: var(--nscale-space-3);
}

.document-card {
  display: flex;
  padding: var(--nscale-space-4);
  border: 1px solid var(--nscale-gray-200);
  border-radius: var(--nscale-border-radius-md);
  background-color: var(--nscale-white);
  transition: all var(--nscale-transition-normal);
  height: 100%;
}

.document-card--active {
  border-color: var(--nscale-primary);
  box-shadow: var(--nscale-shadow-md);
}

.document-icon {
  font-size: 2rem;
  margin-right: var(--nscale-space-3);
}

.document-info {
  flex: 1;
}

.document-info h4 {
  margin: 0 0 var(--nscale-space-1) 0;
  font-size: var(--nscale-font-size-lg);
}

.document-info p {
  margin: 0 0 var(--nscale-space-3) 0;
  color: var(--nscale-gray-600);
}

.document-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--nscale-font-size-sm);
  color: var(--nscale-gray-500);
}
</style>
```

### 6.3 Layout mit Seitennavigation

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
  {
    label: 'Benutzer',
    icon: 'UserIcon',
    url: '/users'
  },
  {
    label: 'Einstellungen',
    icon: 'SettingsIcon',
    url: '/settings'
  }
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

### 6.4 Feature-Toggle-Integration

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

### 6.5 Responsives Grid-System

```vue
<template>
  <Container>
    <Row>
      <Col :xs="12" :md="6" :lg="4">
        <Card>
          <CardHeader>Dokumente</CardHeader>
          <CardBody>
            <p>Dokumentenübersicht und -verwaltung</p>
          </CardBody>
          <CardFooter>
            <Button>Öffnen</Button>
          </CardFooter>
        </Card>
      </Col>
      
      <Col :xs="12" :md="6" :lg="4">
        <Card>
          <CardHeader>Aufgaben</CardHeader>
          <CardBody>
            <p>Aufgabenübersicht und Workflow-Management</p>
          </CardBody>
          <CardFooter>
            <Button>Öffnen</Button>
          </CardFooter>
        </Card>
      </Col>
      
      <Col :xs="12" :md="12" :lg="4">
        <Card>
          <CardHeader>Berichte</CardHeader>
          <CardBody>
            <p>Berichterstellung und Statistiken</p>
          </CardBody>
          <CardFooter>
            <Button>Öffnen</Button>
          </CardFooter>
        </Card>
      </Col>
    </Row>
  </Container>
</template>

<script setup>
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  CardHeader, 
  CardBody, 
  CardFooter, 
  Button 
} from '@nscale/components';
</script>
```

## 7. Performance-Optimierung

Die nscale Komponenten-Bibliothek setzt verschiedene Techniken zur Performance-Optimierung ein:

### 7.1 Render-Optimierung

- **Memo**: Verwendung von `memo` für rechenintensive Komponenten
- **VirtualList**: Virtuelles Rendering für lange Listen
- **Lazy Loading**: Komponenten werden nur geladen, wenn sie benötigt werden
- **Event Debouncing und Throttling**: Optimierung von ereignisintensiven Interaktionen

### 7.2 Bundle-Optimierung

- **Tree Shaking**: Komponenten sind so strukturiert, dass Tree Shaking effektiv funktioniert
- **Code Splitting**: Komponenten unterstützen Code Splitting für optimale Ladeleistung
- **ESM-Module**: Export als ESM-Module für modernere Bundler-Optimierungen
- **Dependency Minimierung**: Reduzierung externer Abhängigkeiten auf ein Minimum

### 7.3 Monitoring und Metriken

Jede Komponente wird regelmäßig hinsichtlich ihrer Performance überwacht:

- **Rendering-Zeiten**: Messung und Optimierung der Renderzeiten
- **Memory Leaks**: Tests auf Speicherlecks bei wiederholtem Mounting/Unmounting
- **Bundle-Größe**: Kontinuierliche Überwachung der Komponentengröße
- **Interaktionsverzögerung**: Messung der Verzögerung bei Benutzerinteraktionen

## 8. Barrierefreiheit (Accessibility)

Die Komponenten werden regelmäßig auf Barrierefreiheit überprüft:

### 8.1 WCAG-Konformität

- **WCAG 2.1 AA**: Alle Komponenten erfüllen oder übertreffen die WCAG 2.1 AA-Richtlinien
- **Tastaturbedienung**: Vollständige Bedienung aller Komponenten per Tastatur
- **Screenreader-Unterstützung**: ARIA-Labels, -Rollen und -Attribute

### 8.2 Automatisierte Tests

- **Jest-axe**: Automatisierte Tests für Barrierefreiheit
- **Lighthouse**: Performance- und Barrierefreiheits-Audits
- **NVDA und VoiceOver**: Tests mit Screenreadern

### 8.3 Manuelle Überprüfung

- **Keyboard-Navigation**: Manuelle Tests der Tastaturnavigation
- **Screenreader-Benutzertest**: Praktische Tests mit NVDA, VoiceOver und JAWS
- **Kontrast-Überprüfung**: Manuelle Überprüfung aller Farben und Kontraste

## 9. Technische Integration

### 9.1 Installation

```bash
# Mit npm
npm install @nscale/components

# Mit yarn
yarn add @nscale/components

# Mit pnpm
pnpm add @nscale/components
```

### 9.2 Gesamte Bibliothek registrieren

```js
// main.js oder main.ts
import { createApp } from 'vue';
import App from './App.vue';
import { NscaleComponents } from '@nscale/components';

const app = createApp(App);
app.use(NscaleComponents);
app.mount('#app');
```

### 9.3 Einzelne Komponenten importieren (für Tree Shaking)

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

### 9.4 Auto-Import Plugin für Vite

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

## 10. Storybook-Integration

Die Komponenten-Bibliothek wird über Storybook dokumentiert und visualisiert, wodurch eine interaktive Entwicklung und Dokumentation ermöglicht wird.

### 10.1 Storybook starten

```bash
# Storybook starten
npm run storybook
```

### 10.2 Story-Beispiel

```js
// Button.stories.js
import { Button } from '@nscale/components';

export default {
  title: 'Components/Button',
  component: Button,
  argTypes: {
    variant: {
      control: { type: 'select', options: ['primary', 'secondary', 'tertiary', 'danger', 'ghost'] }
    },
    size: {
      control: { type: 'select', options: ['small', 'medium', 'large'] }
    },
    disabled: {
      control: 'boolean'
    },
    loading: {
      control: 'boolean'
    }
  }
};

const Template = (args) => ({
  components: { Button },
  setup() {
    return { args };
  },
  template: '<Button v-bind="args">{{ args.default }}</Button>'
});

export const Primary = Template.bind({});
Primary.args = {
  variant: 'primary',
  default: 'Primary Button'
};

export const Secondary = Template.bind({});
Secondary.args = {
  variant: 'secondary',
  default: 'Secondary Button'
};

export const Loading = Template.bind({});
Loading.args = {
  loading: true,
  default: 'Loading...'
};

export const Disabled = Template.bind({});
Disabled.args = {
  disabled: true,
  default: 'Disabled Button'
};
```

## 11. Komponenten-Wiki

Ein zentrales Komponenten-Wiki ist unter der folgenden URL verfügbar:

```
https://nscale.ui-components.company-internal/wiki
```

Dieses Wiki bietet:

- **Interaktive Beispiele**: Live-Demos aller Komponenten
- **Suchfunktion**: Schnelles Auffinden von Komponenten und Eigenschaften
- **Versionsverlauf**: Änderungen und Updates pro Version
- **Nutzungsstatistiken**: Welche Komponenten am häufigsten verwendet werden
- **Best Practices**: Richtlinien für die optimale Nutzung

## 12. Beitrag und Entwicklung

### 12.1 Setup der Entwicklungsumgebung

```bash
# Repository klonen
git clone https://github.com/nscale/components.git
cd nscale-components

# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten
npm run dev

# Storybook starten
npm run storybook
```

### 12.2 Neue Komponente hinzufügen

1. Komponente in `src/components/{category}/{ComponentName}.vue` erstellen
2. Komponentendokumentation in JSDoc hinzufügen
3. Storybook-Story in `src/stories/{category}/{ComponentName}.stories.js` erstellen
4. Tests in `tests/components/{category}/{ComponentName}.spec.ts` hinzufügen
5. Komponente zum Export in `src/index.ts` hinzufügen
6. Pull Request erstellen

### 12.3 Tests ausführen

```bash
# Unit-Tests
npm run test:unit

# E2E-Tests
npm run test:e2e

# Barrierefreiheitstests
npm run test:a11y

# Alle Tests
npm run test
```

## 13. Roadmap

Die nscale Komponenten-Bibliothek wird kontinuierlich weiterentwickelt. Geplante Funktionen umfassen:

- **Q3 2025**: Integration weiterer komplexer Datenvisualisierungskomponenten
- **Q4 2025**: Erweiterte Internationalisierungsunterstützung
- **Q1 2026**: AR/VR-Komponentenunterstützung für erweiterte Anwendungsfälle
- **Q2 2026**: KI-gestützte Komponentenanpassung und -generierung

## 14. Fazit

Die nscale Vue 3 Komponenten-Bibliothek bietet ein umfassendes Set an hochwertigen, zugänglichen und leistungsstarken Komponenten, die speziell für das nscale Design-System entwickelt wurden. Die Bibliothek ermöglicht eine schnelle und konsistente Entwicklung von nscale-Anwendungen und gewährleistet eine einheitliche Benutzererfahrung über alle Anwendungen hinweg.

Durch die vollständige TypeScript-Integration, das flexible Theming-System und die umfassende Dokumentation ist die Bibliothek einfach zu verwenden und anzupassen, während gleichzeitig die höchsten Standards für Zugänglichkeit und Leistung eingehalten werden.### 6.4 Kalender, Tags und Baumansicht

```vue
<template>
  <div class="demo-container">
    <div class="demo-section">
      <h3>Tag-Komponenten</h3>
      <div class="tag-examples">
        <Tag>Standard Tag</Tag>
        <Tag variant="primary">Primär</Tag>
        <Tag variant="success" closable @close="handleClose('Success')">Erfolg</Tag>
        <Tag variant="info" rounded>Information</Tag>
        <Tag variant="warning" size="large">Warnung</Tag>
        <Tag variant="error" size="small">Fehler</Tag>
        <Tag color="#8e44ad" textColor="white">Benutzerdefiniert</Tag>
        <Tag clickable @click="handleTagClick">Klickbar</Tag>
        <Tag disabled>Deaktiviert</Tag>
      </div>
      
      <div class="demo-subsection">
        <h4>Dokument-Tags</h4>
        <div class="document-tags">
          <Tag 
            v-for="(doc, index) in documents" 
            :key="index"
            :variant="getDocumentTypeVariant(doc.type)"
            closable
            @close="() => removeDocument(index)"
          >
            {{ doc.name }}
          </Tag>
        </div>
      </div>
    </div>
    
    <div class="demo-section">
      <h3>Kalender</h3>
      <Calendar 
        v-model="selectedDate"
        :events="calendarEvents"
        @select="handleDateSelect"
      />
    </div>
    
    <div class="demo-section">
      <h3>Hierarchische Baumstruktur</h3>
      <Tree
        :items="treeData"
        label-prop="name"
        :selectable="true"
        :checkable="true"
        :defaultExpandAll="true"
        @select="handleNodeSelect"
      >
        <!-- Angepasste Icons -->
        <template #icon="{ item, leaf }">
          <span v-if="leaf" class="tree-file-icon">📄</span>
          <span v-else class="tree-folder-icon">📁</span>
        </template>
        
        <!-- Extra-Informationen -->
        <template #extra="{ item }">
          <Tag 
            v-if="item.type" 
            :variant="getFileTypeVariant(item.type)"
            size="small"
          >
            {{ item.type }}
          </Tag>
        </template>
      </Tree>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { Tag, Calendar, Tree } from '@nscale/components';

// Tag-Beispiele
const documents = ref([
  { name: 'Projektplan.pdf', type: 'pdf' },
  { name: 'Präsentation.pptx', type: 'pptx' },
  { name: 'Datenanalyse.xlsx', type: 'xlsx' },
  { name: 'Konzeptpapier.docx', type: 'docx' },
  { name: 'Technische_Spezifikation.md', type: 'md' }
]);

function getDocumentTypeVariant(type) {
  const variants = {
    'pdf': 'error',
    'pptx': 'warning',
    'xlsx': 'success',
    'docx': 'primary',
    'md': 'info'
  };
  return variants[type] || 'default';
}

function handleClose(tagName) {
  console.log(`Tag geschlossen: ${tagName}`);
}

function handleTagClick() {
  console.log('Klickbarer Tag wurde angeklickt');
}

function removeDocument(index) {
  documents.value.splice(index, 1);
}

// Kalender-Beispiele
const selectedDate = ref(new Date());
const calendarEvents = ref([
  {
    date: new Date(2025, 4, 15),
    content: 'Projektmeeting',
    color: '#4299e1'
  },
  {
    date: new Date(2025, 4, 18),
    content: 'Deployment',
    color: '#48bb78'
  },
  {
    date: new Date(2025, 4, 22),
    content: 'Kundenpräsentation',
    color: '#ed8936'
  },
  {
    date: new Date(2025, 4, 10),
    content: 'Code Review',
    color: '#9f7aea'
  }
]);

function handleDateSelect(date) {
  console.log(`Datum ausgewählt: ${date.toLocaleDateString()}`);
}

// Baum-Beispiele
const treeData = ref([
  {
    name: 'Dokumente',
    children: [
      {
        name: 'Projektmanagement',
        children: [
          { name: 'Projektplan.pdf', type: 'pdf' },
          { name: 'Ressourcenplanung.xlsx', type: 'xlsx' },
          { name: 'Risikoanalyse.docx', type: 'docx' }
        ]
      },
      {
        name: 'Technische Dokumente',
        children: [
          { name: 'Architektur.md', type: 'md' },
          { name: 'API-Dokumentation.md', type: 'md' },
          { name: 'Datenbankschema.png', type: 'png' }
        ]
      }
    ]
  },
  {
    name: 'Bilder',
    children: [
      { name: 'Screenshot_1.png', type: 'png' },
      { name: 'Diagramm.svg', type: 'svg' },
      { name: 'Logo.jpg', type: 'jpg' }
    ]
  }
]);

function getFileTypeVariant(type) {
  const variants = {
    'pdf': 'error',
    'xlsx': 'success',
    'docx': 'primary',
    'md': 'info',
    'png': 'warning',
    'svg': 'warning',
    'jpg': 'warning'
  };
  return variants[type] || 'default';
}

function handleNodeSelect(node, selected) {
  console.log(`Node ${selected ? 'selected' : 'deselected'}: ${node.name}`);
}
</script>

<style scoped>
.demo-container {
  display: flex;
  flex-direction: column;
  gap: var(--nscale-space-6);
}

.demo-section {
  padding: var(--nscale-space-4);
  border: 1px solid var(--nscale-gray-200);
  border-radius: var(--nscale-border-radius-md);
  background-color: var(--nscale-white);
}

.demo-section h3 {
  margin-top: 0;
  margin-bottom: var(--nscale-space-4);
  font-size: var(--nscale-font-size-xl);
  color: var(--nscale-gray-800);
}

.demo-subsection {
  margin-top: var(--nscale-space-4);
}

.demo-subsection h4 {
  margin-top: 0;
  margin-bottom: var(--nscale-space-2);
  font-size: var(--nscale-font-size-lg);
  color: var(--nscale-gray-700);
}

.tag-examples {
  display: flex;
  flex-wrap: wrap;
  gap: var(--nscale-space-2);
  margin-bottom: var(--nscale-space-4);
}

.document-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--nscale-space-2);
  padding: var(--nscale-space-3);
  background-color: var(--nscale-gray-50);
  border-radius: var(--nscale-border-radius-md);
}

.tree-file-icon,
.tree-folder-icon {
  font-size: 1.2em;
}
</style>
```