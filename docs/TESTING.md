# Writerr Plugin Testing & Validation

This document describes the automated testing and validation system for Writerr Obsidian plugins.

## Overview

The testing system provides comprehensive validation, development testing, health checks, and deployment verification to ensure plugin quality and reliability.

## Available Commands

### Quick Commands

```bash
# Run basic validation
npm run validate

# Run health checks
npm run health  

# Run full test suite
npm test

# Run comprehensive validation (recommended)
npm run test:full

# Start development environment with hot-reload
npm run dev-test

# Pre-deployment verification and packaging
npm run pre-deploy
```

## Scripts Overview

### 1. Plugin Validation (`validate-plugins.js`)

Validates plugin structure, manifests, and builds.

**What it checks:**
- ✅ Required files exist (`manifest.json`, `main.js`, `styles.css`)
- ✅ Manifest structure and required fields
- ✅ Semantic versioning compliance
- ✅ Built JavaScript file integrity
- ✅ CSS file structure
- ✅ TypeScript source organization
- ⚠️  Recommended files (`src/main.ts`, `main.js.map`)

**Usage:**
```bash
npm run validate
# or
node scripts/validate-plugins.js
```

**Exit codes:**
- `0`: All validations passed
- `1`: Critical errors found (deployment blocked)

### 2. Development Testing (`test-dev.js`)

Sets up a complete development environment with hot-reload.

**What it does:**
- 🏗️  Creates isolated test vault
- 🔗 Sets up plugin symlinks for hot-reload
- ⚙️  Configures Obsidian settings and hotkeys
- 👀 Monitors file changes for automatic rebuilds
- 🚀 Opens test vault in Obsidian
- 📝 Creates sample documents for testing

**Usage:**
```bash
npm run dev-test
# Press Ctrl+C to stop
```

**Test vault location:**
```
./test-vault/
├── .obsidian/
│   └── plugins/ (symlinked to ./plugins/)
├── Test Notes/
│   ├── Welcome.md
│   └── Sample Document.md
└── Templates/
```

**Hot-reload workflow:**
1. Edit TypeScript files in `plugins/*/src/`
2. Files automatically rebuild on save
3. Press `Ctrl+R` in Obsidian to reload plugins
4. Test changes immediately

### 3. Health Check (`health-check.js`)

Comprehensive integration and compatibility testing.

**What it checks:**
- 🌍 Node.js and npm environment
- 📦 Project dependencies integrity
- 📝 TypeScript compilation
- 🔨 Plugin build processes
- 🔌 Plugin loading simulation
- 🔗 Integration issue detection
- 🆔 Duplicate plugin ID prevention

**Usage:**
```bash
npm run health
# or
node scripts/health-check.js
```

**Common issues it catches:**
- Missing dependencies
- TypeScript compilation errors
- Build configuration problems
- Plugin loading failures
- Integration conflicts

### 4. Pre-Deployment Verification (`pre-deploy.js`)

Complete deployment readiness verification and packaging.

**What it does:**
- ✅ Runs full validation suite
- 🏥 Executes health checks
- 🔨 Builds all plugins for production
- 📦 Creates individual plugin packages
- 📦 Creates complete Writerr suite package
- 🔍 Verifies package integrity
- 📋 Generates deployment manifest

**Usage:**
```bash
npm run pre-deploy
```

**Output:**
```
dist/
├── track-edits-v1.0.0.zip
├── writerr-chat-v1.0.0.zip  
├── ai-editorial-functions-v1.0.0.zip
├── writerr-obsidian-plugins-v1.0.0.zip (complete suite)
├── deployment-manifest.json
└── INSTALLATION.md
```

## Development Workflow

### Daily Development

1. **Start development environment:**
   ```bash
   npm run dev-test
   ```

2. **Make changes to plugin source files**

3. **Files rebuild automatically** - watch console for build status

4. **Test in Obsidian:**
   - Press `Ctrl+R` to reload plugins
   - Test functionality in the test vault
   - Use sample documents for validation

### Before Committing

```bash
# Run comprehensive validation
npm run test:full

# Fix any issues found
# Commit only when all tests pass
```

### Before Deployment

```bash
# Generate deployment packages
npm run pre-deploy

# Verify all checks passed
# Deploy packages from dist/ directory
```

## Test Vault Features

The development environment creates a test vault with:

### Sample Documents

- **Welcome.md**: Introduction and testing instructions
- **Sample Document.md**: Content for testing different writing types:
  - Academic writing samples
  - Fiction writing samples  
  - Business writing samples
  - Technical writing samples with code

### Pre-configured Hotkeys

- `Cmd+Shift+C`: Toggle Writerr Chat
- `Cmd+Shift+T`: Toggle Track Edits

### Plugin Configuration

All plugins are automatically enabled with sensible defaults for testing.

## Troubleshooting

### Common Issues

**Build failures:**
```bash
# Check TypeScript compilation
npm run typecheck

# Clean and rebuild
npm run clean
npm run build:all
```

**Development environment issues:**
```bash
# Remove test vault and recreate
rm -rf test-vault
npm run dev-test
```

**Package creation failures:**
```bash
# Install missing dependencies
npm install

# Check that archiver is installed
npm list archiver
```

### Health Check Failures

The health check script provides specific fixes for common issues:

- **Node.js version**: Upgrade to Node.js 16+
- **Missing dependencies**: Run `npm install`
- **TypeScript errors**: Fix compilation errors
- **Build configuration**: Check esbuild configuration

## Continuous Integration

For CI/CD pipelines, use:

```bash
# Install dependencies
npm ci

# Run comprehensive validation
npm run test:full

# Generate deployment packages
npm run pre-deploy
```

## Best Practices

### Plugin Development

1. **Always test locally** with `npm run dev-test`
2. **Run validation frequently** with `npm run validate`
3. **Fix health issues immediately** with `npm run health`
4. **Use semantic versioning** in manifest.json
5. **Keep builds clean** - commit only source files

### Testing Strategy

1. **Structure validation**: Ensure all required files exist
2. **Build validation**: Verify plugins compile correctly
3. **Integration testing**: Test plugin interactions
4. **Manual testing**: Use test vault for user experience testing
5. **Pre-deployment**: Always run full verification before releases

## Script Architecture

### Validation Pipeline

```
validate-plugins.js
├── File Structure Check
├── Manifest Validation
├── Build Verification  
├── CSS Validation
└── TypeScript Structure

health-check.js
├── Environment Check
├── Dependencies Check
├── Compilation Test
├── Build Test
├── Loading Simulation
└── Integration Check

pre-deploy.js
├── Run Validation Suite
├── Run Health Checks
├── Production Build
├── Package Creation
├── Integrity Verification
└── Manifest Generation
```

### File Watchers (dev-test.js)

```
File Change Detection
├── TypeScript Files (*.ts)
├── Automatic Rebuild
├── Console Notifications
└── Hot-Reload Ready
```

This comprehensive testing system ensures that Writerr plugins maintain high quality and reliability throughout the development lifecycle.