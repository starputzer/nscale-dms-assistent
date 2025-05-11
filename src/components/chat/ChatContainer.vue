<template>
  <div
    class="n-chat-container"
    :class="{ 'n-chat-container--loading': isLoading }"
    role="region"
    aria-labelledby="chat-container-title"
    aria-live="polite"
    aria-atomic="false"
  >
    <!-- Header für den Chat mit Sitzungsinformationen -->
    <div class="n-chat-container__header" role="banner">
      <div class="n-chat-container__session-info">
        <h2 id="chat-container-title" class="n-chat-container__title">
          {{ sessionTitle }}
          <span
            v-if="currentSession?.isArchived"
            class="n-chat-container__archive-badge"
            title="Diese Session ist archiviert"
            aria-label="Archivierte Session"
          >
            🗄️
          </span>
        </h2>
        <span
          v-if="currentSession?.updatedAt"
          class="n-chat-container__timestamp"
          aria-label="Letzte Aktualisierung"
        >
          {{ formatTimestamp(currentSession.updatedAt) }}
        </span>
      </div>
      <div
        class="n-chat-container__actions"
        role="toolbar"
        aria-label="Sitzungsaktionen"
      >
        <button
          v-if="canRenameSession"
          type="button"
          class="n-chat-container__action-btn"
          title="Sitzung umbenennen"
          aria-label="Sitzung umbenennen"
          @click="handleRenameSession"
        >
          <span
            class="n-chat-container__action-icon n-chat-container__action-icon--edit"
            aria-hidden="true"
            >✏️</span
          >
        </button>
        <button
          v-if="canExportSession"
          type="button"
          class="n-chat-container__action-btn"
          title="Sitzung exportieren"
          aria-label="Sitzung als Textdatei exportieren"
          @click="handleExportSession"
        >
          <span
            class="n-chat-container__action-icon n-chat-container__action-icon--export"
            aria-hidden="true"
            >📤</span
          >
        </button>
        <button
          v-if="canArchiveSession"
          type="button"
          class="n-chat-container__action-btn"
          :title="
            currentSession?.isArchived
              ? 'Sitzung aus Archiv wiederherstellen'
              : 'Sitzung archivieren'
          "
          :aria-label="
            currentSession?.isArchived
              ? 'Sitzung aus Archiv wiederherstellen'
              : 'Sitzung archivieren'
          "
          @click="handleToggleArchiveSession"
        >
          <span
            class="n-chat-container__action-icon"
            :class="
              currentSession?.isArchived
                ? 'n-chat-container__action-icon--unarchive'
                : 'n-chat-container__action-icon--archive'
            "
            aria-hidden="true"
          >
            {{ currentSession?.isArchived ? "📂" : "🗄️" }}
          </span>
        </button>
        <button
          v-if="canClearSession"
          type="button"
          class="n-chat-container__action-btn"
          title="Sitzung leeren"
          aria-label="Sitzung leeren"
          @click="handleClearSession"
        >
          <span
            class="n-chat-container__action-icon n-chat-container__action-icon--clear"
            aria-hidden="true"
            >🗑️</span
          >
        </button>
      </div>
    </div>

    <!-- Container für die Nachrichtenliste mit Touch-Support -->
    <div
      class="n-chat-container__messages"
      role="log"
      aria-label="Chat-Nachrichtenverlauf"
      aria-live="polite"
      v-touch="{
        left: handleSwipeLeft,
        right: handleSwipeRight,
      }"
    >
      <MessageList
        ref="messageListRef"
        :messages="messages"
        :is-loading="isLoading"
        :is-streaming="isStreaming"
        :welcome-title="welcomeTitle"
        :welcome-message="welcomeMessage"
        :logo-url="logoUrl"
        :virtualized="virtualizedList"
        :show-message-actions="showMessageActions"
        @feedback="handleFeedback"
        @view-sources="handleViewSources"
        @view-explanation="handleViewExplanation"
        @retry="handleRetry"
        @delete="handleDeleteMessage"
        @scroll="handleScroll"
        @load-more="handleLoadMore"
      />

      <!-- Touch-Gesten-Hinweis für mobile Geräte -->
      <div
        v-if="showTouchHints && isMobile"
        class="n-chat-container__touch-hints"
        aria-live="polite"
      >
        <div class="n-chat-container__touch-hints-content">
          <h3 class="n-chat-container__touch-hints-title">Touch-Gesten</h3>
          <ul class="n-chat-container__touch-hints-list">
            <li>Nach links wischen: Quellenansicht öffnen</li>
            <li>Nach rechts wischen: Dialog schließen</li>
            <li>Lang tippen: Nachrichtenaktionen anzeigen</li>
          </ul>
          <button
            type="button"
            class="n-chat-container__touch-hints-close"
            @click="showTouchHints = false"
          >
            Verstanden
          </button>
        </div>
      </div>
    </div>

    <!-- Container für die Nachrichteneingabe -->
    <div
      class="n-chat-container__input"
      role="form"
      aria-label="Nachrichteneingabe"
    >
      <MessageInput
        v-model="inputText"
        :disabled="inputDisabled"
        :is-loading="isSending"
        :is-streaming="isStreaming"
        :is-editing="isEditing"
        :error="inputError"
        :placeholder="inputPlaceholder"
        :draft="messageDraft"
        :show-templates="showMessageTemplates"
        :templates="messageTemplates"
        @submit="handleSendMessage"
        @draft-change="handleDraftChange"
        @stop-stream="handleStopGeneration"
        @cancel-edit="handleCancelEdit"
      />
    </div>

    <!-- Modaler Dialog für Quellen, falls geöffnet -->
    <div
      v-if="showSourcesDialog"
      class="n-chat-container__dialog-overlay"
      @click="closeSourcesDialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sources-dialog-title"
    >
      <div class="n-chat-container__dialog" @click.stop>
        <div class="n-chat-container__dialog-header">
          <h3 id="sources-dialog-title" class="n-chat-container__dialog-title">
            Quellenangaben
          </h3>
          <div class="n-chat-container__dialog-controls">
            <span class="n-chat-container__sources-count"
              >{{ selectedMessageSources.length }} Quellen</span
            >
            <button
              type="button"
              class="n-chat-container__dialog-close"
              aria-label="Dialog schließen"
              @click="closeSourcesDialog"
            >
              <span class="n-chat-container__dialog-close-icon">×</span>
            </button>
          </div>
        </div>

        <div class="n-chat-container__dialog-toolbar">
          <div class="n-chat-container__toolbar-group">
            <label for="sources-sort" class="n-chat-container__toolbar-label"
              >Sortieren nach:</label
            >
            <select
              id="sources-sort"
              v-model="sourcesSort"
              class="n-chat-container__toolbar-select"
              aria-label="Sortierung der Quellen"
            >
              <option value="relevance">Relevanz</option>
              <option value="title">Titel</option>
              <option value="page">Seitennummer</option>
            </select>
          </div>

          <div class="n-chat-container__toolbar-group">
            <label for="sources-filter" class="n-chat-container__toolbar-label"
              >Filtern:</label
            >
            <input
              id="sources-filter"
              v-model="sourcesFilter"
              type="text"
              class="n-chat-container__toolbar-input"
              placeholder="In Quellen suchen..."
              aria-label="Filter für Quellen"
            />
          </div>

          <div class="n-chat-container__toolbar-group">
            <label
              for="sources-relevance"
              class="n-chat-container__toolbar-label"
              >Min. Relevanz:</label
            >
            <input
              id="sources-relevance"
              v-model="minRelevance"
              type="range"
              min="0"
              max="1"
              step="0.1"
              class="n-chat-container__toolbar-range"
              aria-label="Minimale Relevanz"
            />
            <span class="n-chat-container__toolbar-value">{{
              formatRelevance(minRelevance)
            }}</span>
          </div>
        </div>

        <div class="n-chat-container__dialog-content">
          <ul
            v-if="filteredSources.length"
            class="n-chat-container__sources-list"
          >
            <li
              v-for="source in filteredSources"
              :key="source.id"
              class="n-chat-container__source-item"
            >
              <div class="n-chat-container__source-header">
                <h4 class="n-chat-container__source-title">
                  {{ source.title }}
                </h4>
                <span
                  v-if="source.pageNumber"
                  class="n-chat-container__source-page"
                >
                  Seite {{ source.pageNumber }}
                </span>
              </div>
              <div class="n-chat-container__source-content">
                {{ source.content }}
              </div>
              <div class="n-chat-container__source-footer">
                <span class="n-chat-container__source-relevance">
                  Relevanz: {{ formatRelevance(source.relevanceScore || 0) }}
                </span>
                <button
                  class="n-chat-container__source-button"
                  @click="copySourceToClipboard(source)"
                  aria-label="Quelle in die Zwischenablage kopieren"
                  title="In Zwischenablage kopieren"
                >
                  📋
                </button>
              </div>
            </li>
          </ul>
          <p
            v-else-if="selectedMessageSources.length === 0"
            class="n-chat-container__sources-empty"
          >
            Keine Quellenangaben für diese Nachricht verfügbar.
          </p>
          <p v-else class="n-chat-container__sources-empty">
            Keine Quellen entsprechen den Filterkriterien.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Touch-Direktive registrieren
const vt = vTouch;
import { ref, computed, watch, onMounted, nextTick } from "vue";
import { useSessionsStore } from "@/stores/sessions";
import { useUIStore } from "@/stores/ui";
import { useChat } from "@/composables/useChat";
import { useWindowSize } from "@/composables/useWindowSize";
import type {
  ChatMessage,
  ChatSession,
  SourceReference,
} from "@/types/session";
import { vTouch } from "@/directives/touch-directives";
import MessageList from "./MessageList.vue";
import MessageInput from "./MessageInput.vue";

// Interface für vorgefertigte Nachrichtenvorlagen
interface MessageTemplate {
  label: string;
  content: string;
}

// Props Definition
interface Props {
  /**
   * ID der aktuellen Sitzung
   */
  sessionId?: string;

  /**
   * Ob die Nachrichtenliste virtualisiert werden soll
   */
  virtualizedList?: boolean;

  /**
   * Willkommenstitel für leere Chats
   */
  welcomeTitle?: string;

  /**
   * Willkommensnachricht für leere Chats
   */
  welcomeMessage?: string;

  /**
   * URL des Logos für den Willkommensbildschirm
   */
  logoUrl?: string;

  /**
   * Ob Aktionsschaltflächen für Nachrichten angezeigt werden sollen
   */
  showMessageActions?: boolean;

  /**
   * Ob Nachrichtenvorlagen angezeigt werden sollen
   */
  showMessageTemplates?: boolean;

  /**
   * Vorgefertigte Nachrichtenvorlagen
   */
  messageTemplates?: MessageTemplate[];

  /**
   * Platzhaltertext für die Eingabe
   */
  inputPlaceholder?: string;

  /**
   * Ob die Sitzung umbenannt werden kann
   */
  canRenameSession?: boolean;

  /**
   * Ob die Sitzung exportiert werden kann
   */
  canExportSession?: boolean;

  /**
   * Ob die Sitzung archiviert werden kann
   */
  canArchiveSession?: boolean;

  /**
   * Ob die Sitzung geleert werden kann
   */
  canClearSession?: boolean;
}

// Default-Werte für Props
const props = withDefaults(defineProps<Props>(), {
  sessionId: "",
  virtualizedList: true,
  welcomeTitle: "Willkommen beim nscale DMS Assistenten",
  welcomeMessage: "Wie kann ich Ihnen heute mit nscale helfen?",
  showMessageActions: true,
  showMessageTemplates: false,
  messageTemplates: () => [],
  inputPlaceholder: "Geben Sie Ihre Nachricht ein...",
  canRenameSession: true,
  canExportSession: true,
  canArchiveSession: true,
  canClearSession: true,
});

// Emit Definition
const emit = defineEmits<{
  /**
   * Event beim Senden einer Nachricht
   */
  (e: "message-sent", payload: { content: string; sessionId: string }): void;

  /**
   * Event beim Empfangen einer Nachricht
   */
  (
    e: "message-received",
    payload: { message: ChatMessage; sessionId: string },
  ): void;

  /**
   * Event, wenn es einen Fehler gibt
   */
  (e: "error", payload: { error: string; context?: string }): void;

  /**
   * Event, wenn die Sitzung umbenannt wurde
   */
  (e: "session-renamed", payload: { sessionId: string; title: string }): void;

  /**
   * Event, wenn die Sitzung archiviert wurde
   */
  (
    e: "session-archived",
    payload: { sessionId: string; isArchived: boolean },
  ): void;

  /**
   * Event, wenn die Sitzung geleert wurde
   */
  (e: "session-cleared", payload: { sessionId: string }): void;

  /**
   * Event, wenn mehr Nachrichten geladen wurden
   */
  (
    e: "messages-loaded",
    payload: { count: number; direction: "up" | "down" },
  ): void;

  /**
   * Event, wenn das Scrollen sich verändert hat
   */
  (e: "scroll", payload: { isAtBottom: boolean; scrollTop: number }): void;
}>();

// Refs
const messageListRef = ref<InstanceType<typeof MessageList> | null>(null);
const inputText = ref("");
const messageDraft = ref("");
const inputError = ref("");
const isEditing = ref(false);
const editingMessageId = ref("");
const showSourcesDialog = ref(false);
const selectedMessageId = ref("");

// Quellen-Dialog Refs
const sourcesSort = ref<"relevance" | "title" | "page">("relevance");
const sourcesFilter = ref("");
const minRelevance = ref(0);

// Mobile Touch Support
const { width } = useWindowSize();
const isMobile = computed(() => width.value < 768);
const showTouchHints = ref(false);

// Stores und Composables
const uiStore = useUIStore();
const sessionsStore = useSessionsStore();
const {
  messages,
  isLoading,
  isStreaming,
  error,
  currentSession,
  isSending,
  sendMessage,
  cancelStream,
  deleteMessage,
  loadOlderMessages,
  retryMessage,
} = useChat();

// Computed Properties
const sessionTitle = computed(() => {
  return currentSession.value?.title || props.welcomeTitle;
});

const inputDisabled = computed(() => {
  return isLoading.value || !props.sessionId;
});

// Quellen für die ausgewählte Nachricht
const selectedMessageSources = computed(() => {
  if (!selectedMessageId.value) return [];

  const message = messages.value.find((m) => m.id === selectedMessageId.value);
  return message?.metadata?.sourceReferences || [];
});

// Gefilterte und sortierte Quellen für die Anzeige
const filteredSources = computed(() => {
  // Filtern nach Suchtext und Mindest-Relevanz
  let filteredData = selectedMessageSources.value.filter((source) => {
    const matchesFilter =
      sourcesFilter.value === "" ||
      source.title?.toLowerCase().includes(sourcesFilter.value.toLowerCase()) ||
      source.content?.toLowerCase().includes(sourcesFilter.value.toLowerCase());

    const matchesRelevance = (source.relevanceScore || 0) >= minRelevance.value;

    return matchesFilter && matchesRelevance;
  });

  // Sortieren nach ausgewähltem Kriterium
  return filteredData.sort((a, b) => {
    if (sourcesSort.value === "relevance") {
      return (b.relevanceScore || 0) - (a.relevanceScore || 0);
    } else if (sourcesSort.value === "title") {
      return (a.title || "").localeCompare(b.title || "");
    } else if (sourcesSort.value === "page") {
      return (a.pageNumber || 0) - (b.pageNumber || 0);
    }
    return 0;
  });
});

// Methods
function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    console.error("Error formatting timestamp:", error);
    return "";
  }
}

function formatRelevance(score: number): string {
  if (score >= 0.8) return "Sehr hoch";
  if (score >= 0.6) return "Hoch";
  if (score >= 0.4) return "Mittel";
  if (score >= 0.2) return "Niedrig";
  return "Sehr niedrig";
}

// Sendet eine Nachricht
async function handleSendMessage(content: string): Promise<void> {
  if (!content.trim() || !props.sessionId) return;

  try {
    // Wenn eine Nachricht bearbeitet wird
    if (isEditing.value && editingMessageId.value) {
      // TODO: Implementieren der Bearbeitungsfunktion
      isEditing.value = false;
      editingMessageId.value = "";
    } else {
      // Neue Nachricht senden
      await sendMessage(content);
      emit("message-sent", { content, sessionId: props.sessionId });
    }

    // Eingabe zurücksetzen
    inputText.value = "";
    messageDraft.value = "";
    inputError.value = "";
  } catch (err: any) {
    console.error("Error sending message:", err);
    inputError.value = err.message || "Fehler beim Senden der Nachricht.";
    emit("error", { error: inputError.value, context: "send-message" });
  }
}

// Stoppt die Generierung einer Antwort
function handleStopGeneration(): void {
  cancelStream();
}

// Behandelt Feedback zu einer Nachricht
function handleFeedback(payload: {
  messageId: string;
  type: "positive" | "negative";
  feedback?: string;
}): void {
  // TODO: Implementieren der Feedback-Funktion
  uiStore.showSuccess(`Vielen Dank für Ihr Feedback!`);
}

// Öffnet den Dialog mit Quellenangaben
function handleViewSources(payload: { messageId: string }): void {
  selectedMessageId.value = payload.messageId;
  showSourcesDialog.value = true;
}

// Öffnet einen Dialog mit Erklärungen
function handleViewExplanation(payload: { messageId: string }): void {
  // TODO: Implementieren der Erklärungs-Anzeige
  uiStore.showInfo(
    `Erklärung wird angezeigt für Nachricht ${payload.messageId}`,
  );
}

// Löscht eine Nachricht
async function handleDeleteMessage(payload: {
  messageId: string;
}): Promise<void> {
  try {
    await deleteMessage(payload.messageId);
    uiStore.showSuccess("Nachricht wurde gelöscht.");
  } catch (err: any) {
    console.error("Error deleting message:", err);
    uiStore.showError("Fehler beim Löschen der Nachricht.");
    emit("error", { error: err.message, context: "delete-message" });
  }
}

// Sendet eine Nachricht erneut
async function handleRetry(payload: { messageId: string }): Promise<void> {
  try {
    await retryMessage(payload.messageId);
  } catch (err: any) {
    console.error("Error retrying message:", err);
    uiStore.showError("Fehler beim erneuten Senden der Nachricht.");
    emit("error", { error: err.message, context: "retry-message" });
  }
}

// Behandelt Scroll-Events in der Nachrichtenliste
function handleScroll(payload: {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  isAtBottom: boolean;
}): void {
  emit("scroll", {
    isAtBottom: payload.isAtBottom,
    scrollTop: payload.scrollTop,
  });
}

// Lädt weitere Nachrichten
function handleLoadMore(payload: {
  direction: "up" | "down";
  firstVisibleIndex?: number;
  lastVisibleIndex?: number;
}): void {
  // In einer echten Implementierung würden ältere Nachrichten geladen werden
  if (payload.direction === "up") {
    const olderMessages = loadOlderMessages(props.sessionId);
    emit("messages-loaded", { count: olderMessages.length, direction: "up" });
  }
}

// Speichert den Entwurf einer Nachricht
function handleDraftChange(value: string): void {
  messageDraft.value = value;
}

// Abbrechen der Bearbeitung
function handleCancelEdit(): void {
  isEditing.value = false;
  editingMessageId.value = "";
  inputText.value = "";
  messageDraft.value = "";
}

// Schließt den Quellen-Dialog
function closeSourcesDialog(): void {
  showSourcesDialog.value = false;
  selectedMessageId.value = "";
  // Zurücksetzen der Filter und Sortierung
  sourcesFilter.value = "";
  sourcesSort.value = "relevance";
  minRelevance.value = 0;
}

// Kopiert den Inhalt einer Quelle in die Zwischenablage
async function copySourceToClipboard(source: SourceReference): Promise<void> {
  try {
    const text = `${source.title}${source.pageNumber ? ` (Seite ${source.pageNumber})` : ""}\n\n${source.content}`;
    await navigator.clipboard.writeText(text);
    uiStore.showSuccess("Quelle wurde in die Zwischenablage kopiert.");
  } catch (err) {
    console.error("Error copying to clipboard:", err);
    uiStore.showError("Fehler beim Kopieren in die Zwischenablage.");
  }
}

// Umbenennen der Sitzung
function handleRenameSession(): void {
  if (!props.sessionId) return;

  const newTitle = prompt("Neuer Titel für die Sitzung:", sessionTitle.value);

  if (newTitle && newTitle.trim() !== "") {
    try {
      sessionsStore.updateSessionTitle(props.sessionId, newTitle);
      emit("session-renamed", { sessionId: props.sessionId, title: newTitle });
      uiStore.showSuccess("Sitzung wurde umbenannt.");
    } catch (err: any) {
      console.error("Error renaming session:", err);
      uiStore.showError("Fehler beim Umbenennen der Sitzung.");
      emit("error", { error: err.message, context: "rename-session" });
    }
  }
}

// Exportieren der Sitzung
function handleExportSession(): void {
  if (!props.sessionId || !messages.value.length) return;

  try {
    // Formatiere die Nachrichten als Text
    const formattedMessages = messages.value
      .map((msg) => {
        return `${msg.role === "user" ? "Sie" : "Assistent"} (${new Date(msg.timestamp).toLocaleString()}):\n${msg.content}\n\n`;
      })
      .join("---\n\n");

    // Erstelle einen Blob mit dem Text
    const blob = new Blob([formattedMessages], {
      type: "text/plain;charset=utf-8",
    });

    // Erstelle einen Download-Link
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const filename = `nscale-chat-${props.sessionId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.txt`;

    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);

    uiStore.showSuccess("Sitzung wurde exportiert.");
  } catch (err: any) {
    console.error("Error exporting session:", err);
    uiStore.showError("Fehler beim Exportieren der Sitzung.");
    emit("error", { error: err.message, context: "export-session" });
  }
}

// Löschen aller Nachrichten in der Sitzung
async function handleClearSession(): Promise<void> {
  if (!props.sessionId) return;

  if (
    confirm("Möchten Sie wirklich alle Nachrichten in dieser Sitzung löschen?")
  ) {
    try {
      // Alle Nachrichten löschen
      const sessionMessages = messages.value;

      for (const message of sessionMessages) {
        if (message.id) {
          await sessionsStore.deleteMessage(props.sessionId, message.id);
        }
      }

      emit("session-cleared", { sessionId: props.sessionId });
      uiStore.showSuccess("Alle Nachrichten wurden gelöscht.");

      // Session aktualisieren, um die gelöschten Nachrichten zu reflektieren
      await sessionsStore.refreshSession(props.sessionId);
    } catch (err: any) {
      console.error("Error clearing session:", err);
      uiStore.showError("Fehler beim Löschen der Nachrichten.");
      emit("error", { error: err.message, context: "clear-session" });
    }
  }
}

// Archivieren/Dearchivieren einer Session
async function handleToggleArchiveSession(): Promise<void> {
  if (!props.sessionId) return;

  const isCurrentlyArchived = currentSession.value?.isArchived || false;
  const actionText = isCurrentlyArchived
    ? "aus dem Archiv wiederherstellen"
    : "archivieren";

  if (confirm(`Möchten Sie diese Sitzung wirklich ${actionText}?`)) {
    try {
      await sessionsStore.toggleArchiveSession(
        props.sessionId,
        !isCurrentlyArchived,
      );

      const successMessage = isCurrentlyArchived
        ? "Sitzung wurde aus dem Archiv wiederhergestellt."
        : "Sitzung wurde archiviert.";

      uiStore.showSuccess(successMessage);
      emit("session-archived", {
        sessionId: props.sessionId,
        isArchived: !isCurrentlyArchived,
      });
    } catch (err: any) {
      console.error(
        `Error ${isCurrentlyArchived ? "unarchiving" : "archiving"} session:`,
        err,
      );
      uiStore.showError(`Fehler beim ${actionText} der Sitzung.`);
      emit("error", { error: err.message, context: "toggle-archive-session" });
    }
  }
}

// Scrollt zum Ende der Nachrichtenliste
function scrollToBottom(behavior: ScrollBehavior = "smooth"): void {
  nextTick(() => {
    messageListRef.value?.scrollToBottom(behavior);
  });
}

// Touch-Gesture-Handler für mobile Geräte
function handleSwipeLeft(): void {
  // Aktion für Swipe nach links, z.B. Quellen anzeigen
  if (isMobile.value && messages.value.length > 0) {
    const lastMessage = messages.value[messages.value.length - 1];
    if (
      lastMessage &&
      lastMessage.role === "assistant" &&
      lastMessage.metadata?.sourceReferences?.length
    ) {
      handleViewSources({ messageId: lastMessage.id });
    }
  }
}

function handleSwipeRight(): void {
  // Aktion für Swipe nach rechts, z.B. Dialog schließen
  if (isMobile.value && showSourcesDialog.value) {
    closeSourcesDialog();
  }
}

function handleLongPress(messageId: string): void {
  // Aktion für langes Drücken, z.B. Kontextmenü öffnen
  if (isMobile.value) {
    const message = messages.value.find((m) => m.id === messageId);
    if (message) {
      if (
        message.role === "assistant" &&
        message.metadata?.sourceReferences?.length
      ) {
        handleViewSources({ messageId });
      } else if (message.role === "user") {
        // Benutzer-Nachricht zum Bearbeiten markieren
        isEditing.value = true;
        editingMessageId.value = messageId;
        inputText.value = message.content;
      }
    }
  }
}

// Zeigt Hinweise für Touch-Gesten an
function showTouchGestureHints(): void {
  if (isMobile.value && !showTouchHints.value) {
    showTouchHints.value = true;

    // Hinweise nach 5 Sekunden ausblenden
    setTimeout(() => {
      showTouchHints.value = false;
    }, 5000);

    // Speichern, dass Hinweise bereits angezeigt wurden
    try {
      localStorage.setItem("n-chat-touch-hints-shown", "true");
    } catch (e) {
      console.error("Error saving touch hints state to localStorage:", e);
    }
  }
}

// Öffentliche Methoden
defineExpose({
  scrollToBottom,
  handleSendMessage,
  handleStopGeneration,
  handleToggleArchiveSession,
});

// Lifecycle Hooks
onMounted(async () => {
  // Sitzung laden, wenn eine ID vorhanden ist
  if (props.sessionId) {
    try {
      await sessionsStore.refreshSession(props.sessionId);

      // Aktive Session im Store setzen
      sessionsStore.setCurrentSession(props.sessionId);
    } catch (err: any) {
      console.error("Error loading session:", err);
      emit("error", { error: err.message, context: "load-session" });
    }
  }

  // Prüfen, ob wir auf einem mobilen Gerät sind und Touch-Gesten-Hinweise anzeigen sollten
  if (isMobile.value) {
    try {
      const hintsShown = localStorage.getItem("n-chat-touch-hints-shown");
      if (!hintsShown) {
        // Hinweise anzeigen, aber nur einmal
        setTimeout(showTouchGestureHints, 1000);
      }
    } catch (e) {
      console.error("Error reading from localStorage:", e);
    }
  }
});

// Watches
watch(
  () => props.sessionId,
  async (newSessionId) => {
    if (newSessionId) {
      try {
        await sessionsStore.refreshSession(newSessionId);

        // Aktive Session im Store setzen
        sessionsStore.setCurrentSession(newSessionId);
      } catch (err: any) {
        console.error("Error loading session:", err);
        emit("error", { error: err.message, context: "load-session" });
      }
    }
  },
);

// Überwacht Fehler im Store
watch(
  () => error.value,
  (newError) => {
    if (newError) {
      inputError.value = newError;
      emit("error", { error: newError, context: "store-error" });
    } else {
      inputError.value = "";
    }
  },
);

// Überwacht eingehende Nachrichten
watch(
  () => messages.value,
  (newMessages, oldMessages) => {
    if (props.sessionId && newMessages.length > oldMessages.length) {
      // Eine neue Nachricht wurde empfangen
      const newMessage = newMessages[newMessages.length - 1];
      if (newMessage.role === "assistant") {
        emit("message-received", {
          message: newMessage,
          sessionId: props.sessionId,
        });
      }
    }
  },
);
</script>

<style scoped>
/* Chat-Container Hauptstil */
.n-chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--nscale-body-bg, #ffffff);
  overflow: hidden;
}

/* Header-Bereich */
.n-chat-container__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--nscale-space-4, 1rem);
  border-bottom: 1px solid var(--nscale-border-color, #e2e8f0);
  background-color: var(--nscale-surface-color, #f8fafc);
}

.n-chat-container__session-info {
  display: flex;
  flex-direction: column;
}

.n-chat-container__title {
  font-size: var(--nscale-font-size-lg, 1.125rem);
  font-weight: var(--nscale-font-weight-medium, 500);
  margin: 0;
  color: var(--nscale-text, #1a202c);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.n-chat-container__archive-badge {
  font-size: 0.75rem;
  color: var(--nscale-text-tertiary, #94a3b8);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.n-chat-container__timestamp {
  font-size: var(--nscale-font-size-xs, 0.75rem);
  color: var(--nscale-text-tertiary, #94a3b8);
}

.n-chat-container__actions {
  display: flex;
  gap: var(--nscale-space-2, 0.5rem);
}

.n-chat-container__action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--nscale-border-color, #e2e8f0);
  border-radius: var(--nscale-border-radius-md, 0.5rem);
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
}

.n-chat-container__action-btn:hover {
  background-color: var(--nscale-hover-bg, rgba(0, 0, 0, 0.05));
  border-color: var(--nscale-border-color-dark, #cbd5e1);
}

.n-chat-container__action-icon {
  font-size: 16px;
}

.n-chat-container__action-icon--archive,
.n-chat-container__action-icon--unarchive {
  font-size: 14px;
}

/* Messages-Bereich */
.n-chat-container__messages {
  flex: 1;
  overflow: hidden;
  position: relative;
}

/* Input-Bereich */
.n-chat-container__input {
  padding: var(--nscale-space-4, 1rem);
  border-top: 1px solid var(--nscale-border-color, #e2e8f0);
  background-color: var(--nscale-surface-color, #f8fafc);
}

/* Dialog für Quellen */
.n-chat-container__dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.n-chat-container__dialog {
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  background-color: var(--nscale-body-bg, #ffffff);
  border-radius: var(--nscale-border-radius-lg, 0.75rem);
  box-shadow: var(
    --nscale-shadow-lg,
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05)
  );
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.n-chat-container__dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--nscale-space-4, 1rem);
  border-bottom: 1px solid var(--nscale-border-color, #e2e8f0);
}

.n-chat-container__dialog-title {
  margin: 0;
  font-size: var(--nscale-font-size-lg, 1.125rem);
  font-weight: var(--nscale-font-weight-medium, 500);
  color: var(--nscale-text, #1a202c);
}

.n-chat-container__dialog-controls {
  display: flex;
  align-items: center;
  gap: var(--nscale-space-3, 0.75rem);
}

.n-chat-container__sources-count {
  font-size: var(--nscale-font-size-sm, 0.875rem);
  color: var(--nscale-text-secondary, #64748b);
}

.n-chat-container__dialog-close {
  background: transparent;
  border: none;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--nscale-border-radius-md, 0.5rem);
  cursor: pointer;
}

.n-chat-container__dialog-close:hover {
  background-color: var(--nscale-hover-bg, rgba(0, 0, 0, 0.05));
}

.n-chat-container__dialog-close-icon {
  font-size: 24px;
  line-height: 1;
}

.n-chat-container__dialog-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--nscale-space-3, 0.75rem);
  padding: var(--nscale-space-3, 0.75rem) var(--nscale-space-4, 1rem);
  border-bottom: 1px solid var(--nscale-border-color, #e2e8f0);
  background-color: var(--nscale-surface-color-light, #f8fafc);
}

.n-chat-container__toolbar-group {
  display: flex;
  align-items: center;
  gap: var(--nscale-space-2, 0.5rem);
}

.n-chat-container__toolbar-label {
  font-size: var(--nscale-font-size-sm, 0.875rem);
  color: var(--nscale-text-secondary, #64748b);
  white-space: nowrap;
}

.n-chat-container__toolbar-select,
.n-chat-container__toolbar-input {
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--nscale-border-color, #e2e8f0);
  border-radius: var(--nscale-border-radius-sm, 0.25rem);
  font-size: var(--nscale-font-size-sm, 0.875rem);
  background-color: var(--nscale-body-bg, #ffffff);
}

.n-chat-container__toolbar-input {
  width: 160px;
}

.n-chat-container__toolbar-range {
  width: 100px;
}

.n-chat-container__toolbar-value {
  font-size: var(--nscale-font-size-sm, 0.875rem);
  color: var(--nscale-text-secondary, #64748b);
  white-space: nowrap;
  min-width: 60px;
}

.n-chat-container__dialog-content {
  padding: var(--nscale-space-4, 1rem);
  overflow-y: auto;
  max-height: 60vh;
}

.n-chat-container__sources-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--nscale-space-4, 1rem);
}

.n-chat-container__source-item {
  background-color: var(--nscale-surface-color, #f8fafc);
  border: 1px solid var(--nscale-border-color, #e2e8f0);
  border-radius: var(--nscale-border-radius-md, 0.5rem);
  padding: var(--nscale-space-3, 0.75rem);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
  margin-bottom: var(--nscale-space-3, 0.75rem);
}

.n-chat-container__source-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--nscale-shadow-sm, 0 1px 2px 0 rgba(0, 0, 0, 0.05));
}

.n-chat-container__source-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--nscale-space-2, 0.5rem);
}

.n-chat-container__source-title {
  margin: 0;
  font-size: var(--nscale-font-size-md, 1rem);
  font-weight: var(--nscale-font-weight-medium, 500);
  color: var(--nscale-text, #1a202c);
  flex: 1;
}

.n-chat-container__source-page {
  font-size: var(--nscale-font-size-xs, 0.75rem);
  color: var(--nscale-text-tertiary, #94a3b8);
  background-color: var(--nscale-badge-bg, #e2e8f0);
  padding: 0.15rem 0.4rem;
  border-radius: var(--nscale-border-radius-full, 9999px);
  white-space: nowrap;
}

.n-chat-container__source-content {
  font-size: var(--nscale-font-size-sm, 0.875rem);
  line-height: var(--nscale-line-height-normal, 1.5);
  margin-bottom: var(--nscale-space-3, 0.75rem);
  color: var(--nscale-text, #1a202c);
  max-height: 200px;
  overflow-y: auto;
  background-color: var(--nscale-body-bg, #ffffff);
  padding: var(--nscale-space-2, 0.5rem);
  border-radius: var(--nscale-border-radius-sm, 0.25rem);
  border: 1px solid var(--nscale-border-color-light, #f1f5f9);
}

.n-chat-container__source-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.n-chat-container__source-relevance {
  font-size: var(--nscale-font-size-xs, 0.75rem);
  color: var(--nscale-text-tertiary, #94a3b8);
  display: flex;
  align-items: center;
}

.n-chat-container__source-button {
  background: transparent;
  border: none;
  font-size: var(--nscale-font-size-sm, 0.875rem);
  color: var(--nscale-text-tertiary, #94a3b8);
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: var(--nscale-border-radius-sm, 0.25rem);
  transition:
    color 0.2s ease,
    background-color 0.2s ease;
}

.n-chat-container__source-button:hover {
  background-color: var(--nscale-hover-bg, rgba(0, 0, 0, 0.05));
  color: var(--nscale-text-secondary, #64748b);
}

.n-chat-container__sources-empty {
  text-align: center;
  padding: var(--nscale-space-6, 1.5rem);
  color: var(--nscale-text-secondary, #64748b);
}

/* Touch-Gesten-Hinweise */
.n-chat-container__touch-hints {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  animation: fadeIn 0.3s ease;
}

.n-chat-container__touch-hints-content {
  background-color: var(--nscale-body-bg, #ffffff);
  border-radius: var(--nscale-border-radius-lg, 0.75rem);
  box-shadow: var(
    --nscale-shadow-lg,
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05)
  );
  padding: var(--nscale-space-4, 1rem);
  max-width: 90%;
  width: 300px;
}

.n-chat-container__touch-hints-title {
  margin: 0 0 var(--nscale-space-3, 0.75rem);
  font-size: var(--nscale-font-size-lg, 1.125rem);
  font-weight: var(--nscale-font-weight-medium, 500);
  color: var(--nscale-text, #1a202c);
  text-align: center;
}

.n-chat-container__touch-hints-list {
  list-style-type: none;
  padding: 0;
  margin: 0 0 var(--nscale-space-4, 1rem);
}

.n-chat-container__touch-hints-list li {
  padding: var(--nscale-space-2, 0.5rem) 0;
  border-bottom: 1px solid var(--nscale-border-color-light, #f1f5f9);
  color: var(--nscale-text-secondary, #64748b);
  font-size: var(--nscale-font-size-sm, 0.875rem);
}

.n-chat-container__touch-hints-close {
  display: block;
  width: 100%;
  padding: var(--nscale-space-2, 0.5rem);
  background-color: var(--nscale-primary-color, #3182ce);
  color: white;
  border: none;
  border-radius: var(--nscale-border-radius-md, 0.5rem);
  font-weight: var(--nscale-font-weight-medium, 500);
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.n-chat-container__touch-hints-close:hover {
  background-color: var(--nscale-primary-color-dark, #2c5282);
}

/* Touch-aktiv Styles */
.v-touch-active {
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Responsive Anpassungen */
@media (max-width: 768px) {
  .n-chat-container__header,
  .n-chat-container__input {
    padding: var(--nscale-space-3, 0.75rem);
  }

  .n-chat-container__title {
    font-size: var(--nscale-font-size-base, 1rem);
  }

  .n-chat-container__action-btn {
    width: 28px;
    height: 28px;
  }

  /* Vergrößern der Touchflächen für mobile Geräte */
  .n-chat-container__action-btn,
  .n-chat-container__source-button,
  .n-chat-container__dialog-close {
    min-width: 44px;
    min-height: 44px;
  }

  .n-chat-container__dialog {
    width: 100%;
    max-width: 100%;
    height: 100%;
    max-height: 100%;
    border-radius: 0;
  }
}

/* Dunkles Theme Unterstützung */
@media (prefers-color-scheme: dark) {
  .n-chat-container {
    background-color: var(--nscale-dark-body-bg, #121212);
  }

  .n-chat-container__header {
    background-color: var(--nscale-dark-surface-color, #1a1a1a);
    border-color: var(--nscale-dark-border-color, #333);
  }

  .n-chat-container__title {
    color: var(--nscale-dark-text, #e2e8f0);
  }

  .n-chat-container__archive-badge {
    color: var(--nscale-dark-text-tertiary, #94a3b8);
  }

  .n-chat-container__input {
    background-color: var(--nscale-dark-surface-color, #1a1a1a);
    border-color: var(--nscale-dark-border-color, #333);
  }

  .n-chat-container__action-btn {
    border-color: var(--nscale-dark-border-color, #444);
  }

  .n-chat-container__dialog {
    background-color: var(--nscale-dark-body-bg, #121212);
  }

  .n-chat-container__dialog-header {
    border-color: var(--nscale-dark-border-color, #333);
  }

  .n-chat-container__dialog-title {
    color: var(--nscale-dark-text, #e2e8f0);
  }

  .n-chat-container__dialog-toolbar {
    background-color: var(--nscale-dark-surface-color-light, #222);
    border-color: var(--nscale-dark-border-color, #333);
  }

  .n-chat-container__toolbar-select,
  .n-chat-container__toolbar-input {
    background-color: var(--nscale-dark-body-bg, #121212);
    border-color: var(--nscale-dark-border-color, #333);
    color: var(--nscale-dark-text, #e2e8f0);
  }

  .n-chat-container__toolbar-label,
  .n-chat-container__toolbar-value,
  .n-chat-container__sources-count {
    color: var(--nscale-dark-text-secondary, #94a3b8);
  }

  .n-chat-container__source-item {
    background-color: var(--nscale-dark-surface-color, #1a1a1a);
    border-color: var(--nscale-dark-border-color, #333);
  }

  .n-chat-container__source-item:hover {
    box-shadow: var(--nscale-dark-shadow-sm, 0 1px 2px 0 rgba(0, 0, 0, 0.2));
  }

  .n-chat-container__source-title {
    color: var(--nscale-dark-text, #e2e8f0);
  }

  .n-chat-container__source-page {
    background-color: var(--nscale-dark-badge-bg, #333);
    color: var(--nscale-dark-text-tertiary, #94a3b8);
  }

  .n-chat-container__source-content {
    color: var(--nscale-dark-text, #e2e8f0);
    background-color: var(--nscale-dark-body-bg, #121212);
    border-color: var(--nscale-dark-border-color-light, #2a2a2a);
  }

  .n-chat-container__source-button:hover {
    background-color: var(--nscale-dark-hover-bg, rgba(255, 255, 255, 0.05));
    color: var(--nscale-dark-text-secondary, #cbd5e1);
  }

  /* Dark mode für Touch-Hinweise */
  .n-chat-container__touch-hints-content {
    background-color: var(--nscale-dark-body-bg, #121212);
  }

  .n-chat-container__touch-hints-title {
    color: var(--nscale-dark-text, #e2e8f0);
  }

  .n-chat-container__touch-hints-list li {
    color: var(--nscale-dark-text-secondary, #94a3b8);
    border-color: var(--nscale-dark-border-color, #333);
  }

  .n-chat-container__touch-hints-close {
    background-color: var(--nscale-dark-primary-color, #4299e1);
  }

  .n-chat-container__touch-hints-close:hover {
    background-color: var(--nscale-dark-primary-color-dark, #3182ce);
  }
}
</style>
