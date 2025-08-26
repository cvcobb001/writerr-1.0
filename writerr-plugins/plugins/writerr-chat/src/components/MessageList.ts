import { ChatMessage } from '@shared/types';
import { BaseComponent } from './BaseComponent';
import { ComponentOptions, MessageActionHandler } from './types';
import { MessageBubble } from './MessageBubble';

interface MessageListOptions extends ComponentOptions {
  actionHandler: MessageActionHandler;
}

export class MessageList extends BaseComponent {
  private actionHandler: MessageActionHandler;
  private messages: ChatMessage[] = [];
  private messageBubbles: MessageBubble[] = [];

  constructor(options: MessageListOptions) {
    super(options);
    this.actionHandler = options.actionHandler;
  }

  render(): void {
    this.createMessageContainer();
    this.showEmptyState();
  }

  private createMessageContainer(): void {
    this.container.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      min-height: 0;
      scroll-behavior: smooth;
      position: relative;
    `;

    // Custom scrollbar styling
    this.container.addClass('custom-scrollbar');
    
    // Add custom scrollbar styles
    if (!document.querySelector('#custom-scrollbar-styles')) {
      const style = document.createElement('style');
      style.id = 'custom-scrollbar-styles';
      style.textContent = `
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
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--scrollbar-thumb-hover);
        }
      `;
      document.head.appendChild(style);
    }
  }

  private showEmptyState(): void {
    if (this.messages.length > 0) return;

    const emptyState = this.container.createEl('div', { 
      cls: 'chat-empty-state'
    });
    emptyState.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      padding: 40px 20px;
      color: var(--text-muted);
      gap: 16px;
    `;

    // Empty state icon
    const icon = emptyState.createEl('div');
    icon.innerHTML = `
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        <path d="M8 10h8"/>
        <path d="M8 14h4"/>
      </svg>
    `;
    icon.style.cssText = `
      color: var(--text-faint);
      opacity: 0.6;
    `;

    const title = emptyState.createEl('h3', { text: 'Start a conversation' });
    title.style.cssText = `
      font-size: 18px;
      font-weight: 500;
      margin: 0;
      color: var(--text-muted);
    `;

    const description = emptyState.createEl('p', { 
      text: 'Type a message below to begin chatting. Select a mode from the header to customize the AI behavior.' 
    });
    description.style.cssText = `
      font-size: 14px;
      margin: 0;
      max-width: 300px;
      line-height: 1.5;
      color: var(--text-faint);
    `;

    // No starter prompts - just for chatting
  }

  private hideEmptyState(): void {
    const emptyState = this.container.querySelector('.chat-empty-state');
    if (emptyState) {
      emptyState.remove();
    }
  }

  public setMessages(messages: ChatMessage[]): void {
    this.messages = messages;
    this.renderMessages();
  }

  public addMessage(message: ChatMessage): void {
    this.messages.push(message);
    this.renderNewMessage(message);
    this.scrollToBottom();
  }

  private renderMessages(): void {
    this.clearMessages();
    
    if (this.messages.length === 0) {
      this.showEmptyState();
      return;
    }

    this.hideEmptyState();

    this.messages.forEach(message => {
      this.renderMessage(message);
    });

    this.scrollToBottom();
  }

  private renderNewMessage(message: ChatMessage): void {
    this.hideEmptyState();
    this.renderMessage(message, true);
  }

  private renderMessage(message: ChatMessage, animate: boolean = false): void {
    const messageContainer = this.container.createEl('div');
    
    if (animate) {
      messageContainer.style.opacity = '0';
      messageContainer.style.transform = 'translateY(20px)';
      messageContainer.style.transition = 'all 0.3s ease';
      
      // Animate in
      setTimeout(() => {
        messageContainer.style.opacity = '1';
        messageContainer.style.transform = 'translateY(0)';
      }, 50);
    }

    const messageBubble = new MessageBubble({
      plugin: this.plugin,
      container: messageContainer,
      message,
      actionHandler: this.actionHandler
    });

    messageBubble.render();
    this.messageBubbles.push(messageBubble);
  }

  private clearMessages(): void {
    // Destroy existing message bubbles
    this.messageBubbles.forEach(bubble => bubble.destroy());
    this.messageBubbles = [];
    
    // Clear container
    this.container.empty();
    this.createMessageContainer();
  }

  private scrollToBottom(smooth: boolean = true): void {
    requestAnimationFrame(() => {
      const scrollOptions: ScrollToOptions = {
        top: this.container.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      };
      this.container.scrollTo(scrollOptions);
    });
  }

  public updateMessage(messageIndex: number, newMessage: ChatMessage): void {
    if (messageIndex < 0 || messageIndex >= this.messages.length) return;

    this.messages[messageIndex] = newMessage;
    
    // Re-render the specific message
    const messageBubble = this.messageBubbles[messageIndex];
    if (messageBubble) {
      messageBubble.destroy();
      
      const messageContainer = this.container.children[messageIndex] as HTMLElement;
      if (messageContainer) {
        const newBubble = new MessageBubble({
          plugin: this.plugin,
          container: messageContainer,
          message: newMessage,
          actionHandler: this.actionHandler
        });
        
        newBubble.render();
        this.messageBubbles[messageIndex] = newBubble;
      }
    }
  }

  public removeMessage(messageIndex: number): void {
    if (messageIndex < 0 || messageIndex >= this.messages.length) return;

    // Remove from messages array
    this.messages.splice(messageIndex, 1);
    
    // Remove bubble
    const messageBubble = this.messageBubbles[messageIndex];
    if (messageBubble) {
      const messageContainer = messageBubble.container;
      
      // Animate out
      messageContainer.style.animation = 'messageSlideOut 0.3s ease forwards';
      
      // Add animation styles
      if (!document.querySelector('#message-animations')) {
        const style = document.createElement('style');
        style.id = 'message-animations';
        style.textContent = `
          @keyframes messageSlideOut {
            from {
              opacity: 1;
              transform: translateX(0);
              max-height: 200px;
              margin: 16px 0;
            }
            to {
              opacity: 0;
              transform: translateX(100px);
              max-height: 0;
              margin: 0;
            }
          }
        `;
        document.head.appendChild(style);
      }

      setTimeout(() => {
        messageBubble.destroy();
        this.messageBubbles.splice(messageIndex, 1);
        
        if (this.messages.length === 0) {
          this.showEmptyState();
        }
      }, 300);
    }
  }

  public getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  public isEmpty(): boolean {
    return this.messages.length === 0;
  }

  destroy(): void {
    this.messageBubbles.forEach(bubble => bubble.destroy());
    this.messageBubbles = [];
    super.destroy();
  }
}