<template>
  <div class="enhanced-chat-view">
    <div
      class="sidebar-container"
      :class="{ 'sidebar-collapsed': isSidebarCollapsed }"
    >
      <button
        class="toggle-sidebar"
        @click="toggleSidebar"
        :aria-label="
          isSidebarCollapsed
            ? 'Sitzungsliste öffnen'
            : 'Sitzungsliste schließen'
        "
        :aria-expanded="!isSidebarCollapsed"
      >
        <span class="toggle-icon" :class="{ rotate: !isSidebarCollapsed }">
          ❮
        </span>
      </button>

      <div class="sidebar-content" v-show="!isSidebarCollapsed">
        <SessionManager
          :sessions="sessions"
          :activeSessionId="activeSessionId"
          @session-select="handleSessionSelect"
          @session-create="handleSessionCreate"
          @session-delete="handleSessionDelete"
          @session-rename="handleSessionRename"
          @session-pin="handleSessionPin"
        />
      </div>
    </div>

    <div class="chat-container">
      <VirtualMessageList
        :messages="messages"
        :isLoading="isLoading"
        :streamingMessage="streamingMessage"
        :highlightMessageId="highlightedMessageId"
        @retry-message="handleRetryMessage"
        @edit-message="handleEditMessage"
      />

      <EnhancedMessageInput
        :disabled="isLoading || isSending"
        :draft="messageDraft"
        :isEditing="isEditing"
        :isStreaming="!!streamingMessage"
        @send="handleSendMessage"
        @cancel-edit="handleCancelEdit"
        @draft-change="handleDraftChange"
        @stop-generation="handleStopGeneration"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
<<<<<<< HEAD
import { ref, computed, watch, onMounted, onUnmounted, inject, } from "vue";
=======
import { ref, computed, watch, onMounted, onUnmounted, inject, defineEmits } from "vue";
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
import { useRouter, useRoute } from "vue-router";
// Bridge system removed - use direct store communication instead
import { useChatAdapter } from "../composables/adapters/useChatAdapter";
import { useSessionsStoreCompat } from "../stores/adapters/sessionStoreAdapter";
import {
  VirtualMessageList,
  EnhancedMessageInput,
  SessionManager,
} from "../components/chat/enhanced";
import type { Session } from "../types/session";
// Bridge types removed

// Event emitter for component communication
import type { EventMap } from "../utils/eventTypes";

// Diese spezielle Komponente ist immer aktiviert ohne Feature-Flag-Prüfung

// Direct store communication (bridge removed)
// Using window event system for external communication if needed
const emit = defineEmits<{
  'chat:ready': [status: { status: string }];
  'chat:sessionSelected': [data: { sessionId: string }];
  'chat:sessionCreated': [data: { sessionId: string }];
  'chat:sessionDeleted': [data: { sessionId: string }];
  'chat:sessionRenamed': [data: { sessionId: string; title: string }];
  'chat:sessionPinned': [data: { sessionId: string; isPinned: boolean }];
  'chat:messageSent': [data: { sessionId: string; messageId: string; content: string }];
  'chat:messageEdited': [data: { sessionId: string; messageId: string; content: string }];
  'chat:messageRetried': [data: { sessionId: string; messageId: string }];
  'chat:editingMessage': [data: { messageId: string; content: string }];
  'chat:cancelEdit': [data: {}];
  'chat:draftChanged': [data: { content: string }];
  'chat:generationStopped': [data: {}];
  'chat:sidebarToggled': [data: { collapsed: boolean }];
  'sessions:updated': [data: { count: number; active: string }];
}>();

// Router und Route für Navigation
const router = useRouter();
const route = useRoute();

// Sidebar-Status
const isSidebarCollapsed = ref(false);

// Session-Store mit Kompatibilitätsadapter
const sessionStore = useSessionsStoreCompat();
// Wir verwenden keine storeToRefs hier, um TypeScript-Kompatibilitätsprobleme zu vermeiden
const sessions = computed(() => sessionStore.sessions);

// Chat-Composable mit einheitlicher API über Adapter
const chatAdapter = useChatAdapter();

// Extrahiere Eigenschaften und Methoden aus dem Adapter
const messages = chatAdapter.messages;
const isLoading = chatAdapter.isLoading;
const isSending = chatAdapter.isSending;
const streamingMessage = chatAdapter.streamingMessage;

// Methoden aus dem Adapter
const sendMessage = chatAdapter.sendMessage;
const loadMessages = chatAdapter.loadMessages;
const editMessage = chatAdapter.editMessage;
const retryMessage = chatAdapter.retryMessage;
const stopGeneration = chatAdapter.stopGeneration;

// Bearbeitungsstatus für Nachrichten
const isEditing = ref(false);
const editingMessageId = ref<string | null>(null);
const messageDraft = ref("");
const highlightedMessageId = ref<string | null>(null);

// Aktive Session-ID aus Route oder Store
const sessionIdFromRoute = computed(() => route.params.id as string);
const activeSessionId = computed(
  () => sessionIdFromRoute.value || sessionStore.currentSessionId || "",
);

// Event handlers for external communication
const eventHandlers = {
  handleSendMessage: (event: CustomEvent<{ content: string; sessionId?: string }>) => {
    handleSendMessage(event.detail.content, event.detail.sessionId);
  },
  handleSelectSession: (event: CustomEvent<{ sessionId: string }>) => {
    handleSessionSelect(event.detail.sessionId);
  },
  handleCreateSession: () => {
    handleSessionCreate();
  },
  handleSessionUpdate: () => {
    // Session-Liste aktualisieren, wenn sie von außen geändert wurde
    if (typeof sessionStore.synchronizeSessions === "function") {
      sessionStore.synchronizeSessions();
    }
  }
};

onMounted(() => {
  // Register global event listeners for external communication
  window.addEventListener('chat:sendMessage', eventHandlers.handleSendMessage as EventListener);
  window.addEventListener('chat:selectSession', eventHandlers.handleSelectSession as EventListener);
  window.addEventListener('chat:createSession', eventHandlers.handleCreateSession);
  window.addEventListener('session:updated', eventHandlers.handleSessionUpdate);

  // Initiale Sitzung laden
  if (activeSessionId.value) {
    loadSessionMessages(activeSessionId.value);
  } else {
    ensureActiveSession();
  }

  // Status melden
  emit('chat:ready', { status: 'ready' });
  // Also dispatch as window event for external listeners
  window.dispatchEvent(new CustomEvent('enhancedChat:ready', { detail: { status: 'ready' } }));
});

// Cleanup event listeners
onUnmounted(() => {
  window.removeEventListener('chat:sendMessage', eventHandlers.handleSendMessage as EventListener);
  window.removeEventListener('chat:selectSession', eventHandlers.handleSelectSession as EventListener);
  window.removeEventListener('chat:createSession', eventHandlers.handleCreateSession);
  window.removeEventListener('session:updated', eventHandlers.handleSessionUpdate);
});

// Route-Änderungen überwachen, um Nachrichten zu laden
watch(
  () => route.params.id,
  (newId: string | string[] | undefined) => {
    if (newId) {
      loadSessionMessages(
        typeof newId === "string"
          ? newId
          : Array.isArray(newId)
            ? newId[0]
            : "",
      );
    }
  },
  { immediate: true },
);

// Sessions überwachen, um auf Änderungen zu reagieren
watch(
  sessions,
  (newSessions: Session[]) => {
    // Sessions-Status melden
    const updateData = {
      count: newSessions.length,
      active: activeSessionId.value || '',
    };
    emit('sessions:updated', updateData);
    // Also dispatch as window event for external listeners
    window.dispatchEvent(new CustomEvent('sessions:updated', { detail: updateData }));

    // Wenn keine aktive Session vorhanden ist, erste Session aktivieren oder neue erstellen
    if (newSessions.length > 0 && !activeSessionId.value) {
      handleSessionSelect(newSessions[0].id);
    }
  },
  { deep: true },
);

// Aktive Session ändern
function handleSessionSelect(sessionId: string) {
  if (sessionId === activeSessionId.value) return;

  router.push(`/session/${sessionId}`);
  sessionStore.setCurrentSession(sessionId);
  loadSessionMessages(sessionId);

  // Event auslösen
  emit('chat:sessionSelected', { sessionId });
  // Also dispatch as window event for external listeners
  window.dispatchEvent(new CustomEvent('chat:sessionSelected', { detail: { sessionId } }));
}

// Neue Session erstellen
async function handleSessionCreate() {
  try {
    // Handle both API styles for creating a session
    let sessionId;
    if (typeof sessionStore.createSession === "function") {
      const session = await sessionStore.createSession();
      sessionId = typeof session === "string" ? session : session.id;
    } else {
      sessionId = await sessionStore.createSession();
    }

    router.push(`/session/${sessionId}`);

    // Event auslösen
    emit('chat:sessionCreated', { sessionId });
    // Also dispatch as window event for external listeners
    window.dispatchEvent(new CustomEvent('chat:sessionCreated', { detail: { sessionId } }));
  } catch (error) {
    console.error("Fehler beim Erstellen einer neuen Sitzung:", error);
  }
}

// Session löschen
async function handleSessionDelete(sessionId: string) {
  try {
    // Handle both API styles for deleting a session
    if (typeof sessionStore.deleteSession === "function") {
      await sessionStore.deleteSession(sessionId);
    } else if (typeof sessionStore.archiveSession === "function") {
      await sessionStore.archiveSession(sessionId);
    }

    // Wenn die aktive Session gelöscht wurde, eine andere aktivieren
    if (sessionId === activeSessionId.value) {
      ensureActiveSession();
    }

    // Event auslösen
    emit('chat:sessionDeleted', { sessionId });
    // Also dispatch as window event for external listeners
    window.dispatchEvent(new CustomEvent('chat:sessionDeleted', { detail: { sessionId } }));
  } catch (error) {
    console.error("Fehler beim Löschen der Sitzung:", error);
  }
}

// Session umbenennen
async function handleSessionRename(sessionId: string, newTitle: string) {
  try {
    // Handle both API styles for renaming a session
    if (typeof sessionStore.renameSession === "function") {
      await sessionStore.renameSession(sessionId, newTitle);
    } else if (typeof sessionStore.updateSessionTitle === "function") {
      await sessionStore.updateSessionTitle(sessionId, newTitle);
    }

    // Event auslösen
    emit('chat:sessionRenamed', { sessionId, title: newTitle });
    // Also dispatch as window event for external listeners
    window.dispatchEvent(new CustomEvent('chat:sessionRenamed', { detail: { sessionId, title: newTitle } }));
  } catch (error) {
    console.error("Fehler beim Umbenennen der Sitzung:", error);
  }
}

// Session anpinnen/loslösen
async function handleSessionPin(sessionId: string, isPinned: boolean) {
  try {
    // Handle both API styles for updating a session
    if (typeof sessionStore.updateSession === "function") {
      await sessionStore.updateSession(sessionId, { isPinned });
    } else if (typeof sessionStore.togglePinSession === "function") {
      // If current pin status doesn't match desired status, toggle it
      const session = sessions.value.find((s) => s.id === sessionId);
      if (session && session.isPinned !== isPinned) {
        await sessionStore.togglePinSession(sessionId);
      }
    }

    // Event auslösen
    emit('chat:sessionPinned', { sessionId, isPinned });
    // Also dispatch as window event for external listeners
    window.dispatchEvent(new CustomEvent('chat:sessionPinned', { detail: { sessionId, isPinned } }));
  } catch (error) {
    console.error("Fehler beim Anpinnen/Lösen der Sitzung:", error);
  }
}

// Nachricht senden
async function handleSendMessage(content: string, targetSessionId?: string) {
  if (!content.trim()) return;

  const sessionId = targetSessionId || activeSessionId.value;
  if (!sessionId) {
    console.error("Keine aktive Sitzung zum Senden der Nachricht");
    return;
  }

  try {
    if (isEditing.value && editingMessageId.value) {
      // Nachricht bearbeiten
      await editMessage(editingMessageId.value, content, sessionId);
      isEditing.value = false;
      editingMessageId.value = null;

      // Event auslösen
      const messageId = editingMessageId.value || "";
      emit('chat:messageEdited', { sessionId, messageId, content });
      // Also dispatch as window event for external listeners
      window.dispatchEvent(new CustomEvent('chat:messageEdited', { detail: { sessionId, messageId, content } }));
    } else {
      // Neue Nachricht senden (mit korrekter Typisierung)
      if (typeof sendMessage === "function") {
        // Wenn sendMessage ein Objekt erwartet
        if (sendMessage.length === 1) {
          await sendMessage({
            sessionId,
            content,
          });
        } else {
          // Ältere API erwartet direkte Parameter
          await sendMessage(content, sessionId);
        }
      }

      // Event auslösen mit einer einfachen ID
      const messageId = `msg-${Date.now()}`;
      emit('chat:messageSent', { sessionId, messageId, content });
      // Also dispatch as window event for external listeners
      window.dispatchEvent(new CustomEvent('chat:messageSent', { detail: { sessionId, messageId, content } }));
    }

    // Nachrichtenentwurf zurücksetzen
    messageDraft.value = "";
  } catch (error) {
    console.error("Fehler beim Senden der Nachricht:", error);
  }
}

// Nachricht zum Bearbeiten auswählen
function handleEditMessage(messageId: string, content: string) {
  isEditing.value = true;
  editingMessageId.value = messageId;
  messageDraft.value = content;
  highlightedMessageId.value = messageId;

  // Event auslösen
  emit('chat:editingMessage', { messageId, content });
  // Also dispatch as window event for external listeners
  window.dispatchEvent(new CustomEvent('chat:editingMessage', { detail: { messageId, content } }));
}

// Nachrichtenbearbeitung abbrechen
function handleCancelEdit() {
  isEditing.value = false;
  editingMessageId.value = null;
  messageDraft.value = "";
  highlightedMessageId.value = null;

  // Event auslösen
  emit('chat:cancelEdit', {});
  // Also dispatch as window event for external listeners
  window.dispatchEvent(new CustomEvent('chat:cancelEdit', { detail: {} }));
}

// Entwurf speichern
function handleDraftChange(content: string) {
  messageDraft.value = content;

  // Event auslösen (z.B. für Synchronisierung mit anderen Editoren)
  emit('chat:draftChanged', { content });
  // Also dispatch as window event for external listeners
  window.dispatchEvent(new CustomEvent('chat:draftChanged', { detail: { content } }));
}

// Nachricht erneut senden
async function handleRetryMessage(messageId: string) {
  if (!activeSessionId.value) return;

  try {
    // Prüfe auf unterschiedliche Funktionssignaturen
    if (typeof retryMessage === "function") {
      try {
        // Try with just messageId first
        await retryMessage(messageId);
      } catch (e) {
        // Fallback: Try with sessionId parameter if the first attempt fails
        if (activeSessionId.value) {
          await retryMessage(messageId, activeSessionId.value);
        }
      }
    }

    // Event auslösen
    emit('chat:messageRetried', {
      sessionId: activeSessionId.value,
      messageId,
    });
    // Also dispatch as window event for external listeners
    window.dispatchEvent(new CustomEvent('chat:messageRetried', { 
      detail: { sessionId: activeSessionId.value, messageId } 
    }));
  } catch (error) {
    console.error("Fehler beim erneuten Senden der Nachricht:", error);
  }
}

// Generierung stoppen
function handleStopGeneration() {
  stopGeneration();

  // Event auslösen
  emit('chat:generationStopped', {});
  // Also dispatch as window event for external listeners
  window.dispatchEvent(new CustomEvent('chat:generationStopped', { detail: {} }));
}

// Seitenliste ein-/ausklappen
function toggleSidebar() {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;

  // Event auslösen
  emit('chat:sidebarToggled', { collapsed: isSidebarCollapsed.value });
  // Also dispatch as window event for external listeners
  window.dispatchEvent(new CustomEvent('chat:sidebarToggled', { detail: { collapsed: isSidebarCollapsed.value } }));
}

// Nachrichten für eine Session laden
async function loadSessionMessages(sessionId: string) {
  try {
    // Zuerst die Session im Store setzen
    await sessionStore.setCurrentSession(sessionId);

    // Dann die Nachrichten laden, falls erforderlich
    if (typeof loadMessages === "function") {
      if (loadMessages.length === 0) {
        // Keine Parameter
        await loadMessages();
      } else {
        // SessionId als Parameter
        await loadMessages(sessionId);
      }
    }
  } catch (error) {
    console.error("Fehler beim Laden der Nachrichten:", error);
  }
}

// Sicherstellen, dass eine aktive Session vorhanden ist
async function ensureActiveSession() {
  // Safely access sessions with type check
  const sessionsList = Array.isArray(sessions.value) ? sessions.value : [];

  if (sessionsList.length > 0) {
    // Erste vorhandene Session verwenden
    handleSessionSelect(sessionsList[0].id);
  } else {
    // Neue Session erstellen
    await handleSessionCreate();
  }
}
</script>

<style scoped>
.enhanced-chat-view {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.sidebar-container {
  position: relative;
  height: 100%;
  transition: width 0.3s ease;
  width: 280px;
  background-color: var(--sidebar-bg, #f5f5f5);
  border-right: 1px solid var(--border-color, #e0e0e0);
}

.sidebar-collapsed {
  width: 40px;
}

.sidebar-content {
  height: 100%;
  overflow: hidden;
}

.toggle-sidebar {
  position: absolute;
  top: 10px;
  right: -12px;
  width: 24px;
  height: 24px;
  background: var(--primary-color, #4a4a4a);
  color: white;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  padding: 0;
  font-size: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggle-icon {
  transition: transform 0.3s ease;
  display: inline-block;
}

.toggle-icon.rotate {
  transform: rotate(180deg);
}

.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* Anpassungen für dunklen Modus */
@media (prefers-color-scheme: dark) {
  .sidebar-container {
    background-color: var(--dark-sidebar-bg, #2a2a2a);
    border-right-color: var(--dark-border-color, #444);
  }

  .toggle-sidebar {
    background: var(--dark-primary-color, #5a5a5a);
  }
}
</style>
