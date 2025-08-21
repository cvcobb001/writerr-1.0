/**
 * Shared Optimization Utilities
 * Performance optimization tools used across all Writerr plugins
 */

export * from './PerformanceProfiler';
export * from './StartupOptimizer';
export * from './CrossPluginCache';
export * from './LatencyOptimizer';
export * from './DocumentOptimizer';
export * from './types';

// Re-export key instances for convenience
export {
  performanceProfiler,
  startMeasurement,
  endMeasurement,
  measureAsync,
  measureSync,
  getPerformanceMetrics,
  generatePerformanceReport
} from './PerformanceProfiler';

export {
  startupOptimizer,
  registerStartupPhase,
  startOptimizedStartup,
  getStartupMetrics,
  configureStartup
} from './StartupOptimizer';

export {
  crossPluginCache,
  getFromCache,
  setInCache,
  deleteFromCache,
  clearCache,
  getCacheStats
} from './CrossPluginCache';

export {
  latencyOptimizer,
  executeOptimized,
  createBatchProcessor,
  getLatencyStats,
  resetCircuitBreaker
} from './LatencyOptimizer';

export {
  documentOptimizer,
  processLargeDocument,
  getDocumentVisibleChunks,
  updateDocumentVirtualPosition,
  getDocumentStats,
  clearDocumentOptimization
} from './DocumentOptimizer';