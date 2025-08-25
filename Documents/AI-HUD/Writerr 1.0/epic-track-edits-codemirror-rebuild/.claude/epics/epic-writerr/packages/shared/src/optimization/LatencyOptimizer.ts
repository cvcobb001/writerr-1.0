/**
 * Latency Optimizer
 * Optimizes cross-plugin communication latency through batching, prioritization, and circuit breakers
 */

import { globalEventBus } from '../event-bus';
import { performanceProfiler, PerformanceCategory } from './PerformanceProfiler';
import { LatencyOptimizationConfig, BatchProcessor } from './types';

export interface LatencyStats {
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  totalOperations: number;
  batchedOperations: number;
  circuitBreakerTrips: number;
  queueSizes: Map<string, number>;
}

export interface PriorityQueue<T> {
  enqueue: (item: T, priority: number) => void;
  dequeue: () => T | undefined;
  size: () => number;
  clear: () => void;
}

interface QueuedOperation {
  id: string;
  operation: () => Promise<any>;
  priority: number;
  timestamp: number;
  category: string;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailure?: number;
  nextAttempt?: number;
}

/**
 * Optimizes latency through intelligent batching, prioritization, and resilience patterns
 */
export class LatencyOptimizer {
  private static instance: LatencyOptimizer;
  private config: LatencyOptimizationConfig;
  private queues: Map<string, QueuedOperation[]> = new Map();
  private batchProcessors: Map<string, any> = new Map();
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private latencyMeasurements: number[] = [];
  private processingInterval?: number;
  private stats: LatencyStats;

  private constructor() {
    this.config = {
      batchingEnabled: true,
      batchSize: 10,
      batchTimeout: 50, // 50ms
      priorityQueues: true,
      circuitBreaker: {
        enabled: true,
        failureThreshold: 5,
        timeout: 30000, // 30 seconds
        recoveryTime: 60000 // 1 minute
      }
    };

    this.stats = this.initializeStats();
    this.startProcessingLoop();
    this.setupEventListeners();
  }

  public static getInstance(): LatencyOptimizer {
    if (!LatencyOptimizer.instance) {
      LatencyOptimizer.instance = new LatencyOptimizer();
    }
    return LatencyOptimizer.instance;
  }

  /**
   * Execute operation with latency optimization
   */
  async execute<T>(
    category: string,
    operation: () => Promise<T>,
    options?: {
      priority?: number;
      batchable?: boolean;
      timeout?: number;
      retries?: number;
    }
  ): Promise<T> {
    const operationId = `${category}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = performance.now();

    return performanceProfiler.measureAsync(
      `latency-optimized-${category}`,
      PerformanceCategory.CROSS_PLUGIN,
      async () => {
        try {
          // Check circuit breaker
          if (this.config.circuitBreaker.enabled && this.isCircuitOpen(category)) {
            throw new Error(`Circuit breaker open for category: ${category}`);
          }

          let result: T;

          if (this.config.batchingEnabled && options?.batchable !== false) {
            result = await this.executeBatched(category, operation, options);
          } else if (this.config.priorityQueues) {
            result = await this.executePrioritized(category, operation, options);
          } else {
            result = await operation();
          }

          // Record successful operation
          const latency = performance.now() - startTime;
          this.recordLatency(latency);
          this.recordSuccess(category);

          return result;

        } catch (error) {
          this.recordFailure(category);
          throw error;
        }
      },
      {
        category,
        operationId,
        priority: options?.priority || 0,
        batchable: options?.batchable !== false
      }
    );
  }

  /**
   * Create a batch processor for a specific operation type
   */
  createBatchProcessor<T, R>(
    category: string,
    batchHandler: (items: T[]) => Promise<R[]>,
    options?: {
      maxBatchSize?: number;
      maxWaitTime?: number;
      maxConcurrency?: number;
    }
  ): BatchProcessor<T, R> {
    const processor = new BatchProcessorImpl(
      category,
      batchHandler,
      {
        maxBatchSize: options?.maxBatchSize || this.config.batchSize,
        maxWaitTime: options?.maxWaitTime || this.config.batchTimeout,
        maxConcurrency: options?.maxConcurrency || 1
      },
      this
    );

    this.batchProcessors.set(category, processor);
    return processor;
  }

  /**
   * Execute with priority queue
   */
  async executePrioritized<T>(
    category: string,
    operation: () => Promise<T>,
    options?: { priority?: number; timeout?: number }
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const queuedOp: QueuedOperation = {
        id: `${category}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        operation,
        priority: options?.priority || 0,
        timestamp: Date.now(),
        category,
        resolve,
        reject
      };

      // Add to priority queue
      if (!this.queues.has(category)) {
        this.queues.set(category, []);
      }

      const queue = this.queues.get(category)!;
      
      // Insert in priority order (higher priority first)
      let inserted = false;
      for (let i = 0; i < queue.length; i++) {
        if (queue[i].priority < queuedOp.priority) {
          queue.splice(i, 0, queuedOp);
          inserted = true;
          break;
        }
      }
      
      if (!inserted) {
        queue.push(queuedOp);
      }

      // Set timeout if specified
      if (options?.timeout) {
        setTimeout(() => {
          const index = queue.findIndex(op => op.id === queuedOp.id);
          if (index >= 0) {
            queue.splice(index, 1);
            reject(new Error(`Operation timed out after ${options.timeout}ms`));
          }
        }, options.timeout);
      }
    });
  }

  /**
   * Execute with batching
   */
  private async executeBatched<T>(
    category: string,
    operation: () => Promise<T>,
    options?: { priority?: number }
  ): Promise<T> {
    // For now, batching is handled by explicit batch processors
    // This is a fallback to priority execution
    return this.executePrioritized(category, operation, options);
  }

  /**
   * Get current latency statistics
   */
  getStats(): LatencyStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Configure latency optimizer
   */
  configure(config: Partial<LatencyOptimizationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Reset circuit breaker for a category
   */
  resetCircuitBreaker(category: string): void {
    this.circuitBreakers.delete(category);
    
    globalEventBus.emit('circuit-breaker-reset', {
      category,
      timestamp: Date.now()
    });
  }

  /**
   * Get queue sizes for monitoring
   */
  getQueueSizes(): Map<string, number> {
    const sizes = new Map<string, number>();
    
    this.queues.forEach((queue, category) => {
      sizes.set(category, queue.length);
    });
    
    return sizes;
  }

  /**
   * Clear all queues
   */
  clearQueues(): void {
    this.queues.clear();
  }

  /**
   * Shutdown latency optimizer
   */
  shutdown(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    
    this.clearQueues();
    this.batchProcessors.clear();
    this.circuitBreakers.clear();
  }

  // Private methods

  private initializeStats(): LatencyStats {
    return {
      averageLatency: 0,
      p95Latency: 0,
      p99Latency: 0,
      totalOperations: 0,
      batchedOperations: 0,
      circuitBreakerTrips: 0,
      queueSizes: new Map()
    };
  }

  private startProcessingLoop(): void {
    this.processingInterval = setInterval(() => {
      this.processQueues();
    }, 10) as any; // Process every 10ms for low latency
  }

  private setupEventListeners(): void {
    globalEventBus.on('performance-critical', () => {
      // Increase processing frequency during performance issues
      if (this.processingInterval) {
        clearInterval(this.processingInterval);
      }
      
      this.processingInterval = setInterval(() => {
        this.processQueues();
      }, 5) as any; // 5ms during critical periods
    });

    globalEventBus.on('performance-normal', () => {
      // Return to normal processing frequency
      if (this.processingInterval) {
        clearInterval(this.processingInterval);
      }
      
      this.startProcessingLoop();
    });
  }

  private async processQueues(): Promise<void> {
    for (const [category, queue] of this.queues.entries()) {
      if (queue.length === 0) continue;

      // Check circuit breaker
      if (this.isCircuitOpen(category)) {
        // Reject all queued operations
        queue.forEach(op => {
          op.reject(new Error(`Circuit breaker open for category: ${category}`));
        });
        queue.length = 0;
        continue;
      }

      // Process operations from the queue
      const maxConcurrent = 3; // Process up to 3 operations concurrently per category
      const toProcess = queue.splice(0, maxConcurrent);
      
      toProcess.forEach(async (op) => {
        try {
          const result = await op.operation();
          op.resolve(result);
          this.recordSuccess(category);
        } catch (error) {
          op.reject(error);
          this.recordFailure(category);
        }
      });
    }
  }

  private isCircuitOpen(category: string): boolean {
    if (!this.config.circuitBreaker.enabled) return false;

    const breaker = this.circuitBreakers.get(category);
    if (!breaker) return false;

    const now = Date.now();

    switch (breaker.state) {
      case 'open':
        if (breaker.nextAttempt && now >= breaker.nextAttempt) {
          breaker.state = 'half-open';
          return false;
        }
        return true;

      case 'half-open':
        return false;

      case 'closed':
        return false;

      default:
        return false;
    }
  }

  private recordSuccess(category: string): void {
    const breaker = this.circuitBreakers.get(category);
    if (breaker) {
      if (breaker.state === 'half-open') {
        // Recovery successful
        breaker.state = 'closed';
        breaker.failureCount = 0;
        breaker.lastFailure = undefined;
        breaker.nextAttempt = undefined;
      }
    }

    this.stats.totalOperations++;
  }

  private recordFailure(category: string): void {
    if (!this.config.circuitBreaker.enabled) {
      this.stats.totalOperations++;
      return;
    }

    const breaker = this.circuitBreakers.get(category) || {
      state: 'closed' as const,
      failureCount: 0
    };

    breaker.failureCount++;
    breaker.lastFailure = Date.now();

    if (breaker.failureCount >= this.config.circuitBreaker.failureThreshold) {
      breaker.state = 'open';
      breaker.nextAttempt = Date.now() + this.config.circuitBreaker.recoveryTime;
      this.stats.circuitBreakerTrips++;

      globalEventBus.emit('circuit-breaker-opened', {
        category,
        failureCount: breaker.failureCount,
        nextAttempt: breaker.nextAttempt
      });
    }

    this.circuitBreakers.set(category, breaker);
    this.stats.totalOperations++;
  }

  private recordLatency(latency: number): void {
    this.latencyMeasurements.push(latency);
    
    // Keep only last 1000 measurements
    if (this.latencyMeasurements.length > 1000) {
      this.latencyMeasurements = this.latencyMeasurements.slice(-1000);
    }
  }

  private updateStats(): void {
    const measurements = [...this.latencyMeasurements].sort((a, b) => a - b);
    
    if (measurements.length > 0) {
      this.stats.averageLatency = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      this.stats.p95Latency = measurements[Math.floor(measurements.length * 0.95)] || 0;
      this.stats.p99Latency = measurements[Math.floor(measurements.length * 0.99)] || 0;
    }

    this.stats.queueSizes = this.getQueueSizes();
  }
}

/**
 * Implementation of BatchProcessor interface
 */
class BatchProcessorImpl<T, R> implements BatchProcessor<T, R> {
  private items: T[] = [];
  private promises: Array<{ resolve: (value: R) => void; reject: (error: any) => void }> = [];
  private timeout?: number;

  constructor(
    private category: string,
    private batchHandler: (items: T[]) => Promise<R[]>,
    private options: {
      maxBatchSize: number;
      maxWaitTime: number;
      maxConcurrency: number;
    },
    private optimizer: LatencyOptimizer
  ) {}

  async add(item: T): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      this.items.push(item);
      this.promises.push({ resolve, reject });

      // Process if batch is full
      if (this.items.length >= this.options.maxBatchSize) {
        this.flush();
      } else if (!this.timeout) {
        // Start timeout for partial batch
        this.timeout = setTimeout(() => {
          this.flush();
        }, this.options.maxWaitTime) as any;
      }
    });
  }

  async flush(): Promise<R[]> {
    if (this.items.length === 0) return [];

    const batchItems = [...this.items];
    const batchPromises = [...this.promises];
    
    this.items = [];
    this.promises = [];
    
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = undefined;
    }

    try {
      const results = await this.batchHandler(batchItems);
      
      // Resolve individual promises
      results.forEach((result, index) => {
        if (batchPromises[index]) {
          batchPromises[index].resolve(result);
        }
      });

      return results;
      
    } catch (error) {
      // Reject all promises
      batchPromises.forEach(promise => {
        promise.reject(error);
      });
      
      throw error;
    }
  }

  size(): number {
    return this.items.length;
  }

  clear(): void {
    this.items = [];
    
    // Reject pending promises
    this.promises.forEach(promise => {
      promise.reject(new Error('Batch processor cleared'));
    });
    this.promises = [];
    
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = undefined;
    }
  }
}

// Export singleton instance
export const latencyOptimizer = LatencyOptimizer.getInstance();

// Convenience functions
export async function executeOptimized<T>(
  category: string,
  operation: () => Promise<T>,
  options?: {
    priority?: number;
    batchable?: boolean;
    timeout?: number;
    retries?: number;
  }
): Promise<T> {
  return latencyOptimizer.execute(category, operation, options);
}

export function createBatchProcessor<T, R>(
  category: string,
  batchHandler: (items: T[]) => Promise<R[]>,
  options?: {
    maxBatchSize?: number;
    maxWaitTime?: number;
    maxConcurrency?: number;
  }
): BatchProcessor<T, R> {
  return latencyOptimizer.createBatchProcessor(category, batchHandler, options);
}

export function getLatencyStats(): LatencyStats {
  return latencyOptimizer.getStats();
}

export function resetCircuitBreaker(category: string): void {
  latencyOptimizer.resetCircuitBreaker(category);
}