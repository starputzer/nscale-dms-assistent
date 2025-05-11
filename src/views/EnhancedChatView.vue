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
import { ref, computed, watch, onMounted, inject } from "vue";
import { useRouter, useRoute } from "vue-router";
import { storeToRefs } from "pinia";
import { useBridge } from "@/bridge/enhanced";
import { useFeatureToggles } from "@/composables/useFeatureToggles";
import { useChat } from "@/composables/useChat";
import { useStore as useSessionStore } from "@/stores/sessions";
import {
  VirtualMessageList,
  EnhancedMessageInput,
  SessionManager,
} from "@/components/chat/enhanced";
import type { Message, Session } from "@/types/session";
import type { BridgeAPI } from "@/bridge/enhanced/types";

// Feature-Toggle für diese Komponente
const { isFeatureEnabled } = useFeatureToggles();
const isEnhancedChatEnabled = computed(() =>
  isFeatureEnabled("enhancedChatComponents"),
);

// Bridge API
const bridge = inject<BridgeAPI>("bridge") || useBridge();

// Router und Route für Navigation
const router = useRouter();
const route = useRoute();

// Sidebar-Status
const isSidebarCollapsed = ref(false);

// Session-Store
const sessionStore = useSessionStore();
const { sessions, activeSession } = storeToRefs(sessionStore);

// Chat-Composable
const {
  messages,
  isLoading,
  isSending,
  streamingMessage,
  sendMessage,
  loadMessages,
  editMessage,
  retryMessage,
  stopGeneration,
} = useChat();

// Bearbeitungsstatus für Nachrichten
const isEditing = ref(false);
const editingMessageId = ref<string | null>(null);
const messageDraft = ref("");
const highlightedMessageId = ref<string | null>(null);

// Aktive Session-ID aus Route oder Store
const sessionIdFromRoute = computed(() => route.params.id as string);
const activeSessionId = computed(
  () => sessionIdFromRoute.value || activeSession.value?.id || "",
);

// Bridge-Events registrieren
onMounted(() => {
  // Bridge-Events für Chat-Aktionen
  bridge.on(
    "chat:sendMessage",
    (data: { content: string; sessionId?: string }) => {
      handleSendMessage(data.content, data.sessionId);
    },
  );

  bridge.on("chat:selectSession", (data: { sessionId: string }) => {
    handleSessionSelect(data.sessionId);
  });

  bridge.on("chat:createSession", () => {
    handleSessionCreate();
  });

  bridge.on("session:updated", () => {
    // Session-Liste aktualisieren, wenn sie von außen geändert wurde
    sessionStore.fetchSessions();
  });

  // Initiale Sitzung laden
  if (activeSessionId.value) {
    loadSessionMessages(activeSessionId.value);
  } else {
    ensureActiveSession();
  }

  // Status an Bridge melden
  bridge.emit("enhancedChat:ready", { status: "ready" });
});

// Route-Änderungen überwachen, um Nachrichten zu laden
watch(
  () => route.params.id,
  (newId) => {
    if (newId) {
      loadSessionMessages(newId as string);
    }
  },
  { immediate: true },
);

// Sessions überwachen, um auf Änderungen zu reagieren
watch(
  sessions,
  (newSessions) => {
    // Sessions-Status an Bridge melden
    bridge.emit("sessions:updated", {
      count: newSessions.length,
      active: activeSessionId.value,
    });

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
  sessionStore.setActiveSession(sessionId);
  loadSessionMessages(sessionId);

  // Bridge-Event auslösen
  bridge.emit("chat:sessionSelected", { sessionId });
}

// Neue Session erstellen
async function handleSessionCreate() {
  try {
    const session = await sessionStore.createSession();
    router.push(`/session/${session.id}`);

    // Bridge-Event auslösen
    bridge.emit("chat:sessionCreated", { sessionId: session.id });
  } catch (error) {
    console.error("Fehler beim Erstellen einer neuen Sitzung:", error);
  }
}

// Session löschen
async function handleSessionDelete(sessionId: string) {
  try {
    await sessionStore.deleteSession(sessionId);

    // Wenn die aktive Session gelöscht wurde, eine andere aktivieren
    if (sessionId === activeSessionId.value) {
      ensureActiveSession();
    }

    // Bridge-Event auslösen
    bridge.emit("chat:sessionDeleted", { sessionId });
  } catch (error) {
    console.error("Fehler beim Löschen der Sitzung:", error);
  }
}

// Session umbenennen
async function handleSessionRename(sessionId: string, newTitle: string) {
  try {
    await sessionStore.renameSession(sessionId, newTitle);

    // Bridge-Event auslösen
    bridge.emit("chat:sessionRenamed", { sessionId, title: newTitle });
  } catch (error) {
    console.error("Fehler beim Umbenennen der Sitzung:", error);
  }
}

// Session anpinnen/loslösen
async function handleSessionPin(sessionId: string, isPinned: boolean) {
  try {
    await sessionStore.updateSession(sessionId, { isPinned });

    // Bridge-Event auslösen
    bridge.emit("chat:sessionPinned", { sessionId, isPinned });
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
      await editMessage(sessionId, editingMessageId.value, content);
      isEditing.value = false;
      editingMessageId.value = null;

      // Bridge-Event auslösen
      bridge.emit("chat:messageEdited", {
        sessionId,
        messageId: editingMessageId.value,
        content,
      });
    } else {
      // Neue Nachricht senden
      const messageId = await sendMessage(sessionId, content);

      // Bridge-Event auslösen
      bridge.emit("chat:messageSent", {
        sessionId,
        messageId,
        content,
      });
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

  // Bridge-Event auslösen
  bridge.emit("chat:editingMessage", { messageId, content });
}

// Nachrichtenbearbeitung abbrechen
function handleCancelEdit() {
  isEditing.value = false;
  editingMessageId.value = null;
  messageDraft.value = "";
  highlightedMessageId.value = null;

  // Bridge-Event auslösen
  bridge.emit("chat:cancelEdit", {});
}

// Entwurf speichern
function handleDraftChange(content: string) {
  messageDraft.value = content;

  // Bridge-Event auslösen (z.B. für Synchronisierung mit anderen Editoren)
  bridge.emit("chat:draftChanged", { content });
}

// Nachricht erneut senden
async function handleRetryMessage(messageId: string) {
  if (!activeSessionId.value) return;

  try {
    await retryMessage(activeSessionId.value, messageId);

    // Bridge-Event auslösen
    bridge.emit("chat:messageRetried", {
      sessionId: activeSessionId.value,
      messageId,
    });
  } catch (error) {
    console.error("Fehler beim erneuten Senden der Nachricht:", error);
  }
}

// Generierung stoppen
function handleStopGeneration() {
  stopGeneration();

  // Bridge-Event auslösen
  bridge.emit("chat:generationStopped", {});
}

// Seitenliste ein-/ausklappen
function toggleSidebar() {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;

  // Bridge-Event auslösen
  bridge.emit("chat:sidebarToggled", { collapsed: isSidebarCollapsed.value });
}

// Nachrichten für eine Session laden
function loadSessionMessages(sessionId: string) {
  loadMessages(sessionId);
  sessionStore.setActiveSession(sessionId);
}

// Sicherstellen, dass eine aktive Session vorhanden ist
async function ensureActiveSession() {
  const sessionsList = sessions.value;

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
