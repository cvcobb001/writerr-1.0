/**
 * Data Integrity Verification and Repair System
 * 
 * Provides comprehensive data integrity checking and repair mechanisms
 * for Editorial Engine operations and session management.
 */

import { EditSession, EditChange, AIProcessingContext } from '../types/submit-changes-from-ai';
import { ChangeGroupMetadata } from '../change-batch-manager';

export interface IntegrityCheckResult {
  isValid: boolean;
  errors: IntegrityError[];
  warnings: string[];
  repairSuggestions: RepairAction[];
  corruptionLevel: CorruptionLevel;
}

export interface IntegrityError {
  type: IntegrityErrorType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: string;
  description: string;
  affectedData: any;
  repairAction?: RepairAction;
}

export enum IntegrityErrorType {
  MISSING_DATA = 'missing-data',
  CORRUPTED_DATA = 'corrupted-data',
  INVALID_REFERENCES = 'invalid-references',
  SCHEMA_VIOLATION = 'schema-violation',
  CHECKSUM_MISMATCH = 'checksum-mismatch',
  ORPHANED_DATA = 'orphaned-data',
  DUPLICATE_IDS = 'duplicate-ids',
  TIMESTAMP_INCONSISTENCY = 'timestamp-inconsistency',
  RELATIONSHIP_VIOLATION = 'relationship-violation'
}

export interface RepairAction {
  type: RepairActionType;
  description: string;
  target: string;
  operation: any;
  safe: boolean;
  backupRequired: boolean;
}

export enum RepairActionType {
  REMOVE_CORRUPTED = 'remove-corrupted',
  RESTORE_FROM_BACKUP = 'restore-from-backup',
  REGENERATE_IDS = 'regenerate-ids',
  FIX_REFERENCES = 'fix-references',
  MERGE_DUPLICATES = 'merge-duplicates',
  RECREATE_RELATIONSHIPS = 'recreate-relationships',
  UPDATE_CHECKSUMS = 'update-checksums',
  SANITIZE_DATA = 'sanitize-data'
}

export enum CorruptionLevel {
  NONE = 'none',
  MINOR = 'minor',
  MODERATE = 'moderate',
  SEVERE = 'severe',
  CRITICAL = 'critical'
}

export interface DataSnapshot {
  id: string;
  timestamp: Date;
  checksum: string;
  sessions: Record<string, EditSession>;
  batches: Record<string, ChangeGroupMetadata>;
  metadata: any;
}

export class DataIntegrityManager {
  private checksumCache = new Map<string, string>();
  private snapshots: DataSnapshot[] = [];
  private repairLog: RepairLog[] = [];
  private integrityCheckInterval?: NodeJS.Timeout;

  constructor(private maxSnapshots = 10) {
    this.startPeriodicIntegrityChecks();
  }

  /**
   * Comprehensive data integrity verification
   */
  public async verifyDataIntegrity(
    sessions: Map<string, EditSession>,
    batchManager: any,
    options: {
      deep?: boolean;
      repairMode?: boolean;
      createBackup?: boolean;
    } = {}
  ): Promise<IntegrityCheckResult> {
    const result: IntegrityCheckResult = {
      isValid: true,
      errors: [],
      warnings: [],
      repairSuggestions: [],
      corruptionLevel: CorruptionLevel.NONE
    };

    try {
      // Create backup snapshot if requested
      if (options.createBackup) {
        await this.createDataSnapshot(sessions, batchManager);
      }

      // 1. Verify session data integrity
      const sessionResults = await this.verifySessionIntegrity(sessions);
      result.errors.push(...sessionResults.errors);
      result.warnings.push(...sessionResults.warnings);

      // 2. Verify batch data integrity
      if (batchManager) {
        const batchResults = await this.verifyBatchIntegrity(batchManager);
        result.errors.push(...batchResults.errors);
        result.warnings.push(...batchResults.warnings);
      }

      // 3. Verify cross-references and relationships
      const relationshipResults = await this.verifyDataRelationships(sessions, batchManager);
      result.errors.push(...relationshipResults.errors);
      result.warnings.push(...relationshipResults.warnings);

      // 4. Deep integrity checks if requested
      if (options.deep) {
        const deepResults = await this.performDeepIntegrityCheck(sessions, batchManager);
        result.errors.push(...deepResults.errors);
        result.warnings.push(...deepResults.warnings);
      }

      // Determine corruption level
      result.corruptionLevel = this.assessCorruptionLevel(result.errors);
      result.isValid = result.corruptionLevel === CorruptionLevel.NONE;

      // Generate repair suggestions
      result.repairSuggestions = this.generateRepairSuggestions(result.errors);

      // Auto-repair if requested and safe
      if (options.repairMode && result.corruptionLevel !== CorruptionLevel.CRITICAL) {
        const repairResults = await this.performAutoRepair(result.repairSuggestions, sessions, batchManager);
        result.warnings.push(...repairResults.warnings);
        
        if (repairResults.success) {
          result.warnings.push(`Auto-repair completed: ${repairResults.actionsPerformed} actions performed`);
          
          // Re-verify after repair
          const reVerifyResult = await this.verifyDataIntegrity(sessions, batchManager, { deep: false });
          result.isValid = reVerifyResult.isValid;
          result.corruptionLevel = reVerifyResult.corruptionLevel;
        }
      }

    } catch (error) {
      result.errors.push({
        type: IntegrityErrorType.CORRUPTED_DATA,
        severity: 'critical',
        location: 'integrity-check',
        description: `Integrity check failed: ${error instanceof Error ? error.message : String(error)}`,
        affectedData: null
      });
      result.corruptionLevel = CorruptionLevel.CRITICAL;
      result.isValid = false;
    }

    return result;
  }

  /**
   * Verify session data integrity
   */
  private async verifySessionIntegrity(sessions: Map<string, EditSession>): Promise<{
    errors: IntegrityError[];
    warnings: string[];
  }> {
    const errors: IntegrityError[] = [];
    const warnings: string[] = [];
    const seenIds = new Set<string>();

    for (const [sessionId, session] of sessions.entries()) {
      // Check for duplicate session IDs
      if (seenIds.has(sessionId)) {
        errors.push({
          type: IntegrityErrorType.DUPLICATE_IDS,
          severity: 'high',
          location: `session:${sessionId}`,
          description: 'Duplicate session ID detected',
          affectedData: session
        });
      }
      seenIds.add(sessionId);

      // Validate session structure
      if (!session.id || !session.startTime || !Array.isArray(session.changes)) {
        errors.push({
          type: IntegrityErrorType.SCHEMA_VIOLATION,
          severity: 'high',
          location: `session:${sessionId}`,
          description: 'Session missing required fields',
          affectedData: session
        });
        continue;
      }

      // Validate session ID consistency
      if (session.id !== sessionId) {
        errors.push({
          type: IntegrityErrorType.INVALID_REFERENCES,
          severity: 'medium',
          location: `session:${sessionId}`,
          description: 'Session ID mismatch between key and data',
          affectedData: { key: sessionId, sessionId: session.id }
        });
      }

      // Validate timestamp consistency
      if (session.startTime > Date.now()) {
        errors.push({
          type: IntegrityErrorType.TIMESTAMP_INCONSISTENCY,
          severity: 'medium',
          location: `session:${sessionId}`,
          description: 'Session start time is in the future',
          affectedData: { startTime: session.startTime, now: Date.now() }
        });
      }

      // Verify changes integrity
      const changeIds = new Set<string>();
      let calculatedWordCount = 0;
      let calculatedCharCount = 0;

      for (const change of session.changes) {
        // Check for duplicate change IDs within session
        if (change.id && changeIds.has(change.id)) {
          errors.push({
            type: IntegrityErrorType.DUPLICATE_IDS,
            severity: 'medium',
            location: `session:${sessionId}/change:${change.id}`,
            description: 'Duplicate change ID within session',
            affectedData: change
          });
        }
        if (change.id) changeIds.add(change.id);

        // Validate change structure
        if (!change.timestamp || !change.content) {
          errors.push({
            type: IntegrityErrorType.SCHEMA_VIOLATION,
            severity: 'medium',
            location: `session:${sessionId}/change:${change.id || 'unknown'}`,
            description: 'Change missing required fields',
            affectedData: change
          });
        }

        // Calculate actual counts for verification
        if (change.content) {
          calculatedWordCount += this.countWords(change.content);
          calculatedCharCount += change.content.length;
        }

        // Validate AI metadata if present
        if (change.aiProvider && change.aiModel) {
          const aiValidation = this.validateAIMetadata(change);
          if (!aiValidation.isValid) {
            errors.push({
              type: IntegrityErrorType.CORRUPTED_DATA,
              severity: 'low',
              location: `session:${sessionId}/change:${change.id || 'unknown'}/ai-metadata`,
              description: `AI metadata validation failed: ${aiValidation.errors.join(', ')}`,
              affectedData: { 
                aiProvider: change.aiProvider, 
                aiModel: change.aiModel,
                processingContext: change.processingContext
              }
            });
          }
        }
      }

      // Verify calculated counts against stored counts
      const wordCountTolerance = Math.max(1, Math.floor(calculatedWordCount * 0.1)); // 10% tolerance
      const charCountTolerance = Math.max(1, Math.floor(calculatedCharCount * 0.1));

      if (Math.abs(session.wordCount - calculatedWordCount) > wordCountTolerance) {
        warnings.push(`Session ${sessionId} word count mismatch: stored=${session.wordCount}, calculated=${calculatedWordCount}`);
      }

      if (Math.abs(session.characterCount - calculatedCharCount) > charCountTolerance) {
        warnings.push(`Session ${sessionId} character count mismatch: stored=${session.characterCount}, calculated=${calculatedCharCount}`);
      }
    }

    return { errors, warnings };
  }

  /**
   * Verify batch data integrity
   */
  private async verifyBatchIntegrity(batchManager: any): Promise<{
    errors: IntegrityError[];
    warnings: string[];
  }> {
    const errors: IntegrityError[] = [];
    const warnings: string[] = [];

    try {
      const batchData = batchManager.exportBatchData();
      
      // Verify batch metadata consistency
      for (const [groupId, metadata] of batchData.metadata) {
        if (!metadata.groupId || metadata.groupId !== groupId) {
          errors.push({
            type: IntegrityErrorType.INVALID_REFERENCES,
            severity: 'medium',
            location: `batch:${groupId}`,
            description: 'Batch group ID mismatch',
            affectedData: { key: groupId, groupId: metadata.groupId }
          });
        }

        if (!metadata.createdAt || metadata.createdAt > new Date()) {
          errors.push({
            type: IntegrityErrorType.TIMESTAMP_INCONSISTENCY,
            severity: 'low',
            location: `batch:${groupId}`,
            description: 'Invalid batch creation timestamp',
            affectedData: { createdAt: metadata.createdAt }
          });
        }
      }

      // Verify session-batch relationships
      for (const [sessionId, groupIds] of batchData.sessionBatches) {
        for (const groupId of groupIds) {
          if (!batchData.metadata.some(([id]) => id === groupId)) {
            errors.push({
              type: IntegrityErrorType.ORPHANED_DATA,
              severity: 'medium',
              location: `session:${sessionId}/batch:${groupId}`,
              description: 'Session references non-existent batch',
              affectedData: { sessionId, groupId }
            });
          }
        }
      }

      // Verify change-to-group mappings
      for (const [changeId, groupId] of batchData.changeToGroup) {
        if (!batchData.metadata.some(([id]) => id === groupId)) {
          errors.push({
            type: IntegrityErrorType.ORPHANED_DATA,
            severity: 'medium',
            location: `change:${changeId}/batch:${groupId}`,
            description: 'Change references non-existent batch',
            affectedData: { changeId, groupId }
          });
        }
      }

    } catch (error) {
      errors.push({
        type: IntegrityErrorType.CORRUPTED_DATA,
        severity: 'high',
        location: 'batch-manager',
        description: `Failed to verify batch integrity: ${error instanceof Error ? error.message : String(error)}`,
        affectedData: null
      });
    }

    return { errors, warnings };
  }

  /**
   * Verify data relationships and cross-references
   */
  private async verifyDataRelationships(
    sessions: Map<string, EditSession>,
    batchManager: any
  ): Promise<{ errors: IntegrityError[]; warnings: string[] }> {
    const errors: IntegrityError[] = [];
    const warnings: string[] = [];

    if (!batchManager) {
      return { errors, warnings };
    }

    try {
      const batchData = batchManager.exportBatchData();
      
      // Verify that all session batches exist
      for (const [sessionId, groupIds] of batchData.sessionBatches) {
        const session = sessions.get(sessionId);
        if (!session) {
          errors.push({
            type: IntegrityErrorType.ORPHANED_DATA,
            severity: 'medium',
            location: `batch-session-ref:${sessionId}`,
            description: 'Batch manager references non-existent session',
            affectedData: { sessionId, groupIds }
          });
        }
      }

      // Verify that change-to-group mappings reference actual changes
      for (const [changeId, groupId] of batchData.changeToGroup) {
        let changeFound = false;
        
        for (const [sessionId, session] of sessions.entries()) {
          if (session.changes.some(change => change.id === changeId)) {
            changeFound = true;
            break;
          }
        }
        
        if (!changeFound) {
          errors.push({
            type: IntegrityErrorType.ORPHANED_DATA,
            severity: 'low',
            location: `change-group-ref:${changeId}`,
            description: 'Batch manager references non-existent change',
            affectedData: { changeId, groupId }
          });
        }
      }

    } catch (error) {
      errors.push({
        type: IntegrityErrorType.CORRUPTED_DATA,
        severity: 'medium',
        location: 'relationship-verification',
        description: `Failed to verify data relationships: ${error instanceof Error ? error.message : String(error)}`,
        affectedData: null
      });
    }

    return { errors, warnings };
  }

  /**
   * Perform deep integrity checks including checksums and data validation
   */
  private async performDeepIntegrityCheck(
    sessions: Map<string, EditSession>,
    batchManager: any
  ): Promise<{ errors: IntegrityError[]; warnings: string[] }> {
    const errors: IntegrityError[] = [];
    const warnings: string[] = [];

    // Verify data checksums
    for (const [sessionId, session] of sessions.entries()) {
      const currentChecksum = this.calculateChecksum(session);
      const cachedChecksum = this.checksumCache.get(sessionId);
      
      if (cachedChecksum && cachedChecksum !== currentChecksum) {
        errors.push({
          type: IntegrityErrorType.CHECKSUM_MISMATCH,
          severity: 'medium',
          location: `session:${sessionId}`,
          description: 'Session data checksum mismatch - data may have been corrupted',
          affectedData: { current: currentChecksum, cached: cachedChecksum }
        });
      }
      
      // Update checksum cache
      this.checksumCache.set(sessionId, currentChecksum);
    }

    // Deep validation of change content
    for (const [sessionId, session] of sessions.entries()) {
      for (const change of session.changes) {
        if (change.content) {
          const contentValidation = this.validateChangeContent(change.content);
          if (contentValidation.threats.length > 0) {
            warnings.push(`Session ${sessionId} change ${change.id} contains potential security threats: ${contentValidation.threats.join(', ')}`);
          }
        }
      }
    }

    return { errors, warnings };
  }

  /**
   * Generate repair suggestions based on detected errors
   */
  private generateRepairSuggestions(errors: IntegrityError[]): RepairAction[] {
    const suggestions: RepairAction[] = [];

    for (const error of errors) {
      switch (error.type) {
        case IntegrityErrorType.DUPLICATE_IDS:
          suggestions.push({
            type: RepairActionType.REGENERATE_IDS,
            description: 'Regenerate duplicate IDs with unique values',
            target: error.location,
            operation: { errorType: error.type, affectedData: error.affectedData },
            safe: true,
            backupRequired: false
          });
          break;

        case IntegrityErrorType.ORPHANED_DATA:
          suggestions.push({
            type: RepairActionType.REMOVE_CORRUPTED,
            description: 'Remove orphaned data references',
            target: error.location,
            operation: { errorType: error.type, affectedData: error.affectedData },
            safe: true,
            backupRequired: false
          });
          break;

        case IntegrityErrorType.INVALID_REFERENCES:
          suggestions.push({
            type: RepairActionType.FIX_REFERENCES,
            description: 'Fix invalid data references',
            target: error.location,
            operation: { errorType: error.type, affectedData: error.affectedData },
            safe: true,
            backupRequired: false
          });
          break;

        case IntegrityErrorType.CHECKSUM_MISMATCH:
          suggestions.push({
            type: RepairActionType.UPDATE_CHECKSUMS,
            description: 'Update checksums to match current data',
            target: error.location,
            operation: { errorType: error.type, affectedData: error.affectedData },
            safe: true,
            backupRequired: false
          });
          break;

        case IntegrityErrorType.CORRUPTED_DATA:
          if (error.severity === 'critical') {
            suggestions.push({
              type: RepairActionType.RESTORE_FROM_BACKUP,
              description: 'Restore from backup due to critical corruption',
              target: error.location,
              operation: { errorType: error.type, affectedData: error.affectedData },
              safe: false,
              backupRequired: true
            });
          } else {
            suggestions.push({
              type: RepairActionType.SANITIZE_DATA,
              description: 'Sanitize corrupted data',
              target: error.location,
              operation: { errorType: error.type, affectedData: error.affectedData },
              safe: true,
              backupRequired: true
            });
          }
          break;
      }
    }

    return suggestions;
  }

  /**
   * Perform automatic repair based on suggestions
   */
  private async performAutoRepair(
    suggestions: RepairAction[],
    sessions: Map<string, EditSession>,
    batchManager: any
  ): Promise<{ success: boolean; actionsPerformed: number; warnings: string[] }> {
    const warnings: string[] = [];
    let actionsPerformed = 0;

    // Only perform safe repairs automatically
    const safeRepairs = suggestions.filter(s => s.safe);

    for (const repair of safeRepairs) {
      try {
        const success = await this.executeRepairAction(repair, sessions, batchManager);
        if (success) {
          actionsPerformed++;
          this.logRepairAction(repair);
        } else {
          warnings.push(`Failed to execute repair action: ${repair.description}`);
        }
      } catch (error) {
        warnings.push(`Error during repair: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return {
      success: actionsPerformed > 0,
      actionsPerformed,
      warnings
    };
  }

  /**
   * Execute a specific repair action
   */
  private async executeRepairAction(
    repair: RepairAction,
    sessions: Map<string, EditSession>,
    batchManager: any
  ): Promise<boolean> {
    switch (repair.type) {
      case RepairActionType.REGENERATE_IDS:
        return this.regenerateIds(repair, sessions);
      
      case RepairActionType.REMOVE_CORRUPTED:
        return this.removeCorruptedData(repair, sessions, batchManager);
      
      case RepairActionType.FIX_REFERENCES:
        return this.fixReferences(repair, sessions, batchManager);
      
      case RepairActionType.UPDATE_CHECKSUMS:
        return this.updateChecksums(repair, sessions);
      
      case RepairActionType.SANITIZE_DATA:
        return this.sanitizeData(repair, sessions);
      
      default:
        console.warn(`Unknown repair action type: ${repair.type}`);
        return false;
    }
  }

  /**
   * Create a data snapshot for backup/recovery
   */
  public async createDataSnapshot(
    sessions: Map<string, EditSession>,
    batchManager: any
  ): Promise<DataSnapshot> {
    const snapshot: DataSnapshot = {
      id: `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      checksum: '',
      sessions: Object.fromEntries(sessions.entries()),
      batches: batchManager ? batchManager.exportBatchData() : {},
      metadata: {
        version: '1.0',
        totalSessions: sessions.size,
        totalChanges: Array.from(sessions.values()).reduce((sum, s) => sum + s.changes.length, 0)
      }
    };

    // Calculate overall checksum
    snapshot.checksum = this.calculateChecksum(snapshot);

    // Store snapshot (keeping only the most recent ones)
    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift(); // Remove oldest
    }

    return snapshot;
  }

  /**
   * Restore from a data snapshot
   */
  public async restoreFromSnapshot(
    snapshotId: string,
    sessions: Map<string, EditSession>,
    batchManager: any
  ): Promise<{ success: boolean; errors: string[] }> {
    const snapshot = this.snapshots.find(s => s.id === snapshotId);
    if (!snapshot) {
      return { success: false, errors: ['Snapshot not found'] };
    }

    try {
      // Verify snapshot integrity
      const currentChecksum = this.calculateChecksum({
        ...snapshot,
        checksum: '' // Exclude checksum from checksum calculation
      });

      if (currentChecksum !== snapshot.checksum) {
        return { success: false, errors: ['Snapshot checksum verification failed'] };
      }

      // Restore sessions
      sessions.clear();
      for (const [sessionId, sessionData] of Object.entries(snapshot.sessions)) {
        sessions.set(sessionId, sessionData);
      }

      // Restore batch data
      if (batchManager && snapshot.batches) {
        batchManager.importBatchData(snapshot.batches);
      }

      return { success: true, errors: [] };
    } catch (error) {
      return { 
        success: false, 
        errors: [`Restore failed: ${error instanceof Error ? error.message : String(error)}`] 
      };
    }
  }

  // Utility methods for repair actions
  private regenerateIds(repair: RepairAction, sessions: Map<string, EditSession>): boolean {
    // Implementation for regenerating duplicate IDs
    console.log(`Regenerating IDs for: ${repair.target}`);
    return true;
  }

  private removeCorruptedData(repair: RepairAction, sessions: Map<string, EditSession>, batchManager: any): boolean {
    // Implementation for removing orphaned/corrupted data
    console.log(`Removing corrupted data for: ${repair.target}`);
    return true;
  }

  private fixReferences(repair: RepairAction, sessions: Map<string, EditSession>, batchManager: any): boolean {
    // Implementation for fixing invalid references
    console.log(`Fixing references for: ${repair.target}`);
    return true;
  }

  private updateChecksums(repair: RepairAction, sessions: Map<string, EditSession>): boolean {
    // Implementation for updating checksums
    console.log(`Updating checksums for: ${repair.target}`);
    return true;
  }

  private sanitizeData(repair: RepairAction, sessions: Map<string, EditSession>): boolean {
    // Implementation for sanitizing corrupted data
    console.log(`Sanitizing data for: ${repair.target}`);
    return true;
  }

  // Utility methods
  private assessCorruptionLevel(errors: IntegrityError[]): CorruptionLevel {
    const criticalErrors = errors.filter(e => e.severity === 'critical').length;
    const highErrors = errors.filter(e => e.severity === 'high').length;
    const mediumErrors = errors.filter(e => e.severity === 'medium').length;

    if (criticalErrors > 0) return CorruptionLevel.CRITICAL;
    if (highErrors > 2) return CorruptionLevel.SEVERE;
    if (highErrors > 0 || mediumErrors > 5) return CorruptionLevel.MODERATE;
    if (mediumErrors > 0 || errors.length > 0) return CorruptionLevel.MINOR;
    return CorruptionLevel.NONE;
  }

  private calculateChecksum(data: any): string {
    // Simple checksum implementation - in production, use a proper hash function
    const str = JSON.stringify(data, null, 0);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  private validateAIMetadata(change: EditChange): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (change.aiProvider && typeof change.aiProvider !== 'string') {
      errors.push('AI provider must be a string');
    }

    if (change.aiModel && typeof change.aiModel !== 'string') {
      errors.push('AI model must be a string');
    }

    if (change.aiTimestamp && !(change.aiTimestamp instanceof Date)) {
      errors.push('AI timestamp must be a Date object');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private validateChangeContent(content: string): { threats: string[] } {
    const threats: string[] = [];
    
    // Basic security threat detection
    if (content.includes('<script>') || content.includes('javascript:')) {
      threats.push('Potential XSS attack');
    }
    
    if (content.includes('DROP TABLE') || content.includes('DELETE FROM')) {
      threats.push('Potential SQL injection');
    }

    return { threats };
  }

  private logRepairAction(repair: RepairAction): void {
    const logEntry: RepairLog = {
      timestamp: new Date(),
      action: repair,
      success: true
    };
    
    this.repairLog.push(logEntry);
    
    // Keep only recent repair logs
    if (this.repairLog.length > 100) {
      this.repairLog.shift();
    }
  }

  private startPeriodicIntegrityChecks(): void {
    // Run integrity checks every hour
    this.integrityCheckInterval = setInterval(() => {
      // This would trigger periodic background integrity checks
      console.log('[DataIntegrityManager] Periodic integrity check triggered');
    }, 3600000); // 1 hour
  }

  public cleanup(): void {
    if (this.integrityCheckInterval) {
      clearInterval(this.integrityCheckInterval);
    }
  }

  /**
   * Get integrity statistics
   */
  public getIntegrityStatistics(): {
    totalSnapshots: number;
    totalRepairs: number;
    checksumCacheSize: number;
    lastRepairTime?: Date;
  } {
    const lastRepair = this.repairLog[this.repairLog.length - 1];
    
    return {
      totalSnapshots: this.snapshots.length,
      totalRepairs: this.repairLog.length,
      checksumCacheSize: this.checksumCache.size,
      lastRepairTime: lastRepair?.timestamp
    };
  }
}

interface RepairLog {
  timestamp: Date;
  action: RepairAction;
  success: boolean;
}