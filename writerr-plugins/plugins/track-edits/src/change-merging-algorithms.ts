/**
 * Change Merging Algorithms
 * 
 * Sophisticated algorithms for merging compatible simultaneous edits:
 * - Compatible change merging for non-overlapping edits
 * - Intelligent text merge for overlapping changes when possible
 * - Change ordering based on operation types and plugin priorities
 * - Fallback strategies when automatic merging is not possible
 */

import { 
  EditChange, 
  MultiPluginEditOperation, 
  MergedChange,
  ConflictResolutionResult,
  OperationPriority,
  SemanticContext 
} from './change-consolidation-manager';

export interface MergeConfig {
  maxOverlapTolerance: number; // Maximum character overlap allowed for merging
  preserveFormatting: boolean;
  enableSemanticMerging: boolean;
  priorityWeighting: number; // How much priority affects merge decisions (0-1)
  confidenceThreshold: number; // Minimum confidence for automatic merge (0-1)
}

export interface MergeStrategy {
  name: string;
  description: string;
  applicableFor: (op1: MultiPluginEditOperation, op2: MultiPluginEditOperation) => boolean;
  merge: (op1: MultiPluginEditOperation, op2: MultiPluginEditOperation, config: MergeConfig) => Promise<MergeResult>;
}

export interface MergeResult {
  success: boolean;
  confidence: number; // 0-1 confidence in merge quality
  mergedChanges: EditChange[];
  preservedSemantics: boolean;
  warnings: string[];
  errors: string[];
  fallbackRequired?: boolean;
  userReviewRequired?: boolean;
}

export interface ChangeOrderingResult {
  orderedChanges: EditChange[];
  orderingStrategy: string;
  dependencies: Array<{changeId: string, dependsOn: string[]}>;
  warnings: string[];
}

/**
 * Advanced Change Merging Engine
 */
export class ChangeMergingEngine {
  private config: MergeConfig;
  private mergeStrategies: Map<string, MergeStrategy>;
  private textAnalyzer: TextAnalyzer;

  constructor(config: Partial<MergeConfig> = {}) {
    this.config = {
      maxOverlapTolerance: 5,
      preserveFormatting: true,
      enableSemanticMerging: true,
      priorityWeighting: 0.7,
      confidenceThreshold: 0.6,
      ...config
    };

    this.textAnalyzer = new TextAnalyzer();
    this.initializeMergeStrategies();
  }

  /**
   * Merge multiple operations into a consolidated set of changes
   */
  async mergeOperations(operations: MultiPluginEditOperation[]): Promise<ConflictResolutionResult> {
    if (operations.length === 0) {
      return {
        success: true,
        finalChanges: [],
        warnings: [],
        errors: [],
        requiresUserReview: false
      };
    }

    if (operations.length === 1) {
      return {
        success: true,
        finalChanges: operations[0].changes,
        warnings: [],
        errors: [],
        requiresUserReview: operations[0].metadata.requiresUserReview
      };
    }

    try {
      // Sort operations by priority and compatibility
      const sortedOperations = this.sortOperationsByMergePriority(operations);
      
      // Group operations that can be merged together
      const mergeGroups = await this.groupCompatibleOperations(sortedOperations);
      
      let allMergedChanges: EditChange[] = [];
      const warnings: string[] = [];
      const errors: string[] = [];
      let overallConfidence = 1.0;
      let requiresUserReview = false;

      // Process each merge group
      for (const group of mergeGroups) {
        const mergeResult = await this.mergeOperationGroup(group);
        
        if (mergeResult.success) {
          allMergedChanges.push(...mergeResult.mergedChanges);
          warnings.push(...mergeResult.warnings);
          overallConfidence = Math.min(overallConfidence, mergeResult.confidence);
          
          if (mergeResult.userReviewRequired) {
            requiresUserReview = true;
          }
        } else {
          errors.push(...mergeResult.errors);
          // Add original changes if merge fails
          for (const op of group) {
            allMergedChanges.push(...op.changes);
          }
          requiresUserReview = true;
        }
      }

      // Order the final changes for application
      const orderedResult = await this.orderChangesForApplication(allMergedChanges);
      
      return {
        success: errors.length === 0,
        finalChanges: orderedResult.orderedChanges,
        warnings: [...warnings, ...orderedResult.warnings],
        errors,
        requiresUserReview: requiresUserReview || overallConfidence < this.config.confidenceThreshold
      };

    } catch (error) {
      return {
        success: false,
        finalChanges: operations.flatMap(op => op.changes),
        warnings: [],
        errors: [`Merge operation failed: ${error.message}`],
        requiresUserReview: true
      };
    }
  }

  /**
   * Sort operations by merge priority
   */
  private sortOperationsByMergePriority(operations: MultiPluginEditOperation[]): MultiPluginEditOperation[] {
    return [...operations].sort((a, b) => {
      // Primary sort: priority (lower number = higher priority)
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      
      // Secondary sort: timestamp (earlier first)
      if (a.timestamp !== b.timestamp) {
        return a.timestamp - b.timestamp;
      }
      
      // Tertiary sort: user-initiated operations first
      if (a.metadata.userInitiated !== b.metadata.userInitiated) {
        return a.metadata.userInitiated ? -1 : 1;
      }
      
      return 0;
    });
  }

  /**
   * Group compatible operations that can be merged together
   */
  private async groupCompatibleOperations(operations: MultiPluginEditOperation[]): Promise<MultiPluginEditOperation[][]> {
    const groups: MultiPluginEditOperation[][] = [];
    const processed = new Set<string>();

    for (const operation of operations) {
      if (processed.has(operation.id)) continue;

      const compatibleGroup = [operation];
      processed.add(operation.id);

      // Find other operations that can be merged with this one
      for (const otherOp of operations) {
        if (processed.has(otherOp.id)) continue;

        const canMerge = await this.canOperationsBeMerged(operation, otherOp);
        if (canMerge) {
          compatibleGroup.push(otherOp);
          processed.add(otherOp.id);
        }
      }

      groups.push(compatibleGroup);
    }

    return groups;
  }

  /**
   * Check if two operations can be merged
   */
  private async canOperationsBeMerged(op1: MultiPluginEditOperation, op2: MultiPluginEditOperation): Promise<boolean> {
    // Check plugin compatibility
    if (!op1.capabilities.canMergeWith.includes(op2.pluginId) ||
        !op2.capabilities.canMergeWith.includes(op1.pluginId)) {
      return false;
    }

    // Check priority difference
    const priorityDiff = Math.abs(op1.priority - op2.priority);
    if (priorityDiff > 2) { // Don't merge operations with very different priorities
      return false;
    }

    // Check for overlapping changes
    const hasOverlap = this.hasSignificantOverlap(op1.changes, op2.changes);
    if (hasOverlap) {
      // Can only merge overlapping changes if both support it
      return op1.capabilities.conflictResolution.includes('AUTO_MERGE' as any) &&
             op2.capabilities.conflictResolution.includes('AUTO_MERGE' as any);
    }

    return true;
  }

  /**
   * Merge a group of compatible operations
   */
  private async mergeOperationGroup(operations: MultiPluginEditOperation[]): Promise<MergeResult> {
    if (operations.length === 1) {
      return {
        success: true,
        confidence: 1.0,
        mergedChanges: operations[0].changes,
        preservedSemantics: true,
        warnings: [],
        errors: []
      };
    }

    // Find the best merge strategy for this group
    const strategy = this.selectBestMergeStrategy(operations);
    
    if (!strategy) {
      return {
        success: false,
        confidence: 0.0,
        mergedChanges: [],
        preservedSemantics: false,
        warnings: [],
        errors: ['No suitable merge strategy found'],
        fallbackRequired: true
      };
    }

    // Apply the merge strategy
    let mergeResult: MergeResult;
    
    if (operations.length === 2) {
      mergeResult = await strategy.merge(operations[0], operations[1], this.config);
    } else {
      // For multiple operations, merge iteratively
      mergeResult = await this.mergeMultipleOperations(operations, strategy);
    }

    return mergeResult;
  }

  /**
   * Merge multiple operations using a specific strategy
   */
  private async mergeMultipleOperations(operations: MultiPluginEditOperation[], strategy: MergeStrategy): Promise<MergeResult> {
    let currentResult: MergeResult = {
      success: true,
      confidence: 1.0,
      mergedChanges: operations[0].changes,
      preservedSemantics: true,
      warnings: [],
      errors: []
    };

    // Merge operations iteratively
    for (let i = 1; i < operations.length; i++) {
      if (!currentResult.success) break;

      // Create a temporary operation with current merged changes
      const tempOp: MultiPluginEditOperation = {
        ...operations[0],
        id: `merged_${operations[0].id}_${i}`,
        changes: currentResult.mergedChanges
      };

      const nextResult = await strategy.merge(tempOp, operations[i], this.config);
      
      if (nextResult.success) {
        currentResult.mergedChanges = nextResult.mergedChanges;
        currentResult.confidence = Math.min(currentResult.confidence, nextResult.confidence);
        currentResult.preservedSemantics = currentResult.preservedSemantics && nextResult.preservedSemantics;
        currentResult.warnings.push(...nextResult.warnings);
      } else {
        currentResult.success = false;
        currentResult.errors.push(...nextResult.errors);
        currentResult.fallbackRequired = true;
        break;
      }
    }

    return currentResult;
  }

  /**
   * Select the best merge strategy for a group of operations
   */
  private selectBestMergeStrategy(operations: MultiPluginEditOperation[]): MergeStrategy | null {
    for (const [name, strategy] of this.mergeStrategies) {
      // Check if strategy is applicable for all pairs in the group
      let applicable = true;
      
      for (let i = 0; i < operations.length && applicable; i++) {
        for (let j = i + 1; j < operations.length && applicable; j++) {
          if (!strategy.applicableFor(operations[i], operations[j])) {
            applicable = false;
          }
        }
      }
      
      if (applicable) {
        return strategy;
      }
    }

    return null;
  }

  /**
   * Order changes for safe application to document
   */
  private async orderChangesForApplication(changes: EditChange[]): Promise<ChangeOrderingResult> {
    // Sort changes by position (reverse order for safe application)
    const orderedChanges = [...changes].sort((a, b) => {
      // Apply changes from end to beginning to avoid position shifts
      if (a.from !== b.from) {
        return b.from - a.from;
      }
      
      // If same position, apply deletes before inserts
      if (a.type !== b.type) {
        if (a.type === 'delete' && b.type === 'insert') return -1;
        if (a.type === 'insert' && b.type === 'delete') return 1;
      }
      
      return 0;
    });

    // Build dependency information
    const dependencies: Array<{changeId: string, dependsOn: string[]}> = [];
    
    for (const change of orderedChanges) {
      if (change.id && change.dependsOn) {
        dependencies.push({
          changeId: change.id,
          dependsOn: change.dependsOn
        });
      }
    }

    // Validate ordering doesn't violate dependencies
    const warnings: string[] = [];
    const dependencyWarnings = this.validateDependencyOrdering(orderedChanges, dependencies);
    warnings.push(...dependencyWarnings);

    return {
      orderedChanges,
      orderingStrategy: 'position_based_reverse',
      dependencies,
      warnings
    };
  }

  /**
   * Initialize merge strategies
   */
  private initializeMergeStrategies(): void {
    this.mergeStrategies = new Map();

    // Non-overlapping merge strategy
    this.mergeStrategies.set('non_overlapping', {
      name: 'non_overlapping',
      description: 'Merge non-overlapping changes directly',
      applicableFor: (op1, op2) => !this.hasSignificantOverlap(op1.changes, op2.changes),
      merge: async (op1, op2, config) => this.mergeNonOverlappingChanges(op1, op2, config)
    });

    // Priority-based merge strategy
    this.mergeStrategies.set('priority_based', {
      name: 'priority_based',
      description: 'Merge based on operation priority',
      applicableFor: (op1, op2) => op1.priority !== op2.priority,
      merge: async (op1, op2, config) => this.mergePriorityBased(op1, op2, config)
    });

    // Semantic merge strategy
    this.mergeStrategies.set('semantic', {
      name: 'semantic',
      description: 'Merge based on semantic compatibility',
      applicableFor: (op1, op2) => {
        return config.enableSemanticMerging && 
               op1.changes.some(c => c.semanticContext) && 
               op2.changes.some(c => c.semanticContext);
      },
      merge: async (op1, op2, config) => this.mergeSemanticChanges(op1, op2, config)
    });

    // Text-based merge strategy
    this.mergeStrategies.set('text_based', {
      name: 'text_based',
      description: 'Merge overlapping text changes intelligently',
      applicableFor: (op1, op2) => {
        const overlap = this.hasSignificantOverlap(op1.changes, op2.changes);
        return overlap && this.canTextBeMerged(op1.changes, op2.changes);
      },
      merge: async (op1, op2, config) => this.mergeTextChanges(op1, op2, config)
    });
  }

  // Merge strategy implementations

  private async mergeNonOverlappingChanges(op1: MultiPluginEditOperation, op2: MultiPluginEditOperation, config: MergeConfig): Promise<MergeResult> {
    const mergedChanges = [...op1.changes, ...op2.changes];
    
    return {
      success: true,
      confidence: 0.9,
      mergedChanges,
      preservedSemantics: true,
      warnings: [],
      errors: []
    };
  }

  private async mergePriorityBased(op1: MultiPluginEditOperation, op2: MultiPluginEditOperation, config: MergeConfig): Promise<MergeResult> {
    const higherPriorityOp = op1.priority <= op2.priority ? op1 : op2;
    const lowerPriorityOp = op1.priority <= op2.priority ? op2 : op1;
    
    // Take all changes from higher priority operation
    const mergedChanges = [...higherPriorityOp.changes];
    
    // Add non-conflicting changes from lower priority operation
    for (const change of lowerPriorityOp.changes) {
      const hasConflict = higherPriorityOp.changes.some(priorityChange => 
        this.changesOverlap(change, priorityChange));
      
      if (!hasConflict) {
        mergedChanges.push(change);
      }
    }

    return {
      success: true,
      confidence: 0.8,
      mergedChanges,
      preservedSemantics: true,
      warnings: [`Lower priority changes that conflict with higher priority ones were discarded`],
      errors: []
    };
  }

  private async mergeSemanticChanges(op1: MultiPluginEditOperation, op2: MultiPluginEditOperation, config: MergeConfig): Promise<MergeResult> {
    // Analyze semantic compatibility
    const compatibility = await this.analyzeSemanticCompatibility(op1.changes, op2.changes);
    
    if (compatibility < 0.3) {
      return {
        success: false,
        confidence: 0.0,
        mergedChanges: [],
        preservedSemantics: false,
        warnings: [],
        errors: ['Semantic intentions are incompatible'],
        userReviewRequired: true
      };
    }

    // Merge semantically compatible changes
    const mergedChanges = await this.performSemanticMerge(op1.changes, op2.changes);
    
    return {
      success: true,
      confidence: compatibility,
      mergedChanges,
      preservedSemantics: true,
      warnings: compatibility < 0.6 ? ['Semantic merge has moderate confidence'] : [],
      errors: []
    };
  }

  private async mergeTextChanges(op1: MultiPluginEditOperation, op2: MultiPluginEditOperation, config: MergeConfig): Promise<MergeResult> {
    try {
      const mergedChanges = await this.textAnalyzer.mergeOverlappingChanges(op1.changes, op2.changes, config);
      
      return {
        success: true,
        confidence: 0.7,
        mergedChanges,
        preservedSemantics: true,
        warnings: ['Text merge applied - please review for accuracy'],
        errors: [],
        userReviewRequired: true
      };
    } catch (error) {
      return {
        success: false,
        confidence: 0.0,
        mergedChanges: [],
        preservedSemantics: false,
        warnings: [],
        errors: [`Text merge failed: ${error.message}`],
        fallbackRequired: true
      };
    }
  }

  // Utility methods

  private hasSignificantOverlap(changes1: EditChange[], changes2: EditChange[]): boolean {
    for (const change1 of changes1) {
      for (const change2 of changes2) {
        if (this.changesOverlap(change1, change2)) {
          const overlapSize = Math.min(change1.to, change2.to) - Math.max(change1.from, change2.from);
          if (overlapSize > this.config.maxOverlapTolerance) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private changesOverlap(change1: EditChange, change2: EditChange): boolean {
    return change1.from < change2.to && change2.from < change1.to;
  }

  private canTextBeMerged(changes1: EditChange[], changes2: EditChange[]): boolean {
    // Check if overlapping changes can potentially be merged
    return changes1.some(c1 => 
      changes2.some(c2 => 
        this.changesOverlap(c1, c2) && 
        c1.type === c2.type && 
        c1.type !== 'delete'
      )
    );
  }

  private async analyzeSemanticCompatibility(changes1: EditChange[], changes2: EditChange[]): Promise<number> {
    // Simplified semantic compatibility analysis
    let totalCompatibility = 0;
    let comparisons = 0;

    for (const change1 of changes1) {
      for (const change2 of changes2) {
        if (change1.semanticContext && change2.semanticContext) {
          const compatibility = this.calculateSemanticSimilarity(
            change1.semanticContext,
            change2.semanticContext
          );
          totalCompatibility += compatibility;
          comparisons++;
        }
      }
    }

    return comparisons > 0 ? totalCompatibility / comparisons : 0.5;
  }

  private calculateSemanticSimilarity(context1: SemanticContext, context2: SemanticContext): number {
    // Simple compatibility matrix
    const intentionCompatibility = {
      correction: { correction: 0.9, enhancement: 0.6, formatting: 0.7, content_addition: 0.3, restructuring: 0.2 },
      enhancement: { correction: 0.6, enhancement: 0.9, formatting: 0.8, content_addition: 0.7, restructuring: 0.4 },
      formatting: { correction: 0.7, enhancement: 0.8, formatting: 0.9, content_addition: 0.5, restructuring: 0.3 },
      content_addition: { correction: 0.3, enhancement: 0.7, formatting: 0.5, content_addition: 0.8, restructuring: 0.6 },
      restructuring: { correction: 0.2, enhancement: 0.4, formatting: 0.3, content_addition: 0.6, restructuring: 0.9 }
    };

    return intentionCompatibility[context1.intention]?.[context2.intention] ?? 0.5;
  }

  private async performSemanticMerge(changes1: EditChange[], changes2: EditChange[]): Promise<EditChange[]> {
    // Simplified semantic merge - in practice would be more sophisticated
    const merged: EditChange[] = [];
    const processed = new Set<number>();

    // Process changes1 first
    for (let i = 0; i < changes1.length; i++) {
      if (processed.has(i)) continue;
      
      const change1 = changes1[i];
      let bestMatch: EditChange | null = null;
      let bestCompatibility = 0;

      // Find best matching change in changes2
      for (const change2 of changes2) {
        if (this.changesOverlap(change1, change2) && 
            change1.semanticContext && change2.semanticContext) {
          const compatibility = this.calculateSemanticSimilarity(
            change1.semanticContext,
            change2.semanticContext
          );
          
          if (compatibility > bestCompatibility && compatibility > 0.6) {
            bestMatch = change2;
            bestCompatibility = compatibility;
          }
        }
      }

      if (bestMatch) {
        // Merge the two changes
        const mergedChange = await this.createSemanticMergedChange(change1, bestMatch);
        merged.push(mergedChange);
        processed.add(i);
      } else {
        merged.push(change1);
        processed.add(i);
      }
    }

    // Add remaining changes from changes2
    for (const change2 of changes2) {
      const wasProcessed = merged.some(mc => 
        mc.operationId?.includes(change2.id || '') || 
        this.changesOverlap(mc, change2)
      );
      
      if (!wasProcessed) {
        merged.push(change2);
      }
    }

    return merged;
  }

  private async createSemanticMergedChange(change1: EditChange, change2: EditChange): Promise<EditChange> {
    // Create a new change that combines the intentions of both changes
    return {
      ...change1,
      id: `semantic_merge_${change1.id}_${change2.id}`,
      timestamp: Math.max(change1.timestamp, change2.timestamp),
      from: Math.min(change1.from, change2.from),
      to: Math.max(change1.to, change2.to),
      text: this.mergeChangeTexts(change1, change2),
      operationId: `merged_${change1.operationId}_${change2.operationId}`,
      semanticContext: this.mergeSemanticContexts(change1.semanticContext!, change2.semanticContext!)
    };
  }

  private mergeChangeTexts(change1: EditChange, change2: EditChange): string {
    // Simplified text merging - in practice would be more sophisticated
    if (change1.type === 'insert' && change2.type === 'insert') {
      return (change1.text || '') + (change2.text || '');
    }
    
    // For other types, prefer the change with higher confidence
    const confidence1 = change1.semanticContext?.confidence ?? 0.5;
    const confidence2 = change2.semanticContext?.confidence ?? 0.5;
    
    return confidence1 >= confidence2 ? (change1.text || '') : (change2.text || '');
  }

  private mergeSemanticContexts(context1: SemanticContext, context2: SemanticContext): SemanticContext {
    return {
      intention: context1.confidence >= context2.confidence ? context1.intention : context2.intention,
      scope: context1.scope === context2.scope ? context1.scope : 'paragraph', // Default to paragraph
      confidence: Math.min(context1.confidence, context2.confidence) * 0.9, // Reduce confidence for merged result
      preserveFormatting: context1.preserveFormatting && context2.preserveFormatting,
      preserveContent: context1.preserveContent && context2.preserveContent
    };
  }

  private validateDependencyOrdering(changes: EditChange[], dependencies: Array<{changeId: string, dependsOn: string[]}>): string[] {
    const warnings: string[] = [];
    const changePositions = new Map<string, number>();
    
    changes.forEach((change, index) => {
      if (change.id) {
        changePositions.set(change.id, index);
      }
    });

    for (const dependency of dependencies) {
      const changePos = changePositions.get(dependency.changeId);
      if (changePos === undefined) continue;

      for (const depId of dependency.dependsOn) {
        const depPos = changePositions.get(depId);
        if (depPos !== undefined && depPos > changePos) {
          warnings.push(`Dependency violation: ${dependency.changeId} depends on ${depId} but is ordered before it`);
        }
      }
    }

    return warnings;
  }
}

/**
 * Text Analysis Helper for advanced text merging
 */
class TextAnalyzer {
  async mergeOverlappingChanges(changes1: EditChange[], changes2: EditChange[], config: MergeConfig): Promise<EditChange[]> {
    const merged: EditChange[] = [];
    
    // Simple implementation - could be made much more sophisticated
    for (const change1 of changes1) {
      let matchFound = false;
      
      for (const change2 of changes2) {
        if (this.changesOverlap(change1, change2)) {
          const mergedChange = await this.mergeOverlappingPair(change1, change2);
          if (mergedChange) {
            merged.push(mergedChange);
            matchFound = true;
            break;
          }
        }
      }
      
      if (!matchFound) {
        merged.push(change1);
      }
    }

    // Add non-overlapping changes from changes2
    for (const change2 of changes2) {
      const hasOverlap = changes1.some(c1 => this.changesOverlap(c1, change2));
      if (!hasOverlap) {
        merged.push(change2);
      }
    }

    return merged;
  }

  private async mergeOverlappingPair(change1: EditChange, change2: EditChange): Promise<EditChange | null> {
    if (change1.type === 'insert' && change2.type === 'insert') {
      // Merge two insertions at similar positions
      return {
        ...change1,
        id: `text_merge_${change1.id}_${change2.id}`,
        from: Math.min(change1.from, change2.from),
        to: Math.max(change1.to, change2.to),
        text: this.intelligentTextMerge(change1.text || '', change2.text || ''),
        timestamp: Math.max(change1.timestamp, change2.timestamp)
      };
    }
    
    // For other overlap types, more complex logic would be needed
    return null;
  }

  private intelligentTextMerge(text1: string, text2: string): string {
    // Very simplified - in practice would use diff algorithms and NLP
    if (text1.includes(text2)) return text1;
    if (text2.includes(text1)) return text2;
    
    // Try to merge if they seem compatible
    if (this.textsAreCompatible(text1, text2)) {
      return text1 + ' ' + text2;
    }
    
    return text1; // Default to first text
  }

  private textsAreCompatible(text1: string, text2: string): boolean {
    // Simple heuristic - could be much more sophisticated
    return text1.length < 100 && text2.length < 100 && 
           !text1.includes('.') && !text2.includes('.');
  }

  private changesOverlap(change1: EditChange, change2: EditChange): boolean {
    return change1.from < change2.to && change2.from < change1.to;
  }
}