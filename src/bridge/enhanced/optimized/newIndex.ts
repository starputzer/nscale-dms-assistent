/**
 * Optimized Bridge System - Exports
 *
 * This file exports all optimized bridge components and provides
 * convenient initialization functions for using the optimized bridge.
 */

import {
  deepDiff,
  applyDiff,
  DiffOperation,
  DiffOperationType,
} from "./DeepDiff";
import {
  OptimizedStateManager,
  createDebouncedStateManager,
} from "./StateManager";
import { BatchedEventEmitter } from "./BatchedEventEmitter";
import { MemoryManager } from "./MemoryManager";
import { OptimizedChatBridge } from "./OptimizedChatBridge";
import {
  PerformanceMonitor,
  PerformanceMetricType,
} from "./PerformanceMonitor";

// Create singleton instances
const memoryManager = new MemoryManager();
const performanceMonitor = new PerformanceMonitor();
const optimizedChatBridge = new OptimizedChatBridge();

/**
 * Initialize all optimization components
 * @param options Configuration options
 */
export function initializeOptimizedBridge(
  options: {
    enableDiagnostics?: boolean;
    enablePerformanceMonitoring?: boolean;
    enableMemoryManagement?: boolean;
    enableSelectiveSync?: boolean;
    enableEventBatching?: boolean;
    enableSelfHealing?: boolean;
  } = {},
): void {
  const {
    enableDiagnostics = true,
    enablePerformanceMonitoring = true,
    enableMemoryManagement = true,
    enableSelectiveSync = true,
    enableEventBatching = true,
    enableSelfHealing = true,
  } = options;

  if (enableDiagnostics) {
    optimizedChatBridge.setDiagnostics(true);
  }

  if (enablePerformanceMonitoring) {
    performanceMonitor.setEnabled(true);
  }

  optimizedChatBridge.initialize();
}

/**
 * Get a performance-optimized chat bridge instance
 */
export async function getOptimizedBridge(
  options: {
    enableDiagnostics?: boolean;
    enablePerformanceMonitoring?: boolean;
    enableMemoryManagement?: boolean;
    enableSelectiveSync?: boolean;
    enableEventBatching?: boolean;
    enableSelfHealing?: boolean;
  } = {},
): Promise<OptimizedChatBridge> {
  initializeOptimizedBridge(options);
  return optimizedChatBridge;
}

/**
 * Get the memory manager instance
 */
export function getMemoryManager(): MemoryManager {
  return memoryManager;
}

/**
 * Get the performance monitor instance
 */
export function getPerformanceMonitor(): PerformanceMonitor {
  return performanceMonitor;
}

/**
 * Create a new optimized state manager
 */
export function createOptimizedStateManager(
  debounceTime?: number,
): OptimizedStateManager {
  return createDebouncedStateManager(debounceTime);
}

/**
 * Create a new batched event emitter
 */
export function createBatchedEventEmitter(): BatchedEventEmitter {
  return new BatchedEventEmitter();
}

// Export all types and classes
export {
  deepDiff,
  applyDiff,
  DiffOperation,
  DiffOperationType,
  OptimizedStateManager,
  BatchedEventEmitter,
  MemoryManager,
  OptimizedChatBridge,
  PerformanceMonitor,
  PerformanceMetricType,
};

/**
 * Vue plugin for global registration
 */
export const OptimizedBridgePlugin = {
  install(app: any, options: any = {}) {
    // Initialize the bridge
    const bridge = getOptimizedBridge(options);

    // Provide the bridge to all components
    app.provide("optimizedBridge", bridge);

    // Register global properties
    app.config.globalProperties.$bridge = bridge;
  },
};

// Export default object for convenient access
export default {
  getOptimizedBridge,
  getMemoryManager,
  getPerformanceMonitor,
  createOptimizedStateManager,
  createBatchedEventEmitter,
  initializeOptimizedBridge,
  OptimizedBridgePlugin,
};
