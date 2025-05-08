<template>
  <div 
    ref="scrollContainer" 
    class="n-message-list"
    :class="{ 
      'n-message-list--loading': isLoading, 
      'n-message-list--empty': !isLoading && messages.length === 0 
    }"
  >
    <!-- Ladezustand -->
    <div v-if="isLoading" class="n-message-list__loading">
      <div class="n-message-list__spinner"></div>
      <span>Lade Unterhaltung...</span>
    </div>
    
    <!-- Leerer Zustand / Willkommens-Screen -->
    <div v-else-if="messages.length === 0" class="n-message-list__welcome">
      <img 
        :src="logoUrl || '/assets/images/senmvku-logo.png'" 
        alt="nscale DMS Assistent" 
        class="n-message-list__logo"
      >
      <h2>{{ welcomeTitle }}</h2>
      <p>{{ welcomeMessage }}</p>
    </div>
    
    <!-- Nachrichtenliste -->
    <TransitionGroup 
      v-else 
      name="message" 
      tag="div" 
      class="n-message-list__messages"
    >
      <div 
        v-for="message in visibleMessages" 
        :key="message.id" 
        class="n-message-list__message-wrapper"
      >
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
    </TransitionGroup>
    
    <!-- Tipp-Indikator - wird angezeigt, wenn der Assistent eine Antwort schreibt -->
    <div 
      v-if="isStreaming" 
      class="n-message-list__message-wrapper n-message-list__message-wrapper--streaming"
    >
      <div class="n-message-list__typing-indicator">
        <div class="n-message-list__typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
    
    <!-- Unsichtbarer Scroll-Anker, um automatisch zum Ende der Liste zu scrollen -->
    <div ref="scrollAnchor" class="n-message-list__scroll-anchor"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUpdated, nextTick } from 'vue';
import { useSessionsStore } from '@/stores/sessions';
import type { ChatMessage } from '@/types/session';
import MessageItem from './MessageItem.vue';

// Props Definition
interface Props {
  /** Array der anzuzeigenden Nachrichten */
  messages: ChatMessage[];
  
  /** Gibt an, ob Nachrichten geladen werden */
  isLoading?: boolean;
  
  /** Gibt an, ob eine Antwort gestreamt wird */
  isStreaming?: boolean;
  
  /** Maximal anzuzeigende Nachrichten (für Performance-Optimierung) */
  maxVisibleMessages?: number;
  
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
  (e: 'scroll', payload: { scrollTop: number, scrollHeight: number, clientHeight: number }): void;
}>();

// Default-Werte für Props
const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  isStreaming: false,
  maxVisibleMessages: 50,
  welcomeTitle: 'Willkommen beim nscale DMS Assistenten',
  welcomeMessage: 'Wie kann ich Ihnen heute mit nscale helfen?',
  scrollBehavior: 'smooth',
  showMessageActions: true,
  autoScrollThreshold: 0.8
});

// Refs für DOM-Elemente
const scrollContainer = ref<HTMLElement | null>(null);
const scrollAnchor = ref<HTMLElement | null>(null);
const isNearBottom = ref(true);
const userHasScrolled = ref(false);

// Computed Properties
const sessionsStore = useSessionsStore();

// Optimiert die Anzahl der gerenderten Nachrichten für bessere Performance
const visibleMessages = computed(() => {
  if (!props.maxVisibleMessages || props.messages.length <= props.maxVisibleMessages) {
    return props.messages;
  }
  
  // Nur die neuesten X Nachrichten anzeigen
  return props.messages.slice(-props.maxVisibleMessages);
});

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

function checkScrollPosition(): void {
  if (!scrollContainer.value) return;
  
  const { scrollTop, scrollHeight, clientHeight } = scrollContainer.value;
  const scrolledPosition = scrollTop + clientHeight;
  const threshold = scrollHeight * props.autoScrollThreshold;
  
  // Aktualisiert den Zustand, ob der Benutzer nahe am Ende der Liste ist
  isNearBottom.value = scrolledPosition >= threshold;
  
  // Event für den Scroll-Zustand emittieren
  emit('scroll', { scrollTop, scrollHeight, clientHeight });
}

// Verhindert das automatische Scrollen, wenn der Benutzer manuell scrollt
function handleScroll(): void {
  if (!scrollContainer.value) return;
  
  userHasScrolled.value = true;
  checkScrollPosition();
}

// Lifecycle Hooks
onMounted(() => {
  // Initial zum Ende scrollen
  scrollToBottom('auto');
  
  // Scroll-Event-Listener hinzufügen
  scrollContainer.value?.addEventListener('scroll', handleScroll);
  
  // Initialen Scroll-Status prüfen
  checkScrollPosition();
});

onUpdated(() => {
  checkScrollPosition();
});

// Watches
// Überwacht Änderungen an den Nachrichten und scrollt gegebenenfalls
watch(() => [...props.messages], () => {
  if (isNearBottom.value || props.isStreaming) {
    scrollToBottom();
  }
}, { deep: true });

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
  display: flex;
  flex-direction: column;
  gap: var(--nscale-space-6, 1.5rem);
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
}

.n-message-list__message-wrapper {
  width: 100%;
}

/* Schreibindikator */
.n-message-list__typing-indicator {
  background-color: var(--nscale-message-assistant-bg, #f8fafc);
  border-radius: var(--nscale-border-radius-md, 0.5rem);
  padding: var(--nscale-space-3, 0.75rem) var(--nscale-space-4, 1rem);
  display: inline-flex;
  align-items: center;
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

/* Animationen */
@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes typing-dot {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.6; }
  40% { transform: scale(1); opacity: 1; }
}

/* Transitionseffekte für neue Nachrichten */
.message-enter-active,
.message-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.message-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.message-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* Responsive Design */
@media (max-width: 768px) {
  .n-message-list {
    padding: var(--nscale-space-4, 1rem);
  }

  .n-message-list__welcome {
    padding: var(--nscale-space-4, 1rem);
  }

  .n-message-list__messages {
    gap: var(--nscale-space-4, 1rem);
  }
}

/* Einstellungen für Benutzer, die reduzierte Bewegung bevorzugen */
@media (prefers-reduced-motion: reduce) {
  .n-message-list {
    scroll-behavior: auto;
  }
  
  .message-enter-active,
  .message-leave-active,
  .n-message-list__typing-dots span {
    transition: none;
    animation: none;
  }
}
</style>