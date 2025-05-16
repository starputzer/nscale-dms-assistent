/**
 * DialogStoreAdapter: Bietet eine kompatible Schnittstelle für verschiedene Versionen des Dialog-Stores
 * 
 * Dieser Adapter löst Kompatibilitätsprobleme zwischen verschiedenen Versionen der Store-API,
 * indem er fehlende Methoden implementiert und API-Unterschiede ausgleicht.
 */

import { ref } from 'vue';
import type { Store } from 'pinia';

// Dialog-Options-Interface
export interface DialogOptions {
  title?: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error' | 'confirm';
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

// Store-Interface mit zurückkompatiblen Methoden
export interface DialogStoreWithCompat {
  // Gemeinsame Methoden
  showDialog(options: DialogOptions): void;
  showError(options: { title?: string; message: string }): void;
  showConfirm(options: DialogOptions): Promise<boolean>;
  hideDialog(): void;
  
  // Store-Eigenschaften für Kompatibilität 
  isVisible: boolean;
  title: string;
  message: string;
  type: string;
  
  // Pinia Store-Kompatibilität
  $patch: (partialStateOrMutator: any) => void;
}

// Dialog Store reference - will be initialized lazily
let dialogStore: Store<string, any, any, any> | null = null;
let attempted = false;

/**
 * Erstellt einen Dialog-Store mit kompatiblen Methoden
 * für verschiedene Versionen der API
 */
export function useDialogStoreCompat(): DialogStoreWithCompat {
  // Try to get the dialog store lazily
  if (!attempted && !dialogStore) {
    attempted = true;
    try {
      const { useDialogStore } = require('@/stores/dialog');
      dialogStore = useDialogStore();
    } catch (e) {
      console.warn('Dialog-Store nicht gefunden, verwende Fallback');
    }
  }
  
  // Fallback-Variablen, falls kein Store existiert
  const isVisible = ref(false);
  const title = ref('');
  const message = ref('');
  const type = ref('info');
  
  // Verwende den vorhandenen Store oder erstelle einen Fallback
  return {
    // Gemeinsame Store-Eigenschaften mit Fallback
    get isVisible() {
      return dialogStore ? dialogStore.isVisible : isVisible.value;
    },
    set isVisible(value: boolean) {
      if (dialogStore) {
        dialogStore.isVisible = value;
      } else {
        isVisible.value = value;
      }
    },
    
    get title() {
      return dialogStore ? dialogStore.title : title.value;
    },
    set title(value: string) {
      if (dialogStore) {
        dialogStore.title = value;
      } else {
        title.value = value;
      }
    },
    
    get message() {
      return dialogStore ? dialogStore.message : message.value;
    },
    set message(value: string) {
      if (dialogStore) {
        dialogStore.message = value;
      } else {
        message.value = value;
      }
    },
    
    get type() {
      return dialogStore ? dialogStore.type : type.value;
    },
    set type(value: string) {
      if (dialogStore) {
        dialogStore.type = value;
      } else {
        type.value = value;
      }
    },
    
    // Dialog anzeigen
    showDialog: (options: DialogOptions): void => {
      if (dialogStore && typeof dialogStore.showDialog === 'function') {
        dialogStore.showDialog(options);
      } else {
        // Fallback: Eigenschaften direkt setzen
        title.value = options.title || '';
        message.value = options.message;
        type.value = options.type || 'info';
        isVisible.value = true;
        
        // Browseralert als absoluter Fallback
        alert(`${options.title || ''}: ${options.message}`);
      }
    },
    
    // Fehlerdialog anzeigen
    showError: (options: { title?: string; message: string }): void => {
      if (dialogStore && typeof dialogStore.showError === 'function') {
        dialogStore.showError(options);
      } else {
        // Fallback: Dialog mit Fehlertyp anzeigen
        title.value = options.title || 'Fehler';
        message.value = options.message;
        type.value = 'error';
        isVisible.value = true;
        
        // Browseralert als absoluter Fallback
        alert(`Fehler: ${options.message}`);
      }
    },
    
    // Bestätigungsdialog anzeigen
    showConfirm: (options: DialogOptions): Promise<boolean> => {
      if (dialogStore && typeof dialogStore.showConfirm === 'function') {
        return dialogStore.showConfirm(options);
      }
      
      // Fallback: Verwende Browser-API
      return new Promise<boolean>((resolve) => {
        const confirmed = confirm(`${options.title || ''}: ${options.message}`);
        if (confirmed && options.onConfirm) {
          options.onConfirm();
        } else if (!confirmed && options.onCancel) {
          options.onCancel();
        }
        resolve(confirmed);
      });
    },
    
    // Dialog ausblenden
    hideDialog: (): void => {
      if (dialogStore && typeof dialogStore.hideDialog === 'function') {
        dialogStore.hideDialog();
      } else {
        // Fallback: Direkt unsichtbar machen
        isVisible.value = false;
      }
    },
    
    // Pinia $patch für Store-Kompatibilität
    $patch: (partialStateOrMutator: any): void => {
      if (dialogStore && typeof dialogStore.$patch === 'function') {
        dialogStore.$patch(partialStateOrMutator);
      } else {
        // Fallback: Manuelles Update des Zustands
        if (typeof partialStateOrMutator === 'function') {
          // Für Mutator-Funktionen
          partialStateOrMutator({
            isVisible: isVisible.value,
            title: title.value,
            message: message.value,
            type: type.value,
          });
        } else {
          // Für partielle Zustandsupdates
          if ('isVisible' in partialStateOrMutator) {
            isVisible.value = partialStateOrMutator.isVisible;
          }
          if ('title' in partialStateOrMutator) {
            title.value = partialStateOrMutator.title;
          }
          if ('message' in partialStateOrMutator) {
            message.value = partialStateOrMutator.message;
          }
          if ('type' in partialStateOrMutator) {
            type.value = partialStateOrMutator.type;
          }
        }
      }
    }
  };
}

// Cached store instance
let cachedStore: DialogWithCompat | null = null;

// Factory function to get the store instance
export function getDialogStoreCompat(): DialogWithCompat {
  if (!cachedStore) {
    cachedStore = useDialogStoreCompat();
  }
  return cachedStore;
}