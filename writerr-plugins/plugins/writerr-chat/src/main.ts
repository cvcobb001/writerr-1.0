import { Plugin, WorkspaceLeaf, TFile, Notice, Modal } from 'obsidian';
import { WriterrlChatSettingsTab } from './settings';
import { ChatView, VIEW_TYPE_CHAT } from './chat-view';
import { ChatSession, ChatMessage, AIProvider, WriterrlGlobalAPI, IntakePayload } from '@shared/types';
import { generateId } from '@shared/utils';

// Enhanced types for Editorial Engine integration
interface ParsedMessage {
  originalContent: string;
  intent: 'chat' | 'edit' | 'improve' | 'analyze';
  mode: string;
  selection?: string;
  hasEditingRequest: boolean;
}

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
  selectedModel: string;
  selectedPrompt: string;
  editorialEngineSettings?: {
    useSequentialProcessing: boolean;
    sequentialConfig: {
      delayMs: number;
      chunkStrategy: 'word-boundary' | 'sentence-boundary' | 'paragraph-boundary';
      performanceTarget: number;
      maxOperations: number;
    };
    fallbackToAPI: boolean;
  };
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
  theme: 'default',
  selectedModel: '',
  selectedPrompt: '',
  editorialEngineSettings: {
    useSequentialProcessing: true,
    sequentialConfig: {
      delayMs: 50,
      chunkStrategy: 'word-boundary',
      performanceTarget: 5000,
      maxOperations: 500
    },
    fallbackToAPI: true
  }
};

// Build verification system
const BUILD_TIMESTAMP = Date.now();
const BUILD_VERSION = "v2.0.1-fix-ai-providers";
console.log(`🔧 Writerr Chat Build: ${BUILD_VERSION} (${new Date(BUILD_TIMESTAMP).toISOString()})`);

export default class WriterrlChatPlugin extends Plugin {
  settings: WriterrlChatSettings;
  currentSession: ChatSession | null = null;
  chatSessions: Map<string, ChatSession> = new Map();

  async onload() {
    console.log(`🚀 LOADING Writerr Chat ${BUILD_VERSION} - Build: ${new Date(BUILD_TIMESTAMP).toISOString()}`);
    
    await this.loadSettings();

    // Force load CSS styles
    this.loadCustomStyles();

    // Initialize global API
    this.initializeGlobalAPI();

    // Register view
    this.registerView(VIEW_TYPE_CHAT, (leaf) => new ChatView(leaf, this));

    // Add commands
    this.addCommands();

    // Add ribbon icon - updated to messageSquare for consistency
    this.addRibbonIcon('message-square', 'Open Writerr Chat', () => {
      this.openChat();
    });

    // Add settings tab
    this.addSettingTab(new WriterrlChatSettingsTab(this.app, this));

    // Load chat sessions
    await this.loadChatSessions();

    // Listen for Editorial Engine availability
    this.listenForEditorialEngine();

    console.log(`✅ LOADED Writerr Chat ${BUILD_VERSION} successfully`);
  }

  private loadCustomStyles(): void {
    const styles = `
/* Nuclear CSS - Override EVERYTHING */
.writerr-send-button,
.writerr-toolbar-button,
.writerr-context-action,
.context-add-button,
.writerr-message-actions button,
.chat-control-button {
  background: none !important;
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
  padding: 0 !important;
  margin: 0 !important;
  cursor: pointer !important;
  color: var(--text-faint) !important;
  transition: all 0.2s ease !important;
}

/* Send Button - Lifted off the edges */
.writerr-send-button {
  position: absolute !important;
  right: 16px !important;
  bottom: 16px !important;
  padding: 8px !important;
  border-radius: var(--radius-s) !important;
}

.writerr-send-button:hover:not(:disabled) {
  color: var(--interactive-accent) !important;
  background: var(--background-modifier-hover) !important;
}

.writerr-send-button:disabled {
  color: var(--text-faint) !important;
  cursor: not-allowed !important;
}

.writerr-send-icon {
  width: 16px !important;
  height: 16px !important;
  stroke-width: 2 !important;
}

/* TOOLBAR CONTAINER - FORCE FLEX LAYOUT */
.chat-toolbar-container {
  border-top: none !important;
  border: none !important;
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  padding: 8px 0 8px 12px !important;
  background: var(--background-primary) !important;
  font-size: 12px !important;
  color: var(--text-faint) !important;
  min-height: 44px !important;
  overflow: hidden !important;
}

/* Bottom Toolbar Left - Tools Section - Subtle Gray */
.writerr-toolbar-left {
  display: flex !important;
  align-items: center !important;
  gap: 4px !important;
  flex-shrink: 0 !important;
  margin-left: 0 !important;
  padding-left: 0 !important;
}

/* Toolbar Right - Dropdowns and Counter - Subtle Gray */
.toolbar-right {
  display: flex !important;
  align-items: center !important;
  gap: 4px !important;
  flex: 1 !important;
  justify-content: flex-end !important;
  min-width: 0 !important;
  overflow: hidden !important;
  margin-right: 8px !important;
}

.writerr-toolbar-button {
  padding: 6px !important;
  border-radius: var(--radius-s) !important;
  color: var(--text-faint) !important;
}

.writerr-toolbar-button:hover {
  color: var(--text-normal) !important;
  background: var(--background-modifier-hover) !important;
}

.writerr-toolbar-icon {
  width: 16px !important;
  height: 16px !important;
  stroke-width: 2 !important;
}

/* Chat Input Container - NO BORDERS */
.chat-input-container {
  border-top: none !important;
  border-bottom: none !important;
  border: none !important;
}

.chat-message-input {
  border: 1px solid var(--background-modifier-border) !important;
  padding-right: 60px !important;
}

/* Context Area - Subtle styling */
.context-header {
  border-top: 1px solid var(--background-modifier-border) !important;
  padding-top: 8px !important;
  color: var(--text-faint) !important;
}

.context-collapse-icon {
  color: var(--text-faint) !important;
}

.context-header:hover .context-collapse-icon {
  color: var(--text-muted) !important;
}

/* Context label subtle */
.context-header span {
  color: var(--text-faint) !important;
}

.context-header:hover span {
  color: var(--text-muted) !important;
}

/* Header - NO CARET */
.writerr-chat-header-left {
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
}

.writerr-mode-select-wrapper {
  display: flex !important;
  align-items: center !important;
  cursor: pointer !important;
}

.writerr-mode-select {
  background: none !important;
  border: none !important;
  padding: 0 !important;
  margin: 0 !important;
  font-size: 18px !important;
  font-weight: 500 !important;
  color: var(--text-normal) !important;
  cursor: pointer !important;
  outline: none !important;
  box-shadow: none !important;
  appearance: none !important;
  -webkit-appearance: none !important;
  -moz-appearance: none !important;
}

/* REMOVE THE CARET COMPLETELY */
.writerr-mode-caret {
  display: none !important;
}

/* Token Counter - Subtle */
.writerr-token-count {
  font-size: var(--font-ui-smaller) !important;
  color: var(--text-faint) !important;
  font-variant-numeric: tabular-nums !important;
  font-family: var(--font-monospace) !important;
  font-feature-settings: "tnum" !important;
  margin-right: 6px !important;
}


/* Dropdown hover styles */
select:hover {
  color: var(--text-normal) !important;
}

.toolbar-right select:hover + div {
  color: var(--text-normal) !important;
}

/* Context Add Button - Subtle Gray */
.context-add-button {
  padding: 4px !important;
  border-radius: var(--radius-s) !important;
  color: var(--text-faint) !important;
}

.context-add-button:hover {
  color: var(--text-normal) !important;
  background: var(--background-modifier-hover) !important;
}

/* Context Action Button - Subtle */
.writerr-context-action {
  padding: 4px !important;
  position: absolute !important;
  top: 8px !important;
  right: 16px !important;
  z-index: 10 !important;
  border-radius: var(--radius-s) !important;
  color: var(--text-faint) !important;
}

.writerr-context-action:hover {
  color: var(--text-normal) !important;
  background: var(--background-modifier-hover) !important;
}

.writerr-context-action:disabled {
  opacity: 0.3 !important;
  cursor: not-allowed !important;
  pointer-events: none !important;
}

.writerr-context-action-icon {
  width: 18px !important;
  height: 18px !important;
  stroke-width: 2 !important;
}

/* Message Icons */
.writerr-message-icon {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 32px !important;
  height: 32px !important;
  flex-shrink: 0 !important;
  color: var(--text-muted) !important;
}

.writerr-message-avatar {
  width: 20px !important;
  height: 20px !important;
  stroke-width: 2 !important;
}

/* Message Actions */
.writerr-message-actions {
  display: flex !important;
  gap: 4px !important;
  margin-top: 6px !important;
  opacity: 1 !important;
  pointer-events: auto !important;
}

.writerr-message-actions button {
  padding: 4px !important;
  border-radius: var(--radius-s) !important;
}

.writerr-message-actions button:hover {
  color: var(--text-normal) !important;
  background: var(--background-modifier-hover) !important;
}

.writerr-action-icon {
  width: 14px !important;
  height: 14px !important;
  stroke-width: 2 !important;
}

/* Chat Control Buttons - Header Icons - KEEP DARK */
.chat-control-button {
  padding: 8px !important;
  border-radius: var(--radius-s) !important;
  color: var(--text-normal) !important; /* Override subtle gray - keep header icons dark */
}

.chat-control-button:hover {
  color: var(--text-normal) !important;
  background: var(--background-modifier-hover) !important;
}

/* Hide settings button */
.chat-control-button:last-child {
  display: none !important;
}

/* Clean menu styling - no debug colors */
`;

    // Force remove any existing styles and recreate with timestamp
    const timestamp = Date.now();
    const existing = document.getElementById('writerr-chat-styles');
    if (existing) existing.remove();

    // Force reflow
    document.body.offsetHeight;

    const styleEl = document.createElement('style');
    styleEl.id = 'writerr-chat-styles';
    styleEl.setAttribute('data-timestamp', timestamp.toString());
    document.head.appendChild(styleEl);
    styleEl.textContent = styles;
    
    console.log(`Writerr Chat: DEBUG CSS applied at ${timestamp} - looking for menu selectors`);
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
    // Note: Settings now used directly with AI Providers plugin
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
      // Open in right sidebar as per design reference
      const leaf = this.app.workspace.getRightLeaf(false);
      
      if (leaf) {
        await leaf.setViewState({
          type: VIEW_TYPE_CHAT,
          active: true
        });
        this.app.workspace.revealLeaf(leaf);
        return;
      }

      // Fallback: Create new leaf in right sidebar
      const rightLeaf = this.app.workspace.getLeaf('split', 'right');
      if (rightLeaf) {
        await rightLeaf.setViewState({
          type: VIEW_TYPE_CHAT,
          active: true
        });
        this.app.workspace.revealLeaf(rightLeaf);
        return;
      }

      console.error('Failed to create chat view in sidebar');

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

  async sendMessage(content: string, selectedMode?: string, context?: string): Promise<void> {
    if (!this.currentSession) {
      this.newChatSession();
    }

    if (!this.currentSession) return;

    // Parse message for intent and mode selection
    const parsedMessage = this.parseMessageIntent(content);
    
    // Override mode if explicitly provided from UI
    if (selectedMode && selectedMode !== 'chat') {
      parsedMessage.mode = selectedMode;
    }

    // Add user message
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: Date.now(),
      metadata: {
        intent: parsedMessage.intent,
        requestedMode: parsedMessage.mode,
        selectedMode: selectedMode,
        hasSelection: !!parsedMessage.selection
      }
    };

    this.currentSession.messages.push(userMessage);

    // Get context from current file if requested
    let fullContext = context;
    if (!fullContext && this.settings.contextLines > 0) {
      fullContext = await this.getDocumentContext();
    }

    try {
      // Route based on selected mode from UI - Editorial Engine is default, Chat is the exception
      if (selectedMode === 'chat') {
        // Only use chat processing when explicitly in Chat mode
        await this.processWithAIProvider(parsedMessage, fullContext);
      } else {
        // Everything else goes through Editorial Engine (Proofreader, Copy Editor, etc.)
        await this.processWithEditorialEngine(parsedMessage, fullContext);
      }

      this.currentSession.updatedAt = Date.now();

      if (this.settings.autoSaveChats) {
        await this.saveChatSessions();
      }

      // Refresh chat view if open
      this.refreshChatView();

      // Emit chat event
      if (window.Writerr?.events) {
        window.Writerr.events.emit('chat.response-ready', {
          requestId: userMessage.id,
          response: this.currentSession.messages[this.currentSession.messages.length - 1]
        });
      }

    } catch (error) {
      new Notice(`Error sending message: ${error.message}`);
      console.error('Chat error:', error);
      
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
      
      this.currentSession.messages.push(errorMessage);
      this.refreshChatView();
    }
  }    // Get context from current file if requested\n    let fullContext = context;\n    if (!fullContext && this.settings.contextLines > 0) {\n      fullContext = await this.getDocumentContext();\n    }\n\n    try {\n      // Check if this should be processed through Editorial Engine\n      if (parsedMessage.intent === 'edit' || parsedMessage.intent === 'improve') {\n        await this.processWithEditorialEngine(parsedMessage, fullContext);\n      } else {\n        // Standard chat processing\n        await this.processWithAIProvider(parsedMessage, fullContext);\n      }\n\n      this.currentSession.updatedAt = Date.now();\n\n      if (this.settings.autoSaveChats) {\n        await this.saveChatSessions();\n      }\n\n      // Refresh chat view if open\n      this.refreshChatView();\n\n      // Emit chat event\n      if (window.Writerr?.events) {\n        window.Writerr.events.emit('chat.response-ready', {\n          requestId: userMessage.id,\n          response: this.currentSession.messages[this.currentSession.messages.length - 1]\n        });\n      }\n\n    } catch (error) {\n      new Notice(`Error sending message: ${error.message}`);\n      console.error('Chat error:', error);\n      \n      // Add error message to chat\n      const errorMessage: ChatMessage = {\n        id: generateId(),\n        role: 'assistant',\n        content: `I encountered an error: ${error.message}. Please try again.`,\n        timestamp: Date.now(),\n        metadata: {\n          error: true,\n          errorMessage: error.message\n        }\n      };\n      \n      this.currentSession.messages.push(errorMessage);\n      this.refreshChatView();\n    }\n  }

  private parseMessageIntent(content: string): ParsedMessage {
    const lowerContent = content.toLowerCase();
    
    // Extract potential text selection (common patterns)
    const selectionMatch = content.match(/["']([^"']+)["']|`([^`]+)`/);
    const selection = selectionMatch?.[1] || selectionMatch?.[2];
    
    // Extract mode requests
    const modeMatch = content.match(/(?:use|with|in)\s+(proofreader|copy-editor|developmental-editor|creative-writing-assistant)\s+mode/i);
    const requestedMode = modeMatch?.[1];
    
    // Determine intent based on keywords
    let intent: 'chat' | 'edit' | 'improve' | 'analyze' = 'chat';
    
    if (lowerContent.includes('edit') || lowerContent.includes('fix') || lowerContent.includes('correct')) {
      intent = 'edit';
    } else if (lowerContent.includes('improve') || lowerContent.includes('enhance') || lowerContent.includes('rewrite')) {
      intent = 'improve';
    } else if (lowerContent.includes('analyze') || lowerContent.includes('review') || lowerContent.includes('check')) {
      intent = 'analyze';
    }
    
    return {
      originalContent: content,
      intent,
      mode: requestedMode || this.settings.defaultMode || 'proofreader',
      selection,
      hasEditingRequest: intent !== 'chat'
    };
  }

  private async processWithEditorialEngine(parsedMessage: ParsedMessage, context?: string): Promise<void> {
    // Check if Editorial Engine is available
    if (!window.Writerr?.editorial) {
      throw new Error('Editorial Engine is not available. Please ensure the Editorial Engine plugin is loaded.');
    }

    // Emit processing event
    if (window.Writerr.events) {
      window.Writerr.events.emit('chat.request-processing', {
        requestId: this.currentSession!.messages[this.currentSession!.messages.length - 1].id,
        message: this.currentSession!.messages[this.currentSession!.messages.length - 1],
        mode: parsedMessage.mode
      });
    }

    try {
      // Prepare Editorial Engine payload
      const payload: IntakePayload = {
        id: generateId(),
        timestamp: Date.now(),
        sessionId: this.currentSession!.id,
        instructions: parsedMessage.originalContent, // The user's message/request
        sourceText: parsedMessage.selection || context || '', // The text to be edited
        mode: parsedMessage.mode,
        context: {
          documentPath: this.app.workspace.getActiveFile()?.path || '',
          surroundingText: context
        },
        preferences: {
          constraints: await this.getConstraintsForMode(parsedMessage.mode)
        },
        metadata: {
          source: 'writerr-chat',
          intent: parsedMessage.intent
        }
      };

      // Process through Editorial Engine
      const result = await window.Writerr.editorial.process(payload);

      if (result.success) {
        // Create assistant response with Editorial Engine results
        const assistantMessage: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: this.formatEditorialEngineResponse(result, parsedMessage),
          timestamp: Date.now(),
          metadata: {
            editorialEngineResult: true,
            jobId: result.jobId,
            mode: parsedMessage.mode,
            processingTime: result.processingTime
          }
        };

        this.currentSession!.messages.push(assistantMessage);

        // CRITICAL FIX: Send results to Track Edits for document integration
        await this.integrateWithTrackEdits(result, parsedMessage);
      } else {
        throw new Error(`Editorial Engine processing failed: ${result.errors?.map(e => e.message).join(', ')}`);
      }
    } catch (error) {
      console.error('Editorial Engine processing error:', error);
      throw error;
    }
  }

  private async integrateWithTrackEdits(editorialEngineResult: any, parsedMessage: ParsedMessage): Promise<void> {
    try {
      // Check if Track Edits is available
      if (!window.WriterrlAPI?.trackEdits) {
        console.warn('Track Edits plugin not available - Editorial Engine results will not be applied to document');
        return;
      }

      // Check if there are changes to apply
      if (!editorialEngineResult.changes || editorialEngineResult.changes.length === 0) {
        console.log('No changes from Editorial Engine to apply to document');
        return;
      }

      console.log('Integrating Editorial Engine results with Track Edits using sequential processing:', {
        changesCount: editorialEngineResult.changes.length,
        mode: parsedMessage.mode
      });

      // Get the current active file
      const activeFile = this.app.workspace.getActiveFile();
      if (!activeFile) {
        console.warn('No active file - cannot apply Editorial Engine changes to document');
        return;
      }

      // Get the active editor
      const activeLeaf = this.app.workspace.getActiveViewOfType(require('obsidian').MarkdownView);
      if (!activeLeaf || !activeLeaf.editor) {
        console.warn('No active editor - cannot apply Editorial Engine changes to document');
        return;
      }

      const editor = activeLeaf.editor;
      
      // Prepare Editorial Engine integration with Sequential Processing
      const useSequentialProcessing = this.settings.editorialEngineSettings?.useSequentialProcessing !== false;
      const sequentialConfig = this.settings.editorialEngineSettings?.sequentialConfig || {
        delayMs: 50,
        chunkStrategy: 'word-boundary',
        performanceTarget: 5000,
        maxOperations: 500
      };

      if (useSequentialProcessing) {
        try {
          // Use SequentialTextProcessor for granular Track Edits detection
          await this.applyChangesSequentially(editorialEngineResult, editor, sequentialConfig);
          
          console.log(`Successfully applied ${editorialEngineResult.changes.length} changes from Editorial Engine using sequential processing`);
        } catch (sequentialError) {
          console.warn('Sequential processing failed, falling back to API approach:', sequentialError.message);
          await this.applyChangesViaAPI(editorialEngineResult, parsedMessage);
        }
      } else {
        // Fallback to original API approach
        await this.applyChangesViaAPI(editorialEngineResult, parsedMessage);
      }

      // Emit integration success event
      if (window.Writerr.events) {
        window.Writerr.events.emit('chat.editorial-engine-integration-success', {
          jobId: editorialEngineResult.jobId,
          changesApplied: editorialEngineResult.changes.length,
          mode: parsedMessage.mode,
          sessionId: this.currentSession?.id,
          method: useSequentialProcessing ? 'sequential' : 'api'
        });
      }

    } catch (error) {
      console.error('Track Edits integration error:', error);
      
      // Emit integration failure event
      if (window.Writerr.events) {
        window.Writerr.events.emit('chat.editorial-engine-integration-failure', {
          error: error.message,
          mode: parsedMessage.mode,
          sessionId: this.currentSession?.id
        });
      }

      // Don't throw - integration failure shouldn't break the chat response
      console.warn('Editorial Engine results displayed in chat but could not be applied to document');
    }
  }

  /**
   * Apply changes using SequentialTextProcessor for granular Track Edits detection
   */
  private async applyChangesSequentially(
    editorialEngineResult: any, 
    editor: any, 
    sequentialConfig: any
  ): Promise<void> {
    // Import the SequentialTextProcessor
    const { SequentialTextProcessor } = await import('../../editorial-engine/src/sequential-text-processor');
    
    // Create processor with configuration
    const processor = new SequentialTextProcessor({
      delayMs: sequentialConfig.delayMs,
      chunkStrategy: sequentialConfig.chunkStrategy,
      performanceTarget: sequentialConfig.performanceTarget,
      maxOperations: sequentialConfig.maxOperations
    });

    // Create an adapter for the Obsidian editor
    const obsidianEditorAdapter = {
      getValue: () => editor.getValue(),
      replaceRange: (text: string, from: any, to?: any) => {
        if (to) {
          editor.replaceRange(text, from, to);
        } else {
          editor.replaceRange(text, from);
        }
      }
    };

    // Process each change sequentially
    for (const change of editorialEngineResult.changes) {
      try {
        // Get current document state
        const currentText = editor.getValue();
        
        // Calculate target text by applying this change
        const targetText = this.applyChangeToText(currentText, change);
        
        // Use SequentialTextProcessor to apply change with human-like typing
        await processor.simulateHumanEditing(
          currentText,
          targetText,
          obsidianEditorAdapter
        );

        // Record change in Track Edits if available
        if (window.WriterrlAPI?.trackEdits) {
          const trackEditsChange = {
            id: change.id || `seq-${Date.now()}`,
            type: change.type || 'edit',
            range: change.range,
            originalText: change.originalText || '',
            newText: change.newText || '',
            confidence: change.confidence || 0.9,
            reasoning: change.reasoning || `Sequential processing via Editorial Engine`,
            source: 'editorial-engine-sequential',
            timestamp: Date.now(),
            metadata: {
              editorialEngineJobId: editorialEngineResult.jobId,
              sequentialProcessing: true
            }
          };
          
          // Track the change without applying it (since we already applied it sequentially)
          await window.WriterrlAPI.trackEdits.recordChange?.(trackEditsChange);
        }
        
      } catch (error) {
        console.warn(`Failed to apply change ${change.id} sequentially:`, error);
        throw error;
      }
    }
  }

  /**
   * Apply a single change to text (helper method)
   */
  private applyChangeToText(text: string, change: any): string {
    const { range, originalText, newText, type } = change;
    
    if (range && range.from !== undefined && range.to !== undefined) {
      // Use position-based replacement
      return text.substring(0, range.from) + (newText || '') + text.substring(range.to);
    } else if (originalText && newText !== undefined) {
      // Use text-based replacement
      return text.replace(originalText, newText);
    } else if (type === 'insert' && newText) {
      // Insert at beginning if no position specified
      return newText + text;
    }
    
    return text;
  }

  /**
   * Fallback method: Apply changes via original API approach
   */
  private async applyChangesViaAPI(editorialEngineResult: any, parsedMessage: ParsedMessage): Promise<void> {
    console.log('Applying changes via Track Edits API (fallback method)');
    
    // Apply changes through Track Edits API (original approach)
    for (const change of editorialEngineResult.changes) {
      // Convert Editorial Engine change format to Track Edits format
      const trackEditsChange = {
        id: change.id || generateId(),
        type: change.type || 'edit',
        range: change.range,
        originalText: change.originalText,
        newText: change.newText,
        confidence: change.confidence || 0.9,
        reasoning: change.reasoning || `Applied via Editorial Engine (${parsedMessage.mode} mode)`,
        source: 'editorial-engine-via-chat',
        timestamp: Date.now(),
        metadata: {
          editorialEngineJobId: editorialEngineResult.jobId,
          mode: parsedMessage.mode,
          chatSessionId: this.currentSession?.id,
          fallbackMethod: true
        }
      };

      // Apply the change through Track Edits platform API
      await window.WriterrlAPI.trackEdits.applyChange(trackEditsChange);
    }
  }

  private async processWithAIProvider(parsedMessage: ParsedMessage, context?: string): Promise<void> {
    console.log(`🎯 [${BUILD_VERSION}] processWithAIProvider ENTRY - Using provider OBJECT method`);
    
    // Get AI Providers plugin and SDK - back to original approach
    const aiProvidersPlugin = (this.app as any).plugins?.plugins?.['ai-providers'];
    if (!aiProvidersPlugin) {
      console.log('❌ AI Providers plugin not found');
      throw new Error('AI Providers plugin not available. Please ensure it is installed and enabled.');
    }
    
    // Access the aiProviders SDK object (same as toolbar)
    const aiProviders = aiProvidersPlugin.aiProviders;
    if (!aiProviders) {
      throw new Error('AI Providers SDK not available in plugin');
    }

    // Get the current provider selection from settings or use the first available
    let providerObject: any = null;
    let selectedModel = 'gpt-4'; // fallback
    
    // First try: Use selected provider from settings
    if (this.settings.selectedModel && this.settings.selectedModel.includes(':')) {
      const [providerId, modelName] = this.settings.selectedModel.split(':');
      selectedModel = modelName;
      console.log(`🔍 Looking for provider: ${providerId}, model: ${modelName}`);
      
      if (aiProviders.providers && Array.isArray(aiProviders.providers)) {
        providerObject = aiProviders.providers.find((p: any) => 
          p.id === providerId || p.name === providerId
        );
      }
      
      console.log(providerObject ? '✅ Found selected provider' : '❌ Selected provider not found');
    }
    
    // Fallback: Use first available provider
    if (!providerObject && aiProviders.providers && Array.isArray(aiProviders.providers) && aiProviders.providers.length > 0) {
      providerObject = aiProviders.providers[0];
      console.log('🔄 Using first available provider:', providerObject?.name || providerObject?.id);
    }
    
    if (!providerObject) {
      throw new Error('No AI providers configured');
    }

    // Convert messages array to single prompt string (working API format)
    let prompt = '';
    
    // Add context if provided
    if (context) {
      prompt += `Context from current document:\n${context}\n\n`;
    }
    
    // Add conversation history
    const conversationMessages = this.currentSession!.messages;
    if (conversationMessages.length > 0) {
      prompt += 'Previous conversation:\n';
      for (const msg of conversationMessages) {
        prompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
      }
      prompt += '\n';
    }
    
    // Add current user message
    prompt += `User request: ${parsedMessage.originalContent}`;

    try {
      console.log(`🎯 [${BUILD_VERSION}] EXECUTE with provider OBJECT (working API format):`, {
        provider: providerObject?.name || providerObject?.id,
        model: selectedModel,
        promptLength: prompt.length
      });
      
      // Use AI Providers SDK with the WORKING API format from commit 26a97a2
      const response = await aiProviders.execute({
        provider: providerObject, // Pass the actual provider object
        prompt: prompt,           // Single prompt string (not messages array)
        model: selectedModel,     // Specific model name
        onProgress: (chunk: string, full: string) => {
          console.log(`🎯 [${BUILD_VERSION}] Streaming chunk:`, chunk.length, 'chars');
        }
      });

      console.log(`🎯 [${BUILD_VERSION}] AI response SUCCESS:`, response?.length || 0, 'characters');

      // Validate response
      if (!response || typeof response !== 'string' || response.trim().length === 0) {
        throw new Error(`AI Provider returned empty or invalid response: ${JSON.stringify(response)}`);
      }

      // Create assistant response
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
        metadata: {
          aiProvidersUsed: true,
          provider: providerObject.name || providerObject.id,
          providerType: providerObject.type || 'unknown',
          model: selectedModel,
          buildVersion: BUILD_VERSION
        }
      };

      this.currentSession!.messages.push(assistantMessage);
      
      // Update token counter with estimated values (since working API doesn't return usage)
      if (this.chatView?.chatToolbar) {
        const estimatedTokens = Math.ceil(response.length / 4);
        this.chatView.chatToolbar.updateTokenCounter(estimatedTokens, this.settings.maxTokens || 2000);
      }
      
    } catch (error) {
      console.error(`🎯 [${BUILD_VERSION}] AI Providers ERROR:`, error);
      throw new Error(`AI processing failed: ${error.message}`);
    }
  }

  private updateTokenCounterFromResponse(response: any): void {
    try {
      const tokensUsed = response?.usage?.totalTokens || response?.usage?.total_tokens || 0;
      const maxTokens = this.settings.maxTokens || 2000;
      
      // Find the chat view and update its token counter
      const chatView = this.app.workspace.getLeavesOfType(VIEW_TYPE_CHAT)[0]?.view as ChatView;
      if (chatView && chatView.chatToolbar) {
        chatView.chatToolbar.updateTokenCounter(tokensUsed, maxTokens);
      }
    } catch (error) {
      console.error('Error updating token counter:', error);
    }
  }

  private formatEditorialEngineResponse(result: any, parsedMessage: ParsedMessage): string {
    let response = '';

    // Add mode indicator
    response += `**${parsedMessage.mode.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} Analysis:**\n\n`;

    if (result.result?.processedText) {
      response += '**Processed Text:**\n';
      response += `> ${result.result.processedText}\n\n`;
    }

    if (result.result?.changes && result.result.changes.length > 0) {
      response += '**Changes Made:**\n';
      for (const change of result.result.changes.slice(0, 5)) { // Limit to first 5 changes
        response += `- **${change.type}** at position ${change.from}-${change.to}: "${change.text || change.removedText}"\n`;
      }
      
      if (result.result.changes.length > 5) {
        response += `- *... and ${result.result.changes.length - 5} more changes*\n`;
      }
      response += '\n';
    }

    if (result.metadata?.trackEditsSession) {
      response += `*Changes have been applied to your document and are being tracked in session ${result.metadata.trackEditsSession}.*\n\n`;
      response += '*You can accept or reject individual changes using the Track Edits side panel.*';
    }

    return response;
  }

  private async getConstraintsForMode(mode: string): Promise<any> {
    // Get mode constraints from Editorial Engine
    if (window.Writerr?.editorial) {
      const modeDefinition = window.Writerr.editorial.getMode(mode);
      return modeDefinition?.constraints || [];
    }
    return [];
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

  private listenForEditorialEngine() {
    // Check for Editorial Engine availability on startup
    setTimeout(() => {
      if (window.Writerr?.editorial) {
        this.refreshChatModes();
      }
    }, 1000);

    // Listen for Editorial Engine platform-ready event
    if (window.Writerr?.events) {
      window.Writerr.events.on('platform-ready', (data: any) => {
        if (data.plugin === 'editorial-engine') {
          console.log('Editorial Engine detected, refreshing chat modes...');
          this.refreshChatModes();
        }
      });

      window.Writerr.events.on('mode-registered', () => {
        this.refreshChatModes();
      });

      window.Writerr.events.on('mode-updated', () => {
        this.refreshChatModes();
      });

      window.Writerr.events.on('mode-removed', () => {
        this.refreshChatModes();
      });
    }

    // Fallback: periodic check for Editorial Engine
    const checkInterval = setInterval(() => {
      if (window.Writerr?.editorial) {
        this.refreshChatModes();
        clearInterval(checkInterval);
      }
    }, 3000);

    // Clear interval after 30 seconds to avoid indefinite checking
    setTimeout(() => {
      clearInterval(checkInterval);
    }, 30000);
  }

  private refreshChatModes() {
    // Find and refresh chat view modes
    const chatLeaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_CHAT);
    for (const leaf of chatLeaves) {
      if (leaf.view instanceof ChatView) {
        leaf.view.refreshModeOptions();
      }
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