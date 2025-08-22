#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const { promisify } = require('util');

/**
 * Development Testing Script
 * Sets up test environment with hot-reload for Writerr plugins
 */

class DevTester {
  constructor() {
    this.projectRoot = process.cwd();
    this.testVaultPath = path.join(this.projectRoot, 'test-vault');
    this.pluginsDir = path.join(this.projectRoot, 'plugins');
    this.testPluginsDir = path.join(this.testVaultPath, '.obsidian', 'plugins');
    this.watchers = [];
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

  /**
   * Create test vault directory structure
   */
  async createTestVault() {
    this.log('🏗️  Creating test vault structure...', 'info');

    // Create main test vault directories
    const directories = [
      this.testVaultPath,
      path.join(this.testVaultPath, '.obsidian'),
      path.join(this.testVaultPath, '.obsidian', 'plugins'),
      path.join(this.testVaultPath, 'Test Notes'),
      path.join(this.testVaultPath, 'Templates')
    ];

    for (const dir of directories) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        this.log(`Created directory: ${path.relative(this.projectRoot, dir)}`, 'success');
      }
    }

    // Create basic Obsidian configuration
    const obsidianConfig = {
      theme: 'obsidian',
      pluginEnabledStatus: {},
      hotkeys: {},
      workspaceLayout: {
        type: 'split',
        direction: 'vertical',
        children: [
          {
            type: 'leaf',
            state: {
              type: 'markdown',
              state: {
                file: 'Test Notes/Welcome.md',
                mode: 'source'
              }
            }
          }
        ]
      }
    };

    const configPath = path.join(this.testVaultPath, '.obsidian', 'workspace.json');
    fs.writeFileSync(configPath, JSON.stringify(obsidianConfig, null, 2));

    // Create test notes
    await this.createTestNotes();

    this.log('✅ Test vault structure created', 'success');
  }

  /**
   * Create sample test notes for plugin testing
   */
  async createTestNotes() {
    const testNotes = [
      {
        filename: 'Welcome.md',
        content: `# Welcome to Writerr Plugin Testing

This is your test vault for developing and testing Writerr plugins.

## Available Plugins

- **Track Edits**: Real-time visual tracking of document changes
- **Writerr Chat**: AI-powered writing assistant
- **AI Editorial Functions**: Specialized AI writing tools

## Test Instructions

1. Make changes to this document to test Track Edits
2. Open the Writerr Chat panel to test AI interactions  
3. Use AI Editorial Functions for writing assistance

---

*This document will automatically update as you develop plugins.*`
      },
      {
        filename: 'Sample Document.md',
        content: `# Sample Document for Testing

This document contains sample content for testing various plugin features.

## Academic Writing Sample

The hypothesis presented in this study suggests that **artificial intelligence** can significantly enhance the writing process through contextual assistance and real-time feedback mechanisms.

## Fiction Writing Sample

"The old lighthouse stood against the stormy sky," she wrote, pausing to consider her next words. The cursor blinked expectantly on the screen.

## Business Writing Sample

Our quarterly analysis indicates a 15% increase in productivity metrics following the implementation of AI-assisted writing tools across all departments.

## Technical Writing Sample

\`\`\`javascript
function validatePlugin(manifest) {
  if (!manifest.id || !manifest.version) {
    throw new Error('Invalid manifest structure');
  }
  return true;
}
\`\`\`

---

*Use this document to test editing, tracking, and AI assistance features.*`
      }
    ];

    const testNotesDir = path.join(this.testVaultPath, 'Test Notes');
    
    for (const note of testNotes) {
      const notePath = path.join(testNotesDir, note.filename);
      fs.writeFileSync(notePath, note.content);
      this.log(`Created test note: ${note.filename}`, 'success');
    }
  }

  /**
   * Create symlinks for plugins in test vault
   */
  async createPluginSymlinks() {
    this.log('🔗 Creating plugin symlinks...', 'info');

    const plugins = fs.readdirSync(this.pluginsDir, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);

    for (const plugin of plugins) {
      const sourcePath = path.join(this.pluginsDir, plugin);
      const targetPath = path.join(this.testPluginsDir, plugin);

      try {
        // Remove existing symlink if it exists
        if (fs.existsSync(targetPath)) {
          fs.unlinkSync(targetPath);
        }

        // Create new symlink
        fs.symlinkSync(sourcePath, targetPath, 'dir');
        this.log(`✅ Symlinked plugin: ${plugin}`, 'success');

      } catch (error) {
        this.log(`❌ Failed to symlink ${plugin}: ${error.message}`, 'error');
      }
    }
  }

  /**
   * Enable plugins in test vault configuration
   */
  async enablePluginsInTestVault() {
    this.log('⚙️  Enabling plugins in test vault...', 'info');

    const plugins = fs.readdirSync(this.pluginsDir, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);

    // Update community-plugins.json
    const communityPluginsPath = path.join(this.testVaultPath, '.obsidian', 'community-plugins.json');
    fs.writeFileSync(communityPluginsPath, JSON.stringify(plugins, null, 2));

    // Create hotkeys configuration
    const hotkeysPath = path.join(this.testVaultPath, '.obsidian', 'hotkeys.json');
    const hotkeysConfig = {
      "writerr-chat:toggle-chat": [
        {
          "modifiers": ["Mod", "Shift"],
          "key": "c"
        }
      ],
      "track-edits:toggle-tracking": [
        {
          "modifiers": ["Mod", "Shift"],
          "key": "t"
        }
      ]
    };
    fs.writeFileSync(hotkeysPath, JSON.stringify(hotkeysConfig, null, 2));

    this.log('✅ Plugins enabled in test vault', 'success');
  }

  /**
   * Setup file watchers for automatic rebuilds
   */
  setupFileWatchers() {
    this.log('👀 Setting up file watchers for hot-reload...', 'info');

    const plugins = fs.readdirSync(this.pluginsDir, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);

    for (const plugin of plugins) {
      const srcDir = path.join(this.pluginsDir, plugin, 'src');
      
      if (fs.existsSync(srcDir)) {
        const watcher = fs.watch(srcDir, { recursive: true }, (eventType, filename) => {
          if (filename && (filename.endsWith('.ts') || filename.endsWith('.js'))) {
            this.log(`📝 Source changed: ${plugin}/${filename}`, 'info');
            this.rebuildPlugin(plugin);
          }
        });

        this.watchers.push(watcher);
        this.log(`👀 Watching: ${plugin}/src/`, 'info');
      }
    }
  }

  /**
   * Rebuild a specific plugin
   */
  rebuildPlugin(pluginName) {
    this.log(`🔨 Rebuilding plugin: ${pluginName}`, 'info');

    try {
      // Use the existing build script from package.json
      const buildCommand = `npm run build:${pluginName}`;
      execSync(buildCommand, { 
        stdio: 'pipe',
        cwd: this.projectRoot 
      });
      
      this.log(`✅ Successfully rebuilt: ${pluginName}`, 'success');
      this.log(`🔄 Plugin should hot-reload in Obsidian`, 'info');
      
    } catch (error) {
      this.log(`❌ Build failed for ${pluginName}: ${error.message}`, 'error');
    }
  }

  /**
   * Open test vault in Obsidian (if available)
   */
  async openTestVault() {
    try {
      // Try to open with Obsidian CLI if available
      execSync(`open "obsidian://open?vault=${encodeURIComponent(this.testVaultPath)}"`, { 
        stdio: 'ignore' 
      });
      this.log('🚀 Opening test vault in Obsidian...', 'success');
      
    } catch (error) {
      this.log('💡 To open test vault manually:', 'info');
      this.log(`   Open Obsidian → Open Vault → Browse → Select: ${this.testVaultPath}`, 'info');
    }
  }

  /**
   * Initial build of all plugins
   */
  async buildAllPlugins() {
    this.log('🔨 Building all plugins...', 'info');

    try {
      execSync('npm run build:all', { 
        stdio: 'inherit',
        cwd: this.projectRoot 
      });
      this.log('✅ All plugins built successfully', 'success');
      
    } catch (error) {
      this.log('❌ Build failed. Please check the output above.', 'error');
      throw error;
    }
  }

  /**
   * Cleanup watchers and resources
   */
  cleanup() {
    this.log('🧹 Cleaning up watchers...', 'info');
    
    for (const watcher of this.watchers) {
      watcher.close();
    }
    
    this.watchers = [];
  }

  /**
   * Display development instructions
   */
  displayInstructions() {
    this.log('\n=== 🎯 DEVELOPMENT SETUP COMPLETE ===', 'success');
    this.log('', 'info');
    this.log('Your development environment is ready!', 'info');
    this.log('', 'info');
    this.log('📁 Test Vault Location:', 'info');
    this.log(`   ${this.testVaultPath}`, 'info');
    this.log('', 'info');
    this.log('🔥 Hot Reload Active:', 'info');
    this.log('   - Edit TypeScript files in plugins/*/src/', 'info');
    this.log('   - Plugins will automatically rebuild', 'info');
    this.log('   - Use Ctrl+R in Obsidian to reload plugins', 'info');
    this.log('', 'info');
    this.log('🧪 Testing Tips:', 'info');
    this.log('   - Use "Sample Document.md" for edit tracking tests', 'info');
    this.log('   - Try Cmd+Shift+C to open Writerr Chat', 'info');
    this.log('   - Try Cmd+Shift+T to toggle edit tracking', 'info');
    this.log('', 'info');
    this.log('⌨️  Press Ctrl+C to stop development server', 'warning');
    this.log('', 'info');
  }

  /**
   * Run the development setup
   */
  async run() {
    try {
      this.log('🚀 Starting Writerr Development Environment...', 'info');

      // Setup test vault
      await this.createTestVault();
      await this.createPluginSymlinks();
      await this.enablePluginsInTestVault();

      // Build plugins
      await this.buildAllPlugins();

      // Setup file watching
      this.setupFileWatchers();

      // Open test vault
      await this.openTestVault();

      // Display instructions
      this.displayInstructions();

      // Handle shutdown gracefully
      process.on('SIGINT', () => {
        this.log('\n🛑 Shutting down development environment...', 'warning');
        this.cleanup();
        process.exit(0);
      });

      // Keep the process alive
      await new Promise(() => {});

    } catch (error) {
      this.log(`💥 Setup failed: ${error.message}`, 'error');
      this.cleanup();
      process.exit(1);
    }
  }
}

// Run development setup if called directly
if (require.main === module) {
  const devTester = new DevTester();
  devTester.run();
}

module.exports = DevTester;