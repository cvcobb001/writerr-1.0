/**
 * @fileoverview Crash recovery system for Track Edits plugin
 */

import { DocumentState, StateBackup, RecoveryInfo } from './types';
import { StorageAdapter } from '../persistence/types';
import { SessionState } from '../session/types';
import { EventEmitter } from 'events';

export class CrashRecovery extends EventEmitter {
  private storage: StorageAdapter;
  private isRecovering = false;
  private recoveryInProgress = new Set<string>();
  private heartbeatTimer: NodeJS.Timer | null = null;
  private backupTimer: NodeJS.Timer | null = null;
  
  private readonly HEARTBEAT_INTERVAL = 5000; // 5 seconds
  private readonly BACKUP_INTERVAL = 30000; // 30 seconds
  private readonly RECOVERY_TIMEOUT = 60000; // 1 minute
  private readonly MAX_RECOVERY_ATTEMPTS = 3;

  constructor(storage: StorageAdapter) {
    super();
    this.storage = storage;
    this.startHeartbeat();
    this.startBackupTimer();
  }

  /**
   * Initialize crash recovery system
   */
  async initialize(): Promise<void> {
    try {
      await this.checkForCrash();
      await this.cleanupOldRecoveryData();
      this.emit('initialized');
    } catch (error) {
      throw new Error(`Crash recovery initialization failed: ${error.message}`);
    }
  }

  /**
   * Save recovery checkpoint
   */
  async saveCheckpoint(
    documentStates: Map<string, DocumentState>,
    sessionStates: Map<string, SessionState>
  ): Promise<void> {
    if (this.isRecovering) return;

    try {
      const checkpoint = {
        timestamp: Date.now(),
        version: 1,
        documentStates: this.serializeDocumentStates(documentStates),
        sessionStates: this.serializeSessionStates(sessionStates),
        processId: process.pid || Math.random().toString(36),
        checksum: ''
      };

      const data = JSON.stringify(checkpoint);
      checkpoint.checksum = this.calculateChecksum(data);

      await this.storage.write('recovery/checkpoint', JSON.stringify(checkpoint));
      await this.storage.write('recovery/heartbeat', Date.now().toString());

      this.emit('checkpointSaved', { timestamp: checkpoint.timestamp, size: data.length });
    } catch (error) {
      this.emit('error', new Error(`Failed to save checkpoint: ${error.message}`));
    }
  }

  /**
   * Check for previous crash and initiate recovery
   */
  async checkForCrash(): Promise<RecoveryInfo | null> {
    try {
      const heartbeatData = await this.storage.read('recovery/heartbeat');
      const checkpointData = await this.storage.read('recovery/checkpoint');

      if (!heartbeatData || !checkpointData) {
        return null; // No previous session or clean shutdown
      }

      const lastHeartbeat = parseInt(heartbeatData);
      const timeSinceHeartbeat = Date.now() - lastHeartbeat;

      // If heartbeat is recent, no crash detected
      if (timeSinceHeartbeat < this.HEARTBEAT_INTERVAL * 3) {
        return null;
      }

      // Crash detected, initiate recovery
      this.emit('crashDetected', { timeSinceHeartbeat, lastHeartbeat });
      return await this.performRecovery();

    } catch (error) {
      this.emit('error', new Error(`Crash detection failed: ${error.message}`));
      return null;
    }
  }

  /**
   * Perform crash recovery
   */
  async performRecovery(): Promise<RecoveryInfo> {
    const recoveryStart = Date.now();
    this.isRecovering = true;

    const recoveryInfo: RecoveryInfo = {
      timestamp: recoveryStart,
      documentsRecovered: 0,
      changesRecovered: 0,
      sessionsRecovered: 0,
      errors: [],
      success: false,
      duration: 0
    };

    try {
      // Load checkpoint data
      const checkpointData = await this.storage.read('recovery/checkpoint');
      if (!checkpointData) {
        throw new Error('No checkpoint data found');
      }

      const checkpoint = JSON.parse(checkpointData);

      // Validate checkpoint integrity
      const expectedChecksum = checkpoint.checksum;
      const actualChecksum = this.calculateChecksum(JSON.stringify({ ...checkpoint, checksum: '' }));
      
      if (expectedChecksum !== actualChecksum) {
        recoveryInfo.errors.push('Checkpoint data corrupted - checksum mismatch');
        
        // Try to recover from backup
        const backupRecovery = await this.recoverFromBackup();
        if (backupRecovery) {
          return backupRecovery;
        }
        
        throw new Error('Checkpoint corrupted and no valid backup found');
      }

      // Recover document states
      if (checkpoint.documentStates) {
        const recovered = await this.recoverDocumentStates(checkpoint.documentStates);
        recoveryInfo.documentsRecovered = recovered.documents;
        recoveryInfo.changesRecovered = recovered.changes;
      }

      // Recover session states
      if (checkpoint.sessionStates) {
        recoveryInfo.sessionsRecovered = await this.recoverSessionStates(checkpoint.sessionStates);
      }

      // Clean up recovery data
      await this.cleanupRecoveryData();
      
      recoveryInfo.success = true;
      recoveryInfo.duration = Date.now() - recoveryStart;

      this.emit('recoveryCompleted', recoveryInfo);

    } catch (error) {
      recoveryInfo.errors.push(error.message);
      recoveryInfo.duration = Date.now() - recoveryStart;
      
      this.emit('recoveryFailed', { error: error.message, recoveryInfo });
    } finally {
      this.isRecovering = false;
    }

    return recoveryInfo;
  }

  /**
   * Create incremental backup
   */
  async createIncrementalBackup(
    documentStates: Map<string, DocumentState>,
    sessionStates: Map<string, SessionState>
  ): Promise<void> {
    try {
      const backupId = this.generateBackupId();
      const backup = {
        id: backupId,
        timestamp: Date.now(),
        type: 'incremental',
        documentStates: this.serializeDocumentStates(documentStates),
        sessionStates: this.serializeSessionStates(sessionStates),
        checksum: ''
      };

      const data = JSON.stringify(backup);
      backup.checksum = this.calculateChecksum(data);

      await this.storage.write(`recovery/backups/${backupId}`, JSON.stringify(backup));

      // Cleanup old backups (keep last 10)
      await this.cleanupOldBackups();

      this.emit('backupCreated', { backupId, size: data.length });

    } catch (error) {
      this.emit('error', new Error(`Failed to create incremental backup: ${error.message}`));
    }
  }

  /**
   * Recover from most recent backup
   */
  async recoverFromBackup(): Promise<RecoveryInfo | null> {
    try {
      const backupKeys = await this.storage.list('recovery/backups/');
      if (backupKeys.length === 0) {
        return null;
      }

      // Sort by timestamp (newest first)
      const sortedBackups = backupKeys.sort().reverse();

      for (const backupKey of sortedBackups) {
        try {
          const backupData = await this.storage.read(`recovery/backups/${backupKey}`);
          if (!backupData) continue;

          const backup = JSON.parse(backupData);

          // Validate backup integrity
          const expectedChecksum = backup.checksum;
          const actualChecksum = this.calculateChecksum(JSON.stringify({ ...backup, checksum: '' }));

          if (expectedChecksum !== actualChecksum) {
            continue; // Try next backup
          }

          // Recovery from this backup
          const recoveryInfo: RecoveryInfo = {
            timestamp: Date.now(),
            documentsRecovered: 0,
            changesRecovered: 0,
            sessionsRecovered: 0,
            errors: [],
            success: false,
            duration: 0
          };

          const start = Date.now();

          if (backup.documentStates) {
            const recovered = await this.recoverDocumentStates(backup.documentStates);
            recoveryInfo.documentsRecovered = recovered.documents;
            recoveryInfo.changesRecovered = recovered.changes;
          }

          if (backup.sessionStates) {
            recoveryInfo.sessionsRecovered = await this.recoverSessionStates(backup.sessionStates);
          }

          recoveryInfo.success = true;
          recoveryInfo.duration = Date.now() - start;

          this.emit('backupRecoveryCompleted', recoveryInfo);
          return recoveryInfo;

        } catch (error) {
          // Continue to next backup
          continue;
        }
      }

      return null; // No valid backup found

    } catch (error) {
      this.emit('error', new Error(`Backup recovery failed: ${error.message}`));
      return null;
    }
  }

  /**
   * Validate recovered data integrity
   */
  async validateRecoveredData(
    documentStates: Map<string, DocumentState>,
    sessionStates: Map<string, SessionState>
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      documentsChecked: 0,
      sessionsChecked: 0
    };

    try {
      // Validate document states
      for (const [documentId, state] of documentStates) {
        result.documentsChecked++;

        // Check required fields
        if (!state.id || !state.filePath || !state.version) {
          result.errors.push(`Document ${documentId} missing required fields`);
          result.valid = false;
        }

        // Check change consistency
        if (state.changes.size !== state.metadata.totalChanges) {
          result.warnings.push(`Document ${documentId} has inconsistent change count`);
        }

        // Validate changes
        for (const [changeId, change] of state.changes) {
          if (!change.id || !change.timestamp || change.confidence < 0 || change.confidence > 1) {
            result.errors.push(`Document ${documentId} has invalid change ${changeId}`);
            result.valid = false;
          }
        }
      }

      // Validate session states
      for (const [sessionId, state] of sessionStates) {
        result.sessionsChecked++;

        // Check required fields
        if (!state.session.id || !state.session.documentId || !state.session.startTime) {
          result.errors.push(`Session ${sessionId} missing required fields`);
          result.valid = false;
        }

        // Check session consistency
        if (state.session.endTime && state.session.endTime < state.session.startTime) {
          result.errors.push(`Session ${sessionId} has invalid time range`);
          result.valid = false;
        }
      }

    } catch (error) {
      result.errors.push(`Validation failed: ${error.message}`);
      result.valid = false;
    }

    return result;
  }

  /**
   * Force cleanup of recovery data
   */
  async forceCleanup(): Promise<void> {
    try {
      await this.storage.delete('recovery/checkpoint');
      await this.storage.delete('recovery/heartbeat');
      
      // Clean up all backups
      const backupKeys = await this.storage.list('recovery/backups/');
      for (const backupKey of backupKeys) {
        await this.storage.delete(`recovery/backups/${backupKey}`);
      }

      this.emit('cleanupCompleted');

    } catch (error) {
      this.emit('error', new Error(`Force cleanup failed: ${error.message}`));
    }
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    if (this.backupTimer) {
      clearInterval(this.backupTimer);
    }

    // Mark clean shutdown
    this.storage.write('recovery/shutdown', Date.now().toString())
      .catch(() => {}); // Ignore errors during shutdown

    this.removeAllListeners();
  }

  // Private methods

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(async () => {
      if (!this.isRecovering) {
        try {
          await this.storage.write('recovery/heartbeat', Date.now().toString());
        } catch (error) {
          this.emit('error', new Error(`Heartbeat failed: ${error.message}`));
        }
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  private startBackupTimer(): void {
    this.backupTimer = setInterval(() => {
      this.emit('backupRequested');
    }, this.BACKUP_INTERVAL);
  }

  private async recoverDocumentStates(serializedStates: any): Promise<{documents: number, changes: number}> {
    let documentsRecovered = 0;
    let changesRecovered = 0;

    try {
      for (const [documentId, stateData] of Object.entries(serializedStates)) {
        const state = this.deserializeDocumentState(stateData);
        
        // Emit recovered document state for the main system to handle
        this.emit('documentStateRecovered', { documentId, state });
        
        documentsRecovered++;
        changesRecovered += state.changes.size;
      }
    } catch (error) {
      throw new Error(`Document state recovery failed: ${error.message}`);
    }

    return { documents: documentsRecovered, changes: changesRecovered };
  }

  private async recoverSessionStates(serializedStates: any): Promise<number> {
    let sessionsRecovered = 0;

    try {
      for (const [sessionId, stateData] of Object.entries(serializedStates)) {
        const state = this.deserializeSessionState(stateData);
        
        // Emit recovered session state for the main system to handle
        this.emit('sessionStateRecovered', { sessionId, state });
        
        sessionsRecovered++;
      }
    } catch (error) {
      throw new Error(`Session state recovery failed: ${error.message}`);
    }

    return sessionsRecovered;
  }

  private serializeDocumentStates(states: Map<string, DocumentState>): any {
    const serialized: any = {};
    
    for (const [documentId, state] of states) {
      serialized[documentId] = {
        ...state,
        changes: Array.from(state.changes.entries()),
        clusters: Array.from(state.clusters.entries()),
        sessions: Array.from(state.sessions.entries())
      };
    }
    
    return serialized;
  }

  private serializeSessionStates(states: Map<string, SessionState>): any {
    const serialized: any = {};
    
    for (const [sessionId, state] of states) {
      serialized[sessionId] = state;
    }
    
    return serialized;
  }

  private deserializeDocumentState(data: any): DocumentState {
    return {
      ...data,
      changes: new Map(data.changes),
      clusters: new Map(data.clusters),
      sessions: new Map(data.sessions)
    };
  }

  private deserializeSessionState(data: any): SessionState {
    return data;
  }

  private async cleanupRecoveryData(): Promise<void> {
    try {
      await this.storage.delete('recovery/checkpoint');
      await this.storage.delete('recovery/heartbeat');
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  private async cleanupOldRecoveryData(): Promise<void> {
    try {
      const keys = await this.storage.list('recovery/');
      const now = Date.now();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

      for (const key of keys) {
        if (key.includes('backup_')) {
          const timestamp = this.extractTimestampFromKey(key);
          if (timestamp && (now - timestamp) > maxAge) {
            await this.storage.delete(`recovery/${key}`);
          }
        }
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  private async cleanupOldBackups(): Promise<void> {
    try {
      const backupKeys = await this.storage.list('recovery/backups/');
      if (backupKeys.length > 10) {
        const sortedKeys = backupKeys.sort();
        const toDelete = sortedKeys.slice(0, sortedKeys.length - 10);
        
        for (const key of toDelete) {
          await this.storage.delete(`recovery/backups/${key}`);
        }
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  private extractTimestampFromKey(key: string): number | null {
    const match = key.match(/backup_(\d+)_/);
    return match ? parseInt(match[1]) : null;
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

  private generateBackupId(): string {
    return `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  documentsChecked: number;
  sessionsChecked: number;
}