import { BaseComponent } from './BaseComponent';
import { ComponentOptions, ChatInputEvents } from './types';
import { Icons } from '../utils/icons';

interface ChatInputOptions extends ComponentOptions {
  events: ChatInputEvents;
}

export class ChatInput extends BaseComponent {
  private events: ChatInputEvents;
  private messageInput: HTMLTextAreaElement;
  private sendButton: HTMLButtonElement;
  private isProcessing: boolean = false;

  constructor(options: ChatInputOptions) {
    super(options);
    this.events = options.events;
  }

  render(): void {
    this.createInputContainer();
    this.createMessageInput();
    this.createSendButton();
    this.setupKeyboardShortcuts();
  }

  private createInputContainer(): void {
    this.container.style.cssText = `
      padding: 8px;
      background: var(--background-primary);
      position: relative;
    `;
  }

  private createMessageInput(): void {
    this.messageInput = this.container.createEl('textarea', { 
      cls: 'chat-message-input',
      attr: { 
        placeholder: 'Type your message...',
        rows: '3'
      }
    });

    this.messageInput.style.cssText = `
      width: 100%;
      min-height: 80px;
      max-height: 200px;
      padding: 12px 52px 12px 12px;
      border: 2px solid var(--background-modifier-border);
      border-radius: 12px;
      background: var(--background-primary);
      color: var(--text-normal);
      resize: none;
      font-family: inherit;
      font-size: 14px;
      line-height: 1.4;
      outline: none;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      box-sizing: border-box;
      overflow: hidden;
      overflow-wrap: break-word;
      word-wrap: break-word;
      white-space: pre-wrap;
    `;

    this.setupAutoResize();
    this.setupInputEvents();
  }

  private createSendButton(): void {
    this.sendButton = this.container.createEl('button', { 
      cls: 'writerr-send-button',
      attr: {
        'type': 'submit',
        'aria-label': 'Send message'
      }
    });
    
    // Use centralized icon system
    this.sendButton.innerHTML = Icons.send({ className: 'writerr-send-icon', width: 16, height: 16 });
    
    this.setupSendButtonEvents();
  }

  private setupAutoResize(): void {
    const autoResize = () => {
      this.messageInput.style.height = '60px';
      const scrollHeight = this.messageInput.scrollHeight;
      const maxHeight = 160;
      const newHeight = Math.min(Math.max(scrollHeight, 60), maxHeight);
      this.messageInput.style.height = newHeight + 'px';
    };

    this.messageInput.addEventListener('input', autoResize);
    
    // Initial resize
    setTimeout(autoResize, 0);
  }

  private setupInputEvents(): void {
    // Focus/blur effects
    this.messageInput.addEventListener('focus', () => {
      this.messageInput.style.borderColor = 'var(--interactive-accent)';
      this.messageInput.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1), 0 0 0 1px var(--interactive-accent)';
    });
    
    this.messageInput.addEventListener('blur', () => {
      this.messageInput.style.borderColor = 'var(--background-modifier-border)';
      this.messageInput.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
    });

    // Input validation
    this.messageInput.addEventListener('input', () => {
      this.updateSendButtonState();
    });
  }

  private setupSendButtonEvents(): void {
    this.sendButton.onclick = () => this.sendMessage();
    
    // Light hover effects
    this.sendButton.addEventListener('mouseenter', () => {
      if (!this.isProcessing) {
        this.sendButton.style.backgroundColor = 'var(--background-modifier-hover)';
        this.sendButton.style.color = 'var(--interactive-accent)';
        this.sendButton.style.opacity = '1';
        this.sendButton.style.transform = 'scale(1.05)';
      }
    });
    
    this.sendButton.addEventListener('mouseleave', () => {
      if (!this.isProcessing) {
        this.sendButton.style.backgroundColor = 'transparent';
        this.sendButton.style.color = 'var(--text-muted)';
        this.sendButton.style.opacity = this.messageInput.value.trim() ? '1' : '0.6';
        this.sendButton.style.transform = 'scale(1)';
      }
    });

    // Simple click effect
    this.sendButton.addEventListener('click', () => {
      if (!this.isProcessing) {
        this.sendButton.style.transform = 'scale(0.95)';
        setTimeout(() => {
          if (!this.isProcessing) {
            this.sendButton.style.transform = 'scale(1)';
          }
        }, 100);
      }
    });
  }

  private setupKeyboardShortcuts(): void {
    this.messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.sendMessage();
      } else if (e.key === 'Enter' && e.shiftKey) {
        // Allow Shift+Enter for new line (default behavior)
        return;
      } else if (e.key === 'Escape') {
        this.messageInput.blur();
      }
      // Note: Plain Enter now creates new line (default textarea behavior)
    });
  }

  private updateSendButtonState(): void {
    const hasContent = this.messageInput.value.trim().length > 0;
    
    if (hasContent && !this.isProcessing) {
      this.sendButton.style.opacity = '1';
      this.sendButton.style.cursor = 'pointer';
      this.sendButton.disabled = false;
      this.sendButton.style.color = 'var(--interactive-accent)';
    } else {
      this.sendButton.style.opacity = this.isProcessing ? '0.8' : '0.6';
      this.sendButton.style.cursor = this.isProcessing ? 'default' : 'not-allowed';
      this.sendButton.style.color = 'var(--text-muted)';
      this.sendButton.disabled = !this.isProcessing;
    }
  }

  private sendMessage(): void {
    const message = this.messageInput.value.trim();
    if (!message || this.isProcessing) return;

    // Don't pass mode - let ChatView get it from ChatHeader
    this.events.onSend(message);
    this.clearInput();
  }

  public setProcessingState(processing: boolean): void {
    this.isProcessing = processing;
    
    if (processing) {
      this.sendButton.innerHTML = Icons.loader({ 
        className: 'writerr-send-icon', 
        width: 18, 
        height: 18 
      });
      this.sendButton.style.color = 'var(--text-muted)';
      this.sendButton.style.cursor = 'default';
      this.sendButton.style.opacity = '0.8';
      // Add loading animation
      this.sendButton.style.animation = 'spin 1s linear infinite';
      
      // Add spin animation if not exists
      if (!document.querySelector('#spin-animation')) {
        const style = document.createElement('style');
        style.id = 'spin-animation';
        style.textContent = `
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `;
        document.head.appendChild(style);
      }
    } else {
      this.sendButton.innerHTML = Icons.send({ 
        className: 'writerr-send-icon', 
        width: 18, 
        height: 18 
      });
      this.sendButton.style.animation = 'none';
      this.sendButton.style.cursor = 'pointer';
    }
    
    this.updateSendButtonState();
  }

  public clearInput(): void {
    this.messageInput.value = '';
    this.messageInput.style.height = '44px';
    this.updateSendButtonState();
  }

  public focusInput(): void {
    this.messageInput.focus();
  }

  public getValue(): string {
    return this.messageInput.value;
  }

  public setValue(value: string): void {
    this.messageInput.value = value;
    this.updateSendButtonState();
    
    // Trigger auto-resize
    this.messageInput.style.height = '44px';
    const scrollHeight = this.messageInput.scrollHeight;
    const maxHeight = 160;
    const newHeight = Math.min(Math.max(scrollHeight, 44), maxHeight);
    this.messageInput.style.height = newHeight + 'px';
  }
}