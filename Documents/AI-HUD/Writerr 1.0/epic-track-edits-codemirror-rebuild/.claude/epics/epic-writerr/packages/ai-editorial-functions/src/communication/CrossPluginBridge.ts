/**
 * @fileoverview Cross-Plugin Communication Bridge for AI Editorial Functions Plugin
 * Handles communication with other plugins and coordinates editorial function execution
 */

import { globalEventBus, EventData } from '@writerr/shared';
import {
  CrossPluginEvent,
  CrossPluginEventType,
  CrossPluginEventHandler,
  CrossPluginEventFilter,
  CrossPluginEventSubscription,
  CrossPluginEventFactory,
  CrossPluginEventValidator,
  FunctionExecutedPayload,
  FunctionQualityFeedbackPayload,
  DocumentChangeDetectedPayload,
  ChatMessageSentPayload,
  AIProviderRequestPayload,
  PerformanceMetricPayload
} from '@writerr/shared/events/CrossPluginEvents';
import { 
  FunctionDefinition, 
  FunctionExecution, 
  FunctionExecutionResult 
} from '../types';

export interface FunctionBridgeConfig {
  pluginId: string;
  version: string;
  capabilities: string[];
  autoExecuteOnChanges: boolean;
  qualityThreshold: number;
  maxConcurrentFunctions: number;
  batchProcessing: {
    enabled: boolean;
    batchSize: number;
    maxWaitTime: number;
  };
  integration: {
    trackEdits: boolean;
    writerrChat: boolean;
    aiProviders: boolean;
  };
}

export interface FunctionRequest {
  id: string;
  functionId: string;
  input: string;
  context: {
    documentId?: string;
    triggeredBy: 'user' | 'auto' | 'chat' | 'suggestion';
    priority: 'low' | 'medium' | 'high';
    qualityTarget: number;
  };
  metadata: {
    timestamp: Date;
    source: string;
    retryCount: number;
  };
}

export interface FunctionQueue {
  pending: FunctionRequest[];
  processing: FunctionRequest[];
  completed: FunctionRequest[];
  failed: FunctionRequest[];
}

export interface QualityMetrics {
  functionId: string;
  averageScore: number;
  userRatings: number[];
  performanceScore: number;
  reliabilityScore: number;
  lastUpdated: Date;
}

export class CrossPluginBridge {
  private static instance: CrossPluginBridge;
  private config: FunctionBridgeConfig;
  private isInitialized = false;
  
  // Function execution tracking
  private functionQueue: FunctionQueue = {
    pending: [],
    processing: [],
    completed: [],
    failed: []
  };
  
  // Quality and performance tracking
  private qualityMetrics = new Map<string, QualityMetrics>();
  private performanceHistory = new Map<string, Array<{
    timestamp: Date;
    executionTime: number;
    success: boolean;
    qualityScore: number;
  }>>();
  
  // Plugin integration state
  private pluginIntegrations = new Map<string, {
    status: 'connected' | 'disconnected' | 'error';
    capabilities: string[];
    lastInteraction: Date;
    preferredFunctions: string[];
  }>();
  
  // Event handling
  private subscriptions = new Map<string, CrossPluginEventSubscription>();
  private eventHandlers = new Map<CrossPluginEventType, CrossPluginEventHandler[]>();
  
  // Batch processing
  private batchProcessor?: NodeJS.Timer;
  private batchQueue: FunctionRequest[] = [];
  
  // Statistics
  private stats = {
    totalFunctionsExecuted: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    averageQuality: 0,
    averageExecutionTime: 0,
    autoTriggeredFunctions: 0,
    userTriggeredFunctions: 0,
    chatTriggeredFunctions: 0,
    lastResetTime: new Date()
  };

  private constructor() {
    this.config = this.getDefaultConfig();
    this.setupCoreHandlers();
  }

  static getInstance(): CrossPluginBridge {
    if (!CrossPluginBridge.instance) {
      CrossPluginBridge.instance = new CrossPluginBridge();
    }
    return CrossPluginBridge.instance;
  }

  /**
   * Initialize the editorial functions bridge
   */
  async initialize(config?: Partial<FunctionBridgeConfig>): Promise<void> {
    if (this.isInitialized) return;

    if (config) {
      this.config = { ...this.config, ...config };
    }

    try {
      // Set up event listeners
      this.setupEventListeners();
      
      // Start batch processing if enabled
      if (this.config.batchProcessing.enabled) {
        this.startBatchProcessor();
      }
      
      // Announce plugin presence
      this.announcePlugin();
      
      // Initialize integrations
      await this.initializeIntegrations();

      this.isInitialized = true;
      
      console.log('[Editorial-Functions Bridge] Initialized successfully');
    } catch (error) {
      console.error('[Editorial-Functions Bridge] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Execute a function and broadcast the result
   */
  async executeFunction(
    functionDefinition: FunctionDefinition,
    input: string,
    context: {
      documentId?: string;
      triggeredBy?: 'user' | 'auto' | 'chat' | 'suggestion';
      priority?: 'low' | 'medium' | 'high';
      qualityTarget?: number;
    } = {}
  ): Promise<FunctionExecutionResult> {
    const request: FunctionRequest = {
      id: this.generateId(),
      functionId: functionDefinition.id,
      input,
      context: {
        documentId: context.documentId,
        triggeredBy: context.triggeredBy || 'user',
        priority: context.priority || 'medium',
        qualityTarget: context.qualityTarget || this.config.qualityThreshold
      },
      metadata: {
        timestamp: new Date(),
        source: this.config.pluginId,
        retryCount: 0
      }
    };

    // Add to queue
    this.functionQueue.pending.push(request);
    this.functionQueue.processing.push(request);

    const startTime = Date.now();

    try {
      // Execute the function (this would integrate with the actual function execution system)
      const result = await this.executeFunctionInternal(functionDefinition, input, request);
      
      const executionTime = Date.now() - startTime;
      
      // Move to completed queue
      this.moveToCompleted(request);
      
      // Update performance metrics
      this.updatePerformanceMetrics(functionDefinition.id, executionTime, true, result.confidence);
      
      // Broadcast execution event
      await this.broadcastFunctionExecution(request, result, executionTime);
      
      // Update statistics
      this.updateStats(context.triggeredBy || 'user', true, result.confidence, executionTime);
      
      return result;
    } catch (error) {
      // Move to failed queue
      this.moveToFailed(request, error as Error);
      
      // Update metrics
      this.updatePerformanceMetrics(functionDefinition.id, Date.now() - startTime, false, 0);
      
      // Update statistics
      this.updateStats(context.triggeredBy || 'user', false, 0, Date.now() - startTime);
      
      throw error;
    }
  }

  /**
   * Submit quality feedback for a function execution
   */
  async submitQualityFeedback(
    executionId: string,
    rating: number,
    feedback: string,
    categories?: {
      accuracy?: number;
      usefulness?: number;
      clarity?: number;
    }
  ): Promise<void> {
    const event: CrossPluginEvent = {
      type: CrossPluginEventType.FUNCTION_QUALITY_FEEDBACK,
      payload: {
        timestamp: Date.now(),
        source: this.config.pluginId,
        eventId: this.generateId(),
        version: '1.0',
        functionId: 'unknown', // Would need to track this
        executionId,
        rating,
        feedback,
        categories: categories || {}
      },
      metadata: {
        priority: 'low',
        persistent: true,
        retryable: false
      }
    };

    await this.sendEvent(event);
  }

  /**
   * Get function quality metrics
   */
  getFunctionQualityMetrics(functionId: string): QualityMetrics | null {
    return this.qualityMetrics.get(functionId) || null;
  }

  /**
   * Get all quality metrics
   */
  getAllQualityMetrics(): Map<string, QualityMetrics> {
    return new Map(this.qualityMetrics);
  }

  /**
   * Get performance history for a function
   */
  getFunctionPerformanceHistory(functionId: string): Array<{
    timestamp: Date;
    executionTime: number;
    success: boolean;
    qualityScore: number;
  }> {
    return this.performanceHistory.get(functionId) || [];
  }

  /**
   * Get function execution queue status
   */
  getQueueStatus(): FunctionQueue {
    return {
      pending: [...this.functionQueue.pending],
      processing: [...this.functionQueue.processing],
      completed: [...this.functionQueue.completed.slice(-10)], // Last 10
      failed: [...this.functionQueue.failed.slice(-10)] // Last 10
    };
  }

  /**
   * Get plugin integration status
   */
  getIntegrationStatus(): Record<string, {
    status: string;
    capabilities: string[];
    lastInteraction: Date;
    preferredFunctions: string[];
  }> {
    const status: Record<string, any> = {};
    
    for (const [pluginId, integration] of this.pluginIntegrations.entries()) {
      status[pluginId] = {
        status: integration.status,
        capabilities: integration.capabilities,
        lastInteraction: integration.lastInteraction,
        preferredFunctions: integration.preferredFunctions
      };
    }
    
    return status;
  }

  /**
   * Get bridge statistics
   */
  getStats(): typeof CrossPluginBridge.prototype.stats {
    return { ...this.stats };
  }

  /**
   * Subscribe to cross-plugin events
   */
  subscribe(
    filter: CrossPluginEventFilter,
    handler: CrossPluginEventHandler
  ): string {
    const subscriptionId = this.generateId();
    
    const subscription: CrossPluginEventSubscription = {
      id: subscriptionId,
      filter,
      handler,
      isActive: true,
      createdAt: new Date(),
      triggerCount: 0
    };
    
    this.subscriptions.set(subscriptionId, subscription);
    
    return subscriptionId;
  }

  /**
   * Clear queue and reset metrics
   */
  clearQueue(): void {
    this.functionQueue = {
      pending: [],
      processing: [],
      completed: [],
      failed: []
    };
  }

  /**
   * Dispose of the bridge
   */
  dispose(): void {
    this.isInitialized = false;
    
    if (this.batchProcessor) {
      clearInterval(this.batchProcessor);
      this.batchProcessor = undefined;
    }
    
    this.subscriptions.clear();
    this.eventHandlers.clear();
    this.pluginIntegrations.clear();
    this.qualityMetrics.clear();
    this.performanceHistory.clear();
    this.clearQueue();
    this.batchQueue.length = 0;
  }

  // Private methods

  private getDefaultConfig(): FunctionBridgeConfig {
    return {
      pluginId: 'ai-editorial-functions',
      version: '1.0.0',
      capabilities: [
        'grammar-checking',
        'style-analysis',
        'content-enhancement',
        'proofreading',
        'rewriting',
        'quality-scoring',
        'batch-processing'
      ],
      autoExecuteOnChanges: false,
      qualityThreshold: 0.7,
      maxConcurrentFunctions: 3,
      batchProcessing: {
        enabled: true,
        batchSize: 5,
        maxWaitTime: 2000
      },
      integration: {
        trackEdits: true,
        writerrChat: true,
        aiProviders: true
      }
    };
  }

  private setupCoreHandlers(): void {
    // Handle document changes from Track Edits
    this.subscribe(
      { eventTypes: [CrossPluginEventType.DOCUMENT_CHANGE_DETECTED] },
      {
        handle: async (event) => {
          await this.handleDocumentChange(event.payload as DocumentChangeDetectedPayload);
        },
        canHandle: (type) => type === CrossPluginEventType.DOCUMENT_CHANGE_DETECTED,
        priority: 2
      }
    );

    // Handle chat messages that might trigger functions
    this.subscribe(
      { eventTypes: [CrossPluginEventType.CHAT_MESSAGE_SENT] },
      {
        handle: async (event) => {
          await this.handleChatMessage(event.payload as ChatMessageSentPayload);
        },
        canHandle: (type) => type === CrossPluginEventType.CHAT_MESSAGE_SENT,
        priority: 2
      }
    );

    // Handle AI provider requests
    this.subscribe(
      { 
        eventTypes: [CrossPluginEventType.AI_PROVIDER_REQUEST],
        sources: ['writerr-chat', 'track-edits']
      },
      {
        handle: async (event) => {
          await this.handleAIProviderRequest(event.payload as AIProviderRequestPayload);
        },
        canHandle: (type) => type === CrossPluginEventType.AI_PROVIDER_REQUEST,
        priority: 1
      }
    );

    // Handle quality feedback
    this.subscribe(
      { eventTypes: [CrossPluginEventType.FUNCTION_QUALITY_FEEDBACK] },
      {
        handle: async (event) => {
          await this.handleQualityFeedback(event.payload as FunctionQualityFeedbackPayload);
        },
        canHandle: (type) => type === CrossPluginEventType.FUNCTION_QUALITY_FEEDBACK,
        priority: 1
      }
    );

    // Handle plugin lifecycle events
    this.subscribe(
      { eventTypes: [CrossPluginEventType.PLUGIN_LOADED, CrossPluginEventType.PLUGIN_UNLOADED] },
      {
        handle: async (event) => {
          await this.handlePluginLifecycle(event.payload as any);
        },
        canHandle: (type) => [
          CrossPluginEventType.PLUGIN_LOADED,
          CrossPluginEventType.PLUGIN_UNLOADED
        ].includes(type),
        priority: 3
      }
    );
  }

  private setupEventListeners(): void {
    // Listen for global cross-plugin events
    globalEventBus.on('cross-plugin-event', (eventData: EventData) => {
      this.handleIncomingEvent(eventData.payload as CrossPluginEvent);
    });

    // Listen for function-specific events
    globalEventBus.on('editorial-function-execute', (eventData: EventData) => {
      const { functionDefinition, input, context } = eventData.payload;
      this.executeFunction(functionDefinition, input, context);
    });

    globalEventBus.on('editorial-function-quality-feedback', (eventData: EventData) => {
      const { executionId, rating, feedback, categories } = eventData.payload;
      this.submitQualityFeedback(executionId, rating, feedback, categories);
    });
  }

  private async handleIncomingEvent(event: CrossPluginEvent): Promise<void> {
    try {
      // Find matching handlers
      const handlers = this.findMatchingHandlers(event);
      
      // Process with each handler
      for (const handler of handlers) {
        try {
          await handler.handle(event);
        } catch (error) {
          console.error('[Editorial-Functions Bridge] Handler error:', error);
        }
      }
    } catch (error) {
      console.error('[Editorial-Functions Bridge] Error handling incoming event:', error);
    }
  }

  private findMatchingHandlers(event: CrossPluginEvent): CrossPluginEventHandler[] {
    const matchingHandlers: CrossPluginEventHandler[] = [];
    
    for (const subscription of this.subscriptions.values()) {
      if (!subscription.isActive) continue;
      
      if (this.eventMatchesFilter(event, subscription.filter)) {
        matchingHandlers.push(subscription.handler);
        subscription.triggerCount++;
        subscription.lastTriggered = new Date();
      }
    }
    
    return matchingHandlers.sort((a, b) => b.priority - a.priority);
  }

  private eventMatchesFilter(event: CrossPluginEvent, filter: CrossPluginEventFilter): boolean {
    if (filter.eventTypes && !filter.eventTypes.includes(event.type)) {
      return false;
    }
    
    if (filter.sources && !filter.sources.includes(event.payload.source)) {
      return false;
    }
    
    if (filter.priority && !filter.priority.includes(event.metadata.priority)) {
      return false;
    }
    
    if (filter.customFilter && !filter.customFilter(event)) {
      return false;
    }
    
    return true;
  }

  private async handleDocumentChange(payload: DocumentChangeDetectedPayload): Promise<void> {
    if (!this.config.autoExecuteOnChanges) return;

    // Determine if this change warrants automatic function execution
    const shouldTrigger = this.shouldTriggerFunctionForChange(payload);
    
    if (shouldTrigger) {
      const functionType = this.determineFunctionTypeForChange(payload);
      
      // This would trigger appropriate functions based on change type
      console.log(`[Editorial-Functions Bridge] Auto-triggering ${functionType} for document ${payload.documentId}`);
      
      // Update integration status
      this.updatePluginIntegration('track-edits', new Date());
    }
  }

  private async handleChatMessage(payload: ChatMessageSentPayload): Promise<void> {
    if (!this.config.integration.writerrChat) return;

    // Check if message requests editorial functions
    const functionRequested = this.extractFunctionRequestFromChat(payload);
    
    if (functionRequested) {
      console.log(`[Editorial-Functions Bridge] Function requested from chat: ${functionRequested}`);
      
      // This would trigger the requested function
      this.stats.chatTriggeredFunctions++;
      this.updatePluginIntegration('writerr-chat', new Date());
    }
  }

  private async handleAIProviderRequest(payload: AIProviderRequestPayload): Promise<void> {
    // If this is a function call request for our plugin
    if (payload.context.pluginId === this.config.pluginId || payload.context.functionName) {
      console.log(`[Editorial-Functions Bridge] AI Provider request for function: ${payload.context.functionName}`);
      
      // This would coordinate with the AI provider to execute the function
      this.updatePluginIntegration('ai-providers', new Date());
    }
  }

  private async handleQualityFeedback(payload: FunctionQualityFeedbackPayload): Promise<void> {
    // Update quality metrics
    const existing = this.qualityMetrics.get(payload.functionId) || {
      functionId: payload.functionId,
      averageScore: 0,
      userRatings: [],
      performanceScore: 0.8,
      reliabilityScore: 0.9,
      lastUpdated: new Date()
    };

    existing.userRatings.push(payload.rating);
    
    // Keep only last 50 ratings
    if (existing.userRatings.length > 50) {
      existing.userRatings.shift();
    }
    
    existing.averageScore = existing.userRatings.reduce((sum, rating) => sum + rating, 0) / existing.userRatings.length;
    existing.lastUpdated = new Date();
    
    this.qualityMetrics.set(payload.functionId, existing);
    
    console.log(`[Editorial-Functions Bridge] Quality feedback for ${payload.functionId}: ${payload.rating}/5`);
  }

  private async handlePluginLifecycle(payload: any): Promise<void> {
    const { pluginId, status, capabilities } = payload;

    if (pluginId === this.config.pluginId) return; // Ignore self

    if (status === 'loaded') {
      this.pluginIntegrations.set(pluginId, {
        status: 'connected',
        capabilities: capabilities || [],
        lastInteraction: new Date(),
        preferredFunctions: []
      });
    } else if (status === 'unloaded') {
      const integration = this.pluginIntegrations.get(pluginId);
      if (integration) {
        integration.status = 'disconnected';
      }
    }
  }

  private async executeFunctionInternal(
    functionDefinition: FunctionDefinition,
    input: string,
    request: FunctionRequest
  ): Promise<FunctionExecutionResult> {
    // This is a placeholder for the actual function execution
    // In reality, this would integrate with the function execution system
    
    return {
      originalText: input,
      modifiedText: input + ' (enhanced)', // Placeholder
      suggestions: [],
      confidence: 0.85,
      metadata: {
        processingTime: 1500,
        model: 'gpt-4',
        timestamp: new Date()
      }
    };
  }

  private async broadcastFunctionExecution(
    request: FunctionRequest,
    result: FunctionExecutionResult,
    executionTime: number
  ): Promise<void> {
    const event = CrossPluginEventFactory.createFunctionExecution(
      request.functionId,
      'function-name', // Would get from function registry
      {
        inputLength: request.input.length,
        outputLength: result.modifiedText.length,
        processingTime: executionTime,
        success: true,
        confidence: result.confidence,
        providerInfo: { providerId: 'ai-editorial-functions', modelId: 'internal' },
        qualityMetrics: {
          grammarScore: 0.9,
          styleScore: 0.8,
          coherenceScore: 0.85
        }
      },
      this.config.pluginId
    );

    await this.sendEvent(event);
  }

  private moveToCompleted(request: FunctionRequest): void {
    this.removeFromProcessing(request);
    this.functionQueue.completed.push(request);
    
    // Keep only last 100 completed
    if (this.functionQueue.completed.length > 100) {
      this.functionQueue.completed.shift();
    }
  }

  private moveToFailed(request: FunctionRequest, error: Error): void {
    this.removeFromProcessing(request);
    this.functionQueue.failed.push({
      ...request,
      metadata: {
        ...request.metadata,
        error: error.message
      }
    } as any);
    
    // Keep only last 50 failed
    if (this.functionQueue.failed.length > 50) {
      this.functionQueue.failed.shift();
    }
  }

  private removeFromProcessing(request: FunctionRequest): void {
    const index = this.functionQueue.processing.findIndex(r => r.id === request.id);
    if (index > -1) {
      this.functionQueue.processing.splice(index, 1);
    }
    
    const pendingIndex = this.functionQueue.pending.findIndex(r => r.id === request.id);
    if (pendingIndex > -1) {
      this.functionQueue.pending.splice(pendingIndex, 1);
    }
  }

  private updatePerformanceMetrics(
    functionId: string,
    executionTime: number,
    success: boolean,
    qualityScore: number
  ): void {
    if (!this.performanceHistory.has(functionId)) {
      this.performanceHistory.set(functionId, []);
    }
    
    const history = this.performanceHistory.get(functionId)!;
    history.push({
      timestamp: new Date(),
      executionTime,
      success,
      qualityScore
    });
    
    // Keep only last 100 entries
    if (history.length > 100) {
      history.shift();
    }
  }

  private updateStats(
    triggeredBy: 'user' | 'auto' | 'chat' | 'suggestion',
    success: boolean,
    qualityScore: number,
    executionTime: number
  ): void {
    this.stats.totalFunctionsExecuted++;
    
    if (success) {
      this.stats.successfulExecutions++;
      this.stats.averageQuality = (this.stats.averageQuality + qualityScore) / 2;
    } else {
      this.stats.failedExecutions++;
    }
    
    this.stats.averageExecutionTime = (this.stats.averageExecutionTime + executionTime) / 2;
    
    switch (triggeredBy) {
      case 'auto':
        this.stats.autoTriggeredFunctions++;
        break;
      case 'user':
        this.stats.userTriggeredFunctions++;
        break;
      case 'chat':
        this.stats.chatTriggeredFunctions++;
        break;
    }
  }

  private updatePluginIntegration(pluginId: string, timestamp: Date): void {
    const integration = this.pluginIntegrations.get(pluginId);
    if (integration) {
      integration.lastInteraction = timestamp;
      integration.status = 'connected';
    }
  }

  private shouldTriggerFunctionForChange(payload: DocumentChangeDetectedPayload): boolean {
    // Simple logic - in reality this would be more sophisticated
    return payload.changeType === 'replace' && 
           payload.content.after.length > payload.content.before.length;
  }

  private determineFunctionTypeForChange(payload: DocumentChangeDetectedPayload): string {
    // Analyze the change to determine what type of function to trigger
    if (payload.changeType === 'replace') {
      return 'grammar-check';
    } else if (payload.changeType === 'insert') {
      return 'style-analysis';
    }
    return 'general-review';
  }

  private extractFunctionRequestFromChat(payload: ChatMessageSentPayload): string | null {
    // This would parse chat messages for function requests
    // Placeholder logic
    return null;
  }

  private async sendEvent(event: CrossPluginEvent): Promise<boolean> {
    try {
      if (!CrossPluginEventValidator.validateEvent(event)) {
        throw new Error('Invalid event format');
      }

      globalEventBus.emit('cross-plugin-event', event, this.config.pluginId);
      return true;
    } catch (error) {
      console.error('[Editorial-Functions Bridge] Error sending event:', error);
      return false;
    }
  }

  private async initializeIntegrations(): Promise<void> {
    // Initialize connections to other plugins
    const integrationsToCheck = [
      { id: 'track-edits', enabled: this.config.integration.trackEdits },
      { id: 'writerr-chat', enabled: this.config.integration.writerrChat },
      { id: 'ai-providers', enabled: this.config.integration.aiProviders }
    ];

    for (const integration of integrationsToCheck) {
      if (integration.enabled) {
        this.pluginIntegrations.set(integration.id, {
          status: 'disconnected',
          capabilities: [],
          lastInteraction: new Date(),
          preferredFunctions: []
        });
      }
    }
  }

  private announcePlugin(): void {
    const announcement = {
      pluginId: this.config.pluginId,
      version: this.config.version,
      capabilities: this.config.capabilities,
      timestamp: Date.now()
    };
    
    globalEventBus.emit('plugin-announcement', announcement, this.config.pluginId);
  }

  private startBatchProcessor(): void {
    this.batchProcessor = setInterval(() => {
      this.processBatch();
    }, this.config.batchProcessing.maxWaitTime);
  }

  private processBatch(): void {
    if (this.batchQueue.length === 0) return;

    // Take batch
    const batch = this.batchQueue.splice(0, this.config.batchProcessing.batchSize);
    
    console.log(`[Editorial-Functions Bridge] Processing batch of ${batch.length} functions`);
    
    // Process batch (placeholder)
    for (const request of batch) {
      this.functionQueue.pending.push(request);
    }
  }

  private generateId(): string {
    return `editorial-bridge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const crossPluginBridge = CrossPluginBridge.getInstance();