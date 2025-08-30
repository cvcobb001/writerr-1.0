
      console.log('[EnhancedTestRunner] Phase 4 Editorial Engine monitoring code injected');
      
      // Load test configuration
      const testConfig = {"sessionId":"test_1756505167070","outputDir":".agent-os/test-sessions/2025-08-29_14-59-21","testMode":true,"editorialEngineMonitoring":true,"chatIntegrationDetection":true,"aiAttributionTracking":true};
      
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
            if (message.includes('Editorial engine couldn\'t do it') || 
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
                        (node.textContent.includes('couldn\'t do it') ||
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
    