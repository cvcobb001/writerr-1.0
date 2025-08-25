/**
 * Performance Profiler
 * System-wide performance monitoring and profiling for all Writerr plugins
 */

import { globalEventBus } from '../event-bus';
import {
  PerformanceMeasurement,
  PerformanceCategory,
  PerformanceSeverity,
  PerformanceThresholds,
  OptimizationMetrics,
  PerformanceEvent,
  PerformanceReport
} from './types';

export class PerformanceProfiler {
  private static instance: PerformanceProfiler;
  private measurements: Map<string, PerformanceMeasurement> = new Map();
  private completedMeasurements: PerformanceMeasurement[] = [];
  private isEnabled = true;
  private thresholds: PerformanceThresholds;
  private startTime = Date.now();

  private constructor() {
    this.thresholds = this.getDefaultThresholds();
    this.setupEventListeners();
  }

  public static getInstance(): PerformanceProfiler {
    if (!PerformanceProfiler.instance) {
      PerformanceProfiler.instance = new PerformanceProfiler();
    }
    return PerformanceProfiler.instance;
  }

  /**
   * Start measuring performance for a specific operation
   */
  startMeasurement(
    name: string, 
    category: PerformanceCategory, 
    metadata?: Record<string, any>
  ): string {
    if (!this.isEnabled) return name;

    const measurement: PerformanceMeasurement = {
      name,
      startTime: performance.now(),
      category,
      severity: PerformanceSeverity.INFO,
      metadata
    };

    this.measurements.set(name, measurement);
    
    // Also use native performance API if available
    if (performance.mark) {
      performance.mark(`${name}-start`);
    }

    return name;
  }

  /**
   * End a performance measurement
   */
  endMeasurement(name: string, metadata?: Record<string, any>): number {
    if (!this.isEnabled) return 0;

    const measurement = this.measurements.get(name);
    if (!measurement) {
      console.warn(`[PerformanceProfiler] No measurement found for: ${name}`);
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - measurement.startTime;

    measurement.endTime = endTime;
    measurement.duration = duration;
    if (metadata) {
      measurement.metadata = { ...measurement.metadata, ...metadata };
    }

    // Check against thresholds
    measurement.severity = this.evaluatePerformance(measurement);

    // Move to completed measurements
    this.measurements.delete(name);
    this.completedMeasurements.push(measurement);

    // Native performance API
    if (performance.mark && performance.measure) {
      try {
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
      } catch (error) {
        // Ignore if marks don't exist
      }
    }

    // Emit event if threshold exceeded
    if (measurement.severity !== PerformanceSeverity.INFO) {
      this.emitPerformanceEvent('threshold_exceeded', measurement);
    }

    // Log critical performance issues
    if (measurement.severity === PerformanceSeverity.CRITICAL) {
      console.warn(
        `[PerformanceProfiler] CRITICAL: ${name} took ${duration.toFixed(2)}ms`, 
        measurement
      );
    }

    // Keep only last 1000 measurements
    if (this.completedMeasurements.length > 1000) {
      this.completedMeasurements = this.completedMeasurements.slice(-1000);
    }

    return duration;
  }

  /**
   * Measure an async function
   */
  async measureAsync<T>(
    name: string,
    category: PerformanceCategory,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const measurementId = this.startMeasurement(name, category, metadata);
    
    try {
      const result = await fn();
      this.endMeasurement(measurementId);
      return result;
    } catch (error) {
      this.endMeasurement(measurementId, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Measure a synchronous function
   */
  measureSync<T>(
    name: string,
    category: PerformanceCategory,
    fn: () => T,
    metadata?: Record<string, any>
  ): T {
    const measurementId = this.startMeasurement(name, category, metadata);
    
    try {
      const result = fn();
      this.endMeasurement(measurementId);
      return result;
    } catch (error) {
      this.endMeasurement(measurementId, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Get performance metrics for a specific category
   */
  getMetrics(category?: PerformanceCategory): OptimizationMetrics {
    const relevantMeasurements = category 
      ? this.completedMeasurements.filter(m => m.category === category)
      : this.completedMeasurements;

    const durations = relevantMeasurements
      .map(m => m.duration!)
      .filter(d => d !== undefined)
      .sort((a, b) => a - b);

    const startupMeasurements = this.completedMeasurements.filter(m => 
      m.category === PerformanceCategory.STARTUP
    );

    const memoryInfo = (performance as any).memory;

    return {
      startupTime: {
        total: this.getStartupTime(),
        breakdown: this.getStartupBreakdown(startupMeasurements)
      },
      memoryUsage: {
        current: memoryInfo?.usedJSHeapSize || 0,
        peak: memoryInfo?.totalJSHeapSize || 0,
        breakdown: this.getMemoryBreakdown()
      },
      cacheStats: {
        hitRate: 0, // Will be populated by cache systems
        size: 0,
        entries: 0
      },
      latencyStats: {
        average: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
        p95: durations.length > 0 ? durations[Math.floor(durations.length * 0.95)] : 0,
        p99: durations.length > 0 ? durations[Math.floor(durations.length * 0.99)] : 0,
        breakdown: this.getLatencyBreakdown(relevantMeasurements)
      },
      documentStats: {
        largeDocCount: this.getLargeDocumentCount(),
        averageProcessingTime: this.getAverageDocumentProcessingTime(),
        maxDocumentSize: this.getMaxDocumentSize()
      }
    };
  }

  /**
   * Generate comprehensive performance report
   */
  generateReport(timeRangeMs?: number): PerformanceReport {
    const cutoff = timeRangeMs ? Date.now() - timeRangeMs : 0;
    const relevantMeasurements = this.completedMeasurements.filter(m => 
      m.startTime >= cutoff
    );

    const violations = this.findThresholdViolations(relevantMeasurements);
    const recommendations = this.generateRecommendations(violations, relevantMeasurements);

    return {
      timestamp: Date.now(),
      duration: timeRangeMs || (Date.now() - this.startTime),
      metrics: this.getMetrics(),
      violations,
      recommendations
    };
  }

  /**
   * Get measurements by category
   */
  getMeasurementsByCategory(category: PerformanceCategory): PerformanceMeasurement[] {
    return this.completedMeasurements.filter(m => m.category === category);
  }

  /**
   * Get slowest operations
   */
  getSlowestOperations(count: number = 10): PerformanceMeasurement[] {
    return [...this.completedMeasurements]
      .filter(m => m.duration !== undefined)
      .sort((a, b) => (b.duration! - a.duration!))
      .slice(0, count);
  }

  /**
   * Configure performance thresholds
   */
  configureThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Enable/disable profiling
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Clear all measurements
   */
  clear(): void {
    this.measurements.clear();
    this.completedMeasurements = [];
  }

  // Private methods

  private evaluatePerformance(measurement: PerformanceMeasurement): PerformanceSeverity {
    if (!measurement.duration) return PerformanceSeverity.INFO;

    const duration = measurement.duration;
    const category = measurement.category;

    let warningThreshold = 1000; // Default 1 second
    let criticalThreshold = 3000; // Default 3 seconds

    switch (category) {
      case PerformanceCategory.STARTUP:
        warningThreshold = this.thresholds.startup.pluginInit;
        criticalThreshold = this.thresholds.startup.total;
        break;
      case PerformanceCategory.RENDER:
        warningThreshold = this.thresholds.render.interaction;
        criticalThreshold = this.thresholds.render.interaction * 2;
        break;
      case PerformanceCategory.CROSS_PLUGIN:
        warningThreshold = this.thresholds.crossPlugin.communication;
        criticalThreshold = this.thresholds.crossPlugin.communication * 2;
        break;
      case PerformanceCategory.HOT_RELOAD:
        warningThreshold = this.thresholds.hotReload.reload;
        criticalThreshold = this.thresholds.hotReload.reload * 2;
        break;
      case PerformanceCategory.DOCUMENT:
        warningThreshold = this.thresholds.document.processing;
        criticalThreshold = this.thresholds.document.largeDocLoad;
        break;
    }

    if (duration >= criticalThreshold) {
      return PerformanceSeverity.CRITICAL;
    } else if (duration >= warningThreshold) {
      return PerformanceSeverity.WARNING;
    }

    return PerformanceSeverity.INFO;
  }

  private getDefaultThresholds(): PerformanceThresholds {
    return {
      startup: {
        total: 3000,        // 3 seconds total
        pluginInit: 500,    // 500ms per plugin
        dependency: 200     // 200ms per dependency
      },
      render: {
        frame: 16,          // 16ms for 60fps
        interaction: 100,   // 100ms for user interaction
        diff: 50           // 50ms for diff rendering
      },
      dataProcessing: {
        change: 10,         // 10ms per change
        clustering: 100,    // 100ms for clustering
        validation: 20      // 20ms for validation
      },
      crossPlugin: {
        communication: 50,  // 50ms for inter-plugin communication
        eventDelivery: 10,  // 10ms for event delivery
        apiCall: 100       // 100ms for API calls
      },
      hotReload: {
        detection: 50,      // 50ms for file change detection
        reload: 200,        // 200ms for hot reload
        validation: 100     // 100ms for validation
      },
      document: {
        largeDocLoad: 2000, // 2 seconds for large docs
        processing: 500,    // 500ms for processing
        indexing: 1000     // 1 second for indexing
      }
    };
  }

  private getStartupTime(): number {
    const startupMeasurements = this.completedMeasurements.filter(m => 
      m.category === PerformanceCategory.STARTUP
    );

    if (startupMeasurements.length === 0) return 0;

    const totalStartup = startupMeasurements.find(m => m.name.includes('total'));
    if (totalStartup && totalStartup.duration) {
      return totalStartup.duration;
    }

    // Calculate from individual measurements
    return startupMeasurements.reduce((total, m) => total + (m.duration || 0), 0);
  }

  private getStartupBreakdown(measurements: PerformanceMeasurement[]): Record<string, number> {
    const breakdown: Record<string, number> = {};
    
    measurements.forEach(m => {
      if (m.duration) {
        breakdown[m.name] = m.duration;
      }
    });

    return breakdown;
  }

  private getMemoryBreakdown(): Record<string, number> {
    // This would be populated by individual plugins reporting their memory usage
    return {};
  }

  private getLatencyBreakdown(measurements: PerformanceMeasurement[]): Record<string, number> {
    const breakdown: Record<string, number> = {};

    Object.values(PerformanceCategory).forEach(category => {
      const categoryMeasurements = measurements.filter(m => m.category === category);
      if (categoryMeasurements.length > 0) {
        const durations = categoryMeasurements.map(m => m.duration || 0);
        breakdown[category] = durations.reduce((a, b) => a + b, 0) / durations.length;
      }
    });

    return breakdown;
  }

  private getLargeDocumentCount(): number {
    const docMeasurements = this.completedMeasurements.filter(m => 
      m.category === PerformanceCategory.DOCUMENT && 
      m.metadata?.documentSize && 
      m.metadata.documentSize > 100000 // 100K+ characters
    );
    return docMeasurements.length;
  }

  private getAverageDocumentProcessingTime(): number {
    const docMeasurements = this.completedMeasurements.filter(m => 
      m.category === PerformanceCategory.DOCUMENT && m.duration
    );
    
    if (docMeasurements.length === 0) return 0;
    
    return docMeasurements.reduce((sum, m) => sum + (m.duration || 0), 0) / docMeasurements.length;
  }

  private getMaxDocumentSize(): number {
    const docMeasurements = this.completedMeasurements.filter(m => 
      m.metadata?.documentSize
    );
    
    if (docMeasurements.length === 0) return 0;
    
    return Math.max(...docMeasurements.map(m => m.metadata!.documentSize));
  }

  private findThresholdViolations(measurements: PerformanceMeasurement[]) {
    return measurements
      .filter(m => m.severity !== PerformanceSeverity.INFO)
      .map(m => ({
        threshold: `${m.category}-${m.severity}`,
        actual: m.duration || 0,
        expected: this.getExpectedThreshold(m.category, m.severity),
        severity: m.severity
      }));
  }

  private getExpectedThreshold(category: PerformanceCategory, severity: PerformanceSeverity): number {
    // Return the threshold that was violated
    switch (category) {
      case PerformanceCategory.STARTUP:
        return severity === PerformanceSeverity.CRITICAL 
          ? this.thresholds.startup.total 
          : this.thresholds.startup.pluginInit;
      case PerformanceCategory.RENDER:
        return this.thresholds.render.interaction;
      case PerformanceCategory.CROSS_PLUGIN:
        return this.thresholds.crossPlugin.communication;
      case PerformanceCategory.HOT_RELOAD:
        return this.thresholds.hotReload.reload;
      case PerformanceCategory.DOCUMENT:
        return severity === PerformanceSeverity.CRITICAL
          ? this.thresholds.document.largeDocLoad
          : this.thresholds.document.processing;
      default:
        return 1000; // Default 1 second
    }
  }

  private generateRecommendations(violations: any[], measurements: PerformanceMeasurement[]): string[] {
    const recommendations: string[] = [];

    // Startup optimization recommendations
    const startupViolations = violations.filter(v => v.threshold.includes('startup'));
    if (startupViolations.length > 0) {
      recommendations.push('Consider lazy loading non-critical plugins during startup');
      recommendations.push('Implement progressive initialization for heavy operations');
    }

    // Render optimization recommendations
    const renderViolations = violations.filter(v => v.threshold.includes('render'));
    if (renderViolations.length > 0) {
      recommendations.push('Enable virtual scrolling for large change lists');
      recommendations.push('Debounce UI updates during rapid changes');
    }

    // Cross-plugin communication recommendations
    const commViolations = violations.filter(v => v.threshold.includes('cross_plugin'));
    if (commViolations.length > 0) {
      recommendations.push('Batch cross-plugin communications where possible');
      recommendations.push('Implement priority queues for critical operations');
    }

    // Document processing recommendations
    const docViolations = violations.filter(v => v.threshold.includes('document'));
    if (docViolations.length > 0) {
      recommendations.push('Enable document chunking for large files');
      recommendations.push('Implement background processing for non-critical operations');
    }

    // Memory recommendations
    const memoryInfo = (performance as any).memory;
    if (memoryInfo && memoryInfo.usedJSHeapSize > 100 * 1024 * 1024) { // 100MB
      recommendations.push('Enable aggressive memory cleanup and compression');
    }

    return recommendations;
  }

  private setupEventListeners(): void {
    // Listen for cache events to update cache stats
    globalEventBus.on('cache-stats-updated', (event) => {
      // Cache stats will be updated by the cache systems
    });

    // Listen for memory pressure events
    globalEventBus.on('memory-pressure-high', () => {
      console.warn('[PerformanceProfiler] High memory pressure detected');
    });
  }

  private emitPerformanceEvent(type: 'threshold_exceeded' | 'measurement', measurement: PerformanceMeasurement): void {
    const event: PerformanceEvent = {
      type,
      category: measurement.category,
      data: measurement,
      timestamp: Date.now(),
      pluginId: measurement.metadata?.pluginId
    };

    globalEventBus.emit('performance-event', event, 'performance-profiler');
  }
}

// Export singleton instance
export const performanceProfiler = PerformanceProfiler.getInstance();

// Convenience functions
export function startMeasurement(
  name: string, 
  category: PerformanceCategory, 
  metadata?: Record<string, any>
): string {
  return performanceProfiler.startMeasurement(name, category, metadata);
}

export function endMeasurement(name: string, metadata?: Record<string, any>): number {
  return performanceProfiler.endMeasurement(name, metadata);
}

export async function measureAsync<T>(
  name: string,
  category: PerformanceCategory,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  return performanceProfiler.measureAsync(name, category, fn, metadata);
}

export function measureSync<T>(
  name: string,
  category: PerformanceCategory,
  fn: () => T,
  metadata?: Record<string, any>
): T {
  return performanceProfiler.measureSync(name, category, fn, metadata);
}

export function getPerformanceMetrics(category?: PerformanceCategory): OptimizationMetrics {
  return performanceProfiler.getMetrics(category);
}

export function generatePerformanceReport(timeRangeMs?: number): PerformanceReport {
  return performanceProfiler.generateReport(timeRangeMs);
}