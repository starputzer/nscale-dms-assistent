import type { Meta, StoryObj } from "@storybook/vue3";
import { action } from "@storybook/addon-actions";
import EnhancedMessageInput from "../components/chat/enhanced/EnhancedMessageInput.vue";

// Meta-Daten für die Storybook-Komponente
const meta = {
  title: "Chat/EnhancedMessageInput",
  component: EnhancedMessageInput,
  tags: ["autodocs"],
  argTypes: {
    modelValue: { control: "text" },
    placeholder: { control: "text" },
    disabled: { control: "boolean" },
    isLoading: { control: "boolean" },
    maxLength: { control: "number" },
    minHeight: { control: "number" },
    maxHeight: { control: "number" },
    showCharacterCount: { control: "boolean" },
    error: { control: "text" },
    hint: { control: "text" },
    autofocus: { control: "boolean" },
    showMarkdownPreview: { control: "boolean" },
    showEmojiPicker: { control: "boolean" },
    showFormatButtons: { control: "boolean" },
    showKeyboardShortcuts: { control: "boolean" },
    allowFileUpload: { control: "boolean" },
    "update:modelValue": { action: "update:modelValue" },
    submit: { action: "submit" },
    "file-upload": { action: "file-upload" },
    focus: { action: "focus" },
    blur: { action: "blur" },
    keydown: { action: "keydown" },
  },
  args: {
    modelValue: "",
    placeholder: "Geben Sie Ihre Nachricht ein...",
    disabled: false,
    isLoading: false,
    maxLength: 4000,
    minHeight: 56,
    maxHeight: 200,
    showCharacterCount: true,
    error: "",
    hint: "",
    autofocus: false,
    showMarkdownPreview: true,
    showEmojiPicker: true,
    showFormatButtons: true,
    showKeyboardShortcuts: true,
    allowFileUpload: true,
  },
  parameters: {
    layout: "centered",
    backgrounds: {
      default: "light",
      values: [
        { name: "light", value: "#ffffff" },
        { name: "dark", value: "#1a202c" },
      ],
    },
    docs: {
      description: {
        component:
          "Eine erweiterte Nachrichteneingabe-Komponente mit Markdown-Unterstützung, Auto-Resize und Emoji-Picker.",
      },
    },
  },
  // Eventhandler für Live-Vorschau
  render: (args) => ({
    components: { EnhancedMessageInput },
    setup() {
      return {
        args,
        onUpdateModelValue: action("update:modelValue"),
        onSubmit: action("submit"),
        onFileUpload: action("file-upload"),
        onFocus: action("focus"),
        onBlur: action("blur"),
        onKeydown: action("keydown"),
      };
    },
    template: `
      <div style="width: 500px;">
        <EnhancedMessageInput
          v-bind="args"
          @update:modelValue="onUpdateModelValue"
          @submit="onSubmit"
          @file-upload="onFileUpload"
          @focus="onFocus"
          @blur="onBlur"
          @keydown="onKeydown"
        />
      </div>
    `,
  }),
} satisfies Meta<typeof EnhancedMessageInput>;

export default meta;
type Story = StoryObj<typeof meta>;

// Standardansicht mit leerer Eingabe
export const Default: Story = {
  args: {},
};

// Mit Beispieltext
export const WithText: Story = {
  args: {
    modelValue: "Dies ist ein Beispieltext für die Nachrichteneingabe.",
  },
};

// Mit Markdown-Beispiel
export const WithMarkdown: Story = {
  args: {
    modelValue: `# Überschrift

Dies ist ein *formatierter* Text mit **Markdown**-Elementen.

- Listenelement 1
- Listenelement 2

\`\`\`javascript
// Ein Codebeispiel
function helloWorld() {
  console.log('Hello World!');
}
\`\`\`
`,
  },
};

// Deaktivierter Zustand
export const Disabled: Story = {
  args: {
    disabled: true,
    modelValue: "Diese Eingabe ist deaktiviert.",
  },
};

// Ladezustand
export const Loading: Story = {
  args: {
    isLoading: true,
    modelValue: "Nachricht wird gesendet...",
    disabled: true,
  },
};

// Mit Fehlermeldung
export const WithError: Story = {
  args: {
    error: "Es ist ein Fehler bei der Übermittlung aufgetreten.",
    modelValue: "Fehlerhafte Nachricht",
  },
};

// Mit Hinweistext
export const WithHint: Story = {
  args: {
    hint: "Drücken Sie Enter zum Senden oder Shift+Enter für eine neue Zeile.",
    modelValue: "Nachricht mit Hinweis",
  },
};

// Minimal-Konfiguration
export const Minimal: Story = {
  args: {
    showCharacterCount: false,
    showMarkdownPreview: false,
    showEmojiPicker: false,
    showFormatButtons: false,
    showKeyboardShortcuts: false,
    allowFileUpload: false,
  },
};

// Barrierefreiheitstest
export const Accessibility: Story = {
  args: {
    ariaLabel: "Nachrichten-Eingabefeld",
    modelValue: "Text für Barrierefreiheitstest",
  },
  parameters: {
    a11y: { disable: false },
  },
};
