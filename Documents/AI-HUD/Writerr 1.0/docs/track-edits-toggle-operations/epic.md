---
name: track-edits-toggle-operations
status: backlog
created: 2025-08-25T03:55:22Z
progress: 0%
prd: .claude/prds/track-edits-toggle-operations.md
github: https://github.com/cvcobb001/writerr-1.0/issues/18
---

# Epic: Track Edits Toggle Operations

## Overview

Implement bulletproof toggle operations for Track Edits plugin using a modal confirmation system for clean state transitions. The solution leverages existing reject functionality for atomic cleanup while providing conversational user control through Obsidian-native modal dialogs. This approach eliminates complex edge case management by transforming toggle-off into a simple user-controlled batch reject operation.

## Architecture Decisions

### Decision 1: Modal-Based State Transition Pattern
**Choice**: Use Obsidian Modal API with user confirmation for toggle-off operations  
**Rationale**: Eliminates uncertainty about pending edits while providing escape hatch for power users  
**Alternative Rejected**: Automatic state preservation (too complex, creates edge cases)  

### Decision 2: Atomic Cleanup via Existing Reject System
**Choice**: Leverage existing `rejectAllEditClusters()` functionality for complete cleanup  
**Rationale**: Reuses proven code paths, ensures consistency with manual reject behavior  
**Alternative Rejected**: New custom cleanup logic (introduces bug risk, code duplication)  

### Decision 3: Per-Session Preference Storage
**Choice**: Store "Don't ask again" preference in memory only (resets on restart)  
**Rationale**: Avoids persistent settings complexity while providing streamlining option  
**Alternative Rejected**: Persistent settings (overkill for this simple preference)  

### Decision 4: Direct Integration with ViewPlugin Lifecycle
**Choice**: Hook toggle operations directly into CodeMirror ViewPlugin activation/deactivation  
**Rationale**: Native integration ensures proper editor state management  
**Alternative Rejected**: Custom tracking layer (unnecessary abstraction)  

## Technical Approach

### Frontend Components

#### Modal Dialog Component
- **Implementation**: Extend Obsidian `Modal` class for consistent styling
- **State Management**: Local state for checkbox and button interaction
- **Integration**: Direct callback to plugin toggle method with user choice
- **Keyboard Support**: ESC for cancel, Enter for primary action

#### Toggle Button Enhancement
- **Location**: Existing ribbon icon and command palette
- **State Indication**: Dynamic icon and tooltip based on tracking status
- **Click Handling**: Route to new `handleToggleClick()` method with modal logic
- **Visual Feedback**: Immediate state update after successful toggle

#### Side Panel State Updates
- **Empty State**: Show "Tracking disabled" message when no active session
- **Status Indicator**: Maintain existing green/red dot system
- **Transition Animation**: Smooth clear animation when discarding edits

### Backend Services

#### Toggle Operation Controller
```typescript
class ToggleOperationController {
  async handleToggleOff(): Promise<void> {
    // Check for pending edits
    // Show modal if needed
    // Execute atomic cleanup
    // Update UI state
  }
  
  async executeBulkReject(): Promise<void> {
    // Reuse existing rejectAllEditClusters()
    // Complete decoration cleanup
    // Reset memory arrays
  }
}
```

#### Modal Confirmation Service
```typescript
class ToggleConfirmationModal extends Modal {
  constructor(app: App, pendingEditCount: number, onConfirm: Function, onCancel: Function)
  // Handle user interaction
  // Manage "don't ask again" state
  // Provide keyboard navigation
}
```

#### State Cleanup Orchestrator
- **Coordination**: Ensures all cleanup steps execute in proper sequence
- **Error Recovery**: Handles partial cleanup failures gracefully  
- **Validation**: Verifies complete state reset after operations
- **Logging**: Tracks cleanup operations for debugging

### Infrastructure

#### Memory Management
- **Decoration Cleanup**: Force clear all CodeMirror decoration sets
- **Array Reset**: Clear currentEdits, clusters, activeDecorations arrays
- **Object Cleanup**: Reset session objects and tracking state flags
- **Garbage Collection**: Ensure no references prevent cleanup

#### Error Handling
- **Modal Errors**: Graceful degradation if modal fails to display
- **Cleanup Failures**: Partial state recovery and user notification
- **ViewPlugin Errors**: Fallback cleanup methods if ViewPlugin fails
- **Race Condition Prevention**: Locks during toggle operations

#### Integration Points
- **Existing Reject System**: Seamless integration with current batch reject functionality
- **Session Management**: Proper coordination with EditTracker persistence
- **CodeMirror Integration**: Native ViewPlugin lifecycle management
- **UI State Coordination**: Synchronized updates across ribbon, panel, and editor

## Implementation Strategy

### Phase 1: Modal Infrastructure (Week 1)
1. **Modal Component**: Create ToggleConfirmationModal class
2. **Integration Points**: Wire modal into existing toggle command
3. **Basic Flow**: Implement modal show → user choice → callback pattern
4. **Testing**: Unit tests for modal logic and user interaction

### Phase 2: Atomic Cleanup System (Week 2)  
1. **Controller Pattern**: Create ToggleOperationController 
2. **Batch Reject Integration**: Connect to existing rejectAllEditClusters()
3. **State Cleanup**: Implement comprehensive decoration and memory cleanup
4. **Validation**: Add state verification after cleanup operations

### Phase 3: Edge Case Hardening (Week 3)
1. **Error Recovery**: Handle modal failures and partial cleanup states
2. **Race Condition Prevention**: Add operation locks and state validation
3. **Performance Optimization**: Ensure cleanup completes within 200ms
4. **Integration Testing**: Full workflow testing with existing functionality

### Risk Mitigation
- **Fallback Strategy**: Direct toggle without modal if modal system fails
- **Incremental Deployment**: Feature flag for new toggle behavior
- **Regression Prevention**: Comprehensive test coverage of existing functionality
- **User Communication**: Clear error messages if operations fail

## Task Breakdown Preview

High-level task categories that will be created:

- [ ] **Modal System Implementation**: Create confirmation dialog with proper Obsidian styling
- [ ] **Toggle Controller Logic**: Implement decision tree and flow control 
- [ ] **Atomic Cleanup Operations**: Integrate with existing reject system for complete state reset
- [ ] **UI State Management**: Update ribbon, panel, and editor state indicators
- [ ] **Error Handling & Recovery**: Implement graceful degradation and partial failure recovery
- [ ] **Performance Optimization**: Ensure sub-200ms cleanup operations
- [ ] **Integration Testing**: Validate compatibility with existing Track Edits functionality
- [ ] **User Experience Polish**: Keyboard shortcuts, animations, and visual feedback

## Dependencies

### External Dependencies
- **Obsidian Modal API**: Required for consistent modal dialog appearance
- **CodeMirror ViewPlugin API**: Required for proper editor lifecycle management  
- **Obsidian Command API**: Required for ribbon icon and command palette integration
- **Obsidian Workspace API**: Required for file switching event coordination

### Internal Dependencies  
- **Track Edits Core**: Existing rejectAllEditClusters() and batch operation functionality
- **Edit Cluster Manager**: Accurate pending edit counting and cluster identification
- **Side Panel System**: State update and empty state display capabilities
- **Session Management**: EditTracker integration for proper state transitions

### Prerequisite Work
- **Current reject functionality**: Must support batch operations reliably
- **Decoration system**: Must support programmatic cleanup of all tracked decorations
- **Memory management**: Current arrays must support complete reset operations
- **UI state tracking**: Existing status indicators must support toggle-based updates

## Success Criteria (Technical)

### Performance Benchmarks
- **Modal Response Time**: 95% of modal displays complete within 100ms
- **Cleanup Operation Time**: 99% of complete state resets finish within 200ms  
- **Memory Efficiency**: Zero memory growth after 50 consecutive toggle cycles
- **UI Responsiveness**: No blocking operations during toggle state transitions

### Quality Gates
- **Zero Regression**: All existing accept/reject functionality remains unaffected
- **State Integrity**: 100% success rate for complete state cleanup validation
- **Error Recovery**: Graceful handling of 95% of identifiable failure scenarios
- **User Experience**: Modal interaction follows Obsidian accessibility standards

### Acceptance Criteria
- **Functional Completeness**: All PRD functional requirements implemented and tested
- **Integration Stability**: No conflicts with existing dual-layer architecture
- **Cross-File Behavior**: Proper toggle state management during file switching
- **Theme Compatibility**: Consistent modal appearance across all Obsidian themes

## Estimated Effort

### Overall Timeline: 3 weeks
- **Week 1**: Modal infrastructure and basic integration (40% of effort)
- **Week 2**: Atomic cleanup system and batch operations (35% of effort)  
- **Week 3**: Edge case handling and integration testing (25% of effort)

### Resource Requirements
- **Primary Developer**: 1 full-time developer with Obsidian plugin experience
- **Code Review**: Technical lead review for architecture decisions  
- **QA Testing**: Integration testing with existing Track Edits functionality
- **User Testing**: Validation of modal UX and toggle behavior

### Critical Path Items
1. **Modal API Integration**: Foundation for entire toggle confirmation system
2. **Batch Reject Reliability**: Core dependency for atomic cleanup operations  
3. **State Validation Logic**: Required for verifying complete cleanup success
4. **Error Recovery Patterns**: Essential for production reliability

This epic transforms complex toggle edge case management into an elegant user-controlled decision pattern while leveraging existing proven functionality for robust implementation.

## Tasks Created
- [ ] #19 - Toggle Confirmation Modal Component (parallel: true)
- [ ] #20 - Toggle Operation Controller (parallel: false)
- [ ] #21 - State Cleanup Orchestrator (parallel: false)
- [ ] #22 - UI State Management Updates (parallel: true)
- [ ] #23 - Error Handling & Recovery System (parallel: false)
- [ ] #24 - Performance Optimization (parallel: false)
- [ ] #25 - Integration Testing Suite (parallel: false)
- [ ] #26 - User Experience Polish (parallel: false)

Total tasks: 8
Parallel tasks: 2
Sequential tasks: 6
Estimated total effort: 67 hours
