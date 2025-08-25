/**
 * @fileoverview Cross-Plugin Communication Bridge for Writerr Chat Plugin
 * Handles communication with other Writerr plugins and coordinates chat interactions
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
  ChatMessageSentPayload,
  ChatResponseReceivedPayload,
  ChatModeChangedPayload,
  DocumentChangeDetectedPayload,
  EditSuggestionCreatedPayload,
  AIProviderRequestPayload,
  FunctionExecutedPayload
} from '@writerr/shared/events/CrossPluginEvents';
import { ChatMessage, ChatMode } from '../interface/types';

export interface ChatBridgeConfig {
  pluginId: string;
  version: string;
  capabilities: string[];
  autoSyncModes: boolean;
  shareConversations: boolean;
  documentIntegration: boolean;
  functionIntegration: boolean;
  eventThrottling: {
    enabled: boolean;
    maxEventsPerSecond: number;
  };
}

export interface ConversationSync {
  conversationId: string;
  sharedWith: string[];
  syncLevel: 'full' | 'metadata' | 'none';
  lastSync: Date;
}

export interface DocumentContext {
  documentId: string;
  activeSelection?: {
    start: number;
    end: number;
    text: string;
  };
  recentChanges: Array<{
    timestamp: Date;
    type: string;
    position: { start: number; end: number };
  }>;
  editSuggestions: Array<{
    id: string;
    position: { start: number; end: number };
    suggestion: string;
    confidence: number;
  }>;
}

export class CrossPluginBridge {
  private static instance: CrossPluginBridge;
  private config: ChatBridgeConfig;
  private isInitialized = false;
  
  // Plugin connections and state
  private connectedPlugins = new Map<string, {
    pluginId: string;
    capabilities: string[];
    lastHeartbeat: Date;
    messageQueue: CrossPluginEvent[];
  }>();
  
  // Conversation synchronization
  private conversationSyncs = new Map<string, ConversationSync>();
  
  // Document context tracking
  private documentContexts = new Map<string, DocumentContext>();
  
  // Event handling
  private subscriptions = new Map<string, CrossPluginEventSubscription>();
  private eventHandlers = new Map<CrossPluginEventType, CrossPluginEventHandler[]>();
  
  // Rate limiting and throttling
  private eventCounts = new Map<string, { count: number; resetTime: Date }>();
  
  // Statistics
  private stats = {
    messagesRouted: 0,
    documentContextUpdates: 0,
    modeChanges: 0,
    aiRequestsTriggered: 0,
    functionsInvoked: 0,
    errorCount: 0,
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
   * Initialize the chat bridge
   */
  async initialize(config?: Partial<ChatBridgeConfig>): Promise<void> {
    if (this.isInitialized) return;

    if (config) {
      this.config = { ...this.config, ...config };
    }

    try {
      // Set up event listeners
      this.setupEventListeners();
      
      // Announce chat plugin presence
      this.announcePlugin();
      
      // Start background processes
      this.startBackgroundProcessing();

      this.isInitialized = true;
      
      console.log('[Writerr-Chat Bridge] Initialized successfully');
    } catch (error) {
      console.error('[Writerr-Chat Bridge] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Send a chat message event
   */
  async sendChatMessage(
    conversationId: string,
    messageType: 'user' | 'assistant' | 'system',
    content: string,
    mode: ChatMode,
    context?: any
  ): Promise<void> {
    const event = CrossPluginEventFactory.createChatMessage(
      conversationId,
      messageType,
      content.length,
      { id: mode.id, name: mode.name },
      context || {},
      this.config.pluginId
    );

    await this.sendEvent(event);
    this.stats.messagesRouted++;
  }

  /**
   * Notify about chat response received
   */
  async notifyChatResponse(
    conversationId: string,
    messageId: string,
    responseTime: number,
    content: string,
    streaming: boolean,
    providerInfo: { providerId: string; modelId: string },
    tokenUsage: { prompt: number; completion: number; total: number },
    cost: number,
    qualityScore: number
  ): Promise<void> {
    const event: CrossPluginEvent = {
      type: CrossPluginEventType.CHAT_RESPONSE_RECEIVED,
      payload: {
        timestamp: Date.now(),
        source: this.config.pluginId,
        eventId: this.generateId(),
        version: '1.0',
        conversationId,
        messageId,
        responseTime,
        contentLength: content.length,
        streaming,
        providerInfo,
        tokenUsage,
        cost,
        qualityScore
      },
      metadata: {
        priority: 'medium',
        persistent: true,
        retryable: false
      }
    };

    await this.sendEvent(event);
  }

  /**
   * Notify about chat mode change
   */
  async notifyModeChange(
    conversationId: string,
    previousMode: ChatMode,
    newMode: ChatMode,
    reason: 'user-selection' | 'auto-detection' | 'context-change'
  ): Promise<void> {
    const event: CrossPluginEvent = {
      type: CrossPluginEventType.CHAT_MODE_CHANGED,
      payload: {
        timestamp: Date.now(),
        source: this.config.pluginId,
        eventId: this.generateId(),
        version: '1.0',
        conversationId,
        previousMode: { id: previousMode.id, name: previousMode.name },
        newMode: { id: newMode.id, name: newMode.name },
        reason
      },
      metadata: {
        priority: 'medium',
        persistent: true,
        retryable: false
      }
    };

    await this.sendEvent(event);
    this.stats.modeChanges++;
  }

  /**
   * Request AI processing through AI Providers
   */
  async requestAIProcessing(
    messages: ChatMessage[],
    mode: ChatMode,
    options: {
      provider?: string;
      model?: string;
      streaming?: boolean;
      priority?: 'low' | 'medium' | 'high';
    } = {}
  ): Promise<void> {
    const event = CrossPluginEventFactory.createAIProviderRequest(
      options.provider || 'auto-select',
      options.model || 'auto-select',
      options.streaming ? 'streaming' : 'completion',
      {
        pluginId: this.config.pluginId,
        messageCount: messages.length
      }
    );

    // Add priority if specified
    if (options.priority) {
      event.metadata.priority = options.priority;
    }

    await this.sendEvent(event);
    this.stats.aiRequestsTriggered++;
  }

  /**
   * Invoke editorial function
   */
  async invokeEditorialFunction(
    functionName: string,
    input: string,
    documentContext?: DocumentContext
  ): Promise<void> {
    const event: CrossPluginEvent = {
      type: CrossPluginEventType.AI_PROVIDER_REQUEST,
      payload: {
        timestamp: Date.now(),
        source: this.config.pluginId,
        eventId: this.generateId(),
        version: '1.0',
        providerId: 'ai-editorial-functions',
        modelId: 'auto-select',
        requestId: this.generateId(),
        requestType: 'function-call',
        priority: 'medium',
        context: {
          pluginId: this.config.pluginId,
          functionName,
          documentId: documentContext?.documentId
        }
      },
      metadata: {
        priority: 'medium',
        persistent: true,
        retryable: true,
        maxRetries: 3
      }
    };

    await this.sendEvent(event);
    this.stats.functionsInvoked++;
  }

  /**
   * Update document context for current conversation
   */
  updateDocumentContext(
    documentId: string,
    context: Partial<DocumentContext>
  ): void {
    const existing = this.documentContexts.get(documentId) || {
      documentId,
      recentChanges: [],
      editSuggestions: []
    };

    const updated = { ...existing, ...context };
    this.documentContexts.set(documentId, updated);
    
    this.stats.documentContextUpdates++;

    // Notify other plugins of context update
    const event: CrossPluginEvent = {
      type: CrossPluginEventType.CROSS_PLUGIN_SYNC,
      payload: {
        timestamp: Date.now(),
        source: this.config.pluginId,
        eventId: this.generateId(),
        version: '1.0',
        syncType: 'state',
        participants: ['track-edits', 'ai-editorial-functions'],
        data: { documentContext: updated },
        syncResult: { success: true }
      },
      metadata: {
        priority: 'low',
        persistent: false,
        retryable: false
      }
    };

    this.sendEvent(event);
  }

  /**
   * Get current document context
   */
  getDocumentContext(documentId: string): DocumentContext | null {
    return this.documentContexts.get(documentId) || null;
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
   * Get bridge statistics
   */
  getStats(): typeof CrossPluginBridge.prototype.stats {
    return { ...this.stats };
  }

  /**
   * Get connected plugins
   */
  getConnectedPlugins(): Array<{ pluginId: string; capabilities: string[] }> {
    return Array.from(this.connectedPlugins.values()).map(plugin => ({
      pluginId: plugin.pluginId,
      capabilities: plugin.capabilities
    }));
  }

  /**
   * Dispose of the bridge
   */
  dispose(): void {
    this.isInitialized = false;
    this.subscriptions.clear();
    this.eventHandlers.clear();
    this.connectedPlugins.clear();
    this.conversationSyncs.clear();
    this.documentContexts.clear();
    this.eventCounts.clear();
  }

  // Private methods

  private getDefaultConfig(): ChatBridgeConfig {
    return {
      pluginId: 'writerr-chat',
      version: '1.0.0',
      capabilities: [
        'chat-interface',
        'mode-switching',
        'document-context',
        'ai-integration',
        'function-invocation',
        'streaming-responses'
      ],
      autoSyncModes: true,
      shareConversations: false,
      documentIntegration: true,
      functionIntegration: true,
      eventThrottling: {
        enabled: true,
        maxEventsPerSecond: 10
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

    // Handle edit suggestions from Track Edits
    this.subscribe(
      { eventTypes: [CrossPluginEventType.EDIT_SUGGESTION_CREATED] },
      {
        handle: async (event) => {
          await this.handleEditSuggestion(event.payload as EditSuggestionCreatedPayload);
        },
        canHandle: (type) => type === CrossPluginEventType.EDIT_SUGGESTION_CREATED,
        priority: 2
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

    // Listen for chat-specific events
    globalEventBus.on('writerr-chat-message-sent', (eventData: EventData) => {
      const { conversationId, message, mode } = eventData.payload;
      this.sendChatMessage(conversationId, 'user', message.content, mode, message.context);
    });

    globalEventBus.on('writerr-chat-mode-changed', (eventData: EventData) => {
      const { conversationId, previousMode, newMode, reason } = eventData.payload;
      this.notifyModeChange(conversationId, previousMode, newMode, reason);
    });
  }

  private async handleIncomingEvent(event: CrossPluginEvent): Promise<void> {
    try {
      // Check throttling
      if (this.config.eventThrottling.enabled && this.isThrottled(event.payload.source)) {
        console.warn('[Writerr-Chat Bridge] Event throttled:', event.type);
        return;
      }

      // Find matching handlers
      const handlers = this.findMatchingHandlers(event);
      
      // Process with each handler
      for (const handler of handlers) {
        try {
          await handler.handle(event);
        } catch (error) {
          console.error('[Writerr-Chat Bridge] Handler error:', error);
          this.stats.errorCount++;
        }
      }
    } catch (error) {
      console.error('[Writerr-Chat Bridge] Error handling incoming event:', error);
      this.stats.errorCount++;
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
    // Update document context with the change
    const context = this.documentContexts.get(payload.documentId) || {
      documentId: payload.documentId,
      recentChanges: [],
      editSuggestions: []
    };

    context.recentChanges.push({
      timestamp: new Date(payload.timestamp),
      type: payload.changeType,
      position: payload.position
    });

    // Keep only last 10 changes
    if (context.recentChanges.length > 10) {
      context.recentChanges.shift();
    }

    this.documentContexts.set(payload.documentId, context);

    // Emit internal event for chat components
    globalEventBus.emit('writerr-chat-document-changed', {
      documentId: payload.documentId,
      change: payload,
      context
    }, this.config.pluginId);
  }

  private async handleEditSuggestion(payload: EditSuggestionCreatedPayload): Promise<void> {
    // Add suggestion to document context
    const context = this.documentContexts.get(payload.documentId) || {
      documentId: payload.documentId,
      recentChanges: [],
      editSuggestions: []
    };

    context.editSuggestions.push({
      id: payload.suggestionId,
      position: payload.position,
      suggestion: payload.suggestion.suggestedText,
      confidence: payload.suggestion.confidence
    });

    // Keep only last 5 suggestions
    if (context.editSuggestions.length > 5) {
      context.editSuggestions.shift();
    }

    this.documentContexts.set(payload.documentId, context);

    // Emit internal event
    globalEventBus.emit('writerr-chat-edit-suggestion', {
      documentId: payload.documentId,
      suggestion: payload,
      context
    }, this.config.pluginId);
  }

  private async handleFunctionExecution(payload: FunctionExecutedPayload): Promise<void> {
    // If function was triggered from chat, handle the result
    if (payload.success) {
      globalEventBus.emit('writerr-chat-function-result', {
        functionId: payload.functionId,
        functionName: payload.functionName,
        executionId: payload.executionId,
        result: payload,
        quality: payload.qualityMetrics
      }, this.config.pluginId);
    }
  }

  private async handleAIProviderResponse(payload: any): Promise<void> {
    // Handle AI response for chat messages
    if (payload.success && payload.requestId) {
      globalEventBus.emit('writerr-chat-ai-response', {
        requestId: payload.requestId,
        response: payload,
        timestamp: new Date()
      }, this.config.pluginId);
    }
  }

  private async handlePluginLifecycle(payload: any): Promise<void> {
    const { pluginId, status, capabilities } = payload;

    if (status === 'loaded') {
      this.connectedPlugins.set(pluginId, {
        pluginId,
        capabilities: capabilities || [],
        lastHeartbeat: new Date(),
        messageQueue: []
      });
    } else if (status === 'unloaded') {
      this.connectedPlugins.delete(pluginId);
    }
  }

  private async sendEvent(event: CrossPluginEvent): Promise<boolean> {
    try {
      if (!CrossPluginEventValidator.validateEvent(event)) {
        throw new Error('Invalid event format');
      }

      globalEventBus.emit('cross-plugin-event', event, this.config.pluginId);
      return true;
    } catch (error) {
      console.error('[Writerr-Chat Bridge] Error sending event:', error);
      this.stats.errorCount++;
      return false;
    }
  }

  private isThrottled(source: string): boolean {
    const now = new Date();
    const key = `${source}-throttle`;
    const existing = this.eventCounts.get(key);

    if (!existing || now >= existing.resetTime) {
      this.eventCounts.set(key, {
        count: 1,
        resetTime: new Date(now.getTime() + 1000) // Reset every second
      });
      return false;
    }

    if (existing.count >= this.config.eventThrottling.maxEventsPerSecond) {
      return true;
    }

    existing.count++;
    return false;
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

  private startBackgroundProcessing(): void {
    // Clean up old document contexts every 5 minutes
    setInterval(() => {
      const cutoff = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      
      for (const [documentId, context] of this.documentContexts.entries()) {
        const hasRecentActivity = context.recentChanges.some(change => change.timestamp > cutoff);
        
        if (!hasRecentActivity) {
          this.documentContexts.delete(documentId);
        }
      }
    }, 5 * 60 * 1000);

    // Clean up event counts every minute
    setInterval(() => {
      const now = new Date();
      for (const [key, data] of this.eventCounts.entries()) {
        if (now >= data.resetTime) {
          this.eventCounts.delete(key);
        }
      }
    }, 60 * 1000);

    // Send heartbeat every 30 seconds
    setInterval(() => {
      globalEventBus.emit('plugin-heartbeat', {
        pluginId: this.config.pluginId,
        timestamp: Date.now(),
        stats: this.stats
      }, this.config.pluginId);
    }, 30 * 1000);
  }

  private generateId(): string {
    return `chat-bridge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const crossPluginBridge = CrossPluginBridge.getInstance();