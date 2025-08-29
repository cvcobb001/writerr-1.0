// Shared test utilities for Track Edits plugin testing

import { EditChange, EditSession } from '../../../../shared/types';

/**
 * Create a mock EditChange object for testing
 */
export function createMockEditChange(overrides: Partial<EditChange> = {}): EditChange {
  return {
    id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    type: 'replace',
    from: 0,
    to: 10,
    text: 'modified text',
    removedText: 'original text',
    ...overrides
  };
}

/**
 * Create a mock AI-enhanced EditChange object for testing
 */
export function createMockAIEditChange(overrides: Partial<EditChange> = {}): EditChange {
  return createMockEditChange({
    aiProvider: 'anthropic',
    aiModel: 'claude-3-opus',
    processingContext: {
      constraints: ['maintain tone', 'improve clarity'],
      prompt: 'Claude, do a copy edit pass',
      mode: 'edit',
      instructions: 'Improve grammar and clarity while maintaining the author\'s voice'
    },
    aiTimestamp: new Date(),
    ...overrides
  });
}

/**
 * Create a mock EditSession object for testing
 */
export function createMockEditSession(overrides: Partial<EditSession> = {}): EditSession {
  return {
    id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    startTime: Date.now(),
    changes: [],
    wordCount: 0,
    characterCount: 0,
    ...overrides
  };
}

/**
 * Create multiple mock changes for batch testing
 */
export function createMockChangesBatch(count: number, baseChange: Partial<EditChange> = {}): EditChange[] {
  return Array.from({ length: count }, (_, index) => 
    createMockEditChange({
      from: index * 20,
      to: index * 20 + 10,
      removedText: `original text ${index + 1}`,
      text: `modified text ${index + 1}`,
      ...baseChange
    })
  );
}

/**
 * Create multiple mock AI changes for batch testing
 */
export function createMockAIChangesBatch(count: number, baseChange: Partial<EditChange> = {}): EditChange[] {
  return Array.from({ length: count }, (_, index) => 
    createMockAIEditChange({
      from: index * 20,
      to: index * 20 + 10,
      removedText: `original text ${index + 1}`,
      text: `AI modified text ${index + 1}`,
      ...baseChange
    })
  );
}

/**
 * Mock Obsidian Plugin class for testing
 */
export class MockObsidianPlugin {
  app: any;
  manifest: any;
  settings: any = {};

  constructor() {
    this.app = global.mockApp;
    this.manifest = {
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0'
    };
  }

  async loadData() {
    return Promise.resolve(this.settings);
  }

  async saveData(data: any) {
    this.settings = data;
    return Promise.resolve();
  }

  addCommand() {}
  addRibbonIcon() {}
  addSettingTab() {}
  registerView() {}
  registerEditorExtension() {}
}

/**
 * Mock Event Bus Connection for testing
 */
export class MockEventBusConnection {
  private connected = true;
  private subscribers = new Map<string, Function[]>();
  private publishedEvents: Array<{ type: string; data: any; timestamp: Date }> = [];

  isConnected(): boolean {
    return this.connected;
  }

  setConnected(connected: boolean): void {
    this.connected = connected;
  }

  async connect(): Promise<boolean> {
    this.connected = true;
    return true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  on(eventType: string, handler: Function): void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    this.subscribers.get(eventType)!.push(handler);
  }

  subscribe(eventType: string, handler: Function): void {
    this.on(eventType, handler);
  }

  off(eventType: string, handler: Function): void {
    const handlers = this.subscribers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  async publish(eventType: string, data: any, _options?: any): Promise<void> {
    if (!this.connected) {
      throw new Error('Event bus not connected');
    }

    const event = {
      type: eventType,
      data,
      timestamp: new Date()
    };

    this.publishedEvents.push(event);

    // Trigger subscribers
    const handlers = this.subscribers.get(eventType) || [];
    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error(`Error in event handler for ${eventType}:`, error);
      }
    }
  }

  getPublishedEvents(): Array<{ type: string; data: any; timestamp: Date }> {
    return [...this.publishedEvents];
  }

  clearPublishedEvents(): void {
    this.publishedEvents = [];
  }

  getSubscriberCount(eventType: string): number {
    return this.subscribers.get(eventType)?.length || 0;
  }
}

/**
 * Wait for a promise to resolve with timeout
 */
export function waitForPromise<T>(promise: Promise<T>, timeout = 5000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('Promise timeout')), timeout)
    )
  ]);
}

/**
 * Wait for a specific condition to be true
 */
export function waitForCondition(
  condition: () => boolean, 
  timeout = 5000, 
  interval = 100
): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error('Condition timeout'));
      } else {
        setTimeout(check, interval);
      }
    };
    
    check();
  });
}

/**
 * Mock IndexedDB for testing
 */
export function mockIndexedDB() {
  // The fake-indexeddb is already set up in jest.setup.js
  // This function can be used for additional setup if needed
  return {
    clear: () => {
      // Clear all data from fake IndexedDB
      global.indexedDB = require('fake-indexeddb');
    }
  };
}

/**
 * Create a mock DOM element for testing
 */
export function createMockElement(tag = 'div'): HTMLElement {
  return document.createElement(tag);
}

/**
 * Advanced timer utilities for testing async operations
 */
export class TestTimers {
  static async advanceTimers(ms: number): Promise<void> {
    jest.advanceTimersByTime(ms);
    await new Promise(resolve => setImmediate(resolve));
  }

  static async runAllTimers(): Promise<void> {
    jest.runAllTimers();
    await new Promise(resolve => setImmediate(resolve));
  }

  static async runOnlyPendingTimers(): Promise<void> {
    jest.runOnlyPendingTimers();
    await new Promise(resolve => setImmediate(resolve));
  }
}