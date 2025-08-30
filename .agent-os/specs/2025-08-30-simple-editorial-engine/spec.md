# Spec Requirements Document

> Spec: Simple Editorial Engine Replacement
> Created: 2025-08-30
> Status: Planning

## Overview

Replace the current overly complex Editorial Engine with a simplified version that eliminates constraint compilation, validation rules, and natural language processing overhead that is causing empty change objects `{from: 0, to: 0, text: ""}` to be sent instead of real AI corrections.

The new simplified Editorial Engine will focus solely on the core pipeline: reading mode files, diffing AI corrections against original text, and passing individual changes to Million Monkeys sequential processor for Track Edits decoration.

## User Stories

As a writer using Writerr Chat, I want AI corrections to actually appear as tracked changes in my document, so that I can review and accept/reject individual edits instead of receiving empty change objects.

As a developer maintaining the Editorial Engine, I want a simplified architecture without complex constraint compilation, so that the system is more reliable and easier to debug.

As a plugin integrator, I want the existing adapter registration and Chat integration to continue working unchanged, so that the replacement is seamless and backward compatible.

## Spec Scope

- **Core Pipeline**: Read mode files from existing `/modes/` directory
- **Diff Processing**: Take AI corrections and diff them against original text to identify specific changes
- **Sequential Processing**: Pass individual changes to Million Monkeys sequential processor
- **Track Edits Integration**: Ensure changes appear as decorations in the editor
- **Backward Compatibility**: Preserve existing adapter registration system
- **Chat Integration**: Maintain current Chat plugin integration points
- **Mode File Support**: Continue supporting existing mode file format and loading

## Out of Scope

- **Constraint Compilation**: Remove complex constraint compilation system
- **Validation Rules**: Eliminate validation rule processing
- **Natural Language Processing**: Remove NLP parsing overhead
- **Advanced Features**: No new "smart" features that could introduce complexity
- **Mode File Format Changes**: Keep existing mode file structure unchanged
- **API Changes**: Maintain existing public API surface for other plugins

## Expected Deliverable

A simplified Editorial Engine plugin that:
1. Successfully processes AI corrections into individual tracked changes
2. Eliminates empty change objects `{from: 0, to: 0, text: ""}`
3. Maintains all existing integration points with Chat and Million Monkeys
4. Reduces codebase complexity by removing constraint processing overhead
5. Provides reliable diff-based change detection
6. Preserves mode file compatibility

## Spec Documentation

- Tasks: @.agent-os/specs/2025-08-30-simple-editorial-engine/tasks.md
- Technical Specification: @.agent-os/specs/2025-08-30-simple-editorial-engine/sub-specs/technical-spec.md