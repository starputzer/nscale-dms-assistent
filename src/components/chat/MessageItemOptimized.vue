<template>
  <div
    class="message-item"
    :class="[
      `message-item--${message.role}`,
      {
        'message-item--streaming': message.isStreaming,
        'message-item--error': message.status === 'error',
        'message-item--has-references': hasReferences,
      },
    ]"
    :data-message-id="message.id"
  >
    <!-- Avatar -->
    <div class="message-item__avatar">
      <div
        class="message-item__avatar-icon"
        :class="`message-item__avatar-icon--${message.role}`"
      >
        <svg
          v-if="message.role === 'user'"
          viewBox="0 0 24 24"
          class="message-item__avatar-svg"
        >
          <path
            d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
          />
        </svg>
        <svg
          v-else-if="message.role === 'assistant'"
          viewBox="0 0 24 24"
          class="message-item__avatar-svg"
        >
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
          />
        </svg>
        <svg v-else viewBox="0 0 24 24" class="message-item__avatar-svg">
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
          />
        </svg>
      </div>
    </div>

    <!-- Content -->
    <div class="message-item__content">
      <!-- Header with role and timestamp -->
      <div class="message-item__header">
        <span class="message-item__role">
          {{ roleDisplay }}
        </span>
        <span class="message-item__timestamp">
          {{ formattedTimestamp }}
        </span>
      </div>

      <!-- Message text -->
      <div 
        class="message-item__text"
        ref="messageContent"
        v-html="processedContent"
      />

      <!-- Streaming indicator -->
      <div v-if="message.isStreaming" class="message-item__streaming">
        <span class="message-item__streaming-dot"></span>
        <span class="message-item__streaming-dot"></span>
        <span class="message-item__streaming-dot"></span>
      </div>

      <!-- Error state -->
      <div v-if="message.status === 'error'" class="message-item__error">
        <svg viewBox="0 0 24 24" class="message-item__error-icon">
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
          />
        </svg>
        <span>Fehler beim Senden der Nachricht</span>
      </div>

      <!-- Actions -->
      <div v-if="showActions && !message.isStreaming" class="message-item__actions">
        <!-- Copy button -->
        <button
          v-if="message.role === 'assistant'"
          @click="copyToClipboard"
          class="message-item__action"
          :title="copyButtonText"
        >
          <svg viewBox="0 0 24 24" class="message-item__action-icon">
            <path
              v-if="!isCopied"
              d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
            />
            <path
              v-else
              d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"
            />
          </svg>
          <span>{{ copyButtonText }}</span>
        </button>

        <!-- Source references button -->
        <button
          v-if="hasReferences"
          @click="toggleReferences"
          class="message-item__action"
          title="Quellenangaben anzeigen"
        >
          <svg viewBox="0 0 24 24" class="message-item__action-icon">
            <path
              d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"
            />
          </svg>
          <span>Quellen ({{ referenceCount }})</span>
        </button>

        <!-- Feedback button -->
        <button
          v-if="message.role === 'assistant'"
          @click="toggleFeedback"
          class="message-item__action"
          title="Feedback geben"
        >
          <svg viewBox="0 0 24 24" class="message-item__action-icon">
            <path
              d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.85-1.26l3.03-7.61c.09-.23.12-.47.12-.73v-1.91l-.01-.01L23 10z"
            />
          </svg>
          <span>Hilfreich?</span>
        </button>
      </div>

      <!-- Source references (shown inline if enabled) -->
      <div
        v-if="showReferences && hasReferences && isReferencesOpen"
        class="message-item__references"
      >
        <h4>Quellenangaben:</h4>
        <ul>
          <li
            v-for="ref in sourceReferences"
            :key="ref.id"
            class="message-item__reference"
          >
            <strong>{{ ref.title || `Quelle ${ref.id}` }}</strong>
            <span v-if="ref.page"> - Seite {{ ref.page }}</span>
            <p v-if="ref.excerpt">{{ ref.excerpt }}</p>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from "vue";
import { useUIStore } from "@/stores/ui";
import { useSourceReferences } from "@/composables/useSourceReferences";
import type { ChatMessage } from "@/types/session";
import { linkifySourceReferences, highlightCode, applyCodeStyling } from "@/utils/messageFormatterOptimized";
import { renderMarkdown, renderMarkdownSync } from "@/utils/markdownRenderer";

// Props Definition
interface Props {
  /** Die anzuzeigende Nachricht */
  message: ChatMessage;

  /** Zeigt Aktionen wie Feedback und Quellen an */
  showActions?: boolean;

  /** Zeigt Quellenreferenzen direkt an */
  showReferences?: boolean;

  /** Soll Code hervorgehoben werden */
  highlightCodeBlocks?: boolean;

  /** Soll externe Links formatiert werden */
  formatLinks?: boolean;

  /** Datum/Zeit-Format für den Zeitstempel */
  timeFormat?: "short" | "medium" | "long";
}

// Default-Werte für Props
const props = withDefaults(defineProps<Props>(), {
  showActions: true,
  showReferences: false,
  highlightCodeBlocks: true,
  formatLinks: true,
  timeFormat: "short",
});

// Emits
const emit = defineEmits<{
  /** Wird ausgelöst, wenn Feedback gegeben wird */
  feedback: [messageId: string, type: "positive" | "negative"];
  /** Wird ausgelöst, wenn auf Quellenreferenzen geklickt wird */
  showReferences: [messageId: string];
  /** Wird ausgelöst, wenn die Nachricht erneut gesendet werden soll */
  retry: [messageId: string];
}>();

// Stores
const uiStore = useUIStore();

// Refs
const messageContent = ref<HTMLElement>();
const isReferencesOpen = ref(false);
const isFeedbackOpen = ref(false);
const isCopied = ref(false);

// Lazy loaded content
const processedContent = ref<string>('');
const isProcessing = ref(false);

// Composables
const { getReferencesForMessage } = useSourceReferences();

// Computed Properties
const roleDisplay = computed(() => {
  switch (props.message.role) {
    case "user":
      return "Sie";
    case "assistant":
      return "nScale Assistent";
    case "system":
      return "System";
    default:
      return props.message.role;
  }
});

const formattedTimestamp = computed(() => {
  const date = new Date(props.message.timestamp);
  
  switch (props.timeFormat) {
    case "short":
      return date.toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      });
    case "medium":
      return date.toLocaleString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
      });
    case "long":
      return date.toLocaleString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    default:
      return date.toLocaleTimeString("de-DE");
  }
});

const hasReferences = computed(() => {
  return (
    props.message.metadata?.sourceReferences &&
    props.message.metadata.sourceReferences.length > 0
  );
});

const referenceCount = computed(() => {
  return props.message.metadata?.sourceReferences?.length || 0;
});

const sourceReferences = computed(() => {
  if (!props.message.id) return [];
  return getReferencesForMessage(props.message.id);
});

const copyButtonText = computed(() => {
  return isCopied.value ? "Kopiert!" : "Kopieren";
});

// Process content asynchronously
async function processMessageContent() {
  if (isProcessing.value) return;
  
  isProcessing.value = true;
  
  try {
    let content = props.message.content || "";
    
    // For initial render, use sync version
    if (!processedContent.value) {
      processedContent.value = renderMarkdownSync(content);
      processedContent.value = linkifySourceReferences(processedContent.value);
    }
    
    // Then load full markdown rendering
    const html = await renderMarkdown(content);
    processedContent.value = linkifySourceReferences(html);
    
    // Apply syntax highlighting if needed
    await nextTick();
    if (props.highlightCodeBlocks && messageContent.value) {
      // First apply CSS-based styling immediately
      applyCodeStyling(messageContent.value);
      
      // Then load full syntax highlighting
      await highlightCode(messageContent.value);
    }
  } catch (error) {
    console.error('Error processing message content:', error);
    // Fallback to basic rendering
    processedContent.value = linkifySourceReferences(
      props.message.content.replace(/\n/g, '<br>')
    );
  } finally {
    isProcessing.value = false;
  }
}

// Methods
async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(props.message.content);
    isCopied.value = true;
    
    // Reset after 2 seconds
    setTimeout(() => {
      isCopied.value = false;
    }, 2000);
    
    // Show success toast
    uiStore.showToast("Text in die Zwischenablage kopiert", "success");
  } catch (error) {
    console.error("Fehler beim Kopieren:", error);
    uiStore.showToast("Fehler beim Kopieren des Texts", "error");
  }
}

function toggleReferences() {
  isReferencesOpen.value = !isReferencesOpen.value;
  
  if (isReferencesOpen.value) {
    emit("showReferences", props.message.id);
  }
}

function toggleFeedback() {
  isFeedbackOpen.value = !isFeedbackOpen.value;
}

function sendFeedback(type: "positive" | "negative") {
  emit("feedback", props.message.id, type);
  isFeedbackOpen.value = false;
  
  uiStore.showToast(
    type === "positive"
      ? "Vielen Dank für Ihr positives Feedback!"
      : "Vielen Dank für Ihr Feedback. Wir werden uns verbessern!",
    "success"
  );
}

// Watch for content changes
watch(() => props.message.content, () => {
  processMessageContent();
}, { immediate: true });

// Lifecycle
onMounted(() => {
  processMessageContent();
});
</script>

<style lang="scss" scoped>
@import "@/assets/styles/variables";

.message-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: var(--color-background-hover);
  }

  // Role variants
  &--user {
    .message-item__avatar-icon {
      background-color: var(--color-primary);
    }
  }

  &--assistant {
    .message-item__avatar-icon {
      background-color: var(--color-secondary);
    }
  }

  &--system {
    .message-item__avatar-icon {
      background-color: var(--color-warning);
    }
  }

  // States
  &--streaming {
    .message-item__text {
      position: relative;
      
      &::after {
        content: "▋";
        animation: blink 1s infinite;
      }
    }
  }

  &--error {
    background-color: var(--color-error-light);
  }

  // Avatar
  &__avatar {
    flex-shrink: 0;
  }

  &__avatar-icon {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
  }

  &__avatar-svg {
    width: 1.25rem;
    height: 1.25rem;
    fill: currentColor;
  }

  // Content
  &__content {
    flex: 1;
    min-width: 0;
  }

  &__header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
  }

  &__role {
    font-weight: 600;
    color: var(--color-text-primary);
  }

  &__timestamp {
    color: var(--color-text-secondary);
  }

  &__text {
    color: var(--color-text-primary);
    line-height: 1.6;
    word-wrap: break-word;

    // Markdown styles
    :deep(p) {
      margin: 0 0 0.5rem;
      
      &:last-child {
        margin-bottom: 0;
      }
    }

    :deep(pre) {
      background-color: var(--color-code-background);
      border-radius: 0.375rem;
      padding: 1rem;
      overflow-x: auto;
      margin: 0.5rem 0;
    }

    :deep(code) {
      background-color: var(--color-code-inline-background);
      padding: 0.125rem 0.25rem;
      border-radius: 0.25rem;
      font-size: 0.875em;
      font-family: var(--font-mono);
    }

    :deep(pre code) {
      background-color: transparent;
      padding: 0;
    }

    :deep(a) {
      color: var(--color-primary);
      text-decoration: none;
      
      &:hover {
        text-decoration: underline;
      }
    }

    :deep(.source-reference) {
      color: var(--color-primary);
      cursor: pointer;
      font-weight: 500;
      
      &:hover {
        text-decoration: underline;
      }
    }
  }

  // Streaming indicator
  &__streaming {
    display: flex;
    gap: 0.25rem;
    margin-top: 0.5rem;
  }

  &__streaming-dot {
    width: 0.5rem;
    height: 0.5rem;
    background-color: var(--color-text-secondary);
    border-radius: 50%;
    animation: pulse 1.5s infinite;

    &:nth-child(2) {
      animation-delay: 0.15s;
    }

    &:nth-child(3) {
      animation-delay: 0.3s;
    }
  }

  // Error state
  &__error {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.5rem;
    color: var(--color-error);
    font-size: 0.875rem;
  }

  &__error-icon {
    width: 1rem;
    height: 1rem;
    fill: currentColor;
  }

  // Actions
  &__actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }

  &__action {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.75rem;
    background: none;
    border: 1px solid var(--color-border);
    border-radius: 0.375rem;
    color: var(--color-text-secondary);
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background-color: var(--color-background-hover);
      color: var(--color-text-primary);
      border-color: var(--color-border-hover);
    }
  }

  &__action-icon {
    width: 1rem;
    height: 1rem;
    fill: currentColor;
  }

  // References
  &__references {
    margin-top: 1rem;
    padding: 1rem;
    background-color: var(--color-background-secondary);
    border-radius: 0.5rem;

    h4 {
      margin: 0 0 0.5rem;
      font-size: 0.875rem;
      font-weight: 600;
    }

    ul {
      margin: 0;
      padding-left: 1.5rem;
    }
  }

  &__reference {
    margin-bottom: 0.5rem;
    font-size: 0.875rem;

    strong {
      color: var(--color-text-primary);
    }

    p {
      margin: 0.25rem 0 0;
      color: var(--color-text-secondary);
    }
  }
}

// Animations
@keyframes blink {
  0%, 50% {
    opacity: 1;
  }
  51%, 100% {
    opacity: 0;
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.3;
  }
  50% {
    opacity: 1;
  }
}
</style>