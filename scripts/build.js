#!/usr/bin/env node

const { buildAll } = require('../esbuild.config.js');
const fs = require('fs');
const path = require('path');

async function main() {
  const production = process.argv.includes('--prod') || process.argv.includes('--production');
  
  console.log('🚀 Building Writerr Obsidian Plugins...');
  console.log(`Mode: ${production ? 'Production' : 'Development'}`);
  
  try {
    await buildAll(production);
    
    // Verify build outputs
    const plugins = ['track-edits', 'writerr-chat', 'ai-editorial-functions'];
    const buildResults = [];
    
    for (const plugin of plugins) {
      const mainFile = path.join(__dirname, '..', 'plugins', plugin, 'main.js');
      const manifestFile = path.join(__dirname, '..', 'plugins', plugin, 'manifest.json');
      
      const mainExists = fs.existsSync(mainFile);
      const manifestExists = fs.existsSync(manifestFile);
      const mainSize = mainExists ? fs.statSync(mainFile).size : 0;
      
      buildResults.push({
        plugin,
        mainExists,
        manifestExists,
        mainSize: Math.round(mainSize / 1024) + 'KB'
      });
    }
    
    // Print build summary
    console.log('\\n📊 Build Summary:');
    console.log('┌─────────────────────────┬─────────┬──────────┬────────┐');
    console.log('│ Plugin                  │ Built   │ Manifest │ Size   │');
    console.log('├─────────────────────────┼─────────┼──────────┼────────┤');
    
    for (const result of buildResults) {
      const built = result.mainExists ? '✅' : '❌';
      const manifest = result.manifestExists ? '✅' : '❌';
      const pluginName = result.plugin.padEnd(23);
      const size = result.mainSize.padStart(6);
      
      console.log(`│ ${pluginName} │   ${built}     │    ${manifest}     │ ${size} │`);
    }
    
    console.log('└─────────────────────────┴─────────┴──────────┴────────┘');
    
    const allBuilt = buildResults.every(r => r.mainExists && r.manifestExists);
    
    if (allBuilt) {
      console.log('\\n🎉 All plugins built successfully!');
      console.log('\\n📦 Ready for installation in Obsidian:');
      
      for (const plugin of plugins) {
        const pluginDir = path.join(__dirname, '..', 'plugins', plugin);
        console.log(`   ${plugin}: ${pluginDir}`);
      }
      
      console.log('\\n💡 Installation instructions:');
      console.log('1. Copy each plugin folder to your Obsidian vault/.obsidian/plugins/');
      console.log('2. Restart Obsidian or reload plugins');
      console.log('3. Enable the plugins in Settings → Community Plugins');
      
    } else {
      console.error('\\n❌ Some plugins failed to build. Check the errors above.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\\n❌ Build failed:', error.message);
    process.exit(1);
  }
}

main();