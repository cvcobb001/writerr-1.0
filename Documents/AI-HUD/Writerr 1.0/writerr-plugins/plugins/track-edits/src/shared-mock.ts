// Mock implementation of @writerr/shared functionality for standalone build

interface PluginRegistration {
  id: string;
  name: string;
  version: string;
  capabilities: string[];
}

interface EventBusEvent {
  [key: string]: any;
}

type EventHandler = (event: EventBusEvent) => void;

class MockRegistry {
  private plugins = new Map<string, PluginRegistration>();

  register(plugin: PluginRegistration): void {
    this.plugins.set(plugin.id, plugin);
  }

  unregister(id: string): void {
    this.plugins.delete(id);
  }

  get(id: string): PluginRegistration | undefined {
    return this.plugins.get(id);
  }

  getAll(): PluginRegistration[] {
    return Array.from(this.plugins.values());
  }
}

class MockEventBus {
  private listeners = new Map<string, Set<EventHandler>>();

  on(event: string, handler: EventHandler): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  off(event: string, handler: EventHandler): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  emit(event: string, data: EventBusEvent): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }
}

export const globalRegistry = new MockRegistry();
export const globalEventBus = new MockEventBus();