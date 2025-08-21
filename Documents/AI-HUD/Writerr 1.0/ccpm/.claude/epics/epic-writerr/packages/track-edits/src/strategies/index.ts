export * from './types';
export * from './CategoryStrategy';
export * from './ProximityStrategy';
export * from './MLInspiredStrategy';

// Re-export related types
export { Change, ChangeCategory, ChangeSource } from '../types';
export { ClusterData, ClusterConfig } from '../clustering/types';

// Create a registry of available strategies
import { CategoryStrategy } from './CategoryStrategy';
import { ProximityStrategy } from './ProximityStrategy';
import { MLInspiredStrategy } from './MLInspiredStrategy';
import { ClusteringStrategy } from './types';

export const AVAILABLE_STRATEGIES: Record<string, () => ClusteringStrategy> = {
  'category': () => new CategoryStrategy(),
  'proximity': () => new ProximityStrategy(),
  'ml-inspired': () => new MLInspiredStrategy()
};

export function createStrategy(name: string): ClusteringStrategy {
  const factory = AVAILABLE_STRATEGIES[name];
  if (!factory) {
    throw new Error(`Unknown clustering strategy: ${name}`);
  }
  return factory();
}