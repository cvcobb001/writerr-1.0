/**
 * Comprehensive tests for submitChangesFromAI() method
 * Task 2.1: Tests for Editorial Engine integration API
 * 
 * Tests cover various change scenarios including:
 * - Single AI change submission with full metadata
 * - Batch submissions with multiple related changes  
 * - Mixed content types (insertions, deletions, replacements)
 * - Validation scenarios (invalid providers, missing metadata)
 * - Error handling (malformed changes, processing failures)
 * - Integration with existing session management
 */

import { EditTracker } from '../edit-tracker';
import { AIMetadataValidator } from '../validation/ai-metadata-validator';
import { generateId } from '@shared/utils';

// Type definitions based on existing code patterns
interface EditChange {
  id?: string;
  timestamp: number;
  type: 'insert' | 'delete' | 'replace';
  from: number;
  to: number;
  text?: string;
  removedText?: string;
  author?: string;
  aiProvider?: string;
  aiModel?: string;
  processingContext?: AIProcessingContext;
  aiTimestamp?: Date;
}

interface EditSession {
  id: string;
  startTime: number;
  endTime?: number;
  changes: EditChange[];
  wordCount?: number;
  characterCount?: number;
}

interface AIProcessingContext {
  mode?: string;
  constraints?: string[];
  settings?: Record<string, any>;
  metadata?: Record<string, any>;
  conversationId?: string;
  prompt?: string;
  instructions?: string;
}

interface SubmitChangesFromAIResult {
  success: boolean;
  sessionId?: string;
  changeIds: string[];
  errors: string[];
  warnings: string[];
  changeGroupId?: string;
}

interface SubmitChangesFromAIOptions {
  sessionId?: string;
  createSession?: boolean;
  strictValidation?: boolean;
  bypassValidation?: boolean;
  groupChanges?: boolean;
  conversationContext?: {
    conversationId: string;
    messageId?: string;
    userPrompt?: string;
  };
}

// Mock TrackEditsPlugin for testing
const mockPlugin = {
  app: {
    vault: {
      read: jest.fn().mockResolvedValue('Mock file content for testing'),
      adapter: {
        read: jest.fn().mockResolvedValue('Mock file content')
      }
    }
  },
  settings: {
    retentionDays: 30,
    enableAIMetadata: true,
    strictValidation: true
  },
  loadData: jest.fn().mockResolvedValue(null),
  saveData: jest.fn().mockResolvedValue(undefined)
} as any;

// Mock TFile for testing
const mockFile = {
  path: 'test-document.md',
  name: 'test-document.md',
  stat: { mtime: Date.now(), size: 1024 }
} as any;

// Extended EditTracker with submitChangesFromAI method
class EditTrackerWithSubmitAPI extends EditTracker {
  /**
   * Editorial Engine integration method for submitting AI-generated changes
   * with full attribution and batching support
   */
  async submitChangesFromAI(
    changes: EditChange[],
    aiProvider: string,
    aiModel: string,
    processingContext?: AIProcessingContext,
    options: SubmitChangesFromAIOptions = {}
  ): Promise<SubmitChangesFromAIResult> {
    const result: SubmitChangesFromAIResult = {
      success: false,
      changeIds: [],
      errors: [],
      warnings: []
    };

    try {
      // Validate input parameters
      if (!changes || changes.length === 0) {
        result.errors.push('No changes provided');
        return result;
      }

      if (!aiProvider || !aiModel) {
        result.errors.push('AI provider and model are required');
        return result;
      }

      // Validate AI metadata if strict validation is enabled
      if (options.strictValidation !== false && !options.bypassValidation) {
        const validationResult = AIMetadataValidator.validateAIMetadata(
          aiProvider,
          aiModel,
          processingContext,
          new Date(),
          {
            strictMode: options.strictValidation ?? true,
            logSecurityViolations: true
          }
        );

        if (!validationResult.isValid) {
          result.errors.push(...validationResult.errors);
          result.warnings.push(...validationResult.warnings);
          return result;
        }

        result.warnings.push(...validationResult.warnings);
      }

      // Handle session management
      let sessionId = options.sessionId;
      if (!sessionId && options.createSession) {
        sessionId = generateId();
        const session: EditSession = {
          id: sessionId,
          startTime: Date.now(),
          changes: [],
          wordCount: 0,
          characterCount: 0
        };
        this.startSession(session, mockFile);
      }

      if (!sessionId) {
        result.errors.push('No session ID provided and createSession option not set');
        return result;
      }

      // Validate session exists
      const session = this.getSession(sessionId);
      if (!session) {
        result.errors.push(`Session ${sessionId} not found`);
        return result;
      }

      // Generate change group ID if grouping is enabled
      const changeGroupId = options.groupChanges ? generateId() : undefined;

      // Process and enhance changes
      const enhancedChanges: EditChange[] = changes.map((change, index) => {
        const changeId = change.id || `${sessionId}_${Date.now()}_${index}`;
        
        const enhancedProcessingContext: AIProcessingContext = {
          ...processingContext,
          ...options.conversationContext && {
            conversationId: options.conversationContext.conversationId,
            messageId: options.conversationContext.messageId,
            userPrompt: options.conversationContext.userPrompt
          },
          ...(changeGroupId && { changeGroupId })
        };

        return {
          ...change,
          id: changeId,
          timestamp: change.timestamp || Date.now(),
          aiProvider,
          aiModel,
          processingContext: enhancedProcessingContext,
          aiTimestamp: new Date(),
          author: 'Editorial Engine'
        };
      });

      // Record changes using existing AI change recording method
      const recordResult = this.recordAIChanges(
        sessionId,
        enhancedChanges,
        aiProvider,
        aiModel,
        processingContext,
        new Date(),
        {
          bypassValidation: options.bypassValidation,
          strictMode: options.strictValidation
        }
      );

      if (!recordResult.success) {
        result.errors.push(...recordResult.errors);
        result.warnings.push(...recordResult.warnings);
        return result;
      }

      // Success - populate result
      result.success = true;
      result.sessionId = sessionId;
      result.changeIds = enhancedChanges.map(change => change.id!);
      result.warnings.push(...recordResult.warnings);
      result.changeGroupId = changeGroupId;

      return result;

    } catch (error) {
      result.errors.push(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
      return result;
    }
  }

  /**
   * Convenience method for single change submission
   */
  async submitSingleChangeFromAI(
    change: EditChange,
    aiProvider: string,
    aiModel: string,
    processingContext?: AIProcessingContext,
    options: SubmitChangesFromAIOptions = {}
  ): Promise<SubmitChangesFromAIResult> {
    return this.submitChangesFromAI([change], aiProvider, aiModel, processingContext, options);
  }

  /**
   * Get changes by group ID for batch processing analysis
   */
  getChangesByGroupId(sessionId: string, groupId: string): EditChange[] {
    const session = this.getSession(sessionId);
    if (!session) return [];

    return session.changes.filter(change => 
      change.processingContext?.changeGroupId === groupId
    );
  }
}

describe('submitChangesFromAI() Method - Editorial Engine Integration', () => {
  let editTracker: EditTrackerWithSubmitAPI;
  let sessionId: string;

  beforeEach(() => {
    jest.clearAllMocks();
    editTracker = new EditTrackerWithSubmitAPI(mockPlugin);
    
    // Create a test session
    sessionId = generateId();
    const session: EditSession = {
      id: sessionId,
      startTime: Date.now(),
      changes: [],
      wordCount: 0,
      characterCount: 0
    };
    
    editTracker.startSession(session, mockFile);
  });

  describe('Single AI Change Submission', () => {
    it('should successfully submit a single AI change with full metadata', async () => {
      const change: EditChange = {
        timestamp: Date.now(),
        type: 'insert',
        from: 0,
        to: 0,
        text: 'This is an AI-generated insertion.',
        author: 'Editorial Engine'
      };

      const processingContext: AIProcessingContext = {
        mode: 'content-enhancement',
        constraints: ['maintain-tone', 'preserve-structure'],
        settings: { creativity: 0.7, formality: 'professional' }
      };

      const result = await editTracker.submitChangesFromAI(
        [change],
        'anthropic-claude',
        'claude-3-sonnet',
        processingContext,
        { sessionId }
      );

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe(sessionId);
      expect(result.changeIds).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
      
      // Verify the change was recorded correctly
      const session = editTracker.getSession(sessionId);
      expect(session?.changes).toHaveLength(1);
      
      const recordedChange = session?.changes[0];
      expect(recordedChange?.aiProvider).toBe('anthropic-claude');
      expect(recordedChange?.aiModel).toBe('claude-3-sonnet');
      expect(recordedChange?.processingContext?.mode).toBe('content-enhancement');
      expect(recordedChange?.author).toBe('Editorial Engine');
    });

    it('should handle replacement changes with proper metadata', async () => {
      const change: EditChange = {
        timestamp: Date.now(),
        type: 'replace',
        from: 10,
        to: 25,
        text: 'enhanced text',
        removedText: 'original text'
      };

      const result = await editTracker.submitChangesFromAI(
        [change],
        'openai-gpt',
        'gpt-4',
        { mode: 'text-refinement' },
        { sessionId }
      );

      expect(result.success).toBe(true);
      expect(result.changeIds).toHaveLength(1);

      const session = editTracker.getSession(sessionId);
      const recordedChange = session?.changes[0];
      expect(recordedChange?.type).toBe('replace');
      expect(recordedChange?.text).toBe('enhanced text');
      expect(recordedChange?.removedText).toBe('original text');
    });

    it('should handle deletion changes correctly', async () => {
      const change: EditChange = {
        timestamp: Date.now(),
        type: 'delete',
        from: 15,
        to: 30,
        removedText: 'text to remove'
      };

      const result = await editTracker.submitChangesFromAI(
        [change],
        'anthropic-claude',
        'claude-3-haiku',
        { mode: 'content-cleanup' },
        { sessionId }
      );

      expect(result.success).toBe(true);

      const session = editTracker.getSession(sessionId);
      const recordedChange = session?.changes[0];
      expect(recordedChange?.type).toBe('delete');
      expect(recordedChange?.removedText).toBe('text to remove');
      expect(recordedChange?.text).toBeUndefined();
    });
  });

  describe('Batch Change Submissions', () => {
    it('should handle multiple related changes in a batch', async () => {
      const changes: EditChange[] = [
        {
          timestamp: Date.now(),
          type: 'insert',
          from: 0,
          to: 0,
          text: 'New introduction paragraph. '
        },
        {
          timestamp: Date.now() + 1,
          type: 'replace',
          from: 50,
          to: 75,
          text: 'improved content',
          removedText: 'original content'
        },
        {
          timestamp: Date.now() + 2,
          type: 'insert',
          from: 100,
          to: 100,
          text: ' Additional clarifying sentence.'
        }
      ];

      const processingContext: AIProcessingContext = {
        mode: 'comprehensive-editing',
        constraints: ['maintain-voice', 'improve-clarity'],
        metadata: { 
          editingPass: 1,
          targetWordCount: 500 
        }
      };

      const result = await editTracker.submitChangesFromAI(
        changes,
        'anthropic-claude',
        'claude-3-sonnet',
        processingContext,
        { sessionId, groupChanges: true }
      );

      expect(result.success).toBe(true);
      expect(result.changeIds).toHaveLength(3);
      expect(result.changeGroupId).toBeDefined();
      expect(result.errors).toHaveLength(0);

      // Verify all changes were recorded
      const session = editTracker.getSession(sessionId);
      expect(session?.changes).toHaveLength(3);

      // Verify group ID is consistent across changes
      const groupId = result.changeGroupId!;
      const groupedChanges = editTracker.getChangesByGroupId(sessionId, groupId);
      expect(groupedChanges).toHaveLength(3);
    });

    it('should handle mixed content types in batch submission', async () => {
      const changes: EditChange[] = [
        { timestamp: Date.now(), type: 'delete', from: 0, to: 10, removedText: 'Delete me' },
        { timestamp: Date.now() + 1, type: 'insert', from: 20, to: 20, text: 'Insert this' },
        { timestamp: Date.now() + 2, type: 'replace', from: 30, to: 40, text: 'New', removedText: 'Old' }
      ];

      const result = await editTracker.submitChangesFromAI(
        changes,
        'openai-gpt',
        'gpt-4-turbo',
        { mode: 'mixed-editing' },
        { sessionId }
      );

      expect(result.success).toBe(true);
      expect(result.changeIds).toHaveLength(3);

      const session = editTracker.getSession(sessionId);
      const recordedChanges = session?.changes || [];
      
      expect(recordedChanges[0].type).toBe('delete');
      expect(recordedChanges[1].type).toBe('insert');
      expect(recordedChanges[2].type).toBe('replace');
    });

    it('should handle large batch submissions efficiently', async () => {
      const batchSize = 50;
      const changes: EditChange[] = Array.from({ length: batchSize }, (_, i) => ({
        timestamp: Date.now() + i,
        type: 'insert' as const,
        from: i * 10,
        to: i * 10,
        text: `AI-generated text block ${i + 1}`
      }));

      const startTime = Date.now();
      const result = await editTracker.submitChangesFromAI(
        changes,
        'anthropic-claude',
        'claude-3-sonnet',
        { mode: 'bulk-generation' },
        { sessionId, groupChanges: true }
      );
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.changeIds).toHaveLength(batchSize);
      expect(endTime - startTime).toBeLessThan(1000); // Should be fast

      const session = editTracker.getSession(sessionId);
      expect(session?.changes).toHaveLength(batchSize);
    });
  });

  describe('Validation Scenarios', () => {
    it('should reject submission with invalid AI provider', async () => {
      const change: EditChange = {
        timestamp: Date.now(),
        type: 'insert',
        from: 0,
        to: 0,
        text: 'Test content'
      };

      const result = await editTracker.submitChangesFromAI(
        [change],
        '', // Invalid empty provider
        'claude-3-sonnet',
        undefined,
        { sessionId }
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('AI provider and model are required');
      expect(result.changeIds).toHaveLength(0);
    });

    it('should reject submission with invalid AI model', async () => {
      const change: EditChange = {
        timestamp: Date.now(),
        type: 'insert',
        from: 0,
        to: 0,
        text: 'Test content'
      };

      const result = await editTracker.submitChangesFromAI(
        [change],
        'anthropic-claude',
        '', // Invalid empty model
        undefined,
        { sessionId }
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('AI provider and model are required');
    });

    it('should reject empty change array', async () => {
      const result = await editTracker.submitChangesFromAI(
        [], // Empty changes
        'anthropic-claude',
        'claude-3-sonnet',
        undefined,
        { sessionId }
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('No changes provided');
    });

    it('should reject submission for non-existent session', async () => {
      const change: EditChange = {
        timestamp: Date.now(),
        type: 'insert',
        from: 0,
        to: 0,
        text: 'Test content'
      };

      const result = await editTracker.submitChangesFromAI(
        [change],
        'anthropic-claude',
        'claude-3-sonnet',
        undefined,
        { sessionId: 'non-existent-session' }
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Session non-existent-session not found');
    });

    it('should validate AI metadata in strict mode', async () => {
      const change: EditChange = {
        timestamp: Date.now(),
        type: 'insert',
        from: 0,
        to: 0,
        text: 'Test content'
      };

      const maliciousContext: AIProcessingContext = {
        mode: '<script>alert("xss")</script>', // Malicious input
        constraints: ['normal-constraint']
      };

      const result = await editTracker.submitChangesFromAI(
        [change],
        'anthropic-claude',
        'claude-3-sonnet',
        maliciousContext,
        { sessionId, strictValidation: true }
      );

      // Should either fail or sanitize the malicious input
      if (result.success) {
        expect(result.warnings.length).toBeGreaterThan(0);
      } else {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it('should allow bypass of validation when explicitly requested', async () => {
      const change: EditChange = {
        timestamp: Date.now(),
        type: 'insert',
        from: 0,
        to: 0,
        text: 'Test content'
      };

      const result = await editTracker.submitChangesFromAI(
        [change],
        'custom-provider', // Non-standard provider
        'experimental-model',
        undefined,
        { sessionId, bypassValidation: true }
      );

      expect(result.success).toBe(true);
      expect(result.changeIds).toHaveLength(1);
    });
  });

  describe('Session Management Integration', () => {
    it('should create new session when createSession option is true', async () => {
      const change: EditChange = {
        timestamp: Date.now(),
        type: 'insert',
        from: 0,
        to: 0,
        text: 'Test content'
      };

      const result = await editTracker.submitChangesFromAI(
        [change],
        'anthropic-claude',
        'claude-3-sonnet',
        undefined,
        { createSession: true }
      );

      expect(result.success).toBe(true);
      expect(result.sessionId).toBeDefined();
      expect(result.sessionId).not.toBe(sessionId); // Should be a new session

      // Verify the new session exists
      const newSession = editTracker.getSession(result.sessionId!);
      expect(newSession).toBeDefined();
      expect(newSession?.changes).toHaveLength(1);
    });

    it('should fail when no sessionId provided and createSession is false', async () => {
      const change: EditChange = {
        timestamp: Date.now(),
        type: 'insert',
        from: 0,
        to: 0,
        text: 'Test content'
      };

      const result = await editTracker.submitChangesFromAI(
        [change],
        'anthropic-claude',
        'claude-3-sonnet',
        undefined,
        { createSession: false } // Explicitly false
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('No session ID provided and createSession option not set');
    });

    it('should integrate with conversation context', async () => {
      const change: EditChange = {
        timestamp: Date.now(),
        type: 'insert',
        from: 0,
        to: 0,
        text: 'Context-aware content'
      };

      const conversationContext = {
        conversationId: 'conv-123',
        messageId: 'msg-456',
        userPrompt: 'Please improve this paragraph'
      };

      const result = await editTracker.submitChangesFromAI(
        [change],
        'anthropic-claude',
        'claude-3-sonnet',
        { mode: 'conversation-based' },
        { sessionId, conversationContext }
      );

      expect(result.success).toBe(true);

      const session = editTracker.getSession(sessionId);
      const recordedChange = session?.changes[0];
      expect(recordedChange?.processingContext?.conversationId).toBe('conv-123');
      expect(recordedChange?.processingContext?.messageId).toBe('msg-456');
      expect(recordedChange?.processingContext?.userPrompt).toBe('Please improve this paragraph');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed changes gracefully', async () => {
      const malformedChanges = [
        { type: 'invalid-type' }, // Missing required fields
        { timestamp: 'invalid', type: 'insert', from: 0, to: 0 }, // Invalid timestamp
        null, // Null change
      ] as any;

      const result = await editTracker.submitChangesFromAI(
        malformedChanges,
        'anthropic-claude',
        'claude-3-sonnet',
        undefined,
        { sessionId, strictValidation: true }
      );

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.changeIds).toHaveLength(0);
    });

    it('should handle processing failures and provide detailed error info', async () => {
      // Mock a saveData failure
      mockPlugin.saveData.mockRejectedValueOnce(new Error('Storage failure'));

      const change: EditChange = {
        timestamp: Date.now(),
        type: 'insert',
        from: 0,
        to: 0,
        text: 'Test content'
      };

      const result = await editTracker.submitChangesFromAI(
        [change],
        'anthropic-claude',
        'claude-3-sonnet',
        undefined,
        { sessionId }
      );

      // Should still succeed since recordAIChanges doesn't immediately save
      expect(result.success).toBe(true);
      expect(result.changeIds).toHaveLength(1);
    });

    it('should catch and report unexpected errors', async () => {
      // Create a scenario that causes an unexpected error
      const result = await editTracker.submitChangesFromAI(
        [{ timestamp: Date.now(), type: 'insert', from: 0, to: 0, text: 'test' }],
        'anthropic-claude',
        'claude-3-sonnet',
        undefined,
        { sessionId: null as any } // This should cause an error
      );

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Unexpected error');
    });
  });

  describe('Performance and Scaling', () => {
    it('should handle concurrent submissions efficiently', async () => {
      const promises = Array.from({ length: 10 }, (_, i) => {
        const change: EditChange = {
          timestamp: Date.now() + i,
          type: 'insert',
          from: i * 10,
          to: i * 10,
          text: `Concurrent change ${i}`
        };

        return editTracker.submitChangesFromAI(
          [change],
          'anthropic-claude',
          'claude-3-sonnet',
          { mode: 'concurrent-test' },
          { sessionId }
        );
      });

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.changeIds).toHaveLength(1);
      });

      const session = editTracker.getSession(sessionId);
      expect(session?.changes).toHaveLength(10);
    });

    it('should maintain performance with large processing contexts', async () => {
      const largeContext: AIProcessingContext = {
        mode: 'comprehensive-analysis',
        constraints: Array.from({ length: 100 }, (_, i) => `constraint-${i}`),
        settings: Object.fromEntries(
          Array.from({ length: 50 }, (_, i) => [`setting-${i}`, `value-${i}`])
        ),
        metadata: {
          documentLength: 10000,
          analysisDepth: 'deep',
          processingTime: '5 minutes',
          largeArray: Array.from({ length: 1000 }, (_, i) => i)
        }
      };

      const change: EditChange = {
        timestamp: Date.now(),
        type: 'insert',
        from: 0,
        to: 0,
        text: 'Content with large context'
      };

      const startTime = Date.now();
      const result = await editTracker.submitChangesFromAI(
        [change],
        'anthropic-claude',
        'claude-3-sonnet',
        largeContext,
        { sessionId }
      );
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(500); // Should still be reasonably fast
    });
  });

  describe('Convenience Methods', () => {
    it('should support single change submission convenience method', async () => {
      const change: EditChange = {
        timestamp: Date.now(),
        type: 'replace',
        from: 10,
        to: 20,
        text: 'replacement',
        removedText: 'original'
      };

      const result = await editTracker.submitSingleChangeFromAI(
        change,
        'anthropic-claude',
        'claude-3-sonnet',
        { mode: 'single-change' },
        { sessionId }
      );

      expect(result.success).toBe(true);
      expect(result.changeIds).toHaveLength(1);

      const session = editTracker.getSession(sessionId);
      expect(session?.changes).toHaveLength(1);
    });

    it('should support querying changes by group ID', async () => {
      const changes: EditChange[] = [
        { timestamp: Date.now(), type: 'insert', from: 0, to: 0, text: 'First' },
        { timestamp: Date.now() + 1, type: 'insert', from: 10, to: 10, text: 'Second' }
      ];

      const result = await editTracker.submitChangesFromAI(
        changes,
        'anthropic-claude',
        'claude-3-sonnet',
        undefined,
        { sessionId, groupChanges: true }
      );

      expect(result.success).toBe(true);
      expect(result.changeGroupId).toBeDefined();

      const groupedChanges = editTracker.getChangesByGroupId(sessionId, result.changeGroupId!);
      expect(groupedChanges).toHaveLength(2);
      
      groupedChanges.forEach(change => {
        expect(change.processingContext?.changeGroupId).toBe(result.changeGroupId);
      });
    });
  });
});