# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-08-28-writerr-platform-design-system/spec.md

> Created: 2025-08-28
> Version: 1.0.0

## Technical Requirements

### BaseComponent Architecture
- **Foundation Class**: Abstract base class with standardized lifecycle methods (render, destroy)
- **Element Creation**: Unified `createElement()` method supporting classes, styles, attributes, and tooltips
- **Event Management**: Consistent hover effect system with style state preservation
- **Tooltip Integration**: Dynamic tooltip loading with consistent delay timing (700ms default)

### CSS-in-JS Implementation
- **Template Literals**: String-based CSS styling using template literal syntax for dynamic styling
- **Obsidian Integration**: Exclusive use of Obsidian CSS variables for colors, spacing, and theme compatibility
- **Style Object Support**: Object-to-CSS conversion for programmatic styling: `Object.entries(styles).map(([key, value]) => \`${key}: ${value}\`).join('; ')`
- **State Management**: Dynamic style updates for hover, focus, active, and disabled states

### Icon System Integration
- **Lucide Icons**: SVG-based icon system using direct path data from lucide.dev
- **Size Standards**: Predefined size presets (xs: 14px, sm: 16px, md: 20px, lg: 24px, xl: 28px)
- **Stroke Standardization**: 2px stroke width default with configurable override
- **Component Integration**: Factory methods for common icons (send, bot, user, copy, etc.)

### Animation Framework
- **Transition Timing**: 0.2s ease standard for all hover/focus state changes
- **Loading Animation**: CSS keyframe-based spin animation for processing states
- **Hover Effects**: Scale transformations (1.05 hover, 0.95 click) for tactile feedback
- **State Preservation**: Original style value storage during temporary state changes

## Approach

### Component Development Pattern
1. **Extend BaseComponent**: All UI components inherit from BaseComponent for consistency
2. **CSS-in-JS Styling**: Use template literals with Obsidian CSS variables exclusively
3. **Icon Integration**: Utilize centralized Icons object with appropriate size presets
4. **Event Handling**: Implement hover effects via `addHoverEffect()` method
5. **Tooltip Addition**: Apply tooltips through `addTooltip()` for consistent user feedback

### Style System Architecture
```typescript
// CSS-in-JS Pattern
element.style.cssText = `
  property: var(--obsidian-variable);
  transition: all 0.2s ease;
`;

// Hover Effect Pattern  
this.addHoverEffect(element, {
  'property': 'var(--hover-value)',
  'transform': 'scale(1.05)'
});

// Icon Usage Pattern
element.innerHTML = Icons.iconName({ 
  className: 'component-specific-class', 
  width: 16, 
  height: 16 
});
```

### Component Structure Standards
- **Container Setup**: Initialize component containers with appropriate flexbox or positioning
- **Element Creation**: Use `createElement()` method with consistent option patterns
- **State Management**: Handle loading, disabled, active states with visual feedback
- **Accessibility**: Include proper ARIA labels, focus management, and semantic HTML

## External Dependencies

### Core Dependencies
- **Obsidian API**: Core functionality for element creation and CSS variable access
- **Lucide Icon Library**: SVG path data for consistent iconography
- **TypeScript**: Type safety for component interfaces and configuration objects

### CSS Variable Requirements
- **Obsidian Theme Variables**: Full dependency on Obsidian's CSS custom properties
  - Colors: `--text-normal`, `--text-muted`, `--text-faint`, `--interactive-accent`
  - Backgrounds: `--background-primary`, `--background-secondary`, `--background-modifier-border`
  - Interactions: `--background-modifier-hover`
  - Spacing: `--radius-s` for border radius consistency

### Browser Compatibility
- **Modern Browser Support**: ES2017+ features (template literals, Object.entries)
- **CSS Custom Properties**: Native CSS variable support required
- **SVG Support**: Inline SVG rendering for icon system