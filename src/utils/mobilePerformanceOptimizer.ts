/**
 * Mobile Performance Optimizer
 *
 * A utility that provides performance optimizations specifically for mobile devices:
 * - Adaptive batch processing based on device capabilities
 * - Responsive resource loading with network and device detection
 * - Throttling and debouncing functions optimized for mobile
 * - Memory management assistance for long-lived mobile sessions
 * - Performance monitoring with mobile-specific metrics
 */

// Device and network detection
export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  cpuCores: number;
  deviceMemory: number; // in GB
  isLowEndDevice: boolean;
  connectionType: string;
  isSlowConnection: boolean;
  maxTouchPoints: number;
  pixelRatio: number;
  viewport: {
    width: number;
    height: number;
  };
}

/**
 * Detect device capabilities and network conditions
 */
export function detectDeviceCapabilities(): DeviceInfo {
  // Basic defaults
  const info: DeviceInfo = {
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isTouchDevice: false,
    cpuCores: 4,
    deviceMemory: 4,
    isLowEndDevice: false,
    connectionType: "unknown",
    isSlowConnection: false,
    maxTouchPoints: 0,
    pixelRatio: 1,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
  };

  // Device type detection
  const userAgent =
    navigator.userAgent || navigator.vendor || (window as any).opera;
  const width = window.innerWidth;

  // Check if mobile
  info.isMobile =
    /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
      userAgent,
    );

  // Refine device type based on screen size
  if (width <= 767) {
    info.isMobile = true;
    info.isTablet = false;
    info.isDesktop = false;
  } else if (width <= 1024) {
    info.isMobile = false;
    info.isTablet = true;
    info.isDesktop = false;
  } else {
    info.isMobile = false;
    info.isTablet = false;
    info.isDesktop = true;
  }

  // Touch capability
  info.isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  info.maxTouchPoints = navigator.maxTouchPoints || 0;

  // CPU & Memory detection
  if (navigator.hardwareConcurrency) {
    info.cpuCores = navigator.hardwareConcurrency;
  }

  // @ts-ignore - deviceMemory is not in all browsers' type definitions
  if (navigator.deviceMemory) {
    // @ts-ignore
    info.deviceMemory = navigator.deviceMemory;
  }

  // Low-end device heuristic
  info.isLowEndDevice = info.cpuCores <= 2 || info.deviceMemory <= 2;

  // Network detection
  // Verwendet Type-Definitionen aus browser-extensions.d.ts
  const connection =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection;
  if (connection) {
    info.connectionType = connection.effectiveType || "unknown";
    info.isSlowConnection =
      info.connectionType === "slow-2g" ||
      info.connectionType === "2g" ||
      info.connectionType === "3g";
  }

  // Pixel ratio for high DPI screens
  info.pixelRatio = window.devicePixelRatio || 1;

  return info;
}

/**
 * Adaptive throttle/debounce based on device capabilities
 */
export interface AdaptiveThrottleOptions {
  leading?: boolean;
  trailing?: boolean;
  maxWait?: number;
}

/**
 * Creates an adaptively throttled function that automatically adjusts
 * the delay based on device capabilities
 */
export function adaptiveThrottle<T extends (...args: any[]) => any>(
  func: T,
  baseDelay = 100,
  options: AdaptiveThrottleOptions = {},
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  const deviceInfo = detectDeviceCapabilities();

  // Adjust delay based on device capabilities
  let adjustedDelay = baseDelay;

  // Increase delay on low-end devices
  if (deviceInfo.isLowEndDevice) {
    adjustedDelay = baseDelay * 2;
  }

  // Increase delay on slow connections
  if (deviceInfo.isSlowConnection) {
    adjustedDelay += 50;
  }

  // Maximum wait time
  const maxWait = options.maxWait || adjustedDelay * 5;

  let lastExecTime = 0;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: any = null;
  let result: ReturnType<T> | undefined;
  let timeoutId: number | null = null;
  let lastCallTime = 0;

  function invokeFunc() {
    const args = lastArgs;
    const thisArg = lastThis;

    lastArgs = lastThis = null;
    lastExecTime = Date.now();
    result = func.apply(thisArg, args as Parameters<T>);
    return result;
  }

  function shouldInvoke(time: number) {
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastExec = time - lastExecTime;

    return (
      lastCallTime === 0 ||
      timeSinceLastCall >= adjustedDelay ||
      timeSinceLastExec >= maxWait
    );
  }

  function trailingEdge() {
    timeoutId = null;

    if (options.trailing !== false && lastArgs) {
      return invokeFunc();
    }

    lastArgs = lastThis = null;
    return result;
  }

  function debounced(
    this: any,
    ...args: Parameters<T>
  ): ReturnType<T> | undefined {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timeoutId === null) {
        lastExecTime = lastCallTime;
        if (options.leading !== false) {
          return invokeFunc();
        }
      }

      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }

      timeoutId = window.setTimeout(trailingEdge, adjustedDelay);
      return result;
    }

    return result;
  }

  return debounced;
}

/**
 * Schedules tasks for execution using requestIdleCallback or requestAnimationFrame
 * with priorities based on device capabilities
 */
export interface TaskSchedulerOptions {
  priority?: "high" | "normal" | "low" | "background";
  timeout?: number;
}

export interface ScheduledTask {
  cancel: () => void;
  id: number;
}

/**
 * Task scheduler that adapts to device capabilities
 */
export class AdaptiveTaskScheduler {
  private deviceInfo: DeviceInfo;
  private taskQueue: Array<{
    task: () => void;
    priority: number;
    id: number;
  }> = [];
  private isProcessing = false;
  private nextTaskId = 1;

  constructor() {
    this.deviceInfo = detectDeviceCapabilities();
  }

  /**
   * Schedule a task with adaptive timing based on device capabilities
   */
  scheduleTask(
    task: () => void,
    options: TaskSchedulerOptions = {},
  ): ScheduledTask {
    const priority = this.getPriorityValue(options.priority || "normal");
    const taskId = this.nextTaskId++;

    this.taskQueue.push({
      task,
      priority,
      id: taskId,
    });

    // Sort queue by priority (higher values first)
    this.taskQueue.sort((a, b) => b.priority - a.priority);

    // Start processing if not already
    if (!this.isProcessing) {
      this.processQueue();
    }

    return {
      cancel: () => this.cancelTask(taskId),
      id: taskId,
    };
  }

  /**
   * Cancel a scheduled task
   */
  private cancelTask(id: number): boolean {
    const index = this.taskQueue.findIndex((item) => item.id === id);
    if (index >= 0) {
      this.taskQueue.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Process the task queue adaptively
   */
  private processQueue() {
    this.isProcessing = true;

    // Use requestIdleCallback for low priority tasks on capable devices
    if ("requestIdleCallback" in window && !this.deviceInfo.isLowEndDevice) {
      requestIdleCallback((deadline) =>
        this.processTasksWithDeadline(deadline),
      );
    } else {
      // Fallback to requestAnimationFrame
      requestAnimationFrame(() => this.processNextTask());
    }
  }

  /**
   * Process tasks with idle deadline
   */
  private processTasksWithDeadline(deadline: IdleDeadline) {
    while (deadline.timeRemaining() > 0 && this.taskQueue.length > 0) {
      this.processNextTask();
    }

    if (this.taskQueue.length > 0) {
      requestIdleCallback((deadline) =>
        this.processTasksWithDeadline(deadline),
      );
    } else {
      this.isProcessing = false;
    }
  }

  /**
   * Process the next task in the queue
   */
  private processNextTask() {
    if (this.taskQueue.length === 0) {
      this.isProcessing = false;
      return;
    }

    const { task } = this.taskQueue.shift()!;

    try {
      task();
    } catch (error) {
      console.error("Error in scheduled task:", error);
    }

    if (this.taskQueue.length > 0) {
      // Continue processing
      if (this.deviceInfo.isLowEndDevice) {
        // Add a small delay on low-end devices to avoid blocking the main thread
        setTimeout(() => this.processNextTask(), 5);
      } else {
        requestAnimationFrame(() => this.processNextTask());
      }
    } else {
      this.isProcessing = false;
    }
  }

  /**
   * Convert priority string to numeric value
   */
  private getPriorityValue(priority: string): number {
    switch (priority) {
      case "high":
        return 100;
      case "normal":
        return 50;
      case "low":
        return 25;
      case "background":
        return 10;
      default:
        return 50;
    }
  }
}

/**
 * Memory management assistance
 */
export class MobileMemoryManager {
  private deviceInfo: DeviceInfo;
  private lowMemoryThreshold: number;
  private criticalMemoryThreshold: number;
  private memoryWarningCallback?: () => void;
  private memoryUsage: {
    timestamp: number;
    estimatedUsage: number;
  }[] = [];

  constructor(
    options: {
      lowMemoryThreshold?: number;
      criticalMemoryThreshold?: number;
      onMemoryWarning?: () => void;
    } = {},
  ) {
    this.deviceInfo = detectDeviceCapabilities();

    // Set default thresholds based on device memory
    const availableMemory = this.deviceInfo.deviceMemory || 4;
    this.lowMemoryThreshold =
      options.lowMemoryThreshold || availableMemory * 0.7;
    this.criticalMemoryThreshold =
      options.criticalMemoryThreshold || availableMemory * 0.9;

    this.memoryWarningCallback = options.onMemoryWarning;

    // Start monitoring if the performance API is available
    if (this.isMemoryAPIAvailable()) {
      this.startMonitoring();
    }
  }

  /**
   * Check if performance memory API is available
   */
  private isMemoryAPIAvailable(): boolean {
    return !!(
      window.performance &&
      // @ts-ignore - memory is not in all browsers' type definitions
      window.performance.memory
    );
  }

  /**
   * Start monitoring memory usage
   */
  private startMonitoring() {
    setInterval(() => this.checkMemoryUsage(), 10000);
  }

  /**
   * Check current memory usage
   */
  private checkMemoryUsage() {
    if (!this.isMemoryAPIAvailable()) return;

    // Verwendet Type-Definitionen aus browser-extensions.d.ts
    const memory = window.performance.memory;
    if (!memory) return;

    const usedJSHeapSize = memory.usedJSHeapSize;
    const totalJSHeapSize = memory.totalJSHeapSize;

    // Calculate memory usage as a percentage
    const memoryUsagePercent = (usedJSHeapSize / totalJSHeapSize) * 100;

    // Record memory usage
    this.memoryUsage.push({
      timestamp: Date.now(),
      estimatedUsage: memoryUsagePercent,
    });

    // Keep only last 10 readings
    if (this.memoryUsage.length > 10) {
      this.memoryUsage.shift();
    }

    // Check if we're approaching memory limits
    if (memoryUsagePercent > this.criticalMemoryThreshold) {
      this.triggerMemoryCleanup(true);
    } else if (memoryUsagePercent > this.lowMemoryThreshold) {
      this.triggerMemoryCleanup(false);
    }
  }

  /**
   * Trigger memory cleanup
   */
  private triggerMemoryCleanup(isCritical: boolean) {
    // Notify callback if available
    if (this.memoryWarningCallback) {
      this.memoryWarningCallback();
    }

    // Force garbage collection if possible
    if (isCritical) {
      this.forceFreeMemory();
    }
  }

  /**
   * Attempt to free memory by clearing caches and references
   */
  public forceFreeMemory() {
    // Clear image caches if available
    if ("caches" in window) {
      caches.keys().then((cacheNames) => {
        cacheNames.forEach((cacheName) => {
          if (cacheName.includes("image")) {
            caches.delete(cacheName);
          }
        });
      });
    }

    // Clear any internal caches
    this.clearImageDataCache();

    // Reduce DOM size by removing hidden elements from DOM if possible
    this.pruneDOM();
  }

  /**
   * Clear image data and object URLs
   */
  private clearImageDataCache() {
    // Find and revoke any object URLs
    const objectURLs = document.querySelectorAll(
      'img[src^="blob:"], source[src^="blob:"]',
    );
    objectURLs.forEach((element) => {
      const src = element.getAttribute("src");
      if (src && src.startsWith("blob:")) {
        URL.revokeObjectURL(src);
      }
    });
  }

  /**
   * Prune the DOM by removing hidden elements
   */
  private pruneDOM() {
    // Only perform on low-end devices
    if (!this.deviceInfo.isLowEndDevice) return;

    // Find elements that are far offscreen and not visible
    const viewportHeight = window.innerHeight;
    const elements = document.querySelectorAll("*");

    const detachedElements: Element[] = [];

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      const rect = element.getBoundingClientRect();

      // Check if element is far offscreen and not visible
      const isFarOffscreen =
        rect.bottom < -viewportHeight * 2 || rect.top > viewportHeight * 3;
      const isHidden = window.getComputedStyle(element).display === "none";

      if (
        (isFarOffscreen || isHidden) &&
        element.parentNode &&
        !element.classList.contains("keep-in-dom")
      ) {
        // Store reference to parent and element for restoration
        detachedElements.push(element);
        element.parentNode.removeChild(element);
      }
    }

    // Store detached elements for potential restoration
    // @ts-ignore - adding custom property
    window.__detachedElements = detachedElements;
  }

  /**
   * Public API to get memory statistics
   */
  public getMemoryStats() {
    if (!this.isMemoryAPIAvailable()) {
      return {
        available: false,
        usage: null,
        trend: null,
      };
    }

    const memory = window.performance.memory;
    if (!memory) {
      return {
        usage: null,
        trend: null,
      };
    }

    const currentUsage = (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100;

    let trend = "stable";
    if (this.memoryUsage.length > 5) {
      const oldest = this.memoryUsage[0].estimatedUsage;
      const newest =
        this.memoryUsage[this.memoryUsage.length - 1].estimatedUsage;

      if (newest - oldest > 10) {
        trend = "increasing";
      } else if (oldest - newest > 10) {
        trend = "decreasing";
      }
    }

    return {
      available: true,
      usage: currentUsage,
      trend,
      isLow: currentUsage > this.lowMemoryThreshold,
      isCritical: currentUsage > this.criticalMemoryThreshold,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      totalJSHeapSize: memory.totalJSHeapSize,
      usedJSHeapSize: memory.usedJSHeapSize,
    };
  }
}

// Export a singleton task scheduler
export const taskScheduler = new AdaptiveTaskScheduler();
