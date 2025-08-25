/**
 * @fileoverview Cross-Plugin Communication Bridge for Track Edits Plugin
 * Handles communication with other Writerr plugins and AI Providers
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
  DocumentChangeDetectedPayload,
  EditSuggestionCreatedPayload,
  AIProviderRequestPayload,
  FunctionExecutedPayload,
  PerformanceMetricPayload
} from '@writerr/shared/events/CrossPluginEvents';
import { Change, ChangeStatus, ChangeType } from '../types';

export interface BridgeConfig {
  pluginId: string;
  version: string;
  capabilities: string[];
  autoSync: boolean;
  eventBuffering: boolean;
  bufferSize: number;
  retryPolicy: {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
  };
}

export interface PluginConnection {
  pluginId: string;
  status: 'connected' | 'disconnected' | 'error';
  capabilities: string[];
  version: string;
  lastHeartbeat: Date;
  messagesSent: number;
  messagesReceived: number;
}

export interface MessageQueue {
  id: string;
  event: CrossPluginEvent;
  retryCount: number;
  nextRetry: Date;
  priority: number;
}

export class CrossPluginBridge {
  private static instance: CrossPluginBridge;
  private config: BridgeConfig;
  private isInitialized = false;
  
  // Plugin connections tracking
  private connections = new Map<string, PluginConnection>();
  
  // Event handling
  private subscriptions = new Map<string, CrossPluginEventSubscription>();
  private handlers = new Map<CrossPluginEventType, CrossPluginEventHandler[]>();
  
  // Message queue and buffering
  private messageQueue: MessageQueue[] = [];
  private eventBuffer: CrossPluginEvent[] = [];
  private processingQueue = false;
  
  // Performance tracking
  private stats = {
    totalEventsSent: 0,
    totalEventsReceived: 0,
    totalEventsProcessed: 0,
    errorCount: 0,
    averageLatency: 0,
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
   * Initialize the cross-plugin bridge
   */
  async initialize(config?: Partial<BridgeConfig>): Promise<void> {
    if (this.isInitialized) return;

    if (config) {
      this.config = { ...this.config, ...config };
    }

    try {
      // Set up event listeners
      this.setupEventListeners();
      
      // Start message processing
      this.startMessageProcessing();
      
      // Discover other plugins
      await this.discoverPlugins();
      
      // Announce our presence
      this.announcePlugin();
      
      this.isInitialized = true;
      
      console.log('[Track-Edits Bridge] Initialized successfully');
    } catch (error) {
      console.error('[Track-Edits Bridge] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Send a cross-plugin event
   */
  async sendEvent(event: CrossPluginEvent): Promise<boolean> {
    if (!this.isInitialized) {
      console.warn('[Track-Edits Bridge] Bridge not initialized');
      return false;
    }

    try {
      // Validate event
      if (!CrossPluginEventValidator.validateEvent(event)) {
        throw new Error('Invalid event format');
      }

      // Add to buffer if buffering is enabled
      if (this.config.eventBuffering && this.eventBuffer.length < this.config.bufferSize) {
        this.eventBuffer.push(event);
        
        // Trigger buffer flush if buffer is full
        if (this.eventBuffer.length >= this.config.bufferSize) {
          this.flushEventBuffer();
        }
        
        return true;
      }

      // Send immediately
      return await this.sendEventImmediate(event);
    } catch (error) {
      console.error('[Track-Edits Bridge] Error sending event:', error);
      this.stats.errorCount++;
      return false;
    }
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
    
    // Also register handler by event types for faster lookup
    if (filter.eventTypes) {
      for (const eventType of filter.eventTypes) {
        if (!this.handlers.has(eventType)) {
          this.handlers.set(eventType, []);
        }
        this.handlers.get(eventType)!.push(handler);
      }
    }
    
    return subscriptionId;
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      subscription.isActive = false;
      this.subscriptions.delete(subscriptionId);
      
      // Remove from handlers map
      if (subscription.filter.eventTypes) {
        for (const eventType of subscription.filter.eventTypes) {
          const handlers = this.handlers.get(eventType);
          if (handlers) {
            const index = handlers.indexOf(subscription.handler);
            if (index > -1) {
              handlers.splice(index, 1);
            }
          }
        }
      }
      
      return true;
    }
    
    return false;
  }

  /**
   * Notify about document changes
   */
  notifyDocumentChange(
    documentId: string,
    changeType: ChangeType,
    position: { start: number; end: number },
    content: { before: string; after: string },
    changeSource: 'user' | 'ai' | 'collaboration' | 'system'
  ): void {
    const event = CrossPluginEventFactory.createDocumentChange(
      documentId,
      this.mapChangeType(changeType),
      position,
      content,
      changeSource,
      this.config.pluginId
    );

    this.sendEvent(event);
  }

  /**
   * Notify about edit suggestions
   */
  notifyEditSuggestion(
    documentId: string,
    position: { start: number; end: number },
    originalText: string,
    suggestedText: string,
    suggestionType: 'grammar' | 'style' | 'content' | 'structure',
    reason: string,
    confidence: number,
    providerInfo?: { providerId: string; modelId: string; functionName?: string }
  ): void {
    const event = CrossPluginEventFactory.createEditSuggestion(
      documentId,
      position,
      {
        type: suggestionType,
        originalText,
        suggestedText,
        reason,
        confidence
      },
      providerInfo || { providerId: 'track-edits', modelId: 'internal' },
      this.config.pluginId
    );

    this.sendEvent(event);
  }

  /**
   * Request AI processing for changes
   */
  async requestAIProcessing(
    changes: Change[],
    requestType: 'analysis' | 'suggestion' | 'quality-check' = 'analysis'
  ): Promise<void> {
    for (const change of changes) {
      const event = CrossPluginEventFactory.createAIProviderRequest(
        'auto-select', // Let the system choose the best provider
        'auto-select', // Let the system choose the best model
        'completion',
        {
          pluginId: this.config.pluginId,
          functionName: requestType,
          documentId: change.documentId || 'unknown'
        }
      );

      await this.sendEvent(event);
    }
  }

  /**
   * Get connection status for all plugins
   */
  getConnections(): PluginConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get bridge statistics
   */
  getStats(): typeof CrossPluginBridge.prototype.stats {
    return { ...this.stats };
  }

  /**
   * Reset bridge statistics
   */
  resetStats(): void {
    this.stats = {
      totalEventsSent: 0,
      totalEventsReceived: 0,
      totalEventsProcessed: 0,
      errorCount: 0,
      averageLatency: 0,
      lastResetTime: new Date()
    };
  }

  /**
   * Flush event buffer manually
   */
  flushEventBuffer(): void {
    if (this.eventBuffer.length === 0) return;

    const events = [...this.eventBuffer];
    this.eventBuffer.length = 0;

    // Send all buffered events
    for (const event of events) {
      this.sendEventImmediate(event);
    }
  }

  /**
   * Dispose of the bridge and clean up resources
   */
  dispose(): void {
    this.isInitialized = false;
    
    // Clear all subscriptions
    this.subscriptions.clear();
    this.handlers.clear();
    
    // Clear message queue
    this.messageQueue.length = 0;
    this.eventBuffer.length = 0;
    
    // Clear connections
    this.connections.clear();
    
    this.processingQueue = false;
  }

  // Private methods

  private getDefaultConfig(): BridgeConfig {
    return {
      pluginId: 'track-edits',
      version: '1.0.0',
      capabilities: [
        'document-tracking',
        'change-detection',
        'edit-suggestions',
        'conflict-resolution',
        'performance-monitoring'
      ],
      autoSync: true,
      eventBuffering: true,
      bufferSize: 10,
      retryPolicy: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000
      }
    };
  }

  private setupCoreHandlers(): void {
    // Handle AI provider responses
    this.subscribe(
      { eventTypes: [CrossPluginEventType.AI_PROVIDER_RESPONSE] },
      {
        handle: async (event) => {
          await this.handleAIProviderResponse(event.payload as any);
        },
        canHandle: (type) => type === CrossPluginEventType.AI_PROVIDER_RESPONSE,
        priority: 1
      }
    );

    // Handle function execution results
    this.subscribe(
      { eventTypes: [CrossPluginEventType.FUNCTION_EXECUTED] },
      {
        handle: async (event) => {
          await this.handleFunctionExecution(event.payload as FunctionExecutedPayload);
        },
        canHandle: (type) => type === CrossPluginEventType.FUNCTION_EXECUTED,
        priority: 1
      }
    );

    // Handle plugin lifecycle events
    this.subscribe(
      { 
        eventTypes: [
          CrossPluginEventType.PLUGIN_LOADED,
          CrossPluginEventType.PLUGIN_UNLOADED
        ]
      },
      {
        handle: async (event) => {
          await this.handlePluginLifecycle(event.payload as any);
        },
        canHandle: (type) => [
          CrossPluginEventType.PLUGIN_LOADED,
          CrossPluginEventType.PLUGIN_UNLOADED
        ].includes(type),
        priority: 2
      }
    );
  }

  private setupEventListeners(): void {
    // Listen for global events
    globalEventBus.on('cross-plugin-event', (eventData: EventData) => {
      this.handleIncomingEvent(eventData.payload as CrossPluginEvent);
    });

    // Listen for plugin-specific events
    globalEventBus.on('track-edits-change-added', (eventData: EventData) => {
      const change = eventData.payload as Change;
      this.notifyDocumentChange(
        change.documentId || 'unknown',
        change.type,
        change.position,
        change.content,
        this.mapChangeSource(change.source)
      );
    });

    // Performance monitoring
    setInterval(() => {
      this.sendPerformanceMetrics();
    }, 30000); // Every 30 seconds
  }

  private async handleIncomingEvent(event: CrossPluginEvent): Promise<void> {
    try {
      this.stats.totalEventsReceived++;
      
      // Find matching handlers
      const handlers = this.findMatchingHandlers(event);
      
      // Process with each handler
      for (const handler of handlers) {
        try {
          await handler.handle(event);
          this.stats.totalEventsProcessed++;
        } catch (error) {
          console.error('[Track-Edits Bridge] Handler error:', error);
          this.stats.errorCount++;
        }
      }
    } catch (error) {
      console.error('[Track-Edits Bridge] Error handling incoming event:', error);
      this.stats.errorCount++;
    }
  }

  private findMatchingHandlers(event: CrossPluginEvent): CrossPluginEventHandler[] {
    const matchingHandlers: CrossPluginEventHandler[] = [];
    
    // First check direct type handlers
    const typeHandlers = this.handlers.get(event.type) || [];
    matchingHandlers.push(...typeHandlers);
    
    // Then check subscription filters
    for (const subscription of this.subscriptions.values()) {
      if (!subscription.isActive) continue;
      
      if (this.eventMatchesFilter(event, subscription.filter)) {
        matchingHandlers.push(subscription.handler);
        subscription.triggerCount++;
        subscription.lastTriggered = new Date();
      }
    }
    
    // Sort by priority (higher priority first)
    return matchingHandlers.sort((a, b) => b.priority - a.priority);
  }

  private eventMatchesFilter(event: CrossPluginEvent, filter: CrossPluginEventFilter): boolean {
    // Check event types
    if (filter.eventTypes && !filter.eventTypes.includes(event.type)) {
      return false;
    }
    
    // Check sources
    if (filter.sources && !filter.sources.includes(event.payload.source)) {
      return false;
    }
    
    // Check priority
    if (filter.priority && !filter.priority.includes(event.metadata.priority)) {
      return false;
    }
    
    // Check custom filter
    if (filter.customFilter && !filter.customFilter(event)) {
      return false;
    }
    
    return true;
  }

  private async sendEventImmediate(event: CrossPluginEvent): Promise<boolean> {
    try {
      const startTime = Date.now();
      
      // Emit through global event bus
      globalEventBus.emit('cross-plugin-event', event, this.config.pluginId);
      
      // Update statistics
      this.stats.totalEventsSent++;
      const latency = Date.now() - startTime;
      this.stats.averageLatency = (this.stats.averageLatency + latency) / 2;
      
      return true;
    } catch (error) {
      console.error('[Track-Edits Bridge] Error sending event immediately:', error);
      
      // Add to retry queue
      this.addToRetryQueue(event);
      
      return false;
    }
  }

  private addToRetryQueue(event: CrossPluginEvent): void {
    const queueItem: MessageQueue = {
      id: this.generateId(),
      event,
      retryCount: 0,
      nextRetry: new Date(Date.now() + this.config.retryPolicy.baseDelay),
      priority: this.getPriorityValue(event.metadata.priority)
    };
    
    this.messageQueue.push(queueItem);
    this.messageQueue.sort((a, b) => b.priority - a.priority);
  }

  private startMessageProcessing(): void {
    setInterval(async () => {
      if (!this.processingQueue && this.messageQueue.length > 0) {
        this.processingQueue = true;
        await this.processMessageQueue();
        this.processingQueue = false;
      }
    }, 5000); // Check every 5 seconds
  }

  private async processMessageQueue(): Promise<void> {
    const now = new Date();
    const toProcess: MessageQueue[] = [];
    
    // Find items ready for retry
    for (let i = 0; i < this.messageQueue.length; i++) {
      const item = this.messageQueue[i];
      if (now >= item.nextRetry) {
        toProcess.push(item);
        this.messageQueue.splice(i, 1);
        i--;
      }
    }
    
    // Process retry items
    for (const item of toProcess) {
      try {
        const success = await this.sendEventImmediate(item.event);
        
        if (!success && item.retryCount < this.config.retryPolicy.maxRetries) {
          // Schedule for retry
          item.retryCount++;
          const delay = Math.min(
            this.config.retryPolicy.baseDelay * Math.pow(2, item.retryCount),
            this.config.retryPolicy.maxDelay
          );
          item.nextRetry = new Date(Date.now() + delay);
          
          this.messageQueue.push(item);
          this.messageQueue.sort((a, b) => b.priority - a.priority);
        }
      } catch (error) {
        console.error('[Track-Edits Bridge] Error processing retry queue:', error);
      }
    }
  }

  private async discoverPlugins(): Promise<void> {
    // Emit discovery request
    globalEventBus.emit('plugin-discovery-request', {
      requesterId: this.config.pluginId,
      timestamp: Date.now()
    }, this.config.pluginId);
    
    // Listen for responses
    globalEventBus.on('plugin-discovery-response', (eventData: EventData) => {
      const pluginInfo = eventData.payload;
      if (pluginInfo.pluginId !== this.config.pluginId) {
        this.connections.set(pluginInfo.pluginId, {
          pluginId: pluginInfo.pluginId,
          status: 'connected',
          capabilities: pluginInfo.capabilities || [],
          version: pluginInfo.version || '1.0.0',
          lastHeartbeat: new Date(),
          messagesSent: 0,
          messagesReceived: 0
        });
      }
    });
  }

  private announcePlugin(): void {
    const announcement = {
      pluginId: this.config.pluginId,
      version: this.config.version,
      capabilities: this.config.capabilities,
      timestamp: Date.now()
    };
    
    globalEventBus.emit('plugin-announcement', announcement, this.config.pluginId);
    
    // Also respond to any pending discovery requests
    globalEventBus.emit('plugin-discovery-response', announcement, this.config.pluginId);
  }

  private async handleAIProviderResponse(payload: any): Promise<void> {
    // Process AI provider response for track edits
    if (payload.success && payload.requestId) {
      // The response might contain suggestions or analysis
      console.log('[Track-Edits Bridge] Received AI response:', payload.requestId);
      
      // Emit internal event for other track-edits components
      globalEventBus.emit('track-edits-ai-response', payload, this.config.pluginId);
    }
  }

  private async handleFunctionExecution(payload: FunctionExecutedPayload): Promise<void> {
    // Handle editorial function results that might affect tracked changes
    if (payload.success && payload.confidence > 0.8) {
      console.log('[Track-Edits Bridge] High-quality function execution:', payload.functionName);
      
      // Could trigger change suggestions or quality improvements
      globalEventBus.emit('track-edits-function-result', payload, this.config.pluginId);
    }
  }

  private async handlePluginLifecycle(payload: any): Promise<void> {
    const { pluginId, status } = payload;
    
    const connection = this.connections.get(pluginId);
    if (connection) {
      connection.status = status === 'loaded' ? 'connected' : 'disconnected';
      connection.lastHeartbeat = new Date();
    } else if (status === 'loaded') {
      this.connections.set(pluginId, {
        pluginId,
        status: 'connected',
        capabilities: payload.capabilities || [],
        version: payload.version || '1.0.0',
        lastHeartbeat: new Date(),
        messagesSent: 0,
        messagesReceived: 0
      });
    }
  }

  private sendPerformanceMetrics(): void {
    const memoryUsage = (performance as any).memory;
    
    if (memoryUsage) {
      const memoryEvent = CrossPluginEventFactory.createPerformanceMetric(
        'resource-usage',
        'track-edits-memory',
        memoryUsage.usedJSHeapSize,
        'bytes',
        { timeWindow: '30s' },
        this.config.pluginId
      );
      
      this.sendEvent(memoryEvent);
    }
    
    // Send bridge statistics
    const statsEvent = CrossPluginEventFactory.createPerformanceMetric(
      'throughput',
      'track-edits-bridge',
      this.stats.totalEventsProcessed,
      'events',
      { timeWindow: '30s', operation: 'event-processing' },
      this.config.pluginId
    );
    
    this.sendEvent(statsEvent);
  }

  private mapChangeType(changeType: ChangeType): DocumentChangeDetectedPayload['changeType'] {
    switch (changeType) {
      case ChangeType.INSERT: return 'insert';
      case ChangeType.DELETE: return 'delete';
      case ChangeType.REPLACE: return 'replace';
      default: return 'replace';
    }
  }

  private mapChangeSource(source: any): DocumentChangeDetectedPayload['changeSource'] {
    if (source.toString().includes('MANUAL')) return 'user';
    if (source.toString().includes('AI')) return 'ai';
    if (source.toString().includes('COLLABORATION')) return 'collaboration';
    return 'system';
  }

  private getPriorityValue(priority: string): number {
    switch (priority) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 2;
    }
  }

  private generateId(): string {
    return `bridge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const crossPluginBridge = CrossPluginBridge.getInstance();