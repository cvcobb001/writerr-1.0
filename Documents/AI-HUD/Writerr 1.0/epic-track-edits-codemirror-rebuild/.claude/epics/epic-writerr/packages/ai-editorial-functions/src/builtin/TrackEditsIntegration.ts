/**
 * @fileoverview Track Edits integration configuration for built-in functions
 */

import { TrackEditsConfig } from '../types';

export interface TrackEditsIntegrationConfig {
  functionId: string;
  config: TrackEditsConfig;
  changeTypeMapping: Record<string, {
    category: string;
    color: string;
    priority: number;
    autoApply: boolean;
    reviewRequired: boolean;
  }>;
  clusteringRules: {
    maxClusterSize: number;
    proximityThreshold: number;
    semanticGrouping: boolean;
  };
}

/**
 * Track Edits integration configurations for all built-in functions
 */
export class TrackEditsIntegration {
  private static readonly integrationConfigs: Record<string, TrackEditsIntegrationConfig> = {
    'copy-editor': {
      functionId: 'copy-editor',
      config: {
        batchingStrategy: 'batch',
        clusterStrategy: 'sentence',
        confidenceThreshold: 0.8,
        changeCategories: ['grammar', 'style', 'clarity', 'flow', 'word-choice', 'conciseness'],
        requiresReview: false
      },
      changeTypeMapping: {
        'grammar': {
          category: 'technical',
          color: '#4CAF50', // Green
          priority: 8,
          autoApply: true,
          reviewRequired: false
        },
        'style': {
          category: 'editorial',
          color: '#2196F3', // Blue
          priority: 6,
          autoApply: false,
          reviewRequired: true
        },
        'clarity': {
          category: 'editorial',
          color: '#FF9800', // Orange
          priority: 7,
          autoApply: false,
          reviewRequired: true
        },
        'flow': {
          category: 'editorial',
          color: '#9C27B0', // Purple
          priority: 5,
          autoApply: false,
          reviewRequired: true
        },
        'word-choice': {
          category: 'editorial',
          color: '#607D8B', // Blue Gray
          priority: 4,
          autoApply: false,
          reviewRequired: true
        },
        'conciseness': {
          category: 'editorial',
          color: '#795548', // Brown
          priority: 6,
          autoApply: false,
          reviewRequired: true
        }
      },
      clusteringRules: {
        maxClusterSize: 5,
        proximityThreshold: 50, // characters
        semanticGrouping: true
      }
    },

    'proofreader': {
      functionId: 'proofreader',
      config: {
        batchingStrategy: 'immediate',
        clusterStrategy: 'none',
        confidenceThreshold: 0.95,
        changeCategories: ['grammar', 'spelling', 'punctuation', 'capitalization', 'syntax'],
        requiresReview: false
      },
      changeTypeMapping: {
        'grammar': {
          category: 'technical',
          color: '#4CAF50', // Green
          priority: 10,
          autoApply: true,
          reviewRequired: false
        },
        'spelling': {
          category: 'technical',
          color: '#F44336', // Red
          priority: 10,
          autoApply: true,
          reviewRequired: false
        },
        'punctuation': {
          category: 'technical',
          color: '#FF5722', // Deep Orange
          priority: 9,
          autoApply: true,
          reviewRequired: false
        },
        'capitalization': {
          category: 'technical',
          color: '#3F51B5', // Indigo
          priority: 8,
          autoApply: true,
          reviewRequired: false
        },
        'syntax': {
          category: 'technical',
          color: '#009688', // Teal
          priority: 9,
          autoApply: true,
          reviewRequired: false
        }
      },
      clusteringRules: {
        maxClusterSize: 1,
        proximityThreshold: 0,
        semanticGrouping: false
      }
    },

    'developmental-editor': {
      functionId: 'developmental-editor',
      config: {
        batchingStrategy: 'defer',
        clusterStrategy: 'section',
        confidenceThreshold: 0.75,
        changeCategories: ['structure', 'organization', 'argument', 'logic', 'development', 'transitions'],
        requiresReview: true
      },
      changeTypeMapping: {
        'structure': {
          category: 'developmental',
          color: '#E91E63', // Pink
          priority: 3,
          autoApply: false,
          reviewRequired: true
        },
        'organization': {
          category: 'developmental',
          color: '#9C27B0', // Purple
          priority: 4,
          autoApply: false,
          reviewRequired: true
        },
        'argument': {
          category: 'developmental',
          color: '#673AB7', // Deep Purple
          priority: 5,
          autoApply: false,
          reviewRequired: true
        },
        'logic': {
          category: 'developmental',
          color: '#3F51B5', // Indigo
          priority: 6,
          autoApply: false,
          reviewRequired: true
        },
        'development': {
          category: 'developmental',
          color: '#2196F3', // Blue
          priority: 4,
          autoApply: false,
          reviewRequired: true
        },
        'transitions': {
          category: 'developmental',
          color: '#03DAC6', // Teal
          priority: 5,
          autoApply: false,
          reviewRequired: true
        }
      },
      clusteringRules: {
        maxClusterSize: 10,
        proximityThreshold: 200,
        semanticGrouping: true
      }
    },

    'co-writer': {
      functionId: 'co-writer',
      config: {
        batchingStrategy: 'batch',
        clusterStrategy: 'paragraph',
        confidenceThreshold: 0.70,
        changeCategories: ['content-addition', 'expansion', 'voice-integration', 'creative-development'],
        requiresReview: true
      },
      changeTypeMapping: {
        'content-addition': {
          category: 'creative',
          color: '#FF6B35', // Orange Red
          priority: 2,
          autoApply: false,
          reviewRequired: true
        },
        'expansion': {
          category: 'creative',
          color: '#F7931E', // Orange
          priority: 3,
          autoApply: false,
          reviewRequired: true
        },
        'voice-integration': {
          category: 'creative',
          color: '#FFD23F', // Yellow
          priority: 4,
          autoApply: false,
          reviewRequired: true
        },
        'creative-development': {
          category: 'creative',
          color: '#06FFA5', // Mint Green
          priority: 3,
          autoApply: false,
          reviewRequired: true
        }
      },
      clusteringRules: {
        maxClusterSize: 8,
        proximityThreshold: 100,
        semanticGrouping: true
      }
    }
  };

  /**
   * Get Track Edits integration configuration for a function
   */
  static getConfig(functionId: string): TrackEditsIntegrationConfig | undefined {
    return this.integrationConfigs[functionId];
  }

  /**
   * Get all Track Edits integration configurations
   */
  static getAllConfigs(): Record<string, TrackEditsIntegrationConfig> {
    return { ...this.integrationConfigs };
  }

  /**
   * Get change type mapping for a specific function and change type
   */
  static getChangeTypeConfig(functionId: string, changeType: string): {
    category: string;
    color: string;
    priority: number;
    autoApply: boolean;
    reviewRequired: boolean;
  } | undefined {
    const config = this.integrationConfigs[functionId];
    return config?.changeTypeMapping[changeType];
  }

  /**
   * Get clustering configuration for a function
   */
  static getClusteringConfig(functionId: string): {
    maxClusterSize: number;
    proximityThreshold: number;
    semanticGrouping: boolean;
  } | undefined {
    return this.integrationConfigs[functionId]?.clusteringRules;
  }

  /**
   * Check if a function should auto-apply changes
   */
  static shouldAutoApply(functionId: string, changeType: string): boolean {
    const changeConfig = this.getChangeTypeConfig(functionId, changeType);
    return changeConfig?.autoApply || false;
  }

  /**
   * Check if a function requires review
   */
  static requiresReview(functionId: string, changeType: string): boolean {
    const changeConfig = this.getChangeTypeConfig(functionId, changeType);
    return changeConfig?.reviewRequired || false;
  }

  /**
   * Get priority for a change type
   */
  static getChangePriority(functionId: string, changeType: string): number {
    const changeConfig = this.getChangeTypeConfig(functionId, changeType);
    return changeConfig?.priority || 5; // Default priority
  }

  /**
   * Generate Track Edits metadata for a function result
   */
  static generateTrackEditsMetadata(
    functionId: string,
    changes: Array<{
      type: string;
      original: string;
      revised: string;
      position: { start: number; end: number };
      confidence: number;
      reason?: string;
    }>
  ): {
    functionId: string;
    totalChanges: number;
    changesByType: Record<string, number>;
    changesByCategory: Record<string, number>;
    averageConfidence: number;
    autoApplicableCount: number;
    reviewRequiredCount: number;
    clusters: Array<{
      id: string;
      changes: number[];
      category: string;
      priority: number;
      autoApply: boolean;
    }>;
  } {
    const config = this.getConfig(functionId);
    
    if (!config) {
      throw new Error(`No Track Edits configuration found for function: ${functionId}`);
    }

    // Categorize changes
    const changesByType: Record<string, number> = {};
    const changesByCategory: Record<string, number> = {};
    let autoApplicableCount = 0;
    let reviewRequiredCount = 0;
    
    changes.forEach(change => {
      // Count by type
      changesByType[change.type] = (changesByType[change.type] || 0) + 1;
      
      // Get change configuration
      const changeConfig = config.changeTypeMapping[change.type];
      if (changeConfig) {
        // Count by category
        changesByCategory[changeConfig.category] = (changesByCategory[changeConfig.category] || 0) + 1;
        
        // Count auto-applicable and review required
        if (changeConfig.autoApply) autoApplicableCount++;
        if (changeConfig.reviewRequired) reviewRequiredCount++;
      }
    });

    // Calculate average confidence
    const averageConfidence = changes.length > 0 ? 
      changes.reduce((sum, change) => sum + change.confidence, 0) / changes.length : 
      0;

    // Generate clusters based on configuration
    const clusters = this.generateClusters(functionId, changes, config);

    return {
      functionId,
      totalChanges: changes.length,
      changesByType,
      changesByCategory,
      averageConfidence,
      autoApplicableCount,
      reviewRequiredCount,
      clusters
    };
  }

  /**
   * Generate change clusters for Track Edits
   */
  private static generateClusters(
    functionId: string,
    changes: Array<{
      type: string;
      original: string;
      revised: string;
      position: { start: number; end: number };
      confidence: number;
      reason?: string;
    }>,
    config: TrackEditsIntegrationConfig
  ): Array<{
    id: string;
    changes: number[];
    category: string;
    priority: number;
    autoApply: boolean;
  }> {
    const clusters: Array<{
      id: string;
      changes: number[];
      category: string;
      priority: number;
      autoApply: boolean;
    }> = [];

    // If no clustering, each change is its own cluster
    if (config.config.clusterStrategy === 'none') {
      changes.forEach((change, index) => {
        const changeConfig = config.changeTypeMapping[change.type];
        clusters.push({
          id: `${functionId}-${index}`,
          changes: [index],
          category: changeConfig?.category || 'unknown',
          priority: changeConfig?.priority || 5,
          autoApply: changeConfig?.autoApply || false
        });
      });
      return clusters;
    }

    // Group changes based on clustering strategy
    const changeGroups = this.groupChangesByClustering(changes, config);
    
    changeGroups.forEach((group, groupIndex) => {
      // Determine cluster properties based on the changes in the group
      const categories = group.map(changeIndex => {
        const change = changes[changeIndex];
        const changeConfig = config.changeTypeMapping[change.type];
        return changeConfig?.category || 'unknown';
      });
      
      const priorities = group.map(changeIndex => {
        const change = changes[changeIndex];
        const changeConfig = config.changeTypeMapping[change.type];
        return changeConfig?.priority || 5;
      });

      const autoApplyStates = group.map(changeIndex => {
        const change = changes[changeIndex];
        const changeConfig = config.changeTypeMapping[change.type];
        return changeConfig?.autoApply || false;
      });

      // Use the most common category, highest priority, and require all to be auto-apply
      const mostCommonCategory = this.getMostCommon(categories);
      const highestPriority = Math.max(...priorities);
      const allAutoApply = autoApplyStates.every(state => state);

      clusters.push({
        id: `${functionId}-cluster-${groupIndex}`,
        changes: group,
        category: mostCommonCategory,
        priority: highestPriority,
        autoApply: allAutoApply
      });
    });

    return clusters;
  }

  /**
   * Group changes based on clustering strategy
   */
  private static groupChangesByClustering(
    changes: Array<{
      type: string;
      position: { start: number; end: number };
    }>,
    config: TrackEditsIntegrationConfig
  ): number[][] {
    const groups: number[][] = [];
    const { maxClusterSize, proximityThreshold, semanticGrouping } = config.clusteringRules;

    // Sort changes by position
    const sortedIndices = changes
      .map((_, index) => index)
      .sort((a, b) => changes[a].position.start - changes[b].position.start);

    let currentGroup: number[] = [];

    for (const changeIndex of sortedIndices) {
      const change = changes[changeIndex];
      
      // Check if this change should start a new group
      const shouldStartNewGroup = 
        currentGroup.length === 0 || // First change
        currentGroup.length >= maxClusterSize || // Group is full
        (currentGroup.length > 0 && 
         change.position.start - changes[currentGroup[currentGroup.length - 1]].position.end > proximityThreshold) || // Too far from last change
        (semanticGrouping && !this.isSemanticallyRelated(change.type, changes[currentGroup[currentGroup.length - 1]].type));

      if (shouldStartNewGroup && currentGroup.length > 0) {
        groups.push(currentGroup);
        currentGroup = [];
      }

      currentGroup.push(changeIndex);
    }

    // Don't forget the last group
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  }

  /**
   * Check if two change types are semantically related
   */
  private static isSemanticallyRelated(type1: string, type2: string): boolean {
    // Define semantic groupings
    const semanticGroups = [
      ['grammar', 'syntax', 'punctuation'],
      ['spelling', 'capitalization'],
      ['style', 'word-choice', 'clarity'],
      ['structure', 'organization', 'transitions'],
      ['content-addition', 'expansion', 'creative-development']
    ];

    return semanticGroups.some(group => 
      group.includes(type1) && group.includes(type2)
    );
  }

  /**
   * Get the most common item in an array
   */
  private static getMostCommon<T>(array: T[]): T {
    const counts: Record<string, number> = {};
    array.forEach(item => {
      const key = String(item);
      counts[key] = (counts[key] || 0) + 1;
    });

    let mostCommon = array[0];
    let maxCount = 0;
    Object.entries(counts).forEach(([item, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = array.find(i => String(i) === item) || array[0];
      }
    });

    return mostCommon;
  }
}