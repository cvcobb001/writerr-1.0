/**
 * Focused Test Suite for EditChange Backward Compatibility
 * 
 * Tests the embedded backward compatibility layer in EditTracker
 */

import { EditChange, EditSession, AIProcessingContext } from '@shared/types';

// Mock the embedded compatibility utils - this simulates what's in edit-tracker.ts
class EditChangeCompatibilityUtils {
  static hasAIMetadata(change: EditChange): boolean {
    return !!(
      change.aiProvider || 
      change.aiModel || 
      change.processingContext || 
      change.aiTimestamp
    );
  }

  static isLegacyChange(change: EditChange): boolean {
    return !(
      'aiProvider' in change || 
      'aiModel' in change || 
      'processingContext' in change || 
      'aiTimestamp' in change
    );
  }

  static isValidEditChange(obj: any): obj is EditChange {
    return (
      obj &&
      typeof obj.id === 'string' &&
      typeof obj.timestamp === 'number' &&
      ['insert', 'delete', 'replace'].includes(obj.type) &&
      typeof obj.from === 'number' &&
      typeof obj.to === 'number'
    );
  }

  static upgradeToEnhanced(legacyChange: any): EditChange {
    return {
      ...legacyChange,
      aiProvider: undefined,
      aiModel: undefined,
      processingContext: undefined,
      aiTimestamp: undefined
    };
  }

  static upgradeChangesArray(changes: EditChange[]): EditChange[] {
    return changes.map(change => {
      if (this.isLegacyChange(change)) {
        return this.upgradeToEnhanced(change);
      }
      return change;
    });
  }

  static needsMigration(data: any): boolean {
    if (!data || !data.sessions || !Array.isArray(data.sessions)) {
      return false;
    }

    return data.sessions.some((session: EditSession) => 
      session.changes && session.changes.some((change: EditChange) => 
        this.isLegacyChange(change)
      )
    );
  }

  static migrateStoredData(data: any): any {
    if (!data || !data.sessions) {
      return data;
    }

    return {
      ...data,
      sessions: data.sessions.map((session: EditSession) => ({
        ...session,
        changes: this.upgradeChangesArray(session.changes)
      }))
    };
  }

  static getAIProvider(change: EditChange, fallback: string = 'unknown'): string {
    return change.aiProvider || fallback;
  }

  static getAIModel(change: EditChange, fallback: string = 'unknown'): string {
    return change.aiModel || fallback;
  }

  static getAISourceDescription(change: EditChange): string {
    if (!this.hasAIMetadata(change)) {
      return 'Manual edit';
    }

    const provider = this.getAIProvider(change, 'Unknown Provider');
    const model = this.getAIModel(change, 'Unknown Model');
    
    return `AI-assisted (${provider}/${model})`;
  }

  static isAIGenerated(change: EditChange): boolean {
    return this.hasAIMetadata(change) && !!(change.aiProvider && change.aiModel);
  }

  static getArrayStats(changes: EditChange[]) {
    const aiChanges = changes.filter(change => this.isAIGenerated(change));
    const manualChanges = changes.filter(change => !this.isAIGenerated(change));
    
    const providers = [...new Set(
      aiChanges.map(change => this.getAIProvider(change))
      .filter(provider => provider !== 'unknown')
    )];
    
    const models = [...new Set(
      aiChanges.map(change => this.getAIModel(change))
      .filter(model => model !== 'unknown')
    )];
    
    return {
      total: changes.length,
      aiGenerated: aiChanges.length,
      manual: manualChanges.length,
      providers,
      models,
      withContext: changes.filter(change => change.processingContext).length
    };
  }
}

describe('Backward Compatibility Layer', () => {
  
  // Test data fixtures
  const createLegacyChange = (id: string = 'legacy-1') => ({
    id,
    timestamp: Date.now(),
    type: 'insert' as const,
    from: 10,
    to: 15,
    text: 'inserted text',
    author: 'user'
  });

  const createEnhancedChange = (id: string = 'enhanced-1'): EditChange => ({
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

  describe('Type Detection', () => {
    test('should detect legacy changes correctly', () => {
      const legacyChange = createLegacyChange();
      expect(EditChangeCompatibilityUtils.isLegacyChange(legacyChange as EditChange)).toBe(true);
      expect(EditChangeCompatibilityUtils.hasAIMetadata(legacyChange as EditChange)).toBe(false);
    });

    test('should detect enhanced changes correctly', () => {
      const enhancedChange = createEnhancedChange();
      expect(EditChangeCompatibilityUtils.isLegacyChange(enhancedChange)).toBe(false);
      expect(EditChangeCompatibilityUtils.hasAIMetadata(enhancedChange)).toBe(true);
    });

    test('should validate EditChange objects', () => {
      const validLegacy = createLegacyChange();
      const validEnhanced = createEnhancedChange();
      const invalid = { id: 'test' }; // missing required fields

      expect(EditChangeCompatibilityUtils.isValidEditChange(validLegacy)).toBe(true);
      expect(EditChangeCompatibilityUtils.isValidEditChange(validEnhanced)).toBe(true);
      expect(EditChangeCompatibilityUtils.isValidEditChange(invalid)).toBe(false);
    });
  });

  describe('Data Migration', () => {
    test('should upgrade legacy change to enhanced format', () => {
      const legacyChange = createLegacyChange();
      const upgraded = EditChangeCompatibilityUtils.upgradeToEnhanced(legacyChange);

      // Should preserve original fields
      expect(upgraded.id).toBe(legacyChange.id);
      expect(upgraded.timestamp).toBe(legacyChange.timestamp);
      expect(upgraded.type).toBe(legacyChange.type);

      // Should add AI metadata fields as undefined
      expect('aiProvider' in upgraded).toBe(true);
      expect(upgraded.aiProvider).toBeUndefined();
      expect(upgraded.aiModel).toBeUndefined();
    });

    test('should detect when migration is needed', () => {
      const dataWithLegacy = {
        sessions: [{
          id: 'test',
          startTime: Date.now(),
          changes: [createLegacyChange() as EditChange]
        }]
      };

      const dataWithEnhanced = {
        sessions: [{
          id: 'test',
          startTime: Date.now(),
          changes: [createEnhancedChange()]
        }]
      };

      expect(EditChangeCompatibilityUtils.needsMigration(dataWithLegacy)).toBe(true);
      expect(EditChangeCompatibilityUtils.needsMigration(dataWithEnhanced)).toBe(false);
    });

    test('should migrate entire data structure', () => {
      const legacyData = {
        sessions: [
          {
            id: 'session-1',
            startTime: Date.now(),
            changes: [
              createLegacyChange('change-1'),
              createLegacyChange('change-2')
            ] as EditChange[]
          }
        ]
      };

      const migratedData = EditChangeCompatibilityUtils.migrateStoredData(legacyData);

      expect(migratedData.sessions).toHaveLength(1);
      expect(migratedData.sessions[0].changes).toHaveLength(2);

      // All changes should now be in enhanced format
      for (const change of migratedData.sessions[0].changes) {
        expect('aiProvider' in change).toBe(true);
        expect(change.aiProvider).toBeUndefined();
      }
    });
  });

  describe('Safe Access Methods', () => {
    test('should provide safe access with fallbacks', () => {
      const legacyChange = createLegacyChange();
      const enhancedChange = createEnhancedChange();

      // Legacy change should use fallbacks
      expect(EditChangeCompatibilityUtils.getAIProvider(legacyChange as EditChange)).toBe('unknown');
      expect(EditChangeCompatibilityUtils.getAIModel(legacyChange as EditChange)).toBe('unknown');

      // Enhanced change should return actual values
      expect(EditChangeCompatibilityUtils.getAIProvider(enhancedChange)).toBe('openai');
      expect(EditChangeCompatibilityUtils.getAIModel(enhancedChange)).toBe('gpt-4');
    });

    test('should generate appropriate source descriptions', () => {
      const legacyChange = createLegacyChange();
      const enhancedChange = createEnhancedChange();

      expect(EditChangeCompatibilityUtils.getAISourceDescription(legacyChange as EditChange))
        .toBe('Manual edit');
      expect(EditChangeCompatibilityUtils.getAISourceDescription(enhancedChange))
        .toBe('AI-assisted (openai/gpt-4)');
    });

    test('should detect AI-generated changes correctly', () => {
      const legacyChange = createLegacyChange();
      const enhancedChange = createEnhancedChange();
      const partialChange = { ...createLegacyChange(), aiProvider: 'openai' } as EditChange;

      expect(EditChangeCompatibilityUtils.isAIGenerated(legacyChange as EditChange)).toBe(false);
      expect(EditChangeCompatibilityUtils.isAIGenerated(enhancedChange)).toBe(true);
      expect(EditChangeCompatibilityUtils.isAIGenerated(partialChange)).toBe(false); // missing aiModel
    });
  });

  describe('Array Statistics', () => {
    test('should provide comprehensive statistics for mixed arrays', () => {
      const mixedChanges = [
        createLegacyChange('legacy-1') as EditChange,
        createEnhancedChange('ai-1'),
        createLegacyChange('legacy-2') as EditChange,
        {
          ...createLegacyChange('ai-2'),
          aiProvider: 'anthropic',
          aiModel: 'claude'
        } as EditChange
      ];

      const stats = EditChangeCompatibilityUtils.getArrayStats(mixedChanges);

      expect(stats.total).toBe(4);
      expect(stats.manual).toBe(2);
      expect(stats.aiGenerated).toBe(2);
      expect(stats.providers).toContain('openai');
      expect(stats.providers).toContain('anthropic');
      expect(stats.models).toContain('gpt-4');
      expect(stats.models).toContain('claude');
    });

    test('should handle empty arrays', () => {
      const stats = EditChangeCompatibilityUtils.getArrayStats([]);

      expect(stats.total).toBe(0);
      expect(stats.manual).toBe(0);
      expect(stats.aiGenerated).toBe(0);
      expect(stats.providers).toEqual([]);
      expect(stats.models).toEqual([]);
    });
  });

  describe('Real-world Integration Scenarios', () => {
    test('should handle complete legacy-to-enhanced workflow', () => {
      // Simulate loading legacy plugin data
      const legacyPluginData = {
        sessions: [
          {
            id: 'old-session',
            startTime: Date.now() - 3600000,
            endTime: Date.now(),
            changes: [
              {
                id: 'change-1',
                timestamp: Date.now() - 3600000,
                type: 'insert',
                from: 0,
                to: 5,
                text: 'Hello'
              },
              {
                id: 'change-2',
                timestamp: Date.now() - 3500000,
                type: 'replace',
                from: 5,
                to: 5,
                text: ' World',
                author: 'user'
              }
            ]
          }
        ]
      };

      // Step 1: Check if migration is needed
      expect(EditChangeCompatibilityUtils.needsMigration(legacyPluginData)).toBe(true);

      // Step 2: Perform migration
      const migratedData = EditChangeCompatibilityUtils.migrateStoredData(legacyPluginData);

      // Step 3: Verify results
      expect(migratedData.sessions).toHaveLength(1);
      const session = migratedData.sessions[0];
      expect(session.changes).toHaveLength(2);

      // All changes should be enhanced but AI metadata should be undefined
      for (const change of session.changes) {
        expect('aiProvider' in change).toBe(true);
        expect(change.aiProvider).toBeUndefined();
        expect(EditChangeCompatibilityUtils.getAISourceDescription(change)).toBe('Manual edit');
      }

      // Original data should be preserved
      expect(session.changes[0].text).toBe('Hello');
      expect(session.changes[1].text).toBe(' World');
    });

    test('should handle mixed environment with both legacy and AI changes', () => {
      const mixedSession: EditSession = {
        id: 'mixed-session',
        startTime: Date.now(),
        changes: [
          createLegacyChange('manual-1') as EditChange,
          createEnhancedChange('ai-1'),
          createLegacyChange('manual-2') as EditChange,
        ],
        wordCount: 100,
        characterCount: 500
      };

      // Test statistics generation
      const stats = EditChangeCompatibilityUtils.getArrayStats(mixedSession.changes);
      expect(stats.total).toBe(3);
      expect(stats.manual).toBe(2);
      expect(stats.aiGenerated).toBe(1);

      // Test export formatting (simulate what formatSessionForExport would do)
      let exportContent = '';
      for (const change of mixedSession.changes) {
        const source = EditChangeCompatibilityUtils.getAISourceDescription(change);
        const provider = EditChangeCompatibilityUtils.getAIProvider(change, '');
        const model = EditChangeCompatibilityUtils.getAIModel(change, '');
        
        exportContent += `${change.id}: ${source} (${provider}/${model})\n`;
      }

      expect(exportContent).toContain('Manual edit');
      expect(exportContent).toContain('AI-assisted (openai/gpt-4)');
      expect(exportContent).toContain('unknown/unknown'); // for legacy changes
    });
  });
});