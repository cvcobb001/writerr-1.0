/**
 * Plugin Registry Module
 * Main exports for the plugin registry system
 */

export { PluginRegistry } from './PluginRegistry';
export { PluginManager } from './PluginManager';
export { VersionChecker } from './VersionChecker';
export { PluginUtils } from './PluginUtils';
export { PluginFactory } from './PluginFactory';

export {
  PluginCapability,
  PluginCapabilityCategory,
  ApiExposure,
  ApiMethod,
  ApiEvent,
  ApiParameter,
  PluginConfiguration,
  PluginStatus,
  PluginMetadata,
  PluginDependency,
  VersionCompatibility,
  PluginRegistryConfig
} from './types';

export type { PluginManagerConfig, PluginHealthReport } from './PluginManager';

export type {
  PluginDefinition,
  CapabilityDefinition,
  ApiDefinition,
  MethodDefinition,
  ParameterDefinition,
  EventDefinition,
  DependencyDefinition
} from './PluginFactory';