/**
 * Memory Optimization System for Track Edits
 * Manages memory usage for large documents and extensive change histories
 * Implements intelligent caching, data compression, and cleanup strategies
 */

import { Change, ChangeCluster, TrackingSession } from '../types';
import { globalEventBus } from '@writerr/shared';

export interface MemoryConfig {
  maxCacheSize: number;           // Maximum cache size in MB
  maxSessionHistory: number;      // Maximum number of sessions to keep
  maxChangeHistory: number;       // Maximum number of changes per session
  compressionThreshold: number;   // Size threshold for compression (bytes)
  cleanupInterval: number;        // Cleanup interval in ms
  lowMemoryThreshold: number;     // Threshold to trigger aggressive cleanup (MB)
  enableCompression: boolean;     // Enable data compression
  enableLazyLoading: boolean;     // Enable lazy loading of old data
  cacheStrategy: CacheStrategy;   // Cache eviction strategy
}

export enum CacheStrategy {
  LRU = 'lru',           // Least Recently Used
  LFU = 'lfu',           // Least Frequently Used
  TTL = 'ttl',           // Time To Live
  PRIORITY = 'priority'   // Priority-based
}

export interface MemoryStats {
  totalMemoryUsage: number;      // Total memory usage in bytes
  cacheSize: number;            // Current cache size in bytes
  compressedDataSize: number;   // Size of compressed data
  activeObjects: number;        // Number of active objects
  cachedObjects: number;        // Number of cached objects
  compressionRatio: number;     // Compression ratio (0-1)
  lastCleanup: number;         // Last cleanup timestamp
  cleanupCount: number;        // Number of cleanups performed
  memoryPressure: MemoryPressure; // Current memory pressure level
}

export enum MemoryPressure {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface CachedData<T = any> {
  id: string;
  data: T;
  compressed: boolean;
  compressedData?: ArrayBuffer;
  lastAccessed: number;
  accessCount: number;
  priority: number;
  size: number;
  ttl?: number;
}

export interface CompressionResult {
  originalSize: number;
  compressedSize: number;
  ratio: number;
  algorithm: string;
}

/**
 * Memory optimization and management system
 */
export class MemoryOptimizer {
  private static instance: MemoryOptimizer;
  private config: MemoryConfig;
  private cache: Map<string, CachedData> = new Map();
  private compressionWorker: Worker | null = null;
  private cleanupInterval: number | null = null;
  private stats: MemoryStats = {
    totalMemoryUsage: 0,
    cacheSize: 0,
    compressedDataSize: 0,
    activeObjects: 0,
    cachedObjects: 0,
    compressionRatio: 0,
    lastCleanup: 0,
    cleanupCount: 0,
    memoryPressure: MemoryPressure.LOW,
  };
  private memoryObserver: PerformanceObserver | null = null;
  private weakRefs: Map<string, WeakRef<any>> = new Map();

  private constructor(config?: Partial<MemoryConfig>) {
    this.config = {
      maxCacheSize: 50, // 50MB
      maxSessionHistory: 10,
      maxChangeHistory: 10000,
      compressionThreshold: 1024, // 1KB
      cleanupInterval: 30000, // 30 seconds
      lowMemoryThreshold: 100, // 100MB
      enableCompression: true,
      enableLazyLoading: true,
      cacheStrategy: CacheStrategy.LRU,
      ...config,
    };

    this.initializeCompression();
    this.startMemoryMonitoring();
    this.startPeriodicCleanup();
  }

  public static getInstance(config?: Partial<MemoryConfig>): MemoryOptimizer {
    if (!MemoryOptimizer.instance) {
      MemoryOptimizer.instance = new MemoryOptimizer(config);
    }
    return MemoryOptimizer.instance;
  }

  /**
   * Store data in optimized cache
   */
  async cacheData<T>(id: string, data: T, priority: number = 1): Promise<void> {
    try {
      const size = this.estimateDataSize(data);
      const shouldCompress = this.config.enableCompression && size > this.config.compressionThreshold;

      let cachedData: CachedData<T> = {
        id,
        data,
        compressed: false,
        lastAccessed: Date.now(),
        accessCount: 1,
        priority,
        size,
      };

      if (shouldCompress) {
        const compressionResult = await this.compressData(data);
        if (compressionResult && compressionResult.ratio < 0.8) { // Only compress if >20% reduction
          cachedData.compressed = true;
          cachedData.compressedData = compressionResult.compressed;
          cachedData.size = compressionResult.compressedSize;
          // Remove original data to save memory
          cachedData.data = null as any;
        }
      }

      // Check if we need to make room
      await this.ensureCacheSpace(cachedData.size);

      this.cache.set(id, cachedData);
      this.updateStats();

      globalEventBus.emit('data-cached', {
        id,
        size: cachedData.size,
        compressed: cachedData.compressed,
      });

    } catch (error) {
      console.error('Failed to cache data:', error);
    }
  }

  /**
   * Retrieve data from cache
   */
  async getCachedData<T>(id: string): Promise<T | null> {
    const cached = this.cache.get(id);
    if (!cached) {
      return null;
    }

    // Update access statistics
    cached.lastAccessed = Date.now();
    cached.accessCount++;

    if (cached.compressed && cached.compressedData) {
      // Decompress data
      try {
        const decompressed = await this.decompressData(cached.compressedData);
        return decompressed as T;
      } catch (error) {
        console.error('Failed to decompress data:', error);
        this.cache.delete(id);
        return null;
      }
    }

    return cached.data;
  }

  /**
   * Remove data from cache
   */
  removeCachedData(id: string): boolean {
    const removed = this.cache.delete(id);
    if (removed) {
      this.updateStats();
    }
    return removed;
  }

  /**
   * Optimize changes for storage
   */
  optimizeChanges(changes: Change[]): Change[] {
    return changes.map(change => {
      // Remove redundant metadata for long-term storage
      const optimized = { ...change };
      
      // Compress content if it's large
      if (change.content.before.length > 1000 || change.content.after.length > 1000) {
        // Mark for background compression
        this.scheduleCompression(change.id, change.content);
      }

      // Remove temporary metadata
      if (optimized.metadata) {
        delete optimized.metadata.temp;
        delete optimized.metadata.ui_state;
      }

      return optimized;
    });
  }

  /**
   * Create memory-efficient session storage
   */
  optimizeSession(session: TrackingSession): TrackingSession {
    const optimized = { ...session };

    // Limit change history
    if (optimized.changes.length > this.config.maxChangeHistory) {
      const keepCount = Math.floor(this.config.maxChangeHistory * 0.8);
      optimized.changes = optimized.changes.slice(-keepCount);
    }

    // Optimize clusters
    optimized.clusters = optimized.clusters.map(cluster => ({
      ...cluster,
      changes: cluster.changes.map(change => ({
        ...change,
        metadata: change.metadata ? {
          clusterId: change.metadata.clusterId,
          reason: change.metadata.reason,
        } : undefined,
      })),
    }));

    return optimized;
  }

  /**
   * Perform garbage collection and cleanup
   */
  async performCleanup(aggressive: boolean = false): Promise<void> {
    const startTime = Date.now();
    let freedMemory = 0;

    try {
      // Clean up weak references
      this.cleanupWeakReferences();

      // Apply cache eviction strategy
      freedMemory += await this.applyCacheEviction(aggressive);

      // Compress old data
      if (this.config.enableCompression) {
        await this.compressOldData();
      }

      // Update statistics
      this.stats.lastCleanup = Date.now();
      this.stats.cleanupCount++;
      this.updateStats();

      globalEventBus.emit('memory-cleanup-completed', {
        duration: Date.now() - startTime,
        freedMemory,
        aggressive,
        stats: this.stats,
      });

    } catch (error) {
      console.error('Memory cleanup failed:', error);
    }
  }

  /**
   * Get current memory statistics
   */
  getStats(): MemoryStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Configure memory optimizer
   */
  configure(config: Partial<MemoryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Force compression of specific data
   */
  async forceCompress(id: string): Promise<boolean> {
    const cached = this.cache.get(id);
    if (!cached || cached.compressed) {
      return false;
    }

    try {
      const compressionResult = await this.compressData(cached.data);
      if (compressionResult && compressionResult.ratio < 0.9) {
        cached.compressed = true;
        cached.compressedData = compressionResult.compressed;
        cached.size = compressionResult.compressedSize;
        cached.data = null as any; // Free original data
        
        this.updateStats();
        return true;
      }
    } catch (error) {
      console.error('Force compression failed:', error);
    }

    return false;
  }

  /**
   * Get memory pressure level
   */
  getMemoryPressure(): MemoryPressure {
    return this.stats.memoryPressure;
  }

  /**
   * Register object for weak reference tracking
   */
  registerWeakRef<T extends object>(id: string, object: T): void {
    this.weakRefs.set(id, new WeakRef(object));
  }

  /**
   * Shutdown memory optimizer
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    if (this.compressionWorker) {
      this.compressionWorker.terminate();
    }
    
    if (this.memoryObserver) {
      this.memoryObserver.disconnect();
    }
    
    this.cache.clear();
    this.weakRefs.clear();
  }

  // Private methods

  private initializeCompression(): void {
    if (!this.config.enableCompression || typeof Worker === 'undefined') {
      return;
    }

    try {
      // Create compression worker
      const workerCode = `
        importScripts('https://cdn.jsdelivr.net/npm/lz-string@1.4.4/libs/lz-string.min.js');
        
        self.onmessage = function(e) {
          const { id, action, data } = e.data;
          
          try {
            let result;
            
            if (action === 'compress') {
              const compressed = LZString.compressToUTF16(JSON.stringify(data));
              const original = JSON.stringify(data).length * 2; // UTF-16
              const compressedSize = compressed.length * 2;
              
              result = {
                compressed: new TextEncoder().encode(compressed).buffer,
                originalSize: original,
                compressedSize: compressedSize,
                ratio: compressedSize / original
              };
            } else if (action === 'decompress') {
              const decompressed = LZString.decompressFromUTF16(
                new TextDecoder().decode(data)
              );
              result = JSON.parse(decompressed);
            }
            
            self.postMessage({ id, success: true, result });
          } catch (error) {
            self.postMessage({ id, success: false, error: error.message });
          }
        };
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      this.compressionWorker = new Worker(workerUrl);

    } catch (error) {
      console.warn('Compression worker initialization failed:', error);
      this.config.enableCompression = false;
    }
  }

  private startMemoryMonitoring(): void {
    // Monitor memory usage
    if ('memory' in performance) {
      setInterval(() => {
        this.updateMemoryPressure();
      }, 1000);
    }

    // Performance observer for memory-related metrics
    if ('PerformanceObserver' in window) {
      try {
        this.memoryObserver = new PerformanceObserver((list) => {
          // Process memory-related performance entries
        });
        
        this.memoryObserver.observe({ entryTypes: ['measure', 'navigation'] });
      } catch (error) {
        // Performance observer not supported or failed
      }
    }
  }

  private startPeriodicCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const isLowMemory = this.stats.memoryPressure >= MemoryPressure.HIGH;
      this.performCleanup(isLowMemory);
    }, this.config.cleanupInterval) as any;
  }

  private updateStats(): void {
    let cacheSize = 0;
    let compressedSize = 0;
    let activeObjects = 0;

    for (const cached of this.cache.values()) {
      cacheSize += cached.size;
      if (cached.compressed) {
        compressedSize += cached.size;
      }
      if (cached.data !== null) {
        activeObjects++;
      }
    }

    this.stats.cacheSize = cacheSize;
    this.stats.compressedDataSize = compressedSize;
    this.stats.cachedObjects = this.cache.size;
    this.stats.activeObjects = activeObjects;
    this.stats.compressionRatio = cacheSize > 0 ? compressedSize / cacheSize : 0;
    this.stats.totalMemoryUsage = this.estimateTotalMemoryUsage();
  }

  private updateMemoryPressure(): void {
    const totalMemory = this.stats.totalMemoryUsage / (1024 * 1024); // MB
    
    if (totalMemory > this.config.lowMemoryThreshold * 1.5) {
      this.stats.memoryPressure = MemoryPressure.CRITICAL;
    } else if (totalMemory > this.config.lowMemoryThreshold) {
      this.stats.memoryPressure = MemoryPressure.HIGH;
    } else if (totalMemory > this.config.lowMemoryThreshold * 0.7) {
      this.stats.memoryPressure = MemoryPressure.MEDIUM;
    } else {
      this.stats.memoryPressure = MemoryPressure.LOW;
    }

    // Trigger aggressive cleanup if critical
    if (this.stats.memoryPressure === MemoryPressure.CRITICAL) {
      this.performCleanup(true);
    }
  }

  private async ensureCacheSpace(requiredSize: number): Promise<void> {
    const maxCacheBytes = this.config.maxCacheSize * 1024 * 1024;
    
    if (this.stats.cacheSize + requiredSize <= maxCacheBytes) {
      return;
    }

    // Need to free up space
    const targetSize = maxCacheBytes * 0.8; // Clean up to 80% capacity
    await this.applyCacheEviction(false, this.stats.cacheSize - targetSize + requiredSize);
  }

  private async applyCacheEviction(aggressive: boolean, targetBytes?: number): Promise<number> {
    let freedMemory = 0;
    const entries = Array.from(this.cache.entries());

    // Sort by eviction strategy
    const sortedEntries = this.sortEntriesForEviction(entries);

    for (const [id, cached] of sortedEntries) {
      if (targetBytes && freedMemory >= targetBytes) {
        break;
      }

      const shouldEvict = aggressive || this.shouldEvictEntry(cached);
      
      if (shouldEvict) {
        freedMemory += cached.size;
        this.cache.delete(id);
        
        // Clean up compressed data
        if (cached.compressedData) {
          // ArrayBuffer will be garbage collected
        }
      }
    }

    return freedMemory;
  }

  private sortEntriesForEviction(entries: [string, CachedData][]): [string, CachedData][] {
    switch (this.config.cacheStrategy) {
      case CacheStrategy.LRU:
        return entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
      
      case CacheStrategy.LFU:
        return entries.sort((a, b) => a[1].accessCount - b[1].accessCount);
      
      case CacheStrategy.PRIORITY:
        return entries.sort((a, b) => a[1].priority - b[1].priority);
      
      case CacheStrategy.TTL:
        return entries.sort((a, b) => {
          const aTtl = a[1].ttl || Infinity;
          const bTtl = b[1].ttl || Infinity;
          return (a[1].lastAccessed + aTtl) - (b[1].lastAccessed + bTtl);
        });
      
      default:
        return entries;
    }
  }

  private shouldEvictEntry(cached: CachedData): boolean {
    const now = Date.now();
    const age = now - cached.lastAccessed;
    
    // Evict if not accessed in last 5 minutes and low priority
    if (age > 300000 && cached.priority < 2) {
      return true;
    }
    
    // Evict if very old and not frequently accessed
    if (age > 900000 && cached.accessCount < 5) {
      return true;
    }
    
    return false;
  }

  private cleanupWeakReferences(): void {
    const toDelete: string[] = [];
    
    for (const [id, weakRef] of this.weakRefs) {
      if (weakRef.deref() === undefined) {
        toDelete.push(id);
      }
    }
    
    toDelete.forEach(id => this.weakRefs.delete(id));
  }

  private async compressOldData(): Promise<void> {
    const now = Date.now();
    const compressionPromises: Promise<void>[] = [];
    
    for (const [id, cached] of this.cache) {
      if (!cached.compressed && 
          cached.size > this.config.compressionThreshold &&
          now - cached.lastAccessed > 60000) { // 1 minute old
        
        compressionPromises.push(this.forceCompress(id).then(() => {}));
      }
    }
    
    await Promise.all(compressionPromises);
  }

  private async compressData(data: any): Promise<CompressionResult | null> {
    if (!this.compressionWorker) {
      return null;
    }

    return new Promise((resolve) => {
      const id = `compress_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const messageHandler = (e: MessageEvent) => {
        if (e.data.id === id) {
          this.compressionWorker!.removeEventListener('message', messageHandler);
          
          if (e.data.success) {
            resolve({
              compressed: e.data.result.compressed,
              originalSize: e.data.result.originalSize,
              compressedSize: e.data.result.compressedSize,
              ratio: e.data.result.ratio,
              algorithm: 'lz-string',
            });
          } else {
            resolve(null);
          }
        }
      };
      
      this.compressionWorker.addEventListener('message', messageHandler);
      this.compressionWorker.postMessage({
        id,
        action: 'compress',
        data,
      });
    });
  }

  private async decompressData(compressedData: ArrayBuffer): Promise<any> {
    if (!this.compressionWorker) {
      throw new Error('Compression worker not available');
    }

    return new Promise((resolve, reject) => {
      const id = `decompress_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const messageHandler = (e: MessageEvent) => {
        if (e.data.id === id) {
          this.compressionWorker!.removeEventListener('message', messageHandler);
          
          if (e.data.success) {
            resolve(e.data.result);
          } else {
            reject(new Error(e.data.error));
          }
        }
      };
      
      this.compressionWorker.addEventListener('message', messageHandler);
      this.compressionWorker.postMessage({
        id,
        action: 'decompress',
        data: compressedData,
      });
    });
  }

  private scheduleCompression(id: string, content: any): void {
    // Schedule for background compression
    setTimeout(() => {
      this.forceCompress(id);
    }, 1000);
  }

  private estimateDataSize(data: any): number {
    // Rough estimation of data size in bytes
    try {
      return JSON.stringify(data).length * 2; // UTF-16 encoding
    } catch {
      return 1000; // Fallback estimate
    }
  }

  private estimateTotalMemoryUsage(): number {
    let total = this.stats.cacheSize;
    
    // Add estimated overhead
    total += this.cache.size * 100; // Metadata overhead
    total += this.weakRefs.size * 50; // Weak reference overhead
    
    return total;
  }
}

// Export singleton instance
export const memoryOptimizer = MemoryOptimizer.getInstance();

// Convenience functions
export function cacheData<T>(id: string, data: T, priority?: number): Promise<void> {
  return memoryOptimizer.cacheData(id, data, priority);
}

export function getCachedData<T>(id: string): Promise<T | null> {
  return memoryOptimizer.getCachedData<T>(id);
}

export function performMemoryCleanup(aggressive?: boolean): Promise<void> {
  return memoryOptimizer.performCleanup(aggressive);
}

export function getMemoryStats(): MemoryStats {
  return memoryOptimizer.getStats();
}