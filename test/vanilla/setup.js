// Vitest setup file for vanilla JS tests
import { vi } from "vitest";
import axios from "axios";

// Mock global objects
global.window = {
  location: {
    origin: "http://localhost:8000",
  },
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  useSimpleLanguage: false,
  reloadCurrentSession: vi.fn(),
  updateSessionTitle: vi.fn(),
  updateAllSessionTitles: vi.fn(),
  loadMotd: vi.fn(),
};

// Mock Vue (since vanilla JS references Vue)
global.Vue = {
  createApp: vi.fn(),
  ref: (val) => ({
    value: val,
  }),
  reactive: (obj) => obj,
  onMounted: vi.fn(),
  watch: vi.fn(),
  nextTick: vi.fn().mockResolvedValue(),
};

// Mock axios
vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    defaults: {
      headers: {
        common: {},
      },
    },
  },
}));

// Mock EventSource
class MockEventSource {
  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.onmessage = null;
    this.onerror = null;
    this.eventListeners = {};

    // Auto connect in testing
    setTimeout(() => {
      this.readyState = 1;
      this.dispatchEvent({ type: "open" });
    }, 0);
  }

  addEventListener(type, callback) {
    if (!this.eventListeners[type]) {
      this.eventListeners[type] = [];
    }
    this.eventListeners[type].push(callback);
  }

  removeEventListener(type, callback) {
    if (this.eventListeners[type]) {
      this.eventListeners[type] = this.eventListeners[type].filter(
        (cb) => cb !== callback,
      );
    }
  }

  dispatchEvent(event) {
    if (event.type === "message" && this.onmessage) {
      this.onmessage(event);
    } else if (event.type === "error" && this.onerror) {
      this.onerror(event);
    }

    if (this.eventListeners[event.type]) {
      this.eventListeners[event.type].forEach((callback) => callback(event));
    }
  }

  close() {
    this.readyState = 2;
    this.onmessage = null;
    this.onerror = null;
    this.eventListeners = {};
  }
}

global.EventSource = MockEventSource;

// Mock localStorage
const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    getStore: () => store,
  };
})();

global.localStorage = mockLocalStorage;

// Mock console methods
global.console = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};

// Mock setTimeout and clearTimeout
global.setTimeout = vi.fn((fn) => {
  fn();
  return 123; // Mock timer ID
});
global.clearTimeout = vi.fn();

// Mock marked parser (used for Markdown formatting)
global.marked = {
  parse: vi.fn((text) => text),
};

// Cleanup after each test
afterEach(() => {
  vi.clearAllMocks();
});
