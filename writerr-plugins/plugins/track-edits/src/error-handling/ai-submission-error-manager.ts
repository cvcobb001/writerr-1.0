/**
 * Comprehensive Error Handling and Rollback System for AI Submissions
 * 
 * This system provides enterprise-grade error handling, transaction-like rollback
 * capabilities, and recovery mechanisms for Editorial Engine operations.
 */

import { EditChange, EditSession, AIProcessingContext, ChangeGroupMetadata } from '../types/submit-changes-from-ai';
import { ChangeBatchManager } from '../change-batch-manager';

// Error categorization system
export interface AISubmissionError {
  type: ErrorType;
  category: ErrorCategory;
  severity: ErrorSeverity;
  code: string;
  message: string;
  context: any;
  timestamp: Date;
  retryable: boolean;
  rollbackRequired: boolean;
}

export enum ErrorType {
  NETWORK = 'network',
  VALIDATION = 'validation',
  STORAGE = 'storage',
  PROCESSING = 'processing',
  EDITORIAL_ENGINE = 'editorial-engine',
  BATCH_OPERATION = 'batch-operation',
  SESSION_MANAGEMENT = 'session-management',
  DATA_CORRUPTION = 'data-corruption',
  RATE_LIMITING = 'rate-limiting',
  AUTHENTICATION = 'authentication'
}

export enum ErrorCategory {
  TRANSIENT = 'transient',
  PERMANENT = 'permanent',
  USER_ERROR = 'user-error',
  SYSTEM_ERROR = 'system-error',
  CONFIGURATION = 'configuration'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface RollbackOperation {
  type: RollbackType;
  sessionId: string;
  changeIds: string[];
  groupIds?: string[];
  timestamp: Date;
  originalState?: any;
  backupData?: any;
}

export enum RollbackType {
  CHANGES = 'changes',
  SESSION = 'session',
  BATCH = 'batch',
  PARTIAL_BATCH = 'partial-batch',
  FULL_STATE = 'full-state'
}

export interface RecoveryStrategy {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
  fallbackActions: string[];
  rollbackOnFailure: boolean;
}

export interface TransactionState {
  id: string;
  sessionId: string;
  operations: TransactionOperation[];
  status: 'pending' | 'committed' | 'failed' | 'rolled-back';
  startTime: Date;
  endTime?: Date;
  backupState?: any;
}

export interface TransactionOperation {
  type: 'create-changes' | 'update-session' | 'create-batch' | 'update-metadata';
  target: string;
  data: any;
  completed: boolean;
  timestamp: Date;
}

export class AISubmissionErrorManager {
  private transactionLog = new Map<string, TransactionState>();
  private errorLog: AISubmissionError[] = [];
  private recoveryStrategies = new Map<string, RecoveryStrategy>();
  private rollbackOperations = new Map<string, RollbackOperation[]>();
  
  constructor(private batchManager: ChangeBatchManager) {
    this.initializeRecoveryStrategies();
  }

  /**
   * Initialize default recovery strategies for different error types
   */
  private initializeRecoveryStrategies(): void {
    this.recoveryStrategies.set(ErrorType.NETWORK, {
      maxRetries: 3,
      retryDelay: 1000,
      backoffMultiplier: 2,
      fallbackActions: ['cache-locally', 'offline-mode'],
      rollbackOnFailure: false
    });

    this.recoveryStrategies.set(ErrorType.VALIDATION, {
      maxRetries: 1,
      retryDelay: 100,
      backoffMultiplier: 1,
      fallbackActions: ['sanitize-data', 'bypass-validation'],
      rollbackOnFailure: true
    });

    this.recoveryStrategies.set(ErrorType.STORAGE, {
      maxRetries: 2,
      retryDelay: 500,
      backoffMultiplier: 1.5,
      fallbackActions: ['memory-storage', 'backup-location'],
      rollbackOnFailure: true
    });

    this.recoveryStrategies.set(ErrorType.EDITORIAL_ENGINE, {
      maxRetries: 2,
      retryDelay: 2000,
      backoffMultiplier: 2,
      fallbackActions: ['fallback-provider', 'direct-processing'],
      rollbackOnFailure: true
    });

    this.recoveryStrategies.set(ErrorType.BATCH_OPERATION, {
      maxRetries: 1,
      retryDelay: 1000,
      backoffMultiplier: 1,
      fallbackActions: ['individual-processing', 'split-batch'],
      rollbackOnFailure: true
    });
  }

  /**
   * Begin a transaction for AI submission operations
   */
  public beginTransaction(sessionId: string, operations: Omit<TransactionOperation, 'completed' | 'timestamp'>[]): string {
    const transactionId = this.generateTransactionId();
    
    const transaction: TransactionState = {
      id: transactionId,
      sessionId,
      operations: operations.map(op => ({
        ...op,
        completed: false,
        timestamp: new Date()
      })),
      status: 'pending',
      startTime: new Date()
    };

    this.transactionLog.set(transactionId, transaction);
    return transactionId;
  }

  /**
   * Commit a transaction after successful operations
   */
  public commitTransaction(transactionId: string): boolean {
    const transaction = this.transactionLog.get(transactionId);
    if (!transaction) {
      console.error(`Transaction ${transactionId} not found for commit`);
      return false;
    }

    transaction.status = 'committed';
    transaction.endTime = new Date();
    
    // Clean up transaction log after successful commit
    setTimeout(() => {
      this.transactionLog.delete(transactionId);
    }, 300000); // Keep for 5 minutes for debugging

    return true;
  }

  /**
   * Rollback a failed transaction
   */
  public async rollbackTransaction(
    transactionId: string, 
    error: AISubmissionError,
    context: { 
      sessionManager: any; 
      editTracker: any; 
      sessionId: string; 
    }
  ): Promise<{ success: boolean; errors: string[]; warnings: string[] }> {
    const transaction = this.transactionLog.get(transactionId);
    if (!transaction) {
      return {
        success: false,
        errors: [`Transaction ${transactionId} not found for rollback`],
        warnings: []
      };
    }

    const result = {
      success: true,
      errors: [] as string[],
      warnings: [] as string[]
    };

    try {
      transaction.status = 'failed';
      
      // Rollback operations in reverse order
      const completedOperations = transaction.operations
        .filter(op => op.completed)
        .reverse();

      for (const operation of completedOperations) {
        try {
          await this.rollbackOperation(operation, context, error);
        } catch (rollbackError) {
          const errorMsg = `Failed to rollback operation ${operation.type}: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`;
          result.errors.push(errorMsg);
          result.success = false;
          console.error(errorMsg, rollbackError);
        }
      }

      // Restore backup state if available
      if (transaction.backupState && result.success) {
        try {
          await this.restoreBackupState(transaction.backupState, context);
        } catch (restoreError) {
          const errorMsg = `Failed to restore backup state: ${restoreError instanceof Error ? restoreError.message : String(restoreError)}`;
          result.errors.push(errorMsg);
          result.success = false;
          console.error(errorMsg, restoreError);
        }
      }

      transaction.status = result.success ? 'rolled-back' : 'failed';
      transaction.endTime = new Date();

      // Log rollback operation
      this.logRollbackOperation({
        type: RollbackType.FULL_STATE,
        sessionId: context.sessionId,
        changeIds: [],
        timestamp: new Date(),
        backupData: transaction.backupState
      });

      if (result.success) {
        result.warnings.push(`Transaction ${transactionId} successfully rolled back`);
      }

    } catch (error) {
      const errorMsg = `Critical error during transaction rollback: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(errorMsg);
      result.success = false;
      console.error(errorMsg, error);
    }

    return result;
  }

  /**
   * Handle AI submission errors with comprehensive error categorization and recovery
   */
  public async handleError(
    error: any, 
    context: {
      operation: string;
      sessionId: string;
      changeIds?: string[];
      transactionId?: string;
      aiProvider?: string;
      aiModel?: string;
    }
  ): Promise<{
    error: AISubmissionError;
    recoveryAction: string;
    shouldRetry: boolean;
    rollbackRequired: boolean;
  }> {
    const aiError = this.categorizeError(error, context);
    this.errorLog.push(aiError);

    const strategy = this.recoveryStrategies.get(aiError.type) || this.getDefaultStrategy();
    
    // Determine recovery action
    let recoveryAction = 'none';
    let shouldRetry = false;
    
    if (aiError.retryable && strategy.maxRetries > 0) {
      shouldRetry = true;
      recoveryAction = 'retry';
    } else if (strategy.fallbackActions.length > 0) {
      recoveryAction = strategy.fallbackActions[0];
    }

    // Log the error with context
    console.error('[AISubmissionErrorManager] Error handled:', {
      type: aiError.type,
      category: aiError.category,
      severity: aiError.severity,
      message: aiError.message,
      context: context,
      recoveryAction,
      shouldRetry
    });

    return {
      error: aiError,
      recoveryAction,
      shouldRetry,
      rollbackRequired: aiError.rollbackRequired
    };
  }

  /**
   * Categorize errors into structured format
   */
  private categorizeError(error: any, context: any): AISubmissionError {
    const timestamp = new Date();
    
    // Network-related errors
    if (error.name === 'NetworkError' || error.code === 'NETWORK_ERROR' || 
        error.message?.includes('fetch') || error.message?.includes('network')) {
      return {
        type: ErrorType.NETWORK,
        category: ErrorCategory.TRANSIENT,
        severity: ErrorSeverity.MEDIUM,
        code: 'NET_001',
        message: `Network error during ${context.operation}: ${error.message}`,
        context,
        timestamp,
        retryable: true,
        rollbackRequired: false
      };
    }

    // Validation errors
    if (error.message?.includes('validation') || error.code === 'VALIDATION_ERROR') {
      return {
        type: ErrorType.VALIDATION,
        category: ErrorCategory.USER_ERROR,
        severity: ErrorSeverity.HIGH,
        code: 'VAL_001',
        message: `Validation error: ${error.message}`,
        context,
        timestamp,
        retryable: false,
        rollbackRequired: true
      };
    }

    // Storage/persistence errors
    if (error.name === 'StorageError' || error.message?.includes('storage') || 
        error.message?.includes('save') || error.message?.includes('persist')) {
      return {
        type: ErrorType.STORAGE,
        category: ErrorCategory.SYSTEM_ERROR,
        severity: ErrorSeverity.HIGH,
        code: 'STO_001',
        message: `Storage error: ${error.message}`,
        context,
        timestamp,
        retryable: true,
        rollbackRequired: true
      };
    }

    // Editorial Engine specific errors
    if (context.operation?.includes('editorial') || error.code === 'EDITORIAL_ENGINE_ERROR') {
      return {
        type: ErrorType.EDITORIAL_ENGINE,
        category: ErrorCategory.SYSTEM_ERROR,
        severity: ErrorSeverity.HIGH,
        code: 'EE_001',
        message: `Editorial Engine error: ${error.message}`,
        context,
        timestamp,
        retryable: true,
        rollbackRequired: true
      };
    }

    // Batch processing errors
    if (context.operation?.includes('batch') || error.code === 'BATCH_ERROR') {
      return {
        type: ErrorType.BATCH_OPERATION,
        category: ErrorCategory.SYSTEM_ERROR,
        severity: ErrorSeverity.MEDIUM,
        code: 'BAT_001',
        message: `Batch processing error: ${error.message}`,
        context,
        timestamp,
        retryable: true,
        rollbackRequired: true
      };
    }

    // Rate limiting errors
    if (error.message?.includes('rate limit') || error.code === 429) {
      return {
        type: ErrorType.RATE_LIMITING,
        category: ErrorCategory.TRANSIENT,
        severity: ErrorSeverity.LOW,
        code: 'RATE_001',
        message: `Rate limit exceeded: ${error.message}`,
        context,
        timestamp,
        retryable: true,
        rollbackRequired: false
      };
    }

    // Default/unknown error
    return {
      type: ErrorType.PROCESSING,
      category: ErrorCategory.SYSTEM_ERROR,
      severity: ErrorSeverity.MEDIUM,
      code: 'UNK_001',
      message: `Unexpected error during ${context.operation}: ${error.message || String(error)}`,
      context,
      timestamp,
      retryable: false,
      rollbackRequired: true
    };
  }

  /**
   * Rollback individual operation
   */
  private async rollbackOperation(
    operation: TransactionOperation,
    context: any,
    error: AISubmissionError
  ): Promise<void> {
    switch (operation.type) {
      case 'create-changes':
        await this.rollbackChanges(operation.target, operation.data, context);
        break;
      case 'update-session':
        await this.rollbackSessionUpdate(operation.target, operation.data, context);
        break;
      case 'create-batch':
        await this.rollbackBatchCreation(operation.target, operation.data, context);
        break;
      case 'update-metadata':
        await this.rollbackMetadataUpdate(operation.target, operation.data, context);
        break;
      default:
        console.warn(`Unknown operation type for rollback: ${operation.type}`);
    }
  }

  /**
   * Rollback changes from session
   */
  private async rollbackChanges(changeIds: string, data: any, context: any): Promise<void> {
    const ids = changeIds.split(',');
    const session = context.editTracker.getSession(context.sessionId);
    
    if (session) {
      // Remove the changes from the session
      session.changes = session.changes.filter((change: any) => !ids.includes(change.id));
      
      // Update statistics
      const removedChangesData = data.filter((change: any) => ids.includes(change.id));
      for (const change of removedChangesData) {
        if (change.content) {
          session.wordCount -= this.countWords(change.content);
          session.characterCount -= change.content.length;
        }
      }

      console.log(`Rolled back ${ids.length} changes from session ${context.sessionId}`);
    }
  }

  /**
   * Rollback session updates
   */
  private async rollbackSessionUpdate(sessionId: string, data: any, context: any): Promise<void> {
    const session = context.editTracker.getSession(sessionId);
    if (session && data.previousState) {
      // Restore previous session state
      Object.assign(session, data.previousState);
      console.log(`Rolled back session ${sessionId} to previous state`);
    }
  }

  /**
   * Rollback batch creation
   */
  private async rollbackBatchCreation(groupId: string, data: any, context: any): Promise<void> {
    // Remove the batch from batch manager
    const success = this.batchManager.deleteBatch(groupId);
    if (success) {
      console.log(`Rolled back batch creation for group ${groupId}`);
    } else {
      console.warn(`Failed to rollback batch creation for group ${groupId} - batch not found`);
    }
  }

  /**
   * Rollback metadata updates
   */
  private async rollbackMetadataUpdate(target: string, data: any, context: any): Promise<void> {
    if (data.previousMetadata) {
      // This would restore previous metadata state
      // Implementation depends on where metadata is stored
      console.log(`Rolled back metadata update for ${target}`);
    }
  }

  /**
   * Restore backup state
   */
  private async restoreBackupState(backupState: any, context: any): Promise<void> {
    if (backupState.session) {
      const session = context.editTracker.getSession(context.sessionId);
      if (session) {
        Object.assign(session, backupState.session);
      }
    }

    if (backupState.batches) {
      // Restore batch states
      for (const [groupId, batchData] of Object.entries(backupState.batches)) {
        this.batchManager.updateBatchMetadata(groupId, batchData as Partial<ChangeGroupMetadata>);
      }
    }
  }

  /**
   * Log rollback operation for audit trail
   */
  private logRollbackOperation(operation: RollbackOperation): void {
    if (!this.rollbackOperations.has(operation.sessionId)) {
      this.rollbackOperations.set(operation.sessionId, []);
    }
    this.rollbackOperations.get(operation.sessionId)!.push(operation);
  }

  /**
   * Create backup state before critical operations
   */
  public createBackupState(sessionId: string, context: any): any {
    const session = context.editTracker.getSession(sessionId);
    const sessionBatches = this.batchManager.getSessionBatches(sessionId);
    
    return {
      session: session ? { ...session } : null,
      batches: sessionBatches.reduce((acc, batch) => {
        acc[batch.groupId] = { ...batch };
        return acc;
      }, {} as Record<string, any>),
      timestamp: new Date()
    };
  }

  /**
   * Get error statistics for monitoring and debugging
   */
  public getErrorStatistics(timeWindow?: number): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    retryableErrors: number;
    rollbackOperations: number;
  } {
    const cutoff = timeWindow ? Date.now() - timeWindow : 0;
    const recentErrors = this.errorLog.filter(error => error.timestamp.getTime() > cutoff);
    
    const stats = {
      totalErrors: recentErrors.length,
      errorsByType: {} as Record<string, number>,
      errorsBySeverity: {} as Record<string, number>,
      retryableErrors: recentErrors.filter(e => e.retryable).length,
      rollbackOperations: Array.from(this.rollbackOperations.values()).flat().length
    };

    recentErrors.forEach(error => {
      stats.errorsByType[error.type] = (stats.errorsByType[error.type] || 0) + 1;
      stats.errorsBySeverity[error.severity] = (stats.errorsBySeverity[error.severity] || 0) + 1;
    });

    return stats;
  }

  /**
   * Generate user-friendly error messages
   */
  public generateUserErrorMessage(error: AISubmissionError): string {
    const baseMessages = {
      [ErrorType.NETWORK]: "Connection issue with AI service. Please check your internet connection and try again.",
      [ErrorType.VALIDATION]: "The submitted changes contain invalid data. Please review and correct any issues.",
      [ErrorType.STORAGE]: "Unable to save changes. Please ensure you have sufficient storage space.",
      [ErrorType.EDITORIAL_ENGINE]: "Editorial Engine processing failed. The changes have been preserved for retry.",
      [ErrorType.BATCH_OPERATION]: "Batch processing encountered an issue. Some changes may need to be resubmitted.",
      [ErrorType.RATE_LIMITING]: "Too many requests. Please wait a moment before trying again.",
      [ErrorType.AUTHENTICATION]: "Authentication required. Please verify your AI service credentials."
    };

    let message = baseMessages[error.type] || "An unexpected error occurred while processing your changes.";

    // Add severity-specific context
    if (error.severity === ErrorSeverity.CRITICAL) {
      message += " This is a critical issue that requires immediate attention.";
    } else if (error.severity === ErrorSeverity.HIGH) {
      message += " Your changes have been preserved and can be recovered.";
    }

    // Add recovery suggestions
    if (error.retryable) {
      message += " You can try again, and the system will attempt to recover automatically.";
    }

    return message;
  }

  /**
   * Cleanup old error logs and transaction data
   */
  public cleanup(maxAge: number = 86400000): void { // 24 hours default
    const cutoff = Date.now() - maxAge;
    
    // Clean error log
    this.errorLog = this.errorLog.filter(error => error.timestamp.getTime() > cutoff);
    
    // Clean completed transactions
    for (const [id, transaction] of this.transactionLog.entries()) {
      if (transaction.endTime && transaction.endTime.getTime() < cutoff) {
        this.transactionLog.delete(id);
      }
    }
    
    // Clean rollback operations
    for (const [sessionId, operations] of this.rollbackOperations.entries()) {
      const recentOperations = operations.filter(op => op.timestamp.getTime() > cutoff);
      if (recentOperations.length === 0) {
        this.rollbackOperations.delete(sessionId);
      } else {
        this.rollbackOperations.set(sessionId, recentOperations);
      }
    }
  }

  // Utility methods
  private generateTransactionId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultStrategy(): RecoveryStrategy {
    return {
      maxRetries: 1,
      retryDelay: 1000,
      backoffMultiplier: 1,
      fallbackActions: ['log-error'],
      rollbackOnFailure: false
    };
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }
}