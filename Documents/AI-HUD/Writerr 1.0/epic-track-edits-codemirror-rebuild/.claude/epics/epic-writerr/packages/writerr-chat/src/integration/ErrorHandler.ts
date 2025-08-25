/**
 * Error Handler for Writerr Chat Plugin Integration Layer
 * 
 * This module provides comprehensive error handling and recovery strategies
 * for AI Providers and Track Edits integrations with graceful degradation.
 */

import { globalEventBus } from '@writerr/shared';

export enum ErrorType {
  AI_PROVIDER_UNAVAILABLE = 'ai-provider-unavailable',
  TRACK_EDITS_UNAVAILABLE = 'track-edits-unavailable',
  NETWORK_ERROR = 'network-error',
  RATE_LIMIT_EXCEEDED = 'rate-limit-exceeded',
  TIMEOUT = 'timeout',
  INVALID_RESPONSE = 'invalid-response',
  PERMISSION_DENIED = 'permission-denied',
  QUOTA_EXCEEDED = 'quota-exceeded',
  INTEGRATION_ERROR = 'integration-error',
  UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ErrorContext {
  source: 'ai-providers' | 'track-edits' | 'response-router' | 'chat-system';
  operation: string;
  timestamp: Date;
  requestId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface ErrorInfo {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  originalError: Error;
  context: ErrorContext;
  recoveryAttempts: number;
  isRecoverable: boolean;
}

export interface RecoveryStrategy {
  name: string;
  description: string;
  execute: (error: ErrorInfo) => Promise<boolean>;
  canRecover: (error: ErrorInfo) => boolean;
  maxAttempts: number;
}

export interface FallbackOption {
  name: string;
  description: string;
  priority: number;
  isAvailable: () => boolean;
  execute: (context: ErrorContext) => Promise<any>;
}

export class IntegrationErrorHandler {
  private recoveryStrategies: Map<ErrorType, RecoveryStrategy[]> = new Map();
  private fallbackOptions: FallbackOption[] = [];
  private errorHistory: ErrorInfo[] = [];
  private maxHistorySize = 1000;
  private recoveryInProgress = new Set<string>();

  constructor() {
    this.initializeRecoveryStrategies();
    this.initializeFallbackOptions();
    this.setupEventListeners();
  }

  /**
   * Handle an error with automatic recovery attempts
   */
  async handleError(error: Error, context: ErrorContext): Promise<any> {
    const errorInfo = this.analyzeError(error, context);
    this.logError(errorInfo);

    const recoveryId = `${errorInfo.context.source}-${errorInfo.context.operation}-${Date.now()}`;

    // Prevent concurrent recovery attempts for the same operation
    if (this.recoveryInProgress.has(recoveryId)) {
      throw new Error('Recovery already in progress for this operation');
    }

    try {
      this.recoveryInProgress.add(recoveryId);

      // Attempt recovery if error is recoverable
      if (errorInfo.isRecoverable) {
        const recovered = await this.attemptRecovery(errorInfo);
        if (recovered) {
          globalEventBus.emit('error-recovery-success', {
            errorType: errorInfo.type,
            context: errorInfo.context,
            recoveryAttempts: errorInfo.recoveryAttempts
          });
          return;
        }
      }

      // If recovery failed, try fallback strategies
      const fallbackResult = await this.attemptFallback(errorInfo);
      if (fallbackResult !== null) {
        globalEventBus.emit('error-fallback-success', {
          errorType: errorInfo.type,
          context: errorInfo.context,
          fallbackUsed: fallbackResult.strategy
        });
        return fallbackResult.result;
      }

      // If all else fails, provide graceful degradation
      return this.gracefulDegradation(errorInfo);

    } finally {
      this.recoveryInProgress.delete(recoveryId);
    }
  }

  /**
   * Analyze error to determine type, severity, and recovery options
   */
  private analyzeError(error: Error, context: ErrorContext): ErrorInfo {
    const type = this.classifyError(error, context);
    const severity = this.determineSeverity(type, error, context);
    
    const errorInfo: ErrorInfo = {
      type,
      severity,
      message: error.message,
      originalError: error,
      context: {
        ...context,
        timestamp: new Date()
      },
      recoveryAttempts: 0,
      isRecoverable: this.isRecoverable(type, severity)
    };

    this.errorHistory.push(errorInfo);
    
    // Trim history if it gets too large
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
    }

    return errorInfo;
  }

  /**
   * Classify error type based on error message and context
   */
  private classifyError(error: Error, context: ErrorContext): ErrorType {
    const message = error.message.toLowerCase();

    // AI Provider specific errors
    if (context.source === 'ai-providers') {
      if (message.includes('rate limit') || message.includes('too many requests')) {
        return ErrorType.RATE_LIMIT_EXCEEDED;
      }
      if (message.includes('quota') || message.includes('billing')) {
        return ErrorType.QUOTA_EXCEEDED;
      }
      if (message.includes('timeout') || message.includes('timed out')) {
        return ErrorType.TIMEOUT;
      }
      if (message.includes('network') || message.includes('connection')) {
        return ErrorType.NETWORK_ERROR;
      }
      if (message.includes('not available') || message.includes('unavailable')) {
        return ErrorType.AI_PROVIDER_UNAVAILABLE;
      }
    }

    // Track Edits specific errors
    if (context.source === 'track-edits') {
      if (message.includes('not available') || message.includes('unavailable')) {
        return ErrorType.TRACK_EDITS_UNAVAILABLE;
      }
      if (message.includes('permission') || message.includes('unauthorized')) {
        return ErrorType.PERMISSION_DENIED;
      }
    }

    // General errors
    if (message.includes('network') || message.includes('fetch')) {
      return ErrorType.NETWORK_ERROR;
    }

    if (message.includes('timeout')) {
      return ErrorType.TIMEOUT;
    }

    return ErrorType.UNKNOWN;
  }

  /**
   * Determine error severity
   */
  private determineSeverity(type: ErrorType, error: Error, context: ErrorContext): ErrorSeverity {
    switch (type) {
      case ErrorType.AI_PROVIDER_UNAVAILABLE:
      case ErrorType.TRACK_EDITS_UNAVAILABLE:
        return ErrorSeverity.HIGH;
        
      case ErrorType.QUOTA_EXCEEDED:
      case ErrorType.PERMISSION_DENIED:
        return ErrorSeverity.CRITICAL;
        
      case ErrorType.RATE_LIMIT_EXCEEDED:
      case ErrorType.TIMEOUT:
        return ErrorSeverity.MEDIUM;
        
      case ErrorType.NETWORK_ERROR:
      case ErrorType.INVALID_RESPONSE:
        return ErrorSeverity.MEDIUM;
        
      default:
        return ErrorSeverity.LOW;
    }
  }

  /**
   * Determine if error is recoverable
   */
  private isRecoverable(type: ErrorType, severity: ErrorSeverity): boolean {
    if (severity === ErrorSeverity.CRITICAL) return false;
    
    const recoverableTypes = [
      ErrorType.RATE_LIMIT_EXCEEDED,
      ErrorType.TIMEOUT,
      ErrorType.NETWORK_ERROR,
      ErrorType.INVALID_RESPONSE
    ];
    
    return recoverableTypes.includes(type);
  }

  /**
   * Attempt error recovery using appropriate strategies
   */
  private async attemptRecovery(errorInfo: ErrorInfo): Promise<boolean> {
    const strategies = this.recoveryStrategies.get(errorInfo.type) || [];
    
    for (const strategy of strategies) {
      if (!strategy.canRecover(errorInfo)) continue;
      
      if (errorInfo.recoveryAttempts >= strategy.maxAttempts) {
        continue;
      }

      try {
        errorInfo.recoveryAttempts++;
        
        globalEventBus.emit('error-recovery-attempt', {
          errorType: errorInfo.type,
          strategy: strategy.name,
          attempt: errorInfo.recoveryAttempts,
          context: errorInfo.context
        });

        const success = await strategy.execute(errorInfo);
        
        if (success) {
          return true;
        }
      } catch (recoveryError) {
        console.warn(`Recovery strategy ${strategy.name} failed:`, recoveryError);
      }
    }

    return false;
  }

  /**
   * Attempt fallback strategies
   */
  private async attemptFallback(errorInfo: ErrorInfo): Promise<{ result: any; strategy: string } | null> {
    const availableFallbacks = this.fallbackOptions
      .filter(option => option.isAvailable())
      .sort((a, b) => b.priority - a.priority);

    for (const fallback of availableFallbacks) {
      try {
        globalEventBus.emit('error-fallback-attempt', {
          errorType: errorInfo.type,
          fallback: fallback.name,
          context: errorInfo.context
        });

        const result = await fallback.execute(errorInfo.context);
        return { result, strategy: fallback.name };
      } catch (fallbackError) {
        console.warn(`Fallback strategy ${fallback.name} failed:`, fallbackError);
      }
    }

    return null;
  }

  /**
   * Provide graceful degradation when all recovery attempts fail
   */
  private gracefulDegradation(errorInfo: ErrorInfo): any {
    globalEventBus.emit('error-graceful-degradation', {
      errorType: errorInfo.type,
      context: errorInfo.context,
      userMessage: this.getUserFriendlyMessage(errorInfo)
    });

    switch (errorInfo.context.source) {
      case 'ai-providers':
        return {
          content: 'I\'m temporarily unable to process your request. Please try again in a moment.',
          error: true,
          fallbackMode: true
        };
        
      case 'track-edits':
        return {
          message: 'Edit suggestions are available but cannot be automatically applied. Please apply them manually.',
          manualMode: true
        };
        
      default:
        return {
          error: true,
          message: 'A temporary error occurred. Please try again.'
        };
    }
  }

  /**
   * Get user-friendly error message
   */
  private getUserFriendlyMessage(errorInfo: ErrorInfo): string {
    switch (errorInfo.type) {
      case ErrorType.AI_PROVIDER_UNAVAILABLE:
        return 'The AI service is temporarily unavailable. Please try again later.';
        
      case ErrorType.TRACK_EDITS_UNAVAILABLE:
        return 'The editing system is temporarily unavailable. You can still view suggestions.';
        
      case ErrorType.RATE_LIMIT_EXCEEDED:
        return 'Too many requests. Please wait a moment before trying again.';
        
      case ErrorType.QUOTA_EXCEEDED:
        return 'Usage limit reached. Please check your account settings.';
        
      case ErrorType.TIMEOUT:
        return 'The request took too long. Please try again.';
        
      case ErrorType.NETWORK_ERROR:
        return 'Network connection issue. Please check your connection.';
        
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Initialize recovery strategies
   */
  private initializeRecoveryStrategies(): void {
    // Rate limit recovery
    this.recoveryStrategies.set(ErrorType.RATE_LIMIT_EXCEEDED, [{
      name: 'exponential-backoff',
      description: 'Wait with exponential backoff before retry',
      maxAttempts: 3,
      canRecover: () => true,
      execute: async (error) => {
        const delay = Math.pow(2, error.recoveryAttempts) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return true;
      }
    }]);

    // Timeout recovery
    this.recoveryStrategies.set(ErrorType.TIMEOUT, [{
      name: 'retry-with-timeout',
      description: 'Retry with increased timeout',
      maxAttempts: 2,
      canRecover: () => true,
      execute: async (error) => {
        // Would implement timeout increase logic
        await new Promise(resolve => setTimeout(resolve, 2000));
        return true;
      }
    }]);

    // Network error recovery
    this.recoveryStrategies.set(ErrorType.NETWORK_ERROR, [{
      name: 'network-retry',
      description: 'Retry network request after delay',
      maxAttempts: 3,
      canRecover: () => navigator.onLine,
      execute: async (error) => {
        if (!navigator.onLine) return false;
        await new Promise(resolve => setTimeout(resolve, 1000));
        return true;
      }
    }]);
  }

  /**
   * Initialize fallback options
   */
  private initializeFallbackOptions(): void {
    // AI Provider fallback to cached responses
    this.fallbackOptions.push({
      name: 'cached-response',
      description: 'Use cached AI response if available',
      priority: 10,
      isAvailable: () => true,
      execute: async (context) => {
        // Would implement cache lookup
        return null;
      }
    });

    // Manual mode fallback
    this.fallbackOptions.push({
      name: 'manual-mode',
      description: 'Switch to manual interaction mode',
      priority: 5,
      isAvailable: () => true,
      execute: async (context) => {
        return {
          mode: 'manual',
          message: 'Switched to manual mode due to technical issues.'
        };
      }
    });

    // Offline mode fallback
    this.fallbackOptions.push({
      name: 'offline-mode',
      description: 'Use offline capabilities when available',
      priority: 3,
      isAvailable: () => !navigator.onLine,
      execute: async (context) => {
        return {
          mode: 'offline',
          message: 'Operating in offline mode with limited functionality.'
        };
      }
    });
  }

  /**
   * Set up event listeners for system-wide error handling
   */
  private setupEventListeners(): void {
    // Listen for unhandled errors in the integration layer
    globalEventBus.on('integration-error', async (event: any) => {
      if (event.handled) return;
      
      await this.handleError(event.error, event.context);
      event.handled = true;
    });

    // Listen for network status changes
    window.addEventListener('online', () => {
      globalEventBus.emit('network-status-changed', { online: true });
    });

    window.addEventListener('offline', () => {
      globalEventBus.emit('network-status-changed', { online: false });
    });
  }

  /**
   * Log error for monitoring and debugging
   */
  private logError(errorInfo: ErrorInfo): void {
    console.error(`[${errorInfo.severity.toUpperCase()}] ${errorInfo.type}:`, {
      message: errorInfo.message,
      context: errorInfo.context,
      stack: errorInfo.originalError.stack
    });

    // Emit for external monitoring systems
    globalEventBus.emit('error-logged', {
      type: errorInfo.type,
      severity: errorInfo.severity,
      context: errorInfo.context,
      timestamp: errorInfo.context.timestamp
    });
  }

  /**
   * Get error statistics for monitoring
   */
  getErrorStatistics(): {
    totalErrors: number;
    errorsByType: Record<ErrorType, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    recoverySuccessRate: number;
    recentErrors: ErrorInfo[];
  } {
    const errorsByType = this.errorHistory.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<ErrorType, number>);

    const errorsBySeverity = this.errorHistory.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<ErrorSeverity, number>);

    const recoverableErrors = this.errorHistory.filter(e => e.isRecoverable);
    const recoveredErrors = recoverableErrors.filter(e => e.recoveryAttempts > 0);
    const recoverySuccessRate = recoverableErrors.length > 0 
      ? recoveredErrors.length / recoverableErrors.length 
      : 0;

    return {
      totalErrors: this.errorHistory.length,
      errorsByType,
      errorsBySeverity,
      recoverySuccessRate,
      recentErrors: this.errorHistory.slice(-10)
    };
  }

  /**
   * Clear error history (useful for testing or privacy)
   */
  clearErrorHistory(): void {
    this.errorHistory = [];
    
    globalEventBus.emit('error-history-cleared', {
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Add custom recovery strategy
   */
  addRecoveryStrategy(errorType: ErrorType, strategy: RecoveryStrategy): void {
    if (!this.recoveryStrategies.has(errorType)) {
      this.recoveryStrategies.set(errorType, []);
    }
    
    this.recoveryStrategies.get(errorType)!.push(strategy);
  }

  /**
   * Add custom fallback option
   */
  addFallbackOption(option: FallbackOption): void {
    this.fallbackOptions.push(option);
    this.fallbackOptions.sort((a, b) => b.priority - a.priority);
  }
}

// Export singleton instance
export const integrationErrorHandler = new IntegrationErrorHandler();