# Writerr 1.0 Tech Stack

## Context

This document defines the technology stack for **Writerr** - a writing HUD that enhances rather than replaces the writer's creative process. Like a pilot's heads-up display, Writerr provides ambient awareness and contextual assistance through a sophisticated Obsidian plugin suite with constraint-based processing architecture.

## Core Platform Architecture

- **Platform Type**: Obsidian Plugin Suite (Desktop Application)
- **Target Platform**: Obsidian v1.4.16+ (Electron-based)
- **Architecture Pattern**: Multi-Plugin Modular Architecture
- **Plugin Communication**: Event-driven with global API registry
- **Distribution**: Direct plugin installation + GitHub releases

## Language & Runtime

- **Primary Language**: TypeScript 5.3+
- **Target**: ES2018 (for Obsidian compatibility)
- **Module System**: CommonJS (required by Obsidian)
- **Runtime Environment**: Electron/Node.js (via Obsidian)
- **Node Version**: 16+ (development requirement)

## Core Dependencies

- **Obsidian API**: v1.4.16+ (plugin platform)
- **CodeMirror**: State/View extensions (editor integration)
- **Lucide Icons**: React components for UI icons
- **AI Provider APIs**: OpenAI, Anthropic, OpenRouter integration

## Build System & Development

- **Build Tool**: esbuild 0.19.8 (ultra-fast bundling)
- **Package Manager**: npm with package-lock.json
- **TypeScript Config**: Strict mode with comprehensive checking
- **Bundling Strategy**: Individual plugin bundles with shared externals
- **Source Maps**: Full source map generation for debugging
- **Hot Reload**: Development mode with file watching

## Code Quality & Standards

- **Linting**: ESLint with TypeScript plugin (@typescript-eslint/*)
- **Type Checking**: Strict TypeScript with all checks enabled
- **Code Style**: Enforced via ESLint configuration
- **Path Mapping**: Alias-based imports (@shared/*, @plugin-name/*)
- **Error Handling**: Circuit breaker patterns with graceful degradation

## Plugin Architecture Components

### 1. Editorial Engine (Core)
- **Purpose**: Constraint processing and mode registry
- **Architecture**: Event-driven with adapter pattern
- **Key Features**: Natural language rule compilation, platform coordination

### 2. Writerr Chat (Interface)
- **Purpose**: Conversational AI interface
- **Architecture**: Component-based UI with state management
- **Key Features**: Context-aware conversations, mode switching

### 3. Track Edits (Visualization)
- **Purpose**: Change tracking and visual feedback
- **Architecture**: CodeMirror extension with decoration system
- **Key Features**: Real-time edit tracking, accept/reject UI

### 4. Token Count (Utility)
- **Purpose**: AI token management and capacity tracking
- **Architecture**: Service-based with caching layer
- **Key Features**: Model-specific tokenization, dynamic limits

## Development Workflow

- **Build Commands**: Individual and aggregate build targets
- **Testing Strategy**: Validation scripts + health checks
- **Development Mode**: Live reload with timestamp-based cache busting
- **Production Build**: Minified bundles with optimizations
- **Quality Assurance**: Type checking + linting + validation pipeline

## Data & State Management

- **Local Storage**: Obsidian's native data persistence
- **Settings Management**: Plugin-specific settings with cross-plugin coordination
- **Session State**: In-memory state with optional persistence
- **Event Bus**: WritterrEventBus for cross-plugin communication
- **Global API**: window.Writerr namespace for platform integration

## Security & Performance

- **Input Validation**: Comprehensive sanitization patterns
- **API Security**: Token-based authentication for AI providers
- **Performance Monitoring**: Built-in metrics and circuit breakers
- **Resource Management**: Proper cleanup and memory management
- **Error Isolation**: Plugin-level error boundaries

## Deployment & Distribution

- **Distribution Method**: GitHub releases + manual installation
- **Plugin Format**: Standard Obsidian plugin structure (manifest.json)
- **Installation Process**: Copy to .obsidian/plugins/ directory
- **Update Mechanism**: Version checking with manual updates
- **Configuration**: Plugin settings UI within Obsidian

## External Integrations

- **AI Providers**: OpenAI GPT-4, Anthropic Claude, OpenRouter
- **API Management**: Token counting and capacity management
- **File System**: Obsidian vault integration for document access
- **Editor Integration**: Deep CodeMirror integration for real-time features

## Development Environment

- **IDE Requirements**: TypeScript support, ESLint integration
- **Build Performance**: Sub-second incremental builds via esbuild
- **Debugging**: Full source map support with browser devtools
- **Testing**: Manual testing within Obsidian environment
- **Version Control**: Git with conventional commit patterns

## Future Considerations

- **Mobile Support**: Obsidian Mobile plugin compatibility
- **Cloud Sync**: Optional cloud storage for settings/modes
- **Plugin Ecosystem**: Third-party developer API
- **Performance Optimization**: Bundle splitting and lazy loading
- **Testing Infrastructure**: Automated testing framework for plugins

## Architecture Rationale

This tech stack is optimized for:

1. **HUD Philosophy**: Silent but available information display that respects creative flow states
2. **Platform Integration**: Deep Obsidian/CodeMirror integration for ambient awareness
3. **Performance**: Fast builds and responsive UI that fades into background during flow
4. **Maintainability**: Strict TypeScript and modular architecture with separation of concerns
5. **Extensibility**: Plugin architecture with clean interfaces for third-party integration
6. **Developer Experience**: Fast feedback loops and comprehensive tooling
7. **Enhanced Perception**: Architecture that shows patterns and insights without interrupting creative process

The choice of esbuild over webpack/vite provides sub-second build times essential for rapid plugin development, while the strict TypeScript configuration ensures code quality and maintainability at scale. The multi-plugin architecture maintains clean separation between informational AI (panels) and document changes (always through Track Edits), embodying the core HUD principle of enhanced perception rather than AI replacement.