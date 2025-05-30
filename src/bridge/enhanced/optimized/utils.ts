/**
 * Utility functions for optimized bridge components
 */

/**
 * Deep comparison of two values
 * More efficient than JSON.stringify for comparison
 */
export function deepCompare(a: any, b: any): boolean {
  // Handle primitives
  if (a === b) return true;

  // If either is null/undefined but not both
  if (a == null || b == null) return false;

  // Handle dates
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  // Different types
  if (typeof a !== typeof b) return false;

  // Both are objects but different types (like Array vs Object)
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  // Both are arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;

    // Compare each element
    for (let i = 0; i < a.length; i++) {
      if (!deepCompare(a[i], b[i])) return false;
    }

    return true;
  }

  // Both are objects
  if (typeof a === "object") {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    // Different number of properties
    if (keysA.length !== keysB.length) return false;

    // Check each property
    for (const key of keysA) {
      if (!b.hasOwnProperty(key)) return false;
      if (!deepCompare(a[key], b[key])) return false;
    }

    return true;
  }

  // Any other case
  return false;
}

/**
 * Create a glob-like path matcher
 * Supports * for single level wildcards and ** for multi-level
 */
export function createPathMatcher(pattern: string): (path: string) => boolean {
  // Convert glob pattern to regex
  const regexPattern = pattern
    // Escape dots
    .replace(/\./g, "\\.")
    // Convert ** to regex
    .replace(/\*\*/g, "###MULTI###")
    // Convert * to regex
    .replace(/\*/g, "[^.]*")
    // Convert back ** patterns
    .replace(/###MULTI###/g, ".*");

  const regex = new RegExp(`^${regexPattern}$`);

  // Return matcher function
  return (path: string): boolean => regex.test(path);
}

/**
 * Creates a debounced version of a function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): {
  (...args: Parameters<T>): void;
  cancel: () => void;
} {
  let timeout: number | null = null;

  // Debounced function
  const debounced = function (...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = window.setTimeout(later, wait);
  };

  // Add cancel method
  debounced.cancel = function () {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  return debounced;
}

/**
 * Creates a throttled version of a function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): {
  (...args: Parameters<T>): void;
  cancel: () => void;
} {
  let timeout: number | null = null;
  let previous = 0;

  // Throttled function
  const throttled = function (...args: Parameters<T>) {
    const now = Date.now();
    const remaining = wait - (now - previous);

    if (remaining <= 0 || remaining > wait) {
      if (timeout !== null) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func(...args);
    } else if (timeout === null) {
      timeout = window.setTimeout(() => {
        previous = Date.now();
        timeout = null;
        func(...args);
      }, remaining);
    }
  };

  // Add cancel method
  throttled.cancel = function () {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }
    previous = 0;
  };

  return throttled;
}

/**
 * Safely get a nested property from an object using a path string
 */
export function getNestedProperty(
  obj: any,
  path: string,
  defaultValue: any = undefined,
): any {
  if (!obj || !path) return defaultValue;

  const pathParts = path.split(".");
  let current = obj;

  for (let i = 0; i < pathParts.length; i++) {
    const part = pathParts[i];

    // Handle array indices in path
    const arrayMatch = part.match(/\[(\d+)\]$/);
    if (arrayMatch) {
      // Extract array name and index
      const arrayName = part.substring(0, part.indexOf("["));
      const index = parseInt(arrayMatch[1]);

      // Check if array exists and index is valid
      if (
        !current[arrayName] ||
        !Array.isArray(current[arrayName]) ||
        index >= current[arrayName].length
      ) {
        return defaultValue;
      }

      current = current[arrayName][index];
    } else {
      // Regular property
      if (current[part] === undefined) {
        return defaultValue;
      }
      current = current[part];
    }
  }

  return current;
}

/**
 * Safely set a nested property on an object using a path string
 */
export function setNestedProperty(obj: any, path: string, value: any): boolean {
  if (!obj || !path) return false;

  const pathParts = path.split(".");
  let current = obj;

  // Navigate to the parent of the property to set
  for (let i = 0; i < pathParts.length - 1; i++) {
    const part = pathParts[i];

    // Handle array indices in path
    const arrayMatch = part.match(/\[(\d+)\]$/);
    if (arrayMatch) {
      // Extract array name and index
      const arrayName = part.substring(0, part.indexOf("["));
      const index = parseInt(arrayMatch[1]);

      // Create array if it doesn't exist
      if (!current[arrayName]) {
        current[arrayName] = [];
      }

      // Expand array if needed
      while (current[arrayName].length <= index) {
        current[arrayName].push(null);
      }

      current = current[arrayName][index];

      // If we got null or undefined, replace with empty object
      if (current === null || current === undefined) {
        current = {};
        current[arrayName][index] = current;
      }
    } else {
      // Create nested object if it doesn't exist
      if (!current[part] || typeof current[part] !== "object") {
        current[part] = {};
      }
      current = current[part];
    }
  }

  // Set the final property
  const lastPart = pathParts[pathParts.length - 1];

  // Handle array indices in the final part
  const arrayMatch = lastPart.match(/\[(\d+)\]$/);
  if (arrayMatch) {
    // Extract array name and index
    const arrayName = lastPart.substring(0, lastPart.indexOf("["));
    const index = parseInt(arrayMatch[1]);

    // Create array if it doesn't exist
    if (!current[arrayName]) {
      current[arrayName] = [];
    }

    // Expand array if needed
    while (current[arrayName].length <= index) {
      current[arrayName].push(null);
    }

    current[arrayName][index] = value;
  } else {
    // Regular property
    current[lastPart] = value;
  }

  return true;
}

/**
 * Memory-efficient memoization function
 * Uses LRU cache with configurable size
 */
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  options: {
    maxSize?: number;
    keyGenerator?: (...args: Parameters<T>) => string;
  } = {},
): T {
  const {
    maxSize = 100,
    keyGenerator = (...args: Parameters<T>) => JSON.stringify(args),
  } = options;

  // Cache structure
  const cache = new Map<
    string,
    {
      value: ReturnType<T>;
      lastAccessed: number;
    }
  >();

  // Memoized function
  const memoized = function (...args: Parameters<T>): ReturnType<T> {
    const key = keyGenerator(...args);
    const cached = cache.get(key);

    if (cached) {
      // Update last accessed time
      cached.lastAccessed = Date.now();
      return cached.value;
    }

    // Call original function
    const result = func(...args) as ReturnType<T>;

    // Manage cache size
    if (cache.size >= maxSize) {
      // Find and remove least recently used entry
      let oldestKey: string | null = null;
      let oldestTime = Infinity;

      // Use Array.from to avoid compatibility issues with Map iterators
      Array.from(cache.entries()).forEach(([k, v]: any) => {
        if (v.lastAccessed < oldestTime) {
          oldestKey = k;
          oldestTime = v.lastAccessed;
        }
      });

      if (oldestKey) {
        cache.delete(oldestKey);
      }
    }

    // Store result in cache
    cache.set(key, {
      value: result,
      lastAccessed: Date.now(),
    });

    return result;
  } as T;

  return memoized;
}
