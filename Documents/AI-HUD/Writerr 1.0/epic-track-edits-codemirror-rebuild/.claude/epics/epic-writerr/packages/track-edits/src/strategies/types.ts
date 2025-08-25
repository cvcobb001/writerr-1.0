import { Change } from '../types';
import { ClusterData, ClusterConfig } from '../clustering/types';

export interface StrategyConfig {
  name: string;
  description: string;
  parameters: Record<string, StrategyParameter>;
  performance: StrategyPerformance;
  applicableScenarios: string[];
}

export interface StrategyParameter {
  name: string;
  type: 'number' | 'string' | 'boolean' | 'enum';
  defaultValue: any;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  description: string;
  required: boolean;
}

export interface StrategyPerformance {
  complexity: 'O(n)' | 'O(n log n)' | 'O(n²)' | 'O(n³)';
  memoryUsage: 'low' | 'medium' | 'high';
  accuracy: number; // 0-1
  speed: number; // 0-1
  scalability: number; // 0-1
}

export interface StrategyResult {
  clusters: ClusterData[];
  metadata: {
    strategyUsed: string;
    processingTime: number;
    confidence: number;
    efficiency: number;
    warnings?: string[];
  };
}

export interface ClusteringStrategy {
  name: string;
  description: string;
  config: StrategyConfig;
  
  cluster(changes: Change[], config: ClusterConfig): Promise<StrategyResult>;
  canHandle(changes: Change[], config: ClusterConfig): boolean;
  estimatePerformance(changeCount: number): StrategyPerformance;
}

export interface StrategySelector {
  selectBestStrategy(
    changes: Change[], 
    config: ClusterConfig,
    availableStrategies: ClusteringStrategy[]
  ): ClusteringStrategy;
}

export interface StrategyOptimizer {
  optimizeParameters(
    changes: Change[],
    strategy: ClusteringStrategy,
    targetMetric: 'accuracy' | 'speed' | 'balance'
  ): Record<string, any>;
}

export interface AdaptiveStrategy extends ClusteringStrategy {
  adapt(
    previousResults: StrategyResult[],
    currentChanges: Change[],
    config: ClusterConfig
  ): Promise<StrategyResult>;
  
  learn(
    results: StrategyResult,
    feedback: StrategyFeedback
  ): void;
}

export interface StrategyFeedback {
  userAcceptanceRate: number;
  clusterQualityScore: number;
  processingTimeAcceptable: boolean;
  suggestedImprovements: string[];
}