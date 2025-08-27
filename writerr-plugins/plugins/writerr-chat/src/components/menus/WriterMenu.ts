import { Menu, MenuItem, Component } from 'obsidian';

/**
 * WriterMenu - Unified menu system for Writerr Platform
 * 
 * A wrapper around Obsidian's native Menu class providing:
 * - Consistent theming and behavior across all menus
 * - Support for nested hierarchies and separators  
 * - Fluent API for easy menu construction
 * - Proper keyboard navigation and accessibility
 * - Extension points for platform-specific features
 */

export interface WriterMenuOptions {
  className?: string;
  minWidth?: number;
  maxHeight?: number;
  style?: 'default' | 'refined' | 'minimal';
  spacing?: 'compact' | 'comfortable' | 'spacious';
}

export interface WriterMenuItem {
  title: string;
  icon?: string;
  disabled?: boolean;
  checked?: boolean;
  submenu?: WriterMenuItem[];
  callback?: () => void;
  separator?: boolean;
}

export class WriterMenu {
  private menu: Menu;
  private options: WriterMenuOptions;
  private currentSelection?: string;
  private lastShowPosition?: { x: number; y: number };

  constructor(options: WriterMenuOptions = {}) {
  this.menu = new Menu();
  this.options = {
    style: 'refined',
    spacing: 'comfortable',
    minWidth: 280,
    ...options
  };
  
  // Build refined class names
  const styleClass = `writerr-menu-${this.options.style}`;
  const spacingClass = `writerr-menu-${this.options.spacing}`;
  const customClass = this.options.className || '';
  
  this.options.className = [styleClass, spacingClass, customClass]
    .filter(Boolean)
    .join(' ');
    
  // Only hook styling on main menus, not submenus
  const isSubmenu = customClass.includes('writerr-submenu');
  if (!isSubmenu) {
    // Hook into menu show events to apply clean styling
    const originalShow = this.menu.showAtMouseEvent.bind(this.menu);
    const originalShowAtPosition = this.menu.showAtPosition.bind(this.menu);
    
    this.menu.showAtMouseEvent = (event: MouseEvent) => {
      const result = originalShow(event);
      this.applyRefinedStyling();
      return result;
    };
    
    this.menu.showAtPosition = (position: { x: number; y: number }) => {
      const result = originalShowAtPosition(position);
      this.applyRefinedStyling();
      return result;
    };
  }
}
  /**
   * Enhanced debug method to identify actual menu DOM elements
   */
  private applyRefinedStyling(): void {
  // Remove all the crazy JavaScript styling - let CSS snippets handle it
  console.log('🎨 Menu styling removed - using clean defaults');
}


  /**
   * Add a menu item with optional callback
   */
  addItem(title: string, callback?: () => void): WriterMenu {
    this.menu.addItem((item: MenuItem) => {
      item.setTitle(title);
      if (callback) {
        item.onClick(callback);
      }
      
      // Note: Highlighting will be handled by Obsidian's native menu selection
    });
    return this;
  }

  /**
   * Add a menu item with an icon
   */
  addItemWithIcon(title: string, icon?: string, callback?: () => void): WriterMenu {
    this.menu.addItem((item: MenuItem) => {
      item.setTitle(title);
      if (icon) {
        item.setIcon(icon);
      }
      if (callback) {
        item.onClick(callback);
      }
    });
    return this;
  }

  /**
   * Add a checked menu item (for current selections)
   */
  addCheckedItem(title: string, checked: boolean = false, callback?: () => void): WriterMenu {
    this.menu.addItem((item: MenuItem) => {
      item.setTitle(title);
      if (checked) {
        item.setChecked(true);
      }
      if (callback) {
        item.onClick(callback);
      }
    });
    return this;
  }

  /**
   * Add a submenu with nested items (simplified for now)
   * Note: Full nested submenus may require a different approach with Obsidian's API
   */
  /**
   * Add a submenu with nested items using Obsidian's native setSubmenu() API
   */
  addSubmenu(title: string, builder: (submenu: WriterMenu) => void): WriterMenu {
  this.menu.addItem((item: MenuItem) => {
    item.setTitle(title);
    
    // Use Obsidian's native submenu API
    const obsidianSubmenu = item.setSubmenu();
    
    // Create WriterMenu wrapper for the submenu
    const writerSubmenu = new WriterMenu({
      ...this.options,
      className: `${this.options.className || ''} writerr-submenu`.trim()
    });
    
    // Replace the wrapper's menu with the actual Obsidian submenu
    writerSubmenu.menu = obsidianSubmenu;
    
    // Build submenu items
    builder(writerSubmenu);
    
    // Fix submenu positioning to not cover parent menu
    setTimeout(() => {
      const submenuElement = (writerSubmenu.menu as any).dom;
      if (submenuElement instanceof HTMLElement) {
        // Force submenu to appear to the right of parent, not overlapping
        submenuElement.style.setProperty('position', 'absolute', 'important');
        submenuElement.style.setProperty('left', '100%', 'important');
        submenuElement.style.setProperty('top', '0', 'important');
        submenuElement.style.setProperty('margin-left', '2px', 'important');
        console.log('🔧 Fixed submenu positioning to prevent overlap');
      }
    }, 0);
  });
  
  return this;
}

  /**
   * Add a separator line
   */
  addSeparator(): WriterMenu {
    this.menu.addSeparator();
    return this;
  }

  /**
   * Add a disabled item (for category headers or unavailable options)
   */
  addDisabledItem(title: string): WriterMenu {
    this.menu.addItem((item: MenuItem) => {
      item.setTitle(title);
      item.setDisabled(true);
      // Note: Disabled styling will be handled by Obsidian's native disabled state
    });
    return this;
  }

  /**
   * Set the currently selected item (will be highlighted)
   */
  setCurrentSelection(selection: string): WriterMenu {
    this.currentSelection = selection;
    return this;
  }

  /**
   * Show menu at mouse cursor position
   */
  /**
   * Show menu at mouse cursor position
   */
  showAtMouseEvent(event: MouseEvent): void {
    this.lastShowPosition = { x: event.clientX, y: event.clientY };
    this.menu.showAtMouseEvent(event);
  }

  /**
   * Show menu at a specific position
   */
  /**
   * Show menu at a specific position
   */
  showAtPosition(x: number, y: number): void {
    this.lastShowPosition = { x, y };
    this.menu.showAtPosition({ x, y });
  }

  /**
   * Show menu relative to an element
   */
  showAtElement(element: HTMLElement, options?: {
    placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end' | 'right-start' | 'right-end';
    offset?: { x: number; y: number };
  }): void {
    const rect = element.getBoundingClientRect();
    const placement = options?.placement || 'bottom-start';
    const offset = options?.offset || { x: 0, y: 0 };
    
    let x = rect.left + offset.x;
    let y = rect.bottom + offset.y;
    
    switch (placement) {
      case 'bottom-start':
        x = rect.left + offset.x;
        y = rect.bottom + offset.y;
        break;
      case 'bottom-end':
        x = rect.right + offset.x;
        y = rect.bottom + offset.y;
        break;
      case 'top-start':
        x = rect.left + offset.x;
        y = rect.top + offset.y;
        break;
      case 'top-end':
        x = rect.right + offset.x;
        y = rect.top + offset.y;
        break;
      case 'right-start':
        x = rect.right + offset.x;
        y = rect.top + offset.y;
        break;
      case 'right-end':
        x = rect.right + offset.x;
        y = rect.bottom + offset.y;
        break;
    }
    
    this.menu.showAtPosition({ x, y });
  }

  /**
   * Hide the menu
   */
  hide(): void {
    this.menu.hide();
  }

  /**
   * Get the underlying Obsidian Menu instance (for advanced usage)
   */
  getObsidianMenu(): Menu {
    return this.menu;
  }

  /**
   * Get the current menu position (helper for submenu positioning)
   */
  private getMenuPosition(): { x: number; y: number } | null {
    return this.lastShowPosition || null;
  }

  /**
   * Static helper to create a menu from a configuration object
   */
  static fromConfig(items: WriterMenuItem[], options?: WriterMenuOptions): WriterMenu {
    const menu = new WriterMenu(options);
    
    const buildItems = (menuItems: WriterMenuItem[], targetMenu: WriterMenu) => {
      for (const item of menuItems) {
        if (item.separator) {
          targetMenu.addSeparator();
        } else if (item.submenu) {
          targetMenu.addSubmenu(item.title, (submenu) => {
            buildItems(item.submenu!, submenu);
          });
        } else if (item.disabled) {
          targetMenu.addDisabledItem(item.title);
        } else if (item.icon) {
          targetMenu.addItemWithIcon(item.title, item.icon, item.callback);
        } else {
          targetMenu.addItem(item.title, item.callback);
        }
      }
    };
    
    buildItems(items, menu);
    return menu;
  }
}

/**
 * Factory functions for common menu types
 */
export class WriterMenuFactory {
  
  /**
   * Create a model selection menu with Provider → Family → Model hierarchy
   */
  /**
   * Create a model selection menu with Provider → Family → Model hierarchy
   */
  static createModelMenu(
    providers: Record<string, Record<string, string[]>>,
    currentSelection?: string,
    onSelect?: (provider: string, model: string) => void
  ): WriterMenu {
    const menu = new WriterMenu({ 
      style: 'refined',
      spacing: 'comfortable',
      className: 'writerr-model-menu'
    });
    
    if (currentSelection) {
      menu.setCurrentSelection(currentSelection);
    }
    
    for (const [providerName, families] of Object.entries(providers)) {
      menu.addSubmenu(providerName, (providerSubmenu) => {
        for (const [familyName, models] of Object.entries(families)) {
          providerSubmenu.addSubmenu(`${familyName}`, (modelSubmenu) => {
            models.forEach(model => {
              const isSelected = currentSelection === `${providerName}:${model}`;
              modelSubmenu.addCheckedItem(model, isSelected, () => {
                onSelect?.(providerName, model);
              });
            });
          });
        }
      });
    }
    
    return menu;
  }

  /**
   * Create a simple prompt selection menu
   */
  /**
   * Create a simple prompt selection menu
   */
  static createPromptMenu(
    prompts: { name: string; path: string; description?: string }[],
    currentSelection?: string,
    onSelect?: (path: string) => void
  ): WriterMenu {
    const menu = new WriterMenu({ 
      style: 'refined',
      spacing: 'comfortable',
      className: 'writerr-prompt-menu'
    });
    
    if (currentSelection) {
      menu.setCurrentSelection(currentSelection);
    }
    
    prompts.forEach(prompt => {
      const isSelected = currentSelection === prompt.path;
      menu.addCheckedItem(prompt.name, isSelected, () => {
        onSelect?.(prompt.path);
      });
    });
    
    return menu;
  }
}