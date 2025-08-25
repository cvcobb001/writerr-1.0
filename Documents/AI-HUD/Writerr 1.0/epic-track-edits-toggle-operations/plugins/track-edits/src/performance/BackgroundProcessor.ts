/**
 * Background Processing System for Track Edits
 * Handles heavy operations without blocking the UI thread
 * Supports Web Workers, idle callbacks, and priority queuing
 */

import { Change, ChangeCluster, BulkOperation, FilterOptions } from '../types';
import { globalEventBus } from '@writerr/shared';

export interface BackgroundTask<T = any> {
  id: string;
  type: TaskType;
  priority: TaskPriority;
  data: T;
  timestamp: number;
  timeout?: number;
  retryCount?: number;
  maxRetries?: number;
  dependencies?: string[];
  callback?: (result: any, error?: Error) => void;
}

export enum TaskType {
  DIFF_CALCULATION = 'diff-calculation',
  CHANGE_CLUSTERING = 'change-clustering',
  BULK_OPERATION = 'bulk-operation',
  TEXT_ANALYSIS = 'text-analysis',
  CONFLICT_DETECTION = 'conflict-detection',
  EXPORT_OPERATION = 'export-operation',
  IMPORT_OPERATION = 'import-operation',
  PERFORMANCE_ANALYSIS = 'performance-analysis',
  DATA_COMPRESSION = 'data-compression',
  SEARCH_INDEX_BUILD = 'search-index-build'
}

export enum TaskPriority {
  IMMEDIATE = 0,    // Execute as soon as possible
  HIGH = 1,         // Execute within 100ms
  NORMAL = 2,       // Execute within 1s
  LOW = 3,          // Execute when idle
  BACKGROUND = 4    // Execute in background thread
}

export enum TaskStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface TaskResult<T = any> {
  taskId: string;
  status: TaskStatus;
  result?: T;
  error?: Error;
  executionTime: number;
  memoryUsage?: number;
}

export interface ProcessorMetrics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageExecutionTime: number;
  queueSize: number;
  activeWorkers: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface ProcessorConfig {
  maxConcurrentTasks: number;
  useWebWorkers: boolean;
  workerPoolSize: number;
  idleTimeout: number;
  retryDelayMs: number;
  enableProfiling: boolean;
  memoryThreshold: number; // MB
  cpuThreshold: number;    // %
}

/**
 * Main background processing engine
 */
export class BackgroundProcessor {
  private static instance: BackgroundProcessor;
  private config: ProcessorConfig;
  private taskQueue: Map<TaskPriority, BackgroundTask[]> = new Map();
  private activeTasks: Map<string, BackgroundTask> = new Map();
  private completedTasks: Map<string, TaskResult> = new Map();
  private workerPool: Worker[] = [];
  private metrics: ProcessorMetrics = {
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    averageExecutionTime: 0,
    queueSize: 0,
    activeWorkers: 0,
    memoryUsage: 0,
    cpuUsage: 0,
  };
  private processingInterval: number | null = null;
  private metricsInterval: number | null = null;
  private isProcessing = false;

  private constructor(config?: Partial<ProcessorConfig>) {
    this.config = {
      maxConcurrentTasks: 4,
      useWebWorkers: true,
      workerPoolSize: 2,
      idleTimeout: 5000,
      retryDelayMs: 1000,
      enableProfiling: false,
      memoryThreshold: 100,
      cpuThreshold: 80,
      ...config,
    };

    this.initializeTaskQueues();
    this.initializeWorkerPool();
    this.startProcessing();
    this.startMetricsCollection();
  }

  public static getInstance(config?: Partial<ProcessorConfig>): BackgroundProcessor {
    if (!BackgroundProcessor.instance) {
      BackgroundProcessor.instance = new BackgroundProcessor(config);
    }
    return BackgroundProcessor.instance;
  }

  /**
   * Submit a task for background processing
   */
  async submitTask<T>(
    type: TaskType,
    data: any,
    priority: TaskPriority = TaskPriority.NORMAL,
    options?: {
      timeout?: number;
      maxRetries?: number;
      dependencies?: string[];
    }
  ): Promise<string> {
    const task: BackgroundTask<T> = {
      id: this.generateTaskId(),
      type,
      priority,
      data,
      timestamp: Date.now(),
      timeout: options?.timeout || 30000,
      retryCount: 0,
      maxRetries: options?.maxRetries || 3,
      dependencies: options?.dependencies || [],
    };

    // Add to appropriate priority queue
    const queue = this.taskQueue.get(priority) || [];
    queue.push(task);
    this.taskQueue.set(priority, queue);

    this.metrics.totalTasks++;
    this.metrics.queueSize++;

    globalEventBus.emit('task-queued', { task });

    return task.id;
  }

  /**
   * Submit a task with a callback
   */
  submitTaskWithCallback<T>(
    type: TaskType,
    data: any,
    callback: (result: any, error?: Error) => void,
    priority: TaskPriority = TaskPriority.NORMAL
  ): string {
    const taskId = this.generateTaskId();
    const task: BackgroundTask<T> = {
      id: taskId,
      type,
      priority,
      data,
      timestamp: Date.now(),
      callback,
      retryCount: 0,
      maxRetries: 3,
      dependencies: [],
    };

    const queue = this.taskQueue.get(priority) || [];
    queue.push(task);
    this.taskQueue.set(priority, queue);

    this.metrics.totalTasks++;
    this.metrics.queueSize++;

    return taskId;
  }

  /**
   * Get task result by ID
   */
  getTaskResult(taskId: string): TaskResult | null {
    return this.completedTasks.get(taskId) || null;
  }

  /**
   * Cancel a queued task
   */
  cancelTask(taskId: string): boolean {
    // Check if task is in queue
    for (const [priority, queue] of this.taskQueue) {
      const taskIndex = queue.findIndex(task => task.id === taskId);
      if (taskIndex >= 0) {
        queue.splice(taskIndex, 1);
        this.metrics.queueSize--;
        
        globalEventBus.emit('task-cancelled', { taskId });
        return true;
      }
    }

    // Check if task is currently running
    if (this.activeTasks.has(taskId)) {
      const task = this.activeTasks.get(taskId)!;
      this.activeTasks.delete(taskId);
      
      const result: TaskResult = {
        taskId,
        status: TaskStatus.CANCELLED,
        executionTime: Date.now() - task.timestamp,
      };
      
      this.completedTasks.set(taskId, result);
      globalEventBus.emit('task-cancelled', { taskId, result });
      
      return true;
    }

    return false;
  }

  /**
   * Get current processor metrics
   */
  getMetrics(): ProcessorMetrics {
    return { ...this.metrics };
  }

  /**
   * Configure the processor
   */
  configure(config: Partial<ProcessorConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Recreate worker pool if needed
    if (config.workerPoolSize && config.workerPoolSize !== this.workerPool.length) {
      this.recreateWorkerPool();
    }
  }

  /**
   * Clear all queued tasks
   */
  clearQueue(): void {
    for (const queue of this.taskQueue.values()) {
      queue.length = 0;
    }
    this.metrics.queueSize = 0;
  }

  /**
   * Pause processing
   */
  pause(): void {
    this.isProcessing = false;
  }

  /**
   * Resume processing
   */
  resume(): void {
    this.isProcessing = true;
  }

  /**
   * Shutdown the processor
   */
  shutdown(): void {
    this.pause();
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    
    // Terminate workers
    this.workerPool.forEach(worker => worker.terminate());
    this.workerPool = [];
  }

  // Private methods

  private initializeTaskQueues(): void {
    // Initialize queues for each priority level
    Object.values(TaskPriority).forEach(priority => {
      if (typeof priority === 'number') {
        this.taskQueue.set(priority, []);
      }
    });
  }

  private initializeWorkerPool(): void {
    if (!this.config.useWebWorkers || typeof Worker === 'undefined') {
      return;
    }

    // Create worker pool
    for (let i = 0; i < this.config.workerPoolSize; i++) {
      try {
        const worker = this.createWorker();
        this.workerPool.push(worker);
      } catch (error) {
        console.warn('Failed to create worker:', error);
        this.config.useWebWorkers = false;
        break;
      }
    }
  }

  private createWorker(): Worker {
    // Create inline worker for processing tasks
    const workerCode = `
      self.onmessage = function(e) {
        const { taskId, type, data } = e.data;
        
        try {
          let result;
          
          switch (type) {
            case 'diff-calculation':
              result = calculateDiff(data);
              break;
            case 'change-clustering':
              result = performClustering(data);
              break;
            case 'bulk-operation':
              result = processBulkOperation(data);
              break;
            case 'text-analysis':
              result = analyzeText(data);
              break;
            default:
              throw new Error('Unknown task type: ' + type);
          }
          
          self.postMessage({ taskId, success: true, result });
        } catch (error) {
          self.postMessage({ taskId, success: false, error: error.message });
        }
      };
      
      function calculateDiff(data) {
        // Simplified diff calculation
        const { before, after } = data;
        return {
          insertions: after.length - before.length,
          deletions: before.length - after.length,
          changes: Math.abs(before.length - after.length)
        };
      }
      
      function performClustering(data) {
        // Simplified clustering
        const { changes } = data;
        const clusters = [];
        
        // Group by category
        const groups = {};
        changes.forEach(change => {
          if (!groups[change.category]) {
            groups[change.category] = [];
          }
          groups[change.category].push(change);
        });
        
        Object.entries(groups).forEach(([category, items]) => {
          clusters.push({
            id: 'cluster_' + category,
            category,
            changes: items,
            confidence: items.reduce((acc, item) => acc + item.confidence, 0) / items.length
          });
        });
        
        return clusters;
      }
      
      function processBulkOperation(data) {
        // Simplified bulk operation
        const { operation, changeIds } = data;
        return {
          processed: changeIds.length,
          operation,
          success: true
        };
      }
      
      function analyzeText(data) {
        // Simplified text analysis
        const { text } = data;
        return {
          wordCount: text.split(/\\s+/).length,
          characterCount: text.length,
          sentences: text.split(/[.!?]+/).length
        };
      }
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);

    worker.onmessage = (e) => {
      this.handleWorkerMessage(e.data);
    };

    worker.onerror = (error) => {
      console.error('Worker error:', error);
    };

    return worker;
  }

  private recreateWorkerPool(): void {
    // Terminate existing workers
    this.workerPool.forEach(worker => worker.terminate());
    this.workerPool = [];
    
    // Create new worker pool
    this.initializeWorkerPool();
  }

  private startProcessing(): void {
    this.isProcessing = true;
    
    this.processingInterval = setInterval(() => {
      if (this.isProcessing) {
        this.processNextTask();
      }
    }, 10) as any; // Check every 10ms
  }

  private processNextTask(): void {
    if (this.activeTasks.size >= this.config.maxConcurrentTasks) {
      return;
    }

    // Find next task by priority
    const task = this.getNextTask();
    if (!task) {
      return;
    }

    // Check dependencies
    if (!this.areDependenciesMet(task)) {
      return;
    }

    // Execute task
    this.executeTask(task);
  }

  private getNextTask(): BackgroundTask | null {
    // Check queues in priority order
    for (let priority = TaskPriority.IMMEDIATE; priority <= TaskPriority.BACKGROUND; priority++) {
      const queue = this.taskQueue.get(priority);
      if (queue && queue.length > 0) {
        const task = queue.shift()!;
        this.metrics.queueSize--;
        return task;
      }
    }
    
    return null;
  }

  private areDependenciesMet(task: BackgroundTask): boolean {
    if (!task.dependencies || task.dependencies.length === 0) {
      return true;
    }

    return task.dependencies.every(depId => {
      const result = this.completedTasks.get(depId);
      return result && result.status === TaskStatus.COMPLETED;
    });
  }

  private async executeTask(task: BackgroundTask): Promise<void> {
    const startTime = Date.now();
    this.activeTasks.set(task.id, task);
    this.metrics.activeWorkers++;

    globalEventBus.emit('task-started', { task });

    try {
      let result: any;

      if (this.config.useWebWorkers && this.canUseWorker(task.type)) {
        result = await this.executeInWorker(task);
      } else {
        result = await this.executeInMainThread(task);
      }

      const executionTime = Date.now() - startTime;
      const taskResult: TaskResult = {
        taskId: task.id,
        status: TaskStatus.COMPLETED,
        result,
        executionTime,
      };

      this.completeTask(task, taskResult);

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const taskResult: TaskResult = {
        taskId: task.id,
        status: TaskStatus.FAILED,
        error: error as Error,
        executionTime,
      };

      this.handleTaskFailure(task, taskResult);
    }

    this.activeTasks.delete(task.id);
    this.metrics.activeWorkers--;
  }

  private canUseWorker(taskType: TaskType): boolean {
    // Some tasks need access to DOM or specific APIs
    const mainThreadTasks = [
      TaskType.EXPORT_OPERATION,
      TaskType.IMPORT_OPERATION,
    ];

    return !mainThreadTasks.includes(taskType);
  }

  private async executeInWorker(task: BackgroundTask): Promise<any> {
    return new Promise((resolve, reject) => {
      const worker = this.getAvailableWorker();
      if (!worker) {
        reject(new Error('No available workers'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Task timeout'));
      }, task.timeout || 30000);

      const messageHandler = (e: MessageEvent) => {
        const { taskId, success, result, error } = e.data;
        if (taskId === task.id) {
          clearTimeout(timeout);
          worker.removeEventListener('message', messageHandler);
          
          if (success) {
            resolve(result);
          } else {
            reject(new Error(error));
          }
        }
      };

      worker.addEventListener('message', messageHandler);
      worker.postMessage({
        taskId: task.id,
        type: task.type,
        data: task.data,
      });
    });
  }

  private async executeInMainThread(task: BackgroundTask): Promise<any> {
    // Execute task in main thread using requestIdleCallback when possible
    return new Promise((resolve, reject) => {
      const executor = () => {
        try {
          const result = this.processTaskData(task.type, task.data);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      if (task.priority >= TaskPriority.LOW && 'requestIdleCallback' in window) {
        requestIdleCallback(executor, { timeout: 1000 });
      } else {
        // Use setTimeout to avoid blocking
        setTimeout(executor, 0);
      }
    });
  }

  private processTaskData(type: TaskType, data: any): any {
    // Process different task types
    switch (type) {
      case TaskType.DIFF_CALCULATION:
        return this.calculateDiff(data);
      case TaskType.CHANGE_CLUSTERING:
        return this.performClustering(data);
      case TaskType.BULK_OPERATION:
        return this.processBulkOperation(data);
      case TaskType.TEXT_ANALYSIS:
        return this.analyzeText(data);
      case TaskType.CONFLICT_DETECTION:
        return this.detectConflicts(data);
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
  }

  private getAvailableWorker(): Worker | null {
    // Simple round-robin selection
    if (this.workerPool.length === 0) return null;
    return this.workerPool[Math.floor(Math.random() * this.workerPool.length)];
  }

  private completeTask(task: BackgroundTask, result: TaskResult): void {
    this.completedTasks.set(task.id, result);
    this.metrics.completedTasks++;
    this.updateAverageExecutionTime(result.executionTime);

    if (task.callback) {
      task.callback(result.result);
    }

    globalEventBus.emit('task-completed', { task, result });
  }

  private handleTaskFailure(task: BackgroundTask, result: TaskResult): void {
    if (task.retryCount! < task.maxRetries!) {
      // Retry the task
      task.retryCount = (task.retryCount || 0) + 1;
      
      setTimeout(() => {
        const queue = this.taskQueue.get(task.priority) || [];
        queue.unshift(task); // Add to front of queue
        this.taskQueue.set(task.priority, queue);
        this.metrics.queueSize++;
      }, this.config.retryDelayMs);
      
    } else {
      // Task has exceeded retry limit
      this.completedTasks.set(task.id, result);
      this.metrics.failedTasks++;
      
      if (task.callback) {
        task.callback(null, result.error);
      }
      
      globalEventBus.emit('task-failed', { task, result });
    }
  }

  private handleWorkerMessage(data: any): void {
    // Handled in executeInWorker method
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.updateMetrics();
    }, 1000) as any;
  }

  private updateMetrics(): void {
    this.metrics.queueSize = Array.from(this.taskQueue.values())
      .reduce((total, queue) => total + queue.length, 0);
    
    // Estimate memory usage
    this.metrics.memoryUsage = this.estimateMemoryUsage();
    
    // CPU usage would need platform-specific implementation
    this.metrics.cpuUsage = 0;
  }

  private estimateMemoryUsage(): number {
    // Rough estimation based on active tasks and completed results
    const activeTasksSize = this.activeTasks.size * 1000; // 1KB per task estimate
    const completedTasksSize = this.completedTasks.size * 500; // 500B per result estimate
    const queueSize = this.metrics.queueSize * 800; // 800B per queued task estimate
    
    return activeTasksSize + completedTasksSize + queueSize;
  }

  private updateAverageExecutionTime(executionTime: number): void {
    if (this.metrics.completedTasks === 1) {
      this.metrics.averageExecutionTime = executionTime;
    } else {
      this.metrics.averageExecutionTime = 
        (this.metrics.averageExecutionTime * (this.metrics.completedTasks - 1) + executionTime) / 
        this.metrics.completedTasks;
    }
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Task-specific processing methods

  private calculateDiff(data: any): any {
    const { before, after } = data;
    // Simplified diff - in production would use more sophisticated algorithm
    return {
      insertions: after.length - before.length,
      deletions: Math.max(0, before.length - after.length),
      changes: Math.abs(before.length - after.length),
    };
  }

  private performClustering(data: any): any {
    const { changes } = data;
    // Simplified clustering - use existing clustering engine in production
    const clusters = new Map();
    
    changes.forEach((change: Change) => {
      const key = change.category;
      if (!clusters.has(key)) {
        clusters.set(key, []);
      }
      clusters.get(key).push(change);
    });
    
    return Array.from(clusters.entries()).map(([category, items]) => ({
      id: `cluster_${category}_${Date.now()}`,
      category,
      changes: items,
      confidence: items.reduce((acc: number, item: Change) => acc + item.confidence, 0) / items.length,
    }));
  }

  private processBulkOperation(data: any): any {
    const { operation, changeIds } = data;
    // Simplified bulk processing
    return {
      processed: changeIds.length,
      operation: operation.type,
      success: true,
      timestamp: Date.now(),
    };
  }

  private analyzeText(data: any): any {
    const { text } = data;
    return {
      wordCount: text.split(/\s+/).filter((word: string) => word.length > 0).length,
      characterCount: text.length,
      paragraphs: text.split(/\n\s*\n/).length,
      sentences: text.split(/[.!?]+/).filter((s: string) => s.trim().length > 0).length,
    };
  }

  private detectConflicts(data: any): any {
    const { changes } = data;
    const conflicts = [];
    
    // Simple conflict detection
    for (let i = 0; i < changes.length; i++) {
      for (let j = i + 1; j < changes.length; j++) {
        const change1 = changes[i];
        const change2 = changes[j];
        
        if (this.positionsOverlap(change1.position, change2.position)) {
          conflicts.push({
            id: `conflict_${Date.now()}_${i}_${j}`,
            changes: [change1, change2],
            type: 'position-overlap',
            severity: 'medium',
          });
        }
      }
    }
    
    return conflicts;
  }

  private positionsOverlap(pos1: any, pos2: any): boolean {
    return !(pos1.end <= pos2.start || pos2.end <= pos1.start);
  }
}

// Export singleton instance
export const backgroundProcessor = BackgroundProcessor.getInstance();

// Convenience functions
export function submitBackgroundTask<T = any>(
  type: TaskType,
  data: any,
  priority: TaskPriority = TaskPriority.NORMAL
): Promise<string> {
  return backgroundProcessor.submitTask<T>(type, data, priority);
}

export function submitWithCallback<T = any>(
  type: TaskType,
  data: any,
  callback: (result: any, error?: Error) => void,
  priority: TaskPriority = TaskPriority.NORMAL
): string {
  return backgroundProcessor.submitTaskWithCallback<T>(type, data, callback, priority);
}