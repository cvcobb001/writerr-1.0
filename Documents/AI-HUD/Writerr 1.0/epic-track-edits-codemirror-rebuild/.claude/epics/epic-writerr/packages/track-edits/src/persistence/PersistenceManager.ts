/**
 * @fileoverview Main persistence manager for Track Edits plugin
 */

import { Vault } from 'obsidian';
import { DocumentState, AuditLogEntry, StateBackup } from '../state/types';
import {
  PersistenceConfig,
  StorageAdapter,
  SerializedDocumentState,
  PersistenceMetadata,
  PersistenceTransaction,
  RecoveryManifest,
  CorruptionInfo,
  CorruptionType,
  CorruptionSeverity,
  RestoreOptions,
  PersistenceHealth,
  HealthIssue,
  IssueType,
  IssueSeverity
} from './types';
import { ObsidianStorageAdapter } from './ObsidianStorageAdapter';
import { CompressionUtils } from './CompressionUtils';
import { EventEmitter } from 'events';

export class PersistenceManager extends EventEmitter {
  private storage: StorageAdapter;
  private config: PersistenceConfig;
  private auditLog: AuditLogEntry[] = [];
  private activeTransactions = new Map<string, PersistenceTransaction>();
  private healthTimer: NodeJS.Timer | null = null;

  constructor(vault: Vault, config: Partial<PersistenceConfig> = {}) {
    super();
    
    this.config = {
      dataPath: '.writerr/track-edits',
      backupPath: '.writerr/track-edits/backups',
      maxBackups: 10,
      compressionEnabled: true,
      encryptionEnabled: false,
      syncEnabled: false,
      chunkSize: 65536, // 64KB
      batchSize: 100,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    };

    this.storage = new ObsidianStorageAdapter(vault, this.config.dataPath);
    this.startHealthMonitoring();
  }

  /**
   * Initialize persistence manager
   */
  async initialize(): Promise<void> {
    try {
      await this.storage.initialize();
      await this.loadAuditLog();
      await this.performRecoveryCheck();
      
      this.emit('initialized');
    } catch (error) {
      throw new Error(`Persistence manager initialization failed: ${error.message}`);
    }
  }

  /**
   * Save document state
   */
  async saveDocumentState(documentState: DocumentState): Promise<void> {
    const key = `documents/${documentState.id}`;
    
    try {
      const serialized = await this.serializeDocumentState(documentState);
      const data = JSON.stringify(serialized);
      
      // Compress if enabled and data is large enough
      let finalData = data;
      if (this.config.compressionEnabled && data.length > this.config.chunkSize) {
        const compressed = await CompressionUtils.compress(data);
        if (compressed.ratio < 0.9) { // Only use compression if it saves at least 10%
          finalData = JSON.stringify({
            compressed: true,
            algorithm: compressed.algorithm,
            data: compressed
          });
        }
      }

      await this.storage.write(key, finalData);
      
      this.emit('documentSaved', { documentId: documentState.id });
      await this.addAuditEntry({
        id: this.generateAuditId(),
        timestamp: Date.now(),
        action: 'document_saved' as any,
        documentId: documentState.id,
        metadata: { size: finalData.length },
        success: true
      });
      
    } catch (error) {
      await this.addAuditEntry({
        id: this.generateAuditId(),
        timestamp: Date.now(),
        action: 'document_saved' as any,
        documentId: documentState.id,
        metadata: { error: error.message },
        success: false,
        error: error.message
      });
      
      throw new Error(`Failed to save document state: ${error.message}`);
    }
  }

  /**
   * Load document state
   */
  async loadDocumentState(documentId: string): Promise<DocumentState | null> {
    const key = `documents/${documentId}`;
    
    try {
      const data = await this.storage.read(key);
      if (!data) {
        return null;
      }

      let parsedData: any;
      try {
        parsedData = JSON.parse(data);
      } catch (error) {
        throw new Error('Invalid JSON data');
      }

      // Handle compressed data
      if (parsedData.compressed) {
        const decompressed = await CompressionUtils.decompress(parsedData.data, parsedData.algorithm);
        parsedData = JSON.parse(decompressed);
      }

      const documentState = await this.deserializeDocumentState(parsedData);
      
      this.emit('documentLoaded', { documentId });
      return documentState;
      
    } catch (error) {
      await this.addAuditEntry({
        id: this.generateAuditId(),
        timestamp: Date.now(),
        action: 'document_loaded' as any,
        documentId,
        metadata: { error: error.message },
        success: false,
        error: error.message
      });
      
      throw new Error(`Failed to load document state: ${error.message}`);
    }
  }

  /**
   * Delete document state
   */
  async deleteDocumentState(documentId: string): Promise<void> {
    const key = `documents/${documentId}`;
    
    try {
      await this.storage.delete(key);
      
      this.emit('documentDeleted', { documentId });
      await this.addAuditEntry({
        id: this.generateAuditId(),
        timestamp: Date.now(),
        action: 'document_deleted' as any,
        documentId,
        metadata: {},
        success: true
      });
      
    } catch (error) {
      await this.addAuditEntry({
        id: this.generateAuditId(),
        timestamp: Date.now(),
        action: 'document_deleted' as any,
        documentId,
        metadata: { error: error.message },
        success: false,
        error: error.message
      });
      
      throw new Error(`Failed to delete document state: ${error.message}`);
    }
  }

  /**
   * Create full backup
   */
  async createBackup(description?: string): Promise<StateBackup> {
    try {
      const backupId = this.generateBackupId();
      const timestamp = Date.now();
      
      // Collect all document states
      const documentKeys = await this.storage.list('documents/');
      const documents: Record<string, DocumentState> = {};
      
      for (const key of documentKeys) {
        const documentId = key.replace('documents/', '');
        const state = await this.loadDocumentState(documentId);
        if (state) {
          documents[documentId] = state;
        }
      }

      const backup: StateBackup = {
        id: backupId,
        timestamp,
        version: 1,
        documents,
        auditLog: [...this.auditLog],
        metadata: {
          totalDocuments: Object.keys(documents).length,
          totalChanges: Object.values(documents).reduce((sum, doc) => sum + doc.changes.size, 0),
          memoryUsage: 0,
          storageUsage: 0,
          lastCleanup: timestamp,
          crashRecoveryCount: 0,
          compressionRatio: 1.0
        },
        compressed: false,
        checksum: ''
      };

      const backupData = JSON.stringify(backup);
      backup.checksum = CompressionUtils.calculateChecksum(backupData);
      
      // Compress backup if enabled
      let finalBackupData = backupData;
      if (this.config.compressionEnabled) {
        const compressed = await CompressionUtils.compress(backupData);
        if (compressed.ratio < 0.9) {
          finalBackupData = JSON.stringify({
            compressed: true,
            algorithm: compressed.algorithm,
            data: compressed,
            originalChecksum: backup.checksum
          });
          backup.compressed = true;
        }
      }

      await this.storage.write(`backups/${backupId}`, finalBackupData);
      
      // Clean up old backups
      await this.cleanupOldBackups();
      
      this.emit('backupCreated', { backupId, size: finalBackupData.length });
      await this.addAuditEntry({
        id: this.generateAuditId(),
        timestamp,
        action: 'backup_created' as any,
        metadata: { backupId, description, size: finalBackupData.length },
        success: true
      });

      return backup;
      
    } catch (error) {
      await this.addAuditEntry({
        id: this.generateAuditId(),
        timestamp: Date.now(),
        action: 'backup_failed' as any,
        metadata: { error: error.message },
        success: false,
        error: error.message
      });
      
      throw new Error(`Backup creation failed: ${error.message}`);
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupId: string, options: RestoreOptions = { includeMetadata: true, includeAuditLog: true, validateIntegrity: true, skipCorrupted: false }): Promise<void> {
    try {
      const backupData = await this.storage.read(`backups/${backupId}`);
      if (!backupData) {
        throw new Error('Backup not found');
      }

      let backup: StateBackup;
      try {
        const parsedData = JSON.parse(backupData);
        
        // Handle compressed backup
        if (parsedData.compressed) {
          const decompressed = await CompressionUtils.decompress(parsedData.data, parsedData.algorithm);
          backup = JSON.parse(decompressed);
          
          // Validate integrity
          if (options.validateIntegrity && parsedData.originalChecksum) {
            if (!CompressionUtils.validateIntegrity(parsedData.originalChecksum, decompressed)) {
              throw new Error('Backup integrity validation failed');
            }
          }
        } else {
          backup = parsedData;
        }
      } catch (error) {
        throw new Error('Invalid backup data');
      }

      // Filter documents if specified
      let documentsToRestore = backup.documents;
      if (options.documentIds) {
        documentsToRestore = {};
        for (const docId of options.documentIds) {
          if (backup.documents[docId]) {
            documentsToRestore[docId] = backup.documents[docId];
          }
        }
      }

      // Restore documents
      for (const [documentId, state] of Object.entries(documentsToRestore)) {
        try {
          await this.saveDocumentState(state);
        } catch (error) {
          if (!options.skipCorrupted) {
            throw new Error(`Failed to restore document ${documentId}: ${error.message}`);
          }
        }
      }

      // Restore audit log if requested
      if (options.includeAuditLog) {
        this.auditLog = [...backup.auditLog];
        await this.saveAuditLog();
      }

      this.emit('backupRestored', { backupId, documentsRestored: Object.keys(documentsToRestore).length });
      await this.addAuditEntry({
        id: this.generateAuditId(),
        timestamp: Date.now(),
        action: 'backup_restored' as any,
        metadata: { backupId, documentsRestored: Object.keys(documentsToRestore).length },
        success: true
      });
      
    } catch (error) {
      await this.addAuditEntry({
        id: this.generateAuditId(),
        timestamp: Date.now(),
        action: 'backup_restore_failed' as any,
        metadata: { backupId, error: error.message },
        success: false,
        error: error.message
      });
      
      throw new Error(`Backup restore failed: ${error.message}`);
    }
  }

  /**
   * Perform crash recovery
   */
  async performCrashRecovery(): Promise<RecoveryManifest> {
    const recoveryStart = Date.now();
    const manifest: RecoveryManifest = {
      timestamp: recoveryStart,
      documents: [],
      transactions: [],
      backups: [],
      lastKnownGood: 0,
      corruption: []
    };

    try {
      // Check for incomplete transactions
      const transactionKeys = await this.storage.list('transactions/');
      for (const key of transactionKeys) {
        try {
          const transactionData = await this.storage.read(key);
          if (transactionData) {
            const transaction = JSON.parse(transactionData);
            if (transaction.status === 'pending') {
              await this.rollbackTransaction(transaction.id);
              manifest.transactions.push(transaction.id);
            }
          }
        } catch (error) {
          // Transaction data corrupted, remove it
          await this.storage.delete(key);
        }
      }

      // Validate document states
      const documentKeys = await this.storage.list('documents/');
      for (const key of documentKeys) {
        const documentId = key.replace('documents/', '');
        try {
          const state = await this.loadDocumentState(documentId);
          if (state) {
            manifest.documents.push(documentId);
          }
        } catch (error) {
          // Document corrupted
          manifest.corruption.push({
            documentId,
            type: this.classifyCorruption(error.message),
            severity: CorruptionSeverity.MODERATE,
            description: error.message,
            recoverable: await this.isRecoverable(documentId),
            backupAvailable: await this.hasBackup(documentId)
          });
        }
      }

      // Check available backups
      const backupKeys = await this.storage.list('backups/');
      manifest.backups = backupKeys.map(key => key.replace('backups/', ''));
      
      if (manifest.backups.length > 0) {
        // Find most recent valid backup
        const sortedBackups = manifest.backups.sort().reverse();
        for (const backupId of sortedBackups) {
          try {
            const backupData = await this.storage.read(`backups/${backupId}`);
            if (backupData) {
              const backup = JSON.parse(backupData);
              manifest.lastKnownGood = backup.timestamp;
              break;
            }
          } catch (error) {
            continue;
          }
        }
      }

      this.emit('recoveryCompleted', manifest);
      await this.addAuditEntry({
        id: this.generateAuditId(),
        timestamp: Date.now(),
        action: 'crash_recovery' as any,
        metadata: {
          documentsRecovered: manifest.documents.length,
          corruptionFound: manifest.corruption.length,
          duration: Date.now() - recoveryStart
        },
        success: true
      });

      return manifest;
      
    } catch (error) {
      await this.addAuditEntry({
        id: this.generateAuditId(),
        timestamp: Date.now(),
        action: 'recovery_failed' as any,
        metadata: { error: error.message },
        success: false,
        error: error.message
      });
      
      throw new Error(`Crash recovery failed: ${error.message}`);
    }
  }

  /**
   * Get persistence health status
   */
  async getHealth(): Promise<PersistenceHealth> {
    const issues: HealthIssue[] = [];
    const metrics = {
      storageUsed: 0,
      storageAvailable: Number.MAX_SAFE_INTEGER,
      averageWriteTime: 0,
      averageReadTime: 0,
      errorRate: 0,
      corruptionRate: 0,
      backupSuccessRate: 1.0,
      lastBackupTime: 0
    };

    try {
      // Check storage usage
      const stats = await this.storage.getStats();
      metrics.storageUsed = stats.totalSize;

      // Check for corruption
      const documentKeys = await this.storage.list('documents/');
      let corruptedCount = 0;
      
      for (const key of documentKeys) {
        const documentId = key.replace('documents/', '');
        try {
          await this.loadDocumentState(documentId);
        } catch (error) {
          corruptedCount++;
        }
      }

      if (corruptedCount > 0) {
        metrics.corruptionRate = corruptedCount / documentKeys.length;
        issues.push({
          id: 'corruption_detected',
          type: IssueType.CORRUPTION_DETECTED,
          severity: corruptedCount / documentKeys.length > 0.1 ? IssueSeverity.HIGH : IssueSeverity.MEDIUM,
          description: `${corruptedCount} corrupted documents found`,
          impact: 'Data loss possible',
          suggestion: 'Run data validation and restore from backup',
          autoFixable: false
        });
      }

      // Check backup freshness
      const backupKeys = await this.storage.list('backups/');
      if (backupKeys.length > 0) {
        const latestBackup = backupKeys.sort().reverse()[0];
        try {
          const backupData = await this.storage.read(`backups/${latestBackup}`);
          if (backupData) {
            const backup = JSON.parse(backupData);
            metrics.lastBackupTime = backup.timestamp;
            
            const daysSinceBackup = (Date.now() - backup.timestamp) / (1000 * 60 * 60 * 24);
            if (daysSinceBackup > 7) {
              issues.push({
                id: 'backup_outdated',
                type: IssueType.BACKUP_FAILED,
                severity: IssueSeverity.MEDIUM,
                description: `Last backup is ${Math.floor(daysSinceBackup)} days old`,
                impact: 'Limited recovery options',
                suggestion: 'Create a new backup',
                autoFixable: true
              });
            }
          }
        } catch (error) {
          // Backup corrupted
          issues.push({
            id: 'backup_corrupted',
            type: IssueType.BACKUP_FAILED,
            severity: IssueSeverity.HIGH,
            description: 'Latest backup is corrupted',
            impact: 'No reliable recovery option',
            suggestion: 'Create a new backup immediately',
            autoFixable: false
          });
        }
      } else {
        issues.push({
          id: 'no_backups',
          type: IssueType.BACKUP_FAILED,
          severity: IssueSeverity.HIGH,
          description: 'No backups available',
          impact: 'No recovery option if data is lost',
          suggestion: 'Create a backup immediately',
          autoFixable: true
        });
      }

      return {
        healthy: issues.filter(i => i.severity === IssueSeverity.HIGH || i.severity === IssueSeverity.CRITICAL).length === 0,
        lastCheck: Date.now(),
        issues,
        metrics,
        recommendations: issues.map(i => i.suggestion)
      };
      
    } catch (error) {
      return {
        healthy: false,
        lastCheck: Date.now(),
        issues: [{
          id: 'health_check_failed',
          type: IssueType.MISSING_DATA,
          severity: IssueSeverity.CRITICAL,
          description: 'Health check failed',
          impact: 'Cannot determine system status',
          suggestion: 'Check system configuration',
          autoFixable: false
        }],
        metrics,
        recommendations: ['Check system configuration and logs']
      };
    }
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    if (this.healthTimer) {
      clearInterval(this.healthTimer);
    }
    
    this.removeAllListeners();
  }

  // Private methods

  private async serializeDocumentState(state: DocumentState): Promise<SerializedDocumentState> {
    return {
      metadata: {
        version: 1,
        timestamp: Date.now(),
        documentId: state.id,
        size: JSON.stringify(state).length,
        compressed: false,
        encrypted: false,
        checksum: ''
      },
      changes: Array.from(state.changes.entries()),
      clusters: Array.from(state.clusters.entries()),
      sessions: Array.from(state.sessions.entries()),
      snapshots: state.snapshots,
      documentMetadata: state.metadata
    };
  }

  private async deserializeDocumentState(data: SerializedDocumentState): Promise<DocumentState> {
    return {
      id: data.metadata.documentId,
      filePath: '',
      lastModified: data.metadata.timestamp,
      version: data.metadata.version,
      changes: new Map(data.changes),
      clusters: new Map(data.clusters),
      sessions: new Map(data.sessions),
      snapshots: data.snapshots,
      metadata: data.documentMetadata
    };
  }

  private async addAuditEntry(entry: AuditLogEntry): Promise<void> {
    this.auditLog.push(entry);
    
    // Keep audit log size manageable
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-5000);
    }
    
    await this.saveAuditLog();
  }

  private async saveAuditLog(): Promise<void> {
    try {
      const data = JSON.stringify(this.auditLog);
      await this.storage.write('audit/log', data);
    } catch (error) {
      // Don't fail operations if audit log save fails
      console.error('Failed to save audit log:', error);
    }
  }

  private async loadAuditLog(): Promise<void> {
    try {
      const data = await this.storage.read('audit/log');
      if (data) {
        this.auditLog = JSON.parse(data);
      }
    } catch (error) {
      // Start with empty audit log if load fails
      this.auditLog = [];
    }
  }

  private async performRecoveryCheck(): Promise<void> {
    // Check if crash recovery is needed
    const recoveryMarker = await this.storage.read('recovery/marker');
    if (recoveryMarker) {
      await this.performCrashRecovery();
      await this.storage.delete('recovery/marker');
    }
    
    // Set new recovery marker
    await this.storage.write('recovery/marker', Date.now().toString());
  }

  private async rollbackTransaction(transactionId: string): Promise<void> {
    // Implementation for transaction rollback
    const transactionData = await this.storage.read(`transactions/${transactionId}`);
    if (transactionData) {
      const transaction = JSON.parse(transactionData);
      // Perform rollback operations
      await this.storage.delete(`transactions/${transactionId}`);
    }
  }

  private async cleanupOldBackups(): Promise<void> {
    const backupKeys = await this.storage.list('backups/');
    if (backupKeys.length > this.config.maxBackups) {
      const sortedBackups = backupKeys.sort();
      const toDelete = sortedBackups.slice(0, sortedBackups.length - this.config.maxBackups);
      
      for (const backupKey of toDelete) {
        await this.storage.delete(`backups/${backupKey}`);
      }
    }
  }

  private classifyCorruption(errorMessage: string): CorruptionType {
    if (errorMessage.includes('checksum')) return CorruptionType.CHECKSUM_MISMATCH;
    if (errorMessage.includes('JSON')) return CorruptionType.INVALID_JSON;
    if (errorMessage.includes('chunks')) return CorruptionType.MISSING_CHUNKS;
    if (errorMessage.includes('version')) return CorruptionType.VERSION_CONFLICT;
    return CorruptionType.TRUNCATED_DATA;
  }

  private async isRecoverable(documentId: string): Promise<boolean> {
    // Check if document has snapshots or backups available
    return await this.hasBackup(documentId);
  }

  private async hasBackup(documentId: string): Promise<boolean> {
    const backupKeys = await this.storage.list('backups/');
    
    for (const backupKey of backupKeys) {
      try {
        const backupData = await this.storage.read(`backups/${backupKey}`);
        if (backupData) {
          const backup = JSON.parse(backupData);
          if (backup.documents && backup.documents[documentId]) {
            return true;
          }
        }
      } catch (error) {
        continue;
      }
    }
    
    return false;
  }

  private startHealthMonitoring(): void {
    this.healthTimer = setInterval(async () => {
      try {
        const health = await this.getHealth();
        if (!health.healthy) {
          this.emit('healthIssue', health);
        }
      } catch (error) {
        this.emit('error', error);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  private generateAuditId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateBackupId(): string {
    return `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}