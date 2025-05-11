<template>
  <div class="input-container">
    <div class="input-wrapper">
      <form class="input-form" @submit.prevent="handleSubmit">
        <textarea
          ref="textareaRef"
          v-model="inputText"
          class="nscale-input message-input"
          placeholder="Stellen Sie Ihre Frage..."
          :disabled="disabled"
          @keydown.enter.exact.prevent="handleSubmit"
          @input="adjustTextareaHeight"
          @focus="isInputFocused = true"
          @blur="isInputFocused = false"
        ></textarea>

        <div class="input-buttons">
          <button
            type="button"
            class="attachment-button"
            :disabled="disabled"
            @click="triggerFileSelect"
            title="Datei anhängen"
          >
            <i class="fas fa-paperclip"></i>
          </button>

          <button
            type="submit"
            class="send-button"
            :disabled="!canSubmit"
            :class="{ 'send-button-active': canSubmit }"
            title="Nachricht senden"
          >
            <i class="fas fa-paper-plane"></i>
          </button>
        </div>

        <input
          type="file"
          ref="fileInput"
          class="file-input"
          @change="handleFileSelected"
          accept=".pdf,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
        />
      </form>
    </div>

    <div class="input-footer">
      <div
        class="character-count"
        :class="{ 'character-limit-warning': isNearCharacterLimit }"
      >
        {{ inputText.length }}/4000
      </div>

      <div class="footer-hints">
        <span class="hint"
          >Drücken Sie <kbd>Enter</kbd> zum Senden, <kbd>Shift</kbd>+<kbd
            >Enter</kbd
          >
          für neue Zeile</span
        >
      </div>

      <div v-if="selectedFile" class="file-preview">
        <div class="file-preview-info">
          <i class="fas fa-file-alt file-icon"></i>
          <span class="file-name">{{ selectedFile.name }}</span>
          <span class="file-size"
            >({{ formatFileSize(selectedFile.size) }})</span
          >
        </div>
        <button
          type="button"
          class="remove-file-button"
          @click="removeSelectedFile"
        >
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";

// Props
const props = defineProps({
  disabled: {
    type: Boolean,
    default: false,
  },
  sessionId: {
    type: String,
    default: null,
  },
});

// Emits
const emit = defineEmits<{
  (e: "send-message", message: string): void;
  (e: "upload-file", file: File): void;
}>();

// State
const inputText = ref("");
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const isInputFocused = ref(false);

// Constants
const MAX_CHARACTERS = 4000;
const NEAR_LIMIT_THRESHOLD = 3800;

// Computed properties
const canSubmit = computed(() => {
  return (
    !props.disabled &&
    ((inputText.value.trim().length > 0 &&
      inputText.value.length <= MAX_CHARACTERS) ||
      selectedFile.value !== null)
  );
});

const isNearCharacterLimit = computed(() => {
  return inputText.value.length > NEAR_LIMIT_THRESHOLD;
});

// Reset textarea height when input is cleared
watch(
  () => inputText.value,
  (newValue) => {
    if (newValue === "" && textareaRef.value) {
      textareaRef.value.style.height = "auto";
    }
  },
);

// Lifecycle hooks
onMounted(() => {
  adjustTextareaHeight();

  // Focus input on mount
  if (textareaRef.value && !props.disabled) {
    textareaRef.value.focus();
  }
});

// Methods
function adjustTextareaHeight() {
  if (!textareaRef.value) return;

  // Reset height to get the scrollHeight value for actual content
  textareaRef.value.style.height = "auto";

  // Set the height based on scrollHeight with a max height
  const maxHeight = 150; // max height in pixels
  const newHeight = Math.min(textareaRef.value.scrollHeight, maxHeight);
  textareaRef.value.style.height = `${newHeight}px`;
}

function handleSubmit() {
  if (!canSubmit.value) return;

  // If we have a file, emit upload event
  if (selectedFile.value) {
    emit("upload-file", selectedFile.value);
    removeSelectedFile();
  }

  // If we have text, emit message event
  if (inputText.value.trim()) {
    emit("send-message", inputText.value);
    inputText.value = "";

    // Reset textarea height
    if (textareaRef.value) {
      textareaRef.value.style.height = "auto";
    }
  }

  // Focus back on the textarea
  if (textareaRef.value) {
    textareaRef.value.focus();
  }
}

function triggerFileSelect() {
  if (fileInput.value) {
    fileInput.value.click();
  }
}

function handleFileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    selectedFile.value = input.files[0];
  }
}

function removeSelectedFile() {
  selectedFile.value = null;
  if (fileInput.value) {
    fileInput.value.value = "";
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
</script>

<style scoped>
.input-container {
  background-color: var(--nscale-card-bg, white);
  border-top: 1px solid var(--nscale-border, #eaeaea);
  padding: 1rem 1.5rem;
  width: 100%;
}

.input-wrapper {
  max-width: 900px;
  margin: 0 auto;
  position: relative;
}

.input-form {
  display: flex;
  gap: 0.75rem;
  align-items: flex-end;
  position: relative;
}

.message-input {
  flex: 1;
  resize: none;
  min-height: 44px;
  max-height: 150px;
  overflow-y: auto;
  line-height: 1.5;
  padding-right: 5rem;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  width: 100%;
}

.input-buttons {
  position: absolute;
  right: 10px;
  bottom: 10px;
  display: flex;
  gap: 0.5rem;
}

.send-button,
.attachment-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: none;
  border: none;
  color: var(--nscale-text-light, #666);
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.send-button:hover:not(:disabled),
.attachment-button:hover:not(:disabled) {
  background-color: var(--nscale-gray, #f7f7f7);
  color: var(--nscale-text, #333333);
}

.send-button:disabled,
.attachment-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-button-active {
  color: var(--nscale-green);
}

.file-input {
  display: none;
}

.input-footer {
  max-width: 900px;
  margin: 0.5rem auto 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  color: var(--nscale-text-light, #666);
}

.character-count {
  font-family: monospace;
}

.character-limit-warning {
  color: #e53e3e;
  font-weight: 500;
}

.footer-hints {
  flex: 1;
  text-align: center;
}

.hint kbd {
  background-color: var(--nscale-gray, #f7f7f7);
  padding: 2px 5px;
  border-radius: 3px;
  border: 1px solid var(--nscale-border, #eaeaea);
  font-family: monospace;
  font-size: 0.7rem;
}

.file-preview {
  display: flex;
  align-items: center;
  background-color: var(--nscale-gray, #f7f7f7);
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  margin-top: 0.5rem;
  max-width: 900px;
  margin: 0.5rem auto 0;
}

.file-preview-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  overflow: hidden;
  flex: 1;
}

.file-icon {
  color: var(--nscale-text-light, #666);
}

.file-name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  color: var(--nscale-text-light, #666);
  white-space: nowrap;
}

.remove-file-button {
  background: none;
  border: none;
  color: var(--nscale-text-light, #666);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 50%;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.remove-file-button:hover {
  background-color: rgba(229, 62, 62, 0.1);
  color: #e53e3e;
}

@media (max-width: 768px) {
  .input-container {
    padding: 0.75rem 1rem;
  }

  .footer-hints {
    display: none;
  }

  .file-preview {
    margin-top: 0.75rem;
  }
}
</style>
