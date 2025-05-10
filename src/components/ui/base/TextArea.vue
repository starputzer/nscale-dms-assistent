<template>
  <div 
    class="n-textarea-wrapper"
    :class="{ 
      'n-textarea-wrapper--disabled': disabled, 
      'n-textarea-wrapper--error': !!error,
      'n-textarea-wrapper--focused': isFocused
    }"
  >
    <label 
      v-if="label" 
      :for="textareaId" 
      class="n-textarea-label"
      :class="{ 'n-textarea-label--required': required }"
    >
      {{ label }}
    </label>

    <div class="n-textarea-container">
      <div class="n-textarea-field-wrapper">
        <textarea
          :id="textareaId"
          ref="textareaRef"
          class="n-textarea-field"
          :value="modelValue"
          :placeholder="placeholder"
          :disabled="disabled"
          :required="required"
          :maxlength="maxlength"
          :rows="rows"
          :cols="cols"
          :aria-invalid="!!error"
          :aria-describedby="ariaDescribedby"
          :spellcheck="spellcheck"
          :autocapitalize="autocapitalize"
          :autocorrect="autocorrect"
          :style="textareaStyles"
          @input="handleInput"
          @focus="handleFocus"
          @blur="handleBlur"
          @keydown="handleKeydown"
        ></textarea>
      </div>

      <div class="n-textarea-controls">
        <div v-if="showMarkdownToggle" class="n-textarea-markdown-toggle">
          <button 
            type="button" 
            class="n-textarea-toggle-btn"
            :class="{ 'n-textarea-toggle-btn--active': showMarkdownPreview }"
            @click="toggleMarkdownPreview"
            aria-pressed="showMarkdownPreview"
          >
            <span class="n-textarea-toggle-icon">
              <svg class="n-textarea-icon" viewBox="0 0 24 24" width="16" height="16">
                <path d="M3 4H21V6H3V4ZM3 19H21V21H3V19ZM21 8H8V16H21V8ZM6 8H3V10H6V8ZM3 12H6V14H3V12Z"/>
              </svg>
            </span>
            Vorschau
          </button>
        </div>

        <div v-if="maxlength && showCharacterCount" class="n-textarea-character-count">
          {{ characterCount }} / {{ maxlength }}
        </div>
      </div>

      <!-- Markdown-Vorschau -->
      <div v-if="showMarkdownPreview && showMarkdownToggle" class="n-textarea-markdown-preview">
        <div class="n-textarea-preview-content" v-html="markdownPreview"></div>
      </div>

      <div v-if="helperText || error || $slots.helper" class="n-textarea-helper-text" :id="helperId">
        <slot name="helper">
          <span v-if="error" class="n-textarea-error-text">{{ error }}</span>
          <span v-else-if="helperText">{{ helperText }}</span>
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { uniqueId } from 'lodash';
import { marked } from 'marked';

/**
 * Advanced TextArea component with autoresize, character count, and markdown support
 * @displayName TextArea
 * @example
 * <TextArea 
 *   v-model="comment" 
 *   label="Comments" 
 *   placeholder="Enter your comments here" 
 *   :auto-resize="true"
 *   :show-character-count="true"
 * />
 */
export interface TextAreaProps {
  /** Value for v-model binding */
  modelValue: string;
  /** TextArea label */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Helper text displayed below the textarea */
  helperText?: string;
  /** Error message displayed instead of helper text */
  error?: string;
  /** Whether the textarea is disabled */
  disabled?: boolean;
  /** Whether the textarea is required */
  required?: boolean;
  /** Maximum length of input (number of characters) */
  maxlength?: number;
  /** Whether to display character count (requires maxlength) */
  showCharacterCount?: boolean;
  /** Number of rows for the textarea */
  rows?: number;
  /** Number of columns for the textarea */
  cols?: number;
  /** Autofocus the textarea on mount */
  autofocus?: boolean;
  /** Unique ID for the textarea (auto-generated if not provided) */
  id?: string;
  /** Whether to enable auto-resize based on content */
  autoResize?: boolean;
  /** Minimum height for the textarea when auto-resize is enabled (in pixels) */
  minHeight?: number;
  /** Maximum height for the textarea when auto-resize is enabled (in pixels) */
  maxHeight?: number;
  /** Whether to enable spellcheck */
  spellcheck?: boolean;
  /** Auto-capitalize setting */
  autocapitalize?: string;
  /** Auto-correct setting */
  autocorrect?: string;
  /** Whether to show markdown preview toggle */
  showMarkdownToggle?: boolean;
  /** Custom CSS styles */
  customStyles?: Record<string, string>;
}

const props = withDefaults(defineProps<TextAreaProps>(), {
  placeholder: '',
  disabled: false,
  required: false,
  showCharacterCount: false,
  rows: 3,
  cols: undefined,
  autofocus: false,
  autoResize: true,
  minHeight: 80,
  maxHeight: 300,
  spellcheck: true,
  autocapitalize: 'sentences',
  autocorrect: 'on',
  showMarkdownToggle: false,
  customStyles: () => ({})
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'focus', event: FocusEvent): void;
  (e: 'blur', event: FocusEvent): void;
  (e: 'input', event: Event): void;
  (e: 'keydown', event: KeyboardEvent): void;
}>();

// Internal state
const textareaId = computed(() => props.id || uniqueId('n-textarea-'));
const helperId = computed(() => `${textareaId.value}-helper`);
const ariaDescribedby = computed(() => props.helperText || props.error ? helperId.value : undefined);
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const isFocused = ref(false);
const textareaHeight = ref<number | null>(null);
const showMarkdownPreview = ref(false);

// Calculate character count
const characterCount = computed(() => props.modelValue.length);

// Compute textarea styles
const textareaStyles = computed(() => {
  const styles: Record<string, string> = {
    ...props.customStyles,
  };

  if (props.autoResize && textareaHeight.value) {
    styles.height = `${textareaHeight.value}px`;
    styles.overflow = textareaHeight.value >= props.maxHeight ? 'auto' : 'hidden';
  }

  return styles;
});

// Compute markdown preview
const markdownPreview = computed(() => {
  if (!props.modelValue || !showMarkdownPreview.value) return '';
  
  try {
    return marked.parse(props.modelValue, { breaks: true, sanitize: true });
  } catch (error) {
    console.error('Error parsing markdown:', error);
    return props.modelValue;
  }
});

// Event handlers
function handleInput(event: Event) {
  const target = event.target as HTMLTextAreaElement;
  const value = target.value;
  
  emit('update:modelValue', value);
  emit('input', event);
  
  // Auto-resize the textarea if enabled
  if (props.autoResize) {
    nextTick(() => resizeTextarea());
  }
}

function handleFocus(event: FocusEvent) {
  isFocused.value = true;
  emit('focus', event);
}

function handleBlur(event: FocusEvent) {
  isFocused.value = false;
  emit('blur', event);
}

function handleKeydown(event: KeyboardEvent) {
  emit('keydown', event);
}

// Toggle markdown preview
function toggleMarkdownPreview() {
  showMarkdownPreview.value = !showMarkdownPreview.value;
}

// Resize textarea based on content
function resizeTextarea() {
  if (!textareaRef.value || !props.autoResize) return;
  
  // Reset height to measure actual scrollHeight
  textareaRef.value.style.height = 'auto';
  
  // Calculate new height within min/max constraints
  const newHeight = Math.min(
    Math.max(textareaRef.value.scrollHeight, props.minHeight),
    props.maxHeight
  );
  
  // Only update if height changed
  if (newHeight !== textareaHeight.value) {
    textareaHeight.value = newHeight;
  }
}

// Handle changes to the model value
watch(() => props.modelValue, () => {
  if (props.autoResize) {
    nextTick(() => resizeTextarea());
  }
});

// Focus the textarea if autofocus is enabled
onMounted(() => {
  if (props.autofocus && !props.disabled) {
    nextTick(() => {
      textareaRef.value?.focus();
    });
  }
  
  // Initial resize
  if (props.autoResize) {
    nextTick(() => resizeTextarea());
  }
});
</script>

<style scoped>
.n-textarea-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-bottom: 1rem;
  font-family: var(--n-font-family, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
}

.n-textarea-label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: var(--n-font-size-sm, 0.875rem);
  font-weight: 500;
  color: var(--n-color-text-primary, #1e293b);
}

.n-textarea-label--required::after {
  content: "*";
  color: var(--n-color-error, #ef4444);
  margin-left: 0.25rem;
}

.n-textarea-container {
  position: relative;
}

.n-textarea-field-wrapper {
  display: flex;
  position: relative;
  background-color: var(--n-color-background-base, #ffffff);
  border: 1px solid var(--n-color-border, #e2e8f0);
  border-radius: var(--n-border-radius, 0.375rem);
  transition: all var(--n-transition, 0.2s) ease;
}

/* Focus state */
.n-textarea-wrapper--focused .n-textarea-field-wrapper {
  border-color: var(--n-color-primary, #3b82f6);
  box-shadow: 0 0 0 3px rgba(var(--n-color-primary-rgb, '59, 130, 246'), 0.2);
}

/* Error state */
.n-textarea-wrapper--error .n-textarea-field-wrapper {
  border-color: var(--n-color-error, #ef4444);
}

.n-textarea-wrapper--error.n-textarea-wrapper--focused .n-textarea-field-wrapper {
  box-shadow: 0 0 0 3px rgba(var(--n-color-error-rgb, '239, 68, 68'), 0.2);
}

/* Disabled state */
.n-textarea-wrapper--disabled .n-textarea-field-wrapper {
  background-color: var(--n-color-background-alt, #f8fafc);
  border-color: var(--n-color-border, #e2e8f0);
  opacity: 0.75;
  cursor: not-allowed;
}

.n-textarea-field {
  width: 100%;
  padding: 0.75rem 1rem;
  background: transparent;
  border: none;
  outline: none;
  font-size: var(--n-font-size-md, 1rem);
  color: var(--n-color-text-primary, #1e293b);
  line-height: 1.5;
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
}

.n-textarea-field::placeholder {
  color: var(--n-color-text-secondary, #64748b);
  opacity: 0.7;
}

.n-textarea-field:disabled {
  cursor: not-allowed;
  color: var(--n-color-text-secondary, #64748b);
}

/* Controls area */
.n-textarea-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-top: 1px solid var(--n-color-border, #e2e8f0);
  background-color: var(--n-color-background-alt, #f8fafc);
  border-radius: 0 0 var(--n-border-radius, 0.375rem) var(--n-border-radius, 0.375rem);
}

/* Character count */
.n-textarea-character-count {
  font-size: var(--n-font-size-xs, 0.75rem);
  color: var(--n-color-text-secondary, #64748b);
  margin-left: auto;
}

/* Markdown toggle */
.n-textarea-markdown-toggle {
  display: flex;
  align-items: center;
}

.n-textarea-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  font-size: var(--n-font-size-xs, 0.75rem);
  border: 1px solid var(--n-color-border, #e2e8f0);
  border-radius: var(--n-border-radius-sm, 0.25rem);
  background-color: var(--n-color-background-base, #ffffff);
  color: var(--n-color-text-secondary, #64748b);
  cursor: pointer;
  transition: all var(--n-transition-fast, 0.15s) ease;
}

.n-textarea-toggle-btn:hover {
  background-color: var(--n-color-background-alt, #f8fafc);
  border-color: var(--n-color-border-dark, #cbd5e1);
}

.n-textarea-toggle-btn--active {
  background-color: var(--n-color-primary-light, #e6f0f9);
  border-color: var(--n-color-primary, #3b82f6);
  color: var(--n-color-primary, #3b82f6);
}

.n-textarea-icon {
  fill: currentColor;
}

/* Markdown preview area */
.n-textarea-markdown-preview {
  margin-top: 0.5rem;
  padding: 1rem;
  border: 1px solid var(--n-color-border, #e2e8f0);
  border-radius: var(--n-border-radius, 0.375rem);
  background-color: var(--n-color-background-base, #ffffff);
  min-height: calc(var(--n-font-size-md, 1rem) * 1.5 * 3);
}

.n-textarea-preview-content {
  font-size: var(--n-font-size-md, 1rem);
  line-height: 1.6;
  color: var(--n-color-text-primary, #1e293b);
}

.n-textarea-preview-content :deep(h1),
.n-textarea-preview-content :deep(h2),
.n-textarea-preview-content :deep(h3),
.n-textarea-preview-content :deep(h4),
.n-textarea-preview-content :deep(h5),
.n-textarea-preview-content :deep(h6) {
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  line-height: 1.2;
}

.n-textarea-preview-content :deep(p) {
  margin-top: 0.5em;
  margin-bottom: 1em;
}

.n-textarea-preview-content :deep(ul),
.n-textarea-preview-content :deep(ol) {
  margin-top: 0.5em;
  margin-bottom: 1em;
  padding-left: 2em;
}

.n-textarea-preview-content :deep(a) {
  color: var(--n-color-primary, #3b82f6);
  text-decoration: underline;
}

.n-textarea-preview-content :deep(pre) {
  margin: 1em 0;
  padding: 1em;
  border-radius: var(--n-border-radius, 0.375rem);
  background-color: var(--n-color-background-alt, #f8fafc);
  overflow-x: auto;
}

.n-textarea-preview-content :deep(code) {
  font-family: monospace;
  padding: 0.2em 0.4em;
  border-radius: var(--n-border-radius-sm, 0.25rem);
  background-color: var(--n-color-background-alt, #f8fafc);
}

.n-textarea-preview-content :deep(blockquote) {
  margin: 1em 0;
  padding-left: 1em;
  border-left: 4px solid var(--n-color-border, #e2e8f0);
  color: var(--n-color-text-secondary, #64748b);
}

/* Helper text and error message */
.n-textarea-helper-text {
  font-size: var(--n-font-size-xs, 0.75rem);
  margin-top: 0.375rem;
  color: var(--n-color-text-secondary, #64748b);
}

.n-textarea-error-text {
  color: var(--n-color-error, #ef4444);
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .n-textarea-label {
    color: var(--n-color-text-primary, #f1f5f9);
  }
  
  .n-textarea-field-wrapper {
    background-color: var(--n-color-background-alt, #1e293b);
    border-color: var(--n-color-border, #334155);
  }
  
  .n-textarea-field {
    color: var(--n-color-text-primary, #f1f5f9);
  }
  
  .n-textarea-field::placeholder {
    color: var(--n-color-text-secondary, #94a3b8);
  }
  
  .n-textarea-wrapper--disabled .n-textarea-field-wrapper {
    background-color: var(--n-color-background-dark, #0f172a);
  }
  
  .n-textarea-controls {
    background-color: rgba(30, 41, 59, 0.5);
    border-color: var(--n-color-border, #334155);
  }
  
  .n-textarea-toggle-btn {
    background-color: var(--n-color-background-alt, #1e293b);
    border-color: var(--n-color-border, #334155);
    color: var(--n-color-text-secondary, #94a3b8);
  }
  
  .n-textarea-toggle-btn:hover {
    background-color: var(--n-color-background-dark, #0f172a);
  }
  
  .n-textarea-toggle-btn--active {
    background-color: rgba(59, 130, 246, 0.2);
    border-color: var(--n-color-primary, #3b82f6);
  }
  
  .n-textarea-markdown-preview {
    background-color: var(--n-color-background-alt, #1e293b);
    border-color: var(--n-color-border, #334155);
  }
  
  .n-textarea-preview-content {
    color: var(--n-color-text-primary, #f1f5f9);
  }
  
  .n-textarea-preview-content :deep(pre),
  .n-textarea-preview-content :deep(code) {
    background-color: var(--n-color-background-dark, #0f172a);
  }
  
  .n-textarea-preview-content :deep(blockquote) {
    border-color: var(--n-color-border, #334155);
    color: var(--n-color-text-secondary, #94a3b8);
  }
}

/* Responsive design */
@media (max-width: 768px) {
  .n-textarea-label {
    font-size: var(--n-font-size-xs, 0.75rem);
  }
  
  .n-textarea-field {
    font-size: var(--n-font-size-sm, 0.875rem);
    padding: 0.5rem 0.75rem;
  }
  
  .n-textarea-controls {
    padding: 0.25rem 0.5rem;
  }
}
</style>