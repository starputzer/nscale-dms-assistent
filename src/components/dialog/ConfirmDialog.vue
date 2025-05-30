<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isVisible"
        class="dialog-overlay"
        @click.self="handleOverlayClick"
      >
        <Transition name="slide-fade">
          <div
            v-if="isVisible"
            class="dialog-container"
            role="dialog"
            aria-modal="true"
          >
            <div class="dialog-header">
              <h2 class="dialog-title">{{ title }}</h2>
              <button
                class="dialog-close"
                @click="cancel"
                aria-label="Schließen"
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="dialog-content">
              <p>{{ message }}</p>
            </div>
            <div class="dialog-footer">
              <button
                v-if="showCancelButton"
                class="dialog-btn dialog-btn-cancel"
                @click="cancel"
                ref="cancelButtonRef"
              >
                {{ cancelButtonText }}
              </button>
              <button
                class="dialog-btn dialog-btn-confirm"
                @click="confirm"
                ref="confirmButtonRef"
              >
                {{ confirmButtonText }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from "vue";

interface DialogProps {
  // Dialog grundlegende Texte
  title?: string;
  message?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;

  // Dialog Optionen
  isVisible?: boolean;
  showCancelButton?: boolean;
  type?: "info" | "warning" | "error" | "success" | "confirm";

  // Events
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose?: () => void; // Wird bei jeder Schließung ausgelöst
}

const props = withDefaults(defineProps<DialogProps>(), {
  title: "Bestätigung",
  message: "Sind Sie sicher?",
  confirmButtonText: "Bestätigen",
  cancelButtonText: "Abbrechen",
  isVisible: false,
  showCancelButton: true,
  type: "confirm",
});

const emit = defineEmits<{
  (e: "confirm"): void;
  (e: "cancel"): void;
  (e: "update:isVisible", value: boolean): void;
}>();

// Refs
const cancelButtonRef = ref<HTMLButtonElement | null>(null);
const confirmButtonRef = ref<HTMLButtonElement | null>(null);

// Dialog-Steuerung
const handleOverlayClick = () => {
  // Dialog durch Klick auf Overlay schließen
  cancel();
};

const confirm = () => {
  emit("confirm");
  emit("update:isVisible", false);
  props.onConfirm?.();
  props.onClose?.();
};

const cancel = () => {
  emit("cancel");
  emit("update:isVisible", false);
  props.onCancel?.();
  props.onClose?.();
};

// Tastatur-Events
const handleKeyDown = (event: KeyboardEvent) => {
  if (!props.isVisible) return;

  if (event.key === "Escape") {
    event.preventDefault();
    cancel();
  } else if (event.key === "Enter") {
    event.preventDefault();
    confirm();
  } else if (event.key === "Tab") {
    // Tab-Navigation innerhalb des Dialogs einschränken
    if (!event.shiftKey && document.activeElement === confirmButtonRef.value) {
      event.preventDefault();
      cancelButtonRef.value?.focus();
    } else if (
      event.shiftKey &&
      document.activeElement === cancelButtonRef.value
    ) {
      event.preventDefault();
      confirmButtonRef.value?.focus();
    }
  }
};

// Fokusmanagement
watch(
  () => props.isVisible,
  async (newValue) => {
    if (newValue) {
      // Warten bis nach DOM-Update und dann Fokus setzen
      await nextTick();
      confirmButtonRef.value?.focus();
    }
  },
);

// Event Listener Installation/Deinstallation
onMounted(() => {
  document.addEventListener("keydown", handleKeyDown);
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", handleKeyDown);
});
</script>

<style scoped>
/* Dialog Basisstile */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-container {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e8e8e8;
}

.dialog-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.dialog-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #777;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 30px;
  width: 30px;
  padding: 0;
}

.dialog-close:hover {
  color: #333;
}

.dialog-content {
  padding: 20px;
  line-height: 1.5;
  color: #555;
}

.dialog-footer {
  padding: 16px 20px;
  border-top: 1px solid #e8e8e8;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.dialog-btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition:
    background-color 0.2s,
    box-shadow 0.2s;
}

.dialog-btn:focus {
  outline: 2px solid rgba(0, 128, 0, 0.5);
  outline-offset: 2px;
}

.dialog-btn-cancel {
  background-color: #f0f0f0;
  color: #333;
}

.dialog-btn-cancel:hover {
  background-color: #e0e0e0;
}

.dialog-btn-confirm {
  background-color: #0d7a40; /* nscale Grün */
  color: white;
}

.dialog-btn-confirm:hover {
  background-color: #0a6032;
}

/* Varianten je nach Dialogtyp */
:deep(.dialog-container[data-type="warning"]) .dialog-title {
  color: #f59e0b;
}

:deep(.dialog-container[data-type="error"]) .dialog-title {
  color: #ef4444;
}

:deep(.dialog-container[data-type="success"]) .dialog-title {
  color: #10b981;
}

/* Animationen */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.2s ease-in;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}

/* Responsive Design */
@media (max-width: 480px) {
  .dialog-container {
    width: 95%;
  }

  .dialog-footer {
    flex-direction: column;
  }

  .dialog-btn {
    width: 100%;
  }
}
</style>
