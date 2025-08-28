import { ItemView, WorkspaceLeaf, Notice } from 'obsidian';
import { ChatMessage, ChatSession } from '@shared/types';
import WriterrlChatPlugin from './main';
import { 
  ChatHeader, 
  MessageList, 
  ContextArea, 
  ChatInput, 
  ChatToolbar,
  SessionManager,
  DocumentContext
} from './components';

export const VIEW_TYPE_CHAT = 'writerr-chat-view';

export class ChatView extends ItemView {
  plugin: WriterrlChatPlugin;
  private chatHeader: ChatHeader;
  private messageList: MessageList;
  private contextArea: ContextArea;
  private chatInput: ChatInput;
  public chatToolbar: ChatToolbar;
  private sessionManager: SessionManager;

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
    return 'message-square';
  }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('writerr-chat-view');
    container.style.cssText = `
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 8px;
      overflow: hidden;
    `;

    await this.createComponents(container);
    this.setupEventHandlers();
    this.applyTheme();

    // Load current session or create new one
    if (!this.plugin.currentSession) {
      this.plugin.newChatSession();
    }

    this.refresh();

    // Delayed initialization for Editorial Engine integration
    this.scheduleDelayedInitialization();
  }

  private async createComponents(container: HTMLElement): Promise<void> {
    // Create header
    const headerContainer = container.createEl('div', { cls: 'chat-header-container' });
    this.chatHeader = new ChatHeader({
      plugin: this.plugin,
      container: headerContainer,
      events: {
        onHistoryClick: () => this.showSessionManager(),
        onSettingsClick: () => this.showSettings(),
        onModeChange: (mode) => this.handleModeChange(mode)
      }
    });
    this.chatHeader.render();

    // Create message list
    const messageContainer = container.createEl('div', { cls: 'chat-messages-container' });
    this.messageList = new MessageList({
      plugin: this.plugin,
      container: messageContainer,
      actionHandler: {
        onCopy: (message) => this.copyMessage(message),
        onRetry: (message) => this.retryMessage(message),
        onInfo: (message) => this.showMessageInfo(message)
      }
    });
    this.messageList.render();

    // Create context area
    const contextContainer = container.createEl('div', { cls: 'chat-context-container' });
    this.contextArea = new ContextArea({
      plugin: this.plugin,
      container: contextContainer,
      events: {
        onDocumentAdd: (doc) => this.handleDocumentAdd(doc),
        onDocumentRemove: (doc) => this.handleDocumentRemove(doc),
        onDocumentOpen: (doc) => this.openDocument(doc)
      }
    });
    this.contextArea.render();

    // Create input area
    const inputContainer = container.createEl('div', { cls: 'chat-input-container' });
    this.chatInput = new ChatInput({
      plugin: this.plugin,
      container: inputContainer,
      events: {
        onSend: (message, mode) => this.sendMessage(message, mode),
        onModeChange: (mode) => this.handleModeChange(mode)
      }
    });
    this.chatInput.render();

    // Create bottom toolbar - await async prompt loading
    const toolbarContainer = container.createEl('div', { cls: 'chat-toolbar-container' });
    this.chatToolbar = new ChatToolbar({
      plugin: this.plugin,
      container: toolbarContainer,
      events: {
        onAddDocument: () => this.addDocumentToChat(),
        onCopyChat: () => this.copyEntireChat(),
        onClearChat: () => this.clearChat(),
        onModelChange: (model) => this.handleModelChange(model),
        onPromptChange: (prompt) => this.handlePromptChange(prompt)
      }
    });
    await this.chatToolbar.render();
  }

  private setupEventHandlers(): void {
    // Listen for starter prompt selection
    this.messageList.container.addEventListener('starter-prompt-selected', (e: CustomEvent) => {
      this.chatInput.setValue(e.detail.prompt);
      this.chatInput.focusInput();
    });
  }

  private scheduleDelayedInitialization(): void {
    // Refresh modes after view is fully loaded (in case Editorial Engine loaded after chat view)
    setTimeout(() => {
      console.log('Delayed mode refresh after chat view opened');
      this.chatHeader.refreshModeOptions();
    }, 1000);

    // Also refresh when status changes
    setTimeout(() => {
      this.chatHeader.updateStatusIndicator();
    }, 1500);
  }

  private async sendMessage(message: string, mode?: string): Promise<void> {
    if (!message.trim()) return;

    // Get selected mode from header if not provided
    const selectedMode = mode || this.chatHeader.getSelectedMode();

    this.chatInput.setProcessingState(true);
    this.chatHeader.updateStatusIndicator();

    try {
      await this.plugin.sendMessage(message, selectedMode);
      this.refresh();
      // Update token counter after message is sent
      if (this.chatToolbar?.updateTokenCounterFromModel) {
        this.chatToolbar.updateTokenCounterFromModel();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      new Notice(`Error: ${error.message}`);
    } finally {
      this.chatInput.setProcessingState(false);
      this.chatHeader.updateStatusIndicator();
    }
  }

  private copyMessage(message: ChatMessage): void {
    navigator.clipboard.writeText(message.content).then(() => {
      new Notice('Message copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy message:', err);
      new Notice('Failed to copy message');
    });
  }

  private async retryMessage(message: ChatMessage): Promise<void> {
    // Find the message index
    const messages = this.plugin.currentSession?.messages || [];
    const messageIndex = messages.findIndex(m => m.timestamp === message.timestamp);
    
    if (messageIndex >= 0 && message.role === 'assistant') {
      // Find the preceding user message
      const userMessage = messages[messageIndex - 1];
      if (userMessage && userMessage.role === 'user') {
        // Remove the AI message from the session (keep the user message)
        this.plugin.currentSession.messages = messages.slice(0, messageIndex);
        
        // Refresh the UI to remove the AI message
        this.refresh();
        
        // Call processMessage directly without adding the user message again
        // This bypasses the user message addition in sendMessage
        const parsedMessage = this.plugin.parseMessageIntent(userMessage.content);
        
        try {
          // Get the selected mode from header
          const selectedMode = this.chatHeader.getSelectedMode();
          
          if (selectedMode && selectedMode !== 'chat') {
            parsedMessage.mode = selectedMode;
          }
          
          // Get context if needed
          let fullContext: string | undefined;
          if (this.plugin.settings.contextLines > 0) {
            fullContext = await this.plugin.getDocumentContext();
          }
          
          // Process directly without adding user message
          if (selectedMode && selectedMode !== 'chat') {
            await this.plugin.processWithEditorialEngine(parsedMessage, fullContext);
          } else if (parsedMessage.intent === 'edit' || parsedMessage.intent === 'improve') {
            await this.plugin.processWithEditorialEngine(parsedMessage, fullContext);
          } else {
            await this.plugin.processWithAIProvider(parsedMessage, fullContext);
          }
          
          this.plugin.currentSession.updatedAt = Date.now();
          
          if (this.plugin.settings.autoSaveChats) {
            await this.plugin.saveChatSessions();
          }
          
          this.refresh();
          
        } catch (error) {
          console.error('Error retrying message:', error);
          new Notice(`Error: ${error.message}`);
          
          // Import generateId from shared utils
          const { generateId } = await import('@shared/utils');
          
          // Add error message to chat
          const errorMessage: ChatMessage = {
            id: generateId(),
            role: 'assistant',
            content: `I encountered an error: ${error.message}. Please try again.`,
            timestamp: Date.now(),
            metadata: {
              error: true,
              errorMessage: error.message
            }
          };
          
          this.plugin.currentSession.messages.push(errorMessage);
          this.refresh();
        }
      }
    }
  }

  private showMessageInfo(message: ChatMessage): void {
    const info = {
      role: message.role,
      timestamp: new Date(message.timestamp).toLocaleString(),
      length: message.content.length,
      tokens: Math.ceil(message.content.length / 4) // Rough token estimation
    };

    const infoText = [
      `Role: ${info.role}`,
      `Timestamp: ${info.timestamp}`,
      `Length: ${info.length} characters`,
      `Estimated tokens: ${info.tokens}`
    ].join('\n');

    new Notice(infoText, 5000);
  }

  private handleModeChange(mode: string): void {
    this.plugin.settings.defaultMode = mode;
    this.plugin.saveSettings();
  }

  private handleDocumentAdd(doc: DocumentContext): void {
    console.log('Document added to context:', doc);
    // Update token counter when document is added to context
    if (this.chatToolbar?.updateTokenCounterFromModel) {
      this.chatToolbar.updateTokenCounterFromModel();
    }
  }

  private handleDocumentRemove(doc: DocumentContext): void {
    console.log('Document removed from context:', doc);
    // Update token counter when document is removed from context
    if (this.chatToolbar?.updateTokenCounterFromModel) {
      this.chatToolbar.updateTokenCounterFromModel();
    }
  }

  private async openDocument(doc: DocumentContext): Promise<void> {
    try {
      const file = this.app.vault.getAbstractFileByPath(doc.path);
      if (file) {
        await this.app.workspace.openLinkText(doc.path, '', true);
      }
    } catch (error) {
      console.error('Error opening document:', error);
      new Notice(`Failed to open document: ${doc.name}`);
    }
  }

  private showSessionManager(): void {
    if (this.sessionManager) {
      this.sessionManager.destroy();
    }

    const overlayContainer = this.containerEl.createEl('div');
    this.sessionManager = new SessionManager({
      plugin: this.plugin,
      container: overlayContainer,
      onSessionSelect: (sessionId) => this.selectSession(sessionId),
      onSessionDelete: (sessionId) => this.deleteSession(sessionId),
      onNewSession: () => this.createNewSession()
    });
    
    this.sessionManager.show();
  }

  private showSettings(): void {
    // Placeholder for settings modal
    new Notice('Settings panel coming soon!');
  }

  private selectSession(sessionId: string): void {
    this.plugin.setCurrentSession(sessionId);
    this.refresh();
  }

  private deleteSession(sessionId: string): void {
    this.plugin.deleteSession(sessionId);
    this.refresh();
  }

  private createNewSession(): void {
    this.plugin.newChatSession();
    this.refresh();
  }

  refresh(): void {
    this.updateMessageList();
    this.updateHeader();
  }

  private updateMessageList(): void {
    const messages = this.plugin.currentSession?.messages || [];
    this.messageList.setMessages(messages);
  }

  private updateHeader(): void {
    if (this.plugin.settings.defaultMode) {
      this.chatHeader.setMode(this.plugin.settings.defaultMode);
    }
    this.chatHeader.updateStatusIndicator();
  }

  private applyTheme(): void {
    const container = this.containerEl;
    container.removeClass('theme-default', 'theme-compact', 'theme-minimal');
    container.addClass(`theme-${this.plugin.settings.theme}`);

    // Apply theme-specific adjustments if needed
    if (this.plugin.settings.theme === 'compact') {
      this.messageList.container.style.fontSize = '14px';
    } else if (this.plugin.settings.theme === 'minimal') {
      this.messageList.container.style.fontSize = '13px';
    }
  }

  // Public API methods for external access
  public refreshModeOptions(): void {
    this.chatHeader.refreshModeOptions();
  }

  public getSelectedMode(): string {
    return this.chatHeader.getSelectedMode();
  }

  public setMode(mode: string): void {
    this.chatHeader.setMode(mode);
  }

  // Toolbar event handlers
  private addDocumentToChat(): void {
    // This will trigger the context area document picker
    const addButton = this.contextArea.container.querySelector('.context-add-button') as HTMLButtonElement;
    if (addButton) {
      addButton.click();
    }
  }

  private copyEntireChat(): void {
    const messages = this.plugin.currentSession?.messages || [];
    const chatText = messages
      .map(msg => `${msg.role === 'user' ? 'You' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');
    
    navigator.clipboard.writeText(chatText).then(() => {
      new Notice('Chat copied to clipboard');
    }).catch(() => {
      new Notice('Failed to copy chat');
    });
  }

  private clearChat(): void {
    if (this.plugin.currentSession) {
      this.plugin.currentSession.messages = [];
      this.refresh();
      new Notice('Chat cleared');
    }
  }

  private handleModelChange(model: string): void {
    console.log('Model changed to:', model);
    // Here you would update the current model setting
    new Notice(`Model changed to ${model}`);
  }

  private handlePromptChange(prompt: string): void {
    console.log('Prompt template selected:', prompt);
    // Here you would apply the prompt template
    new Notice(`Prompt template: ${prompt}`);
    
    // Update token counter after prompt selection
    if (this.chatToolbar?.updateTokenCounterFromModel) {
      this.chatToolbar.updateTokenCounterFromModel();
    }
  }

  async onClose() {
    // Clean up components
    this.chatHeader?.destroy();
    this.messageList?.destroy();
    this.contextArea?.destroy();
    this.chatInput?.destroy();
    this.sessionManager?.destroy();
  }
}