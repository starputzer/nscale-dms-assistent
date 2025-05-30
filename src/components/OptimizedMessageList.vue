<template>
  <div 
    ref="containerRef"
    class="optimized-message-list"
    :style="containerStyle"
    @scroll="handleScroll"
  >
    <!-- Spacer for virtual scrolling -->
    <div 
      class="virtual-spacer-top" 
      :style="{ height: `${spacerTop}px` }"
    />
    
    <!-- Visible messages -->
    <div
      v-for="message in visibleMessages"
      :key="message.id"
      class="message-item"
      :data-message-id="message.id"
      :style="{ height: `${itemHeight}px` }"
    >
      <slot name="message" :message="message">
        <div class="message-content">
          <div class="message-header">
            <span class="message-role">{{ message.role }}</span>
            <span class="message-time">{{ formatTime(message.timestamp) }}</span>
          </div>
          <div class="message-text" v-html="renderMarkdown(message.content)" />
        </div>
      </slot>
    </div>
    
    <!-- Spacer for virtual scrolling -->
    <div 
      class="virtual-spacer-bottom" 
      :style="{ height: `${spacerBottom}px` }"
    />
    
    <!-- Loading indicator for streaming -->
    <div v-if="isStreaming" class="streaming-indicator">
      <slot name="streaming">
        <div class="streaming-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick, shallowRef } from 'vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useThrottleFn } from '@vueuse/core';
import { usePerformanceMonitor } from '@/utils/PerformanceMonitor';
import type { ChatMessage } from '@/types/chat';

interface Props {
  messages: ChatMessage[];
  isStreaming?: boolean;
  itemHeight?: number;
  bufferSize?: number;
  scrollBehavior?: 'auto' | 'smooth';
}

const props = withDefaults(defineProps<Props>(), {
  isStreaming: false,
  itemHeight: 100,
  bufferSize: 5,
  scrollBehavior: 'smooth'
});

const emit = defineEmits<{
  'scroll': [event: Event];
  'reach-top': [];
  'reach-bottom': [];
}>();

// Performance monitoring
const { recordRender } = usePerformanceMonitor();

// Refs
const containerRef = ref<HTMLElement>();
const scrollTop = ref(0);
const containerHeight = ref(0);
const isUserScrolling = ref(false);
const lastScrollTime = ref(0);

// Shallow ref for messages to prevent deep reactivity
const messagesShallow = shallowRef(props.messages);

// Update shallow ref when props change
watch(() => props.messages, (newMessages) => {
  messagesShallow.value = newMessages;
}, { immediate: true });

// Virtual scrolling calculations
const totalHeight = computed(() => messagesShallow.value.length * props.itemHeight);

const visibleRange = computed(() => {
  const start = Math.max(0, Math.floor(scrollTop.value / props.itemHeight) - props.bufferSize);
  const visibleCount = Math.ceil(containerHeight.value / props.itemHeight) + (props.bufferSize * 2);
  const end = Math.min(messagesShallow.value.length, start + visibleCount);
  
  return { start, end };
});

const visibleMessages = computed(() => {
  recordRender('OptimizedMessageList');
  return messagesShallow.value.slice(visibleRange.value.start, visibleRange.value.end);
});

const spacerTop = computed(() => visibleRange.value.start * props.itemHeight);
const spacerBottom = computed(() => 
  (messagesShallow.value.length - visibleRange.value.end) * props.itemHeight
);

const containerStyle = computed(() => ({
  height: '100%',
  overflow: 'auto',
  position: 'relative',
  contain: 'layout style paint',
  willChange: 'scroll-position'
}));

// Throttled scroll handler
const handleScroll = useThrottleFn((event: Event) => {
  const target = event.target as HTMLElement;
  scrollTop.value = target.scrollTop;
  lastScrollTime.value = Date.now();
  
  // Detect user scrolling
  const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
  isUserScrolling.value = !isNearBottom;
  
  emit('scroll', event);
  
  // Emit reach events
  if (target.scrollTop === 0) {
    emit('reach-top');
  } else if (isNearBottom) {
    emit('reach-bottom');
  }
}, 16); // ~60 FPS

// Auto-scroll to bottom when new messages arrive (if user is not scrolling)
watch(() => messagesShallow.value.length, async (newLength, oldLength) => {
  if (newLength > oldLength && !isUserScrolling.value) {
    await nextTick();
    scrollToBottom();
  }
});

// Scroll to bottom when streaming starts
watch(() => props.isStreaming, (isStreaming) => {
  if (isStreaming && !isUserScrolling.value) {
    scrollToBottom();
  }
});

// Utility functions
const scrollToBottom = () => {
  if (!containerRef.value) return;
  
  const behavior = props.scrollBehavior;
  containerRef.value.scrollTo({
    top: containerRef.value.scrollHeight,
    behavior
  });
};

const scrollToMessage = (messageId: string) => {
  const index = messagesShallow.value.findIndex(m => m.id === messageId);
  if (index === -1 || !containerRef.value) return;
  
  const targetScrollTop = index * props.itemHeight;
  containerRef.value.scrollTo({
    top: targetScrollTop,
    behavior: props.scrollBehavior
  });
};

// Markdown rendering with sanitization
const renderMarkdown = (content: string): string => {
  const html = marked(content, {
    breaks: true,
    gfm: true
  });
  return DOMPurify.sanitize(html as string);
};

// Time formatting
const formatTime = (timestamp: string | undefined): string => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('de-DE', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

// Resize observer for container height
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  if (containerRef.value) {
    containerHeight.value = containerRef.value.clientHeight;
    
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        containerHeight.value = entry.contentRect.height;
      }
    });
    
    resizeObserver.observe(containerRef.value);
    
    // Initial scroll to bottom
    if (!isUserScrolling.value) {
      scrollToBottom();
    }
  }
});

onUnmounted(() => {
  resizeObserver?.disconnect();
});

// Expose methods to parent
defineExpose({
  scrollToBottom,
  scrollToMessage
});
</script>

<style scoped>
.optimized-message-list {
  container-type: size;
  container-name: message-list;
}

.virtual-spacer-top,
.virtual-spacer-bottom {
  pointer-events: none;
}

.message-item {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
  contain: layout style paint;
}

.message-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
}

.message-role {
  font-weight: 600;
  text-transform: capitalize;
  color: var(--text-secondary, #6b7280);
}

.message-time {
  color: var(--text-tertiary, #9ca3af);
}

.message-text {
  color: var(--text-primary, #111827);
  line-height: 1.5;
  word-wrap: break-word;
}

/* Markdown content styling */
.message-text :deep(p) {
  margin: 0 0 0.5rem 0;
}

.message-text :deep(p:last-child) {
  margin-bottom: 0;
}

.message-text :deep(code) {
  background-color: var(--code-bg, #f3f4f6);
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-size: 0.875em;
}

.message-text :deep(pre) {
  background-color: var(--code-bg, #f3f4f6);
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  margin: 0.5rem 0;
}

/* Streaming indicator */
.streaming-indicator {
  padding: 16px;
  display: flex;
  justify-content: center;
}

.streaming-dots {
  display: flex;
  gap: 4px;
}

.streaming-dots span {
  width: 8px;
  height: 8px;
  background-color: var(--primary-color, #3b82f6);
  border-radius: 50%;
  animation: streaming-pulse 1.4s ease-in-out infinite;
}

.streaming-dots span:nth-child(1) {
  animation-delay: 0s;
}

.streaming-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.streaming-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes streaming-pulse {
  0%, 80%, 100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  40% {
    opacity: 1;
    transform: scale(1);
  }
}

/* Container queries for responsive design */
@container message-list (max-width: 480px) {
  .message-item {
    padding: 8px 12px;
  }
  
  .message-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style>