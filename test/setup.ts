// Vitest setup file
import { vi, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { config } from "@vue/test-utils";
import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/vue";

// Vue Test Utils Globale Konfiguration
config.global.mocks = {
  $t: (key: string) => key, // Mock für i18n
  $router: {
    push: vi.fn(),
    replace: vi.fn(),
    go: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  },
  $route: {
    params: {},
    query: {},
    path: "/",
    name: "home",
  },
};

// Konfiguration für sämtliche Komponenten
config.global.stubs = {
  // Stub für externe Komponenten, die nicht getestet werden müssen
  "font-awesome-icon": true,
  "router-link": true,
  // Spezielle Komponenten, wenn nötig
};

// Mock für window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock für window.Blob
class MockBlob {
  size: number;
  type: string;

  constructor(parts: any[], options?: BlobPropertyBag) {
    this.size = parts.reduce(
      (acc, part) =>
        acc + (typeof part === "string" ? part.length : part.size || 0),
      0,
    );
    this.type = options?.type || "";
  }

  text() {
    return Promise.resolve("mock-blob-text");
  }

  arrayBuffer() {
    return Promise.resolve(new ArrayBuffer(this.size));
  }

  slice(start?: number, end?: number, contentType?: string) {
    return new MockBlob([], { type: contentType || this.type });
  }
}

global.Blob = MockBlob as any;
global.File = class extends MockBlob {
  name: string;
  lastModified: number;

  constructor(parts: any[], name: string, options?: FilePropertyBag) {
    super(parts, options);
    this.name = name;
    this.lastModified = options?.lastModified || Date.now();
  }
} as any;

// Mock für URL.createObjectURL
URL.createObjectURL = vi.fn().mockImplementation(() => "mock-object-url");
URL.revokeObjectURL = vi.fn();

// Mock für window.fetch
global.fetch = vi.fn();

// Mock für FormData (wird für FileUpload gebraucht)
global.FormData = class {
  private data: Record<string, any> = {};

  append(key: string, value: any) {
    this.data[key] = value;
  }

  get(key: string) {
    return this.data[key];
  }

  has(key: string) {
    return key in this.data;
  }

  delete(key: string) {
    delete this.data[key];
  }

  getAll(key: string) {
    return this.data[key] ? [this.data[key]] : [];
  }

  forEach(callback: (value: any, key: string) => void) {
    Object.entries(this.data).forEach(([key, value]) => callback(value, key));
  }
};

// Mock für Timing-Funktionen
// Use vitest's timer mocks instead of manually mocking
vi.useFakeTimers();

// Ensure window.setTimeout and window.setInterval point to the mocked versions
Object.defineProperty(window, 'setTimeout', {
  writable: true,
  value: setTimeout
});

Object.defineProperty(window, 'setInterval', {
  writable: true,
  value: setInterval
});

Object.defineProperty(window, 'clearTimeout', {
  writable: true,
  value: clearTimeout
});

Object.defineProperty(window, 'clearInterval', {
  writable: true,
  value: clearInterval
});

global.requestAnimationFrame = vi.fn().mockImplementation(cb => setTimeout(cb, 0));
global.cancelAnimationFrame = vi.fn().mockImplementation(id => clearTimeout(id));

// Mock für lokalen und Session Storage
const mockStorage = () => {
  let store: Record<string, string> = {};
  return {
    getItem(key: string) {
      return store[key] || null;
    },
    setItem(key: string, value: string) {
      store[key] = value.toString();
    },
    removeItem(key: string) {
      delete store[key];
    },
    clear() {
      store = {};
    },
    length: 0,
    key(index: number) {
      return Object.keys(store)[index] || null;
    },
  };
};

Object.defineProperty(window, "localStorage", {
  value: mockStorage(),
});

Object.defineProperty(window, "sessionStorage", {
  value: mockStorage(),
});

// Mock für EventSource (für Streaming-Tests)
class MockEventSource {
  url: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onopen: ((event: Event) => void) | null = null;
  readyState: number = 0;
  withCredentials: boolean = false;
  CONNECTING: number = 0;
  OPEN: number = 1;
  CLOSED: number = 2;

  private eventListeners: Record<string, Array<(event: MessageEvent) => void>> =
    {};

  constructor(url: string) {
    this.url = url;
    this.readyState = this.CONNECTING;

    // Automatisch nach Erstellung "verbinden"
    setTimeout(() => {
      this.readyState = this.OPEN;
      if (this.onopen) {
        this.onopen(new Event("open"));
      }
    }, 0);
  }

  addEventListener(
    type: string,
    listener: (event: MessageEvent) => void,
  ): void {
    if (!this.eventListeners[type]) {
      this.eventListeners[type] = [];
    }
    this.eventListeners[type].push(listener);
  }

  removeEventListener(
    type: string,
    listener: (event: MessageEvent) => void,
  ): void {
    if (this.eventListeners[type]) {
      this.eventListeners[type] = this.eventListeners[type].filter(
        (l) => l !== listener,
      );
    }
  }

  dispatchEvent(event: Event): boolean {
    return true;
  }

  close(): void {
    this.readyState = this.CLOSED;
  }

  // Test-Hilfsmethoden
  emit(type: string, data: any): void {
    const event = new MessageEvent(type, {
      data: typeof data === "string" ? data : JSON.stringify(data),
    });

    // Spezifischen Event-Handler aufrufen
    if (type === "message" && this.onmessage) {
      this.onmessage(event);
    }

    // Alle Event-Listener für diesen Typ aufrufen
    if (this.eventListeners[type]) {
      this.eventListeners[type].forEach((listener) => listener(event));
    }
  }

  emitError(error: Error): void {
    if (this.onerror) {
      this.onerror(new Event("error"));
    }
  }
}

vi.stubGlobal("EventSource", MockEventSource);

// Automatische Bereinigung von Testing Library
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.clearAllTimers();
  vi.resetModules();
  localStorage.clear();
  sessionStorage.clear();
});

// Restore real timers after all tests
afterAll(() => {
  vi.useRealTimers();
});

// Testing Library: benutzerdefinierte Übereinstimmungen
import { configure } from "@testing-library/dom";

configure({
  testIdAttribute: "data-testid",
  asyncUtilTimeout: 5000,
});

// Mock für ResizeObserver
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

window.ResizeObserver = ResizeObserverMock as any;

// Mock für IntersectionObserver
class IntersectionObserverMock {
  callback: IntersectionObserverCallback;
  elements: Set<Element>;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    this.elements = new Set();
  }

  observe(element: Element) {
    this.elements.add(element);
  }

  unobserve(element: Element) {
    this.elements.delete(element);
  }

  disconnect() {
    this.elements.clear();
  }

  // Hilfsmethode für Tests
  triggerEntries(entries: IntersectionObserverEntry[]) {
    this.callback(entries, this);
  }
}

window.IntersectionObserver = IntersectionObserverMock as any;

// Hilfsfunktionen für Tests
export async function flushPromises() {
  await vi.runAllTimersAsync();
  return new Promise((resolve) => setImmediate(resolve));
}

export function createMockAxiosResponse(
  data: any,
  status = 200,
  statusText = "OK",
) {
  return {
    data,
    status,
    statusText,
    headers: {},
    config: {},
  };
}

export function createMockAxiosError(message = "Network Error", status = 500) {
  const error = new Error(message) as any;
  error.response = {
    status,
    data: { error: message },
    statusText: "Internal Server Error",
    headers: {},
    config: {},
  };
  error.isAxiosError = true;
  error.message = message;
  return error;
}

// Test-Daten-Generatoren
export const mockUtils = {
  createUser: (overrides = {}) => ({
    id: "user-1",
    email: "test@example.com",
    username: "testuser",
    role: "user",
    displayName: "Test User",
    lastLogin: new Date().toISOString(),
    ...overrides,
  }),

  createSession: (overrides = {}) => ({
    id: "session-1",
    title: "Test Session",
    userId: "user-1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPinned: false,
    ...overrides,
  }),

  createMessage: (overrides = {}) => ({
    id: "message-1",
    sessionId: "session-1",
    content: "Test message content",
    role: "user",
    timestamp: new Date().toISOString(),
    status: "sent",
    ...overrides,
  }),

  createDocument: (overrides = {}) => ({
    id: "doc-1",
    name: "test-document.pdf",
    size: 1024,
    type: "application/pdf",
    status: "converted",
    userId: "user-1",
    createdAt: new Date().toISOString(),
    ...overrides,
  }),
};
