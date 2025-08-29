# Obsidian Plugin CSS Style Guide

## Context

CSS styling standards for Obsidian plugin development using CSS-in-JS patterns and Obsidian's design system.

## Styling Approach

### CSS-in-JS with Template Literals
We use CSS-in-JS with template literal strings for all plugin styling, not external CSS files or TailwindCSS.

```typescript
// Standard pattern for component styling
element.style.cssText = `
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--background-primary);
  border: 1px solid var(--background-modifier-border);
  border-radius: 8px;
  color: var(--text-normal);
  transition: all 0.2s ease;
`;
```

## Obsidian CSS Variables

### Background Colors
```css
/* Primary backgrounds */
var(--background-primary)          /* Main content areas */
var(--background-secondary)        /* Secondary content, panels */
var(--background-modifier-hover)   /* Hover states */
var(--background-modifier-border)  /* Borders, dividers */
var(--background-modifier-error)   /* Error states */
var(--background-modifier-success) /* Success states */

/* Interactive backgrounds */
var(--interactive-accent)          /* Primary buttons, active states */
var(--interactive-accent-hover)    /* Accent hover states */
```

### Text Colors
```css
/* Text hierarchy */
var(--text-normal)     /* Primary text */
var(--text-muted)      /* Secondary text */
var(--text-faint)      /* Tertiary text, placeholders */
var(--text-error)      /* Error text */
var(--text-success)    /* Success text */
var(--text-on-accent)  /* Text on accent backgrounds */
```

### Spacing and Layout
```css
/* Consistent spacing using Obsidian's scale */
var(--size-2-1)   /* 2px */
var(--size-2-2)   /* 4px */  
var(--size-2-3)   /* 6px */
var(--size-4-1)   /* 8px */
var(--size-4-2)   /* 12px */
var(--size-4-3)   /* 16px */
var(--size-4-4)   /* 20px */
var(--size-4-6)   /* 24px */

/* Border radius */
var(--radius-s)    /* Small radius (4px) */
var(--radius-m)    /* Medium radius (6px) */
var(--radius-l)    /* Large radius (8px) */
```

## Component Styling Patterns

### Container Components
```typescript
// Main container styling
container.style.cssText = `
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--background-primary);
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-l);
  overflow: hidden;
`;

// Panel/section styling
panel.style.cssText = `
  padding: var(--size-4-3);
  border-bottom: 1px solid var(--background-modifier-border);
  background: var(--background-secondary);
`;
```

### Interactive Elements
```typescript
// Button styling
button.style.cssText = `
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  padding: var(--size-2-3);
  border-radius: var(--radius-s);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
`;

// Input styling
input.style.cssText = `
  width: 100%;
  padding: var(--size-4-2);
  border: 2px solid var(--background-modifier-border);
  border-radius: var(--radius-m);
  background: var(--background-primary);
  color: var(--text-normal);
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s ease;
`;
```

### Hover and Focus States
```typescript
// Use the addHoverEffect helper for consistent hover behavior
this.addHoverEffect(element, {
  'background-color': 'var(--background-modifier-hover)',
  'color': 'var(--text-normal)',
  'transform': 'translateY(-1px)'
});

// Focus states for inputs
element.addEventListener('focus', () => {
  element.style.borderColor = 'var(--interactive-accent)';
  element.style.boxShadow = '0 0 0 1px var(--interactive-accent)';
});

element.addEventListener('blur', () => {
  element.style.borderColor = 'var(--background-modifier-border)';
  element.style.boxShadow = 'none';
});
```

## Layout Patterns

### Flexbox Layouts
```typescript
// Header with left/right sections
header.style.cssText = `
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--size-4-2) var(--size-4-3);
`;

// Vertical stack with gap
stack.style.cssText = `
  display: flex;
  flex-direction: column;
  gap: var(--size-4-1);
`;

// Horizontal group with gap
group.style.cssText = `
  display: flex;
  align-items: center;
  gap: var(--size-4-1);
  flex-shrink: 0;
`;
```

### CSS Grid for Complex Layouts
```typescript
// Grid container for wrapping items
container.style.cssText = `
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 180px));
  gap: var(--size-4-1);
  width: 100%;
  box-sizing: border-box;
`;

// Grid item styling
item.style.cssText = `
  display: flex;
  align-items: center;
  padding: var(--size-2-3) var(--size-4-2);
  background: var(--background-primary);
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--size-4-4);
  box-sizing: border-box;
`;
```

## Animation and Transitions

### Standard Transitions
```typescript
// Smooth transitions for interactive elements
element.style.transition = 'all 0.2s ease';

// Longer transitions for layout changes
element.style.transition = 'all 0.3s ease';

// Specific property transitions
element.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
```

### Animation Patterns
```typescript
// Fade in animation
const fadeIn = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

// Apply animation
element.style.animation = 'fadeIn 0.3s ease';

// Remove animation after completion
setTimeout(() => {
  element.style.animation = 'none';
}, 300);
```

## Icon Integration

### Lucide Icons
```typescript
// Standard icon usage with proper sizing
button.innerHTML = Icons.plus({ 
  width: 16, 
  height: 16,
  className: 'icon-class'
});

// Icon with consistent styling
icon.style.cssText = `
  width: 16px;
  height: 16px;
  stroke-width: 2;
  color: var(--text-muted);
  flex-shrink: 0;
`;
```

## Responsive Considerations

### Obsidian Viewport Handling
```typescript
// Handle different pane sizes
const isNarrow = container.offsetWidth < 300;

element.style.cssText = `
  padding: ${isNarrow ? 'var(--size-4-1)' : 'var(--size-4-3)'};
  font-size: ${isNarrow ? '12px' : '14px'};
  gap: ${isNarrow ? 'var(--size-2-2)' : 'var(--size-4-1)'};
`;
```

## State Management

### Visual State Indicators
```typescript
// Active state
element.classList.add('is-active');
element.style.cssText += `
  background: var(--interactive-accent);
  color: var(--text-on-accent);
`;

// Disabled state
element.style.cssText += `
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
`;

// Loading state
element.style.cssText += `
  opacity: 0.8;
  cursor: wait;
`;
```

## Best Practices

### Performance
- **Avoid frequent style changes**: Batch style updates when possible
- **Use CSS transforms**: For animations instead of changing layout properties
- **Minimize reflows**: Change `transform` and `opacity` instead of `width`/`height`

### Consistency
- **Always use Obsidian CSS variables**: Never hardcode colors or spacing
- **Follow spacing scale**: Use consistent spacing from Obsidian's design system
- **Maintain visual hierarchy**: Use proper text and background color combinations

### Accessibility
- **Sufficient contrast**: Ensure text is readable against backgrounds
- **Focus indicators**: Clear focus states for keyboard navigation
- **Semantic structure**: Use appropriate HTML elements with proper roles

### Organization
```typescript
// Group related styles together
const containerStyles = `
  /* Layout */
  display: flex;
  flex-direction: column;
  
  /* Sizing */
  width: 100%;
  height: auto;
  
  /* Appearance */
  background: var(--background-primary);
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-l);
  
  /* Behavior */
  overflow: hidden;
  transition: all 0.2s ease;
`;
```

## Common Patterns

### Modal/Overlay Styling
```typescript
const overlay = `
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
`;

const modal = `
  background: var(--background-primary);
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-l);
  padding: var(--size-4-6);
  max-width: 500px;
  max-height: 70vh;
  overflow-y: auto;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
`;
```

### List Item Styling
```typescript
const listItem = `
  display: flex;
  align-items: center;
  gap: var(--size-4-2);
  padding: var(--size-4-2);
  border-radius: var(--radius-s);
  cursor: pointer;
  transition: background-color 0.2s ease;
`;

// Hover state
listItem.addEventListener('mouseenter', () => {
  listItem.style.backgroundColor = 'var(--background-modifier-hover)';
});
```

This approach ensures consistent, accessible, and performant styling that integrates seamlessly with Obsidian's design system.