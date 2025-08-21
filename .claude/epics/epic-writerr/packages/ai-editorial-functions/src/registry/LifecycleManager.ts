/**
 * @fileoverview Lifecycle management system for coordinating function loading, validation, and execution
 */

import { globalEventBus, EventData } from '@writerr/shared';
import { FunctionRegistry, functionRegistry } from './FunctionRegistry';
import { FunctionLoader, functionLoader } from '../loader/FunctionLoader';
import { FileWatcher, fileWatcher } from '../watcher/FileWatcher';
import {
  FunctionDefinition,
  FunctionLoadResult,
  ValidationResult,
  FunctionExecution,
  RegistryConfig,
  LifecycleEvent,
  LifecycleState,
  LifecycleError
} from '../types';

interface LifecycleConfig extends RegistryConfig {
  autoLoad: boolean;
  autoReload: boolean;
  validateOnLoad: boolean;
  cleanupInterval: number;
}

export interface LifecycleEvent {
  type: 'lifecycle-started' | 'lifecycle-stopped' | 'function-lifecycle' | 'lifecycle-error';
  functionId?: string;
  state?: LifecycleState;
  data?: any;
  timestamp: Date;
}

export interface LifecycleState {
  phase: 'loading' | 'validating' | 'loaded' | 'executing' | 'unloading' | 'error';
  progress?: number;
  message?: string;
  error?: string;
}

export interface LifecycleError extends Error {
  functionId?: string;
  phase: string;
  recoverable: boolean;
}

export class LifecycleManager {
  private config: LifecycleConfig;
  private isInitialized = false;
  private cleanupTimer?: NodeJS.Timeout;
  private functionStates = new Map<string, LifecycleState>();
  private loadQueue = new Set<string>();
  private executionQueue: Array<{ functionId: string; input: string; options: any; resolve: Function; reject: Function }> = [];
  private isProcessingQueue = false;

  constructor(config: Partial<LifecycleConfig> = {}) {
    this.config = {
      watchPaths: ['functions', 'editorial-functions'],
      fileExtensions: ['.md', '.xml'],
      hotReloadEnabled: true,
      validationEnabled: true,
      maxConcurrentExecutions: 10,
      executionTimeout: 5000,
      memoryLimit: 100 * 1024 * 1024,
      autoCleanup: true,
      debugMode: false,
      autoLoad: true,
      autoReload: true,
      validateOnLoad: true,
      cleanupInterval: 60000, // 1 minute
      ...config
    };

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for file watcher events
    globalEventBus.on('file-watcher-event', (event: EventData) => {
      this.handleFileWatcherEvent(event);
    });

    // Listen for function registry events
    globalEventBus.on('function-registry-event', (event: EventData) => {
      this.handleRegistryEvent(event);
    });

    // Listen for lifecycle requests
    globalEventBus.on('function-lifecycle', (event: EventData) => {
      this.handleLifecycleRequest(event);
    });

    // Listen for direct function requests
    globalEventBus.on('function-load', (event: EventData) => {
      this.loadFunction(event.payload.filePath);
    });

    globalEventBus.on('function-reload', (event: EventData) => {
      this.reloadFunction(event.payload.filePath);
    });

    globalEventBus.on('function-unload', (event: EventData) => {
      this.unloadFunction(event.payload.filePath);
    });

    globalEventBus.on('function-execute', (event: EventData) => {
      this.queueExecution(
        event.payload.functionId,
        event.payload.input,
        event.payload.options
      );
    });
  }

  /**
   * Initialize the lifecycle management system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.emitLifecycleEvent('lifecycle-started', undefined, {
        phase: 'loading',
        message: 'Initializing lifecycle manager'
      });

      // Start file watcher if hot reload is enabled
      if (this.config.hotReloadEnabled) {
        // Add watch paths
        for (const watchPath of this.config.watchPaths) {
          fileWatcher.addWatchPath(watchPath);
        }
        fileWatcher.start();
      }

      // Auto-load functions if enabled
      if (this.config.autoLoad) {
        await this.loadAllFunctions();
      }

      // Start cleanup timer
      if (this.config.autoCleanup) {
        this.startCleanupTimer();
      }

      this.isInitialized = true;

      this.emitLifecycleEvent('lifecycle-started', undefined, {
        phase: 'loaded',
        message: 'Lifecycle manager initialized successfully'
      });

      console.log('[LifecycleManager] Initialized successfully');
    } catch (error) {
      this.handleLifecycleError(error as Error, 'initialization');
      throw error;
    }
  }

  /**
   * Shutdown the lifecycle management system
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      this.emitLifecycleEvent('lifecycle-stopped', undefined, {
        phase: 'unloading',
        message: 'Shutting down lifecycle manager'
      });

      // Stop cleanup timer
      if (this.cleanupTimer) {
        clearInterval(this.cleanupTimer);
        this.cleanupTimer = undefined;
      }

      // Stop file watcher
      fileWatcher.stop();

      // Clear queues
      this.loadQueue.clear();
      this.executionQueue.splice(0);
      this.functionStates.clear();

      // Cleanup registry
      functionRegistry.cleanup();

      this.isInitialized = false;

      this.emitLifecycleEvent('lifecycle-stopped', undefined, {
        phase: 'loaded',
        message: 'Lifecycle manager shutdown complete'
      });

      console.log('[LifecycleManager] Shutdown complete');
    } catch (error) {
      this.handleLifecycleError(error as Error, 'shutdown');
    }
  }

  /**
   * Load a function from a file path
   */
  async loadFunction(filePath: string): Promise<FunctionLoadResult> {
    if (this.loadQueue.has(filePath)) {
      console.warn(`[LifecycleManager] Function already queued for loading: ${filePath}`);
      return { success: false, errors: ['Function already being loaded'], warnings: [] };
    }

    this.loadQueue.add(filePath);

    try {
      // Extract function ID from file path for state tracking
      const functionId = this.extractFunctionIdFromPath(filePath);
      
      this.updateFunctionState(functionId, {
        phase: 'loading',
        message: `Loading function from ${filePath}`
      });

      // Load function definition
      const loadResult = await functionLoader.loadFromFile(filePath);
      
      if (!loadResult.success || !loadResult.function) {
        this.updateFunctionState(functionId, {
          phase: 'error',
          error: loadResult.errors.join(', ')
        });
        return loadResult;
      }

      const definition = loadResult.function;

      // Validate if enabled
      if (this.config.validateOnLoad) {
        this.updateFunctionState(definition.id, {
          phase: 'validating',
          message: 'Validating function definition'
        });

        const validationResult = await this.validateFunction(definition);
        if (!validationResult.isValid) {
          this.updateFunctionState(definition.id, {
            phase: 'error',
            error: `Validation failed: ${validationResult.errors.join(', ')}`
          });
          return {
            success: false,
            errors: validationResult.errors,
            warnings: validationResult.warnings
          };
        }
      }

      // Register function
      functionRegistry.registerFunction(definition);

      this.updateFunctionState(definition.id, {
        phase: 'loaded',
        message: 'Function loaded successfully'
      });

      this.emitLifecycleEvent('function-lifecycle', definition.id, {
        phase: 'loaded',
        message: 'Function loaded and registered successfully'
      });

      return loadResult;
    } catch (error) {
      const functionId = this.extractFunctionIdFromPath(filePath);
      this.updateFunctionState(functionId, {
        phase: 'error',
        error: (error as Error).message
      });
      
      this.handleLifecycleError(error as Error, 'loading', functionId);
      return {
        success: false,
        errors: [(error as Error).message],
        warnings: []
      };
    } finally {
      this.loadQueue.delete(filePath);
    }
  }

  /**
   * Reload a function from its file path
   */
  async reloadFunction(filePath: string): Promise<FunctionLoadResult> {
    try {
      const functionId = this.extractFunctionIdFromPath(filePath);
      
      // Check if function exists and has changed
      const existingFunction = functionRegistry.getFunction(functionId);
      if (existingFunction) {
        const hasChanged = await functionLoader.hasFileChanged(filePath, existingFunction.hash);
        if (!hasChanged) {
          console.log(`[LifecycleManager] Function ${functionId} unchanged, skipping reload`);
          return { success: true, errors: [], warnings: ['Function unchanged'] };
        }
      }

      // Unload existing function if it exists
      if (existingFunction) {
        await this.unloadFunction(filePath);
      }

      // Load the updated function
      return await this.loadFunction(filePath);
    } catch (error) {
      const functionId = this.extractFunctionIdFromPath(filePath);
      this.handleLifecycleError(error as Error, 'reloading', functionId);
      return {
        success: false,
        errors: [(error as Error).message],
        warnings: []
      };
    }
  }

  /**
   * Unload a function
   */
  async unloadFunction(filePath: string): Promise<boolean> {
    try {
      const functionId = this.extractFunctionIdFromPath(filePath);
      
      this.updateFunctionState(functionId, {
        phase: 'unloading',
        message: 'Unloading function'
      });

      const success = functionRegistry.unregisterFunction(functionId);
      
      if (success) {
        this.functionStates.delete(functionId);
        this.emitLifecycleEvent('function-lifecycle', functionId, {
          phase: 'loaded',
          message: 'Function unloaded successfully'
        });
      } else {
        this.updateFunctionState(functionId, {
          phase: 'error',
          error: 'Failed to unload function'
        });
      }

      return success;
    } catch (error) {
      const functionId = this.extractFunctionIdFromPath(filePath);
      this.handleLifecycleError(error as Error, 'unloading', functionId);
      return false;
    }
  }

  /**
   * Execute a function (queued execution)
   */
  async executeFunction(functionId: string, input: string, options: any = {}): Promise<FunctionExecution> {
    return new Promise((resolve, reject) => {
      this.executionQueue.push({
        functionId,
        input,
        options,
        resolve,
        reject
      });

      this.processExecutionQueue();
    });
  }

  /**
   * Queue a function execution
   */
  private queueExecution(functionId: string, input: string, options: any): void {
    this.executeFunction(functionId, input, options)
      .then(result => {
        globalEventBus.emit('function-execution-complete', result, 'lifecycle-manager');
      })
      .catch(error => {
        globalEventBus.emit('function-execution-error', {
          functionId,
          error: error.message
        }, 'lifecycle-manager');
      });
  }

  /**
   * Process the execution queue
   */
  private async processExecutionQueue(): Promise<void> {
    if (this.isProcessingQueue || this.executionQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.executionQueue.length > 0) {
      const { functionId, input, options, resolve, reject } = this.executionQueue.shift()!;

      try {
        this.updateFunctionState(functionId, {
          phase: 'executing',
          message: 'Executing function'
        });

        const result = await functionRegistry.executeFunction(functionId, input, options);
        
        this.updateFunctionState(functionId, {
          phase: 'loaded',
          message: 'Execution completed successfully'
        });

        resolve(result);
      } catch (error) {
        this.updateFunctionState(functionId, {
          phase: 'error',
          error: (error as Error).message
        });

        reject(error);
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Load all functions from watch paths
   */
  private async loadAllFunctions(): Promise<void> {
    const loadPromises: Promise<FunctionLoadResult[]>[] = [];

    for (const watchPath of this.config.watchPaths) {
      loadPromises.push(functionLoader.loadFromDirectory(watchPath, true));
    }

    const allResults = await Promise.all(loadPromises);
    const results = allResults.flat();

    let successCount = 0;
    let errorCount = 0;

    for (const result of results) {
      if (result.success && result.function) {
        try {
          functionRegistry.registerFunction(result.function);
          successCount++;
        } catch (error) {
          console.error(`[LifecycleManager] Failed to register function:`, error);
          errorCount++;
        }
      } else {
        console.error(`[LifecycleManager] Failed to load function:`, result.errors);
        errorCount++;
      }
    }

    console.log(`[LifecycleManager] Loaded ${successCount} functions, ${errorCount} errors`);
  }

  /**
   * Validate a function definition
   */
  private async validateFunction(definition: FunctionDefinition): Promise<ValidationResult> {
    // This would perform comprehensive validation
    // For now, basic validation is in the registry
    return { isValid: true, errors: [], warnings: [] };
  }

  /**
   * Handle file watcher events
   */
  private handleFileWatcherEvent(event: EventData): void {
    const { type, data } = event;

    switch (type) {
      case 'file-changed':
        if (this.config.autoReload) {
          const watchEvent = data;
          this.handleFileChange(watchEvent);
        }
        break;
    }
  }

  /**
   * Handle function registry events
   */
  private handleRegistryEvent(event: EventData): void {
    // Handle registry events if needed
  }

  /**
   * Handle lifecycle requests
   */
  private handleLifecycleRequest(event: EventData): void {
    const { type, payload } = event;

    switch (type) {
      case 'load-function':
        this.loadFunction(payload.filePath);
        break;
      case 'reload-function':
        this.reloadFunction(payload.filePath);
        break;
      case 'unload-function':
        this.unloadFunction(payload.filePath);
        break;
    }
  }

  /**
   * Handle file changes from watcher
   */
  private handleFileChange(watchEvent: any): void {
    const { type, filePath } = watchEvent;

    switch (type) {
      case 'created':
        this.loadFunction(filePath);
        break;
      case 'modified':
        this.reloadFunction(filePath);
        break;
      case 'deleted':
        this.unloadFunction(filePath);
        break;
    }
  }

  /**
   * Extract function ID from file path
   */
  private extractFunctionIdFromPath(filePath: string): string {
    const basename = require('path').basename(filePath);
    const nameWithoutExt = basename.substring(0, basename.lastIndexOf('.'));
    return nameWithoutExt;
  }

  /**
   * Update function state
   */
  private updateFunctionState(functionId: string, state: LifecycleState): void {
    this.functionStates.set(functionId, state);
    
    this.emitLifecycleEvent('function-lifecycle', functionId, state);
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      functionRegistry.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Handle lifecycle errors
   */
  private handleLifecycleError(error: Error, phase: string, functionId?: string): void {
    const lifecycleError: LifecycleError = Object.assign(error, {
      functionId,
      phase,
      recoverable: true
    });

    console.error(`[LifecycleManager] Error in ${phase}${functionId ? ` for ${functionId}` : ''}:`, error);

    this.emitLifecycleEvent('lifecycle-error', functionId, {
      phase: 'error',
      error: error.message
    });
  }

  /**
   * Emit lifecycle event
   */
  private emitLifecycleEvent(type: string, functionId?: string, state?: LifecycleState): void {
    const event: LifecycleEvent = {
      type: type as any,
      functionId,
      state,
      timestamp: new Date()
    };

    globalEventBus.emit('lifecycle-event', event, 'lifecycle-manager');
  }

  /**
   * Get current status
   */
  getStatus(): {
    initialized: boolean;
    functionsLoaded: number;
    functionsInError: number;
    loadQueueSize: number;
    executionQueueSize: number;
    watcherActive: boolean;
  } {
    const stats = functionRegistry.getStats();
    const watcherStats = fileWatcher.getStats();

    return {
      initialized: this.isInitialized,
      functionsLoaded: stats.activeFunctions,
      functionsInError: Array.from(this.functionStates.values()).filter(s => s.phase === 'error').length,
      loadQueueSize: this.loadQueue.size,
      executionQueueSize: this.executionQueue.length,
      watcherActive: watcherStats.isActive
    };
  }

  /**
   * Get function states
   */
  getFunctionStates(): Map<string, LifecycleState> {
    return new Map(this.functionStates);
  }
}

// Export singleton instance
export const lifecycleManager = new LifecycleManager();