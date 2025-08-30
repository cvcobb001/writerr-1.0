# Obsidian Plugin DOM Structure Guide

## Context

DOM structure and HTML element patterns for Obsidian plugin development using TypeScript createElement patterns.

## DOM Creation Approach

### createElement Pattern
We use TypeScript's DOM API for all element creation, not template literals or innerHTML for structure.

```typescript
// Standard element creation pattern
const container = this.createElement('div', { 
  cls: 'component-container' 
});

const button = container.createEl('button', {
  cls: 'action-button',
  text: 'Click me',
  attr: {
    'type': 'button',
    'aria-label': 'Perform action'
  }
});
```

### BaseComponent createElement Helper
```typescript
// Use the BaseComponent helper method
protected createElement<T extends keyof HTMLElementTagNameMap>(
  tag: T,
  options: {
    cls?: string | string[];
    text?: string;
    attr?: Record<string, string>;
    styles?: Record<string, string>;
  } = {}
): HTMLElementTagNameMap[T] {
  const element = document.createElement(tag);
  
  // Apply classes
  if (options.cls) {
    const classes = Array.isArray(options.cls) ? options.cls : [options.cls];
    element.classList.add(...classes);
  }
  
  // Apply text content
  if (options.text) {
    element.textContent = options.text;
  }
  
  // Apply attributes
  if (options.attr) {
    Object.entries(options.attr).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }
  
  // Apply styles
  if (options.styles) {
    Object.entries(options.styles).forEach(([key, value]) => {
      element.style.setProperty(key, value);
    });
  }
  
  this.container.appendChild(element);
  return element;
}
```

## Component Structure Patterns

### Container Hierarchy
```typescript
// Main component container
this.container = this.createElement('div', { cls: 'writerr-component' });

// Header section
const header = this.createElement('div', { cls: 'component-header' });

// Content section
const content = this.createElement('div', { cls: 'component-content' });

// Footer section
const footer = this.createElement('div', { cls: 'component-footer' });
```

### Interactive Elements
```typescript
// Button with proper accessibility
const button = this.createElement('button', {
  cls: ['action-btn', 'primary'],
  attr: {
    'type': 'button',
    'aria-label': 'Descriptive action name',
    'tabindex': '0'
  }
});

// Input with proper labeling
const inputGroup = this.createElement('div', { cls: 'input-group' });
const label = inputGroup.createEl('label', {
  text: 'Input Label',
  attr: { 'for': 'input-id' }
});
const input = inputGroup.createEl('input', {
  cls: 'form-input',
  attr: {
    'id': 'input-id',
    'type': 'text',
    'placeholder': 'Enter text...',
    'autocomplete': 'off'
  }
});
```

## Semantic Structure

### Use Proper HTML5 Elements
```typescript
// Navigation structure
const nav = this.createElement('nav', { 
  cls: 'component-nav',
  attr: { 'role': 'navigation', 'aria-label': 'Component navigation' }
});

// Article/section content
const article = this.createElement('article', { cls: 'content-article' });
const section = article.createEl('section', { cls: 'content-section' });

// Lists with proper structure
const list = this.createElement('ul', { 
  cls: 'item-list',
  attr: { 'role': 'list' }
});

const listItem = list.createEl('li', {
  cls: 'list-item',
  attr: { 'role': 'listitem' }
});
```

### Accessibility Attributes
```typescript
// Interactive elements with ARIA
const dropdown = this.createElement('div', {
  cls: 'dropdown-container',
  attr: {
    'role': 'combobox',
    'aria-expanded': 'false',
    'aria-haspopup': 'listbox'
  }
});

// Modal/dialog structure
const modal = this.createElement('div', {
  cls: 'modal-overlay',
  attr: {
    'role': 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': 'modal-title',
    'aria-describedby': 'modal-description'
  }
});

// Focus trap elements
const focusTrap = modal.createEl('div', { cls: 'focus-trap' });
```

## Event Handling Structure

### Proper Event Delegation
```typescript
class ComponentExample extends BaseComponent {
  private eventListeners: Map<HTMLElement, EventListener[]> = new Map();

  private addEventListeners(): void {
    // Container-level event delegation
    this.container.addEventListener('click', this.handleClick.bind(this));
    this.container.addEventListener('keydown', this.handleKeydown.bind(this));
    
    // Store references for cleanup
    this.eventListeners.set(this.container, [
      this.handleClick.bind(this),
      this.handleKeydown.bind(this)
    ]);
  }

  private handleClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    // Handle different element types
    if (target.matches('.action-button')) {
      this.handleButtonClick(target, event);
    } else if (target.matches('.list-item')) {
      this.handleItemClick(target, event);
    }
  }

  public destroy(): void {
    // Clean up all event listeners
    for (const [element, listeners] of this.eventListeners) {
      listeners.forEach(listener => {
        element.removeEventListener('click', listener);
        element.removeEventListener('keydown', listener);
      });
    }
    this.eventListeners.clear();
    super.destroy();
  }
}
```

## Layout Structure Patterns

### Flexible Header Layout
```typescript
private createHeader(): void {
  const header = this.createElement('header', { cls: 'component-header' });
  
  // Left section
  const leftSection = header.createEl('div', { cls: 'header-left' });
  const title = leftSection.createEl('h2', { 
    text: 'Component Title',
    cls: 'header-title',
    attr: { 'id': 'component-title' }
  });
  
  // Right section
  const rightSection = header.createEl('div', { cls: 'header-right' });
  const actions = rightSection.createEl('div', { cls: 'header-actions' });
}
```

### Content Area with Scrolling
```typescript
private createContent(): void {
  const content = this.createElement('main', { 
    cls: 'component-main',
    attr: { 'role': 'main', 'tabindex': '0' }
  });
  
  // Scrollable area
  const scrollArea = content.createEl('div', { 
    cls: 'scroll-area',
    attr: { 
      'tabindex': '0',
      'role': 'region',
      'aria-labelledby': 'component-title'
    }
  });
}
```

### List Structures
```typescript
private createList(items: ItemData[]): void {
  const listContainer = this.createElement('div', { cls: 'list-container' });
  
  const list = listContainer.createEl('ul', {
    cls: 'item-list',
    attr: { 
      'role': 'list',
      'aria-label': 'Items list'
    }
  });
  
  items.forEach((item, index) => {
    const listItem = list.createEl('li', {
      cls: 'list-item',
      attr: {
        'role': 'listitem',
        'tabindex': '0',
        'aria-posinset': String(index + 1),
        'aria-setsize': String(items.length)
      }
    });
    
    this.populateListItem(listItem, item);
  });
}
```

## Form Structure

### Proper Form Elements
```typescript
private createForm(): void {
  const form = this.createElement('form', {
    cls: 'settings-form',
    attr: { 'novalidate': 'true' }
  });

  // Field group
  const fieldGroup = form.createEl('fieldset', { cls: 'field-group' });
  const legend = fieldGroup.createEl('legend', { 
    text: 'Settings Group',
    cls: 'field-legend'
  });

  // Individual field
  const field = fieldGroup.createEl('div', { cls: 'form-field' });
  const label = field.createEl('label', {
    text: 'Setting Name',
    cls: 'field-label',
    attr: { 'for': 'setting-input' }
  });
  
  const input = field.createEl('input', {
    cls: 'field-input',
    attr: {
      'id': 'setting-input',
      'type': 'text',
      'name': 'setting-name',
      'aria-describedby': 'setting-help'
    }
  });
  
  const help = field.createEl('div', {
    text: 'Helper text for this setting',
    cls: 'field-help',
    attr: { 'id': 'setting-help' }
  });
}
```

## Data Attributes and State

### Component State Management
```typescript
// Use data attributes for state
element.setAttribute('data-state', 'loading');
element.setAttribute('data-expanded', 'false');
element.setAttribute('data-selected', 'true');

// CSS can then style based on state
// [data-state="loading"] { opacity: 0.5; }
// [data-expanded="true"] .dropdown-content { display: block; }
```

### Progressive Enhancement
```typescript
// Start with accessible HTML structure
const button = this.createElement('button', {
  cls: 'toggle-button',
  text: 'Show Details',
  attr: {
    'type': 'button',
    'aria-expanded': 'false',
    'aria-controls': 'details-panel'
  }
});

const details = this.createElement('div', {
  cls: 'details-panel',
  attr: {
    'id': 'details-panel',
    'hidden': 'true'
  }
});

// Enhance with JavaScript
button.addEventListener('click', () => {
  const isExpanded = button.getAttribute('aria-expanded') === 'true';
  button.setAttribute('aria-expanded', String(!isExpanded));
  details.toggleAttribute('hidden', isExpanded);
  button.textContent = isExpanded ? 'Show Details' : 'Hide Details';
});
```

## Best Practices

### Structure Organization
- **Logical hierarchy**: Use proper heading levels (h1 > h2 > h3)
- **Semantic elements**: Use `<nav>`, `<main>`, `<article>`, `<section>` appropriately  
- **Consistent naming**: Use clear, descriptive class names
- **ARIA labels**: Provide proper accessibility attributes

### Performance Considerations
- **Event delegation**: Use container-level event handling when possible
- **Element reuse**: Cache frequently accessed elements
- **Lazy creation**: Create complex structures only when needed
- **Cleanup**: Always remove event listeners in destroy methods

### Accessibility First
- **Keyboard navigation**: Ensure all interactive elements are keyboard accessible
- **Screen readers**: Provide proper ARIA attributes and labels
- **Focus management**: Handle focus states properly in modals/dropdowns
- **Color independence**: Don't rely solely on color for state indication

This approach ensures robust, accessible, and maintainable DOM structures that integrate well with Obsidian's plugin architecture.