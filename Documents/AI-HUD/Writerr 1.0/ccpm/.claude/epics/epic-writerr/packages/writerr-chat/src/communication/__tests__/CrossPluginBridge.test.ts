/**
 * @fileoverview Tests for Writerr Chat Cross-Plugin Bridge
 */

import { jest } from '@jest/globals';
import { CrossPluginBridge } from '../CrossPluginBridge';
import { CrossPluginEventType } from '@writerr/shared/events/CrossPluginEvents';
import { globalEventBus } from '@writerr/shared';

// Mock the global event bus
jest.mock('@writerr/shared', () => ({
  globalEventBus: {
    emit: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    off: jest.fn()
  }
}));

describe('CrossPluginBridge - Writerr Chat', () => {
  let bridge: CrossPluginBridge;
  
  beforeEach(() => {
    bridge = CrossPluginBridge.getInstance();
    jest.clearAllMocks();
  });

  afterEach(() => {
    bridge.dispose();
  });

  describe('Initialization', () => {
    it('should initialize successfully with default config', async () => {
      await bridge.initialize();
      
      expect(globalEventBus.emit).toHaveBeenCalledWith(
        'plugin-announcement',
        expect.objectContaining({
          pluginId: 'writerr-chat',
          version: '1.0.0',
          capabilities: expect.arrayContaining([
            'chat-interface',
            'mode-switching',
            'document-context',
            'ai-integration'
          ])
        }),
        'writerr-chat'
      );
    });

    it('should initialize with custom config', async () => {
      const customConfig = {
        autoSyncModes: false,
        shareConversations: true,
        documentIntegration: false
      };

      await bridge.initialize(customConfig);
      
      expect(globalEventBus.emit).toHaveBeenCalled();
    });

    it('should set up event listeners during initialization', async () => {
      await bridge.initialize();
      
      expect(globalEventBus.on).toHaveBeenCalledWith(
        'cross-plugin-event',
        expect.any(Function)
      );
    });
  });

  describe('Chat Message Events', () => {
    beforeEach(async () => {
      await bridge.initialize();
    });

    it('should send chat message events', async () => {
      const conversationId = 'conv-123';
      const messageType = 'user';
      const content = 'Hello, this is a test message';
      const mode = { id: 'chat', name: 'Chat Mode' };
      const context = { documentId: 'doc-123' };

      await bridge.sendChatMessage(conversationId, messageType, content, mode, context);

      expect(globalEventBus.emit).toHaveBeenCalledWith(
        'cross-plugin-event',
        expect.objectContaining({
          type: CrossPluginEventType.CHAT_MESSAGE_SENT,
          payload: expect.objectContaining({
            conversationId,
            messageType,
            contentLength: content.length,
            mode,
            context
          })
        }),
        'writerr-chat'
      );
    });

    it('should notify about chat responses', async () => {
      const conversationId = 'conv-123';
      const messageId = 'msg-456';
      const responseTime = 1500;
      const content = 'This is an AI response';
      const providerInfo = { providerId: 'openai', modelId: 'gpt-4' };
      const tokenUsage = { prompt: 100, completion: 150, total: 250 };

      await bridge.notifyChatResponse(
        conversationId,
        messageId,
        responseTime,
        content,
        false,
        providerInfo,
        tokenUsage,
        0.05,
        0.9
      );

      expect(globalEventBus.emit).toHaveBeenCalledWith(
        'cross-plugin-event',
        expect.objectContaining({
          type: CrossPluginEventType.CHAT_RESPONSE_RECEIVED,
          payload: expect.objectContaining({
            conversationId,
            messageId,
            responseTime,
            contentLength: content.length,
            providerInfo,
            tokenUsage
          })
        }),
        'writerr-chat'
      );
    });

    it('should notify about mode changes', async () => {
      const conversationId = 'conv-123';
      const previousMode = { id: 'chat', name: 'Chat' };
      const newMode = { id: 'proofread', name: 'Proofread' };
      const reason = 'user-selection';

      await bridge.notifyModeChange(conversationId, previousMode, newMode, reason);

      expect(globalEventBus.emit).toHaveBeenCalledWith(
        'cross-plugin-event',
        expect.objectContaining({
          type: CrossPluginEventType.CHAT_MODE_CHANGED,
          payload: expect.objectContaining({
            conversationId,
            previousMode,
            newMode,
            reason
          })
        }),
        'writerr-chat'
      );
    });
  });

  describe('AI Integration', () => {
    beforeEach(async () => {
      await bridge.initialize();
    });

    it('should request AI processing', async () => {
      const messages = [
        { role: 'user', content: 'Test message', timestamp: new Date() }
      ];
      const mode = { id: 'chat', name: 'Chat', capabilities: [] };
      const options = { provider: 'openai', model: 'gpt-4', streaming: true };

      await bridge.requestAIProcessing(messages, mode, options);

      expect(globalEventBus.emit).toHaveBeenCalledWith(
        'cross-plugin-event',
        expect.objectContaining({
          type: CrossPluginEventType.AI_PROVIDER_REQUEST,
          payload: expect.objectContaining({
            providerId: 'openai',
            modelId: 'gpt-4',
            requestType: 'streaming',
            context: expect.objectContaining({
              pluginId: 'writerr-chat',
              messageCount: 1
            })
          })
        }),
        'writerr-chat'
      );
    });

    it('should invoke editorial functions', async () => {
      const functionName = 'grammar-check';
      const input = 'Text to check for grammar';
      const documentContext = {
        documentId: 'doc-123',
        recentChanges: [],
        editSuggestions: []
      };

      await bridge.invokeEditorialFunction(functionName, input, documentContext);

      expect(globalEventBus.emit).toHaveBeenCalledWith(
        'cross-plugin-event',
        expect.objectContaining({
          type: CrossPluginEventType.AI_PROVIDER_REQUEST,
          payload: expect.objectContaining({
            providerId: 'ai-editorial-functions',
            context: expect.objectContaining({
              functionName,
              documentId: documentContext.documentId
            })
          })
        }),
        'writerr-chat'
      );
    });
  });

  describe('Document Context Management', () => {
    beforeEach(async () => {
      await bridge.initialize();
    });

    it('should update document context', () => {
      const documentId = 'doc-123';
      const context = {
        activeSelection: {
          start: 10,
          end: 20,
          text: 'selected text'
        }
      };

      bridge.updateDocumentContext(documentId, context);

      const storedContext = bridge.getDocumentContext(documentId);
      expect(storedContext).toMatchObject(context);
      expect(storedContext?.documentId).toBe(documentId);
    });

    it('should emit sync events on context update', () => {
      const documentId = 'doc-123';
      const context = {
        activeSelection: {
          start: 0,
          end: 5,
          text: 'hello'
        }
      };

      bridge.updateDocumentContext(documentId, context);

      expect(globalEventBus.emit).toHaveBeenCalledWith(
        'cross-plugin-event',
        expect.objectContaining({
          type: CrossPluginEventType.CROSS_PLUGIN_SYNC,
          payload: expect.objectContaining({
            syncType: 'state',
            participants: ['track-edits', 'ai-editorial-functions'],
            data: expect.objectContaining({
              documentContext: expect.any(Object)
            })
          })
        }),
        'writerr-chat'
      );
    });

    it('should return null for non-existent document context', () => {
      const context = bridge.getDocumentContext('non-existent-doc');
      expect(context).toBeNull();
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      await bridge.initialize();
    });

    it('should handle document change events', async () => {
      const mockHandler = jest.fn();
      bridge.subscribe(
        { eventTypes: [CrossPluginEventType.DOCUMENT_CHANGE_DETECTED] },
        {
          handle: mockHandler,
          canHandle: () => true,
          priority: 1
        }
      );

      const documentChangeEvent = {
        type: CrossPluginEventType.DOCUMENT_CHANGE_DETECTED,
        payload: {
          timestamp: Date.now(),
          source: 'track-edits',
          eventId: 'event-123',
          version: '1.0',
          documentId: 'doc-123',
          changeType: 'replace',
          position: { start: 0, end: 10 },
          content: { before: 'old', after: 'new' },
          changeSource: 'user',
          metadata: {}
        },
        metadata: {
          priority: 'high',
          persistent: true,
          retryable: false
        }
      };

      // Simulate receiving the event
      const eventHandlers = (globalEventBus.on as jest.MockedFunction<any>).mock.calls
        .find(call => call[0] === 'cross-plugin-event');
      
      if (eventHandlers) {
        await eventHandlers[1]({ payload: documentChangeEvent });
      }

      expect(mockHandler).toHaveBeenCalledWith(documentChangeEvent);
    });

    it('should handle edit suggestion events', async () => {
      const mockHandler = jest.fn();
      bridge.subscribe(
        { eventTypes: [CrossPluginEventType.EDIT_SUGGESTION_CREATED] },
        {
          handle: mockHandler,
          canHandle: () => true,
          priority: 1
        }
      );

      const editSuggestionEvent = {
        type: CrossPluginEventType.EDIT_SUGGESTION_CREATED,
        payload: {
          timestamp: Date.now(),
          source: 'track-edits',
          eventId: 'event-456',
          version: '1.0',
          suggestionId: 'sug-123',
          documentId: 'doc-123',
          position: { start: 0, end: 10 },
          suggestion: {
            type: 'grammar',
            originalText: 'original',
            suggestedText: 'suggested',
            reason: 'grammar fix',
            confidence: 0.9
          },
          providerInfo: {
            providerId: 'openai',
            modelId: 'gpt-4'
          }
        },
        metadata: {
          priority: 'medium',
          persistent: true,
          retryable: false
        }
      };

      // Simulate receiving the event
      const eventHandlers = (globalEventBus.on as jest.MockedFunction<any>).mock.calls
        .find(call => call[0] === 'cross-plugin-event');
      
      if (eventHandlers) {
        await eventHandlers[1]({ payload: editSuggestionEvent });
      }

      expect(mockHandler).toHaveBeenCalledWith(editSuggestionEvent);
    });
  });

  describe('Event Throttling', () => {
    beforeEach(async () => {
      await bridge.initialize({
        eventThrottling: {
          enabled: true,
          maxEventsPerSecond: 2
        }
      });
    });

    it('should throttle events when rate limit is exceeded', async () => {
      const mockHandler = jest.fn();
      bridge.subscribe(
        { eventTypes: [CrossPluginEventType.PERFORMANCE_METRIC] },
        {
          handle: mockHandler,
          canHandle: () => true,
          priority: 1
        }
      );

      // Send multiple events quickly
      const events = Array(5).fill(null).map((_, i) => ({
        type: CrossPluginEventType.PERFORMANCE_METRIC,
        payload: {
          timestamp: Date.now(),
          source: 'test-source',
          eventId: `event-${i}`,
          version: '1.0',
          metricType: 'latency',
          component: 'test',
          value: 100,
          unit: 'ms',
          context: {}
        },
        metadata: {
          priority: 'low',
          persistent: false,
          retryable: false
        }
      }));

      const eventHandlers = (globalEventBus.on as jest.MockedFunction<any>).mock.calls
        .find(call => call[0] === 'cross-plugin-event');
      
      if (eventHandlers) {
        // Send events rapidly
        for (const event of events) {
          await eventHandlers[1]({ payload: event });
        }
      }

      // Should handle fewer than the total due to throttling
      expect(mockHandler).toHaveBeenCalledTimes(2); // Rate limit is 2 per second
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      await bridge.initialize();
    });

    it('should provide bridge statistics', () => {
      const stats = bridge.getStats();
      
      expect(stats).toHaveProperty('messagesRouted');
      expect(stats).toHaveProperty('documentContextUpdates');
      expect(stats).toHaveProperty('modeChanges');
      expect(stats).toHaveProperty('aiRequestsTriggered');
      expect(stats).toHaveProperty('functionsInvoked');
      expect(stats).toHaveProperty('errorCount');
      expect(stats).toHaveProperty('lastResetTime');
    });

    it('should track connected plugins', () => {
      const connectedPlugins = bridge.getConnectedPlugins();
      expect(Array.isArray(connectedPlugins)).toBe(true);
    });
  });

  describe('Subscription Management', () => {
    beforeEach(async () => {
      await bridge.initialize();
    });

    it('should create subscriptions with filters', () => {
      const handler = {
        handle: jest.fn(),
        canHandle: () => true,
        priority: 1
      };

      const subscriptionId = bridge.subscribe(
        {
          eventTypes: [CrossPluginEventType.CHAT_MESSAGE_SENT],
          sources: ['writerr-chat']
        },
        handler
      );

      expect(subscriptionId).toBeDefined();
      expect(typeof subscriptionId).toBe('string');
    });

    it('should handle custom filters', () => {
      const handler = {
        handle: jest.fn(),
        canHandle: () => true,
        priority: 1
      };

      const customFilter = (event: any) => event.payload.priority === 'high';

      const subscriptionId = bridge.subscribe(
        {
          customFilter
        },
        handler
      );

      expect(subscriptionId).toBeDefined();
    });
  });
});