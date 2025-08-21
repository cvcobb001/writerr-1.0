import { Plugin } from 'obsidian';
import { globalRegistry, globalEventBus } from '@writerr/shared';
import { lifecycleManager } from './registry';
import { functionRegistry } from './registry/FunctionRegistry';
import * as path from 'path';

export default class AIEditorialFunctionsPlugin extends Plugin {
  private isInitialized = false;

  async onload() {
    console.log('Loading AI Editorial Functions plugin');
    
    try {
      // Register plugin capabilities
      globalRegistry.register({
        id: 'ai-editorial-functions',
        name: 'AI Editorial Functions',
        version: '1.0.0',
        capabilities: ['ai-editing', 'grammar-check', 'style-improvement', 'content-generation']
      });

      // Setup function paths relative to vault
      const vaultPath = (this.app.vault.adapter as any).basePath || '';
      const functionsPath = path.join(vaultPath, 'editorial-functions');
      const defaultFunctionsPath = path.join(vaultPath, '.editorial-functions');

      // Initialize lifecycle manager with plugin-specific configuration
      await lifecycleManager.initialize({
        watchPaths: [functionsPath, defaultFunctionsPath],
        fileExtensions: ['.md', '.xml'],
        hotReloadEnabled: true,
        autoLoad: true,
        autoReload: true,
        validateOnLoad: true,
        debugMode: false,
        maxConcurrentExecutions: 5,
        executionTimeout: 10000, // 10 seconds
        memoryLimit: 50 * 1024 * 1024 // 50MB
      });

      // Setup event listeners for plugin integration
      this.setupEventListeners();

      // Setup commands and UI
      this.setupCommands();

      this.isInitialized = true;
      console.log('[AIEditorialFunctions] Plugin loaded successfully');

      // Emit plugin ready event
      globalEventBus.emit('ai-editorial-functions-ready', {
        functionsLoaded: functionRegistry.getStats().activeFunctions,
        timestamp: new Date()
      }, 'ai-editorial-functions');

    } catch (error) {
      console.error('[AIEditorialFunctions] Failed to initialize:', error);
      
      // Show error to user
      this.showError('Failed to initialize AI Editorial Functions plugin', error as Error);
    }
  }

  async onunload() {
    console.log('Unloading AI Editorial Functions plugin');
    
    try {
      // Shutdown lifecycle manager
      if (this.isInitialized) {
        await lifecycleManager.shutdown();
      }

      // Unregister plugin
      globalRegistry.unregister('ai-editorial-functions');

      console.log('[AIEditorialFunctions] Plugin unloaded successfully');
    } catch (error) {
      console.error('[AIEditorialFunctions] Error during unload:', error);
    }
  }

  private setupEventListeners(): void {
    // Listen for edit requests from other plugins
    globalEventBus.on('edit-request', (event) => {
      this.handleEditRequest(event);
    });

    // Listen for function execution requests
    globalEventBus.on('function-execute-request', (event) => {
      this.handleFunctionExecuteRequest(event);
    });

    // Listen for function list requests
    globalEventBus.on('function-list-request', (event) => {
      this.handleFunctionListRequest(event);
    });

    // Listen for lifecycle events for debugging
    globalEventBus.on('lifecycle-event', (event) => {
      if (event.source === 'lifecycle-manager') {
        console.log('[AIEditorialFunctions] Lifecycle event:', event.payload);
      }
    });

    // Listen for function registry events
    globalEventBus.on('function-registry-event', (event) => {
      this.handleRegistryEvent(event);
    });
  }

  private setupCommands(): void {
    // Command to list all available functions
    this.addCommand({
      id: 'list-editorial-functions',
      name: 'List Available Editorial Functions',
      callback: () => {
        this.showFunctionsList();
      }
    });

    // Command to reload all functions
    this.addCommand({
      id: 'reload-editorial-functions',
      name: 'Reload All Editorial Functions',
      callback: async () => {
        await this.reloadAllFunctions();
      }
    });

    // Command to show function registry status
    this.addCommand({
      id: 'show-registry-status',
      name: 'Show Registry Status',
      callback: () => {
        this.showRegistryStatus();
      }
    });

    // Command to execute a function on selected text
    this.addCommand({
      id: 'execute-function-on-selection',
      name: 'Execute Editorial Function on Selection',
      editorCallback: (editor) => {
        this.showFunctionExecuteModal(editor);
      }
    });
  }

  private async handleEditRequest(event: any): Promise<void> {
    try {
      const { functionId, text, options } = event.payload;
      
      if (!functionId) {
        console.warn('[AIEditorialFunctions] Edit request missing functionId');
        return;
      }

      // Execute the requested function
      const result = await functionRegistry.executeFunction(functionId, text, options);
      
      // Emit result back
      globalEventBus.emit('edit-result', {
        requestId: event.payload.requestId,
        functionId,
        result,
        timestamp: new Date()
      }, 'ai-editorial-functions');

    } catch (error) {
      console.error('[AIEditorialFunctions] Error handling edit request:', error);
      
      globalEventBus.emit('edit-error', {
        requestId: event.payload.requestId,
        error: (error as Error).message,
        timestamp: new Date()
      }, 'ai-editorial-functions');
    }
  }

  private async handleFunctionExecuteRequest(event: any): Promise<void> {
    const { functionId, input, options, responseChannel } = event.payload;
    
    try {
      const result = await functionRegistry.executeFunction(functionId, input, options);
      
      if (responseChannel) {
        globalEventBus.emit(responseChannel, {
          success: true,
          result,
          timestamp: new Date()
        }, 'ai-editorial-functions');
      }
    } catch (error) {
      if (responseChannel) {
        globalEventBus.emit(responseChannel, {
          success: false,
          error: (error as Error).message,
          timestamp: new Date()
        }, 'ai-editorial-functions');
      }
    }
  }

  private handleFunctionListRequest(event: any): void {
    const { filter, responseChannel } = event.payload;
    
    try {
      const functions = functionRegistry.listFunctions(filter);
      const functionList = functions.map(func => ({
        id: func.id,
        name: func.name,
        description: func.description,
        category: func.category,
        capabilities: func.capabilities,
        enabled: func.enabled
      }));

      if (responseChannel) {
        globalEventBus.emit(responseChannel, {
          success: true,
          functions: functionList,
          timestamp: new Date()
        }, 'ai-editorial-functions');
      }
    } catch (error) {
      if (responseChannel) {
        globalEventBus.emit(responseChannel, {
          success: false,
          error: (error as Error).message,
          timestamp: new Date()
        }, 'ai-editorial-functions');
      }
    }
  }

  private handleRegistryEvent(event: any): void {
    const registryEvent = event.payload;
    
    switch (registryEvent.type) {
      case 'function-loaded':
        console.log(`[AIEditorialFunctions] Function loaded: ${registryEvent.functionId}`);
        // Could show notification to user
        break;
      case 'function-error':
        console.error(`[AIEditorialFunctions] Function error: ${registryEvent.functionId}`, registryEvent.metadata);
        this.showError(`Error in function ${registryEvent.functionId}`, new Error(registryEvent.metadata?.error || 'Unknown error'));
        break;
    }
  }

  private showFunctionsList(): void {
    const functions = functionRegistry.listFunctions();
    const stats = functionRegistry.getStats();
    
    const message = `
**AI Editorial Functions Status**

**Registry Stats:**
- Total Functions: ${stats.totalFunctions}
- Active Functions: ${stats.activeFunctions}
- Memory Usage: ${(stats.memoryUsage / 1024).toFixed(2)}KB
- Last Update: ${stats.lastUpdate.toLocaleString()}

**Available Functions:**
${functions.map(func => 
  `- **${func.name}** (${func.id})
    - Category: ${func.category}
    - Version: ${func.version}
    - Status: ${func.enabled ? '✅ Enabled' : '❌ Disabled'}
    - Capabilities: ${func.capabilities.join(', ')}`
).join('\n')}
    `;

    // Show in a modal or notice (simplified implementation)
    console.log(message);
    // In a real implementation, you'd show this in a proper modal
  }

  private async reloadAllFunctions(): Promise<void> {
    try {
      console.log('[AIEditorialFunctions] Reloading all functions...');
      
      // This would trigger a full reload through the lifecycle manager
      // For now, we'll emit an event that the lifecycle manager can handle
      globalEventBus.emit('function-lifecycle', {
        type: 'reload-all',
        timestamp: new Date()
      }, 'ai-editorial-functions');
      
      // Show success message
      console.log('[AIEditorialFunctions] Functions reloaded successfully');
      
    } catch (error) {
      console.error('[AIEditorialFunctions] Error reloading functions:', error);
      this.showError('Failed to reload functions', error as Error);
    }
  }

  private showRegistryStatus(): void {
    const stats = functionRegistry.getStats();
    const lifecycleStatus = lifecycleManager.getStatus();
    
    const status = `
**AI Editorial Functions Status**

**Registry:**
- Functions Loaded: ${stats.activeFunctions}
- Total Functions: ${stats.totalFunctions}
- Memory Usage: ${(stats.memoryUsage / 1024).toFixed(2)}KB

**Lifecycle Manager:**
- Initialized: ${lifecycleStatus.initialized ? '✅' : '❌'}
- Functions in Error: ${lifecycleStatus.functionsInError}
- Load Queue: ${lifecycleStatus.loadQueueSize}
- Execution Queue: ${lifecycleStatus.executionQueueSize}
- File Watcher: ${lifecycleStatus.watcherActive ? '✅ Active' : '❌ Inactive'}
    `;

    console.log(status);
    // In a real implementation, show in a proper modal
  }

  private showFunctionExecuteModal(editor: any): void {
    const selection = editor.getSelection();
    if (!selection) {
      console.warn('[AIEditorialFunctions] No text selected');
      return;
    }

    // This would show a modal to select function and execute
    // For now, just log the available options
    const functions = functionRegistry.listFunctions({ enabled: true });
    console.log('[AIEditorialFunctions] Available functions for execution:', functions.map(f => f.name));
    
    // In a real implementation, you'd show a modal with function selection
  }

  private showError(message: string, error: Error): void {
    console.error(`[AIEditorialFunctions] ${message}:`, error);
    // In a real implementation, you'd show a proper error notification to the user
  }
}