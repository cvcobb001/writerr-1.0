import { EditChange, EditSession, AIProcessingContext } from '@shared/types';
import { 
  QueryCriteria, 
  QueryOptions, 
  QueryResult, 
  QueryStats,
  ComparisonResult,
  ExportFormat,
  AggregationOptions,
  TimelineOptions,
  TimelinePoint,
  QueryBuilder,
  QueryCache,
  QueryIndex
} from './query-types';
import { QueryBuilderImpl } from './query-builder';
import { QueryUtils } from './query-utils';

/**
 * Comprehensive query system for EditChange objects with AI attribution metadata
 * Task 1.6: Create utility methods for querying changes by AI provider or processing context
 */
export class EditChangeQuerySystem {
  private cache: QueryCache;
  private index: QueryIndex;
  private sessions: Map<string, EditSession>;
  
  constructor(sessions?: Map<string, EditSession>, cache?: QueryCache) {
    this.sessions = sessions || new Map();
    this.cache = cache || new MemoryQueryCache();
    this.index = this.buildIndex();
  }

  /**
   * Updates the internal sessions data and rebuilds indices
   */
  updateSessions(sessions: Map<string, EditSession>): void {
    this.sessions = sessions;
    this.index = this.buildIndex();
    this.cache.clear(); // Clear cache when data changes
  }

  /**
   * Creates a new query builder instance
   */
  query(): QueryBuilder {
    return new QueryBuilderImpl(this);
  }

  /**
   * Executes a query with given criteria and options
   */
  async executeQuery(criteria: QueryCriteria, options: QueryOptions = {}): Promise<QueryResult> {
    const startTime = Date.now();
    
    // Check cache first
    const cacheKey = this.generateCacheKey(criteria, options);
    if (options.useCache !== false) {
      const cached = await this.cache.get<QueryResult>(cacheKey);
      if (cached) {
        return { ...cached, fromCache: true };
      }
    }

    // Get all changes from sessions
    const allChanges = this.getAllChanges();
    
    // Apply filters
    let filteredChanges = await this.applyFilters(allChanges, criteria);
    
    // Apply sorting
    if (options.sortBy) {
      filteredChanges = this.applySorting(filteredChanges, options.sortBy, options.sortOrder || 'asc');
    }

    // Calculate total before pagination
    const totalCount = filteredChanges.length;

    // Apply pagination
    if (options.offset || options.limit) {
      const start = options.offset || 0;
      const end = options.limit ? start + options.limit : undefined;
      filteredChanges = filteredChanges.slice(start, end);
    }

    // Generate statistics if requested
    let stats: QueryStats | undefined;
    if (options.includeStats) {
      stats = this.generateStats(filteredChanges);
    }

    const result: QueryResult = {
      items: filteredChanges,
      totalCount,
      hasMore: (options.limit || 0) > 0 && totalCount > filteredChanges.length + (options.offset || 0),
      query: criteria,
      options,
      executionTime: Date.now() - startTime,
      stats
    };

    // Add pagination info if applicable
    if (options.limit && options.offset !== undefined) {
      result.page = {
        current: Math.floor(options.offset / options.limit) + 1,
        size: options.limit,
        total: Math.ceil(totalCount / options.limit)
      };
    }

    // Cache result if enabled
    if (options.useCache !== false) {
      await this.cache.set(cacheKey, result, 300000); // 5 minutes TTL
    }

    return result;
  }

  /**
   * Quick filter methods for common use cases
   */
  async getChangesByProvider(provider: string, options: QueryOptions = {}): Promise<EditChange[]> {
    const result = await this.executeQuery({ aiProvider: provider }, options);
    return result.items;
  }

  async getChangesByModel(model: string, options: QueryOptions = {}): Promise<EditChange[]> {
    const result = await this.executeQuery({ aiModel: model }, options);
    return result.items;
  }

  async getChangesInTimeRange(start: Date, end: Date, options: QueryOptions = {}): Promise<EditChange[]> {
    const result = await this.executeQuery({ timeRange: { start, end } }, options);
    return result.items;
  }

  async getChangesByMode(mode: string, options: QueryOptions = {}): Promise<EditChange[]> {
    const result = await this.executeQuery({ contextMode: mode }, options);
    return result.items;
  }

  async getAIGeneratedChanges(options: QueryOptions = {}): Promise<EditChange[]> {
    const result = await this.executeQuery({ hasAIMetadata: true }, options);
    return result.items;
  }

  async getManualChanges(options: QueryOptions = {}): Promise<EditChange[]> {
    const result = await this.executeQuery({ hasAIMetadata: false }, options);
    return result.items;
  }

  /**
   * Advanced search methods
   */
  async textSearch(query: string, options: {
    caseSensitive?: boolean;
    fuzzyMatch?: boolean;
    searchIn?: ('text' | 'removedText' | 'processingContext')[];
  } = {}, queryOptions: QueryOptions = {}): Promise<EditChange[]> {
    const criteria: QueryCriteria = {
      textSearch: {
        query,
        caseSensitive: options.caseSensitive,
        fuzzyMatch: options.fuzzyMatch,
        searchIn: options.searchIn || ['text', 'removedText', 'processingContext']
      }
    };
    
    const result = await this.executeQuery(criteria, queryOptions);
    return result.items;
  }

  async contextSearch(query: string, options: QueryOptions = {}): Promise<EditChange[]> {
    const criteria: QueryCriteria = {
      textSearch: {
        query,
        searchIn: ['processingContext']
      }
    };
    
    const result = await this.executeQuery(criteria, options);
    return result.items;
  }

  /**
   * Statistical analysis methods
   */
  async getProviderUsageStats(): Promise<Record<string, number>> {
    const allChanges = this.getAllChanges().filter(c => c.aiProvider);
    const stats: Record<string, number> = {};
    
    for (const change of allChanges) {
      if (change.aiProvider) {
        stats[change.aiProvider] = (stats[change.aiProvider] || 0) + 1;
      }
    }
    
    return stats;
  }

  async getModelUsageStats(): Promise<Record<string, number>> {
    const allChanges = this.getAllChanges().filter(c => c.aiModel);
    const stats: Record<string, number> = {};
    
    for (const change of allChanges) {
      if (change.aiModel) {
        stats[change.aiModel] = (stats[change.aiModel] || 0) + 1;
      }
    }
    
    return stats;
  }

  async getModeUsageStats(): Promise<Record<string, number>> {
    const allChanges = this.getAllChanges().filter(c => c.processingContext?.mode);
    const stats: Record<string, number> = {};
    
    for (const change of allChanges) {
      const mode = change.processingContext?.mode;
      if (mode) {
        stats[mode] = (stats[mode] || 0) + 1;
      }
    }
    
    return stats;
  }

  async getTimelineData(options: TimelineOptions): Promise<TimelinePoint[]> {
    const allChanges = this.getAllChanges()
      .filter(c => c.aiTimestamp || c.timestamp)
      .sort((a, b) => {
        const timeA = a.aiTimestamp ? a.aiTimestamp.getTime() : a.timestamp;
        const timeB = b.aiTimestamp ? b.aiTimestamp.getTime() : b.timestamp;
        return timeA - timeB;
      });

    return QueryUtils.generateTimeline(allChanges, options);
  }

  /**
   * Comparison methods for AI performance analysis
   */
  async compareProviders(providers: string[], criteria?: Partial<QueryCriteria>): Promise<ComparisonResult> {
    const results: QueryResult[] = [];
    
    for (const provider of providers) {
      const providerCriteria: QueryCriteria = {
        ...criteria,
        aiProvider: provider
      };
      
      const result = await this.executeQuery(providerCriteria, { includeStats: true });
      results.push(result);
    }

    return this.generateComparison(
      results.map(r => r.query),
      providers,
      'provider',
      results
    );
  }

  async compareModels(models: string[], criteria?: Partial<QueryCriteria>): Promise<ComparisonResult> {
    const results: QueryResult[] = [];
    
    for (const model of models) {
      const modelCriteria: QueryCriteria = {
        ...criteria,
        aiModel: model
      };
      
      const result = await this.executeQuery(modelCriteria, { includeStats: true });
      results.push(result);
    }

    return this.generateComparison(
      results.map(r => r.query),
      models,
      'model',
      results
    );
  }

  async compareModes(modes: string[], criteria?: Partial<QueryCriteria>): Promise<ComparisonResult> {
    const results: QueryResult[] = [];
    
    for (const mode of modes) {
      const modeCriteria: QueryCriteria = {
        ...criteria,
        contextMode: mode
      };
      
      const result = await this.executeQuery(modeCriteria, { includeStats: true });
      results.push(result);
    }

    return this.generateComparison(
      results.map(r => r.query),
      modes,
      'mode',
      results
    );
  }

  /**
   * Export methods for various formats
   */
  async exportToJSON(criteria: QueryCriteria, options: QueryOptions = {}): Promise<string> {
    const result = await this.executeQuery(criteria, options);
    return JSON.stringify(result, null, 2);
  }

  async exportToCSV(criteria: QueryCriteria, format: ExportFormat = { format: 'csv' }): Promise<string> {
    const result = await this.executeQuery(criteria);
    return QueryUtils.formatAsCSV(result.items, format);
  }

  async exportToMarkdown(criteria: QueryCriteria, format: ExportFormat = { format: 'markdown' }): Promise<string> {
    const result = await this.executeQuery(criteria, { includeStats: true });
    return QueryUtils.formatAsMarkdown(result, format);
  }

  /**
   * Aggregate data by various dimensions
   */
  async aggregate(criteria: QueryCriteria, options: AggregationOptions): Promise<Record<string, number>> {
    const result = await this.executeQuery(criteria);
    return QueryUtils.aggregateData(result.items, options);
  }

  // Private helper methods
  private getAllChanges(): EditChange[] {
    const allChanges: EditChange[] = [];
    
    for (const session of this.sessions.values()) {
      allChanges.push(...session.changes);
    }
    
    return allChanges;
  }

  private async applyFilters(changes: EditChange[], criteria: QueryCriteria): Promise<EditChange[]> {
    let filtered = changes;

    // Apply each filter
    if (criteria.aiProvider) {
      filtered = filtered.filter(c => c.aiProvider === criteria.aiProvider);
    }

    if (criteria.aiModel) {
      filtered = filtered.filter(c => c.aiModel === criteria.aiModel);
    }

    if (criteria.author) {
      filtered = filtered.filter(c => c.author === criteria.author);
    }

    if (criteria.changeType) {
      filtered = filtered.filter(c => c.type === criteria.changeType);
    }

    if (criteria.hasAIMetadata !== undefined) {
      filtered = filtered.filter(c => {
        const hasAI = !!(c.aiProvider || c.aiModel || c.processingContext || c.aiTimestamp);
        return hasAI === criteria.hasAIMetadata;
      });
    }

    if (criteria.hasProcessingContext !== undefined) {
      filtered = filtered.filter(c => !!c.processingContext === criteria.hasProcessingContext);
    }

    if (criteria.contextMode) {
      filtered = filtered.filter(c => c.processingContext?.mode === criteria.contextMode);
    }

    if (criteria.contextConstraints) {
      filtered = filtered.filter(c => {
        const constraints = c.processingContext?.constraints || [];
        return criteria.contextConstraints!.every(constraint => 
          constraints.includes(constraint)
        );
      });
    }

    if (criteria.timeRange) {
      const { start, end } = criteria.timeRange;
      filtered = filtered.filter(c => {
        const timestamp = c.aiTimestamp ? c.aiTimestamp.getTime() : c.timestamp;
        return timestamp >= start.getTime() && timestamp <= end.getTime();
      });
    }

    if (criteria.positionRange) {
      const { from, to } = criteria.positionRange;
      filtered = filtered.filter(c => {
        if (from !== undefined && c.from < from) return false;
        if (to !== undefined && c.to > to) return false;
        return true;
      });
    }

    if (criteria.textSearch) {
      filtered = await this.applyTextSearch(filtered, criteria.textSearch);
    }

    return filtered;
  }

  private async applyTextSearch(changes: EditChange[], search: NonNullable<QueryCriteria['textSearch']>): Promise<EditChange[]> {
    const { query, caseSensitive, fuzzyMatch, searchIn } = search;
    const searchFields = searchIn || ['text', 'removedText', 'processingContext'];
    
    return changes.filter(change => {
      for (const field of searchFields) {
        let searchText = '';
        
        switch (field) {
          case 'text':
            searchText = change.text || '';
            break;
          case 'removedText':
            searchText = change.removedText || '';
            break;
          case 'processingContext':
            if (change.processingContext) {
              searchText = JSON.stringify(change.processingContext);
            }
            break;
        }

        if (QueryUtils.textMatches(searchText, query, { caseSensitive, fuzzyMatch })) {
          return true;
        }
      }
      
      return false;
    });
  }

  private applySorting(changes: EditChange[], sortBy: string, order: 'asc' | 'desc'): EditChange[] {
    return changes.sort((a, b) => {
      let valueA: any, valueB: any;

      switch (sortBy) {
        case 'timestamp':
          valueA = a.timestamp;
          valueB = b.timestamp;
          break;
        case 'aiTimestamp':
          valueA = a.aiTimestamp?.getTime() || 0;
          valueB = b.aiTimestamp?.getTime() || 0;
          break;
        case 'from':
          valueA = a.from;
          valueB = b.from;
          break;
        case 'to':
          valueA = a.to;
          valueB = b.to;
          break;
        case 'aiProvider':
          valueA = a.aiProvider || '';
          valueB = b.aiProvider || '';
          break;
        case 'aiModel':
          valueA = a.aiModel || '';
          valueB = b.aiModel || '';
          break;
        default:
          return 0;
      }

      if (valueA < valueB) return order === 'asc' ? -1 : 1;
      if (valueA > valueB) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }

  private generateStats(changes: EditChange[]): QueryStats {
    const stats: QueryStats = {
      byProvider: {},
      byModel: {},
      byChangeType: {},
      withContext: 0,
      withoutContext: 0,
      contextModes: {},
      validationWarnings: 0,
      securityThreats: 0,
      avgWordsChanged: 0,
      avgCharsChanged: 0,
      totalWordsChanged: 0,
      totalCharsChanged: 0
    };

    let totalWords = 0;
    let totalChars = 0;
    let earliestTime: Date | undefined;
    let latestTime: Date | undefined;

    for (const change of changes) {
      // Provider stats
      if (change.aiProvider) {
        stats.byProvider[change.aiProvider] = (stats.byProvider[change.aiProvider] || 0) + 1;
      }

      // Model stats
      if (change.aiModel) {
        stats.byModel[change.aiModel] = (stats.byModel[change.aiModel] || 0) + 1;
      }

      // Change type stats
      stats.byChangeType[change.type] = (stats.byChangeType[change.type] || 0) + 1;

      // Context stats
      if (change.processingContext) {
        stats.withContext++;
        if (change.processingContext.mode) {
          stats.contextModes[change.processingContext.mode] = 
            (stats.contextModes[change.processingContext.mode] || 0) + 1;
        }
      } else {
        stats.withoutContext++;
      }

      // Time range
      const timestamp = change.aiTimestamp ? change.aiTimestamp : new Date(change.timestamp);
      if (!earliestTime || timestamp < earliestTime) {
        earliestTime = timestamp;
      }
      if (!latestTime || timestamp > latestTime) {
        latestTime = timestamp;
      }

      // Text statistics
      const text = change.text || '';
      const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
      const chars = text.length;
      
      totalWords += words;
      totalChars += chars;
    }

    // Calculate averages
    if (changes.length > 0) {
      stats.avgWordsChanged = totalWords / changes.length;
      stats.avgCharsChanged = totalChars / changes.length;
    }
    
    stats.totalWordsChanged = totalWords;
    stats.totalCharsChanged = totalChars;

    // Time range
    if (earliestTime && latestTime) {
      const span = latestTime.getTime() - earliestTime.getTime();
      const hours = Math.floor(span / (1000 * 60 * 60));
      const days = Math.floor(hours / 24);
      
      stats.timeRange = {
        earliest: earliestTime,
        latest: latestTime,
        span: days > 0 ? `${days} days, ${hours % 24} hours` : `${hours} hours`
      };
    }

    return stats;
  }

  private generateComparison(
    criteria: QueryCriteria[], 
    labels: string[], 
    comparedOn: string,
    results: QueryResult[]
  ): ComparisonResult {
    const comparison: ComparisonResult['comparison'] = {
      totalChanges: [],
      avgChangesPerSession: [],
      avgWordsPerChange: [],
      avgCharsPerChange: [],
      avgTimeBetweenChanges: [],
      avgProcessingTime: [],
      validationWarningRates: [],
      securityThreatRates: []
    };

    for (const result of results) {
      comparison.totalChanges.push(result.totalCount);
      
      if (result.stats) {
        comparison.avgWordsPerChange.push(result.stats.avgWordsChanged);
        comparison.avgCharsPerChange.push(result.stats.avgCharsChanged);
        comparison.validationWarningRates.push(result.stats.validationWarnings / result.totalCount);
        comparison.securityThreatRates.push(result.stats.securityThreats / result.totalCount);
      } else {
        comparison.avgWordsPerChange.push(0);
        comparison.avgCharsPerChange.push(0);
        comparison.validationWarningRates.push(0);
        comparison.securityThreatRates.push(0);
      }

      // Calculate other metrics (simplified for now)
      comparison.avgChangesPerSession.push(result.totalCount / Math.max(this.sessions.size, 1));
      comparison.avgTimeBetweenChanges.push(0); // TODO: implement
      comparison.avgProcessingTime.push(0); // TODO: implement
    }

    return {
      criteria,
      labels,
      comparedOn,
      results,
      comparison
    };
  }

  private buildIndex(): QueryIndex {
    const index: QueryIndex = {
      providers: new Map(),
      models: new Map(),
      timeRanges: new Map(),
      modes: new Map(),
      authors: new Map()
    };

    for (const session of this.sessions.values()) {
      for (const change of session.changes) {
        // Index by provider
        if (change.aiProvider) {
          if (!index.providers.has(change.aiProvider)) {
            index.providers.set(change.aiProvider, new Set());
          }
          index.providers.get(change.aiProvider)!.add(change.id);
        }

        // Index by model
        if (change.aiModel) {
          if (!index.models.has(change.aiModel)) {
            index.models.set(change.aiModel, new Set());
          }
          index.models.get(change.aiModel)!.add(change.id);
        }

        // Index by mode
        if (change.processingContext?.mode) {
          if (!index.modes.has(change.processingContext.mode)) {
            index.modes.set(change.processingContext.mode, new Set());
          }
          index.modes.get(change.processingContext.mode)!.add(change.id);
        }

        // Index by author
        if (change.author) {
          if (!index.authors.has(change.author)) {
            index.authors.set(change.author, new Set());
          }
          index.authors.get(change.author)!.add(change.id);
        }

        // Index by time bucket (for faster time-based queries)
        const timestamp = change.aiTimestamp ? change.aiTimestamp : new Date(change.timestamp);
        const timeBucket = Math.floor(timestamp.getTime() / (1000 * 60 * 60 * 24)); // Daily buckets
        const timeKey = timeBucket.toString();
        
        if (!index.timeRanges.has(timeKey)) {
          index.timeRanges.set(timeKey, new Set());
        }
        index.timeRanges.get(timeKey)!.add(change.id);
      }
    }

    return index;
  }

  private generateCacheKey(criteria: QueryCriteria, options: QueryOptions): string {
    return `query:${JSON.stringify(criteria)}:${JSON.stringify(options)}`;
  }
}

/**
 * Simple in-memory cache implementation
 */
class MemoryQueryCache implements QueryCache {
  private store = new Map<string, { value: any; expiry: number }>();

  async get<T>(key: string): Promise<T | null> {
    const item = this.store.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.store.delete(key);
      return null;
    }
    
    return item.value;
  }

  async set<T>(key: string, value: T, ttl: number = 300000): Promise<void> {
    this.store.set(key, {
      value,
      expiry: Date.now() + ttl
    });
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async size(): Promise<number> {
    return this.store.size;
  }
}