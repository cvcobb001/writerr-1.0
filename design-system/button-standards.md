# Writerr Platform Button Component Standards

> **Created**: 2025-08-28  
> **Purpose**: Document button styling patterns and standardize button components across the platform  
> **Status**: Phase 2 Component Library Documentation  
> **Analysis Source**: Writerr Chat Plugin v1.0

## Overview

The Writerr Platform uses consistent button patterns across all components, with standardized sizing, state management, icon integration, and theme support. This document extracts and standardizes the button patterns found in the Writerr Chat implementation.

## Button Architecture

### Core Button Pattern

**Standard Button Creation:**
```typescript
const button = this.container.createEl('button', { 
  cls: 'writerr-button-class'
});
button.style.cssText = `
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  transition: all 0.2s ease;
`;
```

**With Icon Integration:**
```typescript
button.innerHTML = Icons.iconName({ 
  className: 'writerr-icon-class', 
  ...ICON_STYLES.variant 
});
```

## Button Type System

### 1. Send Buttons (Primary Action)

**Visual Characteristics:**
- Positioned absolutely within input containers
- Loading state with spinning animation
- Disabled state based on input content
- Scale transform interactions

**Implementation Pattern:**
```typescript
private createSendButton(): void {
  this.sendButton = this.container.createEl('button', { 
    cls: 'writerr-send-button',
    attr: {
      'type': 'submit',
      'aria-label': 'Send message'
    }
  });
  
  this.sendButton.innerHTML = Icons.send({ 
    className: 'writerr-send-icon', 
    width: 16, 
    height: 16 
  });
  
  // Position: absolute within input container
  this.sendButton.style.cssText = `
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 8px;
    border-radius: 6px;
    transition: all 0.2s ease;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
}
```

**State Management:**
```typescript
// Normal state
button.style.opacity = hasContent ? '1' : '0.6';
button.style.color = hasContent ? 'var(--interactive-accent)' : 'var(--text-muted)';

// Hover state  
button.style.backgroundColor = 'var(--background-modifier-hover)';
button.style.transform = 'scale(1.05)';

// Click state
button.style.transform = 'scale(0.95)';

// Processing state
button.innerHTML = Icons.loader({ className: 'writerr-send-icon', width: 18, height: 18 });
button.style.animation = 'spin 1s linear infinite';
```

### 2. Toolbar Buttons (Secondary Actions)

**Visual Characteristics:**
- Transparent background with hover states
- Icon-only design with tooltips
- Consistent sizing (32x32px total with padding)
- Color transitions on hover

**Implementation Pattern:**
```typescript
private createActionButton(parent: HTMLElement, tooltip: string, icon: string, onClick: () => void): void {
  const button = parent.createEl('button', { 
    cls: 'writerr-toolbar-button'
  });
  
  button.innerHTML = icon;
  button.onclick = onClick;
  
  button.style.cssText = `
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--text-muted);
    padding: 6px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    width: 28px;
    height: 28px;
  `;
  
  this.addTooltip(button, tooltip);
  this.addHoverEffect(button, {
    'background-color': 'var(--background-modifier-hover)',
    'color': 'var(--text-normal)'
  });
}
```

**Icon Integration:**
```typescript
// Using centralized icon system
const icon = createStyledIcon('iconName', 'toolbar');
button.innerHTML = icon;

// Manual icon with ICON_STYLES
button.innerHTML = Icons.iconName({ 
  className: 'writerr-toolbar-icon', 
  ...ICON_STYLES.toolbar 
});
```

### 3. Message Action Buttons (Micro Interactions)

**Visual Characteristics:**
- Minimal 24x24px size
- Always visible (no hover-only behavior)
- Very subtle styling with faint colors
- Forced styling with `!important` to override Obsidian

**Implementation Pattern:**
```typescript
private createActionButton(type: string, tooltip: string, icon: string, onClick: () => void): void {
  const btn = this.actionsEl.createEl('button', { 
    cls: `message-action-btn action-${type}` 
  });
  
  btn.innerHTML = icon;
  btn.onclick = onClick;

  btn.style.cssText = `
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    padding: 4px !important;
    border-radius: 4px !important;
    cursor: pointer !important;
    color: var(--text-faint) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    transition: all 0.2s ease !important;
    width: 24px !important;
    height: 24px !important;
    opacity: 0.6 !important;
  `;

  this.addTooltip(btn, tooltip);
  this.addHoverEffect(btn, {
    'color': 'var(--text-muted)',
    'opacity': '1'
  });
}
```

### 4. Context Area Buttons (Document Actions)

**Visual Characteristics:**
- Chip-style remove buttons (16x16px)
- Round background on hover
- Error color theming for destructive actions

**Implementation Pattern:**
```typescript
const removeBtn = docChip.createEl('button');
removeBtn.innerHTML = Icons.x({ width: 12, height: 12 });

removeBtn.style.cssText = `
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  padding: 2px;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  flex-shrink: 0;
  transition: all 0.2s ease;
`;

this.addHoverEffect(removeBtn, {
  'background-color': 'var(--background-modifier-error)',
  'color': 'var(--text-on-accent)'
});
```

### 5. Dropdown Buttons (Selection Controls)

**Visual Characteristics:**
- Text content with caret icons
- Truncation with ellipsis for long text
- Max-width constraints with overflow handling
- Dynamic caret visibility

**Implementation Pattern:**
```typescript
private createModelSelect(parent: HTMLElement): void {
  const modelButton = parent.createEl('button');
  
  modelButton.style.cssText = `
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

  // Caret icon positioning
  const caret = modelButton.createEl('span');
  caret.innerHTML = Icons.chevronDown({ width: 10, height: 10 });
  caret.style.cssText = `
    position: absolute;
    right: 6px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    color: var(--text-faint);
  `;
}
```

**Text Truncation Management:**
```typescript
private updateButtonText(selection: string): void {
  const maxLength = 15;
  let finalText = displayName;
  let showCaret = true;
  
  if (displayName.length > maxLength) {
    finalText = displayName.substring(0, maxLength - 3) + '...';
    showCaret = false; // Hide caret when truncated
  }
  
  this.button.textContent = finalText;
  
  const caret = this.button.querySelector('span');
  if (caret) {
    caret.style.display = showCaret ? 'block' : 'none';
  }
}
```

## State Management System

### Standard Button States

**1. Normal State:**
```css
opacity: 1;
cursor: pointer;
color: var(--text-muted);
background: transparent;
```

**2. Hover State:**
```css
background-color: var(--background-modifier-hover);
color: var(--text-normal);
transform: translateY(-1px); /* Optional elevation */
```

**3. Disabled State:**
```css
opacity: 0.5;
cursor: not-allowed;
pointer-events: none;
color: var(--text-faint);
```

**4. Loading State:**
```css
opacity: 0.8;
cursor: default;
animation: spin 1s linear infinite;
```

**5. Active/Selected State:**
```css
color: var(--interactive-accent);
background: var(--background-modifier-hover);
```

### State Transition Pattern

```typescript
private updateButtonState(state: 'normal' | 'hover' | 'disabled' | 'loading' | 'active'): void {
  const stateStyles = {
    normal: {
      opacity: '1',
      cursor: 'pointer',
      color: 'var(--text-muted)',
      background: 'transparent'
    },
    hover: {
      backgroundColor: 'var(--background-modifier-hover)',
      color: 'var(--text-normal)'
    },
    disabled: {
      opacity: '0.5',
      cursor: 'not-allowed',
      pointerEvents: 'none'
    },
    loading: {
      opacity: '0.8',
      cursor: 'default',
      animation: 'spin 1s linear infinite'
    },
    active: {
      color: 'var(--interactive-accent)',
      background: 'var(--background-modifier-hover)'
    }
  };
  
  Object.entries(stateStyles[state]).forEach(([key, value]) => {
    this.button.style[key as any] = value;
  });
}
```

## Size Standardization

### Button Size Classes

**Micro Buttons (16x16px):**
- Context chip remove buttons
- Inline close buttons

**Small Buttons (24x24px):**  
- Message action buttons
- Secondary toolbar actions

**Standard Buttons (28x28px):**
- Primary toolbar buttons
- Context area actions

**Large Buttons (32x32px):**
- Send buttons
- Primary input actions

### Padding Standards

```typescript
const BUTTON_PADDING = {
  micro: '2px',      // 16px buttons
  small: '4px',      // 24px buttons  
  standard: '6px',   // 28px buttons
  large: '8px'       // 32px buttons
} as const;
```

## Icon Integration Patterns

### Icon Style Mapping

```typescript
const BUTTON_ICON_STYLES = {
  send: ICON_STYLES.send,           // md size (20px)
  toolbar: ICON_STYLES.toolbar,     // md size (20px)  
  action: ICON_STYLES.action,       // md size (20px)
  context: ICON_STYLES.context,     // md size (20px)
  micro: { width: 12, height: 12 }  // Custom small size
} as const;
```

### Icon Usage Examples

```typescript
// Toolbar button with icon
button.innerHTML = Icons.copy({ 
  className: 'writerr-toolbar-icon', 
  ...ICON_STYLES.toolbar 
});

// Send button with loading state
button.innerHTML = isLoading 
  ? Icons.loader({ className: 'writerr-send-icon', width: 18, height: 18 })
  : Icons.send({ className: 'writerr-send-icon', width: 16, height: 16 });

// Context chip remove button
button.innerHTML = Icons.x({ width: 12, height: 12 });
```

## Tooltip Integration

### Standard Tooltip Pattern

```typescript
// Add tooltip using BaseComponent method
this.addTooltip(button, 'Button action description');

// Dynamic tooltip updates
private updateTooltip(button: HTMLButtonElement, text: string): void {
  button.removeAttribute('title');
  this.addTooltip(button, text);
}
```

### Contextual Tooltip Examples

```typescript
// Document button with dynamic state
const docName = activeFile.basename;
const tooltipText = isInContext 
  ? `Remove ${docName} from chat`
  : `Add ${docName} to chat`;
this.addTooltip(button, tooltipText);

// Info button with metadata
const timestamp = new Date(message.timestamp).toLocaleString();
const tooltipText = isUser 
  ? `[${timestamp}]`
  : `[${timestamp}] • [${model}]`;
this.addTooltip(button, tooltipText);
```

## Hover Effect System

### BaseComponent Integration

```typescript
// Standard hover effect application
this.addHoverEffect(button, {
  'background-color': 'var(--background-modifier-hover)',
  'color': 'var(--text-normal)',
  'transform': 'translateY(-1px)'
});

// Destructive action hover
this.addHoverEffect(removeButton, {
  'background-color': 'var(--background-modifier-error)',
  'color': 'var(--text-on-accent)'
});
```

### Manual Hover Implementation

```typescript
button.addEventListener('mouseenter', () => {
  button.style.backgroundColor = 'var(--background-modifier-hover)';
  button.style.color = 'var(--interactive-accent)';
  button.style.transform = 'scale(1.05)';
});

button.addEventListener('mouseleave', () => {
  button.style.backgroundColor = 'transparent';
  button.style.color = 'var(--text-muted)';
  button.style.transform = 'scale(1)';
});
```

## Animation Standards

### Transition Timings

```css
transition: all 0.2s ease;  /* Standard button interactions */
transition: all 0.3s ease;  /* State changes and reveals */
```

### Loading Animations

```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Applied to loading buttons */
animation: spin 1s linear infinite;
```

### Micro Interactions

```typescript
// Click feedback
button.addEventListener('click', () => {
  button.style.transform = 'scale(0.95)';
  setTimeout(() => {
    button.style.transform = 'scale(1)';
  }, 100);
});
```

## Theme Integration

### CSS Variable Usage

**Standard Theme Variables:**
```css
/* Button backgrounds */
--background-primary          /* Main button background */
--background-modifier-hover   /* Hover state background */
--background-modifier-error   /* Destructive action background */

/* Button text colors */
--text-normal                 /* Primary button text */
--text-muted                  /* Secondary button text */  
--text-faint                  /* Tertiary button text */
--interactive-accent          /* Accent/active button text */
--text-on-accent             /* Text on colored backgrounds */

/* Button borders */
--background-modifier-border  /* Standard button borders */
```

**Usage Pattern:**
```typescript
button.style.cssText = `
  background: var(--background-primary);
  color: var(--text-muted);
  border: 1px solid var(--background-modifier-border);
  transition: all 0.2s ease;
`;
```

## Accessibility Standards

### ARIA Integration

```typescript
const button = this.container.createEl('button', {
  attr: {
    'type': 'submit',
    'aria-label': 'Send message',
    'role': 'button'
  }
});
```

### Keyboard Navigation

```typescript
button.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    button.click();
  }
});
```

### Focus Management

```css
button:focus {
  outline: 2px solid var(--interactive-accent);
  outline-offset: 2px;
}
```

## Cross-Plugin Consistency

### Button Factory Pattern

```typescript
export class ButtonFactory {
  static createToolbarButton(options: ToolbarButtonOptions): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'writerr-toolbar-button';
    
    button.style.cssText = `
      background: transparent;
      border: none;
      cursor: pointer;
      color: var(--text-muted);
      padding: 6px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      width: 28px;
      height: 28px;
    `;
    
    if (options.icon) {
      button.innerHTML = Icons[options.icon]({ 
        ...ICON_STYLES.toolbar 
      });
    }
    
    return button;
  }
}
```

### Style Class System

```typescript
const BUTTON_CLASSES = {
  'writerr-send-button': 'Primary action send buttons',
  'writerr-toolbar-button': 'Secondary toolbar actions', 
  'message-action-btn': 'Message interaction buttons',
  'writerr-context-action': 'Context area action buttons',
  'context-add-button': 'Context area add buttons'
} as const;
```

## Implementation Guidelines

### 1. Button Creation Checklist

- [ ] Use semantic `<button>` elements
- [ ] Apply appropriate CSS class from button class system
- [ ] Include ARIA labels for accessibility
- [ ] Integrate icons using centralized ICON_STYLES
- [ ] Add tooltips using BaseComponent.addTooltip()
- [ ] Apply hover effects using BaseComponent.addHoverEffect()
- [ ] Use CSS variables for theming
- [ ] Include appropriate state management

### 2. State Management Checklist

- [ ] Implement normal, hover, disabled, loading states
- [ ] Use opacity for disabled states (0.5)
- [ ] Use color variables for state differentiation
- [ ] Include loading animations where appropriate
- [ ] Provide visual feedback for user interactions

### 3. Styling Consistency Checklist

- [ ] Use standard transition timing (0.2s ease)
- [ ] Apply consistent padding based on button size
- [ ] Use border-radius of 6px for standard buttons
- [ ] Include transform animations for micro-interactions
- [ ] Apply theme variables instead of hardcoded colors

## Future Considerations

### Enhanced Button System

**Proposed Enhancements:**
1. **Button Size Variants**: Extend size system with more granular options
2. **Button Style Variants**: Solid, outline, ghost button styles  
3. **Icon Position Options**: Left, right, icon-only configurations
4. **Loading State Variants**: Different loading indicators per button type
5. **Group Button Support**: Button groups with shared styling

**Cross-Plugin Integration:**
- Shared button component library
- Standardized button event handling
- Consistent keyboard navigation patterns
- Unified focus management system

This documentation provides the foundation for consistent button implementation across all Writerr Platform plugins while maintaining the established design patterns and user experience standards.