import { reactive, readonly } from "vue";

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
}

/**
 * Toast-Nachricht
 */
export interface ToastMessage {
  /**
   * Eindeutige ID des Toasts
   */
  id: string;

  /**
   * Anzuzeigende Nachricht
   */
  message: string;

  /**
   * Typ der Nachricht (success, error, warning, info)
   */
  type: ToastType;

  /**
   * Zeitstempel der Erstellung
   */
  timestamp: Date;

  /**
   * Anzeigedauer in Millisekunden
   */
  duration: number;

  /**
   * Position des Toasts
   */
  position: string;
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
   * Optionen für die Anzeige
   */
  options?: ToastOptions;
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
 */
export function useToast() {
  /**
   * Zeigt eine neue Toast-Nachricht an
   */
  function show(config: ToastShowConfig): string {
    const id = `toast-${state.counter++}`;
    const { message, type = "info", options = {} } = config;
    const { duration = 3000, position = "bottom-right" } = options;

    const toast: ToastMessage = {
      id,
      message,
      type,
      timestamp: new Date(),
      duration,
      position,
    };

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
    const index = state.toasts.findIndex((toast) => toast.id === id);
    if (index !== -1) {
      state.toasts.splice(index, 1);
    }
  }

  /**
   * Entfernt alle aktiven Toast-Nachrichten
   */
  function dismissAll(): void {
    state.toasts = [];
  }

  /**
   * Zeigt eine Erfolgs-Toast-Nachricht an
   */
  function success(message: string, options?: ToastOptions): string {
    return show({ message, type: "success", options });
  }

  /**
   * Zeigt eine Fehler-Toast-Nachricht an
   */
  function error(message: string, options?: ToastOptions): string {
    return show({ message, type: "error", options });
  }

  /**
   * Zeigt eine Warnungs-Toast-Nachricht an
   */
  function warning(message: string, options?: ToastOptions): string {
    return show({ message, type: "warning", options });
  }

  /**
   * Zeigt eine Info-Toast-Nachricht an
   */
  function info(message: string, options?: ToastOptions): string {
    return show({ message, type: "info", options });
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
