import { EditChange, AIProcessingContext } from '@shared/types';

/**
 * Query system types for EditChange filtering and analysis
 * Task 1.6: Create utility methods for querying changes by AI provider or processing context
 */

export interface QueryCriteria {
  // Basic filters
  aiProvider?: string;
  aiModel?: string;
  author?: string;
  changeType?: 'insert' | 'delete' | 'replace';
  
  // Time-based filters
  timeRange?: {
    start: Date;
    end: Date;
    timezone?: string;
  };
  
  // AI-specific filters
  hasAIMetadata?: boolean;
  hasProcessingContext?: boolean;
  
  // Processing context filters
  contextMode?: string;
  contextConstraints?: string[];
  contextInstructions?: string;
  contextDocumentContext?: string;
  
  // Text search
  textSearch?: {
    query: string;
    caseSensitive?: boolean;
    fuzzyMatch?: boolean;
    searchIn?: ('text' | 'removedText' | 'processingContext')[];
  };
  
  // Position filters
  positionRange?: {
    from?: number;
    to?: number;
  };
  
  // Validation filters
  hasValidationWarnings?: boolean;
  hasSecurityThreats?: boolean;
}

export interface QueryOptions {
  // Result handling
  limit?: number;
  offset?: number;
  
  // Sorting
  sortBy?: 'timestamp' | 'aiTimestamp' | 'from' | 'to' | 'aiProvider' | 'aiModel';
  sortOrder?: 'asc' | 'desc';
  
  // Performance
  useCache?: boolean;
  lazyEvaluation?: boolean;
  
  // Output formatting
  includeMetadata?: boolean;
  includeStats?: boolean;
}

export interface QueryResult<T = EditChange> {
  // Core results
  items: T[];
  totalCount: number;
  hasMore: boolean;
  
  // Query metadata
  query: QueryCriteria;
  options: QueryOptions;
  executionTime: number;
  fromCache?: boolean;
  
  // Statistics (optional)
  stats?: QueryStats;
  
  // Pagination
  page?: {
    current: number;
    size: number;
    total: number;
  };
}

export interface QueryStats {
  // Breakdown by AI provider
  byProvider: Record<string, number>;
  
  // Breakdown by AI model  
  byModel: Record<string, number>;
  
  // Breakdown by change type
  byChangeType: Record<string, number>;
  
  // Time-based statistics
  timeRange?: {
    earliest: Date;
    latest: Date;
    span: string;
  };
  
  // Context statistics
  withContext: number;
  withoutContext: number;
  contextModes: Record<string, number>;
  
  // Validation statistics
  validationWarnings: number;
  securityThreats: number;
  
  // Performance metrics
  avgWordsChanged: number;
  avgCharsChanged: number;
  totalWordsChanged: number;
  totalCharsChanged: number;
}

export interface ComparisonResult {
  // Comparison metadata
  criteria: QueryCriteria[];
  labels: string[];
  comparedOn: string;
  
  // Results for each criteria
  results: QueryResult[];
  
  // Comparative statistics
  comparison: {
    // Counts
    totalChanges: number[];
    avgChangesPerSession: number[];
    
    // Performance metrics
    avgWordsPerChange: number[];
    avgCharsPerChange: number[];
    
    // Time metrics
    avgTimeBetweenChanges: number[];
    avgProcessingTime: number[];
    
    // Quality metrics
    validationWarningRates: number[];
    securityThreatRates: number[];
  };
}

export interface ExportFormat {
  format: 'json' | 'csv' | 'markdown' | 'html';
  includeHeaders?: boolean;
  includeStats?: boolean;
  includeMetadata?: boolean;
  customFields?: string[];
  dateFormat?: string;
}

export interface AggregationOptions {
  groupBy: 'provider' | 'model' | 'hour' | 'day' | 'week' | 'month' | 'mode' | 'author';
  aggregateFunction?: 'count' | 'sum' | 'avg' | 'min' | 'max';
  aggregateField?: string;
  includePercentages?: boolean;
  sortBy?: 'key' | 'value';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

export interface TimelinePoint {
  timestamp: Date;
  count: number;
  metadata?: Record<string, any>;
}

export interface TimelineOptions {
  interval: 'hour' | 'day' | 'week' | 'month';
  fillGaps?: boolean;
  includeMetadata?: boolean;
  smoothing?: boolean;
}

/**
 * Query Builder interface for fluent API
 */
export interface QueryBuilder {
  // Basic filters
  byProvider(provider: string): QueryBuilder;
  byModel(model: string): QueryBuilder;
  byAuthor(author: string): QueryBuilder;
  byType(type: 'insert' | 'delete' | 'replace'): QueryBuilder;
  
  // Time filters
  inTimeRange(start: Date, end: Date): QueryBuilder;
  since(date: Date): QueryBuilder;
  before(date: Date): QueryBuilder;
  inLast(amount: number, unit: 'hours' | 'days' | 'weeks' | 'months'): QueryBuilder;
  
  // AI metadata filters
  withAIMetadata(): QueryBuilder;
  withoutAIMetadata(): QueryBuilder;
  withProcessingContext(): QueryBuilder;
  withoutProcessingContext(): QueryBuilder;
  
  // Context filters
  inMode(mode: string): QueryBuilder;
  withConstraints(constraints: string[]): QueryBuilder;
  hasConstraint(constraint: string): QueryBuilder;
  withInstructions(instructions: string): QueryBuilder;
  
  // Text search
  textContains(query: string, options?: { caseSensitive?: boolean; fuzzyMatch?: boolean }): QueryBuilder;
  textMatches(pattern: RegExp): QueryBuilder;
  contextContains(query: string): QueryBuilder;
  
  // Position filters
  inRange(from: number, to: number): QueryBuilder;
  atPosition(position: number): QueryBuilder;
  
  // Quality filters
  withValidationWarnings(): QueryBuilder;
  withSecurityThreats(): QueryBuilder;
  
  // Sorting and pagination
  sortBy(field: string, order?: 'asc' | 'desc'): QueryBuilder;
  limit(count: number): QueryBuilder;
  offset(start: number): QueryBuilder;
  page(pageNum: number, pageSize: number): QueryBuilder;
  
  // Execution methods
  exec(): Promise<QueryResult>;
  count(): Promise<number>;
  first(): Promise<EditChange | null>;
  toArray(): Promise<EditChange[]>;
  
  // Statistical methods
  getStats(): Promise<QueryStats>;
  aggregate(options: AggregationOptions): Promise<Record<string, number>>;
  timeline(options: TimelineOptions): Promise<TimelinePoint[]>;
  
  // Export methods
  export(format: ExportFormat): Promise<string>;
  toJSON(): Promise<string>;
  toCSV(): Promise<string>;
  toMarkdown(): Promise<string>;
  
  // Utility methods
  clone(): QueryBuilder;
  reset(): QueryBuilder;
  getCriteria(): QueryCriteria;
  getOptions(): QueryOptions;
}

/**
 * Cache interface for query results
 */
export interface QueryCache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  clear(): Promise<void>;
  size(): Promise<number>;
}

/**
 * Index interface for optimized queries
 */
export interface QueryIndex {
  providers: Map<string, Set<string>>; // provider -> change IDs
  models: Map<string, Set<string>>;    // model -> change IDs
  timeRanges: Map<string, Set<string>>; // time bucket -> change IDs
  modes: Map<string, Set<string>>;     // processing mode -> change IDs
  authors: Map<string, Set<string>>;   // author -> change IDs
}