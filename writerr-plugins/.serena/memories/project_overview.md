# Writerr Platform Overview

**Purpose**: Professional AI editorial suite for Obsidian that provides writers complete, granular control over AI-assisted editing through a constraint-based processing architecture.

**Tech Stack**: 
- TypeScript
- esbuild for bundling
- Obsidian Plugin API
- Node.js (>=16)

**Architecture**: Three-plugin platform:
- editorial-engine: Core constraint processing system
- writerr-chat: AI chat interface
- ai-editorial-functions: Editorial functions
- track-edits: Edit tracking functionality

**Build System**: esbuild with individual plugin build commands