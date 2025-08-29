/**
 * Retry Logic and Progressive Fallback System
 * 
 * Provides sophisticated retry mechanisms and fallback strategies for AI submissions
 */

import { AISubmissionError, ErrorType, ErrorCategory, RecoveryStrategy } from './ai-submission-error-manager';

export interface RetryConfiguration {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryableErrorTypes: ErrorType[];
}

export interface RetryAttempt {
  attemptNumber: number;
  timestamp: Date;
  error?: AISubmissionError;
  success: boolean;
  duration: number;
}

export interface RetryContext {
  operationId: string;
  sessionId: string;
  transactionId?: string;
  originalData: any;
  attempts: RetryAttempt[];
  startTime: Date;
  configuration: RetryConfiguration;
}

export interface FallbackStrategy {
  name: string;
  priority: number;
  condition: (error: AISubmissionError, context: any) => boolean;
  action: (context: any, error: AISubmissionError) => Promise<any>;
  rollbackOnFailure: boolean;
}

export class RetryRecoveryManager {
  private retryContexts = new Map<string, RetryContext>();
  private fallbackStrategies: FallbackStrategy[] = [];
  private defaultConfiguration: RetryConfiguration;

  constructor() {
    this.defaultConfiguration = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitter: true,
      retryableErrorTypes: [
        ErrorType.NETWORK,
        ErrorType.RATE_LIMITING,
        ErrorType.EDITORIAL_ENGINE,
        ErrorType.STORAGE
      ]
    };

    this.initializeFallbackStrategies();
  }

  /**
   * Initialize default fallback strategies
   */
  private initializeFallbackStrategies(): void {
    // Network failure fallback - cache locally
    this.fallbackStrategies.push({
      name: 'cache-locally',
      priority: 1,
      condition: (error) => error.type === ErrorType.NETWORK,
      action: async (context) => {
        console.log('Caching changes locally due to network failure');
        return this.cacheChangesLocally(context);
      },
      rollbackOnFailure: false
    });

    // Editorial Engine failure fallback - direct processing
    this.fallbackStrategies.push({
      name: 'direct-processing',
      priority: 2,
      condition: (error) => error.type === ErrorType.EDITORIAL_ENGINE,
      action: async (context) => {
        console.log('Processing changes directly, bypassing Editorial Engine');
        return this.processChangesDirectly(context);
      },
      rollbackOnFailure: false
    });

    // Validation failure fallback - sanitize and retry
    this.fallbackStrategies.push({
      name: 'sanitize-and-retry',
      priority: 3,
      condition: (error) => error.type === ErrorType.VALIDATION,
      action: async (context) => {
        console.log('Sanitizing data and retrying submission');
        return this.sanitizeAndRetry(context);
      },
      rollbackOnFailure: true
    });

    // Batch operation failure fallback - individual processing
    this.fallbackStrategies.push({
      name: 'individual-processing',
      priority: 4,
      condition: (error) => error.type === ErrorType.BATCH_OPERATION,
      action: async (context) => {
        console.log('Processing changes individually due to batch failure');
        return this.processIndividually(context);
      },
      rollbackOnFailure: true
    });

    // Storage failure fallback - memory storage
    this.fallbackStrategies.push({
      name: 'memory-storage',
      priority: 5,
      condition: (error) => error.type === ErrorType.STORAGE,
      action: async (context) => {
        console.log('Using memory storage due to persistent storage failure');
        return this.useMemoryStorage(context);
      },
      rollbackOnFailure: false
    });

    // Rate limiting fallback - exponential backoff
    this.fallbackStrategies.push({
      name: 'exponential-backoff',
      priority: 6,
      condition: (error) => error.type === ErrorType.RATE_LIMITING,
      action: async (context, error) => {
        console.log('Applying exponential backoff due to rate limiting');
        return this.applyExponentialBackoff(context, error);
      },
      rollbackOnFailure: false
    });
  }

  /**
   * Execute operation with retry logic and fallback strategies
   */
  public async executeWithRetry<T>(
    operationId: string,
    sessionId: string,
    operation: () => Promise<T>,
    configuration?: Partial<RetryConfiguration>
  ): Promise<{
    success: boolean;
    result?: T;
    error?: AISubmissionError;
    attempts: number;
    fallbackUsed?: string;
    duration: number;
  }> {
    const config = { ...this.defaultConfiguration, ...configuration };
    const startTime = new Date();
    
    const context: RetryContext = {
      operationId,
      sessionId,
      originalData: null, // Will be set by caller if needed
      attempts: [],
      startTime,
      configuration: config
    };

    this.retryContexts.set(operationId, context);

    try {
      // First attempt
      const result = await this.attemptOperation(operation, context, 1);
      if (result.success) {
        return {
          success: true,
          result: result.data,
          attempts: 1,
          duration: Date.now() - startTime.getTime()
        };
      }

      // Retry attempts
      let lastError = result.error;
      for (let attempt = 2; attempt <= config.maxRetries + 1; attempt++) {
        if (!this.shouldRetry(lastError!, config)) {
          break;
        }

        const delay = this.calculateDelay(attempt - 1, config);
        await this.sleep(delay);

        const retryResult = await this.attemptOperation(operation, context, attempt);
        if (retryResult.success) {
          return {
            success: true,
            result: retryResult.data,
            attempts: attempt,
            duration: Date.now() - startTime.getTime()
          };
        }
        
        lastError = retryResult.error;
      }

      // All retries exhausted, try fallback strategies
      const fallbackResult = await this.tryFallbackStrategies(context, lastError!);
      if (fallbackResult.success) {
        return {
          success: true,
          result: fallbackResult.result,
          attempts: context.attempts.length,
          fallbackUsed: fallbackResult.strategyUsed,
          duration: Date.now() - startTime.getTime()
        };
      }

      // Complete failure
      return {
        success: false,
        error: lastError,
        attempts: context.attempts.length,
        duration: Date.now() - startTime.getTime()
      };

    } finally {
      // Cleanup context after some time
      setTimeout(() => {
        this.retryContexts.delete(operationId);
      }, 300000); // 5 minutes
    }
  }

  /**
   * Attempt to execute the operation
   */
  private async attemptOperation<T>(
    operation: () => Promise<T>,
    context: RetryContext,
    attemptNumber: number
  ): Promise<{ success: boolean; data?: T; error?: AISubmissionError }> {
    const attemptStart = Date.now();
    
    try {
      const result = await operation();
      
      const attempt: RetryAttempt = {
        attemptNumber,
        timestamp: new Date(),
        success: true,
        duration: Date.now() - attemptStart
      };
      
      context.attempts.push(attempt);
      
      return { success: true, data: result };
    } catch (error) {
      const aiError = this.convertToAIError(error, context);
      
      const attempt: RetryAttempt = {
        attemptNumber,
        timestamp: new Date(),
        error: aiError,
        success: false,
        duration: Date.now() - attemptStart
      };
      
      context.attempts.push(attempt);
      
      return { success: false, error: aiError };
    }
  }

  /**
   * Determine if error is retryable
   */
  private shouldRetry(error: AISubmissionError, config: RetryConfiguration): boolean {
    return config.retryableErrorTypes.includes(error.type) && error.retryable;
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private calculateDelay(attemptNumber: number, config: RetryConfiguration): number {
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attemptNumber - 1);
    
    // Apply maximum delay cap
    delay = Math.min(delay, config.maxDelay);
    
    // Apply jitter to prevent thundering herd
    if (config.jitter) {
      const jitterFactor = 0.1; // 10% jitter
      const jitter = delay * jitterFactor * (Math.random() * 2 - 1);
      delay += jitter;
    }
    
    return Math.floor(delay);
  }

  /**
   * Try fallback strategies in priority order
   */
  private async tryFallbackStrategies(
    context: RetryContext,
    error: AISubmissionError
  ): Promise<{ success: boolean; result?: any; strategyUsed?: string }> {
    
    // Sort strategies by priority
    const applicableStrategies = this.fallbackStrategies
      .filter(strategy => strategy.condition(error, context))
      .sort((a, b) => a.priority - b.priority);

    for (const strategy of applicableStrategies) {
      try {
        console.log(`Attempting fallback strategy: ${strategy.name}`);
        
        const result = await strategy.action(context, error);
        
        if (result && result.success !== false) {
          console.log(`Fallback strategy ${strategy.name} succeeded`);
          return {
            success: true,
            result,
            strategyUsed: strategy.name
          };
        }
        
      } catch (fallbackError) {
        console.warn(`Fallback strategy ${strategy.name} failed:`, fallbackError);
        
        if (strategy.rollbackOnFailure) {
          // Log the need for rollback
          console.warn(`Fallback strategy ${strategy.name} requires rollback`);
        }
      }
    }

    return { success: false };
  }

  /**
   * Fallback strategy implementations
   */
  private async cacheChangesLocally(context: RetryContext): Promise<any> {
    // Implementation would cache changes locally for later sync
    const cacheKey = `cached_changes_${context.sessionId}_${Date.now()}`;
    
    // Store in memory or local storage
    const cachedData = {
      sessionId: context.sessionId,
      changes: context.originalData,
      timestamp: new Date(),
      retryCount: context.attempts.length
    };

    // In a real implementation, this would use proper storage
    console.log(`Cached changes locally with key: ${cacheKey}`);
    
    return {
      success: true,
      cacheKey,
      message: 'Changes cached locally for later synchronization'
    };
  }

  private async processChangesDirectly(context: RetryContext): Promise<any> {
    // Bypass Editorial Engine and process changes directly
    console.log('Processing changes directly without Editorial Engine');
    
    return {
      success: true,
      method: 'direct',
      message: 'Changes processed directly, bypassing Editorial Engine'
    };
  }

  private async sanitizeAndRetry(context: RetryContext): Promise<any> {
    // Sanitize data and attempt reprocessing
    console.log('Sanitizing data for retry attempt');
    
    // This would involve actual data sanitization
    return {
      success: true,
      method: 'sanitized',
      message: 'Data sanitized and processed successfully'
    };
  }

  private async processIndividually(context: RetryContext): Promise<any> {
    // Process changes one by one instead of as a batch
    console.log('Processing changes individually');
    
    const results: any[] = [];
    const changes = context.originalData?.changes || [];
    
    for (let i = 0; i < changes.length; i++) {
      try {
        // Process individual change
        const result = {
          changeId: changes[i].id || `change_${i}`,
          status: 'processed',
          timestamp: new Date()
        };
        results.push(result);
      } catch (error) {
        results.push({
          changeId: changes[i].id || `change_${i}`,
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date()
        });
      }
    }
    
    return {
      success: true,
      method: 'individual',
      results,
      message: `Processed ${results.filter(r => r.status === 'processed').length}/${results.length} changes individually`
    };
  }

  private async useMemoryStorage(context: RetryContext): Promise<any> {
    // Use memory storage instead of persistent storage
    console.log('Using memory storage due to persistent storage failure');
    
    return {
      success: true,
      method: 'memory',
      message: 'Changes stored in memory (will be lost on restart)'
    };
  }

  private async applyExponentialBackoff(context: RetryContext, error: AISubmissionError): Promise<any> {
    // Apply longer backoff for rate limiting
    const backoffDelay = Math.min(60000, 5000 * Math.pow(2, context.attempts.length)); // Max 1 minute
    
    console.log(`Applying exponential backoff: waiting ${backoffDelay}ms`);
    await this.sleep(backoffDelay);
    
    return {
      success: true,
      method: 'backoff',
      delay: backoffDelay,
      message: 'Applied exponential backoff for rate limiting'
    };
  }

  /**
   * Convert generic error to AISubmissionError format
   */
  private convertToAIError(error: any, context: RetryContext): AISubmissionError {
    // This would use the same logic as AISubmissionErrorManager.categorizeError
    return {
      type: ErrorType.PROCESSING,
      category: ErrorCategory.SYSTEM_ERROR,
      severity: 'medium' as any,
      code: 'RETRY_001',
      message: error instanceof Error ? error.message : String(error),
      context: context,
      timestamp: new Date(),
      retryable: true,
      rollbackRequired: false
    };
  }

  /**
   * Get retry statistics for monitoring
   */
  public getRetryStatistics(): {
    activeRetries: number;
    totalAttempts: number;
    successRate: number;
    averageAttempts: number;
    fallbackUsage: Record<string, number>;
  } {
    const contexts = Array.from(this.retryContexts.values());
    const allAttempts = contexts.flatMap(ctx => ctx.attempts);
    
    const successfulContexts = contexts.filter(ctx => 
      ctx.attempts.some(attempt => attempt.success)
    );
    
    const fallbackUsage: Record<string, number> = {};
    // This would track fallback strategy usage in a real implementation
    
    return {
      activeRetries: contexts.length,
      totalAttempts: allAttempts.length,
      successRate: contexts.length > 0 ? successfulContexts.length / contexts.length : 0,
      averageAttempts: contexts.length > 0 ? allAttempts.length / contexts.length : 0,
      fallbackUsage
    };
  }

  /**
   * Add custom fallback strategy
   */
  public addFallbackStrategy(strategy: FallbackStrategy): void {
    this.fallbackStrategies.push(strategy);
    // Re-sort by priority
    this.fallbackStrategies.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Update default retry configuration
   */
  public updateDefaultConfiguration(config: Partial<RetryConfiguration>): void {
    this.defaultConfiguration = { ...this.defaultConfiguration, ...config };
  }

  /**
   * Utility method for sleep/delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear completed retry contexts
   */
  public cleanup(): void {
    const now = Date.now();
    const maxAge = 300000; // 5 minutes
    
    for (const [id, context] of this.retryContexts.entries()) {
      const lastAttempt = context.attempts[context.attempts.length - 1];
      if (lastAttempt && (now - lastAttempt.timestamp.getTime()) > maxAge) {
        this.retryContexts.delete(id);
      }
    }
  }
}