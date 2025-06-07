import { App } from 'vue';
import { Router } from 'vue-router';
import { getTelemetryService } from '@/services/TelemetryService';
import { usePerformanceMonitor } from '@/utils/PerformanceMonitor';

export interface MonitoringOptions {
  telemetryEnabled?: boolean;
  performanceEnabled?: boolean;
  errorTrackingEnabled?: boolean;
  userTrackingEnabled?: boolean;
  apiTrackingEnabled?: boolean;
}

export function createMonitoring(options: MonitoringOptions = {}) {
  const {
<<<<<<< HEAD
    _telemetryEnabled = true,
=======
    telemetryEnabled = true,
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
    performanceEnabled = true,
    errorTrackingEnabled = true,
    userTrackingEnabled = true,
    apiTrackingEnabled = true
  } = options;

  return {
    install(app: App, { router }: { router?: Router } = {}) {
      const telemetry = getTelemetryService();
      const performanceMonitor = usePerformanceMonitor();

      // Track app initialization
      const initStartTime = performance.now();

      // Global error handler
      if (errorTrackingEnabled) {
        app.config.errorHandler = (error: Error | unknown, instance, info) => {
          console.error('Vue Error:', error);
          
          telemetry.trackError(error as Error, {
            component: instance?.$options.name || 'Unknown',
            info,
            lifecycle: 'errorHandler'
          });
        };

        // Track warnings in development
        if (import.meta.env.DEV) {
<<<<<<< HEAD
          app.(config as any).warnHandler = (msg: any, instance: any, trace: any) => {
=======
          app.config.warnHandler = (msg: any, instance: any, trace: any) => {
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
            console.warn('Vue Warning:', msg);
            
            telemetry.track({
              type: 'error',
              category: 'warning',
              action: 'vue-warning',
              label: msg,
              metadata: {
                component: instance?.$options.name || 'Unknown',
                trace
              }
            });
          };
        }
      }

      // Router monitoring
      if (router && userTrackingEnabled) {
        router.beforeEach((to, from) => {
          // Track navigation
          telemetry.trackUserAction('navigate', 'router', to.path);
          
          // Track route performance
          const navigationStart = performance.now();
          
          router.afterEach(() => {
            const navigationEnd = performance.now();
            const duration = navigationEnd - navigationStart;
            
            telemetry.track({
              type: 'performance',
              category: 'navigation',
              action: 'route-change',
              label: `${from.path} → ${to.path}`,
              value: duration
            });
          });
          
          return true;
        });

        // Track router errors
        router.onError((error) => {
          telemetry.trackError(error, {
            type: 'router-error'
          });
        });
      }

      // Performance monitoring
      if (performanceEnabled) {
        // Track initial load performance
        if (typeof window !== 'undefined' && window.performance) {
          window.addEventListener('load', () => {
            const loadTime = performance.now() - initStartTime;
            const paintMetrics = performance.getEntriesByType('paint');
            
            telemetry.track({
              type: 'performance',
              category: 'load',
              action: 'initial-load',
              value: loadTime,
              metadata: {
                firstPaint: paintMetrics.find(m => m.name === 'first-paint')?.startTime,
                firstContentfulPaint: paintMetrics.find(m => m.name === 'first-contentful-paint')?.startTime,
                domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
                loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart
              }
            });
          });
        }

        // Periodic performance tracking
        let performanceInterval: ReturnType<typeof setInterval> | null = null;
        
        const startPerformanceTracking = () => {
          performanceInterval = setInterval(() => {
            const metrics = performanceMonitor.metrics.value;
            telemetry.trackPerformance(metrics);
            
            // Alert on performance degradation
            if (metrics.fps < 30 || metrics.memoryUsed > 500) {
              telemetry.track({
                type: 'performance',
                category: 'alert',
                action: 'performance-degradation',
                metadata: {
                  fps: metrics.fps,
                  memoryUsed: metrics.memoryUsed,
                  threshold: { fps: 30, memory: 500 }
                }
              });
            }
          }, 60000); // Every minute
        };

        // Start tracking when app is mounted
        app.mount = () => {
          startPerformanceTracking();
        };

        // Cleanup on unmount
        app.unmount = () => {
          if (performanceInterval) {
            clearInterval(performanceInterval);
          }
        };
      }

      // API tracking via axios interceptors
<<<<<<< HEAD
      if (apiTrackingEnabled && (window as any).axios) {
        // Request interceptor
        (window as any).axios.interceptors.request.use(
=======
      if (apiTrackingEnabled && window.axios) {
        // Request interceptor
        window.axios.interceptors.request.use(
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
          (config: any) => {
            config.metadata = { startTime: performance.now() };
            return config;
          },
          (error: Error | unknown) => {
            telemetry.trackError(error as Error, { phase: 'request' });
            return Promise.reject(error);
          }
        );

        // Response interceptor
<<<<<<< HEAD
        (window as any).axios.interceptors.response.use(
=======
        window.axios.interceptors.response.use(
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
          (response: any) => {
            const duration = performance.now() - response.config.metadata?.startTime;
            const endpoint = response.config.url || 'unknown';
            const method = response.config.method?.toUpperCase() || 'GET';
            
            telemetry.trackApiCall(endpoint, duration, response.status, method);
            
            return response;
          },
          (error: Error | unknown) => {
            const duration = performance.now() - (error as any).config?.metadata?.startTime;
            const endpoint = (error as any).config?.url || 'unknown';
            const method = (error as any).config?.method?.toUpperCase() || 'GET';
            const status = (error as any).response?.status || 0;
            
            telemetry.trackApiCall(endpoint, duration, status, method);
            telemetry.trackError(error as Error, {
              phase: 'response',
              endpoint,
              status
            });
            
            return Promise.reject(error);
          }
        );
      }

      // Provide telemetry service globally
      app.provide('telemetry', telemetry);
      app.config.globalProperties.$telemetry = telemetry;

      // Development tools
      if (import.meta.env.DEV) {
        // Expose monitoring tools in console
<<<<<<< HEAD
        (window as any).__MONITORING__ = {
=======
        window.__MONITORING__ = {
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
          telemetry,
          performanceMonitor,
          getFeatureUsage: () => telemetry.getFeatureUsageReport(),
          getApiPerformance: () => telemetry.getApiPerformanceReport(),
          calculateBaseline: () => telemetry.calculateBaseline(),
          enableDebug: () => {
            localStorage.setItem('telemetry-debug', 'true');
            console.log('Telemetry debug enabled');
          },
          disableDebug: () => {
            localStorage.removeItem('telemetry-debug');
            console.log('Telemetry debug disabled');
          }
        };

        console.log(
          '%c🔍 Monitoring Tools Available',
          'color: #4CAF50; font-weight: bold;',
          '\n\nAccess monitoring tools via window.__MONITORING__\n' +
          '- getFeatureUsage(): See feature usage stats\n' +
          '- getApiPerformance(): See API performance metrics\n' +
          '- calculateBaseline(): Calculate performance baseline\n' +
          '- enableDebug(): Enable telemetry debug logging\n' +
          '- disableDebug(): Disable telemetry debug logging'
        );
      }
    }
  };
}