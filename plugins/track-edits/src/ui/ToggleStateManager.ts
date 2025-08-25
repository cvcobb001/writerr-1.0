import { App } from 'obsidian';

export type StateChangeCallback = (enabled: boolean) => void;

export class ToggleStateManager {
  private app: App;
  private trackingEnabled: boolean;
  private ribbonIcon: HTMLElement | null = null;
  private statusIndicator: HTMLElement | null = null;
  private sidePanel: HTMLElement | null = null;
  private sidePanelOriginalContent: string = '';
  public onStateChange: StateChangeCallback;

  constructor(app: App, onStateChange: StateChangeCallback) {
    this.app = app;
    this.onStateChange = onStateChange;
    
    // Load saved state or default to enabled
    this.trackingEnabled = this.loadSavedState();
    
    // Create screen reader announcer element
    this.createAriaAnnouncer();
  }

  get isTrackingEnabled(): boolean {
    return this.trackingEnabled;
  }

  /**
   * Set tracking enabled/disabled state
   */
  setTrackingEnabled(enabled: boolean): void {
    if (this.trackingEnabled === enabled) {
      return; // No change
    }

    this.trackingEnabled = enabled;
    
    // Save state to session storage
    this.saveState();
    
    // Update all UI elements
    this.updateRibbonIcon();
    this.updateStatusIndicator();
    this.updateSidePanel();
    
    // Announce to screen readers
    this.announceStateChange(enabled);
    
    // Notify callback
    this.onStateChange(enabled);
  }

  /**
   * Set the ribbon icon element to manage
   */
  setRibbonIcon(ribbonElement: HTMLElement): void {
    this.ribbonIcon = ribbonElement;
    this.updateRibbonIcon();
  }

  /**
   * Set the status indicator element to manage
   */
  setStatusIndicator(statusElement: HTMLElement): void {
    this.statusIndicator = statusElement;
    this.updateStatusIndicator();
  }

  /**
   * Set the side panel element to manage
   */
  setSidePanel(sidePanelElement: HTMLElement): void {
    this.sidePanel = sidePanelElement;
    // Save original content for restoration
    this.sidePanelOriginalContent = sidePanelElement.innerHTML;
    this.updateSidePanel();
  }

  private updateRibbonIcon(): void {
    if (!this.ribbonIcon) return;

    // Add transition class for smooth animation
    this.ribbonIcon.classList.add('state-transition');

    if (this.trackingEnabled) {
      this.ribbonIcon.classList.add('track-edits-enabled');
      this.ribbonIcon.classList.remove('track-edits-disabled');
      this.ribbonIcon.title = 'Track Edits (Active) - Click to manage changes';
      this.ribbonIcon.setAttribute('aria-label', 'Track Edits is active. Click to manage tracked changes.');
    } else {
      this.ribbonIcon.classList.add('track-edits-disabled');
      this.ribbonIcon.classList.remove('track-edits-enabled');
      this.ribbonIcon.title = 'Track Edits (Disabled) - Click to enable';
      this.ribbonIcon.setAttribute('aria-label', 'Track Edits disabled. Click to enable tracking.');
    }

    // Remove transition class after animation completes
    setTimeout(() => {
      if (this.ribbonIcon) {
        this.ribbonIcon.classList.remove('state-transition');
      }
    }, 300);
  }

  private updateStatusIndicator(): void {
    if (!this.statusIndicator) return;

    if (this.trackingEnabled) {
      this.statusIndicator.classList.add('status-active');
      this.statusIndicator.classList.remove('status-disabled');
      this.statusIndicator.setAttribute('aria-label', 'Track Edits is active');
      this.statusIndicator.textContent = 'Active';
    } else {
      this.statusIndicator.classList.add('status-disabled');
      this.statusIndicator.classList.remove('status-active');
      this.statusIndicator.setAttribute('aria-label', 'Track Edits is disabled');
      this.statusIndicator.textContent = 'Disabled';
    }
  }

  private updateSidePanel(): void {
    if (!this.sidePanel) return;

    if (this.trackingEnabled) {
      this.sidePanel.classList.add('track-edits-active');
      this.sidePanel.classList.remove('track-edits-disabled');
      // Restore original content when re-enabled
      if (this.sidePanelOriginalContent) {
        this.sidePanel.innerHTML = this.sidePanelOriginalContent;
      }
    } else {
      this.sidePanel.classList.add('track-edits-disabled');
      this.sidePanel.classList.remove('track-edits-active');
      // Show empty state
      this.sidePanel.innerHTML = this.createEmptyStateHTML();
    }
  }

  private createEmptyStateHTML(): string {
    return `
      <div class="track-edits-empty-state">
        <div class="empty-state-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 12l2 2 4-4"></path>
            <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"></path>
            <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"></path>
            <path d="M3 12h6m6 0h6"></path>
          </svg>
        </div>
        <h3 class="empty-state-title">Tracking disabled</h3>
        <p class="empty-state-description">
          Enable Track Edits to see changes and suggestions for your document.
        </p>
        <button class="empty-state-button" onclick="window.TrackEdits?.enableTracking()">
          Enable Track Edits
        </button>
      </div>
    `;
  }

  private saveState(): void {
    sessionStorage.setItem('track-edits-enabled', String(this.trackingEnabled));
  }

  private loadSavedState(): boolean {
    const saved = sessionStorage.getItem('track-edits-enabled');
    return saved !== null ? saved === 'true' : true; // Default to enabled
  }

  private createAriaAnnouncer(): void {
    // Create hidden element for screen reader announcements
    let announcer = document.getElementById('track-edits-announcer');
    if (!announcer) {
      announcer = document.createElement('div');
      announcer.id = 'track-edits-announcer';
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      announcer.style.position = 'absolute';
      announcer.style.left = '-10000px';
      announcer.style.width = '1px';
      announcer.style.height = '1px';
      announcer.style.overflow = 'hidden';
      document.body.appendChild(announcer);
    }
  }

  private announceStateChange(enabled: boolean): void {
    const announcer = document.getElementById('track-edits-announcer');
    if (announcer) {
      announcer.textContent = enabled 
        ? 'Track Edits has been enabled'
        : 'Track Edits has been disabled';
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    const announcer = document.getElementById('track-edits-announcer');
    if (announcer && announcer.parentNode) {
      announcer.parentNode.removeChild(announcer);
    }
  }
}