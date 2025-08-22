// Shared types for all Writerr Obsidian plugins

export interface WriterrlPlugin {
  id: string;
  name: string;
  version: string;
}

export interface EditChange {
  id: string;
  timestamp: number;
  type: 'insert' | 'delete' | 'replace';
  from: number;
  to: number;
  text?: string;
  removedText?: string;
  author?: string;
}

export interface EditSession {
  id: string;
  startTime: number;
  endTime?: number;
  changes: EditChange[];
  wordCount: number;
  characterCount: number;
}

export interface AIProvider {
  id: string;
  name: string;
  apiKey?: string;
  baseUrl?: string;
  model: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  context?: string;
}

export interface EditorialFunction {
  id: string;
  name: string;
  description: string;
  category: 'academic' | 'business' | 'fiction' | 'technical';
  prompt: string;
  parameters?: Record<string, any>;
}

export interface WritingMode {
  id: string;
  name: string;
  description: string;
  category: 'academic' | 'business' | 'fiction' | 'technical';
  systemPrompt: string;
  functions: EditorialFunction[];
}

// Global API for cross-plugin communication
export interface WriterrlGlobalAPI {
  trackEdits?: {
    getCurrentSession(): EditSession | null;
    getSessionHistory(): EditSession[];
    startTracking(): void;
    stopTracking(): void;
    exportSession(sessionId: string): string;
  };
  chat?: {
    openChat(): void;
    sendMessage(message: string, context?: string): Promise<void>;
    getCurrentSession(): ChatSession | null;
  };
  editorialFunctions?: {
    getFunctions(category?: string): EditorialFunction[];
    executeFunction(functionId: string, text: string, parameters?: Record<string, any>): Promise<string>;
    getModes(category?: string): WritingMode[];
    setMode(modeId: string): void;
  };
}

declare global {
  interface Window {
    WriterrlAPI: WriterrlGlobalAPI;
  }
}