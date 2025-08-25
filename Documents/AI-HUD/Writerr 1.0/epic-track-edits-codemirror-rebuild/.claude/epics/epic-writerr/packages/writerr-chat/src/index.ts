/**
 * Writerr Chat - Main Entry Point
 * Export all public components, interfaces, and utilities
 */

// Components
export {
  ChatInterface,
  ChatProvider,
  useChatContext,
  ModeSelector,
  MessageArea,
  MessageInput
} from './components';

// Types and interfaces
export type {
  ChatMode,
  ChatMessage,
  ChatSession,
  ChatState,
  ChatInterfaceProps,
  ModeSelectorProps,
  MessageAreaProps,
  MessageInputProps,
  DocumentContext,
  EditSuggestion,
  KeyboardShortcuts,
  ChatUIConfig
} from './interface/types';

// Mock data and utilities
export {
  MOCK_MODES,
  DEFAULT_MODE_ID,
  getModeById,
  getDefaultMode
} from './interface/mock-modes';

export {
  DEFAULT_KEYBOARD_SHORTCUTS,
  matchesShortcut,
  generateId,
  formatTimestamp,
  truncateText,
  debounce,
  isObsidianEnvironment,
  getModifierKeyName,
  cn
} from './ui/utils';

// Styles (import path for consuming applications)
export const CHAT_STYLES_PATH = './ui/styles.css';