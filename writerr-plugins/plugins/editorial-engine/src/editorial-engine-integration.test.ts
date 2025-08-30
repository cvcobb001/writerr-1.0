/**
 * Editorial Engine Integration Tests
 * Tests for Editorial Engine → Document Editing Pipeline with SequentialTextProcessor
 * Task 2.1: Write tests for Editorial Engine → document editing pipeline
 */

import { SequentialTextProcessor } from './sequential-text-processor';
import { TrackEditsAdapter } from './adapters/track-edits-adapter';
import { 
  EditorInterface, 
  EditorPosition, 
  SequentialTextConfig,
  ExecutionJob,
  EngineResult
} from './types';

// Mock Editor Interface for testing
class MockEditor implements EditorInterface {
  private content: string = '';
  private changeLog: Array<{ type: string; position: EditorPosition; text: string; timestamp: number }> = [];

  getValue(): string {
    return this.content;
  }

  replaceRange(text: string, from: EditorPosition, to?: EditorPosition): void {
    const fromIndex = this.positionToIndex(from);
    const toIndex = to ? this.positionToIndex(to) : fromIndex;
    
    this.content = this.content.substring(0, fromIndex) + text + this.content.substring(toIndex);
    
    this.changeLog.push({
      type: to ? 'replace' : 'insert',
      position: from,
      text: text,
      timestamp: Date.now()
    });
  }

  getChangeLog() {
    return this.changeLog;
  }

  clearChangeLog() {
    this.changeLog = [];
  }

  private positionToIndex(pos: EditorPosition): number {
    const lines = this.content.split('\n');
    let index = 0;
    for (let i = 0; i < pos.line; i++) {
      index += lines[i].length + 1; // +1 for newline
    }
    return index + pos.ch;
  }
}

// Mock Track Edits API
const mockTrackEditsAPI = {
  getCurrentSession: jest.fn(() => ({ 
    id: 'test-session-001', 
    startTime: Date.now() - 60000,
    changes: [],
    wordCount: 1250,
    characterCount: 7800
  })),
  startTracking: jest.fn(),
  applyChange: jest.fn()
};

// Set up global mocks
(global as any).window = {
  WriterrlAPI: { trackEdits: mockTrackEditsAPI }
};

describe('Editorial Engine Integration Tests', () => {
  let sequentialProcessor: SequentialTextProcessor;
  let trackEditsAdapter: TrackEditsAdapter;
  let mockEditor: MockEditor;

  beforeEach(() => {
    sequentialProcessor = new SequentialTextProcessor({
      delayMs: 1, // Fast for testing
      chunkStrategy: 'word-boundary',
      performanceTarget: 1000,
      maxOperations: 100
    });
    
    trackEditsAdapter = new TrackEditsAdapter();
    mockEditor = new MockEditor();
    
    // Clear mocks
    jest.clearAllMocks();
    mockEditor.clearChangeLog();
  });

  describe('SequentialTextProcessor Integration', () => {
    it('should process simple text replacement with sequential operations', async () => {
      const originalText = 'This is a test document with an error.';
      const targetText = 'This is a test document with a correction.';
      
      mockEditor.replaceRange(originalText, { line: 0, ch: 0 });
      
      const result = await sequentialProcessor.simulateHumanEditing(
        originalText,
        targetText,
        mockEditor
      );

      expect(result.operations.length).toBeGreaterThan(0);
      expect(mockEditor.getValue()).toBe(targetText);
      expect(mockEditor.getChangeLog().length).toBeGreaterThan(0);
    });

    it('should handle multiple edits in sequence', async () => {
      const originalText = 'The cat is happy. The dog is sad.';
      const targetText = 'The cats are joyful. The dogs are cheerful.';
      
      mockEditor.replaceRange(originalText, { line: 0, ch: 0 });
      
      const result = await sequentialProcessor.simulateHumanEditing(
        originalText,
        targetText,
        mockEditor
      );

      expect(result.operations.length).toBeGreaterThan(0);
      expect(mockEditor.getValue()).toBe(targetText);
      expect(result.performanceMetrics.operationCount).toBeGreaterThan(0);
    });

    it('should respect performance targets', async () => {
      const fastProcessor = new SequentialTextProcessor({
        delayMs: 0,
        performanceTarget: 50
      });

      const originalText = 'Short text.';
      const targetText = 'Modified text.';
      
      mockEditor.replaceRange(originalText, { line: 0, ch: 0 });
      
      const result = await fastProcessor.simulateHumanEditing(
        originalText,
        targetText,
        mockEditor
      );

      expect(result.estimatedDuration).toBeLessThan(50);
    });

    it('should reject operations exceeding maxOperations limit', async () => {
      const restrictedProcessor = new SequentialTextProcessor({
        maxOperations: 5
      });

      const originalText = 'This is a very long text that would require many operations to edit completely.';
      const targetText = 'This is a completely different text that requires extensive modifications.';
      
      mockEditor.replaceRange(originalText, { line: 0, ch: 0 });
      
      await expect(restrictedProcessor.simulateHumanEditing(
        originalText,
        targetText,
        mockEditor
      )).rejects.toThrow('Too many operations');
    });
  });

  describe('Track Edits Integration', () => {
    beforeEach(async () => {
      await trackEditsAdapter.initialize({});
    });

    it('should initialize Track Edits adapter successfully', async () => {
      const status = trackEditsAdapter.getStatus();
      expect(status.healthy).toBe(true);
      expect(mockTrackEditsAPI.getCurrentSession).toHaveBeenCalled();
    });

    it('should convert Editorial Engine job to Track Edits format', async () => {
      const testJob: ExecutionJob = {
        id: 'test-job-001',
        type: 'text-edit',
        timeout: 5000,
        payload: {
          text: 'This is corrected text with proper grammar.',
          originalText: 'This is text with bad grammer.',
          mode: 'proofreader',
          edits: [
            {
              id: 'edit-1',
              type: 'replacement',
              start: 20,
              end: 28,
              oldText: 'grammer',
              newText: 'grammar'
            }
          ]
        },
        metadata: { startTime: Date.now() }
      };

      const result = await trackEditsAdapter.execute(testJob);
      
      expect(result.success).toBe(true);
      expect(result.jobId).toBe(testJob.id);
      expect(result.metadata.adapter).toBe('track-edits');
    });

    it('should handle batch processing of Editorial Engine results', async () => {
      const batchJobs: ExecutionJob[] = Array.from({ length: 3 }, (_, i) => ({
        id: `batch-job-${i}`,
        type: 'text-edit',
        timeout: 5000,
        payload: {
          text: `Batch processed text number ${i + 1}.`,
          originalText: `Original text number ${i + 1}.`,
          mode: 'copy-editor'
        },
        metadata: { startTime: Date.now() }
      }));

      const results = await Promise.all(
        batchJobs.map(job => trackEditsAdapter.execute(job))
      );

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
      
      const metrics = trackEditsAdapter.getMetrics();
      expect(metrics.executionsCount).toBe(3);
    });

    it('should provide detailed provenance information', async () => {
      const testJob: ExecutionJob = {
        id: 'provenance-test',
        type: 'text-edit',
        timeout: 5000,
        payload: {
          text: 'Final text.',
          originalText: 'Original text.',
          mode: 'copy-editor',
          edits: [
            {
              id: 'edit-1',
              type: 'replacement',
              start: 0,
              end: 8,
              oldText: 'Original',
              newText: 'Final'
            }
          ]
        },
        metadata: { startTime: Date.now() }
      };

      const result = await trackEditsAdapter.execute(testJob);
      
      expect(result.success).toBe(true);
      expect(result.provenance).toBeDefined();
      expect(result.provenance.adapter).toBe('track-edits');
      expect(result.provenance.changes).toHaveLength(1);
      expect(result.provenance.changes[0].author).toBe('editorial-engine');
    });
  });

  describe('End-to-End Pipeline Integration', () => {
    it('should integrate SequentialTextProcessor with Track Edits adapter', async () => {
      await trackEditsAdapter.initialize({});
      
      const originalText = 'This document has some errors to fix.';
      const targetText = 'This document has been corrected successfully.';
      
      // Step 1: Use SequentialTextProcessor to plan changes
      mockEditor.replaceRange(originalText, { line: 0, ch: 0 });
      
      const humanSimulation = await sequentialProcessor.simulateHumanEditing(
        originalText,
        targetText,
        mockEditor
      );

      // Step 2: Convert to Editorial Engine job format
      const editorialJob: ExecutionJob = {
        id: 'e2e-test-001',
        type: 'text-edit',
        timeout: 5000,
        payload: {
          text: targetText,
          originalText: originalText,
          mode: 'copy-editor',
          changes: humanSimulation.operations.map((op, index) => ({
            id: `change-${index}`,
            type: op.type as any,
            from: op.position,
            to: op.position,
            text: op.text,
            author: 'editorial-engine',
            timestamp: Date.now(),
            metadata: {
              sequentialOperation: true,
              delay: op.delay
            }
          }))
        },
        metadata: { 
          startTime: Date.now(),
          sequentialProcessing: true,
          operationCount: humanSimulation.operations.length
        }
      };

      // Step 3: Process through Track Edits adapter
      const result = await trackEditsAdapter.execute(editorialJob);

      expect(result.success).toBe(true);
      expect(result.metadata.adapter).toBe('track-edits');
      expect(mockEditor.getValue()).toBe(targetText);
      
      // Verify that changes were applied incrementally
      const changeLog = mockEditor.getChangeLog();
      expect(changeLog.length).toBeGreaterThan(1); // Multiple incremental changes
    });

    it('should handle complex document edits with proper sequencing', async () => {
      await trackEditsAdapter.initialize({});
      
      const originalText = `The quick brown fox jumps over the lazy dog.
This is a second paragraph with more text.
And a third paragraph for testing.`;
      
      const targetText = `The swift brown fox leaps over the energetic dog.
This is an improved second paragraph with enhanced text.
And an optimized third paragraph for comprehensive testing.`;
      
      mockEditor.replaceRange(originalText, { line: 0, ch: 0 });
      
      const humanSimulation = await sequentialProcessor.simulateHumanEditing(
        originalText,
        targetText,
        mockEditor
      );

      expect(humanSimulation.operations.length).toBeGreaterThan(0);
      expect(mockEditor.getValue()).toBe(targetText);
      
      // Verify performance metrics
      const metrics = sequentialProcessor.getPerformanceMetrics();
      expect(metrics.operationCount).toBeGreaterThan(0);
      expect(metrics.lastExecutionTime).toBeGreaterThan(0);
    });
  });

  describe('Configuration and Settings Integration', () => {
    it('should support different chunking strategies', async () => {
      const wordBoundaryProcessor = new SequentialTextProcessor({
        chunkStrategy: 'word-boundary',
        delayMs: 1
      });

      const originalText = 'This text needs word-boundary processing.';
      const targetText = 'This content requires word-boundary handling.';
      
      mockEditor.replaceRange(originalText, { line: 0, ch: 0 });
      
      const result = await wordBoundaryProcessor.simulateHumanEditing(
        originalText,
        targetText,
        mockEditor
      );

      const chunks = wordBoundaryProcessor.createIntelligentChunks(originalText, targetText);
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.some(chunk => chunk.respectsPunctuation)).toBe(true);
    });

    it('should provide configurable timing controls', async () => {
      const slowProcessor = new SequentialTextProcessor({
        delayMs: 10,
        performanceTarget: 500
      });

      const originalText = 'Test text.';
      const targetText = 'Modified text.';
      
      mockEditor.replaceRange(originalText, { line: 0, ch: 0 });
      
      const result = await slowProcessor.simulateHumanEditing(
        originalText,
        targetText,
        mockEditor
      );

      expect(result.estimatedDuration).toBeGreaterThan(0);
      const metrics = slowProcessor.getPerformanceMetrics();
      expect(metrics.averageDelayActual).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Fallback', () => {
    it('should handle Track Edits API unavailability gracefully', async () => {
      // Mock unavailable Track Edits API
      (global as any).window.WriterrlAPI = undefined;

      const faultTolerantAdapter = new TrackEditsAdapter();
      
      await expect(faultTolerantAdapter.initialize({}))
        .rejects.toThrow('Track Edits plugin is not loaded or accessible');
    });

    it('should provide graceful degradation when sequential processing fails', async () => {
      const failingProcessor = new SequentialTextProcessor({
        performanceTarget: 1, // Impossibly low target
        maxOperations: 1000
      });

      const originalText = 'Complex text requiring many operations to process correctly.';
      const targetText = 'Completely different text that requires extensive modifications.';
      
      mockEditor.replaceRange(originalText, { line: 0, ch: 0 });
      
      await expect(failingProcessor.simulateHumanEditing(
        originalText,
        targetText,
        mockEditor
      )).rejects.toThrow('Performance target exceeded');
    });

    it('should maintain data integrity during error conditions', async () => {
      const originalContent = mockEditor.getValue();
      
      try {
        const failingProcessor = new SequentialTextProcessor({
          maxOperations: 0 // Will cause immediate failure
        });

        await failingProcessor.simulateHumanEditing(
          'original',
          'target',
          mockEditor
        );
      } catch (error) {
        // Editor content should remain unchanged after failure
        expect(mockEditor.getValue()).toBe(originalContent);
      }
    });
  });

  afterEach(async () => {
    await trackEditsAdapter.cleanup();
  });
});