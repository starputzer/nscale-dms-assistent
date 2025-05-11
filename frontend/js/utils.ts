/**
 * Utility-Funktionen für den nscale DMS Assistenten
 * Beispiel für eine stufenweise Migration zu TypeScript
 */

// Typdefinitionen
export interface StorageItem<T> {
  key: string;
  value: T;
  expiry?: number; // Ablaufzeit in Millisekunden
}

/**
 * Speichert einen Wert im localStorage mit optionaler Ablaufzeit
 */
export function setLocalStorage<T>(
  key: string,
  value: T,
  expiryInMinutes?: number,
): void {
  const item: StorageItem<T> = {
    key,
    value,
  };

  if (expiryInMinutes) {
    const now = new Date();
    item.expiry = now.getTime() + expiryInMinutes * 60 * 1000;
  }

  localStorage.setItem(key, JSON.stringify(item));
}

/**
 * Liest einen Wert aus dem localStorage und prüft die Ablaufzeit
 */
export function getLocalStorage<T>(key: string, defaultValue: T): T {
  const itemStr = localStorage.getItem(key);

  if (!itemStr) {
    return defaultValue;
  }

  try {
    const item: StorageItem<T> = JSON.parse(itemStr);

    // Prüfe, ob der Wert abgelaufen ist
    if (item.expiry && new Date().getTime() > item.expiry) {
      localStorage.removeItem(key);
      return defaultValue;
    }

    return item.value;
  } catch (error) {
    console.error(`Fehler beim Lesen von ${key} aus localStorage:`, error);
    return defaultValue;
  }
}

/**
 * Formatiert ein Datum in ein lesbares deutsches Format
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;

  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Debounce-Funktion für Event-Handler
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: number | null = null;

  return function (...args: Parameters<T>): void {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout !== null) {
      clearTimeout(timeout);
    }

    timeout = window.setTimeout(later, wait);
  };
}

/**
 * Erzeugt eine eindeutige ID
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * Kürzt einen Text auf eine bestimmte Länge
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength - 3) + "...";
}

/**
 * Feature-Toggle-Funktionen (integriert mit dem bestehenden System)
 */
export function isFeatureEnabled(featureName: string): boolean {
  return localStorage.getItem(`feature_${featureName}`) === "true";
}

export function setFeatureEnabled(featureName: string, enabled: boolean): void {
  localStorage.setItem(`feature_${featureName}`, enabled ? "true" : "false");
}

/**
 * DOM-Hilfsfunktionen
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className?: string,
  content?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);

  if (className) {
    element.className = className;
  }

  if (content) {
    element.textContent = content;
  }

  return element;
}

/**
 * Event-Hilfsfunktionen
 */
export function addEventListeners<K extends keyof HTMLElementEventMap>(
  elements: HTMLElement | HTMLElement[],
  eventType: K,
  listener: (event: HTMLElementEventMap[K]) => void,
): void {
  const elementArray = Array.isArray(elements) ? elements : [elements];

  elementArray.forEach((element) => {
    element.addEventListener(eventType, listener);
  });
}

/**
 * API-Hilfsfunktionen
 */
export interface ApiOptions {
  url: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  data?: any;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export async function callApi<T>(options: ApiOptions): Promise<ApiResponse<T>> {
  const {
    url,
    method = "GET",
    data = null,
    headers = {},
    timeout = 30000,
  } = options;

  // Füge Standard-Header hinzu
  const requestHeaders = {
    "Content-Type": "application/json",
    ...headers,
  };

  // Timeout-Promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(
      () => reject(new Error("Zeitüberschreitung bei der API-Anfrage")),
      timeout,
    );
  });

  // Fetch-Promise
  const fetchPromise = fetch(url, {
    method,
    headers: requestHeaders,
    body: data ? JSON.stringify(data) : null,
  });

  // Wettrennen zwischen Fetch und Timeout
  const response = (await Promise.race([
    fetchPromise,
    timeoutPromise,
  ])) as Response;

  // Parse Response-Headers
  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  // Parse Response-Body
  const responseData = (await response.json()) as T;

  return {
    data: responseData,
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  };
}
