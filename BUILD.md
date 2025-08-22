# Writerr Obsidian Plugins - Build System

This document describes the build system for the Writerr AI Editorial Platform Obsidian plugins.

## Quick Start

```bash
# Install dependencies
npm install

# Build all plugins for development
npm run build

# Build all plugins for production (minified)
npm run build:prod

# Start development mode with file watching
npm run dev

# Package plugins for distribution
npm run package
```

## Architecture

### Plugins

The project contains three Obsidian plugins:

1. **Track Edits** - Real-time visual tracking of document changes
2. **Writerr Chat** - AI-powered writing assistant with contextual chat
3. **AI Editorial Functions** - Specialized AI writing tools for different writing modes

### Technology Stack

- **Language:** TypeScript (strict mode)
- **Build Tool:** esbuild (fast compilation and bundling)
- **Package Manager:** npm
- **Runtime:** Obsidian Plugin API v1.0+
- **Module System:** CommonJS (required by Obsidian)
- **Target:** ES2018

## Project Structure

```
ccpm/
├── package.json              # Root package with build scripts
├── tsconfig.json            # TypeScript configuration
├── esbuild.config.js        # esbuild configuration
├── scripts/                 # Build and development scripts
│   ├── build.js            # Production build script
│   ├── dev.js              # Development watch mode
│   └── package.js          # Distribution packaging
├── shared/                  # Shared types and utilities
│   ├── types/index.ts      # Common TypeScript interfaces
│   └── utils/index.ts      # Utility functions
└── plugins/                 # Individual plugin directories
    ├── track-edits/
    │   ├── manifest.json   # Plugin metadata
    │   ├── main.js         # Compiled plugin (generated)
    │   ├── styles.css      # Plugin styles
    │   └── src/            # TypeScript source code
    ├── writerr-chat/
    └── ai-editorial-functions/
```

## Build Scripts

### Development Commands

```bash
# Start file watching for all plugins
npm run dev

# Build individual plugins in development mode
npm run build:track-edits
npm run build:writerr-chat
npm run build:ai-editorial-functions
```

### Production Commands

```bash
# Build all plugins for production
npm run build:prod

# Build individual plugins for production
npm run build:prod:track-edits
npm run build:prod:writerr-chat
npm run build:prod:ai-editorial-functions
```

### Utility Commands

```bash
# Type check without building
npm run typecheck

# Lint TypeScript files
npm run lint

# Clean build artifacts
npm run clean

# Run tests (type check + build)
npm run test

# Package for distribution
npm run package
```

## Development Workflow

### 1. Development Mode

Start development mode to automatically rebuild on file changes:

```bash
npm run dev
```

This starts file watchers for all plugins and displays helpful instructions for Obsidian development.

### 2. Plugin Installation

Copy plugin folders to your Obsidian vault:

```bash
# For each plugin, copy to:
[YourVault]/.obsidian/plugins/[plugin-name]/
```

### 3. Hot Reload

In Obsidian:
1. Enable Developer mode in Community Plugins settings
2. Use Ctrl+R (Cmd+R on Mac) to reload without saving
3. Or disable/enable plugins to reload changes

## Build Configuration

### esbuild Settings

- **Target:** ES2018 (compatible with Obsidian)
- **Format:** CommonJS (required by Obsidian)
- **External:** `obsidian` module (provided by Obsidian)
- **Bundle:** All dependencies except externals
- **Sourcemap:** Enabled in development
- **Minify:** Enabled in production builds

### TypeScript Settings

- **Strict mode:** Enabled
- **Target:** ES2018
- **Module:** CommonJS
- **Declaration:** Enabled
- **Source maps:** Enabled
- **Path mapping:** Configured for shared modules

## Distribution

### Individual Plugin Packages

Each plugin is packaged as a separate ZIP file containing:
- `main.js` - Compiled plugin code
- `manifest.json` - Plugin metadata
- `styles.css` - Plugin styles

### Combined Package

A single ZIP file containing all plugins for easy installation.

### Package Structure

```
dist/
├── track-edits/
├── writerr-chat/
├── ai-editorial-functions/
├── track-edits-1.0.0.zip
├── writerr-chat-1.0.0.zip
├── ai-editorial-functions-1.0.0.zip
└── writerr-obsidian-plugins.zip
```

## Plugin Inter-communication

Plugins communicate through a global API (`window.WriterrlAPI`) that provides:

- **Track Edits API:** Access to editing sessions and history
- **Chat API:** AI conversation management
- **Editorial Functions API:** Access to writing tools and modes

## Troubleshooting

### Common Issues

1. **TypeScript Errors:** Run `npm run typecheck` to see all type issues
2. **Build Failures:** Check that all required files exist in plugin directories
3. **Plugin Not Loading:** Verify `manifest.json` and `main.js` are present
4. **Hot Reload Issues:** Some changes require plugin disable/enable cycle

### Debug Mode

Enable Obsidian Developer Tools (Ctrl+Shift+I) to:
- View console errors and logs
- Debug TypeScript with source maps
- Monitor plugin loading and execution

## Performance

### Build Times

- **Development build:** ~500ms for all plugins
- **Production build:** ~800ms with minification
- **Watch mode:** ~50ms incremental builds

### Bundle Sizes

- **Track Edits:** ~11KB (production)
- **Writerr Chat:** ~19KB (production)
- **AI Editorial Functions:** ~28KB (production)

## Contributing

### Code Style

- Use TypeScript strict mode
- Follow existing naming conventions
- Add JSDoc comments for public APIs
- Include error handling for all async operations

### Testing

Before submitting changes:
1. Run `npm run test` to verify builds
2. Test in actual Obsidian environment
3. Check plugin loading and core functionality
4. Verify cross-plugin communication works

### Adding New Plugins

1. Create plugin directory under `plugins/`
2. Add `manifest.json` with plugin metadata
3. Create `src/main.ts` extending Obsidian's Plugin class
4. Add build scripts to `package.json`
5. Update this documentation

## License

MIT License - See main project LICENSE file for details.