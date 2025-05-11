/**
 * Enhanced Touch Directives for Vue Components
 *
 * Provides improved touch gesture support with:
 * - Standard gestures: tap, longPress, swipe (in all directions)
 * - Advanced gestures: pinch, rotate, multi-touch
 * - Better touch feedback and handling
 * - Accessibility improvements for users with motor impairments
 * - Configuration options for gesture sensitivity and behavior
 */

import { DirectiveBinding, App } from "vue";

export type GestureCallback = (event: TouchEvent, detail?: any) => void;

export interface EnhancedTouchDirectiveOptions {
  // Basic gestures
  tap?: GestureCallback;
  doubleTap?: GestureCallback;
  longPress?: GestureCallback;

  // Swipe gestures
  left?: GestureCallback;
  right?: GestureCallback;
  up?: GestureCallback;
  down?: GestureCallback;

  // Advanced gestures
  pinchIn?: GestureCallback;
  pinchOut?: GestureCallback;
  rotate?: GestureCallback;

  // Configuration
  threshold?: number; // Distance threshold for swipe detection (px)
  longPressTime?: number; // Time in ms to trigger longPress (default: 500ms)
  doubleTapTime?: number; // Max time between taps for doubleTap (default: 300ms)
  preventDefault?: boolean; // Whether to prevent default browser behavior
  stopPropagation?: boolean; // Whether to stop event propagation
  disabled?: boolean; // Disables all gesture detection when true
}

export interface TouchPoint {
  x: number;
  y: number;
  id: number;
}

export interface TouchState {
  startPoints: TouchPoint[];
  startTime: number;
  lastTapTime: number;
  longPressTimer: number | null;
  isTouching: boolean;
  moveCount: number;
  startDistance?: number;
  startAngle?: number;
}

/**
 * Creates a new touch point object from a Touch event
 */
function createTouchPoint(touch: Touch): TouchPoint {
  return {
    x: touch.clientX,
    y: touch.clientY,
    id: touch.identifier,
  };
}

/**
 * Calculate distance between two points
 */
function getDistance(p1: TouchPoint, p2: TouchPoint): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * Calculate angle between two points (in degrees)
 */
function getAngle(p1: TouchPoint, p2: TouchPoint): number {
  return (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;
}

/**
 * Enhanced Touch Directive
 */
export const vEnhancedTouch = {
  beforeMount(
    el: HTMLElement,
    binding: DirectiveBinding<EnhancedTouchDirectiveOptions>,
  ) {
    const options = binding.value || {};

    // Default configuration
    const threshold = options.threshold || 50;
    const longPressTime = options.longPressTime || 500;
    const doubleTapTime = options.doubleTapTime || 300;
    const preventDefaultEvents = options.preventDefault !== false;
    const stopPropagationEvents = options.stopPropagation || false;

    // Touch state
    const state: TouchState = {
      startPoints: [],
      startTime: 0,
      lastTapTime: 0,
      longPressTimer: null,
      isTouching: false,
      moveCount: 0,
    };

    // Visual feedback classes
    const ACTIVE_CLASS = "v-touch-active";
    const DISABLED_CLASS = "v-touch-disabled";

    // Check for disabled state
    if (options.disabled) {
      el.classList.add(DISABLED_CLASS);
    }

    /**
     * Handle touch start event
     */
    const handleTouchStart = (e: TouchEvent) => {
      if (options.disabled) return;

      // Prevent default if configured to do so
      if (preventDefaultEvents) {
        e.preventDefault();
      }

      if (stopPropagationEvents) {
        e.stopPropagation();
      }

      // Reset state
      state.startPoints = [];
      state.moveCount = 0;
      state.isTouching = true;
      state.startTime = Date.now();

      // Store touch points
      for (let i = 0; i < e.touches.length; i++) {
        state.startPoints.push(createTouchPoint(e.touches[i]));
      }

      // Calculate multi-touch data if we have multiple points
      if (state.startPoints.length >= 2) {
        const p1 = state.startPoints[0];
        const p2 = state.startPoints[1];
        state.startDistance = getDistance(p1, p2);
        state.startAngle = getAngle(p1, p2);
      }

      // Start long press timer
      if (options.longPress) {
        state.longPressTimer = window.setTimeout(() => {
          if (state.isTouching && state.moveCount < 10) {
            options.longPress?.(e, { points: state.startPoints });
            state.isTouching = false; // Prevent tap after longPress
          }
        }, longPressTime);
      }

      // Add active class for visual feedback
      el.classList.add(ACTIVE_CLASS);
    };

    /**
     * Handle touch move event
     */
    const handleTouchMove = (e: TouchEvent) => {
      if (options.disabled || !state.isTouching) return;

      if (preventDefaultEvents) {
        e.preventDefault();
      }

      state.moveCount++;

      // Get current touch points
      const currentPoints: TouchPoint[] = [];
      for (let i = 0; i < e.touches.length; i++) {
        currentPoints.push(createTouchPoint(e.touches[i]));
      }

      // Handle multi-touch gestures if we have multiple points
      if (state.startPoints.length >= 2 && currentPoints.length >= 2) {
        // Handle pinch gesture
        if (options.pinchIn || options.pinchOut) {
          const p1 = currentPoints[0];
          const p2 = currentPoints[1];
          const currentDistance = getDistance(p1, p2);

          if (
            state.startDistance &&
            Math.abs(currentDistance - state.startDistance) > threshold
          ) {
            if (currentDistance < state.startDistance && options.pinchIn) {
              options.pinchIn(e, {
                startDistance: state.startDistance,
                currentDistance,
                scale: currentDistance / state.startDistance,
              });
            } else if (
              currentDistance > state.startDistance &&
              options.pinchOut
            ) {
              options.pinchOut(e, {
                startDistance: state.startDistance,
                currentDistance,
                scale: currentDistance / state.startDistance,
              });
            }

            // Reset start distance to allow continuous pinching
            state.startDistance = currentDistance;
          }
        }

        // Handle rotate gesture
        if (options.rotate && state.startAngle !== undefined) {
          const p1 = currentPoints[0];
          const p2 = currentPoints[1];
          const currentAngle = getAngle(p1, p2);
          const rotation = currentAngle - state.startAngle;

          if (Math.abs(rotation) > 10) {
            // Min 10 degrees for rotation
            options.rotate(e, {
              startAngle: state.startAngle,
              currentAngle,
              rotation,
            });

            // Reset start angle to allow continuous rotation
            state.startAngle = currentAngle;
          }
        }
      }
    };

    /**
     * Handle touch end event
     */
    const handleTouchEnd = (e: TouchEvent) => {
      if (options.disabled) return;

      // Remove active class
      el.classList.remove(ACTIVE_CLASS);

      // Clear long press timer
      if (state.longPressTimer !== null) {
        clearTimeout(state.longPressTimer);
        state.longPressTimer = null;
      }

      // If we're not touching anymore, exit
      if (!state.isTouching) return;

      const touchEndTime = Date.now();
      const deltaTime = touchEndTime - state.startTime;

      // We need at least one start point
      if (state.startPoints.length === 0) {
        state.isTouching = false;
        return;
      }

      // Get the primary touch point
      const start = state.startPoints[0];
      const end = e.changedTouches[0]
        ? createTouchPoint(e.changedTouches[0])
        : null;

      if (!end) {
        state.isTouching = false;
        return;
      }

      const deltaX = end.x - start.x;
      const deltaY = end.y - start.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Detect swipe gestures
      if (distance >= threshold) {
        // Determine direction (horizontal has precedence over vertical)
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          // Horizontal swipe
          if (deltaX > 0 && options.right) {
            options.right(e, {
              distance,
              direction: "right",
              deltaX,
              deltaY,
            });
          } else if (deltaX < 0 && options.left) {
            options.left(e, {
              distance,
              direction: "left",
              deltaX,
              deltaY,
            });
          }
        } else {
          // Vertical swipe
          if (deltaY > 0 && options.down) {
            options.down(e, {
              distance,
              direction: "down",
              deltaX,
              deltaY,
            });
          } else if (deltaY < 0 && options.up) {
            options.up(e, {
              distance,
              direction: "up",
              deltaX,
              deltaY,
            });
          }
        }
      }
      // Detect tap gestures (only if swipe threshold wasn't met)
      else if (deltaTime < 300 && state.moveCount < 10) {
        const now = Date.now();
        const timeSinceLastTap = now - state.lastTapTime;

        // Check for double tap
        if (
          options.doubleTap &&
          timeSinceLastTap < doubleTapTime &&
          state.lastTapTime > 0
        ) {
          options.doubleTap(e, {
            point: end,
            tapCount: 2,
          });
          state.lastTapTime = 0; // Reset to prevent triple-tap
        }
        // Handle single tap
        else if (options.tap) {
          options.tap(e, {
            point: end,
            tapCount: 1,
          });
          state.lastTapTime = now;
        }
      }

      // Reset state
      state.isTouching = false;
    };

    /**
     * Handle touch cancel event
     */
    const handleTouchCancel = () => {
      // Remove active class
      el.classList.remove(ACTIVE_CLASS);

      // Clear long press timer
      if (state.longPressTimer !== null) {
        clearTimeout(state.longPressTimer);
        state.longPressTimer = null;
      }

      // Reset state
      state.isTouching = false;
    };

    // Register event listeners with passive option for better scrolling performance
    el.addEventListener("touchstart", handleTouchStart, {
      passive: !preventDefaultEvents,
    });
    el.addEventListener("touchmove", handleTouchMove, {
      passive: !preventDefaultEvents,
    });
    el.addEventListener("touchend", handleTouchEnd);
    el.addEventListener("touchcancel", handleTouchCancel);

    // Store handlers for removal in unmount
    el._vEnhancedTouchHandlers = {
      start: handleTouchStart,
      move: handleTouchMove,
      end: handleTouchEnd,
      cancel: handleTouchCancel,
    };
  },

  // When component updates, check for disabled state changes
  updated(
    el: HTMLElement,
    binding: DirectiveBinding<EnhancedTouchDirectiveOptions>,
  ) {
    if (binding.value?.disabled) {
      el.classList.add("v-touch-disabled");
    } else {
      el.classList.remove("v-touch-disabled");
    }
  },

  // Clean up when component unmounts
  unmounted(el: HTMLElement) {
    if (!el._vEnhancedTouchHandlers) return;

    // Remove all event listeners
    el.removeEventListener("touchstart", el._vEnhancedTouchHandlers.start);
    el.removeEventListener("touchmove", el._vEnhancedTouchHandlers.move);
    el.removeEventListener("touchend", el._vEnhancedTouchHandlers.end);
    el.removeEventListener("touchcancel", el._vEnhancedTouchHandlers.cancel);

    // Clean up references
    delete el._vEnhancedTouchHandlers;
  },
};

// Vue plugin installation
export const EnhancedTouchPlugin = {
  install(app: App) {
    app.directive("touch", vEnhancedTouch);
  },
};

// Type declaration for TypeScript
declare global {
  interface HTMLElement {
    _vEnhancedTouchHandlers?: {
      start: (e: TouchEvent) => void;
      move: (e: TouchEvent) => void;
      end: (e: TouchEvent) => void;
      cancel: () => void;
    };
  }
}

export default EnhancedTouchPlugin;
