import { Change, ChangeStatus } from './types';
import { 
  ClusteringEngine,
  ClusterConfig,
  ClusteringConfig,
  ClusteringStrategy as ClusteringStrategyEnum,
  ClusterUpdateEvent,
  ClusterData
} from './clustering';
import { 
  BatchProcessor,
  BatchConfig,
  BatchOperation,
  BatchOperationType,
  BatchThresholds,
  BulkOperationOptions
} from './batch';
import { 
  ClusteringStrategy,
  createStrategy,
  AVAILABLE_STRATEGIES
} from './strategies';

/**
 * Main integration class that coordinates clustering and batch processing
 * This is the primary interface for the clustering and batch processing system
 */
export class ClusteringManager {
  private clusteringEngine: ClusteringEngine;
  private batchProcessor: BatchProcessor;
  private currentStrategy: ClusteringStrategy;
  private config: {
    clustering: ClusteringConfig;
    cluster: ClusterConfig;
    batch: BatchConfig;
  };

  constructor(
    clusteringConfig: ClusteringConfig,
    clusterConfig: ClusterConfig,
    batchConfig: BatchConfig
  ) {
    this.config = {
      clustering: clusteringConfig,
      cluster: clusterConfig,
      batch: batchConfig
    };

    this.clusteringEngine = new ClusteringEngine(clusteringConfig);
    this.batchProcessor = new BatchProcessor(batchConfig);
    this.currentStrategy = this.createDefaultStrategy();
    
    this.setupEventHandlers();
  }

  // ===== CLUSTERING METHODS =====

  /**
   * Cluster a set of changes using the current strategy
   */
  public async clusterChanges(changes: Change[]): Promise<{
    clusters: ClusterData[];
    unclusteredChanges: Change[];
    metadata: {
      strategy: string;
      processingTime: number;
      efficiency: number;
      totalChanges: number;
    };
  }> {
    const startTime = Date.now();
    
    // Use the clustering engine with current strategy
    const result = await this.clusteringEngine.clusterChanges(changes, this.config.cluster);
    
    // Also get strategy-specific results for comparison
    const strategyResult = await this.currentStrategy.cluster(changes, this.config.cluster);
    
    const processingTime = Date.now() - startTime;
    
    return {
      clusters: result.clusters,
      unclusteredChanges: result.unclusteredChanges,
      metadata: {
        strategy: this.currentStrategy.name,
        processingTime,
        efficiency: result.metrics.clusteringEfficiency,
        totalChanges: changes.length
      }
    };
  }

  /**
   * Add a single change and update clusters dynamically
   */
  public async addChange(change: Change): Promise<void> {
    await this.clusteringEngine.addChange(change, this.config.cluster);
  }

  /**
   * Remove a change from clusters
   */
  public async removeChange(changeId: string): Promise<void> {
    await this.clusteringEngine.removeChange(changeId);
  }

  /**
   * Get current active clusters
   */
  public getActiveClusters(): ClusterData[] {
    return this.clusteringEngine.getActiveClusters();
  }

  /**
   * Switch clustering strategy
   */
  public async switchStrategy(strategyName: string, recalculate = true): Promise<void> {
    this.currentStrategy = createStrategy(strategyName);
    
    if (recalculate) {
      const activeClusters = this.getActiveClusters();
      const allChanges = activeClusters.flatMap(cluster => cluster.changes);
      
      if (allChanges.length > 0) {
        await this.clusterChanges(allChanges);
      }
    }
  }

  /**
   * Get information about available clustering strategies
   */
  public getAvailableStrategies(): Array<{
    name: string;
    description: string;
    canHandle: boolean;
    performance: any;
  }> {
    const activeClusters = this.getActiveClusters();
    const allChanges = activeClusters.flatMap(cluster => cluster.changes);
    
    return Object.keys(AVAILABLE_STRATEGIES).map(strategyName => {
      const strategy = createStrategy(strategyName);
      return {
        name: strategy.name,
        description: strategy.description,
        canHandle: strategy.canHandle(allChanges, this.config.cluster),
        performance: strategy.estimatePerformance(allChanges.length)
      };
    });
  }

  // ===== BATCH PROCESSING METHODS =====

  /**
   * Process a batch operation on changes
   */
  public async processBatch(
    changes: Change[],
    operation: BatchOperationType,
    options: BulkOperationOptions = {}
  ): Promise<{
    success: boolean;
    processedCount: number;
    failedCount: number;
    duration: number;
    errors: Array<{ changeId: string; error: string }>;
  }> {
    const result = await this.batchProcessor.processBulkOperation(
      changes,
      operation,
      options
    );

    return {
      success: result.success,
      processedCount: result.processedCount,
      failedCount: result.failedCount,
      duration: result.duration,
      errors: result.errors
    };
  }

  /**
   * Process a batch operation on entire clusters
   */
  public async processClusterBatch(
    clusters: ClusterData[],
    operation: BatchOperationType,
    options: BulkOperationOptions = {}
  ): Promise<{
    success: boolean;
    processedClusters: number;
    processedChanges: number;
    duration: number;
    errors: Array<{ changeId: string; error: string }>;
  }> {
    const result = await this.batchProcessor.processClusterBatch(
      clusters,
      operation,
      options
    );

    return {
      success: result.success,
      processedClusters: clusters.length,
      processedChanges: result.processedCount,
      duration: result.duration,
      errors: result.errors
    };
  }

  /**
   * Check if batch thresholds are met
   */
  public checkBatchThresholds(
    changes: Change[],
    thresholds: BatchThresholds
  ): { shouldTrigger: boolean; reason: string } {
    return this.batchProcessor.checkThresholds(changes, thresholds);
  }

  /**
   * Get batch processing metrics
   */
  public getBatchMetrics() {
    return this.batchProcessor.getMetrics();
  }

  // ===== ADVANCED OPERATIONS =====

  /**
   * Intelligent cluster and batch operation
   * Automatically clusters changes and batches them based on configuration
   */
  public async intelligentProcess(
    changes: Change[],
    options: {
      clusterFirst?: boolean;
      batchThresholds?: BatchThresholds;
      operation?: BatchOperationType;
      strategyHint?: string;
    } = {}
  ): Promise<{
    clustering: {
      clusters: ClusterData[];
      unclusteredChanges: Change[];
      strategy: string;
    };
    batching?: {
      batchesCreated: number;
      changesProcessed: number;
      success: boolean;
    };
  }> {
    const {
      clusterFirst = true,
      batchThresholds,
      operation = BatchOperationType.ACCEPT_ALL,
      strategyHint
    } = options;

    // Step 1: Clustering
    let clusteringResult;
    
    if (strategyHint && strategyHint in AVAILABLE_STRATEGIES) {
      await this.switchStrategy(strategyHint, false);
    } else {
      // Auto-select best strategy
      await this.selectBestStrategy(changes);
    }
    
    clusteringResult = await this.clusterChanges(changes);

    const result: any = {
      clustering: {
        clusters: clusteringResult.clusters,
        unclusteredChanges: clusteringResult.unclusteredChanges,
        strategy: this.currentStrategy.name
      }
    };

    // Step 2: Batch processing (if requested)
    if (batchThresholds || !clusterFirst) {
      if (batchThresholds) {
        const thresholdCheck = this.checkBatchThresholds(changes, batchThresholds);
        if (thresholdCheck.shouldTrigger) {
          const batchResult = await this.processClusterBatch(
            clusteringResult.clusters,
            operation
          );
          
          result.batching = {
            batchesCreated: 1,
            changesProcessed: batchResult.processedChanges,
            success: batchResult.success
          };
        }
      } else {
        // Process all clusters
        const batchResult = await this.processClusterBatch(
          clusteringResult.clusters,
          operation
        );
        
        result.batching = {
          batchesCreated: clusteringResult.clusters.length,
          changesProcessed: batchResult.processedChanges,
          success: batchResult.success
        };
      }
    }

    return result;
  }

  /**
   * Auto-select the best clustering strategy based on data characteristics
   */
  private async selectBestStrategy(changes: Change[]): Promise<void> {
    const strategies = this.getAvailableStrategies();
    
    // Score strategies based on data characteristics and performance
    let bestStrategy = strategies[0];
    let bestScore = 0;
    
    for (const strategy of strategies) {
      if (!strategy.canHandle) continue;
      
      let score = 0;
      
      // Factor in accuracy and speed
      score += strategy.performance.accuracy * 0.4;
      score += strategy.performance.speed * 0.3;
      score += strategy.performance.scalability * 0.3;
      
      // Penalize high complexity for smaller datasets
      if (changes.length < 20 && strategy.performance.complexity === 'O(n²)') {
        score -= 0.1;
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestStrategy = strategy;
      }
    }
    
    if (bestStrategy.name !== this.currentStrategy.name) {
      await this.switchStrategy(bestStrategy.name, false);
    }
  }

  // ===== EVENT HANDLING =====

  /**
   * Subscribe to cluster update events
   */
  public onClusterUpdate(callback: (event: ClusterUpdateEvent) => void): void {
    this.clusteringEngine.onClusterUpdate(callback);
  }

  /**
   * Set up internal event handlers
   */
  private setupEventHandlers(): void {
    this.clusteringEngine.onClusterUpdate((event) => {
      // Handle automatic batch processing based on cluster updates
      if (this.config.batch.autoSubmit) {
        this.handleAutoSubmit(event);
      }
    });
  }

  private async handleAutoSubmit(event: ClusterUpdateEvent): Promise<void> {
    if (event.type === 'add' || event.type === 'merge') {
      const clusters = this.getActiveClusters();
      const cluster = clusters.find(c => c.id === event.clusterId);
      
      if (cluster && cluster.changes.length >= this.config.batch.maxBatchSize) {
        try {
          await this.processClusterBatch(
            [cluster],
            BatchOperationType.ACCEPT_CLUSTER,
            { stopOnError: false }
          );
        } catch (error) {
          console.error('Auto-submit failed:', error);
        }
      }
    }
  }

  // ===== CONFIGURATION =====

  /**
   * Update clustering configuration
   */
  public updateClusteringConfig(newConfig: Partial<ClusteringConfig>): void {
    this.config.clustering = { ...this.config.clustering, ...newConfig };
    this.clusteringEngine.updateConfig(this.config.clustering);
  }

  /**
   * Update cluster configuration
   */
  public updateClusterConfig(newConfig: Partial<ClusterConfig>): void {
    this.config.cluster = { ...this.config.cluster, ...newConfig };
  }

  /**
   * Update batch configuration
   */
  public updateBatchConfig(newConfig: Partial<BatchConfig>): void {
    this.config.batch = { ...this.config.batch, ...newConfig };
    this.batchProcessor.updateConfig(newConfig);
  }

  /**
   * Get current configuration
   */
  public getConfig() {
    return {
      clustering: { ...this.config.clustering },
      cluster: { ...this.config.cluster },
      batch: { ...this.config.batch }
    };
  }

  // ===== UTILITY METHODS =====

  private createDefaultStrategy(): ClusteringStrategy {
    // Default to category strategy as it's fast and generally applicable
    return createStrategy('category');
  }

  /**
   * Get comprehensive system status
   */
  public getStatus() {
    const clusters = this.getActiveClusters();
    const totalChanges = clusters.reduce((sum, c) => sum + c.changes.length, 0);
    
    return {
      clustering: {
        currentStrategy: this.currentStrategy.name,
        activeClusters: clusters.length,
        totalChanges,
        averageClusterSize: clusters.length > 0 ? totalChanges / clusters.length : 0
      },
      batching: this.getBatchMetrics(),
      system: {
        memoryUsage: this.currentStrategy.estimatePerformance(totalChanges).memoryUsage,
        performance: this.currentStrategy.estimatePerformance(totalChanges)
      }
    };
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    this.clusteringEngine.dispose();
    this.batchProcessor.dispose();
  }
}