# Writerr Platform Tooltip System Standards

> **Created**: 2025-08-28  
> **Purpose**: Document tooltip implementation patterns and standardize tooltip behavior across the platform  
> **Status**: Phase 3 Animation and Interaction Standards  
> **Analysis Source**: Writerr Chat Plugin v1.0

## Overview

The Writerr Platform implements a centralized tooltip system that provides consistent appearance, intelligent positioning, and accessibility features across all components. The system uses a singleton manager pattern with dynamic import optimization and seamless integration with the BaseComponent architecture.

## Tooltip Architecture

### Core Tooltip Manager System

**TooltipManager Singleton Pattern:**
```typescript
export class TooltipManager {
  private static instance: TooltipManager;
  private activeTooltip: HTMLElement | null = null;
  private showTimeout: number | null = null;
  private hideTimeout: number | null = null;

  static getInstance(): TooltipManager {
    if (!TooltipManager.instance) {
      TooltipManager.instance = new TooltipManager();
    }
    return TooltipManager.instance;
  }

  private constructor() {
    this.addGlobalStyles();
  }
}
```

**Interface Definition:**
```typescript
export interface TooltipOptions {
  text: string;
  delay?: number;      // Default: 700ms
  offset?: number;     // Default: 8px
  className?: string;  // Optional custom styling
}
```

### BaseComponent Integration

**Seamless Component Integration:**
```typescript
protected addTooltip(element: HTMLElement, text: string, delay = 700): void {
  // Dynamic import to avoid circular dependencies
  import('../utils/tooltips').then(({ addTooltipToComponent }) => {
    addTooltipToComponent(element, text);
  });
}
```

**createElement() Method Integration:**
```typescript
protected createElement(
  tag: string,
  options: {
    cls?: string | string[];
    text?: string;
    attrs?: Record<string, string>;
    styles?: Record<string, string>;
    tooltip?: string; // Integrated tooltip support
  } = {}
): HTMLElement {
  const el = this.container.createEl(tag);
  
  // ... other property assignments
  
  if (options.tooltip) {
    this.addTooltip(el, options.tooltip);
  }
  
  return el;
}
```

## Tooltip Styling System

### Global Style Architecture

**Centralized Style Injection:**
```typescript
private addGlobalStyles(): void {
  const existingStyle = document.getElementById('writerr-tooltip-styles');
  if (existingStyle) return;

  const styles = `
/* Writerr Unified Tooltip Styles */
.writerr-tooltip {
  position: fixed !important;
  z-index: 9999 !important;
  background: rgba(0, 0, 0, 0.9) !important;
  color: white !important;
  padding: 6px 10px !important;
  border-radius: 6px !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  white-space: nowrap !important;
  pointer-events: none !important;
  opacity: 0 !important;
  transform: translateY(4px) !important;
  transition: all 0.15s ease !important;
  backdrop-filter: blur(4px) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
  font-family: var(--font-interface) !important;
  line-height: 1.2 !important;
}

.writerr-tooltip.visible {
  opacity: 1 !important;
  transform: translateY(0) !important;
}
`;
}
```

### Positioning Arrow System

**Position-Based Arrow Styling:**
```css
/* Top position arrow */
.writerr-tooltip.position-top::before {
  top: 100% !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  border-width: 4px 4px 0 4px !important;
  border-color: rgba(0, 0, 0, 0.9) transparent transparent transparent !important;
}

/* Bottom position arrow */
.writerr-tooltip.position-bottom::before {
  bottom: 100% !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  border-width: 0 4px 4px 4px !important;
  border-color: transparent transparent rgba(0, 0, 0, 0.9) transparent !important;
}

/* Left position arrow */
.writerr-tooltip.position-left::before {
  left: 100% !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  border-width: 4px 0 4px 4px !important;
  border-color: transparent transparent transparent rgba(0, 0, 0, 0.9) !important;
}

/* Right position arrow */
.writerr-tooltip.position-right::before {
  right: 100% !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  border-width: 4px 4px 4px 0 !important;
  border-color: transparent rgba(0, 0, 0, 0.9) transparent transparent !important;
}
```

## Intelligent Positioning System

### Advanced Collision Detection

**Ultra-Aggressive Top Preference Algorithm:**
```typescript
private showTooltip(element: HTMLElement, text: string, offset: number): void {
  const elementRect = element.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight
  };

  let position: 'top' | 'bottom' | 'left' | 'right' = 'top';
  let left = 0;
  let top = 0;

  // Ultra-aggressive top preference - almost always prefer top
  const spaceAbove = elementRect.top;
  const spaceBelow = viewport.height - elementRect.bottom;
  const spaceLeft = elementRect.left;
  const spaceRight = viewport.width - elementRect.right;

  // Minimum space needed (very lenient for top positioning)
  const minSpace = tooltipRect.height + offset + 4;
  const topMinSpace = tooltipRect.height + offset - 10; // Even more lenient for top

  // ALWAYS prefer top unless there's absolutely no room
  if (spaceAbove >= topMinSpace) {
    position = 'top';
    top = elementRect.top - tooltipRect.height - offset;
    left = elementRect.left + (elementRect.width / 2) - (tooltipRect.width / 2);
  } else if (spaceBelow >= minSpace) {
    position = 'bottom';
    top = elementRect.bottom + offset;
    left = elementRect.left + (elementRect.width / 2) - (tooltipRect.width / 2);
  } else if (spaceLeft >= tooltipRect.width + offset) {
    position = 'left';
    top = elementRect.top + (elementRect.height / 2) - (tooltipRect.height / 2);
    left = elementRect.left - tooltipRect.width - offset;
  } else if (spaceRight >= tooltipRect.width + offset) {
    position = 'right';
    top = elementRect.top + (elementRect.height / 2) - (tooltipRect.height / 2);
    left = elementRect.right + offset;
  } else {
    // Final fallback: force top even if it goes off-screen
    position = 'top';
    top = Math.max(4, elementRect.top - tooltipRect.height - offset);
    left = elementRect.left + (elementRect.width / 2) - (tooltipRect.width / 2);
  }
}
```

### Viewport Boundary Management

**Smart Constraint Handling:**
```typescript
// Ensure tooltip stays within viewport bounds horizontally
left = Math.max(8, Math.min(left, viewport.width - tooltipRect.width - 8));

// For top positioning, allow it to go slightly off-screen at the top if needed
if (position === 'top') {
  top = Math.max(4, top);
} else {
  top = Math.max(8, Math.min(top, viewport.height - tooltipRect.height - 8));
}

tooltip.style.left = `${left}px`;
tooltip.style.top = `${top}px`;
tooltip.classList.add(`position-${position}`);
```

## Timing and Animation Standards

### Show/Hide Timing System

**Default Timing Standards:**
```typescript
const TOOLTIP_TIMINGS = {
  showDelay: 700,      // Default show delay in milliseconds
  hideDelay: 100,      // Quick hide delay for responsiveness
  animationDuration: 150 // CSS transition duration
} as const;
```

**Timeout Management:**
```typescript
public addTooltip(element: HTMLElement, options: TooltipOptions): void {
  const { text, delay = 700, offset = 8 } = options;

  element.addEventListener('mouseenter', (e) => {
    this.clearTimeouts();
    this.showTimeout = window.setTimeout(() => {
      this.showTooltip(element, text, offset);
    }, delay);
  });

  element.addEventListener('mouseleave', () => {
    this.clearTimeouts();
    this.hideTimeout = window.setTimeout(() => {
      this.hideTooltip();
    }, 100);
  });
}

private clearTimeouts(): void {
  if (this.showTimeout) {
    clearTimeout(this.showTimeout);
    this.showTimeout = null;
  }
  if (this.hideTimeout) {
    clearTimeout(this.hideTimeout);
    this.hideTimeout = null;
  }
}
```

### Animation Implementation

**Smooth Reveal Animation:**
```typescript
// Trigger animation
requestAnimationFrame(() => {
  tooltip.classList.add('visible');
});
```

**CSS Animation Properties:**
```css
.writerr-tooltip {
  opacity: 0 !important;
  transform: translateY(4px) !important;
  transition: all 0.15s ease !important;
}

.writerr-tooltip.visible {
  opacity: 1 !important;
  transform: translateY(0) !important;
}
```

**Hide Animation with Cleanup:**
```typescript
private hideTooltip(): void {
  if (this.activeTooltip) {
    this.activeTooltip.classList.remove('visible');
    setTimeout(() => {
      if (this.activeTooltip) {
        this.activeTooltip.remove();
        this.activeTooltip = null;
      }
    }, 150); // Match CSS transition duration
  }
}
```

## DOM Lifecycle Management

### Automatic Cleanup System

**MutationObserver Integration:**
```typescript
// Ensure tooltip hides when element is removed
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList') {
      mutation.removedNodes.forEach((node) => {
        if (node === element || (node.nodeType === Node.ELEMENT_NODE && (node as Element).contains(element))) {
          this.hideTooltip();
          observer.disconnect();
        }
      });
    }
  });
});
observer.observe(document.body, { childList: true, subtree: true });
```

### Conflict Resolution

**Native Tooltip Removal:**
```typescript
export function addTooltipToComponent(element: HTMLElement, text: string): void {
  // Remove any existing tooltip attributes to avoid conflicts
  element.removeAttribute('title');
  element.removeAttribute('data-tooltip');
  
  addTooltip(element, text);
}
```

## Tooltip Usage Patterns

### Component Integration Examples

**Toolbar Buttons:**
```typescript
private createActionButton(parent: HTMLElement, tooltip: string, icon: string, onClick: () => void): void {
  const button = parent.createEl('button', { 
    cls: 'writerr-toolbar-button'
  });
  button.innerHTML = icon;
  button.onclick = onClick;
  
  // Add unified tooltip
  this.addTooltip(button, tooltip);
}
```

**Message Action Buttons:**
```typescript
private createActionButton(type: string, tooltip: string, icon: string, onClick: () => void): void {
  const btn = this.actionsEl.createEl('button', { 
    cls: `message-action-btn action-${type}` 
  });
  btn.innerHTML = icon;
  btn.onclick = onClick;

  // ... styling code ...

  // Add unified tooltip
  this.addTooltip(btn, tooltip);
}
```

**Context Area Actions:**
```typescript
// Static tooltips
this.addTooltip(addDocButton, 'Add document to context');
this.addTooltip(this.clearButton, 'Clear all context');
```

### Dynamic Tooltip Content

**State-Based Tooltip Updates:**
```typescript
private updateDocumentButtonTooltip(): void {
  const activeFile = this.plugin.app.workspace.getActiveFile();
  const docName = activeFile?.basename || '';
  const isInContext = this.isDocumentInContext(activeFile);
  
  let tooltipText: string;
  
  if (!activeFile) {
    tooltipText = 'No active document';
  } else if (isInContext) {
    tooltipText = `Remove ${docName} from chat`;
  } else {
    tooltipText = `Add ${docName} to chat`;
  }
  
  this.addTooltip(this.documentButton, tooltipText);
}
```

**Timestamp and Metadata Tooltips:**
```typescript
const timestamp = new Date(message.timestamp).toLocaleString();
const tooltipText = isUser 
  ? `[${timestamp}]`
  : `[${timestamp}] • [${model}]`;

this.addTooltip(infoButton, tooltipText);
```

## Accessibility Features

### Semantic Integration

**ARIA Compatibility:**
```typescript
// Tooltips work alongside ARIA labels
const button = this.container.createEl('button', {
  attr: {
    'aria-label': 'Send message',  // Screen reader text
    'type': 'submit'
  }
});

// Tooltip provides visual confirmation of ARIA label
this.addTooltip(button, 'Send message');
```

### Screen Reader Considerations

**Non-Interfering Design:**
```css
.writerr-tooltip {
  pointer-events: none !important;  /* Doesn't block interaction */
  /* No role or aria attributes - purely visual enhancement */
}
```

**Focus Management:**
```typescript
// Tooltips don't interfere with keyboard navigation
// They automatically hide when parent element loses focus through DOM cleanup
```

## Performance Optimization

### Dynamic Import Pattern

**Circular Dependency Prevention:**
```typescript
// BaseComponent avoids direct import of tooltip system
protected addTooltip(element: HTMLElement, text: string, delay = 700): void {
  import('../utils/tooltips').then(({ addTooltipToComponent }) => {
    addTooltipToComponent(element, text);
  });
}
```

### Singleton Manager Benefits

**Resource Efficiency:**
```typescript
// Single global style injection
// Single tooltip element at a time
// Unified event management
// Centralized positioning calculations
```

## Theme Integration

### CSS Variable Usage

**Obsidian Theme Integration:**
```css
.writerr-tooltip {
  font-family: var(--font-interface) !important;  /* Matches UI font */
  /* Could be extended to use theme colors: */
  /* background: var(--background-secondary) !important; */
  /* color: var(--text-normal) !important; */
}
```

**Current Styling Approach:**
```css
/* High-contrast approach for visibility */
background: rgba(0, 0, 0, 0.9) !important;
color: white !important;
backdrop-filter: blur(4px) !important;
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
```

## Convenience Functions

### Simplified Usage API

**Direct Function Export:**
```typescript
// Convenience function for easy use
export function addTooltip(element: HTMLElement, text: string, delay = 700): void {
  const manager = TooltipManager.getInstance();
  manager.addTooltip(element, { text, delay });
}
```

**Component-Specific Helper:**
```typescript
// Enhanced BaseComponent with tooltip support
export function addTooltipToComponent(element: HTMLElement, text: string): void {
  element.removeAttribute('title');
  element.removeAttribute('data-tooltip');
  
  addTooltip(element, text);
}
```

## Implementation Guidelines

### 1. Tooltip Integration Checklist

- [ ] Use `this.addTooltip()` method in BaseComponent subclasses
- [ ] Include `tooltip` property in `createElement()` options when needed
- [ ] Use descriptive, concise tooltip text (avoid redundancy with button text)
- [ ] Remove conflicting `title` attributes before adding tooltips
- [ ] Test tooltip positioning with different viewport sizes
- [ ] Ensure tooltip content updates with dynamic state changes

### 2. Performance Best Practices

- [ ] Use single TooltipManager instance (automatic via singleton pattern)
- [ ] Rely on automatic cleanup via MutationObserver
- [ ] Use dynamic import in BaseComponent to avoid circular dependencies
- [ ] Keep tooltip text short to ensure good positioning
- [ ] Test tooltip behavior during rapid mouse movements

### 3. Accessibility Guidelines

- [ ] Provide tooltips that enhance, don't replace, semantic information
- [ ] Use ARIA labels for screen reader content, tooltips for visual confirmation
- [ ] Ensure tooltips don't interfere with keyboard navigation
- [ ] Test tooltip behavior with keyboard-only interaction
- [ ] Keep tooltip content concise and informative

## Cross-Plugin Integration

### Shared Tooltip System

**Plugin-Agnostic Architecture:**
```typescript
// Any plugin can import and use the tooltip system
import { addTooltip } from '../writerr-chat/src/utils/tooltips';

// Or extend BaseComponent for automatic integration
export class MyComponent extends BaseComponent {
  render() {
    const button = this.createElement('button', {
      text: 'Action',
      tooltip: 'Perform action'  // Automatic tooltip integration
    });
  }
}
```

### Consistent Behavior Standards

**Platform-Wide Tooltip Rules:**
```typescript
const TOOLTIP_STANDARDS = {
  showDelay: 700,           // Standard delay across platform
  hideDelay: 100,           // Quick response on mouse leave
  positioning: 'top-first', // Always prefer top positioning
  maxWidth: 'none',         // No width restrictions (nowrap)
  offset: 8,               // Standard distance from element
  zIndex: 9999             // Above all other UI elements
} as const;
```

## Future Enhancements

### Proposed Improvements

**Enhanced Positioning:**
1. **Smart repositioning**: Tooltips that reposition on scroll/resize
2. **Content-aware sizing**: Multi-line tooltip support for longer content
3. **Edge detection**: More sophisticated viewport boundary handling
4. **Element tracking**: Tooltips that follow moving elements

**Theme Integration:**
1. **Dynamic theming**: Tooltips that match current Obsidian theme
2. **Custom styling**: Per-component tooltip appearance options
3. **Animation variants**: Different animation styles for different contexts
4. **High contrast mode**: Enhanced visibility options

**Accessibility Features:**
1. **Screen reader integration**: Optional ARIA live regions for tooltip changes
2. **Keyboard trigger**: Show tooltips on focus/keyboard activation
3. **Reduced motion**: Respect `prefers-reduced-motion` settings
4. **High contrast support**: Automatic contrast adjustment

This tooltip system provides a solid foundation for consistent, accessible, and visually appealing user feedback across the entire Writerr Platform while maintaining performance and ease of use.