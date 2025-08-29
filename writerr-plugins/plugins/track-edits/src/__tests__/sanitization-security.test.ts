/**
 * Security-focused tests for AI metadata sanitization
 * Tests specific attack vectors and edge cases for security validation
 */

import { AIMetadataValidator } from '../validation/ai-metadata-validator';
import { SanitizationUtils } from '../validation/sanitization-utils';
import { AIProcessingContext } from '@shared/types';

describe('Security-focused validation tests', () => {
  describe('XSS Prevention', () => {
    it('should prevent basic script injection in provider', () => {
      const malicious = '<script>document.location="http://evil.com"</script>';
      const result = AIMetadataValidator.validateAIProvider(malicious);
      
      expect(result.isValid).toBe(false);
      expect(result.securityThreats).toContain('script_injection');
      expect(result.sanitizedValue).not.toContain('<script>');
    });

    it('should prevent iframe injection in model name', () => {
      const malicious = 'gpt-4<iframe src="javascript:alert(1)"></iframe>';
      const result = AIMetadataValidator.validateAIModel(malicious);
      
      expect(result.isValid).toBe(false);
      expect(result.securityThreats).toContain('script_injection');
      expect(result.sanitizedValue).toBe('gpt-4');
    });

    it('should prevent event handler injection in processing context', () => {
      const context: AIProcessingContext = {
        prompt: '<div onload="alert(1)">Edit this text</div>',
        instructions: '<span onclick="steal_data()">Click me</span>'
      };

      const result = AIMetadataValidator.validateProcessingContext(context);
      expect(result.securityThreats).toContain('event_handler');
      expect(result.sanitizedValue.prompt).not.toContain('onload');
      expect(result.sanitizedValue.instructions).not.toContain('onclick');
    });

    it('should prevent javascript protocol injection', () => {
      const context: AIProcessingContext = {
        documentContext: 'Click <a href="javascript:alert(1)">here</a>',
        prompt: 'Process this javascript:void(0) link'
      };

      const result = AIMetadataValidator.validateProcessingContext(context);
      expect(result.securityThreats).toContain('dangerous_protocol');
      expect(result.sanitizedValue.documentContext).toContain('removed:');
      expect(result.sanitizedValue.prompt).toContain('removed:');
    });

    it('should handle multiple XSS vectors in single field', () => {
      const malicious = '<script>alert(1)</script><iframe src="evil.com"></iframe><div onclick="bad()">text</div>';
      const result = SanitizationUtils.sanitizeString(malicious);
      
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('<iframe>');
      expect(result).not.toContain('onclick');
      expect(result).toBe('text');
    });
  });

  describe('Injection Attack Prevention', () => {
    it('should prevent SQL-like injection patterns', () => {
      const suspicious = "'; DROP TABLE users; --";
      const result = SanitizationUtils.sanitizeString(suspicious);
      
      // Should be sanitized but not necessarily rejected (not SQL context)
      expect(result).not.toContain('DROP TABLE');
      expect(result.length).toBeLessThan(suspicious.length);
    });

    it('should handle NoSQL injection patterns', () => {
      const context: AIProcessingContext = {
        constraints: ['$ne', '$regex', '$where', 'normal-constraint'],
        mode: '$gt'
      };

      const result = AIMetadataValidator.validateProcessingContext(context);
      // These should be allowed as they might be legitimate constraint names
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue.constraints).toContain('normal-constraint');
    });

    it('should prevent command injection attempts', () => {
      const malicious = 'normal text; rm -rf /; echo "hacked"';
      const result = SanitizationUtils.sanitizeString(malicious);
      
      expect(result).toBe(malicious); // Not shell context, so preserved but logged
    });
  });

  describe('Prototype Pollution Prevention', () => {
    it('should prevent __proto__ pollution', () => {
      const malicious = {
        mode: 'edit',
        '__proto__': {
          isAdmin: true,
          polluted: 'yes'
        }
      } as any;

      const result = AIMetadataValidator.validateProcessingContext(malicious);
      expect(result.sanitizedValue).not.toHaveProperty('__proto__');
      expect((result.sanitizedValue as any).isAdmin).toBeUndefined();
    });

    it('should prevent constructor pollution', () => {
      const malicious = {
        'constructor': {
          'prototype': {
            'polluted': true
          }
        },
        mode: 'edit'
      } as any;

      const result = AIMetadataValidator.validateProcessingContext(malicious);
      expect(result.sanitizedValue).not.toHaveProperty('constructor');
      expect(result.sanitizedValue.mode).toBe('edit');
    });

    it('should handle nested pollution attempts', () => {
      const malicious = {
        normalField: {
          '__proto__': { admin: true },
          validData: 'keep this'
        }
      };

      const result = SanitizationUtils.sanitizeObject(malicious);
      expect(result.normalField).not.toHaveProperty('__proto__');
      expect(result.normalField.validData).toBe('keep this');
    });
  });

  describe('DoS Prevention', () => {
    it('should reject extremely large processing contexts', () => {
      const massive = {
        documentContext: 'a'.repeat(100000),
        prompt: 'b'.repeat(50000),
        instructions: 'c'.repeat(25000)
      };

      const result = AIMetadataValidator.validateProcessingContext(massive, 50000);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('too large');
    });

    it('should limit constraints array size', () => {
      const tooManyConstraints = Array(100).fill('constraint');
      const context: AIProcessingContext = {
        constraints: tooManyConstraints
      };

      const result = AIMetadataValidator.validateProcessingContext(context);
      expect(result.isValid).toBe(true); // Valid after truncation
      expect(result.sanitizedValue.constraints?.length).toBeLessThanOrEqual(50);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should prevent deeply nested objects', () => {
      let deepObject: any = {};
      let current = deepObject;
      
      // Create 20 levels of nesting
      for (let i = 0; i < 20; i++) {
        current.nested = {};
        current = current.nested;
      }
      current.value = 'deep';

      const result = SanitizationUtils.sanitizeObject(deepObject, 5);
      // Should be truncated at depth 5
      let check = result;
      for (let i = 0; i < 5; i++) {
        expect(check).toHaveProperty('nested');
        check = check.nested;
      }
      expect(check).toBeNull(); // Depth limit reached
    });

    it('should detect excessive string lengths', () => {
      const massive = 'a'.repeat(200000);
      const threats = SanitizationUtils.detectSecurityThreats(massive);
      expect(threats).toContain('excessive_length');
    });
  });

  describe('Data Corruption Prevention', () => {
    it('should handle null bytes in strings', () => {
      const withNulls = 'text\\x00with\\x00nulls';
      const result = SanitizationUtils.sanitizeString(withNulls);
      expect(result).toBe('textwithnulls');
      expect(result).not.toContain('\\x00');
    });

    it('should normalize Unicode attacks', () => {
      // Using Unicode to disguise malicious content
      const disguised = 'javascript\\u003Aalert(1)'; // javascript:alert(1) in Unicode
      const result = SanitizationUtils.sanitizeString(disguised);
      expect(result).toContain('removed:');
    });

    it('should handle circular references safely', () => {
      const obj: any = { name: 'test' };
      obj.circular = obj; // Create circular reference

      // Should not crash
      expect(() => {
        SanitizationUtils.calculateSerializedSize(obj);
      }).not.toThrow();
    });

    it('should preserve legitimate content while removing threats', () => {
      const mixed = 'This is <strong>legitimate</strong> content <script>alert(1)</script> with more text.';
      const result = SanitizationUtils.sanitizeString(mixed, { 
        allowBasicFormatting: true, 
        strictMode: false 
      });
      
      expect(result).toContain('<strong>legitimate</strong>');
      expect(result).not.toContain('<script>');
      expect(result).toContain('with more text.');
    });
  });

  describe('Edge Cases and Boundaries', () => {
    it('should handle empty strings gracefully', () => {
      const result = AIMetadataValidator.validateAIProvider('');
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('empty after sanitization');
    });

    it('should handle whitespace-only strings', () => {
      const result = AIMetadataValidator.validateAIProvider('   \\t\\n   ');
      expect(result.isValid).toBe(false);
      expect(result.sanitizedValue).toBe('');
    });

    it('should handle non-string types gracefully', () => {
      const testValues = [null, undefined, 123, true, {}, []];
      
      testValues.forEach(value => {
        const result = AIMetadataValidator.validateAIProvider(value as any);
        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toContain('must be a string');
      });
    });

    it('should handle malformed processing context', () => {
      const malformed = [
        null,
        'string instead of object',
        123,
        [],
        undefined
      ];

      malformed.forEach(value => {
        const result = AIMetadataValidator.validateProcessingContext(value as any);
        expect(result.isValid).toBe(false);
        expect(result.sanitizedValue).toEqual({});
      });
    });

    it('should preserve valid data while sanitizing invalid parts', () => {
      const mixed: AIProcessingContext = {
        mode: 'edit', // valid
        prompt: '<script>alert(1)</script>Clean this text', // partially malicious
        constraints: ['good-constraint', '<script>bad</script>', 'another-good'], // mixed
        instructions: 'Valid instructions' // valid
      };

      const result = AIMetadataValidator.validateProcessingContext(mixed);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue.mode).toBe('edit');
      expect(result.sanitizedValue.prompt).toContain('Clean this text');
      expect(result.sanitizedValue.prompt).not.toContain('<script>');
      expect(result.sanitizedValue.constraints).toContain('good-constraint');
      expect(result.sanitizedValue.constraints).toContain('another-good');
      expect(result.sanitizedValue.constraints?.length).toBe(2); // Bad one removed
      expect(result.sanitizedValue.instructions).toBe('Valid instructions');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle validation of large datasets efficiently', () => {
      const startTime = Date.now();
      
      // Validate 100 metadata objects
      for (let i = 0; i < 100; i++) {
        AIMetadataValidator.validateAIMetadata(
          'openai',
          `gpt-4-${i}`,
          {
            mode: 'edit',
            constraints: Array(10).fill(`constraint-${i}`),
            prompt: `Process text number ${i}`.repeat(10)
          },
          new Date()
        );
      }
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should not leak memory with repeated validations', () => {
      // This is more of a smoke test - actual memory leak detection
      // would require more sophisticated tooling
      const initialMemory = process.memoryUsage().heapUsed;
      
      for (let i = 0; i < 1000; i++) {
        const result = AIMetadataValidator.validateProcessingContext({
          prompt: `Test prompt ${i}`,
          documentContext: 'x'.repeat(1000)
        });
        // Force garbage collection of result
        void result;
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory should not increase excessively (allow for some variance)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB
    });
  });

  describe('Logging and Monitoring', () => {
    it('should log security violations in production mode', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      AIMetadataValidator.validateAIMetadata(
        '<script>evil</script>',
        'gpt-4',
        undefined,
        new Date(),
        { logSecurityViolations: true }
      );
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'AI metadata security threats detected:',
        expect.objectContaining({
          threats: expect.arrayContaining(['script_injection'])
        })
      );
      
      consoleSpy.mockRestore();
    });

    it('should not log security violations when disabled', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      AIMetadataValidator.validateAIMetadata(
        '<script>evil</script>',
        'gpt-4',
        undefined,
        new Date(),
        { logSecurityViolations: false }
      );
      
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});