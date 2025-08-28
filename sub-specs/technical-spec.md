# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/[FOLDER]/spec.md

> Created: 2025-08-28
> Version: 1.0.0

## Technical Requirements

### Phase 1: Deviation Audit (CRITICAL FIRST STEP)

**Comprehensive Analysis of Current Chat Deviations from Obsidian Standards:**

**Visual Deviations to Document:**
- Border radius values (12px vs Obsidian defaults)
- Custom spacing patterns (8px, 12px, 16px vs theme spacing)
- Hardcoded font sizes and weights
- Color choices that differ from theme variables
- Shadow and elevation effects
- Animation timing and easing functions

**Functional Deviations to Document:**
- Auto-resize textarea behavior vs standard inputs
- Custom keyboard shortcuts and event handling
- Hover effect implementations
- Focus state management
- Loading state animations

**Component-Specific Deviations:**
- **ChatInput**: Border styling, padding, auto-resize logic
- **MessageBubble**: Role-based styling, corner radius, spacing
- **ContextArea**: Chip design, grid layout, clear button positioning
- **ChatHeader**: Dropdown styling, toolbar button design
- **Tooltips**: Positioning, timing, styling approach

**Decision Framework:**
For each deviation, categorize as:
- ✅ **CONFORM** - Theme integration improves experience (fonts, basic colors)
- 🤔 **EVALUATE** - Functional benefit vs theme consistency (border radius, spacing)
- ❌ **PRESERVE** - Custom behavior is superior (auto-resize, keyboard shortcuts)

**Deliverable**: Comprehensive audit document with recommendations for each identified deviation before any implementation begins.

## Implementation Requirements

### Font System Conformance
- Replace `font-family: inherit` with `var(--font-interface)` across all components
- Replace `font-size: 14px` with `var(--font-text-size)` for standard text elements
- Apply `var(--font-ui-small)` for secondary text elements (timestamps, metadata)
- Use `var(--font-ui-medium)` for primary interface text (buttons, headers)
- Ensure font weight consistency using `var(--font-weight-normal)` and `var(--font-weight-bold)`

### Color System Updates
**Text Colors:**
- Primary text: `var(--text-normal)`
- Secondary text: `var(--text-muted)` 
- Tertiary text: `var(--text-faint)`
- Error states: `var(--text-error)`
- Success states: `var(--text-success)`

**Background Colors:**
- Primary backgrounds: `var(--background-primary)`
- Secondary backgrounds: `var(--background-secondary)`
- Modal/overlay backgrounds: `var(--background-modifier-cover)`

**Border Colors:**
- Standard borders: `var(--background-modifier-border)`
- Hover borders: `var(--background-modifier-border-hover)`
- Focus borders: `var(--background-modifier-border-focus)`

**Interactive Colors:**
- Accent elements: `var(--interactive-accent)`
- Hover states: `var(--interactive-hover)`
- Active states: `var(--interactive-active)`

### Spacing Integration
- Use `var(--size-4-1)` (4px) for tight spacing
- Use `var(--size-4-2)` (8px) for small spacing
- Use `var(--size-4-3)` (12px) for medium spacing
- Use `var(--size-4-4)` (16px) for large spacing
- Maintain current functional spacing where no theme equivalent exists
- Apply consistent padding using Obsidian size variables

### Component-Specific Updates

**ChatInput Component:**
- Input background: `var(--background-primary)`
- Input border: `var(--background-modifier-border)`
- Focus border: `var(--interactive-accent)`
- Text color: `var(--text-normal)`
- Placeholder text: `var(--text-muted)`

**MessageBubble Component:**
- User message background: `var(--interactive-accent)` with opacity
- Assistant message background: `var(--background-secondary)`
- Message text: `var(--text-normal)`
- Timestamp text: `var(--text-muted)`
- Border radius: maintain current 12px for design consistency

**ContextArea Component:**
- Container background: `var(--background-secondary)`
- Chip background: `var(--background-modifier-hover)`
- Chip text: `var(--text-normal)`
- Chip border: `var(--background-modifier-border)`
- Active chip accent: `var(--interactive-accent)`

**ChatHeader Component:**
- Header background: `var(--background-primary)`
- Dropdown button background: `var(--background-secondary)`
- Dropdown hover: `var(--interactive-hover)`
- Toolbar button colors: `var(--text-muted)` default, `var(--text-normal)` hover

**Tooltip System:**
- Tooltip background: `var(--background-tooltip)`
- Tooltip text: `var(--text-on-accent)`
- Tooltip border: `var(--background-modifier-border)`

## Approach

### CSS Variable Integration Strategy
1. **BaseComponent Enhancement:**
   - Update createElement() helper method to automatically apply theme variables
   - Maintain CSS-in-JS template literal approach for component styling
   - Create theme variable mapping utility for consistent usage

2. **Progressive Migration:**
   - Phase 1: Core text and background colors
   - Phase 2: Interactive states and borders
   - Phase 3: Spacing and typography refinements
   - Phase 4: Component-specific customizations

3. **Backwards Compatibility:**
   - Maintain fallback values for older Obsidian versions
   - Use CSS custom property fallbacks: `var(--theme-var, fallback-value)`
   - Preserve existing hover effects and 0.2s ease transitions

### Implementation Pattern
```typescript
// Before
const styles = `
  background: #ffffff;
  color: #000000;
  font-size: 14px;
`;

// After
const styles = `
  background: var(--background-primary);
  color: var(--text-normal);
  font-size: var(--font-text-size);
`;
```

### Cross-Theme Testing Requirements
- **Core Themes:** Light/dark theme compatibility verification
- **Popular Community Themes:** 
  - Minimal Theme
  - Things Theme
  - California Coast Theme
  - Obsidian Nord
- **Accessibility Themes:** High contrast theme support
- **Custom Themes:** Ensure graceful degradation with unknown themes

### Performance Considerations
- No impact on existing component performance
- CSS variable resolution is native browser functionality
- Maintain current component lifecycle and rendering patterns
- No additional JavaScript overhead for theme integration

## External Dependencies

**NO EXTERNAL DEPENDENCIES REQUIRED**

This implementation uses:
- Existing Obsidian CSS custom properties (built-in)
- Current component architecture and BaseComponent system
- Existing CSS-in-JS styling approach
- Native browser CSS variable support

### Obsidian API Dependencies
- Uses standard Obsidian theme CSS variables (available in all modern versions)
- No additional Obsidian API calls required
- Compatible with existing plugin architecture

### Browser Compatibility
- CSS Custom Properties support (IE11+, all modern browsers)
- No polyfills required for target Obsidian environment
- Fallback values ensure compatibility across browser versions