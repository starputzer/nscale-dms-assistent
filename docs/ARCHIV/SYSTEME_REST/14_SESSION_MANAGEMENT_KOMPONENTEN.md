# Session-Management Komponenten

**Version:** 1.0  
**Letzte Aktualisierung:** 10.05.2025

Dieses Dokument beschreibt die Session-Management-Komponenten des nscale DMS Assistenten, die mit Vue 3 Single File Components (SFC) unter Verwendung der Composition API und TypeScript implementiert wurden. Diese Komponenten bilden die Grundlage für die Verwaltung von Chat-Sessions und ermöglichen es dem Benutzer, zwischen verschiedenen Gesprächen zu navigieren, sie zu organisieren und zu verwalten.

## Inhaltsverzeichnis

1. [Überblick](#überblick)
2. [Hauptkomponenten](#hauptkomponenten)
   - [SessionList](#sessionlist)
   - [SessionItem](#sessionitem)
   - [SessionActions](#sessionactions)
3. [Integration mit dem Pinia-Store](#integration-mit-dem-pinia-store)
4. [Legacy-Integration mit Bridge](#legacy-integration-mit-bridge)
5. [Drag-and-Drop-Funktionalität](#drag-and-drop-funktionalität)
6. [Kontextmenü-Implementation](#kontextmenü-implementation)
7. [Tastaturnavigation](#tastaturnavigation)
8. [Implementierungsdetails](#implementierungsdetails)
9. [Migrationsleitfaden](#migrationsleitfaden)
10. [Bekannte Einschränkungen](#bekannte-einschränkungen)

## Überblick

Das Session-Management besteht aus drei Hauptkomponenten:

1. **SessionList**: Listet alle Chat-Sessions mit umfangreichen Funktionen zur Sortierung, Filterung und Auswahl
2. **SessionItem**: Stellt eine einzelne Session mit Titel, Zeitstempel und Interaktionsmöglichkeiten dar
3. **SessionActions**: Bietet Aktionsschaltflächen für sessionbezogene Operationen wie Erstellen, Löschen und Umbenennen

Diese Komponenten sind eng mit dem Sessions-Store verbunden und bieten eine benutzerfreundliche Oberfläche für das Session-Management. Sie wurden mit besonderem Fokus auf Performance, Benutzerfreundlichkeit und Zugänglichkeit entwickelt.

## Hauptkomponenten

### SessionList

Die `SessionList`-Komponente zeigt alle verfügbaren Chat-Sessions an und erlaubt umfangreiche Interaktionsmöglichkeiten:

- **Dynamische Sortierung** nach Erstellungsdatum, Aktualisierungsdatum oder alphabetisch
- **Volltextsuche** zum schnellen Finden von Sessions
- **Drag-and-Drop** zur Neuanordnung von Sessions
- **Kontextmenü** für erweiterte Aktionen
- **Optimiertes Rendering** für hohe Performance bei vielen Sessions
- **Responsive Design** für alle Bildschirmgrößen

```vue
<SessionList
  :sessions="sessions"
  :activeSessionId="currentSessionId"
  :isLoading="isLoading"
  @select="handleSessionSelect"
  @delete="handleSessionDelete"
  @rename="handleSessionRename"
  @pin="handleSessionPin"
  @create="handleCreateSession"
  @reorder="handleSessionReorder"
/>
```

#### Props

| Name | Typ | Standardwert | Beschreibung |
|------|-----|--------------|--------------|
| `sessions` | `ChatSession[]` | `[]` | Array der anzuzeigenden Sessions |
| `activeSessionId` | `string \| null` | `null` | Die ID der aktiven Session |
| `isLoading` | `boolean` | `false` | Gibt an, ob Sessions geladen werden |
| `emptyMessage` | `string` | "Noch keine..." | Nachricht, wenn keine Sessions vorhanden sind |
| `showCreateButton` | `boolean` | `true` | Ob ein Button zum Erstellen neuer Sessions angezeigt werden soll |
| `createButtonText` | `string` | "Neue Unterhaltung" | Text für den Button zum Erstellen neuer Sessions |
| `enableDragAndDrop` | `boolean` | `true` | Ob Drag-and-Drop aktiviert sein soll |
| `enableSorting` | `boolean` | `true` | Ob der User die Sortierung ändern kann |
| `defaultSort` | `string` | "lastUpdated" | Standardsortierung |
| `enableFiltering` | `boolean` | `true` | Ob Filterfunktionen verfügbar sein sollen |

#### Events

| Name | Payload | Beschreibung |
|------|---------|--------------|
| `select` | `string` | Wird ausgelöst, wenn eine Session ausgewählt wird |
| `delete` | `string` | Wird ausgelöst, wenn eine Session gelöscht wird |
| `rename` | `{ sessionId, newTitle }` | Wird ausgelöst, wenn eine Session umbenannt wird |
| `pin` | `{ sessionId, pinned }` | Wird ausgelöst, wenn eine Session angeheftet/abgeheftet wird |
| `create` | - | Wird ausgelöst, wenn eine neue Session erstellt werden soll |
| `reorder` | `ChatSession[]` | Wird ausgelöst, wenn die Reihenfolge der Sessions geändert wurde |

### SessionItem

Die `SessionItem`-Komponente stellt eine einzelne Session dar und bietet verschiedene Interaktionsmöglichkeiten:

- **Visuelle Hervorhebung** der aktiven und angehefteten Sessions
- **Zeigt Meta-Informationen** wie Erstellungs- oder Aktualisierungsdatum
- **Schnellzugriff auf Aktionen** wie Löschen, Umbenennen und Anheften
- **Tag- und Kategoriesystem** zur besseren Organisation von Sessions
- **Vorschau der letzten Nachricht** für schnelle Inhaltserkennung
- **Multi-Select-Unterstützung** für Massenoperationen
- **Archivierungsfunktion** für nicht mehr aktive Sessions
- **Drag-Handle** für einfaches Verschieben
- **Kontextmenü-Unterstützung** für erweiterte Funktionen

```vue
<SessionItem
  :session="session"
  :isActive="activeSessionId === session.id"
  :isPinned="session.isPinned"
  :isSelected="selectedSessionIds.includes(session.id)"
  :showDragHandle="enableDragAndDrop"
  :showCheckbox="isMultiSelectModeActive"
  :showPreview="showPreview"
  :preview="session.preview"
  :messageCount="session.messageCount"
  :tags="session.tags"
  :category="session.category?.name"
  :categoryColor="session.category?.color"
  :showTagButton="true"
  :showCategoryButton="true"
  :showArchiveButton="true"
  @select="handleSessionSelect"
  @contextmenu="handleContextMenu"
  @pin="handlePinSession"
  @delete="handleDeleteSession"
  @rename="handleRenameSession"
  @tag="handleAddTag"
  @tag-click="handleTagClick"
  @categorize="handleCategorize"
  @archive="handleArchiveSession"
  @toggle-select="handleToggleSelect"
/>
```

#### Props

| Name | Typ | Standardwert | Beschreibung |
|------|-----|--------------|--------------|
| `session` | `ChatSession` | - | Die Session, die angezeigt werden soll |
| `isActive` | `boolean` | `false` | Ob diese Session momentan aktiv ist |
| `isPinned` | `boolean` | `false` | Ob diese Session angeheftet ist |
| `isSelected` | `boolean` | `false` | Ob diese Session ausgewählt ist (multi-select) |
| `showDragHandle` | `boolean` | `true` | Ob ein Drag-Handle angezeigt werden soll |
| `showMetadata` | `boolean` | `true` | Ob Metadaten wie das Datum angezeigt werden sollen |
| `showActions` | `boolean` | `true` | Ob Aktionsschaltflächen angezeigt werden sollen |
| `enableContextMenu` | `boolean` | `true` | Ob ein kontextuelles Menü aktiviert sein soll |
| `showTagButton` | `boolean` | `false` | Ob Tagging-Funktionalität angezeigt werden soll |
| `showCategoryButton` | `boolean` | `false` | Ob Kategorisierungs-Funktionalität angezeigt werden soll |
| `showArchiveButton` | `boolean` | `false` | Ob Archivierungs-Funktionalität angezeigt werden soll |
| `showPreview` | `boolean` | `false` | Ob ein Vorschau der letzten Nachricht angezeigt werden soll |
| `showCheckbox` | `boolean` | `false` | Ob eine Checkbox für Multi-Select angezeigt werden soll |
| `preview` | `string` | `''` | Vorschautext (z.B. letzte Nachricht) |
| `messageCount` | `number` | `0` | Anzahl der Nachrichten in dieser Session |
| `tags` | `Tag[]` | `[]` | Tags für diese Session |
| `category` | `string` | `''` | Kategorie dieser Session |
| `categoryColor` | `string` | `'#e2e8f0'` | Farbe der Kategorie |
| `dateFormat` | `'relative' \| 'short' \| 'long'` | `'relative'` | Das zu verwendende Datumsformat |

#### Events

| Name | Payload | Beschreibung |
|------|---------|--------------|
| `select` | `string` | Wird ausgelöst, wenn die Session ausgewählt wird |
| `pin` | `string, boolean` | Wird ausgelöst, wenn die Session angeheftet/abgeheftet wird |
| `rename` | `string` | Wird ausgelöst, wenn die Session umbenannt werden soll |
| `delete` | `string` | Wird ausgelöst, wenn die Session gelöscht werden soll |
| `contextmenu` | `MouseEvent, ChatSession` | Wird ausgelöst, wenn das Kontextmenü geöffnet werden soll |
| `tag` | `string` | Wird ausgelöst, wenn die Session getaggt werden soll |
| `tag-click` | `string` | Wird ausgelöst, wenn ein Tag angeklickt wurde |
| `categorize` | `string` | Wird ausgelöst, wenn eine Kategorie zugewiesen werden soll |
| `archive` | `string, boolean` | Wird ausgelöst, wenn eine Session archiviert/wiederhergestellt werden soll |
| `toggle-select` | `string` | Wird ausgelöst, wenn der Auswahlstatus umgeschaltet werden soll |

#### Tag-System

Die Komponente unterstützt ein flexibles Tag-System zur Kategorisierung von Sessions:

```typescript
export interface Tag {
  id: string;
  name: string;
  color?: string;
}

// Beispiel-Implementation im Template
<div v-if="tags && tags.length > 0" class="n-session-item__tags">
  <span
    v-for="tag in tags"
    :key="tag.id"
    class="n-session-item__tag"
    :style="{ backgroundColor: tag.color || '#e2e8f0' }"
    @click.stop="$emit('tag-click', tag.id)"
  >
    {{ tag.name }}
  </span>
</div>
```

#### Kategorisierung

Zusätzlich zu Tags können Sessions in übergeordnete Kategorien eingeordnet werden:

```typescript
export interface Category {
  id: string;
  name: string;
  color?: string;
}

// Beispiel-Implementation im Template
<div v-if="category" class="n-session-item__category">
  <span
    class="n-session-item__category-badge"
    :style="{ backgroundColor: categoryColor }"
  >
    {{ category }}
  </span>
</div>
```

#### Vorschau

Die Komponente kann eine Vorschau der letzten Nachricht anzeigen:

```vue
<div v-if="showPreview && preview" class="n-session-item__preview">
  <span class="n-session-item__preview-content">{{ truncatedPreview }}</span>
</div>

<script setup>
// Verkürzter Preview-Text
const truncatedPreview = computed(() => {
  if (!props.preview) return '';
  return props.preview.length > 100
    ? props.preview.substring(0, 100) + '...'
    : props.preview;
});
</script>
```

#### Multi-Select-Modus

Die Komponente unterstützt einen Multi-Select-Modus für Massenoperationen:

```vue
<div
  v-if="showCheckbox"
  class="n-session-item__checkbox"
  @click.stop="$emit('toggle-select', session.id)"
>
  <input
    type="checkbox"
    :checked="isSelected"
    @click.stop
    aria-label="Session auswählen"
  >
</div>

<script setup>
// Click-Handler mit Multi-Select-Unterstützung
function handleItemClick() {
  if (props.showCheckbox) {
    emit('toggle-select', props.session.id);
  } else {
    emit('select', props.session.id);
  }
}
</script>
```

### SessionActions

Die `SessionActions`-Komponente stellt eine Sammlung von Aktionsschaltflächen für sessionbezogene Operationen bereit:

- **Flexible Konfiguration** der verfügbaren Aktionen
- **Gruppierung von Aktionen** in Hauptaktionen und erweiterte Aktionen
- **Unterstützung für Massenaktionen** bei Mehrfachauswahl
- **Verschiedene Anzeigemodi** (inline oder block)
- **Responsive Design** für verschiedene Bildschirmgrößen

```vue
<SessionActions
  :activeSessionId="currentSessionId"
  :enabledFeatures="['pin', 'rename', 'delete', 'export']"
  @create="handleCreateSession"
  @rename="handleRenameSession"
  @delete="handleDeleteSession"
  @pin="handlePinSession"
/>
```

#### Props

| Name | Typ | Standardwert | Beschreibung |
|------|-----|--------------|--------------|
| `activeSessionId` | `string \| null` | `null` | Die aktive Session-ID |
| `selectedSessionIds` | `string[]` | `[]` | Array ausgewählter Session-IDs (für Bulk-Aktionen) |
| `disabled` | `boolean` | `false` | Ob die Aktionen deaktiviert sind |
| `showCreateButton` | `boolean` | `true` | Ob der "Neue Session"-Button angezeigt werden soll |
| `createButtonText` | `string` | "Neue Unterhaltung" | Text für den "Neue Session"-Button |
| `showLabels` | `boolean` | `true` | Ob Labels angezeigt werden sollen |
| `display` | `'inline' \| 'block'` | `'inline'` | Wie die Aktionen angezeigt werden sollen |
| `availableActions` | `string[]` | `[...]` | Welche Aktionen verfügbar sein sollen |
| `enabledFeatures` | `string[]` | `[...]` | Welche Features aktiviert sind |

#### Events

| Name | Payload | Beschreibung |
|------|---------|--------------|
| `create` | - | Wird ausgelöst, wenn eine neue Session erstellt werden soll |
| `rename` | `string` | Wird ausgelöst, wenn eine Session umbenannt werden soll |
| `delete` | `string` | Wird ausgelöst, wenn eine Session gelöscht werden soll |
| `pin` | `string` | Wird ausgelöst, wenn eine Session angeheftet/abgeheftet werden soll |
| `export` | `string` | Wird ausgelöst, wenn eine Session exportiert werden soll |
| `share` | `string` | Wird ausgelöst, wenn eine Session geteilt werden soll |
| `duplicate` | `string` | Wird ausgelöst, wenn eine Session dupliziert werden soll |
| `bulk-delete` | `string[]` | Wird ausgelöst, wenn mehrere Sessions gelöscht werden sollen |
| `bulk-export` | `string[]` | Wird ausgelöst, wenn mehrere Sessions exportiert werden sollen |
| `bulk-share` | `string[]` | Wird ausgelöst, wenn mehrere Sessions geteilt werden sollen |

## Integration mit dem Pinia-Store

Die Session-Management-Komponenten sind eng mit dem Sessions-Store verbunden, der mit Pinia implementiert ist:

```typescript
// Beispiel für die Integration mit dem Sessions-Store
import { useSessionsStore } from '@/stores/sessions';

const sessionsStore = useSessionsStore();

// Reaktive Zustände
const sessions = computed(() => sessionsStore.sortedSessions);
const currentSessionId = computed(() => sessionsStore.currentSessionId);
const isLoading = computed(() => sessionsStore.isLoading);

// Event-Handler
function handleSessionSelect(sessionId: string) {
  sessionsStore.setCurrentSession(sessionId);
}

function handleSessionDelete(sessionId: string) {
  sessionsStore.archiveSession(sessionId);
}

function handleSessionPin(sessionId: string, pinned: boolean) {
  sessionsStore.togglePinSession(sessionId);
}

function handleCreateSession() {
  sessionsStore.createSession();
}
```

Der Store bietet folgende Hauptfunktionalitäten:

- **Verwaltung aller Sessions** (Laden, Erstellen, Aktualisieren, Löschen)
- **Tracking der aktiven Session**
- **Sortierung und Filterung** von Sessions
- **Persistierung** der Sessions im LocalStorage
- **Migration** von Legacy-Daten

## Legacy-Integration mit Bridge

Um eine nahtlose Integration mit dem bestehenden JavaScript-Code zu ermöglichen, wurde eine Bridge implementiert:

```typescript
// Initialisierung der Bridge
import { initSessionBridge } from '@/bridge/sessionBridge';

// Im App-Setup
const sessionBridge = initSessionBridge();

// Beispiel für Legacy-Code, der die Bridge nutzt
window.addEventListener('DOMContentLoaded', () => {
  const nscaleSessionManager = window.nscaleSessionManager;
  
  if (nscaleSessionManager) {
    // Sessions laden
    nscaleSessionManager.loadSessions().then(sessions => {
      console.log('Sessions geladen:', sessions);
    });
    
    // Auf Session-Auswahl reagieren
    nscaleSessionManager.on('selected', event => {
      console.log('Session ausgewählt:', event.sessionId);
    });
  }
});
```

Die Bridge bietet folgende Funktionen:

- **Bidirektionale Kommunikation** zwischen Vue 3 SFCs und Legacy-JavaScript
- **Event-System** für Session-Ereignisse
- **Datenkonvertierung** zwischen Store-Format und Legacy-Format
- **Seamless Fallback** bei deaktivierten Features

## Drag-and-Drop-Funktionalität

Die Drag-and-Drop-Funktionalität wurde mit `vuedraggable` implementiert:

```vue
<draggable
  v-model="draggableSessions"
  class="n-session-list__items"
  handle=".n-session-list__drag-handle"
  item-key="id"
  :disabled="!enableDragAndDrop || isLoading"
  @end="handleDragEnd"
  ghost-class="n-session-list__item--ghost"
  chosen-class="n-session-list__item--chosen"
  drag-class="n-session-list__item--drag"
>
  <template #item="{ element }">
    <SessionItem
      :session="element"
      :is-active="activeSessionId === element.id"
      :is-pinned="element.isPinned"
      :show-drag-handle="enableDragAndDrop"
      @select="handleSessionSelect"
      @contextmenu="handleContextMenu"
      @pin="handlePinSession"
      @delete="handleConfirmDelete"
      @rename="handleRenameSession"
    />
  </template>
</draggable>
```

Diese Implementation bietet:

- **Intuitive Drag-Handles** für eine klare Benutzerführung
- **Visuelle Feedback** während des Drag-Vorgangs
- **Automatische Aktualisierung** der Session-Reihenfolge
- **Deaktivierung während des Ladens** um inkonsistente Zustände zu vermeiden
- **Barrierefreiheit** durch Keyboard-Support

## Kontextmenü-Implementation

Das Kontextmenü bietet erweiterte Funktionen für Sessions:

```vue
<div 
  v-if="showContextMenu"
  class="n-session-list__context-menu"
  :style="{
    top: `${contextMenuPos.y}px`,
    left: `${contextMenuPos.x}px`
  }"
  ref="contextMenu"
  role="menu"
>
  <div class="n-session-list__context-menu-header">
    <span class="n-session-list__context-menu-title">{{ contextSession.title }}</span>
  </div>
  <div class="n-session-list__context-menu-content">
    <button 
      class="n-session-list__context-menu-item"
      @click="handleContextMenuAction('rename')"
      role="menuitem"
    >
      <svg><!-- Icon --></svg>
      <span>Umbenennen</span>
    </button>
    <!-- Weitere Menüpunkte -->
  </div>
</div>
```

Das Kontextmenü bietet:

- **Positionierung am Cursor** für optimale Benutzererfahrung
- **Rolle und ARIA-Attribute** für Barrierefreiheit
- **Tastaturunterstützung** für Navigation und Auswahl
- **Dynamische Menüpunkte** basierend auf Session-Zustand
- **Automatisches Schließen** bei Klick außerhalb oder Escape-Taste

## Tastaturnavigation

Alle Komponenten unterstützen vollständige Tastaturnavigation:

```typescript
// Beispiel für Keyboard-Handler in SessionItem
<div 
  class="n-session-item" 
  tabindex="0"
  @click="$emit('select', session.id)"
  @keydown.enter="$emit('select', session.id)"
  @keydown.space.prevent="$emit('select', session.id)"
>
  <!-- Inhalt -->
</div>

// Beispiel für globale Keyboard-Handler
function handleKeyDown(event: KeyboardEvent) {
  // ESC schließt alle geöffneten Menüs
  if (event.key === 'Escape') {
    showSortOptions.value = false;
    showContextMenu.value = false;
    showDeleteDialog.value = false;
    showRenameDialog.value = false;
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown);
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeyDown);
});
```

Die Tastaturnavigation umfasst:

- **Tab-Navigation** durch alle interaktiven Elemente
- **Enter/Space** zur Auswahl und Aktivierung
- **Escape** zum Schließen von Dialogen und Menüs
- **Pfeiltasten** zur Navigation in Menüs
- **ARIA-Attribute** zur Verbesserung der Screenreader-Unterstützung

## Implementierungsdetails

### Optimierte Performance

Die `SessionList`-Komponente verwendet verschiedene Techniken zur Performanceoptimierung:

```typescript
// Computed Properties für optimierte Aktualisierungen
const filteredSessions = computed(() => {
  if (!searchQuery.value) return props.sessions;
  
  const query = searchQuery.value.toLowerCase().trim();
  return props.sessions.filter(session => 
    session.title.toLowerCase().includes(query)
  );
});

const sortedSessions = computed(() => {
  // Gepinnte Sessions immer oben
  const pinnedSessions = filteredSessions.value.filter(s => s.isPinned);
  const unpinnedSessions = filteredSessions.value.filter(s => !s.isPinned);
  
  // Sortiere beide Gruppen individuell
  const sortFn = sortOptions[currentSort.value].compareFn;
  pinnedSessions.sort(sortFn);
  unpinnedSessions.sort(sortFn);
  
  // Kombiniere beide sortierten Arrays
  return [...pinnedSessions, ...unpinnedSessions];
});
```

Weitere Optimierungen umfassen:

- **Memoization** von berechneten Eigenschaften
- **Effiziente Event-Handler** zur Vermeidung unnötiger Neuberechnungen
- **Lazy Loading** für Dialog-Komponenten
- **Optimierte DOM-Updates** mit Vue's reaktivem System
- **Reduzierung von Watchers** durch intelligente Computed Properties

### Formatierung von Zeitstempeln

Die `SessionItem`-Komponente bietet intelligente Zeitstempel-Formatierung:

```typescript
const formattedDate = computed(() => {
  if (!props.session.updatedAt) return '';
  
  const date = new Date(props.session.updatedAt);
  const now = new Date();
  
  // Relative Zeitformatierung (z.B. "vor 2 Stunden")
  if (props.dateFormat === 'relative') {
    const diff = now.getTime() - date.getTime();
    const diffInSeconds = diff / 1000;
    const diffInMinutes = diffInSeconds / 60;
    const diffInHours = diffInMinutes / 60;
    const diffInDays = diffInHours / 24;
    
    if (diffInSeconds < 60) {
      return 'gerade eben';
    } else if (diffInMinutes < 60) {
      const minutes = Math.floor(diffInMinutes);
      return `vor ${minutes} ${minutes === 1 ? 'Minute' : 'Minuten'}`;
    } 
    // Weitere Fälle...
  }
  // Weitere Formate...
});
```

Diese Implementierung bietet:

- **Relative Zeitangaben** für bessere Benutzererfahrung
- **Intelligente Formatwahl** basierend auf Zeitabstand
- **Lokalisierte Datumsangaben** für verschiedene Regionen
- **Verschiedene Detailstufen** je nach Kontext

## Migrationsleitfaden

Für die Migration von der Legacy-Implementierung zur neuen Vue 3 SFC-Implementierung sollten folgende Schritte befolgt werden:

1. **Feature-Toggle aktivieren**:
   ```typescript
   import { useFeatureTogglesStore } from '@/stores/featureToggles';
   
   const featureTogglesStore = useFeatureTogglesStore();
   featureTogglesStore.enableFeature('useSfcSessionManagement');
   ```

2. **Bridge initialisieren**:
   ```typescript
   import { initSessionBridge } from '@/bridge/sessionBridge';
   
   // Im App-Setup
   const sessionBridge = initSessionBridge();
   ```

3. **Komponenten einbinden**:
   ```vue
   <template>
     <div class="sidebar-container">
       <SessionList
         :sessions="sessions"
         :activeSessionId="currentSessionId"
         :isLoading="isLoading"
         @select="handleSessionSelect"
         @delete="handleSessionDelete"
         @rename="handleSessionRename"
         @pin="handleSessionPin"
         @create="handleCreateSession"
       />
       
       <SessionActions
         :activeSessionId="currentSessionId"
         @create="handleCreateSession"
         @rename="handleRenameSession"
         @delete="handleDeleteSession"
         @pin="handlePinSession"
       />
     </div>
   </template>
   
   <script setup>
   import { SessionList, SessionActions } from '@/components/session';
   import { useSessionsStore } from '@/stores/sessions';
   
   const sessionsStore = useSessionsStore();
   const sessions = computed(() => sessionsStore.sortedSessions);
   const currentSessionId = computed(() => sessionsStore.currentSessionId);
   const isLoading = computed(() => sessionsStore.isLoading);
   
   // Event-Handler
   function handleSessionSelect(sessionId) {
     sessionsStore.setCurrentSession(sessionId);
   }
   
   // Weitere Handler...
   </script>
   ```

## Bekannte Einschränkungen

1. **Drag-and-Drop auf Touch-Geräten**: Die Drag-and-Drop-Funktionalität auf mobilen Geräten mit Touchscreens kann unter bestimmten Umständen problematisch sein und erfordert zusätzliche Optimierungen.

2. **Keyboard-Navigation in Kontextmenüs**: Die Keyboard-Navigation in verschachtelten Kontextmenüs kann in einigen Browsern nicht vollständig unterstützt werden.

3. **Session-Neuordnung und Persistenz**: Die neu geordnete Session-Reihenfolge wird derzeit nicht dauerhaft in der API gespeichert und kann bei einem Neuladen verloren gehen.

4. **Performance bei sehr vielen Sessions**: Bei einer sehr großen Anzahl von Sessions (>100) kann es zu Performanceproblemen kommen, insbesondere auf älteren Geräten.

5. **Kontextmenü-Position auf kleinen Bildschirmen**: Das Kontextmenü kann auf sehr kleinen Bildschirmen oder bei Positionen nahe am Bildschirmrand nicht optimal positioniert werden.

---

**Verwandte Dokumente:**
- [13_CHAT_KOMPONENTEN.md](./13_CHAT_KOMPONENTEN.md)
- [12_CSS_DESIGN_SYSTEM.md](./12_CSS_DESIGN_SYSTEM.md)
- [01_STATE_MANAGEMENT.md](../05_REFERENZEN/01_STATE_MANAGEMENT.md)
- [03_KOMPONENTEN_STRUKTUR.md](../01_ARCHITEKTUR/03_KOMPONENTEN_STRUKTUR.md)
- [03_MIGRATIONS_ERKENNTNISSE.md](../03_MIGRATION/03_MIGRATIONS_ERKENNTNISSE.md)