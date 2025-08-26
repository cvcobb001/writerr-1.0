/**
 * Conflict Resolution System for Track Edits
 * Handles simultaneous edits, overlapping changes, and dependency conflicts
 * Provides automatic resolution strategies and manual resolution interfaces
 */

import { Change, ChangeStatus, ChangeSource, ChangeType } from '../types';
import { globalEventBus } from '@writerr/shared';

export interface ConflictInfo {
  id: string;
  type: ConflictType;
  changes: Change[];
  severity: ConflictSeverity;
  description: string;
  timestamp: number;
  suggestedResolution?: ResolutionStrategy;
  metadata?: {
    overlap_percentage?: number;
    dependency_chain?: string[];
    confidence_difference?: number;
    source_conflict?: boolean;
  };
}

export enum ConflictType {
  OVERLAPPING_POSITIONS = 'overlapping-positions',
  SIMULTANEOUS_EDITS = 'simultaneous-edits',
  DEPENDENCY_CONFLICT = 'dependency-conflict',
  SEMANTIC_CONFLICT = 'semantic-conflict',
  SOURCE_CONFLICT = 'source-conflict',
  CASCADING_CHANGES = 'cascading-changes'
}

export enum ConflictSeverity {
  LOW = 'low',           // Minor overlaps, easily resolvable
  MEDIUM = 'medium',     // Moderate conflicts requiring attention
  HIGH = 'high',         // Significant conflicts needing careful resolution
  CRITICAL = 'critical'  // Blocking conflicts requiring immediate action
}

export enum ResolutionStrategy {
  MERGE_INTELLIGENT = 'merge-intelligent',
  ACCEPT_NEWER = 'accept-newer',
  ACCEPT_OLDER = 'accept-older',
  ACCEPT_HIGHER_CONFIDENCE = 'accept-higher-confidence',
  ACCEPT_HUMAN_EDIT = 'accept-human-edit',
  ACCEPT_AI_EDIT = 'accept-ai-edit',
  MANUAL_REVIEW = 'manual-review',
  REJECT_ALL = 'reject-all',
  CREATE_ALTERNATIVE = 'create-alternative'
}

export interface ResolutionResult {
  conflictId: string;
  strategy: ResolutionStrategy;
  resolvedChanges: Change[];
  rejectedChanges: Change[];
  success: boolean;
  reasoning: string;
  timestamp: number;
}

export interface ConflictResolutionOptions {
  autoResolve?: boolean;
  preferredStrategy?: ResolutionStrategy;
  maxAutoResolutionSeverity?: ConflictSeverity;
  preserveUserEdits?: boolean;
  enableIntelligentMerging?: boolean;
  notifyOnResolution?: boolean;
}

/**
 * Main conflict resolution system
 */
export class ConflictResolver {
  private static instance: ConflictResolver;
  private activeConflicts: Map<string, ConflictInfo> = new Map();
  private resolutionHistory: ResolutionResult[] = [];
  private options: ConflictResolutionOptions = {
    autoResolve: true,
    preferredStrategy: ResolutionStrategy.MERGE_INTELLIGENT,
    maxAutoResolutionSeverity: ConflictSeverity.MEDIUM,
    preserveUserEdits: true,
    enableIntelligentMerging: true,
    notifyOnResolution: true,
  };

  private constructor() {
    this.initializeEventListeners();
  }

  public static getInstance(): ConflictResolver {
    if (!ConflictResolver.instance) {
      ConflictResolver.instance = new ConflictResolver();
    }
    return ConflictResolver.instance;
  }

  /**
   * Detect conflicts between a new change and existing changes
   */
  async detectConflicts(newChange: Change, existingChanges: Change[]): Promise<ConflictInfo[]> {
    const conflicts: ConflictInfo[] = [];

    for (const existing of existingChanges) {
      if (existing.status === ChangeStatus.REJECTED || existing.id === newChange.id) {
        continue;
      }

      const conflict = await this.analyzeChangeConflict(newChange, existing);
      if (conflict) {
        conflicts.push(conflict);
      }
    }

    return conflicts;
  }

  /**
   * Resolve a specific conflict using the specified strategy
   */
  async resolveConflict(
    conflictId: string, 
    strategy?: ResolutionStrategy
  ): Promise<ResolutionResult> {
    const conflict = this.activeConflicts.get(conflictId);
    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found`);
    }

    const resolveStrategy = strategy || conflict.suggestedResolution || this.options.preferredStrategy!;
    
    try {
      const result = await this.applyResolutionStrategy(conflict, resolveStrategy);
      
      // Store resolution result
      this.resolutionHistory.push(result);
      
      // Remove resolved conflict
      this.activeConflicts.delete(conflictId);
      
      // Notify about resolution
      if (this.options.notifyOnResolution) {
        globalEventBus.emit('conflict-resolved', {
          conflictId,
          strategy: resolveStrategy,
          result,
        });
      }
      
      return result;
    } catch (error) {
      console.error(`Error resolving conflict ${conflictId}:`, error);
      throw error;
    }
  }

  /**
   * Auto-resolve conflicts based on current options
   */
  async autoResolveConflicts(conflicts: ConflictInfo[]): Promise<ResolutionResult[]> {
    if (!this.options.autoResolve) {
      return [];
    }

    const results: ResolutionResult[] = [];

    for (const conflict of conflicts) {
      if (conflict.severity <= (this.options.maxAutoResolutionSeverity || ConflictSeverity.MEDIUM)) {
        try {
          const result = await this.resolveConflict(conflict.id);
          results.push(result);
        } catch (error) {
          console.error(`Auto-resolution failed for conflict ${conflict.id}:`, error);
          // Mark for manual review
          conflict.suggestedResolution = ResolutionStrategy.MANUAL_REVIEW;
        }
      }
    }

    return results;
  }

  /**
   * Get all active conflicts
   */
  getActiveConflicts(): ConflictInfo[] {
    return Array.from(this.activeConflicts.values());
  }

  /**
   * Get resolution history
   */
  getResolutionHistory(): ResolutionResult[] {
    return [...this.resolutionHistory];
  }

  /**
   * Configure resolution options
   */
  configure(options: Partial<ConflictResolutionOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Register a new conflict for tracking
   */
  registerConflict(conflict: ConflictInfo): void {
    this.activeConflicts.set(conflict.id, conflict);
    
    globalEventBus.emit('conflict-detected', {
      conflict,
      autoResolvable: conflict.severity <= (this.options.maxAutoResolutionSeverity || ConflictSeverity.MEDIUM),
    });
  }

  /**
   * Clear all conflicts (useful for testing or reset)
   */
  clearConflicts(): void {
    this.activeConflicts.clear();
  }

  // Private methods

  private async analyzeChangeConflict(change1: Change, change2: Change): Promise<ConflictInfo | null> {
    const conflicts: Partial<ConflictInfo>[] = [];

    // Check for position overlap
    const positionConflict = this.checkPositionOverlap(change1, change2);
    if (positionConflict) {
      conflicts.push(positionConflict);
    }

    // Check for simultaneous edits
    const simultaneousConflict = this.checkSimultaneousEdits(change1, change2);
    if (simultaneousConflict) {
      conflicts.push(simultaneousConflict);
    }

    // Check for source conflicts
    const sourceConflict = this.checkSourceConflict(change1, change2);
    if (sourceConflict) {
      conflicts.push(sourceConflict);
    }

    // Check for semantic conflicts
    const semanticConflict = await this.checkSemanticConflict(change1, change2);
    if (semanticConflict) {
      conflicts.push(semanticConflict);
    }

    if (conflicts.length === 0) {
      return null;
    }

    // Create consolidated conflict info
    const conflict: ConflictInfo = {
      id: this.generateConflictId(),
      type: this.determineConflictType(conflicts),
      changes: [change1, change2],
      severity: this.calculateConflictSeverity(conflicts),
      description: this.generateConflictDescription(conflicts),
      timestamp: Date.now(),
      suggestedResolution: this.suggestResolutionStrategy(change1, change2, conflicts),
      metadata: this.collectConflictMetadata(change1, change2, conflicts),
    };

    return conflict;
  }

  private checkPositionOverlap(change1: Change, change2: Change): Partial<ConflictInfo> | null {
    const overlap = this.calculatePositionOverlap(change1.position, change2.position);
    
    if (overlap > 0) {
      return {
        type: ConflictType.OVERLAPPING_POSITIONS,
        severity: overlap > 0.8 ? ConflictSeverity.HIGH : 
                 overlap > 0.5 ? ConflictSeverity.MEDIUM : ConflictSeverity.LOW,
        metadata: { overlap_percentage: overlap },
      };
    }

    return null;
  }

  private checkSimultaneousEdits(change1: Change, change2: Change): Partial<ConflictInfo> | null {
    const timeDifference = Math.abs(change1.timestamp - change2.timestamp);
    const isSimultaneous = timeDifference < 1000; // 1 second threshold

    if (isSimultaneous && this.positionsClose(change1.position, change2.position)) {
      return {
        type: ConflictType.SIMULTANEOUS_EDITS,
        severity: ConflictSeverity.MEDIUM,
      };
    }

    return null;
  }

  private checkSourceConflict(change1: Change, change2: Change): Partial<ConflictInfo> | null {
    const humanSources = [ChangeSource.MANUAL_EDIT, ChangeSource.COLLABORATION];
    const aiSources = [ChangeSource.AI_GRAMMAR, ChangeSource.AI_STYLE, ChangeSource.AI_CONTENT];

    const change1IsHuman = humanSources.includes(change1.source);
    const change2IsHuman = humanSources.includes(change2.source);

    if (change1IsHuman !== change2IsHuman) {
      return {
        type: ConflictType.SOURCE_CONFLICT,
        severity: ConflictSeverity.MEDIUM,
        metadata: { source_conflict: true },
      };
    }

    return null;
  }

  private async checkSemanticConflict(change1: Change, change2: Change): Promise<Partial<ConflictInfo> | null> {
    // Simplified semantic analysis - in production this would use NLP
    const content1 = change1.content.after.toLowerCase();
    const content2 = change2.content.after.toLowerCase();
    
    // Check for contradictory changes
    const contradictory = this.detectContradictoryContent(content1, content2);
    
    if (contradictory) {
      return {
        type: ConflictType.SEMANTIC_CONFLICT,
        severity: ConflictSeverity.HIGH,
      };
    }

    return null;
  }

  private calculatePositionOverlap(pos1: Change['position'], pos2: Change['position']): number {
    const start = Math.max(pos1.start, pos2.start);
    const end = Math.min(pos1.end, pos2.end);
    
    if (start >= end) {
      return 0; // No overlap
    }
    
    const overlapLength = end - start;
    const totalLength = Math.max(pos1.end - pos1.start, pos2.end - pos2.start);
    
    return overlapLength / totalLength;
  }

  private positionsClose(pos1: Change['position'], pos2: Change['position']): boolean {
    const distance = Math.min(
      Math.abs(pos1.start - pos2.end),
      Math.abs(pos2.start - pos1.end)
    );
    
    return distance < 100; // Within 100 characters
  }

  private detectContradictoryContent(content1: string, content2: string): boolean {
    // Simple contradiction detection - could be enhanced with ML
    const contradictionPatterns = [
      ['yes', 'no'],
      ['true', 'false'],
      ['increase', 'decrease'],
      ['more', 'less'],
      ['better', 'worse'],
    ];

    for (const [word1, word2] of contradictionPatterns) {
      if ((content1.includes(word1) && content2.includes(word2)) ||
          (content1.includes(word2) && content2.includes(word1))) {
        return true;
      }
    }

    return false;
  }

  private determineConflictType(conflicts: Partial<ConflictInfo>[]): ConflictType {
    // Return the highest priority conflict type
    const typePriority = [
      ConflictType.SEMANTIC_CONFLICT,
      ConflictType.OVERLAPPING_POSITIONS,
      ConflictType.SOURCE_CONFLICT,
      ConflictType.SIMULTANEOUS_EDITS,
      ConflictType.DEPENDENCY_CONFLICT,
      ConflictType.CASCADING_CHANGES,
    ];

    for (const type of typePriority) {
      if (conflicts.some(c => c.type === type)) {
        return type;
      }
    }

    return ConflictType.OVERLAPPING_POSITIONS;
  }

  private calculateConflictSeverity(conflicts: Partial<ConflictInfo>[]): ConflictSeverity {
    const severities = conflicts.map(c => c.severity!).filter(Boolean);
    
    if (severities.includes(ConflictSeverity.CRITICAL)) return ConflictSeverity.CRITICAL;
    if (severities.includes(ConflictSeverity.HIGH)) return ConflictSeverity.HIGH;
    if (severities.includes(ConflictSeverity.MEDIUM)) return ConflictSeverity.MEDIUM;
    
    return ConflictSeverity.LOW;
  }

  private generateConflictDescription(conflicts: Partial<ConflictInfo>[]): string {
    const descriptions = conflicts.map(c => {
      switch (c.type) {
        case ConflictType.OVERLAPPING_POSITIONS:
          return `Position overlap (${Math.round((c.metadata?.overlap_percentage || 0) * 100)}%)`;
        case ConflictType.SIMULTANEOUS_EDITS:
          return 'Simultaneous edits detected';
        case ConflictType.SOURCE_CONFLICT:
          return 'Human vs AI edit conflict';
        case ConflictType.SEMANTIC_CONFLICT:
          return 'Contradictory content changes';
        default:
          return 'Unknown conflict type';
      }
    });

    return descriptions.join('; ');
  }

  private suggestResolutionStrategy(
    change1: Change, 
    change2: Change, 
    conflicts: Partial<ConflictInfo>[]
  ): ResolutionStrategy {
    // If user edits are involved and preserveUserEdits is true
    if (this.options.preserveUserEdits) {
      const humanSources = [ChangeSource.MANUAL_EDIT, ChangeSource.COLLABORATION];
      
      if (humanSources.includes(change1.source)) {
        return ResolutionStrategy.ACCEPT_HUMAN_EDIT;
      }
      if (humanSources.includes(change2.source)) {
        return ResolutionStrategy.ACCEPT_HUMAN_EDIT;
      }
    }

    // For high confidence differences, accept higher confidence
    const confidenceDiff = Math.abs(change1.confidence - change2.confidence);
    if (confidenceDiff > 0.3) {
      return ResolutionStrategy.ACCEPT_HIGHER_CONFIDENCE;
    }

    // For semantic conflicts, require manual review
    if (conflicts.some(c => c.type === ConflictType.SEMANTIC_CONFLICT)) {
      return ResolutionStrategy.MANUAL_REVIEW;
    }

    // Default to intelligent merging
    return ResolutionStrategy.MERGE_INTELLIGENT;
  }

  private collectConflictMetadata(
    change1: Change, 
    change2: Change, 
    conflicts: Partial<ConflictInfo>[]
  ) {
    const metadata: ConflictInfo['metadata'] = {
      confidence_difference: Math.abs(change1.confidence - change2.confidence),
    };

    for (const conflict of conflicts) {
      Object.assign(metadata, conflict.metadata);
    }

    return metadata;
  }

  private async applyResolutionStrategy(
    conflict: ConflictInfo, 
    strategy: ResolutionStrategy
  ): Promise<ResolutionResult> {
    const [change1, change2] = conflict.changes;
    let resolvedChanges: Change[] = [];
    let rejectedChanges: Change[] = [];
    let reasoning = '';

    switch (strategy) {
      case ResolutionStrategy.MERGE_INTELLIGENT:
        const merged = await this.intelligentMerge(change1, change2);
        resolvedChanges = [merged];
        reasoning = 'Intelligently merged overlapping changes';
        break;

      case ResolutionStrategy.ACCEPT_NEWER:
        if (change1.timestamp > change2.timestamp) {
          resolvedChanges = [change1];
          rejectedChanges = [change2];
        } else {
          resolvedChanges = [change2];
          rejectedChanges = [change1];
        }
        reasoning = 'Accepted newer change';
        break;

      case ResolutionStrategy.ACCEPT_HIGHER_CONFIDENCE:
        if (change1.confidence > change2.confidence) {
          resolvedChanges = [change1];
          rejectedChanges = [change2];
        } else {
          resolvedChanges = [change2];
          rejectedChanges = [change1];
        }
        reasoning = 'Accepted higher confidence change';
        break;

      case ResolutionStrategy.ACCEPT_HUMAN_EDIT:
        const humanSources = [ChangeSource.MANUAL_EDIT, ChangeSource.COLLABORATION];
        if (humanSources.includes(change1.source)) {
          resolvedChanges = [change1];
          rejectedChanges = [change2];
        } else if (humanSources.includes(change2.source)) {
          resolvedChanges = [change2];
          rejectedChanges = [change1];
        } else {
          // Fallback to higher confidence
          return this.applyResolutionStrategy(conflict, ResolutionStrategy.ACCEPT_HIGHER_CONFIDENCE);
        }
        reasoning = 'Prioritized human edit';
        break;

      case ResolutionStrategy.REJECT_ALL:
        rejectedChanges = [change1, change2];
        reasoning = 'Rejected all conflicting changes';
        break;

      default:
        throw new Error(`Unsupported resolution strategy: ${strategy}`);
    }

    return {
      conflictId: conflict.id,
      strategy,
      resolvedChanges,
      rejectedChanges,
      success: true,
      reasoning,
      timestamp: Date.now(),
    };
  }

  private async intelligentMerge(change1: Change, change2: Change): Promise<Change> {
    // Simplified intelligent merging - in production this would be more sophisticated
    const mergedContent = this.mergeTextContent(
      change1.content.before,
      change1.content.after,
      change2.content.after
    );

    return {
      ...change1,
      id: this.generateChangeId(),
      content: {
        before: change1.content.before,
        after: mergedContent,
      },
      confidence: (change1.confidence + change2.confidence) / 2,
      timestamp: Date.now(),
      metadata: {
        ...change1.metadata,
        merged_from: [change1.id, change2.id],
        merge_strategy: 'intelligent',
      },
    };
  }

  private mergeTextContent(original: string, version1: string, version2: string): string {
    // Simple text merging - in production would use more advanced algorithms
    if (version1.length > version2.length) {
      return version1;
    }
    return version2;
  }

  private generateConflictId(): string {
    return `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateChangeId(): string {
    return `merged_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeEventListeners(): void {
    globalEventBus.on('change-added', async (event) => {
      // Auto-detect conflicts for new changes
      // This would integrate with the main change tracking system
    });

    globalEventBus.on('bulk-operation-started', (event) => {
      // Handle conflicts in bulk operations
    });
  }
}

// Export singleton instance
export const conflictResolver = ConflictResolver.getInstance();