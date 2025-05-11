/**
 * Mobile Focus Management Composable
 *
 * Provides a Vue composable for improved focus management on mobile and touch devices
 */

import { ref, computed, onMounted, onUnmounted } from "vue";

/**
 * Composable for managing focus on mobile devices
 *
 * Detects touch vs keyboard input methods and helps components
 * adapt their focus styles appropriately
 */
export function useMobileFocus() {
  // State to track current input method
  const usingTouch = ref(false);
  const usingKeyboard = ref(false);

  // Detect if the device has touch capabilities
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
    document.addEventListener("pointerdown", (e: PointerEvent) => {
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
    document.removeEventListener("pointerdown", (e: PointerEvent) => {
      if (e.pointerType === "touch") handleTouch();
    });
    document.removeEventListener("keydown", handleKeyboard);
  });

  return {
    usingTouch,
    usingKeyboard,
    hasTouchCapability,

    /**
     * Add touch-target class to an element to make it touch-friendly
     * This class provides a minimum size of 44x44px
     *
     * @example
     * <button :class="{ 'touch-target': hasTouchCapability }">Click me</button>
     */
    touchTargetClass: computed(() =>
      hasTouchCapability.value ? "touch-target" : "",
    ),
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
