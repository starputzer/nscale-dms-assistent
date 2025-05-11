/**
 * Mobile Focus Manager
 *
 * Provides utilities for improved focus management on mobile and touch devices
 * to create better touch interactions and accessibility
 */

import { ref, onMounted, onUnmounted } from "vue";

/**
 * Hook to detect touch and keyboard interactions and provide appropriate focus styling
 */
export function useTouchFocusManager() {
  // State to track current input method
  const usingTouch = ref(false);
  const usingKeyboard = ref(false);

  /**
   * Detect if the device has touch capabilities
   */
  const hasTouchCapability = ref(false);

  /**
   * Add the appropriate classes to the body for styling
   */
  function updateBodyClasses() {
    if (usingTouch.value) {
      document.body.classList.add("using-touch");
      document.body.classList.remove("using-keyboard");
    } else if (usingKeyboard.value) {
      document.body.classList.add("using-keyboard");
      document.body.classList.remove("using-touch");
    }
  }

  /**
   * Handle touch events
   */
  function handleTouch() {
    usingTouch.value = true;
    usingKeyboard.value = false;
    updateBodyClasses();
  }

  /**
   * Handle keyboard events
   */
  function handleKeyboard(event: KeyboardEvent) {
    // Only consider Tab key as keyboard navigation
    if (event.key === "Tab") {
      usingTouch.value = false;
      usingKeyboard.value = true;
      updateBodyClasses();
    }
  }

  /**
   * Setup event listeners on component mount
   */
  onMounted(() => {
    // Detect touch capability
    hasTouchCapability.value =
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      (navigator as any).msMaxTouchPoints > 0;

    // Set initial state based on device capability
    if (hasTouchCapability.value) {
      usingTouch.value = true;
      updateBodyClasses();
    }

    // Listen for touch events
    document.addEventListener("touchstart", handleTouch, { passive: true });
    document.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "touch") handleTouch();
    });

    // Listen for keyboard events
    document.addEventListener("keydown", handleKeyboard);
  });

  /**
   * Clean up event listeners on component unmount
   */
  onUnmounted(() => {
    document.removeEventListener("touchstart", handleTouch);
    document.removeEventListener("pointerdown", (e) => {
      if (e.pointerType === "touch") handleTouch();
    });
    document.removeEventListener("keydown", handleKeyboard);
  });

  return {
    usingTouch,
    usingKeyboard,
    hasTouchCapability,
  };
}

/**
 * Returns true if the current device has touch capabilities
 */
export function isTouchDevice(): boolean {
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  );
}

/**
 * Determines if a key event is a navigation key (Tab, arrows, etc.)
 */
export function isNavigationKey(key: string): boolean {
  const navigationKeys = [
    "Tab",
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "Home",
    "End",
    "PageUp",
    "PageDown",
  ];
  return navigationKeys.includes(key);
}

/**
 * Initializes the global input detection for the application
 * This should be called once at the application startup
 */
export function initializeInputDetection(): void {
  // Touch detection
  document.addEventListener(
    "touchstart",
    () => {
      document.body.classList.add("using-touch");
      document.body.classList.remove("using-keyboard");
    },
    { passive: true },
  );

  // Keyboard detection
  document.addEventListener("keydown", (event) => {
    if (isNavigationKey(event.key)) {
      document.body.classList.add("using-keyboard");
      document.body.classList.remove("using-touch");
    }
  });
}

/**
 * Apply these CSS rules in your global stylesheet:
 *
 * body.using-touch *:focus {
 *   outline: none !important;
 * }
 *
 * body.using-keyboard *:focus {
 *   outline: 2px solid #4a6cf7 !important;
 *   outline-offset: 2px !important;
 * }
 */
