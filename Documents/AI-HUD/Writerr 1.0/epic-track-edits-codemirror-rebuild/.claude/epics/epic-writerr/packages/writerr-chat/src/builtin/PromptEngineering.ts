/**
 * @fileoverview Advanced prompt engineering for core modes with context-aware optimization
 */

import { 
  ModeConfig, 
  DocumentContext, 
  SessionContext,
  PromptExample,
  ContextInjectionConfig
} from '../modes/types';

export interface PromptContext {
  /** User's input message */
  userInput: string;
  /** Current document content */
  document?: string;
  /** Selected text */
  selection?: string;
  /** Session history for context */
  sessionHistory?: string[];
  /** Vault-wide context */
  vaultContext?: string;
  /** Document metadata */
  documentMetadata?: Record<string, any>;
}

export interface PromptOptimization {
  /** Optimized system prompt */
  systemPrompt: string;
  /** Processed user prompt */
  userPrompt: string;
  /** Context included in prompt */
  contextIncluded: string[];
  /** Tokens used estimate */
  estimatedTokens: number;
  /** Optimization notes */
  optimizationNotes: string[];
}

export class PromptEngineering {
  private static readonly CONTEXT_PRIORITIES: Record<string, Record<string, number>> = {
    'chat': {
      'userInput': 10,
      'sessionHistory': 8,
      'document': 6,
      'vaultContext': 4,
      'selection': 3
    },
    'copy-edit': {
      'selection': 10,
      'document': 9,
      'userInput': 8,
      'sessionHistory': 5,
      'vaultContext': 3
    },
    'proofread': {
      'selection': 10,
      'document': 8,
      'userInput': 7,
      'sessionHistory': 3,
      'vaultContext': 2
    },
    'writing-assistant': {
      'userInput': 10,
      'document': 8,
      'selection': 7,
      'vaultContext': 6,
      'sessionHistory': 5
    }
  };

  private static readonly MODE_TEMPLATES = {
    'chat': {
      contextualPrompts: {
        withDocument: "Based on our conversation about your document '{{documentTitle}}', {{userInput}}",
        withSelection: "Regarding the text you've selected: '{{selectionPreview}}' - {{userInput}}",
        general: "{{userInput}}"
      },
      responseStyle: 'conversational',
      focusAreas: ['discussion', 'feedback', 'brainstorming', 'explanation']
    },
    'copy-edit': {
      contextualPrompts: {
        withSelection: "Please improve the following selected text for clarity, style, and flow:\n\n{{selection}}\n\nSpecific request: {{userInput}}",
        withDocument: "Review and improve this document section:\n\n{{documentExcerpt}}\n\nFocus: {{userInput}}",
        general: "Copy edit the following content: {{document}}\n\nInstructions: {{userInput}}"
      },
      responseStyle: 'editorial',
      focusAreas: ['clarity', 'style', 'structure', 'flow', 'readability']
    },
    'proofread': {
      contextualPrompts: {
        withSelection: "Proofread the following text for grammar, punctuation, and spelling errors:\n\n{{selection}}\n\nFocus areas: {{userInput}}",
        withDocument: "Please correct any grammar, punctuation, and spelling errors in:\n\n{{documentExcerpt}}\n\nSpecial attention to: {{userInput}}",
        general: "Proofread for errors: {{document}}\n\nPriorities: {{userInput}}"
      },
      responseStyle: 'precise',
      focusAreas: ['grammar', 'punctuation', 'spelling', 'mechanics', 'accuracy']
    },
    'writing-assistant': {
      contextualPrompts: {
        withSelection: "Based on this text: {{selection}}\n\nWriting request: {{userInput}}\n\nDocument context: {{documentTitle}}",
        withVault: "Considering your project context and this request: {{userInput}}\n\nDocument: {{documentTitle}}\n\nRelated content: {{vaultSummary}}",
        general: "Creative writing assistance: {{userInput}}\n\nContext: {{documentTitle}}"
      },
      responseStyle: 'creative',
      focusAreas: ['development', 'expansion', 'creativity', 'collaboration', 'ideation']
    }
  };

  /**
   * Optimize prompt for specific mode and context
   */
  async optimizePrompt(
    modeConfig: ModeConfig,
    promptContext: PromptContext,
    sessionContext?: SessionContext
  ): Promise<PromptOptimization> {
    const modeId = modeConfig.id;
    const contextConfig = modeConfig.promptConfig.contextInjection;
    
    // Determine optimal context to include
    const contextToInclude = await this.selectOptimalContext(
      modeId, 
      promptContext, 
      contextConfig
    );

    // Build optimized system prompt
    const systemPrompt = await this.optimizeSystemPrompt(
      modeConfig.promptConfig.systemPrompt,
      modeId,
      contextToInclude
    );

    // Build contextual user prompt
    const userPrompt = await this.buildContextualUserPrompt(
      modeId,
      promptContext,
      contextToInclude,
      modeConfig.promptConfig.userPromptTemplate
    );

    // Estimate token usage
    const estimatedTokens = this.estimateTokens(systemPrompt + userPrompt);

    // Generate optimization notes
    const optimizationNotes = this.generateOptimizationNotes(
      modeId,
      contextToInclude,
      estimatedTokens
    );

    return {
      systemPrompt,
      userPrompt,
      contextIncluded: Object.keys(contextToInclude.included),
      estimatedTokens,
      optimizationNotes
    };
  }

  /**
   * Select optimal context based on mode priorities and limits
   */
  private async selectOptimalContext(
    modeId: string,
    promptContext: PromptContext,
    contextConfig: ContextInjectionConfig
  ): Promise<{
    included: Record<string, string>;
    excluded: Record<string, string>;
    reasons: Record<string, string>;
  }> {
    const priorities = PromptEngineering.CONTEXT_PRIORITIES[modeId] || {};
    const maxLength = contextConfig.maxContextLength || 4000;
    const included: Record<string, string> = {};
    const excluded: Record<string, string> = {};
    const reasons: Record<string, string> = {};

    // Always include user input (highest priority)
    if (promptContext.userInput) {
      included.userInput = promptContext.userInput;
      reasons.userInput = 'Always included - primary input';
    }

    // Build list of available context with priorities
    const availableContext: Array<{
      key: string;
      value: string;
      priority: number;
      tokens: number;
    }> = [];

    if (promptContext.selection && contextConfig.includeSelection) {
      availableContext.push({
        key: 'selection',
        value: promptContext.selection,
        priority: priorities.selection || 5,
        tokens: this.estimateTokens(promptContext.selection)
      });
    }

    if (promptContext.document && contextConfig.includeDocument) {
      const documentExcerpt = this.createDocumentExcerpt(
        promptContext.document,
        promptContext.selection,
        1000 // Max excerpt length
      );
      availableContext.push({
        key: 'document',
        value: documentExcerpt,
        priority: priorities.document || 5,
        tokens: this.estimateTokens(documentExcerpt)
      });
    }

    if (promptContext.sessionHistory && promptContext.sessionHistory.length > 0) {
      const historyContext = this.createHistoryContext(promptContext.sessionHistory, modeId);
      availableContext.push({
        key: 'sessionHistory',
        value: historyContext,
        priority: priorities.sessionHistory || 5,
        tokens: this.estimateTokens(historyContext)
      });
    }

    if (promptContext.vaultContext && contextConfig.includeVaultContext) {
      availableContext.push({
        key: 'vaultContext',
        value: promptContext.vaultContext,
        priority: priorities.vaultContext || 3,
        tokens: this.estimateTokens(promptContext.vaultContext)
      });
    }

    // Sort by priority and include until token limit
    availableContext.sort((a, b) => b.priority - a.priority);
    
    let currentTokens = this.estimateTokens(JSON.stringify(included));
    
    for (const context of availableContext) {
      if (currentTokens + context.tokens <= maxLength) {
        included[context.key] = context.value;
        currentTokens += context.tokens;
        reasons[context.key] = `Included - priority ${context.priority}, ${context.tokens} tokens`;
      } else {
        excluded[context.key] = context.value;
        reasons[context.key] = `Excluded - would exceed token limit (${context.tokens} tokens)`;
      }
    }

    return { included, excluded, reasons };
  }

  /**
   * Optimize system prompt for mode and context
   */
  private async optimizeSystemPrompt(
    baseSystemPrompt: string,
    modeId: string,
    contextInfo: { included: Record<string, string> }
  ): Promise<string> {
    let optimizedPrompt = baseSystemPrompt;
    const modeTemplate = PromptEngineering.MODE_TEMPLATES[modeId];

    if (modeTemplate) {
      // Add mode-specific enhancements
      const enhancements: string[] = [];

      // Add context awareness
      if (contextInfo.included.selection) {
        enhancements.push("The user has selected specific text for you to focus on.");
      }
      
      if (contextInfo.included.document) {
        enhancements.push("You have access to the current document context.");
      }

      if (contextInfo.included.sessionHistory) {
        enhancements.push("Previous conversation context is available to inform your response.");
      }

      if (contextInfo.included.vaultContext) {
        enhancements.push("Related project information is available for comprehensive assistance.");
      }

      // Add focus areas
      const focusAreas = modeTemplate.focusAreas.join(', ');
      enhancements.push(`Focus areas for this mode: ${focusAreas}.`);

      // Add response style guidance
      switch (modeTemplate.responseStyle) {
        case 'conversational':
          enhancements.push("Maintain a natural, engaging conversational tone.");
          break;
        case 'editorial':
          enhancements.push("Provide clear, professional editing guidance with explanations.");
          break;
        case 'precise':
          enhancements.push("Be precise and methodical in identifying and correcting errors.");
          break;
        case 'creative':
          enhancements.push("Be creative and collaborative, offering substantial content contributions.");
          break;
      }

      if (enhancements.length > 0) {
        optimizedPrompt += "\n\n" + enhancements.join(" ");
      }
    }

    return optimizedPrompt;
  }

  /**
   * Build contextual user prompt
   */
  private async buildContextualUserPrompt(
    modeId: string,
    promptContext: PromptContext,
    contextInfo: { included: Record<string, string> },
    userPromptTemplate: string
  ): Promise<string> {
    const modeTemplate = PromptEngineering.MODE_TEMPLATES[modeId];
    let prompt = userPromptTemplate;

    // Use mode-specific contextual prompts if available
    if (modeTemplate?.contextualPrompts) {
      if (contextInfo.included.selection && modeTemplate.contextualPrompts.withSelection) {
        prompt = modeTemplate.contextualPrompts.withSelection;
      } else if (contextInfo.included.vaultContext && modeTemplate.contextualPrompts.withVault) {
        prompt = modeTemplate.contextualPrompts.withVault;
      } else if (contextInfo.included.document && modeTemplate.contextualPrompts.withDocument) {
        prompt = modeTemplate.contextualPrompts.withDocument;
      } else if (modeTemplate.contextualPrompts.general) {
        prompt = modeTemplate.contextualPrompts.general;
      }
    }

    // Replace template variables
    prompt = this.replaceTemplateVariables(prompt, {
      userInput: promptContext.userInput,
      document: contextInfo.included.document,
      selection: contextInfo.included.selection,
      documentTitle: promptContext.documentMetadata?.title || 'Untitled Document',
      selectionPreview: contextInfo.included.selection ? 
        this.createPreview(contextInfo.included.selection, 50) : '',
      documentExcerpt: contextInfo.included.document ? 
        this.createPreview(contextInfo.included.document, 200) : '',
      vaultSummary: contextInfo.included.vaultContext ? 
        this.createPreview(contextInfo.included.vaultContext, 100) : ''
    });

    return prompt;
  }

  /**
   * Replace template variables in prompt
   */
  private replaceTemplateVariables(
    template: string, 
    variables: Record<string, string | undefined>
  ): string {
    let result = template;

    // Handle conditional blocks first (e.g., {{#if selection}})
    result = result.replace(/\{\{#if\s+(\w+)\}\}(.*?)\{\{\/if\}\}/gs, (match, variable, content) => {
      return variables[variable] ? content : '';
    });

    // Handle logical OR (e.g., {{selection || document}})
    result = result.replace(/\{\{(\w+)\s*\|\|\s*(\w+)\}\}/g, (match, var1, var2) => {
      return variables[var1] || variables[var2] || '';
    });

    // Handle simple variables (e.g., {{userInput}})
    result = result.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
      return variables[variable] || '';
    });

    return result;
  }

  /**
   * Create document excerpt for context
   */
  private createDocumentExcerpt(
    document: string, 
    selection?: string, 
    maxLength: number = 1000
  ): string {
    if (!document) return '';

    if (selection) {
      // Find selection in document and include surrounding context
      const selectionIndex = document.indexOf(selection);
      if (selectionIndex !== -1) {
        const start = Math.max(0, selectionIndex - 200);
        const end = Math.min(document.length, selectionIndex + selection.length + 200);
        return document.slice(start, end);
      }
    }

    // Return beginning of document
    return document.length <= maxLength ? 
      document : 
      document.slice(0, maxLength) + '...';
  }

  /**
   * Create session history context
   */
  private createHistoryContext(history: string[], modeId: string): string {
    if (!history.length) return '';

    const maxMessages = this.getMaxHistoryMessages(modeId);
    const recentHistory = history.slice(-maxMessages);
    
    return recentHistory
      .map((msg, index) => `${index % 2 === 0 ? 'User' : 'Assistant'}: ${msg}`)
      .join('\n');
  }

  /**
   * Get maximum history messages for mode
   */
  private getMaxHistoryMessages(modeId: string): number {
    const limits = {
      'chat': 8,
      'copy-edit': 5,
      'proofread': 3,
      'writing-assistant': 6
    };
    return limits[modeId as keyof typeof limits] || 5;
  }

  /**
   * Create preview of text
   */
  private createPreview(text: string, maxLength: number): string {
    if (!text) return '';
    return text.length <= maxLength ? 
      text : 
      text.slice(0, maxLength) + '...';
  }

  /**
   * Estimate token count (simplified)
   */
  private estimateTokens(text: string): number {
    if (!text) return 0;
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Generate optimization notes
   */
  private generateOptimizationNotes(
    modeId: string,
    contextInfo: { included: Record<string, string>; excluded: Record<string, string>; reasons: Record<string, string> },
    estimatedTokens: number
  ): string[] {
    const notes: string[] = [];
    
    notes.push(`Mode: ${modeId} - optimized for ${PromptEngineering.MODE_TEMPLATES[modeId]?.responseStyle || 'general'} responses`);
    notes.push(`Estimated tokens: ${estimatedTokens}`);
    
    const includedCount = Object.keys(contextInfo.included).length;
    const excludedCount = Object.keys(contextInfo.excluded).length;
    
    notes.push(`Context included: ${includedCount} sources, excluded: ${excludedCount} sources`);
    
    if (excludedCount > 0) {
      const excludedKeys = Object.keys(contextInfo.excluded);
      notes.push(`Excluded due to token limits: ${excludedKeys.join(', ')}`);
    }

    // Add mode-specific optimization notes
    switch (modeId) {
      case 'chat':
        if (contextInfo.included.sessionHistory) {
          notes.push('Session history included for conversation continuity');
        }
        break;
      case 'copy-edit':
        if (contextInfo.included.selection) {
          notes.push('Selection prioritized for targeted editing');
        }
        break;
      case 'proofread':
        notes.push('Context minimized to focus on error detection');
        break;
      case 'writing-assistant':
        if (contextInfo.included.vaultContext) {
          notes.push('Vault context included for comprehensive writing assistance');
        }
        break;
    }

    return notes;
  }

  /**
   * Get mode-specific examples for prompt enhancement
   */
  getModeExamples(modeId: string): PromptExample[] {
    const examples: Record<string, PromptExample[]> = {
      'chat': [
        {
          input: "What do you think about the structure of my essay?",
          output: "Looking at your essay, I notice you have a strong introduction that clearly states your thesis. The body paragraphs each focus on a distinct point, which creates good organization. Have you considered adding transition sentences between paragraphs to improve the flow?",
          context: "Conversational feedback on document structure"
        }
      ],
      'copy-edit': [
        {
          input: "The meeting was very long and covered many different topics that were important.",
          output: "The lengthy meeting addressed several important topics.",
          context: "Improved conciseness and clarity"
        }
      ],
      'proofread': [
        {
          input: "She don't want to go their.",
          output: "She doesn't want to go there.",
          context: "Corrected grammar and spelling errors"
        }
      ],
      'writing-assistant': [
        {
          input: "Expand on the character's motivation in this scene.",
          output: "Sarah's hands trembled as she reached for the letter, not from the cold autumn air, but from the weight of what it might contain. For months, she had convinced herself that silence was better than rejection, that wondering was safer than knowing. But standing here, with the envelope that could change everything, she realized that fear had been her true enemy all along.",
          context: "Character development and scene expansion"
        }
      ]
    };

    return examples[modeId] || [];
  }

  /**
   * Validate prompt optimization results
   */
  validateOptimization(optimization: PromptOptimization): {
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check token limits
    if (optimization.estimatedTokens > 8000) {
      issues.push('Token count exceeds recommended limit');
      suggestions.push('Consider reducing context or splitting the request');
    } else if (optimization.estimatedTokens > 6000) {
      suggestions.push('High token usage - monitor for performance impact');
    }

    // Check prompt completeness
    if (!optimization.systemPrompt.trim()) {
      issues.push('System prompt is empty');
    }

    if (!optimization.userPrompt.trim()) {
      issues.push('User prompt is empty');
    }

    // Check context inclusion
    if (optimization.contextIncluded.length === 0) {
      suggestions.push('No context included - consider if this is appropriate for the mode');
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions
    };
  }
}