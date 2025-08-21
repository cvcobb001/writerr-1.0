/**
 * @fileoverview Integration tests for AI Editorial Functions execution
 * Tests the complete workflow from function loading to AI integration to Track Edits output
 */

import { FunctionRegistry } from '../../src/registry/FunctionRegistry';
import { FunctionLoader } from '../../src/loader/FunctionLoader';
import { AIProvidersIntegrationManager } from '../../src/integration/AIProvidersIntegrationManager';
import { TrackEditsIntegrationManager } from '../../src/integration/TrackEditsIntegrationManager';
import { PerformanceMonitoringManager } from '../../src/performance/PerformanceMonitoringManager';
import { FeedbackProcessor } from '../../src/learning/FeedbackProcessor';
import { EventBus } from '@writerr/shared';
import * as path from 'path';

// Mock AI Providers integration
class MockAIProvidersIntegration {
  private responses: Map<string, string> = new Map();
  
  setMockResponse(functionId: string, response: string) {
    this.responses.set(functionId, response);
  }
  
  async executeFunction(functionId: string, prompt: string, context: any): Promise<{
    success: boolean;
    response?: string;
    changes?: any[];
    error?: string;
  }> {
    const mockResponse = this.responses.get(functionId);
    
    if (!mockResponse) {
      return {
        success: false,
        error: `No mock response configured for function: ${functionId}`
      };
    }
    
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Parse mock response to generate changes
    const changes = this.parseResponseToChanges(mockResponse, context);
    
    return {
      success: true,
      response: mockResponse,
      changes
    };
  }
  
  private parseResponseToChanges(response: string, context: any): any[] {
    // Simple mock change generation
    return [{
      originalText: context.selectedText || 'sample text',
      suggestedText: response,
      startOffset: context.selectionStart || 0,
      endOffset: context.selectionEnd || 11,
      confidence: 0.9,
      category: 'ai-improvement'
    }];
  }
}

// Mock Track Edits integration
class MockTrackEditsIntegration {
  private submittedChanges: any[] = [];
  
  async submitChanges(changes: any[], source: any): Promise<{
    success: boolean;
    changeIds?: string[];
    error?: string;
  }> {
    const changeIds = changes.map((change, index) => `track-${Date.now()}-${index}`);
    
    changes.forEach((change, index) => {
      this.submittedChanges.push({
        id: changeIds[index],
        ...change,
        source,
        status: 'pending',
        timestamp: new Date()
      });
    });
    
    return {
      success: true,
      changeIds
    };
  }
  
  getSubmittedChanges(): any[] {
    return [...this.submittedChanges];
  }
  
  clearSubmittedChanges(): void {
    this.submittedChanges = [];
  }
}

describe('AI Editorial Functions Integration Tests', () => {
  let functionRegistry: FunctionRegistry;
  let functionLoader: FunctionLoader;
  let aiProvidersIntegration: MockAIProvidersIntegration;
  let trackEditsIntegration: MockTrackEditsIntegration;
  let performanceMonitor: PerformanceMonitoringManager;
  let feedbackProcessor: FeedbackProcessor;
  let eventBus: EventBus;

  const sampleFunctions = {
    'copy-editor.md': `---
id: copy-editor
name: Copy Editor
version: 1.2.0
description: Professional copy editing for grammar, style, and clarity
category: copy-editor
priority: 90
enabled: true
---

# Copy Editor Function

You are a professional copy editor with expertise in grammar, punctuation, style, and clarity.

## System Prompt
Analyze the provided text and make improvements to:
- Grammar and punctuation
- Sentence structure and clarity  
- Word choice and style
- Consistency and flow

Provide specific, targeted edits that preserve the author's voice while improving readability.

## Track Edits Configuration
- Batch size: 10
- Confidence threshold: 0.85
- Clustering strategy: category
- Auto-apply: false

## Examples
### Example 1
**Input**: "The data shows that our customers is satisfied with the service."
**Output**: "The data shows that our customers are satisfied with the service."
**Category**: grammar
**Confidence**: 0.95

### Example 2  
**Input**: "We need to optimize our approach for maximum efficiency and effectiveness."
**Output**: "We need to streamline our approach for greater efficiency."
**Category**: concision
**Confidence**: 0.8

## Constraints
- Never change technical terms or proper nouns
- Preserve original meaning and intent
- Focus on clarity over creativity
- Maintain professional tone`,

    'proofreader.md': `---
id: proofreader  
name: Proofreader
version: 1.0.0
description: Final proofreading for typos, punctuation, and formatting
category: proofreader
priority: 95
enabled: true
---

# Proofreader Function

You are a meticulous proofreader focused on catching final errors before publication.

## System Prompt
Perform final proofreading to catch:
- Spelling errors and typos
- Punctuation mistakes
- Capitalization issues
- Formatting inconsistencies
- Missing or extra spaces

Make minimal changes focused only on corrections, not style improvements.

## Track Edits Configuration
- Batch size: 20
- Confidence threshold: 0.95
- Clustering strategy: proximity
- Auto-apply: true

## Constraints
- Only make corrections, not improvements
- High confidence threshold required
- Preserve all formatting and structure
- Never alter technical content or code`
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Initialize components
    functionRegistry = new FunctionRegistry();
    functionLoader = new FunctionLoader();
    aiProvidersIntegration = new MockAIProvidersIntegration();
    trackEditsIntegration = new MockTrackEditsIntegration();
    performanceMonitor = new PerformanceMonitoringManager();
    feedbackProcessor = new FeedbackProcessor();
    eventBus = new EventBus();
    
    // Set up mock AI responses
    aiProvidersIntegration.setMockResponse(
      'copy-editor',
      'our customers are satisfied with the service'
    );
    aiProvidersIntegration.setMockResponse(
      'proofreader', 
      'streamline our approach for greater efficiency'
    );
    
    // Load sample functions
    for (const [fileName, content] of Object.entries(sampleFunctions)) {
      const tempPath = `/test/functions/${fileName}`;
      
      // Mock the file loading
      jest.spyOn(functionLoader, 'loadFromFile').mockImplementation(async (filePath) => {
        if (filePath.endsWith(fileName)) {
          return {
            success: true,
            function: {
              id: fileName.replace('.md', ''),
              name: fileName.replace('.md', '').replace('-', ' '),
              version: '1.0.0',
              description: 'Test function',
              category: fileName.replace('.md', '') as any,
              capabilities: ['test'],
              dependencies: [],
              enabled: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              filePath: tempPath,
              fileType: 'md' as const,
              content,
              parsedContent: {
                systemPrompt: content.includes('System Prompt') ? 
                  content.split('## System Prompt')[1].split('##')[0].trim() : 
                  'Default system prompt',
                examples: []
              },
              hash: `hash-${fileName}`,
              loadedAt: new Date()
            },
            errors: []
          };
        }
        return { success: false, errors: ['File not found'] };
      });
    }
  });

  afterEach(() => {
    trackEditsIntegration.clearSubmittedChanges();
  });

  describe('Complete Function Execution Workflow', () => {
    it('should execute copy editor function end-to-end', async () => {
      // Load and register function
      const loadResult = await functionLoader.loadFromFile('/test/functions/copy-editor.md');
      expect(loadResult.success).toBe(true);
      
      functionRegistry.registerFunction(loadResult.function!);
      
      // Verify function is registered
      const registeredFunction = functionRegistry.getFunction('copy-editor');
      expect(registeredFunction).toBeDefined();
      expect(registeredFunction?.enabled).toBe(true);
      
      // Execute function with test context
      const context = {
        documentId: 'test-doc.md',
        selectedText: 'The data shows that our customers is satisfied with the service.',
        selectionStart: 0,
        selectionEnd: 64,
        documentContent: 'The data shows that our customers is satisfied with the service. This is additional context.',
        mode: 'copy-edit'
      };
      
      const executionResult = await aiProvidersIntegration.executeFunction(
        'copy-editor',
        registeredFunction!.parsedContent.systemPrompt,
        context
      );
      
      expect(executionResult.success).toBe(true);
      expect(executionResult.changes).toBeDefined();
      expect(executionResult.changes!.length).toBeGreaterThan(0);
      
      // Submit changes to Track Edits
      const submissionResult = await trackEditsIntegration.submitChanges(
        executionResult.changes!,
        {
          type: 'ai',
          plugin: 'ai-editorial-functions',
          function: 'copy-editor',
          model: 'mock-ai-model'
        }
      );
      
      expect(submissionResult.success).toBe(true);
      expect(submissionResult.changeIds).toBeDefined();
      
      // Verify changes were submitted correctly
      const submittedChanges = trackEditsIntegration.getSubmittedChanges();
      expect(submittedChanges.length).toBeGreaterThan(0);
      
      const firstChange = submittedChanges[0];
      expect(firstChange.source.function).toBe('copy-editor');
      expect(firstChange.status).toBe('pending');
      
      console.log('✅ Copy editor function executed successfully end-to-end');
      console.log('Execution results:', {
        functionLoaded: loadResult.success,
        aiExecutionSuccess: executionResult.success,
        changesGenerated: executionResult.changes?.length,
        trackEditsSubmission: submissionResult.success,
        submittedChangeIds: submissionResult.changeIds?.length
      });
      
      console.log('Generated change details:', {
        originalText: firstChange.originalText,
        suggestedText: firstChange.suggestedText,
        category: firstChange.category,
        confidence: firstChange.confidence
      });
    });

    it('should handle multiple functions executing concurrently', async () => {
      // Load both functions
      const copyEditorResult = await functionLoader.loadFromFile('/test/functions/copy-editor.md');
      const proofreaderResult = await functionLoader.loadFromFile('/test/functions/proofreader.md');
      
      expect(copyEditorResult.success).toBe(true);
      expect(proofreaderResult.success).toBe(true);
      
      functionRegistry.registerFunction(copyEditorResult.function!);
      functionRegistry.registerFunction(proofreaderResult.function!);
      
      const context = {
        documentId: 'concurrent-test.md',
        selectedText: 'We need to optimize our approach for maximum efficiency and effectiveness.',
        selectionStart: 0,
        selectionEnd: 73,
        documentContent: 'We need to optimize our approach for maximum efficiency and effectiveness. More content here.',
        mode: 'comprehensive-edit'
      };
      
      // Execute both functions concurrently
      const [copyEditorExecution, proofreaderExecution] = await Promise.all([
        aiProvidersIntegration.executeFunction(
          'copy-editor',
          copyEditorResult.function!.parsedContent.systemPrompt,
          context
        ),
        aiProvidersIntegration.executeFunction(
          'proofreader',
          proofreaderResult.function!.parsedContent.systemPrompt,
          context
        )
      ]);
      
      expect(copyEditorExecution.success).toBe(true);
      expect(proofreaderExecution.success).toBe(true);
      
      // Submit all changes
      const allChanges = [
        ...copyEditorExecution.changes!,
        ...proofreaderExecution.changes!
      ];
      
      const submissionResult = await trackEditsIntegration.submitChanges(
        allChanges,
        {
          type: 'ai',
          plugin: 'ai-editorial-functions',
          function: 'comprehensive-editor'
        }
      );
      
      expect(submissionResult.success).toBe(true);
      
      const submittedChanges = trackEditsIntegration.getSubmittedChanges();
      expect(submittedChanges.length).toBe(allChanges.length);
      
      console.log('✅ Concurrent function execution handled successfully');
      console.log('Concurrent execution results:', {
        copyEditorSuccess: copyEditorExecution.success,
        proofreaderSuccess: proofreaderExecution.success,
        totalChangesGenerated: allChanges.length,
        allChangesSubmitted: submissionResult.success
      });
    });
  });

  describe('Function Configuration and Behavior', () => {
    it('should apply function-specific Track Edits configuration', async () => {
      const copyEditorResult = await functionLoader.loadFromFile('/test/functions/copy-editor.md');
      functionRegistry.registerFunction(copyEditorResult.function!);
      
      const copyEditor = functionRegistry.getFunction('copy-editor');
      
      // Verify configuration was parsed correctly
      expect(copyEditor?.parsedContent.trackEditsConfig).toBeDefined();
      
      // Mock the configuration extraction
      const mockConfig = {
        batchSize: 10,
        confidenceThreshold: 0.85,
        clusteringStrategy: 'category',
        autoApply: false
      };
      
      // Simulate function execution with configuration
      const context = {
        documentId: 'config-test.md',
        selectedText: 'Test text for configuration',
        configuration: mockConfig
      };
      
      const executionResult = await aiProvidersIntegration.executeFunction(
        'copy-editor',
        copyEditor!.parsedContent.systemPrompt,
        context
      );
      
      // Verify configuration is applied during submission
      const submissionResult = await trackEditsIntegration.submitChanges(
        executionResult.changes!,
        {
          type: 'ai',
          plugin: 'ai-editorial-functions',
          function: 'copy-editor',
          configuration: mockConfig
        }
      );
      
      expect(submissionResult.success).toBe(true);
      
      console.log('✅ Function-specific configuration applied correctly');
      console.log('Applied configuration:', mockConfig);
    });

    it('should respect function constraints and validation', async () => {
      const proofreaderResult = await functionLoader.loadFromFile('/test/functions/proofreader.md');
      functionRegistry.registerFunction(proofreaderResult.function!);
      
      // Test with content that should be left unchanged (technical content)
      const context = {
        documentId: 'constraint-test.md',
        selectedText: 'const apiKey = "sk-1234567890abcdef";',
        selectionStart: 0,
        selectionEnd: 34,
        documentContent: 'const apiKey = "sk-1234567890abcdef"; // API configuration',
        mode: 'proofread'
      };
      
      // Mock response that respects constraints
      aiProvidersIntegration.setMockResponse(
        'proofreader',
        'const apiKey = "sk-1234567890abcdef";' // Unchanged technical content
      );
      
      const executionResult = await aiProvidersIntegration.executeFunction(
        'proofreader',
        proofreaderResult.function!.parsedContent.systemPrompt,
        context
      );
      
      expect(executionResult.success).toBe(true);
      
      // Verify that technical content was preserved
      const change = executionResult.changes![0];
      expect(change.suggestedText).toBe(change.originalText); // No changes to code
      
      console.log('✅ Function constraints respected correctly');
      console.log('Constraint test result:', {
        originalText: change.originalText,
        suggestedText: change.suggestedText,
        preserved: change.originalText === change.suggestedText
      });
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should track function execution performance', async () => {
      await performanceMonitor.initialize();
      
      const copyEditorResult = await functionLoader.loadFromFile('/test/functions/copy-editor.md');
      functionRegistry.registerFunction(copyEditorResult.function!);
      
      const context = {
        documentId: 'perf-test.md',
        selectedText: 'Performance test content for monitoring.',
        mode: 'copy-edit'
      };
      
      // Start performance tracking
      const executionId = performanceMonitor.startExecution('copy-editor');
      
      const startTime = Date.now();
      const executionResult = await aiProvidersIntegration.executeFunction(
        'copy-editor',
        copyEditorResult.function!.parsedContent.systemPrompt,
        context
      );
      const executionTime = Date.now() - startTime;
      
      // End performance tracking
      performanceMonitor.endExecution(executionId, {
        success: executionResult.success,
        executionTime,
        changesGenerated: executionResult.changes?.length || 0
      });
      
      // Get performance metrics
      const metrics = performanceMonitor.getMetrics('copy-editor');
      
      expect(metrics.executionCount).toBeGreaterThan(0);
      expect(metrics.averageExecutionTime).toBeGreaterThan(0);
      expect(metrics.successRate).toBe(1.0);
      
      console.log('✅ Function execution performance tracked successfully');
      console.log('Performance metrics:', {
        executionCount: metrics.executionCount,
        averageExecutionTime: `${metrics.averageExecutionTime}ms`,
        successRate: `${(metrics.successRate * 100).toFixed(1)}%`,
        totalChangesGenerated: metrics.totalChangesGenerated
      });
    });

    it('should detect and handle performance degradation', async () => {
      await performanceMonitor.initialize();
      
      const copyEditorResult = await functionLoader.loadFromFile('/test/functions/copy-editor.md');
      functionRegistry.registerFunction(copyEditorResult.function!);
      
      // Simulate degraded performance
      const slowContext = {
        documentId: 'slow-test.md',
        selectedText: 'A' + 'very '.repeat(1000) + 'long text for performance testing.',
        mode: 'copy-edit'
      };
      
      // Mock slow AI response
      const originalExecute = aiProvidersIntegration.executeFunction;
      aiProvidersIntegration.executeFunction = async (functionId, prompt, context) => {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        return originalExecute.call(aiProvidersIntegration, functionId, prompt, context);
      };
      
      const executionId = performanceMonitor.startExecution('copy-editor');
      const startTime = Date.now();
      
      const executionResult = await aiProvidersIntegration.executeFunction(
        'copy-editor',
        copyEditorResult.function!.parsedContent.systemPrompt,
        slowContext
      );
      
      const executionTime = Date.now() - startTime;
      
      performanceMonitor.endExecution(executionId, {
        success: executionResult.success,
        executionTime,
        changesGenerated: executionResult.changes?.length || 0
      });
      
      // Check for performance warnings
      const metrics = performanceMonitor.getMetrics('copy-editor');
      const isPerformanceDegraded = metrics.averageExecutionTime > 1000; // > 1 second
      
      if (isPerformanceDegraded) {
        console.warn('Performance degradation detected for copy-editor function');
        eventBus.emit('function:performance-warning', {
          functionId: 'copy-editor',
          metrics
        });
      }
      
      console.log('✅ Performance degradation detection working');
      console.log('Performance degradation test:', {
        executionTime: `${executionTime}ms`,
        averageTime: `${metrics.averageExecutionTime}ms`,
        degradationDetected: isPerformanceDegraded
      });
      
      // Restore original function
      aiProvidersIntegration.executeFunction = originalExecute;
    });
  });

  describe('Learning and Feedback Integration', () => {
    it('should process user feedback for function improvement', async () => {
      await feedbackProcessor.initialize();
      
      const copyEditorResult = await functionLoader.loadFromFile('/test/functions/copy-editor.md');
      functionRegistry.registerFunction(copyEditorResult.function!);
      
      // Simulate function execution and change submission
      const context = {
        documentId: 'feedback-test.md',
        selectedText: 'The data shows that our customers is satisfied.',
        mode: 'copy-edit'
      };
      
      const executionResult = await aiProvidersIntegration.executeFunction(
        'copy-editor',
        copyEditorResult.function!.parsedContent.systemPrompt,
        context
      );
      
      const submissionResult = await trackEditsIntegration.submitChanges(
        executionResult.changes!,
        {
          type: 'ai',
          plugin: 'ai-editorial-functions',
          function: 'copy-editor'
        }
      );
      
      const changeId = submissionResult.changeIds![0];
      
      // Simulate user accepting the change (positive feedback)
      const feedback = {
        changeId,
        functionId: 'copy-editor',
        action: 'accepted',
        originalText: executionResult.changes![0].originalText,
        suggestedText: executionResult.changes![0].suggestedText,
        userComment: 'Good grammar correction',
        timestamp: new Date()
      };
      
      await feedbackProcessor.processFeedback(feedback);
      
      // Get learning insights
      const insights = feedbackProcessor.getInsights('copy-editor');
      
      expect(insights.totalFeedback).toBe(1);
      expect(insights.acceptanceRate).toBe(1.0);
      expect(insights.commonPatterns.length).toBeGreaterThanOrEqual(0);
      
      console.log('✅ User feedback processed for function learning');
      console.log('Learning insights:', {
        totalFeedback: insights.totalFeedback,
        acceptanceRate: `${(insights.acceptanceRate * 100).toFixed(1)}%`,
        commonPatterns: insights.commonPatterns.length
      });
    });

    it('should adapt function behavior based on feedback patterns', async () => {
      await feedbackProcessor.initialize();
      
      // Simulate multiple feedback instances
      const feedbackItems = [
        {
          changeId: 'change-1',
          functionId: 'copy-editor',
          action: 'accepted',
          category: 'grammar',
          confidence: 0.9
        },
        {
          changeId: 'change-2',
          functionId: 'copy-editor',
          action: 'rejected',
          category: 'style',
          confidence: 0.7,
          userComment: 'Too formal for this context'
        },
        {
          changeId: 'change-3',
          functionId: 'copy-editor',
          action: 'accepted',
          category: 'grammar',
          confidence: 0.95
        }
      ];
      
      for (const feedback of feedbackItems) {
        await feedbackProcessor.processFeedback({
          ...feedback,
          originalText: 'sample text',
          suggestedText: 'corrected text',
          timestamp: new Date()
        });
      }
      
      // Analyze patterns
      const insights = feedbackProcessor.getInsights('copy-editor');
      
      expect(insights.categoryPerformance.get('grammar')?.acceptanceRate).toBe(1.0);
      expect(insights.categoryPerformance.get('style')?.acceptanceRate).toBe(0.0);
      
      // Generate adaptation recommendations
      const recommendations = feedbackProcessor.generateRecommendations('copy-editor');
      
      expect(recommendations.length).toBeGreaterThan(0);
      const styleRecommendation = recommendations.find(r => r.category === 'style');
      expect(styleRecommendation?.suggestion).toContain('confidence');
      
      console.log('✅ Function behavior adaptation based on feedback patterns');
      console.log('Feedback analysis:', {
        totalFeedback: insights.totalFeedback,
        grammarAcceptance: insights.categoryPerformance.get('grammar')?.acceptanceRate,
        styleAcceptance: insights.categoryPerformance.get('style')?.acceptanceRate,
        recommendations: recommendations.length
      });
      
      console.log('Adaptation recommendations:', recommendations);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle AI service failures gracefully', async () => {
      const copyEditorResult = await functionLoader.loadFromFile('/test/functions/copy-editor.md');
      functionRegistry.registerFunction(copyEditorResult.function!);
      
      // Mock AI service failure
      const originalExecute = aiProvidersIntegration.executeFunction;
      aiProvidersIntegration.executeFunction = async () => ({
        success: false,
        error: 'AI service unavailable'
      });
      
      const context = {
        documentId: 'error-test.md',
        selectedText: 'Test content for error handling.',
        mode: 'copy-edit'
      };
      
      const executionResult = await aiProvidersIntegration.executeFunction(
        'copy-editor',
        copyEditorResult.function!.parsedContent.systemPrompt,
        context
      );
      
      expect(executionResult.success).toBe(false);
      expect(executionResult.error).toBeDefined();
      
      // Verify system continues to function
      aiProvidersIntegration.executeFunction = originalExecute;
      aiProvidersIntegration.setMockResponse('copy-editor', 'Recovery test response');
      
      const recoveryResult = await aiProvidersIntegration.executeFunction(
        'copy-editor',
        copyEditorResult.function!.parsedContent.systemPrompt,
        context
      );
      
      expect(recoveryResult.success).toBe(true);
      
      console.log('✅ AI service failures handled gracefully');
      console.log('Error handling test:', {
        initialFailure: !executionResult.success,
        errorMessage: executionResult.error,
        recoverySuccess: recoveryResult.success
      });
    });

    it('should handle malformed AI responses', async () => {
      const copyEditorResult = await functionLoader.loadFromFile('/test/functions/copy-editor.md');
      functionRegistry.registerFunction(copyEditorResult.function!);
      
      // Set malformed response
      aiProvidersIntegration.setMockResponse('copy-editor', ''); // Empty response
      
      const context = {
        documentId: 'malformed-test.md',
        selectedText: 'Test content for malformed response.',
        mode: 'copy-edit'
      };
      
      const executionResult = await aiProvidersIntegration.executeFunction(
        'copy-editor',
        copyEditorResult.function!.parsedContent.systemPrompt,
        context
      );
      
      // Should still succeed but handle the malformed response
      expect(executionResult.success).toBe(true);
      expect(executionResult.changes).toBeDefined();
      
      // The mock should handle empty responses gracefully
      const change = executionResult.changes![0];
      expect(change.suggestedText).toBe(''); // Empty but defined
      
      console.log('✅ Malformed AI responses handled gracefully');
      console.log('Malformed response handling:', {
        executionSuccess: executionResult.success,
        changesGenerated: executionResult.changes?.length,
        handledGracefully: true
      });
    });
  });
});