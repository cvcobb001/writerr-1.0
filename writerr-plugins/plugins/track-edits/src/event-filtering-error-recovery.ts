/**
 * Error Handling and Recovery Mechanisms for Event Filtering System
 * 
 * This module provides comprehensive error handling and recovery mechanisms
 * for the event filtering system to ensure platform stability and graceful
 * degradation when feedback loops are detected or system errors occur.
 */

import { EventLoopDetectionResult, LoopType, LoopSeverity, PreventionAction } from './event-filtering-system';
import { WriterrlEvent, WriterrlEventV2 } from './event-bus-integration';

// ============================================================================
// Error Types and Interfaces
// ============================================================================

export enum FilteringErrorType {
  LOOP_DETECTION_FAILURE = 'loop_detection_failure',
  SYSTEM_OVERLOAD = 'system_overload',
  MEMORY_EXHAUSTION = 'memory_exhaustion',
  CORRELATION_CORRUPTION = 'correlation_corruption',
  PLUGIN_COMMUNICATION_FAILURE = 'plugin_communication_failure',
  EVENT_PROCESSING_TIMEOUT = 'event_processing_timeout',
  CONFIGURATION_ERROR = 'configuration_error',
  RECOVERY_FAILURE = 'recovery_failure'
}

export enum RecoveryStrategy {
  GRACEFUL_DEGRADATION = 'graceful_degradation',       // Reduce filtering capabilities
  FAILSAFE_MODE = 'failsafe_mode',                     // Allow all events through
  CIRCUIT_BREAKER = 'circuit_breaker',                 // Temporarily disable filtering
  EMERGENCY_SHUTDOWN = 'emergency_shutdown',           // Complete system shutdown
  SELECTIVE_FILTERING = 'selective_filtering',         // Filter only critical events
  RESET_AND_RESTART = 'reset_and_restart'             // Full system reset
}

export interface FilteringError {
  type: FilteringErrorType;
  timestamp: number;
  message: string;
  context: {
    eventId?: string;
    eventType?: string;
    sourcePlugin?: string;
    correlationId?: string;
    stackTrace?: string;
    systemStats?: any;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
}

export interface RecoveryAction {
  strategy: RecoveryStrategy;
  timestamp: number;
  triggeredBy: FilteringError;
  duration?: number;
  success: boolean;
  sideEffects: string[];
  metricsBeforeRecovery: SystemMetrics;
  metricsAfterRecovery?: SystemMetrics;
}

export interface SystemMetrics {
  memoryUsage: number;
  cpuUsage: number;
  eventProcessingRate: number;
  activeCorrelations: number;
  errorRate: number;
  averageProcessingTime: number;
}

export interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime: number;
  successCount: number;
  nextRetryTime: number;
  currentState: 'closed' | 'open' | 'half_open';
}

// ============================================================================
// Error Recovery Manager Implementation
// ============================================================================

export class EventFilteringErrorRecoveryManager {
  private errors: FilteringError[] = [];
  private recoveryActions: RecoveryAction[] = [];
  private circuitBreaker: CircuitBreakerState;
  private degradationLevel: number = 0; // 0 = normal, 1-5 = increasing degradation
  private lastSystemCheck: number = 0;
  private systemMetrics: SystemMetrics;
  private recoveryCallbacks: Map<RecoveryStrategy, Function[]> = new Map();
  private errorThresholds = {
    low: 10,        // errors per minute
    medium: 25,     // errors per minute
    high: 50,       // errors per minute
    critical: 100   // errors per minute
  };

  constructor() {
    this.circuitBreaker = {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: 0,
      successCount: 0,
      nextRetryTime: 0,
      currentState: 'closed'
    };

    this.systemMetrics = {
      memoryUsage: 0,
      cpuUsage: 0,
      eventProcessingRate: 0,
      activeCorrelations: 0,
      errorRate: 0,
      averageProcessingTime: 0
    };

    // Initialize recovery callback maps
    Object.values(RecoveryStrategy).forEach(strategy => {
      this.recoveryCallbacks.set(strategy, []);
    });

    this.startSystemMonitoring();
  }

  /**
   * Handle filtering system error
   */
  async handleError(
    error: Error,
    context: {
      event?: WriterrlEvent | WriterrlEventV2;
      eventId?: string;
      correlationId?: string;
      operationType?: string;
    }
  ): Promise<RecoveryAction | null> {
    const filteringError = this.createFilteringError(error, context);
    this.errors.push(filteringError);

    // Keep error history manageable
    if (this.errors.length > 1000) {
      this.errors = this.errors.slice(-500);
    }

    // Determine if recovery is needed
    const recoveryNeeded = this.shouldTriggerRecovery(filteringError);
    if (recoveryNeeded) {
      return await this.executeRecovery(filteringError);
    }

    return null;
  }

  /**
   * Handle loop detection failure gracefully
   */
  async handleLoopDetectionFailure(
    originalEvent: WriterrlEvent | WriterrlEventV2,
    error: Error
  ): Promise<EventLoopDetectionResult> {
    const filteringError: FilteringError = {
      type: FilteringErrorType.LOOP_DETECTION_FAILURE,
      timestamp: Date.now(),
      message: `Loop detection failed: ${error.message}`,
      context: {
        eventType: originalEvent.type,
        sourcePlugin: originalEvent.sourcePlugin,
        stackTrace: error.stack
      },
      severity: 'medium',
      recoverable: true
    };

    await this.handleError(error, {
      event: originalEvent,
      operationType: 'loop_detection'
    });

    // Fail-safe: return conservative result
    return {
      hasLoop: false,
      loopType: LoopType.DIRECT_CIRCULAR,
      severity: LoopSeverity.LOW,
      preventionAction: PreventionAction.WARN
    };
  }

  /**
   * Handle system overload conditions
   */
  async handleSystemOverload(metrics: SystemMetrics): Promise<void> {
    const error: FilteringError = {
      type: FilteringErrorType.SYSTEM_OVERLOAD,
      timestamp: Date.now(),
      message: `System overload detected: CPU ${metrics.cpuUsage}%, Memory ${metrics.memoryUsage}%`,
      context: {
        systemStats: metrics
      },
      severity: metrics.cpuUsage > 90 ? 'critical' : 'high',
      recoverable: true
    };

    this.errors.push(error);
    await this.executeRecovery(error);
  }

  /**
   * Create standardized filtering error
   */
  private createFilteringError(
    error: Error,
    context: {
      event?: WriterrlEvent | WriterrlEventV2;
      eventId?: string;
      correlationId?: string;
      operationType?: string;
    }
  ): FilteringError {
    let errorType = FilteringErrorType.LOOP_DETECTION_FAILURE;
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';

    // Determine error type based on error message and context
    if (error.message.includes('memory') || error.message.includes('heap')) {
      errorType = FilteringErrorType.MEMORY_EXHAUSTION;
      severity = 'high';
    } else if (error.message.includes('timeout')) {
      errorType = FilteringErrorType.EVENT_PROCESSING_TIMEOUT;
      severity = 'medium';
    } else if (error.message.includes('plugin')) {
      errorType = FilteringErrorType.PLUGIN_COMMUNICATION_FAILURE;
      severity = 'medium';
    } else if (error.message.includes('correlation')) {
      errorType = FilteringErrorType.CORRELATION_CORRUPTION;
      severity = 'high';
    }

    return {
      type: errorType,
      timestamp: Date.now(),
      message: error.message,
      context: {
        eventId: context.eventId,
        eventType: context.event?.type,
        sourcePlugin: context.event?.sourcePlugin,
        correlationId: context.correlationId,
        stackTrace: error.stack,
        systemStats: { ...this.systemMetrics }
      },
      severity,
      recoverable: this.isErrorRecoverable(errorType)
    };
  }

  /**
   * Determine if error is recoverable
   */
  private isErrorRecoverable(errorType: FilteringErrorType): boolean {
    const nonRecoverable = [
      FilteringErrorType.MEMORY_EXHAUSTION,
      FilteringErrorType.RECOVERY_FAILURE
    ];
    
    return !nonRecoverable.includes(errorType);
  }

  /**
   * Determine if recovery should be triggered
   */
  private shouldTriggerRecovery(error: FilteringError): boolean {
    // Always recover from critical errors
    if (error.severity === 'critical') {
      return true;
    }

    // Check error rate thresholds
    const recentErrors = this.getRecentErrors(60000); // Last minute
    const errorRate = recentErrors.length;

    if (errorRate >= this.errorThresholds.critical) {
      return true;
    }

    // Check circuit breaker state
    if (this.circuitBreaker.failureCount >= 5) {
      return true;
    }

    // Check system degradation level
    if (this.degradationLevel >= 3) {
      return true;
    }

    return false;
  }

  /**
   * Execute recovery strategy
   */
  private async executeRecovery(triggeringError: FilteringError): Promise<RecoveryAction> {
    const strategy = this.selectRecoveryStrategy(triggeringError);
    const startTime = Date.now();
    const metricsBeforeRecovery = { ...this.systemMetrics };

    const recoveryAction: RecoveryAction = {
      strategy,
      timestamp: startTime,
      triggeredBy: triggeringError,
      success: false,
      sideEffects: [],
      metricsBeforeRecovery
    };

    try {
      switch (strategy) {
        case RecoveryStrategy.GRACEFUL_DEGRADATION:
          await this.executeGracefulDegradation(recoveryAction);
          break;

        case RecoveryStrategy.FAILSAFE_MODE:
          await this.executeFailsafeMode(recoveryAction);
          break;

        case RecoveryStrategy.CIRCUIT_BREAKER:
          await this.executeCircuitBreaker(recoveryAction);
          break;

        case RecoveryStrategy.SELECTIVE_FILTERING:
          await this.executeSelectiveFiltering(recoveryAction);
          break;

        case RecoveryStrategy.RESET_AND_RESTART:
          await this.executeResetAndRestart(recoveryAction);
          break;

        case RecoveryStrategy.EMERGENCY_SHUTDOWN:
          await this.executeEmergencyShutdown(recoveryAction);
          break;

        default:
          throw new Error(`Unknown recovery strategy: ${strategy}`);
      }

      recoveryAction.success = true;
      recoveryAction.duration = Date.now() - startTime;
      recoveryAction.metricsAfterRecovery = { ...this.systemMetrics };

    } catch (recoveryError) {
      recoveryAction.success = false;
      recoveryAction.duration = Date.now() - startTime;
      recoveryAction.sideEffects.push(`Recovery failed: ${recoveryError.message}`);
      
      console.error('[EventFiltering Recovery] Recovery execution failed:', recoveryError);
    }

    this.recoveryActions.push(recoveryAction);

    // Notify registered callbacks
    const callbacks = this.recoveryCallbacks.get(strategy) || [];
    for (const callback of callbacks) {
      try {
        await callback(recoveryAction);
      } catch (callbackError) {
        console.error('[EventFiltering Recovery] Callback failed:', callbackError);
      }
    }

    return recoveryAction;
  }

  /**
   * Select appropriate recovery strategy based on error
   */
  private selectRecoveryStrategy(error: FilteringError): RecoveryStrategy {
    switch (error.type) {
      case FilteringErrorType.MEMORY_EXHAUSTION:
        return RecoveryStrategy.RESET_AND_RESTART;

      case FilteringErrorType.SYSTEM_OVERLOAD:
        return this.degradationLevel < 2 
          ? RecoveryStrategy.GRACEFUL_DEGRADATION 
          : RecoveryStrategy.CIRCUIT_BREAKER;

      case FilteringErrorType.CORRELATION_CORRUPTION:
        return RecoveryStrategy.SELECTIVE_FILTERING;

      case FilteringErrorType.PLUGIN_COMMUNICATION_FAILURE:
        return RecoveryStrategy.FAILSAFE_MODE;

      case FilteringErrorType.EVENT_PROCESSING_TIMEOUT:
        return RecoveryStrategy.CIRCUIT_BREAKER;

      default:
        return RecoveryStrategy.GRACEFUL_DEGRADATION;
    }
  }

  /**
   * Execute graceful degradation strategy
   */
  private async executeGracefulDegradation(action: RecoveryAction): Promise<void> {
    this.degradationLevel = Math.min(this.degradationLevel + 1, 5);
    
    action.sideEffects.push(`Increased degradation level to ${this.degradationLevel}`);
    
    // Notify callbacks about reduced functionality
    const callbacks = this.recoveryCallbacks.get(RecoveryStrategy.GRACEFUL_DEGRADATION) || [];
    for (const callback of callbacks) {
      await callback({
        degradationLevel: this.degradationLevel,
        reducedCapabilities: this.getReducedCapabilities()
      });
    }
  }

  /**
   * Execute failsafe mode strategy
   */
  private async executeFailsafeMode(action: RecoveryAction): Promise<void> {
    // Temporarily disable all filtering - let all events through
    action.sideEffects.push('Entered failsafe mode - all events allowed through');
    
    // Set a timer to re-enable filtering after cooldown
    setTimeout(() => {
      this.degradationLevel = Math.max(this.degradationLevel - 1, 0);
    }, 30000); // 30 second cooldown
  }

  /**
   * Execute circuit breaker strategy
   */
  private async executeCircuitBreaker(action: RecoveryAction): Promise<void> {
    this.circuitBreaker.isOpen = true;
    this.circuitBreaker.currentState = 'open';
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailureTime = Date.now();
    this.circuitBreaker.nextRetryTime = Date.now() + 60000; // 1 minute

    action.sideEffects.push('Opened circuit breaker - filtering temporarily disabled');

    // Schedule circuit breaker half-open attempt
    setTimeout(() => {
      this.circuitBreaker.currentState = 'half_open';
    }, 60000);
  }

  /**
   * Execute selective filtering strategy
   */
  private async executeSelectiveFiltering(action: RecoveryAction): Promise<void> {
    action.sideEffects.push('Enabled selective filtering - only critical events filtered');
    
    // Implementation would modify filtering logic to only handle critical events
    // This is a placeholder for the actual selective filtering logic
  }

  /**
   * Execute reset and restart strategy
   */
  private async executeResetAndRestart(action: RecoveryAction): Promise<void> {
    // Clear all internal state
    this.errors = [];
    this.degradationLevel = 0;
    this.circuitBreaker = {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: 0,
      successCount: 0,
      nextRetryTime: 0,
      currentState: 'closed'
    };

    action.sideEffects.push('Reset all internal state and restarted filtering system');
  }

  /**
   * Execute emergency shutdown strategy
   */
  private async executeEmergencyShutdown(action: RecoveryAction): Promise<void> {
    // Complete system shutdown - should be used only in extreme cases
    action.sideEffects.push('Emergency shutdown initiated - event filtering completely disabled');
    
    // Notify all callbacks about shutdown
    const allCallbacks = Array.from(this.recoveryCallbacks.values()).flat();
    for (const callback of allCallbacks) {
      try {
        await callback({ emergencyShutdown: true });
      } catch (error) {
        // Ignore callback errors during emergency shutdown
      }
    }
  }

  /**
   * Get reduced capabilities based on degradation level
   */
  private getReducedCapabilities(): string[] {
    const capabilities = [];
    
    if (this.degradationLevel >= 1) {
      capabilities.push('Reduced event correlation tracking');
    }
    if (this.degradationLevel >= 2) {
      capabilities.push('Simplified loop detection algorithms');
    }
    if (this.degradationLevel >= 3) {
      capabilities.push('Basic frequency throttling only');
    }
    if (this.degradationLevel >= 4) {
      capabilities.push('Plugin isolation disabled');
    }
    if (this.degradationLevel >= 5) {
      capabilities.push('Minimal filtering capabilities only');
    }
    
    return capabilities;
  }

  /**
   * Get recent errors within specified time window
   */
  private getRecentErrors(windowMs: number): FilteringError[] {
    const cutoffTime = Date.now() - windowMs;
    return this.errors.filter(error => error.timestamp >= cutoffTime);
  }

  /**
   * Start system monitoring
   */
  private startSystemMonitoring(): void {
    setInterval(() => {
      this.updateSystemMetrics();
      this.checkSystemHealth();
    }, 5000); // Check every 5 seconds
  }

  /**
   * Update system metrics
   */
  private updateSystemMetrics(): void {
    // In a real implementation, these would gather actual system metrics
    const recentErrors = this.getRecentErrors(60000);
    
    this.systemMetrics = {
      memoryUsage: this.getMemoryUsage(),
      cpuUsage: this.getCpuUsage(),
      eventProcessingRate: this.getEventProcessingRate(),
      activeCorrelations: this.getActiveCorrelations(),
      errorRate: recentErrors.length,
      averageProcessingTime: this.getAverageProcessingTime()
    };
  }

  /**
   * Check system health and trigger recovery if needed
   */
  private checkSystemHealth(): void {
    if (this.systemMetrics.memoryUsage > 85) {
      this.handleSystemOverload(this.systemMetrics);
    }

    if (this.systemMetrics.cpuUsage > 90) {
      this.handleSystemOverload(this.systemMetrics);
    }

    if (this.systemMetrics.errorRate > this.errorThresholds.high) {
      const error: FilteringError = {
        type: FilteringErrorType.SYSTEM_OVERLOAD,
        timestamp: Date.now(),
        message: `High error rate detected: ${this.systemMetrics.errorRate} errors/minute`,
        context: { systemStats: this.systemMetrics },
        severity: 'high',
        recoverable: true
      };
      this.executeRecovery(error);
    }
  }

  /**
   * Placeholder methods for system metrics gathering
   * In real implementation, these would use actual system monitoring
   */
  private getMemoryUsage(): number {
    // Placeholder - would use actual memory monitoring
    return Math.random() * 100;
  }

  private getCpuUsage(): number {
    // Placeholder - would use actual CPU monitoring
    return Math.random() * 100;
  }

  private getEventProcessingRate(): number {
    // Placeholder - would calculate actual processing rate
    return Math.random() * 1000;
  }

  private getActiveCorrelations(): number {
    // Placeholder - would get actual correlation count
    return Math.floor(Math.random() * 100);
  }

  private getAverageProcessingTime(): number {
    // Placeholder - would calculate actual average
    return Math.random() * 100;
  }

  // ============================================================================
  // Public API Methods
  // ============================================================================

  /**
   * Register recovery callback
   */
  public onRecovery(strategy: RecoveryStrategy, callback: Function): void {
    const callbacks = this.recoveryCallbacks.get(strategy) || [];
    callbacks.push(callback);
    this.recoveryCallbacks.set(strategy, callbacks);
  }

  /**
   * Get system health status
   */
  public getHealthStatus(): {
    isHealthy: boolean;
    degradationLevel: number;
    circuitBreakerState: CircuitBreakerState;
    recentErrors: number;
    systemMetrics: SystemMetrics;
  } {
    const recentErrors = this.getRecentErrors(300000).length; // Last 5 minutes

    return {
      isHealthy: this.degradationLevel === 0 && !this.circuitBreaker.isOpen && recentErrors < 10,
      degradationLevel: this.degradationLevel,
      circuitBreakerState: { ...this.circuitBreaker },
      recentErrors,
      systemMetrics: { ...this.systemMetrics }
    };
  }

  /**
   * Get error history
   */
  public getErrorHistory(limit: number = 100): FilteringError[] {
    return this.errors.slice(-limit);
  }

  /**
   * Get recovery history
   */
  public getRecoveryHistory(limit: number = 50): RecoveryAction[] {
    return this.recoveryActions.slice(-limit);
  }

  /**
   * Force recovery strategy execution
   */
  public async forceRecovery(strategy: RecoveryStrategy, reason: string): Promise<RecoveryAction> {
    const mockError: FilteringError = {
      type: FilteringErrorType.CONFIGURATION_ERROR,
      timestamp: Date.now(),
      message: `Manual recovery triggered: ${reason}`,
      context: {},
      severity: 'medium',
      recoverable: true
    };

    const action = await this.executeRecovery(mockError);
    return action;
  }

  /**
   * Reset error recovery system
   */
  public reset(): void {
    this.errors = [];
    this.recoveryActions = [];
    this.degradationLevel = 0;
    this.circuitBreaker = {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: 0,
      successCount: 0,
      nextRetryTime: 0,
      currentState: 'closed'
    };
  }

  /**
   * Dispose and cleanup
   */
  public dispose(): void {
    this.recoveryCallbacks.clear();
    this.errors = [];
    this.recoveryActions = [];
  }
}