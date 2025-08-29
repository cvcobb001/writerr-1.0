// Event persistence manager for offline change synchronization

import { WriterrlEventBusConnection } from './event-bus-integration';

export interface PersistedEvent {
  type: string;
  data: any;
  timestamp: Date;
  eventId: string;
  retryCount?: number;
  lastAttempt?: Date;
}

export interface SyncResult {
  synced: number;
  failed: number;
  errors: Array<{ eventId: string; error: string }>;
}

export interface StorageStats {
  totalEvents: number;
  oldestEvent?: Date;
  newestEvent?: Date;
  eventTypes: Record<string, number>;
  estimatedSizeKB: number;
}

export class EventPersistenceManager {
  private db: IDBDatabase | null = null;
  private readonly dbName = 'WriterrlEventPersistence';
  private readonly dbVersion = 1;
  private readonly storeName = 'events';
  private readonly maxRetries = 3;
  private maxStoredEvents = 1000;
  private eventBus: WriterrlEventBusConnection | null = null;

  constructor() {
    // Auto-cleanup every 24 hours
    setInterval(() => {
      this.cleanupOldEvents(7); // Keep events for 7 days
    }, 24 * 60 * 60 * 1000);
  }

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'eventId' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('retryCount', 'retryCount', { unique: false });
        }
      };
    });
  }

  setEventBus(eventBus: WriterrlEventBusConnection): void {
    this.eventBus = eventBus;
    
    // Auto-sync when connection is restored
    this.eventBus.subscribe('connection-restored', async () => {
      if (this.eventBus?.isConnected()) {
        await this.syncPendingEvents(this.eventBus);
      }
    });
  }

  setMaxStoredEvents(max: number): void {
    this.maxStoredEvents = max;
  }

  async storeEvent(event: PersistedEvent): Promise<void> {
    if (!this.db) {
      throw new Error('EventPersistenceManager not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      const eventWithDefaults = {
        ...event,
        retryCount: event.retryCount || 0,
        timestamp: event.timestamp instanceof Date ? event.timestamp : new Date(event.timestamp)
      };

      const request = store.add(eventWithDefaults);

      request.onsuccess = async () => {
        // Enforce storage limits
        await this.enforceStorageLimits();
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to store event: ${request.error?.message}`));
      };

      transaction.onerror = () => {
        reject(new Error(`Transaction failed: ${transaction.error?.message}`));
      };
    });
  }

  async getPendingEvents(): Promise<PersistedEvent[]> {
    if (!this.db) {
      throw new Error('EventPersistenceManager not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const events = request.result as PersistedEvent[];
        // Sort by timestamp to ensure correct order during sync
        events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        resolve(events);
      };

      request.onerror = () => {
        reject(new Error(`Failed to retrieve events: ${request.error?.message}`));
      };
    });
  }

  async syncPendingEvents(eventBus: WriterrlEventBusConnection): Promise<SyncResult> {
    const pendingEvents = await this.getPendingEvents();
    const result: SyncResult = {
      synced: 0,
      failed: 0,
      errors: []
    };

    if (!eventBus.isConnected) {
      throw new Error('Cannot sync: event bus not connected');
    }

    for (const event of pendingEvents) {
      try {
        // Skip events that have exceeded retry limit
        if (event.retryCount! >= this.maxRetries) {
          await this.removeEvent(event.eventId);
          continue;
        }

        await eventBus.publish(event.type, event.data);
        await this.removeEvent(event.eventId);
        result.synced++;
        
      } catch (error) {
        result.failed++;
        result.errors.push({
          eventId: event.eventId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        // Update retry count
        await this.updateEventRetryCount(event.eventId, event.retryCount! + 1);
      }
    }

    return result;
  }

  async removeEvent(eventId: string): Promise<void> {
    if (!this.db) {
      throw new Error('EventPersistenceManager not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(eventId);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        reject(new Error(`Failed to remove event: ${request.error?.message}`));
      };
    });
  }

  async updateEventRetryCount(eventId: string, retryCount: number): Promise<void> {
    if (!this.db) {
      throw new Error('EventPersistenceManager not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const getRequest = store.get(eventId);
      getRequest.onsuccess = () => {
        const event = getRequest.result;
        if (event) {
          event.retryCount = retryCount;
          event.lastAttempt = new Date();
          
          const putRequest = store.put(event);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => {
            reject(new Error(`Failed to update retry count: ${putRequest.error?.message}`));
          };
        } else {
          resolve(); // Event doesn't exist anymore
        }
      };

      getRequest.onerror = () => {
        reject(new Error(`Failed to get event for update: ${getRequest.error?.message}`));
      };
    });
  }

  async cleanupOldEvents(maxAgeDays: number): Promise<number> {
    if (!this.db) {
      throw new Error('EventPersistenceManager not initialized');
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('timestamp');
      
      const range = IDBKeyRange.upperBound(cutoffDate);
      const request = index.openCursor(range);
      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          resolve(deletedCount);
        }
      };

      request.onerror = () => {
        reject(new Error(`Failed to cleanup old events: ${request.error?.message}`));
      };
    });
  }

  async clearAllEvents(): Promise<void> {
    if (!this.db) {
      throw new Error('EventPersistenceManager not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => {
        reject(new Error(`Failed to clear events: ${request.error?.message}`));
      };
    });
  }

  async getStorageStats(): Promise<StorageStats> {
    const events = await this.getPendingEvents();
    
    if (events.length === 0) {
      return {
        totalEvents: 0,
        eventTypes: {},
        estimatedSizeKB: 0
      };
    }

    const eventTypes: Record<string, number> = {};
    let totalSizeEstimate = 0;

    for (const event of events) {
      eventTypes[event.type] = (eventTypes[event.type] || 0) + 1;
      
      // Rough size estimate (JSON serialized size)
      totalSizeEstimate += JSON.stringify(event).length;
    }

    const timestamps = events.map(e => new Date(e.timestamp));
    const oldestEvent = new Date(Math.min(...timestamps.map(d => d.getTime())));
    const newestEvent = new Date(Math.max(...timestamps.map(d => d.getTime())));

    return {
      totalEvents: events.length,
      oldestEvent,
      newestEvent,
      eventTypes,
      estimatedSizeKB: Math.round(totalSizeEstimate / 1024)
    };
  }

  private async enforceStorageLimits(): Promise<void> {
    const events = await this.getPendingEvents();
    
    if (events.length <= this.maxStoredEvents) {
      return;
    }

    // Remove oldest events beyond the limit
    const eventsToRemove = events
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(0, events.length - this.maxStoredEvents);

    for (const event of eventsToRemove) {
      await this.removeEvent(event.eventId);
    }
  }

  async isStorageAvailable(): Promise<boolean> {
    try {
      if (!this.db) {
        await this.initialize();
      }
      return true;
    } catch (error) {
      console.warn('Event persistence storage unavailable:', error);
      return false;
    }
  }

  // Graceful degradation - store in memory if IndexedDB fails
  private memoryFallback: Map<string, PersistedEvent> = new Map();

  async storeEventSafe(event: PersistedEvent): Promise<void> {
    try {
      await this.storeEvent(event);
    } catch (error) {
      console.warn('Falling back to memory storage:', error);
      this.memoryFallback.set(event.eventId, event);
      
      // Limit memory storage to prevent memory leaks
      if (this.memoryFallback.size > 100) {
        const oldestKey = this.memoryFallback.keys().next().value;
        if (oldestKey) {
          this.memoryFallback.delete(oldestKey);
        }
      }
    }
  }

  async getPendingEventsSafe(): Promise<PersistedEvent[]> {
    try {
      return await this.getPendingEvents();
    } catch (error) {
      console.warn('Using memory fallback for pending events:', error);
      return Array.from(this.memoryFallback.values());
    }
  }
}