import { Plugin, WorkspaceLeaf, TFile, Notice, Modal } from 'obsidian';
import { WriterrlChatSettingsTab } from './settings';
import { ChatView, VIEW_TYPE_CHAT } from './chat-view';
import { ChatSession, ChatMessage, AIProvider, WriterrlGlobalAPI } from '@shared/types';
import { generateId } from '@shared/utils';
import { AIProviderManager } from './ai-provider-manager';

interface WriterrlChatSettings {
  defaultProvider: string;
  providers: AIProvider[];
  chatPosition: 'right' | 'left' | 'floating';
  autoSaveChats: boolean;
  contextLines: number;
  maxTokens: number;
  temperature: number;
  enableMarkdown: boolean;
  showTimestamps: boolean;
  theme: 'default' | 'compact' | 'minimal';
}

const DEFAULT_SETTINGS: WriterrlChatSettings = {
  defaultProvider: 'openai',
  providers: [
    {
      id: 'openai',
      name: 'OpenAI',
      model: 'gpt-4',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: ''
    }
  ],
  chatPosition: 'right',
  autoSaveChats: true,
  contextLines: 10,
  maxTokens: 2000,
  temperature: 0.7,
  enableMarkdown: true,
  showTimestamps: true,
  theme: 'default'
};

export default class WriterrlChatPlugin extends Plugin {
  settings: WriterrlChatSettings;
  aiProviderManager: AIProviderManager;
  currentSession: ChatSession | null = null;
  chatSessions: Map<string, ChatSession> = new Map();

  async onload() {
    await this.loadSettings();

    this.aiProviderManager = new AIProviderManager(this.settings);

    // Initialize global API
    this.initializeGlobalAPI();

    // Register view
    this.registerView(VIEW_TYPE_CHAT, (leaf) => new ChatView(leaf, this));

    // Add commands
    this.addCommands();

    // Add ribbon icon
    this.addRibbonIcon('message-circle', 'Open Writerr Chat', () => {
      this.openChat();
    });

    // Add settings tab
    this.addSettingTab(new WriterrlChatSettingsTab(this.app, this));

    // Load chat sessions
    await this.loadChatSessions();

    console.log('Writerr Chat plugin loaded');
  }

  onunload() {
    this.cleanupGlobalAPI();
    console.log('Writerr Chat plugin unloaded');
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    if (this.aiProviderManager) {
      this.aiProviderManager.updateSettings(this.settings);
    }
  }

  private initializeGlobalAPI() {
    if (!window.WriterrlAPI) {
      window.WriterrlAPI = {} as WriterrlGlobalAPI;
    }

    window.WriterrlAPI.chat = {
      openChat: () => this.openChat(),
      sendMessage: (message: string, context?: string) => this.sendMessage(message, context),
      getCurrentSession: () => this.currentSession
    };
  }

  private cleanupGlobalAPI() {
    if (window.WriterrlAPI && window.WriterrlAPI.chat) {
      delete window.WriterrlAPI.chat;
    }
  }

  private addCommands() {
    this.addCommand({
      id: 'open-chat',
      name: 'Open chat',
      callback: () => this.openChat()
    });

    this.addCommand({
      id: 'new-chat-session',
      name: 'New chat session',
      callback: () => this.newChatSession()
    });

    this.addCommand({
      id: 'chat-with-selection',
      name: 'Chat with selected text',
      editorCallback: (editor) => {
        const selection = editor.getSelection();
        if (selection) {
          this.chatWithSelection(selection);
        } else {
          new Notice('No text selected');
        }
      }
    });

    this.addCommand({
      id: 'quick-chat',
      name: 'Quick chat',
      callback: () => this.quickChat()
    });
  }

  async openChat() {
    const existingLeaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_CHAT)[0];
    
    if (existingLeaf) {
      this.app.workspace.revealLeaf(existingLeaf);
      return;
    }

    try {
      // Primary approach: Use setViewState (modern Obsidian API)
      const leaf = this.app.workspace.getLeaf(false);
      if (leaf) {
        await leaf.setViewState({
          type: VIEW_TYPE_CHAT,
          active: true
        });
        this.app.workspace.revealLeaf(leaf);
        return;
      }

      // Fallback 1: Force new leaf creation
      const newLeaf = this.app.workspace.getLeaf(true);
      if (newLeaf) {
        await newLeaf.setViewState({
          type: VIEW_TYPE_CHAT,
          active: true
        });
        this.app.workspace.revealLeaf(newLeaf);
        return;
      }

      // Fallback 2: Create leaf by split
      const splitLeaf = this.app.workspace.createLeafBySplit(this.app.workspace.activeLeaf);
      if (splitLeaf) {
        await splitLeaf.setViewState({
          type: VIEW_TYPE_CHAT,
          active: true
        });
        this.app.workspace.revealLeaf(splitLeaf);
        return;
      }

      console.error('Failed to create chat view - no leaf creation method succeeded');

    } catch (error) {
      console.error('Error opening chat view:', error);
    }
  }

  newChatSession() {
    this.currentSession = {
      id: generateId(),
      title: `Chat ${new Date().toLocaleDateString()}`,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.chatSessions.set(this.currentSession.id, this.currentSession);
    this.saveChatSessions();
  }

  async chatWithSelection(selectedText: string) {
    await this.openChat();
    
    if (!this.currentSession) {
      this.newChatSession();
    }

    const contextMessage = `Here's the selected text I'd like to discuss:\n\n${selectedText}\n\nWhat would you like to know about this text?`;
    await this.sendMessage(contextMessage);
  }

  async quickChat() {
    const modal = new QuickChatModal(this.app, async (message: string) => {
      if (!this.currentSession) {
        this.newChatSession();
      }
      await this.sendMessage(message);
    });
    modal.open();
  }

  async sendMessage(content: string, context?: string): Promise<void> {
    if (!this.currentSession) {
      this.newChatSession();
    }

    if (!this.currentSession) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: Date.now()
    };

    this.currentSession.messages.push(userMessage);

    // Get context from current file if requested
    let fullContext = context;
    if (!fullContext && this.settings.contextLines > 0) {
      fullContext = await this.getDocumentContext();
    }

    try {
      // Get AI response
      const response = await this.aiProviderManager.sendMessage(
        this.currentSession.messages,
        fullContext
      );

      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: response,
        timestamp: Date.now()
      };

      this.currentSession.messages.push(assistantMessage);
      this.currentSession.updatedAt = Date.now();

      if (this.settings.autoSaveChats) {
        await this.saveChatSessions();
      }

      // Refresh chat view if open
      this.refreshChatView();

    } catch (error) {
      new Notice(`Error sending message: ${error.message}`);
      console.error('Chat error:', error);
    }
  }

  private async getDocumentContext(): Promise<string | undefined> {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) return undefined;

    try {
      const content = await this.app.vault.read(activeFile);
      const lines = content.split('\n');
      
      if (lines.length <= this.settings.contextLines * 2) {
        return content;
      }

      // Get lines around cursor or selection
      const editor = this.app.workspace.getActiveViewOfType(require('obsidian').MarkdownView)?.editor;
      if (editor) {
        const cursor = editor.getCursor();
        const start = Math.max(0, cursor.line - this.settings.contextLines);
        const end = Math.min(lines.length, cursor.line + this.settings.contextLines);
        return lines.slice(start, end).join('\n');
      }

      return lines.slice(0, this.settings.contextLines).join('\n');
    } catch (error) {
      console.error('Error getting document context:', error);
      return undefined;
    }
  }

  private refreshChatView() {
    const chatLeaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_CHAT)[0];
    if (chatLeaf && chatLeaf.view instanceof ChatView) {
      chatLeaf.view.refresh();
    }
  }

  async loadChatSessions() {
    try {
      const data = await this.loadData();
      if (data && data.chatSessions) {
        for (const session of data.chatSessions) {
          this.chatSessions.set(session.id, session);
        }
      }
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
    }
  }

  async saveChatSessions() {
    try {
      const sessionsArray = Array.from(this.chatSessions.values());
      const currentData = await this.loadData() || {};
      currentData.chatSessions = sessionsArray;
      await this.saveData(currentData);
    } catch (error) {
      console.error('Failed to save chat sessions:', error);
    }
  }

  getChatSessions(): ChatSession[] {
    return Array.from(this.chatSessions.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  deleteSession(sessionId: string) {
    this.chatSessions.delete(sessionId);
    if (this.currentSession && this.currentSession.id === sessionId) {
      this.currentSession = null;
    }
    this.saveChatSessions();
  }

  setCurrentSession(sessionId: string) {
    const session = this.chatSessions.get(sessionId);
    if (session) {
      this.currentSession = session;
    }
  }
}

class QuickChatModal extends Modal {
  private onSubmit: (message: string) => Promise<void>;
  private inputEl: HTMLTextAreaElement;

  constructor(app: any, onSubmit: (message: string) => Promise<void>) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: 'Quick Chat' });

    this.inputEl = contentEl.createEl('textarea', {
      attr: {
        placeholder: 'Type your message here...',
        rows: '4',
        style: 'width: 100%; margin: 10px 0; padding: 8px; border: 1px solid var(--background-modifier-border); border-radius: 4px;'
      }
    });

    const buttonContainer = contentEl.createEl('div', {
      attr: { style: 'display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px;' }
    });

    buttonContainer.createEl('button', {
      text: 'Cancel',
      attr: { style: 'padding: 6px 12px;' }
    }).onclick = () => this.close();

    const sendButton = buttonContainer.createEl('button', {
      text: 'Send',
      attr: { style: 'padding: 6px 12px; background: var(--interactive-accent); color: var(--text-on-accent); border: none; border-radius: 4px;' }
    });
    
    sendButton.onclick = async () => {
      const message = this.inputEl.value.trim();
      if (message) {
        await this.onSubmit(message);
        this.close();
      }
    };

    this.inputEl.focus();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}