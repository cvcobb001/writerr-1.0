/**
 * Comprehensive tests for AI metadata validation and sanitization
 * Covers security threats, edge cases, and validation logic
 */

import { AIMetadataValidator } from '../validation/ai-metadata-validator';
import { SanitizationUtils } from '../validation/sanitization-utils';
import { AIProcessingContext } from '@shared/types';

describe('AIMetadataValidator', () => {
  describe('validateAIProvider', () => {
    it('should validate known providers', () => {
      const providers = ['openai', 'anthropic', 'google', 'custom'];
      
      providers.forEach(provider => {
        const result = AIMetadataValidator.validateAIProvider(provider);
        expect(result.isValid).toBe(true);
        expect(result.sanitizedValue).toBe(provider);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should handle unknown providers with warnings', () => {
      const result = AIMetadataValidator.validateAIProvider('unknown-provider');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe('unknown-provider');
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('Unknown AI provider');
    });

    it('should reject non-string providers', () => {
      const result = AIMetadataValidator.validateAIProvider(123 as any);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('must be a string');
    });

    it('should sanitize special characters', () => {
      const result = AIMetadataValidator.validateAIProvider('open<script>ai</script>');
      expect(result.isValid).toBe(false); // Should fail in strict mode due to security threats
      expect(result.securityThreats.length).toBeGreaterThan(0);
    });

    it('should handle extremely long provider names', () => {
      const longProvider = 'a'.repeat(150);
      const result = AIMetadataValidator.validateAIProvider(longProvider);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('too long');
    });

    it('should sanitize to empty string for invalid characters', () => {
      const result = AIMetadataValidator.validateAIProvider('###$$$@@@');
      expect(result.isValid).toBe(false);
      expect(result.sanitizedValue).toBe('');
      expect(result.errors[0]).toContain('empty after sanitization');
    });
  });

  describe('validateAIModel', () => {
    it('should validate common model names', () => {
      const models = ['gpt-4o-mini', 'claude-3.5-sonnet', 'gemini-pro', 'llama2:7b'];
      
      models.forEach(model => {
        const result = AIMetadataValidator.validateAIModel(model);
        expect(result.isValid).toBe(true);
        expect(result.sanitizedValue).toBe(model);
      });
    });

    it('should reject models with security threats', () => {
      const maliciousModel = 'gpt-4<iframe src=\"evil.com\"></iframe>';
      const result = AIMetadataValidator.validateAIModel(maliciousModel, undefined, true);
      expect(result.isValid).toBe(false);
      expect(result.securityThreats).toContain('script_injection');
    });

    it('should handle model names with version numbers', () => {
      const model = 'claude-3.5-sonnet-20241022';
      const result = AIMetadataValidator.validateAIModel(model);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe(model);
    });

    it('should reject extremely long model names', () => {
      const longModel = 'model-' + 'a'.repeat(300);
      const result = AIMetadataValidator.validateAIModel(longModel);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('too long');
    });
  });

  describe('validateAITimestamp', () => {
    it('should validate current timestamps', () => {
      const now = new Date();
      const result = AIMetadataValidator.validateAITimestamp(now);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toEqual(now);
    });

    it('should validate recent string timestamps', () => {
      const recent = new Date(Date.now() - 1000 * 60 * 5); // 5 minutes ago
      const result = AIMetadataValidator.validateAITimestamp(recent.toISOString());
      expect(result.isValid).toBe(true);
    });

    it('should reject future timestamps', () => {
      const future = new Date(Date.now() + 1000 * 60 * 60); // 1 hour from now
      const result = AIMetadataValidator.validateAITimestamp(future);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Invalid AI timestamp');
    });

    it('should reject very old timestamps', () => {
      const ancient = new Date('2020-01-01');
      const result = AIMetadataValidator.validateAITimestamp(ancient);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Invalid AI timestamp');
    });

    it('should reject invalid date strings', () => {
      const result = AIMetadataValidator.validateAITimestamp('not-a-date');
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Invalid AI timestamp');
    });
  });

  describe('validateProcessingContext', () => {
    it('should validate basic processing context', () => {
      const context: AIProcessingContext = {
        mode: 'edit',
        constraints: ['keep-tone', 'fix-grammar'],
        prompt: 'Please fix the grammar in this text'
      };

      const result = AIMetadataValidator.validateProcessingContext(context);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toMatchObject(context);
    });

    it('should sanitize constraints array', () => {
      const context: AIProcessingContext = {
        constraints: [
          'valid-constraint',
          '<script>alert("xss")</script>',
          'another-valid',
          '' // empty constraint
        ]
      };

      const result = AIMetadataValidator.validateProcessingContext(context);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue.constraints).toHaveLength(2); // Empty and script removed
      expect(result.sanitizedValue.constraints).toContain('valid-constraint');
      expect(result.securityThreats.length).toBeGreaterThan(0);
    });

    it('should enforce constraints array size limit', () => {
      const context: AIProcessingContext = {
        constraints: Array(60).fill('constraint') // 60 constraints, limit is 50
      };

      const result = AIMetadataValidator.validateProcessingContext(context);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue.constraints).toHaveLength(50);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should sanitize prompt field', () => {
      const context: AIProcessingContext = {
        prompt: 'Fix this text <script>alert("hack")</script> please'
      };

      const result = AIMetadataValidator.validateProcessingContext(context, 50000, true);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue.prompt).not.toContain('<script>');
      expect(result.securityThreats).toContain('script_injection');
    });

    it('should enforce prompt length limits', () => {
      const context: AIProcessingContext = {
        prompt: 'a'.repeat(15000) // Exceeds 10,000 char limit
      };

      const result = AIMetadataValidator.validateProcessingContext(context);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue.prompt?.length).toBeLessThanOrEqual(10000);
      expect(result.sanitizedValue.prompt).toContain('...'); // Should be truncated
    });

    it('should validate and sanitize mode field', () => {
      const context: AIProcessingContext = {
        mode: 'Custom-Edit-Mode!'
      };

      const result = AIMetadataValidator.validateProcessingContext(context);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue.mode).toBe('custom-edit-mode'); // Sanitized and lowercased
    });

    it('should warn about unknown modes', () => {
      const context: AIProcessingContext = {
        mode: 'unknown-mode'
      };

      const result = AIMetadataValidator.validateProcessingContext(context);
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('Unknown processing mode'))).toBe(true);
    });

    it('should reject oversized processing context', () => {
      const context: AIProcessingContext = {
        documentContext: 'a'.repeat(60000), // Large document context
        prompt: 'a'.repeat(10000),
        instructions: 'a'.repeat(5000)
      };

      const result = AIMetadataValidator.validateProcessingContext(context, 50000);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('too large');
    });

    it('should handle non-object processing context', () => {
      const result = AIMetadataValidator.validateProcessingContext('not-an-object' as any);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('must be an object');
      expect(result.sanitizedValue).toEqual({});
    });

    it('should sanitize nested objects to prevent prototype pollution', () => {
      const maliciousContext = {
        mode: 'edit',
        '__proto__': { isAdmin: true },
        'constructor': { prototype: { isAdmin: true } }
      } as any;

      const result = AIMetadataValidator.validateProcessingContext(maliciousContext);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).not.toHaveProperty('__proto__');
      expect(result.sanitizedValue).not.toHaveProperty('constructor');
    });
  });

  describe('validateAIMetadata (full validation)', () => {
    it('should validate complete metadata', () => {
      const result = AIMetadataValidator.validateAIMetadata(
        'openai',
        'gpt-4o-mini',
        {
          mode: 'edit',
          constraints: ['grammar', 'tone'],
          prompt: 'Fix grammar issues'
        },
        new Date()
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitizedMetadata).toBeDefined();
    });

    it('should handle partial metadata', () => {
      const result = AIMetadataValidator.validateAIMetadata(
        'openai',
        undefined,
        undefined,
        new Date()
      );

      expect(result.isValid).toBe(true);
      expect(result.sanitizedMetadata?.aiProvider).toBe('openai');
      expect(result.sanitizedMetadata?.aiModel).toBeUndefined();
    });

    it('should aggregate errors from multiple fields', () => {
      const result = AIMetadataValidator.validateAIMetadata(
        123 as any, // Invalid provider
        456 as any, // Invalid model
        'not-object' as any, // Invalid context
        'not-date' // Invalid timestamp
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(4);
    });

    it('should respect bypass validation flag', () => {
      const result = AIMetadataValidator.validateAIMetadata(
        '<script>evil</script>',
        '<script>evil</script>',
        'not-object' as any,
        'not-date',
        { bypassValidation: true }
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should use different validation configs for environments', () => {
      const devConfig = AIMetadataValidator.getValidationConfig('development');
      const prodConfig = AIMetadataValidator.getValidationConfig('production');

      expect(devConfig.strictMode).toBe(false);
      expect(prodConfig.strictMode).toBe(true);
      expect(devConfig.maxProcessingContextSize || 0).toBeGreaterThan(prodConfig.maxProcessingContextSize || 0);
    });
  });

  describe('quickValidate', () => {
    it('should provide simplified validation interface', () => {
      const { isValid, sanitized } = AIMetadataValidator.quickValidate(
        'openai',
        'gpt-4o-mini',
        { mode: 'edit' },
        new Date()
      );

      expect(isValid).toBe(true);
      expect(sanitized).toHaveProperty('aiProvider', 'openai');
      expect(sanitized).toHaveProperty('aiModel', 'gpt-4o-mini');
    });

    it('should return false for invalid data', () => {
      const { isValid, sanitized } = AIMetadataValidator.quickValidate(
        123 as any,
        456 as any
      );

      expect(isValid).toBe(false);
      expect(sanitized).toBeDefined();
    });
  });
});

describe('SanitizationUtils', () => {
  describe('sanitizeString', () => {
    it('should remove script tags', () => {
      const input = 'Hello <script>alert("xss")</script> world';
      const result = SanitizationUtils.sanitizeString(input);
      expect(result).toBe('Hello  world');
      expect(result).not.toContain('<script>');
    });

    it('should remove dangerous protocols', () => {
      const input = 'Click javascript:alert("xss") here';
      const result = SanitizationUtils.sanitizeString(input);
      expect(result).toContain('removed:');
      expect(result).not.toContain('javascript:');
    });

    it('should remove event attributes', () => {
      const input = '<div onclick="alert()">content</div>';
      const result = SanitizationUtils.sanitizeString(input);
      expect(result).not.toContain('onclick');
    });

    it('should handle length limits with ellipsis', () => {
      const input = 'a'.repeat(100);
      const result = SanitizationUtils.sanitizeString(input, { maxLength: 50 });
      expect(result.length).toBeLessThanOrEqual(50);
      expect(result).toContain('...');
    });

    it('should preserve newlines when requested', () => {
      const input = 'Line 1\\nLine 2\\nLine 3';
      const result = SanitizationUtils.sanitizeString(input, { preserveNewlines: true });
      expect(result).toContain('\\n');
    });

    it('should remove control characters', () => {
      const input = 'Hello\\x00\\x01\\x02World';
      const result = SanitizationUtils.sanitizeString(input);
      expect(result).toBe('HelloWorld');
    });
  });

  describe('sanitizeStringArray', () => {
    it('should limit array size', () => {
      const input = Array(60).fill('item');
      const result = SanitizationUtils.sanitizeStringArray(input, 50);
      expect(result).toHaveLength(50);
    });

    it('should sanitize individual items', () => {
      const input = ['good item', '<script>bad</script>', 'another good'];
      const result = SanitizationUtils.sanitizeStringArray(input);
      expect(result).toHaveLength(2); // Script item removed
      expect(result).toContain('good item');
    });

    it('should remove empty strings after sanitization', () => {
      const input = ['valid', '   ', '<script></script>', ''];
      const result = SanitizationUtils.sanitizeStringArray(input);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe('valid');
    });
  });

  describe('security threat detection', () => {
    it('should detect script injection', () => {
      const threats = SanitizationUtils.detectSecurityThreats('<script>alert()</script>');
      expect(threats).toContain('script_injection');
    });

    it('should detect dangerous protocols', () => {
      const threats = SanitizationUtils.detectSecurityThreats('javascript:alert()');
      expect(threats).toContain('dangerous_protocol');
    });

    it('should detect event handlers', () => {
      const threats = SanitizationUtils.detectSecurityThreats('<div onclick="bad()">');
      expect(threats).toContain('event_handler');
    });

    it('should detect excessive length', () => {
      const longString = 'a'.repeat(200000);
      const threats = SanitizationUtils.detectSecurityThreats(longString);
      expect(threats).toContain('excessive_length');
    });

    it('should return empty array for safe content', () => {
      const threats = SanitizationUtils.detectSecurityThreats('This is safe content');
      expect(threats).toHaveLength(0);
    });
  });

  describe('timestamp validation', () => {
    it('should validate recent dates', () => {
      const recent = new Date();
      const result = SanitizationUtils.validateTimestamp(recent);
      expect(result).toEqual(recent);
    });

    it('should reject future dates', () => {
      const future = new Date(Date.now() + 1000 * 60 * 60 * 24); // Tomorrow
      const result = SanitizationUtils.validateTimestamp(future);
      expect(result).toBeNull();
    });

    it('should reject very old dates', () => {
      const old = new Date('2020-01-01');
      const result = SanitizationUtils.validateTimestamp(old);
      expect(result).toBeNull();
    });

    it('should handle string dates', () => {
      const dateString = new Date().toISOString();
      const result = SanitizationUtils.validateTimestamp(dateString);
      expect(result).toBeInstanceOf(Date);
    });

    it('should reject invalid dates', () => {
      const result = SanitizationUtils.validateTimestamp('invalid-date');
      expect(result).toBeNull();
    });
  });

  describe('object sanitization', () => {
    it('should prevent prototype pollution', () => {
      const malicious = {
        normal: 'value',
        '__proto__': { isAdmin: true },
        'constructor': { prototype: { isAdmin: true } }
      };

      const result = SanitizationUtils.sanitizeObject(malicious);
      expect(result).toHaveProperty('normal', 'value');
      expect(result).not.toHaveProperty('__proto__');
      expect(result).not.toHaveProperty('constructor');
    });

    it('should handle nested objects', () => {
      const nested = {
        level1: {
          level2: {
            level3: 'deep value'
          }
        }
      };

      const result = SanitizationUtils.sanitizeObject(nested);
      expect(result.level1.level2.level3).toBe('deep value');
    });

    it('should handle arrays', () => {
      const withArray = {
        items: ['a', 'b', { nested: 'value' }]
      };

      const result = SanitizationUtils.sanitizeObject(withArray);
      expect(result.items).toHaveLength(3);
      expect(result.items[2].nested).toBe('value');
    });

    it('should respect depth limits', () => {
      const deep = { level1: { level2: { level3: { level4: 'too deep' } } } };
      const result = SanitizationUtils.sanitizeObject(deep, 2);
      expect(result.level1.level2).toBeNull();
    });
  });
});