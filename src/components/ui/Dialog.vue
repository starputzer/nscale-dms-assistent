<template>
  <Teleport to="body">
    <TransitionGroup name="n-dialog-backdrop" tag="div">
      <div 
        v-for="dialog in dialogService.dialogs" 
        :key="dialog.id"
        class="n-dialog-backdrop"
        :class="{ 'n-dialog-backdrop--modal': dialog.options.modal }"
        :style="{ zIndex: dialog.options.zIndex }"
        v-show="dialog.visible"
        @click="handleBackdropClick(dialog)"
        @keydown.esc="handleEscKey(dialog)"
        tabindex="-1"
      >
        <Transition :name="`n-dialog-${dialog.options.animation}`">
          <div 
            v-show="dialog.visible"
            :id="`dialog-${dialog.id}`"
            class="n-dialog-container"
            :class="[
              `n-dialog--${dialog.options.position}`,
              { 'n-dialog--fullscreen': dialog.isFullscreen },
              dialog.options.customClass
            ]"
            @click.stop
          >
            <FocusTrap :active="dialog.visible">
              <div 
                class="n-dialog"
                :class="[
                  `n-dialog--${dialog.options.size}`,
                  `n-dialog--${dialog.options.type}`,
                  { 'n-dialog--scrollable': dialog.options.scrollable }
                ]"
                role="dialog"
                aria-modal="true"
                :aria-labelledby="`dialog-title-${dialog.id}`"
                :aria-describedby="`dialog-content-${dialog.id}`"
                tabindex="-1"
                ref="dialogRef"
              >
                <!-- Header -->
                <div class="n-dialog__header">
                  <div 
                    :id="`dialog-title-${dialog.id}`" 
                    class="n-dialog__title"
                  >
                    <component 
                      v-if="getTypeIcon(dialog.options.type)"
                      :is="getTypeIcon(dialog.options.type)"
                      class="n-dialog__type-icon"
                    />
                    {{ dialog.options.title }}
                  </div>
                  
                  <div class="n-dialog__header-actions">
                    <button 
                      v-if="dialog.options.fullscreenable"
                      class="n-dialog__action-button n-dialog__fullscreen-button"
                      type="button"
                      @click="toggleFullscreen(dialog.id)"
                      :aria-label="dialog.isFullscreen ? $t('dialog.exitFullscreen') : $t('dialog.enterFullscreen')"
                    >
                      <component 
                        :is="dialog.isFullscreen ? MinimizeIcon : MaximizeIcon"
                      />
                    </button>
                    
                    <button 
                      v-if="dialog.options.showClose"
                      class="n-dialog__action-button n-dialog__close-button"
                      type="button"
                      @click="closeDialog(dialog.id)"
                      :aria-label="$t('dialog.close')"
                    >
                      <CloseIcon />
                    </button>
                  </div>
                </div>
                
                <!-- Content -->
                <div 
                  :id="`dialog-content-${dialog.id}`"
                  class="n-dialog__content"
                  :class="{ 'n-dialog__content--scrollable': dialog.options.scrollable }"
                >
                  <!-- Named slot für komplexeren Inhalt -->
                  <slot 
                    :name="`content-${dialog.id}`" 
                    :dialog="dialog"
                    :close-dialog="() => closeDialog(dialog.id)"
                  >
                    <!-- Standard-Inhalt für einfache Dialoge -->
                    <div v-if="dialog.options.message" class="n-dialog__message">
                      {{ dialog.options.message }}
                    </div>
                    
                    <!-- Prompt-Input -->
                    <div v-if="dialog.options.type === 'prompt'" class="n-dialog__prompt">
                      <label :for="`dialog-input-${dialog.id}`" class="n-dialog__input-label">
                        {{ dialog.options.inputLabel || $t('dialog.input') }}
                      </label>
                      
                      <input 
                        :id="`dialog-input-${dialog.id}`"
                        :type="dialog.options.inputType || 'text'"
                        v-model="dialog.inputValue"
                        :placeholder="dialog.options.placeholder || ''"
                        :minlength="dialog.options.minLength"
                        :maxlength="dialog.options.maxLength"
                        :required="dialog.options.required"
                        class="n-dialog__input"
                        :class="{ 'n-dialog__input--error': !dialog.inputValid }"
                        @input="dialog.validateInput && dialog.validateInput()"
                        @keydown.enter="handlePromptEnter(dialog)"
                      />
                      
                      <div 
                        v-if="!dialog.inputValid" 
                        class="n-dialog__input-error"
                      >
                        {{ dialog.inputError }}
                      </div>
                    </div>
                  </slot>
                </div>
                
                <!-- Footer -->
                <div 
                  v-if="hasFooterButtons(dialog)"
                  class="n-dialog__footer"
                >
                  <slot 
                    :name="`footer-${dialog.id}`" 
                    :dialog="dialog"
                    :close-dialog="() => closeDialog(dialog.id)"
                  >
                    <template v-if="dialog.options.buttons && dialog.options.buttons.length">
                      <button 
                        v-for="(button, index) in dialog.options.buttons"
                        :key="index"
                        class="n-dialog__button"
                        :class="[
                          `n-dialog__button--${button.variant || 'primary'}`,
                          { 'n-dialog__button--loading': button.loading }
                        ]"
                        :type="button.type || 'button'"
                        :disabled="button.disabled"
                        @click="handleButtonClick(dialog, button, $event)"
                      >
                        <component 
                          v-if="button.icon && !button.loading" 
                          :is="getButtonIcon(button.icon)"
                          class="n-dialog__button-icon"
                        />
                        
                        <SpinnerIcon v-if="button.loading" class="n-dialog__button-spinner" />
                        
                        <span>{{ button.label }}</span>
                      </button>
                    </template>
                  </slot>
                </div>
              </div>
            </FocusTrap>
          </div>
        </Transition>
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { dialogService, type DialogButton, type DialogType, type DialogInstance } from '@/services/ui/DialogService';
import FocusTrap from '@/components/ui/base/FocusTrap.vue';

// Icons
import SuccessIcon from '@/components/icons/SuccessIcon.vue';
import ErrorIcon from '@/components/icons/ErrorIcon.vue';
import WarningIcon from '@/components/icons/WarningIcon.vue';
import InfoIcon from '@/components/icons/InfoIcon.vue';
import CloseIcon from '@/components/icons/CloseIcon.vue';
import MaximizeIcon from '@/components/icons/MaximizeIcon.vue';
import MinimizeIcon from '@/components/icons/MinimizeIcon.vue';
import SpinnerIcon from '@/components/icons/SpinnerIcon.vue';

// i18n
const { t } = useI18n();

// Ref für den Dialog (für Fokus)
const dialogRef = ref<HTMLElement | null>(null);

// Dialog schließen
function closeDialog(id: string, result?: any): void {
  dialogService.close(id, result);
}

// Fullscreen umschalten
function toggleFullscreen(id: string): void {
  dialogService.toggleFullscreen(id);
}

// Backdrop-Klick
function handleBackdropClick(dialog: DialogInstance): void {
  if (dialog.options.maskClosable) {
    closeDialog(dialog.id);
  }
}

// ESC-Taste
function handleEscKey(dialog: DialogInstance): void {
  if (dialog.options.escClosable) {
    closeDialog(dialog.id);
  }
}

// Button-Klick
async function handleButtonClick(dialog: DialogInstance, button: DialogButton, event: MouseEvent): Promise<void> {
  // Wenn onClick definiert ist, ausführen
  if (button.onClick) {
    // Wenn es sich um eine Promise handelt, warten
    try {
      const result = button.onClick(event);
      
      // Wenn die Funktion false zurückgibt, Dialog nicht schließen
      if (result === false) {
        return;
      }
      
      // Wenn es eine Promise ist, warten
      if (result instanceof Promise) {
        // Button in Ladestand versetzen
        button.loading = true;
        const asyncResult = await result;
        button.loading = false;
        
        // Wenn die Promise false zurückgibt, Dialog nicht schließen
        if (asyncResult === false) {
          return;
        }
      }
    } catch (error) {
      // Fehler im Button-Handler
      console.error('Error in dialog button handler:', error);
      return;
    }
  }
  
  // Dialog schließen, wenn closeDialog nicht explizit auf false gesetzt ist
  if (button.closeDialog !== false) {
    // Wenn verzögertes Schließen konfiguriert ist
    if (button.autoCloseDelay && button.autoCloseDelay > 0) {
      setTimeout(() => {
        closeDialog(dialog.id, typeof button.returnValue === 'function' 
          ? button.returnValue() 
          : button.returnValue);
      }, button.autoCloseDelay);
    } else {
      closeDialog(dialog.id, typeof button.returnValue === 'function' 
        ? button.returnValue() 
        : button.returnValue);
    }
  }
}

// Enter-Taste bei Prompt
function handlePromptEnter(dialog: DialogInstance): void {
  if (dialog.options.type !== 'prompt') return;
  
  // Finde den Bestätigungs-Button
  const confirmButton = dialog.options.buttons?.find(
    button => button.variant === 'primary'
  );
  
  if (confirmButton) {
    // Validiere die Eingabe
    if (dialog.validateInput && !dialog.validateInput()) {
      return;
    }
    
    // Klick simulieren
    handleButtonClick(dialog, confirmButton, new MouseEvent('click'));
  }
}

// Prüfen, ob ein Dialog Buttons im Footer hat
function hasFooterButtons(dialog: DialogInstance): boolean {
  return !!(dialog.options.buttons && dialog.options.buttons.length);
}

// Icon für Dialog-Typ
function getTypeIcon(type?: DialogType) {
  switch (type) {
    case 'success': return SuccessIcon;
    case 'error': return ErrorIcon;
    case 'warning': return WarningIcon;
    case 'info': return InfoIcon;
    default: return null;
  }
}

// Icon für Button
function getButtonIcon(icon: string | (() => any)) {
  if (typeof icon === 'function') {
    return icon();
  }
  return icon;
}

// Listen-Managment für ESC-Taste global
function handleGlobalEscKey(event: KeyboardEvent): void {
  if (event.key === 'Escape' && dialogService.activeDialog) {
    const dialog = dialogService.activeDialog;
    if (dialog.options.escClosable) {
      closeDialog(dialog.id);
      event.preventDefault();
      event.stopPropagation();
    }
  }
}

// Body-Overflow bei Modalen Dialogen
function updateBodyOverflow(): void {
  if (typeof document === 'undefined') return;
  
  // Prüfen, ob mindestens ein modaler Dialog sichtbar ist
  const hasModalDialogs = dialogService.dialogs.some(
    dialog => dialog.visible && dialog.options.modal
  );
  
  // Body-Overflow entsprechend setzen
  document.body.style.overflow = hasModalDialogs ? 'hidden' : '';
}

// Dialog fokussieren, wenn er geöffnet wird
function focusDialog(id: string): void {
  nextTick(() => {
    const dialog = document.getElementById(`dialog-${id}`);
    if (dialog) {
      const focusable = dialog.querySelector('[tabindex]') as HTMLElement;
      if (focusable) {
        focusable.focus();
      }
    }
  });
}

// Lifecycle-Hooks
onMounted(() => {
  // Globaler ESC-Handler
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleGlobalEscKey);
  }
  
  // Body-Overflow initial setzen
  updateBodyOverflow();
});

onUnmounted(() => {
  // Cleanup
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleGlobalEscKey);
  }
  
  // Body-Overflow zurücksetzen
  if (typeof document !== 'undefined') {
    document.body.style.overflow = '';
  }
});
</script>

<style scoped>
.n-dialog-backdrop {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
  background-color: rgba(0, 0, 0, 0);
  transition: background-color 0.3s ease;
  padding: 1rem;
}

.n-dialog-backdrop--modal {
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(3px);
}

.n-dialog-container {
  display: flex;
  max-height: 100%;
  width: 100%;
  max-width: 100%;
  position: relative;
}

.n-dialog {
  background-color: var(--n-background-color, #ffffff);
  border-radius: var(--n-border-radius, 4px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  width: 100%;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  max-height: 100%;
  overflow: hidden;
  margin: auto;
}

/* Dialog-Positionen */
.n-dialog--center {
  align-items: center;
  justify-content: center;
}

.n-dialog--top {
  align-items: flex-start;
  justify-content: center;
  margin-top: 3vh;
}

.n-dialog--right {
  align-items: center;
  justify-content: flex-end;
}

.n-dialog--bottom {
  align-items: flex-end;
  justify-content: center;
  margin-bottom: 3vh;
}

.n-dialog--left {
  align-items: center;
  justify-content: flex-start;
}

/* Dialog-Größen */
.n-dialog--small {
  max-width: 400px;
}

.n-dialog--medium {
  max-width: 560px;
}

.n-dialog--large {
  max-width: 720px;
}

.n-dialog--full {
  max-width: 95vw;
  height: 95vh;
}

/* Fullscreen-Modus */
.n-dialog--fullscreen {
  width: 100vw;
  height: 100vh;
  max-width: 100vw;
  max-height: 100vh;
  margin: 0;
  border-radius: 0;
}

.n-dialog--fullscreen .n-dialog {
  border-radius: 0;
  height: 100%;
}

/* Dialog-Header */
.n-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--n-border-color, #e2e8f0);
}

.n-dialog__title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  color: var(--n-heading-color, #1a202c);
}

.n-dialog__type-icon {
  width: 20px;
  height: 20px;
  margin-right: 8px;
  flex-shrink: 0;
}

/* Dialog-Typ-Farben */
.n-dialog--success .n-dialog__type-icon {
  color: var(--n-success-color, #10b981);
}

.n-dialog--error .n-dialog__type-icon {
  color: var(--n-error-color, #ef4444);
}

.n-dialog--warning .n-dialog__type-icon {
  color: var(--n-warning-color, #f59e0b);
}

.n-dialog--info .n-dialog__type-icon {
  color: var(--n-info-color, #3b82f6);
}

.n-dialog__header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.n-dialog__action-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background-color: transparent;
  border: none;
  border-radius: var(--n-border-radius-sm, 2px);
  color: var(--n-text-secondary-color, #718096);
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.n-dialog__action-button:hover {
  background-color: var(--n-hover-color, rgba(0, 0, 0, 0.05));
  color: var(--n-text-color, #1a202c);
}

.n-dialog__action-button:focus-visible {
  outline: 2px solid var(--n-focus-color, #3182ce);
  outline-offset: 1px;
}

.n-dialog__action-button svg {
  width: 18px;
  height: 18px;
}

/* Dialog-Content */
.n-dialog__content {
  padding: 20px;
  color: var(--n-text-color, #1a202c);
  overflow: hidden;
  flex: 1 1 auto;
}

.n-dialog__content--scrollable {
  overflow-y: auto;
}

.n-dialog__message {
  margin: 0;
  line-height: 1.5;
  white-space: pre-line;
}

/* Prompt-Stil */
.n-dialog__prompt {
  margin-top: 8px;
}

.n-dialog__input-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  font-size: 0.875rem;
  color: var(--n-label-color, #4a5568);
}

.n-dialog__input {
  width: 100%;
  padding: 8px 12px;
  font-size: 1rem;
  border: 1px solid var(--n-border-color, #e2e8f0);
  border-radius: var(--n-border-radius-sm, 3px);
  background-color: var(--n-input-background, #ffffff);
  color: var(--n-text-color, #1a202c);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.n-dialog__input:focus {
  outline: none;
  border-color: var(--n-focus-color, #3182ce);
  box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.2);
}

.n-dialog__input--error {
  border-color: var(--n-error-color, #ef4444);
}

.n-dialog__input--error:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
}

.n-dialog__input-error {
  color: var(--n-error-color, #ef4444);
  font-size: 0.875rem;
  margin-top: 4px;
}

/* Dialog-Footer */
.n-dialog__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 16px 20px;
  border-top: 1px solid var(--n-border-color, #e2e8f0);
  gap: 8px;
  background-color: var(--n-footer-background, #f8fafc);
  flex-shrink: 0;
}

/* Dialog-Buttons */
.n-dialog__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: var(--n-border-radius-sm, 3px);
  border: 1px solid transparent;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
  position: relative;
  gap: 6px;
}

.n-dialog__button:focus-visible {
  outline: 2px solid var(--n-focus-color, #3182ce);
  outline-offset: 1px;
}

.n-dialog__button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.n-dialog__button--primary {
  background-color: var(--n-primary-color, #3182ce);
  color: white;
}

.n-dialog__button--primary:hover:not(:disabled) {
  background-color: var(--n-primary-color-dark, #2c5282);
}

.n-dialog__button--secondary {
  background-color: var(--n-secondary-background, #f1f5f9);
  color: var(--n-secondary-color, #475569);
  border-color: var(--n-border-color, #e2e8f0);
}

.n-dialog__button--secondary:hover:not(:disabled) {
  background-color: var(--n-secondary-background-dark, #e2e8f0);
}

.n-dialog__button--tertiary {
  background-color: transparent;
  color: var(--n-primary-color, #3182ce);
}

.n-dialog__button--tertiary:hover:not(:disabled) {
  background-color: var(--n-tertiary-background, rgba(49, 130, 206, 0.1));
}

.n-dialog__button--danger {
  background-color: var(--n-error-color, #ef4444);
  color: white;
}

.n-dialog__button--danger:hover:not(:disabled) {
  background-color: var(--n-error-color-dark, #b91c1c);
}

.n-dialog__button--success {
  background-color: var(--n-success-color, #10b981);
  color: white;
}

.n-dialog__button--success:hover:not(:disabled) {
  background-color: var(--n-success-color-dark, #047857);
}

.n-dialog__button--warning {
  background-color: var(--n-warning-color, #f59e0b);
  color: white;
}

.n-dialog__button--warning:hover:not(:disabled) {
  background-color: var(--n-warning-color-dark, #b45309);
}

.n-dialog__button--loading {
  color: transparent;
  pointer-events: none;
}

.n-dialog__button-spinner {
  position: absolute;
  width: 18px;
  height: 18px;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  color: currentColor;
}

.n-dialog__button--primary .n-dialog__button-spinner,
.n-dialog__button--danger .n-dialog__button-spinner,
.n-dialog__button--success .n-dialog__button-spinner,
.n-dialog__button--warning .n-dialog__button-spinner {
  color: white;
}

.n-dialog__button-icon {
  width: 16px;
  height: 16px;
}

/* Animationen */
.n-dialog-backdrop-enter-active,
.n-dialog-backdrop-leave-active {
  transition: background-color 0.3s ease;
}

.n-dialog-backdrop-enter-from,
.n-dialog-backdrop-leave-to {
  background-color: rgba(0, 0, 0, 0);
}

/* Dialog-Animationen */
.n-dialog-fade-enter-active,
.n-dialog-fade-leave-active {
  transition: opacity 0.3s ease;
}

.n-dialog-fade-enter-from,
.n-dialog-fade-leave-to {
  opacity: 0;
}

.n-dialog-zoom-enter-active,
.n-dialog-zoom-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.n-dialog-zoom-enter-from,
.n-dialog-zoom-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

.n-dialog-slide-up-enter-active,
.n-dialog-slide-up-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.n-dialog-slide-up-enter-from,
.n-dialog-slide-up-leave-to {
  opacity: 0;
  transform: translateY(30px);
}

.n-dialog-slide-down-enter-active,
.n-dialog-slide-down-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.n-dialog-slide-down-enter-from,
.n-dialog-slide-down-leave-to {
  opacity: 0;
  transform: translateY(-30px);
}

.n-dialog-slide-left-enter-active,
.n-dialog-slide-left-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.n-dialog-slide-left-enter-from,
.n-dialog-slide-left-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.n-dialog-slide-right-enter-active,
.n-dialog-slide-right-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.n-dialog-slide-right-enter-from,
.n-dialog-slide-right-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  .n-dialog-backdrop-enter-active,
  .n-dialog-backdrop-leave-active,
  .n-dialog-fade-enter-active,
  .n-dialog-fade-leave-active,
  .n-dialog-zoom-enter-active,
  .n-dialog-zoom-leave-active,
  .n-dialog-slide-up-enter-active,
  .n-dialog-slide-up-leave-active,
  .n-dialog-slide-down-enter-active,
  .n-dialog-slide-down-leave-active,
  .n-dialog-slide-left-enter-active,
  .n-dialog-slide-left-leave-active,
  .n-dialog-slide-right-enter-active,
  .n-dialog-slide-right-leave-active {
    transition-duration: 0.01ms !important;
  }
  
  .n-dialog-zoom-enter-from,
  .n-dialog-zoom-leave-to,
  .n-dialog-slide-up-enter-from,
  .n-dialog-slide-up-leave-to,
  .n-dialog-slide-down-enter-from,
  .n-dialog-slide-down-leave-to,
  .n-dialog-slide-left-enter-from,
  .n-dialog-slide-left-leave-to,
  .n-dialog-slide-right-enter-from,
  .n-dialog-slide-right-leave-to {
    transform: none !important;
  }
}

/* Dark Mode */
@media (prefers-color-scheme: dark) {
  .n-dialog {
    background-color: var(--n-background-color-dark, #1a202c);
    color: var(--n-text-color-dark, #f7fafc);
  }
  
  .n-dialog__header {
    border-bottom-color: var(--n-border-color-dark, #2d3748);
  }
  
  .n-dialog__title {
    color: var(--n-heading-color-dark, #f7fafc);
  }
  
  .n-dialog__action-button {
    color: var(--n-text-secondary-color-dark, #a0aec0);
  }
  
  .n-dialog__action-button:hover {
    background-color: var(--n-hover-color-dark, rgba(255, 255, 255, 0.1));
    color: var(--n-text-color-dark, #f7fafc);
  }
  
  .n-dialog__content {
    color: var(--n-text-color-dark, #e2e8f0);
  }
  
  .n-dialog__input {
    background-color: var(--n-input-background-dark, #2d3748);
    color: var(--n-text-color-dark, #f7fafc);
    border-color: var(--n-border-color-dark, #4a5568);
  }
  
  .n-dialog__input-label {
    color: var(--n-label-color-dark, #e2e8f0);
  }
  
  .n-dialog__footer {
    border-top-color: var(--n-border-color-dark, #2d3748);
    background-color: var(--n-footer-background-dark, #171923);
  }
  
  .n-dialog__button--secondary {
    background-color: var(--n-secondary-background-dark, #2d3748);
    color: var(--n-secondary-color-dark, #e2e8f0);
    border-color: var(--n-border-color-dark, #4a5568);
  }
  
  .n-dialog__button--secondary:hover:not(:disabled) {
    background-color: var(--n-secondary-background-darker, #4a5568);
  }
  
  .n-dialog__button--tertiary {
    color: var(--n-primary-color-dark, #63b3ed);
  }
  
  .n-dialog__button--tertiary:hover:not(:disabled) {
    background-color: var(--n-tertiary-background-dark, rgba(99, 179, 237, 0.1));
  }
}

/* Responsive Design */
@media (max-width: 640px) {
  .n-dialog-backdrop {
    padding: 1rem 0.5rem;
  }
  
  .n-dialog--small,
  .n-dialog--medium,
  .n-dialog--large {
    max-width: 100%;
  }
  
  .n-dialog__header {
    padding: 12px 16px;
  }
  
  .n-dialog__content {
    padding: 16px;
  }
  
  .n-dialog__footer {
    padding: 12px 16px;
  }
  
  .n-dialog__button {
    padding: 8px 12px;
  }
}
</style>