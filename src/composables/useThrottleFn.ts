import { ref } from "vue";

/**
 * Optimierter Composable zur Drosselung (Throttling) von Funktionsaufrufen
 * mit Unterstützung für leading/trailing und adaptive Raten
 *
 * @param fn - Die zu drosselnde Funktion
 * @param delay - Verzögerung in Millisekunden
 * @param options - Konfigurationsoptionen für das Throttling-Verhalten
 * @returns Gedrosselte Funktion
 */
export function useThrottleFn<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 200,
  options: {
    leading?: boolean; // Ausführung beim ersten Aufruf
    trailing?: boolean; // Ausführung am Ende des Throttle-Intervalls
    maxWait?: number; // Maximale Wartezeit erzwungen
  } = { leading: true, trailing: true },
): T {
  const { leading = true, trailing = true, maxWait = delay * 5 } = options;

  const lastExec = ref(0);
  const timeout = ref<number | null>(null);
  const lastThis = ref<any>(null);
  const lastArgs = ref<any[]>([]);
  const lastInvoke = ref(0);

  // Bereinigungsfunktion
  function cleanup() {
    if (timeout.value !== null) {
      clearTimeout(timeout.value);
      timeout.value = null;
    }
  }

  // Ausführungsfunktion
  function invoke(time: number) {
    const thisArg = lastThis.value;
    const args = lastArgs.value;

    lastThis.value = null;
    lastArgs.value = [];
    lastExec.value = time;
    lastInvoke.value = time;

    return fn.apply(thisArg, args);
  }

  // Timeout-Setter-Funktion
  function startTimer(pendingFunc: () => void, wait: number): number {
    return window.setTimeout(pendingFunc, wait);
  }

  // Timer-Management und Ausführungsfunktion
  function timerExpired() {
    const time = Date.now();

    // Prüfen, ob der Timer für eine verzögerte Ausführung ausgelöst werden soll
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }

    // Andernfalls neuen Timer starten
    timeout.value = startTimer(timerExpired, remainingWait(time));
  }

  // Funktion, um zu prüfen, ob wir die Funktion aufrufen sollten
  function shouldInvoke(time: number): boolean {
    const timeSinceLastExec = time - lastExec.value;
    const timeSinceLastInvoke = time - lastInvoke.value;

    // Erste Ausführung oder Zeit verstrichen oder maximale Wartezeit überschritten
    return (
      lastExec.value === 0 || // Erste Ausführung
      timeSinceLastExec >= delay || // Normale Drosselungsperiode vorbei
      timeSinceLastInvoke >= maxWait // Maximale Wartezeit überschritten
    );
  }

  // Leading-Edge Ausführungsfunktion
  function leadingEdge(time: number) {
    lastInvoke.value = time;

    // Timer für die verzögerte Ausführung starten
    timeout.value = startTimer(timerExpired, delay);

    // Sofort ausführen, wenn leading aktiviert ist
    return leading ? invoke(time) : undefined;
  }

  // Trailing-Edge Ausführungsfunktion
  function trailingEdge(time: number) {
    timeout.value = null;

    // Nur ausführen, wenn trailing aktiviert ist und Argumente vorhanden sind
    if (trailing && lastArgs.value.length) {
      return invoke(time);
    }

    lastThis.value = null;
    lastArgs.value = [];

    return undefined;
  }

  // Berechnet die verbleibende Wartezeit
  function remainingWait(time: number): number {
    const timeSinceLastExec = time - lastExec.value;
    const timeSinceLastInvoke = time - lastInvoke.value;
    const timeUntilTrailing = delay - timeSinceLastExec;

    // Adaptives Throttling für bessere Leistung bei häufigen Events
    if (timeSinceLastInvoke < delay / 4) {
      // Bei schnellen Aufrufen die Throttling-Rate erhöhen (weniger häufig ausführen)
      return Math.min(timeUntilTrailing, delay * 1.5);
    }

    return Math.min(timeUntilTrailing, maxWait - timeSinceLastInvoke);
  }

  // Typensichere Wrapper-Funktion
  const throttled = function (this: any, ...args: any[]) {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastThis.value = this;
    lastArgs.value = args;

    // Wenn wir die Funktion aufrufen sollten
    if (isInvoking) {
      if (timeout.value === null) {
        return leadingEdge(time);
      }

      if (maxWait !== delay) {
        // Alten Timer löschen und neuen starten
        cleanup();
        return leadingEdge(time);
      }
    }

    // Sicherstellen, dass ein Timer läuft, wenn er benötigt wird
    if (timeout.value === null) {
      timeout.value = startTimer(timerExpired, delay);
    }

    return undefined;
  } as T;

  return throttled;
}
