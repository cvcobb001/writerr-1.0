/**
 * @fileoverview Tests for Cross-Plugin Events System
 */

import { jest } from '@jest/globals';
import {
  CrossPluginEventType,
  CrossPluginEvent,
  CrossPluginEventFactory,
  CrossPluginEventValidator,
  AIProviderRequestPayload,
  DocumentChangeDetectedPayload,
  FunctionExecutedPayload
} from '../CrossPluginEvents';

describe('CrossPluginEventFactory', () => {
  describe('createAIProviderRequest', () => {
    it('should create a valid AI provider request event', () => {
      const providerId = 'openai';
      const modelId = 'gpt-4';
      const requestType = 'completion';
      const context = {
        pluginId: 'test-plugin',
        functionName: 'test-function'
      };

      const event = CrossPluginEventFactory.createAIProviderRequest(
        providerId,
        modelId,
        requestType,
        context
      );

      expect(event.type).toBe(CrossPluginEventType.AI_PROVIDER_REQUEST);
      expect(event.payload.providerId).toBe(providerId);
      expect(event.payload.modelId).toBe(modelId);
      expect(event.payload.requestType).toBe(requestType);
      expect(event.payload.context).toEqual(context);
      expect(event.payload.timestamp).toBeGreaterThan(0);
      expect(event.payload.eventId).toBeDefined();
      expect(event.metadata.priority).toBe('medium');
      expect(event.metadata.persistent).toBe(false);
      expect(event.metadata.retryable).toBe(true);
    });
  });

  describe('createDocumentChange', () => {
    it('should create a valid document change event', () => {
      const documentId = 'doc-123';
      const changeType = 'replace';
      const position = { start: 10, end: 20 };
      const content = { before: 'old text', after: 'new text' };
      const changeSource = 'user';
      const source = 'track-edits';

      const event = CrossPluginEventFactory.createDocumentChange(
        documentId,
        changeType as any,
        position,
        content,
        changeSource as any,
        source
      );

      expect(event.type).toBe(CrossPluginEventType.DOCUMENT_CHANGE_DETECTED);
      expect(event.payload.documentId).toBe(documentId);
      expect(event.payload.changeType).toBe(changeType);
      expect(event.payload.position).toEqual(position);
      expect(event.payload.content).toEqual(content);
      expect(event.payload.changeSource).toBe(changeSource);
      expect(event.payload.source).toBe(source);
      expect(event.metadata.priority).toBe('high');
      expect(event.metadata.persistent).toBe(true);
    });
  });

  describe('createEditSuggestion', () => {
    it('should create a valid edit suggestion event', () => {
      const documentId = 'doc-123';
      const position = { start: 0, end: 10 };
      const suggestion = {
        type: 'grammar' as const,
        originalText: 'original',
        suggestedText: 'suggested',
        reason: 'grammar improvement',
        confidence: 0.9
      };
      const providerInfo = {
        providerId: 'openai',
        modelId: 'gpt-4',
        functionName: 'grammar-check'
      };
      const source = 'ai-editorial-functions';

      const event = CrossPluginEventFactory.createEditSuggestion(
        documentId,
        position,
        suggestion,
        providerInfo,
        source
      );

      expect(event.type).toBe(CrossPluginEventType.EDIT_SUGGESTION_CREATED);
      expect(event.payload.documentId).toBe(documentId);
      expect(event.payload.position).toEqual(position);
      expect(event.payload.suggestion).toEqual(suggestion);
      expect(event.payload.providerInfo).toEqual(providerInfo);
      expect(event.payload.suggestionId).toBeDefined();
    });
  });

  describe('createFunctionExecution', () => {
    it('should create a valid function execution event', () => {
      const functionId = 'func-123';
      const functionName = 'grammar-check';
      const result = {
        inputLength: 100,
        outputLength: 120,
        processingTime: 1500,
        success: true,
        confidence: 0.85,
        providerInfo: { providerId: 'openai', modelId: 'gpt-4' },
        qualityMetrics: { grammarScore: 0.9 }
      };
      const source = 'ai-editorial-functions';

      const event = CrossPluginEventFactory.createFunctionExecution(
        functionId,
        functionName,
        result,
        source
      );

      expect(event.type).toBe(CrossPluginEventType.FUNCTION_EXECUTED);
      expect(event.payload.functionId).toBe(functionId);
      expect(event.payload.functionName).toBe(functionName);
      expect(event.payload.success).toBe(true);
      expect(event.payload.confidence).toBe(0.85);
      expect(event.payload.executionId).toBeDefined();
    });
  });

  describe('createChatMessage', () => {
    it('should create a valid chat message event', () => {
      const conversationId = 'conv-123';
      const messageType = 'user';
      const contentLength = 50;
      const mode = { id: 'chat', name: 'Chat Mode' };
      const context = { documentId: 'doc-123' };
      const source = 'writerr-chat';

      const event = CrossPluginEventFactory.createChatMessage(
        conversationId,
        messageType as any,
        contentLength,
        mode,
        context,
        source
      );

      expect(event.type).toBe(CrossPluginEventType.CHAT_MESSAGE_SENT);
      expect(event.payload.conversationId).toBe(conversationId);
      expect(event.payload.messageType).toBe(messageType);
      expect(event.payload.contentLength).toBe(contentLength);
      expect(event.payload.mode).toEqual(mode);
      expect(event.payload.context).toEqual(context);
      expect(event.payload.messageId).toBeDefined();
    });
  });

  describe('createPerformanceMetric', () => {
    it('should create a valid performance metric event', () => {
      const metricType = 'latency';
      const component = 'ai-adapter';
      const value = 1500;
      const unit = 'ms';
      const context = { operation: 'ai-request' };
      const source = 'track-edits';

      const event = CrossPluginEventFactory.createPerformanceMetric(
        metricType as any,
        component,
        value,
        unit,
        context,
        source
      );

      expect(event.type).toBe(CrossPluginEventType.PERFORMANCE_METRIC);
      expect(event.payload.metricType).toBe(metricType);
      expect(event.payload.component).toBe(component);
      expect(event.payload.value).toBe(value);
      expect(event.payload.unit).toBe(unit);
      expect(event.payload.context).toEqual(context);
    });
  });
});

describe('CrossPluginEventValidator', () => {
  describe('validateEvent', () => {
    it('should validate a correct event', () => {
      const event: CrossPluginEvent = {
        type: CrossPluginEventType.AI_PROVIDER_REQUEST,
        payload: {
          timestamp: Date.now(),
          source: 'test-plugin',
          eventId: 'event-123',
          version: '1.0',
          providerId: 'openai',
          modelId: 'gpt-4',
          requestId: 'req-123',
          requestType: 'completion',
          priority: 'medium',
          context: { pluginId: 'test-plugin' }
        },
        metadata: {
          priority: 'medium',
          persistent: false,
          retryable: true
        }
      };

      const isValid = CrossPluginEventValidator.validateEvent(event);
      expect(isValid).toBe(true);
    });

    it('should reject event with missing type', () => {
      const event = {
        payload: {
          timestamp: Date.now(),
          source: 'test-plugin',
          eventId: 'event-123',
          version: '1.0'
        },
        metadata: {
          priority: 'medium',
          persistent: false,
          retryable: true
        }
      } as any;

      const isValid = CrossPluginEventValidator.validateEvent(event);
      expect(isValid).toBe(false);
    });

    it('should reject event with missing payload', () => {
      const event = {
        type: CrossPluginEventType.AI_PROVIDER_REQUEST,
        metadata: {
          priority: 'medium',
          persistent: false,
          retryable: true
        }
      } as any;

      const isValid = CrossPluginEventValidator.validateEvent(event);
      expect(isValid).toBe(false);
    });

    it('should reject event with missing metadata', () => {
      const event = {
        type: CrossPluginEventType.AI_PROVIDER_REQUEST,
        payload: {
          timestamp: Date.now(),
          source: 'test-plugin',
          eventId: 'event-123',
          version: '1.0'
        }
      } as any;

      const isValid = CrossPluginEventValidator.validateEvent(event);
      expect(isValid).toBe(false);
    });

    it('should reject event with missing required payload fields', () => {
      const event: CrossPluginEvent = {
        type: CrossPluginEventType.AI_PROVIDER_REQUEST,
        payload: {
          source: 'test-plugin',
          eventId: 'event-123',
          version: '1.0'
        } as any,
        metadata: {
          priority: 'medium',
          persistent: false,
          retryable: true
        }
      };

      const isValid = CrossPluginEventValidator.validateEvent(event);
      expect(isValid).toBe(false);
    });

    it('should validate AI provider request with all required fields', () => {
      const event: CrossPluginEvent = {
        type: CrossPluginEventType.AI_PROVIDER_REQUEST,
        payload: {
          timestamp: Date.now(),
          source: 'test-plugin',
          eventId: 'event-123',
          version: '1.0',
          providerId: 'openai',
          modelId: 'gpt-4',
          requestId: 'req-123',
          requestType: 'completion',
          priority: 'medium',
          context: { pluginId: 'test-plugin' }
        },
        metadata: {
          priority: 'medium',
          persistent: false,
          retryable: true
        }
      };

      const isValid = CrossPluginEventValidator.validateEvent(event);
      expect(isValid).toBe(true);
    });

    it('should validate document change event with all required fields', () => {
      const event: CrossPluginEvent = {
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

      const isValid = CrossPluginEventValidator.validateEvent(event);
      expect(isValid).toBe(true);
    });

    it('should validate function execution event with all required fields', () => {
      const event: CrossPluginEvent = {
        type: CrossPluginEventType.FUNCTION_EXECUTED,
        payload: {
          timestamp: Date.now(),
          source: 'ai-editorial-functions',
          eventId: 'event-123',
          version: '1.0',
          functionId: 'func-123',
          functionName: 'grammar-check',
          executionId: 'exec-123',
          inputLength: 100,
          outputLength: 120,
          processingTime: 1500,
          success: true,
          confidence: 0.85,
          providerInfo: { providerId: 'openai', modelId: 'gpt-4' },
          qualityMetrics: {}
        },
        metadata: {
          priority: 'low',
          persistent: true,
          retryable: false
        }
      };

      const isValid = CrossPluginEventValidator.validateEvent(event);
      expect(isValid).toBe(true);
    });
  });
});

describe('CrossPluginEventType', () => {
  it('should have all expected event types', () => {
    expect(CrossPluginEventType.AI_PROVIDER_REQUEST).toBe('ai-provider-request');
    expect(CrossPluginEventType.AI_PROVIDER_RESPONSE).toBe('ai-provider-response');
    expect(CrossPluginEventType.DOCUMENT_CHANGE_DETECTED).toBe('document-change-detected');
    expect(CrossPluginEventType.EDIT_SUGGESTION_CREATED).toBe('edit-suggestion-created');
    expect(CrossPluginEventType.FUNCTION_EXECUTED).toBe('function-executed');
    expect(CrossPluginEventType.CHAT_MESSAGE_SENT).toBe('chat-message-sent');
    expect(CrossPluginEventType.PLUGIN_LOADED).toBe('plugin-loaded');
    expect(CrossPluginEventType.PERFORMANCE_METRIC).toBe('performance-metric');
  });
});