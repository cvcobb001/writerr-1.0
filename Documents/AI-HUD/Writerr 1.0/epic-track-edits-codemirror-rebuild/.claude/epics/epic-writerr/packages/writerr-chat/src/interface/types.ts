/**
 * Core types and interfaces for the Writerr Chat system
 */

export interface ChatMode {
  id: string;
  name: string;
  description: string;
  icon?: string;
  prompt?: string;
  constraints?: string[];
  trackEditsIntegration?: boolean;
  capabilities?: ChatModeCapability[];
}

export interface ChatModeCapability {
  type: 'document-edit' | 'conversation' | 'analysis' | 'generation';
  enabled: boolean;
  config?: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  metadata?: ChatMessageMetadata;
}

export interface ChatMessageMetadata {
  mode?: string;
  documentContext?: DocumentContext;
  editSuggestions?: EditSuggestion[];
  processingTime?: number;
}

export interface DocumentContext {
  filePath?: string;
  selection?: TextSelection;
  documentType?: string;
  projectContext?: ProjectContext[];
}

export interface TextSelection {
  start: number;
  end: number;
  text: string;
}

export interface ProjectContext {
  filePath: string;
  relevance: number;
  relationship: string;
}

export interface EditSuggestion {
  id: string;
  type: 'replace' | 'insert' | 'delete';
  range: TextSelection;
  newText: string;
  reason: string;
  confidence: number;
}

export interface ChatSession {
  id: string;
  mode: string;
  messages: ChatMessage[];
  documentContext?: DocumentContext;
  createdAt: Date;
  lastActivity: Date;
}

export interface ChatState {
  currentSession: ChatSession | null;
  availableModes: ChatMode[];
  isLoading: boolean;
  error: string | null;
  sessionHistory: ChatSession[];
}

// Component Props
export interface ChatInterfaceProps {
  initialMode?: string;
  onModeChange?: (mode: ChatMode) => void;
  onMessageSend?: (message: string, mode: ChatMode) => Promise<void>;
  className?: string;
}

export interface ModeSelectorProps {
  modes: ChatMode[];
  currentMode: ChatMode | null;
  onModeChange: (mode: ChatMode) => void;
  disabled?: boolean;
  className?: string;
}

export interface MessageAreaProps {
  messages: ChatMessage[];
  isLoading?: boolean;
  className?: string;
}

export interface MessageInputProps {
  onSend: (message: string) => Promise<void>;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: number;
  className?: string;
}

export interface KeyboardShortcuts {
  send: string; // Default: 'Cmd+Enter' (Mac) or 'Ctrl+Enter' (Windows/Linux)
  newLine: string; // Default: 'Enter'
  focus: string; // Default: 'Cmd+K' (Mac) or 'Ctrl+K' (Windows/Linux)
}

// Mock data types for initial implementation
export interface MockChatMode extends Omit<ChatMode, 'id'> {
  id: string;
}

export interface ChatUIConfig {
  theme: 'light' | 'dark' | 'auto';
  fontSize: 'small' | 'medium' | 'large';
  compactMode: boolean;
  showTimestamps: boolean;
  keyboardShortcuts: KeyboardShortcuts;
}