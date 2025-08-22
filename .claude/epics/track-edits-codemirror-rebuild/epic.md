---
name: track-edits-codemirror-rebuild
status: backlog
created: 2025-08-22T02:37:50Z
progress: 0%
prd: .claude/prds/track-edits-codemirror-rebuild.md
github: https://github.com/cvcobb001/writerr-1.0/issues/7
---

# Epic: track-edits-codemirror-rebuild

## Overview

Complete architectural rewrite of Track Edits plugin using CodeMirror-native patterns proven in Writerr 2.0. Replaces broken Obsidian abstraction layer approach with direct `@codemirror/state` and `@codemirror/view` integration for bulletproof edit tracking, persistent decorations, and intelligent clustering.

**Technical Goal**: Monolithic main.ts using global state management, ViewPlugin/StateField architecture, and transaction-based change detection to deliver real-time edit visualization with cluster-level user operations.

## Architecture Decisions

### Core Integration Strategy
- **CodeMirror-Native**: Direct `@codemirror/state` and `@codemirror/view` APIs instead of Obsidian wrappers
- **Extension Registration**: Use `this.registerEditorExtension([ViewPlugin, StateField])` for proper integration
- **Transaction-Based Detection**: `update.changes.iterChanges()` for accurate change data, not cursor inference
- **StateField Decorations**: Native position mapping and lifecycle management

### State Management Approach
- **Global Module Variables**: `currentEdits: Edit[]`, `activeTrackEditsView`, `isRejectingEdit`
- **Monolithic Architecture**: Single main.ts file (~1600 lines) following V2.0 pattern
- **Immediate + Batched Processing**: Instant decorations, 100ms batched panel updates
- **Simple Cleanup**: Direct array manipulation and decoration removal

### Decoration System Design
- **Hybrid Widget/Mark**: Deletion widgets (red strikethrough) + addition marks (green highlight)
- **Automatic Position Mapping**: StateField handles document changes automatically
- **Immediate Application**: No batching for decoration rendering
- **Clean Lifecycle**: StateEffect system for add/remove operations

## Technical Approach

### Frontend Components

**Main Plugin Class**
- CodeMirror extension registration
- Global state reference management
- Obsidian integration (views, commands, settings)
- AI coordination interface

**ViewPlugin Component**
- Transaction monitoring via `update(ViewUpdate)`
- Real-time edit extraction using `update.changes.iterChanges()`
- Immediate decoration effect dispatch
- Integration with plugin state management

**StateField Component**
- Decoration set management with position mapping
- StateEffect processing (add/remove decorations)
- Widget/mark decoration creation and placement
- Automatic cleanup on document changes

**Side Panel View**
- Intelligent clustering using word boundary analysis
- Clean UI with code formatting and minimal labels
- Cluster-level accept/reject operations
- Real-time updates with 100ms batching

**AI Integration Component**
- Simple toggle switch with "Run Once" button
- Unclear pattern detection and analysis
- Integration with existing Writerr AI infrastructure
- Clean state management between modes

### Backend Services

**Change Detection Service**
- Transaction-based edit extraction
- Separate deletion/insertion edit creation
- Timestamp and position tracking
- Clean reversion data preparation

**Clustering Algorithm**
- Word boundary detection using `findWordStart()/findWordEnd()`
- Hybrid word replacement recognition
- 2-second time window + position + type matching
- Real-time cluster recalculation

**Decoration Management**
- StateEffect creation and dispatch
- Widget component for deletion display
- Mark decoration for addition highlighting
- Position mapping and lifecycle coordination

### Infrastructure

**Development Environment**
- Single file architecture for rapid development
- TypeScript strict mode with CodeMirror types
- ESBuild compilation targeting Obsidian environment
- Hot reload development workflow

**Integration Points**
- Obsidian editor extension registration
- View management and panel coordination
- Settings persistence and retrieval
- AI service communication

**Performance Optimization**
- Decoration rendering < 16ms target
- Efficient cluster recalculation algorithms
- Memory management for large edit volumes
- Scroll performance preservation

## Implementation Strategy

### Development Phases

**Phase 1: Core CodeMirror Integration (Foundation)**
- Set up CodeMirror imports and type definitions
- Implement basic ViewPlugin with transaction monitoring
- Create StateField with decoration management
- Validate extension registration and basic functionality

**Phase 2: Edit Detection and Visualization (Core Features)**
- Implement transaction-based change extraction
- Create widget decorations for deletions
- Create mark decorations for additions
- Test decoration persistence and position mapping

**Phase 3: Side Panel and Clustering (User Experience)**
- Implement word boundary clustering algorithm
- Create clean side panel UI with code formatting
- Add cluster-level accept/reject operations
- Integrate real-time updates with batching

**Phase 4: AI Integration and Polish (Complete Experience)**
- Implement AI toggle component
- Add unclear pattern detection
- Integrate with existing AI infrastructure
- Performance optimization and edge case handling

### Risk Mitigation

**CodeMirror Version Compatibility**
- Early validation of all required APIs in current Obsidian
- Fallback strategies for missing functionality
- Version detection and graceful degradation

**Performance Issues**
- Benchmark decoration rendering with large documents
- Memory profiling for edit accumulation
- Scroll performance testing and optimization

**Integration Complexity**
- Start with minimal viable integration
- Incremental complexity addition
- Thorough testing at each phase

### Testing Approach

**Unit Testing**
- Clustering algorithm validation
- Edit detection accuracy
- Decoration creation and cleanup

**Integration Testing**
- CodeMirror extension functionality
- Obsidian plugin lifecycle
- Cross-editor instance behavior

**Performance Testing**
- Large document handling
- High-frequency edit scenarios
- Memory usage profiling

**User Acceptance Testing**
- Real typing scenarios
- AI integration workflows
- Edge case validation

## Task Breakdown Preview

High-level task categories that will be created:

- [ ] **Foundation Setup**: CodeMirror imports, types, and basic plugin structure
- [ ] **ViewPlugin Implementation**: Transaction monitoring and edit extraction
- [ ] **StateField Implementation**: Decoration management and position mapping
- [ ] **Decoration System**: Widget/mark creation and rendering
- [ ] **Clustering Algorithm**: Word boundary detection and intelligent grouping
- [ ] **Side Panel UI**: Clean interface with cluster operations
- [ ] **AI Integration**: Toggle component and pattern analysis
- [ ] **Performance Optimization**: Benchmarking and efficiency improvements
- [ ] **Testing and Validation**: Comprehensive testing suite
- [ ] **Documentation and Cleanup**: Code documentation and final polish

## Dependencies

### External Service Dependencies
- **Obsidian CodeMirror 6**: Embedded version must support required APIs
- **Writerr AI Infrastructure**: Existing analysis and coordination services
- **Obsidian Plugin API**: View management and extension registration

### Internal Team Dependencies
- **Shared Types**: Edit data structures from @shared/types
- **Utility Functions**: ID generation and helpers from @shared/utils
- **Styling System**: CSS classes and theme integration

### Prerequisite Work
- V2.0 pattern analysis complete (✓)
- PRD validation and approval (✓)
- Development environment setup
- CodeMirror API validation in current Obsidian

## Success Criteria (Technical)

### Performance Benchmarks
- Decoration rendering: < 16ms (60fps typing)
- Panel updates: 100ms batching achieved
- Memory usage: < 10MB for 1000 tracked edits
- Scroll performance: No measurable impact

### Quality Gates
- 100% decoration persistence until manual action
- 100% accurate change detection (no missed deletions)
- 95% clustering accuracy for word boundary detection
- 0 CodeMirror version conflicts

### Acceptance Criteria
- Real-time decorations appear and persist correctly
- Side panel shows clean clustered changes
- Accept/reject operations work reliably
- AI integration functions without conflicts
- Performance meets or exceeds targets

## Estimated Effort

### Overall Timeline Estimate
- **Total Development**: 3-5 days
- **Phase 1 (Foundation)**: 1 day
- **Phase 2 (Core Features)**: 1-2 days  
- **Phase 3 (User Experience)**: 1 day
- **Phase 4 (Polish)**: 1 day

### Resource Requirements
- **Primary Developer**: 1 full-time
- **Code Review**: Minimal (single developer project)
- **Testing**: Integrated with development phases

### Critical Path Items
1. CodeMirror API validation and compatibility
2. ViewPlugin/StateField architecture implementation
3. Clustering algorithm development and testing
4. Side panel UI/UX implementation
5. Performance optimization and final validation

**Risk Factors**: CodeMirror compatibility issues could extend timeline by 1-2 days if significant API differences exist in Obsidian's embedded version.

## Tasks Created
- [ ] #10 - StateField Implementation (parallel: false)
- [ ] #11 - Decoration System Implementation (parallel: false)
- [ ] #12 - Change Detection and Transaction Processing (parallel: false)
- [ ] #13 - Edit Clustering Algorithm (parallel: false)
- [ ] #14 - Side Panel UI Implementation (parallel: [008])
- [ ] #15 - AI Integration Component (parallel: [007])
- [ ] #16 - Performance Optimization and Testing (parallel: false)
- [ ] #17 - Documentation and Final Polish (parallel: false)
- [ ] #8 - CodeMirror Integration Setup (parallel: true)
- [ ] #9 - ViewPlugin Implementation (parallel: false)

Total tasks:       10
Parallel tasks:        1
Sequential tasks: 9
Estimated total effort: 24-32 hours (3-4 days)
