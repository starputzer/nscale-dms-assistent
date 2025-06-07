/**
 * Optimierte Watch-Helper-Funktionen
 *
 * Dieses Modul bietet Performance-optimierte Implementierungen
 * von Debounce und Throttle für Vue.js Watch-Funktionen
 */

/**
 * Typ für eine generische Funktion
 */
type AnyFunction = (...args: any[]) => any;

/**
 * Interface für erweiterte Timer-Funktionen mit Cancel-Methode
 */
export interface TimerFunction<T extends AnyFunction> {
  (...args: Parameters<T>): ReturnType<T> | undefined;
  cancel: () => void;
}

/**
 * Optimierte Debounce-Funktion mit optionaler maximaler Wartezeit
 *
 * @param fn Die zu debouncende Funktion
 * @param delay Verzögerung in Millisekunden
 * @param options Zusätzliche Optionen
 * @returns Eine gedebouncte Funktion mit Cancel-Methode
 */
export function debounce<T extends AnyFunction>(
  fn: T,
  delay: number,
  options: { maxWait?: number } = {},
): TimerFunction<T> {
  let timeoutId: number | null = null;
  let lastCallTime = 0;
  let lastInvokeTime = 0;
  const maxWait = options.maxWait || 0;
  let result: ReturnType<T>;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: any = null;


  // Funktion, die den eigentlichen Aufruf durchführt
  function invokeFunc() {
    const time = Date.now();
    lastInvokeTime = time;

    if (lastArgs && lastThis) {
      result = fn.apply(lastThis, lastArgs);
      lastArgs = lastThis = null;
    }

    return result;
  }

  // Funktion, die prüft, ob der maxWait überschritten wurde
  function shouldInvoke(time: number) {
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;

    return (
      lastCallTime === 0 || // Erster Aufruf
      timeSinceLastCall >= delay || // Normale Verzögerung abgelaufen
      (maxWait > 0 && timeSinceLastInvoke >= maxWait) // Max Wartezeit überschritten
    );
  }

  // Timer-Funktion, die bei Ablauf des Timers aufgerufen wird
  function timerExpired() {
    const time = Date.now();

    if (shouldInvoke(time)) {
      return invokeFunc();
    }

    // Timer für die verbleibende Zeit neu planen
    const currentTime = Date.now();
    if (maxWait > 0) {
      const timeSinceLastCall = currentTime - lastCallTime;
      const timeSinceLastInvoke = currentTime - lastInvokeTime;
      const timeUntilDelayExpires = delay - timeSinceLastCall;
      const timeUntilMaxWaitExpires = maxWait - timeSinceLastInvoke;

      // Wähle die kürzere verbleibende Zeit
      const remainingWait = Math.min(
        timeUntilDelayExpires,
        timeUntilMaxWaitExpires,
      );

      timeoutId = window.setTimeout(timerExpired, remainingWait);
    } else {
      timeoutId = window.setTimeout(timerExpired, delay);
    }
  }

  // Die eigentliche debounced Funktion
  function debounced(this: any, ...args: Parameters<T>) {
    const time = Date.now();
    lastCallTime = time;
    lastArgs = args;
    lastThis = this;

    if (shouldInvoke(time)) {
      if (timeoutId === null) {
        return invokeFunc();
      }

      if (maxWait > 0) {
        // Wenn maxWait aktiv ist, rufe sofort auf und starte neuen Timer
        timeoutId = window.setTimeout(timerExpired, delay);
        return invokeFunc();
      }
    }

    if (timeoutId === null) {
      timeoutId = window.setTimeout(timerExpired, delay);
    }

    return result;
  }

  // Cancel-Methode, um den Timer zu löschen
  debounced.cancel = function () {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    lastCallTime = 0;
    lastInvokeTime = 0;
    lastArgs = lastThis = null;
  };

  return debounced as TimerFunction<T>;
}

/**
 * Optimierte Throttle-Funktion für häufige Events
 *
 * @param fn Die zu throttlende Funktion
 * @param delay Verzögerung in Millisekunden
 * @param options Leading/Trailing-Optionen
 * @returns Eine throttle Funktion mit Cancel-Methode
 */
export function throttle<T extends AnyFunction>(
  fn: T,
  delay: number,
  options: { leading?: boolean; trailing?: boolean } = {},
): TimerFunction<T> {
  let timeoutId: number | null = null;
  let lastCallTime = 0;
<<<<<<< HEAD
  let _lastInvokeTime = 0;
=======
  let lastInvokeTime = 0;
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
  let result: ReturnType<T>;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: any = null;

  const leading = options.leading !== false;
  const trailing = options.trailing !== false;


  // Funktion, die den eigentlichen Aufruf durchführt
  function invokeFunc() {
    const time = Date.now();
    lastInvokeTime = time;

    if (lastArgs && lastThis) {
      result = fn.apply(lastThis, lastArgs);

      // Nur löschen, wenn Trailing off ist
      if (!trailing) {
        lastArgs = lastThis = null;
      }
    }

    return result;
  }

  // Timer-Funktion, die bei Ablauf des Timers aufgerufen wird
  function timerExpired() {
<<<<<<< HEAD
    const _time = Date.now();
=======
    const time = Date.now();
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
    timeoutId = null;

    if (trailing && lastArgs) {
      return invokeFunc();
    }

    lastArgs = lastThis = null;
  }

  // Die eigentliche throttled Funktion
  function throttled(this: any, ...args: Parameters<T>) {
    const time = Date.now();
    const isInvoking = lastCallTime === 0 && !leading;

    lastCallTime = time;
    lastArgs = args;
    lastThis = this;

    if (isInvoking) {
      lastCallTime = Date.now();
      return result;
    }

    const currentTime = Date.now();
    const timeSinceLastCall = currentTime - lastCallTime;

    if (timeSinceLastCall >= delay) {
      // Zeit ist abgelaufen, sofort ausführen
      return invokeFunc();
    }

    // Timer für trailing starten, wenn noch nicht vorhanden
    if (trailing && timeoutId === null) {
      timeoutId = window.setTimeout(timerExpired, delay - timeSinceLastCall);
    }

    return result;
  }

  // Cancel-Methode, um den Timer zu löschen
  throttled.cancel = function () {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    lastCallTime = 0;
    lastInvokeTime = 0;
    lastArgs = lastThis = null;
  };

  return throttled as TimerFunction<T>;
}

/**
 * Optimierte RAF-Throttle Funktion für UI-Animation
 *
 * Throttled mittels requestAnimationFrame für optimale UI-Aktualisierungen
 *
 * @param fn Die zu throttlende Funktion
 * @returns Eine RAF-throttled Funktion mit Cancel-Methode
 */
export function rafThrottle<T extends AnyFunction>(fn: T): TimerFunction<T> {
  let rafId: number | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: any = null;
  let result: ReturnType<T>;

  // Die throttled Funktion
  function throttled(this: any, ...args: Parameters<T>) {
    lastArgs = args;
    lastThis = this;

    if (rafId === null) {
      // Frame anfordern für optimale Synchronisierung mit Browser-Rendering
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (lastArgs && lastThis) {
          result = fn.apply(lastThis, lastArgs);
        }
      });
    }

    return result;
  }

  // Cancel-Methode
  throttled.cancel = function () {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    lastArgs = lastThis = null;
  };

  return throttled as TimerFunction<T>;
}

/**
 * Adaptive Rate Limiter - passt Throttle/Debounce Rate dynamisch basierend auf Aufrufmuster an
 *
 * @param fn Die zu limitierende Funktion
 * @param options Konfigurationsoptionen
 * @returns Eine adaptiv throttled/debounced Funktion mit Cancel-Methode
 */
export function adaptiveRateLimiter<T extends AnyFunction>(
  fn: T,
  options: {
    initialDelay?: number;
    minDelay?: number;
    maxDelay?: number;
    adaptationRate?: number;
    mode?: "throttle" | "debounce";
  } = {},
): TimerFunction<T> {
  const {
    initialDelay = 100,
    minDelay = 16, // ≈ 60fps
    maxDelay = 500,
    adaptationRate = 1.5,
    mode = "throttle",
  } = options;

  let currentDelay = initialDelay;
  let callTimes: number[] = [];
  const CALL_HISTORY_SIZE = 10;

  // Funktion, die die Frequenz berechnet und die Verzögerung aktualisiert
  function updateDelay() {
    if (callTimes.length < 2) return;

    // Berechne durchschnittliche Zeit zwischen Aufrufen
    const avgInterval =
      (callTimes[callTimes.length - 1] - callTimes[0]) / (callTimes.length - 1);

    if (avgInterval < currentDelay / 2) {
      // Hohe Frequenz - erhöhe Verzögerung
      currentDelay = Math.min(currentDelay * adaptationRate, maxDelay);
    } else if (avgInterval > currentDelay * 2) {
      // Niedrige Frequenz - verringere Verzögerung
      currentDelay = Math.max(currentDelay / adaptationRate, minDelay);
    }
  }

  // Wrapper-Funktion zur Aufzeichnung der Aufrufzeiten
  function wrappedFn(this: any, ...args: Parameters<T>) {
    const now = Date.now();

    // Halte nur die letzten N Aufrufe
    callTimes.push(now);
    if (callTimes.length > CALL_HISTORY_SIZE) {
      callTimes.shift();
    }

    updateDelay();
    return fn.apply(this, args);
  }

  // Je nach Modus unterschiedlichen Limiter erstellen
  const limiter =
    mode === "throttle"
      ? throttle(wrappedFn, currentDelay, {
          leading: true,
          trailing: true,
        })
      : debounce(wrappedFn, currentDelay, { maxWait: maxDelay * 2 });

  // Die adaptiv limitierte Funktion
  function adaptiveFunction(this: any, ...args: Parameters<T>) {
    return limiter.apply(this, args);
  }

  // Cancel-Methode
  adaptiveFunction.cancel = function () {
    limiter.cancel();
    callTimes = [];
  };

  return adaptiveFunction as TimerFunction<T>;
}
