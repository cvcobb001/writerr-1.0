
      console.log('[TestRunner] Test automation code injected');
      
      // Load test configuration
      const testConfig = {"sessionId":"test_1756504284614","outputDir":".agent-os/test-sessions/2025-08-29_14-44-59","testMode":true};
      
      // Global test utilities
      window.TrackEditsTestUtils = {
        config: testConfig,
        startTime: Date.now(),
        results: [],
        
        log: function(level, message, data) {
          const entry = {
            timestamp: Date.now(),
            level: level,
            message: message,
            data: data || {}
          };
          
          this.results.push(entry);
          console.log('[TrackEditsTest]', level, message, data);
        },
        
        simulateUserAction: async function(action, params) {
          this.log('INFO', 'Simulating user action', { action, params });
          
          switch(action) {
            case 'toggleRibbon':
              return this.toggleRibbonIcon();
            case 'typeText':
              return this.typeText(params.text);
            case 'waitForState':
              return this.waitForState(params.condition, params.timeout);
            default:
              throw new Error('Unknown action: ' + action);
          }
        },
        
        toggleRibbonIcon: function() {
          const ribbonIcon = document.querySelector('[aria-label*="Track Edits"]');
          if (ribbonIcon) {
            ribbonIcon.click();
            this.log('INFO', 'Clicked ribbon icon');
            return true;
          } else {
            this.log('ERROR', 'Ribbon icon not found');
            return false;
          }
        },
        
        typeText: async function(text) {
          const activeView = app.workspace.getActiveViewOfType(MarkdownView);
          if (!activeView) {
            this.log('ERROR', 'No active markdown view');
            return false;
          }
          
          this.log('INFO', 'Typing text', { text });
          
          // Simulate typing character by character
          for (const char of text) {
            activeView.editor.replaceSelection(char);
            await new Promise(resolve => setTimeout(resolve, 50)); // Small delay between characters
          }
          
          return true;
        },
        
        waitForState: async function(conditionFn, timeout = 5000) {
          const startTime = Date.now();
          
          while (Date.now() - startTime < timeout) {
            if (conditionFn()) {
              return true;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          return false;
        },
        
        captureCurrentState: function() {
          const state = {
            timestamp: Date.now(),
            sidePanelVisible: !!document.querySelector('.workspace-leaf-content[data-type="track-edits-side-panel"]'),
            ribbonState: this.getRibbonState(),
            editHighlights: this.getEditHighlights(),
            documentContent: this.getDocumentContent()
          };
          
          this.log('INFO', 'Captured visual state', state);
          return state;
        },
        
        getRibbonState: function() {
          const ribbonIcon = document.querySelector('[aria-label*="Track Edits"]');
          if (!ribbonIcon) return 'not-found';
          
          const label = ribbonIcon.getAttribute('aria-label') || '';
          return label.includes('ON') ? 'active' : 'inactive';
        },
        
        getEditHighlights: function() {
          const highlights = [];
          document.querySelectorAll('.track-edits-decoration').forEach(el => {
            highlights.push({
              type: el.classList.contains('track-edits-decoration-insert') ? 'insert' : 'delete',
              text: el.textContent || '',
              editId: el.getAttribute('data-edit-id')
            });
          });
          return highlights;
        },
        
        getDocumentContent: function() {
          const activeView = app.workspace.getActiveViewOfType(MarkdownView);
          return activeView ? activeView.editor.getValue() : '';
        }
      };
      
      // Signal that test utilities are ready
      window.TrackEditsTestUtils.log('INFO', 'Test utilities initialized', testConfig);
    