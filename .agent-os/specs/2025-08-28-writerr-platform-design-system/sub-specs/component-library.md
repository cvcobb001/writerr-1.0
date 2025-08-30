# Component Library Specification

This is the component library documentation for the spec detailed in @.agent-os/specs/2025-08-28-writerr-platform-design-system/spec.md

> Created: 2025-08-28
> Version: 1.0.0

## Component Architecture Patterns

### BaseComponent Foundation
```typescript
export abstract class BaseComponent implements ChatComponent {
  // Standard lifecycle
  abstract render(): void | Promise<void>;
  destroy(): void { this.container.empty(); }

  // Unified element creation
  protected createElement(tag: string, options: {
    cls?: string | string[];
    text?: string;
    attrs?: Record<string, string>;
    styles?: Record<string, string>;
    tooltip?: string;
  }): HTMLElement

  // Consistent hover effects
  protected addHoverEffect(element: HTMLElement, hoverStyles: Record<string, string>): void

  // Tooltip system
  protected addTooltip(element: HTMLElement, text: string, delay = 700): void
}
```

## Button Components

### Toolbar Button Pattern
```css
.writerr-toolbar-button {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  padding: 6px;
  border-radius: var(--radius-s);
  transition: all 0.2s ease;
}

.writerr-toolbar-button:hover {
  color: var(--text-normal);
  background: var(--background-modifier-hover);
}
```

**Usage Pattern:**
- 16px x 16px icons with 2px stroke
- 6px padding on all sides
- Lucide icons via centralized Icons system
- Consistent hover state with background color change

### Send Button Pattern
```css
.writerr-send-button {
  position: absolute;
  right: 12px;
  bottom: 12px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  padding: 8px;
  border-radius: var(--radius-s);
}

.writerr-send-button:hover:not(:disabled) {
  color: var(--interactive-accent);
  background: var(--background-modifier-hover);
}

.writerr-send-button:disabled {
  color: var(--text-faint);
  cursor: not-allowed;
}
```

**States:**
- **Active**: `color: var(--interactive-accent)` when input has content
- **Disabled**: `color: var(--text-faint)` with `cursor: not-allowed`
- **Loading**: Animated spinner icon with `animation: spin 1s linear infinite`

### Action Button Pattern (Message Actions)
```css
.writerr-message-actions button {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  padding: 4px;
  border-radius: var(--radius-s);
  transition: all 0.2s ease;
}

.writerr-message-actions button:hover {
  color: var(--text-normal);
  background: var(--background-modifier-hover);
}
```

**Implementation:**
- 14px x 14px icons
- 4px padding
- Always visible (no hover-to-show pattern)
- Opacity 0.6 default, 1.0 on hover

## Input Components

### Chat Input Pattern
```typescript
// Auto-resize textarea with sophisticated styling
this.messageInput.style.cssText = `
  width: 100%;
  min-height: 80px;
  max-height: 200px;
  padding: 12px 52px 12px 12px;
  border: 2px solid var(--background-modifier-border);
  border-radius: 12px;
  background: var(--background-primary);
  color: var(--text-normal);
  resize: none;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.4;
  outline: none;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
`;
```

**Key Features:**
- **12px border radius** for rounded appearance
- **2px borders** with hover/focus state changes
- **Auto-resize functionality** with min/max height constraints
- **Focus styling**: `border-color: var(--interactive-accent)` with enhanced box-shadow
- **Reserved space**: 52px right padding for send button placement

### Dropdown Button Pattern (Toolbar Selectors)
```typescript
// Model/Prompt selector styling
button.style.cssText = `
  background: transparent;
  border: none;
  padding: 6px 24px 6px 8px;
  font-size: 12px;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 4px;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  position: relative;
  font-family: inherit;
`;
```

**Specifications:**
- **140px max width** with ellipsis overflow
- **24px right padding** for chevron icon
- **Chevron positioning**: Absolute positioned at right: 6px
- **Manual truncation logic** for text longer than ~15 characters

## Icon System

### Icon Configuration Standards
```typescript
const DEFAULT_CONFIG: Required<IconConfig> = {
  viewBox: '0 0 24 24',
  width: 16,
  height: 16,
  strokeWidth: 2,
  className: 'writerr-icon'
};

export const ICON_SIZES = {
  xs: { width: 14, height: 14 },    // Context actions
  sm: { width: 16, height: 16 },    // Standard toolbar
  md: { width: 20, height: 20 },    // Message avatars
  lg: { width: 24, height: 24 },    // Large buttons
  xl: { width: 28, height: 28 }     // Message icons
};
```

### Icon Style Presets
```typescript
export const ICON_STYLES = {
  toolbar: { className: 'writerr-toolbar-icon', ...ICON_SIZES.md },
  action: { className: 'writerr-action-icon', ...ICON_SIZES.md },
  context: { className: 'writerr-context-action-icon', ...ICON_SIZES.md },
  send: { className: 'writerr-send-icon', ...ICON_SIZES.md },
  message: { className: 'writerr-message-icon', ...ICON_SIZES.xl }
};
```

**Icon Usage Examples:**
```typescript
// Standard usage
Icons.send({ className: 'writerr-send-icon', width: 16, height: 16 })

// Using presets
createStyledIcon('filePlus2', 'toolbar')

// Custom configuration
Icons.chevronDown({ width: 10, height: 10 })
```

## Layout Patterns

### Message Bubble Structure
```typescript
// Role-based styling for user vs AI messages
const isUser = this.message.role === 'user';

this.messageEl = this.createElement('div', {
  cls: ['chat-message', `chat-message-${this.message.role}`],
  styles: {
    display: 'flex',
    margin: '16px 0',
    gap: '12px',
    position: 'relative',
    alignItems: 'flex-start',
    ...(isUser ? { 'flex-direction': 'row-reverse' } : {})
  }
});
```

**Styling Differences:**
- **User messages**: `border: 2px solid var(--background-modifier-border)`, `border-bottom-right-radius: 6px`
- **AI messages**: `border: 1px solid var(--background-modifier-border)`, `border-bottom-left-radius: 6px`
- **Padding**: `12px 16px` standard
- **Border radius**: `18px` with corner-specific overrides

### Toolbar Layout Pattern
```css
.writerr-chat-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-top: 1px solid var(--background-modifier-border);
  background: var(--background-primary);
  min-height: 44px;
}

.writerr-toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: 8px;
}
```

## Animation Standards

### Standard Transitions
```css
/* Universal transition timing */
transition: all 0.2s ease;

/* Hover scale effects */
transform: scale(1.05); /* hover */
transform: scale(0.95); /* click */
```

### Loading Animation
```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Applied during loading states */
animation: spin 1s linear infinite;
```

### Hover State Management
```typescript
// Programmatic hover effect implementation
this.addHoverEffect(element, {
  'backgroundColor': 'var(--background-modifier-hover)',
  'color': 'var(--interactive-accent)',
  'transform': 'scale(1.05)'
});
```

## Spacing System

### Standard Spacing Values
- **4px**: Small gaps, icon spacing
- **6px**: Button padding 
- **8px**: Container padding, medium gaps
- **12px**: Large gaps, input padding
- **16px**: Message margins, large containers
- **24px**: Right padding for dropdown arrows

### Border Radius Standards
- **4px**: Small buttons, minor rounding
- **12px**: Input fields, major rounding
- **18px**: Message bubbles
- **var(--radius-s)**: Obsidian standard for small elements

## Tooltip System

### Universal Tooltip Implementation
```css
[data-tooltip]:hover::before {
  content: attr(data-tooltip);
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--background-primary);
  color: var(--text-normal);
  border: 1px solid var(--background-modifier-border);
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 11px;
  white-space: nowrap;
  z-index: 9999999;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  pointer-events: none;
}
```

**Implementation:**
- **700ms delay** before showing (consistent across all tooltips)
- **Dynamic import** to avoid circular dependencies
- **Positioning**: Bottom-centered above trigger element
- **Styling**: Uses Obsidian theme colors for consistency