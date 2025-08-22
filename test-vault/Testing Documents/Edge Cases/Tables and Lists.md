# Tables and Lists Test Document

This document contains various table formats and list structures to test plugin handling of structured content.

## Simple Tables

### Basic Table

| Feature | Track Edits | Writerr Chat | AI Editorial Functions |
|---------|-------------|--------------|------------------------|
| Real-time tracking | ✅ | ❌ | ❌ |
| AI integration | ❌ | ✅ | ✅ |
| Visual indicators | ✅ | ❌ | ✅ |
| Export functionality | ✅ | ✅ | ❌ |

### Table with Alignment

| Left Aligned | Center Aligned | Right Aligned |
|:-------------|:--------------:|--------------:|
| Text | Text | Text |
| More text | More text | More text |
| Even more | Even more | Even more |

### Table with Complex Content

| Plugin | Description | Key Features | Status |
|--------|-------------|--------------|--------|
| **Track Edits** | Visual tracking of document changes with comprehensive history | • Real-time highlighting<br>• Change timeline<br>• Export options | 🟢 Active |
| **Writerr Chat** | AI-powered chat assistant for writing help | • Multiple AI providers<br>• Context awareness<br>• Chat history | 🟢 Active |
| **Editorial Functions** | Specialized writing improvement tools | • Grammar checking<br>• Style enhancement<br>• Custom functions | 🟢 Active |

## List Structures

### Unordered Lists

- Track Edits Plugin Features:
  - Real-time change tracking
  - Visual highlighting with colors
  - Comprehensive edit history
  - Multiple export formats
  - User customization options

- Writerr Chat Plugin Features:
  - Multiple AI provider support
    - OpenAI GPT models
    - Anthropic Claude
    - Local AI providers
  - Context-aware responses
  - Persistent chat history
  - Integration with document content

- AI Editorial Functions:
  - Academic writing tools
    - Citation checking
    - Argument analysis
    - Research assistance
  - Business writing tools
    - Executive summary generation
    - Professional tone adjustment
  - Creative writing tools
    - Character development
    - Plot structure analysis
  - Technical writing tools
    - API documentation
    - Code explanation

### Ordered Lists

1. Installation Process:
   1. Download plugin files
   2. Copy to Obsidian plugins directory
   3. Enable plugins in settings
   4. Configure initial settings
   5. Restart Obsidian if needed

2. Configuration Steps:
   1. Track Edits Configuration:
      1. Set color scheme preference
      2. Configure retention period
      3. Enable/disable features
      4. Set export preferences
   2. Writerr Chat Configuration:
      1. Add AI provider API keys
      2. Select default provider
      3. Configure response settings
      4. Set up context preferences
   3. Editorial Functions Configuration:
      1. Select active function categories
      2. Configure custom functions
      3. Set processing preferences
      4. Enable/disable batch processing

### Mixed Lists

1. **Plugin Testing Phases**:
   - Phase 1: Basic functionality
     1. Installation verification
     2. Core feature testing
     3. Settings validation
   - Phase 2: Integration testing
     1. Cross-plugin communication
     2. API compatibility
     3. Performance impact
   - Phase 3: Edge case testing
     1. Large document handling
     2. Special character support
     3. Error condition handling

### Task Lists

#### Testing Checklist

- [ ] **Track Edits Testing**
  - [x] Basic edit tracking
  - [x] Visual highlighting
  - [ ] Export functionality
  - [ ] Performance with large files
  - [ ] Settings persistence

- [ ] **Writerr Chat Testing**
  - [x] Basic chat functionality
  - [ ] Multiple AI providers
  - [ ] Context integration
  - [ ] Chat history
  - [ ] Error handling

- [ ] **Editorial Functions Testing**
  - [ ] Function discovery
  - [ ] Text processing
  - [ ] Batch operations
  - [ ] Custom functions
  - [ ] Mode switching

#### Development Milestones

- [x] ~~Core architecture design~~
- [x] ~~Plugin framework implementation~~
- [x] ~~Basic UI components~~
- [ ] Advanced AI integration
- [ ] Performance optimization
- [ ] User documentation
- [ ] Beta testing program
- [ ] Production deployment

## Nested Table Structures

### Comparison Matrix

| Aspect | Small Documents | Medium Documents | Large Documents |
|--------|----------------|------------------|-----------------|
| **Performance** | | | |
| Load time | < 100ms | < 500ms | < 2s |
| Edit responsiveness | Instant | < 50ms | < 100ms |
| Memory usage | Minimal | Low | Moderate |
| **Features** | | | |
| Real-time tracking | Full support | Full support | Optimized mode |
| AI processing | Full context | Selective context | Chunked processing |
| Export options | All formats | All formats | Optimized formats |
| **Limitations** | | | |
| Max file size | Any | < 100MB | Streaming mode |
| Concurrent users | Unlimited | < 50 | < 10 |
| History retention | Full | Configurable | Limited |

## Lists with Code and Formatting

### API Reference

1. **TrackEdits API**:
   - `trackChange(change: EditChange): void`
     - Parameters: `change` object with type, content, position
     - Returns: Nothing
     - Example: `window.TrackEdits.trackChange({type: 'insert', text: 'Hello', position: 0})`
   
   - `getEditHistory(fileId?: string): EditChange[]`
     - Parameters: Optional file ID filter
     - Returns: Array of edit changes
     - Example: `const history = window.TrackEdits.getEditHistory('current-file')`

2. **WriterChat API**:
   - `sendMessage(message: string, context?: any): Promise<ChatResponse>`
     - Parameters: Message string and optional context
     - Returns: Promise resolving to chat response
     - Example: 
       ```javascript
       const response = await window.WriterChat.sendMessage(
         'Improve this text', 
         {selectedText: 'original text'}
       );
       ```

### Configuration Examples

1. **Plugin Settings Structure**:
   ```typescript
   interface PluginSettings {
     // Track Edits settings
     trackEdits: {
       enableTracking: boolean;        // Default: true
       colorScheme: string;           // Options: 'default', 'colorblind', 'dark'
       retentionDays: number;         // Default: 30
     };
     
     // Chat settings
     chat: {
       defaultProvider: string;       // Options: 'openai', 'anthropic', 'local'
       maxTokens: number;            // Default: 1000
       temperature: number;          // Range: 0.0 - 2.0
     };
   }
   ```

## Complex Nested Structures

### Project Structure

- **Writerr Plugin Suite**
  - Core Components:
    1. **Track Edits Plugin**
       - Main Features:
         - [ ] Real-time change visualization
         - [ ] Edit history management
         - [ ] Export capabilities
       - Technical Details:
         - Language: TypeScript
         - Framework: Obsidian Plugin API
         - Dependencies: None
    
    2. **Writerr Chat Plugin**
       - Main Features:
         - [ ] AI provider integration
         - [ ] Context-aware responses
         - [ ] Chat history persistence
       - Technical Details:
         - Language: TypeScript
         - Framework: Obsidian Plugin API
         - Dependencies: AI provider SDKs
    
    3. **AI Editorial Functions Plugin**
       - Main Features:
         - [ ] Function library management
         - [ ] Text processing pipeline
         - [ ] Mode-based operation
       - Technical Details:
         - Language: TypeScript
         - Framework: Obsidian Plugin API
         - Dependencies: AI provider SDKs

## Testing Instructions

### Table Testing

1. **Edit Tracking in Tables**:
   - Make edits to table content
   - Add/remove rows and columns
   - Verify tracking works across table structure
   - Test with complex table formatting

2. **Chat with Tables**:
   - Select table content and send to chat
   - Ask for table formatting improvements
   - Test table creation requests
   - Verify proper table rendering in responses

3. **Editorial Functions with Tables**:
   - Apply functions to table content
   - Test with table headers and data
   - Verify table structure preservation
   - Check formatting consistency

### List Testing

1. **Edit Tracking in Lists**:
   - Add/remove list items
   - Change list nesting levels
   - Convert between ordered/unordered lists
   - Test with task list checkboxes

2. **Chat with Lists**:
   - Send list content to chat for improvement
   - Request list formatting changes
   - Test list creation from unstructured text
   - Verify proper list syntax in responses

3. **Editorial Functions with Lists**:
   - Apply functions to list content
   - Test with nested list structures
   - Verify list formatting preservation
   - Check task list functionality

### Expected Behaviors

- Table and list structures should be preserved during edits
- Edit tracking should work within structured content
- Chat should handle tables and lists appropriately
- Editorial functions should respect formatting
- Copy/paste should maintain structure
- Export should preserve formatting
- Performance should remain good with complex structures

### Common Issues to Watch For

- Tables breaking with certain edits
- List indentation problems
- Task list checkbox state changes
- Performance degradation with large tables
- Copy/paste formatting issues
- Export formatting problems