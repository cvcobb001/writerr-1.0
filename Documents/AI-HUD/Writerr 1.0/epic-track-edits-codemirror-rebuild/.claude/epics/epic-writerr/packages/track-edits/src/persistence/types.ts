/**
 * @fileoverview Persistence layer types for Track Edits plugin
 */

import { DocumentState, AuditLogEntry, StateBackup, CompressionResult } from '../state/types';

export interface PersistenceConfig {
  dataPath: string;
  backupPath: string;
  maxBackups: number;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  syncEnabled: boolean;
  chunkSize: number;
  batchSize: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface StorageAdapter {
  read(key: string): Promise<string | null>;
  write(key: string, data: string): Promise<void>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  list(prefix?: string): Promise<string[]>;
  size(key: string): Promise<number>;
  clear(): Promise<void>;
}

export interface PersistenceMetadata {
  version: number;
  timestamp: number;
  documentId: string;
  size: number;
  compressed: boolean;
  encrypted: boolean;
  checksum: string;
  chunks?: number;
}

export interface DataChunk {
  id: string;
  index: number;
  total: number;
  data: string;
  checksum: string;
}

export interface SerializedDocumentState {
  metadata: PersistenceMetadata;
  changes: Array<[string, any]>; // Serialized Map entries
  clusters: Array<[string, any]>; // Serialized Map entries
  sessions: Array<[string, any]>; // Serialized Map entries
  snapshots: any[];
  documentMetadata: any;
}

export interface PersistenceTransaction {
  id: string;
  timestamp: number;
  operations: PersistenceOperation[];
  status: TransactionStatus;
  rollbackData?: Record<string, any>;
}

export interface PersistenceOperation {
  type: OperationType;
  key: string;
  data?: string;
  oldData?: string;
  metadata?: PersistenceMetadata;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  BACKUP = 'backup',
  RESTORE = 'restore'
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMMITTED = 'committed',
  ROLLED_BACK = 'rolled_back',
  FAILED = 'failed'
}

export interface RecoveryManifest {
  timestamp: number;
  documents: string[];
  transactions: string[];
  backups: string[];
  lastKnownGood: number;
  corruption: CorruptionInfo[];
}

export interface CorruptionInfo {
  documentId: string;
  type: CorruptionType;
  severity: CorruptionSeverity;
  description: string;
  recoverable: boolean;
  backupAvailable: boolean;
}

export enum CorruptionType {
  CHECKSUM_MISMATCH = 'checksum_mismatch',
  INVALID_JSON = 'invalid_json',
  MISSING_CHUNKS = 'missing_chunks',
  VERSION_CONFLICT = 'version_conflict',
  TRUNCATED_DATA = 'truncated_data'
}

export enum CorruptionSeverity {
  MINOR = 'minor',
  MODERATE = 'moderate',
  CRITICAL = 'critical'
}

export interface SyncConflict {
  documentId: string;
  localVersion: number;
  remoteVersion: number;
  localTimestamp: number;
  remoteTimestamp: number;
  conflictType: ConflictType;
  resolution?: ConflictResolution;
}

export enum ConflictType {
  CONCURRENT_EDIT = 'concurrent_edit',
  VERSION_DIVERGENCE = 'version_divergence',
  MERGE_CONFLICT = 'merge_conflict'
}

export enum ConflictResolution {
  PREFER_LOCAL = 'prefer_local',
  PREFER_REMOTE = 'prefer_remote',
  MANUAL_MERGE = 'manual_merge',
  CREATE_BRANCH = 'create_branch'
}

export interface CompressionOptions {
  algorithm: 'gzip' | 'lz4' | 'brotli' | 'zstd';
  level: number;
  threshold: number;
  chunkSize?: number;
}

export interface EncryptionOptions {
  algorithm: 'aes-256-gcm' | 'aes-256-cbc';
  keyDerivation: 'pbkdf2' | 'scrypt';
  iterations: number;
  salt?: string;
}

export interface BackupStrategy {
  type: 'full' | 'incremental' | 'differential';
  interval: number;
  retention: number;
  compression: boolean;
  encryption: boolean;
  verification: boolean;
}

export interface RestoreOptions {
  timestamp?: number;
  version?: number;
  documentIds?: string[];
  includeMetadata: boolean;
  includeAuditLog: boolean;
  validateIntegrity: boolean;
  skipCorrupted: boolean;
}

export interface PersistenceHealth {
  healthy: boolean;
  lastCheck: number;
  issues: HealthIssue[];
  metrics: HealthMetrics;
  recommendations: string[];
}

export interface HealthIssue {
  id: string;
  type: IssueType;
  severity: IssueSeverity;
  description: string;
  impact: string;
  suggestion: string;
  autoFixable: boolean;
}

export enum IssueType {
  STORAGE_FULL = 'storage_full',
  CORRUPTION_DETECTED = 'corruption_detected',
  BACKUP_FAILED = 'backup_failed',
  SLOW_PERFORMANCE = 'slow_performance',
  SYNC_CONFLICT = 'sync_conflict',
  MISSING_DATA = 'missing_data'
}

export enum IssueSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface HealthMetrics {
  storageUsed: number;
  storageAvailable: number;
  averageWriteTime: number;
  averageReadTime: number;
  errorRate: number;
  corruptionRate: number;
  backupSuccessRate: number;
  lastBackupTime: number;
}