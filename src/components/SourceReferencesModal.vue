<template>
  <div
    v-if="showModal"
    class="source-modal-overlay"
    @click.self="closeModal"
    aria-modal="true"
    role="dialog"
  >
    <div class="source-modal">
      <div class="source-modal-header">
        <h3 class="source-modal-title">{{ title }}</h3>
        <button
          class="source-modal-close"
          @click="closeModal"
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
      <div class="source-modal-body">
        <div v-if="isLoading" class="source-loading">
          <div class="source-loading-spinner"></div>
          <span>Lade Quellen...</span>
        </div>
        <div v-else-if="!sources.length" class="source-empty">
          Keine Quellen für diese Nachricht verfügbar.
        </div>
        <div v-else class="source-list">
          <div
            v-for="(source, index) in sources"
            :key="source.id || index"
            class="source-item"
          >
            <div class="source-item-header">
              <h4 class="source-item-title">
                {{ source.title || `Quelle ${index + 1}` }}
              </h4>
              <button
                class="source-item-toggle"
                @click="toggleSource(source.id, index)"
                :aria-expanded="isOpen(source.id, index)"
                :aria-controls="`source-content-${source.id || index}`"
              >
                <svg
                  v-if="isOpen(source.id, index)"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="18 15 12 9 6 15"></polyline>
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
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            </div>
            <div class="source-item-meta">
              <div class="source-item-from">
                {{ source.source || "Unbekannte Quelle" }}
              </div>
              <div v-if="source.relevanceScore" class="source-item-relevance">
                Relevanz: {{ (source.relevanceScore * 100).toFixed(0) }}%
              </div>
            </div>
            <div
              v-show="isOpen(source.id, index)"
              :id="`source-content-${source.id || index}`"
              class="source-item-content"
            >
              <div class="source-item-text">
                {{ source.content || "Kein Inhalt verfügbar" }}
              </div>
              <div
                v-if="source.url || source.pageNumber"
                class="source-item-footer"
              >
                <a
                  v-if="source.url"
                  :href="source.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="source-item-link"
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
                <div v-if="source.pageNumber" class="source-item-page">
                  Seite {{ source.pageNumber }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="source-modal-footer">
        <button class="source-modal-btn" @click="closeModal">Schließen</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type { SourceReference } from "@/types/session";
import { useSourcesStore } from "@/stores/sources";

const props = defineProps<{
  showModal: boolean;
  title?: string;
  sources: SourceReference[];
  messageId?: string;
  isLoading?: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

// State management
const sourcesStore = useSourcesStore();
const openSources = ref<Record<string, boolean>>({});

// Computed properties
const computedTitle = computed(() => {
  return props.title || "Quellenreferenzen";
});

// Watch for changes to showModal
watch(
  () => props.showModal,
  (newValue) => {
    if (newValue && props.sources.length > 0) {
      // Automatically open the first source when modal opens
      const firstSource = props.sources[0];
      if (firstSource) {
        toggleSource(firstSource.id, 0, true);
      }
    }
  },
);

// Check if a source is open
function isOpen(sourceId: string, index: number): boolean {
  const key = sourceId || `index-${index}`;
  return !!openSources.value[key];
}

// Toggle a source's open state
function toggleSource(
  sourceId: string,
  index: number,
  forceOpen?: boolean,
): void {
  const key = sourceId || `index-${index}`;
  if (forceOpen !== undefined) {
    openSources.value = {
      ...openSources.value,
      [key]: forceOpen,
    };
  } else {
    openSources.value = {
      ...openSources.value,
      [key]: !openSources.value[key],
    };
  }
}

// Close the modal
function closeModal(): void {
  openSources.value = {};
  emit("close");
}
</script>

<style scoped>
.source-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 1rem;
}

.source-modal {
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  background-color: var(--nscale-background, #ffffff);
  border-radius: 0.5rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.source-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--nscale-border, #e5e7eb);
}

.source-modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--nscale-text, #1f2937);
  margin: 0;
}

.source-modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  background: none;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  color: var(--nscale-text-light, #6b7280);
  transition: background-color 0.2s;
}

.source-modal-close:hover {
  background-color: var(--nscale-hover, rgba(0, 0, 0, 0.05));
  color: var(--nscale-text, #1f2937);
}

.source-modal-close svg {
  width: 1.25rem;
  height: 1.25rem;
}

.source-modal-body {
  padding: 1rem;
  overflow-y: auto;
  flex: 1;
}

.source-loading,
.source-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: var(--nscale-text-light, #6b7280);
  text-align: center;
}

.source-loading-spinner {
  width: 2.5rem;
  height: 2.5rem;
  border: 0.25rem solid var(--nscale-border, #e5e7eb);
  border-top-color: var(--nscale-green, #10b981);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

.source-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.source-item {
  border: 1px solid var(--nscale-border, #e5e7eb);
  border-radius: 0.375rem;
  overflow: hidden;
}

.source-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background-color: var(--nscale-background-alt, #f9fafb);
  border-bottom: 1px solid var(--nscale-border, #e5e7eb);
}

.source-item-title {
  font-size: 1rem;
  font-weight: 500;
  color: var(--nscale-text, #1f2937);
  margin: 0;
}

.source-item-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  background: none;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  color: var(--nscale-text-light, #6b7280);
  transition: background-color 0.2s;
}

.source-item-toggle:hover {
  background-color: var(--nscale-hover, rgba(0, 0, 0, 0.05));
  color: var(--nscale-text, #1f2937);
}

.source-item-toggle svg {
  width: 1rem;
  height: 1rem;
}

.source-item-meta {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  color: var(--nscale-text-light, #6b7280);
  background-color: var(--nscale-background-alt, #f9fafb);
}

.source-item-from {
  font-style: italic;
}

.source-item-relevance {
  font-weight: 500;
}

.source-item-content {
  padding: 1rem;
  background-color: var(--nscale-background, #ffffff);
}

.source-item-text {
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--nscale-text, #1f2937);
  white-space: pre-line;
}

.source-item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--nscale-border, #e5e7eb);
  font-size: 0.875rem;
}

.source-item-link {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  color: var(--nscale-green, #10b981);
  text-decoration: none;
  font-weight: 500;
}

.source-item-link:hover {
  text-decoration: underline;
}

.source-item-link svg {
  width: 0.875rem;
  height: 0.875rem;
}

.source-item-page {
  color: var(--nscale-text-light, #6b7280);
}

.source-modal-footer {
  display: flex;
  justify-content: flex-end;
  padding: 1rem;
  border-top: 1px solid var(--nscale-border, #e5e7eb);
}

.source-modal-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  background-color: var(--nscale-background-alt, #f9fafb);
  border: 1px solid var(--nscale-border, #e5e7eb);
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--nscale-text, #1f2937);
  cursor: pointer;
  transition: background-color 0.2s;
}

.source-modal-btn:hover {
  background-color: var(--nscale-hover, rgba(0, 0, 0, 0.05));
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .source-modal {
    background-color: var(--nscale-dark-background, #1f2937);
  }

  .source-modal-header {
    border-bottom-color: var(--nscale-dark-border, #374151);
  }

  .source-modal-title {
    color: var(--nscale-dark-text, #f9fafb);
  }

  .source-modal-close {
    color: var(--nscale-dark-text-light, #9ca3af);
  }

  .source-modal-close:hover {
    background-color: var(--nscale-dark-hover, rgba(255, 255, 255, 0.05));
    color: var(--nscale-dark-text, #f9fafb);
  }

  .source-loading,
  .source-empty {
    color: var(--nscale-dark-text-light, #9ca3af);
  }

  .source-loading-spinner {
    border-color: var(--nscale-dark-border, #374151);
    border-top-color: var(--nscale-dark-green, #10b981);
  }

  .source-item {
    border-color: var(--nscale-dark-border, #374151);
  }

  .source-item-header {
    background-color: var(--nscale-dark-background-alt, #111827);
    border-bottom-color: var(--nscale-dark-border, #374151);
  }

  .source-item-title {
    color: var(--nscale-dark-text, #f9fafb);
  }

  .source-item-toggle {
    color: var(--nscale-dark-text-light, #9ca3af);
  }

  .source-item-toggle:hover {
    background-color: var(--nscale-dark-hover, rgba(255, 255, 255, 0.05));
    color: var(--nscale-dark-text, #f9fafb);
  }

  .source-item-meta {
    color: var(--nscale-dark-text-light, #9ca3af);
    background-color: var(--nscale-dark-background-alt, #111827);
  }

  .source-item-content {
    background-color: var(--nscale-dark-background, #1f2937);
  }

  .source-item-text {
    color: var(--nscale-dark-text, #f9fafb);
  }

  .source-item-footer {
    border-top-color: var(--nscale-dark-border, #374151);
  }

  .source-item-link {
    color: var(--nscale-dark-green, #10b981);
  }

  .source-item-page {
    color: var(--nscale-dark-text-light, #9ca3af);
  }

  .source-modal-footer {
    border-top-color: var(--nscale-dark-border, #374151);
  }

  .source-modal-btn {
    background-color: var(--nscale-dark-background-alt, #111827);
    border-color: var(--nscale-dark-border, #374151);
    color: var(--nscale-dark-text, #f9fafb);
  }

  .source-modal-btn:hover {
    background-color: var(--nscale-dark-hover, rgba(255, 255, 255, 0.05));
  }
}
</style>
