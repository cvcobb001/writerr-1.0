import { Change } from '../types';
import { ClusterData, ClusterConfig } from '../clustering/types';
import { ClusteringStrategy, StrategyConfig, StrategyResult, StrategyPerformance } from './types';

export class ProximityStrategy implements ClusteringStrategy {
  public readonly name = 'Proximity-Based Clustering';
  public readonly description = 'Groups changes based on their physical proximity in the document';
  
  public readonly config: StrategyConfig = {
    name: this.name,
    description: this.description,
    parameters: {
      proximityThreshold: {
        name: 'Proximity Threshold',
        type: 'number',
        defaultValue: 100,
        min: 10,
        max: 1000,
        step: 10,
        description: 'Maximum distance in characters between changes to be clustered together',
        required: true
      },
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
      maxClusterSize: {
        name: 'Maximum Cluster Size',
        type: 'number',
        defaultValue: 15,
        min: 5,
        max: 50,
        step: 1,
        description: 'Maximum number of changes allowed in a single cluster',
        required: true
      },
      adaptiveThreshold: {
        name: 'Adaptive Threshold',
        type: 'boolean',
        defaultValue: true,
        description: 'Automatically adjust proximity threshold based on document characteristics',
        required: false
      },
      weightByConfidence: {
        name: 'Weight by Confidence',
        type: 'boolean',
        defaultValue: true,
        description: 'Consider confidence when determining proximity clusters',
        required: false
      }
    },
    performance: {
      complexity: 'O(n log n)',
      memoryUsage: 'medium',
      accuracy: 0.8,
      speed: 0.85,
      scalability: 0.85
    },
    applicableScenarios: [
      'Focused editing sessions',
      'Localized changes',
      'Section-based revisions',
      'Proximity-aware workflows'
    ]
  };

  public async cluster(changes: Change[], config: ClusterConfig): Promise<StrategyResult> {
    const startTime = Date.now();
    
    try {
      const clusters = await this.performProximityClustering(changes, config);
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
      throw new Error(`Proximity clustering failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public canHandle(changes: Change[], config: ClusterConfig): boolean {
    if (changes.length < 2) return false;
    
    // Check if changes have position information
    const hasPositions = changes.every(change => 
      change.position && 
      typeof change.position.start === 'number' && 
      typeof change.position.end === 'number'
    );
    
    if (!hasPositions) return false;
    
    // Check if there's reasonable spread for proximity clustering
    const positions = changes.map(c => c.position.start).sort((a, b) => a - b);
    const documentSpan = positions[positions.length - 1] - positions[0];
    const avgDistance = documentSpan / Math.max(changes.length - 1, 1);
    
    // Proximity clustering is most effective when changes aren't too spread out
    return avgDistance < 5000; // Arbitrary threshold for reasonable proximity
  }

  public estimatePerformance(changeCount: number): StrategyPerformance {
    const basePerformance = this.config.performance;
    
    // Performance degrades with very large datasets due to sorting and distance calculations
    if (changeCount > 500) {
      return {
        ...basePerformance,
        speed: Math.max(0.6, basePerformance.speed - 0.2),
        scalability: Math.max(0.7, basePerformance.scalability - 0.15),
        memoryUsage: 'high'
      };
    }
    
    if (changeCount > 100) {
      return {
        ...basePerformance,
        speed: Math.max(0.75, basePerformance.speed - 0.1),
        scalability: Math.max(0.8, basePerformance.scalability - 0.05)
      };
    }
    
    return basePerformance;
  }

  private async performProximityClustering(
    changes: Change[], 
    config: ClusterConfig
  ): Promise<ClusterData[]> {
    // Sort changes by position
    const sortedChanges = [...changes].sort((a, b) => a.position.start - b.position.start);
    
    // Determine proximity threshold
    const proximityThreshold = this.config.parameters.adaptiveThreshold.defaultValue 
      ? this.calculateAdaptiveThreshold(sortedChanges, config)
      : config.proximityThreshold;
    
    // Build clusters using proximity
    const clusters = this.buildProximityClusters(sortedChanges, proximityThreshold, config);
    
    // Apply confidence weighting if enabled
    if (this.config.parameters.weightByConfidence.defaultValue) {
      this.applyConfidenceWeighting(clusters);
    }
    
    return clusters;
  }

  private calculateAdaptiveThreshold(
    sortedChanges: Change[], 
    config: ClusterConfig
  ): number {
    if (sortedChanges.length < 2) {
      return config.proximityThreshold;
    }
    
    // Calculate distances between consecutive changes
    const distances: number[] = [];
    for (let i = 1; i < sortedChanges.length; i++) {
      const distance = sortedChanges[i].position.start - sortedChanges[i - 1].position.end;
      distances.push(Math.max(0, distance));
    }
    
    // Use median distance as basis for adaptive threshold
    distances.sort((a, b) => a - b);
    const median = distances[Math.floor(distances.length / 2)];
    const q3 = distances[Math.floor(distances.length * 0.75)];
    
    // Adaptive threshold is between median and Q3, but bounded by configuration
    const adaptiveThreshold = Math.min(
      Math.max(median * 1.5, 50), // At least 50 characters
      Math.min(q3 * 2, config.proximityThreshold * 2) // At most 2x configured threshold
    );
    
    return adaptiveThreshold;
  }

  private buildProximityClusters(
    sortedChanges: Change[],
    proximityThreshold: number,
    config: ClusterConfig
  ): ClusterData[] {
    const clusters: ClusterData[] = [];
    let currentCluster: Change[] = [];
    
    for (let i = 0; i < sortedChanges.length; i++) {
      const change = sortedChanges[i];
      
      if (currentCluster.length === 0) {
        // Start new cluster
        currentCluster.push(change);
      } else {
        const lastChange = currentCluster[currentCluster.length - 1];
        const distance = change.position.start - lastChange.position.end;
        
        if (distance <= proximityThreshold && 
            currentCluster.length < config.maxClusterSize) {
          // Add to current cluster
          currentCluster.push(change);
        } else {
          // Finalize current cluster if it meets minimum size
          if (currentCluster.length >= config.minClusterSize) {
            clusters.push(this.createProximityCluster(currentCluster, proximityThreshold));
          }
          
          // Start new cluster
          currentCluster = [change];
        }
      }
    }
    
    // Don't forget the last cluster
    if (currentCluster.length >= config.minClusterSize) {
      clusters.push(this.createProximityCluster(currentCluster, proximityThreshold));
    }
    
    return clusters;
  }

  private createProximityCluster(
    changes: Change[], 
    proximityThreshold: number
  ): ClusterData {
    const id = this.generateClusterId();
    const now = Date.now();
    
    // Calculate centroid
    const positions = changes.map(c => c.position.start);
    const avgPosition = positions.reduce((sum, pos) => sum + pos, 0) / positions.length;
    const avgConfidence = changes.reduce((sum, c) => sum + c.confidence, 0) / changes.length;
    
    const spanStart = Math.min(...positions);
    const spanEnd = Math.max(...changes.map(c => c.position.end));
    
    // Determine primary category and source
    const categories = new Map<string, number>();
    const sources = new Map<string, number>();
    
    changes.forEach(change => {
      categories.set(change.category, (categories.get(change.category) || 0) + 1);
      sources.set(change.source, (sources.get(change.source) || 0) + 1);
    });
    
    const primaryCategory = Array.from(categories.entries())
      .sort((a, b) => b[1] - a[1])[0][0] as any;
    const primarySource = Array.from(sources.entries())
      .sort((a, b) => b[1] - a[1])[0][0] as any;
    
    const centroid = {
      category: primaryCategory,
      source: primarySource,
      confidence: avgConfidence,
      position: avgPosition,
      span: {
        start: spanStart,
        end: spanEnd
      }
    };
    
    // Calculate metrics
    const metrics = {
      coherence: this.calculateProximityCoherence(changes, proximityThreshold),
      confidence: avgConfidence,
      density: this.calculateDensity(changes),
      diversity: this.calculateDiversity(changes)
    };
    
    // Generate title and description
    const span = spanEnd - spanStart;
    const title = `Nearby Changes (${this.formatPosition(spanStart)}-${this.formatPosition(spanEnd)})`;
    const description = `${changes.length} changes in ${span} characters (${this.getSpanDescription(span)})`;
    
    return {
      id,
      changes,
      centroid,
      metrics,
      strategy: 'proximity' as any,
      title,
      description,
      createdAt: now,
      updatedAt: now
    };
  }

  private applyConfidenceWeighting(clusters: ClusterData[]): void {
    for (const cluster of clusters) {
      // Sort changes within cluster by confidence (highest first)
      cluster.changes.sort((a, b) => b.confidence - a.confidence);
      
      // Recalculate metrics with confidence weighting
      const weightedConfidence = this.calculateWeightedConfidence(cluster.changes);
      cluster.centroid.confidence = weightedConfidence;
      cluster.metrics.confidence = weightedConfidence;
      
      // Update description to reflect confidence weighting
      const highConfidenceCount = cluster.changes.filter(c => c.confidence > 0.8).length;
      if (highConfidenceCount > cluster.changes.length * 0.7) {
        cluster.description += ' (high confidence)';
      }
    }
  }

  private calculateProximityCoherence(changes: Change[], threshold: number): number {
    if (changes.length <= 1) return 1.0;
    
    // Coherence based on how tightly packed the changes are relative to threshold
    const positions = changes.map(c => c.position.start).sort((a, b) => a - b);
    const actualSpan = positions[positions.length - 1] - positions[0];
    const theoreticalSpan = (changes.length - 1) * threshold;
    
    return Math.max(0, Math.min(1, 1 - (actualSpan / Math.max(theoreticalSpan, 1))));
  }

  private calculateDensity(changes: Change[]): number {
    if (changes.length <= 1) return 1.0;
    
    const positions = changes.map(c => c.position.start).sort((a, b) => a - b);
    const span = positions[positions.length - 1] - positions[0] + 1;
    
    return Math.min(1.0, changes.length / Math.max(span / 50, 1)); // Normalize by expected character density
  }

  private calculateDiversity(changes: Change[]): number {
    const categories = new Set(changes.map(c => c.category));
    const sources = new Set(changes.map(c => c.source));
    
    // Diversity is the variety of categories and sources
    return (categories.size + sources.size) / (changes.length * 2);
  }

  private calculateWeightedConfidence(changes: Change[]): number {
    // Higher confidence changes get exponentially more weight
    let weightedSum = 0;
    let totalWeight = 0;
    
    changes.forEach(change => {
      const weight = Math.pow(change.confidence, 2); // Square for exponential weighting
      weightedSum += change.confidence * weight;
      totalWeight += weight;
    });
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private calculateConfidence(clusters: ClusterData[], originalChanges: Change[]): number {
    if (clusters.length === 0) return 0;
    
    const totalChanges = originalChanges.length;
    const clusteredChanges = clusters.reduce((sum, cluster) => sum + cluster.changes.length, 0);
    const clusteringRatio = clusteredChanges / totalChanges;
    
    // Confidence also based on how well proximity clustering captured related changes
    const avgCoherence = clusters.reduce((sum, cluster) => 
      sum + cluster.metrics.coherence, 0) / clusters.length;
      
    return (clusteringRatio + avgCoherence) / 2;
  }

  private calculateEfficiency(clusters: ClusterData[], originalChanges: Change[]): number {
    if (originalChanges.length === 0) return 1.0;
    
    const clusteredChanges = clusters.reduce((sum, cluster) => sum + cluster.changes.length, 0);
    const clusteringEfficiency = clusteredChanges / originalChanges.length;
    
    // Efficiency penalty for having many small, scattered clusters
    const avgDensity = clusters.length > 0 
      ? clusters.reduce((sum, c) => sum + c.metrics.density, 0) / clusters.length 
      : 0;
    
    return (clusteringEfficiency + avgDensity) / 2;
  }

  private generateWarnings(clusters: ClusterData[], originalChanges: Change[]): string[] {
    const warnings: string[] = [];
    
    const clusteredChanges = clusters.reduce((sum, cluster) => sum + cluster.changes.length, 0);
    const unclusteredCount = originalChanges.length - clusteredChanges;
    
    if (unclusteredCount > originalChanges.length * 0.4) {
      warnings.push(`High number of isolated changes (${unclusteredCount})`);
    }
    
    const lowDensityClusters = clusters.filter(c => c.metrics.density < 0.3);
    if (lowDensityClusters.length > clusters.length * 0.5) {
      warnings.push(`Many sparse clusters detected - consider increasing proximity threshold`);
    }
    
    const positions = originalChanges.map(c => c.position.start);
    const documentSpan = Math.max(...positions) - Math.min(...positions);
    if (documentSpan > 10000 && clusters.length < 3) {
      warnings.push('Document span is large but few clusters created - proximity strategy may not be optimal');
    }
    
    return warnings;
  }

  private formatPosition(position: number): string {
    if (position < 1000) {
      return `${position}`;
    } else if (position < 1000000) {
      return `${Math.floor(position / 1000)}k`;
    } else {
      return `${Math.floor(position / 1000000)}M`;
    }
  }

  private getSpanDescription(span: number): string {
    if (span < 50) return 'very tight';
    if (span < 200) return 'tight';
    if (span < 500) return 'moderate';
    if (span < 1000) return 'loose';
    return 'very loose';
  }

  private generateClusterId(): string {
    return `proximity-cluster-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}