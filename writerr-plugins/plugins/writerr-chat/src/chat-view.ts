import { ItemView, WorkspaceLeaf, MarkdownRenderer, Component } from 'obsidian';
import { ChatMessage, ChatSession } from '@shared/types';
import WriterrlChatPlugin from './main';

export const VIEW_TYPE_CHAT = 'writerr-chat-view';

export class ChatView extends ItemView {
  plugin: WriterrlChatPlugin;
  private chatContainer: HTMLElement;
  private inputContainer: HTMLElement;
  private messageInput: HTMLTextAreaElement;
  private sendButton: HTMLButtonElement;
  private sessionSelect: HTMLSelectElement;

  constructor(leaf: WorkspaceLeaf, plugin: WriterrlChatPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_CHAT;
  }

  getDisplayText(): string {
    return 'Writerr Chat';
  }

  getIcon(): string {
    return 'message-circle';
  }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('writerr-chat-view');

    // Create header
    const header = container.createEl('div', { cls: 'chat-header' });
    this.createHeader(header);

    // Create chat messages container
    this.chatContainer = container.createEl('div', { cls: 'chat-messages' });
    this.chatContainer.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 10px;
      border-bottom: 1px solid var(--background-modifier-border);
    `;

    // Create input container
    this.inputContainer = container.createEl('div', { cls: 'chat-input-container' });
    this.createInputArea(this.inputContainer);

    // Apply theme
    this.applyTheme();

    // Load current session or create new one
    if (!this.plugin.currentSession) {
      this.plugin.newChatSession();
    }

    this.refresh();
  }

  private createHeader(header: HTMLElement) {
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px;
      border-bottom: 1px solid var(--background-modifier-border);
    `;

    // Session selector
    this.sessionSelect = header.createEl('select', { cls: 'chat-session-select' });
    this.sessionSelect.style.cssText = `
      flex: 1;
      margin-right: 10px;
      padding: 4px 8px;
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
      background: var(--background-primary);
      color: var(--text-normal);
    `;

    this.sessionSelect.addEventListener('change', () => {
      const sessionId = this.sessionSelect.value;
      if (sessionId === 'new') {
        this.plugin.newChatSession();
      } else {
        this.plugin.setCurrentSession(sessionId);
      }
      this.refresh();
    });

    // New session button
    const newButton = header.createEl('button', { text: 'New', cls: 'chat-new-button' });
    newButton.style.cssText = `
      padding: 4px 8px;
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
      background: var(--background-primary);
      color: var(--text-normal);
      cursor: pointer;
      margin-right: 5px;
    `;
    newButton.onclick = () => {
      this.plugin.newChatSession();
      this.refresh();
    };

    // Clear button
    const clearButton = header.createEl('button', { text: 'Clear', cls: 'chat-clear-button' });
    clearButton.style.cssText = `
      padding: 4px 8px;
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
      background: var(--background-primary);
      color: var(--text-normal);
      cursor: pointer;
    `;
    clearButton.onclick = () => {
      if (this.plugin.currentSession) {
        this.plugin.currentSession.messages = [];
        this.plugin.saveChatSessions();
        this.refresh();
      }
    };
  }

  private createInputArea(container: HTMLElement) {
    container.style.cssText = `
      display: flex;
      padding: 10px;
      gap: 10px;
      background: var(--background-primary);
    `;

    this.messageInput = container.createEl('textarea', { 
      cls: 'chat-message-input',
      attr: { placeholder: 'Type your message...' }
    });
    this.messageInput.style.cssText = `
      flex: 1;
      min-height: 60px;
      max-height: 200px;
      padding: 8px;
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
      background: var(--background-primary);
      color: var(--text-normal);
      resize: vertical;
    `;

    this.messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        this.sendMessage();
      }
    });

    this.sendButton = container.createEl('button', { 
      text: 'Send', 
      cls: 'chat-send-button' 
    });
    this.sendButton.style.cssText = `
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      background: var(--interactive-accent);
      color: var(--text-on-accent);
      cursor: pointer;
      align-self: flex-end;
    `;
    this.sendButton.onclick = () => this.sendMessage();
  }

  private async sendMessage() {
    const message = this.messageInput.value.trim();
    if (!message) return;

    this.messageInput.value = '';
    this.sendButton.disabled = true;
    this.sendButton.textContent = 'Sending...';

    try {
      await this.plugin.sendMessage(message);
      this.refresh();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      this.sendButton.disabled = false;
      this.sendButton.textContent = 'Send';
    }
  }

  refresh() {
    this.updateSessionSelect();
    this.renderMessages();
  }

  private updateSessionSelect() {
    this.sessionSelect.empty();
    
    const sessions = this.plugin.getChatSessions();
    
    for (const session of sessions) {
      const option = this.sessionSelect.createEl('option', { 
        value: session.id, 
        text: session.title 
      });
      if (this.plugin.currentSession && session.id === this.plugin.currentSession.id) {
        option.selected = true;
      }
    }
  }

  private async renderMessages() {
    this.chatContainer.empty();

    if (!this.plugin.currentSession || this.plugin.currentSession.messages.length === 0) {
      const emptyState = this.chatContainer.createEl('div', { 
        cls: 'chat-empty-state',
        text: 'Start a conversation by typing a message below.'
      });
      emptyState.style.cssText = `
        text-align: center;
        padding: 20px;
        color: var(--text-muted);
        font-style: italic;
      `;
      return;
    }

    for (const message of this.plugin.currentSession.messages) {
      await this.renderMessage(message);
    }

    // Scroll to bottom
    this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
  }

  private async renderMessage(message: ChatMessage) {
    const messageEl = this.chatContainer.createEl('div', { 
      cls: `chat-message chat-message-${message.role}` 
    });

    const isUser = message.role === 'user';
    messageEl.style.cssText = `
      display: flex;
      margin: 10px 0;
      ${isUser ? 'justify-content: flex-end;' : 'justify-content: flex-start;'}
    `;

    const bubble = messageEl.createEl('div', { cls: 'chat-message-bubble' });
    bubble.style.cssText = `
      max-width: 80%;
      padding: 10px 15px;
      border-radius: 18px;
      ${isUser 
        ? 'background: var(--interactive-accent); color: var(--text-on-accent);'
        : 'background: var(--background-secondary); color: var(--text-normal);'
      }
      word-wrap: break-word;
    `;

    if (this.plugin.settings.enableMarkdown && !isUser) {
      // Render markdown for assistant messages
      const component = new Component();
      await MarkdownRenderer.renderMarkdown(
        message.content, 
        bubble, 
        '', 
        component
      );
    } else {
      bubble.textContent = message.content;
    }

    if (this.plugin.settings.showTimestamps) {
      const timestamp = messageEl.createEl('div', { 
        cls: 'chat-timestamp',
        text: new Date(message.timestamp).toLocaleTimeString()
      });
      timestamp.style.cssText = `
        font-size: 11px;
        color: var(--text-muted);
        margin: 5px ${isUser ? '15px' : '0'} 0 ${isUser ? '0' : '15px'};
        align-self: ${isUser ? 'flex-end' : 'flex-start'};
      `;
    }
  }

  private applyTheme() {
    const container = this.containerEl;
    container.removeClass('theme-default', 'theme-compact', 'theme-minimal');
    container.addClass(`theme-${this.plugin.settings.theme}`);

    if (this.plugin.settings.theme === 'compact') {
      this.chatContainer.style.fontSize = '14px';
      this.messageInput.style.minHeight = '40px';
    } else if (this.plugin.settings.theme === 'minimal') {
      this.chatContainer.style.fontSize = '13px';
      this.messageInput.style.minHeight = '35px';
    }
  }

  async onClose() {
    // Clean up
  }
}