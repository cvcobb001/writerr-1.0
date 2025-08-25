# Track Edits Plugin Guide

The Track Edits plugin is the foundation of Writerr's HUD philosophy, providing universal change management for all text modifications in your documents. This guide covers everything from basic usage to advanced customization.

## Core Concepts

### Universal Change Pipeline
Every text modification - whether from Writerr Chat, AI Editorial Functions, manual edits, or other plugins - flows through Track Edits. This ensures:
- **Complete Visibility**: See every change that happens to your text
- **Consistent Control**: Same interface for managing all types of edits
- **Full Audit Trail**: Complete history of who/what made each change

### Change Attribution
Track Edits automatically identifies and attributes changes to their source:
- **Manual**: Changes you make directly in the editor
- **Writerr Chat**: Suggestions from conversational AI modes
- **AI Editorial Functions**: Output from specialized editing functions  
- **Other Plugins**: Changes from compatible third-party plugins

### Confidence-Based Organization
All AI suggestions include confidence scores (0.0-1.0) that help you prioritize:
- **High Confidence (0.8+)**: Usually safe to accept, often grammar/spelling
- **Medium Confidence (0.5-0.8)**: Review carefully, often style/tone changes
- **Low Confidence (<0.5)**: Requires careful evaluation, often creative/structural

## Interface Overview

### Main Timeline Panel

The Track Edits timeline is your central command center:

```
┌─────────────────────────────────────────┐
│ Track Edits Timeline                     │
├─────────────────────────────────────────┤
│ [Filters] [Sort] [Batch Actions]        │
├─────────────────────────────────────────┤
│ ● Grammar Fix (0.92) - Copy Editor      │
│   "recieve" → "receive"                  │
│   [Accept] [Reject] [Details]           │
├─────────────────────────────────────────┤
│ ● Style Change (0.73) - Writerr Chat    │
│   "pretty good" → "excellent"           │
│   [Accept] [Reject] [Details]           │
└─────────────────────────────────────────┘
```

### Inline Visualization

Changes are highlighted directly in your document:
- **Additions**: <span style="background: green; color: white;">Green highlights</span>
- **Deletions**: <span style="background: red; color: white; text-decoration: line-through;">Red strikethrough</span>  
- **Modifications**: <span style="background: blue; color: white;">Blue highlights</span> with strikethrough for replaced text
- **Confidence Indicators**: Border thickness indicates confidence level

### Change Categories

Track Edits automatically categorizes changes:
- **Grammar** 📝: Grammatical corrections and syntax fixes
- **Spelling** ✅: Spelling corrections and word choice
- **Style** 🎨: Tone, voice, and stylistic improvements
- **Clarity** 💡: Changes that improve readability and understanding
- **Structure** 🏗️: Organizational and structural modifications
- **Consistency** 🔄: Maintaining consistent terminology and formatting

## Basic Operations

### Accepting and Rejecting Changes

**Individual Changes**:
- Click "Accept" to apply a change to your document
- Click "Reject" to discard a suggestion permanently
- Click "Details" to see full context and reasoning

**Keyboard Shortcuts**:
- `Ctrl+Shift+A` (Windows) / `Cmd+Shift+A` (Mac): Accept focused change
- `Ctrl+Shift+R` (Windows) / `Cmd+Shift+R` (Mac): Reject focused change
- `Arrow Keys`: Navigate between changes
- `Tab`: Move to next change, `Shift+Tab`: Previous change

### Batch Operations

Select multiple changes for bulk operations:

1. **Multi-Select**: Ctrl+Click (Cmd+Click on Mac) individual changes
2. **Range Select**: Shift+Click to select a range
3. **Select All by Type**: Use category filters + "Select All Visible"
4. **Bulk Actions**:
   - "Accept Selected": Apply all selected changes
   - "Reject Selected": Discard all selected changes
   - "Group Selected": Create a custom grouping

### Filtering and Sorting

**Filter Options**:
- **By Source**: Show only Manual, Writerr Chat, AI Functions, or Other
- **By Category**: Filter by Grammar, Style, Clarity, etc.
- **By Confidence**: Set minimum/maximum confidence thresholds
- **By Status**: Show Pending, Accepted, or Rejected changes
- **By Date**: Filter by time range

**Sort Options**:
- **Chronological**: Order changes were made (default)
- **Confidence**: Highest confidence first (recommended for efficiency)
- **Position**: Document order from top to bottom
- **Category**: Group similar types together
- **Source**: Group by originating plugin/function

## Advanced Features

### Clustering System

Track Edits intelligently groups related changes:

**Proximity Clustering**: Changes near each other in the document
```
┌─────────────────────────────────────────┐
│ Grammar Cluster - Paragraph 2 (4 items) │
│ ● "recieve" → "receive"                  │
│ ● "it's" → "its" (possessive)           │
│ ● "their" → "there"                      │  
│ ● Missing comma after "However"         │
│ [Accept All] [Reject All] [Expand]      │
└─────────────────────────────────────────┘
```

**Category Clustering**: Similar types of changes grouped together
```
┌─────────────────────────────────────────┐
│ Style Improvements (6 items)            │
│ ● "good" → "excellent" (3 instances)    │
│ ● "big" → "substantial"                  │
│ ● "nice" → "impressive"                  │
│ [Accept All] [Reject All] [Expand]      │
└─────────────────────────────────────────┘
```

**Source Clustering**: Changes from the same function/mode
```
┌─────────────────────────────────────────┐
│ Copy Editor Function (8 items)          │
│ ● Grammar fixes (3)                     │
│ ● Style changes (4)                     │
│ ● Clarity improvements (1)              │
│ [Accept All] [Reject All] [Expand]      │
└─────────────────────────────────────────┘
```

### Batch Processing Configuration

Customize how AI suggestions are processed:

**Confidence Thresholds**:
- **Auto-Accept**: Changes above this threshold are automatically applied (default: 0.95)
- **Auto-Highlight**: Changes above this threshold are immediately visible (default: 0.8)
- **Review Required**: Changes below this threshold require manual review (default: 0.5)

**Batch Size Limits**:
- **Maximum Batch**: Limit concurrent changes to prevent overwhelming (default: 100)
- **Processing Delay**: Time between processing batches (default: 100ms)
- **Memory Threshold**: Stop processing if memory usage exceeds limit

### Change History and Audit Trail

Track Edits maintains complete history:

**Session History**: All changes within current editing session
**Document History**: Per-document change history across sessions
**Global History**: All changes across all documents (with privacy controls)

**Audit Information**:
- Timestamp (precise to millisecond)
- Source attribution (plugin, function, mode)
- AI model used (if applicable)
- Confidence scores and reasoning
- User decision (accepted, rejected, modified)
- Context at time of change

### Revision Heatmap

Visual representation of document editing intensity:

```
┌─────────────────────────────────────────┐
│ Document Revision Heatmap               │
├─────────────────────────────────────────┤
│ Paragraph 1: ░░░░░ (Light editing)      │
│ Paragraph 2: █████ (Heavy editing)      │
│ Paragraph 3: ░██░░ (Mixed editing)      │
│ Paragraph 4: ░░░░░ (Light editing)      │
└─────────────────────────────────────────┘
```

**Color Coding**:
- **White/Light**: Few or no changes
- **Medium**: Moderate editing activity  
- **Dark**: Heavy editing activity
- **Red**: Potential problem areas needing attention

## Performance Optimization

### Large Document Handling

For documents with 10,000+ words:

**Lazy Loading**: Changes loaded on-demand as you scroll
**Virtual Timeline**: Only visible changes rendered in timeline
**Chunked Processing**: Large batches processed in smaller chunks
**Memory Management**: Automatic cleanup of old change data

**Settings for Large Documents**:
```yaml
Performance Settings:
  Enable Lazy Loading: true
  Virtual Timeline Threshold: 500 changes
  Chunk Size: 50 changes
  Memory Cleanup Interval: 5 minutes
  Background Processing: true
```

### Memory Optimization

**Automatic Cleanup**:
- Accepted changes older than 1 hour (configurable)
- Rejected changes older than 30 minutes (configurable)  
- Processed changes from inactive documents

**Manual Cleanup**:
- "Clear Accepted Changes" - Remove old accepted changes
- "Archive Session" - Move current session to archive
- "Reset Timeline" - Clear all changes (use carefully!)

## Integration with Other Plugins

### Writerr Chat Integration

**Automatic Routing**: All chat suggestions flow through Track Edits
**Mode Attribution**: Changes labeled with specific mode (Copy Edit, Proofread, etc.)
**Confidence Mapping**: Chat confidence scores properly translated
**Batch Configuration**: Per-mode batch processing settings

### AI Editorial Functions Integration

**Function Attribution**: Changes labeled with specific function name
**Parameter Tracking**: Function parameters included in change context
**Session Learning**: Track Edits feedback used to improve function performance
**Error Handling**: Graceful handling of function failures

### Third-Party Plugin Support

Track Edits provides APIs for other plugins:

**Change Submission API**:
```typescript
// Submit changes from your plugin
window.TrackEdits?.submitChanges({
  source: "Your Plugin Name",
  changes: [...],
  confidence: 0.85,
  category: "grammar"
});
```

**Change Event Listening**:
```typescript  
// Listen for change events
window.TrackEdits?.on('change-accepted', (change) => {
  // React to accepted changes
});
```

## Customization

### Visual Themes

Customize the appearance of change highlights:

**Built-in Themes**:
- **Classic**: Traditional red/green for deletions/additions
- **Subtle**: Muted colors for less visual distraction
- **High Contrast**: Bold colors for accessibility
- **Dark Mode**: Optimized for dark themes

**Custom Themes**: Create your own color schemes:
```css
.track-edits-addition {
  background-color: #your-color;
  border: 1px solid #your-border;
}
```

### Keyboard Shortcuts

Fully customizable keyboard shortcuts:

**Default Shortcuts**:
- `Ctrl/Cmd+Shift+T`: Toggle Track Edits panel
- `Ctrl/Cmd+Shift+A`: Accept focused change
- `Ctrl/Cmd+Shift+R`: Reject focused change  
- `Ctrl/Cmd+Shift+B`: Batch accept visible changes
- `Ctrl/Cmd+Shift+N`: Next change
- `Ctrl/Cmd+Shift+P`: Previous change

### Change Categories

Create custom categories for your specific needs:

```yaml
Custom Categories:
  Technical Accuracy: 
    color: "#FF6B6B"
    priority: high
    auto_batch: false
  
  Brand Consistency:
    color: "#4ECDC4"  
    priority: medium
    auto_batch: true
    
  SEO Optimization:
    color: "#45B7D1"
    priority: low
    auto_batch: true
```

## Troubleshooting

### Common Issues

**Problem**: Changes not appearing in timeline
- Check if Track Edits is enabled for current document
- Verify AI Providers integration is working
- Check memory/performance limits

**Problem**: Timeline is slow with many changes
- Enable lazy loading in performance settings
- Increase cleanup frequency
- Consider archiving old sessions

**Problem**: Changes not highlighting in document
- Check highlight theme compatibility
- Verify document format is supported
- Toggle inline visualization setting

**Problem**: Batch operations not working
- Check batch size limits in settings
- Verify confidence thresholds are reasonable
- Ensure changes are actually selected

### Performance Tuning

**For Large Documents (50K+ words)**:
```yaml
Recommended Settings:
  Lazy Loading: enabled
  Virtual Timeline: enabled (500+ changes)
  Auto Cleanup: every 2 minutes
  Batch Size Limit: 25 changes
  Confidence Auto-Accept: 0.98
```

**For Real-Time Collaboration**:
```yaml
Recommended Settings:
  Change Detection: immediate
  Timeline Updates: real-time
  Conflict Resolution: automatic
  Memory Cleanup: aggressive (1 minute)
```

## Advanced Use Cases

### Academic Writing Workflow

1. **Structure Phase**: Use Developmental Editor function, accept structural changes
2. **Content Phase**: Use Writing Assistant chat mode for content development  
3. **Copy Edit Phase**: Use Copy Editor function for grammar/style
4. **Final Proofread**: Use Proofreader function for final pass
5. **Review**: Use Track Edits timeline to review all changes by phase

### Fiction Writing Workflow

1. **Creative Development**: Use Chat mode for plot/character development
2. **Style Consistency**: Use custom Fiction Editor function
3. **Dialogue Polish**: Use specialized dialogue function
4. **Final Edit**: Use Copy Editor for technical cleanup
5. **Publication Prep**: Export clean version with complete audit trail

### Technical Documentation

1. **Accuracy Check**: Use Technical Writer function for accuracy/clarity
2. **Consistency**: Use custom terminology function
3. **Style Guide**: Use brand-specific copy editor
4. **Final Review**: Use Proofreader for grammar/formatting
5. **Version Control**: Export changes as documentation of revisions

## What's Next?

- [Writerr Chat Guide](writerr-chat.md) - Learn the conversational AI interface
- [AI Editorial Functions Guide](ai-editorial-functions.md) - Master specialized editing tools
- [Integration Workflows](integration-workflows.md) - Advanced multi-plugin patterns
- [API Documentation](../api/track-edits-api.md) - Build custom integrations