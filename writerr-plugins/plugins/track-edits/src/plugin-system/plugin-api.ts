/**
 * Plugin API and Registration Endpoints
 * 
 * Provides public API endpoints for plugin registration, authentication,
 * and interaction with the Track Edits plugin system.
 */

import { Plugin } from 'obsidian';
import { 
  AIProcessingPlugin,
  PluginPermission,
  PluginRegistrationStatus,
  PluginPerformanceMetrics
} from '../types/submit-changes-from-ai';

import {
  IAIProcessingPlugin,
  PluginRegistrationResult,
  PluginSecurityOptions,
  PluginFilter,
  IPluginRegistry
} from './plugin-interface';

/**
 * Main Plugin API class that other plugins can use to interact with Track Edits
 */
export class TrackEditsPluginAPI {
  constructor(private trackEditsPlugin: any) {} // TrackEditsPlugin type

  /**
   * Register an AI processing plugin with Track Edits
   */
  async registerPlugin(
    plugin: IAIProcessingPlugin,
    securityOptions?: Partial<PluginSecurityOptions>
  ): Promise<PluginRegistrationResult> {
    return await this.trackEditsPlugin.registerAIProcessingPlugin(plugin, securityOptions);
  }

  /**
   * Unregister a plugin
   */
  async unregisterPlugin(pluginId: string, reason?: string): Promise<boolean> {
    return await this.trackEditsPlugin.unregisterAIProcessingPlugin(pluginId, reason);
  }

  /**
   * Get all registered plugins
   */
  getRegisteredPlugins(filter?: PluginFilter): IAIProcessingPlugin[] {
    const allPlugins = this.trackEditsPlugin.getRegisteredPlugins();
    
    if (!filter) {
      return allPlugins;
    }

    // Apply client-side filtering if registry doesn't support it
    return allPlugins.filter(plugin => {
      const pluginInfo = plugin.getPluginInfo();
      
      if (filter.status && !filter.status.includes(PluginRegistrationStatus.ACTIVE)) {
        return false;
      }
      
      if (filter.author && pluginInfo.author !== filter.author) {
        return false;
      }
      
      if (filter.capabilities) {
        const hasCapabilities = filter.capabilities.every(cap =>
          pluginInfo.capabilities.editorialOperations.includes(cap as any)
        );
        if (!hasCapabilities) return false;
      }
      
      return true;
    });
  }

  /**
   * Get specific plugin by ID
   */
  getPlugin(pluginId: string): IAIProcessingPlugin | undefined {
    return this.trackEditsPlugin.getRegisteredPlugin(pluginId);
  }

  /**
   * Submit AI changes through Track Edits (authenticated)
   */
  async submitAIChanges(
    pluginId: string,
    changes: any[], // EditChange[]
    aiProvider: string,
    aiModel: string,
    processingContext?: any, // AIProcessingContext
    options: any = {} // SubmitChangesFromAIOptions
  ): Promise<any> { // SubmitChangesFromAIResult
    const plugin = this.getPlugin(pluginId);
    if (!plugin) {
      return {
        success: false,
        changeIds: [],
        errors: ['Plugin not found or not registered'],
        warnings: []
      };
    }

    // Use plugin's submit method which handles authentication internally
    return await plugin.submitChanges(changes, aiProvider, aiModel, processingContext, options);
  }

  /**
   * Check plugin status
   */
  getPluginStatus(pluginId: string): PluginRegistrationStatus | null {
    const registry = (this.trackEditsPlugin as any).pluginRegistry as IPluginRegistry | null;
    if (!registry) return null;

    // This would need to be exposed by the registry
    return PluginRegistrationStatus.ACTIVE; // Simplified
  }

  /**
   * Get plugin performance metrics
   */
  getPluginMetrics(pluginId: string): PluginPerformanceMetrics | undefined {
    const registry = (this.trackEditsPlugin as any).pluginRegistry as IPluginRegistry | null;
    if (!registry) return undefined;

    return registry.getPluginMetrics(pluginId);
  }

  /**
   * Validate plugin capabilities for an operation
   */
  async validatePluginCapability(pluginId: string, operation: string, context?: any): Promise<boolean> {
    const plugin = this.getPlugin(pluginId);
    if (!plugin) return false;

    return await plugin.validateCapability(operation, context);
  }

  /**
   * Get plugin information
   */
  getPluginInfo(pluginId: string): AIProcessingPlugin | undefined {
    const plugin = this.getPlugin(pluginId);
    return plugin?.getPluginInfo();
  }
}

/**
 * Global API accessor for other plugins
 */
export class TrackEditsGlobalAPI {
  private static instance: TrackEditsPluginAPI | null = null;

  /**
   * Initialize the global API
   */
  static initialize(trackEditsPlugin: any): void {
    TrackEditsGlobalAPI.instance = new TrackEditsPluginAPI(trackEditsPlugin);
    
    // Expose on window/global for other plugins
    if (typeof window !== 'undefined') {
      (window as any).TrackEditsAPI = TrackEditsGlobalAPI.instance;
    }
    
    if (typeof global !== 'undefined') {
      (global as any).TrackEditsAPI = TrackEditsGlobalAPI.instance;
    }
  }

  /**
   * Get the global API instance
   */
  static getInstance(): TrackEditsPluginAPI | null {
    return TrackEditsGlobalAPI.instance;
  }

  /**
   * Clean up the global API
   */
  static cleanup(): void {
    if (typeof window !== 'undefined') {
      delete (window as any).TrackEditsAPI;
    }
    
    if (typeof global !== 'undefined') {
      delete (global as any).TrackEditsAPI;
    }
    
    TrackEditsGlobalAPI.instance = null;
  }
}

/**
 * Plugin registration helper for other Obsidian plugins
 */
export class PluginRegistrationHelper {
  /**
   * Easy registration method for Obsidian plugins
   */
  static async registerWithTrackEdits(
    obsidianPlugin: Plugin,
    aiProcessingPlugin: IAIProcessingPlugin,
    options?: Partial<PluginSecurityOptions>
  ): Promise<PluginRegistrationResult> {
    const trackEditsAPI = TrackEditsGlobalAPI.getInstance();
    
    if (!trackEditsAPI) {
      return {
        success: false,
        pluginId: aiProcessingPlugin.getPluginInfo().id,
        authToken: '',
        permissions: [],
        errors: ['Track Edits API not available'],
        warnings: ['Ensure Track Edits plugin is loaded and active'],
        expiresAt: new Date()
      };
    }

    try {
      const result = await trackEditsAPI.registerPlugin(aiProcessingPlugin, options);
      
      if (result.success) {
        // Store registration info in the Obsidian plugin for cleanup
        (obsidianPlugin as any)._trackEditsRegistration = {
          pluginId: result.pluginId,
          authToken: result.authToken,
          registrationTime: new Date()
        };

        console.log(`[${obsidianPlugin.manifest.name}] Successfully registered with Track Edits`);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        pluginId: aiProcessingPlugin.getPluginInfo().id,
        authToken: '',
        permissions: [],
        errors: [`Registration failed: ${error instanceof Error ? error.message : String(error)}`],
        warnings: [],
        expiresAt: new Date()
      };
    }
  }

  /**
   * Unregister plugin during Obsidian plugin unload
   */
  static async unregisterFromTrackEdits(obsidianPlugin: Plugin): Promise<boolean> {
    const trackEditsAPI = TrackEditsGlobalAPI.getInstance();
    const registration = (obsidianPlugin as any)._trackEditsRegistration;
    
    if (!trackEditsAPI || !registration) {
      return true; // Nothing to unregister
    }

    try {
      const result = await trackEditsAPI.unregisterPlugin(
        registration.pluginId,
        `Obsidian plugin ${obsidianPlugin.manifest.name} unloaded`
      );

      if (result) {
        delete (obsidianPlugin as any)._trackEditsRegistration;
        console.log(`[${obsidianPlugin.manifest.name}] Successfully unregistered from Track Edits`);
      }

      return result;
    } catch (error) {
      console.error(`[${obsidianPlugin.manifest.name}] Failed to unregister from Track Edits:`, error);
      return false;
    }
  }

  /**
   * Create a simple AI processing plugin wrapper for basic functionality
   */
  static createSimpleAIPlugin(config: {
    id: string;
    name: string;
    version: string;
    author: string;
    description: string;
    capabilities?: Partial<PluginCapabilities>;
    onSubmitChanges?: (changes: any[], aiProvider: string, aiModel: string) => Promise<any>;
  }): IAIProcessingPlugin {
    return new SimpleAIPluginWrapper(config);
  }
}

/**
 * Simple plugin wrapper for basic AI processing plugins
 */
class SimpleAIPluginWrapper implements IAIProcessingPlugin {
  private registry: IPluginRegistry | null = null;
  private authContext: any = null;

  constructor(private config: any) {}

  getPluginInfo(): AIProcessingPlugin {
    return {
      id: this.config.id,
      name: this.config.name,
      version: this.config.version,
      author: this.config.author,
      description: this.config.description,
      capabilities: {
        editorialOperations: ['replace', 'insert', 'delete'],
        aiProviders: ['openai'],
        maxBatchSize: 10,
        supportsRealTime: false,
        supportsConversationContext: false,
        supportedFileTypes: ['markdown'],
        requiredPermissions: [PluginPermission.MODIFY_DOCUMENTS],
        ...this.config.capabilities
      },
      metadata: {
        keywords: ['ai', 'editing'],
        license: 'Unknown'
      },
      apiVersion: '1.0.0'
    };
  }

  async initialize(registry: IPluginRegistry, authContext: any): Promise<void> {
    this.registry = registry;
    this.authContext = authContext;
  }

  async submitChanges(changes: any[], aiProvider: string, aiModel: string, processingContext?: any, options?: any): Promise<any> {
    if (this.config.onSubmitChanges) {
      return await this.config.onSubmitChanges(changes, aiProvider, aiModel);
    }

    return {
      success: true,
      changeIds: changes.map((_, i) => `simple_${Date.now()}_${i}`),
      errors: [],
      warnings: ['Using simple plugin wrapper - limited functionality']
    };
  }

  async validateCapability(operation: string): Promise<boolean> {
    const capabilities = this.getPluginInfo().capabilities;
    return capabilities.editorialOperations.includes(operation as any);
  }

  async cleanup(): Promise<void> {
    this.registry = null;
    this.authContext = null;
  }

  async onLifecycleEvent(event: any, data?: any): Promise<void> {
    console.log(`[${this.config.name}] Lifecycle event: ${event}`, data);
  }
}

/**
 * Export the API initialization function for the main Track Edits plugin
 */
export function initializeTrackEditsPluginAPI(trackEditsPlugin: any): void {
  TrackEditsGlobalAPI.initialize(trackEditsPlugin);
  console.log('[TrackEditsPluginAPI] Global API initialized and available to other plugins');
}

/**
 * Export the API cleanup function
 */
export function cleanupTrackEditsPluginAPI(): void {
  TrackEditsGlobalAPI.cleanup();
  console.log('[TrackEditsPluginAPI] Global API cleaned up');
}

/**
 * Type definitions for TypeScript plugins
 */
export interface TrackEditsAPIInterface {
  registerPlugin(plugin: IAIProcessingPlugin, options?: Partial<PluginSecurityOptions>): Promise<PluginRegistrationResult>;
  unregisterPlugin(pluginId: string, reason?: string): Promise<boolean>;
  getRegisteredPlugins(filter?: PluginFilter): IAIProcessingPlugin[];
  getPlugin(pluginId: string): IAIProcessingPlugin | undefined;
  submitAIChanges(pluginId: string, changes: any[], aiProvider: string, aiModel: string, processingContext?: any, options?: any): Promise<any>;
  getPluginStatus(pluginId: string): PluginRegistrationStatus | null;
  getPluginMetrics(pluginId: string): PluginPerformanceMetrics | undefined;
  validatePluginCapability(pluginId: string, operation: string, context?: any): Promise<boolean>;
  getPluginInfo(pluginId: string): AIProcessingPlugin | undefined;
}

// Augment global types for TypeScript support
declare global {
  interface Window {
    TrackEditsAPI?: TrackEditsAPIInterface;
  }
  
  var TrackEditsAPI: TrackEditsAPIInterface | undefined;
}