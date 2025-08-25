# Obsidian-Style Interface UI/UX Specification

## Overview

This document defines the UI/UX patterns for an Obsidian-inspired interface system built with React, TypeScript, and Tailwind CSS v4. The design philosophy emphasizes clean minimalism, avoiding "design for design's sake" with minimal backgrounds and borders, using outline-style icons and transparent dropdowns throughout.

## Design Principles

### Core Philosophy
- **Minimal Design**: Clean interface with minimal backgrounds and borders
- **Functional Focus**: Every element serves a purpose, no decorative elements
- **Consistency**: Unified patterns across all components
- **Native Feel**: Interface behaviors that match user expectations
- **Accessibility**: Proper tooltips, keyboard navigation, and screen reader support

### Visual Language
- **Colors**: Light mode focused with muted grays and subtle accents
- **Typography**: 14px base font size, consistent font weights (400 normal, 500 medium)
- **Spacing**: Consistent padding/margin scale (12px base unit)
- **Borders**: Minimal use, `rgba(0, 0, 0, 0.1)` for light separators
- **Radius**: `0.625rem` (10px) for consistent rounded corners
- **Icons**: 16px (size-4) for most interface icons, outline style preferred

---

## 1. Track Edits Panel

### Purpose
A side panel for managing document revisions, changes, and collaborative editing features.

### Layout Structure
```
┌─ Track Edits Panel ────────────┐
│ Header                         │
├────────────────────────────────┤
│ Filter/View Controls           │
├────────────────────────────────┤
│ Changes List (Scrollable)      │
│ ├─ Change Item 1               │
│ ├─ Change Item 2               │
│ └─ Change Item N               │
├────────────────────────────────┤
│ Footer Actions                 │
└────────────────────────────────┘
```

### Header Component
- **Height**: 60px (consistent with chat panel header)
- **Background**: `bg-background` with bottom border `border-border`
- **Layout**: Flex row with title left, controls right
- **Title**: "Track Edits" with edit count badge
- **Controls**: Close button (X icon, ghost variant)

```tsx
interface TrackEditsHeaderProps {
  editCount: number;
  onClose: () => void;
}
```

### Filter Controls
- **Height**: 48px
- **Background**: Transparent with bottom border separator
- **Controls**:
  - View Mode Toggle: `["All", "Pending", "Accepted", "Rejected"]`
  - Author Filter: Dropdown with user avatars
  - Date Range: Dropdown with presets
- **Style**: Transparent dropdowns matching existing pattern

### Change Item Component
- **Height**: Variable (min 64px)
- **Background**: Transparent with hover state `hover:bg-accent/50`
- **Border**: Bottom border `border-border` except last item
- **Layout**:
  ```
  ┌─ Change Item ──────────────────┐
  │ [Avatar] Author Name | Time    │
  │          Change Description    │
  │          [Accept] [Reject]     │
  └────────────────────────────────┘
  ```

### Change Types
1. **Text Addition**: Green left border, plus icon
2. **Text Deletion**: Red left border, minus icon  
3. **Text Modification**: Blue left border, edit icon
4. **Comment**: Yellow left border, message icon

### States
- **Pending**: Default state with action buttons
- **Accepted**: Green checkmark, muted colors
- **Rejected**: Red X, strikethrough text
- **Hover**: Subtle background highlight

### Footer Actions
- **Height**: 48px
- **Background**: Transparent with top border
- **Actions**: "Accept All", "Reject All", "Export Changes"
- **Style**: Small buttons, secondary variant

---

## 2. Vault Folder Interface

### Purpose  
File browser panel mimicking Obsidian's vault navigation with folder tree structure.

### Layout Structure
```
┌─ Vault Folder Panel ──────────┐
│ Header with Search             │
├────────────────────────────────┤
│ Quick Actions Bar              │
├────────────────────────────────┤
│ Folder Tree (Scrollable)       │
│ ├─ 📁 Daily                    │
│ │  ├─ 📄 Meeting Notes.md      │
│ │  └─ 📄 Standup.md            │
│ ├─ 📁 Projects                 │
│ └─ 📄 README.md                │
├────────────────────────────────┤
│ Footer Info                    │
└────────────────────────────────┘
```

### Header Component
- **Height**: 60px
- **Elements**:
  - Title: "Vault" with folder count
  - Search Input: `border-none bg-input-background` 
  - View Toggle: List/Grid icons
- **Search**: Real-time filtering with highlight matches

### Quick Actions Bar
- **Height**: 40px  
- **Background**: `bg-muted/20` with subtle border
- **Actions**:
  - New File: `FileText` icon
  - New Folder: `Folder` icon  
  - Import: `Upload` icon
  - Settings: `Settings` icon
- **Style**: Icon-only buttons with tooltips

### Folder Tree Component
- **Item Height**: 32px for files, 36px for folders
- **Indentation**: 16px per level with connecting lines
- **Icons**: 
  - Folders: `Folder` (closed) / `FolderOpen` (expanded)
  - Files: `FileText` or type-specific icons
- **Interaction**:
  - Click folder: Expand/collapse
  - Click file: Open/select
  - Right-click: Context menu
  - Drag & drop: Move files/folders

### Tree Item States
- **Default**: Standard colors
- **Hover**: `hover:bg-accent/50` background
- **Selected**: `bg-accent` background, `text-accent-foreground`
- **Modified**: Orange dot indicator
- **Syncing**: Animated sync icon

### Context Menu
- **Triggers**: Right-click on items
- **File Actions**: Open, Rename, Delete, Copy Path, Show in Finder
- **Folder Actions**: Expand All, Collapse All, New File, New Folder
- **Style**: Standard dropdown menu component

### Footer Info
- **Height**: 32px
- **Content**: File count, last sync time
- **Style**: Small muted text, right-aligned

---

## 3. Obsidian Ribbon, Headers & Footers

### Ribbon (Left Sidebar)
Vertical navigation bar with core Obsidian functions.

#### Structure
```
┌─ Ribbon ─┐
│ 🏠 Home  │
│ 📁 Files │ 
│ 🔍 Search│
│ 📝 Graph │
│ ⭐ Bookm.│
│ 🔧 Sett. │
│          │
│ [User]   │
└──────────┘
```

#### Specifications
- **Width**: 56px (collapsed) / 240px (expanded)
- **Background**: `bg-sidebar` with border-right
- **Items**: 48px height, centered icons
- **Icons**: 20px (size-5) for better visibility
- **States**: 
  - Default: Subtle icon color
  - Hover: `hover:bg-sidebar-accent`
  - Active: `bg-sidebar-primary text-sidebar-primary-foreground`

#### Core Ribbon Items
1. **Files** (`Files` icon): Opens vault folder panel
2. **Search** (`Search` icon): Global search interface  
3. **Graph** (`Network` icon): Note connections view
4. **Quick Switcher** (`Command` icon): File/command picker
5. **Settings** (`Settings` icon): Preferences panel
6. **User Profile** (Avatar): Account & sync settings

### Application Header
Global header for the entire application.

#### Structure
```
┌─ Application Header ─────────────────────────────────────────┐
│ [🏠] Obsidian | Workspace Name        [🔔] [🌙] [◐] [👤] │
└──────────────────────────────────────────────────────────────┘
```

#### Specifications
- **Height**: 64px
- **Background**: `bg-background` with bottom border
- **Layout**: Logo/title left, controls right
- **Items**:
  - App Logo/Name: Bold text, 18px
  - Workspace Name: Muted text with dropdown
  - Notifications: Bell icon with badge
  - Theme Toggle: Sun/Moon icons
  - Window Controls: Minimize, maximize, close
  - User Avatar: Profile dropdown

### Panel Headers
Consistent header pattern for all panels (chat, track edits, vault, etc.).

#### Standard Pattern
```tsx
interface PanelHeaderProps {
  title: string;
  subtitle?: string; 
  badge?: number;
  controls?: React.ReactNode;
  onClose?: () => void;
}
```

#### Specifications
- **Height**: 60px
- **Padding**: 16px horizontal
- **Border**: Bottom border `border-border`
- **Title**: Medium weight, 16px font
- **Badge**: Secondary variant, small size
- **Controls**: Right-aligned icon buttons

### Application Footer
Global status and information bar.

#### Structure  
```
┌─ Footer ────────────────────────────────────────────────────┐
│ 📊 Status Info    🔄 Sync Status    📱 Device Info    ⚡ Api │
└──────────────────────────────────────────────────────────────┘
```

#### Specifications
- **Height**: 28px
- **Background**: `bg-muted/30` with top border
- **Font**: 12px, muted colors
- **Sections**:
  - Left: Document/vault stats
  - Center: Sync status with icon
  - Right: API status, performance info

---

## Common Patterns & Components

### Dropdown Menus
- **Background**: `bg-popover` with border
- **Items**: 32px height, 12px padding
- **Hover**: `hover:bg-accent` background
- **Icons**: 16px, left-aligned with 8px gap
- **No Labels**: Clean, icon + text only
- **Separators**: `bg-border` 1px lines

### Icon Buttons
- **Size**: 32px (size-8) standard
- **Style**: Ghost variant default
- **Hover**: Subtle background change
- **Active**: Accent colors
- **Tooltips**: Always present for icon-only buttons

### Loading States
- **Skeleton**: `bg-muted` with pulse animation
- **Spinners**: 16px for inline, 24px for panels
- **Progress**: Linear bars for file operations

### Error States  
- **Colors**: `text-destructive` for errors
- **Icons**: Triangle warning or X circle
- **Actions**: Retry buttons where applicable

### Empty States
- **Icon**: Large muted icon (48px)
- **Title**: Medium weight, 18px
- **Description**: Muted text, 14px
- **Action**: Primary button when applicable

---

## Implementation Guidelines

### Responsive Behavior
- **Mobile**: Stack panels vertically, hide ribbon
- **Tablet**: Collapsible panels, abbreviated ribbon  
- **Desktop**: Full multi-panel layout

### Keyboard Navigation
- **Tab Order**: Logical left-to-right, top-to-bottom
- **Focus Indicators**: Subtle ring around focused elements
- **Shortcuts**: Standard Obsidian hotkeys where applicable

### Performance Considerations
- **Virtualization**: For large file lists (>100 items)
- **Lazy Loading**: Panel content loaded on demand
- **Debounced Search**: 300ms delay for search inputs
- **Memoization**: Expensive calculations cached

### Accessibility
- **ARIA Labels**: All interactive elements
- **Screen Reader**: Proper announcements for state changes
- **Color Contrast**: WCAG AA compliance
- **Keyboard Only**: Full functionality without mouse

### Animation Guidelines
- **Duration**: 150ms for micro-interactions, 300ms for panels
- **Easing**: `ease-out` for entrances, `ease-in` for exits
- **Reduced Motion**: Respect user preferences
- **Purposeful**: Only animate meaningful state changes

---

## Technical Specifications

### Required Dependencies
```json
{
  "react": "^18.0.0",
  "lucide-react": "latest",
  "tailwindcss": "^4.0.0",
  "@radix-ui/react-*": "latest"
}
```

### File Structure
```
/components
  /panels
    - TrackEditsPanel.tsx
    - VaultFolderPanel.tsx
  /layout  
    - AppHeader.tsx
    - AppFooter.tsx
    - Ribbon.tsx
  /common
    - PanelHeader.tsx
    - EmptyState.tsx
    - LoadingState.tsx
```

### State Management
- **Local State**: useState for component-specific data
- **Global State**: Context/reducer for cross-panel data
- **Persistence**: localStorage for user preferences
- **Sync**: Real-time updates via WebSocket/SSE

This specification provides a comprehensive foundation for implementing a consistent, usable Obsidian-inspired interface while maintaining the established design patterns and technical architecture.