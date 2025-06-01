import { ref, shallowRef } from "vue";

export type DialogType =
  | "info"
  | "warning"
  | "error"
  | "success"
  | "confirm"
  | "input";

export interface DialogOptions {
  title?: string;
  message: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  showCancelButton?: boolean;
  type?: DialogType;
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
}

export interface InputDialogOptions extends Omit<DialogOptions, "type"> {
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
 * Dialog-Service für die nscale DMS Assistent Anwendung
 * Stellt Methoden zum Anzeigen von benutzerdefinierten Dialog-Komponenten bereit
 * und ersetzt die nativen Browser-Dialoge
 */
export function useDialog() {
  const isVisible = ref(false);
  const dialogType = ref<DialogType>("info");
  const dialogTitle = ref("");
  const dialogMessage = ref("");
  const confirmButtonText = ref("OK");
  const cancelButtonText = ref("Abbrechen");
  const showCancelButton = ref(true);

  // Input-Dialog-spezifische Eigenschaften
  const inputLabel = ref("Eingabe");
  const inputType = ref("text");
  const placeholder = ref("");
  const defaultValue = ref("");
  const minLength = ref(0);
  const maxLength = ref(256);
  const required = ref(true);
  const validationMessage = ref("Bitte geben Sie einen gültigen Wert ein.");
  const validator = shallowRef<((value: string) => boolean | string) | null>(
    null,
  );

  // Referenzen für die Callbacks
  const confirmCallback = shallowRef<(() => void) | null>(null);
  const cancelCallback = shallowRef<(() => void) | null>(null);
  const closeCallback = shallowRef<(() => void) | null>(null);
  const inputConfirmCallback = shallowRef<((value: string) => void) | null>(
    null,
  );

  /**
   * Zeigt einen Bestätigungsdialog an
   * @param options Dialog-Konfiguration
   * @returns Ein Promise, das aufgelöst wird, wenn der Benutzer bestätigt
   */
  const confirm = (options: string | DialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      // Dialog-Parameter konfigurieren
      if (typeof options === "string") {
        dialogMessage.value = options;
        dialogTitle.value = "Bestätigung";
        dialogType.value = "confirm";
        confirmButtonText.value = "Bestätigen";
      } else {
        dialogMessage.value = options.message;
        dialogTitle.value = options.title || "Bestätigung";
        dialogType.value = options.type || "confirm";
        confirmButtonText.value = options.confirmButtonText || "Bestätigen";
        cancelButtonText.value = options.cancelButtonText || "Abbrechen";
        showCancelButton.value = options.showCancelButton !== false;
        confirmCallback.value = options.onConfirm || null;
        cancelCallback.value = options.onCancel || null;
        closeCallback.value = options.onClose || null;
      }

      // Referenzen für die Promise-Auflösung speichern
      const handleConfirm = () => {
        if (confirmCallback.value) confirmCallback.value();
        if (closeCallback.value) closeCallback.value();
        resolve(true);
      };

      const handleCancel = () => {
        if (cancelCallback.value) cancelCallback.value();
        if (closeCallback.value) closeCallback.value();
        resolve(false);
      };

      confirmCallback.value = handleConfirm;
      cancelCallback.value = handleCancel;

      // Dialog anzeigen
      isVisible.value = true;
    });
  };

  /**
   * Zeigt einen Info-Dialog an
   * @param options Dialog-Konfiguration oder Nachrichtentext
   */
  const info = (
    options: string | Omit<DialogOptions, "type">,
  ): Promise<boolean> => {
    if (typeof options === "string") {
      return confirm({
        message: options,
        title: "Information",
        type: "info",
        confirmButtonText: "OK",
        showCancelButton: false,
      });
    }

    return confirm({
      ...options,
      type: "info",
      showCancelButton: options.showCancelButton === true,
    });
  };

  /**
   * Zeigt einen Warnungs-Dialog an
   * @param options Dialog-Konfiguration oder Nachrichtentext
   */
  const warning = (
    options: string | Omit<DialogOptions, "type">,
  ): Promise<boolean> => {
    if (typeof options === "string") {
      return confirm({
        message: options,
        title: "Warnung",
        type: "warning",
        confirmButtonText: "OK",
      });
    }

    return confirm({
      ...options,
      type: "warning",
    });
  };

  /**
   * Zeigt einen Fehler-Dialog an
   * @param options Dialog-Konfiguration oder Nachrichtentext
   */
  const error = (
    options: string | Omit<DialogOptions, "type">,
  ): Promise<boolean> => {
    if (typeof options === "string") {
      return confirm({
        message: options,
        title: "Fehler",
        type: "error",
        confirmButtonText: "OK",
        showCancelButton: false,
      });
    }

    return confirm({
      ...options,
      type: "error",
      showCancelButton: options.showCancelButton === true,
    });
  };

  /**
   * Zeigt einen Erfolgs-Dialog an
   * @param options Dialog-Konfiguration oder Nachrichtentext
   */
  const success = (
    options: string | Omit<DialogOptions, "type">,
  ): Promise<boolean> => {
    if (typeof options === "string") {
      return confirm({
        message: options,
        title: "Erfolg",
        type: "success",
        confirmButtonText: "OK",
        showCancelButton: false,
      });
    }

    return confirm({
      ...options,
      type: "success",
      showCancelButton: options.showCancelButton === true,
    });
  };

  /**
   * Schließt den aktuell angezeigten Dialog
   */
  const close = () => {
    isVisible.value = false;

    // Callbacks zurücksetzen
    confirmCallback.value = null;
    cancelCallback.value = null;
    closeCallback.value = null;
  };

  // Event-Handler für die Dialog-Komponente
  const handleConfirm = () => {
    if (confirmCallback.value) confirmCallback.value();
    close();
  };

  const handleCancel = () => {
    if (cancelCallback.value) cancelCallback.value();
    close();
  };

  /**
   * Zeigt einen Input-Dialog an
   * @param options Dialog-Konfiguration
   * @returns Ein Promise, das mit dem eingegebenen Wert aufgelöst wird, wenn der Benutzer bestätigt
   */
  const prompt = (
    options: string | InputDialogOptions,
  ): Promise<string | null> => {
    return new Promise((resolve) => {
      // Dialog-Parameter konfigurieren
      if (typeof options === "string") {
        dialogMessage.value = options;
        dialogTitle.value = "Eingabe";
        dialogType.value = "input";
        confirmButtonText.value = "Bestätigen";
        inputLabel.value = "Eingabe";
        inputType.value = "text";
        placeholder.value = "";
        defaultValue.value = "";
        minLength.value = 0;
        maxLength.value = 256;
        required.value = true;
        validationMessage.value = "Bitte geben Sie einen gültigen Wert ein.";
        validator.value = null;
      } else {
        dialogMessage.value = options.message;
        dialogTitle.value = options.title || "Eingabe";
        dialogType.value = "input";
        confirmButtonText.value = options.confirmButtonText || "Bestätigen";
        cancelButtonText.value = options.cancelButtonText || "Abbrechen";
        showCancelButton.value = options.showCancelButton !== false;

        // Input-spezifische Optionen
        inputLabel.value = options.inputLabel || "Eingabe";
        inputType.value = options.inputType || "text";
        placeholder.value = options.placeholder || "";
        defaultValue.value = options.defaultValue || "";
        minLength.value = options.minLength || 0;
        maxLength.value = options.maxLength || 256;
        required.value = options.required !== false;
        validationMessage.value =
          options.validationMessage ||
          "Bitte geben Sie einen gültigen Wert ein.";
        validator.value = options.validator || null;

        // Callbacks
        cancelCallback.value = options.onCancel || null;
        closeCallback.value = options.onClose || null;
        inputConfirmCallback.value = options.onConfirm || null;
      }

      // Referenzen für die Promise-Auflösung speichern
      const handleInputConfirm = (value: string) => {
        if (inputConfirmCallback.value) inputConfirmCallback.value(value);
        if (closeCallback.value) closeCallback.value();
        resolve(value);
      };

      const handleInputCancel = () => {
        if (cancelCallback.value) cancelCallback.value();
        if (closeCallback.value) closeCallback.value();
        resolve(null);
      };

      inputConfirmCallback.value = handleInputConfirm;
      cancelCallback.value = handleInputCancel;

      // Dialog anzeigen
      isVisible.value = true;
    });
  };

  // Event-Handler für die Input-Dialog-Komponente
  const handleInputConfirm = (value: string) => {
    if (inputConfirmCallback.value) inputConfirmCallback.value(value);
    close();
  };

  return {
    // Status
    isVisible,
    dialogType,
    dialogTitle,
    dialogMessage,
    confirmButtonText,
    cancelButtonText,
    showCancelButton,

    // Input-Dialog-Eigenschaften
    inputLabel,
    inputType,
    placeholder,
    defaultValue,
    minLength,
    maxLength,
    required,
    validationMessage,
    validator,

    // Methoden
    confirm,
    info,
    warning,
    error,
    success,
    prompt,
    close,

    // Event-Handler
    handleConfirm,
    handleCancel,
    handleInputConfirm,
  };
}

// Globale Singleton-Instanz
let globalDialogInstance: ReturnType<typeof useDialog> | null = null;

/**
 * Globaler Dialog-Service, der eine Singleton-Instanz verwendet
 * Kann ohne Komponenten-Setup direkt verwendet werden
 */
export function useGlobalDialog() {
  // Lazy-Initialisierung der Singleton-Instanz
  if (!globalDialogInstance) {
    globalDialogInstance = useDialog();
  }

  return globalDialogInstance;
}

export default useDialog;
