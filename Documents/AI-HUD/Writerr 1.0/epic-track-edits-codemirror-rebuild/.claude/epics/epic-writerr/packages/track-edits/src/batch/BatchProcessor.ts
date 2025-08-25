import { Change, ChangeStatus } from '../types';
import { ClusterData } from '../clustering/types';
import {
  BatchConfig,
  BatchOperation,
  BatchOperationType,
  BatchStatus,
  BatchSubmissionResult,
  BatchProcessor as IBatchProcessor,
  BatchQueue,
  BatchThresholds,
  BatchMetrics,
  BulkOperationOptions,
  BulkProgress
} from './types';

export class BatchProcessor implements IBatchProcessor {
  private config: BatchConfig;
  private activeQueues: Map<string, BatchQueue> = new Map();
  private activeBatches: Map<string, BatchOperation> = new Map();
  private processingBatches: Set<string> = new Set();
  private metrics: BatchMetrics = {
    totalBatches: 0,
    completedBatches: 0,
    failedBatches: 0,
    averageProcessingTime: 0,
    averageBatchSize: 0,
    successRate: 0,
    throughput: 0
  };
  private processingTimes: number[] = [];
  private lastMetricsUpdate = Date.now();

  constructor(config: BatchConfig) {
    this.config = config;
    this.initializeDefaultQueue();
  }

  public async submitBatch(operation: BatchOperation): Promise<BatchSubmissionResult> {
    const startTime = Date.now();
    
    try {
      // Validate batch operation
      this.validateBatchOperation(operation);
      
      // Add to active batches
      operation.status = BatchStatus.QUEUED;
      operation.submittedAt = startTime;
      this.activeBatches.set(operation.id, operation);
      
      // Add to appropriate queue
      const queueId = this.selectQueue(operation);
      const queue = this.activeQueues.get(queueId);
      if (queue) {
        queue.batches.push(operation);
      }

      // Process batch
      const result = await this.processBatch(operation);
      
      // Update metrics
      this.updateMetrics(operation, result, Date.now() - startTime);
      
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      operation.status = BatchStatus.FAILED;
      operation.error = errorMessage;
      operation.completedAt = Date.now();

      this.metrics.failedBatches++;
      this.updateSuccessRate();

      return {
        batchId: operation.id,
        success: false,
        processedCount: 0,
        failedCount: operation.changes.length,
        errors: operation.changes.map(change => ({
          changeId: change.id,
          error: errorMessage
        })),
        duration: Date.now() - startTime
      };
    }
  }

  public async cancelBatch(batchId: string): Promise<boolean> {
    const batch = this.activeBatches.get(batchId);
    if (!batch) {
      return false;
    }

    if (this.processingBatches.has(batchId)) {
      // Cannot cancel a batch that's currently being processed
      return false;
    }

    batch.status = BatchStatus.CANCELLED;
    batch.completedAt = Date.now();
    
    // Remove from queues
    for (const queue of this.activeQueues.values()) {
      const index = queue.batches.findIndex(b => b.id === batchId);
      if (index !== -1) {
        queue.batches.splice(index, 1);
        break;
      }
    }

    this.activeBatches.delete(batchId);
    return true;
  }

  public getBatchStatus(batchId: string): BatchStatus {
    const batch = this.activeBatches.get(batchId);
    return batch?.status || BatchStatus.FAILED;
  }

  public getActiveBatches(): BatchOperation[] {
    return Array.from(this.activeBatches.values());
  }

  public async processBulkOperation(
    changes: Change[],
    operation: BatchOperationType,
    options: BulkOperationOptions = {}
  ): Promise<BatchSubmissionResult> {
    const batchId = this.generateBatchId();
    const batch: BatchOperation = {
      id: batchId,
      type: operation,
      changes,
      status: BatchStatus.PENDING,
      createdAt: Date.now(),
      metadata: {
        reason: 'Bulk operation',
        userInitiated: true,
        confidence: this.calculateAverageConfidence(changes)
      }
    };

    if (options.dryRun) {
      return this.simulateBatchOperation(batch, options);
    }

    return this.submitBatch(batch);
  }

  public async processClusterBatch(
    clusters: ClusterData[],
    operation: BatchOperationType,
    options: BulkOperationOptions = {}
  ): Promise<BatchSubmissionResult> {
    const allChanges = clusters.flatMap(cluster => cluster.changes);
    const batchId = this.generateBatchId();
    
    const batch: BatchOperation = {
      id: batchId,
      type: operation,
      changes: allChanges,
      clusters,
      status: BatchStatus.PENDING,
      createdAt: Date.now(),
      metadata: {
        reason: 'Cluster batch operation',
        userInitiated: true,
        confidence: this.calculateAverageConfidence(allChanges)
      }
    };

    if (options.dryRun) {
      return this.simulateBatchOperation(batch, options);
    }

    return this.submitBatch(batch);
  }

  public checkThresholds(
    changes: Change[], 
    thresholds: BatchThresholds
  ): { shouldTrigger: boolean; reason: string } {
    // Check change count threshold
    if (changes.length >= thresholds.changeCount) {
      return {
        shouldTrigger: true,
        reason: `Change count threshold reached (${changes.length}/${thresholds.changeCount})`
      };
    }

    // Check confidence sum threshold
    const confidenceSum = changes.reduce((sum, change) => sum + change.confidence, 0);
    if (confidenceSum >= thresholds.confidenceSum) {
      return {
        shouldTrigger: true,
        reason: `Confidence sum threshold reached (${confidenceSum.toFixed(2)}/${thresholds.confidenceSum})`
      };
    }

    // Check time window threshold
    const oldestChange = Math.min(...changes.map(c => c.timestamp));
    const timeElapsed = Date.now() - oldestChange;
    if (timeElapsed >= thresholds.timeWindowMs) {
      return {
        shouldTrigger: true,
        reason: `Time window threshold reached (${Math.floor(timeElapsed / 1000)}s/${Math.floor(thresholds.timeWindowMs / 1000)}s)`
      };
    }

    return {
      shouldTrigger: false,
      reason: 'No thresholds reached'
    };
  }

  public getMetrics(): BatchMetrics {
    this.updateThroughput();
    return { ...this.metrics };
  }

  private async processBatch(operation: BatchOperation): Promise<BatchSubmissionResult> {
    operation.status = BatchStatus.PROCESSING;
    this.processingBatches.add(operation.id);

    const startTime = Date.now();
    const results: Array<{ changeId: string; success: boolean; error?: string }> = [];

    try {
      // Process changes based on operation type
      for (let i = 0; i < operation.changes.length; i++) {
        const change = operation.changes[i];
        
        try {
          await this.processIndividualChange(change, operation.type);
          results.push({ changeId: change.id, success: true });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.push({ 
            changeId: change.id, 
            success: false, 
            error: errorMessage 
          });
        }

        // Add small delay to prevent overwhelming the system
        if (i < operation.changes.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      // Update operation status
      const successCount = results.filter(r => r.success).length;
      const failedCount = results.length - successCount;
      
      operation.status = failedCount === 0 ? BatchStatus.COMPLETED : BatchStatus.FAILED;
      operation.completedAt = Date.now();

      return {
        batchId: operation.id,
        success: failedCount === 0,
        processedCount: successCount,
        failedCount,
        errors: results.filter(r => !r.success).map(r => ({
          changeId: r.changeId,
          error: r.error || 'Unknown error'
        })),
        duration: Date.now() - startTime
      };

    } finally {
      this.processingBatches.delete(operation.id);
    }
  }

  private async processIndividualChange(
    change: Change, 
    operationType: BatchOperationType
  ): Promise<void> {
    switch (operationType) {
      case BatchOperationType.ACCEPT_ALL:
      case BatchOperationType.ACCEPT_CLUSTER:
        change.status = ChangeStatus.ACCEPTED;
        break;
        
      case BatchOperationType.REJECT_ALL:
      case BatchOperationType.REJECT_CLUSTER:
        change.status = ChangeStatus.REJECTED;
        break;
        
      case BatchOperationType.BULK_CONFIDENCE_UPDATE:
        // This would require additional parameters - simplified for now
        break;
        
      default:
        throw new Error(`Unsupported operation type: ${operationType}`);
    }

    // In a real implementation, this would integrate with the document editor
    // to apply/reject the actual changes
    await this.applyChangeToDocument(change);
  }

  private async applyChangeToDocument(change: Change): Promise<void> {
    // This is a placeholder for actual document integration
    // In practice, this would use Obsidian's Editor API
    return new Promise(resolve => setTimeout(resolve, 5));
  }

  private async simulateBatchOperation(
    batch: BatchOperation,
    options: BulkOperationOptions
  ): Promise<BatchSubmissionResult> {
    const results: Array<{ changeId: string; success: boolean; error?: string }> = [];
    
    for (const change of batch.changes) {
      // Validate if callback provided
      if (options.validationCallback && !options.validationCallback(change)) {
        results.push({
          changeId: change.id,
          success: false,
          error: 'Failed validation callback'
        });
        continue;
      }

      // Simulate processing
      results.push({ changeId: change.id, success: true });
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.length - successCount;

    return {
      batchId: batch.id,
      success: failedCount === 0,
      processedCount: successCount,
      failedCount,
      errors: results.filter(r => !r.success).map(r => ({
        changeId: r.changeId,
        error: r.error || 'Unknown error'
      })),
      duration: 0 // Simulated operations are instant
    };
  }

  private validateBatchOperation(operation: BatchOperation): void {
    if (!operation.changes || operation.changes.length === 0) {
      throw new Error('Batch operation must contain at least one change');
    }

    if (operation.changes.length > this.config.maxBatchSize) {
      throw new Error(`Batch size (${operation.changes.length}) exceeds maximum (${this.config.maxBatchSize})`);
    }

    if (operation.changes.length < this.config.minBatchSize) {
      throw new Error(`Batch size (${operation.changes.length}) is below minimum (${this.config.minBatchSize})`);
    }

    // Validate confidence threshold if configured
    if (this.config.confidenceThreshold > 0) {
      const avgConfidence = this.calculateAverageConfidence(operation.changes);
      if (avgConfidence < this.config.confidenceThreshold) {
        throw new Error(`Average confidence (${avgConfidence.toFixed(2)}) below threshold (${this.config.confidenceThreshold})`);
      }
    }
  }

  private calculateAverageConfidence(changes: Change[]): number {
    if (changes.length === 0) return 0;
    return changes.reduce((sum, change) => sum + change.confidence, 0) / changes.length;
  }

  private selectQueue(operation: BatchOperation): string {
    // For now, use default queue - could implement priority-based selection
    return 'default';
  }

  private initializeDefaultQueue(): void {
    const defaultQueue: BatchQueue = {
      id: 'default',
      batches: [],
      maxConcurrentBatches: 3,
      processingOrder: 'fifo',
      createdAt: Date.now()
    };
    
    this.activeQueues.set('default', defaultQueue);
  }

  private generateBatchId(): string {
    return `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateMetrics(
    operation: BatchOperation, 
    result: BatchSubmissionResult, 
    processingTime: number
  ): void {
    this.metrics.totalBatches++;
    
    if (result.success) {
      this.metrics.completedBatches++;
    } else {
      this.metrics.failedBatches++;
    }

    // Update processing times
    this.processingTimes.push(processingTime);
    if (this.processingTimes.length > 100) {
      this.processingTimes = this.processingTimes.slice(-100); // Keep last 100
    }

    this.metrics.averageProcessingTime = 
      this.processingTimes.reduce((sum, time) => sum + time, 0) / this.processingTimes.length;

    // Update average batch size
    const totalChanges = Array.from(this.activeBatches.values())
      .reduce((sum, batch) => sum + batch.changes.length, 0);
    this.metrics.averageBatchSize = 
      this.metrics.totalBatches > 0 ? totalChanges / this.metrics.totalBatches : 0;

    this.updateSuccessRate();
  }

  private updateSuccessRate(): void {
    this.metrics.successRate = this.metrics.totalBatches > 0 
      ? this.metrics.completedBatches / this.metrics.totalBatches 
      : 0;
  }

  private updateThroughput(): void {
    const now = Date.now();
    const timeElapsedMinutes = (now - this.lastMetricsUpdate) / (1000 * 60);
    
    if (timeElapsedMinutes > 0) {
      const batchesInPeriod = this.metrics.completedBatches; // Simplified
      this.metrics.throughput = batchesInPeriod / timeElapsedMinutes;
    }
  }

  public updateConfig(newConfig: Partial<BatchConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public dispose(): void {
    // Cancel all active batches
    const activeBatchIds = Array.from(this.activeBatches.keys());
    for (const batchId of activeBatchIds) {
      this.cancelBatch(batchId);
    }

    this.activeQueues.clear();
    this.activeBatches.clear();
    this.processingBatches.clear();
  }
}