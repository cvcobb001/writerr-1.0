/**
 * @fileoverview Core Chat Modes Implementation - Built-in functionality
 */

// Core mode validation and management
export { 
  CoreModeValidator,
  ModeTransitionContext,
  ModeValidationOptions 
} from './CoreModeValidator';

// Context preservation for mode switching
export { 
  ContextPreservation,
  PreservationStrategy,
  ContextSummary 
} from './ContextPreservation';

// Advanced prompt engineering
export { 
  PromptEngineering,
  PromptContext,
  PromptOptimization 
} from './PromptEngineering';

// Utility functions for core modes
export const CORE_MODES = {
  CHAT: 'chat',
  COPY_EDIT: 'copy-edit', 
  PROOFREAD: 'proofread',
  WRITING_ASSISTANT: 'writing-assistant'
} as const;

export const MODE_METADATA = {
  [CORE_MODES.CHAT]: {
    name: 'Chat',
    description: 'Pure conversational AI assistant',
    makesEdits: false,
    icon: 'message-circle',
    color: '#10b981',
    category: 'conversation'
  },
  [CORE_MODES.COPY_EDIT]: {
    name: 'Copy Edit',
    description: 'Structure, style, and clarity improvements',
    makesEdits: true,
    icon: 'edit-3',
    color: '#3b82f6',
    category: 'editing'
  },
  [CORE_MODES.PROOFREAD]: {
    name: 'Proofread',
    description: 'Grammar, punctuation, and spelling corrections',
    makesEdits: true,
    icon: 'check-circle',
    color: '#ef4444',
    category: 'editing'
  },
  [CORE_MODES.WRITING_ASSISTANT]: {
    name: 'Writing Assistant',
    description: 'Creative collaboration and content development',
    makesEdits: true,
    icon: 'feather',
    color: '#8b5cf6',
    category: 'creative'
  }
} as const;

export type CoreModeId = typeof CORE_MODES[keyof typeof CORE_MODES];

/**
 * Check if a mode ID is a core mode
 */
export function isCoreMode(modeId: string): modeId is CoreModeId {
  return Object.values(CORE_MODES).includes(modeId as CoreModeId);
}

/**
 * Get metadata for a core mode
 */
export function getCoreMode(modeId: CoreModeId) {
  return MODE_METADATA[modeId];
}

/**
 * Get all core mode IDs
 */
export function getAllCoreMode() {
  return Object.values(CORE_MODES);
}

/**
 * Get editing modes only
 */
export function getEditingMode() {
  return [CORE_MODES.COPY_EDIT, CORE_MODES.PROOFREAD, CORE_MODES.WRITING_ASSISTANT];
}

/**
 * Get non-editing modes only
 */
export function getNonEditingMode() {
  return [CORE_MODES.CHAT];
}