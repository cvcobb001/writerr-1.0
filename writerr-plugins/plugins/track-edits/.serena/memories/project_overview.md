# Track Edits Plugin - Project Overview

## Purpose
Track Edits is a foundational component of the Writerr AI Editorial Platform for Obsidian. It provides comprehensive visual tracking and intelligent clustering of all document changes, creating a universal pipeline for text modifications from any source (AI, manual edits, or other plugins).

## Key Features
- Real-time visual tracking of document changes with color-coded editor decorations
- Comprehensive editing analytics and revision insights
- Intelligent clustering of related changes for batch processing
- Enhanced Change Attribution System with AI metadata
- Timeline panel for managing changes with confidence scores
- Universal pipeline for all text modifications

## Tech Stack
- **Language**: TypeScript
- **Framework**: Obsidian Plugin API
- **Editor**: CodeMirror 6 (StateField, ViewPlugin, Decorations)
- **Testing**: Jest with ts-jest preset
- **Environment**: jsdom for DOM testing
- **Build**: JavaScript compilation via Obsidian's build system

## Architecture
- Plugin entry point: `src/main.ts` (TrackEditsPlugin class)
- Core tracking: `src/edit-tracker.ts` (EditTracker)
- Visual rendering: `src/edit-renderer.ts` (EditRenderer)
- UI Panel: `src/side-panel-view.ts` (EditSidePanelView)
- Clustering logic: `src/edit-cluster-manager.ts` (EditClusterManager)
- Query system: `src/queries/` directory
- Validation: `src/validation/` directory
- Component tests: `src/__tests__/` directory