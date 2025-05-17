/**
 * Type-Definitionen für Browser-spezifische APIs
 * 
 * Diese Datei ergänzt Standard-Browser-Typdefinitionen um proprietäre
 * oder experimentelle APIs, die in einigen Browsern verfügbar sind.
 */

/**
 * NetworkInformation API
 * @see https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation
 */
interface NetworkInformation {
  readonly effectiveType: string;
  readonly downlink: number;
  readonly rtt: number;
  readonly saveData: boolean;
  readonly type: string;
  onchange: EventListener | null;
}

/**
 * Erweiterungen für Navigator-Interface
 */
interface Navigator {
  // Network Information API Properties
  connection?: NetworkInformation;
  mozConnection?: NetworkInformation;
  webkitConnection?: NetworkInformation;
}

/**
 * Erweiterungen für Performance-Interface
 */
interface Performance {
  // Chrome Memory API
  memory?: {
    jsHeapSizeLimit: number;
    totalJSHeapSize: number;
    usedJSHeapSize: number;
  };
}

/**
 * Erweiterungen für Window-Interface
 */
interface Window {
  // Mobile Browser Detection
  opera?: any;
  orientation?: any;
}