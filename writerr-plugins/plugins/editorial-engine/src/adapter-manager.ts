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
      // Find suitable adapters
      const suitableAdapters = this.router.findSuitableAdapters(job);
      
      if (suitableAdapters.length === 0) {
        throw new Error(`No suitable adapter found for job type: ${job.type}`);
      }

      // Try adapters in priority order
      let lastError: Error | null = null;
      
      for (const adapter of suitableAdapters) {
        try {
          const result = await this.executeWithAdapter(adapter, job);
          
          // Record successful execution
          this.recordExecution(adapter.name, true, performance.now() - startTime);
          
          return result;
        } catch (error) {
          console.warn(`Adapter ${adapter.name} failed for job ${job.id}:`, error);
          lastError = error;
          
          // Record failed execution
          this.recordExecution(adapter.name, false, performance.now() - startTime);
          
          // Continue to next adapter
        }
      }
      
      // All adapters failed
      throw lastError || new Error('All suitable adapters failed');
    } catch (error) {
      // Emit failure event
      this.eventBus.emit('adapter-execution-failed', { 
        jobId: job.id, 
        error: error.message 
      });
      
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

  registerAdapter(adapter: EngineAdapter): void {
    this.adapters.push(adapter);
    
    // Sort by priority (assuming higher priority = higher config priority value)
    this.adapters.sort((a, b) => {
      // For now, just keep registration order
      // TODO: Implement proper priority sorting
      return 0;
    });
  }

  findSuitableAdapters(job: ExecutionJob): EngineAdapter[] {
    return this.adapters.filter(adapter => {
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
      
      return true;
    });
  }
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