import { reactive, readonly } from "vue";
import { useUIStore } from "@/stores/ui";
import type { Toast as ToastMessage } from "@/types/ui";

/**
 * Toast-Nachrichtentypen
 */
export type ToastType = "success" | "error" | "warning" | "info";

/**
 * Toast-Optionen
 */
export interface ToastOptions {
  /**
   * Anzeigedauer in Millisekunden (Standard: 3000ms)
   */
  duration?: number;

  /**
   * Position des Toasts (Standard: bottom-right)
   */
  position?:
    | "top-right"
    | "top-left"
    | "bottom-right"
    | "bottom-left"
    | "top-center"
    | "bottom-center";
    
  /**
   * Titel des Toasts (optional)
   */
  title?: string;
}

/**
 * Konfiguration für den Toast-Service
 */
export interface ToastShowConfig {
  /**
   * Anzuzeigende Nachricht
   */
  message: string;

  /**
   * Typ der Nachricht (success, error, warning, info)
   */
  type?: ToastType;
  
  /**
   * Titel des Toasts (optional)
   */
  title?: string;
  
  /**
   * Dauer der Anzeige in Millisekunden
   */
  duration?: number;
}

/**
 * Toast-Service-State
 */
interface ToastState {
  /**
   * Liste aktiver Toast-Nachrichten
   */
  toasts: ToastMessage[];

  /**
   * Zähler für eindeutige IDs
   */
  counter: number;
}

// Erstelle einen gemeinsamen State für alle Komponenteninstanzen
const state = reactive<ToastState>({
  toasts: [],
  counter: 0,
});

/**
 * Composable für Toast-Benachrichtigungen
 *
 * Ermöglicht die Anzeige von temporären Benachrichtigungen im UI.
 * Kompatibel mit dem UI-Store für konsistente Toast-Anzeige.
 */
export function useToast() {
  const uiStore = useUIStore();

  /**
   * Zeigt eine neue Toast-Nachricht an
   */
  function show(config: ToastShowConfig): string {
    // Versuche, den UI Store zu verwenden, wenn verfügbar
    if (uiStore && typeof uiStore.showToast === 'function') {
      return uiStore.showToast({
        type: config.type || 'info',
        message: config.message,
        duration: config.duration
      });
    }
    
    // Fallback zur lokalen Implementierung
    const id = `toast-${state.counter++}`;
    const { message, type = "info", title, duration = 3000 } = config;

    const toast = {
      id,
      message,
      type,
      title,
      duration,
      timestamp: new Date(),
      position: "bottom-right"
    } as unknown as ToastMessage;

    // Toast zur Liste hinzufügen
    state.toasts.push(toast);

    // Timer für das automatische Entfernen setzen
    setTimeout(() => {
      dismiss(id);
    }, duration);

    return id;
  }

  /**
   * Entfernt eine Toast-Nachricht basierend auf ihrer ID
   */
  function dismiss(id: string): void {
    // Versuche, den UI Store zu verwenden, wenn verfügbar
    if (uiStore && typeof uiStore.dismissToast === 'function') {
      uiStore.dismissToast(id);
      return;
    }
    
    // Fallback zur lokalen Implementierung
    const index = state.toasts.findIndex((toast) => toast.id === id);
    if (index !== -1) {
      state.toasts.splice(index, 1);
    }
  }

  /**
   * Entfernt alle aktiven Toast-Nachrichten
   */
  function dismissAll(): void {
    if (uiStore && typeof uiStore.closeAllModals === 'function') {
      // Versuche, die UI Store-Methode zu verwenden
      // (Angenommen, dass closeAllModals alle Benachrichtigungen schließt)
      uiStore.closeAllModals();
      return;
    }
    
    // Fallback zur lokalen Implementierung
    state.toasts = [];
  }

  /**
   * Zeigt eine Erfolgs-Toast-Nachricht an
   */
  function success(message: string, options?: ToastOptions): string {
    // UI Store verwenden, wenn verfügbar
    if (uiStore && typeof uiStore.showSuccess === 'function') {
      return uiStore.showSuccess(message, options);
    }
    
    // Fallback zur lokalen Implementierung
    return show({
      message,
      type: "success",
      title: options?.title,
      duration: options?.duration
    });
  }

  /**
   * Zeigt eine Fehler-Toast-Nachricht an
   */
  function error(message: string, options?: ToastOptions): string {
    // UI Store verwenden, wenn verfügbar
    if (uiStore && typeof uiStore.showError === 'function') {
      return uiStore.showError(message, options);
    }
    
    // Fallback zur lokalen Implementierung
    return show({
      message,
      type: "error",
      title: options?.title,
      duration: options?.duration
    });
  }

  /**
   * Zeigt eine Warnungs-Toast-Nachricht an
   */
  function warning(message: string, options?: ToastOptions): string {
    // UI Store verwenden, wenn verfügbar
    if (uiStore && typeof uiStore.showWarning === 'function') {
      return uiStore.showWarning(message, options);
    }
    
    // Fallback zur lokalen Implementierung
    return show({
      message,
      type: "warning",
      title: options?.title,
      duration: options?.duration
    });
  }

  /**
   * Zeigt eine Info-Toast-Nachricht an
   */
  function info(message: string, options?: ToastOptions): string {
    // UI Store verwenden, wenn verfügbar
    if (uiStore && typeof uiStore.showInfo === 'function') {
      return uiStore.showInfo(message, options);
    }
    
    // Fallback zur lokalen Implementierung
    return show({
      message,
      type: "info",
      title: options?.title,
      duration: options?.duration
    });
  }

  return {
    // State (readonly, um Mutationen zu verhindern)
    toasts: readonly(state.toasts),

    // Methoden
    show,
    dismiss,
    dismissAll,
    success,
    error,
    warning,
    info,
  };
}