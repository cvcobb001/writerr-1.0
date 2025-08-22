#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Health Check Script
 * Tests plugin loading and validates integration for Writerr plugins
 */

class HealthChecker {
  constructor() {
    this.projectRoot = process.cwd();
    this.pluginsDir = path.join(this.projectRoot, 'plugins');
    this.issues = [];
    this.checks = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const colors = {
      info: '\x1b[36m',    // cyan
      success: '\x1b[32m', // green
      warning: '\x1b[33m', // yellow
      error: '\x1b[31m',   // red
      reset: '\x1b[0m'     // reset
    };
    
    console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
  }

  addIssue(severity, plugin, message, fix = null) {
    this.issues.push({ severity, plugin, message, fix });
    this.log(`${severity === 'error' ? '❌' : '⚠️'} ${plugin}: ${message}`, severity);
  }

  addCheck(plugin, message) {
    this.checks.push({ plugin, message });
    this.log(`✅ ${plugin}: ${message}`, 'success');
  }

  /**
   * Check if Node.js and npm are properly configured
   */
  checkEnvironment() {
    this.log('🔍 Checking development environment...', 'info');

    try {
      const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
      const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
      
      this.addCheck('Environment', `Node.js ${nodeVersion}, npm ${npmVersion}`);
      
      // Check Node.js version compatibility
      const nodeVersionNumber = parseInt(nodeVersion.substring(1).split('.')[0]);
      if (nodeVersionNumber < 16) {
        this.addIssue('error', 'Environment', 
          `Node.js ${nodeVersion} is below minimum required version 16.x`,
          'Update Node.js to version 16 or higher'
        );
      }

    } catch (error) {
      this.addIssue('error', 'Environment', 
        'Node.js or npm not found',
        'Install Node.js and npm'
      );
    }
  }

  /**
   * Check project dependencies
   */
  checkDependencies() {
    this.log('📦 Checking project dependencies...', 'info');

    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      this.addIssue('error', 'Dependencies', 'package.json not found');
      return;
    }

    const nodeModulesPath = path.join(this.projectRoot, 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      this.addIssue('error', 'Dependencies', 
        'node_modules directory not found',
        'Run: npm install'
      );
      return;
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const devDependencies = packageJson.devDependencies || {};

      // Check critical dependencies
      const criticalDeps = [
        'typescript',
        'esbuild', 
        'obsidian'
      ];

      for (const dep of criticalDeps) {
        const depPath = path.join(nodeModulesPath, dep);
        if (fs.existsSync(depPath)) {
          this.addCheck('Dependencies', `${dep} is installed`);
        } else {
          this.addIssue('error', 'Dependencies', 
            `Missing critical dependency: ${dep}`,
            'Run: npm install'
          );
        }
      }

    } catch (error) {
      this.addIssue('error', 'Dependencies', 
        `Error reading package.json: ${error.message}`
      );
    }
  }

  /**
   * Test TypeScript compilation
   */
  checkTypeScriptCompilation() {
    this.log('📝 Checking TypeScript compilation...', 'info');

    try {
      // Run TypeScript compiler check
      execSync('npm run typecheck', { 
        stdio: 'pipe',
        cwd: this.projectRoot 
      });
      
      this.addCheck('TypeScript', 'All source files compile without errors');
      
    } catch (error) {
      const output = error.stdout ? error.stdout.toString() : error.message;
      this.addIssue('error', 'TypeScript', 
        'Compilation errors detected',
        'Fix TypeScript errors and run: npm run typecheck'
      );
      
      // Log compilation errors for debugging
      if (output && output.length < 1000) {
        this.log(`Compilation output: ${output}`, 'info');
      }
    }
  }

  /**
   * Test plugin builds
   */
  checkPluginBuilds() {
    this.log('🔨 Testing plugin builds...', 'info');

    const plugins = fs.readdirSync(this.pluginsDir, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);

    for (const plugin of plugins) {
      try {
        // Test individual plugin build
        execSync(`npm run build:${plugin}`, { 
          stdio: 'pipe',
          cwd: this.projectRoot 
        });
        
        // Verify build output exists
        const mainJsPath = path.join(this.pluginsDir, plugin, 'main.js');
        if (fs.existsSync(mainJsPath)) {
          const stats = fs.statSync(mainJsPath);
          if (stats.size > 0) {
            this.addCheck(plugin, `Build successful (${Math.round(stats.size / 1024)}KB)`);
          } else {
            this.addIssue('error', plugin, 'Build output is empty');
          }
        } else {
          this.addIssue('error', plugin, 'Build output main.js not found');
        }

      } catch (error) {
        this.addIssue('error', plugin, 
          'Build failed',
          `Check build configuration for ${plugin}`
        );
      }
    }
  }

  /**
   * Simulate plugin loading test
   */
  checkPluginLoading() {
    this.log('🔌 Testing plugin loading simulation...', 'info');

    const plugins = fs.readdirSync(this.pluginsDir, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);

    for (const plugin of plugins) {
      const mainJsPath = path.join(this.pluginsDir, plugin, 'main.js');
      const manifestPath = path.join(this.pluginsDir, plugin, 'manifest.json');
      
      if (!fs.existsSync(mainJsPath) || !fs.existsSync(manifestPath)) {
        continue; // Already checked in other tests
      }

      try {
        // Read and parse manifest
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        
        // Basic manifest validation
        if (!manifest.id || !manifest.name || !manifest.version) {
          this.addIssue('error', plugin, 'Manifest missing required fields');
          continue;
        }

        // Read built JavaScript
        const jsContent = fs.readFileSync(mainJsPath, 'utf8');
        
        // Check for basic Obsidian plugin patterns
        const requiredPatterns = [
          /Plugin/,
          /onload/i,
          /exports/
        ];

        let missingPatterns = [];
        for (const pattern of requiredPatterns) {
          if (!pattern.test(jsContent)) {
            missingPatterns.push(pattern.toString());
          }
        }

        if (missingPatterns.length === 0) {
          this.addCheck(plugin, 'Plugin loading patterns present');
        } else {
          this.addIssue('warning', plugin, 
            `Missing some plugin patterns: ${missingPatterns.join(', ')}`
          );
        }

        // Check for syntax errors by attempting to parse as JavaScript
        try {
          new Function(jsContent);
          this.addCheck(plugin, 'JavaScript syntax is valid');
        } catch (syntaxError) {
          this.addIssue('error', plugin, 
            `JavaScript syntax error: ${syntaxError.message}`,
            'Check build output for errors'
          );
        }

      } catch (error) {
        this.addIssue('error', plugin, 
          `Plugin loading test failed: ${error.message}`
        );
      }
    }
  }

  /**
   * Check for common integration issues
   */
  checkIntegrationIssues() {
    this.log('🔗 Checking for integration issues...', 'info');

    const plugins = fs.readdirSync(this.pluginsDir, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);

    // Check for duplicate plugin IDs
    const pluginIds = new Set();
    const duplicateIds = [];

    for (const plugin of plugins) {
      const manifestPath = path.join(this.pluginsDir, plugin, 'manifest.json');
      
      if (fs.existsSync(manifestPath)) {
        try {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          
          if (pluginIds.has(manifest.id)) {
            duplicateIds.push(manifest.id);
          } else {
            pluginIds.add(manifest.id);
          }

        } catch (error) {
          // Manifest parsing errors already caught elsewhere
        }
      }
    }

    if (duplicateIds.length === 0) {
      this.addCheck('Integration', 'No duplicate plugin IDs found');
    } else {
      this.addIssue('error', 'Integration', 
        `Duplicate plugin IDs: ${duplicateIds.join(', ')}`,
        'Ensure each plugin has a unique ID'
      );
    }

    // Check shared dependencies
    const sharedDir = path.join(this.projectRoot, 'shared');
    if (fs.existsSync(sharedDir)) {
      this.addCheck('Integration', 'Shared utilities directory exists');
      
      // Check if shared types are properly built
      const sharedTypesPath = path.join(sharedDir, 'types', 'index.ts');
      if (fs.existsSync(sharedTypesPath)) {
        this.addCheck('Integration', 'Shared types are available');
      } else {
        this.addIssue('warning', 'Integration', 'Shared types not found');
      }
    }
  }

  /**
   * Generate health report
   */
  generateReport() {
    this.log('\n=== 🏥 HEALTH CHECK REPORT ===', 'info');
    
    const errors = this.issues.filter(issue => issue.severity === 'error');
    const warnings = this.issues.filter(issue => issue.severity === 'warning');
    
    this.log(`✅ Successful checks: ${this.checks.length}`, 'success');
    
    if (warnings.length > 0) {
      this.log(`⚠️  Warnings: ${warnings.length}`, 'warning');
    }
    
    if (errors.length > 0) {
      this.log(`❌ Errors: ${errors.length}`, 'error');
    }

    if (errors.length === 0 && warnings.length === 0) {
      this.log('\n🎉 All health checks passed! Your plugins are ready.', 'success');
      return true;
    }

    // Display issues with fixes
    if (warnings.length > 0) {
      this.log('\n⚠️  WARNINGS:', 'warning');
      warnings.forEach(({ plugin, message, fix }) => {
        this.log(`  ${plugin}: ${message}`, 'warning');
        if (fix) {
          this.log(`    💡 Fix: ${fix}`, 'info');
        }
      });
    }

    if (errors.length > 0) {
      this.log('\n❌ ERRORS (must be fixed):', 'error');
      errors.forEach(({ plugin, message, fix }) => {
        this.log(`  ${plugin}: ${message}`, 'error');
        if (fix) {
          this.log(`    🔧 Fix: ${fix}`, 'info');
        }
      });
    }

    return errors.length === 0;
  }

  /**
   * Run complete health check
   */
  async run() {
    try {
      this.log('🏥 Starting Writerr Plugin Health Check...', 'info');

      this.checkEnvironment();
      this.checkDependencies();
      this.checkTypeScriptCompilation();
      this.checkPluginBuilds();
      this.checkPluginLoading();
      this.checkIntegrationIssues();

      const healthy = this.generateReport();
      
      if (healthy) {
        process.exit(0);
      } else {
        process.exit(1);
      }

    } catch (error) {
      this.log(`💥 Health check failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// Run health check if called directly
if (require.main === module) {
  const healthChecker = new HealthChecker();
  healthChecker.run();
}

module.exports = HealthChecker;