#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

function createWatcher(pluginName) {
  const args = [
    `plugins/${pluginName}/src/main.ts`,
    '--bundle',
    '--external:obsidian',
    `--outfile=plugins/${pluginName}/main.js`,
    '--format=cjs',
    '--target=es2018',
    '--sourcemap',
    '--watch'
  ];

  console.log(`🔍 Starting watcher for ${pluginName}...`);
  
  const watcher = spawn('npx', ['esbuild', ...args], {
    stdio: ['inherit', 'pipe', 'pipe'],
    cwd: path.join(__dirname, '..')
  });

  watcher.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      console.log(`[${pluginName}] ${output}`);
    }
  });

  watcher.stderr.on('data', (data) => {
    const error = data.toString().trim();
    if (error) {
      console.error(`[${pluginName}] ${error}`);
    }
  });

  watcher.on('close', (code) => {
    if (code !== 0) {
      console.error(`[${pluginName}] Watcher exited with code ${code}`);
    } else {
      console.log(`[${pluginName}] Watcher stopped`);
    }
  });

  return watcher;
}

function printInstructions() {
  console.log('\\n📝 Development Instructions:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\\n1. 📂 Plugin Location:');
  console.log('   Copy plugin folders to: [Vault]/.obsidian/plugins/');
  console.log('\\n2. 🔄 Development Workflow:');
  console.log('   • Edit TypeScript files in plugins/*/src/');
  console.log('   • Files are automatically rebuilt on save');
  console.log('   • Use Obsidian\'s "Reload app without saving" (Ctrl+R) to test changes');
  console.log('\\n3. 🐛 Debugging:');
  console.log('   • Open Obsidian Developer Tools (Ctrl+Shift+I)');
  console.log('   • Check Console for errors and logs');
  console.log('   • Source maps are included for debugging TypeScript');
  console.log('\\n4. ⚡ Hot Reload Tips:');
  console.log('   • Some changes may require disabling/enabling the plugin');
  console.log('   • Manifest changes always require a restart');
  console.log('   • CSS changes are applied immediately');
  console.log('\\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

async function main() {
  console.log('🔧 Starting Writerr Obsidian Plugins Development Mode\\n');
  
  const plugins = ['track-edits', 'writerr-chat', 'ai-editorial-functions'];
  const watchers = [];

  // Verify all plugin source directories exist
  for (const plugin of plugins) {
    const srcDir = path.join(__dirname, '..', 'plugins', plugin, 'src');
    const mainFile = path.join(srcDir, 'main.ts');
    
    if (!fs.existsSync(mainFile)) {
      console.error(`❌ Main file not found: ${mainFile}`);
      process.exit(1);
    }
  }

  // Start watchers for each plugin
  for (const plugin of plugins) {
    const watcher = createWatcher(plugin);
    watchers.push({ name: plugin, process: watcher });
  }

  printInstructions();
  
  console.log('\\n🎯 Watching for changes... (Press Ctrl+C to stop)\\n');

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\\n🛑 Stopping development watchers...');
    
    for (const watcher of watchers) {
      console.log(`   Stopping ${watcher.name}...`);
      watcher.process.kill('SIGTERM');
    }
    
    setTimeout(() => {
      console.log('\\n👋 Development mode stopped');
      process.exit(0);
    }, 1000);
  });

  process.on('SIGTERM', () => {
    console.log('\\n🛑 Received SIGTERM, stopping watchers...');
    
    for (const watcher of watchers) {
      watcher.process.kill('SIGTERM');
    }
    
    process.exit(0);
  });
}

main().catch(error => {
  console.error('❌ Development mode failed to start:', error.message);
  process.exit(1);
});