/**
 * Plugin Registry Manager
 * Handles plugin registration, capability discovery, and lifecycle management
 */

import { EventEmitter } from 'events';
import {
  PluginCapability,
  PluginMetadata,
  PluginStatus,
  PluginDependency,
  PluginRegistryConfig,
  VersionCompatibility
} from './types';
import { VersionChecker } from './VersionChecker';

export class PluginRegistry extends EventEmitter {
  private plugins: Map<string, PluginMetadata> = new Map();
  private capabilities: Map<string, PluginCapability> = new Map();
  private dependencyGraph: Map<string, string[]> = new Map();
  private versionChecker: VersionChecker;
  private config: PluginRegistryConfig;

  constructor(config: PluginRegistryConfig = {}) {
    super();
    this.config = {
      autoLoad: true,
      enableVersionChecking: true,
      allowOptionalDependencies: true,
      maxRetries: 3,
      retryDelay: 1000,
      ...config
    };
    this.versionChecker = new VersionChecker();
  }

  /**
   * Register a plugin with its capabilities
   */
  async registerPlugin(metadata: PluginMetadata, capabilities: PluginCapability[]): Promise<void> {
    try {
      // Version compatibility check
      if (this.config.enableVersionChecking) {
        const compatibility = await this.checkCompatibility(metadata);
        if (!compatibility.isCompatible) {
          throw new Error(`Plugin ${metadata.id} is not compatible: ${compatibility.reason}`);
        }
      }

      // Check dependencies
      const dependencyCheck = await this.resolveDependencies(metadata.dependencies);
      if (!dependencyCheck.success) {
        throw new Error(`Plugin ${metadata.id} has unresolved dependencies: ${dependencyCheck.missing.join(', ')}`);
      }

      // Register plugin
      this.plugins.set(metadata.id, { ...metadata, status: PluginStatus.LOADED });

      // Register capabilities
      for (const capability of capabilities) {
        this.capabilities.set(capability.id, capability);
      }

      // Update dependency graph
      this.updateDependencyGraph(metadata.id, metadata.dependencies);

      this.emit('plugin:registered', metadata.id);
      
      // Auto-enable if configured
      if (this.config.autoLoad) {
        await this.enablePlugin(metadata.id);
      }

    } catch (error) {
      const updatedMetadata = { ...metadata, status: PluginStatus.ERROR, lastError: error as Error };
      this.plugins.set(metadata.id, updatedMetadata);
      this.emit('plugin:error', metadata.id, error);
      throw error;
    }
  }

  /**
   * Enable a registered plugin
   */
  async enablePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (plugin.status === PluginStatus.ENABLED) {
      return; // Already enabled
    }

    if (plugin.status === PluginStatus.ERROR) {
      throw new Error(`Cannot enable plugin ${pluginId} due to previous error: ${plugin.lastError?.message}`);
    }

    try {
      // Check dependencies are enabled
      await this.ensureDependenciesEnabled(plugin.dependencies);

      // Update status
      const updatedPlugin = { ...plugin, status: PluginStatus.ENABLED };
      this.plugins.set(pluginId, updatedPlugin);

      this.emit('plugin:enabled', pluginId);
    } catch (error) {
      const updatedPlugin = { ...plugin, status: PluginStatus.ERROR, lastError: error as Error };
      this.plugins.set(pluginId, updatedPlugin);
      this.emit('plugin:error', pluginId, error);
      throw error;
    }
  }

  /**
   * Disable a plugin
   */
  async disablePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (plugin.status !== PluginStatus.ENABLED) {
      return; // Already disabled or not enabled
    }

    // Check if other plugins depend on this one
    const dependents = this.getDependents(pluginId);
    if (dependents.length > 0) {
      const enabledDependents = dependents.filter(id => {
        const dep = this.plugins.get(id);
        return dep?.status === PluginStatus.ENABLED;
      });

      if (enabledDependents.length > 0) {
        throw new Error(`Cannot disable plugin ${pluginId}. The following enabled plugins depend on it: ${enabledDependents.join(', ')}`);
      }
    }

    const updatedPlugin = { ...plugin, status: PluginStatus.DISABLED };
    this.plugins.set(pluginId, updatedPlugin);

    this.emit('plugin:disabled', pluginId);
  }

  /**
   * Unload a plugin completely
   */
  async unloadPlugin(pluginId: string): Promise<void> {
    await this.disablePlugin(pluginId);
    
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      // Remove capabilities
      for (const [capId, capability] of this.capabilities.entries()) {
        // Assuming capability belongs to plugin if IDs match pattern
        if (capId.startsWith(pluginId)) {
          this.capabilities.delete(capId);
        }
      }

      // Remove from dependency graph
      this.dependencyGraph.delete(pluginId);

      // Remove plugin
      this.plugins.delete(pluginId);

      this.emit('plugin:unloaded', pluginId);
    }
  }

  /**
   * Get all registered plugins
   */
  getPlugins(): PluginMetadata[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugin by ID
   */
  getPlugin(pluginId: string): PluginMetadata | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Get all capabilities
   */
  getCapabilities(): PluginCapability[] {
    return Array.from(this.capabilities.values());
  }

  /**
   * Get capabilities by category
   */
  getCapabilitiesByCategory(category: string): PluginCapability[] {
    return Array.from(this.capabilities.values()).filter(cap => cap.category === category);
  }

  /**
   * Find capability by ID
   */
  getCapability(capabilityId: string): PluginCapability | undefined {
    return this.capabilities.get(capabilityId);
  }

  /**
   * Check plugin compatibility
   */
  private async checkCompatibility(metadata: PluginMetadata): Promise<VersionCompatibility> {
    return this.versionChecker.checkCompatibility(metadata);
  }

  /**
   * Resolve plugin dependencies
   */
  private async resolveDependencies(dependencies: PluginDependency[]): Promise<{success: boolean, missing: string[]}> {
    const missing: string[] = [];

    for (const dep of dependencies) {
      const plugin = this.plugins.get(dep.pluginId);
      
      if (!plugin) {
        if (!dep.optional || !this.config.allowOptionalDependencies) {
          missing.push(dep.pluginId);
        }
        continue;
      }

      // Check version compatibility
      if (this.config.enableVersionChecking) {
        const compatible = this.versionChecker.isVersionCompatible(plugin.version, dep.version);
        if (!compatible && !dep.optional) {
          missing.push(`${dep.pluginId} (version ${dep.version})`);
        }
      }
    }

    return { success: missing.length === 0, missing };
  }

  /**
   * Ensure all dependencies are enabled
   */
  private async ensureDependenciesEnabled(dependencies: PluginDependency[]): Promise<void> {
    for (const dep of dependencies) {
      const plugin = this.plugins.get(dep.pluginId);
      
      if (!plugin) {
        if (!dep.optional) {
          throw new Error(`Required dependency ${dep.pluginId} not found`);
        }
        continue;
      }

      if (plugin.status !== PluginStatus.ENABLED) {
        if (!dep.optional) {
          await this.enablePlugin(dep.pluginId);
        }
      }
    }
  }

  /**
   * Update dependency graph
   */
  private updateDependencyGraph(pluginId: string, dependencies: PluginDependency[]): void {
    const depIds = dependencies.map(dep => dep.pluginId);
    this.dependencyGraph.set(pluginId, depIds);
  }

  /**
   * Get plugins that depend on the given plugin
   */
  private getDependents(pluginId: string): string[] {
    const dependents: string[] = [];
    
    for (const [pid, deps] of this.dependencyGraph.entries()) {
      if (deps.includes(pluginId)) {
        dependents.push(pid);
      }
    }

    return dependents;
  }
}