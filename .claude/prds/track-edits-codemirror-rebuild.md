---
name: track-edits-codemirror-rebuild
description: Complete rewrite of Track Edits plugin using CodeMirror-native architecture and V2.0 proven patterns
status: backlog
created: 2025-08-22T02:15:39Z
---

# PRD: track-edits-codemirror-rebuild

## Executive Summary

Complete rewrite of the Track Edits plugin using proven CodeMirror-native architecture from Writerr 2.0. This addresses fundamental architecture mismatches in our current implementation that prevent proper edit decoration, change detection, and user workflow. The rewrite adopts battle-tested patterns that provide bulletproof edit tracking with clean user experience.

**Value Proposition**: Replace broken abstraction-layer approach with native CodeMirror integration that actually works, giving users real-time visibility into every edit with intelligent clustering for review.

## Problem Statement

### What problem are we solving?

Our current Track Edits implementation suffers from fundamental architecture problems:

1. **Broken Decorations**: Using DOM overlays instead of native CodeMirror decorations causes position drift and visual artifacts
2. **Inferior Change Detection**: Cursor-based inference misses deletions, replacements, and provides inaccurate edit data
3. **Wrong Abstraction Level**: Built on Obsidian's wrapper APIs instead of CodeMirror primitives, fighting the underlying system
4. **Poor User Experience**: Verbose labeling, individual edit management, and unclear clustering confuse users

### Why is this important now?

1. **Proven Solution Exists**: Writerr 2.0 demonstrates the correct CodeMirror-native approach works reliably
2. **Core Functionality Broken**: Current implementation fails at basic edit tracking and visualization
3. **User Transparency Need**: "We want to see every AI keystroke that changes our words" - transparency for external text changes
4. **Development Efficiency**: Continuing with broken architecture wastes time on unfixable issues

## User Stories

### Primary User Persona: AI-Assisted Writer

**Context**: Writer using AI tools that modify their text and wants full transparency into changes

**Pain Points Being Addressed**:
- Cannot see persistent edit decorations in document
- Cannot distinguish between additions and deletions
- Overwhelming individual keystroke management
- Unclear clustering makes review difficult

### Core User Journey

**As an AI-assisted writer, I want to:**

1. **See Every Edit in Document**
   - See colored decorations for every text change as it happens
   - Distinguish additions (green) from deletions (red strikethrough)
   - Have decorations persist until I explicitly accept/reject them
   - See decorations that automatically adjust position as I continue typing

2. **Review Changes in Side Panel**
   - See intelligent clusters grouped by word/phrase boundaries
   - Review clean displays without verbose labels - just the text changes
   - Accept or reject entire word changes with ✓/✗ buttons
   - Have panel update in real-time as I type

3. **Manage AI Integration**
   - Toggle AI assistance on/off with simple switch
   - Use "Run Once" button for manual AI analysis when toggle is off
   - Get AI suggestions for unclear editing patterns when enabled

**Acceptance Criteria**:
- [ ] Type in document and see green decorations appear immediately on new text
- [ ] Delete text and see red strikethrough widgets where text was removed
- [ ] Decorations stay visible until manually accepted/rejected
- [ ] Side panel shows clustered changes with clean text display
- [ ] ✓ button removes decorations and keeps text as-is
- [ ] ✗ button reverts text changes and removes decorations
- [ ] AI toggle controls automatic analysis of unclear edits

## Requirements

### Functional Requirements

#### Core Features and Capabilities

**1. CodeMirror-Native Integration**
- Direct integration with `@codemirror/state` and `@codemirror/view`
- Register extensions via `this.registerEditorExtension([ViewPlugin, StateField])`
- Transaction-based change detection using `update.changes.iterChanges()`
- StateField decoration management with automatic position mapping

**2. Real-Time Edit Visualization**
- Mark decorations for text additions (green highlighting)
- Widget decorations for text deletions (red strikethrough at deletion point)
- Immediate decoration application (no batching)
- Automatic position updates as document changes

**3. Intelligent Change Detection**
- Separate delete/insert edits from transaction data
- Proper handling of text replacements as deletion + insertion
- Real-time edit capture without inference or guessing
- Clean reversion capability for rejected edits

**4. Smart Clustering Side Panel**
- Hybrid word replacement detection
- Word boundary analysis using `findWordStart()`/`findWordEnd()`
- 2-second time window + word boundary + type matching
- Real-time cluster updates (100ms batched)

**5. Clean User Interface**
- Cluster-level accept/reject operations (not individual edits)
- Minimal UI: just text changes with color coding
- Simple ✓/✗ buttons for actions
- Code formatting for proper monospace display
- No verbose labels ("Added:", "Deleted:", etc.)

**6. AI Integration**
- Simple on/off toggle switch
- "Run Once" button when AI is disabled
- Automatic analysis of unclear editing patterns when enabled
- Clean state management between AI modes

#### User Interactions and Flows

**1. Typing Flow**
1. User types or edits text
2. CodeMirror ViewPlugin captures transaction
3. Decorations appear immediately in document
4. Side panel updates with clustered changes (batched)
5. User reviews clusters and accepts/rejects

**2. Review Flow**
1. User opens side panel to review changes
2. Sees clusters grouped by word boundaries
3. Clicks ✓ to accept (cleanup decorations, keep text)
4. Clicks ✗ to reject (revert text, remove decorations)

**3. AI Assistance Flow**
1. User toggles AI on for automatic analysis
2. Or uses "Run Once" for manual analysis
3. AI analyzes unclear editing patterns
4. Suggestions provided for ambiguous changes

### Non-Functional Requirements

#### Performance Expectations
- Decoration rendering: < 16ms for 60fps typing
- Panel updates: 100ms batching for cluster recalculation
- Memory usage: Efficient decoration cleanup on accept/reject
- Scroll performance: No impact on editor scrolling

#### Security Considerations
- No external API calls for core functionality
- AI integration uses existing Writerr AI infrastructure
- Local edit storage only (no cloud sync)

#### Scalability Needs
- Handle documents up to 10,000 lines efficiently
- Support up to 1,000 tracked edits simultaneously
- Graceful degradation with large edit volumes

## Success Criteria

### Measurable Outcomes

**Functionality Metrics**:
- [ ] 100% decoration persistence until manual action
- [ ] 100% accurate change detection (no missed deletions)
- [ ] < 100ms decoration rendering latency
- [ ] 0 decoration position drift issues

**User Experience Metrics**:
- [ ] Cluster accuracy: 95% of word changes grouped correctly
- [ ] UI simplicity: 0 verbose labels in final implementation
- [ ] Action efficiency: 1-click accept/reject per cluster
- [ ] Real-time updates: < 100ms panel refresh

**Technical Metrics**:
- [ ] 0 CodeMirror version conflicts
- [ ] 100% integration with Obsidian editor instances
- [ ] Clean architecture: All logic in single main.ts file
- [ ] Proper cleanup: 0 memory leaks on plugin disable

## Constraints & Assumptions

### Technical Limitations
- Must work with Obsidian's embedded CodeMirror 6 version
- Cannot modify Obsidian's core editor behavior
- Limited to CodeMirror APIs available in Obsidian environment

### Timeline Constraints
- Complete rewrite required due to architecture mismatch
- Cannot incrementally migrate - must be full replacement
- Development project with no legacy compatibility needs

### Resource Limitations
- Single developer implementation
- Must reuse existing Writerr AI infrastructure
- No additional dependency budget

### Assumptions
- Writerr 2.0 patterns remain valid for current Obsidian version
- CodeMirror 6 APIs in Obsidian are sufficient for requirements
- Users prefer cluster-level operations over individual edit management

## Out of Scope

### What we're explicitly NOT building

**Version 1.0 Compatibility**:
- No migration of existing edit history
- No preservation of current modular architecture
- No backwards compatibility with old settings

**Advanced Features**:
- Multi-document edit tracking
- Edit history persistence across sessions
- Advanced AI analysis beyond pattern detection
- Custom clustering algorithms beyond word boundaries

**Enterprise Features**:
- Team collaboration on edits
- Cloud sync of edit history
- Audit logging of edit decisions
- Integration with external review systems

**Complex UI**:
- Multiple panel layouts
- Customizable clustering parameters
- Advanced filtering and search
- Export functionality beyond basic formats

## Dependencies

### External Dependencies
- **CodeMirror 6**: `@codemirror/state` and `@codemirror/view` (embedded in Obsidian)
- **Obsidian API**: Editor extension registration and view management
- **Writerr AI Infrastructure**: Existing AI analysis capabilities

### Internal Team Dependencies
- **Shared Types**: Edit data structures and interfaces
- **Utility Functions**: ID generation and common helpers
- **Styling System**: CSS integration with Obsidian themes

### Critical Path Dependencies
- **V2.0 Pattern Analysis**: Complete understanding of working implementation
- **CodeMirror API Validation**: Confirm all required APIs available in Obsidian
- **Architecture Design**: Global state management and component interaction

### Risk Mitigation
- **CodeMirror Version Risk**: Test with current Obsidian version early
- **API Availability Risk**: Validate all required CodeMirror APIs accessible
- **Performance Risk**: Benchmark decoration rendering with large documents