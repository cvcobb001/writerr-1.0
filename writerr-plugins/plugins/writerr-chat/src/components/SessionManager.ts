import { BaseComponent } from './BaseComponent';
import { ComponentOptions } from './types';
import { ChatSession } from '@shared/types';

interface SessionManagerOptions extends ComponentOptions {
  onSessionSelect: (sessionId: string) => void;
  onSessionDelete: (sessionId: string) => void;
  onNewSession: () => void;
}

export class SessionManager extends BaseComponent {
  private overlay: HTMLElement;
  private modal: HTMLElement;
  private onSessionSelect: (sessionId: string) => void;
  private onSessionDelete: (sessionId: string) => void;
  private onNewSession: () => void;

  constructor(options: SessionManagerOptions) {
    super(options);
    this.onSessionSelect = options.onSessionSelect;
    this.onSessionDelete = options.onSessionDelete;
    this.onNewSession = options.onNewSession;
  }

  render(): void {
    this.createOverlay();
    this.createModal();
    this.createHeader();
    this.createSessionList();
    this.createNewSessionButton();
    this.setupEventHandlers();
  }

  private createOverlay(): void {
    this.overlay = this.container.createEl('div', { cls: 'session-manager-overlay' });
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      backdrop-filter: blur(4px);
      animation: fadeIn 0.2s ease;
    `;

    // Add fade animation
    if (!document.querySelector('#session-manager-animations')) {
      const style = document.createElement('style');
      style.id = 'session-manager-animations';
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes sessionSlideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  private createModal(): void {
    this.modal = this.overlay.createEl('div', { cls: 'session-manager-modal' });
    this.modal.style.cssText = `
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 12px;
      padding: 0;
      min-width: 400px;
      max-width: 500px;
      max-height: 600px;
      overflow: hidden;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
      animation: modalSlideIn 0.3s ease;
      display: flex;
      flex-direction: column;
    `;
  }

  private createHeader(): void {
    const header = this.modal.createEl('div', { cls: 'session-manager-header' });
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid var(--background-modifier-border);
      background: var(--background-primary);
    `;

    const titleSection = header.createEl('div');
    titleSection.style.cssText = 'display: flex; align-items: center; gap: 12px;';

    const icon = titleSection.createEl('div');
    icon.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
        <path d="M3 3v5h5"/>
        <path d="M12 7v5l4 2"/>
      </svg>
    `;
    icon.style.cssText = 'color: var(--interactive-accent);';

    const title = titleSection.createEl('h3', { text: 'Chat Sessions' });
    title.style.cssText = `
      margin: 0;
      color: var(--text-normal);
      font-size: 18px;
      font-weight: 500;
    `;

    const closeButton = header.createEl('button');
    closeButton.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 6L6 18"/>
        <path d="M6 6l12 12"/>
      </svg>
    `;
    closeButton.style.cssText = `
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-muted);
      padding: 6px;
      border-radius: 6px;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    closeButton.onclick = () => this.close();

    this.addHoverEffect(closeButton, {
      'background-color': 'var(--background-modifier-hover)',
      'color': 'var(--text-normal)'
    });
  }

  private createSessionList(): void {
    const sessionListContainer = this.modal.createEl('div', { cls: 'session-list-container' });
    sessionListContainer.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 16px 0;
      max-height: 400px;
    `;

    const sessionsList = sessionListContainer.createEl('div', { cls: 'sessions-list' });
    const sessions = this.plugin.getChatSessions();
    
    if (sessions.length === 0) {
      this.createEmptySessionsState(sessionsList);
    } else {
      this.renderSessions(sessionsList, sessions);
    }
  }

  private createEmptySessionsState(container: HTMLElement): void {
    const emptyState = container.createEl('div', { cls: 'empty-sessions-state' });
    emptyState.style.cssText = `
      text-align: center;
      padding: 40px 20px;
      color: var(--text-muted);
    `;

    const icon = emptyState.createEl('div');
    icon.innerHTML = `
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    `;
    icon.style.cssText = `
      color: var(--text-faint);
      margin-bottom: 16px;
      opacity: 0.6;
    `;

    emptyState.createEl('p', { 
      text: 'No chat sessions yet. Start a conversation to create your first session.'
    });
  }

  private renderSessions(container: HTMLElement, sessions: ChatSession[]): void {
    sessions.forEach((session, index) => {
      const sessionItem = container.createEl('div', { cls: 'session-item' });
      sessionItem.style.cssText = `
        padding: 16px 24px;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid var(--background-modifier-border-focus);
        transition: all 0.2s ease;
        position: relative;
        animation: sessionSlideIn 0.3s ease forwards;
        animation-delay: ${index * 0.05}s;
        opacity: 0;
      `;
      
      // Highlight current session
      if (this.plugin.currentSession?.id === session.id) {
        sessionItem.style.backgroundColor = 'var(--background-modifier-hover)';
        sessionItem.style.borderLeft = '3px solid var(--interactive-accent)';
        sessionItem.style.paddingLeft = '21px';
      }

      const sessionInfo = sessionItem.createEl('div', { cls: 'session-info' });
      sessionInfo.style.cssText = 'flex: 1; min-width: 0;';

      const sessionTitle = sessionInfo.createEl('div', { 
        text: session.title || `Session ${sessions.indexOf(session) + 1}`,
        cls: 'session-title' 
      });
      sessionTitle.style.cssText = `
        font-weight: 500;
        color: var(--text-normal);
        margin-bottom: 4px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      `;

      const sessionMeta = sessionInfo.createEl('div', { cls: 'session-meta' });
      sessionMeta.style.cssText = `
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 12px;
        color: var(--text-muted);
      `;

      const messageCount = session.messages?.length || 0;
      const messageCountEl = sessionMeta.createEl('span', { 
        text: `${messageCount} message${messageCount !== 1 ? 's' : ''}`
      });

      if (session.messages && session.messages.length > 0) {
        const lastMessage = session.messages[session.messages.length - 1];
        const lastMessageTime = new Date(lastMessage.timestamp);
        const timeAgo = this.getTimeAgo(lastMessageTime);
        
        sessionMeta.createEl('span', { text: '•' });
        sessionMeta.createEl('span', { text: timeAgo });
      }

      // Actions section
      const actionsSection = sessionItem.createEl('div', { cls: 'session-actions' });
      actionsSection.style.cssText = `
        display: flex;
        gap: 4px;
        opacity: 0;
        transition: opacity 0.2s ease;
      `;

      const deleteBtn = actionsSection.createEl('button', { cls: 'session-delete-btn' });
      deleteBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      `;
      deleteBtn.title = 'Delete session';
      deleteBtn.style.cssText = `
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

      // Event handlers
      sessionItem.onclick = (e) => {
        if (e.target === deleteBtn || deleteBtn.contains(e.target as Node)) return;
        this.onSessionSelect(session.id);
        this.close();
      };

      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        this.confirmDeleteSession(session);
      };

      // Hover effects
      sessionItem.addEventListener('mouseenter', () => {
        if (this.plugin.currentSession?.id !== session.id) {
          sessionItem.style.backgroundColor = 'var(--background-modifier-hover)';
        }
        actionsSection.style.opacity = '1';
      });

      sessionItem.addEventListener('mouseleave', () => {
        if (this.plugin.currentSession?.id !== session.id) {
          sessionItem.style.backgroundColor = 'transparent';
        }
        actionsSection.style.opacity = '0';
      });

      this.addHoverEffect(deleteBtn, {
        'background-color': 'var(--background-modifier-error)',
        'color': 'var(--text-on-accent)'
      });
    });
  }

  private createNewSessionButton(): void {
    const buttonContainer = this.modal.createEl('div');
    buttonContainer.style.cssText = `
      padding: 16px 24px;
      border-top: 1px solid var(--background-modifier-border);
      background: var(--background-primary);
    `;

    const newSessionBtn = buttonContainer.createEl('button', { cls: 'new-session-button' });
    newSessionBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14"/>
        <path d="M5 12h14"/>
      </svg>
      <span>New Session</span>
    `;
    newSessionBtn.style.cssText = `
      width: 100%;
      padding: 12px 16px;
      background: var(--interactive-accent);
      color: var(--text-on-accent);
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s ease;
    `;

    newSessionBtn.onclick = () => {
      this.onNewSession();
      this.close();
    };

    this.addHoverEffect(newSessionBtn, {
      'transform': 'translateY(-1px)',
      'box-shadow': '0 4px 12px rgba(0, 0, 0, 0.15)'
    });
  }

  private confirmDeleteSession(session: ChatSession): void {
    const messageCount = session.messages?.length || 0;
    const confirmMessage = `Delete "${session.title || 'Untitled Session'}"?\n\nThis will permanently delete ${messageCount} message${messageCount !== 1 ? 's' : ''}.`;
    
    if (confirm(confirmMessage)) {
      this.onSessionDelete(session.id);
      // Refresh the session list
      this.modal.empty();
      this.createModal();
      this.createHeader();
      this.createSessionList();
      this.createNewSessionButton();
    }
  }

  private setupEventHandlers(): void {
    this.overlay.onclick = (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    };

    // ESC key to close
    document.addEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      this.close();
    }
  };

  private getTimeAgo(date: Date): string {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / 60000);
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  }

  public show(): void {
    this.render();
  }

  public close(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    
    // Animate out
    this.overlay.style.animation = 'fadeOut 0.2s ease forwards';
    
    // Add fadeOut animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
    `;
    document.head.appendChild(style);

    setTimeout(() => {
      this.destroy();
      document.head.removeChild(style);
    }, 200);
  }

  destroy(): void {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    document.removeEventListener('keydown', this.handleKeyDown);
  }
}