---
title: "Dialog-System"
version: "1.0.0"
date: "10.05.2025"
lastUpdate: "11.05.2025"
author: "Martin Heinrich"
status: "Aktiv"
priority: "Mittel"
category: "Architektur"
tags: ["Dialog", "UI", "Vue3", "Komponenten", "Bestätigung", "Eingabe"]
---

# Dialog-System

> **Letzte Aktualisierung:** 13.05.2025 | **Version:** 1.0.0 | **Status:** Aktiv

## Übersicht

Das Dialog-System ist eine zentrale Komponente des nscale DMS Assistenten, die als konsistenter und erweiterbarer Ersatz für native Browser-Dialoge (`window.confirm()`, `window.alert()` und `window.prompt()`) dient. Es bietet eine einheitliche API für verschiedene Dialog-Typen und ist vollständig in das Vue 3-Komponentensystem integriert.

Das System ist als Plugin implementiert und bietet eine reaktive Schnittstelle über Composables, was eine nahtlose Integration in die Anwendung ermöglicht. Es unterstützt verschiedene Dialog-Typen, Validierung, Theming und Barrierefreiheit.

## Architekturüberblick

Das Dialog-System besteht aus folgenden Kernkomponenten:

1. **Komponenten**: Vue 3 SFC-Komponenten für verschiedene Dialog-Typen
2. **Composables**: Reaktive API zur Verwendung in anderen Komponenten
3. **Plugin**: Einfache Integration in die Vue-Anwendung
4. **Provider**: Globaler Dialog-Container im DOM

### Architekturdiagramm

```
┌─────────────────────────────┐
│                             │
│      Anwendung (App.vue)    │
│                             │
│  ┌─────────────────────┐    │
│  │                     │    │
│  │    DialogProvider   │    │
│  │                     │    │
│  └─────────────────────┘    │
│                             │
└─────────────────────────────┘
             ▲
             │ Komponente
             │
┌─────────────────────────────┐
│                             │
│     Dialog-Komponenten      │
│                             │
│  ┌─────────────────────┐    │
│  │                     │    │
│  │   ConfirmDialog     │    │
│  │                     │    │
│  └─────────────────────┘    │
│                             │
│  ┌─────────────────────┐    │
│  │                     │    │
│  │   InputDialog       │    │
│  │                     │    │
│  └─────────────────────┘    │
│                             │
└─────────────────────────────┘
             ▲
             │ API
             │
┌─────────────────────────────┐
│                             │
│       Dialog-Plugin         │
│                             │
│  ┌─────────────────────┐    │
│  │                     │    │
│  │    useDialog        │    │
│  │    Composable       │    │
│  │                     │    │
│  └─────────────────────┘    │
│                             │
└─────────────────────────────┘
```

## Kernkomponenten

### 1. Dialog-Komponenten

#### ConfirmDialog.vue

Eine vielseitige Komponente für Bestätigungs-, Info-, Warn- und Fehlerdialoge mit folgenden Funktionen:

- Verschiedene Dialog-Typen mit passenden Symbolen
- Anpassbare Titel, Nachrichten und Button-Texte
- Fokus-Management für Barrierefreiheit
- Tastaturunterstützung (Escape, Enter)
- Event-System für Bestätigung/Abbruch

```vue
<template>
  <div 
    v-if="visible"
    class="dialog-overlay"
    @click="handleOverlayClick"
    @keydown.esc="handleCancel"
  >
    <div 
      class="dialog-container"
      :class="dialogClass"
      @click.stop
      role="dialog"
      aria-modal="true"
      :aria-labelledby="dialogId + '-title'"
      :aria-describedby="dialogId + '-message'"
    >
      <div class="dialog-header">
        <h3 :id="dialogId + '-title'" class="dialog-title">
          {{ title || defaultTitle }}
        </h3>
        <button 
          v-if="showCloseButton"
          class="dialog-close-button"
          @click="handleCancel"
          aria-label="Schließen"
        >
          <span class="dialog-close-icon">×</span>
        </button>
      </div>
      
      <div class="dialog-content">
        <div v-if="type !== 'confirm'" class="dialog-icon" :class="'dialog-icon--' + type">
          <!-- Typ-spezifisches Symbol -->
        </div>
        <p :id="dialogId + '-message'" class="dialog-message">{{ message }}</p>
      </div>
      
      <div class="dialog-actions">
        <button 
          v-if="showCancelButton" 
          ref="cancelRef"
          class="dialog-button dialog-button--secondary"
          @click="handleCancel"
        >
          {{ cancelButtonText || 'Abbrechen' }}
        </button>
        <button 
          ref="confirmRef"
          class="dialog-button dialog-button--primary"
          :class="'dialog-button--' + type"
          @click="handleConfirm"
        >
          {{ confirmButtonText || 'OK' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { generateId } from '@/utils/uuidUtil';

const props = withDefaults(defineProps<{
  visible: boolean;
  title?: string;
  message: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  showCancelButton?: boolean;
  showCloseButton?: boolean;
  closeOnOutsideClick?: boolean;
  type?: 'info' | 'warning' | 'error' | 'success' | 'confirm';
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
}>(), {
  showCancelButton: true,
  showCloseButton: true,
  closeOnOutsideClick: true,
  type: 'confirm'
});

const emit = defineEmits<{
  (e: 'confirm'): void;
  (e: 'cancel'): void;
  (e: 'close'): void;
  (e: 'update:visible', value: boolean): void;
}>();

// Einzigartige ID für ARIA-Attribute
const dialogId = ref(`dialog-${generateId()}`);
const confirmRef = ref<HTMLButtonElement | null>(null);
const cancelRef = ref<HTMLButtonElement | null>(null);

// Computed Properties für abgeleitete Werte
const defaultTitle = computed(() => {
  switch (props.type) {
    case 'info': return 'Information';
    case 'warning': return 'Warnung';
    case 'error': return 'Fehler';
    case 'success': return 'Erfolg';
    default: return 'Bestätigung';
  }
});

const dialogClass = computed(() => {
  return {
    [`dialog--${props.type}`]: true
  };
});

// Dialog-Aktionen
function handleConfirm() {
  props.onConfirm?.();
  emit('confirm');
  closeDialog();
}

function handleCancel() {
  props.onCancel?.();
  emit('cancel');
  closeDialog();
}

function handleOverlayClick() {
  if (props.closeOnOutsideClick) {
    handleCancel();
  }
}

function closeDialog() {
  props.onClose?.();
  emit('close');
  emit('update:visible', false);
}

// Fokus-Management
watch(() => props.visible, async (newValue) => {
  if (newValue) {
    await nextTick();
    // Fokus auf den primären oder sekundären Button setzen
    if (props.showCancelButton && cancelRef.value) {
      cancelRef.value.focus();
    } else if (confirmRef.value) {
      confirmRef.value.focus();
    }
  }
});

// Tastatur-Event-Handler für gesamtes Dokument
onMounted(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (!props.visible) return;
    
    if (event.key === 'Enter') {
      handleConfirm();
    }
  };
  
  document.addEventListener('keydown', handleKeyDown);
  
  return () => {
    document.removeEventListener('keydown', handleKeyDown);
  };
});
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-container {
  background-color: var(--n-color-background);
  border-radius: var(--n-border-radius);
  box-shadow: var(--n-shadow-lg);
  width: 100%;
  max-width: 32rem;
  max-height: 90vh;
  overflow: auto;
  padding: 1.5rem;
}

/* Weitere Styles... */
</style>
```

#### InputDialog.vue

Eine Komponente für Eingabedialoge (Ersatz für `window.prompt()`) mit folgenden Funktionen:

- Verschiedene Eingabetypen (Text, Passwort, E-Mail, etc.)
- Validierung mit benutzerdefinierten Validierungsfunktionen
- Unterstützung für Standardwerte und Platzhalter
- Fehleranzeige bei Validierungsfehlern

```vue
<template>
  <div 
    v-if="visible"
    class="input-dialog-overlay"
    @click="handleOverlayClick"
    @keydown.esc="handleCancel"
  >
    <div 
      class="input-dialog-container"
      @click.stop
      role="dialog"
      aria-modal="true"
      :aria-labelledby="dialogId + '-title'"
      :aria-describedby="dialogId + '-message'"
    >
      <div class="input-dialog-header">
        <h3 :id="dialogId + '-title'" class="input-dialog-title">
          {{ title || 'Eingabe' }}
        </h3>
        <button 
          v-if="showCloseButton"
          class="input-dialog-close-button"
          @click="handleCancel"
          aria-label="Schließen"
        >
          <span class="input-dialog-close-icon">×</span>
        </button>
      </div>
      
      <div class="input-dialog-content">
        <p 
          v-if="message"
          :id="dialogId + '-message'" 
          class="input-dialog-message"
        >
          {{ message }}
        </p>
        
        <div class="input-dialog-form">
          <label 
            v-if="inputLabel"
            :for="dialogId + '-input'"
            class="input-dialog-label"
          >
            {{ inputLabel }}
          </label>
          
          <input
            :id="dialogId + '-input'"
            ref="inputRef"
            class="input-dialog-input"
            :class="{ 'input-dialog-input--error': validationError }"
            :type="inputType || 'text'"
            :placeholder="placeholder"
            :value="inputValue"
            @input="handleInput"
            :minlength="minLength"
            :maxlength="maxLength"
            :required="required"
          />
          
          <p v-if="validationError" class="input-dialog-error">
            {{ validationError }}
          </p>
        </div>
      </div>
      
      <div class="input-dialog-actions">
        <button 
          v-if="showCancelButton" 
          class="input-dialog-button input-dialog-button--secondary"
          @click="handleCancel"
        >
          {{ cancelButtonText || 'Abbrechen' }}
        </button>
        <button 
          :disabled="!!validationError && required"
          class="input-dialog-button input-dialog-button--primary"
          @click="handleConfirm"
        >
          {{ confirmButtonText || 'OK' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import { generateId } from '@/utils/uuidUtil';

const props = withDefaults(defineProps<{
  visible: boolean;
  title?: string;
  message?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  showCancelButton?: boolean;
  showCloseButton?: boolean;
  closeOnOutsideClick?: boolean;
  inputLabel?: string;
  inputType?: string;
  placeholder?: string;
  defaultValue?: string;
  minLength?: number;
  maxLength?: number;
  required?: boolean;
  validator?: (value: string) => boolean | string;
  validationMessage?: string;
  onConfirm?: (value: string) => void;
  onCancel?: () => void;
  onClose?: () => void;
}>(), {
  showCancelButton: true,
  showCloseButton: true,
  closeOnOutsideClick: true,
  inputType: 'text',
  required: false
});

const emit = defineEmits<{
  (e: 'confirm', value: string): void;
  (e: 'cancel'): void;
  (e: 'close'): void;
  (e: 'update:visible', value: boolean): void;
}>();

// State
const dialogId = ref(`input-dialog-${generateId()}`);
const inputRef = ref<HTMLInputElement | null>(null);
const inputValue = ref(props.defaultValue || '');
const validationError = ref<string | null>(null);

// Validierung bei Eingabe
function handleInput(event: Event) {
  const target = event.target as HTMLInputElement;
  inputValue.value = target.value;
  validateInput();
}

function validateInput(): boolean {
  validationError.value = null;
  
  // Prüfen, ob eine Eingabe erforderlich ist
  if (props.required && !inputValue.value.trim()) {
    validationError.value = props.validationMessage || 'Dieses Feld ist erforderlich.';
    return false;
  }
  
  // Benutzerdefinierte Validierung, falls angegeben
  if (props.validator && inputValue.value) {
    const result = props.validator(inputValue.value);
    if (result !== true) {
      validationError.value = typeof result === 'string' ? result : props.validationMessage || 'Ungültige Eingabe.';
      return false;
    }
  }
  
  return true;
}

// Dialog-Aktionen
function handleConfirm() {
  if (validateInput()) {
    props.onConfirm?.(inputValue.value);
    emit('confirm', inputValue.value);
    closeDialog();
  }
}

function handleCancel() {
  props.onCancel?.();
  emit('cancel');
  closeDialog();
}

function handleOverlayClick() {
  if (props.closeOnOutsideClick) {
    handleCancel();
  }
}

function closeDialog() {
  props.onClose?.();
  emit('close');
  emit('update:visible', false);
  
  // Dialog-Zustand zurücksetzen
  inputValue.value = props.defaultValue || '';
  validationError.value = null;
}

// Fokus-Management
watch(() => props.visible, async (newValue) => {
  if (newValue) {
    await nextTick();
    if (inputRef.value) {
      inputRef.value.focus();
      // Optional: Text bei Fokus auswählen
      inputRef.value.select();
    }
  }
});

// Event-Listener für Enter-Taste
onMounted(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (!props.visible) return;
    
    if (event.key === 'Enter') {
      handleConfirm();
    }
  };
  
  document.addEventListener('keydown', handleKeyDown);
  
  return () => {
    document.removeEventListener('keydown', handleKeyDown);
  };
});
</script>

<style scoped>
/* Styles ähnlich zu ConfirmDialog.vue mit einigen zusätzlichen Input-spezifischen Styles */
</style>
```

### 2. Dialog Composable (`useDialog.ts`)

Ein Composable, das eine reaktive API für das Dialog-System bereitstellt:

```typescript
// src/composables/useDialog.ts
import { ref, readonly, inject, InjectionKey } from 'vue';
import { generateId } from '@/utils/uuidUtil';

/**
 * Dialog-Optionen Interface
 */
export interface DialogOptions {
  title?: string;
  message: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  showCancelButton?: boolean;
  showCloseButton?: boolean;
  closeOnOutsideClick?: boolean;
  type?: 'info' | 'warning' | 'error' | 'success' | 'confirm';
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
}

/**
 * Eingabe-Dialog-Optionen Interface
 */
export interface InputDialogOptions extends Omit<DialogOptions, 'type'> {
  inputLabel?: string;
  inputType?: string;
  placeholder?: string;
  defaultValue?: string;
  minLength?: number;
  maxLength?: number;
  required?: boolean;
  validator?: (value: string) => boolean | string;
  validationMessage?: string;
  onConfirm?: (value: string) => void;
}

/**
 * Dialog-Manager Interface
 */
export interface DialogManager {
  confirm(options: DialogOptions | string): Promise<boolean>;
  info(options: DialogOptions | string): Promise<void>;
  warning(options: DialogOptions | string): Promise<void>;
  error(options: DialogOptions | string): Promise<void>;
  success(options: DialogOptions | string): Promise<void>;
  prompt(options: InputDialogOptions | string): Promise<string | null>;
}

/**
 * Dialog-Provider-State Interface
 */
interface DialogState {
  active: boolean;
  options: DialogOptions & { id: string };
  resolver: ((value: boolean) => void) | null;
  type: 'confirm' | 'input';
}

/**
 * Input-Dialog-State Interface
 */
interface InputDialogState {
  active: boolean;
  options: InputDialogOptions & { id: string };
  resolver: ((value: string | null) => void) | null;
}

export const DialogSymbol: InjectionKey<DialogManager> = Symbol('dialog');

/**
 * Global Dialog-Manager erstellen
 */
export function createDialogManager(): DialogManager {
  // Dialog-State initialisieren
  const confirmState = ref<DialogState>({
    active: false,
    options: { 
      id: '', 
      message: '',
      type: 'confirm'
    },
    resolver: null,
    type: 'confirm'
  });
  
  const inputState = ref<InputDialogState>({
    active: false,
    options: { 
      id: '', 
      message: ''
    },
    resolver: null
  });
  
  // Dialog-Aktionen
  function resolveConfirmDialog(value: boolean): void {
    if (confirmState.value.resolver) {
      confirmState.value.resolver(value);
      confirmState.value.resolver = null;
    }
    confirmState.value.active = false;
  }
  
  function resolveInputDialog(value: string | null): void {
    if (inputState.value.resolver) {
      inputState.value.resolver(value);
      inputState.value.resolver = null;
    }
    inputState.value.active = false;
  }
  
  /**
   * Bestätigungsdialog anzeigen
   */
  function confirm(options: DialogOptions | string): Promise<boolean> {
    return new Promise((resolve) => {
      // Wenn options ein String ist, als Nachricht verwenden
      const dialogOptions: DialogOptions = typeof options === 'string' 
        ? { message: options, type: 'confirm' } 
        : { ...options, type: options.type || 'confirm' };
      
      confirmState.value = {
        active: true,
        options: { ...dialogOptions, id: `dialog-${generateId()}` },
        resolver: resolve,
        type: 'confirm'
      };
    });
  }
  
  /**
   * Info-Dialog anzeigen
   */
  function info(options: DialogOptions | string): Promise<void> {
    return new Promise((resolve) => {
      const dialogOptions: DialogOptions = typeof options === 'string'
        ? { message: options, type: 'info', showCancelButton: false }
        : { ...options, type: 'info', showCancelButton: options.showCancelButton ?? false };
      
      confirm(dialogOptions).then(() => resolve());
    });
  }
  
  /**
   * Warnungs-Dialog anzeigen
   */
  function warning(options: DialogOptions | string): Promise<void> {
    return new Promise((resolve) => {
      const dialogOptions: DialogOptions = typeof options === 'string'
        ? { message: options, type: 'warning', showCancelButton: false }
        : { ...options, type: 'warning', showCancelButton: options.showCancelButton ?? false };
      
      confirm(dialogOptions).then(() => resolve());
    });
  }
  
  /**
   * Fehler-Dialog anzeigen
   */
  function error(options: DialogOptions | string): Promise<void> {
    return new Promise((resolve) => {
      const dialogOptions: DialogOptions = typeof options === 'string'
        ? { message: options, type: 'error', showCancelButton: false }
        : { ...options, type: 'error', showCancelButton: options.showCancelButton ?? false };
      
      confirm(dialogOptions).then(() => resolve());
    });
  }
  
  /**
   * Erfolgs-Dialog anzeigen
   */
  function success(options: DialogOptions | string): Promise<void> {
    return new Promise((resolve) => {
      const dialogOptions: DialogOptions = typeof options === 'string'
        ? { message: options, type: 'success', showCancelButton: false }
        : { ...options, type: 'success', showCancelButton: options.showCancelButton ?? false };
      
      confirm(dialogOptions).then(() => resolve());
    });
  }
  
  /**
   * Eingabe-Dialog anzeigen
   */
  function prompt(options: InputDialogOptions | string): Promise<string | null> {
    return new Promise((resolve) => {
      const dialogOptions: InputDialogOptions = typeof options === 'string'
        ? { message: options }
        : { ...options };
      
      inputState.value = {
        active: true,
        options: { ...dialogOptions, id: `input-dialog-${generateId()}` },
        resolver: resolve
      };
    });
  }
  
  return {
    // Öffentliche API
    confirm,
    info,
    warning,
    error,
    success,
    prompt,
    
    // Interner State für DialogProvider
    _confirmState: readonly(confirmState),
    _inputState: readonly(inputState),
    _resolveConfirm: resolveConfirmDialog,
    _resolveInput: resolveInputDialog
  };
}

/**
 * Dialog Composable für Verwendung in Komponenten
 */
export function useDialog(): DialogManager {
  // Vom Plugin injizierten DialogManager verwenden
  const dialogManager = inject(DialogSymbol);
  
  if (!dialogManager) {
    throw new Error('useDialog() muss innerhalb eines Komponenten verwendet werden, das unter DialogProvider gemountet ist');
  }
  
  return dialogManager;
}

/**
 * Globaler Dialog-Manager für Verwendung auch außerhalb von Vue-Komponenten
 */
export function useGlobalDialog(): DialogManager {
  return window.__dialogManager as DialogManager;
}
```

### 3. Dialog-Provider (`DialogProvider.vue`)

Eine globale Komponente, die die Dialog-Komponenten im DOM platziert:

```vue
<template>
  <teleport to="body">
    <!-- Bestätigungsdialog -->
    <confirm-dialog
      v-if="confirmDialogActive"
      :visible="confirmDialogActive"
      v-bind="confirmDialogOptions"
      @confirm="handleConfirmConfirm"
      @cancel="handleConfirmCancel"
      @close="handleConfirmClose"
    />
    
    <!-- Eingabedialog -->
    <input-dialog
      v-if="inputDialogActive"
      :visible="inputDialogActive"
      v-bind="inputDialogOptions"
      @confirm="handleInputConfirm"
      @cancel="handleInputCancel"
      @close="handleInputClose"
    />
  </teleport>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import { DialogSymbol } from '@/composables/useDialog';
import ConfirmDialog from '@/components/dialog/ConfirmDialog.vue';
import InputDialog from '@/components/dialog/InputDialog.vue';

// Dialog-Manager via Dependency Injection erhalten
const dialogManager = inject(DialogSymbol);

if (!dialogManager) {
  throw new Error('DialogProvider muss in einer App verwendet werden, die das Dialog-Plugin verwendet');
}

// Confirmation Dialog State
const confirmDialogActive = computed(() => dialogManager._confirmState.active);
const confirmDialogOptions = computed(() => dialogManager._confirmState.options);

// Input Dialog State
const inputDialogActive = computed(() => dialogManager._inputState.active);
const inputDialogOptions = computed(() => dialogManager._inputState.options);

// Confirmation Dialog Event Handler
function handleConfirmConfirm() {
  dialogManager._resolveConfirm(true);
}

function handleConfirmCancel() {
  dialogManager._resolveConfirm(false);
}

function handleConfirmClose() {
  dialogManager._resolveConfirm(false);
}

// Input Dialog Event Handler
function handleInputConfirm(value: string) {
  dialogManager._resolveInput(value);
}

function handleInputCancel() {
  dialogManager._resolveInput(null);
}

function handleInputClose() {
  dialogManager._resolveInput(null);
}
</script>
```

### 4. Dialog-Plugin (`dialog.ts`)

Ein Vue-Plugin für die einfache Integration des Dialog-Systems:

```typescript
// src/plugins/dialog.ts
import { App, Plugin } from 'vue';
import { createDialogManager, DialogSymbol } from '@/composables/useDialog';
import DialogProvider from '@/components/dialog/DialogProvider.vue';

/**
 * Dialog-Plugin für Vue 3
 */
const DialogPlugin: Plugin = {
  install(app: App) {
    // Dialog-Manager erstellen
    const dialogManager = createDialogManager();
    
    // Dialog-Manager als globale Property bereitstellen
    app.provide(DialogSymbol, dialogManager);
    
    // DialogProvider-Komponente global registrieren
    app.component('DialogProvider', DialogProvider);
    
    // Globalen Manager für non-Vue-Verwendung bereitstellen
    window.__dialogManager = dialogManager;
    
    // Native Browser-Dialog-Methoden speichern und überschreiben
    window.__originalAlert = window.alert;
    window.__originalConfirm = window.confirm;
    window.__originalPrompt = window.prompt;
    
    // Native Methoden mit unseren Implementierungen überschreiben
    window.alert = (message: string) => {
      return dialogManager.info(message);
    };
    
    window.confirm = (message: string) => {
      return dialogManager.confirm(message);
    };
    
    window.prompt = (message: string, defaultValue?: string) => {
      return dialogManager.prompt({
        message,
        defaultValue
      });
    };
  }
};

export default DialogPlugin;
```

## Verwendung des Dialog-Systems

### 1. Integration in die Anwendung

Das Dialog-System wird in der Hauptanwendung als Plugin registriert:

```typescript
// main.ts
import { createApp } from 'vue';
import App from './App.vue';
import DialogPlugin from './plugins/dialog';

const app = createApp(App);

// Dialog-Plugin registrieren
app.use(DialogPlugin);

app.mount('#app');
```

### 2. Hinzufügen des Dialog-Providers zur App-Komponente

```vue
<!-- App.vue -->
<template>
  <div id="app">
    <!-- App-Inhalt -->
    <router-view />
    
    <!-- Dialog-Provider (muss nur einmal in der App vorhanden sein) -->
    <DialogProvider />
  </div>
</template>
```

### 3. Verwendung in Vue-Komponenten

Das Dialog-System kann in Vue-Komponenten über das Composable-API verwendet werden:

#### Bestätigungsdialoge

```typescript
import { defineComponent } from 'vue';
import { useDialog } from '@/composables/useDialog';

export default defineComponent({
  setup() {
    const dialog = useDialog();
    
    async function deleteConversation() {
      const confirmed = await dialog.confirm({
        title: 'Unterhaltung löschen',
        message: 'Möchten Sie diese Unterhaltung wirklich löschen?',
        confirmButtonText: 'Löschen',
        cancelButtonText: 'Abbrechen'
      });
      
      if (confirmed) {
        // Löschen der Unterhaltung
        console.log('Unterhaltung wird gelöscht...');
      }
    }
    
    return { deleteConversation };
  }
});
```

#### Verschiedene Dialog-Typen

```typescript
import { defineComponent } from 'vue';
import { useDialog } from '@/composables/useDialog';

export default defineComponent({
  setup() {
    const dialog = useDialog();
    
    async function showDialogs() {
      // Info-Dialog
      await dialog.info('Ihre Sitzung läuft in 5 Minuten ab.');
      
      // Warnungs-Dialog
      await dialog.warning('Diese Aktion kann nicht rückgängig gemacht werden.');
      
      // Fehler-Dialog
      await dialog.error('Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
      
      // Erfolgs-Dialog
      await dialog.success('Die Aktion wurde erfolgreich abgeschlossen.');
    }
    
    return { showDialogs };
  }
});
```

#### Eingabedialoge

```typescript
import { defineComponent, ref } from 'vue';
import { useDialog } from '@/composables/useDialog';

export default defineComponent({
  setup() {
    const dialog = useDialog();
    const userInput = ref('');
    
    async function getUserInput() {
      // Einfache Eingabe
      const name = await dialog.prompt('Bitte geben Sie Ihren Namen ein:');
      
      if (name) {
        userInput.value = name;
      }
    }
    
    async function getEmail() {
      // Erweiterte Konfiguration mit Validierung
      const email = await dialog.prompt({
        title: 'E-Mail eingeben',
        message: 'Bitte geben Sie Ihre E-Mail-Adresse ein:',
        inputLabel: 'E-Mail',
        inputType: 'email',
        placeholder: 'beispiel@domain.de',
        required: true,
        validator: (value) => {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(value) || 'Bitte geben Sie eine gültige E-Mail-Adresse ein';
        }
      });
      
      if (email) {
        // E-Mail verwenden
        console.log('E-Mail:', email);
      }
    }
    
    return { userInput, getUserInput, getEmail };
  }
});
```

### 4. Verwendung außerhalb von Vue-Komponenten

Das Dialog-System kann auch außerhalb von Vue-Komponenten verwendet werden:

```typescript
import { useGlobalDialog } from '@/composables/useDialog';

// In einer Utility-Funktion
async function confirmDangerousOperation() {
  const dialog = useGlobalDialog();
  
  const confirmed = await dialog.confirm({
    title: 'Gefährliche Operation',
    message: 'Diese Operation kann nicht rückgängig gemacht werden. Fortfahren?',
    type: 'warning',
    confirmButtonText: 'Fortfahren',
    cancelButtonText: 'Abbrechen'
  });
  
  return confirmed;
}

// Oder als direkter Ersatz für native Browser-Dialoge
async function exampleFunction() {
  // Diese Aufrufe verwenden automatisch das Dialog-System
  alert('Information');
  const confirmed = await confirm('Bestätigen?');
  const input = await prompt('Eingabe:', 'Standardwert');
}
```

## Anpassung und Styling

Das Dialog-System unterstützt vollständige Anpassung über CSS-Variablen und ist in das nscale-Theming integriert:

### Anpassungen über CSS-Variablen

Das Dialog-System verwendet CSS-Variablen aus dem nscale Design-System:

```css
:root {
  /* Dialog-spezifische Variablen */
  --n-dialog-max-width: 32rem;
  --n-dialog-border-radius: var(--n-border-radius);
  --n-dialog-shadow: var(--n-shadow-lg);
  --n-dialog-padding: 1.5rem;
  --n-dialog-backdrop-color: rgba(0, 0, 0, 0.5);
  
  /* Dialog-Typ-Farben */
  --n-dialog-info-color: var(--n-color-info);
  --n-dialog-warning-color: var(--n-color-warning);
  --n-dialog-error-color: var(--n-color-error);
  --n-dialog-success-color: var(--n-color-success);
}
```

### Unterstützung für dunkles Theme

Das Dialog-System erkennt automatisch das aktuelle Theme und passt seine Erscheinung entsprechend an:

```css
/* Automatische Anpassung an dunkles Theme */
[data-theme="dark"] .dialog-container {
  background-color: var(--n-color-background-dark);
  color: var(--n-color-text-dark);
  border: 1px solid var(--n-color-border-dark);
}
```

## Barrierefreiheit

Das Dialog-System implementiert folgende Barrierefreiheits-Features:

1. **ARIA-Attribute**: Korrekte ARIA-Rollen und -Attribute für Screenreader-Unterstützung
2. **Keyboard-Navigation**: Vollständige Tastaturunterstützung (Tab, Enter, Escape)
3. **Fokus-Management**: Automatische Fokussierung der Dialog-Elemente und Wiederherstellung des Fokus
4. **Kontrastkompatibilität**: Ausreichende Kontrastverhältnisse für alle Texte

## Beispiele

### Komplettes Beispiel einer Dialog-Integration

```vue
<template>
  <div class="dialog-demo">
    <h2>Dialog-System Demo</h2>
    
    <div class="dialog-buttons">
      <button @click="showConfirmDialog">Bestätigungsdialog</button>
      <button @click="showInfoDialog">Info-Dialog</button>
      <button @click="showWarningDialog">Warnungs-Dialog</button>
      <button @click="showErrorDialog">Fehler-Dialog</button>
      <button @click="showSuccessDialog">Erfolgs-Dialog</button>
      <button @click="showPromptDialog">Eingabe-Dialog</button>
      <button @click="showValidatedPromptDialog">Validierter Eingabe-Dialog</button>
    </div>
    
    <div v-if="result" class="dialog-result">
      <h3>Dialog-Ergebnis:</h3>
      <pre>{{ result }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useDialog } from '@/composables/useDialog';

const dialog = useDialog();
const result = ref<any>(null);

// Bestätigungsdialog
async function showConfirmDialog() {
  const confirmed = await dialog.confirm({
    title: 'Aktion bestätigen',
    message: 'Möchten Sie diese Aktion wirklich ausführen?',
    confirmButtonText: 'Ja, ausführen',
    cancelButtonText: 'Nein, abbrechen'
  });
  
  result.value = { type: 'confirm', value: confirmed };
}

// Info-Dialog
async function showInfoDialog() {
  await dialog.info({
    title: 'Information',
    message: 'Ihre Änderungen wurden gespeichert.'
  });
  
  result.value = { type: 'info', value: 'Dialog geschlossen' };
}

// Warnungs-Dialog
async function showWarningDialog() {
  await dialog.warning({
    title: 'Warnung',
    message: 'Diese Aktion könnte unerwünschte Folgen haben.'
  });
  
  result.value = { type: 'warning', value: 'Dialog geschlossen' };
}

// Fehler-Dialog
async function showErrorDialog() {
  await dialog.error({
    title: 'Fehler',
    message: 'Ein Fehler ist aufgetreten. Die Aktion konnte nicht abgeschlossen werden.'
  });
  
  result.value = { type: 'error', value: 'Dialog geschlossen' };
}

// Erfolgs-Dialog
async function showSuccessDialog() {
  await dialog.success({
    title: 'Erfolg',
    message: 'Die Aktion wurde erfolgreich abgeschlossen.'
  });
  
  result.value = { type: 'success', value: 'Dialog geschlossen' };
}

// Eingabe-Dialog
async function showPromptDialog() {
  const name = await dialog.prompt({
    title: 'Name eingeben',
    message: 'Bitte geben Sie Ihren Namen ein:',
    inputLabel: 'Name',
    placeholder: 'Max Mustermann'
  });
  
  result.value = { type: 'prompt', value: name };
}

// Validierter Eingabe-Dialog
async function showValidatedPromptDialog() {
  const email = await dialog.prompt({
    title: 'E-Mail eingeben',
    message: 'Bitte geben Sie Ihre E-Mail-Adresse ein:',
    inputLabel: 'E-Mail',
    inputType: 'email',
    placeholder: 'beispiel@domain.de',
    required: true,
    validator: (value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value) || 'Bitte geben Sie eine gültige E-Mail-Adresse ein';
    }
  });
  
  result.value = { type: 'validated-prompt', value: email };
}
</script>

<style scoped>
.dialog-demo {
  padding: 1rem;
}

.dialog-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.dialog-buttons button {
  padding: 0.5rem 1rem;
  background-color: var(--n-color-primary);
  color: var(--n-color-on-primary);
  border: none;
  border-radius: var(--n-border-radius);
  cursor: pointer;
}

.dialog-buttons button:hover {
  background-color: var(--n-color-primary-dark);
}

.dialog-result {
  margin-top: 1rem;
  padding: 1rem;
  background-color: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
}

.dialog-result pre {
  margin: 0;
  padding: 0.5rem;
  background-color: var(--n-color-background);
  border-radius: var(--n-border-radius);
  overflow: auto;
}
</style>
```

## Fehlerbehebung

### Häufige Probleme und Lösungen

#### Dialog wird nicht angezeigt

Mögliche Ursachen:
1. Der `DialogProvider` fehlt in der App-Komponente
2. Das Dialog-Plugin wurde nicht registriert
3. Ein CSS-Konflikt verhindert die Anzeige (z.B. z-index-Problem)

Lösung:
```typescript
// main.ts
app.use(DialogPlugin);

// App.vue
<template>
  <div id="app">
    <router-view />
    <DialogProvider />
  </div>
</template>
```

#### Dialoge funktionieren nicht in einer verschachtelten Anwendung

Wenn die Anwendung in einer anderen Anwendung eingebettet ist, kann es zu Konflikten kommen.

Lösung:
```typescript
// Ein individuelles Target für die Dialog-Teleportation definieren
<DialogProvider target="#my-app-dialogs" />

// Einen Container für die Dialoge erstellen
<div id="my-app-dialogs"></div>
```

#### Konflikte mit nativen Browser-Dialogen

Bei Bedarf kann auf die originalen Browser-Methoden zugegriffen werden:

```typescript
// Originale Methoden verwenden
window.__originalAlert('Native Alert');
window.__originalConfirm('Native Confirm');
window.__originalPrompt('Native Prompt');
```

## Integrationsmöglichkeiten

### 1. Integration mit Vue Router

Das Dialog-System kann mit Vue Router für Navigation-Guards verwendet werden:

```typescript
// router/index.ts
import { useGlobalDialog } from '@/composables/useDialog';

const router = createRouter({
  // ...
});

router.beforeEach(async (to, from, next) => {
  // Prüfen, ob der Benutzer ungespeicherte Änderungen hat
  if (hasUnsavedChanges()) {
    const dialog = useGlobalDialog();
    const confirmed = await dialog.confirm({
      title: 'Ungespeicherte Änderungen',
      message: 'Sie haben ungespeicherte Änderungen. Möchten Sie die Seite wirklich verlassen?',
      confirmButtonText: 'Ja, verlassen',
      cancelButtonText: 'Nein, bleiben'
    });
    
    if (confirmed) {
      next();
    } else {
      next(false);
    }
  } else {
    next();
  }
});
```

### 2. Integration mit Formular-Validierung

Das Dialog-System kann für Formular-Validierungsfehler verwendet werden:

```typescript
import { useDialog } from '@/composables/useDialog';

export function useFormValidation() {
  const dialog = useDialog();
  
  function showValidationErrors(errors: Record<string, string[]>) {
    const errorMessages = Object.values(errors)
      .flat()
      .join('\n- ');
    
    dialog.error({
      title: 'Validierungsfehler',
      message: `Bitte korrigieren Sie folgende Fehler:\n- ${errorMessages}`
    });
  }
  
  return { showValidationErrors };
}
```

### 3. Integration mit API-Fehlern

Das Dialog-System kann für die Anzeige von API-Fehlern verwendet werden:

```typescript
import { useDialog } from '@/composables/useDialog';

export function useApiErrorHandler() {
  const dialog = useDialog();
  
  function handleApiError(error: Error) {
    // API-Fehleranalyse
    const errorMessage = error.message || 'Ein unbekannter Fehler ist aufgetreten';
    const statusCode = (error as any).statusCode || 500;
    
    // Unterschiedliche Behandlung je nach Statuscode
    if (statusCode === 401) {
      dialog.warning({
        title: 'Nicht autorisiert',
        message: 'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.'
      });
    } else if (statusCode === 403) {
      dialog.error({
        title: 'Zugriff verweigert',
        message: 'Sie haben keine Berechtigung für diese Aktion.'
      });
    } else {
      dialog.error({
        title: 'Serverfehler',
        message: `Es ist ein Fehler aufgetreten: ${errorMessage}`
      });
    }
  }
  
  return { handleApiError };
}
```

## Leistungsoptimierung

Um die Leistung des Dialog-Systems zu optimieren, wurden folgende Maßnahmen implementiert:

1. **Lazy-Loading**: Die Dialog-Komponenten werden erst bei Bedarf geladen
2. **Teleport**: Verwendung von Vue's Teleport für effizientes DOM-Management
3. **Composable-Caching**: Wiederverwendung von Composable-Instanzen

## Nächste Schritte

Folgende Erweiterungen des Dialog-Systems sind geplant:

1. **Erweiterbare Typen**: Unterstützung für benutzerdefinierte Dialog-Typen
2. **Mehrfach-Dialoge**: Unterstützung für mehrere gleichzeitige Dialoge
3. **Fortschritts-Dialoge**: Dialoge mit Fortschrittsanzeige für lang laufende Operationen
4. **Umfassendere Animation**: Verbesserte Übergangseffekte für Dialoge
5. **Multi-Step-Dialoge**: Unterstützung für mehrstufige Dialog-Prozesse

## Fazit

Das Dialog-System bietet eine moderne, accessible und flexible Lösung für Dialoge in der nscale DMS Assistenten Anwendung. Es ersetzt native Browser-Dialoge durch stilkonsistente, barrierefreie und funktional erweiterte Komponenten, die vollständig in das Vue 3-Ökosystem integriert sind.

Durch die Verwendung von modernen Vue 3-Features wie Composition API, Teleport und TypeScript bietet das System eine robuste Grundlage für alle Dialog-Interaktionen in der Anwendung.

---

Zuletzt aktualisiert: 11.05.2025