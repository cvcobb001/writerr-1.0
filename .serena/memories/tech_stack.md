# Writerr 1.0 Tech Stack

## Primary Technologies

### Core Framework
- **Obsidian Plugin API**: Native Obsidian plugin development
- **TypeScript**: Primary development language with strict typing
- **CodeMirror 6**: Editor extensions and decorations for Track Edits

### Build System
- **esbuild**: Fast bundling and compilation
- **Target**: ES2018, CommonJS modules
- **Build Modes**: Development and production builds with minification

### Development Tools
- **TypeScript Compiler**: Version 5.3.0 with strict configuration
- **ESLint**: Code linting (configuration to be verified)
- **Node.js**: Version >=16 required

### Plugin Architecture
- **Monorepo Structure**: Multiple plugins in `writerr-plugins/` directory
- **Shared Utilities**: Common code in `writerr-plugins/shared/`
- **Path Aliases**: Module resolution with custom paths (@shared/, @track-edits/, etc.)

### External Dependencies
- **@codemirror/state & @codemirror/view**: For editor state management
- **Obsidian API**: Core platform integration
- **Built-in Modules**: Minimal external dependencies approach

## Project Structure
```
Writerr 1.0/
├── writerr-plugins/           # Main plugin suite
│   ├── plugins/              # Individual plugin implementations
│   │   ├── track-edits/      # Core change tracking plugin
│   │   ├── writerr-chat/     # AI chat interface plugin  
│   │   └── ai-editorial-functions/ # Editorial tools plugin
│   ├── shared/               # Common utilities and types
│   ├── package.json          # Build scripts and dependencies
│   └── tsconfig.json         # TypeScript configuration
├── docs/                     # Project documentation and specs
└── .serena/                  # Serena AI tooling configuration
```

## TypeScript Configuration
- **Strict Mode**: All strict options enabled
- **ES2018 Target**: Modern JavaScript with broad compatibility
- **Module Resolution**: Node.js style with custom path mapping
- **Source Maps**: Enabled for debugging
- **Declaration Files**: Generated for type checking