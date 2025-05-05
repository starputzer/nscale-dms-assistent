<template>
  <div v-if="show" class="source-dialog-overlay" @click="closeOnBackdrop && close()">
    <div class="source-dialog" @click.stop>
      <div class="source-dialog-header">
        <h2 class="source-dialog-title">{{ title }}</h2>
        <button class="source-dialog-close" @click="close" aria-label="Schließen">
          <font-awesome-icon icon="times" />
        </button>
      </div>
      
      <div class="source-dialog-content">
        <slot>
          <p v-if="loading" class="source-dialog-loading">
            <span class="spinner"></span>
            <span>Quellen werden geladen...</span>
          </p>
          <div v-else>
            <SourceReferenceList 
              :sources="sources" 
              :loading="loading"
              title=""
            />
          </div>
        </slot>
      </div>
      
      <div class="source-dialog-footer">
        <slot name="footer">
          <button class="primary-button" @click="close">Schließen</button>
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import SourceReferenceList from './SourceReferenceList.vue';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  sources: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: 'Quellen'
  },
  closeOnBackdrop: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['close']);

// ESC-Taste zum Schließen abfangen
function handleKeyDown(event) {
  if (event.key === 'Escape' && props.show) {
    close();
  }
}

// Dialog schließen
function close() {
  emit('close');
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown);
  if (props.show) {
    document.body.style.overflow = 'hidden'; // Scrolling verhindern
  }
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeyDown);
  document.body.style.overflow = ''; // Scrolling wiederherstellen
});

// Scrolling verhindern, wenn Dialog geöffnet wird
watch(() => props.show, (newVal) => {
  if (newVal) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
});
</script>

<style scoped>
.source-dialog-overlay {
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
  padding: 1.25rem;
}

.source-dialog {
  background-color: var(--card-bg, white);
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
  width: 100%;
  max-width: 800px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.source-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
}

.source-dialog-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary, #111827);
  margin: 0;
}

.source-dialog-close {
  background: transparent;
  border: none;
  font-size: 1.25rem;
  color: var(--text-secondary, #6b7280);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: background-color 0.2s, color 0.2s;
}

.source-dialog-close:hover {
  color: var(--text-primary, #111827);
  background-color: var(--button-bg-subtle-hover, #f3f4f6);
}

.source-dialog-content {
  padding: 1.25rem;
  overflow-y: auto;
  flex: 1;
}

.source-dialog-footer {
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--border-color, #e5e7eb);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.primary-button {
  padding: 0.5rem 1rem;
  background-color: var(--primary-color, #2563eb);
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.primary-button:hover {
  background-color: var(--primary-color-hover, #1d4ed8);
}

.source-dialog-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 2rem 0;
  color: var(--text-secondary, #6b7280);
}

.spinner {
  width: 1.5rem;
  height: 1.5rem;
  border: 0.25rem solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: var(--primary-color, #2563eb);
  animation: spin 1s ease-in-out infinite;
  display: inline-block;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-color-scheme: dark) {
  .spinner {
    border-color: rgba(255, 255, 255, 0.1);
    border-top-color: var(--primary-color, #3b82f6);
  }
}
</style>