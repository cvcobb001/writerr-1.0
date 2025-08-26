import { 
  EngineAdapter, 
  ExecutionJob, 
  EngineResult, 
  OperationType,
  AdapterStatus,
  EditorialEngineSettings 
} from './types';
import { WritterrEventBus } from './event-bus';

export class AdapterManager {
  private adapters: Map<string, EngineAdapter> = new Map();
  private router: AdapterRouter;
  private healthMonitor: AdapterHealthMonitor;

  constructor(
    private eventBus: WritterrEventBus,
    private settings: EditorialEngineSettings
  ) {
    this.router = new AdapterRouter();
    this.healthMonitor = new AdapterHealthMonitor(this.eventBus);
  }

  async registerAdapter(adapter: EngineAdapter): Promise<void> {
    try {
      // Get configuration for this adapter
      const config = this.getAdapterConfig(adapter.name);
      
      // Initialize adapter
      await adapter.initialize(config);
      
      // Register with router
      this.router.registerAdapter(adapter);
      
      // Store adapter
      this.adapters.set(adapter.name, adapter);
      
      // Start health monitoring
      this.healthMonitor.startMonitoring(adapter);
      
      // Emit registration event
      this.eventBus.emit('adapter-registered', { 
        name: adapter.name, 
        adapter 
      });
      
      console.log(`Registered adapter: ${adapter.name} v${adapter.version}`);
    } catch (error) {
      console.error(`Failed to register adapter ${adapter.name}:`, error);
      throw error;
    }
  }

  async execute(job: ExecutionJob): Promise<EngineResult> {
    const startTime = performance.now();
    
    try {
      // Find suitable adapters using enhanced routing
      const suitableAdapters = this.router.findSuitableAdapters(job);
      
      if (suitableAdapters.length === 0) {
        const error = new Error(
          `No suitable adapter found for job type: ${job.type}. ` +
          `Available adapters: ${this.adapters.size}, ` +
          `Registered adapter types: ${Array.from(this.adapters.values()).map(a => a.supportedOperations).flat().join(', ')}`
        );
        
        this.eventBus.emit('adapter-execution-failed', { 
          jobId: job.id, 
          error: error.message,
          availableAdapters: Array.from(this.adapters.keys()),
          requestedJobType: job.type
        });
        
        throw error;
      }

      // Try adapters in order returned by routing strategy
      let lastError: Error | null = null;
      const attemptedAdapters: string[] = [];
      
      for (const adapter of suitableAdapters) {
        attemptedAdapters.push(adapter.name);
        
        try {
          // Update adapter load before execution
          this.router.updateAdapterLoad(adapter.name, this.getCurrentAdapterLoad(adapter.name));
          
          const result = await this.executeWithAdapter(adapter, job);
          const executionTime = performance.now() - startTime;
          
          // Record successful execution in router metrics
          this.router.recordAdapterExecution(adapter.name, executionTime, true);
          
          // Record execution for performance monitoring
          this.recordExecution(adapter.name, true, executionTime);
          
          // Emit success event
          this.eventBus.emit('adapter-execution-success', {
            jobId: job.id,
            adapterName: adapter.name,
            executionTime,
            attemptedAdapters
          });
          
          return result;
        } catch (error) {
          const executionTime = performance.now() - startTime;
          
          console.warn(`Adapter ${adapter.name} failed for job ${job.id}:`, error);
          lastError = error;
          
          // Record failed execution in router metrics
          this.router.recordAdapterExecution(adapter.name, executionTime, false);
          
          // Record failed execution for performance monitoring
          this.recordExecution(adapter.name, false, executionTime);
          
          // Emit adapter failure event
          this.eventBus.emit('adapter-execution-attempt-failed', {
            jobId: job.id,
            adapterName: adapter.name,
            error: error.message,
            executionTime,
            remainingAdapters: suitableAdapters.length - attemptedAdapters.length
          });
          
          // Continue to next adapter if available
          continue;
        }
      }
      
      // All adapters failed
      const finalError = new Error(
        `All suitable adapters failed for job ${job.id}. ` +
        `Attempted adapters: ${attemptedAdapters.join(', ')}. ` +
        `Last error: ${lastError?.message || 'Unknown error'}`
      );
      
      this.eventBus.emit('adapter-execution-failed', { 
        jobId: job.id, 
        error: finalError.message,
        attemptedAdapters,
        lastError: lastError?.message
      });
      
      throw finalError;
    } catch (error) {
      // Ensure error event is emitted for any execution failure
      if (error.message && !error.message.includes('No suitable adapter')) {
        this.eventBus.emit('adapter-execution-failed', { 
          jobId: job.id, 
          error: error.message 
        });
      }
      
      throw error;
    }
  }

  private async executeWithAdapter(adapter: EngineAdapter, job: ExecutionJob): Promise<EngineResult> {
    // Check adapter health before execution
    const status = adapter.getStatus();
    if (!status.healthy) {
      throw new Error(`Adapter ${adapter.name} is not healthy: ${status.error}`);
    }

    // Set timeout
    const timeoutPromise = new Promise<EngineResult>((_, reject) => {
      setTimeout(() => reject(new Error('Adapter execution timeout')), job.timeout);
    });

    // Execute with timeout
    const executionPromise = adapter.execute(job);
    
    const result = await Promise.race([executionPromise, timeoutPromise]);
    
    if (!result.success) {
      throw new Error(`Adapter execution failed: ${result.errors?.map(e => e.message).join(', ')}`);
    }
    
    return result;
  }

  getAdapter(name: string): EngineAdapter | undefined {
    return this.adapters.get(name);
  }

  getAllAdapters(): EngineAdapter[] {
    return Array.from(this.adapters.values());
  }

  getAdapterCount(): number {
    return this.adapters.size;
  }

  getAdapterStatus(name: string): AdapterStatus | undefined {
    const adapter = this.adapters.get(name);
    return adapter?.getStatus();
  }

  getAllAdapterStatuses(): Record<string, AdapterStatus> {
    const statuses: Record<string, AdapterStatus> = {};
    
    for (const [name, adapter] of this.adapters) {
      statuses[name] = adapter.getStatus();
    }
    
    return statuses;
  }

  private getAdapterConfig(adapterName: string): any {
    return this.settings.adapters[adapterName]?.config || {};
  }

  private recordExecution(adapterName: string, success: boolean, responseTime: number): void {
    this.eventBus.emit('adapter-execution-recorded', {
      adapterName,
      success,
      responseTime,
      timestamp: Date.now()
    });
  }

  private getCurrentAdapterLoad(adapterName: string): number {
    // Calculate current load based on pending operations
    // This is a simplified implementation - in a real system you'd track active jobs
    const adapter = this.adapters.get(adapterName);
    if (!adapter) return 0;
    
    const status = adapter.getStatus();
    return status.currentLoad || 0;
  }

  // Enhanced adapter management methods
  setRoutingStrategy(strategy: 'priority' | 'round-robin' | 'load-balanced'): void {
    this.router.setRoutingStrategy(strategy);
    
    this.eventBus.emit('routing-strategy-changed', {
      newStrategy: strategy,
      timestamp: Date.now()
    });
  }

  getRoutingStrategy(): string {
    return this.router.getRoutingStrategy();
  }

  getAdapterMetrics(): Record<string, any> {
    return this.router.getAdapterMetrics();
  }

  getDetailedAdapterStatus(): Record<string, any> {
    const detailedStatus: Record<string, any> = {};
    
    for (const [name, adapter] of this.adapters) {
      const status = adapter.getStatus();
      const metrics = this.router.getAdapterMetrics()[name];
      
      detailedStatus[name] = {
        ...status,
        metrics,
        capabilities: adapter.capabilities,
        supportedOperations: adapter.supportedOperations,
        lastHealthCheck: status.lastHealthCheck || Date.now()
      };
    }
    
    return detailedStatus;
  }

  async cleanup(): Promise<void> {
    // Stop health monitoring
    this.healthMonitor.cleanup();
    
    // Cleanup all adapters
    for (const [name, adapter] of this.adapters) {
      try {
        await adapter.cleanup();
      } catch (error) {
        console.error(`Error cleaning up adapter ${name}:`, error);
      }
    }
    
    // Clear adapters
    this.adapters.clear();
  }
}

class AdapterRouter {
  private adapters: EngineAdapter[] = [];
  private routingStrategy: 'priority' | 'round-robin' | 'load-balanced' = 'priority';
  private roundRobinIndex: number = 0;
  private adapterMetrics: Map<string, AdapterMetrics> = new Map();

  constructor(routingStrategy: 'priority' | 'round-robin' | 'load-balanced' = 'priority') {
    this.routingStrategy = routingStrategy;
  }

  registerAdapter(adapter: EngineAdapter): void {
    this.adapters.push(adapter);
    
    // Initialize metrics for this adapter
    this.adapterMetrics.set(adapter.name, {
      totalRequests: 0,
      successfulRequests: 0,
      averageResponseTime: 0,
      currentLoad: 0,
      lastUsed: 0,
      priority: this.extractAdapterPriority(adapter)
    });
    
    // Sort adapters by priority
    this.sortAdaptersByPriority();
  }

  findSuitableAdapters(job: ExecutionJob): EngineAdapter[] {
    // First filter by basic compatibility
    const compatibleAdapters = this.adapters.filter(adapter => 
      this.isAdapterCompatible(adapter, job)
    );

    if (compatibleAdapters.length === 0) {
      return [];
    }

    // Apply routing strategy
    switch (this.routingStrategy) {
      case 'priority':
        return this.priorityRouting(compatibleAdapters, job);
      
      case 'round-robin':
        return this.roundRobinRouting(compatibleAdapters);
      
      case 'load-balanced':
        return this.loadBalancedRouting(compatibleAdapters, job);
      
      default:
        return compatibleAdapters;
    }
  }

  private isAdapterCompatible(adapter: EngineAdapter, job: ExecutionJob): boolean {
    // Check if adapter supports the operation type
    if (!adapter.supportedOperations.includes(job.type)) {
      return false;
    }
    
    // Check if adapter is healthy
    const status = adapter.getStatus();
    if (!status.healthy) {
      return false;
    }
    
    // Check payload size limits
    if (job.payload && typeof job.payload.text === 'string') {
      const textLength = job.payload.text.length;
      if (textLength > adapter.capabilities.maxTextLength) {
        return false;
      }
    }

    // Check adapter-specific constraints
    if (job.constraints && job.constraints.length > 0) {
      const requiredCapabilities = this.extractRequiredCapabilities(job.constraints);
      
      for (const capability of requiredCapabilities) {
        if (!adapter.capabilities.supportedConstraints?.includes(capability)) {
          return false;
        }
      }
    }

    // Check timeout compatibility
    if (job.timeout > adapter.capabilities.maxProcessingTime) {
      return false;
    }
    
    return true;
  }

  private priorityRouting(adapters: EngineAdapter[], job: ExecutionJob): EngineAdapter[] {
    // Sort by priority score (higher is better)
    return adapters.sort((a, b) => {
      const scoreA = this.calculateAdapterScore(a, job);
      const scoreB = this.calculateAdapterScore(b, job);
      return scoreB - scoreA;
    });
  }

  private roundRobinRouting(adapters: EngineAdapter[]): EngineAdapter[] {
    if (adapters.length === 0) return [];
    
    // Select next adapter in round-robin fashion
    const selectedAdapter = adapters[this.roundRobinIndex % adapters.length];
    this.roundRobinIndex = (this.roundRobinIndex + 1) % adapters.length;
    
    // Return selected adapter first, then others as fallbacks
    const result = [selectedAdapter];
    result.push(...adapters.filter(a => a.name !== selectedAdapter.name));
    
    return result;
  }

  private loadBalancedRouting(adapters: EngineAdapter[], job: ExecutionJob): EngineAdapter[] {
    // Sort by current load and performance metrics
    return adapters.sort((a, b) => {
      const metricsA = this.adapterMetrics.get(a.name)!;
      const metricsB = this.adapterMetrics.get(b.name)!;
      
      // Calculate load-adjusted priority
      const loadScoreA = this.calculateLoadScore(metricsA);
      const loadScoreB = this.calculateLoadScore(metricsB);
      
      return loadScoreB - loadScoreA;
    });
  }

  private calculateAdapterScore(adapter: EngineAdapter, job: ExecutionJob): number {
    const metrics = this.adapterMetrics.get(adapter.name);
    if (!metrics) return 0;

    let score = metrics.priority * 10; // Base priority weight

    // Success rate bonus
    const successRate = metrics.totalRequests > 0 
      ? metrics.successfulRequests / metrics.totalRequests 
      : 0.5;
    score += successRate * 20;

    // Response time penalty (lower is better)
    const responseTimePenalty = Math.min(metrics.averageResponseTime / 1000, 10);
    score -= responseTimePenalty;

    // Current load penalty
    score -= metrics.currentLoad * 5;

    // Recency bonus (prefer recently successful adapters)
    const recencyBonus = Math.max(0, 10 - ((Date.now() - metrics.lastUsed) / 1000));
    score += recencyBonus;

    // Job-specific compatibility bonus
    if (job.constraints) {
      const compatibilityBonus = this.calculateCompatibilityBonus(adapter, job);
      score += compatibilityBonus;
    }

    return Math.max(0, score);
  }

  private calculateLoadScore(metrics: AdapterMetrics): number {
    const successRate = metrics.totalRequests > 0 
      ? metrics.successfulRequests / metrics.totalRequests 
      : 0.5;
    
    const loadPenalty = metrics.currentLoad * 0.3;
    const responsePenalty = metrics.averageResponseTime / 10000; // Convert to seconds
    
    return (successRate * 100) - loadPenalty - responsePenalty;
  }

  private calculateCompatibilityBonus(adapter: EngineAdapter, job: ExecutionJob): number {
    let bonus = 0;

    // Bonus for specific operation type expertise
    const operationBonus: Record<string, number> = {
      'grammar-check': adapter.name.includes('grammar') ? 5 : 0,
      'style-enhancement': adapter.name.includes('style') ? 5 : 0,
      'summarization': adapter.name.includes('summarize') ? 5 : 0
    };

    bonus += operationBonus[job.type] || 0;

    // Bonus for constraint support
    if (job.constraints) {
      const supportedConstraints = job.constraints.filter(constraint => 
        adapter.capabilities.supportedConstraints?.includes(constraint.type)
      );
      
      bonus += supportedConstraints.length * 2;
    }

    return bonus;
  }

  private extractRequiredCapabilities(constraints: any[]): string[] {
    const capabilities = new Set<string>();
    
    for (const constraint of constraints) {
      if (constraint.type === 'PRESERVE_TONE') {
        capabilities.add('tone-analysis');
      }
      if (constraint.type === 'NO_CONTENT_CHANGE') {
        capabilities.add('semantic-analysis');
      }
      if (constraint.type === 'GRAMMAR_ONLY') {
        capabilities.add('grammar-checking');
      }
      if (constraint.type === 'STYLE_CONSISTENCY') {
        capabilities.add('style-analysis');
      }
    }
    
    return Array.from(capabilities);
  }

  private extractAdapterPriority(adapter: EngineAdapter): number {
    // Extract priority from adapter metadata or configuration
    return adapter.metadata?.priority || 5; // Default priority
  }

  private sortAdaptersByPriority(): void {
    this.adapters.sort((a, b) => {
      const metricsA = this.adapterMetrics.get(a.name);
      const metricsB = this.adapterMetrics.get(b.name);
      
      const priorityA = metricsA?.priority || 5;
      const priorityB = metricsB?.priority || 5;
      
      return priorityB - priorityA;
    });
  }

  // Metrics update methods
  recordAdapterExecution(adapterName: string, responseTime: number, success: boolean): void {
    const metrics = this.adapterMetrics.get(adapterName);
    if (!metrics) return;

    metrics.totalRequests++;
    if (success) {
      metrics.successfulRequests++;
    }

    // Update average response time
    metrics.averageResponseTime = (
      (metrics.averageResponseTime * (metrics.totalRequests - 1)) + responseTime
    ) / metrics.totalRequests;

    metrics.lastUsed = Date.now();
  }

  updateAdapterLoad(adapterName: string, currentLoad: number): void {
    const metrics = this.adapterMetrics.get(adapterName);
    if (metrics) {
      metrics.currentLoad = currentLoad;
    }
  }

  setRoutingStrategy(strategy: 'priority' | 'round-robin' | 'load-balanced'): void {
    this.routingStrategy = strategy;
    
    if (strategy === 'round-robin') {
      this.roundRobinIndex = 0; // Reset round-robin counter
    }
  }

  getAdapterMetrics(): Record<string, AdapterMetrics> {
    const result: Record<string, AdapterMetrics> = {};
    for (const [name, metrics] of this.adapterMetrics) {
      result[name] = { ...metrics };
    }
    return result;
  }

  getRoutingStrategy(): string {
    return this.routingStrategy;
  }
}

// Interface for adapter metrics
interface AdapterMetrics {
  totalRequests: number;
  successfulRequests: number;
  averageResponseTime: number;
  currentLoad: number;
  lastUsed: number;
  priority: number;
}

class AdapterHealthMonitor {
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

  constructor(private eventBus: WritterrEventBus) {}

  startMonitoring(adapter: EngineAdapter): void {
    // Clear existing monitoring for this adapter
    this.stopMonitoring(adapter.name);
    
    // Start new monitoring
    const interval = setInterval(() => {
      this.checkAdapterHealth(adapter);
    }, this.HEALTH_CHECK_INTERVAL);
    
    this.intervals.set(adapter.name, interval);
  }

  stopMonitoring(adapterName: string): void {
    const interval = this.intervals.get(adapterName);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(adapterName);
    }
  }

  private async checkAdapterHealth(adapter: EngineAdapter): Promise<void> {
    try {
      const status = adapter.getStatus();
      
      if (!status.healthy) {
        this.eventBus.emit('adapter-health-warning', {
          adapterName: adapter.name,
          status,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      this.eventBus.emit('adapter-health-error', {
        adapterName: adapter.name,
        error: error.message,
        timestamp: Date.now()
      });
    }
  }

  cleanup(): void {
    // Stop all health monitoring
    for (const [name, interval] of this.intervals) {
      clearInterval(interval);
    }
    this.intervals.clear();
  }
}