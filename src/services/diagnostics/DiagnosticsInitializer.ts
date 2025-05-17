/**
 * Diagnostics Initializer
 * 
 * Zentraler Service zur garantierten Initialisierung aller Diagnose-Komponenten
 * in der richtigen Reihenfolge mit robuster Fehlerbehandlung
 */

import { domErrorDetector } from '@/utils/domErrorDiagnosticsFixed';
import { routerService } from '@/services/router/RouterServiceFixed';
import { unifiedDiagnosticsService } from '@/services/diagnostics/UnifiedDiagnosticsServiceFixed';
import type { Router } from 'vue-router';

export interface DiagnosticsServices {
  domErrorDetector: typeof domErrorDetector;
  routerService: typeof routerService;
  unifiedDiagnosticsService: typeof unifiedDiagnosticsService;
  initialized: boolean;
  initTime: number;
  errors: Error[];
}

export class DiagnosticsInitializer {
  private static instance: DiagnosticsInitializer;
  private initialized = false;
  private services: DiagnosticsServices;
  private initPromise: Promise<DiagnosticsServices> | null = null;
  
  private constructor() {
    this.services = {
      domErrorDetector,
      routerService,
      unifiedDiagnosticsService,
      initialized: false,
      initTime: 0,
      errors: []
    };
  }
  
  public static getInstance(): DiagnosticsInitializer {
    if (!DiagnosticsInitializer.instance) {
      DiagnosticsInitializer.instance = new DiagnosticsInitializer();
    }
    return DiagnosticsInitializer.instance;
  }
  
  /**
   * Initialisiert alle Diagnose-Services in der richtigen Reihenfolge
   */
  public async initialize(router?: Router): Promise<DiagnosticsServices> {
    // Return existing promise if initialization is in progress
    if (this.initPromise) {
      return this.initPromise;
    }
    
    // Return immediately if already initialized
    if (this.initialized) {
      return this.services;
    }
    
    this.initPromise = this.performInitialization(router);
    
    try {
      const result = await this.initPromise;
      this.initialized = true;
      return result;
    } catch (error) {
      console.error('Failed to initialize diagnostics:', error);
      throw error;
    } finally {
      this.initPromise = null;
    }
  }
  
  private async performInitialization(router?: Router): Promise<DiagnosticsServices> {
    const startTime = Date.now();
    console.log('Starting diagnostics initialization...');
    
    try {
      // Step 1: Initialize DOM Error Detector
      await this.initializeDomErrorDetector();
      
      // Step 2: Initialize Router Service
      await this.initializeRouterService(router);
      
      // Step 3: Initialize Unified Diagnostics Service
      await this.initializeUnifiedDiagnostics();
      
      // Step 4: Setup cross-service connections
      await this.setupServiceConnections();
      
      this.services.initialized = true;
      this.services.initTime = Date.now() - startTime;
      
      console.log(`Diagnostics initialized in ${this.services.initTime}ms`);
      return this.services;
      
    } catch (error) {
      console.error('Error during diagnostics initialization:', error);
      if (error instanceof Error) {
        this.services.errors.push(error);
      }
      throw error;
    }
  }
  
  private async initializeDomErrorDetector(): Promise<void> {
    try {
      // Verify domErrorDetector is available
      if (!domErrorDetector) {
        throw new Error('domErrorDetector is not available');
      }
      
      // Add global event listeners
      window.addEventListener('dom-error-detected', (event: CustomEvent) => {
        console.warn('DOM error detected:', event.detail);
        // Trigger recovery if needed
        if (event.detail.hasErrorScreen) {
          this.attemptRecovery(event.detail);
        }
      });
      
      console.log('DOM Error Detector initialized');
    } catch (error) {
      console.error('Failed to initialize DOM Error Detector:', error);
      throw error;
    }
  }
  
  private async initializeRouterService(router?: Router): Promise<void> {
    try {
      // Initialize router service with provided router or wait for it
      if (router) {
        routerService.setRouter(router);
      }
      
      // Wait for router to be ready
      await routerService.waitForRouter();
      
      console.log('Router Service initialized');
    } catch (error) {
      console.error('Failed to initialize Router Service:', error);
      throw error;
    }
  }
  
  private async initializeUnifiedDiagnostics(): Promise<void> {
    try {
      // Initialize unified diagnostics
      await unifiedDiagnosticsService.initialize();
      
      console.log('Unified Diagnostics Service initialized');
    } catch (error) {
      console.error('Failed to initialize Unified Diagnostics:', error);
      throw error;
    }
  }
  
  private async setupServiceConnections(): Promise<void> {
    try {
      // Setup listeners and connections between services
      
      // Monitor router health
      try {
        const router = (window as any)?.$router || (window as any)?.app?.$router;
        
        if (router) {
          router.beforeEach((to, from, next) => {
            // Update diagnostics on route change
            this.services.unifiedDiagnosticsService.updateRouterHealth(true);
            next();
          });
          
          router.afterEach(() => {
            // Check for DOM errors after navigation
            setTimeout(() => {
              const errorState = this.services.domErrorDetector.detectErrorState();
              if (errorState.hasErrorScreen) {
                this.services.unifiedDiagnosticsService.recordError(
                  new Error(`DOM error detected: ${errorState.errorType}`),
                  'diagnostics'
                );
              }
            }, 100);
          });
        }
      } catch (error) {
        console.warn('Could not setup router monitoring:', error);
      }
      
      console.log('Service connections established');
    } catch (error) {
      console.error('Failed to setup service connections:', error);
      throw error;
    }
  }
  
  private attemptRecovery(diagnostics: any): void {
    console.log('Attempting recovery for error state:', diagnostics);
    
    // Clear error elements
    const cleared = domErrorDetector.clearErrorElements();
    if (cleared) {
      console.log('Error elements cleared');
    }
    
    // Try router navigation
    try {
      // Use window router if available
      const router = (window as any)?.$router || (window as any)?.app?.$router;
      if (router) {
        router.push('/').catch(err => {
          console.error('Router navigation failed:', err);
          window.location.href = '/';
        });
      } else {
        console.log('No router available, falling back to location redirect');
        window.location.href = '/';
      }
    } catch (err) {
      console.error('Recovery navigation error:', err);
      window.location.href = '/';
    }
  }
  
  /**
   * Get current diagnostics status
   */
  public getStatus(): DiagnosticsServices {
    return { ...this.services };
  }
  
  /**
   * Reset initialization state (for testing)
   */
  public reset(): void {
    this.initialized = false;
    this.initPromise = null;
    this.services.errors = [];
  }
}

// Export singleton instance
export const diagnosticsInitializer = DiagnosticsInitializer.getInstance();