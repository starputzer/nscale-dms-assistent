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
      >
        <template #logo>
          <div class="example-logo">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 8v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h14a2 2 0 012 2z"></path>
              <polyline points="9 22 9 16 15 16 15 22"></polyline>
              <path d="M3 8l9-6 9 6"></path>
            </svg>
          </div>
        </template>
        
        <template #right>
          <div class="example-header-actions">
            <button class="example-theme-toggle" @click="toggleTheme">
              <svg v-if="currentTheme === 'dark'" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
              <svg v-else viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            </button>
            
            <div class="example-user-menu">
              <div class="example-avatar">{{ currentUser.name.charAt(0) }}</div>
              <span class="example-username">{{ currentUser.name }}</span>
            </div>
          </div>
        </template>
      </Header>
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
    
    <div class="example-content">
      <div class="example-page-header">
        <h1>{{ currentPage.title }}</h1>
      </div>
      
      <div v-if="currentPage.id === 'dashboard'" class="example-dashboard">
        <div class="example-card">
          <h2>Willkommen zum Layout-Beispiel</h2>
          <p>Dieses Beispiel demonstriert die Verwendung der Layout-Komponenten:</p>
          <ul>
            <li>MainLayout - Hauptlayout mit Header, Sidebar, Content und Footer</li>
            <li>Header - Flexibler Header mit Logo, Titel und Aktionen</li>
            <li>Sidebar - Zusammenklappbare Seitenleiste mit Navigation</li>
            <li>TabPanel - Tabs mit horizontaler oder vertikaler Ausrichtung</li>
            <li>SplitPane - Teilbarer Bereich mit anpassbarer Trennlinie</li>
          </ul>
        </div>
      </div>
      
      <div v-else-if="currentPage.id === 'documents'" class="example-documents">
        <TabPanel
          :tabs="documentTabs"
          :active-id="activeDocumentTab"
          closable
          addable
          @update:active-id="activeDocumentTab = $event"
          @close="handleCloseTab"
          @add="handleAddTab"
        >
          <template #first-document>
            <div class="example-card">
              <h2>Erstes Dokument</h2>
              <p>Inhalt des ersten Dokuments...</p>
            </div>
          </template>
          
          <template #second-document>
            <div class="example-card">
              <h2>Zweites Dokument</h2>
              <p>Inhalt des zweiten Dokuments...</p>
            </div>
          </template>
          
          <template #third-document>
            <div class="example-card">
              <h2>Drittes Dokument</h2>
              <p>Inhalt des dritten Dokuments...</p>
            </div>
          </template>
        </TabPanel>
      </div>
      
      <div v-else-if="currentPage.id === 'editor'" class="example-editor">
        <SplitPane
          :initial-split="30"
          :min-first="20"
          :max-first="50"
          storage-key="example-editor-split"
          bordered
        >
          <template #first>
            <div class="example-explorer">
              <h3>Datei-Explorer</h3>
              <ul class="example-file-list">
                <li>📁 Projekt</li>
                <li>├── 📁 src</li>
                <li>│   ├── 📄 main.js</li>
                <li>│   ├── 📄 app.vue</li>
                <li>│   └── 📁 components</li>
                <li>├── 📁 public</li>
                <li>└── 📄 package.json</li>
              </ul>
            </div>
          </template>
          
          <template #second>
            <div class="example-code-editor">
              <div class="example-code">
                <pre><code>/**
 * Beispiel-Code-Editor
 */
import { ref, computed } from 'vue';

export default {
  setup() {
    const count = ref(0);
    
    const doubleCount = computed(() => count.value * 2);
    
    function increment() {
      count.value++;
    }
    
    return {
      count,
      doubleCount,
      increment
    };
  }
};</code></pre>
              </div>
            </div>
          </template>
        </SplitPane>
      </div>
      
      <div v-else>
        <div class="example-card">
          <h2>{{ currentPage.title }}</h2>
          <p>Inhalt für "{{ currentPage.title }}"...</p>
        </div>
      </div>
    </div>
    
    <template #footer>
      <div class="example-footer">
        <p>© 2025 nscale DMS Assistent | <a href="#">Impressum</a> | <a href="#">Datenschutz</a></p>
      </div>
    </template>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { MainLayout, Sidebar, Header, TabPanel, SplitPane } from '@/components/layout';
import type { SidebarItem, Tab } from '@/components/layout';

// Benutzerdaten
const currentUser = {
  name: 'Max Mustermann',
  email: 'max.mustermann@example.com'
};

// Sidebar-Zustand
const sidebarCollapsed = ref(false);

// Theme-Zustand
const currentTheme = ref<'light' | 'dark' | 'system'>('light');

// Aktuell ausgewählte Seite
const currentPageId = ref('dashboard');

// Dokument-Tabs
const documentTabs = ref<Tab[]>([
  { id: 'first-document', label: 'Dokument 1', icon: '📄' },
  { id: 'second-document', label: 'Dokument 2', icon: '📄' },
  { id: 'third-document', label: 'Dokument 3', icon: '📄' }
]);
const activeDocumentTab = ref('first-document');

// Seitennavigation
const pages = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'documents', label: 'Dokumente', icon: '📁' },
  { id: 'editor', label: 'Editor', icon: '📝' },
  { id: 'settings', label: 'Einstellungen', icon: '⚙️', children: [
    { id: 'profile', label: 'Profil', icon: '👤' },
    { id: 'security', label: 'Sicherheit', icon: '🔒' },
    { id: 'notifications', label: 'Benachrichtigungen', icon: '🔔' }
  ] }
];

// Sidebar-Menüpunkte erstellen
const sidebarItems = computed<SidebarItem[]>(() => {
  return pages.map(page => ({
    id: page.id,
    label: page.label,
    icon: page.icon,
    active: currentPageId.value === page.id || (page.children?.some(child => child.id === currentPageId.value) ?? false),
    children: page.children?.map(child => ({
      id: child.id,
      label: child.label,
      icon: child.icon,
      active: currentPageId.value === child.id
    }))
  }));
});

// Aktuelle Seite berechnen
const currentPage = computed(() => {
  const page = pages.find(p => p.id === currentPageId.value);
  if (page) return page;
  
  // Falls es sich um eine Unterseite handelt
  for (const parentPage of pages) {
    if (parentPage.children) {
      const childPage = parentPage.children.find(child => child.id === currentPageId.value);
      if (childPage) return childPage;
    }
  }
  
  return { id: 'not-found', label: 'Seite nicht gefunden', icon: '❓' };
});

// Event-Handler
function handleMenuItemClick(item: SidebarItem) {
  currentPageId.value = item.id;
}

function toggleTheme() {
  currentTheme.value = currentTheme.value === 'light' ? 'dark' : 'light';
}

function handleCloseTab(tabId: string) {
  documentTabs.value = documentTabs.value.filter(tab => tab.id !== tabId);
  if (activeDocumentTab.value === tabId && documentTabs.value.length > 0) {
    activeDocumentTab.value = documentTabs.value[0].id;
  }
}

function handleAddTab() {
  const newTabId = `document-${documentTabs.value.length + 1}`;
  documentTabs.value.push({
    id: newTabId,
    label: `Neues Dokument ${documentTabs.value.length + 1}`,
    icon: '📄'
  });
  activeDocumentTab.value = newTabId;
}
</script>

<style scoped>
/* Beispiel-Styling */
.example-content {
  height: 100%;
  width: 100%;
  overflow: auto;
}

.example-page-header {
  margin-bottom: 20px;
}

.example-page-header h1 {
  font-size: 1.75rem;
  font-weight: 600;
  margin: 0;
}

.example-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: var(--n-primary-color, #3182ce);
}

.example-header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.example-theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--n-text-color, #2d3748);
  transition: background-color 0.2s ease;
}

.example-theme-toggle:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.example-user-menu {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 20px;
  background-color: rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.example-user-menu:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

.example-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: var(--n-primary-color, #3182ce);
  color: white;
  font-weight: 600;
}

.example-username {
  font-weight: 500;
}

.example-card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  padding: 20px;
  margin-bottom: 20px;
}

.example-card h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 0;
  margin-bottom: 16px;
}

.example-card p {
  margin-bottom: 16px;
}

.example-card ul {
  margin-top: 0;
  padding-left: 20px;
}

.example-card li {
  margin-bottom: 8px;
}

.example-card a {
  color: var(--n-primary-color, #3182ce);
  text-decoration: none;
}

.example-dashboard {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.example-documents {
  height: calc(100% - 60px);
}

.example-editor {
  height: calc(100% - 60px);
}

.example-explorer {
  padding: 16px;
  height: 100%;
  overflow: auto;
}

.example-explorer h3 {
  font-size: 1rem;
  font-weight: 600;
  margin-top: 0;
  margin-bottom: 12px;
}

.example-file-list {
  list-style: none;
  padding: 0;
  margin: 0;
  font-family: monospace;
}

.example-file-list li {
  margin-bottom: 4px;
  white-space: nowrap;
}

.example-code-editor {
  height: 100%;
  overflow: auto;
  background-color: #1e1e1e;
  color: #d4d4d4;
}

.example-code {
  padding: 16px;
  font-family: monospace;
  font-size: 14px;
  line-height: 1.5;
}

.example-code pre {
  margin: 0;
}

.example-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 0.875rem;
}

.example-footer a {
  color: var(--n-primary-color, #3182ce);
  text-decoration: none;
  margin: 0 6px;
}

/* Dark Mode */
:deep(.n-main-layout--dark) .example-card {
  background-color: #2d3748;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

:deep(.n-main-layout--dark) .example-theme-toggle:hover,
:deep(.n-main-layout--dark) .example-user-menu {
  background-color: rgba(255, 255, 255, 0.05);
}

:deep(.n-main-layout--dark) .example-user-menu:hover {
  background-color: rgba(255, 255, 255, 0.1);
}
</style>