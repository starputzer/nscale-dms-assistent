import { vi } from 'vitest';

// Mock axios instance methods
const mockAxiosInstance = {
  request: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  head: vi.fn(),
  options: vi.fn(),
  interceptors: {
    request: {
      use: vi.fn(),
      eject: vi.fn(),
      clear: vi.fn()
    },
    response: {
      use: vi.fn(),
      eject: vi.fn(),
      clear: vi.fn()
    }
  },
  defaults: {
    headers: {
      common: {},
      get: {},
      post: {},
      put: {},
      patch: {},
      delete: {},
      head: {},
      options: {}
    }
  }
};

// Mock axios object
const mockAxios = {
  create: vi.fn(() => mockAxiosInstance),
  request: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  head: vi.fn(),
  options: vi.fn(),
  all: vi.fn(),
  spread: vi.fn(),
  isAxiosError: vi.fn(),
  Cancel: vi.fn(),
  CancelToken: {
    source: vi.fn(() => ({
      token: 'mock-token',
      cancel: vi.fn()
    }))
  },
  isCancel: vi.fn(),
  interceptors: mockAxiosInstance.interceptors,
  defaults: mockAxiosInstance.defaults,
  // Export the mock instance for direct access in tests
  _mockInstance: mockAxiosInstance
};

export default mockAxios;
export { mockAxiosInstance };