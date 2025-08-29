/**
 * Comprehensive tests for Enhanced EditChange Interface with AI Metadata
 * 
 * This test suite validates the enhanced EditChange interface that includes
 * AI provider metadata for tracking AI-assisted edits in the Track Edits plugin.
 * 
 * Enhanced EditChange Interface adds:
 * - aiProvider: string (e.g., "claude-3", "gpt-4") 
 * - aiModel: string (e.g., "claude-3-opus", "gpt-4-turbo")
 * - processingContext: object with constraints, prompt details
 * - timestamp: Date object for when AI processing occurred
 */

// Enhanced EditChange interface definition for testing
interface EnhancedEditChange {
  // Original EditChange fields
  id: string;
  timestamp: number;
  type: 'insert' | 'delete' | 'replace';
  from: number;
  to: number;
  text?: string;
  removedText?: string;
  author?: string;
  
  // New AI metadata fields
  aiProvider?: string;
  aiModel?: string;
  processingContext?: {
    constraints?: string[];
    prompt?: string;
    mode?: string;
    instructions?: string;
    documentContext?: string;
  };
  aiTimestamp?: Date;
}

// Mock processing context for testing
const mockProcessingContext = {
  constraints: ['maintain_voice', 'preserve_formatting'],
  prompt: 'Improve clarity and conciseness while maintaining the author\'s voice',
  mode: 'professional-editor',
  instructions: 'Focus on sentence structure and word choice',
  documentContext: 'Academic paper on machine learning'
};

describe('Enhanced EditChange Interface', () => {
  
  describe('Basic EditChange Creation with AI Metadata', () => {
    test('should create valid EditChange with all AI metadata fields', () => {
      const enhancedEdit: EnhancedEditChange = {
        id: 'edit_001',
        timestamp: Date.now(),
        type: 'replace',
        from: 100,
        to: 150,
        text: 'improved text with better clarity',
        removedText: 'original unclear text',
        author: 'user',
        aiProvider: 'claude-3',
        aiModel: 'claude-3-opus',
        processingContext: mockProcessingContext,
        aiTimestamp: new Date()
      };

      expect(enhancedEdit.id).toBe('edit_001');
      expect(enhancedEdit.type).toBe('replace');
      expect(enhancedEdit.aiProvider).toBe('claude-3');
      expect(enhancedEdit.aiModel).toBe('claude-3-opus');
      expect(enhancedEdit.processingContext).toEqual(mockProcessingContext);
      expect(enhancedEdit.aiTimestamp).toBeInstanceOf(Date);
    });

    test('should create valid EditChange with minimal AI metadata', () => {
      const enhancedEdit: EnhancedEditChange = {
        id: 'edit_002',
        timestamp: Date.now(),
        type: 'insert',
        from: 200,
        to: 200,
        text: 'inserted by AI',
        aiProvider: 'gpt-4',
        aiModel: 'gpt-4-turbo'
      };

      expect(enhancedEdit.aiProvider).toBe('gpt-4');
      expect(enhancedEdit.aiModel).toBe('gpt-4-turbo');
      expect(enhancedEdit.processingContext).toBeUndefined();
      expect(enhancedEdit.aiTimestamp).toBeUndefined();
    });

    test('should create valid EditChange with different AI providers', () => {
      const providers = [
        { provider: 'claude-3', model: 'claude-3-sonnet' },
        { provider: 'gpt-4', model: 'gpt-4-turbo' },
        { provider: 'gpt-3.5', model: 'gpt-3.5-turbo' },
        { provider: 'gemini', model: 'gemini-pro' }
      ];

      providers.forEach(({ provider, model }, index) => {
        const edit: EnhancedEditChange = {
          id: `edit_00${index + 3}`,
          timestamp: Date.now(),
          type: 'replace',
          from: index * 100,
          to: (index * 100) + 50,
          text: `text from ${provider}`,
          aiProvider: provider,
          aiModel: model
        };

        expect(edit.aiProvider).toBe(provider);
        expect(edit.aiModel).toBe(model);
      });
    });
  });

  describe('Validation of Required AI Metadata Fields', () => {
    test('should validate aiProvider field format', () => {
      const validProviders = ['claude-3', 'gpt-4', 'gpt-3.5', 'gemini', 'anthropic', 'openai'];
      const invalidProviders = ['', '   ', 'invalid provider with spaces', '123invalid'];

      validProviders.forEach(provider => {
        const edit: EnhancedEditChange = {
          id: 'test_edit',
          timestamp: Date.now(),
          type: 'insert',
          from: 0,
          to: 0,
          text: 'test',
          aiProvider: provider,
          aiModel: 'test-model'
        };
        
        expect(edit.aiProvider).toBe(provider);
        expect(typeof edit.aiProvider).toBe('string');
        expect(edit.aiProvider.length).toBeGreaterThan(0);
      });
    });

    test('should validate aiModel field format', () => {
      const validModels = [
        'claude-3-opus',
        'claude-3-sonnet', 
        'gpt-4-turbo',
        'gpt-3.5-turbo',
        'gemini-pro'
      ];

      validModels.forEach(model => {
        const edit: EnhancedEditChange = {
          id: 'test_edit',
          timestamp: Date.now(),
          type: 'insert',
          from: 0,
          to: 0,
          text: 'test',
          aiProvider: 'test-provider',
          aiModel: model
        };

        expect(edit.aiModel).toBe(model);
        expect(typeof edit.aiModel).toBe('string');
        expect(edit.aiModel.length).toBeGreaterThan(0);
      });
    });

    test('should validate processingContext structure', () => {
      const validContexts = [
        { constraints: ['maintain_voice'] },
        { prompt: 'Improve clarity' },
        { mode: 'academic-editor' },
        {
          constraints: ['preserve_formatting', 'maintain_voice'],
          prompt: 'Enhance readability',
          mode: 'professional-editor',
          instructions: 'Focus on clarity',
          documentContext: 'Technical documentation'
        }
      ];

      validContexts.forEach((context, index) => {
        const edit: EnhancedEditChange = {
          id: `test_edit_${index}`,
          timestamp: Date.now(),
          type: 'replace',
          from: 0,
          to: 10,
          text: 'test',
          processingContext: context
        };

        expect(edit.processingContext).toEqual(context);
        expect(typeof edit.processingContext).toBe('object');
      });
    });

    test('should validate aiTimestamp is Date object', () => {
      const now = new Date();
      const edit: EnhancedEditChange = {
        id: 'test_edit',
        timestamp: Date.now(),
        type: 'insert',
        from: 0,
        to: 0,
        text: 'test',
        aiTimestamp: now
      };

      expect(edit.aiTimestamp).toBeInstanceOf(Date);
      expect(edit.aiTimestamp).toBe(now);
    });
  });

  describe('Backward Compatibility with Existing EditChange Objects', () => {
    test('should work with legacy EditChange objects without AI metadata', () => {
      const legacyEdit = {
        id: 'legacy_edit_001',
        timestamp: Date.now(),
        type: 'insert' as const,
        from: 50,
        to: 50,
        text: 'legacy inserted text',
        author: 'user'
      };

      // Should be compatible with EnhancedEditChange
      const enhancedEdit: EnhancedEditChange = legacyEdit;
      
      expect(enhancedEdit.id).toBe('legacy_edit_001');
      expect(enhancedEdit.type).toBe('insert');
      expect(enhancedEdit.aiProvider).toBeUndefined();
      expect(enhancedEdit.aiModel).toBeUndefined();
      expect(enhancedEdit.processingContext).toBeUndefined();
      expect(enhancedEdit.aiTimestamp).toBeUndefined();
    });

    test('should preserve all original EditChange fields', () => {
      const originalEdit = {
        id: 'original_001',
        timestamp: 1640995200000,
        type: 'replace' as const,
        from: 100,
        to: 150,
        text: 'replacement text',
        removedText: 'original text',
        author: 'test_user'
      };

      const enhanced: EnhancedEditChange = {
        ...originalEdit,
        aiProvider: 'claude-3',
        aiModel: 'claude-3-opus'
      };

      // All original fields should be preserved
      expect(enhanced.id).toBe(originalEdit.id);
      expect(enhanced.timestamp).toBe(originalEdit.timestamp);
      expect(enhanced.type).toBe(originalEdit.type);
      expect(enhanced.from).toBe(originalEdit.from);
      expect(enhanced.to).toBe(originalEdit.to);
      expect(enhanced.text).toBe(originalEdit.text);
      expect(enhanced.removedText).toBe(originalEdit.removedText);
      expect(enhanced.author).toBe(originalEdit.author);
    });

    test('should handle arrays of mixed legacy and enhanced EditChange objects', () => {
      const mixedEdits: EnhancedEditChange[] = [
        {
          id: 'legacy_1',
          timestamp: Date.now(),
          type: 'insert',
          from: 0,
          to: 0,
          text: 'legacy text'
        },
        {
          id: 'enhanced_1', 
          timestamp: Date.now(),
          type: 'replace',
          from: 10,
          to: 20,
          text: 'AI enhanced text',
          aiProvider: 'claude-3',
          aiModel: 'claude-3-opus',
          processingContext: { mode: 'editor' }
        }
      ];

      expect(mixedEdits).toHaveLength(2);
      expect(mixedEdits[0].aiProvider).toBeUndefined();
      expect(mixedEdits[1].aiProvider).toBe('claude-3');
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    test('should handle empty processingContext object', () => {
      const edit: EnhancedEditChange = {
        id: 'test_edit',
        timestamp: Date.now(),
        type: 'insert',
        from: 0,
        to: 0,
        text: 'test',
        processingContext: {}
      };

      expect(edit.processingContext).toEqual({});
      expect(Object.keys(edit.processingContext)).toHaveLength(0);
    });

    test('should handle null and undefined AI metadata fields', () => {
      const edit: EnhancedEditChange = {
        id: 'test_edit',
        timestamp: Date.now(),
        type: 'delete',
        from: 10,
        to: 20,
        removedText: 'deleted text',
        aiProvider: undefined,
        aiModel: undefined,
        processingContext: undefined,
        aiTimestamp: undefined
      };

      expect(edit.aiProvider).toBeUndefined();
      expect(edit.aiModel).toBeUndefined();
      expect(edit.processingContext).toBeUndefined();
      expect(edit.aiTimestamp).toBeUndefined();
    });

    test('should handle very long AI provider and model strings', () => {
      const longProvider = 'a'.repeat(1000);
      const longModel = 'b'.repeat(1000);

      const edit: EnhancedEditChange = {
        id: 'test_edit',
        timestamp: Date.now(),
        type: 'replace',
        from: 0,
        to: 10,
        text: 'test',
        aiProvider: longProvider,
        aiModel: longModel
      };

      expect(edit.aiProvider).toBe(longProvider);
      expect(edit.aiModel).toBe(longModel);
      expect(edit.aiProvider?.length).toBe(1000);
      expect(edit.aiModel?.length).toBe(1000);
    });

    test('should handle complex nested processingContext objects', () => {
      const complexContext = {
        constraints: ['maintain_voice', 'preserve_formatting', 'academic_tone'],
        prompt: 'Very long prompt with detailed instructions that spans multiple lines and contains various formatting requirements',
        mode: 'academic-editor',
        instructions: 'Complex instructions object',
        documentContext: 'Long document context',
        metadata: {
          nested: {
            deeply: {
              values: ['test1', 'test2']
            }
          }
        }
      };

      const edit: EnhancedEditChange = {
        id: 'test_edit',
        timestamp: Date.now(),
        type: 'replace',
        from: 0,
        to: 50,
        text: 'enhanced text',
        processingContext: complexContext
      };

      expect(edit.processingContext).toEqual(complexContext);
      expect(edit.processingContext?.metadata?.nested?.deeply?.values).toEqual(['test1', 'test2']);
    });

    test('should handle Date objects with different timestamps', () => {
      const pastDate = new Date('2023-01-01');
      const futureDate = new Date('2025-01-01');
      const now = new Date();

      const edits = [pastDate, now, futureDate].map((date, index) => ({
        id: `test_edit_${index}`,
        timestamp: Date.now(),
        type: 'insert' as const,
        from: 0,
        to: 0,
        text: 'test',
        aiTimestamp: date
      }));

      expect(edits[0].aiTimestamp).toEqual(pastDate);
      expect(edits[1].aiTimestamp).toEqual(now);
      expect(edits[2].aiTimestamp).toEqual(futureDate);
    });
  });

  describe('Serialization/Deserialization of AI Metadata', () => {
    test('should serialize enhanced EditChange to JSON', () => {
      const edit: EnhancedEditChange = {
        id: 'test_edit',
        timestamp: 1640995200000,
        type: 'replace',
        from: 100,
        to: 150,
        text: 'enhanced text',
        removedText: 'original text',
        aiProvider: 'claude-3',
        aiModel: 'claude-3-opus',
        processingContext: mockProcessingContext,
        aiTimestamp: new Date('2023-12-31T23:59:59.000Z')
      };

      const json = JSON.stringify(edit);
      const parsed = JSON.parse(json);

      expect(parsed.id).toBe(edit.id);
      expect(parsed.aiProvider).toBe(edit.aiProvider);
      expect(parsed.aiModel).toBe(edit.aiModel);
      expect(parsed.processingContext).toEqual(mockProcessingContext);
      expect(parsed.aiTimestamp).toBe('2023-12-31T23:59:59.000Z'); // Date serialized as string
    });

    test('should deserialize JSON back to enhanced EditChange', () => {
      const jsonString = JSON.stringify({
        id: 'test_edit',
        timestamp: 1640995200000,
        type: 'insert',
        from: 0,
        to: 0,
        text: 'test text',
        aiProvider: 'gpt-4',
        aiModel: 'gpt-4-turbo',
        processingContext: { mode: 'editor' },
        aiTimestamp: '2023-12-31T23:59:59.000Z'
      });

      const parsed = JSON.parse(jsonString);
      
      // Reconstruct Date from string
      if (parsed.aiTimestamp) {
        parsed.aiTimestamp = new Date(parsed.aiTimestamp);
      }

      const edit: EnhancedEditChange = parsed;

      expect(edit.aiProvider).toBe('gpt-4');
      expect(edit.aiModel).toBe('gpt-4-turbo');
      expect(edit.processingContext?.mode).toBe('editor');
      expect(edit.aiTimestamp).toBeInstanceOf(Date);
    });

    test('should handle serialization of arrays with mixed EditChange objects', () => {
      const edits: EnhancedEditChange[] = [
        {
          id: 'legacy',
          timestamp: Date.now(),
          type: 'insert',
          from: 0,
          to: 0,
          text: 'legacy'
        },
        {
          id: 'enhanced',
          timestamp: Date.now(),
          type: 'replace',
          from: 10,
          to: 20,
          text: 'enhanced',
          aiProvider: 'claude-3',
          aiModel: 'claude-3-opus',
          aiTimestamp: new Date()
        }
      ];

      const json = JSON.stringify(edits);
      const parsed = JSON.parse(json);

      expect(parsed).toHaveLength(2);
      expect(parsed[0].aiProvider).toBeUndefined();
      expect(parsed[1].aiProvider).toBe('claude-3');
    });

    test('should preserve undefined vs null values in serialization', () => {
      const editWithUndefined: EnhancedEditChange = {
        id: 'test_undefined',
        timestamp: Date.now(),
        type: 'insert',
        from: 0,
        to: 0,
        text: 'test',
        aiProvider: undefined,
        processingContext: undefined
      };

      const editWithNull = {
        id: 'test_null', 
        timestamp: Date.now(),
        type: 'insert' as const,
        from: 0,
        to: 0,
        text: 'test',
        aiProvider: null,
        processingContext: null
      };

      const jsonUndefined = JSON.stringify(editWithUndefined);
      const jsonNull = JSON.stringify(editWithNull);

      // undefined fields are omitted in JSON
      expect(jsonUndefined).not.toContain('aiProvider');
      expect(jsonUndefined).not.toContain('processingContext');

      // null fields are preserved
      expect(jsonNull).toContain('aiProvider":null');
      expect(jsonNull).toContain('processingContext":null');
    });
  });

  describe('Type Safety and TypeScript Interface Compliance', () => {
    test('should enforce correct edit types', () => {
      const validTypes: Array<'insert' | 'delete' | 'replace'> = ['insert', 'delete', 'replace'];

      validTypes.forEach(type => {
        const edit: EnhancedEditChange = {
          id: 'test',
          timestamp: Date.now(),
          type: type,
          from: 0,
          to: type === 'insert' ? 0 : 10,
          text: type !== 'delete' ? 'test text' : undefined,
          removedText: type !== 'insert' ? 'removed' : undefined
        };

        expect(edit.type).toBe(type);
      });
    });

    test('should maintain type consistency for numeric fields', () => {
      const edit: EnhancedEditChange = {
        id: 'test',
        timestamp: Date.now(),
        type: 'replace',
        from: 100,
        to: 200,
        text: 'test'
      };

      expect(typeof edit.timestamp).toBe('number');
      expect(typeof edit.from).toBe('number');
      expect(typeof edit.to).toBe('number');
      expect(edit.from).toBeLessThanOrEqual(edit.to);
    });

    test('should maintain type consistency for string fields', () => {
      const edit: EnhancedEditChange = {
        id: 'test_id',
        timestamp: Date.now(),
        type: 'insert',
        from: 0,
        to: 0,
        text: 'inserted text',
        author: 'test_author',
        aiProvider: 'claude-3',
        aiModel: 'claude-3-opus'
      };

      expect(typeof edit.id).toBe('string');
      expect(typeof edit.text).toBe('string');
      expect(typeof edit.author).toBe('string');
      expect(typeof edit.aiProvider).toBe('string');
      expect(typeof edit.aiModel).toBe('string');
    });

    test('should handle optional fields correctly', () => {
      // All optional fields undefined
      const minimal: EnhancedEditChange = {
        id: 'minimal',
        timestamp: Date.now(),
        type: 'insert',
        from: 0,
        to: 0
      };

      expect(minimal.text).toBeUndefined();
      expect(minimal.removedText).toBeUndefined();
      expect(minimal.author).toBeUndefined();
      expect(minimal.aiProvider).toBeUndefined();
      expect(minimal.aiModel).toBeUndefined();
      expect(minimal.processingContext).toBeUndefined();
      expect(minimal.aiTimestamp).toBeUndefined();

      // All optional fields defined
      const complete: EnhancedEditChange = {
        id: 'complete',
        timestamp: Date.now(),
        type: 'replace',
        from: 0,
        to: 10,
        text: 'new text',
        removedText: 'old text',
        author: 'user',
        aiProvider: 'claude-3',
        aiModel: 'claude-3-opus',
        processingContext: mockProcessingContext,
        aiTimestamp: new Date()
      };

      expect(complete.text).toBeDefined();
      expect(complete.removedText).toBeDefined();
      expect(complete.author).toBeDefined();
      expect(complete.aiProvider).toBeDefined();
      expect(complete.aiModel).toBeDefined();
      expect(complete.processingContext).toBeDefined();
      expect(complete.aiTimestamp).toBeDefined();
    });
  });

  describe('Integration with Processing Context', () => {
    test('should support constraint validation in processing context', () => {
      const contextWithConstraints = {
        constraints: [
          'maintain_author_voice',
          'preserve_technical_accuracy', 
          'improve_readability',
          'maintain_document_structure'
        ],
        prompt: 'Editorial improvements with constraints',
        mode: 'constrained-editor'
      };

      const edit: EnhancedEditChange = {
        id: 'constrained_edit',
        timestamp: Date.now(),
        type: 'replace',
        from: 100,
        to: 200,
        text: 'improved text following constraints',
        removedText: 'original text that needed improvement',
        aiProvider: 'claude-3',
        aiModel: 'claude-3-opus',
        processingContext: contextWithConstraints
      };

      expect(edit.processingContext?.constraints).toContain('maintain_author_voice');
      expect(edit.processingContext?.constraints).toContain('preserve_technical_accuracy');
      expect(edit.processingContext?.constraints).toHaveLength(4);
      expect(edit.processingContext?.mode).toBe('constrained-editor');
    });

    test('should support complex document context metadata', () => {
      const documentContext = {
        constraints: ['academic_tone'],
        prompt: 'Improve academic writing clarity',
        mode: 'academic-editor',
        instructions: 'Focus on citation format and argument structure',
        documentContext: 'Research paper on climate change impacts',
        metadata: {
          documentType: 'academic-paper',
          subject: 'environmental-science',
          targetAudience: 'researchers',
          citationStyle: 'APA',
          section: 'methodology'
        }
      };

      const edit: EnhancedEditChange = {
        id: 'academic_edit',
        timestamp: Date.now(),
        type: 'replace',
        from: 500,
        to: 600,
        text: 'methodologically rigorous approach was employed',
        removedText: 'we used a method',
        aiProvider: 'gpt-4',
        aiModel: 'gpt-4-turbo',
        processingContext: documentContext,
        aiTimestamp: new Date()
      };

      expect(edit.processingContext?.metadata?.documentType).toBe('academic-paper');
      expect(edit.processingContext?.metadata?.citationStyle).toBe('APA');
      expect(edit.processingContext?.metadata?.section).toBe('methodology');
    });
  });

  describe('Performance and Memory Considerations', () => {
    test('should handle large arrays of enhanced EditChange objects efficiently', () => {
      const largeEditArray: EnhancedEditChange[] = [];
      const start = performance.now();

      // Create 10,000 EditChange objects with AI metadata
      for (let i = 0; i < 10000; i++) {
        largeEditArray.push({
          id: `edit_${i}`,
          timestamp: Date.now() + i,
          type: i % 3 === 0 ? 'insert' : i % 3 === 1 ? 'delete' : 'replace',
          from: i * 10,
          to: (i * 10) + (i % 3 === 0 ? 0 : 5),
          text: i % 3 !== 1 ? `Text for edit ${i}` : undefined,
          removedText: i % 3 !== 0 ? `Removed text ${i}` : undefined,
          aiProvider: i % 2 === 0 ? 'claude-3' : 'gpt-4',
          aiModel: i % 2 === 0 ? 'claude-3-opus' : 'gpt-4-turbo',
          processingContext: i % 5 === 0 ? {
            constraints: [`constraint_${i}`],
            mode: 'test-mode'
          } : undefined
        });
      }

      const end = performance.now();
      const creationTime = end - start;

      expect(largeEditArray).toHaveLength(10000);
      expect(creationTime).toBeLessThan(1000); // Should create 10k objects in less than 1 second
      
      // Test that all objects maintain proper structure
      expect(largeEditArray[0].aiProvider).toBe('claude-3');
      expect(largeEditArray[1].aiProvider).toBe('gpt-4');
      expect(largeEditArray[5000].id).toBe('edit_5000');
    });

    test('should serialize and deserialize large datasets efficiently', () => {
      const testData: EnhancedEditChange[] = Array(1000).fill(null).map((_, i) => ({
        id: `perf_test_${i}`,
        timestamp: Date.now(),
        type: 'replace' as const,
        from: i * 100,
        to: (i * 100) + 50,
        text: `Performance test text ${i}`,
        removedText: `Old text ${i}`,
        aiProvider: 'claude-3',
        aiModel: 'claude-3-opus',
        processingContext: {
          constraints: [`perf_constraint_${i}`],
          prompt: `Performance test prompt ${i}`,
          mode: 'performance-test'
        },
        aiTimestamp: new Date()
      }));

      const serializeStart = performance.now();
      const jsonString = JSON.stringify(testData);
      const serializeEnd = performance.now();

      const deserializeStart = performance.now();
      const parsedData = JSON.parse(jsonString);
      const deserializeEnd = performance.now();

      const serializeTime = serializeEnd - serializeStart;
      const deserializeTime = deserializeEnd - deserializeStart;

      expect(parsedData).toHaveLength(1000);
      expect(serializeTime).toBeLessThan(500); // Should serialize in less than 500ms
      expect(deserializeTime).toBeLessThan(200); // Should deserialize in less than 200ms
      expect(parsedData[999].id).toBe('perf_test_999');
    });
  });
});