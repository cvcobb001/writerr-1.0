/**
 * @fileoverview Unified AI Providers Adapter for Writerr Chat Plugin
 * Provides consistent AI model access with cross-plugin integration and streaming support
 */

import { globalEventBus, EventData } from '@writerr/shared';
import { ChatMessage, ChatMode, DocumentContext } from '../interface/types';

export interface StreamingResponse {
  id: string;
  provider: string;
  model: string;
  stream: ReadableStream;
  metadata: {
    requestId: string;
    startTime: number;
    expectedTokens?: number;
  };
}

export interface ChatModelConfig {
  providerId: string;
  modelId: string;
  displayName: string;
  capabilities: {
    streaming: boolean;
    functionCalling: boolean;
    codeExecution: boolean;
    imageAnalysis: boolean;
    maxContextLength: number;
  };
  parameters: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  };
  constraints: {
    maxRequestsPerMinute: number;
    maxTokensPerRequest: number;
    maxConcurrentRequests: number;
    costPerToken: number;
  };
  performance: {
    averageLatency: number;
    streamingLatency: number;
    reliability: number;
    qualityScore: number;
    lastUpdated: Date;
  };
}

export interface ChatRequest {
  id: string;
  messages: ChatMessage[];
  mode: ChatMode;
  context?: DocumentContext;
  streaming: boolean;
  modelConfig: ChatModelConfig;
  parameters: {
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
  };
  metadata: {
    timestamp: Date;
    priority: 'low' | 'medium' | 'high';
    userId?: string;
  };
}

export interface ChatResponse {
  id: string;
  success: boolean;
  content: string;
  finishReason: 'stop' | 'length' | 'function_call' | 'error';
  model: {
    provider: string;
    model: string;
  };
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
  metadata: {
    processingTime: number;
    qualityScore: number;
    confidence: number;
    timestamp: Date;
    isFromCache: boolean;
  };
  error?: string;
}

export interface ConversationContext {
  id: string;
  messages: ChatMessage[];
  mode: ChatMode;
  documentContext?: DocumentContext;
  metadata: {
    startTime: Date;
    messageCount: number;
    totalTokens: number;
    cost: number;
  };
}

export class AIProvidersAdapter {
  private static instance: AIProvidersAdapter;
  private isInitialized = false;
  private aiProvidersAPI: any = null;
  
  // Model configurations
  private modelConfigs = new Map<string, ChatModelConfig>();
  
  // Circuit breakers and rate limiting
  private circuitBreakers = new Map<string, {
    state: 'closed' | 'open' | 'half-open';
    failures: number;
    lastFailure: number;
    nextRetry: number;
  }>();
  
  private rateLimiters = new Map<string, {
    requestCount: number;
    windowStart: number;
    isThrottled: boolean;
    nextReset: number;
  }>();
  
  // Response caching
  private responseCache = new Map<string, {
    response: ChatResponse;
    expiresAt: number;
  }>();
  
  // Active conversations
  private activeConversations = new Map<string, ConversationContext>();
  
  // Streaming connections
  private activeStreams = new Map<string, StreamingResponse>();
  
  // Request queue for batch processing
  private requestQueue: Array<{
    request: ChatRequest;
    resolve: (response: ChatResponse) => void;
    reject: (error: Error) => void;
    queuedAt: number;
  }> = [];
  
  private processingQueue = false;
  
  private constructor() {
    this.setupEventListeners();
    this.initializeDefaultConfigs();
  }

  static getInstance(): AIProvidersAdapter {
    if (!AIProvidersAdapter.instance) {
      AIProvidersAdapter.instance = new AIProvidersAdapter();
    }
    return AIProvidersAdapter.instance;
  }

  /**
   * Initialize the adapter with AI Providers plugin integration
   */
  async initialize(): Promise<boolean> {
    try {
      // Check AI Providers availability
      const isAvailable = await this.checkAIProvidersAvailability();
      if (!isAvailable) {
        console.warn('[WriterChat-AIAdapter] AI Providers plugin not available');
        return false;
      }

      // Get API reference
      this.aiProvidersAPI = this.getAIProvidersAPI();
      if (!this.aiProvidersAPI) {
        console.error('[WriterChat-AIAdapter] Failed to get AI Providers API');
        return false;
      }

      // Initialize rate limiters and circuit breakers
      await this.initializeProviderManagement();
      
      // Load available models
      await this.loadAvailableModels();

      this.isInitialized = true;
      
      globalEventBus.emit('writerr-chat-ai-adapter-ready', {
        pluginId: 'writerr-chat',
        availableModels: this.getAvailableModels(),
        timestamp: new Date()
      }, 'writerr-chat-ai-adapter');

      console.log('[WriterChat-AIAdapter] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[WriterChat-AIAdapter] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Send a chat message and get response
   */
  async sendMessage(
    messages: ChatMessage[],
    mode: ChatMode,
    documentContext?: DocumentContext,
    options: {
      provider?: string;
      model?: string;
      streaming?: boolean;
      useCache?: boolean;
      priority?: 'low' | 'medium' | 'high';
    } = {}
  ): Promise<ChatResponse> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const requestId = this.generateRequestId();

    try {
      // Select optimal model
      const selectedModel = await this.selectOptimalModel(mode, messages, options);
      
      // Check if can make request (circuit breaker + rate limits)
      if (!this.canMakeRequest(selectedModel.providerId)) {
        throw new Error(`Provider ${selectedModel.providerId} unavailable`);
      }

      // Build request
      const chatRequest: ChatRequest = {
        id: requestId,
        messages,
        mode,
        context: documentContext,
        streaming: options.streaming || false,
        modelConfig: selectedModel,
        parameters: {
          temperature: selectedModel.parameters.temperature || 0.7,
          maxTokens: selectedModel.parameters.maxTokens || 2000,
          systemPrompt: this.buildSystemPrompt(mode, documentContext)
        },
        metadata: {
          timestamp: new Date(),
          priority: options.priority || 'medium',
          userId: documentContext?.userId
        }
      };

      // Check cache first
      if (options.useCache !== false && !options.streaming) {
        const cached = this.getCachedResponse(chatRequest);
        if (cached) {
          return { ...cached, metadata: { ...cached.metadata, isFromCache: true } };
        }
      }

      // Handle streaming vs non-streaming
      if (options.streaming) {
        return await this.handleStreamingRequest(chatRequest);
      } else {
        return await this.handleRegularRequest(chatRequest);
      }

    } catch (error) {
      console.error('[WriterChat-AIAdapter] Request failed:', error);
      throw error;
    }
  }

  /**
   * Stream a chat response for real-time updates
   */
  async streamMessage(
    messages: ChatMessage[],
    mode: ChatMode,
    documentContext?: DocumentContext,
    onChunk?: (chunk: string, isComplete?: boolean) => void,
    options: any = {}
  ): Promise<ChatResponse> {
    const response = await this.sendMessage(messages, mode, documentContext, {
      ...options,
      streaming: true
    });

    // Handle streaming chunks if callback provided
    if (onChunk && response.id) {
      const stream = this.activeStreams.get(response.id);
      if (stream && stream.stream) {
        await this.processStream(stream.stream, onChunk);
      }
    }

    return response;
  }

  /**
   * Get conversation context
   */
  getConversation(conversationId: string): ConversationContext | null {
    return this.activeConversations.get(conversationId) || null;
  }

  /**
   * Start a new conversation
   */
  startConversation(mode: ChatMode, documentContext?: DocumentContext): string {
    const conversationId = this.generateRequestId();
    
    this.activeConversations.set(conversationId, {
      id: conversationId,
      messages: [],
      mode,
      documentContext,
      metadata: {
        startTime: new Date(),
        messageCount: 0,
        totalTokens: 0,
        cost: 0
      }
    });

    globalEventBus.emit('conversation-started', {
      conversationId,
      mode: mode.id
    }, 'writerr-chat-ai-adapter');

    return conversationId;
  }

  /**
   * End a conversation
   */
  endConversation(conversationId: string): void {
    const conversation = this.activeConversations.get(conversationId);
    if (conversation) {
      globalEventBus.emit('conversation-ended', {
        conversationId,
        metadata: conversation.metadata
      }, 'writerr-chat-ai-adapter');

      this.activeConversations.delete(conversationId);
    }
  }

  /**
   * Get available AI models
   */
  getAvailableModels(): ChatModelConfig[] {
    return Array.from(this.modelConfigs.values())
      .filter(model => this.canMakeRequest(model.providerId))
      .sort((a, b) => b.performance.qualityScore - a.performance.qualityScore);
  }

  /**
   * Get provider health status
   */
  getProviderHealth(): Record<string, {
    isAvailable: boolean;
    circuitBreakerState: string;
    requestsThisMinute: number;
    averageLatency: number;
    reliability: number;
  }> {
    const health: Record<string, any> = {};
    
    for (const [providerId, circuitBreaker] of this.circuitBreakers.entries()) {
      const rateLimiter = this.rateLimiters.get(providerId);
      const models = Array.from(this.modelConfigs.values())
        .filter(m => m.providerId === providerId);
      
      const avgLatency = models.reduce((sum, m) => sum + m.performance.averageLatency, 0) / models.length;
      const avgReliability = models.reduce((sum, m) => sum + m.performance.reliability, 0) / models.length;
      
      health[providerId] = {
        isAvailable: circuitBreaker.state === 'closed',
        circuitBreakerState: circuitBreaker.state,
        requestsThisMinute: rateLimiter?.requestCount || 0,
        averageLatency: avgLatency || 0,
        reliability: avgReliability || 0
      };
    }
    
    return health;
  }

  /**
   * Update model configuration
   */
  updateModelConfig(providerId: string, modelId: string, updates: Partial<ChatModelConfig>): void {
    const key = `${providerId}:${modelId}`;
    const existing = this.modelConfigs.get(key);
    
    if (existing) {
      this.modelConfigs.set(key, { ...existing, ...updates });
      
      globalEventBus.emit('chat-model-config-updated', {
        providerId,
        modelId,
        updates
      }, 'writerr-chat-ai-adapter');
    }
  }

  /**
   * Clear response cache
   */
  clearCache(): void {
    this.responseCache.clear();
    globalEventBus.emit('chat-cache-cleared', {}, 'writerr-chat-ai-adapter');
  }

  /**
   * Get adapter statistics
   */
  getStats(): {
    totalMessages: number;
    activeConversations: number;
    cacheHitRate: number;
    providerUsage: Record<string, number>;
    averageResponseTime: number;
    totalCost: number;
  } {
    const totalConversations = this.activeConversations.size;
    const totalCost = Array.from(this.activeConversations.values())
      .reduce((sum, conv) => sum + conv.metadata.cost, 0);
    
    return {
      totalMessages: 0, // Would track in real implementation
      activeConversations: totalConversations,
      cacheHitRate: 0,
      providerUsage: {},
      averageResponseTime: 0,
      totalCost
    };
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.isInitialized = false;
    this.aiProvidersAPI = null;
    this.modelConfigs.clear();
    this.circuitBreakers.clear();
    this.rateLimiters.clear();
    this.responseCache.clear();
    this.activeConversations.clear();
    this.activeStreams.clear();
    this.requestQueue.length = 0;
  }

  // Private methods

  private async checkAIProvidersAvailability(): Promise<boolean> {
    try {
      return new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(false), 2000);
        
        globalEventBus.once('ai-providers-ping-response', () => {
          clearTimeout(timeout);
          resolve(true);
        });
        
        globalEventBus.emit('ai-providers-ping', {}, 'writerr-chat-ai-adapter');
      });
    } catch {
      return false;
    }
  }

  private getAIProvidersAPI(): any {
    try {
      // Try window global first
      if ((window as any).AISwitchboard) {
        return (window as any).AISwitchboard;
      }
      
      // Fallback to event-based API
      return {
        request: (request: any) => this.makeEventBasedRequest(request),
        streamRequest: (request: any) => this.makeEventBasedStreamRequest(request),
        getProviders: () => this.getEventBasedProviders(),
        getModels: (providerId: string) => this.getEventBasedModels(providerId)
      };
    } catch (error) {
      console.error('[WriterChat-AIAdapter] Error accessing AI Providers API:', error);
      return null;
    }
  }

  private async initializeProviderManagement(): Promise<void> {
    const commonProviders = ['openai', 'anthropic', 'ollama', 'local'];
    
    for (const providerId of commonProviders) {
      // Initialize circuit breakers
      this.circuitBreakers.set(providerId, {
        state: 'closed',
        failures: 0,
        lastFailure: 0,
        nextRetry: 0
      });
      
      // Initialize rate limiters
      this.rateLimiters.set(providerId, {
        requestCount: 0,
        windowStart: Date.now(),
        isThrottled: false,
        nextReset: Date.now() + 60000
      });
    }
  }

  private async loadAvailableModels(): Promise<void> {
    try {
      const providers = await this.getEventBasedProviders();
      
      for (const provider of providers) {
        const models = await this.getEventBasedModels(provider.id);
        
        for (const model of models) {
          const config = this.createModelConfig(provider.id, model);
          const key = `${provider.id}:${model.id}`;
          this.modelConfigs.set(key, config);
        }
      }
    } catch (error) {
      console.error('[WriterChat-AIAdapter] Failed to load models:', error);
      // Use defaults if loading fails
      this.loadDefaultModels();
    }
  }

  private loadDefaultModels(): void {
    const defaults = [
      { providerId: 'openai', modelId: 'gpt-4', displayName: 'GPT-4' },
      { providerId: 'openai', modelId: 'gpt-3.5-turbo', displayName: 'GPT-3.5 Turbo' },
      { providerId: 'anthropic', modelId: 'claude-3-sonnet', displayName: 'Claude 3 Sonnet' },
      { providerId: 'anthropic', modelId: 'claude-3-haiku', displayName: 'Claude 3 Haiku' }
    ];
    
    for (const { providerId, modelId, displayName } of defaults) {
      const config = this.createDefaultModelConfig(providerId, modelId, displayName);
      const key = `${providerId}:${modelId}`;
      this.modelConfigs.set(key, config);
    }
  }

  private createModelConfig(providerId: string, modelInfo: any): ChatModelConfig {
    return {
      providerId,
      modelId: modelInfo.id,
      displayName: modelInfo.name || modelInfo.id,
      capabilities: {
        streaming: modelInfo.capabilities?.streaming || true,
        functionCalling: modelInfo.capabilities?.functionCalling || false,
        codeExecution: modelInfo.capabilities?.codeExecution || false,
        imageAnalysis: modelInfo.capabilities?.imageAnalysis || false,
        maxContextLength: modelInfo.capabilities?.maxContextLength || 4000
      },
      parameters: {
        temperature: 0.7,
        maxTokens: 2000,
        topP: 0.9,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0
      },
      constraints: {
        maxRequestsPerMinute: 60,
        maxTokensPerRequest: 4000,
        maxConcurrentRequests: 5,
        costPerToken: 0.00003
      },
      performance: {
        averageLatency: 2000,
        streamingLatency: 500,
        reliability: 0.95,
        qualityScore: 0.85,
        lastUpdated: new Date()
      }
    };
  }

  private createDefaultModelConfig(providerId: string, modelId: string, displayName: string): ChatModelConfig {
    const baseConfig: Partial<ChatModelConfig> = {
      providerId,
      modelId,
      displayName
    };
    
    // Provider-specific defaults
    if (providerId === 'openai') {
      return this.createModelConfig(providerId, {
        id: modelId,
        name: displayName,
        capabilities: {
          streaming: true,
          functionCalling: modelId === 'gpt-4',
          maxContextLength: modelId === 'gpt-4' ? 8000 : 4000
        }
      });
    } else if (providerId === 'anthropic') {
      return this.createModelConfig(providerId, {
        id: modelId,
        name: displayName,
        capabilities: {
          streaming: true,
          functionCalling: false,
          maxContextLength: 100000
        }
      });
    }
    
    return this.createModelConfig(providerId, {
      id: modelId,
      name: displayName,
      capabilities: {}
    });
  }

  private async selectOptimalModel(
    mode: ChatMode,
    messages: ChatMessage[],
    options: any
  ): Promise<ChatModelConfig> {
    // Use specified model if provided
    if (options.provider && options.model) {
      const key = `${options.provider}:${options.model}`;
      const config = this.modelConfigs.get(key);
      if (config && this.canMakeRequest(config.providerId)) {
        return config;
      }
    }

    // Calculate message context length
    const totalTokens = messages.reduce((sum, msg) => sum + msg.content.length / 4, 0);
    
    // Select based on requirements
    const candidates = Array.from(this.modelConfigs.values())
      .filter(model => this.canMakeRequest(model.providerId))
      .filter(model => model.capabilities.maxContextLength >= totalTokens);
    
    if (candidates.length === 0) {
      throw new Error('No available models can handle the request');
    }
    
    // For streaming requests, prioritize streaming performance
    if (options.streaming) {
      return candidates
        .filter(m => m.capabilities.streaming)
        .sort((a, b) => a.performance.streamingLatency - b.performance.streamingLatency)[0];
    }
    
    // For complex modes, prioritize quality
    if (mode.capabilities?.some(cap => cap.type === 'advanced-analysis')) {
      return candidates
        .sort((a, b) => b.performance.qualityScore - a.performance.qualityScore)[0];
    }
    
    // Default: balance quality and speed
    return candidates
      .sort((a, b) => {
        const scoreA = a.performance.qualityScore - (a.performance.averageLatency / 10000);
        const scoreB = b.performance.qualityScore - (b.performance.averageLatency / 10000);
        return scoreB - scoreA;
      })[0];
  }

  private canMakeRequest(providerId: string): boolean {
    const circuitBreaker = this.circuitBreakers.get(providerId);
    const rateLimiter = this.rateLimiters.get(providerId);
    
    if (!circuitBreaker || !rateLimiter) return false;
    
    // Check circuit breaker
    if (circuitBreaker.state === 'open') {
      if (Date.now() >= circuitBreaker.nextRetry) {
        circuitBreaker.state = 'half-open';
      } else {
        return false;
      }
    }
    
    // Check rate limits
    const now = Date.now();
    if (now >= rateLimiter.nextReset) {
      rateLimiter.requestCount = 0;
      rateLimiter.windowStart = now;
      rateLimiter.nextReset = now + 60000;
      rateLimiter.isThrottled = false;
    }
    
    const model = Array.from(this.modelConfigs.values())
      .find(m => m.providerId === providerId);
    
    if (model && rateLimiter.requestCount >= model.constraints.maxRequestsPerMinute) {
      rateLimiter.isThrottled = true;
      return false;
    }
    
    return true;
  }

  private buildSystemPrompt(mode: ChatMode, context?: DocumentContext): string {
    let prompt = mode.prompt || `You are a helpful AI assistant in ${mode.name} mode.`;
    
    if (context?.selection?.text) {
      prompt += `\n\nSelected text: "${context.selection.text}"`;
    }
    
    if (context?.projectContext?.length) {
      prompt += '\n\nProject context:';
      context.projectContext.forEach(ctx => {
        prompt += `\n- ${ctx.filePath}: ${ctx.relationship}`;
      });
    }
    
    if (mode.trackEditsIntegration) {
      prompt += '\n\nYou can suggest edits that will be tracked in the document. Format suggestions clearly.';
    }
    
    return prompt;
  }

  private async handleRegularRequest(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();
    
    try {
      const aiRequest = this.prepareAIRequest(request);
      const response = await this.makeAIRequest(aiRequest);
      
      const chatResponse = this.processAIResponse(response, request, startTime);
      
      // Update provider stats
      this.updateProviderStats(request.modelConfig.providerId, true, Date.now() - startTime);
      
      // Cache response if enabled
      this.cacheResponse(request, chatResponse);
      
      // Update conversation if part of one
      this.updateConversation(request, chatResponse);
      
      return chatResponse;
    } catch (error) {
      this.updateProviderStats(request.modelConfig.providerId, false, Date.now() - startTime);
      throw error;
    }
  }

  private async handleStreamingRequest(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();
    
    try {
      const aiRequest = this.prepareAIRequest(request, true);
      const streamResponse = await this.makeStreamingRequest(aiRequest);
      
      // Store streaming response
      this.activeStreams.set(request.id, streamResponse);
      
      // Return initial response structure
      const chatResponse: ChatResponse = {
        id: request.id,
        success: true,
        content: '', // Will be filled as stream progresses
        finishReason: 'stop',
        model: {
          provider: request.modelConfig.providerId,
          model: request.modelConfig.modelId
        },
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          estimatedCost: 0
        },
        metadata: {
          processingTime: 0,
          qualityScore: 0.8,
          confidence: 0.8,
          timestamp: new Date(),
          isFromCache: false
        }
      };
      
      return chatResponse;
    } catch (error) {
      this.updateProviderStats(request.modelConfig.providerId, false, Date.now() - startTime);
      throw error;
    }
  }

  private prepareAIRequest(request: ChatRequest, streaming = false): any {
    return {
      id: request.id,
      providerId: request.modelConfig.providerId,
      modelId: request.modelConfig.modelId,
      messages: [
        { role: 'system', content: request.parameters.systemPrompt },
        ...request.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp
        }))
      ],
      parameters: {
        ...request.modelConfig.parameters,
        ...request.parameters
      },
      streaming,
      metadata: {
        source: 'writerr-chat',
        mode: request.mode.id,
        priority: request.metadata.priority,
        timestamp: request.metadata.timestamp
      }
    };
  }

  private async makeAIRequest(request: any): Promise<any> {
    if (this.aiProvidersAPI.request) {
      return await this.aiProvidersAPI.request(request);
    } else {
      return await this.makeEventBasedRequest(request);
    }
  }

  private async makeStreamingRequest(request: any): Promise<StreamingResponse> {
    if (this.aiProvidersAPI.streamRequest) {
      const stream = await this.aiProvidersAPI.streamRequest(request);
      return {
        id: request.id,
        provider: request.providerId,
        model: request.modelId,
        stream,
        metadata: {
          requestId: request.id,
          startTime: Date.now()
        }
      };
    } else {
      return await this.makeEventBasedStreamRequest(request);
    }
  }

  private processAIResponse(response: any, request: ChatRequest, startTime: number): ChatResponse {
    const processingTime = Date.now() - startTime;
    
    return {
      id: request.id,
      success: true,
      content: response.content,
      finishReason: response.finishReason || 'stop',
      model: {
        provider: request.modelConfig.providerId,
        model: request.modelConfig.modelId
      },
      usage: {
        promptTokens: response.usage?.promptTokens || 0,
        completionTokens: response.usage?.completionTokens || 0,
        totalTokens: response.usage?.totalTokens || 0,
        estimatedCost: (response.usage?.totalTokens || 0) * request.modelConfig.constraints.costPerToken
      },
      metadata: {
        processingTime,
        qualityScore: this.calculateResponseQuality(response.content),
        confidence: response.confidence || 0.8,
        timestamp: new Date(),
        isFromCache: false
      }
    };
  }

  private calculateResponseQuality(content: string): number {
    // Simple quality heuristics
    let score = 0.5;
    
    if (content.length > 100) score += 0.2;
    if (content.includes('\n\n')) score += 0.1;
    if (content.match(/\b(because|therefore|however|moreover)\b/gi)) score += 0.1;
    if (content.split('.').length > 3) score += 0.1;
    
    return Math.min(score, 1.0);
  }

  private updateProviderStats(providerId: string, success: boolean, latency: number): void {
    const circuitBreaker = this.circuitBreakers.get(providerId);
    const rateLimiter = this.rateLimiters.get(providerId);
    
    if (!circuitBreaker || !rateLimiter) return;
    
    if (success) {
      circuitBreaker.failures = 0;
      circuitBreaker.state = 'closed';
      rateLimiter.requestCount++;
    } else {
      circuitBreaker.failures++;
      circuitBreaker.lastFailure = Date.now();
      
      if (circuitBreaker.failures >= 5) {
        circuitBreaker.state = 'open';
        circuitBreaker.nextRetry = Date.now() + 60000; // 1 minute
      }
    }
  }

  private getCachedResponse(request: ChatRequest): ChatResponse | null {
    const cacheKey = this.generateCacheKey(request);
    const cached = this.responseCache.get(cacheKey);
    
    if (cached && cached.expiresAt > Date.now()) {
      return cached.response;
    }
    
    return null;
  }

  private cacheResponse(request: ChatRequest, response: ChatResponse): void {
    const cacheKey = this.generateCacheKey(request);
    const expiresAt = Date.now() + 3600000; // 1 hour
    
    this.responseCache.set(cacheKey, { response, expiresAt });
  }

  private generateCacheKey(request: ChatRequest): string {
    const data = {
      messages: request.messages.map(m => ({ role: m.role, content: m.content })),
      mode: request.mode.id,
      model: `${request.modelConfig.providerId}:${request.modelConfig.modelId}`,
      parameters: request.parameters
    };
    
    return `chat-cache-${btoa(JSON.stringify(data)).replace(/[^a-zA-Z0-9]/g, '')}`;
  }

  private updateConversation(request: ChatRequest, response: ChatResponse): void {
    // This would update conversation tracking if conversation ID is provided
    // Implementation depends on conversation management requirements
  }

  private async processStream(stream: ReadableStream, onChunk: (chunk: string, isComplete?: boolean) => void): Promise<void> {
    const reader = stream.getReader();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          onChunk('', true);
          break;
        }
        
        const chunk = new TextDecoder().decode(value);
        onChunk(chunk, false);
      }
    } finally {
      reader.releaseLock();
    }
  }

  private async makeEventBasedRequest(request: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 30000);

      globalEventBus.once(`ai-providers-response-${request.id}`, (event: EventData) => {
        clearTimeout(timeout);
        if (event.payload.success) {
          resolve(event.payload.result);
        } else {
          reject(new Error(event.payload.error));
        }
      });

      globalEventBus.emit('ai-providers-request', request, 'writerr-chat-ai-adapter');
    });
  }

  private async makeEventBasedStreamRequest(request: any): Promise<StreamingResponse> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Stream request timeout'));
      }, 30000);

      globalEventBus.once(`ai-providers-stream-response-${request.id}`, (event: EventData) => {
        clearTimeout(timeout);
        if (event.payload.success) {
          resolve({
            id: request.id,
            provider: request.providerId,
            model: request.modelId,
            stream: event.payload.stream,
            metadata: {
              requestId: request.id,
              startTime: Date.now()
            }
          });
        } else {
          reject(new Error(event.payload.error));
        }
      });

      globalEventBus.emit('ai-providers-stream-request', request, 'writerr-chat-ai-adapter');
    });
  }

  private async getEventBasedProviders(): Promise<any[]> {
    return new Promise((resolve) => {
      globalEventBus.once('ai-providers-list-response', (event: EventData) => {
        resolve(event.payload.providers || []);
      });
      
      globalEventBus.emit('ai-providers-list-request', {}, 'writerr-chat-ai-adapter');
      
      setTimeout(() => resolve([]), 3000);
    });
  }

  private async getEventBasedModels(providerId: string): Promise<any[]> {
    return new Promise((resolve) => {
      globalEventBus.once(`ai-providers-models-response-${providerId}`, (event: EventData) => {
        resolve(event.payload.models || []);
      });
      
      globalEventBus.emit('ai-providers-models-request', { providerId }, 'writerr-chat-ai-adapter');
      
      setTimeout(() => resolve([]), 3000);
    });
  }

  private generateRequestId(): string {
    return `writerr-chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeDefaultConfigs(): void {
    // Set up default configurations
    this.loadDefaultModels();
  }

  private setupEventListeners(): void {
    globalEventBus.on('ai-providers-model-health-update', (event: EventData) => {
      const { providerId, isHealthy } = event.payload;
      this.updateProviderStats(providerId, isHealthy, 0);
    });
    
    globalEventBus.on('ai-providers-plugin-unloaded', () => {
      console.warn('[WriterChat-AIAdapter] AI Providers plugin unloaded');
      this.isInitialized = false;
      this.aiProvidersAPI = null;
    });
    
    globalEventBus.on('conversation-message-added', (event: EventData) => {
      // Handle conversation updates
      const { conversationId, message } = event.payload;
      const conversation = this.activeConversations.get(conversationId);
      if (conversation) {
        conversation.messages.push(message);
        conversation.metadata.messageCount++;
      }
    });
  }
}

// Export singleton instance
export const aiProvidersAdapter = AIProvidersAdapter.getInstance();