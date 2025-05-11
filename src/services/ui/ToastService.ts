import { reactive, readonly } from "vue";
import { v4 as uuidv4 } from "uuid";
import { i18n } from "@/i18n";

/**
 * Toast-Nachrichtentypen
 */
export type ToastType = "success" | "error" | "warning" | "info";

/**
 * Aktions-Button-Konfiguration für einen Toast
 */
export interface ToastAction {
  /**
   * Text für den Aktions-Button
   */
  label: string;

  /**
   * Callback, der ausgeführt wird, wenn auf den Button geklickt wird
   */
  onClick: () => void;

  /**
   * Gibt an, ob der Toast nach dem Klick auf den Button geschlossen werden soll
   * @default true
   */
  closeOnClick?: boolean;
}

/**
 * Positions-Konfiguration für einen Toast
 */
export type ToastPosition =
  | "top-right"
  | "top-left"
  | "bottom-right"
  | "bottom-left"
  | "top-center"
  | "bottom-center";

/**
 * Toast-Optionen
 */
export interface ToastOptions {
  /**
   * Titel des Toasts (optional)
   */
  title?: string;

  /**
   * Anzeigedauer in Millisekunden (Standard: 5000ms)
   * Bei 0 wird der Toast nicht automatisch geschlossen
   */
  duration?: number;

  /**
   * Position des Toasts
   */
  position?: ToastPosition;

  /**
   * Gibt an, ob der Toast manuell geschlossen werden kann
   */
  closable?: boolean;

  /**
   * Gibt an, ob ein Icon angezeigt werden soll
   */
  showIcon?: boolean;

  /**
   * Konfiguration für einen Aktions-Button
   */
  action?: ToastAction;

  /**
   * Eindeutiger Gruppen-Identifier für das Gruppieren ähnlicher Toasts
   */
  group?: string;

  /**
   * Gibt an, ob dieser Toast ähnliche Toasts in der gleichen Gruppe ersetzen soll
   */
  replaceGroupToasts?: boolean;

  /**
   * Custom CSS-Klassen, die dem Toast hinzugefügt werden
   */
  customClass?: string;

  /**
   * Callback, der ausgeführt wird, wenn der Toast angezeigt wird
   */
  onShow?: () => void;

  /**
   * Callback, der ausgeführt wird, wenn der Toast geschlossen wird
   */
  onClose?: () => void;
}

/**
 * Toast-Nachricht
 */
export interface Toast {
  /**
   * Eindeutige ID des Toasts
   */
  id: string;

  /**
   * Anzuzeigende Nachricht
   */
  message: string;

  /**
   * Titel des Toasts (optional)
   */
  title?: string;

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
  position: ToastPosition;

  /**
   * Gibt an, ob der Toast manuell geschlossen werden kann
   */
  closable: boolean;

  /**
   * Gibt an, ob ein Icon angezeigt werden soll
   */
  showIcon: boolean;

  /**
   * Konfiguration für einen Aktions-Button
   */
  action?: ToastAction;

  /**
   * Eindeutiger Gruppen-Identifier für das Gruppieren ähnlicher Toasts
   */
  group?: string;

  /**
   * Custom CSS-Klassen, die dem Toast hinzugefügt werden
   */
  customClass?: string;

  /**
   * Gibt an, ob der Toast bereits gelesen wurde
   */
  read?: boolean;
}

/**
 * Toast Service State
 */
interface ToastState {
  /**
   * Liste aktiver Toast-Nachrichten
   */
  toasts: Toast[];

  /**
   * Standard-Konfiguration für alle Toasts
   */
  defaultOptions: {
    duration: number;
    position: ToastPosition;
    closable: boolean;
    showIcon: boolean;
  };

  /**
   * Maximale Anzahl an gleichzeitig angezeigten Toasts
   */
  maxToasts: number;

  /**
   * Warteschlange für Toasts
   */
  queue: Toast[];
}

// Standard-Konfiguration
const defaultOptions = {
  duration: 5000,
  position: "bottom-right" as ToastPosition,
  closable: true,
  showIcon: true,
};

// Maximale Anzahl an gleichzeitig angezeigten Toasts
const maxToastsDefault = 6;

// State erstellen
const state = reactive<ToastState>({
  toasts: [],
  defaultOptions,
  maxToasts: maxToastsDefault,
  queue: [],
});

/**
 * Prüft die Warteschlange und zeigt ggf. den nächsten Toast an
 */
function processQueue(): void {
  if (state.queue.length > 0 && state.toasts.length < state.maxToasts) {
    const toast = state.queue.shift()!;
    state.toasts.push(toast);

    // Automatisches Entfernen nach Ablauf der Dauer (nur wenn duration > 0)
    if (toast.duration > 0) {
      setTimeout(() => {
        removeToast(toast.id);
      }, toast.duration);
    }
  }
}

/**
 * Toast Service
 * Bietet Funktionen zum Anzeigen und Verwalten von Toast-Nachrichten
 */
export const toastService = {
  /**
   * Zeigt einen neuen Toast an
   * @param message Die anzuzeigende Nachricht
   * @param type Der Typ des Toasts (info, success, error, warning)
   * @param options Zusätzliche Optionen für den Toast
   * @returns Die ID des erstellten Toasts
   */
  show(
    message: string,
    type: ToastType = "info",
    options: ToastOptions = {},
  ): string {
    const id = uuidv4();

    const {
      title,
      duration = state.defaultOptions.duration,
      position = state.defaultOptions.position,
      closable = state.defaultOptions.closable,
      showIcon = state.defaultOptions.showIcon,
      action,
      group,
      replaceGroupToasts = false,
      customClass,
      onShow,
      onClose,
    } = options;

    const toast: Toast = {
      id,
      message,
      title,
      type,
      timestamp: new Date(),
      duration,
      position,
      closable,
      showIcon,
      action,
      group,
      customClass,
    };

    // Wenn gruppierte Toasts ersetzt werden sollen und die Gruppe existiert
    if (group && replaceGroupToasts) {
      // Toasts in der gleichen Gruppe entfernen (sowohl aus der Warteschlange als auch aus den aktiven Toasts)
      state.queue = state.queue.filter((t) => t.group !== group);

      // Aktive Toasts in der gleichen Gruppe entfernen
      const toastsToRemove = state.toasts
        .filter((t) => t.group === group)
        .map((t) => t.id);
      toastsToRemove.forEach((id) => removeToast(id));
    }

    // Callback ausführen, wenn vorhanden
    if (onShow) {
      onShow();
    }

    // Listener für onClose setzen (wird beim Entfernen aufgerufen)
    if (onClose) {
      const originalOnClose = onClose;
      (toast as any).__onCloseCallback = () => {
        originalOnClose();
      };
    }

    // Wenn noch Platz ist, direkt anzeigen, sonst in die Warteschlange
    if (state.toasts.length < state.maxToasts) {
      state.toasts.push(toast);

      // Automatisches Entfernen nach Ablauf der Dauer (nur wenn duration > 0)
      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    } else {
      state.queue.push(toast);
    }

    return id;
  },

  /**
   * Zeigt einen Success-Toast an
   * @param message Die anzuzeigende Nachricht
   * @param options Zusätzliche Optionen für den Toast
   * @returns Die ID des erstellten Toasts
   */
  success(message: string, options: ToastOptions = {}): string {
    return this.show(message, "success", {
      title: options.title || i18n.t("toast.success"),
      ...options,
    });
  },

  /**
   * Zeigt einen Error-Toast an
   * @param message Die anzuzeigende Nachricht
   * @param options Zusätzliche Optionen für den Toast
   * @returns Die ID des erstellten Toasts
   */
  error(message: string, options: ToastOptions = {}): string {
    return this.show(message, "error", {
      title: options.title || i18n.t("toast.error"),
      duration: options.duration || 0, // Fehler werden standardmäßig nicht automatisch geschlossen
      ...options,
    });
  },

  /**
   * Zeigt einen Warning-Toast an
   * @param message Die anzuzeigende Nachricht
   * @param options Zusätzliche Optionen für den Toast
   * @returns Die ID des erstellten Toasts
   */
  warning(message: string, options: ToastOptions = {}): string {
    return this.show(message, "warning", {
      title: options.title || i18n.t("toast.warning"),
      ...options,
    });
  },

  /**
   * Zeigt einen Info-Toast an
   * @param message Die anzuzeigende Nachricht
   * @param options Zusätzliche Optionen für den Toast
   * @returns Die ID des erstellten Toasts
   */
  info(message: string, options: ToastOptions = {}): string {
    return this.show(message, "info", {
      title: options.title || i18n.t("toast.info"),
      ...options,
    });
  },

  /**
   * Entfernt einen Toast anhand seiner ID
   * @param id Die ID des zu entfernenden Toasts
   */
  remove(id: string): void {
    removeToast(id);
  },

  /**
   * Entfernt alle Toasts
   */
  clear(): void {
    state.toasts = [];
    state.queue = [];
  },

  /**
   * Markiert einen Toast als gelesen
   * @param id Die ID des zu markierenden Toasts
   */
  markAsRead(id: string): void {
    const toast = state.toasts.find((t) => t.id === id);
    if (toast) {
      toast.read = true;
    }
  },

  /**
   * Ändert die maximale Anzahl gleichzeitig angezeigter Toasts
   * @param limit Die neue Begrenzung
   */
  setMaxToasts(limit: number): void {
    state.maxToasts = limit;
    processQueue();
  },

  /**
   * Ändert die Standard-Konfiguration für alle Toasts
   * @param options Die neuen Standard-Optionen
   */
  setDefaultOptions(options: Partial<typeof state.defaultOptions>): void {
    Object.assign(state.defaultOptions, options);
  },

  /**
   * Gibt alle aktiven Toasts zurück (readonly)
   */
  get toasts() {
    return readonly(state.toasts);
  },

  /**
   * Gibt die aktuelle Standard-Konfiguration zurück (readonly)
   */
  get defaultOptions() {
    return readonly(state.defaultOptions);
  },

  /**
   * Gibt die Wartelistengröße zurück
   */
  get queueSize() {
    return state.queue.length;
  },
};

/**
 * Entfernt einen Toast anhand seiner ID
 * @param id Die ID des zu entfernenden Toasts
 */
function removeToast(id: string): void {
  const index = state.toasts.findIndex((toast) => toast.id === id);

  if (index !== -1) {
    const toast = state.toasts[index];

    // Wenn ein onClose-Callback definiert ist, ausführen
    if ((toast as any).__onCloseCallback) {
      (toast as any).__onCloseCallback();
    }

    // Toast entfernen
    state.toasts.splice(index, 1);

    // Prüfen, ob ein neuer Toast aus der Warteschlange angezeigt werden kann
    processQueue();
  }
}

export default toastService;
