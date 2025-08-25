/**
 * Performance Optimization Types
 * Shared type definitions for optimization across all plugins
 */

export interface PerformanceMeasurement {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
  category: PerformanceCategory;
  severity: PerformanceSeverity;
}

export enum PerformanceCategory {
  STARTUP = 'startup',
  RENDER = 'render',
  DATA_PROCESSING = 'data_processing',
  NETWORK = 'network',
  MEMORY = 'memory',
  STORAGE = 'storage',
  CROSS_PLUGIN = 'cross_plugin',
  HOT_RELOAD = 'hot_reload',
  DOCUMENT = 'document'
}

export enum PerformanceSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical'
}

export interface PerformanceThresholds {
  startup: {
    total: number;           // Total startup time threshold (3000ms)
    pluginInit: number;      // Per-plugin initialization (500ms)
    dependency: number;      // Dependency loading (200ms)
  };
  render: {
    frame: number;           // Frame rendering (16ms for 60fps)
    interaction: number;     // User interaction response (100ms)
    diff: number;           // Diff rendering (50ms)
  };
  dataProcessing: {
    change: number;          // Change processing (10ms)
    clustering: number;      // Change clustering (100ms)
    validation: number;      // Data validation (20ms)
  };
  crossPlugin: {
    communication: number;   // Inter-plugin communication (50ms)
    eventDelivery: number;  // Event delivery (10ms)
    apiCall: number;        // API calls (100ms)
  };
  hotReload: {
    detection: number;       // File change detection (50ms)
    reload: number;         // Hot reload processing (200ms)
    validation: number;     // Content validation (100ms)
  };
  document: {
    largeDocLoad: number;   // Large document loading (2000ms)
    processing: number;     // Document processing (500ms)
    indexing: number;      // Content indexing (1000ms)
  };
}

export interface CacheConfig {
  enabled: boolean;
  maxSize: number;         // In bytes
  ttl: number;            // Time to live in ms
  strategy: CacheStrategy;
  compression: boolean;
  warmupEnabled: boolean;
}

export enum CacheStrategy {
  LRU = 'lru',
  LFU = 'lfu',
  FIFO = 'fifo',
  LIFO = 'lifo'
}

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  size: number;
  timestamp: number;
  accessCount: number;
  lastAccess: number;
  compressed: boolean;
  metadata?: Record<string, any>;
}

export interface OptimizationMetrics {
  startupTime: {
    total: number;
    breakdown: Record<string, number>;
  };
  memoryUsage: {
    current: number;
    peak: number;
    breakdown: Record<string, number>;
  };
  cacheStats: {
    hitRate: number;
    size: number;
    entries: number;
  };
  latencyStats: {
    average: number;
    p95: number;
    p99: number;
    breakdown: Record<string, number>;
  };
  documentStats: {
    largeDocCount: number;
    averageProcessingTime: number;
    maxDocumentSize: number;
  };
}

export interface StartupPhase {
  name: string;
  startTime: number;
  dependencies: string[];
  critical: boolean;
  timeout: number;
  progress?: (phase: string, percent: number) => void;
}

export interface DocumentOptimizationConfig {
  chunkSize: number;           // Size of processing chunks
  virtualScrollThreshold: number; // When to enable virtual scrolling
  lazyLoadThreshold: number;   // When to lazy load content
  compressionThreshold: number; // When to compress content
  maxConcurrentOps: number;    // Max concurrent operations
}

export interface LatencyOptimizationConfig {
  batchingEnabled: boolean;
  batchSize: number;
  batchTimeout: number;
  priorityQueues: boolean;
  circuitBreaker: {
    enabled: boolean;
    failureThreshold: number;
    timeout: number;
    recoveryTime: number;
  };
}

export interface PerformanceEvent {
  type: 'measurement' | 'threshold_exceeded' | 'optimization_applied' | 'cache_event';
  category: PerformanceCategory;
  data: any;
  timestamp: number;
  pluginId?: string;
}

export interface OptimizationStrategy {
  id: string;
  name: string;
  description: string;
  category: PerformanceCategory;
  priority: number;
  enabled: boolean;
  conditions: Array<{
    metric: string;
    operator: '>' | '<' | '==' | '>=' | '<=';
    value: number;
  }>;
  actions: Array<{
    type: string;
    config: Record<string, any>;
  }>;
}

export interface PerformanceReport {
  timestamp: number;
  duration: number;
  metrics: OptimizationMetrics;
  violations: Array<{
    threshold: string;
    actual: number;
    expected: number;
    severity: PerformanceSeverity;
  }>;
  recommendations: string[];
}

export interface BatchProcessor<T, R> {
  add: (item: T) => Promise<R>;
  flush: () => Promise<R[]>;
  size: () => number;
  clear: () => void;
}