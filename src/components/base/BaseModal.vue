<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="modelValue" class="base-modal">
        <div
          class="base-modal__backdrop"
          @click="closeOnBackdrop && close()"
        ></div>
        <div
          class="base-modal__container"
          :class="[`base-modal__container--${size}`]"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
        >
          <div class="base-modal__header">
            <h3 :id="titleId" class="base-modal__title">{{ title }}</h3>
            <button
              v-if="showCloseButton"
              type="button"
              class="base-modal__close"
              @click="close"
              aria-label="Close"
            >
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="base-modal__body">
            <slot></slot>
          </div>
          <div v-if="$slots.footer || showFooter" class="base-modal__footer">
            <slot name="footer">
              <button
                v-if="showCancelButton"
                type="button"
                class="base-modal__btn base-modal__btn--cancel"
                @click="cancel"
              >
                {{ cancelText }}
              </button>
              <button
                v-if="showConfirmButton"
                type="button"
                class="base-modal__btn base-modal__btn--confirm"
                @click="confirm"
                :disabled="confirmDisabled"
              >
                {{ confirmText }}
              </button>
            </slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import {
  defineProps,
  defineEmits,
  watch,
  onMounted,
  onBeforeUnmount,
  ref,
} from "vue";

const titleId = `modal-title-${Math.random().toString(36).substring(2, 11)}`;

interface Props {
  modelValue: boolean;
  title: string;
  size?: "small" | "medium" | "large" | "fullscreen";
  showCloseButton?: boolean;
  showFooter?: boolean;
  showCancelButton?: boolean;
  showConfirmButton?: boolean;
  cancelText?: string;
  confirmText?: string;
  confirmDisabled?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  title: "",
  size: "medium",
  showCloseButton: true,
  showFooter: true,
  showCancelButton: true,
  showConfirmButton: true,
  cancelText: "Abbrechen",
  confirmText: "Bestätigen",
  confirmDisabled: false,
  closeOnBackdrop: true,
  closeOnEsc: true,
});

const emit = defineEmits(["update:modelValue", "cancel", "confirm", "close"]);

const close = () => {
  emit("update:modelValue", false);
  emit("close");
};

const cancel = () => {
  emit("cancel");
  close();
};

const confirm = () => {
  emit("confirm");
  if (!props.confirmDisabled) {
    close();
  }
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === "Escape" && props.closeOnEsc && props.modelValue) {
    close();
  }
};

watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  },
);

onMounted(() => {
  document.addEventListener("keydown", handleKeyDown);
});

onBeforeUnmount(() => {
  document.body.style.overflow = "";
  document.removeEventListener("keydown", handleKeyDown);
});
</script>

<style scoped>
.base-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1050;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
}

.base-modal__backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: -1;
}

.base-modal__container {
  background-color: white;
  border-radius: 4px;
  box-shadow: 0 3px 15px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 2rem);
  width: 100%;
  overflow: hidden;
}

.base-modal__container--small {
  max-width: 400px;
}

.base-modal__container--medium {
  max-width: 600px;
}

.base-modal__container--large {
  max-width: 800px;
}

.base-modal__container--fullscreen {
  max-width: none;
  width: calc(100% - 2rem);
  height: calc(100vh - 2rem);
}

.base-modal__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--nscale-border, #ced4da);
}

.base-modal__title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.base-modal__close {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1.25rem;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--nscale-text-secondary, #6c757d);
  transition: color 0.2s;
}

.base-modal__close:hover {
  color: var(--nscale-text, #212529);
}

.base-modal__body {
  padding: 1rem;
  overflow-y: auto;
  flex-grow: 1;
}

.base-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem;
  border-top: 1px solid var(--nscale-border, #ced4da);
}

.base-modal__btn {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.base-modal__btn--cancel {
  background-color: var(--nscale-light, #f8f9fa);
  color: var(--nscale-text, #212529);
  border: 1px solid var(--nscale-border, #ced4da);
}

.base-modal__btn--cancel:hover {
  background-color: var(--nscale-border, #ced4da);
}

.base-modal__btn--confirm {
  background-color: var(--nscale-primary, #0078d4);
  color: white;
  border: 1px solid var(--nscale-primary, #0078d4);
}

.base-modal__btn--confirm:hover:not(:disabled) {
  background-color: var(--nscale-primary-dark, #106ebe);
}

.base-modal__btn--confirm:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

/* Animation */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .base-modal__container {
  animation: modal-slide-in 0.2s ease forwards;
}

.modal-fade-leave-active .base-modal__container {
  animation: modal-slide-out 0.2s ease forwards;
}

@keyframes modal-slide-in {
  from {
    transform: translateY(-50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes modal-slide-out {
  from {
    transform: translateY(0);
    opacity: 1;
  }
  to {
    transform: translateY(-50px);
    opacity: 0;
  }
}

@media (max-width: 768px) {
  .base-modal__container--small,
  .base-modal__container--medium,
  .base-modal__container--large {
    max-width: 95%;
  }
}
</style>
