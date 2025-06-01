<template>
  <div
    ref="scrollContainer"
    class="optimized-message-list"
    :class="{
      'is-loading': isLoading,
      'is-empty': !isLoading && messages.length === 0,
    }"
    @scroll.passive="handleScroll"
  >
    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <div class="spinner" />
      <span>Loading messages...</span>
    </div>

    <!-- Empty State -->
    <div v-else-if="messages.length === 0" class="empty-state">
      <h2>{{ welcomeTitle }}</h2>
      <p>{{ welcomeMessage }}</p>
    </div>

    <!-- Virtual List Container -->
    <div v-else class="virtual-container" :style="virtualContainerStyle">
      <!-- Visible Messages Only -->
      <MessageItem
        v-for="item in visibleItems"
        :key="item.id"
        :message="item.data"
        :style="getItemStyle(item)"
        class="message-item"
        @feedback="$emit('feedback', $event)"
      />
    </div>

    <!-- Scroll to Bottom Button -->
    <Transition name="fade">
      <button
        v-if="showScrollButton"
        class="scroll-button"
        @click="scrollToBottom"
        aria-label="Scroll to bottom"
      >
        ↓
      </button>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  shallowRef,
  nextTick,
} from "vue";
import { useThrottleFn } from "@vueuse/core";
import type { ChatMessage } from "@/types/session";
import MessageItem from "./MessageItem.vue";
import { performanceMonitor } from "@/utils/PerformanceMonitor";

// Props
interface Props {
  messages: ChatMessage[];
  isLoading?: boolean;
  welcomeTitle?: string;
  welcomeMessage?: string;
  itemHeight?: number;
  overscan?: number;
  scrollThreshold?: number;
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  welcomeTitle: "Welcome to nscale Assistant",
  welcomeMessage: "How can I help you today?",
  itemHeight: 100,
  overscan: 5,
  scrollThreshold: 100,
});

// Emits
const emit = defineEmits<{
  feedback: [payload: { messageId: string; type: "positive" | "negative" }];
  loadMore: [direction: "up" | "down"];
}>();

// Refs
const scrollContainer = ref<HTMLElement>();
const isAtBottom = ref(true);
const showScrollButton = ref(false);

// Virtual scrolling state
const scrollTop = ref(0);
const containerHeight = ref(0);
const totalHeight = computed(() => props.messages.length * props.itemHeight);

// Item positioning with shallow ref for performance
const itemPositions = shallowRef<Map<string, { top: number; height: number }>>(
  new Map(),
);

// Calculate visible range with memoization
const visibleRange = computed(() => {
  const start = Math.floor(scrollTop.value / props.itemHeight);
  const visibleCount = Math.ceil(containerHeight.value / props.itemHeight);
  const end = start + visibleCount;

  return {
    start: Math.max(0, start - props.overscan),
    end: Math.min(props.messages.length, end + props.overscan),
  };
});

// Get visible items
const visibleItems = computed(() => {
  const { start, end } = visibleRange.value;

  return props.messages.slice(start, end).map((message, index) => ({
    id: message.id,
    index: start + index,
    data: message,
    top: (start + index) * props.itemHeight,
    height: props.itemHeight,
  }));
});

// Virtual container style
const virtualContainerStyle = computed(() => ({
  height: `${totalHeight.value}px`,
  position: "relative",
}));

// Get item style for absolute positioning
function getItemStyle(item: (typeof visibleItems.value)[0]) {
  return {
    position: "absolute",
    top: `${item.top}px`,
    left: 0,
    right: 0,
    height: `${item.height}px`,
    contain: "layout style paint",
  };
}

// Throttled scroll handler for performance
const handleScroll = useThrottleFn((event: Event) => {
  if (!scrollContainer.value) return;

  const container = scrollContainer.value;
  scrollTop.value = container.scrollTop;

  // Check if at bottom
  const scrollBottom = container.scrollTop + container.clientHeight;
  const isNearBottom =
    container.scrollHeight - scrollBottom < props.scrollThreshold;

  isAtBottom.value = isNearBottom;
  showScrollButton.value = !isNearBottom && container.scrollTop > 500;

  // Emit load more events
  if (container.scrollTop < props.scrollThreshold) {
    emit("loadMore", "up");
  } else if (isNearBottom) {
    emit("loadMore", "down");
  }
}, 16); // ~60fps

// Scroll to bottom
function scrollToBottom(smooth = true) {
  if (!scrollContainer.value) return;

  scrollContainer.value.scrollTo({
    top: scrollContainer.value.scrollHeight,
    behavior: smooth ? "smooth" : "auto",
  });
}

// Update container dimensions
function updateContainerDimensions() {
  if (!scrollContainer.value) return;

  containerHeight.value = scrollContainer.value.clientHeight;
}

// Intersection Observer for better performance
let resizeObserver: ResizeObserver | null = null;

// Watch for new messages and auto-scroll
watch(
  () => props.messages.length,
  (newLength, oldLength) => {
    if (newLength > oldLength && isAtBottom.value) {
      nextTick(() => {
        scrollToBottom();
      });
    }
  },
);

// Watch for streaming messages
watch(
  () => props.messages[props.messages.length - 1]?.isStreaming,
  (isStreaming) => {
    if (isStreaming && isAtBottom.value) {
      // Use RAF for smooth scrolling during streaming
      requestAnimationFrame(() => {
        scrollToBottom(false);
      });
    }
  },
);

// Lifecycle
onMounted(() => {
  updateContainerDimensions();

  // Setup resize observer
  if (scrollContainer.value) {
    resizeObserver = new ResizeObserver(() => {
      updateContainerDimensions();
    });
    resizeObserver.observe(scrollContainer.value);
  }

  // Initial scroll to bottom
  nextTick(() => {
    scrollToBottom(false);
  });
});

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});

// Performance tracking
if (process.env.NODE_ENV === "development") {
  watch(visibleItems, () => {
    performanceMonitor.measureComponentRender("OptimizedMessageList", () => {
      // Render measurement happens automatically
    });
  });
}
</script>

<style scoped>
.optimized-message-list {
  position: relative;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior-y: contain;
  -webkit-overflow-scrolling: touch;
  will-change: transform;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 1rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e2e8f0;
  border-top-color: #00a550;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  padding: 2rem;
}

.empty-state h2 {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
  color: #1a202c;
}

.empty-state p {
  color: #64748b;
  max-width: 400px;
}

/* Virtual Container */
.virtual-container {
  position: relative;
  width: 100%;
}

/* Message Item */
.message-item {
  contain: layout style paint;
  will-change: transform;
}

/* Scroll Button */
.scroll-button {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #00a550;
  color: white;
  border: none;
  font-size: 24px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.2s ease;
  z-index: 100;
}

.scroll-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.scroll-button:active {
  transform: translateY(0);
}

/* Animations */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Performance Optimizations */
@media (prefers-reduced-motion: reduce) {
  .optimized-message-list {
    scroll-behavior: auto;
  }

  .scroll-button {
    transition: none;
  }
}

/* Mobile Optimizations */
@media (max-width: 768px) {
  .optimized-message-list {
    /* Enable momentum scrolling on iOS */
    -webkit-overflow-scrolling: touch;

    /* Prevent rubber-band scrolling */
    overscroll-behavior-y: contain;
  }

  .scroll-button {
    bottom: 1rem;
    right: 1rem;
    width: 40px;
    height: 40px;
    font-size: 20px;
  }
}
</style>
