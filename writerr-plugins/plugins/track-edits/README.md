# Track Edits Plugin

**Universal change management for all text modifications in Obsidian**

Track Edits is the foundation of the Writerr AI Editorial Platform, providing comprehensive visual tracking and intelligent clustering of all document changes. Every text modification—whether from AI suggestions, manual edits, or other plugins—flows through Track Edits, giving you complete control and transparency over your writing process.

## ✨ What Track Edits Does

Track Edits transforms your writing workflow by:

- **🔍 Visual Change Tracking**: See every modification highlighted directly in your document with color-coded additions, deletions, and modifications
- **🧠 Intelligent Clustering**: Related changes are automatically grouped together for efficient batch processing
- **⚡ Universal Pipeline**: All changes from any source (AI, manual, plugins) flow through one consistent interface
- **📊 Confidence-Based Organization**: AI suggestions include confidence scores to help you prioritize review time
- **📈 Analytics & Insights**: Comprehensive editing analytics and revision heatmaps

## 🚀 Quick Start

### Installation

1. **Install from Community Plugins**:
   - Open Obsidian Settings → Community Plugins
   - Search for "Track Edits" and install
   - Enable the plugin

2. **Manual Installation**:
   - Download the plugin files to `.obsidian/plugins/track-edits/`
   - Enable in Community Plugins settings

### First Steps

1. **Open Track Edits Panel**: Use `Ctrl/Cmd+Shift+T` or open from the ribbon
2. **Make Some Changes**: Edit any document—changes will appear automatically
3. **Review Changes**: Use the timeline panel to accept, reject, or review suggestions
4. **Try Batch Operations**: Select multiple changes and process them together

## 🎯 Core Features

### Visual Change Tracking

All text modifications are highlighted directly in your document:

- **🟢 Additions**: Green highlights for new text
- **🔴 Deletions**: Red strikethrough for removed text  
- **🔵 Modifications**: Blue highlights with strikethrough for replaced text
- **📏 Confidence Indicators**: Border thickness indicates AI confidence levels

### Timeline Panel

Your central command center for managing all changes:

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

### Intelligent Clustering

Related changes are automatically grouped for efficient processing:

- **📍 Proximity Clustering**: Changes near each other in the document
- **📂 Category Clustering**: Similar types grouped together (grammar, style, etc.)
- **🔧 Source Clustering**: Changes from the same AI function or plugin

### Change Attribution

Every modification is clearly attributed to its source:

- **✏️ Manual**: Changes you make directly
- **💬 Writerr Chat**: From conversational AI modes
- **⚙️ AI Functions**: From specialized editorial functions
- **🔌 Other Plugins**: Compatible third-party plugins

## ⚙️ Settings & Configuration

### Access Settings

Open Settings → Track Edits to configure:

### Essential Settings

**Change Detection**:
- ✅ **Track all changes**: Monitor all text modifications (recommended)
- **Confidence threshold**: Minimum confidence for auto-highlighting (0.7)
- **Clustering mode**: How to group related changes (Category recommended)

**Visual Appearance**:
- **Highlight colors**: Customize colors for different change types
- **Animation effects**: Enable/disable change animations
- **Theme compatibility**: Choose colors that work with your Obsidian theme

**Performance**:
- **Batch size limit**: Maximum changes to process at once (100 recommended)
- **Memory limits**: Resource limits for large documents
- **Timeline refresh**: How often to update the timeline (1 second)

### Advanced Settings

**Batch Processing**:
- **Auto-accept threshold**: Changes above this confidence are auto-applied (0.95)
- **Auto-highlight threshold**: Changes immediately visible above this score (0.8)
- **Review required threshold**: Changes requiring manual review below this (0.5)

**Memory Management**:
- **Auto-cleanup**: Remove old accepted changes after set time
- **Archive sessions**: Automatically archive completed editing sessions
- **Large document optimization**: Special handling for documents over 10,000 words

## 💡 Usage Tips

### Efficient Workflow

1. **Start with High Confidence**: Process changes with confidence > 0.8 first
2. **Use Clustering**: Accept entire clusters of related grammar fixes at once
3. **Filter by Category**: Focus on one type of change at a time
4. **Batch Similar Changes**: Select all spelling errors and process together

### Keyboard Shortcuts

Master these shortcuts for rapid change processing:

- `Ctrl/Cmd+Shift+T`: Toggle Track Edits panel
- `Ctrl/Cmd+Shift+A`: Accept focused change
- `Ctrl/Cmd+Shift+R`: Reject focused change  
- `Ctrl/Cmd+Shift+B`: Batch accept visible changes
- `Arrow Keys`: Navigate between changes
- `Tab/Shift+Tab`: Move between changes

### Working with Large Documents

For documents over 5,000 words:

1. **Enable lazy loading** in performance settings
2. **Use virtual timeline** to reduce memory usage
3. **Process in sections** rather than full document
4. **Regular cleanup** of old changes to maintain performance

## 🔧 Best Practices

### Review Workflow

**Academic Writing**:
1. Structure Phase → Developmental editing suggestions
2. Content Phase → Writing assistant improvements  
3. Copy Edit Phase → Grammar and style corrections
4. Final Polish → Proofreader suggestions
5. Review Timeline → Accept/reject systematically

**Fiction Writing**:
1. Creative Development → Plot and character suggestions
2. Style Consistency → Voice and tone improvements
3. Dialogue Polish → Character speech patterns
4. Technical Edit → Grammar and punctuation
5. Final Review → Complete audit trail

**Business Writing**:
1. Strategy → Content structure and messaging
2. Clarity → Readability and audience fit
3. Brand Voice → Consistency with guidelines
4. Accuracy → Fact-checking and precision
5. Polish → Professional presentation

### Performance Optimization

**Memory Management**:
- Clean up accepted changes regularly
- Archive old editing sessions
- Use document sections for very large files
- Monitor memory usage with complex documents

**Efficient Processing**:
- Process high-confidence changes first
- Use batch operations for similar changes
- Take advantage of intelligent clustering
- Set up custom categories for your writing style

## 🚨 Troubleshooting

### Common Issues

**Changes not appearing in timeline**:
- ✅ Check Track Edits is enabled for current document
- ✅ Verify memory limits aren't exceeded
- ✅ Restart plugin if needed

**Timeline is slow with many changes**:
- Enable lazy loading in performance settings
- Increase cleanup frequency
- Consider archiving old sessions
- Process changes in smaller batches

**Changes not highlighting in document**:
- Check theme compatibility in settings
- Verify document format is supported (markdown)
- Toggle inline visualization on/off

**Memory usage too high**:
- Enable automatic cleanup
- Reduce batch size limits
- Use virtual timeline for large documents
- Clear old change history

### Getting Help

- **Documentation**: Full guides at [Writerr Documentation](docs/user-guide/track-edits.md)
- **GitHub Issues**: Report bugs at [GitHub Repository]
- **Community**: Join the discussion on Discord
- **Updates**: Follow development progress

## 🔗 Integration

### Works With

Track Edits integrates seamlessly with:

- **Writerr Chat Plugin**: All chat suggestions flow through Track Edits
- **AI Editorial Functions Plugin**: Function outputs managed in timeline
- **Other Obsidian Plugins**: Compatible with most writing and editing plugins
- **Third-party AI Tools**: API available for custom integrations

### For Developers

Track Edits provides APIs for plugin integration:

```typescript
// Submit changes from your plugin
window.TrackEdits?.submitChanges({
  source: "Your Plugin Name",
  changes: [...],
  confidence: 0.85,
  category: "grammar"
});
```

## 📈 What's Next?

Once you're comfortable with Track Edits:

1. **Install Writerr Chat Plugin** for conversational AI assistance
2. **Add AI Editorial Functions** for specialized editing tools
3. **Explore Integration Workflows** using all three plugins together
4. **Customize** with your own categories and themes

---

**Track Edits transforms chaotic editing into organized, transparent, and efficient writing workflows. Take control of every change and write with confidence.**

*Part of the Writerr AI Editorial Platform - giving you complete Human control, Understanding, and Decision-making power over AI-assisted writing.*