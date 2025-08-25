/**
 * @fileoverview Cross-Plugin Event System for Writerr Plugin Suite
 * Defines standardized events for communication between plugins
 */

export enum CrossPluginEventType {
  // AI Provider Events
  AI_PROVIDER_REQUEST = 'ai-provider-request',
  AI_PROVIDER_RESPONSE = 'ai-provider-response',
  AI_PROVIDER_ERROR = 'ai-provider-error',
  AI_PROVIDER_HEALTH_UPDATE = 'ai-provider-health-update',
  AI_MODEL_SELECTION = 'ai-model-selection',
  AI_RATE_LIMIT_HIT = 'ai-rate-limit-hit',
  
  // Document Edit Events
  DOCUMENT_CHANGE_DETECTED = 'document-change-detected',
  EDIT_SUGGESTION_CREATED = 'edit-suggestion-created',
  EDIT_SUGGESTION_APPLIED = 'edit-suggestion-applied',
  EDIT_SUGGESTION_REJECTED = 'edit-suggestion-rejected',
  BULK_EDIT_STARTED = 'bulk-edit-started',
  BULK_EDIT_COMPLETED = 'bulk-edit-completed',
  
  // Function Events
  FUNCTION_EXECUTED = 'function-executed',
  FUNCTION_FAILED = 'function-failed',
  FUNCTION_QUALITY_FEEDBACK = 'function-quality-feedback',
  
  // Chat Events
  CHAT_MESSAGE_SENT = 'chat-message-sent',
  CHAT_RESPONSE_RECEIVED = 'chat-response-received',
  CHAT_MODE_CHANGED = 'chat-mode-changed',
  CONVERSATION_STARTED = 'conversation-started',
  CONVERSATION_ENDED = 'conversation-ended',
  
  // Plugin Lifecycle Events
  PLUGIN_LOADED = 'plugin-loaded',
  PLUGIN_UNLOADED = 'plugin-unloaded',
  PLUGIN_ERROR = 'plugin-error',
  PLUGIN_HEALTH_CHECK = 'plugin-health-check',
  
  // Integration Events
  INTEGRATION_ESTABLISHED = 'integration-established',
  INTEGRATION_LOST = 'integration-lost',
  CROSS_PLUGIN_SYNC = 'cross-plugin-sync',
  
  // Performance Events
  PERFORMANCE_METRIC = 'performance-metric',
  RESOURCE_USAGE_UPDATE = 'resource-usage-update',
  CACHE_CLEARED = 'cache-cleared'
}

export interface BaseEventPayload {
  timestamp: number;
  source: string;
  eventId: string;
  version: string;
}

// AI Provider Event Payloads

export interface AIProviderRequestPayload extends BaseEventPayload {
  providerId: string;
  modelId: string;
  requestId: string;
  requestType: 'completion' | 'streaming' | 'function-call';
  priority: 'low' | 'medium' | 'high';
  context: {
    pluginId: string;
    functionName?: string;
    messageCount?: number;
    documentId?: string;
  };
}

export interface AIProviderResponsePayload extends BaseEventPayload {
  requestId: string;
  providerId: string;
  modelId: string;
  success: boolean;
  processingTime: number;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost?: number;
  qualityScore?: number;
  error?: string;
}

export interface AIProviderHealthUpdatePayload extends BaseEventPayload {
  providerId: string;
  isHealthy: boolean;
  circuitBreakerState: 'closed' | 'open' | 'half-open';
  errorRate: number;
  latency: number;
  queueDepth: number;
}

export interface AIModelSelectionPayload extends BaseEventPayload {
  selectedModel: {
    providerId: string;
    modelId: string;
    reason: string;
    confidence: number;
  };
  alternatives: Array<{
    providerId: string;
    modelId: string;
    score: number;
    reason: string;
  }>;
  context: {
    requestType: string;
    contentLength: number;
    language?: string;
    urgency: string;
  };
}

export interface AIRateLimitHitPayload extends BaseEventPayload {
  providerId: string;
  modelId: string;
  requestsThisWindow: number;
  windowResetTime: number;
  queuedRequest: boolean;
}

// Document Edit Event Payloads

export interface DocumentChangeDetectedPayload extends BaseEventPayload {
  documentId: string;
  changeType: 'insert' | 'delete' | 'replace' | 'format';
  position: {
    start: number;
    end: number;
    line?: number;
    column?: number;
  };
  content: {
    before: string;
    after: string;
  };
  changeSource: 'user' | 'ai' | 'collaboration' | 'system';
  metadata: {
    confidence?: number;
    reason?: string;
  };
}

export interface EditSuggestionCreatedPayload extends BaseEventPayload {
  suggestionId: string;
  documentId: string;
  position: {
    start: number;
    end: number;
  };
  suggestion: {
    type: 'grammar' | 'style' | 'content' | 'structure';
    originalText: string;
    suggestedText: string;
    reason: string;
    confidence: number;
  };
  providerInfo: {
    providerId: string;
    modelId: string;
    functionName?: string;
  };
}

export interface EditSuggestionAppliedPayload extends BaseEventPayload {
  suggestionId: string;
  documentId: string;
  appliedBy: 'user' | 'auto' | 'batch';
  result: {
    success: boolean;
    actualChange?: string;
    error?: string;
  };
}

export interface BulkEditPayload extends BaseEventPayload {
  operationId: string;
  documentId: string;
  editCount: number;
  editTypes: string[];
  status: 'started' | 'completed' | 'failed';
  results?: {
    successful: number;
    failed: number;
    skipped: number;
    totalTime: number;
  };
}

// Function Event Payloads

export interface FunctionExecutedPayload extends BaseEventPayload {
  functionId: string;
  functionName: string;
  executionId: string;
  inputLength: number;
  outputLength: number;
  processingTime: number;
  success: boolean;
  confidence: number;
  providerInfo: {
    providerId: string;
    modelId: string;
  };
  qualityMetrics: {
    grammarScore?: number;
    styleScore?: number;
    coherenceScore?: number;
  };
}

export interface FunctionQualityFeedbackPayload extends BaseEventPayload {
  functionId: string;
  executionId: string;
  rating: number; // 1-5 scale
  feedback: string;
  categories: {
    accuracy?: number;
    usefulness?: number;
    clarity?: number;
  };
  userId?: string;
}

// Chat Event Payloads

export interface ChatMessageSentPayload extends BaseEventPayload {
  conversationId: string;
  messageId: string;
  messageType: 'user' | 'assistant' | 'system';
  contentLength: number;
  mode: {
    id: string;
    name: string;
  };
  context: {
    documentId?: string;
    selectedText?: boolean;
    attachments?: number;
  };
}

export interface ChatResponseReceivedPayload extends BaseEventPayload {
  conversationId: string;
  messageId: string;
  responseTime: number;
  contentLength: number;
  streaming: boolean;
  providerInfo: {
    providerId: string;
    modelId: string;
  };
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost: number;
  qualityScore: number;
}

export interface ChatModeChangedPayload extends BaseEventPayload {
  conversationId: string;
  previousMode: {
    id: string;
    name: string;
  };
  newMode: {
    id: string;
    name: string;
  };
  reason: 'user-selection' | 'auto-detection' | 'context-change';
}

export interface ConversationLifecyclePayload extends BaseEventPayload {
  conversationId: string;
  mode: {
    id: string;
    name: string;
  };
  context?: {
    documentId: string;
    selectedText?: boolean;
  };
  metadata: {
    messageCount?: number;
    duration?: number;
    totalTokens?: number;
    cost?: number;
  };
}

// Plugin Lifecycle Event Payloads

export interface PluginLifecyclePayload extends BaseEventPayload {
  pluginId: string;
  pluginName: string;
  version: string;
  capabilities: string[];
  status: 'loaded' | 'unloaded' | 'error' | 'healthy' | 'unhealthy';
  error?: string;
  dependencies?: string[];
}

// Integration Event Payloads

export interface IntegrationPayload extends BaseEventPayload {
  integrationType: 'ai-providers' | 'track-edits' | 'chat' | 'functions';
  pluginA: string;
  pluginB: string;
  status: 'established' | 'lost' | 'syncing';
  capabilities: string[];
  metadata?: {
    connectionQuality?: number;
    latency?: number;
    lastSync?: number;
  };
}

export interface CrossPluginSyncPayload extends BaseEventPayload {
  syncType: 'settings' | 'user-preferences' | 'cache' | 'state';
  participants: string[];
  data: {
    [key: string]: any;
  };
  syncResult: {
    success: boolean;
    conflicts?: string[];
    resolved?: boolean;
  };
}

// Performance Event Payloads

export interface PerformanceMetricPayload extends BaseEventPayload {
  metricType: 'latency' | 'throughput' | 'error-rate' | 'resource-usage';
  component: string;
  value: number;
  unit: string;
  context: {
    operation?: string;
    timeWindow?: string;
    sampleSize?: number;
  };
}

export interface ResourceUsageUpdatePayload extends BaseEventPayload {
  resourceType: 'memory' | 'cpu' | 'disk' | 'network';
  usage: {
    current: number;
    peak: number;
    average: number;
    unit: string;
  };
  component: string;
  threshold?: {
    warning: number;
    critical: number;
  };
}

// Event Payload Union Type
export type CrossPluginEventPayload = 
  | AIProviderRequestPayload
  | AIProviderResponsePayload
  | AIProviderHealthUpdatePayload
  | AIModelSelectionPayload
  | AIRateLimitHitPayload
  | DocumentChangeDetectedPayload
  | EditSuggestionCreatedPayload
  | EditSuggestionAppliedPayload
  | BulkEditPayload
  | FunctionExecutedPayload
  | FunctionQualityFeedbackPayload
  | ChatMessageSentPayload
  | ChatResponseReceivedPayload
  | ChatModeChangedPayload
  | ConversationLifecyclePayload
  | PluginLifecyclePayload
  | IntegrationPayload
  | CrossPluginSyncPayload
  | PerformanceMetricPayload
  | ResourceUsageUpdatePayload;

// Event Interface
export interface CrossPluginEvent {
  type: CrossPluginEventType;
  payload: CrossPluginEventPayload;
  metadata: {
    priority: 'low' | 'medium' | 'high' | 'critical';
    persistent: boolean;
    retryable: boolean;
    maxRetries?: number;
    timeout?: number;
  };
}

// Event Handler Interface
export interface CrossPluginEventHandler<T extends CrossPluginEventPayload = CrossPluginEventPayload> {
  handle(event: CrossPluginEvent & { payload: T }): Promise<void> | void;
  canHandle(eventType: CrossPluginEventType): boolean;
  priority: number; // Higher numbers = higher priority
}

// Event Filter Interface
export interface CrossPluginEventFilter {
  eventTypes?: CrossPluginEventType[];
  sources?: string[];
  priority?: Array<'low' | 'medium' | 'high' | 'critical'>;
  customFilter?: (event: CrossPluginEvent) => boolean;
}

// Event Subscription Interface
export interface CrossPluginEventSubscription {
  id: string;
  filter: CrossPluginEventFilter;
  handler: CrossPluginEventHandler;
  isActive: boolean;
  createdAt: Date;
  lastTriggered?: Date;
  triggerCount: number;
}

// Event Statistics Interface
export interface CrossPluginEventStats {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySource: Record<string, number>;
  errorRate: number;
  averageProcessingTime: number;
  lastResetTime: Date;
}

// Utility functions for event creation
export class CrossPluginEventFactory {
  private static generateEventId(): string {
    return `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static createAIProviderRequest(
    providerId: string,
    modelId: string,
    requestType: 'completion' | 'streaming' | 'function-call',
    context: AIProviderRequestPayload['context']
  ): CrossPluginEvent {
    return {
      type: CrossPluginEventType.AI_PROVIDER_REQUEST,
      payload: {
        timestamp: Date.now(),
        source: context.pluginId,
        eventId: this.generateEventId(),
        version: '1.0',
        providerId,
        modelId,
        requestId: this.generateEventId(),
        requestType,
        priority: 'medium',
        context
      },
      metadata: {
        priority: 'medium',
        persistent: false,
        retryable: true,
        maxRetries: 3,
        timeout: 30000
      }
    };
  }

  static createDocumentChange(
    documentId: string,
    changeType: DocumentChangeDetectedPayload['changeType'],
    position: DocumentChangeDetectedPayload['position'],
    content: DocumentChangeDetectedPayload['content'],
    changeSource: DocumentChangeDetectedPayload['changeSource'],
    source: string
  ): CrossPluginEvent {
    return {
      type: CrossPluginEventType.DOCUMENT_CHANGE_DETECTED,
      payload: {
        timestamp: Date.now(),
        source,
        eventId: this.generateEventId(),
        version: '1.0',
        documentId,
        changeType,
        position,
        content,
        changeSource,
        metadata: {}
      },
      metadata: {
        priority: 'high',
        persistent: true,
        retryable: false
      }
    };
  }

  static createEditSuggestion(
    documentId: string,
    position: EditSuggestionCreatedPayload['position'],
    suggestion: EditSuggestionCreatedPayload['suggestion'],
    providerInfo: EditSuggestionCreatedPayload['providerInfo'],
    source: string
  ): CrossPluginEvent {
    return {
      type: CrossPluginEventType.EDIT_SUGGESTION_CREATED,
      payload: {
        timestamp: Date.now(),
        source,
        eventId: this.generateEventId(),
        version: '1.0',
        suggestionId: this.generateEventId(),
        documentId,
        position,
        suggestion,
        providerInfo
      },
      metadata: {
        priority: 'medium',
        persistent: true,
        retryable: false
      }
    };
  }

  static createFunctionExecution(
    functionId: string,
    functionName: string,
    result: Partial<FunctionExecutedPayload>,
    source: string
  ): CrossPluginEvent {
    return {
      type: CrossPluginEventType.FUNCTION_EXECUTED,
      payload: {
        timestamp: Date.now(),
        source,
        eventId: this.generateEventId(),
        version: '1.0',
        functionId,
        functionName,
        executionId: this.generateEventId(),
        inputLength: result.inputLength || 0,
        outputLength: result.outputLength || 0,
        processingTime: result.processingTime || 0,
        success: result.success || false,
        confidence: result.confidence || 0,
        providerInfo: result.providerInfo || { providerId: 'unknown', modelId: 'unknown' },
        qualityMetrics: result.qualityMetrics || {}
      },
      metadata: {
        priority: 'low',
        persistent: true,
        retryable: false
      }
    };
  }

  static createChatMessage(
    conversationId: string,
    messageType: ChatMessageSentPayload['messageType'],
    contentLength: number,
    mode: ChatMessageSentPayload['mode'],
    context: ChatMessageSentPayload['context'],
    source: string
  ): CrossPluginEvent {
    return {
      type: CrossPluginEventType.CHAT_MESSAGE_SENT,
      payload: {
        timestamp: Date.now(),
        source,
        eventId: this.generateEventId(),
        version: '1.0',
        conversationId,
        messageId: this.generateEventId(),
        messageType,
        contentLength,
        mode,
        context
      },
      metadata: {
        priority: 'medium',
        persistent: true,
        retryable: false
      }
    };
  }

  static createPerformanceMetric(
    metricType: PerformanceMetricPayload['metricType'],
    component: string,
    value: number,
    unit: string,
    context: PerformanceMetricPayload['context'],
    source: string
  ): CrossPluginEvent {
    return {
      type: CrossPluginEventType.PERFORMANCE_METRIC,
      payload: {
        timestamp: Date.now(),
        source,
        eventId: this.generateEventId(),
        version: '1.0',
        metricType,
        component,
        value,
        unit,
        context
      },
      metadata: {
        priority: 'low',
        persistent: false,
        retryable: false
      }
    };
  }
}

// Event validation utilities
export class CrossPluginEventValidator {
  static validateEvent(event: CrossPluginEvent): boolean {
    if (!event.type || !event.payload || !event.metadata) {
      return false;
    }

    if (!event.payload.timestamp || !event.payload.source || !event.payload.eventId) {
      return false;
    }

    return this.validatePayload(event.type, event.payload);
  }

  private static validatePayload(type: CrossPluginEventType, payload: CrossPluginEventPayload): boolean {
    switch (type) {
      case CrossPluginEventType.AI_PROVIDER_REQUEST:
        const aiReq = payload as AIProviderRequestPayload;
        return !!(aiReq.providerId && aiReq.modelId && aiReq.requestId && aiReq.requestType);

      case CrossPluginEventType.DOCUMENT_CHANGE_DETECTED:
        const docChange = payload as DocumentChangeDetectedPayload;
        return !!(docChange.documentId && docChange.changeType && docChange.position && docChange.content);

      case CrossPluginEventType.FUNCTION_EXECUTED:
        const funcExec = payload as FunctionExecutedPayload;
        return !!(funcExec.functionId && funcExec.functionName && funcExec.executionId);

      default:
        return true; // Basic validation passed, specific validation can be added
    }
  }
}

// Export everything
export {
  CrossPluginEventType as EventType,
  CrossPluginEvent as Event,
  CrossPluginEventHandler as EventHandler,
  CrossPluginEventFilter as EventFilter,
  CrossPluginEventSubscription as EventSubscription,
  CrossPluginEventStats as EventStats,
  CrossPluginEventFactory as EventFactory,
  CrossPluginEventValidator as EventValidator
};