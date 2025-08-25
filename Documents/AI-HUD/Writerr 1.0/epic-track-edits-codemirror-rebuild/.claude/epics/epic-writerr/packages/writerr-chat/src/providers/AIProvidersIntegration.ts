/**
 * AI Providers Integration for Writerr Chat Plugin
 * 
 * This module handles integration with the AI Providers plugin SDK,
 * providing unified access to multiple AI models and providers.
 */

import { ChatMessage, ChatMode, DocumentContext, EditSuggestion } from '../interface/types';
import { globalEventBus, globalRegistry } from '@writerr/shared';

export interface AIProvider {
  id: string;
  name: string;
  type: 'openai' | 'anthropic' | 'ollama' | 'custom';
  isAvailable: boolean;
  models: string[];
  maxTokens: number;
  supportsStreaming: boolean;
}

export interface AIRequestOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  systemPrompt?: string;
  contextWindow?: number;
}

export interface AIResponse {
  id: string;
  content: string;
  model: string;
  provider: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata: {
    processingTime: number;
    timestamp: string;
    editSuggestions?: EditSuggestion[];
  };
}

export interface AIProvidersIntegrationConfig {
  defaultProvider: string;
  defaultModel: string;
  enableStreaming: boolean;
  timeout: number;
  retryAttempts: number;
  batchOptimization: boolean;
  cacheResponses: boolean;
  fallbackChain: string[];
}

export class AIProvidersIntegration {
  private config: AIProvidersIntegrationConfig;
  private aiProvidersAPI: any = null;
  private isInitialized = false;
  private responseCache = new Map<string, AIResponse>();
  private rateLimiter = new Map<string, number>();

  constructor(config: Partial<AIProvidersIntegrationConfig> = {}) {
    this.config = {
      defaultProvider: 'openai',
      defaultModel: 'gpt-4',
      enableStreaming: true,
      timeout: 30000,
      retryAttempts: 3,
      batchOptimization: true,
      cacheResponses: true,
      fallbackChain: ['openai', 'anthropic', 'ollama'],
      ...config
    };
  }

  /**
   * Initialize the AI Providers integration
   */
  async initialize(): Promise<boolean> {
    try {
      // Check if AI Providers plugin is available
      if (!this.isAIProvidersAvailable()) {
        console.warn('AI Providers plugin not available');
        return false;
      }

      // Get AI Providers API from global registry
      this.aiProvidersAPI = this.getAIProvidersAPI();
      
      if (!this.aiProvidersAPI) {
        console.error('Failed to initialize AI Providers API');
        return false;
      }

      // Set up event listeners
      this.setupEventListeners();
      
      this.isInitialized = true;
      
      globalEventBus.emit('ai-providers-integration-ready', {
        providers: await this.getAvailableProviders(),
        config: this.config
      });

      return true;
    } catch (error) {
      console.error('Error initializing AI Providers integration:', error);
      return false;
    }
  }

  /**
   * Send a chat message to the AI and get a response
   */
  async sendMessage(
    messages: ChatMessage[],
    mode: ChatMode,
    documentContext?: DocumentContext,
    options: Partial<AIRequestOptions> = {}
  ): Promise<AIResponse> {
    if (!this.isInitialized || !this.aiProvidersAPI) {
      throw new Error('AI Providers integration not initialized');
    }

    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      // Check rate limiting
      if (this.isRateLimited()) {
        throw new Error('Rate limit exceeded. Please wait before making another request.');
      }

      // Build the request
      const request = await this.buildAIRequest(messages, mode, documentContext, options);
      
      globalEventBus.emit('ai-request-start', {
        requestId,
        messages: messages.length,
        mode: mode.id,
        provider: request.provider,
        model: request.model
      });

      // Check cache first
      const cacheKey = this.generateCacheKey(request);
      if (this.config.cacheResponses && this.responseCache.has(cacheKey)) {
        const cachedResponse = this.responseCache.get(cacheKey)!;
        
        globalEventBus.emit('ai-response-cached', {
          requestId,
          response: cachedResponse
        });
        
        return cachedResponse;
      }

      // Make the AI request with fallback chain
      const response = await this.makeAIRequestWithFallback(request);
      
      const processingTime = Date.now() - startTime;
      
      const aiResponse: AIResponse = {
        id: requestId,
        content: response.content,
        model: response.model,
        provider: response.provider,
        usage: response.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        metadata: {
          processingTime,
          timestamp: new Date().toISOString(),
          editSuggestions: this.extractEditSuggestions(response.content, mode, documentContext)
        }
      };

      // Cache the response
      if (this.config.cacheResponses) {
        this.responseCache.set(cacheKey, aiResponse);
      }

      // Update rate limiter
      this.updateRateLimit();

      globalEventBus.emit('ai-response-complete', {
        requestId,
        response: aiResponse,
        mode: mode.id
      });

      return aiResponse;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      globalEventBus.emit('ai-response-error', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
        mode: mode.id
      });

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
    options: Partial<AIRequestOptions> = {},
    onChunk?: (chunk: string) => void
  ): Promise<AIResponse> {
    if (!this.config.enableStreaming) {
      return this.sendMessage(messages, mode, documentContext, options);
    }

    if (!this.isInitialized || !this.aiProvidersAPI) {
      throw new Error('AI Providers integration not initialized');
    }

    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const request = await this.buildAIRequest(messages, mode, documentContext, {
        ...options,
        stream: true
      });

      globalEventBus.emit('ai-stream-start', {
        requestId,
        mode: mode.id,
        provider: request.provider,
        model: request.model
      });

      let fullContent = '';
      const chunks: string[] = [];

      const streamResponse = await this.aiProvidersAPI.streamRequest(request);

      for await (const chunk of streamResponse) {
        if (chunk.content) {
          fullContent += chunk.content;
          chunks.push(chunk.content);
          
          onChunk?.(chunk.content);
          
          globalEventBus.emit('ai-stream-chunk', {
            requestId,
            chunk: chunk.content,
            totalLength: fullContent.length
          });
        }
      }

      const processingTime = Date.now() - startTime;

      const aiResponse: AIResponse = {
        id: requestId,
        content: fullContent,
        model: request.model,
        provider: request.provider,
        usage: streamResponse.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        metadata: {
          processingTime,
          timestamp: new Date().toISOString(),
          editSuggestions: this.extractEditSuggestions(fullContent, mode, documentContext)
        }
      };

      globalEventBus.emit('ai-stream-complete', {
        requestId,
        response: aiResponse,
        totalChunks: chunks.length
      });

      return aiResponse;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      globalEventBus.emit('ai-stream-error', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime
      });

      throw error;
    }
  }

  /**
   * Get all available AI providers
   */
  async getAvailableProviders(): Promise<AIProvider[]> {
    if (!this.isInitialized || !this.aiProvidersAPI) {
      return [];
    }

    try {
      const providers = await this.aiProvidersAPI.getProviders();
      return providers.map((provider: any) => ({
        id: provider.id,
        name: provider.name,
        type: provider.type,
        isAvailable: provider.isAvailable,
        models: provider.models || [],
        maxTokens: provider.maxTokens || 4096,
        supportsStreaming: provider.supportsStreaming || false
      }));
    } catch (error) {
      console.error('Error getting available providers:', error);
      return [];
    }
  }

  /**
   * Get integration status and health
   */
  getIntegrationStatus(): {
    isAvailable: boolean;
    isInitialized: boolean;
    providers: number;
    config: AIProvidersIntegrationConfig;
    cacheSize: number;
  } {
    return {
      isAvailable: this.isAIProvidersAvailable(),
      isInitialized: this.isInitialized,
      providers: this.aiProvidersAPI ? Object.keys(this.aiProvidersAPI.getProviders?.() || {}).length : 0,
      config: this.config,
      cacheSize: this.responseCache.size
    };
  }

  /**
   * Update integration configuration
   */
  updateConfig(newConfig: Partial<AIProvidersIntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    globalEventBus.emit('ai-providers-config-updated', {
      config: this.config,
      source: 'writerr-chat'
    });
  }

  /**
   * Clear response cache
   */
  clearCache(): void {
    this.responseCache.clear();
    
    globalEventBus.emit('ai-providers-cache-cleared', {
      source: 'writerr-chat'
    });
  }

  /**
   * Clean up integration resources
   */
  dispose(): void {
    this.isInitialized = false;
    this.aiProvidersAPI = null;
    this.responseCache.clear();
    this.rateLimiter.clear();
    
    // Remove event listeners
    globalEventBus.off('ai-providers-plugin-unloaded');
    globalEventBus.off('ai-providers-error');
    
    globalEventBus.emit('ai-providers-integration-disposed', {
      source: 'writerr-chat'
    });
  }

  /**
   * Check if AI Providers plugin is available
   */
  private isAIProvidersAvailable(): boolean {
    const aiProvidersInfo = globalRegistry.getPlugin('ai-providers');
    return aiProvidersInfo !== null && aiProvidersInfo.capabilities.includes('ai-models');
  }

  /**
   * Get AI Providers API from the global registry
   */
  private getAIProvidersAPI(): any {
    try {
      // Access AI Providers through window global API
      const aiProvidersGlobal = (window as any).AISwitchboard;
      
      if (!aiProvidersGlobal) {
        console.warn('AI Providers global API not found');
        return null;
      }

      return aiProvidersGlobal;
    } catch (error) {
      console.error('Error accessing AI Providers API:', error);
      return null;
    }
  }

  /**
   * Set up event listeners for AI Providers integration
   */
  private setupEventListeners(): void {
    globalEventBus.on('ai-providers-plugin-unloaded', () => {
      console.warn('AI Providers plugin unloaded, integration disabled');
      this.isInitialized = false;
      this.aiProvidersAPI = null;
    });

    globalEventBus.on('ai-providers-error', (event: any) => {
      console.error('AI Providers error:', event);
      
      globalEventBus.emit('ai-providers-integration-error', {
        originalError: event,
        source: 'writerr-chat'
      });
    });
  }

  /**
   * Build an AI request from chat context
   */
  private async buildAIRequest(
    messages: ChatMessage[],
    mode: ChatMode,
    documentContext?: DocumentContext,
    options: Partial<AIRequestOptions> = {}
  ): Promise<any> {
    const systemPrompt = this.buildSystemPrompt(mode, documentContext);
    const formattedMessages = this.formatMessagesForAI(messages);

    return {
      provider: options.model?.split('/')[0] || this.config.defaultProvider,
      model: options.model || this.config.defaultModel,
      messages: [
        { role: 'system', content: systemPrompt },
        ...formattedMessages
      ],
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 2048,
      stream: options.stream || false,
      timeout: this.config.timeout
    };
  }

  /**
   * Build system prompt based on mode and context
   */
  private buildSystemPrompt(mode: ChatMode, documentContext?: DocumentContext): string {
    let prompt = mode.prompt || `You are a helpful writing assistant in ${mode.name} mode.`;

    if (documentContext?.selection?.text) {
      prompt += `\n\nCurrent selection:\n${documentContext.selection.text}`;
    }

    if (documentContext?.projectContext?.length) {
      prompt += '\n\nProject context:';
      documentContext.projectContext.forEach(ctx => {
        prompt += `\n- ${ctx.filePath} (${ctx.relationship})`;
      });
    }

    if (mode.trackEditsIntegration && mode.capabilities?.some(cap => cap.type === 'document-edit')) {
      prompt += '\n\nWhen suggesting edits, provide them in a structured format that can be automatically applied.';
    }

    return prompt;
  }

  /**
   * Format messages for AI consumption
   */
  private formatMessagesForAI(messages: ChatMessage[]): any[] {
    return messages
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString()
      }));
  }

  /**
   * Make AI request with fallback chain
   */
  private async makeAIRequestWithFallback(request: any): Promise<any> {
    const providersToTry = [request.provider, ...this.config.fallbackChain]
      .filter((provider, index, arr) => arr.indexOf(provider) === index);

    let lastError: Error | null = null;

    for (const provider of providersToTry) {
      try {
        const providerRequest = { ...request, provider };
        const response = await this.makeAIRequest(providerRequest);
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.warn(`AI request failed for provider ${provider}:`, error);
        
        globalEventBus.emit('ai-provider-fallback', {
          provider,
          error: lastError.message,
          nextProvider: providersToTry[providersToTry.indexOf(provider) + 1]
        });
      }
    }

    throw lastError || new Error('All AI providers failed');
  }

  /**
   * Make a single AI request
   */
  private async makeAIRequest(request: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('AI request timeout'));
      }, this.config.timeout);

      this.aiProvidersAPI.request(request)
        .then((response: any) => {
          clearTimeout(timeout);
          resolve(response);
        })
        .catch((error: any) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  /**
   * Extract edit suggestions from AI response
   */
  private extractEditSuggestions(
    content: string,
    mode: ChatMode,
    documentContext?: DocumentContext
  ): EditSuggestion[] | undefined {
    if (!mode.trackEditsIntegration || !documentContext?.selection) {
      return undefined;
    }

    // Simple regex-based extraction for structured edits
    // This could be enhanced with more sophisticated parsing
    const editRegex = /```edit\s*\n([\s\S]*?)\n```/g;
    const suggestions: EditSuggestion[] = [];
    let match;

    while ((match = editRegex.exec(content)) !== null) {
      const editContent = match[1].trim();
      
      suggestions.push({
        id: this.generateRequestId(),
        type: 'replace',
        range: documentContext.selection,
        newText: editContent,
        reason: 'AI suggestion from chat',
        confidence: 0.8
      });
    }

    return suggestions.length > 0 ? suggestions : undefined;
  }

  /**
   * Check if rate limited
   */
  private isRateLimited(): boolean {
    const now = Date.now();
    const lastRequest = this.rateLimiter.get('lastRequest') || 0;
    const minInterval = 1000; // 1 second minimum between requests
    
    return (now - lastRequest) < minInterval;
  }

  /**
   * Update rate limiter
   */
  private updateRateLimit(): void {
    this.rateLimiter.set('lastRequest', Date.now());
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `writerr-chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(request: any): string {
    const keyData = {
      provider: request.provider,
      model: request.model,
      messages: request.messages,
      temperature: request.temperature
    };
    
    return `cache-${btoa(JSON.stringify(keyData)).replace(/[^a-zA-Z0-9]/g, '')}`;
  }
}

// Export singleton instance for use across the application
export const aiProvidersIntegration = new AIProvidersIntegration();