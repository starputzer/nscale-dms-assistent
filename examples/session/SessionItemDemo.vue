<template>
  <div class="session-item-demo">
    <h1>SessionItem Demo</h1>
    
    <div class="demo-controls">
      <div class="control-group">
        <h3>Display Options</h3>
        <label>
          <input type="checkbox" v-model="showPreview">
          Show Preview
        </label>
        <label>
          <input type="checkbox" v-model="showMetadata">
          Show Metadata
        </label>
        <label>
          <input type="checkbox" v-model="showDragHandle">
          Show Drag Handle
        </label>
        <label>
          <input type="checkbox" v-model="enableMultiSelect">
          Enable Multi-Select
        </label>
      </div>
      
      <div class="control-group">
        <h3>Feature Options</h3>
        <label>
          <input type="checkbox" v-model="showTagButton">
          Show Tag Button
        </label>
        <label>
          <input type="checkbox" v-model="showCategoryButton">
          Show Category Button
        </label>
        <label>
          <input type="checkbox" v-model="showArchiveButton">
          Show Archive Button
        </label>
      </div>
    </div>
    
    <div class="sessions-container">
      <div v-for="session in sampleSessions" :key="session.id" class="session-wrapper">
        <SessionItem
          :session="session"
          :isActive="activeSessionId === session.id"
          :isPinned="session.isPinned"
          :isSelected="selectedSessionIds.includes(session.id)"
          :showDragHandle="showDragHandle"
          :showMetadata="showMetadata"
          :showCheckbox="enableMultiSelect"
          :showPreview="showPreview"
          :showTagButton="showTagButton"
          :showCategoryButton="showCategoryButton"
          :showArchiveButton="showArchiveButton"
          :preview="session.preview"
          :messageCount="session.messageCount"
          :tags="session.tags"
          :category="session.category?.name"
          :categoryColor="session.category?.color"
          @select="handleSelect"
          @pin="handlePin"
          @rename="handleRename"
          @delete="handleDelete"
          @tag="handleTag"
          @tag-click="handleTagClick"
          @categorize="handleCategorize"
          @archive="handleArchive"
          @toggle-select="handleToggleSelect"
        />
      </div>
    </div>
    
    <div v-if="selectedSessionIds.length > 0" class="bulk-actions">
      <h3>Bulk Actions ({{ selectedSessionIds.length }} selected)</h3>
      <div class="button-group">
        <button @click="bulkArchive">Archive Selected</button>
        <button @click="bulkDelete">Delete Selected</button>
        <button @click="bulkAddTag">Add Tag to Selected</button>
        <button @click="clearSelection">Clear Selection</button>
      </div>
    </div>
    
    <div class="actions-log">
      <h3>Actions Log</h3>
      <div class="log-entries">
        <div v-for="(log, index) in actionLogs" :key="index" class="log-entry">
          {{ log }}
        </div>
      </div>
      <button @click="clearLog" class="clear-log-btn">Clear Log</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import SessionItem from '../../src/components/session/SessionItem.vue';
import type { ChatSession, SessionTag, SessionCategory } from '../../src/types/session';

// Demo state
const showPreview = ref(true);
const showMetadata = ref(true);
const showDragHandle = ref(true);
const enableMultiSelect = ref(false);
const showTagButton = ref(true);
const showCategoryButton = ref(true);
const showArchiveButton = ref(true);

const activeSessionId = ref<string | null>(null);
const selectedSessionIds = ref<string[]>([]);
const actionLogs = ref<string[]>([]);

// Sample data
const availableTags: SessionTag[] = [
  { id: 'important', name: 'Wichtig', color: '#F56565' },
  { id: 'work', name: 'Arbeit', color: '#3182CE' },
  { id: 'personal', name: 'Persönlich', color: '#48BB78' },
  { id: 'research', name: 'Recherche', color: '#9F7AEA' },
  { id: 'followup', name: 'Nachverfolgen', color: '#ED8936' },
  { id: 'draft', name: 'Entwurf', color: '#A0AEC0' }
];

const availableCategories: SessionCategory[] = [
  { id: 'general', name: 'Allgemein', color: '#718096' },
  { id: 'support', name: 'Support', color: '#3182CE' },
  { id: 'documentation', name: 'Dokumentation', color: '#48BB78' },
  { id: 'training', name: 'Training', color: '#9F7AEA' },
  { id: 'project', name: 'Projekt', color: '#ED8936' },
  { id: 'archive', name: 'Archiv', color: '#A0AEC0' }
];

const sampleSessions = ref<ChatSession[]>([
  {
    id: '1',
    title: 'Wichtige Besprechung',
    createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    userId: 'user1',
    isPinned: true,
    tags: [availableTags[0], availableTags[1]],
    category: availableCategories[4],
    preview: 'Das ist ein Beispiel für eine gepinnte Session mit mehreren Tags und einer Kategorie.',
    messageCount: 12
  },
  {
    id: '2',
    title: 'Support Anfrage',
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    userId: 'user1',
    tags: [availableTags[2]],
    category: availableCategories[1],
    preview: 'Bitte um Unterstützung bei der Installation der Software.',
    messageCount: 5
  },
  {
    id: '3',
    title: 'Dokumentation überprüfen',
    createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    userId: 'user1',
    tags: [availableTags[3], availableTags[5]],
    category: availableCategories[2],
    preview: 'Die Dokumentation muss noch überprüft werden, bevor sie veröffentlicht werden kann.',
    messageCount: 8
  },
  {
    id: '4',
    title: 'Archivierte Session',
    createdAt: new Date(Date.now() - 3600000 * 240).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 120).toISOString(),
    userId: 'user1',
    isArchived: true,
    category: availableCategories[5],
    preview: 'Dies ist eine archivierte Session, die nicht mehr aktiv verwendet wird.',
    messageCount: 3
  }
]);

// Event handlers
function handleSelect(sessionId: string): void {
  activeSessionId.value = sessionId;
  logAction(`Session ausgewählt: ${getSessionTitle(sessionId)}`);
}

function handlePin(sessionId: string, pinned: boolean): void {
  const session = sampleSessions.value.find(s => s.id === sessionId);
  if (session) {
    session.isPinned = pinned;
    logAction(`Session ${pinned ? 'angeheftet' : 'abgeheftet'}: ${getSessionTitle(sessionId)}`);
  }
}

function handleRename(sessionId: string): void {
  const session = sampleSessions.value.find(s => s.id === sessionId);
  if (session) {
    const newTitle = prompt('Neuer Sessiontitel:', session.title);
    if (newTitle) {
      session.title = newTitle;
      logAction(`Session umbenannt zu: ${newTitle}`);
    }
  }
}

function handleDelete(sessionId: string): void {
  if (confirm(`Soll die Session "${getSessionTitle(sessionId)}" wirklich gelöscht werden?`)) {
    sampleSessions.value = sampleSessions.value.filter(s => s.id !== sessionId);
    logAction(`Session gelöscht: ${getSessionTitle(sessionId)}`);
  }
}

function handleTag(sessionId: string): void {
  const session = sampleSessions.value.find(s => s.id === sessionId);
  if (!session) return;
  
  const tagsToAdd = availableTags.filter(tag => 
    !session.tags?.some(t => t.id === tag.id)
  );
  
  if (tagsToAdd.length === 0) {
    alert('Alle verfügbaren Tags sind bereits zugewiesen.');
    return;
  }
  
  const tagOptions = tagsToAdd.map(tag => `${tag.id} - ${tag.name}`).join('\n');
  const selectedTagId = prompt(`Wählen Sie einen Tag aus: (ID eingeben)\n${tagOptions}`);
  
  if (selectedTagId) {
    const tagToAdd = availableTags.find(t => t.id === selectedTagId);
    if (tagToAdd) {
      if (!session.tags) session.tags = [];
      session.tags.push(tagToAdd);
      logAction(`Tag "${tagToAdd.name}" zur Session "${session.title}" hinzugefügt`);
    }
  }
}

function handleTagClick(tagId: string): void {
  const tag = availableTags.find(t => t.id === tagId);
  if (tag) {
    logAction(`Tag angeklickt: ${tag.name}`);
    alert(`Sie haben den Tag "${tag.name}" angeklickt. Hier könnten alle Sessions mit diesem Tag angezeigt werden.`);
  }
}

function handleCategorize(sessionId: string): void {
  const session = sampleSessions.value.find(s => s.id === sessionId);
  if (!session) return;
  
  const categoryOptions = availableCategories.map(cat => `${cat.id} - ${cat.name}`).join('\n');
  const selectedCategoryId = prompt(`Wählen Sie eine Kategorie aus: (ID eingeben)\n${categoryOptions}`);
  
  if (selectedCategoryId) {
    const categoryToSet = availableCategories.find(c => c.id === selectedCategoryId);
    if (categoryToSet) {
      session.category = categoryToSet;
      logAction(`Kategorie "${categoryToSet.name}" zur Session "${session.title}" zugewiesen`);
    }
  }
}

function handleArchive(sessionId: string, archive: boolean): void {
  const session = sampleSessions.value.find(s => s.id === sessionId);
  if (session) {
    session.isArchived = archive;
    logAction(`Session ${archive ? 'archiviert' : 'aus Archiv wiederhergestellt'}: ${getSessionTitle(sessionId)}`);
  }
}

function handleToggleSelect(sessionId: string): void {
  if (selectedSessionIds.value.includes(sessionId)) {
    selectedSessionIds.value = selectedSessionIds.value.filter(id => id !== sessionId);
    logAction(`Session aus Auswahl entfernt: ${getSessionTitle(sessionId)}`);
  } else {
    selectedSessionIds.value.push(sessionId);
    logAction(`Session zur Auswahl hinzugefügt: ${getSessionTitle(sessionId)}`);
  }
}

// Bulk actions
function bulkArchive(): void {
  if (selectedSessionIds.value.length === 0) return;
  
  if (confirm(`${selectedSessionIds.value.length} ausgewählte Sessions archivieren?`)) {
    for (const sessionId of selectedSessionIds.value) {
      const session = sampleSessions.value.find(s => s.id === sessionId);
      if (session) {
        session.isArchived = true;
      }
    }
    logAction(`${selectedSessionIds.value.length} Sessions archiviert`);
    clearSelection();
  }
}

function bulkDelete(): void {
  if (selectedSessionIds.value.length === 0) return;
  
  if (confirm(`${selectedSessionIds.value.length} ausgewählte Sessions löschen?`)) {
    sampleSessions.value = sampleSessions.value.filter(
      session => !selectedSessionIds.value.includes(session.id)
    );
    logAction(`${selectedSessionIds.value.length} Sessions gelöscht`);
    clearSelection();
  }
}

function bulkAddTag(): void {
  if (selectedSessionIds.value.length === 0) return;
  
  const tagOptions = availableTags.map(tag => `${tag.id} - ${tag.name}`).join('\n');
  const selectedTagId = prompt(`Wählen Sie einen Tag für alle ${selectedSessionIds.value.length} ausgewählten Sessions aus: (ID eingeben)\n${tagOptions}`);
  
  if (selectedTagId) {
    const tagToAdd = availableTags.find(t => t.id === selectedTagId);
    if (tagToAdd) {
      for (const sessionId of selectedSessionIds.value) {
        const session = sampleSessions.value.find(s => s.id === sessionId);
        if (session) {
          if (!session.tags) session.tags = [];
          if (!session.tags.some(t => t.id === tagToAdd.id)) {
            session.tags.push(tagToAdd);
          }
        }
      }
      logAction(`Tag "${tagToAdd.name}" zu ${selectedSessionIds.value.length} Sessions hinzugefügt`);
    }
  }
}

function clearSelection(): void {
  selectedSessionIds.value = [];
  logAction('Auswahl zurückgesetzt');
}

// Helper functions
function getSessionTitle(sessionId: string): string {
  const session = sampleSessions.value.find(s => s.id === sessionId);
  return session ? session.title : 'Unbekannte Session';
}

function logAction(message: string): void {
  const timestamp = new Date().toLocaleTimeString();
  actionLogs.value.unshift(`[${timestamp}] ${message}`);
  
  // Limit log size
  if (actionLogs.value.length > 20) {
    actionLogs.value = actionLogs.value.slice(0, 20);
  }
}

function clearLog(): void {
  actionLogs.value = [];
}
</script>

<style scoped>
.session-item-demo {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  font-family: var(--n-font-family, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
}

h1 {
  font-size: 1.8rem;
  margin-bottom: 2rem;
  color: var(--n-text-color, #2d3748);
}

h3 {
  font-size: 1.1rem;
  margin-bottom: 0.75rem;
  color: var(--n-text-color, #2d3748);
}

.demo-controls {
  display: flex;
  gap: 2rem;
  margin-bottom: 2rem;
  padding: 1rem;
  border: 1px solid var(--n-border-color, #e2e8f0);
  border-radius: var(--n-border-radius-md, 0.5rem);
  background-color: var(--n-surface-color-secondary, #f7fafc);
}

.control-group {
  flex: 1;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  cursor: pointer;
}

.sessions-container {
  margin-bottom: 2rem;
}

.session-wrapper {
  margin-bottom: 0.5rem;
}

.bulk-actions {
  margin-bottom: 2rem;
  padding: 1rem;
  border: 1px solid var(--n-border-color, #e2e8f0);
  border-radius: var(--n-border-radius-md, 0.5rem);
  background-color: var(--n-surface-color-secondary, #f7fafc);
}

.button-group {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

button {
  padding: 0.5rem 1rem;
  background-color: var(--n-primary-color, #3182ce);
  color: white;
  border: none;
  border-radius: var(--n-border-radius-sm, 0.25rem);
  cursor: pointer;
  font-size: 0.875rem;
  transition: background-color 0.2s ease;
}

button:hover {
  background-color: var(--n-primary-color-dark, #2c5282);
}

.actions-log {
  margin-top: 2rem;
  padding: 1rem;
  border: 1px solid var(--n-border-color, #e2e8f0);
  border-radius: var(--n-border-radius-md, 0.5rem);
  background-color: var(--n-surface-color, #ffffff);
}

.log-entries {
  height: 200px;
  overflow-y: auto;
  padding: 0.5rem;
  border: 1px solid var(--n-border-color, #e2e8f0);
  border-radius: var(--n-border-radius-sm, 0.25rem);
  background-color: var(--n-surface-color-secondary, #f7fafc);
  margin-bottom: 1rem;
}

.log-entry {
  padding: 0.5rem;
  border-bottom: 1px dashed var(--n-border-color, #e2e8f0);
  font-size: 0.875rem;
}

.log-entry:last-child {
  border-bottom: none;
}

.clear-log-btn {
  background-color: var(--n-text-color-tertiary, #a0aec0);
}

.clear-log-btn:hover {
  background-color: var(--n-text-color-secondary, #718096);
}

/* Dark Mode Support */
:root[data-theme='dark'] .demo-controls,
:root[data-theme='dark'] .bulk-actions,
:root[data-theme='dark'] .log-entries {
  background-color: var(--n-surface-color-secondary-dark, #2d3748);
  border-color: var(--n-border-color-dark, #4a5568);
}

:root[data-theme='dark'] .actions-log {
  background-color: var(--n-surface-color-dark, #1a202c);
  border-color: var(--n-border-color-dark, #4a5568);
}

:root[data-theme='dark'] .log-entry {
  border-color: var(--n-border-color-dark, #4a5568);
}

@media (max-width: 768px) {
  .demo-controls {
    flex-direction: column;
    gap: 1rem;
  }
}
</style>