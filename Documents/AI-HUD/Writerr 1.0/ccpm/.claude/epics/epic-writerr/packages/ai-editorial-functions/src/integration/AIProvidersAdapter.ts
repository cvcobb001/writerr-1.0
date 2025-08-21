/**
 * @fileoverview Unified AI Providers Adapter for AI Editorial Functions Plugin
 * Provides consistent AI model access with specialized editorial function support
 */

import { globalEventBus, EventData } from '@writerr/shared';
import { 
  FunctionDefinition, 
  FunctionExecution, 
  FunctionExecutionResult,
  FunctionContext 
} from '../types';

export interface EditorialModelConfig {
  providerId: string;
  modelId: string;
  displayName: string;
  specializations: {
    grammar: number;        // 0-1 effectiveness for grammar tasks
    style: number;          // 0-1 effectiveness for style tasks
    content: number;        // 0-1 effectiveness for content tasks
    proofreading: number;   // 0-1 effectiveness for proofreading
    rewriting: number;      // 0-1 effectiveness for rewriting
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
    minConfidenceThreshold: number;
  };
  performance: {
    averageLatency: number;
    averageQuality: number;
    reliability: number;
    userSatisfaction: number;
    lastUpdated: Date;
  };
}

export interface FunctionExecutionRequest {
  id: string;
  functionDefinition: FunctionDefinition;
  input: string;
  context: FunctionContext;
  modelPreference?: {
    provider?: string;
    model?: string;
    specialization?: keyof EditorialModelConfig['specializations'];
  };
  options: {
    priority: 'low' | 'medium' | 'high';
    qualityThreshold: number;
    timeout?: number;
    useCache: boolean;
    batchable: boolean;
  };
  metadata: {
    timestamp: Date;
    userId?: string;
    sessionId?: string;
    documentId?: string;
  };
}

export interface FunctionExecutionResponse {
  id: string;
  success: boolean;
  result: FunctionExecutionResult;
  confidence: number;
  model: {
    provider: string;
    model: string;
    specialization: string;
  };
  performance: {
    processingTime: number;
    tokenUsage: {
      prompt: number;
      completion: number;
      total: number;
    };
    cost: number;
    qualityScore: number;
  };
  metadata: {
    timestamp: Date;
    isFromCache: boolean;
    retryCount: number;
    fallbackUsed: boolean;
  };
  error?: string;
}

export interface BatchRequest {
  id: string;
  requests: FunctionExecutionRequest[];
  options: {
    maxConcurrency: number;
    failFast: boolean;
    preserveOrder: boolean;
  };
}

export interface BatchResponse {
  id: string;
  results: FunctionExecutionResponse[];
  summary: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    totalProcessingTime: number;
    totalCost: number;
    averageQuality: number;
  };
}

export class AIProvidersAdapter {
  private static instance: AIProvidersAdapter;
  private isInitialized = false;
  private aiProvidersAPI: any = null;
  
  // Model configurations optimized for editorial functions
  private editorialModels = new Map<string, EditorialModelConfig>();
  
  // Circuit breakers and rate limiting
  private circuitBreakers = new Map<string, {
    state: 'closed' | 'open' | 'half-open';
    failures: number;
    lastFailure: number;
    nextRetry: number;
    maxFailures: number;
    retryDelay: number;
  }>();
  
  private rateLimiters = new Map<string, {
    requestCount: number;
    windowStart: number;
    windowSize: number;
    maxRequests: number;
    queue: Array<() => void>;
  }>();
  
  // Response caching system
  private responseCache = new Map<string, {
    response: FunctionExecutionResponse;
    expiresAt: number;
    accessCount: number;
    lastAccessed: Date;
  }>();
  
  // Batch processing queue
  private batchQueue: Array<{
    request: FunctionExecutionRequest;
    resolve: (response: FunctionExecutionResponse) => void;
    reject: (error: Error) => void;
    queuedAt: number;
  }> = [];
  
  private processingBatch = false;
  
  // Performance tracking
  private performanceMetrics = new Map<string, {
    totalRequests: number;
    successfulRequests: number;
    totalLatency: number;
    totalCost: number;
    qualityScores: number[];
    lastReset: Date;
  }>();
  
  private constructor() {
    this.setupEventListeners();
    this.initializeEditorialModels();
    this.startPerformanceTracking();
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
        console.warn('[EditorialFunctions-AIAdapter] AI Providers plugin not available');
        return false;
      }

      // Get API reference
      this.aiProvidersAPI = this.getAIProvidersAPI();
      if (!this.aiProvidersAPI) {
        console.error('[EditorialFunctions-AIAdapter] Failed to get AI Providers API');
        return false;
      }

      // Initialize provider management
      await this.initializeProviderManagement();
      
      // Load and validate models
      await this.loadAndValidateModels();
      
      // Start batch processing
      this.startBatchProcessing();

      this.isInitialized = true;
      
      globalEventBus.emit('editorial-functions-ai-adapter-ready', {
        pluginId: 'ai-editorial-functions',
        availableModels: this.getAvailableModels(),
        capabilities: this.getAdapterCapabilities(),
        timestamp: new Date()
      }, 'editorial-functions-ai-adapter');

      console.log('[EditorialFunctions-AIAdapter] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[EditorialFunctions-AIAdapter] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Execute an editorial function using the optimal AI model
   */
  async executeFunction(request: FunctionExecutionRequest): Promise<FunctionExecutionResponse> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();

    try {
      // Validate request
      this.validateRequest(request);
      
      // Check cache first
      if (request.options.useCache) {
        const cached = this.getCachedResponse(request);
        if (cached) {
          return { ...cached, metadata: { ...cached.metadata, isFromCache: true } };
        }
      }

      // Select optimal model for the function
      const selectedModel = await this.selectOptimalModel(request);
      
      // Check if can make request
      if (!this.canMakeRequest(selectedModel.providerId)) {
        throw new Error(`Provider ${selectedModel.providerId} unavailable`);
      }

      // Handle batching if enabled
      if (request.options.batchable) {
        return await this.queueForBatch(request);
      }

      // Execute immediately
      return await this.executeImmediate(request, selectedModel, startTime);

    } catch (error) {
      console.error('[EditorialFunctions-AIAdapter] Function execution failed:', error);
      
      // Try fallback if available
      return await this.handleExecutionFailure(request, error as Error, startTime);
    }
  }

  /**
   * Execute multiple functions in batch for efficiency
   */
  async executeBatch(batchRequest: BatchRequest): Promise<BatchResponse> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    const results: FunctionExecutionResponse[] = [];
    
    try {
      // Group requests by optimal model
      const modelGroups = this.groupRequestsByModel(batchRequest.requests);
      
      // Execute each group
      for (const [modelKey, requests] of modelGroups.entries()) {
        const modelResults = await this.executeBatchGroup(
          requests,
          batchRequest.options.maxConcurrency
        );
        results.push(...modelResults);
      }
      
      // Preserve order if requested
      if (batchRequest.options.preserveOrder) {
        results.sort((a, b) => 
          batchRequest.requests.findIndex(r => r.id === a.id) -
          batchRequest.requests.findIndex(r => r.id === b.id)
        );
      }
      
      // Calculate summary
      const summary = this.calculateBatchSummary(results, startTime);
      
      return {
        id: batchRequest.id,
        results,
        summary
      };

    } catch (error) {
      console.error('[EditorialFunctions-AIAdapter] Batch execution failed:', error);
      throw error;
    }
  }

  /**
   * Get available editorial models with their capabilities
   */
  getAvailableModels(): EditorialModelConfig[] {
    return Array.from(this.editorialModels.values())
      .filter(model => this.canMakeRequest(model.providerId))
      .sort((a, b) => b.performance.userSatisfaction - a.performance.userSatisfaction);
  }

  /**
   * Get model recommendations for a specific function type
   */
  getModelRecommendations(
    functionType: keyof EditorialModelConfig['specializations'],
    requirements?: {
      maxLatency?: number;
      minQuality?: number;
      maxCost?: number;
    }
  ): EditorialModelConfig[] {
    const models = this.getAvailableModels();
    
    return models
      .filter(model => {
        if (requirements?.maxLatency && model.performance.averageLatency > requirements.maxLatency) {
          return false;
        }
        if (requirements?.minQuality && model.performance.averageQuality < requirements.minQuality) {
          return false;
        }
        if (requirements?.maxCost && model.constraints.costPerToken > requirements.maxCost) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.specializations[functionType] - a.specializations[functionType]);
  }

  /**
   * Update model configuration and performance metrics
   */
  updateModelConfig(providerId: string, modelId: string, updates: Partial<EditorialModelConfig>): void {
    const key = `${providerId}:${modelId}`;
    const existing = this.editorialModels.get(key);
    
    if (existing) {
      const updated = { ...existing, ...updates, performance: { ...existing.performance, lastUpdated: new Date() } };
      this.editorialModels.set(key, updated);
      
      globalEventBus.emit('editorial-model-config-updated', {
        providerId,
        modelId,
        updates,
        newConfig: updated
      }, 'editorial-functions-ai-adapter');
    }
  }

  /**
   * Get adapter performance statistics
   */
  getPerformanceStats(): {
    overall: {
      totalRequests: number;
      successRate: number;
      averageLatency: number;
      totalCost: number;
      averageQuality: number;
    };
    byProvider: Record<string, {
      requests: number;
      successRate: number;
      averageLatency: number;
      cost: number;
      quality: number;
    }>;
    bySpecialization: Record<string, {
      requests: number;
      averageQuality: number;
      topModel: string;
    }>;
  } {
    const overall = this.calculateOverallStats();
    const byProvider = this.calculateProviderStats();
    const bySpecialization = this.calculateSpecializationStats();
    
    return { overall, byProvider, bySpecialization };
  }

  /**
   * Clear response cache
   */
  clearCache(filter?: { maxAge?: number; minAccess?: number }): void {
    if (!filter) {
      this.responseCache.clear();
    } else {
      const now = Date.now();
      for (const [key, cached] of this.responseCache.entries()) {
        let shouldRemove = false;
        
        if (filter.maxAge && (now - cached.lastAccessed.getTime()) > filter.maxAge) {
          shouldRemove = true;
        }
        
        if (filter.minAccess && cached.accessCount < filter.minAccess) {
          shouldRemove = true;
        }
        
        if (shouldRemove) {
          this.responseCache.delete(key);
        }
      }
    }
    
    globalEventBus.emit('editorial-cache-cleared', { filter }, 'editorial-functions-ai-adapter');
  }

  /**
   * Get health status of all providers
   */
  getProviderHealth(): Record<string, {
    isAvailable: boolean;
    circuitBreakerState: string;
    queueLength: number;
    requestsThisWindow: number;
    averageLatency: number;
    successRate: number;
  }> {
    const health: Record<string, any> = {};
    
    for (const [providerId, circuitBreaker] of this.circuitBreakers.entries()) {
      const rateLimiter = this.rateLimiters.get(providerId);
      const metrics = this.performanceMetrics.get(providerId);
      
      health[providerId] = {
        isAvailable: circuitBreaker.state === 'closed',
        circuitBreakerState: circuitBreaker.state,
        queueLength: rateLimiter?.queue.length || 0,
        requestsThisWindow: rateLimiter?.requestCount || 0,
        averageLatency: metrics ? metrics.totalLatency / Math.max(metrics.totalRequests, 1) : 0,
        successRate: metrics ? metrics.successfulRequests / Math.max(metrics.totalRequests, 1) : 0
      };
    }
    
    return health;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.isInitialized = false;
    this.aiProvidersAPI = null;
    this.editorialModels.clear();
    this.circuitBreakers.clear();
    this.rateLimiters.clear();
    this.responseCache.clear();
    this.batchQueue.length = 0;
    this.performanceMetrics.clear();
    this.processingBatch = false;
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
        
        globalEventBus.emit('ai-providers-ping', {}, 'editorial-functions-ai-adapter');
      });
    } catch {
      return false;
    }
  }

  private getAIProvidersAPI(): any {
    try {
      if ((window as any).AISwitchboard) {
        return (window as any).AISwitchboard;
      }
      
      return {
        request: (request: any) => this.makeEventBasedRequest(request),
        batchRequest: (requests: any[]) => this.makeEventBasedBatchRequest(requests),
        getProviders: () => this.getEventBasedProviders(),
        getModels: (providerId: string) => this.getEventBasedModels(providerId)
      };
    } catch (error) {
      console.error('[EditorialFunctions-AIAdapter] Error accessing AI Providers API:', error);
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
        nextRetry: 0,
        maxFailures: 5,
        retryDelay: 60000
      });
      
      // Initialize rate limiters
      this.rateLimiters.set(providerId, {
        requestCount: 0,
        windowStart: Date.now(),
        windowSize: 60000, // 1 minute
        maxRequests: 100,
        queue: []
      });
      
      // Initialize performance tracking
      this.performanceMetrics.set(providerId, {
        totalRequests: 0,
        successfulRequests: 0,
        totalLatency: 0,
        totalCost: 0,
        qualityScores: [],
        lastReset: new Date()
      });
    }
  }

  private initializeEditorialModels(): void {
    // OpenAI models
    this.editorialModels.set('openai:gpt-4', {
      providerId: 'openai',
      modelId: 'gpt-4',
      displayName: 'GPT-4 (Premium Editorial)',
      specializations: {
        grammar: 0.95,
        style: 0.90,
        content: 0.92,
        proofreading: 0.94,
        rewriting: 0.88
      },
      parameters: {
        temperature: 0.3,
        maxTokens: 2000,
        topP: 0.9,
        frequencyPenalty: 0.1,
        presencePenalty: 0.1
      },
      constraints: {
        maxRequestsPerMinute: 60,
        maxTokensPerRequest: 4000,
        maxConcurrentRequests: 5,
        costPerToken: 0.00003,
        minConfidenceThreshold: 0.8
      },
      performance: {
        averageLatency: 2500,
        averageQuality: 0.92,
        reliability: 0.97,
        userSatisfaction: 0.94,
        lastUpdated: new Date()
      }
    });

    this.editorialModels.set('openai:gpt-3.5-turbo', {
      providerId: 'openai',
      modelId: 'gpt-3.5-turbo',
      displayName: 'GPT-3.5 Turbo (Fast Editorial)',
      specializations: {
        grammar: 0.88,
        style: 0.82,
        content: 0.85,
        proofreading: 0.90,
        rewriting: 0.83
      },
      parameters: {
        temperature: 0.3,
        maxTokens: 2000,
        topP: 0.9,
        frequencyPenalty: 0.1,
        presencePenalty: 0.1
      },
      constraints: {
        maxRequestsPerMinute: 120,
        maxTokensPerRequest: 4000,
        maxConcurrentRequests: 8,
        costPerToken: 0.000002,
        minConfidenceThreshold: 0.75
      },
      performance: {
        averageLatency: 1200,
        averageQuality: 0.85,
        reliability: 0.95,
        userSatisfaction: 0.87,
        lastUpdated: new Date()
      }
    });

    // Anthropic models
    this.editorialModels.set('anthropic:claude-3-sonnet', {
      providerId: 'anthropic',
      modelId: 'claude-3-sonnet',
      displayName: 'Claude 3 Sonnet (Balanced Editorial)',
      specializations: {
        grammar: 0.92,
        style: 0.94,
        content: 0.90,
        proofreading: 0.93,
        rewriting: 0.91
      },
      parameters: {
        temperature: 0.3,
        maxTokens: 2000,
        topP: 0.9
      },
      constraints: {
        maxRequestsPerMinute: 50,
        maxTokensPerRequest: 8000,
        maxConcurrentRequests: 3,
        costPerToken: 0.000015,
        minConfidenceThreshold: 0.8
      },
      performance: {
        averageLatency: 1800,
        averageQuality: 0.91,
        reliability: 0.94,
        userSatisfaction: 0.92,
        lastUpdated: new Date()
      }
    });
  }

  private async loadAndValidateModels(): Promise<void> {
    try {
      const providers = await this.getEventBasedProviders();
      
      for (const provider of providers) {
        const models = await this.getEventBasedModels(provider.id);
        
        for (const model of models) {
          await this.validateModel(provider.id, model);
        }
      }
    } catch (error) {
      console.error('[EditorialFunctions-AIAdapter] Model validation failed:', error);
      // Continue with default models
    }
  }

  private async validateModel(providerId: string, model: any): Promise<void> {
    const key = `${providerId}:${model.id}`;
    const existingConfig = this.editorialModels.get(key);
    
    if (existingConfig) {
      // Update availability and performance data
      try {
        const testResult = await this.testModelCapabilities(existingConfig);
        this.updateModelPerformance(key, testResult);
      } catch (error) {
        console.warn(`[EditorialFunctions-AIAdapter] Model test failed for ${key}:`, error);
      }
    }
  }

  private async testModelCapabilities(config: EditorialModelConfig): Promise<any> {
    // Simple capability test - in production this would be more comprehensive
    const testRequest = {
      id: `test-${Date.now()}`,
      providerId: config.providerId,
      modelId: config.modelId,
      messages: [
        { role: 'system', content: 'You are a professional editor. Please proofread the following text.' },
        { role: 'user', content: 'This is a test sentence with some minor error\'s that need fixing.' }
      ],
      parameters: config.parameters,
      metadata: { test: true }
    };
    
    try {
      const startTime = Date.now();
      const response = await this.makeEventBasedRequest(testRequest);
      const latency = Date.now() - startTime;
      
      return {
        success: true,
        latency,
        qualityScore: this.assessTestResponse(response.content)
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private assessTestResponse(content: string): number {
    // Simple quality assessment for test response
    let score = 0.5;
    
    if (content.includes('error') || content.includes('errors')) score += 0.2;
    if (content.includes('fixing') || content.includes('corrected')) score += 0.1;
    if (content.length > 50) score += 0.1;
    if (!content.includes("error's")) score += 0.1; // Should fix the apostrophe
    
    return Math.min(score, 1.0);
  }

  private updateModelPerformance(modelKey: string, testResult: any): void {
    const config = this.editorialModels.get(modelKey);
    if (config && testResult.success) {
      config.performance.averageLatency = testResult.latency;
      config.performance.lastUpdated = new Date();
      
      if (testResult.qualityScore) {
        config.performance.averageQuality = (config.performance.averageQuality + testResult.qualityScore) / 2;
      }
    }
  }

  private validateRequest(request: FunctionExecutionRequest): void {
    if (!request.id) {
      throw new Error('Request ID is required');
    }
    
    if (!request.functionDefinition) {
      throw new Error('Function definition is required');
    }
    
    if (!request.input || request.input.trim().length === 0) {
      throw new Error('Input text is required');
    }
    
    if (request.input.length > 50000) {
      throw new Error('Input text too long (max 50,000 characters)');
    }
  }

  private async selectOptimalModel(request: FunctionExecutionRequest): Promise<EditorialModelConfig> {
    // Use specified model if provided and available
    if (request.modelPreference?.provider && request.modelPreference?.model) {
      const key = `${request.modelPreference.provider}:${request.modelPreference.model}`;
      const config = this.editorialModels.get(key);
      if (config && this.canMakeRequest(config.providerId)) {
        return config;
      }
    }

    // Select based on function type and requirements
    const functionType = this.inferFunctionType(request.functionDefinition);
    const availableModels = this.getAvailableModels();
    
    if (availableModels.length === 0) {
      throw new Error('No available AI models');
    }

    // Filter by quality threshold
    const qualityFiltered = availableModels.filter(
      model => model.performance.averageQuality >= request.options.qualityThreshold
    );
    
    const candidateModels = qualityFiltered.length > 0 ? qualityFiltered : availableModels;

    // Sort by specialization match and performance
    return candidateModels.sort((a, b) => {
      const scoreA = a.specializations[functionType] * 0.6 + a.performance.userSatisfaction * 0.4;
      const scoreB = b.specializations[functionType] * 0.6 + b.performance.userSatisfaction * 0.4;
      
      // Consider priority for tie-breaking
      if (request.options.priority === 'high' && Math.abs(scoreA - scoreB) < 0.05) {
        return a.performance.averageLatency - b.performance.averageLatency;
      }
      
      return scoreB - scoreA;
    })[0];
  }

  private inferFunctionType(functionDef: FunctionDefinition): keyof EditorialModelConfig['specializations'] {
    const name = functionDef.name.toLowerCase();
    const description = (functionDef.description || '').toLowerCase();
    
    if (name.includes('grammar') || description.includes('grammar')) {
      return 'grammar';
    } else if (name.includes('style') || description.includes('style')) {
      return 'style';
    } else if (name.includes('proofread') || description.includes('proofread')) {
      return 'proofreading';
    } else if (name.includes('rewrite') || description.includes('rewrite')) {
      return 'rewriting';
    } else {
      return 'content';
    }
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
    if (now - rateLimiter.windowStart >= rateLimiter.windowSize) {
      rateLimiter.requestCount = 0;
      rateLimiter.windowStart = now;
    }
    
    return rateLimiter.requestCount < rateLimiter.maxRequests;
  }

  private async queueForBatch(request: FunctionExecutionRequest): Promise<FunctionExecutionResponse> {
    return new Promise((resolve, reject) => {
      this.batchQueue.push({
        request,
        resolve,
        reject,
        queuedAt: Date.now()
      });
      
      if (!this.processingBatch) {
        setTimeout(() => this.processBatchQueue(), 100);
      }
    });
  }

  private async executeImmediate(
    request: FunctionExecutionRequest,
    model: EditorialModelConfig,
    startTime: number
  ): Promise<FunctionExecutionResponse> {
    try {
      // Prepare AI request
      const aiRequest = this.prepareAIRequest(request, model);
      
      // Make request with retry logic
      const response = await this.makeRequestWithRetry(aiRequest, model);
      
      // Process response
      const processedResponse = this.processResponse(response, request, model, startTime);
      
      // Update performance metrics
      this.updatePerformanceMetrics(model.providerId, true, Date.now() - startTime, processedResponse.performance.cost, processedResponse.performance.qualityScore);
      
      // Cache if successful
      if (request.options.useCache) {
        this.cacheResponse(request, processedResponse);
      }
      
      return processedResponse;
    } catch (error) {
      this.updatePerformanceMetrics(model.providerId, false, Date.now() - startTime, 0, 0);
      throw error;
    }
  }

  private prepareAIRequest(request: FunctionExecutionRequest, model: EditorialModelConfig): any {
    const systemPrompt = this.buildSystemPrompt(request.functionDefinition, request.context);
    const userPrompt = this.buildUserPrompt(request.input, request.context);
    
    return {
      id: request.id,
      providerId: model.providerId,
      modelId: model.modelId,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      parameters: {
        ...model.parameters,
        maxTokens: Math.min(model.parameters.maxTokens || 2000, model.constraints.maxTokensPerRequest)
      },
      metadata: {
        source: 'ai-editorial-functions',
        functionId: request.functionDefinition.id,
        functionName: request.functionDefinition.name,
        priority: request.options.priority,
        timestamp: request.metadata.timestamp
      }
    };
  }

  private buildSystemPrompt(functionDef: FunctionDefinition, context: FunctionContext): string {
    let prompt = `You are a professional editor with expertise in ${functionDef.name.toLowerCase().replace('-', ' ')}.

Function: ${functionDef.name}
Description: ${functionDef.description}

Guidelines:
- Provide specific, actionable suggestions
- Maintain the original meaning and author's voice
- Focus on the requested type of editing
- Include confidence levels for your suggestions`;

    if (functionDef.parsedContent?.systemPrompt) {
      prompt += `\n\nSpecific instructions: ${functionDef.parsedContent.systemPrompt}`;
    }

    if (context.documentMeta?.language) {
      prompt += `\n\nDocument language: ${context.documentMeta.language}`;
    }

    if (context.userPreferences?.style) {
      prompt += `\n\nUser's preferred style: ${context.userPreferences.style}`;
    }

    return prompt;
  }

  private buildUserPrompt(input: string, context: FunctionContext): string {
    let prompt = `Please analyze and improve the following text:\n\n"${input}"`;

    if (context.selection?.before || context.selection?.after) {
      prompt += `\n\nContext:`;
      if (context.selection.before) {
        prompt += `\nBefore: "${context.selection.before}"`;
      }
      if (context.selection.after) {
        prompt += `\nAfter: "${context.selection.after}"`;
      }
    }

    prompt += `\n\nPlease provide your suggestions in a clear, structured format.`;

    return prompt;
  }

  private async makeRequestWithRetry(aiRequest: any, model: EditorialModelConfig, retryCount = 0): Promise<any> {
    const maxRetries = 3;
    
    try {
      return await this.makeAIRequest(aiRequest);
    } catch (error) {
      // Record failure
      this.recordFailure(model.providerId);
      
      if (retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.makeRequestWithRetry(aiRequest, model, retryCount + 1);
      }
      
      throw error;
    }
  }

  private async makeAIRequest(request: any): Promise<any> {
    if (this.aiProvidersAPI.request) {
      return await this.aiProvidersAPI.request(request);
    } else {
      return await this.makeEventBasedRequest(request);
    }
  }

  private processResponse(
    response: any,
    request: FunctionExecutionRequest,
    model: EditorialModelConfig,
    startTime: number
  ): FunctionExecutionResponse {
    const processingTime = Date.now() - startTime;
    const tokenUsage = response.usage || { prompt: 0, completion: 0, total: 0 };
    const cost = tokenUsage.total * model.constraints.costPerToken;
    const qualityScore = this.calculateQualityScore(response.content, request);
    
    // Extract function result from response
    const functionResult = this.extractFunctionResult(response.content, request.functionDefinition);
    
    return {
      id: request.id,
      success: true,
      result: functionResult,
      confidence: response.confidence || qualityScore,
      model: {
        provider: model.providerId,
        model: model.modelId,
        specialization: this.inferFunctionType(request.functionDefinition)
      },
      performance: {
        processingTime,
        tokenUsage,
        cost,
        qualityScore
      },
      metadata: {
        timestamp: new Date(),
        isFromCache: false,
        retryCount: 0,
        fallbackUsed: false
      }
    };
  }

  private extractFunctionResult(content: string, functionDef: FunctionDefinition): FunctionExecutionResult {
    // This would parse the AI response based on the function definition
    // For now, returning a basic structure
    return {
      originalText: '', // Would be filled from request
      modifiedText: content,
      suggestions: [],
      confidence: 0.8,
      metadata: {
        processingTime: 0,
        model: '',
        timestamp: new Date()
      }
    };
  }

  private calculateQualityScore(content: string, request: FunctionExecutionRequest): number {
    let score = 0.5;
    
    // Basic quality indicators
    if (content.length > 50) score += 0.2;
    if (content.includes('suggestion') || content.includes('improve')) score += 0.1;
    if (content.split('\n').length > 2) score += 0.1;
    if (content.length > request.input.length * 0.2) score += 0.1; // Substantial response
    
    return Math.min(score, 1.0);
  }

  private recordFailure(providerId: string): void {
    const circuitBreaker = this.circuitBreakers.get(providerId);
    if (circuitBreaker) {
      circuitBreaker.failures++;
      circuitBreaker.lastFailure = Date.now();
      
      if (circuitBreaker.failures >= circuitBreaker.maxFailures) {
        circuitBreaker.state = 'open';
        circuitBreaker.nextRetry = Date.now() + circuitBreaker.retryDelay;
      }
    }
  }

  private recordSuccess(providerId: string): void {
    const circuitBreaker = this.circuitBreakers.get(providerId);
    if (circuitBreaker) {
      circuitBreaker.failures = 0;
      circuitBreaker.state = 'closed';
    }
  }

  private getCachedResponse(request: FunctionExecutionRequest): FunctionExecutionResponse | null {
    const cacheKey = this.generateCacheKey(request);
    const cached = this.responseCache.get(cacheKey);
    
    if (cached && cached.expiresAt > Date.now()) {
      cached.accessCount++;
      cached.lastAccessed = new Date();
      return cached.response;
    }
    
    return null;
  }

  private cacheResponse(request: FunctionExecutionRequest, response: FunctionExecutionResponse): void {
    const cacheKey = this.generateCacheKey(request);
    const expiresAt = Date.now() + 7200000; // 2 hours
    
    this.responseCache.set(cacheKey, {
      response,
      expiresAt,
      accessCount: 1,
      lastAccessed: new Date()
    });
  }

  private generateCacheKey(request: FunctionExecutionRequest): string {
    const data = {
      functionId: request.functionDefinition.id,
      input: request.input,
      options: request.options
    };
    
    return `editorial-cache-${btoa(JSON.stringify(data)).replace(/[^a-zA-Z0-9]/g, '')}`;
  }

  private updatePerformanceMetrics(
    providerId: string,
    success: boolean,
    latency: number,
    cost: number,
    qualityScore: number
  ): void {
    const metrics = this.performanceMetrics.get(providerId);
    if (metrics) {
      metrics.totalRequests++;
      if (success) {
        metrics.successfulRequests++;
        metrics.totalLatency += latency;
        metrics.totalCost += cost;
        metrics.qualityScores.push(qualityScore);
        
        // Keep only last 100 quality scores
        if (metrics.qualityScores.length > 100) {
          metrics.qualityScores.shift();
        }
      }
    }
  }

  private async handleExecutionFailure(
    request: FunctionExecutionRequest,
    error: Error,
    startTime: number
  ): Promise<FunctionExecutionResponse> {
    // Try fallback models
    const availableModels = this.getAvailableModels()
      .filter(model => {
        // Skip the model that failed (if we know it)
        if (request.modelPreference?.provider === model.providerId && 
            request.modelPreference?.model === model.modelId) {
          return false;
        }
        return this.canMakeRequest(model.providerId);
      });

    for (const fallbackModel of availableModels.slice(0, 2)) { // Try max 2 fallbacks
      try {
        const response = await this.executeImmediate(
          { ...request, modelPreference: undefined },
          fallbackModel,
          startTime
        );
        
        return {
          ...response,
          metadata: { ...response.metadata, fallbackUsed: true }
        };
      } catch (fallbackError) {
        continue;
      }
    }
    
    // If all fallbacks fail, return error response
    throw error;
  }

  private groupRequestsByModel(requests: FunctionExecutionRequest[]): Map<string, FunctionExecutionRequest[]> {
    const groups = new Map<string, FunctionExecutionRequest[]>();
    
    for (const request of requests) {
      const model = this.selectOptimalModel(request);
      const key = `${model.providerId}:${model.modelId}`;
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      
      groups.get(key)!.push(request);
    }
    
    return groups;
  }

  private async executeBatchGroup(
    requests: FunctionExecutionRequest[],
    maxConcurrency: number
  ): Promise<FunctionExecutionResponse[]> {
    const results: FunctionExecutionResponse[] = [];
    
    // Process in batches of maxConcurrency
    for (let i = 0; i < requests.length; i += maxConcurrency) {
      const batch = requests.slice(i, i + maxConcurrency);
      const batchPromises = batch.map(request => this.executeFunction(request));
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          // Create error response
          results.push({
            id: `error-${Date.now()}`,
            success: false,
            result: {} as FunctionExecutionResult,
            confidence: 0,
            model: { provider: 'unknown', model: 'unknown', specialization: 'unknown' },
            performance: { processingTime: 0, tokenUsage: { prompt: 0, completion: 0, total: 0 }, cost: 0, qualityScore: 0 },
            metadata: { timestamp: new Date(), isFromCache: false, retryCount: 0, fallbackUsed: false },
            error: result.reason.message
          });
        }
      }
    }
    
    return results;
  }

  private calculateBatchSummary(results: FunctionExecutionResponse[], startTime: number): BatchResponse['summary'] {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    return {
      totalRequests: results.length,
      successfulRequests: successful.length,
      failedRequests: failed.length,
      totalProcessingTime: Date.now() - startTime,
      totalCost: successful.reduce((sum, r) => sum + r.performance.cost, 0),
      averageQuality: successful.length > 0 
        ? successful.reduce((sum, r) => sum + r.performance.qualityScore, 0) / successful.length 
        : 0
    };
  }

  private calculateOverallStats(): any {
    let totalRequests = 0;
    let successfulRequests = 0;
    let totalLatency = 0;
    let totalCost = 0;
    let qualityScores: number[] = [];
    
    for (const metrics of this.performanceMetrics.values()) {
      totalRequests += metrics.totalRequests;
      successfulRequests += metrics.successfulRequests;
      totalLatency += metrics.totalLatency;
      totalCost += metrics.totalCost;
      qualityScores.push(...metrics.qualityScores);
    }
    
    return {
      totalRequests,
      successRate: totalRequests > 0 ? successfulRequests / totalRequests : 0,
      averageLatency: successfulRequests > 0 ? totalLatency / successfulRequests : 0,
      totalCost,
      averageQuality: qualityScores.length > 0 
        ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length 
        : 0
    };
  }

  private calculateProviderStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [providerId, metrics] of this.performanceMetrics.entries()) {
      stats[providerId] = {
        requests: metrics.totalRequests,
        successRate: metrics.totalRequests > 0 ? metrics.successfulRequests / metrics.totalRequests : 0,
        averageLatency: metrics.successfulRequests > 0 ? metrics.totalLatency / metrics.successfulRequests : 0,
        cost: metrics.totalCost,
        quality: metrics.qualityScores.length > 0 
          ? metrics.qualityScores.reduce((sum, score) => sum + score, 0) / metrics.qualityScores.length 
          : 0
      };
    }
    
    return stats;
  }

  private calculateSpecializationStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    const specializations: Array<keyof EditorialModelConfig['specializations']> = 
      ['grammar', 'style', 'content', 'proofreading', 'rewriting'];
    
    for (const specialization of specializations) {
      const models = Array.from(this.editorialModels.values());
      const topModel = models.sort((a, b) => b.specializations[specialization] - a.specializations[specialization])[0];
      
      stats[specialization] = {
        requests: 0, // Would track per specialization in real implementation
        averageQuality: 0, // Would calculate from actual results
        topModel: topModel ? `${topModel.providerId}:${topModel.modelId}` : 'none'
      };
    }
    
    return stats;
  }

  private startBatchProcessing(): void {
    setInterval(() => {
      if (!this.processingBatch && this.batchQueue.length > 0) {
        this.processBatchQueue();
      }
    }, 500);
  }

  private async processBatchQueue(): Promise<void> {
    if (this.processingBatch || this.batchQueue.length === 0) return;
    
    this.processingBatch = true;
    
    try {
      // Take up to 10 items from queue
      const batch = this.batchQueue.splice(0, 10);
      
      // Group by model for efficient processing
      const modelGroups = new Map<string, typeof batch>();
      
      for (const item of batch) {
        try {
          const model = await this.selectOptimalModel(item.request);
          const key = `${model.providerId}:${model.modelId}`;
          
          if (!modelGroups.has(key)) {
            modelGroups.set(key, []);
          }
          
          modelGroups.get(key)!.push(item);
        } catch (error) {
          item.reject(error as Error);
        }
      }
      
      // Process each group
      for (const [, groupItems] of modelGroups.entries()) {
        await Promise.all(
          groupItems.map(async item => {
            try {
              const response = await this.executeFunction(item.request);
              item.resolve(response);
            } catch (error) {
              item.reject(error as Error);
            }
          })
        );
      }
    } finally {
      this.processingBatch = false;
    }
  }

  private startPerformanceTracking(): void {
    // Reset performance metrics every hour
    setInterval(() => {
      for (const metrics of this.performanceMetrics.values()) {
        metrics.totalRequests = 0;
        metrics.successfulRequests = 0;
        metrics.totalLatency = 0;
        metrics.totalCost = 0;
        metrics.qualityScores = [];
        metrics.lastReset = new Date();
      }
    }, 3600000); // 1 hour
  }

  private getAdapterCapabilities(): string[] {
    return [
      'function-execution',
      'batch-processing',
      'model-selection',
      'quality-scoring',
      'performance-tracking',
      'circuit-breaker',
      'rate-limiting',
      'caching',
      'fallback-handling'
    ];
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

      globalEventBus.emit('ai-providers-request', request, 'editorial-functions-ai-adapter');
    });
  }

  private async makeEventBasedBatchRequest(requests: any[]): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Batch request timeout'));
      }, 60000);

      globalEventBus.once(`ai-providers-batch-response-${requests[0]?.id}`, (event: EventData) => {
        clearTimeout(timeout);
        resolve(event.payload.results || []);
      });

      globalEventBus.emit('ai-providers-batch-request', { requests }, 'editorial-functions-ai-adapter');
    });
  }

  private async getEventBasedProviders(): Promise<any[]> {
    return new Promise((resolve) => {
      globalEventBus.once('ai-providers-list-response', (event: EventData) => {
        resolve(event.payload.providers || []);
      });
      
      globalEventBus.emit('ai-providers-list-request', {}, 'editorial-functions-ai-adapter');
      
      setTimeout(() => resolve([]), 3000);
    });
  }

  private async getEventBasedModels(providerId: string): Promise<any[]> {
    return new Promise((resolve) => {
      globalEventBus.once(`ai-providers-models-response-${providerId}`, (event: EventData) => {
        resolve(event.payload.models || []);
      });
      
      globalEventBus.emit('ai-providers-models-request', { providerId }, 'editorial-functions-ai-adapter');
      
      setTimeout(() => resolve([]), 3000);
    });
  }

  private setupEventListeners(): void {
    globalEventBus.on('ai-providers-model-health-update', (event: EventData) => {
      const { providerId, isHealthy } = event.payload;
      if (isHealthy) {
        this.recordSuccess(providerId);
      } else {
        this.recordFailure(providerId);
      }
    });
    
    globalEventBus.on('ai-providers-plugin-unloaded', () => {
      console.warn('[EditorialFunctions-AIAdapter] AI Providers plugin unloaded');
      this.isInitialized = false;
      this.aiProvidersAPI = null;
    });
    
    globalEventBus.on('function-quality-feedback', (event: EventData) => {
      const { functionId, providerId, qualityRating, feedback } = event.payload;
      this.handleQualityFeedback(providerId, qualityRating, feedback);
    });
  }

  private handleQualityFeedback(providerId: string, qualityRating: number, feedback: string): void {
    // Update model performance based on user feedback
    const metrics = this.performanceMetrics.get(providerId);
    if (metrics) {
      metrics.qualityScores.push(qualityRating);
      
      // Update model configurations based on feedback
      for (const [key, model] of this.editorialModels.entries()) {
        if (model.providerId === providerId) {
          model.performance.userSatisfaction = 
            (model.performance.userSatisfaction + qualityRating) / 2;
          model.performance.lastUpdated = new Date();
        }
      }
    }
  }
}

// Export singleton instance
export const aiProvidersAdapter = AIProvidersAdapter.getInstance();