import { ChatMessage } from '@shared/types';
import WriterrlChatPlugin from '../main';

export interface ComponentOptions {
  plugin: WriterrlChatPlugin;
  container: HTMLElement;
}

export interface MessageActionHandler {
  onCopy: (message: ChatMessage) => void;
  onRetry: (message: ChatMessage) => void;
  onInfo: (message: ChatMessage) => void;
}

export interface ChatComponent {
  container: HTMLElement;
  plugin: WriterrlChatPlugin;
  
  render(): void;
  destroy(): void;
}

export interface DocumentContext {
  name: string;
  path: string;
}

export interface ContextAreaEvents {
  onDocumentAdd: (doc: DocumentContext) => void;
  onDocumentRemove: (doc: DocumentContext) => void;
  onDocumentOpen: (doc: DocumentContext) => void;
}

export interface MessageListEvents {
  onMessageAction: MessageActionHandler;
}

export interface ChatInputEvents {
  onSend: (message: string, mode: string) => void;
  onModeChange: (mode: string) => void;
}

export interface HeaderEvents {
  onHistoryClick: () => void;
  onSettingsClick: () => void;
  onModeChange: (mode: string) => void;
  onSessionSelect?: (sessionId: string) => void;
  onNewSession?: () => void;
}