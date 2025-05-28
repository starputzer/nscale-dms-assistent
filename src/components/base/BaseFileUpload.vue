<template>
  <div
    class="base-file-upload"
    :class="{
      'base-file-upload--dragging': isDragging,
      'base-file-upload--disabled': disabled,
      'base-file-upload--has-error': !!error,
    }"
    @dragover.prevent="onDragOver"
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <div class="base-file-upload__content">
      <input
        type="file"
        ref="fileInput"
        class="base-file-upload__input"
        :accept="accept"
        :multiple="multiple"
        :disabled="disabled"
        @change="onFileInputChange"
      />

      <div class="base-file-upload__placeholder" v-if="!hasFiles">
        <div class="base-file-upload__icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="48"
            height="48"
          >
            <path fill="none" d="M0 0h24v24H0z" />
            <path
              fill="currentColor"
              d="M12 12l7-4-7-4v8z M12 12v8l7-4-7-4z M12 12l-7-4 7-4v8z M12 12v8l-7-4 7-4z"
            />
          </svg>
        </div>
        <div class="base-file-upload__text">
          <slot name="placeholder">
            <p class="base-file-upload__primary-text">
              {{ primaryText || $t("components.fileUpload.dragAndDrop") }}
            </p>
            <p class="base-file-upload__secondary-text">
              {{ secondaryText || $t("components.fileUpload.orClickToSelect") }}
            </p>
          </slot>
        </div>
        <button
          class="base-file-upload__button"
          type="button"
          @click="triggerFileInput"
          :disabled="disabled"
        >
          {{ buttonText || $t("components.fileUpload.selectFiles") }}
        </button>
      </div>

      <div class="base-file-upload__file-list" v-else>
        <div
          v-for="(file, index) in files"
          :key="index"
          class="base-file-upload__file-item"
        >
          <div class="base-file-upload__file-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="24"
              height="24"
            >
              <path fill="none" d="M0 0h24v24H0z" />
              <path
                fill="currentColor"
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
              />
              <path fill="rgba(255,255,255,0.5)" d="M14 2v6h6" />
            </svg>
          </div>
          <div class="base-file-upload__file-info">
            <div class="base-file-upload__file-name">{{ file.name }}</div>
            <div class="base-file-upload__file-size">
              {{ formatFileSize(file.size) }}
            </div>
          </div>
          <button
            class="base-file-upload__file-remove"
            type="button"
            @click="removeFile(index)"
            :disabled="disabled"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="20"
              height="20"
            >
              <path fill="none" d="M0 0h24v24H0z" />
              <path
                fill="currentColor"
                d="M12 10.586l4.95-4.95 1.414 1.414-4.95 4.95 4.95 4.95-1.414 1.414-4.95-4.95-4.95 4.95-1.414-1.414 4.95-4.95-4.95-4.95 1.414-1.414 4.95 4.95z"
              />
            </svg>
          </button>
        </div>

        <div class="base-file-upload__actions">
          <button
            class="base-file-upload__clear-button"
            type="button"
            @click="clearFiles"
            :disabled="disabled"
          >
            {{ clearButtonText || $t("components.fileUpload.clearAll") }}
          </button>
          <button
            class="base-file-upload__add-button"
            type="button"
            @click="triggerFileInput"
            :disabled="disabled || (multiple === false && files.length >= 1)"
          >
            {{ addMoreButtonText || $t("components.fileUpload.addMore") }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="error" class="base-file-upload__error">
      {{ error }}
    </div>
    <div v-else-if="hint" class="base-file-upload__hint">
      {{ hint }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, PropType } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const props = defineProps({
  modelValue: {
    type: Array as PropType<File[]>,
    default: () => [],
  },
  multiple: {
    type: Boolean,
    default: false,
  },
  accept: {
    type: String,
    default: "*/*",
  },
  maxSize: {
    type: Number,
    default: 100 * 1024 * 1024, // 100MB
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: "",
  },
  hint: {
    type: String,
    default: "",
  },
  primaryText: {
    type: String,
    default: "",
  },
  secondaryText: {
    type: String,
    default: "",
  },
  buttonText: {
    type: String,
    default: "",
  },
  clearButtonText: {
    type: String,
    default: "",
  },
  addMoreButtonText: {
    type: String,
    default: "",
  },
});

const emit = defineEmits([
  "update:modelValue",
  "file-added",
  "file-removed",
  "error",
]);

const fileInput = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);
const files = ref<File[]>([...props.modelValue]);

const hasFiles = computed(() => files.value.length > 0);

const triggerFileInput = () => {
  fileInput.value?.click();
};

const onDragOver = (event: DragEvent) => {
  if (props.disabled) return;
  isDragging.value = true;
};

const onDragLeave = (event: DragEvent) => {
  isDragging.value = false;
};

const validateFile = (file: File): string | null => {
  // Check file size
  if (file.size > props.maxSize) {
    return t("components.fileUpload.fileTooLarge", {
      size: formatFileSize(file.size),
      maxSize: formatFileSize(props.maxSize),
    });
  }

  // Check file type if accept is specified
  if (props.accept && props.accept !== "*/*") {
    const acceptTypes = props.accept
      .split(",")
      .map((type) => type.trim().toLowerCase());

    // Extract file extension and convert to lowercase
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "";
    const mimeType = file.type.toLowerCase();

    // Check if file type matches any accepted type
    const isAccepted = acceptTypes.some((acceptType) => {
      if (acceptType.startsWith(".")) {
        // Check file extension
        return `.${fileExt}` === acceptType;
      } else if (acceptType.includes("/*")) {
        // Check MIME type group (e.g., 'image/*')
        const acceptGroup = acceptType.split("/")[0];
        const mimeGroup = mimeType.split("/")[0];
        return acceptGroup === mimeGroup;
      } else {
        // Check exact MIME type
        return mimeType === acceptType;
      }
    });

    if (!isAccepted) {
      return t("components.fileUpload.invalidFileType");
    }
  }

  return null;
};

const processFiles = (fileList: FileList | File[]) => {
  if (props.disabled) return;

  const newFiles: File[] = [];
  const errors: string[] = [];

  // Convert FileList to array for easier processing
  const filesArray = Array.from(fileList);

  // Process each file
  filesArray.forEach((file) => {
    const error = validateFile(file);
    if (error) {
      errors.push(`${file.name}: ${error}`);
    } else {
      newFiles.push(file);
    }
  });

  // Emit any errors
  if (errors.length > 0) {
    emit("error", errors.join("\n"));
  }

  // Update files based on multiple setting
  if (props.multiple) {
    // Add new files to existing ones
    files.value = [...files.value, ...newFiles];
  } else {
    // Replace existing file with new one (if any)
    files.value = newFiles.length > 0 ? [newFiles[0]] : [];
  }

  // Emit update event
  emit("update:modelValue", files.value);

  // Emit file-added event for each new file
  newFiles.forEach((file) => {
    emit("file-added", file);
  });
};

const onDrop = (event: DragEvent) => {
  isDragging.value = false;
  if (props.disabled || !event.dataTransfer) return;

  processFiles(event.dataTransfer.files);
};

const onFileInputChange = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files) {
    processFiles(input.files);
  }

  // Reset input value so the same file can be selected again
  input.value = "";
};

const removeFile = (index: number) => {
  if (props.disabled) return;

  const removedFile = files.value[index];
  files.value.splice(index, 1);

  emit("update:modelValue", files.value);
  emit("file-removed", removedFile);
};

const clearFiles = () => {
  if (props.disabled) return;

  files.value = [];
  emit("update:modelValue", files.value);
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};
</script>

<style scoped lang="scss">
.base-file-upload {
  border: 2px dashed var(--border-color, #dcdfe6);
  border-radius: 8px;
  background-color: var(--input-bg, #f5f7fa);
  padding: 20px;
  transition: all 0.3s ease;

  &--dragging {
    border-color: var(--primary-color, #00a550);
    background-color: var(--primary-color-light, rgba(0, 165, 80, 0.05));
  }

  &--disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &--has-error {
    border-color: var(--error-color, #f56c6c);
  }

  &__input {
    display: none;
  }

  &__content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  &__placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 30px 20px;
    text-align: center;
  }

  &__icon {
    margin-bottom: 16px;
    color: var(--text-secondary, #909399);
  }

  &__text {
    margin-bottom: 16px;
  }

  &__primary-text {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 4px;
    color: var(--text-primary, #303133);
  }

  &__secondary-text {
    font-size: 14px;
    color: var(--text-secondary, #909399);
  }

  &__button {
    padding: 8px 16px;
    background-color: var(--primary-color, #00a550);
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.3s;

    &:hover {
      background-color: var(--primary-color-dark, #008542);
    }

    &:disabled {
      background-color: var(--disabled-color, #c0c4cc);
      cursor: not-allowed;
    }
  }

  &__file-list {
    width: 100%;
  }

  &__file-item {
    display: flex;
    align-items: center;
    padding: 12px;
    margin-bottom: 8px;
    background-color: var(--card-bg, white);
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  &__file-icon {
    margin-right: 12px;
    color: var(--primary-color, #00a550);
  }

  &__file-info {
    flex: 1;
  }

  &__file-name {
    font-weight: 500;
    margin-bottom: 4px;
    color: var(--text-primary, #303133);
    word-break: break-all;
  }

  &__file-size {
    font-size: 12px;
    color: var(--text-secondary, #909399);
  }

  &__file-remove {
    background: none;
    border: none;
    color: var(--text-secondary, #909399);
    cursor: pointer;
    padding: 4px;

    &:hover {
      color: var(--error-color, #f56c6c);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 12px;
    gap: 8px;
  }

  &__clear-button {
    padding: 6px 12px;
    background: none;
    border: 1px solid var(--border-color, #dcdfe6);
    border-radius: 4px;
    color: var(--text-secondary, #909399);
    font-size: 13px;
    cursor: pointer;

    &:hover {
      border-color: var(--error-color, #f56c6c);
      color: var(--error-color, #f56c6c);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &__add-button {
    padding: 6px 12px;
    background-color: var(--primary-color-light, rgba(0, 165, 80, 0.1));
    border: 1px solid var(--primary-color, #00a550);
    border-radius: 4px;
    color: var(--primary-color, #00a550);
    font-size: 13px;
    cursor: pointer;

    &:hover {
      background-color: var(--primary-color, #00a550);
      color: white;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background-color: var(--disabled-bg, #f5f7fa);
      border-color: var(--disabled-color, #c0c4cc);
      color: var(--disabled-color, #c0c4cc);
    }
  }

  &__error {
    margin-top: 8px;
    color: var(--error-color, #f56c6c);
    font-size: 13px;
  }

  &__hint {
    margin-top: 8px;
    color: var(--text-secondary, #909399);
    font-size: 13px;
  }
}

// Dark mode support
[data-theme="dark"] .base-file-upload {
  background-color: var(--input-bg-dark, #2b2b2b);
  border-color: var(--border-color-dark, #454545);

  &--dragging {
    background-color: rgba(0, 165, 80, 0.1);
  }

  &__file-item {
    background-color: var(--card-bg-dark, #323232);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
}

// High contrast mode support
[data-theme="contrast"] .base-file-upload {
  border-width: 3px;

  &__button,
  &__add-button,
  &__clear-button {
    border-width: 2px;
  }
}

// Responsive adjustments
@media (max-width: 480px) {
  .base-file-upload {
    padding: 15px;

    &__placeholder {
      padding: 20px 10px;
    }

    &__actions {
      flex-direction: column;
      align-items: stretch;
    }
  }
}
</style>
