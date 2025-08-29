/**
 * Test Suite for EditChange Backward Compatibility Layer
 * 
 * This test suite validates the backward compatibility functionality
 * for handling legacy EditChange objects without AI metadata.
 * 
 * Coverage areas:
 * - Type guards and detection utilities
 * - Migration and upgrade functions
 * - Safe access utilities with fallbacks
 * - Data serialization and deserialization
 * - Array manipulation utilities
 * - Integration with EditTracker
 */

import {
  EditChangeTypeGuards,
  EditChangeMigration,
  EditChangeAccessor,
  EditChangeArrayUtils,
  EditChangeSerializer,
  LegacyEditChange,
  EnhancedEditChange
} from '../compatibility/edit-change-compatibility';

import { EditChange, EditSession, AIProcessingContext } from '../../../../../shared/types';

describe('EditChange Backward Compatibility Layer', () => {

  // Test data fixtures
  const createLegacyChange = (id: string = 'legacy-1'): LegacyEditChange => ({
    id,
    timestamp: Date.now(),
    type: 'insert',
    from: 10,
    to: 15,
    text: 'inserted text',
    author: 'user'
  });

  const createEnhancedChange = (id: string = 'enhanced-1'): EnhancedEditChange => ({
    id,
    timestamp: Date.now(),
    type: 'replace',
    from: 20,
    to: 30,
    text: 'new text',
    removedText: 'old text',
    author: 'user',
    aiProvider: 'openai',
    aiModel: 'gpt-4',
    processingContext: {
      constraints: ['formal', 'concise'],
      prompt: 'Improve clarity',
      mode: 'edit'
    },
    aiTimestamp: new Date()
  });

  const createMinimalEnhancedChange = (id: string = 'minimal-1'): EnhancedEditChange => ({
    id,
    timestamp: Date.now(),
    type: 'delete',
    from: 5,
    to: 10,
    removedText: 'deleted',
    aiProvider: 'anthropic',
    aiModel: 'claude'
  });

  describe('EditChangeTypeGuards', () => {
    
    describe('hasAIMetadata', () => {
      test('should return false for legacy changes', () => {
        const legacyChange = createLegacyChange();
        expect(EditChangeTypeGuards.hasAIMetadata(legacyChange as EditChange)).toBe(false);
      });

      test('should return true for enhanced changes with AI metadata', () => {
        const enhancedChange = createEnhancedChange();
        expect(EditChangeTypeGuards.hasAIMetadata(enhancedChange)).toBe(true);
      });

      test('should return true for changes with minimal AI metadata', () => {
        const minimalChange = createMinimalEnhancedChange();
        expect(EditChangeTypeGuards.hasAIMetadata(minimalChange)).toBe(true);
      });

      test('should return false for changes with undefined AI fields', () => {
        const changeWithUndefined = {
          ...createLegacyChange(),
          aiProvider: undefined,
          aiModel: undefined,
          processingContext: undefined,
          aiTimestamp: undefined
        } as unknown as EditChange;
        
        expect(EditChangeTypeGuards.hasAIMetadata(changeWithUndefined)).toBe(false);
      });
    });

    describe('isLegacyChange', () => {
      test('should return true for objects without AI metadata properties', () => {
        const legacyChange = createLegacyChange();
        expect(EditChangeTypeGuards.isLegacyChange(legacyChange as EditChange)).toBe(true);
      });

      test('should return false for objects with AI metadata properties', () => {
        const enhancedChange = createEnhancedChange();
        expect(EditChangeTypeGuards.isLegacyChange(enhancedChange)).toBe(false);
      });

      test('should return false even for objects with undefined AI properties', () => {
        const changeWithUndefined = {
          ...createLegacyChange(),
          aiProvider: undefined
        } as unknown as EditChange;
        
        expect(EditChangeTypeGuards.isLegacyChange(changeWithUndefined)).toBe(false);
      });
    });

    describe('isValidEditChange', () => {
      test('should return true for valid legacy changes', () => {
        const legacyChange = createLegacyChange();
        expect(EditChangeTypeGuards.isValidEditChange(legacyChange)).toBe(true);
      });

      test('should return true for valid enhanced changes', () => {
        const enhancedChange = createEnhancedChange();
        expect(EditChangeTypeGuards.isValidEditChange(enhancedChange)).toBe(true);
      });

      test('should return false for invalid objects', () => {
        const invalidObjects = [
          {},
          { id: 'test' }, // missing required fields
          { id: 'test', timestamp: 'invalid', type: 'insert', from: 0, to: 5 }, // invalid timestamp
          { id: 'test', timestamp: 123, type: 'invalid', from: 0, to: 5 }, // invalid type
          { id: 'test', timestamp: 123, type: 'insert', from: 'invalid', to: 5 }, // invalid from
          null,
          undefined
        ];

        for (const obj of invalidObjects) {
          expect(EditChangeTypeGuards.isValidEditChange(obj)).toBe(false);
        }
      });
    });

    describe('hasCompleteAIMetadata', () => {
      test('should return true for changes with both aiProvider and aiModel', () => {
        const completeChange = createEnhancedChange();
        expect(EditChangeTypeGuards.hasCompleteAIMetadata(completeChange)).toBe(true);
      });

      test('should return false for changes missing aiProvider or aiModel', () => {
        const incompleteChanges = [
          { ...createLegacyChange(), aiProvider: 'openai' }, // missing aiModel
          { ...createLegacyChange(), aiModel: 'gpt-4' }, // missing aiProvider
          createLegacyChange() // missing both
        ];

        for (const change of incompleteChanges) {
          expect(EditChangeTypeGuards.hasCompleteAIMetadata(change as EditChange)).toBe(false);
        }
      });
    });
  });

  describe('EditChangeMigration', () => {
    
    describe('upgradeToEnhanced', () => {
      test('should convert legacy change to enhanced format', () => {
        const legacyChange = createLegacyChange();
        const enhanced = EditChangeMigration.upgradeToEnhanced(legacyChange);
        
        // Should preserve all original fields
        expect(enhanced.id).toBe(legacyChange.id);
        expect(enhanced.timestamp).toBe(legacyChange.timestamp);
        expect(enhanced.type).toBe(legacyChange.type);
        expect(enhanced.from).toBe(legacyChange.from);
        expect(enhanced.to).toBe(legacyChange.to);
        expect(enhanced.text).toBe(legacyChange.text);
        expect(enhanced.author).toBe(legacyChange.author);
        
        // Should add undefined AI metadata fields
        expect(enhanced.aiProvider).toBeUndefined();
        expect(enhanced.aiModel).toBeUndefined();
        expect(enhanced.processingContext).toBeUndefined();
        expect(enhanced.aiTimestamp).toBeUndefined();
      });
    });

    describe('upgradeChangesArray', () => {
      test('should upgrade mixed array of legacy and enhanced changes', () => {
        const legacyChange = createLegacyChange('legacy-1');
        const enhancedChange = createEnhancedChange('enhanced-1');
        const mixedArray = [legacyChange, enhancedChange] as (LegacyEditChange | EnhancedEditChange)[];
        
        const upgraded = EditChangeMigration.upgradeChangesArray(mixedArray);
        
        expect(upgraded).toHaveLength(2);
        
        // First item (originally legacy) should now be enhanced
        expect(upgraded[0]?.id).toBe('legacy-1');
        expect('aiProvider' in upgraded[0]!).toBe(true);
        expect(upgraded[0]?.aiProvider).toBeUndefined();
        
        // Second item (already enhanced) should remain unchanged
        expect(upgraded[1]?.id).toBe('enhanced-1');
        expect(upgraded[1]?.aiProvider).toBe('openai');
        expect(upgraded[1]?.aiModel).toBe('gpt-4');
      });

      test('should handle empty array', () => {
        const result = EditChangeMigration.upgradeChangesArray([]);
        expect(result).toEqual([]);
      });
    });

    describe('migrateEditSession', () => {
      test('should migrate EditSession with mixed changes', () => {
        const session: EditSession = {
          id: 'test-session',
          startTime: Date.now(),
          changes: [
            createLegacyChange('legacy-1') as EditChange,
            createEnhancedChange('enhanced-1')
          ],
          wordCount: 100,
          characterCount: 500
        };

        const migrated = EditChangeMigration.migrateEditSession(session);
        
        expect(migrated.id).toBe(session.id);
        expect(migrated.startTime).toBe(session.startTime);
        expect(migrated.changes).toHaveLength(2);
        
        // All changes should now be enhanced format
        for (const change of migrated.changes) {
          expect('aiProvider' in change).toBe(true);
        }
      });
    });

    describe('needsMigration', () => {
      test('should return true for data with legacy changes', () => {
        const dataWithLegacy = {
          sessions: [{
            id: 'test',
            startTime: Date.now(),
            changes: [createLegacyChange()]
          }]
        };

        expect(EditChangeMigration.needsMigration(dataWithLegacy)).toBe(true);
      });

      test('should return false for data with only enhanced changes', () => {
        const dataWithEnhanced = {
          sessions: [{
            id: 'test',
            startTime: Date.now(),
            changes: [createEnhancedChange()]
          }]
        };

        expect(EditChangeMigration.needsMigration(dataWithEnhanced)).toBe(false);
      });

      test('should return false for invalid data structures', () => {
        const invalidData = [
          null,
          undefined,
          {},
          { sessions: null },
          { sessions: 'invalid' },
          { sessions: [] }
        ];

        for (const data of invalidData) {
          expect(EditChangeMigration.needsMigration(data)).toBe(false);
        }
      });
    });
  });

  describe('EditChangeAccessor', () => {
    
    describe('safe access methods', () => {
      test('should return values for enhanced changes', () => {
        const enhancedChange = createEnhancedChange();
        
        expect(EditChangeAccessor.getAIProvider(enhancedChange)).toBe('openai');
        expect(EditChangeAccessor.getAIModel(enhancedChange)).toBe('gpt-4');
        expect(EditChangeAccessor.getProcessingContext(enhancedChange)).toEqual(enhancedChange.processingContext);
        expect(EditChangeAccessor.getAITimestamp(enhancedChange)).toEqual(enhancedChange.aiTimestamp);
      });

      test('should return fallbacks for legacy changes', () => {
        const legacyChange = createLegacyChange();
        
        expect(EditChangeAccessor.getAIProvider(legacyChange as EditChange)).toBe('unknown');
        expect(EditChangeAccessor.getAIModel(legacyChange as EditChange)).toBe('unknown');
        expect(EditChangeAccessor.getProcessingContext(legacyChange as EditChange)).toBeUndefined();
        expect(EditChangeAccessor.getAITimestamp(legacyChange as EditChange)).toBeUndefined();
      });

      test('should use custom fallbacks when provided', () => {
        const legacyChange = createLegacyChange();
        const customFallback: AIProcessingContext = { mode: 'custom' };
        const customDate = new Date('2023-01-01');
        
        expect(EditChangeAccessor.getAIProvider(legacyChange as EditChange, 'custom-provider')).toBe('custom-provider');
        expect(EditChangeAccessor.getAIModel(legacyChange as EditChange, 'custom-model')).toBe('custom-model');
        expect(EditChangeAccessor.getProcessingContext(legacyChange as EditChange, customFallback)).toEqual(customFallback);
        expect(EditChangeAccessor.getAITimestamp(legacyChange as EditChange, customDate)).toEqual(customDate);
      });
    });

    describe('getAISourceDescription', () => {
      test('should return "Manual edit" for legacy changes', () => {
        const legacyChange = createLegacyChange();
        expect(EditChangeAccessor.getAISourceDescription(legacyChange as EditChange)).toBe('Manual edit');
      });

      test('should return AI description for enhanced changes', () => {
        const enhancedChange = createEnhancedChange();
        expect(EditChangeAccessor.getAISourceDescription(enhancedChange)).toBe('AI-assisted (openai/gpt-4)');
      });

      test('should handle missing AI metadata gracefully', () => {
        const partialChange = { ...createLegacyChange(), aiProvider: 'openai' } as EditChange;
        expect(EditChangeAccessor.getAISourceDescription(partialChange)).toBe('AI-assisted (openai/Unknown Model)');
      });
    });

    describe('isAIGenerated', () => {
      test('should return false for legacy changes', () => {
        const legacyChange = createLegacyChange();
        expect(EditChangeAccessor.isAIGenerated(legacyChange as EditChange)).toBe(false);
      });

      test('should return true for complete AI changes', () => {
        const enhancedChange = createEnhancedChange();
        expect(EditChangeAccessor.isAIGenerated(enhancedChange)).toBe(true);
      });

      test('should return false for incomplete AI changes', () => {
        const incompleteChange = { ...createLegacyChange(), aiProvider: 'openai' } as EditChange;
        expect(EditChangeAccessor.isAIGenerated(incompleteChange)).toBe(false);
      });
    });
  });

  describe('EditChangeArrayUtils', () => {
    
    describe('mergeChangesArrays', () => {
      test('should merge and upgrade mixed arrays', () => {
        const array1 = [createLegacyChange('legacy-1') as EditChange];
        const array2 = [createEnhancedChange('enhanced-1')];
        
        const merged = EditChangeArrayUtils.mergeChangesArrays(array1, array2);
        
        expect(merged).toHaveLength(2);
        
        // All results should be enhanced format
        for (const change of merged) {
          expect('aiProvider' in change).toBe(true);
        }
      });
    });

    describe('filterByAIStatus', () => {
      test('should filter AI-generated changes', () => {
        const mixedChanges = [
          createLegacyChange('legacy-1') as EditChange,
          createEnhancedChange('enhanced-1'),
          createMinimalEnhancedChange('minimal-1')
        ];
        
        const aiChanges = EditChangeArrayUtils.filterByAIStatus(mixedChanges, true);
        const manualChanges = EditChangeArrayUtils.filterByAIStatus(mixedChanges, false);
        
        expect(aiChanges).toHaveLength(2); // enhanced and minimal
        expect(manualChanges).toHaveLength(1); // legacy
      });
    });

    describe('getArrayStats', () => {
      test('should provide comprehensive statistics', () => {
        const mixedChanges = [
          createLegacyChange('legacy-1') as EditChange,
          createEnhancedChange('enhanced-1'),
          createMinimalEnhancedChange('minimal-1')
        ];
        
        const stats = EditChangeArrayUtils.getArrayStats(mixedChanges);
        
        expect(stats.total).toBe(3);
        expect(stats.aiGenerated).toBe(2);
        expect(stats.manual).toBe(1);
        expect(stats.providers).toContain('openai');
        expect(stats.providers).toContain('anthropic');
        expect(stats.models).toContain('gpt-4');
        expect(stats.models).toContain('claude');
        expect(stats.withContext).toBe(1); // only enhanced-1 has processing context
      });

      test('should handle empty array', () => {
        const stats = EditChangeArrayUtils.getArrayStats([]);
        
        expect(stats.total).toBe(0);
        expect(stats.aiGenerated).toBe(0);
        expect(stats.manual).toBe(0);
        expect(stats.providers).toEqual([]);
        expect(stats.models).toEqual([]);
        expect(stats.withContext).toBe(0);
      });
    });

    describe('validateChangesArray', () => {
      test('should separate valid and invalid changes', () => {
        const mixedArray = [
          createLegacyChange('valid-1'),
          { invalid: 'object' },
          createEnhancedChange('valid-2'),
          null,
          undefined
        ];

        const validation = EditChangeArrayUtils.validateChangesArray(mixedArray);
        
        expect(validation.valid).toHaveLength(2);
        expect(validation.invalid).toHaveLength(3);
        expect(validation.errors).toHaveLength(3);
        
        // Valid changes should be the properly formed ones
        expect(validation.valid[0]?.id).toBe('valid-1');
        expect(validation.valid[1]?.id).toBe('valid-2');
      });
    });
  });

  describe('EditChangeSerializer', () => {
    
    describe('serialize and deserialize', () => {
      test('should serialize and deserialize changes with metadata', () => {
        const originalChanges = [
          createLegacyChange('legacy-1') as EditChange,
          createEnhancedChange('enhanced-1')
        ];
        
        const serialized = EditChangeSerializer.serialize(originalChanges);
        const deserialized = EditChangeSerializer.deserialize(serialized);
        
        expect(deserialized).toHaveLength(2);
        
        // All deserialized changes should be in enhanced format
        for (const change of deserialized) {
          expect('aiProvider' in change).toBe(true);
        }
        
        // Enhanced change should preserve AI metadata
        const enhancedResult = deserialized.find(c => c.id === 'enhanced-1')!;
        expect(enhancedResult.aiProvider).toBe('openai');
        expect(enhancedResult.aiModel).toBe('gpt-4');
      });

      test('should handle date serialization correctly', () => {
        const changeWithDate = createEnhancedChange();
        changeWithDate.aiTimestamp = new Date('2023-01-01T10:00:00.000Z');
        
        const serialized = EditChangeSerializer.serialize([changeWithDate]);
        const deserialized = EditChangeSerializer.deserialize(serialized);
        
        expect(deserialized[0]?.aiTimestamp).toBeInstanceOf(Date);
        expect(deserialized[0]?.aiTimestamp?.getTime()).toBe(changeWithDate.aiTimestamp.getTime());
      });

      test('should handle legacy array format', () => {
        const legacyArray = [createLegacyChange('legacy-1')];
        const legacyJson = JSON.stringify(legacyArray);
        
        const deserialized = EditChangeSerializer.deserialize(legacyJson);
        
        expect(deserialized).toHaveLength(1);
        expect(deserialized[0]?.id).toBe('legacy-1');
        expect('aiProvider' in deserialized[0]!).toBe(true);
        expect(deserialized[0]?.aiProvider).toBeUndefined();
      });

      test('should handle invalid JSON gracefully', () => {
        const invalidInputs = [
          'invalid json',
          '{"invalid": "structure"}',
          'null',
          ''
        ];

        for (const input of invalidInputs) {
          const result = EditChangeSerializer.deserialize(input);
          expect(Array.isArray(result)).toBe(true);
          expect(result).toHaveLength(0);
        }
      });
    });

    describe('session serialization', () => {
      test('should serialize and deserialize EditSession', () => {
        const originalSession: EditSession = {
          id: 'test-session',
          startTime: Date.now(),
          endTime: Date.now() + 3600000,
          changes: [
            createLegacyChange('legacy-1') as EditChange,
            createEnhancedChange('enhanced-1')
          ],
          wordCount: 100,
          characterCount: 500
        };

        const serialized = EditChangeSerializer.serializeSession(originalSession);
        const deserialized = EditChangeSerializer.deserializeSession(serialized);
        
        expect(deserialized).not.toBeNull();
        expect(deserialized!.id).toBe(originalSession.id);
        expect(deserialized!.startTime).toBe(originalSession.startTime);
        expect(deserialized!.endTime).toBe(originalSession.endTime);
        expect(deserialized!.changes).toHaveLength(2);
        
        // All changes should be migrated to enhanced format
        for (const change of deserialized!.changes) {
          expect('aiProvider' in change).toBe(true);
        }
      });

      test('should handle invalid session data', () => {
        const invalidInputs = [
          'invalid json',
          '{}',
          '{"id": "test"}', // missing required fields
          '{"id": "test", "startTime": 123}', // missing changes
        ];

        for (const input of invalidInputs) {
          const result = EditChangeSerializer.deserializeSession(input);
          expect(result).toBeNull();
        }
      });
    });
  });

  describe('Integration scenarios', () => {
    
    test('should handle complete legacy-to-enhanced workflow', () => {
      // Simulate loading legacy data
      const legacyData = {
        sessions: [{
          id: 'legacy-session',
          startTime: Date.now(),
          changes: [
            {
              id: 'change-1',
              timestamp: Date.now(),
              type: 'insert',
              from: 0,
              to: 5,
              text: 'Hello'
            },
            {
              id: 'change-2',
              timestamp: Date.now() + 1000,
              type: 'replace',
              from: 5,
              to: 5,
              text: ' World',
              author: 'user'
            }
          ] as LegacyEditChange[]
        }]
      };

      // Check if migration is needed
      expect(EditChangeMigration.needsMigration(legacyData)).toBe(true);
      
      // Perform migration
      const migratedData = EditChangeMigration.migrateStoredData(legacyData);
      
      // Verify migration results
      expect(migratedData.sessions).toHaveLength(1);
      const session = migratedData.sessions[0]!;
      expect(session.changes).toHaveLength(2);
      
      // All changes should now be enhanced
      for (const change of session.changes) {
        expect('aiProvider' in change).toBe(true);
        expect(EditChangeTypeGuards.isValidEditChange(change)).toBe(true);
      }
      
      // Verify original data is preserved
      expect(session.changes[0]?.id).toBe('change-1');
      expect(session.changes[0]?.text).toBe('Hello');
      expect(session.changes[1]?.id).toBe('change-2');
      expect(session.changes[1]?.text).toBe(' World');
      
      // AI metadata should be undefined for migrated legacy changes
      expect(session.changes[0]?.aiProvider).toBeUndefined();
      expect(session.changes[1]?.aiProvider).toBeUndefined();
    });

    test('should handle mixed data arrays in processing functions', () => {
      const mixedChanges = [
        createLegacyChange('legacy-1') as EditChange,
        createEnhancedChange('ai-1'),
        createLegacyChange('legacy-2') as EditChange,
        createMinimalEnhancedChange('ai-2')
      ];

      // Test array statistics
      const stats = EditChangeArrayUtils.getArrayStats(mixedChanges);
      expect(stats.total).toBe(4);
      expect(stats.manual).toBe(2);
      expect(stats.aiGenerated).toBe(2);

      // Test filtering
      const aiOnly = EditChangeArrayUtils.filterByAIStatus(mixedChanges, true);
      const manualOnly = EditChangeArrayUtils.filterByAIStatus(mixedChanges, false);
      
      expect(aiOnly).toHaveLength(2);
      expect(manualOnly).toHaveLength(2);

      // Test grouping by provider
      const grouped = EditChangeArrayUtils.groupByAIProvider(mixedChanges);
      expect(grouped.has('manual')).toBe(true);
      expect(grouped.has('openai')).toBe(true);
      expect(grouped.has('anthropic')).toBe(true);
      expect(grouped.get('manual')).toHaveLength(2);
      expect(grouped.get('openai')).toHaveLength(1);
      expect(grouped.get('anthropic')).toHaveLength(1);
    });
  });
});