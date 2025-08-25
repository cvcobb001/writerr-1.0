# Track Edits API Documentation

The Track Edits API provides programmatic access to the universal change management system, allowing other plugins and external tools to integrate with Writerr's change tracking capabilities.

## Overview

The Track Edits API is exposed through the global `window.TrackEdits` object and provides methods for submitting changes, listening to events, and managing the change timeline.

### API Access

```typescript
// Check if Track Edits is available
if (window.TrackEdits) {
  // API is available
  const trackEdits = window.TrackEdits;
}
```

### Core Concepts

- **Changes**: Individual text modifications with metadata
- **Sources**: Origin of changes (plugins, functions, manual edits)
- **Categories**: Types of changes (grammar, style, clarity, etc.)
- **Confidence**: AI confidence scores for suggested changes (0.0-1.0)
- **Batches**: Groups of related changes processed together

## API Reference

### Change Submission

#### `submitChange(change: ChangeSubmission): Promise<string>`

Submit a single change to the Track Edits system.

```typescript
interface ChangeSubmission {
  source: string;           // Source identifier (e.g., "My Plugin")
  type: ChangeType;         // 'addition', 'deletion', 'modification'
  original: string;         // Original text (for deletions/modifications)
  suggested: string;        // Suggested text (for additions/modifications)
  position: Position;       // Location in document
  category: string;         // Change category
  confidence: number;       // Confidence score (0.0-1.0)
  explanation?: string;     // Optional explanation
  metadata?: any;           // Optional additional data
}

interface Position {
  line: number;
  ch: number;
  length?: number;          // Length of original text
}

type ChangeType = 'addition' | 'deletion' | 'modification';
```

**Example Usage**:

```typescript
const change: ChangeSubmission = {
  source: "Grammar Checker Plugin",
  type: "modification",
  original: "recieve",
  suggested: "receive",
  position: { line: 5, ch: 10, length: 7 },
  category: "spelling",
  confidence: 0.98,
  explanation: "Corrected spelling: 'i before e except after c'"
};

const changeId = await window.TrackEdits.submitChange(change);
console.log(`Change submitted with ID: ${changeId}`);
```

#### `submitBatch(changes: ChangeSubmission[], options?: BatchOptions): Promise<string[]>`

Submit multiple changes as a batch for efficient processing.

```typescript
interface BatchOptions {
  batchId?: string;         // Optional batch identifier
  priority?: 'low' | 'normal' | 'high';
  autoProcess?: boolean;    // Whether to auto-process high-confidence changes
  metadata?: any;           // Batch-level metadata
}
```

**Example Usage**:

```typescript
const changes: ChangeSubmission[] = [
  {
    source: "Style Checker",
    type: "modification",
    original: "very good",
    suggested: "excellent",
    position: { line: 1, ch: 15, length: 9 },
    category: "style",
    confidence: 0.75
  },
  {
    source: "Style Checker", 
    type: "modification",
    original: "big problem",
    suggested: "significant issue",
    position: { line: 3, ch: 8, length: 11 },
    category: "style", 
    confidence: 0.82
  }
];

const changeIds = await window.TrackEdits.submitBatch(changes, {
  batchId: "style-improvements-001",
  priority: "normal",
  autoProcess: false
});
```

### Change Management

#### `getChange(changeId: string): Promise<Change | null>`

Retrieve details about a specific change.

```typescript
interface Change {
  id: string;
  source: string;
  type: ChangeType;
  original: string;
  suggested: string;
  position: Position;
  category: string;
  confidence: number;
  explanation?: string;
  metadata?: any;
  status: ChangeStatus;
  timestamp: Date;
  userId?: string;
}

type ChangeStatus = 'pending' | 'accepted' | 'rejected' | 'processing';
```

**Example Usage**:

```typescript
const change = await window.TrackEdits.getChange("change-123");
if (change) {
  console.log(`Change status: ${change.status}`);
  console.log(`Confidence: ${change.confidence}`);
}
```

#### `getChanges(filter?: ChangeFilter): Promise<Change[]>`

Retrieve multiple changes with optional filtering.

```typescript
interface ChangeFilter {
  source?: string;          // Filter by source
  category?: string;        // Filter by category
  status?: ChangeStatus;    // Filter by status
  minConfidence?: number;   // Minimum confidence threshold
  maxConfidence?: number;   // Maximum confidence threshold
  dateRange?: {            // Filter by date range
    start: Date;
    end: Date;
  };
  limit?: number;          // Maximum number of results
  offset?: number;         // Pagination offset
}
```

**Example Usage**:

```typescript
// Get all pending grammar changes with high confidence
const grammarChanges = await window.TrackEdits.getChanges({
  category: "grammar",
  status: "pending", 
  minConfidence: 0.9
});

// Get recent changes from specific source
const recentChanges = await window.TrackEdits.getChanges({
  source: "My Plugin",
  dateRange: {
    start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
    end: new Date()
  },
  limit: 50
});
```

#### `acceptChange(changeId: string): Promise<boolean>`

Accept a pending change, applying it to the document.

```typescript
const success = await window.TrackEdits.acceptChange("change-123");
if (success) {
  console.log("Change accepted and applied");
}
```

#### `rejectChange(changeId: string, reason?: string): Promise<boolean>`

Reject a pending change, removing it from consideration.

```typescript
const success = await window.TrackEdits.rejectChange("change-123", "Doesn't fit writing style");
if (success) {
  console.log("Change rejected");
}
```

#### `acceptBatch(changeIds: string[]): Promise<BatchResult>`

Accept multiple changes in a single operation.

```typescript
interface BatchResult {
  successful: string[];     // IDs of successfully processed changes
  failed: string[];         // IDs of changes that failed to process
  errors: Record<string, string>; // Error messages for failed changes
}
```

**Example Usage**:

```typescript
const result = await window.TrackEdits.acceptBatch([
  "change-123", 
  "change-124", 
  "change-125"
]);

console.log(`${result.successful.length} changes accepted`);
if (result.failed.length > 0) {
  console.log("Failed changes:", result.failed);
  console.log("Errors:", result.errors);
}
```

### Event System

#### `on(event: string, callback: Function): void`

Listen for Track Edits events.

**Available Events**:
- `change-submitted`: New change submitted to system
- `change-accepted`: Change accepted by user
- `change-rejected`: Change rejected by user
- `batch-processed`: Batch of changes processed
- `timeline-updated`: Change timeline updated
- `settings-changed`: Track Edits settings modified

```typescript
// Listen for accepted changes
window.TrackEdits.on('change-accepted', (change: Change) => {
  console.log(`Change accepted: ${change.id}`);
  console.log(`Source: ${change.source}`);
  console.log(`Type: ${change.type}`);
  
  // Your plugin can react to accepted changes
  if (change.source === "My Plugin") {
    // Update your plugin's internal state
    updatePluginStats(change);
  }
});

// Listen for rejected changes to improve future suggestions
window.TrackEdits.on('change-rejected', (change: Change, reason?: string) => {
  console.log(`Change rejected: ${change.id}`);
  if (reason) {
    console.log(`Rejection reason: ${reason}`);
  }
  
  // Learn from rejection patterns
  if (change.source === "My Plugin") {
    adjustPluginBehavior(change, reason);
  }
});

// Listen for batch processing completion
window.TrackEdits.on('batch-processed', (batchId: string, results: BatchResult) => {
  console.log(`Batch ${batchId} processed`);
  console.log(`Success rate: ${results.successful.length}/${results.successful.length + results.failed.length}`);
});
```

#### `off(event: string, callback?: Function): void`

Remove event listeners.

```typescript
// Remove specific callback
window.TrackEdits.off('change-accepted', myCallback);

// Remove all callbacks for an event
window.TrackEdits.off('change-accepted');
```

### Configuration and Settings

#### `getSettings(): Promise<TrackEditsSettings>`

Retrieve current Track Edits configuration.

```typescript
interface TrackEditsSettings {
  confidenceThresholds: {
    autoAccept: number;     // Auto-accept threshold (default: 0.95)
    autoHighlight: number;  // Auto-highlight threshold (default: 0.8)
    reviewRequired: number; // Manual review threshold (default: 0.5)
  };
  batchProcessing: {
    maxBatchSize: number;   // Maximum changes per batch
    processingDelay: number; // Delay between batches (ms)
    autoProcess: boolean;   // Enable automatic processing
  };
  visualization: {
    showInlineChanges: boolean;
    animationsEnabled: boolean;
    colorScheme: 'default' | 'high-contrast' | 'subtle';
  };
  categories: Record<string, CategorySettings>;
}

interface CategorySettings {
  color: string;           // CSS color for this category
  priority: 'low' | 'normal' | 'high';
  autoBatch: boolean;      // Whether to auto-batch this category
}
```

**Example Usage**:

```typescript
const settings = await window.TrackEdits.getSettings();
console.log(`Auto-accept threshold: ${settings.confidenceThresholds.autoAccept}`);

// Adapt your plugin behavior based on user settings
if (settings.batchProcessing.autoProcess) {
  // Use higher confidence thresholds when auto-processing is enabled
  adjustConfidenceThresholds(0.9);
} else {
  // More aggressive suggestions when user reviews manually
  adjustConfidenceThresholds(0.7);
}
```

#### `updateSettings(partial: Partial<TrackEditsSettings>): Promise<boolean>`

Update Track Edits configuration (requires appropriate permissions).

```typescript
const success = await window.TrackEdits.updateSettings({
  confidenceThresholds: {
    autoAccept: 0.98  // Raise auto-accept threshold
  }
});
```

### Timeline Management

#### `getTimeline(options?: TimelineOptions): Promise<TimelineEntry[]>`

Retrieve the change timeline for display or analysis.

```typescript
interface TimelineOptions {
  includeAccepted?: boolean;    // Include accepted changes (default: true)
  includeRejected?: boolean;    // Include rejected changes (default: false)
  includePending?: boolean;     // Include pending changes (default: true)
  limit?: number;               // Maximum entries to return
  groupBy?: 'source' | 'category' | 'time' | 'confidence';
}

interface TimelineEntry {
  id: string;
  type: 'change' | 'batch' | 'user-action';
  timestamp: Date;
  description: string;
  changes: Change[];            // Associated changes
  metadata?: any;
}
```

**Example Usage**:

```typescript
// Get recent timeline for dashboard display
const timeline = await window.TrackEdits.getTimeline({
  limit: 20,
  groupBy: 'time'
});

timeline.forEach(entry => {
  console.log(`${entry.timestamp}: ${entry.description}`);
  console.log(`  Changes: ${entry.changes.length}`);
});
```

#### `clearTimeline(options?: ClearOptions): Promise<boolean>`

Clear timeline entries based on specified criteria.

```typescript
interface ClearOptions {
  olderThan?: Date;            // Clear entries older than date
  status?: ChangeStatus[];     // Clear entries with specific statuses
  sources?: string[];          // Clear entries from specific sources
  categories?: string[];       // Clear entries of specific categories
}
```

**Example Usage**:

```typescript
// Clear accepted changes older than 1 hour
await window.TrackEdits.clearTimeline({
  olderThan: new Date(Date.now() - 60 * 60 * 1000),
  status: ['accepted']
});
```

## Integration Examples

### Simple Grammar Checker Plugin

```typescript
class SimpleGrammarChecker {
  private enabled = false;

  async initialize() {
    // Check if Track Edits is available
    if (!window.TrackEdits) {
      console.error("Track Edits plugin not found");
      return false;
    }

    // Listen for accepted changes to learn preferences
    window.TrackEdits.on('change-accepted', this.onChangeAccepted.bind(this));
    window.TrackEdits.on('change-rejected', this.onChangeRejected.bind(this));
    
    this.enabled = true;
    return true;
  }

  async checkGrammar(text: string, position: Position) {
    if (!this.enabled) return;

    // Simple grammar check (replace with real grammar checking)
    const issues = this.findGrammarIssues(text);
    
    const changes: ChangeSubmission[] = issues.map(issue => ({
      source: "Simple Grammar Checker",
      type: "modification",
      original: issue.original,
      suggested: issue.suggestion,
      position: {
        line: position.line,
        ch: position.ch + issue.start,
        length: issue.original.length
      },
      category: "grammar",
      confidence: issue.confidence,
      explanation: issue.explanation
    }));

    if (changes.length > 0) {
      await window.TrackEdits.submitBatch(changes, {
        batchId: `grammar-check-${Date.now()}`,
        priority: "normal"
      });
    }
  }

  private onChangeAccepted(change: Change) {
    if (change.source === "Simple Grammar Checker") {
      // Learn from accepted changes
      this.updateSuccessPattern(change);
    }
  }

  private onChangeRejected(change: Change, reason?: string) {
    if (change.source === "Simple Grammar Checker") {
      // Learn from rejected changes
      this.updateRejectionPattern(change, reason);
    }
  }

  private findGrammarIssues(text: string) {
    // Implement grammar checking logic
    const issues = [];
    
    // Example: detect "recieve" -> "receive"
    const receiveRegex = /\brecieve\b/gi;
    let match;
    while ((match = receiveRegex.exec(text)) !== null) {
      issues.push({
        start: match.index,
        original: match[0],
        suggestion: match[0].replace(/recieve/i, "receive"),
        confidence: 0.98,
        explanation: "Spelling correction: 'i before e except after c'"
      });
    }
    
    return issues;
  }

  private updateSuccessPattern(change: Change) {
    // Implement learning logic
    console.log(`Learning from accepted change: ${change.explanation}`);
  }

  private updateRejectionPattern(change: Change, reason?: string) {
    // Implement learning logic
    console.log(`Learning from rejected change: ${change.explanation}, reason: ${reason}`);
  }
}

// Initialize plugin
const grammarChecker = new SimpleGrammarChecker();
grammarChecker.initialize();
```

### Style Analysis Plugin

```typescript
class StyleAnalyzer {
  private stylePreferences: Record<string, number> = {};

  async analyzeStyle(document: string) {
    const suggestions = this.analyzeWritingStyle(document);
    
    // Filter suggestions based on user preferences
    const filteredSuggestions = suggestions.filter(suggestion => {
      const preferenceKey = `${suggestion.category}-${suggestion.type}`;
      const preference = this.stylePreferences[preferenceKey] || 0.5;
      return suggestion.confidence * preference > 0.6;
    });

    if (filteredSuggestions.length > 0) {
      await window.TrackEdits.submitBatch(filteredSuggestions, {
        batchId: `style-analysis-${Date.now()}`,
        priority: "low", // Style suggestions are lower priority
        autoProcess: false // Always require manual review for style
      });
    }
  }

  private analyzeWritingStyle(text: string): ChangeSubmission[] {
    // Implement style analysis logic
    return []; // Placeholder
  }
}
```

## Error Handling

The Track Edits API uses standard JavaScript Promises and will reject with error objects:

```typescript
interface TrackEditsError {
  code: string;
  message: string;
  details?: any;
}
```

**Common Error Codes**:
- `INVALID_CHANGE`: Change submission has invalid format or data
- `POSITION_OUT_OF_RANGE`: Specified position doesn't exist in document
- `DUPLICATE_CHANGE`: Change already exists at this position
- `RATE_LIMIT_EXCEEDED`: Too many changes submitted too quickly
- `PLUGIN_NOT_AUTHORIZED`: Plugin lacks required permissions
- `DOCUMENT_LOCKED`: Document is currently locked for editing

**Example Error Handling**:

```typescript
try {
  const changeId = await window.TrackEdits.submitChange(change);
  console.log(`Change submitted: ${changeId}`);
} catch (error) {
  const trackEditsError = error as TrackEditsError;
  
  switch (trackEditsError.code) {
    case 'INVALID_CHANGE':
      console.error("Invalid change format:", trackEditsError.details);
      break;
    case 'POSITION_OUT_OF_RANGE':
      console.error("Position doesn't exist in document");
      break;
    case 'RATE_LIMIT_EXCEEDED':
      console.warn("Rate limit exceeded, retrying in 1 second");
      setTimeout(() => this.submitChange(change), 1000);
      break;
    default:
      console.error("Unknown error:", trackEditsError.message);
  }
}
```

## Best Practices

### Performance Considerations

1. **Batch Related Changes**: Submit multiple related changes as batches rather than individual submissions
2. **Use Appropriate Confidence Scores**: Higher confidence scores for mechanical fixes, lower for stylistic suggestions
3. **Implement Rate Limiting**: Don't submit too many changes too quickly
4. **Clean Up**: Remove event listeners when your plugin is disabled

### User Experience

1. **Provide Clear Explanations**: Always include helpful explanation text for changes
2. **Use Appropriate Categories**: Choose categories that help users understand change types
3. **Respect User Preferences**: Learn from accepted/rejected changes to improve future suggestions
4. **Handle Errors Gracefully**: Provide meaningful error messages and recovery options

### Integration Guidelines

1. **Check API Availability**: Always verify Track Edits is loaded before using API
2. **Use Semantic Versioning**: Check API version compatibility if using advanced features
3. **Follow Naming Conventions**: Use clear, descriptive source names for your plugin
4. **Document Your Integration**: Help users understand how your plugin works with Track Edits

## API Version Compatibility

Current API Version: `1.0.0`

The Track Edits API follows semantic versioning:
- **Major Version**: Breaking changes to existing API methods
- **Minor Version**: New features added without breaking existing functionality  
- **Patch Version**: Bug fixes and non-breaking improvements

```typescript
// Check API version compatibility
const apiVersion = window.TrackEdits.version;
const [major, minor, patch] = apiVersion.split('.').map(Number);

if (major >= 1) {
  // API is compatible with your plugin
} else {
  console.error("Incompatible Track Edits API version");
}
```