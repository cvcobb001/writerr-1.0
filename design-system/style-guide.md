# Writerr Platform Design System Style Guide

> **Comprehensive styling standards extracted from the Writerr Chat implementation**
> 
> Created: 2025-08-28  
> Status: Complete
> Based on: Writerr Chat v1.2.1 implementation

## Overview

This style guide documents the consistent visual language and styling patterns used across the Writerr Platform. All values and patterns are extracted from the production implementation and should serve as the source of truth for maintaining visual consistency across all platform components.

## 1. Spacing System

### Standard Spacing Scale

The Writerr Platform uses a consistent spacing scale based on the following values:

```css
/* Core Spacing Values */
--spacing-xs: 4px;   /* Fine details, internal element spacing */
--spacing-s: 6px;    /* Small button padding, tight layouts */
--spacing-m: 8px;    /* Standard button padding, container spacing */
--spacing-l: 12px;   /* Standard gaps, medium padding */
--spacing-xl: 15px;  /* Container padding, major layout spacing */
--spacing-xxl: 16px; /* Message margins, significant spacing */
```

### Spacing Usage Guidelines

#### Component Padding
```css
/* Button Padding */
.toolbar-button { padding: 6px; }        /* --spacing-s */
.send-button { padding: 8px; }           /* --spacing-m */
.context-action { padding: 4px; }        /* --spacing-xs */
.message-action { padding: 4px; }        /* --spacing-xs */

/* Input Padding */
.chat-input { padding: 12px 52px 12px 12px; } /* Complex asymmetric padding */
.tooltip { padding: 4px 8px; }                 /* --spacing-xs --spacing-m */
```

#### Container Spacing
```css
/* Major Layout Containers */
.chat-messages { padding: 15px; }        /* --spacing-xl */
.input-container { padding: 15px; }      /* --spacing-xl */
.input-container-compact { padding: 8px; } /* --spacing-m */

/* Component Gaps */
.toolbar-left { gap: 12px; }             /* --spacing-l */
.message-actions { gap: 4px; }           /* --spacing-xs */
.header-left { gap: 12px; }              /* --spacing-l */
.mode-select-wrapper { gap: 4px; }       /* --spacing-xs */
```

#### Margins and Positioning
```css
/* Message Layout */
.chat-message { margin: 16px 0; }        /* --spacing-xxl vertical */
.message-actions { margin-top: 6px; }    /* --spacing-s */

/* Absolute Positioning */
.send-button { right: 12px; bottom: 12px; } /* --spacing-l */
.context-action { top: 8px; right: 16px; }  /* --spacing-m --spacing-xxl */
```

### Semantic Spacing Tokens

```css
/* Layout Spacing */
--layout-padding-major: 15px;    /* Primary container padding */
--layout-padding-minor: 8px;     /* Secondary container padding */
--layout-gap-standard: 12px;     /* Standard flex gap */
--layout-gap-tight: 4px;         /* Tight element grouping */

/* Component Spacing */
--component-padding-button: 6px;     /* Standard button internal spacing */
--component-padding-input: 12px;     /* Input field internal spacing */
--component-padding-action: 4px;     /* Small action button spacing */
--component-margin-message: 16px;    /* Message bubble vertical spacing */
```

## 2. Color System

### Obsidian Theme Integration

The Writerr Platform leverages Obsidian's CSS custom properties for complete theme compatibility:

#### Background Colors
```css
/* Primary Backgrounds */
--background-primary           /* Main content backgrounds */
--background-secondary         /* Secondary content areas */
--background-modifier-hover    /* Interactive hover states */
--background-modifier-border   /* Border and separator colors */

/* Usage Examples */
.chat-view { background: var(--background-primary); }
.input-field { background: var(--background-primary); }
.button:hover { background: var(--background-modifier-hover); }
.input-border { border: 1px solid var(--background-modifier-border); }
```

#### Text Colors
```css
/* Text Hierarchy */
--text-normal     /* Primary text content */
--text-muted      /* Secondary text, icons in normal state */
--text-faint      /* Disabled text and elements */

/* Usage Examples */
.message-content { color: var(--text-normal); }
.toolbar-icon { color: var(--text-muted); }
.disabled-button { color: var(--text-faint); }
.input-placeholder { color: var(--text-muted); }
```

#### Interactive Colors
```css
/* Accent and Interactive */
--interactive-accent          /* Primary action color, focus states */
--interactive-accent-hover    /* Accent hover states */

/* Usage Examples */
.send-button:hover { color: var(--interactive-accent); }
.input-field:focus { border-color: var(--interactive-accent); }
.active-tool { color: var(--interactive-accent); }
```

### Color Usage Patterns

#### Button States
```css
/* Default Button */
color: var(--text-muted);
background: transparent;

/* Hover State */
color: var(--text-normal);
background: var(--background-modifier-hover);

/* Active/Focus State */
color: var(--interactive-accent);
background: var(--background-modifier-hover);

/* Disabled State */
color: var(--text-faint);
background: transparent;
cursor: not-allowed;
```

#### Input States
```css
/* Default Input */
background: var(--background-primary);
border: 1px solid var(--background-modifier-border);
color: var(--text-normal);

/* Focus State */
border-color: var(--interactive-accent);

/* Placeholder */
color: var(--text-muted);
```

### Semantic Color Tokens

```css
/* Interactive Elements */
--color-interactive-default: var(--text-muted);
--color-interactive-hover: var(--text-normal);
--color-interactive-active: var(--interactive-accent);
--color-interactive-disabled: var(--text-faint);

/* Backgrounds */
--color-surface-primary: var(--background-primary);
--color-surface-hover: var(--background-modifier-hover);
--color-border-default: var(--background-modifier-border);
--color-border-focus: var(--interactive-accent);
```

## 3. Typography System

### Font Scale and Hierarchy

#### Font Size Scale
```css
/* Typography Scale */
--font-size-xs: 11px;           /* Tooltips, fine details */
--font-size-s: 14px;            /* Input text, body content */
--font-size-m: 16px;            /* Standard body text (implied) */
--font-size-l: 18px;            /* Headers, important text */
--font-size-ui-small: var(--font-ui-smaller); /* System UI small text */
```

#### Font Family Usage
```css
/* Font Family Tokens */
--font-ui: var(--default-font);           /* Standard UI text */
--font-monospace: var(--font-monospace);  /* Code, numbers */
--font-inherit: inherit;                   /* Inherits from parent */

/* Usage Examples */
.message-text { font-family: var(--default-font); }
.token-counter { font-family: var(--font-monospace); }
.input-field { font-family: inherit; }
```

#### Line Height Standards
```css
/* Line Height Scale */
--line-height-tight: 1.2;      /* Headers, compact text */
--line-height-normal: 1.4;     /* Body text, input fields */
--line-height-loose: 1.6;      /* Reading content */

/* Usage Examples */
.input-field { line-height: 1.4; }
.message-content { line-height: 1.4; }
```

### Typography Usage Patterns

#### Text Hierarchy
```css
/* Primary Headers */
.header-primary {
  font-size: 18px;
  font-weight: 500;
  color: var(--text-normal);
  line-height: 1.2;
}

/* Body Text */
.body-text {
  font-size: 14px;
  font-weight: 400;
  color: var(--text-normal);
  line-height: 1.4;
}

/* Secondary Text */
.text-secondary {
  font-size: var(--font-ui-smaller);
  color: var(--text-muted);
  font-family: var(--font-monospace); /* For numeric content */
}

/* Micro Text */
.text-micro {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.2;
}
```

#### Font Weight Usage
```css
/* Font Weight Scale */
--font-weight-normal: 400;      /* Standard text weight */
--font-weight-medium: 500;      /* Headers, emphasis */
--font-weight-bold: 600;        /* Strong emphasis (rare) */

/* Usage Examples */
.header { font-weight: 500; }
.body { font-weight: 400; }
```

### Semantic Typography Tokens

```css
/* Text Styles */
--text-style-header: 18px/1.2 var(--default-font) 500;
--text-style-body: 14px/1.4 var(--default-font) 400;
--text-style-caption: var(--font-ui-smaller)/1.2 var(--font-monospace) 400;
--text-style-tooltip: 11px/1.2 var(--default-font) 400;
```

## 4. Border Radius System

### Border Radius Scale
```css
/* Obsidian CSS Variables */
--radius-s: var(--radius-s);    /* Small buttons, controls */
--radius-m: 4px;                /* Tooltips, small containers */
--radius-l: 12px;               /* Input fields, major containers */

/* Usage Examples */
.button { border-radius: var(--radius-s); }
.tooltip { border-radius: 4px; }
.input-field { border-radius: 12px; }
```

### Border Radius Usage Guidelines

#### Component Border Radius
```css
/* Interactive Elements */
.toolbar-button { border-radius: var(--radius-s); }
.send-button { border-radius: var(--radius-s); }
.message-action { border-radius: var(--radius-s); }

/* Input Elements */
.chat-input { border-radius: 12px; }

/* Containers */
.tooltip { border-radius: 4px; }
```

## 5. Shadow System

### Shadow Hierarchy
```css
/* Shadow Scale */
--shadow-subtle: 0 1px 3px rgba(0, 0, 0, 0.05);      /* Input fields */
--shadow-tooltip: 0 2px 8px rgba(0, 0, 0, 0.3);      /* Tooltips, overlays */

/* Usage Examples */
.input-field { box-shadow: var(--shadow-subtle); }
.tooltip { box-shadow: var(--shadow-tooltip); }
```

## 6. Animation Standards

### Transition Timing
```css
/* Standard Transitions */
--transition-fast: 0.2s ease;           /* Standard interactive transitions */
--transition-property-all: all;         /* Universal transition property */
--transition-property-color: color;     /* Color-only transitions */

/* Usage Examples */
.interactive-element { transition: all 0.2s ease; }
.color-change { transition: color 0.2s ease; }
```

### Animation Patterns
```css
/* Loading Animations */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-icon { animation: spin 1s linear infinite; }
```

## 7. Component-Specific Patterns

### Icon Standards
```css
/* Icon Sizing */
--icon-size-small: 14px;        /* Context actions, small buttons */
--icon-size-standard: 16px;     /* Toolbar buttons, general use */
--icon-size-large: 20px;        /* Message avatars, prominent icons */

/* Icon Properties */
--icon-stroke-width: 2;         /* Consistent stroke width */

/* Usage Examples */
.toolbar-icon { width: 16px; height: 16px; stroke-width: 2; }
.context-icon { width: 14px; height: 14px; stroke-width: 2; }
.avatar-icon { width: 20px; height: 20px; stroke-width: 2; }
```

### Input Field Patterns
```css
/* Standard Input */
.input-field {
  min-height: 60px;
  max-height: 200px;
  padding: 10px 50px 10px 12px;  /* Asymmetric for send button space */
  border: 1px solid var(--background-modifier-border);
  border-radius: 12px;
  background: var(--background-primary);
  color: var(--text-normal);
  font-size: 14px;
  line-height: 1.4;
  transition: all 0.2s ease;
}

/* Enhanced Input (CSS-in-JS) */
.enhanced-input {
  width: 100%;
  min-height: 80px;
  max-height: 200px;
  padding: 12px 52px 12px 12px;
  border: 2px solid var(--background-modifier-border);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  /* ... additional enhanced properties */
}
```

### Layout Container Patterns
```css
/* Flex Layouts */
.horizontal-layout {
  display: flex;
  align-items: center;
  gap: 12px;
}

.vertical-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Message Layout */
.message-container {
  display: flex;
  margin: 16px 0;
  gap: 12px;
  position: relative;
  align-items: flex-start;
}

.message-container.user {
  flex-direction: row-reverse;
}
```

## 8. Implementation Guidelines

### CSS-in-JS Integration
```typescript
// Standard createElement pattern
this.createElement('div', {
  cls: ['component-class'],
  styles: {
    display: 'flex',
    gap: '12px',
    padding: '8px',
    borderRadius: 'var(--radius-s)',
    background: 'var(--background-primary)',
    color: 'var(--text-normal)',
    transition: 'all 0.2s ease'
  }
});
```

### Hover Effect Patterns
```typescript
// Standard hover implementation
this.addHoverEffect(element, {
  color: 'var(--text-normal)',
  background: 'var(--background-modifier-hover)'
});
```

### Tooltip Integration
```typescript
// Standard tooltip implementation
this.addTooltip(element, 'Tooltip text', 700);
```

## 9. Accessibility Considerations

### Focus States
```css
/* Focus Indicators */
.focusable:focus {
  outline: none;
  border-color: var(--interactive-accent);
}

.focusable:focus-visible {
  outline: 2px solid var(--interactive-accent);
  outline-offset: 2px;
}
```

### Color Contrast
- All text maintains WCAG AA contrast ratios through Obsidian's theme system
- Interactive states provide clear visual feedback
- Disabled states use consistent opacity and cursor indicators

## 10. Migration Guidelines

### Converting Existing Components
1. Replace hardcoded values with semantic tokens
2. Use Obsidian CSS variables for all colors
3. Implement standard spacing scale
4. Apply consistent border radius patterns
5. Use standard transition timings

### Validation Checklist
- [ ] All spacing uses standard scale values
- [ ] All colors use Obsidian CSS variables
- [ ] Typography follows established hierarchy
- [ ] Border radius follows component patterns
- [ ] Transitions use standard timing
- [ ] Icons follow size and stroke standards
- [ ] Hover states follow interaction patterns
- [ ] Focus states meet accessibility requirements

---

*This style guide is extracted from the production Writerr Chat implementation and should serve as the definitive reference for maintaining visual consistency across the Writerr Platform.*