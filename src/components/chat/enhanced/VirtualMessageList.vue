<template>
  <div
    ref="scrollContainer"
    class="n-virtual-message-list"
    :class="{
      'n-virtual-message-list--loading': isLoading,
      'n-virtual-message-list--empty': !isLoading && messages.length === 0,
      'n-virtual-message-list--scrolling': isScrolling
    }"
    @scroll="handleScroll"
    :aria-busy="isLoading"
    :aria-live="isLoading ? 'off' : 'polite'"
  >
    <!-- Ladezustand -->
    <div 
      v-if="isLoading" 
      class="n-virtual-message-list__loading"
      aria-label="Nachrichten werden geladen"
    >
      <div class="n-virtual-message-list__spinner" aria-hidden="true"></div>
      <span>Lade Unterhaltung...</span>
    </div>

    <!-- Leerer Zustand / Willkommens-Screen -->
    <div 
      v-else-if="messages.length === 0" 
      class="n-virtual-message-list__welcome"
      role="status"
    >
      <img
        :src="logoUrl || '/assets/images/senmvku-logo.png'"
        alt="nscale DMS Assistent Logo"
        class="n-virtual-message-list__logo"
      >
      <h2 id="welcome-title">{{ welcomeTitle }}</h2>
      <p id="welcome-message">{{ welcomeMessage }}</p>
    </div>

    <!-- Nachrichtenliste mit Virtualisierung -->
    <div
      v-else
      ref="messagesContainer"
      class="n-virtual-message-list__messages"
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
        class="n-virtual-message-list__load-more"
        tabindex="0"
        @click="loadMoreUp"
        role="button"
        aria-label="Ältere Nachrichten laden"
      >
        <span class="n-virtual-message-list__load-more-icon">↑</span>
        <span>Ältere Nachrichten laden</span>
      </div>
      
      <!-- Container für virtuelle Liste -->
      <div class="n-virtual-message-list__virtual-container" :style="virtualContainerStyle">
        <!-- Virtualisierte Nachrichtenelemente -->
        <div 
          v-for="item in visibleItems"
          :key="item.id"
          class="n-virtual-message-list__message-wrapper"
          :style="getItemStyle(item)"
          :aria-setsize="totalItems"
          :aria-posinset="item.index + 1"
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
        class="n-virtual-message-list__load-more"
        tabindex="0"
        @click="loadMoreDown"
        role="button"
        aria-label="Neuere Nachrichten laden"
      >
        <span class="n-virtual-message-list__load-more-icon">↓</span>
        <span>Neuere Nachrichten laden</span>
      </div>
    </div>
    
    <!-- Tipp-Indikator - wird angezeigt, wenn der Assistent eine Antwort schreibt -->
    <div
      v-if="isStreaming"
      class="n-virtual-message-list__typing-indicator"
      aria-live="polite"
      aria-atomic="true"
    >
      <span class="sr-only">Der Assistent schreibt gerade...</span>
      <div class="n-virtual-message-list__typing-dots" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
    
    <!-- Scroll-to-Bottom Button -->
    <button
      v-if="showScrollToBottomButton && !isAtBottom"
      class="n-virtual-message-list__scroll-button"
      @click="scrollToBottom('smooth')"
      aria-label="Zum Ende der Unterhaltung scrollen"
    >
      <span class="n-virtual-message-list__scroll-icon">↓</span>
    </button>
    
    <!-- Unsichtbarer Scroll-Anker, um automatisch zum Ende der Liste zu scrollen -->
    <div 
      ref="scrollAnchor" 
      class="n-virtual-message-list__scroll-anchor"
      aria-hidden="true"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useElementSize } from '@/composables/useElementSize';
import { useThrottleFn } from '@/composables/useThrottleFn';
import type { ChatMessage } from '@/types/session';
import MessageItem from '../MessageItem.vue';

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
  scrollBehavior?: 'auto' | 'smooth' | 'instant';
  
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
  (e: 'feedback', payload: { messageId: string, type: 'positive' | 'negative', feedback?: string }): void;
  
  /** Wird ausgelöst, wenn Quellen angezeigt werden sollen */
  (e: 'view-sources', payload: { messageId: string }): void;
  
  /** Wird ausgelöst, wenn eine Erklärung angezeigt werden soll */
  (e: 'view-explanation', payload: { messageId: string }): void;
  
  /** Wird ausgelöst, wenn eine Nachricht wiederholt werden soll */
  (e: 'retry', payload: { messageId: string }): void;
  
  /** Wird ausgelöst, wenn eine Nachricht gelöscht werden soll */
  (e: 'delete', payload: { messageId: string }): void;
  
  /** Wird ausgelöst, wenn die Liste gescrollt wird */
  (e: 'scroll', payload: { scrollTop: number, scrollHeight: number, clientHeight: number, isAtBottom: boolean }): void;
  
  /** Wird ausgelöst, wenn weitere Nachrichten geladen werden sollen */
  (e: 'load-more', payload: { direction: 'up' | 'down', firstVisibleIndex?: number, lastVisibleIndex?: number }): void;
}>();

// Default-Werte für Props
const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  isStreaming: false,
  pageSize: 20,
  welcomeTitle: 'Willkommen beim nscale DMS Assistenten',
  welcomeMessage: 'Wie kann ich Ihnen heute mit nscale helfen?',
  scrollBehavior: 'smooth',
  showMessageActions: true,
  autoScrollThreshold: 0.8,
  virtualized: true,
  overscan: 5,
  estimatedItemHeight: 100,
  showScrollToBottomButton: true
});

// Refs für DOM-Elemente
const scrollContainer = ref<HTMLElement | null>(null);
const messagesContainer = ref<HTMLElement | null>(null);
const scrollAnchor = ref<HTMLElement | null>(null);
const isAtBottom = ref(true);
const isScrolling = ref(false);
const userHasScrolled = ref(false);
const scrollEndTimeout = ref<number | null>(null);
const resizeObserver = ref<ResizeObserver | null>(null);

// Virtuelle Liste Status
const itemPositions = ref<Map<string, { height: number, top: number }>>(new Map());
const visibleRange = ref<{ start: number, end: number }>({ start: 0, end: 0 });
const allItems = ref<VirtualItem[]>([]);
const isVirtualized = computed(() => props.virtualized && props.messages.length > 20);

// Cache für berechnete Element-Höhen
const itemHeightCache = ref<Map<string, number>>(new Map());
const defaultItemHeight = ref(props.estimatedItemHeight);

// Benutze den Composable für Element-Größe
const { width: containerWidth, height: containerHeight } = useElementSize(scrollContainer);

// Berechne die Höhe des virtuellen Containers
const totalHeight = computed(() => {
  if (!isVirtualized.value) return 'auto';
  
  return allItems.value.reduce((total, item) => {
    return total + (itemHeightCache.value.get(item.id) || defaultItemHeight.value);
  }, 0);
});

// Generiere die virtuellen Items aus den Nachrichten
const virtualContainerStyle = computed(() => {
  return {
    height: isVirtualized.value ? `${totalHeight.value}px` : 'auto',
    position: isVirtualized.value ? 'relative' : 'static',
  };
});

const totalItems = computed(() => props.messages.length);

// Berechne die aktuell sichtbaren Items
const visibleItems = computed(() => {
  if (!isVirtualized.value) {
    // Ohne Virtualisierung alle Nachrichten anzeigen
    return props.messages.map((message, index) => ({
      id: message.id,
      index,
      message,
    }));
  }
  
  // Mit Virtualisierung nur den sichtbaren Bereich plus Überhang anzeigen
  const { start, end } = visibleRange.value;
  const startWithOverscan = Math.max(0, start - props.overscan);
  const endWithOverscan = Math.min(allItems.value.length - 1, end + props.overscan);
  
  return allItems.value.slice(startWithOverscan, endWithOverscan + 1);
});

// Status für Pagination
const hasMoreMessagesUp = ref(false);
const hasMoreMessagesDown = ref(false);

// Update die virtuelle Liste mit den Nachrichtendaten
function updateVirtualItems() {
  // Nachrichten in virtuelles Item-Format konvertieren
  allItems.value = props.messages.map((message, index) => {
    const cachedHeight = itemHeightCache.value.get(message.id);
    return {
      id: message.id,
      index,
      message,
      height: cachedHeight || defaultItemHeight.value
    };
  });
  
  // Positionen aktualisieren
  updateItemPositions();
}

// Berechne die Positionen aller Items
function updateItemPositions() {
  let currentTop = 0;
  
  allItems.value.forEach(item => {
    const height = itemHeightCache.value.get(item.id) || defaultItemHeight.value;
    
    // Position aktualisieren
    itemPositions.value.set(item.id, { 
      height, 
      top: currentTop 
    });
    
    currentTop += height;
  });
}

// Berechne den Style für ein einzelnes Item
function getItemStyle(item: VirtualItem) {
  if (!isVirtualized.value) return {};
  
  const position = itemPositions.value.get(item.id);
  
  if (!position) return {};
  
  return {
    position: 'absolute',
    top: `${position.top}px`,
    width: '100%',
    height: `${position.height}px`
  };
}

// Throttle-Funktion für das Scrolling
const handleScroll = useThrottleFn((e: Event) => {
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
  }, 150);
  
  // Event für den Scroll-Zustand emittieren
  emit('scroll', { 
    scrollTop, 
    scrollHeight, 
    clientHeight,
    isAtBottom: isAtBottom.value
  });
  
  // Benutzer hat manuell gescrollt
  if (!isLoading.value) {
    userHasScrolled.value = true;
  }
  
  // Update der sichtbaren Elemente bei virtualisiertem Rendering
  if (isVirtualized.value) {
    updateVisibleRange();
  }
}, 100);

// Update der aktuell sichtbaren Elemente
function updateVisibleRange() {
  if (!scrollContainer.value || !isVirtualized.value) return;
  
  const { scrollTop, clientHeight } = scrollContainer.value;
  const scrollBottom = scrollTop + clientHeight;
  
  let startIndex = allItems.value.length - 1;
  let endIndex = 0;
  
  // Die Indizes der sichtbaren Elemente finden
  for (let i = 0; i < allItems.value.length; i++) {
    const item = allItems.value[i];
    const position = itemPositions.value.get(item.id);
    
    if (!position) continue;
    
    const itemTop = position.top;
    const itemBottom = itemTop + position.height;
    
    // Element ist sichtbar oder teilweise sichtbar
    if ((itemTop >= scrollTop && itemTop <= scrollBottom) || 
        (itemBottom >= scrollTop && itemBottom <= scrollBottom) ||
        (itemTop <= scrollTop && itemBottom >= scrollBottom)) {
      startIndex = Math.min(startIndex, i);
      endIndex = Math.max(endIndex, i);
    }
  }
  
  // Pagination-Status aktualisieren
  hasMoreMessagesUp.value = startIndex > 0;
  hasMoreMessagesDown.value = endIndex < allItems.value.length - 1;
  
  // Sichtbaren Bereich aktualisieren
  visibleRange.value = { start: startIndex, end: endIndex };
}

// Methoden zum Laden weiterer Nachrichten
function loadMoreUp() {
  const firstVisibleIndex = visibleRange.value.start;
  emit('load-more', { direction: 'up', firstVisibleIndex });
}

function loadMoreDown() {
  const lastVisibleIndex = visibleRange.value.end;
  emit('load-more', { direction: 'down', lastVisibleIndex });
}

// Methoden
function scrollToBottom(behavior: ScrollBehavior = props.scrollBehavior as ScrollBehavior): void {
  if (!scrollAnchor.value || !scrollContainer.value) return;
  
  nextTick(() => {
    scrollAnchor.value?.scrollIntoView({ 
      behavior, 
      block: 'end' 
    });
  });
}

function scrollToMessage(messageId: string, behavior: ScrollBehavior = props.scrollBehavior as ScrollBehavior): void {
  const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
  
  if (messageElement) {
    messageElement.scrollIntoView({
      behavior,
      block: 'center'
    });
  }
}

// Beobachte Größenänderungen der Nachrichten
function observeItemSizes() {
  if (resizeObserver.value) {
    resizeObserver.value.disconnect();
  }
  
  // ResizeObserver für dynamische Höhenberechnung
  resizeObserver.value = new ResizeObserver(entries => {
    let needsUpdate = false;
    
    entries.forEach(entry => {
      const element = entry.target as HTMLElement;
      const messageId = element.dataset.messageId;
      
      if (messageId) {
        const oldHeight = itemHeightCache.value.get(messageId) || defaultItemHeight.value;
        const newHeight = entry.contentRect.height;
        
        // Nur aktualisieren, wenn sich die Höhe geändert hat
        if (Math.abs(oldHeight - newHeight) > 1) {
          itemHeightCache.value.set(messageId, newHeight);
          needsUpdate = true;
        }
      }
    });
    
    if (needsUpdate) {
      updateItemPositions();
    }
  });
  
  // Beobachte alle Nachrichtenelemente
  nextTick(() => {
    scrollContainer.value?.querySelectorAll('.n-virtual-message-list__message-wrapper').forEach(element => {
      resizeObserver.value?.observe(element);
    });
  });
}

// Lifecycle Hooks
onMounted(() => {
  // Initial zum Ende scrollen
  nextTick(() => {
    scrollToBottom('auto');
    updateVirtualItems();
    observeItemSizes();
  });
  
  // Initialen Scroll-Status prüfen
  if (scrollContainer.value) {
    const { scrollTop, scrollHeight, clientHeight } = scrollContainer.value;
    isAtBottom.value = (scrollTop + clientHeight) >= (scrollHeight * props.autoScrollThreshold);
  }
});

onBeforeUnmount(() => {
  // Cleanup
  if (resizeObserver.value) {
    resizeObserver.value.disconnect();
  }
  
  if (scrollEndTimeout.value) {
    clearTimeout(scrollEndTimeout.value);
  }
});

// Watches

// Aktualisiere die virtuelle Liste, wenn sich die Nachrichten ändern
watch(() => props.messages, () => {
  updateVirtualItems();
  
  // Observer neu einrichten
  nextTick(() => {
    observeItemSizes();
  });
  
  // Zum Ende scrollen, wenn der Benutzer am Ende ist oder während des Streamings
  if (isAtBottom.value || props.isStreaming || !userHasScrolled.value) {
    scrollToBottom();
  }
}, { deep: false });

// Beobachte Container-Größenänderungen und aktualisiere die sichtbaren Elemente
watch([containerWidth, containerHeight], () => {
  nextTick(() => {
    updateVisibleRange();
  });
});

// Scrollt automatisch, wenn Streaming beginnt
watch(() => props.isStreaming, (newValue) => {
  if (newValue) {
    scrollToBottom();
  }
});

// Überwacht den Ladezustand und scrollt nach dem Laden zum Ende
watch(() => props.isLoading, (newValue, oldValue) => {
  if (oldValue && !newValue) {
    // Wenn das Laden abgeschlossen ist, zum Ende scrollen
    nextTick(() => {
      scrollToBottom('auto');
    });
  }
});

// Stellt die Scrollposition wieder her, wenn neue Nachrichten geladen werden
watch(() => visibleItems.value.length, (newLength, oldLength) => {
  if (newLength > oldLength && !isAtBottom.value && userHasScrolled.value) {
    // Versuche, die Scrollposition zu erhalten
    nextTick(() => {
      if (scrollContainer.value) {
        updateVisibleRange();
      }
    });
  }
});

// Exportierte Methoden
defineExpose({
  scrollToBottom,
  scrollToMessage
});
</script>

<style scoped>
/* Container-Styling */
.n-virtual-message-list {
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
.n-virtual-message-list__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: var(--nscale-space-8, 2rem);
  color: var(--nscale-text-secondary, #64748b);
}

.n-virtual-message-list__spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--nscale-border-color, #e2e8f0);
  border-top-color: var(--nscale-primary, #00a550);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: var(--nscale-space-4, 1rem);
}

/* Willkommensbereich */
.n-virtual-message-list__welcome {
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

.n-virtual-message-list__logo {
  width: 80px;
  height: 80px;
  margin-bottom: var(--nscale-space-6, 1.5rem);
  object-fit: contain;
}

.n-virtual-message-list__welcome h2 {
  font-size: var(--nscale-font-size-xl, 1.25rem);
  font-weight: var(--nscale-font-weight-semibold, 600);
  margin-bottom: var(--nscale-space-4, 1rem);
  color: var(--nscale-text, #1a202c);
}

.n-virtual-message-list__welcome p {
  font-size: var(--nscale-font-size-md, 1rem);
  color: var(--nscale-text-secondary, #64748b);
  max-width: 400px;
}

/* Nachrichtenliste */
.n-virtual-message-list__messages {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  position: relative;
}

.n-virtual-message-list__message-wrapper {
  width: 100%;
  margin-bottom: var(--nscale-space-6, 1.5rem);
}

/* Mehr-laden-Buttons */
.n-virtual-message-list__load-more {
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

.n-virtual-message-list__load-more:hover {
  background-color: var(--nscale-hover-bg, rgba(0, 0, 0, 0.05));
}

.n-virtual-message-list__load-more-icon {
  margin-right: var(--nscale-space-2, 0.5rem);
}

/* Zum-Ende-Scrollen-Button */
.n-virtual-message-list__scroll-button {
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

.n-virtual-message-list__scroll-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.n-virtual-message-list__scroll-icon {
  font-size: 18px;
}

/* Schreibindikator */
.n-virtual-message-list__typing-indicator {
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

.n-virtual-message-list__typing-dots {
  display: flex;
  align-items: center;
  gap: var(--nscale-space-1, 0.25rem);
}

.n-virtual-message-list__typing-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--nscale-text-secondary, #64748b);
  display: inline-block;
  animation: typing-dot 1.4s infinite ease-in-out both;
}

.n-virtual-message-list__typing-dots span:nth-child(1) {
  animation-delay: 0s;
}

.n-virtual-message-list__typing-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.n-virtual-message-list__typing-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

/* Scroll-Anker (unsichtbar) */
.n-virtual-message-list__scroll-anchor {
  height: 1px;
  margin-top: var(--nscale-space-4, 1rem);
  visibility: hidden;
}

/* Virtueller Container */
.n-virtual-message-list__virtual-container {
  width: 100%;
}

/* Animationen */
@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes typing-dot {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.6; }
  40% { transform: scale(1); opacity: 1; }
}

/* Responsive Design */
@media (max-width: 768px) {
  .n-virtual-message-list {
    padding: var(--nscale-space-4, 1rem);
  }

  .n-virtual-message-list__welcome {
    padding: var(--nscale-space-4, 1rem);
  }
  
  .n-virtual-message-list__scroll-button {
    bottom: var(--nscale-space-4, 1rem);
    right: var(--nscale-space-4, 1rem);
  }
}

/* Einstellungen für Benutzer, die reduzierte Bewegung bevorzugen */
@media (prefers-reduced-motion: reduce) {
  .n-virtual-message-list {
    scroll-behavior: auto;
  }
  
  .n-virtual-message-list__typing-dots span {
    animation: none;
  }
  
  .n-virtual-message-list__spinner {
    animation: none;
  }
}
</style>