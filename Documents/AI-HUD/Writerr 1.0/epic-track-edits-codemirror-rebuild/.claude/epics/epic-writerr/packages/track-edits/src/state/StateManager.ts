/**
 * @fileoverview Core state management for Track Edits plugin
 */

import { TFile } from 'obsidian';
import { Change, ChangeCluster, TrackingSession } from '../types';
import {
  DocumentState,
  DocumentMetadata,
  DocumentSnapshot,
  StateConfig,
  StateMetrics,
  StateEvent,
  StateEventType,
  MemoryProfileInfo,
  AuditAction
} from './types';
import { EventEmitter } from 'events';

export class StateManager extends EventEmitter {
  private documents = new Map<string, DocumentState>();
  private config: StateConfig;
  private metrics: StateMetrics;
  private memoryProfiler: NodeJS.Timer | null = null;
  private autosaveTimer: NodeJS.Timer | null = null;
  private cleanupTimer: NodeJS.Timer | null = null;

  constructor(config: Partial<StateConfig> = {}) {
    super();
    this.config = {
      maxSnapshots: 50,
      snapshotInterval: 300000, // 5 minutes
      compressionThreshold: 100000, // 100KB
      maxMemoryUsage: 104857600, // 100MB
      autosaveInterval: 30000, // 30 seconds
      enableCrashRecovery: true,
      enableCompression: true,
      enableAuditTrail: true,
      ...config
    };

    this.metrics = {
      totalDocuments: 0,
      totalChanges: 0,
      memoryUsage: 0,
      storageUsage: 0,
      lastCleanup: Date.now(),
      crashRecoveryCount: 0,
      compressionRatio: 1.0
    };

    this.startMemoryProfiler();
    this.startAutosave();
    this.startPeriodicCleanup();
  }

  /**
   * Initialize document state
   */
  async initializeDocument(file: TFile): Promise<DocumentState> {
    const documentId = this.getDocumentId(file);
    
    if (this.documents.has(documentId)) {
      return this.documents.get(documentId)!;
    }

    const documentState: DocumentState = {
      id: documentId,
      filePath: file.path,
      lastModified: file.stat.mtime,
      version: 1,
      changes: new Map(),
      clusters: new Map(),
      sessions: new Map(),
      metadata: {
        wordCount: 0,
        totalChanges: 0,
        lastSaved: Date.now(),
        compressionLevel: 0,
        checksum: '',
        tags: [],
        userId: undefined
      },
      snapshots: []
    };

    this.documents.set(documentId, documentState);
    this.metrics.totalDocuments++;
    
    this.emit('documentInitialized', { documentId });
    this.auditLog(AuditAction.DOCUMENT_CREATED, documentId);
    
    return documentState;
  }

  /**
   * Add change to document state
   */
  async addChange(documentId: string, change: Change): Promise<void> {
    const state = this.documents.get(documentId);
    if (!state) {
      throw new Error(`Document state not found: ${documentId}`);
    }

    state.changes.set(change.id, change);
    state.metadata.totalChanges++;
    state.version++;
    state.lastModified = Date.now();
    
    this.metrics.totalChanges++;
    
    this.emit('stateEvent', {
      type: StateEventType.CHANGE_ADDED,
      documentId,
      changeId: change.id,
      timestamp: Date.now(),
      data: change
    } as StateEvent);

    this.auditLog(AuditAction.CHANGE_ADDED, documentId, change.id);
    
    // Check if we need to create a snapshot
    await this.checkSnapshotNeeded(documentId);
    
    // Check memory usage
    this.checkMemoryUsage();
  }

  /**
   * Update change in document state
   */
  async updateChange(documentId: string, changeId: string, updates: Partial<Change>): Promise<void> {
    const state = this.documents.get(documentId);
    if (!state) {
      throw new Error(`Document state not found: ${documentId}`);
    }

    const change = state.changes.get(changeId);
    if (!change) {
      throw new Error(`Change not found: ${changeId}`);
    }

    const updatedChange = { ...change, ...updates };
    state.changes.set(changeId, updatedChange);
    state.version++;
    state.lastModified = Date.now();

    this.emit('stateEvent', {
      type: StateEventType.CHANGE_UPDATED,
      documentId,
      changeId,
      timestamp: Date.now(),
      data: updatedChange
    } as StateEvent);

    this.auditLog(AuditAction.CHANGE_MODIFIED, documentId, changeId);
  }

  /**
   * Remove change from document state
   */
  async removeChange(documentId: string, changeId: string): Promise<void> {
    const state = this.documents.get(documentId);
    if (!state) {
      throw new Error(`Document state not found: ${documentId}`);
    }

    if (state.changes.delete(changeId)) {
      state.metadata.totalChanges--;
      state.version++;
      state.lastModified = Date.now();
      this.metrics.totalChanges--;

      this.emit('stateEvent', {
        type: StateEventType.CHANGE_REMOVED,
        documentId,
        changeId,
        timestamp: Date.now(),
        data: null
      } as StateEvent);

      this.auditLog(AuditAction.CHANGE_ACCEPTED, documentId, changeId);
    }
  }

  /**
   * Add cluster to document state
   */
  async addCluster(documentId: string, cluster: ChangeCluster): Promise<void> {
    const state = this.documents.get(documentId);
    if (!state) {
      throw new Error(`Document state not found: ${documentId}`);
    }

    state.clusters.set(cluster.id, cluster);
    state.version++;
    state.lastModified = Date.now();

    this.emit('clusterAdded', { documentId, cluster });
  }

  /**
   * Start tracking session
   */
  async startSession(documentId: string, sessionId?: string): Promise<TrackingSession> {
    const state = this.documents.get(documentId);
    if (!state) {
      throw new Error(`Document state not found: ${documentId}`);
    }

    const session: TrackingSession = {
      id: sessionId || this.generateSessionId(),
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

    state.sessions.set(session.id, session);

    this.emit('stateEvent', {
      type: StateEventType.SESSION_STARTED,
      documentId,
      sessionId: session.id,
      timestamp: Date.now(),
      data: session
    } as StateEvent);

    this.auditLog(AuditAction.SESSION_STARTED, documentId, undefined, session.id);

    return session;
  }

  /**
   * End tracking session
   */
  async endSession(documentId: string, sessionId: string): Promise<void> {
    const state = this.documents.get(documentId);
    if (!state) {
      throw new Error(`Document state not found: ${documentId}`);
    }

    const session = state.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.endTime = Date.now();

    this.emit('stateEvent', {
      type: StateEventType.SESSION_ENDED,
      documentId,
      sessionId,
      timestamp: Date.now(),
      data: session
    } as StateEvent);

    this.auditLog(AuditAction.SESSION_ENDED, documentId, undefined, sessionId);
  }

  /**
   * Create document snapshot
   */
  async createSnapshot(documentId: string, content: string, description?: string): Promise<DocumentSnapshot> {
    const state = this.documents.get(documentId);
    if (!state) {
      throw new Error(`Document state not found: ${documentId}`);
    }

    const snapshot: DocumentSnapshot = {
      id: this.generateSnapshotId(),
      timestamp: Date.now(),
      version: state.version,
      content,
      changeIds: Array.from(state.changes.keys()),
      compressed: false,
      size: content.length,
      description
    };

    // Compress if needed
    if (content.length > this.config.compressionThreshold && this.config.enableCompression) {
      // Note: Actual compression implementation would go here
      snapshot.compressed = true;
    }

    state.snapshots.push(snapshot);

    // Limit snapshots
    if (state.snapshots.length > this.config.maxSnapshots) {
      state.snapshots = state.snapshots.slice(-this.config.maxSnapshots);
    }

    this.emit('stateEvent', {
      type: StateEventType.SNAPSHOT_CREATED,
      documentId,
      timestamp: Date.now(),
      data: snapshot
    } as StateEvent);

    this.auditLog(AuditAction.SNAPSHOT_CREATED, documentId);

    return snapshot;
  }

  /**
   * Get document state
   */
  getDocumentState(documentId: string): DocumentState | undefined {
    return this.documents.get(documentId);
  }

  /**
   * Get all document states
   */
  getAllDocumentStates(): Map<string, DocumentState> {
    return new Map(this.documents);
  }

  /**
   * Get state metrics
   */
  getMetrics(): StateMetrics {
    return { ...this.metrics };
  }

  /**
   * Clean up expired data
   */
  async cleanup(): Promise<void> {
    const now = Date.now();
    const expiredThreshold = now - (24 * 60 * 60 * 1000); // 24 hours

    for (const [documentId, state] of this.documents) {
      // Clean up old snapshots
      state.snapshots = state.snapshots.filter(s => s.timestamp > expiredThreshold);
      
      // Clean up ended sessions older than 24 hours
      for (const [sessionId, session] of state.sessions) {
        if (session.endTime && session.endTime < expiredThreshold) {
          state.sessions.delete(sessionId);
        }
      }
    }

    this.metrics.lastCleanup = now;
    this.auditLog(AuditAction.CLEANUP_PERFORMED);
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    if (this.memoryProfiler) {
      clearInterval(this.memoryProfiler);
    }
    
    if (this.autosaveTimer) {
      clearInterval(this.autosaveTimer);
    }
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.documents.clear();
    this.removeAllListeners();
  }

  private getDocumentId(file: TFile): string {
    return file.path;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSnapshotId(): string {
    return `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async checkSnapshotNeeded(documentId: string): Promise<void> {
    const state = this.documents.get(documentId);
    if (!state) return;

    const lastSnapshot = state.snapshots[state.snapshots.length - 1];
    const timeSinceLastSnapshot = Date.now() - (lastSnapshot?.timestamp || 0);

    if (timeSinceLastSnapshot > this.config.snapshotInterval) {
      // Note: Would need to get current content from Obsidian
      // await this.createSnapshot(documentId, currentContent);
    }
  }

  private checkMemoryUsage(): void {
    if (process.memoryUsage) {
      const usage = process.memoryUsage();
      this.metrics.memoryUsage = usage.heapUsed;

      if (usage.heapUsed > this.config.maxMemoryUsage) {
        this.emit('stateEvent', {
          type: StateEventType.MEMORY_WARNING,
          timestamp: Date.now(),
          data: { usage, limit: this.config.maxMemoryUsage }
        } as StateEvent);
      }
    }
  }

  private startMemoryProfiler(): void {
    if (this.config.enableCrashRecovery) {
      this.memoryProfiler = setInterval(() => {
        this.checkMemoryUsage();
      }, 10000); // Check every 10 seconds
    }
  }

  private startAutosave(): void {
    this.autosaveTimer = setInterval(() => {
      this.emit('autosave');
    }, this.config.autosaveInterval);
  }

  private startPeriodicCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000); // Cleanup every hour
  }

  private auditLog(action: AuditAction, documentId?: string, changeId?: string, sessionId?: string): void {
    if (!this.config.enableAuditTrail) return;

    // Note: Actual audit logging would be implemented in the persistence layer
    this.emit('auditLog', {
      action,
      documentId,
      changeId,
      sessionId,
      timestamp: Date.now()
    });
  }
}