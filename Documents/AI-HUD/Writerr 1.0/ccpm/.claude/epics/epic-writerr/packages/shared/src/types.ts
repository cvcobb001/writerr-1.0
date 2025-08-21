/**
 * @fileoverview Shared TypeScript types and interfaces
 */

export interface WriterPlugin {
  id: string;
  name: string;
  version: string;
  capabilities: string[];
}

export interface EventData {
  type: string;
  payload: any;
  timestamp: number;
  source: string;
}

export interface PluginRegistry {
  register(plugin: WriterPlugin): void;
  unregister(pluginId: string): void;
  getPlugin(pluginId: string): WriterPlugin | null;
  listPlugins(): WriterPlugin[];
}