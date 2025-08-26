import { MarkdownRenderer, Component } from 'obsidian';
import { ChatMessage } from '@shared/types';
import { BaseComponent } from './BaseComponent';
import { ComponentOptions, MessageActionHandler } from './types';

interface MessageBubbleOptions extends ComponentOptions {
  message: ChatMessage;
  actionHandler: MessageActionHandler;
}

export class MessageBubble extends BaseComponent {
  private message: ChatMessage;
  private actionHandler: MessageActionHandler;
  private messageEl: HTMLElement;
  private actionsEl: HTMLElement;

  constructor(options: MessageBubbleOptions) {
    super(options);
    this.message = options.message;
    this.actionHandler = options.actionHandler;
  }

  render(): void {
    this.createMessageElement();
    this.createAvatar();
    this.createContent();
    this.createActions();
    this.createTimestamp();
    this.addInteractions();
  }

  private createMessageElement(): void {
    const isUser = this.message.role === 'user';
    
    this.messageEl = this.createElement('div', {
      cls: ['chat-message', `chat-message-${this.message.role}`],
      styles: {
        display: 'flex',
        margin: '16px 0',
        gap: '12px',
        position: 'relative',
        alignItems: 'flex-start',
        ...(isUser ? { 'flex-direction': 'row-reverse' } : {})
      }
    });
  }

  private createAvatar(): void {
    const isUser = this.message.role === 'user';
    const avatar = this.messageEl.createEl('div', { cls: 'writerr-message-icon' });

    if (isUser) {
      // User icon: Lucide User icon
      avatar.innerHTML = `
        <svg class="writerr-message-avatar" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      `;
    } else {
      // AI icon: Lucide Bot icon
      avatar.innerHTML = `
        <svg class="writerr-message-avatar" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 8V4H8"/>
          <rect width="16" height="12" x="4" y="8" rx="2"/>
          <path d="M2 14h2"/>
          <path d="M20 14h2"/>
          <path d="M15 13v2"/>
          <path d="M9 13v2"/>
        </svg>
      `;
    }
  }

  private createContent(): void {
    const isUser = this.message.role === 'user';
    const contentWrapper = this.messageEl.createEl('div', { cls: 'message-content-wrapper' });
    contentWrapper.style.cssText = `
      flex: 1;
      min-width: 0;
      max-width: calc(100% - 120px);
    `;

    const bubble = contentWrapper.createEl('div', { cls: 'message-bubble' });
    bubble.style.cssText = `
      padding: 12px 16px;
      border-radius: 18px;
      position: relative;
      word-wrap: break-word;
      ${isUser 
        ? `
          background: var(--background-primary);
          color: var(--text-normal);
          border: 2px solid var(--interactive-accent);
          border-bottom-right-radius: 6px;
        `
        : `
          background: var(--background-secondary);
          color: var(--text-normal);
          border: 1px solid var(--background-modifier-border);
          border-bottom-left-radius: 6px;
        `
      }
      transition: all 0.2s ease;
    `;

    if (this.plugin.settings.enableMarkdown && !isUser) {
      this.renderMarkdownContent(bubble);
    } else {
      bubble.textContent = this.message.content;
    }

    // Add subtle shadow on hover
    this.addHoverEffect(bubble, {
      'box-shadow': '0 4px 12px rgba(0, 0, 0, 0.1)',
      'transform': 'translateY(-1px)'
    });
  }

  private async renderMarkdownContent(bubble: HTMLElement): Promise<void> {
    try {
      const component = new Component();
      await MarkdownRenderer.renderMarkdown(
        this.message.content,
        bubble,
        '',
        component
      );
    } catch (error) {
      console.error('Error rendering markdown:', error);
      bubble.textContent = this.message.content;
    }
  }

  private createActions(): void {
    const isUser = this.message.role === 'user';
    
    // Create actions container directly in the content wrapper, below the bubble
    const contentWrapper = this.messageEl.querySelector('.message-content-wrapper') as HTMLElement;
    this.actionsEl = contentWrapper.createEl('div', { cls: 'writerr-message-actions' });

    if (isUser) {
      // User message actions: ONLY copy and info (NO retry)
      this.createActionButton('copy', 'Copy message', `
        <svg class="writerr-action-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
      `, () => this.actionHandler.onCopy(this.message));

      this.createActionButton('info', 'Message info', `
        <svg class="writerr-action-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="12"/>
          <path d="M12 16v-4"/>
          <path d="M12 8h.01"/>
        </svg>
      `, () => this.actionHandler.onInfo(this.message));
    } else {
      // AI message actions: retry, copy, and info
      this.createActionButton('retry', 'Retry this response', `
        <svg class="writerr-action-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 3"/>
          <path d="M21 3v5h-5"/>
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 21"/>
          <path d="M3 21v-5h5"/>
        </svg>
      `, () => this.actionHandler.onRetry(this.message));

      this.createActionButton('copy', 'Copy message', `
        <svg class="writerr-action-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
      `, () => this.actionHandler.onCopy(this.message));

      this.createActionButton('info', 'Message info', `
        <svg class="writerr-action-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="12"/>
          <path d="M12 16v-4"/>
          <path d="M12 8h.01"/>
        </svg>
      `, () => this.actionHandler.onInfo(this.message));
    }
  }

  private createActionButton(type: string, tooltip: string, icon: string, onClick: () => void): void {
    const btn = this.actionsEl.createEl('button', { cls: `message-action-btn action-${type}` });
    btn.innerHTML = icon;
    btn.title = tooltip;
    btn.onclick = onClick;

    btn.style.cssText = `
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      padding: 4px !important;
      border-radius: 4px !important;
      cursor: pointer !important;
      color: var(--text-faint) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      transition: all 0.2s ease !important;
      width: 24px !important;
      height: 24px !important;
      opacity: 0.6 !important;
    `;

    // Force reflow
    btn.offsetHeight;

    this.addHoverEffect(btn, {
      'color': 'var(--text-muted)',
      'opacity': '1'
    });
  }

  private createTimestamp(): void {
    // No timestamps - info is available via the eye icon
    return;
  }

  private addInteractions(): void {
    // Actions are always visible, no hover needed
  }
}