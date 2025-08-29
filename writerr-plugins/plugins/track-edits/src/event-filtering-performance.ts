/**
 * Performance Optimization for Event Filtering System
 * 
 * This module provides comprehensive performance optimization for the event filtering
 * system, including efficient algorithms, memory management, caching strategies,
 * and real-time monitoring to ensure minimal overhead in event processing.
 */

import { EventChainNode, EventCorrelationData, EventFrequencyTracker } from './event-filtering-system';
import { WriterrlEvent, WriterrlEventV2 } from './event-bus-integration';

// ============================================================================
// Performance Types and Interfaces
// ============================================================================

export interface PerformanceMetrics {
  processingTime: {
    min: number;
    max: number;
    average: number;
    median: number;
    percentile95: number;
  };
  memoryUsage: {
    current: number;
    peak: number;
    average: number;
    allocated: number;
  };
  throughput: {
    eventsPerSecond: number;
    averageOverMinute: number;
    peakEventsPerSecond: number;
  };
  cacheEfficiency: {
    hitRate: number;
    missRate: number;
    evictionRate: number;
    totalQueries: number;
  };
  systemLoad: {
    cpuUsage: number;
    memoryPressure: number;
    processingQueue: number;
    activeCorrelations: number;
  };
}

export interface OptimizationConfig {
  // Cache settings
  maxCacheSize: number;
  cacheTTL: number;
  cacheEvictionStrategy: 'lru' | 'ttl' | 'adaptive';
  
  // Memory management
  maxMemoryUsage: number;
  memoryCleanupInterval: number;
  aggressiveCleanupThreshold: number;
  
  // Processing optimization
  batchProcessingSize: number;
  parallelProcessing: boolean;
  maxConcurrentOperations: number;
  processingTimeout: number;
  
  // Algorithm optimization
  useOptimizedAlgorithms: boolean;
  precomputeCommonPatterns: boolean;
  enablePredictiveFiltering: boolean;
  
  // Monitoring and metrics
  enableDetailedMetrics: boolean;
  metricsRetentionPeriod: number;
  performanceReportingInterval: number;
}

export interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  ttl: number;
}

export interface ProcessingTask {
  id: string;
  event: WriterrlEvent | WriterrlEventV2;
  priority: number;
  timestamp: number;
  startTime?: number;
  endTime?: number;
  processingTime?: number;
}

// ============================================================================
// High-Performance Cache Implementation
// ============================================================================

export class HighPerformanceCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private accessOrder: string[] = [];
  private config: OptimizationConfig;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalQueries: 0
  };

  constructor(config: OptimizationConfig) {
    this.config = config;
    this.startCleanupTimer();
  }

  /**
   * Get value from cache with optimized access tracking
   */
  get(key: string): T | null {
    this.stats.totalQueries++;
    
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      this.stats.misses++;
      return null;
    }

    // Update access tracking
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.updateAccessOrder(key);
    this.stats.hits++;
    
    return entry.value;
  }

  /**
   * Set value in cache with intelligent eviction
   */
  set(key: string, value: T, ttl?: number): void {
    // Check if cache is at capacity
    if (this.cache.size >= this.config.maxCacheSize) {
      this.evictEntries();
    }

    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
      ttl: ttl || this.config.cacheTTL
    };

    this.cache.set(key, entry);
    this.updateAccessOrder(key);
  }

  /**
   * Intelligent cache eviction based on strategy
   */
  private evictEntries(): void {
    const entriesToEvict = Math.ceil(this.config.maxCacheSize * 0.1); // Evict 10%

    switch (this.config.cacheEvictionStrategy) {
      case 'lru':
        this.evictLRU(entriesToEvict);
        break;
      case 'ttl':
        this.evictByTTL(entriesToEvict);
        break;
      case 'adaptive':
        this.evictAdaptive(entriesToEvict);
        break;
    }
  }

  /**
   * LRU eviction strategy
   */
  private evictLRU(count: number): void {
    const toEvict = this.accessOrder.slice(0, count);
    for (const key of toEvict) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      this.stats.evictions++;
    }
  }

  /**
   * TTL-based eviction strategy
   */
  private evictByTTL(count: number): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => (now - a[1].timestamp) - (now - b[1].timestamp))
      .slice(0, count);

    for (const [key] of entries) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      this.stats.evictions++;
    }
  }

  /**
   * Adaptive eviction strategy (combines LRU and frequency)
   */
  private evictAdaptive(count: number): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({
        key,
        entry,
        score: this.calculateEvictionScore(entry, now)
      }))
      .sort((a, b) => a.score - b.score)
      .slice(0, count);

    for (const { key } of entries) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      this.stats.evictions++;
    }
  }

  /**
   * Calculate eviction score for adaptive strategy
   */
  private calculateEvictionScore(entry: CacheEntry<T>, now: number): number {
    const age = now - entry.timestamp;
    const timeSinceLastAccess = now - entry.lastAccessed;
    const frequency = entry.accessCount / Math.max(age / 1000, 1);
    
    // Lower score = higher priority for eviction
    return frequency / (timeSinceLastAccess + 1);
  }

  /**
   * Update access order for LRU tracking
   */
  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  /**
   * Remove key from access order
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * Start periodic cleanup timer
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      this.performMaintenance();
    }, this.config.memoryCleanupInterval);
  }

  /**
   * Perform cache maintenance
   */
  private performMaintenance(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    // Find expired entries
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    }

    // Remove expired entries
    for (const key of expiredKeys) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
    }

    // Compact access order array if it's grown large
    if (this.accessOrder.length > this.cache.size * 1.5) {
      this.accessOrder = this.accessOrder.filter(key => this.cache.has(key));
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    missRate: number;
    evictionRate: number;
    totalQueries: number;
  } {
    const hitRate = this.stats.totalQueries > 0 ? this.stats.hits / this.stats.totalQueries : 0;
    const missRate = this.stats.totalQueries > 0 ? this.stats.misses / this.stats.totalQueries : 0;
    const evictionRate = this.stats.totalQueries > 0 ? this.stats.evictions / this.stats.totalQueries : 0;

    return {
      size: this.cache.size,
      hitRate,
      missRate,
      evictionRate,
      totalQueries: this.stats.totalQueries
    };
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.stats = { hits: 0, misses: 0, evictions: 0, totalQueries: 0 };
  }
}

// ============================================================================
// Performance Monitor Implementation
// ============================================================================

export class EventFilteringPerformanceMonitor {
  private config: OptimizationConfig;
  private processingTimes: number[] = [];
  private memorySnapshots: number[] = [];
  private throughputCounters = new Map<number, number>(); // timestamp -> event count
  private cache: HighPerformanceCache<any>;
  private taskQueue: ProcessingTask[] = [];
  private concurrentOperations = 0;
  private startTime = Date.now();
  
  constructor(config: OptimizationConfig) {
    this.config = config;
    this.cache = new HighPerformanceCache(config);
    this.startPerformanceMonitoring();
  }

  /**
   * Record event processing time
   */
  recordProcessingTime(duration: number): void {
    this.processingTimes.push(duration);
    
    // Keep only recent measurements to prevent memory growth
    if (this.processingTimes.length > 10000) {
      this.processingTimes = this.processingTimes.slice(-5000);
    }
  }

  /**
   * Record memory usage snapshot
   */
  recordMemoryUsage(usage: number): void {
    this.memorySnapshots.push(usage);
    
    if (this.memorySnapshots.length > 1000) {
      this.memorySnapshots = this.memorySnapshots.slice(-500);
    }
  }

  /**
   * Record throughput data point
   */
  recordThroughput(): void {
    const now = Date.now();
    const secondBucket = Math.floor(now / 1000) * 1000;
    
    const current = this.throughputCounters.get(secondBucket) || 0;
    this.throughputCounters.set(secondBucket, current + 1);
    
    // Cleanup old buckets
    const cutoff = now - 300000; // Keep last 5 minutes
    for (const [timestamp] of this.throughputCounters.entries()) {
      if (timestamp < cutoff) {
        this.throughputCounters.delete(timestamp);
      }
    }
  }

  /**
   * Get comprehensive performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return {
      processingTime: this.calculateProcessingTimeMetrics(),
      memoryUsage: this.calculateMemoryMetrics(),
      throughput: this.calculateThroughputMetrics(),
      cacheEfficiency: this.getCacheEfficiencyMetrics(),
      systemLoad: this.calculateSystemLoadMetrics()
    };
  }

  /**
   * Calculate processing time metrics
   */
  private calculateProcessingTimeMetrics() {
    if (this.processingTimes.length === 0) {
      return { min: 0, max: 0, average: 0, median: 0, percentile95: 0 };
    }

    const sorted = [...this.processingTimes].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, time) => acc + time, 0);

    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      average: sum / sorted.length,
      median: sorted[Math.floor(sorted.length / 2)],
      percentile95: sorted[Math.floor(sorted.length * 0.95)]
    };
  }

  /**
   * Calculate memory usage metrics
   */
  private calculateMemoryMetrics() {
    if (this.memorySnapshots.length === 0) {
      return { current: 0, peak: 0, average: 0, allocated: 0 };
    }

    const current = this.memorySnapshots[this.memorySnapshots.length - 1];
    const peak = Math.max(...this.memorySnapshots);
    const sum = this.memorySnapshots.reduce((acc, usage) => acc + usage, 0);
    const average = sum / this.memorySnapshots.length;

    return {
      current,
      peak,
      average,
      allocated: process.memoryUsage?.()?.heapUsed || 0
    };
  }

  /**
   * Calculate throughput metrics
   */
  private calculateThroughputMetrics() {
    const now = Date.now();
    const events = Array.from(this.throughputCounters.values());
    
    if (events.length === 0) {
      return { eventsPerSecond: 0, averageOverMinute: 0, peakEventsPerSecond: 0 };
    }

    const currentSecondEvents = this.throughputCounters.get(Math.floor(now / 1000) * 1000) || 0;
    const lastMinuteEvents = Array.from(this.throughputCounters.entries())
      .filter(([timestamp]) => now - timestamp <= 60000)
      .reduce((sum, [, count]) => sum + count, 0);

    return {
      eventsPerSecond: currentSecondEvents,
      averageOverMinute: lastMinuteEvents / 60,
      peakEventsPerSecond: Math.max(...events)
    };
  }

  /**
   * Get cache efficiency metrics
   */
  private getCacheEfficiencyMetrics() {
    const stats = this.cache.getCacheStats();
    return {
      hitRate: stats.hitRate,
      missRate: stats.missRate,
      evictionRate: stats.evictionRate,
      totalQueries: stats.totalQueries
    };
  }

  /**
   * Calculate system load metrics
   */
  private calculateSystemLoadMetrics() {
    return {
      cpuUsage: this.estimateCpuUsage(),
      memoryPressure: this.calculateMemoryPressure(),
      processingQueue: this.taskQueue.length,
      activeCorrelations: this.concurrentOperations
    };
  }

  /**
   * Estimate CPU usage (simplified)
   */
  private estimateCpuUsage(): number {
    const recentProcessingTimes = this.processingTimes.slice(-100);
    if (recentProcessingTimes.length === 0) return 0;
    
    const averageTime = recentProcessingTimes.reduce((a, b) => a + b, 0) / recentProcessingTimes.length;
    
    // Simple heuristic: higher processing times indicate higher CPU usage
    return Math.min((averageTime / 100) * 100, 100);
  }

  /**
   * Calculate memory pressure
   */
  private calculateMemoryPressure(): number {
    const current = this.memorySnapshots[this.memorySnapshots.length - 1] || 0;
    const maxAllowed = this.config.maxMemoryUsage;
    
    return (current / maxAllowed) * 100;
  }

  /**
   * Optimize event processing with batching and caching
   */
  async optimizeEventProcessing<T>(
    events: (WriterrlEvent | WriterrlEventV2)[],
    processor: (event: WriterrlEvent | WriterrlEventV2) => Promise<T>
  ): Promise<T[]> {
    // Check if we should use batch processing
    if (events.length >= this.config.batchProcessingSize && this.config.parallelProcessing) {
      return this.processBatch(events, processor);
    }

    // Process events individually with caching
    const results: T[] = [];
    for (const event of events) {
      const cacheKey = this.generateCacheKey(event);
      let result = this.cache.get(cacheKey);
      
      if (result === null) {
        const startTime = Date.now();
        result = await processor(event);
        const processingTime = Date.now() - startTime;
        
        this.recordProcessingTime(processingTime);
        this.cache.set(cacheKey, result);
      }
      
      results.push(result);
      this.recordThroughput();
    }

    return results;
  }

  /**
   * Process events in batches for better performance
   */
  private async processBatch<T>(
    events: (WriterrlEvent | WriterrlEventV2)[],
    processor: (event: WriterrlEvent | WriterrlEventV2) => Promise<T>
  ): Promise<T[]> {
    const batches = this.chunkArray(events, this.config.batchProcessingSize);
    const results: T[] = [];

    for (const batch of batches) {
      // Limit concurrent operations
      while (this.concurrentOperations >= this.config.maxConcurrentOperations) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      this.concurrentOperations++;
      
      try {
        const batchPromises = batch.map(async event => {
          const cacheKey = this.generateCacheKey(event);
          let result = this.cache.get(cacheKey);
          
          if (result === null) {
            const startTime = Date.now();
            result = await processor(event);
            const processingTime = Date.now() - startTime;
            
            this.recordProcessingTime(processingTime);
            this.cache.set(cacheKey, result);
          }
          
          this.recordThroughput();
          return result;
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      } finally {
        this.concurrentOperations--;
      }
    }

    return results;
  }

  /**
   * Generate cache key for event
   */
  private generateCacheKey(event: WriterrlEvent | WriterrlEventV2): string {
    // Create a deterministic cache key based on event properties
    const keyParts = [
      event.type,
      event.sourcePlugin,
      event.sessionId || 'no-session',
      JSON.stringify(event.data || {})
    ];
    
    return keyParts.join('|');
  }

  /**
   * Chunk array into smaller batches
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    // Monitor memory usage
    setInterval(() => {
      if (typeof process !== 'undefined' && process.memoryUsage) {
        this.recordMemoryUsage(process.memoryUsage().heapUsed);
      }
    }, 5000);

    // Generate performance reports
    if (this.config.enableDetailedMetrics) {
      setInterval(() => {
        const metrics = this.getPerformanceMetrics();
        console.log('[EventFiltering Performance]', metrics);
      }, this.config.performanceReportingInterval);
    }
  }

  /**
   * Get cache instance for direct access
   */
  getCache(): HighPerformanceCache<any> {
    return this.cache;
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    this.cache.clear();
    this.processingTimes = [];
    this.memorySnapshots = [];
    this.throughputCounters.clear();
    this.taskQueue = [];
  }
}

// ============================================================================
// Performance Optimizer Factory
// ============================================================================

export class EventFilteringPerformanceOptimizer {
  private monitor: EventFilteringPerformanceMonitor;
  private config: OptimizationConfig;

  constructor(config: Partial<OptimizationConfig> = {}) {
    this.config = {
      maxCacheSize: 1000,
      cacheTTL: 300000, // 5 minutes
      cacheEvictionStrategy: 'adaptive',
      maxMemoryUsage: 100 * 1024 * 1024, // 100MB
      memoryCleanupInterval: 30000, // 30 seconds
      aggressiveCleanupThreshold: 0.8,
      batchProcessingSize: 10,
      parallelProcessing: true,
      maxConcurrentOperations: 5,
      processingTimeout: 5000,
      useOptimizedAlgorithms: true,
      precomputeCommonPatterns: true,
      enablePredictiveFiltering: false,
      enableDetailedMetrics: false,
      metricsRetentionPeriod: 3600000, // 1 hour
      performanceReportingInterval: 60000, // 1 minute
      ...config
    };

    this.monitor = new EventFilteringPerformanceMonitor(this.config);
  }

  /**
   * Get performance monitor
   */
  getMonitor(): EventFilteringPerformanceMonitor {
    return this.monitor;
  }

  /**
   * Get optimization configuration
   */
  getConfig(): OptimizationConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<OptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Create optimized processing function
   */
  createOptimizedProcessor<T>(
    processor: (event: WriterrlEvent | WriterrlEventV2) => Promise<T>
  ): (events: (WriterrlEvent | WriterrlEventV2)[]) => Promise<T[]> {
    return async (events: (WriterrlEvent | WriterrlEventV2)[]): Promise<T[]> => {
      return this.monitor.optimizeEventProcessing(events, processor);
    };
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    this.monitor.dispose();
  }
}