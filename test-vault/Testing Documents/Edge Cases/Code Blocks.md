# Code Blocks Test Document

This document contains various code block types and programming language examples to test plugin handling of formatted code content.

## JavaScript Code

```javascript
// Function to track edit changes
function trackEdit(change) {
  const timestamp = Date.now();
  const editEvent = {
    type: change.type,
    content: change.text,
    position: change.from,
    timestamp: timestamp,
    user: getCurrentUser()
  };
  
  // Store the edit in history
  editHistory.push(editEvent);
  
  // Trigger visual update
  updateEditorDecorations(change);
}

// Complex async function
async function processAIRequest(text, context) {
  try {
    const response = await aiProvider.generateResponse({
      prompt: text,
      context: context,
      maxTokens: 1000
    });
    
    return {
      success: true,
      result: response.text,
      tokens: response.usage.totalTokens
    };
  } catch (error) {
    console.error('AI processing failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
```

## TypeScript Code

```typescript
interface EditChange {
  type: 'insert' | 'delete' | 'replace';
  text: string;
  range: {
    start: Position;
    end: Position;
  };
  timestamp: number;
  userId: string;
}

class TrackEditsPlugin extends Plugin {
  private editHistory: EditChange[] = [];
  private settings: TrackEditsSettings;
  
  async onload(): Promise<void> {
    await this.loadSettings();
    this.registerEditorExtension();
    this.addSettingTab(new TrackEditsSettingTab(this.app, this));
  }
  
  public trackChange(change: EditChange): void {
    this.editHistory.push(change);
    this.saveEditHistory();
    this.updateDecorations();
  }
  
  private async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
}
```

## Python Code

```python
import json
import asyncio
from typing import List, Dict, Optional
from dataclasses import dataclass
from datetime import datetime

@dataclass
class EditEvent:
    edit_type: str
    content: str
    position: int
    timestamp: datetime
    user_id: str
    
    def to_dict(self) -> Dict:
        return {
            'type': self.edit_type,
            'content': self.content,
            'position': self.position,
            'timestamp': self.timestamp.isoformat(),
            'user_id': self.user_id
        }

class EditTracker:
    def __init__(self):
        self.edit_history: List[EditEvent] = []
        self.observers: List[callable] = []
    
    def track_edit(self, edit: EditEvent) -> None:
        """Track a new edit event and notify observers."""
        self.edit_history.append(edit)
        self._notify_observers(edit)
    
    def _notify_observers(self, edit: EditEvent) -> None:
        for observer in self.observers:
            try:
                observer(edit)
            except Exception as e:
                print(f"Observer error: {e}")
    
    async def export_history(self, format: str = 'json') -> str:
        """Export edit history in specified format."""
        if format == 'json':
            return json.dumps([edit.to_dict() for edit in self.edit_history], indent=2)
        elif format == 'csv':
            # CSV export logic here
            pass
        else:
            raise ValueError(f"Unsupported format: {format}")
```

## Inline Code Examples

Here are some inline code examples:

- Variable name: `editHistory`
- Function call: `trackChange(newEdit)`
- CSS property: `color: #ff6b6b`
- File path: `/plugins/track-edits/src/main.ts`
- Command: `npm run build`
- API endpoint: `GET /api/v1/edits`

## SQL Code

```sql
-- Create table for storing edit history
CREATE TABLE edit_history (
    id SERIAL PRIMARY KEY,
    file_id VARCHAR(255) NOT NULL,
    edit_type VARCHAR(50) NOT NULL,
    content TEXT,
    position_start INTEGER,
    position_end INTEGER,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(255) NOT NULL,
    metadata JSONB
);

-- Index for performance
CREATE INDEX idx_edit_history_file_timestamp 
ON edit_history (file_id, timestamp DESC);

-- Query to get recent edits
SELECT 
    eh.edit_type,
    eh.content,
    eh.timestamp,
    u.username
FROM edit_history eh
JOIN users u ON eh.user_id = u.id
WHERE eh.file_id = $1
    AND eh.timestamp > NOW() - INTERVAL '24 hours'
ORDER BY eh.timestamp DESC
LIMIT 100;
```

## CSS/SCSS Code

```scss
// Track Edits styling
.edit-indicator {
  position: relative;
  border-radius: 2px;
  transition: all 0.2s ease-in-out;
  
  &--insert {
    background-color: rgba(46, 160, 67, 0.2);
    border-left: 3px solid #2ea043;
  }
  
  &--delete {
    background-color: rgba(248, 81, 73, 0.2);
    border-left: 3px solid #f85149;
    text-decoration: line-through;
  }
  
  &--replace {
    background-color: rgba(219, 154, 4, 0.2);
    border-left: 3px solid #db9a04;
  }
  
  // Hover effects
  &:hover {
    opacity: 0.8;
    
    &::after {
      content: attr(data-tooltip);
      position: absolute;
      bottom: 100%;
      left: 0;
      padding: 4px 8px;
      background: var(--background-modifier-border);
      border-radius: 4px;
      font-size: 11px;
      white-space: nowrap;
      z-index: 1000;
    }
  }
}

// Dark theme adjustments
.theme-dark {
  .edit-indicator {
    &--insert {
      background-color: rgba(46, 160, 67, 0.15);
    }
    
    &--delete {
      background-color: rgba(248, 81, 73, 0.15);
    }
  }
}
```

## JSON Configuration

```json
{
  "manifest": {
    "id": "track-edits",
    "name": "Track Edits",
    "version": "1.0.0",
    "minAppVersion": "1.0.0",
    "description": "Real-time visual tracking of document changes",
    "author": "Writerr AI Editorial Platform",
    "authorUrl": "https://github.com/writerr-ai",
    "isDesktopOnly": false
  },
  "settings": {
    "enableTracking": true,
    "showLineNumbers": true,
    "highlightChanges": true,
    "retentionDays": 30,
    "colorScheme": "default",
    "exportFormats": ["json", "csv", "markdown"],
    "aiIntegration": {
      "provider": "openai",
      "model": "gpt-4",
      "maxTokens": 1000,
      "temperature": 0.7
    }
  }
}
```

## Bash/Shell Scripts

```bash
#!/bin/bash

# Build script for Writerr plugins
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Building Writerr Plugin Suite...${NC}"

# Function to build individual plugin
build_plugin() {
    local plugin_name=$1
    echo -e "${YELLOW}Building $plugin_name...${NC}"
    
    if esbuild "plugins/$plugin_name/src/main.ts" \
        --bundle \
        --external:obsidian \
        --outfile="plugins/$plugin_name/main.js" \
        --format=cjs \
        --target=es2018 \
        --sourcemap; then
        echo -e "${GREEN}✓ $plugin_name built successfully${NC}"
    else
        echo -e "${RED}✗ Failed to build $plugin_name${NC}"
        exit 1
    fi
}

# Build all plugins
for plugin in track-edits writerr-chat ai-editorial-functions; do
    build_plugin "$plugin"
done

echo -e "${GREEN}All plugins built successfully!${NC}"

# Run tests if requested
if [[ "$1" == "--test" ]]; then
    echo -e "${YELLOW}Running tests...${NC}"
    npm test
fi
```

## YAML Configuration

```yaml
# GitHub Actions workflow
name: Build and Test Plugins

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [16, 18, 20]
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linting
        run: npm run lint
      
      - name: Run tests
        run: npm run test
      
      - name: Build plugins
        run: npm run build
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        if: success()
        with:
          name: built-plugins-node-${{ matrix.node-version }}
          path: plugins/*/main.js
```

## Markdown Code Blocks

```markdown
# Example Markdown Content

This is a **bold** statement and this is *italic*.

## Code Example

Here's some inline `code` and a block:

```javascript
console.log("Hello, World!");
```

### Lists

1. First item
2. Second item
   - Nested item
   - Another nested item

### Links and Images

[Link to Obsidian](https://obsidian.md)
![Alt text](image.png)

### Tables

| Plugin | Status | Version |
|--------|--------|---------|
| Track Edits | Active | 1.0.0 |
| Writerr Chat | Active | 1.0.0 |

### Blockquotes

> This is a blockquote with some **bold** text.
> 
> And a second paragraph.
```

## Testing Instructions

### Track Edits Testing

1. Make edits to code blocks and verify highlighting works
2. Test copying and pasting code between blocks
3. Verify that code formatting is preserved in edit history
4. Check performance with large code blocks

### Chat Testing

1. Send code snippets to AI chat for explanation
2. Test with various programming languages
3. Verify code formatting in chat responses
4. Test code generation and improvement suggestions

### Editorial Functions Testing

1. Apply functions to code documentation
2. Test with mixed code and prose content
3. Verify that code blocks are preserved during text processing
4. Test function behavior with different programming languages

### Expected Behaviors

- Code syntax highlighting should be preserved
- Edit tracking should work within code blocks
- Code blocks should not be modified by editorial functions unless specifically requested
- Copy/paste should preserve code formatting
- Search should work within code content
- No performance degradation with complex code structures