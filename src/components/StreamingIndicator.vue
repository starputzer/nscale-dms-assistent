<template>
  <div v-if="visible" class="streaming-indicator" :class="indicatorClass">
    <!-- Connection Status -->
    <div class="streaming-status">
      <div class="status-icon" :class="statusIconClass">
        <span v-if="connectionState === 'connected'">●</span>
        <span v-else-if="connectionState === 'connecting'">⟳</span>
        <span v-else-if="connectionState === 'reconnecting'">↻</span>
        <span v-else-if="connectionState === 'error'">⚠</span>
        <span v-else>○</span>
      </div>

      <div class="status-text">
        <span v-if="connectionState === 'connected' && !isStreaming"
          >Verbunden</span
        >
        <span v-else-if="connectionState === 'connecting'">Verbinde...</span>
        <span v-else-if="connectionState === 'reconnecting'">
          Erneut verbinden ({{ reconnectAttempt }}/{{ maxReconnectAttempts }})
        </span>
        <span v-else-if="connectionState === 'error'">Verbindungsfehler</span>
        <span v-else-if="isStreaming && showThinking">KI denkt nach...</span>
        <span v-else-if="isStreaming">KI antwortet...</span>
        <span v-else>Getrennt</span>
      </div>
    </div>

    <!-- Progress Bar -->
    <div v-if="showProgress && isStreaming" class="streaming-progress">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: `${progress}%` }" />
      </div>
      <div class="progress-info">
        <span class="progress-percent">{{ Math.round(progress) }}%</span>
        <span v-if="estimatedTime" class="progress-time">
          ~{{ estimatedTimeRemaining }}
        </span>
      </div>
    </div>

    <!-- Metadata Display -->
    <div v-if="showMetadata && metadata" class="streaming-metadata">
      <div v-if="metadata.model" class="metadata-item">
        <span class="metadata-label">Model:</span>
        <span class="metadata-value">{{ metadata.model }}</span>
      </div>
      <div
        v-if="metadata.tools && metadata.tools.length > 0"
        class="metadata-item"
      >
        <span class="metadata-label">Tools:</span>
        <span class="metadata-value">{{ metadata.tools.join(", ") }}</span>
      </div>
      <div v-if="tokenCount > 0" class="metadata-item">
        <span class="metadata-label">Tokens:</span>
        <span class="metadata-value">{{ tokenCount }}</span>
      </div>
    </div>

    <!-- Connection Quality -->
    <div v-if="showQuality" class="connection-quality">
      <div class="quality-indicator" :class="`quality--${connectionQuality}`">
        <span class="quality-bar"></span>
        <span class="quality-bar"></span>
        <span class="quality-bar"></span>
        <span class="quality-bar"></span>
      </div>
      <span class="quality-text">{{ qualityText }}</span>
    </div>

    <!-- Thinking Animation -->
    <div
      v-if="isStreaming && showThinking && !hasTokens"
      class="thinking-animation"
    >
      <div class="thinking-dot"></div>
      <div class="thinking-dot"></div>
      <div class="thinking-dot"></div>
    </div>

    <!-- Actions -->
    <div v-if="showActions" class="streaming-actions">
      <button
        v-if="connectionState === 'error' || connectionState === 'disconnected'"
        @click="$emit('retry')"
        class="action-btn retry-btn"
        title="Erneut versuchen"
      >
        ↻
      </button>
      <button
        v-if="isStreaming"
        @click="$emit('stop')"
        class="action-btn stop-btn"
        title="Stoppen"
      >
        ◼
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { StreamingMetadata } from "@/services/EnhancedEventSource";

interface Props {
  visible?: boolean;
  isStreaming?: boolean;
  connectionState?:
    | "disconnected"
    | "connecting"
    | "connected"
    | "reconnecting"
    | "error";
  progress?: number;
  estimatedTime?: string;
  metadata?: StreamingMetadata | null;
  tokenCount?: number;
  connectionQuality?: "excellent" | "good" | "poor" | "disconnected";
  reconnectAttempt?: number;
  maxReconnectAttempts?: number;
  showProgress?: boolean;
  showMetadata?: boolean;
  showQuality?: boolean;
  showActions?: boolean;
  showThinking?: boolean;
  hasTokens?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  visible: true,
  isStreaming: false,
  connectionState: "disconnected",
  progress: 0,
  estimatedTime: "",
  metadata: null,
  tokenCount: 0,
  connectionQuality: "disconnected",
  reconnectAttempt: 0,
  maxReconnectAttempts: 5,
  showProgress: true,
  showMetadata: false,
  showQuality: false,
  showActions: true,
  showThinking: true,
  hasTokens: false,
});

const emit = defineEmits<{
  retry: [];
  stop: [];
}>();

// Computed
const indicatorClass = computed(() => ({
  "streaming-indicator--connected": props.connectionState === "connected",
  "streaming-indicator--error": props.connectionState === "error",
  "streaming-indicator--streaming": props.isStreaming,
}));

const statusIconClass = computed(() => ({
  "status-icon--connected": props.connectionState === "connected",
  "status-icon--connecting": props.connectionState === "connecting",
  "status-icon--error": props.connectionState === "error",
  "status-icon--animated":
    props.connectionState === "connecting" ||
    props.connectionState === "reconnecting",
}));

const estimatedTimeRemaining = computed(() => {
  return props.estimatedTime || "—";
});

const qualityText = computed(() => {
  switch (props.connectionQuality) {
    case "excellent":
      return "Excellent";
    case "good":
      return "Gut";
    case "poor":
      return "Schlecht";
    default:
      return "Offline";
  }
});
</script>

<style scoped lang="scss">
.streaming-indicator {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: var(--streaming-bg, rgba(59, 130, 246, 0.05));
  border: 1px solid var(--streaming-border, rgba(59, 130, 246, 0.2));
  border-radius: 0.5rem;
  font-size: 0.875rem;
  transition: all 0.3s ease;

  &.streaming-indicator--connected {
    border-color: rgba(34, 197, 94, 0.3);
    background: rgba(34, 197, 94, 0.05);
  }

  &.streaming-indicator--error {
    border-color: rgba(239, 68, 68, 0.3);
    background: rgba(239, 68, 68, 0.05);
  }

  &.streaming-indicator--streaming {
    animation: pulse 2s ease-in-out infinite;
  }
}

// Status Section
.streaming-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-icon {
  font-size: 1rem;
  line-height: 1;

  &.status-icon--connected {
    color: #22c55e;
  }

  &.status-icon--error {
    color: #ef4444;
  }

  &.status-icon--animated {
    animation: spin 1s linear infinite;
  }
}

.status-text {
  color: var(--text-secondary, #6b7280);
  white-space: nowrap;
}

// Progress Section
.streaming-progress {
  flex: 1;
  min-width: 0;
}

.progress-bar {
  height: 4px;
  background: var(--progress-bg, rgba(0, 0, 0, 0.1));
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 0.25rem;
}

.progress-fill {
  height: 100%;
  background: var(--progress-fill, #3b82f6);
  transition: width 0.3s ease;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--text-tertiary, #9ca3af);
}

// Metadata Section
.streaming-metadata {
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
  color: var(--text-secondary, #6b7280);
}

.metadata-item {
  display: flex;
  gap: 0.25rem;
}

.metadata-label {
  opacity: 0.7;
}

.metadata-value {
  font-weight: 500;
}

// Connection Quality
.connection-quality {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.quality-indicator {
  display: flex;
  gap: 2px;
  align-items: flex-end;
}

.quality-bar {
  width: 3px;
  background: var(--quality-bar, #d1d5db);
  transition: all 0.3s ease;

  &:nth-child(1) {
    height: 6px;
  }
  &:nth-child(2) {
    height: 9px;
  }
  &:nth-child(3) {
    height: 12px;
  }
  &:nth-child(4) {
    height: 15px;
  }
}

.quality--excellent .quality-bar {
  background: #22c55e;
}

.quality--good {
  .quality-bar:nth-child(1),
  .quality-bar:nth-child(2),
  .quality-bar:nth-child(3) {
    background: #fbbf24;
  }
}

.quality--poor {
  .quality-bar:nth-child(1),
  .quality-bar:nth-child(2) {
    background: #ef4444;
  }
}

.quality-text {
  font-size: 0.75rem;
  color: var(--text-tertiary, #9ca3af);
}

// Thinking Animation
.thinking-animation {
  display: flex;
  gap: 4px;
}

.thinking-dot {
  width: 6px;
  height: 6px;
  background: var(--thinking-dot, #3b82f6);
  border-radius: 50%;
  animation: thinking-pulse 1.4s ease-in-out infinite;

  &:nth-child(2) {
    animation-delay: 0.2s;
  }
  &:nth-child(3) {
    animation-delay: 0.4s;
  }
}

// Actions
.streaming-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  padding: 0.25rem 0.5rem;
  background: transparent;
  border: 1px solid currentColor;
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s ease;

  &:hover {
    background: currentColor;
    color: white;
  }

  &.retry-btn {
    color: #3b82f6;
  }

  &.stop-btn {
    color: #ef4444;
  }
}

// Animations
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes thinking-pulse {
  0%,
  80%,
  100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  40% {
    opacity: 1;
    transform: scale(1);
  }
}

// Dark mode
@media (prefers-color-scheme: dark) {
  .streaming-indicator {
    --streaming-bg: rgba(59, 130, 246, 0.1);
    --streaming-border: rgba(59, 130, 246, 0.3);
    --text-secondary: #d1d5db;
    --text-tertiary: #9ca3af;
    --progress-bg: rgba(255, 255, 255, 0.1);
    --quality-bar: #4b5563;
  }
}
</style>
