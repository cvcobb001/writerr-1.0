/**
 * @fileoverview Plugin registry for capability discovery
 */

import { WriterPlugin, PluginRegistry as IPluginRegistry } from './types';

export class PluginRegistry implements IPluginRegistry {
  private plugins: Map<string, WriterPlugin> = new Map();
  
  register(plugin: WriterPlugin): void {
    this.plugins.set(plugin.id, plugin);
  }
  
  unregister(pluginId: string): void {
    this.plugins.delete(pluginId);
  }
  
  getPlugin(pluginId: string): WriterPlugin | null {
    return this.plugins.get(pluginId) || null;
  }
  
  listPlugins(): WriterPlugin[] {
    return Array.from(this.plugins.values());
  }
  
  hasCapability(capability: string): WriterPlugin[] {
    return this.listPlugins().filter(plugin => 
      plugin.capabilities.includes(capability)
    );
  }
}

// Global registry instance
export const globalRegistry = new PluginRegistry();