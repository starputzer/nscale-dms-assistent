/**
 * @file Bridge Diagnostics Module
 * @description Provides diagnostic tools for monitoring bridge performance, 
 * memory usage, and error handling.
 * 
 * @redundancy-analysis
 * This module consolidates diagnostic functionality previously scattered across:
 * - bridge/monitoring.ts
 * - bridge/enhanced/diagnostics.ts
 * - bridge/performance.ts
 */

import { BridgeLogger } from './core/logger';
import type { 
  DiagnosticsConfig, 
  BridgeComponentStatus, 
  BridgeAPI,
  BridgeSubscription,
  TypedEventEmitter
} from './core/types';
import { success, failure } from './core/results';

// Create module-specific logger
const logger = new BridgeLogger('diagnostics');

/**
 * Diagnostics module state
 */
interface DiagnosticsState {
  /** Is diagnostics module initialized */
  initialized: boolean;
  
  /** Stored metrics history for analysis */
  metrics: {
    /** Event processing times */
    eventProcessingTimes: number[];
    
    /** State update times */
    stateUpdateTimes: number[];
    
    /** Memory usage */
    memoryUsage: number[];
    
    /** Timestamp of last memory usage collection */
    lastMemoryCheck: number;
  };
  
  /** Component status registry */
  componentStatus: Map<string, BridgeComponentStatus>;
  
  /** Event history for analysis */
  eventHistory: Array<{
    type: string;
    timestamp: number;
    payloadSize?: number;
  }>;
  
  /** Performance mark tracking */
  performanceMarks: Map<string, number>;
  
  /** Active subscriptions */
  subscriptions: BridgeSubscription[];
  
  /** Storage for periodic check intervals */
  intervals: {
    memory?: number;
    healthCheck?: number;
  };
}

/**
 * Diagnostics API interface
 */
export interface DiagnosticsAPI {
  /** Get bridge status information */
  getStatus(): Record<string, BridgeComponentStatus>;
  
  /** Get detailed diagnostic metrics */
  getMetrics(): Record<string, any>;
  
  /** Get event history information */
  getEventHistory(): Array<{ type: string; timestamp: number; payloadSize?: number }>;
  
  /** Register a component with the diagnostics module */
  registerComponent(name: string, initialStatus?: Partial<BridgeComponentStatus>): void;
  
  /** Update component status */
  updateComponentStatus(name: string, status: Partial<BridgeComponentStatus>): void;
  
  /** Start performance measurement */
  startMeasure(name: string): void;
  
  /** End performance measurement and record results */
  endMeasure(name: string): number;
  
  /** Generate a diagnostic report */
  generateReport(): Record<string, any>;
  
  /** Cleanup resources */
  dispose(): void;
}

/**
 * Default diagnostics configuration
 */
const DEFAULT_DIAGNOSTICS_CONFIG: Required<DiagnosticsConfig> = {
  enablePerformanceMonitoring: true,
  enableMemoryMonitoring: true,
  enableEventLogging: false,
  maxEventHistory: 100
};

/**
 * Initialize the diagnostics module
 * 
 * @param bridge - The bridge API instance
 * @param eventBus - The event bus for bridge communication
 * @param config - Diagnostics configuration
 * @returns Diagnostics API
 */
export function initDiagnostics(
  bridge: BridgeAPI,
  eventBus: TypedEventEmitter,
  config: DiagnosticsConfig = {}
): DiagnosticsAPI {
  // Merge with default configuration
  const mergedConfig: Required<DiagnosticsConfig> = {
    ...DEFAULT_DIAGNOSTICS_CONFIG,
    ...config
  };
  
  logger.info('Initializing diagnostics module', mergedConfig);
  
  // Initialize state
  const state: DiagnosticsState = {
    initialized: false,
    metrics: {
      eventProcessingTimes: [],
      stateUpdateTimes: [],
      memoryUsage: [],
      lastMemoryCheck: 0
    },
    componentStatus: new Map<string, BridgeComponentStatus>(),
    eventHistory: [],
    performanceMarks: new Map<string, number>(),
    subscriptions: [],
    intervals: {}
  };
  
  /**
   * Monitor memory usage
   */
  function monitorMemory() {
    if (!mergedConfig.enableMemoryMonitoring) {
      return;
    }
    
    // Skip if we've checked recently (within 1 second)
    const now = Date.now();
    if (now - state.metrics.lastMemoryCheck < 1000) {
      return;
    }
    
    try {
      // Simple memory check with performance API if available
      if (typeof performance !== 'undefined' && 
          typeof performance.memory !== 'undefined' && 
          performance.memory?.usedJSHeapSize) {
        
        const memory = performance.memory.usedJSHeapSize;
        state.metrics.memoryUsage.push(memory);
        
        // Keep only recent history (last 100 points)
        if (state.metrics.memoryUsage.length > 100) {
          state.metrics.memoryUsage.shift();
        }
        
        // Check for potential memory leaks (increased usage over time)
        const memoryIncreaseThreshold = 50 * 1024 * 1024; // 50MB
        if (state.metrics.memoryUsage.length > 10) {
          const oldest = state.metrics.memoryUsage[0];
          const newest = memory;
          
          if (newest - oldest > memoryIncreaseThreshold) {
            logger.warn('Potential memory leak detected', {
              oldestMB: Math.round(oldest / (1024 * 1024)),
              newestMB: Math.round(newest / (1024 * 1024)),
              diffMB: Math.round((newest - oldest) / (1024 * 1024))
            });
            
            // Emit memory warning event
            eventBus.emit('bridge:memoryWarning', {
              currentUsage: newest,
              increase: newest - oldest,
              timespan: (now - state.metrics.lastMemoryCheck) / 1000
            });
          }
        }
      }
      
      state.metrics.lastMemoryCheck = now;
    } catch (error) {
      logger.error('Error during memory monitoring', error);
    }
  }
  
  /**
   * Setup memory monitoring
   */
  function setupMemoryMonitoring() {
    if (!mergedConfig.enableMemoryMonitoring) {
      return;
    }
    
    logger.debug('Setting up memory monitoring');
    
    // Monitor memory usage periodically
    state.intervals.memory = window.setInterval(() => {
      monitorMemory();
    }, 5000); // Every 5 seconds
  }
  
  /**
   * Setup performance monitoring
   */
  function setupPerformanceMonitoring() {
    if (!mergedConfig.enablePerformanceMonitoring) {
      return;
    }
    
    logger.debug('Setting up performance monitoring');
    
    // Listen for bridge events to track event processing time
    const bridgeEventSub = eventBus.on('bridge:event', (payload) => {
      if (payload && payload.type && payload.timestamp) {
        // Track event
        trackEvent(payload.type, payload.timestamp, payload.payloadSize);
        
        // Start measuring event processing time
        startMeasure(`event_${payload.type}`);
      }
    });
    
    const bridgeEventCompleteSub = eventBus.on('bridge:eventComplete', (payload) => {
      if (payload && payload.type) {
        // End measuring event processing time
        const processingTime = endMeasure(`event_${payload.type}`);
        
        if (processingTime > 0) {
          // Store event processing time
          state.metrics.eventProcessingTimes.push(processingTime);
          
          // Keep only recent history (last 100 points)
          if (state.metrics.eventProcessingTimes.length > 100) {
            state.metrics.eventProcessingTimes.shift();
          }
          
          // Check for slow event processing
          if (processingTime > 50) { // 50ms threshold
            logger.warn('Slow event processing detected', {
              eventType: payload.type,
              processingTime: processingTime
            });
          }
        }
      }
    });
    
    // Listen for state update events
    const stateUpdateSub = eventBus.on('bridge:stateUpdate', (payload) => {
      if (payload && payload.storeName && payload.timestamp) {
        // Start measuring state update time
        startMeasure(`state_${payload.storeName}`);
      }
    });
    
    const stateUpdateCompleteSub = eventBus.on('bridge:stateUpdateComplete', (payload) => {
      if (payload && payload.storeName) {
        // End measuring state update time
        const updateTime = endMeasure(`state_${payload.storeName}`);
        
        if (updateTime > 0) {
          // Store state update time
          state.metrics.stateUpdateTimes.push(updateTime);
          
          // Keep only recent history (last 100 points)
          if (state.metrics.stateUpdateTimes.length > 100) {
            state.metrics.stateUpdateTimes.shift();
          }
          
          // Check for slow state updates
          if (updateTime > 50) { // 50ms threshold
            logger.warn('Slow state update detected', {
              storeName: payload.storeName,
              updateTime: updateTime
            });
          }
        }
      }
    });
    
    // Add subscriptions to state for later cleanup
    state.subscriptions.push(
      bridgeEventSub,
      bridgeEventCompleteSub,
      stateUpdateSub,
      stateUpdateCompleteSub
    );
  }
  
  /**
   * Setup periodic health check
   */
  function setupHealthCheck() {
    logger.debug('Setting up health check');
    
    // Register core components
    registerComponent('bridge', { 
      status: 'healthy',
      lastUpdated: Date.now()
    });
    
    registerComponent('auth', { 
      status: 'healthy',
      lastUpdated: Date.now()
    });
    
    registerComponent('sessions', { 
      status: 'healthy',
      lastUpdated: Date.now()
    });
    
    registerComponent('ui', { 
      status: 'healthy',
      lastUpdated: Date.now()
    });
    
    // Setup periodic health check
    state.intervals.healthCheck = window.setInterval(() => {
      // Update diagnostics component status
      updateComponentStatus('diagnostics', {
        status: 'healthy',
        lastUpdated: Date.now(),
        metrics: {
          memoryUsage: state.metrics.memoryUsage[state.metrics.memoryUsage.length - 1],
          eventProcessingTime: calculateAverage(state.metrics.eventProcessingTimes),
          stateUpdateTime: calculateAverage(state.metrics.stateUpdateTimes)
        }
      });
      
      // Emit status update event
      eventBus.emit('bridge:statusChanged', getStatus());
    }, 30000); // Every 30 seconds
  }
  
  /**
   * Track an event for diagnostics
   */
  function trackEvent(type: string, timestamp: number, payloadSize?: number) {
    if (!mergedConfig.enableEventLogging) {
      return;
    }
    
    // Add event to history
    state.eventHistory.push({ type, timestamp, payloadSize });
    
    // Keep only recent history
    if (state.eventHistory.length > mergedConfig.maxEventHistory) {
      state.eventHistory.shift();
    }
  }
  
  /**
   * Calculate average of values
   */
  function calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    
    const sum = values.reduce((a, b) => a + b, 0);
    return sum / values.length;
  }
  
  /**
   * Initialize the diagnostics module
   */
  function initialize() {
    if (state.initialized) {
      logger.warn('Diagnostics module already initialized');
      return;
    }
    
    // Setup various monitoring components
    setupMemoryMonitoring();
    setupPerformanceMonitoring();
    setupHealthCheck();
    
    // Register this component
    registerComponent('diagnostics', { 
      status: 'healthy',
      lastUpdated: Date.now()
    });
    
    // Setup error handling
    const errorSub = eventBus.on('bridge:error', (error) => {
      // Update affected component status if available
      if (error && error.component && state.componentStatus.has(error.component)) {
        updateComponentStatus(error.component, {
          status: 'error',
          lastUpdated: Date.now(),
          error: {
            code: error.code || 'BRIDGE_ERROR',
            message: error.message || 'Unknown error',
            details: error.details
          }
        });
      }
      
      // Log error
      logger.error('Bridge error detected', error);
    });
    
    state.subscriptions.push(errorSub);
    
    state.initialized = true;
    logger.info('Diagnostics module initialized');
  }
  
  /**
   * Cleanup diagnostics module resources
   */
  function dispose() {
    logger.debug('Disposing diagnostics module resources');
    
    // Unsubscribe from all events
    state.subscriptions.forEach(subscription => {
      subscription.unsubscribe();
    });
    
    // Clear intervals
    if (state.intervals.memory) {
      window.clearInterval(state.intervals.memory);
    }
    
    if (state.intervals.healthCheck) {
      window.clearInterval(state.intervals.healthCheck);
    }
    
    // Clear the state
    state.subscriptions = [];
    state.initialized = false;
    
    logger.info('Diagnostics module disposed');
  }
  
  // Public API
  const api: DiagnosticsAPI = {
    getStatus,
    
    getMetrics() {
      return {
        eventProcessing: {
          times: state.metrics.eventProcessingTimes,
          average: calculateAverage(state.metrics.eventProcessingTimes),
          max: state.metrics.eventProcessingTimes.length > 0 
            ? Math.max(...state.metrics.eventProcessingTimes) 
            : 0
        },
        stateUpdate: {
          times: state.metrics.stateUpdateTimes,
          average: calculateAverage(state.metrics.stateUpdateTimes),
          max: state.metrics.stateUpdateTimes.length > 0 
            ? Math.max(...state.metrics.stateUpdateTimes) 
            : 0
        },
        memory: {
          current: state.metrics.memoryUsage[state.metrics.memoryUsage.length - 1] || 0,
          history: state.metrics.memoryUsage,
          trend: state.metrics.memoryUsage.length > 10 
            ? state.metrics.memoryUsage[state.metrics.memoryUsage.length - 1] - state.metrics.memoryUsage[0]
            : 0
        },
        events: {
          count: state.eventHistory.length,
          types: countEventTypes()
        }
      };
    },
    
    getEventHistory() {
      return [...state.eventHistory];
    },
    
    registerComponent,
    
    updateComponentStatus,
    
    startMeasure,
    
    endMeasure,
    
    generateReport() {
      const now = new Date();
      
      return {
        timestamp: now.toISOString(),
        runtime: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          screenSize: `${window.screen.width}x${window.screen.height}`,
          viewportSize: `${window.innerWidth}x${window.innerHeight}`,
          devicePixelRatio: window.devicePixelRatio,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        status: getStatus(),
        metrics: this.getMetrics(),
        events: mergedConfig.enableEventLogging 
          ? this.getEventHistory() 
          : { enabled: false }
      };
    },
    
    dispose
  };
  
  /**
   * Get component status information
   */
  function getStatus(): Record<string, BridgeComponentStatus> {
    const result: Record<string, BridgeComponentStatus> = {};
    
    state.componentStatus.forEach((status, name) => {
      result[name] = { ...status };
    });
    
    return result;
  }
  
  /**
   * Register a component with the diagnostics module
   */
  function registerComponent(name: string, initialStatus?: Partial<BridgeComponentStatus>) {
    const status: BridgeComponentStatus = {
      status: 'healthy',
      lastUpdated: Date.now(),
      ...initialStatus
    };
    
    state.componentStatus.set(name, status);
    logger.debug('Component registered', { name, status: status.status });
  }
  
  /**
   * Update component status
   */
  function updateComponentStatus(name: string, status: Partial<BridgeComponentStatus>) {
    if (!state.componentStatus.has(name)) {
      registerComponent(name);
    }
    
    const currentStatus = state.componentStatus.get(name)!;
    const newStatus: BridgeComponentStatus = {
      ...currentStatus,
      ...status,
      lastUpdated: Date.now()
    };
    
    state.componentStatus.set(name, newStatus);
    
    // Log status changes (especially errors)
    if (currentStatus.status !== newStatus.status) {
      if (newStatus.status === 'error') {
        logger.error(`Component ${name} status changed to error`, newStatus.error);
      } else if (newStatus.status === 'degraded') {
        logger.warn(`Component ${name} status changed to degraded`);
      } else if (currentStatus.status === 'error' || currentStatus.status === 'degraded') {
        logger.info(`Component ${name} recovered to ${newStatus.status}`);
      }
    }
  }
  
  /**
   * Start performance measurement
   */
  function startMeasure(name: string) {
    if (!mergedConfig.enablePerformanceMonitoring) {
      return;
    }
    
    state.performanceMarks.set(name, performance.now());
  }
  
  /**
   * End performance measurement and record results
   */
  function endMeasure(name: string): number {
    if (!mergedConfig.enablePerformanceMonitoring) {
      return 0;
    }
    
    const start = state.performanceMarks.get(name);
    if (!start) {
      return 0;
    }
    
    const end = performance.now();
    const duration = end - start;
    
    // Remove the mark to free memory
    state.performanceMarks.delete(name);
    
    return duration;
  }
  
  /**
   * Count events by type
   */
  function countEventTypes(): Record<string, number> {
    const counts: Record<string, number> = {};
    
    state.eventHistory.forEach(event => {
      if (!counts[event.type]) {
        counts[event.type] = 0;
      }
      counts[event.type]++;
    });
    
    return counts;
  }
  
  // Initialize the diagnostics module
  initialize();
  
  // Return the API
  return api;
}