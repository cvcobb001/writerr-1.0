import { Change, ChangeStatus } from '../types';
import { ClusterData } from '../clustering/types';

export interface BatchConfig {
  maxBatchSize: number;
  minBatchSize: number;
  confidenceThreshold: number;
  timeoutMs: number;
  autoSubmit: boolean;
  submitOnThresholdReach: boolean;
  prioritizeHighConfidence: boolean;
}

export interface BatchOperation {
  id: string;
  type: BatchOperationType;
  changes: Change[];
  clusters?: ClusterData[];
  status: BatchStatus;
  createdAt: number;
  submittedAt?: number;
  completedAt?: number;
  error?: string;
  metadata?: {
    reason: string;
    userInitiated: boolean;
    confidence: number;
  };
}

export enum BatchOperationType {
  ACCEPT_ALL = 'accept_all',
  REJECT_ALL = 'reject_all',
  ACCEPT_CLUSTER = 'accept_cluster',
  REJECT_CLUSTER = 'reject_cluster',
  MERGE_CLUSTERS = 'merge_clusters',
  SPLIT_CLUSTER = 'split_cluster',
  BULK_CATEGORIZE = 'bulk_categorize',
  BULK_CONFIDENCE_UPDATE = 'bulk_confidence_update'
}

export enum BatchStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface BatchSubmissionResult {
  batchId: string;
  success: boolean;
  processedCount: number;
  failedCount: number;
  errors: Array<{
    changeId: string;
    error: string;
  }>;
  duration: number;
}

export interface BatchProcessor {
  submitBatch(operation: BatchOperation): Promise<BatchSubmissionResult>;
  cancelBatch(batchId: string): Promise<boolean>;
  getBatchStatus(batchId: string): BatchStatus;
  getActiveBatches(): BatchOperation[];
}

export interface BatchQueue {
  id: string;
  batches: BatchOperation[];
  maxConcurrentBatches: number;
  processingOrder: 'fifo' | 'priority' | 'confidence';
  createdAt: number;
}

export interface BatchThresholds {
  changeCount: number;
  confidenceSum: number;
  timeWindowMs: number;
  clusterCount: number;
}

export interface BatchMetrics {
  totalBatches: number;
  completedBatches: number;
  failedBatches: number;
  averageProcessingTime: number;
  averageBatchSize: number;
  successRate: number;
  throughput: number; // batches per minute
}

export interface BulkOperationOptions {
  dryRun?: boolean;
  stopOnError?: boolean;
  maxParallelOperations?: number;
  progressCallback?: (progress: BulkProgress) => void;
  validationCallback?: (change: Change) => boolean;
}

export interface BulkProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  percentage: number;
  estimatedRemainingMs?: number;
}