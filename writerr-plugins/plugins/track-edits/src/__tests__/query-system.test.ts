import { EditChange, EditSession, AIProcessingContext } from '@shared/types';
import { EditChangeQuerySystem } from '../queries/edit-change-query-system';
import { QueryBuilderImpl } from '../queries/query-builder';
import { QueryUtils } from '../queries/query-utils';

/**
 * Comprehensive tests for query system functionality
 * Task 1.6: Create utility methods for querying changes by AI provider or processing context
 */

describe('EditChangeQuerySystem', () => {
  let querySystem: EditChangeQuerySystem;
  let testSessions: Map<string, EditSession>;
  let sampleChanges: EditChange[];

  beforeEach(() => {
    // Create sample test data
    sampleChanges = [
      {
        id: 'change-1',
        timestamp: Date.now() - 1000000,
        type: 'insert',
        from: 0,
        to: 5,
        text: 'Hello',
        author: 'user1',
        aiProvider: 'claude-3',
        aiModel: 'claude-3-sonnet',
        processingContext: {
          mode: 'academic-writing',
          constraints: ['formal-tone', 'apa-citations'],
          instructions: 'Improve academic writing style',
          documentContext: 'Research paper on climate change'
        },
        aiTimestamp: new Date(Date.now() - 1000000)
      },
      {
        id: 'change-2',
        timestamp: Date.now() - 900000,
        type: 'replace',
        from: 5,
        to: 10,
        text: ' world',
        removedText: ' test',
        author: 'user1',
        aiProvider: 'gpt-4',
        aiModel: 'gpt-4-turbo',
        processingContext: {
          mode: 'creative-writing',
          constraints: ['engaging-tone'],
          instructions: 'Make it more creative',
        },
        aiTimestamp: new Date(Date.now() - 900000)
      },
      {
        id: 'change-3',
        timestamp: Date.now() - 800000,
        type: 'delete',
        from: 10,
        to: 15,
        removedText: ' old',
        author: 'user2'
        // No AI metadata - manual change
      },
      {
        id: 'change-4',
        timestamp: Date.now() - 700000,
        type: 'insert',
        from: 15,
        to: 20,
        text: ' new content',
        author: 'user1',
        aiProvider: 'claude-3',
        aiModel: 'claude-3-haiku',
        processingContext: {
          mode: 'technical-writing',
          constraints: ['precise-language', 'clear-structure'],
          instructions: 'Technical documentation style',
        },
        aiTimestamp: new Date(Date.now() - 700000)
      },
      {
        id: 'change-5',
        timestamp: Date.now() - 600000,
        type: 'replace',
        from: 20,
        to: 25,
        text: 'final',
        removedText: 'draft',
        author: 'user2',
        aiProvider: 'gpt-4',
        aiModel: 'gpt-4',
        processingContext: {
          mode: 'business-writing',
          constraints: ['professional-tone', 'concise'],
          instructions: 'Business communication style',
        },
        aiTimestamp: new Date(Date.now() - 600000)
      }
    ];

    // Create test sessions
    testSessions = new Map([
      ['session-1', {
        id: 'session-1',
        startTime: Date.now() - 2000000,
        endTime: Date.now() - 500000,
        changes: sampleChanges.slice(0, 3),
        wordCount: 100,
        characterCount: 500
      }],
      ['session-2', {
        id: 'session-2',
        startTime: Date.now() - 1000000,
        changes: sampleChanges.slice(3),
        wordCount: 200,
        characterCount: 800
      }]
    ]);

    querySystem = new EditChangeQuerySystem(testSessions);
  });

  describe('Basic Query Operations', () => {
    test('should create query builder instance', () => {
      const builder = querySystem.query();
      expect(builder).toBeInstanceOf(QueryBuilderImpl);
    });

    test('should filter changes by AI provider', async () => {
      const claude3Changes = await querySystem.getChangesByProvider('claude-3');
      expect(claude3Changes).toHaveLength(2);
      expect(claude3Changes.every(c => c.aiProvider === 'claude-3')).toBe(true);
    });

    test('should filter changes by AI model', async () => {
      const gpt4Changes = await querySystem.getChangesByModel('gpt-4-turbo');
      expect(gpt4Changes).toHaveLength(1);
      expect(gpt4Changes[0].id).toBe('change-2');
    });

    test('should filter changes by processing mode', async () => {
      const academicChanges = await querySystem.getChangesByMode('academic-writing');
      expect(academicChanges).toHaveLength(1);
      expect(academicChanges[0].processingContext?.mode).toBe('academic-writing');
    });

    test('should get AI-generated vs manual changes', async () => {
      const aiChanges = await querySystem.getAIGeneratedChanges();
      const manualChanges = await querySystem.getManualChanges();
      
      expect(aiChanges).toHaveLength(4);
      expect(manualChanges).toHaveLength(1);
      expect(manualChanges[0].id).toBe('change-3');
    });
  });

  describe('Time-based Queries', () => {
    test('should filter changes by time range', async () => {
      const startTime = new Date(Date.now() - 850000);
      const endTime = new Date(Date.now() - 650000);
      
      const changes = await querySystem.getChangesInTimeRange(startTime, endTime);
      expect(changes).toHaveLength(2); // change-3 and change-4
    });

    test('should work with fluent API for recent changes', async () => {
      const recentChanges = await querySystem
        .query()
        .inLast(1, 'hours')
        .toArray();
      
      expect(recentChanges).toHaveLength(5); // All changes are within last hour in our test data
    });
  });

  describe('Text Search Functionality', () => {
    test('should search in change text content', async () => {
      const results = await querySystem.textSearch('Hello');
      expect(results).toHaveLength(1);
      expect(results[0].text).toBe('Hello');
    });

    test('should search in processing context', async () => {
      const results = await querySystem.contextSearch('academic writing');
      expect(results).toHaveLength(1);
      expect(results[0].processingContext?.instructions).toContain('academic writing');
    });

    test('should support case-insensitive search', async () => {
      const results = await querySystem.textSearch('HELLO', { caseSensitive: false });
      expect(results).toHaveLength(1);
    });

    test('should support fuzzy matching', async () => {
      const results = await querySystem.textSearch('Helo', { fuzzyMatch: true });
      expect(results).toHaveLength(1);
    });
  });

  describe('Advanced Query Builder', () => {
    test('should chain multiple filters', async () => {
      const results = await querySystem
        .query()
        .byProvider('claude-3')
        .withProcessingContext()
        .sortBy('timestamp', 'desc')
        .toArray();
      
      expect(results).toHaveLength(2);
      expect(results[0].timestamp).toBeGreaterThan(results[1].timestamp);
    });

    test('should support pagination', async () => {
      const firstPage = await querySystem
        .query()
        .limit(2)
        .offset(0)
        .toArray();
      
      const secondPage = await querySystem
        .query()
        .limit(2)
        .offset(2)
        .toArray();
      
      expect(firstPage).toHaveLength(2);
      expect(secondPage).toHaveLength(2);
      expect(firstPage[0].id).not.toBe(secondPage[0].id);
    });

    test('should get query statistics', async () => {
      const stats = await querySystem
        .query()
        .withAIMetadata()
        .getStats();
      
      expect(stats.byProvider['claude-3']).toBe(2);
      expect(stats.byProvider['gpt-4']).toBe(2);
      expect(stats.withContext).toBe(4);
      expect(stats.withoutContext).toBe(0);
    });

    test('should support complex queries with constraints', async () => {
      const results = await querySystem
        .query()
        .hasConstraint('formal-tone')
        .inMode('academic-writing')
        .toArray();
      
      expect(results).toHaveLength(1);
      expect(results[0].processingContext?.constraints).toContain('formal-tone');
    });
  });

  describe('Statistical Analysis', () => {
    test('should get provider usage statistics', async () => {
      const stats = await querySystem.getProviderUsageStats();
      expect(stats['claude-3']).toBe(2);
      expect(stats['gpt-4']).toBe(2);
    });

    test('should get model usage statistics', async () => {
      const stats = await querySystem.getModelUsageStats();
      expect(stats['claude-3-sonnet']).toBe(1);
      expect(stats['claude-3-haiku']).toBe(1);
      expect(stats['gpt-4-turbo']).toBe(1);
      expect(stats['gpt-4']).toBe(1);
    });

    test('should get mode usage statistics', async () => {
      const stats = await querySystem.getModeUsageStats();
      expect(stats['academic-writing']).toBe(1);
      expect(stats['creative-writing']).toBe(1);
      expect(stats['technical-writing']).toBe(1);
      expect(stats['business-writing']).toBe(1);
    });

    test('should generate timeline data', async () => {
      const timeline = await querySystem.getTimelineData({
        interval: 'hour',
        includeMetadata: true
      });
      
      expect(timeline).toBeInstanceOf(Array);
      expect(timeline.length).toBeGreaterThan(0);
      expect(timeline[0]).toHaveProperty('timestamp');
      expect(timeline[0]).toHaveProperty('count');
    });
  });

  describe('Comparison Methods', () => {
    test('should compare providers', async () => {
      const comparison = await querySystem.compareProviders(['claude-3', 'gpt-4']);
      
      expect(comparison.results).toHaveLength(2);
      expect(comparison.comparison.totalChanges).toEqual([2, 2]);
      expect(comparison.labels).toEqual(['claude-3', 'gpt-4']);
    });

    test('should compare models', async () => {
      const comparison = await querySystem.compareModels(['claude-3-sonnet', 'gpt-4-turbo']);
      
      expect(comparison.results).toHaveLength(2);
      expect(comparison.comparison.totalChanges[0]).toBe(1);
      expect(comparison.comparison.totalChanges[1]).toBe(1);
    });

    test('should compare processing modes', async () => {
      const comparison = await querySystem.compareModes(['academic-writing', 'technical-writing']);
      
      expect(comparison.results).toHaveLength(2);
      expect(comparison.labels).toEqual(['academic-writing', 'technical-writing']);
    });
  });

  describe('Export Functionality', () => {
    test('should export to JSON', async () => {
      const json = await querySystem.exportToJSON({ aiProvider: 'claude-3' });
      const parsed = JSON.parse(json);
      
      expect(parsed).toHaveProperty('items');
      expect(parsed.items).toHaveLength(2);
    });

    test('should export to CSV', async () => {
      const csv = await querySystem.exportToCSV({ aiProvider: 'gpt-4' });
      
      expect(csv).toContain('id,timestamp,type');
      expect(csv.split('\n')).toHaveLength(4); // header + 2 data rows + empty line
    });

    test('should export to Markdown', async () => {
      const markdown = await querySystem.exportToMarkdown({ hasAIMetadata: true });
      
      expect(markdown).toContain('# Query Results');
      expect(markdown).toContain('## Statistics');
      expect(markdown).toContain('| Timestamp | Type | Provider |');
    });
  });

  describe('Aggregation Methods', () => {
    test('should aggregate by provider', async () => {
      const aggregated = await querySystem.aggregate(
        { hasAIMetadata: true },
        { groupBy: 'provider' }
      );
      
      expect(aggregated['claude-3']).toBe(2);
      expect(aggregated['gpt-4']).toBe(2);
    });

    test('should aggregate by time period', async () => {
      const aggregated = await querySystem.aggregate(
        {},
        { groupBy: 'day' }
      );
      
      expect(Object.keys(aggregated).length).toBeGreaterThan(0);
    });

    test('should support custom aggregation functions', async () => {
      const aggregated = await querySystem.aggregate(
        {},
        { 
          groupBy: 'provider',
          aggregateFunction: 'avg',
          aggregateField: 'timestamp'
        }
      );
      
      expect(typeof aggregated['claude-3']).toBe('number');
    });
  });

  describe('Query Performance and Caching', () => {
    test('should support caching', async () => {
      const query = querySystem.query().byProvider('claude-3').cached();
      
      const result1 = await query.exec();
      const result2 = await query.exec();
      
      expect(result1.items).toEqual(result2.items);
      expect(result2.fromCache).toBe(true);
    });

    test('should handle large result sets with pagination', async () => {
      // Add more test data
      const moreChanges = Array.from({ length: 100 }, (_, i) => ({
        id: `bulk-change-${i}`,
        timestamp: Date.now() - (i * 1000),
        type: 'insert' as const,
        from: i * 10,
        to: i * 10 + 5,
        text: `text ${i}`,
        author: 'bulk-user',
        aiProvider: i % 2 === 0 ? 'claude-3' : 'gpt-4',
        aiModel: i % 2 === 0 ? 'claude-3-sonnet' : 'gpt-4-turbo',
        aiTimestamp: new Date(Date.now() - (i * 1000))
      }));

      testSessions.set('bulk-session', {
        id: 'bulk-session',
        startTime: Date.now() - 200000,
        changes: moreChanges,
        wordCount: 1000,
        characterCount: 5000
      });

      querySystem.updateSessions(testSessions);

      const pagedResults = await querySystem
        .query()
        .page(1, 10)
        .exec();
      
      expect(pagedResults.items).toHaveLength(10);
      expect(pagedResults.page?.current).toBe(1);
      expect(pagedResults.page?.size).toBe(10);
      expect(pagedResults.totalCount).toBeGreaterThan(100);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle empty query results', async () => {
      const results = await querySystem.getChangesByProvider('nonexistent-provider');
      expect(results).toHaveLength(0);
    });

    test('should handle invalid time ranges', async () => {
      const futureStart = new Date(Date.now() + 1000000);
      const futureEnd = new Date(Date.now() + 2000000);
      
      const results = await querySystem.getChangesInTimeRange(futureStart, futureEnd);
      expect(results).toHaveLength(0);
    });

    test('should handle malformed processing context search', async () => {
      const results = await querySystem.contextSearch('');
      expect(results).toBeInstanceOf(Array);
    });

    test('should validate query criteria', async () => {
      const result = await querySystem.executeQuery({
        timeRange: {
          start: new Date('invalid-date'),
          end: new Date()
        }
      });
      
      expect(result.items).toHaveLength(0);
    });
  });

  describe('Integration with EditTracker', () => {
    test('should update query system when sessions change', () => {
      const newSession: EditSession = {
        id: 'new-session',
        startTime: Date.now(),
        changes: [],
        wordCount: 0,
        characterCount: 0
      };

      testSessions.set('new-session', newSession);
      querySystem.updateSessions(testSessions);

      // Verify the query system was updated
      expect(querySystem['sessions'].has('new-session')).toBe(true);
    });
  });
});

describe('QueryUtils', () => {
  describe('Text Matching', () => {
    test('should perform exact text matching', () => {
      expect(QueryUtils.textMatches('Hello World', 'Hello')).toBe(true);
      expect(QueryUtils.textMatches('Hello World', 'hello')).toBe(true);
      expect(QueryUtils.textMatches('Hello World', 'hello', { caseSensitive: true })).toBe(false);
    });

    test('should perform fuzzy text matching', () => {
      expect(QueryUtils.textMatches('Hello World', 'Helo', { fuzzyMatch: true })).toBe(true);
      expect(QueryUtils.textMatches('Hello World', 'xyz', { fuzzyMatch: true })).toBe(false);
    });

    test('should calculate string similarity', () => {
      expect(QueryUtils.calculateSimilarity('hello', 'hello')).toBe(1);
      expect(QueryUtils.calculateSimilarity('hello', 'helo')).toBeGreaterThan(0.8);
      expect(QueryUtils.calculateSimilarity('hello', 'world')).toBeLessThan(0.3);
    });

    test('should calculate Levenshtein distance', () => {
      expect(QueryUtils.levenshteinDistance('hello', 'hello')).toBe(0);
      expect(QueryUtils.levenshteinDistance('hello', 'helo')).toBe(1);
      expect(QueryUtils.levenshteinDistance('hello', 'world')).toBe(4);
    });
  });

  describe('Date Range Utilities', () => {
    test('should check if date is in range', () => {
      const date = new Date('2024-01-15');
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');
      
      expect(QueryUtils.isDateInRange(date, start, end)).toBe(true);
      
      const outOfRange = new Date('2024-02-15');
      expect(QueryUtils.isDateInRange(outOfRange, start, end)).toBe(false);
    });
  });

  describe('Data Formatting', () => {
    test('should format data as CSV', () => {
      const changes: EditChange[] = [
        {
          id: 'test-1',
          timestamp: Date.now(),
          type: 'insert',
          from: 0,
          to: 5,
          text: 'Hello',
          author: 'user1'
        }
      ];

      const csv = QueryUtils.formatAsCSV(changes, { format: 'csv' });
      expect(csv).toContain('id,timestamp,type');
      expect(csv).toContain('test-1');
    });

    test('should format statistics as Markdown', () => {
      const stats = {
        byProvider: { 'claude-3': 5, 'gpt-4': 3 },
        byModel: { 'claude-3-sonnet': 5, 'gpt-4-turbo': 3 },
        byChangeType: { 'insert': 4, 'replace': 4 },
        withContext: 8,
        withoutContext: 0,
        contextModes: { 'academic': 4, 'technical': 4 },
        validationWarnings: 0,
        securityThreats: 0,
        avgWordsChanged: 10.5,
        avgCharsChanged: 50.2,
        totalWordsChanged: 84,
        totalCharsChanged: 402
      };

      const markdown = QueryUtils.formatStatsAsMarkdown(stats);
      expect(markdown).toContain('### AI Providers');
      expect(markdown).toContain('**claude-3**: 5 changes');
      expect(markdown).toContain('**gpt-4**: 3 changes');
    });
  });

  describe('Aggregation', () => {
    test('should aggregate data by provider', () => {
      const changes: EditChange[] = [
        { id: '1', timestamp: Date.now(), type: 'insert', from: 0, to: 1, aiProvider: 'claude-3' },
        { id: '2', timestamp: Date.now(), type: 'insert', from: 1, to: 2, aiProvider: 'claude-3' },
        { id: '3', timestamp: Date.now(), type: 'insert', from: 2, to: 3, aiProvider: 'gpt-4' }
      ];

      const aggregated = QueryUtils.aggregateData(changes, {
        groupBy: 'provider'
      });

      expect(aggregated['claude-3']).toBe(2);
      expect(aggregated['gpt-4']).toBe(1);
    });

    test('should support percentage calculations', () => {
      const changes: EditChange[] = [
        { id: '1', timestamp: Date.now(), type: 'insert', from: 0, to: 1, aiProvider: 'claude-3' },
        { id: '2', timestamp: Date.now(), type: 'insert', from: 1, to: 2, aiProvider: 'gpt-4' },
        { id: '3', timestamp: Date.now(), type: 'insert', from: 2, to: 3, aiProvider: 'gpt-4' }
      ];

      const aggregated = QueryUtils.aggregateData(changes, {
        groupBy: 'provider',
        includePercentages: true
      });

      expect(aggregated['claude-3']).toBe(1);
      expect(aggregated['gpt-4']).toBe(2);
      expect(aggregated['claude-3_percentage']).toBeCloseTo(33.33, 1);
      expect(aggregated['gpt-4_percentage']).toBeCloseTo(66.67, 1);
    });
  });
});