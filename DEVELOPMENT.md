# Development Workflow - Writerr Plugin Suite

> **Last Updated:** [Date]  
> **Target Audience:** Developers, Contributors, Maintainers

This document outlines the development workflow, hot-reload setup, debugging practices, and deployment procedures for the Writerr plugin suite.

## Table of Contents

1. [Development Environment Setup](#development-environment-setup)
2. [Hot-Reload Development](#hot-reload-development)  
3. [Debugging and Troubleshooting](#debugging-and-troubleshooting)
4. [Testing Workflow](#testing-workflow)
5. [Quick Fix Deployment](#quick-fix-deployment)
6. [Version Management](#version-management)
7. [Code Quality and Standards](#code-quality-and-standards)
8. [CI/CD Pipeline](#cicd-pipeline)

## Development Environment Setup

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v8.0.0 or higher  
- **Obsidian**: Latest stable version
- **Git**: Latest version
- **VSCode**: Recommended editor with extensions

### Required VSCode Extensions

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss", 
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "GitHub.copilot",
    "ms-vscode.vscode-json"
  ]
}
```

### Initial Setup

```bash
# Clone the repository
git clone [repository-url]
cd writerr-plugin-suite

# Install dependencies
npm install

# Set up development environment
npm run setup:dev

# Verify installation
npm run typecheck
npm test
```

### Development Vault Setup

1. **Create isolated development vault**:
   ```bash
   # Create development vault directory
   mkdir ~/obsidian-dev-vault
   
   # Copy test content
   cp -r test-vault/* ~/obsidian-dev-vault/
   
   # Create .obsidian directory
   mkdir ~/obsidian-dev-vault/.obsidian
   mkdir ~/obsidian-dev-vault/.obsidian/plugins
   ```

2. **Link plugins to development vault**:
   ```bash
   # Create symbolic links for hot-reload
   ln -s $(pwd)/plugins/track-edits ~/obsidian-dev-vault/.obsidian/plugins/
   ln -s $(pwd)/plugins/writerr-chat ~/obsidian-dev-vault/.obsidian/plugins/
   ln -s $(pwd)/plugins/ai-editorial-functions ~/obsidian-dev-vault/.obsidian/plugins/
   ```

3. **Open development vault in Obsidian**:
   - Launch Obsidian
   - Choose "Open folder as vault"
   - Select `~/obsidian-dev-vault`
   - Enable Community Plugins
   - Enable the three Writerr plugins

## Hot-Reload Development

### Starting Development Mode

```bash
# Start hot-reload for all plugins
npm run dev

# Or start individual plugin development
npm run dev:track-edits
npm run dev:writerr-chat  
npm run dev:ai-editorial-functions
```

### Hot-Reload Process

The development workflow uses esbuild's watch mode for fast rebuilds:

```typescript
// esbuild.config.dev.js
const context = await esbuild.context({
  entryPoints: ['plugins/*/src/main.ts'],
  bundle: true,
  external: ['obsidian'],
  outdir: 'plugins',
  format: 'cjs',
  target: 'es2018',
  sourcemap: true,
  watch: {
    onRebuild(error, result) {
      if (error) {
        console.error('Build failed:', error);
      } else {
        console.log('✓ Rebuild complete');
        // Trigger Obsidian reload if using reload plugin
        triggerObsidianReload();
      }
    }
  }
});
```

### Obsidian Reload Integration

For fastest development, use the Hot Reload plugin or manual refresh:

**Option 1: Hot Reload Plugin** (Recommended)
```bash
# Install hot reload plugin
npm install -g obsidian-hot-reload-plugin

# Enable automatic reloading
echo "{ \"hotReload\": true }" > ~/obsidian-dev-vault/.obsidian/hotreload.json
```

**Option 2: Manual Reload**  
- Use `Ctrl+R` (Cmd+R on Mac) to reload plugins
- Or use Command Palette: "Reload plugins"

### Development Commands

```bash
# Development with hot reload
npm run dev              # All plugins
npm run dev:watch        # Watch mode only
npm run dev:clean        # Clean and restart

# Building
npm run build            # Production build
npm run build:dev        # Development build with sourcemaps
npm run build:plugin -- track-edits  # Build specific plugin

# Testing during development
npm run test:watch       # Run tests in watch mode
npm run test:plugin -- track-edits   # Test specific plugin
npm run test:integration # Integration tests

# Linting and formatting
npm run lint             # ESLint check
npm run lint:fix         # Auto-fix linting issues
npm run format           # Prettier formatting

# Type checking
npm run typecheck        # TypeScript validation
npm run typecheck:watch  # Watch mode type checking
```

## Debugging and Troubleshooting

### Browser Developer Tools

1. **Open Obsidian Developer Tools**:
   - `Ctrl+Shift+I` (Windows/Linux)
   - `Cmd+Option+I` (Mac)
   - Or use `View > Toggle Developer Tools`

2. **Useful Console Commands**:
   ```javascript
   // Check plugin status
   app.plugins.enabledPlugins
   
   // Access plugin instances
   app.plugins.plugins['track-edits']
   
   // Monitor events
   app.workspace.on('file-open', (file) => console.log('File opened:', file.path))
   
   // Check global APIs
   console.log('Track Edits API:', window.TrackEdits)
   console.log('Writer Chat API:', window.WriterChat)
   ```

### Debugging Specific Issues

#### Plugin Loading Issues
```bash
# Check plugin manifest
cat plugins/track-edits/manifest.json

# Verify main.js exists and is recent
ls -la plugins/track-edits/main.js

# Check for TypeScript errors
npm run typecheck

# Rebuild specific plugin
npm run build:track-edits
```

#### Performance Issues  
```javascript
// Monitor memory usage
console.log('Memory usage:', performance.memory);

// Profile plugin operations
console.time('Edit tracking');
// ... plugin operation
console.timeEnd('Edit tracking');

// Check for memory leaks
app.workspace.trigger('quit');
// Check if memory usage drops
```

#### API Integration Issues
```javascript
// Test AI provider connection
const testConnection = async () => {
  const response = await fetch('https://api.openai.com/v1/models', {
    headers: { 'Authorization': 'Bearer ' + apiKey }
  });
  console.log('Connection status:', response.status);
};

// Debug context passing
window.WriterChat?.sendMessage('test', { debug: true });
```

### Logging and Error Handling

```typescript
// Structured logging for development
class DevLogger {
  static debug(component: string, message: string, data?: any) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${component}] ${message}`, data);
    }
  }
  
  static error(component: string, error: Error, context?: any) {
    console.error(`[${component}] ERROR:`, error.message, {
      stack: error.stack,
      context
    });
  }
}

// Usage in plugins
DevLogger.debug('TrackEdits', 'Recording change', { change, timestamp });
DevLogger.error('WriterChat', error, { prompt, provider });
```

## Testing Workflow

### Pre-Development Testing

```bash
# Run full test suite before making changes
npm test

# Run specific test categories  
npm run test:unit
npm run test:integration
npm run test:performance

# Test with coverage
npm run test:coverage
```

### Development Testing

```bash
# Watch mode for rapid feedback
npm run test:watch

# Test specific components
npm run test -- --testNamePattern="TrackEdits"
npm run test -- plugins/track-edits/src/

# Lint and type check
npm run lint && npm run typecheck
```

### Manual Testing Checklist

Use the comprehensive testing checklist in `test-vault/Configuration/Testing Checklist.md`:

1. **Quick Smoke Test** (5 minutes):
   - [ ] All plugins load without errors
   - [ ] Basic functionality works
   - [ ] No console errors

2. **Feature Testing** (15 minutes):
   - [ ] Core features of each plugin
   - [ ] Plugin integration
   - [ ] Settings persistence

3. **Edge Case Testing** (20 minutes):
   - [ ] Large documents
   - [ ] Special characters
   - [ ] Error conditions

### Automated Testing in Development

```typescript
// Example test for development workflow
describe('Development Workflow', () => {
  it('should reload plugins without errors', async () => {
    const initialPlugin = app.plugins.plugins['track-edits'];
    expect(initialPlugin).toBeDefined();
    
    // Simulate plugin reload
    await app.plugins.disablePlugin('track-edits');
    await app.plugins.enablePlugin('track-edits');
    
    const reloadedPlugin = app.plugins.plugins['track-edits'];
    expect(reloadedPlugin).toBeDefined();
    expect(reloadedPlugin.settings).toEqual(initialPlugin.settings);
  });
});
```

## Quick Fix Deployment

### Hotfix Workflow

For critical issues that need immediate deployment:

```bash
# 1. Create hotfix branch
git checkout -b hotfix/critical-memory-leak
git push -u origin hotfix/critical-memory-leak

# 2. Make minimal changes
# Edit only necessary files
# Add focused tests

# 3. Test thoroughly
npm run test
npm run build:prod
# Manual testing in development vault

# 4. Version bump
npm version patch  # Updates package.json and creates git tag

# 5. Build and package
npm run package

# 6. Create pull request
# Include detailed description of fix
# Reference issue number
# Include test results

# 7. After approval and merge
git checkout main
git pull origin main
npm run deploy:patch
```

### Emergency Deployment

For critical security or stability issues:

```bash
# Skip normal review for emergencies
git checkout main
git pull origin main

# Make fix directly on main (with team approval)
# ... make changes ...

# Quick test and deploy
npm run test:critical
npm version patch
npm run deploy:emergency

# Create post-deployment PR for review
git checkout -b post-deploy/emergency-fix
# Document changes made
# Add comprehensive tests
```

### Rollback Procedure

If a deployment causes issues:

```bash
# 1. Identify last known good version
git tag | grep -E "v[0-9]+\.[0-9]+\.[0-9]+$" | sort -V | tail -2

# 2. Revert to previous version
git checkout v1.0.1  # or last known good version
npm run package
npm run deploy:rollback

# 3. Communicate rollback
# Update status page
# Notify users via appropriate channels
# Create incident report

# 4. Fix issue on separate branch
git checkout -b fix/rollback-issue
# Make comprehensive fix
# Add extensive tests
```

## Version Management

### Versioning Strategy

We use [Semantic Versioning](https://semver.org/):

- **Major (X.0.0)**: Breaking changes, API changes
- **Minor (1.X.0)**: New features, backwards compatible
- **Patch (1.0.X)**: Bug fixes, small improvements

### Version Update Process

```bash
# Patch release (bug fixes)
npm version patch
# Updates: 1.0.0 → 1.0.1

# Minor release (new features)  
npm version minor
# Updates: 1.0.1 → 1.1.0

# Major release (breaking changes)
npm version major
# Updates: 1.1.0 → 2.0.0

# Pre-release versions
npm version prerelease --preid=beta
# Updates: 1.0.0 → 1.0.1-beta.0
```

### Release Checklist

Before creating a release:

- [ ] All tests passing
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Known issues documented
- [ ] Performance benchmarks run
- [ ] Security scan completed
- [ ] Breaking changes documented
- [ ] Migration guide created (if needed)

### Manifest Version Sync

Ensure plugin manifests stay in sync:

```javascript
// scripts/sync-versions.js
const packageJson = require('./package.json');
const fs = require('fs');

const plugins = ['track-edits', 'writerr-chat', 'ai-editorial-functions'];

plugins.forEach(plugin => {
  const manifestPath = `plugins/${plugin}/manifest.json`;
  const manifest = JSON.parse(fs.readFileSync(manifestPath));
  manifest.version = packageJson.version;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
});
```

## Code Quality and Standards

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2018",
    "lib": ["dom", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": [
    "plugins/*/src/**/*",
    "shared/**/*",
    "types/**/*"
  ],
  "exclude": [
    "node_modules",
    "plugins/*/main.js"
  ]
}
```

### ESLint Configuration

```json
// .eslintrc.json
{
  "extends": [
    "eslint:recommended",
    "@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

### Pre-commit Hooks

```json
// .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npm run lint
npm run typecheck
npm run test:quick
```

### Code Review Guidelines

1. **All changes require review** except emergencies
2. **Automated checks must pass** before review
3. **Test coverage** should not decrease
4. **Documentation** updated for user-facing changes
5. **Breaking changes** require team discussion

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20]
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test
      - run: npm run build
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run build:prod
      - run: npm run package
      
      - name: Create Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: v${{ env.VERSION }}
          release_name: Release v${{ env.VERSION }}
          draft: false
          prerelease: false
```

### Deployment Scripts

```bash
# scripts/deploy.sh
#!/bin/bash
set -e

echo "Starting deployment process..."

# Build production version
npm run build:prod

# Run final tests
npm run test

# Package plugins
npm run package

# Create release artifacts
tar -czf writerr-plugins-${VERSION}.tar.gz dist/

echo "Deployment complete!"
```

### Monitoring and Alerts

- **Performance Monitoring**: Track plugin performance metrics
- **Error Tracking**: Monitor error rates and types  
- **User Feedback**: Collect and analyze user reports
- **Usage Analytics**: Understand feature adoption

---

## Development Best Practices

### Performance Considerations

- Use debouncing for rapid user inputs
- Implement lazy loading for large datasets
- Cache computed results when appropriate
- Profile memory usage regularly
- Optimize bundle size

### Security Guidelines

- Never commit API keys or secrets
- Validate all user inputs
- Use secure communication protocols
- Implement proper error handling
- Regular security dependency updates

### Documentation Standards

- Keep README files current
- Document all public APIs
- Include usage examples
- Maintain changelog
- Update troubleshooting guides

### User Experience Focus

- Prioritize workflow preservation
- Provide clear feedback
- Handle errors gracefully
- Maintain consistent interfaces
- Test with real user scenarios

---

**For development questions or issues, contact: dev-team@writerr.ai**