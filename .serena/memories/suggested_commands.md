# Writerr 1.0 Development Commands

## Essential Build Commands

### Development Build
```bash
cd writerr-plugins
npm run build:all        # Build all plugins in development mode
npm run dev              # Development mode with watch
```

### Individual Plugin Builds
```bash
npm run build:track-edits              # Build Track Edits plugin only
npm run build:writerr-chat             # Build Writerr Chat plugin only  
npm run build:ai-editorial-functions   # Build AI Editorial Functions plugin only
```

### Production Build
```bash
npm run build:prod:all                 # Build all plugins for production (minified)
npm run build:prod:track-edits         # Production build for Track Edits
npm run build:prod:writerr-chat        # Production build for Writerr Chat
npm run build:prod:ai-editorial-functions # Production build for AI Editorial Functions
```

## Quality Assurance

### Type Checking
```bash
npm run typecheck        # Run TypeScript compiler without emitting files
```

### Code Linting
```bash
npm run lint            # Run ESLint on all plugin source files
```

### Testing & Validation
```bash
npm run test            # Run basic build test (builds all plugins)
npm run test:full       # Comprehensive test suite (validate + health + test)
npm run validate        # Validate plugin manifests and structure
npm run health          # Run health checks on plugins
```

## Maintenance Commands

### Cleanup
```bash
npm run clean           # Remove all build artifacts and compiled files
```

### Development Tools
```bash
npm run dev-test        # Development testing utilities
npm run pre-deploy      # Pre-deployment validation and checks
npm run package         # Package plugins for distribution
```

## File Watching & Development

### Development Workflow
1. `npm run clean` - Clear previous builds
2. `npm run dev` - Start development mode with file watching
3. Make changes to plugin source files
4. Files auto-rebuild on save
5. Test in Obsidian with hot reload

### Quality Check Workflow
1. `npm run typecheck` - Verify TypeScript compilation
2. `npm run lint` - Check code quality and style
3. `npm run test:full` - Run comprehensive validation
4. `npm run build:prod:all` - Final production build

## Plugin Installation Testing
After building, manually copy plugin folders from `writerr-plugins/plugins/` to Obsidian's `.obsidian/plugins/` directory for testing.

## System Commands (Darwin/macOS)
- `ls -la` - List files with details
- `find . -name "*.ts"` - Find TypeScript files
- `grep -r "pattern" src/` - Search in source files
- `git status` - Check repository status