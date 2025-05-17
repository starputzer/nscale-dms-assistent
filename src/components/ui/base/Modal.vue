<template>
  <Teleport to="body">
    <Transition name="n-modal">
      <div
        v-if="isOpen"
        class="n-modal-backdrop"
        :class="{ 'n-modal-backdrop--closable': closeOnBackdrop }"
        @click="handleBackdropClick"
        @keydown.esc="handleEscapeKey"
        tabindex="-1"
        aria-hidden="true"
      >
        <div
          class="n-modal-container"
          :class="[`n-modal--${size}`, { 'n-modal--scrollable': scrollable }]"
        >
          <FocusTrap :active="isOpen">
            <div
              ref="modalRef"
              role="dialog"
              aria-modal="true"
              :aria-labelledby="titleId"
              tabindex="-1"
              class="n-modal"
              @click.stop
            >
              <div class="n-modal-header">
                <h2 :id="titleId" class="n-modal-title">
                  <slot name="title">{{ title }}</slot>
                </h2>
                <button
                  v-if="showCloseButton"
                  class="n-modal-close"
                  type="button"
                  aria-label="Close dialog"
                  @click="closeModal"
                >
                  <svg
                    class="n-modal-close-icon"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                    />
                  </svg>
                </button>
              </div>

              <div
                class="n-modal-body"
                :class="{ 'n-modal-body--scrollable': scrollableContent }"
              >
                <slot></slot>
              </div>

              <div v-if="$slots.footer" class="n-modal-footer">
                <slot name="footer"></slot>
              </div>
            </div>
          </FocusTrap>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from "vue";
import { uniqueId } from "lodash";
import FocusTrap from "./FocusTrap.vue";

/**
 * Modal component for dialogs, forms, and other interactive content
 * @displayName Modal
 * @example
 * <Modal :open="isModalOpen" title="Edit Profile" @close="closeModal">
 *   <p>Modal content goes here</p>
 *   <template #footer>
 *     <Button variant="secondary" @click="closeModal">Cancel</Button>
 *     <Button variant="primary" @click="saveAndClose">Save</Button>
 *   </template>
 * </Modal>
 */
export interface ModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** The title of the modal */
  title?: string;
  /** Size of the modal */
  size?: "small" | "medium" | "large" | "full";
  /** Whether to show the close button in the header */
  showCloseButton?: boolean;
  /** Whether to close the modal when clicking outside */
  closeOnBackdrop?: boolean;
  /** Whether to close the modal when pressing the Escape key */
  closeOnEscape?: boolean;
  /** Whether the content of the modal should be scrollable */
  scrollableContent?: boolean;
  /** Whether the entire modal should be scrollable within viewport */
  scrollable?: boolean;
  /** Whether to prevent document scrolling when modal is open */
  preventBodyScrolling?: boolean;
}

const props = withDefaults(defineProps<ModalProps>(), {
  title: "",
  size: "medium",
  showCloseButton: true,
  closeOnBackdrop: true,
  closeOnEscape: true,
  scrollableContent: false,
  scrollable: true,
  preventBodyScrolling: true,
});

const emit = defineEmits<{
  (e: "close"): void;
  (e: "update:open", value: boolean): void;
  (e: "afterOpen"): void;
  (e: "afterClose"): void;
}>();

// Internal state
const isOpen = ref(props.open);
const modalRef = ref<HTMLElement | null>(null);
const titleId = computed(() => (props.title ? uniqueId("n-modal-title-") : ""));
const previouslyFocusedElement = ref<HTMLElement | null>(null);

// Watch for changes to the open prop
watch(
  () => props.open,
  (newValue) => {
    isOpen.value = newValue;

    if (newValue) {
      if (props.preventBodyScrolling) {
        document.body.style.overflow = "hidden";
      }

      // Store previously focused element to restore focus later
      previouslyFocusedElement.value = document.activeElement as HTMLElement;

      nextTick(() => {
        // Focus the modal when it opens
        modalRef.value?.focus();
        emit("afterOpen");
      });
    } else {
      if (props.preventBodyScrolling) {
        document.body.style.overflow = "";
      }

      // Restore focus to the previously focused element
      nextTick(() => {
        previouslyFocusedElement.value?.focus();
        emit("afterClose");
      });
    }
  },
);

// Handle clicks on the backdrop
function handleBackdropClick(event: MouseEvent) {
  // Only close if clicking directly on the backdrop (not on modal content)
  if (props.closeOnBackdrop && event.target === event.currentTarget) {
    closeModal();
  }
}

// Handle escape key press
function handleEscapeKey(event: KeyboardEvent) {
  if (props.closeOnEscape && event.key === "Escape") {
    closeModal();
  }
}

// Close the modal
function closeModal() {
  isOpen.value = false;
  emit("close");
  emit("update:open", false);
}

// Add event listener for escape key
onMounted(() => {
  if (props.closeOnEscape) {
    document.addEventListener("keydown", handleEscapeKeyDown);
  }

  // Set initial body overflow state
  if (isOpen.value && props.preventBodyScrolling) {
    document.body.style.overflow = "hidden";
  }
});

// Clean up event listeners and restore body overflow
onBeforeUnmount(() => {
  if (props.closeOnEscape) {
    document.removeEventListener("keydown", handleEscapeKeyDown);
  }

  // Restore body overflow when component is unmounted
  if (props.preventBodyScrolling && isOpen.value) {
    document.body.style.overflow = "";
  }
});

// Global escape key handler (needed for cases where focus is lost)
function handleEscapeKeyDown(event: KeyboardEvent) {
  if (isOpen.value && event.key === "Escape") {
    closeModal();
  }
}
</script>

<style scoped>
.n-modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--n-z-index-modal, 1000);
  padding: 1rem;
  box-sizing: border-box;
  overflow: auto;
}

.n-modal-backdrop--closable {
  cursor: pointer;
}

.n-modal-container {
  width: 100%;
  max-height: 100%;
  display: flex;
  justify-content: center;
  cursor: default;
}

.n-modal {
  background-color: var(--n-color-white, #ffffff);
  border-radius: var(--n-border-radius, 4px);
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  max-height: 100%;
  width: 100%;
  outline: none;
  position: relative;
  overflow: hidden;
}

/* Modal sizes */
.n-modal--small {
  max-width: 400px;
}

.n-modal--medium {
  max-width: 600px;
}

.n-modal--large {
  max-width: 800px;
}

.n-modal--full {
  max-width: 95%;
  height: 95%;
}

/* Modal header */
.n-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--n-color-gray-200, #e2e8f0);
}

.n-modal-title {
  font-size: var(--n-font-size-lg, 1.125rem);
  font-weight: 600;
  color: var(--n-color-gray-900, #1a202c);
  margin: 0;
}

.n-modal-close {
  background: transparent;
  border: none;
  color: var(--n-color-gray-500, #a0aec0);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  margin: -0.5rem;
  border-radius: var(--n-border-radius-sm, 2px);
  transition:
    color 0.2s ease,
    background-color 0.2s ease;
}

.n-modal-close:hover,
.n-modal-close:focus {
  color: var(--n-color-gray-700, #4a5568);
  background-color: var(--n-color-gray-100, #f7fafc);
  outline: none;
}

.n-modal-close-icon {
  width: 1.25rem;
  height: 1.25rem;
  fill: currentColor;
}

/* Modal body */
.n-modal-body {
  padding: 1.5rem;
  flex: 1;
  font-size: var(--n-font-size-md, 1rem);
  color: var(--n-color-gray-700, #4a5568);
}

.n-modal-body--scrollable {
  overflow-y: auto;
  max-height: 60vh;
}

/* Modal footer */
.n-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--n-color-gray-200, #e2e8f0);
  background-color: var(--n-color-gray-50, #f9fafb);
}

/* Modal animations */
.n-modal-enter-active,
.n-modal-leave-active {
  transition: all 0.3s ease;
}

.n-modal-enter-from,
.n-modal-leave-to {
  opacity: 0;
}

.n-modal-enter-from .n-modal,
.n-modal-leave-to .n-modal {
  transform: scale(0.9);
  opacity: 0;
}

/* Scrollable container */
.n-modal--scrollable {
  align-items: flex-start;
  overflow-y: auto;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .n-modal-backdrop {
    padding: 0.5rem;
  }

  .n-modal--small,
  .n-modal--medium,
  .n-modal--large {
    max-width: 100%;
  }

  .n-modal-body--scrollable {
    max-height: 70vh;
  }

  .n-modal-header,
  .n-modal-footer {
    padding: 0.75rem 1rem;
  }

  .n-modal-body {
    padding: 1rem;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .n-modal {
    background-color: var(--n-color-gray-800, #2d3748);
  }

  .n-modal-header {
    border-bottom-color: var(--n-color-gray-700, #4a5568);
  }

  .n-modal-title {
    color: var(--n-color-gray-100, #f7fafc);
  }

  .n-modal-close {
    color: var(--n-color-gray-400, #cbd5e0);
  }

  .n-modal-close:hover,
  .n-modal-close:focus {
    color: var(--n-color-gray-200, #edf2f7);
    background-color: var(--n-color-gray-700, #4a5568);
  }

  .n-modal-body {
    color: var(--n-color-gray-300, #e2e8f0);
  }

  .n-modal-footer {
    border-top-color: var(--n-color-gray-700, #4a5568);
    background-color: var(--n-color-gray-900, #1a202c);
  }
}
</style>
