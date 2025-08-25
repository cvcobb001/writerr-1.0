/**
 * @fileoverview Tests for Track Edits AI Providers Adapter
 */

import { jest } from '@jest/globals';
import { AIProvidersAdapter, AIRequestContext, AIResponse } from '../AIProvidersAdapter';
import { ChangeType } from '../../types';
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

// Mock window global
global.window = {
  AISwitchboard: {
    request: jest.fn(),
    getProviders: jest.fn().mockResolvedValue([
      { id: 'openai', name: 'OpenAI', models: ['gpt-4', 'gpt-3.5-turbo'] },
      { id: 'anthropic', name: 'Anthropic', models: ['claude-3-sonnet'] }
    ])
  }
} as any;

describe('AIProvidersAdapter', () => {
  let adapter: AIProvidersAdapter;
  
  beforeEach(() => {
    adapter = AIProvidersAdapter.getInstance();
    jest.clearAllMocks();
  });

  afterEach(() => {
    adapter.dispose();
  });

  describe('Initialization', () => {
    it('should initialize successfully when AI Providers is available', async () => {
      const mockEventBus = globalEventBus.once as jest.MockedFunction<any>;
      mockEventBus.mockImplementationOnce((event, callback) => {
        if (event === 'ai-providers-ping-response') {
          setTimeout(() => callback({ payload: {} }), 10);
        }
      });

      const result = await adapter.initialize();
      expect(result).toBe(true);
    });

    it('should return false when AI Providers is not available', async () => {
      const mockEventBus = globalEventBus.once as jest.MockedFunction<any>;
      mockEventBus.mockImplementationOnce(() => {
        // Don't call callback - simulate timeout
      });

      const result = await adapter.initialize();
      expect(result).toBe(false);
    });

    it('should emit ready event on successful initialization', async () => {
      const mockEventBus = globalEventBus.once as jest.MockedFunction<any>;
      mockEventBus.mockImplementationOnce((event, callback) => {
        if (event === 'ai-providers-ping-response') {
          setTimeout(() => callback({ payload: {} }), 10);
        }
      });

      await adapter.initialize();
      
      expect(globalEventBus.emit).toHaveBeenCalledWith(
        'track-edits-ai-adapter-ready',
        expect.objectContaining({
          pluginId: 'track-edits',
          timestamp: expect.any(Date)
        }),
        'track-edits-ai-adapter'
      );
    });
  });

  describe('Edit Suggestions Generation', () => {
    beforeEach(async () => {
      const mockEventBus = globalEventBus.once as jest.MockedFunction<any>;
      mockEventBus.mockImplementationOnce((event, callback) => {
        if (event === 'ai-providers-ping-response') {
          setTimeout(() => callback({ payload: {} }), 10);
        }
      });
      await adapter.initialize();
    });

    it('should generate edit suggestions successfully', async () => {
      const mockAISwitchboard = global.window.AISwitchboard.request as jest.MockedFunction<any>;
      mockAISwitchboard.mockResolvedValueOnce({
        content: 'This is an improved version of the text.',
        confidence: 0.85,
        usage: { prompt: 100, completion: 150, total: 250 }
      });

      const context: AIRequestContext = {
        changeType: ChangeType.REPLACE,
        documentContent: 'This is some document content.',
        selectionText: 'some text to improve',
        position: { start: 10, end: 30 },
        metadata: {
          documentLength: 100,
          language: 'en'
        }
      };

      const response = await adapter.generateEditSuggestions(context);

      expect(response.success).toBe(true);
      expect(response.content).toBe('This is an improved version of the text.');
      expect(response.confidence).toBe(0.85);
      expect(response.metadata.processingTime).toBeGreaterThan(0);
    });

    it('should handle rate limiting by queuing requests', async () => {
      // Simulate rate limiting by making multiple rapid requests
      const context: AIRequestContext = {
        changeType: ChangeType.REPLACE,
        documentContent: 'Test content',
        selectionText: 'test',
        position: { start: 0, end: 4 },
        metadata: { documentLength: 12 }
      };

      const mockAISwitchboard = global.window.AISwitchboard.request as jest.MockedFunction<any>;
      mockAISwitchboard.mockResolvedValue({
        content: 'Test response',
        confidence: 0.8,
        usage: { prompt: 50, completion: 75, total: 125 }
      });

      // Make multiple requests quickly
      const promises = Array(5).fill(null).map(() => 
        adapter.generateEditSuggestions(context, { useCache: false })
      );

      const responses = await Promise.all(promises);
      expect(responses).toHaveLength(5);
      expect(responses.every(r => r.success)).toBe(true);
    });

    it('should use cached responses when available', async () => {
      const mockAISwitchboard = global.window.AISwitchboard.request as jest.MockedFunction<any>;
      mockAISwitchboard.mockResolvedValueOnce({
        content: 'Cached response',
        confidence: 0.9,
        usage: { prompt: 50, completion: 75, total: 125 }
      });

      const context: AIRequestContext = {
        changeType: ChangeType.REPLACE,
        documentContent: 'Same content',
        selectionText: 'same text',
        position: { start: 0, end: 9 },
        metadata: { documentLength: 12 }
      };

      // First request
      const firstResponse = await adapter.generateEditSuggestions(context);
      expect(firstResponse.success).toBe(true);

      // Second request should use cache
      const secondResponse = await adapter.generateEditSuggestions(context);
      expect(secondResponse.success).toBe(true);
      expect(secondResponse.content).toBe('Cached response');

      // AI provider should only be called once
      expect(mockAISwitchboard).toHaveBeenCalledTimes(1);
    });

    it('should handle circuit breaker opening on repeated failures', async () => {
      const mockAISwitchboard = global.window.AISwitchboard.request as jest.MockedFunction<any>;
      mockAISwitchboard.mockRejectedValue(new Error('Provider error'));

      const context: AIRequestContext = {
        changeType: ChangeType.REPLACE,
        documentContent: 'Test content',
        selectionText: 'test',
        position: { start: 0, end: 4 },
        metadata: { documentLength: 12 }
      };

      // Make multiple failing requests
      for (let i = 0; i < 6; i++) {
        try {
          await adapter.generateEditSuggestions(context, { useCache: false });
        } catch (error) {
          // Expected to fail
        }
      }

      const health = adapter.getProviderHealth();
      expect(health['openai']?.isAvailable).toBe(false);
    });
  });

  describe('Model Selection', () => {
    beforeEach(async () => {
      const mockEventBus = globalEventBus.once as jest.MockedFunction<any>;
      mockEventBus.mockImplementationOnce((event, callback) => {
        if (event === 'ai-providers-ping-response') {
          setTimeout(() => callback({ payload: {} }), 10);
        }
      });
      await adapter.initialize();
    });

    it('should select fast models for urgent requests', async () => {
      const mockAISwitchboard = global.window.AISwitchboard.request as jest.MockedFunction<any>;
      mockAISwitchboard.mockResolvedValueOnce({
        content: 'Fast response',
        confidence: 0.8,
        usage: { prompt: 50, completion: 75, total: 125 }
      });

      const context: AIRequestContext = {
        changeType: ChangeType.REPLACE,
        documentContent: 'Test content',
        selectionText: 'test',
        position: { start: 0, end: 4 },
        metadata: { documentLength: 12 }
      };

      await adapter.generateEditSuggestions(context, { urgency: 'high' });

      // Check that a request was made (model selection logic is internal)
      expect(mockAISwitchboard).toHaveBeenCalledTimes(1);
    });

    it('should select models with higher token limits for large content', async () => {
      const mockAISwitchboard = global.window.AISwitchboard.request as jest.MockedFunction<any>;
      mockAISwitchboard.mockResolvedValueOnce({
        content: 'Large content response',
        confidence: 0.85,
        usage: { prompt: 2000, completion: 1500, total: 3500 }
      });

      const largeContent = 'a'.repeat(15000);
      const context: AIRequestContext = {
        changeType: ChangeType.REPLACE,
        documentContent: largeContent,
        selectionText: largeContent.substring(0, 1000),
        position: { start: 0, end: 1000 },
        metadata: { documentLength: largeContent.length }
      };

      await adapter.generateEditSuggestions(context);

      expect(mockAISwitchboard).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      const mockEventBus = globalEventBus.once as jest.MockedFunction<any>;
      mockEventBus.mockImplementationOnce((event, callback) => {
        if (event === 'ai-providers-ping-response') {
          setTimeout(() => callback({ payload: {} }), 10);
        }
      });
      await adapter.initialize();
    });

    it('should emit error events on request failures', async () => {
      const mockAISwitchboard = global.window.AISwitchboard.request as jest.MockedFunction<any>;
      mockAISwitchboard.mockRejectedValueOnce(new Error('Test error'));

      const context: AIRequestContext = {
        changeType: ChangeType.REPLACE,
        documentContent: 'Test content',
        selectionText: 'test',
        position: { start: 0, end: 4 },
        metadata: { documentLength: 12 }
      };

      try {
        await adapter.generateEditSuggestions(context);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }

      expect(globalEventBus.emit).toHaveBeenCalledWith(
        'ai-request-completed',
        expect.objectContaining({
          success: false
        }),
        'track-edits-ai-adapter'
      );
    });
  });

  describe('Statistics and Monitoring', () => {
    beforeEach(async () => {
      const mockEventBus = globalEventBus.once as jest.MockedFunction<any>;
      mockEventBus.mockImplementationOnce((event, callback) => {
        if (event === 'ai-providers-ping-response') {
          setTimeout(() => callback({ payload: {} }), 10);
        }
      });
      await adapter.initialize();
    });

    it('should track adapter statistics', () => {
      const stats = adapter.getStats();
      
      expect(stats).toHaveProperty('totalRequests');
      expect(stats).toHaveProperty('successfulRequests');
      expect(stats).toHaveProperty('failedRequests');
      expect(stats).toHaveProperty('cacheHits');
      expect(stats).toHaveProperty('providerUsage');
      expect(stats).toHaveProperty('averageResponseTime');
    });

    it('should provide provider health information', () => {
      const health = adapter.getProviderHealth();
      
      expect(health).toHaveProperty('openai');
      expect(health).toHaveProperty('anthropic');
      
      expect(health['openai']).toHaveProperty('isAvailable');
      expect(health['openai']).toHaveProperty('circuitBreakerState');
      expect(health['openai']).toHaveProperty('rateLimitStatus');
    });
  });

  describe('Configuration Updates', () => {
    beforeEach(async () => {
      const mockEventBus = globalEventBus.once as jest.MockedFunction<any>;
      mockEventBus.mockImplementationOnce((event, callback) => {
        if (event === 'ai-providers-ping-response') {
          setTimeout(() => callback({ payload: {} }), 10);
        }
      });
      await adapter.initialize();
    });

    it('should update model configurations', () => {
      const providerId = 'openai';
      const modelId = 'gpt-4';
      
      adapter.updateModelConfig(providerId, modelId, {
        parameters: { temperature: 0.5 }
      });

      expect(globalEventBus.emit).toHaveBeenCalledWith(
        'ai-model-config-updated',
        expect.objectContaining({
          providerId,
          modelId
        }),
        'track-edits-ai-adapter'
      );
    });

    it('should clear cache on demand', () => {
      adapter.clearCache();
      
      expect(globalEventBus.emit).toHaveBeenCalledWith(
        'ai-cache-cleared',
        expect.objectContaining({
          source: 'track-edits'
        }),
        'track-edits-ai-adapter'
      );
    });
  });
});