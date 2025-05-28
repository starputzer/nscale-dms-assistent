import { ref } from "vue";
import type {
  ClipboardOptions,
  UseClipboardReturn,
} from "../utils/composableTypes";

/**
 * Composable for interacting with the clipboard
 *
 * @param {ClipboardOptions} options - Configuration options for the clipboard
 * @returns {UseClipboardReturn & { copyFromElement: (element: HTMLElement) => Promise<void>, paste: () => Promise<string>, text: Ref<string>, reset: () => void }} Object containing clipboard related methods and state
 *
 * @example
 * const { copy, copied, error } = useClipboard();
 *
 * // Copy text to clipboard
 * function copyText() {
 *   copy('Text to copy')
 *     .then(() => {
 *       toastService.success('Copied to clipboard!');
 *     })
 *     .catch((err) => {
 *       toastService.error('Failed to copy: ' + err.message);
 *     });
 * }
 *
 * // Use with template refs
 * const { copyFromElement, copied } = useClipboard({ timeout: 2000 });
 * const elementRef = ref<HTMLElement | null>(null);
 *
 * function copyFromRef() {
 *   if (elementRef.value) {
 *     copyFromElement(elementRef.value);
 *   }
 * }
 */
export function useClipboard(
  options: ClipboardOptions = { successDuration: 1500 },
): UseClipboardReturn & {
  copyFromElement: (element: HTMLElement) => Promise<void>;
  paste: () => Promise<string>;
  text: Ref<string>;
  reset: () => void;
} {
  const { successDuration: timeout = 1500 } = options;

  // State
  const copied = ref(false);
  const error = ref<Error | null>(null);
  const text = ref("");

  // Reset states and errors
  const reset = () => {
    copied.value = false;
    error.value = null;
  };

  // Handle successful copy
  const handleSuccess = (value: string) => {
    copied.value = true;
    text.value = value;
    error.value = null;

    if (timeout) {
      setTimeout(() => {
        copied.value = false;
      }, timeout);
    }
  };

  // Handle copy error
  const handleError = (err: Error) => {
    copied.value = false;
    error.value = err;

    if (timeout) {
      setTimeout(() => {
        error.value = null;
      }, timeout);
    }

    throw err;
  };

  /**
   * Copy text to clipboard
   * @param value - Text to copy
   * @returns Promise that resolves when copying is complete
   */
  const copy = async (value: string): Promise<void> => {
    reset();

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        // Modern API
        await navigator.clipboard.writeText(value);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = value;

        // Make the textarea out of viewport
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);

        textArea.focus();
        textArea.select();

        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);

        if (!successful) {
          throw new Error("Failed to copy text using execCommand.");
        }
      }

      handleSuccess(value);
    } catch (err) {
      handleError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  /**
   * Copy text from an element
   * @param element - Element to copy text from
   * @returns Promise that resolves when copying is complete
   */
  const copyFromElement = async (element: HTMLElement): Promise<void> => {
    reset();

    try {
      // Get text content from element
      const value = element.innerText || element.textContent || "";

      await copy(value);
    } catch (err) {
      handleError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  /**
   * Read text from clipboard
   * @returns Promise that resolves with clipboard text
   */
  const paste = async (): Promise<string> => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const value = await navigator.clipboard.readText();
        text.value = value;
        return value;
      } else {
        throw new Error("Clipboard reading not supported in this browser.");
      }
    } catch (err) {
      handleError(err instanceof Error ? err : new Error(String(err)));
      return "";
    }
  };

  return {
    copy,
    copyFromElement,
    paste,
    copied,
    text,
    error,
    reset,
  };
}

export default useClipboard;
