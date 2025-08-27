import { BaseComponent } from './BaseComponent';
import { ComponentOptions, HeaderEvents } from './types';

import { WriterMenu } from './menus/WriterMenu';

interface ChatHeaderOptions extends ComponentOptions {
  events: HeaderEvents;
}

export class ChatHeader extends BaseComponent {
  private events: HeaderEvents;
  private modeButton: HTMLElement;
  private statusIndicator: HTMLElement;
  private currentMode: string = 'chat';

  constructor(options: ChatHeaderOptions) {
    super(options);
    this.events = options.events;
  }

  render(): void {
    this.createHeader();
    this.createLeftSection();
    this.createRightSection();
  }

  private createHeader(): void {
    this.container.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border-bottom: 1px solid var(--background-modifier-border);
      height: 60px;
      background: var(--background-primary);
    `;
  }

  private createLeftSection(): void {
    const leftContainer = this.createElement('div', { cls: 'writerr-chat-header-left' });

    // Create the new WriterMenu mode button (replacing old select)
    this.createNewModeButton(leftContainer);
  }

  private createRightSection(): void {
    const rightContainer = this.createElement('div', { cls: 'chat-header-controls' });

    this.createHistoryButton(rightContainer);
    this.createSettingsButton(rightContainer);
    // Status indicator moved to bottom toolbar
  }

  private createHistoryButton(parent: HTMLElement): void {
    const historyButton = parent.createEl('button', { cls: 'chat-control-button' });
    historyButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
        <path d="M3 3v5h5"/>
        <path d="M12 7v5l4 2"/>
      </svg>
    `;
    historyButton.onclick = (e) => this.showHistoryMenu(e);

    // Add unified tooltip
    this.addTooltip(historyButton, 'Chat History');

    this.styleControlButton(historyButton);
  }

  private createSettingsButton(parent: HTMLElement): void {
    const settingsButton = parent.createEl('button', { cls: 'chat-control-button' });
    settingsButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    `;
    settingsButton.onclick = () => this.events.onSettingsClick();

    // Add unified tooltip
    this.addTooltip(settingsButton, 'Chat Settings');

    this.styleControlButton(settingsButton);
  }

  private createStatusIndicator(parent: HTMLElement): void {
    this.statusIndicator = parent.createEl('div', { cls: 'chat-status-indicator' });
    this.updateStatusIndicator();
  }

  private styleControlButton(button: HTMLButtonElement): void {
    // No inline styles needed - CSS class handles everything
    
    // Update SVG icons to be larger (18px instead of 16px)
    const svg = button.querySelector('svg');
    if (svg) {
      svg.setAttribute('width', '18');
      svg.setAttribute('height', '18');
    }

    // Add tooltip positioning style to appear above with VERY high z-index
    button.addEventListener('mouseenter', () => {
      const tooltip = button.getAttribute('title');
      if (tooltip) {
        button.style.position = 'relative';
        button.setAttribute('data-tooltip', tooltip);
        button.removeAttribute('title');
        
        // Add tooltip styles if not already added - with EXTREMELY high z-index
        if (!document.querySelector('#header-tooltip-styles')) {
          const style = document.createElement('style');
          style.id = 'header-tooltip-styles';
          style.textContent = `
            [data-tooltip]:hover::before {
              content: attr(data-tooltip) !important;
              position: absolute !important;
              bottom: calc(100% + 8px) !important;
              left: 50% !important;
              transform: translateX(-50%) !important;
              background: var(--background-primary) !important;
              color: var(--text-normal) !important;
              border: 1px solid var(--background-modifier-border) !important;
              border-radius: 4px !important;
              padding: 4px 8px !important;
              font-size: 11px !important;
              white-space: nowrap !important;
              z-index: 9999999 !important;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
              pointer-events: none !important;
            }
          `;
          document.head.appendChild(style);
        }
      }
    });
  }


  public updateStatusIndicator(): void {
    if (!this.statusIndicator) return;

    // Check Editorial Engine availability
    const hasEditorialEngine = !!window.Writerr?.editorial;
    const hasTrackEdits = !!window.WriterrlAPI?.trackEdits;
    
    // Track previous status to detect changes
    const previousStatus = this.statusIndicator.getAttribute('data-status');
    
    let status = 'ready';
    let color = 'var(--color-green)';
    
    if (!hasEditorialEngine && !hasTrackEdits) {
      status = 'limited';
      color = 'var(--color-yellow)';
    } else if (!hasEditorialEngine || !hasTrackEdits) {
      status = 'partial';
      color = 'var(--color-orange)';
    }
    
    this.statusIndicator.style.cssText = `
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${color};
      transition: background-color 0.3s ease;
    `;
    
    this.statusIndicator.setAttribute('title', 
      status === 'ready' ? 'All systems ready' :
      status === 'partial' ? 'Some features unavailable' :
      'Limited functionality - Editorial Engine and Track Edits not available'
    );
    
    this.statusIndicator.setAttribute('data-status', status);
    
    // Refresh mode options if Editorial Engine status changed
    if (previousStatus !== status && hasEditorialEngine) {
      this.refreshModeOptions();
    }
  }

  public getSelectedMode(): string {
    return this.currentMode;
  }

  public setMode(mode: string): void {
    this.currentMode = mode;
    if (this.modeButton) {
      const textNode = Array.from(this.modeButton.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
      if (textNode) {
        textNode.textContent = this.getCurrentModeDisplayName();
      }
    }
  }

  public refreshModeOptions(): void {
    // Update the mode button text with current mode
    if (this.modeButton) {
      const textNode = Array.from(this.modeButton.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
      if (textNode) {
        textNode.textContent = this.getCurrentModeDisplayName();
      }
    }
  }


  private showHistoryMenu(event: MouseEvent): void {
    const historyMenu = new WriterMenu();
    const sessions = this.plugin.getChatSessions();
    
    if (sessions.length === 0) {
      historyMenu.addDisabledItem('No chat sessions yet');
      historyMenu.addSeparator();
      historyMenu.addItem('Start New Session', () => {
        this.events.onNewSession?.();
      });
    } else {
      // Add current sessions
      sessions.forEach(session => {
        const sessionTitle = session.title || `Session ${sessions.indexOf(session) + 1}`;
        const messageCount = session.messages?.length || 0;
        const isCurrentSession = this.plugin.currentSession?.id === session.id;
        
        // Format: "Session Title • 5 messages"
        const displayTitle = `${sessionTitle}${messageCount > 0 ? ` • ${messageCount} msg${messageCount !== 1 ? 's' : ''}` : ''}`;
        
        if (isCurrentSession) {
          historyMenu.addCheckedItem(displayTitle, true, () => {
            // Current session - just close menu
          });
        } else {
          historyMenu.addItem(displayTitle, () => {
            this.events.onSessionSelect?.(session.id);
          });
        }
      });
      
      historyMenu.addSeparator();
      historyMenu.addItem('New Session', () => {
        this.events.onNewSession?.();
      });
    }
    
    historyMenu.showAtMouseEvent(event);
  }

  private getTimeAgo(date: Date): string {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / 60000);
    
    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d`;
    
    return date.toLocaleDateString();
  }

  private createNewModeButton(parent: HTMLElement): void {
    const modeButton = parent.createEl('button', { cls: 'writerr-mode-button' });
    modeButton.textContent = this.getCurrentModeDisplayName();
    modeButton.style.cssText = `
      background: transparent;
      border: none;
      padding: 4px 8px;
      color: var(--text-normal);
      cursor: pointer;
      font-size: 18px;
      font-weight: 400;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: color 0.2s ease;
      min-width: auto;
      justify-content: flex-start;
      box-shadow: none;
    `;

    // Add chevron down icon
    const chevron = modeButton.createEl('span');
    chevron.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6,9 12,15 18,9"/>
      </svg>
    `;

    modeButton.onclick = (e) => this.showModeMenu(e, modeButton);

    // Store reference for updating (now the main mode selector)
    this.modeButton = modeButton;

    // Simple hover effect - just color change
    modeButton.addEventListener('mouseenter', () => {
      modeButton.style.color = 'var(--text-accent)';
    });

    modeButton.addEventListener('mouseleave', () => {
      modeButton.style.color = 'var(--text-normal)';
    });
  }

  private getCurrentModeDisplayName(): string {
    if (this.currentMode === 'chat') {
      return 'Chat Mode';
    }

    // Try to get the display name from Editorial Engine
    if (window.Writerr?.editorial && this.currentMode !== 'editorial-loading' && this.currentMode !== 'editorial-unavailable') {
      try {
        const modes = window.Writerr.editorial.getEnabledModes();
        const mode = modes.find(m => m.id === this.currentMode);
        return mode?.name || this.currentMode;
      } catch (error) {
        console.warn('Failed to get mode display name:', error);
      }
    }

    return this.currentMode;
  }

  private showModeMenu(event: MouseEvent, button: HTMLElement): void {
    const modeMenu = new WriterMenu();

    // Always add Chat Mode first
    if (this.currentMode === 'chat') {
      modeMenu.addCheckedItem('Chat Mode', true, () => {
        this.selectMode('chat', 'Chat Mode', button);
      });
    } else {
      modeMenu.addItem('Chat Mode', () => {
        this.selectMode('chat', 'Chat Mode', button);
      });
    }

    // Add Editorial Engine modes if available
    if (window.Writerr?.editorial) {
      try {
        const modes = window.Writerr.editorial.getEnabledModes();
        
        if (modes.length > 0) {
          modeMenu.addSeparator();
          
          modes.forEach(mode => {
            if (this.currentMode === mode.id) {
              modeMenu.addCheckedItem(mode.name, true, () => {
                this.selectMode(mode.id, mode.name, button);
              });
            } else {
              modeMenu.addItem(mode.name, () => {
                this.selectMode(mode.id, mode.name, button);
              });
            }
          });
        }
      } catch (error) {
        console.warn('Failed to load Editorial Engine modes for menu:', error);
        modeMenu.addSeparator();
        modeMenu.addDisabledItem('Editorial Engine Unavailable');
      }
    } else {
      modeMenu.addSeparator();
      modeMenu.addDisabledItem('Editorial Engine Loading...');
    }

    modeMenu.showAtMouseEvent(event);
  }

  private selectMode(modeId: string, displayName: string, button: HTMLElement): void {
    // Update current mode
    this.currentMode = modeId;
    
    // Update the button text
    const textNode = Array.from(button.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
    if (textNode) {
      textNode.textContent = displayName;
    }

    // Trigger the change event
    this.events.onModeChange(modeId);
  }
}