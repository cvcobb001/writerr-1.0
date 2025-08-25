/**
 * @fileoverview Session manager for Track Edits plugin
 */

import { TrackingSession, Change, ChangeCluster } from '../types';
import {
  SessionConfig,
  SessionState,
  SessionOperation,
  SessionOperationType,
  OperationStatus,
  SessionConflict,
  ConflictType,
  SessionSnapshot,
  SessionAnalytics,
  SessionEvent,
  SessionEventType,
  EventSource,
  SessionRecoveryInfo
} from './types';
import { EventEmitter } from 'events';

export class SessionManager extends EventEmitter {
  private sessions = new Map<string, SessionState>();
  private config: SessionConfig;
  private activeSessionId: string | null = null;
  private autoSaveTimer: NodeJS.Timer | null = null;
  private activityTimer: NodeJS.Timer | null = null;
  private sessionAnalytics = new Map<string, SessionAnalytics>();

  constructor(config: Partial<SessionConfig> = {}) {
    super();
    
    this.config = {
      autoSaveInterval: 30000, // 30 seconds
      maxSessionDuration: 8 * 60 * 60 * 1000, // 8 hours
      enableAuditTrail: true,
      enableConcurrency: true,
      sessionTimeout: 30 * 60 * 1000, // 30 minutes
      maxConcurrentSessions: 5,
      enableSessionRestore: true,
      enableConflictResolution: true,
      ...config
    };

    this.startActivityMonitoring();
    this.startAutoSave();
  }

  /**
   * Start a new tracking session
   */
  async startSession(documentId: string, userId?: string): Promise<TrackingSession> {
    // Check concurrent session limit
    const activeSessions = Array.from(this.sessions.values()).filter(s => s.isActive).length;
    if (activeSessions >= this.config.maxConcurrentSessions) {
      throw new Error('Maximum concurrent sessions reached');
    }

    const sessionId = this.generateSessionId();
    const session: TrackingSession = {
      id: sessionId,
      documentId,
      startTime: Date.now(),
      changes: [],
      clusters: [],
      statistics: {
        totalChanges: 0,
        acceptedChanges: 0,
        rejectedChanges: 0,
        pendingChanges: 0,
        avgConfidence: 0
      }
    };

    const sessionState: SessionState = {
      session,
      isActive: true,
      lastActivity: Date.now(),
      changeBuffer: [],
      pendingOperations: [],
      conflictQueue: [],
      metadata: {
        userId,
        userAgent: navigator?.userAgent,
        platform: navigator?.platform,
        startLocation: window?.location?.href,
        totalKeystrokes: 0,
        totalMouseClicks: 0,
        focusTime: 0,
        idleTime: 0,
        workingTime: 0,
        breakTime: 0,
        efficiency: 1.0,
        tags: []
      }
    };

    this.sessions.set(sessionId, sessionState);
    this.activeSessionId = sessionId;

    // Initialize analytics
    this.sessionAnalytics.set(sessionId, {
      sessionId,
      duration: 0,
      changesProcessed: 0,
      changesAccepted: 0,
      changesRejected: 0,
      changesPending: 0,
      avgProcessingTime: 0,
      avgConfidence: 0,
      conflictsResolved: 0,
      errorCount: 0,
      efficiency: 1.0,
      productivity: 0,
      focusMetrics: {
        totalFocusTime: 0,
        avgFocusSession: 0,
        distractionCount: 0,
        longestFocusSession: 0,
        focusEfficiency: 1.0
      },
      performanceMetrics: {
        avgResponseTime: 0,
        peakMemoryUsage: 0,
        cpuUsage: 0,
        diskIO: 0,
        networkLatency: 0,
        cacheHitRate: 1.0
      }
    });

    this.emit('sessionStarted', { sessionId, documentId, userId });
    this.logSessionEvent({
      id: this.generateEventId(),
      sessionId,
      timestamp: Date.now(),
      type: SessionEventType.SESSION_STARTED,
      data: { documentId, userId },
      userId,
      source: EventSource.USER_ACTION
    });

    return session;
  }

  /**
   * End tracking session
   */
  async endSession(sessionId: string): Promise<void> {
    const sessionState = this.sessions.get(sessionId);
    if (!sessionState) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    sessionState.session.endTime = Date.now();
    sessionState.isActive = false;

    // Process any pending operations
    await this.processPendingOperations(sessionId);

    // Update analytics
    const analytics = this.sessionAnalytics.get(sessionId);
    if (analytics) {
      analytics.duration = sessionState.session.endTime! - sessionState.session.startTime;
      this.sessionAnalytics.set(sessionId, analytics);
    }

    if (this.activeSessionId === sessionId) {
      this.activeSessionId = null;
    }

    this.emit('sessionEnded', { sessionId, duration: analytics?.duration });
    this.logSessionEvent({
      id: this.generateEventId(),
      sessionId,
      timestamp: Date.now(),
      type: SessionEventType.SESSION_ENDED,
      data: { duration: analytics?.duration },
      userId: sessionState.metadata.userId,
      source: EventSource.SYSTEM_EVENT
    });
  }

  /**
   * Add change to session
   */
  async addChange(sessionId: string, change: Change): Promise<void> {
    const sessionState = this.sessions.get(sessionId);
    if (!sessionState) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (!sessionState.isActive) {
      throw new Error('Session is not active');
    }

    // Check for conflicts with other active sessions
    if (this.config.enableConflictResolution) {
      const conflicts = await this.detectConflicts(change);
      if (conflicts.length > 0) {
        for (const conflict of conflicts) {
          sessionState.conflictQueue.push(conflict);
          this.emit('conflictDetected', { sessionId, conflict });
        }
      }
    }

    // Add to session
    sessionState.session.changes.push(change);
    sessionState.changeBuffer.push(change);
    sessionState.session.statistics.totalChanges++;
    sessionState.session.statistics.pendingChanges++;
    sessionState.lastActivity = Date.now();

    // Update analytics
    const analytics = this.sessionAnalytics.get(sessionId);
    if (analytics) {
      analytics.changesProcessed++;
      analytics.changesPending++;
      analytics.avgConfidence = this.calculateAverageConfidence(sessionState.session.changes);
      this.sessionAnalytics.set(sessionId, analytics);
    }

    // Create operation record
    const operation: SessionOperation = {
      id: this.generateOperationId(),
      type: SessionOperationType.ADD_CHANGE,
      timestamp: Date.now(),
      changeId: change.id,
      data: change,
      status: OperationStatus.COMPLETED,
      retry: 0,
      maxRetries: 3
    };

    sessionState.pendingOperations.push(operation);

    this.emit('changeAdded', { sessionId, change });
    this.logSessionEvent({
      id: this.generateEventId(),
      sessionId,
      timestamp: Date.now(),
      type: SessionEventType.CHANGE_PROCESSED,
      data: { changeId: change.id, type: 'added' },
      userId: sessionState.metadata.userId,
      source: EventSource.USER_ACTION
    });
  }

  /**
   * Accept change in session
   */
  async acceptChange(sessionId: string, changeId: string): Promise<void> {
    const sessionState = this.sessions.get(sessionId);
    if (!sessionState) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const change = sessionState.session.changes.find(c => c.id === changeId);
    if (!change) {
      throw new Error(`Change not found: ${changeId}`);
    }

    change.status = 'accepted' as any;
    sessionState.session.statistics.acceptedChanges++;
    sessionState.session.statistics.pendingChanges--;
    sessionState.lastActivity = Date.now();

    // Update analytics
    const analytics = this.sessionAnalytics.get(sessionId);
    if (analytics) {
      analytics.changesAccepted++;
      analytics.changesPending--;
      this.sessionAnalytics.set(sessionId, analytics);
    }

    this.emit('changeAccepted', { sessionId, changeId });
    this.logSessionEvent({
      id: this.generateEventId(),
      sessionId,
      timestamp: Date.now(),
      type: SessionEventType.CHANGE_PROCESSED,
      data: { changeId, type: 'accepted' },
      userId: sessionState.metadata.userId,
      source: EventSource.USER_ACTION
    });
  }

  /**
   * Reject change in session
   */
  async rejectChange(sessionId: string, changeId: string): Promise<void> {
    const sessionState = this.sessions.get(sessionId);
    if (!sessionState) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const change = sessionState.session.changes.find(c => c.id === changeId);
    if (!change) {
      throw new Error(`Change not found: ${changeId}`);
    }

    change.status = 'rejected' as any;
    sessionState.session.statistics.rejectedChanges++;
    sessionState.session.statistics.pendingChanges--;
    sessionState.lastActivity = Date.now();

    // Update analytics
    const analytics = this.sessionAnalytics.get(sessionId);
    if (analytics) {
      analytics.changesRejected++;
      analytics.changesPending--;
      this.sessionAnalytics.set(sessionId, analytics);
    }

    this.emit('changeRejected', { sessionId, changeId });
    this.logSessionEvent({
      id: this.generateEventId(),
      sessionId,
      timestamp: Date.now(),
      type: SessionEventType.CHANGE_PROCESSED,
      data: { changeId, type: 'rejected' },
      userId: sessionState.metadata.userId,
      source: EventSource.USER_ACTION
    });
  }

  /**
   * Create session snapshot
   */
  async createSnapshot(sessionId: string): Promise<SessionSnapshot> {
    const sessionState = this.sessions.get(sessionId);
    if (!sessionState) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const snapshot: SessionSnapshot = {
      id: this.generateSnapshotId(),
      sessionId,
      timestamp: Date.now(),
      changeCount: sessionState.session.changes.length,
      state: JSON.parse(JSON.stringify(sessionState)), // Deep clone
      compressed: false,
      size: JSON.stringify(sessionState).length,
      checksum: this.calculateChecksum(JSON.stringify(sessionState))
    };

    this.emit('snapshotCreated', { sessionId, snapshotId: snapshot.id });
    this.logSessionEvent({
      id: this.generateEventId(),
      sessionId,
      timestamp: Date.now(),
      type: SessionEventType.SNAPSHOT_CREATED,
      data: { snapshotId: snapshot.id, size: snapshot.size },
      userId: sessionState.metadata.userId,
      source: EventSource.SYSTEM_EVENT
    });

    return snapshot;
  }

  /**
   * Get session state
   */
  getSessionState(sessionId: string): SessionState | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): SessionState[] {
    return Array.from(this.sessions.values()).filter(s => s.isActive);
  }

  /**
   * Get session analytics
   */
  getSessionAnalytics(sessionId: string): SessionAnalytics | undefined {
    return this.sessionAnalytics.get(sessionId);
  }

  /**
   * Pause session
   */
  async pauseSession(sessionId: string): Promise<void> {
    const sessionState = this.sessions.get(sessionId);
    if (!sessionState) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    sessionState.isActive = false;
    
    this.emit('sessionPaused', { sessionId });
    this.logSessionEvent({
      id: this.generateEventId(),
      sessionId,
      timestamp: Date.now(),
      type: SessionEventType.SESSION_PAUSED,
      data: {},
      userId: sessionState.metadata.userId,
      source: EventSource.USER_ACTION
    });
  }

  /**
   * Resume session
   */
  async resumeSession(sessionId: string): Promise<void> {
    const sessionState = this.sessions.get(sessionId);
    if (!sessionState) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    sessionState.isActive = true;
    sessionState.lastActivity = Date.now();
    
    this.emit('sessionResumed', { sessionId });
    this.logSessionEvent({
      id: this.generateEventId(),
      sessionId,
      timestamp: Date.now(),
      type: SessionEventType.SESSION_RESUMED,
      data: {},
      userId: sessionState.metadata.userId,
      source: EventSource.USER_ACTION
    });
  }

  /**
   * Recover session from crash
   */
  async recoverSession(sessionId: string, lastKnownState: SessionState): Promise<SessionRecoveryInfo> {
    const recoveryInfo: SessionRecoveryInfo = {
      sessionId,
      timestamp: Date.now(),
      documentId: lastKnownState.session.documentId,
      lastKnownState,
      recoveredChanges: 0,
      lostChanges: 0,
      integrityCheck: true,
      recoverySuccess: false,
      errors: []
    };

    try {
      // Validate state integrity
      const checksum = this.calculateChecksum(JSON.stringify(lastKnownState));
      // In real implementation, we'd compare with stored checksum

      // Restore session state
      this.sessions.set(sessionId, lastKnownState);
      recoveryInfo.recoveredChanges = lastKnownState.session.changes.length;
      recoveryInfo.recoverySuccess = true;

      this.emit('sessionRecovered', { sessionId, recoveryInfo });
      this.logSessionEvent({
        id: this.generateEventId(),
        sessionId,
        timestamp: Date.now(),
        type: SessionEventType.SESSION_STARTED,
        data: { recovered: true, recoveredChanges: recoveryInfo.recoveredChanges },
        userId: lastKnownState.metadata.userId,
        source: EventSource.SYSTEM_EVENT
      });

    } catch (error) {
      recoveryInfo.errors.push(error.message);
      recoveryInfo.recoverySuccess = false;
    }

    return recoveryInfo;
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
    
    if (this.activityTimer) {
      clearInterval(this.activityTimer);
    }

    // End all active sessions
    for (const [sessionId, sessionState] of this.sessions) {
      if (sessionState.isActive) {
        this.endSession(sessionId);
      }
    }

    this.sessions.clear();
    this.sessionAnalytics.clear();
    this.removeAllListeners();
  }

  // Private methods

  private async detectConflicts(change: Change): Promise<SessionConflict[]> {
    const conflicts: SessionConflict[] = [];

    // Check for overlapping changes in other active sessions
    for (const [sessionId, sessionState] of this.sessions) {
      if (!sessionState.isActive || sessionId === this.activeSessionId) {
        continue;
      }

      for (const existingChange of sessionState.session.changes) {
        if (this.changesOverlap(change, existingChange)) {
          conflicts.push({
            id: this.generateConflictId(),
            timestamp: Date.now(),
            type: ConflictType.OVERLAPPING_CHANGES,
            sessionA: this.activeSessionId!,
            sessionB: sessionId,
            changeA: change,
            changeB: existingChange,
            metadata: {
              overlapStart: Math.max(change.position.start, existingChange.position.start),
              overlapEnd: Math.min(change.position.end, existingChange.position.end)
            }
          });
        }
      }
    }

    return conflicts;
  }

  private changesOverlap(changeA: Change, changeB: Change): boolean {
    return !(changeA.position.end <= changeB.position.start || 
             changeB.position.end <= changeA.position.start);
  }

  private async processPendingOperations(sessionId: string): Promise<void> {
    const sessionState = this.sessions.get(sessionId);
    if (!sessionState) return;

    const pendingOps = sessionState.pendingOperations.filter(
      op => op.status === OperationStatus.PENDING || op.status === OperationStatus.FAILED
    );

    for (const operation of pendingOps) {
      try {
        operation.status = OperationStatus.IN_PROGRESS;
        
        // Process operation based on type
        switch (operation.type) {
          case SessionOperationType.SAVE_STATE:
            await this.saveSessionState(sessionId);
            break;
          case SessionOperationType.SYNC_STATE:
            await this.syncSessionState(sessionId);
            break;
          // Add other operation types as needed
        }

        operation.status = OperationStatus.COMPLETED;
      } catch (error) {
        operation.status = OperationStatus.FAILED;
        operation.retry++;

        if (operation.retry >= operation.maxRetries) {
          operation.status = OperationStatus.CANCELLED;
        }
      }
    }

    // Remove completed and cancelled operations
    sessionState.pendingOperations = sessionState.pendingOperations.filter(
      op => op.status !== OperationStatus.COMPLETED && op.status !== OperationStatus.CANCELLED
    );
  }

  private async saveSessionState(sessionId: string): Promise<void> {
    // Implementation would save state to persistence layer
    this.emit('stateSaved', { sessionId });
  }

  private async syncSessionState(sessionId: string): Promise<void> {
    // Implementation would sync state with other instances
    this.emit('stateSynced', { sessionId });
  }

  private calculateAverageConfidence(changes: Change[]): number {
    if (changes.length === 0) return 0;
    
    const sum = changes.reduce((acc, change) => acc + change.confidence, 0);
    return sum / changes.length;
  }

  private calculateChecksum(data: string): string {
    let hash = 0;
    if (data.length === 0) return hash.toString();

    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return hash.toString(36);
  }

  private startActivityMonitoring(): void {
    this.activityTimer = setInterval(() => {
      const now = Date.now();
      
      for (const [sessionId, sessionState] of this.sessions) {
        if (!sessionState.isActive) continue;

        const timeSinceActivity = now - sessionState.lastActivity;
        
        if (timeSinceActivity > this.config.sessionTimeout) {
          this.pauseSession(sessionId);
          this.logSessionEvent({
            id: this.generateEventId(),
            sessionId,
            timestamp: now,
            type: SessionEventType.IDLE_DETECTED,
            data: { idleTime: timeSinceActivity },
            userId: sessionState.metadata.userId,
            source: EventSource.SYSTEM_EVENT
          });
        }
      }
    }, 60000); // Check every minute
  }

  private startAutoSave(): void {
    this.autoSaveTimer = setInterval(async () => {
      for (const [sessionId, sessionState] of this.sessions) {
        if (sessionState.isActive && sessionState.changeBuffer.length > 0) {
          const operation: SessionOperation = {
            id: this.generateOperationId(),
            type: SessionOperationType.SAVE_STATE,
            timestamp: Date.now(),
            data: {},
            status: OperationStatus.PENDING,
            retry: 0,
            maxRetries: 3
          };

          sessionState.pendingOperations.push(operation);
          sessionState.changeBuffer = []; // Clear buffer after saving
        }
      }
    }, this.config.autoSaveInterval);
  }

  private logSessionEvent(event: SessionEvent): void {
    if (this.config.enableAuditTrail) {
      this.emit('sessionEvent', event);
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateConflictId(): string {
    return `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSnapshotId(): string {
    return `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}