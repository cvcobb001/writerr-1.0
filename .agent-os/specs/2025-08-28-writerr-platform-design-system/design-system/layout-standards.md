# Writerr Platform Layout Standards

*Design System Specification - Layout Pattern Library*  
*Generated: August 28, 2025*

## Overview

This document defines the comprehensive layout standards and patterns for the Writerr Platform, extracted from the existing Writerr Chat implementation. These patterns establish consistent spatial relationships, container hierarchies, and responsive behaviors across all platform components.

## Core Layout Principles

### 1. Spatial Hierarchy
- **Primary containers**: 16-20px padding for main content areas
- **Secondary containers**: 8-12px padding for nested sections
- **Action zones**: 4-8px padding for buttons and controls
- **Content spacing**: 12-16px gaps between related elements

### 2. Flexbox-First Approach
- Default layout system using flexbox for most arrangements
- Grid layouts reserved for specialized content (document chips, cards)
- Consistent flex patterns across components

### 3. Responsive Behavior
- Adaptive layouts that respond to content changes
- Smooth transitions for state changes (0.2-0.3s ease)
- Progressive disclosure with collapsible sections

## Layout Pattern Categories

## 1. Message Layout Patterns

### 1.1 Role-Based Message Structure

**Pattern**: Conversational message bubbles with role-specific layouts

```css
/* Base message container */
.chat-message {
  display: flex;
  margin: 16px 0;
  gap: 12px;
  position: relative;
  align-items: flex-start;
}

/* User messages - reversed layout */
.chat-message-user {
  flex-direction: row-reverse;
}

/* AI messages - standard layout */
.chat-message-assistant {
  flex-direction: row;
}
```

**Key Properties**:
- **Container**: `display: flex`, 16px vertical margin, 12px gap
- **Alignment**: `align-items: flex-start` for avatar positioning
- **Role differentiation**: `flex-direction` reversal for user messages
- **Positioning**: `position: relative` for absolute child elements

### 1.2 Message Content Wrapper

**Pattern**: Flexible content container with max-width constraints

```css
.message-content-wrapper {
  flex: 1;
  min-width: 0;
  max-width: calc(100% - 120px);
}
```

**Key Properties**:
- **Flexibility**: `flex: 1` to fill available space
- **Text overflow**: `min-width: 0` enables text wrapping
- **Responsive limit**: `max-width` prevents excessive line lengths

### 1.3 Message Bubble Styling

**Pattern**: Rounded content containers with role-specific styling

```css
.message-bubble {
  padding: 12px 16px;
  border-radius: 18px;
  position: relative;
  word-wrap: break-word;
  transition: all 0.2s ease;
}

/* User bubble - distinct corner */
.message-bubble-user {
  border-bottom-right-radius: 6px;
  background: var(--background-primary);
  border: 2px solid var(--background-modifier-border);
}

/* AI bubble - distinct corner */
.message-bubble-assistant {
  border-bottom-left-radius: 6px;
  background: var(--background-secondary);
  border: 1px solid var(--background-modifier-border);
}
```

**Key Properties**:
- **Padding**: 12px vertical, 16px horizontal
- **Border radius**: 18px with role-specific corner adjustments
- **Transitions**: 0.2s ease for smooth hover effects
- **Text handling**: `word-wrap: break-word`

### 1.4 Message Actions Layout

**Pattern**: Aligned action buttons below message content

```css
.writerr-message-actions {
  display: flex;
  gap: 4px;
  margin-top: 6px;
  opacity: 1;
}

/* User message actions - right aligned */
.message-user .writerr-message-actions {
  justify-content: flex-end;
}

/* AI message actions - left aligned */
.message-assistant .writerr-message-actions {
  justify-content: flex-start;
}
```

**Key Properties**:
- **Layout**: Horizontal flex with 4px gaps
- **Spacing**: 6px top margin from message content
- **Alignment**: Role-specific justification
- **Visibility**: Always visible (opacity: 1)

## 2. Toolbar Layout Patterns

### 2.1 Horizontal Toolbar Structure

**Pattern**: Space-between layout with grouped controls

```css
.toolbar-container {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-top: 1px solid var(--background-modifier-border);
  background: var(--background-secondary);
  font-size: 12px;
  color: var(--text-muted);
  min-height: 40px;
  box-sizing: border-box;
}
```

**Key Properties**:
- **Layout**: Flex with centered alignment and 12px gaps
- **Spacing**: 8px vertical, 12px horizontal padding
- **Height**: 40px minimum height for consistent sizing
- **Typography**: 12px font size for compact information

### 2.2 Toolbar Section Grouping

**Pattern**: Logical grouping with flex spacers

```css
/* Left section - action buttons */
.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Spacer element */
.toolbar-spacer {
  flex: 1;
  min-width: 20px;
}

/* Right section - controls */
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}
```

**Key Properties**:
- **Section grouping**: Separate containers for logical groups
- **Spacer pattern**: `flex: 1` with minimum width
- **Right section**: `flex-shrink: 0` prevents compression

### 2.3 Toolbar Button Layout

**Pattern**: Consistent button sizing and spacing

```css
.writerr-toolbar-button {
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
}
```

**Key Properties**:
- **Sizing**: Fixed 28x28px dimensions
- **Spacing**: 6px padding within button
- **Layout**: Flex centering for icon alignment
- **Interaction**: 0.2s transition for hover effects

### 2.4 Dropdown Button Pattern

**Pattern**: Text buttons with caret indicators

```css
.toolbar-dropdown {
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
}

.toolbar-dropdown-caret {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: var(--text-faint);
}
```

**Key Properties**:
- **Padding**: Asymmetric to accommodate caret (6px-24px-6px-8px)
- **Text handling**: Ellipsis overflow with 140px max-width
- **Caret positioning**: Absolute right positioning with vertical centering

## 3. Container Layout Patterns

### 3.1 Collapsible Section Pattern

**Pattern**: Smooth expand/collapse with header controls

```css
.collapsible-container {
  transition: all 0.3s ease;
  overflow: visible;
  border-top: 1px solid var(--background-modifier-border);
  width: 100%;
  box-sizing: border-box;
  position: relative;
}

.collapsible-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  cursor: pointer;
}

.collapsible-content {
  padding: 0 16px 12px 16px;
  transition: all 0.3s ease;
  /* Dynamic height based on collapse state */
}

/* Collapsed state */
.collapsed .collapsible-content {
  height: 0;
  padding: 0 16px;
  overflow: hidden;
  opacity: 0;
}

/* Expanded state */
.expanded .collapsible-content {
  height: auto;
  overflow: visible;
  opacity: 1;
}
```

**Key Properties**:
- **Transitions**: 0.3s ease for smooth state changes
- **Header layout**: Space-between with 8px vertical, 16px horizontal padding
- **Content padding**: Consistent 16px horizontal, variable vertical
- **State management**: Height, overflow, and opacity transitions

### 3.2 Header Section Layout

**Pattern**: Left-right justified header with grouped controls

```css
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--background-modifier-border);
  height: 60px;
  background: var(--background-primary);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.header-right {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
```

**Key Properties**:
- **Overall layout**: Space-between with 60px fixed height
- **Section grouping**: Left section flexible, right section fixed
- **Spacing**: 16px padding, 8px internal gaps

### 3.3 Grid-Based Chip Layout

**Pattern**: Responsive grid for content chips

```css
.chip-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 180px));
  gap: 8px;
  width: 100%;
  padding: 0 16px 12px 16px;
  transition: all 0.3s ease;
  position: relative;
  box-sizing: border-box;
}

.content-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: var(--background-primary);
  border: 1px solid var(--background-modifier-border);
  border-radius: 16px;
  font-size: 12px;
  transition: all 0.2s ease;
  box-sizing: border-box;
  width: 100%;
  min-height: 32px;
}
```

**Key Properties**:
- **Grid system**: `auto-fit` with 120-180px column range
- **Spacing**: 8px grid gaps, 16px container padding
- **Chip layout**: Horizontal flex with 6px internal gaps
- **Sizing**: 32px minimum height, 16px border radius

## 4. List and Container Patterns

### 4.1 Scrollable List Container

**Pattern**: Flexible scrollable area with custom styling

```css
.scrollable-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  min-height: 0;
  scroll-behavior: smooth;
  position: relative;
}

/* Custom scrollbar styling */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb-bg);
  border-radius: 3px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  opacity: 1;
}
```

**Key Properties**:
- **Flex behavior**: `flex: 1` to fill available space
- **Overflow**: Vertical scroll with smooth behavior
- **Scrollbar**: Custom 6px width with fade-in effect
- **Spacing**: 20px padding for comfortable content margins

### 4.2 Empty State Layout

**Pattern**: Centered placeholder content

```css
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  padding: 40px 20px;
  color: var(--text-muted);
  gap: 16px;
}

.empty-state-icon {
  color: var(--text-faint);
  opacity: 0.6;
}

.empty-state-title {
  font-size: 18px;
  font-weight: 500;
  margin: 0;
  color: var(--text-muted);
}

.empty-state-description {
  font-size: 14px;
  margin: 0;
  max-width: 300px;
  line-height: 1.5;
  color: var(--text-faint);
}
```

**Key Properties**:
- **Centering**: Both horizontal and vertical centering
- **Spacing**: 16px gap between elements, 40px vertical padding
- **Typography**: Hierarchical sizing (18px title, 14px description)
- **Content width**: 300px max-width for comfortable reading

## 5. Interactive Element Patterns

### 5.1 Button Group Layout

**Pattern**: Horizontally arranged action buttons

```css
.button-group {
  display: flex;
  gap: 4px;
  margin-top: 6px;
}

.action-button {
  background: transparent;
  border: none;
  box-shadow: none;
  padding: 4px;
  border-radius: 4px;
  cursor: pointer;
  color: var(--text-faint);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  width: 24px;
  height: 24px;
  opacity: 0.6;
}
```

**Key Properties**:
- **Spacing**: 4px gaps between buttons, 6px top margin
- **Button sizing**: Fixed 24x24px dimensions
- **Visual state**: 0.6 opacity default, transitions on interaction
- **Layout**: Flex centering for icon alignment

### 5.2 Hover Effect Patterns

**Pattern**: Consistent hover interactions

```css
/* Standard hover effect implementation */
.hoverable-element:hover {
  background-color: var(--background-modifier-hover);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border-color: var(--background-modifier-border-hover);
}

/* Button hover effects */
.interactive-button:hover {
  color: var(--text-muted);
  opacity: 1;
}

/* Card hover effects */
.content-card:hover {
  background-color: var(--background-secondary);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
```

**Key Properties**:
- **Elevation**: `translateY(-1px)` for subtle lift effect
- **Shadows**: Progressive shadow intensities for depth
- **Color transitions**: Semantic color changes for state indication
- **Timing**: Consistent 0.2s ease transitions

## 6. Responsive Layout Patterns

### 6.1 Adaptive Container Sizing

**Pattern**: Flexible containers that respond to content

```css
.adaptive-container {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  position: relative;
}

/* Content-based height adjustment */
.dynamic-height {
  height: auto;
  transition: height 0.3s ease;
}

/* Collapsed state */
.dynamic-height.collapsed {
  height: 0;
  overflow: hidden;
}
```

**Key Properties**:
- **Width management**: Full width with box-sizing control
- **Height transitions**: Smooth height changes with overflow management
- **State classes**: Semantic class-based state management

### 6.2 Progressive Disclosure Patterns

**Pattern**: Content revelation based on user interaction

```css
.progressive-container {
  transition: all 0.3s ease;
  overflow: visible;
}

.disclosure-trigger {
  cursor: pointer;
  transition: all 0.2s ease;
}

.disclosure-content {
  transition: all 0.3s ease;
  opacity: 1;
  transform: translateY(0);
}

.disclosure-content.hidden {
  opacity: 0;
  transform: translateY(-10px);
  height: 0;
  overflow: hidden;
}
```

**Key Properties**:
- **Animation timing**: 0.3s for content, 0.2s for triggers
- **Transform patterns**: Y-axis translation for smooth reveals
- **Opacity management**: Fade effects combined with transforms

## Implementation Guidelines

### 1. CSS Custom Properties

Use semantic CSS custom properties for consistent theming:

```css
/* Spacing system */
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 12px;
--spacing-lg: 16px;
--spacing-xl: 20px;

/* Layout dimensions */
--toolbar-height: 40px;
--header-height: 60px;
--button-size-sm: 24px;
--button-size-md: 28px;

/* Transition timings */
--transition-fast: 0.2s ease;
--transition-standard: 0.3s ease;
```

### 2. Layout Composition

Layer layout patterns systematically:

1. **Container level**: Establish primary flex/grid contexts
2. **Section level**: Define spacing and grouping
3. **Component level**: Apply specific sizing and positioning
4. **Interactive level**: Add hover and transition effects

### 3. Responsive Considerations

- Use `min-width: 0` for flex items that need text ellipsis
- Implement `box-sizing: border-box` for predictable sizing
- Apply `overflow: hidden` during transitions to prevent layout shifts
- Use `position: relative` for containers with absolute children

### 4. Performance Optimizations

- Prefer `transform` over changing layout properties for animations
- Use `will-change` sparingly for complex animations
- Implement `transition` properties on specific properties rather than `all`
- Leverage CSS Grid for complex layouts, Flexbox for simpler arrangements

## Testing and Validation

### Layout Testing Checklist

- [ ] Container overflow behavior in various content states
- [ ] Responsive behavior at different viewport sizes
- [ ] Transition smoothness during state changes
- [ ] Text overflow and ellipsis functionality
- [ ] Hover and focus state accessibility
- [ ] Cross-browser scrollbar styling compatibility

### Accessibility Considerations

- Ensure adequate spacing for touch targets (minimum 44px)
- Maintain sufficient color contrast for interactive elements
- Provide clear focus indicators for keyboard navigation
- Support reduced motion preferences in transitions

---

*This layout pattern library serves as the foundation for consistent spatial design across the Writerr Platform. All new components should reference these patterns to maintain design system coherence.*