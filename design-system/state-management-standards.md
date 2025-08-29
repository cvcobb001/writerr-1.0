# State Management Standards

## Overview

This document defines comprehensive state management patterns for the Writerr Platform design system based on analysis of the Chat implementation. These standards ensure consistent, accessible, and maintainable state handling across all components.

## Core State Types

### 1. Interactive States
- **Hover**: Visual feedback on pointer interaction
- **Focus**: Accessibility-compliant focus indicators  
- **Active**: Temporary pressed/clicked feedback
- **Disabled**: Non-interactive state visual cues

### 2. Processing States
- **Idle**: Default ready state
- **Loading**: Active processing with visual indicators
- **Success**: Successful operation feedback
- **Error**: Error state handling and recovery

### 3. Content States
- **Empty**: No content present
- **Populated**: Content available
- **Validating**: Content validation in progress
- **Invalid**: Content validation failed

## Hover State Management

### State Preservation Pattern

**Implementation**: Store original styles before applying hover effects to enable clean restoration.

```typescript
// BaseComponent.addHoverEffect() - Recommended pattern
protected addHoverEffect(element: HTMLElement, hoverStyles: Record<string, string>) {
  const originalStyles: Record<string, string> = {};
  
  element.addEventListener('mouseenter', () => {
    Object.entries(hoverStyles).forEach(([key, value]) => {
      originalStyles[key] = element.style[key as any];
      element.style[key as any] = value;
    });
  });
  
  element.addEventListener('mouseleave', () => {
    Object.entries(originalStyles).forEach(([key, value]) => {
      element.style[key as any] = value;
    });
  });
}
```

### Conditional Hover Effects

**Pattern**: Check processing state before applying hover effects to prevent interference with other states.

```typescript
// ChatInput.setupSendButtonEvents() - State-aware hover
element.addEventListener('mouseenter', () => {
  if (!this.isProcessing) {
    element.style.backgroundColor = 'var(--background-modifier-hover)';
    element.style.color = 'var(--interactive-accent)';
    element.style.opacity = '1';
    element.style.transform = 'scale(1.05)';
  }
});
```

### Standards
- Always preserve original styles for restoration
- Implement conditional hover effects based on component state
- Use consistent transition timing: `transition: all 0.2s ease`
- Avoid hover effects during processing states

## Focus State Management

### Accessibility-Compliant Focus Indicators

**Pattern**: Provide clear visual feedback with proper contrast and visibility.

```typescript
// ChatInput focus/blur pattern
this.messageInput.addEventListener('focus', () => {
  this.messageInput.style.borderColor = 'var(--interactive-accent)';
  this.messageInput.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1), 0 0 0 1px var(--interactive-accent)';
});

this.messageInput.addEventListener('blur', () => {
  this.messageInput.style.borderColor = 'var(--background-modifier-border)';
  this.messageInput.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
});
```

### ARIA Compliance

**Requirements**:
- All interactive elements must have `aria-label` or accessible text
- Focus indicators must meet WCAG 2.1 AA contrast requirements
- Focus order must be logical and predictable

### Standards
- Focus indicators must be visible against all backgrounds
- Use consistent focus styling across components
- Implement smooth transitions: `transition: all 0.2s ease`
- Maintain focus during dynamic content updates

## Disabled State Patterns

### Visual Feedback System

**Pattern**: Comprehensive disabled state styling with clear visual cues and cursor feedback.

```typescript
// ChatInput.updateSendButtonState() - Comprehensive disabled handling
private updateSendButtonState(): void {
  const hasContent = this.messageInput.value.trim().length > 0;
  
  if (hasContent && !this.isProcessing) {
    // Enabled state
    this.sendButton.style.opacity = '1';
    this.sendButton.style.cursor = 'pointer';
    this.sendButton.disabled = false;
    this.sendButton.style.color = 'var(--interactive-accent)';
  } else {
    // Disabled state
    this.sendButton.style.opacity = this.isProcessing ? '0.8' : '0.6';
    this.sendButton.style.cursor = this.isProcessing ? 'default' : 'not-allowed';
    this.sendButton.style.color = 'var(--text-muted)';
    this.sendButton.disabled = !this.isProcessing;
  }
}
```

### State Differentiation

**Pattern**: Different disabled states for different reasons (no content vs processing).

- **No Content**: `opacity: 0.6`, `cursor: not-allowed`
- **Processing**: `opacity: 0.8`, `cursor: default`
- **System Disabled**: `opacity: 0.4`, `cursor: not-allowed`

### Standards
- Always disable the actual HTML element (`disabled` attribute)
- Provide appropriate cursor feedback
- Use consistent opacity values across components
- Include accessibility attributes for screen readers

## Loading State Management

### Processing State Pattern

**Implementation**: Comprehensive loading state with visual indicators and state preservation.

```typescript
// ChatInput.setProcessingState() - Complete loading state management
public setProcessingState(processing: boolean): void {
  this.isProcessing = processing;
  
  if (processing) {
    // Loading state
    this.sendButton.innerHTML = Icons.loader({ 
      className: 'writerr-send-icon', 
      width: 18, 
      height: 18 
    });
    this.sendButton.style.color = 'var(--text-muted)';
    this.sendButton.style.cursor = 'default';
    this.sendButton.style.opacity = '0.8';
    this.sendButton.style.animation = 'spin 1s linear infinite';
    
    // Ensure animation exists
    if (!document.querySelector('#spin-animation')) {
      const style = document.createElement('style');
      style.id = 'spin-animation';
      style.textContent = `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }
  } else {
    // Restore normal state
    this.sendButton.innerHTML = Icons.send({ 
      className: 'writerr-send-icon', 
      width: 18, 
      height: 18 
    });
    this.sendButton.style.animation = 'none';
    this.sendButton.style.cursor = 'pointer';
  }
  
  // Update overall button state
  this.updateSendButtonState();
}
```

### Animation Management

**Pattern**: Dynamic CSS animation injection with cleanup.

- Inject animations only when needed
- Use unique IDs to prevent duplication
- Clean up animations when component unmounts

### Standards
- Show loading indicators for operations > 100ms
- Use consistent loading animations (spin for icons)
- Prevent user interaction during loading
- Maintain accessibility during loading states

## State Transition Management

### Smooth Transitions

**Pattern**: Consistent transition timing and easing across all state changes.

```css
/* Standard transition applied to all interactive elements */
transition: all 0.2s ease;

/* Loading state transitions */
transition: opacity 0.3s ease, transform 0.2s ease;
```

### State Coordination

**Pattern**: Central state management prevents conflicting states.

```typescript
// State coordination pattern
private updateComponentState(): void {
  // Update all dependent visual states
  this.updateButtonState();
  this.updateTooltipState();
  this.updateAccessibilityState();
}
```

### Standards
- All state changes must include smooth transitions
- Use consistent timing: 0.2s for interactions, 0.3s for major changes
- Coordinate dependent state changes
- Prevent state conflicts through central management

## Accessibility State Management

### ARIA State Updates

**Pattern**: Synchronize visual states with ARIA attributes.

```typescript
// Synchronize visual and ARIA states
private updateAccessibilityState(): void {
  this.element.setAttribute('aria-disabled', this.disabled.toString());
  this.element.setAttribute('aria-busy', this.processing.toString());
  
  if (this.hasError) {
    this.element.setAttribute('aria-invalid', 'true');
    this.element.setAttribute('aria-describedby', this.errorMessageId);
  }
}
```

### Screen Reader Support

**Requirements**:
- State changes must be announced to screen readers
- Loading states must include `aria-busy="true"`
- Error states must include `aria-invalid="true"`
- Disabled states must include `aria-disabled="true"`

### Standards
- Update ARIA attributes with visual state changes
- Provide text alternatives for visual-only state indicators
- Ensure state changes are announced appropriately
- Test with screen readers during development

## Dynamic State Management

### Content-Based State Updates

**Pattern**: State updates triggered by content changes with validation.

```typescript
// Content-driven state management
this.messageInput.addEventListener('input', () => {
  this.updateSendButtonState();
  this.validateContent();
  this.updateAccessibilityState();
});
```

### Real-Time State Synchronization

**Pattern**: Keep visual state synchronized with underlying data state.

```typescript
// Reactive state management
private onDataChange(): void {
  this.updateVisualState();
  this.updateInteractionState();
  this.announceStateChange();
}
```

### Standards
- Update states immediately when content changes
- Validate state transitions before applying
- Maintain state consistency across component lifecycle
- Handle edge cases gracefully

## Implementation Guidelines

### State Management Checklist

For every interactive component:

1. **Define all possible states** clearly
2. **Implement hover state preservation** with original style storage
3. **Add accessibility-compliant focus indicators** with proper contrast
4. **Handle disabled states** with appropriate visual feedback
5. **Implement loading states** with clear progress indication
6. **Add smooth transitions** between all states
7. **Coordinate dependent states** to prevent conflicts
8. **Update ARIA attributes** alongside visual changes
9. **Test with keyboard navigation** and screen readers
10. **Handle dynamic content updates** appropriately

### Performance Considerations

- Cache computed styles to avoid repeated calculations
- Use CSS classes instead of inline styles when possible
- Debounce rapid state changes
- Clean up event listeners and animations on component destroy

### Testing Requirements

- Test all state combinations
- Verify keyboard navigation works correctly
- Ensure screen reader announcements are appropriate
- Test with various content lengths and types
- Validate transitions work smoothly on slower devices

## Related Standards

- [Animation Standards](./animation-standards.md) - Transition and animation specifications
- [Button Standards](./button-standards.md) - Button-specific state handling
- [Input Standards](./input-standards.md) - Form input state management
- [Tooltip Standards](./tooltip-standards.md) - Tooltip state coordination