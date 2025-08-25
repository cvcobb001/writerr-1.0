/**
 * @fileoverview State management types for Track Edits plugin
 */

import { Change, ChangeCluster, TrackingSession } from '../types';

export interface DocumentState {
  id: string;
  filePath: string;
  lastModified: number;
  version: number;
  changes: Map<string, Change>;
  clusters: Map<string, ChangeCluster>;
  sessions: Map<string, TrackingSession>;
  metadata: DocumentMetadata;
  snapshots: DocumentSnapshot[];
}

export interface DocumentMetadata {
  wordCount: number;
  totalChanges: number;
  lastSaved: number;
  compressionLevel: number;
  checksum: string;
  tags?: string[];
  userId?: string;
}

export interface DocumentSnapshot {
  id: string;
  timestamp: number;
  version: number;
  content: string;
  changeIds: string[];
  compressed: boolean;
  size: number;
  description?: string;
}

export interface StateConfig {
  maxSnapshots: number;
  snapshotInterval: number;
  compressionThreshold: number;
  maxMemoryUsage: number;
  autosaveInterval: number;
  enableCrashRecovery: boolean;
  enableCompression: boolean;
  enableAuditTrail: boolean;
}

export interface StateMetrics {
  totalDocuments: number;
  totalChanges: number;
  memoryUsage: number;
  storageUsage: number;
  lastCleanup: number;
  crashRecoveryCount: number;
  compressionRatio: number;
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  action: AuditAction;
  documentId: string;
  changeId?: string;
  sessionId?: string;
  userId?: string;
  metadata: Record<string, any>;
  success: boolean;
  error?: string;
}

export enum AuditAction {
  DOCUMENT_CREATED = 'document_created',
  DOCUMENT_DELETED = 'document_deleted',
  DOCUMENT_SAVED = 'document_saved',
  CHANGE_ADDED = 'change_added',
  CHANGE_ACCEPTED = 'change_accepted',
  CHANGE_REJECTED = 'change_rejected',
  CHANGE_MODIFIED = 'change_modified',
  SESSION_STARTED = 'session_started',
  SESSION_ENDED = 'session_ended',
  SNAPSHOT_CREATED = 'snapshot_created',
  SNAPSHOT_RESTORED = 'snapshot_restored',
  STATE_COMPRESSED = 'state_compressed',
  CRASH_RECOVERY = 'crash_recovery',
  CLEANUP_PERFORMED = 'cleanup_performed'
}

export interface StateEvent {
  type: StateEventType;
  documentId?: string;
  changeId?: string;
  sessionId?: string;
  timestamp: number;
  data: any;
}

export enum StateEventType {
  DOCUMENT_STATE_CHANGED = 'document_state_changed',
  CHANGE_ADDED = 'change_added',
  CHANGE_UPDATED = 'change_updated',
  CHANGE_REMOVED = 'change_removed',
  SESSION_STARTED = 'session_started',
  SESSION_ENDED = 'session_ended',
  SNAPSHOT_CREATED = 'snapshot_created',
  MEMORY_WARNING = 'memory_warning',
  CRASH_DETECTED = 'crash_detected',
  RECOVERY_COMPLETED = 'recovery_completed'
}

export interface MemoryProfileInfo {
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  timestamp: number;
  documentCount: number;
  changeCount: number;
}

export interface CompressionResult {
  originalSize: number;
  compressedSize: number;
  ratio: number;
  algorithm: CompressionAlgorithm;
  timestamp: number;
}

export enum CompressionAlgorithm {
  GZIP = 'gzip',
  LZ4 = 'lz4',
  BROTLI = 'brotli',
  ZSTD = 'zstd'
}

export interface RecoveryInfo {
  timestamp: number;
  documentsRecovered: number;
  changesRecovered: number;
  sessionsRecovered: number;
  errors: string[];
  success: boolean;
  duration: number;
}

export interface StateBackup {
  id: string;
  timestamp: number;
  version: number;
  documents: Record<string, DocumentState>;
  auditLog: AuditLogEntry[];
  metadata: StateMetrics;
  compressed: boolean;
  checksum: string;
}

export interface StateMigration {
  from: number;
  to: number;
  migrateFn: (oldState: any) => any;
  rollbackFn?: (newState: any) => any;
  description: string;
  breaking: boolean;
}