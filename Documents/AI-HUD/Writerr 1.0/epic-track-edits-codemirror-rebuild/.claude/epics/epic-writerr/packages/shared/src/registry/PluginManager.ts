/**
 * Plugin Manager
 * Main orchestrator for plugin lifecycle management, registration, and service discovery
 */

import { EventEmitter } from 'events';
import { PluginRegistry } from './PluginRegistry';
import { ServiceDiscovery, ServiceQuery } from '../discovery/ServiceDiscovery';
import { DependencyResolver, DependencyResolution } from '../discovery/DependencyResolver';
import {
  PluginCapability,
  PluginMetadata,
  PluginStatus,
  PluginRegistryConfig,
  ApiExposure
} from './types';

export interface PluginManagerConfig extends PluginRegistryConfig {
  enableServiceDiscovery?: boolean;
  enableDependencyResolution?: boolean;
  autoResolveConflicts?: boolean;
}

export class PluginManager extends EventEmitter {
  private registry: PluginRegistry;
  private serviceDiscovery: ServiceDiscovery;
  private dependencyResolver: DependencyResolver;
  private config: PluginManagerConfig;
  private loadingQueue: Set<string> = new Set();

  constructor(config: PluginManagerConfig = {}) {
    super();
    this.config = {
      enableServiceDiscovery: true,
      enableDependencyResolution: true,
      autoResolveConflicts: false,
      ...config
    };

    this.registry = new PluginRegistry(config);
    this.serviceDiscovery = new ServiceDiscovery();
    this.dependencyResolver = new DependencyResolver();

    this.setupEventForwarding();
  }

  /**
   * Register and load a plugin with its capabilities
   */
  async loadPlugin(
    metadata: PluginMetadata, 
    capabilities: PluginCapability[], 
    instance: any
  ): Promise<void> {
    if (this.loadingQueue.has(metadata.id)) {
      throw new Error(`Plugin ${metadata.id} is already being loaded`);
    }

    this.loadingQueue.add(metadata.id);

    try {
      // Add to dependency resolver
      if (this.config.enableDependencyResolution) {
        this.dependencyResolver.addPlugin(metadata);
        
        // Check dependencies before loading
        const depCheck = this.dependencyResolver.checkDependenciesSatisfied(metadata.id);
        if (!depCheck.satisfied) {
          throw new Error(`Dependencies not satisfied: ${depCheck.issues.join(', ')}`);
        }
      }

      // Register with plugin registry
      await this.registry.registerPlugin(metadata, capabilities);

      // Register services for discovery
      if (this.config.enableServiceDiscovery) {
        this.registerPluginServices(metadata.id, capabilities, instance);
      }

      this.emit('plugin:loaded', metadata.id);

    } catch (error) {
      this.emit('plugin:load:error', metadata.id, error);
      throw error;
    } finally {
      this.loadingQueue.delete(metadata.id);
    }
  }

  /**
   * Unload a plugin and all its services
   */
  async unloadPlugin(pluginId: string): Promise<void> {
    try {
      // Check if other plugins depend on this one
      if (this.config.enableDependencyResolution) {
        const dependents = this.dependencyResolver.getDependents(pluginId);
        const enabledDependents = dependents.filter(depId => {
          const plugin = this.registry.getPlugin(depId);
          return plugin?.status === PluginStatus.ENABLED;
        });

        if (enabledDependents.length > 0) {
          throw new Error(`Cannot unload ${pluginId}. These plugins depend on it: ${enabledDependents.join(', ')}`);
        }
      }

      // Unregister services
      if (this.config.enableServiceDiscovery) {
        this.serviceDiscovery.unregisterPluginServices(pluginId);
      }

      // Unload from registry
      await this.registry.unloadPlugin(pluginId);

      // Remove from dependency resolver
      if (this.config.enableDependencyResolution) {
        this.dependencyResolver.removePlugin(pluginId);
      }

      this.emit('plugin:unloaded', pluginId);

    } catch (error) {
      this.emit('plugin:unload:error', pluginId, error);
      throw error;
    }
  }

  /**
   * Enable a plugin
   */
  async enablePlugin(pluginId: string): Promise<void> {
    await this.registry.enablePlugin(pluginId);
  }

  /**
   * Disable a plugin
   */
  async disablePlugin(pluginId: string): Promise<void> {
    await this.registry.disablePlugin(pluginId);
  }

  /**
   * Load multiple plugins in dependency order
   */
  async loadPlugins(pluginDataList: Array<{metadata: PluginMetadata, capabilities: PluginCapability[], instance: any}>): Promise<DependencyResolution> {
    // Add all plugins to dependency resolver first
    for (const {metadata} of pluginDataList) {
      this.dependencyResolver.addPlugin(metadata);
    }

    // Resolve dependencies
    const resolution = this.dependencyResolver.resolveDependencies(
      pluginDataList.map(p => p.metadata.id)
    );

    // If there are blocking issues, return resolution without loading
    if (resolution.missing.length > 0 || resolution.circular.length > 0) {
      return resolution;
    }

    // Load plugins in dependency order
    const pluginMap = new Map(pluginDataList.map(p => [p.metadata.id, p]));

    for (const pluginId of resolution.loadOrder) {
      const pluginData = pluginMap.get(pluginId);
      if (pluginData) {
        await this.loadPlugin(
          pluginData.metadata, 
          pluginData.capabilities, 
          pluginData.instance
        );
      }
    }

    return resolution;
  }

  /**
   * Discover services based on query
   */
  discoverServices(query: ServiceQuery) {
    if (!this.config.enableServiceDiscovery) {
      throw new Error('Service discovery is disabled');
    }
    return this.serviceDiscovery.discoverServices(query);
  }

  /**
   * Call a service method
   */
  async callService(
    pluginId: string, 
    capabilityId: string, 
    apiName: string, 
    methodName: string, 
    ...args: any[]
  ): Promise<any> {
    if (!this.config.enableServiceDiscovery) {
      throw new Error('Service discovery is disabled');
    }
    return this.serviceDiscovery.callService(pluginId, capabilityId, apiName, methodName, ...args);
  }

  /**
   * Subscribe to a service event
   */
  subscribeToServiceEvent(
    pluginId: string, 
    capabilityId: string, 
    apiName: string, 
    eventName: string, 
    handler: Function
  ): () => void {
    if (!this.config.enableServiceDiscovery) {
      throw new Error('Service discovery is disabled');
    }
    return this.serviceDiscovery.subscribeToEvent(pluginId, capabilityId, apiName, eventName, handler);
  }

  /**
   * Get all registered plugins
   */
  getPlugins(): PluginMetadata[] {
    return this.registry.getPlugins();
  }

  /**
   * Get plugin by ID
   */
  getPlugin(pluginId: string): PluginMetadata | undefined {
    return this.registry.getPlugin(pluginId);
  }

  /**
   * Get all capabilities
   */
  getCapabilities(): PluginCapability[] {
    return this.registry.getCapabilities();
  }

  /**
   * Get plugin health status
   */
  getPluginHealth(): PluginHealthReport {
    const plugins = this.registry.getPlugins();
    const totalPlugins = plugins.length;
    const enabledPlugins = plugins.filter(p => p.status === PluginStatus.ENABLED).length;
    const errorPlugins = plugins.filter(p => p.status === PluginStatus.ERROR);

    return {
      totalPlugins,
      enabledPlugins,
      disabledPlugins: plugins.filter(p => p.status === PluginStatus.DISABLED).length,
      errorPlugins: errorPlugins.length,
      errors: errorPlugins.map(p => ({
        pluginId: p.id,
        error: p.lastError?.message || 'Unknown error'
      }))
    };
  }

  /**
   * Get dependency resolution for current state
   */
  getDependencyResolution(): DependencyResolution {
    if (!this.config.enableDependencyResolution) {
      throw new Error('Dependency resolution is disabled');
    }
    return this.dependencyResolver.resolveDependencies();
  }

  /**
   * Register plugin services with service discovery
   */
  private registerPluginServices(
    pluginId: string, 
    capabilities: PluginCapability[], 
    instance: any
  ): void {
    for (const capability of capabilities) {
      if (capability.apis) {
        for (const api of capability.apis) {
          this.serviceDiscovery.registerService(pluginId, capability, api, instance);
        }
      }
    }
  }

  /**
   * Forward events from sub-components
   */
  private setupEventForwarding(): void {
    // Forward registry events
    this.registry.on('plugin:registered', (...args) => this.emit('plugin:registered', ...args));
    this.registry.on('plugin:enabled', (...args) => this.emit('plugin:enabled', ...args));
    this.registry.on('plugin:disabled', (...args) => this.emit('plugin:disabled', ...args));
    this.registry.on('plugin:unloaded', (...args) => this.emit('plugin:unloaded', ...args));
    this.registry.on('plugin:error', (...args) => this.emit('plugin:error', ...args));

    // Forward service discovery events
    this.serviceDiscovery.on('service:registered', (...args) => this.emit('service:registered', ...args));
    this.serviceDiscovery.on('service:unregistered', (...args) => this.emit('service:unregistered', ...args));
    this.serviceDiscovery.on('service:call:success', (...args) => this.emit('service:call:success', ...args));
    this.serviceDiscovery.on('service:call:error', (...args) => this.emit('service:call:error', ...args));
    this.serviceDiscovery.on('service:event:emitted', (...args) => this.emit('service:event:emitted', ...args));
    this.serviceDiscovery.on('service:event:error', (...args) => this.emit('service:event:error', ...args));
  }
}

export interface PluginHealthReport {
  totalPlugins: number;
  enabledPlugins: number;
  disabledPlugins: number;
  errorPlugins: number;
  errors: Array<{
    pluginId: string;
    error: string;
  }>;
}