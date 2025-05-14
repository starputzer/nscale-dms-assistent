/**
 * Performance Testing Utilities
 * 
 * This file contains utilities for measuring performance metrics
 * including timing functions, memory usage tracking, and report generation.
 */

/**
 * Start a performance measurement
 * 
 * @param name - Name of the measurement
 * @returns The start time in milliseconds
 */
export function startMeasurement(name: string): number {
  // Mark the start of the measurement
  window.performance.mark(`${name}-start`);
  
  // Return the start time
  return window.performance.now();
}

/**
 * End a performance measurement and calculate duration
 * 
 * @param name - Name of the measurement (should match the startMeasurement call)
 * @returns The duration in milliseconds
 */
export function endMeasurement(name: string): number {
  // Mark the end of the measurement
  window.performance.mark(`${name}-end`);
  
  // Create the measurement
  window.performance.measure(
    name,
    `${name}-start`,
    `${name}-end`
  );
  
  // Get the measurement
  const measurements = window.performance.getEntriesByName(name, 'measure');
  
  // Get the duration from the latest measurement
  const duration = measurements.length > 0 ? measurements[measurements.length - 1].duration : 0;
  
  // Return the duration
  return duration;
}

/**
 * Measure the execution time of a function
 * 
 * @param fn - Function to measure
 * @returns Promise that resolves to the execution time in milliseconds
 */
export async function measureFunctionTime(fn: Function): Promise<number> {
  const startTime = window.performance.now();
  
  try {
    // Execute the function
    const result = fn();
    
    // Handle promise or synchronous functions
    if (result instanceof Promise) {
      await result;
    }
    
    const endTime = window.performance.now();
    return endTime - startTime;
  } catch (error) {
    const endTime = window.performance.now();
    console.error('Error while measuring function time:', error);
    return endTime - startTime;
  }
}

/**
 * Track memory usage
 * 
 * @returns Promise that resolves to the current memory usage in bytes
 */
export async function trackMemoryUsage(): Promise<number> {
  // Use the performance.memory API if available (Chrome)
  if (window.performance && (window.performance as any).memory) {
    return (window.performance as any).memory.usedJSHeapSize;
  }
  
  // For test environments without memory APIs, return a mock value
  // This allows tests to run in Node/JSDOM environment
  return 1000000; // Mock 1MB
}

/**
 * Generate a performance report from multiple measurements
 * 
 * @param measurements - Object containing performance measurements
 * @returns Formatted performance report
 */
export function createPerformanceReport(measurements: Record<string, {
  value: number;
  threshold: number;
  unit: string;
}>): Record<string, {
  value: number;
  threshold: number;
  unit: string;
  status: 'pass' | 'warn' | 'fail';
  percentOfThreshold: number;
}> {
  const report: Record<string, any> = {};
  
  // Process each measurement
  for (const [name, data] of Object.entries(measurements)) {
    const { value, threshold, unit } = data;
    
    // Calculate percent of threshold
    const percentOfThreshold = (value / threshold) * 100;
    
    // Determine status
    let status: 'pass' | 'warn' | 'fail';
    if (percentOfThreshold <= 85) {
      status = 'pass'; // Less than 85% of threshold
    } else if (percentOfThreshold <= 100) {
      status = 'warn'; // Between 85% and 100% of threshold
    } else {
      status = 'fail'; // Exceeds threshold
    }
    
    // Add to report
    report[name] = {
      value,
      threshold,
      unit,
      status,
      percentOfThreshold: Math.round(percentOfThreshold),
    };
  }
  
  return report;
}

/**
 * Format a performance report as a string
 * 
 * @param report - Performance report object
 * @returns Formatted string representation of the report
 */
export function formatPerformanceReport(report: Record<string, {
  value: number;
  threshold: number;
  unit: string;
  status: 'pass' | 'warn' | 'fail';
  percentOfThreshold: number;
}>): string {
  let result = 'Performance Report:\n';
  result += '====================\n\n';
  
  // Add each measurement to the report
  for (const [name, data] of Object.entries(report)) {
    const { value, threshold, unit, status, percentOfThreshold } = data;
    
    // Format status with color indicators (for console output)
    let statusText = '';
    if (status === 'pass') {
      statusText = '✓ PASS';
    } else if (status === 'warn') {
      statusText = '⚠ WARN';
    } else {
      statusText = '✗ FAIL';
    }
    
    // Add measurement details
    result += `${name}:\n`;
    result += `  Value: ${value.toFixed(2)} ${unit}\n`;
    result += `  Threshold: ${threshold.toFixed(2)} ${unit}\n`;
    result += `  Percentage: ${percentOfThreshold}%\n`;
    result += `  Status: ${statusText}\n\n`;
  }
  
  // Add summary
  const totalTests = Object.keys(report).length;
  const passedTests = Object.values(report).filter(data => data.status === 'pass').length;
  const warnTests = Object.values(report).filter(data => data.status === 'warn').length;
  const failedTests = Object.values(report).filter(data => data.status === 'fail').length;
  
  result += `Summary: ${passedTests} passed, ${warnTests} warnings, ${failedTests} failed (${totalTests} total)\n`;
  
  return result;
}

/**
 * Measure frame rate during a high-load operation
 * 
 * @param duration - Duration to measure in milliseconds
 * @returns Promise that resolves to the average FPS during the operation
 */
export async function measureFrameRate(duration: number = 1000): Promise<number> {
  return new Promise((resolve) => {
    const frameCount = { count: 0 };
    const startTime = performance.now();
    
    function countFrame(time: number) {
      frameCount.count++;
      
      // Continue counting if we haven't reached the duration
      if (time - startTime < duration) {
        requestAnimationFrame(countFrame);
      } else {
        // Calculate FPS
        const elapsedTime = time - startTime;
        const fps = (frameCount.count * 1000) / elapsedTime;
        resolve(fps);
      }
    }
    
    // Start counting frames
    requestAnimationFrame(countFrame);
  });
}

/**
 * Measure time to first paint
 * 
 * @param componentMountFn - Function that mounts a component
 * @returns Promise that resolves to the time to first paint in milliseconds
 */
export async function measureTimeToFirstPaint(componentMountFn: Function): Promise<number> {
  // Set up performance observer for paint timing
  let paintTime = 0;
  
  // Only works in browsers with PerformanceObserver and paint timing support
  if (typeof PerformanceObserver !== 'undefined') {
    const paintPromise = new Promise<number>((resolve) => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          if (entry.name === 'first-paint') {
            resolve(entry.startTime);
          }
        }
      });
      
      // Start observing paint timing
      observer.observe({ entryTypes: ['paint'] });
      
      // Fallback if no paint event is detected
      setTimeout(() => resolve(performance.now()), 5000);
    });
    
    // Start timing
    const startTime = performance.now();
    
    // Mount the component
    await componentMountFn();
    
    // Get paint time
    paintTime = await paintPromise;
    
    return paintTime - startTime;
  }
  
  // Fallback for environments without paint timing
  const startTime = performance.now();
  await componentMountFn();
  return performance.now() - startTime;
}

/**
 * Capture long task timing
 * 
 * @param fn - Function to execute and measure for long tasks
 * @returns Promise that resolves to an array of long task durations
 */
export async function captureLongTasks(fn: Function): Promise<number[]> {
  const longTasks: number[] = [];
  
  // Only works in browsers with PerformanceObserver and longtask support
  if (typeof PerformanceObserver !== 'undefined') {
    // Create the promise to wait for completion
    const promise = new Promise<number[]>((resolve) => {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          for (const entry of entries) {
            longTasks.push(entry.duration);
          }
        });
        
        // Start observing long tasks
        observer.observe({ entryTypes: ['longtask'] });
        
        // Resolve after 5 seconds or when the function completes
        setTimeout(() => {
          observer.disconnect();
          resolve(longTasks);
        }, 5000);
      } catch (e) {
        // longtask might not be supported
        resolve([]);
      }
    });
    
    // Execute the function
    const result = fn();
    
    // Handle promise or synchronous functions
    if (result instanceof Promise) {
      await result;
    }
    
    // Get long tasks
    return promise;
  }
  
  // Fallback for environments without long task timing
  await fn();
  return [];
}

/**
 * Generate a complete performance profile
 * 
 * @param testResults - Collection of test results
 * @returns Complete performance profile
 */
export function generatePerformanceProfile(testResults: Record<string, any>): any {
  // Get current timestamp for the report
  const timestamp = new Date().toISOString();
  
  // Create the profile
  return {
    timestamp,
    results: testResults,
    summary: {
      totalTests: Object.keys(testResults).length,
      passingTests: Object.values(testResults).filter((result: any) => 
        result.status === 'pass'
      ).length,
      warningTests: Object.values(testResults).filter((result: any) => 
        result.status === 'warn'
      ).length,
      failingTests: Object.values(testResults).filter((result: any) => 
        result.status === 'fail'
      ).length,
    },
  };
}