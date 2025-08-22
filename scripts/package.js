#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function packagePlugin(pluginName) {
  const pluginDir = path.join(__dirname, '..', 'plugins', pluginName);
  const outputDir = path.join(__dirname, '..', 'dist');
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Required files for an Obsidian plugin
  const requiredFiles = ['main.js', 'manifest.json'];
  const optionalFiles = ['styles.css', 'README.md'];
  
  // Check if all required files exist
  for (const file of requiredFiles) {
    const filePath = path.join(pluginDir, file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Required file ${file} not found in ${pluginName}`);
    }
  }
  
  // Create plugin package directory
  const packageDir = path.join(outputDir, pluginName);
  if (fs.existsSync(packageDir)) {
    fs.rmSync(packageDir, { recursive: true, force: true });
  }
  fs.mkdirSync(packageDir, { recursive: true });
  
  // Copy required files
  for (const file of requiredFiles) {
    const srcPath = path.join(pluginDir, file);
    const destPath = path.join(packageDir, file);
    fs.copyFileSync(srcPath, destPath);
  }
  
  // Copy optional files if they exist
  for (const file of optionalFiles) {
    const srcPath = path.join(pluginDir, file);
    if (fs.existsSync(srcPath)) {
      const destPath = path.join(packageDir, file);
      fs.copyFileSync(srcPath, destPath);
    }
  }
  
  // Read manifest to get version info
  const manifestPath = path.join(packageDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  // Create ZIP file
  const zipName = `${pluginName}-${manifest.version}.zip`;
  const zipPath = path.join(outputDir, zipName);
  
  try {
    // Remove existing zip if it exists
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }
    
    // Create zip (cross-platform approach)
    const cwd = process.cwd();
    process.chdir(packageDir);
    
    if (process.platform === 'win32') {
      execSync(`powershell Compress-Archive -Path * -DestinationPath "${zipPath}"`, { stdio: 'inherit' });
    } else {
      execSync(`zip -r "${zipPath}" *`, { stdio: 'inherit' });
    }
    
    process.chdir(cwd);
    
    console.log(`✅ Packaged ${pluginName} v${manifest.version}`);
    console.log(`   Package: ${packageDir}`);
    console.log(`   Archive: ${zipPath}`);
    
    return {
      name: pluginName,
      version: manifest.version,
      packageDir,
      zipPath,
      manifest
    };
    
  } catch (error) {
    throw new Error(`Failed to create ZIP for ${pluginName}: ${error.message}`);
  }
}

async function main() {
  const plugins = ['track-edits', 'writerr-chat', 'ai-editorial-functions'];
  const packages = [];
  
  console.log('📦 Packaging Writerr Obsidian Plugins for Distribution\\n');
  
  // Build plugins first
  console.log('🔨 Building plugins for production...');
  try {
    execSync('npm run build:prod', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  } catch (error) {
    console.error('❌ Build failed. Cannot proceed with packaging.');
    process.exit(1);
  }
  
  console.log('\\n📦 Creating plugin packages...');
  
  // Package each plugin
  for (const pluginName of plugins) {
    try {
      const packageInfo = await packagePlugin(pluginName);
      packages.push(packageInfo);
    } catch (error) {
      console.error(`❌ Failed to package ${pluginName}: ${error.message}`);
      process.exit(1);
    }
  }
  
  // Create combined ZIP with all plugins
  const distDir = path.join(__dirname, '..', 'dist');
  const combinedZipPath = path.join(distDir, 'writerr-obsidian-plugins.zip');
  
  try {
    if (fs.existsSync(combinedZipPath)) {
      fs.unlinkSync(combinedZipPath);
    }
    
    const cwd = process.cwd();
    process.chdir(distDir);
    
    const pluginDirs = plugins.join(' ');
    
    if (process.platform === 'win32') {
      execSync(`powershell Compress-Archive -Path ${pluginDirs} -DestinationPath "writerr-obsidian-plugins.zip"`, { stdio: 'inherit' });
    } else {
      execSync(`zip -r "writerr-obsidian-plugins.zip" ${pluginDirs}`, { stdio: 'inherit' });
    }
    
    process.chdir(cwd);
    
    console.log(`\\n✅ Created combined package: ${combinedZipPath}`);
    
  } catch (error) {
    console.warn(`⚠️  Failed to create combined ZIP: ${error.message}`);
  }
  
  // Generate package summary
  console.log('\\n📋 Package Summary:');
  console.log('┌─────────────────────────┬─────────┬─────────────────────────┐');
  console.log('│ Plugin                  │ Version │ Archive                 │');
  console.log('├─────────────────────────┼─────────┼─────────────────────────┤');
  
  for (const pkg of packages) {
    const name = pkg.name.padEnd(23);
    const version = pkg.version.padEnd(7);
    const archive = path.basename(pkg.zipPath);
    
    console.log(`│ ${name} │ ${version} │ ${archive.padEnd(23)} │`);
  }
  
  console.log('└─────────────────────────┴─────────┴─────────────────────────┘');
  
  // Installation instructions
  console.log('\\n🚀 Installation Instructions:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\\n📥 Individual Plugins:');
  console.log('1. Extract the ZIP file for each plugin');
  console.log('2. Copy the extracted folder to: [YourVault]/.obsidian/plugins/');
  console.log('3. Restart Obsidian');
  console.log('4. Enable plugins in Settings → Community Plugins');
  
  console.log('\\n📦 Complete Suite:');
  console.log('1. Extract writerr-obsidian-plugins.zip');
  console.log('2. Copy all plugin folders to: [YourVault]/.obsidian/plugins/');
  console.log('3. Restart Obsidian');
  console.log('4. Enable all Writerr plugins in Settings → Community Plugins');
  
  console.log('\\n💡 Tips:');
  console.log('• Make sure Community Plugins are enabled in Obsidian');
  console.log('• Check the plugin settings after installation');
  console.log('• For AI functions, configure your AI provider in Writerr Chat settings');
  
  console.log('\\n🎉 Packaging complete! Ready for distribution.');
}

main().catch(error => {
  console.error('❌ Packaging failed:', error.message);
  process.exit(1);
});