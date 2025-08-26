import { Change, ChangeCategory } from '../types';
import { ClusterData, ClusterConfig } from '../clustering/types';
import { ClusteringStrategy, StrategyConfig, StrategyResult, StrategyPerformance } from './types';

export class CategoryStrategy implements ClusteringStrategy {
  public readonly name = 'Category-Based Clustering';
  public readonly description = 'Groups changes by their category (grammar, style, content, etc.)';
  
  public readonly config: StrategyConfig = {
    name: this.name,
    description: this.description,
    parameters: {
      minClusterSize: {
        name: 'Minimum Cluster Size',
        type: 'number',
        defaultValue: 2,
        min: 1,
        max: 20,
        step: 1,
        description: 'Minimum number of changes required to form a cluster',
        required: true
      },
      categoryPriority: {
        name: 'Category Priority',
        type: 'enum',
        defaultValue: 'balanced',
        options: ['grammar', 'style', 'content', 'structure', 'formatting', 'spelling', 'balanced'],
        description: 'Which category to prioritize when creating clusters',
        required: true
      },
      subcategorizeByConfidence: {
        name: 'Subcategorize by Confidence',
        type: 'boolean',
        defaultValue: true,
        description: 'Create sub-clusters within categories based on confidence levels',
        required: false
      },
      confidenceThresholds: {
        name: 'Confidence Thresholds',
        type: 'string',
        defaultValue: '0.9,0.7,0.5',
        description: 'Comma-separated confidence thresholds for sub-clustering',
        required: false
      }
    },
    performance: {
      complexity: 'O(n)',
      memoryUsage: 'low',
      accuracy: 0.85,
      speed: 0.95,
      scalability: 0.9
    },
    applicableScenarios: [
      'General text editing',
      'AI-assisted writing',
      'Grammar and style checking',
      'Content organization'
    ]
  };

  public async cluster(changes: Change[], config: ClusterConfig): Promise<StrategyResult> {
    const startTime = Date.now();
    
    try {
      const clusters = await this.performCategoryClustering(changes, config);
      const processingTime = Date.now() - startTime;
      
      return {
        clusters,
        metadata: {
          strategyUsed: this.name,
          processingTime,
          confidence: this.calculateConfidence(clusters, changes),
          efficiency: this.calculateEfficiency(clusters, changes),
          warnings: this.generateWarnings(clusters, changes)
        }
      };
    } catch (error) {
      throw new Error(`Category clustering failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public canHandle(changes: Change[], config: ClusterConfig): boolean {
    // Category strategy can handle any set of changes
    if (changes.length === 0) return false;
    
    // Check if changes have category information
    const hasCategories = changes.every(change => change.category !== undefined);
    
    // Ensure we have a reasonable variety of categories
    const categories = new Set(changes.map(c => c.category));
    const hasVariety = categories.size >= 2 || changes.length <= config.minClusterSize * 2;
    
    return hasCategories && hasVariety;
  }

  public estimatePerformance(changeCount: number): StrategyPerformance {
    // Linear complexity with excellent speed
    const basePerformance = this.config.performance;
    
    // Adjust based on data size
    if (changeCount > 1000) {
      return {
        ...basePerformance,
        speed: Math.max(0.7, basePerformance.speed - 0.1),
        scalability: Math.max(0.8, basePerformance.scalability - 0.1)
      };
    }
    
    return basePerformance;
  }

  private async performCategoryClustering(
    changes: Change[], 
    config: ClusterConfig
  ): Promise<ClusterData[]> {
    // Group changes by category
    const categoryGroups = this.groupByCategory(changes);
    const clusters: ClusterData[] = [];
    
    for (const [category, categoryChanges] of categoryGroups.entries()) {
      if (categoryChanges.length < config.minClusterSize) {
        continue;
      }
      
      // Check if we should subcategorize by confidence
      const subcategorize = this.config.parameters.subcategorizeByConfidence.defaultValue;
      
      if (subcategorize && categoryChanges.length >= config.minClusterSize * 2) {
        const subClusters = this.createConfidenceSubclusters(categoryChanges, config, category);
        clusters.push(...subClusters);
      } else {
        const cluster = this.createCategoryCluster(categoryChanges, category);
        clusters.push(cluster);
      }
    }
    
    return clusters;
  }

  private groupByCategory(changes: Change[]): Map<ChangeCategory, Change[]> {
    const groups = new Map<ChangeCategory, Change[]>();
    
    for (const change of changes) {
      const existing = groups.get(change.category) || [];
      existing.push(change);
      groups.set(change.category, existing);
    }
    
    return groups;
  }

  private createConfidenceSubclusters(
    changes: Change[], 
    config: ClusterConfig, 
    category: ChangeCategory
  ): ClusterData[] {
    const thresholds = this.parseConfidenceThresholds();
    const subClusters: ClusterData[] = [];
    
    for (let i = 0; i < thresholds.length; i++) {
      const minThreshold = i === thresholds.length - 1 ? 0 : thresholds[i + 1];
      const maxThreshold = thresholds[i];
      
      const subClusterChanges = changes.filter(
        change => change.confidence <= maxThreshold && change.confidence > minThreshold
      );
      
      if (subClusterChanges.length >= config.minClusterSize) {
        const confidenceLabel = this.getConfidenceLabel(maxThreshold);
        const cluster = this.createCategoryCluster(
          subClusterChanges, 
          category,
          `${confidenceLabel} Confidence`
        );
        subClusters.push(cluster);
      }
    }
    
    // If no sub-clusters were created, create a single cluster
    if (subClusters.length === 0) {
      subClusters.push(this.createCategoryCluster(changes, category));
    }
    
    return subClusters;
  }

  private createCategoryCluster(
    changes: Change[], 
    category: ChangeCategory, 
    confidenceLabel?: string
  ): ClusterData {
    const id = this.generateClusterId();
    const now = Date.now();
    
    // Calculate centroid
    const totalConfidence = changes.reduce((sum, c) => sum + c.confidence, 0);
    const avgConfidence = totalConfidence / changes.length;
    
    const positions = changes.map(c => c.position.start).sort((a, b) => a - b);
    const avgPosition = positions.reduce((sum, pos) => sum + pos, 0) / positions.length;
    
    const sources = [...new Set(changes.map(c => c.source))];
    const primarySource = sources.length === 1 ? sources[0] : changes[0].source;
    
    const centroid = {
      category,
      source: primarySource,
      confidence: avgConfidence,
      position: avgPosition,
      span: {
        start: Math.min(...positions),
        end: Math.max(...changes.map(c => c.position.end))
      }
    };
    
    // Calculate metrics
    const metrics = {
      coherence: this.calculateCategoryCoherence(changes),
      confidence: avgConfidence,
      density: this.calculateDensity(changes),
      diversity: sources.length / changes.length
    };
    
    // Generate title and description
    const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
    const title = confidenceLabel 
      ? `${categoryName} Changes (${confidenceLabel})`
      : `${categoryName} Changes`;
      
    const description = `${changes.length} ${category} changes` + 
      (confidenceLabel ? ` with ${confidenceLabel.toLowerCase()} confidence` : '') +
      ` (avg confidence: ${(avgConfidence * 100).toFixed(1)}%)`;
    
    return {
      id,
      changes,
      centroid,
      metrics,
      strategy: 'category' as any,
      title,
      description,
      createdAt: now,
      updatedAt: now
    };
  }

  private parseConfidenceThresholds(): number[] {
    const thresholdStr = this.config.parameters.confidenceThresholds.defaultValue as string;
    return thresholdStr.split(',').map(t => parseFloat(t.trim())).sort((a, b) => b - a);
  }

  private getConfidenceLabel(threshold: number): string {
    if (threshold >= 0.9) return 'High';
    if (threshold >= 0.7) return 'Medium';
    if (threshold >= 0.5) return 'Low';
    return 'Very Low';
  }

  private calculateCategoryCoherence(changes: Change[]): number {
    // Category strategy should have perfect coherence since all changes are in the same category
    const categories = new Set(changes.map(c => c.category));
    return categories.size === 1 ? 1.0 : 1.0 - (categories.size - 1) / changes.length;
  }

  private calculateDensity(changes: Change[]): number {
    if (changes.length <= 1) return 1.0;
    
    const positions = changes.map(c => c.position.start).sort((a, b) => a - b);
    const span = positions[positions.length - 1] - positions[0] + 1;
    
    return Math.min(1.0, changes.length / Math.max(span / 100, 1));
  }

  private calculateConfidence(clusters: ClusterData[], originalChanges: Change[]): number {
    if (clusters.length === 0) return 0;
    
    const totalChanges = originalChanges.length;
    const clusteredChanges = clusters.reduce((sum, cluster) => sum + cluster.changes.length, 0);
    const clusteringRatio = clusteredChanges / totalChanges;
    
    const avgClusterConfidence = clusters.reduce((sum, cluster) => 
      sum + cluster.metrics.confidence, 0) / clusters.length;
      
    return (clusteringRatio + avgClusterConfidence) / 2;
  }

  private calculateEfficiency(clusters: ClusterData[], originalChanges: Change[]): number {
    if (originalChanges.length === 0) return 1.0;
    
    const clusteredChanges = clusters.reduce((sum, cluster) => sum + cluster.changes.length, 0);
    const clusteringEfficiency = clusteredChanges / originalChanges.length;
    
    // Penalize having too many small clusters
    const avgClusterSize = clusters.length > 0 ? clusteredChanges / clusters.length : 0;
    const sizeEfficiency = Math.min(1.0, avgClusterSize / 5); // Optimal cluster size around 5
    
    return (clusteringEfficiency + sizeEfficiency) / 2;
  }

  private generateWarnings(clusters: ClusterData[], originalChanges: Change[]): string[] {
    const warnings: string[] = [];
    
    const clusteredChanges = clusters.reduce((sum, cluster) => sum + cluster.changes.length, 0);
    const unclusteredCount = originalChanges.length - clusteredChanges;
    
    if (unclusteredCount > originalChanges.length * 0.3) {
      warnings.push(`High number of unclustered changes (${unclusteredCount})`);
    }
    
    const smallClusters = clusters.filter(c => c.changes.length < 3);
    if (smallClusters.length > clusters.length * 0.5) {
      warnings.push(`Many small clusters detected (${smallClusters.length}/${clusters.length})`);
    }
    
    const categories = new Set(originalChanges.map(c => c.category));
    if (categories.size === 1 && clusters.length > 1) {
      warnings.push('Multiple clusters created for single category - consider confidence-based sub-clustering');
    }
    
    return warnings;
  }

  private generateClusterId(): string {
    return `category-cluster-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}