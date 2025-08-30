#!/usr/bin/env node

/**
 * Task 3: Track Edits Change Detection Validation Runner
 * 
 * This script executes comprehensive validation tests for Track Edits change detection system.
 * Tests the Million Monkeys Typing approach for granular change detection.
 * 
 * Usage:
 *   node run-change-detection-validation.js [test-type]
 * 
 * Test types:
 *   - full (default): Run complete validation suite
 *   - sequential: Test sequential change detection
 *   - timing: Test timing configurations
 *   - granular: Test granular decorations
 *   - size: Test document size consistency
 *   - interface: Test accept/reject interface
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  outputDir: path.join(__dirname, '.agent-os', 'test-sessions', `validation-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`),
  testTimeout: 30000, // 30 seconds
  obsidianPath: null, // Will be detected or provided
  vaultPath: path.join(__dirname, 'test-automation', 'scenarios'),
  enableDebugMode: process.env.DEBUG === 'true'
};

// Ensure output directory exists
if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

console.log('🚀 Track Edits Change Detection Validation');
console.log('==========================================');
console.log(`Output Directory: ${CONFIG.outputDir}`);
console.log(`Test Type: ${process.argv[2] || 'full'}`);
console.log(`Debug Mode: ${CONFIG.enableDebugMode}`);
console.log('');

/**
 * Create test injection script for Obsidian
 */
function createTestInjectionScript(testType = 'full') {
  const injectionScript = `
/**
 * Track Edits Change Detection Validation - Injection Script
 * Generated: ${new Date().toISOString()}
 */

(function() {
  'use strict';
  
  console.log('[ChangeDetectionValidation] Starting validation injection...');
  
  // Wait for plugins to load
  function waitForPlugins() {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 30;
      
      const checkPlugins = () => {
        attempts++;
        
        if (attempts > maxAttempts) {
          reject(new Error('Timeout waiting for plugins to load'));
          return;
        }
        
        const app = window.app;
        if (!app || !app.plugins) {
          setTimeout(checkPlugins, 1000);
          return;
        }
        
        const trackEditsPlugin = app.plugins.plugins['track-edits'];
        if (!trackEditsPlugin) {
          console.log(\`[ChangeDetectionValidation] Waiting for Track Edits plugin... (attempt \${attempts})\`);
          setTimeout(checkPlugins, 1000);
          return;
        }
        
        console.log('[ChangeDetectionValidation] Track Edits plugin found');
        resolve(trackEditsPlugin);
      };
      
      checkPlugins();
    });
  }
  
  // Run validation tests
  async function runValidationTests(testType) {
    try {
      const app = window.app;
      const trackEditsPlugin = await waitForPlugins();
      
      console.log('[ChangeDetectionValidation] Initializing validation environment...');
      
      // Ensure Track Edits is active
      if (!trackEditsPlugin.currentSession) {
        console.log('[ChangeDetectionValidation] Starting Track Edits session...');
        trackEditsPlugin.startTracking();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Get testing suite
      const testingSuite = window.WriterrlAPI?.trackEdits?.testingSuite || 
                          (await import('./src/testing/index.ts')).getGlobalTestingSuite();
      
      if (!testingSuite) {
        throw new Error('Testing suite not available');
      }
      
      console.log(\`[ChangeDetectionValidation] Running \${testType} validation tests...\`);
      
      // Initialize enhanced test runner
      const EnhancedTestRunner = (await import('./src/testing/index.ts')).EnhancedTrackEditsTestRunner;
      const testRunner = new EnhancedTestRunner();
      
      let results;
      
      if (testType === 'full') {
        results = await testRunner.runTask3ValidationSuite({
          outputDir: '${CONFIG.outputDir}',
          debugMode: ${CONFIG.enableDebugMode}
        });
      } else {
        results = await testRunner.runQuickValidation(testType);
      }
      
      // Display results
      console.log('\\n🎯 VALIDATION RESULTS');
      console.log('=====================');
      
      if (results.success) {
        console.log('✅ Overall Status: PASSED');
      } else {
        console.log('❌ Overall Status: FAILED');
        if (results.error) {
          console.log(\`❌ Error: \${results.error}\`);
        }
      }
      
      if (results.validationResults) {
        const summary = results.validationResults.summary;
        console.log(\`📊 Tests: \${summary.totalTests} total, \${summary.passedTests} passed, \${summary.failedTests} failed\`);
        console.log(\`⚠️  Critical Issues: \${summary.criticalIssues}\`);
        
        if (results.validationResults.recommendations.length > 0) {
          console.log('\\n💡 RECOMMENDATIONS');
          console.log('==================');
          results.validationResults.recommendations.forEach((rec, i) => {
            console.log(\`\${i + 1}. \${rec}\`);
          });
        }
        
        // Show individual test results
        console.log('\\n📋 DETAILED RESULTS');
        console.log('===================');
        results.validationResults.results.forEach(result => {
          const status = result.passed ? '✅' : '❌';
          const accuracy = result.detectionAccuracy ? 
            \` (accuracy: \${(result.detectionAccuracy * 100).toFixed(1)}%)\` : '';
          console.log(\`\${status} \${result.name}\${accuracy}\`);
          
          if (!result.passed && result.issues.length > 0) {
            result.issues.forEach(issue => {
              console.log(\`    ⚠️  \${issue.description}\`);
            });
          }
        });
      }
      
      if (results.reportPath) {
        console.log(\`\\n📄 Report: \${results.reportPath}\`);
      }
      
      // Save results to file
      const resultFile = path.join('${CONFIG.outputDir}', 'validation-results.json');
      try {
        require('fs').writeFileSync(resultFile, JSON.stringify(results, null, 2));
        console.log(\`💾 Results saved: \${resultFile}\`);
      } catch (saveError) {
        console.error('❌ Failed to save results:', saveError.message);
      }
      
      console.log('\\n🏁 Validation Complete');
      
      return results;
      
    } catch (error) {
      console.error('❌ Validation failed:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Start validation
  const testType = '${testType}';
  runValidationTests(testType).then(results => {
    console.log(\`[ChangeDetectionValidation] Validation completed with status: \${results.success ? 'SUCCESS' : 'FAILED'}\`);
    
    // Signal completion for automation
    window.trackEditsValidationComplete = {
      timestamp: Date.now(),
      results,
      testType
    };
    
  }).catch(error => {
    console.error('[ChangeDetectionValidation] Validation error:', error);
    window.trackEditsValidationComplete = {
      timestamp: Date.now(),
      results: { success: false, error: error.message },
      testType
    };
  });
  
})();
`;

  const scriptPath = path.join(CONFIG.outputDir, 'validation-injection.js');
  fs.writeFileSync(scriptPath, injectionScript);
  return scriptPath;
}

/**
 * Create Obsidian configuration for testing
 */
function createObsidianConfig() {
  const configDir = path.join(CONFIG.outputDir, 'obsidian-config');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir);
  }

  const appConfig = {
    "enabledPlugins": ["track-edits", "editorial-engine", "writerr-chat"],
    "theme": "obsidian",
    "translucency": false,
    "cssTheme": "",
    "baseFontSize": 16,
    "showLineNumber": false,
    "rightToLeft": false,
    "readableLineLength": true,
    "strictLineBreaks": false,
    "showFrontmatter": true,
    "showIndentGuide": true,
    "showInlineTitle": true
  };

  fs.writeFileSync(
    path.join(configDir, 'app.json'),
    JSON.stringify(appConfig, null, 2)
  );

  return configDir;
}

/**
 * Main execution function
 */
async function main() {
  const testType = process.argv[2] || 'full';
  
  console.log(`🔧 Preparing validation environment...`);
  
  // Create test configuration
  const configDir = createObsidianConfig();
  console.log(`📁 Obsidian config: ${configDir}`);
  
  // Create injection script
  const injectionScript = createTestInjectionScript(testType);
  console.log(`🔌 Injection script: ${injectionScript}`);
  
  // Create test summary
  const testConfig = {
    testType,
    timestamp: new Date().toISOString(),
    outputDir: CONFIG.outputDir,
    configDir,
    injectionScript,
    debugMode: CONFIG.enableDebugMode
  };
  
  fs.writeFileSync(
    path.join(CONFIG.outputDir, 'test-config.json'),
    JSON.stringify(testConfig, null, 2)
  );
  
  console.log('');
  console.log('🚀 READY TO RUN VALIDATION');
  console.log('==========================');
  console.log('');
  console.log('To run the validation:');
  console.log('1. Open Obsidian with Track Edits plugin enabled');
  console.log('2. Open Developer Tools (Cmd/Ctrl + Shift + I)');
  console.log('3. Go to Console tab');
  console.log(`4. Load and run the injection script:`);
  console.log('');
  console.log('   // Copy and paste this into the console:');
  console.log(`   fetch('file://${injectionScript}')`);
  console.log('     .then(response => response.text())');
  console.log('     .then(script => eval(script));');
  console.log('');
  console.log('Or alternatively, copy the contents of:');
  console.log(`   ${injectionScript}`);
  console.log('');
  console.log('And paste directly into the console.');
  console.log('');
  console.log('📊 Results will be displayed in the console and saved to:');
  console.log(`   ${CONFIG.outputDir}`);
  console.log('');
  
  // For automated testing environments
  if (process.env.AUTOMATED === 'true') {
    console.log('🤖 Automated mode detected - launching validation...');
    
    try {
      // Here you could integrate with Obsidian automation tools
      // For now, we'll create the necessary files and instructions
      
      const automationInstructions = `
# Automated Track Edits Change Detection Validation

## Test Configuration
- Test Type: ${testType}
- Output Directory: ${CONFIG.outputDir}
- Debug Mode: ${CONFIG.enableDebugMode}

## Files Created
- Test Config: ${path.join(CONFIG.outputDir, 'test-config.json')}
- Injection Script: ${injectionScript}
- Obsidian Config: ${configDir}

## Validation Steps
The validation tests will check:
1. Sequential change detection accuracy
2. Timing configuration optimization (1ms, 5ms, 10ms, 25ms, 50ms)
3. Granular decoration creation for different change types
4. Document size consistency (100, 1K, 5K, 10K characters)
5. Accept/reject interface functionality

## Expected Results
- All tests should pass for proper Million Monkeys Typing implementation
- Optimal timing should be identified for change detection
- Granular decorations should appear for individual changes
- Accept/reject functionality should work correctly

## Next Steps
Execute the validation by running the injection script in Obsidian's Developer Console.
`;
      
      fs.writeFileSync(
        path.join(CONFIG.outputDir, 'automation-instructions.md'),
        automationInstructions
      );
      
      console.log('✅ Automation files prepared successfully');
      
    } catch (error) {
      console.error('❌ Automation setup failed:', error.message);
      process.exit(1);
    }
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Validation interrupted by user');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error.message);
  process.exit(1);
});

// Run main function
main().catch(error => {
  console.error('❌ Validation setup failed:', error.message);
  process.exit(1);
});