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

// Editorial Engine Types
export interface IntakePayload {
  id: string;
  timestamp: number;
  sessionId: string;
  instructions: string;
  sourceText: string;
  mode: string;
  context: ProcessingContext;
  preferences: UserPreferences;
  metadata: Record<string, any>;
}

export interface ProcessingContext {
  documentPath: string;
  selectionRange?: { start: number; end: number };
  surroundingText?: string;
  documentMetadata?: Record<string, any>;
}

export interface UserPreferences {
  preferredStyle?: string;
  constraints?: string[];
  customRules?: Record<string, any>;
}

export interface JobResult {
  id: string;
  intakeId: string;
  success: boolean;
  processingTime: number;
  changes: EditChange[];
  conflicts: any[];
  provenance: any;
  summary: any;
  metadata: Record<string, any>;
}

export interface ModeDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  naturalLanguageRules: {
    allowed: string[];
    forbidden: string[];
    focus: string[];
    boundaries: string[];
  };
  examples?: any[];
  constraints?: any[];
  metadata: {
    category: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    tags: string[];
    useCase: string;
  };
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

// New Writerr Platform API (next generation)
export interface WritterrPlatformAPI {
  editorial?: {
    process(intake: IntakePayload): Promise<JobResult>;
    registerMode(mode: ModeDefinition): Promise<void>;
    getModes(): ModeDefinition[];
    getMode(id: string): ModeDefinition | undefined;
    registerAdapter(adapter: any): void;
    getStatus(): any;
    getPerformanceMetrics(): any;
  };
  chat?: any;
  trackEdits?: any;
  events?: {
    emit<T = any>(event: string, data: T): void;
    on<T = any>(event: string, handler: (data: T) => void): void;
    off(event: string, handler: Function): void;
    once<T = any>(event: string, handler: (data: T) => void): void;
  };
  settings?: any;
  utils?: any;
  version: string;
  plugins: {
    editorial?: { version: string; loaded: boolean; api?: any; };
    chat?: { version: string; loaded: boolean; api?: any; };
    trackEdits?: { version: string; loaded: boolean; api?: any; };
  };
}

declare global {
  interface Window {
    WriterrlAPI: WriterrlGlobalAPI;
    Writerr: WritterrPlatformAPI;
  }
}