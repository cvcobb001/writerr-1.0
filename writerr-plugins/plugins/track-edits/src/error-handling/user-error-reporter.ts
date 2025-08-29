/**
 * Enhanced Error Reporting and User-Friendly Messaging System
 * 
 * Provides comprehensive error reporting with user-friendly messages,
 * developer debugging information, and recovery action suggestions.
 */

import { Notice } from 'obsidian';
import { AISubmissionError, ErrorType, ErrorSeverity } from './ai-submission-error-manager';
import { IntegrityError, IntegrityErrorType } from './data-integrity-manager';

export interface ErrorReport {
  id: string;
  timestamp: Date;
  type: 'ai-submission' | 'integrity' | 'system' | 'user';
  severity: ErrorSeverity;
  userMessage: string;
  technicalMessage: string;
  context: any;
  recoveryActions: RecoveryAction[];
  debugInfo?: DebugInfo;
}

export interface RecoveryAction {
  action: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  userFriendly: boolean;
  autoExecutable: boolean;
  command?: () => Promise<void>;
}

export interface DebugInfo {
  stackTrace?: string;
  errorCode?: string;
  sessionId?: string;
  transactionId?: string;
  aiProvider?: string;
  aiModel?: string;
  operationId?: string;
  systemInfo: {
    timestamp: string;
    platform: string;
    pluginVersion?: string;
    memoryUsage?: any;
  };
}

export interface UserNotificationOptions {
  showToast?: boolean;
  toastDuration?: number;
  showInSidebar?: boolean;
  logToConsole?: boolean;
  includeRecoveryActions?: boolean;
  severity?: 'info' | 'warning' | 'error';
}

export class UserErrorReporter {
  private errorReports: ErrorReport[] = [];
  private userMessageTemplates = new Map<string, string>();
  private recoveryActionCatalog = new Map<string, RecoveryAction[]>();

  constructor() {
    this.initializeMessageTemplates();
    this.initializeRecoveryActions();
  }

  /**
   * Report AI submission error with user-friendly messaging
   */
  public async reportAISubmissionError(
    error: AISubmissionError,
    context: any,
    options: UserNotificationOptions = {}
  ): Promise<ErrorReport> {
    const report = this.createErrorReport(error, 'ai-submission', context);
    
    // Generate user-friendly message
    report.userMessage = this.generateUserMessage(error);
    report.technicalMessage = error.message;
    report.recoveryActions = this.getRecoveryActions(error.type, error);

    // Store report
    this.errorReports.push(report);
    this.cleanupOldReports();

    // Notify user based on options
    await this.notifyUser(report, {
      showToast: true,
      severity: this.mapSeverityToNotification(error.severity),
      includeRecoveryActions: true,
      ...options
    });

    // Log for developers
    if (options.logToConsole !== false) {
      this.logForDevelopers(report);
    }

    return report;
  }

  /**
   * Report data integrity error
   */
  public async reportIntegrityError(
    errors: IntegrityError[],
    context: any,
    options: UserNotificationOptions = {}
  ): Promise<ErrorReport> {
    const primaryError = errors.find(e => e.severity === 'critical') || errors[0];
    
    const report: ErrorReport = {
      id: this.generateErrorId(),
      timestamp: new Date(),
      type: 'integrity',
      severity: this.mapIntegritySeverity(primaryError?.severity || 'low'),
      userMessage: this.generateIntegrityUserMessage(errors),
      technicalMessage: errors.map(e => e.description).join('; '),
      context,
      recoveryActions: this.getIntegrityRecoveryActions(errors),
      debugInfo: this.createDebugInfo(context)
    };

    this.errorReports.push(report);
    this.cleanupOldReports();

    await this.notifyUser(report, {
      showToast: true,
      severity: errors.some(e => e.severity === 'critical') ? 'error' : 'warning',
      includeRecoveryActions: true,
      ...options
    });

    return report;
  }

  /**
   * Report general system error
   */
  public async reportSystemError(
    error: Error,
    context: any,
    options: UserNotificationOptions = {}
  ): Promise<ErrorReport> {
    const report: ErrorReport = {
      id: this.generateErrorId(),
      timestamp: new Date(),
      type: 'system',
      severity: ErrorSeverity.HIGH,
      userMessage: 'An unexpected system error occurred. The system will attempt to recover automatically.',
      technicalMessage: error.message,
      context,
      recoveryActions: [
        {
          action: 'retry',
          description: 'Retry the last operation',
          priority: 'high',
          userFriendly: true,
          autoExecutable: false
        },
        {
          action: 'restart-plugin',
          description: 'Restart the Track Edits plugin',
          priority: 'medium',
          userFriendly: true,
          autoExecutable: false
        }
      ],
      debugInfo: {
        ...this.createDebugInfo(context),
        stackTrace: error.stack
      }
    };

    this.errorReports.push(report);
    this.cleanupOldReports();

    await this.notifyUser(report, {
      showToast: true,
      severity: 'error',
      includeRecoveryActions: true,
      ...options
    });

    if (options.logToConsole !== false) {
      this.logForDevelopers(report);
    }

    return report;
  }

  /**
   * Initialize user-friendly message templates
   */
  private initializeMessageTemplates(): void {
    // Network error messages
    this.userMessageTemplates.set(ErrorType.NETWORK, 
      "Unable to connect to the AI service. Please check your internet connection and try again. Your changes have been saved locally and can be synchronized when the connection is restored."
    );

    // Validation error messages
    this.userMessageTemplates.set(ErrorType.VALIDATION, 
      "The changes you submitted contain invalid data. Please review the content and correct any formatting issues. The system has preserved your original changes."
    );

    // Storage error messages
    this.userMessageTemplates.set(ErrorType.STORAGE, 
      "Unable to save your changes to storage. Please ensure you have sufficient disk space and try again. Your changes are temporarily stored in memory."
    );

    // Editorial Engine error messages
    this.userMessageTemplates.set(ErrorType.EDITORIAL_ENGINE, 
      "The Editorial Engine encountered an issue while processing your changes. Your content has been preserved and you can try again or process the changes manually."
    );

    // Batch operation error messages
    this.userMessageTemplates.set(ErrorType.BATCH_OPERATION, 
      "There was an issue processing multiple changes together. The system will try processing them individually to ensure none are lost."
    );

    // Rate limiting messages
    this.userMessageTemplates.set(ErrorType.RATE_LIMITING, 
      "You've reached the rate limit for AI processing. Please wait a moment before trying again. Your changes have been queued for processing."
    );

    // Authentication error messages
    this.userMessageTemplates.set(ErrorType.AUTHENTICATION, 
      "Authentication with the AI service failed. Please check your API credentials in settings and try again."
    );

    // Data corruption messages
    this.userMessageTemplates.set(ErrorType.DATA_CORRUPTION, 
      "Some data corruption was detected, but the system has automatically repaired the issues. Your editing session can continue normally."
    );
  }

  /**
   * Initialize recovery action catalog
   */
  private initializeRecoveryActions(): void {
    // Network error recovery actions
    this.recoveryActionCatalog.set(ErrorType.NETWORK, [
      {
        action: 'retry-connection',
        description: 'Try connecting to the AI service again',
        priority: 'high',
        userFriendly: true,
        autoExecutable: true
      },
      {
        action: 'work-offline',
        description: 'Continue working offline and sync later',
        priority: 'medium',
        userFriendly: true,
        autoExecutable: true
      },
      {
        action: 'check-settings',
        description: 'Verify network and AI service settings',
        priority: 'low',
        userFriendly: true,
        autoExecutable: false
      }
    ]);

    // Validation error recovery actions
    this.recoveryActionCatalog.set(ErrorType.VALIDATION, [
      {
        action: 'sanitize-data',
        description: 'Automatically clean up the data and retry',
        priority: 'high',
        userFriendly: true,
        autoExecutable: true
      },
      {
        action: 'review-changes',
        description: 'Review and manually correct the changes',
        priority: 'medium',
        userFriendly: true,
        autoExecutable: false
      },
      {
        action: 'bypass-validation',
        description: 'Skip validation (not recommended)',
        priority: 'low',
        userFriendly: false,
        autoExecutable: true
      }
    ]);

    // Storage error recovery actions
    this.recoveryActionCatalog.set(ErrorType.STORAGE, [
      {
        action: 'free-space',
        description: 'Free up disk space and try again',
        priority: 'high',
        userFriendly: true,
        autoExecutable: false
      },
      {
        action: 'use-memory',
        description: 'Store changes in memory temporarily',
        priority: 'medium',
        userFriendly: true,
        autoExecutable: true
      },
      {
        action: 'export-backup',
        description: 'Export changes as backup file',
        priority: 'medium',
        userFriendly: true,
        autoExecutable: true
      }
    ]);

    // Editorial Engine error recovery actions
    this.recoveryActionCatalog.set(ErrorType.EDITORIAL_ENGINE, [
      {
        action: 'retry-processing',
        description: 'Try processing with Editorial Engine again',
        priority: 'high',
        userFriendly: true,
        autoExecutable: true
      },
      {
        action: 'fallback-direct',
        description: 'Process changes without Editorial Engine',
        priority: 'medium',
        userFriendly: true,
        autoExecutable: true
      },
      {
        action: 'check-engine-status',
        description: 'Check Editorial Engine connection and settings',
        priority: 'low',
        userFriendly: true,
        autoExecutable: false
      }
    ]);

    // Batch operation recovery actions
    this.recoveryActionCatalog.set(ErrorType.BATCH_OPERATION, [
      {
        action: 'process-individually',
        description: 'Process each change separately',
        priority: 'high',
        userFriendly: true,
        autoExecutable: true
      },
      {
        action: 'split-batch',
        description: 'Split into smaller batches and retry',
        priority: 'medium',
        userFriendly: true,
        autoExecutable: true
      },
      {
        action: 'review-batch',
        description: 'Review and manually process the batch',
        priority: 'low',
        userFriendly: true,
        autoExecutable: false
      }
    ]);
  }

  /**
   * Generate user-friendly message for AI errors
   */
  private generateUserMessage(error: AISubmissionError): string {
    const template = this.userMessageTemplates.get(error.type);
    
    if (template) {
      // Customize message based on severity
      let message = template;
      
      if (error.severity === ErrorSeverity.CRITICAL) {
        message += " This is a critical issue that requires immediate attention.";
      } else if (error.severity === ErrorSeverity.HIGH) {
        message += " Your work has been preserved and you can recover from this issue.";
      } else if (error.severity === ErrorSeverity.LOW) {
        message += " This is a minor issue that shouldn't affect your workflow.";
      }

      return message;
    }

    // Fallback message
    return "An issue occurred while processing your AI request. Your changes have been preserved and you can try again.";
  }

  /**
   * Generate user-friendly message for integrity errors
   */
  private generateIntegrityUserMessage(errors: IntegrityError[]): string {
    const criticalCount = errors.filter(e => e.severity === 'critical').length;
    const highCount = errors.filter(e => e.severity === 'high').length;
    const totalCount = errors.length;

    if (criticalCount > 0) {
      return `Critical data integrity issues detected (${criticalCount} critical, ${totalCount} total). The system will attempt to recover your data automatically. Please avoid making changes until recovery is complete.`;
    } else if (highCount > 0) {
      return `Data integrity issues detected (${highCount} high priority, ${totalCount} total). The system has automatically repaired most issues. You can continue working normally.`;
    } else {
      return `Minor data integrity issues detected (${totalCount} total). These have been automatically resolved and won't affect your work.`;
    }
  }

  /**
   * Get recovery actions for specific error types
   */
  private getRecoveryActions(errorType: ErrorType, error: AISubmissionError): RecoveryAction[] {
    const actions = this.recoveryActionCatalog.get(errorType) || [];
    
    // Filter actions based on error severity and context
    return actions.filter(action => {
      if (error.severity === ErrorSeverity.CRITICAL) {
        return action.priority === 'high';
      } else if (error.severity === ErrorSeverity.LOW) {
        return action.userFriendly;
      }
      return true;
    });
  }

  /**
   * Get recovery actions for integrity errors
   */
  private getIntegrityRecoveryActions(errors: IntegrityError[]): RecoveryAction[] {
    const actions: RecoveryAction[] = [];
    const hasCorruption = errors.some(e => e.type === IntegrityErrorType.CORRUPTED_DATA);
    const hasCritical = errors.some(e => e.severity === 'critical');

    if (hasCritical) {
      actions.push({
        action: 'restore-backup',
        description: 'Restore from the most recent backup',
        priority: 'high',
        userFriendly: true,
        autoExecutable: true
      });
    }

    if (hasCorruption) {
      actions.push({
        action: 'repair-data',
        description: 'Automatically repair corrupted data',
        priority: 'high',
        userFriendly: true,
        autoExecutable: true
      });
    }

    actions.push({
      action: 'create-backup',
      description: 'Create a backup before continuing',
      priority: 'medium',
      userFriendly: true,
      autoExecutable: true
    });

    return actions;
  }

  /**
   * Notify user with appropriate UI elements
   */
  private async notifyUser(report: ErrorReport, options: UserNotificationOptions): Promise<void> {
    // Show toast notification
    if (options.showToast !== false) {
      const noticeClass = options.severity === 'error' ? 'error' : 
                         options.severity === 'warning' ? 'warning' : 'info';
      
      let message = report.userMessage;
      
      if (options.includeRecoveryActions && report.recoveryActions.length > 0) {
        const primaryAction = report.recoveryActions.find(a => a.priority === 'high' && a.userFriendly);
        if (primaryAction) {
          message += `\n\nSuggested action: ${primaryAction.description}`;
        }
      }

      new Notice(message, options.toastDuration || 8000);
      
      // Apply custom styling based on severity
      const notices = document.querySelectorAll('.notice:last-child');
      if (notices.length > 0) {
        const lastNotice = notices[notices.length - 1] as HTMLElement;
        lastNotice.classList.add(`track-edits-${noticeClass}`);
      }
    }

    // Additional notification mechanisms could be implemented here
    // such as sidebar notifications, status bar updates, etc.
  }

  /**
   * Log detailed information for developers
   */
  private logForDevelopers(report: ErrorReport): void {
    const logLevel = report.severity === ErrorSeverity.CRITICAL ? 'error' :
                     report.severity === ErrorSeverity.HIGH ? 'warn' : 'info';

    console.group(`[TrackEditsPlugin] ${report.type.toUpperCase()} Error Report ${report.id}`);
    console[logLevel]('User Message:', report.userMessage);
    console[logLevel]('Technical Message:', report.technicalMessage);
    console.log('Context:', report.context);
    console.log('Recovery Actions:', report.recoveryActions);
    
    if (report.debugInfo) {
      console.log('Debug Info:', report.debugInfo);
    }
    
    console.groupEnd();

    // Track error metrics for analytics
    this.trackErrorMetrics(report);
  }

  /**
   * Create error report structure
   */
  private createErrorReport(
    error: AISubmissionError,
    type: ErrorReport['type'],
    context: any
  ): ErrorReport {
    return {
      id: this.generateErrorId(),
      timestamp: new Date(),
      type,
      severity: error.severity,
      userMessage: '',
      technicalMessage: error.message,
      context,
      recoveryActions: [],
      debugInfo: this.createDebugInfo(context, error)
    };
  }

  /**
   * Create debug information
   */
  private createDebugInfo(context: any, error?: AISubmissionError): DebugInfo {
    return {
      errorCode: error?.code,
      sessionId: context.sessionId,
      transactionId: context.transactionId,
      aiProvider: context.aiProvider,
      aiModel: context.aiModel,
      operationId: context.operationId,
      systemInfo: {
        timestamp: new Date().toISOString(),
        platform: navigator.platform,
        pluginVersion: '1.0.0', // This would come from manifest
        memoryUsage: (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
        } : undefined
      }
    };
  }

  /**
   * Execute a recovery action
   */
  public async executeRecoveryAction(reportId: string, actionName: string): Promise<boolean> {
    const report = this.errorReports.find(r => r.id === reportId);
    if (!report) return false;

    const action = report.recoveryActions.find(a => a.action === actionName);
    if (!action || !action.command) return false;

    try {
      await action.command();
      console.log(`Successfully executed recovery action: ${actionName}`);
      return true;
    } catch (error) {
      console.error(`Failed to execute recovery action ${actionName}:`, error);
      return false;
    }
  }

  /**
   * Get error statistics for monitoring
   */
  public getErrorStatistics(timeWindow: number = 86400000): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    recoveryActionsExecuted: number;
    averageResolutionTime: number;
  } {
    const cutoff = Date.now() - timeWindow;
    const recentErrors = this.errorReports.filter(r => r.timestamp.getTime() > cutoff);

    const stats = {
      totalErrors: recentErrors.length,
      errorsByType: {} as Record<string, number>,
      errorsBySeverity: {} as Record<string, number>,
      recoveryActionsExecuted: 0,
      averageResolutionTime: 0
    };

    recentErrors.forEach(error => {
      stats.errorsByType[error.type] = (stats.errorsByType[error.type] || 0) + 1;
      stats.errorsBySeverity[error.severity] = (stats.errorsBySeverity[error.severity] || 0) + 1;
      stats.recoveryActionsExecuted += error.recoveryActions.length;
    });

    return stats;
  }

  /**
   * Export error reports for debugging or support
   */
  public exportErrorReports(includeDebugInfo: boolean = false): any {
    return this.errorReports.map(report => ({
      ...report,
      debugInfo: includeDebugInfo ? report.debugInfo : undefined,
      context: includeDebugInfo ? report.context : { 
        sessionId: report.context?.sessionId,
        operation: report.context?.operation 
      }
    }));
  }

  // Utility methods
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private mapSeverityToNotification(severity: ErrorSeverity): 'info' | 'warning' | 'error' {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warning';
      case ErrorSeverity.LOW:
      default:
        return 'info';
    }
  }

  private mapIntegritySeverity(severity: string): ErrorSeverity {
    switch (severity) {
      case 'critical':
        return ErrorSeverity.CRITICAL;
      case 'high':
        return ErrorSeverity.HIGH;
      case 'medium':
        return ErrorSeverity.MEDIUM;
      case 'low':
      default:
        return ErrorSeverity.LOW;
    }
  }

  private cleanupOldReports(): void {
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    const cutoff = Date.now() - maxAge;
    
    this.errorReports = this.errorReports.filter(report => 
      report.timestamp.getTime() > cutoff
    );
    
    // Keep at most 1000 recent reports
    if (this.errorReports.length > 1000) {
      this.errorReports = this.errorReports.slice(-1000);
    }
  }

  private trackErrorMetrics(report: ErrorReport): void {
    // This would integrate with analytics or monitoring systems
    console.log(`[Analytics] Error tracked: ${report.type}/${report.severity}`);
  }
}