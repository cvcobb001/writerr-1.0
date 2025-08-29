/**
 * Query system exports for EditChange filtering and analysis
 * Task 1.6: Create utility methods for querying changes by AI provider or processing context
 */

export { EditChangeQuerySystem } from './edit-change-query-system';
export { QueryBuilderImpl } from './query-builder';
export { QueryUtils } from './query-utils';

export type {
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