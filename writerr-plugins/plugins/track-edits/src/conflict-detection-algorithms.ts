/**
 * Change Conflict Detection Algorithms
 * 
 * Advanced algorithms for detecting conflicts between simultaneous multi-plugin edits:
 * - Text overlap detection with semantic analysis
 * - Dependency violation detection
 * - Resource contention analysis
 * - Priority-based conflict identification
 */

import { 
  EditChange, 
  MultiPluginEditOperation, 
  ChangeConflict, 
  ConflictType, 
  ConflictSeverity,
  SemanticContext,
  OperationPriority 
} from './change-consolidation-manager';

export interface ConflictDetectionConfig {
  enableSemanticAnalysis: boolean;
  overlapTolerance: number; // Characters of overlap allowed
  dependencyDepth: number; // How deep to analyze dependencies
  temporalWindow: number; // Time window for considering operations simultaneous (ms)
  priorityThreshold: number; // Priority difference threshold for conflicts
}

export interface ConflictAnalysisResult {
  hasConflict: boolean;
  conflictType: ConflictType;
  severity: ConflictSeverity;
  details: ConflictDetails;
  suggestedResolution?: string;
}

export interface ConflictDetails {
  overlappingRanges?: Array<{start: number, end: number, operations: string[]}>;
  dependencyChain?: string[];
  semanticConflicts?: Array<{intention1: string, intention2: string, compatibility: number}>;
  resourceContention?: {resource: string, requestingPlugins: string[]};
  priorityMismatch?: {operation1: OperationPriority, operation2: OperationPriority, threshold: number};
}

/**
 * Advanced Conflict Detection Engine
 */
export class ConflictDetectionEngine {
  private config: ConflictDetectionConfig;
  private semanticCompatibilityMatrix: Map<string, Map<string, number>>;

  constructor(config: Partial<ConflictDetectionConfig> = {}) {
    this.config = {
      enableSemanticAnalysis: true,
      overlapTolerance: 3, // Allow 3 characters of overlap
      dependencyDepth: 5,
      temporalWindow: 5000, // 5 seconds
      priorityThreshold: 1,
      ...config
    };

    this.initializeSemanticCompatibilityMatrix();
  }

  /**
   * Detect all conflicts among a set of operations
   */
  async detectConflicts(operations: MultiPluginEditOperation[]): Promise<ChangeConflict[]> {
    const conflicts: ChangeConflict[] = [];
    
    // Filter operations within temporal window
    const simultaneousOps = this.filterSimultaneousOperations(operations);
    
    if (simultaneousOps.length < 2) {
      return conflicts;
    }

    // Check all pairs of operations for conflicts
    for (let i = 0; i < simultaneousOps.length; i++) {
      for (let j = i + 1; j < simultaneousOps.length; j++) {
        const op1 = simultaneousOps[i];
        const op2 = simultaneousOps[j];
        
        const conflict = await this.analyzeOperationPair(op1, op2);
        if (conflict) {
          conflicts.push(conflict);
        }
      }
    }

    // Check for multi-operation conflicts
    const multiOpConflicts = await this.detectMultiOperationConflicts(simultaneousOps);
    conflicts.push(...multiOpConflicts);

    // Sort by severity
    return conflicts.sort((a, b) => this.getSeverityWeight(b.severity) - this.getSeverityWeight(a.severity));
  }

  /**
   * Analyze a pair of operations for conflicts
   */
  private async analyzeOperationPair(
    op1: MultiPluginEditOperation, 
    op2: MultiPluginEditOperation
  ): Promise<ChangeConflict | null> {
    // Skip if operations are from plugins that can merge
    if (op1.capabilities.canMergeWith.includes(op2.pluginId) && 
        op2.capabilities.canMergeWith.includes(op1.pluginId)) {
      return null;
    }

    const analyses = await Promise.all([
      this.analyzeTextOverlap(op1, op2),
      this.analyzeSemanticConflict(op1, op2),
      this.analyzeDependencyViolation(op1, op2),
      this.analyzeResourceContention(op1, op2),
      this.analyzePriorityConflict(op1, op2)
    ]);

    // Find the most severe conflict
    const conflictAnalysis = analyses.find(analysis => analysis.hasConflict);
    
    if (!conflictAnalysis) {
      return null;
    }

    return {
      id: `conflict_${op1.id}_${op2.id}_${Date.now()}`,
      type: conflictAnalysis.conflictType,
      severity: conflictAnalysis.severity,
      operations: [op1, op2],
      conflictingChanges: [...op1.changes, ...op2.changes],
      detectedAt: Date.now(),
      userVisible: this.shouldBeUserVisible(conflictAnalysis.severity, op1, op2)
    };
  }

  /**
   * Analyze text overlap between operations
   */
  private async analyzeTextOverlap(
    op1: MultiPluginEditOperation, 
    op2: MultiPluginEditOperation
  ): Promise<ConflictAnalysisResult> {
    const overlappingRanges: Array<{start: number, end: number, operations: string[]}> = [];
    
    // Check each change in op1 against each change in op2
    for (const change1 of op1.changes) {
      for (const change2 of op2.changes) {
        const overlap = this.calculateRangeOverlap(
          {start: change1.from, end: change1.to},
          {start: change2.from, end: change2.to}
        );
        
        if (overlap && overlap.size > this.config.overlapTolerance) {
          overlappingRanges.push({
            start: overlap.start,
            end: overlap.end,
            operations: [op1.id, op2.id]
          });
        }
      }
    }
    
    if (overlappingRanges.length > 0) {
      // Analyze the severity of overlap
      const totalOverlap = overlappingRanges.reduce((sum, range) => sum + (range.end - range.start), 0);
      const severity = this.calculateOverlapSeverity(totalOverlap, op1, op2);
      
      return {
        hasConflict: true,
        conflictType: ConflictType.OVERLAPPING_EDITS,
        severity,
        details: { overlappingRanges },
        suggestedResolution: this.suggestOverlapResolution(overlappingRanges, op1, op2)
      };
    }
    
    return {
      hasConflict: false,
      conflictType: ConflictType.OVERLAPPING_EDITS,
      severity: ConflictSeverity.INFO,
      details: {}
    };
  }

  /**
   * Analyze semantic conflicts between operations
   */
  private async analyzeSemanticConflict(
    op1: MultiPluginEditOperation, 
    op2: MultiPluginEditOperation
  ): Promise<ConflictAnalysisResult> {
    if (!this.config.enableSemanticAnalysis) {
      return {
        hasConflict: false,
        conflictType: ConflictType.SEMANTIC_CONFLICT,
        severity: ConflictSeverity.INFO,
        details: {}
      };
    }

    const semanticConflicts: Array<{intention1: string, intention2: string, compatibility: number}> = [];
    
    // Compare semantic contexts of overlapping or nearby changes
    for (const change1 of op1.changes) {
      for (const change2 of op2.changes) {
        if (!change1.semanticContext || !change2.semanticContext) continue;
        
        // Check if changes are in the same semantic scope
        const distance = Math.abs(change1.from - change2.from);
        const inSameScope = this.areInSameSemanticScope(change1.semanticContext, change2.semanticContext, distance);
        
        if (inSameScope) {
          const compatibility = this.calculateSemanticCompatibility(
            change1.semanticContext.intention,
            change2.semanticContext.intention
          );
          
          if (compatibility < 0.3) { // Low compatibility threshold
            semanticConflicts.push({
              intention1: change1.semanticContext.intention,
              intention2: change2.semanticContext.intention,
              compatibility
            });
          }
        }
      }
    }
    
    if (semanticConflicts.length > 0) {
      const avgCompatibility = semanticConflicts.reduce((sum, conf) => sum + conf.compatibility, 0) / semanticConflicts.length;
      const severity = avgCompatibility < 0.1 ? ConflictSeverity.HIGH : ConflictSeverity.MEDIUM;
      
      return {
        hasConflict: true,
        conflictType: ConflictType.SEMANTIC_CONFLICT,
        severity,
        details: { semanticConflicts },
        suggestedResolution: this.suggestSemanticResolution(semanticConflicts, op1, op2)
      };
    }
    
    return {
      hasConflict: false,
      conflictType: ConflictType.SEMANTIC_CONFLICT,
      severity: ConflictSeverity.INFO,
      details: {}
    };
  }

  /**
   * Analyze dependency violations between operations
   */
  private async analyzeDependencyViolation(
    op1: MultiPluginEditOperation, 
    op2: MultiPluginEditOperation
  ): Promise<ConflictAnalysisResult> {
    const dependencyChain: string[] = [];
    
    // Check if any changes in op1 depend on changes in op2 or vice versa
    for (const change1 of op1.changes) {
      if (change1.dependsOn) {
        for (const dep of change1.dependsOn) {
          const dependentChange = op2.changes.find(change => change.id === dep);
          if (dependentChange) {
            dependencyChain.push(`${change1.id} -> ${dep}`);
          }
        }
      }
    }
    
    // Check reverse dependencies
    for (const change2 of op2.changes) {
      if (change2.dependsOn) {
        for (const dep of change2.dependsOn) {
          const dependentChange = op1.changes.find(change => change.id === dep);
          if (dependentChange) {
            dependencyChain.push(`${change2.id} -> ${dep}`);
          }
        }
      }
    }
    
    // Check for circular dependencies
    const hasCircularDependency = this.detectCircularDependencies([...op1.changes, ...op2.changes]);
    
    if (dependencyChain.length > 0 || hasCircularDependency) {
      return {
        hasConflict: true,
        conflictType: ConflictType.DEPENDENCY_VIOLATION,
        severity: hasCircularDependency ? ConflictSeverity.CRITICAL : ConflictSeverity.HIGH,
        details: { dependencyChain },
        suggestedResolution: hasCircularDependency ? 
          'Break circular dependency by sequential processing' : 
          'Process operations in dependency order'
      };
    }
    
    return {
      hasConflict: false,
      conflictType: ConflictType.DEPENDENCY_VIOLATION,
      severity: ConflictSeverity.INFO,
      details: {}
    };
  }

  /**
   * Analyze resource contention between operations
   */
  private async analyzeResourceContention(
    op1: MultiPluginEditOperation, 
    op2: MultiPluginEditOperation
  ): Promise<ConflictAnalysisResult> {
    // Check if both operations require exclusive access to the same resources
    const sharedResources = this.findSharedResources(op1, op2);
    
    if (sharedResources.length > 0) {
      // Check if either operation requires exclusive access
      const requiresExclusiveAccess = this.requiresExclusiveAccess(op1) || this.requiresExclusiveAccess(op2);
      
      if (requiresExclusiveAccess) {
        return {
          hasConflict: true,
          conflictType: ConflictType.RESOURCE_CONTENTION,
          severity: ConflictSeverity.HIGH,
          details: { 
            resourceContention: { 
              resource: sharedResources[0], 
              requestingPlugins: [op1.pluginId, op2.pluginId] 
            } 
          },
          suggestedResolution: 'Sequential processing required for exclusive resource access'
        };
      }
    }
    
    return {
      hasConflict: false,
      conflictType: ConflictType.RESOURCE_CONTENTION,
      severity: ConflictSeverity.INFO,
      details: {}
    };
  }

  /**
   * Analyze priority conflicts between operations
   */
  private async analyzePriorityConflict(
    op1: MultiPluginEditOperation, 
    op2: MultiPluginEditOperation
  ): Promise<ConflictAnalysisResult> {
    const priorityDiff = Math.abs(op1.priority - op2.priority);
    
    if (priorityDiff >= this.config.priorityThreshold) {
      // Check if lower priority operation might interfere with higher priority one
      const interference = await this.checkPriorityInterference(op1, op2);
      
      if (interference) {
        return {
          hasConflict: true,
          conflictType: ConflictType.PRIORITY_CONFLICT,
          severity: priorityDiff >= 2 ? ConflictSeverity.HIGH : ConflictSeverity.MEDIUM,
          details: { 
            priorityMismatch: { 
              operation1: op1.priority, 
              operation2: op2.priority, 
              threshold: this.config.priorityThreshold 
            } 
          },
          suggestedResolution: 'Process higher priority operation first'
        };
      }
    }
    
    return {
      hasConflict: false,
      conflictType: ConflictType.PRIORITY_CONFLICT,
      severity: ConflictSeverity.INFO,
      details: {}
    };
  }

  /**
   * Detect multi-operation conflicts (more than 2 operations)
   */
  private async detectMultiOperationConflicts(operations: MultiPluginEditOperation[]): Promise<ChangeConflict[]> {
    if (operations.length < 3) return [];
    
    const conflicts: ChangeConflict[] = [];
    
    // Look for operations that all affect the same document region
    const regionConflicts = this.findRegionConflicts(operations);
    conflicts.push(...regionConflicts);
    
    // Look for complex dependency chains
    const dependencyConflicts = this.findComplexDependencyConflicts(operations);
    conflicts.push(...dependencyConflicts);
    
    return conflicts;
  }

  // Utility methods
  
  private filterSimultaneousOperations(operations: MultiPluginEditOperation[]): MultiPluginEditOperation[] {
    if (operations.length <= 1) return operations;
    
    const now = Date.now();
    return operations.filter(op => (now - op.timestamp) <= this.config.temporalWindow);
  }

  private calculateRangeOverlap(range1: {start: number, end: number}, range2: {start: number, end: number}): {start: number, end: number, size: number} | null {
    const start = Math.max(range1.start, range2.start);
    const end = Math.min(range1.end, range2.end);
    
    if (start < end) {
      return { start, end, size: end - start };
    }
    
    return null;
  }

  private calculateOverlapSeverity(totalOverlap: number, op1: MultiPluginEditOperation, op2: MultiPluginEditOperation): ConflictSeverity {
    // Consider the size of changes and their context
    const totalChangeSize = [...op1.changes, ...op2.changes].reduce((sum, change) => 
      sum + (change.to - change.from), 0);
    
    const overlapRatio = totalOverlap / totalChangeSize;
    
    if (overlapRatio > 0.8) return ConflictSeverity.CRITICAL;
    if (overlapRatio > 0.5) return ConflictSeverity.HIGH;
    if (overlapRatio > 0.2) return ConflictSeverity.MEDIUM;
    return ConflictSeverity.LOW;
  }

  private initializeSemanticCompatibilityMatrix(): void {
    this.semanticCompatibilityMatrix = new Map();
    
    // Define compatibility scores between different semantic intentions
    const intentions = ['correction', 'enhancement', 'formatting', 'content_addition', 'restructuring'];
    const compatibilityScores = [
      [0.8, 0.6, 0.7, 0.3, 0.2], // correction
      [0.6, 0.9, 0.8, 0.7, 0.4], // enhancement  
      [0.7, 0.8, 0.9, 0.5, 0.3], // formatting
      [0.3, 0.7, 0.5, 0.8, 0.6], // content_addition
      [0.2, 0.4, 0.3, 0.6, 0.9]  // restructuring
    ];
    
    intentions.forEach((intent1, i) => {
      const compatMap = new Map();
      intentions.forEach((intent2, j) => {
        compatMap.set(intent2, compatibilityScores[i][j]);
      });
      this.semanticCompatibilityMatrix.set(intent1, compatMap);
    });
  }

  private calculateSemanticCompatibility(intention1: string, intention2: string): number {
    const compatMap = this.semanticCompatibilityMatrix.get(intention1);
    return compatMap?.get(intention2) ?? 0.5; // Default neutral compatibility
  }

  private areInSameSemanticScope(context1: SemanticContext, context2: SemanticContext, distance: number): boolean {
    // Define scope distances
    const scopeDistances = {
      word: 10,
      sentence: 100,
      paragraph: 500,
      section: 2000,
      document: Infinity
    };
    
    const maxScope = context1.scope === context2.scope ? context1.scope : 
      (scopeDistances[context1.scope] > scopeDistances[context2.scope] ? context1.scope : context2.scope);
    
    return distance <= scopeDistances[maxScope];
  }

  private detectCircularDependencies(changes: EditChange[]): boolean {
    // Build dependency graph and check for cycles
    const graph = new Map<string, string[]>();
    
    for (const change of changes) {
      if (change.id && change.dependsOn) {
        graph.set(change.id, change.dependsOn);
      }
    }
    
    // DFS to detect cycles
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const hasCycle = (node: string): boolean => {
      if (recursionStack.has(node)) return true;
      if (visited.has(node)) return false;
      
      visited.add(node);
      recursionStack.add(node);
      
      const dependencies = graph.get(node) || [];
      for (const dep of dependencies) {
        if (hasCycle(dep)) return true;
      }
      
      recursionStack.delete(node);
      return false;
    };
    
    for (const node of graph.keys()) {
      if (hasCycle(node)) return true;
    }
    
    return false;
  }

  private findSharedResources(op1: MultiPluginEditOperation, op2: MultiPluginEditOperation): string[] {
    // For now, consider the document itself as the primary resource
    // Could be extended to include specific document sections, styles, etc.
    return op1.documentPath === op2.documentPath ? [op1.documentPath] : [];
  }

  private requiresExclusiveAccess(operation: MultiPluginEditOperation): boolean {
    // Check if operation requires exclusive document access
    return operation.priority === OperationPriority.CRITICAL ||
           operation.metadata.tags?.includes('exclusive_access') ||
           operation.changes.some(change => change.type === 'replace' && (change.to - change.from) > 1000);
  }

  private async checkPriorityInterference(op1: MultiPluginEditOperation, op2: MultiPluginEditOperation): Promise<boolean> {
    // Check if the lower priority operation might interfere with the higher priority one
    const lowerPriorityOp = op1.priority > op2.priority ? op1 : op2;
    const higherPriorityOp = op1.priority < op2.priority ? op1 : op2;
    
    // Look for overlapping changes or dependency relationships
    for (const lowPriorityChange of lowerPriorityOp.changes) {
      for (const highPriorityChange of higherPriorityOp.changes) {
        const overlap = this.calculateRangeOverlap(
          {start: lowPriorityChange.from, end: lowPriorityChange.to},
          {start: highPriorityChange.from, end: highPriorityChange.to}
        );
        
        if (overlap && overlap.size > 0) {
          return true;
        }
      }
    }
    
    return false;
  }

  private findRegionConflicts(operations: MultiPluginEditOperation[]): ChangeConflict[] {
    // Implementation for finding region-based conflicts among multiple operations
    // This would identify when 3+ operations all target the same document region
    return [];
  }

  private findComplexDependencyConflicts(operations: MultiPluginEditOperation[]): ChangeConflict[] {
    // Implementation for finding complex dependency chains that create conflicts
    // This would identify circular dependencies or impossible ordering requirements
    return [];
  }

  private shouldBeUserVisible(severity: ConflictSeverity, op1: MultiPluginEditOperation, op2: MultiPluginEditOperation): boolean {
    // Determine if conflict should be shown to user based on severity and operation metadata
    return severity >= ConflictSeverity.MEDIUM || 
           op1.metadata.requiresUserReview || 
           op2.metadata.requiresUserReview;
  }

  private suggestOverlapResolution(overlappingRanges: Array<{start: number, end: number, operations: string[]}>, op1: MultiPluginEditOperation, op2: MultiPluginEditOperation): string {
    if (op1.priority < op2.priority) {
      return 'Process higher priority operation first, then apply non-conflicting changes from lower priority operation';
    } else if (op1.capabilities.canMergeWith.includes(op2.pluginId)) {
      return 'Attempt intelligent merge of overlapping changes';
    } else {
      return 'Sequential processing required - process operations one at a time';
    }
  }

  private suggestSemanticResolution(semanticConflicts: Array<{intention1: string, intention2: string, compatibility: number}>, op1: MultiPluginEditOperation, op2: MultiPluginEditOperation): string {
    const avgCompatibility = semanticConflicts.reduce((sum, conf) => sum + conf.compatibility, 0) / semanticConflicts.length;
    
    if (avgCompatibility < 0.1) {
      return 'Semantic intentions are incompatible - user intervention required';
    } else if (avgCompatibility < 0.3) {
      return 'Attempt semantic merge with user review';
    } else {
      return 'Semantic merge may be possible with careful ordering';
    }
  }

  private getSeverityWeight(severity: ConflictSeverity): number {
    const weights = {
      [ConflictSeverity.CRITICAL]: 5,
      [ConflictSeverity.HIGH]: 4,
      [ConflictSeverity.MEDIUM]: 3,
      [ConflictSeverity.LOW]: 2,
      [ConflictSeverity.INFO]: 1
    };
    return weights[severity];
  }
}