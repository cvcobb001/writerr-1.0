import { WritterrEventBus } from './event-bus';

export interface PerformanceMetrics {
  avgProcessingTime: number;
  successRate: number;
  totalRequests: number;
  cacheHitRate: number;
  memoryUsage?: number;
  lastUpdated: number;
}

export interface DetailedMetrics extends PerformanceMetrics {
  requestsPerMinute: number;
  errorCount: number;
  timeDistribution: {
    fast: number;    // < 1s
    medium: number;  // 1-5s
    slow: number;    // > 5s
  };
  adapterMetrics: Record<string, {
    requests: number;
    successRate: number;
    avgResponseTime: number;
  }>;
}

export class PerformanceMonitor {
  private metrics: {
    totalRequests: number;
    successfulRequests: number;
    totalProcessingTime: number;
    cacheHits: number;
    cacheRequests: number;
    requestTimes: number[];
    adapterStats: Map<string, {
      requests: number;
      successful: number;
      totalTime: number;
    }>;
  } = {
    totalRequests: 0,
    successfulRequests: 0,
    totalProcessingTime: 0,
    cacheHits: 0,
    cacheRequests: 0,
    requestTimes: [],
    adapterStats: new Map()
  };

  private readonly MAX_REQUEST_TIMES = 1000; // Keep last 1000 request times

  constructor(private eventBus: WritterrEventBus) {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.eventBus.on('processing-completed', (data: any) => {
      this.recordRequest(data.result.processingTime, true);
    });

    this.eventBus.on('processing-failed', (data: any) => {
      this.recordRequest(0, false);
    });

    this.eventBus.on('adapter-execution-recorded', (data: any) => {
      this.recordAdapterExecution(
        data.adapterName,
        data.responseTime,
        data.success
      );
    });

    // Emit metrics updates periodically
    setInterval(() => {
      this.emitMetricsUpdate();
    }, 30000); // Every 30 seconds
  }

  recordRequest(processingTime: number, success: boolean): void {
    this.metrics.totalRequests++;
    
    if (success) {
      this.metrics.successfulRequests++;
      this.metrics.totalProcessingTime += processingTime;
      
      // Store request time (keep only last MAX_REQUEST_TIMES)
      this.metrics.requestTimes.push(processingTime);
      if (this.metrics.requestTimes.length > this.MAX_REQUEST_TIMES) {
        this.metrics.requestTimes.shift();
      }
    }
  }

  recordCacheHit(): void {
    this.metrics.cacheRequests++;
    this.metrics.cacheHits++;
  }

  recordCacheMiss(): void {
    this.metrics.cacheRequests++;
  }

  private recordAdapterExecution(adapterName: string, responseTime: number, success: boolean): void {
    if (!this.metrics.adapterStats.has(adapterName)) {
      this.metrics.adapterStats.set(adapterName, {
        requests: 0,
        successful: 0,
        totalTime: 0
      });
    }

    const stats = this.metrics.adapterStats.get(adapterName)!;
    stats.requests++;
    stats.totalTime += responseTime;
    
    if (success) {
      stats.successful++;
    }
  }

  getCurrentMetrics(): PerformanceMetrics {
    const avgProcessingTime = this.metrics.successfulRequests > 0
      ? this.metrics.totalProcessingTime / this.metrics.successfulRequests
      : 0;

    const successRate = this.metrics.totalRequests > 0
      ? this.metrics.successfulRequests / this.metrics.totalRequests
      : 0;

    const cacheHitRate = this.metrics.cacheRequests > 0
      ? this.metrics.cacheHits / this.metrics.cacheRequests
      : 0;

    return {
      avgProcessingTime,
      successRate,
      totalRequests: this.metrics.totalRequests,
      cacheHitRate,
      lastUpdated: Date.now()
    };
  }

  getDetailedMetrics(): DetailedMetrics {
    const basicMetrics = this.getCurrentMetrics();
    
    // Calculate time distribution
    const timeDistribution = {
      fast: 0,
      medium: 0,
      slow: 0
    };

    for (const time of this.metrics.requestTimes) {
      if (time < 1000) {
        timeDistribution.fast++;
      } else if (time < 5000) {
        timeDistribution.medium++;
      } else {
        timeDistribution.slow++;
      }
    }

    // Calculate requests per minute (based on last hour of data)
    const recentRequests = this.metrics.requestTimes.filter(
      time => time > Date.now() - 3600000 // Last hour
    );
    const requestsPerMinute = recentRequests.length / 60;

    // Adapter metrics
    const adapterMetrics: Record<string, any> = {};
    for (const [name, stats] of this.metrics.adapterStats) {
      adapterMetrics[name] = {
        requests: stats.requests,
        successRate: stats.requests > 0 ? stats.successful / stats.requests : 0,
        avgResponseTime: stats.requests > 0 ? stats.totalTime / stats.requests : 0
      };
    }

    return {
      ...basicMetrics,
      requestsPerMinute,
      errorCount: this.metrics.totalRequests - this.metrics.successfulRequests,
      timeDistribution,
      adapterMetrics
    };
  }

  private emitMetricsUpdate(): void {
    const metrics = this.getCurrentMetrics();
    this.eventBus.emit('performance-metrics-updated', { metrics });
  }

  // Memory usage tracking (if available)
  updateMemoryUsage(): void {
    if (typeof (performance as any).memory !== 'undefined') {
      const memInfo = (performance as any).memory;
      // Store memory usage for reporting
      // This is a Chrome-specific API
    }
  }

  // Reset metrics (useful for testing)
  reset(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      totalProcessingTime: 0,
      cacheHits: 0,
      cacheRequests: 0,
      requestTimes: [],
      adapterStats: new Map()
    };
  }

  cleanup(): void {
    // Remove event listeners would be done here if we stored references
    // For now, just reset metrics
    this.reset();
  }

  // Export metrics for external monitoring
  exportMetrics(): string {
    const detailed = this.getDetailedMetrics();
    return JSON.stringify(detailed, null, 2);
  }

  // Alert thresholds
  checkThresholds(): { alerts: string[]; warnings: string[] } {
    const metrics = this.getCurrentMetrics();
    const alerts: string[] = [];
    const warnings: string[] = [];

    // Check processing time
    if (metrics.avgProcessingTime > 5000) {
      alerts.push(`High average processing time: ${metrics.avgProcessingTime.toFixed(0)}ms`);
    } else if (metrics.avgProcessingTime > 2000) {
      warnings.push(`Elevated processing time: ${metrics.avgProcessingTime.toFixed(0)}ms`);
    }

    // Check success rate
    if (metrics.successRate < 0.8) {
      alerts.push(`Low success rate: ${(metrics.successRate * 100).toFixed(1)}%`);
    } else if (metrics.successRate < 0.95) {
      warnings.push(`Reduced success rate: ${(metrics.successRate * 100).toFixed(1)}%`);
    }

    return { alerts, warnings };
  }
}