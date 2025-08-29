/**
 * Change Grouping System for Editorial Engine Batch Processing
 * Task 2.4: Platform Integration - Intelligent change batching and grouping
 * 
 * This system provides semantic change grouping logic that matches how writers
 * actually work with Editorial Engine operations like copy editing, proofreading,
 * and developmental planning.
 */

import { 
  EditorialOperationType, 
  ChangeGroupingStrategy, 
  ChangeGroupMetadata, 
  ChangeGroupingConfig,
  ChangeGroupingResult
} from './types/submit-changes-from-ai';

// Import EditChange from the test file structure for now
interface EditChange {
  id?: string;
  timestamp: number;
  type: 'insert' | 'delete' | 'replace';
  from: number;
  to: number;
  text?: string;
  removedText?: string;
  author?: string;
  aiProvider?: string;
  aiModel?: string;
  processingContext?: any;
  aiTimestamp?: Date;
}

/**
 * Core change grouping system that provides intelligent batching
 * for Editorial Engine operations
 */
export class ChangeGroupingSystem {
  private config: ChangeGroupingConfig;
  private groupIdCounter = 0;

  constructor(config?: Partial<ChangeGroupingConfig>) {
    this.config = {
      enabled: true,
      defaultStrategy: 'mixed',
      maxChangesPerGroup: 25,
      timeWindowMs: 5000, // 5 seconds
      proximityThreshold: 100, // 100 characters
      minChangesForGroup: 2,
      enableHierarchicalGrouping: true,
      operationGroupingRules: {
        'proofreading': {
          strategy: 'proximity',
          maxChangesPerGroup: 50,
          priority: 'medium'
        },
        'copy-edit-pass': {
          strategy: 'mixed',
          maxChangesPerGroup: 30,
          priority: 'high'
        },
        'developmental-feedback': {
          strategy: 'semantic',
          maxChangesPerGroup: 15,
          priority: 'high'
        },
        'style-refinement': {
          strategy: 'operation-type',
          maxChangesPerGroup: 20,
          priority: 'medium'
        }
      },
      ...config
    };
  }

  /**
   * Main entry point for grouping changes from Editorial Engine operations
   */
  public groupChanges(
    changes: EditChange[],
    operationType: EditorialOperationType,
    operationDescription?: string
  ): ChangeGroupingResult {
    if (!this.config.enabled || changes.length < this.config.minChangesForGroup) {
      return this.createEmptyGroupingResult(changes);
    }

    const strategy = this.determineGroupingStrategy(operationType);
    const groups: ChangeGroupMetadata[] = [];
    const ungroupedChanges: string[] = [];
    const warnings: string[] = [];

    try {
      switch (strategy) {
        case 'proximity':
          this.groupByProximity(changes, operationType, operationDescription, groups, ungroupedChanges);
          break;
        case 'operation-type':
          this.groupByOperationType(changes, operationType, operationDescription, groups, ungroupedChanges);
          break;
        case 'semantic':
          this.groupBySemantic(changes, operationType, operationDescription, groups, ungroupedChanges);
          break;
        case 'time-window':
          this.groupByTimeWindow(changes, operationType, operationDescription, groups, ungroupedChanges);
          break;
        case 'mixed':
          this.groupByMixedStrategy(changes, operationType, operationDescription, groups, ungroupedChanges);
          break;
        default:
          // No grouping - all changes remain ungrouped
          ungroupedChanges.push(...changes.map(c => c.id!));
      }

      // Apply hierarchical grouping if enabled
      if (this.config.enableHierarchicalGrouping && groups.length > 1) {
        this.createHierarchicalGroups(groups);
      }

    } catch (error) {
      warnings.push(`Grouping error: ${error instanceof Error ? error.message : String(error)}`);
      // Fall back to no grouping
      ungroupedChanges.push(...changes.map(c => c.id!));
    }

    return this.createGroupingResult(changes, groups, ungroupedChanges, warnings);
  }

  /**
   * Group changes by proximity - changes close together in the document
   */
  private groupByProximity(
    changes: EditChange[],
    operationType: EditorialOperationType,
    operationDescription: string | undefined,
    groups: ChangeGroupMetadata[],
    ungroupedChanges: string[]
  ): void {
    // Sort changes by position
    const sortedChanges = [...changes].sort((a, b) => a.from - b.from);
    let currentGroup: EditChange[] = [];

    for (const change of sortedChanges) {
      if (currentGroup.length === 0) {
        currentGroup.push(change);
      } else {
        const lastChange = currentGroup[currentGroup.length - 1];
        const distance = change.from - lastChange.to;

        // If within proximity threshold, add to current group
        if (distance <= this.config.proximityThreshold && 
            currentGroup.length < this.getMaxChangesForOperation(operationType)) {
          currentGroup.push(change);
        } else {
          // Finalize current group and start new one
          if (currentGroup.length >= this.config.minChangesForGroup) {
            groups.push(this.createGroupMetadata(currentGroup, operationType, 'proximity', operationDescription));
          } else {
            ungroupedChanges.push(...currentGroup.map(c => c.id!));
          }
          currentGroup = [change];
        }
      }
    }

    // Handle final group
    if (currentGroup.length >= this.config.minChangesForGroup) {
      groups.push(this.createGroupMetadata(currentGroup, operationType, 'proximity', operationDescription));
    } else {
      ungroupedChanges.push(...currentGroup.map(c => c.id!));
    }
  }

  /**
   * Group changes by operation type - similar change types together
   */
  private groupByOperationType(
    changes: EditChange[],
    operationType: EditorialOperationType,
    operationDescription: string | undefined,
    groups: ChangeGroupMetadata[],
    ungroupedChanges: string[]
  ): void {
    const changesByType = new Map<string, EditChange[]>();

    // Group by change type (insert, delete, replace)
    for (const change of changes) {
      const key = change.type;
      if (!changesByType.has(key)) {
        changesByType.set(key, []);
      }
      changesByType.get(key)!.push(change);
    }

    // Create groups for each type that has sufficient changes
    for (const [type, typeChanges] of changesByType.entries()) {
      if (typeChanges.length >= this.config.minChangesForGroup) {
        // Further subdivide large groups
        const maxChanges = this.getMaxChangesForOperation(operationType);
        const subGroups = this.subdivideGroup(typeChanges, maxChanges);
        
        for (const subGroup of subGroups) {
          groups.push(this.createGroupMetadata(
            subGroup, 
            operationType, 
            'operation-type', 
            operationDescription,
            `${this.getOperationTypeDescription(type)} changes`
          ));
        }
      } else {
        ungroupedChanges.push(...typeChanges.map(c => c.id!));
      }
    }
  }

  /**
   * Group changes by semantic similarity
   */
  private groupBySemantic(
    changes: EditChange[],
    operationType: EditorialOperationType,
    operationDescription: string | undefined,
    groups: ChangeGroupMetadata[],
    ungroupedChanges: string[]
  ): void {
    // For semantic grouping, we use a combination of content analysis and position
    const semanticGroups = new Map<string, EditChange[]>();

    for (const change of changes) {
      const semanticKey = this.determineSemanticKey(change, operationType);
      if (!semanticGroups.has(semanticKey)) {
        semanticGroups.set(semanticKey, []);
      }
      semanticGroups.get(semanticKey)!.push(change);
    }

    // Create groups for semantic clusters
    for (const [semanticKey, semanticChanges] of semanticGroups.entries()) {
      if (semanticChanges.length >= this.config.minChangesForGroup) {
        const maxChanges = this.getMaxChangesForOperation(operationType);
        const subGroups = this.subdivideGroup(semanticChanges, maxChanges);
        
        for (const subGroup of subGroups) {
          groups.push(this.createGroupMetadata(
            subGroup, 
            operationType, 
            'semantic', 
            operationDescription,
            `${semanticKey} improvements`
          ));
        }
      } else {
        ungroupedChanges.push(...semanticChanges.map(c => c.id!));
      }
    }
  }

  /**
   * Group changes by time window
   */
  private groupByTimeWindow(
    changes: EditChange[],
    operationType: EditorialOperationType,
    operationDescription: string | undefined,
    groups: ChangeGroupMetadata[],
    ungroupedChanges: string[]
  ): void {
    // Sort changes by timestamp
    const sortedChanges = [...changes].sort((a, b) => a.timestamp - b.timestamp);
    let currentGroup: EditChange[] = [];
    let groupStartTime = 0;

    for (const change of sortedChanges) {
      if (currentGroup.length === 0) {
        currentGroup.push(change);
        groupStartTime = change.timestamp;
      } else {
        const timeSinceGroupStart = change.timestamp - groupStartTime;

        // If within time window, add to current group
        if (timeSinceGroupStart <= this.config.timeWindowMs && 
            currentGroup.length < this.getMaxChangesForOperation(operationType)) {
          currentGroup.push(change);
        } else {
          // Finalize current group and start new one
          if (currentGroup.length >= this.config.minChangesForGroup) {
            groups.push(this.createGroupMetadata(currentGroup, operationType, 'time-window', operationDescription));
          } else {
            ungroupedChanges.push(...currentGroup.map(c => c.id!));
          }
          currentGroup = [change];
          groupStartTime = change.timestamp;
        }
      }
    }

    // Handle final group
    if (currentGroup.length >= this.config.minChangesForGroup) {
      groups.push(this.createGroupMetadata(currentGroup, operationType, 'time-window', operationDescription));
    } else {
      ungroupedChanges.push(...currentGroup.map(c => c.id!));
    }
  }

  /**
   * Mixed strategy combining proximity, operation type, and semantic analysis
   */
  private groupByMixedStrategy(
    changes: EditChange[],
    operationType: EditorialOperationType,
    operationDescription: string | undefined,
    groups: ChangeGroupMetadata[],
    ungroupedChanges: string[]
  ): void {
    // First pass: Group by proximity
    const proximityGroups: EditChange[][] = [];
    const sortedChanges = [...changes].sort((a, b) => a.from - b.from);
    let currentGroup: EditChange[] = [];

    for (const change of sortedChanges) {
      if (currentGroup.length === 0) {
        currentGroup.push(change);
      } else {
        const lastChange = currentGroup[currentGroup.length - 1];
        const distance = change.from - lastChange.to;

        if (distance <= this.config.proximityThreshold * 2) { // More lenient for mixed strategy
          currentGroup.push(change);
        } else {
          if (currentGroup.length > 0) {
            proximityGroups.push(currentGroup);
          }
          currentGroup = [change];
        }
      }
    }
    if (currentGroup.length > 0) {
      proximityGroups.push(currentGroup);
    }

    // Second pass: Within each proximity group, further organize by operation type
    for (const proximityGroup of proximityGroups) {
      if (proximityGroup.length < this.config.minChangesForGroup) {
        ungroupedChanges.push(...proximityGroup.map(c => c.id!));
        continue;
      }

      // Sub-group by operation type within this proximity group
      const typeGroups = new Map<string, EditChange[]>();
      for (const change of proximityGroup) {
        const typeKey = `${change.type}-${this.determineSemanticKey(change, operationType)}`;
        if (!typeGroups.has(typeKey)) {
          typeGroups.set(typeKey, []);
        }
        typeGroups.get(typeKey)!.push(change);
      }

      // Create final groups
      for (const [typeKey, typeChanges] of typeGroups.entries()) {
        if (typeChanges.length >= this.config.minChangesForGroup) {
          const maxChanges = this.getMaxChangesForOperation(operationType);
          if (typeChanges.length <= maxChanges) {
            groups.push(this.createGroupMetadata(
              typeChanges, 
              operationType, 
              'mixed', 
              operationDescription
            ));
          } else {
            // Subdivide large groups
            const subGroups = this.subdivideGroup(typeChanges, maxChanges);
            for (const subGroup of subGroups) {
              groups.push(this.createGroupMetadata(
                subGroup, 
                operationType, 
                'mixed', 
                operationDescription
              ));
            }
          }
        } else {
          ungroupedChanges.push(...typeChanges.map(c => c.id!));
        }
      }
    }
  }

  /**
   * Create hierarchical grouping structure for large operations
   */
  private createHierarchicalGroups(groups: ChangeGroupMetadata[]): void {
    if (groups.length <= 3) return; // Not worth hierarchical grouping

    // Create parent groups for related operations
    const parentGroups = new Map<string, ChangeGroupMetadata[]>();
    
    for (const group of groups) {
      const parentKey = this.determineParentGroupKey(group);
      if (!parentGroups.has(parentKey)) {
        parentGroups.set(parentKey, []);
      }
      parentGroups.get(parentKey)!.push(group);
    }

    // Create parent group metadata for groups with multiple children
    for (const [parentKey, childGroups] of parentGroups.entries()) {
      if (childGroups.length > 1) {
        const parentGroupId = this.generateGroupId();
        const parentGroup: ChangeGroupMetadata = {
          groupId: parentGroupId,
          operationType: childGroups[0].operationType,
          operationDescription: `${parentKey} (${childGroups.length} sections)`,
          groupingStrategy: 'mixed',
          createdAt: new Date(),
          changeCount: childGroups.reduce((sum, g) => sum + g.changeCount, 0),
          scope: 'document',
          positionRange: {
            start: Math.min(...childGroups.map(g => g.positionRange.start)),
            end: Math.max(...childGroups.map(g => g.positionRange.end))
          },
          priority: this.determineGroupPriority(childGroups[0].operationType),
          status: 'pending',
          childGroupIds: childGroups.map(g => g.groupId)
        };

        // Update child groups to reference parent
        for (const childGroup of childGroups) {
          childGroup.parentGroupId = parentGroupId;
        }

        // Insert parent group at beginning
        groups.unshift(parentGroup);
      }
    }
  }

  /**
   * Helper methods for grouping logic
   */
  private determineGroupingStrategy(operationType: EditorialOperationType): ChangeGroupingStrategy {
    const rule = this.config.operationGroupingRules[operationType];
    return rule?.strategy || this.config.defaultStrategy;
  }

  private getMaxChangesForOperation(operationType: EditorialOperationType): number {
    const rule = this.config.operationGroupingRules[operationType];
    return rule?.maxChangesPerGroup || this.config.maxChangesPerGroup;
  }

  private determineSemanticKey(change: EditChange, operationType: EditorialOperationType): string {
    // Simplified semantic analysis based on change content and type
    if (operationType === 'proofreading') {
      if (change.text && /[.!?]$/.test(change.text.trim())) return 'sentence-ending';
      if (change.type === 'replace' && change.removedText && change.text) {
        if (/^[A-Z]/.test(change.text) && /^[a-z]/.test(change.removedText)) return 'capitalization';
        if (change.text.length < change.removedText.length) return 'spelling-correction';
      }
      return 'grammar-fix';
    }
    
    if (operationType === 'style-refinement') {
      if (change.type === 'replace') return 'word-choice';
      if (change.type === 'insert') return 'clarification';
      return 'style-improvement';
    }

    return change.type;
  }

  private getOperationTypeDescription(changeType: string): string {
    switch (changeType) {
      case 'insert': return 'Addition';
      case 'delete': return 'Removal';
      case 'replace': return 'Replacement';
      default: return 'Edit';
    }
  }

  private determineParentGroupKey(group: ChangeGroupMetadata): string {
    const scopePrefix = group.scope === 'document' ? 'Document-wide' : 'Section';
    return `${scopePrefix} ${group.operationType}`;
  }

  private determineGroupPriority(operationType: EditorialOperationType): 'high' | 'medium' | 'low' {
    const rule = this.config.operationGroupingRules[operationType];
    if (rule?.priority) return rule.priority;
    
    // Default priorities based on operation importance
    switch (operationType) {
      case 'developmental-feedback':
      case 'copy-edit-pass':
        return 'high';
      case 'proofreading':
      case 'style-refinement':
        return 'medium';
      default:
        return 'low';
    }
  }

  private subdivideGroup(changes: EditChange[], maxSize: number): EditChange[][] {
    if (changes.length <= maxSize) return [changes];
    
    const groups: EditChange[][] = [];
    for (let i = 0; i < changes.length; i += maxSize) {
      groups.push(changes.slice(i, i + maxSize));
    }
    return groups;
  }

  private createGroupMetadata(
    changes: EditChange[],
    operationType: EditorialOperationType,
    strategy: ChangeGroupingStrategy,
    operationDescription?: string,
    specificDescription?: string
  ): ChangeGroupMetadata {
    const positions = changes.map(c => ({ start: c.from, end: c.to }));
    const minPos = Math.min(...positions.map(p => p.start));
    const maxPos = Math.max(...positions.map(p => p.end));
    
    // Determine scope based on position spread
    let scope: 'paragraph' | 'section' | 'document' | 'selection' = 'selection';
    const positionSpread = maxPos - minPos;
    if (positionSpread > 5000) scope = 'document';
    else if (positionSpread > 1000) scope = 'section';
    else if (positionSpread > 200) scope = 'paragraph';

    return {
      groupId: this.generateGroupId(),
      operationType,
      operationDescription: specificDescription || operationDescription || this.getDefaultOperationDescription(operationType),
      groupingStrategy: strategy,
      createdAt: new Date(),
      changeCount: changes.length,
      scope,
      positionRange: { start: minPos, end: maxPos },
      priority: this.determineGroupPriority(operationType),
      status: 'pending'
    };
  }

  private getDefaultOperationDescription(operationType: EditorialOperationType): string {
    switch (operationType) {
      case 'copy-edit-pass': return 'Comprehensive copy editing pass';
      case 'proofreading': return 'Grammar and spelling corrections';
      case 'developmental-feedback': return 'Structural and content improvements';
      case 'style-refinement': return 'Voice and tone refinements';
      case 'fact-checking': return 'Accuracy and verification changes';
      case 'formatting': return 'Document formatting updates';
      case 'content-expansion': return 'Content additions and elaborations';
      case 'content-reduction': return 'Content trimming and condensing';
      case 'rewriting': return 'Content restructuring and rewriting';
      default: return 'Editorial changes';
    }
  }

  private generateGroupId(): string {
    return `group_${Date.now()}_${++this.groupIdCounter}`;
  }

  private createEmptyGroupingResult(changes: EditChange[]): ChangeGroupingResult {
    return {
      groups: [],
      ungroupedChanges: changes.map(c => c.id!),
      warnings: [],
      statistics: {
        totalChanges: changes.length,
        groupedChanges: 0,
        ungroupedChanges: changes.length,
        groupsCreated: 0,
        averageGroupSize: 0
      }
    };
  }

  private createGroupingResult(
    changes: EditChange[],
    groups: ChangeGroupMetadata[],
    ungroupedChanges: string[],
    warnings: string[]
  ): ChangeGroupingResult {
    const groupedChanges = groups.reduce((sum, g) => sum + g.changeCount, 0);
    
    return {
      groups,
      ungroupedChanges,
      warnings,
      statistics: {
        totalChanges: changes.length,
        groupedChanges,
        ungroupedChanges: ungroupedChanges.length,
        groupsCreated: groups.length,
        averageGroupSize: groups.length > 0 ? groupedChanges / groups.length : 0
      }
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<ChangeGroupingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  public getConfig(): ChangeGroupingConfig {
    return { ...this.config };
  }
}

/**
 * Default configuration for different editorial workflows
 */
export const DEFAULT_GROUPING_CONFIGS = {
  PROOFREADING: {
    defaultStrategy: 'proximity' as ChangeGroupingStrategy,
    maxChangesPerGroup: 50,
    proximityThreshold: 150,
    minChangesForGroup: 3
  },
  
  COPY_EDITING: {
    defaultStrategy: 'mixed' as ChangeGroupingStrategy,
    maxChangesPerGroup: 30,
    proximityThreshold: 200,
    minChangesForGroup: 2,
    enableHierarchicalGrouping: true
  },
  
  DEVELOPMENTAL: {
    defaultStrategy: 'semantic' as ChangeGroupingStrategy,
    maxChangesPerGroup: 15,
    proximityThreshold: 500,
    minChangesForGroup: 2,
    enableHierarchicalGrouping: true
  }
};