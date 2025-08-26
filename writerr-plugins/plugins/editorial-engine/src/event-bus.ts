// Event Bus Implementation for Editorial Engine
import { WritterrEventType, WritterrEventData, WritterrEventMap } from '../../../shared/types';

export interface WritterrEventBus {
  emit<T = any>(event: string, data: T): void;
  on<T = any>(event: string, handler: (data: T) => void): void;
  off(event: string, handler: Function): void;
  once<T = any>(event: string, handler: (data: T) => void): void;
  cleanup(): void;
  setDebugMode(enabled: boolean): void;
  getEventCounts(): Record<string, number>;
  getAllEvents(): string[];
  hasListeners(event: string): boolean;
  getListenerCount(event: string): number;
  removeAllListeners(event?: string): void;
  resetCircuitBreaker(event: string): void;
  getCircuitBreakerStatus(): Record<string, { errorCount: number; disabled: boolean }>;
  setCircuitBreakerThreshold(threshold: number): void;
}

export class WritterrEventBus implements WritterrEventBus {
  private handlers: Map<string, Set<Function>> = new Map();
  private debugMode: boolean = false;
  private errorCounts: Map<string, number> = new Map();
  private circuitBreakerThreshold: number = 5;
  private disabledHandlers: Set<string> = new Set();

  emit<T = any>(event: string, data: T): void {
    if (this.debugMode) {
      console.debug(`[WritterrEventBus] Emitting: ${event}`, data);
    }

    // Check if event is disabled due to circuit breaker
    if (this.disabledHandlers.has(event)) {
      if (this.debugMode) {
        console.warn(`[WritterrEventBus] Event ${event} is disabled due to circuit breaker`);
      }
      return;
    }

    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      // Create array to avoid modification during iteration
      const handlersArray = Array.from(eventHandlers);
      
      for (const handler of handlersArray) {
        try {
          // Isolate each handler execution
          setTimeout(() => {
            try {
              handler(data);
              // Reset error count on successful execution
              this.resetErrorCount(event);
            } catch (error) {
              this.handleHandlerError(event, error, handler);
            }
          }, 0);
        } catch (error) {
          this.handleHandlerError(event, error, handler);
        }
      }
    }
  }

  on<T = any>(event: string, handler: (data: T) => void): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    
    if (this.debugMode) {
      console.debug(`[WritterrEventBus] Registered handler for: ${event}`);
    }
  }

  off(event: string, handler: Function): void {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      eventHandlers.delete(handler);
      
      // Clean up empty handler sets
      if (eventHandlers.size === 0) {
        this.handlers.delete(event);
      }
    }
  }

  once<T = any>(event: string, handler: (data: T) => void): void {
    const onceWrapper = (data: T) => {
      handler(data);
      this.off(event, onceWrapper);
    };
    
    this.on(event, onceWrapper);
  }

  cleanup(): void {
    this.handlers.clear();
    
    if (this.debugMode) {
      console.debug('[WritterrEventBus] Cleaned up all handlers');
    }
  }

  // Debug and monitoring methods
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  getEventCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    
    for (const [event, handlers] of this.handlers) {
      counts[event] = handlers.size;
    }
    
    return counts;
  }

  getAllEvents(): string[] {
    return Array.from(this.handlers.keys());
  }

  hasListeners(event: string): boolean {
    const handlers = this.handlers.get(event);
    return handlers ? handlers.size > 0 : false;
  }

  getListenerCount(event: string): number {
    const handlers = this.handlers.get(event);
    return handlers ? handlers.size : 0;
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
    }
  }

  // Error isolation and circuit breaker methods
  private handleHandlerError(event: string, error: any, handler: Function): void {
    console.error(`[WritterrEventBus] Error in handler for ${event}:`, error);
    
    // Increment error count
    const currentCount = this.errorCounts.get(event) || 0;
    const newCount = currentCount + 1;
    this.errorCounts.set(event, newCount);
    
    // Check circuit breaker threshold
    if (newCount >= this.circuitBreakerThreshold) {
      this.disabledHandlers.add(event);
      console.warn(`[WritterrEventBus] Event ${event} disabled due to repeated failures (${newCount} errors)`);
      
      // Emit system event about circuit breaker activation
      if (event !== 'system-error') { // Prevent infinite loops
        this.emit('system-error', {
          type: 'circuit-breaker-activated',
          event,
          errorCount: newCount,
          timestamp: Date.now()
        });
      }
    }
  }

  private resetErrorCount(event: string): void {
    if (this.errorCounts.has(event)) {
      this.errorCounts.delete(event);
    }
  }

  // Circuit breaker management
  resetCircuitBreaker(event: string): void {
    this.disabledHandlers.delete(event);
    this.errorCounts.delete(event);
    
    if (this.debugMode) {
      console.debug(`[WritterrEventBus] Circuit breaker reset for event: ${event}`);
    }
  }

  getCircuitBreakerStatus(): Record<string, { errorCount: number; disabled: boolean }> {
    const status: Record<string, { errorCount: number; disabled: boolean }> = {};
    
    for (const [event, count] of this.errorCounts) {
      status[event] = {
        errorCount: count,
        disabled: this.disabledHandlers.has(event)
      };
    }
    
    return status;
  }

  setCircuitBreakerThreshold(threshold: number): void {
    this.circuitBreakerThreshold = Math.max(1, threshold);
  }
}

// Event type definitions for better type safety
export interface EditorialEngineEvents {
  'platform-ready': { plugin: string; api: any };
  'mode-registered': { mode: any };
  'mode-updated': { mode: any };
  'mode-removed': { modeId: string; mode: any };
  'adapter-registered': { name: string; adapter: any };
  'adapter-execution-failed': { jobId: string; error: string };
  'adapter-execution-recorded': { 
    adapterName: string; 
    success: boolean; 
    responseTime: number; 
    timestamp: number;
  };
  'adapter-health-warning': { adapterName: string; status: any; timestamp: number };
  'adapter-health-error': { adapterName: string; error: string; timestamp: number };
  'processing-started': { intakeId: string };
  'processing-completed': { intakeId: string; result: any };
  'processing-failed': { intakeId: string; error: string };
  'performance-metrics-updated': { metrics: any };
}

// Typed event bus that provides better IntelliSense
export class TypedWritterrEventBus {
  private bus: WritterrEventBus;

  constructor(bus: WritterrEventBus) {
    this.bus = bus;
  }

  emit<K extends keyof EditorialEngineEvents>(
    event: K, 
    data: EditorialEngineEvents[K]
  ): void {
    this.bus.emit(event, data);
  }

  on<K extends keyof EditorialEngineEvents>(
    event: K, 
    handler: (data: EditorialEngineEvents[K]) => void
  ): void {
    this.bus.on(event, handler);
  }

  once<K extends keyof EditorialEngineEvents>(
    event: K, 
    handler: (data: EditorialEngineEvents[K]) => void
  ): void {
    this.bus.once(event, handler);
  }

  off(event: keyof EditorialEngineEvents, handler: Function): void {
    this.bus.off(event, handler);
  }
}