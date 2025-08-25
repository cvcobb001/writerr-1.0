import { Change, ChangeCategory, ChangeSource } from '../types';

export interface ClusterConfig {
  strategy: ClusteringStrategy;
  categoryWeight: number;
  confidenceWeight: number;
  proximityWeight: number;
  sourceWeight: number;
  minClusterSize: number;
  maxClusterSize: number;
  confidenceThreshold: number;
  proximityThreshold: number; // Max distance between changes in characters
}

export enum ClusteringStrategy {
  CATEGORY = 'category',
  CONFIDENCE = 'confidence',
  PROXIMITY = 'proximity',
  SOURCE = 'source',
  HYBRID = 'hybrid',
  ML_INSPIRED = 'ml-inspired'
}

export interface ClusterMetrics {
  coherence: number; // How related the changes are (0-1)
  confidence: number; // Average confidence of changes (0-1)
  density: number; // Changes per character span (0-1)
  diversity: number; // Variety of change types (0-1)
}

export interface ClusteringResult {
  clusters: ClusterData[];
  unclusteredChanges: Change[];
  metrics: {
    totalClusters: number;
    averageClusterSize: number;
    clusteringEfficiency: number; // % of changes clustered
    silhouetteScore: number; // Quality metric (-1 to 1)
  };
}

export interface ClusterData {
  id: string;
  changes: Change[];
  centroid: ClusterCentroid;
  metrics: ClusterMetrics;
  strategy: ClusteringStrategy;
  title: string;
  description: string;
  createdAt: number;
  updatedAt: number;
}

export interface ClusterCentroid {
  category: ChangeCategory;
  source: ChangeSource;
  confidence: number;
  position: number; // Average position
  span: {
    start: number;
    end: number;
  };
}

export interface ClusterUpdateEvent {
  type: 'add' | 'remove' | 'merge' | 'split' | 'update';
  clusterId: string;
  changeIds: string[];
  timestamp: number;
  reason: string;
}

export interface ClusteringConfig {
  enableRealTimeUpdates: boolean;
  updateDebounceMs: number;
  maxClusters: number;
  autoMergeThreshold: number;
  autoSplitThreshold: number;
  performanceMode: 'fast' | 'accurate' | 'balanced';
}