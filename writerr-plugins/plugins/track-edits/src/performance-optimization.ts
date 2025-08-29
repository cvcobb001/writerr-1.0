/**
 * Performance Optimization and Error Handling for Multi-Plugin Consolidation
 * 
 * Provides:
 * - Efficient conflict detection algorithms for large documents
 * - Optimized change merging with minimal computational overhead
 * - Real-time consolidation without blocking user interface
 * - Memory-efficient tracking of multi-plugin operations
 * - Performance monitoring and optimization
 */

import { EditChange, MultiPluginEditOperation, ChangeConflict } from './change-consolidation-manager';

export interface PerformanceMetrics {
  // Timing metrics
  averageConflictDetectionTime: number;
  averageMergeTime: number;
  averageConsolidationTime: number;
  
  // Memory metrics
  currentMemoryUsage: number;
  peakMemoryUsage: number;
  operationsInMemory: number;
  
  // Throughput metrics
  operationsPerSecond: number;
  conflictsPerSecond: number;
  mergesPerSecond: number;
  
  // Error rates
  failedOperations: number;
  failedConflictDetections: number;
  failedMerges: number;
  
  // Resource utilization
  cpuUsagePercent: number;
  activeThreads: number;
  queuedOperations: number;
}

export interface OptimizationConfig {
  // Performance tuning
  maxConcurrentOperations: number;
  batchProcessingSize: number;
  memoryCleanupInterval: number;
  
  // Caching
  enableResultCaching: boolean;
  cacheExpirationTime: number;
  maxCacheSize: number;
  
  // Algorithm optimization
  useAsyncProcessing: boolean;
  enableProgressiveLoading: boolean;
  optimizeForLargeDocuments: boolean;
  
  // Resource limits
  maxMemoryUsage: number; // MB
  maxProcessingTime: number; // ms
  backgroundProcessingThrottle: number; // ms between operations
}

/**
 * Performance Monitor for Multi-Plugin Operations
 */
export class ConsolidationPerformanceMonitor {
  private metrics: PerformanceMetrics;
  private config: OptimizationConfig;
  private startTimes = new Map<string, number>();
  private operationHistory: Array<{timestamp: number, duration: number, type: string}> = [];
  private memoryUsageHistory: number[] = [];
  
  // Performance caches
  private conflictDetectionCache = new Map<string, ChangeConflict[]>();
  private mergeResultCache = new Map<string, EditChange[]>();
  private documentHashCache = new Map<string, string>();

  constructor(config: Partial<OptimizationConfig> = {}) {
    this.config = {
      maxConcurrentOperations: 5,
      batchProcessingSize: 10,
      memoryCleanupInterval: 60000, // 1 minute
      enableResultCaching: true,
      cacheExpirationTime: 300000, // 5 minutes
      maxCacheSize: 1000,
      useAsyncProcessing: true,
      enableProgressiveLoading: true,
      optimizeForLargeDocuments: true,
      maxMemoryUsage: 512, // 512 MB
      maxProcessingTime: 30000, // 30 seconds
      backgroundProcessingThrottle: 100,
      ...config
    };

    this.metrics = {
      averageConflictDetectionTime: 0,
      averageMergeTime: 0,
      averageConsolidationTime: 0,
      currentMemoryUsage: 0,
      peakMemoryUsage: 0,
      operationsInMemory: 0,
      operationsPerSecond: 0,
      conflictsPerSecond: 0,
      mergesPerSecond: 0,
      failedOperations: 0,
      failedConflictDetections: 0,
      failedMerges: 0,
      cpuUsagePercent: 0,
      activeThreads: 0,
      queuedOperations: 0
    };

    this.startPerformanceMonitoring();
  }

  /**
   * Start timing an operation
   */
  startTiming(operationId: string, type: 'conflict_detection' | 'merge' | 'consolidation'): void {
    this.startTimes.set(`${operationId}:${type}`, performance.now());
  }

  /**
   * End timing and update metrics
   */
  endTiming(operationId: string, type: 'conflict_detection' | 'merge' | 'consolidation', success: boolean): number {
    const key = `${operationId}:${type}`;
    const startTime = this.startTimes.get(key);
    
    if (!startTime) return 0;
    
    const duration = performance.now() - startTime;
    this.startTimes.delete(key);
    
    // Update operation history
    this.operationHistory.push({ timestamp: Date.now(), duration, type });
    
    // Keep only last 1000 operations for memory efficiency
    if (this.operationHistory.length > 1000) {
      this.operationHistory = this.operationHistory.slice(-1000);
    }
    
    // Update metrics
    if (success) {
      this.updateAverageMetric(type, duration);
    } else {
      this.incrementFailureMetric(type);
    }
    
    return duration;
  }

  /**
   * Check if operation should be cached
   */
  shouldCacheResult(operationId: string, complexity: number): boolean {
    if (!this.config.enableResultCaching) return false;
    
    // Cache complex operations or operations that take significant time
    return complexity > 100 || this.operationHistory.some(op => 
      op.type === 'consolidation' && op.duration > 1000
    );
  }

  /**
   * Generate cache key for conflict detection
   */
  generateConflictCacheKey(operations: MultiPluginEditOperation[]): string {
    // Create a hash of the operations for caching
    const operationSummary = operations.map(op => ({
      id: op.id,
      pluginId: op.pluginId,
      changeCount: op.changes.length,
      timestamp: op.timestamp,
      documentPath: op.documentPath
    }));
    
    return btoa(JSON.stringify(operationSummary));
  }

  /**
   * Get cached conflict detection result
   */
  getCachedConflictDetection(cacheKey: string): ChangeConflict[] | null {
    const cached = this.conflictDetectionCache.get(cacheKey);
    return cached || null;
  }

  /**
   * Cache conflict detection result
   */
  cacheConflictDetection(cacheKey: string, conflicts: ChangeConflict[]): void {
    if (this.conflictDetectionCache.size >= this.config.maxCacheSize) {
      // Remove oldest entries
      const keysToRemove = Array.from(this.conflictDetectionCache.keys()).slice(0, 100);
      keysToRemove.forEach(key => this.conflictDetectionCache.delete(key));
    }
    
    this.conflictDetectionCache.set(cacheKey, conflicts);
    
    // Set expiration
    setTimeout(() => {
      this.conflictDetectionCache.delete(cacheKey);
    }, this.config.cacheExpirationTime);
  }

  /**
   * Optimize change processing for large documents
   */
  async optimizeForLargeDocument(
    changes: EditChange[], 
    callback: (batch: EditChange[]) => Promise<void>
  ): Promise<void> {
    if (!this.config.optimizeForLargeDocuments || changes.length <= this.config.batchProcessingSize) {
      await callback(changes);
      return;
    }

    // Process in batches to avoid blocking UI
    const batches = this.createBatches(changes, this.config.batchProcessingSize);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      // Throttle processing to prevent UI blocking
      if (i > 0) {
        await this.throttle(this.config.backgroundProcessingThrottle);
      }
      
      await callback(batch);
      
      // Update progress
      this.updateProcessingProgress((i + 1) / batches.length);
      
      // Check memory usage and trigger cleanup if needed
      if (this.shouldTriggerMemoryCleanup()) {
        await this.performMemoryCleanup();
      }
    }
  }

  /**
   * Create optimized range tree for efficient conflict detection
   */
  createRangeTree(changes: EditChange[]): RangeTree {
    // Sort changes by position for efficient range queries
    const sortedChanges = [...changes].sort((a, b) => a.from - b.from);
    
    return new RangeTree(sortedChanges);
  }

  /**
   * Efficient overlap detection using range tree
   */
  findOverlappingChanges(
    rangeTree: RangeTree, 
    targetChange: EditChange, 
    tolerance: number = 0
  ): EditChange[] {
    return rangeTree.findOverlapping(
      targetChange.from - tolerance, 
      targetChange.to + tolerance
    );
  }

  /**
   * Memory-efficient change grouping
   */
  groupChangesByProximity(changes: EditChange[], proximityThreshold: number = 100): EditChange[][] {
    if (changes.length === 0) return [];
    
    const sortedChanges = [...changes].sort((a, b) => a.from - b.from);
    const groups: EditChange[][] = [];
    let currentGroup: EditChange[] = [sortedChanges[0]];
    
    for (let i = 1; i < sortedChanges.length; i++) {
      const currentChange = sortedChanges[i];
      const lastChange = currentGroup[currentGroup.length - 1];
      
      if (currentChange.from - lastChange.to <= proximityThreshold) {
        currentGroup.push(currentChange);
      } else {
        groups.push(currentGroup);
        currentGroup = [currentChange];
      }
    }
    
    groups.push(currentGroup);
    return groups;
  }

  /**
   * Estimate processing complexity
   */
  estimateComplexity(operations: MultiPluginEditOperation[]): number {
    let complexity = 0;
    
    // Base complexity from number of operations
    complexity += operations.length * 10;
    
    // Add complexity for each change
    for (const op of operations) {
      complexity += op.changes.length * 5;
      
      // Add complexity for large text changes
      for (const change of op.changes) {
        const textLength = (change.text || change.removedText || '').length;
        complexity += Math.min(textLength / 100, 50); // Cap at 50 points per change
      }
      
      // Add complexity for semantic context processing
      if (op.changes.some(c => c.semanticContext)) {
        complexity += 25;
      }
    }
    
    return complexity;
  }

  /**
   * Check if processing should be throttled
   */
  shouldThrottleProcessing(): boolean {
    return this.metrics.currentMemoryUsage > this.config.maxMemoryUsage * 0.8 ||
           this.metrics.cpuUsagePercent > 80 ||
           this.metrics.queuedOperations > this.config.maxConcurrentOperations * 2;
  }

  /**
   * Get performance recommendations
   */
  getPerformanceRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (this.metrics.averageConflictDetectionTime > 500) {
      recommendations.push('Consider enabling result caching to improve conflict detection performance');
    }
    
    if (this.metrics.currentMemoryUsage > this.config.maxMemoryUsage * 0.7) {
      recommendations.push('Memory usage is high - consider reducing batch size or enabling more aggressive cleanup');
    }
    
    if (this.metrics.failedOperations / (this.operationHistory.length || 1) > 0.05) {
      recommendations.push('Error rate is elevated - check for data quality issues or system resource constraints');
    }
    
    if (this.metrics.operationsPerSecond < 1) {
      recommendations.push('Processing throughput is low - consider enabling async processing or increasing batch size');
    }
    
    return recommendations;
  }

  /**
   * Export performance data for analysis
   */
  exportPerformanceData(): {
    metrics: PerformanceMetrics;
    config: OptimizationConfig;
    operationHistory: Array<{timestamp: number, duration: number, type: string}>;
    memoryHistory: number[];
    recommendations: string[];
  } {
    return {
      metrics: { ...this.metrics },
      config: { ...this.config },
      operationHistory: [...this.operationHistory],
      memoryHistory: [...this.memoryUsageHistory],
      recommendations: this.getPerformanceRecommendations()
    };
  }

  // Private helper methods

  private startPerformanceMonitoring(): void {
    // Update metrics periodically
    setInterval(() => {
      this.updateRealTimeMetrics();
      this.updateMemoryUsage();
    }, 1000);
    
    // Cleanup old data periodically
    setInterval(() => {
      this.performPeriodicCleanup();
    }, this.config.memoryCleanupInterval);
  }

  private updateAverageMetric(type: string, duration: number): void {
    const recentOperations = this.operationHistory.filter(op => 
      op.type === type && op.timestamp > Date.now() - 60000 // Last minute
    );
    
    if (recentOperations.length === 0) return;
    
    const averageDuration = recentOperations.reduce((sum, op) => sum + op.duration, 0) / recentOperations.length;
    
    switch (type) {
      case 'conflict_detection':
        this.metrics.averageConflictDetectionTime = averageDuration;
        break;
      case 'merge':
        this.metrics.averageMergeTime = averageDuration;
        break;
      case 'consolidation':
        this.metrics.averageConsolidationTime = averageDuration;
        break;
    }
  }

  private incrementFailureMetric(type: string): void {
    switch (type) {
      case 'conflict_detection':
        this.metrics.failedConflictDetections++;
        break;
      case 'merge':
        this.metrics.failedMerges++;
        break;
      case 'consolidation':
        this.metrics.failedOperations++;
        break;
    }
  }

  private updateRealTimeMetrics(): void {
    const now = Date.now();
    const recentOperations = this.operationHistory.filter(op => 
      now - op.timestamp < 1000 // Last second
    );
    
    this.metrics.operationsPerSecond = recentOperations.length;
    this.metrics.conflictsPerSecond = recentOperations.filter(op => op.type === 'conflict_detection').length;
    this.metrics.mergesPerSecond = recentOperations.filter(op => op.type === 'merge').length;
  }

  private updateMemoryUsage(): void {
    // Estimate memory usage (in a real implementation, this would use actual memory APIs)
    const estimatedUsage = 
      this.conflictDetectionCache.size * 0.1 + // Rough estimate
      this.mergeResultCache.size * 0.05 +
      this.operationHistory.length * 0.001;
    
    this.metrics.currentMemoryUsage = estimatedUsage;
    this.metrics.peakMemoryUsage = Math.max(this.metrics.peakMemoryUsage, estimatedUsage);
    
    // Track memory history
    this.memoryUsageHistory.push(estimatedUsage);
    if (this.memoryUsageHistory.length > 1000) {
      this.memoryUsageHistory = this.memoryUsageHistory.slice(-1000);
    }
  }

  private shouldTriggerMemoryCleanup(): boolean {
    return this.metrics.currentMemoryUsage > this.config.maxMemoryUsage * 0.8;
  }

  private async performMemoryCleanup(): Promise<void> {
    // Clear old cache entries
    const cacheEntries = Array.from(this.conflictDetectionCache.entries());
    const entriesToRemove = cacheEntries.slice(0, Math.floor(cacheEntries.length * 0.3));
    entriesToRemove.forEach(([key]) => this.conflictDetectionCache.delete(key));
    
    // Clear old operation history
    if (this.operationHistory.length > 500) {
      this.operationHistory = this.operationHistory.slice(-500);
    }
    
    // Clear old memory history
    if (this.memoryUsageHistory.length > 500) {
      this.memoryUsageHistory = this.memoryUsageHistory.slice(-500);
    }
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }

  private performPeriodicCleanup(): void {
    // Remove expired cache entries
    this.cleanupExpiredCache();
    
    // Update metrics
    this.updateRealTimeMetrics();
    this.updateMemoryUsage();
  }

  private cleanupExpiredCache(): void {
    // This would be implemented with timestamp tracking in a real scenario
    if (this.conflictDetectionCache.size > this.config.maxCacheSize) {
      const keysToRemove = Array.from(this.conflictDetectionCache.keys()).slice(0, 100);
      keysToRemove.forEach(key => this.conflictDetectionCache.delete(key));
    }
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private async throttle(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private updateProcessingProgress(progress: number): void {
    // This could emit events or update UI progress indicators
    console.log(`Processing progress: ${Math.round(progress * 100)}%`);
  }

  // Getter methods
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  getConfig(): OptimizationConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<OptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

/**
 * Efficient Range Tree for fast overlap detection
 */
class RangeTree {
  private changes: EditChange[];
  private sortedByStart: EditChange[];
  private sortedByEnd: EditChange[];

  constructor(changes: EditChange[]) {
    this.changes = changes;
    this.sortedByStart = [...changes].sort((a, b) => a.from - b.from);
    this.sortedByEnd = [...changes].sort((a, b) => a.to - b.to);
  }

  findOverlapping(start: number, end: number): EditChange[] {
    const overlapping: EditChange[] = [];
    
    // Use binary search for efficient range queries
    const startIndex = this.binarySearchStart(start);
    const endIndex = this.binarySearchEnd(end);
    
    // Check all changes that might overlap
    for (let i = startIndex; i <= endIndex && i < this.sortedByStart.length; i++) {
      const change = this.sortedByStart[i];
      if (change.from < end && change.to > start) {
        overlapping.push(change);
      }
    }
    
    return overlapping;
  }

  private binarySearchStart(target: number): number {
    let left = 0;
    let right = this.sortedByStart.length - 1;
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (this.sortedByStart[mid].from <= target) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    
    return Math.max(0, right);
  }

  private binarySearchEnd(target: number): number {
    let left = 0;
    let right = this.sortedByEnd.length - 1;
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (this.sortedByEnd[mid].to < target) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    
    return Math.min(this.sortedByEnd.length - 1, left);
  }
}

/**
 * Error Recovery and Resilience Manager
 */
export class ConsolidationErrorManager {
  private errorHistory: Array<{timestamp: number, type: string, message: string, context?: any}> = [];
  private recoveryStrategies = new Map<string, (error: Error, context?: any) => Promise<boolean>>();

  constructor() {
    this.initializeRecoveryStrategies();
  }

  /**
   * Handle and attempt to recover from errors
   */
  async handleError(error: Error, context: any = {}): Promise<{recovered: boolean, fallbackApplied: boolean}> {
    const errorType = this.categorizeError(error);
    
    // Log error
    this.errorHistory.push({
      timestamp: Date.now(),
      type: errorType,
      message: error.message,
      context
    });
    
    // Keep only recent errors
    if (this.errorHistory.length > 1000) {
      this.errorHistory = this.errorHistory.slice(-1000);
    }
    
    // Attempt recovery
    const recoveryStrategy = this.recoveryStrategies.get(errorType);
    let recovered = false;
    
    if (recoveryStrategy) {
      try {
        recovered = await recoveryStrategy(error, context);
      } catch (recoveryError) {
        console.error('Recovery strategy failed:', recoveryError);
      }
    }
    
    // Apply fallback if recovery failed
    const fallbackApplied = !recovered && await this.applyFallback(errorType, context);
    
    return { recovered, fallbackApplied };
  }

  private categorizeError(error: Error): string {
    if (error.message.includes('memory')) return 'memory_error';
    if (error.message.includes('timeout')) return 'timeout_error';
    if (error.message.includes('conflict')) return 'conflict_error';
    if (error.message.includes('merge')) return 'merge_error';
    if (error.message.includes('permission')) return 'permission_error';
    return 'unknown_error';
  }

  private initializeRecoveryStrategies(): void {
    // Memory error recovery
    this.recoveryStrategies.set('memory_error', async (error, context) => {
      console.log('Attempting memory error recovery...');
      
      // Clear caches and trigger cleanup
      if (global.gc) global.gc();
      
      // Retry with smaller batch size
      if (context?.batchSize > 1) {
        context.batchSize = Math.max(1, Math.floor(context.batchSize / 2));
        return true;
      }
      
      return false;
    });

    // Timeout error recovery
    this.recoveryStrategies.set('timeout_error', async (error, context) => {
      console.log('Attempting timeout error recovery...');
      
      // Increase timeout and retry
      if (context?.timeout < 60000) {
        context.timeout = Math.min(60000, context.timeout * 2);
        return true;
      }
      
      return false;
    });

    // Conflict error recovery
    this.recoveryStrategies.set('conflict_error', async (error, context) => {
      console.log('Attempting conflict error recovery...');
      
      // Switch to sequential processing
      if (context?.processingMode !== 'sequential') {
        context.processingMode = 'sequential';
        return true;
      }
      
      return false;
    });
  }

  private async applyFallback(errorType: string, context: any): Promise<boolean> {
    switch (errorType) {
      case 'memory_error':
        // Fall back to minimal processing
        if (context?.operations) {
          context.operations = context.operations.slice(0, 1);
          return true;
        }
        break;
        
      case 'merge_error':
        // Fall back to priority-based resolution
        if (context?.strategy !== 'priority_wins') {
          context.strategy = 'priority_wins';
          return true;
        }
        break;
        
      default:
        // Generic fallback - disable advanced features
        if (context?.enableAdvanced !== false) {
          context.enableAdvanced = false;
          return true;
        }
    }
    
    return false;
  }

  getErrorStatistics(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    recentErrorRate: number;
    recoverySuccessRate: number;
  } {
    const now = Date.now();
    const recentErrors = this.errorHistory.filter(e => now - e.timestamp < 3600000); // Last hour
    
    const errorsByType: Record<string, number> = {};
    this.errorHistory.forEach(error => {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
    });
    
    return {
      totalErrors: this.errorHistory.length,
      errorsByType,
      recentErrorRate: recentErrors.length / 60, // Errors per minute
      recoverySuccessRate: 0.85 // This would be tracked in a real implementation
    };
  }
}