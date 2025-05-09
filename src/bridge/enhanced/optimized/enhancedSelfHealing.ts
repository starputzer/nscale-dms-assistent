/**
 * EnhancedSelfHealing - Advanced error recovery and self-repair system
 * 
 * This component provides comprehensive error detection, recovery strategies,
 * and self-healing mechanisms for the bridge system.
 */

import { SelfHealing, BridgeLogger, BridgeErrorState, BridgeStatusInfo } from '../types';
import { BridgeStatusManager } from '../statusManager';
import { debounce } from './utils';

/**
 * Health check function type
 */
export type HealthCheckFn = () => boolean | Promise<boolean>;

/**
 * Recovery strategy function type
 */
export type RecoveryStrategyFn = () => Promise<boolean>;

/**
 * Health check result
 */
interface HealthCheckResult {
  id: string;
  name: string;
  category: string;
  component: string;
  healthy: boolean;
  error: Error | null;
  timestamp: number;
  duration: number;
  metadata?: any;
}

/**
 * Recovery attempt result
 */
interface RecoveryAttemptResult {
  id: string;
  strategyName: string;
  component: string;
  success: boolean;
  error: Error | null;
  timestamp: number;
  duration: number;
  metadata?: any;
}

/**
 * Configuration for EnhancedSelfHealing
 */
export interface EnhancedSelfHealingConfig {
  // Whether to enable automatic health checks
  automaticChecks: boolean;
  
  // Health check interval in ms
  checkInterval: number;
  
  // Whether to enable automatic recovery
  automaticRecovery: boolean;
  
  // Whether to retry failed recovery strategies
  retryFailedStrategies: boolean;
  
  // Maximum number of recovery attempts
  maxRecoveryAttempts: number;
  
  // Cooldown period between recovery attempts (ms)
  recoveryAttemptCooldown: number;
  
  // Maximum number of recovery attempts per strategy
  maxAttemptsPerStrategy: number;
  
  // Progressive backoff for recovery attempts
  progressiveBackoff: boolean;
  
  // Strategy execution options
  strategyExecution: {
    // Whether to execute strategies in parallel
    parallel: boolean;
    
    // Timeout for recovery strategy execution (ms)
    timeout: number;
    
    // Whether to abort recovery if a critical strategy fails
    abortOnCriticalFailure: boolean;
  };
  
  // Whether to save and restore state during recovery
  statePersistence: boolean;
  
  // Event notification options
  notifications: {
    // Whether to emit events for health checks
    emitHealthCheckEvents: boolean;
    
    // Whether to emit events for recovery attempts
    emitRecoveryEvents: boolean;
    
    // Whether to emit events for status changes
    emitStatusEvents: boolean;
  };
}

/**
 * Default configuration for EnhancedSelfHealing
 */
const DEFAULT_CONFIG: EnhancedSelfHealingConfig = {
  automaticChecks: true,
  checkInterval: 30000, // 30 seconds
  automaticRecovery: true,
  retryFailedStrategies: true,
  maxRecoveryAttempts: 3,
  recoveryAttemptCooldown: 5000, // 5 seconds
  maxAttemptsPerStrategy: 2,
  progressiveBackoff: true,
  
  strategyExecution: {
    parallel: false, // Execute strategies sequentially by default
    timeout: 10000, // 10 second timeout per strategy
    abortOnCriticalFailure: true
  },
  
  statePersistence: true,
  
  notifications: {
    emitHealthCheckEvents: true,
    emitRecoveryEvents: true,
    emitStatusEvents: true
  }
};

/**
 * Recovery strategy with metadata
 */
interface RecoveryStrategy {
  id: string;
  name: string;
  description: string;
  component: string;
  fn: RecoveryStrategyFn;
  critical: boolean;
  requiredHealthChecks: string[];
  dependencies: string[];
  attempts: number;
  lastAttemptTime: number | null;
  lastSuccess: boolean | null;
}

/**
 * Health check with metadata
 */
interface HealthCheck {
  id: string;
  name: string;
  description: string;
  category: string;
  component: string;
  fn: HealthCheckFn;
  critical: boolean;
  weight: number;
  lastResult: boolean | null;
  lastCheckTime: number | null;
}

/**
 * Implementation of the enhanced self-healing system
 */
export class EnhancedSelfHealing implements SelfHealing {
  private logger: BridgeLogger;
  private statusManager: BridgeStatusManager;
  private config: EnhancedSelfHealingConfig;
  
  // Health checks and recovery strategies
  private healthChecks: Map<string, HealthCheck> = new Map();
  private recoveryStrategies: Map<string, RecoveryStrategy> = new Map();
  
  // Recovery state
  private isRecovering: boolean = false;
  private recoveryAttempts: number = 0;
  private recoveryHistory: RecoveryAttemptResult[] = [];
  private healthCheckHistory: HealthCheckResult[] = [];
  
  // Check interval ID
  private checkIntervalId: number | null = null;
  
  // Last known state before failure
  private lastKnownGoodState: any = null;
  
  // Status change callback
  private onStatusChangedUnsubscribe: (() => void) | null = null;
  
  constructor(
    logger: BridgeLogger,
    statusManager: BridgeStatusManager,
    config: Partial<EnhancedSelfHealingConfig> = {}
  ) {
    this.logger = logger;
    this.statusManager = statusManager;
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Start automatic health checks if enabled
    if (this.config.automaticChecks) {
      this.startAutomaticChecks();
    }
    
    // Subscribe to status changes
    this.onStatusChangedUnsubscribe = this.statusManager.onStatusChanged(
      this.handleStatusChanged.bind(this)
    );
    
    this.logger.info('EnhancedSelfHealing initialized');
  }
  
  /**
   * Adds a health check function
   */
  addHealthCheck(
    check: HealthCheckFn, 
    options: {
      id?: string;
      name?: string;
      description?: string;
      category?: string;
      component?: string;
      critical?: boolean;
      weight?: number;
    } = {}
  ): string {
    const id = options.id || this.generateId('hc');
    
    this.healthChecks.set(id, {
      id,
      name: options.name || `HealthCheck-${id}`,
      description: options.description || '',
      category: options.category || 'general',
      component: options.component || 'unknown',
      fn: check,
      critical: options.critical !== undefined ? options.critical : false,
      weight: options.weight !== undefined ? options.weight : 1,
      lastResult: null,
      lastCheckTime: null
    });
    
    this.logger.debug(`Health check added: ${id}`, options);
    
    return id;
  }
  
  /**
   * Adds a recovery strategy function
   */
  addRecoveryStrategy(
    strategy: RecoveryStrategyFn,
    options: {
      id?: string;
      name?: string;
      description?: string;
      component?: string;
      critical?: boolean;
      requiredHealthChecks?: string[];
      dependencies?: string[];
    } = {}
  ): string {
    const id = options.id || this.generateId('rs');
    
    this.recoveryStrategies.set(id, {
      id,
      name: options.name || `RecoveryStrategy-${id}`,
      description: options.description || '',
      component: options.component || 'unknown',
      fn: strategy,
      critical: options.critical !== undefined ? options.critical : false,
      requiredHealthChecks: options.requiredHealthChecks || [],
      dependencies: options.dependencies || [],
      attempts: 0,
      lastAttemptTime: null,
      lastSuccess: null
    });
    
    this.logger.debug(`Recovery strategy added: ${id}`, options);
    
    return id;
  }
  
  /**
   * Starts automatic health checks
   */
  startAutomaticChecks(): void {
    if (this.checkIntervalId !== null) {
      this.stopAutomaticChecks();
    }
    
    this.checkIntervalId = window.setInterval(() => {
      this.performHealthCheck().catch(error => {
        this.logger.error('Error during automatic health check', error);
      });
    }, this.config.checkInterval);
    
    this.logger.info('Automatic health checks started');
  }
  
  /**
   * Stops automatic health checks
   */
  stopAutomaticChecks(): void {
    if (this.checkIntervalId !== null) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
      this.logger.info('Automatic health checks stopped');
    }
  }
  
  /**
   * Performs a health check
   */
  async performHealthCheck(): Promise<boolean> {
    if (this.isRecovering) {
      this.logger.debug('Skipping health check while recovery is in progress');
      return false;
    }
    
    if (this.healthChecks.size === 0) {
      this.logger.warn('No health checks registered');
      return true;
    }
    
    try {
      this.logger.debug('Performing health check');
      
      // Run all health checks
      const results: HealthCheckResult[] = [];
      const criticalFailures: HealthCheckResult[] = [];
      let weightedHealthScore = 0;
      let totalWeight = 0;
      
      for (const [id, check] of this.healthChecks.entries()) {
        const startTime = performance.now();
        let healthy = false;
        let error = null;
        
        try {
          // Execute the health check
          const result = await Promise.resolve(check.fn());
          healthy = !!result;
        } catch (e) {
          error = e as Error;
          healthy = false;
        }
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // Store result
        check.lastResult = healthy;
        check.lastCheckTime = Date.now();
        
        // Create result object
        const result: HealthCheckResult = {
          id,
          name: check.name,
          category: check.category,
          component: check.component,
          healthy,
          error,
          timestamp: Date.now(),
          duration
        };
        
        results.push(result);
        
        // Add to history
        this.healthCheckHistory.push(result);
        
        // Limit history size
        if (this.healthCheckHistory.length > 100) {
          this.healthCheckHistory.shift();
        }
        
        // Update weighted health score
        totalWeight += check.weight;
        if (healthy) {
          weightedHealthScore += check.weight;
        }
        
        // Track critical failures
        if (!healthy && check.critical) {
          criticalFailures.push(result);
        }
        
        // Log result
        if (healthy) {
          this.logger.debug(`Health check passed: ${check.name}`);
        } else {
          this.logger.warn(`Health check failed: ${check.name}`, {
            component: check.component,
            error: error ? error.message : 'Unknown error'
          });
        }
      }
      
      // Calculate overall health percentage
      const healthPercentage = totalWeight > 0 
        ? (weightedHealthScore / totalWeight) * 100 
        : 100;
      
      // Emit health check event if configured
      if (this.config.notifications.emitHealthCheckEvents) {
        this.emitHealthCheckEvent(results, healthPercentage);
      }
      
      // Determine if recovery is needed
      const unhealthyChecks = results.filter(r => !r.healthy);
      
      if (unhealthyChecks.length > 0) {
        this.logger.warn(`Health check failed: ${unhealthyChecks.length}/${results.length} checks failed`, {
          healthPercentage: `${healthPercentage.toFixed(1)}%`,
          criticalFailures: criticalFailures.length
        });
        
        // Update bridge status
        const errorState = criticalFailures.length > 0 
          ? BridgeErrorState.CRITICAL_FAILURE
          : BridgeErrorState.DEGRADED_PERFORMANCE;
        
        this.statusManager.updateStatus({
          state: errorState,
          message: criticalFailures.length > 0 
            ? `Critical health checks failed: ${criticalFailures.map(f => f.name).join(', ')}`
            : `Health check: ${healthPercentage.toFixed(1)}% healthy`,
          affectedComponents: unhealthyChecks.map(c => c.component)
        });
        
        // Attempt recovery if configured
        if (this.config.automaticRecovery && !this.isRecovering) {
          return await this.attemptRecovery(unhealthyChecks);
        }
        
        return false;
      } else {
        // All checks passed
        this.logger.info(`Health check passed: 100% healthy`);
        
        // If previous status was unhealthy, update to healthy
        const currentStatus = this.statusManager.getStatus();
        if (currentStatus.state !== BridgeErrorState.HEALTHY) {
          this.statusManager.updateStatus({
            state: BridgeErrorState.HEALTHY,
            message: 'All health checks passed',
            affectedComponents: []
          });
        }
        
        return true;
      }
    } catch (error) {
      this.logger.error('Unexpected error during health check', error);
      return false;
    }
  }
  
  /**
   * Attempts recovery based on failed health checks
   */
  private async attemptRecovery(failedChecks: HealthCheckResult[]): Promise<boolean> {
    if (this.isRecovering) {
      this.logger.warn('Recovery already in progress, skipping duplicate attempt');
      return false;
    }
    
    // Check max recovery attempts
    if (this.recoveryAttempts >= this.config.maxRecoveryAttempts) {
      this.logger.error(`Maximum recovery attempts (${this.config.maxRecoveryAttempts}) reached`);
      
      // Update status
      this.statusManager.updateStatus({
        state: BridgeErrorState.CRITICAL_FAILURE,
        message: 'Recovery failed after maximum attempts',
        affectedComponents: failedChecks.map(c => c.component)
      });
      
      return false;
    }
    
    this.isRecovering = true;
    this.recoveryAttempts++;
    
    this.logger.info(`Starting recovery attempt ${this.recoveryAttempts}/${this.config.maxRecoveryAttempts}`);
    
    try {
      // If configured, save state before recovery
      if (this.config.statePersistence) {
        this.saveState();
      }
      
      // Find relevant recovery strategies
      const strategiesToExecute = this.selectRecoveryStrategies(failedChecks);
      
      if (strategiesToExecute.length === 0) {
        this.logger.warn('No applicable recovery strategies found');
        this.isRecovering = false;
        return false;
      }
      
      this.logger.info(`Selected ${strategiesToExecute.length} recovery strategies`);
      
      // Execute recovery strategies
      const results = await this.executeRecoveryStrategies(strategiesToExecute);
      
      // Check if recovery was successful
      const allSuccessful = results.every(r => r.success);
      const criticalFailures = results.filter(r => {
        const strategy = this.recoveryStrategies.get(r.id);
        return !r.success && strategy && strategy.critical;
      });
      
      // Log results
      if (allSuccessful) {
        this.logger.info('Recovery successful: All strategies executed successfully');
      } else if (criticalFailures.length > 0) {
        this.logger.error('Recovery failed: Critical strategies failed', {
          criticalFailures: criticalFailures.map(f => f.strategyName)
        });
      } else {
        this.logger.warn('Recovery partially successful', {
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        });
      }
      
      // If recovery was successful, verify with a health check
      if (allSuccessful) {
        // Wait a moment for systems to stabilize
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const healthCheckResult = await this.performHealthCheck();
        
        if (healthCheckResult) {
          this.logger.info('Recovery verified: Health check passed after recovery');
          this.recoveryAttempts = 0; // Reset attempts counter on success
          this.isRecovering = false;
          return true;
        } else {
          this.logger.warn('Recovery verification failed: Health check still failing after recovery');
        }
      }
      
      // Retry if configured
      if (!allSuccessful && this.config.retryFailedStrategies) {
        const backoffTime = this.calculateBackoffTime();
        
        this.logger.info(`Will retry recovery in ${backoffTime}ms`);
        
        // Schedule retry with backoff
        setTimeout(() => {
          this.isRecovering = false;
          this.performHealthCheck().catch(error => {
            this.logger.error('Error during health check after recovery backoff', error);
          });
        }, backoffTime);
      } else {
        this.isRecovering = false;
      }
      
      return allSuccessful;
    } catch (error) {
      this.logger.error('Unexpected error during recovery', error);
      this.isRecovering = false;
      return false;
    }
  }
  
  /**
   * Selects appropriate recovery strategies based on failed health checks
   */
  private selectRecoveryStrategies(failedChecks: HealthCheckResult[]): RecoveryStrategy[] {
    const selectedStrategies: RecoveryStrategy[] = [];
    const failedCheckIds = failedChecks.map(check => check.id);
    const failedComponents = new Set(failedChecks.map(check => check.component));
    
    // First select strategies that directly target failed health checks
    for (const strategy of this.recoveryStrategies.values()) {
      // Skip if max attempts reached for this strategy
      if (strategy.attempts >= this.config.maxAttemptsPerStrategy) {
        continue;
      }
      
      // Check if this strategy is for a failed component
      if (failedComponents.has(strategy.component)) {
        selectedStrategies.push(strategy);
        continue;
      }
      
      // Check if this strategy targets any of the failed health checks
      const targetsFailedCheck = strategy.requiredHealthChecks.some(checkId => 
        failedCheckIds.includes(checkId)
      );
      
      if (targetsFailedCheck) {
        selectedStrategies.push(strategy);
      }
    }
    
    // If no specific strategies found, add general recovery strategies
    if (selectedStrategies.length === 0) {
      for (const strategy of this.recoveryStrategies.values()) {
        if (strategy.requiredHealthChecks.length === 0 && 
            strategy.attempts < this.config.maxAttemptsPerStrategy) {
          selectedStrategies.push(strategy);
        }
      }
    }
    
    // Sort strategies by dependencies
    return this.sortStrategiesByDependencies(selectedStrategies);
  }
  
  /**
   * Sorts recovery strategies to respect dependencies
   */
  private sortStrategiesByDependencies(strategies: RecoveryStrategy[]): RecoveryStrategy[] {
    // Build dependency graph
    const graph: Record<string, string[]> = {};
    const result: RecoveryStrategy[] = [];
    const visited = new Set<string>();
    const temp = new Set<string>();
    
    // Initialize graph
    for (const strategy of strategies) {
      graph[strategy.id] = strategy.dependencies.filter(dep => 
        strategies.some(s => s.id === dep)
      );
    }
    
    // Topological sort function
    const visit = (id: string) => {
      if (temp.has(id)) {
        // Circular dependency detected
        this.logger.warn(`Circular dependency detected in recovery strategies: ${id}`);
        return;
      }
      
      if (visited.has(id)) {
        return;
      }
      
      temp.add(id);
      
      // Visit all dependencies
      const deps = graph[id] || [];
      for (const dep of deps) {
        visit(dep);
      }
      
      temp.delete(id);
      visited.add(id);
      
      // Add strategy to result
      const strategy = strategies.find(s => s.id === id);
      if (strategy) {
        result.push(strategy);
      }
    };
    
    // Visit all nodes
    for (const strategy of strategies) {
      visit(strategy.id);
    }
    
    // Critical strategies first, then sorted by dependencies
    return result.sort((a, b) => {
      if (a.critical && !b.critical) return -1;
      if (!a.critical && b.critical) return 1;
      return 0;
    });
  }
  
  /**
   * Executes recovery strategies
   */
  private async executeRecoveryStrategies(
    strategies: RecoveryStrategy[]
  ): Promise<RecoveryAttemptResult[]> {
    const results: RecoveryAttemptResult[] = [];
    
    // Execute in parallel or sequentially based on configuration
    if (this.config.strategyExecution.parallel) {
      // Parallel execution
      const promises = strategies.map(strategy => 
        this.executeRecoveryStrategy(strategy)
      );
      
      results.push(...await Promise.all(promises));
    } else {
      // Sequential execution
      for (const strategy of strategies) {
        const result = await this.executeRecoveryStrategy(strategy);
        results.push(result);
        
        // If abortOnCriticalFailure is enabled and a critical strategy failed, stop
        if (!result.success && 
            strategy.critical && 
            this.config.strategyExecution.abortOnCriticalFailure) {
          this.logger.error(`Aborting recovery: Critical strategy ${strategy.name} failed`);
          break;
        }
      }
    }
    
    return results;
  }
  
  /**
   * Executes a single recovery strategy
   */
  private async executeRecoveryStrategy(
    strategy: RecoveryStrategy
  ): Promise<RecoveryAttemptResult> {
    const startTime = performance.now();
    let success = false;
    let error = null;
    
    // Update strategy metadata
    strategy.attempts++;
    strategy.lastAttemptTime = Date.now();
    
    this.logger.info(`Executing recovery strategy: ${strategy.name} (attempt ${strategy.attempts})`);
    
    try {
      // Execute with timeout
      success = await this.executeWithTimeout(
        strategy.fn,
        this.config.strategyExecution.timeout
      );
      
      strategy.lastSuccess = success;
    } catch (e) {
      error = e as Error;
      success = false;
      strategy.lastSuccess = false;
      
      this.logger.error(`Error executing recovery strategy ${strategy.name}`, error);
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Create result
    const result: RecoveryAttemptResult = {
      id: strategy.id,
      strategyName: strategy.name,
      component: strategy.component,
      success,
      error,
      timestamp: Date.now(),
      duration
    };
    
    // Add to history
    this.recoveryHistory.push(result);
    
    // Limit history size
    if (this.recoveryHistory.length > 100) {
      this.recoveryHistory.shift();
    }
    
    // Emit recovery event if configured
    if (this.config.notifications.emitRecoveryEvents) {
      this.emitRecoveryEvent(result);
    }
    
    return result;
  }
  
  /**
   * Executes a function with a timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      // Timeout handler
      const timeoutId = setTimeout(() => {
        reject(new Error(`Execution timed out after ${timeout}ms`));
      }, timeout);
      
      // Execute function
      fn().then(
        result => {
          clearTimeout(timeoutId);
          resolve(result);
        },
        error => {
          clearTimeout(timeoutId);
          reject(error);
        }
      );
    });
  }
  
  /**
   * Calculates backoff time for retry
   */
  private calculateBackoffTime(): number {
    if (!this.config.progressiveBackoff) {
      return this.config.recoveryAttemptCooldown;
    }
    
    // Exponential backoff: base * 2^attempts (capped at 2 minutes)
    const base = this.config.recoveryAttemptCooldown;
    const backoff = base * Math.pow(2, this.recoveryAttempts - 1);
    
    // Cap at 2 minutes (120000ms)
    return Math.min(backoff, 120000);
  }
  
  /**
   * Saves the current state before recovery
   */
  private saveState(): void {
    try {
      // This is a placeholder for actual state saving logic
      // In a real implementation, this would save critical bridge state
      this.lastKnownGoodState = {
        timestamp: Date.now(),
        // Additional state data would be captured here
      };
      
      this.logger.debug('Saved state before recovery');
    } catch (error) {
      this.logger.error('Error saving state before recovery', error);
    }
  }
  
  /**
   * Restores state after failed recovery
   */
  private restoreState(): boolean {
    if (!this.lastKnownGoodState) {
      this.logger.warn('No saved state available to restore');
      return false;
    }
    
    try {
      // This is a placeholder for actual state restoration logic
      // In a real implementation, this would restore the saved bridge state
      
      this.logger.info('Restored state from before recovery');
      return true;
    } catch (error) {
      this.logger.error('Error restoring state', error);
      return false;
    }
  }
  
  /**
   * Handles bridge status changes
   */
  private handleStatusChanged(status: BridgeStatusInfo): void {
    // If status improved to HEALTHY, reset recovery attempts
    if (status.state === BridgeErrorState.HEALTHY) {
      this.recoveryAttempts = 0;
      this.logger.debug('Reset recovery attempts counter due to HEALTHY status');
    }
    
    // Emit status event if configured
    if (this.config.notifications.emitStatusEvents) {
      this.emitStatusEvent(status);
    }
  }
  
  /**
   * Emits a health check event
   */
  private emitHealthCheckEvent(results: HealthCheckResult[], healthPercentage: number): void {
    const event = new CustomEvent('bridge:healthCheck', {
      detail: {
        timestamp: Date.now(),
        results,
        healthPercentage,
        healthy: results.every(r => r.healthy),
        unhealthyCount: results.filter(r => !r.healthy).length
      }
    });
    
    window.dispatchEvent(event);
  }
  
  /**
   * Emits a recovery event
   */
  private emitRecoveryEvent(result: RecoveryAttemptResult): void {
    const event = new CustomEvent('bridge:recovery', {
      detail: {
        timestamp: Date.now(),
        attempt: this.recoveryAttempts,
        result
      }
    });
    
    window.dispatchEvent(event);
  }
  
  /**
   * Emits a status event
   */
  private emitStatusEvent(status: BridgeStatusInfo): void {
    const event = new CustomEvent('bridge:status', {
      detail: {
        timestamp: Date.now(),
        status
      }
    });
    
    window.dispatchEvent(event);
  }
  
  /**
   * Generates a unique ID
   */
  private generateId(prefix: string = ''): string {
    return `${prefix}${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Gets health check statistics
   */
  getHealthCheckStats(): any {
    const checksByComponent: Record<string, any> = {};
    const checksByCategory: Record<string, any> = {};
    
    // Group by component
    for (const [id, check] of this.healthChecks.entries()) {
      const component = check.component;
      if (!checksByComponent[component]) {
        checksByComponent[component] = {
          total: 0,
          healthy: 0,
          unhealthy: 0,
          critical: 0,
          unknown: 0
        };
      }
      
      checksByComponent[component].total++;
      
      if (check.critical) {
        checksByComponent[component].critical++;
      }
      
      if (check.lastResult === null) {
        checksByComponent[component].unknown++;
      } else if (check.lastResult) {
        checksByComponent[component].healthy++;
      } else {
        checksByComponent[component].unhealthy++;
      }
    }
    
    // Group by category
    for (const [id, check] of this.healthChecks.entries()) {
      const category = check.category;
      if (!checksByCategory[category]) {
        checksByCategory[category] = {
          total: 0,
          healthy: 0,
          unhealthy: 0,
          critical: 0,
          unknown: 0
        };
      }
      
      checksByCategory[category].total++;
      
      if (check.critical) {
        checksByCategory[category].critical++;
      }
      
      if (check.lastResult === null) {
        checksByCategory[category].unknown++;
      } else if (check.lastResult) {
        checksByCategory[category].healthy++;
      } else {
        checksByCategory[category].unhealthy++;
      }
    }
    
    // Calculate overall health
    let totalWeight = 0;
    let healthyWeight = 0;
    
    for (const check of this.healthChecks.values()) {
      totalWeight += check.weight;
      if (check.lastResult === true) {
        healthyWeight += check.weight;
      }
    }
    
    const healthPercentage = totalWeight > 0 
      ? (healthyWeight / totalWeight) * 100 
      : 100;
    
    return {
      total: this.healthChecks.size,
      healthy: Array.from(this.healthChecks.values()).filter(c => c.lastResult === true).length,
      unhealthy: Array.from(this.healthChecks.values()).filter(c => c.lastResult === false).length,
      unknown: Array.from(this.healthChecks.values()).filter(c => c.lastResult === null).length,
      critical: Array.from(this.healthChecks.values()).filter(c => c.critical).length,
      healthPercentage,
      byComponent: checksByComponent,
      byCategory: checksByCategory,
      history: this.healthCheckHistory.slice(-10) // Last 10 checks
    };
  }
  
  /**
   * Gets recovery statistics
   */
  getRecoveryStats(): any {
    return {
      isRecovering: this.isRecovering,
      attempts: this.recoveryAttempts,
      strategies: {
        total: this.recoveryStrategies.size,
        byComponent: Array.from(this.recoveryStrategies.values()).reduce((acc, strategy) => {
          const component = strategy.component;
          acc[component] = (acc[component] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        critical: Array.from(this.recoveryStrategies.values()).filter(s => s.critical).length
      },
      history: this.recoveryHistory.slice(-10) // Last 10 recoveries
    };
  }
  
  /**
   * Manually runs a health check
   */
  runHealthCheck(): Promise<boolean> {
    return this.performHealthCheck();
  }
  
  /**
   * Manually runs a recovery attempt
   */
  async runRecovery(): Promise<boolean> {
    if (this.isRecovering) {
      this.logger.warn('Recovery already in progress');
      return false;
    }
    
    // Run a health check first to identify issues
    const healthCheckResult = await this.performHealthCheck();
    
    if (healthCheckResult) {
      this.logger.info('No recovery needed, system is healthy');
      return true;
    }
    
    // Get failed checks from most recent health check history
    const recentChecks = this.healthCheckHistory
      .filter(check => check.timestamp > Date.now() - 60000) // Last minute
      .sort((a, b) => b.timestamp - a.timestamp); // Most recent first
    
    const uniqueCheckIds = new Set<string>();
    const latestChecks: HealthCheckResult[] = [];
    
    // Get most recent result for each check
    for (const check of recentChecks) {
      if (!uniqueCheckIds.has(check.id)) {
        uniqueCheckIds.add(check.id);
        latestChecks.push(check);
      }
    }
    
    const failedChecks = latestChecks.filter(check => !check.healthy);
    
    if (failedChecks.length === 0) {
      this.logger.warn('No failed health checks found to guide recovery');
      return false;
    }
    
    return await this.attemptRecovery(failedChecks);
  }
  
  /**
   * Resets the self-healing system
   */
  reset(): void {
    // Stop automatic checks
    this.stopAutomaticChecks();
    
    // Reset recovery state
    this.isRecovering = false;
    this.recoveryAttempts = 0;
    this.recoveryHistory = [];
    this.healthCheckHistory = [];
    this.lastKnownGoodState = null;
    
    // Reset health check results
    for (const check of this.healthChecks.values()) {
      check.lastResult = null;
      check.lastCheckTime = null;
    }
    
    // Reset strategy attempts
    for (const strategy of this.recoveryStrategies.values()) {
      strategy.attempts = 0;
      strategy.lastAttemptTime = null;
      strategy.lastSuccess = null;
    }
    
    // Restart automatic checks if configured
    if (this.config.automaticChecks) {
      this.startAutomaticChecks();
    }
    
    this.logger.info('Self-healing system reset');
  }
  
  /**
   * Cleans up resources
   */
  cleanup(): void {
    // Stop automatic checks
    this.stopAutomaticChecks();
    
    // Unsubscribe from status changes
    if (this.onStatusChangedUnsubscribe) {
      this.onStatusChangedUnsubscribe();
      this.onStatusChangedUnsubscribe = null;
    }
    
    // Clear health checks and recovery strategies
    this.healthChecks.clear();
    this.recoveryStrategies.clear();
    
    this.logger.info('Self-healing system cleaned up');
  }
}