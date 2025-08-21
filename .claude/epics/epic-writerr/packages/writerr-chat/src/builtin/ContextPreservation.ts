/**
 * @fileoverview Context preservation system for seamless mode switching
 */

import { 
  SessionContext, 
  SessionMessage, 
  DocumentContext, 
  ModeConfig,
  ModeTransitionContext 
} from '../modes/types';

export interface PreservationStrategy {
  /** How to handle conversation history */
  historyHandling: 'preserve-all' | 'preserve-recent' | 'summarize' | 'context-only';
  /** Maximum messages to keep in history */
  maxHistoryMessages?: number;
  /** How to handle document context */
  documentHandling: 'preserve' | 'refresh' | 'merge';
  /** How to handle user selection */
  selectionHandling: 'preserve' | 'clear' | 'expand';
  /** Whether to include transition explanation */
  includeTransitionMessage: boolean;
}

export interface ContextSummary {
  /** Key topics discussed */
  topics: string[];
  /** User's main goals/intentions */
  intentions: string[];
  /** Important decisions made */
  decisions: string[];
  /** Current document focus */
  documentFocus: string;
  /** Summary text */
  summary: string;
}

export class ContextPreservation {
  private static readonly DEFAULT_STRATEGIES: Record<string, PreservationStrategy> = {
    'chat': {
      historyHandling: 'preserve-all',
      documentHandling: 'preserve',
      selectionHandling: 'clear',
      includeTransitionMessage: true
    },
    'copy-edit': {
      historyHandling: 'preserve-recent',
      maxHistoryMessages: 5,
      documentHandling: 'refresh',
      selectionHandling: 'preserve',
      includeTransitionMessage: true
    },
    'proofread': {
      historyHandling: 'context-only',
      maxHistoryMessages: 3,
      documentHandling: 'preserve',
      selectionHandling: 'preserve',
      includeTransitionMessage: true
    },
    'writing-assistant': {
      historyHandling: 'preserve-recent',
      maxHistoryMessages: 8,
      documentHandling: 'merge',
      selectionHandling: 'expand',
      includeTransitionMessage: true
    }
  };

  /**
   * Preserve context during mode transition
   */
  async preserveContext(
    transition: ModeTransitionContext,
    targetModeConfig: ModeConfig,
    customStrategy?: Partial<PreservationStrategy>
  ): Promise<SessionContext> {
    const strategy = this.getPreservationStrategy(transition.toMode, customStrategy);
    
    // Process conversation history
    const preservedHistory = await this.processHistory(
      transition.messages,
      strategy,
      transition.fromMode,
      transition.toMode
    );

    // Handle document context
    const documentContext = await this.processDocumentContext(
      transition.documentContext,
      strategy,
      transition.currentSelection
    );

    // Create preserved session context
    const preservedContext: SessionContext = {
      sessionId: this.generateSessionId(),
      currentModeId: transition.toMode,
      history: preservedHistory,
      metadata: {
        previousMode: transition.fromMode,
        transitionTime: transition.timestamp,
        preservationStrategy: strategy,
        contextPreserved: true
      },
      documentContext
    };

    // Add transition message if requested
    if (strategy.includeTransitionMessage) {
      preservedContext.history.push(
        this.createTransitionMessage(transition.fromMode, transition.toMode)
      );
    }

    return preservedContext;
  }

  /**
   * Get preservation strategy for a target mode
   */
  private getPreservationStrategy(
    targetMode: string, 
    customStrategy?: Partial<PreservationStrategy>
  ): PreservationStrategy {
    const defaultStrategy = ContextPreservation.DEFAULT_STRATEGIES[targetMode] || 
      ContextPreservation.DEFAULT_STRATEGIES['chat'];
    
    return {
      ...defaultStrategy,
      ...customStrategy
    };
  }

  /**
   * Process conversation history based on strategy
   */
  private async processHistory(
    messages: SessionMessage[],
    strategy: PreservationStrategy,
    fromMode: string,
    toMode: string
  ): Promise<SessionMessage[]> {
    if (!messages.length) return [];

    switch (strategy.historyHandling) {
      case 'preserve-all':
        return messages;

      case 'preserve-recent':
        const maxMessages = strategy.maxHistoryMessages || 5;
        return messages.slice(-maxMessages);

      case 'context-only':
        // Keep only messages that provide essential context
        return messages.filter(msg => 
          msg.type === 'user' || 
          msg.content.length > 100 || // Substantial responses
          msg.context?.selection // Messages with document context
        ).slice(-(strategy.maxHistoryMessages || 3));

      case 'summarize':
        // Create a summary of the conversation
        const summary = await this.createConversationSummary(messages, fromMode, toMode);
        return [{
          id: this.generateMessageId(),
          type: 'system',
          content: `Previous conversation summary: ${summary.summary}`,
          timestamp: Date.now(),
          modeId: toMode
        }];

      default:
        return messages;
    }
  }

  /**
   * Process document context based on strategy
   */
  private async processDocumentContext(
    documentContext?: DocumentContext,
    strategy?: PreservationStrategy,
    currentSelection?: string
  ): Promise<DocumentContext | undefined> {
    if (!documentContext) return undefined;

    const processed = { ...documentContext };

    // Handle selection based on strategy
    switch (strategy?.selectionHandling) {
      case 'preserve':
        // Keep selection as is
        break;

      case 'clear':
        // Remove selection
        processed.selection = undefined;
        break;

      case 'expand':
        // Expand selection to include more context if possible
        if (processed.selection && currentSelection) {
          // In a real implementation, this would expand the selection
          // to include surrounding sentences or paragraphs
          processed.selection = {
            ...processed.selection,
            // Expanded selection logic would go here
          };
        }
        break;
    }

    // Handle document content based on strategy
    switch (strategy?.documentHandling) {
      case 'preserve':
        // Keep document as is
        break;

      case 'refresh':
        // In a real implementation, this would re-read the document
        // to get the latest content
        processed.metadata = {
          ...processed.metadata,
          refreshed: true,
          refreshTime: Date.now()
        };
        break;

      case 'merge':
        // Merge with additional context if available
        processed.metadata = {
          ...processed.metadata,
          enhanced: true,
          enhancementTime: Date.now()
        };
        break;
    }

    return processed;
  }

  /**
   * Create a conversation summary for context preservation
   */
  private async createConversationSummary(
    messages: SessionMessage[],
    fromMode: string,
    toMode: string
  ): Promise<ContextSummary> {
    const userMessages = messages.filter(msg => msg.type === 'user');
    const aiMessages = messages.filter(msg => msg.type === 'assistant');

    // Extract topics (simplified implementation)
    const topics = this.extractTopics(messages);
    
    // Extract user intentions
    const intentions = this.extractIntentions(userMessages);
    
    // Extract decisions made
    const decisions = this.extractDecisions(aiMessages);

    // Determine document focus
    const documentFocus = this.extractDocumentFocus(messages);

    // Create summary text
    const summary = this.generateSummaryText({
      topics,
      intentions,
      decisions,
      documentFocus,
      fromMode,
      toMode,
      messageCount: messages.length
    });

    return {
      topics,
      intentions,
      decisions,
      documentFocus,
      summary
    };
  }

  /**
   * Extract main topics from conversation
   */
  private extractTopics(messages: SessionMessage[]): string[] {
    const topics = new Set<string>();
    
    // Simple keyword extraction (in production, use NLP)
    const keywords = [
      'writing', 'editing', 'grammar', 'style', 'structure',
      'content', 'paragraph', 'sentence', 'word', 'tone',
      'audience', 'purpose', 'clarity', 'flow', 'revision'
    ];

    messages.forEach(msg => {
      const content = msg.content.toLowerCase();
      keywords.forEach(keyword => {
        if (content.includes(keyword)) {
          topics.add(keyword);
        }
      });
    });

    return Array.from(topics).slice(0, 5); // Limit to top 5 topics
  }

  /**
   * Extract user intentions from messages
   */
  private extractIntentions(userMessages: SessionMessage[]): string[] {
    const intentions: string[] = [];
    
    // Look for intention patterns
    const intentionPatterns = [
      /I want to (.*)/i,
      /I need (.*)/i,
      /Can you help.*?(.*)/i,
      /Please (.*)/i,
      /I'm trying to (.*)/i
    ];

    userMessages.forEach(msg => {
      intentionPatterns.forEach(pattern => {
        const match = msg.content.match(pattern);
        if (match && match[1]) {
          intentions.push(match[1].trim());
        }
      });
    });

    return intentions.slice(0, 3); // Limit to top 3 intentions
  }

  /**
   * Extract decisions made during conversation
   */
  private extractDecisions(aiMessages: SessionMessage[]): string[] {
    const decisions: string[] = [];
    
    // Look for decision indicators
    const decisionPatterns = [
      /I recommend (.*)/i,
      /You should (.*)/i,
      /The best approach is (.*)/i,
      /I suggest (.*)/i
    ];

    aiMessages.forEach(msg => {
      decisionPatterns.forEach(pattern => {
        const match = msg.content.match(pattern);
        if (match && match[1]) {
          decisions.push(match[1].trim());
        }
      });
    });

    return decisions.slice(0, 3); // Limit to top 3 decisions
  }

  /**
   * Extract document focus from conversation
   */
  private extractDocumentFocus(messages: SessionMessage[]): string {
    const contextMessages = messages.filter(msg => msg.context?.filePath);
    
    if (contextMessages.length > 0) {
      const lastContext = contextMessages[contextMessages.length - 1].context;
      if (lastContext?.selection?.text) {
        return `Working on selected text: "${lastContext.selection.text.slice(0, 50)}..."`;
      } else if (lastContext?.filePath) {
        return `Working on document: ${lastContext.filePath.split('/').pop()}`;
      }
    }

    return 'General writing assistance';
  }

  /**
   * Generate summary text
   */
  private generateSummaryText(data: {
    topics: string[];
    intentions: string[];
    decisions: string[];
    documentFocus: string;
    fromMode: string;
    toMode: string;
    messageCount: number;
  }): string {
    const parts: string[] = [];
    
    parts.push(`Switched from ${data.fromMode} to ${data.toMode} mode.`);
    
    if (data.topics.length > 0) {
      parts.push(`Discussed: ${data.topics.join(', ')}.`);
    }
    
    if (data.intentions.length > 0) {
      parts.push(`User goals: ${data.intentions.slice(0, 2).join('; ')}.`);
    }
    
    if (data.decisions.length > 0) {
      parts.push(`Key recommendations: ${data.decisions.slice(0, 2).join('; ')}.`);
    }
    
    parts.push(`Focus: ${data.documentFocus}.`);
    
    return parts.join(' ');
  }

  /**
   * Create transition message
   */
  private createTransitionMessage(fromMode: string, toMode: string): SessionMessage {
    const modeNames: Record<string, string> = {
      'chat': 'Chat',
      'copy-edit': 'Copy Edit',
      'proofread': 'Proofread',
      'writing-assistant': 'Writing Assistant'
    };

    const fromName = modeNames[fromMode] || fromMode;
    const toName = modeNames[toMode] || toMode;

    let message = `Switched to ${toName} mode. `;

    // Add mode-specific context
    switch (toMode) {
      case 'chat':
        message += "Let's continue our conversation. I'm here to discuss ideas and provide feedback.";
        break;
      case 'copy-edit':
        message += "Ready to help improve your writing's structure, style, and clarity.";
        break;
      case 'proofread':
        message += "I'll focus on correcting grammar, punctuation, and spelling errors.";
        break;
      case 'writing-assistant':
        message += "Let's collaborate on developing and expanding your content.";
        break;
    }

    return {
      id: this.generateMessageId(),
      type: 'system',
      content: message,
      timestamp: Date.now(),
      modeId: toMode
    };
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get context preservation recommendations for mode transition
   */
  getTransitionRecommendations(fromMode: string, toMode: string): {
    recommendation: string;
    benefits: string[];
    considerations: string[];
  } {
    const transitions: Record<string, Record<string, any>> = {
      'chat': {
        'copy-edit': {
          recommendation: 'Discussion context will help inform editing decisions',
          benefits: ['Previous feedback applies to edits', 'Maintains conversation flow'],
          considerations: ['Focus shifts from discussion to direct changes']
        },
        'proofread': {
          recommendation: 'Chat context provides background for correction priorities',
          benefits: ['Understands document purpose', 'Maintains user preferences'],
          considerations: ['Mode focuses only on mechanical errors']
        },
        'writing-assistant': {
          recommendation: 'Conversation insights will guide content development',
          benefits: ['Builds on discussed ideas', 'Maintains creative direction'],
          considerations: ['Will make substantial content additions']
        }
      },
      'copy-edit': {
        'chat': {
          recommendation: 'Edit decisions can be discussed and explained',
          benefits: ['Can explain edit reasoning', 'Discuss alternative approaches'],
          considerations: ['No more direct document editing']
        },
        'proofread': {
          recommendation: 'Style improvements followed by error correction',
          benefits: ['Natural editing progression', 'Comprehensive document polish'],
          considerations: ['Different error focus than copy editing']
        }
      },
      'writing-assistant': {
        'copy-edit': {
          recommendation: 'New content can be refined and polished',
          benefits: ['Improves generated content quality', 'Maintains development momentum'],
          considerations: ['Focus shifts from creation to refinement']
        }
      }
    };

    return transitions[fromMode]?.[toMode] || {
      recommendation: 'Context will be preserved for continuity',
      benefits: ['Maintains session continuity'],
      considerations: ['Different mode capabilities and focus']
    };
  }
}