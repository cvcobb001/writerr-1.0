/**
 * @fileoverview Comprehensive error handling and validation system
 */

import { DocumentState, StateEvent, AuditLogEntry } from './types';
import { Change, ChangeCluster } from '../types';
import { SessionState } from '../session/types';
import { EventEmitter } from 'events';

export class ErrorHandler extends EventEmitter {
  private errorLog: ErrorLogEntry[] = [];
  private validationRules = new Map<string, ValidationRule>();
  private recoverryStrategies = new Map<ErrorType, RecoveryStrategy>();
  private errorCounts = new Map<ErrorType, number>();
  private lastErrors = new Map<ErrorType, number>();

  constructor() {
    super();
    this.registerDefaultValidationRules();
    this.registerDefaultRecoveryStrategies();
    this.startErrorMonitoring();
  }

  /**
   * Validate document state
   */
  async validateDocumentState(state: DocumentState): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      context: 'document_state',
      timestamp: Date.now()
    };

    try {
      // Basic structure validation
      if (!state.id || typeof state.id !== 'string') {
        result.errors.push(new ValidationError(
          ErrorType.INVALID_DATA,
          'Document state missing or invalid ID',
          'state.id',
          state.id
        ));
      }

      if (!state.filePath || typeof state.filePath !== 'string') {
        result.errors.push(new ValidationError(
          ErrorType.INVALID_DATA,
          'Document state missing or invalid file path',
          'state.filePath',
          state.filePath
        ));
      }

      if (!state.version || typeof state.version !== 'number' || state.version < 1) {
        result.errors.push(new ValidationError(
          ErrorType.INVALID_DATA,
          'Document state missing or invalid version',
          'state.version',
          state.version
        ));
      }

      // Validate changes
      if (state.changes) {
        if (!(state.changes instanceof Map)) {
          result.errors.push(new ValidationError(
            ErrorType.INVALID_DATA,
            'Document changes must be a Map',
            'state.changes',
            typeof state.changes
          ));
        } else {
          for (const [changeId, change] of state.changes) {
            const changeValidation = await this.validateChange(change);
            if (!changeValidation.valid) {
              result.errors.push(...changeValidation.errors);
              result.warnings.push(...changeValidation.warnings);
            }
          }
        }
      }

      // Validate metadata consistency
      if (state.metadata) {
        const actualChangeCount = state.changes?.size || 0;
        if (state.metadata.totalChanges !== actualChangeCount) {
          result.warnings.push(new ValidationWarning(
            'Metadata change count inconsistent with actual changes',
            'state.metadata.totalChanges',
            `Expected: ${actualChangeCount}, Got: ${state.metadata.totalChanges}`
          ));
        }
      }

      // Validate snapshots
      if (state.snapshots && Array.isArray(state.snapshots)) {
        for (let i = 0; i < state.snapshots.length; i++) {
          const snapshot = state.snapshots[i];
          if (!snapshot.id || !snapshot.timestamp || !snapshot.version) {
            result.errors.push(new ValidationError(
              ErrorType.INVALID_DATA,
              `Snapshot ${i} missing required fields`,
              `state.snapshots[${i}]`,
              snapshot
            ));
          }
        }
      }

      // Apply custom validation rules
      for (const [ruleId, rule] of this.validationRules) {
        if (rule.appliesToContext('document_state')) {
          try {
            const ruleResult = await rule.validate(state);
            if (!ruleResult.valid) {
              result.errors.push(...ruleResult.errors);
              result.warnings.push(...ruleResult.warnings);
            }
          } catch (error) {
            result.errors.push(new ValidationError(
              ErrorType.VALIDATION_FAILED,
              `Validation rule '${ruleId}' failed: ${error.message}`,
              'validation_rule',
              ruleId
            ));
          }
        }
      }

    } catch (error) {
      result.errors.push(new ValidationError(
        ErrorType.VALIDATION_FAILED,
        `Document state validation failed: ${error.message}`,
        'document_state',
        state
      ));
    }

    result.valid = result.errors.length === 0;

    if (!result.valid || result.warnings.length > 0) {
      await this.logValidationResult(result);
    }

    return result;
  }

  /**
   * Validate individual change
   */
  async validateChange(change: Change): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      context: 'change',
      timestamp: Date.now()
    };

    try {
      // Required fields
      if (!change.id || typeof change.id !== 'string') {
        result.errors.push(new ValidationError(
          ErrorType.INVALID_DATA,
          'Change missing or invalid ID',
          'change.id',
          change.id
        ));
      }

      if (!change.timestamp || typeof change.timestamp !== 'number') {
        result.errors.push(new ValidationError(
          ErrorType.INVALID_DATA,
          'Change missing or invalid timestamp',
          'change.timestamp',
          change.timestamp
        ));
      }

      // Validate confidence score
      if (change.confidence < 0 || change.confidence > 1) {
        result.errors.push(new ValidationError(
          ErrorType.INVALID_DATA,
          'Change confidence must be between 0 and 1',
          'change.confidence',
          change.confidence
        ));
      }

      // Validate position
      if (!change.position || typeof change.position !== 'object') {
        result.errors.push(new ValidationError(
          ErrorType.INVALID_DATA,
          'Change missing position information',
          'change.position',
          change.position
        ));
      } else {
        if (change.position.start < 0 || change.position.end < 0) {
          result.errors.push(new ValidationError(
            ErrorType.INVALID_DATA,
            'Change position cannot be negative',
            'change.position',
            change.position
          ));
        }

        if (change.position.start > change.position.end) {
          result.errors.push(new ValidationError(
            ErrorType.INVALID_DATA,
            'Change start position cannot be greater than end position',
            'change.position',
            change.position
          ));
        }
      }

      // Validate content
      if (!change.content || typeof change.content !== 'object') {
        result.errors.push(new ValidationError(
          ErrorType.INVALID_DATA,
          'Change missing content information',
          'change.content',
          change.content
        ));
      }

      // Validate enums
      const validTypes = ['insert', 'delete', 'replace', 'move'];
      if (!validTypes.includes(change.type as string)) {
        result.errors.push(new ValidationError(
          ErrorType.INVALID_DATA,
          'Change type is invalid',
          'change.type',
          change.type
        ));
      }

      // Timestamp validation
      const now = Date.now();
      if (change.timestamp > now + 60000) { // Allow 1 minute future tolerance
        result.warnings.push(new ValidationWarning(
          'Change timestamp is in the future',
          'change.timestamp',
          `Timestamp: ${change.timestamp}, Now: ${now}`
        ));
      }

      if (change.timestamp < (now - 365 * 24 * 60 * 60 * 1000)) { // Older than 1 year
        result.warnings.push(new ValidationWarning(
          'Change timestamp is very old',
          'change.timestamp',
          `Age: ${Math.floor((now - change.timestamp) / (24 * 60 * 60 * 1000))} days`
        ));
      }

    } catch (error) {
      result.errors.push(new ValidationError(
        ErrorType.VALIDATION_FAILED,
        `Change validation failed: ${error.message}`,
        'change',
        change
      ));
    }

    result.valid = result.errors.length === 0;
    return result;
  }

  /**
   * Handle and potentially recover from error
   */
  async handleError(error: Error, context?: any): Promise<ErrorHandlingResult> {
    const errorType = this.classifyError(error);
    const errorEntry = this.createErrorLogEntry(error, errorType, context);
    
    this.errorLog.push(errorEntry);
    this.updateErrorStats(errorType);

    const result: ErrorHandlingResult = {
      error: errorEntry,
      recovered: false,
      recoveryAction: null,
      shouldRetry: false,
      retryDelay: 0
    };

    try {
      // Check if we have a recovery strategy
      const strategy = this.recoverryStrategies.get(errorType);
      if (strategy && strategy.canRecover(error, context)) {
        const recoveryResult = await strategy.recover(error, context);
        
        result.recovered = recoveryResult.success;
        result.recoveryAction = recoveryResult.action;
        result.shouldRetry = recoveryResult.shouldRetry;
        result.retryDelay = recoveryResult.retryDelay || 0;

        if (result.recovered) {
          this.emit('errorRecovered', { error: errorEntry, recovery: recoveryResult });
        } else {
          this.emit('recoveryFailed', { error: errorEntry, recovery: recoveryResult });
        }
      }

      // Emit error event
      this.emit('errorHandled', result);

      // Check for error patterns that might indicate systemic issues
      await this.checkErrorPatterns();

    } catch (handlingError) {
      // Error occurred during error handling
      const criticalEntry = this.createErrorLogEntry(
        handlingError, 
        ErrorType.SYSTEM_ERROR, 
        { originalError: error, context }
      );
      
      this.errorLog.push(criticalEntry);
      this.emit('criticalError', criticalEntry);
    }

    return result;
  }

  /**
   * Get error statistics
   */
  getErrorStats(): ErrorStats {
    const now = Date.now();
    const hour = 60 * 60 * 1000;
    const day = 24 * hour;

    const recentErrors = this.errorLog.filter(e => (now - e.timestamp) < hour);
    const dailyErrors = this.errorLog.filter(e => (now - e.timestamp) < day);

    const errorsByType = new Map<ErrorType, number>();
    for (const error of this.errorLog) {
      errorsByType.set(error.type, (errorsByType.get(error.type) || 0) + 1);
    }

    return {
      totalErrors: this.errorLog.length,
      recentErrors: recentErrors.length,
      dailyErrors: dailyErrors.length,
      errorsByType: Object.fromEntries(errorsByType),
      recoveryRate: this.calculateRecoveryRate(),
      averageRecoveryTime: this.calculateAverageRecoveryTime(),
      criticalErrors: this.errorLog.filter(e => e.severity === ErrorSeverity.CRITICAL).length
    };
  }

  /**
   * Register custom validation rule
   */
  registerValidationRule(id: string, rule: ValidationRule): void {
    this.validationRules.set(id, rule);
  }

  /**
   * Register custom recovery strategy
   */
  registerRecoveryStrategy(errorType: ErrorType, strategy: RecoveryStrategy): void {
    this.recoverryStrategies.set(errorType, strategy);
  }

  /**
   * Clear error log
   */
  clearErrorLog(olderThan?: number): void {
    if (olderThan) {
      const cutoff = Date.now() - olderThan;
      this.errorLog = this.errorLog.filter(e => e.timestamp > cutoff);
    } else {
      this.errorLog = [];
    }
  }

  /**
   * Export error log for analysis
   */
  exportErrorLog(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = 'timestamp,type,severity,message,context,resolved';
      const rows = this.errorLog.map(e => 
        `${e.timestamp},${e.type},${e.severity},"${e.message}","${e.context || ''}",${e.resolved}`
      );
      return [headers, ...rows].join('\n');
    }

    return JSON.stringify(this.errorLog, null, 2);
  }

  // Private methods

  private registerDefaultValidationRules(): void {
    // Rule: Check for memory usage
    this.registerValidationRule('memory_usage', {
      appliesToContext: (context: string) => true,
      validate: async (data: any) => {
        const result: ValidationResult = {
          valid: true,
          errors: [],
          warnings: [],
          context: 'memory_usage',
          timestamp: Date.now()
        };

        // Check if we can estimate memory usage
        try {
          const size = JSON.stringify(data).length;
          if (size > 10 * 1024 * 1024) { // 10MB
            result.warnings.push(new ValidationWarning(
              'Large data structure detected',
              'memory_usage',
              `Size: ${Math.round(size / 1024 / 1024)}MB`
            ));
          }
        } catch (error) {
          // Ignore sizing errors
        }

        return result;
      }
    });

    // Rule: Check for data consistency
    this.registerValidationRule('data_consistency', {
      appliesToContext: (context: string) => context.includes('document'),
      validate: async (data: DocumentState) => {
        const result: ValidationResult = {
          valid: true,
          errors: [],
          warnings: [],
          context: 'data_consistency',
          timestamp: Date.now()
        };

        // Check that all referenced changes exist
        if (data.clusters) {
          for (const [clusterId, cluster] of data.clusters) {
            for (const change of cluster.changes) {
              if (!data.changes.has(change.id)) {
                result.errors.push(new ValidationError(
                  ErrorType.DATA_INCONSISTENCY,
                  `Cluster ${clusterId} references non-existent change ${change.id}`,
                  'cluster.changes',
                  change.id
                ));
              }
            }
          }
        }

        return result;
      }
    });
  }

  private registerDefaultRecoveryStrategies(): void {
    // Strategy for data corruption
    this.recoverryStrategies.set(ErrorType.DATA_CORRUPTION, {
      canRecover: (error: Error, context?: any) => {
        return context && (context.hasBackup || context.hasSnapshot);
      },
      recover: async (error: Error, context?: any) => {
        // Attempt to recover from backup or snapshot
        return {
          success: false, // Placeholder - would implement actual recovery
          action: 'restore_from_backup',
          shouldRetry: true,
          retryDelay: 1000,
          details: 'Attempted recovery from backup'
        };
      }
    });

    // Strategy for validation failures
    this.recoverryStrategies.set(ErrorType.VALIDATION_FAILED, {
      canRecover: (error: Error, context?: any) => {
        return true; // Can usually recover by sanitizing data
      },
      recover: async (error: Error, context?: any) => {
        // Sanitize and retry
        return {
          success: true,
          action: 'sanitize_data',
          shouldRetry: true,
          retryDelay: 0,
          details: 'Data sanitized and operation retried'
        };
      }
    });

    // Strategy for network errors
    this.recoverryStrategies.set(ErrorType.NETWORK_ERROR, {
      canRecover: (error: Error, context?: any) => {
        return true;
      },
      recover: async (error: Error, context?: any) => {
        return {
          success: true,
          action: 'retry_with_backoff',
          shouldRetry: true,
          retryDelay: Math.min(1000 * Math.pow(2, (context?.retryCount || 0)), 30000),
          details: 'Network operation will be retried with exponential backoff'
        };
      }
    });
  }

  private classifyError(error: Error): ErrorType {
    const message = error.message.toLowerCase();
    
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorType.VALIDATION_FAILED;
    }
    
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return ErrorType.NETWORK_ERROR;
    }
    
    if (message.includes('corruption') || message.includes('checksum') || message.includes('integrity')) {
      return ErrorType.DATA_CORRUPTION;
    }
    
    if (message.includes('permission') || message.includes('access') || message.includes('unauthorized')) {
      return ErrorType.PERMISSION_ERROR;
    }
    
    if (message.includes('timeout') || message.includes('expired')) {
      return ErrorType.TIMEOUT_ERROR;
    }
    
    return ErrorType.UNKNOWN_ERROR;
  }

  private createErrorLogEntry(error: Error, type: ErrorType, context?: any): ErrorLogEntry {
    return {
      id: this.generateErrorId(),
      timestamp: Date.now(),
      type,
      severity: this.determineSeverity(type, error),
      message: error.message,
      stack: error.stack,
      context: context ? JSON.stringify(context) : undefined,
      resolved: false,
      recoveryAttempts: 0
    };
  }

  private determineSeverity(type: ErrorType, error: Error): ErrorSeverity {
    switch (type) {
      case ErrorType.SYSTEM_ERROR:
      case ErrorType.DATA_CORRUPTION:
        return ErrorSeverity.CRITICAL;
      
      case ErrorType.VALIDATION_FAILED:
      case ErrorType.PERMISSION_ERROR:
        return ErrorSeverity.HIGH;
      
      case ErrorType.NETWORK_ERROR:
      case ErrorType.TIMEOUT_ERROR:
        return ErrorSeverity.MEDIUM;
      
      default:
        return ErrorSeverity.LOW;
    }
  }

  private updateErrorStats(type: ErrorType): void {
    this.errorCounts.set(type, (this.errorCounts.get(type) || 0) + 1);
    this.lastErrors.set(type, Date.now());
  }

  private calculateRecoveryRate(): number {
    const totalErrors = this.errorLog.length;
    if (totalErrors === 0) return 1.0;
    
    const recoveredErrors = this.errorLog.filter(e => e.resolved).length;
    return recoveredErrors / totalErrors;
  }

  private calculateAverageRecoveryTime(): number {
    const recoveredErrors = this.errorLog.filter(e => e.resolved && e.recoveryTime);
    if (recoveredErrors.length === 0) return 0;
    
    const totalTime = recoveredErrors.reduce((sum, e) => sum + (e.recoveryTime || 0), 0);
    return totalTime / recoveredErrors.length;
  }

  private async checkErrorPatterns(): Promise<void> {
    const now = Date.now();
    const hour = 60 * 60 * 1000;
    
    // Check for error spikes
    const recentErrors = this.errorLog.filter(e => (now - e.timestamp) < hour);
    if (recentErrors.length > 100) {
      this.emit('errorSpike', { count: recentErrors.length, timeframe: 'hour' });
    }

    // Check for recurring errors
    const errorTypes = new Map<ErrorType, number>();
    for (const error of recentErrors) {
      errorTypes.set(error.type, (errorTypes.get(error.type) || 0) + 1);
    }

    for (const [type, count] of errorTypes) {
      if (count > 10) {
        this.emit('recurringError', { type, count, timeframe: 'hour' });
      }
    }
  }

  private async logValidationResult(result: ValidationResult): Promise<void> {
    const logEntry: AuditLogEntry = {
      id: this.generateErrorId(),
      timestamp: result.timestamp,
      action: 'validation_completed' as any,
      metadata: {
        context: result.context,
        valid: result.valid,
        errorCount: result.errors.length,
        warningCount: result.warnings.length
      },
      success: result.valid
    };

    if (!result.valid) {
      logEntry.error = result.errors.map(e => e.message).join('; ');
    }

    this.emit('auditLog', logEntry);
  }

  private startErrorMonitoring(): void {
    setInterval(() => {
      this.checkErrorPatterns();
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Types and interfaces

export enum ErrorType {
  VALIDATION_FAILED = 'validation_failed',
  DATA_CORRUPTION = 'data_corruption',
  NETWORK_ERROR = 'network_error',
  PERMISSION_ERROR = 'permission_error',
  TIMEOUT_ERROR = 'timeout_error',
  SYSTEM_ERROR = 'system_error',
  INVALID_DATA = 'invalid_data',
  DATA_INCONSISTENCY = 'data_inconsistency',
  UNKNOWN_ERROR = 'unknown_error'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  context: string;
  timestamp: number;
}

export class ValidationError extends Error {
  constructor(
    public type: ErrorType,
    message: string,
    public field?: string,
    public value?: any
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ValidationWarning {
  constructor(
    public message: string,
    public field?: string,
    public details?: string
  ) {}
}

export interface ErrorLogEntry {
  id: string;
  timestamp: number;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  stack?: string;
  context?: string;
  resolved: boolean;
  recoveryAttempts: number;
  recoveryTime?: number;
}

export interface ErrorHandlingResult {
  error: ErrorLogEntry;
  recovered: boolean;
  recoveryAction: string | null;
  shouldRetry: boolean;
  retryDelay: number;
}

export interface ErrorStats {
  totalErrors: number;
  recentErrors: number;
  dailyErrors: number;
  errorsByType: Record<string, number>;
  recoveryRate: number;
  averageRecoveryTime: number;
  criticalErrors: number;
}

export interface ValidationRule {
  appliesToContext(context: string): boolean;
  validate(data: any): Promise<ValidationResult>;
}

export interface RecoveryStrategy {
  canRecover(error: Error, context?: any): boolean;
  recover(error: Error, context?: any): Promise<RecoveryResult>;
}

export interface RecoveryResult {
  success: boolean;
  action: string;
  shouldRetry: boolean;
  retryDelay?: number;
  details?: string;
}