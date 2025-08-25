/**
 * @fileoverview Core types for AI Editorial Functions plugin
 */

export interface FunctionMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  category: 'copy-editor' | 'proofreader' | 'developmental-editor' | 'co-writer' | 'custom';
  capabilities: string[];
  dependencies: string[];
  constraints?: FunctionConstraints;
  trackEditsConfig?: TrackEditsConfig;
  priority?: number;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FunctionConstraints {
  forbiddenPhrases?: string[];
  forbiddenActions?: string[];
  maxOutputLength?: number;
  minConfidenceScore?: number;
  requiredSchemas?: string[];
  executionTimeout?: number;
  memoryLimit?: number;
}

export interface TrackEditsConfig {
  batchingStrategy: 'immediate' | 'batch' | 'defer';
  clusterStrategy: 'sentence' | 'paragraph' | 'section' | 'none';
  confidenceThreshold: number;
  changeCategories: string[];
  requiresReview: boolean;
}

export interface FunctionDefinition extends FunctionMetadata {
  filePath: string;
  fileType: 'md' | 'xml';
  content: string;
  parsedContent: ParsedFunctionContent;
  hash: string; // For change detection
  loadedAt: Date;
}

export interface ParsedFunctionContent {
  systemPrompt: string;
  userPrompt?: string;
  examples?: FunctionExample[];
  schema?: any; // JSON schema for validation
  preprocessing?: string;
  postprocessing?: string;
}

export interface FunctionExample {
  input: string;
  expectedOutput: string;
  explanation?: string;
}

export interface FunctionExecution {
  id: string;
  functionId: string;
  input: string;
  output?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'timeout';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  confidence?: number;
  error?: string;
  metadata?: any;
}

export interface FunctionVersion {
  version: string;
  definition: FunctionDefinition;
  timestamp: Date;
  isActive: boolean;
  rollbackReason?: string;
}

export interface FunctionLoadResult {
  success: boolean;
  function?: FunctionDefinition;
  errors: string[];
  warnings: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  score?: number;
}

export interface WatchEvent {
  type: 'created' | 'modified' | 'deleted' | 'moved';
  filePath: string;
  timestamp: Date;
  metadata?: any;
}

export interface RegistryStats {
  totalFunctions: number;
  loadedFunctions: number;
  activeFunctions: number;
  errorFunctions: number;
  memoryUsage: number;
  lastUpdate: Date;
}

export interface DependencyGraph {
  [functionId: string]: {
    dependencies: string[];
    dependents: string[];
    resolved: boolean;
    circular: boolean;
  };
}

// Events
export interface FunctionRegistryEvent {
  type: 'function-loaded' | 'function-unloaded' | 'function-updated' | 'function-error' | 'function-executed';
  functionId: string;
  metadata?: any;
  timestamp: Date;
}

// Configuration
export interface RegistryConfig {
  watchPaths: string[];
  fileExtensions: string[];
  hotReloadEnabled: boolean;
  validationEnabled: boolean;
  maxConcurrentExecutions: number;
  executionTimeout: number;
  memoryLimit: number;
  autoCleanup: boolean;
  debugMode: boolean;
}

// Lifecycle types
export interface LifecycleEvent {
  type: 'lifecycle-started' | 'lifecycle-stopped' | 'function-lifecycle' | 'lifecycle-error';
  functionId?: string;
  state?: LifecycleState;
  data?: any;
  timestamp: Date;
}

export interface LifecycleState {
  phase: 'loading' | 'validating' | 'loaded' | 'executing' | 'unloading' | 'error';
  progress?: number;
  message?: string;
  error?: string;
}

export interface LifecycleError extends Error {
  functionId?: string;
  phase: string;
  recoverable: boolean;
}

// Error types
export class FunctionLoadError extends Error {
  constructor(
    message: string,
    public functionId: string,
    public filePath: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'FunctionLoadError';
  }
}

export class FunctionExecutionError extends Error {
  constructor(
    message: string,
    public functionId: string,
    public executionId: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'FunctionExecutionError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public functionId: string,
    public validationErrors: string[]
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}