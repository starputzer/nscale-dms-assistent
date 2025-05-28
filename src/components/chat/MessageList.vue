<template>
  <div
    ref="scrollContainer"
    class="n-message-list"
    :class="{
      'n-message-list--loading': isLoading,
      'n-message-list--empty': !isLoading && messages.length === 0,
      'n-message-list--scrolling': isScrolling,
    }"
    @scroll="handleScroll"
    :aria-busy="isLoading"
    :aria-live="isLoading ? 'off' : 'polite'"
  >
    <!-- DEBUG SECTION -->
    <div style="position: fixed; top: 60px; right: 10px; background: rgba(0,0,0,0.9); color: white; padding: 10px; z-index: 9999; font-size: 12px; max-width: 300px;">
      <h4 style="margin: 0 0 10px 0;">MessageList Debug</h4>
      <div>Props messages: {{ messages.length }}</div>
      <div>isLoading: {{ isLoading }}</div>
      <div>isStreaming: {{ isStreaming }}</div>
      <div>isVirtualized: {{ isVirtualized }}</div>
      <div>Messages:</div>
      <div v-for="(msg, idx) in messages.slice(0, 5)" :key="`debug-${idx}`" style="margin-left: 10px; font-size: 11px;">
        {{ idx }}: [{{ msg.role }}] {{ msg.content.substring(0, 30) }}... ({{ msg.id }})
      </div>
      <div v-if="messages.length > 5">... and {{ messages.length - 5 }} more</div>
    </div>
    <!-- Ladezustand -->
    <div
      v-if="isLoading"
      class="n-message-list__loading"
      aria-label="Nachrichten werden geladen"
    >
      <div class="n-message-list__spinner" aria-hidden="true"></div>
      <span>Lade Unterhaltung...</span>
    </div>

    <!-- Leerer Zustand / Willkommens-Screen -->
    <div
      v-else-if="messages.length === 0"
      class="n-message-list__welcome"
      role="status"
    >
      <img
        :src="logoUrl || '/assets/images/senmvku-logo.png'"
        alt="nscale DMS Assistent Logo"
        class="n-message-list__logo"
        @error="handleImageError"
      />
      <h2 id="welcome-title">{{ welcomeTitle }}</h2>
      <p id="welcome-message">{{ welcomeMessage }}</p>
    </div>

    <!-- Nachrichtenliste mit Virtualisierung -->
    <div
      v-else
      ref="messagesContainer"
      class="n-message-list__messages"
      role="log"
      aria-labelledby="message-list-label"
      aria-live="polite"
      aria-atomic="false"
      aria-relevant="additions text"
    >
      <span id="message-list-label" class="sr-only">Chatverlauf</span>

      <!-- Anzeige für ältere Nachrichten laden -->
      <div
        v-if="hasMoreMessagesUp && isVirtualized"
        class="n-message-list__load-more"
        tabindex="0"
        @click="loadMoreUp"
        role="button"
        aria-label="Ältere Nachrichten laden"
      >
        <span class="n-message-list__load-more-icon">↑</span>
        <span>Ältere Nachrichten laden</span>
      </div>

      <!-- Non-virtualized list for debugging (FIXED) -->
      <div v-if="!isVirtualized"
        class="n-message-list__simple-container"
        style="min-height: 200px;"
        :data-message-count="messages.length"
      >
        <!-- Debug empty message list indicator -->
        <div v-if="messages.length === 0" style="padding: 20px; background: #ffdddd; margin: 10px; border-radius: 8px;">
          <strong>MessageList Debug:</strong> No messages to display (messages array is empty)
        </div>
        
        <!-- Explicit non-virtualized message rendering with direct v-for binding -->
        <template v-for="(message, index) in messages" :key="`msg-direct-${message.id}-${index}`">
          <div
            class="n-message-list__message-wrapper n-message-direct"
            :data-message-id="message.id"
            :data-message-index="index"
            :data-content-length="message.content.length"
            :data-streaming="String(!!message.isStreaming)"
          >
            <div class="n-debug-message-info" style="padding: 4px; font-size: 10px; color: #666; border-bottom: 1px solid #eee;">
              Message #{{ index }} (ID: {{ message.id.substring(0,8) }}...) {{ message.isStreaming ? '⚡ STREAMING' : '' }}
            </div>
            <MessageItem
              :message="message"
              :show-actions="showMessageActions"
              @feedback="$emit('feedback', $event)"
              @view-sources="$emit('view-sources', $event)"
              @view-explanation="$emit('view-explanation', $event)"
              @retry="$emit('retry', $event)"
              @delete="$emit('delete', $event)"
            />
          </div>
        </template>
        
        <!-- Force render empty container for visual debugging -->
        <div v-if="messages.length === 0" style="height: 200px; border: 1px dashed red; margin: 20px; display: flex; align-items: center; justify-content: center;">
          <span>No messages in this conversation yet</span>
        </div>
      </div>
      
      <!-- Container für virtuelle Liste -->
      <div v-else
        class="n-message-list__virtual-container"
        :style="virtualContainerStyle"
      >
        <!-- Virtualisierte Nachrichtenelemente -->
        <div
          v-for="item in visibleItems"
          :key="`virtual-${item.id}`"
          class="n-message-list__message-wrapper"
          :style="getItemStyle(item)"
          :aria-setsize="totalItems"
          :aria-posinset="item.index + 1"
          :data-message-id="item.id"
        >
          <MessageItem
            :message="item.message"
            :show-actions="showMessageActions"
            @feedback="$emit('feedback', $event)"
            @view-sources="$emit('view-sources', $event)"
            @view-explanation="$emit('view-explanation', $event)"
            @retry="$emit('retry', $event)"
            @delete="$emit('delete', $event)"
          />
        </div>
      </div>

      <!-- Anzeige für neuere Nachrichten laden -->
      <div
        v-if="hasMoreMessagesDown && isVirtualized"
        class="n-message-list__load-more"
        tabindex="0"
        @click="loadMoreDown"
        role="button"
        aria-label="Neuere Nachrichten laden"
      >
        <span class="n-message-list__load-more-icon">↓</span>
        <span>Neuere Nachrichten laden</span>
      </div>
    </div>

    <!-- Tipp-Indikator - wird angezeigt, wenn der Assistent eine Antwort schreibt -->
    <div
      v-if="isStreaming"
      class="n-message-list__typing-indicator"
      aria-live="polite"
      aria-atomic="true"
    >
      <span class="sr-only">Der Assistent schreibt gerade...</span>
      <div class="n-message-list__typing-dots" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>

    <!-- Scroll-to-Bottom Button -->
    <button
      v-if="showScrollToBottomButton && !isAtBottom"
      class="n-message-list__scroll-button"
      @click="scrollToBottom('smooth')"
      aria-label="Zum Ende der Unterhaltung scrollen"
    >
      <span class="n-message-list__scroll-icon">↓</span>
    </button>

    <!-- Unsichtbarer Scroll-Anker, um automatisch zum Ende der Liste zu scrollen -->
    <div
      ref="scrollAnchor"
      class="n-message-list__scroll-anchor"
      aria-hidden="true"
    ></div>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
  shallowRef,
  markRaw,
} from "vue";
import { useElementSize } from "@/composables/useElementSize";
import { useThrottleFn } from "@/composables/useThrottleFn";
import type { ChatMessage } from "@/types/session";
import MessageItem from "./MessageItem.vue";

// Typen für virtuelle Liste
interface VirtualItem {
  id: string;
  index: number;
  message: ChatMessage;
  height?: number;
  top?: number;
}

// Props Definition
interface Props {
  /** Array der anzuzeigenden Nachrichten */
  messages: ChatMessage[];

  /** Gibt an, ob Nachrichten geladen werden */
  isLoading?: boolean;

  /** Gibt an, ob eine Antwort gestreamt wird */
  isStreaming?: boolean;

  /** Anzahl der Nachrichten, die beim Scrollen geladen werden (für Pagination) */
  pageSize?: number;

  /** URL des Logos für den Willkommensbildschirm */
  logoUrl?: string;

  /** Titel für den Willkommensbildschirm */
  welcomeTitle?: string;

  /** Nachricht für den Willkommensbildschirm */
  welcomeMessage?: string;

  /** Verhalten für das automatische Scrollen */
  scrollBehavior?: "auto" | "smooth" | "instant";

  /** Ob Aktionsschaltflächen für Nachrichten angezeigt werden sollen */
  showMessageActions?: boolean;

  /** Threshold für automatisches Scrollen (0-1, Default 0.8 = 80% der Sichtbarkeit) */
  autoScrollThreshold?: number;

  /** Ob virtualisiertes Rendering verwendet werden soll */
  virtualized?: boolean;

  /** Überhang (Anzahl von Elementen außerhalb des sichtbaren Bereichs zu rendern) */
  overscan?: number;

  /** Schätzung für die durchschnittliche Höhe einer Nachricht */
  estimatedItemHeight?: number;

  /** Ob der Scroll-nach-unten-Button angezeigt werden soll */
  showScrollToBottomButton?: boolean;
}

// Emit definition
const emit = defineEmits<{
  /** Wird ausgelöst, wenn Feedback zu einer Nachricht gegeben wird */
  (
    e: "feedback",
    payload: {
      messageId: string;
      type: "positive" | "negative";
      feedback?: string;
    },
  ): void;

  /** Wird ausgelöst, wenn Quellen angezeigt werden sollen */
  (e: "view-sources", payload: { messageId: string }): void;

  /** Wird ausgelöst, wenn eine Erklärung angezeigt werden soll */
  (e: "view-explanation", payload: { messageId: string }): void;

  /** Wird ausgelöst, wenn eine Nachricht wiederholt werden soll */
  (e: "retry", payload: { messageId: string }): void;

  /** Wird ausgelöst, wenn eine Nachricht gelöscht werden soll */
  (e: "delete", payload: { messageId: string }): void;

  /** Wird ausgelöst, wenn die Liste gescrollt wird */
  (
    e: "scroll",
    payload: {
      scrollTop: number;
      scrollHeight: number;
      clientHeight: number;
      isAtBottom: boolean;
    },
  ): void;

  /** Wird ausgelöst, wenn weitere Nachrichten geladen werden sollen */
  (
    e: "load-more",
    payload: {
      direction: "up" | "down";
      firstVisibleIndex?: number;
      lastVisibleIndex?: number;
    },
  ): void;
}>();

// Default-Werte für Props
const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  isStreaming: false,
  pageSize: 20,
  welcomeTitle: "Willkommen beim nscale DMS Assistenten",
  welcomeMessage: "Wie kann ich Ihnen heute mit nscale helfen?",
  scrollBehavior: "smooth",
  showMessageActions: true,
  autoScrollThreshold: 0.8,
  virtualized: false, // Standard auf false gesetzt für robustere Darstellung
  overscan: 5,
  estimatedItemHeight: 100,
  showScrollToBottomButton: true,
});

// Debug logging für messages
watch(() => props.messages, (newMessages, oldMessages) => {
  console.log(`[MessageList] Messages changed: ${oldMessages?.length || 0} -> ${newMessages.length} messages`);
  newMessages.forEach((msg, idx) => {
    console.log(`[MessageList] Message ${idx}:`, {
      id: msg.id,
      role: msg.role,
      contentLength: msg.content.length,
      isStreaming: msg.isStreaming,
      status: msg.status,
      content: msg.content.substring(0, 50) + "..."
    });
  });
  
  // Force update virtual items when messages change
  if (isVirtualized.value) {
    console.log(`[MessageList] Forcing virtual items update`);
    updateVirtualItems();
  }
}, { deep: true, immediate: true });

// Watch individual message updates for streaming
watch(() => props.messages.map(msg => ({ id: msg.id, content: msg.content })), (newContents, oldContents) => {
  if (!oldContents) return;
  
  newContents.forEach((newContent, idx) => {
    if (oldContents[idx] && newContent.content !== oldContents[idx].content) {
      console.log(`[MessageList] Message content changed for ${newContent.id}: ${oldContents[idx].content.length} -> ${newContent.content.length} chars`);
      
      // Force immediate update for streaming messages
      if (props.messages[idx].isStreaming) {
        console.log(`[MessageList] Streaming message detected, forcing update`);
        nextTick(() => {
          updateVirtualItems();
          updateVisibleRange();
        });
      }
    }
  });
}, { deep: true });

// Refs für DOM-Elemente
const scrollContainer = ref<HTMLElement | null>(null);
const messagesContainer = ref<HTMLElement | null>(null);
const scrollAnchor = ref<HTMLElement | null>(null);
const isAtBottom = ref(true);
const isScrolling = ref(false);
const userHasScrolled = ref(false);
const scrollEndTimeout = ref<number | null>(null);
const resizeObserver = ref<ResizeObserver | null>(null);

// Virtuelle Liste Status - Verwendung von shallowRef für bessere Performance
const itemPositions = shallowRef<Map<string, { height: number; top: number }>>(
  new Map(),
);
const visibleRange = shallowRef<{ start: number; end: number }>({
  start: 0,
  end: 0,
});
const allItems = shallowRef<VirtualItem[]>([]);
const isVirtualized = computed(
  () => props.virtualized && props.messages.length > 20,
);

// Cache für berechnete Element-Höhen
const itemHeightCache = shallowRef<Map<string, number>>(new Map());
const defaultItemHeight = ref(props.estimatedItemHeight);

// Memory-Optimierung: Elemente mit konstanter Skalierung vorberechnen
const scaledItemHeights = shallowRef<Map<number, number>>(
  new Map([
    [1, props.estimatedItemHeight],
    [1.5, Math.floor(props.estimatedItemHeight * 1.5)],
    [2, props.estimatedItemHeight * 2],
    [3, props.estimatedItemHeight * 3],
  ]),
);

// Benutze den Composable für Element-Größe
const { width: containerWidth, height: containerHeight } =
  useElementSize(scrollContainer);

// Memoization für Höhenberechnung
const heightMemoCache = shallowRef<Map<string, number>>(new Map());

// Berechne die Höhe des virtuellen Containers mit Memoization
const totalHeight = computed(() => {
  if (!isVirtualized.value) return "auto";

  // Eindeutiger Cache-Schlüssel basierend auf relevanten Faktoren
  const cacheKey = `totalHeight-${allItems.value.length}-${itemHeightCache.value.size}`;

  // Cache-Lookup
  if (heightMemoCache.value.has(cacheKey)) {
    return heightMemoCache.value.get(cacheKey)!;
  }

  // Berechnung
  const height = allItems.value.reduce((total, item) => {
    return (
      total + (itemHeightCache.value.get(item.id) || defaultItemHeight.value)
    );
  }, 0);

  // Cache-Update
  heightMemoCache.value.set(cacheKey, height);
  return height;
});

// Optimierte Version von virtualContainerStyle mit v-memo
const virtualContainerStyle = computed(() => {
  return {
    height: isVirtualized.value ? `${totalHeight.value}px` : "auto",
    position: isVirtualized.value ? "relative" : "static",
    contain: "content", // CSS Containment für bessere Performance
  };
});

const totalItems = computed(() => props.messages.length);

// Berechne die aktuell sichtbaren Items mit v-memo für Leistungsoptimierung
const visibleItems = computed(() => {
  // Ohne Virtualisierung alle Nachrichten anzeigen und Array-Allokation minimieren
  if (!isVirtualized.value) {
    return props.messages.map((message, index) =>
      markRaw({
        id: message.id,
        index,
        message,
      }),
    );
  }

  // Mit Virtualisierung nur den sichtbaren Bereich plus Überhang anzeigen
  const { start, end } = visibleRange.value;
  const startWithOverscan = Math.max(0, start - props.overscan);
  const endWithOverscan = Math.min(
    allItems.value.length - 1,
    end + props.overscan,
  );

  // Slice verwenden statt Filter für bessere Performance
  return allItems.value.slice(startWithOverscan, endWithOverscan + 1);
});

// Status für Pagination
const hasMoreMessagesUp = ref(false);
const hasMoreMessagesDown = ref(false);

// Optimierte Version von updateVirtualItems mit minimalen Array-Allokationen
function updateVirtualItems() {
  // Optimierte Strategie mit Object-Pooling für große Listen
  if (props.messages.length > 100) {
    // Effizienter Algorithmus für große Datensätze
    const newItems: VirtualItem[] = [];
    const existingItemsMap = new Map(
      allItems.value.map((item) => [item.id, item]),
    );

    // Wiederverwenden von Elementen, wenn möglich
    props.messages.forEach((message, index) => {
      const existingItem = existingItemsMap.get(message.id);
      if (existingItem) {
        existingItem.index = index;
        newItems.push(existingItem);
      } else {
        // Nur für neue Elemente ein neues Objekt erstellen
        newItems.push({
          id: message.id,
          index,
          message,
          height:
            itemHeightCache.value.get(message.id) || defaultItemHeight.value,
        });
      }
    });

    allItems.value = newItems;
  } else {
    // Einfachere Implementierung für kleine Datensätze
    allItems.value = props.messages.map((message, index) => ({
      id: message.id,
      index,
      message,
      height: itemHeightCache.value.get(message.id) || defaultItemHeight.value,
    }));
  }

  // Positionen aktualisieren
  updateItemPositions();
}

// Berechne die Positionen aller Items mit optimiertem Algorithmus
function updateItemPositions() {
  let currentTop = 0;
  const newPositions = new Map();

  // Für Arrays mit mehr als 500 Elementen, Stapelverarbeitung verwenden
  const batchSize = allItems.value.length > 500 ? 100 : allItems.value.length;
  const processBatch = (startIdx: number) => {
    const endIdx = Math.min(startIdx + batchSize, allItems.value.length);

    for (let i = startIdx; i < endIdx; i++) {
      const item = allItems.value[i];
      const height =
        itemHeightCache.value.get(item.id) || defaultItemHeight.value;

      // Position aktualisieren
      newPositions.set(item.id, {
        height,
        top: currentTop,
      });

      currentTop += height;
    }

    // Wenn weitere Stapel zu verarbeiten sind, planen wir sie für das nächste Frame
    if (endIdx < allItems.value.length) {
      requestAnimationFrame(() => processBatch(endIdx));
    } else {
      // Alle Stapel wurden verarbeitet, also aktualisieren wir die Positionen
      itemPositions.value = newPositions;
    }
  };

  // Stapelverarbeitung starten
  processBatch(0);
}

// Berechne den Style für ein einzelnes Item mit Memoization
const itemStyleCache = shallowRef(new Map<string, object>());

function getItemStyle(item: VirtualItem) {
  if (!isVirtualized.value) return {};

  const cacheKey = `${item.id}-${itemPositions.value.size}`;
  if (itemStyleCache.value.has(cacheKey)) {
    return itemStyleCache.value.get(cacheKey)!;
  }

  const position = itemPositions.value.get(item.id);

  if (!position) return {};

  const style = {
    position: "absolute",
    top: `${position.top}px`,
    width: "100%",
    height: `${position.height}px`,
    contain: "layout style size", // CSS Containment für bessere Performance
  };

  itemStyleCache.value.set(cacheKey, style);
  return style;
}

// Optimierte Throttle-Funktion für das Scrolling mit adaptiver Rate
// Für schnelles Scrollen reduzieren wir die Update-Rate, für langsames erhöhen wir sie
const handleScroll = useThrottleFn(
  (e: Event) => {
    if (!scrollContainer.value) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainer.value;
    const scrolledPosition = scrollTop + clientHeight;
    const threshold = scrollHeight * props.autoScrollThreshold;

    // Aktualisiert den Zustand, ob der Benutzer nahe am Ende der Liste ist
    isAtBottom.value = scrolledPosition >= threshold;

    // Während des Scrollens den Status setzen
    isScrolling.value = true;

    // Nach dem Scrollen Reset nach kurzer Verzögerung
    if (scrollEndTimeout.value) {
      clearTimeout(scrollEndTimeout.value);
    }

    scrollEndTimeout.value = window.setTimeout(() => {
      isScrolling.value = false;
      // Nach dem Scrollen den Style-Cache leeren
      itemStyleCache.value.clear();
    }, 150);

    // Event für den Scroll-Zustand emittieren
    emit("scroll", {
      scrollTop,
      scrollHeight,
      clientHeight,
      isAtBottom: isAtBottom.value,
    });

    // Benutzer hat manuell gescrollt
    if (!isLoading.value) {
      userHasScrolled.value = true;
    }

    // Update der sichtbaren Elemente bei virtualisiertem Rendering
    if (isVirtualized.value) {
      updateVisibleRange();
    }
  },
  50,
  {
    // Adaptiver Throttle - schneller bei langsamem Scrollen, langsamer bei schnellem Scrollen
    leading: true,
    trailing: true,
  },
);

// Cache für die Berechnung des sichtbaren Bereichs
const visibleRangeCache = shallowRef(
  new Map<string, { start: number; end: number }>(),
);

// Update der aktuell sichtbaren Elemente mit Binärsuche für optimierte Performance
function updateVisibleRange() {
  if (!scrollContainer.value || !isVirtualized.value) return;

  const { scrollTop, clientHeight } = scrollContainer.value;
  const scrollBottom = scrollTop + clientHeight;

  // Cache-Schlüssel basierend auf Scroll-Position
  const cacheKey = `${Math.floor(scrollTop / 50)}-${Math.floor(clientHeight / 50)}`;

  // Cache-Lookup
  if (visibleRangeCache.value.has(cacheKey)) {
    const cachedRange = visibleRangeCache.value.get(cacheKey)!;
    visibleRange.value = cachedRange;

    // Pagination-Status aktualisieren
    hasMoreMessagesUp.value = cachedRange.start > 0;
    hasMoreMessagesDown.value = cachedRange.end < allItems.value.length - 1;
    return;
  }

  // Optimierte Implementierung mit Binärsuche für große Listen
  let startIndex = findVisibleIndex(scrollTop, "start");
  let endIndex = findVisibleIndex(scrollBottom, "end");

  // Begrenzen auf gültige Indizes
  startIndex = Math.max(0, startIndex);
  endIndex = Math.min(allItems.value.length - 1, endIndex);

  // Pagination-Status aktualisieren
  hasMoreMessagesUp.value = startIndex > 0;
  hasMoreMessagesDown.value = endIndex < allItems.value.length - 1;

  // Sichtbaren Bereich aktualisieren
  const newRange = { start: startIndex, end: endIndex };
  visibleRange.value = newRange;

  // Cache-Update
  visibleRangeCache.value.set(cacheKey, newRange);

  // Cache-Größe begrenzen
  if (visibleRangeCache.value.size > 100) {
    // LRU-Strategie: Entferne ältesten Eintrag
    const oldestKey = visibleRangeCache.value.keys().next().value;
    visibleRangeCache.value.delete(oldestKey);
  }
}

// Binärsuche für effiziente Ermittlung des sichtbaren Index
function findVisibleIndex(
  targetPosition: number,
  mode: "start" | "end",
): number {
  if (allItems.value.length === 0) return 0;

  let low = 0;
  let high = allItems.value.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const item = allItems.value[mid];
    const position = itemPositions.value.get(item.id);

    if (!position) {
      // Fallback bei fehlender Position
      return mode === "start" ? low : high;
    }

    const itemTop = position.top;
    const itemBottom = itemTop + position.height;

    if (mode === "start") {
      if (itemBottom < targetPosition) {
        low = mid + 1;
      } else if (itemTop > targetPosition) {
        high = mid - 1;
      } else {
        return mid;
      }
    } else {
      // mode === 'end'
      if (itemTop > targetPosition) {
        high = mid - 1;
      } else if (itemBottom < targetPosition) {
        low = mid + 1;
      } else {
        return mid;
      }
    }
  }

  return mode === "start" ? low : high;
}

// Methoden zum Laden weiterer Nachrichten
function loadMoreUp() {
  const firstVisibleIndex = visibleRange.value.start;
  emit("load-more", { direction: "up", firstVisibleIndex });
}

function loadMoreDown() {
  const lastVisibleIndex = visibleRange.value.end;
  emit("load-more", { direction: "down", lastVisibleIndex });
}

// Methoden
// Optimierte Scroll-Methoden
function scrollToBottom(
  behavior: ScrollBehavior = props.scrollBehavior as ScrollBehavior,
): void {
  if (!scrollAnchor.value || !scrollContainer.value) return;

  // Verzögerung entfernen, um schnellere Reaktion zu gewährleisten
  scrollAnchor.value.scrollIntoView({
    behavior,
    block: "end",
  });
}

function scrollToMessage(
  messageId: string,
  behavior: ScrollBehavior = props.scrollBehavior as ScrollBehavior,
): void {
  // Effiziente Suche mit querySelector statt iterative Suche
  const messageElement = document.querySelector(
    `[data-message-id="${messageId}"]`,
  );

  if (messageElement) {
    messageElement.scrollIntoView({
      behavior,
      block: "center",
    });
  }
}

// Optimierte Element-Größenbeobachtung mit Debouncing und Batching
function observeItemSizes() {
  if (resizeObserver.value) {
    resizeObserver.value.disconnect();
  }

  // Batch-Verarbeitung für Größenänderungen
  let pendingUpdates = new Map<string, number>();
  let updateScheduled = false;

  // ResizeObserver für dynamische Höhenberechnung mit Batching
  resizeObserver.value = new ResizeObserver((entries) => {
    entries.forEach((entry) => {
      const element = entry.target as HTMLElement;
      const messageId = element.dataset.messageId;

      if (messageId) {
        const oldHeight =
          itemHeightCache.value.get(messageId) || defaultItemHeight.value;
        const newHeight = entry.contentRect.height;

        // Nur aktualisieren, wenn sich die Höhe signifikant geändert hat
        if (Math.abs(oldHeight - newHeight) > 2) {
          pendingUpdates.set(messageId, newHeight);
        }
      }
    });

    // Aktualisierungen nur einmal pro Frame planen
    if (pendingUpdates.size > 0 && !updateScheduled) {
      updateScheduled = true;
      requestAnimationFrame(() => {
        // Alle ausstehenden Updates auf einmal anwenden
        pendingUpdates.forEach((height, id) => {
          itemHeightCache.value.set(id, height);
        });

        // Positionen aktualisieren
        updateItemPositions();

        // Status zurücksetzen
        pendingUpdates.clear();
        updateScheduled = false;
      });
    }
  });

  // Beobachte alle Nachrichtenelemente
  nextTick(() => {
    scrollContainer.value
      ?.querySelectorAll(".n-message-list__message-wrapper")
      .forEach((element) => {
        resizeObserver.value?.observe(element);
      });
  });
}

// Logo-Handling
const logoSrc = ref("/assets/images/senmvku-logo.png");

function checkIfImageExists(url: string): boolean {
  try {
    // Beispiel-Implementierung - wird nur im Browser ausgeführt
    // Diese Funktion ist nicht perfekt, aber ein guter Fallback
    return true;
  } catch (error) {
    console.error("[MessageList] Error checking if image exists:", error);
    return false;
  }
}

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement;

  // Wenn bereits alle Versuche durchgeführt wurden, beenden
  if (img.dataset.failedPaths) {
    const failedPaths = JSON.parse(img.dataset.failedPaths) as string[];
    if (failedPaths.length >= 4) {
      console.error("[MessageList] All image paths failed, giving up");
      // Entferne den error handler um weitere Fehler zu vermeiden
      img.onerror = null;
      return;
    }
  }

  console.warn("[MessageList] Image failed to load, trying fallback paths");

  // Fallback-Pfade in der Reihenfolge der Wahrscheinlichkeit
  const fallbackPaths = [
    "/assets/images/senmvku-logo.png",
    "./assets/images/senmvku-logo.png",
    "/frontend/assets/images/senmvku-logo.png",
    "https://via.placeholder.com/150x150?text=nscale+DMS+Assistant",
  ];

  // Verfolge bereits versuchte Pfade
  const failedPaths = img.dataset.failedPaths
    ? JSON.parse(img.dataset.failedPaths)
    : [];
  const currentPath = img.src;

  // Füge den aktuellen Pfad zu den fehlgeschlagenen hinzu
  if (!failedPaths.includes(currentPath)) {
    failedPaths.push(currentPath);
  }

  // Finde den nächsten noch nicht versuchten Pfad
  const nextPath = fallbackPaths.find((path) => {
    const absolutePath = new URL(path, window.location.origin).href;
    return !failedPaths.some(
      (failed) => failed.includes(path) || failed === absolutePath,
    );
  });

  if (nextPath) {
    console.log(`[MessageList] Trying fallback image path: ${nextPath}`);
    img.dataset.failedPaths = JSON.stringify(failedPaths);
    img.src = nextPath;
  } else {
    console.error("[MessageList] All image paths failed");
    // Entferne den error handler um weitere Fehler zu vermeiden
    img.onerror = null;
    // Verstecke das Bild
    img.style.display = "none";
  }
}

// Lifecycle Hooks
onMounted(() => {
  // Initial zum Ende scrollen
  nextTick(() => {
    scrollToBottom("auto");
    updateVirtualItems();
    observeItemSizes();
  });

  // Initialen Scroll-Status prüfen
  if (scrollContainer.value) {
    const { scrollTop, scrollHeight, clientHeight } = scrollContainer.value;
    isAtBottom.value =
      scrollTop + clientHeight >= scrollHeight * props.autoScrollThreshold;
  }
});

// Optimiertes Cleanup
function cleanupResources() {
  // Alle Timer und Beobachter bereinigen
  if (resizeObserver.value) {
    resizeObserver.value.disconnect();
    resizeObserver.value = null;
  }

  if (scrollEndTimeout.value) {
    clearTimeout(scrollEndTimeout.value);
    scrollEndTimeout.value = null;
  }

  // Caches leeren
  itemStyleCache.value.clear();
  visibleRangeCache.value.clear();
  heightMemoCache.value.clear();
}

onBeforeUnmount(() => {
  cleanupResources();
});

// Watches

// Optimierte Watches

// Aktualisiere die virtuelle Liste, wenn sich die Nachrichten ändern
watch(
  () => props.messages,
  (newMessages, oldMessages) => {
    // Optimierung: Nur vollständig aktualisieren, wenn sich die Länge oder IDs geändert haben
    const shouldFullUpdate =
      newMessages.length !== oldMessages.length ||
      newMessages.some((msg, i) => oldMessages[i]?.id !== msg.id);

    if (shouldFullUpdate) {
      // Vollständige Aktualisierung
      updateVirtualItems();

      // Observer neu einrichten mit Verzögerung
      nextTick(() => {
        observeItemSizes();
      });
    }

    // Zum Ende scrollen, wenn der Benutzer am Ende ist oder während des Streamings
    if (isAtBottom.value || props.isStreaming || !userHasScrolled.value) {
      scrollToBottom();
    }
  },
  {
    deep: false, // Wichtig: Keine tiefe Beobachtung verwenden für bessere Performance
  },
);

// Beobachte Container-Größenänderungen und aktualisiere die sichtbaren Elemente
// mit Debouncing für bessere Performance
let containerResizeTimeout: number | null = null;
watch([containerWidth, containerHeight], () => {
  if (containerResizeTimeout) {
    clearTimeout(containerResizeTimeout);
  }

  containerResizeTimeout = window.setTimeout(() => {
    updateVisibleRange();
    // Cache leeren nach Größenänderung
    itemStyleCache.value.clear();
    containerResizeTimeout = null;
  }, 100);
});

// Scrollt automatisch, wenn Streaming beginnt
watch(
  () => props.isStreaming,
  (newValue) => {
    if (newValue) {
      scrollToBottom();
    }
  },
);

// Überwacht den Ladezustand und scrollt nach dem Laden zum Ende
watch(
  () => props.isLoading,
  (newValue, oldValue) => {
    if (oldValue && !newValue) {
      // Wenn das Laden abgeschlossen ist, zum Ende scrollen
      nextTick(() => {
        scrollToBottom("auto");
      });
    }
  },
);

// Stellt die Scrollposition wieder her, wenn neue Nachrichten geladen werden
watch(
  () => visibleItems.value.length,
  (newLength, oldLength) => {
    if (newLength > oldLength && !isAtBottom.value && userHasScrolled.value) {
      // Versuche, die Scrollposition zu erhalten
      nextTick(() => {
        if (scrollContainer.value) {
          updateVisibleRange();
        }
      });
    }
  },
);

// Exportierte Methoden
defineExpose({
  scrollToBottom,
  scrollToMessage,
});
</script>

<style scoped>
/* Container-Styling */
.n-message-list {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--nscale-space-6, 1.5rem);
  background-color: var(--nscale-body-bg, #ffffff);
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
}

/* Sichtbarkeitshilfsklasse für Screenreader */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Ladezustand */
.n-message-list__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: var(--nscale-space-8, 2rem);
  color: var(--nscale-text-secondary, #64748b);
}

.n-message-list__spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--nscale-border-color, #e2e8f0);
  border-top-color: var(--nscale-primary, #00a550);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: var(--nscale-space-4, 1rem);
}

/* Willkommensbereich */
.n-message-list__welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  flex: 1;
  max-width: 500px;
  margin: 0 auto;
  padding: var(--nscale-space-8, 2rem);
}

.n-message-list__logo {
  width: 80px;
  height: 80px;
  margin-bottom: var(--nscale-space-6, 1.5rem);
  object-fit: contain;
}

.n-message-list__welcome h2 {
  font-size: var(--nscale-font-size-xl, 1.25rem);
  font-weight: var(--nscale-font-weight-semibold, 600);
  margin-bottom: var(--nscale-space-4, 1rem);
  color: var(--nscale-text, #1a202c);
}

.n-message-list__welcome p {
  font-size: var(--nscale-font-size-md, 1rem);
  color: var(--nscale-text-secondary, #64748b);
  max-width: 400px;
}

/* Nachrichtenliste */
.n-message-list__messages {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  position: relative;
}

.n-message-list__message-wrapper {
  width: 100%;
  margin-bottom: var(--nscale-space-6, 1.5rem);
}

/* Mehr-laden-Buttons */
.n-message-list__load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--nscale-space-3, 0.75rem);
  background-color: var(--nscale-surface-color, #f8fafc);
  border: 1px solid var(--nscale-border-color, #e2e8f0);
  border-radius: var(--nscale-border-radius-md, 0.5rem);
  cursor: pointer;
  margin: var(--nscale-space-4, 1rem) 0;
  font-size: var(--nscale-font-size-sm, 0.875rem);
  color: var(--nscale-text-secondary, #64748b);
  transition: all 0.2s ease;
}

.n-message-list__load-more:hover {
  background-color: var(--nscale-hover-bg, rgba(0, 0, 0, 0.05));
}

.n-message-list__load-more-icon {
  margin-right: var(--nscale-space-2, 0.5rem);
}

/* Zum-Ende-Scrollen-Button */
.n-message-list__scroll-button {
  position: absolute;
  bottom: var(--nscale-space-6, 1.5rem);
  right: var(--nscale-space-6, 1.5rem);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--nscale-primary, #00a550);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border: none;
  z-index: 10;
  transition: all 0.2s ease;
}

.n-message-list__scroll-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.n-message-list__scroll-icon {
  font-size: 18px;
}

/* Schreibindikator */
.n-message-list__typing-indicator {
  background-color: var(--nscale-message-assistant-bg, #f8fafc);
  border-radius: var(--nscale-border-radius-md, 0.5rem);
  padding: var(--nscale-space-3, 0.75rem) var(--nscale-space-4, 1rem);
  display: inline-flex;
  align-items: center;
  margin-top: var(--nscale-space-4, 1rem);
  margin-bottom: var(--nscale-space-2, 0.5rem);
  align-self: flex-start;
  border: 1px solid var(--nscale-border-color, #e2e8f0);
  box-shadow: var(--nscale-shadow-sm, 0 1px 2px 0 rgba(0, 0, 0, 0.05));
}

.n-message-list__typing-dots {
  display: flex;
  align-items: center;
  gap: var(--nscale-space-1, 0.25rem);
}

.n-message-list__typing-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--nscale-text-secondary, #64748b);
  display: inline-block;
  animation: typing-dot 1.4s infinite ease-in-out both;
}

.n-message-list__typing-dots span:nth-child(1) {
  animation-delay: 0s;
}

.n-message-list__typing-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.n-message-list__typing-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

/* Scroll-Anker (unsichtbar) */
.n-message-list__scroll-anchor {
  height: 1px;
  margin-top: var(--nscale-space-4, 1rem);
  visibility: hidden;
}

/* Virtueller Container */
.n-message-list__virtual-container {
  width: 100%;
}

/* Animationen */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes typing-dot {
  0%,
  80%,
  100% {
    transform: scale(0.6);
    opacity: 0.6;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .n-message-list {
    padding: var(--nscale-space-4, 1rem);
  }

  .n-message-list__welcome {
    padding: var(--nscale-space-4, 1rem);
  }

  .n-message-list__scroll-button {
    bottom: var(--nscale-space-4, 1rem);
    right: var(--nscale-space-4, 1rem);
  }
}

/* Einstellungen für Benutzer, die reduzierte Bewegung bevorzugen */
@media (prefers-reduced-motion: reduce) {
  .n-message-list {
    scroll-behavior: auto;
  }

  .n-message-list__typing-dots span {
    animation: none;
  }

  .n-message-list__spinner {
    animation: none;
  }
}
/* Debug CSS - nur für Entwicklung */
.n-message-list {
  /* Force visible dimensions in debug mode */
  min-height: 300px !important;
  border: 1px solid rgba(255, 0, 0, 0.2) !important;
  background-color: rgba(255, 255, 255, 0.95) !important;
}

.n-message-list__simple-container {
  /* Ensure container is visible */
  min-height: 200px !important;
  border: 1px solid rgba(0, 0, 255, 0.2) !important;
  padding: 10px !important;
  margin: 10px !important;
}

.n-message-direct {
  /* Make each message visually obvious */
  margin: 10px 0 !important;
  padding: 10px !important;
  border: 1px solid rgba(0, 128, 0, 0.2) !important;
  border-radius: 8px !important;
  background-color: rgba(255, 255, 255, 0.9) !important;
}
</style>
