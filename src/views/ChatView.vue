<template>
  <div
    class="n-chat-view"
    :class="{
      'n-chat-view--mobile-sidebar': isMobileSidebarOpen,
      'n-chat-view--sidebar-collapsed': isSidebarCollapsed,
      'n-chat-view--debug': true, /* Always add debug class */
    }"
    style="position: relative; min-height: 100vh; z-index: 1;"
  >
    <!-- Sidebar mit Sitzungsverwaltung -->
    <div
      class="n-chat-sidebar"
      ref="sidebar"
      :class="{ 'n-chat-sidebar--collapsed': isSidebarCollapsed }"
      :data-collapsed="isSidebarCollapsed"
    >
      <div class="n-chat-sidebar__header">
        <h2 class="n-chat-sidebar__title">Unterhaltungen</h2>

        <div class="n-chat-sidebar__actions">
          <button
            class="n-chat-sidebar__action-btn n-chat-sidebar__create-btn"
            @click="handleCreateSession"
            aria-label="Neue Unterhaltung erstellen"
            title="Neue Unterhaltung"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>

          <button
            class="n-chat-sidebar__action-btn n-chat-sidebar__toggle-btn"
            @click="toggleSidebar"
            aria-label="Sidebar umschalten"
            title="Sidebar umschalten"
          >
            <svg
              v-if="isSidebarCollapsed"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="13 17 18 12 13 7"></polyline>
              <polyline points="6 17 11 12 6 7"></polyline>
            </svg>
            <svg
              v-else
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="11 17 6 12 11 7"></polyline>
              <polyline points="18 17 13 12 18 7"></polyline>
            </svg>
          </button>
        </div>
      </div>

      <!-- SessionList Komponente -->
      <SessionList
        :sessions="sortedSessions"
        :activeSessionId="currentSessionId"
        :isLoading="isLoadingSessions"
        :showCreateButton="true"
        :enableDragAndDrop="true"
        :enableSorting="true"
        :enableFiltering="true"
        :enableVirtualScrolling="true"
        :enableTags="true"
        :availableTags="availableTags"
        :enableCategories="true"
        :availableCategories="availableCategories"
        emptyMessage="Noch keine Unterhaltungen vorhanden. Starten Sie eine neue Unterhaltung."
        createButtonText="Neue Unterhaltung"
        @select="handleSessionSelect"
        @delete="handleDeleteSession"
        @rename="handleRenameSession"
        @pin="handlePinSession"
        @create="handleCreateSession"
        @reorder="handleReorderSessions"
        @archive="handleArchiveSession"
        @tag="handleTagSession"
        @untag="handleUntagSession"
        @categorize="handleCategorizeSession"
        @bulk-action="handleBulkAction"
      />

      <!-- Sidebar-Footer mit Benutzerinformationen -->
      <div class="n-chat-sidebar__footer">
        <div class="n-chat-sidebar__user-info">
          <div class="n-chat-sidebar__user-avatar">
            <img
              v-if="user?.avatarUrl"
              :src="user.avatarUrl"
              alt="Benutzeravatar"
            />
            <div v-else class="n-chat-sidebar__user-initials">
              {{ userInitials }}
            </div>
          </div>
          <div class="n-chat-sidebar__user-details">
            <div class="n-chat-sidebar__user-name">
              {{ user?.displayName || user?.username || "Benutzer" }}
            </div>
            <div class="n-chat-sidebar__user-role">{{ userRoleLabel }}</div>
          </div>
        </div>

        <button
          class="n-chat-sidebar__settings-btn"
          aria-label="Einstellungen öffnen"
          @click="openSettings"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="3"></circle>
            <path
              d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
            ></path>
          </svg>
        </button>
      </div>
    </div>

    <!-- Mobile Overlay -->
    <div
      v-if="isMobileSidebarOpen"
      class="n-chat-mobile-overlay"
      @click="closeMobileSidebar"
      aria-hidden="true"
    ></div>

    <!-- Mobile Sidebar Toggle -->
    <button
      v-if="isMobile && !isMobileSidebarOpen"
      class="n-chat-mobile-toggle"
      @click="openMobileSidebar"
      aria-label="Sitzungen anzeigen"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
      </svg>
    </button>

    <!-- Sidebar Toggle Button für eingeklappte Sidebar -->
    <button
      v-if="!isMobile && isSidebarCollapsed"
      class="n-chat-sidebar-toggle"
      @click="toggleSidebar"
      aria-label="Sidebar aufklappen"
      title="Sidebar aufklappen"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polyline points="13 17 18 12 13 7"></polyline>
        <polyline points="6 17 11 12 6 7"></polyline>
      </svg>
    </button>

    <!-- Haupt-Chat-Bereich -->
    <div class="n-chat-main">
      <!-- Chat-Header mit Sitzungsinformationen und Aktionen -->
      <div class="n-chat-header">
        <div class="n-chat-header__info">
          <h2 class="n-chat-header__title">
            {{ currentSession?.title || "Neue Unterhaltung" }}
          </h2>
          <div v-if="currentSession?.tags?.length" class="n-chat-header__tags">
            <div
              v-for="tag in currentSession.tags"
              :key="tag.id"
              class="n-chat-header__tag"
              :style="{
                backgroundColor: tag.color ? tag.color + '20' : '#71809620',
              }"
            >
              {{ tag.name }}
            </div>
          </div>
        </div>

        <div class="n-chat-header__actions">
          <button
            v-if="currentSessionId"
            class="n-chat-header__action-btn"
            @click="toggleSessionInfo"
            aria-label="Sitzungsinformationen anzeigen"
            title="Sitzungsinfo"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </button>

          <button
            v-if="currentSessionId && isStreaming"
            class="n-chat-header__action-btn n-chat-header__action-btn--stop"
            @click="cancelStreaming"
            aria-label="Antwort abbrechen"
            title="Antwort abbrechen"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            </svg>
          </button>
        </div>
      </div>

      <!-- Debug Panel -->
      <div style="position: fixed; top: 10px; right: 10px; background: rgba(0,0,0,0.9); color: white; padding: 10px; z-index: 9999; font-size: 12px; width: 300px; max-height: 400px; overflow-y: auto;">
        <h4 style="margin: 0 0 10px 0;">Store Debug</h4>
        <div>SessionID: {{ currentSessionId }}</div>
        <div>Messages Count: {{ currentMessages?.length }}</div>
        <div>isStreaming: {{ isStreaming }}</div>
        <div>Store Messages:</div>
        <div v-if="sessionsStore.messages && currentSessionId">
          <div>Session {{ currentSessionId }} messages: {{ sessionsStore.messages[currentSessionId]?.length || 0 }}</div>
          <div v-for="(msg, idx) in (sessionsStore.messages[currentSessionId] || []).slice(0, 3)" :key="`store-${idx}`" style="margin-left: 10px; font-size: 11px;">
            {{ idx }}: [{{ msg.role }}] {{ msg.content.substring(0, 30) }}... ({{ msg.id }})
          </div>
        </div>
      </div>
      
      <!-- Message List with additional key for forced updates -->
      <MessageList
        ref="messageListRef"
        :messages="currentMessages"
        :isLoading="isLoadingMessages"
        :isStreaming="isStreaming"
        :showMessageActions="true"
        :virtualized="false"
        :showScrollToBottomButton="true"
        :key="`message-list-${currentSessionId}`"
        @feedback="handleMessageFeedback"
        @view-sources="handleViewSources"
        @view-explanation="handleViewExplanation"
        @retry="handleRetryMessage"
        @delete="handleDeleteMessage"
        @load-more="handleLoadMoreMessages"
      />

      <!-- Message Input -->
      <MessageInput
        v-model="messageInput"
        :placeholder="inputPlaceholder"
        :disabled="isInputDisabled"
        :showAttachButton="true"
        :showEmojiPicker="false"
        :showSendButton="true"
        :isLoading="isSendingMessage"
        :isStreaming="isStreaming"
        :autoResize="true"
        :maxHeight="200"
        @submit="sendMessage"
        @stop-stream="cancelStreaming"
        @attach="handleAttachFile"
        @focus="handleInputFocus"
      />
    </div>

    <!-- Informationen zur aktuellen Sitzung -->
    <div
      v-if="showSessionInfo"
      class="n-chat-session-info"
      :class="{ 'n-chat-session-info--visible': showSessionInfo }"
      aria-labelledby="session-info-title"
      aria-modal="true"
      role="dialog"
    >
      <div class="n-chat-session-info__header">
        <h3 id="session-info-title" class="n-chat-session-info__title">
          Sitzungsinformationen
        </h3>
        <button
          class="n-chat-session-info__close"
          @click="toggleSessionInfo"
          aria-label="Sitzungsinformationen schließen"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="n-chat-session-info__content" v-if="currentSession">
        <div class="n-chat-session-info__section">
          <h4 class="n-chat-session-info__section-title">Details</h4>

          <div class="n-chat-session-info__detail">
            <div class="n-chat-session-info__detail-label">Erstellt</div>
            <div class="n-chat-session-info__detail-value">
              {{ formatDate(currentSession.createdAt) }}
            </div>
          </div>

          <div class="n-chat-session-info__detail">
            <div class="n-chat-session-info__detail-label">
              Letzte Aktualisierung
            </div>
            <div class="n-chat-session-info__detail-value">
              {{ formatDate(currentSession.updatedAt) }}
            </div>
          </div>

          <div class="n-chat-session-info__detail">
            <div class="n-chat-session-info__detail-label">Nachrichten</div>
            <div class="n-chat-session-info__detail-value">
              {{ currentMessageCount }}
            </div>
          </div>

          <div
            class="n-chat-session-info__detail"
            v-if="currentSession.category"
          >
            <div class="n-chat-session-info__detail-label">Kategorie</div>
            <div class="n-chat-session-info__detail-value">
              {{ currentSession.category.name }}
            </div>
          </div>
        </div>

        <div
          class="n-chat-session-info__section"
          v-if="currentSession.tags && currentSession.tags.length > 0"
        >
          <h4 class="n-chat-session-info__section-title">Tags</h4>

          <div class="n-chat-session-info__tags">
            <div
              v-for="tag in currentSession.tags"
              :key="tag.id"
              class="n-chat-session-info__tag"
              :style="{
                backgroundColor: tag.color ? tag.color + '20' : '#71809620',
                color: tag.color,
              }"
            >
              {{ tag.name }}
            </div>
          </div>
        </div>

        <div class="n-chat-session-info__actions">
          <button
            class="n-chat-session-info__action n-chat-session-info__action--rename"
            @click="handleRenameSession(currentSession.id)"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path
                d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
              ></path>
              <path
                d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
              ></path>
            </svg>
            <span>Umbenennen</span>
          </button>

          <button
            class="n-chat-session-info__action"
            @click="
              handlePinSession(currentSession.id, !currentSession.isPinned)
            "
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span>{{
              currentSession.isPinned ? "Anheften aufheben" : "Anheften"
            }}</span>
          </button>

          <button
            class="n-chat-session-info__action"
            @click="
              handleArchiveSession(
                currentSession.id,
                !currentSession.isArchived,
              )
            "
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect
                x="2"
                y="2"
                width="20"
                height="20"
                rx="2.18"
                ry="2.18"
              ></rect>
              <line x1="16" y1="2" x2="16" y2="22"></line>
              <line x1="8" y1="2" x2="8" y2="22"></line>
              <line x1="2" y1="12" x2="22" y2="12"></line>
            </svg>
            <span>{{
              currentSession.isArchived
                ? "Aus Archiv wiederherstellen"
                : "Archivieren"
            }}</span>
          </button>

          <button
            class="n-chat-session-info__action n-chat-session-info__action--export"
            @click="exportSession(currentSession.id)"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Exportieren</span>
          </button>

          <button
            class="n-chat-session-info__action n-chat-session-info__action--danger"
            @click="handleDeleteSession(currentSession.id)"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="3 6 5 6 21 6"></polyline>
              <path
                d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
              ></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
            <span>Löschen</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Quellen-Modal -->
    <div
      v-if="showSourcesModal"
      class="n-chat-modal n-chat-sources-modal"
      @click.self="closeSourcesModal"
      aria-labelledby="sources-modal-title"
      aria-modal="true"
      role="dialog"
    >
      <div class="n-chat-modal__content">
        <div class="n-chat-modal__header">
          <h3 id="sources-modal-title" class="n-chat-modal__title">Quellen</h3>
          <button
            class="n-chat-modal__close"
            @click="closeSourcesModal"
            aria-label="Quellen schließen"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="n-chat-modal__body">
          <div
            v-if="
              !currentSourceReferences || currentSourceReferences.length === 0
            "
            class="n-chat-modal__empty"
          >
            Keine Quellen für diese Nachricht verfügbar.
          </div>

          <div v-else class="n-chat-sources-list">
            <div
              v-for="(source, index) in currentSourceReferences"
              :key="source.id || index"
              class="n-chat-source-item"
            >
              <div class="n-chat-source-item__header">
                <h4 class="n-chat-source-item__title">
                  {{ source.title || `Quelle ${index + 1}` }}
                </h4>
                <div v-if="source.source" class="n-chat-source-item__origin">
                  {{ source.source }}
                </div>
              </div>

              <div class="n-chat-source-item__content" v-if="source.content">
                {{ source.content }}
              </div>

              <div
                class="n-chat-source-item__footer"
                v-if="source.url || source.pageNumber"
              >
                <a
                  v-if="source.url"
                  :href="source.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="n-chat-source-item__link"
                >
                  Quelle öffnen
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path
                      d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
                    ></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                </a>

                <div v-if="source.pageNumber" class="n-chat-source-item__page">
                  Seite {{ source.pageNumber }}
                </div>

                <div
                  v-if="source.relevanceScore"
                  class="n-chat-source-item__relevance"
                >
                  Relevanz: {{ (source.relevanceScore * 100).toFixed(0) }}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
<<<<<<< HEAD
    
    <!-- Delete Confirmation Dialog -->
    <div v-if="showDeleteConfirm" class="n-chat-delete-confirm-overlay" @click.self="cancelDeleteSession">
      <div class="n-chat-delete-confirm-dialog">
        <div class="n-chat-delete-confirm-header">
          <h3 class="n-chat-delete-confirm-title">Unterhaltung löschen</h3>
        </div>
        <div class="n-chat-delete-confirm-body">
          <p>
            Möchten Sie die Unterhaltung 
            <strong>"{{ sessions.find(s => s.id === sessionToDelete)?.title || 'Unterhaltung' }}"</strong>
            wirklich löschen?
          </p>
          <p class="n-chat-delete-confirm-warning">
            Diese Aktion kann nicht rückgängig gemacht werden.
          </p>
        </div>
        <div class="n-chat-delete-confirm-footer">
          <button
            class="n-chat-delete-confirm-btn n-chat-delete-confirm-btn--cancel"
            @click="cancelDeleteSession"
          >
            Abbrechen
          </button>
          <button
            class="n-chat-delete-confirm-btn n-chat-delete-confirm-btn--danger"
            @click="confirmDeleteSession"
          >
            Löschen
          </button>
        </div>
      </div>
    </div>
=======
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
  </div>
  
  <!-- Streaming Debug Panel for Development -->
  <!-- StreamingDebugPanel removed - component not found -->
  <!-- <StreamingDebugPanel v-if="isDevelopment" /> -->
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  watch,
  nextTick,
  onBeforeUnmount,
  onErrorCaptured,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import { useSessionsStore } from "@/stores/sessions";
import { useAuthStore } from "@/stores/auth";
import { useUIStore } from "@/stores/ui";
import { useUIDiagnostics } from "@/utils/uiDiagnostics";
import { authFixService } from "@/services/auth/AuthFixService";
import type {
  ChatSession,
  ChatMessage,
  SourceReference,
  SessionTag,
  SessionCategory,
} from "@/types/session";
import MessageList from "@/components/chat/MessageList.vue";
import MessageInput from "@/components/chat/MessageInput.vue";
import SessionList from "@/components/session/SessionList.vue";
// import StreamingDebugPanel from "@/components/debug/StreamingDebugPanel.vue"; // Component not found

// Diagnostics Setup
const { captureError, trackDataLoad, trackLifecycle, exportToConsole } =
  useUIDiagnostics("ChatView");

// Router und Stores
const route = useRoute();
const router = useRouter();
const sessionsStore = useSessionsStore();
const authStore = useAuthStore();
const uiStore = useUIStore();

// Reaktive Zustandsvariablen
const messageInput = ref("");
const messageListRef = ref<InstanceType<typeof MessageList> | null>(null);
const sidebar = ref<HTMLElement | null>(null);
const isSidebarCollapsed = ref(
  localStorage.getItem("sidebarCollapsed") === "true",
);
const isMobile = ref(window.innerWidth < 768);
const isMobileSidebarOpen = ref(false);
const showSessionInfo = ref(false);
const showSourcesModal = ref(false);
const currentSourceReferences = ref<SourceReference[]>([]);
const currentSourceMessageId = ref<string | null>(null);
<<<<<<< HEAD
const showDeleteConfirm = ref(false);
const sessionToDelete = ref<string | null>(null);
=======
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da

// Computed Properties
const user = computed<any>(() => authStore.user);

const userInitials = computed<string>(() => {
  if (!user.value) return "?";

  if (user.value.displayName) {
    return user.value.displayName
      .split(" ")
      .map((name: string) => name.charAt(0))
      .join("")
      .substr(0, 2)
      .toUpperCase();
  }

  return user.value.username.substring(0, 2).toUpperCase();
});

const userRoleLabel = computed<string>(() => {
  if (!user.value) return "";

  if (user.value.role === "admin") return "Administrator";
  if (user.value.role === "support") return "Support";
  if (user.value.role === "user") return "Benutzer";

  return user.value.role || "";
});

// Sessions store state
const sessions = computed<ChatSession[]>(() => sessionsStore.sessions);
const currentSessionId = computed<string | null>(
  () => sessionsStore.currentSessionId,
);
const currentSession = computed<ChatSession | null>(
  () => sessionsStore.currentSession,
);
const currentMessages = computed<ChatMessage[]>(
  () => sessionsStore.allCurrentMessages,
);
const isStreaming = computed<boolean>(() => sessionsStore.isStreaming);
const isLoadingMessages = computed<boolean>(() => sessionsStore.isLoading);
const isSendingMessage = computed<boolean>(() => isStreaming.value);
const isLoadingSessions = computed<boolean>(() => sessionsStore.isLoading);
const availableTags = computed<SessionTag[]>(() => sessionsStore.availableTags);
const availableCategories = computed<SessionCategory[]>(
  () => sessionsStore.availableCategories,
);
const isAuthenticated = computed<boolean>(() => authStore.isAuthenticated);
const isDevelopment = computed<boolean>(() => import.meta.env.DEV);

// Sortierte Sessions basierend auf dem Store-Getter
const sortedSessions = computed<ChatSession[]>(
  () => sessionsStore.sortedSessions,
);

// Anzahl der Nachrichten in der aktuellen Sitzung
const currentMessageCount = computed<number>(() => {
  const sessionId = currentSessionId.value;
  if (!sessionId) return 0;

  return (sessionsStore.messages[sessionId] || []).length;
});

// Platzhaltertext für das Eingabefeld
const inputPlaceholder = computed<string>(() => {
  if (isStreaming.value) return "Warte auf Antwort...";
  if (!currentSessionId.value) return "Starten Sie eine neue Unterhaltung...";
  return "Nachricht eingeben...";
});

// Prüfen, ob das Eingabefeld deaktiviert werden sollte
const isInputDisabled = computed<boolean>(() => {
  return (
    isStreaming.value || isLoadingMessages.value || !currentSessionId.value
  );
});

// Event-Handler
async function handleSessionSelect(sessionId: string) {
  // Wenn bereits die aktive Session, nichts tun
  if (sessionId === currentSessionId.value) return;

  // Falls auf Mobilgeräten, die Seitenleiste schließen
  if (isMobile.value) {
    closeMobileSidebar();
  }

  // Clear old messages immediately to prevent flash of old content
  messageInput.value = '';
  
  // Navigate first to update the URL
  await router.push(`/chat/${sessionId}`);
  
  // Then set the current session which will trigger message loading
  // This ensures the route param is already updated when the store reacts
  await sessionsStore.setCurrentSession(sessionId);
}

async function handleCreateSession() {
  try {
    // Neue Session erstellen
    const newSessionId = await sessionsStore.createSession("Neue Unterhaltung");

    // Zur neuen Session navigieren
    router.push(`/chat/${newSessionId}`);

    // Falls auf Mobilgeräten, die Seitenleiste schließen
    if (isMobile.value) {
      closeMobileSidebar();
    }

    // Fokus auf Eingabefeld setzen
    nextTick(() => {
      const inputElement = document.querySelector(".n-message-input__textarea");
      if (inputElement instanceof HTMLTextAreaElement) {
        inputElement.focus();
      }
    });
  } catch (error) {
    console.error("Fehler beim Erstellen einer neuen Session:", error);
    uiStore.showError("Fehler beim Erstellen einer neuen Unterhaltung");
  }
}

function handleRenameSession(sessionId: string, newTitle?: string) {
  if (!newTitle) {
    // Dialog öffnen für Eingabe des neuen Namens
    newTitle = prompt(
      "Neuer Name für die Unterhaltung:",
      currentSession.value?.title,
    );
    if (!newTitle) return; // Abgebrochen
  }

  sessionsStore.updateSessionTitle(sessionId, newTitle).catch((error) => {
    console.error("Fehler beim Umbenennen der Session:", error);
    uiStore.showError("Fehler beim Umbenennen der Unterhaltung");
  });
}

function handleDeleteSession(sessionId: string) {
<<<<<<< HEAD
  // Store the session ID to delete and show confirmation dialog
  sessionToDelete.value = sessionId;
  showDeleteConfirm.value = true;
}

function cancelDeleteSession() {
  sessionToDelete.value = null;
  showDeleteConfirm.value = false;
}

async function confirmDeleteSession() {
  if (!sessionToDelete.value) return;

  const sessionId = sessionToDelete.value;
  
  try {
    await sessionsStore.deleteSession(sessionId);
    
    // Wenn die gelöschte Session die aktuelle ist, zur ersten verfügbaren wechseln
    if (sessionId === currentSessionId.value) {
      const remainingSessions = sessions.value;

      if (remainingSessions.length > 0) {
        router.push(`/chat/${remainingSessions[0].id}`);
      } else {
        // Keine Sessions mehr, neue erstellen
        handleCreateSession();
      }
    }
    
    // Show success message
    uiStore.showSuccess("Unterhaltung wurde gelöscht");
  } catch (error) {
    console.error("Fehler beim Löschen der Session:", error);
    uiStore.showError("Fehler beim Löschen der Unterhaltung");
  } finally {
    // Hide confirmation dialog
    showDeleteConfirm.value = false;
    sessionToDelete.value = null;
  }
=======
  // SessionList already shows a confirmation dialog, so we don't need another one
  sessionsStore
    .deleteSession(sessionId)
    .then(() => {
      // Wenn die gelöschte Session die aktuelle ist, zur ersten verfügbaren wechseln
      if (sessionId === currentSessionId.value) {
        const remainingSessions = sessions.value;

        if (remainingSessions.length > 0) {
          router.push(`/chat/${remainingSessions[0].id}`);
        } else {
          // Keine Sessions mehr, neue erstellen
          handleCreateSession();
        }
      }
    })
    .catch((error) => {
      console.error("Fehler beim Löschen der Session:", error);
      uiStore.showError("Fehler beim Löschen der Unterhaltung");
    });
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
}

function handlePinSession(sessionId: string, pinned: boolean) {
  sessionsStore.togglePinSession(sessionId).catch((error) => {
    console.error("Fehler beim Anheften/Lösen der Session:", error);
    uiStore.showError(
      `Fehler beim ${pinned ? "Anheften" : "Lösen"} der Unterhaltung`,
    );
  });
}

function handleArchiveSession(sessionId: string, archived: boolean) {
  sessionsStore.toggleArchiveSession(sessionId, archived).catch((error) => {
    console.error(
      "Fehler beim Archivieren/Wiederherstellen der Session:",
      error,
    );
    uiStore.showError(
      `Fehler beim ${archived ? "Archivieren" : "Wiederherstellen"} der Unterhaltung`,
    );
  });
}

function handleTagSession(sessionId: string, tagId: string) {
  sessionsStore.addTagToSession(sessionId, tagId).catch((error) => {
    console.error("Fehler beim Hinzufügen des Tags:", error);
    uiStore.showError("Fehler beim Hinzufügen des Tags");
  });
}

function handleUntagSession(sessionId: string, tagId: string) {
  sessionsStore.removeTagFromSession(sessionId, tagId).catch((error) => {
    console.error("Fehler beim Entfernen des Tags:", error);
    uiStore.showError("Fehler beim Entfernen des Tags");
  });
}

function handleCategorizeSession(sessionId: string, categoryId: string) {
  sessionsStore.setCategoryForSession(sessionId, categoryId).catch((error) => {
    console.error("Fehler beim Setzen der Kategorie:", error);
    uiStore.showError("Fehler beim Setzen der Kategorie");
  });
}

function handleReorderSessions(reorderedSessions: ChatSession[]) {
  // In einer vollständigen Implementierung würde hier die Reihenfolge der Sessions gespeichert werden
  // Für dieses Beispiel wird die Aktion nur geloggt
  console.log("Sessions neu angeordnet:", reorderedSessions);
}

function handleBulkAction(
  action: string,
  sessionIds: string[],
  data?: any,
): void {
  switch (action) {
    case "delete":
      // SessionList already shows a confirmation dialog, so we don't need another one
      sessionIds.forEach((id: string) => {
        sessionsStore.deleteSession(id).catch((error: Error) => {
          console.error(`Fehler beim Löschen der Session ${id}:`, error);
        });
      });
      break;

    case "archive":
      sessionIds.forEach((id: string) => {
        sessionsStore.toggleArchiveSession(id, true).catch((error: Error) => {
          console.error(`Fehler beim Archivieren der Session ${id}:`, error);
        });
      });
      break;

    case "tag":
      const tagId: string =
        data || prompt("Welchen Tag möchten Sie hinzufügen?");
      if (!tagId) return;

      sessionIds.forEach((id: string) => {
        sessionsStore.addTagToSession(id, tagId).catch((error: Error) => {
          console.error(`Fehler beim Taggen der Session ${id}:`, error);
        });
      });
      break;

    case "categorize":
      const categoryId: string =
        data || prompt("Welche Kategorie möchten Sie setzen?");
      if (!categoryId) return;

      sessionIds.forEach((id: string) => {
        sessionsStore
          .setCategoryForSession(id, categoryId)
          .catch((error: Error) => {
            console.error(
              `Fehler beim Kategorisieren der Session ${id}:`,
              error,
            );
          });
      });
      break;
  }
}

function handleDeleteMessage(payload: { messageId: string }) {
  if (!currentSessionId.value) return;

  sessionsStore
    .deleteMessage(currentSessionId.value, payload.messageId)
    .catch((error) => {
      console.error("Fehler beim Löschen der Nachricht:", error);
      uiStore.showError("Fehler beim Löschen der Nachricht");
    });
}

function handleRetryMessage(payload: { messageId: string }) {
  if (!currentSessionId.value) return;

  const message = currentMessages.value.find((m) => m.id === payload.messageId);
  if (!message) return;

  // Wenn es sich um eine Assistenten-Nachricht handelt, die vorherige Benutzernachricht finden
  if (message.role === "assistant") {
    const index = currentMessages.value.findIndex(
      (m) => m.id === payload.messageId,
    );
    if (index > 0 && currentMessages.value[index - 1].role === "user") {
      const userMessage = currentMessages.value[index - 1];
      messageInput.value = userMessage.content;
    }
  } else {
    // Direkt den Inhalt der ausgewählten Nachricht verwenden
    messageInput.value = message.content;
  }

  // Fokus auf das Eingabefeld setzen
  nextTick(() => {
    const inputElement = document.querySelector(".n-message-input__textarea");
    if (inputElement instanceof HTMLTextAreaElement) {
      inputElement.focus();
    }
  });
}

function handleMessageFeedback(payload: {
  messageId: string;
  type: "positive" | "negative";
  feedback?: string;
}): void {
  // In einer vollständigen Implementierung würde hier das Feedback an den Server gesendet werden
  console.log("Feedback für Nachricht:", payload);

  // Erfolgsmeldung anzeigen
  uiStore.showSuccess("Vielen Dank für Ihr Feedback!");
}

function handleViewSources(payload: { messageId: string }): void {
  if (!currentSessionId.value) return;

  // Nachricht finden
  const message = currentMessages.value.find(
<<<<<<< HEAD
    (m: ChatMessage) => m.id === payload.messageId
=======
    (m: ChatMessage) => m.id === payload.messageId,
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
  );
  if (!message) return;

  // Quellen aus den Metadaten extrahieren
  const sources: SourceReference[] = message.metadata?.sourceReferences || [];

  // Quellen anzeigen
  currentSourceReferences.value = sources;
  currentSourceMessageId.value = payload.messageId;
  showSourcesModal.value = true;
}

function closeSourcesModal(): void {
  showSourcesModal.value = false;
  currentSourceReferences.value = [];
  currentSourceMessageId.value = null;
}

function handleViewExplanation(payload: { messageId: string }): void {
  // In einer vollständigen Implementierung würde hier eine Erklärung angefordert werden
  console.log("Erklärung für Nachricht angefordert:", payload);

  // Informationsmeldung anzeigen
  uiStore.showInfo("Diese Funktion ist noch nicht implementiert.");
}

function handleLoadMoreMessages(payload: {
  direction: "up" | "down";
  firstVisibleIndex?: number;
  lastVisibleIndex?: number;
}): void {
  if (!currentSessionId.value) return;

  if (payload.direction === "up") {
    // Ältere Nachrichten laden
    sessionsStore.loadOlderMessages(currentSessionId.value);
  }
}

function handleInputFocus() {
  // Wenn das Eingabefeld fokussiert wird und sich auf einem Mobilgerät befindet,
  // die Sidebar schließen, um mehr Platz für die Eingabe zu schaffen
  if (isMobile.value) {
    closeMobileSidebar();
  }
}

function handleAttachFile(event: Event) {
  // In einer vollständigen Implementierung würde hier das Datei-Upload-Feature implementiert werden
  console.log("Datei anhängen angefordert:", event);

  // Informationsmeldung anzeigen
  uiStore.showInfo("Die Datei-Upload-Funktion ist noch nicht implementiert.");
}

async function sendMessage() {
  const content = messageInput.value.trim();
  if (!content || !currentSessionId.value) return;

  try {
    // Eingabefeld zurücksetzen
    messageInput.value = "";

    // Nachricht senden
    await sessionsStore.sendMessage({
      sessionId: currentSessionId.value,
      content,
    });

    // Zum Ende der Nachrichtenliste scrollen
    nextTick(() => {
      messageListRef.value?.scrollToBottom();
    });
  } catch (error) {
    console.error("Fehler beim Senden der Nachricht:", error);
    uiStore.showError("Fehler beim Senden der Nachricht");
  }
}

function cancelStreaming() {
  if (!isStreaming.value) return;

  // Streaming-Antwort abbrechen
  sessionsStore.cancelStreaming();
}

function toggleSidebar() {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;

  // Präferenz speichern
  localStorage.setItem("sidebarCollapsed", isSidebarCollapsed.value.toString());
}

function openMobileSidebar() {
  isMobileSidebarOpen.value = true;

  // Body-Scrolling verhindern
  document.body.style.overflow = "hidden";
}

function closeMobileSidebar() {
  isMobileSidebarOpen.value = false;

  // Body-Scrolling wiederherstellen
  document.body.style.overflow = "";
}

function toggleSessionInfo() {
  showSessionInfo.value = !showSessionInfo.value;
}

function openSettings() {
  // In einer vollständigen Implementierung würde hier das Einstellungsmenü geöffnet werden
  console.log("Einstellungen öffnen angefordert");

  // Informationsmeldung anzeigen
  uiStore.showInfo("Die Einstellungen sind noch nicht implementiert.");
}

function exportSession(sessionId: string) {
  // In einer vollständigen Implementierung würde hier die Session exportiert werden
  console.log("Session exportieren angefordert:", sessionId);

  try {
    const exportedData = sessionsStore.exportData();

    // Datei zum Download anbieten
    const blob = new Blob([exportedData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-session-${sessionId}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Erfolgsmeldung anzeigen
    uiStore.showSuccess("Die Unterhaltung wurde erfolgreich exportiert!");
  } catch (error) {
    console.error("Fehler beim Exportieren der Session:", error);
    uiStore.showError("Fehler beim Exportieren der Unterhaltung");
  }
}

// Hilfsfunktion zum Formatieren von Datum und Uhrzeit
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("de-DE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch (error) {
    return dateString;
  }
}

// Hilfsfunktion zum Überprüfen der Bildschirmgröße
function checkScreenSize(): void {
  isMobile.value = window.innerWidth < 768;

  // Bei größeren Bildschirmen die mobile Sidebar schließen
  if (!isMobile.value && isMobileSidebarOpen.value) {
    closeMobileSidebar();
  }
}

// Lifecycle-Hooks
onMounted(async () => {
  try {
    trackLifecycle("mounted");

    // Event-Listener für Bildschirmgrößenänderungen hinzufügen
    window.addEventListener("resize", checkScreenSize);

    // Auth status sync first
    authSyncFixed.checkAuthConsistency();

    // Sessions laden mit Fehlerbehandlung
    try {
      trackDataLoad("sessions-sync", "start");
      await sessionsStore.synchronizeSessions();
      trackDataLoad("sessions-sync", "success");
    } catch (syncError) {
      console.warn(
        "Session sync failed, continuing without sessions:",
        syncError,
      );
      trackDataLoad("sessions-sync", "error", { error: syncError });
      captureError(syncError as Error, "mounted");
      // Fahre fort ohne Sessions
    }

    // Session-ID aus der URL auslesen
    const sessionIdFromRoute = route.params.sessionId as string;

    // Prüfen, ob eine Session-ID in der Route vorhanden ist
    if (sessionIdFromRoute) {
      try {
        await sessionsStore.setCurrentSession(sessionIdFromRoute);
      } catch (loadError) {
        console.warn("Failed to load session from route:", loadError);
        captureError(loadError as Error, "mounted");
        // Ignorieren und neue Session erstellen
      }
    } else {
      // Wenn keine Session-ID in der Route, die erste verfügbare verwenden oder eine neue erstellen
      if (sessions.value.length > 0) {
        const firstSessionId = sessions.value[0].id;
        router.push(`/chat/${firstSessionId}`);
      } else {
        // Neue Session erstellen
        await handleCreateSession();
      }
    }
  } catch (error) {
    console.error("Error in ChatView mounted:", error);
    captureError(error as Error, "mounted");
    uiStore.showError("Fehler beim Laden der Chat-Ansicht");
  }
});

onBeforeUnmount(() => {
  // Event-Listener entfernen
  window.removeEventListener("resize", checkScreenSize);

  // Cleanup-Aktionen
  if (isStreaming.value) {
    cancelStreaming();
  }
});

// Error Capture Hook
onErrorCaptured((err, instance, info) => {
  console.error("Error captured in ChatView:", err);
  captureError(err, "render", { instance, info });

  // Prevent the error from propagating
  return false;
});

// URL-Änderungen überwachen
watch(
  () => route.params.sessionId,
  async (newSessionId) => {
    if (newSessionId && newSessionId !== currentSessionId.value) {
      try {
        // Zur neuen Session wechseln
        await sessionsStore.setCurrentSession(newSessionId as string);
      } catch (error) {
        console.error("Error switching session:", error);
        captureError(error as Error, "render");
      }
    }
  },
  { immediate: true },
);

// Expose diagnostics for debugging in development
if (import.meta.env.DEV) {
  window.chatDiagnostics = {
    exportReport: exportToConsole,
    sessionsStore,
    authStore,
    uiStore,
  };
}
</script>

<style scoped>
/* Grundlayout */
.n-chat-view {
  display: grid;
  grid-template-columns: 300px 1fr;
  grid-template-rows: 100%;
  height: 100vh;
  width: 100%;
  overflow: hidden;
  background-color: var(--nscale-background, #ffffff);
  position: relative;
}

.n-chat-view--sidebar-collapsed {
  grid-template-columns: 60px 1fr;
}

/* Sidebar */
.n-chat-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--nscale-sidebar-bg, #f8fafc);
  border-right: 1px solid var(--nscale-border-color, #e2e8f0);
  overflow: hidden;
  transition: width 0.3s ease;
}

.n-chat-sidebar--collapsed {
  width: 60px;
}

.n-chat-sidebar__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--nscale-border-color, #e2e8f0);
  background-color: var(--nscale-sidebar-header-bg, #f1f5f9);
}

.n-chat-sidebar__title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--nscale-text-color, #1a202c);
  margin: 0;
}

.n-chat-sidebar__actions {
  display: flex;
  gap: 0.5rem;
}

.n-chat-sidebar__action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  color: var(--nscale-text-color-secondary, #475569);
  transition: all 0.2s ease;
}

.n-chat-sidebar__action-btn:hover {
  background-color: var(--nscale-hover-bg, rgba(0, 0, 0, 0.05));
  color: var(--nscale-text-color, #1a202c);
}

.n-chat-sidebar__action-btn svg {
  width: 20px;
  height: 20px;
}

.n-chat-sidebar__create-btn {
  color: var(--nscale-primary, #00a550);
}

.n-chat-sidebar__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-top: 1px solid var(--nscale-border-color, #e2e8f0);
  margin-top: auto;
}

.n-chat-sidebar__user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.n-chat-sidebar__user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--nscale-primary-light, #d1fae5);
  color: var(--nscale-primary, #00a550);
  font-weight: 600;
  font-size: 0.875rem;
}

.n-chat-sidebar__user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.n-chat-sidebar__user-details {
  display: flex;
  flex-direction: column;
}

.n-chat-sidebar__user-name {
  font-weight: 500;
  font-size: 0.875rem;
  color: var(--nscale-text-color, #1a202c);
}

.n-chat-sidebar__user-role {
  font-size: 0.75rem;
  color: var(--nscale-text-color-secondary, #475569);
}

.n-chat-sidebar__settings-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  color: var(--nscale-text-color-secondary, #475569);
  transition: all 0.2s ease;
}

.n-chat-sidebar__settings-btn:hover {
  background-color: var(--nscale-hover-bg, rgba(0, 0, 0, 0.05));
  color: var(--nscale-text-color, #1a202c);
}

.n-chat-sidebar__settings-btn svg {
  width: 20px;
  height: 20px;
}

/* Ausblenden bestimmter Elemente in kollabierter Sidebar */
.n-chat-sidebar[data-collapsed="true"] .n-chat-sidebar__title,
.n-chat-sidebar[data-collapsed="true"] .n-chat-sidebar__user-details,
.n-chat-sidebar[data-collapsed="true"] .n-session-list__header {
  display: none;
}

/* Hauptbereich */
.n-chat-main {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background-color: var(--nscale-body-bg, #ffffff);
}

.n-chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--nscale-border-color, #e2e8f0);
  background-color: var(--nscale-header-bg, #ffffff);
}

.n-chat-header__info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.n-chat-header__title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--nscale-text-color, #1a202c);
  margin: 0;
  max-width: 80%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.n-chat-header__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.n-chat-header__tag {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  color: var(--nscale-text-color-secondary, #475569);
  background-color: var(--nscale-tag-bg, #f1f5f9);
}

.n-chat-header__actions {
  display: flex;
  gap: 0.5rem;
}

.n-chat-header__action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  color: var(--nscale-text-color-secondary, #475569);
  transition: all 0.2s ease;
}

.n-chat-header__action-btn:hover {
  background-color: var(--nscale-hover-bg, rgba(0, 0, 0, 0.05));
  color: var(--nscale-text-color, #1a202c);
}

.n-chat-header__action-btn svg {
  width: 20px;
  height: 20px;
}

.n-chat-header__action-btn--stop {
  color: var(--nscale-error, #dc2626);
}

.n-chat-header__action-btn--stop:hover {
  background-color: var(--nscale-error-light, rgba(220, 38, 38, 0.1));
  color: var(--nscale-error, #dc2626);
}

/* Mobile Overlay */
.n-chat-mobile-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 999;
}

.n-chat-mobile-toggle {
  position: fixed;
  top: 1rem;
  left: 1rem;
  width: 40px;
  height: 40px;
  border-radius: 0.5rem;
  background-color: var(--nscale-surface-color, #ffffff);
  border: 1px solid var(--nscale-border-color, #e2e8f0);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  color: var(--nscale-text-color, #1a202c);
  cursor: pointer;
}

.n-chat-mobile-toggle svg {
  width: 24px;
  height: 24px;
}

/* Session-Informationen */
.n-chat-session-info {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 350px;
  background-color: var(--nscale-surface-color, #ffffff);
  border-left: 1px solid var(--nscale-border-color, #e2e8f0);
  box-shadow: -4px 0 12px rgba(0, 0, 0, 0.05);
  z-index: 100;
  transform: translateX(100%);
  transition: transform 0.3s ease;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.n-chat-session-info--visible {
  transform: translateX(0);
}

.n-chat-session-info__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--nscale-border-color, #e2e8f0);
  position: sticky;
  top: 0;
  background-color: var(--nscale-surface-color, #ffffff);
  z-index: 5;
}

.n-chat-session-info__title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--nscale-text-color, #1a202c);
  margin: 0;
}

.n-chat-session-info__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  color: var(--nscale-text-color-secondary, #475569);
  transition: all 0.2s ease;
}

.n-chat-session-info__close:hover {
  background-color: var(--nscale-hover-bg, rgba(0, 0, 0, 0.05));
  color: var(--nscale-text-color, #1a202c);
}

.n-chat-session-info__close svg {
  width: 20px;
  height: 20px;
}

.n-chat-session-info__content {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.n-chat-session-info__section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.n-chat-session-info__section-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--nscale-text-color, #1a202c);
  margin: 0;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid
    var(--nscale-border-color-light, rgba(226, 232, 240, 0.5));
}

.n-chat-session-info__detail {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
}

.n-chat-session-info__detail-label {
  color: var(--nscale-text-color-secondary, #475569);
}

.n-chat-session-info__detail-value {
  color: var(--nscale-text-color, #1a202c);
  font-weight: 500;
}

.n-chat-session-info__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.n-chat-session-info__tag {
  font-size: 0.75rem;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  background-color: var(--nscale-tag-bg, #f1f5f9);
  color: var(--nscale-text-color, #1a202c);
}

.n-chat-session-info__actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
}

.n-chat-session-info__action {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background-color: var(--nscale-surface-color, #ffffff);
  border: 1px solid var(--nscale-border-color, #e2e8f0);
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--nscale-text-color, #1a202c);
  transition: all 0.2s ease;
}

.n-chat-session-info__action:hover {
  background-color: var(--nscale-hover-bg, rgba(0, 0, 0, 0.05));
}

.n-chat-session-info__action svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.n-chat-session-info__action--rename {
  color: var(--nscale-primary, #00a550);
}

.n-chat-session-info__action--rename:hover {
  border-color: var(--nscale-primary, #00a550);
  background-color: var(--nscale-primary-ultra-light, rgba(0, 165, 80, 0.05));
}

.n-chat-session-info__action--export:hover {
  border-color: var(--nscale-info, #3b82f6);
  background-color: var(--nscale-info-light, rgba(59, 130, 246, 0.05));
}

.n-chat-session-info__action--danger {
  color: var(--nscale-error, #dc2626);
}

.n-chat-session-info__action--danger:hover {
  border-color: var(--nscale-error, #dc2626);
  background-color: var(--nscale-error-light, rgba(220, 38, 38, 0.05));
}

/* Modales Fenster */
.n-chat-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
}

.n-chat-modal__content {
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  background-color: var(--nscale-surface-color, #ffffff);
  border-radius: 0.5rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.n-chat-modal__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--nscale-border-color, #e2e8f0);
}

.n-chat-modal__title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--nscale-text-color, #1a202c);
  margin: 0;
}

.n-chat-modal__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  color: var(--nscale-text-color-secondary, #475569);
  transition: all 0.2s ease;
}

.n-chat-modal__close:hover {
  background-color: var(--nscale-hover-bg, rgba(0, 0, 0, 0.05));
  color: var(--nscale-text-color, #1a202c);
}

.n-chat-modal__close svg {
  width: 20px;
  height: 20px;
}

.n-chat-modal__body {
  padding: 1rem;
  overflow-y: auto;
  flex: 1;
}

.n-chat-modal__empty {
  text-align: center;
  color: var(--nscale-text-color-secondary, #475569);
  padding: 2rem 1rem;
}

/* Quellen-Liste */
.n-chat-sources-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.n-chat-source-item {
  border: 1px solid var(--nscale-border-color, #e2e8f0);
  border-radius: 0.5rem;
  overflow: hidden;
}

.n-chat-source-item__header {
  padding: 0.75rem 1rem;
  background-color: var(--nscale-surface-color-secondary, #f8fafc);
  border-bottom: 1px solid var(--nscale-border-color, #e2e8f0);
}

.n-chat-source-item__title {
  font-size: 1rem;
  font-weight: 500;
  color: var(--nscale-text-color, #1a202c);
  margin: 0 0 0.25rem 0;
}

.n-chat-source-item__origin {
  font-size: 0.75rem;
  color: var(--nscale-text-color-secondary, #475569);
}

.n-chat-source-item__content {
  padding: 1rem;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--nscale-text-color, #1a202c);
  max-height: 200px;
  overflow-y: auto;
  background-color: var(--nscale-surface-color, #ffffff);
  white-space: pre-line;
}

.n-chat-source-item__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  border-top: 1px solid var(--nscale-border-color, #e2e8f0);
  background-color: var(--nscale-surface-color-secondary, #f8fafc);
  font-size: 0.75rem;
}

.n-chat-source-item__link {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--nscale-primary, #00a550);
  text-decoration: none;
  font-weight: 500;
}

.n-chat-source-item__link:hover {
  text-decoration: underline;
}

.n-chat-source-item__link svg {
  width: 12px;
  height: 12px;
}

.n-chat-source-item__page,
.n-chat-source-item__relevance {
  color: var(--nscale-text-color-secondary, #475569);
}

/* Sidebar Toggle Button */
.n-chat-sidebar-toggle {
  position: fixed;
  top: 1rem;
  left: 1rem;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background-color: var(--nscale-surface-color, #ffffff);
  border: 1px solid var(--nscale-border-color, #e2e8f0);
  border-radius: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  color: var(--nscale-primary, #00a550);
  transition: all 0.2s ease;
}

.n-chat-sidebar-toggle:hover {
  background-color: var(--nscale-primary-light, #d1fae5);
  border-color: var(--nscale-primary, #00a550);
}

.n-chat-sidebar-toggle svg {
  width: 24px;
  height: 24px;
}

/* Mobile Sidebar Toggle */
.n-chat-mobile-toggle {
  position: fixed;
  top: 1rem;
  left: 1rem;
  z-index: 100;
  display: none;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background-color: var(--nscale-surface-color, #ffffff);
  border: 1px solid var(--nscale-border-color, #e2e8f0);
  border-radius: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  color: var(--nscale-primary, #00a550);
  transition: all 0.2s ease;
}

.n-chat-mobile-toggle:hover {
  background-color: var(--nscale-primary-light, #d1fae5);
  border-color: var(--nscale-primary, #00a550);
}

.n-chat-mobile-toggle svg {
  width: 24px;
  height: 24px;
}

/* Mobile Anpassungen */
@media (max-width: 767px) {
  .n-chat-mobile-toggle {
    display: flex;
  }

  .n-chat-sidebar-toggle {
    display: none;
  }
  .n-chat-view {
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: 1fr;
  }

  .n-chat-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 85%;
    max-width: 320px;
    z-index: 1000;
    transform: translateX(-100%);
    box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
  }

  .n-chat-view--mobile-sidebar .n-chat-sidebar {
    transform: translateX(0);
  }

  .n-chat-header {
    padding-left: 4rem;
  }

  .n-chat-session-info {
    width: 100%;
  }

  .n-chat-modal__content {
    width: 95%;
    max-width: 95%;
  }
}

/* Dark Mode Support */
@media (prefers-color-scheme: dark) {
  .n-chat-view {
    background-color: var(--nscale-dark-background, #1a1a1a);
  }

  .n-chat-sidebar {
    background-color: var(--nscale-dark-sidebar-bg, #1e1e1e);
    border-right-color: var(--nscale-dark-border-color, #333333);
  }

  .n-chat-sidebar__header {
    background-color: var(--nscale-dark-sidebar-header-bg, #262626);
    border-bottom-color: var(--nscale-dark-border-color, #333333);
  }

  .n-chat-sidebar__title {
    color: var(--nscale-dark-text-color, #e2e8f0);
  }

  .n-chat-sidebar__action-btn {
    color: var(--nscale-dark-text-color-secondary, #a0aec0);
  }

  .n-chat-sidebar__action-btn:hover {
    background-color: var(--nscale-dark-hover-bg, rgba(255, 255, 255, 0.05));
    color: var(--nscale-dark-text-color, #e2e8f0);
  }

  .n-chat-sidebar__footer {
    border-top-color: var(--nscale-dark-border-color, #333333);
  }

  .n-chat-sidebar__user-name {
    color: var(--nscale-dark-text-color, #e2e8f0);
  }

  .n-chat-sidebar__user-role {
    color: var(--nscale-dark-text-color-secondary, #a0aec0);
  }

  .n-chat-main {
    background-color: var(--nscale-dark-body-bg, #1a1a1a);
  }

  .n-chat-header {
    background-color: var(--nscale-dark-header-bg, #1e1e1e);
    border-bottom-color: var(--nscale-dark-border-color, #333333);
  }

  .n-chat-header__title {
    color: var(--nscale-dark-text-color, #e2e8f0);
  }

  .n-chat-header__tag {
    background-color: var(--nscale-dark-tag-bg, #2d3748);
    color: var(--nscale-dark-text-color-secondary, #a0aec0);
  }

  .n-chat-header__action-btn {
    color: var(--nscale-dark-text-color-secondary, #a0aec0);
  }

  .n-chat-header__action-btn:hover {
    background-color: var(--nscale-dark-hover-bg, rgba(255, 255, 255, 0.05));
    color: var(--nscale-dark-text-color, #e2e8f0);
  }

  .n-chat-session-info {
    background-color: var(--nscale-dark-surface-color, #1e1e1e);
    border-left-color: var(--nscale-dark-border-color, #333333);
  }

  .n-chat-session-info__header {
    background-color: var(--nscale-dark-surface-color, #1e1e1e);
    border-bottom-color: var(--nscale-dark-border-color, #333333);
  }

  .n-chat-session-info__title {
    color: var(--nscale-dark-text-color, #e2e8f0);
  }

  .n-chat-session-info__section-title {
    color: var(--nscale-dark-text-color, #e2e8f0);
    border-bottom-color: var(
      --nscale-dark-border-color-light,
      rgba(51, 51, 51, 0.5)
    );
  }

  .n-chat-session-info__detail-label {
    color: var(--nscale-dark-text-color-secondary, #a0aec0);
  }

  .n-chat-session-info__detail-value {
    color: var(--nscale-dark-text-color, #e2e8f0);
  }

  .n-chat-session-info__tag {
    background-color: var(--nscale-dark-tag-bg, #2d3748);
  }

  .n-chat-session-info__action {
    background-color: var(--nscale-dark-surface-color, #1e1e1e);
    border-color: var(--nscale-dark-border-color, #333333);
    color: var(--nscale-dark-text-color, #e2e8f0);
  }

  .n-chat-session-info__action:hover {
    background-color: var(--nscale-dark-hover-bg, rgba(255, 255, 255, 0.05));
  }

  .n-chat-session-info__action--rename:hover {
    background-color: var(
      --nscale-dark-primary-ultra-light,
      rgba(0, 165, 80, 0.1)
    );
  }

  .n-chat-session-info__action--danger:hover {
    background-color: var(--nscale-dark-error-light, rgba(220, 38, 38, 0.1));
  }

  .n-chat-modal__content {
    background-color: var(--nscale-dark-surface-color, #1e1e1e);
  }

  .n-chat-modal__header {
    border-bottom-color: var(--nscale-dark-border-color, #333333);
  }

  .n-chat-modal__title {
    color: var(--nscale-dark-text-color, #e2e8f0);
  }

  .n-chat-source-item {
    border-color: var(--nscale-dark-border-color, #333333);
  }

  .n-chat-source-item__header {
    background-color: var(--nscale-dark-surface-color-secondary, #262626);
    border-bottom-color: var(--nscale-dark-border-color, #333333);
  }

  .n-chat-source-item__title {
    color: var(--nscale-dark-text-color, #e2e8f0);
  }

  .n-chat-source-item__origin {
    color: var(--nscale-dark-text-color-secondary, #a0aec0);
  }

  .n-chat-source-item__content {
    color: var(--nscale-dark-text-color, #e2e8f0);
    background-color: var(--nscale-dark-surface-color, #1e1e1e);
  }

  .n-chat-source-item__footer {
    border-top-color: var(--nscale-dark-border-color, #333333);
    background-color: var(--nscale-dark-surface-color-secondary, #262626);
  }

  .n-chat-mobile-toggle {
    background-color: var(--nscale-dark-surface-color, #1e1e1e);
    border-color: var(--nscale-dark-border-color, #333333);
    color: var(--nscale-dark-text-color, #e2e8f0);
  }

  .n-chat-sidebar-toggle {
    background-color: var(--nscale-dark-surface-color, #1e1e1e);
    border-color: var(--nscale-dark-border-color, #333333);
    color: var(--nscale-dark-primary, #00d06a);
  }

  .n-chat-sidebar-toggle:hover {
    background-color: var(
      --nscale-dark-primary-ultra-light,
      rgba(0, 165, 80, 0.1)
    );
    border-color: var(--nscale-dark-primary, #00d06a);
  }
}
<<<<<<< HEAD
/* Delete Confirmation Dialog */
.n-chat-delete-confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.2s ease-out;
}

.n-chat-delete-confirm-dialog {
  background-color: var(--n-surface-color, #ffffff);
  border-radius: var(--n-border-radius-lg, 0.75rem);
  box-shadow: var(--n-shadow-xl, 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04));
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow: hidden;
  animation: slideIn 0.3s ease-out;
}

.n-chat-delete-confirm-header {
  padding: var(--n-space-5, 1.25rem) var(--n-space-6, 1.5rem);
  border-bottom: 1px solid var(--n-border-color, #e2e8f0);
}

.n-chat-delete-confirm-title {
  margin: 0;
  font-size: var(--n-font-size-lg, 1.125rem);
  font-weight: 600;
  color: var(--n-text-color, #2d3748);
}

.n-chat-delete-confirm-body {
  padding: var(--n-space-6, 1.5rem);
}

.n-chat-delete-confirm-body p {
  margin: 0;
  color: var(--n-text-color, #2d3748);
  line-height: 1.5;
}

.n-chat-delete-confirm-body p + p {
  margin-top: var(--n-space-3, 0.75rem);
}

.n-chat-delete-confirm-warning {
  color: var(--n-danger-color, #e53e3e);
  font-size: var(--n-font-size-sm, 0.875rem);
}

.n-chat-delete-confirm-footer {
  padding: var(--n-space-4, 1rem) var(--n-space-6, 1.5rem);
  border-top: 1px solid var(--n-border-color, #e2e8f0);
  display: flex;
  gap: var(--n-space-3, 0.75rem);
  justify-content: flex-end;
}

.n-chat-delete-confirm-btn {
  padding: var(--n-space-2, 0.5rem) var(--n-space-4, 1rem);
  border-radius: var(--n-border-radius-md, 0.5rem);
  font-size: var(--n-font-size-sm, 0.875rem);
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
  min-width: 80px;
}

.n-chat-delete-confirm-btn--cancel {
  background-color: var(--n-gray-200, #e2e8f0);
  color: var(--n-text-color, #2d3748);
}

.n-chat-delete-confirm-btn--cancel:hover {
  background-color: var(--n-gray-300, #cbd5e0);
}

.n-chat-delete-confirm-btn--danger {
  background-color: var(--n-danger-color, #e53e3e);
  color: white;
}

.n-chat-delete-confirm-btn--danger:hover {
  background-color: var(--n-danger-color-dark, #c53030);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideIn {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
=======
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
</style>
