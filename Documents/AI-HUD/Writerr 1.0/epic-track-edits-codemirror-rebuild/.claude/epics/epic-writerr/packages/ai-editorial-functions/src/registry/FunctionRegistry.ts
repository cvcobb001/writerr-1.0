/**
 * @fileoverview Core registry for managing AI editorial functions
 */

import { EventData, globalEventBus } from '@writerr/shared';
import {
  FunctionDefinition,
  FunctionMetadata,
  FunctionExecution,
  FunctionVersion,
  RegistryStats,
  DependencyGraph,
  FunctionRegistryEvent,
  RegistryConfig,
  FunctionLoadError,
  FunctionExecutionError,
  ValidationResult
} from '../types';

export class FunctionRegistry {
  private functions = new Map<string, FunctionDefinition>();
  private versions = new Map<string, FunctionVersion[]>();
  private executions = new Map<string, FunctionExecution>();
  private dependencyGraph: DependencyGraph = {};
  private config: RegistryConfig;
  private stats: RegistryStats;

  constructor(config: Partial<RegistryConfig> = {}) {
    this.config = {
      watchPaths: ['functions', 'editorial-functions'],
      fileExtensions: ['.md', '.xml'],
      hotReloadEnabled: true,
      validationEnabled: true,
      maxConcurrentExecutions: 10,
      executionTimeout: 5000,
      memoryLimit: 100 * 1024 * 1024, // 100MB
      autoCleanup: true,
      debugMode: false,
      ...config
    };

    this.stats = {
      totalFunctions: 0,
      loadedFunctions: 0,
      activeFunctions: 0,
      errorFunctions: 0,
      memoryUsage: 0,
      lastUpdate: new Date()
    };

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    globalEventBus.on('function-registry', (event: EventData) => {
      this.handleRegistryEvent(event);
    });
  }

  private handleRegistryEvent(event: EventData): void {
    const { type, payload } = event;
    
    switch (type) {
      case 'function-load-request':
        this.loadFunction(payload.filePath);
        break;
      case 'function-unload-request':
        this.unloadFunction(payload.functionId);
        break;
      case 'function-execute-request':
        this.executeFunction(payload.functionId, payload.input, payload.options);
        break;
    }
  }

  /**
   * Register a new function in the registry
   */
  registerFunction(definition: FunctionDefinition): void {
    try {
      // Validate the function definition
      const validationResult = this.validateFunction(definition);
      if (!validationResult.isValid) {
        throw new FunctionLoadError(
          `Function validation failed: ${validationResult.errors.join(', ')}`,
          definition.id,
          definition.filePath
        );
      }

      // Check for dependency conflicts
      this.resolveDependencies(definition);

      // Store the function
      this.functions.set(definition.id, definition);
      this.addVersion(definition);
      this.updateDependencyGraph(definition);

      // Update stats
      this.updateStats();

      // Emit event
      this.emitEvent('function-loaded', definition.id, {
        function: definition,
        timestamp: new Date()
      });

      if (this.config.debugMode) {
        console.log(`[FunctionRegistry] Registered function: ${definition.id}`);
      }
    } catch (error) {
      this.handleRegistrationError(definition, error as Error);
    }
  }

  /**
   * Unregister a function from the registry
   */
  unregisterFunction(functionId: string): boolean {
    const functionDef = this.functions.get(functionId);
    if (!functionDef) {
      return false;
    }

    try {
      // Cancel any running executions
      this.cancelFunctionExecutions(functionId);

      // Remove from dependency graph
      this.removeFunctionFromDependencyGraph(functionId);

      // Remove from registry
      this.functions.delete(functionId);

      // Keep versions for potential rollback
      // this.versions.delete(functionId); // Keep for history

      // Update stats
      this.updateStats();

      // Emit event
      this.emitEvent('function-unloaded', functionId, {
        function: functionDef,
        timestamp: new Date()
      });

      if (this.config.debugMode) {
        console.log(`[FunctionRegistry] Unregistered function: ${functionId}`);
      }

      return true;
    } catch (error) {
      console.error(`[FunctionRegistry] Error unregistering function ${functionId}:`, error);
      return false;
    }
  }

  /**
   * Get a function by ID
   */
  getFunction(functionId: string): FunctionDefinition | null {
    return this.functions.get(functionId) || null;
  }

  /**
   * List all registered functions
   */
  listFunctions(filter?: Partial<FunctionMetadata>): FunctionDefinition[] {
    let functions = Array.from(this.functions.values());

    if (filter) {
      functions = functions.filter(func => {
        return Object.entries(filter).every(([key, value]) => {
          if (key === 'capabilities' && Array.isArray(value)) {
            return value.some(cap => func.capabilities.includes(cap));
          }
          return (func as any)[key] === value;
        });
      });
    }

    return functions.sort((a, b) => {
      if (a.priority !== undefined && b.priority !== undefined) {
        return b.priority - a.priority;
      }
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Execute a function
   */
  async executeFunction(
    functionId: string, 
    input: string, 
    options: any = {}
  ): Promise<FunctionExecution> {
    const functionDef = this.functions.get(functionId);
    if (!functionDef) {
      throw new FunctionExecutionError(
        `Function not found: ${functionId}`,
        functionId,
        ''
      );
    }

    if (!functionDef.enabled) {
      throw new FunctionExecutionError(
        `Function is disabled: ${functionId}`,
        functionId,
        ''
      );
    }

    const executionId = `${functionId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const execution: FunctionExecution = {
      id: executionId,
      functionId,
      input,
      status: 'pending',
      startTime: new Date()
    };

    this.executions.set(executionId, execution);

    try {
      // Check concurrent execution limits
      const runningExecutions = Array.from(this.executions.values())
        .filter(e => e.status === 'running').length;
      
      if (runningExecutions >= this.config.maxConcurrentExecutions) {
        throw new FunctionExecutionError(
          `Maximum concurrent executions reached: ${this.config.maxConcurrentExecutions}`,
          functionId,
          executionId
        );
      }

      // Update execution status
      execution.status = 'running';
      this.executions.set(executionId, execution);

      // Execute the function with timeout
      const result = await this.executeWithTimeout(functionDef, input, options);
      
      // Update execution result
      execution.status = 'completed';
      execution.output = result.output;
      execution.confidence = result.confidence;
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();

      this.executions.set(executionId, execution);

      // Emit event
      this.emitEvent('function-executed', functionId, {
        executionId,
        result,
        timestamp: new Date()
      });

      return execution;
    } catch (error) {
      execution.status = 'failed';
      execution.error = (error as Error).message;
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
      this.executions.set(executionId, execution);

      throw error;
    }
  }

  /**
   * Get function versions for rollback
   */
  getFunctionVersions(functionId: string): FunctionVersion[] {
    return this.versions.get(functionId) || [];
  }

  /**
   * Rollback to a specific version
   */
  rollbackToVersion(functionId: string, version: string, reason: string): boolean {
    const versions = this.versions.get(functionId);
    if (!versions) {
      return false;
    }

    const targetVersion = versions.find(v => v.version === version);
    if (!targetVersion) {
      return false;
    }

    try {
      // Mark current version as inactive
      const currentVersions = versions.filter(v => v.isActive);
      currentVersions.forEach(v => {
        v.isActive = false;
        v.rollbackReason = reason;
      });

      // Activate target version
      targetVersion.isActive = true;
      
      // Update the function in registry
      this.functions.set(functionId, targetVersion.definition);

      // Emit event
      this.emitEvent('function-updated', functionId, {
        rollback: true,
        version,
        reason,
        timestamp: new Date()
      });

      return true;
    } catch (error) {
      console.error(`[FunctionRegistry] Error rolling back function ${functionId}:`, error);
      return false;
    }
  }

  /**
   * Get registry statistics
   */
  getStats(): RegistryStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Get dependency graph
   */
  getDependencyGraph(): DependencyGraph {
    return { ...this.dependencyGraph };
  }

  /**
   * Cleanup old executions and optimize memory
   */
  cleanup(): void {
    if (!this.config.autoCleanup) {
      return;
    }

    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    const toDelete: string[] = [];

    this.executions.forEach((execution, id) => {
      if (execution.endTime && execution.endTime.getTime() < cutoff) {
        toDelete.push(id);
      }
    });

    toDelete.forEach(id => this.executions.delete(id));

    if (this.config.debugMode && toDelete.length > 0) {
      console.log(`[FunctionRegistry] Cleaned up ${toDelete.length} old executions`);
    }
  }

  // Private helper methods
  private validateFunction(definition: FunctionDefinition): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!definition.id) errors.push('Function ID is required');
    if (!definition.name) errors.push('Function name is required');
    if (!definition.version) errors.push('Function version is required');
    if (!definition.category) errors.push('Function category is required');
    if (!definition.parsedContent) errors.push('Function content is required');

    // Capability validation
    if (!definition.capabilities || definition.capabilities.length === 0) {
      warnings.push('Function has no declared capabilities');
    }

    // Schema validation
    if (definition.constraints?.requiredSchemas && definition.constraints.requiredSchemas.length > 0) {
      if (!definition.parsedContent.schema) {
        errors.push('Function requires schema but none provided');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private async executeWithTimeout(
    functionDef: FunctionDefinition,
    input: string,
    options: any
  ): Promise<{ output: string; confidence?: number }> {
    const timeout = functionDef.constraints?.executionTimeout || this.config.executionTimeout;
    
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new FunctionExecutionError(
          `Function execution timeout: ${timeout}ms`,
          functionDef.id,
          ''
        ));
      }, timeout);

      // This would be implemented to actually execute the function
      // For now, this is a placeholder that simulates execution
      setTimeout(() => {
        clearTimeout(timer);
        resolve({
          output: `Processed: ${input.substring(0, 100)}...`,
          confidence: 0.85
        });
      }, 100);
    });
  }

  private resolveDependencies(definition: FunctionDefinition): void {
    // Check if all dependencies are available
    for (const depId of definition.dependencies) {
      if (!this.functions.has(depId)) {
        throw new FunctionLoadError(
          `Missing dependency: ${depId}`,
          definition.id,
          definition.filePath
        );
      }
    }

    // Check for circular dependencies
    if (this.hasCircularDependency(definition.id, definition.dependencies)) {
      throw new FunctionLoadError(
        'Circular dependency detected',
        definition.id,
        definition.filePath
      );
    }
  }

  private hasCircularDependency(functionId: string, dependencies: string[], visited = new Set<string>()): boolean {
    if (visited.has(functionId)) {
      return true;
    }

    visited.add(functionId);

    for (const depId of dependencies) {
      const depFunction = this.functions.get(depId);
      if (depFunction && this.hasCircularDependency(depId, depFunction.dependencies, visited)) {
        return true;
      }
    }

    visited.delete(functionId);
    return false;
  }

  private addVersion(definition: FunctionDefinition): void {
    if (!this.versions.has(definition.id)) {
      this.versions.set(definition.id, []);
    }

    const versions = this.versions.get(definition.id)!;
    
    // Mark previous versions as inactive
    versions.forEach(v => v.isActive = false);

    // Add new version
    versions.push({
      version: definition.version,
      definition: { ...definition },
      timestamp: new Date(),
      isActive: true
    });

    // Keep only last 10 versions
    if (versions.length > 10) {
      versions.splice(0, versions.length - 10);
    }
  }

  private updateDependencyGraph(definition: FunctionDefinition): void {
    this.dependencyGraph[definition.id] = {
      dependencies: definition.dependencies,
      dependents: [],
      resolved: true,
      circular: false
    };

    // Update dependents
    for (const depId of definition.dependencies) {
      if (this.dependencyGraph[depId]) {
        this.dependencyGraph[depId].dependents.push(definition.id);
      }
    }
  }

  private removeFunctionFromDependencyGraph(functionId: string): void {
    // Remove from dependents of dependencies
    const entry = this.dependencyGraph[functionId];
    if (entry) {
      for (const depId of entry.dependencies) {
        const depEntry = this.dependencyGraph[depId];
        if (depEntry) {
          depEntry.dependents = depEntry.dependents.filter(id => id !== functionId);
        }
      }
    }

    delete this.dependencyGraph[functionId];
  }

  private cancelFunctionExecutions(functionId: string): void {
    Array.from(this.executions.values())
      .filter(e => e.functionId === functionId && e.status === 'running')
      .forEach(execution => {
        execution.status = 'failed';
        execution.error = 'Function unloaded';
        execution.endTime = new Date();
        execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
        this.executions.set(execution.id, execution);
      });
  }

  private updateStats(): void {
    const functions = Array.from(this.functions.values());
    
    this.stats.totalFunctions = functions.length;
    this.stats.loadedFunctions = functions.length;
    this.stats.activeFunctions = functions.filter(f => f.enabled).length;
    this.stats.errorFunctions = 0; // Would track functions with errors
    this.stats.memoryUsage = this.estimateMemoryUsage();
    this.stats.lastUpdate = new Date();
  }

  private estimateMemoryUsage(): number {
    // Rough estimation of memory usage
    let usage = 0;
    this.functions.forEach(func => {
      usage += JSON.stringify(func).length * 2; // Rough byte estimation
    });
    this.executions.forEach(exec => {
      usage += JSON.stringify(exec).length * 2;
    });
    return usage;
  }

  private handleRegistrationError(definition: FunctionDefinition, error: Error): void {
    console.error(`[FunctionRegistry] Error registering function ${definition.id}:`, error);
    
    this.emitEvent('function-error', definition.id, {
      error: error.message,
      filePath: definition.filePath,
      timestamp: new Date()
    });
  }

  private loadFunction(filePath: string): void {
    // This would trigger the loader to load a function from a file
    globalEventBus.emit('function-load', { filePath }, 'function-registry');
  }

  private unloadFunction(functionId: string): void {
    this.unregisterFunction(functionId);
  }

  private emitEvent(type: string, functionId: string, metadata?: any): void {
    const event: FunctionRegistryEvent = {
      type: type as any,
      functionId,
      metadata,
      timestamp: new Date()
    };

    globalEventBus.emit('function-registry-event', event, 'function-registry');
  }
}

// Export singleton instance
export const functionRegistry = new FunctionRegistry();