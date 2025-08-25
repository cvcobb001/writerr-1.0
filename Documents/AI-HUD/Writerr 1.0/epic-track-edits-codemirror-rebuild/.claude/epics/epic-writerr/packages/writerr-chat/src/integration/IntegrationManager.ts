/**
 * Integration Manager for Writerr Chat Plugin
 * 
 * This module coordinates all integration components, providing a unified
 * interface for AI Providers, Track Edits, response routing, and error handling.
 */

import { 
  ChatMessage, 
  ChatMode, 
  DocumentContext, 
  EditSuggestion,
  ChatSession 
} from '../interface/types';
import { AIResponse, aiProvidersIntegration, AIProvidersIntegration } from '../providers/AIProvidersIntegration';
import { TrackEditsIntegration, trackEditsIntegration } from './TrackEditsIntegration';
import { ResponseRouter, RouterDecision } from './ResponseRouter';
import { integrationErrorHandler, IntegrationErrorHandler, ErrorContext } from './ErrorHandler';
import { performanceOptimizer, PerformanceOptimizer } from '../providers/PerformanceOptimizer';
import { globalEventBus } from '@writerr/shared';

export interface IntegrationStatus {
  aiProviders: {
    isAvailable: boolean;
    isInitialized: boolean;
    providers: number;
  };
  trackEdits: {
    isAvailable: boolean;
    isInitialized: boolean;
    version: string | null;
  };
  performance: {
    isOptimizing: boolean;
    cacheSize: number;
    activeRequests: number;
  };
  errors: {
    totalErrors: number;
    recoverySuccessRate: number;
    recentErrors: number;
  };
}

export interface ProcessedResponse {
  message: ChatMessage;
  decision: RouterDecision;
  performance: {
    totalTime: number;
    cached: boolean;
    optimized: boolean;
  };
}

export class IntegrationManager {
  private aiProviders: AIProvidersIntegration;
  private trackEdits: TrackEditsIntegration;
  private responseRouter: ResponseRouter;
  private errorHandler: IntegrationErrorHandler;
  private optimizer: PerformanceOptimizer;
  private isInitialized = false;
  private activeSessionId: string | null = null;

  constructor() {
    this.aiProviders = aiProvidersIntegration;
    this.trackEdits = trackEditsIntegration;
    this.responseRouter = new ResponseRouter(this.trackEdits);
    this.errorHandler = integrationErrorHandler;
    this.optimizer = performanceOptimizer;
  }

  /**
   * Initialize all integration components
   */
  async initialize(): Promise<boolean> {
    const startTime = Date.now();
    
    globalEventBus.emit('integration-manager-init-start', {
      timestamp: startTime
    });

    try {
      // Initialize AI Providers
      const aiInitialized = await this.aiProviders.initialize();
      if (!aiInitialized) {
        console.warn('AI Providers initialization failed, continuing with limited functionality');
      }

      // Initialize Track Edits
      const trackEditsInitialized = await this.trackEdits.initialize();
      if (!trackEditsInitialized) {
        console.warn('Track Edits initialization failed, continuing with limited functionality');
      }

      // Set up event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      
      const initTime = Date.now() - startTime;
      
      globalEventBus.emit('integration-manager-init-complete', {
        initTime,
        aiProviders: aiInitialized,
        trackEdits: trackEditsInitialized,
        timestamp: Date.now()
      });

      return true;
    } catch (error) {
      const initTime = Date.now() - startTime;
      
      await this.errorHandler.handleError(error as Error, {
        source: 'chat-system',
        operation: 'initialization',
        timestamp: new Date(),
        metadata: { initTime }
      });

      globalEventBus.emit('integration-manager-init-failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        initTime,
        timestamp: Date.now()
      });

      return false;
    }
  }

  /**
   * Process a chat message with full integration pipeline
   */
  async processMessage(
    messages: ChatMessage[],
    mode: ChatMode,
    documentContext?: DocumentContext,
    sessionId?: string
  ): Promise<ProcessedResponse> {
    if (!this.isInitialized) {
      throw new Error('Integration manager not initialized');
    }

    const startTime = Date.now();
    const requestId = this.generateRequestId();

    globalEventBus.emit('message-processing-start', {
      requestId,
      messageCount: messages.length,
      mode: mode.id,
      sessionId,
      hasContext: !!documentContext
    });

    try {
      // Update active session
      if (sessionId) {
        this.activeSessionId = sessionId;
      }

      // Process through AI with performance optimization
      const aiResponse = await this.optimizer.optimizeRequest(
        messages,
        mode,
        documentContext
      );

      // Route response through decision system
      const decision = await this.responseRouter.routeResponse(
        aiResponse,
        mode,
        documentContext,
        messages
      );

      // Create the response message
      const responseMessage: ChatMessage = {
        id: `msg-${requestId}`,
        content: decision.displayMessage,
        role: 'assistant',
        timestamp: new Date(),
        metadata: {
          mode: mode.id,
          documentContext,
          editSuggestions: decision.editSuggestions,
          processingTime: aiResponse.metadata.processingTime
        }
      };

      const totalTime = Date.now() - startTime;
      
      const processedResponse: ProcessedResponse = {
        message: responseMessage,
        decision,
        performance: {
          totalTime,
          cached: this.wasCachedResponse(aiResponse),
          optimized: this.wasOptimized(decision)
        }
      };

      globalEventBus.emit('message-processing-complete', {
        requestId,
        totalTime,
        decision: decision.action,
        editCount: decision.editSuggestions?.length || 0,
        sessionId
      });

      return processedResponse;

    } catch (error) {
      const totalTime = Date.now() - startTime;
      
      const handledError = await this.errorHandler.handleError(error as Error, {
        source: 'chat-system',
        operation: 'message-processing',
        timestamp: new Date(),
        requestId,
        metadata: { 
          mode: mode.id, 
          messageCount: messages.length,
          totalTime 
        }
      });

      globalEventBus.emit('message-processing-error', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        totalTime,
        sessionId
      });

      // Return error response if available from error handler
      if (handledError && typeof handledError === 'object' && handledError.content) {
        const errorMessage: ChatMessage = {
          id: `error-${requestId}`,
          content: handledError.content,
          role: 'assistant',
          timestamp: new Date(),
          metadata: {
            mode: mode.id,
            processingTime: totalTime
          }
        };

        return {
          message: errorMessage,
          decision: {
            action: 'show-message',
            displayMessage: handledError.content,
            confidence: 0,
            reasoning: 'Error recovery response'
          },
          performance: {
            totalTime,
            cached: false,
            optimized: false
          }
        };
      }

      throw error;
    }
  }

  /**
   * Apply edit suggestions manually
   */
  async applyEditSuggestions(
    suggestions: EditSuggestion[],
    documentContext?: DocumentContext
  ): Promise<boolean[]> {
    if (!this.isInitialized) {
      throw new Error('Integration manager not initialized');
    }

    try {
      globalEventBus.emit('manual-edit-application-start', {
        suggestionCount: suggestions.length,
        hasContext: !!documentContext
      });

      const results = await this.trackEdits.batchApplyEdits(suggestions, documentContext);
      
      globalEventBus.emit('manual-edit-application-complete', {
        suggestionCount: suggestions.length,
        successCount: results.filter(r => r).length,
        failureCount: results.filter(r => !r).length
      });

      return results;

    } catch (error) {
      await this.errorHandler.handleError(error as Error, {
        source: 'track-edits',
        operation: 'manual-edit-application',
        timestamp: new Date(),
        metadata: { suggestionCount: suggestions.length }
      });

      throw error;
    }
  }

  /**
   * Preview edit suggestions without applying
   */
  async previewEditSuggestions(suggestions: EditSuggestion[]): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Integration manager not initialized');
    }

    try {
      globalEventBus.emit('edit-preview-start', {
        suggestionCount: suggestions.length
      });

      for (const suggestion of suggestions) {
        await this.trackEdits.previewEdit(suggestion);
      }

      globalEventBus.emit('edit-preview-complete', {
        suggestionCount: suggestions.length
      });

    } catch (error) {
      await this.errorHandler.handleError(error as Error, {
        source: 'track-edits',
        operation: 'edit-preview',
        timestamp: new Date(),
        metadata: { suggestionCount: suggestions.length }
      });

      throw error;
    }
  }

  /**
   * Get current integration status
   */
  getStatus(): IntegrationStatus {
    const aiStatus = this.aiProviders.getIntegrationStatus();
    const trackEditsStatus = this.trackEdits.getIntegrationStatus();
    const optimizerStatus = this.optimizer.getStatus();
    const errorStats = this.errorHandler.getErrorStatistics();

    return {
      aiProviders: {
        isAvailable: aiStatus.isAvailable,
        isInitialized: aiStatus.isInitialized,
        providers: aiStatus.providers
      },
      trackEdits: {
        isAvailable: trackEditsStatus.isAvailable,
        isInitialized: trackEditsStatus.isInitialized,
        version: trackEditsStatus.version
      },
      performance: {
        isOptimizing: optimizerStatus.isOptimizing,
        cacheSize: optimizerStatus.cacheSize,
        activeRequests: optimizerStatus.activeRequests
      },
      errors: {
        totalErrors: errorStats.totalErrors,
        recoverySuccessRate: errorStats.recoverySuccessRate,
        recentErrors: errorStats.recentErrors.length
      }
    };
  }

  /**
   * Get performance metrics across all components
   */
  getPerformanceMetrics(): {
    optimizer: any;
    aiProviders: any;
    trackEdits: any;
    responseRouter: any;
  } {
    return {
      optimizer: this.optimizer.getMetrics(),
      aiProviders: this.aiProviders.getIntegrationStatus(),
      trackEdits: this.trackEdits.getIntegrationStatus(),
      responseRouter: this.responseRouter.getStatistics()
    };
  }

  /**
   * Update configuration across components
   */
  updateConfiguration(config: {
    aiProviders?: any;
    trackEdits?: any;
    responseRouter?: any;
    optimizer?: any;
  }): void {
    if (config.aiProviders) {
      this.aiProviders.updateConfig(config.aiProviders);
    }

    if (config.trackEdits) {
      this.trackEdits.updateConfig(config.trackEdits);
    }

    if (config.responseRouter) {
      this.responseRouter.updateConfig(config.responseRouter);
    }

    if (config.optimizer) {
      this.optimizer.updateConfig(config.optimizer);
    }

    globalEventBus.emit('integration-config-updated', {
      timestamp: Date.now(),
      config
    });
  }

  /**
   * Clear all caches and reset performance metrics
   */
  clearCaches(): void {
    this.optimizer.clearCache();
    this.aiProviders.clearCache();
    this.errorHandler.clearErrorHistory();
    
    globalEventBus.emit('integration-caches-cleared', {
      timestamp: Date.now()
    });
  }

  /**
   * Start a new chat session
   */
  startSession(sessionId: string, mode: ChatMode): void {
    this.activeSessionId = sessionId;
    
    globalEventBus.emit('chat-session-started', {
      sessionId,
      mode: mode.id,
      timestamp: Date.now()
    });
  }

  /**
   * End the current chat session
   */
  endSession(): void {
    if (this.activeSessionId) {
      globalEventBus.emit('chat-session-ended', {
        sessionId: this.activeSessionId,
        timestamp: Date.now()
      });
      
      this.activeSessionId = null;
    }
  }

  /**
   * Health check for all integrations
   */
  async healthCheck(): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy';
    components: Record<string, 'healthy' | 'degraded' | 'unhealthy'>;
    details: Record<string, any>;
  }> {
    const results = {
      overall: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
      components: {} as Record<string, 'healthy' | 'degraded' | 'unhealthy'>,
      details: {} as Record<string, any>
    };

    // Check AI Providers
    try {
      const aiStatus = this.aiProviders.getIntegrationStatus();
      results.components.aiProviders = aiStatus.isInitialized ? 'healthy' : 'degraded';
      results.details.aiProviders = aiStatus;
    } catch (error) {
      results.components.aiProviders = 'unhealthy';
      results.details.aiProviders = { error: error instanceof Error ? error.message : 'Unknown' };
    }

    // Check Track Edits
    try {
      const trackEditsStatus = this.trackEdits.getIntegrationStatus();
      results.components.trackEdits = trackEditsStatus.isInitialized ? 'healthy' : 'degraded';
      results.details.trackEdits = trackEditsStatus;
    } catch (error) {
      results.components.trackEdits = 'unhealthy';
      results.details.trackEdits = { error: error instanceof Error ? error.message : 'Unknown' };
    }

    // Check Performance Optimizer
    try {
      const optimizerStatus = this.optimizer.getStatus();
      results.components.optimizer = 'healthy';
      results.details.optimizer = optimizerStatus;
    } catch (error) {
      results.components.optimizer = 'unhealthy';
      results.details.optimizer = { error: error instanceof Error ? error.message : 'Unknown' };
    }

    // Determine overall health
    const componentStates = Object.values(results.components);
    if (componentStates.every(state => state === 'healthy')) {
      results.overall = 'healthy';
    } else if (componentStates.some(state => state === 'healthy')) {
      results.overall = 'degraded';
    } else {
      results.overall = 'unhealthy';
    }

    globalEventBus.emit('integration-health-check', {
      result: results,
      timestamp: Date.now()
    });

    return results;
  }

  /**
   * Clean up and dispose of all integrations
   */
  dispose(): void {
    this.aiProviders.dispose();
    this.trackEdits.dispose();
    this.optimizer.clearCache();
    this.errorHandler.clearErrorHistory();
    
    // Remove event listeners
    globalEventBus.off('document-selection-changed');
    globalEventBus.off('chat-mode-changed');
    globalEventBus.off('session-ended');

    this.isInitialized = false;
    this.activeSessionId = null;
    
    globalEventBus.emit('integration-manager-disposed', {
      timestamp: Date.now()
    });
  }

  /**
   * Set up event listeners for integration coordination
   */
  private setupEventListeners(): void {
    // Listen for document context changes
    globalEventBus.on('document-selection-changed', (event: any) => {
      globalEventBus.emit('document-context-updated', {
        sessionId: this.activeSessionId,
        context: event,
        timestamp: Date.now()
      });
    });

    // Listen for mode changes
    globalEventBus.on('chat-mode-changed', (event: any) => {
      globalEventBus.emit('integration-mode-changed', {
        sessionId: this.activeSessionId,
        previousMode: event.previousMode,
        newMode: event.modeId,
        timestamp: Date.now()
      });
    });

    // Listen for session management
    globalEventBus.on('session-ended', () => {
      this.endSession();
    });
  }

  /**
   * Check if response was cached
   */
  private wasCachedResponse(response: AIResponse): boolean {
    // This would check if the response came from cache
    return response.metadata.processingTime < 100; // Quick heuristic
  }

  /**
   * Check if response was optimized
   */
  private wasOptimized(decision: RouterDecision): boolean {
    return decision.confidence > 0.8 && decision.action !== 'show-message';
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `mgr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const integrationManager = new IntegrationManager();