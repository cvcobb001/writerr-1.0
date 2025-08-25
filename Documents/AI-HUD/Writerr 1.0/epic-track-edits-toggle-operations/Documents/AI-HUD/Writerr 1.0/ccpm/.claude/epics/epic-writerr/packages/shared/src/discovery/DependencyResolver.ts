/**
 * Dependency Resolver
 * Handles plugin dependency resolution and loading order
 */

import { PluginDependency, PluginMetadata, PluginStatus } from '../registry/types';

export interface DependencyResolution {
  loadOrder: string[];
  conflicts: DependencyConflict[];
  missing: string[];
  circular: string[][];
}

export interface DependencyConflict {
  pluginId: string;
  conflictingDependencies: {
    dependency: string;
    requiredVersion: string;
    conflictingVersion: string;
    conflictingPlugin: string;
  }[];
}

export class DependencyResolver {
  private plugins: Map<string, PluginMetadata> = new Map();

  /**
   * Add plugin metadata for dependency resolution
   */
  addPlugin(metadata: PluginMetadata): void {
    this.plugins.set(metadata.id, metadata);
  }

  /**
   * Remove plugin metadata
   */
  removePlugin(pluginId: string): void {
    this.plugins.delete(pluginId);
  }

  /**
   * Resolve dependencies and determine loading order
   */
  resolveDependencies(targetPlugins?: string[]): DependencyResolution {
    const pluginsToResolve = targetPlugins || Array.from(this.plugins.keys());
    
    const resolution: DependencyResolution = {
      loadOrder: [],
      conflicts: [],
      missing: [],
      circular: []
    };

    // Find missing dependencies
    resolution.missing = this.findMissingDependencies(pluginsToResolve);

    // Find circular dependencies
    resolution.circular = this.findCircularDependencies(pluginsToResolve);

    // Find version conflicts
    resolution.conflicts = this.findVersionConflicts(pluginsToResolve);

    // If no blocking issues, calculate load order
    if (resolution.missing.length === 0 && resolution.circular.length === 0) {
      resolution.loadOrder = this.calculateLoadOrder(pluginsToResolve);
    }

    return resolution;
  }

  /**
   * Check if dependencies are satisfied for a specific plugin
   */
  checkDependenciesSatisfied(pluginId: string): {satisfied: boolean, issues: string[]} {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return { satisfied: false, issues: [`Plugin ${pluginId} not found`] };
    }

    const issues: string[] = [];

    for (const dep of plugin.dependencies) {
      const depPlugin = this.plugins.get(dep.pluginId);
      
      if (!depPlugin) {
        if (!dep.optional) {
          issues.push(`Required dependency ${dep.pluginId} not found`);
        }
        continue;
      }

      // Check if dependency is enabled
      if (depPlugin.status !== PluginStatus.ENABLED) {
        if (!dep.optional) {
          issues.push(`Required dependency ${dep.pluginId} is not enabled (status: ${depPlugin.status})`);
        }
      }

      // Version compatibility would be checked by VersionChecker
    }

    return { satisfied: issues.length === 0, issues };
  }

  /**
   * Get plugins that depend on the given plugin
   */
  getDependents(pluginId: string): string[] {
    const dependents: string[] = [];

    for (const [pid, plugin] of this.plugins) {
      const dependsOn = plugin.dependencies.some(dep => dep.pluginId === pluginId);
      if (dependsOn) {
        dependents.push(pid);
      }
    }

    return dependents;
  }

  /**
   * Get the dependency chain for a plugin
   */
  getDependencyChain(pluginId: string): string[] {
    const visited = new Set<string>();
    const chain: string[] = [];

    this.buildDependencyChain(pluginId, visited, chain);
    
    return chain;
  }

  private findMissingDependencies(pluginIds: string[]): string[] {
    const missing = new Set<string>();

    for (const pluginId of pluginIds) {
      const plugin = this.plugins.get(pluginId);
      if (!plugin) continue;

      for (const dep of plugin.dependencies) {
        if (!dep.optional && !this.plugins.has(dep.pluginId)) {
          missing.add(dep.pluginId);
        }
      }
    }

    return Array.from(missing);
  }

  private findCircularDependencies(pluginIds: string[]): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    for (const pluginId of pluginIds) {
      if (!visited.has(pluginId)) {
        const path: string[] = [];
        this.detectCycle(pluginId, visited, recursionStack, path, cycles);
      }
    }

    return cycles;
  }

  private detectCycle(
    pluginId: string,
    visited: Set<string>,
    recursionStack: Set<string>,
    path: string[],
    cycles: string[][]
  ): void {
    visited.add(pluginId);
    recursionStack.add(pluginId);
    path.push(pluginId);

    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      for (const dep of plugin.dependencies) {
        if (!dep.optional) {
          if (!visited.has(dep.pluginId)) {
            this.detectCycle(dep.pluginId, visited, recursionStack, path, cycles);
          } else if (recursionStack.has(dep.pluginId)) {
            // Found a cycle
            const cycleStart = path.indexOf(dep.pluginId);
            const cycle = path.slice(cycleStart).concat([dep.pluginId]);
            cycles.push(cycle);
          }
        }
      }
    }

    path.pop();
    recursionStack.delete(pluginId);
  }

  private findVersionConflicts(pluginIds: string[]): DependencyConflict[] {
    const conflicts: DependencyConflict[] = [];
    const dependencyVersions = new Map<string, Map<string, {version: string, requiredBy: string}>>();

    // Collect all dependency version requirements
    for (const pluginId of pluginIds) {
      const plugin = this.plugins.get(pluginId);
      if (!plugin) continue;

      for (const dep of plugin.dependencies) {
        if (!dependencyVersions.has(dep.pluginId)) {
          dependencyVersions.set(dep.pluginId, new Map());
        }

        const versionMap = dependencyVersions.get(dep.pluginId)!;
        versionMap.set(pluginId, { version: dep.version, requiredBy: pluginId });
      }
    }

    // Check for conflicts
    for (const [depPluginId, versionMap] of dependencyVersions) {
      const versions = Array.from(versionMap.values());
      
      if (versions.length > 1) {
        // Check if all versions are compatible
        const uniqueVersions = new Set(versions.map(v => v.version));
        
        if (uniqueVersions.size > 1) {
          // Potential conflict - would need more sophisticated version compatibility checking
          const conflict: DependencyConflict = {
            pluginId: depPluginId,
            conflictingDependencies: []
          };

          for (const [requiredBy, versionInfo] of versionMap) {
            const others = versions.filter(v => v.requiredBy !== requiredBy);
            for (const other of others) {
              conflict.conflictingDependencies.push({
                dependency: depPluginId,
                requiredVersion: versionInfo.version,
                conflictingVersion: other.version,
                conflictingPlugin: other.requiredBy
              });
            }
          }

          if (conflict.conflictingDependencies.length > 0) {
            conflicts.push(conflict);
          }
        }
      }
    }

    return conflicts;
  }

  private calculateLoadOrder(pluginIds: string[]): string[] {
    const loadOrder: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    for (const pluginId of pluginIds) {
      if (!visited.has(pluginId)) {
        this.topologicalSort(pluginId, visited, visiting, loadOrder);
      }
    }

    return loadOrder;
  }

  private topologicalSort(
    pluginId: string,
    visited: Set<string>,
    visiting: Set<string>,
    loadOrder: string[]
  ): void {
    if (visiting.has(pluginId)) {
      throw new Error(`Circular dependency detected involving ${pluginId}`);
    }

    if (visited.has(pluginId)) {
      return;
    }

    visiting.add(pluginId);

    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      // Visit all required dependencies first
      for (const dep of plugin.dependencies) {
        if (!dep.optional && this.plugins.has(dep.pluginId)) {
          this.topologicalSort(dep.pluginId, visited, visiting, loadOrder);
        }
      }
    }

    visiting.delete(pluginId);
    visited.add(pluginId);
    loadOrder.push(pluginId);
  }

  private buildDependencyChain(
    pluginId: string,
    visited: Set<string>,
    chain: string[]
  ): void {
    if (visited.has(pluginId)) {
      return;
    }

    visited.add(pluginId);
    chain.push(pluginId);

    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      for (const dep of plugin.dependencies) {
        if (!dep.optional) {
          this.buildDependencyChain(dep.pluginId, visited, chain);
        }
      }
    }
  }
}