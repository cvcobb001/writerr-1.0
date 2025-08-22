#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const archiver = require('archiver');

/**
 * Pre-deployment Verification Script
 * Validates plugins and creates distribution packages for Writerr plugins
 */

class DeploymentVerifier {
  constructor() {
    this.projectRoot = process.cwd();
    this.pluginsDir = path.join(this.projectRoot, 'plugins');
    this.distDir = path.join(this.projectRoot, 'dist');
    this.errors = [];
    this.warnings = [];
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
   * Clean and prepare distribution directory
   */
  prepareDist() {
    this.log('🧹 Preparing distribution directory...', 'info');

    // Clean existing dist directory
    if (fs.existsSync(this.distDir)) {
      fs.rmSync(this.distDir, { recursive: true, force: true });
    }

    // Create fresh dist directory
    fs.mkdirSync(this.distDir, { recursive: true });
    this.addSuccess('Build', 'Distribution directory prepared');
  }

  /**
   * Run full validation suite
   */
  async runValidation() {
    this.log('🔍 Running validation suite...', 'info');

    try {
      const PluginValidator = require('./validate-plugins');
      const validator = new PluginValidator();
      
      // Capture validation output
      const originalLog = validator.log;
      let validationPassed = true;
      
      validator.log = (message, type) => {
        if (type === 'error') {
          validationPassed = false;
        }
        // Suppress validator output during deploy check
      };

      await validator.run();
      
      if (validationPassed) {
        this.addSuccess('Validation', 'All plugins passed structure validation');
      } else {
        this.addError('Validation', 'Plugin validation failed - check with npm run validate');
      }

    } catch (error) {
      this.addError('Validation', `Validation suite failed: ${error.message}`);
    }
  }

  /**
   * Run health checks
   */
  async runHealthChecks() {
    this.log('🏥 Running health checks...', 'info');

    try {
      const HealthChecker = require('./health-check');
      const healthChecker = new HealthChecker();
      
      // Capture health check output  
      const originalLog = healthChecker.log;
      let healthPassed = true;
      
      healthChecker.log = (message, type) => {
        if (type === 'error') {
          healthPassed = false;
        }
        // Suppress health checker output during deploy check
      };

      await healthChecker.run();
      
      if (healthPassed) {
        this.addSuccess('Health', 'All health checks passed');
      } else {
        this.addError('Health', 'Health checks failed - check with npm run health');
      }

    } catch (error) {
      this.addError('Health', `Health check failed: ${error.message}`);
    }
  }

  /**
   * Build all plugins in production mode
   */
  buildForProduction() {
    this.log('🔨 Building plugins for production...', 'info');

    try {
      // Run production build
      execSync('npm run build:prod:all', { 
        stdio: 'pipe',
        cwd: this.projectRoot 
      });

      this.addSuccess('Build', 'All plugins built for production');
      
      // Verify build outputs
      const plugins = fs.readdirSync(this.pluginsDir, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);

      for (const plugin of plugins) {
        const mainJsPath = path.join(this.pluginsDir, plugin, 'main.js');
        
        if (fs.existsSync(mainJsPath)) {
          const stats = fs.statSync(mainJsPath);
          const sizeKB = Math.round(stats.size / 1024);
          this.addSuccess(plugin, `Production build ready (${sizeKB}KB)`);
          
          // Check if build is minified (rough heuristic)
          const content = fs.readFileSync(mainJsPath, 'utf8');
          const isMinified = content.split('\n').length < 20 && content.length > 5000;
          
          if (!isMinified) {
            this.addWarning(plugin, 'Build may not be properly minified');
          }

        } else {
          this.addError(plugin, 'Production build output missing');
        }
      }

    } catch (error) {
      this.addError('Build', `Production build failed: ${error.message}`);
    }
  }

  /**
   * Create distribution packages for individual plugins
   */
  async createPluginPackages() {
    this.log('📦 Creating plugin distribution packages...', 'info');

    const plugins = fs.readdirSync(this.pluginsDir, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);

    for (const plugin of plugins) {
      await this.createPluginPackage(plugin);
    }
  }

  /**
   * Create distribution package for a single plugin
   */
  async createPluginPackage(pluginName) {
    return new Promise((resolve, reject) => {
      const pluginDir = path.join(this.pluginsDir, pluginName);
      const manifestPath = path.join(pluginDir, 'manifest.json');
      
      if (!fs.existsSync(manifestPath)) {
        this.addError(pluginName, 'Cannot create package - manifest.json missing');
        resolve();
        return;
      }

      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const version = manifest.version || '1.0.0';
        const packageName = `${pluginName}-v${version}.zip`;
        const packagePath = path.join(this.distDir, packageName);

        // Create ZIP archive
        const output = fs.createWriteStream(packagePath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
          const sizeKB = Math.round(archive.pointer() / 1024);
          this.addSuccess(pluginName, `Package created: ${packageName} (${sizeKB}KB)`);
          resolve();
        });

        archive.on('error', (err) => {
          this.addError(pluginName, `Package creation failed: ${err.message}`);
          reject(err);
        });

        archive.pipe(output);

        // Add required files to archive
        const filesToPackage = [
          'manifest.json',
          'main.js', 
          'styles.css'
        ];

        for (const file of filesToPackage) {
          const filePath = path.join(pluginDir, file);
          if (fs.existsSync(filePath)) {
            archive.file(filePath, { name: file });
          } else {
            this.addError(pluginName, `Required file missing for packaging: ${file}`);
          }
        }

        // Add README if it exists
        const readmePath = path.join(pluginDir, 'README.md');
        if (fs.existsSync(readmePath)) {
          archive.file(readmePath, { name: 'README.md' });
        }

        archive.finalize();

      } catch (error) {
        this.addError(pluginName, `Package creation error: ${error.message}`);
        resolve();
      }
    });
  }

  /**
   * Create complete Writerr suite package
   */
  async createSuitePackage() {
    this.log('📦 Creating complete Writerr suite package...', 'info');

    return new Promise((resolve, reject) => {
      const packageJson = JSON.parse(fs.readFileSync(path.join(this.projectRoot, 'package.json'), 'utf8'));
      const version = packageJson.version || '1.0.0';
      const suiteName = `writerr-obsidian-plugins-v${version}.zip`;
      const suitePath = path.join(this.distDir, suiteName);

      const output = fs.createWriteStream(suitePath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        const sizeMB = Math.round(archive.pointer() / (1024 * 1024) * 100) / 100;
        this.addSuccess('Suite', `Complete package created: ${suiteName} (${sizeMB}MB)`);
        resolve();
      });

      archive.on('error', (err) => {
        this.addError('Suite', `Suite package creation failed: ${err.message}`);
        reject(err);
      });

      archive.pipe(output);

      // Add all plugins
      const plugins = fs.readdirSync(this.pluginsDir, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);

      for (const plugin of plugins) {
        const pluginDir = path.join(this.pluginsDir, plugin);
        archive.directory(pluginDir, `plugins/${plugin}`);
      }

      // Add project documentation
      const docsToInclude = [
        'README.md',
        'LICENSE',
        'CHANGELOG.md'
      ];

      for (const doc of docsToInclude) {
        const docPath = path.join(this.projectRoot, doc);
        if (fs.existsSync(docPath)) {
          archive.file(docPath, { name: doc });
        }
      }

      // Add installation instructions
      const installInstructions = `# Writerr Obsidian Plugins Installation

## Automatic Installation (Recommended)

1. Download and extract this package
2. Copy the entire \`plugins/\` directory to your Obsidian vault's \`.obsidian/\` directory
3. Restart Obsidian
4. Go to Settings → Community Plugins and enable the Writerr plugins

## Manual Installation

Install each plugin individually by copying plugin directories to:
\`[Your Vault]/.obsidian/plugins/\`

## Plugins Included

${plugins.map(plugin => `- ${plugin}`).join('\n')}

For detailed usage instructions, see the documentation at:
https://github.com/writerr-ai/obsidian-plugins
`;

      archive.append(installInstructions, { name: 'INSTALLATION.md' });
      archive.finalize();
    });
  }

  /**
   * Verify package integrity
   */
  verifyPackages() {
    this.log('🔍 Verifying package integrity...', 'info');

    const packages = fs.readdirSync(this.distDir)
      .filter(file => file.endsWith('.zip'))
      .map(file => path.join(this.distDir, file));

    for (const packagePath of packages) {
      const stats = fs.statSync(packagePath);
      const filename = path.basename(packagePath);
      
      if (stats.size === 0) {
        this.addError('Packaging', `Package is empty: ${filename}`);
      } else if (stats.size < 1024) {
        this.addWarning('Packaging', `Package seems too small: ${filename} (${stats.size} bytes)`);
      } else {
        const sizeKB = Math.round(stats.size / 1024);
        this.addSuccess('Packaging', `Package verified: ${filename} (${sizeKB}KB)`);
      }
    }
  }

  /**
   * Generate deployment manifest
   */
  generateDeploymentManifest() {
    this.log('📋 Generating deployment manifest...', 'info');

    const plugins = fs.readdirSync(this.pluginsDir, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);

    const manifest = {
      buildDate: new Date().toISOString(),
      version: JSON.parse(fs.readFileSync(path.join(this.projectRoot, 'package.json'), 'utf8')).version,
      plugins: [],
      packages: []
    };

    // Add plugin information
    for (const plugin of plugins) {
      const manifestPath = path.join(this.pluginsDir, plugin, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        try {
          const pluginManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          manifest.plugins.push({
            id: pluginManifest.id,
            name: pluginManifest.name,
            version: pluginManifest.version,
            description: pluginManifest.description
          });
        } catch (error) {
          // Skip malformed manifests
        }
      }
    }

    // Add package information
    const packages = fs.readdirSync(this.distDir)
      .filter(file => file.endsWith('.zip'));

    for (const packageFile of packages) {
      const packagePath = path.join(this.distDir, packageFile);
      const stats = fs.statSync(packagePath);
      
      manifest.packages.push({
        filename: packageFile,
        size: stats.size,
        created: stats.birthtime.toISOString()
      });
    }

    // Write manifest
    const manifestPath = path.join(this.distDir, 'deployment-manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    
    this.addSuccess('Manifest', 'Deployment manifest created');
  }

  /**
   * Generate deployment report
   */
  generateReport() {
    this.log('\n=== 🚀 DEPLOYMENT VERIFICATION REPORT ===', 'info');
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      this.log('\n🎉 Ready for deployment! All checks passed.', 'success');
      this.log(`📦 Distribution packages created in: ${this.distDir}`, 'info');
      return true;
    }

    if (this.warnings.length > 0) {
      this.log(`\n⚠️  WARNINGS (${this.warnings.length}):`, 'warning');
      this.warnings.forEach(({ plugin, message }) => {
        this.log(`  ${plugin}: ${message}`, 'warning');
      });
    }

    if (this.errors.length > 0) {
      this.log(`\n❌ ERRORS (${this.errors.length}) - DEPLOYMENT BLOCKED:`, 'error');
      this.errors.forEach(({ plugin, message }) => {
        this.log(`  ${plugin}: ${message}`, 'error');
      });
      this.log('\n🛑 Fix all errors before deploying.', 'error');
    }

    return this.errors.length === 0;
  }

  /**
   * Run complete pre-deployment verification
   */
  async run() {
    try {
      this.log('🚀 Starting pre-deployment verification...', 'info');

      // Check if archiver is available for packaging
      try {
        require('archiver');
      } catch (error) {
        this.addError('Dependencies', 'archiver package not found - run: npm install archiver --save-dev');
        this.generateReport();
        process.exit(1);
      }

      this.prepareDist();
      await this.runValidation();
      await this.runHealthChecks();
      this.buildForProduction();
      await this.createPluginPackages();
      await this.createSuitePackage();
      this.verifyPackages();
      this.generateDeploymentManifest();

      const ready = this.generateReport();
      
      if (ready) {
        process.exit(0);
      } else {
        process.exit(1);
      }

    } catch (error) {
      this.log(`💥 Pre-deployment verification failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// Run pre-deployment verification if called directly
if (require.main === module) {
  const verifier = new DeploymentVerifier();
  verifier.run();
}

module.exports = DeploymentVerifier;