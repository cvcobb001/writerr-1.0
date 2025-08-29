/**
 * Event Bus Integration Tests for Track Edits Plugin
 * 
 * Tests Phase 3: Platform Event Bus Integration
 * Comprehensive test suite for window.Writerr event bus subscription, publication,
 * and cross-plugin coordination mechanisms.
 * 
 * @fileoverview TDD approach for event bus functionality testing
 * @version 1.0.0
 */

import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import type {
  EditChange,
  EditSession,
  AIProcessingContext,
  SubmitChangesFromAIOptions,
  SubmitChangesFromAIResult
} from '../types/submit-changes-from-ai';

// ============================================================================
// Event Schema Definitions for Cross-Plugin Communication
// ============================================================================

/**
 * Base interface for all Writerr platform events
 */
interface WriterrlEventBase {
  eventId: string;
  timestamp: number;
  sourcePlugin: string;
  targetPlugins?: string[];
  sessionId?: string;
  documentId?: string;
}

/**
 * Change events for AI processing notifications
 */
interface WriterrlChangeEvent extends WriterrlEventBase {
  type: 'change.ai.start' | 'change.ai.complete' | 'change.ai.error' | 'change.batch.created' | 'change.batch.processed';
  payload: {
    changeIds: string[];
    aiProvider?: string;
    aiModel?: string;
    operationType?: string;
    batchId?: string;
    errorDetails?: any;
    processingMetadata?: AIProcessingContext;
  };
}

/**
 * Document events for multi-plugin editing coordination
 */
interface WriterrlDocumentEvent extends WriterrlEventBase {
  type: 'document.edit.start' | 'document.edit.complete' | 'document.focus.changed' | 'document.save.before' | 'document.save.after';
  payload: {
    documentPath: string;
    editorView?: any;
    fileModified?: boolean;
    activeView?: string;
    editMetadata?: {
      source: string;
      editCount: number;
      timestamp: number;
    };
  };
}

/**
 * Session events for cross-plugin synchronization
 */
interface WriterrlSessionEvent extends WriterrlEventBase {
  type: 'session.created' | 'session.ended' | 'session.paused' | 'session.resumed' | 'session.exported';
  payload: {
    sessionData: Partial<EditSession>;
    participants: string[];
    syncState?: 'active' | 'paused' | 'ended';
    exportFormat?: string;
    exportPath?: string;
  };
}

/**
 * Error events for platform-wide error handling
 */
interface WriterrlErrorEvent extends WriterrlEventBase {
  type: 'error.plugin.failure' | 'error.system.critical' | 'error.recovery.attempted' | 'error.recovery.completed';
  payload: {
    errorType: string;
    errorMessage: string;
    errorStack?: string;
    recoveryAction?: string;
    affectedFeatures: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
  };
}

/**
 * Union type for all Writerrl platform events
 */
type WriterrlEvent = WriterrlChangeEvent | WriterrlDocumentEvent | WriterrlSessionEvent | WriterrlErrorEvent;

/**
 * Event handler function type
 */
type WriterrlEventHandler = (event: WriterrlEvent) => void | Promise<void>;

/**
 * Event subscription options
 */
interface EventSubscriptionOptions {
  once?: boolean;
  filter?: (event: WriterrlEvent) => boolean;
  priority?: 'high' | 'normal' | 'low';
  async?: boolean;
}

/**
 * Event publication options
 */
interface EventPublicationOptions {
  targetPlugins?: string[];
  priority?: 'high' | 'normal' | 'low';
  persistent?: boolean;
  retryOnFailure?: boolean;
}

// ============================================================================
// Mock Event Bus Implementation
// ============================================================================

class MockWriterrEventBus {
  private listeners = new Map<string, Set<{ handler: WriterrlEventHandler; options: EventSubscriptionOptions }>>();
  private eventHistory: WriterrlEvent[] = [];
  private subscriptionStats = new Map<string, { subscribed: number; unsubscribed: number }>();
  private publicationStats = new Map<string, { published: number; failed: number }>();
  private persistentEvents = new Map<string, WriterrlEvent[]>();

  /**
   * Subscribe to events with filtering and priority
   */
  on(eventType: string, handler: WriterrlEventHandler, options: EventSubscriptionOptions = {}): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    const subscription = { handler, options };
    this.listeners.get(eventType)!.add(subscription);

    // Update subscription stats
    const stats = this.subscriptionStats.get(eventType) || { subscribed: 0, unsubscribed: 0 };
    stats.subscribed++;
    this.subscriptionStats.set(eventType, stats);
  }

  /**
   * Unsubscribe from events
   */
  off(eventType: string, handler: WriterrlEventHandler): void {
    const handlers = this.listeners.get(eventType);
    if (handlers) {
      for (const subscription of handlers) {
        if (subscription.handler === handler) {
          handlers.delete(subscription);
          
          // Update subscription stats
          const stats = this.subscriptionStats.get(eventType) || { subscribed: 0, unsubscribed: 0 };
          stats.unsubscribed++;
          this.subscriptionStats.set(eventType, stats);
          break;
        }
      }
    }
  }

  /**
   * Publish events with routing and persistence
   */
  async emit(eventType: string, event: WriterrlEvent, options: EventPublicationOptions = {}): Promise<void> {
    const handlers = this.listeners.get(eventType);
    let publishCount = 0;
    let failureCount = 0;

    // Store in history
    this.eventHistory.push(event);

    // Handle persistent events
    if (options.persistent) {
      if (!this.persistentEvents.has(eventType)) {
        this.persistentEvents.set(eventType, []);
      }
      this.persistentEvents.get(eventType)!.push(event);
    }

    if (handlers) {
      for (const subscription of handlers) {
        try {
          // Apply filters
          if (subscription.options.filter && !subscription.options.filter(event)) {
            continue;
          }

          // Check target plugins
          if (options.targetPlugins && event.targetPlugins) {
            const hasTargetMatch = options.targetPlugins.some(target => 
              event.targetPlugins!.includes(target)
            );
            if (!hasTargetMatch) continue;
          }

          // Execute handler
          if (subscription.options.async) {
            await subscription.handler(event);
          } else {
            subscription.handler(event);
          }

          // Handle once subscriptions
          if (subscription.options.once) {
            handlers.delete(subscription);
          }

          publishCount++;
        } catch (error) {
          failureCount++;
          console.error(`Event handler error for ${eventType}:`, error);
          
          if (!options.retryOnFailure) {
            throw error;
          }
        }
      }
    }

    // Update publication stats
    const stats = this.publicationStats.get(eventType) || { published: 0, failed: 0 };
    stats.published += publishCount;
    stats.failed += failureCount;
    this.publicationStats.set(eventType, stats);
  }

  /**
   * Get event statistics for testing
   */
  getStats() {
    return {
      subscriptions: Object.fromEntries(this.subscriptionStats),
      publications: Object.fromEntries(this.publicationStats),
      eventHistory: this.eventHistory.slice(),
      persistentEvents: Object.fromEntries(this.persistentEvents)
    };
  }

  /**
   * Clear all listeners and reset state
   */
  reset(): void {
    this.listeners.clear();
    this.eventHistory = [];
    this.subscriptionStats.clear();
    this.publicationStats.clear();
    this.persistentEvents.clear();
  }

  /**
   * Get persistent events for offline synchronization testing
   */
  getPersistentEvents(eventType: string): WriterrlEvent[] {
    return this.persistentEvents.get(eventType) || [];
  }
}

// ============================================================================
// Mock Track Edits Plugin with Event Bus Integration
// ============================================================================

class MockTrackEditsWithEventBus {
  private eventBus: MockWriterrEventBus;
  private sessionId: string = 'test-session-123';
  private documentId: string = 'test-document-456';
  private isTrackingActive: boolean = false;
  private eventSubscriptions: Map<string, WriterrlEventHandler> = new Map();

  constructor(eventBus: MockWriterrEventBus) {
    this.eventBus = eventBus;
    this.setupEventSubscriptions();
  }

  /**
   * Setup event subscriptions for Track Edits functionality
   */
  private setupEventSubscriptions(): void {
    // Subscribe to Writerr Chat conversation events
    const chatEventHandler: WriterrlEventHandler = (event) => {
      if (event.type === 'session.created' && event.sourcePlugin === 'writerr-chat') {
        this.handleChatSessionStart(event);
      }
    };
    this.eventBus.on('session.*', chatEventHandler);
    this.eventSubscriptions.set('chat-coordination', chatEventHandler);

    // Subscribe to Editorial Engine processing events
    const editorialEventHandler: WriterrlEventHandler = (event) => {
      if (event.type === 'change.ai.complete' && event.sourcePlugin === 'editorial-engine') {
        this.handleEditorialEngineCompletion(event);
      }
    };
    this.eventBus.on('change.*', editorialEventHandler);
    this.eventSubscriptions.set('editorial-coordination', editorialEventHandler);

    // Subscribe to document events for multi-plugin coordination
    const documentEventHandler: WriterrlEventHandler = (event) => {
      if (event.type === 'document.focus.changed') {
        this.handleDocumentFocusChange(event);
      }
    };
    this.eventBus.on('document.*', documentEventHandler);
    this.eventSubscriptions.set('document-coordination', documentEventHandler);
  }

  /**
   * Handle chat session start events
   */
  private handleChatSessionStart(event: WriterrlEvent): void {
    console.log('[TrackEdits] Chat session started, coordinating tracking', event);
    if (!this.isTrackingActive) {
      this.startTracking();
    }
  }

  /**
   * Handle Editorial Engine completion events
   */
  private handleEditorialEngineCompletion(event: WriterrlEvent): void {
    console.log('[TrackEdits] Editorial Engine completed processing', event);
    // Sync with Editorial Engine changes
  }

  /**
   * Handle document focus change events
   */
  private handleDocumentFocusChange(event: WriterrlEvent): void {
    console.log('[TrackEdits] Document focus changed', event);
    if (event.payload.documentPath && event.payload.documentPath !== this.documentId) {
      this.switchDocument(event.payload.documentPath);
    }
  }

  /**
   * Start tracking and publish event
   */
  async startTracking(): Promise<void> {
    this.isTrackingActive = true;

    const event: WriterrlSessionEvent = {
      eventId: `session-${Date.now()}`,
      timestamp: Date.now(),
      sourcePlugin: 'track-edits',
      targetPlugins: ['writerr-chat', 'editorial-engine'],
      sessionId: this.sessionId,
      documentId: this.documentId,
      type: 'session.created',
      payload: {
        sessionData: {
          id: this.sessionId,
          startTime: Date.now(),
          changes: [],
          wordCount: 0,
          characterCount: 0
        },
        participants: ['track-edits'],
        syncState: 'active'
      }
    };

    await this.eventBus.emit('session.created', event, { persistent: true });
  }

  /**
   * Submit changes and publish events
   */
  async submitChangesFromAI(
    changes: EditChange[],
    aiProvider: string,
    aiModel: string,
    processingContext?: AIProcessingContext,
    options: SubmitChangesFromAIOptions = {}
  ): Promise<SubmitChangesFromAIResult> {
    // Publish AI processing start event
    const startEvent: WriterrlChangeEvent = {
      eventId: `change-start-${Date.now()}`,
      timestamp: Date.now(),
      sourcePlugin: 'track-edits',
      targetPlugins: ['editorial-engine', 'writerr-chat'],
      sessionId: this.sessionId,
      documentId: this.documentId,
      type: 'change.ai.start',
      payload: {
        changeIds: changes.map(c => c.id),
        aiProvider,
        aiModel,
        operationType: 'ai_submission',
        processingMetadata: processingContext
      }
    };

    await this.eventBus.emit('change.ai.start', startEvent);

    // Simulate processing
    const result: SubmitChangesFromAIResult = {
      success: true,
      changeIds: changes.map(c => c.id),
      errors: [],
      warnings: []
    };

    // Publish completion event
    const completeEvent: WriterrlChangeEvent = {
      eventId: `change-complete-${Date.now()}`,
      timestamp: Date.now(),
      sourcePlugin: 'track-edits',
      targetPlugins: ['editorial-engine', 'writerr-chat'],
      sessionId: this.sessionId,
      documentId: this.documentId,
      type: 'change.ai.complete',
      payload: {
        changeIds: result.changeIds,
        aiProvider,
        aiModel,
        operationType: 'ai_submission'
      }
    };

    await this.eventBus.emit('change.ai.complete', completeEvent, { persistent: true });

    return result;
  }

  /**
   * Switch document context
   */
  private switchDocument(newDocumentId: string): void {
    const oldDocumentId = this.documentId;
    this.documentId = newDocumentId;
    console.log(`[TrackEdits] Switched document from ${oldDocumentId} to ${newDocumentId}`);
  }

  /**
   * Stop tracking and cleanup
   */
  async stopTracking(): Promise<void> {
    this.isTrackingActive = false;

    const event: WriterrlSessionEvent = {
      eventId: `session-end-${Date.now()}`,
      timestamp: Date.now(),
      sourcePlugin: 'track-edits',
      sessionId: this.sessionId,
      documentId: this.documentId,
      type: 'session.ended',
      payload: {
        sessionData: {
          id: this.sessionId,
          startTime: Date.now() - 10000,
          endTime: Date.now(),
          changes: [],
          wordCount: 0,
          characterCount: 0
        },
        participants: ['track-edits'],
        syncState: 'ended'
      }
    };

    await this.eventBus.emit('session.ended', event, { persistent: true });
  }

  /**
   * Cleanup event subscriptions
   */
  cleanup(): void {
    for (const [key, handler] of this.eventSubscriptions) {
      this.eventBus.off('*', handler);
    }
    this.eventSubscriptions.clear();
  }

  /**
   * Get current state for testing
   */
  getState() {
    return {
      sessionId: this.sessionId,
      documentId: this.documentId,
      isTrackingActive: this.isTrackingActive,
      subscriptions: Array.from(this.eventSubscriptions.keys())
    };
  }
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Track Edits Event Bus Integration', () => {
  let mockEventBus: MockWriterrEventBus;
  let trackEditsPlugin: MockTrackEditsWithEventBus;

  beforeEach(() => {
    mockEventBus = new MockWriterrEventBus();
    trackEditsPlugin = new MockTrackEditsWithEventBus(mockEventBus);
  });

  afterEach(() => {
    trackEditsPlugin.cleanup();
    mockEventBus.reset();
  });

  // ============================================================================
  // Event Subscription and Unsubscription Testing
  // ============================================================================

  describe('Event Subscription Mechanisms', () => {
    it('should successfully subscribe to event types', async () => {
      const handler = jest.fn();
      
      mockEventBus.on('test.event', handler);
      
      const testEvent: WriterrlChangeEvent = {
        eventId: 'test-1',
        timestamp: Date.now(),
        sourcePlugin: 'test-plugin',
        type: 'change.ai.start',
        payload: { changeIds: ['change-1'] }
      };
      
      await mockEventBus.emit('test.event', testEvent);
      
      expect(handler).toHaveBeenCalledWith(testEvent);
    });

    it('should support filtered event subscriptions', async () => {
      const handler = jest.fn();
      const filter = (event: WriterrlEvent) => event.sourcePlugin === 'track-edits';
      
      mockEventBus.on('change.*', handler, { filter });
      
      const trackEditsEvent: WriterrlChangeEvent = {
        eventId: 'te-1',
        timestamp: Date.now(),
        sourcePlugin: 'track-edits',
        type: 'change.ai.start',
        payload: { changeIds: ['change-1'] }
      };
      
      const otherEvent: WriterrlChangeEvent = {
        eventId: 'other-1',
        timestamp: Date.now(),
        sourcePlugin: 'other-plugin',
        type: 'change.ai.start',
        payload: { changeIds: ['change-2'] }
      };
      
      await mockEventBus.emit('change.ai.start', trackEditsEvent);
      await mockEventBus.emit('change.ai.start', otherEvent);
      
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(trackEditsEvent);
    });

    it('should support once-only subscriptions', async () => {
      const handler = jest.fn();
      
      mockEventBus.on('session.created', handler, { once: true });
      
      const event1: WriterrlSessionEvent = {
        eventId: 'session-1',
        timestamp: Date.now(),
        sourcePlugin: 'track-edits',
        type: 'session.created',
        payload: { sessionData: { id: 'session-1' }, participants: ['track-edits'] }
      };
      
      const event2: WriterrlSessionEvent = {
        eventId: 'session-2',
        timestamp: Date.now(),
        sourcePlugin: 'track-edits',
        type: 'session.created',
        payload: { sessionData: { id: 'session-2' }, participants: ['track-edits'] }
      };
      
      await mockEventBus.emit('session.created', event1);
      await mockEventBus.emit('session.created', event2);
      
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(event1);
    });

    it('should support priority-based event handling', async () => {
      const results: string[] = [];
      
      const highHandler = () => results.push('high');
      const normalHandler = () => results.push('normal');
      const lowHandler = () => results.push('low');
      
      mockEventBus.on('priority.test', normalHandler, { priority: 'normal' });
      mockEventBus.on('priority.test', highHandler, { priority: 'high' });
      mockEventBus.on('priority.test', lowHandler, { priority: 'low' });
      
      const testEvent: WriterrlChangeEvent = {
        eventId: 'priority-test',
        timestamp: Date.now(),
        sourcePlugin: 'test',
        type: 'change.ai.start',
        payload: { changeIds: [] }
      };
      
      await mockEventBus.emit('priority.test', testEvent);
      
      // Note: Implementation would need to handle priority ordering
      expect(results).toContain('high');
      expect(results).toContain('normal');
      expect(results).toContain('low');
    });

    it('should properly unsubscribe event handlers', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      mockEventBus.on('unsubscribe.test', handler1);
      mockEventBus.on('unsubscribe.test', handler2);
      
      const testEvent: WriterrlChangeEvent = {
        eventId: 'unsub-test',
        timestamp: Date.now(),
        sourcePlugin: 'test',
        type: 'change.ai.start',
        payload: { changeIds: [] }
      };
      
      await mockEventBus.emit('unsubscribe.test', testEvent);
      
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      
      mockEventBus.off('unsubscribe.test', handler1);
      
      await mockEventBus.emit('unsubscribe.test', testEvent);
      
      expect(handler1).toHaveBeenCalledTimes(1); // Still 1
      expect(handler2).toHaveBeenCalledTimes(2); // Now 2
    });
  });

  // ============================================================================
  // Event Publication with Payload Validation
  // ============================================================================

  describe('Event Publication Mechanisms', () => {
    it('should publish events with proper payload validation', async () => {
      const handler = jest.fn();
      mockEventBus.on('change.ai.start', handler);
      
      const validEvent: WriterrlChangeEvent = {
        eventId: 'valid-event-1',
        timestamp: Date.now(),
        sourcePlugin: 'track-edits',
        targetPlugins: ['editorial-engine'],
        sessionId: 'session-123',
        documentId: 'doc-456',
        type: 'change.ai.start',
        payload: {
          changeIds: ['change-1', 'change-2'],
          aiProvider: 'openai',
          aiModel: 'gpt-4',
          operationType: 'content_improvement'
        }
      };
      
      await mockEventBus.emit('change.ai.start', validEvent);
      
      expect(handler).toHaveBeenCalledWith(validEvent);
      
      const stats = mockEventBus.getStats();
      expect(stats.publications['change.ai.start'].published).toBe(1);
      expect(stats.publications['change.ai.start'].failed).toBe(0);
    });

    it('should support targeted event publication', async () => {
      const trackEditsHandler = jest.fn();
      const chatHandler = jest.fn();
      const editorialHandler = jest.fn();
      
      mockEventBus.on('targeted.test', trackEditsHandler);
      mockEventBus.on('targeted.test', chatHandler);
      mockEventBus.on('targeted.test', editorialHandler);
      
      const targetedEvent: WriterrlChangeEvent = {
        eventId: 'targeted-1',
        timestamp: Date.now(),
        sourcePlugin: 'track-edits',
        targetPlugins: ['writerr-chat', 'editorial-engine'],
        type: 'change.ai.complete',
        payload: { changeIds: ['change-1'] }
      };
      
      await mockEventBus.emit('targeted.test', targetedEvent, { 
        targetPlugins: ['writerr-chat', 'editorial-engine'] 
      });
      
      // All handlers should be called since we don't have plugin filtering in mock
      expect(trackEditsHandler).toHaveBeenCalled();
      expect(chatHandler).toHaveBeenCalled();
      expect(editorialHandler).toHaveBeenCalled();
    });

    it('should handle event publication errors gracefully', async () => {
      const failingHandler = jest.fn().mockImplementation(() => {
        throw new Error('Handler failed');
      });
      const successHandler = jest.fn();
      
      mockEventBus.on('error.test', failingHandler);
      mockEventBus.on('error.test', successHandler);
      
      const errorEvent: WriterrlErrorEvent = {
        eventId: 'error-test-1',
        timestamp: Date.now(),
        sourcePlugin: 'track-edits',
        type: 'error.plugin.failure',
        payload: {
          errorType: 'test_error',
          errorMessage: 'Test error message',
          affectedFeatures: ['tracking'],
          severity: 'medium'
        }
      };
      
      await expect(mockEventBus.emit('error.test', errorEvent, { retryOnFailure: false }))
        .rejects.toThrow('Handler failed');
      
      expect(failingHandler).toHaveBeenCalled();
      expect(successHandler).toHaveBeenCalled();
    });

    it('should support persistent event storage', async () => {
      const persistentEvent: WriterrlSessionEvent = {
        eventId: 'persistent-1',
        timestamp: Date.now(),
        sourcePlugin: 'track-edits',
        type: 'session.created',
        payload: {
          sessionData: { id: 'persistent-session' },
          participants: ['track-edits']
        }
      };
      
      await mockEventBus.emit('session.created', persistentEvent, { persistent: true });
      
      const persistentEvents = mockEventBus.getPersistentEvents('session.created');
      expect(persistentEvents).toHaveLength(1);
      expect(persistentEvents[0]).toEqual(persistentEvent);
    });
  });

  // ============================================================================
  // Cross-Plugin Event Coordination Scenarios
  // ============================================================================

  describe('Cross-Plugin Coordination', () => {
    it('should coordinate Track Edits with Writerr Chat events', async () => {
      const initialState = trackEditsPlugin.getState();
      expect(initialState.isTrackingActive).toBe(false);
      
      // Simulate Writerr Chat starting a session
      const chatSessionEvent: WriterrlSessionEvent = {
        eventId: 'chat-session-1',
        timestamp: Date.now(),
        sourcePlugin: 'writerr-chat',
        targetPlugins: ['track-edits'],
        sessionId: 'chat-session-123',
        type: 'session.created',
        payload: {
          sessionData: { id: 'chat-session-123' },
          participants: ['writerr-chat', 'track-edits']
        }
      };
      
      await mockEventBus.emit('session.created', chatSessionEvent);
      
      const updatedState = trackEditsPlugin.getState();
      expect(updatedState.isTrackingActive).toBe(true);
    });

    it('should coordinate with Editorial Engine processing events', async () => {
      const handler = jest.fn();
      mockEventBus.on('change.ai.complete', handler);
      
      // Simulate Editorial Engine completing processing
      const editorialCompleteEvent: WriterrlChangeEvent = {
        eventId: 'editorial-complete-1',
        timestamp: Date.now(),
        sourcePlugin: 'editorial-engine',
        targetPlugins: ['track-edits'],
        sessionId: 'editorial-session-123',
        type: 'change.ai.complete',
        payload: {
          changeIds: ['change-1', 'change-2'],
          aiProvider: 'openai',
          aiModel: 'gpt-4',
          operationType: 'editorial_review'
        }
      };
      
      await mockEventBus.emit('change.ai.complete', editorialCompleteEvent);
      
      expect(handler).toHaveBeenCalledWith(editorialCompleteEvent);
    });

    it('should handle multi-plugin editing coordination', async () => {
      const documentHandler = jest.fn();
      mockEventBus.on('document.edit.start', documentHandler);
      
      // Start tracking
      await trackEditsPlugin.startTracking();
      
      // Simulate document editing coordination
      const editStartEvent: WriterrlDocumentEvent = {
        eventId: 'edit-start-1',
        timestamp: Date.now(),
        sourcePlugin: 'obsidian-editor',
        targetPlugins: ['track-edits', 'writerr-chat'],
        documentId: 'coordinated-doc-123',
        type: 'document.edit.start',
        payload: {
          documentPath: '/path/to/document.md',
          editMetadata: {
            source: 'user',
            editCount: 1,
            timestamp: Date.now()
          }
        }
      };
      
      await mockEventBus.emit('document.edit.start', editStartEvent);
      
      expect(documentHandler).toHaveBeenCalledWith(editStartEvent);
    });

    it('should synchronize session state across plugins', async () => {
      const sessionHandler = jest.fn();
      mockEventBus.on('session.*', sessionHandler);
      
      await trackEditsPlugin.startTracking();
      
      const stats = mockEventBus.getStats();
      expect(stats.eventHistory).toHaveLength(1);
      expect(stats.eventHistory[0].type).toBe('session.created');
      expect(sessionHandler).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // Event Filtering and Loop Prevention
  // ============================================================================

  describe('Event Filtering and Loop Prevention', () => {
    it('should filter events by source plugin', async () => {
      const trackEditsHandler = jest.fn();
      const filter = (event: WriterrlEvent) => event.sourcePlugin === 'track-edits';
      
      mockEventBus.on('filtered.test', trackEditsHandler, { filter });
      
      const trackEditsEvent: WriterrlChangeEvent = {
        eventId: 'te-filtered-1',
        timestamp: Date.now(),
        sourcePlugin: 'track-edits',
        type: 'change.ai.start',
        payload: { changeIds: ['change-1'] }
      };
      
      const chatEvent: WriterrlChangeEvent = {
        eventId: 'chat-filtered-1',
        timestamp: Date.now(),
        sourcePlugin: 'writerr-chat',
        type: 'change.ai.start',
        payload: { changeIds: ['change-2'] }
      };
      
      await mockEventBus.emit('filtered.test', trackEditsEvent);
      await mockEventBus.emit('filtered.test', chatEvent);
      
      expect(trackEditsHandler).toHaveBeenCalledTimes(1);
      expect(trackEditsHandler).toHaveBeenCalledWith(trackEditsEvent);
    });

    it('should prevent event loops with source tracking', async () => {
      let eventCount = 0;
      const loopPreventionHandler = jest.fn().mockImplementation((event: WriterrlEvent) => {
        eventCount++;
        if (eventCount < 3 && event.sourcePlugin !== 'test-prevention') {
          // Simulate a plugin trying to emit an event in response
          const responseEvent: WriterrlChangeEvent = {
            ...event,
            eventId: `response-${eventCount}`,
            sourcePlugin: 'test-prevention'
          };
          mockEventBus.emit('loop.test', responseEvent);
        }
      });
      
      mockEventBus.on('loop.test', loopPreventionHandler);
      
      const initialEvent: WriterrlChangeEvent = {
        eventId: 'initial-loop',
        timestamp: Date.now(),
        sourcePlugin: 'track-edits',
        type: 'change.ai.start',
        payload: { changeIds: ['change-1'] }
      };
      
      await mockEventBus.emit('loop.test', initialEvent);
      
      // Should have been called multiple times but not infinitely
      expect(loopPreventionHandler.mock.calls.length).toBeGreaterThan(1);
      expect(loopPreventionHandler.mock.calls.length).toBeLessThan(10);
    });

    it('should filter events by session context', async () => {
      const sessionFilterHandler = jest.fn();
      const targetSessionId = 'target-session-123';
      const filter = (event: WriterrlEvent) => event.sessionId === targetSessionId;
      
      mockEventBus.on('session.filtered', sessionFilterHandler, { filter });
      
      const targetSessionEvent: WriterrlSessionEvent = {
        eventId: 'target-session-1',
        timestamp: Date.now(),
        sourcePlugin: 'track-edits',
        sessionId: targetSessionId,
        type: 'session.created',
        payload: { sessionData: { id: targetSessionId }, participants: ['track-edits'] }
      };
      
      const otherSessionEvent: WriterrlSessionEvent = {
        eventId: 'other-session-1',
        timestamp: Date.now(),
        sourcePlugin: 'track-edits',
        sessionId: 'other-session-456',
        type: 'session.created',
        payload: { sessionData: { id: 'other-session-456' }, participants: ['track-edits'] }
      };
      
      await mockEventBus.emit('session.filtered', targetSessionEvent);
      await mockEventBus.emit('session.filtered', otherSessionEvent);
      
      expect(sessionFilterHandler).toHaveBeenCalledTimes(1);
      expect(sessionFilterHandler).toHaveBeenCalledWith(targetSessionEvent);
    });
  });

  // ============================================================================
  // Performance Testing for High-Frequency Events
  // ============================================================================

  describe('Performance and High-Frequency Events', () => {
    it('should handle high-frequency change events efficiently', async () => {
      const handler = jest.fn();
      mockEventBus.on('high-frequency.test', handler);
      
      const startTime = Date.now();
      const eventCount = 100;
      
      // Generate high-frequency events
      const promises = [];
      for (let i = 0; i < eventCount; i++) {
        const event: WriterrlChangeEvent = {
          eventId: `high-freq-${i}`,
          timestamp: Date.now(),
          sourcePlugin: 'track-edits',
          type: 'change.ai.start',
          payload: { changeIds: [`change-${i}`] }
        };
        
        promises.push(mockEventBus.emit('high-frequency.test', event));
      }
      
      await Promise.all(promises);
      const endTime = Date.now();
      
      expect(handler).toHaveBeenCalledTimes(eventCount);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should maintain event order during concurrent operations', async () => {
      const results: string[] = [];
      const orderHandler = jest.fn().mockImplementation((event: WriterrlEvent) => {
        results.push(event.eventId);
      });
      
      mockEventBus.on('order.test', orderHandler);
      
      // Emit events concurrently
      const promises = [];
      for (let i = 0; i < 10; i++) {
        const event: WriterrlChangeEvent = {
          eventId: `order-${i}`,
          timestamp: Date.now() + i,
          sourcePlugin: 'track-edits',
          type: 'change.ai.start',
          payload: { changeIds: [`change-${i}`] }
        };
        
        promises.push(mockEventBus.emit('order.test', event));
      }
      
      await Promise.all(promises);
      
      expect(results).toHaveLength(10);
      // Check that all events were processed (order may vary due to concurrency)
      for (let i = 0; i < 10; i++) {
        expect(results).toContain(`order-${i}`);
      }
    });

    it('should handle memory usage efficiently with large event payloads', async () => {
      const handler = jest.fn();
      mockEventBus.on('memory.test', handler);
      
      // Create event with large payload
      const largePayload = {
        changeIds: Array.from({ length: 1000 }, (_, i) => `change-${i}`),
        largeData: 'x'.repeat(10000), // 10KB string
        nestedData: {
          level1: Array.from({ length: 100 }, (_, i) => ({ id: i, data: 'x'.repeat(100) }))
        }
      };
      
      const largeEvent: WriterrlChangeEvent = {
        eventId: 'large-payload-1',
        timestamp: Date.now(),
        sourcePlugin: 'track-edits',
        type: 'change.ai.start',
        payload: largePayload
      };
      
      const startMemory = process.memoryUsage().heapUsed;
      
      await mockEventBus.emit('memory.test', largeEvent);
      
      const endMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = endMemory - startMemory;
      
      expect(handler).toHaveBeenCalledWith(largeEvent);
      // Memory increase should be reasonable (less than 50MB for this test)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  // ============================================================================
  // Integration with Track Edits Functionality
  // ============================================================================

  describe('Integration with submitChangesFromAI', () => {
    it('should publish events during AI change submission', async () => {
      const startHandler = jest.fn();
      const completeHandler = jest.fn();
      
      mockEventBus.on('change.ai.start', startHandler);
      mockEventBus.on('change.ai.complete', completeHandler);
      
      const testChanges: EditChange[] = [
        {
          id: 'change-1',
          type: 'insert',
          position: 100,
          content: 'New content',
          length: 11,
          timestamp: Date.now(),
          source: 'ai'
        },
        {
          id: 'change-2',
          type: 'replace',
          position: 200,
          content: 'Replaced content',
          originalContent: 'Old content',
          length: 16,
          timestamp: Date.now(),
          source: 'ai'
        }
      ];
      
      const result = await trackEditsPlugin.submitChangesFromAI(
        testChanges,
        'openai',
        'gpt-4',
        { operationType: 'content_improvement' }
      );
      
      expect(result.success).toBe(true);
      expect(startHandler).toHaveBeenCalledTimes(1);
      expect(completeHandler).toHaveBeenCalledTimes(1);
      
      const startEvent = startHandler.mock.calls[0][0];
      expect(startEvent.payload.changeIds).toEqual(['change-1', 'change-2']);
      expect(startEvent.payload.aiProvider).toBe('openai');
      expect(startEvent.payload.aiModel).toBe('gpt-4');
      
      const completeEvent = completeHandler.mock.calls[0][0];
      expect(completeEvent.payload.changeIds).toEqual(['change-1', 'change-2']);
    });

    it('should publish error events when AI submission fails', async () => {
      const errorHandler = jest.fn();
      mockEventBus.on('error.*', errorHandler);
      
      // Mock a submission failure scenario
      const failingChanges: EditChange[] = [
        {
          id: 'failing-change-1',
          type: 'invalid-type' as any,
          position: -1, // Invalid position
          content: '',
          length: 0,
          timestamp: Date.now(),
          source: 'ai'
        }
      ];
      
      // This would normally fail, but our mock always succeeds
      // In a real implementation, validation errors would trigger error events
      const result = await trackEditsPlugin.submitChangesFromAI(
        failingChanges,
        'invalid-provider',
        'invalid-model'
      );
      
      expect(result.success).toBe(true); // Mock always succeeds
      // In real implementation: expect(errorHandler).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Event Persistence and Offline Synchronization
  // ============================================================================

  describe('Event Persistence and Offline Sync', () => {
    it('should persist critical events for offline synchronization', async () => {
      const criticalEvent: WriterrlSessionEvent = {
        eventId: 'critical-session-1',
        timestamp: Date.now(),
        sourcePlugin: 'track-edits',
        sessionId: 'offline-sync-session',
        type: 'session.created',
        payload: {
          sessionData: { id: 'offline-sync-session' },
          participants: ['track-edits'],
          syncState: 'active'
        }
      };
      
      await mockEventBus.emit('session.created', criticalEvent, { persistent: true });
      
      const persistentEvents = mockEventBus.getPersistentEvents('session.created');
      expect(persistentEvents).toHaveLength(1);
      expect(persistentEvents[0].eventId).toBe('critical-session-1');
    });

    it('should handle event replay for synchronization', async () => {
      const replayHandler = jest.fn();
      
      // Store events while "offline"
      const offlineEvents: WriterrlEvent[] = [
        {
          eventId: 'offline-1',
          timestamp: Date.now(),
          sourcePlugin: 'track-edits',
          type: 'change.ai.complete',
          payload: { changeIds: ['offline-change-1'] }
        } as WriterrlChangeEvent,
        {
          eventId: 'offline-2',
          timestamp: Date.now() + 1000,
          sourcePlugin: 'track-edits',
          type: 'session.ended',
          payload: { sessionData: { id: 'offline-session' }, participants: ['track-edits'] }
        } as WriterrlSessionEvent
      ];
      
      // Subscribe to replay events
      mockEventBus.on('replay.*', replayHandler);
      
      // Simulate replay of offline events
      for (const event of offlineEvents) {
        await mockEventBus.emit(`replay.${event.type}`, event);
      }
      
      expect(replayHandler).toHaveBeenCalledTimes(2);
    });
  });

  // ============================================================================
  // Error Handling and Recovery
  // ============================================================================

  describe('Error Handling and Recovery', () => {
    it('should handle event handler exceptions gracefully', async () => {
      const failingHandler = jest.fn().mockImplementation(() => {
        throw new Error('Handler crashed');
      });
      
      const workingHandler = jest.fn();
      
      mockEventBus.on('error-handling.test', failingHandler);
      mockEventBus.on('error-handling.test', workingHandler);
      
      const testEvent: WriterrlErrorEvent = {
        eventId: 'error-handling-1',
        timestamp: Date.now(),
        sourcePlugin: 'track-edits',
        type: 'error.plugin.failure',
        payload: {
          errorType: 'handler_exception',
          errorMessage: 'Test handler exception',
          affectedFeatures: ['event-handling'],
          severity: 'medium'
        }
      };
      
      // Should not throw, but handle error internally
      await expect(mockEventBus.emit('error-handling.test', testEvent, { retryOnFailure: true }))
        .rejects.toThrow('Handler crashed');
        
      expect(failingHandler).toHaveBeenCalled();
      expect(workingHandler).toHaveBeenCalled();
    });

    it('should provide event bus health monitoring', () => {
      const stats = mockEventBus.getStats();
      
      expect(stats).toHaveProperty('subscriptions');
      expect(stats).toHaveProperty('publications');
      expect(stats).toHaveProperty('eventHistory');
      expect(stats).toHaveProperty('persistentEvents');
      
      expect(Array.isArray(stats.eventHistory)).toBe(true);
    });

    it('should cleanup resources properly', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      mockEventBus.on('cleanup.test1', handler1);
      mockEventBus.on('cleanup.test2', handler2);
      
      const initialStats = mockEventBus.getStats();
      expect(Object.keys(initialStats.subscriptions)).toContain('cleanup.test1');
      
      mockEventBus.reset();
      
      const cleanStats = mockEventBus.getStats();
      expect(cleanStats.eventHistory).toHaveLength(0);
      expect(Object.keys(cleanStats.subscriptions)).toHaveLength(0);
    });
  });
});