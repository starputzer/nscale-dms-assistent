<template>
  <Teleport to="body">
    <div v-if="isOpen" class="feedback-dialog-overlay" @click.self="handleCancel">
      <div class="feedback-dialog">
        <div class="feedback-dialog__header">
          <h3 class="feedback-dialog__title">
            {{ t('feedback.dialog.title', 'Feedback Details') }}
          </h3>
          <button
            class="feedback-dialog__close"
            @click="handleCancel"
            :aria-label="t('feedback.dialog.close', 'Schließen')"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="feedback-dialog__content">
          <p class="feedback-dialog__description">
            {{
              t(
                'feedback.dialog.description',
                'Sie haben negatives Feedback gegeben. Bitte teilen Sie uns mit, was wir verbessern können:'
              )
            }}
          </p>

          <textarea
            v-model="comment"
            class="feedback-dialog__textarea"
            :placeholder="
              t(
                'feedback.dialog.placeholder',
                'Was war das Problem? Wie können wir die Antwort verbessern?'
              )
            "
            rows="6"
            maxlength="1000"
            ref="textareaRef"
          ></textarea>

          <div class="feedback-dialog__char-count">
            {{ comment.length }} / 1000
          </div>

          <div class="feedback-dialog__info">
            <i class="fas fa-info-circle"></i>
            <span>
              {{
                t(
                  'feedback.dialog.info',
                  'Ihr Feedback hilft uns, die Qualität unserer Antworten zu verbessern.'
                )
              }}
            </span>
          </div>
        </div>

        <div class="feedback-dialog__footer">
          <button class="feedback-dialog__btn feedback-dialog__btn--cancel" @click="handleCancel">
            {{ t('feedback.dialog.cancel', 'Abbrechen') }}
          </button>
          <button
            class="feedback-dialog__btn feedback-dialog__btn--submit"
            @click="handleSubmit"
            :disabled="!comment.trim()"
          >
            {{ t('feedback.dialog.submit', 'Feedback senden') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, nextTick, watch, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';

interface Props {
  isOpen: boolean;
  messageId: string;
  sessionId: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'close': [];
  'submit': [comment: string];
}>();

const { t } = useI18n({ useScope: 'global', inheritLocale: true });

const comment = ref('');
const textareaRef = ref<HTMLTextAreaElement | null>(null);

// Focus textarea when dialog opens
watch(
  () => props.isOpen,
  async (isOpen) => {
    if (isOpen) {
      comment.value = '';
      await nextTick();
      textareaRef.value?.focus();
    }
  }
);

function handleCancel() {
  comment.value = '';
  emit('close');
}

function handleSubmit() {
  if (comment.value.trim()) {
    emit('submit', comment.value.trim());
    comment.value = '';
  }
}

// Handle keyboard shortcuts
function handleKeydown(event: KeyboardEvent) {
  if (!props.isOpen) return;

  if (event.key === 'Escape') {
    handleCancel();
  } else if (event.key === 'Enter' && event.ctrlKey && comment.value.trim()) {
    handleSubmit();
  }
}

// Add keyboard event listener
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', handleKeydown);
}

// Cleanup
onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeydown);
  }
});
</script>

<style scoped>
.feedback-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.2s ease-out;
}

.feedback-dialog {
  background-color: var(--n-color-background);
  border-radius: var(--n-border-radius-lg);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  animation: slideIn 0.3s ease-out;
}

.feedback-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid var(--n-color-border);
}

.feedback-dialog__title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--n-color-text-primary);
}

.feedback-dialog__close {
  background: none;
  border: none;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--n-color-text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.feedback-dialog__close:hover {
  background-color: var(--n-color-hover);
  color: var(--n-color-text-primary);
}

.feedback-dialog__content {
  padding: 1.5rem;
  flex: 1;
  overflow-y: auto;
}

.feedback-dialog__description {
  margin: 0 0 1rem;
  color: var(--n-color-text-secondary);
  line-height: 1.5;
}

.feedback-dialog__textarea {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  background-color: var(--n-color-background-alt);
  color: var(--n-color-text-primary);
  font-family: inherit;
  font-size: inherit;
  resize: vertical;
  transition: border-color 0.2s;
}

.feedback-dialog__textarea:focus {
  outline: none;
  border-color: var(--n-color-primary);
}

.feedback-dialog__char-count {
  margin-top: 0.5rem;
  text-align: right;
  font-size: 0.875rem;
  color: var(--n-color-text-tertiary);
}

.feedback-dialog__info {
  margin-top: 1rem;
  padding: 0.75rem;
  background-color: rgba(var(--n-color-info-rgb), 0.1);
  border-radius: var(--n-border-radius);
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--n-color-info);
}

.feedback-dialog__info i {
  margin-top: 0.125rem;
}

.feedback-dialog__footer {
  display: flex;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid var(--n-color-border);
}

.feedback-dialog__btn {
  flex: 1;
  padding: 0.75rem 1.5rem;
  border-radius: var(--n-border-radius);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  font-size: inherit;
  font-family: inherit;
}

.feedback-dialog__btn--cancel {
  background-color: var(--n-color-background-alt);
  color: var(--n-color-text-primary);
  border: 1px solid var(--n-color-border);
}

.feedback-dialog__btn--cancel:hover {
  background-color: var(--n-color-hover);
}

.feedback-dialog__btn--submit {
  background-color: var(--n-color-primary);
  color: var(--n-color-on-primary);
}

.feedback-dialog__btn--submit:hover:not(:disabled) {
  background-color: var(--n-color-primary-dark);
}

.feedback-dialog__btn--submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Animations */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideIn {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .feedback-dialog {
    background-color: var(--n-color-background-dark);
  }

  .feedback-dialog__textarea {
    background-color: var(--n-color-background-alt-dark);
    border-color: var(--n-color-border-dark);
  }
}

/* Mobile adjustments */
@media (max-width: 600px) {
  .feedback-dialog {
    width: 95%;
    margin: 1rem;
  }

  .feedback-dialog__footer {
    flex-direction: column-reverse;
  }

  .feedback-dialog__btn {
    width: 100%;
  }
}
</style>