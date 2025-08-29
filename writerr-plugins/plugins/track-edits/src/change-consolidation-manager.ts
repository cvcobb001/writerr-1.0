/**
 * Multi-Plugin Change Consolidation System
 * 
 * Handles simultaneous edits from multiple Writerr Platform plugins with:
 * - Document-level locking and coordination
 * - Change conflict detection and resolution
 * - Intelligent merging of compatible changes
 * - Priority-based conflict resolution
 * - Real-time consolidation during concurrent operations
 */

import { EventEmitter } from 'events';
import { TFile } from 'obsidian';
import { ConsolidationPerformanceMonitor, ConsolidationErrorManager } from './performance-optimization';

// Core interfaces for multi-plugin change consolidation
export interface MultiPluginEditOperation {
  id: string;
  pluginId: string;
  pluginVersion: string;
  sessionId?: string;
  documentPath: string;
  changes: EditChange[];
  timestamp: number;
  priority: OperationPriority;
  capabilities: PluginCapabilities;
  metadata: OperationMetadata;
}

export interface EditChange {
  id?: string;
  timestamp: number;
  type: 'insert' | 'delete' | 'replace';
  from: number;
  to: number;
  text?: string;
  removedText?: string;
  author?: string;
  aiProvider?: string;
  aiModel?: string;
  processingContext?: any;
  aiTimestamp?: Date;
  // Multi-plugin specific fields
  pluginId?: string;
  operationId?: string;
  dependsOn?: string[]; // IDs of changes this depends on
  semanticContext?: SemanticContext;
}

export interface SemanticContext {
  intention: 'correction' | 'enhancement' | 'formatting' | 'content_addition' | 'restructuring';
  scope: 'word' | 'sentence' | 'paragraph' | 'section' | 'document';
  confidence: number; // 0-1
  preserveFormatting?: boolean;
  preserveContent?: boolean;
}

export enum OperationPriority {
  CRITICAL = 1,      // Editorial Engine constraint fixes
  HIGH = 2,          // Track Edits user-initiated changes
  MEDIUM = 3,        // Writerr Chat suggestions
  LOW = 4,           // Background optimizations
  BACKGROUND = 5     // Auto-formatting
}

export interface PluginCapabilities {
  canMergeWith: string[]; // Plugin IDs this can merge changes with
  conflictResolution: ConflictResolutionCapability[];
  maxConcurrentOperations: number;
  supportsRealTimeConsolidation: boolean;
  supportedChangeTypes: EditChange['type'][];
}

export enum ConflictResolutionCapability {
  AUTO_MERGE = 'auto_merge',
  PRIORITY_OVERRIDE = 'priority_override',
  USER_CHOICE = 'user_choice',
  SEMANTIC_ANALYSIS = 'semantic_analysis',
  DEFER_TO_HIGHEST_PRIORITY = 'defer_to_highest_priority'
}

export interface OperationMetadata {
  userInitiated: boolean;
  batchId?: string;
  estimatedProcessingTime: number;
  requiresUserReview: boolean;
  canBeDeferred: boolean;
  tags?: string[];
}

// Document locking system
export interface DocumentLock {
  documentPath: string;
  lockId: string;
  operationId: string;
  pluginId: string;
  timestamp: number;
  lockType: 'exclusive' | 'shared' | 'coordination';
  expiresAt: number;
  metadata: {
    reason: string;
    estimatedDuration: number;
    canBePreempted: boolean;
  };
}

// Change conflict detection
export interface ChangeConflict {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  operations: MultiPluginEditOperation[];
  conflictingChanges: EditChange[];
  detectedAt: number;
  resolution?: ConflictResolution;
  userVisible: boolean;
}

export enum ConflictType {
  OVERLAPPING_EDITS = 'overlapping_edits',
  SEMANTIC_CONFLICT = 'semantic_conflict',
  DEPENDENCY_VIOLATION = 'dependency_violation',
  RESOURCE_CONTENTION = 'resource_contention',
  PRIORITY_CONFLICT = 'priority_conflict'
}

export enum ConflictSeverity {
  CRITICAL = 'critical',     // Will corrupt document
  HIGH = 'high',            // Will cause data loss
  MEDIUM = 'medium',        // May cause unexpected results  
  LOW = 'low',              // Cosmetic issues only
  INFO = 'info'             // No actual conflict, just notification
}

export interface ConflictResolution {
  strategy: ConflictResolutionStrategy;
  result: ConflictResolutionResult;
  timestamp: number;
  appliedBy: 'system' | 'user' | 'plugin';
  metadata: {
    originalChanges: EditChange[];
    mergedChanges?: EditChange[];
    rejectedChanges?: EditChange[];
    userChoices?: any;
  };
}

export enum ConflictResolutionStrategy {
  MERGE_COMPATIBLE = 'merge_compatible',
  PRIORITY_WINS = 'priority_wins',
  USER_CHOICE = 'user_choice',
  DEFER_OPERATION = 'defer_operation',
  SEQUENTIAL_PROCESSING = 'sequential_processing',
  SEMANTIC_MERGE = 'semantic_merge'
}

export interface ConflictResolutionResult {
  success: boolean;
  finalChanges: EditChange[];
  warnings: string[];
  errors: string[];
  requiresUserReview: boolean;
}

// Change merging interfaces
export interface ChangeRange {
  start: number;
  end: number;
  operation: EditChange;
}

export interface MergedChange {
  id: string;
  sourceOperations: string[]; // Operation IDs that contributed
  finalChange: EditChange;
  confidence: number;
  mergeStrategy: string;
  preservedSemantics: boolean;
}

// Consolidation events
export interface ConsolidationEvent {
  type: ConsolidationEventType;
  timestamp: number;
  documentPath: string;
  data: any;
}

export enum ConsolidationEventType {
  OPERATION_QUEUED = 'operation_queued',
  CONFLICT_DETECTED = 'conflict_detected',
  CONFLICT_RESOLVED = 'conflict_resolved',
  CHANGES_MERGED = 'changes_merged',
  DOCUMENT_LOCKED = 'document_locked',
  DOCUMENT_UNLOCKED = 'document_unlocked',
  CONSOLIDATION_COMPLETE = 'consolidation_complete',
  CONSOLIDATION_FAILED = 'consolidation_failed'
}

/**
 * Core Change Consolidation Manager
 * 
 * Manages the coordination of simultaneous changes from multiple plugins
 */
export class ChangeConsolidationManager extends EventEmitter {
  private documentLocks = new Map<string, DocumentLock>();
  private operationQueue = new Map<string, MultiPluginEditOperation[]>();
  private activeConflicts = new Map<string, ChangeConflict>();
  private consolidationHistory = new Map<string, ConsolidationEvent[]>();
  private lockTimeouts = new Map<string, NodeJS.Timeout>();

  // Performance tracking and optimization
  private performanceMonitor: ConsolidationPerformanceMonitor;
  private errorManager: ConsolidationErrorManager;

  constructor() {
    super();
    
    // Initialize performance monitoring and error handling
    this.initializePerformanceOptimization();
    this.setupCleanupInterval();
  }

  private async initializePerformanceOptimization() {
    const { ConsolidationPerformanceMonitor, ConsolidationErrorManager } = await import('./performance-optimization');
    
    this.performanceMonitor = new ConsolidationPerformanceMonitor({
      maxConcurrentOperations: 5,
      batchProcessingSize: 20,
      enableResultCaching: true,
      useAsyncProcessing: true,
      optimizeForLargeDocuments: true,
      maxMemoryUsage: 256, // 256 MB limit
      maxProcessingTime: 15000 // 15 second timeout
    });

    this.errorManager = new ConsolidationErrorManager();
  }

  /**
   * Submit a multi-plugin operation for consolidation
   */
  async submitOperation(operation: MultiPluginEditOperation): Promise<{
    success: boolean;
    operationId: string;
    requiresConsolidation: boolean;
    estimatedWaitTime?: number;
    warnings?: string[];
    errors?: string[];
  }> {
    const startTime = performance.now();
    this.performanceMetrics.totalOperations++;

    try {
      // Check if document needs coordination
      const needsCoordination = await this.checkCoordinationRequired(operation);
      
      if (!needsCoordination) {
        // No other operations affecting this document - proceed directly
        return {
          success: true,
          operationId: operation.id,
          requiresConsolidation: false
        };
      }

      // Add to operation queue for the document
      const documentQueue = this.operationQueue.get(operation.documentPath) || [];
      documentQueue.push(operation);
      this.operationQueue.set(operation.documentPath, documentQueue);

      this.emit('consolidation_event', {
        type: ConsolidationEventType.OPERATION_QUEUED,
        timestamp: Date.now(),
        documentPath: operation.documentPath,
        data: { operationId: operation.id, queueLength: documentQueue.length }
      });

      // Process the queue for this document
      const result = await this.processDocumentQueue(operation.documentPath);
      
      const processingTime = performance.now() - startTime;
      this.updatePerformanceMetrics('consolidation_time', processingTime);

      return result;

    } catch (error) {
      this.performanceMetrics.failedConsolidations++;
      console.error('[ChangeConsolidationManager] Error submitting operation:', error);
      
      return {
        success: false,
        operationId: operation.id,
        requiresConsolidation: true,
        errors: [error.message]
      };
    }
  }

  /**
   * Check if coordination is required for this operation
   */
  private async checkCoordinationRequired(operation: MultiPluginEditOperation): Promise<boolean> {
    // Check if document is currently locked
    const existingLock = this.documentLocks.get(operation.documentPath);
    if (existingLock && existingLock.pluginId !== operation.pluginId) {
      return true;
    }

    // Check if there are queued operations for this document
    const queuedOps = this.operationQueue.get(operation.documentPath);
    if (queuedOps && queuedOps.length > 0) {
      return true;
    }

    // Check for recent operations that might still be processing
    const recentEvents = this.consolidationHistory.get(operation.documentPath) || [];
    const recentProcessing = recentEvents.find(event => 
      event.timestamp > Date.now() - 5000 && // Within 5 seconds
      [ConsolidationEventType.OPERATION_QUEUED, ConsolidationEventType.CHANGES_MERGED].includes(event.type)
    );

    return !!recentProcessing;
  }

  /**
   * Process the operation queue for a specific document
   */
  private async processDocumentQueue(documentPath: string): Promise<{
    success: boolean;
    operationId: string;
    requiresConsolidation: boolean;
    estimatedWaitTime?: number;
    warnings?: string[];
    errors?: string[];
  }> {
    const queue = this.operationQueue.get(documentPath);
    if (!queue || queue.length === 0) {
      return {
        success: true,
        operationId: '',
        requiresConsolidation: false
      };
    }

    // Sort operations by priority and timestamp
    const sortedQueue = [...queue].sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority; // Lower number = higher priority
      }
      return a.timestamp - b.timestamp; // Earlier timestamp first
    });

    // Acquire document lock
    const lockId = await this.acquireDocumentLock(documentPath, sortedQueue[0]);
    if (!lockId) {
      return {
        success: false,
        operationId: sortedQueue[0].id,
        requiresConsolidation: true,
        errors: ['Failed to acquire document lock'],
        estimatedWaitTime: this.estimateWaitTime(documentPath)
      };
    }

    try {
      // Detect conflicts among queued operations
      const conflicts = await this.detectConflicts(sortedQueue);
      
      if (conflicts.length > 0) {
        this.performanceMetrics.conflictsDetected += conflicts.length;
        
        // Resolve conflicts
        const resolutions = await this.resolveConflicts(conflicts);
        const successfulResolutions = resolutions.filter(r => r.result.success);
        
        this.performanceMetrics.conflictsResolved += successfulResolutions.length;
        
        if (successfulResolutions.length < conflicts.length) {
          return {
            success: false,
            operationId: sortedQueue[0].id,
            requiresConsolidation: true,
            errors: ['Failed to resolve all conflicts'],
            warnings: resolutions.filter(r => !r.result.success).map(r => r.result.errors.join(', '))
          };
        }
      }

      // Merge compatible operations
      const consolidationResult = await this.consolidateOperations(sortedQueue, documentPath);
      
      // Clear the queue for this document
      this.operationQueue.delete(documentPath);
      
      this.emit('consolidation_event', {
        type: ConsolidationEventType.CONSOLIDATION_COMPLETE,
        timestamp: Date.now(),
        documentPath,
        data: consolidationResult
      });

      return {
        success: consolidationResult.success,
        operationId: sortedQueue[0].id,
        requiresConsolidation: true,
        warnings: consolidationResult.warnings,
        errors: consolidationResult.errors
      };

    } finally {
      // Always release the document lock
      await this.releaseDocumentLock(lockId);
    }
  }

  /**
   * Acquire exclusive lock on a document
   */
  private async acquireDocumentLock(
    documentPath: string, 
    operation: MultiPluginEditOperation
  ): Promise<string | null> {
    const lockId = `${operation.pluginId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Check if document is already locked
    const existingLock = this.documentLocks.get(documentPath);
    if (existingLock) {
      // Check if lock can be preempted
      if (!existingLock.metadata.canBePreempted || 
          operation.priority >= this.getOperationPriority(existingLock.operationId)) {
        return null;
      }
      
      // Preempt existing lock
      await this.releaseDocumentLock(existingLock.lockId);
    }

    const lock: DocumentLock = {
      documentPath,
      lockId,
      operationId: operation.id,
      pluginId: operation.pluginId,
      timestamp: Date.now(),
      lockType: 'exclusive',
      expiresAt: Date.now() + operation.metadata.estimatedProcessingTime + 30000, // Add 30s buffer
      metadata: {
        reason: 'multi_plugin_consolidation',
        estimatedDuration: operation.metadata.estimatedProcessingTime,
        canBePreempted: operation.priority > OperationPriority.CRITICAL
      }
    };

    this.documentLocks.set(documentPath, lock);
    
    // Set lock timeout
    const timeout = setTimeout(() => {
      this.releaseDocumentLock(lockId);
    }, lock.expiresAt - Date.now());
    this.lockTimeouts.set(lockId, timeout);

    this.emit('consolidation_event', {
      type: ConsolidationEventType.DOCUMENT_LOCKED,
      timestamp: Date.now(),
      documentPath,
      data: { lockId, pluginId: operation.pluginId }
    });

    return lockId;
  }

  /**
   * Release document lock
   */
  private async releaseDocumentLock(lockId: string): Promise<void> {
    // Find and remove the lock
    for (const [documentPath, lock] of this.documentLocks.entries()) {
      if (lock.lockId === lockId) {
        this.documentLocks.delete(documentPath);
        
        // Clear timeout
        const timeout = this.lockTimeouts.get(lockId);
        if (timeout) {
          clearTimeout(timeout);
          this.lockTimeouts.delete(lockId);
        }

        this.emit('consolidation_event', {
          type: ConsolidationEventType.DOCUMENT_UNLOCKED,
          timestamp: Date.now(),
          documentPath,
          data: { lockId }
        });
        
        break;
      }
    }
  }

  /**
   * Get operation priority by ID
   */
  private getOperationPriority(operationId: string): OperationPriority {
    // Search through queues to find operation
    for (const queue of this.operationQueue.values()) {
      const operation = queue.find(op => op.id === operationId);
      if (operation) {
        return operation.priority;
      }
    }
    return OperationPriority.BACKGROUND; // Default to lowest priority
  }

  /**
   * Estimate wait time for document access
   */
  private estimateWaitTime(documentPath: string): number {
    const lock = this.documentLocks.get(documentPath);
    if (lock) {
      return Math.max(0, lock.expiresAt - Date.now());
    }
    
    const queue = this.operationQueue.get(documentPath);
    if (queue) {
      // Estimate based on average processing time and queue length
      return queue.reduce((total, op) => total + op.metadata.estimatedProcessingTime, 0);
    }
    
    return 0;
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(metric: string, value: number): void {
    if (metric === 'consolidation_time') {
      const currentAvg = this.performanceMetrics.averageConsolidationTime;
      const totalOps = this.performanceMetrics.totalOperations;
      this.performanceMetrics.averageConsolidationTime = 
        (currentAvg * (totalOps - 1) + value) / totalOps;
    }
  }

  /**
   * Setup periodic cleanup of expired locks and old history
   */
  private setupCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      
      // Clean up expired locks
      for (const [documentPath, lock] of this.documentLocks.entries()) {
        if (lock.expiresAt < now) {
          this.releaseDocumentLock(lock.lockId);
        }
      }
      
      // Clean up old consolidation history (keep last 24 hours)
      const cutoff = now - 24 * 60 * 60 * 1000;
      for (const [documentPath, events] of this.consolidationHistory.entries()) {
        const recentEvents = events.filter(event => event.timestamp > cutoff);
        if (recentEvents.length !== events.length) {
          this.consolidationHistory.set(documentPath, recentEvents);
        }
      }
    }, 60000); // Run every minute
  }

  // Conflict detection and resolution implementation
  private async detectConflicts(operations: MultiPluginEditOperation[]): Promise<ChangeConflict[]> {
    const operationId = `conflict_detection_${Date.now()}`;
    
    // Check cache first
    if (this.performanceMonitor) {
      const cacheKey = this.performanceMonitor.generateConflictCacheKey(operations);
      const cachedResult = this.performanceMonitor.getCachedConflictDetection(cacheKey);
      
      if (cachedResult) {
        return cachedResult;
      }
      
      this.performanceMonitor.startTiming(operationId, 'conflict_detection');
    }

    const { ConflictDetectionEngine } = await import('./conflict-detection-algorithms');
    
    const detectionEngine = new ConflictDetectionEngine({
      enableSemanticAnalysis: true,
      overlapTolerance: 3,
      dependencyDepth: 5,
      temporalWindow: 5000,
      priorityThreshold: 1
    });

    try {
      const conflicts = await detectionEngine.detectConflicts(operations);
      
      // Cache the result if performance monitor is available
      if (this.performanceMonitor) {
        const cacheKey = this.performanceMonitor.generateConflictCacheKey(operations);
        this.performanceMonitor.cacheConflictDetection(cacheKey, conflicts);
        this.performanceMonitor.endTiming(operationId, 'conflict_detection', true);
      }
      
      return conflicts;
    } catch (error) {
      console.error('[ChangeConsolidationManager] Error detecting conflicts:', error);
      
      // Handle error with recovery
      if (this.errorManager) {
        const { recovered } = await this.errorManager.handleError(error, { operations, operationId });
        if (recovered) {
          // Retry once
          try {
            const conflicts = await detectionEngine.detectConflicts(operations);
            if (this.performanceMonitor) {
              this.performanceMonitor.endTiming(operationId, 'conflict_detection', true);
            }
            return conflicts;
          } catch (retryError) {
            console.error('[ChangeConsolidationManager] Retry failed:', retryError);
          }
        }
      }
      
      if (this.performanceMonitor) {
        this.performanceMonitor.endTiming(operationId, 'conflict_detection', false);
      }
      
      return [];
    }
  }

  private async resolveConflicts(conflicts: ChangeConflict[]): Promise<ConflictResolution[]> {
    const resolutions: ConflictResolution[] = [];

    for (const conflict of conflicts) {
      try {
        const resolution = await this.resolveIndividualConflict(conflict);
        resolutions.push(resolution);
        
        // Store resolved conflict
        this.activeConflicts.delete(conflict.id);
        
        this.emit('consolidation_event', {
          type: ConsolidationEventType.CONFLICT_RESOLVED,
          timestamp: Date.now(),
          documentPath: conflict.operations[0].documentPath,
          data: { conflictId: conflict.id, strategy: resolution.strategy }
        });
      } catch (error) {
        console.error(`[ChangeConsolidationManager] Error resolving conflict ${conflict.id}:`, error);
        
        // Create failed resolution
        resolutions.push({
          strategy: ConflictResolutionStrategy.USER_CHOICE,
          result: {
            success: false,
            finalChanges: [],
            warnings: [],
            errors: [`Failed to resolve conflict: ${error.message}`],
            requiresUserReview: true
          },
          timestamp: Date.now(),
          appliedBy: 'system',
          metadata: {
            originalChanges: conflict.conflictingChanges
          }
        });
      }
    }

    return resolutions;
  }

  private async resolveIndividualConflict(conflict: ChangeConflict): Promise<ConflictResolution> {
    // Determine resolution strategy based on conflict type and severity
    const strategy = this.selectResolutionStrategy(conflict);
    
    let result: ConflictResolutionResult;

    switch (strategy) {
      case ConflictResolutionStrategy.MERGE_COMPATIBLE:
        result = await this.attemptCompatibleMerge(conflict);
        break;
        
      case ConflictResolutionStrategy.PRIORITY_WINS:
        result = await this.applyPriorityWins(conflict);
        break;
        
      case ConflictResolutionStrategy.SEQUENTIAL_PROCESSING:
        result = await this.applySequentialProcessing(conflict);
        break;
        
      case ConflictResolutionStrategy.SEMANTIC_MERGE:
        result = await this.attemptSemanticMerge(conflict);
        break;
        
      case ConflictResolutionStrategy.DEFER_OPERATION:
        result = await this.deferLowerPriorityOperations(conflict);
        break;
        
      default:
        result = {
          success: false,
          finalChanges: conflict.conflictingChanges,
          warnings: [],
          errors: ['Unknown resolution strategy'],
          requiresUserReview: true
        };
    }

    return {
      strategy,
      result,
      timestamp: Date.now(),
      appliedBy: 'system',
      metadata: {
        originalChanges: conflict.conflictingChanges,
        mergedChanges: result.finalChanges,
        rejectedChanges: result.success ? [] : conflict.conflictingChanges
      }
    };
  }

  private selectResolutionStrategy(conflict: ChangeConflict): ConflictResolutionStrategy {
    // Strategy selection based on conflict characteristics
    switch (conflict.type) {
      case ConflictType.OVERLAPPING_EDITS:
        if (conflict.severity === ConflictSeverity.LOW) {
          return ConflictResolutionStrategy.MERGE_COMPATIBLE;
        } else if (conflict.severity === ConflictSeverity.HIGH) {
          return ConflictResolutionStrategy.PRIORITY_WINS;
        } else {
          return ConflictResolutionStrategy.SEQUENTIAL_PROCESSING;
        }
        
      case ConflictType.SEMANTIC_CONFLICT:
        return ConflictResolutionStrategy.SEMANTIC_MERGE;
        
      case ConflictType.DEPENDENCY_VIOLATION:
        return ConflictResolutionStrategy.SEQUENTIAL_PROCESSING;
        
      case ConflictType.PRIORITY_CONFLICT:
        return ConflictResolutionStrategy.PRIORITY_WINS;
        
      case ConflictType.RESOURCE_CONTENTION:
        return ConflictResolutionStrategy.DEFER_OPERATION;
        
      default:
        return ConflictResolutionStrategy.USER_CHOICE;
    }
  }

  private async attemptCompatibleMerge(conflict: ChangeConflict): Promise<ConflictResolutionResult> {
    const { ChangeMergingEngine } = await import('./change-merging-algorithms');
    
    const mergingEngine = new ChangeMergingEngine({
      maxOverlapTolerance: 5,
      preserveFormatting: true,
      enableSemanticMerging: true,
      priorityWeighting: 0.7,
      confidenceThreshold: 0.6
    });

    try {
      return await mergingEngine.mergeOperations(conflict.operations);
    } catch (error) {
      return {
        success: false,
        finalChanges: conflict.conflictingChanges,
        warnings: [],
        errors: [`Merge failed: ${error.message}`],
        requiresUserReview: true
      };
    }
  }

  private async applyPriorityWins(conflict: ChangeConflict): Promise<ConflictResolutionResult> {
    // Sort operations by priority
    const sortedOps = [...conflict.operations].sort((a, b) => a.priority - b.priority);
    const winningOp = sortedOps[0];
    
    return {
      success: true,
      finalChanges: winningOp.changes,
      warnings: [
        `Conflict resolved by priority: ${winningOp.pluginId} (priority ${winningOp.priority}) wins`,
        `Rejected ${sortedOps.length - 1} lower priority operations`
      ],
      errors: [],
      requiresUserReview: conflict.severity === ConflictSeverity.HIGH
    };
  }

  private async applySequentialProcessing(conflict: ChangeConflict): Promise<ConflictResolutionResult> {
    // Sort by priority and timestamp
    const sortedOps = [...conflict.operations].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.timestamp - b.timestamp;
    });

    // Apply operations sequentially
    const finalChanges: EditChange[] = [];
    const warnings: string[] = [];
    
    for (const op of sortedOps) {
      finalChanges.push(...op.changes);
      warnings.push(`Applied operation ${op.id} from ${op.pluginId} sequentially`);
    }

    return {
      success: true,
      finalChanges,
      warnings,
      errors: [],
      requiresUserReview: conflict.severity >= ConflictSeverity.MEDIUM
    };
  }

  private async attemptSemanticMerge(conflict: ChangeConflict): Promise<ConflictResolutionResult> {
    const { ChangeMergingEngine } = await import('./change-merging-algorithms');
    
    const mergingEngine = new ChangeMergingEngine({
      enableSemanticMerging: true,
      confidenceThreshold: 0.5,
      priorityWeighting: 0.8
    });

    const result = await mergingEngine.mergeOperations(conflict.operations);
    
    if (!result.success || result.requiresUserReview) {
      result.warnings.push('Semantic merge attempted but requires user review');
    }

    return result;
  }

  private async deferLowerPriorityOperations(conflict: ChangeConflict): Promise<ConflictResolutionResult> {
    // Find highest priority operation
    const highestPriorityOp = conflict.operations.reduce((highest, current) => 
      current.priority < highest.priority ? current : highest
    );
    
    // Defer others back to queue
    const deferredOps = conflict.operations.filter(op => op.id !== highestPriorityOp.id);
    
    for (const deferredOp of deferredOps) {
      // Add back to queue with delay
      setTimeout(() => {
        this.submitOperation({
          ...deferredOp,
          timestamp: Date.now(),
          metadata: {
            ...deferredOp.metadata,
            canBeDeferred: true
          }
        });
      }, 1000); // 1 second delay
    }

    return {
      success: true,
      finalChanges: highestPriorityOp.changes,
      warnings: [`Deferred ${deferredOps.length} lower priority operations`],
      errors: [],
      requiresUserReview: false
    };
  }

  private async consolidateOperations(
    operations: MultiPluginEditOperation[], 
    documentPath: string
  ): Promise<ConflictResolutionResult> {
    const { ChangeMergingEngine } = await import('./change-merging-algorithms');
    
    const mergingEngine = new ChangeMergingEngine({
      maxOverlapTolerance: 3,
      preserveFormatting: true,
      enableSemanticMerging: true,
      priorityWeighting: 0.7,
      confidenceThreshold: 0.6
    });

    try {
      const result = await mergingEngine.mergeOperations(operations);
      
      // Record consolidation in history
      const historyEntry: ConsolidationEvent = {
        type: ConsolidationEventType.CHANGES_MERGED,
        timestamp: Date.now(),
        documentPath,
        data: {
          operationIds: operations.map(op => op.id),
          finalChangeCount: result.finalChanges.length,
          success: result.success
        }
      };
      
      const history = this.consolidationHistory.get(documentPath) || [];
      history.push(historyEntry);
      this.consolidationHistory.set(documentPath, history);
      
      return result;
    } catch (error) {
      console.error('[ChangeConsolidationManager] Error consolidating operations:', error);
      
      return {
        success: false,
        finalChanges: operations.flatMap(op => op.changes),
        warnings: [],
        errors: [`Consolidation failed: ${error.message}`],
        requiresUserReview: true
      };
    }
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics() {
    return this.performanceMonitor ? this.performanceMonitor.getMetrics() : null;
  }

  /**
   * Get performance recommendations
   */
  getPerformanceRecommendations(): string[] {
    return this.performanceMonitor ? this.performanceMonitor.getPerformanceRecommendations() : [];
  }

  /**
   * Export performance data for analysis
   */
  exportPerformanceData() {
    return this.performanceMonitor ? this.performanceMonitor.exportPerformanceData() : null;
  }

  /**
   * Get error statistics
   */
  getErrorStatistics() {
    return this.errorManager ? this.errorManager.getErrorStatistics() : null;
  }

  /**
   * Check if system should throttle processing
   */
  shouldThrottleProcessing(): boolean {
    return this.performanceMonitor ? this.performanceMonitor.shouldThrottleProcessing() : false;
  }

  /**
   * Optimize configuration based on current performance
   */
  async optimizeConfiguration(): Promise<void> {
    if (!this.performanceMonitor) return;

    const metrics = this.performanceMonitor.getMetrics();
    const recommendations = this.performanceMonitor.getPerformanceRecommendations();
    
    // Auto-adjust configuration based on performance
    const currentConfig = this.performanceMonitor.getConfig();
    const newConfig = { ...currentConfig };

    // Adjust batch size based on memory usage
    if (metrics.currentMemoryUsage > currentConfig.maxMemoryUsage * 0.8) {
      newConfig.batchProcessingSize = Math.max(5, Math.floor(currentConfig.batchProcessingSize * 0.8));
    } else if (metrics.currentMemoryUsage < currentConfig.maxMemoryUsage * 0.5) {
      newConfig.batchProcessingSize = Math.min(50, Math.floor(currentConfig.batchProcessingSize * 1.2));
    }

    // Adjust caching based on performance
    if (metrics.averageConflictDetectionTime > 1000) {
      newConfig.enableResultCaching = true;
      newConfig.maxCacheSize = Math.min(2000, currentConfig.maxCacheSize * 1.5);
    }

    // Adjust concurrent operations based on error rate
    const errorStats = this.errorManager?.getErrorStatistics();
    if (errorStats && errorStats.recentErrorRate > 5) { // More than 5 errors per minute
      newConfig.maxConcurrentOperations = Math.max(2, currentConfig.maxConcurrentOperations - 1);
    }

    this.performanceMonitor.updateConfig(newConfig);
    
    console.log('[ChangeConsolidationManager] Configuration optimized:', {
      oldBatchSize: currentConfig.batchProcessingSize,
      newBatchSize: newConfig.batchProcessingSize,
      oldConcurrentOps: currentConfig.maxConcurrentOperations,
      newConcurrentOps: newConfig.maxConcurrentOperations,
      recommendations
    });
  }

  /**
   * Get active document locks
   */
  getActiveDocumentLocks(): Map<string, DocumentLock> {
    return new Map(this.documentLocks);
  }

  /**
   * Get queued operations for a document
   */
  getQueuedOperations(documentPath: string): MultiPluginEditOperation[] {
    return [...(this.operationQueue.get(documentPath) || [])];
  }

  /**
   * Get consolidation status for UI
   */
  getConsolidationStatus(): {
    status: 'idle' | 'processing' | 'conflict' | 'completed' | 'error';
    details: string;
    activeOperations: number;
    queuedOperations: number;
    activeConflicts: number;
  } {
    const activeOperations = Array.from(this.operationQueue.values()).reduce((sum, ops) => sum + ops.length, 0);
    const queuedOperations = activeOperations;
    const activeConflicts = this.activeConflicts.size;

    let status: 'idle' | 'processing' | 'conflict' | 'completed' | 'error' = 'idle';
    let details = 'No active operations';

    if (activeConflicts > 0) {
      status = 'conflict';
      details = `${activeConflicts} conflict${activeConflicts !== 1 ? 's' : ''} requiring resolution`;
    } else if (activeOperations > 0) {
      status = 'processing';
      details = `Processing ${activeOperations} operation${activeOperations !== 1 ? 's' : ''}`;
    } else if (this.consolidationHistory.size > 0) {
      const recentEvents = Array.from(this.consolidationHistory.values())
        .flat()
        .filter(event => Date.now() - event.timestamp < 5000);
      
      if (recentEvents.some(e => e.type === ConsolidationEventType.CONSOLIDATION_FAILED)) {
        status = 'error';
        details = 'Recent consolidation failed';
      } else if (recentEvents.some(e => e.type === ConsolidationEventType.CONSOLIDATION_COMPLETE)) {
        status = 'completed';
        details = 'Recent consolidation completed successfully';
      }
    }

    return {
      status,
      details,
      activeOperations,
      queuedOperations,
      activeConflicts
    };
  }
}