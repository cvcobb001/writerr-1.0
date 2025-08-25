// Main plugin export
export { default } from './main';

// Component exports
export * from './components';

// UI utilities
export * from './ui';

// Animation utilities  
export * from './animations';

// Types
export * from './types';

// Mock data for development
export * from './mock-data';

// Core plugin class
export { default as TrackEditsPlugin } from './main';

// Clustering and Batch Processing System
export * from './clustering';
export * from './batch';
export * from './strategies';
export { ClusteringManager } from './ClusteringManager';

// State Management & Persistence System
export * from './state';
export * from './persistence';
export * from './session';
export { TrackEditsCore } from './TrackEditsCore';