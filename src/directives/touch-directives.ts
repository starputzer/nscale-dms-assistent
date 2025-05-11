/**
 * Touch-Direktiven für Vue-Komponenten
 *
 * Ermöglicht die einfache Verwendung von Touch-Gesten in Vue-Komponenten.
 * Implementiert die folgenden Gesten:
 * - tap (Standard-Klick)
 * - longPress (Langes Drücken)
 * - swipe (Links, Rechts, Oben, Unten)
 */

import { DirectiveBinding } from "vue";

export interface TouchDirectiveOptions {
  tap?: () => void;
  longPress?: () => void;
  left?: () => void;
  right?: () => void;
  up?: () => void;
  down?: () => void;
  threshold?: number; // Mindestdistanz für Swipe-Erkennung
  longPressTime?: number; // Millisekunden für Long-Press
}

export const vTouch = {
  beforeMount(
    el: HTMLElement,
    binding: DirectiveBinding<TouchDirectiveOptions>,
  ) {
    const options = binding.value || {};

    // Konfigurierbare Optionen
    const threshold = options.threshold || 50;
    const longPressTime = options.longPressTime || 500;

    // Status-Variablen
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let longPressTimer: number | null = null;
    let isTouching = false;
    let isMoving = false;

    // Visuelle Feedback-Klasse
    const activeCls = "v-touch-active";

    // Touch-Start-Handler
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      startTime = Date.now();
      isTouching = true;
      isMoving = false;

      // Long-Press-Timer starten
      if (options.longPress) {
        longPressTimer = window.setTimeout(() => {
          if (isTouching && !isMoving) {
            options.longPress?.();
            isTouching = false; // Verhindert tap nach longPress
          }
        }, longPressTime);
      }

      // Aktiv-Klasse für visuelles Feedback hinzufügen
      el.classList.add(activeCls);
    };

    // Touch-Move-Handler
    const handleTouchMove = (e: TouchEvent) => {
      if (!isTouching) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;

      // Wenn signifikante Bewegung erkannt wird, abbrechen
      if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
        isMoving = true;

        // Long-Press-Timer löschen, da wir uns bewegen
        if (longPressTimer !== null) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      }
    };

    // Touch-End-Handler
    const handleTouchEnd = (e: TouchEvent) => {
      // Aktiv-Klasse entfernen
      el.classList.remove(activeCls);

      // Long-Press-Timer löschen
      if (longPressTimer !== null) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }

      // Wenn nicht mehr touching, abbrechen
      if (!isTouching) return;

      // Position und Zeit berechnen
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      const deltaTime = Date.now() - startTime;

      // Swipe-Gestenerkennung
      if (Math.abs(deltaX) >= threshold || Math.abs(deltaY) >= threshold) {
        // Horizontaler Swipe
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          if (deltaX > 0 && options.right) {
            options.right();
          } else if (deltaX < 0 && options.left) {
            options.left();
          }
        }
        // Vertikaler Swipe
        else {
          if (deltaY > 0 && options.down) {
            options.down();
          } else if (deltaY < 0 && options.up) {
            options.up();
          }
        }
      }
      // Tap-Erkennung (nur wenn keine signifikante Bewegung und kurze Berührung)
      else if (!isMoving && deltaTime < 300 && options.tap) {
        options.tap();
      }

      // Status zurücksetzen
      isTouching = false;
      isMoving = false;
    };

    // Touch-Cancel-Handler
    const handleTouchCancel = () => {
      // Aktiv-Klasse entfernen
      el.classList.remove(activeCls);

      // Long-Press-Timer löschen
      if (longPressTimer !== null) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }

      // Status zurücksetzen
      isTouching = false;
      isMoving = false;
    };

    // Event-Listener registrieren
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: true });
    el.addEventListener("touchend", handleTouchEnd);
    el.addEventListener("touchcancel", handleTouchCancel);

    // Event-Listener-Referenzen für die Bereinigung speichern
    el._touchHandlers = {
      start: handleTouchStart,
      move: handleTouchMove,
      end: handleTouchEnd,
      cancel: handleTouchCancel,
    };
  },

  // Bei Komponenten-Unmount die Event-Listener entfernen
  unmounted(el: HTMLElement) {
    if (!el._touchHandlers) return;

    el.removeEventListener("touchstart", el._touchHandlers.start);
    el.removeEventListener("touchmove", el._touchHandlers.move);
    el.removeEventListener("touchend", el._touchHandlers.end);
    el.removeEventListener("touchcancel", el._touchHandlers.cancel);

    delete el._touchHandlers;
  },
};

// TypeScript-Deklaration für touch-Handler-Eigenschaft
declare global {
  interface HTMLElement {
    _touchHandlers?: {
      start: (e: TouchEvent) => void;
      move: (e: TouchEvent) => void;
      end: (e: TouchEvent) => void;
      cancel: (e: TouchEvent) => void;
    };
  }
}
