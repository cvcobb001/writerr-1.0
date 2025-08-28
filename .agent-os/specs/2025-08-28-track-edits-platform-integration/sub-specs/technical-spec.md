# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-08-28-track-edits-platform-integration/spec.md

> Created: 2025-08-28
> Version: 1.0.0

## Technical Requirements

### 1. Enhanced EditChange Interface

Upgrade the existing EditChange interface to support platform-wide attribution and metadata:

```typescript
interface EditChange {
  id: string;
  timestamp: Date;
  from: number;
  to: number;
  text: string;
  originalText: string;
  source: 'user' | 'ai' | 'editorial-engine' | 'writerr-chat';
  aiMetadata?: {
    model: string;
    mode: string;
    timestamp: Date;
    confidence?: number;
  };
  conversationId?: string;
  processingId?: string;
  batchId?: string;
  accepted: boolean;
  rejected: boolean;
}

interface EditBatch {
  id: string;
  changes: EditChange[];
  source: EditChange['source'];
  timestamp: Date;
  conversationId?: string;
  processingId?: string;
  scope: 'selection' | 'paragraph' | 'section' | 'chapter' | 'document';
  status: 'pending' | 'accepted' | 'rejected' | 'partial';
}
```

### 2. Platform Integration APIs

#### Core API Extensions
```typescript
class TrackEditsPlugin {
  // New platform integration methods
  submitChangesFromAI(changes: EditChange[], metadata: AIProcessingMetadata): Promise<void>;
  subscribeToPlatformEvents(): void;
  unsubscribeFromPlatformEvents(): void;
  
  // Enhanced batch processing
  createBatch(changes: EditChange[], scope: EditBatch['scope']): EditBatch;
  processBatch(batch: EditBatch): Promise<void>;
  acceptBatch(batchId: string): Promise<void>;
  rejectBatch(batchId: string): Promise<void>;
}

interface AIProcessingMetadata {
  model: string;
  mode: string;
  conversationId?: string;
  processingId?: string;
  confidence?: number;
}
```

#### Global API Enhancement
```typescript
// Enhanced window.Writerr.trackEdits API
window.Writerr.trackEdits = {
  // Existing methods preserved
  getCurrentChanges(): EditChange[];
  getChangeHistory(): EditChange[];
  
  // New platform integration methods
  submitAIChanges(changes: EditChange[], metadata: AIProcessingMetadata): Promise<void>;
  subscribeToBatchEvents(callback: (event: BatchEvent) => void): void;
  getBatchStatus(batchId: string): EditBatch | null;
  acceptBatch(batchId: string): Promise<void>;
  rejectBatch(batchId: string): Promise<void>;
}
```

### 3. Context-Aware Batch Processing

#### Semantic Grouping Algorithm
```typescript
class BatchProcessor {
  private groupChangesByContext(changes: EditChange[]): EditBatch[] {
    // Group changes by:
    // 1. Temporal proximity (within 2 seconds)
    // 2. Spatial proximity (within same paragraph/section)
    // 3. Source attribution (same AI model/conversation)
    // 4. Processing context (same Editorial Engine rule)
  }
  
  private determineBatchScope(changes: EditChange[]): EditBatch['scope'] {
    // Analyze change distribution and content structure
    // Return appropriate scope level
  }
  
  private validateBatchSize(batch: EditBatch): boolean {
    // Enforce limits:
    // - Paragraph scope: max 5 changes
    // - Section scope: max 15 changes
    // - Chapter scope: max 50 changes
    // - Document scope: max 100 changes
  }
}
```

#### Progressive Processing
```typescript
interface ProgressiveProcessor {
  processBatchProgressive(batch: EditBatch): AsyncGenerator<EditChange, void, unknown>;
  pauseProcessing(): void;
  resumeProcessing(): void;
  cancelProcessing(): void;
}
```

### 4. Event Bus Integration

#### Event Bus Connection
```typescript
class PlatformEventHandler {
  private eventBus: WriterrEventBus;
  
  initialize() {
    this.eventBus = window.Writerr.events;
    this.subscribeToEvents();
  }
  
  private subscribeToEvents() {
    // Editorial Engine events
    this.eventBus.on('editorial-engine:processing-started', this.handleProcessingStarted.bind(this));
    this.eventBus.on('editorial-engine:changes-generated', this.handleChangesGenerated.bind(this));
    this.eventBus.on('editorial-engine:processing-completed', this.handleProcessingCompleted.bind(this));
    
    // Writerr Chat events
    this.eventBus.on('writerr-chat:message-sent', this.handleChatMessage.bind(this));
    this.eventBus.on('writerr-chat:ai-response', this.handleAIResponse.bind(this));
    this.eventBus.on('writerr-chat:editing-request', this.handleEditingRequest.bind(this));
  }
  
  // Event emission for cross-plugin coordination
  emitChangeEvent(change: EditChange) {
    this.eventBus.emit('track-edits:change-created', { change });
  }
  
  emitBatchEvent(batch: EditBatch) {
    this.eventBus.emit('track-edits:batch-processed', { batch });
  }
}
```

#### Event Types
```typescript
interface PlatformEvents {
  'track-edits:change-created': { change: EditChange };
  'track-edits:batch-processed': { batch: EditBatch };
  'track-edits:changes-accepted': { changes: EditChange[] };
  'track-edits:changes-rejected': { changes: EditChange[] };
}
```

### 5. Conversation Linking System

#### Conversation Context Manager
```typescript
class ConversationContextManager {
  private conversationMap = new Map<string, ConversationContext>();
  
  linkChangeToConversation(change: EditChange, conversationId: string) {
    const context = this.getOrCreateContext(conversationId);
    context.changes.push(change.id);
    change.conversationId = conversationId;
  }
  
  getConversationChanges(conversationId: string): EditChange[] {
    const context = this.conversationMap.get(conversationId);
    return context ? context.changes.map(id => this.getChangeById(id)).filter(Boolean) : [];
  }
  
  preserveConversationContext(conversationId: string): ConversationSnapshot {
    // Create immutable snapshot of conversation state
    // Include changes, metadata, and processing history
  }
}

interface ConversationContext {
  id: string;
  changes: string[]; // EditChange IDs
  metadata: Record<string, any>;
  createdAt: Date;
  lastActivity: Date;
}
```

## Approach

### Implementation Strategy

1. **Phase 1: Interface Enhancement**
   - Extend EditChange interface with new fields
   - Maintain backward compatibility with existing code
   - Add migration logic for existing change records

2. **Phase 2: Event Bus Integration**
   - Connect to window.Writerr.events system
   - Implement event handlers for platform events
   - Add event emission for Track Edits operations

3. **Phase 3: Batch Processing**
   - Implement semantic grouping algorithms
   - Add batch management UI components
   - Integrate progressive processing system

4. **Phase 4: Conversation Linking**
   - Build conversation context management
   - Add change attribution to chat messages
   - Implement context preservation system

### Code Integration Points

```typescript
// Main plugin class updates
export default class TrackEditsPlugin extends Plugin {
  private platformHandler: PlatformEventHandler;
  private batchProcessor: BatchProcessor;
  private conversationManager: ConversationContextManager;
  
  async onload() {
    // Existing initialization
    await this.initializeExistingFeatures();
    
    // New platform integration
    this.platformHandler = new PlatformEventHandler();
    this.batchProcessor = new BatchProcessor();
    this.conversationManager = new ConversationContextManager();
    
    await this.initializePlatformIntegration();
  }
}
```

### Data Migration Strategy

```typescript
class DataMigration {
  async migrateExistingChanges(): Promise<void> {
    // Convert existing EditChange records to new interface
    // Add default values for new fields
    // Preserve existing functionality
  }
  
  async validateMigration(): Promise<boolean> {
    // Verify all existing changes are accessible
    // Ensure no data loss during migration
  }
}
```

## External Dependencies

**NO NEW EXTERNAL DEPENDENCIES REQUIRED**

This implementation leverages existing platform infrastructure:

- **Obsidian Plugin API**: Core plugin functionality and editor integration
- **CodeMirror 6**: Text editing operations and change detection
- **TypeScript**: Type safety and interface definitions
- **window.Writerr Event Bus**: Cross-plugin communication (existing)
- **Editorial Engine API**: Constraint processing integration (existing)
- **Writerr Chat API**: Conversation management integration (existing)

### Platform API Requirements

The implementation assumes the following existing APIs are available:

```typescript
// Writerr Platform Event Bus (must exist)
window.Writerr.events: WriterrEventBus;

// Editorial Engine API (must exist)
window.Writerr.editorialEngine: EditorialEngineAPI;

// Writerr Chat API (must exist) 
window.Writerr.chat: WriterrChatAPI;
```

### Performance Considerations

- Batch processing limited to prevent UI blocking
- Event debouncing for high-frequency change events  
- Lazy loading of conversation context data
- Efficient change grouping algorithms with O(n log n) complexity
- Memory management for large change histories