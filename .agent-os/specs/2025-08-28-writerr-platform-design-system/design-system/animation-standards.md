# Writerr Platform Animation Framework

## Overview

The Writerr Platform Animation Framework establishes consistent timing, easing, and interaction patterns across all components. This framework ensures smooth, performant animations that enhance user experience while maintaining professional polish.

## Animation Timing Standards

### Standard Duration Scale

| Duration | Use Case | Easing Function | Example |
|----------|----------|-----------------|---------|
| `0.15s` | Quick feedback, menu transitions | `ease-out` | Menu slide-in, hover color changes |
| `0.2s` | Standard interactions | `ease` | Button hover, focus states, tooltips |
| `0.3s` | State changes, content transitions | `ease` | Modal entry/exit, collapse/expand |
| `1s` | Loading animations | `linear infinite` | Spinner rotations |

### Easing Function Guidelines

```css
/* Standard easing patterns */
.transition-quick { transition: all 0.15s ease-out; }
.transition-standard { transition: all 0.2s ease; }
.transition-content { transition: all 0.3s ease; }
.transition-loading { animation: spin 1s linear infinite; }
```

## Core Keyframe Library

### 1. Loading Animations

#### Spinner Animation
```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Usage */
.loading-spinner {
  animation: spin 1s linear infinite;
}
```

#### Pulse Animation
```css
@keyframes pulse {
  0% { opacity: 0.8; }
  50% { opacity: 1; }
  100% { opacity: 0.8; }
}

/* Usage in Track Edits */
.track-edits-indicator {
  animation: pulse 2s infinite;
}
```

### 2. Entry/Exit Animations

#### Modal Slide In
```css
@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Usage */
.modal {
  animation: modalSlideIn 0.3s ease;
}
```

#### Content Slide In
```css
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

/* Usage for content chips */
.content-chip {
  animation: slideIn 0.3s ease;
}
```

#### Content Slide Out
```css
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

/* Usage for removal animations */
.removing {
  animation: slideOut 0.2s ease forwards;
}
```

#### Menu Entry
```css
@keyframes menuSlideIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Usage */
.menu {
  animation: menuSlideIn 0.15s ease-out;
}
```

### 3. List and Session Animations

#### Session Entry
```css
@keyframes sessionSlideIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Usage with staggered delays */
.session-item {
  animation: sessionSlideIn 0.3s ease forwards;
  animation-delay: calc(var(--index) * 0.05s);
}
```

#### Message Removal
```css
@keyframes messageSlideOut {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(100px);
  }
}

/* Usage */
.message-removing {
  animation: messageSlideOut 0.3s ease forwards;
}
```

### 4. Overlay and Fade Effects

#### Fade In
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Usage for overlays */
.overlay {
  animation: fadeIn 0.2s ease;
}
```

#### Fade Out
```css
@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

/* Usage for closing overlays */
.overlay-closing {
  animation: fadeOut 0.2s ease forwards;
}
```

### 5. Highlight Effects

#### Highlight Fade (Track Edits)
```css
@keyframes highlightFade {
  0% { 
    background-color: rgba(34, 197, 94, 0.8);
    border-color: #22c55e;
    transform: scale(1.05);
  }
  50% {
    background-color: rgba(34, 197, 94, 0.5);
  }
  100% { 
    background-color: rgba(34, 197, 94, 0.2);
    transform: scale(1);
  }
}

/* Usage for edit highlights */
.track-edits-insert {
  animation: highlightFade 2s ease-out;
}
```

## Interaction Patterns

### Button Interactions

#### Hover Effects
```css
.button:hover {
  transform: translateY(-1px) scale(1.05);
  background: var(--background-modifier-hover);
  transition: all 0.2s ease;
}
```

#### Click Effects
```css
.button:active {
  transform: scale(0.95);
  transition: transform 0.1s ease;
}

/* Return to normal after click */
.button {
  transition: transform 0.2s ease;
}
```

#### Loading State Transition
```javascript
// Button state management pattern
setLoading(isLoading) {
  if (isLoading) {
    this.button.innerHTML = Icons.loader();
    this.button.style.animation = 'spin 1s linear infinite';
    this.button.style.cursor = 'default';
    this.button.style.opacity = '0.8';
  } else {
    this.button.innerHTML = Icons.send();
    this.button.style.animation = 'none';
    this.button.style.cursor = 'pointer';
    this.button.style.opacity = '1';
  }
}
```

### Tooltip Animations

#### Standard Tooltip
```css
[data-tooltip]:hover::before {
  content: attr(data-tooltip);
  transform: translateX(-50%);
  transition: all 0.15s ease;
}
```

### Focus States

#### Interactive Elements
```css
.interactive:focus {
  outline: 2px solid var(--interactive-accent);
  outline-offset: -2px;
  transition: outline 0.2s ease;
}
```

### Collapse/Expand Indicators

#### Caret Rotation
```css
.collapse-icon {
  transform: rotate(0deg);
  transition: transform 0.3s ease;
}

.collapsed .collapse-icon {
  transform: rotate(-90deg);
}
```

## Implementation Guidelines

### 1. CSS-in-JS Pattern

```javascript
// Standard component animation setup
private setupAnimations(): void {
  this.element.style.cssText = `
    transition: all 0.2s ease;
    transform: translateY(0);
  `;
}

// Hover state management
private addHoverEffects(): void {
  this.element.addEventListener('mouseenter', () => {
    this.element.style.transform = 'translateY(-1px) scale(1.05)';
  });
  
  this.element.addEventListener('mouseleave', () => {
    this.element.style.transform = 'translateY(0) scale(1)';
  });
}
```

### 2. Keyframe Injection Pattern

```javascript
// Reusable keyframe injection
private addKeyframes(id: string, keyframes: string): void {
  if (!document.querySelector(`#${id}`)) {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = keyframes;
    document.head.appendChild(style);
  }
}

// Usage
this.addKeyframes('spin-animation', `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`);
```

### 3. Staggered Animation Pattern

```javascript
// Staggered list animations
private animateList(items: HTMLElement[]): void {
  items.forEach((item, index) => {
    item.style.animation = 'slideIn 0.3s ease forwards';
    item.style.animationDelay = `${index * 0.05}s`;
  });
}
```

## Performance Considerations

### 1. Hardware Acceleration

```css
/* Use transform and opacity for best performance */
.animated {
  will-change: transform, opacity;
  transform: translateZ(0); /* Force hardware acceleration */
}
```

### 2. Animation Cleanup

```javascript
// Clean up animations after completion
private cleanup(): void {
  this.element.addEventListener('animationend', () => {
    this.element.style.animation = 'none';
    this.element.style.willChange = 'auto';
  });
}
```

### 3. Reduced Motion Support

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Usage Examples

### Modal Implementation
```javascript
class Modal extends BaseComponent {
  show() {
    this.overlay.style.animation = 'fadeIn 0.2s ease';
    this.modal.style.animation = 'modalSlideIn 0.3s ease';
  }
  
  hide() {
    this.overlay.style.animation = 'fadeOut 0.2s ease forwards';
    setTimeout(() => this.remove(), 200);
  }
}
```

### Button with Loading State
```javascript
class ActionButton extends BaseComponent {
  setLoading(loading) {
    if (loading) {
      this.element.style.animation = 'spin 1s linear infinite';
      this.element.innerHTML = Icons.loader();
    } else {
      this.element.style.animation = 'none';
      this.element.innerHTML = Icons.check();
    }
  }
}
```

### Context Area Document Chip
```javascript
addDocument(doc) {
  const chip = this.createDocumentChip(doc);
  chip.style.animation = 'slideIn 0.3s ease';
}

removeDocument(chip) {
  chip.style.animation = 'slideOut 0.2s ease forwards';
  setTimeout(() => chip.remove(), 200);
}
```

## Theme Integration

All animations respect the Writerr theme variables:

```css
.animated-element {
  background: var(--background-primary);
  color: var(--text-normal);
  border-color: var(--background-modifier-border);
  transition: all 0.2s ease;
}

.animated-element:hover {
  background: var(--background-modifier-hover);
  color: var(--interactive-accent);
}
```

This framework ensures consistent, performant animations that enhance the professional feel of the Writerr Platform while maintaining accessibility and performance standards.