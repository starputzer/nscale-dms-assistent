<template>
  <BaseModal
    v-model="dialogOpen"
    :title="title"
    size="small"
    :show-close-button="showCloseButton"
    :close-on-backdrop="closeOnBackdrop"
    :close-on-esc="closeOnEsc"
    @confirm="confirm"
    @cancel="cancel"
    @close="close"
  >
    <div class="base-confirm-dialog">
      <div v-if="icon" class="base-confirm-dialog__icon">
        <i :class="['base-confirm-dialog__icon-image', iconClass]"></i>
      </div>
      <div class="base-confirm-dialog__content">
        <p class="base-confirm-dialog__message">{{ message }}</p>
        <p v-if="detail" class="base-confirm-dialog__detail">{{ detail }}</p>
      </div>
    </div>

    <template #footer>
      <button
        v-if="showCancelButton"
        type="button"
        class="base-confirm-dialog__btn base-confirm-dialog__btn--cancel"
        @click="cancel"
      >
        {{ cancelText }}
      </button>
      <button
        v-if="showConfirmButton"
        type="button"
        :class="[
          'base-confirm-dialog__btn',
          'base-confirm-dialog__btn--confirm',
          `base-confirm-dialog__btn--${type}`,
        ]"
        @click="confirm"
      >
        {{ confirmText }}
      </button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, watch, computed } from "vue";
import BaseModal from "./BaseModal.vue";

interface Props {
  modelValue: boolean;
  title: string;
  message: string;
  detail?: string;
  type?: "info" | "success" | "warning" | "danger";
  icon?: boolean;
  showCloseButton?: boolean;
  showCancelButton?: boolean;
  showConfirmButton?: boolean;
  cancelText?: string;
  confirmText?: string;
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  title: "Bestätigen",
  message: "Sind Sie sicher?",
  detail: undefined,
  type: "warning",
  icon: true,
  showCloseButton: true,
  showCancelButton: true,
  showConfirmButton: true,
  cancelText: "Abbrechen",
  confirmText: "Bestätigen",
  closeOnBackdrop: true,
  closeOnEsc: true,
});

const emit = defineEmits(["update:modelValue", "confirm", "cancel", "close"]);

const dialogOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

const iconClass = computed(() => {
  switch (props.type) {
    case "info":
      return "fas fa-info-circle";
    case "success":
      return "fas fa-check-circle";
    case "warning":
      return "fas fa-exclamation-triangle";
    case "danger":
      return "fas fa-exclamation-circle";
    default:
      return "fas fa-question-circle";
  }
});

const confirm = () => {
  emit("confirm");
  dialogOpen.value = false;
};

const cancel = () => {
  emit("cancel");
  dialogOpen.value = false;
};

const close = () => {
  emit("close");
  dialogOpen.value = false;
};
</script>

<style scoped>
.base-confirm-dialog {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.base-confirm-dialog__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 2rem;
}

.base-confirm-dialog__icon-image.fa-info-circle {
  color: var(--nscale-info, #17a2b8);
}

.base-confirm-dialog__icon-image.fa-check-circle {
  color: var(--nscale-success, #28a745);
}

.base-confirm-dialog__icon-image.fa-exclamation-triangle {
  color: var(--nscale-warning, #ffc107);
}

.base-confirm-dialog__icon-image.fa-exclamation-circle {
  color: var(--nscale-danger, #dc3545);
}

.base-confirm-dialog__icon-image.fa-question-circle {
  color: var(--nscale-primary, #0078d4);
}

.base-confirm-dialog__content {
  flex-grow: 1;
}

.base-confirm-dialog__message {
  margin-top: 0;
  margin-bottom: 0.5rem;
  font-size: 1rem;
}

.base-confirm-dialog__detail {
  margin-top: 0;
  margin-bottom: 0;
  font-size: 0.875rem;
  color: var(--nscale-text-secondary, #6c757d);
}

.base-confirm-dialog__btn {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.base-confirm-dialog__btn--cancel {
  background-color: var(--nscale-light, #f8f9fa);
  color: var(--nscale-text, #212529);
  border: 1px solid var(--nscale-border, #ced4da);
  margin-right: 0.5rem;
}

.base-confirm-dialog__btn--cancel:hover {
  background-color: var(--nscale-border, #ced4da);
}

.base-confirm-dialog__btn--confirm {
  color: white;
  border: 1px solid transparent;
}

.base-confirm-dialog__btn--info {
  background-color: var(--nscale-info, #17a2b8);
  border-color: var(--nscale-info, #17a2b8);
}

.base-confirm-dialog__btn--info:hover {
  background-color: var(--nscale-info-dark, #138496);
}

.base-confirm-dialog__btn--success {
  background-color: var(--nscale-success, #28a745);
  border-color: var(--nscale-success, #28a745);
}

.base-confirm-dialog__btn--success:hover {
  background-color: var(--nscale-success-dark, #218838);
}

.base-confirm-dialog__btn--warning {
  background-color: var(--nscale-warning, #ffc107);
  border-color: var(--nscale-warning, #ffc107);
  color: #212529;
}

.base-confirm-dialog__btn--warning:hover {
  background-color: var(--nscale-warning-dark, #e0a800);
}

.base-confirm-dialog__btn--danger {
  background-color: var(--nscale-danger, #dc3545);
  border-color: var(--nscale-danger, #dc3545);
}

.base-confirm-dialog__btn--danger:hover {
  background-color: var(--nscale-danger-dark, #c82333);
}
</style>
