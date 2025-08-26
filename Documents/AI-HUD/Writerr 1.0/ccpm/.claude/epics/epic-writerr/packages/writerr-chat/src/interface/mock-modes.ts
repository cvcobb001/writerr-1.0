/**
 * Mock modes for initial development and testing
 */

import { ChatMode } from './types';

export const MOCK_MODES: ChatMode[] = [
  {
    id: 'chat',
    name: 'Chat',
    description: 'Pure conversation with AI assistant for brainstorming and discussion',
    icon: '💬',
    prompt: 'You are a helpful writing assistant. Engage in conversation to help with ideas, feedback, and general writing support.',
    constraints: ['No document edits', 'Conversation only'],
    trackEditsIntegration: false,
    capabilities: [
      {
        type: 'conversation',
        enabled: true,
        config: { allowBrainstorming: true, provideFeedback: true }
      },
      {
        type: 'analysis',
        enabled: true,
        config: { analyzeContent: true, suggestImprovements: false }
      }
    ]
  },
  {
    id: 'copy-edit',
    name: 'Copy Edit',
    description: 'Structural and style improvements with tracked changes',
    icon: '✏️',
    prompt: 'You are a professional copy editor. Focus on structure, style, clarity, and flow. All edits will be tracked and can be accepted or rejected.',
    constraints: ['Must suggest specific edits', 'Focus on structure and style', 'No grammar-only changes'],
    trackEditsIntegration: true,
    capabilities: [
      {
        type: 'document-edit',
        enabled: true,
        config: { 
          editTypes: ['structure', 'style', 'clarity', 'flow'],
          requireJustification: true 
        }
      },
      {
        type: 'analysis',
        enabled: true,
        config: { analyzeContent: true, suggestImprovements: true }
      }
    ]
  },
  {
    id: 'proofread',
    name: 'Proofread',
    description: 'Grammar, spelling, and mechanics corrections with minimal changes',
    icon: '🔍',
    prompt: 'You are a meticulous proofreader. Focus on grammar, spelling, punctuation, and basic mechanics. Make minimal, precise corrections.',
    constraints: ['Grammar and mechanics only', 'Minimal changes', 'Preserve author voice'],
    trackEditsIntegration: true,
    capabilities: [
      {
        type: 'document-edit',
        enabled: true,
        config: { 
          editTypes: ['grammar', 'spelling', 'punctuation', 'mechanics'],
          preserveStyle: true,
          minimalChanges: true
        }
      }
    ]
  },
  {
    id: 'writing-assistant',
    name: 'Writing Assistant',
    description: 'Creative collaboration with substantial input and suggestions',
    icon: '✍️',
    prompt: 'You are a collaborative writing partner. Help develop ideas, suggest content, provide creative input, and assist with substantial writing tasks.',
    constraints: ['Substantial collaboration allowed', 'Creative input encouraged'],
    trackEditsIntegration: true,
    capabilities: [
      {
        type: 'document-edit',
        enabled: true,
        config: { 
          editTypes: ['content', 'structure', 'creative', 'expansion'],
          allowSubstantialChanges: true,
          collaborativeMode: true
        }
      },
      {
        type: 'conversation',
        enabled: true,
        config: { allowBrainstorming: true, provideFeedback: true }
      },
      {
        type: 'generation',
        enabled: true,
        config: { generateContent: true, suggestIdeas: true }
      }
    ]
  }
];

export const DEFAULT_MODE_ID = 'chat';

export function getModeById(id: string): ChatMode | undefined {
  return MOCK_MODES.find(mode => mode.id === id);
}

export function getDefaultMode(): ChatMode {
  return getModeById(DEFAULT_MODE_ID) || MOCK_MODES[0];
}