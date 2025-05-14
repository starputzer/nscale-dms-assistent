<template>
  <div 
    v-if="show" 
    ref="popupRef" 
    class="source-popup"
    :style="{ top: `${position.top}px`, left: `${position.left}px` }"
  >
    <div class="source-popup-header">
      <div class="source-popup-title">{{ content.title }}</div>
      <button 
        class="source-popup-close-btn" 
        @click="close" 
        aria-label="Schließen"
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
    
    <div v-if="content.file" class="source-popup-file">
      Quelle: {{ content.file }}
    </div>
    
    <div class="source-popup-content">
      {{ content.text }}
    </div>
    
    <div class="source-popup-actions">
      <button 
        class="source-popup-btn"
        @click="showDetails"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          <line x1="11" y1="8" x2="11" y2="14"></line>
          <line x1="8" y1="11" x2="14" y2="11"></line>
        </svg>
        Mehr Details
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { useSourcesStore } from '@/stores/sources';

const props = defineProps<{
  show: boolean;
  position: {
    top: number;
    left: number;
  };
  content: {
    title: string;
    text: string;
    sourceId: string;
    file?: string;
  };
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'show-details', sourceId: string): void;
}>();

const popupRef = ref<HTMLElement | null>(null);
const sourcesStore = useSourcesStore();

// Adjust position to ensure popup stays within viewport
function adjustPosition() {
  if (!popupRef.value) return;
  
  const popup = popupRef.value;
  const rect = popup.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  let newTop = props.position.top;
  let newLeft = props.position.left;
  
  // Adjust horizontally if needed
  if (rect.right > viewportWidth) {
    newLeft = viewportWidth - rect.width - 10;
  }
  
  // Adjust vertically if needed
  if (rect.bottom > viewportHeight) {
    newTop = props.position.top - rect.height - 10;
  }
  
  // Apply adjusted position if different
  if (newTop !== props.position.top || newLeft !== props.position.left) {
    popup.style.top = `${newTop}px`;
    popup.style.left = `${newLeft}px`;
  }
}

// Handle click outside the popup to close it
function handleClickOutside(event: MouseEvent) {
  if (popupRef.value && !popupRef.value.contains(event.target as Node)) {
    close();
  }
}

// Handle escape key to close the popup
function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    close();
  }
}

// Close the popup
function close() {
  emit('close');
}

// Show more details for this source
function showDetails() {
  emit('show-details', props.content.sourceId);
  close();
}

// Watch for changes to the show prop
watch(() => props.show, (newVal) => {
  if (newVal) {
    // Add click and keydown event listeners when popup is shown
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      adjustPosition();
    }, 0);
  } else {
    // Remove event listeners when popup is hidden
    document.removeEventListener('click', handleClickOutside);
    document.removeEventListener('keydown', handleKeyDown);
  }
});

// Setup and cleanup event listeners
onMounted(() => {
  if (props.show) {
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    setTimeout(adjustPosition, 0);
  }
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
.source-popup {
  position: absolute;
  z-index: 1000;
  background-color: var(--nscale-background, white);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  width: 320px;
  max-width: calc(100vw - 40px);
  animation: fadeIn 0.2s ease-out;
  border: 1px solid var(--nscale-border, #e5e7eb);
}

.source-popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--nscale-border, #e5e7eb);
}

.source-popup-title {
  font-weight: 600;
  color: var(--nscale-text, #1f2937);
  font-size: 0.95rem;
}

.source-popup-close-btn {
  background: none;
  border: none;
  padding: 4px;
  border-radius: 4px;
  cursor: pointer;
  color: var(--nscale-text-light, #6b7280);
  display: flex;
  align-items: center;
  justify-content: center;
}

.source-popup-close-btn:hover {
  background-color: var(--nscale-hover, rgba(0, 0, 0, 0.05));
  color: var(--nscale-text, #1f2937);
}

.source-popup-close-btn svg {
  width: 16px;
  height: 16px;
}

.source-popup-file {
  font-size: 0.8rem;
  color: var(--nscale-text-light, #6b7280);
  padding: 4px 16px 0;
  font-style: italic;
}

.source-popup-content {
  padding: 12px 16px;
  max-height: 200px;
  overflow-y: auto;
  color: var(--nscale-text, #1f2937);
  font-size: 0.9rem;
  line-height: 1.5;
}

.source-popup-actions {
  display: flex;
  justify-content: flex-end;
  padding: 8px 16px 12px;
  border-top: 1px solid var(--nscale-border, #e5e7eb);
}

.source-popup-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 4px;
  background-color: var(--nscale-background-alt, #f3f4f6);
  border: 1px solid var(--nscale-border, #e5e7eb);
  color: var(--nscale-text, #1f2937);
  font-size: 0.8rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.source-popup-btn:hover {
  background-color: var(--nscale-hover, rgba(0, 0, 0, 0.05));
}

.source-popup-btn svg {
  width: 14px;
  height: 14px;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .source-popup {
    background-color: var(--nscale-dark-background, #1f2937);
    border-color: var(--nscale-dark-border, #374151);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .source-popup-header {
    border-bottom-color: var(--nscale-dark-border, #374151);
  }

  .source-popup-title {
    color: var(--nscale-dark-text, #f9fafb);
  }

  .source-popup-close-btn {
    color: var(--nscale-dark-text-light, #9ca3af);
  }

  .source-popup-close-btn:hover {
    background-color: var(--nscale-dark-hover, rgba(255, 255, 255, 0.05));
    color: var(--nscale-dark-text, #f9fafb);
  }

  .source-popup-file {
    color: var(--nscale-dark-text-light, #9ca3af);
  }

  .source-popup-content {
    color: var(--nscale-dark-text, #f9fafb);
  }

  .source-popup-actions {
    border-top-color: var(--nscale-dark-border, #374151);
  }

  .source-popup-btn {
    background-color: var(--nscale-dark-background-alt, #111827);
    border-color: var(--nscale-dark-border, #374151);
    color: var(--nscale-dark-text, #f9fafb);
  }

  .source-popup-btn:hover {
    background-color: var(--nscale-dark-hover, rgba(255, 255, 255, 0.05));
  }
}
</style>