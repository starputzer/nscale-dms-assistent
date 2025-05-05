<template>
  <div id="app" class="h-screen flex flex-col">
    <!-- Login & Register -->
    <div v-if="!userStore.token" class="flex items-center justify-center h-full bg-gray-50">
      <login-form 
        @login-success="onLoginSuccess" 
        :motd="motd" 
        :motd-dismissed="motdDismissed"
        @dismiss-motd="dismissMotd"
      />
    </div>
    
    <!-- Main Application (Chat + Admin) -->
    <div v-else class="flex flex-col h-screen">
      <app-header 
        :user-role="userStore.userRole" 
        :active-view="activeView" 
        @update:active-view="activeView = $event"
        @new-session="startNewSession"
        @logout="logout"
      />
      
      <!-- Main Content with Admin Sidebar -->
      <div class="flex flex-1 overflow-hidden container mx-auto my-4">
        <!-- Admin Sidebar - Only visible when in admin mode -->
        <admin-sidebar 
          v-if="activeView === 'admin' && userStore.userRole === 'admin'"
          :admin-tab="adminTab"
          :user-role="userStore.userRole"
          @update:admin-tab="adminTab = $event"
          @load-system-stats="loadSystemStats"
          @load-feedback-stats="loadFeedbackStats"
        />
        
        <!-- Sessions Sidebar - Only visible in chat mode -->
        <sidebar-nav 
          v-if="activeView === 'chat'"
          :sessions="sessions"
          :current-session-id="currentSessionId"
          @load-session="loadSession"
          @delete-session="deleteSession"
        />
        
        <!-- Main Content Area -->
        <main class="flex-1 flex flex-col bg-white overflow-hidden rounded-lg shadow-sm ml-4 relative">
          <!-- Chat View -->
          <chat-view 
            v-if="activeView === 'chat'"
            :current-session-id="currentSessionId"
            :messages="messages"
            :is-loading="isLoading"
            :motd="motd"
            :motd-dismissed="motdDismissed"
            @new-session="startNewSession"
            @submit-feedback="submitFeedback"
            @show-feedback-dialog="openFeedbackDialog"
            @load-explanation="loadExplanation"
            @show-sources-dialog="openSourcesDialog"
            @dismiss-motd="dismissMotd"
            @send-message="sendQuestion"
          />
          
          <!-- Admin View -->
          <admin-panel 
            v-if="activeView === 'admin'"
            :admin-tab="adminTab"
            :system-stats="systemStats"
            :feedback-stats="feedbackStats"
            :negative-feedback="negativeFeedback"
            :admin-users="adminUsers"
            :new-user="newUser"
            :motd-config="motdConfig"
            :selected-color-theme="selectedColorTheme"
            @create-user="createUser"
            @update-user-role="updateUserRole"
            @delete-user="deleteUser"
            @clear-model-cache="clearModelCache"
            @clear-embedding-cache="clearEmbeddingCache"
            @reload-motd="reloadMotd"
            @reset-motd-config="resetMotdConfig"
            @save-motd-config="saveMotdConfig"
            @apply-color-theme="applyColorTheme"
          />
          
          <!-- Navigation Toggle Button -->
          <button @click="toggleSettings" class="floating-action-button">
            <i class="fas fa-universal-access"></i>
          </button>
        </main>
      </div>
    </div>
  
    <!-- Settings Panel mit @click.stop um Event-Propagation zu stoppen -->
    <settings-panel 
      v-if="showSettingsPanel"
      :current-theme="currentTheme"
      :current-font-size="currentFontSize"
      :accessibility-settings="accessibilitySettings"
      @update:theme="currentTheme = $event"
      @update:font-size="currentFontSize = $event"
      @update:accessibility="updateAccessibilitySettings"
      @close="toggleSettings"
    />
    
    <!-- Feedback-Kommentar-Dialog -->
    <feedback-dialog 
      v-if="showFeedbackDialog"
      :feedback-comment="feedbackComment"
      @submit="submitFeedbackComment"
      @close="closeFeedbackDialog"
    />
    
    <!-- Quellenerklärungs-Dialog -->
    <explanation-dialog 
      v-if="showExplanationDialog"
      :current-explanation="currentExplanation"
      :explanation-loading="explanationLoading"
      @close="closeExplanationDialog"
    />
    
    <!-- Quellen-Dialog -->
    <source-dialog 
      v-if="showSourcesDialog"
      :source-references="currentSourceReferences"
      @close="closeSourcesDialog"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useAuthStore } from './stores/authStore';
import { useFeatureToggleStore } from './stores/featureToggleStore';

// Komponenten-Imports
import LoginForm from './components/auth/LoginForm.vue';
import AppHeader from './components/layout/AppHeader.vue';
import SidebarNav from './components/layout/SidebarNav.vue';
import AdminSidebar from './components/admin/AdminSidebar.vue';
import ChatView from './components/chat/ChatView.vue';
import AdminPanel from './components/admin/AdminPanel.vue';
import SettingsPanel from './components/settings/SettingsPanel.vue';
import FeedbackDialog from './components/dialogs/FeedbackDialog.vue';
import ExplanationDialog from './components/dialogs/ExplanationDialog.vue';
import SourceDialog from './components/dialogs/SourceDialog.vue';

// Stores
const userStore = useAuthStore();
const featureStore = useFeatureToggleStore();

// Reaktiver Zustand - Zentraler App-Zustand
const activeView = ref('chat'); // 'chat' oder 'admin'
const adminTab = ref('users'); // 'users', 'system', 'feedback', 'motd', 'doc-converter'
const showSettingsPanel = ref(false);
const motdDismissed = ref(false);

// Sitzungsdaten
const sessions = ref([]);
const currentSessionId = ref(null);
const messages = ref([]);
const isLoading = ref(false);

// Theme und Barrierefreiheit
const currentTheme = ref(localStorage.getItem('theme') || 'light');
const currentFontSize = ref(localStorage.getItem('fontSize') || 'medium');
const accessibilitySettings = ref({
  reduceMotion: localStorage.getItem('reduceMotion') === 'true',
  simpleLanguage: localStorage.getItem('simpleLanguage') === 'true'
});

// Feedback
const showFeedbackDialog = ref(false);
const feedbackComment = ref('');
const currentFeedbackMessage = ref(null);

// Erklärungen und Quellen
const showExplanationDialog = ref(false);
const explanationLoading = ref(false);
const currentExplanation = ref(null);
const showSourcesDialog = ref(false);
const currentSourceReferences = ref([]);

// Admin-Daten
const systemStats = ref({});
const feedbackStats = ref({});
const negativeFeedback = ref([]);
const adminUsers = ref([]);
const newUser = ref({ email: '', password: '', role: 'user' });
const motdConfig = ref({
  enabled: false,
  content: '',
  format: 'markdown',
  style: {
    backgroundColor: '#f0f9ff',
    borderColor: '#bae6fd',
    textColor: '#0c4a6e'
  },
  display: {
    dismissible: true,
    showInChat: true
  }
});
const selectedColorTheme = ref('info');
const motd = ref(null);

// App-Initialisierung
onMounted(async () => {
  // Feature-Toggles initialisieren
  featureStore.initializeFeatureToggles();
  
  // Theme anwenden
  applyTheme(currentTheme.value);
  applyFontSize(currentFontSize.value);
  
  // Token aus localStorage prüfen
  const token = localStorage.getItem('token');
  if (token) {
    userStore.token = token;
    userStore.userRole = localStorage.getItem('userRole') || 'user';
    await loadSessions();
  }
  
  // MOTD laden
  await loadMotd();
});

// Watchers
watch(currentTheme, (newTheme) => {
  localStorage.setItem('theme', newTheme);
  applyTheme(newTheme);
});

watch(currentFontSize, (newSize) => {
  localStorage.setItem('fontSize', newSize);
  applyFontSize(newSize);
});

// Methoden

// Authentifizierungsmethoden
function onLoginSuccess(userData) {
  userStore.token = userData.token;
  userStore.userRole = userData.role;
  loadSessions();
}

function logout() {
  userStore.token = null;
  userStore.userRole = 'user';
  localStorage.removeItem('token');
  localStorage.removeItem('userRole');
}

// Sitzungsmethoden
async function loadSessions() {
  // API-Call für Sitzungen
  /* Beispiel:
  try {
    const response = await fetch('/api/sessions', {
      headers: { Authorization: `Bearer ${userStore.token}` }
    });
    sessions.value = await response.json();
  } catch (error) {
    console.error('Fehler beim Laden der Sitzungen:', error);
  }
  */
  
  // Dummy-Daten zum Testen
  sessions.value = [
    { id: '1', title: 'Erste Unterhaltung' },
    { id: '2', title: 'Zweite Unterhaltung' }
  ];
}

function loadSession(sessionId) {
  currentSessionId.value = sessionId;
  loadMessages(sessionId);
}

function startNewSession() {
  // Neue Sitzung erstellen
  const newSession = { id: Date.now().toString(), title: 'Neue Unterhaltung' };
  sessions.value.unshift(newSession);
  currentSessionId.value = newSession.id;
  messages.value = [];
}

function deleteSession(sessionId) {
  // Bestätigung vor dem Löschen
  if (confirm('Möchten Sie diese Unterhaltung wirklich löschen?')) {
    sessions.value = sessions.value.filter(s => s.id !== sessionId);
    if (currentSessionId.value === sessionId) {
      currentSessionId.value = sessions.value.length > 0 ? sessions.value[0].id : null;
      messages.value = [];
    }
  }
}

async function loadMessages(sessionId) {
  // API-Call für Nachrichten
  /* Beispiel:
  try {
    const response = await fetch(`/api/sessions/${sessionId}/messages`, {
      headers: { Authorization: `Bearer ${userStore.token}` }
    });
    messages.value = await response.json();
  } catch (error) {
    console.error('Fehler beim Laden der Nachrichten:', error);
  }
  */
  
  // Dummy-Daten zum Testen
  messages.value = [
    { id: '1', is_user: true, message: 'Was ist nscale?' },
    { id: '2', is_user: false, message: 'nscale ist eine Dokumentenmanagement-Lösung.' }
  ];
}

async function sendQuestion(question) {
  if (!question.trim() || isLoading.value) return;
  
  isLoading.value = true;
  
  // Benutzerfrage zur Nachrichtenliste hinzufügen
  const userMessage = {
    id: Date.now().toString(),
    is_user: true,
    message: question
  };
  
  messages.value.push(userMessage);
  
  // API-Call für Antwort
  /* Beispiel:
  try {
    const response = await fetch(`/api/sessions/${currentSessionId.value}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userStore.token}`
      },
      body: JSON.stringify({ query: question })
    });
    
    const data = await response.json();
    messages.value.push({
      id: data.id,
      is_user: false,
      message: data.message
    });
  } catch (error) {
    console.error('Fehler beim Senden der Anfrage:', error);
    messages.value.push({
      id: 'error',
      is_user: false,
      is_system: true,
      message: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.'
    });
  } finally {
    isLoading.value = false;
  }
  */
  
  // Dummy-Antwort zum Testen
  setTimeout(() => {
    messages.value.push({
      id: (Date.now() + 1).toString(),
      is_user: false,
      message: `Dies ist eine Testantwort auf Ihre Frage: "${question}"`
    });
    isLoading.value = false;
  }, 1000);
}

// Feedback-Methoden
function submitFeedback(payload) {
  const { messageId, sessionId, isPositive } = payload;
  
  // Feedback in der Nachrichtenliste aktualisieren
  const message = messages.value.find(m => m.id === messageId);
  if (message) {
    message.feedback_positive = isPositive;
  }
  
  // API-Call für Feedback
  /* Beispiel:
  fetch(`/api/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userStore.token}`
    },
    body: JSON.stringify({
      message_id: messageId,
      session_id: sessionId,
      positive: isPositive
    })
  });
  */
}

function openFeedbackDialog(message) {
  currentFeedbackMessage.value = message;
  feedbackComment.value = message.feedback_comment || '';
  showFeedbackDialog.value = true;
}

function submitFeedbackComment() {
  if (currentFeedbackMessage.value) {
    currentFeedbackMessage.value.feedback_comment = feedbackComment.value;
    
    // API-Call für Feedback-Kommentar
    /* Beispiel:
    fetch(`/api/feedback/${currentFeedbackMessage.value.id}/comment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userStore.token}`
      },
      body: JSON.stringify({
        comment: feedbackComment.value
      })
    });
    */
  }
  
  closeFeedbackDialog();
}

function closeFeedbackDialog() {
  showFeedbackDialog.value = false;
  currentFeedbackMessage.value = null;
  feedbackComment.value = '';
}

// Quellen und Erklärungen
async function loadExplanation(message) {
  showExplanationDialog.value = true;
  explanationLoading.value = true;
  
  // API-Call für Erklärung
  /* Beispiel:
  try {
    const response = await fetch(`/api/messages/${message.id}/explanation`, {
      headers: { Authorization: `Bearer ${userStore.token}` }
    });
    currentExplanation.value = await response.json();
  } catch (error) {
    console.error('Fehler beim Laden der Erklärung:', error);
    currentExplanation.value = null;
  } finally {
    explanationLoading.value = false;
  }
  */
  
  // Dummy-Daten zum Testen
  setTimeout(() => {
    currentExplanation.value = {
      original_question: 'Was ist nscale?',
      explanation_text: 'Die Antwort basiert auf Informationen aus der offiziellen Dokumentation.',
      source_references: [
        {
          source_id: 'doc1',
          file: 'nscale_overview.md',
          title: 'Überblick',
          preview: 'nscale ist eine Dokumentenmanagement-Lösung...',
          usage_count: 2
        }
      ]
    };
    explanationLoading.value = false;
  }, 1000);
}

function closeExplanationDialog() {
  showExplanationDialog.value = false;
  currentExplanation.value = null;
}

function openSourcesDialog(message) {
  // Quellen aus der Nachricht extrahieren
  /* Beispiel:
  const sources = extractSourceReferences(message.message);
  currentSourceReferences.value = sources;
  */
  
  // Dummy-Daten zum Testen
  currentSourceReferences.value = [
    {
      source_id: 'doc1',
      file: 'nscale_overview.md',
      title: 'Überblick',
      preview: 'nscale ist eine Dokumentenmanagement-Lösung...'
    }
  ];
  
  showSourcesDialog.value = true;
}

function closeSourcesDialog() {
  showSourcesDialog.value = false;
  currentSourceReferences.value = [];
}

// Einstellungsmethoden
function toggleSettings() {
  showSettingsPanel.value = !showSettingsPanel.value;
}

function applyTheme(theme) {
  document.body.classList.remove('theme-light', 'theme-dark', 'theme-contrast');
  document.body.classList.add(`theme-${theme}`);
  document.body.dataset.theme = theme;
}

function applyFontSize(size) {
  document.body.classList.remove('font-size-small', 'font-size-medium', 'font-size-large');
  document.body.classList.add(`font-size-${size}`);
}

function updateAccessibilitySettings(settings) {
  accessibilitySettings.value = settings;
  localStorage.setItem('reduceMotion', settings.reduceMotion);
  localStorage.setItem('simpleLanguage', settings.simpleLanguage);
  
  if (settings.reduceMotion) {
    document.body.classList.add('reduce-motion');
  } else {
    document.body.classList.remove('reduce-motion');
  }
}

// MOTD-Methoden
async function loadMotd() {
  // API-Call für MOTD
  /* Beispiel:
  try {
    const response = await fetch('/api/motd');
    motd.value = await response.json();
  } catch (error) {
    console.error('Fehler beim Laden der MOTD:', error);
    motd.value = null;
  }
  */
  
  // Dummy-Daten zum Testen
  motd.value = {
    enabled: true,
    content: '**Willkommen** bei nscale DMS Assistent!',
    format: 'markdown',
    style: {
      backgroundColor: '#f0f9ff',
      borderColor: '#bae6fd',
      textColor: '#0c4a6e'
    },
    display: {
      dismissible: true,
      showInChat: true
    }
  };
}

function dismissMotd() {
  motdDismissed.value = true;
  localStorage.setItem('motdDismissed', 'true');
}

// Admin-Methoden
async function loadSystemStats() {
  // API-Call für Systemstatistiken
  /* Beispiel:
  try {
    const response = await fetch('/api/admin/system', {
      headers: { Authorization: `Bearer ${userStore.token}` }
    });
    systemStats.value = await response.json();
  } catch (error) {
    console.error('Fehler beim Laden der Systemstatistiken:', error);
  }
  */
  
  // Dummy-Daten zum Testen
  systemStats.value = {
    document_count: 45,
    chunk_count: 1250,
    documents: {
      'nscale_overview.md': {
        chunks: 35,
        total_tokens: 5200,
        modified: '2025-01-15'
      }
    }
  };
}

async function loadFeedbackStats() {
  // API-Call für Feedback-Statistiken
  /* Beispiel:
  try {
    const response = await fetch('/api/admin/feedback', {
      headers: { Authorization: `Bearer ${userStore.token}` }
    });
    const data = await response.json();
    feedbackStats.value = data.stats;
    negativeFeedback.value = data.negative;
  } catch (error) {
    console.error('Fehler beim Laden der Feedback-Statistiken:', error);
  }
  */
  
  // Dummy-Daten zum Testen
  feedbackStats.value = {
    total: 150,
    positive: 130,
    negative: 20
  };
  
  negativeFeedback.value = [
    {
      id: '1',
      question: 'Wie kann ich Dokumente importieren?',
      answer: 'Sie können Dokumente über die Import-Funktion importieren.',
      comment: 'Die Antwort war zu vage.',
      user_email: 'test@example.com',
      created_at: Date.now() / 1000 - 3600
    }
  ];
}

function clearModelCache() {
  // API-Call für Cache-Löschung
  /* Beispiel:
  fetch('/api/admin/clear-model-cache', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userStore.token}` }
  });
  */
  alert('Modell-Cache wurde geleert');
}

function clearEmbeddingCache() {
  // API-Call für Cache-Löschung
  /* Beispiel:
  fetch('/api/admin/clear-embedding-cache', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userStore.token}` }
  });
  */
  alert('Embedding-Cache wurde geleert');
}

function reloadMotd() {
  // API-Call für MOTD-Neuladung
  /* Beispiel:
  fetch('/api/admin/reload-motd', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userStore.token}` }
  });
  */
  loadMotd();
  alert('MOTD wurde neu geladen');
}

// Benutzerverwaltungsmethoden
async function loadUsers() {
  // API-Call für Benutzer
  /* Beispiel:
  try {
    const response = await fetch('/api/admin/users', {
      headers: { Authorization: `Bearer ${userStore.token}` }
    });
    adminUsers.value = await response.json();
  } catch (error) {
    console.error('Fehler beim Laden der Benutzer:', error);
  }
  */
  
  // Dummy-Daten zum Testen
  adminUsers.value = [
    { id: '1', email: 'admin@example.com', role: 'admin' },
    { id: '2', email: 'user@example.com', role: 'user' }
  ];
}

function createUser() {
  // API-Call für Benutzererstelling
  /* Beispiel:
  fetch('/api/admin/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userStore.token}`
    },
    body: JSON.stringify(newUser.value)
  })
  .then(response => response.json())
  .then(data => {
    adminUsers.value.push(data);
    newUser.value = { email: '', password: '', role: 'user' };
  });
  */
  
  // Dummy-Implementierung zum Testen
  adminUsers.value.push({
    id: Date.now().toString(),
    email: newUser.value.email,
    role: newUser.value.role
  });
  
  newUser.value = { email: '', password: '', role: 'user' };
}

function updateUserRole(userId, role) {
  // API-Call für Rollenaktualisierung
  /* Beispiel:
  fetch(`/api/admin/users/${userId}/role`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userStore.token}`
    },
    body: JSON.stringify({ role })
  });
  */
  
  // Dummy-Implementierung zum Testen
  const user = adminUsers.value.find(u => u.id === userId);
  if (user) {
    user.role = role;
  }
}

function deleteUser(userId) {
  // Bestätigung vor dem Löschen
  if (confirm('Möchten Sie diesen Benutzer wirklich löschen?')) {
    // API-Call für Benutzerlöschung
    /* Beispiel:
    fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userStore.token}` }
    });
    */
    
    // Dummy-Implementierung zum Testen
    adminUsers.value = adminUsers.value.filter(u => u.id !== userId);
  }
}

// MOTD-Konfigurationsmethoden
async function loadMotdConfig() {
  // API-Call für MOTD-Konfiguration
  /* Beispiel:
  try {
    const response = await fetch('/api/admin/motd-config', {
      headers: { Authorization: `Bearer ${userStore.token}` }
    });
    motdConfig.value = await response.json();
  } catch (error) {
    console.error('Fehler beim Laden der MOTD-Konfiguration:', error);
  }
  */
  
  // Dummy-Daten zum Testen
  motdConfig.value = {
    enabled: true,
    content: '**Willkommen** bei nscale DMS Assistent!',
    format: 'markdown',
    style: {
      backgroundColor: '#f0f9ff',
      borderColor: '#bae6fd',
      textColor: '#0c4a6e'
    },
    display: {
      dismissible: true,
      showInChat: true
    }
  };
}

function resetMotdConfig() {
  motdConfig.value = {
    enabled: false,
    content: '',
    format: 'markdown',
    style: {
      backgroundColor: '#f0f9ff',
      borderColor: '#bae6fd',
      textColor: '#0c4a6e'
    },
    display: {
      dismissible: true,
      showInChat: true
    }
  };
}

function saveMotdConfig() {
  // API-Call für MOTD-Konfigurationsspeicherung
  /* Beispiel:
  fetch('/api/admin/motd-config', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userStore.token}`
    },
    body: JSON.stringify(motdConfig.value)
  });
  */
  
  // Lokales Update
  motd.value = { ...motdConfig.value };
  alert('MOTD-Konfiguration wurde gespeichert');
}

function applyColorTheme(theme) {
  const themes = {
    warning: {
      backgroundColor: '#fffbeb',
      borderColor: '#fef3c7',
      textColor: '#92400e'
    },
    info: {
      backgroundColor: '#f0f9ff',
      borderColor: '#bae6fd',
      textColor: '#0c4a6e'
    },
    success: {
      backgroundColor: '#ecfdf5',
      borderColor: '#a7f3d0',
      textColor: '#065f46'
    },
    danger: {
      backgroundColor: '#fef2f2',
      borderColor: '#fecaca',
      textColor: '#991b1b'
    },
    neutral: {
      backgroundColor: '#f9fafb',
      borderColor: '#e5e7eb',
      textColor: '#1f2937'
    }
  };
  
  if (themes[theme]) {
    motdConfig.value.style = { ...themes[theme] };
    selectedColorTheme.value = theme;
  }
}
</script>

<style>
/* Grundstile sind bereits in der HTML-Datei eingebunden */
/* Hier nur spezifische Stile für die App-Komponente */

/* Floating Action Button */
.floating-action-button {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background-color: var(--nscale-primary, #2563eb);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 40;
  transition: all 0.2s;
}

.floating-action-button:hover {
  background-color: var(--nscale-primary-hover, #1d4ed8);
  transform: scale(1.1);
}
</style>