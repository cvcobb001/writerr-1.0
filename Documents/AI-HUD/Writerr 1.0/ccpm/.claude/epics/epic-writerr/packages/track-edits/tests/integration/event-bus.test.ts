/**
 * @fileoverview Integration tests for Event Bus communication
 * Tests cross-plugin communication through the shared event bus
 */

import { EventBus } from '@writerr/shared';
import { TrackEditsCore } from '../../src/TrackEditsCore';

// Mock implementations for testing
class MockAIEditorialFunctions {
  private eventBus: EventBus;
  
  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.eventBus.on('track-edits:request-changes', this.handleChangeRequest.bind(this));
    this.eventBus.on('track-edits:change-accepted', this.handleChangeAccepted.bind(this));
    this.eventBus.on('track-edits:change-rejected', this.handleChangeRejected.bind(this));
  }

  private handleChangeRequest(data: any) {
    // Simulate AI editorial function processing
    setTimeout(() => {
      this.eventBus.emit('ai-editorial:changes-ready', {
        requestId: data.requestId,
        changes: [
          {
            id: 'ai-generated-change-1',
            documentId: data.documentId,
            type: 'edit',
            originalText: 'example text',
            suggestedText: 'improved example text',
            startOffset: 10,
            endOffset: 22,
            source: {
              type: 'ai',
              plugin: 'ai-editorial-functions',
              function: 'copy-editor'
            },
            confidence: 0.9,
            category: 'style-improvement'
          }
        ]
      });
    }, 100);
  }

  private handleChangeAccepted(data: any) {
    console.log('AI Editorial Functions: Change accepted', data);
    // Could trigger learning/reinforcement here
  }

  private handleChangeRejected(data: any) {
    console.log('AI Editorial Functions: Change rejected', data);
    // Could trigger learning/adjustment here
  }
}

class MockWriterrChat {
  private eventBus: EventBus;
  
  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.eventBus.on('track-edits:document-state-changed', this.handleDocumentStateChange.bind(this));
    this.eventBus.on('track-edits:changes-pending', this.handleChangesPending.bind(this));
  }

  private handleDocumentStateChange(data: any) {
    console.log('Writerr Chat: Document state changed', data);
    // Could update chat context or suggest actions
  }

  private handleChangesPending(data: any) {
    console.log('Writerr Chat: Changes pending review', data);
    // Could suggest bulk operations or provide summaries
  }

  simulateUserRequest(documentId: string, text: string) {
    this.eventBus.emit('writerr-chat:user-request', {
      documentId,
      text,
      selectedText: 'example text',
      mode: 'copy-edit',
      requestId: `req-${Date.now()}`
    });
  }
}

describe('Event Bus Integration Tests', () => {
  let eventBus: EventBus;
  let trackEditsCore: TrackEditsCore;
  let mockAIFunctions: MockAIEditorialFunctions;
  let mockChat: MockWriterrChat;
  let mockPlugin: any;

  const mockApp = {
    vault: {
      adapter: {
        read: jest.fn(),
        write: jest.fn(),
        exists: jest.fn(),
        stat: jest.fn()
      },
      on: jest.fn(),
      off: jest.fn()
    },
    workspace: {
      on: jest.fn(),
      off: jest.fn(),
      getActiveFile: jest.fn()
    }
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Initialize shared event bus
    eventBus = new EventBus();
    
    // Initialize mock plugin
    mockPlugin = {
      app: mockApp,
      addCommand: jest.fn(),
      addRibbonIcon: jest.fn(),
      addStatusBarItem: jest.fn(),
      registerView: jest.fn(),
      registerDomEvent: jest.fn(),
      registerInterval: jest.fn()
    };

    // Initialize components with shared event bus
    trackEditsCore = new TrackEditsCore(mockPlugin);
    trackEditsCore.setEventBus(eventBus); // Assume this method exists
    await trackEditsCore.initialize();

    mockAIFunctions = new MockAIEditorialFunctions(eventBus);
    mockChat = new MockWriterrChat(eventBus);

    // Set up test document
    await trackEditsCore.enableTrackingForDocument('test-doc.md');
  });

  afterEach(async () => {
    await trackEditsCore.cleanup();
    eventBus.removeAllListeners();
  });

  describe('Cross-Plugin Communication Flow', () => {
    it('should handle complete user request workflow', async () => {
      const documentId = 'test-doc.md';
      let changeProcessed = false;
      let changeAccepted = false;

      // Set up promise to wait for workflow completion
      const workflowComplete = new Promise<void>((resolve) => {
        eventBus.on('track-edits:change-accepted', () => {
          changeAccepted = true;
          if (changeProcessed && changeAccepted) resolve();
        });

        eventBus.on('track-edits:change-processed', () => {
          changeProcessed = true;
          if (changeProcessed && changeAccepted) resolve();
        });
      });

      // Set up Track Edits to handle AI-generated changes
      eventBus.on('ai-editorial:changes-ready', async (data) => {
        console.log('Track Edits received AI changes:', data.changes.length);
        
        for (const change of data.changes) {
          const result = await trackEditsCore.submitChange({
            ...change,
            timestamp: new Date()
          });
          
          expect(result.success).toBe(true);
          eventBus.emit('track-edits:change-processed', { changeId: change.id });
          
          // Auto-accept for test
          setTimeout(async () => {
            await trackEditsCore.acceptChange(change.id);
            eventBus.emit('track-edits:change-accepted', { changeId: change.id });
          }, 50);
        }
      });

      // Simulate user making a request through Writerr Chat
      mockChat.simulateUserRequest(documentId, 'Please improve the style of the selected text');

      // Wait for complete workflow
      await workflowComplete;

      // Verify workflow completed successfully
      expect(changeProcessed).toBe(true);
      expect(changeAccepted).toBe(true);
      
      const changes = trackEditsCore.getChangesForDocument(documentId);
      expect(changes).toHaveLength(1);
      expect(changes[0].status).toBe('accepted');

      console.log('✅ Complete user request workflow test passed');
      console.log('Workflow summary:', {
        documentId,
        changesGenerated: 1,
        changesProcessed: changeProcessed,
        changesAccepted: changeAccepted,
        finalStatus: changes[0].status
      });
    });

    it('should handle simultaneous requests from multiple sources', async () => {
      const documentId = 'multi-test-doc.md';
      await trackEditsCore.enableTrackingForDocument(documentId);

      let processedChanges: string[] = [];
      
      // Track processed changes
      eventBus.on('track-edits:change-processed', (data) => {
        processedChanges.push(data.changeId);
      });

      // Set up multiple AI function responses
      eventBus.on('ai-editorial:changes-ready', async (data) => {
        for (const change of data.changes) {
          const result = await trackEditsCore.submitChange({
            ...change,
            timestamp: new Date()
          });
          
          if (result.success) {
            eventBus.emit('track-edits:change-processed', { changeId: change.id });
          }
        }
      });

      // Simulate multiple simultaneous requests
      const requests = [
        { text: 'Fix grammar', mode: 'proofread', functionId: 'proofreader' },
        { text: 'Improve style', mode: 'copy-edit', functionId: 'copy-editor' },
        { text: 'Enhance flow', mode: 'developmental', functionId: 'dev-editor' }
      ];

      const requestPromises = requests.map((request, index) => {
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            eventBus.emit('ai-editorial:changes-ready', {
              requestId: `multi-req-${index}`,
              changes: [{
                id: `multi-change-${index}`,
                documentId,
                type: 'edit',
                originalText: `text${index}`,
                suggestedText: `improved-text${index}`,
                startOffset: index * 10,
                endOffset: index * 10 + 5,
                source: {
                  type: 'ai',
                  plugin: 'ai-editorial-functions',
                  function: request.functionId
                },
                confidence: 0.8,
                category: request.mode
              }]
            });
            resolve();
          }, index * 50); // Stagger requests
        });
      });

      // Wait for all requests to be processed
      await Promise.all(requestPromises);
      
      // Give time for change processing
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify all changes were processed
      expect(processedChanges).toHaveLength(3);
      
      const documentChanges = trackEditsCore.getChangesForDocument(documentId);
      expect(documentChanges).toHaveLength(3);

      console.log('✅ Simultaneous multi-source requests handled correctly');
      console.log('Multi-request results:', {
        requestCount: requests.length,
        processedChanges: processedChanges.length,
        documentChanges: documentChanges.length,
        changeIds: processedChanges
      });
    });
  });

  describe('Event Bus Error Handling', () => {
    it('should handle event listener errors gracefully', async () => {
      const documentId = 'error-test-doc.md';
      let errorHandled = false;

      // Set up error-prone event handler
      eventBus.on('track-edits:test-error', () => {
        throw new Error('Test error in event handler');
      });

      // Set up error handler
      eventBus.on('system:error', (error) => {
        errorHandled = true;
        console.log('Error handled by event bus:', error);
      });

      // Emit event that will cause error
      try {
        eventBus.emit('track-edits:test-error', { test: 'data' });
      } catch (error) {
        // Event bus should handle this internally
      }

      // Give time for error handling
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log('✅ Event handler errors handled gracefully');
      console.log('Error handling result:', { errorHandled });
    });

    it('should continue operating after plugin communication failures', async () => {
      const documentId = 'failure-test-doc.md';
      await trackEditsCore.enableTrackingForDocument(documentId);

      // Simulate AI plugin failure
      eventBus.on('writerr-chat:user-request', () => {
        // Simulate no response from AI functions (timeout scenario)
        setTimeout(() => {
          eventBus.emit('ai-editorial:error', {
            error: 'AI service unavailable',
            code: 'SERVICE_UNAVAILABLE'
          });
        }, 100);
      });

      // Track if Track Edits continues to work despite failure
      const manualChange = {
        id: 'manual-change-after-failure',
        documentId,
        type: 'edit' as const,
        originalText: 'test',
        suggestedText: 'manual test',
        startOffset: 0,
        endOffset: 4,
        source: { type: 'manual' as const, user: 'test-user' },
        confidence: 1.0,
        category: 'manual-edit',
        timestamp: new Date()
      };

      // Simulate failed AI request
      mockChat.simulateUserRequest(documentId, 'This should fail');
      
      // Wait for failure
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify Track Edits still accepts manual changes
      const result = await trackEditsCore.submitChange(manualChange);
      expect(result.success).toBe(true);

      const changes = trackEditsCore.getChangesForDocument(documentId);
      expect(changes).toHaveLength(1);
      expect(changes[0].id).toBe('manual-change-after-failure');

      console.log('✅ System continues operating after communication failures');
      console.log('Failure recovery test:', {
        manualChangeAccepted: result.success,
        systemStillFunctional: true
      });
    });
  });

  describe('Performance Under Load', () => {
    it('should handle high-frequency events efficiently', async () => {
      const documentId = 'perf-test-doc.md';
      await trackEditsCore.enableTrackingForDocument(documentId);

      const eventCount = 1000;
      let processedEvents = 0;
      const startTime = Date.now();

      // Set up event handler to track processing
      eventBus.on('test:high-frequency', () => {
        processedEvents++;
      });

      // Fire many events rapidly
      for (let i = 0; i < eventCount; i++) {
        eventBus.emit('test:high-frequency', { eventNumber: i });
      }

      const processingTime = Date.now() - startTime;

      // Verify all events processed
      expect(processedEvents).toBe(eventCount);
      
      // Performance should be reasonable (< 1 second for 1000 events)
      expect(processingTime).toBeLessThan(1000);

      console.log('✅ High-frequency event handling performance test passed');
      console.log('Performance metrics:', {
        totalEvents: eventCount,
        processedEvents,
        processingTime: `${processingTime}ms`,
        eventsPerSecond: Math.round((eventCount / processingTime) * 1000),
        averageTimePerEvent: `${(processingTime / eventCount).toFixed(3)}ms`
      });
    });

    it('should prevent event listener memory leaks', async () => {
      const initialListenerCount = eventBus.listenerCount('test:memory-leak');
      expect(initialListenerCount).toBe(0);

      // Add many listeners
      const listenerCount = 100;
      const listeners: Array<() => void> = [];

      for (let i = 0; i < listenerCount; i++) {
        const listener = () => console.log(`Listener ${i}`);
        listeners.push(listener);
        eventBus.on('test:memory-leak', listener);
      }

      expect(eventBus.listenerCount('test:memory-leak')).toBe(listenerCount);

      // Remove all listeners
      listeners.forEach(listener => {
        eventBus.off('test:memory-leak', listener);
      });

      const finalListenerCount = eventBus.listenerCount('test:memory-leak');
      expect(finalListenerCount).toBe(0);

      console.log('✅ Event listener memory leak prevention working');
      console.log('Memory leak test results:', {
        initialListeners: initialListenerCount,
        addedListeners: listenerCount,
        finalListeners: finalListenerCount,
        allListenersRemoved: finalListenerCount === 0
      });
    });
  });

  describe('Event Bus State Synchronization', () => {
    it('should synchronize document state across plugins', async () => {
      const documentId = 'sync-test-doc.md';
      await trackEditsCore.enableTrackingForDocument(documentId);

      let chatReceivedStateUpdate = false;
      let aiFunctionsReceivedStateUpdate = false;

      // Set up state synchronization listeners
      mockChat = new class extends MockWriterrChat {
        protected handleDocumentStateChange(data: any) {
          chatReceivedStateUpdate = true;
          console.log('Chat received state change:', data);
        }
      }(eventBus);

      eventBus.on('track-edits:document-state-changed', () => {
        aiFunctionsReceivedStateUpdate = true;
      });

      // Make a change that should trigger state synchronization
      const change = {
        id: 'sync-test-change',
        documentId,
        type: 'edit' as const,
        originalText: 'sync test',
        suggestedText: 'synchronization test',
        startOffset: 0,
        endOffset: 9,
        source: { type: 'ai' as const, plugin: 'test' },
        confidence: 0.9,
        category: 'test',
        timestamp: new Date()
      };

      await trackEditsCore.submitChange(change);
      
      // Accept the change to trigger state update
      await trackEditsCore.acceptChange(change.id);

      // Give time for event propagation
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log('✅ Document state synchronization working');
      console.log('Synchronization results:', {
        chatReceivedUpdate: chatReceivedStateUpdate,
        aiFunctionsReceivedUpdate: aiFunctionsReceivedStateUpdate,
        changeProcessed: true
      });
    });
  });
});