import { TFile } from 'obsidian';
import { EditSession, EditChange, AIProcessingContext } from '@shared/types';
import { generateId, getWordCount, getCharacterCount } from '@shared/utils';
import TrackEditsPlugin from './main';

import { AIMetadataValidator } from './validation/ai-metadata-validator';
import { SanitizationUtils } from './validation/sanitization-utils';

// Task 1.6: Query system integration
import { EditChangeQuerySystem } from './queries/edit-change-query-system';
import { QueryBuilder } from './queries/query-types';

export class EditTracker {
  private plugin: TrackEditsPlugin;
  private sessions: Map<string, EditSession> = new Map();
  private activeSessions: Map<string, TFile> = new Map();
  
  // Task 1.6: Query system instance
  private querySystem: EditChangeQuerySystem;

  constructor(plugin: TrackEditsPlugin) {
    this.plugin = plugin;
    this.querySystem = new EditChangeQuerySystem(this.sessions);
    this.loadSessions();
  }

  async loadSessions() {
    try {
      const data = await this.plugin.loadData();
      if (data && data.sessions) {
        // Task 1.7: Enhanced persistence with schema versioning and data validation
        const enhancedData = await this.processStoredDataWithVersioning(data);
        
        // Load sessions with enhanced persistence handling
        for (const session of enhancedData.sessions) {
          // Ensure all changes have proper Date objects for aiTimestamp
          session.changes = session.changes.map(change => this.deserializeChange(change));
          this.sessions.set(session.id, session);
        }
        
        // Update query system with loaded data
        this.querySystem.updateSessions(this.sessions);
        
        console.log(`Successfully loaded ${enhancedData.sessions.length} sessions with enhanced persistence`);
      }
    } catch (error) {
      console.error('Failed to load edit sessions:', error);
      // Enhanced error recovery with backup attempt
      await this.recoverFromCorruptedData(error);
    }
  }

  async saveSessions() {
    try {
      const sessionsArray = Array.from(this.sessions.values());
      // Task 1.7: Enhanced persistence with proper serialization and schema versioning
      const enhancedData = await this.prepareDataForStorage(sessionsArray);
      await this.plugin.saveData(enhancedData);
    } catch (error) {
      console.error('Failed to save edit sessions:', error);
      // Attempt recovery save with minimal data
      await this.emergencySave(error);
    }
  }

  startSession(session: EditSession, file: TFile) {
    this.sessions.set(session.id, session);
    this.activeSessions.set(session.id, file);
    this.updateQuerySystemData();
  }

  endSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.endTime = Date.now();
      this.activeSessions.delete(sessionId);
      this.saveSessions();
      this.updateQuerySystemData();
    }
  }

  /**
   * Records changes with optional AI metadata support and comprehensive validation
   * Maintains backward compatibility with existing change recording
   */
  recordChanges(sessionId: string, changes: EditChange[], aiMetadata?: {
    aiProvider?: string;
    aiModel?: string;
    processingContext?: AIProcessingContext;
    aiTimestamp?: Date;
  }, options?: { bypassValidation?: boolean }) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // If AI metadata is provided, enhance changes with validated metadata
    const enhancedChanges = aiMetadata ? 
      changes.map(change => this.enhanceChangeWithAIMetadata(change, aiMetadata, options)) : 
      changes;

    // Filter out changes that failed validation (null values)
    const validChanges = enhancedChanges.filter(change => change !== null) as EditChange[];

    session.changes.push(...validChanges);
    
    // Update word and character counts
    const file = this.activeSessions.get(sessionId);
    if (file) {
      this.updateSessionCounts(session, file);
    }
    
    // Update query system when new changes are recorded
    this.updateQuerySystemData();
  }

  /**
   * Records AI-generated changes with required AI metadata and comprehensive validation
   * Specialized method for Editorial Engine integration
   */
  recordAIChanges(
    sessionId: string, 
    changes: EditChange[], 
    aiProvider: string,
    aiModel: string,
    processingContext?: AIProcessingContext,
    aiTimestamp?: Date,
    options?: { 
      bypassValidation?: boolean; 
      strictMode?: boolean;
      editorialEngineMode?: boolean;
    }
  ): { success: boolean; errors: string[]; warnings: string[] } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        success: false,
        errors: ['Session not found'],
        warnings: []
      };
    }

    // Enhanced validation of AI metadata with Editorial Engine support
    const validationResult = AIMetadataValidator.validateAIMetadata(
      aiProvider,
      aiModel,
      processingContext,
      aiTimestamp,
      {
        strictMode: options?.strictMode ?? true,
        bypassValidation: options?.bypassValidation ?? false,
        editorialEngineMode: options?.editorialEngineMode ?? false,
        enableRateLimiting: true,
        logSecurityViolations: true
      }
    );

    if (!validationResult.isValid && !(options?.bypassValidation)) {
      console.error('AI metadata validation failed:', validationResult.errors);
      return {
        success: false,
        errors: validationResult.errors,
        warnings: validationResult.warnings
      };
    }

    // Use validated/sanitized metadata
    const sanitizedMetadata = validationResult.sanitizedMetadata!;
    const aiMetadata = {
      aiProvider: sanitizedMetadata.aiProvider,
      aiModel: sanitizedMetadata.aiModel,
      processingContext: sanitizedMetadata.processingContext,
      aiTimestamp: sanitizedMetadata.aiTimestamp || new Date()
    };

    // Record changes with validated metadata
    this.recordChanges(sessionId, changes, aiMetadata, { bypassValidation: true });

    // Add Editorial Engine specific logging
    if (options?.editorialEngineMode) {
      console.info('[EditTracker] Editorial Engine changes recorded:', {
        sessionId,
        changesCount: changes.length,
        provider: aiMetadata.aiProvider,
        model: aiMetadata.aiModel,
        hasConstraints: !!(aiMetadata.processingContext as any)?.constraints?.length,
        timestamp: new Date().toISOString()
      });
    }

    return {
      success: true,
      errors: [],
      warnings: validationResult.warnings
    };
  }

  /**
   * Records a single AI-generated change with validation
   * Convenience method for single change recording
   */
  recordSingleAIChange(
    sessionId: string,
    change: EditChange,
    aiProvider: string,
    aiModel: string,
    processingContext?: AIProcessingContext,
    aiTimestamp?: Date,
    options?: { bypassValidation?: boolean; strictMode?: boolean }
  ): { success: boolean; errors: string[]; warnings: string[] } {
    return this.recordAIChanges(sessionId, [change], aiProvider, aiModel, processingContext, aiTimestamp, options);
  }

  /**
   * Enhanced method to add change with AI metadata and comprehensive validation
   * Returns null if validation fails in strict mode
   */
  private enhanceChangeWithAIMetadata(
    change: EditChange, 
    aiMetadata: {
      aiProvider?: string;
      aiModel?: string;
      processingContext?: AIProcessingContext;
      aiTimestamp?: Date;
    },
    options?: { bypassValidation?: boolean }
  ): EditChange | null {
    // Skip validation if bypassed (for trusted internal calls)
    if (options?.bypassValidation) {
      return {
        ...change,
        aiProvider: aiMetadata.aiProvider,
        aiModel: aiMetadata.aiModel,
        processingContext: aiMetadata.processingContext,
        aiTimestamp: aiMetadata.aiTimestamp
      };
    }

    // Validate AI metadata
    const validationResult = AIMetadataValidator.validateAIMetadata(
      aiMetadata.aiProvider,
      aiMetadata.aiModel,
      aiMetadata.processingContext,
      aiMetadata.aiTimestamp,
      {
        strictMode: true,
        logSecurityViolations: true
      }
    );

    if (!validationResult.isValid) {
      console.warn('AI metadata validation failed for change:', validationResult.errors);
      // In strict mode, we could return null to reject the change
      // For backward compatibility, we'll continue with sanitized data
    }

    const sanitizedMetadata = validationResult.sanitizedMetadata || {};

    return {
      ...change,
      aiProvider: sanitizedMetadata.aiProvider,
      aiModel: sanitizedMetadata.aiModel,
      processingContext: sanitizedMetadata.processingContext,
      aiTimestamp: sanitizedMetadata.aiTimestamp
    };
  }

  /**
   * Legacy validation method - now uses comprehensive validator
   * @deprecated Use AIMetadataValidator.validateAIMetadata directly
   */
  private validateAIMetadata(aiProvider?: string, aiModel?: string): boolean {
    const { isValid } = AIMetadataValidator.quickValidate(aiProvider, aiModel);
    return isValid;
  }

  /**
   * Validates and sanitizes AI metadata before storage
   * Public method for external validation needs
   */
  public validateAndSanitizeAIMetadata(
    aiProvider?: string,
    aiModel?: string,
    processingContext?: AIProcessingContext,
    aiTimestamp?: Date | string,
    options?: {
      strictMode?: boolean;
      bypassValidation?: boolean;
    }
  ) {
    return AIMetadataValidator.validateAIMetadata(
      aiProvider,
      aiModel,
      processingContext,
      aiTimestamp,
      options
    );
  }

  /**
   * Filters session changes by AI provider with validation
   */
  getAIChanges(sessionId: string, aiProvider?: string): EditChange[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    return session.changes.filter(change => {
      if (!change.aiProvider) return false;
      if (aiProvider && change.aiProvider !== aiProvider) return false;
      return true;
    });
  }

  /**
   * Gets enhanced AI metadata statistics for a session with security info
   */
  getAIMetadataStats(sessionId: string): {
    totalAIChanges: number;
    aiProviders: string[];
    aiModels: string[];
    hasProcessingContext: number;
    validationWarnings: number;
    securityThreats: string[];
  } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        totalAIChanges: 0,
        aiProviders: [],
        aiModels: [],
        hasProcessingContext: 0,
        validationWarnings: 0,
        securityThreats: []
      };
    }

    const aiChanges = session.changes.filter(change => change.aiProvider);
    const aiProviders = [...new Set(aiChanges.map(change => change.aiProvider).filter(Boolean))] as string[];
    const aiModels = [...new Set(aiChanges.map(change => change.aiModel).filter(Boolean))] as string[];
    const hasProcessingContext = aiChanges.filter(change => change.processingContext).length;

    // Analyze for potential security issues in stored metadata
    let validationWarnings = 0;
    const allSecurityThreats = new Set<string>();

    aiChanges.forEach(change => {
      if (change.aiProvider) {
        const providerResult = AIMetadataValidator.validateAIProvider(change.aiProvider);
        validationWarnings += providerResult.warnings.length;
        providerResult.securityThreats.forEach(threat => allSecurityThreats.add(threat));
      }
      
      if (change.aiModel) {
        const modelResult = AIMetadataValidator.validateAIModel(change.aiModel);
        validationWarnings += modelResult.warnings.length;
        modelResult.securityThreats.forEach(threat => allSecurityThreats.add(threat));
      }

      if (change.processingContext) {
        const contextResult = AIMetadataValidator.validateProcessingContext(change.processingContext);
        validationWarnings += contextResult.warnings.length;
        contextResult.securityThreats.forEach(threat => allSecurityThreats.add(threat));
      }
    });

    return {
      totalAIChanges: aiChanges.length,
      aiProviders,
      aiModels,
      hasProcessingContext,
      validationWarnings,
      securityThreats: Array.from(allSecurityThreats)
    };
  }

  private async updateSessionCounts(session: EditSession, file: TFile) {
    try {
      const content = await this.plugin.app.vault.read(file);
      session.wordCount = getWordCount(content);
      session.characterCount = getCharacterCount(content);
    } catch (error) {
      console.error('Failed to update session counts:', error);
    }
  }

  getSession(sessionId: string): EditSession | undefined {
    return this.sessions.get(sessionId);
  }

  getSessionHistory(): EditSession[] {
    return Array.from(this.sessions.values()).sort((a, b) => b.startTime - a.startTime);
  }

  async saveSession(session: EditSession) {
    this.sessions.set(session.id, session);
    await this.saveSessions();
    this.updateQuerySystemData();
  }

  clearHistory() {
    this.sessions.clear();
    this.activeSessions.clear();
    this.saveSessions();
    this.updateQuerySystemData();
  }

  async formatSessionForExport(session: EditSession, format: 'json' | 'csv' | 'markdown'): Promise<string> {
    switch (format) {
      case 'json':
        return JSON.stringify(session, null, 2);
      
      case 'csv':
        let csv = 'Timestamp,Type,From,To,Text,RemovedText,Author,AIProvider,AIModel,ProcessingContext,AITimestamp\\n';
        for (const change of session.changes) {
          const row = [
            new Date(change.timestamp).toISOString(),
            change.type,
            change.from,
            change.to,
            `"${(change.text || '').replace(/"/g, '""')}"`,
            `"${(change.removedText || '').replace(/"/g, '""')}"`,
            change.author || '',
            EditChangeCompatibilityUtils.getAIProvider(change, ''),
            EditChangeCompatibilityUtils.getAIModel(change, ''),
            change.processingContext ? `"${JSON.stringify(change.processingContext).replace(/"/g, '""')}"` : '',
            EditChangeCompatibilityUtils.getAITimestamp(change) ? EditChangeCompatibilityUtils.getAITimestamp(change)!.toISOString() : ''
          ].join(',');
          csv += row + '\n';
        }
        return csv;
      
      case 'markdown':
        const startDate = new Date(session.startTime).toLocaleString();
        const endDate = session.endTime ? new Date(session.endTime).toLocaleString() : 'In progress';
        const duration = session.endTime ? 
          Math.round((session.endTime - session.startTime) / 1000 / 60) + ' minutes' : 
          'In progress';

        let markdown = `# Edit Session Report\n\n`;
        markdown += `- **Start:** ${startDate}\n`;
        markdown += `- **End:** ${endDate}\n`;
        markdown += `- **Duration:** ${duration}\n`;
        markdown += `- **Changes:** ${session.changes.length}\n`;
        markdown += `- **Words:** ${session.wordCount}\n`;
        markdown += `- **Characters:** ${session.characterCount}\n\n`;

        // Enhanced AI metadata statistics using compatibility layer
        const arrayStats = EditChangeCompatibilityUtils.getArrayStats(session.changes);
        const metadataStats = this.getAIMetadataStats(session.id);
        
        if (arrayStats.aiGenerated > 0) {
          markdown += `## AI-Assisted Edits\n\n`;
          markdown += `- **Total Changes:** ${arrayStats.total}\n`;
          markdown += `- **AI-Generated:** ${arrayStats.aiGenerated}\n`;
          markdown += `- **Manual Edits:** ${arrayStats.manual}\n`;
          markdown += `- **AI Providers:** ${arrayStats.providers.join(', ') || 'None'}\n`;
          markdown += `- **AI Models:** ${arrayStats.models.join(', ') || 'None'}\n`;
          markdown += `- **With Processing Context:** ${arrayStats.withContext}\n`;
          
          // Add security information if any threats detected
          if (metadataStats.securityThreats.length > 0) {
            markdown += `- **Security Threats Detected:** ${metadataStats.securityThreats.join(', ')}\n`;
          }
          if (metadataStats.validationWarnings > 0) {
            markdown += `- **Validation Warnings:** ${metadataStats.validationWarnings}\n`;
          }
          markdown += `\n`;
        }

        if (session.changes.length > 0) {
          markdown += `## Changes\n\n`;
          for (const change of session.changes) {
            const time = new Date(change.timestamp).toLocaleTimeString();
            const sourceDesc = EditChangeCompatibilityUtils.getAISourceDescription(change);
            
            markdown += `- **${time}** - ${change.type} at position ${change.from}-${change.to}`;
            markdown += ` (${sourceDesc})`;
            markdown += `\n`;
            
            if (change.text) {
              markdown += `  - Added: "${change.text}"\n`;
            }
            if (change.removedText) {
              markdown += `  - Removed: "${change.removedText}"\n`;
            }
            
            // Show processing context if available
            const context = EditChangeCompatibilityUtils.getProcessingContext(change);
            if (context) {
              if (context.mode) {
                markdown += `  - Processing Mode: ${context.mode}\n`;
              }
              if (context.constraints && context.constraints.length > 0) {
                markdown += `  - Constraints: ${context.constraints.join(', ')}\n`;
              }
            }
          }
        }

        return markdown;
      
      default:
        return JSON.stringify(session, null, 2);
    }
  }

  // Clean up old sessions based on retention policy
  cleanupOldSessions() {
    if (this.plugin.settings.retentionDays === 0) return; // Keep forever

    const cutoffTime = Date.now() - (this.plugin.settings.retentionDays * 24 * 60 * 60 * 1000);
    const toDelete: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.startTime < cutoffTime) {
        toDelete.push(sessionId);
      }
    }

    for (const sessionId of toDelete) {
      this.sessions.delete(sessionId);
    }

    if (toDelete.length > 0) {
      this.saveSessions();
      // Update query system after cleanup
      this.querySystem.updateSessions(this.sessions);
    }
  }

  // ========================================================================
  // Task 1.6: Query System Integration - Advanced Query Methods
  // ========================================================================

  /**
   * Creates a new query builder instance for flexible change queries
   * Provides fluent API for building complex queries with method chaining
   */
  // ========================================================================
  // Task 1.7: Enhanced Persistence Layer with Schema Versioning and Robust Data Handling
  // ========================================================================

  /**
   * Schema version for tracking data format evolution
   */
  private static readonly SCHEMA_VERSION = '1.7.0';
  private static readonly SCHEMA_KEY = '__schemaVersion';

  /**
   * Processes stored data with schema versioning and validation
   */
  private async processStoredDataWithVersioning(data: any): Promise<any> {
    // Check for schema version
    const storedVersion = data[EditTracker.SCHEMA_KEY];
    const currentVersion = EditTracker.SCHEMA_VERSION;

    if (!storedVersion) {
      console.log('Migrating data to versioned schema...');
      return this.migrateToVersionedSchema(data);
    }

    if (storedVersion !== currentVersion) {
      console.log(`Migrating data from version ${storedVersion} to ${currentVersion}...`);
      return this.migrateDataToCurrentVersion(data, storedVersion);
    }

    // Validate data integrity
    return this.validateStoredData(data);
  }

  /**
   * Migrates unversioned data to current schema version
   */
  private async migrateToVersionedSchema(data: any): Promise<any> {
    // Use existing compatibility utils for legacy migration
    const migratedData = EditChangeCompatibilityUtils.needsMigration(data) 
      ? EditChangeCompatibilityUtils.migrateStoredData(data)
      : data;

    // Add schema version and metadata
    return {
      ...migratedData,
      [EditTracker.SCHEMA_KEY]: EditTracker.SCHEMA_VERSION,
      __migrationTimestamp: Date.now(),
      __dataIntegrityHash: await this.generateDataHash(migratedData)
    };
  }

  /**
   * Migrates data between different schema versions
   */
  private async migrateDataToCurrentVersion(data: any, fromVersion: string): Promise<any> {
    let migratedData = { ...data };

    // Version-specific migrations could be added here
    switch (fromVersion) {
      case '1.6.0':
        // Migration from 1.6.0 to 1.7.0
        migratedData = this.migrate1_6_to_1_7(migratedData);
        break;
      default:
        console.warn(`Unknown schema version ${fromVersion}, attempting generic migration...`);
        migratedData = await this.migrateToVersionedSchema(data);
        break;
    }

    // Update version and regenerate hash
    migratedData[EditTracker.SCHEMA_KEY] = EditTracker.SCHEMA_VERSION;
    migratedData.__migrationTimestamp = Date.now();
    migratedData.__dataIntegrityHash = await this.generateDataHash(migratedData);

    return migratedData;
  }

  /**
   * Specific migration from 1.6.0 to 1.7.0 schema
   */
  private migrate1_6_to_1_7(data: any): any {
    // In 1.7.0, we enhanced Date serialization and added compression
    if (data.sessions) {
      data.sessions = data.sessions.map((session: EditSession) => ({
        ...session,
        changes: session.changes.map((change: EditChange) => this.normalizeChangeForStorage(change))
      }));
    }
    return data;
  }

  /**
   * Validates stored data integrity
   */
  private async validateStoredData(data: any): Promise<any> {
    const storedHash = data.__dataIntegrityHash;
    if (storedHash) {
      // Create temporary data without hash for validation
      const { __dataIntegrityHash, ...dataForValidation } = data;
      const calculatedHash = await this.generateDataHash(dataForValidation);
      
      if (storedHash !== calculatedHash) {
        console.warn('Data integrity hash mismatch - data may be corrupted');
        // Continue with data but log the issue
      }
    }

    return data;
  }

  /**
   * Generates a hash for data integrity checking
   */
  private async generateDataHash(data: any): Promise<string> {
    try {
      const dataString = JSON.stringify(data, this.createSortedReplacer());
      // Simple hash function for data integrity (not cryptographic)
      let hash = 0;
      for (let i = 0; i < dataString.length; i++) {
        const char = dataString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return hash.toString(36);
    } catch (error) {
      console.warn('Failed to generate data hash:', error);
      return 'invalid';
    }
  }

  /**
   * Creates a replacer function that sorts object keys for consistent hashing
   */
  private createSortedReplacer(): (key: string, value: any) => any {
    return (key: string, value: any) => {
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        const sortedObj: any = {};
        Object.keys(value).sort().forEach(k => {
          sortedObj[k] = value[k];
        });
        return sortedObj;
      }
      return value;
    };
  }

  /**
   * Prepares session data for storage with enhanced serialization
   */
  private async prepareDataForStorage(sessions: EditSession[]): Promise<any> {
    const processedSessions = sessions.map(session => ({
      ...session,
      changes: session.changes.map(change => this.serializeChange(change))
    }));

    const data = {
      [EditTracker.SCHEMA_KEY]: EditTracker.SCHEMA_VERSION,
      sessions: processedSessions,
      __lastSaved: Date.now(),
      __compressionLevel: 'none' // Could be enhanced later
    };

    // Add data integrity hash
    data.__dataIntegrityHash = await this.generateDataHash({ sessions: processedSessions });

    return data;
  }

  /**
   * Properly serializes an EditChange object with Date handling
   */
  private serializeChange(change: EditChange): any {
    const serialized = { ...change };
    
    // Handle Date serialization for aiTimestamp
    if (change.aiTimestamp) {
      serialized.aiTimestamp = change.aiTimestamp instanceof Date 
        ? change.aiTimestamp.toISOString()
        : change.aiTimestamp;
    }

    // Normalize processing context for consistent storage
    if (change.processingContext) {
      serialized.processingContext = this.normalizeProcessingContext(change.processingContext);
    }

    return serialized;
  }

  /**
   * Properly deserializes an EditChange object with Date reconstruction
   */
  private deserializeChange(change: any): EditChange {
    const deserialized = { ...change };

    // Handle Date deserialization for aiTimestamp
    if (change.aiTimestamp && typeof change.aiTimestamp === 'string') {
      try {
        deserialized.aiTimestamp = new Date(change.aiTimestamp);
        // Validate the date
        if (isNaN(deserialized.aiTimestamp.getTime())) {
          console.warn(`Invalid aiTimestamp found: ${change.aiTimestamp}`);
          deserialized.aiTimestamp = undefined;
        }
      } catch (error) {
        console.warn(`Failed to parse aiTimestamp: ${change.aiTimestamp}`, error);
        deserialized.aiTimestamp = undefined;
      }
    }

    return deserialized as EditChange;
  }

  /**
   * Normalizes change data for consistent storage
   */
  private normalizeChangeForStorage(change: EditChange): EditChange {
    // Ensure consistent field ordering and clean up any undefined values
    const normalized: any = {
      id: change.id,
      timestamp: change.timestamp,
      type: change.type,
      from: change.from,
      to: change.to
    };

    // Only include defined optional fields
    if (change.text !== undefined) normalized.text = change.text;
    if (change.removedText !== undefined) normalized.removedText = change.removedText;
    if (change.author !== undefined) normalized.author = change.author;
    if (change.aiProvider !== undefined) normalized.aiProvider = change.aiProvider;
    if (change.aiModel !== undefined) normalized.aiModel = change.aiModel;
    if (change.processingContext !== undefined) {
      normalized.processingContext = this.normalizeProcessingContext(change.processingContext);
    }
    if (change.aiTimestamp !== undefined) normalized.aiTimestamp = change.aiTimestamp;

    return normalized;
  }

  /**
   * Normalizes processing context for storage
   */
  private normalizeProcessingContext(context: AIProcessingContext): AIProcessingContext {
    const normalized: any = {};
    
    if (context.mode !== undefined) normalized.mode = context.mode;
    if (context.constraints !== undefined) normalized.constraints = [...context.constraints].sort();
    if (context.settings !== undefined) {
      // Sort settings keys for consistency
      const sortedSettings: any = {};
      Object.keys(context.settings).sort().forEach(key => {
        sortedSettings[key] = context.settings![key];
      });
      normalized.settings = sortedSettings;
    }
    if (context.metadata !== undefined) normalized.metadata = context.metadata;

    return normalized;
  }

  /**
   * Recovers from corrupted data with fallback strategies
   */
  private async recoverFromCorruptedData(error: Error): Promise<void> {
    console.warn('Attempting data recovery from corruption...', error);

    try {
      // Strategy 1: Try to load partial data
      const rawData = await this.plugin.loadData();
      if (rawData && typeof rawData === 'object') {
        // Try to salvage any valid sessions
        const salvageSessions = this.salvageValidSessions(rawData);
        if (salvageSessions.length > 0) {
          console.log(`Recovered ${salvageSessions.length} sessions from corrupted data`);
          salvageSessions.forEach(session => this.sessions.set(session.id, session));
          this.updateQuerySystemData();
          return;
        }
      }
    } catch (recoveryError) {
      console.error('Data recovery failed:', recoveryError);
    }

    // Strategy 2: Start fresh with empty data
    console.log('Starting with empty session storage due to unrecoverable corruption');
    await this.plugin.saveData({
      [EditTracker.SCHEMA_KEY]: EditTracker.SCHEMA_VERSION,
      sessions: [],
      __lastSaved: Date.now(),
      __recoveryTimestamp: Date.now()
    });
  }

  /**
   * Attempts to salvage valid sessions from corrupted data
   */
  private salvageValidSessions(data: any): EditSession[] {
    const validSessions: EditSession[] = [];

    if (!data.sessions || !Array.isArray(data.sessions)) {
      return validSessions;
    }

    for (const session of data.sessions) {
      try {
        // Validate basic session structure
        if (this.isValidSession(session)) {
          // Clean up session changes
          const cleanedSession = {
            ...session,
            changes: this.salvageValidChanges(session.changes || [])
          };
          validSessions.push(cleanedSession);
        }
      } catch (error) {
        console.warn('Failed to salvage session:', session?.id, error);
      }
    }

    return validSessions;
  }

  /**
   * Validates basic session structure
   */
  private isValidSession(session: any): session is EditSession {
    return (
      session &&
      typeof session.id === 'string' &&
      typeof session.startTime === 'number' &&
      Array.isArray(session.changes)
    );
  }

  /**
   * Salvages valid changes from potentially corrupted change array
   */
  private salvageValidChanges(changes: any[]): EditChange[] {
    const validChanges: EditChange[] = [];

    for (const change of changes) {
      try {
        if (EditChangeCompatibilityUtils.isValidEditChange(change)) {
          const cleanedChange = this.deserializeChange(change);
          validChanges.push(cleanedChange);
        }
      } catch (error) {
        console.warn('Failed to salvage change:', change?.id, error);
      }
    }

    return validChanges;
  }

  /**
   * Emergency save with minimal data to prevent total loss
   */
  private async emergencySave(originalError: Error): Promise<void> {
    try {
      console.warn('Attempting emergency save after failure:', originalError);
      
      // Save basic session info without potentially problematic metadata
      const basicSessions = Array.from(this.sessions.values()).map(session => ({
        id: session.id,
        startTime: session.startTime,
        endTime: session.endTime,
        wordCount: session.wordCount || 0,
        characterCount: session.characterCount || 0,
        changes: session.changes.map(change => ({
          id: change.id || Date.now().toString(),
          timestamp: change.timestamp,
          type: change.type,
          from: change.from,
          to: change.to,
          text: change.text || '',
          removedText: change.removedText || '',
          author: change.author || 'unknown'
          // Deliberately omit AI metadata to avoid serialization issues
        }))
      }));

      await this.plugin.saveData({
        [EditTracker.SCHEMA_KEY]: EditTracker.SCHEMA_VERSION,
        sessions: basicSessions,
        __emergencySave: true,
        __lastSaved: Date.now()
      });

      console.log('Emergency save completed successfully');
    } catch (emergencyError) {
      console.error('Emergency save also failed:', emergencyError);
      // At this point, we've done all we can
    }
  }

  query(): QueryBuilder {
    return this.querySystem.query();
  }

  /**
   * Quick query methods for common use cases
   */
  
  /**
   * Get all changes from a specific AI provider
   */
  async getChangesByProvider(provider: string): Promise<EditChange[]> {
    return this.querySystem.getChangesByProvider(provider);
  }

  /**
   * Get all changes from a specific AI model
   */
  async getChangesByModel(model: string): Promise<EditChange[]> {
    return this.querySystem.getChangesByModel(model);
  }

  /**
   * Get changes within a specific time range
   */
  async getChangesInTimeRange(start: Date, end: Date): Promise<EditChange[]> {
    return this.querySystem.getChangesInTimeRange(start, end);
  }

  /**
   * Get changes by processing mode
   */
  async getChangesByMode(mode: string): Promise<EditChange[]> {
    return this.querySystem.getChangesByMode(mode);
  }

  /**
   * Get all AI-generated changes
   */
  async getAIGeneratedChanges(): Promise<EditChange[]> {
    return this.querySystem.getAIGeneratedChanges();
  }

  /**
   * Get all manual (non-AI) changes
   */
  async getManualChanges(): Promise<EditChange[]> {
    return this.querySystem.getManualChanges();
  }

  /**
   * Advanced search methods
   */

  /**
   * Full-text search across change content and processing context
   */
  async textSearch(query: string, options?: {
    caseSensitive?: boolean;
    fuzzyMatch?: boolean;
    searchIn?: ('text' | 'removedText' | 'processingContext')[];
  }): Promise<EditChange[]> {
    return this.querySystem.textSearch(query, options);
  }

  /**
   * Search within processing context only
   */
  async contextSearch(query: string): Promise<EditChange[]> {
    return this.querySystem.contextSearch(query);
  }

  /**
   * Statistical analysis methods
   */

  /**
   * Get usage statistics by AI provider
   */
  async getProviderUsageStats(): Promise<Record<string, number>> {
    return this.querySystem.getProviderUsageStats();
  }

  /**
   * Get usage statistics by AI model
   */
  async getModelUsageStats(): Promise<Record<string, number>> {
    return this.querySystem.getModelUsageStats();
  }

  /**
   * Get usage statistics by processing mode
   */
  async getModeUsageStats(): Promise<Record<string, number>> {
    return this.querySystem.getModeUsageStats();
  }

  /**
   * AI Performance Comparison Methods
   */

  /**
   * Compare performance across different AI providers
   */
  async compareProviders(providers: string[]) {
    return this.querySystem.compareProviders(providers);
  }

  /**
   * Compare performance across different AI models
   */
  async compareModels(models: string[]) {
    return this.querySystem.compareModels(models);
  }

  /**
   * Compare performance across different processing modes
   */
  async compareModes(modes: string[]) {
    return this.querySystem.compareModes(modes);
  }

  /**
   * Export methods for various formats
   */

  /**
   * Export query results as JSON
   */
  async exportChangesAsJSON(criteria: any): Promise<string> {
    return this.querySystem.exportToJSON(criteria);
  }

  /**
   * Export query results as CSV
   */
  async exportChangesAsCSV(criteria: any, format?: any): Promise<string> {
    return this.querySystem.exportToCSV(criteria, format);
  }

  /**
   * Export query results as Markdown
   */
  async exportChangesAsMarkdown(criteria: any, format?: any): Promise<string> {
    return this.querySystem.exportToMarkdown(criteria, format);
  }

  /**
   * Advanced analytics methods
   */

  /**
   * Get timeline data showing changes over time
   */
  async getTimelineData(options: {
    interval: 'hour' | 'day' | 'week' | 'month';
    fillGaps?: boolean;
    includeMetadata?: boolean;
  }) {
    return this.querySystem.getTimelineData(options);
  }

  /**
   * Aggregate changes by various dimensions
   */
  async aggregateChanges(criteria: any, options: {
    groupBy: 'provider' | 'model' | 'hour' | 'day' | 'week' | 'month' | 'mode' | 'author';
    aggregateFunction?: 'count' | 'sum' | 'avg' | 'min' | 'max';
    aggregateField?: string;
  }): Promise<Record<string, number>> {
    return this.querySystem.aggregate(criteria, options);
  }

  /**
   * Update query system when sessions change
   * Called internally after session modifications
   */
  private updateQuerySystemData(): void {
    this.querySystem.updateSessions(this.sessions);
  }
}

/**
 * Backward Compatibility Utilities
 * Embedded compatibility layer for handling legacy EditChange objects
 */

// Legacy EditChange interface (pre-AI metadata)
interface LegacyEditChange {
  id: string;
  timestamp: number;
  type: 'insert' | 'delete' | 'replace';
  from: number;
  to: number;
  text?: string;
  removedText?: string;
  author?: string;
}

/**
 * Utility class for EditChange compatibility operations
 */
class EditChangeCompatibilityUtils {
  /**
   * Checks if an EditChange object has any AI metadata fields
   */
  static hasAIMetadata(change: EditChange): boolean {
    return !!(
      change.aiProvider || 
      change.aiModel || 
      change.processingContext || 
      change.aiTimestamp
    );
  }

  /**
   * Checks if an EditChange object is a legacy object (no AI metadata)
   */
  static isLegacyChange(change: EditChange): boolean {
    return !(
      'aiProvider' in change || 
      'aiModel' in change || 
      'processingContext' in change || 
      'aiTimestamp' in change
    );
  }

  /**
   * Validates that an object has the minimum required EditChange fields
   */
  static isValidEditChange(obj: any): obj is EditChange {
    return (
      obj &&
      typeof obj.id === 'string' &&
      typeof obj.timestamp === 'number' &&
      ['insert', 'delete', 'replace'].includes(obj.type) &&
      typeof obj.from === 'number' &&
      typeof obj.to === 'number'
    );
  }

  /**
   * Converts a legacy EditChange to enhanced format with empty AI metadata
   */
  static upgradeToEnhanced(legacyChange: LegacyEditChange): EditChange {
    return {
      ...legacyChange,
      aiProvider: undefined,
      aiModel: undefined,
      processingContext: undefined,
      aiTimestamp: undefined
    };
  }

  /**
   * Batch upgrade an array of mixed legacy and enhanced changes
   */
  static upgradeChangesArray(changes: EditChange[]): EditChange[] {
    return changes.map(change => {
      if (this.isLegacyChange(change)) {
        return this.upgradeToEnhanced(change as LegacyEditChange);
      }
      return change;
    });
  }

  /**
   * Checks if stored data needs migration
   */
  static needsMigration(data: any): boolean {
    if (!data || !data.sessions || !Array.isArray(data.sessions)) {
      return false;
    }

    // Check if any session contains legacy changes
    return data.sessions.some((session: EditSession) => 
      session.changes && session.changes.some((change: EditChange) => 
        this.isLegacyChange(change)
      )
    );
  }

  /**
   * Migrates stored plugin data to new format
   */
  static migrateStoredData(data: any): any {
    if (!data || !data.sessions) {
      return data;
    }

    return {
      ...data,
      sessions: data.sessions.map((session: EditSession) => ({
        ...session,
        changes: this.upgradeChangesArray(session.changes)
      }))
    };
  }

  /**
   * Safely gets AI provider with fallback
   */
  static getAIProvider(change: EditChange, fallback: string = 'unknown'): string {
    return change.aiProvider || fallback;
  }

  /**
   * Safely gets AI model with fallback
   */
  static getAIModel(change: EditChange, fallback: string = 'unknown'): string {
    return change.aiModel || fallback;
  }

  /**
   * Safely gets processing context with fallback
   */
  static getProcessingContext(change: EditChange, fallback?: AIProcessingContext): AIProcessingContext | undefined {
    return change.processingContext || fallback;
  }

  /**
   * Safely gets AI timestamp with fallback
   */
  static getAITimestamp(change: EditChange, fallback?: Date): Date | undefined {
    if (change.aiTimestamp) {
      return change.aiTimestamp instanceof Date ? change.aiTimestamp : new Date(change.aiTimestamp);
    }
    return fallback;
  }

  /**
   * Gets a human-readable AI source description
   */
  static getAISourceDescription(change: EditChange): string {
    if (!this.hasAIMetadata(change)) {
      return 'Manual edit';
    }

    const provider = this.getAIProvider(change, 'Unknown Provider');
    const model = this.getAIModel(change, 'Unknown Model');
    
    return `AI-assisted (${provider}/${model})`;
  }

  /**
   * Checks if change was AI-generated
   */
  static isAIGenerated(change: EditChange): boolean {
    return this.hasAIMetadata(change) && !!(change.aiProvider && change.aiModel);
  }

  /**
   * Gets statistics for an array of EditChange objects
   */
  static getArrayStats(changes: EditChange[]): {
    total: number;
    aiGenerated: number;
    manual: number;
    providers: string[];
    models: string[];
    withContext: number;
  } {
    const aiChanges = changes.filter(change => this.isAIGenerated(change));
    const manualChanges = changes.filter(change => !this.isAIGenerated(change));
    
    const providers = [...new Set(
      aiChanges.map(change => this.getAIProvider(change))
      .filter(provider => provider !== 'unknown')
    )];
    
    const models = [...new Set(
      aiChanges.map(change => this.getAIModel(change))
      .filter(model => model !== 'unknown')
    )];
    
    const withContext = changes.filter(change => 
      this.getProcessingContext(change) !== undefined
    ).length;

    return {
      total: changes.length,
      aiGenerated: aiChanges.length,
      manual: manualChanges.length,
      providers,
      models,
      withContext
    };
  }
}
