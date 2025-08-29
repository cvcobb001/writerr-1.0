import { EditChange, AIProcessingContext } from '@shared/types';
import { 
  QueryResult, 
  ExportFormat,
  AggregationOptions,
  TimelineOptions,
  TimelinePoint
} from './query-types';

/**
 * Utility functions for query operations and data processing
 * Task 1.6: Create utility methods for querying changes by AI provider or processing context
 */
export class QueryUtils {
  
  /**
   * Text matching utilities with fuzzy matching support
   */
  static textMatches(text: string, query: string, options: {
    caseSensitive?: boolean;
    fuzzyMatch?: boolean;
  } = {}): boolean {
    const { caseSensitive = false, fuzzyMatch = false } = options;
    
    let searchText = text;
    let searchQuery = query;
    
    if (!caseSensitive) {
      searchText = text.toLowerCase();
      searchQuery = query.toLowerCase();
    }

    if (fuzzyMatch) {
      return this.fuzzyMatch(searchText, searchQuery);
    } else {
      return searchText.includes(searchQuery);
    }
  }

  /**
   * Simple fuzzy matching implementation using edit distance
   */
  static fuzzyMatch(text: string, pattern: string, threshold: number = 0.8): boolean {
    // For very short patterns, use exact matching
    if (pattern.length < 3) {
      return text.includes(pattern);
    }

    // Split text into words and check if any word is similar to pattern
    const words = text.split(/\s+/);
    
    for (const word of words) {
      if (this.calculateSimilarity(word, pattern) >= threshold) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate similarity between two strings (0-1, where 1 is identical)
   */
  static calculateSimilarity(str1: string, str2: string): number {
    if (str1.length === 0 && str2.length === 0) return 1;
    if (str1.length === 0 || str2.length === 0) return 0;

    const maxLength = Math.max(str1.length, str2.length);
    const distance = this.levenshteinDistance(str1, str2);
    
    return (maxLength - distance) / maxLength;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => 
      Array(str1.length + 1).fill(null)
    );

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Date range utilities
   */
  static isDateInRange(date: Date, start: Date, end: Date, timezone?: string): boolean {
    // Handle timezone conversion if specified
    if (timezone) {
      // This is a simplified implementation - in production, use a proper timezone library
      console.warn('Timezone handling not fully implemented, using local timezone');
    }

    const timestamp = date.getTime();
    return timestamp >= start.getTime() && timestamp <= end.getTime();
  }

  /**
   * Processing context search utilities
   */
  static searchInProcessingContext(
    context: AIProcessingContext, 
    query: string,
    options: { caseSensitive?: boolean; fuzzyMatch?: boolean } = {}
  ): boolean {
    const searchableText = [
      context.prompt || '',
      context.mode || '',
      context.instructions || '',
      context.documentContext || '',
      ...(context.constraints || [])
    ].join(' ');

    return this.textMatches(searchableText, query, options);
  }

  /**
   * Aggregate data by various dimensions
   */
  static aggregateData(changes: EditChange[], options: AggregationOptions): Record<string, number> {
    const { groupBy, aggregateFunction = 'count', aggregateField, includePercentages = false } = options;
    const result: Record<string, number> = {};
    const groups = new Map<string, EditChange[]>();

    // Group changes by the specified field
    for (const change of changes) {
      let groupKey = this.getGroupKey(change, groupBy);
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(change);
    }

    // Calculate aggregation for each group
    for (const [groupKey, groupChanges] of groups.entries()) {
      let value: number;

      switch (aggregateFunction) {
        case 'count':
          value = groupChanges.length;
          break;
        case 'sum':
          value = this.sumField(groupChanges, aggregateField || 'timestamp');
          break;
        case 'avg':
          value = this.avgField(groupChanges, aggregateField || 'timestamp');
          break;
        case 'min':
          value = this.minField(groupChanges, aggregateField || 'timestamp');
          break;
        case 'max':
          value = this.maxField(groupChanges, aggregateField || 'timestamp');
          break;
        default:
          value = groupChanges.length;
      }

      result[groupKey] = value;
    }

    // Add percentages if requested
    if (includePercentages && aggregateFunction === 'count') {
      const total = Object.values(result).reduce((sum, val) => sum + val, 0);
      const percentages: Record<string, number> = {};
      
      for (const [key, value] of Object.entries(result)) {
        percentages[`${key}_percentage`] = total > 0 ? (value / total) * 100 : 0;
      }
      
      Object.assign(result, percentages);
    }

    // Sort results if requested
    if (options.sortBy) {
      return this.sortObject(result, options.sortBy, options.sortOrder || 'desc');
    }

    // Apply limit if specified
    if (options.limit && options.limit > 0) {
      return this.limitObject(result, options.limit);
    }

    return result;
  }

  /**
   * Generate timeline data from changes
   */
  static generateTimeline(changes: EditChange[], options: TimelineOptions): TimelinePoint[] {
    const { interval, fillGaps = false, includeMetadata = false } = options;
    const buckets = new Map<string, EditChange[]>();

    // Group changes by time buckets
    for (const change of changes) {
      const timestamp = change.aiTimestamp ? change.aiTimestamp : new Date(change.timestamp);
      const bucketKey = this.getTimeBucket(timestamp, interval);
      
      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, []);
      }
      buckets.get(bucketKey)!.push(change);
    }

    // Convert to timeline points
    const timeline: TimelinePoint[] = [];
    
    for (const [bucketKey, bucketChanges] of buckets.entries()) {
      const point: TimelinePoint = {
        timestamp: new Date(bucketKey),
        count: bucketChanges.length
      };

      if (includeMetadata) {
        point.metadata = this.generateTimelineMetadata(bucketChanges);
      }

      timeline.push(point);
    }

    // Sort by timestamp
    timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Fill gaps if requested
    if (fillGaps && timeline.length > 1) {
      return this.fillTimelineGaps(timeline, interval);
    }

    return timeline;
  }

  /**
   * Format data as CSV
   */
  static formatAsCSV(changes: EditChange[], format: ExportFormat): string {
    const { includeHeaders = true, customFields, dateFormat = 'ISO' } = format;
    
    let csv = '';
    
    // Headers
    if (includeHeaders) {
      const headers = customFields || [
        'id', 'timestamp', 'type', 'from', 'to', 'text', 'removedText', 
        'author', 'aiProvider', 'aiModel', 'aiTimestamp', 'processingContext'
      ];
      csv += headers.join(',') + '\n';
    }

    // Data rows
    for (const change of changes) {
      const row: string[] = [];
      
      if (customFields) {
        for (const field of customFields) {
          row.push(this.formatCSVValue(this.getFieldValue(change, field), dateFormat));
        }
      } else {
        row.push(
          this.formatCSVValue(change.id),
          this.formatCSVValue(this.formatDate(new Date(change.timestamp), dateFormat)),
          this.formatCSVValue(change.type),
          this.formatCSVValue(change.from),
          this.formatCSVValue(change.to),
          this.formatCSVValue(change.text || ''),
          this.formatCSVValue(change.removedText || ''),
          this.formatCSVValue(change.author || ''),
          this.formatCSVValue(change.aiProvider || ''),
          this.formatCSVValue(change.aiModel || ''),
          this.formatCSVValue(change.aiTimestamp ? this.formatDate(change.aiTimestamp, dateFormat) : ''),
          this.formatCSVValue(change.processingContext ? JSON.stringify(change.processingContext) : '')
        );
      }
      
      csv += row.join(',') + '\n';
    }

    return csv;
  }

  /**
   * Format data as Markdown
   */
  static formatAsMarkdown(result: QueryResult, format: ExportFormat): string {
    const { includeStats = true, includeMetadata = true } = format;
    
    let markdown = `# Query Results\n\n`;
    
    // Query metadata
    if (includeMetadata) {
      markdown += `## Query Information\n\n`;
      markdown += `- **Total Results**: ${result.totalCount}\n`;
      markdown += `- **Execution Time**: ${result.executionTime}ms\n`;
      
      if (result.fromCache) {
        markdown += `- **Source**: Cache\n`;
      }
      
      if (result.page) {
        markdown += `- **Page**: ${result.page.current} of ${result.page.total}\n`;
        markdown += `- **Page Size**: ${result.page.size}\n`;
      }
      
      markdown += `\n`;
    }

    // Statistics
    if (includeStats && result.stats) {
      markdown += this.formatStatsAsMarkdown(result.stats);
    }

    // Results table
    if (result.items.length > 0) {
      markdown += `## Results\n\n`;
      markdown += `| Timestamp | Type | Provider | Model | Text Preview | Position |\n`;
      markdown += `|-----------|------|----------|-------|--------------|----------|\n`;
      
      for (const change of result.items.slice(0, 50)) { // Limit to 50 for readability
        const timestamp = change.aiTimestamp ? 
          change.aiTimestamp.toLocaleString() : 
          new Date(change.timestamp).toLocaleString();
        
        const textPreview = (change.text || change.removedText || '').substring(0, 50);
        const position = `${change.from}-${change.to}`;
        
        markdown += `| ${timestamp} | ${change.type} | ${change.aiProvider || 'Manual'} | ${change.aiModel || 'N/A'} | ${textPreview}${textPreview.length > 50 ? '...' : ''} | ${position} |\n`;
      }
      
      if (result.items.length > 50) {
        markdown += `\n*... and ${result.items.length - 50} more results*\n`;
      }
    }

    return markdown;
  }

  /**
   * Format statistics as Markdown
   */
  static formatStatsAsMarkdown(stats: QueryStats): string {
    let markdown = `## Statistics\n\n`;
    
    // Provider breakdown
    if (Object.keys(stats.byProvider).length > 0) {
      markdown += `### AI Providers\n\n`;
      for (const [provider, count] of Object.entries(stats.byProvider)) {
        markdown += `- **${provider}**: ${count} changes\n`;
      }
      markdown += `\n`;
    }

    // Model breakdown
    if (Object.keys(stats.byModel).length > 0) {
      markdown += `### AI Models\n\n`;
      for (const [model, count] of Object.entries(stats.byModel)) {
        markdown += `- **${model}**: ${count} changes\n`;
      }
      markdown += `\n`;
    }

    // Change type breakdown
    markdown += `### Change Types\n\n`;
    for (const [type, count] of Object.entries(stats.byChangeType)) {
      markdown += `- **${type}**: ${count} changes\n`;
    }
    markdown += `\n`;

    // Context statistics
    markdown += `### Processing Context\n\n`;
    markdown += `- **With Context**: ${stats.withContext} changes\n`;
    markdown += `- **Without Context**: ${stats.withoutContext} changes\n`;
    
    if (Object.keys(stats.contextModes).length > 0) {
      markdown += `\n**Modes Used**:\n`;
      for (const [mode, count] of Object.entries(stats.contextModes)) {
        markdown += `- **${mode}**: ${count} changes\n`;
      }
    }
    markdown += `\n`;

    // Performance metrics
    markdown += `### Content Metrics\n\n`;
    markdown += `- **Total Words Changed**: ${stats.totalWordsChanged}\n`;
    markdown += `- **Total Characters Changed**: ${stats.totalCharsChanged}\n`;
    markdown += `- **Average Words per Change**: ${stats.avgWordsChanged.toFixed(1)}\n`;
    markdown += `- **Average Characters per Change**: ${stats.avgCharsChanged.toFixed(1)}\n`;

    // Time range
    if (stats.timeRange) {
      markdown += `\n### Time Range\n\n`;
      markdown += `- **Earliest**: ${stats.timeRange.earliest.toLocaleString()}\n`;
      markdown += `- **Latest**: ${stats.timeRange.latest.toLocaleString()}\n`;
      markdown += `- **Span**: ${stats.timeRange.span}\n`;
    }

    // Quality metrics
    if (stats.validationWarnings > 0 || stats.securityThreats > 0) {
      markdown += `\n### Quality Metrics\n\n`;
      markdown += `- **Validation Warnings**: ${stats.validationWarnings}\n`;
      markdown += `- **Security Threats**: ${stats.securityThreats}\n`;
    }

    return markdown + `\n`;
  }

  // Private helper methods

  private static getGroupKey(change: EditChange, groupBy: string): string {
    switch (groupBy) {
      case 'provider':
        return change.aiProvider || 'Manual';
      case 'model':
        return change.aiModel || 'N/A';
      case 'author':
        return change.author || 'Unknown';
      case 'mode':
        return change.processingContext?.mode || 'No Mode';
      case 'hour':
        return new Date(change.timestamp).toISOString().substring(0, 13) + ':00:00.000Z';
      case 'day':
        return new Date(change.timestamp).toISOString().substring(0, 10) + 'T00:00:00.000Z';
      case 'week':
        const date = new Date(change.timestamp);
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        return startOfWeek.toISOString().substring(0, 10) + 'T00:00:00.000Z';
      case 'month':
        return new Date(change.timestamp).toISOString().substring(0, 7) + '-01T00:00:00.000Z';
      default:
        return 'Unknown';
    }
  }

  private static sumField(changes: EditChange[], field: string): number {
    return changes.reduce((sum, change) => sum + (this.getNumericFieldValue(change, field) || 0), 0);
  }

  private static avgField(changes: EditChange[], field: string): number {
    if (changes.length === 0) return 0;
    return this.sumField(changes, field) / changes.length;
  }

  private static minField(changes: EditChange[], field: string): number {
    const values = changes.map(c => this.getNumericFieldValue(c, field)).filter(v => v !== undefined) as number[];
    return values.length > 0 ? Math.min(...values) : 0;
  }

  private static maxField(changes: EditChange[], field: string): number {
    const values = changes.map(c => this.getNumericFieldValue(c, field)).filter(v => v !== undefined) as number[];
    return values.length > 0 ? Math.max(...values) : 0;
  }

  private static getNumericFieldValue(change: EditChange, field: string): number | undefined {
    switch (field) {
      case 'timestamp':
        return change.timestamp;
      case 'from':
        return change.from;
      case 'to':
        return change.to;
      case 'textLength':
        return change.text?.length || 0;
      case 'removedTextLength':
        return change.removedText?.length || 0;
      default:
        return 0;
    }
  }

  private static getFieldValue(change: EditChange, field: string): any {
    const keys = field.split('.');
    let value: any = change;
    
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) break;
    }
    
    return value;
  }

  private static sortObject(obj: Record<string, number>, sortBy: 'key' | 'value', order: 'asc' | 'desc'): Record<string, number> {
    const entries = Object.entries(obj);
    
    entries.sort((a, b) => {
      const valueA = sortBy === 'key' ? a[0] : a[1];
      const valueB = sortBy === 'key' ? b[0] : b[1];
      
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return order === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
      } else {
        return order === 'asc' ? (valueA as number) - (valueB as number) : (valueB as number) - (valueA as number);
      }
    });

    return Object.fromEntries(entries);
  }

  private static limitObject(obj: Record<string, number>, limit: number): Record<string, number> {
    const entries = Object.entries(obj).slice(0, limit);
    return Object.fromEntries(entries);
  }

  private static getTimeBucket(date: Date, interval: 'hour' | 'day' | 'week' | 'month'): string {
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

  private static generateTimelineMetadata(changes: EditChange[]): Record<string, any> {
    return {
      providers: [...new Set(changes.map(c => c.aiProvider).filter(Boolean))],
      models: [...new Set(changes.map(c => c.aiModel).filter(Boolean))],
      modes: [...new Set(changes.map(c => c.processingContext?.mode).filter(Boolean))],
      types: [...new Set(changes.map(c => c.type))],
      avgWordsChanged: changes.reduce((sum, c) => 
        sum + (c.text?.split(/\s+/).length || 0), 0) / changes.length,
      totalTextLength: changes.reduce((sum, c) => sum + (c.text?.length || 0), 0),
      authors: [...new Set(changes.map(c => c.author).filter(Boolean))]
    };
  }

  private static fillTimelineGaps(timeline: TimelinePoint[], interval: 'hour' | 'day' | 'week' | 'month'): TimelinePoint[] {
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

  private static formatCSVValue(value: any, dateFormat?: string): string {
    if (value === null || value === undefined) {
      return '';
    }

    let strValue = String(value);
    
    // Handle dates
    if (value instanceof Date) {
      strValue = this.formatDate(value, dateFormat || 'ISO');
    }
    
    // Escape CSV special characters
    if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
      strValue = `"${strValue.replace(/"/g, '""')}"`;
    }
    
    return strValue;
  }

  private static formatDate(date: Date, format: string): string {
    switch (format) {
      case 'ISO':
        return date.toISOString();
      case 'locale':
        return date.toLocaleString();
      case 'date-only':
        return date.toISOString().split('T')[0];
      default:
        return date.toISOString();
    }
  }
}