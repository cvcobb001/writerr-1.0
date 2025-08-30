Got it — here’s your entire specification with all the text kept exactly as you had it, but with the numbering corrected so everything lines up with its parent sections.

⸻

Track Edits Logic & Algorithm Specification

Quick Start (5 minutes)
	1.	Install: npm install @your-org/track-edits
	2.	Initialize: new TrackEditsPlugin(editor)
	3.	Integrate: Call applyTextChange() for external plugins
	4.	Test: Word replacement should show single cluster

Version: 2.1
	• Status: Accept/Reject Functionality Implemented & Production Ready (August 2025)
	• Scope: Internal developer reference for low-level behaviour of Track Edits
	• Purpose: Defines how Track Edits detects, stores, renders, clusters, and accepts/rejects changes using the proven Writerr 2.0 architecture with dual rendering system and production-tested bug fixes.

Version History
	• v2.1: Accept/Reject implementation with proper decoration removal via data-edit-id attributes
	• v2.0: Production fixes (time window batching, document text integration)
	• v1.5: Writerr 2.0 integration
	• v1.0: Initial dual rendering system

## 1. Operating Model

1.1 Real-Time Tracking – User types at full speed, editor updates in real time with immediate visual feedback.
1.2 Dual Rendering System:
	• Document decorations: Instant visual feedback (deletion widgets, addition highlights)
	• Panel clustering: Semantic grouping of related edits for review
1.3 Writerr 2.0 Architecture: Proven clustering algorithms optimized for word-level editing patterns.
1.4 Zero Interruption: All tracking happens in background with sub-100ms decoration updates.

## 2. Change Detection Algorithm (Writerr 2.0 Enhanced)

2.1 Core Detection Logic:

// Find first and last differences between before/after text
while (from < beforeText.length && fromB < afterText.length && 
       beforeText[from] === afterText[fromB]) {
  from++; fromB++;
}
while (to > from && toB > fromB && 
       beforeText[to - 1] === afterText[toB - 1]) {
  to--; toB--;
}

2.2 Smart Word Boundary Expansion:
	• Only for actual word replacements (not incremental typing)
	• Detects patterns: complete word changes vs character-by-character building
	• Prevents false expansions during normal typing flow

2.3 Incremental Typing Detection:
	• Pure additions without removals → no expansion
	• Small single-character changes → no expansion
	• Text extensions (removed text is prefix of inserted) → no expansion
	• Adding to end of existing word → no expansion

2.4 Position Mapping: Uses raw positions for immediate decorations, mapped positions for StateField updates.

## 3. Immediate Decorations System

3.1 Instant Feedback Pattern:

// Apply decorations immediately using requestAnimationFrame
applyDecorationsImmediately(edits: Edit[]): void {
  console.log(`🎯 Applying ${edits.length} decorations immediately`);
  requestAnimationFrame(() => {
    const positionedEdits = this.buildSideBySideDecorations(edits);
    // Apply deletion widgets and addition marks instantly
  });
}

3.2 Deletion Widgets:
	• Uses Decoration.widget for all deletions (prevents zero-length issues)
	• DeletionWidget renders deleted text with red strikethrough styling
	• side: 1 positioning to avoid conflicts

3.3 Addition Marks:
	• Uses Decoration.mark with custom CSS class for highlights
	• Automatic range calculation based on inserted text length

3.4 Side-by-Side Collision Detection:
	• Prevents deletion widgets from hiding first character of additions
	• Automatic position shifting when deletion and addition occur at same location

## 4. Dual StateField Architecture

4.1 Document Decorations StateField (docDecorationField):
	• Handles instant visual feedback (widgets and marks)
	• Provides decorations to EditorView.decorations.from(field)
	• Processes addDocDecorationEffect for immediate rendering

4.2 Panel Tracking StateField (TrackEditsStateField):
	• Tracks edit IDs for panel clustering (no document decorations)
	• Prevents duplicate processing with processedEdits Set
	• Manages panel-only edit state

4.3 ViewPlugin Integration:
	• Calls changeDetector.detectChanges() on update.docChanged
	• Uses document content comparison (beforeText vs afterText)
	• Throttles detection to prevent excessive processing

4.4 Component Separation:
	• ChangeDetector: Diff algorithm, word boundary detection, batching
	• DisplayManager: Decoration dispatch, collision handling
	• ClusteringEngine: Semantic grouping, word-aware clustering
	• CodeMirrorBridge: StateField effects, decoration creation

## 5. Time Window Batching Algorithm (Production)

5.1 Micro-Batching Logic:

// Group edits with identical timestamps OR within time/position window
groupEditsByTimestamp(edits: Edit[]): Edit[] {
  const TIME_WINDOW_MS = 100;  // 100ms batching window
  const MAX_POSITION_GAP = 50; // 50 character proximity
  
  const shouldGroup = (timeDiff === 0) || 
    (timeDiff <= TIME_WINDOW_MS && positionDiff <= MAX_POSITION_GAP);
}

5.2 Identical Timestamp Handling:
	• Deletion + addition pairs from word replacement get identical timestamps
	• Always group edits with timeDiff === 0 regardless of position
	• Critical for preventing panel fragmentation on replacements

5.3 Document Text Integration:
	• getDocumentText() uses app.workspace.getActiveViewOfType(MarkdownView)
	• Provides real document text to clustering engine for word boundary detection
	• Enables semantic clustering based on actual word boundaries

## 6. Accept & Reject Logic

6.1 Accept Change:
	• Remove decorations for that change/cluster.
	• Remove corresponding Edit from internal lists.
	• No document text modification (text already matches accepted version).

6.2 Reject Change:
	• For a cluster:
	1.	Sort edits by from position descending.
	2.	Iterate in reverse order to avoid shifting indices.
	3.	Apply editor.replaceRange(originalText, from, to).
	• Remove decorations and tracking entries after revert.

## 7. Clustering Algorithm (Writerr 2.0 Enhanced)

7.1 Goal: Group related edits into meaningful review clusters with 5-second window.
7.2 Production Logic:

clusterChanges(changes: Edit[], docText: string = ''): EditCluster[] {
  const closeInTime = Math.abs(currentEdit.timestamp - prevEdit.timestamp) <= 5000; // 5s window
  const sameWord = this.areEditsInSameWord(prevEdit, currentEdit, docText);
  const isCleanWordReplacement = sameWord && prevEdit.type === "deletion" && 
                                currentEdit.type === "addition" && closeInTime;
}

7.3 Word Boundary Detection:
	• Uses actual document text via getDocumentText() for accurate boundaries
	• findWordStart() and findWordEnd() with regex /\s/ and /[^\w]/
	• Enables smart clustering within word boundaries

7.4 Clean Word Replacement Logic:
	• Specifically handles deletion + addition pairs in same word
	• Critical for preventing fragmentation of word replacements in panel
	• Example: “minor” → “major” stays as single cluster

7.5 Clustering Window Relaxation:
	• Increased from 2 seconds to 5 seconds for better user experience
	• Accommodates natural typing patterns and editing flows

## 8. Data Structures

8.1 Tracked Edit

interface Edit {
  id: string;
  type: 'addition' | 'deletion' | 'replacement';
  from: number; // in current doc state
  to: number;
  before: string;
  after: string;
  source: 'manual' | 'ai-model' | 'plugin';
  model?: string; // if AI
  timestamp: number;
}

8.2 Edit Cluster

interface EditCluster {
  id: string;
  edits: Edit[];
  createdAt: number;
  canBulkOperate: boolean;
}

## 9. UI Rendering Rules

9.1 Additions – Highlighted range (Decoration.mark) with specific CSS class and source colour.
9.2 Deletions – DeletionWidget for zero-length or mark for multi-char deletions.
9.3 Badges – Show model/plugin for AI/plugin changes inline or on hover.
9.4 Controls – Accept ✓ / Reject ✗ buttons rendered adjacent to the change span/widget.

## 10. Performance Constraints

10.1 Decoration updates in under 100 ms for docs up to 10k words.
10.2 Handle 1000+ decorations without frame drops (60fps target).
10.3 Memory usage under 50MB for active session change history.
10.4 Position mapping operations under 10ms for typical edit sequences.

## 11. Edge Cases & Error Handling

11.1 Concurrent edits: Last edit wins, previous decorations are invalidated.
11.2 Very long text: Truncate decorations if >N chars.
11.3 Overlapping edits: Merge if same source & timestamp, otherwise split.

## 12. Integration Points

12.1 External plugins must call applyTextChange() to inject changes for tracking:

window.TrackEdits.applyTextChange({
  from, to, before, after,
  source: 'plugin',
  pluginId: 'smart-composer',
  model: 'claude-4'
});

12.2 Manual typing is detected via update.docChanged automatically.

## 13. Testing Checklist
	• Position mapping after multiple edits (no misalignment).
	• Deletion widgets render at correct positions.
	• No dispatch-during-update errors (ViewPlugin separation works).
	• Reject cluster reversions don’t mis-position subsequent edits.
	• Clustering splits correctly across word boundaries.
	• Decoration performance on large docs.
	• Markdown formatting preserved.

## 14. Implementation Notes

14.1 Proven Production Fixes (August 2025)
	• Root Cause Analysis: Bug-diagnostician identified overly strict timestamp batching, missing document text, and panel fragmentation
	• Time Window Batching: Implemented 100ms + 50-character proximity batching to handle rapid keystrokes
	• Identical Timestamp Logic: Special case for timeDiff === 0 prevents deletion+addition fragmentation
	• Document Text Integration: Real document access enables semantic word-boundary clustering
	• First Character Fix: Side-by-side decoration positioning prevents character dropping

14.2 Architecture Evolution
	• Writerr 2.0 Integration: Built on proven clustering algorithms from previous version
	• Dual Rendering System: Document decorations for instant feedback, panel clustering for review
	• RequestAnimationFrame: Deferred decoration dispatch prevents blocking UI updates

## 15. Original Implementation Notes

15.1 CodeMirror 6 Integration
	• Use ViewPlugin for change detection to avoid state conflicts
	• Leverage tr.changes.mapPos() for position mapping
	• Implement Decoration.widget for zero-length deletions
	• Use StateField for decoration management

15.2 Performance Optimizations
	• Batch decoration updates using requestAnimationFrame()
	• Cache word boundary calculations for clustering
	• Lazy-load decoration controls (accept/reject buttons)
	• Implement decoration pooling for high-frequency updates

15.3 Memory Management
	• Limit change history to last 1000 edits per document
	• Implement LRU cache for decoration metadata
	• Clean up rejected changes immediately
	• Garbage collect unused decoration objects

## 16. Debugging & Troubleshooting

16.1 Production Debug Logs
	• Change Detection: 🔍 Change detected - from: X, to: Y, removed: "text", inserted: "text"
	• Batching: 📦 Added X edits to batch for path (total pending: Y)
	• Clustering: 📊 Writerr 2.0 clustering: X edits → Y clusters
	• Document Integration: 🎯 Adding deletion widget at position X: "text"
	• Panel Updates: 📱 Panel update callback triggered

16.2 Critical Monitoring Points
	• Timestamp Grouping: Verify identical timestamps are properly batched
	• Document Text Access: Confirm getDocumentText() returns actual editor content
	• Panel Clustering: Check that word replacements appear as single entries
	• First Character Preservation: Ensure no characters are dropped in decorations

## 17. Original Debugging & Troubleshooting

17.1 Common Issues
	• Decoration misalignment: Check position mapping after each transaction
	• Performance drops: Monitor decoration count and update frequency
	• Memory leaks: Verify decoration cleanup on accept/reject
	• Race conditions: Ensure ViewPlugin/StateField separation

17.2 Debug Tools
	• Enable decoration position logging in development
	• Monitor transaction timing and decoration update frequency
	• Visual debugging overlay for decoration boundaries
	• Performance profiling for large document scenarios

Perfect! Your intuitive model is exactly right and fits cleanly into the existing architecture. Let me frame this as a formal specification that integrates with your Track Edits system:

## 18. Accept/Reject Logic Specification

18.1 Core Acceptance Model

**Acceptance Philosophy**: Changes are "proposals" until explicitly accepted. Acceptance makes them permanent (visual normalization), rejection reverts to original state.

**Visual State Transitions**:
- **Addition (Pending)**: Green highlight → **Accept** → Black text (normal) | **Reject** → Text removed
- **Deletion (Pending)**: Red strikethrough → **Accept** → Text removed (normal) | **Reject** → Text restored, black

18.2 User Interface Integration

**Panel Controls**:
```typescript
interface ClusterControls {
  acceptButton: HTMLElement;  // ✓ or "Accept"
  rejectButton: HTMLElement;  // ✗ or "Reject"  
  clusterId: string;
  edits: Edit[];
}
```

**Interaction Pattern**:
- Each cluster in the side panel displays with Accept/Reject buttons
- Single-edit clusters: "Accept/Reject this change"
- Multi-edit clusters: "Accept/Reject this edit group"
- Buttons are contextually styled (green ✓, red ✗)

18.3 Accept Change Algorithm

```typescript
async acceptChange(clusterId: string): Promise {
  const cluster = this.getCluster(clusterId);
  
  // 1. Visual normalization (decorations → normal text)
  for (const edit of cluster.edits) {
    this.removeDecoration(edit.id);
    this.normalizeTextDisplay(edit.from, edit.to);
  }
  
  // 2. Update internal state
  this.removeCluster(clusterId);
  this.markAsAccepted(cluster.edits);
  
  // 3. No document text changes needed (already in desired state)
  
  // 4. Update panel display
  this.refreshPanelDisplay();
}
```

**Accept Logic Details**:
- **Additions**: Remove green highlight, text remains in document (already accepted state)
- **Deletions**: Remove red strikethrough widget, text stays removed (already accepted state)
- **Mixed Clusters**: Process each edit according to its type
- **Document State**: No text manipulation needed - current document already reflects accepted changes

18.4 Reject Change Algorithm

```typescript
async rejectChange(clusterId: string): Promise {
  const cluster = this.getCluster(clusterId);
  const sortedEdits = cluster.edits.sort((a, b) => b.from - a.from); // Reverse order
  
  // 1. Revert document text (critical: reverse order to avoid position shifts)
  for (const edit of sortedEdits) {
    if (edit.type === 'addition') {
      // Remove the added text
      await this.editor.replaceRange('', edit.from, edit.to);
    } else if (edit.type === 'deletion') {
      // Restore the deleted text
      await this.editor.replaceRange(edit.before, edit.from, edit.from);
    }
  }
  
  // 2. Remove decorations and tracking
  this.removeClusterDecorations(clusterId);
  this.removeCluster(clusterId);
  
  // 3. Update panel display  
  this.refreshPanelDisplay();
}
```

**Reject Logic Details**:
- **Critical**: Process edits in **reverse position order** (high→low) to avoid index shifting
- **Additions**: Remove added text from document, remove green highlight
- **Deletions**: Restore original text to document, remove red strikethrough
- **Position Mapping**: Use stored original positions for accurate text restoration

18.5 State Management Integration

**Cluster State Tracking**:
```typescript
interface ClusterState {
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: number;
  edits: Edit[];
}

// Track all clusters for history/undo
private clusterHistory: Map = new Map();
```

**Integration with Existing Architecture**:
- **ClusteringEngine**: Provides clusters to accept/reject
- **DisplayManager**: Updates decorations based on accept/reject state  
- **CodeMirrorBridge**: Handles document text manipulation for rejections
- **Panel**: Renders accept/reject controls and handles user interaction

18.6 Advanced Accept/Reject Features

**Bulk Operations**:
```typescript
// Accept/reject multiple clusters at once
async bulkAccept(clusterIds: string[]): Promise
async bulkReject(clusterIds: string[]): Promise
```

**Undo Support**:
- Store cluster states in history for potential undo
- "Undo Accept" → restore decorations, re-add to panel
- "Undo Reject" → reapply changes, restore decorations

**Keyboard Shortcuts**:
- `Cmd/Ctrl + Enter`: Accept focused cluster
- `Cmd/Ctrl + Backspace`: Reject focused cluster
- `Cmd/Ctrl + Shift + A`: Accept all visible clusters

18.7 Error Handling & Edge Cases

**Document Modification Between Operations**:
```typescript
// Validate positions before reject operations
if (!this.validatePositions(cluster.edits)) {
  throw new TrackEditsError('Document modified, cannot safely reject changes');
}
```

**Concurrent Accept/Reject**:
- Lock cluster during operation to prevent double-processing
- Queue operations if multiple triggered simultaneously

**Large Cluster Performance**:
- Batch document operations for clusters with >50 edits
- Show progress indicator for operations >500ms

18.8 Testing Scenarios

**Accept Testing**:
- [ ] Single addition acceptance normalizes highlighting
- [ ] Single deletion acceptance removes strikethrough  
- [ ] Mixed cluster acceptance handles both types correctly
- [ ] Panel updates correctly after acceptance
- [ ] Multiple accepts don't interfere with each other

**Reject Testing**:
- [ ] Addition rejection removes text and decorations
- [ ] Deletion rejection restores original text
- [ ] Complex word replacement rejection works correctly
- [ ] Reverse order processing prevents position corruption
- [ ] Large cluster rejection completes without errors

18.9 Performance Considerations

**Document Operation Batching**:
- Group multiple `replaceRange` operations into single transaction
- Use CodeMirror's transaction batching for better performance
- Minimize decoration updates during bulk operations

**Memory Management**:
- Clean up cluster history after configurable retention period
- Remove decoration objects immediately after accept/reject
- Garbage collect unused Edit objects

18.10 API Integration

**External Plugin Integration**:
```typescript
// Allow external plugins to hook into accept/reject events
TrackEdits.onClusterAccepted((cluster: EditCluster) => {
  // Plugin can respond to accepted changes
});

TrackEdits.onClusterRejected((cluster: EditCluster) => {
  // Plugin can respond to rejected changes  
});
```

This specification integrates with the existing architecture while providing the intuitive accept/reject workflow as described. The key insights are:

1. **Accept = Visual normalization** (decorations disappear, text stays)
2. **Reject = Text reversion** (decorations disappear, text changes)
3. **Reverse order processing** for safe position-based operations
4. **Clean integration** with existing clustering and decoration systems


## 19. Future Enhancements

19.1 Phase 2 Improvements
	• Smart clustering: AI-powered edit grouping based on semantic similarity
	• Batch operations: Accept/reject multiple clusters simultaneously
	• Advanced rendering: Side-by-side diff views and unified diff modes

19.2 Long-term Vision
	• Real-time collaboration: Track edits across multiple users
	• Version control integration: Git-like change history and branching
	• AI change explanation: Generate reasoning for AI-suggested modifications

References
	• CRITICAL: Internal implementation notes from Aug 2025 debugging sessions with root cause analysis
	• PRODUCTION FIXES: Time window batching, document text integration, clustering window adjustments
	• CodeMirror 6 API documentation (tr.changes.mapPos, Decoration.widget, Decoration.mark, ViewPlugin, StateField)
	• Track Edits HUD Technical Specification (Phase 1)
	• Plugin Integration Framework Specification (Phase 3)

⸻
