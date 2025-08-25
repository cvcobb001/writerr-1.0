/**
 * @fileoverview Integration Validator - Validates and tests integration components
 */

import { EventData, globalEventBus } from '@writerr/shared';
import { trackEditsIntegrationManager } from './TrackEditsIntegrationManager';
import { aiProvidersIntegrationManager } from './AIProvidersIntegrationManager';
import { sessionLearningManager } from '../learning/SessionLearningManager';
import { feedbackProcessor } from '../learning/FeedbackProcessor';
import { performanceMonitoringManager } from '../performance/PerformanceMonitoringManager';
import { functionPriorityManager } from '../performance/FunctionPriorityManager';
import { resourceManager } from '../performance/ResourceManager';
import { functionSelector } from '../performance/FunctionSelector';

export interface ValidationResult {
  component: string;
  passed: boolean;
  tests: TestResult[];
  overall: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    successRate: number;
  };
  errors: ValidationError[];
  timestamp: Date;
}

export interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

export interface ValidationError {
  component: string;
  test: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
}

export class IntegrationValidator {
  private testSuites = new Map<string, TestSuite>();
  private lastValidation = new Map<string, ValidationResult>();
  private continuousMode = false;
  private validationTimer?: NodeJS.Timeout;

  constructor() {
    this.initializeTestSuites();
  }

  /**
   * Initialize integration validator
   */
  initialize(): void {
    console.log('[IntegrationValidator] Initialized successfully');
  }

  /**
   * Validate all integration components
   */
  async validateAll(): Promise<Map<string, ValidationResult>> {
    console.log('[IntegrationValidator] Starting comprehensive validation...');
    
    const results = new Map<string, ValidationResult>();
    
    // Validate each component
    const components = [
      'trackEditsIntegration',
      'aiProvidersIntegration', 
      'sessionLearning',
      'feedbackProcessor',
      'performanceMonitoring',
      'functionPriority',
      'resourceManager',
      'functionSelector'
    ];

    for (const component of components) {
      try {
        const result = await this.validateComponent(component);
        results.set(component, result);
        this.lastValidation.set(component, result);
      } catch (error) {
        console.error(`[IntegrationValidator] Error validating ${component}:`, error);
        results.set(component, this.createErrorResult(component, error as Error));
      }
    }

    // Run integration tests
    const integrationResult = await this.validateIntegrations();
    results.set('integrations', integrationResult);

    this.logValidationSummary(results);
    return results;
  }

  /**
   * Validate specific component
   */
  async validateComponent(component: string): Promise<ValidationResult> {
    const testSuite = this.testSuites.get(component);
    if (!testSuite) {
      throw new Error(`No test suite found for component: ${component}`);
    }

    const startTime = Date.now();
    const testResults: TestResult[] = [];
    const errors: ValidationError[] = [];

    for (const test of testSuite.tests) {
      const testStart = Date.now();
      
      try {
        const passed = await test.execute();
        const duration = Date.now() - testStart;
        
        testResults.push({
          name: test.name,
          passed,
          duration,
          details: test.getDetails?.()
        });
        
        if (!passed) {
          errors.push({
            component,
            test: test.name,
            message: test.getErrorMessage?.() || 'Test failed',
            severity: test.severity || 'medium',
            timestamp: new Date()
          });
        }
        
      } catch (error) {
        const duration = Date.now() - testStart;
        
        testResults.push({
          name: test.name,
          passed: false,
          duration,
          error: (error as Error).message
        });
        
        errors.push({
          component,
          test: test.name,
          message: (error as Error).message,
          severity: 'critical',
          timestamp: new Date()
        });
      }
    }

    const totalTests = testResults.length;
    const passedTests = testResults.filter(t => t.passed).length;
    const failedTests = totalTests - passedTests;
    
    return {
      component,
      passed: failedTests === 0,
      tests: testResults,
      overall: {
        totalTests,
        passedTests,
        failedTests,
        successRate: totalTests > 0 ? passedTests / totalTests : 1
      },
      errors,
      timestamp: new Date()
    };
  }

  /**
   * Start continuous validation
   */
  startContinuousValidation(intervalMs: number = 300000): void {
    if (this.continuousMode) return;
    
    this.continuousMode = true;
    this.validationTimer = setInterval(() => {
      this.validateAll().catch(error => {
        console.error('[IntegrationValidator] Error in continuous validation:', error);
      });
    }, intervalMs);
    
    console.log('[IntegrationValidator] Started continuous validation');
  }

  /**
   * Stop continuous validation
   */
  stopContinuousValidation(): void {
    if (this.validationTimer) {
      clearInterval(this.validationTimer);
      this.validationTimer = undefined;
    }
    this.continuousMode = false;
    console.log('[IntegrationValidator] Stopped continuous validation');
  }

  /**
   * Get last validation results
   */
  getLastValidation(component?: string): ValidationResult | Map<string, ValidationResult> | null {
    if (component) {
      return this.lastValidation.get(component) || null;
    }
    return new Map(this.lastValidation);
  }

  // Private helper methods
  private initializeTestSuites(): void {
    // Track Edits Integration Tests
    this.testSuites.set('trackEditsIntegration', {
      name: 'Track Edits Integration',
      tests: [
        {
          name: 'Manager Initialization',
          execute: async () => {
            return trackEditsIntegrationManager !== undefined;
          }
        },
        {
          name: 'Configuration Test',
          execute: async () => {
            trackEditsIntegrationManager.configureFunction('test-function', {
              batchingStrategy: 'immediate',
              confidenceThreshold: 0.8
            });
            const integration = trackEditsIntegrationManager.getIntegration('test-function');
            return integration !== null && integration.isEnabled;
          }
        },
        {
          name: 'Event Bus Connection',
          execute: async () => {
            return globalEventBus !== undefined;
          }
        }
      ]
    });

    // AI Providers Integration Tests
    this.testSuites.set('aiProvidersIntegration', {
      name: 'AI Providers Integration',
      tests: [
        {
          name: 'Manager Initialization',
          execute: async () => {
            return aiProvidersIntegrationManager !== undefined;
          }
        },
        {
          name: 'Configuration Test',
          execute: async () => {
            aiProvidersIntegrationManager.configureFunction('test-function', {
              modelRouting: {
                primaryModel: {
                  providerId: 'openai',
                  modelId: 'gpt-4',
                  parameters: { temperature: 0.7 },
                  constraints: {
                    maxRequestsPerMinute: 60,
                    maxTokensPerRequest: 4000,
                    maxConcurrentRequests: 5
                  },
                  performance: {
                    averageLatency: 2000,
                    averageQuality: 0.85,
                    reliability: 0.95,
                    costPerToken: 0.00003,
                    lastUpdated: new Date()
                  }
                },
                fallbackModels: [],
                routingRules: []
              }
            });
            
            const stats = aiProvidersIntegrationManager.getStats('test-function');
            return stats !== null;
          }
        }
      ]
    });

    // Session Learning Tests
    this.testSuites.set('sessionLearning', {
      name: 'Session Learning',
      tests: [
        {
          name: 'Manager Initialization',
          execute: async () => {
            return sessionLearningManager !== undefined;
          }
        },
        {
          name: 'Session Management',
          execute: async () => {
            sessionLearningManager.initializeSession('test-session', 'test-user');
            const session = sessionLearningManager.getSessionData('test-session');
            return session !== null && session.sessionId === 'test-session';
          }
        }
      ]
    });

    // Feedback Processor Tests
    this.testSuites.set('feedbackProcessor', {
      name: 'Feedback Processor',
      tests: [
        {
          name: 'Processor Initialization',
          execute: async () => {
            return feedbackProcessor !== undefined;
          }
        },
        {
          name: 'Feedback Analysis',
          execute: async () => {
            const suggestions = feedbackProcessor.generateImprovementSuggestions('test-function');
            return Array.isArray(suggestions);
          }
        }
      ]
    });

    // Performance Monitoring Tests
    this.testSuites.set('performanceMonitoring', {
      name: 'Performance Monitoring',
      tests: [
        {
          name: 'Manager Initialization',
          execute: async () => {
            return performanceMonitoringManager !== undefined;
          }
        },
        {
          name: 'Function Configuration',
          execute: async () => {
            performanceMonitoringManager.configureFunction('test-function', {});
            const metrics = performanceMonitoringManager.getMetrics('test-function');
            return metrics !== null;
          }
        }
      ]
    });

    // Function Priority Tests
    this.testSuites.set('functionPriority', {
      name: 'Function Priority',
      tests: [
        {
          name: 'Manager Initialization',
          execute: async () => {
            return functionPriorityManager !== undefined;
          }
        },
        {
          name: 'Priority Calculation',
          execute: async () => {
            const priority = functionPriorityManager.calculatePriority('test-function');
            return typeof priority === 'number' && priority >= 0 && priority <= 100;
          }
        },
        {
          name: 'Function Selection',
          execute: async () => {
            const selected = functionPriorityManager.selectFunction(['test-function'], {});
            return selected === 'test-function' || selected === null;
          }
        }
      ]
    });

    // Resource Manager Tests
    this.testSuites.set('resourceManager', {
      name: 'Resource Manager',
      tests: [
        {
          name: 'Manager Initialization',
          execute: async () => {
            return resourceManager !== undefined;
          }
        },
        {
          name: 'Resource Configuration',
          execute: async () => {
            resourceManager.configureFunction('test-function', {});
            const usage = resourceManager.getCurrentUsage('test-function');
            return usage !== null;
          }
        },
        {
          name: 'Pool Status',
          execute: async () => {
            const pools = resourceManager.getPoolStatus();
            return pools instanceof Map && pools.size > 0;
          }
        }
      ]
    });

    // Function Selector Tests
    this.testSuites.set('functionSelector', {
      name: 'Function Selector',
      tests: [
        {
          name: 'Selector Initialization',
          execute: async () => {
            return functionSelector !== undefined;
          }
        },
        {
          name: 'Statistics Retrieval',
          execute: async () => {
            const stats = functionSelector.getStatistics();
            return stats !== null && typeof stats.totalSelections === 'number';
          }
        }
      ]
    });
  }

  private async validateIntegrations(): Promise<ValidationResult> {
    const tests: TestResult[] = [];
    const errors: ValidationError[] = [];

    // Test 1: Event Bus Communication
    try {
      const testStart = Date.now();
      
      const eventReceived = await new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => resolve(false), 5000);
        
        globalEventBus.once('integration-test-event', () => {
          clearTimeout(timeout);
          resolve(true);
        });
        
        globalEventBus.emit('integration-test-event', { test: true }, 'validator');
      });
      
      const duration = Date.now() - testStart;
      
      tests.push({
        name: 'Event Bus Communication',
        passed: eventReceived,
        duration
      });
      
      if (!eventReceived) {
        errors.push({
          component: 'integrations',
          test: 'Event Bus Communication',
          message: 'Event bus communication failed',
          severity: 'critical',
          timestamp: new Date()
        });
      }
    } catch (error) {
      tests.push({
        name: 'Event Bus Communication',
        passed: false,
        duration: 5000,
        error: (error as Error).message
      });
    }

    // Test 2: Component Dependencies
    const dependencyTest = this.validateComponentDependencies();
    tests.push({
      name: 'Component Dependencies',
      passed: dependencyTest.passed,
      duration: dependencyTest.duration,
      details: dependencyTest.details
    });

    if (!dependencyTest.passed) {
      errors.push(...dependencyTest.errors);
    }

    const totalTests = tests.length;
    const passedTests = tests.filter(t => t.passed).length;
    const failedTests = totalTests - passedTests;

    return {
      component: 'integrations',
      passed: failedTests === 0,
      tests,
      overall: {
        totalTests,
        passedTests,
        failedTests,
        successRate: totalTests > 0 ? passedTests / totalTests : 1
      },
      errors,
      timestamp: new Date()
    };
  }

  private validateComponentDependencies(): {
    passed: boolean;
    duration: number;
    details: any;
    errors: ValidationError[];
  } {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    const dependencies = {
      trackEditsIntegrationManager: trackEditsIntegrationManager !== undefined,
      aiProvidersIntegrationManager: aiProvidersIntegrationManager !== undefined,
      sessionLearningManager: sessionLearningManager !== undefined,
      feedbackProcessor: feedbackProcessor !== undefined,
      performanceMonitoringManager: performanceMonitoringManager !== undefined,
      functionPriorityManager: functionPriorityManager !== undefined,
      resourceManager: resourceManager !== undefined,
      functionSelector: functionSelector !== undefined
    };

    const missing = Object.entries(dependencies)
      .filter(([_, available]) => !available)
      .map(([name, _]) => name);

    if (missing.length > 0) {
      errors.push({
        component: 'integrations',
        test: 'Component Dependencies',
        message: `Missing components: ${missing.join(', ')}`,
        severity: 'critical',
        timestamp: new Date()
      });
    }

    return {
      passed: missing.length === 0,
      duration: Date.now() - startTime,
      details: { dependencies, missing },
      errors
    };
  }

  private createErrorResult(component: string, error: Error): ValidationResult {
    return {
      component,
      passed: false,
      tests: [],
      overall: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 1,
        successRate: 0
      },
      errors: [{
        component,
        test: 'initialization',
        message: error.message,
        severity: 'critical',
        timestamp: new Date()
      }],
      timestamp: new Date()
    };
  }

  private logValidationSummary(results: Map<string, ValidationResult>): void {
    console.log('\n[IntegrationValidator] Validation Summary:');
    console.log('='.repeat(50));

    let totalPassed = 0;
    let totalFailed = 0;
    let criticalErrors = 0;

    results.forEach((result, component) => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      const rate = (result.overall.successRate * 100).toFixed(1);
      
      console.log(`${status} ${component}: ${result.overall.passedTests}/${result.overall.totalTests} tests (${rate}%)`);
      
      totalPassed += result.overall.passedTests;
      totalFailed += result.overall.failedTests;
      criticalErrors += result.errors.filter(e => e.severity === 'critical').length;
      
      if (!result.passed) {
        result.errors.forEach(error => {
          console.log(`   🔸 ${error.test}: ${error.message}`);
        });
      }
    });

    console.log('='.repeat(50));
    const overallRate = totalPassed + totalFailed > 0 ? (totalPassed / (totalPassed + totalFailed) * 100).toFixed(1) : '100.0';
    console.log(`Overall: ${totalPassed}/${totalPassed + totalFailed} tests passed (${overallRate}%)`);
    
    if (criticalErrors > 0) {
      console.log(`⚠️  ${criticalErrors} critical errors found`);
    }
    
    console.log('='.repeat(50));
  }

  dispose(): void {
    this.stopContinuousValidation();
  }
}

// Helper interfaces
interface TestSuite {
  name: string;
  tests: Test[];
}

interface Test {
  name: string;
  execute: () => Promise<boolean>;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  getDetails?: () => any;
  getErrorMessage?: () => string;
}

// Export singleton instance
export const integrationValidator = new IntegrationValidator();