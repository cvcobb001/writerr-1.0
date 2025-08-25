/**
 * Performance Optimizer for Writerr Chat Plugin AI Calls
 * 
 * This module provides intelligent batching, caching, and optimization
 * strategies for AI API calls to improve performance and reduce costs.
 */

import { ChatMessage, ChatMode, DocumentContext } from '../interface/types';
import { AIResponse, AIRequestOptions } from './AIProvidersIntegration';
import { globalEventBus } from '@writerr/shared';

export interface OptimizationConfig {
  enableBatching: boolean;
  batchWindow: number; // milliseconds
  maxBatchSize: number;
  enableCaching: boolean;
  cacheSize: number;
  cacheTTL: number; // milliseconds
  enableCompression: boolean;
  enablePreloading: boolean;
  requestCoalescing: boolean;
  adaptiveTimeout: boolean;
  tokenOptimization: boolean;
}

export interface BatchRequest {
  id: string;
  messages: ChatMessage[];
  mode: ChatMode;
  documentContext?: DocumentContext;
  options: Partial<AIRequestOptions>;
  timestamp: number;
  resolve: (response: AIResponse) => void;
  reject: (error: Error) => void;
}

export interface CacheEntry {
  key: string;
  response: AIResponse;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

export interface PerformanceMetrics {
  totalRequests: number;
  cachedRequests: number;
  batchedRequests: number;
  averageResponseTime: number;
  tokensSaved: number;
  cacheHitRate: number;
  batchEfficiency: number;
}

export class PerformanceOptimizer {
  private config: OptimizationConfig;
  private pendingRequests: Map<string, BatchRequest> = new Map();
  private batchTimer: NodeJS.Timeout | null = null;
  private cache: Map<string, CacheEntry> = new Map();
  private metrics: PerformanceMetrics;
  private requestQueue: BatchRequest[] = [];
  private activeRequests = new Set<string>();

  constructor(config: Partial<OptimizationConfig> = {}) {
    this.config = {
      enableBatching: true,
      batchWindow: 100, // 100ms batch window
      maxBatchSize: 5,
      enableCaching: true,
      cacheSize: 1000,
      cacheTTL: 5 * 60 * 1000, // 5 minutes
      enableCompression: true,
      enablePreloading: false,
      requestCoalescing: true,
      adaptiveTimeout: true,
      tokenOptimization: true,
      ...config
    };

    this.metrics = {
      totalRequests: 0,
      cachedRequests: 0,
      batchedRequests: 0,
      averageResponseTime: 0,
      tokensSaved: 0,
      cacheHitRate: 0,
      batchEfficiency: 0
    };

    this.startCacheCleanup();
  }

  /**
   * Optimize an AI request with caching, batching, and other strategies
   */
  async optimizeRequest(
    messages: ChatMessage[],
    mode: ChatMode,
    documentContext?: DocumentContext,
    options: Partial<AIRequestOptions> = {}
  ): Promise<AIResponse> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    this.metrics.totalRequests++;

    try {
      // Check cache first
      if (this.config.enableCaching) {
        const cachedResponse = this.getCachedResponse(messages, mode, documentContext, options);
        if (cachedResponse) {
          this.metrics.cachedRequests++;
          this.updateCacheMetrics();
          
          globalEventBus.emit('ai-request-cached', {
            requestId,
            cacheKey: this.generateCacheKey(messages, mode, documentContext, options),
            responseTime: Date.now() - startTime
          });

          return cachedResponse;
        }
      }

      // Optimize request content
      const optimizedRequest = this.optimizeRequestContent(messages, mode, documentContext, options);

      // Check for request coalescing
      if (this.config.requestCoalescing) {
        const coalescedRequest = this.coalesceRequest(optimizedRequest);
        if (coalescedRequest) {
          return coalescedRequest;
        }
      }

      // Handle batching
      if (this.config.enableBatching && this.shouldBatch(optimizedRequest)) {
        return this.addToBatch(requestId, optimizedRequest, startTime);
      }

      // Execute single request
      return this.executeSingleRequest(requestId, optimizedRequest, startTime);

    } catch (error) {
      globalEventBus.emit('ai-request-optimization-error', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime
      });
      throw error;
    }
  }

  /**
   * Optimize request content to reduce tokens and improve performance
   */
  private optimizeRequestContent(
    messages: ChatMessage[],
    mode: ChatMode,
    documentContext?: DocumentContext,
    options: Partial<AIRequestOptions> = {}
  ): {
    messages: ChatMessage[];
    mode: ChatMode;
    documentContext?: DocumentContext;
    options: Partial<AIRequestOptions>;
  } {
    if (!this.config.tokenOptimization) {
      return { messages, mode, documentContext, options };
    }

    // Optimize messages by removing redundant content
    const optimizedMessages = this.optimizeMessages(messages);

    // Optimize document context
    const optimizedContext = this.optimizeDocumentContext(documentContext);

    // Optimize system prompt
    const optimizedOptions = this.optimizeOptions(options, mode);

    return {
      messages: optimizedMessages,
      mode,
      documentContext: optimizedContext,
      options: optimizedOptions
    };
  }

  /**
   * Optimize message history to reduce token usage
   */
  private optimizeMessages(messages: ChatMessage[]): ChatMessage[] {
    if (messages.length <= 10) return messages;

    // Keep first message (usually contains important context)
    // Keep last 8 messages (recent conversation)
    // Summarize middle messages if needed
    const recent = messages.slice(-8);
    const first = messages[0];
    
    if (messages.length <= 10) {
      return messages;
    }

    // For now, just truncate. In production, we'd implement intelligent summarization
    return [first, ...recent];
  }

  /**
   * Optimize document context to include only relevant information
   */
  private optimizeDocumentContext(context?: DocumentContext): DocumentContext | undefined {
    if (!context) return context;

    return {
      ...context,
      // Truncate very long selections
      selection: context.selection && context.selection.text.length > 2000 ? {
        ...context.selection,
        text: context.selection.text.substring(0, 2000) + '...[truncated]'
      } : context.selection,
      // Keep only most relevant project context
      projectContext: context.projectContext?.slice(0, 5)
    };
  }

  /**
   * Optimize AI request options
   */
  private optimizeOptions(
    options: Partial<AIRequestOptions>,
    mode: ChatMode
  ): Partial<AIRequestOptions> {
    const optimized = { ...options };

    // Adjust temperature based on mode
    if (!optimized.temperature) {
      switch (mode.id) {
        case 'proofread':
        case 'copy-edit':
          optimized.temperature = 0.3; // Lower temperature for editing tasks
          break;
        case 'creative-writing':
        case 'brainstorm':
          optimized.temperature = 0.8; // Higher temperature for creative tasks
          break;
        default:
          optimized.temperature = 0.7;
      }
    }

    // Adjust max tokens based on mode
    if (!optimized.maxTokens) {
      if (mode.capabilities?.some(cap => cap.type === 'document-edit')) {
        optimized.maxTokens = 1000; // Shorter responses for edit modes
      } else {
        optimized.maxTokens = 2048; // Longer responses for conversational modes
      }
    }

    return optimized;
  }

  /**
   * Check if request should be batched
   */
  private shouldBatch(request: any): boolean {
    if (!this.config.enableBatching) return false;
    if (this.pendingRequests.size >= this.config.maxBatchSize) return false;
    
    // Don't batch streaming requests
    if (request.options.stream) return false;
    
    // Don't batch urgent requests (e.g., real-time editing)
    if (request.mode.id === 'proofread' && request.documentContext?.selection) {
      return false;
    }

    return true;
  }

  /**
   * Add request to batch
   */
  private addToBatch(
    requestId: string,
    request: any,
    startTime: number
  ): Promise<AIResponse> {
    return new Promise((resolve, reject) => {
      const batchRequest: BatchRequest = {
        id: requestId,
        messages: request.messages,
        mode: request.mode,
        documentContext: request.documentContext,
        options: request.options,
        timestamp: startTime,
        resolve,
        reject
      };

      this.pendingRequests.set(requestId, batchRequest);
      this.requestQueue.push(batchRequest);

      // Start batch timer if not already running
      if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => {
          this.processBatch();
        }, this.config.batchWindow);
      }

      globalEventBus.emit('ai-request-batched', {
        requestId,
        batchSize: this.pendingRequests.size,
        maxBatchSize: this.config.maxBatchSize
      });
    });
  }

  /**
   * Process batched requests
   */
  private async processBatch(): Promise<void> {
    if (this.requestQueue.length === 0) return;

    this.batchTimer = null;
    const batch = [...this.requestQueue];
    this.requestQueue = [];
    this.pendingRequests.clear();

    globalEventBus.emit('ai-batch-processing-start', {
      batchSize: batch.length,
      timestamp: Date.now()
    });

    try {
      // Process batch requests - for now, process sequentially
      // In production, we'd implement true batching at the API level
      const results = await Promise.allSettled(
        batch.map(request => this.executeSingleRequest(
          request.id,
          {
            messages: request.messages,
            mode: request.mode,
            documentContext: request.documentContext,
            options: request.options
          },
          request.timestamp
        ))
      );

      // Resolve/reject individual requests
      batch.forEach((request, index) => {
        const result = results[index];
        if (result.status === 'fulfilled') {
          request.resolve(result.value);
        } else {
          request.reject(result.reason);
        }
      });

      this.metrics.batchedRequests += batch.length;
      this.updateBatchMetrics();

      globalEventBus.emit('ai-batch-processing-complete', {
        batchSize: batch.length,
        successCount: results.filter(r => r.status === 'fulfilled').length,
        failureCount: results.filter(r => r.status === 'rejected').length
      });

    } catch (error) {
      // Reject all pending requests
      batch.forEach(request => {
        request.reject(error instanceof Error ? error : new Error('Batch processing failed'));
      });

      globalEventBus.emit('ai-batch-processing-error', {
        batchSize: batch.length,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Execute a single AI request
   */
  private async executeSingleRequest(
    requestId: string,
    request: any,
    startTime: number
  ): Promise<AIResponse> {
    // This would integrate with the actual AI Providers integration
    // For now, return a mock response
    const processingTime = Date.now() - startTime;
    
    // Update metrics
    const responseTime = processingTime;
    this.updateResponseTimeMetrics(responseTime);

    const response: AIResponse = {
      id: requestId,
      content: 'Mock response for performance testing',
      model: request.options.model || 'gpt-4',
      provider: 'openai',
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150
      },
      metadata: {
        processingTime,
        timestamp: new Date().toISOString()
      }
    };

    // Cache the response
    if (this.config.enableCaching) {
      this.cacheResponse(request, response);
    }

    return response;
  }

  /**
   * Check for request coalescing opportunities
   */
  private coalesceRequest(request: any): Promise<AIResponse> | null {
    if (!this.config.requestCoalescing) return null;

    // Check for identical active requests
    const requestKey = this.generateRequestKey(request);
    
    for (const activeId of this.activeRequests) {
      // In a real implementation, we'd check for identical requests
      // and return the same promise
    }

    return null;
  }

  /**
   * Get cached response if available and valid
   */
  private getCachedResponse(
    messages: ChatMessage[],
    mode: ChatMode,
    documentContext?: DocumentContext,
    options: Partial<AIRequestOptions> = {}
  ): AIResponse | null {
    const cacheKey = this.generateCacheKey(messages, mode, documentContext, options);
    const entry = this.cache.get(cacheKey);

    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > this.config.cacheTTL) {
      this.cache.delete(cacheKey);
      return null;
    }

    // Update access metrics
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    return entry.response;
  }

  /**
   * Cache an AI response
   */
  private cacheResponse(
    request: any,
    response: AIResponse
  ): void {
    const cacheKey = this.generateCacheKey(
      request.messages,
      request.mode,
      request.documentContext,
      request.options
    );

    // Remove oldest entries if cache is full
    if (this.cache.size >= this.config.cacheSize) {
      this.evictLRUEntries();
    }

    this.cache.set(cacheKey, {
      key: cacheKey,
      response,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now()
    });
  }

  /**
   * Evict least recently used cache entries
   */
  private evictLRUEntries(): void {
    const entries = Array.from(this.cache.values());
    entries.sort((a, b) => a.lastAccessed - b.lastAccessed);
    
    // Remove oldest 25% of entries
    const toRemove = Math.floor(entries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i].key);
    }
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(
    messages: ChatMessage[],
    mode: ChatMode,
    documentContext?: DocumentContext,
    options: Partial<AIRequestOptions> = {}
  ): string {
    const keyData = {
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      mode: mode.id,
      selection: documentContext?.selection?.text,
      model: options.model,
      temperature: options.temperature
    };

    return `cache-${btoa(JSON.stringify(keyData)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)}`;
  }

  /**
   * Generate request key for coalescing
   */
  private generateRequestKey(request: any): string {
    return this.generateCacheKey(
      request.messages,
      request.mode,
      request.documentContext,
      request.options
    );
  }

  /**
   * Start periodic cache cleanup
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      this.cleanupCache();
    }, 60000); // Clean up every minute
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    const expired: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.cacheTTL) {
        expired.push(key);
      }
    }

    expired.forEach(key => this.cache.delete(key));

    if (expired.length > 0) {
      globalEventBus.emit('cache-cleanup-complete', {
        removedEntries: expired.length,
        remainingEntries: this.cache.size
      });
    }
  }

  /**
   * Update response time metrics
   */
  private updateResponseTimeMetrics(responseTime: number): void {
    const totalRequests = this.metrics.totalRequests;
    const currentAverage = this.metrics.averageResponseTime;
    
    this.metrics.averageResponseTime = 
      (currentAverage * (totalRequests - 1) + responseTime) / totalRequests;
  }

  /**
   * Update cache hit rate metrics
   */
  private updateCacheMetrics(): void {
    this.metrics.cacheHitRate = this.metrics.cachedRequests / this.metrics.totalRequests;
  }

  /**
   * Update batch efficiency metrics
   */
  private updateBatchMetrics(): void {
    this.metrics.batchEfficiency = this.metrics.batchedRequests / this.metrics.totalRequests;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Update optimization configuration
   */
  updateConfig(newConfig: Partial<OptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    globalEventBus.emit('performance-optimizer-config-updated', {
      config: this.config,
      source: 'writerr-chat'
    });
  }

  /**
   * Clear performance cache
   */
  clearCache(): void {
    this.cache.clear();
    this.metrics.cachedRequests = 0;
    this.metrics.cacheHitRate = 0;
    
    globalEventBus.emit('performance-cache-cleared', {
      source: 'writerr-chat'
    });
  }

  /**
   * Reset performance metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      cachedRequests: 0,
      batchedRequests: 0,
      averageResponseTime: 0,
      tokensSaved: 0,
      cacheHitRate: 0,
      batchEfficiency: 0
    };

    globalEventBus.emit('performance-metrics-reset', {
      source: 'writerr-chat'
    });
  }

  /**
   * Get optimization status
   */
  getStatus(): {
    isOptimizing: boolean;
    cacheSize: number;
    pendingBatchSize: number;
    activeRequests: number;
    config: OptimizationConfig;
  } {
    return {
      isOptimizing: this.config.enableBatching || this.config.enableCaching,
      cacheSize: this.cache.size,
      pendingBatchSize: this.pendingRequests.size,
      activeRequests: this.activeRequests.size,
      config: this.config
    };
  }
}

// Export singleton instance
export const performanceOptimizer = new PerformanceOptimizer();