/**
 * Comprehensive Tests for Event Filtering System
 * 
 * This test suite validates the event filtering system's ability to prevent
 * feedback loops and maintain platform stability across complex plugin interactions.
 */

import { 
  EventFilteringSystem, 
  EnhancedEventFilteringSystem, 
  LoopType, 
  LoopSeverity, 
  PreventionAction,
  EventFilteringConfig
} from '../event-filtering-system';

import { EventFilteringErrorRecoveryManager } from '../event-filtering-error-recovery';
import { EventFilteringPerformanceOptimizer } from '../event-filtering-performance';
import { WriterrlEvent, WriterrlEventV2 } from '../event-bus-integration';

// ============================================================================
// Test Utilities and Mocks
// ============================================================================

const createMockEvent = (
  type: string, 
  sourcePlugin: string, 
  sessionId?: string,
  correlationId?: string
): WriterrlEvent => ({
  id: `event-${Date.now()}-${Math.random()}`,
  type,
  sourcePlugin,
  sessionId,
  timestamp: Date.now(),
  data: { test: true },
  correlationId
});

const createMockEventV2 = (
  type: string, 
  sourcePlugin: string, 
  sessionId?: string,
  correlationId?: string,
  parentEventId?: string
): WriterrlEventV2 => ({
  id: `event-v2-${Date.now()}-${Math.random()}`,
  type,
  sourcePlugin,
  sessionId,
  timestamp: Date.now(),
  data: { test: true },
  version: 2,
  correlationId,
  parentEventId
});

const testConfig: EventFilteringConfig = {
  maxEventChainDepth: 5,
  loopDetectionWindowMs: 10000,
  circularReferenceThreshold: 2,
  maxEventsPerSecond: 10,
  rapidFireThresholdMs: 100,
  runawayEventThreshold: 5,
  maxPluginInteractionsPerSecond: 15,
  pluginCooldownMs: 200,
  eventHistoryLimit: 100,
  correlationCleanupIntervalMs: 5000,
  enableLoopPrevention: true,
  enableFrequencyThrottling: true,
  enablePluginIsolation: true,
  debugMode: true
};

// ============================================================================
// Core Event Filtering System Tests
// ============================================================================

describe('EventFilteringSystem', () => {
  let filteringSystem: EventFilteringSystem;

  beforeEach(() => {
    filteringSystem = new EventFilteringSystem(testConfig);
  });

  afterEach(() => {
    filteringSystem.dispose();
  });

  describe('Direct Circular Loop Detection', () => {
    it('should detect simple A → B → A circular pattern', async () => {
      const correlationId = 'test-correlation-1';
      
      // Create event chain: plugin-a → plugin-b → plugin-a
      const event1 = createMockEvent('test.event', 'plugin-a', 'session-1', correlationId);
      const event2 = createMockEvent('test.event', 'plugin-b', 'session-1', correlationId);
      const event3 = createMockEvent('test.event', 'plugin-a', 'session-1', correlationId);

      // Process events in sequence
      await filteringSystem.shouldProcessEvent(event1);
      await filteringSystem.shouldProcessEvent(event2);
      const result = await filteringSystem.shouldProcessEvent(event3);

      expect(result.hasLoop).toBe(true);
      expect(result.loopType).toBe(LoopType.DIRECT_CIRCULAR);
      expect(result.severity).toBe(LoopSeverity.HIGH);
      expect(result.preventionAction).toBe(PreventionAction.BLOCK);
    });

    it('should detect complex A → B → C → A circular pattern', async () => {
      const correlationId = 'test-correlation-2';
      
      const event1 = createMockEvent('test.event', 'plugin-a', 'session-1', correlationId);
      const event2 = createMockEvent('test.event', 'plugin-b', 'session-1', correlationId);
      const event3 = createMockEvent('test.event', 'plugin-c', 'session-1', correlationId);
      const event4 = createMockEvent('test.event', 'plugin-a', 'session-1', correlationId);

      await filteringSystem.shouldProcessEvent(event1);
      await filteringSystem.shouldProcessEvent(event2);
      await filteringSystem.shouldProcessEvent(event3);
      const result = await filteringSystem.shouldProcessEvent(event4);

      expect(result.hasLoop).toBe(true);
      expect(result.loopType).toBe(LoopType.DIRECT_CIRCULAR);
    });

    it('should allow valid event chains without loops', async () => {
      const correlationId = 'test-correlation-3';
      
      const event1 = createMockEvent('test.event.start', 'plugin-a', 'session-1', correlationId);
      const event2 = createMockEvent('test.event.progress', 'plugin-b', 'session-1', correlationId);
      const event3 = createMockEvent('test.event.complete', 'plugin-c', 'session-1', correlationId);

      const result1 = await filteringSystem.shouldProcessEvent(event1);
      const result2 = await filteringSystem.shouldProcessEvent(event2);
      const result3 = await filteringSystem.shouldProcessEvent(event3);

      expect(result1.preventionAction).toBe(PreventionAction.ALLOW);
      expect(result2.preventionAction).toBe(PreventionAction.ALLOW);
      expect(result3.preventionAction).toBe(PreventionAction.ALLOW);
    });
  });

  describe('Oscillating Loop Detection', () => {
    it('should detect rapid ping-pong between two plugins', async () => {
      const correlationId = 'test-correlation-4';
      
      // Create rapid ping-pong pattern
      const event1 = createMockEvent('ping', 'plugin-a', 'session-1', correlationId);
      const event2 = createMockEvent('pong', 'plugin-b', 'session-1', correlationId);
      const event3 = createMockEvent('ping', 'plugin-a', 'session-1', correlationId);

      await filteringSystem.shouldProcessEvent(event1);
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      await filteringSystem.shouldProcessEvent(event2);
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      const result = await filteringSystem.shouldProcessEvent(event3);

      expect(result.hasLoop).toBe(true);
      expect(result.loopType).toBe(LoopType.OSCILLATING);
      expect(result.preventionAction).toBe(PreventionAction.THROTTLE);
    });
  });

  describe('Frequency-Based Loop Detection', () => {
    it('should detect runaway event generation', async () => {
      const events = [];
      
      // Generate many events from same plugin/type quickly
      for (let i = 0; i < 6; i++) {
        events.push(createMockEvent('runaway.event', 'plugin-runaway', 'session-1'));
      }

      let lastResult;
      for (const event of events) {
        lastResult = await filteringSystem.shouldProcessEvent(event);
      }

      expect(lastResult?.hasLoop).toBe(true);
      expect(lastResult?.loopType).toBe(LoopType.CASCADE_FEEDBACK);
      expect([PreventionAction.THROTTLE, PreventionAction.TERMINATE_CHAIN])
        .toContain(lastResult?.preventionAction);
    });

    it('should allow normal event frequency', async () => {
      const events = [];
      
      // Generate reasonable number of events
      for (let i = 0; i < 3; i++) {
        events.push(createMockEvent('normal.event', 'plugin-normal', 'session-1'));
      }

      let allAllowed = true;
      for (const event of events) {
        const result = await filteringSystem.shouldProcessEvent(event);
        if (result.preventionAction !== PreventionAction.ALLOW) {
          allAllowed = false;
          break;
        }
      }

      expect(allAllowed).toBe(true);
    });
  });

  describe('Temporal Loop Detection', () => {
    it('should detect rapid-fire events of same type', async () => {
      // Create events with same type/plugin in rapid succession
      const events = [
        createMockEvent('rapid.event', 'plugin-rapid'),
        createMockEvent('rapid.event', 'plugin-rapid'),
        createMockEvent('rapid.event', 'plugin-rapid'),
        createMockEvent('rapid.event', 'plugin-rapid')
      ];

      let lastResult;
      for (const event of events) {
        lastResult = await filteringSystem.shouldProcessEvent(event);
      }

      expect(lastResult?.hasLoop).toBe(true);
      expect(lastResult?.loopType).toBe(LoopType.TEMPORAL_LOOP);
      expect(lastResult?.preventionAction).toBe(PreventionAction.DELAY);
    });
  });

  describe('Configuration and System Stats', () => {
    it('should provide accurate system statistics', () => {
      const stats = filteringSystem.getSystemStats();
      
      expect(stats).toHaveProperty('activeCorrelations');
      expect(stats).toHaveProperty('frequencyTrackers');
      expect(stats).toHaveProperty('pluginInteractions');
      expect(stats).toHaveProperty('eventHistorySize');
      expect(stats).toHaveProperty('highRiskCorrelations');
      expect(stats).toHaveProperty('runawayTrackers');
      
      expect(typeof stats.activeCorrelations).toBe('number');
      expect(typeof stats.frequencyTrackers).toBe('number');
    });

    it('should allow configuration updates', () => {
      const newConfig = {
        maxEventChainDepth: 15,
        debugMode: false
      };
      
      filteringSystem.updateConfig(newConfig);
      const updatedConfig = filteringSystem.getConfig();
      
      expect(updatedConfig.maxEventChainDepth).toBe(15);
      expect(updatedConfig.debugMode).toBe(false);
    });
  });
});

// ============================================================================
// Enhanced Event Filtering System Tests  
// ============================================================================

describe('EnhancedEventFilteringSystem', () => {
  let enhancedSystem: EnhancedEventFilteringSystem;

  beforeEach(() => {
    enhancedSystem = new EnhancedEventFilteringSystem(testConfig);
  });

  afterEach(() => {
    enhancedSystem.dispose();
  });

  describe('Plugin Capability Management', () => {
    it('should validate plugin capabilities correctly', () => {
      // Test default capabilities
      expect(enhancedSystem.shouldPluginHandleEvent('track-edits', 'document.change.applied')).toBe(true);
      expect(enhancedSystem.shouldPluginHandleEvent('editorial-engine', 'ai.processing.start')).toBe(true);
      expect(enhancedSystem.shouldPluginHandleEvent('writerr-chat', 'session.lifecycle')).toBe(true);
      
      // Test invalid capabilities
      expect(enhancedSystem.shouldPluginHandleEvent('track-edits', 'ai.processing.start')).toBe(false);
      expect(enhancedSystem.shouldPluginHandleEvent('unknown-plugin', 'any.event')).toBe(false);
    });

    it('should register custom plugin capabilities', () => {
      enhancedSystem.registerPluginCapabilities('custom-plugin', [
        'custom.event.type',
        'another.custom.event'
      ]);
      
      expect(enhancedSystem.shouldPluginHandleEvent('custom-plugin', 'custom.event.type')).toBe(true);
      expect(enhancedSystem.shouldPluginHandleEvent('custom-plugin', 'unknown.event')).toBe(false);
    });
  });

  describe('Event Ownership Validation', () => {
    it('should detect event ownership conflicts', () => {
      const validEvent = createMockEvent('document.change.applied', 'track-edits');
      const conflictEvent = createMockEvent('document.change.applied', 'wrong-plugin');
      
      expect(enhancedSystem.detectEventOwnershipConflict(validEvent)).toBe(false);
      expect(enhancedSystem.detectEventOwnershipConflict(conflictEvent)).toBe(true);
    });

    it('should set custom event ownership', () => {
      enhancedSystem.setEventOwnership('custom.event', 'custom-plugin');
      
      const validEvent = createMockEvent('custom.event', 'custom-plugin');
      const conflictEvent = createMockEvent('custom.event', 'wrong-plugin');
      
      expect(enhancedSystem.detectEventOwnershipConflict(validEvent)).toBe(false);
      expect(enhancedSystem.detectEventOwnershipConflict(conflictEvent)).toBe(true);
    });
  });

  describe('Enhanced Event Processing', () => {
    it('should apply plugin responsibility checks', async () => {
      const conflictEvent = createMockEvent('document.change.applied', 'wrong-plugin');
      const result = await enhancedSystem.shouldProcessEvent(conflictEvent);
      
      expect(result.hasLoop).toBe(true);
      expect(result.loopType).toBe(LoopType.INDIRECT_CIRCULAR);
      expect(result.severity).toBe(LoopSeverity.MEDIUM);
      expect(result.preventionAction).toBe(PreventionAction.WARN);
    });
  });
});

// ============================================================================
// Error Recovery Manager Tests
// ============================================================================

describe('EventFilteringErrorRecoveryManager', () => {
  let recoveryManager: EventFilteringErrorRecoveryManager;

  beforeEach(() => {
    recoveryManager = new EventFilteringErrorRecoveryManager();
  });

  afterEach(() => {
    recoveryManager.dispose();
  });

  describe('Error Handling', () => {
    it('should handle loop detection failures gracefully', async () => {
      const mockEvent = createMockEvent('test.event', 'test-plugin');
      const mockError = new Error('Loop detection failed');
      
      const result = await recoveryManager.handleLoopDetectionFailure(mockEvent, mockError);
      
      expect(result.hasLoop).toBe(false);
      expect(result.severity).toBe(LoopSeverity.LOW);
      expect(result.preventionAction).toBe(PreventionAction.WARN);
    });

    it('should classify errors correctly', async () => {
      const memoryError = new Error('memory exhaustion detected');
      const timeoutError = new Error('processing timeout occurred');
      
      const recoveryAction1 = await recoveryManager.handleError(memoryError, {
        eventId: 'test-event-1'
      });
      
      const recoveryAction2 = await recoveryManager.handleError(timeoutError, {
        eventId: 'test-event-2'
      });
      
      expect(recoveryAction1?.strategy).toBeDefined();
      expect(recoveryAction2?.strategy).toBeDefined();
    });
  });

  describe('System Health Monitoring', () => {
    it('should provide health status information', () => {
      const health = recoveryManager.getHealthStatus();
      
      expect(health).toHaveProperty('isHealthy');
      expect(health).toHaveProperty('degradationLevel');
      expect(health).toHaveProperty('circuitBreakerState');
      expect(health).toHaveProperty('recentErrors');
      expect(health).toHaveProperty('systemMetrics');
      
      expect(typeof health.isHealthy).toBe('boolean');
      expect(typeof health.degradationLevel).toBe('number');
    });

    it('should track error history', async () => {
      const error1 = new Error('Test error 1');
      const error2 = new Error('Test error 2');
      
      await recoveryManager.handleError(error1, { eventId: 'test-1' });
      await recoveryManager.handleError(error2, { eventId: 'test-2' });
      
      const errorHistory = recoveryManager.getErrorHistory();
      expect(errorHistory.length).toBe(2);
      expect(errorHistory[0].message).toBe('Test error 1');
      expect(errorHistory[1].message).toBe('Test error 2');
    });
  });

  describe('Recovery Strategies', () => {
    it('should execute recovery strategies successfully', async () => {
      const testError = new Error('Critical system error');
      
      const recoveryAction = await recoveryManager.handleError(testError, {
        eventId: 'critical-test',
        operationType: 'test_operation'
      });
      
      expect(recoveryAction).toBeDefined();
      expect(recoveryAction?.success).toBeDefined();
      expect(recoveryAction?.strategy).toBeDefined();
      expect(recoveryAction?.duration).toBeDefined();
    });
  });
});

// ============================================================================
// Performance Optimization Tests
// ============================================================================

describe('EventFilteringPerformanceOptimizer', () => {
  let performanceOptimizer: EventFilteringPerformanceOptimizer;

  beforeEach(() => {
    performanceOptimizer = new EventFilteringPerformanceOptimizer({
      maxCacheSize: 100,
      batchProcessingSize: 5,
      parallelProcessing: true,
      enableDetailedMetrics: false
    });
  });

  afterEach(() => {
    performanceOptimizer.dispose();
  });

  describe('Performance Monitoring', () => {
    it('should track performance metrics', () => {
      const monitor = performanceOptimizer.getMonitor();
      const metrics = monitor.getPerformanceMetrics();
      
      expect(metrics).toHaveProperty('processingTime');
      expect(metrics).toHaveProperty('memoryUsage');
      expect(metrics).toHaveProperty('throughput');
      expect(metrics).toHaveProperty('cacheEfficiency');
      expect(metrics).toHaveProperty('systemLoad');
    });

    it('should record processing times accurately', () => {
      const monitor = performanceOptimizer.getMonitor();
      
      monitor.recordProcessingTime(100);
      monitor.recordProcessingTime(150);
      monitor.recordProcessingTime(75);
      
      const metrics = monitor.getPerformanceMetrics();
      expect(metrics.processingTime.min).toBe(75);
      expect(metrics.processingTime.max).toBe(150);
      expect(metrics.processingTime.average).toBeCloseTo(108.33, 1);
    });
  });

  describe('Caching System', () => {
    it('should cache processing results effectively', async () => {
      const mockProcessor = jest.fn().mockResolvedValue('processed-result');
      const optimizedProcessor = performanceOptimizer.createOptimizedProcessor(mockProcessor);
      
      const events = [
        createMockEvent('cache.test', 'test-plugin'),
        createMockEvent('cache.test', 'test-plugin'), // Same event - should be cached
        createMockEvent('cache.test.2', 'test-plugin')  // Different event
      ];
      
      await optimizedProcessor(events);
      
      // Should be called twice (once for each unique event)
      expect(mockProcessor).toHaveBeenCalledTimes(2);
    });

    it('should provide cache statistics', () => {
      const cache = performanceOptimizer.getMonitor().getCache();
      const stats = cache.getCacheStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('missRate');
      expect(stats).toHaveProperty('totalQueries');
    });
  });

  describe('Batch Processing', () => {
    it('should process events in batches when configured', async () => {
      const mockProcessor = jest.fn().mockResolvedValue('batch-result');
      const optimizedProcessor = performanceOptimizer.createOptimizedProcessor(mockProcessor);
      
      // Create enough events to trigger batch processing
      const events = [];
      for (let i = 0; i < 10; i++) {
        events.push(createMockEvent(`batch.event.${i}`, 'batch-plugin'));
      }
      
      const results = await optimizedProcessor(events);
      
      expect(results).toHaveLength(10);
      expect(mockProcessor).toHaveBeenCalledTimes(10);
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Event Filtering System Integration', () => {
  let filteringSystem: EnhancedEventFilteringSystem;
  let recoveryManager: EventFilteringErrorRecoveryManager;
  let performanceOptimizer: EventFilteringPerformanceOptimizer;

  beforeEach(() => {
    filteringSystem = new EnhancedEventFilteringSystem({
      ...testConfig,
      debugMode: false // Reduce test noise
    });
    recoveryManager = new EventFilteringErrorRecoveryManager();
    performanceOptimizer = new EventFilteringPerformanceOptimizer({
      enableDetailedMetrics: false
    });
  });

  afterEach(() => {
    filteringSystem.dispose();
    recoveryManager.dispose();
    performanceOptimizer.dispose();
  });

  describe('End-to-End Workflow', () => {
    it('should handle complex multi-plugin interaction scenario', async () => {
      // Simulate realistic Writerr Platform workflow:
      // User Chat → Editorial Engine → Track Edits → back to Chat
      
      const sessionId = 'integration-test-session';
      const correlationId = 'integration-workflow-1';
      
      const events = [
        createMockEventV2('user.request.start', 'writerr-chat', sessionId, correlationId),
        createMockEventV2('ai.processing.start', 'editorial-engine', sessionId, correlationId),
        createMockEventV2('ai.processing.progress', 'editorial-engine', sessionId, correlationId),
        createMockEventV2('document.change.applied', 'track-edits', sessionId, correlationId),
        createMockEventV2('ai.processing.complete', 'editorial-engine', sessionId, correlationId),
        createMockEventV2('conversation.message', 'writerr-chat', sessionId, correlationId)
      ];
      
      const results = [];
      for (const event of events) {
        const result = await filteringSystem.shouldProcessEvent(event);
        results.push(result);
      }
      
      // All events in valid workflow should be allowed
      const allAllowed = results.every(r => r.preventionAction === PreventionAction.ALLOW);
      expect(allAllowed).toBe(true);
    });

    it('should prevent infinite loops in complex scenario', async () => {
      // Simulate problematic feedback loop scenario
      const sessionId = 'loop-test-session';
      const correlationId = 'loop-workflow-1';
      
      // Create a scenario where plugins create a feedback loop
      const loopEvents = [
        createMockEventV2('trigger.event', 'plugin-a', sessionId, correlationId),
        createMockEventV2('response.event', 'plugin-b', sessionId, correlationId),
        createMockEventV2('counter.event', 'plugin-c', sessionId, correlationId),
        createMockEventV2('trigger.event', 'plugin-a', sessionId, correlationId), // Loop back
        createMockEventV2('response.event', 'plugin-b', sessionId, correlationId), // Should be blocked
      ];
      
      const results = [];
      for (const event of loopEvents) {
        const result = await filteringSystem.shouldProcessEvent(event);
        results.push(result);
      }
      
      // Should detect loop and prevent it
      const hasBlocked = results.some(r => 
        r.preventionAction === PreventionAction.BLOCK || 
        r.preventionAction === PreventionAction.THROTTLE
      );
      expect(hasBlocked).toBe(true);
    });

    it('should maintain performance under load', async () => {
      const startTime = Date.now();
      const events = [];
      
      // Generate large number of events
      for (let i = 0; i < 100; i++) {
        events.push(createMockEvent(`load.test.${i}`, `plugin-${i % 5}`, 'load-test-session'));
      }
      
      // Process all events
      const results = [];
      for (const event of events) {
        const result = await filteringSystem.shouldProcessEvent(event);
        results.push(result);
      }
      
      const totalTime = Date.now() - startTime;
      const avgTimePerEvent = totalTime / events.length;
      
      // Should process events quickly (less than 10ms per event on average)
      expect(avgTimePerEvent).toBeLessThan(10);
      
      // Should have processed all events
      expect(results).toHaveLength(100);
    });
  });

  describe('Error Resilience', () => {
    it('should recover from filtering system failures', async () => {
      // Force an error in the filtering system
      const mockError = new Error('Simulated system failure');
      const mockEvent = createMockEvent('error.test', 'error-plugin');
      
      const recoveryAction = await recoveryManager.handleError(mockError, {
        event: mockEvent,
        eventId: 'error-test-1'
      });
      
      expect(recoveryAction).toBeDefined();
      expect(recoveryAction?.success).toBeDefined();
      
      // System should still be functional after recovery
      const health = recoveryManager.getHealthStatus();
      expect(health).toBeDefined();
    });
  });
});

// ============================================================================
// Performance Benchmarks
// ============================================================================

describe('Performance Benchmarks', () => {
  it('should meet performance requirements for typical workloads', async () => {
    const filteringSystem = new EnhancedEventFilteringSystem({
      ...testConfig,
      debugMode: false
    });
    
    const events = [];
    for (let i = 0; i < 1000; i++) {
      events.push(createMockEvent(`perf.test.${i}`, `plugin-${i % 10}`, 'perf-session'));
    }
    
    const startTime = process.hrtime.bigint();
    
    for (const event of events) {
      await filteringSystem.shouldProcessEvent(event);
    }
    
    const endTime = process.hrtime.bigint();
    const totalTimeMs = Number(endTime - startTime) / 1_000_000;
    const avgTimePerEvent = totalTimeMs / events.length;
    
    // Performance requirement: < 1ms per event on average
    expect(avgTimePerEvent).toBeLessThan(1);
    
    filteringSystem.dispose();
  });
});