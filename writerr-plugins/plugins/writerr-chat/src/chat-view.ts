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
  private modeSelect: HTMLSelectElement;
  private statusIndicator: HTMLElement;

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
    container.style.cssText = `
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 8px;
      overflow: hidden;
    `;

    // Create header
    const header = container.createEl('div', { cls: 'chat-header' });
    this.createHeader(header);

    // Create chat messages container with proper scrolling
    this.chatContainer = container.createEl('div', { cls: 'chat-messages' });
    this.chatContainer.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      min-height: 0;
    `;

    // Create document context area
    const contextArea = container.createEl('div', { cls: 'chat-context-area' });
    this.createContextArea(contextArea);

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

    // Refresh modes after view is fully loaded (in case Editorial Engine loaded after chat view)
    setTimeout(() => {
      console.log('Delayed mode refresh after chat view opened');
      this.populateModeOptions();
    }, 1000);

    // Also refresh when status changes
    setTimeout(() => {
      this.updateStatusIndicator();
    }, 1500);
  }

  private createHeader(header: HTMLElement) {
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border-bottom: 1px solid var(--background-modifier-border);
      height: 60px;
      background: var(--background-primary);
    `;

    // Left side: Mode selection (transparent dropdown)
    const leftContainer = header.createEl('div', { cls: 'chat-header-left' });
    leftContainer.style.cssText = 'display: flex; align-items: center; gap: 12px;';
    
    this.modeSelect = leftContainer.createEl('select', { cls: 'chat-mode-select' });
    this.modeSelect.style.cssText = `
      border: none;
      background: transparent;
      padding: 0;
      font-size: 18px;
      font-weight: 500;
      color: var(--text-normal);
      cursor: pointer;
      outline: none;
    `;

    // Populate modes dynamically
    this.populateModeOptions();

    // Right side: Control buttons
    const rightContainer = header.createEl('div', { cls: 'chat-header-controls' });
    rightContainer.style.cssText = 'display: flex; align-items: center; gap: 8px;';

    // History button
    const historyButton = rightContainer.createEl('button', { cls: 'chat-control-button' });
    historyButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>';
    historyButton.style.cssText = `
      background: transparent;
      border: none;
      padding: 6px;
      cursor: pointer;
      border-radius: 4px;
      color: var(--text-muted);
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    historyButton.title = 'Chat History';
    historyButton.onclick = () => {
      // Session management functionality
      this.showSessionManager();
    };

    // Settings button  
    const settingsButton = rightContainer.createEl('button', { cls: 'chat-control-button' });
    settingsButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>';
    settingsButton.style.cssText = `
      background: transparent;
      border: none;
      padding: 6px;
      cursor: pointer;
      border-radius: 4px;
      color: var(--text-muted);
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    settingsButton.title = 'Chat Settings';

    // Status indicator
    this.statusIndicator = rightContainer.createEl('div', { cls: 'chat-status-indicator' });
    this.updateStatusIndicator();

    // Add hover effects to buttons
    const buttons = [historyButton, settingsButton];
    buttons.forEach(button => {
      button.addEventListener('mouseenter', () => {
        button.style.backgroundColor = 'var(--background-modifier-hover)';
      });
      button.addEventListener('mouseleave', () => {
        button.style.backgroundColor = 'transparent';
      });
    });
  }

  private populateModeOptions() {
    if (!this.modeSelect) {
      console.log('Mode select element not available');
      return;
    }

    console.log('Populating mode options...', this.modeSelect);

    // Clear existing options
    this.modeSelect.innerHTML = '';

    // Add Chat mode first (default, bypasses Editorial Engine)
    const chatOption = this.modeSelect.createEl('option', { 
      value: 'chat', 
      text: 'Chat Mode' 
    });

    // Check if Editorial Engine is available and get enabled modes only
    if (window.Writerr?.editorial) {
      try {
        const modes = window.Writerr.editorial.getEnabledModes();
        console.log('Editorial Engine enabled modes found:', modes);
        
        for (const mode of modes) {
          const option = this.modeSelect.createEl('option', { 
            value: mode.id, 
            text: mode.name 
          });
          console.log(`Added mode option: ${mode.name} (${mode.id})`);
        }

        // Force a visual update and log final state
        console.log(`Successfully loaded ${modes.length} enabled Editorial Engine modes to dropdown`);
        console.log('Final dropdown options:', Array.from(this.modeSelect.options).map(opt => ({value: opt.value, text: opt.text})));
        
        // Force a repaint
        this.modeSelect.style.display = 'none';
        this.modeSelect.offsetHeight; // Trigger reflow
        this.modeSelect.style.display = '';
        
      } catch (error) {
        console.warn('Failed to load Editorial Engine modes:', error);
        
        // Fallback: Add placeholder for unavailable Editorial Engine
        const unavailableOption = this.modeSelect.createEl('option', {
          value: 'editorial-unavailable',
          text: 'Editorial Engine Unavailable'
        });
        unavailableOption.disabled = true;
      }
    } else {
      console.log('Editorial Engine not available, showing loading state');
      
      // Editorial Engine not loaded - add fallback modes
      const fallbackModes = [
        { id: 'editorial-loading', name: 'Editorial Engine Loading...' }
      ];

      for (const mode of fallbackModes) {
        const option = this.modeSelect.createEl('option', { 
          value: mode.id, 
          text: mode.name 
        });
        option.disabled = true;
      }

      // Try to reload modes after a delay
      setTimeout(() => {
        console.log('Retrying mode population after delay...');
        this.populateModeOptions();
      }, 2000);
    }

    // Set default mode
    const defaultMode = this.plugin.settings.defaultMode || 'chat';
    this.modeSelect.value = defaultMode;
    console.log(`Set default mode to: ${defaultMode}, current value: ${this.modeSelect.value}`);
    console.log('Dropdown element classes:', this.modeSelect.className);
    console.log('Dropdown parent element:', this.modeSelect.parentElement);
  }

  refreshModeOptions() {
    // Public method to refresh mode options when Editorial Engine becomes available
    this.populateModeOptions();
  }

  private createInputArea(container: HTMLElement) {
    container.style.cssText = `
      display: flex;
      align-items: flex-end;
      padding: 16px;
      gap: 12px;
      background: var(--background-primary);
      border-top: 1px solid var(--background-modifier-border);
    `;

    // Message input with modern styling
    this.messageInput = container.createEl('textarea', { 
      cls: 'chat-message-input',
      attr: { 
        placeholder: 'Type your message...',
        rows: '1'
      }
    });
    this.messageInput.style.cssText = `
      flex: 1;
      min-height: 40px;
      max-height: 160px;
      padding: 12px 16px;
      border: 1px solid var(--background-modifier-border);
      border-radius: 20px;
      background: var(--background-primary);
      color: var(--text-normal);
      resize: none;
      font-family: inherit;
      font-size: 14px;
      line-height: 1.4;
      outline: none;
      transition: border-color 0.2s ease;
    `;

    // Auto-resize functionality
    const autoResize = () => {
      this.messageInput.style.height = 'auto';
      const scrollHeight = this.messageInput.scrollHeight;
      const maxHeight = 160;
      const newHeight = Math.min(scrollHeight, maxHeight);
      this.messageInput.style.height = newHeight + 'px';
    };

    this.messageInput.addEventListener('input', autoResize);
    this.messageInput.addEventListener('focus', () => {
      this.messageInput.style.borderColor = 'var(--interactive-accent)';
    });
    this.messageInput.addEventListener('blur', () => {
      this.messageInput.style.borderColor = 'var(--background-modifier-border)';
    });

    this.messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.sendMessage();
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Send button with modern styling
    this.sendButton = container.createEl('button', { 
      cls: 'chat-send-button' 
    });
    this.sendButton.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2 11 13"/><path d="M22 2 15 22 11 13 2 9z"/></svg>';
    this.sendButton.style.cssText = `
      width: 40px;
      height: 40px;
      border: none;
      border-radius: 50%;
      background: var(--interactive-accent);
      color: var(--text-on-accent);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      flex-shrink: 0;
    `;
    
    this.sendButton.addEventListener('mouseenter', () => {
      this.sendButton.style.transform = 'scale(1.05)';
    });
    this.sendButton.addEventListener('mouseleave', () => {
      this.sendButton.style.transform = 'scale(1)';
    });

    this.sendButton.onclick = () => this.sendMessage();

    // Initial resize
    setTimeout(autoResize, 0);
  }

  private createContextArea(container: HTMLElement) {
    container.style.cssText = `
      border-top: 1px solid var(--background-modifier-border);
      padding: 12px 16px;
      background: var(--background-secondary);
      min-height: 0;
      max-height: 120px;
      overflow-y: auto;
    `;

    // Context header
    const contextHeader = container.createEl('div', { cls: 'context-header' });
    contextHeader.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    `;

    const contextLabel = contextHeader.createEl('span', { text: 'Context' });
    contextLabel.style.cssText = `
      font-size: 12px;
      color: var(--text-muted);
      font-weight: 500;
    `;

    const addDocButton = contextHeader.createEl('button');
    addDocButton.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M12 11v6"/><path d="M9 14h6"/></svg>';
    addDocButton.style.cssText = `
      background: transparent;
      border: none;
      cursor: pointer;
      color: var(--text-muted);
      padding: 2px;
      border-radius: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    addDocButton.title = 'Attach document';
    addDocButton.onclick = () => this.showDocumentPicker();

    // Context documents container
    const documentsContainer = container.createEl('div', { cls: 'context-documents' });
    documentsContainer.style.cssText = `
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      min-height: 24px;
    `;

    // Store reference for updates
    this.contextDocuments = documentsContainer;

    // Add sample context documents for demo
    this.addContextDocument('Meeting Notes.md', '/Daily/Meeting Notes.md');
    this.addContextDocument('Project Plan.md', '/Projects/Project Plan.md');

    // Add hover effect to add button
    addDocButton.addEventListener('mouseenter', () => {
      addDocButton.style.backgroundColor = 'var(--background-modifier-hover)';
    });
    addDocButton.addEventListener('mouseleave', () => {
      addDocButton.style.backgroundColor = 'transparent';
    });
  }

  private contextDocuments: HTMLElement;

  private addContextDocument(name: string, path: string) {
    if (!this.contextDocuments) return;

    const docChip = this.contextDocuments.createEl('div', { cls: 'context-document-chip' });
    docChip.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 12px;
      font-size: 12px;
      color: var(--text-normal);
      cursor: pointer;
      max-width: 200px;
    `;

    const docIcon = docChip.createEl('span');
    docIcon.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>';
    docIcon.style.cssText = 'color: var(--text-muted); flex-shrink: 0;';

    const docName = docChip.createEl('span', { text: name });
    docName.style.cssText = `
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    `;

    const removeBtn = docChip.createEl('button', { text: '×' });
    removeBtn.style.cssText = `
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-muted);
      font-size: 14px;
      padding: 0;
      width: 14px;
      height: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      flex-shrink: 0;
    `;

    docChip.onclick = (e) => {
      if (e.target !== removeBtn) {
        // Open document functionality
        console.log('Opening document:', path);
      }
    };

    removeBtn.onclick = (e) => {
      e.stopPropagation();
      docChip.remove();
    };

    // Hover effects
    docChip.addEventListener('mouseenter', () => {
      docChip.style.backgroundColor = 'var(--background-modifier-hover)';
    });
    docChip.addEventListener('mouseleave', () => {
      docChip.style.backgroundColor = 'var(--background-primary)';
    });

    removeBtn.addEventListener('mouseenter', () => {
      removeBtn.style.backgroundColor = 'var(--background-modifier-error)';
      removeBtn.style.color = 'var(--text-on-accent)';
    });
    removeBtn.addEventListener('mouseleave', () => {
      removeBtn.style.backgroundColor = 'transparent';
      removeBtn.style.color = 'var(--text-muted)';
    });
  }

  private showDocumentPicker() {
    // Create document picker modal
    const overlay = this.containerEl.createEl('div', { cls: 'document-picker-overlay' });
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    `;

    const modal = overlay.createEl('div', { cls: 'document-picker-modal' });
    modal.style.cssText = `
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 8px;
      padding: 20px;
      min-width: 400px;
      max-height: 500px;
      overflow-y: auto;
    `;

    const header = modal.createEl('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;';
    header.createEl('h3', { text: 'Attach Document' });

    const closeButton = header.createEl('button', { text: '×' });
    closeButton.style.cssText = `
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: var(--text-muted);
    `;
    closeButton.onclick = () => overlay.remove();

    // Search input
    const searchInput = modal.createEl('input', { 
      type: 'text',
      placeholder: 'Search documents...'
    });
    searchInput.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
      background: var(--background-primary);
      color: var(--text-normal);
      margin-bottom: 16px;
    `;

    // Document list
    const docList = modal.createEl('div');
    
    // Get vault files
    const files = this.app.vault.getMarkdownFiles();
    const recentFiles = files.slice(0, 10); // Show 10 most recent

    recentFiles.forEach(file => {
      const docItem = docList.createEl('div');
      docItem.style.cssText = `
        padding: 8px 12px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
        margin-bottom: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
      `;

      docItem.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <path d="M14 2v6h6"/>
        </svg>
        <div>
          <div style="font-weight: 500;">${file.basename}</div>
          <div style="font-size: 12px; color: var(--text-muted);">${file.path}</div>
        </div>
      `;

      docItem.onclick = () => {
        this.addContextDocument(file.basename + '.md', file.path);
        overlay.remove();
      };

      docItem.addEventListener('mouseenter', () => {
        docItem.style.backgroundColor = 'var(--background-modifier-hover)';
      });
      docItem.addEventListener('mouseleave', () => {
        docItem.style.backgroundColor = 'transparent';
      });
    });

    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.remove();
    };

    // Focus search input
    searchInput.focus();
  }

  private async sendMessage() {
    const message = this.messageInput.value.trim();
    if (!message) return;

    // Get selected mode from interface
    const selectedMode = this.getSelectedMode();

    this.messageInput.value = '';
    this.sendButton.disabled = true;
    this.sendButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>';

    // Update status indicator to show processing
    if (this.statusIndicator) {
      this.statusIndicator.style.background = 'var(--color-blue)';
    }

    try {
      // Pass the selected mode directly to the plugin
      await this.plugin.sendMessage(message, selectedMode);
      this.refresh();
    } catch (error) {
      console.error('Error sending message:', error);
      new Notice(`Error: ${error.message}`);
    } finally {
      this.sendButton.disabled = false;
      this.sendButton.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2 11 13"/><path d="M22 2 15 22 11 13 2 9z"/></svg>';
      
      // Restore status indicator
      this.updateStatusIndicator();
    }
  }

  refresh() {
    this.updateSessionSelect();
    this.renderMessages();
  }

  private updateSessionSelect() {
    // In the new design, we don't have a session selector in the header
    // Session management is handled through the history button modal
    // This method is kept for compatibility but doesn't need to do anything
    if (!this.modeSelect) return;
    
    // Ensure the mode selector has the correct value
    if (this.plugin.settings.defaultMode) {
      this.modeSelect.value = this.plugin.settings.defaultMode;
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

  private updateStatusIndicator() {
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

  private showSessionManager() {
    // Create session manager overlay
    const overlay = this.containerEl.createEl('div', { cls: 'session-manager-overlay' });
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    `;

    const modal = overlay.createEl('div', { cls: 'session-manager-modal' });
    modal.style.cssText = `
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 8px;
      padding: 20px;
      min-width: 300px;
      max-height: 400px;
      overflow-y: auto;
    `;

    const header = modal.createEl('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;';
    header.createEl('h3', { text: 'Chat Sessions' });

    const closeButton = header.createEl('button', { text: '×' });
    closeButton.style.cssText = `
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: var(--text-muted);
    `;
    closeButton.onclick = () => overlay.remove();

    // List sessions
    const sessionsList = modal.createEl('div');
    const sessions = this.plugin.getChatSessions();
    
    sessions.forEach(session => {
      const sessionItem = sessionsList.createEl('div');
      sessionItem.style.cssText = `
        padding: 8px 12px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
        margin-bottom: 8px;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
      `;
      
      if (this.plugin.currentSession?.id === session.id) {
        sessionItem.style.backgroundColor = 'var(--background-modifier-hover)';
      }

      const sessionInfo = sessionItem.createEl('div');
      sessionInfo.createEl('div', { text: session.title, cls: 'session-title' });
      const messageCount = session.messages?.length || 0;
      sessionInfo.createEl('div', { 
        text: `${messageCount} messages`,
        cls: 'session-info'
      }).style.cssText = 'font-size: 12px; color: var(--text-muted);';

      const deleteBtn = sessionItem.createEl('button', { text: '🗑' });
      deleteBtn.style.cssText = `
        background: none;
        border: none;
        cursor: pointer;
        opacity: 0.6;
      `;
      
      sessionItem.onclick = (e) => {
        if (e.target === deleteBtn) return;
        this.plugin.setCurrentSession(session.id);
        this.refresh();
        overlay.remove();
      };

      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        this.plugin.deleteSession(session.id);
        overlay.remove();
        this.showSessionManager(); // Refresh the list
      };
    });

    // New session button
    const newSessionBtn = modal.createEl('button', { text: '+ New Session' });
    newSessionBtn.style.cssText = `
      width: 100%;
      padding: 8px;
      background: var(--interactive-accent);
      color: var(--text-on-accent);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      margin-top: 12px;
    `;
    newSessionBtn.onclick = () => {
      this.plugin.newChatSession();
      this.refresh();
      overlay.remove();
    };

    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.remove();
    };
  }

  getSelectedMode(): string {
    return this.modeSelect?.value || 'chat';
  }

  setMode(mode: string): void {
    if (this.modeSelect) {
      this.modeSelect.value = mode;
    }
  }

  async onClose() {
    // Clean up
  }
}