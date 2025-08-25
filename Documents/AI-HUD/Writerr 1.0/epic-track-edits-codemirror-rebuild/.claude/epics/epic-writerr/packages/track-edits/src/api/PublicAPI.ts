/**
 * Public API for Track Edits plugin that other Writerr plugins can use
 * Provides comprehensive change tracking functionality for external integration
 */

import { Change, ChangeCluster, TrackingSession, BulkOperation, FilterOptions, ChangeStatus, ChangeSource, ChangeCategory } from '../types';
import { globalEventBus } from '@writerr/shared';

export interface TrackEditsAPIEvents {
  'change-added': { change: Change };
  'change-removed': { changeId: string };
  'change-accepted': { changeId: string; change: Change };
  'change-rejected': { changeId: string; change: Change };
  'change-conflicted': { changeId: string; change: Change; conflict: ConflictInfo };
  'bulk-operation-started': { operation: BulkOperation };
  'bulk-operation-completed': { operation: BulkOperation; results: OperationResult[] };
  'session-started': { session: TrackingSession };
  'session-ended': { sessionId: string; statistics: SessionStatistics };
  'performance-warning': { metric: string; value: number; threshold: number };
}

export interface ConflictInfo {
  type: 'simultaneous-edit' | 'overlapping-changes' | 'dependency-conflict';
  conflictingChangeId?: string;
  description: string;
  suggestedResolution?: 'merge' | 'reject-new' | 'reject-existing' | 'manual';
}

export interface OperationResult {
  changeId: string;
  success: boolean;
  error?: string;
}

export interface SessionStatistics {
  duration: number;
  totalChanges: number;
  acceptedChanges: number;
  rejectedChanges: number;
  averageResponseTime: number;
  memoryUsage: number;
}

export interface ChangeSubmissionOptions {
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  source?: ChangeSource;
  category?: ChangeCategory;
  confidence?: number;
  metadata?: {
    reason?: string;
    suggestion?: string;
    context?: string;
    source_plugin?: string;
  };
  conflictResolution?: 'auto' | 'manual' | 'skip';
}

export interface BatchSubmissionOptions extends ChangeSubmissionOptions {
  enableClustering?: boolean;
  clusteringStrategy?: 'category' | 'proximity' | 'ml-inspired' | 'auto';
  processingMode?: 'immediate' | 'background' | 'throttled';
}

export interface PerformanceMetrics {
  changeDetectionTime: number;
  renderingTime: number;
  memoryUsage: number;
  totalChanges: number;
  processingQueueSize: number;
  averageResponseTime: number;
}

/**
 * Main public API class for Track Edits functionality
 * This is the primary interface that external plugins should use
 */
export class TrackEditsPublicAPI {
  private static instance: TrackEditsPublicAPI;
  private changeQueue: Change[] = [];
  private performanceMetrics: PerformanceMetrics = {
    changeDetectionTime: 0,
    renderingTime: 0,
    memoryUsage: 0,
    totalChanges: 0,
    processingQueueSize: 0,
    averageResponseTime: 0,
  };

  private constructor() {
    // Private constructor for singleton pattern
  }

  public static getInstance(): TrackEditsPublicAPI {
    if (!TrackEditsPublicAPI.instance) {
      TrackEditsPublicAPI.instance = new TrackEditsPublicAPI();
    }
    return TrackEditsPublicAPI.instance;
  }

  /**
   * Submit a single change for tracking
   */
  async submitChange(change: Omit<Change, 'id' | 'timestamp'>, options?: ChangeSubmissionOptions): Promise<string> {
    const startTime = performance.now();
    
    const fullChange: Change = {
      ...change,
      id: this.generateChangeId(),
      timestamp: Date.now(),
      source: options?.source || change.source,
      category: options?.category || change.category,
      confidence: options?.confidence !== undefined ? options.confidence : change.confidence,
      status: ChangeStatus.PENDING,
      metadata: {
        ...change.metadata,
        ...options?.metadata,
        priority: options?.priority || 'normal',
      },
    };

    try {
      // Check for conflicts if resolution is enabled
      if (options?.conflictResolution !== 'skip') {
        const conflict = await this.detectConflicts(fullChange);
        if (conflict) {
          if (options?.conflictResolution === 'auto') {
            await this.resolveConflictAutomatically(fullChange, conflict);
          } else {
            fullChange.status = ChangeStatus.CONFLICTED;
            globalEventBus.emit('change-conflicted', { 
              changeId: fullChange.id, 
              change: fullChange, 
              conflict 
            });
          }
        }
      }

      // Add to processing queue
      this.changeQueue.push(fullChange);
      this.updatePerformanceMetrics('changeDetectionTime', performance.now() - startTime);

      globalEventBus.emit('change-added', { change: fullChange });
      return fullChange.id;

    } catch (error) {
      console.error('Error submitting change:', error);
      throw new Error(`Failed to submit change: ${error}`);
    }
  }

  /**
   * Submit multiple changes as a batch
   */
  async submitChangesBatch(changes: Array<Omit<Change, 'id' | 'timestamp'>>, options?: BatchSubmissionOptions): Promise<string[]> {
    const startTime = performance.now();
    const changeIds: string[] = [];

    try {
      const processedChanges: Change[] = changes.map(change => ({
        ...change,
        id: this.generateChangeId(),
        timestamp: Date.now(),
        source: options?.source || change.source,
        category: options?.category || change.category,
        confidence: options?.confidence !== undefined ? options.confidence : change.confidence,
        status: ChangeStatus.PENDING,
        metadata: {
          ...change.metadata,
          ...options?.metadata,
          priority: options?.priority || 'normal',
        },
      }));

      // Process based on mode
      if (options?.processingMode === 'background') {
        // Queue for background processing
        this.queueForBackgroundProcessing(processedChanges);
      } else if (options?.processingMode === 'throttled') {
        // Process with throttling
        await this.processWithThrottling(processedChanges);
      } else {
        // Immediate processing
        await this.processChangesImmediately(processedChanges);
      }

      changeIds.push(...processedChanges.map(c => c.id));
      this.updatePerformanceMetrics('changeDetectionTime', performance.now() - startTime);

      return changeIds;

    } catch (error) {
      console.error('Error submitting changes batch:', error);
      throw new Error(`Failed to submit changes batch: ${error}`);
    }
  }

  /**
   * Accept a change by ID
   */
  async acceptChange(changeId: string): Promise<void> {
    globalEventBus.emit('change-accepted', { changeId, change: await this.getChange(changeId) });
  }

  /**
   * Reject a change by ID
   */
  async rejectChange(changeId: string): Promise<void> {
    globalEventBus.emit('change-rejected', { changeId, change: await this.getChange(changeId) });
  }

  /**
   * Get a specific change by ID
   */
  async getChange(changeId: string): Promise<Change | null> {
    const change = this.changeQueue.find(c => c.id === changeId);
    return change || null;
  }

  /**
   * Get all changes with optional filtering
   */
  async getChanges(filter?: FilterOptions): Promise<Change[]> {
    let changes = [...this.changeQueue];

    if (filter) {
      if (filter.sources?.length) {
        changes = changes.filter(c => filter.sources!.includes(c.source));
      }
      if (filter.categories?.length) {
        changes = changes.filter(c => filter.categories!.includes(c.category));
      }
      if (filter.statuses?.length) {
        changes = changes.filter(c => filter.statuses!.includes(c.status));
      }
      if (filter.confidenceRange) {
        changes = changes.filter(c => 
          c.confidence >= filter.confidenceRange![0] && 
          c.confidence <= filter.confidenceRange![1]
        );
      }
      if (filter.timeRange) {
        changes = changes.filter(c => 
          c.timestamp >= filter.timeRange![0] && 
          c.timestamp <= filter.timeRange![1]
        );
      }
      if (filter.searchText) {
        const searchLower = filter.searchText.toLowerCase();
        changes = changes.filter(c =>
          c.content.before.toLowerCase().includes(searchLower) ||
          c.content.after.toLowerCase().includes(searchLower) ||
          c.metadata?.reason?.toLowerCase().includes(searchLower)
        );
      }
    }

    return changes;
  }

  /**
   * Perform bulk operations on multiple changes
   */
  async performBulkOperation(operation: BulkOperation): Promise<OperationResult[]> {
    globalEventBus.emit('bulk-operation-started', { operation });
    
    const results: OperationResult[] = [];
    
    for (const changeId of operation.changeIds) {
      try {
        switch (operation.type) {
          case 'accept':
            await this.acceptChange(changeId);
            results.push({ changeId, success: true });
            break;
          case 'reject':
            await this.rejectChange(changeId);
            results.push({ changeId, success: true });
            break;
          default:
            results.push({ 
              changeId, 
              success: false, 
              error: `Unknown operation type: ${operation.type}` 
            });
        }
      } catch (error) {
        results.push({ 
          changeId, 
          success: false, 
          error: error.message 
        });
      }
    }

    globalEventBus.emit('bulk-operation-completed', { operation, results });
    return results;
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Start a new tracking session
   */
  async startSession(documentId: string): Promise<string> {
    const session: TrackingSession = {
      id: this.generateSessionId(),
      documentId,
      startTime: Date.now(),
      changes: [],
      clusters: [],
      statistics: {
        totalChanges: 0,
        acceptedChanges: 0,
        rejectedChanges: 0,
        pendingChanges: 0,
        avgConfidence: 0,
      },
    };

    globalEventBus.emit('session-started', { session });
    return session.id;
  }

  /**
   * End a tracking session
   */
  async endSession(sessionId: string): Promise<SessionStatistics> {
    const statistics: SessionStatistics = {
      duration: Date.now(),
      totalChanges: this.performanceMetrics.totalChanges,
      acceptedChanges: 0, // TODO: Track these separately
      rejectedChanges: 0, // TODO: Track these separately
      averageResponseTime: this.performanceMetrics.averageResponseTime,
      memoryUsage: this.performanceMetrics.memoryUsage,
    };

    globalEventBus.emit('session-ended', { sessionId, statistics });
    return statistics;
  }

  // Private helper methods

  private generateChangeId(): string {
    return `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async detectConflicts(change: Change): Promise<ConflictInfo | null> {
    // Check for overlapping position conflicts
    const overlappingChanges = this.changeQueue.filter(existing => 
      existing.status === ChangeStatus.PENDING &&
      this.positionsOverlap(existing.position, change.position)
    );

    if (overlappingChanges.length > 0) {
      return {
        type: 'overlapping-changes',
        conflictingChangeId: overlappingChanges[0].id,
        description: 'Change overlaps with existing pending change',
        suggestedResolution: 'merge',
      };
    }

    return null;
  }

  private positionsOverlap(pos1: Change['position'], pos2: Change['position']): boolean {
    return !(pos1.end <= pos2.start || pos2.end <= pos1.start);
  }

  private async resolveConflictAutomatically(change: Change, conflict: ConflictInfo): Promise<void> {
    switch (conflict.suggestedResolution) {
      case 'merge':
        // Merge the changes - implementation would depend on specific conflict type
        console.log('Auto-merging conflicted change:', change.id);
        break;
      case 'reject-new':
        change.status = ChangeStatus.REJECTED;
        break;
      case 'reject-existing':
        if (conflict.conflictingChangeId) {
          await this.rejectChange(conflict.conflictingChangeId);
        }
        break;
      default:
        change.status = ChangeStatus.CONFLICTED;
    }
  }

  private queueForBackgroundProcessing(changes: Change[]): void {
    this.changeQueue.push(...changes);
    this.performanceMetrics.processingQueueSize += changes.length;
  }

  private async processWithThrottling(changes: Change[]): Promise<void> {
    const batchSize = 10;
    for (let i = 0; i < changes.length; i += batchSize) {
      const batch = changes.slice(i, i + batchSize);
      await this.processChangesImmediately(batch);
      await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay between batches
    }
  }

  private async processChangesImmediately(changes: Change[]): Promise<void> {
    this.changeQueue.push(...changes);
    this.performanceMetrics.totalChanges += changes.length;
    
    // Emit events for each change
    changes.forEach(change => {
      globalEventBus.emit('change-added', { change });
    });
  }

  private updatePerformanceMetrics(metric: keyof PerformanceMetrics, value: number): void {
    if (metric === 'averageResponseTime') {
      // Calculate rolling average
      this.performanceMetrics[metric] = 
        (this.performanceMetrics[metric] + value) / 2;
    } else {
      this.performanceMetrics[metric] = value;
    }

    // Check for performance warnings
    this.checkPerformanceThresholds();
  }

  private checkPerformanceThresholds(): void {
    const thresholds = {
      changeDetectionTime: 100, // 100ms
      renderingTime: 100, // 100ms
      memoryUsage: 50 * 1024 * 1024, // 50MB
      processingQueueSize: 1000,
    };

    Object.entries(thresholds).forEach(([metric, threshold]) => {
      const value = this.performanceMetrics[metric as keyof PerformanceMetrics];
      if (value > threshold) {
        globalEventBus.emit('performance-warning', { metric, value, threshold });
      }
    });
  }
}

// Export singleton instance
export const trackEditsAPI = TrackEditsPublicAPI.getInstance();

// Export for window global access
declare global {
  interface Window {
    TrackEditsAPI: TrackEditsPublicAPI;
  }
}

// Initialize global access
if (typeof window !== 'undefined') {
  window.TrackEditsAPI = trackEditsAPI;
}