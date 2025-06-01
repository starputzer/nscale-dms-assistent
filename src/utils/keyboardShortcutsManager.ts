/**
 * Keyboard Shortcuts Manager
 *
 * A central utility for managing keyboard shortcuts in the application.
 * Provides consistent handling of keyboard shortcuts across components.
 */

import { ref, onMounted, onUnmounted } from "vue";
import { useSettings } from "@/composables/useSettings";

export interface ShortcutDefinition {
  /** Unique ID for the shortcut */
  id: string;
  /** Display name for the shortcut (for help screens) */
  name: string;
  /** Component or context where the shortcut applies */
  context: string;
  /** Key to trigger the shortcut (e.g., 'a', 'Enter', 'ArrowUp') */
  key: string;
  /** Key modifiers (Alt, Ctrl, Shift, Meta) */
  modifiers?: {
    alt?: boolean;
    ctrl?: boolean;
    shift?: boolean;
    meta?: boolean;
  };
  /** Description of what the shortcut does */
  description: string;
  /** Handler function to call when shortcut is triggered */
  handler: () => void;
  /** Whether shortcut is global (works everywhere) or context-specific */
  global?: boolean;
  /** Whether shortcut should work in input fields */
  worksInInputs?: boolean;
}

// Singleton to track all registered shortcuts
const registeredShortcuts = ref<ShortcutDefinition[]>([]);
const activeContext = ref<string | null>(null);

/**
 * Register a new keyboard shortcut
 * @param shortcut - Shortcut definition
 * @returns Unregister function to remove the shortcut
 */
export function registerShortcut(shortcut: ShortcutDefinition): () => void {
  // Add to registry
  registeredShortcuts.value.push(shortcut);

  // Return unregister function
  return () => {
    const index = registeredShortcuts.value.findIndex(
      (s) => s.id === shortcut.id,
    );
    if (index !== -1) {
      registeredShortcuts.value.splice(index, 1);
    }
  };
}

/**
 * Set the current active context for context-specific shortcuts
 * @param context - Active context name
 */
export function setShortcutContext(context: string | null): void {
  activeContext.value = context;
}

/**
 * Check if a keyboard event matches a shortcut definition
 * @param event - Keyboard event
 * @param shortcut - Shortcut definition
 * @returns Whether the event matches the shortcut
 */
function matchesShortcut(
  event: KeyboardEvent,
  shortcut: ShortcutDefinition,
): boolean {
  // Check the main key
  if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) {
    return false;
  }

  // If no modifiers specified, assume none required
  const modifiers = shortcut.modifiers || {
    alt: false,
    ctrl: false,
    shift: false,
    meta: false,
  };

  // Check modifiers
  if (modifiers.alt !== undefined && event.altKey !== modifiers.alt)
    return false;
  if (modifiers.ctrl !== undefined && event.ctrlKey !== modifiers.ctrl)
    return false;
  if (modifiers.shift !== undefined && event.shiftKey !== modifiers.shift)
    return false;
  if (modifiers.meta !== undefined && event.metaKey !== modifiers.meta)
    return false;

  return true;
}

/**
 * Handle keyboard events and trigger matching shortcuts
 * @param event - Keyboard event
 */
function handleKeyDown(event: KeyboardEvent): void {
  const { settings } = useSettings();

  // Skip if keyboard shortcuts are disabled in settings
  if (settings.value?.enableKeyboardShortcuts === false) {
    return;
  }

  // Skip if target is an input/textarea and shortcut doesn't work in inputs
  const isInputElement =
    event.target instanceof HTMLInputElement ||
    event.target instanceof HTMLTextAreaElement ||
    (event.target as HTMLElement)?.isContentEditable;

  // Find matching shortcuts
  const matchingShortcuts = registeredShortcuts.value.filter((shortcut: any) => {
    // Skip if shortcut doesn't work in inputs
    if (isInputElement && !shortcut.worksInInputs) {
      return false;
    }

    // Skip if shortcut is context-specific and not in the active context
    if (!shortcut.global && shortcut.context !== activeContext.value) {
      return false;
    }

    // Check if key and modifiers match
    return matchesShortcut(event, shortcut);
  });

  // Execute matching shortcuts
  if (matchingShortcuts.length > 0) {
    event.preventDefault();

    // Execute all matching shortcuts (usually just one)
    matchingShortcuts.forEach((shortcut: any) => {
      shortcut.handler();
    });
  }
}

/**
 * Use keyboard shortcuts system in a Vue component
 * @returns Utilities for working with keyboard shortcuts
 */
export function useKeyboardShortcuts() {
  onMounted(() => {
    document.addEventListener("keydown", handleKeyDown);
  });

  onUnmounted(() => {
    document.removeEventListener("keydown", handleKeyDown);
  });

  return {
    registerShortcut,
    setShortcutContext,
    getShortcuts: () => registeredShortcuts.value,
  };
}

/**
 * Predefined shortcut groups for common actions
 */
export const SHORTCUT_CONTEXTS = {
  GLOBAL: "global",
  CHAT: "chat",
  DOCUMENT_CONVERTER: "document-converter",
  ADMIN: "admin",
  SETTINGS: "settings",
};

/**
 * Helper to format a keyboard shortcut for display
 * @param shortcut - Shortcut definition
 * @returns Formatted shortcut string (e.g., "Ctrl+Alt+S")
 */
export function formatShortcut(shortcut: ShortcutDefinition): string {
  const parts: string[] = [];

  if (shortcut.modifiers?.ctrl) parts.push("Ctrl");
  if (shortcut.modifiers?.alt) parts.push("Alt");
  if (shortcut.modifiers?.shift) parts.push("Shift");
  if (shortcut.modifiers?.meta) parts.push("Meta");

  // Convert keys to readable format
  let key = shortcut.key;
  switch (key) {
    case " ":
      key = "Space";
      break;
    case "ArrowUp":
      key = "↑";
      break;
    case "ArrowDown":
      key = "↓";
      break;
    case "ArrowLeft":
      key = "←";
      break;
    case "ArrowRight":
      key = "→";
      break;
    case "Escape":
      key = "Esc";
      break;
    default:
      // Capitalize single letter keys
      if (key.length === 1) {
        key = key.toUpperCase();
      }
  }

  parts.push(key);

  return parts.join("+");
}
