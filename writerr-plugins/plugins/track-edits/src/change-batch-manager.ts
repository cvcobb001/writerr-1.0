/**
 * Change Batch Management System
 * Task 2.4: Platform Integration - Batch management and writer-centric controls
 * 
 * Provides comprehensive batch management for Editorial Engine submissions,
 * including batch status tracking, hierarchical control, and writer-centric operations.
 */

import { 
  ChangeGroupMetadata, 
  ChangeGroupingResult,
  EditorialOperationType 
} from './types/submit-changes-from-ai';
import { ChangeGroupingSystem } from './change-grouping-system';

/**
 * Batch operation result for writer interactions
 */
export interface BatchOperationResult {
  success: boolean;
  affectedGroups: string[];
  affectedChanges: string[];
  errors: string[];
  warnings: string[];
}

/**
 * Batch status update information
 */
export interface BatchStatusUpdate {
  groupId: string;
  newStatus: 'pending' | 'accepted' | 'rejected' | 'mixed';
  writerNotes?: string;
  timestamp: Date;
  changeIds?: string[]; // Specific changes if partial acceptance
}

/**
 * Batch query options for filtering and sorting
 */
export interface BatchQueryOptions {
  operationType?: EditorialOperationType;
  status?: 'pending' | 'accepted' | 'rejected' | 'mixed';
  priority?: 'high' | 'medium' | 'low';
  scope?: 'paragraph' | 'section' | 'document' | 'selection';
  sessionId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  sortBy?: 'created' | 'priority' | 'position' | 'changeCount';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Change batch manager that handles all batch-related operations
 */
export class ChangeBatchManager {
  private groupingSystem: ChangeGroupingSystem;
  private batchMetadata = new Map<string, ChangeGroupMetadata>();
  private sessionBatches = new Map<string, string[]>(); // sessionId -> groupIds
  private changeToGroup = new Map<string, string>(); // changeId -> groupId
  private batchStatusHistory = new Map<string, BatchStatusUpdate[]>();

  constructor(groupingSystem?: ChangeGroupingSystem) {
    this.groupingSystem = groupingSystem || new ChangeGroupingSystem();
  }

  /**
   * Create batches from a set of changes with automatic grouping
   */
  public createBatches(
    changes: any[], // Using any since we don't have proper EditChange import
    sessionId: string,
    operationType: EditorialOperationType,
    operationDescription?: string
  ): ChangeGroupingResult {
    const groupingResult = this.groupingSystem.groupChanges(
      changes,
      operationType,
      operationDescription
    );

    // Store batch metadata
    for (const group of groupingResult.groups) {
      this.batchMetadata.set(group.groupId, group);
      
      // Associate with session
      if (!this.sessionBatches.has(sessionId)) {
        this.sessionBatches.set(sessionId, []);
      }
      this.sessionBatches.get(sessionId)!.push(group.groupId);

      // Map changes to groups
      const groupChanges = this.getChangesForGroup(changes, group);
      for (const change of groupChanges) {
        if (change.id) {
          this.changeToGroup.set(change.id, group.groupId);
        }
      }

      // Initialize status history
      this.batchStatusHistory.set(group.groupId, [{
        groupId: group.groupId,
        newStatus: 'pending',
        timestamp: new Date()
      }]);
    }

    return groupingResult;
  }

  /**
   * Accept an entire batch of changes
   */
  public acceptBatch(
    groupId: string,
    writerNotes?: string
  ): BatchOperationResult {
    const batch = this.batchMetadata.get(groupId);
    if (!batch) {
      return {
        success: false,
        affectedGroups: [],
        affectedChanges: [],
        errors: [`Batch ${groupId} not found`],
        warnings: []
      };
    }

    const statusUpdate: BatchStatusUpdate = {
      groupId,
      newStatus: 'accepted',
      writerNotes,
      timestamp: new Date()
    };

    this.updateBatchStatus(groupId, statusUpdate);

    // Also accept any child groups
    const childGroups: string[] = [];
    if (batch.childGroupIds) {
      for (const childId of batch.childGroupIds) {
        const childResult = this.acceptBatch(childId, `Accepted with parent batch`);
        childGroups.push(...childResult.affectedGroups);
      }
    }

    const affectedChanges = this.getChangeIdsForGroup(groupId);

    return {
      success: true,
      affectedGroups: [groupId, ...childGroups],
      affectedChanges,
      errors: [],
      warnings: []
    };
  }

  /**
   * Reject an entire batch of changes
   */
  public rejectBatch(
    groupId: string,
    writerNotes?: string
  ): BatchOperationResult {
    const batch = this.batchMetadata.get(groupId);
    if (!batch) {
      return {
        success: false,
        affectedGroups: [],
        affectedChanges: [],
        errors: [`Batch ${groupId} not found`],
        warnings: []
      };
    }

    const statusUpdate: BatchStatusUpdate = {
      groupId,
      newStatus: 'rejected',
      writerNotes,
      timestamp: new Date()
    };

    this.updateBatchStatus(groupId, statusUpdate);

    // Also reject any child groups
    const childGroups: string[] = [];
    if (batch.childGroupIds) {
      for (const childId of batch.childGroupIds) {
        const childResult = this.rejectBatch(childId, `Rejected with parent batch`);
        childGroups.push(...childResult.affectedGroups);
      }
    }

    const affectedChanges = this.getChangeIdsForGroup(groupId);

    return {
      success: true,
      affectedGroups: [groupId, ...childGroups],
      affectedChanges,
      errors: [],
      warnings: []
    };
  }

  /**
   * Partially accept/reject specific changes within a batch
   */
  public partiallyProcessBatch(
    groupId: string,
    acceptedChangeIds: string[],
    rejectedChangeIds: string[],
    writerNotes?: string
  ): BatchOperationResult {
    const batch = this.batchMetadata.get(groupId);
    if (!batch) {
      return {
        success: false,
        affectedGroups: [],
        affectedChanges: [],
        errors: [`Batch ${groupId} not found`],
        warnings: []
      };
    }

    const allChangeIds = this.getChangeIdsForGroup(groupId);
    const processedIds = [...acceptedChangeIds, ...rejectedChangeIds];
    const unprocessedIds = allChangeIds.filter(id => !processedIds.includes(id));

    let newStatus: 'pending' | 'accepted' | 'rejected' | 'mixed';
    if (acceptedChangeIds.length === allChangeIds.length) {
      newStatus = 'accepted';
    } else if (rejectedChangeIds.length === allChangeIds.length) {
      newStatus = 'rejected';
    } else if (processedIds.length === allChangeIds.length) {
      newStatus = 'mixed';
    } else {
      newStatus = 'mixed'; // Some changes still pending
    }

    const statusUpdate: BatchStatusUpdate = {
      groupId,
      newStatus,
      writerNotes,
      timestamp: new Date(),
      changeIds: processedIds
    };

    this.updateBatchStatus(groupId, statusUpdate);

    return {
      success: true,
      affectedGroups: [groupId],
      affectedChanges: processedIds,
      errors: [],
      warnings: unprocessedIds.length > 0 ? 
        [`${unprocessedIds.length} changes in batch remain unprocessed`] : []
    };
  }

  /**
   * Query batches with filtering and sorting
   */
  public queryBatches(
    sessionId?: string,
    options: BatchQueryOptions = {}
  ): ChangeGroupMetadata[] {
    let batches: ChangeGroupMetadata[];

    if (sessionId) {
      const sessionGroupIds = this.sessionBatches.get(sessionId) || [];
      batches = sessionGroupIds
        .map(id => this.batchMetadata.get(id))
        .filter((batch): batch is ChangeGroupMetadata => batch !== undefined);
    } else {
      batches = Array.from(this.batchMetadata.values());
    }

    // Apply filters
    if (options.operationType) {
      batches = batches.filter(b => b.operationType === options.operationType);
    }
    if (options.status) {
      batches = batches.filter(b => b.status === options.status);
    }
    if (options.priority) {
      batches = batches.filter(b => b.priority === options.priority);
    }
    if (options.scope) {
      batches = batches.filter(b => b.scope === options.scope);
    }
    if (options.dateRange) {
      batches = batches.filter(b => 
        b.createdAt >= options.dateRange!.start && 
        b.createdAt <= options.dateRange!.end
      );
    }

    // Apply sorting
    const sortBy = options.sortBy || 'created';
    const sortOrder = options.sortOrder || 'desc';

    batches.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'created':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case 'position':
          comparison = a.positionRange.start - b.positionRange.start;
          break;
        case 'changeCount':
          comparison = a.changeCount - b.changeCount;
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return batches;
  }

  /**
   * Get batch metadata by ID
   */
  public getBatch(groupId: string): ChangeGroupMetadata | undefined {
    return this.batchMetadata.get(groupId);
  }

  /**
   * Get batch status history
   */
  public getBatchStatusHistory(groupId: string): BatchStatusUpdate[] {
    return this.batchStatusHistory.get(groupId) || [];
  }

  /**
   * Get all batches for a session
   */
  public getSessionBatches(sessionId: string): ChangeGroupMetadata[] {
    const groupIds = this.sessionBatches.get(sessionId) || [];
    return groupIds
      .map(id => this.batchMetadata.get(id))
      .filter((batch): batch is ChangeGroupMetadata => batch !== undefined);
  }

  /**
   * Get batch statistics for a session
   */
  public getSessionBatchStatistics(sessionId: string): {
    totalBatches: number;
    pendingBatches: number;
    acceptedBatches: number;
    rejectedBatches: number;
    mixedBatches: number;
    totalChanges: number;
    averageBatchSize: number;
  } {
    const batches = this.getSessionBatches(sessionId);
    
    const stats = {
      totalBatches: batches.length,
      pendingBatches: 0,
      acceptedBatches: 0,
      rejectedBatches: 0,
      mixedBatches: 0,
      totalChanges: 0,
      averageBatchSize: 0
    };

    for (const batch of batches) {
      stats.totalChanges += batch.changeCount;
      
      switch (batch.status) {
        case 'pending':
          stats.pendingBatches++;
          break;
        case 'accepted':
          stats.acceptedBatches++;
          break;
        case 'rejected':
          stats.rejectedBatches++;
          break;
        case 'mixed':
          stats.mixedBatches++;
          break;
      }
    }

    stats.averageBatchSize = stats.totalBatches > 0 ? stats.totalChanges / stats.totalBatches : 0;

    return stats;
  }

  /**
   * Update batch metadata
   */
  public updateBatchMetadata(
    groupId: string,
    updates: Partial<ChangeGroupMetadata>
  ): boolean {
    const batch = this.batchMetadata.get(groupId);
    if (!batch) return false;

    Object.assign(batch, updates);
    this.batchMetadata.set(groupId, batch);
    return true;
  }

  /**
   * Delete a batch (and its history)
   */
  public deleteBatch(groupId: string): boolean {
    const batch = this.batchMetadata.get(groupId);
    if (!batch) return false;

    // Remove from session tracking
    for (const [sessionId, groupIds] of this.sessionBatches.entries()) {
      const index = groupIds.indexOf(groupId);
      if (index >= 0) {
        groupIds.splice(index, 1);
        if (groupIds.length === 0) {
          this.sessionBatches.delete(sessionId);
        }
        break;
      }
    }

    // Remove change mappings
    for (const [changeId, mappedGroupId] of this.changeToGroup.entries()) {
      if (mappedGroupId === groupId) {
        this.changeToGroup.delete(changeId);
      }
    }

    // Remove metadata and history
    this.batchMetadata.delete(groupId);
    this.batchStatusHistory.delete(groupId);

    // Handle child groups
    if (batch.childGroupIds) {
      for (const childId of batch.childGroupIds) {
        this.deleteBatch(childId);
      }
    }

    return true;
  }

  /**
   * Get group ID for a specific change
   */
  public getGroupForChange(changeId: string): string | undefined {
    return this.changeToGroup.get(changeId);
  }

  /**
   * Clear all batch data for a session
   */
  public clearSessionBatches(sessionId: string): void {
    const groupIds = this.sessionBatches.get(sessionId) || [];
    for (const groupId of groupIds) {
      this.deleteBatch(groupId);
    }
    this.sessionBatches.delete(sessionId);
  }

  /**
   * Export batch data for persistence
   */
  public exportBatchData(): {
    metadata: [string, ChangeGroupMetadata][];
    sessionBatches: [string, string[]][];
    changeToGroup: [string, string][];
    statusHistory: [string, BatchStatusUpdate[]][];
  } {
    return {
      metadata: Array.from(this.batchMetadata.entries()),
      sessionBatches: Array.from(this.sessionBatches.entries()),
      changeToGroup: Array.from(this.changeToGroup.entries()),
      statusHistory: Array.from(this.batchStatusHistory.entries())
    };
  }

  /**
   * Import batch data from persistence
   */
  public importBatchData(data: {
    metadata: [string, ChangeGroupMetadata][];
    sessionBatches: [string, string[]][];
    changeToGroup: [string, string][];
    statusHistory: [string, BatchStatusUpdate[]][];
  }): void {
    this.batchMetadata = new Map(data.metadata);
    this.sessionBatches = new Map(data.sessionBatches);
    this.changeToGroup = new Map(data.changeToGroup);
    this.batchStatusHistory = new Map(data.statusHistory);
  }

  /**
   * Private helper methods
   */
  private updateBatchStatus(groupId: string, statusUpdate: BatchStatusUpdate): void {
    const batch = this.batchMetadata.get(groupId);
    if (batch) {
      batch.status = statusUpdate.newStatus;
      if (statusUpdate.writerNotes) {
        batch.writerNotes = statusUpdate.writerNotes;
      }
    }

    const history = this.batchStatusHistory.get(groupId) || [];
    history.push(statusUpdate);
    this.batchStatusHistory.set(groupId, history);
  }

  private getChangesForGroup(changes: any[], group: ChangeGroupMetadata): any[] {
    // Simple implementation - in a real system this would use proper change tracking
    return changes.filter(change => 
      change.from >= group.positionRange.start && 
      change.to <= group.positionRange.end
    );
  }

  private getChangeIdsForGroup(groupId: string): string[] {
    const changeIds: string[] = [];
    for (const [changeId, mappedGroupId] of this.changeToGroup.entries()) {
      if (mappedGroupId === groupId) {
        changeIds.push(changeId);
      }
    }
    return changeIds;
  }
}

/**
 * Convenience factory for creating batch managers with preset configurations
 */
export class BatchManagerFactory {
  static createForEditorialWorkflow(
    operationType: EditorialOperationType
  ): ChangeBatchManager {
    let groupingSystem: ChangeGroupingSystem;

    switch (operationType) {
      case 'proofreading':
        groupingSystem = new ChangeGroupingSystem({
          defaultStrategy: 'proximity',
          maxChangesPerGroup: 50,
          proximityThreshold: 150,
          minChangesForGroup: 3
        });
        break;
      
      case 'copy-edit-pass':
        groupingSystem = new ChangeGroupingSystem({
          defaultStrategy: 'mixed',
          maxChangesPerGroup: 30,
          proximityThreshold: 200,
          minChangesForGroup: 2,
          enableHierarchicalGrouping: true
        });
        break;
      
      case 'developmental-feedback':
        groupingSystem = new ChangeGroupingSystem({
          defaultStrategy: 'semantic',
          maxChangesPerGroup: 15,
          proximityThreshold: 500,
          minChangesForGroup: 2,
          enableHierarchicalGrouping: true
        });
        break;
      
      default:
        groupingSystem = new ChangeGroupingSystem();
    }

    return new ChangeBatchManager(groupingSystem);
  }
}