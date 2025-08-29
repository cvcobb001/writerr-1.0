/**
 * Event Bus Integration Layer for Track Edits Plugin
 * 
 * Provides comprehensive event bus connection management, health monitoring,
 * and cross-plugin coordination for the Writerr Platform ecosystem.
 * 
 * @fileoverview Event bus integration with connection management and error handling
 * @version 1.0.0
 */

// ============================================================================
// Event Schema Definitions
// ============================================================================

/**
 * Base interface for all Writerr platform events
 */
export interface WriterrlEventBase {
  eventId: string;
  timestamp: number;
  sourcePlugin: string;
  targetPlugins?: string[];
  sessionId?: string;
  documentId?: string;
}

/**
 * Change events for AI processing notifications
 */
export interface WriterrlChangeEvent extends WriterrlEventBase {
  type: 'change.ai.start' | 'change.ai.complete' | 'change.ai.error' | 'change.batch.created' | 'change.batch.processed';
  payload: {
    changeIds: string[];
    aiProvider?: string;
    aiModel?: string;
    operationType?: string;
    batchId?: string;
    errorDetails?: any;
    processingMetadata?: any;
  };
}

/**
 * Document events for multi-plugin editing coordination
 */
export interface WriterrlDocumentEvent extends WriterrlEventBase {
  type: 'document.edit.start' | 'document.edit.complete' | 'document.focus.changed' | 'document.save.before' | 'document.save.after';
  payload: {
    documentPath: string;
    editorView?: any;
    fileModified?: boolean;
    activeView?: string;
    editMetadata?: {
      source: string;
      editCount: number;
      timestamp: number;
    };
  };
}

/**
 * Session events for cross-plugin synchronization
 */
export interface WriterrlSessionEvent extends WriterrlEventBase {
  type: 'session.created' | 'session.ended' | 'session.paused' | 'session.resumed' | 'session.exported';
  payload: {
    sessionData: any;
    participants: string[];
    syncState?: 'active' | 'paused' | 'ended';
    exportFormat?: string;
    exportPath?: string;
  };
}

/**
 * Error events for platform-wide error handling
 */
export interface WriterrlErrorEvent extends WriterrlEventBase {
  type: 'error.plugin.failure' | 'error.system.critical' | 'error.recovery.attempted' | 'error.recovery.completed';
  payload: {
    errorType: string;
    errorMessage: string;
    errorStack?: string;
    recoveryAction?: string;
    affectedFeatures: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
  };
}

// ============================================================================
// COMPREHENSIVE STANDARDIZED EVENT SCHEMAS FOR PLATFORM-WIDE COORDINATION
// ============================================================================

/**
 * Event Schema Version for backward compatibility
 */
export const WRITERR_EVENT_SCHEMA_VERSION = '1.0.0';

/**
 * Event priority levels for coordination needs
 */
export enum EventPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3
}

/**
 * Event persistence requirements for offline synchronization
 */
export enum EventPersistence {
  NONE = 'none',           // No persistence needed
  SESSION = 'session',     // Persist for current session only
  OFFLINE = 'offline',     // Persist for offline sync
  PERMANENT = 'permanent'  // Permanent audit trail
}

/**
 * Enhanced base interface with versioning and metadata
 */
export interface WriterrlEventBaseV2 extends WriterrlEventBase {
  /** Schema version for backward compatibility */
  schemaVersion: string;
  
  /** Event priority for processing order */
  priority: EventPriority;
  
  /** Persistence requirements */
  persistence: EventPersistence;
  
  /** Event metadata for routing and debugging */
  metadata: {
    /** Correlation ID for tracking related events */
    correlationId?: string;
    
    /** Parent event ID for event chains */
    parentEventId?: string;
    
    /** Event sequence number within a workflow */
    sequenceNumber?: number;
    
    /** Custom routing hints */
    routingHints?: string[];
    
    /** Debug information */
    debug?: {
      sourceLocation?: string;
      stackTrace?: string;
      performanceMetrics?: Record<string, number>;
    };
  };
  
  /** Event expiration timestamp */
  expiresAt?: number;
  
  /** Retry count for error recovery */
  retryCount?: number;
}

// ============================================================================
// AI PROCESSING LIFECYCLE EVENTS
// ============================================================================

export interface AIProcessingStartEvent extends WriterrlEventBaseV2 {
  type: 'ai.processing.start';
  payload: {
    /** Processing operation details */
    operation: {
      type: EditorialOperationType;
      provider: string;
      model: string;
      requestId: string;
    };
    
    /** Input context */
    input: {
      documentId: string;
      content: string;
      userPrompt: string;
      constraints?: string[];
    };
    
    /** Processing configuration */
    config: {
      expectedDuration?: number;
      maxRetries: number;
      timeoutMs: number;
      batchSize?: number;
    };
    
    /** Plugin context */
    pluginContext: {
      sourcePluginId: string;
      sourcePluginVersion: string;
      processingCapabilities: string[];
    };
  };
}

export interface AIProcessingProgressEvent extends WriterrlEventBaseV2 {
  type: 'ai.processing.progress';
  payload: {
    /** Reference to original request */
    requestId: string;
    
    /** Progress information */
    progress: {
      percentage: number;
      stage: string;
      estimatedTimeRemaining?: number;
      currentOperation?: string;
    };
    
    /** Intermediate results */
    partialResults?: {
      processedCount: number;
      totalCount: number;
      previewChanges?: any[];
    };
    
    /** Performance metrics */
    metrics: {
      tokensProcessed: number;
      responseTime: number;
      memoryUsage: number;
    };
  };
}

export interface AIProcessingCompleteEvent extends WriterrlEventBaseV2 {
  type: 'ai.processing.complete';
  payload: {
    /** Reference to original request */
    requestId: string;
    
    /** Processing results */
    results: {
      changeIds: string[];
      changeGroupId?: string;
      summary: string;
      confidence: number;
      appliedConstraints: string[];
    };
    
    /** Final metrics */
    metrics: {
      totalTokens: number;
      processingTime: number;
      qualityScore: number;
      constraintCompliance: number;
    };
    
    /** Next action recommendations */
    recommendations?: {
      suggestedReview: boolean;
      recommendedBatching?: string;
      followupActions?: string[];
    };
  };
}

export interface AIProcessingErrorEvent extends WriterrlEventBaseV2 {
  type: 'ai.processing.error';
  payload: {
    /** Reference to original request */
    requestId: string;
    
    /** Error details */
    error: {
      type: string;
      message: string;
      code?: string;
      stack?: string;
      recoverability: 'recoverable' | 'non-recoverable';
    };
    
    /** Context at time of error */
    context: {
      stage: string;
      partialResults?: any[];
      resourceUsage: Record<string, number>;
    };
    
    /** Recovery options */
    recovery: {
      automaticRetryAvailable: boolean;
      manualInterventionRequired: boolean;
      suggestedActions: string[];
      fallbackOptions?: string[];
    };
  };
}

// ============================================================================
// DOCUMENT CHANGE EVENTS WITH DETAILED ATTRIBUTION
// ============================================================================

export interface DocumentChangeStartEvent extends WriterrlEventBaseV2 {
  type: 'document.change.start';
  payload: {
    /** Document information */
    document: {
      id: string;
      path: string;
      title: string;
      contentHash: string;
    };
    
    /** Change context */
    changeContext: {
      initiatingPlugin: string;
      changeType: 'ai-assisted' | 'manual' | 'collaborative';
      userIntent: string;
      scopeDescription: string;
    };
    
    /** Pre-change state */
    beforeState: {
      wordCount: number;
      characterCount: number;
      lastModified: number;
      checksum: string;
    };
  };
}

export interface DocumentChangeAppliedEvent extends WriterrlEventBaseV2 {
  type: 'document.change.applied';
  payload: {
    /** Change details */
    change: {
      id: string;
      type: string;
      range: { start: number; end: number };
      originalText: string;
      newText: string;
      confidence: number;
    };
    
    /** Attribution */
    attribution: {
      source: 'ai' | 'user' | 'system';
      aiProvider?: string;
      aiModel?: string;
      userSession?: string;
      pluginId: string;
      timestamp: number;
    };
    
    /** Context */
    context: {
      reason: string;
      constraints: string[];
      qualityMetrics: Record<string, number>;
      reviewRequired: boolean;
    };
  };
}

export interface DocumentChangeBatchedEvent extends WriterrlEventBaseV2 {
  type: 'document.change.batched';
  payload: {
    /** Batch information */
    batch: {
      id: string;
      changeIds: string[];
      groupingStrategy: string;
      totalChanges: number;
    };
    
    /** Batch context */
    context: {
      documentId: string;
      userPrompt: string;
      processingTime: number;
      batchingReason: string;
    };
    
    /** Batch metrics */
    metrics: {
      avgConfidence: number;
      totalTextChanged: number;
      impactScope: string[];
    };
  };
}

export interface DocumentChangeRevertedEvent extends WriterrlEventBaseV2 {
  type: 'document.change.reverted';
  payload: {
    /** Reversion details */
    reversion: {
      changeIds: string[];
      revertedAt: number;
      revertReason: string;
      triggeredBy: 'user' | 'system' | 'plugin';
    };
    
    /** Impact assessment */
    impact: {
      documentId: string;
      affectedText: string;
      dependentChanges: string[];
      recoveryActions: string[];
    };
  };
}

// ============================================================================
// SESSION MANAGEMENT EVENTS FOR CROSS-PLUGIN SYNCHRONIZATION
// ============================================================================

export interface SessionLifecycleEvent extends WriterrlEventBaseV2 {
  type: 'session.created' | 'session.resumed' | 'session.paused' | 'session.ended';
  payload: {
    /** Session details */
    session: {
      id: string;
      type: 'editing' | 'reviewing' | 'collaborative';
      ownerId: string;
      participants: string[];
      createdAt: number;
    };
    
    /** Session state */
    state: {
      activeDocuments: string[];
      pluginStates: Record<string, any>;
      syncStatus: 'active' | 'paused' | 'syncing' | 'error';
      lastSyncAt?: number;
    };
    
    /** Context */
    context: {
      triggeredBy: string;
      reason: string;
      previousState?: string;
      expectedDuration?: number;
    };
  };
}

export interface SessionSynchronizationEvent extends WriterrlEventBaseV2 {
  type: 'session.sync.start' | 'session.sync.complete' | 'session.sync.conflict';
  payload: {
    /** Sync operation */
    sync: {
      sessionId: string;
      syncId: string;
      participants: string[];
      syncScope: string[];
    };
    
    /** Sync data */
    data: {
      changesSynced?: number;
      conflictsDetected?: number;
      resolutionStrategy?: string;
      syncedAt: number;
    };
    
    /** Conflict details (if applicable) */
    conflicts?: {
      type: string;
      affectedDocuments: string[];
      resolutionOptions: string[];
      autoResolved: boolean;
    }[];
  };
}

// ============================================================================
// PLUGIN LIFECYCLE EVENTS FOR COORDINATION AND HEALTH MONITORING
// ============================================================================

export interface PluginLifecycleEvent extends WriterrlEventBaseV2 {
  type: 'plugin.registered' | 'plugin.activated' | 'plugin.deactivated' | 'plugin.unregistered';
  payload: {
    /** Plugin information */
    plugin: {
      id: string;
      name: string;
      version: string;
      type: 'core' | 'editorial' | 'ui' | 'integration';
      capabilities: string[];
    };
    
    /** Lifecycle context */
    lifecycle: {
      previousState?: string;
      newState: string;
      reason: string;
      triggeredBy: 'system' | 'user' | 'dependency';
    };
    
    /** Dependencies */
    dependencies: {
      requiredPlugins: string[];
      optionalPlugins: string[];
      conflicts: string[];
    };
    
    /** Health information */
    health: {
      status: 'healthy' | 'warning' | 'error';
      lastCheck: number;
      metrics: Record<string, number>;
      issues: string[];
    };
  };
}

export interface PluginHealthEvent extends WriterrlEventBaseV2 {
  type: 'plugin.health.check' | 'plugin.health.warning' | 'plugin.health.error' | 'plugin.health.recovered';
  payload: {
    /** Plugin identification */
    pluginId: string;
    
    /** Health details */
    health: {
      status: 'healthy' | 'warning' | 'error' | 'critical';
      checkedAt: number;
      checkType: 'periodic' | 'triggered' | 'startup';
      previousStatus?: string;
    };
    
    /** Metrics */
    metrics: {
      memoryUsage: number;
      cpuUsage: number;
      responseTime: number;
      errorRate: number;
      uptime: number;
    };
    
    /** Issues */
    issues: {
      type: string;
      severity: 'info' | 'warning' | 'error' | 'critical';
      message: string;
      suggestedAction?: string;
    }[];
    
    /** Recovery information */
    recovery?: {
      attemptedAt: number;
      successful: boolean;
      strategy: string;
      nextCheck: number;
    };
  };
}

// ============================================================================
// PLATFORM-WIDE ERROR AND RECOVERY EVENTS
// ============================================================================

export interface PlatformErrorEvent extends WriterrlEventBaseV2 {
  type: 'platform.error.system' | 'platform.error.integration' | 'platform.error.data';
  payload: {
    /** Error classification */
    error: {
      category: 'system' | 'integration' | 'data' | 'security' | 'performance';
      severity: 'low' | 'medium' | 'high' | 'critical';
      code: string;
      message: string;
      stack?: string;
    };
    
    /** Affected scope */
    impact: {
      affectedPlugins: string[];
      affectedFeatures: string[];
      affectedDocuments: string[];
      userImpact: 'none' | 'minor' | 'major' | 'blocking';
    };
    
    /** Context */
    context: {
      operationInProgress?: string;
      userAction?: string;
      systemState: Record<string, any>;
      environmentInfo: Record<string, string>;
    };
    
    /** Diagnostics */
    diagnostics: {
      errorId: string;
      reportedAt: number;
      reportedBy: string;
      reproductionSteps?: string[];
      logContext?: string;
    };
  };
}

export interface PlatformRecoveryEvent extends WriterrlEventBaseV2 {
  type: 'platform.recovery.initiated' | 'platform.recovery.progress' | 'platform.recovery.complete' | 'platform.recovery.failed';
  payload: {
    /** Recovery operation */
    recovery: {
      id: string;
      errorId: string;
      strategy: string;
      initiatedBy: 'system' | 'user' | 'plugin';
      initiatedAt: number;
    };
    
    /** Recovery progress */
    progress?: {
      stage: string;
      percentage: number;
      estimatedTimeRemaining?: number;
      completedSteps: string[];
      currentStep: string;
    };
    
    /** Recovery results */
    result?: {
      successful: boolean;
      restoredFeatures: string[];
      remainingIssues: string[];
      dataIntegrity: 'verified' | 'partial' | 'compromised';
    };
    
    /** Post-recovery state */
    postRecovery?: {
      systemStatus: 'operational' | 'degraded' | 'offline';
      pluginStatuses: Record<string, string>;
      recommendedActions: string[];
      monitoringEnabled: boolean;
    };
  };
}

// ============================================================================
// WORKFLOW COORDINATION EVENTS
// ============================================================================

export interface WorkflowEvent extends WriterrlEventBaseV2 {
  type: 'workflow.started' | 'workflow.step.complete' | 'workflow.complete' | 'workflow.cancelled';
  payload: {
    /** Workflow identification */
    workflow: {
      id: string;
      name: string;
      type: 'chat-to-editorial' | 'editorial-to-track' | 'collaborative-edit';
      initiator: string;
    };
    
    /** Workflow context */
    context: {
      documentId: string;
      sessionId?: string;
      participantPlugins: string[];
      startedAt: number;
      expectedSteps: string[];
    };
    
    /** Current step (if applicable) */
    currentStep?: {
      name: string;
      status: 'pending' | 'in-progress' | 'complete' | 'error';
      assignedPlugin: string;
      startedAt: number;
      data?: any;
    };
    
    /** Workflow results (if complete) */
    results?: {
      totalSteps: number;
      completedSteps: number;
      duration: number;
      artifacts: string[];
      success: boolean;
    };
  };
}

// ============================================================================
// UPDATED UNION TYPE WITH NEW EVENTS
// ============================================================================

export type WriterrlEventV2 = 
  // AI Processing Events
  | AIProcessingStartEvent
  | AIProcessingProgressEvent  
  | AIProcessingCompleteEvent
  | AIProcessingErrorEvent
  
  // Document Change Events
  | DocumentChangeStartEvent
  | DocumentChangeAppliedEvent
  | DocumentChangeBatchedEvent
  | DocumentChangeRevertedEvent
  
  // Session Management Events
  | SessionLifecycleEvent
  | SessionSynchronizationEvent
  
  // Plugin Lifecycle Events
  | PluginLifecycleEvent
  | PluginHealthEvent
  
  // Platform Error and Recovery Events
  | PlatformErrorEvent
  | PlatformRecoveryEvent
  
  // Workflow Coordination Events
  | WorkflowEvent
  
  // Legacy events (for backward compatibility)
  | WriterrlChangeEvent
  | WriterrlDocumentEvent
  | WriterrlSessionEvent
  | WriterrlErrorEvent;

// ============================================================================
// EVENT CREATION HELPERS
// ============================================================================

export class WriterrlEventFactory {
  static createBaseEvent(
    type: string,
    sourcePlugin: string,
    priority: EventPriority = EventPriority.NORMAL,
    persistence: EventPersistence = EventPersistence.SESSION
  ): Omit<WriterrlEventBaseV2, 'type' | 'payload'> {
    return {
      eventId: this.generateEventId(),
      timestamp: Date.now(),
      sourcePlugin,
      schemaVersion: WRITERR_EVENT_SCHEMA_VERSION,
      priority,
      persistence,
      metadata: {
        correlationId: this.generateCorrelationId(),
      },
    };
  }
  
  static generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  static generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  static createAIProcessingStartEvent(
    sourcePlugin: string,
    operation: any,
    input: any,
    config: any,
    pluginContext: any
  ): AIProcessingStartEvent {
    return {
      ...this.createBaseEvent('ai.processing.start', sourcePlugin, EventPriority.HIGH),
      type: 'ai.processing.start',
      payload: { operation, input, config, pluginContext },
    };
  }
  
  static createDocumentChangeAppliedEvent(
    sourcePlugin: string,
    change: any,
    attribution: any,
    context: any
  ): DocumentChangeAppliedEvent {
    return {
      ...this.createBaseEvent('document.change.applied', sourcePlugin, EventPriority.NORMAL, EventPersistence.PERMANENT),
      type: 'document.change.applied',
      payload: { change, attribution, context },
    };
  }
  
  static createWorkflowEvent(
    type: WorkflowEvent['type'],
    sourcePlugin: string,
    workflow: any,
    context: any,
    currentStep?: any,
    results?: any
  ): WorkflowEvent {
    return {
      ...this.createBaseEvent(type, sourcePlugin, EventPriority.HIGH),
      type,
      payload: { workflow, context, currentStep, results },
    };
  }
}

// ============================================================================
// EVENT VALIDATION UTILITIES
// ============================================================================

export interface EventValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class WriterrlEventValidator {
  static validateEvent(event: any): EventValidationResult {
    const result: EventValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };
    
    // Basic structure validation
    if (!event.eventId) {
      result.errors.push('Missing eventId');
      result.valid = false;
    }
    
    if (!event.timestamp) {
      result.errors.push('Missing timestamp');
      result.valid = false;
    }
    
    if (!event.sourcePlugin) {
      result.errors.push('Missing sourcePlugin');
      result.valid = false;
    }
    
    if (!event.type) {
      result.errors.push('Missing event type');
      result.valid = false;
    }
    
    // Schema version validation
    if (event.schemaVersion && event.schemaVersion !== WRITERR_EVENT_SCHEMA_VERSION) {
      result.warnings.push(`Schema version mismatch: expected ${WRITERR_EVENT_SCHEMA_VERSION}, got ${event.schemaVersion}`);
    }
    
    // Priority validation
    if (event.priority !== undefined && !Object.values(EventPriority).includes(event.priority)) {
      result.errors.push('Invalid priority value');
      result.valid = false;
    }
    
    // Persistence validation
    if (event.persistence && !Object.values(EventPersistence).includes(event.persistence)) {
      result.errors.push('Invalid persistence value');
      result.valid = false;
    }
    
    // Payload validation
    if (!event.payload) {
      result.errors.push('Missing payload');
      result.valid = false;
    }
    
    return result;
  }
  
  static sanitizeEvent(event: any): any {
    // Remove sensitive data and ensure safe serialization
    const sanitized = { ...event };
    
    // Remove potential sensitive information from debug metadata
    if (sanitized.metadata?.debug?.stackTrace) {
      sanitized.metadata.debug.stackTrace = '[REDACTED]';
    }
    
    // Ensure all required fields are present with defaults
    if (!sanitized.schemaVersion) {
      sanitized.schemaVersion = WRITERR_EVENT_SCHEMA_VERSION;
    }
    
    if (!sanitized.priority) {
      sanitized.priority = EventPriority.NORMAL;
    }
    
    if (!sanitized.persistence) {
      sanitized.persistence = EventPersistence.SESSION;
    }
    
    if (!sanitized.metadata) {
      sanitized.metadata = {};
    }
    
    return sanitized;
  }
}

/**
 * Union type for all Writerrl platform events
 */
export type WriterrlEvent = WriterrlChangeEvent | WriterrlDocumentEvent | WriterrlSessionEvent | WriterrlErrorEvent;

/**
 * Event handler function type
 */
export type WriterrlEventHandler = (event: WriterrlEvent) => void | Promise<void>;

/**
 * Event subscription options
 */
export interface EventSubscriptionOptions {
  once?: boolean;
  filter?: (event: WriterrlEvent) => boolean;
  priority?: 'high' | 'normal' | 'low';
  async?: boolean;
}

/**
 * Event publication options
 */
export interface EventPublicationOptions {
  targetPlugins?: string[];
  priority?: 'high' | 'normal' | 'low';
  persistent?: boolean;
  retryOnFailure?: boolean;
}

/**
 * Event bus interface definition
 */
export interface WriterrlEventBus {
  on(eventType: string, handler: WriterrlEventHandler, options?: EventSubscriptionOptions): void;
  off(eventType: string, handler: WriterrlEventHandler): void;
  emit(eventType: string, event: WriterrlEvent, options?: EventPublicationOptions): Promise<void>;
  getStats?(): any;
  reset?(): void;
}

// ============================================================================
// Event Bus Connection Management
// ============================================================================

import { EditorialOperationType } from './types/submit-changes-from-ai';

export interface EventBusConnectionConfig {
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  healthCheckInterval?: number;
  enableDebugMode?: boolean;
  eventFilters?: {
    sourcePlugins?: string[];
    eventTypes?: string[];
    sessionIds?: string[];
  };
}

export interface EventBusConnectionHealth {
  isConnected: boolean;
  lastHeartbeat: number;
  connectionAttempts: number;
  eventsPublished: number;
  eventsReceived: number;
  errors: Array<{
    timestamp: number;
    error: string;
    context: string;
  }>;
}

export class WriterrlEventBusConnection {
  private eventBus: WriterrlEventBus | null = null;
  private config: EventBusConnectionConfig;
  private health: EventBusConnectionHealth;
  private subscriptions = new Map<string, { handler: WriterrlEventHandler; options: EventSubscriptionOptions }>();
  private connectionCheckInterval: NodeJS.Timeout | null = null;
  private debugMode: boolean = false;
  
  // Event filtering system integration
  private eventFilteringSystem: import('./event-filtering-system').EnhancedEventFilteringSystem | null = null;
  private filteringEnabled: boolean = false;

  constructor(config: EventBusConnectionConfig = {}) {
    this.config = {
      maxReconnectAttempts: 3,
      reconnectDelay: 1000,
      healthCheckInterval: 30000,
      enableDebugMode: false,
      ...config
    };

    this.health = {
      isConnected: false,
      lastHeartbeat: 0,
      connectionAttempts: 0,
      eventsPublished: 0,
      eventsReceived: 0,
      errors: []
    };

    this.debugMode = this.config.enableDebugMode || false;
    
    // Initialize event filtering system if enabled
    this.initializeEventFiltering();
  }

  /**
   * Initialize event filtering system
   */
  private async initializeEventFiltering(): Promise<void> {
    try {
      const { EnhancedEventFilteringSystem } = await import('./event-filtering-system');
      
      this.eventFilteringSystem = new EnhancedEventFilteringSystem({
        enableLoopPrevention: true,
        enableFrequencyThrottling: true,
        enablePluginIsolation: true,
        debugMode: this.debugMode,
        maxEventChainDepth: 10,
        maxEventsPerSecond: 50,
        runawayEventThreshold: 20
      });
      
      this.filteringEnabled = true;
      
      if (this.debugMode) {
        console.log('[TrackEdits EventBus] Event filtering system initialized');
      }
    } catch (error) {
      console.warn('[TrackEdits EventBus] Failed to initialize event filtering system:', error);
      this.filteringEnabled = false;
    }
  }

  /**
   * Initialize connection to the window.Writerr event bus
   */
  async connect(): Promise<boolean> {
    try {
      // Check if window.Writerr exists and has event bus
      if (typeof window !== 'undefined' && 
          (window as any).Writerr && 
          (window as any).Writerr.eventBus) {
        
        this.eventBus = (window as any).Writerr.eventBus;
        this.health.isConnected = true;
        this.health.lastHeartbeat = Date.now();
        this.health.connectionAttempts++;

        if (this.debugMode) {
          console.log('[TrackEdits EventBus] Connected to window.Writerr event bus');
        }

        // Start health monitoring
        this.startHealthMonitoring();
        
        // Re-subscribe to any existing subscriptions
        await this.resubscribeAll();

        return true;
      } else {
        this.logError('Event bus not available', 'connection');
        return false;
      }
    } catch (error) {
      this.logError(`Connection failed: ${error}`, 'connection');
      return false;
    }
  }

  /**
   * Disconnect from event bus and cleanup
   */
  async disconnect(): Promise<void> {
    try {
      // Unsubscribe from all events
      await this.unsubscribeAll();

      // Stop health monitoring
      if (this.connectionCheckInterval) {
        clearInterval(this.connectionCheckInterval);
        this.connectionCheckInterval = null;
      }

      // Dispose event filtering system
      if (this.eventFilteringSystem) {
        this.eventFilteringSystem.dispose();
      }

      this.eventBus = null;
      this.health.isConnected = false;

      if (this.debugMode) {
        console.log('[TrackEdits EventBus] Disconnected from event bus');
      }
    } catch (error) {
      this.logError(`Disconnect error: ${error}`, 'disconnect');
    }
  }

  /**
   * Subscribe to events with automatic reconnection handling and advanced filtering
   */
  async subscribe(
    eventType: string, 
    handler: WriterrlEventHandler, 
    options: EventSubscriptionOptions = {}
  ): Promise<boolean> {
    try {
      // Store subscription for reconnection
      this.subscriptions.set(eventType, { handler, options });

      if (!this.eventBus) {
        if (this.debugMode) {
          console.log(`[TrackEdits EventBus] Deferring subscription to ${eventType} until connected`);
        }
        return false;
      }

      // Create wrapped handler for filtering and error handling
      const wrappedHandler: WriterrlEventHandler = async (event) => {
        try {
          // Apply basic configuration filters
          if (!this.shouldProcessEvent(event)) {
            return;
          }

          // Apply advanced event filtering to prevent feedback loops
          if (this.filteringEnabled && this.eventFilteringSystem) {
            const filterResult = await this.eventFilteringSystem.shouldProcessEvent(event);
            
            if (!this.shouldProcessFilteredEvent(filterResult, event)) {
              return;
            }
          }

          this.health.eventsReceived++;

          if (this.debugMode) {
            console.log(`[TrackEdits EventBus] Processing event: ${event.type}`, event);
          }

          await handler(event);
        } catch (error) {
          this.logError(`Event handler error for ${eventType}: ${error}`, 'handler');
        }
      };

      this.eventBus.on(eventType, wrappedHandler, options);

      if (this.debugMode) {
        console.log(`[TrackEdits EventBus] Subscribed to ${eventType}`);
      }

      return true;
    } catch (error) {
      this.logError(`Subscription error for ${eventType}: ${error}`, 'subscription');
      return false;
    }
  }

  /**
   * Determine whether to process event based on filtering result
   */
  private shouldProcessFilteredEvent(
    filterResult: import('./event-filtering-system').EventLoopDetectionResult, 
    event: WriterrlEvent | WriterrlEventV2
  ): boolean {
    switch (filterResult.preventionAction) {
      case 'allow':
        return true;
        
      case 'warn':
        if (this.debugMode) {
          console.warn(`[TrackEdits EventBus] Loop warning for event ${event.type} from ${event.sourcePlugin}:`, filterResult);
        }
        return true;
        
      case 'delay':
        // Implement async delay - for now, log and allow
        if (this.debugMode) {
          console.log(`[TrackEdits EventBus] Delaying event ${event.type} from ${event.sourcePlugin}`);
        }
        setTimeout(() => {
          // Could reprocess event after delay, but for now just log
        }, 500);
        return false;
        
      case 'throttle':
        if (this.debugMode) {
          console.log(`[TrackEdits EventBus] Throttling event ${event.type} from ${event.sourcePlugin}`);
        }
        return false;
        
      case 'block':
        if (this.debugMode) {
          console.warn(`[TrackEdits EventBus] Blocked event ${event.type} from ${event.sourcePlugin}:`, filterResult);
        }
        return false;
        
      case 'terminate_chain':
        console.error(`[TrackEdits EventBus] Terminated event chain for ${event.type} from ${event.sourcePlugin}:`, filterResult);
        return false;
        
      default:
        return true;
    }
  }

  /**
   * Unsubscribe from events
   */
  async unsubscribe(eventType: string): Promise<boolean> {
    try {
      const subscription = this.subscriptions.get(eventType);
      if (subscription && this.eventBus) {
        this.eventBus.off(eventType, subscription.handler);
        this.subscriptions.delete(eventType);

        if (this.debugMode) {
          console.log(`[TrackEdits EventBus] Unsubscribed from ${eventType}`);
        }

        return true;
      }
      return false;
    } catch (error) {
      this.logError(`Unsubscription error for ${eventType}: ${error}`, 'unsubscription');
      return false;
    }
  }

  /**
   * Publish events with error handling and retry logic
   */
  async publish(
    eventType: string, 
    event: WriterrlEvent, 
    options: EventPublicationOptions = {}
  ): Promise<boolean> {
    try {
      if (!this.eventBus) {
        if (this.debugMode) {
          console.log(`[TrackEdits EventBus] Cannot publish ${eventType} - not connected`);
        }
        return false;
      }

      // Check if this plugin should publish this event type
      if (this.filteringEnabled && this.eventFilteringSystem) {
        const shouldHandle = this.eventFilteringSystem.shouldPluginHandleEvent(
          event.sourcePlugin, 
          eventType
        );
        
        if (!shouldHandle) {
          if (this.debugMode) {
            console.warn(`[TrackEdits EventBus] Plugin ${event.sourcePlugin} not authorized to publish ${eventType}`);
          }
          return false;
        }

        // Check for ownership conflicts
        if (this.eventFilteringSystem.detectEventOwnershipConflict(event)) {
          if (this.debugMode) {
            console.warn(`[TrackEdits EventBus] Event ownership conflict detected for ${eventType} from ${event.sourcePlugin}`);
          }
        }
      }

      await this.eventBus.emit(eventType, event, options);
      this.health.eventsPublished++;

      if (this.debugMode) {
        console.log(`[TrackEdits EventBus] Published event: ${eventType}`, event);
      }

      return true;
    } catch (error) {
      this.logError(`Publication error for ${eventType}: ${error}`, 'publication');

      // Retry logic if enabled
      if (options.retryOnFailure) {
        try {
          await new Promise(resolve => setTimeout(resolve, this.config.reconnectDelay || 1000));
          return await this.publish(eventType, event, { ...options, retryOnFailure: false });
        } catch (retryError) {
          this.logError(`Retry publication failed for ${eventType}: ${retryError}`, 'retry');
        }
      }

      return false;
    }
  }

  /**
   * Get connection health status including filtering system stats
   */
  getHealth(): EventBusConnectionHealth & { 
    filteringSystemStats?: ReturnType<import('./event-filtering-system').EnhancedEventFilteringSystem['getSystemStats']>
  } {
    const baseHealth = { ...this.health };
    
    if (this.filteringEnabled && this.eventFilteringSystem) {
      return {
        ...baseHealth,
        filteringSystemStats: this.eventFilteringSystem.getSystemStats()
      };
    }
    
    return baseHealth;
  }

  /**
   * Get configuration
   */
  getConfig(): EventBusConnectionConfig {
    return { ...this.config };
  }

  /**
   * Update configuration including event filtering settings
   */
  updateConfig(newConfig: Partial<EventBusConnectionConfig & { 
    eventFilteringConfig?: Partial<import('./event-filtering-system').EventFilteringConfig>
  }>): void {
    this.config = { ...this.config, ...newConfig };
    this.debugMode = this.config.enableDebugMode || false;
    
    // Update event filtering system configuration
    if (this.filteringEnabled && this.eventFilteringSystem && 'eventFilteringConfig' in newConfig) {
      this.eventFilteringSystem.updateConfig(newConfig.eventFilteringConfig!);
    }
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.health.isConnected && this.eventBus !== null;
  }

  /**
   * Get event filtering system stats
   */
  getFilteringStats(): ReturnType<import('./event-filtering-system').EnhancedEventFilteringSystem['getSystemStats']> | null {
    if (this.filteringEnabled && this.eventFilteringSystem) {
      return this.eventFilteringSystem.getSystemStats();
    }
    return null;
  }

  /**
   * Register plugin capabilities with event filtering system
   */
  registerPluginCapabilities(pluginId: string, capabilities: string[]): void {
    if (this.filteringEnabled && this.eventFilteringSystem) {
      this.eventFilteringSystem.registerPluginCapabilities(pluginId, capabilities);
      
      if (this.debugMode) {
        console.log(`[TrackEdits EventBus] Registered capabilities for ${pluginId}:`, capabilities);
      }
    }
  }

  /**
   * Set event ownership with event filtering system
   */
  setEventOwnership(eventType: string, ownerId: string): void {
    if (this.filteringEnabled && this.eventFilteringSystem) {
      this.eventFilteringSystem.setEventOwnership(eventType, ownerId);
      
      if (this.debugMode) {
        console.log(`[TrackEdits EventBus] Set event ownership: ${eventType} -> ${ownerId}`);
      }
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async resubscribeAll(): Promise<void> {
    for (const [eventType, subscription] of this.subscriptions) {
      await this.subscribe(eventType, subscription.handler, subscription.options);
    }
  }

  private async unsubscribeAll(): Promise<void> {
    const eventTypes = Array.from(this.subscriptions.keys());
    for (const eventType of eventTypes) {
      await this.unsubscribe(eventType);
    }
  }

  private startHealthMonitoring(): void {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }

    this.connectionCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval || 30000);
  }

  private performHealthCheck(): void {
    if (typeof window !== 'undefined' && 
        (window as any).Writerr && 
        (window as any).Writerr.eventBus) {
      this.health.lastHeartbeat = Date.now();
      this.health.isConnected = true;
    } else {
      this.health.isConnected = false;
      this.eventBus = null;
      
      if (this.debugMode) {
        console.log('[TrackEdits EventBus] Health check failed - event bus unavailable');
      }

      // Attempt reconnection
      this.attemptReconnection();
    }
  }

  private async attemptReconnection(): Promise<void> {
    if (this.health.connectionAttempts < (this.config.maxReconnectAttempts || 3)) {
      if (this.debugMode) {
        console.log(`[TrackEdits EventBus] Attempting reconnection (${this.health.connectionAttempts + 1})`);
      }

      setTimeout(async () => {
        await this.connect();
      }, this.config.reconnectDelay || 1000);
    }
  }

  private shouldProcessEvent(event: WriterrlEvent): boolean {
    const filters = this.config.eventFilters;
    if (!filters) return true;

    // Filter by source plugins
    if (filters.sourcePlugins && 
        filters.sourcePlugins.length > 0 && 
        !filters.sourcePlugins.includes(event.sourcePlugin)) {
      return false;
    }

    // Filter by event types
    if (filters.eventTypes && 
        filters.eventTypes.length > 0 && 
        !filters.eventTypes.includes(event.type)) {
      return false;
    }

    // Filter by session IDs
    if (filters.sessionIds && 
        filters.sessionIds.length > 0 && 
        event.sessionId && 
        !filters.sessionIds.includes(event.sessionId)) {
      return false;
    }

    return true;
  }

  private logError(error: string, context: string): void {
    this.health.errors.push({
      timestamp: Date.now(),
      error,
      context
    });

    // Keep only last 50 errors
    if (this.health.errors.length > 50) {
      this.health.errors = this.health.errors.slice(-50);
    }

    if (this.debugMode) {
      console.error(`[TrackEdits EventBus] ${context}: ${error}`);
    }
  }
}

// ============================================================================
// Event Bus Utils
// ============================================================================

/**
 * Utility functions for event bus operations
 */
export class EventBusUtils {
  /**
   * Generate unique event ID
   */
  static generateEventId(prefix: string = 'event'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create base event properties
   */
  static createBaseEvent(
    sourcePlugin: string, 
    sessionId?: string, 
    documentId?: string, 
    targetPlugins?: string[]
  ): Pick<WriterrlEventBase, 'eventId' | 'timestamp' | 'sourcePlugin' | 'sessionId' | 'documentId' | 'targetPlugins'> {
    return {
      eventId: this.generateEventId(),
      timestamp: Date.now(),
      sourcePlugin,
      sessionId,
      documentId,
      targetPlugins
    };
  }

  /**
   * Create change event
   */
  static createChangeEvent(
    type: WriterrlChangeEvent['type'],
    sourcePlugin: string,
    payload: WriterrlChangeEvent['payload'],
    sessionId?: string,
    documentId?: string,
    targetPlugins?: string[]
  ): WriterrlChangeEvent {
    return {
      ...this.createBaseEvent(sourcePlugin, sessionId, documentId, targetPlugins),
      type,
      payload
    };
  }

  /**
   * Create session event
   */
  static createSessionEvent(
    type: WriterrlSessionEvent['type'],
    sourcePlugin: string,
    payload: WriterrlSessionEvent['payload'],
    sessionId?: string,
    documentId?: string,
    targetPlugins?: string[]
  ): WriterrlSessionEvent {
    return {
      ...this.createBaseEvent(sourcePlugin, sessionId, documentId, targetPlugins),
      type,
      payload
    };
  }

  /**
   * Create error event
   */
  static createErrorEvent(
    type: WriterrlErrorEvent['type'],
    sourcePlugin: string,
    payload: WriterrlErrorEvent['payload'],
    sessionId?: string,
    documentId?: string,
    targetPlugins?: string[]
  ): WriterrlErrorEvent {
    return {
      ...this.createBaseEvent(sourcePlugin, sessionId, documentId, targetPlugins),
      type,
      payload
    };
  }
}