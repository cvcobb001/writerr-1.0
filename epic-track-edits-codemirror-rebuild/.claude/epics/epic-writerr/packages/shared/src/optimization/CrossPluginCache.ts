/**
 * Cross-Plugin Cache System
 * High-performance caching layer shared across all Writerr plugins
 */

import { globalEventBus } from '../event-bus';
import { performanceProfiler, PerformanceCategory } from './PerformanceProfiler';
import { CacheConfig, CacheStrategy, CacheEntry } from './types';

export interface CacheStats {
  hitRate: number;
  missRate: number;
  totalRequests: number;
  totalHits: number;
  totalMisses: number;
  evictions: number;
  currentSize: number;
  maxSize: number;
  compressionRatio: number;
  averageAccessTime: number;
}

export interface CacheMetrics {
  perCategory: Map<string, CacheStats>;
  overall: CacheStats;
  topItems: Array<{ key: string; accessCount: number; size: number }>;
  evictionHistory: Array<{ key: string; reason: string; timestamp: number }>;
}

/**
 * High-performance cross-plugin cache with compression and intelligent eviction
 */
export class CrossPluginCache {
  private static instance: CrossPluginCache;
  private config: CacheConfig;
  private cache: Map<string, CacheEntry> = new Map();
  private accessOrder: Map<string, number> = new Map(); // For LRU
  private frequencies: Map<string, number> = new Map(); // For LFU
  private stats: CacheStats;
  private compressionWorker?: Worker;
  private cleanupInterval?: number;
  private warmupData: Map<string, any> = new Map();

  private constructor(config?: Partial<CacheConfig>) {
    this.config = {
      enabled: true,
      maxSize: 100 * 1024 * 1024, // 100MB default
      ttl: 60 * 60 * 1000, // 1 hour default
      strategy: CacheStrategy.LRU,
      compression: true,
      warmupEnabled: true,
      ...config
    };

    this.stats = this.initializeStats();
    this.initializeCompression();
    this.startCleanupTimer();
    this.setupEventListeners();
    
    if (this.config.warmupEnabled) {
      this.initializeWarmup();
    }
  }

  public static getInstance(config?: Partial<CacheConfig>): CrossPluginCache {
    if (!CrossPluginCache.instance) {
      CrossPluginCache.instance = new CrossPluginCache(config);
    }
    return CrossPluginCache.instance;
  }

  /**
   * Get data from cache
   */
  async get<T = any>(key: string, category?: string): Promise<T | null> {
    if (!this.config.enabled) return null;

    return performanceProfiler.measureAsync(
      `cache-get-${category || 'default'}`,
      PerformanceCategory.STORAGE,
      async () => {
        this.stats.totalRequests++;
        
        const entry = this.cache.get(key);
        
        if (!entry) {
          this.stats.totalMisses++;
          this.stats.missRate = (this.stats.totalMisses / this.stats.totalRequests) * 100;
          return null;
        }

        // Check TTL
        if (this.config.ttl > 0 && Date.now() - entry.timestamp > this.config.ttl) {
          this.cache.delete(key);
          this.stats.totalMisses++;
          this.stats.missRate = (this.stats.totalMisses / this.stats.totalRequests) * 100;
          return null;
        }

        // Update access patterns
        this.updateAccessPatterns(key, entry);

        // Handle decompression if needed
        let value = entry.value;
        if (entry.compressed && entry.metadata?.compressedData) {
          try {
            value = await this.decompress(entry.metadata.compressedData);
          } catch (error) {
            console.error('[CrossPluginCache] Decompression failed:', error);
            this.cache.delete(key);
            return null;
          }
        }

        this.stats.totalHits++;
        this.stats.hitRate = (this.stats.totalHits / this.stats.totalRequests) * 100;

        return value as T;
      },
      { key, category, compressed: entry?.compressed }
    );
  }

  /**
   * Set data in cache
   */
  async set<T = any>(
    key: string, 
    value: T, 
    options?: { 
      ttl?: number; 
      category?: string; 
      priority?: number;
      compress?: boolean;
    }
  ): Promise<boolean> {
    if (!this.config.enabled) return false;

    return performanceProfiler.measureAsync(
      `cache-set-${options?.category || 'default'}`,
      PerformanceCategory.STORAGE,
      async () => {
        try {
          const size = this.estimateSize(value);
          const shouldCompress = (options?.compress ?? this.config.compression) && size > 1024;

          let finalValue = value;
          let compressed = false;
          let compressedData: ArrayBuffer | undefined;

          // Compress if needed
          if (shouldCompress && this.compressionWorker) {
            try {
              const result = await this.compress(value);
              if (result && result.compressedSize < size * 0.8) { // Only if >20% reduction
                compressedData = result.data;
                finalValue = null as any; // Clear original to save memory
                compressed = true;
              }
            } catch (error) {
              console.warn('[CrossPluginCache] Compression failed, storing uncompressed:', error);
            }
          }

          // Ensure space
          await this.ensureSpace(compressed ? (compressedData?.byteLength || size) : size);

          const entry: CacheEntry<T> = {
            key,
            value: finalValue,
            size: compressed ? (compressedData?.byteLength || size) : size,
            timestamp: Date.now(),
            accessCount: 1,
            lastAccess: Date.now(),
            compressed,
            metadata: {
              category: options?.category,
              priority: options?.priority || 1,
              ttl: options?.ttl,
              compressedData
            }
          };

          this.cache.set(key, entry);
          this.updateAccessPatterns(key, entry);
          this.updateStats();

          globalEventBus.emit('cache-item-set', {
            key,
            size: entry.size,
            compressed,
            category: options?.category
          });

          return true;

        } catch (error) {
          console.error('[CrossPluginCache] Failed to set cache item:', error);
          return false;
        }
      },
      { 
        key, 
        category: options?.category, 
        size: this.estimateSize(value),
        willCompress: options?.compress ?? this.config.compression
      }
    );
  }

  /**
   * Delete item from cache
   */
  delete(key: string): boolean {
    const existed = this.cache.has(key);
    if (existed) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.frequencies.delete(key);
      this.updateStats();
      
      globalEventBus.emit('cache-item-deleted', { key });
    }
    return existed;
  }

  /**
   * Clear cache or specific category
   */
  clear(category?: string): void {
    if (category) {
      // Clear specific category
      const keysToDelete = Array.from(this.cache.entries())
        .filter(([_, entry]) => entry.metadata?.category === category)
        .map(([key, _]) => key);
      
      keysToDelete.forEach(key => this.delete(key));
    } else {
      // Clear everything
      this.cache.clear();
      this.accessOrder.clear();
      this.frequencies.clear();
      this.stats = this.initializeStats();
    }

    globalEventBus.emit('cache-cleared', { category });
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) return false;
    
    // Check TTL
    if (this.config.ttl > 0 && Date.now() - entry.timestamp > this.config.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Get detailed cache metrics
   */
  getMetrics(): CacheMetrics {
    const perCategory = new Map<string, CacheStats>();
    
    // Calculate per-category stats
    const categories = new Set<string>();
    this.cache.forEach(entry => {
      if (entry.metadata?.category) {
        categories.add(entry.metadata.category);
      }
    });

    categories.forEach(category => {
      const categoryEntries = Array.from(this.cache.values()).filter(
        entry => entry.metadata?.category === category
      );
      
      const categoryStats: CacheStats = {
        hitRate: 0, // Would need to track per category
        missRate: 0,
        totalRequests: 0,
        totalHits: 0,
        totalMisses: 0,
        evictions: 0,
        currentSize: categoryEntries.reduce((sum, entry) => sum + entry.size, 0),
        maxSize: this.config.maxSize, // Shared max size
        compressionRatio: this.calculateCompressionRatio(categoryEntries),
        averageAccessTime: 0
      };
      
      perCategory.set(category, categoryStats);
    });

    const topItems = Array.from(this.cache.entries())
      .map(([key, entry]) => ({
        key,
        accessCount: entry.accessCount,
        size: entry.size
      }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10);

    return {
      perCategory,
      overall: this.getStats(),
      topItems,
      evictionHistory: [] // Would need to track evictions
    };
  }

  /**
   * Warmup cache with frequently used data
   */
  async warmup(data?: Map<string, any>): Promise<void> {
    if (!this.config.warmupEnabled) return;

    const warmupData = data || this.warmupData;
    
    return performanceProfiler.measureAsync(
      'cache-warmup',
      PerformanceCategory.STARTUP,
      async () => {
        const promises = Array.from(warmupData.entries()).map(([key, value]) =>
          this.set(key, value, { category: 'warmup', priority: 10 })
        );
        
        await Promise.all(promises);
        
        globalEventBus.emit('cache-warmup-completed', {
          itemsLoaded: warmupData.size,
          cacheSize: this.cache.size
        });
      }
    );
  }

  /**
   * Preload data for a specific category
   */
  async preload<T>(
    generator: () => Promise<Map<string, T>>,
    category: string
  ): Promise<void> {
    try {
      const data = await generator();
      
      const promises = Array.from(data.entries()).map(([key, value]) =>
        this.set(key, value, { category, priority: 5 })
      );
      
      await Promise.all(promises);
      
      globalEventBus.emit('cache-preload-completed', {
        category,
        itemsLoaded: data.size
      });
      
    } catch (error) {
      console.error(`[CrossPluginCache] Preload failed for category ${category}:`, error);
    }
  }

  /**
   * Configure cache
   */
  configure(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (!this.config.enabled) {
      this.clear();
    }
  }

  /**
   * Manual cleanup/garbage collection
   */
  async cleanup(): Promise<void> {
    const startSize = this.cache.size;
    
    return performanceProfiler.measureAsync(
      'cache-cleanup',
      PerformanceCategory.MEMORY,
      async () => {
        // Remove expired items
        const now = Date.now();
        const expiredKeys: string[] = [];
        
        for (const [key, entry] of this.cache.entries()) {
          const ttl = entry.metadata?.ttl || this.config.ttl;
          if (ttl > 0 && now - entry.timestamp > ttl) {
            expiredKeys.push(key);
          }
        }
        
        expiredKeys.forEach(key => this.delete(key));
        
        // Trigger eviction if over size limit
        if (this.getCurrentSize() > this.config.maxSize) {
          await this.evictItems(this.getCurrentSize() - this.config.maxSize * 0.8);
        }
        
        const cleanedCount = startSize - this.cache.size;
        
        globalEventBus.emit('cache-cleanup-completed', {
          itemsCleaned: cleanedCount,
          expiredItems: expiredKeys.length,
          currentSize: this.cache.size
        });
      }
    );
  }

  /**
   * Shutdown cache
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    if (this.compressionWorker) {
      this.compressionWorker.terminate();
    }
    
    this.clear();
  }

  // Private methods

  private initializeStats(): CacheStats {
    return {
      hitRate: 0,
      missRate: 0,
      totalRequests: 0,
      totalHits: 0,
      totalMisses: 0,
      evictions: 0,
      currentSize: 0,
      maxSize: this.config.maxSize,
      compressionRatio: 0,
      averageAccessTime: 0
    };
  }

  private initializeCompression(): void {
    if (!this.config.compression || typeof Worker === 'undefined') return;

    try {
      const workerCode = `
        importScripts('https://cdn.jsdelivr.net/npm/lz-string@1.4.4/libs/lz-string.min.js');
        
        self.onmessage = function(e) {
          const { id, action, data } = e.data;
          
          try {
            let result;
            
            if (action === 'compress') {
              const jsonStr = JSON.stringify(data);
              const compressed = LZString.compressToUTF16(jsonStr);
              const compressedBuffer = new TextEncoder().encode(compressed);
              
              result = {
                data: compressedBuffer.buffer,
                originalSize: jsonStr.length * 2,
                compressedSize: compressedBuffer.byteLength
              };
            } else if (action === 'decompress') {
              const compressed = new TextDecoder().decode(data);
              const decompressed = LZString.decompressFromUTF16(compressed);
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
      console.warn('[CrossPluginCache] Compression worker initialization failed:', error);
      this.config.compression = false;
    }
  }

  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000) as any; // Every 5 minutes
  }

  private setupEventListeners(): void {
    globalEventBus.on('memory-pressure-high', () => {
      this.cleanup();
    });

    globalEventBus.on('performance-critical', () => {
      // Aggressive cleanup during performance issues
      this.evictItems(this.getCurrentSize() * 0.5); // Remove 50%
    });
  }

  private initializeWarmup(): void {
    // This would be populated with commonly accessed data patterns
    // For now, empty - would be configured by each plugin
  }

  private updateAccessPatterns(key: string, entry: CacheEntry): void {
    entry.accessCount++;
    entry.lastAccess = Date.now();

    // Update access order (for LRU)
    this.accessOrder.set(key, Date.now());

    // Update frequency (for LFU)
    this.frequencies.set(key, (this.frequencies.get(key) || 0) + 1);
  }

  private async ensureSpace(requiredSize: number): Promise<void> {
    const currentSize = this.getCurrentSize();
    
    if (currentSize + requiredSize <= this.config.maxSize) {
      return;
    }

    const spaceNeeded = (currentSize + requiredSize) - (this.config.maxSize * 0.9);
    await this.evictItems(spaceNeeded);
  }

  private async evictItems(bytesToEvict: number): Promise<void> {
    const entries = Array.from(this.cache.entries());
    let evictedBytes = 0;

    // Sort entries based on eviction strategy
    const sortedEntries = this.sortEntriesForEviction(entries);

    for (const [key, entry] of sortedEntries) {
      if (evictedBytes >= bytesToEvict) break;

      evictedBytes += entry.size;
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.frequencies.delete(key);
      this.stats.evictions++;

      globalEventBus.emit('cache-item-evicted', {
        key,
        size: entry.size,
        reason: this.config.strategy,
        category: entry.metadata?.category
      });
    }

    this.updateStats();
  }

  private sortEntriesForEviction(entries: [string, CacheEntry][]): [string, CacheEntry][] {
    switch (this.config.strategy) {
      case CacheStrategy.LRU:
        return entries.sort((a, b) => a[1].lastAccess - b[1].lastAccess);
      
      case CacheStrategy.LFU:
        return entries.sort((a, b) => a[1].accessCount - b[1].accessCount);
      
      case CacheStrategy.FIFO:
        return entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      case CacheStrategy.LIFO:
        return entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
      
      default:
        return entries;
    }
  }

  private updateStats(): void {
    this.stats.currentSize = this.getCurrentSize();
    this.stats.compressionRatio = this.calculateCompressionRatio(Array.from(this.cache.values()));
    
    // Update hit/miss rates
    if (this.stats.totalRequests > 0) {
      this.stats.hitRate = (this.stats.totalHits / this.stats.totalRequests) * 100;
      this.stats.missRate = (this.stats.totalMisses / this.stats.totalRequests) * 100;
    }

    globalEventBus.emit('cache-stats-updated', this.stats);
  }

  private getCurrentSize(): number {
    return Array.from(this.cache.values()).reduce((total, entry) => total + entry.size, 0);
  }

  private calculateCompressionRatio(entries: CacheEntry[]): number {
    const compressedEntries = entries.filter(e => e.compressed);
    if (compressedEntries.length === 0) return 0;

    const totalCompressed = compressedEntries.reduce((sum, e) => sum + e.size, 0);
    const totalOriginal = compressedEntries.reduce((sum, e) => {
      // Estimate original size - would be better to track this
      return sum + (e.size * 2); // Rough estimate
    }, 0);

    return totalOriginal > 0 ? (totalCompressed / totalOriginal) : 0;
  }

  private estimateSize(value: any): number {
    try {
      return JSON.stringify(value).length * 2; // UTF-16 approximation
    } catch {
      return 1000; // Fallback
    }
  }

  private async compress(data: any): Promise<{ data: ArrayBuffer; originalSize: number; compressedSize: number } | null> {
    if (!this.compressionWorker) return null;

    return new Promise((resolve) => {
      const id = `compress_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const messageHandler = (e: MessageEvent) => {
        if (e.data.id === id) {
          this.compressionWorker!.removeEventListener('message', messageHandler);
          resolve(e.data.success ? e.data.result : null);
        }
      };

      this.compressionWorker.addEventListener('message', messageHandler);
      this.compressionWorker.postMessage({ id, action: 'compress', data });
    });
  }

  private async decompress(data: ArrayBuffer): Promise<any> {
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
      this.compressionWorker.postMessage({ id, action: 'decompress', data });
    });
  }
}

// Export singleton instance
export const crossPluginCache = CrossPluginCache.getInstance();

// Convenience functions
export async function getFromCache<T = any>(key: string, category?: string): Promise<T | null> {
  return crossPluginCache.get<T>(key, category);
}

export async function setInCache<T = any>(
  key: string, 
  value: T, 
  options?: { ttl?: number; category?: string; priority?: number; compress?: boolean }
): Promise<boolean> {
  return crossPluginCache.set(key, value, options);
}

export function deleteFromCache(key: string): boolean {
  return crossPluginCache.delete(key);
}

export function clearCache(category?: string): void {
  crossPluginCache.clear(category);
}

export function getCacheStats(): CacheStats {
  return crossPluginCache.getStats();
}