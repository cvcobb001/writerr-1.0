/**
 * @fileoverview Core types and interfaces for the Writerr Chat mode system
 */

export interface ModeConfig {
  /** Unique identifier for the mode */
  id: string;
  /** Display name for the mode */
  name: string;
  /** Version of the mode definition */
  version: string;
  /** Brief description of what the mode does */
  description: string;
  /** Author of the mode */
  author?: string;
  /** Tags for categorization */
  tags?: string[];
  /** Icon identifier for UI display */
  icon?: string;
  /** Color theme for the mode */
  color?: string;
  /** Whether this mode makes edits to documents */
  makesEdits: boolean;
  /** Track Edits integration settings */
  trackEdits?: TrackEditsConfig;
  /** AI model preferences */
  modelPreferences?: ModelPreferences;
  /** Custom prompt configuration */
  promptConfig: PromptConfig;
  /** Validation rules for input/output */
  validation?: ValidationConfig;
  /** Performance optimization settings */
  performance?: PerformanceConfig;
}

export interface TrackEditsConfig {
  /** Whether to route edits through Track Edits */
  enabled: boolean;
  /** Type of edits this mode makes */
  editType: 'structural' | 'style' | 'grammar' | 'creative' | 'mixed';
  /** Default clustering strategy */
  clusteringStrategy?: 'proximity' | 'category' | 'ml-inspired';
  /** Whether to auto-apply minor edits */
  autoApply?: boolean;
}

export interface ModelPreferences {
  /** Preferred model family */
  preferredModel?: string;
  /** Temperature setting */
  temperature?: number;
  /** Maximum tokens */
  maxTokens?: number;
  /** Top-p sampling */
  topP?: number;
  /** Frequency penalty */
  frequencyPenalty?: number;
  /** Presence penalty */
  presencePenalty?: number;
}

export interface PromptConfig {
  /** System prompt template */
  systemPrompt: string;
  /** User prompt template with placeholders */
  userPromptTemplate: string;
  /** Context injection rules */
  contextInjection: ContextInjectionConfig;
  /** Constraints and guidelines */
  constraints?: string[];
  /** Example interactions */
  examples?: PromptExample[];
}

export interface ContextInjectionConfig {
  /** Whether to include current document content */
  includeDocument: boolean;
  /** Whether to include user selection */
  includeSelection: boolean;
  /** Whether to include vault-wide context */
  includeVaultContext: boolean;
  /** Maximum context length */
  maxContextLength?: number;
  /** Context prioritization strategy */
  prioritization?: 'recency' | 'relevance' | 'proximity' | 'mixed';
}

export interface PromptExample {
  /** Example user input */
  input: string;
  /** Expected AI response */
  output: string;
  /** Context for the example */
  context?: string;
}

export interface ValidationConfig {
  /** Input validation rules */
  input?: ValidationRule[];
  /** Output validation rules */
  output?: ValidationRule[];
  /** Required fields */
  required?: string[];
}

export interface ValidationRule {
  /** Rule identifier */
  id: string;
  /** Rule type */
  type: 'length' | 'pattern' | 'custom';
  /** Rule parameters */
  params: Record<string, any>;
  /** Error message if validation fails */
  message: string;
}

export interface PerformanceConfig {
  /** Whether to cache responses */
  cacheResponses: boolean;
  /** Cache TTL in milliseconds */
  cacheTTL?: number;
  /** Whether to preload this mode */
  preload?: boolean;
  /** Memory usage optimization */
  memoryOptimization?: 'low' | 'balanced' | 'high';
}

export interface ParsedModeFile {
  /** File path */
  filePath: string;
  /** File name without extension */
  fileName: string;
  /** File modification time */
  lastModified: number;
  /** Parsed frontmatter config */
  config: ModeConfig;
  /** Raw content after frontmatter */
  content: string;
  /** Parse errors, if any */
  errors: ParseError[];
  /** Whether the file is valid */
  isValid: boolean;
}

export interface ParseError {
  /** Error type */
  type: 'frontmatter' | 'validation' | 'syntax' | 'schema';
  /** Error message */
  message: string;
  /** Line number if applicable */
  line?: number;
  /** Column number if applicable */
  column?: number;
  /** Severity level */
  severity: 'error' | 'warning' | 'info';
  /** Suggested fix */
  suggestion?: string;
}

export interface ModeRegistry {
  /** Register a new mode */
  register(mode: ParsedModeFile): Promise<void>;
  /** Unregister a mode */
  unregister(modeId: string): Promise<void>;
  /** Get a mode by ID */
  getMode(modeId: string): ParsedModeFile | null;
  /** List all registered modes */
  listModes(): ParsedModeFile[];
  /** Get modes by category/tag */
  getModesByTag(tag: string): ParsedModeFile[];
  /** Reload a mode from file */
  reloadMode(modeId: string): Promise<void>;
  /** Validate mode dependencies */
  validateDependencies(mode: ParsedModeFile): Promise<ValidationResult>;
}

export interface ValidationResult {
  /** Whether validation passed */
  isValid: boolean;
  /** Validation errors */
  errors: ParseError[];
  /** Validation warnings */
  warnings: ParseError[];
}

export interface ModeLoadEvent {
  /** Event type */
  type: 'mode-loaded' | 'mode-unloaded' | 'mode-error' | 'mode-updated';
  /** Mode ID */
  modeId: string;
  /** Mode data */
  mode?: ParsedModeFile;
  /** Error information */
  error?: ParseError;
  /** Timestamp */
  timestamp: number;
}

export interface ModeTemplate {
  /** Template identifier */
  id: string;
  /** Template name */
  name: string;
  /** Template description */
  description: string;
  /** Template category */
  category: 'editing' | 'creative' | 'analysis' | 'conversation' | 'custom';
  /** Template content */
  content: string;
  /** Required variables */
  variables: TemplateVariable[];
}

export interface TemplateVariable {
  /** Variable name */
  name: string;
  /** Variable type */
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect';
  /** Variable description */
  description: string;
  /** Default value */
  default?: any;
  /** Options for select types */
  options?: string[];
  /** Whether variable is required */
  required: boolean;
  /** Validation pattern */
  pattern?: string;
}

export interface HotReloadConfig {
  /** Whether hot reload is enabled */
  enabled: boolean;
  /** Debounce delay in milliseconds */
  debounceDelay: number;
  /** File patterns to watch */
  watchPatterns: string[];
  /** Whether to preserve active sessions */
  preserveSessions: boolean;
  /** Max number of retries on reload failure */
  maxRetries: number;
}

export interface SessionContext {
  /** Session identifier */
  sessionId: string;
  /** Current mode ID */
  currentModeId: string;
  /** Session history */
  history: SessionMessage[];
  /** Session metadata */
  metadata: Record<string, any>;
  /** Document context */
  documentContext?: DocumentContext;
}

export interface SessionMessage {
  /** Message ID */
  id: string;
  /** Message type */
  type: 'user' | 'assistant' | 'system';
  /** Message content */
  content: string;
  /** Timestamp */
  timestamp: number;
  /** Mode used for this message */
  modeId: string;
  /** Associated document context */
  context?: DocumentContext;
}

export interface DocumentContext {
  /** Document path */
  filePath: string;
  /** Document content */
  content: string;
  /** Selected text */
  selection?: TextSelection;
  /** Cursor position */
  cursor?: CursorPosition;
  /** Document metadata */
  metadata: Record<string, any>;
}

export interface TextSelection {
  /** Start position */
  start: number;
  /** End position */
  end: number;
  /** Selected text */
  text: string;
  /** Line and column information */
  position: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
}

export interface CursorPosition {
  /** Character position */
  position: number;
  /** Line and column */
  line: number;
  column: number;
}