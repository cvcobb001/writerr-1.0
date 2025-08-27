/**
 * Centralized tooltip system for consistent appearance and smart positioning
 */

export interface TooltipOptions {
  text: string;
  delay?: number;
  offset?: number;
  className?: string;
}

export class TooltipManager {
  private static instance: TooltipManager;
  private activeTooltip: HTMLElement | null = null;
  private showTimeout: number | null = null;
  private hideTimeout: number | null = null;

  static getInstance(): TooltipManager {
    if (!TooltipManager.instance) {
      TooltipManager.instance = new TooltipManager();
    }
    return TooltipManager.instance;
  }

  private constructor() {
    this.addGlobalStyles();
  }

  private addGlobalStyles(): void {
    const existingStyle = document.getElementById('writerr-tooltip-styles');
    if (existingStyle) return;

    const styles = `
/* Writerr Unified Tooltip Styles */
.writerr-tooltip {
  position: fixed !important;
  z-index: 9999 !important;
  background: rgba(0, 0, 0, 0.9) !important;
  color: white !important;
  padding: 6px 10px !important;
  border-radius: 6px !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  white-space: nowrap !important;
  pointer-events: none !important;
  opacity: 0 !important;
  transform: translateY(4px) !important;
  transition: all 0.15s ease !important;
  backdrop-filter: blur(4px) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
  font-family: var(--font-interface) !important;
  line-height: 1.2 !important;
}

.writerr-tooltip.visible {
  opacity: 1 !important;
  transform: translateY(0) !important;
}

.writerr-tooltip::before {
  content: '' !important;
  position: absolute !important;
  width: 0 !important;
  height: 0 !important;
  border-style: solid !important;
}

.writerr-tooltip.position-top::before {
  top: 100% !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  border-width: 4px 4px 0 4px !important;
  border-color: rgba(0, 0, 0, 0.9) transparent transparent transparent !important;
}

.writerr-tooltip.position-bottom::before {
  bottom: 100% !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  border-width: 0 4px 4px 4px !important;
  border-color: transparent transparent rgba(0, 0, 0, 0.9) transparent !important;
}

.writerr-tooltip.position-left::before {
  left: 100% !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  border-width: 4px 0 4px 4px !important;
  border-color: transparent transparent transparent rgba(0, 0, 0, 0.9) !important;
}

.writerr-tooltip.position-right::before {
  right: 100% !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  border-width: 4px 4px 4px 0 !important;
  border-color: transparent rgba(0, 0, 0, 0.9) transparent transparent !important;
}
`;

    const styleEl = document.createElement('style');
    styleEl.id = 'writerr-tooltip-styles';
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
  }

  public addTooltip(element: HTMLElement, options: TooltipOptions): void {
    const { text, delay = 700, offset = 8 } = options;

    element.addEventListener('mouseenter', (e) => {
      this.clearTimeouts();
      this.showTimeout = window.setTimeout(() => {
        this.showTooltip(element, text, offset);
      }, delay);
    });

    element.addEventListener('mouseleave', () => {
      this.clearTimeouts();
      this.hideTimeout = window.setTimeout(() => {
        this.hideTooltip();
      }, 100);
    });

    // Ensure tooltip hides when element is removed
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.removedNodes.forEach((node) => {
            if (node === element || (node.nodeType === Node.ELEMENT_NODE && (node as Element).contains(element))) {
              this.hideTooltip();
              observer.disconnect();
            }
          });
        }
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  private showTooltip(element: HTMLElement, text: string, offset: number): void {
    this.hideTooltip();

    const tooltip = document.createElement('div');
    tooltip.className = 'writerr-tooltip';
    tooltip.textContent = text;
    document.body.appendChild(tooltip);
    this.activeTooltip = tooltip;

    // Position tooltip
    const elementRect = element.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    let position: 'top' | 'bottom' | 'left' | 'right' = 'top';
    let left = 0;
    let top = 0;

    // Ultra-aggressive top preference - almost always prefer top
    const spaceAbove = elementRect.top;
    const spaceBelow = viewport.height - elementRect.bottom;
    const spaceLeft = elementRect.left;
    const spaceRight = viewport.width - elementRect.right;

    // Minimum space needed (very lenient for top positioning)
    const minSpace = tooltipRect.height + offset + 4;
    const topMinSpace = tooltipRect.height + offset - 10; // Even more lenient for top

    // ALWAYS prefer top unless there's absolutely no room
    if (spaceAbove >= topMinSpace) {
      position = 'top';
      top = elementRect.top - tooltipRect.height - offset;
      left = elementRect.left + (elementRect.width / 2) - (tooltipRect.width / 2);
    } else if (spaceBelow >= minSpace) {
      position = 'bottom';
      top = elementRect.bottom + offset;
      left = elementRect.left + (elementRect.width / 2) - (tooltipRect.width / 2);
    } else if (spaceLeft >= tooltipRect.width + offset) {
      position = 'left';
      top = elementRect.top + (elementRect.height / 2) - (tooltipRect.height / 2);
      left = elementRect.left - tooltipRect.width - offset;
    } else if (spaceRight >= tooltipRect.width + offset) {
      position = 'right';
      top = elementRect.top + (elementRect.height / 2) - (tooltipRect.height / 2);
      left = elementRect.right + offset;
    } else {
      // Final fallback: force top even if it goes off-screen
      position = 'top';
      top = Math.max(4, elementRect.top - tooltipRect.height - offset);
      left = elementRect.left + (elementRect.width / 2) - (tooltipRect.width / 2);
    }

    // Ensure tooltip stays within viewport bounds horizontally
    left = Math.max(8, Math.min(left, viewport.width - tooltipRect.width - 8));
    
    // For top positioning, allow it to go slightly off-screen at the top if needed
    if (position === 'top') {
      top = Math.max(4, top);
    } else {
      top = Math.max(8, Math.min(top, viewport.height - tooltipRect.height - 8));
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.classList.add(`position-${position}`);

    // Trigger animation
    requestAnimationFrame(() => {
      tooltip.classList.add('visible');
    });
  }

  private hideTooltip(): void {
    if (this.activeTooltip) {
      this.activeTooltip.classList.remove('visible');
      setTimeout(() => {
        if (this.activeTooltip) {
          this.activeTooltip.remove();
          this.activeTooltip = null;
        }
      }, 150);
    }
  }

  private clearTimeouts(): void {
    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
      this.showTimeout = null;
    }
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
  }
}

// Convenience function for easy use
export function addTooltip(element: HTMLElement, text: string, delay = 700): void {
  const manager = TooltipManager.getInstance();
  manager.addTooltip(element, { text, delay });
}

// Enhanced BaseComponent with tooltip support
export function addTooltipToComponent(element: HTMLElement, text: string): void {
  // Remove any existing tooltip attributes to avoid conflicts
  element.removeAttribute('title');
  element.removeAttribute('data-tooltip');
  
  addTooltip(element, text);
}