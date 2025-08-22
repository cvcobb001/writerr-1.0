#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Plugin Validation Script
 * Validates plugin structure, manifests, and builds for Writerr plugins
 */

class PluginValidator {
  constructor() {
    this.pluginsDir = path.join(process.cwd(), 'plugins');
    this.errors = [];
    this.warnings = [];
    this.plugins = [];
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

  addError(plugin, message) {
    this.errors.push({ plugin, message });
    this.log(`❌ ${plugin}: ${message}`, 'error');
  }

  addWarning(plugin, message) {
    this.warnings.push({ plugin, message });
    this.log(`⚠️  ${plugin}: ${message}`, 'warning');
  }

  addSuccess(plugin, message) {
    this.log(`✅ ${plugin}: ${message}`, 'success');
  }

  /**
   * Discover all plugin directories
   */
  discoverPlugins() {
    if (!fs.existsSync(this.pluginsDir)) {
      throw new Error(`Plugins directory not found: ${this.pluginsDir}`);
    }

    const entries = fs.readdirSync(this.pluginsDir, { withFileTypes: true });
    this.plugins = entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);

    this.log(`Found ${this.plugins.length} plugins: ${this.plugins.join(', ')}`);
    return this.plugins;
  }

  /**
   * Validate required files exist
   */
  validateFileStructure(pluginName) {
    const pluginDir = path.join(this.pluginsDir, pluginName);
    const requiredFiles = [
      'manifest.json',
      'main.js',
      'styles.css'
    ];

    const recommendedFiles = [
      'src/main.ts',
      'main.js.map'
    ];

    // Check required files
    for (const file of requiredFiles) {
      const filePath = path.join(pluginDir, file);
      if (!fs.existsSync(filePath)) {
        this.addError(pluginName, `Missing required file: ${file}`);
      } else {
        this.addSuccess(pluginName, `Required file exists: ${file}`);
      }
    }

    // Check recommended files
    for (const file of recommendedFiles) {
      const filePath = path.join(pluginDir, file);
      if (!fs.existsSync(filePath)) {
        this.addWarning(pluginName, `Missing recommended file: ${file}`);
      } else {
        this.addSuccess(pluginName, `Recommended file exists: ${file}`);
      }
    }
  }

  /**
   * Validate manifest.json structure and content
   */
  validateManifest(pluginName) {
    const manifestPath = path.join(this.pluginsDir, pluginName, 'manifest.json');
    
    if (!fs.existsSync(manifestPath)) {
      return; // Already reported in file structure validation
    }

    try {
      const manifestContent = fs.readFileSync(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestContent);

      // Required fields
      const requiredFields = [
        'id',
        'name', 
        'version',
        'minAppVersion',
        'description',
        'author'
      ];

      for (const field of requiredFields) {
        if (!manifest[field]) {
          this.addError(pluginName, `Missing required manifest field: ${field}`);
        } else {
          this.addSuccess(pluginName, `Manifest field '${field}' present`);
        }
      }

      // Validate specific field formats
      if (manifest.id && manifest.id !== pluginName) {
        this.addError(pluginName, `Manifest ID '${manifest.id}' doesn't match directory name '${pluginName}'`);
      }

      if (manifest.version && !/^\d+\.\d+\.\d+/.test(manifest.version)) {
        this.addWarning(pluginName, `Version '${manifest.version}' doesn't follow semantic versioning`);
      }

      if (manifest.js && manifest.js !== 'main.js') {
        this.addWarning(pluginName, `Manifest specifies '${manifest.js}' instead of 'main.js'`);
      }

      this.addSuccess(pluginName, 'Manifest structure is valid');

    } catch (error) {
      this.addError(pluginName, `Invalid manifest JSON: ${error.message}`);
    }
  }

  /**
   * Validate built JavaScript files
   */
  validateBuiltFiles(pluginName) {
    const pluginDir = path.join(this.pluginsDir, pluginName);
    const mainJsPath = path.join(pluginDir, 'main.js');
    
    if (!fs.existsSync(mainJsPath)) {
      return; // Already reported in file structure validation
    }

    try {
      const content = fs.readFileSync(mainJsPath, 'utf8');
      
      // Basic syntax check
      if (content.length === 0) {
        this.addError(pluginName, 'main.js is empty');
        return;
      }

      // Check for common patterns in Obsidian plugins
      const requiredPatterns = [
        /Plugin/i,
        /obsidian/i
      ];

      for (const pattern of requiredPatterns) {
        if (!pattern.test(content)) {
          this.addWarning(pluginName, `main.js may be missing Obsidian plugin patterns: ${pattern}`);
        }
      }

      // Try to detect if file is minified or not
      const isMinified = content.split('\n').length < 10 && content.length > 1000;
      if (isMinified) {
        this.log(`${pluginName}: main.js appears to be minified`, 'info');
      } else {
        this.log(`${pluginName}: main.js appears to be in development mode`, 'info');
      }

      this.addSuccess(pluginName, 'main.js appears to be valid');

    } catch (error) {
      this.addError(pluginName, `Error reading main.js: ${error.message}`);
    }
  }

  /**
   * Validate CSS files
   */
  validateStyles(pluginName) {
    const stylesPath = path.join(this.pluginsDir, pluginName, 'styles.css');
    
    if (!fs.existsSync(stylesPath)) {
      return; // Already reported in file structure validation
    }

    try {
      const content = fs.readFileSync(stylesPath, 'utf8');
      
      // Basic checks
      if (content.length === 0) {
        this.addWarning(pluginName, 'styles.css is empty');
      } else {
        // Check for Obsidian-specific CSS patterns
        const obsidianPatterns = [
          /\.workspace/,
          /\.mod-/,
          /\.theme-/
        ];

        let hasObsidianPatterns = false;
        for (const pattern of obsidianPatterns) {
          if (pattern.test(content)) {
            hasObsidianPatterns = true;
            break;
          }
        }

        if (!hasObsidianPatterns) {
          this.addWarning(pluginName, 'styles.css may not contain Obsidian-specific CSS patterns');
        }

        this.addSuccess(pluginName, 'styles.css appears to be valid');
      }

    } catch (error) {
      this.addError(pluginName, `Error reading styles.css: ${error.message}`);
    }
  }

  /**
   * Validate TypeScript source structure
   */
  validateSourceStructure(pluginName) {
    const srcDir = path.join(this.pluginsDir, pluginName, 'src');
    
    if (!fs.existsSync(srcDir)) {
      this.addWarning(pluginName, 'No src/ directory found');
      return;
    }

    const mainTsPath = path.join(srcDir, 'main.ts');
    if (fs.existsSync(mainTsPath)) {
      this.addSuccess(pluginName, 'TypeScript source file exists');
      
      try {
        const content = fs.readFileSync(mainTsPath, 'utf8');
        
        // Check for basic Obsidian plugin structure
        const requiredPatterns = [
          /import.*obsidian/i,
          /extends Plugin/i,
          /onload/i
        ];

        for (const pattern of requiredPatterns) {
          if (!pattern.test(content)) {
            this.addWarning(pluginName, `main.ts may be missing pattern: ${pattern}`);
          }
        }

      } catch (error) {
        this.addError(pluginName, `Error reading main.ts: ${error.message}`);
      }
    }
  }

  /**
   * Run validation on a single plugin
   */
  validatePlugin(pluginName) {
    this.log(`\n=== Validating Plugin: ${pluginName} ===`, 'info');
    
    this.validateFileStructure(pluginName);
    this.validateManifest(pluginName);
    this.validateBuiltFiles(pluginName);
    this.validateStyles(pluginName);
    this.validateSourceStructure(pluginName);
  }

  /**
   * Generate validation report
   */
  generateReport() {
    this.log('\n=== VALIDATION REPORT ===', 'info');
    
    const totalIssues = this.errors.length + this.warnings.length;
    
    if (totalIssues === 0) {
      this.log('🎉 All plugins passed validation!', 'success');
      return true;
    }

    if (this.errors.length > 0) {
      this.log(`\n❌ ERRORS (${this.errors.length}):`, 'error');
      this.errors.forEach(({ plugin, message }) => {
        this.log(`  ${plugin}: ${message}`, 'error');
      });
    }

    if (this.warnings.length > 0) {
      this.log(`\n⚠️  WARNINGS (${this.warnings.length}):`, 'warning');
      this.warnings.forEach(({ plugin, message }) => {
        this.log(`  ${plugin}: ${message}`, 'warning');
      });
    }

    this.log(`\nSummary: ${this.errors.length} errors, ${this.warnings.length} warnings`, 
      this.errors.length > 0 ? 'error' : 'warning');

    return this.errors.length === 0;
  }

  /**
   * Run full validation suite
   */
  async run() {
    try {
      this.log('🔍 Starting Writerr Plugin Validation...', 'info');
      
      this.discoverPlugins();
      
      for (const plugin of this.plugins) {
        this.validatePlugin(plugin);
      }

      const success = this.generateReport();
      
      if (success) {
        process.exit(0);
      } else {
        process.exit(1);
      }

    } catch (error) {
      this.log(`Fatal error: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new PluginValidator();
  validator.run();
}

module.exports = PluginValidator;