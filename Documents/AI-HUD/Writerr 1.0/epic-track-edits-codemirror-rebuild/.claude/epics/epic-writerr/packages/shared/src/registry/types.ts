/**
 * Plugin Registry Types
 * Defines the core interfaces for plugin registration, capabilities, and lifecycle management
 */

export interface PluginCapability {
  id: string;
  name: string;
  version: string;
  description?: string;
  category: PluginCapabilityCategory;
  dependencies?: string[];
  apis?: ApiExposure[];
  configuration?: PluginConfiguration;
}

export enum PluginCapabilityCategory {
  TRACKING = 'tracking',
  AI_INTEGRATION = 'ai-integration',
  INSIGHTS = 'insights',
  UTILITIES = 'utilities',
  CORE = 'core'
}

export interface ApiExposure {
  name: string;
  methods: ApiMethod[];
  events?: ApiEvent[];
}

export interface ApiMethod {
  name: string;
  parameters: ApiParameter[];
  returnType: string;
  description?: string;
}

export interface ApiEvent {
  name: string;
  payload?: Record<string, any>;
  description?: string;
}

export interface ApiParameter {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface PluginConfiguration {
  schema: Record<string, any>;
  defaults: Record<string, any>;
  required?: string[];
}

export enum PluginStatus {
  UNLOADED = 'unloaded',
  LOADED = 'loaded',
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  ERROR = 'error'
}

export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  author?: string;
  description?: string;
  minObsidianVersion?: string;
  maxObsidianVersion?: string;
  dependencies: PluginDependency[];
  status: PluginStatus;
  loadedAt?: Date;
  lastError?: Error;
}

export interface PluginDependency {
  pluginId: string;
  version: string;
  optional: boolean;
}

export interface VersionCompatibility {
  isCompatible: boolean;
  reason?: string;
  suggestedVersion?: string;
}

export interface PluginRegistryConfig {
  autoLoad?: boolean;
  enableVersionChecking?: boolean;
  allowOptionalDependencies?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}