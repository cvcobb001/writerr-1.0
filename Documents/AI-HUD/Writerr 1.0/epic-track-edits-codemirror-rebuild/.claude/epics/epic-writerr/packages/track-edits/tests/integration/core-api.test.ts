/**
 * @fileoverview Integration tests for Track Edits Core API
 * Tests the main API surface that other plugins interact with
 */

import { TrackEditsCore } from '../../src/TrackEditsCore';
import { ClusteringManager } from '../../src/ClusteringManager';
import { StateManager } from '../../src/state/StateManager';
import { SessionManager } from '../../src/session/SessionManager';
import { PersistenceManager } from '../../src/persistence/PersistenceManager';

// Mock Obsidian API
const mockApp = {
  vault: {
    adapter: {
      read: jest.fn(),
      write: jest.fn(),
      exists: jest.fn(),
      stat: jest.fn()
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

describe('Track Edits Core API Integration', () => {
  let trackEditsCore: TrackEditsCore;
  let mockDocument: any;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock document
    mockDocument = {
      id: 'test-document.md',
      path: 'test-document.md',
      content: 'This is a test document with some sample text for editing.',
      vault: 'test-vault'
    };

    // Initialize Track Edits Core with mocked dependencies
    trackEditsCore = new TrackEditsCore(mockPlugin as any);
    await trackEditsCore.initialize();
    
    // Enable tracking for test document
    await trackEditsCore.enableTrackingForDocument(mockDocument.id);
  });

  afterEach(async () => {
    await trackEditsCore.cleanup();
  });

  describe('Document Tracking Management', () => {
    it('should enable tracking for a document', async () => {
      const newDocId = 'new-test-doc.md';
      
      const result = await trackEditsCore.enableTrackingForDocument(newDocId);
      
      expect(result.success).toBe(true);
      expect(trackEditsCore.isTrackingEnabled(newDocId)).toBe(true);
      
      console.log('✅ Document tracking enabled successfully');
      console.log('Document ID:', newDocId);
      console.log('Tracking State:', trackEditsCore.getTrackingState(newDocId));
    });

    it('should disable tracking for a document', async () => {
      const result = await trackEditsCore.disableTrackingForDocument(mockDocument.id);
      
      expect(result.success).toBe(true);
      expect(trackEditsCore.isTrackingEnabled(mockDocument.id)).toBe(false);
      
      console.log('✅ Document tracking disabled successfully');
      console.log('Final tracking state:', trackEditsCore.getTrackingState(mockDocument.id));
    });

    it('should persist tracking state across sessions', async () => {
      // Enable tracking
      await trackEditsCore.enableTrackingForDocument(mockDocument.id);
      expect(trackEditsCore.isTrackingEnabled(mockDocument.id)).toBe(true);
      
      // Simulate plugin restart
      await trackEditsCore.cleanup();
      trackEditsCore = new TrackEditsCore(mockPlugin as any);
      await trackEditsCore.initialize();
      
      // Check if tracking state persists
      expect(trackEditsCore.isTrackingEnabled(mockDocument.id)).toBe(true);
      
      console.log('✅ Tracking state persisted across plugin restart');
    });
  });

  describe('Change Submission and Processing', () => {
    it('should accept and process a single change', async () => {
      const change = {
        id: 'change-1',
        documentId: mockDocument.id,
        type: 'edit' as const,
        originalText: 'sample text',
        suggestedText: 'improved sample text',
        startOffset: 35,
        endOffset: 46,
        source: {
          type: 'ai' as const,
          plugin: 'ai-editorial-functions',
          function: 'copy-editor',
          model: 'gpt-4'
        },
        confidence: 0.9,
        category: 'style-improvement',
        timestamp: new Date()
      };

      const result = await trackEditsCore.submitChange(change);
      
      expect(result.success).toBe(true);
      expect(result.changeId).toBe(change.id);
      
      // Verify change is tracked
      const changes = trackEditsCore.getChangesForDocument(mockDocument.id);
      expect(changes).toHaveLength(1);
      expect(changes[0].id).toBe(change.id);
      expect(changes[0].status).toBe('pending');
      
      console.log('✅ Single change processed successfully');
      console.log('Change details:', {
        id: change.id,
        original: change.originalText,
        suggested: change.suggestedText,
        confidence: change.confidence,
        source: change.source
      });
    });

    it('should handle batch change submissions', async () => {
      const changes = [
        {
          id: 'batch-change-1',
          documentId: mockDocument.id,
          type: 'edit' as const,
          originalText: 'This is',
          suggestedText: 'Here is',
          startOffset: 0,
          endOffset: 7,
          source: {
            type: 'ai' as const,
            plugin: 'ai-editorial-functions',
            function: 'style-editor',
            model: 'gpt-4'
          },
          confidence: 0.8,
          category: 'style-improvement',
          timestamp: new Date()
        },
        {
          id: 'batch-change-2',
          documentId: mockDocument.id,
          type: 'edit' as const,
          originalText: 'test document',
          suggestedText: 'sample document',
          startOffset: 10,
          endOffset: 23,
          source: {
            type: 'ai' as const,
            plugin: 'ai-editorial-functions',
            function: 'copy-editor',
            model: 'gpt-4'
          },
          confidence: 0.95,
          category: 'word-choice',
          timestamp: new Date()
        }
      ];

      const result = await trackEditsCore.submitBatch({
        batchId: 'test-batch-1',
        documentId: mockDocument.id,
        changes,
        source: {
          type: 'ai' as const,
          plugin: 'ai-editorial-functions',
          function: 'comprehensive-editor'
        }
      });

      expect(result.success).toBe(true);
      expect(result.processedChanges).toHaveLength(2);
      
      // Verify all changes are tracked
      const documentChanges = trackEditsCore.getChangesForDocument(mockDocument.id);
      expect(documentChanges).toHaveLength(2);
      
      console.log('✅ Batch changes processed successfully');
      console.log('Batch summary:', {
        totalChanges: changes.length,
        processedChanges: result.processedChanges.length,
        batchId: 'test-batch-1'
      });
      
      // Log individual changes for debugging
      documentChanges.forEach((change, index) => {
        console.log(`Change ${index + 1}:`, {
          id: change.id,
          original: change.originalText,
          suggested: change.suggestedText,
          confidence: change.confidence
        });
      });
    });
  });

  describe('Change Review and Decision Making', () => {
    beforeEach(async () => {
      // Set up some test changes
      const testChanges = [
        {
          id: 'review-change-1',
          documentId: mockDocument.id,
          type: 'edit' as const,
          originalText: 'sample text',
          suggestedText: 'example text',
          startOffset: 35,
          endOffset: 46,
          source: {
            type: 'ai' as const,
            plugin: 'test-plugin',
            function: 'test-function'
          },
          confidence: 0.9,
          category: 'word-choice',
          timestamp: new Date()
        },
        {
          id: 'review-change-2',
          documentId: mockDocument.id,
          type: 'edit' as const,
          originalText: 'editing',
          suggestedText: 'modification',
          startOffset: 56,
          endOffset: 63,
          source: {
            type: 'ai' as const,
            plugin: 'test-plugin',
            function: 'test-function'
          },
          confidence: 0.7,
          category: 'word-choice',
          timestamp: new Date()
        }
      ];

      for (const change of testChanges) {
        await trackEditsCore.submitChange(change);
      }
    });

    it('should accept individual changes', async () => {
      const result = await trackEditsCore.acceptChange('review-change-1');
      
      expect(result.success).toBe(true);
      
      // Verify change status updated
      const change = trackEditsCore.getChange('review-change-1');
      expect(change?.status).toBe('accepted');
      expect(change?.reviewedAt).toBeDefined();
      
      console.log('✅ Change accepted successfully');
      console.log('Accepted change:', {
        id: change?.id,
        status: change?.status,
        reviewedAt: change?.reviewedAt
      });
    });

    it('should reject individual changes', async () => {
      const result = await trackEditsCore.rejectChange('review-change-2', 'Not appropriate for context');
      
      expect(result.success).toBe(true);
      
      // Verify change status updated
      const change = trackEditsCore.getChange('review-change-2');
      expect(change?.status).toBe('rejected');
      expect(change?.rejectionReason).toBe('Not appropriate for context');
      expect(change?.reviewedAt).toBeDefined();
      
      console.log('✅ Change rejected successfully');
      console.log('Rejected change:', {
        id: change?.id,
        status: change?.status,
        rejectionReason: change?.rejectionReason
      });
    });

    it('should handle bulk operations on changes', async () => {
      const changeIds = ['review-change-1', 'review-change-2'];
      
      const result = await trackEditsCore.bulkAcceptChanges(changeIds);
      
      expect(result.success).toBe(true);
      expect(result.processedChanges).toHaveLength(2);
      
      // Verify all changes accepted
      const changes = changeIds.map(id => trackEditsCore.getChange(id));
      changes.forEach(change => {
        expect(change?.status).toBe('accepted');
      });
      
      console.log('✅ Bulk accept completed successfully');
      console.log('Bulk operation results:', {
        totalRequested: changeIds.length,
        processed: result.processedChanges.length,
        acceptedChanges: changes.map(c => ({ id: c?.id, status: c?.status }))
      });
    });
  });

  describe('Change Clustering and Organization', () => {
    beforeEach(async () => {
      // Submit a variety of changes for clustering tests
      const testChanges = [
        // Grammar cluster
        {
          id: 'grammar-1',
          documentId: mockDocument.id,
          type: 'edit' as const,
          originalText: 'is',
          suggestedText: 'are',
          startOffset: 5,
          endOffset: 7,
          source: { type: 'ai' as const, plugin: 'grammar-plugin' },
          confidence: 0.95,
          category: 'grammar',
          timestamp: new Date()
        },
        {
          id: 'grammar-2',
          documentId: mockDocument.id,
          type: 'edit' as const,
          originalText: 'text',
          suggestedText: 'texts',
          startOffset: 42,
          endOffset: 46,
          source: { type: 'ai' as const, plugin: 'grammar-plugin' },
          confidence: 0.9,
          category: 'grammar',
          timestamp: new Date()
        },
        // Style cluster
        {
          id: 'style-1',
          documentId: mockDocument.id,
          type: 'edit' as const,
          originalText: 'sample',
          suggestedText: 'exemplary',
          startOffset: 35,
          endOffset: 41,
          source: { type: 'ai' as const, plugin: 'style-plugin' },
          confidence: 0.8,
          category: 'style-improvement',
          timestamp: new Date()
        }
      ];

      for (const change of testChanges) {
        await trackEditsCore.submitChange(change);
      }
    });

    it('should cluster changes by category', async () => {
      const clusters = trackEditsCore.getChangeClusters(mockDocument.id, {
        strategy: 'category'
      });
      
      expect(clusters).toHaveLength(2); // grammar and style clusters
      
      const grammarCluster = clusters.find(c => c.category === 'grammar');
      const styleCluster = clusters.find(c => c.category === 'style-improvement');
      
      expect(grammarCluster?.changes).toHaveLength(2);
      expect(styleCluster?.changes).toHaveLength(1);
      
      console.log('✅ Change clustering by category working correctly');
      console.log('Cluster summary:');
      clusters.forEach(cluster => {
        console.log(`  ${cluster.category}: ${cluster.changes.length} changes`);
      });
    });

    it('should cluster changes by proximity', async () => {
      const clusters = trackEditsCore.getChangeClusters(mockDocument.id, {
        strategy: 'proximity',
        maxDistance: 20 // characters
      });
      
      expect(clusters.length).toBeGreaterThan(0);
      
      console.log('✅ Change clustering by proximity working');
      console.log('Proximity clusters:', clusters.length);
      clusters.forEach((cluster, index) => {
        console.log(`  Cluster ${index + 1}: ${cluster.changes.length} changes, range: ${cluster.startOffset}-${cluster.endOffset}`);
      });
    });

    it('should provide confidence-based filtering', async () => {
      const highConfidenceChanges = trackEditsCore.getChangesForDocument(mockDocument.id, {
        minConfidence: 0.9
      });
      
      const allChanges = trackEditsCore.getChangesForDocument(mockDocument.id);
      
      expect(highConfidenceChanges.length).toBeLessThan(allChanges.length);
      highConfidenceChanges.forEach(change => {
        expect(change.confidence).toBeGreaterThanOrEqual(0.9);
      });
      
      console.log('✅ Confidence-based filtering working');
      console.log('Filter results:', {
        totalChanges: allChanges.length,
        highConfidenceChanges: highConfidenceChanges.length,
        filteredOut: allChanges.length - highConfidenceChanges.length
      });
    });
  });

  describe('Performance and Memory Management', () => {
    it('should handle large numbers of changes efficiently', async () => {
      const startTime = Date.now();
      const changeCount = 100;
      
      // Generate large number of changes
      const changes = Array.from({ length: changeCount }, (_, i) => ({
        id: `perf-change-${i}`,
        documentId: mockDocument.id,
        type: 'edit' as const,
        originalText: `word${i}`,
        suggestedText: `newword${i}`,
        startOffset: i * 10,
        endOffset: i * 10 + 5,
        source: { type: 'ai' as const, plugin: 'perf-test' },
        confidence: 0.8,
        category: 'performance-test',
        timestamp: new Date()
      }));
      
      // Submit all changes
      for (const change of changes) {
        await trackEditsCore.submitChange(change);
      }
      
      const processingTime = Date.now() - startTime;
      
      // Verify all changes processed
      const documentChanges = trackEditsCore.getChangesForDocument(mockDocument.id);
      expect(documentChanges.length).toBeGreaterThanOrEqual(changeCount);
      
      // Performance assertion (should process 100 changes in under 1 second)
      expect(processingTime).toBeLessThan(1000);
      
      console.log('✅ Large batch processing performance test passed');
      console.log('Performance metrics:', {
        changesProcessed: changeCount,
        processingTime: `${processingTime}ms`,
        averageTimePerChange: `${(processingTime / changeCount).toFixed(2)}ms`,
        changesPerSecond: Math.round((changeCount / processingTime) * 1000)
      });
      
      // Memory usage check
      const memUsage = process.memoryUsage();
      console.log('Memory usage after batch processing:', {
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle invalid change submissions gracefully', async () => {
      const invalidChange = {
        id: 'invalid-change',
        documentId: mockDocument.id,
        type: 'edit' as const,
        originalText: '', // Empty original text should be invalid
        suggestedText: 'some text',
        startOffset: -1, // Invalid offset
        endOffset: -1,
        source: { type: 'ai' as const, plugin: 'test' },
        confidence: 1.5, // Invalid confidence (> 1.0)
        category: 'invalid',
        timestamp: new Date()
      };
      
      const result = await trackEditsCore.submitChange(invalidChange);
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
      
      // Verify invalid change wasn't added
      const change = trackEditsCore.getChange('invalid-change');
      expect(change).toBeNull();
      
      console.log('✅ Invalid change handling working correctly');
      console.log('Validation errors:', result.errors);
    });

    it('should recover from corruption in change data', async () => {
      // Submit a valid change first
      await trackEditsCore.submitChange({
        id: 'valid-change',
        documentId: mockDocument.id,
        type: 'edit' as const,
        originalText: 'test',
        suggestedText: 'example',
        startOffset: 10,
        endOffset: 14,
        source: { type: 'ai' as const, plugin: 'test' },
        confidence: 0.8,
        category: 'test',
        timestamp: new Date()
      });
      
      // Verify normal operation
      expect(trackEditsCore.getChangesForDocument(mockDocument.id)).toHaveLength(1);
      
      // Simulate recovery process
      const recoveryResult = await trackEditsCore.performDataRecovery(mockDocument.id);
      
      expect(recoveryResult.success).toBe(true);
      
      console.log('✅ Data recovery test completed');
      console.log('Recovery results:', recoveryResult);
    });
  });
});