// Editorial Engine Core Types

export interface IntakePayload {
  id: string;
  timestamp: number;
  sessionId: string;
  instructions: string;
  sourceText: string;
  mode: string;
  context: ProcessingContext;
  preferences: UserPreferences;
  metadata: Record<string, any>;
}

export interface ProcessingContext {
  documentPath: string;
  selectionRange?: { start: number; end: number };
  surroundingText?: string;
  documentMetadata?: Record<string, any>;
  userHistory?: UserAction[];
}

export interface UserPreferences {
  preferredStyle?: string;
  constraints?: string[];
  customRules?: Record<string, any>;
}

export interface UserAction {
  type: string;
  timestamp: number;
  data: any;
}

export interface JobResult {
  id: string;
  intakeId: string;
  success: boolean;
  processingTime: number;
  changes: Change[];
  conflicts: ChangeConflict[];
  provenance: ProvenanceChain;
  summary: ExecutionSummary;
  metadata: Record<string, any>;
}

export interface Change {
  id: string;
  type: 'insert' | 'delete' | 'replace' | 'annotate';
  range: { start: number; end: number };
  originalText: string;
  newText: string;
  confidence: number;
  reasoning: string;
  source: string;
  timestamp: number;
}

export interface ChangeConflict {
  id: string;
  type: string;
  description: string;
  affectedChanges: string[];
  resolution?: string;
}

export interface ProvenanceChain {
  steps: ProvenanceStep[];
  totalTime: number;
}

export interface ProvenanceStep {
  stage: string;
  input: any;
  output: any;
  processingTime: number;
  adapter?: string;
}

export interface ExecutionSummary {
  totalChanges: number;
  changeSummary: Record<string, number>;
  confidence: number;
  warnings: string[];
}

// Mode System Types
export interface ModeDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  naturalLanguageRules: {
    allowed: string[];      // "Fix spelling and grammar errors"
    forbidden: string[];    // "Never change the author's voice"
    focus: string[];        // "Focus on clarity and flow"
    boundaries: string[];   // "Change no more than 15% of words"
  };
  examples: ModeExample[];
  constraints: CompiledConstraint[];
  metadata: {
    category: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    tags: string[];
    useCase: string;
  };
}

export interface ModeExample {
  input: string;
  expectedBehavior: string;
  shouldNotDo: string;
  explanation: string;
}

export interface CompiledConstraint {
  type: ConstraintType;
  parameters: Record<string, any>;
  priority: number;
  validation: ValidationRule[];
}

export enum ConstraintType {
  LENGTH_LIMIT = 'length_limit',
  PRESERVE_TONE = 'preserve_tone',
  GRAMMAR_ONLY = 'grammar_only',
  NO_CONTENT_CHANGE = 'no_content_change',
  STYLE_CONSISTENCY = 'style_consistency'
}

export interface ValidationRule {
  type: string;
  condition: string;
  message: string;
}

// Adapter System Types
export interface EngineAdapter {
  name: string;
  version: string;
  supportedOperations: OperationType[];
  capabilities: AdapterCapabilities;
  
  initialize(config: AdapterConfig): Promise<void>;
  execute(job: ExecutionJob): Promise<EngineResult>;
  cleanup(): Promise<void>;
  
  // Health and monitoring
  getStatus(): AdapterStatus;
  getMetrics(): AdapterMetrics;
}

export interface ExecutionJob {
  id: string;
  type: OperationType;
  payload: any;
  constraints: CompiledConstraint[];
  context: ProcessingContext;
  timeout: number;
}

export interface EngineResult {
  jobId: string;
  success: boolean;
  data: any;
  metadata: Record<string, any>;
  processingTime: number;
  errors?: Error[];
}

export enum OperationType {
  TEXT_EDIT = 'text_edit',
  GRAMMAR_CHECK = 'grammar_check',
  STYLE_ENHANCE = 'style_enhance',
  SUMMARIZE = 'summarize',
  ANNOTATE = 'annotate'
}

export interface AdapterCapabilities {
  maxTextLength: number;
  supportsBatch: boolean;
  supportsStreaming: boolean;
  confidenceScoring: boolean;
}

export interface AdapterConfig {
  [key: string]: any;
}

export interface AdapterStatus {
  healthy: boolean;
  lastCheck: number;
  responseTime?: number;
  error?: string;
}

export interface AdapterMetrics {
  totalRequests: number;
  successRate: number;
  avgResponseTime: number;
  errorCount: number;
}

// Processing Pipeline Types
export interface ProcessingIntent {
  type: string;
  confidence: number;
  parameters: Record<string, any>;
}

export interface ExecutionRuleset {
  constraints: CompiledConstraint[];
  validationRules: ValidationRule[];
  executionParams: ExecutionParameters;
  compiledAt: number;
}

export interface ExecutionParameters {
  timeout: number;
  maxRetries: number;
  preferredAdapters: string[];
  fallbackStrategy: string;
}

export interface CompiledRuleset {
  constraints: CompiledConstraint[];
  validationRules: ValidationRule[];
  executionParams: ExecutionParameters;
  compiledAt: number;
}

export interface ParsedRule {
  type: string;
  intent: string;
  confidence: number;
  parameters: Record<string, any>;
}

export interface NaturalLanguageRules {
  allowed: string[];
  forbidden: string[];
  focus: string[];
  boundaries: string[];
}

// Event System Types
export interface EditorialEngineEvent {
  type: string;
  data: any;
  timestamp: number;
  source: string;
}

// Settings Types
export interface EditorialEngineSettings {
  version: string;
  enabledModes: string[];
  defaultMode: string;
  constraintValidation: {
    strictMode: boolean;
    maxProcessingTime: number;
    memoryLimits: {
      maxRulesetSize: number;
      maxConcurrentJobs: number;
    };
  };
  adapters: {
    [adapterName: string]: {
      enabled: boolean;
      config: Record<string, any>;
      priority: number;
    };
  };
  performance: {
    enableCaching: boolean;
    cacheSize: number;
    backgroundProcessing: boolean;
  };
}