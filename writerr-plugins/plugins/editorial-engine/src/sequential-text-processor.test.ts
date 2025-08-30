/**
 * Sequential Text Application Core Tests
 * Tests for the Million Monkeys Typing implementation
 */

import { SequentialTextProcessor } from './sequential-text-processor';

describe('SequentialTextProcessor', () => {
  let processor: SequentialTextProcessor;

  beforeEach(() => {
    processor = new SequentialTextProcessor({
      delayMs: 5,
      chunkStrategy: 'word-boundary',
      performanceTarget: 100
    });
  });

  describe('Text Diff Calculation', () => {
    test('identifies character-level differences', () => {
      const originalText = 'The cat is sleeping';
      const newText = 'The dog is sleeping';
      
      const diffResult = processor.calculateDiff(originalText, newText);
      
      expect(diffResult.changes).toHaveLength(1);
      expect(diffResult.changes[0]).toEqual({
        type: 'replace',
        startIndex: 4,
        endIndex: 7,
        originalText: 'cat',
        newText: 'dog'
      });
    });

    test('identifies word-level differences', () => {
      const originalText = 'Hello world';
      const newText = 'Hello beautiful world';
      
      const diffResult = processor.calculateDiff(originalText, newText);
      
      expect(diffResult.changes).toHaveLength(1);
      expect(diffResult.totalChanges).toBe(1);
    });

    test('handles multiple changes', () => {
      const originalText = 'The quick brown fox';
      const newText = 'A fast gray wolf';
      
      const diffResult = processor.calculateDiff(originalText, newText);
      
      expect(diffResult.changes.length).toBeGreaterThan(0);
      expect(diffResult.changes.some(change => change.type === 'replace')).toBe(true);
    });

    test('detects deletion changes', () => {
      const originalText = 'The quick brown fox jumps';
      const newText = 'The quick fox jumps';
      
      const diffResult = processor.calculateDiff(originalText, newText);
      
      expect(diffResult.changes).toHaveLength(1);
      expect(diffResult.totalChanges).toBe(1);
    });

    test('handles empty strings', () => {
      expect(processor.calculateDiff('', '').changes).toEqual([]);
      expect(processor.calculateDiff('hello', '').changes).toHaveLength(1);
      expect(processor.calculateDiff('', 'hello').changes).toHaveLength(1);
    });

    test('handles identical strings', () => {
      const text = 'No changes here';
      expect(processor.calculateDiff(text, text).changes).toEqual([]);
    });
  });

  describe('Sequential Change Detection', () => {
    test('creates sequential operations from diff', () => {
      const originalText = 'The cat is sleeping';
      const newText = 'The dog is awake';
      
      const operations = processor.createSequentialOperations(originalText, newText);
      
      expect(operations.length).toBeGreaterThan(0);
      expect(operations.every(op => 
        ['insert', 'delete', 'replace'].includes(op.type)
      )).toBe(true);
    });

    test('operations maintain correct text positions', () => {
      const originalText = 'abc';
      const newText = 'axbc';
      
      const operations = processor.createSequentialOperations(originalText, newText);
      
      expect(operations).toHaveLength(1);
      expect(operations[0].type).toBe('replace');
      expect(operations[0].position).toBeGreaterThanOrEqual(0);
    });

    test('handles overlapping changes correctly', () => {
      const originalText = 'The old text here';
      const newText = 'The new content here';
      
      const operations = processor.createSequentialOperations(originalText, newText);
      
      // Should create operations that don't interfere with each other
      operations.forEach((op, index) => {
        if (index > 0) {
          expect(op.position).toBeGreaterThanOrEqual(0);
        }
      });
    });
  });

  describe('Word Boundary Detection', () => {
    test('respects word boundaries in chunking', () => {
      const originalText = 'hello world test';
      const newText = 'hello beautiful world test';
      
      const chunks = processor.createIntelligentChunks(originalText, newText);
      
      expect(chunks.some(chunk => 
        !chunk.text.includes(' ') || chunk.text.trim() === chunk.text
      )).toBe(true);
    });

    test('avoids breaking words mid-character', () => {
      const originalText = 'supercalifragilisticexpialidocious';
      const newText = 'super-califragilistic-expialidocious';
      
      const chunks = processor.createIntelligentChunks(originalText, newText);
      
      chunks.forEach(chunk => {
        if (chunk.type === 'replace') {
          expect(chunk.breaksMidWord).toBe(false);
        }
      });
    });

    test('preserves punctuation boundaries', () => {
      const originalText = 'Hello, world!';
      const newText = 'Hello, beautiful world!';
      
      const chunks = processor.createIntelligentChunks(originalText, newText);
      
      expect(chunks.some(chunk => 
        chunk.respectsPunctuation
      )).toBe(true);
    });
  });

  describe('Performance Monitoring', () => {
    test('tracks execution time', async () => {
      const originalText = 'A short test text';
      const newText = 'A short modified test text';
      
      const mockEditor = {
        replaceRange: jest.fn(),
        getCursor: jest.fn(() => ({ line: 0, ch: 0 })),
        getValue: jest.fn(() => originalText),
        setValue: jest.fn()
      };
      
      const startTime = Date.now();
      await processor.simulateHumanEditing(originalText, newText, mockEditor);
      const endTime = Date.now();
      
      const metrics = processor.getPerformanceMetrics();
      expect(metrics.lastExecutionTime).toBeLessThan(100);
      expect(metrics.lastExecutionTime).toBeCloseTo(endTime - startTime, -1);
    });

    test('monitors memory usage', async () => {
      const longText = 'word '.repeat(100);
      const modifiedText = longText.replace('word', 'term');
      
      const mockEditor = {
        replaceRange: jest.fn(),
        getCursor: jest.fn(() => ({ line: 0, ch: 0 })),
        getValue: jest.fn(() => longText),
        setValue: jest.fn()
      };
      
      await processor.simulateHumanEditing(longText, modifiedText, mockEditor);
      
      const metrics = processor.getPerformanceMetrics();
      expect(metrics.memoryUsage).toBeDefined();
      expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0);
    });

    test('fails fast if performance target exceeded', async () => {
      const processor = new SequentialTextProcessor({
        delayMs: 1,
        performanceTarget: 10 // Very low target
      });
      
      const longOriginal = 'word '.repeat(20);
      const longModified = longOriginal.replace(/word/g, 'term');
      
      const mockEditor = {
        replaceRange: jest.fn(),
        getCursor: jest.fn(() => ({ line: 0, ch: 0 })),
        getValue: jest.fn(() => longOriginal),
        setValue: jest.fn()
      };
      
      await expect(
        processor.simulateHumanEditing(longOriginal, longModified, mockEditor)
      ).rejects.toThrow('Performance target exceeded');
    });
  });

  describe('Configuration Options', () => {
    test('respects custom delay settings', () => {
      const customProcessor = new SequentialTextProcessor({
        delayMs: 10,
        chunkStrategy: 'character'
      });
      
      const operations = customProcessor.createSequentialOperations('a', 'ab');
      expect(operations[0].delay).toBe(10);
    });

    test('supports different chunking strategies', () => {
      const charProcessor = new SequentialTextProcessor({
        chunkStrategy: 'character'
      });
      
      const wordProcessor = new SequentialTextProcessor({
        chunkStrategy: 'word-boundary'
      });
      
      const originalText = 'hello world';
      const newText = 'hello beautiful world';
      
      const charOps = charProcessor.createSequentialOperations(originalText, newText);
      const wordOps = wordProcessor.createSequentialOperations(originalText, newText);
      
      // Both should create operations, but they may be structured differently
      expect(charOps.length).toBeGreaterThanOrEqual(1);
      expect(wordOps.length).toBeGreaterThanOrEqual(1);
    });

    test('validates configuration parameters', () => {
      expect(() => {
        new SequentialTextProcessor({ delayMs: -1 });
      }).toThrow('Delay must be non-negative');
      
      expect(() => {
        new SequentialTextProcessor({ performanceTarget: 0 });
      }).toThrow('Performance target must be positive');
    });
  });

  describe('Edge Cases', () => {
    test('handles unicode characters', () => {
      const originalText = 'Hello 世界';
      const newText = 'Hello 🌍';
      
      const diffResult = processor.calculateDiff(originalText, newText);
      expect(diffResult.changes).toHaveLength(1);
      expect(diffResult.changes[0].originalText).toBe('世界');
      expect(diffResult.changes[0].newText).toBe('🌍');
    });

    test('handles very long texts efficiently', () => {
      const longText = 'Lorem ipsum '.repeat(100);
      const modifiedText = longText.replace('Lorem', 'Modified');
      
      const startTime = Date.now();
      const diffResult = processor.calculateDiff(longText, modifiedText);
      const endTime = Date.now();
      
      expect(diffResult.changes.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(50);
    });

    test('handles newlines and whitespace correctly', () => {
      const originalText = 'Line 1\nLine 2\n\nLine 4';
      const newText = 'Line 1\nLine 2\nLine 3\nLine 4';
      
      const diffResult = processor.calculateDiff(originalText, newText);
      expect(diffResult.changes).toHaveLength(1);
      expect(diffResult.totalChanges).toBe(1);
    });
  });
});