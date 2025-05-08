<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isVisible" class="dialog-overlay" @click.self="handleOverlayClick">
        <Transition name="slide-fade">
          <div v-if="isVisible" class="dialog-container" role="dialog" aria-modal="true">
            <div class="dialog-header">
              <h2 class="dialog-title">{{ title }}</h2>
              <button class="dialog-close" @click="cancel" aria-label="Schließen">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="dialog-content">
              <p v-if="message" class="dialog-message">{{ message }}</p>
              <div class="dialog-input-container">
                <label :for="inputId" class="dialog-label">{{ inputLabel }}</label>
                <input
                  :id="inputId"
                  ref="inputRef"
                  v-model="inputValue"
                  class="dialog-input"
                  :type="inputType"
                  :placeholder="placeholder"
                  :minlength="minLength"
                  :maxlength="maxLength"
                  :required="required"
                  @keydown.enter="confirm"
                />
                <div v-if="showValidationMessage" class="validation-message">
                  {{ validationMessage }}
                </div>
              </div>
            </div>
            <div class="dialog-footer">
              <button 
                v-if="showCancelButton" 
                class="dialog-btn dialog-btn-cancel" 
                @click="cancel">
                {{ cancelButtonText }}
              </button>
              <button 
                class="dialog-btn dialog-btn-confirm" 
                @click="confirm"
                :disabled="!isValid">
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
import { ref, onMounted, onBeforeUnmount, computed, watch, nextTick } from 'vue';
import { v4 as uuidv4 } from '@/utils/uuidUtil'; // Verwenden des internen UUID-Generators

interface InputDialogProps {
  // Dialog-Grundlegende Texte
  title?: string;
  message?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  
  // Input-spezifische Props
  inputLabel?: string;
  inputType?: string;
  placeholder?: string;
  defaultValue?: string;
  minLength?: number;
  maxLength?: number;
  required?: boolean;
  validator?: (value: string) => boolean | string;
  validationMessage?: string;
  
  // Dialog-Optionen
  isVisible?: boolean;
  showCancelButton?: boolean;
}

const props = withDefaults(defineProps<InputDialogProps>(), {
  title: 'Eingabe',
  message: '',
  confirmButtonText: 'Bestätigen',
  cancelButtonText: 'Abbrechen',
  inputLabel: 'Eingabe',
  inputType: 'text',
  placeholder: '',
  defaultValue: '',
  minLength: 0,
  maxLength: 256,
  required: true,
  isVisible: false,
  showCancelButton: true,
  validationMessage: 'Bitte geben Sie einen gültigen Wert ein.'
});

const emit = defineEmits<{
  (e: 'confirm', value: string): void;
  (e: 'cancel'): void;
  (e: 'update:isVisible', value: boolean): void;
}>();

// Refs
const inputRef = ref<HTMLInputElement | null>(null);
const inputValue = ref(props.defaultValue);
const inputId = ref(`input-${uuidv4().substring(0, 8)}`);
const showValidationMessage = ref(false);
const customValidationMessage = ref('');

// Computed
const isValid = computed(() => {
  // Basis-Validierung
  if (props.required && !inputValue.value.trim()) {
    return false;
  }
  
  if (inputValue.value.length < props.minLength) {
    return false;
  }
  
  // Benutzerdefinierte Validierung, falls vorhanden
  if (props.validator) {
    const result = props.validator(inputValue.value);
    if (typeof result === 'string') {
      customValidationMessage.value = result;
      return false;
    }
    return result;
  }
  
  return true;
});

const validationMessage = computed(() => {
  if (customValidationMessage.value) {
    return customValidationMessage.value;
  }
  
  if (props.required && !inputValue.value.trim()) {
    return 'Dieses Feld ist erforderlich.';
  }
  
  if (inputValue.value.length < props.minLength) {
    return `Mindestens ${props.minLength} Zeichen erforderlich.`;
  }
  
  return props.validationMessage;
});

// Dialog-Steuerung
const handleOverlayClick = () => {
  cancel();
};

const confirm = () => {
  if (!isValid.value) {
    showValidationMessage.value = true;
    return;
  }
  
  emit('confirm', inputValue.value);
  emit('update:isVisible', false);
  resetDialog();
};

const cancel = () => {
  emit('cancel');
  emit('update:isVisible', false);
  resetDialog();
};

const resetDialog = () => {
  showValidationMessage.value = false;
  customValidationMessage.value = '';
  // Wert zurücksetzen, aber mit verzögerung nachdem der Dialog geschlossen wurde
  setTimeout(() => {
    inputValue.value = props.defaultValue;
  }, 300);
};

// Tastatur-Events
const handleKeyDown = (event: KeyboardEvent) => {
  if (!props.isVisible) return;
  
  if (event.key === 'Escape') {
    event.preventDefault();
    cancel();
  }
};

// Fokusmanagement
watch(() => props.isVisible, async (newValue) => {
  if (newValue) {
    // Warten bis nach DOM-Update und dann Fokus setzen
    await nextTick();
    inputRef.value?.focus();
  }
});

// Event Listener Installation/Deinstallation
onMounted(() => {
  document.addEventListener('keydown', handleKeyDown);
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
/* Dialog Basisstile - übernommen von ConfirmDialog, überarbeitet für Input-Anforderungen */
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

.dialog-message {
  margin-top: 0;
  margin-bottom: 16px;
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
  transition: background-color 0.2s, box-shadow 0.2s;
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

.dialog-btn-confirm:hover:not(:disabled) {
  background-color: #0a6032;
}

.dialog-btn-confirm:disabled {
  background-color: #8fccac;
  cursor: not-allowed;
}

/* Input-spezifische Stile */
.dialog-input-container {
  margin-bottom: 16px;
}

.dialog-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #444;
}

.dialog-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d4d4d8;
  border-radius: 4px;
  font-size: 16px;
  color: #333;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.dialog-input:focus {
  outline: none;
  border-color: #0d7a40;
  box-shadow: 0 0 0 2px rgba(13, 122, 64, 0.2);
}

.validation-message {
  color: #ef4444;
  font-size: 14px;
  margin-top: 8px;
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