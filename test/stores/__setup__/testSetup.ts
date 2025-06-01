import { beforeEach, afterEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import axios from "axios";

/**
 * Richtet die Test-Umgebung für Pinia-Store-Tests ein
 * - Erstellt einen frischen Pinia-Store für jeden Test
 * - Setzt Mocks zurück
 * - Stellt gemeinsame Test-Hilfsmittel bereit
 */

// Mock für Axios
vi.mock("axios");

// Mock für window.localStorage
export const mockLocalStorage = () => {
  const store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
    // Hilfsmethoden für Tests
    __getStore: () => store,
    __setStore: (newStore: Record<string, string>) => {
      Object.keys(store).forEach((key) => delete store[key]);
      Object.assign(store, newStore);
    },
  };
};

// Mock für window.sessionStorage
export const mockSessionStorage = () => mockLocalStorage();

// Mock für EventSource (für Streaming-Tests)
export class MockEventSource {
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

// Überschreiben der globalen EventSource-Klasse mit unserem Mock
vi.stubGlobal("EventSource", MockEventSource);

// Helfer zum Erstellen von Datum-/Zeit-Mocks
export const mockDate = (date: Date | string | number) => {
  const originalDate = global.Date;
  const mockDate = new Date(date);

  class DateMock extends originalDate {
    constructor(...args: any[]) {
      if (args.length === 0) {
        super(mockDate);
      } else {
        super(...args);
      }
    }

    static now() {
      return mockDate.getTime();
    }
  }

  vi.stubGlobal("Date", DateMock);

  return () => {
    vi.stubGlobal("Date", originalDate);
  };
};

// Test-Hooks für jeden Test
beforeEach(() => {
  // Pinia für jeden Test zurücksetzen
  setActivePinia(createPinia());

  // Mocks zurücksetzen
  vi.clearAllMocks();
  vi.resetModules();

  // localStorage und sessionStorage mocken
  vi.stubGlobal("localStorage", mockLocalStorage());
  vi.stubGlobal("sessionStorage", mockSessionStorage());
});

afterEach(() => {
  // Alle verbleibenden Timeouts und Intervalle bereinigen
  vi.restoreAllMocks();
});

// Gemeinsame Test-Hilfsmittel
export const waitForPromises = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

// Hilfsfunktion zum Erstellen von API-Antwort-Mocks
export function createApiResponse<T>(data: T, status = 200, statusText = "OK") {
  return {
    data,
    status,
    statusText,
    headers: {},
    config: {},
  };
}

// Test-Daten-Generatoren
export const createMockUser = (overrides = {}) => ({
  id: "user-1",
  email: "test@example.com",
  username: "testuser",
  role: "user",
  roles: ["user"],
  displayName: "Test User",
  lastLogin: new Date().toISOString(),
  ...overrides,
});

export const createMockSession = (overrides = {}) => ({
  id: "session-1",
  title: "Test Session",
  userId: "user-1",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isPinned: false,
  ...overrides,
});

export const createMockMessage = (overrides = {}) => ({
  id: "message-1",
  sessionId: "session-1",
  content: "Test message content",
  role: "user",
  timestamp: new Date().toISOString(),
  status: "sent",
  ...overrides,
});

// Exportieren der gemeinsamen Testutils
export * from "vitest";
