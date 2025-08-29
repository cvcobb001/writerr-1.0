import { EditChange } from '@shared/types';
import { 
  QueryCriteria, 
  QueryOptions, 
  QueryResult, 
  QueryStats,
  AggregationOptions,
  TimelineOptions,
  TimelinePoint,
  ExportFormat,
  QueryBuilder
} from './query-types';
import { EditChangeQuerySystem } from './edit-change-query-system';

/**
 * Fluent query builder implementation for EditChange queries
 * Task 1.6: Create utility methods for querying changes by AI provider or processing context
 */
export class QueryBuilderImpl implements QueryBuilder {
  private criteria: QueryCriteria = {};
  private options: QueryOptions = {};
  private querySystem: EditChangeQuerySystem;

  constructor(querySystem: EditChangeQuerySystem) {
    this.querySystem = querySystem;
  }

  // Basic filters
  byProvider(provider: string): QueryBuilder {
    return this.clone({ aiProvider: provider });
  }

  byModel(model: string): QueryBuilder {
    return this.clone({ aiModel: model });
  }

  byAuthor(author: string): QueryBuilder {
    return this.clone({ author });
  }

  byType(type: 'insert' | 'delete' | 'replace'): QueryBuilder {
    return this.clone({ changeType: type });
  }

  // Time filters
  inTimeRange(start: Date, end: Date): QueryBuilder {
    return this.clone({ timeRange: { start, end } });
  }

  since(date: Date): QueryBuilder {
    return this.clone({ timeRange: { start: date, end: new Date() } });
  }

  before(date: Date): QueryBuilder {
    const oldestDate = new Date(0); // Unix epoch start
    return this.clone({ timeRange: { start: oldestDate, end: date } });
  }

  inLast(amount: number, unit: 'hours' | 'days' | 'weeks' | 'months'): QueryBuilder {
    const now = new Date();
    const start = new Date(now);

    switch (unit) {
      case 'hours':
        start.setHours(start.getHours() - amount);
        break;
      case 'days':
        start.setDate(start.getDate() - amount);
        break;
      case 'weeks':
        start.setDate(start.getDate() - (amount * 7));
        break;
      case 'months':
        start.setMonth(start.getMonth() - amount);
        break;
    }

    return this.clone({ timeRange: { start, end: now } });
  }

  // AI metadata filters
  withAIMetadata(): QueryBuilder {
    return this.clone({ hasAIMetadata: true });
  }

  withoutAIMetadata(): QueryBuilder {
    return this.clone({ hasAIMetadata: false });
  }

  withProcessingContext(): QueryBuilder {
    return this.clone({ hasProcessingContext: true });
  }

  withoutProcessingContext(): QueryBuilder {
    return this.clone({ hasProcessingContext: false });
  }

  // Context filters
  inMode(mode: string): QueryBuilder {
    return this.clone({ contextMode: mode });
  }

  withConstraints(constraints: string[]): QueryBuilder {
    return this.clone({ contextConstraints: constraints });
  }

  hasConstraint(constraint: string): QueryBuilder {
    const existing = this.criteria.contextConstraints || [];
    const updated = [...existing, constraint];
    return this.clone({ contextConstraints: updated });
  }

  withInstructions(instructions: string): QueryBuilder {
    return this.clone({ contextInstructions: instructions });
  }

  // Text search
  textContains(query: string, options: { caseSensitive?: boolean; fuzzyMatch?: boolean } = {}): QueryBuilder {
    return this.clone({
      textSearch: {
        query,
        caseSensitive: options.caseSensitive,
        fuzzyMatch: options.fuzzyMatch,
        searchIn: ['text', 'removedText']
      }
    });
  }

  textMatches(pattern: RegExp): QueryBuilder {
    return this.clone({
      textSearch: {
        query: pattern.source,
        caseSensitive: !pattern.ignoreCase,
        fuzzyMatch: false,
        searchIn: ['text', 'removedText']
      }
    });
  }

  contextContains(query: string): QueryBuilder {
    return this.clone({
      textSearch: {
        query,
        searchIn: ['processingContext']
      }
    });
  }

  // Position filters
  inRange(from: number, to: number): QueryBuilder {
    return this.clone({ positionRange: { from, to } });
  }

  atPosition(position: number): QueryBuilder {
    return this.clone({ positionRange: { from: position, to: position + 1 } });
  }

  // Quality filters
  withValidationWarnings(): QueryBuilder {
    return this.clone({ hasValidationWarnings: true });
  }

  withSecurityThreats(): QueryBuilder {
    return this.clone({ hasSecurityThreats: true });
  }

  // Sorting and pagination
  sortBy(field: string, order: 'asc' | 'desc' = 'asc'): QueryBuilder {
    const newBuilder = this.cloneBuilder();
    newBuilder.options.sortBy = field as any;
    newBuilder.options.sortOrder = order;
    return newBuilder;
  }

  limit(count: number): QueryBuilder {
    const newBuilder = this.cloneBuilder();
    newBuilder.options.limit = count;
    return newBuilder;
  }

  offset(start: number): QueryBuilder {
    const newBuilder = this.cloneBuilder();
    newBuilder.options.offset = start;
    return newBuilder;
  }

  page(pageNum: number, pageSize: number): QueryBuilder {
    const newBuilder = this.cloneBuilder();
    newBuilder.options.limit = pageSize;
    newBuilder.options.offset = (pageNum - 1) * pageSize;
    return newBuilder;
  }

  // Execution methods
  async exec(): Promise<QueryResult> {
    return this.querySystem.executeQuery(this.criteria, this.options);
  }

  async count(): Promise<number> {
    const result = await this.querySystem.executeQuery(this.criteria, {
      ...this.options,
      limit: 0 // Don't return actual items, just count
    });
    return result.totalCount;
  }

  async first(): Promise<EditChange | null> {
    const result = await this.querySystem.executeQuery(this.criteria, {
      ...this.options,
      limit: 1
    });
    return result.items[0] || null;
  }

  async toArray(): Promise<EditChange[]> {
    const result = await this.querySystem.executeQuery(this.criteria, this.options);
    return result.items;
  }

  // Statistical methods
  async getStats(): Promise<QueryStats> {
    const result = await this.querySystem.executeQuery(this.criteria, {
      ...this.options,
      includeStats: true
    });
    return result.stats!;
  }

  async aggregate(options: AggregationOptions): Promise<Record<string, number>> {
    return this.querySystem.aggregate(this.criteria, options);
  }

  async timeline(options: TimelineOptions): Promise<TimelinePoint[]> {
    // For timeline, we need to get filtered changes first
    const result = await this.querySystem.executeQuery(this.criteria, this.options);
    
    // Then generate timeline from those changes
    // This is a simplified implementation - could be optimized
    const changes = result.items.filter(c => c.aiTimestamp || c.timestamp);
    return this.generateTimelineFromChanges(changes, options);
  }

  // Export methods
  async export(format: ExportFormat): Promise<string> {
    switch (format.format) {
      case 'json':
        return this.toJSON();
      case 'csv':
        return this.toCSV();
      case 'markdown':
        return this.toMarkdown();
      default:
        throw new Error(`Unsupported export format: ${format.format}`);
    }
  }

  async toJSON(): Promise<string> {
    return this.querySystem.exportToJSON(this.criteria, this.options);
  }

  async toCSV(): Promise<string> {
    return this.querySystem.exportToCSV(this.criteria);
  }

  async toMarkdown(): Promise<string> {
    return this.querySystem.exportToMarkdown(this.criteria);
  }

  // Utility methods
  clone(additionalCriteria: Partial<QueryCriteria> = {}): QueryBuilder {
    const newBuilder = this.cloneBuilder();
    newBuilder.criteria = { ...this.criteria, ...additionalCriteria };
    return newBuilder;
  }

  reset(): QueryBuilder {
    const newBuilder = new QueryBuilderImpl(this.querySystem);
    return newBuilder;
  }

  getCriteria(): QueryCriteria {
    return { ...this.criteria };
  }

  getOptions(): QueryOptions {
    return { ...this.options };
  }

  // Advanced query methods for complex scenarios
  
  /**
   * Combines multiple criteria with OR logic (instead of default AND)
   */
  or(...builders: QueryBuilder[]): QueryBuilder {
    // This is a complex feature that would require significant changes to the query execution
    // For now, we'll throw an error to indicate it's not implemented
    throw new Error('OR queries not yet implemented - use separate queries and merge results');
  }

  /**
   * Creates a complex query with nested conditions
   */
  complex(builderFn: (builder: QueryBuilder) => QueryBuilder): QueryBuilder {
    return builderFn(this.clone());
  }

  /**
   * Adds custom filter function
   */
  where(predicate: (change: EditChange) => boolean): QueryBuilder {
    // This would require extending the QueryCriteria interface to support custom predicates
    // For now, we'll store it as a custom property and handle it in execution
    const newBuilder = this.cloneBuilder();
    (newBuilder as any).customPredicate = predicate;
    return newBuilder;
  }

  /**
   * Groups results by a specific field
   */
  groupBy(field: keyof EditChange | string): GroupedQueryBuilder {
    return new GroupedQueryBuilder(this.querySystem, this.criteria, this.options, field);
  }

  /**
   * Creates a sub-query for more complex filtering
   */
  subQuery(builderFn: (builder: QueryBuilder) => QueryBuilder): QueryBuilder {
    const subBuilder = builderFn(new QueryBuilderImpl(this.querySystem));
    // In a full implementation, this would create a nested query structure
    // For now, we'll merge the criteria
    return this.clone(subBuilder.getCriteria());
  }

  // Performance optimization methods

  /**
   * Enables caching for this query
   */
  cached(ttl?: number): QueryBuilder {
    const newBuilder = this.cloneBuilder();
    newBuilder.options.useCache = true;
    if (ttl) {
      // Store TTL for custom cache implementation
      (newBuilder.options as any).cacheTTL = ttl;
    }
    return newBuilder;
  }

  /**
   * Enables lazy evaluation for better performance with large datasets
   */
  lazy(): QueryBuilder {
    const newBuilder = this.cloneBuilder();
    newBuilder.options.lazyEvaluation = true;
    return newBuilder;
  }

  // Private helper methods
  private cloneBuilder(): QueryBuilderImpl {
    const newBuilder = new QueryBuilderImpl(this.querySystem);
    newBuilder.criteria = { ...this.criteria };
    newBuilder.options = { ...this.options };
    return newBuilder;
  }

  private generateTimelineFromChanges(changes: EditChange[], options: TimelineOptions): TimelinePoint[] {
    // Group changes by time intervals
    const grouped = new Map<string, EditChange[]>();
    
    for (const change of changes) {
      const timestamp = change.aiTimestamp ? change.aiTimestamp : new Date(change.timestamp);
      const bucketKey = this.getTimeBucket(timestamp, options.interval);
      
      if (!grouped.has(bucketKey)) {
        grouped.set(bucketKey, []);
      }
      grouped.get(bucketKey)!.push(change);
    }

    // Convert to timeline points
    const timeline: TimelinePoint[] = [];
    
    for (const [bucketKey, bucketChanges] of grouped.entries()) {
      const timestamp = new Date(bucketKey);
      
      const point: TimelinePoint = {
        timestamp,
        count: bucketChanges.length
      };

      if (options.includeMetadata) {
        point.metadata = {
          providers: [...new Set(bucketChanges.map(c => c.aiProvider).filter(Boolean))],
          models: [...new Set(bucketChanges.map(c => c.aiModel).filter(Boolean))],
          modes: [...new Set(bucketChanges.map(c => c.processingContext?.mode).filter(Boolean))],
          avgWordsChanged: bucketChanges.reduce((sum, c) => 
            sum + (c.text?.split(/\s+/).length || 0), 0) / bucketChanges.length
        };
      }

      timeline.push(point);
    }

    // Sort by timestamp
    timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Fill gaps if requested
    if (options.fillGaps && timeline.length > 1) {
      return this.fillTimelineGaps(timeline, options.interval);
    }

    return timeline;
  }

  private getTimeBucket(date: Date, interval: 'hour' | 'day' | 'week' | 'month'): string {
    const d = new Date(date);
    
    switch (interval) {
      case 'hour':
        d.setMinutes(0, 0, 0);
        break;
      case 'day':
        d.setHours(0, 0, 0, 0);
        break;
      case 'week':
        const dayOfWeek = d.getDay();
        d.setDate(d.getDate() - dayOfWeek);
        d.setHours(0, 0, 0, 0);
        break;
      case 'month':
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        break;
    }
    
    return d.toISOString();
  }

  private fillTimelineGaps(timeline: TimelinePoint[], interval: 'hour' | 'day' | 'week' | 'month'): TimelinePoint[] {
    if (timeline.length < 2) return timeline;

    const filled: TimelinePoint[] = [];
    const first = timeline[0];
    const last = timeline[timeline.length - 1];

    let current = new Date(first.timestamp);
    const end = new Date(last.timestamp);

    const timelineMap = new Map(timeline.map(p => [p.timestamp.toISOString(), p]));

    while (current <= end) {
      const key = current.toISOString();
      const existing = timelineMap.get(key);
      
      if (existing) {
        filled.push(existing);
      } else {
        filled.push({
          timestamp: new Date(current),
          count: 0
        });
      }

      // Advance to next interval
      switch (interval) {
        case 'hour':
          current.setHours(current.getHours() + 1);
          break;
        case 'day':
          current.setDate(current.getDate() + 1);
          break;
        case 'week':
          current.setDate(current.getDate() + 7);
          break;
        case 'month':
          current.setMonth(current.getMonth() + 1);
          break;
      }
    }

    return filled;
  }
}

/**
 * Extended query builder for grouped results
 */
class GroupedQueryBuilder {
  constructor(
    private querySystem: EditChangeQuerySystem,
    private criteria: QueryCriteria,
    private options: QueryOptions,
    private groupField: string
  ) {}

  async exec(): Promise<Map<string, EditChange[]>> {
    const result = await this.querySystem.executeQuery(this.criteria, this.options);
    const grouped = new Map<string, EditChange[]>();

    for (const change of result.items) {
      let groupKey: string;

      // Get the grouping key based on the field
      switch (this.groupField) {
        case 'aiProvider':
          groupKey = change.aiProvider || 'unknown';
          break;
        case 'aiModel':
          groupKey = change.aiModel || 'unknown';
          break;
        case 'type':
          groupKey = change.type;
          break;
        case 'author':
          groupKey = change.author || 'unknown';
          break;
        default:
          groupKey = 'default';
      }

      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, []);
      }
      grouped.get(groupKey)!.push(change);
    }

    return grouped;
  }

  async count(): Promise<Map<string, number>> {
    const grouped = await this.exec();
    const counts = new Map<string, number>();

    for (const [key, changes] of grouped.entries()) {
      counts.set(key, changes.length);
    }

    return counts;
  }

  async toObject(): Promise<Record<string, EditChange[]>> {
    const grouped = await this.exec();
    const result: Record<string, EditChange[]> = {};

    for (const [key, changes] of grouped.entries()) {
      result[key] = changes;
    }

    return result;
  }
}