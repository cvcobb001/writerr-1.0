// Event Bus Implementation for Editorial Engine

export interface WritterrEventBus {
  emit<T = any>(event: string, data: T): void;
  on<T = any>(event: string, handler: (data: T) => void): void;
  off(event: string, handler: Function): void;
  once<T = any>(event: string, handler: (data: T) => void): void;
  cleanup(): void;
}

export class WritterrEventBus implements WritterrEventBus {
  private handlers: Map<string, Set<Function>> = new Map();
  private debugMode: boolean = false;

  emit<T = any>(event: string, data: T): void {
    if (this.debugMode) {
      console.debug(`[WritterrEventBus] Emitting: ${event}`, data);
    }

    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      // Create array to avoid modification during iteration
      const handlersArray = Array.from(eventHandlers);
      
      for (const handler of handlersArray) {
        try {
          handler(data);
        } catch (error) {
          console.error(`[WritterrEventBus] Error in handler for ${event}:`, error);
          // Don't let one handler failure break others
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