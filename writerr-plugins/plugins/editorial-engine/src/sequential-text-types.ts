/**
 * Type definitions for Sequential Text Processing
 * Million Monkeys Typing implementation
 */

export interface TextChange {
  type: 'insert' | 'delete' | 'replace';
  startIndex: number;
  endIndex: number;
  originalText: string;
  newText: string;
}

export interface SequentialOperation {
  type: 'insert' | 'delete' | 'replace';
  position: number;
  text: string;
  delay: number;
}

export interface TextChunk {
  type: 'insert' | 'delete' | 'replace';
  text: string;
  breaksMidWord: boolean;
  respectsPunctuation: boolean;
}

export interface SequentialTextConfig {
  delayMs?: number;
  chunkStrategy?: 'character' | 'word-boundary';
  performanceTarget?: number;
  maxOperations?: number;
}

export interface PerformanceMetrics {
  lastExecutionTime: number;
  memoryUsage: number;
  operationCount: number;
  averageDelayActual: number;
  cacheHitRate?: number;
}

export interface EditorInterface {
  replaceRange(newText: string, from: EditorPosition, to?: EditorPosition): void;
  getCursor(): EditorPosition;
  getValue(): string;
  setValue(text: string): void;
}

export interface EditorPosition {
  line: number;
  ch: number;
}

export interface DiffResult {
  changes: TextChange[];
  totalChanges: number;
  complexity: number;
}

export interface ChunkingOptions {
  respectWordBoundaries: boolean;
  respectPunctuationBoundaries: boolean;
  maxChunkSize: number;
  minChunkSize: number;
}

export interface HumanTypingSimulation {
  originalText: string;
  targetText: string;
  operations: SequentialOperation[];
  estimatedDuration: number;
  performanceMetrics?: PerformanceMetrics;
}

export type ChunkingStrategy = 'character' | 'word-boundary' | 'smart-boundary';

export type PerformanceLevel = 'fast' | 'balanced' | 'thorough';

export interface SequentialTextProcessorOptions extends SequentialTextConfig {
  enableCaching?: boolean;
  debugMode?: boolean;
  fallbackOnError?: boolean;
  performanceLevel?: PerformanceLevel;
}