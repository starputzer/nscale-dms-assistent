<template>
  <div
    class="n-enhanced-message-input"
    :class="{
      'n-enhanced-message-input--focused': isFocused,
      'n-enhanced-message-input--disabled': disabled,
      'n-enhanced-message-input--loading': isLoading,
      'n-enhanced-message-input--has-preview':
        showMarkdownPreview && markdownPreview,
    }"
  >
    <div class="n-enhanced-message-input__container">
      <!-- Haupt-Textfeld mit Auto-Resize -->
      <div class="n-enhanced-message-input__textarea-container">
        <textarea
          ref="inputElement"
          v-model="inputValue"
          class="n-enhanced-message-input__textarea"
          :placeholder="placeholder"
          :maxlength="maxLength"
          :disabled="disabled || isLoading"
          :aria-label="ariaLabel || placeholder"
          :aria-describedby="
            error ? 'input-error' : hint ? 'input-hint' : undefined
          "
          :aria-invalid="!!error"
          @input="resizeTextarea"
          @keydown="handleKeydown"
          @focus="handleFocus"
          @blur="handleBlur"
          @paste="handlePaste"
          @drop="handleDrop"
        ></textarea>

        <!-- Formatierungswerkzeuge -->
        <div
          v-if="showFormatButtons"
          class="n-enhanced-message-input__format-buttons"
        >
          <button
            v-for="(btn, index) in formatButtons"
            :key="index"
            type="button"
            class="n-enhanced-message-input__format-btn"
            :title="btn.title"
            @click="formatText(btn.format)"
            :aria-label="btn.title"
          >
            <span class="n-enhanced-message-input__format-icon">{{
              btn.icon
            }}</span>
          </button>
        </div>

        <!-- Datei-Upload-Bereich -->
        <div
          v-if="allowFileUpload && isDragging"
          class="n-enhanced-message-input__drop-zone"
          aria-hidden="true"
        >
          <div class="n-enhanced-message-input__drop-message">
            <span class="n-enhanced-message-input__drop-icon">📎</span>
            <span>Dateien hier ablegen</span>
          </div>
        </div>
      </div>

      <!-- Markdown-Vorschau (wenn aktiviert) -->
      <div
        v-if="showMarkdownPreview && markdownPreview"
        class="n-enhanced-message-input__preview"
        aria-live="polite"
        aria-atomic="true"
      >
        <div class="n-enhanced-message-input__preview-header">
          <span>Vorschau</span>
          <button
            type="button"
            class="n-enhanced-message-input__preview-close"
            @click="markdownPreview = false"
            aria-label="Vorschau schließen"
          >
            ×
          </button>
        </div>
        <div
          class="n-enhanced-message-input__preview-content"
          v-html="formattedPreview"
        ></div>
      </div>
    </div>

    <!-- Input-Aktionen -->
    <div class="n-enhanced-message-input__actions">
      <!-- Zeichenzähler -->
      <div
        v-if="maxLength && showCharacterCount"
        class="n-enhanced-message-input__char-count"
      >
        {{ inputValue.length }}/{{ maxLength }}
      </div>

      <!-- Zusätzliche Aktionsbuttons -->
      <div class="n-enhanced-message-input__action-buttons">
        <!-- Vorschau-Toggle -->
        <button
          v-if="showMarkdownPreview && inputValue.trim().length > 0"
          type="button"
          class="n-enhanced-message-input__action-btn"
          :class="{
            'n-enhanced-message-input__action-btn--active': markdownPreview,
          }"
          @click="togglePreview"
          :title="markdownPreview ? 'Vorschau ausblenden' : 'Vorschau anzeigen'"
          :aria-label="
            markdownPreview ? 'Vorschau ausblenden' : 'Vorschau anzeigen'
          "
          :aria-pressed="markdownPreview"
        >
          <span class="n-enhanced-message-input__btn-icon">👁️</span>
        </button>

        <!-- Emoji-Picker-Button -->
        <button
          v-if="showEmojiPicker"
          type="button"
          class="n-enhanced-message-input__action-btn"
          @click="toggleEmojiPicker"
          title="Emoji einfügen"
          aria-label="Emoji einfügen"
          :aria-expanded="isEmojiPickerOpen"
        >
          <span class="n-enhanced-message-input__btn-icon">😊</span>
        </button>

        <!-- Datei-Upload-Button -->
        <button
          v-if="allowFileUpload"
          type="button"
          class="n-enhanced-message-input__action-btn"
          @click="triggerFileUpload"
          title="Datei hochladen"
          aria-label="Datei hochladen"
        >
          <span class="n-enhanced-message-input__btn-icon">📎</span>
          <input
            ref="fileInput"
            type="file"
            class="n-enhanced-message-input__file-input"
            :multiple="allowMultipleFiles"
            :accept="allowedFileTypes.join(',')"
            @change="handleFileInputChange"
            aria-hidden="true"
            tabindex="-1"
          />
        </button>
      </div>

      <!-- Absenden-Button -->
      <button
        type="button"
        class="n-enhanced-message-input__send-btn"
        :disabled="!canSubmit || disabled || isLoading"
        @click="handleSubmit"
        :title="sendButtonTitle"
        :aria-label="sendButtonTitle"
      >
        <span
          v-if="isLoading"
          class="n-enhanced-message-input__loading-indicator"
        >
          <span></span>
          <span></span>
          <span></span>
        </span>
        <span v-else class="n-enhanced-message-input__send-icon"></span>
      </button>
    </div>

    <!-- Emoji-Picker-Dropdown -->
    <div
      v-if="showEmojiPicker && isEmojiPickerOpen"
      class="n-enhanced-message-input__emoji-picker"
      ref="emojiPicker"
    >
      <div class="n-enhanced-message-input__emoji-picker-header">
        <span>Emoji auswählen</span>
        <button
          type="button"
          class="n-enhanced-message-input__emoji-picker-close"
          @click="isEmojiPickerOpen = false"
          aria-label="Emoji-Picker schließen"
        >
          ×
        </button>
      </div>
      <div class="n-enhanced-message-input__emoji-grid">
        <button
          v-for="emoji in commonEmojis"
          :key="emoji"
          type="button"
          class="n-enhanced-message-input__emoji-btn"
          @click="insertEmoji(emoji)"
          :aria-label="`Emoji ${emoji} einfügen`"
        >
          {{ emoji }}
        </button>
      </div>
    </div>

    <!-- Fehlermeldung -->
    <div
      v-if="error"
      id="input-error"
      class="n-enhanced-message-input__error"
      role="alert"
    >
      {{ error }}
    </div>

    <!-- Hinweis -->
    <div
      v-if="hint && !error"
      id="input-hint"
      class="n-enhanced-message-input__hint"
    >
      {{ hint }}
    </div>

    <!-- Keyboard-Shortcuts-Info -->
    <div
      v-if="showKeyboardShortcuts"
      class="n-enhanced-message-input__shortcuts"
    >
      <span><kbd>Enter</kbd> zum Senden</span>
      <span><kbd>Shift</kbd> + <kbd>Enter</kbd> für neue Zeile</span>
      <span v-if="showMarkdownPreview"
        ><kbd>Ctrl</kbd> + <kbd>P</kbd> für Vorschau</span
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onMounted,
  nextTick,
  onBeforeUnmount,
} from "vue";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { highlightCode } from "@/utils/messageFormatter";

// Typendefinitionen für einen Formatierungsbutton
interface FormatButton {
  icon: string;
  title: string;
  format: string;
}

// Liste der häufig verwendeten Emojis
const commonEmojis = [
  "😊",
  "👍",
  "👎",
  "🙂",
  "😀",
  "👋",
  "✅",
  "⚠️",
  "❓",
  "💡",
  "🔍",
  "📝",
  "📚",
  "💻",
  "📁",
  "📊",
  "📈",
  "🔄",
  "⏱️",
  "📅",
  "🔒",
];

// Liste der Format-Buttons
const formatButtons: FormatButton[] = [
  { icon: "B", title: "Fett", format: "**$selection$**" },
  { icon: "I", title: "Kursiv", format: "*$selection$*" },
  { icon: "C", title: "Code", format: "`$selection$`" },
  { icon: "≡", title: "Liste", format: "- $selection$" },
  { icon: "#", title: "Überschrift", format: "### $selection$" },
  { icon: "```", title: "Codeblock", format: "```\n$selection$\n```" },
];

// Props Definition
interface Props {
  /** Aktueller Eingabewert (v-model) */
  modelValue?: string;

  /** Platzhaltertext */
  placeholder?: string;

  /** Aria-Label für Barrierefreiheit */
  ariaLabel?: string;

  /** Ob die Eingabe deaktiviert ist */
  disabled?: boolean;

  /** Ob die Komponente gerade lädt */
  isLoading?: boolean;

  /** Maximale Anzahl an Zeichen */
  maxLength?: number;

  /** Minimale Höhe des Textfelds in Pixeln */
  minHeight?: number;

  /** Maximale Höhe des Textfelds in Pixeln */
  maxHeight?: number;

  /** Anfangshöhe des Textfelds in Pixeln */
  initialHeight?: number;

  /** Zeigt die Zeichenanzahl an */
  showCharacterCount?: boolean;

  /** Fehlermeldung */
  error?: string;

  /** Hinweistext */
  hint?: string;

  /** Titel für den Senden-Button */
  sendButtonTitle?: string;

  /** Autofokus */
  autofocus?: boolean;

  /** Ob Markdown-Vorschau angezeigt werden soll */
  showMarkdownPreview?: boolean;

  /** Ob der Emoji-Picker angezeigt werden soll */
  showEmojiPicker?: boolean;

  /** Ob die Formatierungsbuttons angezeigt werden sollen */
  showFormatButtons?: boolean;

  /** Ob Tastenkürzel angezeigt werden sollen */
  showKeyboardShortcuts?: boolean;

  /** Ob Datei-Upload erlaubt ist */
  allowFileUpload?: boolean;

  /** Ob mehrere Dateien hochgeladen werden können */
  allowMultipleFiles?: boolean;

  /** Erlaubte Dateitypen für Upload */
  allowedFileTypes?: string[];
}

// Default-Werte für Props
const props = withDefaults(defineProps<Props>(), {
  modelValue: "",
  placeholder: "Geben Sie Ihre Nachricht ein...",
  disabled: false,
  isLoading: false,
  maxLength: 4000,
  minHeight: 56,
  maxHeight: 200,
  initialHeight: 56,
  showCharacterCount: true,
  sendButtonTitle: "Nachricht senden (Enter)",
  autofocus: true,
  showMarkdownPreview: true,
  showEmojiPicker: true,
  showFormatButtons: true,
  showKeyboardShortcuts: true,
  allowFileUpload: true,
  allowMultipleFiles: true,
  allowedFileTypes: [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".txt",
  ],
});

// Emit Definition
const emit = defineEmits<{
  /** Event beim Ändern des Eingabewerts */
  (e: "update:modelValue", value: string): void;

  /** Event beim Absenden des Formulars */
  (e: "submit", value: string): void;

  /** Event beim Hochladen von Dateien */
  (e: "file-upload", files: File[]): void;

  /** Event beim Fokussieren des Eingabefelds */
  (e: "focus"): void;

  /** Event beim Verlassen des Eingabefelds */
  (e: "blur"): void;

  /** Event beim Drücken einer Taste */
  (e: "keydown", event: KeyboardEvent): void;
}>();

// Lokale Zustände
const inputElement = ref<HTMLTextAreaElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const emojiPicker = ref<HTMLDivElement | null>(null);
const inputValue = ref(props.modelValue);
const isFocused = ref(false);
const markdownPreview = ref(false);
const isEmojiPickerOpen = ref(false);
const isDragging = ref(false);
const selectionStart = ref(0);
const selectionEnd = ref(0);

// Computed Properties
const canSubmit = computed(() => {
  return (
    inputValue.value.trim().length > 0 &&
    (!props.maxLength || inputValue.value.length <= props.maxLength)
  );
});

const formattedPreview = computed(() => {
  if (!inputValue.value) return "";

  try {
    let htmlContent = marked(inputValue.value);
    htmlContent = DOMPurify.sanitize(htmlContent);
    return htmlContent;
  } catch (error) {
    console.error("Error formatting preview:", error);
    return "<p>Fehler bei der Formatierung der Vorschau.</p>";
  }
});

// Event-Handler

function handleSubmit(): void {
  if (!canSubmit.value || props.disabled || props.isLoading) {
    return;
  }

  const trimmedValue = inputValue.value.trim();
  emit("submit", trimmedValue);
  inputValue.value = "";

  // Vorschau zurücksetzen
  markdownPreview.value = false;

  // Textarea zurücksetzen und Größe anpassen
  nextTick(() => {
    resizeTextarea();

    // Fokus auf Textarea setzen
    if (inputElement.value) {
      inputElement.value.focus();
    }
  });
}

function handleKeydown(event: KeyboardEvent): void {
  // Cursortasten-Positionen merken
  if (inputElement.value) {
    selectionStart.value = inputElement.value.selectionStart;
    selectionEnd.value = inputElement.value.selectionEnd;
  }

  // Event an die übergeordnete Komponente weiterleiten
  emit("keydown", event);

  // Enter zum Senden (ohne Shift)
  if (
    event.key === "Enter" &&
    !event.shiftKey &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.metaKey
  ) {
    event.preventDefault();
    handleSubmit();
    return;
  }

  // Markdown-Vorschau mit Strg+P
  if (
    event.key === "p" &&
    (event.ctrlKey || event.metaKey) &&
    props.showMarkdownPreview
  ) {
    event.preventDefault();
    togglePreview();
    return;
  }

  // Emojis mit : einleiten
  if (event.key === ":" && props.showEmojiPicker) {
    // Hier könnte man einen Emoji-Autocomplete starten
  }

  // Auto-Vervollständigung für Markdown-Syntax
  if (inputElement.value) {
    const { selectionStart, selectionEnd } = inputElement.value;

    // Automatisches Schließen von Klammern und Anführungszeichen
    if (
      event.key === "(" ||
      event.key === "[" ||
      event.key === "{" ||
      event.key === '"' ||
      event.key === "'"
    ) {
      const closingChar = {
        "(": ")",
        "[": "]",
        "{": "}",
        '"': '"',
        "'": "'",
      }[event.key];

      // Nur automatisch schließen, wenn kein Text markiert ist
      if (selectionStart === selectionEnd && closingChar) {
        event.preventDefault();

        const beforeCursor = inputValue.value.substring(0, selectionStart);
        const afterCursor = inputValue.value.substring(selectionEnd);

        inputValue.value = `${beforeCursor}${event.key}${closingChar}${afterCursor}`;

        nextTick(() => {
          if (inputElement.value) {
            inputElement.value.selectionStart = selectionStart + 1;
            inputElement.value.selectionEnd = selectionStart + 1;
          }
        });
      }
    }

    // Automatisches Einrücken für Listen
    if (event.key === "Enter" && event.shiftKey) {
      const currentLine = getCurrentLine();

      // Liste fortsetzen, wenn aktuelle Zeile mit "- " oder "* " beginnt
      if (/^(\s*[-*]\s+)(.*)$/.test(currentLine)) {
        const match = currentLine.match(/^(\s*[-*]\s+)(.*)$/);

        if (match) {
          const [, listPrefix, content] = match;

          // Wenn der Inhalt leer ist, Ende der Liste
          if (!content.trim()) {
            // Letzte Listenzeile entfernen und regulären Zeilenumbruch einfügen
            event.preventDefault();
            removeCurrentListItem();
            insertText("\n");
          } else {
            // Liste fortsetzen
            event.preventDefault();
            insertText("\n" + listPrefix);
          }
        }
      }
    }
  }
}

function handleFocus(): void {
  isFocused.value = true;
  emit("focus");
}

function handleBlur(): void {
  isFocused.value = false;
  emit("blur");
}

function handlePaste(event: ClipboardEvent): void {
  // Bilder aus der Zwischenablage verarbeiten
  if (props.allowFileUpload && event.clipboardData) {
    const items = event.clipboardData.items;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (item.kind === "file") {
        const file = item.getAsFile();

        if (file) {
          // Datei-Typ prüfen
          if (isAllowedFileType(file.type)) {
            event.preventDefault();
            handleFileUpload([file]);
          }
        }
      }
    }
  }
}

function handleDrop(event: DragEvent): void {
  if (!props.allowFileUpload) return;

  event.preventDefault();
  isDragging.value = false;

  if (
    event.dataTransfer &&
    event.dataTransfer.files &&
    event.dataTransfer.files.length > 0
  ) {
    const files: File[] = Array.from(event.dataTransfer.files);
    const allowedFiles = files.filter((file) => isAllowedFileType(file.type));

    if (allowedFiles.length > 0) {
      handleFileUpload(allowedFiles);
    }
  }
}

// Drag & Drop Handlers
onMounted(() => {
  const handleDragOver = (event: DragEvent) => {
    if (!props.allowFileUpload) return;

    event.preventDefault();
    isDragging.value = true;
  };

  const handleDragLeave = (event: DragEvent) => {
    if (!props.allowFileUpload) return;

    event.preventDefault();

    // Nur als falsch markieren, wenn der Drag wirklich das Element verlässt
    const rect = inputElement.value?.getBoundingClientRect();
    if (rect) {
      if (
        event.clientX < rect.left ||
        event.clientX >= rect.right ||
        event.clientY < rect.top ||
        event.clientY >= rect.bottom
      ) {
        isDragging.value = false;
      }
    }
  };

  const handleClickOutside = (event: MouseEvent) => {
    // Emoji-Picker schließen, wenn außerhalb geklickt wird
    if (
      isEmojiPickerOpen.value &&
      emojiPicker.value &&
      !emojiPicker.value.contains(event.target as Node)
    ) {
      isEmojiPickerOpen.value = false;
    }
  };

  // Event-Listener hinzufügen
  if (inputElement.value) {
    inputElement.value.addEventListener("dragover", handleDragOver);
    inputElement.value.addEventListener("dragleave", handleDragLeave);
  }

  document.addEventListener("click", handleClickOutside);

  // Event-Listener bei Komponenten-Zerstörung entfernen
  onBeforeUnmount(() => {
    if (inputElement.value) {
      inputElement.value.removeEventListener("dragover", handleDragOver);
      inputElement.value.removeEventListener("dragleave", handleDragLeave);
    }

    document.removeEventListener("click", handleClickOutside);
  });

  // Initial die Textarea-Größe anpassen
  nextTick(() => {
    resizeTextarea();
  });

  // Autofokus
  if (props.autofocus && inputElement.value) {
    inputElement.value.focus();
  }
});

// Methoden
function resizeTextarea(): void {
  if (!inputElement.value) return;

  const textarea = inputElement.value;

  // Höhe zurücksetzen
  textarea.style.height = `${props.initialHeight}px`;

  // Neue Höhe berechnen (scrollHeight = Höhe des Inhalts)
  const newHeight = Math.min(
    Math.max(textarea.scrollHeight, props.minHeight),
    props.maxHeight,
  );

  textarea.style.height = `${newHeight}px`;

  // Modellwert aktualisieren
  emit("update:modelValue", inputValue.value);
}

function togglePreview(): void {
  markdownPreview.value = !markdownPreview.value;

  if (markdownPreview.value) {
    nextTick(() => {
      // Code-Highlighting für die Vorschau
      const previewElement = document.querySelector(
        ".n-enhanced-message-input__preview-content",
      );
      if (previewElement) {
        // Use async highlighting
        highlightCode(previewElement as HTMLElement).catch(console.error);
      }
    });
  }
}

function toggleEmojiPicker(): void {
  isEmojiPickerOpen.value = !isEmojiPickerOpen.value;
}

function insertEmoji(emoji: string): void {
  if (!inputElement.value) return;

  const { selectionStart, selectionEnd } = inputElement.value;

  const beforeCursor = inputValue.value.substring(0, selectionStart);
  const afterCursor = inputValue.value.substring(selectionEnd);

  inputValue.value = `${beforeCursor}${emoji}${afterCursor}`;

  nextTick(() => {
    if (inputElement.value) {
      const newCursorPos = selectionStart + emoji.length;
      inputElement.value.selectionStart = newCursorPos;
      inputElement.value.selectionEnd = newCursorPos;
      inputElement.value.focus();
      resizeTextarea();
    }
  });

  isEmojiPickerOpen.value = false;
}

function formatText(format: string): void {
  if (!inputElement.value) return;

  // Aktuelle Selektion oder Cursor-Position erhalten
  const { selectionStart, selectionEnd } = inputElement.value;

  // Aktuell ausgewählten Text erhalten
  const selectedText = inputValue.value.substring(selectionStart, selectionEnd);

  // Text vor und nach der Selektion
  const beforeSelection = inputValue.value.substring(0, selectionStart);
  const afterSelection = inputValue.value.substring(selectionEnd);

  // Formatierung anwenden
  let formattedText;

  if (selectedText) {
    // Wenn Text ausgewählt ist, diesen formatieren
    formattedText = format.replace("$selection$", selectedText);
  } else {
    // Wenn kein Text ausgewählt ist, Platzhalter einfügen
    formattedText = format.replace("$selection$", "Text");
  }

  // Neuen Text zusammensetzen
  inputValue.value = beforeSelection + formattedText + afterSelection;

  // Textarea aktualisieren und Selektion anpassen
  nextTick(() => {
    if (inputElement.value) {
      inputElement.value.focus();

      if (selectedText) {
        // Selektion auf den formatierten Text setzen
        const newSelectionStart = beforeSelection.length;
        const newSelectionEnd = newSelectionStart + formattedText.length;

        inputElement.value.selectionStart = newSelectionStart;
        inputElement.value.selectionEnd = newSelectionEnd;
      } else {
        // Cursor in die Mitte des Platzhalters setzen
        const placeholderPos = format.indexOf("$selection$");
        if (placeholderPos !== -1) {
          const textPos =
            beforeSelection.length + placeholderPos + "Text".length / 2;
          inputElement.value.selectionStart = textPos;
          inputElement.value.selectionEnd = textPos;
        }
      }

      resizeTextarea();
    }
  });
}

function triggerFileUpload(): void {
  if (fileInput.value) {
    fileInput.value.click();
  }
}

function handleFileInputChange(event: Event): void {
  const input = event.target as HTMLInputElement;

  if (input.files && input.files.length > 0) {
    const files = Array.from(input.files);
    handleFileUpload(files);

    // Input zurücksetzen, damit dasselbe File erneut ausgewählt werden kann
    input.value = "";
  }
}

function handleFileUpload(files: File[]): void {
  // Überprüfen, ob alle Dateien erlaubt sind
  const allowedFiles = files.filter((file) =>
    isAllowedFileType(file.type || file.name),
  );

  if (allowedFiles.length > 0) {
    emit("file-upload", allowedFiles);
  }
}

function isAllowedFileType(fileType: string): boolean {
  if (props.allowedFileTypes.length === 0) return true;

  // Dateityp aus MIME-Type oder Dateiname ermitteln
  const extension = fileType.startsWith(".")
    ? fileType.toLowerCase()
    : "." + fileType.split("/").pop()?.toLowerCase();

  return props.allowedFileTypes.some((type) => {
    if (type.includes("/")) {
      // MIME-Type-Vergleich
      return fileType === type || fileType.startsWith(type.split("/")[0] + "/");
    } else {
      // Dateiendungs-Vergleich
      return type.toLowerCase() === extension;
    }
  });
}

// Hilfsfunktionen für die Markdown-Bearbeitung
function getCurrentLine(): string {
  if (!inputElement.value) return "";

  const { selectionStart } = inputElement.value;
  const text = inputValue.value;

  // Anfang der aktuellen Zeile finden
  let lineStart = selectionStart;
  while (lineStart > 0 && text[lineStart - 1] !== "\n") {
    lineStart--;
  }

  // Ende der aktuellen Zeile finden
  let lineEnd = selectionStart;
  while (lineEnd < text.length && text[lineEnd] !== "\n") {
    lineEnd++;
  }

  return text.substring(lineStart, lineEnd);
}

function removeCurrentListItem(): void {
  if (!inputElement.value) return;

  const { selectionStart } = inputElement.value;
  const text = inputValue.value;

  // Anfang der aktuellen Zeile finden
  let lineStart = selectionStart;
  while (lineStart > 0 && text[lineStart - 1] !== "\n") {
    lineStart--;
  }

  // Ende der aktuellen Zeile finden
  let lineEnd = selectionStart;
  while (lineEnd < text.length && text[lineEnd] !== "\n") {
    lineEnd++;
  }

  // Zeile entfernen
  inputValue.value = text.substring(0, lineStart) + text.substring(lineEnd);

  // Cursor an den Anfang der Zeile setzen
  nextTick(() => {
    if (inputElement.value) {
      inputElement.value.selectionStart = lineStart;
      inputElement.value.selectionEnd = lineStart;
    }
  });
}

function insertText(text: string): void {
  if (!inputElement.value) return;

  const { selectionStart, selectionEnd } = inputElement.value;

  const beforeCursor = inputValue.value.substring(0, selectionStart);
  const afterCursor = inputValue.value.substring(selectionEnd);

  inputValue.value = beforeCursor + text + afterCursor;

  nextTick(() => {
    if (inputElement.value) {
      const newCursorPos = selectionStart + text.length;
      inputElement.value.selectionStart = newCursorPos;
      inputElement.value.selectionEnd = newCursorPos;
      resizeTextarea();
    }
  });
}

// Watches
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue !== inputValue.value) {
      inputValue.value = newValue;
      nextTick(() => {
        resizeTextarea();
      });
    }
  },
);

// Stellt sicher, dass die Größe angepasst wird, wenn sich der Wert ändert
watch(
  () => inputValue.value,
  () => {
    nextTick(() => {
      resizeTextarea();
    });
  },
);
</script>

<style scoped>
/* Hauptcontainer */
.n-enhanced-message-input {
  position: relative;
  width: 100%;
  background-color: var(--nscale-input-bg, #ffffff);
  border: 1px solid var(--nscale-border-color, #e2e8f0);
  border-radius: var(--nscale-border-radius-md, 0.5rem);
  box-shadow: var(--nscale-shadow-sm, 0 1px 2px 0 rgba(0, 0, 0, 0.05));
  transition: all 0.2s ease;
}

.n-enhanced-message-input__container {
  display: flex;
  flex-direction: column;
}

/* Container für Textarea und Format-Buttons */
.n-enhanced-message-input__textarea-container {
  position: relative;
  width: 100%;
}

/* Fokus-Zustand */
.n-enhanced-message-input--focused {
  border-color: var(--nscale-primary, #00a550);
  box-shadow: 0 0 0 3px var(--nscale-primary-light, #e0f5ea);
}

/* Deaktivierter Zustand */
.n-enhanced-message-input--disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: var(--nscale-disabled-bg, #f1f5f9);
}

/* Lade-Zustand */
.n-enhanced-message-input--loading {
  border-color: var(--nscale-primary-light, #e0f5ea);
}

/* Textarea für Benutzereingabe */
.n-enhanced-message-input__textarea {
  width: 100%;
  border: none;
  background: transparent;
  font-family: var(--nscale-font-family-base, "Segoe UI", sans-serif);
  font-size: var(--nscale-font-size-base, 1rem);
  color: var(--nscale-text, #1a202c);
  padding: var(--nscale-space-3, 0.75rem) var(--nscale-space-4, 1rem);
  resize: none;
  outline: none;
  max-height: var(--nscale-chat-input-max-height, 200px);
  overflow-y: auto;
  line-height: var(--nscale-line-height-normal, 1.5);
}

.n-enhanced-message-input__textarea::placeholder {
  color: var(--nscale-placeholder, #a0aec0);
}

/* Formatierungsbuttons */
.n-enhanced-message-input__format-buttons {
  display: flex;
  gap: var(--nscale-space-1, 0.25rem);
  padding: 0 var(--nscale-space-3, 0.75rem) var(--nscale-space-2, 0.5rem);
  flex-wrap: wrap;
}

.n-enhanced-message-input__format-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--nscale-border-color, #e2e8f0);
  border-radius: var(--nscale-border-radius-sm, 0.25rem);
  background-color: var(--nscale-surface-color, #f8fafc);
  color: var(--nscale-text-secondary, #64748b);
  font-size: var(--nscale-font-size-sm, 0.875rem);
  cursor: pointer;
  transition: all 0.2s ease;
}

.n-enhanced-message-input__format-btn:hover {
  background-color: var(--nscale-hover-bg, rgba(0, 0, 0, 0.05));
  color: var(--nscale-text, #1a202c);
}

/* Markdown-Vorschau */
.n-enhanced-message-input__preview {
  border-top: 1px solid var(--nscale-border-color, #e2e8f0);
  padding: var(--nscale-space-3, 0.75rem);
  background-color: var(--nscale-surface-color, #f8fafc);
  max-height: 200px;
  overflow-y: auto;
}

.n-enhanced-message-input__preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--nscale-space-2, 0.5rem);
  font-size: var(--nscale-font-size-sm, 0.875rem);
  color: var(--nscale-text-secondary, #64748b);
  font-weight: var(--nscale-font-weight-medium, 500);
}

.n-enhanced-message-input__preview-close {
  background: none;
  border: none;
  font-size: var(--nscale-font-size-lg, 1.125rem);
  cursor: pointer;
  color: var(--nscale-text-tertiary, #94a3b8);
  padding: 0;
  line-height: 1;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.n-enhanced-message-input__preview-content {
  font-size: var(--nscale-font-size-sm, 0.875rem);
  line-height: var(--nscale-line-height-normal, 1.5);
  color: var(--nscale-text, #1a202c);
}

/* Preview-Content-Styling */
.n-enhanced-message-input__preview-content :deep(p) {
  margin-bottom: var(--nscale-space-2, 0.5rem);
}

.n-enhanced-message-input__preview-content :deep(pre) {
  background-color: var(--nscale-code-bg, #2d3748);
  color: var(--nscale-code-text, #e2e8f0);
  padding: var(--nscale-space-2, 0.5rem);
  border-radius: var(--nscale-border-radius-sm, 0.25rem);
  overflow-x: auto;
  font-family: var(--nscale-font-family-mono, monospace);
  font-size: 0.85em;
}

.n-enhanced-message-input__preview-content :deep(code) {
  font-family: var(--nscale-font-family-mono, monospace);
  font-size: 0.9em;
  background-color: rgba(0, 0, 0, 0.05);
  padding: 0.2em 0.4em;
  border-radius: 3px;
}

.n-enhanced-message-input__preview-content :deep(ul),
.n-enhanced-message-input__preview-content :deep(ol) {
  padding-left: var(--nscale-space-6, 1.5rem);
  margin: var(--nscale-space-2, 0.5rem) 0;
}

/* Aktionsbereich */
.n-enhanced-message-input__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--nscale-space-2, 0.5rem) var(--nscale-space-3, 0.75rem);
  border-top: 1px solid
    var(--nscale-border-color-light, rgba(226, 232, 240, 0.6));
}

/* Zeichenzähler */
.n-enhanced-message-input__char-count {
  font-size: var(--nscale-font-size-xs, 0.75rem);
  color: var(--nscale-text-tertiary, #94a3b8);
}

/* Aktionsbuttons */
.n-enhanced-message-input__action-buttons {
  display: flex;
  gap: var(--nscale-space-2, 0.5rem);
}

.n-enhanced-message-input__action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--nscale-border-color, #e2e8f0);
  border-radius: 50%;
  background-color: var(--nscale-surface-color, #f8fafc);
  color: var(--nscale-text-secondary, #64748b);
  cursor: pointer;
  transition: all 0.2s ease;
}

.n-enhanced-message-input__action-btn:hover {
  background-color: var(--nscale-hover-bg, rgba(0, 0, 0, 0.05));
  color: var(--nscale-text, #1a202c);
}

.n-enhanced-message-input__action-btn--active {
  background-color: var(--nscale-primary-ultra-light, #f0faf5);
  color: var(--nscale-primary, #00a550);
  border-color: var(--nscale-primary-light, #e0f5ea);
}

/* Datei-Upload verstecken */
.n-enhanced-message-input__file-input {
  display: none;
}

/* Senden-Button */
.n-enhanced-message-input__send-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: none;
  background-color: var(--nscale-primary, #00a550);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
}

.n-enhanced-message-input__send-btn:hover:not(:disabled) {
  background-color: var(--nscale-primary-dark, #009046);
  transform: scale(1.05);
}

.n-enhanced-message-input__send-btn:disabled {
  background-color: var(--nscale-disabled, #cbd5e1);
  cursor: not-allowed;
}

/* Senden-Icon */
.n-enhanced-message-input__send-icon {
  width: 16px;
  height: 16px;
  position: relative;
  display: inline-block;
  background-color: transparent;
}

.n-enhanced-message-input__send-icon::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-45deg);
  width: 10px;
  height: 10px;
  border-bottom: 2px solid white;
  border-right: 2px solid white;
}

/* Animations-Punkte für Lade-Indikator */
.n-enhanced-message-input__loading-indicator {
  display: flex;
  align-items: center;
  gap: 2px;
}

.n-enhanced-message-input__loading-indicator span {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background-color: white;
  display: inline-block;
  animation: dot-pulse 1.4s infinite ease-in-out both;
}

.n-enhanced-message-input__loading-indicator span:nth-child(1) {
  animation-delay: 0s;
}

.n-enhanced-message-input__loading-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.n-enhanced-message-input__loading-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

/* Emoji-Picker */
.n-enhanced-message-input__emoji-picker {
  position: absolute;
  bottom: 70px;
  right: 10px;
  width: 250px;
  max-height: 200px;
  background-color: white;
  border: 1px solid var(--nscale-border-color, #e2e8f0);
  border-radius: var(--nscale-border-radius-md, 0.5rem);
  box-shadow: var(
    --nscale-shadow-md,
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06)
  );
  z-index: 10;
  overflow-y: auto;
}

.n-enhanced-message-input__emoji-picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--nscale-space-2, 0.5rem);
  border-bottom: 1px solid var(--nscale-border-color, #e2e8f0);
  font-size: var(--nscale-font-size-sm, 0.875rem);
  color: var(--nscale-text-secondary, #64748b);
  font-weight: var(--nscale-font-weight-medium, 500);
}

.n-enhanced-message-input__emoji-picker-close {
  background: none;
  border: none;
  font-size: var(--nscale-font-size-lg, 1.125rem);
  cursor: pointer;
  color: var(--nscale-text-tertiary, #94a3b8);
  padding: 0;
  line-height: 1;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.n-enhanced-message-input__emoji-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: var(--nscale-space-1, 0.25rem);
  padding: var(--nscale-space-2, 0.5rem);
}

.n-enhanced-message-input__emoji-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  border-radius: var(--nscale-border-radius-sm, 0.25rem);
  transition: all 0.2s ease;
}

.n-enhanced-message-input__emoji-btn:hover {
  background-color: var(--nscale-hover-bg, rgba(0, 0, 0, 0.05));
}

/* Drag & Drop Zone */
.n-enhanced-message-input__drop-zone {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: var(--nscale-primary-ultra-light, rgba(0, 165, 80, 0.05));
  border: 2px dashed var(--nscale-primary, #00a550);
  border-radius: var(--nscale-border-radius-md, 0.5rem);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
}

.n-enhanced-message-input__drop-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--nscale-primary, #00a550);
  font-size: var(--nscale-font-size-md, 1rem);
  font-weight: var(--nscale-font-weight-medium, 500);
}

.n-enhanced-message-input__drop-icon {
  font-size: 32px;
  margin-bottom: var(--nscale-space-2, 0.5rem);
}

/* Fehlermeldung und Hinweis */
.n-enhanced-message-input__error {
  font-size: var(--nscale-font-size-sm, 0.875rem);
  color: var(--nscale-error, #dc2626);
  margin-top: var(--nscale-space-1, 0.25rem);
  padding: 0 var(--nscale-space-4, 1rem) var(--nscale-space-2, 0.5rem);
}

.n-enhanced-message-input__hint {
  font-size: var(--nscale-font-size-sm, 0.875rem);
  color: var(--nscale-text-secondary, #64748b);
  margin-top: var(--nscale-space-1, 0.25rem);
  padding: 0 var(--nscale-space-4, 1rem) var(--nscale-space-2, 0.5rem);
}

/* Keyboard-Shortcuts */
.n-enhanced-message-input__shortcuts {
  display: flex;
  gap: var(--nscale-space-4, 1rem);
  padding: var(--nscale-space-2, 0.5rem) var(--nscale-space-3, 0.75rem);
  font-size: var(--nscale-font-size-xs, 0.75rem);
  color: var(--nscale-text-tertiary, #94a3b8);
  justify-content: flex-end;
  flex-wrap: wrap;
}

.n-enhanced-message-input__shortcuts kbd {
  display: inline-block;
  padding: 0.1em 0.4em;
  font-family: var(--nscale-font-family-mono, monospace);
  font-size: 0.85em;
  color: var(--nscale-text, #1a202c);
  background-color: var(--nscale-surface-color, #f8fafc);
  border: 1px solid var(--nscale-border-color, #e2e8f0);
  border-radius: 3px;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.1);
}

/* Animationen */
@keyframes dot-pulse {
  0%,
  80%,
  100% {
    transform: scale(0.8);
    opacity: 0.6;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .n-enhanced-message-input {
    border-radius: var(--nscale-border-radius-sm, 0.25rem);
  }

  .n-enhanced-message-input__textarea {
    padding: var(--nscale-space-2, 0.5rem) var(--nscale-space-3, 0.75rem);
    font-size: var(--nscale-font-size-sm, 0.875rem);
  }

  .n-enhanced-message-input__actions {
    padding: var(--nscale-space-2, 0.5rem);
  }

  .n-enhanced-message-input__send-btn {
    width: 30px;
    height: 30px;
  }

  .n-enhanced-message-input__format-buttons {
    display: none;
  }

  .n-enhanced-message-input__shortcuts {
    display: none;
  }
}

/* Reduktion von Animationen für Benutzer, die das bevorzugen */
@media (prefers-reduced-motion: reduce) {
  .n-enhanced-message-input__loading-indicator span {
    animation: none;
  }

  .n-enhanced-message-input__send-btn:hover:not(:disabled) {
    transform: none;
  }
}
</style>
