/**
 * @fileoverview Memory leak detection tests for Writerr plugins
 * Tests for memory leaks during extended plugin usage
 */

import { EventBus } from '@writerr/shared';
import { TrackEditsCore } from '../packages/track-edits/src/TrackEditsCore';
import { ModeManager } from '../packages/writerr-chat/src/modes/ModeManager';
import { FunctionRegistry } from '../packages/ai-editorial-functions/src/registry/FunctionRegistry';

// Mock Obsidian environment
const mockApp = {
  vault: {
    adapter: {
      read: jest.fn().mockResolvedValue(''),
      write: jest.fn().mockResolvedValue(undefined),
      exists: jest.fn().mockResolvedValue(true),
      stat: jest.fn().mockResolvedValue({ mtime: Date.now(), size: 1000 })
    },
    on: jest.fn(),
    off: jest.fn()
  },
  workspace: {
    on: jest.fn(),
    off: jest.fn(),
    getActiveFile: jest.fn()
  }
};

const mockPlugin = {
  app: mockApp,
  addCommand: jest.fn(),
  addRibbonIcon: jest.fn(),
  addStatusBarItem: jest.fn(),
  registerView: jest.fn(),
  registerDomEvent: jest.fn(),
  registerInterval: jest.fn()
};

// Memory measurement utilities
class MemoryTracker {
  private snapshots: Array<{
    timestamp: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
    label: string;
  }> = [];
  
  takeSnapshot(label: string): void {
    const memUsage = process.memoryUsage();
    this.snapshots.push({
      timestamp: Date.now(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
      label
    });
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }
  
  getMemoryIncrease(fromLabel: string, toLabel: string): number {
    const fromSnapshot = this.snapshots.find(s => s.label === fromLabel);
    const toSnapshot = this.snapshots.find(s => s.label === toLabel);
    
    if (!fromSnapshot || !toSnapshot) {
      throw new Error(`Snapshot not found: ${fromLabel} or ${toLabel}`);
    }
    
    return toSnapshot.heapUsed - fromSnapshot.heapUsed;
  }
  
  getMemoryGrowthRate(): number {
    if (this.snapshots.length < 2) return 0;
    
    const first = this.snapshots[0];
    const last = this.snapshots[this.snapshots.length - 1];
    const timeDiff = last.timestamp - first.timestamp;
    const memoryDiff = last.heapUsed - first.heapUsed;
    
    return timeDiff > 0 ? (memoryDiff / timeDiff) * 1000 : 0; // bytes per second
  }
  
  detectMemoryLeaks(thresholdMB: number = 50): {
    hasLeak: boolean;
    growthRate: number;
    analysis: string;
  } {
    const growthRate = this.getMemoryGrowthRate();
    const growthRateMB = growthRate / (1024 * 1024);
    
    const hasLeak = Math.abs(growthRateMB) > (thresholdMB / 1000); // MB per second
    
    return {
      hasLeak,
      growthRate: growthRateMB,
      analysis: hasLeak 
        ? `Potential memory leak detected: ${growthRateMB.toFixed(3)}MB/s growth`
        : `Memory usage stable: ${growthRateMB.toFixed(3)}MB/s growth`
    };
  }
  
  printReport(): void {
    console.log('\n📊 Memory Usage Report:');
    this.snapshots.forEach((snapshot, index) => {
      const heapMB = Math.round(snapshot.heapUsed / 1024 / 1024);
      const totalMB = Math.round(snapshot.heapTotal / 1024 / 1024);
      console.log(`  ${index + 1}. ${snapshot.label}: ${heapMB}MB used / ${totalMB}MB total`);
    });
    
    const leak = this.detectMemoryLeaks();
    console.log(`\n${leak.analysis}`);
  }
  
  clear(): void {
    this.snapshots = [];
  }
}

describe('Memory Leak Detection Tests', () => {
  let eventBus: EventBus;
  let trackEditsCore: TrackEditsCore;
  let modeManager: ModeManager;
  let functionRegistry: FunctionRegistry;
  let memoryTracker: MemoryTracker;

  const MEMORY_LEAK_THRESHOLD_MB = 100; // 100MB growth threshold
  const EXTENDED_SESSION_DURATION = 30000; // 30 seconds
  
  beforeEach(async () => {
    jest.clearAllMocks();
    
    memoryTracker = new MemoryTracker();
    memoryTracker.takeSnapshot('test-start');
    
    // Initialize components
    eventBus = new EventBus();
    trackEditsCore = new TrackEditsCore(mockPlugin as any);
    modeManager = new ModeManager();
    functionRegistry = new FunctionRegistry();
    
    // Connect components
    trackEditsCore.setEventBus(eventBus);
    
    await trackEditsCore.initialize();
    await modeManager.initialize();
    
    memoryTracker.takeSnapshot('initialization-complete');
  });
  
  afterEach(async () => {
    memoryTracker.takeSnapshot('test-cleanup-start');
    
    await trackEditsCore.cleanup();
    eventBus.removeAllListeners();
    
    memoryTracker.takeSnapshot('test-cleanup-complete');
    memoryTracker.printReport();
    memoryTracker.clear();
  });

  describe('Track Edits Memory Management', () => {
    it('should not leak memory during extended change processing', async () => {
      const documentId = 'memory-test-doc.md';
      await trackEditsCore.enableTrackingForDocument(documentId);
      
      memoryTracker.takeSnapshot('before-change-processing');
      
      // Simulate extended editing session
      const sessionDuration = 10000; // 10 seconds
      const changesPerSecond = 10;
      const totalChanges = (sessionDuration / 1000) * changesPerSecond;
      
      console.log(`🔄 Starting extended change processing session...`);
      console.log(`Duration: ${sessionDuration}ms, Rate: ${changesPerSecond} changes/sec`);
      
      const startTime = Date.now();
      let changeCount = 0;
      
      const changeInterval = setInterval(async () => {
        const change = {
          id: `memory-leak-test-${changeCount}`,
          documentId,
          type: 'edit' as const,
          originalText: `original_text_${changeCount}`,
          suggestedText: `suggested_text_${changeCount}`,
          startOffset: changeCount * 20,
          endOffset: changeCount * 20 + 15,
          source: {
            type: 'ai' as const,
            plugin: 'memory-test'
          },
          confidence: 0.8,
          category: 'memory-test',
          timestamp: new Date()
        };
        
        await trackEditsCore.submitChange(change);
        changeCount++;
        
        // Take periodic memory snapshots
        if (changeCount % 20 === 0) {
          memoryTracker.takeSnapshot(`change-${changeCount}`);
        }
        
        if (Date.now() - startTime >= sessionDuration) {
          clearInterval(changeInterval);
        }
      }, 1000 / changesPerSecond);
      
      // Wait for session to complete
      await new Promise(resolve => {
        const checkCompletion = setInterval(() => {
          if (Date.now() - startTime >= sessionDuration) {
            clearInterval(checkCompletion);
            resolve(undefined);
          }
        }, 100);
      });
      
      memoryTracker.takeSnapshot('after-change-processing');
      
      // Verify changes were processed
      const documentChanges = trackEditsCore.getChangesForDocument(documentId);
      expect(documentChanges.length).toBeGreaterThanOrEqual(totalChanges * 0.8);
      
      // Check for memory leaks
      const memoryIncrease = memoryTracker.getMemoryIncrease(
        'before-change-processing',
        'after-change-processing'
      );
      
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);
      expect(memoryIncreaseMB).toBeLessThan(MEMORY_LEAK_THRESHOLD_MB);
      
      // Perform cleanup operations and verify memory is released
      await trackEditsCore.disableTrackingForDocument(documentId);
      
      if (global.gc) global.gc();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      memoryTracker.takeSnapshot('after-cleanup');
      
      const leak = memoryTracker.detectMemoryLeaks(MEMORY_LEAK_THRESHOLD_MB);
      expect(leak.hasLeak).toBe(false);
      
      console.log('✅ Track Edits memory leak test completed');
      console.log('Memory analysis results:', {
        changesProcessed: documentChanges.length,
        sessionDuration: `${sessionDuration}ms`,
        memoryIncrease: `${memoryIncreaseMB.toFixed(2)}MB`,
        memoryGrowthRate: `${leak.growthRate.toFixed(3)}MB/s`,
        memoryLeakDetected: leak.hasLeak
      });
    });

    it('should properly clean up event listeners and prevent listener leaks', async () => {
      memoryTracker.takeSnapshot('before-listener-test');
      
      const documentId = 'listener-leak-test.md';
      const listenerCount = 100;
      const cycles = 10;
      
      console.log(`🔄 Testing event listener cleanup over ${cycles} cycles...`);
      
      for (let cycle = 0; cycle < cycles; cycle++) {
        // Enable tracking (adds event listeners)
        await trackEditsCore.enableTrackingForDocument(`${documentId}-${cycle}`);
        
        // Add many event listeners
        const listeners: Array<() => void> = [];
        for (let i = 0; i < listenerCount; i++) {
          const listener = () => console.log(`Listener ${cycle}-${i} called`);
          eventBus.on('test-event', listener);
          listeners.push(listener);
        }
        
        // Trigger some events
        for (let i = 0; i < 10; i++) {
          eventBus.emit('test-event', { cycle, event: i });
        }
        
        // Clean up listeners
        listeners.forEach(listener => {
          eventBus.off('test-event', listener);
        });
        
        // Disable tracking (should clean up internal listeners)
        await trackEditsCore.disableTrackingForDocument(`${documentId}-${cycle}`);
        
        if (cycle % 3 === 0) {
          memoryTracker.takeSnapshot(`cycle-${cycle}`);
        }
      }
      
      memoryTracker.takeSnapshot('after-listener-cycles');
      
      // Force garbage collection
      if (global.gc) {
        global.gc();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      memoryTracker.takeSnapshot('after-gc');
      
      // Check event bus state
      const remainingListeners = eventBus.listenerCount('test-event');
      expect(remainingListeners).toBe(0);
      
      // Check memory usage
      const memoryIncrease = memoryTracker.getMemoryIncrease(
        'before-listener-test',
        'after-gc'
      );
      
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);
      expect(memoryIncreaseMB).toBeLessThan(50); // Should be minimal after cleanup
      
      console.log('✅ Event listener cleanup test completed');
      console.log('Listener cleanup results:', {
        cycles,
        listenersPerCycle: listenerCount,
        remainingListeners,
        memoryIncrease: `${memoryIncreaseMB.toFixed(2)}MB`,
        properCleanup: remainingListeners === 0
      });
    });
  });

  describe('Function Registry Memory Management', () => {
    it('should not leak memory during function hot-reloading', async () => {
      memoryTracker.takeSnapshot('before-hot-reload-test');
      
      const reloadCycles = 50;
      const functionsPerCycle = 10;
      
      console.log(`🔄 Testing function hot-reloading memory management...`);
      console.log(`Cycles: ${reloadCycles}, Functions per cycle: ${functionsPerCycle}`);
      
      for (let cycle = 0; cycle < reloadCycles; cycle++) {
        // Register functions
        for (let funcIndex = 0; funcIndex < functionsPerCycle; funcIndex++) {
          const mockFunction = {
            id: `hot-reload-func-${cycle}-${funcIndex}`,
            name: `Hot Reload Function ${cycle}-${funcIndex}`,
            version: '1.0.0',
            description: 'Test function for hot reload memory testing',
            category: 'test' as const,
            capabilities: ['test'],
            dependencies: [],
            enabled: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            filePath: `/test/cycle-${cycle}/func-${funcIndex}.md`,
            fileType: 'md' as const,
            content: `# Function ${cycle}-${funcIndex}\nTest content for memory testing.`,
            parsedContent: {
              systemPrompt: `Test prompt for function ${cycle}-${funcIndex}`,
              examples: []
            },
            hash: `hash-${cycle}-${funcIndex}`,
            loadedAt: new Date()
          };
          
          functionRegistry.registerFunction(mockFunction);
        }
        
        // Get registry stats
        const stats = functionRegistry.getStats();
        expect(stats.totalFunctions).toBe((cycle + 1) * functionsPerCycle);
        
        // Unregister functions from this cycle
        for (let funcIndex = 0; funcIndex < functionsPerCycle; funcIndex++) {
          const functionId = `hot-reload-func-${cycle}-${funcIndex}`;
          functionRegistry.unregisterFunction(functionId);
        }
        
        // Verify functions were removed
        const finalStats = functionRegistry.getStats();
        expect(finalStats.totalFunctions).toBe(cycle * functionsPerCycle);
        
        if (cycle % 10 === 0) {
          memoryTracker.takeSnapshot(`reload-cycle-${cycle}`);
        }
      }
      
      memoryTracker.takeSnapshot('after-hot-reload-cycles');
      
      // Force garbage collection
      if (global.gc) {
        global.gc();
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      memoryTracker.takeSnapshot('after-hot-reload-gc');
      
      // Verify registry is clean
      const finalStats = functionRegistry.getStats();
      expect(finalStats.totalFunctions).toBe(0);
      
      // Check memory usage
      const memoryIncrease = memoryTracker.getMemoryIncrease(
        'before-hot-reload-test',
        'after-hot-reload-gc'
      );
      
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);
      expect(memoryIncreaseMB).toBeLessThan(MEMORY_LEAK_THRESHOLD_MB);
      
      console.log('✅ Function hot-reloading memory test completed');
      console.log('Hot-reload memory results:', {
        reloadCycles,
        functionsPerCycle,
        totalFunctionsProcessed: reloadCycles * functionsPerCycle,
        finalFunctionCount: finalStats.totalFunctions,
        memoryIncrease: `${memoryIncreaseMB.toFixed(2)}MB`
      });
    });
  });

  describe('Extended Session Simulation', () => {
    it('should maintain stable memory usage during 8-hour session simulation', async () => {
      // Simulate accelerated 8-hour session (compressed to 30 seconds)
      const sessionDuration = EXTENDED_SESSION_DURATION;
      const compressionFactor = (8 * 60 * 60 * 1000) / sessionDuration; // 8 hours compressed
      
      console.log(`🔄 Simulating 8-hour extended session (${sessionDuration}ms accelerated)...`);
      
      memoryTracker.takeSnapshot('extended-session-start');
      
      const documentId = 'extended-session-doc.md';
      await trackEditsCore.enableTrackingForDocument(documentId);
      
      const activities = [
        { name: 'text-editing', frequency: 5 }, // 5 times per second
        { name: 'mode-switching', frequency: 0.1 }, // Once per 10 seconds
        { name: 'function-loading', frequency: 0.05 }, // Once per 20 seconds
        { name: 'change-clustering', frequency: 0.2 }, // Once per 5 seconds
      ];
      
      const startTime = Date.now();
      let activityCounters = activities.reduce((acc, activity) => {
        acc[activity.name] = 0;
        return acc;
      }, {} as Record<string, number>);
      
      // Create intervals for different activities
      const intervals = activities.map(activity => {
        return setInterval(async () => {
          activityCounters[activity.name]++;
          
          switch (activity.name) {
            case 'text-editing':
              const change = {
                id: `extended-session-change-${activityCounters[activity.name]}`,
                documentId,
                type: 'edit' as const,
                originalText: `text_${activityCounters[activity.name]}`,
                suggestedText: `improved_text_${activityCounters[activity.name]}`,
                startOffset: activityCounters[activity.name] * 15,
                endOffset: activityCounters[activity.name] * 15 + 8,
                source: { type: 'ai' as const, plugin: 'extended-session-test' },
                confidence: 0.8,
                category: 'extended-session',
                timestamp: new Date()
              };
              await trackEditsCore.submitChange(change);
              break;
              
            case 'mode-switching':
              const modes = ['copy-edit', 'proofread', 'creative-writing'];
              const randomMode = modes[activityCounters[activity.name] % modes.length];
              await modeManager.switchMode(randomMode);
              break;
              
            case 'function-loading':
              const mockFunction = {
                id: `extended-session-func-${activityCounters[activity.name]}`,
                name: `Extended Session Function ${activityCounters[activity.name]}`,
                version: '1.0.0',
                description: 'Function for extended session testing',
                category: 'test' as const,
                capabilities: ['test'],
                dependencies: [],
                enabled: true,
                createdAt: new Date(),
                updatedAt: new Date(),
                filePath: `/test/extended/func-${activityCounters[activity.name]}.md`,
                fileType: 'md' as const,
                content: 'Extended session function content',
                parsedContent: { systemPrompt: 'Test prompt', examples: [] },
                hash: `extended-hash-${activityCounters[activity.name]}`,
                loadedAt: new Date()
              };
              functionRegistry.registerFunction(mockFunction);
              
              // Occasionally unregister old functions to simulate hot-reloading
              if (activityCounters[activity.name] > 5) {
                const oldFuncId = `extended-session-func-${activityCounters[activity.name] - 5}`;
                functionRegistry.unregisterFunction(oldFuncId);
              }
              break;
              
            case 'change-clustering':
              trackEditsCore.getChangeClusters(documentId, { strategy: 'category' });
              break;
          }
        }, 1000 / activity.frequency);
      });
      
      // Take memory snapshots at regular intervals
      const snapshotInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.round((elapsed / sessionDuration) * 100);
        memoryTracker.takeSnapshot(`session-progress-${progress}%`);
      }, sessionDuration / 10);
      
      // Wait for session to complete
      await new Promise(resolve => setTimeout(resolve, sessionDuration));
      
      // Clean up intervals
      intervals.forEach(clearInterval);
      clearInterval(snapshotInterval);
      
      memoryTracker.takeSnapshot('extended-session-end');
      
      // Force garbage collection
      if (global.gc) {
        global.gc();
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      memoryTracker.takeSnapshot('extended-session-after-gc');
      
      // Verify system state
      const finalChanges = trackEditsCore.getChangesForDocument(documentId);
      const finalFunctionStats = functionRegistry.getStats();
      
      // Check for memory leaks
      const leak = memoryTracker.detectMemoryLeaks(MEMORY_LEAK_THRESHOLD_MB / 10); // Lower threshold for extended test
      expect(leak.hasLeak).toBe(false);
      
      console.log('✅ Extended session simulation completed');
      console.log('Extended session results:', {
        simulatedDuration: '8 hours',
        actualDuration: `${sessionDuration}ms`,
        compressionFactor,
        activities: activityCounters,
        finalChanges: finalChanges.length,
        finalFunctions: finalFunctionStats.totalFunctions,
        memoryGrowthRate: `${leak.growthRate.toFixed(3)}MB/s`,
        memoryLeakDetected: leak.hasLeak
      });
    }, EXTENDED_SESSION_DURATION + 10000);
  });

  describe('Stress Testing Memory Limits', () => {
    it('should handle memory pressure gracefully', async () => {
      console.log('🔄 Testing memory pressure handling...');
      
      memoryTracker.takeSnapshot('before-memory-pressure');
      
      const documentId = 'memory-pressure-test.md';
      await trackEditsCore.enableTrackingForDocument(documentId);
      
      // Generate memory pressure by creating large numbers of changes with large content
      const largeTextSize = 10000; // 10KB per change
      const changeCount = 1000; // 1000 changes = ~10MB of text data
      
      const changes: Array<Promise<any>> = [];
      
      for (let i = 0; i < changeCount; i++) {
        const largeText = 'A'.repeat(largeTextSize);
        const change = {
          id: `memory-pressure-change-${i}`,
          documentId,
          type: 'edit' as const,
          originalText: `${largeText}_original_${i}`,
          suggestedText: `${largeText}_suggested_${i}`,
          startOffset: i * (largeTextSize + 50),
          endOffset: i * (largeTextSize + 50) + largeTextSize + 20,
          source: { type: 'ai' as const, plugin: 'memory-pressure-test' },
          confidence: 0.8,
          category: 'memory-pressure',
          timestamp: new Date(),
          metadata: {
            largeData: Array.from({ length: 1000 }, (_, j) => `data_${i}_${j}`),
            pressureTest: true
          }
        };
        
        changes.push(trackEditsCore.submitChange(change));
        
        // Take snapshots periodically
        if ((i + 1) % 200 === 0) {
          memoryTracker.takeSnapshot(`pressure-${i + 1}-changes`);
        }
      }
      
      const results = await Promise.all(changes);
      const successfulChanges = results.filter(r => r.success).length;
      
      memoryTracker.takeSnapshot('after-memory-pressure');
      
      // System should either handle all changes or gracefully reject some
      expect(successfulChanges).toBeGreaterThan(changeCount * 0.5); // At least 50% should succeed
      
      // Check memory usage
      const memoryIncrease = memoryTracker.getMemoryIncrease(
        'before-memory-pressure',
        'after-memory-pressure'
      );
      
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);
      
      // System should not consume excessive memory
      expect(memoryIncreaseMB).toBeLessThan(500); // Should be under 500MB
      
      // Test memory cleanup
      await trackEditsCore.disableTrackingForDocument(documentId);
      
      if (global.gc) {
        global.gc();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      memoryTracker.takeSnapshot('after-pressure-cleanup');
      
      console.log('✅ Memory pressure test completed');
      console.log('Memory pressure results:', {
        changeCount,
        successfulChanges,
        successRate: `${((successfulChanges / changeCount) * 100).toFixed(1)}%`,
        memoryIncrease: `${memoryIncreaseMB.toFixed(2)}MB`,
        textDataSize: `~${(changeCount * largeTextSize * 2 / 1024 / 1024).toFixed(2)}MB`,
        handledGracefully: successfulChanges > 0 && memoryIncreaseMB < 500
      });
    });
  });
});