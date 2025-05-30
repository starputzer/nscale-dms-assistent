import { ref, readonly } from "vue";
import { v4 as uuidv4 } from "uuid";
import { i18n } from "@/composables/useI18n";

/**
 * Arten von Dialogen
 */
export type DialogType =
  | "confirm"
  | "alert"
  | "prompt"
  | "info"
  | "warning"
  | "error"
  | "success"
  | "custom";

/**
 * Positionen des Dialogs
 */
export type DialogPosition = "center" | "top" | "right" | "bottom" | "left";

/**
 * Größen des Dialogs
 */
export type DialogSize = "small" | "medium" | "large" | "full";

/**
 * Button-Konfiguration
 */
export interface DialogButton {
  /**
   * Text des Buttons
   */
  label: string;

  /**
   * HTML-Typ des Buttons
   */
  type?: "button" | "submit" | "reset";

  /**
   * Variante des Buttons
   */
  variant?:
    | "primary"
    | "secondary"
    | "tertiary"
    | "danger"
    | "success"
    | "warning";

  /**
   * Gibt an, ob der Button deaktiviert ist
   */
  disabled?: boolean;

  /**
   * Callback, der bei Klick ausgeführt wird
   */
  onClick?: (e: MouseEvent) => void | Promise<void> | boolean;

  /**
   * Verzögertes Autoschließen nach Klick (in ms)
   */
  autoCloseDelay?: number;

  /**
   * Ob der Dialog nach Klick automatisch geschlossen werden soll
   */
  closeDialog?: boolean;

  /**
   * Rückgabewert für die Promise-Auflösung
   */
  returnValue?: any;

  /**
   * Gibt an, ob der Button einen Ladezustand anzeigen soll
   */
  loading?: boolean;

  /**
   * Icon für den Button (Component-Name oder Callback, die die Komponente zurückgibt)
   */
  icon?: string | (() => any);
}

/**
 * Basis-Optionen für alle Dialoge
 */
export interface DialogBaseOptions {
  /**
   * Titel des Dialogs
   */
  title?: string;

  /**
   * Nachricht/Inhalt des Dialogs
   */
  message?: string;

  /**
   * Typ des Dialogs
   */
  type?: DialogType;

  /**
   * Position des Dialogs
   */
  position?: DialogPosition;

  /**
   * Größe des Dialogs
   */
  size?: DialogSize;

  /**
   * Gibt an, ob der Dialog modal ist (Hintergrund blockiert)
   */
  modal?: boolean;

  /**
   * Maskierbar (schließt bei Klick auf Hintergrund)
   */
  maskClosable?: boolean;

  /**
   * Gibt an, ob der Dialog mit der Escape-Taste geschlossen werden kann
   */
  escClosable?: boolean;

  /**
   * Gibt an, ob ein Schließen-Button angezeigt werden soll
   */
  showClose?: boolean;

  /**
   * Benutzerdefinierte Klasse für den Dialog
   */
  customClass?: string;

  /**
   * Z-Index des Dialogs
   */
  zIndex?: number;

  /**
   * Gibt an, ob der Inhalt scrollbar sein soll
   */
  scrollable?: boolean;

  /**
   * Animation beim Öffnen/Schließen
   */
  animation?:
    | "fade"
    | "zoom"
    | "slide-up"
    | "slide-down"
    | "slide-left"
    | "slide-right"
    | "none";

  /**
   * Dauer der Animation in ms
   */
  animationDuration?: number;

  /**
   * Verzögerung zum automatischen Schließen in ms (0 = deaktiviert)
   */
  autoClose?: number;

  /**
   * Callback beim Öffnen des Dialogs
   */
  onOpen?: () => void;

  /**
   * Callback beim Schließen des Dialogs
   */
  onClose?: () => void;

  /**
   * Callback bevor der Dialog geöffnet wird
   */
  beforeOpen?: () => boolean | Promise<boolean>;

  /**
   * Callback bevor der Dialog geschlossen wird
   */
  beforeClose?: () => boolean | Promise<boolean>;

  /**
   * Callback, wenn der Dialog durch Escape oder Backdrop-Klick geschlossen wird
   */
  onCancel?: () => void;

  /**
   * Gibt an, ob der Dialog einen Fullscreen-Button haben soll
   */
  fullscreenable?: boolean;

  /**
   * Gibt an, ob der Dialog im Fullscreen-Modus geöffnet werden soll
   */
  fullscreen?: boolean;

  /**
   * ID für ARIA-Zwecke und Tests
   */
  id?: string;

  /**
   * Buttons für den Dialog
   */
  buttons?: DialogButton[];
}

/**
 * Optionen für Bestätigungsdialoge
 */
export interface ConfirmDialogOptions extends DialogBaseOptions {
  /**
   * Text für den Bestätigen-Button
   */
  confirmButtonText?: string;

  /**
   * Text für den Abbrechen-Button
   */
  cancelButtonText?: string;

  /**
   * Variante des Bestätigen-Buttons
   */
  confirmButtonVariant?:
    | "primary"
    | "secondary"
    | "tertiary"
    | "danger"
    | "success"
    | "warning";

  /**
   * Variante des Abbrechen-Buttons
   */
  cancelButtonVariant?:
    | "primary"
    | "secondary"
    | "tertiary"
    | "danger"
    | "success"
    | "warning";

  /**
   * Ob der Abbrechen-Button angezeigt werden soll
   */
  showCancelButton?: boolean;

  /**
   * Callback, wenn der Bestätigen-Button geklickt wird
   */
  onConfirm?: () => void | Promise<void>;

  /**
   * Callback, wenn der Abbrechen-Button geklickt wird
   */
  onCancel?: () => void | Promise<void>;
}

/**
 * Optionen für Eingabedialoge
 */
export interface PromptDialogOptions extends ConfirmDialogOptions {
  /**
   * Label für das Eingabefeld
   */
  inputLabel?: string;

  /**
   * Typ des Eingabefelds (text, password, email, etc.)
   */
  inputType?: string;

  /**
   * Placeholder für das Eingabefeld
   */
  placeholder?: string;

  /**
   * Standardwert für das Eingabefeld
   */
  defaultValue?: string;

  /**
   * Minimale Länge der Eingabe
   */
  minLength?: number;

  /**
   * Maximale Länge der Eingabe
   */
  maxLength?: number;

  /**
   * Ob die Eingabe erforderlich ist
   */
  required?: boolean;

  /**
   * Validierungsfunktion für die Eingabe
   */
  validator?: (value: string) => boolean | string;

  /**
   * Fehlermeldung bei ungültiger Eingabe
   */
  validationMessage?: string;

  /**
   * Callback, wenn der Bestätigen-Button mit Eingabewert geklickt wird
   */
  onConfirm?: (value: string) => void | Promise<void>;
}

/**
 * Typ für jeden Dialog
 */
export interface DialogInstance {
  /**
   * Eindeutige ID des Dialogs
   */
  id: string;

  /**
   * Optionen des Dialogs
   */
  options: DialogBaseOptions;

  /**
   * Gibt an, ob der Dialog sichtbar ist
   */
  visible: boolean;

  /**
   * Rückgabewert für die Promise-Auflösung
   */
  resolve: (value: any) => void;

  /**
   * Rückgabewert für die Promise-Ablehnung
   */
  reject: (reason?: any) => void;

  /**
   * Gibt an, ob der Dialog im Vollbildmodus ist
   */
  isFullscreen?: boolean;

  /**
   * Gibt an, ob der Dialog gerade geschlossen wird
   */
  isClosing?: boolean;

  /**
   * Bei Prompt: Das aktuelle Eingabefeld
   */
  inputValue?: string;

  /**
   * Bei Prompt: Ob die Eingabe gültig ist
   */
  inputValid?: boolean;

  /**
   * Bei Prompt: Die aktuelle Validierungsfehlermeldung
   */
  inputError?: string;
}

/**
 * State für den Dialog-Service
 */
interface DialogState {
  /**
   * Alle aktiven Dialoge
   */
  dialogs: DialogInstance[];

  /**
   * Der aktuell fokussierte Dialog
   */
  activeDialog: DialogInstance | null;

  /**
   * Laufende Nummer für den Z-Index
   */
  zIndexCounter: number;

  /**
   * Ursprüngliches fokussiertes Element vor dem Öffnen des Dialogs
   */
  previouslyFocusedElement: HTMLElement | null;
}

/**
 * Standardoptionen für Dialoge
 */
const defaultOptions: DialogBaseOptions = {
  title: "",
  message: "",
  type: "confirm",
  position: "center",
  size: "medium",
  modal: true,
  maskClosable: true,
  escClosable: true,
  showClose: true,
  scrollable: true,
  animation: "fade",
  animationDuration: 300,
  autoClose: 0,
  zIndex: 1000,
  fullscreenable: false,
  fullscreen: false,
};

/**
 * Optionen nach Dialog-Typ
 */
const typeOptions: Record<DialogType, Partial<DialogBaseOptions>> = {
  confirm: {
    title: i18n.t("dialog.confirm"),
    type: "confirm",
  },
  alert: {
    title: i18n.t("dialog.alert"),
    type: "alert",
    maskClosable: false,
  },
  prompt: {
    title: i18n.t("dialog.prompt"),
    type: "prompt",
  },
  info: {
    title: i18n.t("dialog.info"),
    type: "info",
  },
  warning: {
    title: i18n.t("dialog.warning"),
    type: "warning",
  },
  error: {
    title: i18n.t("dialog.error"),
    type: "error",
  },
  success: {
    title: i18n.t("dialog.success"),
    type: "success",
    autoClose: 3000,
  },
  custom: {},
};

// Erstelle den State
const state = ref<DialogState>({
  dialogs: [],
  activeDialog: null,
  zIndexCounter: 1000,
  previouslyFocusedElement: null,
});

/**
 * Erstellt einen neuen Dialog
 * @param options Optionen für den Dialog
 * @returns Promise, die aufgelöst wird, wenn der Dialog geschlossen wird
 */
function createDialog<T = any>(options: DialogBaseOptions): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = options.id || uuidv4();
    const type = options.type || "custom";

    // Kombiniere die Optionen
    const mergedOptions: DialogBaseOptions = {
      ...defaultOptions,
      ...typeOptions[type],
      ...options,
      id,
    };

    // Z-Index aktualisieren
    if (!mergedOptions.zIndex) {
      state.value.zIndexCounter += 10;
      mergedOptions.zIndex = state.value.zIndexCounter;
    }

    // Dialog-Instanz erstellen
    const dialog: DialogInstance = {
      id,
      options: mergedOptions,
      visible: false,
      resolve,
      reject,
      isFullscreen: mergedOptions.fullscreen || false,
    };

    // Dialog zum State hinzufügen
    state.value.dialogs.push(dialog);

    // Vorheriges fokussiertes Element speichern
    if (typeof document !== "undefined") {
      state.value.previouslyFocusedElement =
        document.activeElement as HTMLElement;
    }

    // Dialog öffnen (mit kleiner Verzögerung für Animation)
    setTimeout(() => {
      // Vor dem Öffnen prüfen
      if (mergedOptions.beforeOpen) {
        const canOpen = mergedOptions.beforeOpen();
        if (canOpen === false) {
          // Dialog aus State entfernen
          removeDialog(id);
          reject(new Error("Dialog opening was prevented by beforeOpen"));
          return;
        }
      }

      // Dialog anzeigen
      dialog.visible = true;
      state.value.activeDialog = dialog;

      // onOpen-Callback ausführen
      if (mergedOptions.onOpen) {
        mergedOptions.onOpen();
      }

      // Automatisches Schließen, wenn konfiguriert
      if (mergedOptions.autoClose && mergedOptions.autoClose > 0) {
        setTimeout(() => {
          closeDialog(id, { trigger: "auto" });
        }, mergedOptions.autoClose);
      }
    }, 10);

    return id;
  });
}

/**
 * Schließt einen Dialog
 * @param id ID des Dialogs
 * @param options Optionen für das Schließen
 */
function closeDialog(
  id: string,
  options: {
    trigger?: "button" | "mask" | "esc" | "auto" | "api";
    result?: any;
  } = {},
): void {
  const dialogIndex = state.value.dialogs.findIndex((d) => d.id === id);
  if (dialogIndex === -1) return;

  const dialog = state.value.dialogs[dialogIndex];
  const dialogOptions = dialog.options;

  // Wenn der Dialog bereits geschlossen wird, nichts tun
  if (dialog.isClosing) return;

  // Vor dem Schließen prüfen
  if (dialogOptions.beforeClose) {
    const canClose = dialogOptions.beforeClose();
    if (canClose === false) {
      return;
    }
  }

  // Dialog als "wird geschlossen" markieren
  dialog.isClosing = true;

  // Bei Abbruch über Escape oder Backdrop
  if (options.trigger === "esc" || options.trigger === "mask") {
    if (dialogOptions.onCancel) {
      dialogOptions.onCancel();
    }
  }

  // onClose-Callback ausführen
  if (dialogOptions.onClose) {
    dialogOptions.onClose();
  }

  // Wenn Animation aktiviert ist, warten
  if (dialogOptions.animation !== "none" && dialogOptions.animationDuration) {
    dialog.visible = false;

    setTimeout(() => {
      // Dialog aus State entfernen
      removeDialog(id, options.result);
    }, dialogOptions.animationDuration);
  } else {
    // Sofort entfernen
    removeDialog(id, options.result);
  }
}

/**
 * Entfernt einen Dialog aus dem State und löst die Promise auf
 * @param id ID des Dialogs
 * @param result Ergebnis für die Promise-Auflösung
 */
function removeDialog(id: string, result?: any): void {
  const dialogIndex = state.value.dialogs.findIndex((d) => d.id === id);
  if (dialogIndex === -1) return;

  const dialog = state.value.dialogs[dialogIndex];

  // Dialog aus Array entfernen
  state.value.dialogs.splice(dialogIndex, 1);

  // Wenn es der aktive Dialog war, einen neuen aktiven Dialog setzen
  if (state.value.activeDialog && state.value.activeDialog.id === id) {
    state.value.activeDialog =
      state.value.dialogs.length > 0
        ? state.value.dialogs[state.value.dialogs.length - 1]
        : null;
  }

  // Fokus zurücksetzen, wenn keine Dialoge mehr geöffnet sind
  if (
    state.value.dialogs.length === 0 &&
    state.value.previouslyFocusedElement
  ) {
    setTimeout(() => {
      state.value.previouslyFocusedElement?.focus();
      state.value.previouslyFocusedElement = null;
    }, 0);
  }

  // Promise auflösen
  dialog.resolve(result);
}

/**
 * Toggelt den Vollbildmodus eines Dialogs
 * @param id ID des Dialogs
 */
function toggleFullscreen(id: string): void {
  const dialog = state.value.dialogs.find((d) => d.id === id);
  if (!dialog) return;

  dialog.isFullscreen = !dialog.isFullscreen;
}

/**
 * Dialog-Service
 * Bietet Funktionen zum Anzeigen und Verwalten von Dialogen
 */
export const dialogService = {
  /**
   * Zeigt einen Bestätigungsdialog an
   * @param options Optionen für den Dialog
   * @returns Promise, die mit true aufgelöst wird, wenn bestätigt, sonst mit false
   */
  confirm(options: string | Partial<ConfirmDialogOptions>): Promise<boolean> {
    if (typeof options === "string") {
      options = { message: options };
    }

    const dialogOptions: ConfirmDialogOptions = {
      ...options,
      type: "confirm",
      buttons: [
        {
          label: options.cancelButtonText || i18n.t("dialog.cancel"),
          variant: options.cancelButtonVariant || "secondary",
          closeDialog: true,
          returnValue: false,
        },
        {
          label: options.confirmButtonText || i18n.t("dialog.confirm"),
          variant: options.confirmButtonVariant || "primary",
          closeDialog: true,
          returnValue: true,
          onClick: options.onConfirm,
        },
      ],
    };

    if (options.showCancelButton === false) {
      dialogOptions.buttons = dialogOptions.buttons.filter(
        (b) => b.returnValue !== false,
      );
    }

    return createDialog(dialogOptions);
  },

  /**
   * Zeigt einen Alert-Dialog an
   * @param options Optionen für den Dialog
   * @returns Promise, die aufgelöst wird, wenn der Dialog geschlossen wird
   */
  alert(options: string | Partial<ConfirmDialogOptions>): Promise<void> {
    if (typeof options === "string") {
      options = { message: options };
    }

    const dialogOptions: ConfirmDialogOptions = {
      ...options,
      type: "alert",
      buttons: [
        {
          label: options.confirmButtonText || i18n.t("dialog.ok"),
          variant: options.confirmButtonVariant || "primary",
          closeDialog: true,
          onClick: options.onConfirm,
        },
      ],
      showCancelButton: false,
    };

    return createDialog(dialogOptions);
  },

  /**
   * Zeigt einen Eingabedialog an
   * @param options Optionen für den Dialog
   * @returns Promise, die mit dem eingegebenen Wert aufgelöst wird oder null, wenn abgebrochen
   */
  prompt(options: string | PromptDialogOptions): Promise<string | null> {
    if (typeof options === "string") {
      options = { message: options };
    }

    const inputValue = ref(options.defaultValue || "");
    const inputValid = ref(true);
    const inputError = ref("");

    // Validierungsfunktion
    const validateInput = () => {
      if (!options.validator) {
        inputValid.value = true;
        inputError.value = "";
        return true;
      }

      const result = options.validator(inputValue.value);
      if (result === true || result === undefined) {
        inputValid.value = true;
        inputError.value = "";
        return true;
      } else if (typeof result === "string") {
        inputValid.value = false;
        inputError.value = result;
        return false;
      } else {
        inputValid.value = false;
        inputError.value =
          options.validationMessage || i18n.t("dialog.invalidInput");
        return false;
      }
    };

    const dialogOptions: PromptDialogOptions & { [key: string]: any } = {
      ...options,
      type: "prompt",
      buttons: [
        {
          label: options.cancelButtonText || i18n.t("dialog.cancel"),
          variant: options.cancelButtonVariant || "secondary",
          closeDialog: true,
          returnValue: null,
        },
        {
          label: options.confirmButtonText || i18n.t("dialog.ok"),
          variant: options.confirmButtonVariant || "primary",
          closeDialog: true,
          returnValue: () => inputValue.value,
          onClick: () => {
            if (validateInput()) {
              if (options.onConfirm) {
                options.onConfirm(inputValue.value);
              }
              return inputValue.value;
            }
            return false; // Verhindert Schließen
          },
        },
      ],
      inputValue,
      inputValid,
      inputError,
      validateInput,
    };

    if (options.showCancelButton === false) {
      dialogOptions.buttons = dialogOptions.buttons.filter(
        (b) => b.returnValue !== null,
      );
    }

    return createDialog(dialogOptions);
  },

  /**
   * Zeigt einen Info-Dialog an
   * @param options Optionen für den Dialog
   * @returns Promise, die aufgelöst wird, wenn der Dialog geschlossen wird
   */
  info(options: string | Partial<ConfirmDialogOptions>): Promise<void> {
    if (typeof options === "string") {
      options = { message: options };
    }

    return this.alert({
      ...options,
      type: "info",
      title: options.title || i18n.t("dialog.info"),
    });
  },

  /**
   * Zeigt einen Warnungs-Dialog an
   * @param options Optionen für den Dialog
   * @returns Promise, die aufgelöst wird, wenn der Dialog geschlossen wird
   */
  warning(options: string | Partial<ConfirmDialogOptions>): Promise<void> {
    if (typeof options === "string") {
      options = { message: options };
    }

    return this.alert({
      ...options,
      type: "warning",
      title: options.title || i18n.t("dialog.warning"),
    });
  },

  /**
   * Zeigt einen Fehler-Dialog an
   * @param options Optionen für den Dialog
   * @returns Promise, die aufgelöst wird, wenn der Dialog geschlossen wird
   */
  error(options: string | Partial<ConfirmDialogOptions>): Promise<void> {
    if (typeof options === "string") {
      options = { message: options };
    }

    return this.alert({
      ...options,
      type: "error",
      title: options.title || i18n.t("dialog.error"),
    });
  },

  /**
   * Zeigt einen Erfolgs-Dialog an
   * @param options Optionen für den Dialog
   * @returns Promise, die aufgelöst wird, wenn der Dialog geschlossen wird
   */
  success(options: string | Partial<ConfirmDialogOptions>): Promise<void> {
    if (typeof options === "string") {
      options = { message: options };
    }

    return this.alert({
      ...options,
      type: "success",
      title: options.title || i18n.t("dialog.success"),
      autoClose: options.autoClose !== undefined ? options.autoClose : 3000,
    });
  },

  /**
   * Zeigt einen benutzerdefinierten Dialog an
   * @param options Optionen für den Dialog
   * @returns Promise, die aufgelöst wird, wenn der Dialog geschlossen wird
   */
  custom<T = any>(options: Partial<DialogBaseOptions>): Promise<T> {
    return createDialog<T>({
      ...options,
      type: "custom",
    });
  },

  /**
   * Schließt einen Dialog
   * @param id ID des Dialogs
   * @param result Ergebnis für die Promise-Auflösung
   */
  close(id: string, result?: any): void {
    closeDialog(id, { trigger: "api", result });
  },

  /**
   * Schließt alle Dialoge
   */
  closeAll(): void {
    const dialogsToClose = [...state.value.dialogs];
    dialogsToClose.forEach((dialog: any) => {
      closeDialog(dialog.id, { trigger: "api" });
    });
  },

  /**
   * Toggelt den Vollbildmodus eines Dialogs
   * @param id ID des Dialogs
   */
  toggleFullscreen(id: string): void {
    toggleFullscreen(id);
  },

  /**
   * Getter für alle aktiven Dialoge (readonly)
   */
  get dialogs() {
    return readonly(state.value.dialogs);
  },

  /**
   * Getter für den aktiven Dialog (readonly)
   */
  get activeDialog() {
    return readonly(state.value.activeDialog);
  },
};

export default dialogService;
