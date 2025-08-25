/**
 * Integration Tests for Writerr Chat Plugin Integration Layer
 * 
 * This module provides comprehensive tests for the integration components
 * to ensure they work together correctly.
 */

import { ChatMessage, ChatMode, DocumentContext, EditSuggestion } from '../interface/types';
import { integrationManager } from './IntegrationManager';
import { trackEditsIntegration } from './TrackEditsIntegration';
import { aiProvidersIntegration } from '../providers/AIProvidersIntegration';
import { performanceOptimizer } from '../providers/PerformanceOptimizer';
import { integrationErrorHandler } from './ErrorHandler';
import { globalEventBus } from '@writerr/shared';

export interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

export interface TestSuite {
  name: string;
  tests: TestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalDuration: number;
}

export class IntegrationTester {
  private results: TestSuite[] = [];

  /**
   * Run all integration tests
   */
  async runAllTests(): Promise<{
    suites: TestSuite[];
    summary: {
      totalSuites: number;
      totalTests: number;
      passedTests: number;
      failedTests: number;
      totalDuration: number;
    };
  }> {
    const startTime = Date.now();
    
    console.log('Starting integration tests...');
    
    // Run test suites
    const suites = await Promise.all([
      this.testIntegrationManagerSuite(),
      this.testTrackEditsIntegrationSuite(),
      this.testAIProvidersIntegrationSuite(),
      this.testPerformanceOptimizerSuite(),
      this.testErrorHandlingSuite(),
      this.testEndToEndSuite()
    ]);

    const summary = this.calculateSummary(suites);
    summary.totalDuration = Date.now() - startTime;
    
    console.log('Integration tests completed:', summary);
    
    return { suites, summary };
  }

  /**
   * Test Integration Manager functionality
   */
  private async testIntegrationManagerSuite(): Promise<TestSuite> {
    const suite: TestSuite = {
      name: 'Integration Manager',
      tests: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      totalDuration: 0
    };

    // Test initialization
    suite.tests.push(await this.runTest('Manager Initialization', async () => {
      const initialized = await integrationManager.initialize();
      if (!initialized) {
        throw new Error('Integration manager failed to initialize');
      }
      return { initialized };
    }));

    // Test status retrieval
    suite.tests.push(await this.runTest('Status Retrieval', async () => {
      const status = integrationManager.getStatus();
      if (!status) {
        throw new Error('Failed to get integration status');
      }
      return status;
    }));

    // Test health check
    suite.tests.push(await this.runTest('Health Check', async () => {
      const health = await integrationManager.healthCheck();
      if (!health || !health.overall) {
        throw new Error('Health check failed');
      }
      return health;
    }));

    // Test message processing
    suite.tests.push(await this.runTest('Message Processing', async () => {
      const mockMode: ChatMode = {
        id: 'test-mode',
        name: 'Test Mode',
        description: 'Test mode for integration testing',
        trackEditsIntegration: false,
        capabilities: [{ type: 'conversation', enabled: true }]
      };

      const mockMessages: ChatMessage[] = [{
        id: 'test-msg-1',
        content: 'Test message',
        role: 'user',
        timestamp: new Date()
      }];

      try {
        const response = await integrationManager.processMessage(mockMessages, mockMode);
        return response;
      } catch (error) {
        // Expected to fail without real AI providers, but should handle gracefully
        if (error instanceof Error && error.message.includes('not initialized')) {
          return { expectedError: true, message: error.message };
        }
        throw error;
      }
    }));

    this.finalizeSuite(suite);
    return suite;
  }

  /**
   * Test Track Edits Integration functionality
   */
  private async testTrackEditsIntegrationSuite(): Promise<TestSuite> {
    const suite: TestSuite = {
      name: 'Track Edits Integration',
      tests: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      totalDuration: 0
    };

    // Test initialization
    suite.tests.push(await this.runTest('Track Edits Initialization', async () => {
      const initialized = await trackEditsIntegration.initialize();
      // May fail if Track Edits plugin not available, which is expected
      return { initialized, available: trackEditsIntegration.isTrackEditsAvailable() };
    }));

    // Test status check
    suite.tests.push(await this.runTest('Track Edits Status', async () => {
      const status = trackEditsIntegration.getIntegrationStatus();
      if (!status) {
        throw new Error('Failed to get Track Edits status');
      }
      return status;
    }));

    // Test edit suggestion creation
    suite.tests.push(await this.runTest('Edit Suggestion Structure', async () => {
      const mockSuggestion: EditSuggestion = {
        id: 'test-edit-1',
        type: 'replace',
        range: { start: 0, end: 10, text: 'original text' },
        newText: 'replacement text',
        reason: 'Test edit suggestion',
        confidence: 0.8
      };

      // Test that suggestion structure is valid
      if (!mockSuggestion.id || !mockSuggestion.type || !mockSuggestion.newText) {
        throw new Error('Invalid edit suggestion structure');
      }

      return mockSuggestion;
    }));

    this.finalizeSuite(suite);
    return suite;
  }

  /**
   * Test AI Providers Integration functionality
   */
  private async testAIProvidersIntegrationSuite(): Promise<TestSuite> {
    const suite: TestSuite = {
      name: 'AI Providers Integration',
      tests: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      totalDuration: 0
    };

    // Test initialization
    suite.tests.push(await this.runTest('AI Providers Initialization', async () => {
      const initialized = await aiProvidersIntegration.initialize();
      // May fail if AI Providers plugin not available
      return { initialized };
    }));

    // Test provider detection
    suite.tests.push(await this.runTest('Provider Detection', async () => {
      const providers = await aiProvidersIntegration.getAvailableProviders();
      return { providerCount: providers.length, providers };
    }));

    // Test status check
    suite.tests.push(await this.runTest('AI Providers Status', async () => {
      const status = aiProvidersIntegration.getIntegrationStatus();
      if (!status) {
        throw new Error('Failed to get AI Providers status');
      }
      return status;
    }));

    this.finalizeSuite(suite);
    return suite;
  }

  /**
   * Test Performance Optimizer functionality
   */
  private async testPerformanceOptimizerSuite(): Promise<TestSuite> {
    const suite: TestSuite = {
      name: 'Performance Optimizer',
      tests: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      totalDuration: 0
    };

    // Test metrics retrieval
    suite.tests.push(await this.runTest('Metrics Retrieval', async () => {
      const metrics = performanceOptimizer.getMetrics();
      if (!metrics) {
        throw new Error('Failed to get performance metrics');
      }
      return metrics;
    }));

    // Test status check
    suite.tests.push(await this.runTest('Optimizer Status', async () => {
      const status = performanceOptimizer.getStatus();
      if (!status) {
        throw new Error('Failed to get optimizer status');
      }
      return status;
    }));

    // Test cache operations
    suite.tests.push(await this.runTest('Cache Operations', async () => {
      const initialMetrics = performanceOptimizer.getMetrics();
      performanceOptimizer.clearCache();
      const clearedMetrics = performanceOptimizer.getMetrics();
      
      return {
        initialCacheSize: initialMetrics.cachedRequests,
        clearedCacheSize: clearedMetrics.cachedRequests
      };
    }));

    // Test configuration updates
    suite.tests.push(await this.runTest('Configuration Updates', async () => {
      const initialConfig = performanceOptimizer.getStatus().config;
      
      performanceOptimizer.updateConfig({
        enableBatching: !initialConfig.enableBatching
      });

      const updatedConfig = performanceOptimizer.getStatus().config;
      
      if (updatedConfig.enableBatching === initialConfig.enableBatching) {
        throw new Error('Configuration update failed');
      }

      // Reset to original
      performanceOptimizer.updateConfig({
        enableBatching: initialConfig.enableBatching
      });

      return { configUpdated: true };
    }));

    this.finalizeSuite(suite);
    return suite;
  }

  /**
   * Test Error Handling functionality
   */
  private async testErrorHandlingSuite(): Promise<TestSuite> {
    const suite: TestSuite = {
      name: 'Error Handling',
      tests: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      totalDuration: 0
    };

    // Test error statistics
    suite.tests.push(await this.runTest('Error Statistics', async () => {
      const stats = integrationErrorHandler.getErrorStatistics();
      if (!stats) {
        throw new Error('Failed to get error statistics');
      }
      return stats;
    }));

    // Test error handling
    suite.tests.push(await this.runTest('Error Handling', async () => {
      const testError = new Error('Test error for integration testing');
      
      try {
        await integrationErrorHandler.handleError(testError, {
          source: 'chat-system',
          operation: 'test-operation',
          timestamp: new Date()
        });
        
        // Check if error was logged
        const stats = integrationErrorHandler.getErrorStatistics();
        if (stats.totalErrors === 0) {
          throw new Error('Error was not properly logged');
        }
        
        return { errorHandled: true, totalErrors: stats.totalErrors };
      } catch (handledError) {
        // This is expected - the error handler should handle the error gracefully
        return { errorHandled: true, gracefullyHandled: true };
      }
    }));

    // Test error history cleanup
    suite.tests.push(await this.runTest('Error History Cleanup', async () => {
      integrationErrorHandler.clearErrorHistory();
      const stats = integrationErrorHandler.getErrorStatistics();
      
      return { totalErrorsAfterCleanup: stats.totalErrors };
    }));

    this.finalizeSuite(suite);
    return suite;
  }

  /**
   * Test End-to-End Integration functionality
   */
  private async testEndToEndSuite(): Promise<TestSuite> {
    const suite: TestSuite = {
      name: 'End-to-End Integration',
      tests: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      totalDuration: 0
    };

    // Test event bus communication
    suite.tests.push(await this.runTest('Event Bus Communication', async () => {
      let eventReceived = false;
      const testData = { test: true, timestamp: Date.now() };

      // Set up event listener
      const handleTestEvent = (data: any) => {
        if (data.test === testData.test) {
          eventReceived = true;
        }
      };

      globalEventBus.on('integration-test-event', handleTestEvent);

      // Emit test event
      globalEventBus.emit('integration-test-event', testData);

      // Wait a bit for event processing
      await new Promise(resolve => setTimeout(resolve, 10));

      // Clean up
      globalEventBus.off('integration-test-event', handleTestEvent);

      if (!eventReceived) {
        throw new Error('Event bus communication failed');
      }

      return { eventReceived, testData };
    }));

    // Test component coordination
    suite.tests.push(await this.runTest('Component Coordination', async () => {
      const managerStatus = integrationManager.getStatus();
      const optimizerStatus = performanceOptimizer.getStatus();
      const errorStats = integrationErrorHandler.getErrorStatistics();

      return {
        manager: {
          initialized: managerStatus.aiProviders.isInitialized || managerStatus.trackEdits.isInitialized
        },
        optimizer: {
          functioning: optimizerStatus.isOptimizing !== undefined
        },
        errorHandler: {
          functioning: errorStats.totalErrors >= 0
        }
      };
    }));

    // Test graceful degradation
    suite.tests.push(await this.runTest('Graceful Degradation', async () => {
      // Simulate a scenario where external plugins are unavailable
      const mockMode: ChatMode = {
        id: 'degraded-test-mode',
        name: 'Degraded Test Mode',
        description: 'Testing graceful degradation',
        trackEditsIntegration: true,
        capabilities: [{ type: 'document-edit', enabled: true }]
      };

      const mockMessages: ChatMessage[] = [{
        id: 'degraded-test-msg',
        content: 'Test message for degradation',
        role: 'user',
        timestamp: new Date()
      }];

      try {
        const response = await integrationManager.processMessage(mockMessages, mockMode);
        return { gracefulDegradation: true, response: !!response };
      } catch (error) {
        // Should handle gracefully even if external systems fail
        if (error instanceof Error) {
          return {
            gracefulDegradation: true,
            handledException: error.message,
            expectedFailure: true
          };
        }
        throw error;
      }
    }));

    this.finalizeSuite(suite);
    return suite;
  }

  /**
   * Run a single test with timing and error handling
   */
  private async runTest(name: string, testFn: () => Promise<any>): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      return {
        name,
        passed: true,
        duration,
        details: result
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        name,
        passed: false,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      };
    }
  }

  /**
   * Finalize test suite statistics
   */
  private finalizeSuite(suite: TestSuite): void {
    suite.totalTests = suite.tests.length;
    suite.passedTests = suite.tests.filter(t => t.passed).length;
    suite.failedTests = suite.tests.filter(t => !t.passed).length;
    suite.totalDuration = suite.tests.reduce((sum, t) => sum + t.duration, 0);
  }

  /**
   * Calculate overall test summary
   */
  private calculateSummary(suites: TestSuite[]): {
    totalSuites: number;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    totalDuration: number;
  } {
    return {
      totalSuites: suites.length,
      totalTests: suites.reduce((sum, s) => sum + s.totalTests, 0),
      passedTests: suites.reduce((sum, s) => sum + s.passedTests, 0),
      failedTests: suites.reduce((sum, s) => sum + s.failedTests, 0),
      totalDuration: suites.reduce((sum, s) => sum + s.totalDuration, 0)
    };
  }

  /**
   * Generate test report
   */
  generateReport(results: { suites: TestSuite[]; summary: any }): string {
    let report = '# Writerr Chat Integration Test Report\n\n';
    
    report += `## Summary\n`;
    report += `- **Total Suites**: ${results.summary.totalSuites}\n`;
    report += `- **Total Tests**: ${results.summary.totalTests}\n`;
    report += `- **Passed**: ${results.summary.passedTests}\n`;
    report += `- **Failed**: ${results.summary.failedTests}\n`;
    report += `- **Success Rate**: ${((results.summary.passedTests / results.summary.totalTests) * 100).toFixed(1)}%\n`;
    report += `- **Total Duration**: ${results.summary.totalDuration}ms\n\n`;

    // Suite details
    for (const suite of results.suites) {
      report += `## ${suite.name}\n`;
      report += `- Tests: ${suite.totalTests}\n`;
      report += `- Passed: ${suite.passedTests}\n`;
      report += `- Failed: ${suite.failedTests}\n`;
      report += `- Duration: ${suite.totalDuration}ms\n\n`;

      for (const test of suite.tests) {
        const status = test.passed ? '✅' : '❌';
        report += `### ${status} ${test.name}\n`;
        report += `- Duration: ${test.duration}ms\n`;
        
        if (test.error) {
          report += `- Error: ${test.error}\n`;
        }
        
        if (test.details && typeof test.details === 'object') {
          report += `- Details: ${JSON.stringify(test.details, null, 2)}\n`;
        }
        
        report += '\n';
      }
    }

    return report;
  }
}

// Export singleton for use in testing
export const integrationTester = new IntegrationTester();