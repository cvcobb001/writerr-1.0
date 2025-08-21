import { Plugin, WorkspaceLeaf, ItemView } from 'obsidian';
import { createRoot, Root } from 'react-dom/client';
import React from 'react';
import { globalRegistry, globalEventBus } from '@writerr/shared';
import { ChatInterface, ChatProvider } from './components';
import { ChatMode } from './interface/types';
import './ui/styles.css';

const CHAT_VIEW_TYPE = 'writerr-chat-view';
const CHAT_ICON = 'message-circle';

interface ChatViewState {
  currentMode?: string;
}

class ChatView extends ItemView {
  private root: Root | null = null;

  getViewType(): string {
    return CHAT_VIEW_TYPE;
  }

  getDisplayText(): string {
    return 'Writerr Chat';
  }

  getIcon(): string {
    return CHAT_ICON;
  }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    
    // Create React root
    this.root = createRoot(container);
    
    // Render the chat interface
    this.root.render(
      React.createElement(
        ChatProvider,
        {
          onModeChange: this.handleModeChange.bind(this),
          onMessageSend: this.handleMessageSend.bind(this)
        },
        React.createElement(ChatInterface, {
          className: 'writerr-chat-obsidian-view',
          onModeChange: this.handleModeChange.bind(this),
          onMessageSend: this.handleMessageSend.bind(this)
        })
      )
    );
  }

  async onClose() {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
  }

  private handleModeChange(mode: ChatMode): void {
    console.log('Mode changed to:', mode.id);
    
    // Emit event for other plugins to listen to
    globalEventBus.emit('chat-mode-changed', {
      modeId: mode.id,
      modeName: mode.name,
      capabilities: mode.capabilities
    });
    
    // Update view state if needed
    this.setState({ currentMode: mode.id });
  }

  private async handleMessageSend(message: string, mode: ChatMode): Promise<void> {
    console.log('Sending message in mode:', mode.id, 'Message:', message);
    
    try {
      // Emit event for message sending
      globalEventBus.emit('chat-message-send', {
        message,
        mode: mode.id,
        timestamp: new Date().toISOString()
      });

      // Here's where we would integrate with AI Providers plugin
      // For now, we'll just log that the message was sent
      console.log('Message sent successfully');
      
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  setState(state: Partial<ChatViewState>): void {
    // Store state for persistence if needed
    const currentState = this.getState() || {};
    const newState = { ...currentState, ...state };
    
    // Save to workspace state
    this.app.workspace.requestSaveLayout();
  }

  getState(): ChatViewState | null {
    // Return current state for persistence
    return {
      currentMode: 'chat' // Default mode
    };
  }
}

export default class WriterChatPlugin extends Plugin {
  async onload() {
    console.log('Loading Writerr Chat plugin');
    
    // Register plugin capabilities
    globalRegistry.register({
      id: 'writerr-chat',
      name: 'Writerr Chat',
      version: '1.0.0',
      capabilities: ['ai-chat', 'collaboration', 'real-time-messaging', 'mode-switching']
    });
    
    // Register the chat view
    this.registerView(
      CHAT_VIEW_TYPE,
      (leaf) => new ChatView(leaf)
    );

    // Add ribbon icon to open chat
    this.addRibbonIcon(CHAT_ICON, 'Writerr Chat', async () => {
      await this.activateChatView();
    });

    // Add command to open chat
    this.addCommand({
      id: 'open-writerr-chat',
      name: 'Open Writerr Chat',
      callback: async () => {
        await this.activateChatView();
      }
    });

    // Add command to focus chat input
    this.addCommand({
      id: 'focus-writerr-chat',
      name: 'Focus Writerr Chat Input',
      hotkeys: [{ modifiers: ['Mod'], key: 'k' }],
      callback: () => {
        this.focusChatInput();
      }
    });
    
    // Listen for relevant events
    globalEventBus.on('chat-message', (event) => {
      console.log('Chat message received:', event);
    });

    globalEventBus.on('document-selection-changed', (event) => {
      console.log('Document selection changed:', event);
      // TODO: Update document context in chat
    });

    // Auto-open chat view if it was previously open
    this.app.workspace.onLayoutReady(() => {
      const chatView = this.app.workspace.getLeavesOfType(CHAT_VIEW_TYPE)[0];
      if (!chatView) {
        // Optionally auto-open chat on startup
        // this.activateChatView();
      }
    });
  }

  onunload() {
    console.log('Unloading Writerr Chat plugin');
    globalRegistry.unregister('writerr-chat');
    
    // Clean up event listeners
    globalEventBus.off('chat-message');
    globalEventBus.off('document-selection-changed');
  }

  private async activateChatView(): Promise<void> {
    const { workspace } = this.app;
    
    let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType(CHAT_VIEW_TYPE);

    if (leaves.length > 0) {
      // If chat view already exists, focus it
      leaf = leaves[0];
    } else {
      // Create new chat view in right sidebar
      leaf = workspace.getRightLeaf(false);
      await leaf?.setViewState({
        type: CHAT_VIEW_TYPE,
        active: true,
      });
    }

    // Reveal and focus the chat view
    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }

  private focusChatInput(): void {
    // Focus the chat input if chat view is open
    const chatView = this.app.workspace.getLeavesOfType(CHAT_VIEW_TYPE)[0];
    if (chatView) {
      this.app.workspace.revealLeaf(chatView);
      
      // Dispatch focus event to chat interface
      const focusEvent = new CustomEvent('writerr-chat-focus-input');
      document.dispatchEvent(focusEvent);
    } else {
      // Open chat view and then focus
      this.activateChatView().then(() => {
        setTimeout(() => {
          const focusEvent = new CustomEvent('writerr-chat-focus-input');
          document.dispatchEvent(focusEvent);
        }, 100);
      });
    }
  }
}