/**
 * Integration tests for AI metadata validation system
 * Tests the complete integration between EditTracker and validation system
 */

import { EditTracker } from '../edit-tracker';
import { AIMetadataValidator } from '../validation/ai-metadata-validator';
import { AIProcessingContext, EditChange, EditSession } from '@shared/types';
import { generateId } from '@shared/utils';

// Mock TrackEditsPlugin for testing
const mockPlugin = {
  app: {
    vault: {
      read: jest.fn().mockResolvedValue('Mock file content')
    }
  },
  settings: {
    retentionDays: 30
  },
  loadData: jest.fn().mockResolvedValue(null),
  saveData: jest.fn().mockResolvedValue(undefined)
} as any;

// Mock TFile for testing
const mockFile = {
  path: 'test.md',
  name: 'test.md'
} as any;

describe('EditTracker AI Metadata Validation Integration', () => {
  let editTracker: EditTracker;
  let sessionId: string;

  beforeEach(() => {
    jest.clearAllMocks();
    editTracker = new EditTracker(mockPlugin);
    
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

  describe('recordAIChanges with validation', () => {
    it('should successfully record valid AI changes', async () => {
      const changes: EditChange[] = [{
        id: generateId(),
        timestamp: Date.now(),
        type: 'replace',
        from: 0,
        to: 10,
        text: 'corrected text',
        removedText: 'wrong text'
      }];

      const processingContext: AIProcessingContext = {
        mode: 'edit',
        constraints: ['grammar', 'tone'],
        prompt: 'Fix grammar errors in this text'
      };

      const result = editTracker.recordAIChanges(
        sessionId,
        changes,
        'openai',
        'gpt-4o-mini',
        processingContext
      );

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);

      // Verify the change was recorded with sanitized metadata
      const session = editTracker.getSession(sessionId);
      expect(session?.changes).toHaveLength(1);
      expect(session?.changes[0].aiProvider).toBe('openai');
      expect(session?.changes[0].aiModel).toBe('gpt-4o-mini');
      expect(session?.changes[0].processingContext?.mode).toBe('edit');
    });

    it('should reject AI changes with malicious metadata', async () => {
      const changes: EditChange[] = [{
        id: generateId(),
        timestamp: Date.now(),
        type: 'insert',
        from: 0,
        to: 0,
        text: 'new text'
      }];

      const maliciousContext: AIProcessingContext = {
        prompt: '<script>alert("xss")</script>Fix this text',
        instructions: '<iframe src="evil.com"></iframe>',
        constraints: ['<script>steal()</script>', 'valid-constraint']
      };

      const result = editTracker.recordAIChanges(
        sessionId,
        changes,
        '<script>evil</script>',
        'gpt-4<iframe>bad</iframe>',
        maliciousContext
      );

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      // Verify no changes were recorded due to validation failure
      const session = editTracker.getSession(sessionId);
      expect(session?.changes).toHaveLength(0);
    });

    it('should sanitize and record with warnings for partially valid metadata', async () => {
      const changes: EditChange[] = [{
        id: generateId(),
        timestamp: Date.now(),
        type: 'replace',
        from: 5,
        to: 15,
        text: 'better text',
        removedText: 'old text'
      }];

      const mixedContext: AIProcessingContext = {
        mode: 'edit', // valid
        prompt: 'Clean this text <script>alert(1)</script> please', // partially malicious
        constraints: ['good-constraint', '<script>bad</script>', 'another-good'] // mixed
      };

      const result = editTracker.recordAIChanges(
        sessionId,
        changes,
        'openai',
        'gpt-4o-mini',
        mixedContext,
        new Date(),
        { strictMode: false } // Allow sanitization
      );

      expect(result.success).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);

      // Verify the change was recorded with sanitized metadata
      const session = editTracker.getSession(sessionId);
      expect(session?.changes).toHaveLength(1);
      
      const change = session?.changes[0];
      expect(change?.processingContext?.prompt).not.toContain('<script>');
      expect(change?.processingContext?.prompt).toContain('Clean this text');
      expect(change?.processingContext?.constraints).toContain('good-constraint');
      expect(change?.processingContext?.constraints).toContain('another-good');
      expect(change?.processingContext?.constraints).not.toContain('<script>bad</script>');
    });

    it('should handle bypass validation for trusted sources', async () => {
      const changes: EditChange[] = [{
        id: generateId(),
        timestamp: Date.now(),
        type: 'insert',
        from: 0,
        to: 0,
        text: 'trusted content'
      }];

      // This would normally fail validation
      const result = editTracker.recordAIChanges(
        sessionId,
        changes,
        '<script>trusted-source</script>',
        '<iframe>trusted-model</iframe>',
        {
          prompt: '<script>trusted-prompt</script>'
        } as AIProcessingContext,
        new Date(),
        { bypassValidation: true }
      );

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);

      // Verify the change was recorded without sanitization
      const session = editTracker.getSession(sessionId);
      expect(session?.changes).toHaveLength(1);
      expect(session?.changes[0].aiProvider).toContain('<script>');
    });

    it('should validate timestamp ranges correctly', async () => {
      const changes: EditChange[] = [{
        id: generateId(),
        timestamp: Date.now(),
        type: 'replace',
        from: 0,
        to: 5,
        text: 'new'
      }];

      // Test with future timestamp (should fail)
      const futureDate = new Date(Date.now() + 1000 * 60 * 60); // 1 hour from now
      const futureResult = editTracker.recordAIChanges(
        sessionId,
        changes,
        'openai',
        'gpt-4o-mini',
        undefined,
        futureDate
      );

      expect(futureResult.success).toBe(false);
      expect(futureResult.errors.some(e => e.includes('timestamp'))).toBe(true);

      // Test with valid recent timestamp (should succeed)
      const recentDate = new Date(Date.now() - 1000 * 60); // 1 minute ago
      const recentResult = editTracker.recordAIChanges(
        sessionId,
        changes,
        'openai',
        'gpt-4o-mini',
        undefined,
        recentDate
      );

      expect(recentResult.success).toBe(true);
    });
  });

  describe('getAIMetadataStats with validation', () => {
    it('should analyze existing metadata for security threats', async () => {
      // Add some changes with potential security issues
      const changes: EditChange[] = [
        {
          id: generateId(),
          timestamp: Date.now(),
          type: 'insert',
          from: 0,
          to: 0,
          text: 'clean text',
          aiProvider: 'openai',
          aiModel: 'gpt-4o-mini'
        },
        {
          id: generateId(),
          timestamp: Date.now(),
          type: 'replace',
          from: 0,
          to: 10,
          text: 'suspicious text',
          aiProvider: '<script>suspicious</script>',
          aiModel: 'gpt-4',
          processingContext: {
            prompt: '<iframe src="evil.com">hack</iframe>',
            mode: 'edit'
          }
        }
      ];

      // Manually add changes to bypass validation for testing
      const session = editTracker.getSession(sessionId);
      session!.changes.push(...changes);

      const stats = editTracker.getAIMetadataStats(sessionId);

      expect(stats.totalAIChanges).toBe(2);
      expect(stats.validationWarnings).toBeGreaterThan(0);
      expect(stats.securityThreats.length).toBeGreaterThan(0);
      expect(stats.securityThreats).toContain('script_injection');
    });
  });

  describe('validateAndSanitizeAIMetadata public method', () => {
    it('should provide external validation capability', () => {
      const result = editTracker.validateAndSanitizeAIMetadata(
        'openai',
        'gpt-4o-mini',
        {
          mode: 'edit',
          prompt: 'Clean <script>alert(1)</script> this text'
        },
        new Date(),
        { strictMode: true }
      );

      expect(result.isValid).toBe(false); // Should fail due to script in prompt
      expect(result.securityThreats).toContain('script_injection');
      expect(result.sanitizedMetadata?.processingContext?.prompt).not.toContain('<script>');
    });
  });

  describe('Legacy compatibility with validation', () => {
    it('should handle mixed legacy and validated changes', async () => {
      // Add a legacy change (no AI metadata)
      const legacyChange: EditChange = {
        id: generateId(),
        timestamp: Date.now() - 1000,
        type: 'insert',
        from: 0,
        to: 0,
        text: 'legacy text'
      };

      editTracker.recordChanges(sessionId, [legacyChange]);

      // Add a validated AI change
      const aiResult = editTracker.recordAIChanges(
        sessionId,
        [{
          id: generateId(),
          timestamp: Date.now(),
          type: 'replace',
          from: 0,
          to: 11,
          text: 'ai-corrected text'
        }],
        'anthropic',
        'claude-3.5-sonnet',
        { mode: 'proofread' }
      );

      expect(aiResult.success).toBe(true);

      const session = editTracker.getSession(sessionId);
      expect(session?.changes).toHaveLength(2);

      const stats = editTracker.getAIMetadataStats(sessionId);
      expect(stats.totalAIChanges).toBe(1); // Only the AI change counted
      expect(stats.aiProviders).toContain('anthropic');
    });
  });
});

describe('Standalone AI Metadata Validator', () => {
  describe('Environment-specific configurations', () => {
    it('should provide different validation rules for different environments', () => {
      const devConfig = AIMetadataValidator.getValidationConfig('development');
      const prodConfig = AIMetadataValidator.getValidationConfig('production');
      const testConfig = AIMetadataValidator.getValidationConfig('testing');

      expect(devConfig.strictMode).toBe(false);
      expect(prodConfig.strictMode).toBe(true);
      expect(testConfig.strictMode).toBe(true);

      expect(devConfig.maxProcessingContextSize).toBeGreaterThan(prodConfig.maxProcessingContextSize!);
      expect(testConfig.maxProcessingContextSize).toBeLessThan(prodConfig.maxProcessingContextSize!);
    });
  });

  describe('quickValidate convenience method', () => {
    it('should provide simplified validation interface', () => {
      const { isValid, sanitized } = AIMetadataValidator.quickValidate(
        'openai',
        'gpt-4o-mini',
        { mode: 'edit', prompt: 'Clean text' },
        new Date()
      );

      expect(isValid).toBe(true);
      expect(sanitized.aiProvider).toBe('openai');
      expect(sanitized.aiModel).toBe('gpt-4o-mini');
      expect(sanitized.processingContext?.mode).toBe('edit');
    });

    it('should handle invalid data gracefully', () => {
      const { isValid, sanitized } = AIMetadataValidator.quickValidate(
        123 as any, // Invalid provider
        '<script>evil</script>', // Malicious model
        'not-object' as any, // Invalid context
        'invalid-date' // Invalid timestamp
      );

      expect(isValid).toBe(false);
      expect(sanitized).toBeDefined();
    });
  });
});