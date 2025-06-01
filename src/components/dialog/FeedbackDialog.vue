<template>
  <div class="feedback-dialog" v-if="isVisible">
    <div class="feedback-dialog-backdrop" @click="closeDialog"></div>

    <div class="feedback-dialog-container">
      <div class="feedback-dialog-header">
        <h2 class="feedback-dialog-title">{{ title }}</h2>
        <button
          class="feedback-dialog-close"
          @click="closeDialog"
          aria-label="Schließen"
        >
          <span class="icon">×</span>
        </button>
      </div>

      <div class="feedback-dialog-content">
        <div v-if="isLoading" class="feedback-dialog-loading">
          <div class="feedback-loading-spinner"></div>
          <p>Wird geladen...</p>
        </div>

        <div v-else>
          <div v-if="currentView === 'form'">
            <p class="feedback-dialog-description">
              Bitte teilen Sie uns Ihr Feedback mit, damit wir den DMS Assistant
              verbessern können.
            </p>

            <form @submit.prevent="submitFeedback" class="feedback-form">
              <div class="feedback-form-group">
                <label for="feedbackType">Art des Feedbacks</label>
                <select
                  id="feedbackType"
                  v-model="feedbackData.type"
                  required
                  :disabled="submitting"
                >
                  <option value="">Bitte wählen</option>
                  <option value="bug">Fehlermeldung</option>
                  <option value="suggestion">Verbesserungsvorschlag</option>
                  <option value="question">Frage</option>
                  <option value="praise">Lob</option>
                  <option value="other">Sonstiges</option>
                </select>
              </div>

              <div class="feedback-form-group">
                <label for="feedbackSubject">Betreff</label>
                <input
                  type="text"
                  id="feedbackSubject"
                  v-model="feedbackData.subject"
                  placeholder="Kurze Zusammenfassung Ihres Anliegens"
                  required
                  maxlength="100"
                  :disabled="submitting"
                />
              </div>

              <div class="feedback-form-group">
                <label for="feedbackDescription">Beschreibung</label>
                <textarea
                  id="feedbackDescription"
                  v-model="feedbackData.description"
                  placeholder="Bitte beschreiben Sie Ihr Anliegen möglichst genau"
                  rows="6"
                  required
                  maxlength="2000"
                  :disabled="submitting"
                ></textarea>
                <div class="character-counter">
                  {{ feedbackData.description.length }}/2000 Zeichen
                </div>
              </div>

              <div class="feedback-form-group">
                <label class="feedback-checkbox">
                  <input
                    type="checkbox"
                    v-model="feedbackData.includeContext"
                    :disabled="submitting"
                  />
                  <span>Kontext der aktuellen Konversation beifügen</span>
                </label>
                <p
                  class="feedback-help-text"
                  v-if="feedbackData.includeContext"
                >
                  Wir werden die letzten 5 Nachrichten aus der aktuellen
                  Konversation anhängen, um Ihr Feedback besser verstehen zu
                  können.
                </p>
              </div>

              <div class="feedback-form-actions">
                <button
                  type="button"
                  class="feedback-btn feedback-btn-secondary"
                  @click="closeDialog"
                  :disabled="submitting"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  class="feedback-btn feedback-btn-primary"
                  :disabled="submitting || !isFormValid"
                >
                  <span v-if="submitting">Wird gesendet...</span>
                  <span v-else>Feedback senden</span>
                </button>
              </div>
            </form>
          </div>

          <div v-else-if="currentView === 'success'" class="feedback-success">
            <div class="feedback-success-icon">✓</div>
            <h3>Vielen Dank für Ihr Feedback!</h3>
            <p>
              Wir haben Ihr Feedback erfolgreich erhalten und werden es prüfen.
            </p>
            <div class="feedback-id" v-if="submitResult && submitResult.id">
              Ihre Feedback-ID: <strong>{{ submitResult.id }}</strong>
            </div>
            <button
              class="feedback-btn feedback-btn-primary"
              @click="closeDialog"
            >
              Schließen
            </button>
          </div>

          <div v-else-if="currentView === 'error'" class="feedback-error">
            <div class="feedback-error-icon">!</div>
            <h3>Es ist ein Fehler aufgetreten</h3>
            <p>
              Beim Senden Ihres Feedbacks ist leider ein Fehler aufgetreten.
              Bitte versuchen Sie es später erneut.
            </p>
            <div class="feedback-error-details" v-if="submitError">
              Fehlerdetails: {{ submitError }}
            </div>
            <div class="feedback-form-actions">
              <button
                class="feedback-btn feedback-btn-secondary"
                @click="currentView = 'form'"
              >
                Zurück
              </button>
              <button
                class="feedback-btn feedback-btn-primary"
                @click="retrySubmit"
              >
                Erneut versuchen
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { useI18n } from "@/composables/useI18n";

// Hooks
const { t } = useI18n();

// Props
const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false,
  },
  messageId: {
    type: String,
    default: null,
  },
  sessionId: {
    type: String,
    default: null,
  },
});

// Emits
const emit = defineEmits(["close", "submit"]);

// State
const title = ref("Feedback");
const currentView = ref("form");
const isLoading = ref(false);
const submitting = ref(false);
const submitResult = ref(null);
const submitError = ref(null);

// Feedback-Daten
const feedbackData = ref({
  type: "",
  subject: "",
  description: "",
  includeContext: true,
  messageId: null,
  sessionId: null,
  timestamp: null,
});

// Computed Properties
const isFormValid = computed(() => {
  return (
    feedbackData.value.type &&
    feedbackData.value.subject &&
    feedbackData.value.description.length > 10
  );
});

// Methoden
const closeDialog = () => {
  if (submitting.value) return;
  emit("close");

  // Formular zurücksetzen nach einem kurzen Timeout
  setTimeout(() => {
    resetForm();
  }, 300);
};

const resetForm = () => {
  currentView.value = "form";
  feedbackData.value = {
    type: "",
    subject: "",
    description: "",
    includeContext: true,
    messageId: props.messageId,
    sessionId: props.sessionId,
    timestamp: null,
  };
  submitResult.value = null;
  submitError.value = null;
};

const submitFeedback = async () => {
  if (!isFormValid.value || submitting.value) return;

  submitting.value = true;
  feedbackData.value.timestamp = new Date().toISOString();

  try {
    // Bei einer echten Implementierung würde hier ein API-Aufruf erfolgen
    // Simulieren Sie einen erfolgreichen Aufruf nach 1,5 Sekunden
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const result = {
      id: "FB-" + Math.floor(Math.random() * 100000),
      status: "success",
      timestamp: new Date().toISOString(),
    };

    submitResult.value = result;
    currentView.value = "success";

    // Ereignis an die Elternkomponente senden
    emit("submit", {
      ...feedbackData.value,
      result,
    });
  } catch (error) {
    console.error("Fehler beim Senden des Feedbacks:", error);
    submitError.value = error.message || "Unbekannter Fehler";
    currentView.value = "error";
  } finally {
    submitting.value = false;
  }
};

const retrySubmit = () => {
  currentView.value = "form";
  submitError.value = null;
};

// Watchers
watch(
  () => props.messageId,
  (newValue) => {
    feedbackData.value.messageId = newValue;
  },
);

watch(
  () => props.sessionId,
  (newValue) => {
    feedbackData.value.sessionId = newValue;
  },
);

// Beim Öffnen das Formular mit initialen Werten füllen
watch(
  () => props.isVisible,
  (newValue) => {
    if (newValue) {
      resetForm();
      feedbackData.value.messageId = props.messageId;
      feedbackData.value.sessionId = props.sessionId;
    }
  },
);
</script>

<style scoped>
.feedback-dialog {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.feedback-dialog-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
}

.feedback-dialog-container {
  position: relative;
  width: 600px;
  max-width: 90%;
  max-height: 90vh;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: dialogFadeIn 0.3s ease;
}

@keyframes dialogFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.feedback-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background-color: var(--primary-color, #1976d2);
  color: white;
}

.feedback-dialog-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 500;
}

.feedback-dialog-close {
  background: none;
  border: none;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s;
}

.feedback-dialog-close:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.feedback-dialog-close .icon {
  font-size: 24px;
  line-height: 1;
}

.feedback-dialog-content {
  padding: 20px;
  overflow-y: auto;
}

.feedback-dialog-description {
  margin-top: 0;
  margin-bottom: 20px;
  color: var(--text-secondary, #555);
}

.feedback-dialog-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
}

.feedback-loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top: 4px solid var(--primary-color, #1976d2);
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.feedback-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.feedback-form-group {
  display: flex;
  flex-direction: column;
}

.feedback-form-group label {
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--text-primary, #333);
}

.feedback-form-group input,
.feedback-form-group select,
.feedback-form-group textarea {
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  font-family: inherit;
}

.feedback-form-group input:focus,
.feedback-form-group select:focus,
.feedback-form-group textarea:focus {
  outline: none;
  border-color: var(--primary-color, #1976d2);
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.1);
}

.character-counter {
  margin-top: 4px;
  font-size: 0.8rem;
  text-align: right;
  color: var(--text-secondary, #777);
}

.feedback-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.feedback-help-text {
  margin-top: 8px;
  font-size: 0.85rem;
  color: var(--text-secondary, #777);
  font-style: italic;
}

.feedback-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

.feedback-btn {
  padding: 10px 16px;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  border: none;
}

.feedback-btn-primary {
  background-color: var(--primary-color, #1976d2);
  color: white;
}

.feedback-btn-primary:hover {
  background-color: var(--primary-color-dark, #1565c0);
}

.feedback-btn-primary:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.feedback-btn-secondary {
  background-color: transparent;
  color: var(--text-primary, #333);
  box-shadow: inset 0 0 0 1px #ddd;
}

.feedback-btn-secondary:hover {
  background-color: #f5f5f5;
}

.feedback-btn-secondary:disabled {
  color: #999;
  cursor: not-allowed;
}

.feedback-success,
.feedback-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 20px 0;
}

.feedback-success-icon,
.feedback-error-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  margin-bottom: 16px;
}

.feedback-success-icon {
  background-color: #e8f5e9;
  color: #388e3c;
}

.feedback-error-icon {
  background-color: #ffebee;
  color: #d32f2f;
}

.feedback-id {
  margin: 16px 0;
  padding: 12px;
  background-color: #f5f5f5;
  border-radius: 4px;
  font-size: 0.9rem;
  width: 100%;
  max-width: 300px;
}

.feedback-error-details {
  margin: 16px 0;
  padding: 12px;
  background-color: #ffebee;
  border-radius: 4px;
  color: #d32f2f;
  font-size: 0.9rem;
  width: 100%;
  max-width: 400px;
  word-break: break-word;
}

@media (max-width: 600px) {
  .feedback-dialog-container {
    width: 100%;
    max-width: 100%;
    height: 100%;
    max-height: 100%;
    border-radius: 0;
  }

  .feedback-form-actions {
    flex-direction: column-reverse;
  }

  .feedback-btn {
    width: 100%;
  }
}
</style>
