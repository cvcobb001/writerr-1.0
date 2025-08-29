/**
 * Backward Compatibility Layer for EditChange Objects
 * 
 * This module provides utilities for handling legacy EditChange objects
 * that don't include AI metadata fields, ensuring seamless operation
 * between old and new data structures.
 * 
 * Key Features:
 * - Type guards to identify legacy vs enhanced EditChange objects
 * - Migration utilities to upgrade legacy data structures
 * - Safe access functions with proper fallbacks
 * - Validation and data integrity checks
 */

import { EditChange, AIProcessingContext, EditSession } from '@shared/types';

// Legacy EditChange interface (pre-AI metadata)
export interface LegacyEditChange {
  id: string;
  timestamp: number;
  type: 'insert' | 'delete' | 'replace';
  from: number;
  to: number;
  text?: string;
  removedText?: string;
  author?: string;
}

// Enhanced EditChange with all AI metadata (for type checking)
export interface EnhancedEditChange extends EditChange {
  aiProvider?: string;
  aiModel?: string;
  processingContext?: AIProcessingContext;
  aiTimestamp?: Date;
}

/**
 * Type guards for identifying EditChange variants
 */
export class EditChangeTypeGuards {
  
  /**
   * Checks if an EditChange object has any AI metadata fields
   */
  static hasAIMetadata(change: EditChange): change is EnhancedEditChange {
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
  static isLegacyChange(change: EditChange): change is LegacyEditChange {
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
    if (!obj || obj === null || obj === undefined) {
      return false;
    }
    
    return (
      typeof obj.id === 'string' &&
      typeof obj.timestamp === 'number' &&
      ['insert', 'delete', 'replace'].includes(obj.type) &&
      typeof obj.from === 'number' &&
      typeof obj.to === 'number'
    );
  }

  /**
   * Checks if an EditChange has complete AI metadata
   */
  static hasCompleteAIMetadata(change: EditChange): boolean {
    return !!(change.aiProvider && change.aiModel);
  }
}

/**
 * Migration utilities for upgrading legacy data structures
 */
export class EditChangeMigration {

  /**
   * Converts a legacy EditChange to enhanced format with empty AI metadata
   */
  static upgradeToEnhanced(legacyChange: LegacyEditChange): EnhancedEditChange {
    const enhanced: any = { ...legacyChange };
    
    // Set AI properties to undefined to satisfy type guards
    enhanced.aiProvider = undefined;
    enhanced.aiModel = undefined;
    enhanced.processingContext = undefined;
    enhanced.aiTimestamp = undefined;
    
    return enhanced as EnhancedEditChange;
  }

  /**
   * Batch upgrade an array of mixed legacy and enhanced changes
   */
  static upgradeChangesArray(changes: (LegacyEditChange | EnhancedEditChange)[]): EnhancedEditChange[] {
    return changes.map(change => {
      if (EditChangeTypeGuards.isLegacyChange(change)) {
        return this.upgradeToEnhanced(change);
      }
      return change as EnhancedEditChange;
    });
  }

  /**
   * Migrates an entire EditSession to use enhanced EditChange objects
   */
  static migrateEditSession(session: EditSession): EditSession {
    return {
      ...session,
      changes: this.upgradeChangesArray(session.changes)
    };
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
      sessions: data.sessions.map((session: EditSession) => this.migrateEditSession(session))
    };
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
        EditChangeTypeGuards.isLegacyChange(change)
      )
    );
  }
}

/**
 * Safe access utilities with fallbacks for mixed data
 */
export class EditChangeAccessor {

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
    if (!EditChangeTypeGuards.hasAIMetadata(change)) {
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
    return EditChangeTypeGuards.hasAIMetadata(change) && 
           EditChangeTypeGuards.hasCompleteAIMetadata(change);
  }

  /**
   * Gets change metadata summary
   */
  static getChangeMetadataSummary(change: EditChange): {
    isAI: boolean;
    provider?: string;
    model?: string;
    hasContext: boolean;
    timestamp?: Date;
  } {
    const result: {
      isAI: boolean;
      provider?: string;
      model?: string;
      hasContext: boolean;
      timestamp?: Date;
    } = {
      isAI: this.isAIGenerated(change),
      hasContext: !!change.processingContext
    };

    if (change.aiProvider) {
      result.provider = change.aiProvider;
    }
    if (change.aiModel) {
      result.model = change.aiModel;
    }
    const timestamp = this.getAITimestamp(change);
    if (timestamp) {
      result.timestamp = timestamp;
    }

    return result;
  }
}

/**
 * Array manipulation utilities for mixed EditChange arrays
 */
export class EditChangeArrayUtils {

  /**
   * Safely merges two arrays of mixed EditChange objects
   */
  static mergeChangesArrays(
    array1: EditChange[], 
    array2: EditChange[]
  ): EnhancedEditChange[] {
    const combined = [...array1, ...array2];
    return EditChangeMigration.upgradeChangesArray(combined);
  }

  /**
   * Filters changes by AI status (AI-generated vs manual)
   */
  static filterByAIStatus(changes: EditChange[], aiOnly: boolean = true): EditChange[] {
    return changes.filter(change => 
      aiOnly ? EditChangeAccessor.isAIGenerated(change) : !EditChangeAccessor.isAIGenerated(change)
    );
  }

  /**
   * Groups changes by AI provider
   */
  static groupByAIProvider(changes: EditChange[]): Map<string, EditChange[]> {
    const groups = new Map<string, EditChange[]>();
    
    for (const change of changes) {
      const provider = EditChangeAccessor.getAIProvider(change, 'manual');
      
      if (!groups.has(provider)) {
        groups.set(provider, []);
      }
      
      groups.get(provider)!.push(change);
    }
    
    return groups;
  }

  /**
   * Gets statistics for an array of mixed EditChange objects
   */
  static getArrayStats(changes: EditChange[]): {
    total: number;
    aiGenerated: number;
    manual: number;
    providers: string[];
    models: string[];
    withContext: number;
  } {
    const aiChanges = this.filterByAIStatus(changes, true);
    const manualChanges = this.filterByAIStatus(changes, false);
    
    const providers = [...new Set(
      aiChanges.map(change => EditChangeAccessor.getAIProvider(change))
      .filter(provider => provider !== 'unknown')
    )];
    
    const models = [...new Set(
      aiChanges.map(change => EditChangeAccessor.getAIModel(change))
      .filter(model => model !== 'unknown')
    )];
    
    const withContext = changes.filter(change => 
      EditChangeAccessor.getProcessingContext(change) !== undefined
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

  /**
   * Validates an array of EditChange objects
   */
  static validateChangesArray(changes: any[]): { 
    valid: EditChange[]; 
    invalid: any[]; 
    errors: string[] 
  } {
    const valid: EditChange[] = [];
    const invalid: any[] = [];
    const errors: string[] = [];

    for (let i = 0; i < changes.length; i++) {
      const change = changes[i];
      
      if (EditChangeTypeGuards.isValidEditChange(change)) {
        valid.push(change);
      } else {
        invalid.push(change);
        errors.push(`Invalid EditChange at index ${i}: Missing required fields or incorrect types`);
      }
    }

    return { valid, invalid, errors };
  }
}

/**
 * Data serialization utilities with backward compatibility
 */
export class EditChangeSerializer {

  /**
   * Serializes EditChange objects with backward compatibility metadata
   */
  static serialize(changes: EditChange[]): string {
    const serializedData = {
      version: '1.4.0', // Track data format version
      migratedAt: new Date().toISOString(),
      changes: changes.map(change => {
        // Ensure dates are serializable
        if (change.aiTimestamp && change.aiTimestamp instanceof Date) {
          return {
            ...change,
            aiTimestamp: change.aiTimestamp.toISOString()
          };
        }
        return change;
      })
    };

    return JSON.stringify(serializedData, null, 2);
  }

  /**
   * Deserializes data with automatic migration if needed
   */
  static deserialize(data: string): EditChange[] {
    try {
      const parsed = JSON.parse(data);
      
      // Handle legacy format (direct array)
      if (Array.isArray(parsed)) {
        const validation = EditChangeArrayUtils.validateChangesArray(parsed);
        if (validation.errors.length > 0) {
          console.warn('EditChange deserialization warnings:', validation.errors);
        }
        return EditChangeMigration.upgradeChangesArray(validation.valid);
      }
      
      // Handle new format with metadata
      if (parsed.changes && Array.isArray(parsed.changes)) {
        const validation = EditChangeArrayUtils.validateChangesArray(parsed.changes);
        if (validation.errors.length > 0) {
          console.warn('EditChange deserialization warnings:', validation.errors);
        }
        
        // Convert date strings back to Date objects
        const changes = validation.valid.map(change => {
          if (change.aiTimestamp && typeof change.aiTimestamp === 'string') {
            return {
              ...change,
              aiTimestamp: new Date(change.aiTimestamp)
            };
          }
          return change;
        });
        
        return EditChangeMigration.upgradeChangesArray(changes);
      }
      
      console.error('Invalid EditChange data format');
      return [];
    } catch (error) {
      console.error('Failed to deserialize EditChange data:', error);
      return [];
    }
  }

  /**
   * Safely serializes an EditSession with all changes
   */
  static serializeSession(session: EditSession): string {
    const serializedSession = {
      ...session,
      changes: session.changes.map(change => {
        if (change.aiTimestamp && change.aiTimestamp instanceof Date) {
          return {
            ...change,
            aiTimestamp: change.aiTimestamp.toISOString()
          };
        }
        return change;
      })
    };

    return JSON.stringify(serializedSession, null, 2);
  }

  /**
   * Deserializes an EditSession with automatic migration
   */
  static deserializeSession(data: string): EditSession | null {
    try {
      const parsed = JSON.parse(data);
      
      if (!parsed.id || !parsed.startTime || !Array.isArray(parsed.changes)) {
        console.error('Invalid EditSession format');
        return null;
      }

      // Migrate the session if needed
      return EditChangeMigration.migrateEditSession(parsed);
    } catch (error) {
      console.error('Failed to deserialize EditSession:', error);
      return null;
    }
  }
}