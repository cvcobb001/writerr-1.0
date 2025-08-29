# Writerr Platform Input Component Guidelines

*Part of the Writerr Platform Design System - Input Standards*

## Overview

This document defines the input component patterns, auto-resize implementations, and styling standards extracted from the Writerr Chat interface. These patterns provide superior user experience through intelligent auto-sizing, sophisticated dropdown interactions, and theme-integrated styling.

## Core Input Components

### 1. Auto-Resize Textarea Pattern

The ChatInput component demonstrates the gold standard for auto-resizing textareas that adapt to content while maintaining usability constraints.

#### Implementation Pattern

```typescript
// Core auto-resize logic from ChatInput.ts
private setupAutoResize(): void {
  const autoResize = () => {
    this.messageInput.style.height = '60px'; // Reset to minimum
    const scrollHeight = this.messageInput.scrollHeight;
    const maxHeight = 160; // Maximum height constraint
    const newHeight = Math.min(Math.max(scrollHeight, 60), maxHeight);
    this.messageInput.style.height = newHeight + 'px';
  };

  this.messageInput.addEventListener('input', autoResize);
  setTimeout(autoResize, 0); // Initial resize
}
```

#### Base Styling Standards

```css
/* Auto-resize textarea base styles */
.chat-message-input {
  width: 100%;
  min-height: 80px;
  max-height: 200px;
  padding: 12px 52px 12px 12px; /* Right padding for send button */
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
  box-sizing: border-box;
  overflow: hidden;
  overflow-wrap: break-word;
  word-wrap: break-word;
  white-space: pre-wrap;
}
```

#### Focus States

```typescript
// Focus/blur effects from ChatInput
this.messageInput.addEventListener('focus', () => {
  this.messageInput.style.borderColor = 'var(--interactive-accent)';
  this.messageInput.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1), 0 0 0 1px var(--interactive-accent)';
});

this.messageInput.addEventListener('blur', () => {
  this.messageInput.style.borderColor = 'var(--background-modifier-border)';
  this.messageInput.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
});
```

#### Keyboard Shortcuts Integration

```typescript
// Keyboard shortcuts from ChatInput
this.messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    this.sendMessage();
  } else if (e.key === 'Enter' && e.shiftKey) {
    // Allow Shift+Enter for new line (default behavior)
    return;
  } else if (e.key === 'Escape') {
    this.messageInput.blur();
  }
});
```

### 2. Dropdown Button Pattern

The ChatToolbar component demonstrates sophisticated dropdown button patterns for model and prompt selectors.

#### Base Dropdown Button Structure

```typescript
// Dropdown button pattern from ChatToolbar
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

  // Caret indicator
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

#### Hover States for Dropdowns

```typescript
// Hover effects for dropdown buttons
modelButton.addEventListener('mouseenter', () => {
  modelButton.style.background = 'var(--background-modifier-hover)';
  modelButton.style.color = 'var(--text-normal)';
});

modelButton.addEventListener('mouseleave', () => {
  modelButton.style.background = 'transparent';
  modelButton.style.color = 'var(--text-muted)';
});
```

#### Smart Text Truncation with Caret Management

```typescript
// Intelligent text truncation from ChatToolbar
private updateModelButtonText(selection: string): void {
  if (!this.modelButton) return;
  
  const maxLength = 15; // Approximate characters that fit in 140px
  let finalText = displayName;
  let showCaret = true;
  
  if (displayName.length > maxLength) {
    finalText = displayName.substring(0, maxLength - 3) + '...';
    showCaret = false; // Don't show caret when we have ellipsis
  }
  
  this.modelButton.textContent = finalText;
  
  // Show/hide caret based on whether we manually truncated
  const caret = this.modelButton.querySelector('span');
  if (caret) {
    caret.style.display = showCaret ? 'block' : 'none';
  }
}
```

### 3. Search Input Pattern

The ContextArea component demonstrates modal search input patterns with proper focus management and styling.

#### Modal Search Input

```css
/* Search input in modal context */
.modal-search-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 8px;
  background: var(--background-primary);
  color: var(--text-normal);
  margin-bottom: 16px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s ease;
}

.modal-search-input:focus {
  border-color: var(--interactive-accent);
}

.modal-search-input:blur {
  border-color: var(--background-modifier-border);
}
```

#### Search Input Implementation

```typescript
// Search input from ContextArea modal
const searchInput = modal.createEl('input', { 
  type: 'text',
  placeholder: 'Search documents...'
});

searchInput.addEventListener('focus', () => {
  searchInput.style.borderColor = 'var(--interactive-accent)';
});

searchInput.addEventListener('blur', () => {
  searchInput.style.borderColor = 'var(--background-modifier-border)';
});

// Auto-focus for immediate interaction
searchInput.focus();
```

## Input Validation and State Management

### Validation State Styling

```typescript
// Input validation pattern from ChatInput
private updateSendButtonState(): void {
  const hasContent = this.messageInput.value.trim().length > 0;
  
  if (hasContent && !this.isProcessing) {
    this.sendButton.style.opacity = '1';
    this.sendButton.style.cursor = 'pointer';
    this.sendButton.disabled = false;
    this.sendButton.style.color = 'var(--interactive-accent)';
  } else {
    this.sendButton.style.opacity = this.isProcessing ? '0.8' : '0.6';
    this.sendButton.style.cursor = this.isProcessing ? 'default' : 'not-allowed';
    this.sendButton.style.color = 'var(--text-muted)';
    this.sendButton.disabled = !this.isProcessing;
  }
}
```

### Processing State Management

```typescript
// Processing state from ChatInput
public setProcessingState(processing: boolean): void {
  this.isProcessing = processing;
  
  if (processing) {
    this.sendButton.innerHTML = Icons.loader({ 
      className: 'writerr-send-icon', 
      width: 18, 
      height: 18 
    });
    this.sendButton.style.animation = 'spin 1s linear infinite';
  } else {
    this.sendButton.innerHTML = Icons.send({ 
      className: 'writerr-send-icon', 
      width: 18, 
      height: 18 
    });
    this.sendButton.style.animation = 'none';
  }
  
  this.updateSendButtonState();
}
```

## Theme Integration Standards

### CSS Variable Usage

All input components must integrate with Obsidian's theme system using these variables:

```css
/* Core theme variables for inputs */
--background-primary: Base input background
--background-secondary: Alternative input background
--background-modifier-border: Default border color
--background-modifier-border-hover: Hover border color
--background-modifier-hover: Hover background color
--interactive-accent: Focus/active accent color
--text-normal: Primary text color
--text-muted: Secondary text color
--text-faint: Disabled/placeholder text color
--text-on-accent: Text on accent backgrounds
```

### Transition Standards

```css
/* Standard transitions for input interactions */
.writerr-input {
  transition: all 0.2s ease;
}

.writerr-input-focus {
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.writerr-dropdown-button {
  transition: all 0.2s ease;
}
```

## Button Integration Patterns

### Send Button Pattern

```typescript
// Send button integration from ChatInput
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
  
  this.setupSendButtonEvents();
}
```

### Action Button Hover Effects

```typescript
// Action button hover pattern from ChatInput
this.sendButton.addEventListener('mouseenter', () => {
  if (!this.isProcessing) {
    this.sendButton.style.backgroundColor = 'var(--background-modifier-hover)';
    this.sendButton.style.color = 'var(--interactive-accent)';
    this.sendButton.style.opacity = '1';
    this.sendButton.style.transform = 'scale(1.05)';
  }
});

this.sendButton.addEventListener('mouseleave', () => {
  if (!this.isProcessing) {
    this.sendButton.style.backgroundColor = 'transparent';
    this.sendButton.style.color = 'var(--text-muted)';
    this.sendButton.style.opacity = this.messageInput.value.trim() ? '1' : '0.6';
    this.sendButton.style.transform = 'scale(1)';
  }
});
```

## Accessibility Considerations

### ARIA Labels and Roles

```typescript
// Accessibility attributes from ChatInput
const messageInput = this.container.createEl('textarea', { 
  cls: 'chat-message-input',
  attr: { 
    placeholder: 'Type your message...',
    rows: '3',
    'aria-label': 'Message input',
    'role': 'textbox',
    'aria-multiline': 'true'
  }
});

const sendButton = this.container.createEl('button', { 
  cls: 'writerr-send-button',
  attr: {
    'type': 'submit',
    'aria-label': 'Send message'
  }
});
```

### Focus Management

```typescript
// Focus management patterns
public focusInput(): void {
  this.messageInput.focus();
}

// Modal focus management from ContextArea
searchInput.focus(); // Auto-focus for immediate interaction
```

## Form Control Consistency

### Standard Input Dimensions

```css
/* Consistent input sizing across components */
.writerr-input-small {
  min-height: 32px;
  padding: 4px 8px;
  font-size: 12px;
}

.writerr-input-medium {
  min-height: 40px;
  padding: 8px 12px;
  font-size: 14px;
}

.writerr-input-large {
  min-height: 44px;
  padding: 12px 16px;
  font-size: 16px;
}
```

### Consistent Border Radius

```css
/* Standard border radius for form controls */
.writerr-input {
  border-radius: 8px; /* Standard input radius */
}

.writerr-input-rounded {
  border-radius: 12px; /* Chat input style */
}

.writerr-button {
  border-radius: 6px; /* Button radius */
}
```

## Error States and Validation

### Error State Styling

```css
/* Error state for inputs */
.writerr-input-error {
  border-color: var(--color-red);
  box-shadow: 0 0 0 1px var(--color-red);
}

.writerr-input-error:focus {
  border-color: var(--color-red);
  box-shadow: 0 2px 8px rgba(255, 0, 0, 0.1), 0 0 0 1px var(--color-red);
}
```

### Warning State Styling

```css
/* Warning state for inputs */
.writerr-input-warning {
  border-color: var(--color-orange);
  box-shadow: 0 0 0 1px var(--color-orange);
}
```

## Animation Standards

### Standard Animations

```css
/* Standard animations for inputs */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes slideOut {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(-10px) scale(0.8);
  }
}
```

## Implementation Guidelines

### 1. Auto-Resize Requirements
- Always set a minimum height (60-80px)
- Set a reasonable maximum height (160-200px)
- Reset height before calculating new height
- Use `scrollHeight` for accurate measurement
- Apply constraints with `Math.min/Math.max`

### 2. Dropdown Requirements
- Use transparent background by default
- Include hover states with theme colors
- Implement intelligent text truncation
- Manage caret visibility based on truncation
- Position caret absolutely within button

### 3. Search Input Requirements
- Auto-focus when modal opens
- Use consistent border styling
- Implement focus/blur color changes
- Include proper placeholder text
- Maintain font family inheritance

### 4. Theme Integration Requirements
- Use CSS variables exclusively
- No hardcoded colors or values
- Support both light and dark themes
- Maintain contrast ratios
- Follow Obsidian theme patterns

### 5. Accessibility Requirements
- Include proper ARIA labels
- Support keyboard navigation
- Maintain focus indicators
- Use semantic HTML elements
- Provide clear state feedback

## Usage Examples

### Basic Auto-Resize Textarea

```typescript
class MyComponent extends BaseComponent {
  private setupTextarea(): void {
    const textarea = this.container.createEl('textarea', {
      cls: 'writerr-input-medium',
      attr: { placeholder: 'Enter text...' }
    });
    
    // Apply auto-resize pattern
    this.setupAutoResize(textarea);
    this.setupFocusStates(textarea);
  }
}
```

### Dropdown Selector

```typescript
class DropdownComponent extends BaseComponent {
  private createDropdown(): void {
    const button = this.container.createEl('button');
    this.applyDropdownStyling(button);
    this.addCaretIndicator(button);
    this.setupDropdownEvents(button);
  }
}
```

### Modal Search Input

```typescript
class SearchModal extends BaseComponent {
  private createSearchInput(): void {
    const input = this.modal.createEl('input', {
      type: 'text',
      cls: 'modal-search-input',
      attr: { placeholder: 'Search...' }
    });
    
    this.setupSearchEvents(input);
    input.focus();
  }
}
```

This comprehensive guide ensures consistent, accessible, and theme-integrated input components across the Writerr Platform.