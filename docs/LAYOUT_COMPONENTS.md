# Layout-Komponenten

*Zuletzt aktualisiert: 08.05.2025*

Dieses Dokument beschreibt die Vue 3 SFC Layout-Komponenten, die für den nscale DMS Assistenten entwickelt wurden. Diese Komponenten bieten eine flexible, wiederverwendbare und barrierefreie Grundlage für die Gestaltung verschiedener Ansichten der Anwendung.

## Inhaltsverzeichnis

1. [Übersicht](#übersicht)
2. [MainLayout](#mainlayout)
3. [Header](#header)
4. [Sidebar](#sidebar)
5. [TabPanel](#tabpanel)
6. [SplitPane](#splitpane)
7. [Verwendungsbeispiel](#verwendungsbeispiel)
8. [Barrierefreiheit und Responsive Design](#barrierefreiheit-und-responsive-design)
9. [Theming](#theming)

## Übersicht

Die Layout-Komponenten wurden mit folgenden Schwerpunkten entwickelt:

- Vollständige Implementierung mit Vue 3 Composition API und TypeScript
- Barrierefreiheit durch ARIA-Attribute und Keyboard-Navigation
- Responsive Design für verschiedene Geräte
- Flexible Anpassungsmöglichkeiten durch umfangreiche Props und Slots
- Theming-Unterstützung mit CSS-Variablen
- Konsistentes Design und Verhalten

Alle Komponenten befinden sich im Verzeichnis `/src/components/layout/` und werden über eine zentrale Indexdatei exportiert.

## MainLayout

`MainLayout.vue` ist die Hauptkomponente, die die grundlegende Struktur der Anwendung definiert mit Header, Sidebar, Content und Footer-Bereichen.

### Props

| Name | Typ | Standard | Beschreibung |
|------|-----|---------|--------------|
| title | string | 'nscale DMS Assistent' | Titel der Anwendung |
| showHeader | boolean | true | Ob der Header angezeigt werden soll |
| showSidebar | boolean | true | Ob die Sidebar angezeigt werden soll |
| showFooter | boolean | true | Ob der Footer angezeigt werden soll |
| sidebarItems | SidebarItem[] | [] | Navigationselemente für die Sidebar |
| sidebarCollapsed | boolean | false | Ob die Sidebar eingeklappt sein soll |
| theme | 'light' \| 'dark' \| 'system' | 'system' | Theme der Anwendung |
| stickyHeader | boolean | false | Ob der Header fixiert bleiben soll |

### Events

| Name | Payload | Beschreibung |
|------|---------|--------------|
| update:sidebarCollapsed | boolean | Wird ausgelöst, wenn sich der Zustand der Sidebar ändert |
| sidebar-toggle | boolean | Wird ausgelöst, wenn die Sidebar umgeschaltet wird |

### Slots

| Name | Beschreibung |
|------|--------------|
| default | Hauptinhalt der Anwendung |
| header | Benutzerdefinierter Header-Inhalt (ersetzt Standard-Header) |
| sidebar | Benutzerdefinierter Sidebar-Inhalt (ersetzt Standard-Sidebar) |
| footer | Benutzerdefinierter Footer-Inhalt |

## Header

`Header.vue` ist eine flexible Komponente für den oberen Bereich der Anwendung mit Logo, Titel und Aktionselementen.

### Props

| Name | Typ | Standard | Beschreibung |
|------|-----|---------|--------------|
| title | string | 'nscale DMS Assistent' | Titel des Headers |
| logo | string | undefined | URL des Logos |
| logoAlt | string | undefined | Alt-Text für das Logo |
| fixed | boolean | false | Ob der Header fixiert sein soll |
| bordered | boolean | true | Ob der Header einen Rahmen haben soll |
| elevated | boolean | false | Ob der Header erhöht sein soll |
| size | 'small' \| 'medium' \| 'large' | 'medium' | Größe des Headers |
| height | number | undefined | Benutzerdefinierte Höhe in Pixeln |
| showTitle | boolean | true | Ob der Titel angezeigt werden soll |
| showToggleButton | boolean | true | Ob der Toggle-Button angezeigt werden soll |
| user | { name?, avatar?, email? } | undefined | Benutzerinformationen |

### Events

| Name | Payload | Beschreibung |
|------|---------|--------------|
| toggle-sidebar | - | Wird ausgelöst, wenn auf den Toggle-Button geklickt wird |
| toggle-user-menu | - | Wird ausgelöst, wenn auf das Benutzermenü geklickt wird |

### Slots

| Name | Beschreibung |
|------|--------------|
| logo | Benutzerdefiniertes Logo |
| title | Benutzerdefinierter Titel |
| center | Inhalt für den mittleren Bereich |
| right | Inhalt für den rechten Bereich |
| notifications | Benachrichtigungen im rechten Bereich |
| user | Benutzerdefiniertes Benutzermenü |

## Sidebar

`Sidebar.vue` ist eine zusammenklappbare Seitenleiste mit Navigation und Unterstützung für verschachtelte Menüs.

### Props

| Name | Typ | Standard | Beschreibung |
|------|-----|---------|--------------|
| title | string | 'Navigation' | Titel der Sidebar |
| collapsed | boolean | false | Ob die Sidebar eingeklappt ist |
| items | SidebarItem[] | [] | Navigationselemente der Sidebar |
| mini | boolean | true | Ob Mini-Modus aktiviert werden soll |
| defaultExpanded | string[] | [] | IDs der standardmäßig ausgefahrenen Elemente |
| collapseOnItemClick | boolean | false | Ob nach Klick die Sidebar eingeklappt werden soll |

### Events

| Name | Payload | Beschreibung |
|------|---------|--------------|
| collapse | boolean | Wird ausgelöst, wenn sich der Zustand der Sidebar ändert |
| item-click | SidebarItem | Wird ausgelöst, wenn auf ein Element geklickt wird |
| item-expand | string, boolean | Wird ausgelöst, wenn ein Element ein-/ausgeklappt wird |

### Slots

| Name | Beschreibung |
|------|--------------|
| header | Benutzerdefinierter Header-Bereich |
| default | Benutzerdefinierter Inhalt (ersetzt Standard-Navigation) |
| footer | Benutzerdefinierter Footer-Bereich |

## TabPanel

`TabPanel.vue` ist eine Tab-Komponente mit horizontaler oder vertikaler Ausrichtung, Keyboard-Navigation, Drag & Drop und dynamischer Tab-Verwaltung.

### Props

| Name | Typ | Standard | Beschreibung |
|------|-----|---------|--------------|
| tabs | Tab[] | [] | Die Tabs des TabPanels |
| activeId | string | '' | Die ID des aktiven Tabs |
| orientation | 'horizontal' \| 'vertical' | 'horizontal' | Die Ausrichtung der Tabs |
| closable | boolean | false | Ob Tabs geschlossen werden können |
| addable | boolean | false | Ob ein "Tab hinzufügen"-Button angezeigt werden soll |
| draggable | boolean | false | Ob Tabs per Drag & Drop verschoben werden können |
| lazy | boolean | false | Ob Inhalte nur bei Aktivierung geladen werden sollen |
| bordered | boolean | true | Ob die Tabs einen Rahmen haben sollen |
| elevated | boolean | false | Ob die Tabs erhöht sein sollen |
| size | 'small' \| 'medium' \| 'large' | 'medium' | Größe der Tabs |
| scrollable | boolean | true | Ob die Tabs scrollbar sein sollen |

### Events

| Name | Payload | Beschreibung |
|------|---------|--------------|
| update:active-id | string | Wird ausgelöst, wenn ein Tab ausgewählt wird |
| close | string | Wird ausgelöst, wenn ein Tab geschlossen wird |
| reorder | string[] | Wird ausgelöst, wenn die Reihenfolge der Tabs geändert wird |
| add | - | Wird ausgelöst, wenn ein Tab hinzugefügt werden soll |

### Slots

| Name | Beschreibung |
|------|--------------|
| default | Standardinhalt für alle Tabs |
| tab | Benutzerdefiniertes Tab-Layout (Slot-Props: `{ tab, index }`) |
| before | Inhalt vor den Tabs |
| after | Inhalt nach den Tabs |
| [tabId] | Inhalt für den Tab mit der ID `tabId` |

## SplitPane

`SplitPane.vue` ist ein teilbarer Bereich mit anpassbarer Trennlinie, der für Split-Views verwendet werden kann.

### Props

| Name | Typ | Standard | Beschreibung |
|------|-----|---------|--------------|
| orientation | 'horizontal' \| 'vertical' | 'horizontal' | Die Ausrichtung der Teilung |
| initialSplit | number | 50 | Der initiale Split-Wert in Prozent (0-100) |
| minFirst | number | 10 | Minimale Größe der ersten Seite in Prozent |
| maxFirst | number | 90 | Maximale Größe der ersten Seite in Prozent |
| minSecond | number | 10 | Minimale Größe der zweiten Seite in Prozent |
| maxSecond | number | 90 | Maximale Größe der zweiten Seite in Prozent |
| resizable | boolean | true | Ob die Größe angepasst werden kann |
| separatorWidth | number | 4 | Die Breite des Separators in Pixeln |
| storageKey | string | '' | Der Speicherort für die Benutzerpräferenz |
| bordered | boolean | false | Ob der SplitPane einen Rahmen haben soll |

### Events

| Name | Payload | Beschreibung |
|------|---------|--------------|
| update:split | number | Wird ausgelöst, wenn sich der Split-Wert ändert |
| drag-start | - | Wird ausgelöst, wenn das Ziehen beginnt |
| drag-end | number | Wird ausgelöst, wenn das Ziehen endet |

### Slots

| Name | Beschreibung |
|------|--------------|
| first | Inhalt des ersten Bereichs |
| second | Inhalt des zweiten Bereichs |
| separator | Benutzerdefinierter Separator |

## Verwendungsbeispiel

Ein komplettes Beispiel für die Verwendung der Layout-Komponenten finden Sie in der Datei `/examples/layout/LayoutExample.vue`. Hier ist ein vereinfachtes Beispiel:

```vue
<template>
  <MainLayout
    title="nscale DMS Assistent"
    :sidebar-items="sidebarItems"
    :sidebar-collapsed="sidebarCollapsed"
    :theme="currentTheme"
    @update:sidebar-collapsed="sidebarCollapsed = $event"
  >
    <template #header>
      <Header
        :title="currentPage.title"
        :show-toggle-button="true"
        :user="currentUser"
        @toggle-sidebar="sidebarCollapsed = !sidebarCollapsed"
      />
    </template>
    
    <template #sidebar>
      <Sidebar
        :collapsed="sidebarCollapsed"
        :items="sidebarItems"
        :title="'Navigation'"
        @collapse="sidebarCollapsed = $event"
        @item-click="handleMenuItemClick"
      />
    </template>
    
    <div v-if="currentPage.id === 'documents'">
      <TabPanel
        :tabs="documentTabs"
        :active-id="activeDocumentTab"
        closable
        addable
        @update:active-id="activeDocumentTab = $event"
        @close="handleCloseTab"
        @add="handleAddTab"
      >
        <!-- Tab-Inhalte -->
      </TabPanel>
    </div>
    
    <div v-else-if="currentPage.id === 'editor'">
      <SplitPane
        :initial-split="30"
        :min-first="20"
        :max-first="50"
      >
        <template #first>
          <!-- Erster Bereich -->
        </template>
        
        <template #second>
          <!-- Zweiter Bereich -->
        </template>
      </SplitPane>
    </div>
  </MainLayout>
</template>
```

## Barrierefreiheit und Responsive Design

Alle Layout-Komponenten wurden mit Barrierefreiheit und Responsive Design im Blick entwickelt:

### Barrierefreiheit
- ARIA-Attribute für bessere Screenreader-Unterstützung
- Vollständige Keyboard-Navigation
- Fokus-Management für modale Elemente
- Korrekte Semantik und Rolle der Elemente

### Responsive Design
- Automatische Anpassung an verschiedene Viewport-Größen
- Mobile-First-Ansatz mit speziellen Anpassungen für kleine Bildschirme
- Touch-Unterstützung für mobile Geräte
- CSS Media Queries für verschiedene Breakpoints

## Theming

Die Layout-Komponenten unterstützen Theming über CSS-Variablen. Das Theme kann über die `theme`-Prop des MainLayouts gesteuert werden ('light', 'dark', 'system').

### Verfügbare CSS-Variablen
- `--n-background-color`: Hintergrundfarbe
- `--n-text-color`: Textfarbe
- `--n-border-color`: Rahmenfarbe
- `--n-text-secondary-color`: Sekundäre Textfarbe
- `--n-primary-color`: Primärfarbe der Anwendung
- `--n-focus-color`: Fokusfarbe für Accessibility
- `--n-header-height`: Höhe des Headers
- `--n-sidebar-width`: Breite der Sidebar
- `--n-sidebar-collapsed-width`: Breite der eingeklappten Sidebar
- `--n-footer-height`: Höhe des Footers
- `--n-content-padding`: Innenabstand des Inhaltsbereichs

Sie können diese Variablen überschreiben, indem Sie sie in Ihrem globalen CSS oder im Komponentenstil definieren.