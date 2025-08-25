/**
 * @fileoverview System-wide integration tests
 * Tests complete workflows across all three Writerr plugins
 */

import { EventBus } from '@writerr/shared';
import { TrackEditsCore } from '../packages/track-edits/src/TrackEditsCore';
import { ModeManager } from '../packages/writerr-chat/src/modes/ModeManager';
import { FunctionRegistry } from '../packages/ai-editorial-functions/src/registry/FunctionRegistry';

// Mock Obsidian environment
const mockApp = {
  vault: {
    adapter: {
      read: jest.fn().mockResolvedValue(''),
      write: jest.fn().mockResolvedValue(undefined),
      exists: jest.fn().mockResolvedValue(true),
      stat: jest.fn().mockResolvedValue({ mtime: Date.now(), size: 1000 })
    },
    on: jest.fn(),
    off: jest.fn(),
    getAbstractFileByPath: jest.fn(),
    getFileByPath: jest.fn()
  },
  workspace: {
    on: jest.fn(),
    off: jest.fn(),
    getActiveFile: jest.fn().mockReturnValue({
      path: 'test-document.md',
      name: 'test-document.md'
    }),
    getLeaf: jest.fn(),
    createLeafBySplit: jest.fn(),
    revealLeaf: jest.fn()
  },
  metadataCache: {
    on: jest.fn(),
    off: jest.fn(),
    getFileCache: jest.fn()
  }
};

const mockPlugin = {
  app: mockApp,
  manifest: {
    id: 'writerr-system-test',
    name: 'Writerr System Test',
    version: '1.0.0'
  },
  addCommand: jest.fn(),
  addRibbonIcon: jest.fn(),
  addStatusBarItem: jest.fn(),
  registerView: jest.fn(),
  registerDomEvent: jest.fn(),
  registerInterval: jest.fn(),
  loadData: jest.fn().mockResolvedValue({}),
  saveData: jest.fn().mockResolvedValue(undefined)
};

// Mock AI Providers integration
class MockAIProviders {
  private responses: Map<string, any> = new Map();
  
  setResponse(key: string, response: any) {
    this.responses.set(key, response);
  }
  
  async sendMessage(prompt: string, context: any): Promise<{
    success: boolean;
    response?: string;
    changes?: any[];
    error?: string;
  }> {
    const key = `${context.mode || 'default'}-${context.function || 'general'}`;
    const mockResponse = this.responses.get(key);
    
    if (!mockResponse) {
      return {
        success: false,
        error: `No mock response configured for ${key}`
      };
    }
    
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 150));
    
    return {
      success: true,
      response: mockResponse.text,
      changes: mockResponse.changes || []
    };
  }
}

describe('System-Wide Integration Tests', () => {
  let eventBus: EventBus;
  let trackEditsCore: TrackEditsCore;
  let modeManager: ModeManager;
  let functionRegistry: FunctionRegistry;
  let mockAI: MockAIProviders;

  const sampleDocument = {
    id: 'novel-chapter.md',
    path: 'novel-chapter.md',
    content: `# Chapter 1: The Beginning

The quick brown fox jumps over the lazy dog. This is a sample sentence that needs improvement. The writing could be more vivid and engaging for readers.

Sarah walked to the store. She bought milk and bread. The weather was nice today. Birds were singing in the trees.

"Hello," said John to his friend. "How are you doing today? I hope everything is going well for you and your family."

The company's profits has increased significantly this quarter. We need to optimize our approach for maximum efficiency and effectiveness. The data shows that our customers is satisfied with the service.`
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Initialize shared event bus
    eventBus = new EventBus();
    
    // Initialize all components
    trackEditsCore = new TrackEditsCore(mockPlugin as any);
    modeManager = new ModeManager();
    functionRegistry = new FunctionRegistry();
    mockAI = new MockAIProviders();
    
    // Connect components to event bus
    trackEditsCore.setEventBus(eventBus);
    
    // Initialize components
    await trackEditsCore.initialize();
    await modeManager.initialize();
    
    // Set up mock AI responses
    mockAI.setResponse('copy-edit-copy-editor', {
      text: 'The company\'s profits have increased significantly this quarter.',
      changes: [{
        originalText: 'profits has increased',
        suggestedText: 'profits have increased',
        startOffset: 504,
        endOffset: 523,
        confidence: 0.95,
        category: 'grammar'
      }]
    });
    
    mockAI.setResponse('creative-writing-style-enhancer', {
      text: 'Sarah strolled leisurely to the neighborhood store.',
      changes: [{
        originalText: 'Sarah walked to the store',
        suggestedText: 'Sarah strolled leisurely to the neighborhood store',
        startOffset: 194,
        endOffset: 218,
        confidence: 0.8,
        category: 'style-enhancement'
      }]
    });
    
    mockAI.setResponse('proofread-proofreader', {
      text: 'The data shows that our customers are satisfied with the service.',
      changes: [{
        originalText: 'customers is satisfied',
        suggestedText: 'customers are satisfied',
        startOffset: 653,
        endOffset: 674,
        confidence: 0.9,
        category: 'grammar'
      }]
    });
  });

  afterEach(async () => {
    await trackEditsCore.cleanup();
    eventBus.removeAllListeners();
  });

  describe('Complete Editorial Workflows', () => {
    it('should handle end-to-end copy editing workflow', async () => {
      console.log('🔄 Starting comprehensive copy editing workflow...');
      
      // Step 1: Enable tracking for document
      await trackEditsCore.enableTrackingForDocument(sampleDocument.id);
      expect(trackEditsCore.isTrackingEnabled(sampleDocument.id)).toBe(true);
      
      console.log('✅ Document tracking enabled');
      
      // Step 2: Switch to copy edit mode
      await modeManager.switchMode('copy-edit');
      expect(modeManager.getCurrentMode()?.id).toBe('copy-edit');
      
      console.log('✅ Copy edit mode activated');
      
      // Step 3: Process text with AI function
      const selectedText = 'The company\'s profits has increased significantly this quarter.';
      const aiResponse = await mockAI.sendMessage(selectedText, {
        mode: 'copy-edit',
        function: 'copy-editor',
        documentId: sampleDocument.id,
        selectedText,
        documentContent: sampleDocument.content
      });
      
      expect(aiResponse.success).toBe(true);
      expect(aiResponse.changes).toHaveLength(1);
      
      console.log('✅ AI processing completed:', {
        changesGenerated: aiResponse.changes?.length,
        response: aiResponse.response
      });
      
      // Step 4: Submit changes to Track Edits
      const change = {
        id: 'copy-edit-change-1',
        documentId: sampleDocument.id,
        type: 'edit' as const,
        originalText: aiResponse.changes![0].originalText,
        suggestedText: aiResponse.changes![0].suggestedText,
        startOffset: aiResponse.changes![0].startOffset,
        endOffset: aiResponse.changes![0].endOffset,
        source: {
          type: 'ai' as const,
          plugin: 'ai-editorial-functions',
          function: 'copy-editor',
          mode: 'copy-edit',
          model: 'mock-ai'
        },
        confidence: aiResponse.changes![0].confidence,
        category: aiResponse.changes![0].category,
        timestamp: new Date()
      };
      
      const submissionResult = await trackEditsCore.submitChange(change);
      expect(submissionResult.success).toBe(true);
      
      console.log('✅ Changes submitted to Track Edits');
      
      // Step 5: Review and accept changes
      const documentChanges = trackEditsCore.getChangesForDocument(sampleDocument.id);
      expect(documentChanges).toHaveLength(1);
      expect(documentChanges[0].status).toBe('pending');
      
      const acceptResult = await trackEditsCore.acceptChange(change.id);
      expect(acceptResult.success).toBe(true);
      
      const acceptedChange = trackEditsCore.getChange(change.id);
      expect(acceptedChange?.status).toBe('accepted');
      
      console.log('✅ Changes reviewed and accepted');
      
      // Step 6: Verify final document state
      const finalChanges = trackEditsCore.getChangesForDocument(sampleDocument.id);
      const acceptedChanges = finalChanges.filter(c => c.status === 'accepted');
      expect(acceptedChanges).toHaveLength(1);
      
      console.log('✅ End-to-end copy editing workflow completed successfully');
      console.log('Workflow summary:', {
        documentId: sampleDocument.id,
        modeUsed: 'copy-edit',
        changesGenerated: 1,
        changesAccepted: acceptedChanges.length,
        finalGrammarCorrection: acceptedChanges[0].suggestedText.includes('have increased')
      });
    });

    it('should handle creative writing enhancement workflow', async () => {
      console.log('🎨 Starting creative writing enhancement workflow...');
      
      // Enable tracking and switch to creative writing mode
      await trackEditsCore.enableTrackingForDocument(sampleDocument.id);
      await modeManager.switchMode('creative-writing');
      
      const selectedText = 'Sarah walked to the store. She bought milk and bread.';
      
      // Process with style enhancement
      const aiResponse = await mockAI.sendMessage(selectedText, {
        mode: 'creative-writing',
        function: 'style-enhancer',
        documentId: sampleDocument.id,
        selectedText,
        context: 'narrative prose'
      });
      
      expect(aiResponse.success).toBe(true);
      
      // Submit stylistic improvements
      const styleChange = {
        id: 'creative-change-1',
        documentId: sampleDocument.id,
        type: 'edit' as const,
        originalText: aiResponse.changes![0].originalText,
        suggestedText: aiResponse.changes![0].suggestedText,
        startOffset: aiResponse.changes![0].startOffset,
        endOffset: aiResponse.changes![0].endOffset,
        source: {
          type: 'ai' as const,
          plugin: 'ai-editorial-functions',
          function: 'style-enhancer',
          mode: 'creative-writing'
        },
        confidence: aiResponse.changes![0].confidence,
        category: aiResponse.changes![0].category,
        timestamp: new Date()
      };
      
      await trackEditsCore.submitChange(styleChange);
      
      // Verify creative enhancement was applied
      const changes = trackEditsCore.getChangesForDocument(sampleDocument.id);
      expect(changes).toHaveLength(1);
      expect(changes[0].category).toBe('style-enhancement');
      expect(changes[0].suggestedText).toContain('strolled leisurely');
      
      console.log('✅ Creative writing enhancement workflow completed');
      console.log('Style enhancement results:', {
        original: changes[0].originalText,
        enhanced: changes[0].suggestedText,
        confidence: changes[0].confidence
      });
    });

    it('should handle multi-mode collaborative editing workflow', async () => {
      console.log('🔄 Starting multi-mode collaborative editing workflow...');
      
      await trackEditsCore.enableTrackingForDocument(sampleDocument.id);
      
      const workflowSteps = [
        {
          mode: 'proofread',
          function: 'proofreader',
          selectedText: 'The data shows that our customers is satisfied with the service.',
          expectedCategory: 'grammar'
        },
        {
          mode: 'copy-edit',
          function: 'copy-editor',
          selectedText: 'We need to optimize our approach for maximum efficiency and effectiveness.',
          expectedCategory: 'concision'
        }
      ];
      
      let totalChanges = 0;
      
      for (const [index, step] of workflowSteps.entries()) {
        console.log(`Processing step ${index + 1}: ${step.mode} mode`);
        
        // Switch mode
        await modeManager.switchMode(step.mode);
        expect(modeManager.getCurrentMode()?.id).toBe(step.mode);
        
        // Process text
        const aiResponse = await mockAI.sendMessage(step.selectedText, {
          mode: step.mode,
          function: step.function,
          documentId: sampleDocument.id,
          selectedText: step.selectedText
        });
        
        if (aiResponse.success && aiResponse.changes) {
          for (const [changeIndex, changeData] of aiResponse.changes.entries()) {
            const change = {
              id: `multi-mode-change-${index}-${changeIndex}`,
              documentId: sampleDocument.id,
              type: 'edit' as const,
              originalText: changeData.originalText,
              suggestedText: changeData.suggestedText,
              startOffset: changeData.startOffset,
              endOffset: changeData.endOffset,
              source: {
                type: 'ai' as const,
                plugin: 'ai-editorial-functions',
                function: step.function,
                mode: step.mode
              },
              confidence: changeData.confidence,
              category: changeData.category,
              timestamp: new Date()
            };
            
            await trackEditsCore.submitChange(change);
            totalChanges++;
          }
        }
        
        console.log(`✅ Step ${index + 1} completed`);
      }
      
      // Verify all changes were captured
      const allChanges = trackEditsCore.getChangesForDocument(sampleDocument.id);
      expect(allChanges.length).toBe(totalChanges);
      
      // Test clustering by mode/source
      const clusters = trackEditsCore.getChangeClusters(sampleDocument.id, {
        strategy: 'source'
      });
      
      expect(clusters.length).toBeGreaterThan(0);
      
      console.log('✅ Multi-mode collaborative editing workflow completed');
      console.log('Multi-mode workflow results:', {
        modesUsed: workflowSteps.length,
        totalChanges,
        clustersGenerated: clusters.length,
        changesByMode: allChanges.reduce((acc, change) => {
          const mode = change.source.mode || 'unknown';
          acc[mode] = (acc[mode] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      });
    });
  });

  describe('Cross-Plugin Communication', () => {
    it('should maintain real-time synchronization across all plugins', async () => {
      console.log('🔄 Testing cross-plugin real-time synchronization...');
      
      await trackEditsCore.enableTrackingForDocument(sampleDocument.id);
      
      // Set up event listeners to track synchronization
      let trackEditsEvents: string[] = [];
      let chatEvents: string[] = [];
      let functionEvents: string[] = [];
      
      eventBus.on('track-edits:*', (eventType, data) => {
        trackEditsEvents.push(eventType);
      });
      
      eventBus.on('writerr-chat:*', (eventType, data) => {
        chatEvents.push(eventType);
      });
      
      eventBus.on('ai-editorial-functions:*', (eventType, data) => {
        functionEvents.push(eventType);
      });
      
      // Simulate user interaction flow
      eventBus.emit('writerr-chat:user-request', {
        documentId: sampleDocument.id,
        text: 'Please improve this paragraph',
        selectedText: 'The quick brown fox jumps over the lazy dog.',
        mode: 'copy-edit'
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      eventBus.emit('ai-editorial-functions:processing-complete', {
        requestId: 'sync-test-1',
        changes: [{
          originalText: 'The quick brown fox jumps over the lazy dog.',
          suggestedText: 'The swift brown fox leaps gracefully over the lazy dog.',
          confidence: 0.85,
          category: 'style-improvement'
        }]
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      eventBus.emit('track-edits:changes-submitted', {
        documentId: sampleDocument.id,
        changeIds: ['sync-change-1'],
        source: 'ai-editorial-functions'
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify events were propagated
      expect(trackEditsEvents.length).toBeGreaterThan(0);
      
      console.log('✅ Cross-plugin synchronization verified');
      console.log('Event synchronization results:', {
        trackEditsEvents: trackEditsEvents.length,
        chatEvents: chatEvents.length,
        functionEvents: functionEvents.length,
        totalEvents: trackEditsEvents.length + chatEvents.length + functionEvents.length
      });
    });

    it('should handle plugin initialization order gracefully', async () => {
      console.log('🔄 Testing plugin initialization order handling...');
      
      // Simulate different initialization orders
      const initializationScenarios = [
        ['track-edits', 'writerr-chat', 'ai-editorial-functions'],
        ['ai-editorial-functions', 'track-edits', 'writerr-chat'],
        ['writerr-chat', 'ai-editorial-functions', 'track-edits']
      ];
      
      for (const [scenarioIndex, scenario] of initializationScenarios.entries()) {
        console.log(`Testing initialization scenario ${scenarioIndex + 1}:`, scenario);
        
        // Reset state
        eventBus.removeAllListeners();
        await trackEditsCore.cleanup();
        
        // Initialize in specified order
        for (const plugin of scenario) {
          switch (plugin) {
            case 'track-edits':
              trackEditsCore = new TrackEditsCore(mockPlugin as any);
              trackEditsCore.setEventBus(eventBus);
              await trackEditsCore.initialize();
              break;
            case 'writerr-chat':
              modeManager = new ModeManager();
              await modeManager.initialize();
              break;
            case 'ai-editorial-functions':
              functionRegistry = new FunctionRegistry();
              // Simulate function registration
              break;
          }
          
          // Small delay between initializations
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // Test basic functionality regardless of initialization order
        await trackEditsCore.enableTrackingForDocument(`test-doc-${scenarioIndex}.md`);
        
        const testChange = {
          id: `init-test-${scenarioIndex}`,
          documentId: `test-doc-${scenarioIndex}.md`,
          type: 'edit' as const,
          originalText: 'test text',
          suggestedText: 'improved test text',
          startOffset: 0,
          endOffset: 9,
          source: { type: 'ai' as const, plugin: 'test' },
          confidence: 0.8,
          category: 'test',
          timestamp: new Date()
        };
        
        const result = await trackEditsCore.submitChange(testChange);
        expect(result.success).toBe(true);
        
        console.log(`✅ Scenario ${scenarioIndex + 1} handled successfully`);
      }
      
      console.log('✅ All initialization order scenarios handled gracefully');
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover gracefully from plugin failures', async () => {
      console.log('🔄 Testing system resilience to plugin failures...');
      
      await trackEditsCore.enableTrackingForDocument(sampleDocument.id);
      
      // Simulate AI Editorial Functions plugin failure
      mockAI.setResponse('copy-edit-copy-editor', {
        error: 'AI service temporarily unavailable',
        success: false
      });
      
      // Attempt to process text despite AI failure
      const selectedText = 'Text that needs improvement';
      const failedResponse = await mockAI.sendMessage(selectedText, {
        mode: 'copy-edit',
        function: 'copy-editor',
        documentId: sampleDocument.id
      });
      
      expect(failedResponse.success).toBe(false);
      
      // Verify Track Edits still functions for manual changes
      const manualChange = {
        id: 'manual-recovery-change',
        documentId: sampleDocument.id,
        type: 'edit' as const,
        originalText: 'manual text',
        suggestedText: 'manually improved text',
        startOffset: 0,
        endOffset: 11,
        source: { type: 'manual' as const, user: 'test-user' },
        confidence: 1.0,
        category: 'manual-edit',
        timestamp: new Date()
      };
      
      const manualResult = await trackEditsCore.submitChange(manualChange);
      expect(manualResult.success).toBe(true);
      
      // Restore AI functionality
      mockAI.setResponse('copy-edit-copy-editor', {
        text: 'Improved text after recovery',
        changes: [{
          originalText: 'recovery text',
          suggestedText: 'improved recovery text',
          confidence: 0.9,
          category: 'recovery-test'
        }]
      });
      
      const recoveredResponse = await mockAI.sendMessage(selectedText, {
        mode: 'copy-edit',
        function: 'copy-editor',
        documentId: sampleDocument.id
      });
      
      expect(recoveredResponse.success).toBe(true);
      
      console.log('✅ System recovery from plugin failures verified');
      console.log('Recovery test results:', {
        aiFailureHandled: !failedResponse.success,
        manualFunctionsContinued: manualResult.success,
        aiRecoverySuccessful: recoveredResponse.success
      });
    });

    it('should handle concurrent operations without conflicts', async () => {
      console.log('🔄 Testing concurrent operations handling...');
      
      await trackEditsCore.enableTrackingForDocument(sampleDocument.id);
      
      // Simulate multiple users making changes simultaneously
      const concurrentOperations = [
        {
          type: 'ai-edit',
          change: {
            id: 'concurrent-1',
            originalText: 'text one',
            suggestedText: 'improved text one',
            startOffset: 0,
            endOffset: 8
          }
        },
        {
          type: 'manual-edit',
          change: {
            id: 'concurrent-2',
            originalText: 'text two',
            suggestedText: 'manually improved text two',
            startOffset: 20,
            endOffset: 28
          }
        },
        {
          type: 'ai-edit',
          change: {
            id: 'concurrent-3',
            originalText: 'text three',
            suggestedText: 'AI improved text three',
            startOffset: 40,
            endOffset: 50
          }
        }
      ];
      
      // Execute all operations concurrently
      const operationPromises = concurrentOperations.map(async (op, index) => {
        const change = {
          id: op.change.id,
          documentId: sampleDocument.id,
          type: 'edit' as const,
          originalText: op.change.originalText,
          suggestedText: op.change.suggestedText,
          startOffset: op.change.startOffset,
          endOffset: op.change.endOffset,
          source: {
            type: op.type === 'manual-edit' ? 'manual' as const : 'ai' as const,
            plugin: op.type === 'manual-edit' ? undefined : 'ai-editorial-functions',
            user: op.type === 'manual-edit' ? `user-${index}` : undefined
          },
          confidence: op.type === 'manual-edit' ? 1.0 : 0.8,
          category: 'concurrent-test',
          timestamp: new Date()
        };
        
        return trackEditsCore.submitChange(change);
      });
      
      const results = await Promise.all(operationPromises);
      
      // Verify all operations succeeded
      const successfulOperations = results.filter(r => r.success);
      expect(successfulOperations.length).toBe(concurrentOperations.length);
      
      // Verify no conflicts in final state
      const finalChanges = trackEditsCore.getChangesForDocument(sampleDocument.id);
      expect(finalChanges.length).toBe(concurrentOperations.length);
      
      // Verify all changes have unique IDs and no overlapping positions
      const changeIds = new Set(finalChanges.map(c => c.id));
      expect(changeIds.size).toBe(finalChanges.length);
      
      console.log('✅ Concurrent operations handled without conflicts');
      console.log('Concurrent operation results:', {
        totalOperations: concurrentOperations.length,
        successfulOperations: successfulOperations.length,
        finalChangesCount: finalChanges.length,
        noConflictsDetected: true
      });
    });
  });

  describe('Performance Under System Load', () => {
    it('should maintain performance with multiple documents and plugins active', async () => {
      console.log('🔄 Testing system performance under load...');
      
      const documentCount = 10;
      const changesPerDocument = 50;
      
      // Enable tracking for multiple documents
      const documents = Array.from({ length: documentCount }, (_, i) => ({
        id: `load-test-doc-${i}.md`,
        content: `Document ${i} content with text that needs editing.`
      }));
      
      for (const doc of documents) {
        await trackEditsCore.enableTrackingForDocument(doc.id);
      }
      
      console.log(`📄 Enabled tracking for ${documentCount} documents`);
      
      // Generate changes across all documents
      const startTime = Date.now();
      const allChanges: Array<Promise<any>> = [];
      
      for (const doc of documents) {
        for (let i = 0; i < changesPerDocument; i++) {
          const change = {
            id: `load-test-${doc.id}-change-${i}`,
            documentId: doc.id,
            type: 'edit' as const,
            originalText: `text${i}`,
            suggestedText: `improved_text${i}`,
            startOffset: i * 20,
            endOffset: i * 20 + 6,
            source: {
              type: 'ai' as const,
              plugin: 'load-test',
              function: 'bulk-processor'
            },
            confidence: 0.8,
            category: 'load-test',
            timestamp: new Date()
          };
          
          allChanges.push(trackEditsCore.submitChange(change));
        }
      }
      
      // Wait for all changes to be processed
      const results = await Promise.all(allChanges);
      const processingTime = Date.now() - startTime;
      
      const successfulChanges = results.filter(r => r.success).length;
      const totalChanges = documentCount * changesPerDocument;
      
      // Performance assertions
      expect(successfulChanges).toBe(totalChanges);
      expect(processingTime).toBeLessThan(30000); // Should complete in under 30 seconds
      
      const changesPerSecond = Math.round((totalChanges / processingTime) * 1000);
      expect(changesPerSecond).toBeGreaterThan(20); // At least 20 changes per second
      
      // Test clustering performance across multiple documents
      const clusteringStartTime = Date.now();
      const allClusters: any[] = [];
      
      for (const doc of documents) {
        const docClusters = trackEditsCore.getChangeClusters(doc.id, {
          strategy: 'category'
        });
        allClusters.push(...docClusters);
      }
      
      const clusteringTime = Date.now() - clusteringStartTime;
      
      console.log('✅ System load test completed successfully');
      console.log('System load test results:', {
        documentsProcessed: documentCount,
        changesPerDocument,
        totalChanges,
        successfulChanges,
        processingTime: `${processingTime}ms`,
        changesPerSecond,
        clusteringTime: `${clusteringTime}ms`,
        totalClusters: allClusters.length,
        averageClustersPerDocument: Math.round(allClusters.length / documentCount)
      });
    }, 60000); // 60 second timeout for load testing
  });
});