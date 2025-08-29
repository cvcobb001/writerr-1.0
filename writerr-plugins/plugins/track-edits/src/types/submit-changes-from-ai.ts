// Types for submitChangesFromAI() Editorial Engine integration API
// Task 2.2: Platform Integration - TrackEdits Plugin API

import { EditChange, AIProcessingContext } from '../../../../shared/types';

/**
 * Result object returned by submitChangesFromAI() method
 * Provides detailed feedback on the submission process
 */
export interface SubmitChangesFromAIResult {
  /** Whether the submission was successful */
  success: boolean;
  
  /** Session ID where changes were recorded (may be created during submission) */
  sessionId?: string;
  
  /** Array of IDs for all successfully recorded changes */
  changeIds: string[];
  
  /** Array of error messages if submission failed */
  errors: string[];
  
  /** Array of warning messages (non-fatal issues) */
  warnings: string[];
  
  /** Unique group ID if changes were grouped together */
  changeGroupId?: string;
  
  /** Detailed grouping result with metadata */
  groupingResult?: ChangeGroupingResult;
  
  /** Summary of validation performed during submission */
  validationSummary?: {
    totalChanges: number;
    provider: string;
    model: string;
    validationMode: 'Editorial Engine' | 'Standard';
    securityChecksEnabled: boolean;
  };
}

/**
 * Options for submitChangesFromAI() method calls
 * Controls session management, validation, and processing behavior
 */
export interface SubmitChangesFromAIOptions {
  /** Existing session ID to use for recording changes */
  sessionId?: string;
  
  /** Whether to create a new session if none exists */
  createSession?: boolean;
  
  /** Enable strict validation of AI metadata (default: true) */
  strictValidation?: boolean;
  
  /** Bypass all validation checks (use with caution) */
  bypassValidation?: boolean;
  
  /** Enable Editorial Engine-specific validation and features */
  editorialEngineMode?: boolean;
  
  /** Group related changes with a common ID for batch analysis */
  groupChanges?: boolean;
  
  /** Advanced grouping configuration */
  groupingConfig?: Partial<ChangeGroupingConfig>;
  
  /** Editorial operation type for semantic grouping */
  editorialOperation?: EditorialOperationType;
  
  /** Custom operation description (used when editorialOperation is 'custom') */
  customOperationDescription?: string;
  
  /** Conversation context for chat integration */
  conversationContext?: {
    conversationId: string;
    messageId?: string;
    userPrompt?: string;
  };
  
  // Multi-plugin change consolidation options
  
  /** Operation priority for multi-plugin consolidation (1-5, lower = higher priority) */
  priority?: 1 | 2 | 3 | 4 | 5;
  
  /** Whether this is an automated operation (affects priority and user review requirements) */
  automated?: boolean;
  
  /** Force processing even if conflicts are detected */
  forceProcessing?: boolean;
  
  /** Maximum time to wait for consolidation (ms) */
  consolidationTimeout?: number;
  
  /** Enable real-time consolidation with other plugins */
  enableConsolidation?: boolean;
  
  /** Plugins that this operation can be merged with */
  compatiblePlugins?: string[];
  
  /** Conflict resolution preferences */
  conflictResolution?: {
    /** Preferred resolution strategy */
    strategy?: 'auto_merge' | 'priority_wins' | 'user_choice' | 'sequential';
    
    /** Allow semantic merging of changes */
    allowSemanticMerge?: boolean;
    
    /** Maximum overlap tolerance for merging (characters) */
    overlapTolerance?: number;
    
    /** Automatically defer to higher priority operations */
    autoDefer?: boolean;
  };
  
  /** Semantic context for intelligent conflict resolution */
  semanticContext?: {
    /** Primary intention of this operation */
    intention?: 'correction' | 'enhancement' | 'formatting' | 'content_addition' | 'restructuring';
    
    /** Scope of changes */
    scope?: 'word' | 'sentence' | 'paragraph' | 'section' | 'document';
    
    /** Confidence in the semantic analysis (0-1) */
    confidence?: number;
    
    /** Whether formatting should be preserved */
    preserveFormatting?: boolean;
    
    /** Whether content should be preserved */
    preserveContent?: boolean;
  };
  
  /** Maximum number of retry attempts for failed consolidation */
  maxRetries?: number;
}

/**
 * Enhanced AI Processing Context with conversation support
 * Extends base AIProcessingContext with additional metadata
 */
export interface EnhancedAIProcessingContext extends AIProcessingContext {
  /** Unique identifier linking changes to a conversation */
  conversationId?: string;
  
  /** Specific message ID within the conversation */
  messageId?: string;
  
  /** Original user prompt that generated these changes */
  userPrompt?: string;
  
  /** Group ID for batch-related changes */
  changeGroupId?: string;
  
  /** Additional metadata for processing context */
  metadata?: Record<string, any>;
  
  /** Processing settings used to generate changes */
  settings?: Record<string, any>;
}

/**
 * Editorial operation types that determine change grouping behavior
 */
export type EditorialOperationType = 
  | 'copy-edit-pass'           // Comprehensive copy editing
  | 'proofreading'             // Grammar, spelling, punctuation fixes
  | 'developmental-feedback'   // Structural and content suggestions
  | 'style-refinement'         // Voice, tone, and style improvements
  | 'fact-checking'            // Accuracy and verification changes
  | 'formatting'               // Document structure and presentation
  | 'content-expansion'        // Adding details, examples, clarification
  | 'content-reduction'        // Trimming, condensing, removing redundancy
  | 'rewriting'                // Major content restructuring
  | 'custom'                   // User-defined operation type;

/**
 * Change grouping strategy for batching similar edits
 */
export type ChangeGroupingStrategy = 
  | 'proximity'         // Group changes in same paragraph/section
  | 'operation-type'    // Group by editing operation (grammar, style, etc.)
  | 'semantic'          // Group semantically related changes
  | 'time-window'       // Group changes within time period
  | 'mixed'             // Combination of strategies
  | 'none';             // No grouping

/**
 * Metadata for change groups/batches
 */
export interface ChangeGroupMetadata {
  /** Unique identifier for this change group */
  groupId: string;
  
  /** Editorial operation that generated this group */
  operationType: EditorialOperationType;
  
  /** Human-readable description of the operation */
  operationDescription: string;
  
  /** Grouping strategy used to create this batch */
  groupingStrategy: ChangeGroupingStrategy;
  
  /** Timestamp when group was created */
  createdAt: Date;
  
  /** Total number of changes in this group */
  changeCount: number;
  
  /** Document scope of changes (paragraph, section, document) */
  scope: 'paragraph' | 'section' | 'document' | 'selection';
  
  /** Position range this group affects */
  positionRange: {
    start: number;
    end: number;
  };
  
  /** Priority level for review (high priority shown first) */
  priority: 'high' | 'medium' | 'low';
  
  /** Status of the entire group */
  status: 'pending' | 'accepted' | 'rejected' | 'mixed';
  
  /** Writer notes about this group */
  writerNotes?: string;
  
  /** AI confidence level for this group of changes */
  confidenceLevel?: number;
  
  /** Related groups (for hierarchical grouping) */
  parentGroupId?: string;
  childGroupIds?: string[];
}

/**
 * Configuration for automatic change grouping
 */
// Plugin Registration System Types
export interface AIProcessingPlugin {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly author: string;
  readonly description: string;
  readonly capabilities: PluginCapabilities;
  readonly metadata: PluginMetadata;
  readonly apiVersion: string;
}

export interface PluginCapabilities {
  readonly editorialOperations: EditorialOperationType[];
  readonly aiProviders: string[];
  readonly maxBatchSize: number;
  readonly supportsRealTime: boolean;
  readonly supportsConversationContext: boolean;
  readonly supportedFileTypes: string[];
  readonly requiredPermissions: PluginPermission[];
}

export interface PluginMetadata {
  readonly homepage?: string;
  readonly repository?: string;
  readonly documentation?: string;
  readonly license?: string;
  readonly keywords: string[];
  readonly minObsidianVersion?: string;
  readonly securityPolicy?: string;
}

export enum PluginPermission {
  READ_DOCUMENTS = 'read_documents',
  MODIFY_DOCUMENTS = 'modify_documents',
  CREATE_SESSIONS = 'create_sessions',
  ACCESS_VAULT_METADATA = 'access_vault_metadata',
  NETWORK_ACCESS = 'network_access',
  STORAGE_ACCESS = 'storage_access',
  USER_INTERFACE = 'user_interface'
}

export interface PluginRegistration {
  readonly plugin: AIProcessingPlugin;
  readonly registrationTime: Date;
  readonly status: PluginRegistrationStatus;
  readonly securityHash: string;
  readonly validatedCapabilities: PluginCapabilities;
  readonly lastActivity?: Date;
  readonly performanceMetrics?: PluginPerformanceMetrics;
}

export enum PluginRegistrationStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DEACTIVATED = 'deactivated',
  SECURITY_VIOLATION = 'security_violation',
  VERSION_INCOMPATIBLE = 'version_incompatible'
}

export interface PluginPerformanceMetrics {
  readonly totalSubmissions: number;
  readonly successRate: number;
  readonly averageResponseTime: number;
  readonly errorRate: number;
  readonly lastErrorTime?: Date;
  readonly rateLimitViolations: number;
}

export interface PluginAuthenticationContext {
  readonly pluginId: string;
  readonly sessionToken: string;
  readonly permissions: PluginPermission[];
  readonly issuedAt: Date;
  readonly expiresAt: Date;
  readonly requestSignature?: string;
}

export interface PluginValidationResult {
  readonly isValid: boolean;
  readonly errors: string[];
  readonly warnings: string[];
  readonly securityThreats: string[];
  readonly validatedPlugin?: AIProcessingPlugin;
  readonly recommendedPermissions: PluginPermission[];
}

export interface PluginSubmissionOptions extends SubmitChangesFromAIOptions {
  readonly pluginAuthContext: PluginAuthenticationContext;
  readonly pluginCapabilityOverrides?: Partial<PluginCapabilities>;
  readonly pluginMetadata?: Record<string, any>;
}

export interface ChangeGroupingConfig {
  /** Enable automatic grouping */
  enabled: boolean;
  
  /** Default grouping strategy */
  defaultStrategy: ChangeGroupingStrategy;
  
  /** Maximum changes per group */
  maxChangesPerGroup: number;
  
  /** Time window for time-based grouping (milliseconds) */
  timeWindowMs: number;
  
  /** Proximity threshold for position-based grouping (characters) */
  proximityThreshold: number;
  
  /** Minimum changes required to create a group */
  minChangesForGroup: number;
  
  /** Enable hierarchical grouping (groups within groups) */
  enableHierarchicalGrouping: boolean;
  
  /** Operation-specific grouping rules */
  operationGroupingRules: Partial<Record<EditorialOperationType, {
    strategy: ChangeGroupingStrategy;
    maxChangesPerGroup?: number;
    priority?: 'high' | 'medium' | 'low';
  }>>;
}

/**
 * Result of change grouping operation
 */
export interface ChangeGroupingResult {
  /** Successfully created groups */
  groups: ChangeGroupMetadata[];
  
  /** Changes that couldn't be grouped */
  ungroupedChanges: string[];
  
  /** Warnings during grouping process */
  warnings: string[];
  
  /** Grouping statistics */
  statistics: {
    totalChanges: number;
    groupedChanges: number;
    ungroupedChanges: number;
    groupsCreated: number;
    averageGroupSize: number;
  };
}