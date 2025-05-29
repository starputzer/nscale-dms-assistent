/**
 * Session Optimizer - Utilities for optimizing session switching performance
 */

import { nextTick } from 'vue';
import type { Router } from 'vue-router';

// Debounce function to prevent rapid session switches
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

// Throttle function for performance-critical operations
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return function(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

// Optimized session navigation
export async function navigateToSession(
  sessionId: string,
  currentSessionId: string | null,
  router: Router,
  options: {
    preventDuplicate?: boolean;
    immediate?: boolean;
  } = {}
): Promise<boolean> {
  const { preventDuplicate = true, immediate = false } = options;

  // Prevent navigating to the same session
  if (preventDuplicate && currentSessionId === sessionId) {
    console.log('Already on session:', sessionId);
    return false;
  }

  // Use replace instead of push if immediate to prevent history pollution
  const navigationMethod = immediate ? 'replace' : 'push';
  
  try {
    await router[navigationMethod](`/chat/${sessionId}`);
    return true;
  } catch (error) {
    console.error('Navigation error:', error);
    return false;
  }
}

// Cancel any pending async operations
export class AsyncOperationManager {
  private pendingOperations = new Map<string, AbortController>();

  cancelOperation(key: string): void {
    const controller = this.pendingOperations.get(key);
    if (controller) {
      controller.abort();
      this.pendingOperations.delete(key);
    }
  }

  registerOperation(key: string): AbortSignal {
    // Cancel any existing operation with the same key
    this.cancelOperation(key);
    
    const controller = new AbortController();
    this.pendingOperations.set(key, controller);
    
    return controller.signal;
  }

  cancelAll(): void {
    this.pendingOperations.forEach(controller => controller.abort());
    this.pendingOperations.clear();
  }
}

// Memory-efficient session cache
export class SessionCache {
  private cache = new Map<string, any>();
  private maxSize: number;
  private accessOrder: string[] = [];

  constructor(maxSize = 50) {
    this.maxSize = maxSize;
  }

  set(key: string, value: any): void {
    // Remove from access order if it exists
    const index = this.accessOrder.indexOf(key);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }

    // Add to end (most recently used)
    this.accessOrder.push(key);
    this.cache.set(key, value);

    // Evict least recently used if over capacity
    if (this.cache.size > this.maxSize) {
      const lru = this.accessOrder.shift();
      if (lru) {
        this.cache.delete(lru);
      }
    }
  }

  get(key: string): any {
    if (!this.cache.has(key)) {
      return null;
    }

    // Move to end (most recently used)
    const index = this.accessOrder.indexOf(key);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
      this.accessOrder.push(key);
    }

    return this.cache.get(key);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }
}

// Smooth transition helper
export async function smoothTransition(callback: () => void | Promise<void>): Promise<void> {
  // Start transition
  document.documentElement.style.setProperty('--transition-speed', '0ms');
  
  // Execute callback
  await callback();
  
  // Wait for DOM updates
  await nextTick();
  
  // Re-enable transitions
  requestAnimationFrame(() => {
    document.documentElement.style.setProperty('--transition-speed', '300ms');
  });
}

// Prevent rapid clicks
export function preventRapidClicks(
  element: HTMLElement,
  handler: (event: Event) => void,
  delay = 300
): () => void {
  let isProcessing = false;

  const wrappedHandler = async (event: Event) => {
    if (isProcessing) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    isProcessing = true;
    
    try {
      await handler(event);
    } finally {
      setTimeout(() => {
        isProcessing = false;
      }, delay);
    }
  };

  element.addEventListener('click', wrappedHandler);

  // Return cleanup function
  return () => {
    element.removeEventListener('click', wrappedHandler);
  };
}