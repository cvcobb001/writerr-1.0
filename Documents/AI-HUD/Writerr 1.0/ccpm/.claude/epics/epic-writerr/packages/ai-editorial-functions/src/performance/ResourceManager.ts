/**
 * @fileoverview Resource Manager - Handles resource allocation, quotas, and throttling
 */

import { EventData, globalEventBus } from '@writerr/shared';
import {
  ResourceManager as IResourceManager,
  ResourceManagementConfig,
  ResourceUsage,
  ResourceQuotas,
  ResourcePool,
  ResourceAllocation,
  PerformanceEvent,
  PerformanceEventType,
  ResourceExhaustionError,
  PerformanceError
} from './types';
import { FunctionExecution } from '../types';

export class ResourceManager {
  private managers = new Map<string, IResourceManager>();
  private globalPools = new Map<string, ResourcePool>();
  private currentUsage = new Map<string, ResourceUsage>();
  private allocationHistory = new Map<string, ResourceAllocation[]>();
  private throttlingState = new Map<string, ThrottleState>();
  private monitoringTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;
  private isInitialized = false;

  constructor() {
    this.setupEventListeners();
    this.initializeGlobalPools();
    this.startMonitoringLoop();
  }

  /**
   * Initialize resource management
   */
  initialize(): void {
    this.isInitialized = true;
    console.log('[ResourceManager] Initialized successfully');
  }

  /**
   * Configure resource management for a function
   */
  configureFunction(functionId: string, config: Partial<ResourceManagementConfig>): void {
    try {
      const existingManager = this.managers.get(functionId);
      
      const manager: IResourceManager = {
        functionId,
        isEnabled: true,
        configuration: {
          allocation: {
            strategy: 'adaptive',
            reservationMode: 'hybrid'
          },
          scaling: {
            enabled: true,
            minInstances: 1,
            maxInstances: 5,
            targetCPUUtilization: 70,
            targetMemoryUtilization: 80,
            scaleUpCooldown: 300000, // 5 minutes
            scaleDownCooldown: 600000 // 10 minutes
          },
          throttling: {
            enabled: true,
            maxRequestsPerSecond: 10,
            burstCapacity: 20,
            backoffStrategy: 'exponential'
          },
          ...config
        },
        currentUsage: existingManager?.currentUsage || this.createEmptyUsage(),
        quotas: existingManager?.quotas || this.createDefaultQuotas(),
        pools: existingManager?.pools || []
      };

      this.managers.set(functionId, manager);
      this.currentUsage.set(functionId, manager.currentUsage);
      
      // Initialize throttling state
      this.throttlingState.set(functionId, {
        requestCount: 0,
        windowStart: Date.now(),
        isThrottled: false,
        backoffLevel: 0,
        lastRequest: 0
      });

      console.log(`[ResourceManager] Configured resource management for function ${functionId}`);
      
    } catch (error) {
      console.error(`[ResourceManager] Error configuring function ${functionId}:`, error);
      throw new PerformanceError(
        `Failed to configure resource management: ${(error as Error).message}`,
        functionId,
        undefined,
        undefined,
        undefined,
        error as Error
      );
    }
  }

  /**
   * Allocate resources for function execution
   */
  async allocateResources(
    functionId: string, 
    requestedResources: Partial<ResourceUsage>,
    priority: number = 50
  ): Promise<ResourceAllocation[]> {
    try {
      const manager = this.managers.get(functionId);
      if (!manager || !manager.isEnabled) {
        throw new ResourceExhaustionError(
          'Resource manager not configured for function',
          functionId,
          'system',
          0,
          0
        );
      }

      // Check throttling first
      const isThrottled = await this.checkThrottling(functionId);
      if (isThrottled) {
        throw new ResourceExhaustionError(
          'Function is currently throttled',
          functionId,
          'throttle',
          1,
          0
        );
      }

      const allocations: ResourceAllocation[] = [];
      
      // Allocate CPU resources
      if (requestedResources.cpu?.current) {
        const cpuAllocation = await this.allocateFromPool(
          'cpu',
          requestedResources.cpu.current,
          functionId,
          priority
        );
        if (cpuAllocation) allocations.push(cpuAllocation);
      }

      // Allocate memory resources
      if (requestedResources.memory?.current) {
        const memoryAllocation = await this.allocateFromPool(
          'memory',
          requestedResources.memory.current,
          functionId,
          priority
        );
        if (memoryAllocation) allocations.push(memoryAllocation);
      }

      // Allocate network bandwidth
      if (requestedResources.network?.inbound || requestedResources.network?.outbound) {
        const networkAmount = Math.max(
          requestedResources.network.inbound || 0,
          requestedResources.network.outbound || 0
        );
        const networkAllocation = await this.allocateFromPool(
          'network',
          networkAmount,
          functionId,
          priority
        );
        if (networkAllocation) allocations.push(networkAllocation);
      }

      // Update current usage
      this.updateCurrentUsage(functionId, requestedResources);
      
      // Record allocation history
      const history = this.allocationHistory.get(functionId) || [];
      history.push(...allocations);
      if (history.length > 1000) {
        history.splice(0, history.length - 1000); // Keep last 1000 allocations
      }
      this.allocationHistory.set(functionId, history);

      // Update throttling state
      this.updateThrottlingState(functionId);

      this.emitResourceEvent(
        PerformanceEventType.RESOURCE_EXHAUSTED,
        functionId,
        { allocations, requestedResources },
        'info'
      );

      return allocations;

    } catch (error) {
      console.error(`[ResourceManager] Error allocating resources for ${functionId}:`, error);
      
      this.emitResourceEvent(
        PerformanceEventType.RESOURCE_EXHAUSTED,
        functionId,
        { error: (error as Error).message },
        'error'
      );
      
      throw error;
    }
  }

  /**
   * Release allocated resources
   */
  async releaseResources(functionId: string, allocations: ResourceAllocation[]): Promise<void> {
    try {
      for (const allocation of allocations) {
        await this.releaseFromPool(allocation);
      }
      
      // Update current usage
      const usage = this.currentUsage.get(functionId);
      if (usage) {
        // Decrease usage based on released resources
        this.decreaseUsage(usage, allocations);
        usage.timestamp = new Date();
      }

      console.log(`[ResourceManager] Released ${allocations.length} resource allocations for ${functionId}`);
      
    } catch (error) {
      console.error(`[ResourceManager] Error releasing resources:`, error);
    }
  }

  /**
   * Get current resource usage for a function
   */
  getCurrentUsage(functionId: string): ResourceUsage | null {
    return this.currentUsage.get(functionId) || null;
  }

  /**
   * Get resource quotas for a function
   */
  getQuotas(functionId: string): ResourceQuotas | null {
    const manager = this.managers.get(functionId);
    return manager ? { ...manager.quotas } : null;
  }

  /**
   * Update resource quotas for a function
   */
  updateQuotas(functionId: string, quotas: Partial<ResourceQuotas>): void {
    const manager = this.managers.get(functionId);
    if (manager) {
      manager.quotas = {
        ...manager.quotas,
        ...quotas
      };
      
      console.log(`[ResourceManager] Updated quotas for function ${functionId}`);
    }
  }

  /**
   * Get resource pool status
   */
  getPoolStatus(): Map<string, ResourcePool> {
    return new Map(this.globalPools);
  }

  /**
   * Check if function is currently throttled
   */
  isThrottled(functionId: string): boolean {
    const throttleState = this.throttlingState.get(functionId);
    return throttleState?.isThrottled || false;
  }

  /**
   * Get throttling information
   */
  getThrottlingInfo(functionId: string): any {
    const throttleState = this.throttlingState.get(functionId);
    const manager = this.managers.get(functionId);
    
    if (!throttleState || !manager) return null;
    
    return {
      isThrottled: throttleState.isThrottled,
      requestCount: throttleState.requestCount,
      backoffLevel: throttleState.backoffLevel,
      maxRequestsPerSecond: manager.configuration.throttling.maxRequestsPerSecond,
      burstCapacity: manager.configuration.throttling.burstCapacity,
      windowStart: new Date(throttleState.windowStart),
      lastRequest: new Date(throttleState.lastRequest)
    };
  }

  /**
   * Force scaling operation for a function
   */
  async forceScale(functionId: string, targetInstances: number): Promise<void> {
    const manager = this.managers.get(functionId);
    if (!manager || !manager.configuration.scaling.enabled) {
      throw new PerformanceError(
        'Scaling not enabled for function',
        functionId
      );
    }

    const config = manager.configuration.scaling;
    const clampedTarget = Math.max(
      config.minInstances,
      Math.min(config.maxInstances, targetInstances)
    );

    // Emit scaling event
    this.emitResourceEvent(
      PerformanceEventType.SCALING_EVENT,
      functionId,
      { 
        targetInstances: clampedTarget,
        forced: true 
      },
      'info'
    );

    console.log(`[ResourceManager] Force scaling function ${functionId} to ${clampedTarget} instances`);
  }

  // Private helper methods
  private setupEventListeners(): void {
    globalEventBus.on('function-execution-started', (event: EventData) => {
      const { functionId, estimatedResources } = event.payload;
      this.handleExecutionStarted(functionId, estimatedResources);
    });

    globalEventBus.on('function-execution-completed', (event: EventData) => {
      const execution = event.payload as FunctionExecution;
      this.handleExecutionCompleted(execution);
    });

    globalEventBus.on('system-resource-update', (event: EventData) => {
      const { totalCpu, totalMemory, availableCpu, availableMemory } = event.payload;
      this.updateGlobalPools(totalCpu, totalMemory, availableCpu, availableMemory);
    });
  }

  private initializeGlobalPools(): void {
    // Initialize CPU pool
    this.globalPools.set('cpu', {
      id: 'global-cpu',
      type: 'cpu',
      capacity: 100, // 100% CPU
      available: 80,  // 80% available initially
      reserved: 20,   // 20% reserved for system
      allocations: []
    });

    // Initialize memory pool
    this.globalPools.set('memory', {
      id: 'global-memory',
      type: 'memory',
      capacity: 8 * 1024 * 1024 * 1024, // 8GB
      available: 6 * 1024 * 1024 * 1024, // 6GB available
      reserved: 2 * 1024 * 1024 * 1024,  // 2GB reserved
      allocations: []
    });

    // Initialize network pool
    this.globalPools.set('network', {
      id: 'global-network',
      type: 'network',
      capacity: 1000 * 1024 * 1024, // 1GB/s bandwidth
      available: 800 * 1024 * 1024,  // 800MB/s available
      reserved: 200 * 1024 * 1024,   // 200MB/s reserved
      allocations: []
    });
  }

  private async allocateFromPool(
    poolType: string,
    amount: number,
    functionId: string,
    priority: number
  ): Promise<ResourceAllocation | null> {
    const pool = this.globalPools.get(poolType);
    if (!pool) return null;

    // Check if enough resources are available
    if (pool.available < amount) {
      // Try to free up resources from lower priority allocations
      const freed = await this.freeResourcesForPriority(pool, amount, priority);
      if (!freed) {
        throw new ResourceExhaustionError(
          `Insufficient ${poolType} resources`,
          functionId,
          poolType,
          amount,
          pool.available
        );
      }
    }

    // Create allocation
    const allocation: ResourceAllocation = {
      functionId,
      amount,
      priority,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 3600000) // 1 hour default
    };

    // Update pool
    pool.available -= amount;
    pool.allocations.push(allocation);

    return allocation;
  }

  private async releaseFromPool(allocation: ResourceAllocation): Promise<void> {
    // Find the pool that contains this allocation
    for (const [poolType, pool] of this.globalPools) {
      const index = pool.allocations.findIndex(a => 
        a.functionId === allocation.functionId &&
        a.timestamp.getTime() === allocation.timestamp.getTime()
      );
      
      if (index !== -1) {
        pool.allocations.splice(index, 1);
        pool.available += allocation.amount;
        break;
      }
    }
  }

  private async freeResourcesForPriority(
    pool: ResourcePool,
    needed: number,
    requiredPriority: number
  ): Promise<boolean> {
    // Find lower priority allocations that can be preempted
    const preemptable = pool.allocations
      .filter(a => a.priority < requiredPriority)
      .sort((a, b) => a.priority - b.priority);

    let freed = 0;
    const toRelease: ResourceAllocation[] = [];

    for (const allocation of preemptable) {
      toRelease.push(allocation);
      freed += allocation.amount;
      if (freed >= needed) break;
    }

    if (freed >= needed) {
      // Release the selected allocations
      for (const allocation of toRelease) {
        await this.releaseFromPool(allocation);
        
        // Notify the affected function
        this.emitResourceEvent(
          PerformanceEventType.RESOURCE_EXHAUSTED,
          allocation.functionId,
          { preempted: true, priority: allocation.priority },
          'warning'
        );
      }
      return true;
    }

    return false;
  }

  private async checkThrottling(functionId: string): Promise<boolean> {
    const manager = this.managers.get(functionId);
    const throttleState = this.throttlingState.get(functionId);
    
    if (!manager || !throttleState || !manager.configuration.throttling.enabled) {
      return false;
    }

    const config = manager.configuration.throttling;
    const now = Date.now();
    const windowSize = 1000; // 1 second window

    // Reset window if needed
    if (now - throttleState.windowStart >= windowSize) {
      throttleState.windowStart = now;
      throttleState.requestCount = 0;
    }

    // Check if we're in backoff period
    if (throttleState.isThrottled) {
      const backoffTime = this.calculateBackoffTime(
        throttleState.backoffLevel,
        config.backoffStrategy
      );
      
      if (now - throttleState.lastRequest < backoffTime) {
        return true; // Still in backoff
      } else {
        // Exit backoff
        throttleState.isThrottled = false;
        throttleState.backoffLevel = Math.max(0, throttleState.backoffLevel - 1);
      }
    }

    // Check rate limits
    const currentRate = throttleState.requestCount;
    const maxRate = config.maxRequestsPerSecond;
    const burstCapacity = config.burstCapacity;

    // Allow burst if under burst capacity
    if (currentRate >= maxRate && currentRate >= burstCapacity) {
      throttleState.isThrottled = true;
      throttleState.backoffLevel++;
      throttleState.lastRequest = now;
      
      this.emitResourceEvent(
        PerformanceEventType.THRESHOLD_EXCEEDED,
        functionId,
        { 
          type: 'rate_limit',
          currentRate,
          maxRate,
          backoffLevel: throttleState.backoffLevel
        },
        'warning'
      );
      
      return true;
    }

    return false;
  }

  private updateThrottlingState(functionId: string): void {
    const throttleState = this.throttlingState.get(functionId);
    if (throttleState) {
      throttleState.requestCount++;
      throttleState.lastRequest = Date.now();
    }
  }

  private calculateBackoffTime(level: number, strategy: string): number {
    const baseDelay = 1000; // 1 second base
    
    switch (strategy) {
      case 'exponential':
        return baseDelay * Math.pow(2, level);
      case 'linear':
        return baseDelay * (level + 1);
      case 'fixed':
        return baseDelay;
      default:
        return baseDelay * Math.pow(2, level);
    }
  }

  private updateCurrentUsage(functionId: string, requestedResources: Partial<ResourceUsage>): void {
    const usage = this.currentUsage.get(functionId);
    if (!usage) return;

    // Add requested resources to current usage
    if (requestedResources.cpu?.current) {
      usage.cpu.current += requestedResources.cpu.current;
      usage.cpu.peak = Math.max(usage.cpu.peak, usage.cpu.current);
    }

    if (requestedResources.memory?.current) {
      usage.memory.current += requestedResources.memory.current;
      usage.memory.peak = Math.max(usage.memory.peak, usage.memory.current);
    }

    if (requestedResources.concurrency?.active) {
      usage.concurrency.active += requestedResources.concurrency.active;
    }

    usage.timestamp = new Date();
  }

  private decreaseUsage(usage: ResourceUsage, allocations: ResourceAllocation[]): void {
    for (const allocation of allocations) {
      // Decrease usage based on allocation type
      // This is simplified - in reality, we'd track what each allocation represents
      if (allocation.amount < 100) {
        // Likely CPU (percentage)
        usage.cpu.current = Math.max(0, usage.cpu.current - allocation.amount);
      } else {
        // Likely memory (bytes)
        usage.memory.current = Math.max(0, usage.memory.current - allocation.amount);
      }
    }
  }

  private handleExecutionStarted(functionId: string, estimatedResources: any): void {
    // Track execution start for resource monitoring
    const usage = this.currentUsage.get(functionId);
    if (usage) {
      usage.concurrency.active++;
    }
  }

  private handleExecutionCompleted(execution: FunctionExecution): void {
    // Update usage statistics after execution
    const usage = this.currentUsage.get(execution.functionId);
    if (usage) {
      usage.concurrency.active = Math.max(0, usage.concurrency.active - 1);
      
      // Update averages
      if (execution.duration) {
        const currentCount = usage.cpu.time || 0;
        usage.cpu.average = (usage.cpu.average * currentCount + execution.duration) / (currentCount + 1);
      }
      
      usage.timestamp = new Date();
    }
  }

  private updateGlobalPools(
    totalCpu: number,
    totalMemory: number,
    availableCpu: number,
    availableMemory: number
  ): void {
    const cpuPool = this.globalPools.get('cpu');
    if (cpuPool) {
      cpuPool.capacity = totalCpu;
      cpuPool.available = availableCpu - cpuPool.allocations.reduce((sum, a) => sum + a.amount, 0);
    }

    const memoryPool = this.globalPools.get('memory');
    if (memoryPool) {
      memoryPool.capacity = totalMemory;
      memoryPool.available = availableMemory - memoryPool.allocations.reduce((sum, a) => sum + a.amount, 0);
    }
  }

  private startMonitoringLoop(): void {
    this.monitoringTimer = setInterval(() => {
      this.performPeriodicTasks();
    }, 30000); // Every 30 seconds

    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredAllocations();
    }, 300000); // Every 5 minutes
  }

  private performPeriodicTasks(): void {
    // Update resource usage metrics
    this.updateUsageMetrics();
    
    // Check for scaling opportunities
    this.checkAutoScaling();
    
    // Monitor resource health
    this.monitorResourceHealth();
  }

  private updateUsageMetrics(): void {
    this.currentUsage.forEach((usage, functionId) => {
      const manager = this.managers.get(functionId);
      if (!manager) return;

      // Calculate utilization percentages
      const cpuUtilization = (usage.cpu.current / manager.quotas.cpu.limit) * 100;
      const memoryUtilization = (usage.memory.current / manager.quotas.memory.limit) * 100;

      // Emit events if thresholds are exceeded
      if (cpuUtilization > 90) {
        this.emitResourceEvent(
          PerformanceEventType.THRESHOLD_EXCEEDED,
          functionId,
          { type: 'cpu', utilization: cpuUtilization },
          'warning'
        );
      }

      if (memoryUtilization > 90) {
        this.emitResourceEvent(
          PerformanceEventType.THRESHOLD_EXCEEDED,
          functionId,
          { type: 'memory', utilization: memoryUtilization },
          'warning'
        );
      }
    });
  }

  private checkAutoScaling(): void {
    this.managers.forEach((manager, functionId) => {
      if (!manager.configuration.scaling.enabled) return;

      const usage = this.currentUsage.get(functionId);
      if (!usage) return;

      const config = manager.configuration.scaling;
      const cpuUtilization = (usage.cpu.current / manager.quotas.cpu.limit) * 100;
      const memoryUtilization = (usage.memory.current / manager.quotas.memory.limit) * 100;

      // Check if scaling is needed
      if (cpuUtilization > config.targetCPUUtilization || 
          memoryUtilization > config.targetMemoryUtilization) {
        
        this.emitResourceEvent(
          PerformanceEventType.SCALING_EVENT,
          functionId,
          { 
            trigger: 'auto-scale-up',
            cpuUtilization,
            memoryUtilization
          },
          'info'
        );
      }
    });
  }

  private monitorResourceHealth(): void {
    // Check global pool health
    this.globalPools.forEach((pool, poolType) => {
      const utilizationRate = (pool.capacity - pool.available) / pool.capacity;
      
      if (utilizationRate > 0.9) {
        this.emitResourceEvent(
          PerformanceEventType.RESOURCE_EXHAUSTED,
          'system',
          { 
            poolType,
            utilizationRate,
            available: pool.available,
            capacity: pool.capacity
          },
          'critical'
        );
      }
    });
  }

  private cleanupExpiredAllocations(): void {
    const now = Date.now();
    let totalCleaned = 0;

    this.globalPools.forEach((pool, poolType) => {
      const expired = pool.allocations.filter(a => 
        a.expiresAt && a.expiresAt.getTime() < now
      );

      for (const allocation of expired) {
        this.releaseFromPool(allocation);
        totalCleaned++;
      }
    });

    if (totalCleaned > 0) {
      console.log(`[ResourceManager] Cleaned up ${totalCleaned} expired resource allocations`);
    }
  }

  // Default configuration creators
  private createEmptyUsage(): ResourceUsage {
    return {
      cpu: {
        current: 0,
        average: 0,
        peak: 0
      },
      memory: {
        current: 0,
        average: 0,
        peak: 0
      },
      network: {
        inbound: 0,
        outbound: 0
      },
      storage: {
        used: 0,
        iops: 0
      },
      concurrency: {
        active: 0,
        queued: 0
      },
      timestamp: new Date()
    };
  }

  private createDefaultQuotas(): ResourceQuotas {
    return {
      cpu: {
        limit: 2, // 2 CPU cores
        request: 0.5 // 0.5 core guaranteed
      },
      memory: {
        limit: 2 * 1024 * 1024 * 1024, // 2GB
        request: 512 * 1024 * 1024      // 512MB guaranteed
      },
      network: {
        bandwidthLimit: 100 * 1024 * 1024 // 100MB/s
      },
      requests: {
        rateLimit: 10,  // 10 requests/second
        burstLimit: 20  // 20 burst requests
      },
      cost: {
        hourlyLimit: 1.0,  // $1/hour
        dailyLimit: 10.0   // $10/day
      }
    };
  }

  private emitResourceEvent(
    type: PerformanceEventType,
    functionId: string,
    data: any,
    severity: 'info' | 'warning' | 'error' | 'critical'
  ): void {
    const event: PerformanceEvent = {
      type,
      functionId,
      data,
      timestamp: new Date(),
      severity
    };

    globalEventBus.emit('performance-event', event, 'resource-manager');
  }

  dispose(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = undefined;
    }
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }
}

// Helper interface for throttling state
interface ThrottleState {
  requestCount: number;
  windowStart: number;
  isThrottled: boolean;
  backoffLevel: number;
  lastRequest: number;
}

// Export singleton instance
export const resourceManager = new ResourceManager();