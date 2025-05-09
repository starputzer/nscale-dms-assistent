import { ref } from 'vue';

/**
 * Composable zur Drosselung (Throttling) von Funktionsaufrufen
 * 
 * @param fn - Die zu drosselnde Funktion 
 * @param delay - Verzögerung in Millisekunden
 * @returns Gedrosselte Funktion
 */
export function useThrottleFn<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 200
): T {
  const lastExec = ref(0);
  const timeout = ref<number | null>(null);
  const lastArgs = ref<any[]>([]);
  
  // Typensichere Wrapper-Funktion
  const throttled = function(this: any, ...args: any[]) {
    const context = this;
    lastArgs.value = args;
    
    const now = Date.now();
    const timeLeft = delay - (now - lastExec.value);
    
    // Bereinige vorhandenen Timeout
    if (timeout.value !== null) {
      window.clearTimeout(timeout.value);
      timeout.value = null;
    }
    
    // Sofortige Ausführung, wenn genügend Zeit vergangen ist
    if (timeLeft <= 0) {
      lastExec.value = now;
      fn.apply(context, args);
    } else {
      // Andernfalls Timeout für spätere Ausführung planen
      timeout.value = window.setTimeout(() => {
        lastExec.value = Date.now();
        timeout.value = null;
        fn.apply(context, lastArgs.value);
      }, timeLeft);
    }
  } as T;
  
  return throttled;
}