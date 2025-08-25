/**
 * @fileoverview Session management types for Track Edits plugin
 */

import { Change, ChangeCluster, TrackingSession } from '../types';

export interface SessionConfig {
  autoSaveInterval: number;
  maxSessionDuration: number;
  enableAuditTrail: boolean;
  enableConcurrency: boolean;
  sessionTimeout: number;
  maxConcurrentSessions: number;
  enableSessionRestore: boolean;
  enableConflictResolution: boolean;
}

export interface SessionState {
  session: TrackingSession;
  isActive: boolean;
  lastActivity: number;
  changeBuffer: Change[];
  pendingOperations: SessionOperation[];
  conflictQueue: SessionConflict[];
  metadata: SessionMetadata;
}

export interface SessionMetadata {
  userId?: string;
  userAgent?: string;
  platform?: string;
  startLocation?: string;
  totalKeystrokes: number;
  totalMouseClicks: number;
  focusTime: number;
  idleTime: number;
  workingTime: number;
  breakTime: number;
  efficiency: number;
  tags: string[];
}

export interface SessionOperation {
  id: string;
  type: SessionOperationType;
  timestamp: number;
  changeId?: string;
  clusterId?: string;
  data: any;
  status: OperationStatus;
  retry: number;
  maxRetries: number;
}

export enum SessionOperationType {
  ADD_CHANGE = 'add_change',
  UPDATE_CHANGE = 'update_change',
  REMOVE_CHANGE = 'remove_change',
  ACCEPT_CHANGE = 'accept_change',
  REJECT_CHANGE = 'reject_change',
  CREATE_CLUSTER = 'create_cluster',
  UPDATE_CLUSTER = 'update_cluster',
  BATCH_OPERATION = 'batch_operation',
  SAVE_STATE = 'save_state',
  SYNC_STATE = 'sync_state'
}

export enum OperationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface SessionConflict {
  id: string;
  timestamp: number;
  type: ConflictType;
  sessionA: string;
  sessionB: string;
  changeA?: Change;
  changeB?: Change;
  resolution?: ConflictResolution;
  resolvedBy?: string;
  resolvedAt?: number;
  metadata: Record<string, any>;
}

export enum ConflictType {
  OVERLAPPING_CHANGES = 'overlapping_changes',
  CONCURRENT_EDITS = 'concurrent_edits',
  STALE_STATE = 'stale_state',
  VERSION_MISMATCH = 'version_mismatch',
  RESOURCE_LOCK = 'resource_lock'
}

export interface ConflictResolution {
  strategy: ResolutionStrategy;
  winner?: string;
  mergedChange?: Change;
  automatic: boolean;
  confidence: number;
  reasoning: string;
}

export enum ResolutionStrategy {
  PREFER_FIRST = 'prefer_first',
  PREFER_SECOND = 'prefer_second',
  PREFER_NEWER = 'prefer_newer',
  PREFER_HIGHER_CONFIDENCE = 'prefer_higher_confidence',
  MERGE_CHANGES = 'merge_changes',
  MANUAL_RESOLUTION = 'manual_resolution',
  REJECT_BOTH = 'reject_both'
}

export interface SessionSnapshot {
  id: string;
  sessionId: string;
  timestamp: number;
  changeCount: number;
  state: SessionState;
  compressed: boolean;
  size: number;
  checksum: string;
}

export interface SessionAnalytics {
  sessionId: string;
  duration: number;
  changesProcessed: number;
  changesAccepted: number;
  changesRejected: number;
  changesPending: number;
  avgProcessingTime: number;
  avgConfidence: number;
  conflictsResolved: number;
  errorCount: number;
  efficiency: number;
  productivity: number;
  focusMetrics: FocusMetrics;
  performanceMetrics: PerformanceMetrics;
}

export interface FocusMetrics {
  totalFocusTime: number;
  avgFocusSession: number;
  distractionCount: number;
  longestFocusSession: number;
  focusEfficiency: number;
}

export interface PerformanceMetrics {
  avgResponseTime: number;
  peakMemoryUsage: number;
  cpuUsage: number;
  diskIO: number;
  networkLatency: number;
  cacheHitRate: number;
}

export interface SessionEvent {
  id: string;
  sessionId: string;
  timestamp: number;
  type: SessionEventType;
  data: any;
  userId?: string;
  source: EventSource;
}

export enum SessionEventType {
  SESSION_STARTED = 'session_started',
  SESSION_ENDED = 'session_ended',
  SESSION_PAUSED = 'session_paused',
  SESSION_RESUMED = 'session_resumed',
  CHANGE_PROCESSED = 'change_processed',
  CONFLICT_DETECTED = 'conflict_detected',
  CONFLICT_RESOLVED = 'conflict_resolved',
  ERROR_OCCURRED = 'error_occurred',
  STATE_SAVED = 'state_saved',
  SNAPSHOT_CREATED = 'snapshot_created',
  PERFORMANCE_WARNING = 'performance_warning',
  FOCUS_LOST = 'focus_lost',
  FOCUS_GAINED = 'focus_gained',
  IDLE_DETECTED = 'idle_detected',
  ACTIVITY_RESUMED = 'activity_resumed'
}

export enum EventSource {
  USER_ACTION = 'user_action',
  SYSTEM_EVENT = 'system_event',
  AI_SUGGESTION = 'ai_suggestion',
  BACKGROUND_TASK = 'background_task',
  EXTERNAL_TRIGGER = 'external_trigger'
}

export interface SessionRecoveryInfo {
  sessionId: string;
  timestamp: number;
  documentId: string;
  lastKnownState: SessionState;
  recoveredChanges: number;
  lostChanges: number;
  integrityCheck: boolean;
  recoverySuccess: boolean;
  errors: string[];
}

export interface ConcurrencyControl {
  lockManager: LockManager;
  conflictResolver: ConflictResolver;
  versionManager: VersionManager;
  syncManager: SyncManager;
}

export interface LockManager {
  acquireLock(resource: string, sessionId: string, timeout?: number): Promise<Lock>;
  releaseLock(lockId: string): Promise<void>;
  isLocked(resource: string): Promise<boolean>;
  getLockHolder(resource: string): Promise<string | null>;
  listLocks(sessionId?: string): Promise<Lock[]>;
}

export interface Lock {
  id: string;
  resource: string;
  sessionId: string;
  acquired: number;
  expires: number;
  type: LockType;
}

export enum LockType {
  EXCLUSIVE = 'exclusive',
  SHARED = 'shared',
  READ = 'read',
  WRITE = 'write'
}

export interface ConflictResolver {
  detectConflicts(operations: SessionOperation[]): Promise<SessionConflict[]>;
  resolveConflict(conflict: SessionConflict): Promise<ConflictResolution>;
  mergeChanges(changeA: Change, changeB: Change): Promise<Change | null>;
  canAutoResolve(conflict: SessionConflict): boolean;
}

export interface VersionManager {
  getCurrentVersion(documentId: string): Promise<number>;
  incrementVersion(documentId: string): Promise<number>;
  compareVersions(versionA: number, versionB: number): number;
  isVersionCompatible(current: number, required: number): boolean;
}

export interface SyncManager {
  syncSession(sessionId: string): Promise<SyncResult>;
  syncAllSessions(): Promise<SyncResult[]>;
  resolveConflicts(conflicts: SessionConflict[]): Promise<ConflictResolution[]>;
  mergeStates(stateA: SessionState, stateB: SessionState): Promise<SessionState>;
}

export interface SyncResult {
  sessionId: string;
  success: boolean;
  conflictsFound: number;
  conflictsResolved: number;
  changesApplied: number;
  errors: string[];
  timestamp: number;
}

export interface SessionStatistics {
  totalSessions: number;
  activeSessions: number;
  avgSessionDuration: number;
  totalChangesProcessed: number;
  avgChangesPerSession: number;
  conflictRate: number;
  autoResolutionRate: number;
  errorRate: number;
  performanceMetrics: PerformanceMetrics;
  efficiency: number;
}