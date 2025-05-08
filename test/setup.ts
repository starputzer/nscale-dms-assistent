// Vitest setup file
import { vi } from 'vitest';
import { config } from '@vue/test-utils';

// Globale Mocks für Vue-Komponenten
config.global.mocks = {
  $t: (key: string) => key, // Mock für i18n
};

// Mock für window.Blob
class MockBlob {
  size: number;
  type: string;
  
  constructor(parts: any[], options?: BlobPropertyBag) {
    this.size = parts.reduce((acc, part) => acc + (typeof part === 'string' ? part.length : part.size || 0), 0);
    this.type = options?.type || '';
  }
}

global.Blob = MockBlob as any;

// Mock für URL.createObjectURL
URL.createObjectURL = vi.fn().mockImplementation(() => 'mock-object-url');
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
};

// Mock für window.setInterval
global.setInterval = vi.fn();
global.clearInterval = vi.fn();

// Bereinigung nach jedem Test
afterEach(() => {
  vi.clearAllMocks();
});