# Writerr Platform CSS-in-JS Standards

> **Created**: 2025-08-28  
> **Purpose**: Document template literal styling patterns and standardize CSS-in-JS approaches  
> **Status**: Phase 1 Foundation Documentation

## Overview

The Writerr Platform uses CSS-in-JS patterns via template literals and the BaseComponent createElement() method to maintain consistent styling while enabling theme integration and dynamic behavior.

## CSS-in-JS Architecture

### Primary Approach: Template Literal Styling

**Standard Pattern:**
```typescript
element.style.cssText = `
  property: value;
  property: var(--css-variable);
  property: ${dynamicValue};
`;
```

**Consistency Benefits:**
- Single-source styling definition
- Integrated Obsidian CSS variable support
- Dynamic value interpolation
- Readable multi-line formatting

### Secondary Approach: BaseComponent styles Object

**createElement() Integration:**
```typescript
const element = this.createElement('div', {
  styles: {
    'display': 'flex',
    'gap': '12px',
    'border-radius': '12px',
    'background': 'var(--background-primary)'
  }
});
```

**Conversion Pattern:**
```typescript
// BaseComponent converts to cssText internally
el.style.cssText = Object.entries(options.styles)
  .map(([key, value]) => `${key}: ${value}`)
  .join('; ');
```

## Obsidian CSS Variable Integration

### Standard Theme Variables

**Colors:**
```css
--background-primary          /* Main background */
--background-secondary        /* Secondary background */
--background-modifier-border  /* Standard borders */
--text-normal                 /* Primary text */
--text-muted                  /* Secondary text */
--text-faint                  /* Tertiary text */
--interactive-accent          /* Accent color */
--text-on-accent              /* Text on accent */
```

**Layout & Spacing:**
```css
--font-interface              /* UI font family */
--font-text-size              /* Base text size */
--radius-s                    /* Small border radius (4px) */
--radius-m                    /* Medium border radius (6px) */
```

**Usage Pattern:**
```typescript
element.style.cssText = `
  background: var(--background-primary);
  color: var(--text-normal);
  border: 1px solid var(--background-modifier-border);
  font-family: var(--font-interface);
`;
```

## Established Design Patterns

### 1. Animation Standards

**Transition Timing:**
```css
transition: all 0.2s ease;  /* Standard micro-interactions */
transition: all 0.3s ease;  /* Larger state changes */
```

**Loading Animations:**
```css
animation: spin 1s linear infinite;  /* Loading spinners */
animation: slideIn 0.3s ease;       /* Element appearances */
```

### 2. Border Radius Patterns

**Component-Specific Values:**
```css
border-radius: 4px;   /* Small elements (buttons, chips) */
border-radius: 8px;   /* Medium elements (inputs, cards) */
border-radius: 12px;  /* Large elements (modals, bubbles) */
border-radius: 16px;  /* Chips and tags */
border-radius: 18px;  /* Message bubbles */
border-radius: 50%;   /* Circular elements */
```

### 3. Shadow Patterns

**Elevation System:**
```css
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);    /* Subtle depth */
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);    /* Message elevation */
box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);    /* Modal depth */
box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);   /* Overlay elevation */
```

### 4. Flexbox Layout Standards

**Common Flex Patterns:**
```css
/* Standard horizontal layout */
display: flex;
align-items: center;
gap: 12px;

/* Justified space-between layout */
display: flex;
align-items: center;
justify-content: space-between;

/* Centered vertical layout */
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;

/* Responsive flex layout */
display: flex;
align-items: center;
flex: 1;
min-width: 0; /* Prevent flex overflow */
```

## Component-Specific Standards

### Button Styling Patterns

**Primary Buttons:**
```typescript
element.style.cssText = `
  background: var(--interactive-accent);
  color: var(--text-on-accent);
  border: none;
  border-radius: 8px;
  padding: 12px 16px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
`;
```

**Secondary Buttons:**
```typescript
element.style.cssText = `
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--background-modifier-border);
  border-radius: 4px;
  padding: 6px 8px;
  cursor: pointer;
  transition: all 0.2s ease;
`;
```

**Icon Buttons:**
```typescript
element.style.cssText = `
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  padding: 6px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
`;
```

### Input Styling Patterns

**Text Inputs:**
```typescript
element.style.cssText = `
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 8px;
  background: var(--background-primary);
  color: var(--text-normal);
  font-family: var(--font-interface);
  outline: none;
  transition: border-color 0.2s ease;
`;
```

**Auto-Resize TextArea:**
```typescript
element.style.cssText = `
  width: 100%;
  min-height: 80px;
  max-height: 200px;
  padding: 12px;
  border: 2px solid var(--background-modifier-border);
  border-radius: 12px;
  background: var(--background-primary);
  color: var(--text-normal);
  resize: none;
  font-family: var(--font-interface);
  outline: none;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
`;
```

### Container Layout Patterns

**Modal Containers:**
```typescript
element.style.cssText = `
  background: var(--background-primary);
  border: 1px solid var(--background-modifier-border);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  animation: modalSlideIn 0.3s ease;
`;
```

**Chat Bubble Containers:**
```typescript
element.style.cssText = `
  display: flex;
  margin: 16px 0;
  gap: 12px;
  position: relative;
  align-items: flex-start;
  ${isUser ? 'flex-direction: row-reverse;' : ''}
`;
```

## Dynamic Styling Patterns

### Conditional Styling

**User-based Styling:**
```typescript
element.style.cssText = `
  display: flex;
  align-items: center;
  gap: 12px;
  ${isUser ? 'flex-direction: row-reverse;' : ''}
  ${isActive ? 'background: var(--interactive-accent);' : ''}
`;
```

**State-based Styling:**
```typescript
element.style.cssText = `
  transform: ${this.isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)'};
  opacity: ${this.isVisible ? '1' : '0'};
  cursor: ${this.isDisabled ? 'default' : 'pointer'};
`;
```

### Animation Delays

**Staggered Animations:**
```typescript
element.style.cssText = `
  animation: slideIn 0.3s ease forwards;
  animation-delay: ${index * 0.05}s;
  opacity: 0;
`;
```

## Hover and Focus States

### Hover Effect Patterns

**Standard Hover:**
```css
/* Via BaseComponent.addHoverEffect() */
background-color: var(--interactive-accent-hover);
transform: scale(1.02);
```

**Button Hover:**
```css
background: var(--background-modifier-hover);
color: var(--text-normal);
```

### Focus States

**Input Focus:**
```css
border-color: var(--interactive-accent);
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1), 
            0 0 0 1px var(--interactive-accent);
```

## Style Utility Functions

### Recommended Utility Pattern

```typescript
// Create reusable style generators
const createButtonStyles = (variant: 'primary' | 'secondary' = 'secondary') => {
  const baseStyles = `
    border: none;
    cursor: pointer;
    border-radius: 6px;
    padding: 8px 12px;
    font-family: var(--font-interface);
    transition: all 0.2s ease;
  `;
  
  const variantStyles = {
    primary: `background: var(--interactive-accent); color: var(--text-on-accent);`,
    secondary: `background: transparent; color: var(--text-muted);`
  };
  
  return `${baseStyles} ${variantStyles[variant]}`;
};
```

### Common Style Fragments

```typescript
const FLEX_CENTER = 'display: flex; align-items: center; justify-content: center;';
const FLEX_ROW = 'display: flex; align-items: center;';
const TRANSITION_STANDARD = 'transition: all 0.2s ease;';
const BORDER_STANDARD = '1px solid var(--background-modifier-border)';
```

## Migration Guidelines

### From External CSS to CSS-in-JS

**Before (External CSS):**
```css
.chat-button {
  background: var(--interactive-accent);
  border-radius: 8px;
}
```

**After (CSS-in-JS):**
```typescript
button.style.cssText = `
  background: var(--interactive-accent);
  border-radius: 8px;
`;
```

### From Hardcoded Values to CSS Variables

**Before:**
```typescript
element.style.cssText = `
  font-family: inherit;
  font-size: 14px;
  color: #333333;
`;
```

**After:**
```typescript
element.style.cssText = `
  font-family: var(--font-interface);
  font-size: var(--font-text-size);
  color: var(--text-normal);
`;
```

## Best Practices Summary

### ✅ Do
- Use template literal CSS-in-JS for complex styling
- Integrate Obsidian CSS variables throughout
- Use BaseComponent createElement() for simple elements  
- Follow established animation timing (0.2s, 0.3s)
- Include transition properties for interactive elements
- Use consistent border-radius values per component type

### ❌ Don't
- Mix external CSS files with CSS-in-JS patterns
- Hardcode color values instead of CSS variables
- Use inconsistent transition timing
- Create elements without BaseComponent patterns
- Ignore hover and focus state styling

---

## Conclusion

The CSS-in-JS approach provides consistent, theme-integrated styling across the Writerr Platform while maintaining the flexibility needed for dynamic component behavior. The template literal pattern combined with Obsidian CSS variables ensures proper theme integration and maintainable styling architecture.