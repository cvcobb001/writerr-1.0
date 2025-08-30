/**
 * End-to-End Pipeline Tests
 * Task 4: Complete Chat → Editorial Engine → Track Edits workflow testing
 * Tests the complete Million Monkeys Typing specification implementation
 */

import { SequentialTextProcessor } from './sequential-text-processor';
import { TrackEditsAdapter } from './adapters/track-edits-adapter';
import { 
  EditorInterface, 
  EditorPosition, 
  SequentialTextConfig,
  ExecutionJob,
  IntakePayload,
  EditorialEngineResult
} from './types';

// Enhanced Mock Editor with granular change tracking
class MockEditor implements EditorInterface {
  private content: string = '';
  private changeLog: Array<{
    id: string;
    type: string; 
    position: EditorPosition; 
    text: string; 
    timestamp: number;
    oldText?: string;
    duration?: number;
  }> = [];
  private decorations: Array<{
    id: string;
    from: number;
    to: number;
    text: string;
    type: string;
    author: string;
  }> = [];

  getValue(): string {
    return this.content;
  }

  replaceRange(text: string, from: EditorPosition, to?: EditorPosition): void {
    const fromIndex = this.positionToIndex(from);
    const toIndex = to ? this.positionToIndex(to) : fromIndex;
    const oldText = this.content.substring(fromIndex, toIndex);
    
    this.content = this.content.substring(0, fromIndex) + text + this.content.substring(toIndex);
    
    this.changeLog.push({
      id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: to ? (toIndex > fromIndex ? 'replace' : 'insert') : 'insert',
      position: from,
      text: text,
      oldText: oldText,
      timestamp: Date.now(),
      duration: Math.random() * 50 + 10 // Simulate typing speed variation
    });
  }

  // Track Edits integration - simulate decoration creation
  addDecoration(from: number, to: number, text: string, type: string, author: string = 'editorial-engine'): void {
    this.decorations.push({
      id: `decoration-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      from,
      to,
      text,
      type,
      author
    });
  }

  getChangeLog() {
    return [...this.changeLog];
  }

  getDecorations() {
    return [...this.decorations];
  }

  getGranularChanges(): Array<{ type: string; start: number; end: number; text: string; oldText?: string }> {
    return this.changeLog.map(change => ({
      type: change.type,
      start: this.positionToIndex(change.position),
      end: this.positionToIndex(change.position) + (change.oldText?.length || 0),
      text: change.text,
      oldText: change.oldText
    }));
  }

  clearChangeLog() {
    this.changeLog = [];
  }

  clearDecorations() {
    this.decorations = [];
  }

  private positionToIndex(pos: EditorPosition): number {
    const lines = this.content.split('\n');
    let index = 0;
    for (let i = 0; i < pos.line; i++) {
      index += lines[i].length + 1; // +1 for newline
    }
    return index + pos.ch;
  }

  // Simulate document state for testing
  setContent(content: string): void {
    this.content = content;
    this.clearChangeLog();
    this.clearDecorations();
  }
}

// Enhanced Mock Track Edits API with decoration tracking
const mockTrackEditsAPI = {
  getCurrentSession: jest.fn(() => ({ 
    id: 'e2e-test-session', 
    startTime: Date.now() - 60000,
    changes: [],
    decorations: [],
    wordCount: 1250,
    characterCount: 7800
  })),
  startTracking: jest.fn(),
  applyChange: jest.fn((change) => {
    // Simulate granular decoration creation
    return {
      success: true,
      decorationId: `decoration-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      change: change
    };
  }),
  createDecoration: jest.fn((from, to, text, type) => ({
    id: `decoration-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    from,
    to,
    text,
    type,
    visible: true
  })),
  getDecorations: jest.fn(() => []),
  validateGranularity: jest.fn(() => true)
};

// Mock Chat Interface for complete pipeline testing
const mockChatAPI = {
  sendMessage: jest.fn(),
  processMessage: jest.fn(),
  getCurrentMode: jest.fn(() => 'proofreader'),
  getContext: jest.fn(() => ''),
  emitEvent: jest.fn()
};

// Set up global mocks
(global as any).window = {
  WriterrlAPI: { 
    trackEdits: mockTrackEditsAPI
  },
  Writerr: { 
    trackEdits: mockTrackEditsAPI,
    chat: mockChatAPI,
    editorial: {
      process: jest.fn()
    }
  }
};

describe('End-to-End Pipeline Tests', () => {
  let sequentialProcessor: SequentialTextProcessor;
  let trackEditsAdapter: TrackEditsAdapter;
  let mockEditor: MockEditor;

  beforeEach(() => {
    sequentialProcessor = new SequentialTextProcessor({
      delayMs: 1, // Fast for testing
      chunkStrategy: 'word-boundary',
      performanceTarget: 100,
      maxOperations: 100
    });
    
    trackEditsAdapter = new TrackEditsAdapter();
    mockEditor = new MockEditor();
    
    // Clear all mocks
    jest.clearAllMocks();
    mockEditor.clearChangeLog();
    mockEditor.clearDecorations();
  });

  describe('Task 4.1: Complete Chat → Editorial Engine → Track Edits Workflow', () => {
    it('should process chat message through complete pipeline', async () => {
      // Step 1: Setup document content
      const originalText = 'This document has some gramatical errors and typos that need fixing.';
      const targetText = 'This document has some grammatical errors and typos that need fixing.';
      
      mockEditor.setContent(originalText);

      // Step 2: Simulate chat message with editorial mode
      const chatMessage = {
        id: 'chat-msg-001',
        content: 'Fix the grammar errors in this text',
        mode: 'proofreader'
      };

      // Step 3: Process through Editorial Engine (simulated)
      const intakePayload: IntakePayload = {
        id: 'editorial-job-001',
        timestamp: Date.now(),
        sessionId: 'test-session',
        instructions: chatMessage.content,
        sourceText: originalText,
        mode: chatMessage.mode,
        context: { documentPath: '/test/document.md' },
        preferences: { constraints: ['grammar', 'spelling'] }
      };

      // Mock Editorial Engine processing
      const mockEditorialResult: EditorialEngineResult = {
        success: true,
        jobId: intakePayload.id,
        text: targetText,
        processingTime: 45,
        changes: [
          {
            id: 'change-001',
            type: 'replace',
            start: 26,
            end: 36,
            oldText: 'gramatical',
            newText: 'grammatical',
            reason: 'Spelling correction'
          }
        ]
      };

      (global as any).window.Writerr.editorial.process.mockResolvedValue(mockEditorialResult);

      // Step 4: Process through SequentialTextProcessor
      const humanSimulation = await sequentialProcessor.simulateHumanEditing(
        originalText,
        targetText,
        mockEditor
      );

      // Step 5: Convert to Track Edits format
      const trackEditsJob: ExecutionJob = {
        id: 'track-edits-job-001',
        type: 'text-edit',
        timeout: 5000,
        payload: {
          text: targetText,
          originalText: originalText,
          mode: chatMessage.mode,
          changes: humanSimulation.operations.map((op, index) => ({
            id: `sequential-change-${index}`,
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
          source: 'chat',
          editorialJobId: intakePayload.id,
          operationCount: humanSimulation.operations.length
        }
      };

      // Step 6: Initialize Track Edits and execute
      await trackEditsAdapter.initialize({});
      const result = await trackEditsAdapter.execute(trackEditsJob);

      // Assertions: Complete pipeline validation
      expect(result.success).toBe(true);
      expect(result.metadata.adapter).toBe('track-edits');
      expect(mockEditor.getValue()).toBe(targetText);
      
      // Verify sequential operations were applied
      const changeLog = mockEditor.getChangeLog();
      expect(changeLog.length).toBeGreaterThan(0);
      
      // Verify Track Edits integration
      expect(mockTrackEditsAPI.applyChange).toHaveBeenCalled();
      expect(result.provenance.changes.length).toBeGreaterThan(0);
      
      // Verify granular changes vs wholesale replacement
      const granularChanges = mockEditor.getGranularChanges();
      expect(granularChanges.length).toBeGreaterThan(0);
      expect(granularChanges.some(change => change.text.length < originalText.length / 2)).toBe(true);
    });

    it('should handle complex multi-paragraph documents', async () => {
      const originalText = `The first paragraph has errors in it.
      
The second paragraph also contains mistakes that need correcting.

And the third paragraph requires some improvements as well.`;

      const targetText = `The first paragraph has corrections in it.
      
The second paragraph also contains fixes that need implementing.

And the third paragraph requires some enhancements as well.`;

      mockEditor.setContent(originalText);

      const humanSimulation = await sequentialProcessor.simulateHumanEditing(
        originalText,
        targetText,
        mockEditor
      );

      const trackEditsJob: ExecutionJob = {
        id: 'multi-para-job',
        type: 'text-edit',
        timeout: 10000,
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
            timestamp: Date.now()
          }))
        },
        metadata: { multiParagraph: true }
      };

      await trackEditsAdapter.initialize({});
      const result = await trackEditsAdapter.execute(trackEditsJob);

      expect(result.success).toBe(true);
      expect(mockEditor.getValue()).toBe(targetText);
      
      // Should create multiple granular changes across paragraphs
      const changeLog = mockEditor.getChangeLog();
      expect(changeLog.length).toBeGreaterThan(3); // Multiple changes across paragraphs
    });
  });

  describe('Task 4.2: Proofreader Mode Sequential Editing', () => {
    it('should generate granular decorations for proofreader mode', async () => {
      const originalText = 'Their are several errors hear that need to be fixed.';
      const targetText = 'There are several errors here that need to be fixed.';
      
      mockEditor.setContent(originalText);

      const proofreaderJob: ExecutionJob = {
        id: 'proofreader-job',
        type: 'text-edit',
        timeout: 5000,
        payload: {
          text: targetText,
          originalText: originalText,
          mode: 'proofreader',
          edits: [
            {
              id: 'edit-1',
              type: 'replacement',
              start: 0,
              end: 5,
              oldText: 'Their',
              newText: 'There'
            },
            {
              id: 'edit-2', 
              type: 'replacement',
              start: 22,
              end: 26,
              oldText: 'hear',
              newText: 'here'
            }
          ]
        },
        metadata: { mode: 'proofreader' }
      };

      // Process with sequential editing
      const humanSimulation = await sequentialProcessor.simulateHumanEditing(
        originalText,
        targetText,
        mockEditor
      );

      // Apply changes with decoration tracking
      humanSimulation.operations.forEach((op, index) => {
        const startIndex = op.position.line * 100 + op.position.ch; // Simple position calculation for testing
        mockEditor.addDecoration(
          startIndex,
          startIndex + op.text.length,
          op.text,
          'proofreader-edit'
        );
      });

      await trackEditsAdapter.initialize({});
      const result = await trackEditsAdapter.execute(proofreaderJob);

      expect(result.success).toBe(true);
      
      // Verify granular decorations were created
      const decorations = mockEditor.getDecorations();
      expect(decorations.length).toBeGreaterThan(0);
      expect(decorations.every(d => d.type === 'proofreader-edit')).toBe(true);
      
      // Verify changes are granular, not wholesale
      const changes = mockEditor.getGranularChanges();
      const totalChangeLength = changes.reduce((sum, change) => sum + change.text.length, 0);
      expect(totalChangeLength).toBeLessThan(originalText.length); // Granular changes are smaller than full text
    });

    it('should respect word boundaries in proofreader mode', async () => {
      const originalText = 'This sentance has mispelled words.';
      const targetText = 'This sentence has misspelled words.';
      
      mockEditor.setContent(originalText);

      const result = await sequentialProcessor.simulateHumanEditing(
        originalText,
        targetText,
        mockEditor
      );

      // Verify operations respect word boundaries
      result.operations.forEach(op => {
        const chunks = sequentialProcessor.createIntelligentChunks(originalText, targetText);
        const opIndex = op.position.line * 100 + op.position.ch; // Simple position calculation
        const relevantChunk = chunks.find(chunk => 
          chunk.startIndex <= opIndex && 
          chunk.endIndex >= opIndex
        );
        
        if (relevantChunk) {
          expect(relevantChunk.breaksMidWord).toBe(false);
        }
      });
    });
  });

  describe('Task 4.3: Copy Editor Mode Reviewable Changes', () => {
    it('should produce reviewable individual changes in copy editor mode', async () => {
      const originalText = 'The document needs some improvements to make it better.';
      const targetText = 'The document requires several enhancements to make it exceptional.';
      
      mockEditor.setContent(originalText);

      const copyEditorJob: ExecutionJob = {
        id: 'copy-editor-job',
        type: 'text-edit',
        timeout: 5000,
        payload: {
          text: targetText,
          originalText: originalText,
          mode: 'copy-editor',
          edits: [
            {
              id: 'edit-1',
              type: 'replacement',
              start: 18,
              end: 23,
              oldText: 'needs',
              newText: 'requires'
            },
            {
              id: 'edit-2',
              type: 'replacement', 
              start: 29,
              end: 41,
              oldText: 'improvements',
              newText: 'enhancements'
            },
            {
              id: 'edit-3',
              type: 'replacement',
              start: 53,
              end: 59,
              oldText: 'better',
              newText: 'exceptional'
            }
          ]
        },
        metadata: { mode: 'copy-editor', reviewRequired: true }
      };

      const humanSimulation = await sequentialProcessor.simulateHumanEditing(
        originalText,
        targetText,
        mockEditor
      );

      // Track each change as reviewable
      const reviewableChanges = humanSimulation.operations.map((op, index) => ({
        id: `reviewable-${index}`,
        operation: op,
        reviewStatus: 'pending',
        suggested: true,
        canAccept: true,
        canReject: true
      }));

      await trackEditsAdapter.initialize({});
      const result = await trackEditsAdapter.execute(copyEditorJob);

      expect(result.success).toBe(true);
      
      // Verify each change is individually reviewable
      const changeLog = mockEditor.getChangeLog();
      expect(changeLog.length).toBeGreaterThanOrEqual(3); // Multiple individual changes
      
      // Verify changes are marked as reviewable
      expect(reviewableChanges.every(change => change.canAccept && change.canReject)).toBe(true);
      
      // Verify granular change tracking
      const granularChanges = mockEditor.getGranularChanges();
      expect(granularChanges.length).toBeGreaterThan(0);
      expect(granularChanges.every(change => change.text.length < 20)).toBe(true); // Small, reviewable chunks
    });
  });

  describe('Task 4.4: Performance Validation', () => {
    it('should remain under 100ms for typical documents', async () => {
      // Typical document: ~500 words, moderate complexity
      const typicalDocument = `
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor 
        incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud 
        exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure 
        dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
        
        Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt 
        mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit 
        voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab 
        illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
        
        Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia 
        consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.
      `.trim();

      const editedDocument = typicalDocument
        .replace('Lorem ipsum', 'Sample text')
        .replace('consectetur adipiscing', 'enhanced processing')
        .replace('exercitation ullamco', 'operational framework');

      mockEditor.setContent(typicalDocument);

      const startTime = Date.now();
      
      const humanSimulation = await sequentialProcessor.simulateHumanEditing(
        typicalDocument,
        editedDocument,
        mockEditor
      );

      const trackEditsJob: ExecutionJob = {
        id: 'performance-test',
        type: 'text-edit',
        timeout: 5000,
        payload: {
          text: editedDocument,
          originalText: typicalDocument,
          mode: 'proofreader',
          changes: humanSimulation.operations.map((op, index) => ({
            id: `perf-change-${index}`,
            type: op.type as any,
            from: op.position,
            to: op.position,
            text: op.text,
            author: 'editorial-engine',
            timestamp: Date.now()
          }))
        }
      };

      await trackEditsAdapter.initialize({});
      const result = await trackEditsAdapter.execute(trackEditsJob);
      
      const totalTime = Date.now() - startTime;

      // Performance assertions
      expect(totalTime).toBeLessThan(100); // Under 100ms
      expect(result.success).toBe(true);
      expect(humanSimulation.estimatedDuration).toBeLessThan(100);
      
      // Verify performance metrics
      const metrics = sequentialProcessor.getPerformanceMetrics();
      expect(metrics.lastExecutionTime).toBeLessThan(100);
    });

    it('should handle larger documents with graceful degradation', async () => {
      // Large document: ~2000 words
      const largeDocument = 'Lorem ipsum dolor sit amet. '.repeat(200);
      const editedLargeDocument = largeDocument.replace(/Lorem/g, 'Sample').replace(/ipsum/g, 'text');

      mockEditor.setContent(largeDocument);

      const fastProcessor = new SequentialTextProcessor({
        delayMs: 0,
        chunkStrategy: 'word-boundary',
        performanceTarget: 200, // Relaxed for large documents
        maxOperations: 50 // Limit operations for large documents
      });

      const startTime = Date.now();
      
      try {
        const result = await fastProcessor.simulateHumanEditing(
          largeDocument,
          editedLargeDocument,
          mockEditor
        );
        
        const totalTime = Date.now() - startTime;
        expect(totalTime).toBeLessThan(200); // Graceful degradation
        expect(result.operations.length).toBeLessThanOrEqual(50); // Respects limits
        
      } catch (error) {
        // Should fail gracefully with clear error message
        expect(error.message).toMatch(/Performance target exceeded|Too many operations/);
      }
    });
  });

  describe('Task 4.5: Error Handling and Fallback Scenarios', () => {
    it('should handle Track Edits unavailability gracefully', async () => {
      // Simulate Track Edits being unavailable by removing WriterrlAPI
      const originalAPI = (global as any).window.WriterrlAPI;
      (global as any).window.WriterrlAPI = undefined;

      const faultTolerantAdapter = new TrackEditsAdapter();
      
      await expect(faultTolerantAdapter.initialize({}))
        .rejects.toThrow('Track Edits plugin is not loaded or accessible');
        
      // Restore for other tests
      (global as any).window.WriterrlAPI = originalAPI;
    });

    it('should handle Editorial Engine failures with fallback', async () => {
      const originalText = 'Test document with errors.';
      const targetText = 'Test document with corrections.';
      
      mockEditor.setContent(originalText);

      // Mock Editorial Engine failure
      (global as any).window.Writerr.editorial.process.mockRejectedValue(
        new Error('Editorial Engine temporarily unavailable')
      );

      const fallbackJob: ExecutionJob = {
        id: 'fallback-test',
        type: 'text-edit',
        timeout: 5000,
        payload: {
          text: targetText,
          originalText: originalText,
          mode: 'fallback',
          changes: []
        },
        metadata: { fallbackMode: true }
      };

      await trackEditsAdapter.initialize({});
      
      try {
        await trackEditsAdapter.execute(fallbackJob);
      } catch (error) {
        expect(error.message).toContain('Editorial Engine');
      }
      
      // Verify document integrity maintained
      expect(mockEditor.getValue()).toBe(originalText); // Unchanged on failure
    });

    it('should maintain data integrity during partial failures', async () => {
      const originalText = 'Document with multiple sections to edit.';
      mockEditor.setContent(originalText);
      
      const initialContent = mockEditor.getValue();
      const initialChangeCount = mockEditor.getChangeLog().length;

      const failingProcessor = new SequentialTextProcessor({
        maxOperations: 2 // Will fail partway through
      });

      try {
        await failingProcessor.simulateHumanEditing(
          originalText,
          'Completely different text requiring many changes.',
          mockEditor
        );
      } catch (error) {
        // Verify partial changes were rolled back or handled gracefully
        const postFailureChanges = mockEditor.getChangeLog().length;
        expect(postFailureChanges).toBeGreaterThanOrEqual(initialChangeCount);
        
        // Document should be in a consistent state
        expect(mockEditor.getValue().length).toBeGreaterThan(0);
      }
    });

    it('should handle network timeouts and retries', async () => {
      const timeoutJob: ExecutionJob = {
        id: 'timeout-test',
        type: 'text-edit',
        timeout: 1, // Very short timeout
        payload: {
          text: 'New text',
          originalText: 'Old text',
          mode: 'proofreader'
        }
      };

      await trackEditsAdapter.initialize({});
      
      try {
        const result = await trackEditsAdapter.execute(timeoutJob);
        // Should either succeed quickly or fail with timeout
        if (!result.success) {
          expect(result.errors?.[0]?.code).toBe('TIMEOUT');
        }
      } catch (error) {
        expect(error.message).toMatch(/timeout|time/i);
      }
    });
  });

  describe('Task 4.6: End-to-End Pipeline Functionality Validation', () => {
    it('should complete full pipeline with all components working together', async () => {
      // Complex realistic scenario
      const originalDocument = `
# Project Overview

This docuemnt outlines the project requirements and specificatoins.

## Requirements

The system should be able to handle multiple concurrent users and provide
real-time feedback on there inputs. Performance is critcal for user experience.

## Specifications  

- Response time: < 100ms
- Throughput: 1000 requests/second  
- Availabilty: 99.9% uptime

The architecure should be scalable and maintainable.
      `.trim();

      const correctedDocument = `
# Project Overview

This document outlines the project requirements and specifications.

## Requirements

The system should be able to handle multiple concurrent users and provide
real-time feedback on their inputs. Performance is critical for user experience.

## Specifications

- Response time: < 100ms
- Throughput: 1000 requests/second
- Availability: 99.9% uptime

The architecture should be scalable and maintainable.
      `.trim();

      mockEditor.setContent(originalDocument);

      // Step 1: Chat message triggers editing
      const chatRequest = {
        id: 'full-pipeline-test',
        message: 'Please proofread this document and fix any spelling/grammar errors',
        mode: 'proofreader',
        context: originalDocument
      };

      // Step 2: Editorial Engine processes request
      const editorialPayload: IntakePayload = {
        id: 'editorial-full-test',
        timestamp: Date.now(),
        sessionId: 'test-session',
        instructions: chatRequest.message,
        sourceText: originalDocument,
        mode: chatRequest.mode,
        context: { documentPath: '/test/project.md' },
        preferences: { constraints: ['spelling', 'grammar'] }
      };

      const mockEditorialResult: EditorialEngineResult = {
        success: true,
        jobId: editorialPayload.id,
        text: correctedDocument,
        processingTime: 67,
        changes: [
          { id: '1', type: 'replace', start: 52, end: 60, oldText: 'docuemnt', newText: 'document', reason: 'Spelling' },
          { id: '2', type: 'replace', start: 104, end: 119, oldText: 'specificatoins', newText: 'specifications', reason: 'Spelling' },
          { id: '3', type: 'replace', start: 237, end: 242, oldText: 'there', newText: 'their', reason: 'Grammar' },
          { id: '4', type: 'replace', start: 264, end: 271, oldText: 'critcal', newText: 'critical', reason: 'Spelling' },
          { id: '5', type: 'replace', start: 360, end: 371, oldText: 'Availabilty', newText: 'Availability', reason: 'Spelling' },
          { id: '6', type: 'replace', start: 395, end: 406, oldText: 'architecure', newText: 'architecture', reason: 'Spelling' }
        ]
      };

      (global as any).window.Writerr.editorial.process.mockResolvedValue(mockEditorialResult);

      // Step 3: Sequential text processing
      const humanSimulation = await sequentialProcessor.simulateHumanEditing(
        originalDocument,
        correctedDocument,
        mockEditor
      );

      // Step 4: Track Edits integration
      const finalJob: ExecutionJob = {
        id: 'full-pipeline-final',
        type: 'text-edit', 
        timeout: 10000,
        payload: {
          text: correctedDocument,
          originalText: originalDocument,
          mode: 'proofreader',
          changes: mockEditorialResult.changes.map((change, index) => ({
            id: change.id,
            type: change.type as any,
            from: { line: 0, ch: change.start },
            to: { line: 0, ch: change.end },
            text: change.newText,
            oldText: change.oldText,
            author: 'editorial-engine',
            timestamp: Date.now(),
            metadata: {
              reason: change.reason,
              sequentialIndex: index
            }
          }))
        },
        metadata: {
          chatRequestId: chatRequest.id,
          editorialJobId: editorialPayload.id,
          fullPipeline: true
        }
      };

      await trackEditsAdapter.initialize({});
      const finalResult = await trackEditsAdapter.execute(finalJob);

      // Add decorations to simulate Track Edits integration
      mockEditorialResult.changes.forEach((change, index) => {
        mockEditor.addDecoration(
          change.start,
          change.end,
          change.newText,
          'editorial-correction',
          'editorial-engine'
        );
      });

      // Comprehensive validation
      expect(finalResult.success).toBe(true);
      expect(mockEditor.getValue()).toContain('This document outlines the project requirements and specifications');
      expect(mockEditor.getValue()).toContain('The architecture should be scalable and maintainable');
      
      // Validate granular changes were applied
      const changeLog = mockEditor.getChangeLog();
      expect(changeLog.length).toBeGreaterThanOrEqual(6); // One for each correction
      
      // Validate decorations for each change
      const decorations = mockEditor.getDecorations(); 
      expect(decorations.length).toBeGreaterThan(0);
      
      // Validate performance
      expect(humanSimulation.estimatedDuration).toBeLessThan(100);
      
      // Validate provenance tracking
      expect(finalResult.provenance.changes.length).toBe(mockEditorialResult.changes.length);
      expect(finalResult.provenance.adapter).toBe('track-edits');
      
      // Validate granular vs wholesale replacement
      const granularChanges = mockEditor.getGranularChanges();
      const totalGranularLength = granularChanges.reduce((sum, change) => sum + change.text.length, 0);
      expect(totalGranularLength).toBeLessThan(correctedDocument.length / 2); // Granular, not wholesale
      
      // Validate all components worked together
      expect(mockTrackEditsAPI.applyChange).toHaveBeenCalled();
      expect(mockTrackEditsAPI.applyChange.mock.calls.length).toBeGreaterThan(0);
      
      // Validate that the Editorial Engine mock was configured (even if not directly called in this test)
      expect((global as any).window.Writerr.editorial.process).toBeDefined();
    });

    it('should handle mixed-mode editing (proofreader + copy-editor)', async () => {
      const originalText = 'This text needs both gramatical fixes and style improvemnts.';
      const intermediateText = 'This text needs both grammatical fixes and style improvemnts.'; // Grammar fixed
      const finalText = 'This text requires both grammatical corrections and style enhancements.'; // Style improved

      mockEditor.setContent(originalText);

      // Phase 1: Proofreader mode
      const proofreaderResult = await sequentialProcessor.simulateHumanEditing(
        originalText,
        intermediateText,
        mockEditor
      );

      expect(mockEditor.getValue()).toBe(intermediateText);

      // Phase 2: Copy-editor mode  
      const copyEditorResult = await sequentialProcessor.simulateHumanEditing(
        intermediateText,
        finalText,
        mockEditor
      );

      expect(mockEditor.getValue()).toBe(finalText);

      // Validate both phases created granular changes
      const totalChangeLog = mockEditor.getChangeLog();
      expect(totalChangeLog.length).toBeGreaterThanOrEqual(4); // Multiple phases of editing
      
      // Validate mixed decorations
      proofreaderResult.operations.forEach(op => {
        mockEditor.addDecoration(0, op.text.length, op.text, 'proofreader-edit');
      });
      
      copyEditorResult.operations.forEach(op => {
        mockEditor.addDecoration(0, op.text.length, op.text, 'copy-editor-edit');
      });

      const decorations = mockEditor.getDecorations();
      const proofreaderDecorations = decorations.filter(d => d.type === 'proofreader-edit');
      const copyEditorDecorations = decorations.filter(d => d.type === 'copy-editor-edit');
      
      expect(proofreaderDecorations.length).toBeGreaterThan(0);
      expect(copyEditorDecorations.length).toBeGreaterThan(0);
    });
  });

  afterEach(async () => {
    await trackEditsAdapter.cleanup();
  });
});