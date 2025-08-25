/**
 * @fileoverview Memory management and optimization for large documents
 */

import { DocumentState, MemoryProfileInfo } from './types';
import { Change, ChangeCluster } from '../types';
import { EventEmitter } from 'events';

export class MemoryManager extends EventEmitter {
  private memoryCache = new Map<string, WeakRef<any>>();
  private accessTimes = new Map<string, number>();
  private compressionCache = new Map<string, CompressedData>();
  private memoryThreshold: number;
  private compressionThreshold: number;
  private maxCacheSize: number;
  private gcTimer: NodeJS.Timer | null = null;

  constructor(options: MemoryManagerOptions = {}) {
    super();
    
    this.memoryThreshold = options.memoryThreshold || 100 * 1024 * 1024; // 100MB
    this.compressionThreshold = options.compressionThreshold || 50 * 1024; // 50KB
    this.maxCacheSize = options.maxCacheSize || 1000;
    
    this.startMemoryMonitoring();
    this.startGarbageCollection();
  }

  /**
   * Optimize document state for memory usage
   */
  async optimizeDocumentState(state: DocumentState): Promise<OptimizedDocumentState> {
    const optimized: OptimizedDocumentState = {
      id: state.id,
      filePath: state.filePath,
      lastModified: state.lastModified,
      version: state.version,
      metadata: state.metadata,
      snapshots: state.snapshots.slice(-10), // Keep only last 10 snapshots
      changes: await this.optimizeChanges(state.changes),
      clusters: await this.optimizeClusters(state.clusters),
      sessions: await this.optimizeSessions(state.sessions),
      compressed: false,
      compressionRatio: 1.0,
      memoryFootprint: 0
    };

    // Calculate memory footprint
    optimized.memoryFootprint = this.calculateMemoryFootprint(optimized);

    // Compress if needed
    if (optimized.memoryFootprint > this.compressionThreshold) {
      const compressed = await this.compressDocumentState(optimized);
      if (compressed.compressionRatio < 0.8) { // Only use if saves at least 20%
        return compressed;
      }
    }

    return optimized;
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats(): MemoryStats {
    const stats: MemoryStats = {
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      totalCacheSize: this.memoryCache.size,
      compressionCacheSize: this.compressionCache.size,
      avgCompressionRatio: 0,
      memoryEfficiency: 0,
      gcFrequency: 0,
      lastGC: 0
    };

    // Get Node.js memory usage if available
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      stats.heapUsed = usage.heapUsed;
      stats.heapTotal = usage.heapTotal;
      stats.external = usage.external;
    }

    // Calculate compression statistics
    if (this.compressionCache.size > 0) {
      let totalRatio = 0;
      for (const compressed of this.compressionCache.values()) {
        totalRatio += compressed.compressionRatio;
      }
      stats.avgCompressionRatio = totalRatio / this.compressionCache.size;
    }

    // Calculate memory efficiency
    const totalMemory = stats.heapUsed + stats.external;
    const cacheMemory = this.estimateCacheMemory();
    stats.memoryEfficiency = cacheMemory > 0 ? totalMemory / cacheMemory : 1.0;

    return stats;
  }

  /**
   * Create memory profile for analysis
   */
  createMemoryProfile(): MemoryProfile {
    const profile: MemoryProfile = {
      timestamp: Date.now(),
      totalDocuments: this.memoryCache.size,
      memoryBreakdown: {
        changes: 0,
        clusters: 0,
        sessions: 0,
        snapshots: 0,
        metadata: 0,
        compressed: 0
      },
      hotSpots: [],
      recommendations: []
    };

    // Analyze memory usage by type
    for (const [key, weakRef] of this.memoryCache) {
      const item = weakRef.deref();
      if (!item) continue;

      const size = this.estimateObjectSize(item);
      
      if (key.includes('changes')) {
        profile.memoryBreakdown.changes += size;
      } else if (key.includes('clusters')) {
        profile.memoryBreakdown.clusters += size;
      } else if (key.includes('sessions')) {
        profile.memoryBreakdown.sessions += size;
      } else if (key.includes('snapshots')) {
        profile.memoryBreakdown.snapshots += size;
      } else {
        profile.memoryBreakdown.metadata += size;
      }

      // Identify hot spots (large objects or frequently accessed)
      const accessTime = this.accessTimes.get(key) || 0;
      const accessFrequency = Date.now() - accessTime;
      
      if (size > 10 * 1024 || accessFrequency < 60000) { // >10KB or accessed within last minute
        profile.hotSpots.push({
          key,
          size,
          accessFrequency,
          type: this.getObjectType(key)
        });
      }
    }

    // Generate recommendations
    profile.recommendations = this.generateMemoryRecommendations(profile);

    return profile;
  }

  /**
   * Force garbage collection
   */
  async forceGarbageCollection(): Promise<GCResult> {
    const before = this.getMemoryStats();
    const startTime = performance.now();
    
    let collected = 0;
    let compressed = 0;

    // Clean up weak references that are no longer valid
    for (const [key, weakRef] of this.memoryCache) {
      if (!weakRef.deref()) {
        this.memoryCache.delete(key);
        this.accessTimes.delete(key);
        collected++;
      }
    }

    // Compress old, large objects
    for (const [key, weakRef] of this.memoryCache) {
      const item = weakRef.deref();
      if (!item) continue;

      const accessTime = this.accessTimes.get(key) || 0;
      const timeSinceAccess = Date.now() - accessTime;
      const size = this.estimateObjectSize(item);

      // Compress if not accessed recently and large
      if (timeSinceAccess > 5 * 60 * 1000 && size > this.compressionThreshold) { // 5 minutes
        try {
          const compressedData = await this.compressObject(item);
          this.compressionCache.set(key, compressedData);
          this.memoryCache.delete(key);
          compressed++;
        } catch (error) {
          // Compression failed, keep original
        }
      }
    }

    // Clean up old compression cache entries
    const compressionKeys = Array.from(this.compressionCache.keys());
    for (const key of compressionKeys) {
      const compressed = this.compressionCache.get(key)!;
      const timeSinceAccess = Date.now() - (this.accessTimes.get(key) || 0);
      
      if (timeSinceAccess > 30 * 60 * 1000) { // 30 minutes
        this.compressionCache.delete(key);
      }
    }

    const after = this.getMemoryStats();
    const duration = performance.now() - startTime;

    const result: GCResult = {
      timestamp: Date.now(),
      duration,
      beforeMemory: before.heapUsed,
      afterMemory: after.heapUsed,
      memoryFreed: before.heapUsed - after.heapUsed,
      objectsCollected: collected,
      objectsCompressed: compressed,
      efficiency: (before.heapUsed - after.heapUsed) / before.heapUsed
    };

    this.emit('garbageCollected', result);
    return result;
  }

  /**
   * Preload frequently accessed data
   */
  async preloadHotData(documentIds: string[]): Promise<void> {
    for (const documentId of documentIds) {
      // Check if we have compressed data for this document
      const compressedKey = `document:${documentId}`;
      const compressed = this.compressionCache.get(compressedKey);
      
      if (compressed) {
        try {
          const decompressed = await this.decompressObject(compressed);
          this.memoryCache.set(compressedKey, new WeakRef(decompressed));
          this.accessTimes.set(compressedKey, Date.now());
          this.compressionCache.delete(compressedKey);
        } catch (error) {
          this.emit('error', new Error(`Failed to preload data for ${documentId}: ${error.message}`));
        }
      }
    }
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
    }

    this.memoryCache.clear();
    this.accessTimes.clear();
    this.compressionCache.clear();
    this.removeAllListeners();
  }

  // Private methods

  private async optimizeChanges(changes: Map<string, Change>): Promise<OptimizedChanges> {
    const changeArray = Array.from(changes.values());
    
    // Sort by timestamp (newest first)
    changeArray.sort((a, b) => b.timestamp - a.timestamp);

    // Keep recent changes in memory, compress old ones
    const recentChanges = new Map<string, Change>();
    const oldChanges: Change[] = [];

    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours

    for (const change of changeArray) {
      if (change.timestamp > cutoffTime || change.status === 'pending') {
        recentChanges.set(change.id, change);
      } else {
        oldChanges.push(change);
      }
    }

    return {
      recent: recentChanges,
      archived: oldChanges.length > 0 ? await this.compressChanges(oldChanges) : null,
      totalCount: changeArray.length
    };
  }

  private async optimizeClusters(clusters: Map<string, ChangeCluster>): Promise<OptimizedClusters> {
    const activeCluster = new Map<string, ChangeCluster>();
    const inactiveClusters: ChangeCluster[] = [];

    for (const [id, cluster] of clusters) {
      if (cluster.status === 'pending' as any) {
        activeCluster.set(id, cluster);
      } else {
        inactiveClusters.push(cluster);
      }
    }

    return {
      active: activeCluster,
      inactive: inactiveClusters.length > 0 ? await this.compressClusters(inactiveClusters) : null,
      totalCount: clusters.size
    };
  }

  private async optimizeSessions(sessions: Map<string, any>): Promise<OptimizedSessions> {
    const activeSessions = new Map<string, any>();
    const endedSessions: any[] = [];

    for (const [id, session] of sessions) {
      if (!session.endTime) {
        activeSessions.set(id, session);
      } else {
        endedSessions.push(session);
      }
    }

    return {
      active: activeSessions,
      ended: endedSessions.length > 0 ? await this.compressSessions(endedSessions) : null,
      totalCount: sessions.size
    };
  }

  private async compressDocumentState(state: OptimizedDocumentState): Promise<OptimizedDocumentState> {
    try {
      const serialized = JSON.stringify(state);
      const compressed = await this.compressString(serialized);
      
      return {
        ...state,
        compressed: true,
        compressionRatio: compressed.length / serialized.length,
        compressedData: compressed
      };
    } catch (error) {
      return state; // Return original if compression fails
    }
  }

  private async compressChanges(changes: Change[]): Promise<string> {
    const serialized = JSON.stringify(changes);
    return this.compressString(serialized);
  }

  private async compressClusters(clusters: ChangeCluster[]): Promise<string> {
    const serialized = JSON.stringify(clusters);
    return this.compressString(serialized);
  }

  private async compressSessions(sessions: any[]): Promise<string> {
    const serialized = JSON.stringify(sessions);
    return this.compressString(serialized);
  }

  private async compressString(data: string): Promise<string> {
    // In a real implementation, this would use actual compression
    return btoa(data); // Base64 as placeholder
  }

  private async compressObject(obj: any): Promise<CompressedData> {
    const serialized = JSON.stringify(obj);
    const compressed = await this.compressString(serialized);
    
    return {
      data: compressed,
      originalSize: serialized.length,
      compressedSize: compressed.length,
      compressionRatio: compressed.length / serialized.length,
      timestamp: Date.now(),
      algorithm: 'base64' // Placeholder
    };
  }

  private async decompressObject(compressed: CompressedData): Promise<any> {
    const decompressed = atob(compressed.data); // Base64 decode as placeholder
    return JSON.parse(decompressed);
  }

  private calculateMemoryFootprint(state: OptimizedDocumentState): number {
    // Estimate memory usage in bytes
    return JSON.stringify(state).length * 2; // Rough estimate (UTF-16)
  }

  private estimateObjectSize(obj: any): number {
    try {
      return JSON.stringify(obj).length * 2; // Rough estimate
    } catch (error) {
      return 1024; // Default estimate
    }
  }

  private estimateCacheMemory(): number {
    let total = 0;
    
    for (const weakRef of this.memoryCache.values()) {
      const obj = weakRef.deref();
      if (obj) {
        total += this.estimateObjectSize(obj);
      }
    }
    
    return total;
  }

  private getObjectType(key: string): string {
    if (key.includes('changes')) return 'changes';
    if (key.includes('clusters')) return 'clusters';
    if (key.includes('sessions')) return 'sessions';
    if (key.includes('snapshots')) return 'snapshots';
    return 'metadata';
  }

  private generateMemoryRecommendations(profile: MemoryProfile): string[] {
    const recommendations: string[] = [];
    
    const totalMemory = Object.values(profile.memoryBreakdown).reduce((sum, val) => sum + val, 0);
    
    // Check for memory-heavy components
    if (profile.memoryBreakdown.changes > totalMemory * 0.5) {
      recommendations.push('Consider implementing change pagination or archival for old changes');
    }
    
    if (profile.memoryBreakdown.snapshots > totalMemory * 0.3) {
      recommendations.push('Reduce snapshot retention or implement snapshot compression');
    }
    
    if (profile.hotSpots.length > 50) {
      recommendations.push('High number of hot spots detected - consider implementing LRU cache');
    }
    
    const stats = this.getMemoryStats();
    if (stats.avgCompressionRatio > 0.8) {
      recommendations.push('Low compression ratio - review data structure efficiency');
    }
    
    return recommendations;
  }

  private startMemoryMonitoring(): void {
    setInterval(() => {
      const stats = this.getMemoryStats();
      
      if (stats.heapUsed > this.memoryThreshold) {
        this.emit('memoryThresholdExceeded', stats);
        this.forceGarbageCollection();
      }
      
      this.emit('memoryProfileUpdate', {
        timestamp: Date.now(),
        totalDocuments: this.memoryCache.size,
        totalChanges: 0,
        memoryUsage: stats.heapUsed,
        avgConfidence: 0
      } as MemoryProfileInfo);
      
    }, 30000); // Check every 30 seconds
  }

  private startGarbageCollection(): void {
    this.gcTimer = setInterval(async () => {
      await this.forceGarbageCollection();
    }, 5 * 60 * 1000); // Run GC every 5 minutes
  }
}

// Types

interface MemoryManagerOptions {
  memoryThreshold?: number;
  compressionThreshold?: number;
  maxCacheSize?: number;
}

interface OptimizedDocumentState {
  id: string;
  filePath: string;
  lastModified: number;
  version: number;
  metadata: any;
  snapshots: any[];
  changes: OptimizedChanges;
  clusters: OptimizedClusters;
  sessions: OptimizedSessions;
  compressed: boolean;
  compressionRatio: number;
  memoryFootprint: number;
  compressedData?: string;
}

interface OptimizedChanges {
  recent: Map<string, Change>;
  archived: string | null;
  totalCount: number;
}

interface OptimizedClusters {
  active: Map<string, ChangeCluster>;
  inactive: string | null;
  totalCount: number;
}

interface OptimizedSessions {
  active: Map<string, any>;
  ended: string | null;
  totalCount: number;
}

interface CompressedData {
  data: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  timestamp: number;
  algorithm: string;
}

interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  external: number;
  totalCacheSize: number;
  compressionCacheSize: number;
  avgCompressionRatio: number;
  memoryEfficiency: number;
  gcFrequency: number;
  lastGC: number;
}

interface MemoryProfile {
  timestamp: number;
  totalDocuments: number;
  memoryBreakdown: {
    changes: number;
    clusters: number;
    sessions: number;
    snapshots: number;
    metadata: number;
    compressed: number;
  };
  hotSpots: Array<{
    key: string;
    size: number;
    accessFrequency: number;
    type: string;
  }>;
  recommendations: string[];
}

interface GCResult {
  timestamp: number;
  duration: number;
  beforeMemory: number;
  afterMemory: number;
  memoryFreed: number;
  objectsCollected: number;
  objectsCompressed: number;
  efficiency: number;
}