import { ref, onMounted, onUnmounted, computed } from 'vue';
import type { Ref, ComputedRef } from 'vue';

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsed: number;
  memoryLimit: number;
  renderCount: number;
  updateCount: number;
  componentRenderTimes: Map<string, number>;
}

export interface ComponentPerformance {
  name: string;
  renderTime: number;
  renderCount: number;
  averageRenderTime: number;
}

class PerformanceMonitorImpl {
  private frameCount = 0;
  private lastFrameTime = 0;
  private lastFPSUpdate = 0;
  private fps = 0;
  private frameTime = 0;
  
  private renderCount = 0;
  private updateCount = 0;
  private componentRenderTimes = new Map<string, { total: number; count: number }>();
  
  private animationFrameId: number | null = null;
  private metricsCallbacks: Set<(metrics: PerformanceMetrics) => void> = new Set();

  start(): void {
    if (this.animationFrameId !== null) return;
    
    this.lastFrameTime = performance.now();
    this.lastFPSUpdate = this.lastFrameTime;
    this.measureFrame();
  }

  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  recordRender(componentName?: string): void {
    this.renderCount++;
    if (componentName) {
      this.recordComponentRender(componentName, 0);
    }
  }

  recordUpdate(): void {
    this.updateCount++;
  }

  recordComponentRender(componentName: string, renderTime: number): void {
    const existing = this.componentRenderTimes.get(componentName) || { total: 0, count: 0 };
    existing.total += renderTime;
    existing.count++;
    this.componentRenderTimes.set(componentName, existing);
  }

  onMetricsUpdate(callback: (metrics: PerformanceMetrics) => void): () => void {
    this.metricsCallbacks.add(callback);
    return () => this.metricsCallbacks.delete(callback);
  }

  getMetrics(): PerformanceMetrics {
    const memory = (performance as any).memory;
    return {
      fps: this.fps,
      frameTime: this.frameTime,
      memoryUsed: memory ? memory.usedJSHeapSize / 1048576 : 0, // MB
      memoryLimit: memory ? memory.jsHeapSizeLimit / 1048576 : 0, // MB
      renderCount: this.renderCount,
      updateCount: this.updateCount,
      componentRenderTimes: new Map(this.componentRenderTimes)
    };
  }

  getComponentPerformance(): ComponentPerformance[] {
    return Array.from(this.componentRenderTimes.entries()).map(([name, data]: any) => ({
      name,
      renderTime: data.total,
      renderCount: data.count,
      averageRenderTime: data.count > 0 ? data.total / data.count : 0
    }));
  }

  reset(): void {
    this.renderCount = 0;
    this.updateCount = 0;
    this.componentRenderTimes.clear();
  }

  private measureFrame = (): void => {
    const now = performance.now();
    this.frameTime = now - this.lastFrameTime;
    this.lastFrameTime = now;
    this.frameCount++;

    // Update FPS every second
    if (now - this.lastFPSUpdate >= 1000) {
<<<<<<< HEAD
      this.fps = Math.round(this.frameCount * 1000) / (now - this.lastFPSUpdate));
=======
      this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFPSUpdate));
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
      this.frameCount = 0;
      this.lastFPSUpdate = now;
      
      // Notify listeners
      const metrics = this.getMetrics();
      this.metricsCallbacks.forEach(callback => callback(metrics));
    }

    this.animationFrameId = requestAnimationFrame(this.measureFrame);
  };
}

// Singleton instance
const monitor = new PerformanceMonitorImpl();

/**
 * Vue composable for performance monitoring
 */
export function usePerformanceMonitor() {
  const metrics = ref<PerformanceMetrics>({
    fps: 0,
    frameTime: 0,
    memoryUsed: 0,
    memoryLimit: 0,
    renderCount: 0,
    updateCount: 0,
    componentRenderTimes: new Map()
  });

  const componentPerformance = computed(() => 
    monitor.getComponentPerformance()
      .sort((a, b) => b.averageRenderTime - a.averageRenderTime)
  );

  const isHealthy = computed(() => 
    metrics.value.fps >= 30 && 
    metrics.value.frameTime < 33 && // ~30 FPS threshold
    (metrics.value.memoryLimit === 0 || 
     metrics.value.memoryUsed / metrics.value.memoryLimit < 0.9)
  );

  let unsubscribe: (() => void) | null = null;

  onMounted(() => {
    monitor.start();
    unsubscribe = monitor.onMetricsUpdate((newMetrics) => {
      metrics.value = newMetrics;
    });
  });

  onUnmounted(() => {
    unsubscribe?.();
  });

  return {
    metrics,
    componentPerformance,
    isHealthy,
    recordRender: monitor.recordRender.bind(monitor),
    recordUpdate: monitor.recordUpdate.bind(monitor),
    recordComponentRender: monitor.recordComponentRender.bind(monitor),
    reset: monitor.reset.bind(monitor)
  };
}

/**
 * Performance measurement decorator for components
 */
export function measurePerformance(componentName: string) {
<<<<<<< HEAD
  return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
=======
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
    const originalMethod = descriptor.value;
    
    descriptor.value = function (...args: any[]) {
      const start = performance.now();
      const result = originalMethod.apply(this, args);
      const renderTime = performance.now() - start;
      
      monitor.recordComponentRender(componentName, renderTime);
      
      return result;
    };
    
    return descriptor;
  };
}

/**
 * Development-only performance dashboard component
 */
export const PerformanceDashboard = {
  name: 'PerformanceDashboard',
  setup() {
    const { metrics, componentPerformance, isHealthy } = usePerformanceMonitor();
    
    const fpsClass = computed(() => {
      if (metrics.value.fps >= 55) return 'text-green-500';
      if (metrics.value.fps >= 30) return 'text-yellow-500';
      return 'text-red-500';
    });
    
    const memoryPercentage = computed(() => {
      if (metrics.value.memoryLimit === 0) return 0;
      return Math.round((metrics.value.memoryUsed / metrics.value.memoryLimit) * 100);
    });
    
    return {
      metrics,
      componentPerformance,
      isHealthy,
      fpsClass,
      memoryPercentage
    };
  },
  template: `
    <div v-if="process.env.NODE_ENV === 'development'" 
         class="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-lg text-sm font-mono z-50">
      <h3 class="text-lg font-bold mb-2">Performance Monitor</h3>
      
      <div class="grid grid-cols-2 gap-2 mb-2">
        <div>FPS: <span :class="fpsClass">{{ metrics.fps }}</span></div>
        <div>Frame: {{ metrics.frameTime.toFixed(1) }}ms</div>
        <div>Memory: {{ metrics.memoryUsed.toFixed(1) }}MB ({{ memoryPercentage }}%)</div>
        <div>Renders: {{ metrics.renderCount }}</div>
      </div>
      
      <div class="text-xs mt-2" v-if="componentPerformance.length > 0">
        <div class="font-bold mb-1">Slowest Components:</div>
        <div v-for="comp in componentPerformance.slice(0, 3)" :key="comp.name" class="text-gray-300">
          {{ comp.name }}: {{ comp.averageRenderTime.toFixed(2) }}ms
        </div>
      </div>
      
      <div class="mt-2 text-xs" :class="isHealthy ? 'text-green-400' : 'text-red-400'">
        Status: {{ isHealthy ? '✓ Healthy' : '⚠ Performance Issues' }}
      </div>
    </div>
  `
};