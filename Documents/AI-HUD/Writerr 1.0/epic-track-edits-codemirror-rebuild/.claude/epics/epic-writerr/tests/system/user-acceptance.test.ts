/**
 * @fileoverview User Acceptance Tests for Writerr Plugin Suite
 * Tests realistic user scenarios with complete workflows
 */

import { EventBus } from '@writerr/shared';
import { TrackEditsCore } from '../packages/track-edits/src/TrackEditsCore';
import { ModeManager } from '../packages/writerr-chat/src/modes/ModeManager';
import { FunctionRegistry } from '../packages/ai-editorial-functions/src/registry/FunctionRegistry';

// Mock Obsidian environment with realistic behavior
const mockApp = {
  vault: {
    adapter: {
      read: jest.fn(),
      write: jest.fn().mockResolvedValue(undefined),
      exists: jest.fn().mockResolvedValue(true),
      stat: jest.fn().mockResolvedValue({ mtime: Date.now(), size: 2500 })
    },
    on: jest.fn(),
    off: jest.fn(),
    getAbstractFileByPath: jest.fn(),
    getFiles: jest.fn().mockReturnValue([])
  },
  workspace: {
    on: jest.fn(),
    off: jest.fn(),
    getActiveFile: jest.fn().mockReturnValue({
      path: 'current-document.md',
      name: 'current-document.md',
      stat: { mtime: Date.now(), size: 2500 }
    })
  }
};

const mockPlugin = {
  app: mockApp,
  manifest: { id: 'writerr-test', name: 'Writerr Test', version: '1.0.0' },
  addCommand: jest.fn(),
  addRibbonIcon: jest.fn(),
  addStatusBarItem: jest.fn(),
  registerView: jest.fn(),
  registerDomEvent: jest.fn(),
  registerInterval: jest.fn()
};

// Realistic AI responses for different scenarios
class RealisticAI {
  private responses: Map<string, any> = new Map();
  
  constructor() {
    this.setupRealisticResponses();
  }
  
  private setupRealisticResponses() {
    // Academic writing responses
    this.responses.set('academic-proofread', {
      responses: [
        {
          originalText: 'The results shows that the hypothesis were correct.',
          suggestedText: 'The results show that the hypotheses were correct.',
          confidence: 0.95,
          category: 'grammar',
          explanation: 'Fixed subject-verb agreement and plural form'
        },
        {
          originalText: 'This research contributes to existing literature by providing new insights.',
          suggestedText: 'This research contributes to the existing literature by providing novel insights.',
          confidence: 0.8,
          category: 'style',
          explanation: 'Added article and improved word choice'
        }
      ]
    });
    
    // Creative writing responses
    this.responses.set('creative-enhance', {
      responses: [
        {
          originalText: 'She walked across the room.',
          suggestedText: 'She glided across the dimly lit room, her footsteps muffled by the thick Persian rug.',
          confidence: 0.85,
          category: 'descriptive-enhancement',
          explanation: 'Enhanced with sensory details and imagery'
        },
        {
          originalText: '"Hello," he said.',
          suggestedText: '"Hello," he whispered, his voice barely audible above the distant thunder.',
          confidence: 0.75,
          category: 'dialogue-enhancement',
          explanation: 'Added atmosphere and context to dialogue'
        }
      ]
    });
    
    // Business writing responses
    this.responses.set('business-copyedit', {
      responses: [
        {
          originalText: 'Our company has been working hard to improve customer satisfaction and we think we have made significant progress.',
          suggestedText: 'Our company has made significant progress in improving customer satisfaction.',
          confidence: 0.9,
          category: 'concision',
          explanation: 'Eliminated redundancy and improved clarity'
        },
        {
          originalText: 'We would like to request that you consider our proposal.',
          suggestedText: 'Please consider our proposal.',
          confidence: 0.85,
          category: 'directness',
          explanation: 'Simplified language for more direct communication'
        }
      ]
    });
  }
  
  async processText(text: string, context: any): Promise<any> {
    const key = `${context.mode || 'default'}-${context.function || 'general'}`;
    const responseSet = this.responses.get(key);
    
    if (!responseSet) {
      return { success: false, error: `No realistic response for ${key}` };
    }
    
    // Find relevant responses based on input text
    const relevantResponses = responseSet.responses.filter((r: any) =>
      text.includes(r.originalText) || text.toLowerCase().includes(r.originalText.toLowerCase())
    );
    
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
    
    return {
      success: true,
      changes: relevantResponses.length > 0 ? relevantResponses : [responseSet.responses[0]]
    };
  }
}

describe('User Acceptance Tests - Realistic Scenarios', () => {
  let eventBus: EventBus;
  let trackEditsCore: TrackEditsCore;
  let modeManager: ModeManager;
  let functionRegistry: FunctionRegistry;
  let realisticAI: RealisticAI;

  const testDocuments = {
    academicPaper: {
      id: 'research-paper.md',
      content: `# The Impact of AI on Academic Writing

## Abstract

This research examines how artificial intelligence tools affects the academic writing process. The results shows that the hypothesis were correct regarding the positive impact of AI assistance on writing quality and efficiency.

## Introduction

The field of academic writing has undergone significant changes in recent years. This research contributes to existing literature by providing new insights into the relationship between AI tools and writing outcomes.

## Methodology

We conducted a comprehensive study involving 200 participants across different academic disciplines. The study design follows established protocols for educational research.

## Results

The data indicates that participants who used AI writing tools showed marked improvement in their writing quality. Statistical analysis confirms these findings with high significance levels (p < 0.001).

## Conclusion

This study demonstrates the potential benefits of AI integration in academic writing workflows. Future research should explore long-term effects and broader applications.`,
      userType: 'academic',
      expectedImprovements: ['grammar', 'style', 'clarity', 'academic-tone']
    },

    creativeStory: {
      id: 'short-story.md',
      content: `# The Midnight Garden

She walked across the room. The old house creaked with each step. "Hello," he said. She turned around quickly.

The garden outside was dark. Shadows moved between the trees. Something was different tonight. The air felt heavy and strange.

Maria had lived in this house for five years. She knew every sound, every corner. But tonight felt different. Tonight, the house seemed alive.

"Did you hear that?" she whispered. The sound came again from upstairs. Footsteps. But she was alone in the house.

The wind howled outside. Rain started to fall against the windows. Maria realized she was not alone after all.`,
      userType: 'creative-writer',
      expectedImprovements: ['imagery', 'atmosphere', 'dialogue', 'pacing']
    },

    businessProposal: {
      id: 'project-proposal.md',
      content: `# Project Proposal: Customer Satisfaction Initiative

## Executive Summary

Our company has been working hard to improve customer satisfaction and we think we have made significant progress. We would like to request that you consider our proposal for a comprehensive customer experience enhancement program.

## Current Situation

Customer feedback indicates areas where we can improve our service delivery. The main issues that have been identified include response times, product quality, and communication effectiveness.

## Proposed Solution

We are proposing a multi-phase approach to address these concerns. The solution includes training programs, process improvements, and technology upgrades.

## Expected Benefits

Implementation of this proposal will result in higher customer satisfaction scores, improved retention rates, and increased revenue. We believe this investment will pay for itself within the first year.

## Budget and Timeline

The total project cost is estimated at $150,000 over six months. We are confident that this represents excellent value for the expected return on investment.`,
      userType: 'business-professional',
      expectedImprovements: ['concision', 'clarity', 'professionalism', 'persuasiveness']
    }
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Initialize components
    eventBus = new EventBus();
    trackEditsCore = new TrackEditsCore(mockPlugin as any);
    modeManager = new ModeManager();
    functionRegistry = new FunctionRegistry();
    realisticAI = new RealisticAI();
    
    // Connect components
    trackEditsCore.setEventBus(eventBus);
    
    await trackEditsCore.initialize();
    await modeManager.initialize();
    
    // Set up realistic file system responses
    mockApp.vault.adapter.read.mockImplementation((path: string) => {
      const document = Object.values(testDocuments).find(doc => path.includes(doc.id));
      return Promise.resolve(document ? document.content : '');
    });
  });

  afterEach(async () => {
    await trackEditsCore.cleanup();
    eventBus.removeAllListeners();
  });

  describe('Academic Writer Scenarios', () => {
    it('should help academic writer improve research paper quality', async () => {
      console.log('📝 Testing academic writing improvement workflow...');
      
      const document = testDocuments.academicPaper;
      await trackEditsCore.enableTrackingForDocument(document.id);
      await modeManager.switchMode('proofread');
      
      // Step 1: User selects text with grammatical errors
      const selectedText = 'The results shows that the hypothesis were correct.';
      
      console.log('User action: Selected text for proofreading');
      console.log('Selected text:', selectedText);
      
      // Step 2: Process with AI proofreading
      const aiResponse = await realisticAI.processText(selectedText, {
        mode: 'academic',
        function: 'proofread',
        documentType: 'research-paper'
      });
      
      expect(aiResponse.success).toBe(true);
      expect(aiResponse.changes).toHaveLength(1);
      
      const grammarChange = aiResponse.changes[0];
      expect(grammarChange.category).toBe('grammar');
      expect(grammarChange.suggestedText).toContain('show');
      expect(grammarChange.suggestedText).toContain('hypotheses');
      
      console.log('AI suggestion:', {
        original: grammarChange.originalText,
        suggested: grammarChange.suggestedText,
        confidence: grammarChange.confidence,
        explanation: grammarChange.explanation
      });
      
      // Step 3: Submit changes to Track Edits
      const change = {
        id: 'academic-grammar-fix',
        documentId: document.id,
        type: 'edit' as const,
        originalText: grammarChange.originalText,
        suggestedText: grammarChange.suggestedText,
        startOffset: document.content.indexOf(grammarChange.originalText),
        endOffset: document.content.indexOf(grammarChange.originalText) + grammarChange.originalText.length,
        source: {
          type: 'ai' as const,
          plugin: 'ai-editorial-functions',
          function: 'academic-proofreader',
          mode: 'proofread'
        },
        confidence: grammarChange.confidence,
        category: grammarChange.category,
        timestamp: new Date(),
        metadata: {
          userType: 'academic',
          explanation: grammarChange.explanation
        }
      };
      
      const submissionResult = await trackEditsCore.submitChange(change);
      expect(submissionResult.success).toBe(true);
      
      console.log('✅ Changes submitted to Track Edits');
      
      // Step 4: User reviews and accepts high-confidence grammar corrections
      const documentChanges = trackEditsCore.getChangesForDocument(document.id);
      expect(documentChanges).toHaveLength(1);
      
      const grammarFix = documentChanges[0];
      expect(grammarFix.confidence).toBeGreaterThan(0.9);
      
      const acceptResult = await trackEditsCore.acceptChange(grammarFix.id);
      expect(acceptResult.success).toBe(true);
      
      console.log('User action: Accepted high-confidence grammar correction');
      
      // Step 5: Test style improvement workflow
      await modeManager.switchMode('copy-edit');
      const styleText = 'This research contributes to existing literature by providing new insights.';
      
      const styleResponse = await realisticAI.processText(styleText, {
        mode: 'academic',
        function: 'proofread',
        focus: 'style'
      });
      
      if (styleResponse.success && styleResponse.changes.length > 0) {
        const styleChange = {
          id: 'academic-style-improvement',
          documentId: document.id,
          type: 'edit' as const,
          originalText: styleResponse.changes[0].originalText,
          suggestedText: styleResponse.changes[0].suggestedText,
          startOffset: document.content.indexOf(styleResponse.changes[0].originalText),
          endOffset: document.content.indexOf(styleResponse.changes[0].originalText) + styleResponse.changes[0].originalText.length,
          source: {
            type: 'ai' as const,
            plugin: 'ai-editorial-functions',
            function: 'academic-copy-editor'
          },
          confidence: styleResponse.changes[0].confidence,
          category: styleResponse.changes[0].category,
          timestamp: new Date()
        };
        
        await trackEditsCore.submitChange(styleChange);
        
        console.log('Style improvement suggested:', {
          original: styleResponse.changes[0].originalText,
          suggested: styleResponse.changes[0].suggestedText,
          confidence: styleResponse.changes[0].confidence
        });
      }
      
      // Verify final state
      const finalChanges = trackEditsCore.getChangesForDocument(document.id);
      const acceptedChanges = finalChanges.filter(c => c.status === 'accepted');
      
      console.log('✅ Academic writing improvement workflow completed');
      console.log('Academic workflow summary:', {
        documentType: 'research-paper',
        userType: 'academic',
        totalSuggestions: finalChanges.length,
        acceptedChanges: acceptedChanges.length,
        grammarImprovements: finalChanges.filter(c => c.category === 'grammar').length,
        styleImprovements: finalChanges.filter(c => c.category === 'style').length,
        averageConfidence: finalChanges.reduce((sum, c) => sum + c.confidence, 0) / finalChanges.length
      });
      
      expect(acceptedChanges.length).toBeGreaterThan(0);
      expect(finalChanges.some(c => c.category === 'grammar')).toBe(true);
    });
  });

  describe('Creative Writer Scenarios', () => {
    it('should enhance creative writing with vivid descriptions and atmosphere', async () => {
      console.log('🎨 Testing creative writing enhancement workflow...');
      
      const document = testDocuments.creativeStory;
      await trackEditsCore.enableTrackingForDocument(document.id);
      await modeManager.switchMode('creative-writing');
      
      // Step 1: User selects bland descriptive text
      const selectedText = 'She walked across the room.';
      
      console.log('User action: Selected bland description for enhancement');
      console.log('Selected text:', selectedText);
      
      // Step 2: Process with creative enhancement AI
      const aiResponse = await realisticAI.processText(selectedText, {
        mode: 'creative',
        function: 'enhance',
        genre: 'suspense',
        focus: 'imagery'
      });
      
      expect(aiResponse.success).toBe(true);
      expect(aiResponse.changes).toHaveLength(1);
      
      const enhancementChange = aiResponse.changes[0];
      expect(enhancementChange.suggestedText.length).toBeGreaterThan(selectedText.length);
      expect(enhancementChange.suggestedText).toContain('glided');
      expect(enhancementChange.category).toBe('descriptive-enhancement');
      
      console.log('Creative enhancement suggested:', {
        original: enhancementChange.originalText,
        enhanced: enhancementChange.suggestedText,
        confidence: enhancementChange.confidence,
        explanation: enhancementChange.explanation
      });
      
      // Step 3: Submit and review enhancement
      const enhancementSubmission = {
        id: 'creative-description-enhancement',
        documentId: document.id,
        type: 'edit' as const,
        originalText: enhancementChange.originalText,
        suggestedText: enhancementChange.suggestedText,
        startOffset: document.content.indexOf(enhancementChange.originalText),
        endOffset: document.content.indexOf(enhancementChange.originalText) + enhancementChange.originalText.length,
        source: {
          type: 'ai' as const,
          plugin: 'ai-editorial-functions',
          function: 'creative-enhancer',
          mode: 'creative-writing'
        },
        confidence: enhancementChange.confidence,
        category: enhancementChange.category,
        timestamp: new Date(),
        metadata: {
          userType: 'creative-writer',
          genre: 'suspense',
          enhancementType: 'imagery'
        }
      };
      
      const submissionResult = await trackEditsCore.submitChange(enhancementSubmission);
      expect(submissionResult.success).toBe(true);
      
      console.log('✅ Creative enhancement submitted');
      
      // Step 4: Test dialogue enhancement
      const dialogueText = '"Hello," he said.';
      const dialogueResponse = await realisticAI.processText(dialogueText, {
        mode: 'creative',
        function: 'enhance',
        focus: 'dialogue'
      });
      
      if (dialogueResponse.success && dialogueResponse.changes.length > 0) {
        const dialogueChange = dialogueResponse.changes[0];
        expect(dialogueChange.suggestedText).toContain('whispered');
        expect(dialogueChange.category).toBe('dialogue-enhancement');
        
        const dialogueSubmission = {
          id: 'creative-dialogue-enhancement',
          documentId: document.id,
          type: 'edit' as const,
          originalText: dialogueChange.originalText,
          suggestedText: dialogueChange.suggestedText,
          startOffset: document.content.indexOf(dialogueChange.originalText),
          endOffset: document.content.indexOf(dialogueChange.originalText) + dialogueChange.originalText.length,
          source: {
            type: 'ai' as const,
            plugin: 'ai-editorial-functions',
            function: 'dialogue-enhancer'
          },
          confidence: dialogueChange.confidence,
          category: dialogueChange.category,
          timestamp: new Date()
        };
        
        await trackEditsCore.submitChange(dialogueSubmission);
        
        console.log('Dialogue enhancement suggested:', {
          original: dialogueChange.originalText,
          enhanced: dialogueChange.suggestedText
        });
      }
      
      // Step 5: User selectively accepts enhancements
      const documentChanges = trackEditsCore.getChangesForDocument(document.id);
      
      // Accept descriptive enhancement (high value for atmosphere)
      const descriptiveChange = documentChanges.find(c => c.category === 'descriptive-enhancement');
      if (descriptiveChange) {
        await trackEditsCore.acceptChange(descriptiveChange.id);
        console.log('User action: Accepted descriptive enhancement');
      }
      
      // Consider dialogue enhancement (user might want to maintain their voice)
      const dialogueChange = documentChanges.find(c => c.category === 'dialogue-enhancement');
      if (dialogueChange && dialogueChange.confidence > 0.8) {
        await trackEditsCore.acceptChange(dialogueChange.id);
        console.log('User action: Accepted high-confidence dialogue enhancement');
      }
      
      const finalChanges = trackEditsCore.getChangesForDocument(document.id);
      const acceptedChanges = finalChanges.filter(c => c.status === 'accepted');
      
      console.log('✅ Creative writing enhancement workflow completed');
      console.log('Creative workflow summary:', {
        documentType: 'short-story',
        userType: 'creative-writer',
        genre: 'suspense',
        totalEnhancements: finalChanges.length,
        acceptedEnhancements: acceptedChanges.length,
        descriptiveImprovements: finalChanges.filter(c => c.category === 'descriptive-enhancement').length,
        dialogueImprovements: finalChanges.filter(c => c.category === 'dialogue-enhancement').length,
        averageEnhancementLength: acceptedChanges.reduce((sum, c) => sum + c.suggestedText.length, 0) / acceptedChanges.length
      });
      
      expect(acceptedChanges.length).toBeGreaterThan(0);
      expect(acceptedChanges.some(c => c.category.includes('enhancement'))).toBe(true);
    });
  });

  describe('Business Professional Scenarios', () => {
    it('should improve business communication for clarity and professionalism', async () => {
      console.log('💼 Testing business writing improvement workflow...');
      
      const document = testDocuments.businessProposal;
      await trackEditsCore.enableTrackingForDocument(document.id);
      await modeManager.switchMode('copy-edit');
      
      // Step 1: User selects wordy, indirect business language
      const selectedText = 'Our company has been working hard to improve customer satisfaction and we think we have made significant progress.';
      
      console.log('User action: Selected wordy business text for improvement');
      console.log('Selected text:', selectedText);
      
      // Step 2: Process with business copy editing
      const aiResponse = await realisticAI.processText(selectedText, {
        mode: 'business',
        function: 'copyedit',
        focus: 'concision'
      });
      
      expect(aiResponse.success).toBe(true);
      expect(aiResponse.changes).toHaveLength(1);
      
      const concisionChange = aiResponse.changes[0];
      expect(concisionChange.suggestedText.length).toBeLessThan(selectedText.length);
      expect(concisionChange.category).toBe('concision');
      expect(concisionChange.confidence).toBeGreaterThan(0.8);
      
      console.log('Business improvement suggested:', {
        original: concisionChange.originalText,
        improved: concisionChange.suggestedText,
        confidence: concisionChange.confidence,
        explanation: concisionChange.explanation,
        wordReduction: concisionChange.originalText.length - concisionChange.suggestedText.length
      });
      
      // Step 3: Submit concision improvement
      const concisionSubmission = {
        id: 'business-concision-improvement',
        documentId: document.id,
        type: 'edit' as const,
        originalText: concisionChange.originalText,
        suggestedText: concisionChange.suggestedText,
        startOffset: document.content.indexOf(concisionChange.originalText),
        endOffset: document.content.indexOf(concisionChange.originalText) + concisionChange.originalText.length,
        source: {
          type: 'ai' as const,
          plugin: 'ai-editorial-functions',
          function: 'business-copy-editor',
          mode: 'copy-edit'
        },
        confidence: concisionChange.confidence,
        category: concisionChange.category,
        timestamp: new Date(),
        metadata: {
          userType: 'business-professional',
          improvementType: 'concision',
          wordReduction: concisionChange.originalText.length - concisionChange.suggestedText.length
        }
      };
      
      const submissionResult = await trackEditsCore.submitChange(concisionSubmission);
      expect(submissionResult.success).toBe(true);
      
      console.log('✅ Concision improvement submitted');
      
      // Step 4: Test directness improvement
      const indirectText = 'We would like to request that you consider our proposal.';
      const directnessResponse = await realisticAI.processText(indirectText, {
        mode: 'business',
        function: 'copyedit',
        focus: 'directness'
      });
      
      if (directnessResponse.success && directnessResponse.changes.length > 0) {
        const directnessChange = directnessResponse.changes[0];
        expect(directnessChange.suggestedText).toContain('Please consider');
        expect(directnessChange.category).toBe('directness');
        
        const directnessSubmission = {
          id: 'business-directness-improvement',
          documentId: document.id,
          type: 'edit' as const,
          originalText: directnessChange.originalText,
          suggestedText: directnessChange.suggestedText,
          startOffset: document.content.indexOf(directnessChange.originalText),
          endOffset: document.content.indexOf(directnessChange.originalText) + directnessChange.originalText.length,
          source: {
            type: 'ai' as const,
            plugin: 'ai-editorial-functions',
            function: 'business-directness-enhancer'
          },
          confidence: directnessChange.confidence,
          category: directnessChange.category,
          timestamp: new Date()
        };
        
        await trackEditsCore.submitChange(directnessSubmission);
        
        console.log('Directness improvement suggested:', {
          original: directnessChange.originalText,
          direct: directnessChange.suggestedText,
          confidence: directnessChange.confidence
        });
      }
      
      // Step 5: Business user accepts improvements that enhance professionalism
      const documentChanges = trackEditsCore.getChangesForDocument(document.id);
      
      // Accept high-confidence business improvements
      for (const change of documentChanges) {
        if (change.confidence > 0.85 && 
            ['concision', 'directness', 'professionalism'].includes(change.category)) {
          await trackEditsCore.acceptChange(change.id);
          console.log(`User action: Accepted ${change.category} improvement (confidence: ${change.confidence})`);
        }
      }
      
      const finalChanges = trackEditsCore.getChangesForDocument(document.id);
      const acceptedChanges = finalChanges.filter(c => c.status === 'accepted');
      
      // Calculate business metrics
      const totalWordReduction = acceptedChanges.reduce((sum, change) => {
        return sum + (change.originalText.length - change.suggestedText.length);
      }, 0);
      
      console.log('✅ Business writing improvement workflow completed');
      console.log('Business workflow summary:', {
        documentType: 'project-proposal',
        userType: 'business-professional',
        totalImprovements: finalChanges.length,
        acceptedImprovements: acceptedChanges.length,
        concisionImprovements: finalChanges.filter(c => c.category === 'concision').length,
        directnessImprovements: finalChanges.filter(c => c.category === 'directness').length,
        totalWordReduction,
        averageConfidence: acceptedChanges.reduce((sum, c) => sum + c.confidence, 0) / acceptedChanges.length,
        professionalismScore: acceptedChanges.filter(c => c.confidence > 0.85).length / acceptedChanges.length
      });
      
      expect(acceptedChanges.length).toBeGreaterThan(0);
      expect(totalWordReduction).toBeGreaterThan(0);
      expect(acceptedChanges.some(c => c.category === 'concision')).toBe(true);
    });
  });

  describe('Multi-Document Workflow Scenarios', () => {
    it('should handle writer working on multiple documents with different contexts', async () => {
      console.log('📚 Testing multi-document workflow management...');
      
      // Enable tracking for all test documents
      for (const [key, document] of Object.entries(testDocuments)) {
        await trackEditsCore.enableTrackingForDocument(document.id);
        console.log(`Enabled tracking for ${document.id} (${document.userType})`);
      }
      
      // Simulate writer switching between documents and modes
      const workflowSteps = [
        {
          document: testDocuments.academicPaper,
          mode: 'proofread',
          selectedText: 'The results shows that the hypothesis were correct.',
          expectedCategory: 'grammar'
        },
        {
          document: testDocuments.creativeStory,
          mode: 'creative-writing',
          selectedText: 'She walked across the room.',
          expectedCategory: 'descriptive-enhancement'
        },
        {
          document: testDocuments.businessProposal,
          mode: 'copy-edit',
          selectedText: 'We would like to request that you consider our proposal.',
          expectedCategory: 'directness'
        }
      ];
      
      let totalProcessedChanges = 0;
      
      for (const [stepIndex, step] of workflowSteps.entries()) {
        console.log(`\n--- Step ${stepIndex + 1}: ${step.document.userType} - ${step.mode} mode ---`);
        
        // Switch to appropriate mode
        await modeManager.switchMode(step.mode);
        expect(modeManager.getCurrentMode()?.id).toBe(step.mode);
        
        // Process text with context-appropriate AI
        const contextKey = `${step.document.userType}-${step.mode.replace('-', '')}`;
        const aiResponse = await realisticAI.processText(step.selectedText, {
          mode: step.document.userType,
          function: step.mode,
          documentType: step.document.id.split('.')[0]
        });
        
        if (aiResponse.success && aiResponse.changes.length > 0) {
          const change = aiResponse.changes[0];
          
          const submissionData = {
            id: `multi-doc-step-${stepIndex}-change`,
            documentId: step.document.id,
            type: 'edit' as const,
            originalText: change.originalText,
            suggestedText: change.suggestedText,
            startOffset: step.document.content.indexOf(change.originalText),
            endOffset: step.document.content.indexOf(change.originalText) + change.originalText.length,
            source: {
              type: 'ai' as const,
              plugin: 'ai-editorial-functions',
              function: `${step.document.userType}-${step.mode}`,
              mode: step.mode
            },
            confidence: change.confidence,
            category: change.category,
            timestamp: new Date(),
            metadata: {
              userType: step.document.userType,
              documentType: step.document.id,
              workflowStep: stepIndex + 1
            }
          };
          
          const result = await trackEditsCore.submitChange(submissionData);
          expect(result.success).toBe(true);
          totalProcessedChanges++;
          
          console.log(`Processed change for ${step.document.id}:`, {
            category: change.category,
            confidence: change.confidence,
            mode: step.mode
          });
        }
      }
      
      // Verify each document has appropriate changes
      for (const [key, document] of Object.entries(testDocuments)) {
        const documentChanges = trackEditsCore.getChangesForDocument(document.id);
        expect(documentChanges.length).toBeGreaterThan(0);
        
        // Verify changes are appropriate for document type
        const documentChangeCategories = documentChanges.map(c => c.category);
        const appropriateForDocument = document.expectedImprovements.some(expected =>
          documentChangeCategories.some(actual => actual.includes(expected) || expected.includes(actual))
        );
        
        expect(appropriateForDocument).toBe(true);
        
        console.log(`Document ${document.id} changes:`, {
          count: documentChanges.length,
          categories: [...new Set(documentChangeCategories)],
          userType: document.userType
        });
      }
      
      // Test clustering across documents
      const allDocumentIds = Object.values(testDocuments).map(d => d.id);
      let totalClusters = 0;
      
      for (const documentId of allDocumentIds) {
        const clusters = trackEditsCore.getChangeClusters(documentId, {
          strategy: 'category'
        });
        totalClusters += clusters.length;
      }
      
      console.log('✅ Multi-document workflow completed successfully');
      console.log('Multi-document workflow summary:', {
        documentsProcessed: Object.keys(testDocuments).length,
        workflowSteps: workflowSteps.length,
        totalChangesGenerated: totalProcessedChanges,
        totalClusters,
        documentTypes: Object.values(testDocuments).map(d => d.userType),
        modesUsed: [...new Set(workflowSteps.map(s => s.mode))]
      });
      
      expect(totalProcessedChanges).toBe(workflowSteps.length);
      expect(totalClusters).toBeGreaterThan(0);
    });
  });

  describe('User Experience and Workflow Efficiency', () => {
    it('should provide smooth user experience during typical editing session', async () => {
      console.log('⚡ Testing user experience and workflow efficiency...');
      
      const document = testDocuments.creativeStory;
      await trackEditsCore.enableTrackingForDocument(document.id);
      
      // Measure user workflow timing
      const workflowTiming = {
        trackingEnable: 0,
        modeSwitch: 0,
        aiProcessing: 0,
        changeSubmission: 0,
        userReview: 0,
        changeAcceptance: 0
      };
      
      // Step 1: Enable tracking (should be fast)
      const trackingStart = Date.now();
      await trackEditsCore.enableTrackingForDocument(`ux-test-${Date.now()}.md`);
      workflowTiming.trackingEnable = Date.now() - trackingStart;
      
      // Step 2: Mode switching (should be instant)
      const modeSwitchStart = Date.now();
      await modeManager.switchMode('creative-writing');
      workflowTiming.modeSwitch = Date.now() - modeSwitchStart;
      
      // Step 3: AI processing (realistic timing)
      const aiProcessingStart = Date.now();
      const aiResponse = await realisticAI.processText('She walked across the room.', {
        mode: 'creative',
        function: 'enhance'
      });
      workflowTiming.aiProcessing = Date.now() - aiProcessingStart;
      
      expect(aiResponse.success).toBe(true);
      
      // Step 4: Change submission (should be fast)
      const submissionStart = Date.now();
      if (aiResponse.changes && aiResponse.changes.length > 0) {
        const change = aiResponse.changes[0];
        const submissionData = {
          id: 'ux-test-change',
          documentId: document.id,
          type: 'edit' as const,
          originalText: change.originalText,
          suggestedText: change.suggestedText,
          startOffset: 0,
          endOffset: change.originalText.length,
          source: { type: 'ai' as const, plugin: 'ux-test' },
          confidence: change.confidence,
          category: change.category,
          timestamp: new Date()
        };
        
        await trackEditsCore.submitChange(submissionData);
      }
      workflowTiming.changeSubmission = Date.now() - submissionStart;
      
      // Step 5: User review (simulate review time)
      const reviewStart = Date.now();
      const documentChanges = trackEditsCore.getChangesForDocument(document.id);
      expect(documentChanges.length).toBeGreaterThan(0);
      
      // Simulate user review process
      await new Promise(resolve => setTimeout(resolve, 100)); // Realistic review time
      workflowTiming.userReview = Date.now() - reviewStart;
      
      // Step 6: Change acceptance (should be fast)
      const acceptanceStart = Date.now();
      const firstChange = documentChanges[0];
      await trackEditsCore.acceptChange(firstChange.id);
      workflowTiming.changeAcceptance = Date.now() - acceptanceStart;
      
      // Verify workflow efficiency standards
      expect(workflowTiming.trackingEnable).toBeLessThan(1000); // < 1 second
      expect(workflowTiming.modeSwitch).toBeLessThan(100); // < 100ms
      expect(workflowTiming.aiProcessing).toBeLessThan(1000); // < 1 second (realistic)
      expect(workflowTiming.changeSubmission).toBeLessThan(500); // < 500ms
      expect(workflowTiming.changeAcceptance).toBeLessThan(200); // < 200ms
      
      const totalWorkflowTime = Object.values(workflowTiming).reduce((sum, time) => sum + time, 0);
      
      // Test responsiveness during continuous use
      const continuousUseStart = Date.now();
      const continuousActions = 20;
      
      for (let i = 0; i < continuousActions; i++) {
        const quickChange = {
          id: `continuous-use-${i}`,
          documentId: document.id,
          type: 'edit' as const,
          originalText: `quick_text_${i}`,
          suggestedText: `improved_quick_text_${i}`,
          startOffset: i * 20,
          endOffset: i * 20 + 10,
          source: { type: 'ai' as const, plugin: 'continuous-use-test' },
          confidence: 0.8,
          category: 'continuous-test',
          timestamp: new Date()
        };
        
        const result = await trackEditsCore.submitChange(quickChange);
        expect(result.success).toBe(true);
      }
      
      const continuousUseTime = Date.now() - continuousUseStart;
      const averageActionTime = continuousUseTime / continuousActions;
      
      console.log('✅ User experience workflow efficiency verified');
      console.log('UX Performance Metrics:', {
        trackingEnable: `${workflowTiming.trackingEnable}ms`,
        modeSwitch: `${workflowTiming.modeSwitch}ms`,
        aiProcessing: `${workflowTiming.aiProcessing}ms`,
        changeSubmission: `${workflowTiming.changeSubmission}ms`,
        userReview: `${workflowTiming.userReview}ms`,
        changeAcceptance: `${workflowTiming.changeAcceptance}ms`,
        totalWorkflowTime: `${totalWorkflowTime}ms`,
        continuousActionsTime: `${continuousUseTime}ms`,
        averageActionTime: `${averageActionTime.toFixed(2)}ms`,
        responsiveExperience: averageActionTime < 100
      });
      
      expect(averageActionTime).toBeLessThan(100); // Maintain responsiveness
      expect(totalWorkflowTime).toBeLessThan(3000); // Complete workflow under 3 seconds
    });
  });
});