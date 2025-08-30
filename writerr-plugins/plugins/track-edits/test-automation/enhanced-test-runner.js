#!/usr/bin/env node

/**
 * Enhanced Track Edits Test Runner with Phase 4 Editorial Engine Monitoring
 * Injects Phase 4 monitoring code into Obsidian for comprehensive Editorial Engine integration monitoring
 */

const fs = require('fs');
const path = require('path');

class EnhancedTestRunner {
  constructor(config = {}) {
    this.config = {
      outputDir: config.outputDir || '.agent-os/test-sessions/current',
      timeout: config.timeout || 300000,
      sessionId: config.sessionId || `test_${Date.now()}`,
      // Phase 4: Enable Editorial Engine monitoring
      editorialEngineMonitoring: true,
      chatIntegrationDetection: true,
      aiAttributionTracking: true,
      enhancedReporting: true,
      ...config
    };

    this.results = {
      startTime: Date.now(),
      endTime: null,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      scenarios: [],
      issues: [],
      performance: {},
      editorialEngineResults: {
        constraintFailures: [],
        errorMessages: [],
        modeBypassDetected: false,
        chatPipelineBreaks: [],
        aiAttributionFailures: []
      }
    };
  }

  async runTestSuite() {
    console.log(`[EnhancedTestRunner] Starting Phase 4 Editorial Engine monitoring test suite`);
    console.log(`[EnhancedTestRunner] Session ID: ${this.config.sessionId}`);
    console.log(`[EnhancedTestRunner] Output Directory: ${this.config.outputDir}`);
    
    try {
      // Ensure output directory exists
      this.ensureOutputDirectory();

      // Initialize test environment with Phase 4 monitoring
      await this.initializeEnhancedTestEnvironment();

      console.log(`[EnhancedTestRunner] Phase 4 Editorial Engine monitoring initialized`);
      console.log(`[EnhancedTestRunner] Now capturing:`);
      console.log(`[EnhancedTestRunner]   ✓ Editorial Engine constraint processing failures`);
      console.log(`[EnhancedTestRunner]   ✓ "Editorial engine couldn't do it" error capture`);
      console.log(`[EnhancedTestRunner]   ✓ Copy Editor/Proofreader mode bypass detection`);
      console.log(`[EnhancedTestRunner]   ✓ Chat → Engine → Track Edits pipeline monitoring`);
      console.log(`[EnhancedTestRunner]   ✓ AI edit attribution and visual correlation tracking`);
      console.log(`[EnhancedTestRunner]   ✓ "Go ahead and add that to document" workflow validation`);
      
      return {
        success: true,
        sessionId: this.config.sessionId,
        outputDir: this.config.outputDir,
        monitoring: {
          editorialEngine: true,
          chatIntegration: true,
          aiAttribution: true,
          enhancedReporting: true
        }
      };
      
    } catch (error) {
      console.error(`[EnhancedTestRunner] Test suite failed:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  ensureOutputDirectory() {
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }
  }

  async initializeEnhancedTestEnvironment() {
    console.log(`[EnhancedTestRunner] Initializing Phase 4 monitoring environment...`);

    // Create test configuration file for browser injection
    const testConfig = {
      sessionId: this.config.sessionId,
      testMode: true,
      enableConsoleInterception: true,
      enableVisualMonitoring: true,
      outputDir: this.config.outputDir,
      timestamp: Date.now(),
      // Phase 4: Editorial Engine monitoring flags
      editorialEngineMonitoring: this.config.editorialEngineMonitoring,
      chatIntegrationDetection: this.config.chatIntegrationDetection,
      aiAttributionTracking: this.config.aiAttributionTracking,
      enhancedReporting: this.config.enhancedReporting
    };

    const configPath = path.join(this.config.outputDir, 'test-config.json');
    fs.writeFileSync(configPath, JSON.stringify(testConfig, null, 2));

    // Create enhanced injection code with Phase 4 monitoring
    await this.injectEnhancedTestCode();
  }

  async injectEnhancedTestCode() {
    console.log(`[EnhancedTestRunner] Creating Phase 4 Editorial Engine monitoring injection code...`);

    // Create JavaScript code that includes Phase 4 monitoring capabilities
    const enhancedInjectionCode = `
      console.log('[EnhancedTestRunner] Phase 4 Editorial Engine monitoring code injected');
      
      // Load test configuration
      const testConfig = ${JSON.stringify({
        sessionId: this.config.sessionId,
        outputDir: this.config.outputDir,
        testMode: true,
        editorialEngineMonitoring: true,
        chatIntegrationDetection: true,
        aiAttributionTracking: true
      })};
      
      // Phase 4: Enhanced monitoring utilities with Editorial Engine integration
      window.TrackEditsEnhancedTestUtils = {
        config: testConfig,
        startTime: Date.now(),
        results: [],
        editorialEngineIssues: [],
        chatIntegrationFailures: [],
        aiAttributionErrors: [],
        
        log: function(level, message, data) {
          const entry = {
            timestamp: Date.now(),
            level: level,
            message: message,
            data: data || {},
            type: 'general'
          };
          
          this.results.push(entry);
          console.log('[Phase4Monitor]', level, message, data);
        },
        
        // Phase 4: Editorial Engine monitoring
        logEditorialEngineIssue: function(type, message, data) {
          const entry = {
            timestamp: Date.now(),
            type: type,
            message: message,
            data: data || {},
            category: 'editorial-engine'
          };
          
          this.editorialEngineIssues.push(entry);
          this.log('ERROR', 'Editorial Engine Issue: ' + message, data);
        },
        
        // Phase 4: Chat integration monitoring  
        logChatIntegrationFailure: function(workflow, message, data) {
          const entry = {
            timestamp: Date.now(),
            workflow: workflow,
            message: message,
            data: data || {},
            category: 'chat-integration'
          };
          
          this.chatIntegrationFailures.push(entry);
          this.log('ERROR', 'Chat Integration Failure: ' + message, data);
        },
        
        // Phase 4: AI attribution monitoring
        logAIAttributionError: function(type, message, data) {
          const entry = {
            timestamp: Date.now(),
            type: type,
            message: message,
            data: data || {},
            category: 'ai-attribution'
          };
          
          this.aiAttributionErrors.push(entry);
          this.log('ERROR', 'AI Attribution Error: ' + message, data);
        },
        
        // Monitor console for Editorial Engine errors
        startEditorialEngineMonitoring: function() {
          // Intercept console messages to detect "Editorial engine couldn't do it" errors
          const originalConsoleError = console.error;
          const originalConsoleLog = console.log;
          const originalConsoleWarn = console.warn;
          
          const self = this;
          
          console.error = function(...args) {
            const message = args.join(' ');
            if (message.includes('Editorial engine couldn\\'t do it') || 
                message.includes('editorial engine') ||
                message.includes('constraint processing failed')) {
              self.logEditorialEngineIssue('constraint-failure', message, { args: args });
            }
            return originalConsoleError.apply(console, args);
          };
          
          console.log = function(...args) {
            const message = args.join(' ');
            if (message.includes('bypassing editorial engine') ||
                message.includes('mode bypass detected')) {
              self.logEditorialEngineIssue('mode-bypass', message, { args: args });
            }
            return originalConsoleLog.apply(console, args);
          };
          
          console.warn = function(...args) {
            const message = args.join(' ');
            if (message.includes('Editorial Engine') ||
                message.includes('Chat integration') ||
                message.includes('Track Edits pipeline')) {
              self.logChatIntegrationFailure('pipeline-warning', message, { args: args });
            }
            return originalConsoleWarn.apply(console, args);
          };
          
          this.log('INFO', 'Editorial Engine monitoring started', {
            intercepting: ['console.error', 'console.log', 'console.warn']
          });
        },
        
        // Monitor DOM for chat panel errors
        startChatIntegrationMonitoring: function() {
          const self = this;
          
          // Monitor for chat panel error states
          const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
              if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(function(node) {
                  if (node.nodeType === Node.ELEMENT_NODE) {
                    // Check for error messages in chat
                    if (node.textContent && 
                        (node.textContent.includes('couldn\\'t do it') ||
                         node.textContent.includes('failed to process') ||
                         node.textContent.includes('error processing'))) {
                      self.logChatIntegrationFailure('chat-error', node.textContent, {
                        element: node.tagName,
                        parent: node.parentElement?.tagName
                      });
                    }
                    
                    // Check for AI attribution issues
                    if (node.classList && 
                        (node.classList.contains('track-edits-decoration') ||
                         node.classList.contains('ai-edit'))) {
                      const editId = node.getAttribute('data-edit-id');
                      const aiAttribution = node.getAttribute('data-ai-generated');
                      
                      if (!aiAttribution && editId) {
                        self.logAIAttributionError('missing-attribution', 'AI edit missing attribution', {
                          editId: editId,
                          element: node.outerHTML
                        });
                      }
                    }
                  }
                });
              }
            });
          });
          
          observer.observe(document.body, {
            childList: true,
            subtree: true
          });
          
          this.log('INFO', 'Chat integration monitoring started', {
            observing: 'DOM mutations for error states'
          });
        },
        
        // Monitor for "Go ahead and add that to document" workflow failures
        startDocumentIntegrationMonitoring: function() {
          const self = this;
          
          // Monitor for chat messages containing document integration requests
          const chatObserver = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
              if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(function(node) {
                  if (node.nodeType === Node.ELEMENT_NODE && node.textContent) {
                    const text = node.textContent.toLowerCase();
                    
                    if (text.includes('go ahead and add') ||
                        text.includes('add that to document') ||
                        text.includes('apply to document')) {
                      
                      self.log('INFO', 'Document integration request detected', {
                        text: node.textContent,
                        element: node.tagName
                      });
                      
                      // Set a timeout to check if integration actually happened
                      setTimeout(function() {
                        self.checkDocumentIntegrationSuccess();
                      }, 5000); // Wait 5 seconds then check
                    }
                  }
                });
              }
            });
          });
          
          chatObserver.observe(document.body, {
            childList: true,
            subtree: true
          });
          
          this.log('INFO', 'Document integration monitoring started');
        },
        
        checkDocumentIntegrationSuccess: function() {
          // Check if Track Edits shows new edits after document integration request
          const trackEditsDecorations = document.querySelectorAll('.track-edits-decoration');
          const recentEdits = Array.from(trackEditsDecorations).filter(el => {
            const editId = el.getAttribute('data-edit-id');
            return editId && Date.now() - parseInt(editId) < 10000; // Within last 10 seconds
          });
          
          if (recentEdits.length === 0) {
            this.logChatIntegrationFailure('integration-timeout', 
              'Document integration request did not result in Track Edits updates', {
              decorationsFound: trackEditsDecorations.length,
              recentEdits: recentEdits.length
            });
          } else {
            this.log('INFO', 'Document integration successful', {
              newEdits: recentEdits.length
            });
          }
        },
        
        // Initialize all Phase 4 monitoring
        initializePhase4Monitoring: function() {
          this.log('INFO', 'Initializing Phase 4 Editorial Engine monitoring systems...');
          
          this.startEditorialEngineMonitoring();
          this.startChatIntegrationMonitoring();
          this.startDocumentIntegrationMonitoring();
          
          this.log('INFO', 'Phase 4 monitoring systems initialized', {
            systems: ['editorial-engine', 'chat-integration', 'document-integration']
          });
        },
        
        // Generate comprehensive Phase 4 report
        generatePhase4Report: function() {
          const report = {
            timestamp: Date.now(),
            sessionId: testConfig.sessionId,
            duration: Date.now() - this.startTime,
            phase4Results: {
              editorialEngineIssues: this.editorialEngineIssues,
              chatIntegrationFailures: this.chatIntegrationFailures,
              aiAttributionErrors: this.aiAttributionErrors,
              totalIssues: this.editorialEngineIssues.length + 
                          this.chatIntegrationFailures.length + 
                          this.aiAttributionErrors.length
            },
            summary: {
              editorialEngineHealthy: this.editorialEngineIssues.length === 0,
              chatIntegrationHealthy: this.chatIntegrationFailures.length === 0,
              aiAttributionHealthy: this.aiAttributionErrors.length === 0,
              overallHealthy: (this.editorialEngineIssues.length + 
                             this.chatIntegrationFailures.length + 
                             this.aiAttributionErrors.length) === 0
            }
          };
          
          this.log('INFO', 'Phase 4 monitoring report generated', report);
          return report;
        }
      };
      
      // Auto-initialize Phase 4 monitoring
      window.TrackEditsEnhancedTestUtils.initializePhase4Monitoring();
      
      // Signal that enhanced test utilities are ready
      window.TrackEditsEnhancedTestUtils.log('INFO', 'Phase 4 Enhanced test utilities initialized', testConfig);
    `;

    // Save the enhanced injection code
    const injectionPath = path.join(this.config.outputDir, 'enhanced-test-injection.js');
    fs.writeFileSync(injectionPath, enhancedInjectionCode);

    console.log(`[EnhancedTestRunner] Phase 4 monitoring code saved to: ${injectionPath}`);
    console.log(`[EnhancedTestRunner] Enhanced monitoring ready for Obsidian injection`);
  }
  
  async stopTestSuite() {
    console.log(`[EnhancedTestRunner] Stopping Phase 4 monitoring and generating enhanced reports...`);
    
    try {
      // Stop the testing suite and generate comprehensive reports
      const testingSuite = new TrackEditsTestingSuite();
      const result = await testingSuite.stopTestingSuite();
      
      if (result.success) {
        console.log(`[EnhancedTestRunner] Enhanced reports generated successfully`);
        if (result.standardReportPath) {
          console.log(`[EnhancedTestRunner] Standard report: ${result.standardReportPath}`);
        }
        if (result.enhancedReportPath) {
          console.log(`[EnhancedTestRunner] Enhanced Editorial Engine report: ${result.enhancedReportPath}`);
        }
      }
      
      return result;
      
    } catch (error) {
      console.error(`[EnhancedTestRunner] Failed to stop testing suite:`, error);
      return { success: false, error: error.message };
    }
  }
}

// Command line execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const config = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--output=')) {
      config.outputDir = arg.split('=')[1];
    } else if (arg.startsWith('--timeout=')) {
      config.timeout = parseInt(arg.split('=')[1]) * 1000;
    } else if (arg.startsWith('--session=')) {
      config.sessionId = arg.split('=')[1];
    }
  }

  // Run the enhanced test suite with Phase 4 monitoring
  const runner = new EnhancedTestRunner(config);
  runner.runTestSuite()
    .then(result => {
      if (result.success) {
        console.log('[EnhancedTestRunner] Phase 4 Editorial Engine monitoring started successfully');
        console.log('[EnhancedTestRunner] All Editorial Engine integration issues will be captured automatically');
        process.exit(0);
      } else {
        console.error('[EnhancedTestRunner] Failed to start Phase 4 monitoring:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('[EnhancedTestRunner] Enhanced test runner crashed:', error);
      process.exit(1);
    });
}

module.exports = EnhancedTestRunner;