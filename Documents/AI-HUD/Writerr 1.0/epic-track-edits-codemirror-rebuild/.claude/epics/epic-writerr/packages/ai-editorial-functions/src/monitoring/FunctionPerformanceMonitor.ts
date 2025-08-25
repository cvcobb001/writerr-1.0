/**
 * Function Performance Monitor
 * Monitors performance of editorial functions with specialized metrics
 */

import { performanceProfiler, PerformanceCategory } from '@writerr/shared/optimization';
import { globalEventBus } from '@writerr/shared';

export interface FunctionMetrics {
  functionId: string;
  executionCount: number;
  totalExecutionTime: number;
  averageExecutionTime: number;
  successRate: number;
  errorRate: number;
  confidenceScore: number;
  memoryUsage: number;
  cacheHitRate: number;
  lastExecuted: number;
}

export interface HotReloadMetrics {
  reloadCount: number;
  averageReloadTime: number;
  failedReloads: number;
  lastReloadTime: number;
}

/**
 * Monitors performance specifically for AI Editorial Functions
 */
export class FunctionPerformanceMonitor {
  private static instance: FunctionPerformanceMonitor;
  private functionMetrics: Map<string, FunctionMetrics> = new Map();
  private hotReloadMetrics: HotReloadMetrics;
  private isMonitoring = false;

  private constructor() {
    this.hotReloadMetrics = {
      reloadCount: 0,
      averageReloadTime: 0,
      failedReloads: 0,
      lastReloadTime: 0
    };

    this.setupEventListeners();
  }

  public static getInstance(): FunctionPerformanceMonitor {
    if (!FunctionPerformanceMonitor.instance) {
      FunctionPerformanceMonitor.instance = new FunctionPerformanceMonitor();
    }
    return FunctionPerformanceMonitor.instance;
  }

  /**
   * Start monitoring a function execution
   */
  startFunctionExecution(functionId: string, metadata?: Record<string, any>): string {
    if (!this.isMonitoring) return functionId;

    const measurementId = performanceProfiler.startMeasurement(
      `function-execute-${functionId}`,
      PerformanceCategory.DATA_PROCESSING,
      { functionId, ...metadata }
    );

    return measurementId;
  }

  /**
   * End function execution monitoring
   */
  endFunctionExecution(
    measurementId: string,
    functionId: string,
    success: boolean,
    confidence?: number,
    error?: string
  ): void {
    if (!this.isMonitoring) return;

    const duration = performanceProfiler.endMeasurement(measurementId, {
      success,
      confidence,
      error
    });

    this.updateFunctionMetrics(functionId, duration, success, confidence);
  }

  /**
   * Monitor hot reload operation
   */
  async monitorHotReload<T>(
    functionId: string,
    reloadOperation: () => Promise<T>
  ): Promise<T> {
    return performanceProfiler.measureAsync(
      `hot-reload-${functionId}`,
      PerformanceCategory.HOT_RELOAD,
      async () => {
        try {
          const result = await reloadOperation();
          this.updateHotReloadMetrics(true);
          return result;
        } catch (error) {
          this.updateHotReloadMetrics(false);
          throw error;
        }
      },
      { functionId }
    );
  }

  /**
   * Monitor function validation
   */
  async monitorValidation<T>(
    functionId: string,
    validationOperation: () => Promise<T>
  ): Promise<T> {
    return performanceProfiler.measureAsync(
      `function-validation-${functionId}`,
      PerformanceCategory.DATA_PROCESSING,
      validationOperation,
      { functionId, operation: 'validation' }
    );
  }

  /**
   * Get metrics for a specific function
   */
  getFunctionMetrics(functionId: string): FunctionMetrics | null {
    return this.functionMetrics.get(functionId) || null;
  }

  /**
   * Get all function metrics
   */
  getAllFunctionMetrics(): Map<string, FunctionMetrics> {
    return new Map(this.functionMetrics);
  }

  /**
   * Get hot reload metrics
   */
  getHotReloadMetrics(): HotReloadMetrics {
    return { ...this.hotReloadMetrics };
  }

  /**
   * Get performance summary for all functions
   */
  getPerformanceSummary(): {
    totalFunctions: number;
    averageExecutionTime: number;
    overallSuccessRate: number;
    slowestFunctions: Array<{ functionId: string; averageTime: number }>;
    mostErrorProneFunctions: Array<{ functionId: string; errorRate: number }>;
  } {
    const metrics = Array.from(this.functionMetrics.values());
    
    if (metrics.length === 0) {
      return {
        totalFunctions: 0,
        averageExecutionTime: 0,
        overallSuccessRate: 100,
        slowestFunctions: [],
        mostErrorProneFunctions: []
      };
    }

    const totalExecutionTime = metrics.reduce((sum, m) => sum + m.averageExecutionTime, 0);
    const totalSuccessRate = metrics.reduce((sum, m) => sum + m.successRate, 0);

    const slowestFunctions = [...metrics]
      .sort((a, b) => b.averageExecutionTime - a.averageExecutionTime)
      .slice(0, 5)
      .map(m => ({ functionId: m.functionId, averageTime: m.averageExecutionTime }));

    const mostErrorProneFunctions = [...metrics]
      .filter(m => m.errorRate > 0)
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, 5)
      .map(m => ({ functionId: m.functionId, errorRate: m.errorRate }));

    return {
      totalFunctions: metrics.length,
      averageExecutionTime: totalExecutionTime / metrics.length,
      overallSuccessRate: totalSuccessRate / metrics.length,
      slowestFunctions,
      mostErrorProneFunctions
    };
  }

  /**
   * Enable/disable monitoring
   */
  setMonitoring(enabled: boolean): void {
    this.isMonitoring = enabled;
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.functionMetrics.clear();
    this.hotReloadMetrics = {
      reloadCount: 0,
      averageReloadTime: 0,
      failedReloads: 0,
      lastReloadTime: 0
    };
  }

  // Private methods

  private setupEventListeners(): void {
    globalEventBus.on('function-executed', (event) => {
      const { functionId, success, duration, confidence, error } = event.payload;
      this.updateFunctionMetrics(functionId, duration, success, confidence);
    });

    globalEventBus.on('function-validation-failed', (event) => {
      const { functionId, error } = event.payload;
      // Increment error count for validation failures
      const metrics = this.functionMetrics.get(functionId);
      if (metrics) {
        metrics.errorRate = Math.min(100, metrics.errorRate + 1);
      }
    });

    globalEventBus.on('memory-pressure-high', () => {
      // Reduce monitoring frequency during high memory pressure
      this.setMonitoring(false);
      setTimeout(() => this.setMonitoring(true), 30000); // Resume after 30 seconds
    });
  }

  private updateFunctionMetrics(
    functionId: string,
    duration: number,
    success: boolean,
    confidence?: number
  ): void {
    const existing = this.functionMetrics.get(functionId) || {
      functionId,
      executionCount: 0,
      totalExecutionTime: 0,
      averageExecutionTime: 0,
      successRate: 100,
      errorRate: 0,
      confidenceScore: 0,
      memoryUsage: 0,
      cacheHitRate: 0,
      lastExecuted: 0
    };

    existing.executionCount++;
    existing.totalExecutionTime += duration;
    existing.averageExecutionTime = existing.totalExecutionTime / existing.executionCount;
    existing.lastExecuted = Date.now();

    // Update success/error rates
    const successfulExecutions = Math.round((existing.successRate / 100) * (existing.executionCount - 1)) + (success ? 1 : 0);
    existing.successRate = (successfulExecutions / existing.executionCount) * 100;
    existing.errorRate = 100 - existing.successRate;

    // Update confidence score
    if (confidence !== undefined) {
      const totalConfidence = (existing.confidenceScore * (existing.executionCount - 1)) + confidence;
      existing.confidenceScore = totalConfidence / existing.executionCount;
    }

    this.functionMetrics.set(functionId, existing);

    // Emit performance alert if metrics indicate problems
    if (existing.errorRate > 10) { // >10% error rate
      globalEventBus.emit('function-performance-alert', {
        functionId,
        type: 'high_error_rate',
        value: existing.errorRate
      });
    }

    if (existing.averageExecutionTime > 5000) { // >5 seconds
      globalEventBus.emit('function-performance-alert', {
        functionId,
        type: 'slow_execution',
        value: existing.averageExecutionTime
      });
    }
  }

  private updateHotReloadMetrics(success: boolean): void {
    this.hotReloadMetrics.reloadCount++;
    this.hotReloadMetrics.lastReloadTime = Date.now();
    
    if (!success) {
      this.hotReloadMetrics.failedReloads++;
    }

    // Calculate average reload time from performance measurements
    const reloadMeasurements = performanceProfiler.getMeasurementsByCategory(PerformanceCategory.HOT_RELOAD);
    if (reloadMeasurements.length > 0) {
      const totalTime = reloadMeasurements.reduce((sum, m) => sum + (m.duration || 0), 0);
      this.hotReloadMetrics.averageReloadTime = totalTime / reloadMeasurements.length;
    }

    globalEventBus.emit('hot-reload-metrics-updated', this.hotReloadMetrics);
  }
}

// Export singleton instance
export const functionPerformanceMonitor = FunctionPerformanceMonitor.getInstance();

// Convenience functions
export function startFunctionExecution(functionId: string, metadata?: Record<string, any>): string {
  return functionPerformanceMonitor.startFunctionExecution(functionId, metadata);
}

export function endFunctionExecution(
  measurementId: string,
  functionId: string,
  success: boolean,
  confidence?: number,
  error?: string
): void {
  return functionPerformanceMonitor.endFunctionExecution(measurementId, functionId, success, confidence, error);
}

export async function monitorHotReload<T>(
  functionId: string,
  reloadOperation: () => Promise<T>
): Promise<T> {
  return functionPerformanceMonitor.monitorHotReload(functionId, reloadOperation);
}