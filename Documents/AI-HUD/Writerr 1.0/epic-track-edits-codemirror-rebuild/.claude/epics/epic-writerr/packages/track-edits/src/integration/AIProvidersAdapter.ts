/**
 * @fileoverview Unified AI Providers Adapter for Track Edits Plugin
 * Provides consistent AI model access with cross-plugin integration
 */

import { globalEventBus, EventData } from '@writerr/shared';
import { Change, ChangeType, ChangeSource } from '../types';

export interface AIModelConfig {
  providerId: string;
  modelId: string;
  parameters: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
  };
  constraints: {
    maxRequestsPerMinute: number;
    maxTokensPerRequest: number;
    maxConcurrentRequests: number;
  };
  performance: {
    averageLatency: number;
    averageQuality: number;
    reliability: number;
    costPerToken: number;
    lastUpdated: Date;
  };
}

export interface AIRequestContext {
  changeType: ChangeType;
  documentContent: string;
  selectionText: string;
  position: { start: number; end: number };
  metadata: {
    documentLength: number;
    language?: string;
    editorMode?: string;
    userPreferences?: any;
  };
}

export interface AIResponse {
  id: string;
  success: boolean;
  content: string;
  confidence: number;
  suggestedChanges: Change[];
  metadata: {
    modelUsed: string;
    providerUsed: string;
    processingTime: number;
    tokenUsage: {
      prompt: number;
      completion: number;
      total: number;
    };
    qualityScore: number;
    timestamp: Date;
  };
  error?: string;
}

export interface CircuitBreakerState {
  providerId: string;
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime: number;
  nextRetryTime: number;
}

export interface RateLimitState {
  providerId: string;
  requestCount: number;
  windowStart: number;
  isThrottled: boolean;
  nextAvailableTime: number;
}

export class AIProvidersAdapter {
  private static instance: AIProvidersAdapter;
  private isInitialized = false;
  private aiProvidersAPI: any = null;
  
  // Circuit breakers for each provider
  private circuitBreakers = new Map<string, CircuitBreakerState>();
  
  // Rate limiting state
  private rateLimitStates = new Map<string, RateLimitState>();
  
  // Response cache
  private responseCache = new Map<string, { response: AIResponse; expiresAt: number }>();
  
  // Model routing configuration
  private modelConfigs = new Map<string, AIModelConfig>();
  
  // Request queue for batch processing
  private requestQueue: Array<{
    id: string;
    context: AIRequestContext;
    resolve: (response: AIResponse) => void;
    reject: (error: Error) => void;
    timestamp: number;
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
      // Check if AI Providers plugin is available
      const aiProvidersAvailable = await this.checkAIProvidersAvailability();
      if (!aiProvidersAvailable) {
        console.warn('[TrackEdits-AIAdapter] AI Providers plugin not available');
        return false;
      }

      // Get AI Providers API
      this.aiProvidersAPI = this.getAIProvidersAPI();
      if (!this.aiProvidersAPI) {
        console.error('[TrackEdits-AIAdapter] Failed to get AI Providers API');
        return false;
      }

      // Initialize circuit breakers for available providers
      await this.initializeCircuitBreakers();
      
      // Initialize rate limiters
      this.initializeRateLimiters();

      this.isInitialized = true;
      
      globalEventBus.emit('track-edits-ai-adapter-ready', {
        pluginId: 'track-edits',
        timestamp: new Date()
      }, 'track-edits-ai-adapter');

      console.log('[TrackEdits-AIAdapter] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[TrackEdits-AIAdapter] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Generate AI suggestions for editing changes
   */
  async generateEditSuggestions(
    context: AIRequestContext,
    options: {
      provider?: string;
      model?: string;
      useCache?: boolean;
      urgency?: 'low' | 'medium' | 'high';
    } = {}
  ): Promise<AIResponse> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // Check cache first if enabled
      if (options.useCache !== false) {
        const cached = this.getCachedResponse(context);
        if (cached) {
          return cached;
        }
      }

      // Select optimal model for the request
      const selectedModel = await this.selectModel(context, options);
      
      // Check circuit breaker
      if (!this.canMakeRequest(selectedModel.providerId)) {
        throw new Error(`Circuit breaker open for provider: ${selectedModel.providerId}`);
      }

      // Check rate limits
      if (!this.checkRateLimit(selectedModel.providerId)) {
        // Queue request if rate limited
        return this.queueRequest(context, options);
      }

      // Prepare the AI request
      const aiRequest = this.prepareRequest(context, selectedModel, requestId);
      
      // Make the request
      const response = await this.makeAIRequest(aiRequest);
      
      // Process and validate response
      const processedResponse = await this.processResponse(response, selectedModel, startTime);
      
      // Update circuit breaker on success
      this.recordSuccess(selectedModel.providerId);
      
      // Update rate limiter
      this.updateRateLimit(selectedModel.providerId);
      
      // Cache the response
      this.cacheResponse(context, processedResponse);
      
      // Emit success event
      globalEventBus.emit('ai-request-completed', {
        requestId,
        success: true,
        provider: selectedModel.providerId,
        model: selectedModel.modelId,
        processingTime: Date.now() - startTime
      }, 'track-edits-ai-adapter');

      return processedResponse;
    } catch (error) {
      console.error('[TrackEdits-AIAdapter] Request failed:', error);
      
      // Record failure for circuit breaker
      if (options.provider) {
        this.recordFailure(options.provider);
      }
      
      // Try fallback if available
      return this.handleRequestFailure(context, options, error as Error, requestId);
    }
  }

  /**
   * Get health status of all AI providers
   */
  getProviderHealth(): Record<string, {
    isAvailable: boolean;
    circuitBreakerState: string;
    rateLimitStatus: string;
    lastSuccessTime: number;
    failureRate: number;
  }> {
    const health: Record<string, any> = {};
    
    for (const [providerId, circuitBreaker] of this.circuitBreakers.entries()) {
      const rateLimitState = this.rateLimitStates.get(providerId);
      
      health[providerId] = {
        isAvailable: circuitBreaker.state === 'closed',
        circuitBreakerState: circuitBreaker.state,
        rateLimitStatus: rateLimitState?.isThrottled ? 'throttled' : 'available',
        lastSuccessTime: circuitBreaker.lastFailureTime,
        failureRate: circuitBreaker.failureCount / 10 // Simple rate calculation
      };
    }
    
    return health;
  }

  /**
   * Update model configuration for a provider
   */
  updateModelConfig(providerId: string, modelId: string, config: Partial<AIModelConfig>): void {
    const key = `${providerId}:${modelId}`;
    const existing = this.modelConfigs.get(key);
    
    if (existing) {
      this.modelConfigs.set(key, { ...existing, ...config });
    } else {
      this.modelConfigs.set(key, this.createDefaultModelConfig(providerId, modelId, config));
    }
    
    globalEventBus.emit('ai-model-config-updated', {
      providerId,
      modelId,
      config
    }, 'track-edits-ai-adapter');
  }

  /**
   * Clear response cache
   */
  clearCache(): void {
    this.responseCache.clear();
    globalEventBus.emit('ai-cache-cleared', {
      source: 'track-edits'
    }, 'track-edits-ai-adapter');
  }

  /**
   * Get adapter statistics
   */
  getStats(): {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    cacheHits: number;
    providerUsage: Record<string, number>;
    averageResponseTime: number;
  } {
    // This would be tracked in a real implementation
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cacheHits: 0,
      providerUsage: {},
      averageResponseTime: 0
    };
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.isInitialized = false;
    this.aiProvidersAPI = null;
    this.circuitBreakers.clear();
    this.rateLimitStates.clear();
    this.responseCache.clear();
    this.requestQueue.length = 0;
    this.processingQueue = false;
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
        
        globalEventBus.emit('ai-providers-ping', {}, 'track-edits-ai-adapter');
      });
    } catch {
      return false;
    }
  }

  private getAIProvidersAPI(): any {
    try {
      // Try window global API first
      if ((window as any).AISwitchboard) {
        return (window as any).AISwitchboard;
      }
      
      // Try event-based API
      return {
        request: (request: any) => this.makeEventBasedRequest(request),
        getProviders: () => this.getEventBasedProviders(),
        isAvailable: () => true
      };
    } catch (error) {
      console.error('[TrackEdits-AIAdapter] Error accessing AI Providers API:', error);
      return null;
    }
  }

  private async initializeCircuitBreakers(): Promise<void> {
    const commonProviders = ['openai', 'anthropic', 'ollama', 'local'];
    
    for (const providerId of commonProviders) {
      this.circuitBreakers.set(providerId, {
        providerId,
        state: 'closed',
        failureCount: 0,
        lastFailureTime: 0,
        nextRetryTime: 0
      });
    }
  }

  private initializeRateLimiters(): void {
    for (const [providerId] of this.circuitBreakers.entries()) {
      this.rateLimitStates.set(providerId, {
        providerId,
        requestCount: 0,
        windowStart: Date.now(),
        isThrottled: false,
        nextAvailableTime: 0
      });
    }
  }

  private initializeDefaultConfigs(): void {
    const defaults = [
      { providerId: 'openai', modelId: 'gpt-4', priority: 1 },
      { providerId: 'anthropic', modelId: 'claude-3-sonnet', priority: 2 },
      { providerId: 'ollama', modelId: 'llama2', priority: 3 }
    ];
    
    for (const { providerId, modelId } of defaults) {
      const key = `${providerId}:${modelId}`;
      this.modelConfigs.set(key, this.createDefaultModelConfig(providerId, modelId));
    }
  }

  private createDefaultModelConfig(providerId: string, modelId: string, overrides: any = {}): AIModelConfig {
    return {
      providerId,
      modelId,
      parameters: {
        temperature: 0.3,
        maxTokens: 2000,
        topP: 0.9,
        frequencyPenalty: 0.1,
        ...overrides.parameters
      },
      constraints: {
        maxRequestsPerMinute: 60,
        maxTokensPerRequest: 4000,
        maxConcurrentRequests: 3,
        ...overrides.constraints
      },
      performance: {
        averageLatency: 2000,
        averageQuality: 0.8,
        reliability: 0.95,
        costPerToken: 0.00003,
        lastUpdated: new Date(),
        ...overrides.performance
      }
    };
  }

  private async selectModel(context: AIRequestContext, options: any): Promise<AIModelConfig> {
    // Use specified model if provided
    if (options.provider && options.model) {
      const key = `${options.provider}:${options.model}`;
      const config = this.modelConfigs.get(key);
      if (config && this.canMakeRequest(options.provider)) {
        return config;
      }
    }

    // Select based on request urgency and content length
    const contentLength = context.documentContent.length + context.selectionText.length;
    
    // For urgent requests, prioritize faster models
    if (options.urgency === 'high') {
      for (const [, config] of this.modelConfigs.entries()) {
        if (config.performance.averageLatency < 1500 && this.canMakeRequest(config.providerId)) {
          return config;
        }
      }
    }
    
    // For large content, use models with higher token limits
    if (contentLength > 10000) {
      for (const [, config] of this.modelConfigs.entries()) {
        if (config.constraints.maxTokensPerRequest >= 8000 && this.canMakeRequest(config.providerId)) {
          return config;
        }
      }
    }
    
    // Default: Find first available model
    for (const [, config] of this.modelConfigs.entries()) {
      if (this.canMakeRequest(config.providerId)) {
        return config;
      }
    }
    
    throw new Error('No available AI models');
  }

  private canMakeRequest(providerId: string): boolean {
    const circuitBreaker = this.circuitBreakers.get(providerId);
    if (!circuitBreaker) return false;
    
    const now = Date.now();
    
    if (circuitBreaker.state === 'open' && now < circuitBreaker.nextRetryTime) {
      return false;
    }
    
    if (circuitBreaker.state === 'open' && now >= circuitBreaker.nextRetryTime) {
      circuitBreaker.state = 'half-open';
    }
    
    return circuitBreaker.state !== 'open';
  }

  private checkRateLimit(providerId: string): boolean {
    const rateLimitState = this.rateLimitStates.get(providerId);
    if (!rateLimitState) return true;
    
    const now = Date.now();
    const windowSize = 60000; // 1 minute
    
    // Reset window if needed
    if (now - rateLimitState.windowStart > windowSize) {
      rateLimitState.requestCount = 0;
      rateLimitState.windowStart = now;
      rateLimitState.isThrottled = false;
    }
    
    // Check limits
    const modelConfig = Array.from(this.modelConfigs.values())
      .find(config => config.providerId === providerId);
    
    if (modelConfig && rateLimitState.requestCount >= modelConfig.constraints.maxRequestsPerMinute) {
      rateLimitState.isThrottled = true;
      rateLimitState.nextAvailableTime = rateLimitState.windowStart + windowSize;
      return false;
    }
    
    return true;
  }

  private updateRateLimit(providerId: string): void {
    const rateLimitState = this.rateLimitStates.get(providerId);
    if (rateLimitState) {
      rateLimitState.requestCount++;
    }
  }

  private prepareRequest(context: AIRequestContext, modelConfig: AIModelConfig, requestId: string): any {
    const systemPrompt = this.buildSystemPrompt(context);
    const userPrompt = this.buildUserPrompt(context);
    
    return {
      id: requestId,
      providerId: modelConfig.providerId,
      modelId: modelConfig.modelId,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      parameters: modelConfig.parameters,
      metadata: {
        source: 'track-edits',
        changeType: context.changeType,
        timestamp: new Date()
      }
    };
  }

  private buildSystemPrompt(context: AIRequestContext): string {
    let prompt = `You are an AI writing assistant that helps improve text through the Track Edits system in Obsidian. Your task is to suggest edits for the selected text based on the change type: ${context.changeType}.

Please provide suggestions in the following format:
- Focus on ${context.changeType} improvements
- Maintain the original meaning and tone
- Provide specific, actionable edits
- Include confidence scores for each suggestion`;

    if (context.metadata.language) {
      prompt += `\n- Content is in ${context.metadata.language}`;
    }

    return prompt;
  }

  private buildUserPrompt(context: AIRequestContext): string {
    return `Please analyze the following text and suggest ${context.changeType} improvements:

Selected text: "${context.selectionText}"

Context (surrounding text):
"${context.documentContent.substring(
  Math.max(0, context.position.start - 200),
  Math.min(context.documentContent.length, context.position.end + 200)
)}"

Please provide specific edit suggestions with explanations.`;
  }

  private async makeAIRequest(request: any): Promise<any> {
    if (this.aiProvidersAPI.request) {
      return await this.aiProvidersAPI.request(request);
    } else {
      return await this.makeEventBasedRequest(request);
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

      globalEventBus.emit('ai-providers-request', request, 'track-edits-ai-adapter');
    });
  }

  private async processResponse(response: any, modelConfig: AIModelConfig, startTime: number): Promise<AIResponse> {
    const processingTime = Date.now() - startTime;
    
    // Extract suggested changes from response
    const suggestedChanges = this.extractChangesFromResponse(response.content);
    
    return {
      id: this.generateRequestId(),
      success: true,
      content: response.content,
      confidence: response.confidence || 0.8,
      suggestedChanges,
      metadata: {
        modelUsed: modelConfig.modelId,
        providerUsed: modelConfig.providerId,
        processingTime,
        tokenUsage: response.usage || { prompt: 0, completion: 0, total: 0 },
        qualityScore: this.calculateQualityScore(response.content),
        timestamp: new Date()
      }
    };
  }

  private extractChangesFromResponse(content: string): Change[] {
    // This would parse structured AI responses into Change objects
    // For now, returning empty array - would be implemented based on response format
    return [];
  }

  private calculateQualityScore(content: string): number {
    // Simple quality scoring based on content length and structure
    let score = 0.5;
    
    if (content.length > 50) score += 0.2;
    if (content.includes('because') || content.includes('therefore')) score += 0.1;
    if (content.split('.').length > 2) score += 0.1;
    
    return Math.min(score, 1.0);
  }

  private recordSuccess(providerId: string): void {
    const circuitBreaker = this.circuitBreakers.get(providerId);
    if (circuitBreaker) {
      circuitBreaker.failureCount = 0;
      circuitBreaker.state = 'closed';
    }
  }

  private recordFailure(providerId: string): void {
    const circuitBreaker = this.circuitBreakers.get(providerId);
    if (circuitBreaker) {
      circuitBreaker.failureCount++;
      circuitBreaker.lastFailureTime = Date.now();
      
      if (circuitBreaker.failureCount >= 5) {
        circuitBreaker.state = 'open';
        circuitBreaker.nextRetryTime = Date.now() + 60000; // 1 minute
      }
    }
  }

  private getCachedResponse(context: AIRequestContext): AIResponse | null {
    const cacheKey = this.generateCacheKey(context);
    const cached = this.responseCache.get(cacheKey);
    
    if (cached && cached.expiresAt > Date.now()) {
      return cached.response;
    }
    
    return null;
  }

  private cacheResponse(context: AIRequestContext, response: AIResponse): void {
    const cacheKey = this.generateCacheKey(context);
    const expiresAt = Date.now() + 3600000; // 1 hour
    
    this.responseCache.set(cacheKey, { response, expiresAt });
  }

  private generateCacheKey(context: AIRequestContext): string {
    const data = {
      changeType: context.changeType,
      selectionText: context.selectionText,
      position: context.position
    };
    
    return `cache-${btoa(JSON.stringify(data)).replace(/[^a-zA-Z0-9]/g, '')}`;
  }

  private async queueRequest(context: AIRequestContext, options: any): Promise<AIResponse> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        id: this.generateRequestId(),
        context,
        resolve,
        reject,
        timestamp: Date.now()
      });
      
      // Start processing queue if not already running
      if (!this.processingQueue) {
        this.processQueue();
      }
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processingQueue || this.requestQueue.length === 0) return;
    
    this.processingQueue = true;
    
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (!request) break;
      
      try {
        const response = await this.generateEditSuggestions(request.context);
        request.resolve(response);
      } catch (error) {
        request.reject(error as Error);
      }
      
      // Small delay between requests to avoid overwhelming
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    this.processingQueue = false;
  }

  private async handleRequestFailure(
    context: AIRequestContext,
    options: any,
    error: Error,
    requestId: string
  ): Promise<AIResponse> {
    // Try fallback providers
    const allConfigs = Array.from(this.modelConfigs.values())
      .filter(config => config.providerId !== options.provider)
      .sort((a, b) => b.performance.reliability - a.performance.reliability);
    
    for (const fallbackConfig of allConfigs) {
      if (this.canMakeRequest(fallbackConfig.providerId) && this.checkRateLimit(fallbackConfig.providerId)) {
        try {
          const fallbackRequest = this.prepareRequest(context, fallbackConfig, requestId);
          const response = await this.makeAIRequest(fallbackRequest);
          return await this.processResponse(response, fallbackConfig, Date.now());
        } catch (fallbackError) {
          this.recordFailure(fallbackConfig.providerId);
          continue;
        }
      }
    }
    
    // If all providers fail, return error response
    throw error;
  }

  private async getEventBasedProviders(): Promise<any[]> {
    return new Promise((resolve) => {
      globalEventBus.once('ai-providers-list-response', (event: EventData) => {
        resolve(event.payload.providers || []);
      });
      
      globalEventBus.emit('ai-providers-list-request', {}, 'track-edits-ai-adapter');
      
      // Timeout fallback
      setTimeout(() => resolve([]), 3000);
    });
  }

  private generateRequestId(): string {
    return `track-edits-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupEventListeners(): void {
    globalEventBus.on('ai-providers-model-health-update', (event: EventData) => {
      const { providerId, isHealthy } = event.payload;
      
      if (!isHealthy) {
        this.recordFailure(providerId);
      } else {
        this.recordSuccess(providerId);
      }
    });
    
    globalEventBus.on('ai-providers-plugin-unloaded', () => {
      console.warn('[TrackEdits-AIAdapter] AI Providers plugin unloaded');
      this.isInitialized = false;
      this.aiProvidersAPI = null;
    });
  }
}

// Export singleton instance
export const aiProvidersAdapter = AIProvidersAdapter.getInstance();