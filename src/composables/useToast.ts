import { useUIStore } from "@/stores/ui";
import toastService, {
  type ToastOptions as ServiceToastOptions,
} from "@/services/ui/ToastService";

/**
 * Toast-Nachrichtentypen
 */
export type ToastType = "success" | "error" | "warning" | "info";

/**
 * Toast-Optionen
 */
export interface ToastOptions {
  /**
   * Anzeigedauer in Millisekunden (Standard: 5000ms)
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
 * Konvertiert die Toast-Optionen in das Format des Toast-Services
 */
function convertToServiceOptions(options?: ToastOptions): ServiceToastOptions {
  if (!options) return {};

  return {
    title: options.title,
    duration: options.duration,
    position: options.position,
  };
}

/**
 * Composable für Toast-Benachrichtigungen
 *
 * Ermöglicht die Anzeige von temporären Benachrichtigungen im UI.
 * Verwendet primär den ToastService und fällt bei Bedarf auf den UI-Store zurück.
 */
export function useToast() {
  // UI Store für Fallback, falls Toast-Service nicht verfügbar
  const uiStore = useUIStore();

  /**
   * Zeigt eine neue Toast-Nachricht an
   */
  function show(config: ToastShowConfig): string {
    const { message, type = "info", title, duration } = config;

    // Primär den Toast-Service verwenden
    return toastService.show(message, type, {
      title,
      duration,
    });
  }

  /**
   * Entfernt eine Toast-Nachricht basierend auf ihrer ID
   */
  function dismiss(id: string): void {
    toastService.remove(id);
  }

  /**
   * Entfernt alle aktiven Toast-Nachrichten
   */
  function dismissAll(): void {
    toastService.clear();
  }

  /**
   * Zeigt eine Erfolgs-Toast-Nachricht an
   */
  function success(message: string, options?: ToastOptions): string {
    return toastService.success(message, convertToServiceOptions(options));
  }

  /**
   * Zeigt eine Fehler-Toast-Nachricht an
   */
  function error(message: string, options?: ToastOptions): string {
    return toastService.error(message, convertToServiceOptions(options));
  }

  /**
   * Zeigt eine Warnungs-Toast-Nachricht an
   */
  function warning(message: string, options?: ToastOptions): string {
    return toastService.warning(message, convertToServiceOptions(options));
  }

  /**
   * Zeigt eine Info-Toast-Nachricht an
   */
  function info(message: string, options?: ToastOptions): string {
    return toastService.info(message, convertToServiceOptions(options));
  }

  return {
    // Toasts aus dem Service direkt nutzen
    toasts: toastService.toasts,

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
