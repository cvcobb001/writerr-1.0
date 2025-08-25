/**
 * @fileoverview Global event bus for inter-plugin communication
 */

import { EventData } from './types';

export class EventBus {
  private listeners: Map<string, Set<(data: EventData) => void>> = new Map();
  
  emit(type: string, payload: any, source: string = 'unknown'): void {
    const event: EventData = {
      type,
      payload,
      timestamp: Date.now(),
      source
    };
    
    const typeListeners = this.listeners.get(type);
    if (typeListeners) {
      typeListeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in event listener for ${type}:`, error);
        }
      });
    }
  }
  
  on(type: string, listener: (data: EventData) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    
    this.listeners.get(type)!.add(listener);
    
    // Return unsubscribe function
    return () => {
      const typeListeners = this.listeners.get(type);
      if (typeListeners) {
        typeListeners.delete(listener);
        if (typeListeners.size === 0) {
          this.listeners.delete(type);
        }
      }
    };
  }
}

// Global event bus instance
export const globalEventBus = new EventBus();