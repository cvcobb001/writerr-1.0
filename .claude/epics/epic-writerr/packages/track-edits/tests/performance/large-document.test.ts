/**
 * @fileoverview Performance tests for Track Edits with large documents
 * Tests system performance under realistic load conditions
 */

import { TrackEditsCore } from '../../src/TrackEditsCore';
import { StateManager } from '../../src/state/StateManager';
import { BatchProcessor } from '../../src/batch/BatchProcessor';
import { ClusteringEngine } from '../../src/clustering/ClusteringEngine';

// Mock Obsidian API for performance testing
const mockApp = {
  vault: {
    adapter: {
      read: jest.fn().mockResolvedValue(''),
      write: jest.fn().mockResolvedValue(undefined),
      exists: jest.fn().mockResolvedValue(true),
      stat: jest.fn().mockResolvedValue({ mtime: Date.now(), size: 1000000 })
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

describe('Track Edits Performance Tests', () => {
  let trackEditsCore: TrackEditsCore;
  let stateManager: StateManager;
  let batchProcessor: BatchProcessor;
  let clusteringEngine: ClusteringEngine;

  const LARGE_DOCUMENT_SIZE = 100000; // 100K words
  const MASSIVE_DOCUMENT_SIZE = 500000; // 500K words
  const PERFORMANCE_TIMEOUT = 30000; // 30 seconds

  beforeEach(async () => {
    jest.clearAllMocks();
    
    trackEditsCore = new TrackEditsCore(mockPlugin as any);
    stateManager = new StateManager();
    batchProcessor = new BatchProcessor();
    clusteringEngine = new ClusteringEngine();
    
    await trackEditsCore.initialize();
  });

  afterEach(async () => {
    await trackEditsCore.cleanup();
  });

  describe('Large Document Handling', () => {
    it('should handle 100K+ word documents efficiently', async () => {
      const documentId = 'large-doc.md';
      
      // Generate large document content
      const words = Array.from({ length: LARGE_DOCUMENT_SIZE }, (_, i) => 
        `word${i % 1000}`
      );
      const largeContent = words.join(' ');
      
      console.log(`📄 Testing with document size: ${largeContent.length} characters (${LARGE_DOCUMENT_SIZE} words)`);
      
      // Enable tracking for large document
      const startTime = Date.now();
      await trackEditsCore.enableTrackingForDocument(documentId);
      const enableTime = Date.now() - startTime;
      
      expect(enableTime).toBeLessThan(2000); // Should enable tracking in < 2 seconds
      
      // Generate changes across the document
      const changeCount = 1000;
      const changes = Array.from({ length: changeCount }, (_, i) => ({
        id: `large-doc-change-${i}`,
        documentId,
        type: 'edit' as const,
        originalText: `word${i}`,
        suggestedText: `improved_word${i}`,
        startOffset: i * 50, // Spread changes throughout document
        endOffset: i * 50 + 6,
        source: {
          type: 'ai' as const,
          plugin: 'performance-test',
          function: 'bulk-editor'
        },
        confidence: 0.8 + (Math.random() * 0.2),
        category: ['grammar', 'style', 'clarity'][i % 3],
        timestamp: new Date()
      }));
      
      // Submit changes and measure performance
      const submissionStartTime = Date.now();
      const submissionPromises = changes.map(change => 
        trackEditsCore.submitChange(change)
      );
      
      const results = await Promise.all(submissionPromises);
      const submissionTime = Date.now() - submissionStartTime;
      
      // Verify all changes were processed successfully
      const successfulSubmissions = results.filter(r => r.success).length;
      expect(successfulSubmissions).toBe(changeCount);
      
      // Performance assertions
      expect(submissionTime).toBeLessThan(10000); // < 10 seconds for 1000 changes
      const averageSubmissionTime = submissionTime / changeCount;
      expect(averageSubmissionTime).toBeLessThan(50); // < 50ms per change
      
      // Verify document state
      const documentChanges = trackEditsCore.getChangesForDocument(documentId);
      expect(documentChanges.length).toBe(changeCount);
      
      console.log('✅ Large document performance test passed');
      console.log('Performance metrics:', {
        documentSize: `${LARGE_DOCUMENT_SIZE.toLocaleString()} words`,
        trackingEnableTime: `${enableTime}ms`,
        changeCount: changeCount.toLocaleString(),
        totalSubmissionTime: `${submissionTime}ms`,
        averageSubmissionTime: `${averageSubmissionTime.toFixed(2)}ms`,
        changesPerSecond: Math.round((changeCount / submissionTime) * 1000)
      });
    }, PERFORMANCE_TIMEOUT);

    it('should maintain performance with massive documents (500K words)', async () => {
      const documentId = 'massive-doc.md';
      
      // Generate massive document content
      const paragraphs = Array.from({ length: 5000 }, (_, i) => {
        const words = Array.from({ length: 100 }, (_, j) => 
          `paragraph${i}_word${j}`
        );
        return words.join(' ');
      });
      const massiveContent = paragraphs.join('\n\n');
      
      console.log(`📚 Testing with massive document: ${massiveContent.length} characters (${MASSIVE_DOCUMENT_SIZE} words)`);
      
      // Test memory usage before operations
      const initialMemory = process.memoryUsage();
      
      const startTime = Date.now();
      await trackEditsCore.enableTrackingForDocument(documentId);
      const enableTime = Date.now() - startTime;
      
      // Should still enable tracking reasonably quickly even for massive documents
      expect(enableTime).toBeLessThan(5000); // < 5 seconds
      
      // Generate fewer changes but test clustering performance
      const changeCount = 500;
      const changes = Array.from({ length: changeCount }, (_, i) => ({
        id: `massive-doc-change-${i}`,
        documentId,
        type: 'edit' as const,
        originalText: `paragraph${Math.floor(i / 5)}_word${i % 5}`,
        suggestedText: `improved_paragraph${Math.floor(i / 5)}_word${i % 5}`,
        startOffset: i * 1000, // Spread across massive document
        endOffset: i * 1000 + 20,
        source: {
          type: 'ai' as const,
          plugin: 'performance-test'
        },
        confidence: 0.7 + (Math.random() * 0.3),
        category: ['grammar', 'style', 'structure'][i % 3],
        timestamp: new Date()
      }));
      
      // Submit changes in batches to test batch processing performance
      const batchSize = 50;
      const batches = [];
      for (let i = 0; i < changes.length; i += batchSize) {
        batches.push(changes.slice(i, i + batchSize));
      }
      
      const batchStartTime = Date.now();
      for (const batch of batches) {
        const batchResults = await Promise.all(
          batch.map(change => trackEditsCore.submitChange(change))
        );
        
        const successCount = batchResults.filter(r => r.success).length;
        expect(successCount).toBe(batch.length);
      }
      const batchTime = Date.now() - batchStartTime;
      
      // Test clustering performance
      const clusterStartTime = Date.now();
      const clusters = trackEditsCore.getChangeClusters(documentId, {
        strategy: 'proximity',
        maxDistance: 500
      });
      const clusterTime = Date.now() - clusterStartTime;
      
      // Check memory usage after operations
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Performance assertions
      expect(batchTime).toBeLessThan(15000); // < 15 seconds for 500 changes
      expect(clusterTime).toBeLessThan(2000); // < 2 seconds for clustering
      expect(memoryIncrease).toBeLessThan(200 * 1024 * 1024); // < 200MB increase
      
      console.log('✅ Massive document performance test passed');
      console.log('Massive document metrics:', {
        documentSize: `${MASSIVE_DOCUMENT_SIZE.toLocaleString()} words`,
        trackingEnableTime: `${enableTime}ms`,
        batchProcessingTime: `${batchTime}ms`,
        clusteringTime: `${clusterTime}ms`,
        memoryIncrease: `${Math.round(memoryIncrease / 1024 / 1024)}MB`,
        clustersGenerated: clusters.length
      });
    }, PERFORMANCE_TIMEOUT);
  });

  describe('Batch Processing Performance', () => {
    it('should process large batches efficiently', async () => {
      const documentId = 'batch-perf-test.md';
      await trackEditsCore.enableTrackingForDocument(documentId);
      
      // Generate large batch of changes
      const batchSizes = [10, 50, 100, 500, 1000];
      const performanceResults: Array<{
        batchSize: number;
        processingTime: number;
        changesPerSecond: number;
      }> = [];
      
      for (const batchSize of batchSizes) {
        const batchChanges = Array.from({ length: batchSize }, (_, i) => ({
          id: `batch-${batchSize}-change-${i}`,
          documentId,
          type: 'edit' as const,
          originalText: `batch_text_${i}`,
          suggestedText: `improved_batch_text_${i}`,
          startOffset: i * 20,
          endOffset: i * 20 + 12,
          source: {
            type: 'ai' as const,
            plugin: 'batch-test'
          },
          confidence: 0.8,
          category: 'batch-test',
          timestamp: new Date()
        }));
        
        // Clear previous changes
        trackEditsCore.clearChangesForDocument(documentId);
        
        const startTime = Date.now();
        const results = await Promise.all(
          batchChanges.map(change => trackEditsCore.submitChange(change))
        );
        const processingTime = Date.now() - startTime;
        
        const successfulChanges = results.filter(r => r.success).length;
        expect(successfulChanges).toBe(batchSize);
        
        const changesPerSecond = Math.round((batchSize / processingTime) * 1000);
        
        performanceResults.push({
          batchSize,
          processingTime,
          changesPerSecond
        });
        
        // Performance assertion: should maintain reasonable throughput
        expect(changesPerSecond).toBeGreaterThan(50); // At least 50 changes/second
        
        console.log(`Batch ${batchSize}: ${processingTime}ms (${changesPerSecond} changes/sec)`);
      }
      
      console.log('✅ Batch processing performance test completed');
      console.log('Batch performance summary:', performanceResults);
      
      // Verify performance scales reasonably
      const smallBatchPerf = performanceResults.find(r => r.batchSize === 10);
      const largeBatchPerf = performanceResults.find(r => r.batchSize === 1000);
      
      // Large batches should still maintain at least 50% of small batch throughput
      const performanceRatio = largeBatchPerf!.changesPerSecond / smallBatchPerf!.changesPerSecond;
      expect(performanceRatio).toBeGreaterThan(0.5);
    });

    it('should handle concurrent batch submissions', async () => {
      const documentId = 'concurrent-batch-test.md';
      await trackEditsCore.enableTrackingForDocument(documentId);
      
      const concurrentBatches = 10;
      const changesPerBatch = 100;
      
      // Generate concurrent batches
      const batchPromises = Array.from({ length: concurrentBatches }, (_, batchIndex) => {
        const batchChanges = Array.from({ length: changesPerBatch }, (_, changeIndex) => ({
          id: `concurrent-batch-${batchIndex}-change-${changeIndex}`,
          documentId,
          type: 'edit' as const,
          originalText: `batch${batchIndex}_text${changeIndex}`,
          suggestedText: `improved_batch${batchIndex}_text${changeIndex}`,
          startOffset: (batchIndex * 1000) + (changeIndex * 10),
          endOffset: (batchIndex * 1000) + (changeIndex * 10) + 8,
          source: {
            type: 'ai' as const,
            plugin: 'concurrent-test',
            batch: batchIndex
          },
          confidence: 0.8,
          category: 'concurrent-test',
          timestamp: new Date()
        }));
        
        // Submit entire batch concurrently
        return Promise.all(
          batchChanges.map(change => trackEditsCore.submitChange(change))
        );
      });
      
      const startTime = Date.now();
      const allBatchResults = await Promise.all(batchPromises);
      const totalTime = Date.now() - startTime;
      
      // Verify all changes processed successfully
      let totalSuccessful = 0;
      for (const batchResults of allBatchResults) {
        const successful = batchResults.filter(r => r.success).length;
        expect(successful).toBe(changesPerBatch);
        totalSuccessful += successful;
      }
      
      const totalChanges = concurrentBatches * changesPerBatch;
      expect(totalSuccessful).toBe(totalChanges);
      
      // Performance assertions
      const changesPerSecond = Math.round((totalChanges / totalTime) * 1000);
      expect(changesPerSecond).toBeGreaterThan(100); // Should handle at least 100 changes/sec
      expect(totalTime).toBeLessThan(15000); // Should complete in under 15 seconds
      
      console.log('✅ Concurrent batch processing test passed');
      console.log('Concurrent batch metrics:', {
        concurrentBatches,
        changesPerBatch,
        totalChanges,
        totalTime: `${totalTime}ms`,
        changesPerSecond,
        averageTimePerBatch: `${Math.round(totalTime / concurrentBatches)}ms`
      });
    });
  });

  describe('Memory Usage and Optimization', () => {
    it('should maintain reasonable memory usage with many changes', async () => {
      const documentId = 'memory-test.md';
      await trackEditsCore.enableTrackingForDocument(documentId);
      
      const initialMemory = process.memoryUsage();
      const changeCount = 5000;
      
      console.log('Initial memory usage:', {
        heapUsed: `${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(initialMemory.heapTotal / 1024 / 1024)}MB`
      });
      
      // Generate many changes with varying content sizes
      const changes = Array.from({ length: changeCount }, (_, i) => {
        const originalText = `original_text_${i}`.repeat(Math.ceil(Math.random() * 5));
        const suggestedText = `suggested_text_${i}`.repeat(Math.ceil(Math.random() * 5));
        
        return {
          id: `memory-test-change-${i}`,
          documentId,
          type: 'edit' as const,
          originalText,
          suggestedText,
          startOffset: i * 50,
          endOffset: i * 50 + originalText.length,
          source: {
            type: 'ai' as const,
            plugin: 'memory-test'
          },
          confidence: Math.random(),
          category: ['memory-test', 'performance'][i % 2],
          timestamp: new Date(),
          metadata: {
            iteration: i,
            randomData: Math.random().toString(36).repeat(10) // Add some bulk
          }
        };
      });
      
      // Submit all changes
      const results = await Promise.all(
        changes.map(change => trackEditsCore.submitChange(change))
      );
      
      const successfulChanges = results.filter(r => r.success).length;
      expect(successfulChanges).toBe(changeCount);
      
      // Check memory usage after all changes
      const afterChangesMemory = process.memoryUsage();
      const memoryIncrease = afterChangesMemory.heapUsed - initialMemory.heapUsed;
      
      console.log('Memory usage after changes:', {
        heapUsed: `${Math.round(afterChangesMemory.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(afterChangesMemory.heapTotal / 1024 / 1024)}MB`,
        increase: `${Math.round(memoryIncrease / 1024 / 1024)}MB`
      });
      
      // Test clustering performance with many changes
      const clusterStartTime = Date.now();
      const clusters = trackEditsCore.getChangeClusters(documentId, {
        strategy: 'category'
      });
      const clusterTime = Date.now() - clusterStartTime;
      
      const postClusterMemory = process.memoryUsage();
      const clusterMemoryIncrease = postClusterMemory.heapUsed - afterChangesMemory.heapUsed;
      
      // Memory assertions
      expect(memoryIncrease).toBeLessThan(500 * 1024 * 1024); // < 500MB for 5000 changes
      expect(clusterMemoryIncrease).toBeLessThan(50 * 1024 * 1024); // < 50MB for clustering
      expect(clusterTime).toBeLessThan(3000); // < 3 seconds for clustering
      
      console.log('✅ Memory usage test passed');
      console.log('Memory test results:', {
        changesProcessed: changeCount,
        memoryIncrease: `${Math.round(memoryIncrease / 1024 / 1024)}MB`,
        memoryPerChange: `${Math.round(memoryIncrease / changeCount)}bytes`,
        clusteringTime: `${clusterTime}ms`,
        clusteringMemoryIncrease: `${Math.round(clusterMemoryIncrease / 1024 / 1024)}MB`,
        clustersGenerated: clusters.length
      });
    }, PERFORMANCE_TIMEOUT);

    it('should clean up memory after change operations', async () => {
      const documentId = 'memory-cleanup-test.md';
      await trackEditsCore.enableTrackingForDocument(documentId);
      
      const initialMemory = process.memoryUsage();
      
      // Create, process, and clean up changes multiple times
      const iterations = 10;
      const changesPerIteration = 1000;
      
      for (let iteration = 0; iteration < iterations; iteration++) {
        const changes = Array.from({ length: changesPerIteration }, (_, i) => ({
          id: `cleanup-iteration-${iteration}-change-${i}`,
          documentId,
          type: 'edit' as const,
          originalText: `iteration${iteration}_text${i}`,
          suggestedText: `improved_iteration${iteration}_text${i}`,
          startOffset: (iteration * 10000) + (i * 10),
          endOffset: (iteration * 10000) + (i * 10) + 8,
          source: {
            type: 'ai' as const,
            plugin: 'cleanup-test'
          },
          confidence: 0.8,
          category: 'cleanup-test',
          timestamp: new Date()
        }));
        
        // Submit changes
        await Promise.all(changes.map(change => trackEditsCore.submitChange(change)));
        
        // Accept all changes (simulating cleanup)
        const documentChanges = trackEditsCore.getChangesForDocument(documentId);
        await Promise.all(documentChanges.map(change => 
          trackEditsCore.acceptChange(change.id)
        ));
        
        // Trigger garbage collection if available
        if (global.gc) {
          global.gc();
        }
        
        // Check memory doesn't continuously grow
        const iterationMemory = process.memoryUsage();
        const memoryGrowth = iterationMemory.heapUsed - initialMemory.heapUsed;
        
        console.log(`Iteration ${iteration + 1}: Memory growth: ${Math.round(memoryGrowth / 1024 / 1024)}MB`);
        
        // Memory shouldn't grow indefinitely
        expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024 * (iteration + 1) / iterations);
      }
      
      const finalMemory = process.memoryUsage();
      const totalMemoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Final memory should be reasonable after all operations
      expect(totalMemoryGrowth).toBeLessThan(200 * 1024 * 1024); // < 200MB total
      
      console.log('✅ Memory cleanup test passed');
      console.log('Memory cleanup results:', {
        iterations,
        changesPerIteration,
        totalChangesProcessed: iterations * changesPerIteration,
        finalMemoryGrowth: `${Math.round(totalMemoryGrowth / 1024 / 1024)}MB`,
        averageGrowthPerIteration: `${Math.round(totalMemoryGrowth / iterations / 1024 / 1024)}MB`
      });
    }, PERFORMANCE_TIMEOUT * 2);
  });

  describe('Real-time Performance', () => {
    it('should maintain responsive UI updates during heavy operations', async () => {
      const documentId = 'realtime-test.md';
      await trackEditsCore.enableTrackingForDocument(documentId);
      
      let uiUpdateCount = 0;
      const uiUpdateTimes: number[] = [];
      
      // Mock UI update handler
      const mockUIUpdate = (changeData: any) => {
        const updateStart = Date.now();
        
        // Simulate UI rendering work
        const changeCount = trackEditsCore.getChangesForDocument(documentId).length;
        
        const updateTime = Date.now() - updateStart;
        uiUpdateTimes.push(updateTime);
        uiUpdateCount++;
      };
      
      // Set up event listener for UI updates
      trackEditsCore.on('changes-updated', mockUIUpdate);
      
      // Generate continuous stream of changes
      const streamDuration = 10000; // 10 seconds
      const changesPerSecond = 20;
      const totalChanges = (streamDuration / 1000) * changesPerSecond;
      
      const startTime = Date.now();
      let changeIndex = 0;
      
      const changeStream = setInterval(() => {
        const change = {
          id: `realtime-change-${changeIndex}`,
          documentId,
          type: 'edit' as const,
          originalText: `realtime_text_${changeIndex}`,
          suggestedText: `improved_realtime_text_${changeIndex}`,
          startOffset: changeIndex * 20,
          endOffset: changeIndex * 20 + 12,
          source: {
            type: 'ai' as const,
            plugin: 'realtime-test'
          },
          confidence: 0.8,
          category: 'realtime',
          timestamp: new Date()
        };
        
        trackEditsCore.submitChange(change);
        changeIndex++;
        
        if (Date.now() - startTime >= streamDuration) {
          clearInterval(changeStream);
        }
      }, 1000 / changesPerSecond); // 20 changes per second
      
      // Wait for stream to complete
      await new Promise(resolve => {
        const checkCompletion = setInterval(() => {
          if (Date.now() - startTime >= streamDuration) {
            clearInterval(checkCompletion);
            clearInterval(changeStream);
            resolve(undefined);
          }
        }, 100);
      });
      
      // Clean up
      trackEditsCore.off('changes-updated', mockUIUpdate);
      
      // Verify UI responsiveness
      const averageUIUpdateTime = uiUpdateTimes.reduce((a, b) => a + b, 0) / uiUpdateTimes.length;
      const maxUIUpdateTime = Math.max(...uiUpdateTimes);
      
      expect(averageUIUpdateTime).toBeLessThan(16); // < 16ms for 60fps
      expect(maxUIUpdateTime).toBeLessThan(50); // No single update > 50ms
      expect(uiUpdateCount).toBeGreaterThan(totalChanges * 0.8); // At least 80% of changes triggered UI updates
      
      console.log('✅ Real-time UI performance test passed');
      console.log('Real-time performance metrics:', {
        streamDuration: `${streamDuration}ms`,
        totalChangesGenerated: changeIndex,
        uiUpdatesTriggered: uiUpdateCount,
        averageUIUpdateTime: `${averageUIUpdateTime.toFixed(2)}ms`,
        maxUIUpdateTime: `${maxUIUpdateTime}ms`,
        uiUpdateRate: `${Math.round((uiUpdateCount / streamDuration) * 1000)}/sec`
      });
    }, PERFORMANCE_TIMEOUT);
  });
});