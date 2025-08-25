import { Change, ChangeCategory, ChangeSource } from '../types';
import { ClusterData, ClusterConfig, ClusterCentroid } from '../clustering/types';
import { ClusteringStrategy, StrategyConfig, StrategyResult, StrategyPerformance } from './types';

export class MLInspiredStrategy implements ClusteringStrategy {
  public readonly name = 'ML-Inspired Clustering';
  public readonly description = 'Advanced clustering using machine learning concepts like k-means, DBSCAN, and feature vectors';
  
  public readonly config: StrategyConfig = {
    name: this.name,
    description: this.description,
    parameters: {
      algorithm: {
        name: 'Clustering Algorithm',
        type: 'enum',
        defaultValue: 'kmeans',
        options: ['kmeans', 'dbscan', 'hierarchical', 'spectral'],
        description: 'Machine learning algorithm to use for clustering',
        required: true
      },
      kValue: {
        name: 'K Value (K-Means)',
        type: 'number',
        defaultValue: 5,
        min: 2,
        max: 20,
        step: 1,
        description: 'Number of clusters for k-means algorithm',
        required: false
      },
      eps: {
        name: 'Eps (DBSCAN)',
        type: 'number',
        defaultValue: 0.3,
        min: 0.1,
        max: 1.0,
        step: 0.1,
        description: 'Maximum distance between points in DBSCAN',
        required: false
      },
      minSamples: {
        name: 'Min Samples (DBSCAN)',
        type: 'number',
        defaultValue: 3,
        min: 2,
        max: 10,
        step: 1,
        description: 'Minimum samples per cluster in DBSCAN',
        required: false
      },
      featureWeights: {
        name: 'Feature Weights',
        type: 'string',
        defaultValue: 'category:0.3,source:0.2,confidence:0.2,position:0.2,type:0.1',
        description: 'Weights for different features (comma-separated key:value pairs)',
        required: true
      },
      normalizeFeatures: {
        name: 'Normalize Features',
        type: 'boolean',
        defaultValue: true,
        description: 'Apply feature normalization for better clustering',
        required: false
      }
    },
    performance: {
      complexity: 'O(n²)',
      memoryUsage: 'high',
      accuracy: 0.92,
      speed: 0.65,
      scalability: 0.7
    },
    applicableScenarios: [
      'Complex documents with mixed change types',
      'High-accuracy clustering requirements',
      'Large datasets with subtle patterns',
      'Research and analysis workflows'
    ]
  };

  private featureWeights: Map<string, number> = new Map();

  public async cluster(changes: Change[], config: ClusterConfig): Promise<StrategyResult> {
    const startTime = Date.now();
    
    try {
      // Initialize feature weights
      this.parseFeatureWeights();
      
      const clusters = await this.performMLClustering(changes, config);
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
      throw new Error(`ML clustering failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public canHandle(changes: Change[], config: ClusterConfig): boolean {
    if (changes.length < 4) return false; // Need reasonable sample size for ML algorithms
    
    // Check if we have sufficient feature diversity
    const categories = new Set(changes.map(c => c.category));
    const sources = new Set(changes.map(c => c.source));
    const hasFeatureDiversity = categories.size >= 2 || sources.size >= 2;
    
    // ML algorithms work best with varied confidence scores
    const confidences = changes.map(c => c.confidence);
    const confidenceVariety = Math.max(...confidences) - Math.min(...confidences) > 0.2;
    
    return hasFeatureDiversity && confidenceVariety;
  }

  public estimatePerformance(changeCount: number): StrategyPerformance {
    const basePerformance = this.config.performance;
    const algorithm = this.config.parameters.algorithm.defaultValue;
    
    // Adjust performance based on algorithm and data size
    if (changeCount > 200) {
      const speedPenalty = algorithm === 'hierarchical' ? 0.4 : 0.2;
      const memoryPenalty = algorithm === 'spectral' ? 'high' : 'medium';
      
      return {
        ...basePerformance,
        speed: Math.max(0.3, basePerformance.speed - speedPenalty),
        scalability: Math.max(0.5, basePerformance.scalability - 0.2),
        memoryUsage: memoryPenalty as any
      };
    }
    
    if (changeCount > 50) {
      return {
        ...basePerformance,
        speed: Math.max(0.5, basePerformance.speed - 0.1),
        scalability: Math.max(0.65, basePerformance.scalability - 0.05)
      };
    }
    
    return basePerformance;
  }

  private async performMLClustering(
    changes: Change[], 
    config: ClusterConfig
  ): Promise<ClusterData[]> {
    // Convert changes to feature vectors
    const featureVectors = this.extractFeatureVectors(changes);
    
    // Normalize features if enabled
    const normalizedVectors = this.config.parameters.normalizeFeatures.defaultValue
      ? this.normalizeVectors(featureVectors)
      : featureVectors;
    
    // Apply clustering algorithm
    const algorithm = this.config.parameters.algorithm.defaultValue;
    let clusterAssignments: number[];
    
    switch (algorithm) {
      case 'kmeans':
        clusterAssignments = await this.performKMeans(normalizedVectors, changes, config);
        break;
      case 'dbscan':
        clusterAssignments = await this.performDBSCAN(normalizedVectors, changes);
        break;
      case 'hierarchical':
        clusterAssignments = await this.performHierarchical(normalizedVectors, changes, config);
        break;
      case 'spectral':
        clusterAssignments = await this.performSpectral(normalizedVectors, changes, config);
        break;
      default:
        clusterAssignments = await this.performKMeans(normalizedVectors, changes, config);
    }
    
    // Convert cluster assignments to ClusterData objects
    return this.convertAssignmentsToClusters(changes, clusterAssignments, algorithm);
  }

  private extractFeatureVectors(changes: Change[]): number[][] {
    const vectors: number[][] = [];
    
    // Create mappings for categorical features
    const categoryMap = this.createCategoryMapping(changes);
    const sourceMap = this.createSourceMapping(changes);
    const typeMap = this.createTypeMapping(changes);
    
    for (const change of changes) {
      const vector = [
        // Categorical features (one-hot encoded)
        ...this.oneHotEncode(change.category, categoryMap),
        ...this.oneHotEncode(change.source, sourceMap),
        ...this.oneHotEncode(change.type, typeMap),
        
        // Numerical features
        change.confidence,
        change.position.start / 10000, // Normalize position
        change.position.end - change.position.start, // Change length
        change.timestamp / 1000000, // Normalize timestamp
        
        // Derived features
        this.calculateChangeComplexity(change),
        this.calculateContextScore(change)
      ];
      
      vectors.push(vector);
    }
    
    return vectors;
  }

  private createCategoryMapping(changes: Change[]): Map<ChangeCategory, number> {
    const categories = [...new Set(changes.map(c => c.category))];
    const map = new Map<ChangeCategory, number>();
    categories.forEach((category, index) => map.set(category, index));
    return map;
  }

  private createSourceMapping(changes: Change[]): Map<ChangeSource, number> {
    const sources = [...new Set(changes.map(c => c.source))];
    const map = new Map<ChangeSource, number>();
    sources.forEach((source, index) => map.set(source, index));
    return map;
  }

  private createTypeMapping(changes: Change[]): Map<string, number> {
    const types = [...new Set(changes.map(c => c.type))];
    const map = new Map<string, number>();
    types.forEach((type, index) => map.set(type, index));
    return map;
  }

  private oneHotEncode(value: any, mapping: Map<any, number>): number[] {
    const size = mapping.size;
    const encoded = new Array(size).fill(0);
    const index = mapping.get(value);
    if (index !== undefined) {
      encoded[index] = 1;
    }
    return encoded;
  }

  private calculateChangeComplexity(change: Change): number {
    // Simple heuristic for change complexity
    const lengthFactor = Math.min(1, (change.position.end - change.position.start) / 100);
    const confidenceFactor = 1 - change.confidence; // Lower confidence = higher complexity
    return (lengthFactor + confidenceFactor) / 2;
  }

  private calculateContextScore(change: Change): number {
    // Placeholder for contextual analysis
    // In practice, this could analyze surrounding text, change patterns, etc.
    return change.metadata?.context ? 0.8 : 0.2;
  }

  private normalizeVectors(vectors: number[][]): number[][] {
    if (vectors.length === 0) return vectors;
    
    const featureCount = vectors[0].length;
    const means = new Array(featureCount).fill(0);
    const stds = new Array(featureCount).fill(1);
    
    // Calculate means
    for (const vector of vectors) {
      for (let i = 0; i < featureCount; i++) {
        means[i] += vector[i];
      }
    }
    for (let i = 0; i < featureCount; i++) {
      means[i] /= vectors.length;
    }
    
    // Calculate standard deviations
    for (const vector of vectors) {
      for (let i = 0; i < featureCount; i++) {
        stds[i] += Math.pow(vector[i] - means[i], 2);
      }
    }
    for (let i = 0; i < featureCount; i++) {
      stds[i] = Math.sqrt(stds[i] / vectors.length);
      if (stds[i] === 0) stds[i] = 1; // Avoid division by zero
    }
    
    // Normalize vectors
    return vectors.map(vector => 
      vector.map((value, i) => (value - means[i]) / stds[i])
    );
  }

  private async performKMeans(
    vectors: number[][], 
    changes: Change[], 
    config: ClusterConfig
  ): Promise<number[]> {
    const k = Math.min(
      this.config.parameters.kValue.defaultValue,
      Math.floor(changes.length / config.minClusterSize),
      config.maxClusters || 10
    );
    
    if (k <= 1) return new Array(changes.length).fill(0);
    
    // Initialize centroids randomly
    const centroids = this.initializeKMeansCentroids(vectors, k);
    const maxIterations = 20;
    let assignments = new Array(vectors.length).fill(0);
    
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      let converged = true;
      const newAssignments = new Array(vectors.length);
      
      // Assign points to closest centroid
      for (let i = 0; i < vectors.length; i++) {
        let minDistance = Infinity;
        let closestCentroid = 0;
        
        for (let j = 0; j < k; j++) {
          const distance = this.calculateEuclideanDistance(vectors[i], centroids[j]);
          if (distance < minDistance) {
            minDistance = distance;
            closestCentroid = j;
          }
        }
        
        newAssignments[i] = closestCentroid;
        if (assignments[i] !== closestCentroid) {
          converged = false;
        }
      }
      
      assignments = newAssignments;
      
      // Update centroids
      for (let j = 0; j < k; j++) {
        const clusterPoints = vectors.filter((_, i) => assignments[i] === j);
        if (clusterPoints.length > 0) {
          centroids[j] = this.calculateCentroid(clusterPoints);
        }
      }
      
      if (converged) break;
    }
    
    return assignments;
  }

  private async performDBSCAN(
    vectors: number[][], 
    changes: Change[]
  ): Promise<number[]> {
    const eps = this.config.parameters.eps.defaultValue;
    const minSamples = this.config.parameters.minSamples.defaultValue;
    
    const assignments = new Array(vectors.length).fill(-1); // -1 means noise
    let clusterId = 0;
    const visited = new Array(vectors.length).fill(false);
    
    for (let i = 0; i < vectors.length; i++) {
      if (visited[i]) continue;
      
      visited[i] = true;
      const neighbors = this.getNeighbors(i, vectors, eps);
      
      if (neighbors.length < minSamples) {
        assignments[i] = -1; // Mark as noise
      } else {
        this.expandCluster(i, neighbors, clusterId, eps, minSamples, vectors, assignments, visited);
        clusterId++;
      }
    }
    
    return assignments;
  }

  private async performHierarchical(
    vectors: number[][], 
    changes: Change[], 
    config: ClusterConfig
  ): Promise<number[]> {
    // Simplified hierarchical clustering using linkage
    const n = vectors.length;
    let clusters: number[][] = vectors.map((_, i) => [i]);
    
    const targetClusters = Math.min(
      Math.max(2, Math.floor(n / config.minClusterSize)),
      config.maxClusters || 8
    );
    
    // Calculate initial distance matrix
    const distances = this.calculateDistanceMatrix(vectors);
    
    while (clusters.length > targetClusters) {
      // Find closest pair of clusters
      let minDistance = Infinity;
      let mergeIndices = [0, 1];
      
      for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
          const distance = this.calculateClusterDistance(clusters[i], clusters[j], distances);
          if (distance < minDistance) {
            minDistance = distance;
            mergeIndices = [i, j];
          }
        }
      }
      
      // Merge closest clusters
      const [i, j] = mergeIndices;
      clusters[i] = clusters[i].concat(clusters[j]);
      clusters.splice(j, 1);
    }
    
    // Convert to assignments array
    const assignments = new Array(n);
    clusters.forEach((cluster, clusterIndex) => {
      cluster.forEach(pointIndex => {
        assignments[pointIndex] = clusterIndex;
      });
    });
    
    return assignments;
  }

  private async performSpectral(
    vectors: number[][], 
    changes: Change[], 
    config: ClusterConfig
  ): Promise<number[]> {
    // Simplified spectral clustering - in practice would use eigendecomposition
    // For now, fall back to k-means with similarity-based features
    const similarityMatrix = this.calculateSimilarityMatrix(vectors);
    const enhancedVectors = this.enhanceVectorsWithSimilarity(vectors, similarityMatrix);
    
    return this.performKMeans(enhancedVectors, changes, config);
  }

  private initializeKMeansCentroids(vectors: number[][], k: number): number[][] {
    const centroids: number[][] = [];
    const featureCount = vectors[0].length;
    
    // Use k-means++ initialization
    centroids.push([...vectors[Math.floor(Math.random() * vectors.length)]]);
    
    for (let i = 1; i < k; i++) {
      const distances = vectors.map(vector => {
        const minDistance = Math.min(...centroids.map(centroid => 
          this.calculateEuclideanDistance(vector, centroid)
        ));
        return minDistance * minDistance;
      });
      
      const totalDistance = distances.reduce((sum, d) => sum + d, 0);
      let random = Math.random() * totalDistance;
      
      for (let j = 0; j < vectors.length; j++) {
        random -= distances[j];
        if (random <= 0) {
          centroids.push([...vectors[j]]);
          break;
        }
      }
    }
    
    return centroids;
  }

  private calculateEuclideanDistance(a: number[], b: number[]): number {
    return Math.sqrt(
      a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0)
    );
  }

  private calculateCentroid(points: number[][]): number[] {
    const featureCount = points[0].length;
    const centroid = new Array(featureCount).fill(0);
    
    for (const point of points) {
      for (let i = 0; i < featureCount; i++) {
        centroid[i] += point[i];
      }
    }
    
    return centroid.map(sum => sum / points.length);
  }

  private getNeighbors(pointIndex: number, vectors: number[][], eps: number): number[] {
    const neighbors: number[] = [];
    const point = vectors[pointIndex];
    
    for (let i = 0; i < vectors.length; i++) {
      if (i !== pointIndex) {
        const distance = this.calculateEuclideanDistance(point, vectors[i]);
        if (distance <= eps) {
          neighbors.push(i);
        }
      }
    }
    
    return neighbors;
  }

  private expandCluster(
    pointIndex: number,
    neighbors: number[],
    clusterId: number,
    eps: number,
    minSamples: number,
    vectors: number[][],
    assignments: number[],
    visited: boolean[]
  ): void {
    assignments[pointIndex] = clusterId;
    
    for (let i = 0; i < neighbors.length; i++) {
      const neighborIndex = neighbors[i];
      
      if (!visited[neighborIndex]) {
        visited[neighborIndex] = true;
        const neighborNeighbors = this.getNeighbors(neighborIndex, vectors, eps);
        
        if (neighborNeighbors.length >= minSamples) {
          neighbors.push(...neighborNeighbors);
        }
      }
      
      if (assignments[neighborIndex] === -1) {
        assignments[neighborIndex] = clusterId;
      }
    }
  }

  private calculateDistanceMatrix(vectors: number[][]): number[][] {
    const n = vectors.length;
    const matrix = Array(n).fill(null).map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const distance = this.calculateEuclideanDistance(vectors[i], vectors[j]);
        matrix[i][j] = matrix[j][i] = distance;
      }
    }
    
    return matrix;
  }

  private calculateClusterDistance(
    cluster1: number[],
    cluster2: number[],
    distances: number[][]
  ): number {
    // Using average linkage
    let totalDistance = 0;
    let pairCount = 0;
    
    for (const i of cluster1) {
      for (const j of cluster2) {
        totalDistance += distances[i][j];
        pairCount++;
      }
    }
    
    return totalDistance / pairCount;
  }

  private calculateSimilarityMatrix(vectors: number[][]): number[][] {
    const n = vectors.length;
    const matrix = Array(n).fill(null).map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const distance = this.calculateEuclideanDistance(vectors[i], vectors[j]);
        const similarity = Math.exp(-distance); // Gaussian kernel
        matrix[i][j] = matrix[j][i] = similarity;
      }
      matrix[i][i] = 1; // Self-similarity
    }
    
    return matrix;
  }

  private enhanceVectorsWithSimilarity(
    vectors: number[][], 
    similarityMatrix: number[][]
  ): number[][] {
    return vectors.map((vector, i) => [
      ...vector,
      ...similarityMatrix[i].slice(0, Math.min(5, vectors.length)) // Add top similarities as features
    ]);
  }

  private convertAssignmentsToClusters(
    changes: Change[],
    assignments: number[],
    algorithm: string
  ): ClusterData[] {
    const clusterMap = new Map<number, Change[]>();
    
    // Group changes by cluster assignment
    assignments.forEach((clusterId, i) => {
      if (clusterId >= 0) { // Ignore noise points (-1)
        const existing = clusterMap.get(clusterId) || [];
        existing.push(changes[i]);
        clusterMap.set(clusterId, existing);
      }
    });
    
    // Convert to ClusterData objects
    return Array.from(clusterMap.entries()).map(([clusterId, clusterChanges]) => 
      this.createMLCluster(clusterChanges, algorithm, clusterId)
    );
  }

  private createMLCluster(
    changes: Change[], 
    algorithm: string, 
    clusterId: number
  ): ClusterData {
    const id = `ml-cluster-${algorithm}-${clusterId}-${Date.now()}`;
    const now = Date.now();
    
    // Calculate centroid
    const centroid = this.calculateClusterCentroid(changes);
    
    // Calculate metrics
    const metrics = {
      coherence: this.calculateMLCoherence(changes),
      confidence: changes.reduce((sum, c) => sum + c.confidence, 0) / changes.length,
      density: this.calculateMLDensity(changes),
      diversity: this.calculateMLDiversity(changes)
    };
    
    // Generate title and description
    const primaryCategory = this.findPrimaryCategory(changes);
    const primarySource = this.findPrimarySource(changes);
    
    const title = `${algorithm.toUpperCase()} Cluster ${clusterId + 1}`;
    const description = `${changes.length} changes (${primaryCategory}, ${primarySource}) - ML confidence: ${(metrics.coherence * 100).toFixed(1)}%`;
    
    return {
      id,
      changes,
      centroid,
      metrics,
      strategy: 'ml-inspired' as any,
      title,
      description,
      createdAt: now,
      updatedAt: now
    };
  }

  private calculateClusterCentroid(changes: Change[]): ClusterCentroid {
    const avgConfidence = changes.reduce((sum, c) => sum + c.confidence, 0) / changes.length;
    const avgPosition = changes.reduce((sum, c) => sum + c.position.start, 0) / changes.length;
    
    const minStart = Math.min(...changes.map(c => c.position.start));
    const maxEnd = Math.max(...changes.map(c => c.position.end));
    
    return {
      category: this.findPrimaryCategory(changes),
      source: this.findPrimarySource(changes),
      confidence: avgConfidence,
      position: avgPosition,
      span: {
        start: minStart,
        end: maxEnd
      }
    };
  }

  private findPrimaryCategory(changes: Change[]): ChangeCategory {
    const counts = new Map<ChangeCategory, number>();
    changes.forEach(c => counts.set(c.category, (counts.get(c.category) || 0) + 1));
    
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])[0][0];
  }

  private findPrimarySource(changes: Change[]): ChangeSource {
    const counts = new Map<ChangeSource, number>();
    changes.forEach(c => counts.set(c.source, (counts.get(c.source) || 0) + 1));
    
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])[0][0];
  }

  private calculateMLCoherence(changes: Change[]): number {
    if (changes.length <= 1) return 1.0;
    
    // ML coherence based on feature similarity
    const vectors = this.extractFeatureVectors(changes);
    const normalizedVectors = this.normalizeVectors(vectors);
    
    // Calculate average pairwise similarity
    let totalSimilarity = 0;
    let pairCount = 0;
    
    for (let i = 0; i < normalizedVectors.length; i++) {
      for (let j = i + 1; j < normalizedVectors.length; j++) {
        const distance = this.calculateEuclideanDistance(normalizedVectors[i], normalizedVectors[j]);
        const similarity = Math.exp(-distance); // Convert distance to similarity
        totalSimilarity += similarity;
        pairCount++;
      }
    }
    
    return pairCount > 0 ? totalSimilarity / pairCount : 1.0;
  }

  private calculateMLDensity(changes: Change[]): number {
    // Density in feature space
    if (changes.length <= 1) return 1.0;
    
    const vectors = this.extractFeatureVectors(changes);
    const centroid = this.calculateCentroid(vectors);
    
    const avgDistance = vectors.reduce((sum, vector) => 
      sum + this.calculateEuclideanDistance(vector, centroid), 0
    ) / vectors.length;
    
    return Math.exp(-avgDistance); // Convert to density measure
  }

  private calculateMLDiversity(changes: Change[]): number {
    const categories = new Set(changes.map(c => c.category));
    const sources = new Set(changes.map(c => c.source));
    const types = new Set(changes.map(c => c.type));
    
    const totalFeatures = Object.keys(ChangeCategory).length + 
                         Object.keys(ChangeSource).length + 
                         3; // Approximate feature count
    
    return (categories.size + sources.size + types.size) / totalFeatures;
  }

  private parseFeatureWeights(): void {
    const weightsStr = this.config.parameters.featureWeights.defaultValue as string;
    const pairs = weightsStr.split(',');
    
    this.featureWeights.clear();
    pairs.forEach(pair => {
      const [key, value] = pair.split(':');
      if (key && value) {
        this.featureWeights.set(key.trim(), parseFloat(value.trim()));
      }
    });
  }

  private calculateConfidence(clusters: ClusterData[], originalChanges: Change[]): number {
    if (clusters.length === 0) return 0;
    
    const clusteredChanges = clusters.reduce((sum, c) => sum + c.changes.length, 0);
    const clusteringRatio = clusteredChanges / originalChanges.length;
    
    const avgCoherence = clusters.reduce((sum, c) => sum + c.metrics.coherence, 0) / clusters.length;
    
    return (clusteringRatio + avgCoherence) / 2;
  }

  private calculateEfficiency(clusters: ClusterData[], originalChanges: Change[]): number {
    if (originalChanges.length === 0) return 1.0;
    
    const clusteredChanges = clusters.reduce((sum, c) => sum + c.changes.length, 0);
    const clusteringEfficiency = clusteredChanges / originalChanges.length;
    
    const avgDensity = clusters.length > 0 
      ? clusters.reduce((sum, c) => sum + c.metrics.density, 0) / clusters.length 
      : 0;
      
    return (clusteringEfficiency + avgDensity) / 2;
  }

  private generateWarnings(clusters: ClusterData[], originalChanges: Change[]): string[] {
    const warnings: string[] = [];
    
    const clusteredChanges = clusters.reduce((sum, c) => sum + c.changes.length, 0);
    const unclusteredCount = originalChanges.length - clusteredChanges;
    
    if (unclusteredCount > originalChanges.length * 0.2) {
      warnings.push(`${unclusteredCount} changes marked as noise by ML algorithm`);
    }
    
    const lowCoherenceClusters = clusters.filter(c => c.metrics.coherence < 0.5);
    if (lowCoherenceClusters.length > clusters.length * 0.3) {
      warnings.push('Several clusters have low coherence - consider adjusting algorithm parameters');
    }
    
    if (clusters.length < 2) {
      warnings.push('ML algorithm produced very few clusters - data may not be suitable for clustering');
    }
    
    return warnings;
  }
}