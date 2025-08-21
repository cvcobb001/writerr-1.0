import { Change, ChangeCategory, ChangeSource } from '../types';
import { 
  ClusterConfig, 
  ClusteringStrategy, 
  ClusteringResult, 
  ClusterData, 
  ClusterCentroid,
  ClusterUpdateEvent,
  ClusteringConfig
} from './types';

export class ClusteringEngine {
  private config: ClusteringConfig;
  private activeClusters: Map<string, ClusterData> = new Map();
  private updateListeners: ((event: ClusterUpdateEvent) => void)[] = [];
  private updateQueue: Change[] = [];
  private updateTimer: NodeJS.Timeout | null = null;

  constructor(config: ClusteringConfig) {
    this.config = config;
  }

  /**
   * Main clustering method that processes changes and returns clustered results
   */
  public async clusterChanges(
    changes: Change[], 
    clusterConfig: ClusterConfig
  ): Promise<ClusteringResult> {
    const startTime = Date.now();
    
    try {
      // Clear existing clusters if starting fresh
      this.activeClusters.clear();
      
      // Filter changes based on confidence threshold
      const filteredChanges = changes.filter(
        change => change.confidence >= clusterConfig.confidenceThreshold
      );

      // Apply clustering strategy
      const clusters = await this.applyClustering(filteredChanges, clusterConfig);
      
      // Calculate unclusteredChanges
      const clusteredChangeIds = new Set(
        clusters.flatMap(cluster => cluster.changes.map(change => change.id))
      );
      const unclusteredChanges = filteredChanges.filter(
        change => !clusteredChangeIds.has(change.id)
      );

      // Calculate metrics
      const metrics = this.calculateClusteringMetrics(clusters, filteredChanges);

      const result: ClusteringResult = {
        clusters,
        unclusteredChanges,
        metrics
      };

      console.log(`Clustering completed in ${Date.now() - startTime}ms`);
      return result;

    } catch (error) {
      console.error('Clustering failed:', error);
      throw new Error(`Clustering failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add a single change and update clusters dynamically
   */
  public async addChange(change: Change, clusterConfig: ClusterConfig): Promise<void> {
    if (!this.config.enableRealTimeUpdates) {
      return;
    }

    // Add to update queue
    this.updateQueue.push(change);

    // Debounce updates
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }

    this.updateTimer = setTimeout(async () => {
      await this.processUpdateQueue(clusterConfig);
    }, this.config.updateDebounceMs);
  }

  /**
   * Remove a change and update clusters
   */
  public async removeChange(changeId: string): Promise<void> {
    for (const [clusterId, cluster] of this.activeClusters) {
      const changeIndex = cluster.changes.findIndex(c => c.id === changeId);
      if (changeIndex !== -1) {
        cluster.changes.splice(changeIndex, 1);
        cluster.updatedAt = Date.now();

        // Update centroid and metrics
        if (cluster.changes.length > 0) {
          cluster.centroid = this.calculateCentroid(cluster.changes);
          cluster.metrics = this.calculateClusterMetrics(cluster.changes);
        } else {
          // Remove empty cluster
          this.activeClusters.delete(clusterId);
        }

        this.notifyListeners({
          type: 'remove',
          clusterId,
          changeIds: [changeId],
          timestamp: Date.now(),
          reason: 'Change removed'
        });
        break;
      }
    }
  }

  /**
   * Subscribe to cluster update events
   */
  public onClusterUpdate(listener: (event: ClusterUpdateEvent) => void): void {
    this.updateListeners.push(listener);
  }

  /**
   * Get current active clusters
   */
  public getActiveClusters(): ClusterData[] {
    return Array.from(this.activeClusters.values());
  }

  private async applyClustering(
    changes: Change[], 
    config: ClusterConfig
  ): Promise<ClusterData[]> {
    switch (config.strategy) {
      case ClusteringStrategy.CATEGORY:
        return this.clusterByCategory(changes, config);
      case ClusteringStrategy.CONFIDENCE:
        return this.clusterByConfidence(changes, config);
      case ClusteringStrategy.PROXIMITY:
        return this.clusterByProximity(changes, config);
      case ClusteringStrategy.SOURCE:
        return this.clusterBySource(changes, config);
      case ClusteringStrategy.HYBRID:
        return this.clusterByHybrid(changes, config);
      case ClusteringStrategy.ML_INSPIRED:
        return this.clusterByMLInspired(changes, config);
      default:
        return this.clusterByHybrid(changes, config);
    }
  }

  private clusterByCategory(changes: Change[], config: ClusterConfig): ClusterData[] {
    const categoryGroups = new Map<ChangeCategory, Change[]>();
    
    for (const change of changes) {
      const existing = categoryGroups.get(change.category) || [];
      existing.push(change);
      categoryGroups.set(change.category, existing);
    }

    return Array.from(categoryGroups.entries())
      .filter(([_, changes]) => changes.length >= config.minClusterSize)
      .map(([category, changes]) => this.createCluster(changes, config.strategy, {
        title: `${category.charAt(0).toUpperCase() + category.slice(1)} Changes`,
        description: `Changes related to ${category}`
      }));
  }

  private clusterByConfidence(changes: Change[], config: ClusterConfig): ClusterData[] {
    // Group by confidence ranges
    const confidenceRanges = [
      { min: 0.9, max: 1.0, label: 'High Confidence' },
      { min: 0.7, max: 0.9, label: 'Medium Confidence' },
      { min: 0.5, max: 0.7, label: 'Low Confidence' }
    ];

    const clusters: ClusterData[] = [];

    for (const range of confidenceRanges) {
      const rangeChanges = changes.filter(
        change => change.confidence >= range.min && change.confidence < range.max
      );

      if (rangeChanges.length >= config.minClusterSize) {
        clusters.push(this.createCluster(rangeChanges, config.strategy, {
          title: range.label,
          description: `Changes with ${range.label.toLowerCase()}`
        }));
      }
    }

    return clusters;
  }

  private clusterByProximity(changes: Change[], config: ClusterConfig): ClusterData[] {
    const sortedChanges = [...changes].sort((a, b) => a.position.start - b.position.start);
    const clusters: ClusterData[] = [];
    let currentCluster: Change[] = [];

    for (let i = 0; i < sortedChanges.length; i++) {
      const change = sortedChanges[i];
      
      if (currentCluster.length === 0) {
        currentCluster.push(change);
      } else {
        const lastChange = currentCluster[currentCluster.length - 1];
        const distance = change.position.start - lastChange.position.end;

        if (distance <= config.proximityThreshold) {
          currentCluster.push(change);
        } else {
          // Finalize current cluster if it meets size requirements
          if (currentCluster.length >= config.minClusterSize) {
            clusters.push(this.createCluster(currentCluster, config.strategy, {
              title: `Nearby Changes (${currentCluster[0].position.start}-${currentCluster[currentCluster.length - 1].position.end})`,
              description: 'Changes in close proximity'
            }));
          }
          currentCluster = [change];
        }
      }

      // Handle cluster size limits
      if (currentCluster.length >= config.maxClusterSize) {
        clusters.push(this.createCluster(currentCluster, config.strategy, {
          title: `Nearby Changes (${currentCluster[0].position.start}-${currentCluster[currentCluster.length - 1].position.end})`,
          description: 'Changes in close proximity'
        }));
        currentCluster = [];
      }
    }

    // Don't forget the last cluster
    if (currentCluster.length >= config.minClusterSize) {
      clusters.push(this.createCluster(currentCluster, config.strategy, {
        title: `Nearby Changes (${currentCluster[0].position.start}-${currentCluster[currentCluster.length - 1].position.end})`,
        description: 'Changes in close proximity'
      }));
    }

    return clusters;
  }

  private clusterBySource(changes: Change[], config: ClusterConfig): ClusterData[] {
    const sourceGroups = new Map<ChangeSource, Change[]>();
    
    for (const change of changes) {
      const existing = sourceGroups.get(change.source) || [];
      existing.push(change);
      sourceGroups.set(change.source, existing);
    }

    return Array.from(sourceGroups.entries())
      .filter(([_, changes]) => changes.length >= config.minClusterSize)
      .map(([source, changes]) => this.createCluster(changes, config.strategy, {
        title: `${source.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} Changes`,
        description: `Changes from ${source}`
      }));
  }

  private clusterByHybrid(changes: Change[], config: ClusterConfig): ClusterData[] {
    // Calculate similarity scores between all pairs of changes
    const similarities = new Map<string, number>();
    const clusters: ClusterData[] = [];
    const processed = new Set<string>();

    for (let i = 0; i < changes.length; i++) {
      if (processed.has(changes[i].id)) continue;

      const clusterChanges: Change[] = [changes[i]];
      processed.add(changes[i].id);

      for (let j = i + 1; j < changes.length; j++) {
        if (processed.has(changes[j].id)) continue;

        const similarity = this.calculateSimilarity(changes[i], changes[j], config);
        const key = `${changes[i].id}-${changes[j].id}`;
        similarities.set(key, similarity);

        // If similarity is high enough, add to cluster
        if (similarity > 0.7) {
          clusterChanges.push(changes[j]);
          processed.add(changes[j].id);
        }
      }

      if (clusterChanges.length >= config.minClusterSize) {
        const centroid = this.calculateCentroid(clusterChanges);
        clusters.push(this.createCluster(clusterChanges, config.strategy, {
          title: this.generateClusterTitle(clusterChanges, centroid),
          description: this.generateClusterDescription(clusterChanges)
        }));
      }
    }

    return clusters;
  }

  private clusterByMLInspired(changes: Change[], config: ClusterConfig): ClusterData[] {
    // K-means inspired clustering with multiple features
    const k = Math.min(Math.max(2, Math.floor(changes.length / config.minClusterSize)), config.maxClusters || 10);
    const maxIterations = 10;
    
    // Initialize centroids randomly
    let centroids = this.initializeCentroids(changes, k);
    let clusters: Change[][] = Array(k).fill(null).map(() => []);
    
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      // Clear clusters
      clusters = Array(k).fill(null).map(() => []);
      
      // Assign changes to closest centroid
      for (const change of changes) {
        let minDistance = Infinity;
        let closestCentroid = 0;
        
        for (let i = 0; i < centroids.length; i++) {
          const distance = this.calculateDistance(change, centroids[i], config);
          if (distance < minDistance) {
            minDistance = distance;
            closestCentroid = i;
          }
        }
        
        clusters[closestCentroid].push(change);
      }
      
      // Update centroids
      const newCentroids = clusters.map(cluster => 
        cluster.length > 0 ? this.calculateCentroid(cluster) : centroids[clusters.indexOf(cluster)]
      );
      
      // Check for convergence
      const converged = centroids.every((centroid, i) => 
        this.centroidsEqual(centroid, newCentroids[i])
      );
      
      centroids = newCentroids;
      
      if (converged) {
        break;
      }
    }

    // Convert to ClusterData objects
    return clusters
      .filter(cluster => cluster.length >= config.minClusterSize)
      .map((cluster, index) => this.createCluster(cluster, config.strategy, {
        title: this.generateClusterTitle(cluster, centroids[index]),
        description: this.generateClusterDescription(cluster)
      }));
  }

  private calculateSimilarity(change1: Change, change2: Change, config: ClusterConfig): number {
    let score = 0;
    let totalWeight = 0;

    // Category similarity
    if (config.categoryWeight > 0) {
      score += change1.category === change2.category ? config.categoryWeight : 0;
      totalWeight += config.categoryWeight;
    }

    // Source similarity
    if (config.sourceWeight > 0) {
      score += change1.source === change2.source ? config.sourceWeight : 0;
      totalWeight += config.sourceWeight;
    }

    // Confidence similarity
    if (config.confidenceWeight > 0) {
      const confidenceSimilarity = 1 - Math.abs(change1.confidence - change2.confidence);
      score += confidenceSimilarity * config.confidenceWeight;
      totalWeight += config.confidenceWeight;
    }

    // Proximity similarity
    if (config.proximityWeight > 0) {
      const distance = Math.abs(change1.position.start - change2.position.start);
      const proximitySimilarity = Math.max(0, 1 - (distance / config.proximityThreshold));
      score += proximitySimilarity * config.proximityWeight;
      totalWeight += config.proximityWeight;
    }

    return totalWeight > 0 ? score / totalWeight : 0;
  }

  private calculateDistance(change: Change, centroid: ClusterCentroid, config: ClusterConfig): number {
    let distance = 0;

    // Category distance
    if (config.categoryWeight > 0) {
      distance += change.category !== centroid.category ? config.categoryWeight : 0;
    }

    // Source distance
    if (config.sourceWeight > 0) {
      distance += change.source !== centroid.source ? config.sourceWeight : 0;
    }

    // Confidence distance
    if (config.confidenceWeight > 0) {
      distance += Math.abs(change.confidence - centroid.confidence) * config.confidenceWeight;
    }

    // Position distance
    if (config.proximityWeight > 0) {
      distance += Math.abs(change.position.start - centroid.position) * config.proximityWeight / 1000;
    }

    return distance;
  }

  private initializeCentroids(changes: Change[], k: number): ClusterCentroid[] {
    const centroids: ClusterCentroid[] = [];
    
    // Use k-means++ initialization for better results
    const randomChange = changes[Math.floor(Math.random() * changes.length)];
    centroids.push(this.changeToCentroid(randomChange));
    
    for (let i = 1; i < k; i++) {
      const distances = changes.map(change => {
        const minDistance = Math.min(...centroids.map(centroid => 
          Math.abs(change.position.start - centroid.position)
        ));
        return minDistance * minDistance;
      });
      
      const totalDistance = distances.reduce((sum, d) => sum + d, 0);
      let randomValue = Math.random() * totalDistance;
      
      for (let j = 0; j < changes.length; j++) {
        randomValue -= distances[j];
        if (randomValue <= 0) {
          centroids.push(this.changeToCentroid(changes[j]));
          break;
        }
      }
    }
    
    return centroids;
  }

  private changeToCentroid(change: Change): ClusterCentroid {
    return {
      category: change.category,
      source: change.source,
      confidence: change.confidence,
      position: change.position.start,
      span: {
        start: change.position.start,
        end: change.position.end
      }
    };
  }

  private calculateCentroid(changes: Change[]): ClusterCentroid {
    if (changes.length === 0) {
      throw new Error('Cannot calculate centroid for empty cluster');
    }

    // Find most common category and source
    const categoryCount = new Map<ChangeCategory, number>();
    const sourceCount = new Map<ChangeSource, number>();
    
    let totalConfidence = 0;
    let totalPosition = 0;
    let minStart = Infinity;
    let maxEnd = -Infinity;

    for (const change of changes) {
      categoryCount.set(change.category, (categoryCount.get(change.category) || 0) + 1);
      sourceCount.set(change.source, (sourceCount.get(change.source) || 0) + 1);
      
      totalConfidence += change.confidence;
      totalPosition += change.position.start;
      minStart = Math.min(minStart, change.position.start);
      maxEnd = Math.max(maxEnd, change.position.end);
    }

    const mostCommonCategory = Array.from(categoryCount.entries())
      .sort((a, b) => b[1] - a[1])[0][0];
    
    const mostCommonSource = Array.from(sourceCount.entries())
      .sort((a, b) => b[1] - a[1])[0][0];

    return {
      category: mostCommonCategory,
      source: mostCommonSource,
      confidence: totalConfidence / changes.length,
      position: totalPosition / changes.length,
      span: {
        start: minStart,
        end: maxEnd
      }
    };
  }

  private centroidsEqual(centroid1: ClusterCentroid, centroid2: ClusterCentroid): boolean {
    return centroid1.category === centroid2.category &&
           centroid1.source === centroid2.source &&
           Math.abs(centroid1.confidence - centroid2.confidence) < 0.01 &&
           Math.abs(centroid1.position - centroid2.position) < 10;
  }

  private createCluster(
    changes: Change[], 
    strategy: ClusteringStrategy,
    options: { title: string; description: string }
  ): ClusterData {
    const id = `cluster-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const centroid = this.calculateCentroid(changes);
    const metrics = this.calculateClusterMetrics(changes);
    const now = Date.now();

    const cluster: ClusterData = {
      id,
      changes,
      centroid,
      metrics,
      strategy,
      title: options.title,
      description: options.description,
      createdAt: now,
      updatedAt: now
    };

    // Add to active clusters
    this.activeClusters.set(id, cluster);

    return cluster;
  }

  private calculateClusterMetrics(changes: Change[]) {
    if (changes.length === 0) {
      return {
        coherence: 0,
        confidence: 0,
        density: 0,
        diversity: 0
      };
    }

    const categories = new Set(changes.map(c => c.category));
    const sources = new Set(changes.map(c => c.source));
    const totalConfidence = changes.reduce((sum, c) => sum + c.confidence, 0);
    
    const positions = changes.map(c => c.position.start).sort((a, b) => a - b);
    const span = positions[positions.length - 1] - positions[0] + 1;
    const density = changes.length / Math.max(span, 1);
    
    // Coherence based on category and source consistency
    const categoryCoherence = 1 - (categories.size - 1) / Math.max(changes.length - 1, 1);
    const sourceCoherence = 1 - (sources.size - 1) / Math.max(changes.length - 1, 1);
    const coherence = (categoryCoherence + sourceCoherence) / 2;

    return {
      coherence: Math.max(0, Math.min(1, coherence)),
      confidence: totalConfidence / changes.length,
      density: Math.min(1, density / 0.1), // Normalize density
      diversity: (categories.size + sources.size) / (Object.keys(ChangeCategory).length + Object.keys(ChangeSource).length)
    };
  }

  private calculateClusteringMetrics(clusters: ClusterData[], allChanges: Change[]) {
    const totalClusters = clusters.length;
    const totalClusteredChanges = clusters.reduce((sum, cluster) => sum + cluster.changes.length, 0);
    const averageClusterSize = totalClusters > 0 ? totalClusteredChanges / totalClusters : 0;
    const clusteringEfficiency = allChanges.length > 0 ? totalClusteredChanges / allChanges.length : 0;
    
    // Simplified silhouette score calculation
    let silhouetteScore = 0;
    if (clusters.length > 1) {
      // This is a simplified version - a full implementation would be more complex
      const avgIntraClusterDistance = clusters.reduce((sum, cluster) => {
        if (cluster.changes.length <= 1) return sum;
        let totalDistance = 0;
        let pairCount = 0;
        
        for (let i = 0; i < cluster.changes.length; i++) {
          for (let j = i + 1; j < cluster.changes.length; j++) {
            totalDistance += Math.abs(
              cluster.changes[i].position.start - cluster.changes[j].position.start
            );
            pairCount++;
          }
        }
        
        return sum + (pairCount > 0 ? totalDistance / pairCount : 0);
      }, 0) / clusters.length;
      
      silhouetteScore = Math.max(-1, Math.min(1, 1 - avgIntraClusterDistance / 1000));
    }

    return {
      totalClusters,
      averageClusterSize,
      clusteringEfficiency,
      silhouetteScore
    };
  }

  private generateClusterTitle(changes: Change[], centroid: ClusterCentroid): string {
    const category = centroid.category.charAt(0).toUpperCase() + centroid.category.slice(1);
    const source = centroid.source.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
    return `${category} Changes from ${source}`;
  }

  private generateClusterDescription(changes: Change[]): string {
    const categories = [...new Set(changes.map(c => c.category))];
    const sources = [...new Set(changes.map(c => c.source))];
    const avgConfidence = changes.reduce((sum, c) => sum + c.confidence, 0) / changes.length;
    
    return `${changes.length} changes across ${categories.join(', ')} from ${sources.join(', ')} (avg confidence: ${(avgConfidence * 100).toFixed(1)}%)`;
  }

  private async processUpdateQueue(config: ClusterConfig): Promise<void> {
    if (this.updateQueue.length === 0) return;

    const newChanges = [...this.updateQueue];
    this.updateQueue = [];

    for (const change of newChanges) {
      await this.integrateChangeIntoExistingClusters(change, config);
    }
  }

  private async integrateChangeIntoExistingClusters(
    change: Change, 
    config: ClusterConfig
  ): Promise<void> {
    let bestCluster: ClusterData | null = null;
    let bestSimilarity = -1;

    // Find best matching cluster
    for (const cluster of this.activeClusters.values()) {
      const similarity = this.calculateChangeClusterSimilarity(change, cluster, config);
      if (similarity > bestSimilarity && similarity > 0.6) {
        bestSimilarity = similarity;
        bestCluster = cluster;
      }
    }

    if (bestCluster && bestCluster.changes.length < config.maxClusterSize) {
      // Add to existing cluster
      bestCluster.changes.push(change);
      bestCluster.centroid = this.calculateCentroid(bestCluster.changes);
      bestCluster.metrics = this.calculateClusterMetrics(bestCluster.changes);
      bestCluster.updatedAt = Date.now();

      this.notifyListeners({
        type: 'add',
        clusterId: bestCluster.id,
        changeIds: [change.id],
        timestamp: Date.now(),
        reason: `Added to existing cluster (similarity: ${bestSimilarity.toFixed(2)})`
      });
    } else {
      // Create new single-change cluster (will be merged later if appropriate)
      const newCluster = this.createCluster([change], ClusteringStrategy.HYBRID, {
        title: `${change.category.charAt(0).toUpperCase() + change.category.slice(1)} Change`,
        description: `Individual ${change.category} change`
      });

      this.notifyListeners({
        type: 'add',
        clusterId: newCluster.id,
        changeIds: [change.id],
        timestamp: Date.now(),
        reason: 'Created new cluster for change'
      });
    }
  }

  private calculateChangeClusterSimilarity(
    change: Change, 
    cluster: ClusterData, 
    config: ClusterConfig
  ): number {
    // Calculate similarity between change and cluster centroid
    const centroidChange: Change = {
      id: 'centroid',
      type: change.type, // Use same type for comparison
      timestamp: Date.now(),
      source: cluster.centroid.source,
      confidence: cluster.centroid.confidence,
      content: { before: '', after: '' },
      position: {
        start: cluster.centroid.position,
        end: cluster.centroid.position + 1
      },
      category: cluster.centroid.category,
      status: change.status
    };

    return this.calculateSimilarity(change, centroidChange, config);
  }

  private notifyListeners(event: ClusterUpdateEvent): void {
    this.updateListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in cluster update listener:', error);
      }
    });
  }

  public updateConfig(newConfig: ClusteringConfig): void {
    this.config = { ...this.config, ...newConfig };
  }

  public dispose(): void {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }
    this.activeClusters.clear();
    this.updateListeners = [];
    this.updateQueue = [];
  }
}