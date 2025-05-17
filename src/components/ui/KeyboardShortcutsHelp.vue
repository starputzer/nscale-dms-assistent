<template>
  <Teleport to="body">
    <transition name="n-shortcuts-fade">
      <div
        v-if="isOpen"
        class="n-shortcuts-overlay"
        @click="closeIfClickedOutside"
        @keydown.esc="close"
      >
        <FocusTrap :active="isOpen">
          <div
            class="n-shortcuts-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shortcuts-title"
          >
            <div class="n-shortcuts-header">
              <h2 id="shortcuts-title" class="n-shortcuts-title">
                Tastaturkürzel
              </h2>
              <button
                type="button"
                class="n-shortcuts-close"
                @click="close"
                aria-label="Tastaturkürzel-Hilfe schließen"
              >
                <span class="n-shortcuts-close-icon" aria-hidden="true">×</span>
              </button>
            </div>

            <div v-if="shortcuts.length === 0" class="n-shortcuts-empty">
              <p>Keine Tastaturkürzel verfügbar.</p>
            </div>

            <div v-else class="n-shortcuts-content">
              <div
                v-for="(group, context) in groupedShortcuts"
                :key="context"
                class="n-shortcuts-group"
              >
                <h3 class="n-shortcuts-group-title">
                  {{ getContextTitle(context) }}
                </h3>
                <ul class="n-shortcuts-list">
                  <li
                    v-for="shortcut in group"
                    :key="shortcut.id"
                    class="n-shortcuts-item"
                  >
                    <span class="n-shortcuts-desc">{{
                      shortcut.description
                    }}</span>
                    <kbd class="n-shortcuts-kbd">{{
                      formatShortcut(shortcut)
                    }}</kbd>
                  </li>
                </ul>
              </div>
            </div>

            <div class="n-shortcuts-footer">
              <button type="button" class="n-shortcuts-btn" @click="close">
                Schließen
              </button>
            </div>
          </div>
        </FocusTrap>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import FocusTrap from "./base/FocusTrap.vue";
import {
  ShortcutDefinition,
  formatShortcut as formatShortcutHelper,
  SHORTCUT_CONTEXTS,
} from "@/utils/keyboardShortcutsManager";

/**
 * Keyboard shortcuts help overlay that shows available shortcuts
 * @displayName KeyboardShortcutsHelp
 */
export interface Props {
  /** Whether the overlay is open */
  open: boolean;
  /** List of shortcuts to display */
  shortcuts: ShortcutDefinition[];
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: "update:open", value: boolean): void;
  (e: "close"): void;
}>();

const isOpen = ref(props.open);
const panel = ref<HTMLElement | null>(null);

// Update local state when props change
watch(
  () => props.open,
  (newValue) => {
    isOpen.value = newValue;
  },
);

// Group shortcuts by context
const groupedShortcuts = computed(() => {
  return props.shortcuts.reduce(
    (groups: Record<string, ShortcutDefinition[]>, shortcut) => {
      const context = shortcut.context || "other";
      if (!groups[context]) {
        groups[context] = [];
      }
      groups[context].push(shortcut);
      return groups;
    },
    {},
  );
});

// Get a human-readable title for each context
function getContextTitle(context: string): string {
  switch (context) {
    case SHORTCUT_CONTEXTS.GLOBAL:
      return "Globale Shortcuts";
    case SHORTCUT_CONTEXTS.CHAT:
      return "Chat";
    case SHORTCUT_CONTEXTS.DOCUMENT_CONVERTER:
      return "Dokumentenkonverter";
    case SHORTCUT_CONTEXTS.ADMIN:
      return "Administration";
    case SHORTCUT_CONTEXTS.SETTINGS:
      return "Einstellungen";
    default:
      return context.charAt(0).toUpperCase() + context.slice(1);
  }
}

// Format a shortcut for display
function formatShortcut(shortcut: ShortcutDefinition): string {
  return formatShortcutHelper(shortcut);
}

// Close the overlay
function close(): void {
  isOpen.value = false;
  emit("update:open", false);
  emit("close");
}

// Close if clicked outside the panel
function closeIfClickedOutside(event: MouseEvent): void {
  if (event.target === event.currentTarget) {
    close();
  }
}

// Handle the ? key to toggle the shortcuts overlay
function handleQuestionMarkKey(event: KeyboardEvent): void {
  if (event.key === "?" && !event.altKey && !event.ctrlKey && !event.metaKey) {
    // Don't trigger if in an input field
    if (
      document.activeElement instanceof HTMLInputElement ||
      document.activeElement instanceof HTMLTextAreaElement ||
      (document.activeElement as HTMLElement)?.isContentEditable
    ) {
      return;
    }

    event.preventDefault();
    isOpen.value = !isOpen.value;
    emit("update:open", isOpen.value);
  }
}

// Add and remove the global keyboard shortcut for toggling the overlay
onMounted(() => {
  document.addEventListener("keydown", handleQuestionMarkKey);
});

onUnmounted(() => {
  document.removeEventListener("keydown", handleQuestionMarkKey);
});
</script>

<style scoped>
.n-shortcuts-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 1rem;
}

.n-shortcuts-panel {
  background-color: var(--n-color-white, #ffffff);
  border-radius: var(--n-border-radius, 0.375rem);
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
  width: 100%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.n-shortcuts-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--n-color-gray-200, #e5e7eb);
}

.n-shortcuts-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--n-color-gray-900, #111827);
  margin: 0;
}

.n-shortcuts-close {
  background: transparent;
  border: none;
  color: var(--n-color-gray-500, #6b7280);
  cursor: pointer;
  height: 2rem;
  width: 2rem;
  border-radius: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.n-shortcuts-close:hover,
.n-shortcuts-close:focus {
  background-color: var(--n-color-gray-100, #f3f4f6);
  color: var(--n-color-gray-700, #374151);
  outline: none;
}

.n-shortcuts-close-icon {
  font-size: 1.5rem;
  line-height: 1;
}

.n-shortcuts-content {
  padding: 1rem 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.n-shortcuts-empty {
  padding: 2rem 1.5rem;
  text-align: center;
  color: var(--n-color-gray-500, #6b7280);
}

.n-shortcuts-group:not(:last-child) {
  margin-bottom: 1.5rem;
}

.n-shortcuts-group-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--n-color-gray-800, #1f2937);
  margin: 0 0 0.75rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--n-color-gray-200, #e5e7eb);
}

.n-shortcuts-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.n-shortcuts-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
}

.n-shortcuts-desc {
  font-size: 0.875rem;
  color: var(--n-color-gray-700, #374151);
}

.n-shortcuts-kbd {
  background-color: var(--n-color-gray-100, #f3f4f6);
  border: 1px solid var(--n-color-gray-300, #d1d5db);
  border-radius: 0.25rem;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  font-family: monospace;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  min-width: 1.25rem;
  text-align: center;
  color: var(--n-color-gray-700, #374151);
}

.n-shortcuts-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--n-color-gray-200, #e5e7eb);
  display: flex;
  justify-content: flex-end;
}

.n-shortcuts-btn {
  background-color: var(--n-color-primary, #0066cc);
  color: white;
  border: none;
  border-radius: 0.25rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.n-shortcuts-btn:hover {
  background-color: var(--n-color-primary-dark, #0052a3);
}

.n-shortcuts-fade-enter-active,
.n-shortcuts-fade-leave-active {
  transition: opacity 0.2s;
}

.n-shortcuts-fade-enter-from,
.n-shortcuts-fade-leave-to {
  opacity: 0;
}

/* Improve the keyboard focus styles */
.n-shortcuts-close:focus-visible,
.n-shortcuts-btn:focus-visible {
  outline: 2px solid var(--n-color-primary, #0066cc);
  outline-offset: 2px;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .n-shortcuts-panel {
    max-width: 100%;
    max-height: 90vh;
  }

  .n-shortcuts-content {
    padding: 0.75rem 1rem;
  }

  .n-shortcuts-header,
  .n-shortcuts-footer {
    padding: 0.75rem 1rem;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .n-shortcuts-panel {
    background-color: var(--n-color-gray-800, #1f2937);
    border-color: var(--n-color-gray-700, #374151);
  }

  .n-shortcuts-header,
  .n-shortcuts-footer {
    border-color: var(--n-color-gray-700, #374151);
  }

  .n-shortcuts-title {
    color: var(--n-color-gray-100, #f3f4f6);
  }

  .n-shortcuts-group-title {
    color: var(--n-color-gray-300, #d1d5db);
    border-color: var(--n-color-gray-700, #374151);
  }

  .n-shortcuts-desc {
    color: var(--n-color-gray-300, #d1d5db);
  }

  .n-shortcuts-kbd {
    background-color: var(--n-color-gray-700, #374151);
    border-color: var(--n-color-gray-600, #4b5563);
    color: var(--n-color-gray-200, #e5e7eb);
  }

  .n-shortcuts-close {
    color: var(--n-color-gray-400, #9ca3af);
  }

  .n-shortcuts-close:hover,
  .n-shortcuts-close:focus {
    background-color: var(--n-color-gray-700, #374151);
    color: var(--n-color-gray-200, #e5e7eb);
  }

  .n-shortcuts-empty {
    color: var(--n-color-gray-400, #9ca3af);
  }
}

/* Support for prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  .n-shortcuts-fade-enter-active,
  .n-shortcuts-fade-leave-active {
    transition: none;
  }
}
</style>
